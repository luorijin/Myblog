# 原型链，构造函数、原型、实例化对象


> 题目：下面代码描述正确的是（B C）

```js
var F = function(){}; 
Object.prototype.a = function(){}; 
Function.prototype.b = function(){}; 
var f = new F();
```
A. f可以访问到a，f可以访问到b

B. F可以访问到a，F可以访问到b

C. f可以访问到a，f不可以访问到b

D. F可以访问到a，F不可以访问到b

该例子中，

f为F的实例化对象    f instanceof F     //true

f._proto_ === F.prototype

f原型链：f => F.prototype => Object.prototype

F原型链：F => Function.prototype => Object.prototype

注意区分：实例化与原型关系

由此引出，什么是构造函数，什么是原型
> Object和Function都既是函数也是对象;所有的函数都是对象，可是并不是所有的对象都是函数。证明如下：

```js
1 function foo(){};  
2 alert(foo instanceof Function); // true  
3 alert(foo instanceof Object); // true  
4 alert(new foo() instanceof Function); // false
```

## 什么是构造函数

构造函数：用来在创建对象时初始化对象。
特点：构造函数名一般为大写字母开头;与new运算符一起使用来实例化对象。
举例：

function Person(){}           //Person构造函数  
var p=new Person();         //Person构造函数创建对象,也可叫做实例化

## 什么是原型

原型：构造函数在创建的过程中，系统自动创建出来与构造函数相关联的一个空的对象。可以由构造函数.prototype来访问到。
举例：在实例化对象p的过程中，系统就自动创建出了构造函数的原型，即Person.prototype.
注意：每个对象的__proto__属性指向自身构造函数的prototype;

constructor属性是原型对象的属性，指向这个原型对象所对应的构造函数。

## 原型链

原型链：每一个对象都有自己的原型对象，原型对象本身也是对象，原型对象也有自己的原型对象，这样就形成了一个链式结构，叫做原型链。
举例：
在上面这个例子中的p对象的原型链结构图如下：
p对象----->Person.prototype------->Object.prototype--------->null

对这个实例化对象而言，访问对象的属性，是首先在对象本身去找，如果没有，就会去他的原型对象中找，一直找到原型链的终点；如果是修改对象的属性，如果这个实例化对象中有这个属性，就修改，没有这个属性就添加这个属性。

## 继承

继承：js继承的几种方法：
(1). for-in继承：
```js
function Person(){              //父类  
     this.name="水煮鱼";  
     this.age=18;  
}  
  
function Son(){                 //子类  
}  
var p=new Person();  
var s=new Son();  
for(var k in p){  
    s[k]=p[k];  
}  
console.log(s.name);           //水煮鱼  
console.log(s.age);            //18  
(2). 原型继承：

function Human(){  
     this.name="香辣虾";  
     this.age=21;  
}  
function Man(){  
}  
Man.prototype=new Human();  
var m=new Man();  
console.log(m.name);           //香辣虾  
console.log(m.age);            //21  
(3). 经典继承：
var animal={  
      name:"阿咪",  
      type:"猫科"  
};  
var a=Object.create(animal)    //ES5属性  
console.log(a.name);           //阿咪  
console.log(a.type);           //猫科  
Object.create()是让一个对象的原型继承另外一个对象；所以虽然a.name和a.age是可以访问成功的，但实际上a本身并没有这些属性，而是a的原型上有这些属性。
```

图中有几个难点

* Function构造函数可以用Function.__proto__来访问Function.prototype. 这是因为Function构造函数的构造函数是他本身，作为实例化对象的角色来访问，可行。
* 任何函数都是函数，他都继承Function的所有属性和方法，而Function是内置的构造函数，也是对象，都是继承Object的所有属性和方法。
