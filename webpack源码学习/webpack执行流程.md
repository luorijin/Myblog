# webpack执行流程

## compile

开始编译，根据配置区分单入口还是多入口

## make

从入口分析模块，建立module对象，依赖的module都写入对应的数组

## build 构建模块

（make中的一个步骤）build时调用runloader找到加载每种不同资源的loader进行处理，最后转换成js后用arcon.js把源码转换成AST语法树，再分析语法树，提取依赖关系存入供下一步使用

## seal 封装构建结果

根据配置和之前分析的依赖关系分配代码，把module粒度的代码加入到对应的chunk（代码块）里，每一个chunk最后就对应一个输出的目标js （提取公共js在这里完成）

## emit 输出文件

把各个chunk输出到结果文件，根据chunk类型的不同，使用不同的模版生成目标js

* MainTemplate.js ， 主文件模版，包括__webpack_require__在浏览器的实现

* ChunkTemplate.js ，chunk文件模版 对拆分出来的chunk加包装代码

* ModuleTemplate.js，module文件模版，对所有module加包装代码

* HotUpdateChunkTemplate.js 热替换模版，对所有热替换模块加包装代码

## webpack的订阅/发布-Tapable.js

通过Tapable.js的拆分，我们看到webpack源码中充满了各种的订阅和发布

### Compile过程 webpack参数传入和启动编译

查看node_moudule/webpack/webpack.js源码

* webapck对options的参数进行了格式验证处理，并摘出
* options中的plugin在订阅者管理器中进行了注册，以便后续流程调用。把验证后的options传给Compiler.js 调用run方法开始编译。
* Compiler.js开始工作后,调用Complation.js中的实现来进行：建立模块--loader处理--封装结果--输出文件几个步骤

### Make过程

Make是代码分析的核心流程。他包括了创建模块，构建模块的工作。

而构建模块步骤又包含了

* loader来处理资源
* 处理后的js进行AST转换并分析语句
* 语句中发现的依赖关系再处理拆分成dep,即依赖module,形成依赖网

Make步骤的入口在订阅者"make"的实现中，我们举单入口构建的例子来看

```js
    compiler.plugin("make", (compilation, callback) => {
        //module工厂函数
        const dep = 
            SingleEntryPlugin.createDependency(this.entry, this.name); 
        //开始构建！
        compilation.addEntry(this.context, dep, this.name, callback);
    });
```

在这里传入了单入口构建型模块的工厂函数给compilation的addEntry方法开始构建模块

进入`compilation.addEntry`方法后，核心步骤是通过`_addModuleChain() `来把处理的代码加入module链中，以便给后续的封装步骤使用

```js
    //根据addEntry传入的工厂函数类型得到对应的工厂函数实体
    const moduleFactory = 
    this.dependencyFactories.get(dependency.constructor);	
    if(!moduleFactory) {
    throw new Error(`No dependency factory available 
    for this dependency type: ${dependency.constructor.name}`);
    }

    //找到对应的modue构建工厂创建module
    moduleFactory.create({},(err, module) => {
    //核心流程 处理源码
        this.buildModule();
    //处理module建的依赖关系
        this.processModuleDependencies();
    })
```

### buildModule过程解析

在make过程中，最核心的就是buildModule流程，这个步骤主要有3个核心任务：

* 通过`runLoaders`函数找到对应的loader(css-loader,vue-loader,babel-loader...)处理源码

```js
    //NormalModule.js里dobuild的实现
    doBuild(options, compilation, resolver, fs, callback) {
    ...
    //构建loader运行的上下文环境
    const loaderContext = 
    this.createLoaderContext(resolver, options, compilation, fs);
        
    
    //环境，loader列表，源码传给runLoaders
    runLoaders({
        resource: this.resource,
        loaders: this.loaders,
        context: loaderContext,
        readResource: fs.readFile.bind(fs)
    }  
```

* 通过parser.parse方法，把源码解析成AST树，并且记录源码依赖关系

在上一步doBuild后的回调里，对已经转化成js的文件进行了如下处理

```js
    this.parser.parse(this._source.source(), {
					current: this,
					module: this,
					compilation: compilation,
					options: options
				});
    //解析源文件的内容
```

文件转换`AST`以及语句的遍历处理都在`webpack/lib/parser.js`中实现

调用 acorn 解析经 loader 处理后的源文件生成抽象语法树 AST

对于当前模块，或许存在着多个依赖模块。当前模块会开辟一个依赖模块的数组，在遍历 AST 时，将 require() 中的模块通过 addDependency() 添加到数组中。当前模块构建完成后，webpack 调用 processModuleDependencies 开始递归处理依赖的 module，接着就会重复之前的构建步骤。

```js
    ast = acorn.parse(source, {
				ranges: true,
				locations: true,
				ecmaVersion: 2017,
				sourceType: "module",
				plugins: {
					dynamicImport: true
				},
				onComment: comments
			});
    //使用acorn.js将源码转化


    this.walkStatements(ast.body);
    //遍历ast树上的所有语句


    parser.plugin("import", (statement, source) => {
    const dep =
    new HarmonyImportDependency(source, 
    HarmonyModulesHelpers.getNewModuleVar(parser.state, source), 
    statement.range);
                dep.loc = statement.loc;
                parser.state.current.addDependency(dep);
                parser.state.lastHarmonyImport = dep;
                return true;
            });
    //遇到import ,require等语句时根据commonJS,HarmonyImport,AMD,UMD等不同语法对依赖关系进行解析记录
```

### seal过程 封装代码

当冗长耗时`loader`处理源码,遍历`module`依赖关系后，我们得到了一个巨大的AST树结构的`module map`,我们就要回到`Complation`对象中的`seal`方法来把代码封成浏览器里运行的模块了。

```js
    seal(){
        self.preparedChunks.forEach(preparedChunk => {
                const module = preparedChunk.module;
                const chunk = self.addChunk(preparedChunk.name, module);
                const entrypoint = self.entrypoints[chunk.name] = new Entrypoint(chunk.name);
                entrypoint.unshiftChunk(chunk);

                chunk.addModule(module);
                //把module加入对应的chunk里，准备最后输出成一个文件
                module.addChunk(chunk);
                //记录最后含有module的chunk列表在一个数组中
                chunk.entryModule = module;
                self.assignIndex(module); 
                //给module赋值int型的moduleID 这就是最终源码里的webpackJsonp([1,2]) 依赖数字的由来
                self.assignDepth(module);
                self.processDependenciesBlockForChunk(module, chunk);
            }

            this.createChunkAssets(); // 生成最终assets		
    }
```

再经历了`seal`的步骤后，我们的一个个`module`块已经被分配到各自的`chunk`中去了，准备最后写入文件。但是依赖关系都是ES6的，要想最后浏览器运行还需要加个`pollify,webpack`针对几种类型的文件有对应的模版来处理

```js
    createChunkAssets(){
        //这个方法调用不同的模版来处理源文件用于输出，我们用MainTemplate.js举例，最终浏览器运行顶部的代码模版就在这里定义
        if(chunk.hasRuntime()) {
                            source = this.mainTemplate.render(this.hash, chunk, this.moduleTemplate, this.dependencyTemplates);
                        } else {
                            source = this.chunkTemplate.render(chunk, this.moduleTemplate, this.dependencyTemplates);
                        }
    }

    //这段代码输出了runtime函数，既浏览器环境实现的webpack模块加载器
        
    this.plugin("render", (bootstrapSource, chunk, hash, moduleTemplate, dependencyTemplates) => {
                const source = new ConcatSource();
                source.add("/******/ (function(modules) { // webpackBootstrap\n");
                source.add(new PrefixSource("/******/", bootstrapSource));
                source.add("/******/ })\n");
                source.add("/************************************************************************/\n");
                source.add("/******/ (");
                const modules = this.renderChunkModules(chunk, moduleTemplate, dependencyTemplates, "/******/ ");
                source.add(this.applyPluginsWaterfall("modules", modules, chunk, hash, moduleTemplate, dependencyTemplates));
                source.add(")");
                return source;
            });
```

### emitAssets 最后输出我们处理好的结果到本地文件中

经历了这么多步骤，终于在Compiler.compile方法完成后的回调中，我们要调用emitAssets方法进行最后输出工作，把代码写到结果文件中去。

```js
    Compiler.prototype.emitAssets = function(compilation, callback) {
        this.outputFileSystem.writeFile(targetPath, content, callback);
    }
```