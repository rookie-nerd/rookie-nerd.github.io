---
layout: post
title: MainQueueAndMainThread引发的血案
date: 2016-09-16
categories: gcd ios
---

# 背景
最近在浏览React Native代码的时候发现有提到Main Queue和Main Thread的区别，很早就有想要阅读下GCD源码的冲动，这回总算找到机会了。

阅读源码之前先给个结论：Main Thread 和 Main Queue是两个不同的东西。

+ Main Queue IS bound to Main Thread.
+ Main Thread IS NOT bound to Main Queue.

# 源码剖析

## 关键点

### queue和线程的关系
![gcd的线程池](https://o8ouygf5v.qnssl.com/gcd-pool.png)
**JUST REMEMBER THIS PNG**!!

### slowpath vs fastpath
可能大家对`__builtin_expect`比较熟悉，这是编译器可以用来优化执行速度的函数。
程序员在写if条件的时候，可能知道比较的值更可能是哪种情况，因此就可以使用`fastpath`
或者`slowpath`来告诉编译器，让编译来帮忙优化。

+ `fastpath`表示条件更可能成立
+ `slowpath`表示条件更不可能成立

所以简单的来说，当我们遇到这个东西的时候，直接忽略，并不会影响我们对代码的理解。
```c
#define fastpath(x) ((typeof(x))__builtin_expect((long)(x), ~0l))
#define slowpath(x) ((typeof(x))__builtin_expect((long)(x), 0l))
```

### function vs block
gcd支持function和block的执行，相应的其提供了两种方法来支持function和block的入队，简单的举个例子。所以当我们看到不带f和带f的同名函数，默认他们干的是同一回事。

block的执行底层调用的是function的执行。

```c
// 执行block
void dispatch_async(dispatch_queue_t dq, void (^work)(void));
// 执行function
void dispatch_async_f(dispatch_queue_t dq, void *ctxt, dispatch_function_t func);
```

### 常用宏定义
libdispatch为了在保证性能的情况下，尽量增加代码的可读性，大量的使用了宏。
因此了解结构体之前，我们需要先知道几个宏定义，方便后续分析代码.

```c
// dispatch结构体定义宏
#define DISPATCH_DECL(name) typedef struct name##_s *name##_t
```

```c
// os object头部定义宏
#define _OS_OBJECT_HEADER(isa, ref_cnt, xref_cnt)
  isa               // isa
  ref_cnt           // 引用计数，这是内部gcd内部使用的计数器
  xref_cnt          // 外部引用计数，这是gcd外部使用的计数器，两者都为0的时候才能dispose
```

```c
// dispatch结构体头部
#define DISPATCH_STRUCT_HEADER(x) 
  _OS_OBJECT_HEADER
  do_next                             // 下一个do
  do_targetq                          // 目标queue
  do_ctxt                             // do上下文
  do_finalizer                        // do销毁时候调用函数
  do_suspend_cnt                      // suspend计数，用作暂停标志
```

```c
// dispatch continuation的头部
#define DISPATCH_CONTINUATION_HEADER(x) 
  _OS_OBJECT_HEADER
  do_next                                // 下一个do
  dc_func                                // dc封装的函数
  dc_ctxt                                // dc封装的上下文
  dc_data                                // dc封装的数据
  dc_other                               // dc封装的其他信息
```

```c
// dispatch queue头部
#define DISPATCH_QUEUE_HEADER 
  dq_running;                           // 队列正在运行的任务数
  dq_width;                             // 队列可以并发的数目
  dq_items_tail;                        // 队列末尾节点
  dq_items_head;                        // 队列开头节点
  dq_serialnum                          // 队列序列号，每个队列都有唯一的序列号
  dq_specific_q                         // 
```

```c
// dispatch vtable头部
#define DISPATCH_VTABLE_HEADER(x) 
  do_type                               // do类型
  do_kind                               // 种类，例如：semaphore/group/queue...
  do_debug                              // debug回调
  do_invoke                             // invoke回调，唤醒队列回调
  do_probe                              // probe回调，important
  do_dispose                            // dispose回调，销毁队列的方法
```

## GCD结构体
因为本文只关心queue的实现，所以暂时省略了其他结构体，有兴趣的童鞋可以直接下源码看。

### os_object_t
系统基类
```c
typedef struct _os_object_s {
  _OS_OBJECT_HEADER(
  const _os_object_class_s *os_obj_isa,   
  os_obj_ref_cnt,                         
  os_obj_xref_cnt);                       
} _os_object_s;
```

### dispatch_object_t
该结构体可以看成gcd的基类。
```c
typedef union {
  struct _os_object_s *_os_obj;
  struct dispatch_object_s *_do;
  struct dispatch_continuation_s *_dc;
  struct dispatch_queue_s *_dq;
  struct dispatch_queue_attr_s *_dqa;
  struct dispatch_group_s *_dg;
  struct dispatch_source_s *_ds;
  struct dispatch_source_attr_s *_dsa;
  struct dispatch_semaphore_s *_dsema;
  struct dispatch_data_s *_ddata;
  struct dispatch_io_s *_dchannel;
  struct dispatch_operation_s *_doperation;
  struct dispatch_disk_s *_ddisk;
} dispatch_object_t __attribute__((__transparent_union__));
```
通过上面的结构体定义可以发现，`dispatch_object_t`可以是union结构体中任何一种类型。


### dispatch_continuation_t
该结构体主要用来封装block和function
```c
struct dispatch_continuation_s {
  DISPATCH_CONTINUATION_HEADER(continuation);
};
```

## dispatch_queue_t
队列结构体，可能是gcd最重要的结构体了。
```c
struct dispatch_queue_s {
  DISPATCH_STRUCT_HEADER(queue);
  DISPATCH_QUEUE_HEADER;
  char dq_label[DISPATCH_QUEUE_MIN_LABEL_SIZE]; // must be last
  char _dq_pad[DISPATCH_QUEUE_CACHELINE_PAD];   // for static queues only
};
```

## dispatch_queue_attr_t
队列属性结构体。
```c
struct dispatch_queue_attr_s {
  DISPATCH_STRUCT_HEADER(queue_attr);
};
```

## 常用API解析
gcd提供了非常多的功能来简化针对多核设备的代码编写，这里我们慢慢添加对常用API的源码剖析。

### dispatch_get_global_queue
```c
dispatch_queue_t
dispatch_get_global_queue(long priority, unsigned long flags)
{
  if (flags & ~DISPATCH_QUEUE_OVERCOMMIT) {
    return NULL;
  }
  return _dispatch_get_root_queue(priority,
      flags & DISPATCH_QUEUE_OVERCOMMIT);
}
```
当我们获取global queue来使用的时候，其实质上通过`_dispatch_get_root_queue`来获取的非overcommit的预先生成的队列的。

`_dispatch_get_root_queue`是从结构体`_dispatch_root_queues`中获取相应的优先级的队列。`_dispatch_root_queues`区分是否overcommit，定义了4中优先级的队列，他们分别是（参考前文的图）。最后1bit是1的代表overcommit。overcommit用来控制线程数能不能超越物理内核数，显然通过该接口获得的队列不会给系统创建过多的队列。
```c
  DISPATCH_ROOT_QUEUE_IDX_LOW_PRIORITY = 0,
  DISPATCH_ROOT_QUEUE_IDX_LOW_OVERCOMMIT_PRIORITY,
  DISPATCH_ROOT_QUEUE_IDX_DEFAULT_PRIORITY,
  DISPATCH_ROOT_QUEUE_IDX_DEFAULT_OVERCOMMIT_PRIORITY,
  DISPATCH_ROOT_QUEUE_IDX_HIGH_PRIORITY,
  DISPATCH_ROOT_QUEUE_IDX_HIGH_OVERCOMMIT_PRIORITY,
  DISPATCH_ROOT_QUEUE_IDX_BACKGROUND_PRIORITY,
  DISPATCH_ROOT_QUEUE_IDX_BACKGROUND_OVERCOMMIT_PRIORITY,
```

最后提及一下，`_dispatch_root_queues`对应的thread实现在`_dispatch_root_queue_contexts`中，每一个context都是一个线程池，每个线程池的最大线程数限制是255。

### dispatch_get_current_queue
```c
dispatch_queue_t
dispatch_get_current_queue(void)
{
  return _dispatch_queue_get_current() ?: _dispatch_get_root_queue(0, true);
}

static inline dispatch_queue_t
_dispatch_queue_get_current(void)
{
  return (dispatch_queue_t)_dispatch_thread_getspecific(dispatch_queue_key);
}
```
可以发现当我们通过`dispatch_get_current_queue`来获取当前运行的队列的时候，我们是通过TSD(Thread Specific Data)来确定到底当前是运行在那个queue上的，每当我们切换queue的时候，都是通过`_dispatch_thread_setspecific`来设置当前queue。

这里主要涉及到TSD，也有叫TLD的，是个比较有意思的技术。


### dispatch_queue_create
```c
dispatch_queue_t
dispatch_queue_create(const char *label, dispatch_queue_attr_t attr)
{
  dispatch_queue_t dq;
  size_t label_len;

  if (!label) {
    label = "";
  }

  label_len = strlen(label);
  if (label_len < (DISPATCH_QUEUE_MIN_LABEL_SIZE - 1)) {
    label_len = (DISPATCH_QUEUE_MIN_LABEL_SIZE - 1);
  }

  // XXX switch to malloc()
  dq = _dispatch_alloc(DISPATCH_VTABLE(queue),
      sizeof(struct dispatch_queue_s) - DISPATCH_QUEUE_MIN_LABEL_SIZE -
      DISPATCH_QUEUE_CACHELINE_PAD + label_len + 1);

  _dispatch_queue_init(dq);
  strcpy(dq->dq_label, label);

  if (fastpath(!attr)) {
    return dq;
  }
  if (fastpath(attr == DISPATCH_QUEUE_CONCURRENT)) {
    dq->dq_width = UINT32_MAX;
    dq->do_targetq = _dispatch_get_root_queue(0, false);
  } else {
    dispatch_debug_assert(!attr, "Invalid attribute");
  }
  return dq;
}

static inline void
_dispatch_queue_init(dispatch_queue_t dq)
{
  dq->do_next = (struct dispatch_queue_s *)DISPATCH_OBJECT_LISTLESS;
  // Default target queue is overcommit!
  dq->do_targetq = _dispatch_get_root_queue(0, true);
  dq->dq_running = 0;
  dq->dq_width = 1;
  dq->dq_serialnum = dispatch_atomic_inc(&_dispatch_queue_serial_numbers) - 1;
}
```
当我们调用`dispatch_queue_create`进行queue的创建的时候，其会首先调用`_dispatch_queue_init`初始化一个queue，该queue默认是Default的优先级(还记得前文的图么？)，并且dq_width是1，也就是串行队列，并且序列号加1。

如果是并发队列的话，会将dq_width改成UINT32_MAX，并且将目标queue设置成非overcommit的。overcommit如果被设置成true，那就意味着可以创建超过物理核数目的线程数。因此可以发现，自定义并发队列线程数目是不会超过物理内核数的，而串行队列一般是没有这个限制的。

前面说到序列号加1了，那序列号是干什么的呢？在源码中有这样一段注释。
```c
// skip zero
// 1 - main_q
// 2 - mgr_q
// 3 - _unused_
// 4,5,6,7,8,9,10,11 - global queues
// we use 'xadd' on Intel, so the initial value == next assigned
```
可以发现，序列号是1的时候表示main queue，2的时候表示manager queue，3没有使用，4到11表示global queue，再往后就是用户自定义queue了。
那接下来我们看看序列1和序列2的queue是怎么定义的。
```c
struct dispatch_queue_s _dispatch_main_q = {
  .do_vtable = DISPATCH_VTABLE(queue),
#if !DISPATCH_USE_RESOLVERS
  .do_targetq = &_dispatch_root_queues[
      DISPATCH_ROOT_QUEUE_IDX_DEFAULT_OVERCOMMIT_PRIORITY],
#endif
  .do_ref_cnt = DISPATCH_OBJECT_GLOBAL_REFCNT,
  .do_xref_cnt = DISPATCH_OBJECT_GLOBAL_REFCNT,
  .do_suspend_cnt = DISPATCH_OBJECT_SUSPEND_LOCK,
  .dq_label = "com.apple.main-thread",
  .dq_running = 1,
  .dq_width = 1,
  .dq_serialnum = 1,
};
```
值得说明的是，main queue的目标queue也只是一个优先级为default的overcommit queue，其背后也是普通的线程池，nothing special。

```c
struct dispatch_queue_s _dispatch_mgr_q = {
  .do_vtable = DISPATCH_VTABLE(queue_mgr),
  .do_ref_cnt = DISPATCH_OBJECT_GLOBAL_REFCNT,
  .do_xref_cnt = DISPATCH_OBJECT_GLOBAL_REFCNT,
  .do_suspend_cnt = DISPATCH_OBJECT_SUSPEND_LOCK,
  .do_targetq = &_dispatch_root_queues[
      DISPATCH_ROOT_QUEUE_IDX_HIGH_OVERCOMMIT_PRIORITY],
  .dq_label = "com.apple.libdispatch-manager",
  .dq_width = 1,
  .dq_serialnum = 2,
};
```
该队列是用来管理GCD内部的任务的，比如对于各类Source的管理等。

### dispatch_sync

```c
void
dispatch_sync(dispatch_queue_t dq, void (^work)(void))
{
#if DISPATCH_COCOA_COMPAT
  if (slowpath(dq == &_dispatch_main_q)) {
    return _dispatch_sync_slow(dq, work);
  }
#endif
  struct Block_basic *bb = (void *)work;
  dispatch_sync_f(dq, work, (dispatch_function_t)bb->Block_invoke);
}
```
无论走哪个分支，深入查看之后，可以发现，其最终走的都是`dispatch_sync_f`，通过`_dispatch_Block_copy`或者`Block_basic`来实现block到function的转换。
```c
void
dispatch_sync_f(dispatch_queue_t dq, void *ctxt, dispatch_function_t func)
{
  if (fastpath(dq->dq_width == 1)) {
    return dispatch_barrier_sync_f(dq, ctxt, func);
  }
  if (slowpath(!dq->do_targetq)) {
    // the global root queues do not need strict ordering
    (void)dispatch_atomic_add2o(dq, dq_running, 2);
    return _dispatch_sync_f_invoke(dq, ctxt, func);
  }
  _dispatch_sync_f2(dq, ctxt, func);
}
```
如果dq_width是1的话，也就是dq是串行队列的话，必须要等待前面的任务执行完成之后才能执行该任务，因此会调用`dispatch_barrier_sync_f`。barrier的实现是依靠信号量机制来保证的。

如果当前的queue不是sync的目标queue的话，就会通过调用`_dispatch_sync_f_invoke`来切换queue。
```c
static inline void
_dispatch_function_invoke(dispatch_queue_t dq, void *ctxt,
    dispatch_function_t func)
{
  dispatch_queue_t old_dq = _dispatch_thread_getspecific(dispatch_queue_key);
  _dispatch_thread_setspecific(dispatch_queue_key, dq);
  _dispatch_client_callout(ctxt, func);
  _dispatch_workitem_inc();
  _dispatch_thread_setspecific(dispatch_queue_key, old_dq);
}
```
当我们切换线程的时候，我们会先更改TSD，执行block，然后再将之前的dq设置回去。

否则的话，就直接执行`_dispatch_sync_f2`。

这里有一点需要提及的是，当我们执行`dispatch_sync`的时候，我们一般会在当前线程执行该任务，即使是`dispatch_sync`到别的queue也不会做线程切换，为了提升效率，除非是block被提交到main thread，那必须要在main thread执行。

# 参数文献
+ [深入理解GCD](https://bestswifter.com/deep-gcd/)
+ [GCD源码的分析](http://www.jianshu.com/p/a639e2159aa1)
+ [libdispatch](http://libdispatch.macosforge.org/trac/wiki/tutorial)
+ [Queues are not bound to any specific thread](http://blog.krzyzanowskim.com/2016/06/03/queues-are-not-bound-to-any-specific-thread/)

