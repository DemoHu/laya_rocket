export default {

    /**
     * 千分位格式化
     * @param {number | string} num 格式化数字
     */
    comdify(num: any) {
        return num.toString().replace(/\d+/, function (n) { // 先提取整数部分
            return n.replace(/(\d)(?=(\d{3})+$)/g, function ($1) { // 对整数部分添加分隔符
                return $1 + ",";
            });
        });
    },

    /**
     * 复制
     * @param {string} copyInfo 复制内容
     */
    Copy(copyInfo: any) {
        return new Promise((resolve, reject) => {
            let copyUrl = document.createElement("input"); //创建一个input框获取需要复制的文本内容
            copyUrl.value = copyInfo;
            let appDiv = document.getElementById('app');
            appDiv.appendChild(copyUrl);
            copyUrl.select();
            document.execCommand("Copy");
            copyUrl.remove()
            resolve(true);
        })
    },

    /** 判断是否为手机*/
    isPhone(num: any) {
        var reg = /^1[3456789]\d{9}$/;
        return reg.test(num);
    },

    /**
     * 倒计时
     * @param {string | number} times 剩余毫秒数 
     * @param {function} callback 回调函数
     */
    countDown(times: any, callback: any) {
        let timer = null;
        timer = setInterval(() => {
            if (times > 0) {
                let day: any = Math.floor(times / (60 * 60 * 24));
                let hour: any = Math.floor(times / (60 * 60)) - (day * 24);
                let minute: any = Math.floor(times / 60) - (day * 24 * 60) - (hour * 60);
                let second: any = Math.floor(times) - (day * 24 * 60 * 60) - (hour * 60 * 60) - (minute * 60);
                day = `${day < 10 ? '0' : ''}${day}`;
                hour = `${hour < 10 ? '0' : ''}${hour}`;
                minute = `${minute < 10 ? '0' : ''}${minute}`;
                second = `${second < 10 ? '0' : ''}${second}`;
                callback(`${hour}:${minute}:${second}`)
                times--;
            } else {
                clearInterval(timer);
                callback(false)
            }
        }, 1000);
        if (times <= 0) {
            clearInterval(timer);
            callback(false)
        }
    },

    /**
     * 将格式化日期转换成时间戳
     * @param {string} myDate 格式化日期
     */
    formatDate(x: any, y: any) {
        if (!(x instanceof Date)) {
            var date = new Date();
            date.setTime(x * 1000);
            x = date;
        }
        var z = {
            y: x.getFullYear(),
            M: x.getMonth() + 1,
            d: x.getDate(),
            h: x.getHours(),
            m: x.getMinutes(),
            s: x.getSeconds()
        };
        return y.replace(/(y+|M+|d+|h+|m+|s+)/g, function (v) {
            return ((v.length > 1 ? "0" : "") + eval("z." + v.slice(-1))).slice(
                -(v.length > 2 ? v.length : 2)
            );
        });
    },

    /**
     * 保留n位小数  
     * @param {string | number} cnum 需要保留的数据
     * @param {string} cindex 保留的小数位数
     */
    toDecimal(cnum: any, cindex: any) {
        let value = String(cnum);
        if (value.indexOf(".") > 0) {
            var left = value.substr(0, value.indexOf("."));
            var right = value.substr(value.indexOf(".") + 1, value.length);
            if (right.length > cindex) {
                right = right.substr(0, cindex);
            }
            value = left + "." + right;
            return value;
        } else {
            return cnum;
        }
    }
}
