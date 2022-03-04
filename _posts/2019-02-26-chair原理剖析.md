---
layout: post
title: chair原理剖析
date: 2019-02-27
categories: nodejs chair
---


## 为什么要有Chair

一般应用的开发，是后端的同学负责吐数据，前端的同学写界面，并根据后端吐的数据来渲染界面。现在普遍流行的都是轻客户端的设计，所以在架构上都会设计一层 `BFF`，全称 `Backends For FrontEnds`。`BFF` 存在的价值就是为前端拼装后端服务的数据，在减低后端服务的复杂度的同时，加快前后端的迭代速度。

在 `chair` 出来之前，蚂蚁的BFF都是通过 `sofa(Java)` 来实现的。因为前后端的语言差异很大，技术栈不一样，因此前后端的存在不小的沟通成本。

自从 `nodejs` 出现之后，这种局面就有望得到改善，因此统一了语言和技术栈，前端工程师能很方便的切入到 `BFF` 层去开发，自己完成前后端迭代，效率不可同日而语。

![chair是什么](https://img.alicdn.com/tfs/TB16QcsIVzqK1RjSZSgXXcpAVXa-528-531.png)

上面的图清晰的展示了 `Chair` 和 `Sofa` 的关系，事实上他们的命名也是一致的，椅子和沙发都是轻量级的后端服务，椅子（Chair）的目标是做到比沙发（Sofa）更轻量级。

## Chair核心要素

作为一个企业级的WEB开发框架，Chair定义自己需要做好这些部分。

+ 编程模型约束
+ 进程管理
+ 丰富的扩展点
+ 错误处理
+ 测试
+ 跨语言RPC
+ 日志
+ 分布式中间件支持
+ 安全
+ 工具包
+ 会话管理
+ 模板渲染
+ 部署
+ 本地开发

我们也结合[chair分享](http://alipay-rmsdeploy-image.cn-hangzhou.alipay.aliyun-inc.com/rmsportal/DExpEwjVRnaItaa.pdf)，来一个chair的深度剖析系列。本文主要探讨一下第一部分：

编程模型 —— Koa

## Koa
[`koa`](https://github.com/koajs/koa)(2.5万star) 是 [`express`](https://github.com/expressjs/express)(4.2万Star)的原班人马出来打造的。目标是要比 `express` 更小，更灵活，更易用。

Koa里面有几个非常重要的概念，基本熟悉了这些概念，对Koa也就有了大致的了解。

+ 插件（middleware）
+ 上下文（context）
+ 请求（request）
+ Response（response）

#### 插件

Koa的应用本质上就是包含了很多插件的对象，这些插件是以一种洋葱圈的组织模式结合在一起的。详见下图。

![洋葱圈模型](https://camo.githubusercontent.com/d80cf3b511ef4898bcde9a464de491fa15a50d06/68747470733a2f2f7261772e6769746875622e636f6d2f66656e676d6b322f6b6f612d67756964652f6d61737465722f6f6e696f6e2e706e67)

废话不多说，上代码。

```js
const Koa = require('koa');
const app = new Koa();

// 1
app.use(async (ctx, next) => {
  console.log('1');
  await next();
  console.log('1.1');
});

// 2
app.use(async (ctx, next) => {
  console.log('2');
  await next();
  console.log('2.1');
});

// 3
app.use(async (ctx, next) => {
  console.log('3');
  await next();
  console.log('3.1');
})

// response
app.use(async ctx => {
  ctx.body = 'Hello World';
  console.log('Hello World');
});

app.listen(3000);
```

[源码地址](https://runkit.com/fragno/koa)
[执行日志](https://runkit.com/logs/fragno/koa/branches/master)

可以发现，他的执行顺序有点类似冒泡-捕获过程。

先是请求过程时，按照 `middleware` 队列顺序执行，遇到 `await next()` 之后，就跳到下一个 `middleware` 执行。
然后响应的过程反过来，按照反向再继续执行 `middleware` `await next()` 后面半部分的逻辑。洋葱模型是特别形象的。


下面就探索一些这么牛逼的设计是怎么实现的？上述整个 `Koa` 应用主要就包含两个 `API`：

+ `app.use()`
+ `app.listen()`

首先来看下 `app.use()` 的实现

```js
use(fn) {
  ......
  this.middleware.push(fn);
  return this;
};

```

没错，核心代码就一句话，就是把插件函数插入到数组中去。`middleware` 函数的函数签名是统一的。

```js
async (ctx, next) => { }
```

接下来需要研究下 `middleware` 的这个数组是如何被使用的。入口就是 `app.listen` 函数。

```js
listen(...args) {
  debug('listen');
  const server = http.createServer(this.callback());
  return server.listen(...args);
};
```

`listen` 函数本质就是启动了一个 `httpServer`，然后传入一个回调函数，每次有请求的时候，都会执行这个回调函数。

```js
callback() {
  const fn = compose(this.middleware);

  if (!this.listenerCount('error')) this.on('error', this.onerror);

  const handleRequest = (req, res) => {
    const ctx = this.createContext(req, res);
    return this.handleRequest(ctx, fn);
  };

  return handleRequest;
};
```

`callback` 本身并不复杂，但是和插件相关的有两点需要关注。

一个是 `compose`，一个是 `handleRequest`。

```js
handleRequest(ctx, fnMiddleware) {
  ......
  return fnMiddleware(ctx).then(handleResponse).catch(onerror);
};
```

`handleRequest` 中最主要的就是一句话 `fnMiddleware(ctx)`，这里非常让人好奇，就这个函数是怎么做到洋葱圈式执行之前注册的插件的呢？这里面所有的玄机都在 `compose` 函数里面。

```js
function compose (middleware) {
  return function (context, next) {
    // last called middleware #
    let index = -1
    return dispatch(0)
    function dispatch (i) {
      if (i <= index) return Promise.reject(new Error('next() called multiple times'))
      index = i
      let fn = middleware[i]
      if (i === middleware.length) fn = next
      if (!fn) return Promise.resolve()
      try {
        return Promise.resolve(fn(context, dispatch.bind(null, i + 1)));
      } catch (err) {
        return Promise.reject(err)
      }
    }
  }
};
```

很头疼，果然又是一个高阶函数，曾经见过的最丧心病狂的高阶函数就是 [redux middleware](https://www.rookie2geek.cn/redux-middleware-pou-xi/);

这段代码比较核心的是 `Promise` 的使用，`Promise` 提供了两个函数 `resolve` 和 `reject`。当异常出现的时候，就直接 `reject`，这个没啥好说的。

主要需要特别关注一下 `resolve` 的逻辑。

`Promise.resolve(fn(context, dispatch.bind(null, i + 1)))`。

当我们第一次调用 `compose` 处理之后的插件列表时，会执行 `dispatch(0)`，也就是调用 `fn(context, dispatch(null, 1))`。

这其实本质上就是执行了第0个插件函数，并且把 `dispatch(null, 1)`（即执行第1个插件函数），作为当前插件的 `next` 参数传递进去。

还记得在我们定义插件函数的时候，会 `await next()` 吗？ 那其实这就是在等待后面的插件先执行，等所有的插件都执行完，`response` 开始返回的时候，继续执行 `await next()` 后面的逻辑。

现在再回过头去看一眼这个 `compose` 的实现，是不是就清晰多了？

多说一句，`Promise` 这种设计真的还满神奇的，在高阶函数的设计上面能起到不少令人惊叹的效果。

那 `Koa` 最本质的插件机制其实就已经讲完了，其余的 `Request`、`Response`和`Context`就是一些特殊的`Object`。他们可以贯穿整个`Koa`请求的生命周期里面，方便业务编写代码。

#### 上下文
TODO

#### 请求
TODO

#### 响应
TODO

## 参考文档
+ [Chair分享](http://alipay-rmsdeploy-image.cn-hangzhou.alipay.aliyun-inc.com/rmsportal/DExpEwjVRnaItaa.pdf)