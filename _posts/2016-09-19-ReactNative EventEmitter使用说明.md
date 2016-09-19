---
layout: post
title: EventEmitter使用说明
date: 2016-09-16
categories: react-native
---

# 背景
最近升级了react-native框架，从0.19.0升到了0.32.0，改动还是挺大的，包括react和react-native的分离，以及巨量的特性更新和性能优化。本文主要为了说明0.32.0版本发送事件使用说明。

# old fashion
在0.19.0的时候，我们发送事件是通过`RCTEventDispatcher`来实现的，其有几个主要的接口供调用，他们分别是：

```smalltalk
- (void)sendAppEventWithName:(NSString *)name body:(id)body;
- (void)sendDeviceEventWithName:(NSString *)name body:(id)body;
- (void)sendInputEventWithName:(NSString *)name body:(NSDictionary *)body;
```

# new style
接口调用很简单，但是其带来的比较大的维护问题，因此为了规范事件使用，0.32.0将old fashion的接口都deprecated了。现在`RCTEventDispatcher`的源码如下：

```smalltalk
/**
 * Deprecated, do not use.
 */
- (void)sendAppEventWithName:(NSString *)name body:(id)body
__deprecated_msg("Subclass RCTEventEmitter instead");

/**
 * Deprecated, do not use.
 */
- (void)sendDeviceEventWithName:(NSString *)name body:(id)body
__deprecated_msg("Subclass RCTEventEmitter instead");

/**
 * Deprecated, do not use.
 */
- (void)sendInputEventWithName:(NSString *)name body:(NSDictionary *)body
__deprecated_msg("Use RCTDirectEventBlock or RCTBubblingEventBlock instead");
```

那现在我们想要向js发送事件的时候应该怎么弄呢？按照提示说明。

```smalltalk
__deprecated_msg("Subclass RCTEventEmitter instead");
```

# RCTEventEmitter

```smalltalk
@interface RCTEventEmitter : NSObject <RCTBridgeModule>

@property (nonatomic, weak) RCTBridge *bridge;

/**
 * Override this method to return an array of supported event names. Attempting
 * to observe or send an event that isn't included in this list will result in
 * an error.
 */
- (NSArray<NSString *> *)supportedEvents;

/**
 * Send an event that does not relate to a specific view, e.g. a navigation
 * or data update notification.
 */
- (void)sendEventWithName:(NSString *)name body:(id)body;

/**
 * These methods will be called when the first observer is added and when the
 * last observer is removed (or when dealloc is called), respectively. These
 * should be overridden in your subclass in order to start/stop sending events.
 */
- (void)startObserving;
- (void)stopObserving;

@end
```

四个接口：

+ supportedEvents: 说明支持哪些事件
+ sendEventWithName:body: 发送事件
+ startObserving: 在第一个观察者被添加的时候调用
+ stopObserving: 在最后一个观察者被移除的时候被调用

**pay attention to startObserving和stopObserving！！！**

我们先来看看`sendEventWithName:body:`函数

```smalltalk
- (void)sendEventWithName:(NSString *)eventName body:(id)body
{
  RCTAssert(_bridge != nil, @"bridge is not set. This is probably because you've "
            "explicitly synthesized the bridge in %@, even though it's inherited "
            "from RCTEventEmitter.", [self class]);

  if (RCT_DEBUG && ![[self supportedEvents] containsObject:eventName]) {
    RCTLogError(@"`%@` is not a supported event type for %@. Supported events are: `%@`",
                eventName, [self class], [[self supportedEvents] componentsJoinedByString:@"`, `"]);
  }
  if (_listenerCount > 0) {
    [_bridge enqueueJSCall:@"RCTDeviceEventEmitter"
                    method:@"emit"
                      args:body ? @[eventName, body] : @[eventName]
                completion:NULL];
  } else {
    RCTLogWarn(@"Sending `%@` with no listeners registered.", eventName);
  }
}
```
我们可以发现，如果eventName不在supportedEvent里面的话，会报error，good，终于不用手动查单词有没有拼错了。

另外如果没有监听者的话，也会报warning，这样预埋事件会比较蛋疼一些，如果不用而发了事件，会有warning。

`addListener`和`removeListeners`比较简单，无非是对_listenCount加加减减，但是，其会在特定的时候调用startObserving和stopObserving。


# 实际使用
剩下的我们结合实例来说明。

首先，我们给出一个完整的例子

```smalltalk
NSString *const kAFWRNLifeCycleEventViewWillAppear = @"willappear";
NSString *const kAFWRNLifeCycleEventViewDidAppear = @"didappear";

@implementation AFWRNVCLifeCycleEvent

RCT_EXPORT_MODULE()

- (NSArray<NSString *> *)supportedEvents
{
    return @[kAFWRNLifeCycleEventViewWillAppear, kAFWRNLifeCycleEventViewDidAppear];
}

- (void)startObserving
{
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(tellJsViewWillAppear:)
                                                 name:kAFWRNVCLifeCycleViewWillAppearNotification
                                               object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(tellJsViewDidAppear:)
                                                 name:kAFWRNVCLifeCycleViewDidAppearNotification
                                               object:nil];
}

- (void)stopObserving
{
    [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (void)tellJsViewWillAppear:(NSNotification *)noti
{
    [self sendEventWithName:kAFWRNLifeCycleEventViewWillAppear body:noti.userInfo];
}

- (void)tellJsViewDidAppear:(NSNotification *)noti
{
    [self sendEventWithName:kAFWRNLifeCycleEventViewDidAppear body:noti.userInfo];
}

@end
```

```js
  componentWillMount: function() {
    this.subscription = new NativeEventEmitter(NativeModules.AFWRNVCLifeCycleEvent)
    this.subscription.addListener(
      'didappear',
      this._handleAppStateChange
    );
  },


  componentWillUnmount: function() {
    this.subscription && this.subscription.removeAllListeners('didappear');
  }
```

`RCT_EXPORT_MODULE()`大家都知道，是导出该模块给js，这样js就能通过`NativeModules.AFWRNVCLifeCycleEvent`来注册监听者了。这一点非常重要，记住，
**`AFWRNVCLifeCycleEvent`的实例化是交给js来完成的**，Native只管实现就可以了，不能自己去实例化`AFWRNVCLifeCycleEvent`，否则注册通知就没有意义了。

一般来说，`startObserving`会监听通知，而`stopObserving`会去掉通知的监听。

其实整个思路有点类似EventEmitter的子类作为了iOS Notification的转换器，将其转成了react-native的事件。

这样的设计更加贴近iOS native，是个值得尝试的新特性。

