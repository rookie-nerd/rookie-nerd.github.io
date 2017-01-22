---
layout: post
title: CSS Flexible Box Layout Module标准
date: 2016-11-17
categories: css, flex
---

该规范描述了优化之后的CSS box model用于用户界面设计。在flex布局模型中，flex容器的子集能在任何方向上布局，而且能够“flex”他们的大小，要么扩展直到塞满没有被使用的空间，要么收缩防止覆盖其父类。子类的水平和垂直排列都能够轻松的被实现。通过box的嵌套（水平嵌垂直，或者垂直嵌水平）能够用来在两个方向上布局。

# 介绍
CSS 2.1定义了4种layout模型 —— 基于box的兄弟和祖先来决定大小和位置算法

+ block layout，用于布局文档
+ inline layout，用于布局文本
+ table layout，用于布局表格格式的2D数据
+ positioned layout，用于非常显式的位置布局，基本不考虑文档中其他的元素

该模块引进了一种新的layout模式，flex layout，该种布局设计主要是用来处理更加复杂的应用和页面布局。

## 概览
Flex layout从表面上来看非常像block layout。其缺少很多复杂的以文本或者文档为中心的属性，比如floats和columns，相应的其获得了更加简单和强大的工具用来分配空间和排列内容，而这些是web app和复杂的web页面经常需要的。flex container的内容包括：

+ 能够在任何flow方向布局（左，右，下，甚至上）
+ 能够指定他们的显示顺序或者在样式层重排
+ 能够沿着单一的轴线性排列或者沿着垂直轴wrap
+ 能够根据available的空间flex他们的大小
+ 能够根据他们的容器或者垂直轴排列
+ 能够动态沿着主轴收缩和反收缩，但保持容器的cross size


# Flex Layout Box Model和术语
flex container是一个box，其display属性是flex或者inline-flex。flex container内部的孩子被叫做flex items，然后使用flex layout模型来布局。

![flex container术语解释](https://www.w3.org/TR/css-flexbox-1/images/flex-direction-terms.svg)


# Flex Containers

```
Name: 'display'
New values: flex | inline-flex
```

+ 'flex': 该值让元素产生block-level的flex-container
+ 'inline-flex': 该值让元素产生inline-level的flex-container

flex container确定了一个新的flex格式上下文。这和确立block格式的上下文是一样的，只是使用flex layout替换了block layout。例如，floats不会入侵flex container，flex container容器的margins不会收缩其内容的margins。flex container和block container一样都提供了内容的contain block。overflow属性能够使用到flex container。


# Flex Items
简单的说，flex container的flex items是流动状态下的内容的box。

flex container的每一个流动中的孩子都是flex item，连续的文本会被默认包装成一个匿名的flex item。然而匿名的只包含空格的flex item是不会被显示的。

flex item能确定其内容的新上下文。其格式化的上下文是由display属性决定的。然后flex item他们自己是flex-level的box，而不是block级别的。

## 绝对位置的Flex孩子
flex container的绝对位置孩子是不参与flex布局的。

绝对位置的孩子的静态位置是这样被确定的，其会被当成flex container里面唯一的flex item来布局，假定孩子和flex container都是固定大小的boxes。

## Flex Item Margins和Paddings
邻近flex items的Margins不会collapse。

用%表示的margins和padding可以通过如下方式解析：

+ 他们自己的轴线（左/右百分比通过宽度，上/下百分比通过高度）
+ inline轴线（左/右/上/下通过宽度也解析）

自动Margin会在相应的维度扩展来吸收额外的空间。他们能够被用来排列，或者将邻近的item推开。

## Flex Item Z-Ordering
Flex Items和inline blocks的表现是一样的，除了flex items是使用order来排序的z-index会创建一个上下文栈，即使position是static的

## Collapsed Items
通过指定 ‘visibility:collapse’会导致flex item变成一个collapsed的flex item。collapsed flex item会直接从显示中被移除，但会保留一个支撑来保证flex line的cross-size稳定。

虽然collapsed的flex item不会被显示，但是他们是存在在格式化的结构里面的。因此其和‘display:none’有着本质区别。

## 隐式的Flex Item的最小大小
为了得到更为合理的默认flex item最小大小，该规范引进了min-width和min-height的初始化值是auto。

```
Name: 'min-width', 'min-height'
New values: auto
New initial value: auto
New computed value: 指定的百分比或者绝对长度或者关键字
```

+ auto: 当主轴上flex item的overflow是visible，而且flex item的主轴指定了min-size属性，就能指定自动的最小大小。否则的话就是0。

通常来说，自动最小大小要比其content size和specified size要小。然而如果box有指定比例而没有specified size，那他自动最小大小要比其content size和transfered size要小。

在该计算中用到的`content size`， `specified size`，`transferred size`分别对应min/max/preferred的大小属性，他们的定义如下：

+ specified size: 如果item计算之后的main size属性是确定的，那么specified size就是那个大小，否则的话就是未定义
+ transferred size: 如果item有内在的比例，而且其计算的cross size属性是确定的，那么transferred size就是那个size通过比例传输过来，否则的话，就是未定义。
+ content size: content size就是主轴的min-content大小。如果item有固定的比例，那么其大小就是制定的cross axis的min或者max size转换过来。

# 排序和方向
flex container的内容可以以任何方向，任何顺序布局。这让以前需要复杂逻辑实现的问题变得比较简单。现在类似的布局通过 `flex-direction`、`flex-wrap`以及 `order`属性来支持。

## Flex Flow Direction

```
Name: 'flex-direction'
Value: row | row-reverse | column | column-reverse
Initial: row
Applies to: flex containers
Inherited: no
Percentages: n/a
Media: visual
Computed value: 指定的值
Animation type: 离散
```

+ row：main axis和inline axis方向是一样的，main-start和main-end和inline-start和inline-end是一样的
+ row-reverse：和row一样，main-start和main-end的方向对调了
+ column： main axis和block axis是一样的，main-start和main-end和block-start以及block-end是一样的
+ column-reverse：和column类似，main-start和main-end方向互换

## Flex Line Wrapping

```
Name: flex-wrap
Value: nowrap | wrap | wrap-reverse
Initial: nowrap
Applies to: flex container
Inherited: no
Percentages: n/a
Media: visual
Computed value: 指定值
Animation type: 离散
```

+ nowrap：单行的
+ wrap：多行的
+ wrap-reverse：和wrap一样

当值不是wrap-reverse的时候，cross-start方向和inline-start以及block-start是一样的，当wrap-reverse的时候，cross-start和cross-end是互换的。

## Flex Direction和Wrap

```
Name: flex-flow
Value: <flex-direction> || <flex-wrap>
Initial: row nowrap
Applies to: flex containers
Inherited: no
Percentages: n/a
Media: visual
Computed value: 指定值
Animation type: 离散
```

flex-flow是flex-direction和flex-wrap的快捷设置方式

## Display Order
Flex items默认是和他们在源码文档中的顺序一样的，使用order属性可以改变这种顺序。

```
Name: order
Value: 整数
Initial: 0
Applies to: flex items以及绝对位置布局的flex container的孩子
```


# Flex Lines
Flex items是在flex lines中布局和排列的，布局算法使用假定的容器来分组和排列。flex容器可以是单行的，也可以是多行的，取决于flex-wrap属性。

+ 单行flex容器将其所有的孩子都布局在单行，即使其内容会超出。
+ 多行的容器会将flex items切断成多行，和文本换行比较类似。当多行被创建的时候，他们就会加到沿着cross axis的堆栈中，每行至少有一个flex item，除非flex container本身就是空的。

当内容被切成多行，每行都被单独的布局。可调的长度和justify-content、align-self属性每次都只考虑单行。

在多行的容器中，每一行的cross size是最小必须的大小用来包含每一行中的flex items，这些行内容都是通过align-content来排列的。在单行的容器中，行的cross size就是容器的cross size，align-content没有作用。line的main size总是容器内容box的main size。


# Flexibility
flex布局最典型的方面就是其让flex items “flex”的能力，改变其宽和高来填充可使用的空间。这些都是通过flex属性来实现的。flex容器建剩余空间分配给他的items来填满容器，或者收缩他们防止越界。

如果flex-grow和flex-shrink都是0的话，那flex item就完全没有收缩能力了。

## flex

```
Name: flex
Value: none | flex-grow flex-shrink ? || flex-basis
Inital 1 0 auto
Applies to: flex items
Inherited: no
Percentages: 看各个属性
Media: visual
Computed value: 看各个属性
Animation type: 看各个属性
Canonical order: 看语法
```

flex属性指定了组件的灵活长度：flex grow因子和flex shrink因子，以及flex basis。当box是一个flex item，box的main size就不再由main size属性决定，而是由flex决定。如果box不是flex item，那么flex就没有意义了。

+ flex-grow：flex-grow指定flex grow因子，决定该组件将涨到其他flex items的比例是多少
+ flex-shrink：flex-shrink指定flex shrink因子，决定该组件在收缩的时候相比于其他flex items将收缩多少
+ flex-basis：决定了flex-item的初始化main size。有width、height以及content关键字

![绝对flex(从0开始)和相对flex(基于内容开始)的差异对比](https://www.w3.org/TR/css-flexbox-1/images/rel-vs-abs-flex.svg)

# Alignment
在flex container的内容结束flex，他们的大小被确定以后，他们就能够进行排列了。

margin属性能够用来排列items，远比block layout的margin要强大。Flex items也遵循CSS Box Alignment的排列属性，其允许main axis和cross axis维度的排列。这些能力让很多常用类型的alignment变得没什么用了，包括一些CSS2.1中非常麻烦的事情，例如水平垂直居中。

## 使用auto margins排列
flex item的Auto margins和block flow的auto margin非常类似

+ 计算flex base和可变长度的时候，auto margins被当成0
+ 其优先级高于justify-content和align-self，任何剩余空间都会被优先分配给auto margins
+ overflow的box会忽略auto margins，然后在end方向overflow

## Axis Alignment

```
Name: justify-content
Value: flex-start | flex-end | center | space-between | space-around
Initial: flex-start
Applies to: flex containers
```

justify-content属性按照当前行的main axis排列flex items。这是在所有可变长度和auto margins都解析完之后做的。通常，其帮助分配剩余的额外空间，当所有的flex items是不灵活的，或者是灵活的但是到达了最大size。其也会在items超出line的时候发挥一些作用。

+ flex-start: flex items基于line的开始进行pack的，第一个flex item的main start和这一行的main start是一致的
+ flex-end: flex items是从line的结尾开始pack的，最后一个flex item的main start和这一行的main end是一致的
+ center: flex items是基于line的中间开始pack的
+ space-between: flex items是平均分布在这条line上的，头尾贴紧，其他item之间空间一样大
+ space-around: flex items是平均分布在这条line上的，但是每段都有一般的空间，头尾的空间是其他items之间的空间的一半

![justify-content示意图](https://www.w3.org/TR/css-flexbox-1/images/flex-pack.svg)

## Cross-axis Alignment

```
Name: align-items
Value: flex-start | flex-end | center | baseline | stretch
Initial: stretch
Applies to: flex containers
```

```
Name: align-self
Value: auto | flex-start | flex-end | center | baseline | stretch
Initial: auto
Applies to: flex items
```

Flex items可以沿着cross axis排列，类似justify-content但是是在垂直的方向上。align-items设置flex container所有items的排列方式，包括匿名flex items。align-self允许修改单个flex item的默认排列方式。

如果任何一个flex item的cross-axis margins是auto，那么align-self没有任何意义。

+ flex-start：cross-start margin边和line的cross-start对齐
+ flex-end：cross-end margin边和line的cross-end对齐
+ center：flex item的margin box是居中的
+ baseline：所有flex items的baselines是对齐的
+ stretch：填满

![align-items和align-self示意图](https://www.w3.org/TR/css-flexbox-1/images/flex-align.svg)


## Packing Flex Lines

```
Name: align-content
Value: flex-start | flex-end | center | space-between | space-around | stretch
Initial: stretch
Applies to: multi-line flex-containers
```

当cross-axis有剩余空间的时候，可以使用align-content来排列flex container的lines，和justify-content在main axis排列的单个item类似。注意该属性在单行flex container上面没有任何作用。

+ flex-start：lines从flex container的start开始pack
+ flex-end：lines从flex container的end开始pack
+ center：line是从felx container的中间开始pack的
+ space-between：类似justify-content
+ space-around：类似justify-content
+ stretch：类似justify-content

![align-content示意图](https://www.w3.org/TR/css-flexbox-1/images/align-content-example.svg)

## Flex Container Baselines
为了能够让flex container自身参与到baseline排列中，其需要提交自己的baselines来最好的展示其内容。


