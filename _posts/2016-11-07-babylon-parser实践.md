---
layout: post
title: babylon parser实践
date: 2016-11-07
categories: js,babel
---

最近项目需要将一种语法转换到另外一种语法，代码不是我写的，但本着学习的心态阅读了部分代码，主要学习了两个库的使用，一个是[htmlparser2](https://github.com/fb55/htmlparser2)，一个就是[babylon](https://github.com/babel/babylon)。

htmlparser2就不多说了，也比较简单，就是类似xml解析器，在解析的过程中会有一堆回调，然后在回调里面处理解析过来的节点就可以了。本文着重描述下babylon，之前都很少接触类似的解析器，正好趁此机会涨涨眼界。

# 什么是babylon
这个问题是必须要首先回答的。**Babylon是Babel中用的JavaScript解析器**。正好之前瞄了几眼编译原理，其实babylon干的活主要就是词法分析器和语法分析器，也就是编译器的前端。

好了，其实对babylon的解释就只能到这里了，再深入我也无能为力了，大家还是回家看看挤满灰尘的“龙书”吧。

# 什么是AST
如果你懂得什么是AST，那么你用babylon的时候就不会有什么障碍了。我就是属于不懂的，本文就是记录下到底babylon的AST有多少种节点，后面才能根据不同的节点做不同的事情啊。

AST的全称是Abstract Syntax Tree，中文名抽象语法树。我们应该都知道，不论我们用什么语言写代码，最终都会被编译器先搞成AST，以便检查我们的语法或者做些优化什么的。AST就是我们写的代码的树形结构，方便计算机处理的。借用下wikipedia上的图展示下AST长啥样，
![AST](https://en.wikipedia.org/wiki/File:Abstract_syntax_tree_for_Euclidean_algorithm.svg)。

AST能被计算机理解，所以也是比较容易让我们理解的，但把代码转换成AST是一件比较麻烦的事情，babylon就主要是帮我们做了这个转换工作，方便我们直接操作AST来达到修改源码的目的。

这里必须要推荐一个利器，[AST Explorer](https://astexplorer.net/)。通过该工具，我们能非常方便的知道我们的代码会被转换成啥样的AST，然后我们就能有目的的去修改AST。
当然对于初学者的我，还有需要匹配一个网站才能把这个东西整明白[JavaScript Reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference)。

举个例子

```js
{item.a}
```

经过转换之后变成（当然，我处理过了，原来可比这长多了）

```
{
  "type": "File",
  "start": 0,
  "end": 8,
  "loc": [Object]
  },
  "program": {
    "type": "Program",
    "start": 0,
    "end": 8,
    "loc": [Object]
    },
    "sourceType": "module",
    "body": [
      {
        "type": "BlockStatement",
        "start": 0,
        "end": 8,
        "loc": [Object]
        },
        "body": [
          {
            "type": "ExpressionStatement",
            "start": 1,
            "end": 7,
            "loc": [Object]
            },
            "expression": {
              "type": "MemberExpression",
              "start": 1,
              "end": 7,
              "loc": [Object]
              },
              "object": {
                "type": "Identifier",
                "start": 1,
                "end": 5,
                "loc": [Object]
                },
                "name": "item"
              },
              "property": {
                "type": "Identifier",
                "start": 6,
                "end": 7,
                "loc": [Object]
                },
                "name": "a"
              },
              "computed": false
            }
          }
        ]
      }
    ]
  },
  "comments": [],
  "tokens": [
    {
      "type": {
        "label": "{",
        "beforeExpr": true,
        "startsExpr": true,
        "rightAssociative": false,
        "isLoop": false,
        "isAssign": false,
        "prefix": false,
        "postfix": false,
        "binop": null
      },
      "start": 0,
      "end": 1,
      "loc": [Object]
    },
    {
      "type": {
        "label": "name",
        "beforeExpr": false,
        "startsExpr": true,
        "rightAssociative": false,
        "isLoop": false,
        "isAssign": false,
        "prefix": false,
        "postfix": false,
        "binop": null,
        "updateContext": null
      },
      "value": "item",
      "start": 1,
      "end": 5,
      "loc": [Object]
    },
    {
      "type": {
        "label": ".",
        "beforeExpr": false,
        "startsExpr": false,
        "rightAssociative": false,
        "isLoop": false,
        "isAssign": false,
        "prefix": false,
        "postfix": false,
        "binop": null,
        "updateContext": null
      },
      "start": 5,
      "end": 6,
      "loc": [Object]
    },
    {
      "type": {
        "label": "name",
        "beforeExpr": false,
        "startsExpr": true,
        "rightAssociative": false,
        "isLoop": false,
        "isAssign": false,
        "prefix": false,
        "postfix": false,
        "binop": null,
        "updateContext": null
      },
      "value": "a",
      "start": 6,
      "end": 7,
      "loc": [Object]
    },
    {
      "type": {
        "label": "}",
        "beforeExpr": false,
        "startsExpr": false,
        "rightAssociative": false,
        "isLoop": false,
        "isAssign": false,
        "prefix": false,
        "postfix": false,
        "binop": null
      },
      "start": 7,
      "end": 8,
      "loc": [Object]
    },
    {
      "type": {
        "label": "eof",
        "beforeExpr": false,
        "startsExpr": false,
        "rightAssociative": false,
        "isLoop": false,
        "isAssign": false,
        "prefix": false,
        "postfix": false,
        "binop": null,
        "updateContext": null
      },
      "start": 8,
      "end": 8,
      "loc": [Object]
      }
    }
  ]
}
```

是不是感觉很夸张，就一行代码，结果整出了一篇论文的长度，这就是编程语言的魅力，以极致的简单和逻辑来简化编程的工作。

上面的结果里面有两个比较重要的部分，一个是`program`，一个是`tokens`，`tokens`就是词法分析后得出的词法单元集合，`program`就是AST，可以发现AST的每个结构都有type、start、end、loc等字段，后三者都比较好理解，及时该节点在源码中的位置嘛。type相对而言就比较复杂了，我的理解是，type的定义，决定了一门语言。也就是说JavaScript所有的语法应该都在type中有定义。

babylon解析之后的AST的节点类型是基于[ESTree](https://github.com/estree/estree)的，做了少许修改，完整的列表看这里[Babylon AST node types](https://github.com/babel/babylon/blob/master/ast/spec.md#objectproperty)。

# Babylon AST Node Type
下面我们就主要看看不同的Node类型到底都长啥样，下面的例子忽略了所有的位置信息。

## Identifier
标识符节点，一个简单的a变量，就是一个标识符。

```js
// var a;

{
  "type": "Identifier",
  "name": "a"
}

```

## Literals

### RegexpLiteral

```js
// /\w+/g

{
  "type": "ExpressionStatement",
  "expression": {
    "type": "RegExpLiteral",
    "extra": {
      "raw": "/\\w+/g"
    },
    "pattern": "\\w+",
    "flags": "g"
  }
}
```

### NullLiteral

```js
// null

{
  "type": "ExpressionStatement",
  "expression": {
    "type": "NullLiteral",
  }
}
```

### StringLiteral

```js
// var a = "a"

{
  "type": "StringLiteral",
  "extra": {
    "rawValue": "a",
    "raw": "\"a\""
  },
  "value": "a"
}
```

### BooleanLiteral

```js
// true

{
  "type": "ExpressionStatement",
  "expression": {
    "type": "BooleanLiteral",
    "value": true
  }
}
```

### NumericLiteral

```js
// 1

{
  "type": "ExpressionStatement",
  "expression": {
    "type": "NumericLiteral",
    "extra": {
      "rawValue": 1,
      "raw": "1"
    },
    "value": 1
  }
}
```

## Programs

```js
{
  "type": "Program",
  "sourceType": "module",
  "body": []
  "directives": []
}
```

## Functions

```js
// function a() {
//   return a;
// }

{
  "type": "FunctionDeclaration",
  "id": {
    "type": "Identifier",
    "name": "a"
  },
  "generator": false,
  "expression": false,
  "async": false,
  "params": [],
  "body": {}
}
```

## Statements

### ExpressionStatement

```js
// var a

{
  "type": "ExpressionStatement",
  "expression": {}
}
```

### BlockStatement

```js
// { }

{
  "type": "BlockStatement",
  "body": [],
  "directives": []
}

```

### EmptyStatement

```js
//;

{
  "type": "EmptyStatement",
}
```

### DebuggerStatement

```js
// debugger;

{
  "type": "DebuggerStatement",
}
```

### WithStatement

```js
// with (o) {}

{
  "type": "WithStatement",
  "object": {},
  "body": {}
}
```

### Control flow

#### ReturnStatement

```js
// function a() {return a}

{
  "type": "ReturnStatement",
  "argument": {}
}
```

#### LabeledStatement

```js
// loop1:
//   a = 1;

{
  "type": "LabeledStatement",
  "body": {},
  "label": {
    "type": "Identifier",
    "name": "loop1"
  }
}
```

#### BreakStatement

```js
// while(1){
//   break;
// }

{
  "type": "BreakStatement",
  "label": null
}
```

#### ContinueStatement

```js
// while(1){
//   continue;
// }

{
  "type": "ContinueStatement",
  "label": null
}
```

### Choice

#### IfStatement

```js
// if(1){}

{
  "type": "IfStatement",
  "test": {},
  "consequent": {},
  "alternate": null
}
```

#### SwitchStatement

```js
// switch(1) {
//  case 1: break;
// }


{
  "type": "SwitchStatement",
  "discriminant": {},
  "cases": []
}
```

#### SwitchCase

```js
// switch(1) {
//  case 1: break;
// }

{
  "type": "SwitchCase",
  "consequent": [],
  "test": {}
}
```

### Exceptions

#### ThrowStatement

```js
// throw "myException";

{
  "type": "ThrowStatement",
  "argument": {}
}
```

#### TryStatement

```js
// try {} catch (e) {}

{
  "type": "TryStatement",
  "block": {},
  "handler": {},
  "guardedHandlers": [],
  "finalizer": null
}
```

##### CatchClause

```js
// try {} catch (e) {}

{
  "type": "CatchClause",
  "param": {},
  "body": {}
},
```

### Loops

#### WhileStatement

```js
// while(1) {}

{
  "type": "WhileStatement",
  "test": {},
  "body": {}
}
```

#### DoWhileStatement

```js
// do{} while(1)

{
  "type": "DoWhileStatement",
  "body": {},
  "test": {}
}
```

#### ForStatement

```js
{
  "type": "ForStatement",
  "init": null,
  "test": null,
  "update": null,
  "body": {}
}
```

#### ForInStatement

```js
// var obj = {a:1, b:2, c:3};
// for (var prop in obj) {
// }

{
  "type": "ForInStatement",
  "left": {},
  "right": {},
  "body": {}
}
```

#### ForOfStatement

```js
// var obj = {a:1, b:2, c:3};
// for (var prop of obj) {
// }

{
  "type": "ForOfStatement",
  "left": {},
  "right": {},
  "body": {}
}

```

#### ForAwaitStatement

```js
```

## Declarations

### FunctionDeclaration

```js
// function a() {}

{
  "type": "FunctionDeclaration",
  "id": {},
  "generator": false,
  "expression": false,
  "async": false,
  "params": [],
  "body": {}
}
```

### VariableDeclaration

```js
// var a;

{
  "type": "VariableDeclaration",
  "declarations": [],
  "kind": "var"
}
```

#### VariableDeclarator

```js
// var a;

{
  "type": "VariableDeclarator",
  "id": {},
  "init": null
}

```

## Misc

### Decorator

```js

```

### Directive

```js
// a

{
  "type": "Directive",
  "value": {}
}

```

### DirectiveLiteral

```js
// a
{
  "type": "DirectiveLiteral",
  "value": "a",
  "extra": {
    "raw": "\"a\"",
    "rawValue": "a"
  }
}

```

## Expressions

### Super

```js
//  class Base {
//   constructor() {
//   }
// }

// class Derivative extends Base {
//   constructor() {
//     super();
//   }
// }

{
  "type": "Super"
}
```

### Import

### ThisExpression

```js
// class Base {
//   constructor() {
//   }
// }

// class Derivative extends Base {
//   constructor() {
//     super();
//   }
  
//   a() {
//     this.a = 1;
//   }
// }

{
  "type": "ThisExpression",
}
```

### ArrowFunctionExpression

```js
// a => {return a;}

{
  "type": "ArrowFunctionExpression",
  "id": null,
  "generator": false,
  "expression": false,
  "async": false,
  "params": [],
  "body": {}
}
```

### YieldExpression

```js
// function* foo(){
//   var index = 0;
//   while (index <= 2)
//     yield index++;
// }

{
  "type": "YieldExpression",
  "delegate": false,
  "argument": {}
}
```

### AwaitExpression

```js
// async function f2() {
//   var y = await 20;
//   console.log(y); // 20
// }
// f2();

{
  "type": "AwaitExpression",
  "argument": {}
}
```

### ArrayExpression

```js
// a = [];

{
  "type": "ArrayExpression",
  "elements": []
}
```

### ObjectExpression

```js
// a = {};

{
  "type": "ObjectExpression",
  "properties": []
}
```

#### ObjectMember

##### ObjectProperty

```js
// a = {a:"1", b:"2"};
{
  "type": "ObjectProperty",
  "method": false,
  "shorthand": false,
  "computed": false,
  "key": {},
  "value": {}
}
```

##### ObjectMethod

```js
// a = {
//   a(){}
// };

{
  "type": "ObjectMethod",
  "method": true,
  "shorthand": false,
  "computed": false,
  "key": {},
  "kind": "method",
  "id": null,
  "generator": false,
  "expression": false,
  "async": false,
  "params": [],
  "body": {}
}
```

### RestProperty

```js

```

### SpreadProperty

```js
// a = {
//   ...b
// }

{
  "type": "SpreadProperty",
  "argument": {}
}
```

### FunctionExpression

```js
// var a = function() {};

{
  "type": "FunctionExpression",
  "id": null,
  "generator": false,
  "expression": false,
  "async": false,
  "params": [],
  "body": {}
}
```

### Unary operations

```js
```

#### UnaryExpression

```js
// a = ~1

{
  "type": "UnaryExpression",
  "operator": "~",
  "prefix": true,
  "argument": {},
  "extra": {}
}
```

##### UnaryOperator

```js
```

#### UpdateExpression

```js
// a ++

{
  "type": "UpdateExpression",
  "operator": "++",
  "prefix": false,
  "argument": {}
}
```

##### UpdateOperator

```js
```

### Binary operations

#### BinaryExpression

```js
// var a = a + 1;

{
  "type": "BinaryExpression",
  "left": {},
  "operator": "+",
  "right": {}
  }
}
```

##### BinaryOperator

```js
```

#### AssignmentExpression

```js
// a = 1;

{
  "type": "AssignmentExpression",
  "operator": "=",
  "left": {},
  "right": {}
}
```

##### AssignmentOperator

```js
```

#### LogicalExpression

```js
// a || 1;

{
  "type": "LogicalExpression",
  "left": {},
  "operator": "||",
  "right": {}
}
```

##### LogicalOperator

```js
```

#### SpreadElement

```js
// function myFunction(x, y, z) { }
// var args = [0, 1, 2];
// myFunction(...args);

{
  "type": "SpreadElement",
  "argument": {}
}
```

#### MemberExpression

```js
// a.b

{
  "type": "MemberExpression",
  "object": {},
  "property": {},
  "computed": false
}
```

#### BindExpression

```js
```

### ConditionalExpression

```js
// 1 ? 'a' : 'b';

{
  "type": "ConditionalExpression",
  "test": {},
  "consequent": {},
  "alternate": {}
}
```

### CallExpression

```js
// call()

{
  "type": "CallExpression",
  "callee": {},
  "arguments": []
}
```

### NewExpression

```js
// new Obejct();

{
  "type": "NewExpression",
  "callee": {},
  "arguments": []
}
```

### SequenceExpression

```js
```

## Template Literals

### TemplateLiteral

```js
// `a`

{
  "type": "TemplateLiteral",
  "expressions": [],
  "quasis": []
}
```

### TaggedTemplateExpression

```js
// tag `a`

{
  "type": "TaggedTemplateExpression",
  "tag": {},
  "quasi": {}
}
```

### TemplateElement

```js
// `a`

{
  "type": "TemplateElement",
  "value": {},
  "tail": true
}
```

## Patterns

### ObjectPattern

```js
```

### ArrayPattern

```js
```

### RestElement

```js
// function f(a, b, ...args) {}

{
  "type": "RestElement",
  "argument": {}
}
```

### AssignmentPattern

```js
```

## Classes
### ClassBody

```js
// class a {}

{
  "type": "ClassBody",
  "body": []
}
```

### ClassMethod

```js
// class a {
//   b(){}
// }

{
  "type": "ClassMethod",
  "computed": false,
  "key": {},
  "static": false,
  "kind": "method",
  "id": null,
  "generator": false,
  "expression": false,
  "async": false,
  "params": [],
  "body": {}
}
```

### ClassProperty

```js
// class a {
//   b: "a"
// }

{
  "type": "ClassProperty",
  "computed": false,
  "key": {},
  "variance": null,
  "static": false,
  "typeAnnotation": {},
  "value": null
}
```

### ClassDeclaration

```js
// class a {
//   b: "a"
// }


{
  "type": "ClassDeclaration",
  "id": {},
  "superClass": null,
  "body": {}
}
```

### ClassExpression

```js
// class a {
//   b: "a"
// }

{
  "type": "ClassExpression",
  "id": {},
  "superClass": null,
  "body": {}
}
```

### MetaProperty

```js
```


## Modules

### ModuleDeclaration

```js
```

### ModuleSpecifier

```js
```

### Imports

#### ImportDeclaration

```js
// import { cube, foo } from 'my-module';

{
  "type": "ImportDeclaration",
  "specifiers": [],
  "importKind": "value",
  "source": {}
}
```

#### ImportSpecifier

```js
// import { cube, foo } from 'my-module';

{
  "type": "ImportSpecifier",
  "imported": {},
  "local": {}
}

```

#### ImportDefaultSpecifier

```js
// import myDefault from "my-module";

{
  "type": "ImportDefaultSpecifier",
  "local": {}
}

```

#### ImportNamespaceSpecifier

```js
// import * as myModule from "my-module";

{
  "type": "ImportNamespaceSpecifier",
  "local": {}
}
```

### Exports

#### ExportNamedDeclaration

```js
// export { myFunction }

{
  "type": "ExportNamedDeclaration",
  "declaration": null,
  "specifiers": [],
  "source": null,
  "exportKind": "value"
}
```

#### ExportSpecifier

```js
// export { myFunction }

{
  "type": "ExportSpecifier",
  "local": {},
  "exported": {}
}

```

#### ExportDefaultDeclaration

```js
// export default { myFunction };

{
  "type": "ExportDefaultDeclaration",
  "declaration": {}
}

```

#### ExportAllDeclaration

```js
// export * from "my-module";

{
  "type": "ExportAllDeclaration",
  "source": {}
}
```
