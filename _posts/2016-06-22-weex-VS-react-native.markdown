---
layout: post
title: weex VS react native
date: 2016.06.22
categories: js react-native weex
---

# 前言

|dimension    |weex                       |react-native                  |
|-------------|---------------------------|------------------------------|
|js framework | Vue.js                    | React                        |
|principle    | write once, run everywhere| learn once, write everywhere |

个人观点，weex和react-native最核心的区别就是这两个。然而就只这两个维度的同步，导致了weex和react-native完全不一样的发展方向，下面就这两个不同进行进一步分析。

# Vue.js
Vue.js虽然是Evan You个人开发的开源项目，其社区活跃度以及代码质量还是值得一提的。在写此文章之际，Vue.js在Github上的Star达到了21099，Fork达到了2186。虽然相比于react的Star数44108，Fork数7610还有一定距离，但考虑到作为个人开发者能有如此多的人关注参与，该框架的优秀程度恐怕不会低于React。
[VUE.JS: A (RE)INTRODUCTION](http://blog.evanyou.me/2015/10/25/vuejs-re-introduction/)是 Vue.js的作者Evan You对Vue.js的介绍，非常值得一看。Vue.js的文档资料非常齐全，而且其本身的设计非常简洁，因此绝大部分开发者只要花费少量的时间就能快速上手Vue.js。我想这可能也是weex团队选择Vue.js入手的原因之一吧。对Vue.js有兴趣的同学可以移步[Vue.js Guide](https://vuejs.org/guide/)。

Vue.js是用来构建交互式web界面的，其主要的关注点和React是一样的，都是立足于View层。Vue.js最核心的部分是两个Reactive Data Binding以及Composable View Components。

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
这就是经典的MVVM模式，Vue.js通过极简的API，将数据和视图绑定在一起，也就是所谓的Data-Binding，这样，当数据变化的时候，界面就能变化，实现了数据驱动的响应式变成。