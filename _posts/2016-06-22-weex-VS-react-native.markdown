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

个人观点，weex和react-native最核心的区别就是这两个。然后就只这两个维度的同步，导致了weex和react-native完全不一样的发展方向，下面就这两个不同进行进一步分析。

# Vue.js
Vue.js虽然是Evan You个人开发的开源项目，其社区活跃度以及代码质量还是值得一提的。在写此文章之际，Vue.js在Github上的Star达到了21099，Fork达到了2186。虽然相比于react的Star数44108，Fork数7610还有一定距离，但考虑到作为个人开发者能有如此多的人关注参与，该框架的优秀程度恐怕不会低于React。

Vue.js的文档资料非常齐全，而且其本身的设计非常简洁，因此绝大部分开发者只要花费少量的时间就能快速上手Vue.js。其中[VUE.JS: A (RE)INTRODUCTION](http://blog.evanyou.me/2015/10/25/vuejs-re-introduction/)是 Vue.js的作者Evan You对Vue.js的介绍，非常值得一看。我想这可能也是weex团队选择Vue.js入手的原因之一吧。对Vue.js有兴趣的同学可以移步[Vue.js Guide](https://vuejs.org/guide/)自行学习。


# React
React可能是现在前端开发中最炙手可热的UI框架了。在React的[首页](https://facebook.github.io/react/)最明显的位置上展示者关于React的最核心的三个思想，它们分别是：

+ Declarative(声明式)
+ Component-Based（组件化）
+ Learn Once, Write AnyWhere（一学多写）