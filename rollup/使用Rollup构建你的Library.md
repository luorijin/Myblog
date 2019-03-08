# 使用 Rollup 构建你的 Library

> Rollup, 和 Webpack, Parcel 都是模块打包工具(module bundler tool), 但是侧重点不同, 我们要聊的 Rollup    更加适合用于构建 Library, 而 Webpack, Parcel 更加适合开发 Application.

  希望通过本篇文章, 对大家构建 Library 有一定的工程上的启发.

  ## 什么是 Rollup

  简单而言, `Rollup` 是一个模块打包工具, 可以将我们按照 `ESM (ES2015 Module)` 规范编写的源码构建输出如下格式:

* IIFE: 自执行函数, 可通过 `<script>` 标签加载
* AMD: 浏览器端的模块规范, 可通过 RequireJS 可加载
* CommonJS: Node 默认的模块规范, 可通过 Webpack 加载
* UMD: 兼容 IIFE, AMD, CJS 三种模块规范
* ESM: ES2015 Module 规范, 可用 Webpack, Rollup 加载

大多数的 Library 也是选择使用 Rollup 构建, 比如: React, Vue, Angular, D3, Moment, Redux…

借助于 Rollup 的插件体系, 我们也可以处理 css, images, font 等资源, 但是 Rollup 不支持代码拆分chunk(Code Splitting)和运行时态加载(Dynamic Import) 特性, 所以较少的应用于 Application 开发.

## 为什么选择 Rollup

* Tree Shaking: 自动移除未使用的代码, 输出更小的文件
* Scope Hoisting: 所有模块构建在一个函数内, 执行效率更高
* Config 文件支持通过 ESM 模块格式书写
* 可以一次输出多种格式:
    * 不用的模块规范: IIFE, AMD, CJS, UMD, ESM
    * Development 与 production 版本: .js, .min.js
* 文档精简

## 基础插件

* rollup-plugin-alias: 提供 modules 名称的 alias 和 reslove 功能.
* rollup-plugin-babel: 提供 Babel 能力, 需要安装和配置 Babel (这部分知识不在本文涉及)
* rollup-plugin-eslint: 提供 ESLint 能力, 需要安装和配置 ESLint (这部分知识不在本文涉及)
* rollup-plugin-node-resolve: 解析 node_modules 中的模块
* rollup-plugin-commonjs: 转换 CJS -> ESM, 将非ES6语法的包转为ES6可用
* rollup-plugin-replace: 类比 Webpack 的 DefinePlugin , 
  可在源码中通过 process.env.NODE_ENV 用于构建区分 Development 与 Production 环境.
* rollup-plugin-filesize: 显示 bundle 文件大小
* rollup-plugin-uglify: 压缩 bundle 文件
* rollup-plugin-serve: 类比 webpack-dev-server, 提供静态服务器能力

## Rollup 配置

结合`lerna(管理多个packages包)`使用

```json
 {
    "test": "jest",
    "test:watch": "jest --watch",
    "dev": "rollup -c -w",
    "build:umd": "lerna exec -- rollup -c --environment TARGET:umd",
    "build:es": "lerna exec -- rollup -c"
  }
```  

Rollup 的配置文件建议拆分为多份, 比如:

* rollup.base.js
* rollup.dev.js
* rollup.prod.js

`rollup.base`配置基础配置

```js
    import nodeResolve from 'rollup-plugin-node-resolve'     // 帮助寻找node_modules里的包
import babel from 'rollup-plugin-babel'                             // rollup 的 babel 插件，ES6转ES5
import replace from 'rollup-plugin-replace'                       // 替换待打包文件里的一些变量，如 process在浏览器端是不存在的，需要被替换
import commonjs from 'rollup-plugin-commonjs'              // 将非ES6语法的包转为ES6可用
import uglify from 'rollup-plugin-uglify'
export class Banner{//包含文件头注释, 可以是版本, 作者或开源协议声明
    static g(name, version, author){
        return `${'/*!\n' + ' * '}${name}.js v${version}\n` +
        ` * (c) 2018-${new Date().getFullYear()} ${author}\n` +
        ` * Released under the MIT License.\n` +
        ` */`;
    }
}
const env = process.env.NODE_ENV;
const target = process.env.TARGET
export const plugins=[
    nodeResolve(),
    babel({
        exclude: '**/node_modules/**',
        babelrc: false,//不使用babelrc文件配置，否则会和jest单元测试冲突
        presets: [ "es2015-rollup" ]
    }),
    replace({
        'process.env.NODE_ENV': JSON.stringify(env)
    }),
    commonjs()
]
if (env === 'production'&&target==='umd') {
   plugins.push(
      uglify({
        compress: {
          pure_getters: true,
          unsafe: true,
          unsafe_comps: true,
          warnings: false
        }
      })
    )
  }
```

## 开发环境配置

由于是开发 Library, 建议大家编写单元测试, 示例工程我们使用 Jest 作为测试框架. 开发过程中还可通过rollup-plugin-serve 提供静态资源访问和livereload热刷新:

```js
import path from "path";
import alias from 'rollup-plugin-alias';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';
import {Banner,plugins} from '../../scripts/rollup.config.base';
import { name, version, author } from './package.json';
const banner=Banner.g(name, version, author);
const resolve = p => path.resolve(__dirname, p)
const config = {
  input: 'src/index.js',
  external: [],
  output: [
    {
      file:'demo/vue.js',
      format: 'umd',
      name:"Vue",
      banner,
      globals: {
      }
    }
  ],
  plugins: [
    ...plugins,
    alias({src:resolve('src')}),
    serve('demo'),
    livereload()
  ]
}
export default config;
```
