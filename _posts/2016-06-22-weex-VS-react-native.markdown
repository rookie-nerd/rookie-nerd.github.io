---
layout: post
title: weex VS react native
date: 2016.06.22
categories: js react-native weex
---

# 前言

|dimension    |weex                     |react-native                  |
|-------------|-------------------------|------------------------------|
|js framework | Vue.js                  | React                        |
|principle    | write once, run anywhere| learn once, write anywhere   |

个人观点，weex和react-native最核心的区别就是这两个。然而就只这两个维度的同步，导致了weex和react-native完全不一样的发展方向，下面就这两个不同进行进一步分析。

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
    return <div>Hello {this.props.name}</div>;
  }
});

ReactDOM.render(<HelloMessage name="John" />, mountNode);
```

## 一学多写






