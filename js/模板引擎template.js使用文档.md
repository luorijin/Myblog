# 模板引擎template.js使用文档

artTemplate是新一代javascript模板引擎,它在v8中的渲染效率可接近javascript性能极限,在chrome下渲染效率测试中分别是知名引擎Mustache与micro tmpl的25/32倍(性能测试);artTemplate的模板还支持使用自动化工具预编译;

::: v-pre
artTemplate的库分为两种,一个是template.js(采用"{{ }}"),一个是template-native.js(采用"<%= %>");第一个是简洁语法版,第二个是原生语法(感觉像JSP)版,两个库的语法不可混用,否则会报错;本文主要是讲简洁语法
:::
template.js是一款使用方便/性能卓越javascript模板引擎,简单/好用,支持webpack和fis,只有5K左右大小

## 原理
提前将Html代码放进一个`<script id="test" type="text/html"></script>`中,当需要用到时,在js里这样调用:`var htmlstr = template("test",放Json数据或其他)`,然后`$("#*").html(htmlstr)`,放进去就好

## 功能概述

提供一套模板语法,用户可以写一个模板区块,每次根据传入的数据,生成对应数据产生的HTML片段,渲染不同的效果

特性

1. 性能卓越,执行速度通常是Mustache与tmpl的20多倍(性能测试)

2. 支持运行时调试,可精确定位异常模板所在语句(演示)

3. 对NodeJS Express友好支持

4. 安全,默认对输出进行转义,在沙箱中运行编译后的代码(Node版本可以安全执行用户上传的模板)

5. 支持include语句,可导入定义的其它模块

6. 可在浏览器端实现按路径加载模板(详情)

7. 支持预编译,可将模板转换成为非常精简的js文件

8. 模板语句简洁,无需前缀引用数据,有简洁版本与原生语法版本可选

9. 支持所有流行的浏览器

10. 丰富的自定义配置

11. 支持数据过滤

12. 异常捕获功能

## 具体方法

引入template.js文件
引用简洁语法的引擎版本,例如:`<script src="template.js"></script>`

### 编写模板

使用一个type="text/html"的script标签存放模板,或者放到字符串中:

```js
<script id="test" type="text/html">  
  {{ if ifAdmin }}  //{{}}符号包裹起来的语句为模板的逻辑表达式
    <h1>{{ author }}</h1>
    <ul>
      {{each list as value i}}
        <li>{{ i+1 }} : {{ value }}</li>
      {{/each}}
    </ul>
  {{/if}}
</script>
```

:::tip
::: v-pre
注意:`{{}}`这是都是对内容编码输出,写成`{{#author}}`是对内容不编码输出;编码可以防止数据中含有HTML字符串,避免引起XSS攻击
:::

渲染模板(向模板插入数据并输出到页面)

```js
var data = { 
  author:'宫崎骏',
  isAdmin:true,
  list:['千与千寻','哈尔的移动城堡','幽灵公主','风之谷','龙猫']
};
```

`var html = template('test',data); //template(id,data)`:根据id渲染模板,内部会根据`document.getElementById(id)`查找模板,如果没有data参数那么将返回一渲染函数
`document.getElementById('content').innerHTML = html`;

### 输出结果

```html
<h1>宫崎骏</h1>
<ul>
  <li>1 : 千与千寻</li>  
  <li>2 : 哈尔的移动城堡</li> 
  <li>3 : 幽灵公主</li>  
  <li>4 : 风之谷</li> 
  <li>5 : 龙猫</li> 
</ul>
```

### 语法

**表达式**

**流程控制语句**

```js
(if else)
{{if value}}
...
{{else if value}}
...
{{else}}
...
{{/if}}
```

示例如下

```js
<script id="test" type="text/html">
  <div>
    {{if bok == 22}}
      <h1>线上</h1>
    {{else if bok == 33}}
      <h2>隐藏</h2>
    {{else}}
      <h3>走这里</h3>
    {{/if}}
  </div>
</script>
// 嵌套的写法
<script id="test" type="text/html">
  <div>
    {{if bok}}
      {{if list.length >= 0}}
        <p>线上</p>
      {{else}}
        <p>没有数据</p>
      {{/if}}
    {{/if}}
  </div>
</script>
```

**循环遍历语句**

```js
{{each name}}
索引：{{$index}}
值：{{$value}}
{{/each}}
```

示例如下

```js
<script id="test" type="text/html">
  <div>
    {{if list.length >= 0}}
      {{each list as value index}}
        <p>编号：{{index+1}} -- 姓名：{{value.name}} -- 年龄：{{value.age}}</p>
      {/each}
    {{/if}}
  </div>
</script>
```

也可以简写为

```js
<script id="test" type="text/html">
  <div>
    {{if list.length >= 0}}
      {{each list}}
        <p>编号：{{$index+1}} -- 姓名：{{$value.name}} -- 年龄：{{$value.age}}</p>
      {/each}
    {{/if}}
  </div>
</script>
```

### 调用自定义方法

**辅助方法**

使用`template.helper(name, callback)`注册公用辅助方法,可以直接在{{}}中调用:

```js
<script id="test" type="text/html">  
  <div>
    {{if c == 100}}
      <ul>
        {{each person}}
          <li>姓名：{{$value.name}} -- 性别：{{show($value.sex)}}</li>
        {{/each}}
      </ul>
    {{/if}}
  </div>
</script>
<script>
  var data = {
    c:100,
    person:[
      {name:"jack",age:18,sex:1},
      {name:"tom",age:19,sex:0},
      {name:"jerry",age:20,sex:0},
      {name:"kid",age:21,sex:1},
      {name:"jade",age:22,sex:0}
    ]
  };
  //自定义函数
  template.helper('show',function(sex){
    console.log(sex); //同样可以打印日志到控制台
    if(sex == 0){
      return "男"
    }else if(sex == 1){
      return "女"
    }
  });
  var html = template('test',data);
  document.getElementById('app').innerHTML = html;
</script>
```

## 辅助方法,可以扩展常用的公共方法

```js
template.helper('dateFormat', function (date, format) { 
 // .. 
 return value; 
}); 
```

### 在模板中的使用方式：
::: v-pre

> 语法 : `{{ data | funname : '第二参数' }}`;

> 具体调用为 : `funname(data,'第二参数')`;

> 模板中使用的方式:`{{time | dateFormat:'yyyy-MM-dd hh:mm:ss'}}`

> 支持传入参数与嵌套使用:`{{time | say:'cd' | ubb | link}}`

:::

:::tip
注意:引擎不会对辅助方法输出的HTML字符进行转义
:::

### 调用子模版
::: v-pre
`{{include 'main'}}`引入子模板,数据默认为共享;`{{include 'main' a}}`,`a`为制定数据,但是同样必须是父级数据,可以看看下面的例子,如果不注入的a的话,引入的子模板是接受不到数据的
:::

```js
<body>
  <div id="app"></div>
  <script id="main" type="text/html">  
    <ul>
      {{each list}}
        <li>{{$value}}</li>
      {{/each}}
    </ul>  
    {{include 'main' a}} <!-- include--导入其它模版,很实用的一个功能 -->
  </script>
  <script type="text/html">
    <div>
      <ul>
      {{each person}}
        <li>{{$value.name}}</li>
      {{/each}}
      </ul>
      {{include 'main' a}}
    </div>
  </script>
  <script>
    var data = {
      person:[
        {name:"jack",age:18},
        {name:"tom",age:19},
        {name:"jerry",age:20},
        {name:"kid",age:21},
        {name:"jade",age:22}
      ],
      a:{
        list:['文艺','博客','摄影','电影','民谣','旅行','吉他']
      }
    };
    var html = template('test',data);
    document.getElementById('app').innerHTML = html;
  </script>
</body>
```

## template.config

配置template.js的自定义选项

option {Object} 配置的对象参数

return {Object} 配置对象的镜像

### 可配置参数

字段|	类型	|默认值|	说明
---|---|---|---|
openTag|	string|	{{|	逻辑语法开始标签
closeTag|	string|	}}|	逻辑语法结束标签
escape|	boolean	true|	是否编码输出HTML字符
compress|	boolean	false|	是否压缩输出的html

## template.registerFunction

注册自定义函数功能

字段|	类型|	说明
---|---|---
name|	string|	自定义函数的名字,如果缺省会返回全部已注册的函数
fn	|function	|自定义函数,如果缺省会返回名称为name的函数
return	|object/function|	对象或函数

### template.unregisterFunction

取消自定义函数功能

字段|类型|说明
---|---|---
name	|string|	取消自定义函数的名字
return	|bollean|	是否成功

### template.registerModifier

注册自定义修复器功能。

字段	|类型	|说明
---|---|---
name	|string	|自定义修复器的名字,如果缺省会返回全部已注册的修复器
fn	|function	|自定义修复器,如果缺省会返回名称为name的修复器
return|	object/function	|对象或函数

### template.unregisterModifier
取消自定义修复器功能。

字段|	类型|说明
---|---|---
name	|string	|取消自定义修饰器的名字
return|	bollean|	是否成功

### template.noConflict+

在以原始方式使用template.js时会存在改函数(在模块化开发环境中不会存在),用来释放template.js占用的全局变量template,同时会返回template

`return {Function} template`

### 模板编码规范

1. 不能使用javascript关键字作为模板变量(包括 ECMA5 严格模式下新增的关键字):

`
break, case, catch, continue, debugger, default, delete, do, else, false, finally, for, function, if, in, instanceof, new, null, return, switch, this, throw, true, try, typeof, var, void, while, with, abstract, boolean, byte, char, class, const, double, enum, export, extends, final, float, goto, implements, import, int, interface, long, native, package, private, protected, public, short, static, super, synchronized, throws, transient, volatile, arguments, let, yield
`

2. 模板运行在沙箱中，内部无法访问外部变量，除非给模板定义辅助方法。例如：
```js
template.helper('Math', Math)
```
