---
layout: post
title: react-native trampoline实现
date: 2018-12-02
categories: react-native
---

ReactNative有Profiler的功能，能计算每个函数的执行耗时。为了尽量减少测量代码对函数本身执行的影响，ReactNative采用汇编实现Trampoline来实现该功能。本文主要记录该部分核心代码的解读，顺便记录阅读汇编代码的一些技巧。


## 关键字
+ [arm指令查询地址](http://infocenter.arm.com/help/index.jsp?topic=/com.arm.doc.den0024a/ch04s06s02.html)
+ [arm64调用约定](http://infocenter.arm.com/help/topic/com.arm.doc.ihi0055b/IHI0055B_aapcs64.pdf)
+ [pseudo-ops](https://sourceware.org/binutils/docs/as/Pseudo-Ops.html#Pseudo-Ops)

## 什么是Trampoline
Trampoline通常都和跳转相关。本文提到的Trampoline是一个特定的地址，该地址指向特定的功能，待功能执行完毕之后，立马跳出Trampoline回到正常执行路径。

就跟蹦床（英文名：Trampoline）一样，一直在bouncing。


## 代码实现
ReactNative的Trampoline都是纯手工汇编实现的。因为iOS真机有armv7s、arm64等架构，模拟器有i386、x86_64架构，因此其实现也有四种方式。

+ [i386](https://github.com/facebook/react-native/blob/master/React/Profiler/RCTProfileTrampoline-i386.S)
+ [x86_64](https://github.com/facebook/react-native/blob/master/React/Profiler/RCTProfileTrampoline-x86_64.S)
+ [armv7s](https://github.com/facebook/react-native/blob/master/React/Profiler/RCTProfileTrampoline-arm.S)
+ [arm64](https://github.com/facebook/react-native/blob/master/React/Profiler/RCTProfileTrampoline-arm64.S)

他们的实现是大同小异的，只是其汇编指令和寄存器不太一样。但阅读代码的方式是一样的。本文仅已arm64为例。

## ABI
在阅读汇编之前，需要先了解ABI(Application Binary Interface)这个概念。

ABI是两个**二进制程序**模块之间的调用接口。一般我们写的代码经过编译器编译链接之后生成二进制代码，因此平常我们并不直接和ABI打交道。ABI定义了机器码如何访问数据结构和函数，而**机器码是一种低级的，和硬件相关的格式**。

因此ABI的制定一般都是编译器、操作系统等设计开发者的活，一般的开发者较少接触到ABI。

而针对arm64的芯片，arm公司则制定了自己的ABI标准。因此在阅读汇编之前，我们先要了解一下ARM公司制定的这个ABI标准。

一般ABI都包括一下几个部分的内容：

+ 处理器指令集
+ 数据类型的大小、布局和对齐方式
+ 调用约定，确定函数的参数是如何传递的，函数的返回值是如何获取的。例如，是所有的参数都通过栈传递，还是部分参数通过寄存器传递；哪个寄存器用于哪个函数参数；通过栈传递的第一个函数参数是最先push到栈上还是最后。
+ 系统调用的编码和一个应用如何向操作系统进行系统调用。
+ 以及在一个完整的操作系统ABI中，目标文件的二进制格式、程序库等等。

以上的五大块，每一块都有厚厚的文档详细来规范和描述。我们现在只关心**处理器指令集**和**调用约定**部分。因为处理器指令集在arm64上非常繁杂，我们一般都是遇到了再去查询其真正的用法和意义,arm指令的[查询地址在此](http://infocenter.arm.com/help/index.jsp?topic=/com.arm.doc.den0024a/ch04s06s02.html)。但调用约定对我们阅读汇编代码非常重要，我们需要不断的熟悉调用约定的说明文档，对于阅读和编写汇编代码极其重要。

[arm64的调用约定说明在此](http://infocenter.arm.com/help/topic/com.arm.doc.ihi0055b/IHI0055B_aapcs64.pdf)，ABI一般都是保持相对稳定的，大可下载之后珍藏起来。我们将在后面的分析中频繁的用到这里面的信息。

## 寄存器
在分析代码之前，最基本的需要先了解下每个寄存器的功能。

![通用寄存器](https://img.alicdn.com/tfs/TB1pFWewiLaK1RjSZFxXXamPFXa-570-387.png)

该截图来自于[arm64调用约定](http://infocenter.arm.com/help/topic/com.arm.doc.ihi0055b/IHI0055B_aapcs64.pdf)，该文档里有针对每个寄存器功能的说明。

这里需要划几个重点：

+ r0-r7被函数用来传递参数，也被用来保存返回的值。
+ 在64-bit的机器上，r0-r30寄存器被命名为x0-x30。
+ 在32-bit的机器上，r0-r30寄存器被命名为w0-w30。

## 调用栈
理解汇编代码之前，还需要对调用栈非常熟悉。

![函数调用栈](https://img.alicdn.com/tfs/TB1jWVSwgHqK1RjSZFPXXcwapXa-862-564.png)

要点记录：

+ S栈往下生长
+ SP指向最新的栈地址


## 代码分析
下面进入代码分析阶段。

```asm
.align 5
```

当我们去arm指令查询地址查询 `.align` 的时候是查不到的。这是为什么呢？

原来汇编器处理汇编命令分成两种类型，一种是在代码执行的时候处理，也就是之前提到的机器指令。还有一种是在汇编编译编译阶段就已经处理调的，这种指令一般都被叫做 `pseduo-op` ，通常也叫作 `assembler instructions, assembler operators, or assembler directives`。后一种指令的处理是由汇编器来做的，在iOS中就是由[llvm-as](https://llvm.org/docs/CommandGuide/llvm-as.html)来处理的。

`pseduo-op` 一般都是已 `.` 开头的，在[这里](https://sourceware.org/binutils/docs/as/Pseudo-Ops.html#Pseudo-Ops)我们可以找到绝大部分的 `pseduo-op`。


因此 `.align 5` 的意思就是内存已 `2^5 = 32` 位对齐，也就是4字节对齐。注意这里 `.align` 后面的数字根据硬件不同是有不同的定义的，大家可以尝试查询上面的文档来了解，但在arm上，一般都 `2` 的指数。


```asm
.globl SYMBOL_NAME(RCTProfileTrampoline)
SYMBOL_NAME(RCTProfileTrampoline):
```

这个就比较简单了，就是定义一个全局的符号，这里相当于定义了一个全局的函数，名字叫 `RCTProfileTrampoline`。就是一个专门实现 `Profile` 的 `Trampoline`。

```asm
// Basic prolog: save the frame pointer and the link register (caller address)
stp fp, lr, [sp, #-16]!
mov fp, sp
```

看这里注释提到了 `prolog`，这在汇编函数里面是比较基本的一个概念。他是函数最开始的几行汇编代码，用来保存部分寄存器，成对在函数末尾出现的 `epilog`，用来恢复 `prolog`做的事情，并将程序的控制权返回给函数调用者。

[苹果的官方文档](https://developer.apple.com/library/archive/documentation/Xcode/Conceptual/iPhoneOSABIReference/Articles/ARMv6FunctionCallingConventions.html#//apple_ref/doc/uid/TP40009021-SW12)给出了 `prolog` 和 `epilog` 的编译器实现。

prolog:

1. 将LR的值push到栈上
2. 将FP的值push到栈上
3. 设置FP的值为SP的值
4. 将必须要保存的寄存器的值push到栈上
5. 在栈上为本地存储分配空间

epilog:

1. 释放为本地存放分配的空间
2. 从栈上恢复必须要要保存的寄存器的值
3. 从栈上恢复FP的值
4. 通过从栈上恢复LR的值到PC，返回函数

`prolog` 保存了栈指针和调用者的地址，函数执行结束之后能够通过通过保存的这些数据调回函数调用地址，继续往下执行。


```asm
/**
 * Store the value of all the parameter registers (x0-x8, q0-q7) so we can
 * restore everything to the initial state at the time of the actual function
 * call
 */
sub sp, sp, #(10*8 + 8*16)
stp q0, q1, [sp, #(0*16)]
stp q2, q3, [sp, #(2*16)]
stp q4, q5, [sp, #(4*16)]
stp q6, q7, [sp, #(6*16)]
stp x0, x1, [sp, #(8*16+0*8)]
stp x2, x3, [sp, #(8*16+2*8)]
stp x4, x5, [sp, #(8*16+4*8)]
stp x6, x7, [sp, #(8*16+6*8)]
str x8,     [sp, #(8*16+8*8)]
```

`x0-x8` 是用来传递参数的，这个操作就是将参数保存到栈上，具体可以参考 **调用栈** 部分的图示。

注意 `sub sp, sp, #(10*8 + 8*16)`，sp是被减小的，因为栈是往下生长。


```asm
/**
 * Allocate 16-bytes for the values that have to be preserved across the call
 * to the actual function, since the stack has to be in the exact initial
 * state. During its lifetimewe use it to store the initial value of the
 * callee saved registers we use to point the memory, the actual address of
 * the implementation and the caller address.
 */
mov x0, #0x10
bl SYMBOL_NAME(RCTProfileMalloc)
// store the initial value of r19, the callee saved register we'll use
str x19, [x0]
mov x19, x0
```

该部分代码就是申请了16个字节大小的内存空间，该空间用来存在两部分信息。

1. 用来存放 `x19` 指向的内容，因为后面需要用 `x19` 来传递一些参数。
2. 被profile函数的实现。

值得注意的是，前面已经说到 `x0-x8` 是用来传递参数和获取返回值的，这里可以看到 `malloc` 的大小通过 `x0` 传入，返回的地址也是在 `x0`中。初步看汇编的话，会感觉比较懵逼。

```asm
/**
 * void RCTProfileGetImplementation(id object, SEL selector)
 *
 * Load the 2 first arguments from the stack, they are the same used to call
 * this function
 */
ldp x0, x1, [sp, #(8*16+0*8)]
bl SYMBOL_NAME(RCTProfileGetImplementation)
str x0, [x19, #0x8] // store the actual function address
```

获取前两个参数，然后调用 `RCTProfileGetImplementation`，并把放回的结果放在 `x19` 后8个字节。

```asm
/**
 * void RCTProfileTrampolineStart(id, SEL) in RCTProfile.m
 *
 * start the profile, it takes the same first 2 arguments as above.
 */
ldp x0, x1, [sp, #(8*16+0*8)]
bl SYMBOL_NAME(RCTProfileTrampolineStart)
```
在函数开始执行之前，执行 `RCTProfileTrampolineStart`。

```asm
// Restore all the parameter registers to the initial state.
ldp q0, q1, [sp, #(0*16)]
ldp q2, q3, [sp, #(2*16)]
ldp q4, q5, [sp, #(4*16)]
ldp q6, q7, [sp, #(6*16)]
ldp x0, x1, [sp, #(8*16+0*8)]
ldp x2, x3, [sp, #(8*16+2*8)]
ldp x4, x5, [sp, #(8*16+4*8)]
ldp x6, x7, [sp, #(8*16+6*8)]
ldr x8,     [sp, #(8*16+8*8)]
```
恢复所有参数

```asm
// Restore the stack pointer, frame pointer and link register
mov sp, fp
ldp fp, lr, [sp], #16
```
以上代码就是 `epilog`。

```asm
ldr x9, [x19, #0x8] // Load the function
str lr, [x19, #0x8] // store the address of the caller

blr x9 // call the actual function
```
之前将被 `profile` 函数的实现放在了 `x19` 的后半部分，现在取出来执行。

```asm
/**
 * allocate 32-bytes on the stack, for the 2 return values + the caller
 * address that has to preserved across the call to `free`
 */
sub sp, sp, #0x20
str q0, [sp, #0x0] // 16-byte return value
str x0, [sp, #0x10] // 8-byte return value

// void RCTProfileTrampolineEnd(void) in RCTProfile.m - just ends this profile
bl SYMBOL_NAME(RCTProfileTrampolineEnd)
```
执行 `RCTProfileTrampolineEnd`。

整个流程就是用汇编执行 `Start` => `被profile函数` => `End`。


```asm
/**
 * restore the callee saved registers, move the values we still need to the
 * stack and free the allocated memory
 */
mov x0, x19 // move the address of the memory to x0, first argument
ldr x10, [x19, #0x8] //  load the caller address
ldr x19, [x19] // restore x19
str x10, [sp, #0x18] // store x10 on the stack space allocated above
bl SYMBOL_NAME(RCTProfileFree)

// Load both return values and link register from the stack
ldr q0, [sp, #0x0]
ldr x0, [sp, #0x10]
ldr lr, [sp, #0x18]

// restore the stack pointer
add sp, sp, #0x20

// jump to the caller, without a link
br lr
```
恢复 `x19`，然后调回到被调用地址。 `br lr`是常见的函数返回汇编语句。

特别说明一下，为啥需要用 `x19`，而不是 `x9-x15`。因为在这个汇编的实现中，有很多的函数调用，`x9-x15`是不能保证在函数调用之后还能保持不变的。而子函数调用是一定要保证 `x19-x28` 不变的，所以可以在调用函数之后，继续使用 `x19`。这也是为什么在函数返回之前，一定要回复 `x19` 的原因。


## 参考文献
+ [Trampoline](https://en.wikipedia.org/wiki/Trampoline_(computing))
+ [Application Binary Interface](https://en.wikipedia.org/wiki/Application_binary_interface)
+ [Assembler Language Reference](http://ps-2.kev009.com/wisclibrary/aix52/usr/share/man/info/en_US/a_doc_lib/aixassem/alangref/align.htm#ujl1f0ken)
+ [prologue](https://en.wikipedia.org/wiki/Function_prologue)
