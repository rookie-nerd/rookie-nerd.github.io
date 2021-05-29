---
layout: post
title: redux middleware 机制
date: 2018-10-16
categories: 前端,redux
---

好的框架必须有优秀的扩展能力，譬如express，再譬如webpack。redux提供给外界的扩展能力就是middleware。

Middleware是Redux推荐的扩展自定义能力的方式。redux的middleware最核心的特性是可组合性(composable)。多个middleware能够在互相不感知的情况下组合起来。


## middleware定义
redux的这个js用的非常6，看懂它也是废了我九牛二虎之力。要想看懂middleware相关的代码，我们首先得看下开发者写middleware的格式是怎么样的，至于为什么会是这个格式，[参考这里](https://redux.js.org/advanced/middleware)。

```js
// 以logger为例，middleware是一个高阶函数
const logger = store => next => action => {
  console.log('dispatching', action)
  let result = next(action)
  console.log('next state', store.getState())
  return result
};
```

**这个属于储备知识点，需要记住middleware是个高阶函数，每一阶的参数也很重要。**


## store权限控制
首先为了控制middleware的访问权限，仅仅开放了**store的`getState`和`dispatch`方法**，也就是说，我们在编写middleware的时候，只能都用 `store.getState` 和 `store.dispatch` 方法。

```js
const middlewareAPI = {
  getState: store.getState,
  dispatch: (...args) => dispatch(...args)
};
```


## middleware组合
接下来就是非常核心的middleware组合的实现了，数行代码，堪称经典。

```js
// 第一步
const chain = middlewares.map(middleware => middleware(middlewareAPI))

// 第二步
dispatch = compose(...chain)(store.dispatch)
```


#### **第一步： 将 `getState` 和 `dispatch` 注入到middleware**

还记得middleware是个高阶函数吧，执行了一遍之后，就变成如下形式的函数了。

```js
const logger_tmp1 = next => action => {
......
};
```


#### **第二步： 通过 `compose` 将所有的middleware组合起来**

首先说明一下 `compose` 函数的作用，将几个函数调用合并成一个高阶函数调用。

```
compose(f, g, h) 等价于 (...args) => f(g(h(...args)))
```

假设f、g、h是三个middleware，那么三个middleware的执行顺序就是h => g => f。

那么h的执行结果能作为g的参数吗？从第一步我们知道，g的参数是·`next`， `next` 的定义是 [`const next = store.dispatch`](https://redux.js.org/advanced/middleware#attempt-3-monkeypatching-dispatch)，准确意义上来说是上一个middleware处理之后的`dispatch`。也就是说，**g需要的参数是 `dispatch` 类型的**。

**而 h 的执行结果就是一个 `dispatch` 。**
还是以logger为例，假设h就是logger，那么h执行的结果就是:

```js
const logger_tmp2 = action => {
......
};
```

对比一下 `dispatch` 的定义:

```
type Dispatch = (a: Action | AsyncAction) => any
```


## compose
所以 `compose` 能将所有的middleware都组合起来，最终合并的函数还是需要一个传一个 `next` 的参数，也就是 `store.dispatch`：未经过middleware处理的原始的 `dispatch`。


**所以简单的来说，每个middleware都有机会将自己处理 `dispatch` 并将对齐的更改传递下去，影响后续所有的middleware。**


最后来看看 `compose` 函数的实现。`compose`函数的调用条件是比较苛刻的，其参数里面的函数都只能是单参数的函数，而且函数的返回结果需要恰好能作为函数的返回值。不过这种实现真的可以说相当精妙了。

```js
export default function compose(...funcs) {
  ......
  return funcs.reduce((a, b) => (...args) => a(b(...args)))
}
```


# 参考文献
+ [applymiddleware](https://redux.js.org/api/applymiddleware)
+ [middleware](https://redux.js.org/advanced/middleware)
+ [dispatch function](https://redux.js.org/glossary#dispatching-function)