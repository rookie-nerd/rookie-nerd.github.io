---
layout: post
title: weex VS react native
date: 2016.06.22
categories: js react-native weex
---

# 前言
weex的思想是多个平台，只写一套代码，而react-native的思想是多个平台可以写多套代码，但其使用的是同一套语言框架。

进一步浏览weex和react-native的代码之后，可以得出如下的公式。

```
weex = Vue.js + H5/Native
react-native = React + Native
```

总的来说，其差异性表现在如下表格。

|dimension    |weex                     |react-native                  |
|-------------|-------------------------|------------------------------|
|js framework | Vue.js                  | React                        |
|principle    | write once, run anywhere| learn once, write anywhere   |

个人观点，weex和react-native最核心的区别就是这两个。然而就只这两个维度的同步，导致了weex和react-native完全不一样的发展方向，下面就这两个不同进行进一步分析。

## Vue.js vs React

|维度|Vue.js|React|
|---|---|---|
|定位|UI框架|UI框架|
|使用平台|Web|多平台|
|架构|MVVM|React|
|数据流|数据绑定|单向数据流动|
|组件系统|有|有|
|响应式|是|否|
|开发模式|模块分离|all in js|
|flexbox|支持|支持|

## weex vs react-native

|维度|weex|react-native|
|---|---|---|
|思想|write once, run anywhere| learn once, write anywhere|
|扩展|为了保证各平台的一致性，一次扩展得在各个平台都实现|不同平台可自由扩展|
|调式|暂时log调试|有专门的调试工具，chrome调试，较为完善|
|社区|内测开源|15年3月开源，社区非常活跃|
|支持|alibaba支持|facebook支持|
|组件丰富程度|基本只有自带的10余中|除了自带的，还有js.coach上社区贡献的，还是比较丰富的|
|外围框架|基于Vue.js的外围框架|基于React的外围框架|
|上手难度|容易|困难|

# Vue.js
Vue.js虽然是Evan You个人开发的开源项目，其社区活跃度以及代码质量还是值得一提的。在写此文章之际，Vue.js在Github上的Star达到了21099，Fork达到了2186。虽然相比于react的Star数44108，Fork数7610还有一定距离，但考虑到作为个人开发者能有如此多的人关注参与，该框架的优秀程度恐怕不会低于React。

Vue.js的文档资料非常齐全，而且其本身的设计非常简洁，因此绝大部分开发者只要花费少量的时间就能快速上手Vue.js。其中[VUE.JS: A (RE)INTRODUCTION](http://blog.evanyou.me/2015/10/25/vuejs-re-introduction/)是 Vue.js的作者Evan You对Vue.js的介绍，非常值得一看。我想这可能也是weex团队选择Vue.js入手的原因之一吧。对Vue.js有兴趣的同学可以移步[Vue.js Guide](https://vuejs.org/guide/)自行学习。

Vue.js用来构建交互式web界面的，其主要的关注点和React是一样的，都是立足于View层。
Vue.js最核心的部分是两个Reactive Data Binding以及Composable View Components。还值得特别关注的是，其保留了html、css、js分离的写法，使得现有的前端开发者在开发的时候能保持原有的习惯。

## 响应式数据绑定
Vue.js将界面开发分成了三个部分，分别是View、ViewModel和Model，这种划分在客户端开发看来是非常合理的，也经过了实际的检验。以HelloWorld为例来说明，示例来源[Vue.js Guide](https://vuejs.org/guide/)。

```js
<!-- this is our View -->
<div id="example-1">
  Hello {{ name }}!
</div>

<!-- this is our Model -->
var exampleData = {
  name: 'Vue.js'
}

<!-- this is our ViewModel -->
var exampleVM = new Vue({
  el: '#example-1',
  data: exampleData
})
```
这就是经典的MVVM模式，Vue.js通过极简的API，将数据和视图绑定在一起，也就是所谓的Data-Binding。
这样，当数据变化的时候，界面就能变化，实现了数据驱动的响应式变成。

## 组件化
当我们在写网页的时候，本质上就是构造DOM树，DOM树则是由div、span等元素组成的。div、span这样的元素是构建大型应用的基础。其实Vue.js或者其他的UI框架基本也是一样的，他们都会提供自己的组件系统。这些组件就类似div元素，一般具有一下特征：

+ 小巧精致
+ 能重用
+ 自包含，高内聚

当我们使用Vue.js开发应用的时候，就是搭建特定的组件树。这些组件可以是Vue.js定义的，也可以是开发者自己定义的，这非常重要。

看个组件化的例子。
```js
// example组件定义
var Example = Vue.extend({
  template: '<div>{{ message }}</div>',
  data: function () {
    return {
      message: 'Hello Vue.js!'
    }
  }
})

// register it with the tag <example>
Vue.component('example', Example)

// example组件使用
<example></example>
```

### 组件间数据传递
Vue.js的组件都是有自己独立的scope的，因此子组件是不能直接访问到父组件的数据的。数据一般都是通过props来传递的，示例说明。

```js
// define component
Vue.component('child', {
  // declare the props
  props: ['msg'],
  // the prop can be used inside templates, and will also
  // be set as `this.msg`
  template: '<span>{{ msg }}</span>'
})

// usage
<child msg="hello!"></child>
```

上述方式只能实现组件树从上往下传递数据，在Vue.js中，会有大量的场景需要子组件向父组件传输数据，甚至兄弟组件之间传递数据，一般这种时候就需要使用以下几种能力。

+ 子组件获取父组件的能力（this.$parent）
+ 自定义事件的能力 ($on\$emit\$dispatch\$broadcast)

想要了解详情，请移步[Parent-Child Communication](http://vuejs.org/guide/components.html#Parent-Child-Communication)。

## 样式、逻辑和界面的分离
前端开发经过这么多年的发展，html、css和js的分开编写应当是顺理成章的，Vue.js没有打破这个规则，通过 **style** 、 **template** 、 **script** 将样式、视图和数据逻辑进行了分离。详见下面示例，来源于[VUE.JS: A (RE)INTRODUCTION](http://blog.evanyou.me/2015/10/25/vuejs-re-introduction/)。

```js
<!-- css -->
<style>
.message {
  color: red;
}
</style>

<!-- template -->
<template>
  <div class="message">{{ message }}</div>
</template>

<!-- js -->
<script>
export default {
  props: ['message'],
  created() {
    console.log('MyComponent created!')
  }
}
</script>
```

# React
React可能是现在前端开发中最炙手可热的UI框架了。在React的[首页](https://facebook.github.io/react/)最明显的位置上展示者关于React的最核心的三个思想，它们分别是：

+ Declarative(声明式)
+ Component-Based（组件化）
+ Learn Once, Write AnyWhere（一学多写）

## 声明式
React和Vue.js的组件的使用都是声明式的，声明式的编写方式会比命令式的编写更加的直观。关于声明式和命令式的区别，可以参考[Declarative programming](https://en.wikipedia.org/wiki/Declarative_programming)和[Imperative programming](https://en.wikipedia.org/wiki/Imperative_programming)，这里就不加详描了。

## 组件化
诚然React和Vue.js在编写大型程序的时候都是构建一颗组件树，但React和Vue.js的组件却有着不小的差异。先来看一个React组件的示例（来源React官网）。

```js
var HelloMessage = React.createClass({
  render: function() {
    return <div style={divStyle}>Hello {this.props.name}</div>;
  }

  // style
  var divStyle = {
    color: 'white',
    backgroundImage: 'url(' + imgUrl + ')',
    WebkitTransition: 'all', // note the capital 'W' here
    msTransition: 'all' // 'ms' is the only lowercase vendor prefix
  };
});

ReactDOM.render(<HelloMessage name="John" />, mountNode);
```
在React中，一切都是js，视图、逻辑和样式都是通过js来写的。通过js来统一颠覆了html、css和js分离的原则，当然是褒贬不一了。在Vue.js中，分离带来了清晰度，逻辑、视图、样式和数据可以分别处理，但在React中，一切都需要重新组织，甚至需要新的配套框架和设计模式，比如新的语言JSX就是用来简化js带来的麻烦的。但all in js让很多事情变得简单，js的快速发展也让React脱离了css和html发展限制，可以实现更多的可能性，优化、扩展以及其他很多事情，就只要单纯考虑js就可以了，而不必收到css和html的限制。

当然，这样带来的后果就是学习曲线的陡然增加，React甚至带来了新的JSX语法，同时考虑到React全新的React思想，开发者想要开发生产环境的app，尤其是在将现有app用React重写的时候，成本是要比Vue.js高出不止一个数量级的。

### 组件间数据传递
React推崇的是单向数据流动，也就是说，数据最好是从组件树的顶端往叶子节点流动，尽量少的出现反向流动的情况。
用另外一种方式来说，React希望实现的immutable data，数据的不变性。只读的数据能给我们带来非常多的好处，并发、简化逻辑、数据统一管理等等。

React提供了props和state两种数据类型，props是实现数据从父组件往子组件传递的机制，而state则是提供了一种机制来实现组件的自更新，facebook是建议尽量少用该特性，因为其违反了immutable data和单向数据流动的设定。

因为React的数据设定让其数据管理成为一个问题，业界出现了一些解决方案，其中最为著名的应该就是redux/flux了，有兴趣的同学可以上github搜搜，都是开源的。

## 一学多写
React背后是强大的facebook在开发维护，其目的不是要简单的创建一种新的js的UI框架，相反，其想要让React成为平台无感知的UI开发思想。什么意思呢？就是本节要说的learn once，write anywhere。facebook认为每个平台不可能完全一样，Web、Android、iOS、Windows Phone甚至Xbox，以及未来会出现的各种平台，他们都会有自己的发展理念和发展路劲，不可能做到完全一样，但不管平台如何变化，基于平台之上，创建Virtual DOM，React通过控制Virtual DOM来实现界面变化。
也就是说Virtual DOM相当于是一个中间层，隔离平台的差异，从而实现统一的开发方式。

不敢说这样的想法一定能成功，但就现在的发展势头来看，机会还是非常大的。尤其对于开发者来说极具吸引力，如果这一想法成为现实，以后React就可能像DOM一样成为业界统一的标准。那对于iOS开发者来说，在Android上面开发会跟在iOS上开发一样，不需要学习全新的Java语言，Android系统，更不要说各种Java特有的艰深复杂的工具了。

# Native

个人感觉weex和react-native最大的不同是在Vue.js和React层面。这一点在react-native的命名上就非常容易看出来。在react-native刚出来的时候，其和React的关系是react-native依赖React。

```
"dependencies": {
  "react": "~14.0.0"
}
```

而现在react-native和react则是同级别的。

```
"peerDependencies": {
  "react": "~15.1.0"
}
```
react-native中最重要的文件名字也是Library，主要提供了一系列Native的能力。

查看weex的源码，native部分的作用几乎是一样的，主要就是提供了一些列Native的组件，以及其他的一些能力。

这也就是为什么本文将两者的Native合为一谈的原因，他们的本质是差不多的。

+ 提供了js和native交互的桥梁Bridge
+ 提供了一系列组件
+ 提供了flexbox布局支持
+ 提供了事件支持
+ ……

当然，因为weex和react-native的设计思想的差异，在native部分也存在差异，但我觉得这是因为js需要导致的，仅就native而言，两者并没有特别大的不一样。

也许在不远的将来，native部分会出来一个比较核心的框架，抽象出在构建App时js和native交互所需要的基本能力，同时提供扩展方式，让各种类似react-native\weex这样的框架可以专注于js层的设计。也许react-native就走在这条路上，谁知道呢？





