# Methods - 源码版

**methods 怎么使用实例访问？**

methods 简单到什么程度呢，估计你用脚都能想得到

那么现在的问题怎么解答

"遍历 methods 这个对象，然后逐个复制到 实例上？"

没错，你猜对了，的确是逐个复制，简化源码是这么写的

```js
function initMethods(vm, methods) {    
    for (var key in methods) {
        vm[key] = 
            methods[key] == null ? 
            noop : 
            bind(methods[key], vm);
    }
}
```

**methods 如何固定作用域的**

其实 methods 的固定作用域的唯一重点就是 bind 了，bind 相信大家也都用过

bind 是固定函数作用域的，说实在的，之前我还真不太用 bind 这个东西，就知道可以绑定作用域，我觉得我会 call 和 apply 就行了，现在后悔了，发现用处太大了

调用 bind 会 返回 绑定作用域的函数，而这个函数直接执行时，作用域就已经是固定了的

不像 call 和 apply 这种一次性绑定作用域的 妖艳贱货不同，这个货一次绑定，终身受益啊

Vue 使用了 bind 去绑定 methods 方法，显然是为了避免有些刁民会错误调用而报错，索性直接固定作用域，而且考虑到 bind 有的浏览器不支持

于是写了一个兼容方法，意思大概是这样

1. bind 函数需要传入作用域 context 和 函数 A

2. 然后 闭包保存 这个 context，返回一个新函数 B

3. B 执行的时候，使用 call 方法 直接绑定 函数A 的作用域为 闭包保存的 context

下面是 Vue bind 兼容的源码，我建议大家把这个方法保存下来，尤大的东西，还不瞬间保存？？

```js
function polyfillBind(fn, ctx) {    
    function boundFn(a) {        
        var l = arguments.length;        
        return l ?
            (
                l > 1 ?
                fn.apply(ctx, arguments) :
                fn.call(ctx, a)
            ):
            fn.call(ctx)
    }
    boundFn._length = fn.length;    
    return boundFn
}

function nativeBind(fn, ctx) {    
    return fn.bind(ctx)

}

var bind = Function.prototype.bind ?
    nativeBind :
    polyfillBind;
```

Vue 使用 bind 之后，对我们有什么好处？

我们调用 实例的方法，不再每次都使用 实例去调用了

这样子，有什么好处呢，当多次调用方法的话，使用局部变量保存之后，直接访问局部变量可以减少作用域链的检索

```js
methods:{
    test(){},
    getName(){        

        // 本来是这样，多次使用实例调用
        this.test() 
        this.test()    
       
        // 现在局部变量保存，这是优化点
        var test = this.test
        test()
        test()
    }
}
```

bind 绑定作用域强到无法改变


举栗子

```js
function a(){    
    console.log(this)
}

var b={ name:1 }
var c = a.bind(b)
var d={
    c:c,    
    woqu:3434333
}
c()
d.c()
```

c 和 d.c 执行打印下面的结果 在这里插入图片描述 尽管使用 d 调用，作用域仍然是 b，简直不要太强啊

讲到这里，methods 的精髓，就是 bind 了，很有用哦，这个东西，大家务必要记住 在这里插入图片描述

<br> <br>

**总结**

1. methods 会逐个复制到 实例上

2. methods 方法会使用 bind 绑定实例作用域，确保作用域不被修改