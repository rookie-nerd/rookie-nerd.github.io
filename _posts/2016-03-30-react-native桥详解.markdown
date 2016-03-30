---
layout: post
title: React Native桥详解
date: 2016.03.30
categories: js react-native
---

# 前言
该文主要是对[Tadeu Bridging In React Native](http://tadeuzagallo.com/blog/react-native-bridge/)的翻译。结合代码做了一定的分析。

# 线程们
RN框架有三个主要的线程，他们分别是：

1. shadow queue: 专门用来布局的queue
2. main thread: 主线程，用于UI展示
3. javascript thread: 专门用来执行JS代码的线程
4. 每个NativeModules默认都有自己的queue

源码中的应用分别举个例子
1、shadow queue
```objective-c
- (void)setIntrinsicContentSize:(CGSize)size forView:(UIView *)view
{
  RCTAssertMainThread();

  NSNumber *reactTag = view.reactTag;

  // 在shadowQueue中进行布局操作
  dispatch_async(_shadowQueue, ^{
    RCTShadowView *shadowView = _shadowViewRegistry[reactTag];
    RCTAssert(shadowView != nil, @"Could not locate root view with tag #%@", reactTag);

    shadowView.intrinsicContentSize = size;

    [self batchDidComplete];
  });
}

- (void)batchDidComplete
{
    // 进行真正的渲染
  [self _layoutAndMount];
}
```

2、main thread
这就不举例了，写过iOS的同学应该知道主线程的作用。

3、jsThread
```objective-c
// 所有的js代码都是通过这个函数来实现的
- (void)executeBlockOnJavaScriptQueue:(dispatch_block_t)block
{
    // 判断当前线程是不是js线程，如果不是的话，那就在js线程执行
  if ([NSThread currentThread] != _javaScriptThread) {
    [self performSelector:@selector(executeBlockOnJavaScriptQueue:)
                 onThread:_javaScriptThread withObject:block waitUntilDone:NO];
  } else {
    block();
  }
}
```
4、NativeModules queue
```objective-c
// 大部分module的在export的时候都会实现RCTBridgeModule协议中的这个
- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

// 如果没有实现的话，那就会使用默认的
- (void)setUpMethodQueue
{
  if (_instance && !_methodQueue && _bridge.valid) {
    BOOL implementsMethodQueue = [_instance respondsToSelector:@selector(methodQueue)];
    if (implementsMethodQueue && _bridge.valid) {
      _methodQueue = _instance.methodQueue;
    }
    if (!_methodQueue && _bridge.valid) {

    // 可以发现，每个module都是有自己的线程的
      // Create new queue (store queueName, as it isn't retained by dispatch_queue)
      _queueName = [NSString stringWithFormat:@"com.facebook.React.%@Queue", self.name];
      _methodQueue = dispatch_queue_create(_queueName.UTF8String, DISPATCH_QUEUE_SERIAL);

      // assign it to the module
      if (implementsMethodQueue) {
        @try {
          [(id)_instance setValue:_methodQueue forKey:@"methodQueue"];
        }
        @catch (NSException *exception) {
          RCTLogError(@"%@ is returning nil for its methodQueue, which is not "
                      "permitted. You must either return a pre-initialized "
                      "queue, or @synthesize the methodQueue to let the bridge "
                      "create a queue for you.", self.name);
        }
      }
    }
  }
}
```

# Native Modules
如果想要让js能成功调用native，那就要先讲native modules进行export。具体的export可以参考[这里](http://facebook.github.io/react-native/docs/native-modules-ios.html#content)。

export的时候有两个非常重要的宏定义：
1. RCT_EXPORT_MODULE(js_name): 导出模块
2. RCT_EXPORT_METHOD(method): 到处模块中的方法

先看下实现
1. RCT_EXPORT_MODULE
```objective-c
#define RCT_EXPORT_MODULE(js_name) \
RCT_EXTERN void RCTRegisterModule(Class); \
+ (NSString *)moduleName { return @#js_name; } \
+ (void)load { RCTRegisterModule(self); }
```
可以发现，通过这个宏，我们实现了两个函数。
+ 一个是moduleName，返回的是我们指定暴露给js的名字js_name，如果不指定的话，默认是module的类名。
+ 一个是load方法，我们都知道load方法在app启动的时候就会调用，所以，当我们export module之后，app一起来就会将自己注册，由框架统一暴露js。


2. RCT_EXPORT_METHOD
```objective-c
#define RCT_EXPORT_METHOD(method) \
  RCT_REMAP_METHOD(, method)

#define RCT_REMAP_METHOD(js_name, method) \
  RCT_EXTERN_REMAP_METHOD(js_name, method) \
  - (void)method

#define RCT_EXTERN_REMAP_METHOD(js_name, method) \
  + (NSArray<NSString *> *)RCT_CONCAT(__rct_export__, \
    RCT_CONCAT(js_name, RCT_CONCAT(__LINE__, __COUNTER__))) { \
    return @[@#js_name, @#method]; \
  }
```
可以发现，当调用RCT_EXPORT_METHOD的时候，其实其是创建了一个函数，该函数以`"__rct_export__"`开头，返回的是一个数组，第一个元素是js_name，第二个元素是method。举个例子。
```objective-c
RCT_EXPORT_METHOD(greet:(NSString *)name)
{
  NSLog(@"Hi, %@!", name);
  [_bridge.eventDispatcher sendAppEventWithName:@"greeted"
                                           body:@{ @"name": name }];
}

// 其结果大致长成
+ (NSArray *)__rct_export__120
{
  return @[ @"", @"greet:(NSString *)name" ];
}
```

export之后，RN是怎么用的呢？下面就详细的解析一下整个过程。
1. 在`application:didFinishLaunchingWithOptions:`中创建一个bridge
2. 创建bridge会自己创建一个batchedBridge，并且start自己
3. start的会调用`initModulesWithDispatchGroup`初始化所有之前注册的模块
4. start在初始化所有模块之后，会调用`[weakSelf moduleConfig]`获取模块配置
5. 然后通过使用`injectJSONConfiguration:`将配置注入js供js调用（注意这里config不一定是在这里注入的，也可以按需注入)

下面，我们看一下核心的代码。
```objective-c
// 1 
// AppDelegate.m
- (BOOL)application:(__unused UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  _bridge = [[RCTBridge alloc] initWithDelegate:self
                                  launchOptions:launchOptions];
  ......
}

// 2 
// RCTBridge.m
- (void)setUp
{
  .....
  [self createBatchedBridge];
}

// RCTBatchedBridge.m
- (void)start
{
  ......
  // Synchronously initialize all native modules that cannot be loaded lazily
  [self initModulesWithDispatchGroup:initModulesAndLoadSource];
  ......
  [weakSelf setUpExecutor];
  ......
  config = [weakSelf moduleConfig];
  ......
  [weakSelf injectJSONConfiguration:config onComplete......
  ......
}

// 3
// RCTBatchedBridge.m
- (void)initModulesWithDispatchGroup:(dispatch_group_t)dispatchGroup
{
  ......
  // RCTGetModuleClasses获取我们之前注册的所有modules
  for (Class moduleClass in RCTGetModuleClasses()) {
    NSString *moduleName = RCTBridgeModuleNameForClass(moduleClass);
    ......
    moduleData = [[RCTModuleData alloc] initWithModuleClass:moduleClass
                                                     bridge:self];
    moduleDataByName[moduleName] = moduleData;
    [moduleClassesByID addObject:moduleClass];
    [moduleDataByID addObject:moduleData];
  }
  ......
}

// 4
// RCTModuleData.m
// 通过ModuleData可以获取所有的export的方法，然后通过injectJsonConfig的方式让js看到
- (NSArray<id<RCTBridgeMethod>> *)methods
{
    ......
    unsigned int methodCount;
    Method *methods = class_copyMethodList(object_getClass(_moduleClass), &methodCount);

    for (unsigned int i = 0; i < methodCount; i++) {
      Method method = methods[i];
      SEL selector = method_getName(method);
      if ([NSStringFromSelector(selector) hasPrefix:@"__rct_export__"]) {
        IMP imp = method_getImplementation(method);
        NSArray<NSString *> *entries =
          ((NSArray<NSString *> *(*)(id, SEL))imp)(_moduleClass, selector);
        id<RCTBridgeMethod> moduleMethod =
          [[RCTModuleMethod alloc] initWithMethodSignature:entries[1]
                                              JSMethodName:entries[0]
                                               moduleClass:_moduleClass];

        [moduleMethods addObject:moduleMethod];
      }
    }
  ......
  }
  return _methods;
}

// 5
// RCTBatchedBridge.m
- (void)injectJSONConfiguration:(NSString *)configJSON
                     onComplete:(void (^)(NSError *))onComplete
{
  if (!_valid) {
    return;
  }

  // 在jsExecutor中执行，将其搞成js vm中的一个全局变量
  [_javaScriptExecutor injectJSONText:configJSON
                  asGlobalObjectNamed:@"__fbBatchedBridgeConfig"
                             callback:onComplete];
}
```


