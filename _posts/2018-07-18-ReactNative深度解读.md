---
layout: post
title: ReactNative核心实现概述
date: 2018-07-18
categories: 动态化, react-native
---

> 长期以来开发者只有两种模式来开发应用，一种是使用原生代码来写原生应用，另外一种是使用js代码来写web应用。这两种模式各有利弊，前者主要体现在体验好，速度快，而后者主要体现在开发迭代快。因此长期以来，无数开发者前赴后继的探索，希望能寻找一种模式可以集两家之长于一身。而ReactNative正是这种探索的一个里程碑。

# 核心实现

本文从前端概览、前端和Native通信机制（桥）以及Native核心实现三个方面来描述其核心实现。

## 前端概览

在[ReactNative的官网](https://facebook.github.io/react-native/docs/tutorial.html)有这样一句话：

`React Native is like React, but it uses native components instead of web components as building blocks.`

也就是说，先有的React，然后才有的ReactNative。了解了React，也就掌握了ReactNative的基本设计思想。

![React VirtualDom](http://reactkungfu.com/assets/images/the-difference-between-virtual-dom-and-dom/header.png)

在React早期的官网首页，VirtualDom被放在非常重要的位置。而[最新的官网](https://reactjs.org/)将 **Component-Based** 放在了非常显眼的位置。本质上他们是一样，组件是VirtualDom的升级版描述。

为了解决js操作真实Html Dom慢的问题，React引入了VirtualDom。VirtualDom让React不再需要频繁的立即操作真实Html DOM，而是可以通过操作VirtualDom，并通过Dom Diff合并大部分操作，然后再对真实Html Dom进行批量操作。VirtualDom只是内存中的一个数据结构，对其进行比较、插入、修改要比修改真实Html Dom快的多。

其实VirtualDom也不是很复杂的东西，就是一个结构体，用来描述或真实或由真实组件搭建而成的组件，其在React的实现可以看[ReactElement的定义](https://github.com/facebook/react/blob/master/packages/react/src/ReactElement.js#L91)。

VirtualDom抽象除了加快js操作真实Html Dom，提升WebApp的性能外，还带来了额外的想象空间。如果VirtualDom最终批量操作的不是传统的Web组件，而是Native组件，那就可以使用React来开发具备Native体验的应用了，也就诞生了ReactNative。

![React渲染在别的平台上](https://img.alicdn.com/tfs/TB1OZqlFmBYBeNjy0FeXXbnmFXa-631-382.png)

React当前最新版本已经是16.x.x，查看其源码可以发现，react-reconciler是处理VirtualDom Diff的，其最终会调用react-art、react-dom或者react-native-render来渲染。react-reconciler将渲染部分的逻辑通过[ReactFiberHostConfig.js](https://github.com/facebook/react/blob/master/packages/react-reconciler/src/ReactFiberHostConfig.js)代理出来让各个渲染平台各自实现。

各个渲染平台都实现了自己的代理方法。

+ Web的实现为[ReactDOMHostConfig.js](https://github.com/facebook/react/blob/master/packages/react-dom/src/client/ReactDOMHostConfig.js)。
+ ReactART的实现为[ReactARTHostConfig.js](https://github.com/facebook/react/blob/master/packages/react-art/src/ReactARTHostConfig.js)。
+ ReactNative的实现为[ReactNativeHostConfig.js](https://github.com/facebook/react/blob/master/packages/react-native-renderer/src/ReactNativeHostConfig.js)，将来替换Fabric渲染之后，该实现是[ReactFabricHostConfig.js](https://github.com/facebook/react/blob/master/packages/react-native-renderer/src/ReactFabricHostConfig.js)。

React的优秀设计让各个渲染平台只需要关心自己的渲染逻辑，React在VirtualDom层做的优化能给所有的渲染平台都带来效益。这样的架构和抽象能力让人叹为观止。

## 通信机制（桥）

#### 基础通信能力

之前写过[Hybrid桥的原理剖析](http://www.rookie2geek.cn/bridge-bridge/)，目的是一样的，无非就是实现callNative和callJS的。不过ReactNative如果仅仅是实现这个，比Hybrid简单多了，因为有了JSC或者V8，不再需要各种黑科技。

在ReactNative中，桥被命名为[BatchedBridge](https://github.com/facebook/react-native/blob/master/Libraries/BatchedBridge/BatchedBridge.js)，因为前端reconciler（Dom diff）之后，对界面是批量操作的，通过BatchedBridge将一系列操作发给native。

既然是一系列的操作，那就需要队列来存储这些操作，BatchedBridge的本质就是一个消息队列，其具体的实现请参考[MessageQueue.js](https://github.com/facebook/react-native/blob/master/Libraries/BatchedBridge/MessageQueue.js)。**因为ReactNative的通信中存在消息队列，这意味着js对native的所有调用都是异步的**。

calljs的实现函数之一是[callFunctionReturnResultAndFlushedQueue](https://github.com/facebook/react-native/blob/master/Libraries/BatchedBridge/MessageQueue.js#L112)，BatchedBridge提供了若干类似的函数给native来调用。

```objc
- (void)_callFunctionOnModule:(NSString *)module
                       method:(NSString *)method
                    arguments:(NSArray *)args
                  returnValue:(BOOL)returnValue
                 unwrapResult:(BOOL)unwrapResult
                     callback:(RCTJavaScriptCallback)onComplete
{
  // TODO: Make this function handle first class instead of dynamically dispatching it. #9317773
  NSString *bridgeMethod = returnValue ? @"callFunctionReturnFlushedQueue" : @"callFunctionReturnResultAndFlushedQueue";
  [self _executeJSCall:bridgeMethod arguments:@[module, method, args] unwrapResult:unwrapResult callback:onComplete];
}
```

callnative的实现函数是[enqueueNativeCall](https://github.com/facebook/react-native/blob/master/Libraries/BatchedBridge/MessageQueue.js#L168)，每当前端框架需要调用native的时候，会将操作放到消息队列中，然后等待时机执行。

消息队列中的native调用执行的时机包括。

1. 距离上一次执行时间超过MIN_TIME_BETWEEN_FLUSHES_MS。
2. native调用了js，仔细观察calljs的函数实现，可以发现，其会flushQueue，flushQueue的结果会返回给native，native会进一步这些调用。

设计的第2点还挺好玩，执行完js顺便把queue里面的结果也带回到了native，可能也是极致地考虑了性能优化，毕竟多一次通信多一些成本。


#### 模块暴露

ReactNative设计了一种机制来暴露Native的模块，这种机制就是[NativeModules](https://github.com/facebook/react-native/blob/master/Libraries/BatchedBridge/NativeModules.js)。NativeModules让前端知道哪些模块是可以使用的，这样的好处是显而易见的。因为native响应js的调用是通过反射或者运行时来做的，如果js随便调用，很可能会导致native崩溃。

当ReactNative应用启动的时候，Native会将其支持的所有模块信息和每个模块的方法信息都收集起来，拼成一个json串，注入到`__fbBatchedBridgeConfig`这个全局变量中，然后前端框架会从这个全局变量中获取模块信息和每个模块的方法信息，生成相应的js函数挂在在NativeModules这个全局变量下面，这样使用方就可判断需要的Native模块极其方法是否存在。

native代码参见[这里](https://github.com/facebook/react-native/blob/75a735976d039c6d2db815d79e99731f086e306e/React/CxxBridge/RCTObjcExecutor.mm#L72)，js代码参见[这里](https://github.com/facebook/react-native/blob/master/Libraries/BatchedBridge/NativeModules.js#L162)。

为了优化性能，最新的代码加了模块信息的懒加载，非常优雅。

**Native模块定义了基本的native调用模式，即 模块id+方法id+参数**，这是ReactNative里面，最为重要的js调用native的协议定义。

#### 渲染协议

ReactNativeHostConfig.js中代理方法的实现都是通过NativeModule一个非常重要的模块UIManager来实现的，看字面意思是界面管理器，实际上也是管理着所有组件的创建、渲染、更新等能力。管理组件需要的能力抽象通过下面的demo来解释会比较清晰一点。

![demo](https://img.alicdn.com/tfs/TB19nJSFeuSBuNjy1XcXXcYjFXa-267-188.png)

如上的一个界面，一般开发者是如何实现的呢？

1. 创建蓝色的组件
2. 创建红色的组件
3. 将红色的组件作为蓝色的组件的子组件
4. 创建Text组件
5. 将Text组件作红色的组件的子组件

所以这里涉及到两个主要的功能，一个是创建组件，一个是设定组件之间的父子关系。

React本身就有[createElement的机制](https://reactjs.org/docs/react-api.html#createelement)，ReactNative参考createElement实现了createView来实现创建组件。

```
declare function createView(
    reactTag: number,
    viewName: string,
    rootTag: number,
    props: ?Object,
): void;
```

ReactNative在创建组件的时候，通过viewName来指定组件的类名，比如创建一个Text组件，传递的viewName就是RCTRawText。而组件的样式、布局、事件处理等等其他的一律通过props传递给native，props的设计具备良好的扩展性。

创建组件的时候还给每个组件都分配了一个独一无二的tag，该tag保证了js能找到native对应的组件，这种设计能在很多地方起到作用，比如更新组件、设置父子关系等等。

类似createView，ReactNative 还是提供了updateView接口是专门用来处理更新组件的情况，而不用每次都删除重建。

```
declare function updateView(
  reactTag: number,
  viewName: string,
  props: ?Object,
): void;
```

ReactNative为设置组件父子关系提供了两个接口，分别是setChildren和manageChildren。

```
declare function setChildren(
  containerTag: number,
  reactTags: Array<number>,
): void;
```


```
declare function manageChildren(
    containerTag: number,
    moveFromIndices: Array<number>,
    moveToIndices: Array<number>,
    addChildReactTags: Array<number>,
    addAtIndices: Array<number>,
    removeAtIndices: Array<number>,
): void;
```

还有其他若干接口，具体的定义可以参见[react-native-host-hooks](https://github.com/facebook/react/blob/master/scripts/flow/react-native-host-hooks.js#L41)。

react-native-host-hooks中的方法就是本文所说的通信协议，这些方法并不是前端框架实现的，而且js简单的包装一层，最终通过[BatchedBridge.enqueueNativeCall](https://github.com/facebook/react-native/blob/master/Libraries/BatchedBridge/NativeModules.js#L90)调用到native的实现。

## Native核心实现

关于这一块的详细设计，应该没有文章比这篇说的更清晰了，<<[Bridging in React Native](https://tadeuzagallo.com/blog/react-native-bridge/)>>，玩ReactNative没有读透这篇文章，应该算还没有入门吧。


# 参考文献

+ [The difference between Virtual DOM and DOM](http://reactkungfu.com/2015/10/the-difference-between-virtual-dom-and-dom/)
+ [Bridging in React Native](https://tadeuzagallo.com/blog/react-native-bridge/)