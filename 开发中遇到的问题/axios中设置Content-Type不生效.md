# axios中设置Content-Type不生效

::: tip
config中无data字段时，headers里的Content-Type无效果，这应该出于优化的层面，此时的Content-Length=0，无需向服务端提供Content-Type字段。
:::

## 解决办法
```js
    axios.interceptors.request.use((config) => {
        //在发送请求之前做某件事
        if (config.method == 'get') {//axios中设置Content-Type不生效的问题
            config.data = true
        }
        return config;
    },(error) =>{
        return Promise.reject(error);
    });

```
