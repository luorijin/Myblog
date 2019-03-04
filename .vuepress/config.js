module.exports = {
    title:"罗的技术博客",
    description:"jquery/js/vue/react/webapck/gulp/git/小程序/npm/rollup相关技术整理",
    themeConfig: {
        sidebar: [
          {
            title: 'javascript',
            children: [
                '/js/JS中原型链，构造函数、原型、实例化对象',
                '/js/模板引擎template.js使用文档',
                '/js/数组操作',
                '/js/常用工具方法utils'     
            ]
          },
          {
            title: '设计模式',
            children: [
                '/设计模式/设计模式之策略模式'
            ]
          },
          {
            title: 'vue源码学习',
            children: [
                '/vue源码学习/vue编译原理',
                '/vue源码学习/深入vue2.0模板渲染底层思想',
                '/vue源码学习/vue源码之htmlParse解析器的实现'
            ]
          },
          {
            title:'react源码学习',
            children: [
              '/react源码学习/Babel编译JSX生成代码原理'
            ]
          },
          {
            title:"webpack源码学习",
            children:[
              '/webpack源码学习/webpack执行流程',
              '/webpack源码学习/webpack原理分析'
            ]
          },
          {
            title:'npm',
            children:[
              '/npm/node开发命令行工具并使用npm管理包'
            ]
          },
          {
            title:"开发中遇到的问题",
            children:[
              '/开发中遇到的问题/axios中设置Content-Type不生效',
              ['/开发中遇到的问题/兼容性问题','兼容性问题']
            ]
          }
        ]
      }
}