---
layout: post
title: Address Sanitizer
date: 2017-06-09
categories: iOS
---

Address Sanitizer的作用是跟踪代码导致的内存问题，这个基于LLVM的小工具能在运行时找出C语言或者Swift的内存污染或者其他内存错误。众所周知，一些内存错误会导致难以预测的行为，而且很难稳定复现，Address Sanitizer能帮助我们在开发阶段一旦发现问题，就能将该问题就地正法。

# 功能简介
1. 检测内存被dealloc之后仍然被使用的问题。
2. 检测内存被dealloc之后又被dealloc的问题。
3. 检测dealloc不是通过malloc分配的内存的问题。
4. 检测函数返回之后，栈变量仍然被访问的问题。
5. 检测在变量作用域范围之外使用变量的问题。
6. 检测缓存越界访问的问题。
7. 检测C++容器越界访问问题。


# 基本原理
上述每个功能的实现都是基于以下的基本原理。

使用自定义的malloc和free函数替换malloc和free函数。

1. 当malloc函数被调用的时候，分配内存之后并将该区域前后标记为off-limits。
2. 当free函数被调用的时候，其将该区域标记为off-limits，并加到隔离queue中，延迟释放。
3. 当访问内存的时候，如果内存是off-limits的，那么address sanitizer就会报错了，伪代码如下

```c
// Before
*address = ...;  // or: ... = *address;

// After
if (IsMarkedAsOffLimits(address)) {
  ReportError(address);
}
*address = ...;  // or: ... = *address;
```

不幸的是，开启address sanitizer会导致CPU慢2-5x，内存也会涨2-3x。

# 参考文档
1. [address_sanitizer](https://developer.apple.com/documentation/code_diagnostics/address_sanitizer)
