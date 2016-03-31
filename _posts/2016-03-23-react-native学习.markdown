---
layout: post
title: React Native学习
date: 2016.03.22
categories: js react-native
---

# 什么是React Native
React Native是下一代的React，是用React的思想来实现Native App的开发。使用React开发的时候，会强制我们将应用拆分成各种各样的组件，而做过Native开发的同学都知道，不论是iOS UIKit还是Android UI Components，天生就是组件，React和Native的结合是冥冥之中就是注定的。

那为什么要选择React Native呢？其实主要原因还是native的开发远远没有web开发方便，首当其冲的就是native的开发速度太慢了，编译重启占据了开发的大量时间，而web开发只要修改文件，保存文件，刷新浏览器就可以看到效果了，现在的工具甚至都帮你省去了刷新的工作，简直惊呆了做了几年native开发的小伙伴。另外升级也是一大痛点，每次新特性的效果都要等版本灰度到一定程度才能看到，这时间短则几天，多则能达到几周，这是快速迭代所不能容忍的。还有就是现在app已经化身为三个主要平台，iOS、Android以及H5，三套班子干一样的活，react native可以实现一套班子干所有平台的说，是不是想想都激动呢？以前H5的体验比不上Native，因此大部分的公司还是采用native来写app，而现在react native已经提供了一种可能性，让app开发不仅拥有native的优秀体验，而且还有h5开发的快捷方便。

好了，废话不多说，工欲善其事必先利其器，环境搭起来，代码秀起来。

# 开发环境搭建
这里开发环境以iOS为例，首先你的电脑上必须要安装有node和watchman，而且Xcode必须是7.0以上的版本。
[watchman](https://facebook.github.io/watchman/)就是盯梢男，是专门帮react native观察文件的变更的，当文件发生变化的时候，其就会记录变化，并执行相应的操作，等我们环境搭建完成之后，我们在修改js的时候，就可以看到terminal中会有相应的编译信息输出，这就是watchman在帮忙编译。
安装node和watchman的脚本
```shell
brew install node
brew install watchman
```

React Native是已两个npm包发布的，这两个包分别是react-native-cli和react-native。前者是轻量级的命令行工具，而后者才是真正的React Native框架代码。

所以有命令行工具好用，感觉世界会变得很美好。执行一下命令安装工具。
```shell
npm install -g react-native-cli
```
这样我就有了我们所需要的命令了，紧接创建我们自己的工程。
```shell
react-native init xxxProject
```
安装会有点慢，安装完了之后该怎么执行呢？还是要靠react-native-cli,react-native-cli的全部命令如下：
```shell
  - start: 开启webserver
  - bundle: 构建js bundle离线包
  - unbundle: 构建js 非bundle离线包
  - new-library: 生成native的桥库[Linking Libraries](https://facebook.github.io/react-native/docs/linking-libraries-ios.html#content)
  - link: 链接第三方库
  - android: 生成androidandroid工程
  - run-android: 编译android工程，并在android模拟器中运行
  - run-ios: 编译iOS工程，并在iOS模拟器中运行
  - upgrade: 升级框架
```
聪明的你肯定一眼就看出来应该执行啥了，没错，就是如下命令。
```shell
react-native run-ios
```
当然其实他主要是帮你做了两件事，一件是启动一个webserver，另外一个就是起一个模拟器。其实你完全可以自己手动通过`npm start`开启webserver，然后打开xcode工程文件，编辑打开模拟器，是一样的。

完事了，修改下index.ios.js，在模拟器里面CMD+R试下，是不是很简单，很方便？

# Components
继承自RCTViewManager

# APIs
只实现RCTBridgeModule协议


# 世上最全RN学习资料，没有之一
+ [React-Native学习指南](https://github.com/ele828/react-native-guide)

# 参考文献
+ [React Native: Bringing modern web techniques to mobile](https://code.facebook.com/posts/1014532261909640/react-native-bringing-modern-web-techniques-to-mobile/)
+ [React Native官网](http://facebook.github.io/react-native/)
+ [react native introduction](http://www.appcoda.com/react-native-introduction/)
+ [查询和提交组件的网站](https://js.coach/react-native)