## es6 promise实现

> Promise 对象用于延迟(deferred) 计算和异步(asynchronous )计算。一个Promise对象代表着一个还未完成，但预期将来会完成的操作。Promise 对象是一个返回值的代理，这个返回值在promise对象创建时未必已知。它允许你为异步操作的成功或失败指定处理方法。 这使得异步方法可以像同步方法那样返回值：异步方法会返回一个包含了原返回值的 promise 对象来替代原返回值

1. 对象的状态不受外界影响。Promise对象代表一个异步操作，有三种状态：pending（进行中）、fulfilled（已成功）和rejected（已失败）。只有异步操作的结果，可以决定当前是哪一种状态，任何其他操作都无法改变这个状态

2. 一旦状态改变，就不会再变，任何时候都可以得到这个结果。Promise对象的状态改变，只有两种可能：从pending变为fulfilled和从pending变为rejected。只要这两种情况发生，状态就凝固了，不会再变了，会一直保持这个结果，这时就称为 resolved（已定型）。如果改变已经发生了，你再对Promise对象添加回调函数，也会立即得到这个结果。这与事件（Event）完全不同，事件的特点是，如果你错过了它，再去监听，是得不到结果的


## 解决了什么问题及怎么使用

```js
// 一个简单的示例 执行一个动画A，执行完之后再去执行另一个动画B
setTimeout(function(){
    //A动画
    console.log('A');
    setTimeout(function() {
        //B动画
        console.log('B');
    },300)
},300);
// 这里只有两个动画，如果有更多呢，就会看到一堆函数缩进
```
不难想象，如果依次有很多个动画，就会出现多重嵌套。代码不是纵向发展，而是横向发展，很快就会乱成一团，无法管理。

Promise 对象就是为了解决这个问题而提出的。它不是新的语法功能，而是一种新的写法，允许将回调函数的嵌套，改成链式调用。 

浏览器实现方式：可以在支持Promise的版本上运行

```js
var p = new Promise(function (resolve, reject) {
    setTimeout(function () {
        // A动画
        console.log('A');
        resolve();
    }, 300);
});

p.then(function () {
    setTimeout(function () {
        // B动画
        console.log('B');
    }, 300);
});
```

## promise原理

其实，`promise`就是三个状态。利用`观察者模式`的编程思想，只需要通过特定书写方式注册对应状态的事件处理函数，然后更新状态，调用注册过的处理函数即可。 

这个特定方式就是`then，done，fail，always…`等方法，更新状态就是`resolve、reject`方法。

```js
/**
 * Promise类实现原理
 * 构造函数传入一个function，有两个参数，resolve：成功回调; reject：失败回调
 * state: 状态存储 [PENDING-进行中 RESOLVED-成功 REJECTED-失败]
 * doneList: 成功处理函数列表
 * failList: 失败处理函数列表
 * done: 注册成功处理函数
 * fail: 注册失败处理函数
 * then: 同时注册成功和失败处理函数
 * always: 一个处理函数注册到成功和失败
 * resolve: 更新state为：RESOLVED，并且执行成功处理队列
 * reject: 更新state为：REJECTED，并且执行失败处理队列
**/

class PromiseNew {
  constructor(fn) {
    this.state = 'PENDING';
    this.doneList = [];
    this.failList = [];
    fn(this.resolve.bind(this), this.reject.bind(this));
  }

  // 注册成功处理函数
  done(handle) {
    if (typeof handle === 'function') {
      this.doneList.push(handle);
    } else {
      throw new Error('缺少回调函数');
    }
    return this;
  }

  // 注册失败处理函数
  fail(handle) {
    if (typeof handle === 'function') {
      this.failList.push(handle);
    } else {
      throw new Error('缺少回调函数');
    }
    return this;
  }

  // 同时注册成功和失败处理函数
  then(success, fail) {
    this.done(success || function () { }).fail(fail || function () { });
    return this;
  }

  // 一个处理函数注册到成功和失败
  always(handle) {
    this.done(handle || function () { }).fail(handle || function () { });
    return this;
  }

  // 更新state为：RESOLVED，并且执行成功处理队列
  resolve() {
    this.state = 'RESOLVED';
    let args = Array.prototype.slice.call(arguments);
    setTimeout(function () {
      this.doneList.forEach((item, key, arr) => {
        item.apply(null, args);
        arr.shift();
      });
    }.bind(this),0);
  }

  // 更新state为：REJECTED，并且执行失败处理队列
  reject() {
    this.state = 'REJECTED';
    let args = Array.prototype.slice.call(arguments);
    setTimeout(function () {
      this.failList.forEach((item, key, arr) => {
        item.apply(null, args);
        arr.shift();
      });
    }.bind(this), 0);
  }
}

// 下面一波骚操作
new PromiseNew((resolve, reject) => {
  resolve('hello world');
  // reject('you are err');
}).done((res) => {
  console.log(res);
}).fail((res) => {
  console.log(res);
})
```
**tips**

```js
console.log('script start');

setTimeout(function() {
  console.log('setTimeout');
}, 0);

Promise.resolve().then(function() {
  console.log('promise1');
}).then(function() {
  console.log('promise2');
});

console.log('script end');
```

执行结果为：script start, script end, promise1, promise2, setTimeout

因为Promise是微任务，主线程会在同步任务做完后先清空微任务队列，再执行宏任务队列的setTimeout

promise是立即执行的，它创建的时候就会执行;

resolve()是用来表示promise的状态为fullfilled，相当于只是定义了一个有状态的Promise，但是并没有调用它;

promise调用then的前提是promise的状态为fullfilled;

只有promise调用then的时候，then里面的函数才会被推入微任务中;


