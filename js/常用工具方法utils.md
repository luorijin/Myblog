# js常用工具方法utils

## 其它常用方法
```js
    export default {
        timeFormat(seconds){//格式化秒数为天时分秒
            function formatMinutes(minutes){
                var day = parseInt(Math.floor(minutes / 1440));
                var hour = day >0
                            ?Math.floor((minutes - day*1440)/60)
                            :Math.floor(minutes/60);
                var minute = hour > 0
                                ? Math.floor(minutes -day*1440 - hour*60)
                                :minutes;
                let dayStr="",hourStr="",minuteStr="";
                if (day > 0) dayStr=day + ":";
                if (hour > 0) hourStr = hour<10?"0"+hour +":":hour + ":";
                minuteStr = minute<10?"0"+minute+":":minute+":"
                return dayStr+hourStr+minuteStr;
            }
            if(seconds >0){
                var minutes = Math.floor(seconds/60);
                seconds = seconds - minutes * 60;
                if(seconds<10) seconds="0"+seconds;
                return formatMinutes(minutes) + seconds;
            }else{
                return "00:00";
            }
        },
        UUid(){//生成32位唯一id
            var s = [];
            var hexDigits = "0123456789abcdef";
            for (var i = 0; i < 32; i++) {
                s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
            }
            s[14] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
            s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
            s[8] = s[13] = s[18] = s[23] = "-";
            
            var uuid = s.join("");
            return uuid;
        },
        deepClone(obj){//对象深拷贝
            let _obj = JSON.stringify(obj);
            let objClone = JSON.parse(_obj);
            return objClone;
        },
        numToletter(num){//数字转大小字母 0转A
            return String.fromCharCode(65 + parseInt(num))+" ";
        },
        urlParse(query) {//url参数解析---(id=3&gg=3)
            if (typeof query !== 'string') {
                return {};
            }
            let abj = {},
                reg = /^([^&]*)=([^#&]*)(\/|#|&|$)/,
                matchs = [];
            while (matchs = query.match(reg)) {
                abj[matchs[1]] = decodeURIComponent(matchs[2]);
                query = query.substring(matchs[0].length);
            }
            return abj;
        }
}
```
## localStorage带过期时间
```js
    export default {
    setItem: function (key, value, days) {
        // 设置过期原则
        if (!value) {
          localStorage.removeItem(key)
        } else {
          var Days = days || 7; // 默认保留7天
          var exp = new Date();
          localStorage[key] = JSON.stringify({
            value,
            expires: exp.getTime() + Days * 24 * 60 * 60 * 1000
          })
        }
      },
      getItem: function (name) {
        try {
          if(!localStorage[name]) return null;
          let o = JSON.parse(localStorage[name])
          if (!o || o.expires < Date.now()) {
            localStorage.removeItem(name);
            return null
          } else {
            return o.value
          }
        } catch (e) {
          console.log(e)
          return localStorage[name]
        } finally {
        }
      },
      clear(key){
        localStorage.removeItem(key);
      }
}
```