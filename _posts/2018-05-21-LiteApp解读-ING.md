---
layout: post
title: LiteApp解读
date: 2018-05-21
categories: 其他
---

> 

# 简介
桌面应用在历史上留下了一条从原生开发到最终由浏览器完成一统天下的轨迹，而移动端应用也正在这条路上不断的演进。然而移动端不同于PC端的特性导致传统的网页开发在移动端水土不服，迟迟没能突破原生开发的限制。

但随着机器的升级、技术的进步，越来越多的新方案开始出现。开发者已经不再满足于原生开发糟糕的开发体验，缓慢的迭代速度。跨平台、开发体验、性能表现、迭代速度缺一不可。且不说各类前端框架层出不穷，就是不完全是web的方案都百家争鸣，phonegap、ionic、nativescript、pwa、reactnative、weex、flutter，令人大呼过瘾。他们都是为了解决原生web开发的种种问题，思路各异，取长补短。小程序也不例外。

微信小程序从诞生那一天起就以其优秀的性能体验吸引了众多的目光，其架构设计思路引得各大公司纷纷效仿。可惜微信小程序并不是开源的，我们没有办法详尽的看到实现的细节。爱奇艺开源的[LiteApp](https://github.com/iqiyi/LiteApp)参考了微信小程序的实现思路，终于让我们有机会一睹优秀架构设计的真容。

# Web的问题

#### 首屏问题

首屏速度问题是h5应用最大的问题，也是导致绝大部分人“H5应用很慢”直观感觉的罪魁祸首，也是为什么众多的app都将最核心的能力使用native来实现的原因。开发者们一直在绞尽脑汁地使用各种方法来提高首屏速度方向。

美团点评技术团队曾给出的正常情况下WebView启动过程图如下，整个过程包括了首屏和二次渲染。

![WebView启动过程](https://tech.meituan.com/img/webviewspeed/time.png)

首屏问题的定义就是，如何通过各种技术手段，将WebView的启动过程优化到极致。

+ 腾讯开源的vassonic是一种解决方案，曾经还写过一篇技术解析的文章 —— [轻量级高性能Hybrid框架VasSonic秒开实现解析](http://www.rookie2geek.cn/vassonic/)。
+ 支付宝也有自己的解决方案 —— [Nebula](https://myjsapi.alipay.com/)。
+ 手淘也有自己的解决方案 —— [WindVane](http://www.infoq.com/cn/presentations/mobile-taobao-h5-container-architecture-evolution)。

小程序的解决思路更加激进，虽然会带来了一定的使用限制，比如前端框架的选择，但是效果也是最好的。

![LiteApp提高首屏速度](https://github.com/iqiyi/LiteApp/wiki/images/architecture-history.png)

LiteApp的优化手段分成了以下几个步骤。

+ 资源离线化
+ js线程和render线程分离
+ webview预加载
+ 共用逻辑预执行

#### 体验问题

#### 能力问题



# 参考文献
+ [WebView性能、体验分析与优化](https://tech.meituan.com/WebViewPerf.html)
+ [LiteApp](https://github.com/iqiyi/LiteApp)
+ [LiteApp前端架构](https://github.com/iqiyi/LiteApp/wiki/web-architecture)
+ [跨平台開發的一些姿勢](https://medium.com/@kingapol/%E8%B7%A8%E5%B9%B3%E5%8F%B0%E9%96%8B%E7%99%BC%E7%9A%84%E4%B8%80%E4%BA%9B%E5%A7%BF%E5%8B%A2-e2a59b7849ce)
+ [Vue.js 源码学习笔记](http://jiongks.name/blog/vue-code-review/)
+ [vassonic github](https://github.com/Tencent/VasSonic)