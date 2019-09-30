# Props - 白话版

开篇之前，我提出三个问题

1. 父组件 怎么传值给 子组件的 props

2. 子组件如何读取props

3. 父组件 data 更新，子组件的props 如何更新



今天我们带着三个问题去开始我们的讲解

明白这三个问题，那么相信你也就理解了 props 的工作原理





场景设置


现在我们有一个这样的 根组件 A 和 他的 子组件 testb

根组件A 会 把 parentName 传给 子组件 testb 的 props

根组件A 也是 组件testb 的 父组件

```html
<div class="a" >
    <testb :child-name="parentName" ></testb>
</div>
```
```js
new Vue({    
    el:".a",        
    name:"A",    
    components:{        
        testb:{            
            props:{                
                childName:""
            },            
        template: '<p>父组件传入的 props 的值 {{childName}}</p>',
        }
    },
    data(){        
        return {            
            parentName:"我是父组件"
        }
    },
})
```

按照上面的例子，开始我们的问题解析


**父组件怎么传值给子组件的 props**


这部分内容会比较多，但是这部分内容是 props 的重中之重，必须理解好吧





1. props 传值的设置



根据上面的场景设置，testb 是一个子组件，接收一个 props（child-name）

然后 根组件 A 把 自身的 parentName 绑定到 子组件的属性 child-name 上

```html
<div class="a">
    <testb :child-name="parentName"></testb>
</div>
```

2、props 父传子前


父组件的模板 会被解析成一个 模板渲染函数

```js
(function() {    

    with(this){  

        return _c('div',{staticClass:"a"},[

            _c('testb',{attrs:{"child-name":parentName}})

        ],1)

    }

})
```

这段代码需要解释下

虽然想不涉及源码，但是这段代码对我们理解很有帮助，而且不难，所以决定放上来

1. _c 是渲染组件的函数，_c('testb') 表示渲染 testb 这个子组件

2. 因为 with 的作用是，绑定大括号内代码的 变量访问作用域

3. 这是一个匿名自执行函数，会在后面执行


3. props 开始赋值


之后，模板函数会被执行，执行时会绑定 父组件为作用域

所以渲染函数内部所有的变量，都会从父组件对象 上去获取

绑定了父作用域之后， parentName 自然会从父组件获取，类似这样

```json
{ attrs: { child-name: parentVm.parentName } }
```


函数执行了，内部的` _c('testb')` 第一个执行，然后传入了 赋值后的 `attrs`

父组件赋值之后的 attrs 就是下面这样

```json
{ attrs: { child-name: "我是父组件" } }
```

此时，父组件就正式 利用 props 把 parentName 传给了 子组件的props child-name


4. 子组件保存 props

```js
_c('testb',{attrs:{"child-name":parentName}})
```


子组件拿到父组件赋值过后的 attr

而 attrs 包含 普通属性 和 props，所以需要 筛选出 props，然后保存起来





5. 子组件 设置响应式 props

props 会被 保存到 实例的_props 中，并且 会逐一复制到 实例上，并且每一个属性会被设置为响应式的

![m2][./m2.jpg]



你看到的，每一个 实例都会有 一个 _props 的同时，也会把属性直接放在 实例上。



**组件怎么读取 props**


通过上面的问题，我们知道了 子组件保存了 父组件 传入 的数据

prop 的数据会被 逐一复制到 vm对象上（子组件的实例 this） 上

但是复制的时候，会对每个属性，同时设置 get 和 set 函数，进行 访问转接 和 赋值转接



下面是我简化了源码的一段代码，了解一下

```js
Object.defineProperty(vm, key, {    

    get() {        

        return this._props[key]

    },    

    set(val) {        

        this._props[key] = val

    }
});
```

我以 props 其中一个 属性 childName 为例好吧

```js
Object.defineProperty(childVm, childName, {    

    get() {        

        return this._props.childName

    },    

    set(val) {        

        this._props.childName = val

    }
});
```

访问转接

你访问 props 其中一个值 `vm.childName`，其实访问的是` vm._props.childName`


**赋值转接**

你赋值 vm.childName= 5 ，其实是赋值 vm._props.childName= 5

但是你直接在这里给 props 赋值，你是不会影响到 父组件的data 的好吧，两个东西完全没有关系

就像你老爸给钱你用，你怎么用，对老爸都没有影响




**父组件数据变化，子组件props如何更新**


看过我上一篇文章的都知道

每一个实例都会存在 一个 专属watcher



这个watcher 的作用

1. 用于实例自己更新视图

2. 用于给 依赖的属性保存，然后属性变化的时候，通知实例更新




以 parentName 为例，讲解更新，parentName 是 父组件的 data，然后传给子组件的props



parentName 会收集 父组件的 watcher

在 父组件渲染函数中

```js
(function() {    

    with(this){  

        return _c('div',{staticClass:"a"},[

            _c('testb',{attrs:{"child-name":parentName}})

        ],1)

    }

})
```

TIP

因为 Vue 会对组件的渲染函数进行缓存，所以更新的时候，不需要重新解析，直接读取缓存，会加快渲染速度


然后渲染函数执行，开启新一轮的 props 赋值操作，回到了第一个问题，如果不记得，可以回去看下


**总结**

1. 父组件 data 的值 和 子组件的 props 一般是没有任何联系的，更改 props 不影响父组件 data，但是如果传入的是 对象，那么修改对象，是会影响父组件的，因为数据是原样传入的，所以修改对象，两个地方都会影响

2. props 也是响应式的，跟 data 本质 差不多

3. props 会访问转接，赋值转接 ，其实操作的是 vm._props 的属性

