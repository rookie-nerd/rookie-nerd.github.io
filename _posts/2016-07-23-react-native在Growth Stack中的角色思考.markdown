---
layout: post
title: react native在Growth Stack中的角色思考
date: 2016.07.23
categories: react-native product
---

Growth Hacker在国内外的互联网界近几年都是比较火热的词，互联网巨头Facebook也许是践行Growth Hacker最好的公司。然而概念吵的火并不等于做的好，如何落地Growth Hacker其实是一件比较困难的事情。最近从twitter上挖到一篇文章，推荐了[MobileGrowthStack](http://www.mobilegrowthstack.com/the-mobile-growth-stack/)，该文章维护着关于做Growth Stack的框架，为想要落地Growth Hacker的公司提供帮助。其最主要的输出应该就是下面这样图。

![Mobile Growth Stack](http://www.mobilegrowthstack.com/wp-content/uploads/2016/02/mobilegrowthstack-2.png)

稍微简单的描述下这样图。该技术栈有三个层次，分别用来实现三个主要的目标。

+ 新用户（Acquisition）
+ 留存 (Engagement/Retention)
+ 变现 (Monetization)

而这三个目标的实现都依赖于最底层也是最核心的第四层：**分析和洞见(Insight & Analytics)**。下面就参考mobilegrowthstack对Insight&Analytics的分析来看看ReactNative在这其中能起到什么样的作用。

# Insight & Analytic
还是觉得有必要将mobilegrowthstack关于这一层的描述翻译出来。

```markdown
Insight & Analytics 层是该Growth Stack中最重要的一层

该层主要依赖于大量的高质量数据和指标，来模型化、指导growth活动，以便发现影响和机会。
```

## 安装归因
在Web的世界中，一般可以使用浏览器的Cookie来跟踪用户，分析其安装来源，但native Apps中跟踪用户用的是设备唯一的ID，例如IDFA或者Android ID。因为React Native还是需要一个Native的壳，因此这一部分和Native APP是基本一致的。

## DeepLink分析
ok，DeepLink这个词有点太时髦了，一般我还是习惯把他叫做Schema跳转，从app外跳转到app内的特定页面，app内从一个页面跳转到另外一个页面都可以叫做Schema跳转。React Native其实在这一方面有非常大的优势。Native APP的构造比较复杂，建设完善的Schema机制并不是一件容易的事，考虑到现在需求变更的速度，想要保证Schema的时效性的确是一件比较头疼的事情。然而结合Native和React Native，做一点点微创新，可以让这一切变得非常美好。因为Schema拉起的一般都是一个完整的页面，我们可以让这个页面内包含一个React Native的RootView，然后在Schema的参数上带上module的名字，通过这个module在拉起该页面的时候展示不同的single page app。

其他的比如追踪schema跳转的来源、以及其他一些属性和Native都是一样的，但显然要简单的多，毕竟我们现在天生有了Module这个属性来区分不同的页面，我们所需要维护的，仅仅是一个Schema链接，仅此而已。

## 事件追踪
这里的事件是比较通用的概念，也许大家更加熟悉的概念就是埋点。埋点就是将用户的一些操作记录下来，后台分析用户的操作，最终通过展台的方式提供给app开发者做决策。react native可以复用native的埋点方式，基本的原理都是一样的。做过埋点的开发者都知道，埋点是一项极其琐碎的事情，非常容易出错，当我们遗漏或者埋错了点的时候，React Native的优势就发挥出来了，因为可以在发现错误之后实时的修改埋点错误，让数据变得准确。这个意义还是非常大的。

## 活动分析
这一块其实跟DeepLink和事件追踪非常相关的，在我们通过活动推广之前，我们需要知道我们这一次活动的目标是什么，我们的ROI怎么样？这都是需要数据分析的，React Native除了具备在DeepLink和事件追踪的优势之外，更重要的是其构建活动的敏捷性。因为活动有其特殊性，时效短、变化快，因此当前我们大部分活动都是采用H5来实现的，H5实现的最大弊端就是体验相比于Native会逊色一些，而React Native的出现，就是折中了H5的动态性和Native的体验，that's what he borned for。自然React Native在这方面优势很大。

## App Store分析
这一块是Native APP特有的，App的开发者大多时候都被版本所累。用户不愿升级，最新版本都已经10.0还有用户在使用1.0，没有办法。React Native可以很大程度上解决这个问题，因为React Native部分依赖于Native，所以其并不能完全解决这个问题，但相比于Native，那不要好太多，也许我以前的10个版本，我现在两个版本就可以搞定了。只要用户安装了我们的app，我们就可以一直让用户享用最新最好的特性，让用户和我们都摆脱升级的烦恼。

## ASO关键词跟踪
搜索关键字对于React Native来说也许是个问题。应用市场在某种程度上来说是一个免费的广告平台，我只要把我的APP放上去，用户就可以在应用市场上搜索到，这对开发者来说的免费的曝光，而React Native的弱化版本会使得这个优势丢失，尤其是创业小公司。不过，你依然可以直接用React Native的离线包来打造一个新版本APP，然后去发版，写一些新的关键词，没有人会反对你这么做的。

## User Segmentation
用户分组的概念其实很早就已经有了，最简单的就是区分付费用户和非付费用户，一般来说，针对付费用户，我们会提供更多的特性或者更爽的体验。传统上做这件事主要依赖的还是后台来控制开关，这样做最大的弊端是，针对新用户，或者免费用户，我们需要内置很多他们可能很久以后才会用到，甚至永远不会用到的特性，导致包体积变大，而包体积变大这件事儿，会导致很多不良的影响。那我自己来说，16G的机器一旦空间不够，那哪些不太常用的APP总是我删除的首选。使用React Native的好处就在于，对于当前用户用不到的feature，我不用内置代码，我可以让新用户已非常小的代价下载app，然后再他使用的过程中逐步的更新其app，让其能享用更多的特性。当前这一切的前提是后台需要对用户有足够的信息，能够支持做这样的决策。

## 用户分组分析
对不同的用户进行分组，超越总用户、MAU、DAU等数据去对用户进行细粒度的分析主要依赖的是后台的数据分析，无论什么web、native还是react native都是一样的。

## 内容分析
again, react native提供动态化的内容更容易。

## 情感追踪
客户满意度很重要，因为很可能有意见领袖在使用，一言不合直接就将App搞死在萌芽状态也不是不可能。因此用户满意度调查是件挺重要的事情，让app在应用市场的评论数和分数都提升是件很重要的事情。react native可以在特定时候通过自定义的popup，让用户参与满意度调查，并进一步引导其到appstore评论。这里和native最大的不同在于，该popup中显示的是可以实时更新的内容，想怎么变就怎么变，接近H5的表现，却拥有Native的体验。在有新特性和内容的时候，可以更好的引导用户反馈。

## 用户测试
在项目早期，找真人测试原型或者在雏形初现的时候找真人现场体验反馈。这个native、web还是react native其实并无多大区别。

## A/B测试
A/B testing对于Grouth的作用是毋庸置疑的，甚至可以说是最重要的一部分。想要做好A/B testing是一件很困难的事情。用户的分组是否合理、衡量的指标是否合理、如何制定A/B Test方案等等都会影响结果，甚至影响用户体验。

A/B Testing最传统的方式可能就是后台控制开关，针对A用户开启A特性的开关，针对B用户开启B特性的开关，所有的A/B Testing都必须预先规划好，然后发版，然后测试，再统计结果。这个流程是非常非常长的，尤其是iOS，经过审核上架再到用户升级，可能2周就过去，这个是非常不敏捷的。react native能在这方面提供非常好的帮助，因为其动态性，分分钟就把一个页面改了。结合后台的用户分组，能非常快的试错。react native简直可以说是A/B Testing的不二之选，快速试错，快速响应。

## 界面流
native的app跟踪界面流主要是在界面出现的时候埋点，界面销毁的时候再埋一个点，然而因为native的实现的多样性，想要跟踪完整的界面流是比较麻烦的。遗憾的是，react native虽然有schema机制，能应对大部分的界面跳转，但其还是存在很多不能解决的界面跳转问题，因实现而已。

## 转化漏斗
这个在Growth中还是很有名的，可以根据关键路径创建各式各样的漏斗，来优化用户留存和体验。

## 账单和收入报告
无论做什么，对钱一定要敏感而且有良好记录，要不然总有一天你会死定的。

## Growth建模
将团队内对Growth的认知模型化，这样才能传承，才能不断的优化。

## 用户终生价值建模
LTV是对一个用户终生能对APP产生多少价值的建模。相当于贴现计算。

## Growth统计
Growth建模是为了预见未来，而Growth统计则是为当下和历史的数据的总结。比如
`活跃用户 = 新用户 + 反复出现的用户 - 某段时间内上线的用户`

## 性能分析
对CPU、Battery、Network以及Crash等等的性能跟踪是非常重要的，尤其是对于移动端的用户来说。其实这里面Native和react native是各有利弊的。比如native无论是在CPU、Battery还是在Memory上都是有一定的优势的，但react native在crash上有一定的优势，因为其大部分异常都会在js层面被捕获，仅仅导致该页面不能使用，而不会导致整个app不能使用。

# 总结
两句话：

+ 如果你已经在使用React Native，那么还犹豫什么，赶紧落地Growth，做真正的Growth Hacker。
+ 如果你想尝试落地Growth，那么还犹豫什么，赶紧尝试使用React Native。

# 参考文献

+ [What Is The Mobile Growth Stack?](http://www.mobilegrowthstack.com/the-mobile-growth-stack/)
+ [互联网营销和分析专用名词速览安利](http://www.anzhibao.com/appxinwen/42417.html)


