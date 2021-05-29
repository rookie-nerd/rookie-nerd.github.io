---
layout: post
title: 主线程安全保护神——Main Thread Checker
date: 2017-06-14
categories: iOS Xcode QA
---

> 写iOS App的时候，最容易犯的错误之一就是在非主线程更新UI。Xcode 9提供了一个利器——**Main Thread Checker**，可以帮我们检测在非主线程更新UI的场景。本文前半部分学招式，讲怎么用这个利器；后半部分练心法，学怎么做这个利器。

# Main Thread Checker
Main Thread Checker（后面简称MTC）简单来说就是一个适用于Swift和C语言的小工具。当必须在主线程执行的API在非主线程被调用的时候， MTC会报错并暂停程序执行。该类API包括
**AppKit的接口**、**UIKit的接口**和**其他需要在主线程执行的API**等。

MTC的原理官网也说的比较明白了。在App启动的时候，加载动态库——**libMainThreadChecker.dylib**，每个装了Xcode 9的人都能在`/Applications/Xcode.app/Contents/Developer/usr/lib/`目录下找到该动态库。这个动态库**替换了所有应该在主线程调用的方法**，替换后的方法会在函数执行之前先检查当前执行的线程是否是主线程，如果不是的话就报错。

因为MTC是通过动态库的方式来实现的，所以想要开启该功能只要链接进该动态库就可以了，完全不需要重新编译工程，方便的不要不要的。

更屌的是，其对性能的影响可以直接忽略不计，所以Xcode 9是**默认开启MTC的**。

# 如何开启MTC
![如何开启MTC](http://y.photo.qq.com/img?s=NyP6rdNUm&l=y.jpg)

如果想要关闭MTC，把勾去掉就好了。

# DEMO
demo构造了在非主线程设置`UILabel`的`text`属性的情况，代码如下：

```objc
- (void)viewDidLoad {
    [super viewDidLoad];
    // Do any additional setup after loading the view, typically from a nib.
    
    UILabel *label = [[UILabel alloc] init];
    dispatch_async(dispatch_get_global_queue(0, 0), ^{
        [label setText:@"setText here will cause Xcode to pause!"];
    });
    [self.view addSubview:label];
}
```

下图是开启MTC的结果:
![MTC报错界面](http://y.photo.qq.com/img?s=mAb7t4ACj&l=y.jpg)

当发现问题的时候，MTC会给出提示，暂停程序，并在在Console里面给出了详细的栈信息，让开发者可以及时发现并这类问题。

非主线调用的修复也比较简单，这里给出一种可能的解决方案。

```objc
    if ([NSThread isMainThread]) {
      block();

    } else {
      dispatch_sync(dispatch_get_main_queue(), block);
    }
```

不过，可能Xcode 9 beta版的缘故，MTC还存在不少问题，已知发现的有：

+ 存在较多误报，比如自己针对UIView的一些线程安全的扩展就会被误判。
+ `[label performSelectorInBackground:@selector(setText:) withObject:@"setText here will cause Xcode to pause!"];`是不会被检测出来的。

**如果仅希望在实际工程中使用MTC，看完上面的信息就可以了，文章的剩下部分是对实现原理的探索，有兴趣的读者可以花点时间一起探究。**

# 反向工程
因为对`libMainThreadChecker.dylib`的实现感兴趣，就花点时间做了反向工程，工具以[hopper](https://www.hopperapp.com/)为主，[ida](https://www.hex-rays.com/products/ida/)为辅。因为篇幅限制，对工具的使用说明就不啰嗦了。

通过hopper的分析，发现MTC定义了一系列的环境变量。

![MTC的环境变量](http://y.photo.qq.com/img?s=5nIZCr37R&l=y.jpg)

这里面我们比较关心的是`MTC_VERBOSE`，将该环境变量置1，

![设置MTC_VERBOSE](http://y.photo.qq.com/img?s=3y5m2BNAj&l=y.jpg)

再运行程序，发现Console出现了一些比较有意思的东西。

Console输出了所有被替换的类，总共替换有**381个类**，被替换的方法一共是**11067个**，低于这381个类所有方法的数之和**17886**。

![被替换的所有类](http://y.photo.qq.com/img?s=ys6CAjxwP&l=y.jpg)

那MTC是如何决定哪些类、哪些方法需要被替换呢？咱们按照如下顺序分析hopper给出的伪代码。

1. 打印错误日志 
2. 检测是否主线程调用 
3. 决定对哪些API进行检测

## 打印错误日志
```objc
int ___ASSERT_API_MUST_BE_CALLED_FROM_MAIN_THREAD_FAILED__(int arg0) {
    ......
    // 打印当前线程信息
    rax = __snprintf_chk(r14, sign_extend_64(r15), 0x0, 0xffffffffffffffff, "PID: %d, TID: %llu, Thread name: %s, Queue name: %s, QoS: %d\n", var_4B8, var_4D8, r13, var_4C0, rbx);
    if (r15 > 0x0) {
        // 打印当前线程堆栈信息
        rax = __snprintf_chk(r14, sign_extend_64(r15), 0x0, 0xffffffffffffffff, "Backtrace:\n");
        ......
    }
    ......
}
```

MTC发现错误的时候，会调用`___ASSERT_API_MUST_BE_CALLED_FROM_MAIN_THREAD_FAILED__`方法来打印当前的线程信息和该线程的栈信息。

## 检测是否主线程调用
```objc
void _checker_c(int arg0, int arg1) {
    rbx = arg1;
    r14 = arg0;
    if (*(int8_t *)_envPrintSelectorStats != 0x0) {
            *(r14 + 0x28) = *(r14 + 0x28) + 0x1;
    }
    // 是否是主线程检查
    if (pthread_main_np() == 0x0) goto loc_291c7;
    loc_291c7:
    ......
    loc_292b6:
    if (*(int8_t *)__tlv_bootstrap(_in_report_callback) == 0x0) {
            rbx = __tlv_bootstrap(_in_report_callback);
            *(int8_t *)rbx = 0x1;
            ___ASSERT_API_MUST_BE_CALLED_FROM_MAIN_THREAD_FAILED__(*(r14 + 0x20));
            *(int8_t *)rbx = 0x0;
    }
    return;
}
```

检测函数也很直接，就是调用了`pthread_main_np()`这个`posix`线程的底层函数做的判断。如果发现不是主线程，就去调用`___ASSERT_API_MUST_BE_CALLED_FROM_MAIN_THREAD_FAILED__`报错了。

## 决定对哪些API进行检测
```objc
if (objc_getClass("UIView") != 0x0) {
        ......

        // 注册检测函数
        _initialize_trampolines(_checker_c);

        ......

        // 找到UIKit或者APPKit中的所有需要检测的类
        *var_240 = objc_getClass("UIView");
        *(var_240 + 0x8) = objc_getClass("UIApplication");
        _FindClassesToSwizzleInImage(r12, var_240, 0x2);

        // 找到WebKit中所有需要检测的类
        if (r14 != 0x0) {
              *var_230 = objc_getClass("WKWebView");
              *(var_230 + 0x8) = objc_getClass("WKWebsiteDataStore");
              *(var_230 + 0x10) = objc_getClass("WKUserScript");
              *(var_230 + 0x18) = objc_getClass("WKUserContentController");
              *(var_230 + 0x20) = objc_getClass("WKScriptMessage");
              *(var_230 + 0x28) = objc_getClass("WKProcessPool");
              *(var_230 + 0x30) = objc_getClass("WKProcessGroup");
              *(var_230 + 0x38) = objc_getClass("WKContentExtensionStore");
              _FindClassesToSwizzleInImage(r14, var_230, 0x8);
        }
        rcx = CFArrayGetCount(*_classesToSwizzle);
        if (rcx != 0x0) {
          ......
                    // 通过runtime找出一个类下所有的方法进行替换，这就是自己扩展的线程安全的函数会被误报的原因
                    r14 = class_copyMethodList(rax, 0x0);
                    if (0x0 != 0x0) {
                          rbx = 0x0;
                          do {
                                r13 = *(r14 + rbx * 0x8);
                                r15 = method_getName(r13);
                                r12 = sel_getName(r15);
                                if (*(int8_t *)r12 != 0x5f) {
                                // 过滤掉一些不需要检测的方法，包括retain、release、autorelease、
                                // description、debugDescription、self、class、beginBackgroundTaskWithExpirationHandler、
                                // beginBackgroundTaskWithName:expirationHandler:、endBackgroundTask:
                                if (/*不需要检测的方法*/) {
                                      ......
                                      // 替换方法实现，进行检测
                                      _addSwizzler(r13, r15, var_258, r12, 0x1);
                                    ......
                                }
                                ......
                          } while (rax != rcx);
          ......
            // 如果设置了MTC_VERBOSE，打印日志
            if (*(int8_t *)_envVerbose != 0x0) {
                    rdi = *___stderrp;
                    rdx = *_totalSwizzledMethods;
                    fprintf(rdi, "Swizzled %zu methods in %zu classes.\n", rdx, rcx);
            }
            ......
          }
        }
      }
    }

void _FindClassesToSwizzleInImage(int arg0, int arg1, int arg2) {
    ......
    // 获取该库下的所有类
    rax = getsectiondata(arg0, "__DATA", "__objc_classlist", var_48);
    var_38 = rax;
    if (rax == 0x0) {
            rax = getsectiondata(var_40, "__DATA_CONST", "__objc_classlist", var_48);
            var_38 = rax;
            if (rax != 0x0) {
                    rax = var_48 >> 0x3;
                    var_2C = rax;
            }
            else {
                    var_2C = 0x0;
                    // 拷贝所有的类
                    var_38 = objc_copyClassList(var_2C);
                    rax = *(int32_t *)var_2C;
            }
    }
    ......
  }
```

上面的注释已经比较清晰地说明了MTC是遍历了UIKit或者APPKit，以及WebKit的所有类，然后再遍历每个类的所有方法进行替换，不过是排除了为数不多的几个方法而已。是不是这一切都看起来很简单呢？

## 替换实现
DEMO阶段我们提到过，MTC对性能的损耗是很小的，替换了`11067`个方法只会增加1-2%的CPU损耗和<0.1的启动时间影响，通过`_initialize_trampolines`以及`_addSwizzler`的伪代码可以知道，这一切都跟`trampoline`有关系。`trampoline`为何能这么屌呢？

```objc
// 传入的arg0就是checker_c函数
int _initialize_trampolines(int arg0) {
    *_registered_callback = arg0;
    *_first_trampoline = ___trampolines;
    return ___trampolines;
}

// arg0 函数方法体，类型Method
// arg1 函数selector，类型SEL
// arg2 函数名字，类型char *
// arg3 函数所在类，类型Class
// arg4 是否快速替换，类型BOOL
int _addSwizzler(int arg0, int arg1, int arg2, int arg3, int arg4) {
    // 根据需要替换的函数生成相应的trampoline代码
    rbx = _add_trampoline(method_getImplementation(r13), var_230);
    r12 = _trampoline_address_from_index(rbx);
    *(_trampoline_data_from_index(rbx, var_230, 0x0, 0x200, "-[%s %s]", arg2) + 0x10) = r13;
    *(_trampoline_data_from_index(rbx, var_230, 0x0, 0x200, "-[%s %s]", arg2) + 0x18) = r14;
    // 将需要替换的函数替换成trampoline实现
    if (arg4 != 0x0) {
            _swizzleImplementationFast(r14, r13, r12);
    }
    else {
            method_setImplementation(r13, r12);
    }
    *_totalSwizzledMethods = *_totalSwizzledMethods + 0x1;
    rax = *___stack_chk_guard;
    if (rax != var_30) {
            rax = __stack_chk_fail();
    }
    return rax;
}

int _add_trampoline(int arg0, int arg1) {
    r14 = *_trampolines_used;
    *_trampolines_used = r14 + 0x1;
    *(r14 * 0x38 + _data) = r14;
    *(r14 * 0x38 + 0x2b3a8) = arg0;
    *(r14 * 0x38 + 0x2b3c0) = strdup(arg1);
    *(r14 * 0x38 + 0x2b3d0) = 0x0;
    *(r14 * 0x38 + 0x2b3c8) = 0x0;
    rax = r14;
    return rax;
}
```

[GCC对trampoline的描述](https://gcc.gnu.org/onlinedocs/gccint/Trampolines.html)对我们理解trampoline比较有帮助。

> A trampoline is a small piece of code that is created at run time when the address of a nested function is taken. It normally resides on the stack, in the stack frame of the containing function. These macros tell GCC how to generate code to allocate and initialize a trampoline.

> The instructions in the trampoline must do two things: load a constant address into the static chain register, and jump to the real address of the nested function

GCC告诉我们，trampoline就是根据一个函数的地址创建一小段代码，这一小段代码就给了程序机会去处理一些事情，然后再跳转到真正的函数。

MTC就是需要这样的特性，需要在每次函数调用之前，先检查是否在主线程，然后再跳转真正的函数实现。

整个替换的流程如下：

1. 在`_initialize_trampolines`的时候，注册了主线程检查的回调函数。
2. 在`_add_trampoline`的时候，对每个需要替换的函数都生成了trampoline的代码。
3. 在`_addSwizzler`中对函数实现做了替换。

trampoline这种设计也被使用在[部分操作系统的中断实现](http://www.drdobbs.com/embedded-systems/trampolines-for-embedded-systems/184404772)上面，就是因为其性能很好，可见苹果为了减少大规模方法替换对性能的影响，也是煞费苦心的。

# 参考文档
+ [main_thread_checker苹果官网](https://developer.apple.com/documentation/code_diagnostics/main_thread_checker)
+ [Trampoline Wikipedia](https://en.wikipedia.org/wiki/Trampoline_(computing))
+ [GCC对trampoline的描述](https://gcc.gnu.org/onlinedocs/gccint/Trampolines.html)
