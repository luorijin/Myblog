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
                '/js/axios中设置Content-Type不生效'
                
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
                '/vue源码学习/深入vue2.0模板渲染底层思想'
            ]
          },
        ]
      }
}