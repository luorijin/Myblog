# react Babel编译JSX生成代码

## 原理分析

我们还是拿最简单的代码举例：

```js
    import {greet} from './utils';

    const App = <h1>{greet('scott')}</h1>;

    eactDOM.render(App, document.getElementById('root'));
```

这段代码在经过Babel编译后，会生成如下可执行代码：

```js
    var _utils = __webpack_require__(1);
    
    var App = React.createElement(
    'h1',
    null,
    (0, _utils.greet)('scott')
    );

ReactDOM.render(App, document.getElementById('root'));
```

在编译后，变成了React.createElement()方法的调用，从参数来看，它创建了一个h1标签，标签的内容是一个方法调用返回值:

```js
    import {greet} from './utils';

    const style = {
    color: 'red'
    };

    const App = (
    <div className="container">
        <h1 style={style}>{greet('scott')} hah</h1>
        <p>This is a JSX demo</p>
        <div>
        <input type="button" value="click me" />
        </div>
    </div>
    );

    ReactDOM.render(App, document.getElementById('root'));
```

编译之后，会生成如下代码:

```js
    var _utils = __webpack_require__(1);

var style = {
  color: 'red'
};

var App = React.createElement(
  'div',
  { className: 'container' },
  React.createElement(
    'h1',
    { style: style },
    (0, _utils.greet)('scott'),
    ' hah'
  ),
  React.createElement(
    'p',
    null,
    'This is a JSX demo'
  ),
  React.createElement(
    'div',
    null,
    React.createElement(
      'input',
      { type: 'button', value: 'click me' }
    )
  )
);

ReactDOM.render(App, document.getElementById('root'));
```

React.createElement方法:

```js
    React.createElement(tag, attrs, ...children);
    // 第一参数是标签名，第二个参数是属性对象，后面的参数是0到多个子结点。如果是自闭和标签，只生成前两个参数即可，如下：

    // JSX
    const App = <input type="button" value="click me" />;

    // 编译结果
    var App = React.createElement('input', { type: 'button', value: 'click me' })
```

## 实现过程

> 首先将JSX解析成树状数据结构，然后根据这个树状结构生成目标代码

### 例子代码

```js
const style = {
  color: 'red'
};

function greet(name) {
  return `hello ${name}`;
}

const App = (
  <div className="container">
    <p style={style}>saying {greet('scott')} hah</p>
    <div>
      <p>this is jsx-like code</p>
      <i className="icon"/>
      <p>parsing it now</p>
      <img className="icon"/>
    </div>
    <input type="button" value="i am a button"/>
    <em/>
  </div>
);
```

我们在JSX中引用到了`style`变量和`greet()`函数，对于这些引用，在后期生成可执行代码时，会保持原样输出，直接引用当前作用域中的变量或函数。注意，我们可能覆盖不到JSX所有的语法规则，这里只做一个简单的演示即可，解析代码如下:

```js
// 解析JSX
const parseJSX = function () {
  const TAG_LEFT = '<';
  const TAG_RIGHT = '>';
  const CLOSE_SLASH = '/';
  const WHITE_SPACE = ' ';
  const ATTR_EQUAL = '=';
  const DOUBLE_QUOTE = '"';
  const LEFT_CURLY = '{';
  const RIGHT_CURLY = '}';

  let at = -1;        // 当前解析的位置
  let stack = [];     // 放置已解析父结点的栈
  let source = '';    // 要解析的JSX代码内容
  let parent = null;  // 当前元素的父结点

  // 寻找目标字符
  let seek = (target) => {
    let found = false;

    while (!found) {
      let ch = source.charAt(++at);

      if (ch === target) {
        found = true;
      }
    }
  };

  // 向前搜索目标信息
  let explore = (target) => {
    let index = at;
    let found = false;
    let rangeStr = '';

    while (!found) {
      let ch = source.charAt(++index);

      if (target !== TAG_RIGHT && ch === TAG_RIGHT) {
        return {
          at: -1,
          str: rangeStr,
        };
      }

      if (ch === target) {
        found = true;
      } else if (ch !== CLOSE_SLASH) {
        rangeStr += ch;
      }
    }

    return {
      at: index - 1,
      str: rangeStr,
    };
  };

  // 跳过空格
  let skipSpace = () => {
    while (true) {
      let ch = source.charAt(at + 1);

      if (ch === TAG_RIGHT) {
        at--;
        break;
      }

      if (ch !== WHITE_SPACE) {
        break;
      } else {
        at++;
      }
    }
  };

  // 解析标签体
  let parseTag = () => {
    if (stack.length > 0) {
      let rangeResult = explore(TAG_LEFT);

      let resultStr = rangeResult.str.replace(/^\n|\n$/, '').trim();
      
      if (resultStr.length > 0) {
        let exprPositions = [];

        resultStr.replace(/{.+?}/, function(match, startIndex) {
          let endIndex = startIndex + match.length - 1;
          exprPositions.push({
            startIndex,
            endIndex,
          });
        });

        let strAry = [];
        let currIndex = 0;

        while (currIndex < resultStr.length) {
          // 没有表达式了
          if (exprPositions.length < 1) {
            strAry.push({
              type: 'str',
              value: resultStr.substring(currIndex),
            });
            break;
          }

          let expr = exprPositions.shift();

          strAry.push({
            type: 'str',
            value: resultStr.substring(currIndex, expr.startIndex),
          });

          strAry.push({
            type: 'expr',
            value: resultStr.substring(expr.startIndex + 1, expr.endIndex),
          });

          currIndex = expr.endIndex + 1;
        }

        parent.children.push(...strAry);

        at = rangeResult.at;
        
        parseTag();

        return parent;
      }
    }

    seek(TAG_LEFT);

    // 闭合标记 例如: </div>
    if (source.charAt(at + 1) === CLOSE_SLASH) {
      at++;

      let endResult = explore(TAG_RIGHT);

      if (endResult.at > -1) {
        // 栈结构中只有一个结点 当前是最后一个闭合标签
        if (stack.length === 1) {
          return stack.pop();
        }

        let completeTag = stack.pop();

        // 更新当前父结点
        parent = stack[stack.length - 1];

        parent.children.push(completeTag);

        at = endResult.at;

        parseTag();

        return completeTag;
      }
    }

    let tagResult = explore(WHITE_SPACE);

    let elem = {
      tag: tagResult.str,
      attrs: {},
      children: [],
    };

    if (tagResult.at > -1) {
      at = tagResult.at;
    }

    // 解析标签属性键值对
    while (true) {
      skipSpace();

      let attrKeyResult = explore(ATTR_EQUAL);

      if (attrKeyResult.at === -1) {
        break;
      }

      at = attrKeyResult.at + 1;

      let attrValResult = {};

      if (source.charAt(at + 1) === LEFT_CURLY) {
        // 属性值是引用类型

        seek(LEFT_CURLY);

        attrValResult = explore(RIGHT_CURLY);
        
        attrValResult = {
          at: attrValResult.at,
          info: {
            type: 'ref',
            value: attrValResult.str,
          }
        };
      } else {
        // 属性值是字符串类型

        seek(DOUBLE_QUOTE);

        attrValResult = explore(DOUBLE_QUOTE);

        attrValResult = {
          at: attrValResult.at,
          info: {
            type: 'str',
            value: attrValResult.str,
          }
        };
      }

      at = attrValResult.at + 1;

      skipSpace();

      elem.attrs[attrKeyResult.str] = attrValResult.info;
    }

    seek(TAG_RIGHT);

    // 检测是否为自闭合标签
    if (source.charAt(at - 1) === CLOSE_SLASH) {
      // 自闭合标签 追加到父标签children中 然后继续解析
      if (stack.length > 0) {
        parent.children.push(elem);

        parseTag();
      }
    } else {
      // 有结束标签的 入栈 然后继续解析
      stack.push(elem);

      parent = elem;

      parseTag();
    }

    return elem;
  };

  return function (jsx) {
    source = jsx;
    return parseTag();
  };
}();
```

> 在解析JSX时，有以下几个关键步骤

:::tip

1. 解析到`<`时，表明一个标签的开始，接下来开始解析标签名，比如`div`。
2. 在解析完标签名之后，试图解析属性键值对，如果存在，则检测`=`前后的值，属性值可能是字符串，也可能是变量引用，所以需要做个区分。
3. 解析到`>`时，表明一个标签的前半部分结束，此时应该将当前解析到的元素入栈，然后继续解析。
4. 解析到`/>`时，表明是一个自闭合元素，此时直接将其追加到栈顶父结点的children中。
5. 解析到`</`时，表明是标签的后半部分，一个完整标签结束了，此时弹出栈顶元素，并将这个元素追加到当前栈顶父结点的children中。
6. 最后一个栈顶元素出栈，整个解析过程完毕。

:::

> 接下来，我们调用上面的parseJSX()方法，来解析示例代码

```js
    const App = (`
      <div className="container">
        <p style={style}>{greet('scott')}</p>
        <div>
          <p>this is jsx-like code</p>
          <i className="icon"/>
          <p>parsing it now</p>
          <img className="icon"/>
        </div>
        <input type="button" value="i am a button"/>
        <em/>
      </div>
    `);

let root = parseJSX(App);

console.log(JSON.stringify(root, null, 2));
```
> 生成的树状数据结构如下所示：

```js
    {
      "tag": "div",
      "attrs": {
        "className": {
          "type": "str",
          "value": "container"
        }
      },
      "children": [
        {
          "tag": "p",
          "attrs": {
            "style": {
              "type": "ref",
              "value": "style"
            }
          },
          "children": [
            {
              "type": "str",
              "value": "saying "
            },
            {
              "type": "expr",
              "value": "greet('scott')"
            },
            {
              "type": "str",
              "value": " hah"
            }
          ]
        },
        {
          "tag": "div",
          "attrs": {},
          "children": [
            {
              "tag": "p",
              "attrs": {},
              "children": [
                {
                  "type": "str",
                  "value": "this is jsx-like code"
                }
              ]
            },
            {
              "tag": "i",
              "attrs": {
                "className": {
                  "type": "str",
                  "value": "icon"
                }
              },
              "children": []
            },
            {
              "tag": "p",
              "attrs": {},
              "children": [
                {
                  "type": "str",
                  "value": "parsing it now"
                }
              ]
            },
            {
              "tag": "img",
              "attrs": {
                "className": {
                  "type": "str",
                  "value": "icon"
                }
              },
              "children": []
            }
          ]
        },
        {
          "tag": "input",
          "attrs": {
            "type": {
              "type": "str",
              "value": "button"
            },
            "value": {
              "type": "str",
              "value": "i am a button"
            }
          },
          "children": []
        },
        {
          "tag": "em",
          "attrs": {},
          "children": []
        }
      ]
    }
```
> 在生成这个树状数据结构之后，接下来我们要根据这个数据描述，生成最终的可执行代码，下面代码可用来完成这个阶段的处理：

```js
  // 将树状属性结构转换输出可执行代码
  function transform(elem) {
    // 处理属性键值对
    function processAttrs(attrs) {
      let result = [];

      let keys = Object.keys(attrs);

      keys.forEach((key, index) => {
        let type = attrs[key].type;
        let value = attrs[key].value;

        // 需要区分字符串和变量引用
        let keyValue = `${key}: ${type === 'ref' ? value : '"' + value + '"'}`;

        if (index < keys.length - 1) {
          keyValue += ',';
        }

        result.push(keyValue);
      });

      if (result.length < 1) {
        return 'null';
      }

      return '{' + result.join('') + '}';
    }

    // 处理结点元素
    function processElem(elem, parent) {
      let content = '';

      // 处理子结点
      elem.children.forEach((child, index) => {
        // 子结点是标签元素
        if (child.tag) {
          content += processElem(child, elem);
          return;
        }

        // 以下处理文本结点

        if (child.type === 'expr') {
          // 表达式
          content += child.value;
        } else {
          // 字符串字面量
          content += `"${child.value}"`;
        }

        if (index < elem.children.length - 1) {
          content += ',';
        }
      });

      let isLastChildren = elem === parent.children[parent.children.length -1];

      return (
        `React.createElement(
            '${elem.tag}',
            ${processAttrs(elem.attrs)}${content.trim().length ? ',' : ''}
            ${content}
        )${isLastChildren ? '' : ','}`
      );
    }

    return processElem(elem, elem).replace(/,$/, '');
  }
```

> 我们来调用一下transform()方法：

```js
    let root = parseJSX(App);

    let code = transform(root);

    console.log(code);
```

> 运行完上述代码，我们会得到一个目标代码字符串，格式化显示后代码结构是这样的：

```js
    React.createElement(
    'div',
    {className: "container"},
    React.createElement(
        'p',
        {style: style},
        "saying ",
        greet('scott'),
        " hah"
    ),
    React.createElement(
        'div',
        null,
        React.createElement(
        'p',
        null,
        "this is jsx-like code"
        ),
        React.createElement(
        'i',
        {className: "icon"}
        ),
        React.createElement(
        'p',
        null,
        "parsing it now"
        ),
        React.createElement(
        'img',
        {className: "icon"}
        )
    ),
    React.createElement(
        'input',
        {type: "button", value: "i am a button"}
    ),
    React.createElement(
        'em',
        null
    )
    );
```

> 我们还需要将上下文代码拼接在一起，就像下面这样：

```js
    const style = {
  color: 'red'
};

function greet(name) {
  return `hello ${name}`;
}

const App = React.createElement(
  'div',
  {className: "container"},
  React.createElement(
    'p',
    {style: style},
    "saying ",
    greet('scott'),
    " hah"
  ),
  React.createElement(
    'div',
    null,
    React.createElement(
      'p',
      null,
      "this is jsx-like code"
    ),
    React.createElement(
      'i',
      {className: "icon"}
    ),
    React.createElement(
      'p',
      null,
      "parsing it now"
    ),
    React.createElement(
      'img',
      {className: "icon"}
    )
  ),
  React.createElement(
    'input',
    {type: "button", value: "i am a button"}
  ),
  React.createElement(
    'em',
    null
  )
);
```

