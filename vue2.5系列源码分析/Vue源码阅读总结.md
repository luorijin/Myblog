# Vue源码阅读总结

## 阅读源码准备了什么

1. 掌握 Vue 所有API
我把 Vue 的所有 API 都详细研究使用过了一遍，而且尽量在项目中都有使用，让自己有深一点的体会

而且我对着官方文档，一个个做了详细的笔记，而且联想过了使用场景。

2. JavaScript 扎实基础
幸好自己之前花了大力气去给自己打基础，让自己现在的 JavaScript 基础还算不错。

逼着自己把很多本 JavaScript 书都看完了，并且做了详细笔记。像是【 JavaScript易维护】【JavaScript性能 】，【JavaScript 高级程序设计】【巴菲特给股东的信】看了两遍，说不上精通，也算是还可以？

3. 看完 JavaScript 设计模式
光是 JavaScript 设计模式 这本书 我就看了一年半，不能说自己把所有设计模式都掌握了，掌握了大部分吧，设计模式港真真的很有趣，不然我也不会决心学

在这里推荐 张容铭的 【JavaScript设计模式】，书讲得非常透彻和详细，我是从完全不懂开始看的

也经常使用一部分，我一直以设计模式为我的项目基构。就是 能用设计模式的地方，我都尽量使用设计模式。

设计模式看起来就像是 剑客 的剑谱，有招有式，连人家武侠剧发功的时候都知道 喊出 招式的名字... 降龙十八掌！！！！

野路子难登大雅之堂，主要是不好看啊，代码为了好维护，易扩展

## Vue 源码的简短的总结

1. 封装了很多常用的函数！

为了 复用 且 易维护

### 常用的类型判断、 类型转换 、数据格式转换（数组转对象）.....

```js
function isObject(obj) {    return obj !== null && typeof obj === 'object'}
function isUndef(v) {    return v === undefined || v === null}
function isDef(v) {    return v !== undefined && v !== null}
function toString(val) {    
    return val == null ?    '' :    
    typeof val === 'object' ?    
    JSON.stringify(val, null, 2) :    String(val)
}
function toObject(arr) {    
    var res = {};    
    for (var i = 0; i < arr.length; i++) {        
        if (arr[i]) {
            extend(res, arr[i]);
        }
    }    return res
}
....
```

### 节点操作兼容函数

addClass ,removeClass，createElement，appendChild，removeChild

```js
function addClass(el, cls) {    
    if (!cls || !(cls = cls.trim())) return
    if (el.classList) {        
        if (cls.indexOf(' ') > -1) {
            cls.split(/\s+/).forEach(function(c) { return el.classList.add(c); });
        } else {
            el.classList.add(cls);
        }

    } else {        
       var cur = " " + (el.getAttribute('class') || '') + " ";        
       if (cur.indexOf(' ' + cls + ' ') < 0) {
            el.setAttribute('class', (cur + cls).trim());
       }
    }
}
....
```

2. 真的用了很多设计模式

就我看到的设计模式就有

> 观察者模式、状态模式、节流模式、 参与者模式、备忘录模式、单例模式 装饰者模式、组合继承模式、链模式.........

我怀疑 Vue 把所有的设计模式都用完了.... 真的..... 如果你不懂设计模式

你真不会领悟到他这么写的精髓

我就选 Vue 常用的一个设计模式来讲

【参与者模式】

Vue 封装的很多函数都是用了 参与者模式，也可以叫做柯里化

先来简单解释下 参与者模式

1. 保存第一次调用 传入参数

2. 返回定制函数，函数内使用 参数

简单实现像这样

```js
function add(a){    
    return function(b){ return a+b }
}
// 为了定制函数，把第一次调用时的参数闭包保存
add5 = add(5)var result  = add5(9)
```

Vue其中一个 使用柯里化 的封装函数

makeMap

创建 对象 map，返回函数，用于后面查找 某个东西是否存在 map 中

```js
function makeMap( str,  expectsLowerCase ) {    
    var map = Object.create(null);   
    var list = str.split(',');    
    for (var i = 0; i < list.length; i++) {
        map[list[i]] = true;
    }    
    return expectsLowerCase ?        
        function(val) { return map[val.toLowerCase()]; } :        
        function(val) { return map[val]; }
}
        
// 应用
var isUnaryTag = makeMap(   
 'area,base,br,col,embed,frame,hr,img,input,isindex,keygen,' +  
 'link,meta,param,source,track,wbr');
 
// 查找 area 标签是否存在 上面保存过的 字符串中
isUnaryTag('area')
```

3. 使用很多闭包！

据我看过的地方

1. 解析组件模板 使用了闭包作为缓存，为了重复解析

2. cached 函数，一个专门使用闭包 为缓存的函数

3. 上面所讲到 的 柯里化所有涉及的函数，makeMap,parthPath,

4. createPatchFunction 当属篇幅最大的使用闭包的函数了，把一堆函数作为闭包，然后返回 一个函数。他最大的作用是 比较更新DOM 节点

4. 使用很多标志位

Vue 常用标志位来

1. 表明是否已经做了某件事

_isMounted：dom 是否已经挂载

_isDestroyed ：组件是否已经摧毁

pending：表明更新回调的 setTimeout 已经执行

waiting：是否已经初始化更新队列，在等待新的成员进入对垒

flushing：更新队列是否已经开始逐个更新成员

......

2. 指明当前东西的身份

isStatic：是否是静态节点

isComment：是否是注释节点

isCloned：是否是克隆节点

isOnce：是否有v-once 指令（如果有当前指令，会跳过编译）

_isComponent：是否是组件

.....

多用标志位，控制流程，替代多余的判断（直接判断标志位来确认身份，不用做太多的判断），减少开销

上面那些变量，大家没看源码，可能有些懵逼，没关系，就当先知道有这个东西就好了

## Vue 源码分几步走

### Vue 的主体内容

1、依赖收集 2、依赖更新 3、Virtual DOM ，dom 节点 生成虚拟Vnode 节点 4、Compile， 模板编译 5、Diff、Patch， 节点比较更新 6、NextTick ，延迟执行回调 7、Render， 渲染机制 8、LifeCircle ，生命周期 9、Model ，双向绑定 10、Event ，事件机制

### Vue 组件选项

1、computed 2、filter 3、mixin 4、directive 5、slot 6、props 7、watch

我就大约以这些为我的学习目标进行 源码阅读的，每一块都是一个非常大的内容，每一块内容都不是几天能看完的，有时候还需要一点灵感。当然还有很多内容，但是我的目标也并不是全部，一字不漏读完，我要的是他的精髓即可，或许等我掌握了这些，再去开发其他的内容，这样或许更简单