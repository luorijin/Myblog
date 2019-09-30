# filter表达式解析

```js
function parseFilters(exp) {
  var inSingle = false // 当前字符是否在 ' 单引号中的标识
  var inDouble = false // 当前字符是否在 " 双引号中的标识
  var inTemplateString = false // 当前字符是否在 ` es6 模板的标识
  var inRegex = false // 当前字符是否在 / 正则中的标识
  var curly = 0 // 匹配到 { +1 匹配到 } -1
  var square = 0 // 匹配到 [ +1 匹配到 ] -1
  var paren = 0 // 匹配到 ( +1 匹配到 ) -1
  var lastFilterIndex = 0
  var c, prev, i, expression, filters
 
  for (i = 0; i < exp.length; i++) {
    // 保存上次循环的 c，初始为 undefined
    prev = c
    // 调用 charCodeAt 方法返回 Unicode 编码，课通过 String.fromCharCode() 反转
    c = exp.charCodeAt(i)
    if (inSingle) {
      // 当前 c 是 ' ，并且 prev 不是 \ ，单引号部分结束
      if (c === 0x27 && prev !== 0x5c) {
        inSingle = false
      }
    } else if (inDouble) {
      // 当前 c 是 " ，并且 prev 不是 \ ，双引号部分结束
      if (c === 0x22 && prev !== 0x5c) {
        inDouble = false
      }
    } else if (inTemplateString) {
      // 当前 c 是 ` ，并且 prev 不是 \ ，es6 模板部分结束
      if (c === 0x60 && prev !== 0x5c) {
        inTemplateString = false
      }
    } else if (inRegex) {
      // 当前 c 是 / ，并且 prev 不是 \ ，正则部分结束
      if (c === 0x2f && prev !== 0x5c) {
        inRegex = false
      }
    } else if (
      c === 0x7c && // pipe | 为管道符
      exp.charCodeAt(i + 1) !== 0x7c &&
      exp.charCodeAt(i - 1) !== 0x7c && // 前后都不为管道符，排除 ||
      !curly &&
      !square &&
      !paren // {} [] () 都没有结束
    ) {
      if (expression === undefined) {
        // first filter, end of expression
        // 第一次解析 filter，提取 | 前面部分 expression
        lastFilterIndex = i + 1
        expression = exp.slice(0, i).trim()
      } else {
        pushFilter()
      }
    } else {
      switch (c) {
        case 0x22:
          inDouble = true
          break // "
        case 0x27:
          inSingle = true
          break // '
        case 0x60:
          inTemplateString = true
          break // `
        case 0x28:
          paren++
          break // (
        case 0x29:
          paren--
          break // )
        case 0x5b:
          square++
          break // [
        case 0x5d:
          square--
          break // ]
        case 0x7b:
          curly++
          break // {
        case 0x7d:
          curly--
          break // }
      }
      if (c === 0x2f) {
        // /
        var j = i - 1
        var p = void 0
        // find first non-whitespace prev char
        // 找到第一个不是空字符串的 p，中断循环
        for (; j = 0; j--) {
          p = exp.charAt(j)
          if (p !== ' ') {
            break
          }
        }
        // var validDivisionCharRE = /[\w).+\-_$\]]/;
        // p 不为空，并且不是字母 数组 + - _ $ ] 之一，说明是正则
        if (!p || !validDivisionCharRE.test(p)) {
          inRegex = true
        }
      }
    }
  }
 
  if (expression === undefined) {
    expression = exp.slice(0, i).trim()
  } else if (lastFilterIndex !== 0) {
    pushFilter()
  }
 
  function pushFilter() {
    // 将 exp.slice(lastFilterIndex, i).trim()，也就是 filter name 插入 filters 数组
    ;(filters || (filters = [])).push(exp.slice(lastFilterIndex, i).trim())
    lastFilterIndex = i + 1
  }
 
  if (filters) {
    // 遍历 filters 数组，循环处理 expression
    for (i = 0; i < filters.length; i++) {
      expression = wrapFilter(expression, filters[i])
    }
  }
 
  return expression
}
```