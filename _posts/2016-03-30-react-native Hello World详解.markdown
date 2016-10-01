---
layout: post
title: React Native Hello World详解
date: 2016.03.22
categories: js react-native
---

直入主题怎么搞React Native。

# 如何创建Helloworld
请查阅google，或者本人上一篇blog

# Hello World
因为react native不仅包括js，还包括native，这里我们需要将他们分开来看。首先看native，打开HelloWorld工程。我们可以发现代码结构非常简单，除了多了一个Libraries，和我们全新创建一个SinglePage Application也没有什么大的区别。展开Libraries，我们可以看到一堆工程，正式因为这些工程的存在，才使得js和native之间的交互成为可能。

```smalltalk
// 该工程是React Native的核心工程，实现了js和native之间桥的功能
// 实现了布局、模块以及大量的基础UI等。
// 该工程下的代码体现了fb工程师的大量智慧，值得深入研究
React  ??这是什么鬼？

// ActionSheet组件
RCTActionSheet

// 地址位置组件
RCTGeolocation

// 图片操作组件
RCTImage

// 连接组件
RCTLinking

// 网络组件
RCTNetwork

// 设置组件
RCTSetting

// 文本组件
RCTText  ??这是什么鬼？

// 震动组件
RCTVibration

// web端口组件
RCTWebSocket
```

从上面的注释可以看出来，每个组件都给js提供了某种native的能力，而所有人都可以开发自己的组件，然后共享给别人[JS Coach](https://js.coach/react-native)。可以想见，未来React Native的能力会越来越强大，做到以前js不能做到的好多事情。

然后我们看看AppDelegate的中的不一样的地方。

```smalltalk
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  NSURL *jsCodeLocation;

  // 选择1：从webserver获取js bundle
  jsCodeLocation = [NSURL URLWithString:@"http://localhost:8081/index.ios.bundle?platform=ios&dev=true"];

   // 选择2：从预先打好的bundle文件中获取js 
   // jsCodeLocation = [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];

  // 创建了一个RCTRootView，该View绑定了Bundle的Url，模块名字等信息。??RCTRootView是什么鬼？
  RCTRootView *rootView = [[RCTRootView alloc] initWithBundleURL:jsCodeLocation
                                                      moduleName:@"Helloworld"
                                               initialProperties:nil
                                                   launchOptions:launchOptions];

  // 和以前差不多，就是把view加到window上。
  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
  UIViewController *rootViewController = [UIViewController new];
  rootViewController.view = rootView;
  self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];
  return YES;
}
```

其实上面的代码已经非常直观，RCTRootView是一个比较特殊的view，其会从jsCodeLocation中获取js，并根据ModuleName以及其他参数执行相关操作，也就是将js的执行装换成native的界面显示。ok，看到这里，我们先放下很多疑问，可以确定的是，我们的在Native这一段已经有了js的承载，是时候让index.ios.js上场了。
index.ios.js是APP起来的时候拉取的js，一起来看下这个js干了啥。代码不是很长，我们划分一下就比较清晰了。

```js
'use strict'; // js语法，不关心

// 从react-native中导入相应的模块 ??react-native是什么鬼？
import React, {
  AppRegistry,
  Component,
  StyleSheet,
  Text,
  View
} from 'react-native';


// 定义了一个Helloword的组件，因为我们发现他是继承自Component的 ??Component是什么鬼？
class Helloworld extends Component {
  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>
          Welcome to React Native4!
        </Text>
        <Text style={styles.instructions}>
          To get started, edit index.ios.js
        </Text>
        <Text style={styles.instructions}>
          Press Cmd+R to reload,{'\n'}
          Cmd+D or shake for dev menu
        </Text>
      </View>
    );
  }
}

// 这非常像CSS，一定是用来布局的  ??StyleSheet是什么鬼？
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});

// 这里执行了前面定义的Helloworld组件 ?? AppRegistry是什么鬼？
AppRegistry.registerComponent('Helloworld', () => Helloworld);
```

# native端技术解析
好吧，你都跑起来了，你说啥就是啥了，但我还是想问一句，前面这些鬼到底是什么鬼？我们一起来捋一下。
## 鬼-React
React工程是React Native在Native端的核心工程，其最主要的功能是实现提供js和native之间通信的机制，并基于这种机制封装一系列功能供js和native之间的交互。因为这一块逻辑较为复杂，细节很多，在这里就不详述，后续会有文章专门对此进行分析。大家只要记住，React创建了Native这一段和js通信的Bridge，并且基于bridge提供了基本的交互能力，ui扩展能力，module扩展能力等等。

## 鬼-RCTRootView
RCTRootView有点类似Native的window，其被用来作为React管理的views的宿主view，也就是说我们每开发一个新的react的页面（viewController），必须用RCTRootView作为宿主view。其可以通过指定moduleName来实现有效的隔离，也可以指定loadingView来实现加载过程中的loading效果。

## 鬼-RCTTextView
React的架构是支持component扩展的，这也是必须的，RCTTextView就是react native自带的View扩展之一，非常基本，正好借此机会学习下如何扩展View，增加js的能力。
一般ui扩展都是通过继承RCTViewManager来实现的，而RCTTextView是通过RCTTextViewManager来实现扩展的。下面简单看一下RCTTextViewmanager的代码。

```smalltalk
// RCTTextViewManager.h
@interface RCTTextViewManager : RCTViewManager
@end


// RCTTextViewManager.m
@implementation RCTTextViewManager

RCT_EXPORT_MODULE()

- (UIView *)view
{
  return [[RCTTextView alloc] initWithEventDispatcher:self.bridge.eventDispatcher];
}

RCT_REMAP_VIEW_PROPERTY(autoCapitalize, textView.autocapitalizationType, UITextAutocapitalizationType)
RCT_EXPORT_VIEW_PROPERTY(autoCorrect, BOOL)
......
RCT_CUSTOM_VIEW_PROPERTY(fontSize, CGFloat, RCTTextView)
{
  view.font = [RCTConvert UIFont:view.font withSize:json ?: @(defaultView.font.pointSize)];
}
.......
```

下面简单总结一下扩展UIView的方法。
首先，RCTTextViewManager是继承自RCTViewManager的。
其次，通过宏RCT_EXPORT_MODULE()实现module暴露给js
再次，实现`- (UIView *)view`，返回view
最后，RCT_REMAP_VIEW_PROPERTY()、RCT_EXPORT_VIEW_PROPERTY()、RCT_CUSTOM_VIEW_PROPERTY()等宏实现属性暴露给js

这里有很多技术细节，比如

+ RCT_EXPORT_MODULE()的原理是什么？
+ 什么是Module，为啥要暴露Module给js呢？原理是什么呢？
+ RCT_REMAP_VIEW_PROPERTY()、RCT_EXPORT_VIEW_PROPERTY()等是怎么实现的？
+ RCT_EXPORT_SHADOW_PROPERTY()为啥还有Shadow?
+ Native和js函数之间的参数是如何转换的呢？

这些都是更加基础的问题，建议有精力的同学可以阅读更多的文章，阅读源码，深入研究下。

# js端技术解析

## 鬼-react-native

## 鬼-Component

## 鬼-StyleSheet

## 鬼-AppRegistry
