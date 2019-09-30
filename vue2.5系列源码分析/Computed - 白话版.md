# Computed - 白话版

今天我们用白话文解读 computed 的工作原理，轻松快速理解 computed 内部工作原理。因为如果你不懂原理，有时候做项目，碰到奇怪的问题，真的不知道怎么回事

要理解 computed 的工作原理，只需要理解下面三个问题

1. computed 也是响应式的

2. computed 如何控制缓存

3. 依赖的 data 改变了，computed 如何更新

在这里，我先告诉你，computed 其实是一个 月老，专门牵线

**computed 也是响应式的**

简单地说

你给 computed 设置的 get 和 set 函数，会跟 Object.defineProperty 关联起来

所以 Vue 能捕捉到 读取computed 和 赋值computed 的操作

读取computed 时，会执行你设置的 get 函数，但是并没有这么简单，因为还有一层缓存的操作

赋值 computed 时，会执行你设置的 set 函数，这个就比较简单，会直接把 set 赋值给 Object.defineProperty - set


**Computed 如何控制缓存**


我们都知道，computed 是有缓存的，官方已经说明

"计算属性是基于它们的依赖进行缓存的。计算属性只有在它的相关依赖发生改变时才会重新求值"

"我们为什么需要缓存？假设我们有一个性能开销比较大的计算属性 A，它需要遍历一个巨大的数组并做大量的计算。然后我们可能有其他的计算属性依赖于 A 。如果没有缓存，我们将不可避免的多次执行 A 的 getter"

现在我们要开始讲解，Computed 是如何判断是否使用缓存的

首先 computed 计算后，会把计算得到的值保存到一个变量中。读取 computed 时便直接返回这个变量。

当使用缓存时，就直接返回这个变量。当 computed 更新时，就会重新赋值更新这个变量

TIP:computed 计算就是调用 你设置的 get 函数，然后得到返回值

computed 控制缓存的重要一点是 【脏数据标志位 dirty】，dirty 是 watcher 的一个属性

当 dirty 为 true 时，读取 computed 会重新计算

当 dirty 为 false 时，读取 computed 会使用缓存

1. 一开始每个 computed 新建自己的watcher时，会设置 watcher.dirty = true，以便于computed 被使用时，会计算得到值

2 .当依赖的数据变化了，通知 computed 时，会设置 watcher.dirty = true，以便于其他地方重新渲染，从而重新读取 computed 时，此时 computed 重新计算

3. computed 计算完成之后，会设置 watcher.dirty = false，以便于其他地方再次读取时，使用缓存，免于计算


**依赖的data变化，computed如何更新**


首先，data 和 computed 本质上差不多，都是数据，都需要被使用。



场景设置


现在 页面A 引用了 computed B，computed B 依赖了 data C

像是这样，A->B->C 的依赖顺序

个人假想更新步骤

一开始我的想法是，data C 开始变化后.......

1. 通知 computed B 更新，然后 computed B 开始重新计算

2. 接着 computed B 通知 页面A更新，然后重新读取 computed

一条链式的操作？ C -》 B -》 A 这样的执行顺序吗？

答案：不是

其实真正的流程是，data C 开始变化后.......

1. 通知 computed B watcher 更新，其实只会重置 脏数据标志位 dirty =true，不会计算值

2. 通知 页面 A watcher 进行更新渲染，进而重新读取 computed B ，然后 computed B 开始重新计算


?为什么 data C 能通知 页面 A
data C 的依赖收集器会同时收集到 computed B 和 页面 A 的 watcher

?为什么 data C 能收集到 页面A 的watcher
这就是 Vue 设计的巧妙之处了，也就是我开始讲的，computed 其实是一个 月老

在 页面 A 在读取 computed B 的时候，趁机把 页面A 介绍给 data C ，于是 页面A watcher 和 data C 间接牵在了一起，于是 data C 就会收集到 页面A watcher

至于怎么牵在一起，白话版不会多说，不浪费大家的脑力

?所以computed 如何更新
被依赖通知更新后，重置 脏数据标志位 ，页面读取 computed 时再更新值


**总结**

1c. omputed 通过 watcher.dirty 控制是否读取缓存

2. computed 会让 【data依赖】 收集到 【依赖computed的watcher】，从而 data 变化时，会同时通知 computed 和 依赖computed的地方