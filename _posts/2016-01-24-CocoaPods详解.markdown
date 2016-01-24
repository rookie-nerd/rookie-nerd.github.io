---
layout: post
title: CocoaPods详解
date: 2016.01.24
categories: objective-c
---

# CocoaPods简介
相信写过iOS程序的同学们都应该就接触过CocoaPods的，他就是iOS界的Maven，帮助开发者们管理着程序依赖的第三方framework乃至自己拆分出来的framework。通过简单的在Podfile中配置项目的依赖，CocoaPods将自动递归地寻找依赖，获取源码并创建工程。cocoaPods的使用是非常直观的，本文主要不介绍CocoaPods的使用，而是简单的探寻其背后的原理和实现。

以下是使用CocoaPods的几乎全部文档，附上创送门，给需要的孩子。

+ [CocoaPods的安装](http://guides.cocoapods.org/using/getting-started.html#installation)
+ [Podfile参考文档](https://guides.cocoapods.org/syntax/podfile.html)
+ [Podspec参考文档](https://guides.cocoapods.org/syntax/podspec.html)
+ [Pod命令参考](https://guides.cocoapods.org/terminal/commands.html#commands)

# Project&&Target&&Workspace&&Scheme
[参考文档](https://developer.apple.com/library/ios/featuredarticles/XcodeConcepts/Concept-Targets.html#//apple_ref/doc/uid/TP40009328-CH4-SW1)
## Target
一个project可以包含一个或者多个target，每个target对应生成一个产品。
每个target定义了相应的产品，并管理构建这个产品所需要的源文件和处理这些文件的指令。处理文件的指令主要由build settings和build phases决定。target的build settings继承自project的build settings，但可以在target覆盖修改。

## Project
Project可以单独存在，也可以包含在workspace中；Project包含一个或多个target，用于构建一个或多个产品。Project管理着所有的文件、资源以及构建一个或者多个软件所需要的信息。同时也为所有的target提供默认的build settings。
一个Project文件包含以下信息：

+ 源文件相关，包含源代码、库和framework、资源文件、nibs等
+ 用来管理源文件的组信息
+ Project层级的配置信息
+ Targets
+ 用于调试或测试程序的可执行环境

## Workspace
一个workspace可以包含多个projects，以及其他任何你想要管理的文件。workspace是个Xcode文档，将projects和其他文档组合，方便一起管理。workspace还隐性的或者显性的提供了其包含的projects以及他们的targets之间的关系。
workspace让Projects之间的工作变得简单，比如代码自动提示、跳转到定义等等。在一个workspace中的projects共享一个build目录，不同的workspace拥有不同的build目录。所以workspace能提供隐性的依赖关系解决，同时通过配置来提供显性的关系解决。

## Scheme
scheme定义了一组需要构建的targets，以及构建时需要的配置和一组需要执行的test

# Xcode Command Line
## xcrun
xcrun可以用来定位Xcode的开发者工具，也可以用来调用Xcode的开发者工具
```shell
xcrun --sdk iphoneos9.0 --find clang

 # sample result
 # /Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/bin/clang
```

## xcodebuild
xcodebuild用于构建Xcode工程中的一个或者多个target，或者构建Xcode工程或者workspace中的scheme


## xcode-select

## xcodeproj

