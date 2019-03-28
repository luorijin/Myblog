# vue1.0源码之v-for

## 原理

`v-for`指令绑定的元素，在编译时会根据数组的长度生成多个组件，每个组件有自己`scope`作用域，`scope`为继承自当前`vm`的对象;同一段模板，查找模板中指令的`compile`过程是不变的，因此只用执行一次，解析出整个模板中的所有指令描述符。这些指令描述符被闭包在`linker`中。在你给linker函数传递一段通过cloneNode复制出的模板DOM实例，并传入这段模板需要绑定的数据（scope或者vm），那么linker便会将对应的指令描述符生成真正的指令，绑定在你传进来的DOM实例上，同时，每个指令都会生成一个watcher，而watcher则会订阅到你传入的数据上。至此，我们看到了一个完整的响应式的DOM的构建得以完成。而为什么编译阶段只是编译生成指令描述符，而不是建立指令实例也得以解释：每个指令实例是要绑定到具体的DOM上的，而具体的DOM在linker的执行阶段才得到的，因此，compile只是先生成指令描述符，在linker阶段得到DOM之后才为DOM生成指令，指令又建立watcher，watcher又绑定数据

比如这么一段模板:`template:<li v-for="element in array">{{element}}</li>`

那么`v-for`就要负责为`array`中的每个element创建响应式的li元素。同时，每当array中的element有变化时，就需要创建/删除新的响应式li元素。因此，上述过程中，必然要反复执行`linker`。对此，Vue抽象出`FragmentFactory`和`Fragment`的两个类(Fragment不是我们常用的document fragment)。

一个v-for指令有一个`FragmentFactory`实例，在`bind`阶段创建，`FragmentFactory`创建过程中会为`v-for`中的元素（也就是ul中的li）执行`compile`，生成l`inker`，存放在`FragmentFactory`实例的linker属性上。

而在v-for指令的update阶段会为数组的每个元素创建scope，scope为继承自当前vm的对象。并在这个对象上存放数组元素的具体内容。

FragmentFactory实例创建Fragment：

```js
FragmentFactory.prototype.create = function (host, scope, parentFrag) {
  var frag = cloneNode(this.template)
  return new Fragment(this.linker, this.vm, frag, host, scope, parentFrag)
}

// 复制一份模板，然后将linker和scope，传入，Fragment会执行以scop为参数执行linker，
// 并且会在this上记录对应的DOM、scope
```
##  bind

上述过程是`v-for`指令的初始化阶段，现在一堆绑定到具体数组元素的响应式DOM已经构建完成，v-for的使命已经完成一半，另一半则是在数组变动时，使用`diff`对`Fragment`进行操作，删除和新建响应式DOM。

我们先来结合具体代码看看这个初始化的过程。

```js
    bind () {
    // support "item in/of items" syntax
    var inMatch = this.expression.match(/(.*) (?:in|of) (.*)/)
    if (inMatch) {
      var itMatch = inMatch[1].match(/\((.*),(.*)\)/)
      if (itMatch) {
        // v-for="{k,v} in array"的形式,iterator就是'k',别名为v
        this.iterator = itMatch[1].trim()
        this.alias = itMatch[2].trim()
      } else {
        // v-for="ele in array"的形式,别名为ele
        this.alias = inMatch[1].trim()
      }
      this.expression = inMatch[2]
    }

    if (!this.alias) {
      process.env.NODE_ENV !== 'production' && warn(
        'Invalid v-for expression "' + this.descriptor.raw + '": ' +
        'alias is required.',
        this.vm
      )
      return
    }

    // uid as a cache identifier
    // 这个id是每个v-for指令实例的id
    this.id = '__v-for__' + (++uid)

    // check if this is an option list,
    // so that we know if we need to update the <select>'s
    // v-model when the option list has changed.
    // because v-model has a lower priority than v-for,
    // the v-model is not bound here yet, so we have to
    // retrive it in the actual updateModel() function.
    var tag = this.el.tagName
    this.isOption =
      (tag === 'OPTION' || tag === 'OPTGROUP') &&
      this.el.parentNode.tagName === 'SELECT'

    // setup anchor nodes
    // 生成anchor记录v-for内容的起始和结束,因为v-for会为每个数据创建DOM,因此需要标记这些DOM的边界
    this.start = createAnchor('v-for-start')
    this.end = createAnchor('v-for-end')
    replace(this.el, this.end)
    before(this.start, this.end)

    // cache
    this.cache = Object.create(null)

    // fragment factory
    this.factory = new FragmentFactory(this.vm, this.el)
  },
```

bind很简单，解析了一下`v-for`表达式，并生成相关`anchor`，最后执行的`new FragmentFactory(this.vm, this.el)`是关键。

```js
export default function FragmentFactory (vm, el) {
  this.vm = vm
  var template
  var isString = typeof el === 'string'
  if (isString || isTemplate(el) && !el.hasAttribute('v-if')) {
    template = parseTemplate(el, true)
  } else {
    template = document.createDocumentFragment()
    template.appendChild(el)
  }
  this.template = template
  linker = compile(template, vm.$options, true)
  // linker存储在了FragmentFactory实例上,因此每次让FragmentFactory产出Fragment的过程,
  // 就是传入复制的DOM和scope来执行linker的过程
  this.linker = linker
}
```

这里，我们看到了前文所说的`v-for`执行`compile`生成`linker`。

同时，在主线文章中我们说过指令的创建阶段执行完bind后，会以具体表达式的值执行指令的`update`，`v-fo`r的`update`主要过程就是执行`diff(data)`，对于初始化阶段，`diff`的工作就是为遍历每个数据，将数据传入v-for的`create`方法中，生成`scope`，并使用`FragmentFactory`创建出`Fragment`，从而将数据转化为包含了数据、DOM、DOM移动方法的Fragment.

## create

```js
    create (value, alias, index, key) {
    var host = this._host
    // create iteration scope
    // 因为存在多重v-for嵌套的情况,所以有限继承v-for指令的this._scope
    var parentScope = this._scope || this.vm
    // scope继承自上级scope或vm
    var scope = Object.create(parentScope)
    // make sure point $parent to parent scope
    scope.$parent = parentScope
    // for two-way binding on alias
    scope.$forContext = this
    // define scope properties
    // important: define the scope alias without forced conversion
    // so that frozen data structures remain non-reactive.
    // 比如v-for="element in arr"
    // 那么就要实现scope['element'] = arr中具体的元素
    // 但是只需要设置element属性响应式的,并不用去把`arr中具体的元素`改造成响应式的
    // 因为最开始Vue启动时,就已经把数据设置为响应式的,此处不用多次一举
    // 此外有的数据可能被设置为frozen的,因此我们依然要保留其为frozen,所以要在此处withoutConversion
    withoutConversion(() => {
      defineReactive(scope, alias, value)
    })
    defineReactive(scope, '$index', index)
    if (key) {
      defineReactive(scope, '$key', key)
    } else if (scope.$key) {
      // avoid accidental fallback
      def(scope, '$key', null)
    }
    if (this.iterator) {
      defineReactive(scope, this.iterator, key !== null ? key : index)
    }
    // 创造fragment,这里执行了linker,生成了一个响应式的DOM
    // 完成了指令描述符到真正指令的生成,并为指令完成watcher的创建,watcher也监听到了scope对应属性上
    var frag = this.factory.create(host, scope, this._frag)
    frag.forId = this.id
    // 缓存Frag
    this.cacheFrag(value, frag, index, key)
    return frag
  },
```

reate方法完成了Fragment的真正创建，并将Fragment存进了缓存当中