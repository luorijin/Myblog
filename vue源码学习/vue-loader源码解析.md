# vue-loader源码解析

###  用例basic.vue

```js
<template>
  <h2 class="red">{{msg}}</h2>
</template>

<script>
export default {
  data () {
    return {
      msg: 'Hello from Component A!'
    }
  }
}
</script>

<style>
comp-a h2 {
  color: #f00;
}
</style>
```
分析步骤，`vue-loader` 将 basic.vue 编译到最终输出的 bundle.js 的过程中，其实调用了四个小的 `loader`。它们分别是：

* selector
* style-compiler
* template-compiler
* babel-loader

以上四个 loader ，除了 babel-loader 是外部的package，其他三个都存在于 vue-loader 的内部（lib/style-compiler 和 lib/template-compiler 和 lib/selector）。

vue-loader 将 basic.vue 编译成以下内容

```js
/* script */
import __vue_script__ from "!!babel-loader!../../lib/selector?type=script&index=0&bustCache!./basic.vue"
/* template */
import __vue_template__ from "!!../../lib/template-compiler/index?{\"id\":\"data-v-793be54c\",\"hasScoped\":false,\"buble\":{\"transforms\":{}}}!../../lib/selector?type=template&index=0&bustCache!./basic.vue"
/* styles */
import __vue_styles__ from "!!vue-style-loader!css-loader!../../lib/style-compiler/index?{\"vue\":true,\"id\":\"data-v-793be54c\",\"scoped\":false,\"hasInlineConfig\":false}!../../lib/selector?type=styles&index=0&bustCache!./basic.vue"
var Component = normalizeComponent(
  __vue_script__,
  __vue_template__,
  __vue_template_functional__,
  __vue_styles__,
  __vue_scopeId__,
  __vue_module_identifier__
)
```

在三个 `import` 语句中，不管它们用了多少个不同的 `loader` 去加载，`loader chain` 的源头都是 `basic.vue`。

### JavaScript 部分

```js
/* script */
import __vue_script__ from "!!babel-loader!../../lib/selector?type=script&index=0&bustCache!./basic.vue"
```

从做右到左，也就是 `basic.vue` 被先后被 `selector `和 `babel-loader` 处理过了。

`selector（参数type=script）` 的处理结果是将 basic.vue 中的 javaScript 抽出来之后交给`babel-loader`去处理，最后生成可用的 `javaScript`

### Template 部分

```js
/* template */
import __vue_template__ from "!!../../lib/template-compiler/index?{\"id\":\"data-v-793be54c\",\"hasScoped\":false,\"buble\":{\"transforms\":{}}}!../../lib/selector?type=template&index=0&bustCache!./basic.vue"
```

同样的，从左到右，basic.vue 先后被 `selector `和 `template-compiler` 处理过了。

`selector (参数type=template) `的处理结果是将 basic.vue 中的 template 抽出来之后交给 `template-compiler `处理，最终输出成可用的 `HTML`。

### Style 部分

```js
/* styles */
import __vue_styles__ from "!!vue-style-loader!css-loader!../../lib/style-compiler/index?{\"vue\":true,\"id\":\"data-v-793be54c\",\"scoped\":false,\"hasInlineConfig\":false}!../../lib/selector?type=styles&index=0&bustCache!./basic.vue"
```

style 涉及的 loader 较多，一个一个来分析， 从上代码可知，basic.vue 先后要被 `selector, style-compiler, css-loader` 以及 `vue-style-loader` 处理。

`selector (参数type=style)` 的处理结果是将 basic.vue 中的 css 抽出来之后交给` style-compiler `处理成 css, 然后交给 `css-loader` 处理生成 module, 最后通过 vue-style-loader 将 css 放在 `<style>` 里面，然后注入到`HTML` 里。

注意，这里之所以没有用 `style-loader` 是因为 `vue-style-loader` 是在 fork 了 style-loader 的基础上，增加了后端绘制 (SSR) 的支持。具体的不同，读者可以查看官方文档，笔者这里不再累述。