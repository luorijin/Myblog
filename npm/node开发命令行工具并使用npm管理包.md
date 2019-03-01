# node开发命令行工具并使用npm管理包

## 注册npm账号

填写你的信息注册账号，然后会给你发一封激活邮件，激活你的账号就ok了

## npm登陆

```sh
    npm login
```

会让你输入你刚才注册的用户名密码已经邮箱;如果一切正常，那么不会有任何提示信息，说明你登录成功了

#### test

```sh
    mkdir test
    cd test
    npm init
```

我们就可以把我们的包，通过npm推送到远程，进行管理

```sh
    npm publish
```
如果发布报错，可能是以下两种情况
1. 没有用正确的账号登陆
2. 所要发布的包的名字，已经有人使用并发布了

编辑你的package.json文件，找到name字段，修改一个独一无二的名字

发布了包之后，你就可以像安装其他第三方包一下来安装你的包了

```sh
    npm install <you package name>
```

如果你的本地包有更新，需要再次发布的话，直接执行 npm publish 是不可以的，你还要更新一下包的版本号，然后再执行发布命令才行，也就是修改一下package.json文件的 version 字段，不过，不需要手动修改，执行

```sh
    npm version <update_type>
```

`update_type `可以取三个值：`major minor patch`

我们知道，版本号的格式是这样的 1.0.0

其中 1 是主要版本，只有重大的更新才会修改它的值（major），第二个位置是次要的(minor)，第三个位置是补丁(patch)，根据包修改的程度来定你要修改那个位置的数字，为了测试，我们就执行如下命令：

```sh
    npm version patch
```

## node开发命令行工具

### 第一步：编写一个nodejs文件

名字你随便起，这里我们就叫 test.js，在package.json的同级目录新建一个test.js文件，并编辑如下内容：

```sh
    #! /usr/bin/env node

    console.log('test command line!')
```
::: tip
第一行的 #! /usr/bin/env node 不可以省略，这是告诉机器，这个文件要在node环境下运行，当我们直接执行这个文件的时候，相当于使用node去执行它

`./test.js`相单于`node ./test.js`
:::

### 第二步：在package.json文件中添加bin字段

```json
    "bin": {
        "hcy-cmd": "./test.js"
    }
```
### 连接到全局

```sh
    npm link
```

就可以在终端执行`hcy-cmd`