---
layout: post
title: Mixins Considered Harmful
date: 2016.07.20
categories: js react
---

该文是[Mixins Considered Harmful](https://facebook.github.io/react/blog/2016/07/13/mixins-considered-harmful.html)的译文，原作者 Dan Abramov

# 概述
“如何在几个组件之间共享代码？”可能是开发者刚开始使用React的时候最先会问到的问题之一。而我们的答案总是永远使用组件组合来提高代码的复用率。你可以定义一个组件，然后在其他的组件中使用它。

但是事实上，不是所有的模式都能够通过组合来实现的。React受到函数式编程的影响，但它却处在一个面向对象库占统治地位的领域。想让Facebook内外的开发者放弃他们所熟悉的模式是非常困难的。

为了降低学习曲线，我们在React中引进了一些特定的安全舱。mixin系统就是其中之一。其目的是为了解决当你不确定如何使用组合来解决代码复用性问题的时候，能够在不同的组件之间使用mixin共享代码。

距离React第一次发布已经3年过去了，整个世界都已经变了，很多View库都开始采用和React差不多的组件模型。使用组合而不是继承来构建声明式的用户界面已经不是特别新颖的方式了。我们对React组件模型也更加自信。不论在facebook还是在社区，我们已经见识了很多对该模型的创新性的使用。

本文主要考虑mixin带来的问题，对于一些case，我们给出了一些替代的方式。我们发现这些替代方式比mixin能更好的处理代码的复杂度。

# Why Mixins are Broken
在Facebook，React的使用已经从几个简单的组件扩展到成千上万个。从这些组件中，我们可以看到开发者是如何使用React的。多亏了React的声明式定义和从上到下的数据流展示，很多开发组在发布新特性的时候解决了很多bug。

然而不可避免的是，我们的一些React代码慢慢变得不可理解。偶尔的，我们发现会存在一些组件，没有人愿意去触碰。这些组件太脆弱了，对于新开发者来说也太难理解，最后当初写这些组件的人也忘记了当初为什么要这么实现。而这些脆弱的组件中大部分的不可理解都是来自mixin。

这不是说mixin本身不好。人们在很多不同的语言和场景中成功使用了他们，包括一些函数式语言。在Facebook，我们大量使用Hack中的traits，traits和mixins非常的相似。但是我们认为在React中，mixin不是必须的，而且容易造成问题。下面就说说原因。

# Mixins introduce implicit dependencies(tl;dr)
有时候，一个组件会依赖mixin中定义的特定的方法，例如`getClassName()`。有些时候是反过来，mixin调用了组件的一些方法，例如`renderHeader()`。JavaScript是动态语言，所以想要记录这些依赖是非常困难的。

通常来说，在组件文件中重命名出现的state key或者方法是安全的，但Mixins打破了这个传统。你可能写了一个stateful的组件，然后你的同事可能加了一个mixin读取这个state。几个月之后，你可能发现你想要把state移到其父组件上，这样兄弟组件之间就可以共享这个state。你还会记得更新mixin去读取props么？如果其他很多组件也在使用这个mixin，咋整？

这些隐形的依赖让新来的开发者很难往代码库提交代码。组件的render方法可能指向了一些不是在这个类中定义的方法。那么移除它是否是安全的呢？也许其定义在其中的一个mixin中。但是，是其中的哪一个呢?你需要从mixin的列表中打开他们中的每一个去查找这个方法。更糟糕的是，mixins可以指定自己的mixins，也就是说搜索可能是递归的！

mixins经常会依赖其他的mixins，移除其中的一个，会导致别的也挂掉。在这种情况下，想要了解数据是如果流入和流出mixin是非常困难的，想要对依赖有个整体的了解也是比较困难的。不像组件，mixins不强制要求层级：他们是扁平的，在相同的namespace下工作。

# Mixins cause name clashes(tl;dr)
没有机制保证两个特定的mixins可能在一起工作。例如`FluxListenerMixin`定义了`hanleChange()`，而`WindowSizeMixin`也定义了`handleChange()`，你就不能同时使用他们。你也不能在自己的组件中定义`handleChange()`。

如果你能修改mixins的源码，这也许不是挺大的一个事儿。当遇到冲突的时候，大不了对于其中一个mixin的名字重命名就好了。但是这其实是不保险的，因为很可能其他地方已经在使用这个方法了，你需要找到使用的地方并且修复这些调用。

如果你的冲突来自第三方的mixin，那事儿就大了，你没法直接重命名mixin，你只能修改自己的组件的名字来解决这个问题。

而且，对于mixin的作者来说，情况也好不到哪里去。即使对mixin增加一个新方法，也有可能导致调用者调用失败，因为调用者可能已经有一个相同的名字了，或者和其他mixin冲突了。一旦mixin写完了，其就很难被移除或者改变。这样丑陋的代码就会因为重构太tricky而不能得到修复。

# Mixins cause snowballing complexity（tl;dr）
虽然mixins的出发点是简单的，最终他们还是会变得复杂。下面这个例子是我在一个代码中看到的真实的情况。

一个组件需要一些state来记录鼠标的hover。为了复用这些逻辑，你可能会抽出`handleMouseEnter`，`handleMouseLeave`，`isHovering`等方法到`HoverMixin`。然后其他人想要实现tooltip。他们不想要重复`HoverMixin`中的逻辑，所以他们在`ToolTipMixin`中使用了`HoverMixin`。`ToolTipMixin`在`componentDidUpdate()`中读取了`HoverMixin`提供的`isHovering`来决定展示还是隐藏tooltip。

几个月之后，一些人希望能够对tooltip的方向做一些控制。为了避免代码重复，在`TooltipMixin`中增加了`getToolTipOptions`方法。这样展示popovers的组件也是用HoverMixin。然而popovers需要不同的hover delay。为了解决这个，一些人在`ToolTipMixin`中实现了`getHoverOptions`。现在两个mixins已经紧紧地耦合在一起了。

如果没有新的需求，这还是可以接受的。但是这种解决方案并不能很好的伸缩。如果你想要在一个组件中展示多个tooltip怎么办？你不能在一个组件中定义两个一样的mixin。如果tooltip的展示不是在hover的情况下，而是在教学使用中怎么办？最好将`TooltipMix`和`HoverMixin`解耦。如果hover的地方和tooltip展示的地方不是在一个组件中怎么办？你不能轻易的提升mixin中使用的state到父组件。不像组件，mixins并不能很好的处理这些变化。

每一个新的变化都会导致mixins更加难于理解。使用相同mixin的组件会随着时间的推移，耦合越来越大。任何新的能力都会被加到使用这个mixin的组件中。不存在一种方式将mixin拆分出简单的一部分来使用，而不带来代码重复或者更多依赖和间接性。慢慢的，封装的边界就变模糊了，他们变得越来越抽象，直到没有人能够理解他们。

而这些是我们在使用React之前就面对的相同的问题。我们发现这些问题可以通过声明式展示，单向数据流，封装好的组件来解决。在Facebook，我们已经开始使用其他模型来说替代mixin，通常来说，结果还是令人欣喜的。下面就介绍下这些模式。

# Migrating from Mixins
首先要声明的是：mixins并没有被废弃。如果你继续使用React.createClass(),那么可能你需要继续使用它们。我们只是说在我们的实践中，mixin不怎么好维护，因此我们不建议使用mixins。

下面的每一块说明了facebook使用mixin的一种模式。对于每一种模型，我们描述了其问题，然后给出一种我们认为更好的解决方案。例子是用ES5写的，但如果你不在需要使用mixins，你可以使用ES6 classes。

希望大家能发现这个列表的一点用处。如果有我们没有覆盖到的场景，请知会我们。

## Performance Optimizations
最常使用的mixins是`PureRenderMixin`。你可能已经在你的一些组件中使用它来实现当props以及state和之前的相比相同的时候避免不必要的re-renders。

```js
var PureRenderMixin = require('react-addons-pure-render-mixin');

var Button = React.createClass({
  mixins: [PureRenderMixin],

  // ...

});
```

### 解决方案
你可以直接使用shallowCompare函数来解决这个问题

```js
var shallowCompare = require('react-addons-shallow-compare');

var Button = React.createClass({
  shouldComponentUpdate: function(nextProps, nextState) {
    return shallowCompare(this, nextProps, nextState);
  },

  // ...

});
```

如果你使用了自定义的mixin，该mixin在`shouldComponentUpdate`函数中实现了不同的算法，我们建议export一个函数，然后直接调用它。

我们明白码更多的代码可能非常让人烦恼。更多时候，我们假话引入一个新的base类，叫做`React.PureComponent`。其使用和`PureRenderMixin`相同的shallow comparision的方法。

### Subscriptions and Side Effects
第二大经常使用的场景是将组建租车到第三方的数据源。不论数据源是Flux Store或者RxObservable或者其他的，该模式是非常相似的：在`componentDidMount`中注册，在`componentWillUnMount`中摧毁，注册的回调会调用`this.setState()`。

```js
var SubscriptionMixin = {
  getInitialState: function() {
    return {
      comments: DataSource.getComments()
    };
  },

  componentDidMount: function() {
    DataSource.addChangeListener(this.handleChange);
  },

  componentWillUnmount: function() {
    DataSource.removeChangeListener(this.handleChange);
  },

  handleChange: function() {
    this.setState({
      comments: DataSource.getComments()
    });
  }
};

var CommentList = React.createClass({
  mixins: [SubscriptionMixin],

  render: function() {
    // Reading comments from state managed by mixin.
    var comments = this.state.comments;
    return (
      <div>
        {comments.map(function(comment) {
          return <Comment comment={comment} key={comment.id} />
        })}
      </div>
    )
  }
});

module.exports = CommentList;
```

### 解决方案
如果仅仅只有一个组件注册到该data source，那么将注册的逻辑放到组件中是无可厚非的。避免过早的抽象。

如果几个组件使用该mixin来注册到数据源，我们可以使用“higher-order components”模型来解决这个问题。听起来很吓人的样子。我们近距离来看看组件模型如何实现该模式。

#### Higher-Order Components Explained
让我们暂时忘记React。考虑下面这两个方法，数字的加法和乘法，当他们在计算的时候记录结果。

```js
function addAndLog(x, y) {
  var result = x + y;
  console.log('result:' + result);
  return result;
}

function multiplyAndLog(x, y) {
  var result = x * y;
  console.log('result:' + result);
  return result;
}
```

假如我们想把loging的逻辑抽取出来。我们改如何实现呢？一种比较优雅的方式是写“higher-order function”。也就是一个函数，接收一个函数作为参数，并返回新函数。

结果如下：

```js
function withLogging(wrappedFunction) {
  // 返回具有相同API的函数
  return function(x, y) {
    // 调用原始的函数
    var result = wrappedFunction(x, y);
    // 依然log结果
    console.log('result:', result);
    return result;
  };
}
```

`withLogging` higher-order function让我们通过`add`和`mutiply`方法来实现带有log的`addAndLog`和`mutiplyAndLog`方法。

```js
function add(x, y) {
  return x + y;
}

function multiply(x, y) {
  return x * y;
}

function withLogging(wrappedFunction) {
  return function(x, y) {
    var result = wrappedFunction(x, y);
    console.log('result:', result);
    return result;
  };
}

// Equivalent to writing addAndLog by hand:
var addAndLog = withLogging(add);

// Equivalent to writing multiplyAndLog by hand:
var multiplyAndLog = withLogging(multiply);
```

Higher-order组件是非常类似的，只是其是使用在React的组件上面。我们将分两步来实现mixins到该模式的转变。

首先，我们将`CommentList`组件拆分成两部分，儿子和父亲。儿子仅负责展示评论、父亲处理注册以及通过props传递最新的数据给儿子。

```js
// This is a child component.
// It only renders the comments it receives as props.
var CommentList = React.createClass({
  render: function() {
    // Note: now reading from props rather than state.
    var comments = this.props.comments;
    return (
      <div>
        {comments.map(function(comment) {
          return <Comment comment={comment} key={comment.id} />
        })}
      </div>
    )
  }
});

// This is a parent component.
// It subscribes to the data source and renders <CommentList />.
var CommentListWithSubscription = React.createClass({
  getInitialState: function() {
    return {
      comments: DataSource.getComments()
    };
  },

  componentDidMount: function() {
    DataSource.addChangeListener(this.handleChange);
  },

  componentWillUnmount: function() {
    DataSource.removeChangeListener(this.handleChange);
  },

  handleChange: function() {
    this.setState({
      comments: DataSource.getComments()
    });
  },

  render: function() {
    // We pass the current state as props to CommentList.
    return <CommentList comments={this.state.comments} />;
  }
});

module.exports = CommentListWithSubscription;
```

只剩下最后一步要做的了。

还记得我们是如何实现`withLogging()`的么？将一个函数作为参数，然后返回一个包装了这个函数的新的函数。

我们将写一个新的函数叫做`withSubscription(WrappedComponent)`。其参数可以是任何React组件。我们将`CommentList`作为`WrappedComponent`，但是我们也可以将其他任何组件作为`WrappedComponent`。

该函数将返回另一个组件。该组件负责管理注册以及使用当前数据展示`<WrappedComponent />`。
我们将这种模式叫做 higher-order component。

该组合发生在React render阶段，而不是直接的函数调用。这也就是为什么wrapped component是通过createClass定义和还是ES6 class或者函数无关紧要的原因。如果wrappedComponent是React组件，那么使用`withSubscription()`定义的组件能够render。

```js
// This function takes a component...
function withSubscription(WrappedComponent) {
  // ...and returns another component...
  return React.createClass({
    getInitialState: function() {
      return {
        comments: DataSource.getComments()
      };
    },

    componentDidMount: function() {
      // ... that takes care of the subscription...
      DataSource.addChangeListener(this.handleChange);
    },

    componentWillUnmount: function() {
      DataSource.removeChangeListener(this.handleChange);
    },

    handleChange: function() {
      this.setState({
        comments: DataSource.getComments()
      });
    },

    render: function() {
      // ... and renders the wrapped component with the fresh data!
      return <WrappedComponent comments={this.state.comments} />;
    }
  });
}
```

现在我们能够通过对`CommentList`调用`withSubscription`来定义`CommentListWithSubscription`。

```js
var CommentList = React.createClass({
  render: function() {
    var comments = this.props.comments;
    return (
      <div>
        {comments.map(function(comment) {
          return <Comment comment={comment} key={comment.id} />
        })}
      </div>
    )
  }
});

// withSubscription() returns a new component that
// is subscribed to the data source and renders
// <CommentList /> with up-to-date data.
var CommentListWithSubscription = withSubscription(CommentList);

// The rest of the app is interested in the subscribed component
// so we export it instead of the original unwrapped CommentList.
module.exports = CommentListWithSubscription;
```
完整的解决方案如下。

```js
function withSubscription(WrappedComponent) {
  return React.createClass({
    getInitialState: function() {
      return {
        comments: DataSource.getComments()
      };
    },

    componentDidMount: function() {
      DataSource.addChangeListener(this.handleChange);
    },

    componentWillUnmount: function() {
      DataSource.removeChangeListener(this.handleChange);
    },

    handleChange: function() {
      this.setState({
        comments: DataSource.getComments()
      });
    },

    render: function() {
      // Use JSX spread syntax to pass all props and state down automatically.
      return <WrappedComponent {...this.props} {...this.state} />;
    }
  });
}

// Optional change: convert CommentList to a functional component
// because it doesn't use lifecycle hooks or state.
function CommentList(props) {
  var comments = props.comments;
  return (
    <div>
      {comments.map(function(comment) {
        return <Comment comment={comment} key={comment.id} />
      })}
    </div>
  )
}

// Instead of declaring CommentListWithSubscription,
// we export the wrapped component right away.
module.exports = withSubscription(CommentList);
```

Higher-order component是非常强大的模式。你可以传额外的参数给他们如果你想要深度定制行为的话。毕竟他们都不是React的特性。他们仅仅是接收组件，并返回新的组件的函数而已。

如同其他任何解决方案。higher-order components有其自己的缺点。例如，如果你大量依赖refs，你会发现refs会指向包装好之后的组件。但实际上我们是不建议大量使用refs的，所以这也不应该成为大问题。未来我们可能通过增加ref forwarding来解决这个问题。

## Rendering Logic
下一个在我们代码库中比较常见的应用case是在不同的组件之间分享rendering逻辑。如下。

```js
var RowMixin = {
  // Called by components from render()
  renderHeader: function() {
    return (
      <div className='row-header'>
        <h1>
          {this.getHeaderText() /* Defined by components */}
        </h1>
      </div>
    );
  }
};

var UserRow = React.createClass({
  mixins: [RowMixin],

  // Called by RowMixin.renderHeader()
  getHeaderText: function() {
    return this.props.user.fullName;
  },

  render: function() {
    return (
      <div>
        {this.renderHeader() /* Defined by RowMixin */}
        <h2>{this.props.user.biography}</h2>
      </div>
    )
  }
});
```

不同的组件可能共享RowMixin来展示header，他们都必须要定义`getHeaderText()`函数。

### 解决方案
如果你发现mixin中存在render逻辑，那么是时候改抽取component了。我们定义`Row`组件来替代`RowMixin`。我们使用传统的传递props的方式来替换掉`getHeaderText()`函数。

最后，因为这些组件都不需要生命周期的hook，所以我们用单纯的函数就可以了。

```js
function RowHeader(props) {
  return (
    <div className='row-header'>
      <h1>{props.text}</h1>
    </div>
  );
}

function UserRow(props) {
  return (
    <div>
      <RowHeader text={props.user.fullName} />
      <h2>{props.user.biography}</h2>
    </div>
  );
}
```

props让组件之间的依赖关系变得显示，容易替换。使得Flow以及TypeScript这样的工具能够有用武之地。

## Context
另外一组Mixin我们发现是React context的帮助工具。Context是一个不太成熟的，不稳定的方案，有一些特定的问题，而且其API很有可能会在将来改变。我们是不推荐使用的，除非你真的不能通过其他方式来解决这个问题。

如果你已经开始使用context，那你可能使用了如下的mixin来隐藏其使用。

```js
var RouterMixin = {
  contextTypes: {
    router: React.PropTypes.object.isRequired
  },

  // The mixin provides a method so that components
  // don't have to use the context API directly.
  push: function(path) {
    this.context.router.push(path)
  }
};

var Link = React.createClass({
  mixins: [RouterMixin],

  handleClick: function(e) {
    e.stopPropagation();

    // This method is defined in RouterMixin.
    this.push(this.props.to);
  },

  render: function() {
    return (
      <a onClick={this.handleClick}>
        {this.props.children}
      </a>
    );
  }
});

module.exports = Link;
```

### 解决方案
我们也认为在使用组件的使用隐藏context的使用是好想法，前提是context的API稳定。然而我们建议使用Higher-order Component来替换mixin。

下面我们使用来自context中的一些东西来包装组件，然后通过props传递给被包装的组件。

```js
function withRouter(WrappedComponent) {
  return React.createClass({
    contextTypes: {
      router: React.PropTypes.object.isRequired
    },

    render: function() {
      // The wrapper component reads something from the context
      // and passes it down as a prop to the wrapped component.
      var router = this.context.router;
      return <WrappedComponent {...this.props} router={router} />;
    }
  });
};

var Link = React.createClass({
  handleClick: function(e) {
    e.stopPropagation();

    // The wrapped component uses props instead of context.
    this.props.router.push(this.props.to);
  },

  render: function() {
    return (
      <a onClick={this.handleClick}>
        {this.props.children}
      </a>
    );
  }
});

// Don't forget to wrap the component!
module.exports = withRouter(Link);
```

如果你正在使用的第三方库只提供了mixin，我们建议你提issue，并加上本文的链接，以便他们通过higher-order component来重写。同时，我们建议你应该多使用higher-order component。

## Utility Methods
某些时候，mixin仅仅是用来在不同的组件之间共享功能。

```js
var ColorMixin = {
  getLuminance(color) {
    var c = parseInt(color, 16);
    var r = (c & 0xFF0000) >> 16;
    var g = (c & 0x00FF00) >> 8;
    var b = (c & 0x0000FF);
    return (0.299 * r + 0.587 * g + 0.114 * b);
  }
};

var Button = React.createClass({
  mixins: [ColorMixin],

  render: function() {
    var theme = this.getLuminance(this.props.color) > 160 ? 'dark' : 'light';
    return (
      <div className={theme}>
        {this.props.children}
      </div>
    )
  }
});
```

### 解决方案
将工具方法提取到JavaScript模块中，然后import他们。这样也能更好的保证可测试性。

```js
var getLuminance = require('../utils/getLuminance');

var Button = React.createClass({
  render: function() {
    var theme = getLuminance(this.props.color) > 160 ? 'dark' : 'light';
    return (
      <div className={theme}>
        {this.props.children}
      </div>
    )
  }
});
```

## 其他使用Case
有时候，人们使用mixins来选择性的在不同的生命周期hook中添加log。未来，我们倾向于提供官方的调试API（`official DevTools API`）让你来实现类似的功能而不能更改组件的代码。但这一切还正在进行中。如果你的项目中重度依赖mixin来打log，那么你可能还需要等待更久一点的时间。

如果某些情况下你不同通过实现组件、higher-order component或者工具模块来解决问题，很有可能是因为React本身不能解决这个问题了，记得给我们提issue，我们会尽快提供可选方案，或者实现新的特性。

Mixins并没有被废弃。你依然可以使用Mixin当你使用`React.createClass()`，未来我们也不会改变它。最后ES6类方法越来越受到很多人使用，未来可能我们会将`React.createClass()`拆分到不同的包中，因为大部分人可能不会再需要使用它们。即使是这种情况，老的mixin也能继续使用。

我们坚信上面给出的替代方案在大部分情况下是要比mixin更好，我们邀请各位写无mixin的React app。

