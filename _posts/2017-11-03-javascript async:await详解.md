---
layout: post
title: javascript async/await发展史
date: 2017-11-03
categories: js
---

> js是单线程的语言，异步对于js的重要性相比于别的语言更大。async/await是ECMAScript 2017的标准，是最新的js异步调用解决方案。async/await标准的出台也不是一蹴而就的，本文尝试追本溯源，以便更好的了解async/await。

# 异步调用
[阮一峰的文章](http://www.ruanyifeng.com/blog/2015/05/async.html)描述了js异步调用的发展历程。

1. 回调函数
2. Promise
3. Generator
4. Async/Await


为了方便阐述，本文构造了一个简单的场景：获取数据，然后打印，其中获取数据是耗时操作。首先我们来看看同步调用实现。

```js
function syncGetData() {
  var start = new Date();
  while( new Date() - start < 3000) {
    ; // delay 3 sec
  }
  return "data";
}

var data = syncGetData();
console.log(data);
```

`var data = syncGetData()`之后的代码只有等函数返回之后才会执行，后面代码被block了，如果这个时候有用户操作的话，基本就gg了。上文提到过JS是单线程的语言，很多情况下，这种“假死”是不能被接受的。同步不行，自然要依赖异步。

# 回调函数
首先来看如何用回调函数实现异步调用。回调实现异步调用的要点是要传入回调函数，也就是callback函数，这种特性不是所有语言都支持的，只有将函数作为一等公民的语言才可以。

```js
// async
function asyncGetData(callback) {
  setTimeout( () => {
    if (callback) {
      callback("data");
    }
  }, 3000);
}

asyncGetData((data) => {
  console.log(data);
});
```

相比同步实现，代码量相差不大，如果我们在`asyncGetData()`函数调用之后的代码逻辑可以立马被执行，而不用等到回调被执行。异步已经能实现我们的需求，但是程序员都是欲求难以满足的一群人不是。这种方式有什么问题呢？代码的执行不再是按照我们写代码的顺序执行了，因此很容易出现下面这种被称为“callback hell”的情况。


```js
function callbackhell() {
  var result = '';
  asyncGetData((data) => {
    result += data + "_";
    asyncGetData((data) => {
      result += data + "_";
      asyncGetData((data) => {
        result += data + "_";
        asyncGetData((data) => {
          result += data + "_";
          asyncGetData((data) => {
            result += data + "_";
            console.log(result);
          })
        })
      })
    })
  })
}
```

一旦逻辑复杂了，光数后面的括号，估计就已经晕菜了。怎么办呢？Promise就开始走上历史舞台。

# Promise

先看看用promise如何实现。

```js
// promise
function promiseGetData() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve('data');
      // or reject
    }, 3000);
  });
}

promiseGetData().then((data) => {
  console.log(data);
});
```

那么callback hell用promise实现会是什么样子呢？

```js
function promiseChain() {
  var result = '';
  promiseGetData().then((data) => {
    result += data + '_';
    return promiseGetData();
  }).then((data) => {
    result += data + '_';
    return promiseGetData();
  }).then((data) => {
    result += data + '_';
    return promiseGetData();
  }).then((data) => {
    result += data + '_'
    return promiseGetData();
  }).then((data) => {
    result += data + '_'
    console.log(result);
  });
}
```

是不是很帅，没有了callback hell，变成了链式调用。所有的秘诀都在Promise对象，下面一起来了解下Promise对象。

## Promise对象
其实Promise这个名字是很形象的，Promise对象定义的时候就相当于做出了承诺，什么时候调用成功回调（`resolve`），什么时候调用失败回调（`reject`），如上例子的Promise就是承诺了3秒之后调用成功回调。

Promise的调用链如下图。

![promise的调用链](https://mdn.mozillademos.org/files/8633/promises.png)

Promise原理没有想象的复杂，了解了Promise的三个接口，就能明白Promise的原理

+ `Promise.prototype.constructor`
+ `Promise.prototype.then(onFulfilled, onRejected)`
+ `Promise.prototype.catch(onRejected)`

首先是构造函数，Promise构造的时候决定了何时调用成功回调`resolve`，何时调用失败回调`reject`。
业务肯定需要在Promise回调成功回调或者失败回调的时候做后续的一些事情。这个时候就是`then`和`catch`发挥作用的时候。

业务可以通过`then`接口传给Promise成功或者失败后的处理逻辑。Promise成功会调用`resolve`，`resolve`会调用`onFulfilled`，也就是业务定义的Promise成功之后的处理逻辑。Promise失败会调用`reject`，`reject`会调用`onRejected`，也即是业务定义的Promise是失败之后的处理逻辑。
`catch`接口比`then`接口更简单一些，Promise失败之后会走到`catch`定义的失败处理逻辑。

其实仔细想一想，Promise和callback方式还是非常像的，Promise相当于预先给定义了`resolve`和`reject`两个的回调，然后基于这些设定，增加了`then`，`catch`接口让业务能自定义后续调用，脑洞真的是可以。[找到一个非常不错的讲解Promise实现的文章，有兴趣的同学一定要好好看看](https://github.com/xieranmaya/blog/issues/3)。

# Generator
Promise就够了吗？callback hell的问题可以通过Promise的链式调用来解决。但这个写法还有一个很痛的点是什么呢？如果使用同步接口来获取数据，那么上面callback hell的实现如下，简单清晰明了，相比于上面Promise的实现，不仅代码量少了很多，而且逻辑也清晰不少，还能直接将结果作为参数返回。Promise虽然很棒，但相比同步实现总还是差那么一丢丢。

```js
function syncGetFiveData() {
  var result = '';
  var data1 = syncGetData();
  result += data1 + "_";
  var data2 = syncGetData();
  result += data2 + "_";
  var data3 = syncGetData();
  result += data3 + "_";
  var data4 = syncGetData();
  result += data4 + "_";
  var data5 = syncGetData();
  result += data5 + "_";
  return result;
}
```

程序员比较思维模式是同步思考，也就是一件事情做完，给个反馈，然后再拿着这个反馈去做下一件事情，异步需要考虑的东西很多，不符合人的习惯思维，不仅容易出现bug，而且后期的维护工作量也会倍增。Generator可以帮助我们实现异步逻辑的同步调用。下面就来看看如何使用Generator来实现如上逻辑。

首先我们自然要先了解下Generator。Generator是迭代器设计模式的一种实现。**迭代器提供了一种方法访问容器对象中的各个元素，而且不暴露该对象的实现细节**。Generator函数用`yield`来暂停函数执行，把程序的执行权交给别人，然后通过调用`next`调用恢复函数执行。定义好Generator函数之后，使用者只需要调用`next`就可以控制函数的执行了，完全不需要关心内部实现。这两个特性是如此的强大，给了开发者很大的想象空间。

```js
function* gen() { 
  yield 1;
  yield 2;
  yield 3;
}

var g = gen();               // g就是Generator，也就是迭代器中的容器对象。
console.log(g.next());       // { value: 1, done: false }
console.log(g.next());       // { value: 2, done: false }
console.log(g.next());       // { value: 3, done: false }
console.log(g.next());       // { value: undefined, done: true }
```

+ `yield`，该关键字用来暂停Generator函数的。Generator函数执行到yield就会暂停，返回的是`IteratorResult`，其包含两个`value`和`done`两个属性，`value`中存放`yield`后面的表达式的结果，`done`指明Generator函数是否已经结束。
+ `next`，该方法用来恢复Generator函数执行。当Generator遇到yield暂停之后，需要通过调用next方法来恢复Generator函数执行，直到遇到下一次需要暂停的地方，比如下一个`yield`。如果next带参数，那么这个参数就会成为当前`yield`的返回值。

有了上面的了解，我们看看如何用Generator来实现异步逻辑的同步调用。

```js
function* generatorGetFiveData() {
  var result = '';
  var data1 = yield promiseGetData();
  result += data1 + '_';
  data2 = yield promiseGetData();
  result += data2 + '_';
  data3 = yield promiseGetData();
  result += data3 + '_';
  data4 = yield promiseGetData();
  result += data4 + '_';
  data5 = yield promiseGetData();
  result += data5 + '_';
  console.log(result);
}
```

和`syncGetFiveData`相比，就是多了`yield`，另外函数定义的时候用了`function *`表明是Generator函数，非常棒。但这只是函数定义，前面提到Generator的执行控制是使用者自己通过调用`next`来把控的，我们来看看上面这个函数应该如何执行。

```js
var gen = generatorGetData();
gen.next().value.then((data) => {
  return data;
}).then((data) => {
  gen.next(data).value.then((data) => {
    return data;
  }).then((data) => {
    gen.next(data).value.then((data) => {
      return data;
    }).then((data) => {
      gen.next(data).value.then((data) => {
        return data;
      }).then((data) => {
        gen.next(data).value.then((data) => {
          return data;
        }).then((data) => {
          gen.next(data);
        })
      })
    })
  });
})
```

Oh my god，虽然定义Generator函数变简单了，但是执行变得如此繁琐，不能忍啊。不过仔细观察上面的执行逻辑，我们发现绝大部分都是重复调用，可以通过递归调用把这整坨代码优化掉。欲求不满的程序员们就开始考虑Generator通用的执行器。这就是下面我们要说的`co`。

# co库
上面繁琐的执行用co库的话，怎么写呢？

```js
var co = require('co');

var gen = generatorGetData();
co(gen);
```

竟然一行代码就搞定了，这么优秀的库一定要了解一下的。[`co`](https://github.com/tj/co)的实现非常简单，只有一个文件，我们把核心代码提取出来分析一下。

```js
// Promise成功之后的回调
function onFulfilled(res) {
  var ret;
  try {
    ret = gen.next(res); // promise成功，继续调用next
  } catch (e) {
    return reject(e);
  }
  next(ret);            // 调用next
  return null;
}

// Promise失败之后的回调
function onRejected(err) {
  var ret;
  try {
    ret = gen.throw(err); // promise失败，则直接throw
  } catch (e) {
    return reject(e);
  }
  next(ret);              // 调用next
}
```

上面两个函数都使用到了`next(ret)`，这个函数是`co`库的灵魂，我们来看看它是实现。

```js
function next(ret) {
  if (ret.done) return resolve(ret.value);            // 如果generator执行完了，那就直接resolve返回了。
  var value = toPromise.call(ctx, ret.value);         // toPromise是把返回值强行转成Promise，以便下面的调用。
  if (value && isPromise(value)) return value.then(onFulfilled, onRejected);  // 如果generator没有执行完，就继续then，调用onFulfilled或者onRejected。
  return onRejected(new TypeError('You may only yield a function, promise, generator, array, or object, '
    + 'but the following object was passed: "' + String(ret.value) + '"')); // 否则就报错了。
}
```

其实`co`解决Generator执行问题用的就是递归算法，通过`onFulfilled`调用`next`，然后`next`调用`onFulfilled`。这么优秀的实践被ECMA国际吸收进了ECMAScript标准，作为async/await提议的基石。现在，真正的主角出场了。

# async/await
标准做了进一步改进，不需要自己手动执行co执行器了，完全通过async/await来实现。

```js
async function asyncGetFiveData() {
  var result = '';
  var data1 = await promiseGetData();
  result += data1 + '_';
  data2 = await promiseGetData();
  result += data2 + '_';
  data3 = await promiseGetData();
  result += data3 + '_';
  data4 = await promiseGetData();
  result += data4 + '_';
  data5 = await promiseGetData();
  result += data5 + '_';
  console.log(result);
}

// 调用的时候
asyncGetFiveData();
```

对比Promise的版本，我们发现变化比较小，`*`变成了`async`，`yield`变成了`await`，其他的都是一样的。准确的说，`async`和`await`就是上面`co`和`Promise`的语法糖，如果不是最新的标准，经过转换器转成老版本的JS代码，基本和上述代码是一样的。

`async`函数执行之后，返回的是一个Promise，而`await`能暂停`async`函数的执行，直到`Promise`返回成功或者失败，`await`也能在Promise返回之后恢复`async`的执行的，相当于自带了执行器。


# 是时候使用真正的技术了
`async/await`经过一步一步艰难演化而来的，相当的精华。他们被最新的标准收纳，也是最好用的异步逻辑编写方式，用起来吧，骚年们。


# 参考文献
+ [async function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)
+ [async 函数的含义和用法](http://www.ruanyifeng.com/blog/2015/05/async.html)
+ [how javascript timers work](https://johnresig.com/blog/how-javascript-timers-work/)
+ [Promises/A+](https://promisesaplus.com/)
+ [Promise](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Promise)
+ [剖析Promise内部结构](https://github.com/xieranmaya/blog/issues/3)

![微信一键关注](http://y.photo.qq.com/img?s=xq7kSHQ8r&l=y.jpg)
