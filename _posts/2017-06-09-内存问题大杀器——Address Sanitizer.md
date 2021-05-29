---
layout: post
title: 内存问题大杀器——Address Sanitizer
date: 2017-06-09
categories: iOS Xcode QA
---

> 内存问题一直是困扰程序员的大问题，内存泄露、内存溢出、内存错误这些疑难杂症能逼疯一箩筐程序员。Address Sanitizer，简称ASan是Xcode自带的内存问题调试工具，原理简单，功效显著。本文主要介绍了ASan的主要功能、基本原理以及最佳实践。

# Address Sanitizer
Address Sanitizer（简称ASan）是高效的内存问题检测工具。这个屌屌的工具是由LLVM提供的，被苹果集成到Xcode中用来在运行时找出C语言或者Swift的内存污染或者其他内存错误的。

简单的内存错误我们可以通过复现或者闪退日志轻松解决。但是更多的内存问题是非常棘手的，因为他们远离现场，缺少证据。也就是说在内存出现问题一段时间之后，程序才会出现难以预测的行为，而且很难稳定复现。要想轻松解决该类内存问题，就得想办法保留事发现场，ASan就堪此大任。

ASan能在内存 **出现问题的时候暂停程序** ，并将内存 **从创建到使用整个过程记录下来** ，大大降低了问题的排查难度。下面具体看看ASan提供了针对哪些内存问题的检测功能。

# 功能列表
1. 检测内存被dealloc之后仍然被使用的问题。
2. 检测内存重复dealloc的问题。
3. 检测dealloc不是通过malloc分配的内存的问题。
4. 检测函数返回之后，栈变量仍然被访问的问题。
5. 检测在变量作用域范围之外使用变量的问题。
6. 检测缓存越界访问的问题。
7. 检测C++容器越界访问的问题。

# 基本原理
1. 使用自定义的malloc函数替换系统malloc函数，自定义malloc函数在分配内存之后会将该区域前后标记为off-limits。
2. 使用自定义的free函数替换系统free函数，自定义free函数并不会立马将内存释放，而是将该区域标记为off-limits，并加到隔离queue中，延迟释放。
3. 当访问内存的时候，如果内存地址是off-limits的，那么ASan就会报错了，伪代码如下：

```c
// Before
*address = ...;  // or: ... = *address;

// After
if (IsMarkedAsOffLimits(address)) {
  ReportError(address);
}
*address = ...;  // or: ... = *address;
```

不幸的是，开启ASan会导致CPU慢2-5x，内存也会涨2-3x，因此大型项目一直开着ASan跑很容易就因为内存问题跑挂了。

# 如何开启ASan
一图胜千言。在使用Xcode中开发，可以如下开启ASan。
![double free——不开启ASan](http://y.photo.qq.com/img?s=nj4LnQMho&l=y.jpg)

另外！
ASan是LLVM的一个工具，这意味着ASan可以脱离Xcode来跑。ASan能够和Monkey等自动化工具整合，因为一般疑难内存问题都是偶现的，结合自动化，能极大的增强ASan的作用。

# DEMO
我们构造了内存重复free的场景，大致看一下开启ASan和不开启ASan的区别。

```objc
- (void)viewDidLoad {
    [super viewDidLoad];
    // Do any additional setup after loading the view, typically from a nib.
    
    int *pointer = malloc(sizeof(int));
    free(pointer);
    free(pointer);
}
```

下图是没有开启ASan，程序挂掉的场景。
![double free——不开启ASan](http://y.photo.qq.com/img?s=6nJHwNpdV&l=y.jpg)

下图是开启ASan，程序挂掉的场景，信息量大大增加，将各种内存分配和释放的堆栈都打出来了，有了这些信息，解决问题的难度就大大下降了。
![double free——开启ASan](http://y.photo.qq.com/img?s=K9A6FUxHk&l=y.jpg)

# 参考文档
1. [apple address sanitizer](https://developer.apple.com/documentation/code_diagnostics/address_sanitizer)
2. [clang address sanitizer](https://clang.llvm.org/docs/AddressSanitizer.html)
3. [google address sanitizer](https://github.com/google/sanitizers/wiki/AddressSanitizer)
