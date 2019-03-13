/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:45:06
 * @modify date 2019-02-19 17:45:06
 * @desc axios网络请求封装
 */
import axios from "axios";

axios.defaults.timeout = 10000;
axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
axios.defaults.withCredentials = true;  //请求携带cookie
// axios.defaults.crossDomain = true;  //请求携带额外数据(不包含cookie)

const domain = document.domain;
if (domain.indexOf('t-center') >= 0 || domain === 'localhost') {
  axios.defaults.baseURL = 'https://t-api.xyhj.io/v1/w/zh/'
  // axios.defaults.baseURL = 'https://game.xyhj.io/v1/w/zh'
} else {
  axios.defaults.baseURL = 'https://game.xyhj.io/v1/w/zh'
}

/**将post数据转为formData格式 */
function formDataFunc(params:Object) {
  const form = new FormData();
  for (const key in params) {
    form.append(key,params[key]);
  }
  return form
}

/**游戏平台接口 */
const gameCenter = ['/user/login','/user/getInfo']

//http request 拦截器
axios.interceptors.request.use(
  config => {
    //设置AHost
    if (config.url.indexOf('/user/') >= 0 ) {
      config.headers['AHost'] = 'gameCenter'
    }else{
      config.headers['AHost'] = 'starRocket';
    }

    if (config.method == 'post') {
      config.data = formDataFunc({
        ...config.data
      })
    }else if(config.method == 'get'){
      config.params = {
        ...config.params,
      }
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);
//http response 拦截器
axios.interceptors.response.use(
  response => {
    if (!response.data.success) {
      //错误处理
    }
    return response;
  },
  error => {
    return Promise.reject(error);
  }
);

/**
 * 封装get方法
 * @param url
 * @param data
 * @returns {Promise}
 */
export function get(url:string, params:Object) {
  return new Promise((resolve, reject) => {
    axios.get(url, { params }).then(response => {
      if (!response.data.success) {
        resolve(response.data.error);
      }else {
        resolve(response.data.payload);
      }
    }).catch(err => {
      reject(err);
    });
  });
}

/**
 * 封装post请求
 * @param url
 * @param data
 * @returns {Promise}
 */

export function post(url:string, data:Object) {
  return new Promise((resolve, reject) => {
    axios.post(url, data).then(
      response => {
        if (!response.data.success) {
          resolve(response.data.error);
        } else {
          resolve(response.data.payload);
        }
      },
      err => {
        reject(err);
      }
    );
  });
}
