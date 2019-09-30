# new一个对象的过程

1. 创建一个新对象：
```
　　var obj = {};
```
2. 设置新对象的constructor属性为构造函数的名称，设置新对象的__proto__属性指向构造函数的prototype对象；
```
　　obj.__proto__ = ClassA.prototype;
```
3. 使用新对象调用函数，函数中的this被指向新实例对象：
```
　　ClassA.call(obj);　　//{}.构造函数()
```
4. 将初始化完毕的新对象地址，保存到等号左边的变量中

```js
//通过分析原生的new方法可以看出，在new一个函数的时候，
// 会返回一个func同时在这个func里面会返回一个对象Object，
// 这个对象包含父类func的属性以及隐藏的__proto__
function New(f) {
    //返回一个func
    return function () {
        var o = {"__proto__": f.prototype};
        f.apply(o, arguments);//继承父类的属性
        return o; //返回一个Object
    }
}
```