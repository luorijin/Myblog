# vue1.0源码分析

## installGlobalAPI(src/index.js)

```js
import Vue from './instance/vue'
import installGlobalAPI from './global-api'
import { inBrowser, devtools } from './util/index'
import config from './config'

installGlobalAPI(Vue)
```

通过`installGlobalAPI`方法向Vue构造函数添加全局方法，如`Vue.extend、Vue.nextTick、Vue.delete`等，主要初始化Vue一些全局使用的方法、变量和配置

```js
export default function (Vue){
    Vue.options = {
          .....
    }
    Vue.extend = function (extendOptions){
           ......
    }
    Vue.use = function (plugin){
           ......
    }
    Vue.mixin = function (mixin){
           ......
    }
    Vue.extend = function (extendOptions){
           ......
    }
}
```
## 实例化Vue

当使用vue时

```js
var app = new Vue({
  el: '#app',
  data: {
    message: 'Hello Vue!'
  }
})
```

会调用构造函数实例化一个vue对象，而在构造函数中只有这句代码`this.init(options)`；而在init中，主要进行一些变量的初始化、option重组、各种状态、事件初始化;

```js
Vue.prototype._init = function (options) {
    options = options || {}
    this.$el = null
    this.$parent = options.parent
    this.$root = this.$parent
      ? this.$parent.$root
      : this
    this.$children = []
    this.$refs = {}       // child vm references
    this.$els = {}        // element references
    this._watchers = []   // all watchers as an array
    this._directives = [] // all directives

    ...... // 更多见源码

    options = this.$options = mergeOptions(
      this.constructor.options,
      options,
      this
    )

    // set ref
    this._updateRef()

    // initialize data as empty object.
    // it will be filled up in _initData().
    this._data = {}

    // call init hook
    this._callHook('init')

    // initialize data observation and scope inheritance.
    this._initState()

    // setup event system and option events.
    this._initEvents()

    // call created hook
    this._callHook('created')

    // if `el` option is passed, start compilation.
    if (options.el) {
      this.$mount(options.el)
    }
}
```

在其中通过`mergeOptions`方法，将全局`this.constructor.options`与传入的`options`及实例化的对象进行合并；而`this.constructor.options`则是上面初始化vue时进行配置的，其中主要包括一些全局使用的指令、过滤器，如经常使用的"v-if"、"v-for"、"v-show"、"currency":

```js
this.constructor.options = {
        directives: {
          bind: {}, // v-bind
          cloak: {}, // v-cloak
          el: {}, // v-el
          for: {}, // v-for
          html: {}, // v-html
          if: {}, // v-if
          for: {}, // v-for
          text: {}, // v-text
          model: {}, // v-model
          on: {}, // v-on
          show: {} // v-show
        },
        elementDirectives: {
          partial: {}, // <partial></partial> api: https://v1.vuejs.org/api/#partial
          slot: {} // <slot></slot>
        },
        filters: {  // api: https://v1.vuejs.org/api/#Filters
          capitalize: function() {}, // {{ msg | capitalize }}  ‘abc’ => ‘Abc’
          currency: funnction() {},
          debounce: function() {},
          filterBy: function() {},
          json: function() {},
          limitBy: function() {},
          lowercase: function() {},
          orderBy: function() {},
          pluralize: function() {},
          uppercase: function() {}
        }
}
```

然后，会触发初始化一些状态、事件、触发init、create钩子；然后随后，会触发`this.$mount(options.el)`；进行实例挂载，将dom添加到页面；而this.$mount()方法则包含了绝大部分页面渲染的代码量，包括模板的嵌入、编译、link、指令和watcher的生成、批处理的执行等等，后续会详细进行说明；

## _compile函数之transclude

在`Vue.prototype.$mount`完成了大部分工作，而在$mount方法里面，最主要的工作量由`this._compile(el)`承担；其主要包括transclude(嵌入)、compileRoot(根节点编译)、compile(页面其他的编译)；而在这儿主要说明transclude方法；

通过对transclude进行网络翻译结果是"嵌入"；其主要目的是将页面中自定义的节点转化为真实的html节点；如一个组件`<hello></hello>`其实际dom为`<div><h1>hello {{message}}</h1></div>`，源码; 当我们使用时`<div><hello></hello></div>`; 会通过`transclude`将其转化为`<div><div><h1>hello {{message}}</h1></div></div>`

```js
export function transclude (el, options) {
  // extract container attributes to pass them down
  // to compiler, because they need to be compiled in
  // parent scope. we are mutating the options object here
  // assuming the same object will be used for compile
  // right after this.
  if (options) {
    // 把el(虚拟节点，如<hello></hello>)元素上的所有attributes抽取出来存放在了选项对象的_containerAttrs属性上
    // 使用el.attributes 方法获取el上面，并使用toArray方法，将类数组转换为真实数组
    options._containerAttrs = extractAttrs(el)
  }
  // for template tags, what we want is its content as
  // a documentFragment (for fragment instances)
  // 判断是否为 template 标签
  if (isTemplate(el)) {
    // 得到一段存放在documentFragment里的真实dom
    el = parseTemplate(el)
  }
  if (options) {
    if (options._asComponent && !options.template) {
      options.template = '<slot></slot>'
    }
    if (options.template) {
      // 将el的内容（子元素和文本节点）抽取出来
      options._content = extractContent(el)
      // 使用options.template 将虚拟节点转化为真实html， <hello></hello> => <div><h1>hello {{ msg }}</h1></div>
      // 但不包括未绑定数据, 则上面转化为 => <div><h1>hello</h1></div>
      el = transcludeTemplate(el, options)
    }
  }
  // isFragment: node is a DocumentFragment
  // 使用nodeType 为 11 进行判断是非为文档片段
  if (isFragment(el)) {
    // anchors for fragment instance
    // passing in `persist: true` to avoid them being
    // discarded by IE during template cloning
    prepend(createAnchor('v-start', true), el)
    el.appendChild(createAnchor('v-end', true))
  }
  return el
}
```

首先先看如下代码

```js
if (options) {
    // 把el(虚拟节点，如<hello></hello>)元素上的所有attributes抽取出来存放在了选项对象的_containerAttrs属性上
    // 使用el.attributes 方法获取el上面，并使用toArray方法，将类数组转换为真实数组
    options._containerAttrs = extractAttrs(el)
  }
```

而`extractAttrs`方法如下，其主要根据元素nodeType去判断是否为元素节点，如果为元素节点，且元素有相关属性，则将属性值取出之后，再转为属性数组；最后将属性数组放到`options._containerAttrs`中，为什么要这么做呢？因为现在的el可能不是真实的元素，而是诸如`<hello class="test"></hello>`，在后面编译过程，需要将其替换为真实的html节点，所以，它上面的属性值都会先取出来预存起来，后面合并到真实html根节点的属性上面；

```js
function extractAttrs (el) {
  // 只查找元素节点及有属性
  if (el.nodeType === 1 && el.hasAttributes()) {
    // attributes 属性返回指定节点的属性集合，即 NamedNodeMap, 类数组
    return toArray(el.attributes)
  }
}
```

下一句，根据元素nodeName是否为“template”去判断是否为`<template></template>`元素；如果是，则走`parseTemplate(el)`方法，并覆盖当前el对象

```js
if (isTemplate(el)) {
    // 得到一段存放在documentFragment里的真实dom
    el = parseTemplate(el)
  }

function isTemplate (el) {
  return el.tagName &&
    el.tagName.toLowerCase() === 'template'
}
```

而`parseTemplate`则主要是将传入内容生成一段存放在documentFragment里的真实dom；进入函数，首先判断传入是否已经是一个文档片段，如果已经是，则直接返回；否则，判断传入是否为字符串，如果为字符串, 先判断是否是"#test"这种选择器类型，如果是，通过document.getElementById方法取出元素，如果文档中有此元素，将通过`nodeToFragment`方式，将其放入一个新的节点片段中并赋给frag，最后返回到外面；如果不是选择器类型字符串，则使用s`tringToFragment`将其生成一个新的节点片段，并返回；如果传入非字符串而是节点(不管是什么节点，可以是元素节点、文本节点、甚至Comment节点等)；则直接通过nodeToFragment生成节点片段并返回;

```js
export function parseTemplate (template, shouldClone, raw) {
  var node, frag

  // if the template is already a document fragment,
  // do nothing
  // 是否为文档片段, nodetype是否为11
  // https://developer.mozilla.org/zh-CN/docs/Web/API/DocumentFragment
 // 判断传入是否已经是一个文档片段，如果已经是，则直接返回
  if (isFragment(template)) {
    trimNode(template)
    return shouldClone
      ? cloneNode(template)
      : template
  }
  // 判断传入是否为字符串
  if (typeof template === 'string') {
    // id selector
    if (!raw && template.charAt(0) === '#') {
      // id selector can be cached too
      frag = idSelectorCache.get(template)
      if (!frag) {
        node = document.getElementById(template.slice(1))
        if (node) {
          frag = nodeToFragment(node)
          // save selector to cache
          idSelectorCache.put(template, frag)
        }
      }
    } else {
      // normal string template
      frag = stringToFragment(template, raw)
    }
  } else if (template.nodeType) {
    // a direct node
    frag = nodeToFragment(template)
  }

  return frag && shouldClone
    ? cloneNode(frag)
    : frag
}
```

在`parseTemplate`里面最重要的是`nodeToFragmen`t和`stringToFragment`；那么，它们又是如何将传入内容转化为新的文档片段呢？首先看nodeToFragment

```js
function nodeToFragment (node) {
  // if its a template tag and the browser supports it,
  // its content is already a document fragment. However, iOS Safari has
  // bug when using directly cloned template content with touch
  // events and can cause crashes when the nodes are removed from DOM, so we
  // have to treat template elements as string templates. (#2805)
  /* istanbul ignore if */
  // 是template元素或者documentFragment，使用stringToFragment转化并保存节点内容
  if (isRealTemplate(node)) {
    return stringToFragment(node.innerHTML)
  }
  // script template
  if (node.tagName === 'SCRIPT') {
    return stringToFragment(node.textContent)
  }
  // normal node, clone it to avoid mutating the original
  var clonedNode = cloneNode(node)
  var frag = document.createDocumentFragment()
  var child
  /* eslint-disable no-cond-assign */
  while (child = clonedNode.firstChild) {
  /* eslint-enable no-cond-assign */
    frag.appendChild(child)
  }
  trimNode(frag)
  return frag
}
```

首先判断传入内容是否为`template`元素或者`documentFragment`或者`script`标签，如果是，都直接走`stringToFragment`；后面就是先使用d`ocument.createDocumentFragment`创建一个文档片段，然后将节点进行循环`appendChild`到创建的文档片段中，并返回新的片段;

那么，stringToFragment呢？这个就相对复杂一点了，如下：

```js
function stringToFragment (templateString, raw) {
  // try a cache hit first
  var cacheKey = raw
    ? templateString
    : templateString.trim() //trim() 方法会从一个字符串的两端删除空白字符
  var hit = templateCache.get(cacheKey)
  if (hit) {
    return hit
  }
  // 创建一个文档片段
  var frag = document.createDocumentFragment()
  // tagRE: /<([\w:-]+)/
  // 匹配标签
  // '<test v-if="ok"></test>'.match(/<([\w:-]+)/) => ["<test", "test", index: 0, input: "<test v-if="ok"></test>"]
  var tagMatch = templateString.match(tagRE)
  // entityRE: /&#?\w+?;/
  var entityMatch = entityRE.test(templateString)
  // commentRE: /<!--/ 
  // 匹配注释
  var commentMatch = commentRE.test(templateString) 

  if (!tagMatch && !entityMatch && !commentMatch) {
    // text only, return a single text node.
    // 如果都没匹配到，创建一个文本节点添加到文档片段
    frag.appendChild(
      document.createTextNode(templateString)
    )
  } else {
    var tag = tagMatch && tagMatch[1]
    // map, 对标签进行修正；如是td标签，则返回"<table><tbody><tr>" + templateString +  "</tr></tbody></table>";
    // map['td'] = [3, "<table><tbody><tr>", "</tr></tbody></table>"]
    var wrap = map[tag] || map.efault
    var depth = wrap[0]
    var prefix = wrap[1]
    var suffix = wrap[2]
    var node = document.createElement('div')

    node.innerHTML = prefix + templateString + suffix

    while (depth--) {
      node = node.lastChild
    }

    var child
    document.body.appendChild(node);
    /* eslint-disable no-cond-assign */
    while (child = node.firstChild) {
    /* eslint-enable no-cond-assign */
      frag.appendChild(child)
    }
  }
  if (!raw) {
    // 移除文档中空文本节点及注释节点
    trimNode(frag)
  }
  templateCache.put(cacheKey, frag)
  return frag
}
```

首先去缓存查看是否已经有，如果有，则直接取缓存数据，减少程序运行；而后，通过正则判断是否为元素文本，如果不是，则说明为正常的文字文本，直接创建文本节点，并放入新建的DocumentFragment中再放入缓存中，并返回最终生成的DocumentFragment；如果是节点文本，则首先对文本进行修正；比如如果传入的是`<td></td>`则需要在其外层添加tr、tbody、table后才能直接使用appendChild将节点添加到文档碎片中，而无法直接添加td元素到div元素中；在最后返回一个DocumentFragment；

以上就是`parseTemplate`及其里面`nodeToFragment`、`stringToFragment`的具体实现；然后我们继续回到`transclude`；

在`transclude`后续中，重要就是`transcludeTemplate`方法，其主要就是通过此函数，根据`option.template`将自定义标签转化为真实内容的元素节点；如`<hello></hello`>这个自定义标签，会根据此标签里面真实元素而转化为真实的dom结构;

```js
// app.vue
<hello></hello>

// template: 
<div class="hello" _v-0480c730="">
  <h1 _v-0480c730="">hello {{ msg }} welcome here</h1>
  <h3 v-if="show" _v-0480c730="">this is v-if</h3>
</div>
```

函数首先会通过上述`parseTemplate`方法将模版数据转化为一个临时的`DocumentFragment`，然后根据是否将根元素进行替换，即`option.replace`是否为`true`进行对应处理，而如果需要替换，主要进行将替换元素上的属性值和模版根元素属性值进行合并，也就是将替换元素上面的属性合并并添加到根节点上面，如果两个上面都有此属性，则进行合并后的作为最终此属性值，如果模板根元素上没有此属性而自定义元素上有，则将其设置到根元素上，即：

```js
options._replacerAttrs = extractAttrs(replacer)
mergeAttrs(el, replacer)
```

在`compile`中，`el = transclude(el, options)`主要是对元素进行处理，将一个简单的自定义标签根据它对应的template模板数据和option的一些配置，进行整合处理，最后返回整理后的元素数据；

## _compile函数之compileRoot 与 compile

前面，说了下vue在`_compile`函数中，首先对el元素进行了处理，主要是处理了自定义标签元素；将自定义标签转化为真实html元素，并对元素属性和真实html根节点属性进行合并；

在这，主要说下对元素根节点的的编译过程，即`var rootLinker = compileRoot(el, options, contextOptions)，compileRoot`会生成一个最终的`linker`函数；而最后通过执行生成的`linker`函数，完成所有编译过程；

而在源码，可以看到还有compile这个方法，也是对元素进行编译，并生成一个最终的linker函数，那这两个有什么区别呢？为什么要分开处理呢？

根据我的理解，`compileRoot`主要对根节点进行编译，在这儿的根节点不仅包括模板中的根节点，也包括自定义的标签；如下组件`<hello></hello>`:

```js
// hello.vue

<template>
  <div class="hello">
    <h1>hello {{ msg }} welcome here</h1>
    <h3 v-if="show" >this is v-if</h3>
  </div>
</template>

// app.vue
<hello class="hello1" :class="{'selected': true}" @click.stop="hello"></hello>
```

通过`compileRoot`主要处理`<hello>`节点和`<div class="hello"></div`>节点；而`compile`主要处理整个元素及元素下面的子节点；也包括已经通过`compileRoo`t处理过的节点，只是根节点如果已经处理，在compile中就不会再进行处理；

那为什么会分开进行处理呢，因为我们在前面说过，对于根节点，它也包含了自定义的标签节点，即上面的`<hello></hello>`，所有就分开进行了处理；

而在具体说明`compileRoot`如何处理之前，我们先要知道一点，在vue中，基本上所有的dom操作都是通过指令(directive)的方式处理的；如dom属性的操作(修改class、style)、事件的添加、数据的添加、节点的生成等；而基本大部分的指令都是通过写在元素属性上面(如v-bind、v-if、v-show、v-for)等；所以在编译过程中，主要是对元素的属性进行提取、根据不同的属性然后生成对应的`Derective`的实例；而在执行最终编译生成的`linker`函数时，也就是对所有生成的指令实例执行`bind`；并对其添加响应式处理，也就是`watcher`;

```js
//  el(虚拟元素，如<hello></hello>)元素上的所有attributes
//  <hello @click.stop="hello" style="color: red" class="hello" :class="{'selected': true}"></hello>
//  ['@click.stop', 'style', 'class', ':class']
var containerAttrs = options._containerAttrs 

// 虚拟元素对应真实html根节点所有attributes
// <div class="hello"> ... </div>
// ['class', '_v-b9ed5d18']
var replacerAttrs = options._replacerAttrs 
 
```

这两个主要保存着根元素的属性列表；包括自定义元素和其对应的模板根元素的属性；而它们在哪儿去提取的呢？就是我们前面说的transclude方法里面

```js
/ 2. container attributes
if (containerAttrs && contextOptions) {
    contextLinkFn = compileDirectives(containerAttrs, contextOptions)
}
// 3. replacer attributes
if (replacerAttrs) {
    replacerLinkFn = compileDirectives(replacerAttrs, options)
}
```

`compileDirective`s主要对传入的`attrs`和`options`，通过正则，对一些属性指令初始化基础信息，并生成对应的处理函数并返回到外面，而最终处理的是

```js
this._directives.push(
    new Directive(descriptor, this, node, host, scope, frag)
)
```

也就是上面说的生成对应的指令实例化对象，并保存在`this._directives`中；

具体`compileDirectives`里面的详细代码，就不细说，这里取出一部分进行说下

```js
// event handlers
// onRE: /^v-on:|^@/ 是否为事件相关属性，如“v-on:click”、"@click"
if (onRE.test(name)) {
    arg = name.replace(onRE, '')
    pushDir('on', publicDirectives.on)
} 
```

这个是主要匹配属性名是否是`v-on:`类型的，也就是事件相关的，如果是，则取出对应的事件名，然后将其进行指令参数初始化，生成一个指令描述对象：

```js
/**
    指令描述对象，以v-bind:href.literal="mylink"为例:
      {
        arg:"href",
        attr:"v-bind:href.literal",
        def:Object,// v-bind指令的定义
        expression:"mylink", // 表达式，如果是插值的话，那主要用到的是下面的interp字段
        filters:undefined
        hasOneTime:undefined
        interp:undefined,// 存放插值token
        modifiers:Object, // literal修饰符的定义
        name:"bind" //指令类型
        raw:"mylink"  //未处理前的原始属性值
      }

    **/
    dirs.push({
      name: dirName,
      attr: rawName,
      raw: rawValue,
      def: def,
      arg: arg,
      modifiers: modifiers,
      // conversion from interpolation strings with one-time token
      // to expression is differed until directive bind time so that we
      // have access to the actual vm context for one-time bindings.
      expression: parsed && parsed.expression,
      filters: parsed && parsed.filters,
      interp: interpTokens,
      hasOneTime: hasOneTimeToken
    })
```

生成描述对象数组之后，通过下面函数去初始化指令实例化对象：

```js
function makeNodeLinkFn (directives) {
  return function nodeLinkFn (vm, el, host, scope, frag) {
    // reverse apply because it's sorted low to high
    var i = directives.length
    while (i--) {
      vm._bindDir(directives[i], el, host, scope, frag)
    }
  }
}

Vue.prototype._bindDir = function (descriptor, node, host, scope, frag) {

    this._directives.push(
      new Directive(descriptor, this, node, host, scope, frag)
    )
    // console.log(new Directive(descriptor, this, node, host, scope, frag))
  }
```

那么，在生成指令数组之后，在哪进行指令的绑定呢？就是下面这儿，在compileRoot返回的最终函数中：

```js
export function compileRoot (el, options, contextOptions) {
 
    // 指令的生成过程
    ......
 
    return function rootLinkFn (vm, el, scope) {
        // link context scope dirs
        var context = vm._context
        var contextDirs
        if (context && contextLinkFn) {
          contextDirs = linkAndCapture(function () {
            contextLinkFn(context, el, null, scope)
          }, context)
        }
    
        // link self
        var selfDirs = linkAndCapture(function () {
          if (replacerLinkFn) replacerLinkFn(vm, el)
        }, vm)
    
    
        // return the unlink function that tearsdown context
        // container directives.
        return makeUnlinkFn(vm, selfDirs, context, contextDirs)
      }
}


// link函数的执行过程会生成新的Directive实例,push到_directives数组中
// 而这些_directives并没有建立对应的watcher,watcher也没有收集依赖,
// 一切都还处于初始阶段,因此capture阶段需要找到这些新添加的directive,
// 依次执行_bind,在_bind里会进行watcher生成,执行指令的bind和update,完成响应式构建
 function linkAndCapture (linker, vm) {
  /* istanbul ignore if */
  if (process.env.NODE_ENV === 'production') {
    // reset directives before every capture in production
    // mode, so that when unlinking we don't need to splice
    // them out (which turns out to be a perf hit).
    // they are kept in development mode because they are
    // useful for Vue's own tests.
    vm._directives = []
  }
  // 先记录下数组里原先有多少元素,他们都是已经执行过_bind的,我们只_bind新添加的directive
  var originalDirCount = vm._directives.length
  // 在生成的linker中，会对元素的属性进行指令化处理，并保存到_directives中
  linker()
  // slice出新添加的指令们
  var dirs = vm._directives.slice(originalDirCount)
  // 根据 priority 进行排序
  // 对指令进行优先级排序,使得后面指令的bind过程是按优先级从高到低进行的
  sortDirectives(dirs)
  for (var i = 0, l = dirs.length; i < l; i++) {
    dirs[i]._bind()
  }
  return dirs
}
```

也就是通过这儿`dirs[i]._bind()`进行绑定；也就是最终`compileRoot`生成的最终函数中，当执行此函数，首先会执行`linkAndCapture`, 而这儿会先去执行传入的函数，也就是`contextLinkFn`和`replacerLinkFn`，通过上面两个方法，生成指令数组后，再执行循环，并进行_bind()处理；

而对于_bind()具体干了什么，会在后面详细进行说明；其实主要通过指令对元素进行初始化处理和对需要双向绑定的进行绑定处理；

## 指令－directive

在上面主要谈了下vue整个compile编译过程，其实最主要任务就是提取节点属性、根据属性创建成对应的指令directive实例并保存到`this.directives`数组中，并在执行生成的`linker`的时候，将`this.directives`中新的指令进行初始化绑定`_bind`；那这儿主要谈下directive相关的知识；

在前面说过，自定义组件的渲染其实也是通过指令的方式完成的，那这儿就以组件渲染过程来进行说明，如下组件：

```js
// hello.vue
<template>
  <div class="hello">
    <h1>hello, welcome here</h1>
  </div>
</template>

// app.vue
<hello @click.stop="hello" style="color: red" class="hello1" :class="{'selected': true}"></hello>
```

对于自定义组件的整个编译过程，在前面已经说过了，在这就不说了，主要说下如何通过指令将真正的html添加到对应的文档中；

首先，`new directive`其实主要是对指令进行初始化配置，就不多谈；

主要说下其中`this._bind`方法，它是指令初始化后绑定到对应元素的方法；

```js
// remove attribute
  if (
    // 只要不是cloak指令那就从dom的attribute里移除
    // 是cloak指令但是已经编译和link完成了的话,那也还是可以移除的
    // 如移出":class"、":style"等
    (name !== 'cloak' || this.vm._isCompiled) &&
    this.el && this.el.removeAttribute
  ) {
    var attr = descriptor.attr || ('v-' + name)
    this.el.removeAttribute(attr)
  }
```

这儿主要移出元素上添加的自定义指令，如v-if、v-show等；所以当我们使用控制台去查看dom元素时，其实是看不到写在代码中的自定义指令属性；但是不包括v-cloak，因为这个在css中需要使用;

```js
// html
<div v-cloak>
  {{ message }}
</div>

// css
[v-cloak] {
  display: none;
}
  // copy def properties
  // 不采用原型链继承,而是直接extend定义对象到this上，来扩展Directive实例
  // 将不同指令一些特殊的函数或熟悉合并到实例化的directive里
  var def = descriptor.def
  if (typeof def === 'function') {
    this.update = def
  } else {
    extend(this, def)
  }
```

这儿主要说下extend(this, def)，descriptor主要是指令的一些描述信息：

```js
//指令描述对象，以v-bind:href.literal="mylink"为例:
      {
        arg:"href",
        attr:"v-bind:href.literal",
        def:Object,// v-bind指令的定义
        expression:"mylink", // 表达式，如果是插值的话，那主要用到的是下面的interp字段
        filters:undefined
        hasOneTime:undefined
        interp:undefined,// 存放插值token
        modifiers:Object, // literal修饰符的定义
        name:"bind" //指令类型
        raw:"mylink"  //未处理前的原始属性值
      }
```

而，def其实就是指令对应的配置信息；也就是我们在写指令时配置的数据，如下指令：

```js
<template>
  <div class="hello">
    <h1 v-demo="demo">hello {{ msg }} welcome here</h1>
    <!-- <h3 v-if="show" >this is v-if</h3> -->
  </div>
</template>

<script>
export default {
  created() {
    setInterval(()=> {
      this.demo += 1;
    }, 1000)
  },
  data () {
    return {
      msg: 'Hello World!',
      show: false,
      demo: 1
    }
  },
  directives: {
    demo: {
      bind: function() {
        this.el.setAttribute('style', 'color: green');
      },
      update: function(value) {
        if(value % 2) {
          this.el.setAttribute('style', 'color: green');
        } else {
          this.el.setAttribute('style', 'color: red');
        }
      }
    }
  }
}
</script>
```

它对应的descriptor就是：

```js
descriptor = {
    arg: undefined,
    attr: "v-demo",
    def: {
        bind: function() {}, // 上面定义的bind
        update: function() {} // 上面定义的update
    },
    expression:"demo",
    filters: undefined,
    modifiers: {},
    name: 'demo'
}
```

接着上面的，使用`extend(this, def)`就将`def`中定义的方法或属性就复制到实例化指令对象上面；好供后面使用

```js
// initial bind
  if (this.bind) {
    this.bind()
  }
  //这就是执行上面刚刚保存的bind方法；当执行此方法时，上面就会执行
  this.el.setAttribute('style', 'color: green');
```

```js
// 下面这些判断是因为许多指令比如slot component之类的并不是响应式的,
  // 他们只需要在bind里处理好dom的分发和编译/link即可然后他们的使命就结束了,生成watcher和收集依赖等步骤根本没有
  // 所以根本不用执行下面的处理
if (this.literal) {

} else if (
    (this.expression || this.modifiers) &&
    (this.update || this.twoWay) &&
    !this._checkStatement()
) {

var watcher = this._watcher = new Watcher(
      this.vm,
      this.expression,
      this._update, // callback
      {
        filters: this.filters,
        twoWay: this.twoWay,
        deep: this.deep,
        preProcess: preProcess,
        postProcess: postProcess,
        scope: this._scope
      }
    )
}
```

而这儿就是对需要添加双向绑定的指令添加`watcher`；对应watcher后面再进行详细说明; 可以从上看出，传入了this._update方法，其实也就是当数据变化时，就会执行`this._update`方法，而：

```js
var dir = this
if (this.update) {
      // 处理一下原本的update函数,加入lock判断
      this._update = function (val, oldVal) {
        if (!dir._locked) {
          dir.update(val, oldVal)
        }
      }
} else {
      this._update = function() {}
}
```

其实也就是执行上面的`descriptor.def.update`方法，所以当值变化时，会触发我们自定义指令时定义的update方法，而发生颜色变化；

这是指令最主要的代码部分；其他的如下：

```js
/ 获取指令的参数, 对于一些指令, 指令的元素上可能存在其他的attr来作为指令运行的参数
  // 比如v-for指令,那么元素上的attr: track-by="..." 就是参数
  // 比如组件指令,那么元素上可能写了transition-mode="out-in", 诸如此类
this._setupParams();

// 当一个指令需要销毁时，对其进行销毁处理；此时，如果定义了unbind方法，也会在此刻调用
this._teardown();
而对于每个指令的处理原理，可以看其对应源码；如v-show源码：

// src/directives/public/show.js

import { getAttr, inDoc } from '../../util/index'
import { applyTransition } from '../../transition/index'

export default {

  bind () {
    // check else block
    var next = this.el.nextElementSibling
    if (next && getAttr(next, 'v-else') !== null) {
      this.elseEl = next
    }
  },

  update (value) {
    this.apply(this.el, value)
    if (this.elseEl) {
      this.apply(this.elseEl, !value)
    }
  },

  apply (el, value) {
    if (inDoc(el)) {
      applyTransition(el, value ? 1 : -1, toggle, this.vm)
    } else {
      toggle()
    }
    function toggle () {
      el.style.display = value ? '' : 'none'
    }
  }
}
```

可以从上面看出在初始化页面绑定时，主要获取后面兄弟元素是否使用`v-else`; 如果使用，将元素保存到`this.elseEl`中，而当值变化执行`update`时，主要执行了`this.apply`；而最终只是执行了下面代码：

```js
el.style.display = value ? '' : 'none'
```