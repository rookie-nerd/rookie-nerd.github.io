---
layout: post
title: debounce && throttle
date: 2018-11-10
categories: 前端,js,debounce,throttle
---

`debounce` 和 `throttle` 是两种常用的用来控制函数执行次数的技术。尤其是在前端响应 `Dom` 事件的时候，比如 `scroll` 或者 `resize`，这两种技术可以有效的保证用户体验。

[Debouncing and Throttling Explained Through Examples](https://css-tricks.com/debouncing-throttling-explained-examples/)这篇文章对 `debounce` 和 `throttle`做了非常深入的解读，图文并茂，非常值得一读。

为了方便大家，本文录制了一些gif图，看完就明白，一图胜千言呐。

## debounce

#### leading debounce
事件频繁发生的场景下，**首次触发该事件会立马执行回调**，如果后续在一定的时间内又发生，就会忽略该事件。
![leading-debounce](http://image.rookie2geek.cn/articles/debounce-leading.gif)

#### trailing debounce
事件平凡发生的场景下，只有当前后两次事件发生的时间间隔超过阈值，才会执行上一次事件的回调。
![trailing-debounce](http://image.rookie2geek.cn/articles/debounce-trailing.gif)

## throttle
事件频繁发生，但是事件的回调按照既定的时间间隔执行
![throttle](http://image.rookie2geek.cn/articles/throttle.gif)


## 实现

lodash是一个被广泛使用的库，其中就有 [`debounce`](https://github.com/lodash/lodash/blob/master/debounce.js) 和 [`throttle`](https://github.com/lodash/lodash/blob/master/throttle.js)的实现。

从上节中发现，当连续事件发生的时候，观察一下 `debounce` 和 `throttle` 的行为，可以发现，如果给 `debounce` 加一个最大等待时间，那么 `debounce` 就能实现 `throttle` 的行为。

```js
function throttle(func, wait, options) {
  let leading = true
  let trailing = true

  return debounce(func, wait, {
    'leading': leading,
    'maxWait': wait,   // 注意这里
    'trailing': trailing
  })
}
```

注意上面的实现，`maxWait = wait`，也就是最大等待时间和等待时间是一样的。如果短时间内大量发生某一事件的时候，`debounce` 就会每隔 `wait` 执行一次，也就是 `throttle` 的行为。所以下面就直接看下 `debounce` 的实现。


```js
function debounced(...args) {
    const time = Date.now()
    // 判断是否要执行回调
    const isInvoking = shouldInvoke(time)

    lastArgs = args
    lastThis = this
    lastCallTime = time

    if (isInvoking) {
      if (timerId === undefined) {
        // 首次调用的时候，如果是leading模式，直接执行回调
        return leadingEdge(lastCallTime)
      }
      if (maxing) {
        // Handle invocations in a tight loop.
        timerId = startTimer(timerExpired, wait)
        return invokeFunc(lastCallTime)
      }
    }
    // 如果定时器没有启动，就启动定时器，启动定时器
    if (timerId === undefined) {
      timerId = startTimer(timerExpired, wait)
    }
    return result
}

// 是否要执行回调函数的判断
function shouldInvoke(time) {
  const timeSinceLastCall = time - lastCallTime
  const timeSinceLastInvoke = time - lastInvokeTime

  // 几种情况
  // 1. 首次调用
  // 2. 距离上次调用等待超过wait时间
  // 3. 等待超过maxWait时间
  return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
    (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait))
}

// 定时器到时间之后，判断是否要执行回调，并重启定时器，进入下一轮判断
function timerExpired() {
    const time = Date.now()
    if (shouldInvoke(time)) {
      // 只有trailing模式下才会执行回调
      return trailingEdge(time)
    }
    // 如果在wait期间又调用了一次，第一个超时时间到的时候，shouldInvoke是false
    // 因此需要等待更多一点的时间，来做下一次判断
    // 一般的通常实现都是通过clearTimeout，然后再setTimeout(wait)来实现的
    timerId = startTimer(timerExpired, remainingWait(time))
}
```

核心代码就这些。

# 参考文献
+ [Debouncing and Throttling Explained Through Examples](https://css-tricks.com/debouncing-throttling-explained-examples/)