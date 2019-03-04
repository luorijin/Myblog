# webpack原理分析

## Compiler

Compiler 是一个编译器实例，在 webpack 的每个进程中只会创建一个对象，它用来创建构建对象 Compilation

## options属性

当 webpack 开始运行时，第一件事就是解析我们传入的配置，然后将配置赋值给 Compiler 实例

```js
    compiler = new Compiler();
    compiler.options = new WebpackOptionsApply().process(options,compiler);
```

在 WebpackOptionsApply 这个插件内部会根据我们传入的 webpack 配置来初始化需要的内部插件

```js
    // https://github.com/webpack/webpack/blob/master/lib/WebpackOptionsApply.js
JsonpTemplatePlugin = require("./JsonpTemplatePlugin");
NodeSourcePlugin = require("./node/NodeSourcePlugin");
compiler.apply(
    new JsonpTemplatePlugin(options.output),
    new FunctionModulePlugin(options.output),
    new NodeSourcePlugin(options.node),
    new LoaderTargetPlugin(options.target)
);
// 其他代码..
compiler.apply(new EntryOptionPlugin());
compiler.applyPluginsBailResult("entry-option", options.context, options.entry);
compiler.apply(
    new CompatibilityPlugin(),
    new HarmonyModulesPlugin(options.module),
    new AMDPlugin(options.module, options.amd || {}),
    new CommonJsPlugin(options.module),
    new LoaderPlugin(),
    new NodeStuffPlugin(options.node),
    new RequireJsStuffPlugin(),
    new APIPlugin(),
    new ConstPlugin(),
    new UseStrictPlugin(),
    new RequireIncludePlugin(),
    new RequireEnsurePlugin(),
    new RequireContextPlugin(options.resolve.modules, options.resolve.extensions, options.resolve.mainFiles),
    new ImportPlugin(options.module),
    new SystemPlugin(options.module)
);
```

每一个内部插件，都是通过监听任务点的方式，来实现自定义的逻辑。比如 JsonpTemplatePlugin 这个插件，是通过监听 mainTemplate 对象的 require-ensure 任务点，来生成 jsonp 风格的代码

```js
// https://github.com/webpack/webpack/blob/master/lib/JsonpTemplatePlugin.js
mainTemplate.plugin("require-ensure", function(_, chunk, hash) {
    return this.asString([
        "var installedChunkData = installedChunks[chunkId];",
        "if(installedChunkData === 0) {",
        this.indent([
            "return new Promise(function(resolve) { resolve(); });"
        ]),
        "}",
        "",
        "// a Promise means \"currently loading\".",
        "if(installedChunkData) {",
        this.indent([
            "return installedChunkData[2];"
        ]),
        "}",
        "",
        "// setup Promise in chunk cache",
        "var promise = new Promise(function(resolve, reject) {",
        this.indent([
            "installedChunkData = installedChunks[chunkId] = [resolve, reject];"
        ]),
        "});",
        "installedChunkData[2] = promise;",
        "",
        "// start chunk loading",
        "var head = document.getElementsByTagName('head')[0];",
        this.applyPluginsWaterfall("jsonp-script", "", chunk, hash),
        "head.appendChild(script);",
        "",
        "return promise;"
    ]);
});
```

因此，我们可以直接通过这个属性来获取到解析后的 webpack 配置

```js
    class CustomPlugin{
        constructor(){}
        apply(compiler){
            compiler.plugin("run",(compiler)=>{
                console.log(compiler.options)
            })
        }   
    }
```

## 输入输出

Compiler 实例在一开始也会初始化输入输出，分别是 inputFileSystem 和 outputFileSystem 属性，一般情况下这两个属性都是对应的 nodejs 中拓展后的 fs 对象。但是有一点要注意，当 Compiler 实例以 watch模式运行时， outputFileSystem 会被重写成内存输出对象。也就是说，实际上在 watch 模式下，webpack 构建后的文件并不会生成真正的文件，而是保存在内存中。

我们可以使用 inputFileSystem 和 outputFileSystem 属性来帮助我们实现一些文件操作，如果你希望自定义插件的一些输入输出行为能够跟 webpack 尽量同步，那么最好使用 Compiler 提供的这两个变量

```js
   class CustomPlugin{
        constructor(){}
        apply(compiler){
            compiler.outputFileSystem.mkdirp("path/to/dir",(error)=>{
                compiler.outputFileSystem.writeFile("path/to/file","utf-8",(errot)=>{})
            })

        }   
    } 
```

## 创建子编译器

这里为什么会有 compilation 和 this-compilation 两个任务点？其实是跟子编译器有关， Compiler 实例通过
createChildCompiler 方法可以创建子编译器实例 childCompiler，创建时 childCompiler 会复制
compiler 实例的任务点监听器。任务点 compilation 的监听器会被复制，而任务点 this-compilation
的监听器不会被复制

仔细看一下子编译器是如何创建的， Compiler 实例通过 createChildCompiler 的方法来创建

```js
    
	createChildCompiler(
		compilation,
		compilerName,
		compilerIndex,
		outputOptions,
		plugins
	) {
		const childCompiler = new Compiler(this.context);
		if (Array.isArray(plugins)) {
			for (const plugin of plugins) {
				plugin.apply(childCompiler);
			}
		}
		for (const name in this.hooks) {//过滤任务点
			if (
				![
					"make",
					"compile",
					"emit",
					"afterEmit",
					"invalid",
					"done",
					"thisCompilation"
				].includes(name)
			) {
				if (childCompiler.hooks[name]) {
					childCompiler.hooks[name].taps = this.hooks[name].taps.slice();
				}
			}
		}
		childCompiler.name = compilerName;
		childCompiler.outputPath = this.outputPath;
		childCompiler.inputFileSystem = this.inputFileSystem;
		childCompiler.outputFileSystem = null;
		childCompiler.resolverFactory = this.resolverFactory;
		childCompiler.fileTimestamps = this.fileTimestamps;
		childCompiler.contextTimestamps = this.contextTimestamps;

		const relativeCompilerName = makePathsRelative(this.context, compilerName);
		if (!this.records[relativeCompilerName]) {
			this.records[relativeCompilerName] = [];
		}
		if (this.records[relativeCompilerName][compilerIndex]) {
			childCompiler.records = this.records[relativeCompilerName][compilerIndex];
		} else {
			this.records[relativeCompilerName].push((childCompiler.records = {}));
		}

		childCompiler.options = Object.create(this.options);
		childCompiler.options.output = Object.create(childCompiler.options.output);
		for (const name in outputOptions) {
			childCompiler.options.output[name] = outputOptions[name];
		}
		childCompiler.parentCompilation = compilation;

		compilation.hooks.childCompiler.call(
			childCompiler,
			compilerName,
			compilerIndex
		);

		return childCompiler;
	}
```

子编译器在拷贝父编译器的任务点时，会过滤掉 make, compile, emit, after-emit, invalid, done, this-compilation这些任务点