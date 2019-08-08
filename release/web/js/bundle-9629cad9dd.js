var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
module.exports = require('./lib/axios');
},{"./lib/axios":3}],2:[function(require,module,exports){
(function (process){
'use strict';

var utils = require('./../utils');
var settle = require('./../core/settle');
var buildURL = require('./../helpers/buildURL');
var parseHeaders = require('./../helpers/parseHeaders');
var isURLSameOrigin = require('./../helpers/isURLSameOrigin');
var createError = require('../core/createError');
var btoa = (typeof window !== 'undefined' && window.btoa && window.btoa.bind(window)) || require('./../helpers/btoa');

module.exports = function xhrAdapter(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    var requestData = config.data;
    var requestHeaders = config.headers;

    if (utils.isFormData(requestData)) {
      delete requestHeaders['Content-Type']; // Let the browser set it
    }

    var request = new XMLHttpRequest();
    var loadEvent = 'onreadystatechange';
    var xDomain = false;

    // For IE 8/9 CORS support
    // Only supports POST and GET calls and doesn't returns the response headers.
    // DON'T do this for testing b/c XMLHttpRequest is mocked, not XDomainRequest.
    if (process.env.NODE_ENV !== 'test' &&
        typeof window !== 'undefined' &&
        window.XDomainRequest && !('withCredentials' in request) &&
        !isURLSameOrigin(config.url)) {
      request = new window.XDomainRequest();
      loadEvent = 'onload';
      xDomain = true;
      request.onprogress = function handleProgress() {};
      request.ontimeout = function handleTimeout() {};
    }

    // HTTP basic authentication
    if (config.auth) {
      var username = config.auth.username || '';
      var password = config.auth.password || '';
      requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
    }

    request.open(config.method.toUpperCase(), buildURL(config.url, config.params, config.paramsSerializer), true);

    // Set the request timeout in MS
    request.timeout = config.timeout;

    // Listen for ready state
    request[loadEvent] = function handleLoad() {
      if (!request || (request.readyState !== 4 && !xDomain)) {
        return;
      }

      // The request errored out and we didn't get a response, this will be
      // handled by onerror instead
      // With one exception: request that using file: protocol, most browsers
      // will return status as 0 even though it's a successful request
      if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
        return;
      }

      // Prepare the response
      var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
      var responseData = !config.responseType || config.responseType === 'text' ? request.responseText : request.response;
      var response = {
        data: responseData,
        // IE sends 1223 instead of 204 (https://github.com/axios/axios/issues/201)
        status: request.status === 1223 ? 204 : request.status,
        statusText: request.status === 1223 ? 'No Content' : request.statusText,
        headers: responseHeaders,
        config: config,
        request: request
      };

      settle(resolve, reject, response);

      // Clean up request
      request = null;
    };

    // Handle low level network errors
    request.onerror = function handleError() {
      // Real errors are hidden from us by the browser
      // onerror should only fire if it's a network error
      reject(createError('Network Error', config, null, request));

      // Clean up request
      request = null;
    };

    // Handle timeout
    request.ontimeout = function handleTimeout() {
      reject(createError('timeout of ' + config.timeout + 'ms exceeded', config, 'ECONNABORTED',
        request));

      // Clean up request
      request = null;
    };

    // Add xsrf header
    // This is only done if running in a standard browser environment.
    // Specifically not if we're in a web worker, or react-native.
    if (utils.isStandardBrowserEnv()) {
      var cookies = require('./../helpers/cookies');

      // Add xsrf header
      var xsrfValue = (config.withCredentials || isURLSameOrigin(config.url)) && config.xsrfCookieName ?
          cookies.read(config.xsrfCookieName) :
          undefined;

      if (xsrfValue) {
        requestHeaders[config.xsrfHeaderName] = xsrfValue;
      }
    }

    // Add headers to the request
    if ('setRequestHeader' in request) {
      utils.forEach(requestHeaders, function setRequestHeader(val, key) {
        if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
          // Remove Content-Type if data is undefined
          delete requestHeaders[key];
        } else {
          // Otherwise add header to the request
          request.setRequestHeader(key, val);
        }
      });
    }

    // Add withCredentials to request if needed
    if (config.withCredentials) {
      request.withCredentials = true;
    }

    // Add responseType to request if needed
    if (config.responseType) {
      try {
        request.responseType = config.responseType;
      } catch (e) {
        // Expected DOMException thrown by browsers not compatible XMLHttpRequest Level 2.
        // But, this can be suppressed for 'json' type as it can be parsed by default 'transformResponse' function.
        if (config.responseType !== 'json') {
          throw e;
        }
      }
    }

    // Handle progress if needed
    if (typeof config.onDownloadProgress === 'function') {
      request.addEventListener('progress', config.onDownloadProgress);
    }

    // Not all browsers support upload events
    if (typeof config.onUploadProgress === 'function' && request.upload) {
      request.upload.addEventListener('progress', config.onUploadProgress);
    }

    if (config.cancelToken) {
      // Handle cancellation
      config.cancelToken.promise.then(function onCanceled(cancel) {
        if (!request) {
          return;
        }

        request.abort();
        reject(cancel);
        // Clean up request
        request = null;
      });
    }

    if (requestData === undefined) {
      requestData = null;
    }

    // Send the request
    request.send(requestData);
  });
};

}).call(this,require('_process'))

},{"../core/createError":9,"./../core/settle":12,"./../helpers/btoa":16,"./../helpers/buildURL":17,"./../helpers/cookies":19,"./../helpers/isURLSameOrigin":21,"./../helpers/parseHeaders":23,"./../utils":25,"_process":66}],3:[function(require,module,exports){
'use strict';

var utils = require('./utils');
var bind = require('./helpers/bind');
var Axios = require('./core/Axios');
var defaults = require('./defaults');

/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 * @return {Axios} A new instance of Axios
 */
function createInstance(defaultConfig) {
  var context = new Axios(defaultConfig);
  var instance = bind(Axios.prototype.request, context);

  // Copy axios.prototype to instance
  utils.extend(instance, Axios.prototype, context);

  // Copy context to instance
  utils.extend(instance, context);

  return instance;
}

// Create the default instance to be exported
var axios = createInstance(defaults);

// Expose Axios class to allow class inheritance
axios.Axios = Axios;

// Factory for creating new instances
axios.create = function create(instanceConfig) {
  return createInstance(utils.merge(defaults, instanceConfig));
};

// Expose Cancel & CancelToken
axios.Cancel = require('./cancel/Cancel');
axios.CancelToken = require('./cancel/CancelToken');
axios.isCancel = require('./cancel/isCancel');

// Expose all/spread
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = require('./helpers/spread');

module.exports = axios;

// Allow use of default import syntax in TypeScript
module.exports.default = axios;

},{"./cancel/Cancel":4,"./cancel/CancelToken":5,"./cancel/isCancel":6,"./core/Axios":7,"./defaults":14,"./helpers/bind":15,"./helpers/spread":24,"./utils":25}],4:[function(require,module,exports){
'use strict';

/**
 * A `Cancel` is an object that is thrown when an operation is canceled.
 *
 * @class
 * @param {string=} message The message.
 */
function Cancel(message) {
  this.message = message;
}

Cancel.prototype.toString = function toString() {
  return 'Cancel' + (this.message ? ': ' + this.message : '');
};

Cancel.prototype.__CANCEL__ = true;

module.exports = Cancel;

},{}],5:[function(require,module,exports){
'use strict';

var Cancel = require('./Cancel');

/**
 * A `CancelToken` is an object that can be used to request cancellation of an operation.
 *
 * @class
 * @param {Function} executor The executor function.
 */
function CancelToken(executor) {
  if (typeof executor !== 'function') {
    throw new TypeError('executor must be a function.');
  }

  var resolvePromise;
  this.promise = new Promise(function promiseExecutor(resolve) {
    resolvePromise = resolve;
  });

  var token = this;
  executor(function cancel(message) {
    if (token.reason) {
      // Cancellation has already been requested
      return;
    }

    token.reason = new Cancel(message);
    resolvePromise(token.reason);
  });
}

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
CancelToken.prototype.throwIfRequested = function throwIfRequested() {
  if (this.reason) {
    throw this.reason;
  }
};

/**
 * Returns an object that contains a new `CancelToken` and a function that, when called,
 * cancels the `CancelToken`.
 */
CancelToken.source = function source() {
  var cancel;
  var token = new CancelToken(function executor(c) {
    cancel = c;
  });
  return {
    token: token,
    cancel: cancel
  };
};

module.exports = CancelToken;

},{"./Cancel":4}],6:[function(require,module,exports){
'use strict';

module.exports = function isCancel(value) {
  return !!(value && value.__CANCEL__);
};

},{}],7:[function(require,module,exports){
'use strict';

var defaults = require('./../defaults');
var utils = require('./../utils');
var InterceptorManager = require('./InterceptorManager');
var dispatchRequest = require('./dispatchRequest');

/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 */
function Axios(instanceConfig) {
  this.defaults = instanceConfig;
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}

/**
 * Dispatch a request
 *
 * @param {Object} config The config specific for this request (merged with this.defaults)
 */
Axios.prototype.request = function request(config) {
  /*eslint no-param-reassign:0*/
  // Allow for axios('example/url'[, config]) a la fetch API
  if (typeof config === 'string') {
    config = utils.merge({
      url: arguments[0]
    }, arguments[1]);
  }

  config = utils.merge(defaults, {method: 'get'}, this.defaults, config);
  config.method = config.method.toLowerCase();

  // Hook up interceptors middleware
  var chain = [dispatchRequest, undefined];
  var promise = Promise.resolve(config);

  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    chain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    chain.push(interceptor.fulfilled, interceptor.rejected);
  });

  while (chain.length) {
    promise = promise.then(chain.shift(), chain.shift());
  }

  return promise;
};

// Provide aliases for supported request methods
utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, config) {
    return this.request(utils.merge(config || {}, {
      method: method,
      url: url
    }));
  };
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, data, config) {
    return this.request(utils.merge(config || {}, {
      method: method,
      url: url,
      data: data
    }));
  };
});

module.exports = Axios;

},{"./../defaults":14,"./../utils":25,"./InterceptorManager":8,"./dispatchRequest":10}],8:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

function InterceptorManager() {
  this.handlers = [];
}

/**
 * Add a new interceptor to the stack
 *
 * @param {Function} fulfilled The function to handle `then` for a `Promise`
 * @param {Function} rejected The function to handle `reject` for a `Promise`
 *
 * @return {Number} An ID used to remove interceptor later
 */
InterceptorManager.prototype.use = function use(fulfilled, rejected) {
  this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected
  });
  return this.handlers.length - 1;
};

/**
 * Remove an interceptor from the stack
 *
 * @param {Number} id The ID that was returned by `use`
 */
InterceptorManager.prototype.eject = function eject(id) {
  if (this.handlers[id]) {
    this.handlers[id] = null;
  }
};

/**
 * Iterate over all the registered interceptors
 *
 * This method is particularly useful for skipping over any
 * interceptors that may have become `null` calling `eject`.
 *
 * @param {Function} fn The function to call for each interceptor
 */
InterceptorManager.prototype.forEach = function forEach(fn) {
  utils.forEach(this.handlers, function forEachHandler(h) {
    if (h !== null) {
      fn(h);
    }
  });
};

module.exports = InterceptorManager;

},{"./../utils":25}],9:[function(require,module,exports){
'use strict';

var enhanceError = require('./enhanceError');

/**
 * Create an Error with the specified message, config, error code, request and response.
 *
 * @param {string} message The error message.
 * @param {Object} config The config.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 * @returns {Error} The created error.
 */
module.exports = function createError(message, config, code, request, response) {
  var error = new Error(message);
  return enhanceError(error, config, code, request, response);
};

},{"./enhanceError":11}],10:[function(require,module,exports){
'use strict';

var utils = require('./../utils');
var transformData = require('./transformData');
var isCancel = require('../cancel/isCancel');
var defaults = require('../defaults');
var isAbsoluteURL = require('./../helpers/isAbsoluteURL');
var combineURLs = require('./../helpers/combineURLs');

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }
}

/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 * @returns {Promise} The Promise to be fulfilled
 */
module.exports = function dispatchRequest(config) {
  throwIfCancellationRequested(config);

  // Support baseURL config
  if (config.baseURL && !isAbsoluteURL(config.url)) {
    config.url = combineURLs(config.baseURL, config.url);
  }

  // Ensure headers exist
  config.headers = config.headers || {};

  // Transform request data
  config.data = transformData(
    config.data,
    config.headers,
    config.transformRequest
  );

  // Flatten headers
  config.headers = utils.merge(
    config.headers.common || {},
    config.headers[config.method] || {},
    config.headers || {}
  );

  utils.forEach(
    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
    function cleanHeaderConfig(method) {
      delete config.headers[method];
    }
  );

  var adapter = config.adapter || defaults.adapter;

  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);

    // Transform response data
    response.data = transformData(
      response.data,
      response.headers,
      config.transformResponse
    );

    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);

      // Transform response data
      if (reason && reason.response) {
        reason.response.data = transformData(
          reason.response.data,
          reason.response.headers,
          config.transformResponse
        );
      }
    }

    return Promise.reject(reason);
  });
};

},{"../cancel/isCancel":6,"../defaults":14,"./../helpers/combineURLs":18,"./../helpers/isAbsoluteURL":20,"./../utils":25,"./transformData":13}],11:[function(require,module,exports){
'use strict';

/**
 * Update an Error with the specified config, error code, and response.
 *
 * @param {Error} error The error to update.
 * @param {Object} config The config.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 * @returns {Error} The error.
 */
module.exports = function enhanceError(error, config, code, request, response) {
  error.config = config;
  if (code) {
    error.code = code;
  }
  error.request = request;
  error.response = response;
  return error;
};

},{}],12:[function(require,module,exports){
'use strict';

var createError = require('./createError');

/**
 * Resolve or reject a Promise based on response status.
 *
 * @param {Function} resolve A function that resolves the promise.
 * @param {Function} reject A function that rejects the promise.
 * @param {object} response The response.
 */
module.exports = function settle(resolve, reject, response) {
  var validateStatus = response.config.validateStatus;
  // Note: status is not exposed by XDomainRequest
  if (!response.status || !validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(createError(
      'Request failed with status code ' + response.status,
      response.config,
      null,
      response.request,
      response
    ));
  }
};

},{"./createError":9}],13:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

/**
 * Transform the data for a request or a response
 *
 * @param {Object|String} data The data to be transformed
 * @param {Array} headers The headers for the request or response
 * @param {Array|Function} fns A single function or Array of functions
 * @returns {*} The resulting transformed data
 */
module.exports = function transformData(data, headers, fns) {
  /*eslint no-param-reassign:0*/
  utils.forEach(fns, function transform(fn) {
    data = fn(data, headers);
  });

  return data;
};

},{"./../utils":25}],14:[function(require,module,exports){
(function (process){
'use strict';

var utils = require('./utils');
var normalizeHeaderName = require('./helpers/normalizeHeaderName');

var DEFAULT_CONTENT_TYPE = {
  'Content-Type': 'application/x-www-form-urlencoded'
};

function setContentTypeIfUnset(headers, value) {
  if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
    headers['Content-Type'] = value;
  }
}

function getDefaultAdapter() {
  var adapter;
  if (typeof XMLHttpRequest !== 'undefined') {
    // For browsers use XHR adapter
    adapter = require('./adapters/xhr');
  } else if (typeof process !== 'undefined') {
    // For node use HTTP adapter
    adapter = require('./adapters/http');
  }
  return adapter;
}

var defaults = {
  adapter: getDefaultAdapter(),

  transformRequest: [function transformRequest(data, headers) {
    normalizeHeaderName(headers, 'Content-Type');
    if (utils.isFormData(data) ||
      utils.isArrayBuffer(data) ||
      utils.isBuffer(data) ||
      utils.isStream(data) ||
      utils.isFile(data) ||
      utils.isBlob(data)
    ) {
      return data;
    }
    if (utils.isArrayBufferView(data)) {
      return data.buffer;
    }
    if (utils.isURLSearchParams(data)) {
      setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
      return data.toString();
    }
    if (utils.isObject(data)) {
      setContentTypeIfUnset(headers, 'application/json;charset=utf-8');
      return JSON.stringify(data);
    }
    return data;
  }],

  transformResponse: [function transformResponse(data) {
    /*eslint no-param-reassign:0*/
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) { /* Ignore */ }
    }
    return data;
  }],

  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,

  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',

  maxContentLength: -1,

  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  }
};

defaults.headers = {
  common: {
    'Accept': 'application/json, text/plain, */*'
  }
};

utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
  defaults.headers[method] = {};
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
});

module.exports = defaults;

}).call(this,require('_process'))

},{"./adapters/http":2,"./adapters/xhr":2,"./helpers/normalizeHeaderName":22,"./utils":25,"_process":66}],15:[function(require,module,exports){
'use strict';

module.exports = function bind(fn, thisArg) {
  return function wrap() {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    return fn.apply(thisArg, args);
  };
};

},{}],16:[function(require,module,exports){
'use strict';

// btoa polyfill for IE<10 courtesy https://github.com/davidchambers/Base64.js

var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function E() {
  this.message = 'String contains an invalid character';
}
E.prototype = new Error;
E.prototype.code = 5;
E.prototype.name = 'InvalidCharacterError';

function btoa(input) {
  var str = String(input);
  var output = '';
  for (
    // initialize result and counter
    var block, charCode, idx = 0, map = chars;
    // if the next str index does not exist:
    //   change the mapping table to "="
    //   check if d has no fractional digits
    str.charAt(idx | 0) || (map = '=', idx % 1);
    // "8 - idx % 1 * 8" generates the sequence 2, 4, 6, 8
    output += map.charAt(63 & block >> 8 - idx % 1 * 8)
  ) {
    charCode = str.charCodeAt(idx += 3 / 4);
    if (charCode > 0xFF) {
      throw new E();
    }
    block = block << 8 | charCode;
  }
  return output;
}

module.exports = btoa;

},{}],17:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

function encode(val) {
  return encodeURIComponent(val).
    replace(/%40/gi, '@').
    replace(/%3A/gi, ':').
    replace(/%24/g, '$').
    replace(/%2C/gi, ',').
    replace(/%20/g, '+').
    replace(/%5B/gi, '[').
    replace(/%5D/gi, ']');
}

/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @returns {string} The formatted url
 */
module.exports = function buildURL(url, params, paramsSerializer) {
  /*eslint no-param-reassign:0*/
  if (!params) {
    return url;
  }

  var serializedParams;
  if (paramsSerializer) {
    serializedParams = paramsSerializer(params);
  } else if (utils.isURLSearchParams(params)) {
    serializedParams = params.toString();
  } else {
    var parts = [];

    utils.forEach(params, function serialize(val, key) {
      if (val === null || typeof val === 'undefined') {
        return;
      }

      if (utils.isArray(val)) {
        key = key + '[]';
      } else {
        val = [val];
      }

      utils.forEach(val, function parseValue(v) {
        if (utils.isDate(v)) {
          v = v.toISOString();
        } else if (utils.isObject(v)) {
          v = JSON.stringify(v);
        }
        parts.push(encode(key) + '=' + encode(v));
      });
    });

    serializedParams = parts.join('&');
  }

  if (serializedParams) {
    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
  }

  return url;
};

},{"./../utils":25}],18:[function(require,module,exports){
'use strict';

/**
 * Creates a new URL by combining the specified URLs
 *
 * @param {string} baseURL The base URL
 * @param {string} relativeURL The relative URL
 * @returns {string} The combined URL
 */
module.exports = function combineURLs(baseURL, relativeURL) {
  return relativeURL
    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
    : baseURL;
};

},{}],19:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

module.exports = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs support document.cookie
  (function standardBrowserEnv() {
    return {
      write: function write(name, value, expires, path, domain, secure) {
        var cookie = [];
        cookie.push(name + '=' + encodeURIComponent(value));

        if (utils.isNumber(expires)) {
          cookie.push('expires=' + new Date(expires).toGMTString());
        }

        if (utils.isString(path)) {
          cookie.push('path=' + path);
        }

        if (utils.isString(domain)) {
          cookie.push('domain=' + domain);
        }

        if (secure === true) {
          cookie.push('secure');
        }

        document.cookie = cookie.join('; ');
      },

      read: function read(name) {
        var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
        return (match ? decodeURIComponent(match[3]) : null);
      },

      remove: function remove(name) {
        this.write(name, '', Date.now() - 86400000);
      }
    };
  })() :

  // Non standard browser env (web workers, react-native) lack needed support.
  (function nonStandardBrowserEnv() {
    return {
      write: function write() {},
      read: function read() { return null; },
      remove: function remove() {}
    };
  })()
);

},{"./../utils":25}],20:[function(require,module,exports){
'use strict';

/**
 * Determines whether the specified URL is absolute
 *
 * @param {string} url The URL to test
 * @returns {boolean} True if the specified URL is absolute, otherwise false
 */
module.exports = function isAbsoluteURL(url) {
  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  // by any combination of letters, digits, plus, period, or hyphen.
  return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
};

},{}],21:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

module.exports = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs have full support of the APIs needed to test
  // whether the request URL is of the same origin as current location.
  (function standardBrowserEnv() {
    var msie = /(msie|trident)/i.test(navigator.userAgent);
    var urlParsingNode = document.createElement('a');
    var originURL;

    /**
    * Parse a URL to discover it's components
    *
    * @param {String} url The URL to be parsed
    * @returns {Object}
    */
    function resolveURL(url) {
      var href = url;

      if (msie) {
        // IE needs attribute set twice to normalize properties
        urlParsingNode.setAttribute('href', href);
        href = urlParsingNode.href;
      }

      urlParsingNode.setAttribute('href', href);

      // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
      return {
        href: urlParsingNode.href,
        protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
        host: urlParsingNode.host,
        search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
        hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
        hostname: urlParsingNode.hostname,
        port: urlParsingNode.port,
        pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
                  urlParsingNode.pathname :
                  '/' + urlParsingNode.pathname
      };
    }

    originURL = resolveURL(window.location.href);

    /**
    * Determine if a URL shares the same origin as the current location
    *
    * @param {String} requestURL The URL to test
    * @returns {boolean} True if URL shares the same origin, otherwise false
    */
    return function isURLSameOrigin(requestURL) {
      var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
      return (parsed.protocol === originURL.protocol &&
            parsed.host === originURL.host);
    };
  })() :

  // Non standard browser envs (web workers, react-native) lack needed support.
  (function nonStandardBrowserEnv() {
    return function isURLSameOrigin() {
      return true;
    };
  })()
);

},{"./../utils":25}],22:[function(require,module,exports){
'use strict';

var utils = require('../utils');

module.exports = function normalizeHeaderName(headers, normalizedName) {
  utils.forEach(headers, function processHeader(value, name) {
    if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
      headers[normalizedName] = value;
      delete headers[name];
    }
  });
};

},{"../utils":25}],23:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

// Headers whose duplicates are ignored by node
// c.f. https://nodejs.org/api/http.html#http_message_headers
var ignoreDuplicateOf = [
  'age', 'authorization', 'content-length', 'content-type', 'etag',
  'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
  'last-modified', 'location', 'max-forwards', 'proxy-authorization',
  'referer', 'retry-after', 'user-agent'
];

/**
 * Parse headers into an object
 *
 * ```
 * Date: Wed, 27 Aug 2014 08:58:49 GMT
 * Content-Type: application/json
 * Connection: keep-alive
 * Transfer-Encoding: chunked
 * ```
 *
 * @param {String} headers Headers needing to be parsed
 * @returns {Object} Headers parsed into an object
 */
module.exports = function parseHeaders(headers) {
  var parsed = {};
  var key;
  var val;
  var i;

  if (!headers) { return parsed; }

  utils.forEach(headers.split('\n'), function parser(line) {
    i = line.indexOf(':');
    key = utils.trim(line.substr(0, i)).toLowerCase();
    val = utils.trim(line.substr(i + 1));

    if (key) {
      if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
        return;
      }
      if (key === 'set-cookie') {
        parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
      } else {
        parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
      }
    }
  });

  return parsed;
};

},{"./../utils":25}],24:[function(require,module,exports){
'use strict';

/**
 * Syntactic sugar for invoking a function and expanding an array for arguments.
 *
 * Common use case would be to use `Function.prototype.apply`.
 *
 *  ```js
 *  function f(x, y, z) {}
 *  var args = [1, 2, 3];
 *  f.apply(null, args);
 *  ```
 *
 * With `spread` this example can be re-written.
 *
 *  ```js
 *  spread(function(x, y, z) {})([1, 2, 3]);
 *  ```
 *
 * @param {Function} callback
 * @returns {Function}
 */
module.exports = function spread(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
};

},{}],25:[function(require,module,exports){
'use strict';

var bind = require('./helpers/bind');
var isBuffer = require('is-buffer');

/*global toString:true*/

// utils is a library of generic helper functions non-specific to axios

var toString = Object.prototype.toString;

/**
 * Determine if a value is an Array
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Array, otherwise false
 */
function isArray(val) {
  return toString.call(val) === '[object Array]';
}

/**
 * Determine if a value is an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an ArrayBuffer, otherwise false
 */
function isArrayBuffer(val) {
  return toString.call(val) === '[object ArrayBuffer]';
}

/**
 * Determine if a value is a FormData
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an FormData, otherwise false
 */
function isFormData(val) {
  return (typeof FormData !== 'undefined') && (val instanceof FormData);
}

/**
 * Determine if a value is a view on an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
 */
function isArrayBufferView(val) {
  var result;
  if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
    result = ArrayBuffer.isView(val);
  } else {
    result = (val) && (val.buffer) && (val.buffer instanceof ArrayBuffer);
  }
  return result;
}

/**
 * Determine if a value is a String
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a String, otherwise false
 */
function isString(val) {
  return typeof val === 'string';
}

/**
 * Determine if a value is a Number
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Number, otherwise false
 */
function isNumber(val) {
  return typeof val === 'number';
}

/**
 * Determine if a value is undefined
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if the value is undefined, otherwise false
 */
function isUndefined(val) {
  return typeof val === 'undefined';
}

/**
 * Determine if a value is an Object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Object, otherwise false
 */
function isObject(val) {
  return val !== null && typeof val === 'object';
}

/**
 * Determine if a value is a Date
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Date, otherwise false
 */
function isDate(val) {
  return toString.call(val) === '[object Date]';
}

/**
 * Determine if a value is a File
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a File, otherwise false
 */
function isFile(val) {
  return toString.call(val) === '[object File]';
}

/**
 * Determine if a value is a Blob
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Blob, otherwise false
 */
function isBlob(val) {
  return toString.call(val) === '[object Blob]';
}

/**
 * Determine if a value is a Function
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Function, otherwise false
 */
function isFunction(val) {
  return toString.call(val) === '[object Function]';
}

/**
 * Determine if a value is a Stream
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Stream, otherwise false
 */
function isStream(val) {
  return isObject(val) && isFunction(val.pipe);
}

/**
 * Determine if a value is a URLSearchParams object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a URLSearchParams object, otherwise false
 */
function isURLSearchParams(val) {
  return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams;
}

/**
 * Trim excess whitespace off the beginning and end of a string
 *
 * @param {String} str The String to trim
 * @returns {String} The String freed of excess whitespace
 */
function trim(str) {
  return str.replace(/^\s*/, '').replace(/\s*$/, '');
}

/**
 * Determine if we're running in a standard browser environment
 *
 * This allows axios to run in a web worker, and react-native.
 * Both environments support XMLHttpRequest, but not fully standard globals.
 *
 * web workers:
 *  typeof window -> undefined
 *  typeof document -> undefined
 *
 * react-native:
 *  navigator.product -> 'ReactNative'
 */
function isStandardBrowserEnv() {
  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
    return false;
  }
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined'
  );
}

/**
 * Iterate over an Array or an Object invoking a function for each item.
 *
 * If `obj` is an Array callback will be called passing
 * the value, index, and complete array for each item.
 *
 * If 'obj' is an Object callback will be called passing
 * the value, key, and complete object for each property.
 *
 * @param {Object|Array} obj The object to iterate
 * @param {Function} fn The callback to invoke for each item
 */
function forEach(obj, fn) {
  // Don't bother if no value provided
  if (obj === null || typeof obj === 'undefined') {
    return;
  }

  // Force an array if not already something iterable
  if (typeof obj !== 'object') {
    /*eslint no-param-reassign:0*/
    obj = [obj];
  }

  if (isArray(obj)) {
    // Iterate over array values
    for (var i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    // Iterate over object keys
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        fn.call(null, obj[key], key, obj);
      }
    }
  }
}

/**
 * Accepts varargs expecting each argument to be an object, then
 * immutably merges the properties of each object and returns result.
 *
 * When multiple objects contain the same key the later object in
 * the arguments list will take precedence.
 *
 * Example:
 *
 * ```js
 * var result = merge({foo: 123}, {foo: 456});
 * console.log(result.foo); // outputs 456
 * ```
 *
 * @param {Object} obj1 Object to merge
 * @returns {Object} Result of all merge properties
 */
function merge(/* obj1, obj2, obj3, ... */) {
  var result = {};
  function assignValue(val, key) {
    if (typeof result[key] === 'object' && typeof val === 'object') {
      result[key] = merge(result[key], val);
    } else {
      result[key] = val;
    }
  }

  for (var i = 0, l = arguments.length; i < l; i++) {
    forEach(arguments[i], assignValue);
  }
  return result;
}

/**
 * Extends object a by mutably adding to it the properties of object b.
 *
 * @param {Object} a The object to be extended
 * @param {Object} b The object to copy properties from
 * @param {Object} thisArg The object to bind function to
 * @return {Object} The resulting value of object a
 */
function extend(a, b, thisArg) {
  forEach(b, function assignValue(val, key) {
    if (thisArg && typeof val === 'function') {
      a[key] = bind(val, thisArg);
    } else {
      a[key] = val;
    }
  });
  return a;
}

module.exports = {
  isArray: isArray,
  isArrayBuffer: isArrayBuffer,
  isBuffer: isBuffer,
  isFormData: isFormData,
  isArrayBufferView: isArrayBufferView,
  isString: isString,
  isNumber: isNumber,
  isObject: isObject,
  isUndefined: isUndefined,
  isDate: isDate,
  isFile: isFile,
  isBlob: isBlob,
  isFunction: isFunction,
  isStream: isStream,
  isURLSearchParams: isURLSearchParams,
  isStandardBrowserEnv: isStandardBrowserEnv,
  forEach: forEach,
  merge: merge,
  extend: extend,
  trim: trim
};

},{"./helpers/bind":15,"is-buffer":26}],26:[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}],27:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**This class is automatically generated by LayaAirIDE, please do not make any modifications. */
const Assistant_1 = require("./script/Assistant");
const PageScript_1 = require("./publicScript/PageScript");
const Screen_1 = require("./publicScript/Screen");
const trendList_1 = require("./template/trendList");
const Card_1 = require("./script/Card");
const grandPrix_1 = require("./script/grandPrix");
const PageNavScript_1 = require("./publicScript/PageNavScript");
const prixList_1 = require("./template/prixList");
const Guessing_1 = require("./script/Guessing");
const numberListDomScript_1 = require("./template/numberListDomScript");
const Home_1 = require("./script/Home");
const loadingScene_1 = require("./script/loadingScene");
const priHistoryScene_1 = require("./script/priHistoryScene");
const priHistory_1 = require("./template/priHistory");
const Record_1 = require("./script/Record");
const joinRecords_1 = require("./template/joinRecords");
const previousRecords_1 = require("./template/previousRecords");
const shortListed_1 = require("./script/shortListed");
const shortListedList_1 = require("./template/shortListedList");
const pswInput_1 = require("./template/pswInput");
const rankingList_1 = require("./template/rankingList");
const rechargeDialog_1 = require("./template/rechargeDialog");
const rocketDialog_1 = require("./view/rocketDialog");
const tipDialog_1 = require("./template/tipDialog");
const winningList_1 = require("./template/winningList");
const winning_1 = require("./script/winning");
/*
* 游戏初始化配置;
*/
class GameConfig {
    constructor() { }
    static init() {
        var reg = Laya.ClassUtils.regClass;
        reg("script/Assistant.ts", Assistant_1.default);
        reg("publicScript/PageScript.ts", PageScript_1.default);
        reg("publicScript/Screen.ts", Screen_1.default);
        reg("template/trendList.ts", trendList_1.default);
        reg("script/Card.ts", Card_1.default);
        reg("script/grandPrix.ts", grandPrix_1.default);
        reg("publicScript/PageNavScript.ts", PageNavScript_1.default);
        reg("template/prixList.ts", prixList_1.default);
        reg("script/Guessing.ts", Guessing_1.default);
        reg("template/numberListDomScript.ts", numberListDomScript_1.default);
        reg("script/Home.ts", Home_1.default);
        reg("script/loadingScene.ts", loadingScene_1.default);
        reg("script/priHistoryScene.ts", priHistoryScene_1.default);
        reg("template/priHistory.ts", priHistory_1.default);
        reg("script/Record.ts", Record_1.default);
        reg("template/joinRecords.ts", joinRecords_1.default);
        reg("template/previousRecords.ts", previousRecords_1.default);
        reg("script/shortListed.ts", shortListed_1.default);
        reg("template/shortListedList.ts", shortListedList_1.default);
        reg("template/pswInput.ts", pswInput_1.default);
        reg("template/rankingList.ts", rankingList_1.default);
        reg("template/rechargeDialog.ts", rechargeDialog_1.default);
        reg("view/rocketDialog.ts", rocketDialog_1.default);
        reg("template/tipDialog.ts", tipDialog_1.default);
        reg("template/winningList.ts", winningList_1.default);
        reg("script/winning.ts", winning_1.default);
    }
}
GameConfig.width = 750;
GameConfig.height = 1334;
GameConfig.scaleMode = "fixedwidth";
GameConfig.screenMode = "none";
GameConfig.alignV = "top";
GameConfig.alignH = "left";
GameConfig.startScene = "loadingScene.scene";
GameConfig.sceneRoot = "";
GameConfig.debug = false;
GameConfig.stat = false;
GameConfig.physicsDebug = false;
GameConfig.exportSceneToJson = true;
exports.default = GameConfig;
GameConfig.init();
},{"./publicScript/PageNavScript":36,"./publicScript/PageScript":37,"./publicScript/Screen":38,"./script/Assistant":39,"./script/Card":40,"./script/Guessing":41,"./script/Home":42,"./script/Record":43,"./script/grandPrix":44,"./script/loadingScene":45,"./script/priHistoryScene":46,"./script/shortListed":47,"./script/winning":48,"./template/joinRecords":49,"./template/numberListDomScript":50,"./template/previousRecords":51,"./template/priHistory":52,"./template/prixList":53,"./template/pswInput":54,"./template/rankingList":55,"./template/rechargeDialog":56,"./template/shortListedList":57,"./template/tipDialog":58,"./template/trendList":59,"./template/winningList":60,"./view/rocketDialog":65}],28:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GameConfig_1 = require("./GameConfig");
const rocketDialog_1 = require("./view/rocketDialog");
const loadingResList_1 = require("./loadingResList");
const socket_1 = require("./js/socket");
class Main {
    constructor() {
        // 在微信中，如果跳转到游戏之前页面修改了innerWdth和innerHeight，会导致宽高计算错误
        const win = window;
        win.innerWidth = win.outerWidth;
        win.innerHeight = win.outerHeight;
        //根据IDE设置初始化引擎		
        if (window["Laya3D"])
            Laya3D.init(GameConfig_1.default.width, GameConfig_1.default.height);
        else
            Laya.init(GameConfig_1.default.width, GameConfig_1.default.height, Laya["WebGL"]);
        Laya["Physics"] && Laya["Physics"].enable();
        Laya["DebugPanel"] && Laya["DebugPanel"].enable();
        Laya.stage.scaleMode = GameConfig_1.default.scaleMode;
        Laya.stage.screenMode = GameConfig_1.default.screenMode;
        Laya.stage.bgColor = '#4955dd';
        //兼容微信不支持加载scene后缀场景
        Laya.URL.exportSceneToJson = GameConfig_1.default.exportSceneToJson;
        //打开调试面板（通过IDE设置调试模式，或者url地址增加debug=true参数，均可打开调试面板）
        if (GameConfig_1.default.debug || Laya.Utils.getQueryString("debug") == "true")
            Laya.enableDebugPanel();
        if (GameConfig_1.default.physicsDebug && Laya["PhysicsDebugDraw"])
            Laya["PhysicsDebugDraw"].enable();
        if (GameConfig_1.default.stat)
            Laya.Stat.show();
        Laya.alertGlobalError = true;
        //自定义事件
        rocketDialog_1.default.init(); //火箭开奖效果
        //激活资源版本控制，version.json由IDE发布功能自动生成，如果没有也不影响后续流程
        Laya.ResourceVersion.enable("version.json", Laya.Handler.create(this, this.onVersionLoaded), Laya.ResourceVersion.FILENAME_VERSION);
    }
    onVersionLoaded() {
        //激活大小图映射，加载小图的时候，如果发现小图在大图合集里面，则优先加载大图合集，而不是小图
        Laya.AtlasInfoManager.enable("fileconfig.json", Laya.Handler.create(this, this.onConfigLoaded));
    }
    onConfigLoaded() {
        // 连接websocket
        socket_1.Socket.createSocket();
        Laya.Scene.open(GameConfig_1.default.startScene, true, null, Laya.Handler.create(this, this.onLoadingSceneOpened));
    }
    onLoadingSceneOpened(loadingScene) {
        //预加载
        Laya.loader.load(loadingResList_1.loadingResList, Laya.Handler.create(this, this.onGameResLoaded), Laya.Handler.create(this, this.onGameResLoadProgress, [loadingScene], false));
    }
    onGameResLoadProgress(loadingScene, progress) {
        console.log(loadingScene);
        loadingScene.setProgress(progress);
    }
    onGameResLoaded() {
        //加载IDE指定的场景
        Laya.Scene.open('home.scene', true, null, Laya.Handler.create(this, (() => {
            Laya.loader.load(loadingResList_1.loadingResList1);
        })));
    }
}
//激活启动类
new Main();
},{"./GameConfig":27,"./js/socket":33,"./loadingResList":35,"./view/rocketDialog":65}],29:[function(require,module,exports){
"use strict";
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-20 14:11:26
 * @modify date 2019-02-20 14:11:26
 * @desc 数据通信及保存接口
 */
Object.defineProperty(exports, "__esModule", { value: true });
class GameModel extends Laya.EventDispatcher {
    constructor() {
        super(...arguments);
        /**保存用户信息 */
        this.userInfo = {}; //用户信息
        /**保存被购买号码 */
        this.buyGoodsArr = []; //被购买号码
        /**保存火箭数据 */
        this.rocketData = {};
        /**火箭大奖排行名单 */
        this.rocketRanking = [];
    }
    static getInstance() {
        if (!this._gameModelInstance) {
            this._gameModelInstance = new GameModel();
        }
        return this._gameModelInstance;
    }
    setUserInfo(userInfo) {
        this.userInfo = userInfo;
        this.event('getUserInfo', this.userInfo);
    }
    setGoodsArr(goodsArr) {
        this.buyGoodsArr = goodsArr;
        this.event('getbuyGoodsArr', [this.buyGoodsArr]);
    }
    setRocketData(data) {
        this.rocketData = data;
        this.event('getRocketData', this.rocketData);
    }
    /**是否开奖了 */
    isToggle(status) {
        this.event('isToggle', status);
    }
    /**通知中奖 */
    noticeFunc(status) {
        this.event('getNotice', status);
    }
    setRocketRanking(data) {
        this.rocketRanking = data;
        this.event('getRocketRanking', [this.rocketRanking]);
    }
}
exports.GameModel = GameModel;
},{}],30:[function(require,module,exports){
"use strict";
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-20 15:15:08
 * @modify date 2019-02-20 15:15:08
 * @desc api接口统一封装处理
 */
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("./http");
const GameModel_1 = require("./GameModel");
exports.default = {
    /**获取用户信息 */
    getUserInfo() {
        return new Promise((resolve, reject) => {
            http_1.get('/user/getInfo', {}).then((res) => {
                if (!res.code) {
                    // 保存用户信息
                    GameModel_1.GameModel.getInstance().setUserInfo(res.userInfo);
                    resolve(res);
                }
                else {
                    GameModel_1.GameModel.getInstance().setUserInfo({});
                    reject(res);
                }
            });
        });
    },
    /**获取今日大奖池 */
    getRankToday() {
        return new Promise((resolve, reject) => {
            http_1.get('/rank/today', {}).then((res) => {
                if (!res.code) {
                    resolve(res);
                }
                else {
                    reject(res);
                }
            });
        });
    },
    /**获取大奖池历史记录
     * @param countTime [选填] 日期
     */
    getRankHistory(countTime) {
        return new Promise((resolve, reject) => {
            http_1.get('/rank/history', { countTime }).then((res) => {
                if (!res.code) {
                    resolve(res);
                }
                else {
                    reject(res);
                }
            });
        });
    },
    /**获取首页商品列表 */
    getGoodsList() {
        return new Promise((resolve, reject) => {
            http_1.get('/goods/index', {}).then((res) => {
                if (!res.code) {
                    resolve(res);
                }
                else {
                    reject(res);
                }
            });
        });
    },
    /**获取商品详情
     * @param goodsId 商品id
     */
    getGoodsDetails(goodsId) {
        return new Promise((resolve, reject) => {
            http_1.get('/goods/get', { goodsId }).then((res) => {
                if (!res.code) {
                    resolve(res);
                }
                else {
                    reject(res);
                }
            });
        });
    },
    /**获取参与记录
     * @param page [选填] 页码1
     * @param pageSize  [选填] 分页数 默认20
     */
    getMyOrders(page = 1, pageSize = 20) {
        return new Promise((resolve, reject) => {
            http_1.get('/order/myOrders', { page, pageSize }).then((res) => {
                if (!res.code) {
                    resolve(res);
                }
                else {
                    reject(res);
                }
            });
        });
    },
    /**获取往期记录
     * @param page [选填] 页码1
     * @param pageSize  [选填] 分页数 默认20
     * @param countTime [选填] 查询时间
     * @param searchKey [选填] 查询期号
     */
    getGoodsHistory(page = 1, pageSize = 20, countTime, searchKey) {
        return new Promise((resolve, reject) => {
            http_1.get('/goods/history', { page, pageSize, countTime, searchKey }).then((res) => {
                if (!res.code) {
                    resolve(res);
                }
                else {
                    reject(res);
                }
            });
        });
    },
    /**获取商品类型 */
    getGoodsCateList() {
        return new Promise((resolve, reject) => {
            http_1.get('/goods/cateList', {}).then((res) => {
                if (!res.code) {
                    resolve(res);
                }
                else {
                    reject(res);
                }
            });
        });
    },
    /**获取走势
     * @param goodsType 商品类型
     * @param page [选填] 页码1
     * @param pageSize [选填] 分页数 默认20
     */
    getGoodsTrend(goodsType, page = 1, pageSize = 20) {
        return new Promise((resolve, reject) => {
            http_1.get('/goods/trend', { goodsType, page, pageSize }).then((res) => {
                if (!res.code) {
                    resolve(res);
                }
                else {
                    reject(res);
                }
            });
        });
    },
    /**获取喜从天降中奖名单
     * @param page [选填] 页码1
     * @param pageSize  [选填] 分页数 默认20
     */
    getXctjList(page = 1, pageSize = 20) {
        return new Promise((resolve, reject) => {
            http_1.get('/Xctj/bonusLists', { page, pageSize }).then((res) => {
                if (!res.code) {
                    resolve(res);
                }
                else {
                    reject(res);
                }
            });
        });
    },
    /**获取入围名单
     * @param page [选填] 页码1
     * @param pageSize  [选填] 分页数 默认20
     * @param date [选填] 时间
     */
    getShortListed(page = 1, pageSize = 20, date) {
        return new Promise((resolve, reject) => {
            http_1.get('/Xctj/shortListed', { page, pageSize, date }).then((res) => {
                if (!res.code) {
                    resolve(res);
                }
                else {
                    reject(res);
                }
            });
        });
    },
    /**购买
     * @param period 期号
     * @param codeList 所选号码
     * @param exchangePwd 交易密码
     */
    postTradeBuy(period, codeList, exchangePwd) {
        return new Promise((resolve, reject) => {
            http_1.post('/trade/buy', { period, codeList, exchangePwd }).then((res) => {
                if (!res.code) {
                    this.getUserInfo();
                    resolve(res);
                }
                else {
                    reject(res);
                }
            });
        });
    },
};
},{"./GameModel":29,"./http":31}],31:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:45:06
 * @modify date 2019-02-19 17:45:06
 * @desc axios网络请求封装
 */
const axios_1 = require("axios");
axios_1.default.defaults.timeout = 10000;
axios_1.default.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
axios_1.default.defaults.withCredentials = true; //请求携带cookie
// axios.defaults.crossDomain = true;  //请求携带额外数据(不包含cookie)
const domain = document.domain;
if (domain.indexOf('t-center') >= 0 || domain === 'localhost') {
    axios_1.default.defaults.baseURL = 'https://t-api.xyhj.io/v1/w/zh/';
    // axios.defaults.baseURL = 'https://game.xyhj.io/v1/w/zh'
}
else {
    axios_1.default.defaults.baseURL = 'https://game.xyhj.io/v1/w/zh';
}
/**将post数据转为formData格式 */
function formDataFunc(params) {
    const form = new FormData();
    for (const key in params) {
        form.append(key, params[key]);
    }
    return form;
}
/**游戏平台接口 */
const gameCenter = ['/user/login', '/user/getInfo'];
//http request 拦截器
axios_1.default.interceptors.request.use(config => {
    //设置AHost
    if (config.url.indexOf('/user/') >= 0) {
        config.headers['AHost'] = 'gameCenter';
    }
    else {
        config.headers['AHost'] = 'starRocket';
    }
    if (config.method == 'post') {
        config.data = formDataFunc(Object.assign({}, config.data));
    }
    else if (config.method == 'get') {
        config.params = Object.assign({}, config.params);
    }
    return config;
}, error => {
    return Promise.reject(error);
});
//http response 拦截器
axios_1.default.interceptors.response.use(response => {
    if (!response.data.success) {
        //错误处理
    }
    return response;
}, error => {
    return Promise.reject(error);
});
/**
 * 封装get方法
 * @param url
 * @param data
 * @returns {Promise}
 */
function get(url, params) {
    return new Promise((resolve, reject) => {
        axios_1.default.get(url, { params }).then(response => {
            if (!response.data.success) {
                resolve(response.data.error);
            }
            else {
                resolve(response.data.payload);
            }
        }).catch(err => {
            reject(err);
        });
    });
}
exports.get = get;
/**
 * 封装post请求
 * @param url
 * @param data
 * @returns {Promise}
 */
function post(url, data) {
    return new Promise((resolve, reject) => {
        axios_1.default.post(url, data).then(response => {
            if (!response.data.success) {
                resolve(response.data.error);
            }
            else {
                resolve(response.data.payload);
            }
        }, err => {
            reject(err);
        });
    });
}
exports.post = post;
},{"axios":1}],32:[function(require,module,exports){
"use strict";
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-03-15 14:52:34
 * @modify date 2019-03-15 14:52:34
 * @desc laya公共工具方法
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    getScreen() {
        const sceneContainer = Laya.Scene.root;
        for (let i = 0; i < sceneContainer.numChildren; i++) {
            const child = sceneContainer.getChildAt(i);
            if (child instanceof Laya.Scene) {
                return child;
            }
        }
        return null;
    }
};
},{}],33:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GameModel_1 = require("./GameModel");
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-21 11:46:15
 * @modify date 2019-02-21 11:46:15
 * @desc websocket连接
 */
//{"appId":"luckyrocket","event":[{"toggle":0,"type":"type_value","expireTime":0}]}
class Socket extends Laya.UIComponent {
    /**建立连接 */
    static createSocket() {
        const userInfo = GameModel_1.GameModel.getInstance().userInfo;
        if (userInfo.userId) {
            Socket.WS_URL = Socket.WS_URL + `&uid=${userInfo.userId}`;
        }
        if (!Socket.WS) {
            // Socket.WS.close()
            Socket.WS = new WebSocket(Socket.WS_URL);
            Socket.WS.onopen = Socket.onopenWS;
            Socket.WS.onmessage = Socket.onmessageWS;
            Socket.WS.onerror = Socket.onerrorWS;
            Socket.WS.onclose = Socket.oncloseWS;
        }
    }
    /**打开WS之后发送心跳 */
    static onopenWS() {
        Socket.sendPing(); //发送心跳
    }
    /**连接失败重连 */
    static onerrorWS() {
        Socket.WS.close();
        Socket.createSocket(); //重连
    }
    /**WS数据接收统一处理 */
    static onmessageWS(e) {
        let redata;
        let payload;
        if (e.data === 'ok' || e.data === 'pong') {
            redata = e.data; // 数据
        }
        else {
            redata = JSON.parse(e.data); // 数据
            payload = redata.payload;
            // 下发购买号码
            if (payload.type === 'purchased') {
                GameModel_1.GameModel.getInstance().setGoodsArr(payload.goods);
            }
            // 下发首页数据
            if (payload.type === 'index') {
                // 刷新火箭数据
                GameModel_1.GameModel.getInstance().setRocketData(payload.ranking);
                // 是否开奖了
                if (payload.toggle) {
                    GameModel_1.GameModel.getInstance().isToggle(true);
                }
            }
            // 下发中奖名单
            if (payload.type === 'winning') {
                GameModel_1.GameModel.getInstance().noticeFunc(true);
            }
            // 下发火箭大奖排行名单
            if (payload.type === 'ranking') {
                GameModel_1.GameModel.getInstance().setRocketRanking(payload.userInfo);
            }
        }
    }
    /**发送数据 */
    static sendWSPush(type, toggle = 1) {
        let obj = {
            "appId": "luckyrocketApp",
            "event": [
                {
                    "type": type,
                    "toggle": toggle,
                    "expireTime": 1800
                }
            ]
        };
        if (Socket.WS !== null && Socket.WS.readyState === 3) {
            Socket.WS.close();
            Socket.createSocket(); //重连
        }
        else if (Socket.WS.readyState === 1) {
            Socket.WS.send(JSON.stringify(obj));
        }
        else if (Socket.WS.readyState === 0) {
            setTimeout(() => {
                Socket.WS.send(JSON.stringify(obj));
            }, 2000);
        }
    }
    /**关闭WS */
    static oncloseWS() {
        console.log('断开连接');
    }
    /**发送心跳 */
    static sendPing() {
        Socket.WS.send('ping');
        Socket.setIntervalWesocketPush = setInterval(() => {
            Socket.WS.send('ping');
        }, 30000);
    }
}
Socket.WS_URL = `wss://t-wss.xyhj.io/ws?appid=luckyrocketApp`;
Socket.WS = '';
/**30秒一次心跳 */
Socket.setIntervalWesocketPush = null;
exports.Socket = Socket;
},{"./GameModel":29}],34:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:45:28
 * @modify date 2019-02-19 17:45:28
 * @desc 工具函数集合
 */
exports.default = {
    /**
     * 千分位格式化
     * @param {number | string} num 格式化数字
     */
    comdify(num) {
        return num.toString().replace(/\d+/, function (n) {
            return n.replace(/(\d)(?=(\d{3})+$)/g, function ($1) {
                return $1 + ",";
            });
        });
    },
    /**
     * 复制
     * @param {string} copyInfo 复制内容
     */
    Copy(copyInfo) {
        return new Promise((resolve, reject) => {
            let copyUrl = document.createElement("input"); //创建一个input框获取需要复制的文本内容
            copyUrl.value = copyInfo;
            let appDiv = document.getElementById('app');
            appDiv.appendChild(copyUrl);
            copyUrl.select();
            document.execCommand("Copy");
            copyUrl.remove();
            resolve(true);
        });
    },
    /** 判断是否为手机*/
    isPhone(num) {
        var reg = /^1[3456789]\d{9}$/;
        return reg.test(num);
    },
    /**
     * 倒计时
     * @param {string | number} times 剩余毫秒数
     * @param {function} callback 回调函数
     */
    countDown(times, callback) {
        let timer = null;
        timer = setInterval(() => {
            if (times > 0) {
                let day = Math.floor(times / (60 * 60 * 24));
                let hour = Math.floor(times / (60 * 60)) - (day * 24);
                let minute = Math.floor(times / 60) - (day * 24 * 60) - (hour * 60);
                let second = Math.floor(times) - (day * 24 * 60 * 60) - (hour * 60 * 60) - (minute * 60);
                day = `${day < 10 ? '0' : ''}${day}`;
                hour = `${hour < 10 ? '0' : ''}${hour}`;
                minute = `${minute < 10 ? '0' : ''}${minute}`;
                second = `${second < 10 ? '0' : ''}${second}`;
                callback(`${hour}:${minute}:${second}`);
                times--;
            }
            else {
                clearInterval(timer);
                callback(false);
            }
        }, 1000);
        if (times <= 0) {
            clearInterval(timer);
            callback(false);
        }
    },
    /**
     * 将格式化日期转换成时间戳
     * @param {string} myDate 格式化日期
     */
    formatDate(x, y) {
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
            return ((v.length > 1 ? "0" : "") + eval("z." + v.slice(-1))).slice(-(v.length > 2 ? v.length : 2));
        });
    },
    /**
   * 将时间戳转换成格式化日期
   * @param {string} timeStamp 时间戳
   */
    formatDateTime(timeStamp) {
        var date = new Date();
        date.setTime(timeStamp * 1000);
        var y = date.getFullYear();
        var m = date.getMonth() + 1;
        m = m < 10 ? ('0' + m) : m;
        var d = date.getDate();
        d = d < 10 ? ('0' + d) : d;
        var h = date.getHours();
        h = h < 10 ? ('0' + h) : h;
        var minute = date.getMinutes();
        var second = date.getSeconds();
        minute = minute < 10 ? ('0' + minute) : minute;
        second = second < 10 ? ('0' + second) : second;
        return y + '-' + m + '-' + d + ' ' + h + ':' + minute + ':' + second;
    },
    /**
     * 保留n位小数
     * @param {string | number} cnum 需要保留的数据
     * @param {string} cindex 保留的小数位数
     */
    toDecimal(cnum, cindex) {
        let value = String(cnum);
        if (value.indexOf(".") > 0) {
            var left = value.substr(0, value.indexOf("."));
            var right = value.substr(value.indexOf(".") + 1, value.length);
            if (right.length > cindex) {
                right = right.substr(0, cindex);
            }
            value = left + "." + right;
            return value;
        }
        else {
            return cnum;
        }
    },
    /**加法运算 */
    accAdd(arg1, arg2) {
        let r1, r2, m;
        try {
            r1 = arg1.toString().split(".")[1].length;
        }
        catch (e) {
            r1 = 0;
        }
        try {
            r2 = arg2.toString().split(".")[1].length;
        }
        catch (e) {
            r2 = 0;
        }
        m = Math.pow(10, Math.max(r1, r2));
        return (arg1 * m + arg2 * m) / m;
    },
    /**减法运算 */
    accSub(arg1, arg2) {
        let r1, r2, m, n;
        try {
            r1 = arg1.toString().split(".")[1].length;
        }
        catch (e) {
            r1 = 0;
        }
        try {
            r2 = arg2.toString().split(".")[1].length;
        }
        catch (e) {
            r2 = 0;
        }
        m = Math.pow(10, Math.max(r1, r2));
        n = (r1 >= r2) ? r1 : r2;
        return ((arg1 * m - arg2 * m) / m).toFixed(n);
    },
    /**除法运算 */
    accDiv(arg1, arg2) {
        let t1 = 0, t2 = 0, r1, r2;
        try {
            t1 = arg1.toString().split(".")[1].length;
        }
        catch (e) { }
        ;
        try {
            t2 = arg2.toString().split(".")[1].length;
        }
        catch (e) { }
        ;
        r1 = Number(arg1.toString().replace(".", ""));
        r2 = Number(arg2.toString().replace(".", ""));
        return (r1 / r2) * Math.pow(10, t2 - t1);
    },
    /**乘法运算 */
    accMul(arg1, arg2) {
        let m = 0, s1 = arg1.toString(), s2 = arg2.toString();
        try {
            m += s1.split(".")[1].length;
        }
        catch (e) { }
        try {
            m += s2.split(".")[1].length;
        }
        catch (e) { }
        return Number(s1.replace(".", "")) * Number(s2.replace(".", "")) / Math.pow(10, m);
    },
};
},{}],35:[function(require,module,exports){
"use strict";
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-28 11:29:41
 * @modify date 2019-02-28 11:29:41
 * @desc 资源列表
 */
Object.defineProperty(exports, "__esModule", { value: true });
// 首页资源
const comp = [
    { url: "res/atlas/comp.atlas", type: "atlas" },
    { url: "res/atlas/comp/home.atlas", type: "atlas" },
    { url: "res/atlas/comp/home/fire.atlas", type: "atlas" },
    { url: "res/atlas/comp/home/wave.atlas", type: "atlas" },
    { url: "comp/img_star_bg01.png", type: "image" },
];
const scene = [
    { url: "Card.json", type: "json" },
    { url: "home.json", type: "json" },
    { url: "Tabbar.json", type: "json" },
];
exports.loadingResList = [
    ...comp,
    ...scene
];
//首页之后加载
const comp1 = [
    { url: "comp/img_payment_bg01.png", type: "image" },
    { url: "comp/img_ranklist_bg01.png", type: "image" },
    { url: "comp/img_rocketRanking_bg01.png", type: "image" },
    { url: "comp/img_banner01.png", type: "image" },
    { url: "comp/img_myrank01.png", type: "image" },
    { url: "comp/img_rank01.png", type: "image" },
    { url: "comp/img_trend_banner01.png", type: "image" },
    { url: "comp/img_xctj_bg01.png", type: "image" },
];
const scene1 = [
    { url: "template/showRocket.json", type: "json" },
    { url: "template/numberListDOM.json", type: "json" },
    { url: "template/InputPwdDialog.json", type: "json" },
    { url: "template/TipsDialog.json", type: "json" },
    // { url: "template/rechargeDialog.json", type: "json" },
    { url: "template/joinRecords.json", type: "json" },
    { url: "template/previousRecords.json", type: "json" },
    { url: "template/prixList.json", type: "json" },
    { url: "template/priHistory.json", type: "json" },
    { url: "template/rankingList.json", type: "json" },
    { url: "template/shortList.json", type: "json" },
    { url: "template/trendList.json", type: "json" },
    { url: "template/winningList.json", type: "json" },
    { url: "guessing.json", type: "json" },
    { url: "record.json", type: "json" },
    { url: "assistant.json", type: "json" },
    { url: "grandPrix.json", type: "json" },
    { url: "priHistoryScene.json", type: "json" },
    { url: "shortListed.json", type: "json" },
    { url: "xctj.json", type: "json" },
];
exports.loadingResList1 = [
    ...comp1,
    ...scene1
];
},{}],36:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:45:46
 * @modify date 2019-02-19 17:45:46
 * @desc 页面跳转脚本，用于编辑模式插入
 */
const Tabbar_1 = require("../view/Tabbar");
class PageNavScript extends Laya.Script {
    constructor() {
        super();
        /** @prop {name:navPageScript,tips:'要跳转的scene',type:String,default:''} */
        this.navPageScript = '';
    }
    onClick() {
        Tabbar_1.Tabbar.getInstance().openScene(this.navPageScript);
    }
}
exports.default = PageNavScript;
},{"../view/Tabbar":63}],37:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:46:08
 * @modify date 2019-02-19 17:46:08
 * @desc 页面跳转类，在代码中使用
 */
const Tabbar_1 = require("../view/Tabbar");
class PageScript extends Laya.Script {
    constructor() {
        super();
        /** @prop {name:showTab,tips:'是否有Tabbar',type:Bool,default:true} */
        this.showTab = true;
    }
    onEnable() {
        if (this.showTab) {
            Tabbar_1.Tabbar.show();
        }
    }
    onDisable() {
        Tabbar_1.Tabbar.hide();
    }
}
exports.default = PageScript;
},{"../view/Tabbar":63}],38:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:46:30
 * @modify date 2019-02-19 17:46:30
 * @desc 屏幕自适应脚本
 */
class Screen extends Laya.Script {
    constructor() {
        super();
        /** @prop {name:bgColor,tips:'背景颜色','type:String,default:'#0a0738'} */
        this.bgColor = '#0a0738';
    }
    onEnable() {
        Laya.stage.on(Laya.Event.RESIZE, this, this.onResize);
        this.onResize();
    }
    onDisable() {
        Laya.stage.off(Laya.Event.RESIZE, this, this.onResize);
    }
    onResize() {
        const _that = this.owner;
        _that.width = Laya.stage.width;
        _that.height = Laya.stage.height;
        _that.graphics.drawRect(0, 0, Laya.stage.width, Laya.stage.height, this.bgColor);
    }
}
exports.default = Screen;
},{}],39:[function(require,module,exports){
"use strict";
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-21 16:34:21
 * @modify date 2019-02-21 16:34:21
 * @desc 助手页面脚本
 */
Object.defineProperty(exports, "__esModule", { value: true });
const layaMaxUI_1 = require("../ui/layaMaxUI");
const api_1 = require("../js/api");
const Toast_1 = require("../view/Toast");
const screenUtils_1 = require("../js/screenUtils");
class Assistant extends layaMaxUI_1.ui.assistantUI {
    constructor() {
        super();
        this.cateListArr = [];
        this.selectGoodsType = '';
        this.tabType = 1;
        this.page = 1;
        this.btn_trend.on(Laya.Event.CLICK, this, this.tabSwitch, [1]);
        this.btn_prebuy.on(Laya.Event.CLICK, this, this.tabSwitch, [2]);
        this.on(Laya.Event.RESIZE, this, this.onResize);
    }
    onEnable() {
        this.getGoodsCateList();
        this.cateSwitch();
        //走势分析滚动加载更多
        this.trendList.scrollBar.changeHandler = Laya.Handler.create(this, this.onTrendListScrollChange, null, false);
        this.trendList.scrollBar.on(Laya.Event.END, this, this.onTrendListScrollEnd);
    }
    /**获取商品类型 */
    getGoodsCateList() {
        api_1.default.getGoodsCateList().then((res) => {
            this.cateListArr = res;
            const GoodsNameArr = [];
            res.forEach((item) => {
                GoodsNameArr.push(item.goodsName);
            });
            this.cateTabList.repeatX = GoodsNameArr.length;
            this.cateTabList.array = GoodsNameArr;
            this.cateTabList.selectedIndex = 0;
        }).catch((err) => {
            console.log(err.message);
        });
    }
    /**获取走势列表 */
    getGoodsTrend(goodsType, page = 1) {
        api_1.default.getGoodsTrend(goodsType, page).then((res) => {
            if (this.trendList.array !== null) {
                this.trendList.array = [...this.trendList.array, ...res];
            }
            else {
                this.trendList.array = res;
            }
            if (this.trendList.array.length > 0) {
                this.trendList.visible = true;
            }
            else {
                this.noData.visible = true;
            }
        }).catch((err) => {
            this.noData.visible = true;
            console.log(err.message);
        });
    }
    /**
     * 切换列表
     * @param type 1:走势分析  2：预购
     */
    tabSwitch(type) {
        if (screenUtils_1.default.getScreen().name === 'record' && this.tabType === type) {
            return;
        }
        this.tabType = type;
        if (type === 2) {
            Toast_1.Toast.show('暂未开放，敬请期待');
        }
        // this.cateTabList.selectedIndex = 0;
        // if (this.tabType === 1) {
        //     this.btn_trend.skin = 'comp/guessing/img_tab_active.png';
        //     this.btn_prebuy.skin = 'comp/guessing/img_tab.png';
        //     this.listTitle.visible = true;
        //     if (this.trendList.array === null || this.trendList.array.length === 0) {
        //         this.noData.visible = true;
        //     }else {
        //         this.noData.visible = false;
        //         this.trendList.visible = true;
        //     }
        //     this.prebuy.scrollTo(0)
        //     this.prebuy.visible = false;
        // }else{
        //     this.btn_prebuy.skin = 'comp/guessing/img_tab_active.png';
        //     this.btn_trend.skin = 'comp/guessing/img_tab.png';
        //     this.listTitle.visible = false;
        //     if (this.prebuy.array === null || this.prebuy.array.length === 0) {
        //         this.noData.visible = true;
        //     }else {
        //         this.noData.visible = false;
        //         this.prebuy.visible = true;
        //     }
        //     this.trendList.scrollTo(0);
        //     this.trendList.visible = false;
        // }
    }
    /**商品类型切换 */
    cateSwitch() {
        this.cateTabList.selectHandler = new Laya.Handler(this, (selectedIndex) => {
            this.selectGoodsType = this.cateListArr[selectedIndex].goodsType;
            if (this.tabType === 1) {
                this.trendList.array = [];
                this.page = 1;
                this.getGoodsTrend(this.selectGoodsType, this.page);
            }
            else {
                console.log('暂未开放', this.selectGoodsType);
            }
            //改变tab选中状态
            let i = this.cateTabList.startIndex;
            this.cateTabList.cells.forEach((cell) => {
                cell.selected = i === selectedIndex;
                i++;
            });
        });
    }
    /**监视屏幕大小变化 */
    onResize() {
        //列表高度适配 = 屏幕高度 - (banner + tabbar)
        this.trendList.height = this.height - 600;
        const trendNumber = this.trendList.height / 100;
        this.trendList.repeatY = Math.ceil(trendNumber);
        this.prebuy.height = this.height - 600;
        const prebuyNumber = this.prebuy.height / 100;
        this.trendList.repeatY = Math.ceil(prebuyNumber);
    }
    /**参与记录列表滚动 */
    onTrendListScrollChange(v) {
        if (v > this.trendList.scrollBar.max + Assistant.HALF_SCROLL_ELASTIC_DISTANCE) {
            this._isScrollOverElasticDistance = true;
        }
    }
    onTrendListScrollEnd() {
        if (this._isScrollOverElasticDistance) {
            this._isScrollOverElasticDistance = false;
            this.page = this.page + 1;
            this.getGoodsTrend(this.selectGoodsType, this.page);
        }
    }
}
Assistant.HALF_SCROLL_ELASTIC_DISTANCE = 100;
exports.default = Assistant;
},{"../js/api":30,"../js/screenUtils":32,"../ui/layaMaxUI":61,"../view/Toast":64}],40:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:47:11
 * @modify date 2019-02-19 17:47:11
 * @desc 首页商品卡脚本
 */
const layaMaxUI_1 = require("../ui/layaMaxUI");
const Tabbar_1 = require("../view/Tabbar");
const utils_1 = require("../js/utils");
class Card extends layaMaxUI_1.ui.CardUI {
    constructor() {
        super();
        this.on(Laya.Event.CLICK, this, this.clickItem);
    }
    set dataSource(item) {
        this._dataSource = item;
        if (item) {
            //金币图片,  1-400金币图标2;   501-1000金币图标4;  1001以上金币图标20
            if (+item.goodsValue <= 400) {
                this.cardItem.skin = `comp/home/img_jinbi_2.png`;
            }
            else if (+item.goodsValue <= 1000) {
                this.cardItem.skin = `comp/home/img_jinbi_4.png`;
            }
            else if (+item.goodsValue >= 1001) {
                this.cardItem.skin = `comp/home/img_jinbi_20.png`;
            }
            this.sceneImg.skin = `comp/home/img_scene_${item.totalNum}.png`;
            this.goodsName.text = `${+item.goodsValue} USDT`;
            this.award.text = `${utils_1.default.toDecimal(item.award, 2)}`;
            this.soldNum_totalNum.text = `${item.soldNum}/${item.totalNum}`;
            this.progress.value = +`${item.soldNum / item.totalNum}`;
        }
    }
    clickItem() {
        if (this._dataSource !== null) {
            Tabbar_1.Tabbar.getInstance().openScene('guessing.scene', this._dataSource.goodsId);
        }
    }
}
exports.default = Card;
},{"../js/utils":34,"../ui/layaMaxUI":61,"../view/Tabbar":63}],41:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:47:58
 * @modify date 2019-02-19 17:47:58
 * @desc 购买页面脚本
 */
const layaMaxUI_1 = require("../ui/layaMaxUI");
const Toast_1 = require("../view/Toast");
const utils_1 = require("../js/utils");
const pswInput_1 = require("../template/pswInput");
const GameModel_1 = require("../js/GameModel");
const api_1 = require("../js/api");
const socket_1 = require("../js/socket");
class Guessing extends layaMaxUI_1.ui.guessingUI {
    constructor() {
        super();
        this.goodsId = ''; //商品ID
        this._period = ''; //期号
        this.selectNumber = 0; //选中个数
        this.unitPrice = 0; //单价
        this.totalPrice = 0; //总价
        this.myAmount = 0; //总资产
        this.numberArr = []; //未选中的数据
        this.halfArr = []; //一半的未选中数据
        this.rawDataArr_new = []; //镜像数组
        this.rawDataArr = []; //原始数据
        this.codeList = ''; //购买号码
        this.btn_buy.on(Laya.Event.CLICK, this, this.buyFunc);
        // 选择按钮组绑定事件
        this.random_one.on(Laya.Event.CLICK, this, this.selectFunc, [1]);
        this.random_before.on(Laya.Event.CLICK, this, this.selectFunc, [2]);
        this.random_after.on(Laya.Event.CLICK, this, this.selectFunc, [3]);
        this.random_all.on(Laya.Event.CLICK, this, this.selectFunc, [4]);
    }
    onEnable() {
        console.log('进入页面');
        //获取用户资产
        const userInfo = GameModel_1.GameModel.getInstance().userInfo;
        this.balance.text = `${utils_1.default.toDecimal(userInfo.money, 2)} USDT`;
        this.myAmount = +`${utils_1.default.toDecimal(userInfo.money, 2)}`;
        if (!userInfo.userId) { //未登录不显示我的余额
            this.balanceBox.visible = false;
            this.estimate.y = 80;
        }
        else {
            this.balanceBox.visible = true;
            this.estimate.y = 42;
        }
        // 监视资产变动
        GameModel_1.GameModel.getInstance().on('getUserInfo', this, ((userInfo) => {
            this.balance.text = `${utils_1.default.toDecimal(userInfo.money, 2)} USDT`;
            this.myAmount = +`${utils_1.default.toDecimal(userInfo.money, 2)}`;
        }));
        // 号码被购买变动
        GameModel_1.GameModel.getInstance().on('getbuyGoodsArr', this, (goodsArr) => {
            this.rawDataArr.forEach((item) => {
                goodsArr.forEach((v) => {
                    if (item.code === v.code) {
                        item.userId = v.userId;
                        item.buyerId = v.userId;
                    }
                });
            });
            this.progressSpeed.value = +`${goodsArr.length / this.numberList.array.length}`;
            this.soldNum_soldNum.text = `${goodsArr.length}/${this.numberList.array.length}`;
            this.numberList.array = this.rawDataArr; //号码列表
        });
    }
    onOpened(goodsId) {
        this.goodsId = goodsId;
        this.getGoodsDetails(this.goodsId);
    }
    onDisable() {
        //  关闭websocket事件
        socket_1.Socket.sendWSPush(`buy_${this._period}`, 0);
    }
    /**购买 */
    buyFunc() {
        let userInfo = Object.keys(GameModel_1.GameModel.getInstance().userInfo);
        if (userInfo.length === 0) {
            console.log('未登录跳转登录');
            window.location.href = `https://${document.domain}/#/sign_in`;
        }
        else if (this.getSelectNumber() <= 0) {
            Toast_1.Toast.show('请选择购买号码');
        }
        else if (this.totalPrice > this.myAmount) {
            Toast_1.Toast.show('余额不足');
        }
        else {
            this.inputPwd = new pswInput_1.default();
            this.inputPwd.popup();
            this.inputPwd.setData({
                period: this.period.text,
                codeList: this.codeList,
                AllCodeList: this.numberList.array
            });
            // 监听输入框组件事件
            this.inputPwd.on('refreshData', this, () => {
                this.getGoodsDetails(this.goodsId);
                this.total.text = '0 USDT';
            });
        }
    }
    /**
     * 选择按钮组
     * @param type 选择类型  1:随一  2：前半 3：后半 4：全部
     */
    selectFunc(type) {
        this.rawDataArr_new = this.rawDataArr; //初始化数组
        this.numberArr = []; //初始化数组
        this.halfArr = []; //初始化数组
        this.rawDataArr_new.forEach(item => {
            if (item.buyerId === '2') {
                item.buyerId = '0';
            }
            if (item.buyerId <= 2) {
                this.numberArr.push(item.code);
            }
        });
        if (type === 1) {
            this.randomNumber(this.numberArr, 1); //随一
        }
        else if (type === 2) {
            this.halfArr = this.numberArr.slice(0, Math.floor(this.numberArr.length / 2)); //前半
            this.randomNumber(this.halfArr, 2);
        }
        else if (type === 3) {
            this.halfArr = this.numberArr.slice(Math.floor(this.numberArr.length / 2)); //后半
            this.randomNumber(this.halfArr, 2);
        }
        else if (type === 4) {
            this.halfArr = this.numberArr; //全部
            this.randomNumber(this.halfArr, 2);
        }
    }
    /**从数组中随机取一个数
     * @param arr 数据列表
     * @param type [可选] 随机类型
     */
    randomNumber(arr, type) {
        const rand = Math.floor((Math.random() * arr.length)); //随一
        const code = arr[rand];
        if (type === 1) {
            this.rawDataArr_new.forEach(item => {
                if (item.code === code) {
                    item.buyerId = '2';
                }
            });
        }
        if (type === 2) {
            arr.forEach(el => {
                this.rawDataArr_new.forEach(item => {
                    if (el === item.code) {
                        item.buyerId = '2';
                    }
                });
            });
        }
        // this.numberList.repeatY = this.rawDataArr_new.length;
        this.numberList.array = this.rawDataArr_new;
        this.getSelectNumber();
    }
    /**获取商品详情
     * @param goodsId 商品id
     */
    getGoodsDetails(goodsId) {
        api_1.default.getGoodsDetails(goodsId).then((res) => {
            //  发送websocket事件
            this._period = res.period;
            socket_1.Socket.sendWSPush(`buy_${this._period}`);
            this.price.text = `${+res.price}`;
            this.goodsValue.text = `${+res.goodsValue} USDT`;
            this.progressSpeed.value = +`${res.soldNum / res.totalNum}`;
            this.soldNum_soldNum.text = `${res.soldNum}/${res.totalNum}`;
            this.period.text = res.period;
            this.unitPrice = +res.price;
            this.rawDataArr = res.codeList;
            this.numberList.array = this.rawDataArr; //号码列表
            this.random_one.visible = true;
            if (this.numberList.array.length > 2) {
                this.random_after.visible = true;
                this.random_before.visible = true;
                this.random_all.visible = true;
            }
            else {
                this.random_one.width = 300;
                this.random_one.centerX = 0;
            }
            this.numberList.repeatX = 5;
            this.numberList.repeatY = 4;
            this.numberList.cells.forEach((item) => {
                item.on("GetItem", this, this.getSelectNumber);
            });
        }).catch((err) => {
            console.log(err.message);
        });
    }
    /**监听统计列表数据选中个数 */
    getSelectNumber() {
        this.selectNumber = 0;
        this.codeList = '';
        this.numberList.array.forEach(item => {
            if (item.buyerId === '2') {
                this.selectNumber = this.selectNumber + 1;
                let codeString = `${this.codeList}${this.codeList.length > 0 ? ',' : ''}${item.code}`;
                this.codeList = codeString;
            }
        });
        this.total.text = utils_1.default.toDecimal((this.unitPrice * this.selectNumber), 2) + ' USDT';
        this.totalPrice = +utils_1.default.toDecimal((this.unitPrice * this.selectNumber), 2);
        return this.selectNumber;
    }
}
exports.default = Guessing;
},{"../js/GameModel":29,"../js/api":30,"../js/socket":33,"../js/utils":34,"../template/pswInput":54,"../ui/layaMaxUI":61,"../view/Toast":64}],42:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:48:16
 * @modify date 2019-02-19 17:48:16
 * @desc 首页脚本
 */
const layaMaxUI_1 = require("../ui/layaMaxUI");
const Toast_1 = require("../view/Toast");
const GameModel_1 = require("../js/GameModel");
const utils_1 = require("../js/utils");
const api_1 = require("../js/api");
// import rechargeDialog from '../template/rechargeDialog';
const screenUtils_1 = require("../js/screenUtils");
class Home extends layaMaxUI_1.ui.homeUI {
    // private rechargeDialog: rechargeDialog;//充值弹出
    constructor() {
        super();
        this.rechargeBox.on(Laya.Event.CLICK, this, this.btnRechargeFunc);
        this.buyHelp.on(Laya.Event.CLICK, this, this.openBuyHelp);
        this.putin.on(Laya.Event.CLICK, this, this.putInFunc);
        this.go_center.on(Laya.Event.CLICK, this, this.goCenter);
    }
    onEnable() {
        this.getUserInfo();
        this.rankToday();
        this.getGoodsList();
        // 监视火箭数据变动
        GameModel_1.GameModel.getInstance().on('getRocketData', this, (res) => {
            this.rocketAmount.text = `${utils_1.default.toDecimal(res.potMoney, 2)}`;
            utils_1.default.countDown(res.countDown, ((time) => {
                this.rocketCountDown.text = time;
            }));
        });
        // 是否开奖了，开奖刷新商品列表
        GameModel_1.GameModel.getInstance().on('isToggle', this, (res) => {
            if (screenUtils_1.default.getScreen().name === 'home') {
                this.getGoodsList();
            }
        });
    }
    /**充值 */
    btnRechargeFunc() {
        window.location.href = `https://${document.domain}/#/main_Page?show=recharge`;
        // Toast.show('点击充值')
        // this.rechargeDialog = new rechargeDialog();
        // this.rechargeDialog.y = Laya.stage.height - this.rechargeDialog.height;
        // this.rechargeDialog.popupEffect = Laya.Handler.create(this, this.rechargeDialogPopupFun);
        // this.rechargeDialog.closeEffect = Laya.Handler.create(this, this.rechargeDialogCloseFun);
        // this.rechargeDialog.popup();
    }
    /**空投 */
    putInFunc() {
        // Tabbar.getInstance().openScene('xctj.scene')
        Toast_1.Toast.show('暂未开放，敬请期待');
    }
    /**获取个人信息 */
    getUserInfo() {
        api_1.default.getUserInfo().then((res) => {
            this.nickName.text = res.userInfo.nickName;
            this.myAmount.text = `${utils_1.default.toDecimal(res.userInfo.money, 2)}`;
            this.avatar.skin = res.userInfo.avatar;
        }).catch((err) => {
        });
    }
    /**今日大奖池 */
    rankToday() {
        api_1.default.getRankToday().then((res) => {
            this.rocketAmount.text = `${utils_1.default.toDecimal(res.potMoney, 2)}`;
            utils_1.default.countDown(res.countDown, ((time) => {
                this.rocketCountDown.text = time;
            }));
        }).catch((err) => {
            console.log(err.message);
        });
    }
    /**获取首页商品列表 */
    getGoodsList() {
        api_1.default.getGoodsList().then((res) => {
            this.list.repeatX = res.list.length;
            this.list.array = res.list;
        }).catch((err) => {
            console.log(err.message);
        });
    }
    /**玩法介绍 */
    openBuyHelp() {
        window.location.href = 'https://m.xyhj.io/#/origin/zh/buyHelp';
    }
    goCenter() {
        window.location.href = `https://${document.domain}/#/main_Page`;
    }
}
exports.default = Home;
},{"../js/GameModel":29,"../js/api":30,"../js/screenUtils":32,"../js/utils":34,"../ui/layaMaxUI":61,"../view/Toast":64}],43:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:48:28
 * @modify date 2019-02-19 17:48:28
 * @desc 记录页面脚本
 */
const layaMaxUI_1 = require("../ui/layaMaxUI");
const api_1 = require("../js/api");
const screenUtils_1 = require("../js/screenUtils");
class Record extends layaMaxUI_1.ui.recordUI {
    constructor() {
        super();
        this.page = 1;
        this.screenType = 1;
        this.canyu.on(Laya.Event.CLICK, this, this.tabSwitch, [1]);
        this.wangqi.on(Laya.Event.CLICK, this, this.tabSwitch, [2]);
        this.on(Laya.Event.RESIZE, this, this.onResize);
    }
    onEnable() {
        this.getMyOrders();
        // this.getGoodsHistory();
        //参与记录滚动加载更多
        this.joinList.scrollBar.changeHandler = Laya.Handler.create(this, this.onJoinListScrollChange, null, false);
        this.joinList.scrollBar.on(Laya.Event.END, this, this.onJoinListScrollEnd);
        //往期记录滚动加载更多
        this.previoousList.scrollBar.changeHandler = Laya.Handler.create(this, this.onPrevioousListScrollChange, null, false);
        this.previoousList.scrollBar.on(Laya.Event.END, this, this.onPrevioousListScrollEnd);
    }
    /**获取参与记录 */
    getMyOrders(page = 1) {
        api_1.default.getMyOrders(page).then((res) => {
            if (this.joinList.array !== null) {
                this.joinList.array = [...this.joinList.array, ...res];
            }
            else {
                this.joinList.array = res;
            }
            if (this.joinList.array.length > 0) {
                this.noData.visible = false;
                this.joinList.visible = true;
            }
            else {
                this.noData.visible = true;
            }
        }).catch((err) => {
            this.noData.visible = true;
            console.log(err.message);
        });
    }
    /**获取往期记录 */
    getGoodsHistory(page) {
        api_1.default.getGoodsHistory(page).then((res) => {
            if (this.previoousList.array !== null) {
                this.previoousList.array = [...this.previoousList.array, ...res];
            }
            else {
                this.previoousList.array = res;
            }
            if (this.previoousList.array.length > 0) {
                this.noData.visible = false;
                this.previoousList.visible = true;
            }
            else {
                this.noData.visible = true;
            }
        }).catch((err) => {
            this.noData.visible = true;
            console.log(err.message);
        });
    }
    /**
     * 切换记录列表
     * @param type 1:参与记录  2：往期记录
     */
    tabSwitch(type) {
        if (screenUtils_1.default.getScreen().name === 'record' && this.screenType === type) {
            return;
        }
        this.screenType = type;
        this.page = 1;
        if (type === 1) {
            this.canyu.skin = 'comp/img_tab_active.png';
            this.wangqi.skin = 'comp/img_tab.png';
            this.getMyOrders();
            this.previoousList.scrollTo(0);
            this.previoousList.visible = false;
            this.previoousList.array = [];
        }
        else {
            this.wangqi.skin = 'comp/img_tab_active.png';
            this.canyu.skin = 'comp/img_tab.png';
            this.getGoodsHistory();
            this.joinList.scrollTo(0);
            this.joinList.visible = false;
            this.joinList.array = [];
        }
    }
    /**监视屏幕大小变化 */
    onResize() {
        //列表高度适配 = 屏幕高度 - (banner + tabbar)
        this.joinList.height = this.height - 430;
        this.previoousList.height = this.height - 430;
    }
    /**参与记录列表滚动 */
    onJoinListScrollChange(v) {
        if (v > this.joinList.scrollBar.max + Record.HALF_SCROLL_ELASTIC_DISTANCE) {
            this._isScrollOverElasticDistance = true;
        }
    }
    onJoinListScrollEnd() {
        if (this._isScrollOverElasticDistance) {
            this._isScrollOverElasticDistance = false;
            // this.event(GameEvent.NEXT_PAGE);
            this.page = this.page + 1;
            this.getMyOrders(this.page);
            // console.log(LogFlag.get(LogFlag.UI), "next page");
        }
    }
    /**参与记录列表滚动 */
    onPrevioousListScrollChange(v) {
        if (v > this.previoousList.scrollBar.max + Record.HALF_SCROLL_ELASTIC_DISTANCE) {
            this._isScrollOverElasticDistance = true;
        }
    }
    onPrevioousListScrollEnd() {
        if (this._isScrollOverElasticDistance) {
            this._isScrollOverElasticDistance = false;
            this.page = this.page + 1;
            this.getGoodsHistory(this.page);
        }
    }
}
Record.HALF_SCROLL_ELASTIC_DISTANCE = 100;
exports.default = Record;
},{"../js/api":30,"../js/screenUtils":32,"../ui/layaMaxUI":61}],44:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-20 10:27:25
 * @modify date 2019-02-20 10:27:25
 * @desc 火箭大奖页面
 */
const layaMaxUI_1 = require("../ui/layaMaxUI");
const utils_1 = require("../js/utils");
const api_1 = require("../js/api");
const Tabbar_1 = require("../view/Tabbar");
const GameModel_1 = require("../js/GameModel");
class grandPrix extends layaMaxUI_1.ui.grandPrixUI {
    constructor() {
        super();
        this.rankPrizeHelp.on(Laya.Event.CLICK, this, this.openRankPrizeHelp);
        this.btn_history.on(Laya.Event.CLICK, this, this.Btnhistory);
    }
    onEnable() {
        this.getRankToday();
        Laya.stage.on(Laya.Event.RESIZE, this, this.onResize);
        this.onResize();
        // 监视火箭数据变动
        GameModel_1.GameModel.getInstance().on('getRocketData', this, (res) => {
            this.bonus.text = `${utils_1.default.toDecimal(res.potMoney, 2)}`;
            utils_1.default.countDown(res.countDown, ((time) => {
                this.CountDown.text = time;
            }));
        });
    }
    onDisable() {
        Laya.stage.off(Laya.Event.RESIZE, this, this.onResize);
    }
    /**获取大奖信息 */
    getRankToday() {
        api_1.default.getRankToday().then((res) => {
            this.bonus.text = `${utils_1.default.toDecimal(res.potMoney, 2)}`;
            utils_1.default.countDown(res.countDown, ((time) => {
                this.CountDown.text = time;
            }));
            if (res.list.length === 0) {
                this.noData.visible = true;
            }
            //第一名
            if (res.list.list1.data.length > 0) {
                this.box1.visible = true;
                this.alone1.text = `独得 ${utils_1.default.toDecimal(res.list.list1.dividmoney, 2)} USDT`;
                this.Proportion1.text = `占奖池${res.list.list1.percent}`;
                this.prixList1.array = res.list.list1.data;
            }
            // 2-5名
            if (res.list.list2.data.length > 0) {
                this.box2.visible = true;
                this.alone2.text = `每人 ${utils_1.default.toDecimal(res.list.list2.dividmoney / 4, 2)} USDT`;
                this.Proportion2.text = `占奖池${res.list.list2.percent}`;
                this.prixList2.array = res.list.list2.data;
            }
            // 5-15名
            if (res.list.list3.data.length > 0) {
                this.box3.visible = true;
                this.alone3.text = `每人 ${utils_1.default.toDecimal(res.list.list3.dividmoney / 10, 2)} USDT`;
                this.Proportion3.text = `占奖池${res.list.list3.percent}`;
                this.prixList3.array = res.list.list3.data;
            }
            //未登录则不显示个人排名
            if (res.list.self.userId) {
                this.myRankBox.visible = true;
                this.myranking.text = res.list.self.rank > 15 ? '15+' : `${res.list.self.rank}`;
                this.avatar.skin = res.list.self.avatar;
                this.nickName.text = res.list.self.nickName;
                this.uid.text = res.list.self.userId;
                this.volume.text = `${utils_1.default.toDecimal(res.list.self.consum, 2)} USDT`;
            }
        }).catch((err) => {
            console.log(err.message);
        });
    }
    Btnhistory() {
        Tabbar_1.Tabbar.getInstance().openScene('priHistoryScene.scene');
    }
    /**说明 */
    openRankPrizeHelp() {
        window.location.href = 'https://m.xyhj.io/#/origin/zh/rankPrizeHelp';
    }
    onResize() {
        this.listBox.height = Laya.stage.height - 700;
    }
}
exports.default = grandPrix;
},{"../js/GameModel":29,"../js/api":30,"../js/utils":34,"../ui/layaMaxUI":61,"../view/Tabbar":63}],45:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-03-18 16:59:13
 * @modify date 2019-03-18 16:59:13
 * @desc 页面加载loading
 */
const layaMaxUI_1 = require("../ui/layaMaxUI");
class loadingScene extends layaMaxUI_1.ui.loadingSceneUI {
    constructor() {
        super();
    }
    setProgress(value) {
        console.log(value, '当前进度');
        this.loadingProgress.value = value;
        let val = `${value * 100}`;
        this.progress.text = `${parseInt(val, 0)}%`;
        this.rocketloading.x = 365 * value;
    }
}
exports.default = loadingScene;
},{"../ui/layaMaxUI":61}],46:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-20 10:27:25
 * @modify date 2019-02-20 10:27:25
 * @desc 火箭大奖历史记录页面
 */
const layaMaxUI_1 = require("../ui/layaMaxUI");
const utils_1 = require("../js/utils");
const api_1 = require("../js/api");
class grandPrix extends layaMaxUI_1.ui.priHistorySceneUI {
    constructor() {
        super();
    }
    onEnable() {
        this.getRankHistory();
        Laya.stage.on(Laya.Event.RESIZE, this, this.onResize);
        this.onResize();
    }
    onDisable() {
        Laya.stage.off(Laya.Event.RESIZE, this, this.onResize);
    }
    /**获取大奖信息 */
    getRankHistory() {
        api_1.default.getRankHistory().then((res) => {
            this.total.text = `总奖金:${utils_1.default.toDecimal(res.potMoney, 2)} USDT`;
            if (res.list.list1.data.length === 0 && res.list.list2.data.length === 0 && res.list.list3.data.length === 0) {
                this.listBox.visible = false;
                this.noData.visible = true;
            }
            //第一名
            if (res.list.list1.data.length > 0) {
                this.listBox.visible = true;
                this.box1.visible = true;
                this.alone1.text = `独得 ${utils_1.default.toDecimal(res.list.list1.dividmoney, 2)} USDT`;
                this.Proportion1.text = `占奖池${res.list.list1.percent}`;
                this.prixList1.array = res.list.list1.data;
            }
            // 2-5名
            if (res.list.list2.data.length > 0) {
                this.listBox.visible = true;
                this.box2.visible = true;
                this.alone2.text = `每人 ${utils_1.default.toDecimal(res.list.list2.dividmoney / 4, 2)} USDT`;
                this.Proportion2.text = `占奖池${res.list.list2.percent}`;
                this.prixList2.array = res.list.list2.data;
            }
            // 5-15名
            if (res.list.list3.data.length > 0) {
                this.listBox.visible = true;
                this.box3.visible = true;
                this.alone3.text = `每人 ${utils_1.default.toDecimal(res.list.list3.dividmoney / 10, 2)} USDT`;
                this.Proportion3.text = `占奖池${res.list.list3.percent}`;
                this.prixList3.array = res.list.list3.data;
            }
        }).catch((err) => {
            console.log(err.message);
        });
    }
    onResize() {
        this.listBox.height = Laya.stage.height - 200;
    }
}
exports.default = grandPrix;
},{"../js/api":30,"../js/utils":34,"../ui/layaMaxUI":61}],47:[function(require,module,exports){
"use strict";
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-26 11:07:39
 * @modify date 2019-02-26 11:07:39
 * @desc 入围名单
 */
Object.defineProperty(exports, "__esModule", { value: true });
const layaMaxUI_1 = require("../ui/layaMaxUI");
const api_1 = require("../js/api");
class ShortListed extends layaMaxUI_1.ui.shortListedUI {
    constructor() {
        super();
        this.on(Laya.Event.RESIZE, this, this.onResize);
    }
    onEnable() {
        this.getShortListed();
    }
    getShortListed(page) {
        api_1.default.getShortListed(page).then((res) => {
            this.shortList.repeatY = res.length;
            this.shortList.array = res;
            this.shortList.visible = true;
        }).catch((err) => {
            this.noData.visible = true;
            console.log(err.message);
        });
    }
    /**监视屏幕大小变化 */
    onResize() {
        //列表高度适配
        // this.shortList.height = this.height - 100;
    }
}
exports.default = ShortListed;
},{"../js/api":30,"../ui/layaMaxUI":61}],48:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-26 10:20:15
 * @modify date 2019-02-26 10:20:15
 * @desc 喜从天降中奖名单
 */
const layaMaxUI_1 = require("../ui/layaMaxUI");
const api_1 = require("../js/api");
const Tabbar_1 = require("../view/Tabbar");
class Winning extends layaMaxUI_1.ui.xctjUI {
    constructor() {
        super();
        this.btn_shortlist.on(Laya.Event.CLICK, this, this.ShortListFunc);
        this.on(Laya.Event.RESIZE, this, this.onResize);
    }
    onEnable() {
        this.getXctjList();
    }
    getXctjList(page) {
        api_1.default.getXctjList(page).then((res) => {
            this.winningList.repeatY = res.length;
            this.winningList.array = res;
            this.winningList.visible = true;
        }).catch((err) => {
            this.noData.visible = true;
            console.log(err.message);
        });
    }
    /**查看今日入围名单 */
    ShortListFunc() {
        Tabbar_1.Tabbar.getInstance().openScene('shortListed.scene');
    }
    /**监视屏幕大小变化 */
    onResize() {
        //列表高度适配 = 屏幕高度 - banner
        this.winningList.height = this.height - 600;
    }
}
exports.default = Winning;
},{"../js/api":30,"../ui/layaMaxUI":61,"../view/Tabbar":63}],49:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:48:40
 * @modify date 2019-02-19 17:48:40
 * @desc 参与记录脚本
 */
const layaMaxUI_1 = require("../ui/layaMaxUI");
const utils_1 = require("../js/utils");
class joinRecord extends layaMaxUI_1.ui.template.joinRecordsUI {
    constructor() {
        super();
    }
    set dataSource(item) {
        this._dataSource = item;
        if (item) {
            this.period.text = item.period;
            this.goodsValue.text = `${+utils_1.default.toDecimal(item.goodsValue, 2)}`;
            this.codeList.text = item.codeList.length > 38 ? `${item.codeList.substr(0, 38)}...` : item.codeList;
            if (item.status === '0') {
                this.noPrize.visible = true;
                this.noPrize.text = '未开奖';
                this.openTime.text = '-';
                this.hitCode.text = '-';
            }
            else if (item.status === '1') {
                this.noPrize.visible = true;
                this.noPrize.text = '开奖中';
                this.openTime.text = '-';
                this.hitCode.text = '-';
            }
            else if (item.status === '2' && !item.hit) {
                this.noPrize.visible = true;
                this.noPrize.text = '未中奖';
                this.openTime.text = utils_1.default.formatDateTime(item.openTime);
                this.hitCode.text = item.hitCode;
            }
            else if (item.status === '2' && item.hit) {
                this.prize.visible = true;
                this.openTime.text = utils_1.default.formatDateTime(item.openTime);
                this.hitCode.text = item.hitCode;
                this.award.visible = true;
                this.award.text = `${+utils_1.default.toDecimal(item.award, 2)} USDT`;
            }
        }
    }
}
exports.default = joinRecord;
},{"../js/utils":34,"../ui/layaMaxUI":61}],50:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:48:50
 * @modify date 2019-02-19 17:48:50
 * @desc 购买页面号码列表脚本
 */
const layaMaxUI_1 = require("../ui/layaMaxUI");
const Toast_1 = require("../view/Toast");
const GameModel_1 = require("../js/GameModel");
class numberListDOM extends layaMaxUI_1.ui.template.numberListDOMUI {
    constructor() {
        super();
        this.userId = '';
        this.on(Laya.Event.CLICK, this, this.clickNumber);
    }
    set dataSource(item) {
        this._dataSource = item;
        if (item) {
            this.code.text = item.code;
            this.bgImg.skin = this.returnStatusImg(item.buyerId);
        }
    }
    onEnable() {
        //获取用户资产
        const userInfo = GameModel_1.GameModel.getInstance().userInfo;
        this.userId = userInfo.userId;
    }
    /**
     * 选择号码
     * @param item 当前按钮
     */
    clickNumber(item) {
        if (+this._dataSource.buyerId > 10) { //用户id必大于10，作为判断依据
            Toast_1.Toast.show('该号码已被购买');
            return;
        }
        else if (this._dataSource.buyerId === '0') {
            this.bgImg.skin = this.returnStatusImg('2');
            this._dataSource.buyerId = '2';
        }
        else if (this._dataSource.buyerId === '2') {
            this.bgImg.skin = this.returnStatusImg('0');
            this._dataSource.buyerId = '0';
        }
        this.event("GetItem");
    }
    /**
     * 根据状态返回对应图片
     * @param buyerId  0：可选 2：选中 大于10:不可选  等于自己userId：已选
     *
    */
    returnStatusImg(buyerId) {
        if (buyerId === this.userId) {
            return 'comp/img_yixuan_select20.png';
        }
        else if (+buyerId > 10) { //用户id必大于10，作为判断依据
            return 'comp/img_no_select20.png';
        }
        else if (buyerId === '2') {
            return 'comp/img_ok_select20.png';
        }
        else {
            return 'comp/img_kexuan_select20.png';
        }
    }
}
exports.default = numberListDOM;
},{"../js/GameModel":29,"../ui/layaMaxUI":61,"../view/Toast":64}],51:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:49:08
 * @modify date 2019-02-19 17:49:08
 * @desc 往期记录脚本
 */
const layaMaxUI_1 = require("../ui/layaMaxUI");
const utils_1 = require("../js/utils");
class previousRecord extends layaMaxUI_1.ui.template.previousRecordsUI {
    constructor() {
        super();
        this.txHash.on(Laya.Event.CLICK, this, this.seeHash);
    }
    set dataSource(item) {
        this._dataSource = item;
        if (item) {
            this.period.text = item.period;
            this.goodsName.text = item.goodsName;
            this.txHash.text = item.txHash;
            this.hitCode.text = item.hitCode;
            this.openTime.text = utils_1.default.formatDateTime(item.openTime);
            this.joinedNum.text = item.joinedNum;
        }
    }
    /**查看哈希 */
    seeHash() {
        const domain = document.domain;
        if (domain.indexOf('t-center') >= 0 || domain === 'localhost') {
            window.location.href = `https://ropsten.etherscan.io/tx/${this._dataSource.txHash}`;
        }
        else {
            window.location.href = `https://etherscan.io/tx/${this._dataSource.txHash}`;
        }
    }
}
exports.default = previousRecord;
},{"../js/utils":34,"../ui/layaMaxUI":61}],52:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-22 11:40:42
 * @modify date 2019-02-22 11:40:42
 * @desc 火箭大奖历史记录脚本
 */
const layaMaxUI_1 = require("../ui/layaMaxUI");
const utils_1 = require("../js/utils");
class priHistory extends layaMaxUI_1.ui.template.priHistoryUI {
    constructor() {
        super();
    }
    set dataSource(item) {
        if (item) {
            this.rankNo.text = item.rank < 10 ? `0${item.rank}` : `${item.rank}`;
            this.nickName.text = item.nickName;
            this.UID.text = `UID: ${item.userId}`;
            this.Volume.text = `${utils_1.default.toDecimal(item.consum, 2)} USDT`;
        }
    }
}
exports.default = priHistory;
},{"../js/utils":34,"../ui/layaMaxUI":61}],53:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-22 11:40:42
 * @modify date 2019-02-22 11:40:42
 * @desc 火箭大奖排行榜
 */
const layaMaxUI_1 = require("../ui/layaMaxUI");
const utils_1 = require("../js/utils");
class prixList extends layaMaxUI_1.ui.template.prixListUI {
    constructor() {
        super();
    }
    set dataSource(item) {
        if (item) {
            this.no1.visible = item.rank === 1 ? true : false;
            this.rankNo.visible = item.rank === 1 ? false : true;
            this.rankNo.text = item.rank;
            this.avatar.skin = item.avatar;
            this.nickName.text = item.nickName;
            this.UID.text = `UID: ${item.userId}`;
            this.todayVolume.text = `${utils_1.default.toDecimal(item.consum, 2)} USDT`;
        }
    }
}
exports.default = prixList;
},{"../js/utils":34,"../ui/layaMaxUI":61}],54:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:49:23
 * @modify date 2019-02-19 17:49:23
 * @desc 交易密码输入弹窗脚本
 */
const layaMaxUI_1 = require("../ui/layaMaxUI");
const tipDialog_1 = require("./tipDialog");
const Toast_1 = require("../view/Toast");
const api_1 = require("../js/api");
class IptPswDom extends layaMaxUI_1.ui.template.InputPwdDialogUI {
    constructor() {
        super();
        this.period = ''; //期号
        this.codeList = ''; //购买号码
        this.isEnter = false; //函数节流
        this.AllCodeList = []; //所有号码列表
    }
    onEnable() {
        this.btnClose.on(Laya.Event.CLICK, this, this.closeFunc);
        this.IptPsw.on(Laya.Event.FOCUS, this, this.onFocus);
        this.IptPsw.on(Laya.Event.BLUR, this, this.onBLUR);
        this.IptPsw.on(Laya.Event.KEY_UP, this, this.onChange);
    }
    /**获取传递的参数 */
    setData(data) {
        this.period = data.period;
        this.codeList = data.codeList;
        this.AllCodeList = data.AllCodeList;
    }
    /**输入内容改变 */
    onChange() {
        if (!this.isEnter && this.IptPsw.text.length === 6) {
            this.tradeBuy();
        }
    }
    /**购买 */
    tradeBuy() {
        this.isEnter = true;
        api_1.default.postTradeBuy(this.period, this.codeList, this.IptPsw.text).then((res) => {
            this.isEnter = false;
            this.closeFunc();
            this.event("refreshData"); //刷新数据列表
            // 购买成功弹出对话框
            let tipsDialog = new tipDialog_1.default();
            tipsDialog.popup();
            tipsDialog.setData({
                AllCodeList: this.AllCodeList
            });
        }).catch((err) => {
            this.isEnter = false;
            this.closeFunc();
            Toast_1.Toast.show(err.message);
        });
    }
    /**关闭密码框 */
    closeFunc() {
        this.close();
        this.IptPsw.text = '';
    }
    /**输入框获得焦点 */
    onFocus() {
        this.top = 150;
    }
    /**输入框获得焦点 */
    onBLUR() {
        this.top = 440;
    }
}
exports.default = IptPswDom;
},{"../js/api":30,"../ui/layaMaxUI":61,"../view/Toast":64,"./tipDialog":58}],55:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-22 11:40:42
 * @modify date 2019-02-22 11:40:42
 * @desc 火箭大奖火箭名单
 */
const layaMaxUI_1 = require("../ui/layaMaxUI");
class prixList extends layaMaxUI_1.ui.template.rankingListUI {
    constructor() {
        super();
    }
    set dataSource(item) {
        if (item) {
            this.ranking.text = item.rank;
            this.nickName.text = item.nickName.length > 4 ? `${item.nickName.substr(0, 4)}...` : item.nickName;
            this.uid.text = item.userId;
            this.amount.text = item.amount;
        }
    }
}
exports.default = prixList;
},{"../ui/layaMaxUI":61}],56:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-27 10:06:18
 * @modify date 2019-02-27 10:06:18
 * @desc 充值提币弹出脚本
 */
const layaMaxUI_1 = require("../ui/layaMaxUI");
class RechargeDialog extends layaMaxUI_1.ui.template.rechargeDialogUI {
    constructor() {
        super();
    }
    onEnable() {
        this.btn_quickRecharge.on(Laya.Event.CLICK, this, this.quickRechargeFunc);
        this.btn_withdraw.on(Laya.Event.CLICK, this, this.withdrawFunc);
    }
    /**快捷充值 */
    quickRechargeFunc() {
        window.location.href = `https://${document.domain}/#/chargeKuaiBi`;
    }
    /**USDT钱包提币 */
    withdrawFunc() {
        window.location.href = `https://${document.domain}/#/walletCharge`;
    }
}
exports.default = RechargeDialog;
},{"../ui/layaMaxUI":61}],57:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-26 11:12:09
 * @modify date 2019-02-26 11:12:09
 * @desc 入围名单列表
 */
const layaMaxUI_1 = require("../ui/layaMaxUI");
class shortListBox extends layaMaxUI_1.ui.template.shortListUI {
    constructor() {
        super();
    }
    set dataSource(item) {
        if (item) {
            this.number.text = item.shortlistedNumber < 10 ? `0${item.shortlistedNumber}` : item.shortlistedNumber;
            this.nickName.text = item.nickName;
            this.userId.text = item.userId;
        }
    }
}
exports.default = shortListBox;
},{"../ui/layaMaxUI":61}],58:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:44:02
 * @modify date 2019-02-19 17:44:02
 * @desc 购买成功后的提示框脚本
 */
const layaMaxUI_1 = require("../ui/layaMaxUI");
const Tabbar_1 = require("../view/Tabbar");
class TipsDiaLog extends layaMaxUI_1.ui.template.TipsDialogUI {
    constructor() {
        super();
        this.AllCodeList = []; //号码列表
    }
    onEnable() {
        this.btnContinue.on(Laya.Event.CLICK, this, this.closeFunc);
        this.btnViewRecord.on(Laya.Event.CLICK, this, this.viewRecordFunc);
    }
    /**获取传递的参数 */
    setData(data) {
        this.AllCodeList = data.AllCodeList;
    }
    /**关闭密码框 */
    closeFunc() {
        this.close();
        // 若全部被购买，则回到首页重新选择购买期号
        let count = 0;
        this.AllCodeList.forEach((v) => {
            if (v.buyerId !== '0') {
                count = count + 1;
            }
        });
        if (count === this.AllCodeList.length) {
            Tabbar_1.Tabbar.getInstance().openScene('home.scene');
        }
    }
    // 查看记录
    viewRecordFunc() {
        this.close();
        Tabbar_1.Tabbar.getInstance().openScene('record.scene');
    }
}
exports.default = TipsDiaLog;
},{"../ui/layaMaxUI":61,"../view/Tabbar":63}],59:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-21 16:32:01
 * @modify date 2019-02-21 16:32:01
 * @desc 走势列表脚本
 */
const layaMaxUI_1 = require("../ui/layaMaxUI");
const Tabbar_1 = require("../view/Tabbar");
class trendList extends layaMaxUI_1.ui.template.trendListUI {
    constructor() {
        super();
        this.btn_buy.on(Laya.Event.CLICK, this, this.btnBuyFunc);
    }
    set dataSource(item) {
        this._item = item;
        if (item) {
            this.period.text = item.period;
            this.hitCode.text = item.hitCode;
            this.odd_even.text = item.is === 0 ? '-' : item.is === 1 ? '奇' : '偶';
            this.isBig.text = item.is === 0 ? '-' : item.isBig ? '大' : '小';
            if (item.is === 0) {
                this.btn_buy.visible = true;
                this.hitCode.visible = false;
            }
            else {
                this.btn_buy.visible = false;
                this.hitCode.visible = true;
            }
            // 奇偶文字颜色
            if (item.is === 1) {
                this.odd_even.color = '#f14848';
            }
            else if (item.is === 2) {
                this.odd_even.color = '#25fffd';
            }
            // 大小文字颜色
            if (!item.isBig && item.is !== 0) {
                this.isBig.color = '#f14848';
            }
            else if (item.isBig && item.is !== 0) {
                this.isBig.color = '#25fffd';
            }
        }
    }
    /**立即购买 */
    btnBuyFunc() {
        if (this._item !== null) {
            Tabbar_1.Tabbar.getInstance().openScene('guessing.scene', this._item.goodsId);
        }
    }
}
exports.default = trendList;
},{"../ui/layaMaxUI":61,"../view/Tabbar":63}],60:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-26 10:21:37
 * @modify date 2019-02-26 10:21:37
 * @desc 喜从天降中奖名单列表脚本
 */
const layaMaxUI_1 = require("../ui/layaMaxUI");
const utils_1 = require("../js/utils");
class WinningList extends layaMaxUI_1.ui.template.winningListUI {
    constructor() {
        super();
    }
    set dataSource(item) {
        if (item) {
            this.period.text = item.belongTime;
            this.date.text = utils_1.default.formatDateTime(item.balanceTime);
            this.nickName.text = item.nickName;
            this.amount.text = `${+item.money} USDT`;
            this.code.text = item.hitNumber;
        }
    }
}
exports.default = WinningList;
},{"../js/utils":34,"../ui/layaMaxUI":61}],61:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ui;
(function (ui) {
    class assistantUI extends Laya.Scene {
        constructor() { super(); }
        createChildren() {
            super.createChildren();
            this.loadScene("assistant");
        }
    }
    ui.assistantUI = assistantUI;
    class CardUI extends Laya.View {
        constructor() { super(); }
        createChildren() {
            super.createChildren();
            this.loadScene("Card");
        }
    }
    ui.CardUI = CardUI;
    class grandPrixUI extends Laya.Scene {
        constructor() { super(); }
        createChildren() {
            super.createChildren();
            this.loadScene("grandPrix");
        }
    }
    ui.grandPrixUI = grandPrixUI;
    class guessingUI extends Laya.Scene {
        constructor() { super(); }
        createChildren() {
            super.createChildren();
            this.loadScene("guessing");
        }
    }
    ui.guessingUI = guessingUI;
    class homeUI extends Laya.Scene {
        constructor() { super(); }
        createChildren() {
            super.createChildren();
            this.loadScene("home");
        }
    }
    ui.homeUI = homeUI;
    class loadingSceneUI extends Laya.Scene {
        constructor() { super(); }
        createChildren() {
            super.createChildren();
            this.loadScene("loadingScene");
        }
    }
    ui.loadingSceneUI = loadingSceneUI;
    class priHistorySceneUI extends Laya.Scene {
        constructor() { super(); }
        createChildren() {
            super.createChildren();
            this.loadScene("priHistoryScene");
        }
    }
    ui.priHistorySceneUI = priHistorySceneUI;
    class recordUI extends Laya.Scene {
        constructor() { super(); }
        createChildren() {
            super.createChildren();
            this.loadScene("record");
        }
    }
    ui.recordUI = recordUI;
    class shortListedUI extends Laya.Scene {
        constructor() { super(); }
        createChildren() {
            super.createChildren();
            this.loadScene("shortListed");
        }
    }
    ui.shortListedUI = shortListedUI;
    class TabbarUI extends Laya.View {
        constructor() { super(); }
        createChildren() {
            super.createChildren();
            this.loadScene("Tabbar");
        }
    }
    ui.TabbarUI = TabbarUI;
    class xctjUI extends Laya.Scene {
        constructor() { super(); }
        createChildren() {
            super.createChildren();
            this.loadScene("xctj");
        }
    }
    ui.xctjUI = xctjUI;
})(ui = exports.ui || (exports.ui = {}));
(function (ui) {
    var template;
    (function (template) {
        class InputPwdDialogUI extends Laya.Dialog {
            constructor() { super(); }
            createChildren() {
                super.createChildren();
                this.loadScene("template/InputPwdDialog");
            }
        }
        template.InputPwdDialogUI = InputPwdDialogUI;
        class joinRecordsUI extends Laya.View {
            constructor() { super(); }
            createChildren() {
                super.createChildren();
                this.loadScene("template/joinRecords");
            }
        }
        template.joinRecordsUI = joinRecordsUI;
        class numberListDOMUI extends Laya.View {
            constructor() { super(); }
            createChildren() {
                super.createChildren();
                this.loadScene("template/numberListDOM");
            }
        }
        template.numberListDOMUI = numberListDOMUI;
        class previousRecordsUI extends Laya.View {
            constructor() { super(); }
            createChildren() {
                super.createChildren();
                this.loadScene("template/previousRecords");
            }
        }
        template.previousRecordsUI = previousRecordsUI;
        class priHistoryUI extends Laya.Scene {
            constructor() { super(); }
            createChildren() {
                super.createChildren();
                this.loadScene("template/priHistory");
            }
        }
        template.priHistoryUI = priHistoryUI;
        class prixListUI extends Laya.Scene {
            constructor() { super(); }
            createChildren() {
                super.createChildren();
                this.loadScene("template/prixList");
            }
        }
        template.prixListUI = prixListUI;
        class rankingListUI extends Laya.Scene {
            constructor() { super(); }
            createChildren() {
                super.createChildren();
                this.loadScene("template/rankingList");
            }
        }
        template.rankingListUI = rankingListUI;
        class rechargeDialogUI extends Laya.Dialog {
            constructor() { super(); }
            createChildren() {
                super.createChildren();
                this.loadScene("template/rechargeDialog");
            }
        }
        template.rechargeDialogUI = rechargeDialogUI;
        class shortListUI extends Laya.Scene {
            constructor() { super(); }
            createChildren() {
                super.createChildren();
                this.loadScene("template/shortList");
            }
        }
        template.shortListUI = shortListUI;
        class showRocketUI extends Laya.Dialog {
            constructor() { super(); }
            createChildren() {
                super.createChildren();
                this.loadScene("template/showRocket");
            }
        }
        template.showRocketUI = showRocketUI;
        class TipsDialogUI extends Laya.Dialog {
            constructor() { super(); }
            createChildren() {
                super.createChildren();
                this.loadScene("template/TipsDialog");
            }
        }
        template.TipsDialogUI = TipsDialogUI;
        class trendListUI extends Laya.Scene {
            constructor() { super(); }
            createChildren() {
                super.createChildren();
                this.loadScene("template/trendList");
            }
        }
        template.trendListUI = trendListUI;
        class winningListUI extends Laya.Scene {
            constructor() { super(); }
            createChildren() {
                super.createChildren();
                this.loadScene("template/winningList");
            }
        }
        template.winningListUI = winningListUI;
    })(template = ui.template || (ui.template = {}));
})(ui = exports.ui || (exports.ui = {}));
},{}],62:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LayerType = {
    LAYER_SCENE: "LAYER_SCENE",
    LAYER_UI: "LAYER_UI",
    LAYER_MSG: "LAYER_MSG"
};
const layerMap = {};
class LayerManager {
    static init(layers) {
        layers.forEach((layerName) => {
            if (layerName === exports.LayerType.LAYER_SCENE) {
                layerMap[layerName] = Laya.Scene.root;
            }
            else {
                const layer = layerMap[layerName] = new Laya.UIComponent();
                layer.left = 0;
                layer.right = 0;
                layer.top = 0;
                layer.bottom = 0;
                Laya.stage.addChild(layer);
            }
        });
        // Laya.stage.on(Laya.Event.RESIZE, this, this.onResize);
    }
    static addToLayer(node, layerName) {
        LayerManager.checkInit();
        if (!node)
            return false;
        const layer = layerMap[layerName];
        if (!layer)
            return false;
        layer.addChild(node);
        return true;
    }
    static removeFromLayer(node, layerName) {
        LayerManager.checkInit();
        const layer = layerMap[layerName];
        if (layer) {
            const rNode = layer.removeChild(node);
            if (rNode)
                return true;
        }
        return false;
    }
    static getLayer(layerName) {
        return layerMap[layerName];
    }
    static checkInit() {
        if (LayerManager.inited) {
            return;
        }
        LayerManager.init([
            exports.LayerType.LAYER_SCENE,
            exports.LayerType.LAYER_UI,
            exports.LayerType.LAYER_MSG
        ]);
        LayerManager.inited = true;
    }
    static onResize() {
        for (const layerName in layerMap) {
            if (layerName !== exports.LayerType.LAYER_SCENE && layerMap.hasOwnProperty(layerName)) {
                const layer = layerMap[layerName];
                layer.size(Laya.stage.width, Laya.stage.height);
                layer.event(Laya.Event.RESIZE);
            }
        }
    }
}
exports.LayerManager = LayerManager;
},{}],63:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:50:10
 * @modify date 2019-02-19 17:50:10
 * @desc 底部导航Tabbar脚本
 */
const layaMaxUI_1 = require("../ui/layaMaxUI");
const GameModel_1 = require("../js/GameModel");
const tabbarArr = ['home.scene', 'record.scene', 'assistant.scene']; //tabbar的页面
const pageArr = [
    'guessing.scene', 'grandPrix.scene',
    'priHistoryScene.scene', 'xctj.scene',
    'shortListed.scene'
]; //非tabbar页面
class Tabbar extends layaMaxUI_1.ui.TabbarUI {
    static getInstance() {
        if (!this._tabbar) {
            this._tabbar = new Tabbar();
        }
        return this._tabbar;
    }
    static show() {
        let tabIns = this.getInstance();
        Laya.stage.addChild(tabIns);
    }
    static hide() {
        if (this._tabbar) {
            this._tabbar.removeSelf();
        }
    }
    onEnable() {
        GameModel_1.GameModel.getInstance().on('getNotice', this, (res) => {
            if (res) {
                this.notice.visible = true;
            }
            else {
                this.notice.visible = false;
            }
        });
    }
    /**非tabbar跳转页面,可携带参数 */
    openScene(scene, param) {
        this._openSceneParam = param;
        this.tab.selectedIndex = Tabbar.SCENES.indexOf(scene);
    }
    /**监视tabbar改变 */
    createView(view) {
        super.createView(view);
        this.tab.on(Laya.Event.CHANGE, this, this.onClickTab);
        // this.onClickTab();
    }
    /**点击tabbar事件 */
    onClickTab() {
        let userInfo = Object.keys(GameModel_1.GameModel.getInstance().userInfo);
        let scene = Tabbar.SCENES[this.tab.selectedIndex];
        if (userInfo.length === 0 && (scene === 'record.scene' || scene === 'assistant.scene')) {
            window.location.href = `https://${document.domain}/#/sign_in`;
        }
        else {
            Laya.Scene.open(scene, true, this._openSceneParam);
            this._openSceneParam = null;
            this.tab.items.forEach(item => {
                const tabBtn = item;
                const imgBtn = tabBtn.getChildAt(0);
                imgBtn.selected = false;
            });
            tabbarArr.forEach(item => {
                if (item === scene) {
                    const tabBtn = this.tab.selection;
                    const imgBtn = tabBtn.getChildAt(0);
                    imgBtn.selected = true;
                }
            });
            //关闭小红点
            if (scene === 'record.scene') {
                GameModel_1.GameModel.getInstance().noticeFunc(false);
            }
        }
    }
}
/**页面数组 */
Tabbar.SCENES = [...tabbarArr, ...pageArr];
exports.Tabbar = Tabbar;
},{"../js/GameModel":29,"../ui/layaMaxUI":61}],64:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const LayerManager_1 = require("./LayerManager");
class Toast extends Laya.UIComponent {
    constructor() {
        super();
    }
    static show(text, duration = Toast.DURATION, coverBefore = true) {
        if (!Toast.instance) {
            Toast.instance = new Toast();
            Toast.instance.on(Laya.Event.CLOSE, Toast, Toast.onClose);
        }
        if (coverBefore && Toast.instance.parent) {
            Toast.instance.setText(text);
            Toast.instance.timer.once(duration || Toast.DURATION, Toast.instance, Toast.instance.close, null, true);
        }
        else if (!Toast.instance.parent) {
            Toast.doShow(text, duration);
        }
        else {
            Toast.storeTextList.push({
                text: text,
                duration: duration
            });
        }
    }
    static doShow(text, duration) {
        Toast.instance.setText(text);
        LayerManager_1.LayerManager.addToLayer(Toast.instance, LayerManager_1.LayerType.LAYER_MSG);
        Toast.instance.timer.once(duration || Toast.DURATION, Toast.instance, Toast.instance.close, null, true);
    }
    static onClose() {
        if (Toast.storeTextList.length > 0) {
            var data = Toast.storeTextList.shift();
            Toast.doShow(data.text, data.duration);
        }
    }
    setText(text) {
        this.width = Toast.MAX_WIDTH;
        this.label.width = NaN;
        this.label.dataSource = text;
        this.onTextChange();
    }
    close() {
        this.removeSelf();
        this.event(Laya.Event.CLOSE);
    }
    createChildren() {
        this.centerX = 0;
        this.height = Toast.MARGIN + Toast.MARGIN;
        super.createChildren();
        this.bg = new Laya.Image();
        this.bg.skin = Toast.BG_IMG_URL;
        this.bg.sizeGrid = "25,25,25,25";
        this.bg.left = this.bg.right = this.bg.top = this.bg.bottom = 0;
        this.addChild(this.bg);
        this.label = new Laya.Label();
        this.label.color = Toast.COLOR;
        this.label.fontSize = Toast.FONT_SIZE;
        this.label.align = "center";
        this.label.y = Toast.TOP;
        this.label.centerX = 0;
        // this.label.centerY = 0;
        // this.label.stroke = 1;
        // this.label.strokeColor = "#000000";
        // this.label.top = Toast.MARGIN;
        // this.label.bottom = Toast.MARGIN;
        // this.label.left = Toast.MARGIN;
        // this.label.right = Toast.MARGIN;
        this.label.leading = 15;
        this.label.wordWrap = true;
        this.addChild(this.label);
    }
    // protected initialize() {
    //     super.initialize();
    //     this.bindViewEvent(this.label, Laya.Event.CHANGE, this.onTextChange);
    // }
    onTextChange() {
        let textW = this.label.width;
        const maxTextW = Toast.MAX_WIDTH - Toast.MARGIN * 2;
        // const minTextW: number = Toast.MIN_WIDTH - Toast.MARGIN * 2;
        if (textW > maxTextW) {
            this.label.width = maxTextW;
        }
        let w = this.label.width + Toast.MARGIN * 2;
        w = Math.min(w, Toast.MAX_WIDTH);
        w = Math.max(w, Toast.MIN_WIDTH);
        this.width = w;
        // this.height = this.label.height + Toast.TOP + Toast.BOTTOM;
        this.height = this.label.height + Toast.MARGIN * 2;
        this.x = (Laya.stage.width - this.width) >> 1;
        this.y = (Laya.stage.height - this.height) >> 1;
    }
    onCompResize() {
        // if (this.label) {
        //     this.height = this.label.height + MessageTip.MARGIN + MessageTip.MARGIN;
        // }
        if (this.bg) {
            this.bg.width = this.width;
            this.bg.height = this.height;
        }
    }
}
Toast.MIN_WIDTH = 200;
Toast.MAX_WIDTH = 500;
Toast.TOP = 23;
Toast.BOTTOM = 20;
Toast.MARGIN = 15;
Toast.MIN_HEIGHT = 80;
Toast.FONT_SIZE = 26;
Toast.COLOR = "#ffffff";
Toast.BG_IMG_URL = "comp/img_toast_bg.png";
Toast.DURATION = 2500;
Toast.storeTextList = [];
exports.Toast = Toast;
},{"./LayerManager":62}],65:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const layaMaxUI_1 = require("../ui/layaMaxUI");
const GameModel_1 = require("../js/GameModel");
class RocketDialog extends layaMaxUI_1.ui.template.showRocketUI {
    static get dlg() {
        if (!this._dlg) {
            this._dlg = new RocketDialog();
            this._dlg.x = 0;
            this._dlg.y = 0;
            this._dlg.isPopupCenter = false;
        }
        return this._dlg;
    }
    onEnable() {
        this.btn_close.on(Laya.Event.CLICK, this, this.closeDialog);
        this.ani1.play(0, false);
        this.ani2.play(0, false);
    }
    static init() {
        GameModel_1.GameModel.getInstance().on('getRocketRanking', this, (res) => {
            console.log(res);
            this.dlg.popup(false, false);
            this.dlg.ranking.array = res;
        });
    }
    closeDialog() {
        this.close();
    }
}
exports.default = RocketDialog;
},{"../js/GameModel":29,"../ui/layaMaxUI":61}],66:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[28])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkQ6L+i9r+S7ti9MYXlhQWlySURFL3Jlc291cmNlcy9hcHAvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvYWRhcHRlcnMveGhyLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9heGlvcy5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvY2FuY2VsL0NhbmNlbC5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvY2FuY2VsL0NhbmNlbFRva2VuLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9jYW5jZWwvaXNDYW5jZWwuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2NvcmUvQXhpb3MuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2NvcmUvSW50ZXJjZXB0b3JNYW5hZ2VyLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9jb3JlL2NyZWF0ZUVycm9yLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9jb3JlL2Rpc3BhdGNoUmVxdWVzdC5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvY29yZS9lbmhhbmNlRXJyb3IuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2NvcmUvc2V0dGxlLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9jb3JlL3RyYW5zZm9ybURhdGEuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2RlZmF1bHRzLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9oZWxwZXJzL2JpbmQuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2hlbHBlcnMvYnRvYS5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvaGVscGVycy9idWlsZFVSTC5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvaGVscGVycy9jb21iaW5lVVJMcy5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvaGVscGVycy9jb29raWVzLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9oZWxwZXJzL2lzQWJzb2x1dGVVUkwuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2hlbHBlcnMvaXNVUkxTYW1lT3JpZ2luLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9oZWxwZXJzL25vcm1hbGl6ZUhlYWRlck5hbWUuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2hlbHBlcnMvcGFyc2VIZWFkZXJzLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9oZWxwZXJzL3NwcmVhZC5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvdXRpbHMuanMiLCJub2RlX21vZHVsZXMvYXhpb3Mvbm9kZV9tb2R1bGVzL2lzLWJ1ZmZlci9pbmRleC5qcyIsInNyYy9HYW1lQ29uZmlnLnRzIiwic3JjL01haW4udHMiLCJzcmMvanMvR2FtZU1vZGVsLnRzIiwic3JjL2pzL2FwaS50cyIsInNyYy9qcy9odHRwLnRzIiwic3JjL2pzL3NjcmVlblV0aWxzLnRzIiwic3JjL2pzL3NvY2tldC50cyIsInNyYy9qcy91dGlscy50cyIsInNyYy9sb2FkaW5nUmVzTGlzdC50cyIsInNyYy9wdWJsaWNTY3JpcHQvUGFnZU5hdlNjcmlwdC50cyIsInNyYy9wdWJsaWNTY3JpcHQvUGFnZVNjcmlwdC50cyIsInNyYy9wdWJsaWNTY3JpcHQvU2NyZWVuLnRzIiwic3JjL3NjcmlwdC9Bc3Npc3RhbnQudHMiLCJzcmMvc2NyaXB0L0NhcmQudHMiLCJzcmMvc2NyaXB0L0d1ZXNzaW5nLnRzIiwic3JjL3NjcmlwdC9Ib21lLnRzIiwic3JjL3NjcmlwdC9SZWNvcmQudHMiLCJzcmMvc2NyaXB0L2dyYW5kUHJpeC50cyIsInNyYy9zY3JpcHQvbG9hZGluZ1NjZW5lLnRzIiwic3JjL3NjcmlwdC9wcmlIaXN0b3J5U2NlbmUudHMiLCJzcmMvc2NyaXB0L3Nob3J0TGlzdGVkLnRzIiwic3JjL3NjcmlwdC93aW5uaW5nLnRzIiwic3JjL3RlbXBsYXRlL2pvaW5SZWNvcmRzLnRzIiwic3JjL3RlbXBsYXRlL251bWJlckxpc3REb21TY3JpcHQudHMiLCJzcmMvdGVtcGxhdGUvcHJldmlvdXNSZWNvcmRzLnRzIiwic3JjL3RlbXBsYXRlL3ByaUhpc3RvcnkudHMiLCJzcmMvdGVtcGxhdGUvcHJpeExpc3QudHMiLCJzcmMvdGVtcGxhdGUvcHN3SW5wdXQudHMiLCJzcmMvdGVtcGxhdGUvcmFua2luZ0xpc3QudHMiLCJzcmMvdGVtcGxhdGUvcmVjaGFyZ2VEaWFsb2cudHMiLCJzcmMvdGVtcGxhdGUvc2hvcnRMaXN0ZWRMaXN0LnRzIiwic3JjL3RlbXBsYXRlL3RpcERpYWxvZy50cyIsInNyYy90ZW1wbGF0ZS90cmVuZExpc3QudHMiLCJzcmMvdGVtcGxhdGUvd2lubmluZ0xpc3QudHMiLCJzcmMvdWkvbGF5YU1heFVJLnRzIiwic3JjL3ZpZXcvTGF5ZXJNYW5hZ2VyLnRzIiwic3JjL3ZpZXcvVGFiYmFyLnRzIiwic3JjL3ZpZXcvVG9hc3QudHMiLCJzcmMvdmlldy9yb2NrZXREaWFsb2cudHMiLCJEOi/ova/ku7YvTGF5YUFpcklERS9yZXNvdXJjZXMvYXBwL25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1ZBOzs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3BMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDaEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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Q0FBQyxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsRUFBRSxVQUFVLENBQUM7WUFDaEQsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FDL0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDakMsQ0FBQztRQUNOLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUNEOzs7S0FHQztJQUNELGNBQWMsQ0FBQyxTQUFTO1FBQ3BCLElBQUksSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7UUFDdEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDL0IsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzNCLElBQUksQ0FBQyxHQUFtQixJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzVDLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNCLElBQUksQ0FBQyxHQUFtQixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDdkMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0IsSUFBSSxDQUFDLEdBQW1CLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN4QyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxD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LENBQUM7UUFDdkQsRUFBRSxHQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFDLEVBQUUsR0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxPQUFPLENBQUMsRUFBRSxHQUFDLEVBQUUsQ0FBQyxHQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFDLEVBQUUsR0FBQyxFQUFFLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBQ0QsVUFBVTtJQUNWLE1BQU0sQ0FBQyxJQUFJLEVBQUMsSUFBSTtRQUNaLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxFQUFFLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFDLEVBQUUsR0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDOUMsSUFBRztZQUFDLENBQUMsSUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtTQUFDO1FBQUEsT0FBTSxDQUFDLEVBQUMsR0FBRTtRQUN6QyxJQUFHO1lBQUMsQ0FBQyxJQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBO1NBQUM7UUFBQSxPQUFNLENBQUMsRUFBQyxHQUFFO1FBQ3pDLE9BQU8sTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUE7SUFDL0UsQ0FBQztDQUNKLENBQUE7OztBQzNLRDs7Ozs7O0dBTUc7O0FBR0gsT0FBTztBQUNQLE1B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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IChmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgZXh0ZW5kU3RhdGljcyA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fFxyXG4gICAgICAgICh7IF9fcHJvdG9fXzogW10gfSBpbnN0YW5jZW9mIEFycmF5ICYmIGZ1bmN0aW9uIChkLCBiKSB7IGQuX19wcm90b19fID0gYjsgfSkgfHxcclxuICAgICAgICBmdW5jdGlvbiAoZCwgYikgeyBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTsgfTtcclxuICAgIHJldHVybiBmdW5jdGlvbiAoZCwgYikge1xyXG4gICAgICAgIGV4dGVuZFN0YXRpY3MoZCwgYik7XHJcbiAgICAgICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XHJcbiAgICAgICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xyXG4gICAgfTtcclxufSkoKTtcclxuKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9saWIvYXhpb3MnKTsiLCIndXNlIHN0cmljdCc7XHJcblxyXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XHJcbnZhciBzZXR0bGUgPSByZXF1aXJlKCcuLy4uL2NvcmUvc2V0dGxlJyk7XHJcbnZhciBidWlsZFVSTCA9IHJlcXVpcmUoJy4vLi4vaGVscGVycy9idWlsZFVSTCcpO1xyXG52YXIgcGFyc2VIZWFkZXJzID0gcmVxdWlyZSgnLi8uLi9oZWxwZXJzL3BhcnNlSGVhZGVycycpO1xyXG52YXIgaXNVUkxTYW1lT3JpZ2luID0gcmVxdWlyZSgnLi8uLi9oZWxwZXJzL2lzVVJMU2FtZU9yaWdpbicpO1xyXG52YXIgY3JlYXRlRXJyb3IgPSByZXF1aXJlKCcuLi9jb3JlL2NyZWF0ZUVycm9yJyk7XHJcbnZhciBidG9hID0gKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5idG9hICYmIHdpbmRvdy5idG9hLmJpbmQod2luZG93KSkgfHwgcmVxdWlyZSgnLi8uLi9oZWxwZXJzL2J0b2EnKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24geGhyQWRhcHRlcihjb25maWcpIHtcclxuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gZGlzcGF0Y2hYaHJSZXF1ZXN0KHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgdmFyIHJlcXVlc3REYXRhID0gY29uZmlnLmRhdGE7XHJcbiAgICB2YXIgcmVxdWVzdEhlYWRlcnMgPSBjb25maWcuaGVhZGVycztcclxuXHJcbiAgICBpZiAodXRpbHMuaXNGb3JtRGF0YShyZXF1ZXN0RGF0YSkpIHtcclxuICAgICAgZGVsZXRlIHJlcXVlc3RIZWFkZXJzWydDb250ZW50LVR5cGUnXTsgLy8gTGV0IHRoZSBicm93c2VyIHNldCBpdFxyXG4gICAgfVxyXG5cclxuICAgIHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcbiAgICB2YXIgbG9hZEV2ZW50ID0gJ29ucmVhZHlzdGF0ZWNoYW5nZSc7XHJcbiAgICB2YXIgeERvbWFpbiA9IGZhbHNlO1xyXG5cclxuICAgIC8vIEZvciBJRSA4LzkgQ09SUyBzdXBwb3J0XHJcbiAgICAvLyBPbmx5IHN1cHBvcnRzIFBPU1QgYW5kIEdFVCBjYWxscyBhbmQgZG9lc24ndCByZXR1cm5zIHRoZSByZXNwb25zZSBoZWFkZXJzLlxyXG4gICAgLy8gRE9OJ1QgZG8gdGhpcyBmb3IgdGVzdGluZyBiL2MgWE1MSHR0cFJlcXVlc3QgaXMgbW9ja2VkLCBub3QgWERvbWFpblJlcXVlc3QuXHJcbiAgICBpZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICd0ZXN0JyAmJlxyXG4gICAgICAgIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmXHJcbiAgICAgICAgd2luZG93LlhEb21haW5SZXF1ZXN0ICYmICEoJ3dpdGhDcmVkZW50aWFscycgaW4gcmVxdWVzdCkgJiZcclxuICAgICAgICAhaXNVUkxTYW1lT3JpZ2luKGNvbmZpZy51cmwpKSB7XHJcbiAgICAgIHJlcXVlc3QgPSBuZXcgd2luZG93LlhEb21haW5SZXF1ZXN0KCk7XHJcbiAgICAgIGxvYWRFdmVudCA9ICdvbmxvYWQnO1xyXG4gICAgICB4RG9tYWluID0gdHJ1ZTtcclxuICAgICAgcmVxdWVzdC5vbnByb2dyZXNzID0gZnVuY3Rpb24gaGFuZGxlUHJvZ3Jlc3MoKSB7fTtcclxuICAgICAgcmVxdWVzdC5vbnRpbWVvdXQgPSBmdW5jdGlvbiBoYW5kbGVUaW1lb3V0KCkge307XHJcbiAgICB9XHJcblxyXG4gICAgLy8gSFRUUCBiYXNpYyBhdXRoZW50aWNhdGlvblxyXG4gICAgaWYgKGNvbmZpZy5hdXRoKSB7XHJcbiAgICAgIHZhciB1c2VybmFtZSA9IGNvbmZpZy5hdXRoLnVzZXJuYW1lIHx8ICcnO1xyXG4gICAgICB2YXIgcGFzc3dvcmQgPSBjb25maWcuYXV0aC5wYXNzd29yZCB8fCAnJztcclxuICAgICAgcmVxdWVzdEhlYWRlcnMuQXV0aG9yaXphdGlvbiA9ICdCYXNpYyAnICsgYnRvYSh1c2VybmFtZSArICc6JyArIHBhc3N3b3JkKTtcclxuICAgIH1cclxuXHJcbiAgICByZXF1ZXN0Lm9wZW4oY29uZmlnLm1ldGhvZC50b1VwcGVyQ2FzZSgpLCBidWlsZFVSTChjb25maWcudXJsLCBjb25maWcucGFyYW1zLCBjb25maWcucGFyYW1zU2VyaWFsaXplciksIHRydWUpO1xyXG5cclxuICAgIC8vIFNldCB0aGUgcmVxdWVzdCB0aW1lb3V0IGluIE1TXHJcbiAgICByZXF1ZXN0LnRpbWVvdXQgPSBjb25maWcudGltZW91dDtcclxuXHJcbiAgICAvLyBMaXN0ZW4gZm9yIHJlYWR5IHN0YXRlXHJcbiAgICByZXF1ZXN0W2xvYWRFdmVudF0gPSBmdW5jdGlvbiBoYW5kbGVMb2FkKCkge1xyXG4gICAgICBpZiAoIXJlcXVlc3QgfHwgKHJlcXVlc3QucmVhZHlTdGF0ZSAhPT0gNCAmJiAheERvbWFpbikpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFRoZSByZXF1ZXN0IGVycm9yZWQgb3V0IGFuZCB3ZSBkaWRuJ3QgZ2V0IGEgcmVzcG9uc2UsIHRoaXMgd2lsbCBiZVxyXG4gICAgICAvLyBoYW5kbGVkIGJ5IG9uZXJyb3IgaW5zdGVhZFxyXG4gICAgICAvLyBXaXRoIG9uZSBleGNlcHRpb246IHJlcXVlc3QgdGhhdCB1c2luZyBmaWxlOiBwcm90b2NvbCwgbW9zdCBicm93c2Vyc1xyXG4gICAgICAvLyB3aWxsIHJldHVybiBzdGF0dXMgYXMgMCBldmVuIHRob3VnaCBpdCdzIGEgc3VjY2Vzc2Z1bCByZXF1ZXN0XHJcbiAgICAgIGlmIChyZXF1ZXN0LnN0YXR1cyA9PT0gMCAmJiAhKHJlcXVlc3QucmVzcG9uc2VVUkwgJiYgcmVxdWVzdC5yZXNwb25zZVVSTC5pbmRleE9mKCdmaWxlOicpID09PSAwKSkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gUHJlcGFyZSB0aGUgcmVzcG9uc2VcclxuICAgICAgdmFyIHJlc3BvbnNlSGVhZGVycyA9ICdnZXRBbGxSZXNwb25zZUhlYWRlcnMnIGluIHJlcXVlc3QgPyBwYXJzZUhlYWRlcnMocmVxdWVzdC5nZXRBbGxSZXNwb25zZUhlYWRlcnMoKSkgOiBudWxsO1xyXG4gICAgICB2YXIgcmVzcG9uc2VEYXRhID0gIWNvbmZpZy5yZXNwb25zZVR5cGUgfHwgY29uZmlnLnJlc3BvbnNlVHlwZSA9PT0gJ3RleHQnID8gcmVxdWVzdC5yZXNwb25zZVRleHQgOiByZXF1ZXN0LnJlc3BvbnNlO1xyXG4gICAgICB2YXIgcmVzcG9uc2UgPSB7XHJcbiAgICAgICAgZGF0YTogcmVzcG9uc2VEYXRhLFxyXG4gICAgICAgIC8vIElFIHNlbmRzIDEyMjMgaW5zdGVhZCBvZiAyMDQgKGh0dHBzOi8vZ2l0aHViLmNvbS9heGlvcy9heGlvcy9pc3N1ZXMvMjAxKVxyXG4gICAgICAgIHN0YXR1czogcmVxdWVzdC5zdGF0dXMgPT09IDEyMjMgPyAyMDQgOiByZXF1ZXN0LnN0YXR1cyxcclxuICAgICAgICBzdGF0dXNUZXh0OiByZXF1ZXN0LnN0YXR1cyA9PT0gMTIyMyA/ICdObyBDb250ZW50JyA6IHJlcXVlc3Quc3RhdHVzVGV4dCxcclxuICAgICAgICBoZWFkZXJzOiByZXNwb25zZUhlYWRlcnMsXHJcbiAgICAgICAgY29uZmlnOiBjb25maWcsXHJcbiAgICAgICAgcmVxdWVzdDogcmVxdWVzdFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgcmVzcG9uc2UpO1xyXG5cclxuICAgICAgLy8gQ2xlYW4gdXAgcmVxdWVzdFxyXG4gICAgICByZXF1ZXN0ID0gbnVsbDtcclxuICAgIH07XHJcblxyXG4gICAgLy8gSGFuZGxlIGxvdyBsZXZlbCBuZXR3b3JrIGVycm9yc1xyXG4gICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24gaGFuZGxlRXJyb3IoKSB7XHJcbiAgICAgIC8vIFJlYWwgZXJyb3JzIGFyZSBoaWRkZW4gZnJvbSB1cyBieSB0aGUgYnJvd3NlclxyXG4gICAgICAvLyBvbmVycm9yIHNob3VsZCBvbmx5IGZpcmUgaWYgaXQncyBhIG5ldHdvcmsgZXJyb3JcclxuICAgICAgcmVqZWN0KGNyZWF0ZUVycm9yKCdOZXR3b3JrIEVycm9yJywgY29uZmlnLCBudWxsLCByZXF1ZXN0KSk7XHJcblxyXG4gICAgICAvLyBDbGVhbiB1cCByZXF1ZXN0XHJcbiAgICAgIHJlcXVlc3QgPSBudWxsO1xyXG4gICAgfTtcclxuXHJcbiAgICAvLyBIYW5kbGUgdGltZW91dFxyXG4gICAgcmVxdWVzdC5vbnRpbWVvdXQgPSBmdW5jdGlvbiBoYW5kbGVUaW1lb3V0KCkge1xyXG4gICAgICByZWplY3QoY3JlYXRlRXJyb3IoJ3RpbWVvdXQgb2YgJyArIGNvbmZpZy50aW1lb3V0ICsgJ21zIGV4Y2VlZGVkJywgY29uZmlnLCAnRUNPTk5BQk9SVEVEJyxcclxuICAgICAgICByZXF1ZXN0KSk7XHJcblxyXG4gICAgICAvLyBDbGVhbiB1cCByZXF1ZXN0XHJcbiAgICAgIHJlcXVlc3QgPSBudWxsO1xyXG4gICAgfTtcclxuXHJcbiAgICAvLyBBZGQgeHNyZiBoZWFkZXJcclxuICAgIC8vIFRoaXMgaXMgb25seSBkb25lIGlmIHJ1bm5pbmcgaW4gYSBzdGFuZGFyZCBicm93c2VyIGVudmlyb25tZW50LlxyXG4gICAgLy8gU3BlY2lmaWNhbGx5IG5vdCBpZiB3ZSdyZSBpbiBhIHdlYiB3b3JrZXIsIG9yIHJlYWN0LW5hdGl2ZS5cclxuICAgIGlmICh1dGlscy5pc1N0YW5kYXJkQnJvd3NlckVudigpKSB7XHJcbiAgICAgIHZhciBjb29raWVzID0gcmVxdWlyZSgnLi8uLi9oZWxwZXJzL2Nvb2tpZXMnKTtcclxuXHJcbiAgICAgIC8vIEFkZCB4c3JmIGhlYWRlclxyXG4gICAgICB2YXIgeHNyZlZhbHVlID0gKGNvbmZpZy53aXRoQ3JlZGVudGlhbHMgfHwgaXNVUkxTYW1lT3JpZ2luKGNvbmZpZy51cmwpKSAmJiBjb25maWcueHNyZkNvb2tpZU5hbWUgP1xyXG4gICAgICAgICAgY29va2llcy5yZWFkKGNvbmZpZy54c3JmQ29va2llTmFtZSkgOlxyXG4gICAgICAgICAgdW5kZWZpbmVkO1xyXG5cclxuICAgICAgaWYgKHhzcmZWYWx1ZSkge1xyXG4gICAgICAgIHJlcXVlc3RIZWFkZXJzW2NvbmZpZy54c3JmSGVhZGVyTmFtZV0gPSB4c3JmVmFsdWU7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBBZGQgaGVhZGVycyB0byB0aGUgcmVxdWVzdFxyXG4gICAgaWYgKCdzZXRSZXF1ZXN0SGVhZGVyJyBpbiByZXF1ZXN0KSB7XHJcbiAgICAgIHV0aWxzLmZvckVhY2gocmVxdWVzdEhlYWRlcnMsIGZ1bmN0aW9uIHNldFJlcXVlc3RIZWFkZXIodmFsLCBrZXkpIHtcclxuICAgICAgICBpZiAodHlwZW9mIHJlcXVlc3REYXRhID09PSAndW5kZWZpbmVkJyAmJiBrZXkudG9Mb3dlckNhc2UoKSA9PT0gJ2NvbnRlbnQtdHlwZScpIHtcclxuICAgICAgICAgIC8vIFJlbW92ZSBDb250ZW50LVR5cGUgaWYgZGF0YSBpcyB1bmRlZmluZWRcclxuICAgICAgICAgIGRlbGV0ZSByZXF1ZXN0SGVhZGVyc1trZXldO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAvLyBPdGhlcndpc2UgYWRkIGhlYWRlciB0byB0aGUgcmVxdWVzdFxyXG4gICAgICAgICAgcmVxdWVzdC5zZXRSZXF1ZXN0SGVhZGVyKGtleSwgdmFsKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEFkZCB3aXRoQ3JlZGVudGlhbHMgdG8gcmVxdWVzdCBpZiBuZWVkZWRcclxuICAgIGlmIChjb25maWcud2l0aENyZWRlbnRpYWxzKSB7XHJcbiAgICAgIHJlcXVlc3Qud2l0aENyZWRlbnRpYWxzID0gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBBZGQgcmVzcG9uc2VUeXBlIHRvIHJlcXVlc3QgaWYgbmVlZGVkXHJcbiAgICBpZiAoY29uZmlnLnJlc3BvbnNlVHlwZSkge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIHJlcXVlc3QucmVzcG9uc2VUeXBlID0gY29uZmlnLnJlc3BvbnNlVHlwZTtcclxuICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIC8vIEV4cGVjdGVkIERPTUV4Y2VwdGlvbiB0aHJvd24gYnkgYnJvd3NlcnMgbm90IGNvbXBhdGlibGUgWE1MSHR0cFJlcXVlc3QgTGV2ZWwgMi5cclxuICAgICAgICAvLyBCdXQsIHRoaXMgY2FuIGJlIHN1cHByZXNzZWQgZm9yICdqc29uJyB0eXBlIGFzIGl0IGNhbiBiZSBwYXJzZWQgYnkgZGVmYXVsdCAndHJhbnNmb3JtUmVzcG9uc2UnIGZ1bmN0aW9uLlxyXG4gICAgICAgIGlmIChjb25maWcucmVzcG9uc2VUeXBlICE9PSAnanNvbicpIHtcclxuICAgICAgICAgIHRocm93IGU7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gSGFuZGxlIHByb2dyZXNzIGlmIG5lZWRlZFxyXG4gICAgaWYgKHR5cGVvZiBjb25maWcub25Eb3dubG9hZFByb2dyZXNzID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgIHJlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lcigncHJvZ3Jlc3MnLCBjb25maWcub25Eb3dubG9hZFByb2dyZXNzKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBOb3QgYWxsIGJyb3dzZXJzIHN1cHBvcnQgdXBsb2FkIGV2ZW50c1xyXG4gICAgaWYgKHR5cGVvZiBjb25maWcub25VcGxvYWRQcm9ncmVzcyA9PT0gJ2Z1bmN0aW9uJyAmJiByZXF1ZXN0LnVwbG9hZCkge1xyXG4gICAgICByZXF1ZXN0LnVwbG9hZC5hZGRFdmVudExpc3RlbmVyKCdwcm9ncmVzcycsIGNvbmZpZy5vblVwbG9hZFByb2dyZXNzKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoY29uZmlnLmNhbmNlbFRva2VuKSB7XHJcbiAgICAgIC8vIEhhbmRsZSBjYW5jZWxsYXRpb25cclxuICAgICAgY29uZmlnLmNhbmNlbFRva2VuLnByb21pc2UudGhlbihmdW5jdGlvbiBvbkNhbmNlbGVkKGNhbmNlbCkge1xyXG4gICAgICAgIGlmICghcmVxdWVzdCkge1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmVxdWVzdC5hYm9ydCgpO1xyXG4gICAgICAgIHJlamVjdChjYW5jZWwpO1xyXG4gICAgICAgIC8vIENsZWFuIHVwIHJlcXVlc3RcclxuICAgICAgICByZXF1ZXN0ID0gbnVsbDtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHJlcXVlc3REYXRhID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgcmVxdWVzdERhdGEgPSBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFNlbmQgdGhlIHJlcXVlc3RcclxuICAgIHJlcXVlc3Quc2VuZChyZXF1ZXN0RGF0YSk7XHJcbiAgfSk7XHJcbn07XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcclxudmFyIGJpbmQgPSByZXF1aXJlKCcuL2hlbHBlcnMvYmluZCcpO1xyXG52YXIgQXhpb3MgPSByZXF1aXJlKCcuL2NvcmUvQXhpb3MnKTtcclxudmFyIGRlZmF1bHRzID0gcmVxdWlyZSgnLi9kZWZhdWx0cycpO1xyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSBhbiBpbnN0YW5jZSBvZiBBeGlvc1xyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gZGVmYXVsdENvbmZpZyBUaGUgZGVmYXVsdCBjb25maWcgZm9yIHRoZSBpbnN0YW5jZVxyXG4gKiBAcmV0dXJuIHtBeGlvc30gQSBuZXcgaW5zdGFuY2Ugb2YgQXhpb3NcclxuICovXHJcbmZ1bmN0aW9uIGNyZWF0ZUluc3RhbmNlKGRlZmF1bHRDb25maWcpIHtcclxuICB2YXIgY29udGV4dCA9IG5ldyBBeGlvcyhkZWZhdWx0Q29uZmlnKTtcclxuICB2YXIgaW5zdGFuY2UgPSBiaW5kKEF4aW9zLnByb3RvdHlwZS5yZXF1ZXN0LCBjb250ZXh0KTtcclxuXHJcbiAgLy8gQ29weSBheGlvcy5wcm90b3R5cGUgdG8gaW5zdGFuY2VcclxuICB1dGlscy5leHRlbmQoaW5zdGFuY2UsIEF4aW9zLnByb3RvdHlwZSwgY29udGV4dCk7XHJcblxyXG4gIC8vIENvcHkgY29udGV4dCB0byBpbnN0YW5jZVxyXG4gIHV0aWxzLmV4dGVuZChpbnN0YW5jZSwgY29udGV4dCk7XHJcblxyXG4gIHJldHVybiBpbnN0YW5jZTtcclxufVxyXG5cclxuLy8gQ3JlYXRlIHRoZSBkZWZhdWx0IGluc3RhbmNlIHRvIGJlIGV4cG9ydGVkXHJcbnZhciBheGlvcyA9IGNyZWF0ZUluc3RhbmNlKGRlZmF1bHRzKTtcclxuXHJcbi8vIEV4cG9zZSBBeGlvcyBjbGFzcyB0byBhbGxvdyBjbGFzcyBpbmhlcml0YW5jZVxyXG5heGlvcy5BeGlvcyA9IEF4aW9zO1xyXG5cclxuLy8gRmFjdG9yeSBmb3IgY3JlYXRpbmcgbmV3IGluc3RhbmNlc1xyXG5heGlvcy5jcmVhdGUgPSBmdW5jdGlvbiBjcmVhdGUoaW5zdGFuY2VDb25maWcpIHtcclxuICByZXR1cm4gY3JlYXRlSW5zdGFuY2UodXRpbHMubWVyZ2UoZGVmYXVsdHMsIGluc3RhbmNlQ29uZmlnKSk7XHJcbn07XHJcblxyXG4vLyBFeHBvc2UgQ2FuY2VsICYgQ2FuY2VsVG9rZW5cclxuYXhpb3MuQ2FuY2VsID0gcmVxdWlyZSgnLi9jYW5jZWwvQ2FuY2VsJyk7XHJcbmF4aW9zLkNhbmNlbFRva2VuID0gcmVxdWlyZSgnLi9jYW5jZWwvQ2FuY2VsVG9rZW4nKTtcclxuYXhpb3MuaXNDYW5jZWwgPSByZXF1aXJlKCcuL2NhbmNlbC9pc0NhbmNlbCcpO1xyXG5cclxuLy8gRXhwb3NlIGFsbC9zcHJlYWRcclxuYXhpb3MuYWxsID0gZnVuY3Rpb24gYWxsKHByb21pc2VzKSB7XHJcbiAgcmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKTtcclxufTtcclxuYXhpb3Muc3ByZWFkID0gcmVxdWlyZSgnLi9oZWxwZXJzL3NwcmVhZCcpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBheGlvcztcclxuXHJcbi8vIEFsbG93IHVzZSBvZiBkZWZhdWx0IGltcG9ydCBzeW50YXggaW4gVHlwZVNjcmlwdFxyXG5tb2R1bGUuZXhwb3J0cy5kZWZhdWx0ID0gYXhpb3M7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbi8qKlxyXG4gKiBBIGBDYW5jZWxgIGlzIGFuIG9iamVjdCB0aGF0IGlzIHRocm93biB3aGVuIGFuIG9wZXJhdGlvbiBpcyBjYW5jZWxlZC5cclxuICpcclxuICogQGNsYXNzXHJcbiAqIEBwYXJhbSB7c3RyaW5nPX0gbWVzc2FnZSBUaGUgbWVzc2FnZS5cclxuICovXHJcbmZ1bmN0aW9uIENhbmNlbChtZXNzYWdlKSB7XHJcbiAgdGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcclxufVxyXG5cclxuQ2FuY2VsLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nKCkge1xyXG4gIHJldHVybiAnQ2FuY2VsJyArICh0aGlzLm1lc3NhZ2UgPyAnOiAnICsgdGhpcy5tZXNzYWdlIDogJycpO1xyXG59O1xyXG5cclxuQ2FuY2VsLnByb3RvdHlwZS5fX0NBTkNFTF9fID0gdHJ1ZTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ2FuY2VsO1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG52YXIgQ2FuY2VsID0gcmVxdWlyZSgnLi9DYW5jZWwnKTtcclxuXHJcbi8qKlxyXG4gKiBBIGBDYW5jZWxUb2tlbmAgaXMgYW4gb2JqZWN0IHRoYXQgY2FuIGJlIHVzZWQgdG8gcmVxdWVzdCBjYW5jZWxsYXRpb24gb2YgYW4gb3BlcmF0aW9uLlxyXG4gKlxyXG4gKiBAY2xhc3NcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gZXhlY3V0b3IgVGhlIGV4ZWN1dG9yIGZ1bmN0aW9uLlxyXG4gKi9cclxuZnVuY3Rpb24gQ2FuY2VsVG9rZW4oZXhlY3V0b3IpIHtcclxuICBpZiAodHlwZW9mIGV4ZWN1dG9yICE9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdleGVjdXRvciBtdXN0IGJlIGEgZnVuY3Rpb24uJyk7XHJcbiAgfVxyXG5cclxuICB2YXIgcmVzb2x2ZVByb21pc2U7XHJcbiAgdGhpcy5wcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24gcHJvbWlzZUV4ZWN1dG9yKHJlc29sdmUpIHtcclxuICAgIHJlc29sdmVQcm9taXNlID0gcmVzb2x2ZTtcclxuICB9KTtcclxuXHJcbiAgdmFyIHRva2VuID0gdGhpcztcclxuICBleGVjdXRvcihmdW5jdGlvbiBjYW5jZWwobWVzc2FnZSkge1xyXG4gICAgaWYgKHRva2VuLnJlYXNvbikge1xyXG4gICAgICAvLyBDYW5jZWxsYXRpb24gaGFzIGFscmVhZHkgYmVlbiByZXF1ZXN0ZWRcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHRva2VuLnJlYXNvbiA9IG5ldyBDYW5jZWwobWVzc2FnZSk7XHJcbiAgICByZXNvbHZlUHJvbWlzZSh0b2tlbi5yZWFzb24pO1xyXG4gIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogVGhyb3dzIGEgYENhbmNlbGAgaWYgY2FuY2VsbGF0aW9uIGhhcyBiZWVuIHJlcXVlc3RlZC5cclxuICovXHJcbkNhbmNlbFRva2VuLnByb3RvdHlwZS50aHJvd0lmUmVxdWVzdGVkID0gZnVuY3Rpb24gdGhyb3dJZlJlcXVlc3RlZCgpIHtcclxuICBpZiAodGhpcy5yZWFzb24pIHtcclxuICAgIHRocm93IHRoaXMucmVhc29uO1xyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZXR1cm5zIGFuIG9iamVjdCB0aGF0IGNvbnRhaW5zIGEgbmV3IGBDYW5jZWxUb2tlbmAgYW5kIGEgZnVuY3Rpb24gdGhhdCwgd2hlbiBjYWxsZWQsXHJcbiAqIGNhbmNlbHMgdGhlIGBDYW5jZWxUb2tlbmAuXHJcbiAqL1xyXG5DYW5jZWxUb2tlbi5zb3VyY2UgPSBmdW5jdGlvbiBzb3VyY2UoKSB7XHJcbiAgdmFyIGNhbmNlbDtcclxuICB2YXIgdG9rZW4gPSBuZXcgQ2FuY2VsVG9rZW4oZnVuY3Rpb24gZXhlY3V0b3IoYykge1xyXG4gICAgY2FuY2VsID0gYztcclxuICB9KTtcclxuICByZXR1cm4ge1xyXG4gICAgdG9rZW46IHRva2VuLFxyXG4gICAgY2FuY2VsOiBjYW5jZWxcclxuICB9O1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDYW5jZWxUb2tlbjtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0NhbmNlbCh2YWx1ZSkge1xyXG4gIHJldHVybiAhISh2YWx1ZSAmJiB2YWx1ZS5fX0NBTkNFTF9fKTtcclxufTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIGRlZmF1bHRzID0gcmVxdWlyZSgnLi8uLi9kZWZhdWx0cycpO1xyXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XHJcbnZhciBJbnRlcmNlcHRvck1hbmFnZXIgPSByZXF1aXJlKCcuL0ludGVyY2VwdG9yTWFuYWdlcicpO1xyXG52YXIgZGlzcGF0Y2hSZXF1ZXN0ID0gcmVxdWlyZSgnLi9kaXNwYXRjaFJlcXVlc3QnKTtcclxuXHJcbi8qKlxyXG4gKiBDcmVhdGUgYSBuZXcgaW5zdGFuY2Ugb2YgQXhpb3NcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IGluc3RhbmNlQ29uZmlnIFRoZSBkZWZhdWx0IGNvbmZpZyBmb3IgdGhlIGluc3RhbmNlXHJcbiAqL1xyXG5mdW5jdGlvbiBBeGlvcyhpbnN0YW5jZUNvbmZpZykge1xyXG4gIHRoaXMuZGVmYXVsdHMgPSBpbnN0YW5jZUNvbmZpZztcclxuICB0aGlzLmludGVyY2VwdG9ycyA9IHtcclxuICAgIHJlcXVlc3Q6IG5ldyBJbnRlcmNlcHRvck1hbmFnZXIoKSxcclxuICAgIHJlc3BvbnNlOiBuZXcgSW50ZXJjZXB0b3JNYW5hZ2VyKClcclxuICB9O1xyXG59XHJcblxyXG4vKipcclxuICogRGlzcGF0Y2ggYSByZXF1ZXN0XHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcgVGhlIGNvbmZpZyBzcGVjaWZpYyBmb3IgdGhpcyByZXF1ZXN0IChtZXJnZWQgd2l0aCB0aGlzLmRlZmF1bHRzKVxyXG4gKi9cclxuQXhpb3MucHJvdG90eXBlLnJlcXVlc3QgPSBmdW5jdGlvbiByZXF1ZXN0KGNvbmZpZykge1xyXG4gIC8qZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOjAqL1xyXG4gIC8vIEFsbG93IGZvciBheGlvcygnZXhhbXBsZS91cmwnWywgY29uZmlnXSkgYSBsYSBmZXRjaCBBUElcclxuICBpZiAodHlwZW9mIGNvbmZpZyA9PT0gJ3N0cmluZycpIHtcclxuICAgIGNvbmZpZyA9IHV0aWxzLm1lcmdlKHtcclxuICAgICAgdXJsOiBhcmd1bWVudHNbMF1cclxuICAgIH0sIGFyZ3VtZW50c1sxXSk7XHJcbiAgfVxyXG5cclxuICBjb25maWcgPSB1dGlscy5tZXJnZShkZWZhdWx0cywge21ldGhvZDogJ2dldCd9LCB0aGlzLmRlZmF1bHRzLCBjb25maWcpO1xyXG4gIGNvbmZpZy5tZXRob2QgPSBjb25maWcubWV0aG9kLnRvTG93ZXJDYXNlKCk7XHJcblxyXG4gIC8vIEhvb2sgdXAgaW50ZXJjZXB0b3JzIG1pZGRsZXdhcmVcclxuICB2YXIgY2hhaW4gPSBbZGlzcGF0Y2hSZXF1ZXN0LCB1bmRlZmluZWRdO1xyXG4gIHZhciBwcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKGNvbmZpZyk7XHJcblxyXG4gIHRoaXMuaW50ZXJjZXB0b3JzLnJlcXVlc3QuZm9yRWFjaChmdW5jdGlvbiB1bnNoaWZ0UmVxdWVzdEludGVyY2VwdG9ycyhpbnRlcmNlcHRvcikge1xyXG4gICAgY2hhaW4udW5zaGlmdChpbnRlcmNlcHRvci5mdWxmaWxsZWQsIGludGVyY2VwdG9yLnJlamVjdGVkKTtcclxuICB9KTtcclxuXHJcbiAgdGhpcy5pbnRlcmNlcHRvcnMucmVzcG9uc2UuZm9yRWFjaChmdW5jdGlvbiBwdXNoUmVzcG9uc2VJbnRlcmNlcHRvcnMoaW50ZXJjZXB0b3IpIHtcclxuICAgIGNoYWluLnB1c2goaW50ZXJjZXB0b3IuZnVsZmlsbGVkLCBpbnRlcmNlcHRvci5yZWplY3RlZCk7XHJcbiAgfSk7XHJcblxyXG4gIHdoaWxlIChjaGFpbi5sZW5ndGgpIHtcclxuICAgIHByb21pc2UgPSBwcm9taXNlLnRoZW4oY2hhaW4uc2hpZnQoKSwgY2hhaW4uc2hpZnQoKSk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gcHJvbWlzZTtcclxufTtcclxuXHJcbi8vIFByb3ZpZGUgYWxpYXNlcyBmb3Igc3VwcG9ydGVkIHJlcXVlc3QgbWV0aG9kc1xyXG51dGlscy5mb3JFYWNoKFsnZGVsZXRlJywgJ2dldCcsICdoZWFkJywgJ29wdGlvbnMnXSwgZnVuY3Rpb24gZm9yRWFjaE1ldGhvZE5vRGF0YShtZXRob2QpIHtcclxuICAvKmVzbGludCBmdW5jLW5hbWVzOjAqL1xyXG4gIEF4aW9zLnByb3RvdHlwZVttZXRob2RdID0gZnVuY3Rpb24odXJsLCBjb25maWcpIHtcclxuICAgIHJldHVybiB0aGlzLnJlcXVlc3QodXRpbHMubWVyZ2UoY29uZmlnIHx8IHt9LCB7XHJcbiAgICAgIG1ldGhvZDogbWV0aG9kLFxyXG4gICAgICB1cmw6IHVybFxyXG4gICAgfSkpO1xyXG4gIH07XHJcbn0pO1xyXG5cclxudXRpbHMuZm9yRWFjaChbJ3Bvc3QnLCAncHV0JywgJ3BhdGNoJ10sIGZ1bmN0aW9uIGZvckVhY2hNZXRob2RXaXRoRGF0YShtZXRob2QpIHtcclxuICAvKmVzbGludCBmdW5jLW5hbWVzOjAqL1xyXG4gIEF4aW9zLnByb3RvdHlwZVttZXRob2RdID0gZnVuY3Rpb24odXJsLCBkYXRhLCBjb25maWcpIHtcclxuICAgIHJldHVybiB0aGlzLnJlcXVlc3QodXRpbHMubWVyZ2UoY29uZmlnIHx8IHt9LCB7XHJcbiAgICAgIG1ldGhvZDogbWV0aG9kLFxyXG4gICAgICB1cmw6IHVybCxcclxuICAgICAgZGF0YTogZGF0YVxyXG4gICAgfSkpO1xyXG4gIH07XHJcbn0pO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBBeGlvcztcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xyXG5cclxuZnVuY3Rpb24gSW50ZXJjZXB0b3JNYW5hZ2VyKCkge1xyXG4gIHRoaXMuaGFuZGxlcnMgPSBbXTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEFkZCBhIG5ldyBpbnRlcmNlcHRvciB0byB0aGUgc3RhY2tcclxuICpcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVsZmlsbGVkIFRoZSBmdW5jdGlvbiB0byBoYW5kbGUgYHRoZW5gIGZvciBhIGBQcm9taXNlYFxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSByZWplY3RlZCBUaGUgZnVuY3Rpb24gdG8gaGFuZGxlIGByZWplY3RgIGZvciBhIGBQcm9taXNlYFxyXG4gKlxyXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IEFuIElEIHVzZWQgdG8gcmVtb3ZlIGludGVyY2VwdG9yIGxhdGVyXHJcbiAqL1xyXG5JbnRlcmNlcHRvck1hbmFnZXIucHJvdG90eXBlLnVzZSA9IGZ1bmN0aW9uIHVzZShmdWxmaWxsZWQsIHJlamVjdGVkKSB7XHJcbiAgdGhpcy5oYW5kbGVycy5wdXNoKHtcclxuICAgIGZ1bGZpbGxlZDogZnVsZmlsbGVkLFxyXG4gICAgcmVqZWN0ZWQ6IHJlamVjdGVkXHJcbiAgfSk7XHJcbiAgcmV0dXJuIHRoaXMuaGFuZGxlcnMubGVuZ3RoIC0gMTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZW1vdmUgYW4gaW50ZXJjZXB0b3IgZnJvbSB0aGUgc3RhY2tcclxuICpcclxuICogQHBhcmFtIHtOdW1iZXJ9IGlkIFRoZSBJRCB0aGF0IHdhcyByZXR1cm5lZCBieSBgdXNlYFxyXG4gKi9cclxuSW50ZXJjZXB0b3JNYW5hZ2VyLnByb3RvdHlwZS5lamVjdCA9IGZ1bmN0aW9uIGVqZWN0KGlkKSB7XHJcbiAgaWYgKHRoaXMuaGFuZGxlcnNbaWRdKSB7XHJcbiAgICB0aGlzLmhhbmRsZXJzW2lkXSA9IG51bGw7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEl0ZXJhdGUgb3ZlciBhbGwgdGhlIHJlZ2lzdGVyZWQgaW50ZXJjZXB0b3JzXHJcbiAqXHJcbiAqIFRoaXMgbWV0aG9kIGlzIHBhcnRpY3VsYXJseSB1c2VmdWwgZm9yIHNraXBwaW5nIG92ZXIgYW55XHJcbiAqIGludGVyY2VwdG9ycyB0aGF0IG1heSBoYXZlIGJlY29tZSBgbnVsbGAgY2FsbGluZyBgZWplY3RgLlxyXG4gKlxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBUaGUgZnVuY3Rpb24gdG8gY2FsbCBmb3IgZWFjaCBpbnRlcmNlcHRvclxyXG4gKi9cclxuSW50ZXJjZXB0b3JNYW5hZ2VyLnByb3RvdHlwZS5mb3JFYWNoID0gZnVuY3Rpb24gZm9yRWFjaChmbikge1xyXG4gIHV0aWxzLmZvckVhY2godGhpcy5oYW5kbGVycywgZnVuY3Rpb24gZm9yRWFjaEhhbmRsZXIoaCkge1xyXG4gICAgaWYgKGggIT09IG51bGwpIHtcclxuICAgICAgZm4oaCk7XHJcbiAgICB9XHJcbiAgfSk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEludGVyY2VwdG9yTWFuYWdlcjtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIGVuaGFuY2VFcnJvciA9IHJlcXVpcmUoJy4vZW5oYW5jZUVycm9yJyk7XHJcblxyXG4vKipcclxuICogQ3JlYXRlIGFuIEVycm9yIHdpdGggdGhlIHNwZWNpZmllZCBtZXNzYWdlLCBjb25maWcsIGVycm9yIGNvZGUsIHJlcXVlc3QgYW5kIHJlc3BvbnNlLlxyXG4gKlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSBUaGUgZXJyb3IgbWVzc2FnZS5cclxuICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyBUaGUgY29uZmlnLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gW2NvZGVdIFRoZSBlcnJvciBjb2RlIChmb3IgZXhhbXBsZSwgJ0VDT05OQUJPUlRFRCcpLlxyXG4gKiBAcGFyYW0ge09iamVjdH0gW3JlcXVlc3RdIFRoZSByZXF1ZXN0LlxyXG4gKiBAcGFyYW0ge09iamVjdH0gW3Jlc3BvbnNlXSBUaGUgcmVzcG9uc2UuXHJcbiAqIEByZXR1cm5zIHtFcnJvcn0gVGhlIGNyZWF0ZWQgZXJyb3IuXHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGNyZWF0ZUVycm9yKG1lc3NhZ2UsIGNvbmZpZywgY29kZSwgcmVxdWVzdCwgcmVzcG9uc2UpIHtcclxuICB2YXIgZXJyb3IgPSBuZXcgRXJyb3IobWVzc2FnZSk7XHJcbiAgcmV0dXJuIGVuaGFuY2VFcnJvcihlcnJvciwgY29uZmlnLCBjb2RlLCByZXF1ZXN0LCByZXNwb25zZSk7XHJcbn07XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcclxudmFyIHRyYW5zZm9ybURhdGEgPSByZXF1aXJlKCcuL3RyYW5zZm9ybURhdGEnKTtcclxudmFyIGlzQ2FuY2VsID0gcmVxdWlyZSgnLi4vY2FuY2VsL2lzQ2FuY2VsJyk7XHJcbnZhciBkZWZhdWx0cyA9IHJlcXVpcmUoJy4uL2RlZmF1bHRzJyk7XHJcbnZhciBpc0Fic29sdXRlVVJMID0gcmVxdWlyZSgnLi8uLi9oZWxwZXJzL2lzQWJzb2x1dGVVUkwnKTtcclxudmFyIGNvbWJpbmVVUkxzID0gcmVxdWlyZSgnLi8uLi9oZWxwZXJzL2NvbWJpbmVVUkxzJyk7XHJcblxyXG4vKipcclxuICogVGhyb3dzIGEgYENhbmNlbGAgaWYgY2FuY2VsbGF0aW9uIGhhcyBiZWVuIHJlcXVlc3RlZC5cclxuICovXHJcbmZ1bmN0aW9uIHRocm93SWZDYW5jZWxsYXRpb25SZXF1ZXN0ZWQoY29uZmlnKSB7XHJcbiAgaWYgKGNvbmZpZy5jYW5jZWxUb2tlbikge1xyXG4gICAgY29uZmlnLmNhbmNlbFRva2VuLnRocm93SWZSZXF1ZXN0ZWQoKTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEaXNwYXRjaCBhIHJlcXVlc3QgdG8gdGhlIHNlcnZlciB1c2luZyB0aGUgY29uZmlndXJlZCBhZGFwdGVyLlxyXG4gKlxyXG4gKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIFRoZSBjb25maWcgdGhhdCBpcyB0byBiZSB1c2VkIGZvciB0aGUgcmVxdWVzdFxyXG4gKiBAcmV0dXJucyB7UHJvbWlzZX0gVGhlIFByb21pc2UgdG8gYmUgZnVsZmlsbGVkXHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGRpc3BhdGNoUmVxdWVzdChjb25maWcpIHtcclxuICB0aHJvd0lmQ2FuY2VsbGF0aW9uUmVxdWVzdGVkKGNvbmZpZyk7XHJcblxyXG4gIC8vIFN1cHBvcnQgYmFzZVVSTCBjb25maWdcclxuICBpZiAoY29uZmlnLmJhc2VVUkwgJiYgIWlzQWJzb2x1dGVVUkwoY29uZmlnLnVybCkpIHtcclxuICAgIGNvbmZpZy51cmwgPSBjb21iaW5lVVJMcyhjb25maWcuYmFzZVVSTCwgY29uZmlnLnVybCk7XHJcbiAgfVxyXG5cclxuICAvLyBFbnN1cmUgaGVhZGVycyBleGlzdFxyXG4gIGNvbmZpZy5oZWFkZXJzID0gY29uZmlnLmhlYWRlcnMgfHwge307XHJcblxyXG4gIC8vIFRyYW5zZm9ybSByZXF1ZXN0IGRhdGFcclxuICBjb25maWcuZGF0YSA9IHRyYW5zZm9ybURhdGEoXHJcbiAgICBjb25maWcuZGF0YSxcclxuICAgIGNvbmZpZy5oZWFkZXJzLFxyXG4gICAgY29uZmlnLnRyYW5zZm9ybVJlcXVlc3RcclxuICApO1xyXG5cclxuICAvLyBGbGF0dGVuIGhlYWRlcnNcclxuICBjb25maWcuaGVhZGVycyA9IHV0aWxzLm1lcmdlKFxyXG4gICAgY29uZmlnLmhlYWRlcnMuY29tbW9uIHx8IHt9LFxyXG4gICAgY29uZmlnLmhlYWRlcnNbY29uZmlnLm1ldGhvZF0gfHwge30sXHJcbiAgICBjb25maWcuaGVhZGVycyB8fCB7fVxyXG4gICk7XHJcblxyXG4gIHV0aWxzLmZvckVhY2goXHJcbiAgICBbJ2RlbGV0ZScsICdnZXQnLCAnaGVhZCcsICdwb3N0JywgJ3B1dCcsICdwYXRjaCcsICdjb21tb24nXSxcclxuICAgIGZ1bmN0aW9uIGNsZWFuSGVhZGVyQ29uZmlnKG1ldGhvZCkge1xyXG4gICAgICBkZWxldGUgY29uZmlnLmhlYWRlcnNbbWV0aG9kXTtcclxuICAgIH1cclxuICApO1xyXG5cclxuICB2YXIgYWRhcHRlciA9IGNvbmZpZy5hZGFwdGVyIHx8IGRlZmF1bHRzLmFkYXB0ZXI7XHJcblxyXG4gIHJldHVybiBhZGFwdGVyKGNvbmZpZykudGhlbihmdW5jdGlvbiBvbkFkYXB0ZXJSZXNvbHV0aW9uKHJlc3BvbnNlKSB7XHJcbiAgICB0aHJvd0lmQ2FuY2VsbGF0aW9uUmVxdWVzdGVkKGNvbmZpZyk7XHJcblxyXG4gICAgLy8gVHJhbnNmb3JtIHJlc3BvbnNlIGRhdGFcclxuICAgIHJlc3BvbnNlLmRhdGEgPSB0cmFuc2Zvcm1EYXRhKFxyXG4gICAgICByZXNwb25zZS5kYXRhLFxyXG4gICAgICByZXNwb25zZS5oZWFkZXJzLFxyXG4gICAgICBjb25maWcudHJhbnNmb3JtUmVzcG9uc2VcclxuICAgICk7XHJcblxyXG4gICAgcmV0dXJuIHJlc3BvbnNlO1xyXG4gIH0sIGZ1bmN0aW9uIG9uQWRhcHRlclJlamVjdGlvbihyZWFzb24pIHtcclxuICAgIGlmICghaXNDYW5jZWwocmVhc29uKSkge1xyXG4gICAgICB0aHJvd0lmQ2FuY2VsbGF0aW9uUmVxdWVzdGVkKGNvbmZpZyk7XHJcblxyXG4gICAgICAvLyBUcmFuc2Zvcm0gcmVzcG9uc2UgZGF0YVxyXG4gICAgICBpZiAocmVhc29uICYmIHJlYXNvbi5yZXNwb25zZSkge1xyXG4gICAgICAgIHJlYXNvbi5yZXNwb25zZS5kYXRhID0gdHJhbnNmb3JtRGF0YShcclxuICAgICAgICAgIHJlYXNvbi5yZXNwb25zZS5kYXRhLFxyXG4gICAgICAgICAgcmVhc29uLnJlc3BvbnNlLmhlYWRlcnMsXHJcbiAgICAgICAgICBjb25maWcudHJhbnNmb3JtUmVzcG9uc2VcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIFByb21pc2UucmVqZWN0KHJlYXNvbik7XHJcbiAgfSk7XHJcbn07XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbi8qKlxyXG4gKiBVcGRhdGUgYW4gRXJyb3Igd2l0aCB0aGUgc3BlY2lmaWVkIGNvbmZpZywgZXJyb3IgY29kZSwgYW5kIHJlc3BvbnNlLlxyXG4gKlxyXG4gKiBAcGFyYW0ge0Vycm9yfSBlcnJvciBUaGUgZXJyb3IgdG8gdXBkYXRlLlxyXG4gKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIFRoZSBjb25maWcuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBbY29kZV0gVGhlIGVycm9yIGNvZGUgKGZvciBleGFtcGxlLCAnRUNPTk5BQk9SVEVEJykuXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBbcmVxdWVzdF0gVGhlIHJlcXVlc3QuXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBbcmVzcG9uc2VdIFRoZSByZXNwb25zZS5cclxuICogQHJldHVybnMge0Vycm9yfSBUaGUgZXJyb3IuXHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGVuaGFuY2VFcnJvcihlcnJvciwgY29uZmlnLCBjb2RlLCByZXF1ZXN0LCByZXNwb25zZSkge1xyXG4gIGVycm9yLmNvbmZpZyA9IGNvbmZpZztcclxuICBpZiAoY29kZSkge1xyXG4gICAgZXJyb3IuY29kZSA9IGNvZGU7XHJcbiAgfVxyXG4gIGVycm9yLnJlcXVlc3QgPSByZXF1ZXN0O1xyXG4gIGVycm9yLnJlc3BvbnNlID0gcmVzcG9uc2U7XHJcbiAgcmV0dXJuIGVycm9yO1xyXG59O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG52YXIgY3JlYXRlRXJyb3IgPSByZXF1aXJlKCcuL2NyZWF0ZUVycm9yJyk7XHJcblxyXG4vKipcclxuICogUmVzb2x2ZSBvciByZWplY3QgYSBQcm9taXNlIGJhc2VkIG9uIHJlc3BvbnNlIHN0YXR1cy5cclxuICpcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gcmVzb2x2ZSBBIGZ1bmN0aW9uIHRoYXQgcmVzb2x2ZXMgdGhlIHByb21pc2UuXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHJlamVjdCBBIGZ1bmN0aW9uIHRoYXQgcmVqZWN0cyB0aGUgcHJvbWlzZS5cclxuICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIFRoZSByZXNwb25zZS5cclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgcmVzcG9uc2UpIHtcclxuICB2YXIgdmFsaWRhdGVTdGF0dXMgPSByZXNwb25zZS5jb25maWcudmFsaWRhdGVTdGF0dXM7XHJcbiAgLy8gTm90ZTogc3RhdHVzIGlzIG5vdCBleHBvc2VkIGJ5IFhEb21haW5SZXF1ZXN0XHJcbiAgaWYgKCFyZXNwb25zZS5zdGF0dXMgfHwgIXZhbGlkYXRlU3RhdHVzIHx8IHZhbGlkYXRlU3RhdHVzKHJlc3BvbnNlLnN0YXR1cykpIHtcclxuICAgIHJlc29sdmUocmVzcG9uc2UpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICByZWplY3QoY3JlYXRlRXJyb3IoXHJcbiAgICAgICdSZXF1ZXN0IGZhaWxlZCB3aXRoIHN0YXR1cyBjb2RlICcgKyByZXNwb25zZS5zdGF0dXMsXHJcbiAgICAgIHJlc3BvbnNlLmNvbmZpZyxcclxuICAgICAgbnVsbCxcclxuICAgICAgcmVzcG9uc2UucmVxdWVzdCxcclxuICAgICAgcmVzcG9uc2VcclxuICAgICkpO1xyXG4gIH1cclxufTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xyXG5cclxuLyoqXHJcbiAqIFRyYW5zZm9ybSB0aGUgZGF0YSBmb3IgYSByZXF1ZXN0IG9yIGEgcmVzcG9uc2VcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R8U3RyaW5nfSBkYXRhIFRoZSBkYXRhIHRvIGJlIHRyYW5zZm9ybWVkXHJcbiAqIEBwYXJhbSB7QXJyYXl9IGhlYWRlcnMgVGhlIGhlYWRlcnMgZm9yIHRoZSByZXF1ZXN0IG9yIHJlc3BvbnNlXHJcbiAqIEBwYXJhbSB7QXJyYXl8RnVuY3Rpb259IGZucyBBIHNpbmdsZSBmdW5jdGlvbiBvciBBcnJheSBvZiBmdW5jdGlvbnNcclxuICogQHJldHVybnMgeyp9IFRoZSByZXN1bHRpbmcgdHJhbnNmb3JtZWQgZGF0YVxyXG4gKi9cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB0cmFuc2Zvcm1EYXRhKGRhdGEsIGhlYWRlcnMsIGZucykge1xyXG4gIC8qZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOjAqL1xyXG4gIHV0aWxzLmZvckVhY2goZm5zLCBmdW5jdGlvbiB0cmFuc2Zvcm0oZm4pIHtcclxuICAgIGRhdGEgPSBmbihkYXRhLCBoZWFkZXJzKTtcclxuICB9KTtcclxuXHJcbiAgcmV0dXJuIGRhdGE7XHJcbn07XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcclxudmFyIG5vcm1hbGl6ZUhlYWRlck5hbWUgPSByZXF1aXJlKCcuL2hlbHBlcnMvbm9ybWFsaXplSGVhZGVyTmFtZScpO1xyXG5cclxudmFyIERFRkFVTFRfQ09OVEVOVF9UWVBFID0ge1xyXG4gICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJ1xyXG59O1xyXG5cclxuZnVuY3Rpb24gc2V0Q29udGVudFR5cGVJZlVuc2V0KGhlYWRlcnMsIHZhbHVlKSB7XHJcbiAgaWYgKCF1dGlscy5pc1VuZGVmaW5lZChoZWFkZXJzKSAmJiB1dGlscy5pc1VuZGVmaW5lZChoZWFkZXJzWydDb250ZW50LVR5cGUnXSkpIHtcclxuICAgIGhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddID0gdmFsdWU7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBnZXREZWZhdWx0QWRhcHRlcigpIHtcclxuICB2YXIgYWRhcHRlcjtcclxuICBpZiAodHlwZW9mIFhNTEh0dHBSZXF1ZXN0ICE9PSAndW5kZWZpbmVkJykge1xyXG4gICAgLy8gRm9yIGJyb3dzZXJzIHVzZSBYSFIgYWRhcHRlclxyXG4gICAgYWRhcHRlciA9IHJlcXVpcmUoJy4vYWRhcHRlcnMveGhyJyk7XHJcbiAgfSBlbHNlIGlmICh0eXBlb2YgcHJvY2VzcyAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgIC8vIEZvciBub2RlIHVzZSBIVFRQIGFkYXB0ZXJcclxuICAgIGFkYXB0ZXIgPSByZXF1aXJlKCcuL2FkYXB0ZXJzL2h0dHAnKTtcclxuICB9XHJcbiAgcmV0dXJuIGFkYXB0ZXI7XHJcbn1cclxuXHJcbnZhciBkZWZhdWx0cyA9IHtcclxuICBhZGFwdGVyOiBnZXREZWZhdWx0QWRhcHRlcigpLFxyXG5cclxuICB0cmFuc2Zvcm1SZXF1ZXN0OiBbZnVuY3Rpb24gdHJhbnNmb3JtUmVxdWVzdChkYXRhLCBoZWFkZXJzKSB7XHJcbiAgICBub3JtYWxpemVIZWFkZXJOYW1lKGhlYWRlcnMsICdDb250ZW50LVR5cGUnKTtcclxuICAgIGlmICh1dGlscy5pc0Zvcm1EYXRhKGRhdGEpIHx8XHJcbiAgICAgIHV0aWxzLmlzQXJyYXlCdWZmZXIoZGF0YSkgfHxcclxuICAgICAgdXRpbHMuaXNCdWZmZXIoZGF0YSkgfHxcclxuICAgICAgdXRpbHMuaXNTdHJlYW0oZGF0YSkgfHxcclxuICAgICAgdXRpbHMuaXNGaWxlKGRhdGEpIHx8XHJcbiAgICAgIHV0aWxzLmlzQmxvYihkYXRhKVxyXG4gICAgKSB7XHJcbiAgICAgIHJldHVybiBkYXRhO1xyXG4gICAgfVxyXG4gICAgaWYgKHV0aWxzLmlzQXJyYXlCdWZmZXJWaWV3KGRhdGEpKSB7XHJcbiAgICAgIHJldHVybiBkYXRhLmJ1ZmZlcjtcclxuICAgIH1cclxuICAgIGlmICh1dGlscy5pc1VSTFNlYXJjaFBhcmFtcyhkYXRhKSkge1xyXG4gICAgICBzZXRDb250ZW50VHlwZUlmVW5zZXQoaGVhZGVycywgJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDtjaGFyc2V0PXV0Zi04Jyk7XHJcbiAgICAgIHJldHVybiBkYXRhLnRvU3RyaW5nKCk7XHJcbiAgICB9XHJcbiAgICBpZiAodXRpbHMuaXNPYmplY3QoZGF0YSkpIHtcclxuICAgICAgc2V0Q29udGVudFR5cGVJZlVuc2V0KGhlYWRlcnMsICdhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTgnKTtcclxuICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGRhdGEpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGRhdGE7XHJcbiAgfV0sXHJcblxyXG4gIHRyYW5zZm9ybVJlc3BvbnNlOiBbZnVuY3Rpb24gdHJhbnNmb3JtUmVzcG9uc2UoZGF0YSkge1xyXG4gICAgLyplc2xpbnQgbm8tcGFyYW0tcmVhc3NpZ246MCovXHJcbiAgICBpZiAodHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgZGF0YSA9IEpTT04ucGFyc2UoZGF0YSk7XHJcbiAgICAgIH0gY2F0Y2ggKGUpIHsgLyogSWdub3JlICovIH1cclxuICAgIH1cclxuICAgIHJldHVybiBkYXRhO1xyXG4gIH1dLFxyXG5cclxuICAvKipcclxuICAgKiBBIHRpbWVvdXQgaW4gbWlsbGlzZWNvbmRzIHRvIGFib3J0IGEgcmVxdWVzdC4gSWYgc2V0IHRvIDAgKGRlZmF1bHQpIGFcclxuICAgKiB0aW1lb3V0IGlzIG5vdCBjcmVhdGVkLlxyXG4gICAqL1xyXG4gIHRpbWVvdXQ6IDAsXHJcblxyXG4gIHhzcmZDb29raWVOYW1lOiAnWFNSRi1UT0tFTicsXHJcbiAgeHNyZkhlYWRlck5hbWU6ICdYLVhTUkYtVE9LRU4nLFxyXG5cclxuICBtYXhDb250ZW50TGVuZ3RoOiAtMSxcclxuXHJcbiAgdmFsaWRhdGVTdGF0dXM6IGZ1bmN0aW9uIHZhbGlkYXRlU3RhdHVzKHN0YXR1cykge1xyXG4gICAgcmV0dXJuIHN0YXR1cyA+PSAyMDAgJiYgc3RhdHVzIDwgMzAwO1xyXG4gIH1cclxufTtcclxuXHJcbmRlZmF1bHRzLmhlYWRlcnMgPSB7XHJcbiAgY29tbW9uOiB7XHJcbiAgICAnQWNjZXB0JzogJ2FwcGxpY2F0aW9uL2pzb24sIHRleHQvcGxhaW4sICovKidcclxuICB9XHJcbn07XHJcblxyXG51dGlscy5mb3JFYWNoKFsnZGVsZXRlJywgJ2dldCcsICdoZWFkJ10sIGZ1bmN0aW9uIGZvckVhY2hNZXRob2ROb0RhdGEobWV0aG9kKSB7XHJcbiAgZGVmYXVsdHMuaGVhZGVyc1ttZXRob2RdID0ge307XHJcbn0pO1xyXG5cclxudXRpbHMuZm9yRWFjaChbJ3Bvc3QnLCAncHV0JywgJ3BhdGNoJ10sIGZ1bmN0aW9uIGZvckVhY2hNZXRob2RXaXRoRGF0YShtZXRob2QpIHtcclxuICBkZWZhdWx0cy5oZWFkZXJzW21ldGhvZF0gPSB1dGlscy5tZXJnZShERUZBVUxUX0NPTlRFTlRfVFlQRSk7XHJcbn0pO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBkZWZhdWx0cztcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBiaW5kKGZuLCB0aGlzQXJnKSB7XHJcbiAgcmV0dXJuIGZ1bmN0aW9uIHdyYXAoKSB7XHJcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBhcmdzW2ldID0gYXJndW1lbnRzW2ldO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xyXG4gIH07XHJcbn07XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbi8vIGJ0b2EgcG9seWZpbGwgZm9yIElFPDEwIGNvdXJ0ZXN5IGh0dHBzOi8vZ2l0aHViLmNvbS9kYXZpZGNoYW1iZXJzL0Jhc2U2NC5qc1xyXG5cclxudmFyIGNoYXJzID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky89JztcclxuXHJcbmZ1bmN0aW9uIEUoKSB7XHJcbiAgdGhpcy5tZXNzYWdlID0gJ1N0cmluZyBjb250YWlucyBhbiBpbnZhbGlkIGNoYXJhY3Rlcic7XHJcbn1cclxuRS5wcm90b3R5cGUgPSBuZXcgRXJyb3I7XHJcbkUucHJvdG90eXBlLmNvZGUgPSA1O1xyXG5FLnByb3RvdHlwZS5uYW1lID0gJ0ludmFsaWRDaGFyYWN0ZXJFcnJvcic7XHJcblxyXG5mdW5jdGlvbiBidG9hKGlucHV0KSB7XHJcbiAgdmFyIHN0ciA9IFN0cmluZyhpbnB1dCk7XHJcbiAgdmFyIG91dHB1dCA9ICcnO1xyXG4gIGZvciAoXHJcbiAgICAvLyBpbml0aWFsaXplIHJlc3VsdCBhbmQgY291bnRlclxyXG4gICAgdmFyIGJsb2NrLCBjaGFyQ29kZSwgaWR4ID0gMCwgbWFwID0gY2hhcnM7XHJcbiAgICAvLyBpZiB0aGUgbmV4dCBzdHIgaW5kZXggZG9lcyBub3QgZXhpc3Q6XHJcbiAgICAvLyAgIGNoYW5nZSB0aGUgbWFwcGluZyB0YWJsZSB0byBcIj1cIlxyXG4gICAgLy8gICBjaGVjayBpZiBkIGhhcyBubyBmcmFjdGlvbmFsIGRpZ2l0c1xyXG4gICAgc3RyLmNoYXJBdChpZHggfCAwKSB8fCAobWFwID0gJz0nLCBpZHggJSAxKTtcclxuICAgIC8vIFwiOCAtIGlkeCAlIDEgKiA4XCIgZ2VuZXJhdGVzIHRoZSBzZXF1ZW5jZSAyLCA0LCA2LCA4XHJcbiAgICBvdXRwdXQgKz0gbWFwLmNoYXJBdCg2MyAmIGJsb2NrID4+IDggLSBpZHggJSAxICogOClcclxuICApIHtcclxuICAgIGNoYXJDb2RlID0gc3RyLmNoYXJDb2RlQXQoaWR4ICs9IDMgLyA0KTtcclxuICAgIGlmIChjaGFyQ29kZSA+IDB4RkYpIHtcclxuICAgICAgdGhyb3cgbmV3IEUoKTtcclxuICAgIH1cclxuICAgIGJsb2NrID0gYmxvY2sgPDwgOCB8IGNoYXJDb2RlO1xyXG4gIH1cclxuICByZXR1cm4gb3V0cHV0O1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGJ0b2E7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcclxuXHJcbmZ1bmN0aW9uIGVuY29kZSh2YWwpIHtcclxuICByZXR1cm4gZW5jb2RlVVJJQ29tcG9uZW50KHZhbCkuXHJcbiAgICByZXBsYWNlKC8lNDAvZ2ksICdAJykuXHJcbiAgICByZXBsYWNlKC8lM0EvZ2ksICc6JykuXHJcbiAgICByZXBsYWNlKC8lMjQvZywgJyQnKS5cclxuICAgIHJlcGxhY2UoLyUyQy9naSwgJywnKS5cclxuICAgIHJlcGxhY2UoLyUyMC9nLCAnKycpLlxyXG4gICAgcmVwbGFjZSgvJTVCL2dpLCAnWycpLlxyXG4gICAgcmVwbGFjZSgvJTVEL2dpLCAnXScpO1xyXG59XHJcblxyXG4vKipcclxuICogQnVpbGQgYSBVUkwgYnkgYXBwZW5kaW5nIHBhcmFtcyB0byB0aGUgZW5kXHJcbiAqXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgVGhlIGJhc2Ugb2YgdGhlIHVybCAoZS5nLiwgaHR0cDovL3d3dy5nb29nbGUuY29tKVxyXG4gKiBAcGFyYW0ge29iamVjdH0gW3BhcmFtc10gVGhlIHBhcmFtcyB0byBiZSBhcHBlbmRlZFxyXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgZm9ybWF0dGVkIHVybFxyXG4gKi9cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBidWlsZFVSTCh1cmwsIHBhcmFtcywgcGFyYW1zU2VyaWFsaXplcikge1xyXG4gIC8qZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOjAqL1xyXG4gIGlmICghcGFyYW1zKSB7XHJcbiAgICByZXR1cm4gdXJsO1xyXG4gIH1cclxuXHJcbiAgdmFyIHNlcmlhbGl6ZWRQYXJhbXM7XHJcbiAgaWYgKHBhcmFtc1NlcmlhbGl6ZXIpIHtcclxuICAgIHNlcmlhbGl6ZWRQYXJhbXMgPSBwYXJhbXNTZXJpYWxpemVyKHBhcmFtcyk7XHJcbiAgfSBlbHNlIGlmICh1dGlscy5pc1VSTFNlYXJjaFBhcmFtcyhwYXJhbXMpKSB7XHJcbiAgICBzZXJpYWxpemVkUGFyYW1zID0gcGFyYW1zLnRvU3RyaW5nKCk7XHJcbiAgfSBlbHNlIHtcclxuICAgIHZhciBwYXJ0cyA9IFtdO1xyXG5cclxuICAgIHV0aWxzLmZvckVhY2gocGFyYW1zLCBmdW5jdGlvbiBzZXJpYWxpemUodmFsLCBrZXkpIHtcclxuICAgICAgaWYgKHZhbCA9PT0gbnVsbCB8fCB0eXBlb2YgdmFsID09PSAndW5kZWZpbmVkJykge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHV0aWxzLmlzQXJyYXkodmFsKSkge1xyXG4gICAgICAgIGtleSA9IGtleSArICdbXSc7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdmFsID0gW3ZhbF07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHV0aWxzLmZvckVhY2godmFsLCBmdW5jdGlvbiBwYXJzZVZhbHVlKHYpIHtcclxuICAgICAgICBpZiAodXRpbHMuaXNEYXRlKHYpKSB7XHJcbiAgICAgICAgICB2ID0gdi50b0lTT1N0cmluZygpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAodXRpbHMuaXNPYmplY3QodikpIHtcclxuICAgICAgICAgIHYgPSBKU09OLnN0cmluZ2lmeSh2KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcGFydHMucHVzaChlbmNvZGUoa2V5KSArICc9JyArIGVuY29kZSh2KSk7XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgc2VyaWFsaXplZFBhcmFtcyA9IHBhcnRzLmpvaW4oJyYnKTtcclxuICB9XHJcblxyXG4gIGlmIChzZXJpYWxpemVkUGFyYW1zKSB7XHJcbiAgICB1cmwgKz0gKHVybC5pbmRleE9mKCc/JykgPT09IC0xID8gJz8nIDogJyYnKSArIHNlcmlhbGl6ZWRQYXJhbXM7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gdXJsO1xyXG59O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhIG5ldyBVUkwgYnkgY29tYmluaW5nIHRoZSBzcGVjaWZpZWQgVVJMc1xyXG4gKlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gYmFzZVVSTCBUaGUgYmFzZSBVUkxcclxuICogQHBhcmFtIHtzdHJpbmd9IHJlbGF0aXZlVVJMIFRoZSByZWxhdGl2ZSBVUkxcclxuICogQHJldHVybnMge3N0cmluZ30gVGhlIGNvbWJpbmVkIFVSTFxyXG4gKi9cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBjb21iaW5lVVJMcyhiYXNlVVJMLCByZWxhdGl2ZVVSTCkge1xyXG4gIHJldHVybiByZWxhdGl2ZVVSTFxyXG4gICAgPyBiYXNlVVJMLnJlcGxhY2UoL1xcLyskLywgJycpICsgJy8nICsgcmVsYXRpdmVVUkwucmVwbGFjZSgvXlxcLysvLCAnJylcclxuICAgIDogYmFzZVVSTDtcclxufTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSAoXHJcbiAgdXRpbHMuaXNTdGFuZGFyZEJyb3dzZXJFbnYoKSA/XHJcblxyXG4gIC8vIFN0YW5kYXJkIGJyb3dzZXIgZW52cyBzdXBwb3J0IGRvY3VtZW50LmNvb2tpZVxyXG4gIChmdW5jdGlvbiBzdGFuZGFyZEJyb3dzZXJFbnYoKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB3cml0ZTogZnVuY3Rpb24gd3JpdGUobmFtZSwgdmFsdWUsIGV4cGlyZXMsIHBhdGgsIGRvbWFpbiwgc2VjdXJlKSB7XHJcbiAgICAgICAgdmFyIGNvb2tpZSA9IFtdO1xyXG4gICAgICAgIGNvb2tpZS5wdXNoKG5hbWUgKyAnPScgKyBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpKTtcclxuXHJcbiAgICAgICAgaWYgKHV0aWxzLmlzTnVtYmVyKGV4cGlyZXMpKSB7XHJcbiAgICAgICAgICBjb29raWUucHVzaCgnZXhwaXJlcz0nICsgbmV3IERhdGUoZXhwaXJlcykudG9HTVRTdHJpbmcoKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodXRpbHMuaXNTdHJpbmcocGF0aCkpIHtcclxuICAgICAgICAgIGNvb2tpZS5wdXNoKCdwYXRoPScgKyBwYXRoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh1dGlscy5pc1N0cmluZyhkb21haW4pKSB7XHJcbiAgICAgICAgICBjb29raWUucHVzaCgnZG9tYWluPScgKyBkb21haW4pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHNlY3VyZSA9PT0gdHJ1ZSkge1xyXG4gICAgICAgICAgY29va2llLnB1c2goJ3NlY3VyZScpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZG9jdW1lbnQuY29va2llID0gY29va2llLmpvaW4oJzsgJyk7XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICByZWFkOiBmdW5jdGlvbiByZWFkKG5hbWUpIHtcclxuICAgICAgICB2YXIgbWF0Y2ggPSBkb2N1bWVudC5jb29raWUubWF0Y2gobmV3IFJlZ0V4cCgnKF58O1xcXFxzKikoJyArIG5hbWUgKyAnKT0oW147XSopJykpO1xyXG4gICAgICAgIHJldHVybiAobWF0Y2ggPyBkZWNvZGVVUklDb21wb25lbnQobWF0Y2hbM10pIDogbnVsbCk7XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICByZW1vdmU6IGZ1bmN0aW9uIHJlbW92ZShuYW1lKSB7XHJcbiAgICAgICAgdGhpcy53cml0ZShuYW1lLCAnJywgRGF0ZS5ub3coKSAtIDg2NDAwMDAwKTtcclxuICAgICAgfVxyXG4gICAgfTtcclxuICB9KSgpIDpcclxuXHJcbiAgLy8gTm9uIHN0YW5kYXJkIGJyb3dzZXIgZW52ICh3ZWIgd29ya2VycywgcmVhY3QtbmF0aXZlKSBsYWNrIG5lZWRlZCBzdXBwb3J0LlxyXG4gIChmdW5jdGlvbiBub25TdGFuZGFyZEJyb3dzZXJFbnYoKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB3cml0ZTogZnVuY3Rpb24gd3JpdGUoKSB7fSxcclxuICAgICAgcmVhZDogZnVuY3Rpb24gcmVhZCgpIHsgcmV0dXJuIG51bGw7IH0sXHJcbiAgICAgIHJlbW92ZTogZnVuY3Rpb24gcmVtb3ZlKCkge31cclxuICAgIH07XHJcbiAgfSkoKVxyXG4pO1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG4vKipcclxuICogRGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBzcGVjaWZpZWQgVVJMIGlzIGFic29sdXRlXHJcbiAqXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgVGhlIFVSTCB0byB0ZXN0XHJcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHRoZSBzcGVjaWZpZWQgVVJMIGlzIGFic29sdXRlLCBvdGhlcndpc2UgZmFsc2VcclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNBYnNvbHV0ZVVSTCh1cmwpIHtcclxuICAvLyBBIFVSTCBpcyBjb25zaWRlcmVkIGFic29sdXRlIGlmIGl0IGJlZ2lucyB3aXRoIFwiPHNjaGVtZT46Ly9cIiBvciBcIi8vXCIgKHByb3RvY29sLXJlbGF0aXZlIFVSTCkuXHJcbiAgLy8gUkZDIDM5ODYgZGVmaW5lcyBzY2hlbWUgbmFtZSBhcyBhIHNlcXVlbmNlIG9mIGNoYXJhY3RlcnMgYmVnaW5uaW5nIHdpdGggYSBsZXR0ZXIgYW5kIGZvbGxvd2VkXHJcbiAgLy8gYnkgYW55IGNvbWJpbmF0aW9uIG9mIGxldHRlcnMsIGRpZ2l0cywgcGx1cywgcGVyaW9kLCBvciBoeXBoZW4uXHJcbiAgcmV0dXJuIC9eKFthLXpdW2EtelxcZFxcK1xcLVxcLl0qOik/XFwvXFwvL2kudGVzdCh1cmwpO1xyXG59O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IChcclxuICB1dGlscy5pc1N0YW5kYXJkQnJvd3NlckVudigpID9cclxuXHJcbiAgLy8gU3RhbmRhcmQgYnJvd3NlciBlbnZzIGhhdmUgZnVsbCBzdXBwb3J0IG9mIHRoZSBBUElzIG5lZWRlZCB0byB0ZXN0XHJcbiAgLy8gd2hldGhlciB0aGUgcmVxdWVzdCBVUkwgaXMgb2YgdGhlIHNhbWUgb3JpZ2luIGFzIGN1cnJlbnQgbG9jYXRpb24uXHJcbiAgKGZ1bmN0aW9uIHN0YW5kYXJkQnJvd3NlckVudigpIHtcclxuICAgIHZhciBtc2llID0gLyhtc2llfHRyaWRlbnQpL2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KTtcclxuICAgIHZhciB1cmxQYXJzaW5nTm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcclxuICAgIHZhciBvcmlnaW5VUkw7XHJcblxyXG4gICAgLyoqXHJcbiAgICAqIFBhcnNlIGEgVVJMIHRvIGRpc2NvdmVyIGl0J3MgY29tcG9uZW50c1xyXG4gICAgKlxyXG4gICAgKiBAcGFyYW0ge1N0cmluZ30gdXJsIFRoZSBVUkwgdG8gYmUgcGFyc2VkXHJcbiAgICAqIEByZXR1cm5zIHtPYmplY3R9XHJcbiAgICAqL1xyXG4gICAgZnVuY3Rpb24gcmVzb2x2ZVVSTCh1cmwpIHtcclxuICAgICAgdmFyIGhyZWYgPSB1cmw7XHJcblxyXG4gICAgICBpZiAobXNpZSkge1xyXG4gICAgICAgIC8vIElFIG5lZWRzIGF0dHJpYnV0ZSBzZXQgdHdpY2UgdG8gbm9ybWFsaXplIHByb3BlcnRpZXNcclxuICAgICAgICB1cmxQYXJzaW5nTm9kZS5zZXRBdHRyaWJ1dGUoJ2hyZWYnLCBocmVmKTtcclxuICAgICAgICBocmVmID0gdXJsUGFyc2luZ05vZGUuaHJlZjtcclxuICAgICAgfVxyXG5cclxuICAgICAgdXJsUGFyc2luZ05vZGUuc2V0QXR0cmlidXRlKCdocmVmJywgaHJlZik7XHJcblxyXG4gICAgICAvLyB1cmxQYXJzaW5nTm9kZSBwcm92aWRlcyB0aGUgVXJsVXRpbHMgaW50ZXJmYWNlIC0gaHR0cDovL3VybC5zcGVjLndoYXR3Zy5vcmcvI3VybHV0aWxzXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgaHJlZjogdXJsUGFyc2luZ05vZGUuaHJlZixcclxuICAgICAgICBwcm90b2NvbDogdXJsUGFyc2luZ05vZGUucHJvdG9jb2wgPyB1cmxQYXJzaW5nTm9kZS5wcm90b2NvbC5yZXBsYWNlKC86JC8sICcnKSA6ICcnLFxyXG4gICAgICAgIGhvc3Q6IHVybFBhcnNpbmdOb2RlLmhvc3QsXHJcbiAgICAgICAgc2VhcmNoOiB1cmxQYXJzaW5nTm9kZS5zZWFyY2ggPyB1cmxQYXJzaW5nTm9kZS5zZWFyY2gucmVwbGFjZSgvXlxcPy8sICcnKSA6ICcnLFxyXG4gICAgICAgIGhhc2g6IHVybFBhcnNpbmdOb2RlLmhhc2ggPyB1cmxQYXJzaW5nTm9kZS5oYXNoLnJlcGxhY2UoL14jLywgJycpIDogJycsXHJcbiAgICAgICAgaG9zdG5hbWU6IHVybFBhcnNpbmdOb2RlLmhvc3RuYW1lLFxyXG4gICAgICAgIHBvcnQ6IHVybFBhcnNpbmdOb2RlLnBvcnQsXHJcbiAgICAgICAgcGF0aG5hbWU6ICh1cmxQYXJzaW5nTm9kZS5wYXRobmFtZS5jaGFyQXQoMCkgPT09ICcvJykgP1xyXG4gICAgICAgICAgICAgICAgICB1cmxQYXJzaW5nTm9kZS5wYXRobmFtZSA6XHJcbiAgICAgICAgICAgICAgICAgICcvJyArIHVybFBhcnNpbmdOb2RlLnBhdGhuYW1lXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgb3JpZ2luVVJMID0gcmVzb2x2ZVVSTCh3aW5kb3cubG9jYXRpb24uaHJlZik7XHJcblxyXG4gICAgLyoqXHJcbiAgICAqIERldGVybWluZSBpZiBhIFVSTCBzaGFyZXMgdGhlIHNhbWUgb3JpZ2luIGFzIHRoZSBjdXJyZW50IGxvY2F0aW9uXHJcbiAgICAqXHJcbiAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXF1ZXN0VVJMIFRoZSBVUkwgdG8gdGVzdFxyXG4gICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBVUkwgc2hhcmVzIHRoZSBzYW1lIG9yaWdpbiwgb3RoZXJ3aXNlIGZhbHNlXHJcbiAgICAqL1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIGlzVVJMU2FtZU9yaWdpbihyZXF1ZXN0VVJMKSB7XHJcbiAgICAgIHZhciBwYXJzZWQgPSAodXRpbHMuaXNTdHJpbmcocmVxdWVzdFVSTCkpID8gcmVzb2x2ZVVSTChyZXF1ZXN0VVJMKSA6IHJlcXVlc3RVUkw7XHJcbiAgICAgIHJldHVybiAocGFyc2VkLnByb3RvY29sID09PSBvcmlnaW5VUkwucHJvdG9jb2wgJiZcclxuICAgICAgICAgICAgcGFyc2VkLmhvc3QgPT09IG9yaWdpblVSTC5ob3N0KTtcclxuICAgIH07XHJcbiAgfSkoKSA6XHJcblxyXG4gIC8vIE5vbiBzdGFuZGFyZCBicm93c2VyIGVudnMgKHdlYiB3b3JrZXJzLCByZWFjdC1uYXRpdmUpIGxhY2sgbmVlZGVkIHN1cHBvcnQuXHJcbiAgKGZ1bmN0aW9uIG5vblN0YW5kYXJkQnJvd3NlckVudigpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiBpc1VSTFNhbWVPcmlnaW4oKSB7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfTtcclxuICB9KSgpXHJcbik7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIG5vcm1hbGl6ZUhlYWRlck5hbWUoaGVhZGVycywgbm9ybWFsaXplZE5hbWUpIHtcclxuICB1dGlscy5mb3JFYWNoKGhlYWRlcnMsIGZ1bmN0aW9uIHByb2Nlc3NIZWFkZXIodmFsdWUsIG5hbWUpIHtcclxuICAgIGlmIChuYW1lICE9PSBub3JtYWxpemVkTmFtZSAmJiBuYW1lLnRvVXBwZXJDYXNlKCkgPT09IG5vcm1hbGl6ZWROYW1lLnRvVXBwZXJDYXNlKCkpIHtcclxuICAgICAgaGVhZGVyc1tub3JtYWxpemVkTmFtZV0gPSB2YWx1ZTtcclxuICAgICAgZGVsZXRlIGhlYWRlcnNbbmFtZV07XHJcbiAgICB9XHJcbiAgfSk7XHJcbn07XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcclxuXHJcbi8vIEhlYWRlcnMgd2hvc2UgZHVwbGljYXRlcyBhcmUgaWdub3JlZCBieSBub2RlXHJcbi8vIGMuZi4gaHR0cHM6Ly9ub2RlanMub3JnL2FwaS9odHRwLmh0bWwjaHR0cF9tZXNzYWdlX2hlYWRlcnNcclxudmFyIGlnbm9yZUR1cGxpY2F0ZU9mID0gW1xyXG4gICdhZ2UnLCAnYXV0aG9yaXphdGlvbicsICdjb250ZW50LWxlbmd0aCcsICdjb250ZW50LXR5cGUnLCAnZXRhZycsXHJcbiAgJ2V4cGlyZXMnLCAnZnJvbScsICdob3N0JywgJ2lmLW1vZGlmaWVkLXNpbmNlJywgJ2lmLXVubW9kaWZpZWQtc2luY2UnLFxyXG4gICdsYXN0LW1vZGlmaWVkJywgJ2xvY2F0aW9uJywgJ21heC1mb3J3YXJkcycsICdwcm94eS1hdXRob3JpemF0aW9uJyxcclxuICAncmVmZXJlcicsICdyZXRyeS1hZnRlcicsICd1c2VyLWFnZW50J1xyXG5dO1xyXG5cclxuLyoqXHJcbiAqIFBhcnNlIGhlYWRlcnMgaW50byBhbiBvYmplY3RcclxuICpcclxuICogYGBgXHJcbiAqIERhdGU6IFdlZCwgMjcgQXVnIDIwMTQgMDg6NTg6NDkgR01UXHJcbiAqIENvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvblxyXG4gKiBDb25uZWN0aW9uOiBrZWVwLWFsaXZlXHJcbiAqIFRyYW5zZmVyLUVuY29kaW5nOiBjaHVua2VkXHJcbiAqIGBgYFxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gaGVhZGVycyBIZWFkZXJzIG5lZWRpbmcgdG8gYmUgcGFyc2VkXHJcbiAqIEByZXR1cm5zIHtPYmplY3R9IEhlYWRlcnMgcGFyc2VkIGludG8gYW4gb2JqZWN0XHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHBhcnNlSGVhZGVycyhoZWFkZXJzKSB7XHJcbiAgdmFyIHBhcnNlZCA9IHt9O1xyXG4gIHZhciBrZXk7XHJcbiAgdmFyIHZhbDtcclxuICB2YXIgaTtcclxuXHJcbiAgaWYgKCFoZWFkZXJzKSB7IHJldHVybiBwYXJzZWQ7IH1cclxuXHJcbiAgdXRpbHMuZm9yRWFjaChoZWFkZXJzLnNwbGl0KCdcXG4nKSwgZnVuY3Rpb24gcGFyc2VyKGxpbmUpIHtcclxuICAgIGkgPSBsaW5lLmluZGV4T2YoJzonKTtcclxuICAgIGtleSA9IHV0aWxzLnRyaW0obGluZS5zdWJzdHIoMCwgaSkpLnRvTG93ZXJDYXNlKCk7XHJcbiAgICB2YWwgPSB1dGlscy50cmltKGxpbmUuc3Vic3RyKGkgKyAxKSk7XHJcblxyXG4gICAgaWYgKGtleSkge1xyXG4gICAgICBpZiAocGFyc2VkW2tleV0gJiYgaWdub3JlRHVwbGljYXRlT2YuaW5kZXhPZihrZXkpID49IDApIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGtleSA9PT0gJ3NldC1jb29raWUnKSB7XHJcbiAgICAgICAgcGFyc2VkW2tleV0gPSAocGFyc2VkW2tleV0gPyBwYXJzZWRba2V5XSA6IFtdKS5jb25jYXQoW3ZhbF0pO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHBhcnNlZFtrZXldID0gcGFyc2VkW2tleV0gPyBwYXJzZWRba2V5XSArICcsICcgKyB2YWwgOiB2YWw7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9KTtcclxuXHJcbiAgcmV0dXJuIHBhcnNlZDtcclxufTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuLyoqXHJcbiAqIFN5bnRhY3RpYyBzdWdhciBmb3IgaW52b2tpbmcgYSBmdW5jdGlvbiBhbmQgZXhwYW5kaW5nIGFuIGFycmF5IGZvciBhcmd1bWVudHMuXHJcbiAqXHJcbiAqIENvbW1vbiB1c2UgY2FzZSB3b3VsZCBiZSB0byB1c2UgYEZ1bmN0aW9uLnByb3RvdHlwZS5hcHBseWAuXHJcbiAqXHJcbiAqICBgYGBqc1xyXG4gKiAgZnVuY3Rpb24gZih4LCB5LCB6KSB7fVxyXG4gKiAgdmFyIGFyZ3MgPSBbMSwgMiwgM107XHJcbiAqICBmLmFwcGx5KG51bGwsIGFyZ3MpO1xyXG4gKiAgYGBgXHJcbiAqXHJcbiAqIFdpdGggYHNwcmVhZGAgdGhpcyBleGFtcGxlIGNhbiBiZSByZS13cml0dGVuLlxyXG4gKlxyXG4gKiAgYGBganNcclxuICogIHNwcmVhZChmdW5jdGlvbih4LCB5LCB6KSB7fSkoWzEsIDIsIDNdKTtcclxuICogIGBgYFxyXG4gKlxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xyXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259XHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHNwcmVhZChjYWxsYmFjaykge1xyXG4gIHJldHVybiBmdW5jdGlvbiB3cmFwKGFycikge1xyXG4gICAgcmV0dXJuIGNhbGxiYWNrLmFwcGx5KG51bGwsIGFycik7XHJcbiAgfTtcclxufTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIGJpbmQgPSByZXF1aXJlKCcuL2hlbHBlcnMvYmluZCcpO1xyXG52YXIgaXNCdWZmZXIgPSByZXF1aXJlKCdpcy1idWZmZXInKTtcclxuXHJcbi8qZ2xvYmFsIHRvU3RyaW5nOnRydWUqL1xyXG5cclxuLy8gdXRpbHMgaXMgYSBsaWJyYXJ5IG9mIGdlbmVyaWMgaGVscGVyIGZ1bmN0aW9ucyBub24tc3BlY2lmaWMgdG8gYXhpb3NcclxuXHJcbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XHJcblxyXG4vKipcclxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYW4gQXJyYXlcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhbiBBcnJheSwgb3RoZXJ3aXNlIGZhbHNlXHJcbiAqL1xyXG5mdW5jdGlvbiBpc0FycmF5KHZhbCkge1xyXG4gIHJldHVybiB0b1N0cmluZy5jYWxsKHZhbCkgPT09ICdbb2JqZWN0IEFycmF5XSc7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhbiBBcnJheUJ1ZmZlclxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XHJcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGFuIEFycmF5QnVmZmVyLCBvdGhlcndpc2UgZmFsc2VcclxuICovXHJcbmZ1bmN0aW9uIGlzQXJyYXlCdWZmZXIodmFsKSB7XHJcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwodmFsKSA9PT0gJ1tvYmplY3QgQXJyYXlCdWZmZXJdJztcclxufVxyXG5cclxuLyoqXHJcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgRm9ybURhdGFcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhbiBGb3JtRGF0YSwgb3RoZXJ3aXNlIGZhbHNlXHJcbiAqL1xyXG5mdW5jdGlvbiBpc0Zvcm1EYXRhKHZhbCkge1xyXG4gIHJldHVybiAodHlwZW9mIEZvcm1EYXRhICE9PSAndW5kZWZpbmVkJykgJiYgKHZhbCBpbnN0YW5jZW9mIEZvcm1EYXRhKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgdmlldyBvbiBhbiBBcnJheUJ1ZmZlclxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XHJcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgdmlldyBvbiBhbiBBcnJheUJ1ZmZlciwgb3RoZXJ3aXNlIGZhbHNlXHJcbiAqL1xyXG5mdW5jdGlvbiBpc0FycmF5QnVmZmVyVmlldyh2YWwpIHtcclxuICB2YXIgcmVzdWx0O1xyXG4gIGlmICgodHlwZW9mIEFycmF5QnVmZmVyICE9PSAndW5kZWZpbmVkJykgJiYgKEFycmF5QnVmZmVyLmlzVmlldykpIHtcclxuICAgIHJlc3VsdCA9IEFycmF5QnVmZmVyLmlzVmlldyh2YWwpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICByZXN1bHQgPSAodmFsKSAmJiAodmFsLmJ1ZmZlcikgJiYgKHZhbC5idWZmZXIgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcik7XHJcbiAgfVxyXG4gIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhIFN0cmluZ1xyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XHJcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgU3RyaW5nLCBvdGhlcndpc2UgZmFsc2VcclxuICovXHJcbmZ1bmN0aW9uIGlzU3RyaW5nKHZhbCkge1xyXG4gIHJldHVybiB0eXBlb2YgdmFsID09PSAnc3RyaW5nJztcclxufVxyXG5cclxuLyoqXHJcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgTnVtYmVyXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcclxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBOdW1iZXIsIG90aGVyd2lzZSBmYWxzZVxyXG4gKi9cclxuZnVuY3Rpb24gaXNOdW1iZXIodmFsKSB7XHJcbiAgcmV0dXJuIHR5cGVvZiB2YWwgPT09ICdudW1iZXInO1xyXG59XHJcblxyXG4vKipcclxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgdW5kZWZpbmVkXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcclxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdGhlIHZhbHVlIGlzIHVuZGVmaW5lZCwgb3RoZXJ3aXNlIGZhbHNlXHJcbiAqL1xyXG5mdW5jdGlvbiBpc1VuZGVmaW5lZCh2YWwpIHtcclxuICByZXR1cm4gdHlwZW9mIHZhbCA9PT0gJ3VuZGVmaW5lZCc7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhbiBPYmplY3RcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhbiBPYmplY3QsIG90aGVyd2lzZSBmYWxzZVxyXG4gKi9cclxuZnVuY3Rpb24gaXNPYmplY3QodmFsKSB7XHJcbiAgcmV0dXJuIHZhbCAhPT0gbnVsbCAmJiB0eXBlb2YgdmFsID09PSAnb2JqZWN0JztcclxufVxyXG5cclxuLyoqXHJcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgRGF0ZVxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XHJcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgRGF0ZSwgb3RoZXJ3aXNlIGZhbHNlXHJcbiAqL1xyXG5mdW5jdGlvbiBpc0RhdGUodmFsKSB7XHJcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwodmFsKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xyXG59XHJcblxyXG4vKipcclxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBGaWxlXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcclxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBGaWxlLCBvdGhlcndpc2UgZmFsc2VcclxuICovXHJcbmZ1bmN0aW9uIGlzRmlsZSh2YWwpIHtcclxuICByZXR1cm4gdG9TdHJpbmcuY2FsbCh2YWwpID09PSAnW29iamVjdCBGaWxlXSc7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhIEJsb2JcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIEJsb2IsIG90aGVyd2lzZSBmYWxzZVxyXG4gKi9cclxuZnVuY3Rpb24gaXNCbG9iKHZhbCkge1xyXG4gIHJldHVybiB0b1N0cmluZy5jYWxsKHZhbCkgPT09ICdbb2JqZWN0IEJsb2JdJztcclxufVxyXG5cclxuLyoqXHJcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgRnVuY3Rpb25cclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIEZ1bmN0aW9uLCBvdGhlcndpc2UgZmFsc2VcclxuICovXHJcbmZ1bmN0aW9uIGlzRnVuY3Rpb24odmFsKSB7XHJcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwodmFsKSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcclxufVxyXG5cclxuLyoqXHJcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgU3RyZWFtXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcclxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBTdHJlYW0sIG90aGVyd2lzZSBmYWxzZVxyXG4gKi9cclxuZnVuY3Rpb24gaXNTdHJlYW0odmFsKSB7XHJcbiAgcmV0dXJuIGlzT2JqZWN0KHZhbCkgJiYgaXNGdW5jdGlvbih2YWwucGlwZSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhIFVSTFNlYXJjaFBhcmFtcyBvYmplY3RcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIFVSTFNlYXJjaFBhcmFtcyBvYmplY3QsIG90aGVyd2lzZSBmYWxzZVxyXG4gKi9cclxuZnVuY3Rpb24gaXNVUkxTZWFyY2hQYXJhbXModmFsKSB7XHJcbiAgcmV0dXJuIHR5cGVvZiBVUkxTZWFyY2hQYXJhbXMgIT09ICd1bmRlZmluZWQnICYmIHZhbCBpbnN0YW5jZW9mIFVSTFNlYXJjaFBhcmFtcztcclxufVxyXG5cclxuLyoqXHJcbiAqIFRyaW0gZXhjZXNzIHdoaXRlc3BhY2Ugb2ZmIHRoZSBiZWdpbm5pbmcgYW5kIGVuZCBvZiBhIHN0cmluZ1xyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyIFRoZSBTdHJpbmcgdG8gdHJpbVxyXG4gKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgU3RyaW5nIGZyZWVkIG9mIGV4Y2VzcyB3aGl0ZXNwYWNlXHJcbiAqL1xyXG5mdW5jdGlvbiB0cmltKHN0cikge1xyXG4gIHJldHVybiBzdHIucmVwbGFjZSgvXlxccyovLCAnJykucmVwbGFjZSgvXFxzKiQvLCAnJyk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZXRlcm1pbmUgaWYgd2UncmUgcnVubmluZyBpbiBhIHN0YW5kYXJkIGJyb3dzZXIgZW52aXJvbm1lbnRcclxuICpcclxuICogVGhpcyBhbGxvd3MgYXhpb3MgdG8gcnVuIGluIGEgd2ViIHdvcmtlciwgYW5kIHJlYWN0LW5hdGl2ZS5cclxuICogQm90aCBlbnZpcm9ubWVudHMgc3VwcG9ydCBYTUxIdHRwUmVxdWVzdCwgYnV0IG5vdCBmdWxseSBzdGFuZGFyZCBnbG9iYWxzLlxyXG4gKlxyXG4gKiB3ZWIgd29ya2VyczpcclxuICogIHR5cGVvZiB3aW5kb3cgLT4gdW5kZWZpbmVkXHJcbiAqICB0eXBlb2YgZG9jdW1lbnQgLT4gdW5kZWZpbmVkXHJcbiAqXHJcbiAqIHJlYWN0LW5hdGl2ZTpcclxuICogIG5hdmlnYXRvci5wcm9kdWN0IC0+ICdSZWFjdE5hdGl2ZSdcclxuICovXHJcbmZ1bmN0aW9uIGlzU3RhbmRhcmRCcm93c2VyRW52KCkge1xyXG4gIGlmICh0eXBlb2YgbmF2aWdhdG9yICE9PSAndW5kZWZpbmVkJyAmJiBuYXZpZ2F0b3IucHJvZHVjdCA9PT0gJ1JlYWN0TmF0aXZlJykge1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuICByZXR1cm4gKFxyXG4gICAgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiZcclxuICAgIHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCdcclxuICApO1xyXG59XHJcblxyXG4vKipcclxuICogSXRlcmF0ZSBvdmVyIGFuIEFycmF5IG9yIGFuIE9iamVjdCBpbnZva2luZyBhIGZ1bmN0aW9uIGZvciBlYWNoIGl0ZW0uXHJcbiAqXHJcbiAqIElmIGBvYmpgIGlzIGFuIEFycmF5IGNhbGxiYWNrIHdpbGwgYmUgY2FsbGVkIHBhc3NpbmdcclxuICogdGhlIHZhbHVlLCBpbmRleCwgYW5kIGNvbXBsZXRlIGFycmF5IGZvciBlYWNoIGl0ZW0uXHJcbiAqXHJcbiAqIElmICdvYmonIGlzIGFuIE9iamVjdCBjYWxsYmFjayB3aWxsIGJlIGNhbGxlZCBwYXNzaW5nXHJcbiAqIHRoZSB2YWx1ZSwga2V5LCBhbmQgY29tcGxldGUgb2JqZWN0IGZvciBlYWNoIHByb3BlcnR5LlxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheX0gb2JqIFRoZSBvYmplY3QgdG8gaXRlcmF0ZVxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBUaGUgY2FsbGJhY2sgdG8gaW52b2tlIGZvciBlYWNoIGl0ZW1cclxuICovXHJcbmZ1bmN0aW9uIGZvckVhY2gob2JqLCBmbikge1xyXG4gIC8vIERvbid0IGJvdGhlciBpZiBubyB2YWx1ZSBwcm92aWRlZFxyXG4gIGlmIChvYmogPT09IG51bGwgfHwgdHlwZW9mIG9iaiA9PT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIC8vIEZvcmNlIGFuIGFycmF5IGlmIG5vdCBhbHJlYWR5IHNvbWV0aGluZyBpdGVyYWJsZVxyXG4gIGlmICh0eXBlb2Ygb2JqICE9PSAnb2JqZWN0Jykge1xyXG4gICAgLyplc2xpbnQgbm8tcGFyYW0tcmVhc3NpZ246MCovXHJcbiAgICBvYmogPSBbb2JqXTtcclxuICB9XHJcblxyXG4gIGlmIChpc0FycmF5KG9iaikpIHtcclxuICAgIC8vIEl0ZXJhdGUgb3ZlciBhcnJheSB2YWx1ZXNcclxuICAgIGZvciAodmFyIGkgPSAwLCBsID0gb2JqLmxlbmd0aDsgaSA8IGw7IGkrKykge1xyXG4gICAgICBmbi5jYWxsKG51bGwsIG9ialtpXSwgaSwgb2JqKTtcclxuICAgIH1cclxuICB9IGVsc2Uge1xyXG4gICAgLy8gSXRlcmF0ZSBvdmVyIG9iamVjdCBrZXlzXHJcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XHJcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSB7XHJcbiAgICAgICAgZm4uY2FsbChudWxsLCBvYmpba2V5XSwga2V5LCBvYmopO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogQWNjZXB0cyB2YXJhcmdzIGV4cGVjdGluZyBlYWNoIGFyZ3VtZW50IHRvIGJlIGFuIG9iamVjdCwgdGhlblxyXG4gKiBpbW11dGFibHkgbWVyZ2VzIHRoZSBwcm9wZXJ0aWVzIG9mIGVhY2ggb2JqZWN0IGFuZCByZXR1cm5zIHJlc3VsdC5cclxuICpcclxuICogV2hlbiBtdWx0aXBsZSBvYmplY3RzIGNvbnRhaW4gdGhlIHNhbWUga2V5IHRoZSBsYXRlciBvYmplY3QgaW5cclxuICogdGhlIGFyZ3VtZW50cyBsaXN0IHdpbGwgdGFrZSBwcmVjZWRlbmNlLlxyXG4gKlxyXG4gKiBFeGFtcGxlOlxyXG4gKlxyXG4gKiBgYGBqc1xyXG4gKiB2YXIgcmVzdWx0ID0gbWVyZ2Uoe2ZvbzogMTIzfSwge2ZvbzogNDU2fSk7XHJcbiAqIGNvbnNvbGUubG9nKHJlc3VsdC5mb28pOyAvLyBvdXRwdXRzIDQ1NlxyXG4gKiBgYGBcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IG9iajEgT2JqZWN0IHRvIG1lcmdlXHJcbiAqIEByZXR1cm5zIHtPYmplY3R9IFJlc3VsdCBvZiBhbGwgbWVyZ2UgcHJvcGVydGllc1xyXG4gKi9cclxuZnVuY3Rpb24gbWVyZ2UoLyogb2JqMSwgb2JqMiwgb2JqMywgLi4uICovKSB7XHJcbiAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gIGZ1bmN0aW9uIGFzc2lnblZhbHVlKHZhbCwga2V5KSB7XHJcbiAgICBpZiAodHlwZW9mIHJlc3VsdFtrZXldID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgdmFsID09PSAnb2JqZWN0Jykge1xyXG4gICAgICByZXN1bHRba2V5XSA9IG1lcmdlKHJlc3VsdFtrZXldLCB2YWwpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmVzdWx0W2tleV0gPSB2YWw7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmb3IgKHZhciBpID0gMCwgbCA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcclxuICAgIGZvckVhY2goYXJndW1lbnRzW2ldLCBhc3NpZ25WYWx1ZSk7XHJcbiAgfVxyXG4gIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBFeHRlbmRzIG9iamVjdCBhIGJ5IG11dGFibHkgYWRkaW5nIHRvIGl0IHRoZSBwcm9wZXJ0aWVzIG9mIG9iamVjdCBiLlxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gYSBUaGUgb2JqZWN0IHRvIGJlIGV4dGVuZGVkXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBiIFRoZSBvYmplY3QgdG8gY29weSBwcm9wZXJ0aWVzIGZyb21cclxuICogQHBhcmFtIHtPYmplY3R9IHRoaXNBcmcgVGhlIG9iamVjdCB0byBiaW5kIGZ1bmN0aW9uIHRvXHJcbiAqIEByZXR1cm4ge09iamVjdH0gVGhlIHJlc3VsdGluZyB2YWx1ZSBvZiBvYmplY3QgYVxyXG4gKi9cclxuZnVuY3Rpb24gZXh0ZW5kKGEsIGIsIHRoaXNBcmcpIHtcclxuICBmb3JFYWNoKGIsIGZ1bmN0aW9uIGFzc2lnblZhbHVlKHZhbCwga2V5KSB7XHJcbiAgICBpZiAodGhpc0FyZyAmJiB0eXBlb2YgdmFsID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgIGFba2V5XSA9IGJpbmQodmFsLCB0aGlzQXJnKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGFba2V5XSA9IHZhbDtcclxuICAgIH1cclxuICB9KTtcclxuICByZXR1cm4gYTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgaXNBcnJheTogaXNBcnJheSxcclxuICBpc0FycmF5QnVmZmVyOiBpc0FycmF5QnVmZmVyLFxyXG4gIGlzQnVmZmVyOiBpc0J1ZmZlcixcclxuICBpc0Zvcm1EYXRhOiBpc0Zvcm1EYXRhLFxyXG4gIGlzQXJyYXlCdWZmZXJWaWV3OiBpc0FycmF5QnVmZmVyVmlldyxcclxuICBpc1N0cmluZzogaXNTdHJpbmcsXHJcbiAgaXNOdW1iZXI6IGlzTnVtYmVyLFxyXG4gIGlzT2JqZWN0OiBpc09iamVjdCxcclxuICBpc1VuZGVmaW5lZDogaXNVbmRlZmluZWQsXHJcbiAgaXNEYXRlOiBpc0RhdGUsXHJcbiAgaXNGaWxlOiBpc0ZpbGUsXHJcbiAgaXNCbG9iOiBpc0Jsb2IsXHJcbiAgaXNGdW5jdGlvbjogaXNGdW5jdGlvbixcclxuICBpc1N0cmVhbTogaXNTdHJlYW0sXHJcbiAgaXNVUkxTZWFyY2hQYXJhbXM6IGlzVVJMU2VhcmNoUGFyYW1zLFxyXG4gIGlzU3RhbmRhcmRCcm93c2VyRW52OiBpc1N0YW5kYXJkQnJvd3NlckVudixcclxuICBmb3JFYWNoOiBmb3JFYWNoLFxyXG4gIG1lcmdlOiBtZXJnZSxcclxuICBleHRlbmQ6IGV4dGVuZCxcclxuICB0cmltOiB0cmltXHJcbn07XHJcbiIsIi8qIVxyXG4gKiBEZXRlcm1pbmUgaWYgYW4gb2JqZWN0IGlzIGEgQnVmZmVyXHJcbiAqXHJcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxodHRwczovL2Zlcm9zcy5vcmc+XHJcbiAqIEBsaWNlbnNlICBNSVRcclxuICovXHJcblxyXG4vLyBUaGUgX2lzQnVmZmVyIGNoZWNrIGlzIGZvciBTYWZhcmkgNS03IHN1cHBvcnQsIGJlY2F1c2UgaXQncyBtaXNzaW5nXHJcbi8vIE9iamVjdC5wcm90b3R5cGUuY29uc3RydWN0b3IuIFJlbW92ZSB0aGlzIGV2ZW50dWFsbHlcclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob2JqKSB7XHJcbiAgcmV0dXJuIG9iaiAhPSBudWxsICYmIChpc0J1ZmZlcihvYmopIHx8IGlzU2xvd0J1ZmZlcihvYmopIHx8ICEhb2JqLl9pc0J1ZmZlcilcclxufVxyXG5cclxuZnVuY3Rpb24gaXNCdWZmZXIgKG9iaikge1xyXG4gIHJldHVybiAhIW9iai5jb25zdHJ1Y3RvciAmJiB0eXBlb2Ygb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyID09PSAnZnVuY3Rpb24nICYmIG9iai5jb25zdHJ1Y3Rvci5pc0J1ZmZlcihvYmopXHJcbn1cclxuXHJcbi8vIEZvciBOb2RlIHYwLjEwIHN1cHBvcnQuIFJlbW92ZSB0aGlzIGV2ZW50dWFsbHkuXHJcbmZ1bmN0aW9uIGlzU2xvd0J1ZmZlciAob2JqKSB7XHJcbiAgcmV0dXJuIHR5cGVvZiBvYmoucmVhZEZsb2F0TEUgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIG9iai5zbGljZSA9PT0gJ2Z1bmN0aW9uJyAmJiBpc0J1ZmZlcihvYmouc2xpY2UoMCwgMCkpXHJcbn1cclxuIiwiLyoqVGhpcyBjbGFzcyBpcyBhdXRvbWF0aWNhbGx5IGdlbmVyYXRlZCBieSBMYXlhQWlySURFLCBwbGVhc2UgZG8gbm90IG1ha2UgYW55IG1vZGlmaWNhdGlvbnMuICovXHJcbmltcG9ydCBBc3Npc3RhbnQgZnJvbSBcIi4vc2NyaXB0L0Fzc2lzdGFudFwiXHJcbmltcG9ydCBQYWdlU2NyaXB0IGZyb20gXCIuL3B1YmxpY1NjcmlwdC9QYWdlU2NyaXB0XCJcclxuaW1wb3J0IFNjcmVlbiBmcm9tIFwiLi9wdWJsaWNTY3JpcHQvU2NyZWVuXCJcclxuaW1wb3J0IHRyZW5kTGlzdCBmcm9tIFwiLi90ZW1wbGF0ZS90cmVuZExpc3RcIlxyXG5pbXBvcnQgQ2FyZCBmcm9tIFwiLi9zY3JpcHQvQ2FyZFwiXHJcbmltcG9ydCBncmFuZFByaXggZnJvbSBcIi4vc2NyaXB0L2dyYW5kUHJpeFwiXHJcbmltcG9ydCBQYWdlTmF2U2NyaXB0IGZyb20gXCIuL3B1YmxpY1NjcmlwdC9QYWdlTmF2U2NyaXB0XCJcclxuaW1wb3J0IHByaXhMaXN0IGZyb20gXCIuL3RlbXBsYXRlL3ByaXhMaXN0XCJcclxuaW1wb3J0IEd1ZXNzaW5nIGZyb20gXCIuL3NjcmlwdC9HdWVzc2luZ1wiXHJcbmltcG9ydCBudW1iZXJMaXN0RG9tU2NyaXB0IGZyb20gXCIuL3RlbXBsYXRlL251bWJlckxpc3REb21TY3JpcHRcIlxyXG5pbXBvcnQgSG9tZSBmcm9tIFwiLi9zY3JpcHQvSG9tZVwiXHJcbmltcG9ydCBsb2FkaW5nU2NlbmUgZnJvbSBcIi4vc2NyaXB0L2xvYWRpbmdTY2VuZVwiXHJcbmltcG9ydCBwcmlIaXN0b3J5U2NlbmUgZnJvbSBcIi4vc2NyaXB0L3ByaUhpc3RvcnlTY2VuZVwiXHJcbmltcG9ydCBwcmlIaXN0b3J5IGZyb20gXCIuL3RlbXBsYXRlL3ByaUhpc3RvcnlcIlxyXG5pbXBvcnQgUmVjb3JkIGZyb20gXCIuL3NjcmlwdC9SZWNvcmRcIlxyXG5pbXBvcnQgam9pblJlY29yZHMgZnJvbSBcIi4vdGVtcGxhdGUvam9pblJlY29yZHNcIlxyXG5pbXBvcnQgcHJldmlvdXNSZWNvcmRzIGZyb20gXCIuL3RlbXBsYXRlL3ByZXZpb3VzUmVjb3Jkc1wiXHJcbmltcG9ydCBzaG9ydExpc3RlZCBmcm9tIFwiLi9zY3JpcHQvc2hvcnRMaXN0ZWRcIlxyXG5pbXBvcnQgc2hvcnRMaXN0ZWRMaXN0IGZyb20gXCIuL3RlbXBsYXRlL3Nob3J0TGlzdGVkTGlzdFwiXHJcbmltcG9ydCBwc3dJbnB1dCBmcm9tIFwiLi90ZW1wbGF0ZS9wc3dJbnB1dFwiXHJcbmltcG9ydCByYW5raW5nTGlzdCBmcm9tIFwiLi90ZW1wbGF0ZS9yYW5raW5nTGlzdFwiXHJcbmltcG9ydCByZWNoYXJnZURpYWxvZyBmcm9tIFwiLi90ZW1wbGF0ZS9yZWNoYXJnZURpYWxvZ1wiXHJcbmltcG9ydCByb2NrZXREaWFsb2cgZnJvbSBcIi4vdmlldy9yb2NrZXREaWFsb2dcIlxyXG5pbXBvcnQgdGlwRGlhbG9nIGZyb20gXCIuL3RlbXBsYXRlL3RpcERpYWxvZ1wiXHJcbmltcG9ydCB3aW5uaW5nTGlzdCBmcm9tIFwiLi90ZW1wbGF0ZS93aW5uaW5nTGlzdFwiXHJcbmltcG9ydCB3aW5uaW5nIGZyb20gXCIuL3NjcmlwdC93aW5uaW5nXCJcclxuLypcclxuKiDmuLjmiI/liJ3lp4vljJbphY3nva47XHJcbiovXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEdhbWVDb25maWd7XHJcbiAgICBzdGF0aWMgd2lkdGg6bnVtYmVyPTc1MDtcclxuICAgIHN0YXRpYyBoZWlnaHQ6bnVtYmVyPTEzMzQ7XHJcbiAgICBzdGF0aWMgc2NhbGVNb2RlOnN0cmluZz1cImZpeGVkd2lkdGhcIjtcclxuICAgIHN0YXRpYyBzY3JlZW5Nb2RlOnN0cmluZz1cIm5vbmVcIjtcclxuICAgIHN0YXRpYyBhbGlnblY6c3RyaW5nPVwidG9wXCI7XHJcbiAgICBzdGF0aWMgYWxpZ25IOnN0cmluZz1cImxlZnRcIjtcclxuICAgIHN0YXRpYyBzdGFydFNjZW5lOmFueT1cImxvYWRpbmdTY2VuZS5zY2VuZVwiO1xyXG4gICAgc3RhdGljIHNjZW5lUm9vdDpzdHJpbmc9XCJcIjtcclxuICAgIHN0YXRpYyBkZWJ1Zzpib29sZWFuPWZhbHNlO1xyXG4gICAgc3RhdGljIHN0YXQ6Ym9vbGVhbj1mYWxzZTtcclxuICAgIHN0YXRpYyBwaHlzaWNzRGVidWc6Ym9vbGVhbj1mYWxzZTtcclxuICAgIHN0YXRpYyBleHBvcnRTY2VuZVRvSnNvbjpib29sZWFuPXRydWU7XHJcbiAgICBjb25zdHJ1Y3Rvcigpe31cclxuICAgIHN0YXRpYyBpbml0KCl7XHJcbiAgICAgICAgdmFyIHJlZzogRnVuY3Rpb24gPSBMYXlhLkNsYXNzVXRpbHMucmVnQ2xhc3M7XHJcbiAgICAgICAgcmVnKFwic2NyaXB0L0Fzc2lzdGFudC50c1wiLEFzc2lzdGFudCk7XHJcbiAgICAgICAgcmVnKFwicHVibGljU2NyaXB0L1BhZ2VTY3JpcHQudHNcIixQYWdlU2NyaXB0KTtcclxuICAgICAgICByZWcoXCJwdWJsaWNTY3JpcHQvU2NyZWVuLnRzXCIsU2NyZWVuKTtcclxuICAgICAgICByZWcoXCJ0ZW1wbGF0ZS90cmVuZExpc3QudHNcIix0cmVuZExpc3QpO1xyXG4gICAgICAgIHJlZyhcInNjcmlwdC9DYXJkLnRzXCIsQ2FyZCk7XHJcbiAgICAgICAgcmVnKFwic2NyaXB0L2dyYW5kUHJpeC50c1wiLGdyYW5kUHJpeCk7XHJcbiAgICAgICAgcmVnKFwicHVibGljU2NyaXB0L1BhZ2VOYXZTY3JpcHQudHNcIixQYWdlTmF2U2NyaXB0KTtcclxuICAgICAgICByZWcoXCJ0ZW1wbGF0ZS9wcml4TGlzdC50c1wiLHByaXhMaXN0KTtcclxuICAgICAgICByZWcoXCJzY3JpcHQvR3Vlc3NpbmcudHNcIixHdWVzc2luZyk7XHJcbiAgICAgICAgcmVnKFwidGVtcGxhdGUvbnVtYmVyTGlzdERvbVNjcmlwdC50c1wiLG51bWJlckxpc3REb21TY3JpcHQpO1xyXG4gICAgICAgIHJlZyhcInNjcmlwdC9Ib21lLnRzXCIsSG9tZSk7XHJcbiAgICAgICAgcmVnKFwic2NyaXB0L2xvYWRpbmdTY2VuZS50c1wiLGxvYWRpbmdTY2VuZSk7XHJcbiAgICAgICAgcmVnKFwic2NyaXB0L3ByaUhpc3RvcnlTY2VuZS50c1wiLHByaUhpc3RvcnlTY2VuZSk7XHJcbiAgICAgICAgcmVnKFwidGVtcGxhdGUvcHJpSGlzdG9yeS50c1wiLHByaUhpc3RvcnkpO1xyXG4gICAgICAgIHJlZyhcInNjcmlwdC9SZWNvcmQudHNcIixSZWNvcmQpO1xyXG4gICAgICAgIHJlZyhcInRlbXBsYXRlL2pvaW5SZWNvcmRzLnRzXCIsam9pblJlY29yZHMpO1xyXG4gICAgICAgIHJlZyhcInRlbXBsYXRlL3ByZXZpb3VzUmVjb3Jkcy50c1wiLHByZXZpb3VzUmVjb3Jkcyk7XHJcbiAgICAgICAgcmVnKFwic2NyaXB0L3Nob3J0TGlzdGVkLnRzXCIsc2hvcnRMaXN0ZWQpO1xyXG4gICAgICAgIHJlZyhcInRlbXBsYXRlL3Nob3J0TGlzdGVkTGlzdC50c1wiLHNob3J0TGlzdGVkTGlzdCk7XHJcbiAgICAgICAgcmVnKFwidGVtcGxhdGUvcHN3SW5wdXQudHNcIixwc3dJbnB1dCk7XHJcbiAgICAgICAgcmVnKFwidGVtcGxhdGUvcmFua2luZ0xpc3QudHNcIixyYW5raW5nTGlzdCk7XHJcbiAgICAgICAgcmVnKFwidGVtcGxhdGUvcmVjaGFyZ2VEaWFsb2cudHNcIixyZWNoYXJnZURpYWxvZyk7XHJcbiAgICAgICAgcmVnKFwidmlldy9yb2NrZXREaWFsb2cudHNcIixyb2NrZXREaWFsb2cpO1xyXG4gICAgICAgIHJlZyhcInRlbXBsYXRlL3RpcERpYWxvZy50c1wiLHRpcERpYWxvZyk7XHJcbiAgICAgICAgcmVnKFwidGVtcGxhdGUvd2lubmluZ0xpc3QudHNcIix3aW5uaW5nTGlzdCk7XHJcbiAgICAgICAgcmVnKFwic2NyaXB0L3dpbm5pbmcudHNcIix3aW5uaW5nKTtcclxuICAgIH1cclxufVxyXG5HYW1lQ29uZmlnLmluaXQoKTsiLCJpbXBvcnQgR2FtZUNvbmZpZyBmcm9tIFwiLi9HYW1lQ29uZmlnXCI7XHJcbmltcG9ydCBSb2NrZXREaWFsb2cgZnJvbSBcIi4vdmlldy9yb2NrZXREaWFsb2dcIjtcclxuaW1wb3J0IHsgbG9hZGluZ1Jlc0xpc3QgLCBsb2FkaW5nUmVzTGlzdDEgfSBmcm9tICcuL2xvYWRpbmdSZXNMaXN0J1xyXG5pbXBvcnQgeyBTb2NrZXQgfSBmcm9tIFwiLi9qcy9zb2NrZXRcIjtcclxuaW1wb3J0IExvYWRpbmdTY2VuZSBmcm9tIFwiLi9zY3JpcHQvbG9hZGluZ1NjZW5lXCI7XHJcblxyXG5jbGFzcyBNYWluIHtcclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdMKgLy8g5Zyo5b6u5L+h5Lit77yM5aaC5p6c6Lez6L2s5Yiw5ri45oiP5LmL5YmN6aG16Z2i5L+u5pS55LqGaW5uZXJXZHRo5ZKMaW5uZXJIZWlnaHTvvIzkvJrlr7zoh7Tlrr3pq5jorqHnrpfplJnor69cclxuwqDCoMKgwqDCoMKgwqDCoGNvbnN0IHdpbjogYW55ID0gd2luZG93O1xyXG7CoMKgwqDCoMKgwqDCoMKgd2luLmlubmVyV2lkdGggPSB3aW4ub3V0ZXJXaWR0aDtcclxuwqDCoMKgwqDCoMKgwqDCoHdpbi5pbm5lckhlaWdodCA9IHdpbi5vdXRlckhlaWdodDtcclxuXHRcdC8v5qC55o2uSURF6K6+572u5Yid5aeL5YyW5byV5pOOXHRcdFxyXG5cdFx0aWYgKHdpbmRvd1tcIkxheWEzRFwiXSkgTGF5YTNELmluaXQoR2FtZUNvbmZpZy53aWR0aCwgR2FtZUNvbmZpZy5oZWlnaHQpO1xyXG5cdFx0ZWxzZSBMYXlhLmluaXQoR2FtZUNvbmZpZy53aWR0aCwgR2FtZUNvbmZpZy5oZWlnaHQsIExheWFbXCJXZWJHTFwiXSk7XHJcblx0XHRMYXlhW1wiUGh5c2ljc1wiXSAmJiBMYXlhW1wiUGh5c2ljc1wiXS5lbmFibGUoKTtcclxuXHRcdExheWFbXCJEZWJ1Z1BhbmVsXCJdICYmIExheWFbXCJEZWJ1Z1BhbmVsXCJdLmVuYWJsZSgpO1xyXG5cdFx0TGF5YS5zdGFnZS5zY2FsZU1vZGUgPSBHYW1lQ29uZmlnLnNjYWxlTW9kZTtcclxuXHRcdExheWEuc3RhZ2Uuc2NyZWVuTW9kZSA9IEdhbWVDb25maWcuc2NyZWVuTW9kZTtcclxuXHRcdExheWEuc3RhZ2UuYmdDb2xvciA9ICcjNDk1NWRkJztcclxuXHRcdC8v5YW85a655b6u5L+h5LiN5pSv5oyB5Yqg6L29c2NlbmXlkI7nvIDlnLrmma9cclxuXHRcdExheWEuVVJMLmV4cG9ydFNjZW5lVG9Kc29uID0gR2FtZUNvbmZpZy5leHBvcnRTY2VuZVRvSnNvbjtcclxuXHJcblx0XHQvL+aJk+W8gOiwg+ivlemdouadv++8iOmAmui/h0lEReiuvue9ruiwg+ivleaooeW8j++8jOaIluiAhXVybOWcsOWdgOWinuWKoGRlYnVnPXRydWXlj4LmlbDvvIzlnYflj6/miZPlvIDosIPor5XpnaLmnb/vvIlcclxuXHRcdGlmIChHYW1lQ29uZmlnLmRlYnVnIHx8IExheWEuVXRpbHMuZ2V0UXVlcnlTdHJpbmcoXCJkZWJ1Z1wiKSA9PSBcInRydWVcIikgTGF5YS5lbmFibGVEZWJ1Z1BhbmVsKCk7XHJcblx0XHRpZiAoR2FtZUNvbmZpZy5waHlzaWNzRGVidWcgJiYgTGF5YVtcIlBoeXNpY3NEZWJ1Z0RyYXdcIl0pIExheWFbXCJQaHlzaWNzRGVidWdEcmF3XCJdLmVuYWJsZSgpO1xyXG5cdFx0aWYgKEdhbWVDb25maWcuc3RhdCkgTGF5YS5TdGF0LnNob3coKTtcclxuXHRcdExheWEuYWxlcnRHbG9iYWxFcnJvciA9IHRydWU7XHJcblxyXG5cdFx0Ly/oh6rlrprkuYnkuovku7ZcclxuXHRcdFJvY2tldERpYWxvZy5pbml0KCk7IC8v54Gr566t5byA5aWW5pWI5p6cXHJcblxyXG5cdFx0Ly/mv4DmtLvotYTmupDniYjmnKzmjqfliLbvvIx2ZXJzaW9uLmpzb27nlLFJREXlj5HluIPlip/og73oh6rliqjnlJ/miJDvvIzlpoLmnpzmsqHmnInkuZ/kuI3lvbHlk43lkI7nu63mtYHnqItcclxuXHRcdExheWEuUmVzb3VyY2VWZXJzaW9uLmVuYWJsZShcInZlcnNpb24uanNvblwiLCBMYXlhLkhhbmRsZXIuY3JlYXRlKHRoaXMsIHRoaXMub25WZXJzaW9uTG9hZGVkKSwgTGF5YS5SZXNvdXJjZVZlcnNpb24uRklMRU5BTUVfVkVSU0lPTik7XHJcblx0fVxyXG5cclxuXHRvblZlcnNpb25Mb2FkZWQoKTogdm9pZCB7XHJcblx0XHQvL+a/gOa0u+Wkp+Wwj+WbvuaYoOWwhO+8jOWKoOi9veWwj+WbvueahOaXtuWAme+8jOWmguaenOWPkeeOsOWwj+WbvuWcqOWkp+WbvuWQiOmbhumHjOmdou+8jOWImeS8mOWFiOWKoOi9veWkp+WbvuWQiOmbhu+8jOiAjOS4jeaYr+Wwj+WbvlxyXG5cdFx0TGF5YS5BdGxhc0luZm9NYW5hZ2VyLmVuYWJsZShcImZpbGVjb25maWcuanNvblwiLCBMYXlhLkhhbmRsZXIuY3JlYXRlKHRoaXMsIHRoaXMub25Db25maWdMb2FkZWQpKTtcclxuXHR9XHJcblxyXG5cdG9uQ29uZmlnTG9hZGVkKCk6IHZvaWQge1xyXG5cdFx0Ly8g6L+e5o6ld2Vic29ja2V0XHJcblx0XHRTb2NrZXQuY3JlYXRlU29ja2V0KClcclxuXHRcdExheWEuU2NlbmUub3BlbihHYW1lQ29uZmlnLnN0YXJ0U2NlbmUsdHJ1ZSxudWxsLExheWEuSGFuZGxlci5jcmVhdGUodGhpcyx0aGlzLm9uTG9hZGluZ1NjZW5lT3BlbmVkKSlcclxuXHR9XHJcblx0b25Mb2FkaW5nU2NlbmVPcGVuZWQobG9hZGluZ1NjZW5lOkxvYWRpbmdTY2VuZSk6IHZvaWQge1xyXG5cdFx0Ly/pooTliqDovb1cclxuwqDCoMKgwqDCoMKgwqDCoExheWEubG9hZGVyLmxvYWQobG9hZGluZ1Jlc0xpc3QsIFxyXG5cdFx0XHRMYXlhLkhhbmRsZXIuY3JlYXRlKHRoaXMsIHRoaXMub25HYW1lUmVzTG9hZGVkKSxcclxuXHRcdFx0TGF5YS5IYW5kbGVyLmNyZWF0ZSh0aGlzLHRoaXMub25HYW1lUmVzTG9hZFByb2dyZXNzLFtsb2FkaW5nU2NlbmVdLGZhbHNlKSk7XHJcblx0fVxyXG5cclxuXHRvbkdhbWVSZXNMb2FkUHJvZ3Jlc3MobG9hZGluZ1NjZW5lOkxvYWRpbmdTY2VuZSxwcm9ncmVzczpudW1iZXIpe1xyXG5cdFx0Y29uc29sZS5sb2cobG9hZGluZ1NjZW5lKTtcclxuXHRcdFxyXG5cdFx0bG9hZGluZ1NjZW5lLnNldFByb2dyZXNzKHByb2dyZXNzKVxyXG5cdH1cclxuXHJcblx0b25HYW1lUmVzTG9hZGVkKCk6dm9pZCB7XHJcblx0XHQvL+WKoOi9vUlEReaMh+WumueahOWcuuaZr1xyXG5cdFx0TGF5YS5TY2VuZS5vcGVuKCdob21lLnNjZW5lJyx0cnVlLG51bGwsTGF5YS5IYW5kbGVyLmNyZWF0ZSh0aGlzLCgoKT0+e1xyXG5cdFx0XHRMYXlhLmxvYWRlci5sb2FkKGxvYWRpbmdSZXNMaXN0MSk7XHJcblx0XHR9KSkpO1xyXG5cdH1cclxufVxyXG4vL+a/gOa0u+WQr+WKqOexu1xyXG5uZXcgTWFpbigpO1xyXG4iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjAgMTQ6MTE6MjZcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjAgMTQ6MTE6MjZcclxuICogQGRlc2Mg5pWw5o2u6YCa5L+h5Y+K5L+d5a2Y5o6l5Y+jXHJcbiAqL1xyXG5cclxuZXhwb3J0IGNsYXNzIEdhbWVNb2RlbCBleHRlbmRzIExheWEuRXZlbnREaXNwYXRjaGVyIHtcclxuICAgIHByaXZhdGUgc3RhdGljIF9nYW1lTW9kZWxJbnN0YW5jZTogR2FtZU1vZGVsO1xyXG5cclxuICAgIHN0YXRpYyBnZXRJbnN0YW5jZSgpOiBHYW1lTW9kZWwge1xyXG4gICAgICAgIGlmICghdGhpcy5fZ2FtZU1vZGVsSW5zdGFuY2UpIHtcclxuICAgICAgICAgICAgdGhpcy5fZ2FtZU1vZGVsSW5zdGFuY2UgPSBuZXcgR2FtZU1vZGVsKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzLl9nYW1lTW9kZWxJbnN0YW5jZTtcclxuICAgIH1cclxuXHJcbiAgICAvKirkv53lrZjnlKjmiLfkv6Hmga8gKi9cclxuICAgIHVzZXJJbmZvOm9iamVjdCA9IHt9OyAvL+eUqOaIt+S/oeaBr1xyXG4gICAgc2V0VXNlckluZm8odXNlckluZm86b2JqZWN0KXtcclxuICAgICAgICB0aGlzLnVzZXJJbmZvID0gdXNlckluZm87XHJcbiAgICAgICAgdGhpcy5ldmVudCgnZ2V0VXNlckluZm8nLHRoaXMudXNlckluZm8pXHJcbiAgICB9XHJcblxyXG4gICAgLyoq5L+d5a2Y6KKr6LSt5Lmw5Y+356CBICovXHJcbiAgICBidXlHb29kc0FycjphbnkgPSBbXTsgLy/ooqvotK3kubDlj7fnoIFcclxuICAgIHNldEdvb2RzQXJyKGdvb2RzQXJyOmFueSkge1xyXG4gICAgICAgIHRoaXMuYnV5R29vZHNBcnIgPSBnb29kc0FycjtcclxuICAgICAgICB0aGlzLmV2ZW50KCdnZXRidXlHb29kc0FycicsW3RoaXMuYnV5R29vZHNBcnJdKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKuS/neWtmOeBq+eureaVsOaNriAqL1xyXG4gICAgcm9ja2V0RGF0YTpPYmplY3QgPSB7fTtcclxuICAgIHNldFJvY2tldERhdGEoZGF0YTpvYmplY3Qpe1xyXG4gICAgICAgIHRoaXMucm9ja2V0RGF0YSA9IGRhdGE7XHJcbiAgICAgICAgdGhpcy5ldmVudCgnZ2V0Um9ja2V0RGF0YScsdGhpcy5yb2NrZXREYXRhKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKuaYr+WQpuW8gOWlluS6hiAqL1xyXG4gICAgaXNUb2dnbGUoc3RhdHVzOmJvb2xlYW4pe1xyXG4gICAgICAgIHRoaXMuZXZlbnQoJ2lzVG9nZ2xlJyxzdGF0dXMpXHJcbiAgICB9XHJcblxyXG4gICAgLyoq6YCa55+l5Lit5aWWICovXHJcbiAgICBub3RpY2VGdW5jKHN0YXR1czpib29sZWFuKXtcclxuICAgICAgICB0aGlzLmV2ZW50KCdnZXROb3RpY2UnLHN0YXR1cylcclxuICAgIH1cclxuICAgIFxyXG4gICAgLyoq54Gr566t5aSn5aWW5o6S6KGM5ZCN5Y2VICovXHJcbiAgICByb2NrZXRSYW5raW5nOm9iamVjdFtdID0gW107XHJcbiAgICBzZXRSb2NrZXRSYW5raW5nKGRhdGE6b2JqZWN0W10pe1xyXG4gICAgICAgIHRoaXMucm9ja2V0UmFua2luZyA9IGRhdGE7XHJcbiAgICAgICAgdGhpcy5ldmVudCgnZ2V0Um9ja2V0UmFua2luZycsW3RoaXMucm9ja2V0UmFua2luZ10pXHJcbiAgICB9XHJcbn0iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjAgMTU6MTU6MDhcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjAgMTU6MTU6MDhcclxuICogQGRlc2MgYXBp5o6l5Y+j57uf5LiA5bCB6KOF5aSE55CGXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgZ2V0LCBwb3N0IH0gZnJvbSAnLi9odHRwJztcclxuaW1wb3J0IHsgR2FtZU1vZGVsIH0gZnJvbSAnLi9HYW1lTW9kZWwnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQge1xyXG4gICAgLyoq6I635Y+W55So5oi35L+h5oGvICovXHJcbiAgICBnZXRVc2VySW5mbygpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBnZXQoJy91c2VyL2dldEluZm8nLCB7fSkudGhlbigocmVzOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICghcmVzLmNvZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyDkv53lrZjnlKjmiLfkv6Hmga9cclxuICAgICAgICAgICAgICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5zZXRVc2VySW5mbyhyZXMudXNlckluZm8pXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXMpXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLnNldFVzZXJJbmZvKHt9KVxyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXMpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgIH0sXHJcblxyXG4gICAgLyoq6I635Y+W5LuK5pel5aSn5aWW5rGgICovXHJcbiAgICBnZXRSYW5rVG9kYXkoKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgZ2V0KCcvcmFuay90b2RheScsIHt9KS50aGVuKChyZXM6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9LFxyXG4gICAgLyoq6I635Y+W5aSn5aWW5rGg5Y6G5Y+y6K6w5b2VXHJcbiAgICAgKiBAcGFyYW0gY291bnRUaW1lIFvpgInloatdIOaXpeacn1xyXG4gICAgICovXHJcbiAgICBnZXRSYW5rSGlzdG9yeShjb3VudFRpbWU/OnN0cmluZyl7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgZ2V0KCcvcmFuay9oaXN0b3J5Jywge2NvdW50VGltZX0pLnRoZW4oKHJlczogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXJlcy5jb2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXMpXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXMpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgIH0sXHJcbiAgICAvKirojrflj5bpppbpobXllYblk4HliJfooaggKi9cclxuICAgIGdldEdvb2RzTGlzdCgpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBnZXQoJy9nb29kcy9pbmRleCcsIHt9KS50aGVuKChyZXM6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9LFxyXG5cclxuICAgIC8qKuiOt+WPluWVhuWTgeivpuaDhVxyXG4gICAgICogQHBhcmFtIGdvb2RzSWQg5ZWG5ZOBaWRcclxuICAgICAqL1xyXG4gICAgZ2V0R29vZHNEZXRhaWxzKGdvb2RzSWQ6c3RyaW5nKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGdldCgnL2dvb2RzL2dldCcsIHsgZ29vZHNJZCB9KS50aGVuKChyZXM6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9LFxyXG5cclxuICAgIC8qKuiOt+WPluWPguS4juiusOW9lVxyXG4gICAgICogQHBhcmFtIHBhZ2UgW+mAieWhq10g6aG156CBMVxyXG4gICAgICogQHBhcmFtIHBhZ2VTaXplICBb6YCJ5aGrXSDliIbpobXmlbAg6buY6K6kMjBcclxuICAgICAqL1xyXG4gICAgZ2V0TXlPcmRlcnMocGFnZTpudW1iZXIgPSAxLHBhZ2VTaXplOm51bWJlciA9IDIwKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGdldCgnL29yZGVyL215T3JkZXJzJyx7cGFnZSxwYWdlU2l6ZX0pLnRoZW4oKHJlczphbnkpPT57XHJcbiAgICAgICAgICAgICAgICBpZiAoIXJlcy5jb2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXMpXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXMpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgIH0sXHJcbiAgICBcclxuICAgIC8qKuiOt+WPluW+gOacn+iusOW9lVxyXG4gICAgICogQHBhcmFtIHBhZ2UgW+mAieWhq10g6aG156CBMVxyXG4gICAgICogQHBhcmFtIHBhZ2VTaXplICBb6YCJ5aGrXSDliIbpobXmlbAg6buY6K6kMjBcclxuICAgICAqIEBwYXJhbSBjb3VudFRpbWUgW+mAieWhq10g5p+l6K+i5pe26Ze0XHJcbiAgICAgKiBAcGFyYW0gc2VhcmNoS2V5IFvpgInloatdIOafpeivouacn+WPt1xyXG4gICAgICovXHJcbiAgICBnZXRHb29kc0hpc3RvcnkocGFnZTpudW1iZXIgPSAxLHBhZ2VTaXplOm51bWJlciA9IDIwLGNvdW50VGltZT86c3RyaW5nLHNlYXJjaEtleT86c3RyaW5nKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGdldCgnL2dvb2RzL2hpc3RvcnknLHtwYWdlLHBhZ2VTaXplLGNvdW50VGltZSxzZWFyY2hLZXl9KS50aGVuKChyZXM6YW55KT0+e1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9LFxyXG5cclxuICAgIC8qKuiOt+WPluWVhuWTgeexu+WeiyAqL1xyXG4gICAgZ2V0R29vZHNDYXRlTGlzdCgpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XHJcbiAgICAgICAgICAgIGdldCgnL2dvb2RzL2NhdGVMaXN0Jyx7fSkudGhlbigocmVzOmFueSk9PntcclxuICAgICAgICAgICAgICAgIGlmICghcmVzLmNvZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlcylcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlcylcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9KVxyXG4gICAgfSxcclxuXHJcbiAgICAvKirojrflj5botbDlir9cclxuICAgICAqIEBwYXJhbSBnb29kc1R5cGUg5ZWG5ZOB57G75Z6LXHJcbiAgICAgKiBAcGFyYW0gcGFnZSBb6YCJ5aGrXSDpobXnoIExXHJcbiAgICAgKiBAcGFyYW0gcGFnZVNpemUgW+mAieWhq10g5YiG6aG15pWwIOm7mOiupDIwXHJcbiAgICAgKi9cclxuICAgIGdldEdvb2RzVHJlbmQoZ29vZHNUeXBlOnN0cmluZyxwYWdlOm51bWJlciA9IDEscGFnZVNpemU6bnVtYmVyID0gMjApe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XHJcbiAgICAgICAgICAgIGdldCgnL2dvb2RzL3RyZW5kJyx7Z29vZHNUeXBlLHBhZ2UscGFnZVNpemV9KS50aGVuKChyZXM6YW55KT0+e1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9LFxyXG5cclxuICAgIC8qKuiOt+WPluWWnOS7juWkqemZjeS4reWlluWQjeWNlVxyXG4gICAgICogQHBhcmFtIHBhZ2UgW+mAieWhq10g6aG156CBMVxyXG4gICAgICogQHBhcmFtIHBhZ2VTaXplICBb6YCJ5aGrXSDliIbpobXmlbAg6buY6K6kMjBcclxuICAgICAqL1xyXG4gICAgZ2V0WGN0akxpc3QocGFnZTpudW1iZXIgPSAxLHBhZ2VTaXplOm51bWJlciA9IDIwKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGdldCgnL1hjdGovYm9udXNMaXN0cycse3BhZ2UscGFnZVNpemV9KS50aGVuKChyZXM6YW55KT0+e1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9LFxyXG4gICAgXHJcbiAgICAvKirojrflj5blhaXlm7TlkI3ljZVcclxuICAgICAqIEBwYXJhbSBwYWdlIFvpgInloatdIOmhteeggTFcclxuICAgICAqIEBwYXJhbSBwYWdlU2l6ZSAgW+mAieWhq10g5YiG6aG15pWwIOm7mOiupDIwXHJcbiAgICAgKiBAcGFyYW0gZGF0ZSBb6YCJ5aGrXSDml7bpl7RcclxuICAgICAqL1xyXG4gICAgZ2V0U2hvcnRMaXN0ZWQocGFnZTpudW1iZXIgPSAxLHBhZ2VTaXplOm51bWJlciA9IDIwLGRhdGU/OnN0cmluZyl7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBnZXQoJy9YY3RqL3Nob3J0TGlzdGVkJyx7cGFnZSxwYWdlU2l6ZSxkYXRlfSkudGhlbigocmVzOmFueSk9PntcclxuICAgICAgICAgICAgICAgIGlmICghcmVzLmNvZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlcylcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlcylcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9KVxyXG4gICAgfSxcclxuXHJcbiAgICAvKirotK3kubBcclxuICAgICAqIEBwYXJhbSBwZXJpb2Qg5pyf5Y+3XHJcbiAgICAgKiBAcGFyYW0gY29kZUxpc3Qg5omA6YCJ5Y+356CBXHJcbiAgICAgKiBAcGFyYW0gZXhjaGFuZ2VQd2Qg5Lqk5piT5a+G56CBXHJcbiAgICAgKi9cclxuICAgIHBvc3RUcmFkZUJ1eShwZXJpb2Q6c3RyaW5nLGNvZGVMaXN0OnN0cmluZyxleGNoYW5nZVB3ZDpzdHJpbmcpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpID0+IHtcclxuICAgICAgICAgICAgcG9zdCgnL3RyYWRlL2J1eScsIHsgcGVyaW9kLGNvZGVMaXN0LGV4Y2hhbmdlUHdkIH0pLnRoZW4oKHJlczogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXJlcy5jb2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5nZXRVc2VySW5mbygpXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXMpXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXMpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgIH0sXHJcbn0iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDU6MDZcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDU6MDZcclxuICogQGRlc2MgYXhpb3PnvZHnu5zor7fmsYLlsIHoo4VcclxuICovXHJcbmltcG9ydCBheGlvcyBmcm9tIFwiYXhpb3NcIjtcclxuXHJcbmF4aW9zLmRlZmF1bHRzLnRpbWVvdXQgPSAxMDAwMDtcclxuYXhpb3MuZGVmYXVsdHMuaGVhZGVycy5wb3N0WydDb250ZW50LVR5cGUnXSA9ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnO1xyXG5heGlvcy5kZWZhdWx0cy53aXRoQ3JlZGVudGlhbHMgPSB0cnVlOyAgLy/or7fmsYLmkLrluKZjb29raWVcclxuLy8gYXhpb3MuZGVmYXVsdHMuY3Jvc3NEb21haW4gPSB0cnVlOyAgLy/or7fmsYLmkLrluKbpop3lpJbmlbDmja4o5LiN5YyF5ZCrY29va2llKVxyXG5cclxuY29uc3QgZG9tYWluID0gZG9jdW1lbnQuZG9tYWluO1xyXG5pZiAoZG9tYWluLmluZGV4T2YoJ3QtY2VudGVyJykgPj0gMCB8fCBkb21haW4gPT09ICdsb2NhbGhvc3QnKSB7XHJcbiAgYXhpb3MuZGVmYXVsdHMuYmFzZVVSTCA9ICdodHRwczovL3QtYXBpLnh5aGouaW8vdjEvdy96aC8nXHJcbiAgLy8gYXhpb3MuZGVmYXVsdHMuYmFzZVVSTCA9ICdodHRwczovL2dhbWUueHloai5pby92MS93L3poJ1xyXG59IGVsc2Uge1xyXG4gIGF4aW9zLmRlZmF1bHRzLmJhc2VVUkwgPSAnaHR0cHM6Ly9nYW1lLnh5aGouaW8vdjEvdy96aCdcclxufVxyXG5cclxuLyoq5bCGcG9zdOaVsOaNrui9rOS4umZvcm1EYXRh5qC85byPICovXHJcbmZ1bmN0aW9uIGZvcm1EYXRhRnVuYyhwYXJhbXM6T2JqZWN0KSB7XHJcbiAgY29uc3QgZm9ybSA9IG5ldyBGb3JtRGF0YSgpO1xyXG4gIGZvciAoY29uc3Qga2V5IGluIHBhcmFtcykge1xyXG4gICAgZm9ybS5hcHBlbmQoa2V5LHBhcmFtc1trZXldKTtcclxuICB9XHJcbiAgcmV0dXJuIGZvcm1cclxufVxyXG5cclxuLyoq5ri45oiP5bmz5Y+w5o6l5Y+jICovXHJcbmNvbnN0IGdhbWVDZW50ZXIgPSBbJy91c2VyL2xvZ2luJywnL3VzZXIvZ2V0SW5mbyddXHJcblxyXG4vL2h0dHAgcmVxdWVzdCDmi6bmiKrlmahcclxuYXhpb3MuaW50ZXJjZXB0b3JzLnJlcXVlc3QudXNlKFxyXG4gIGNvbmZpZyA9PiB7XHJcbiAgICAvL+iuvue9rkFIb3N0XHJcbiAgICBpZiAoY29uZmlnLnVybC5pbmRleE9mKCcvdXNlci8nKSA+PSAwICkge1xyXG4gICAgICBjb25maWcuaGVhZGVyc1snQUhvc3QnXSA9ICdnYW1lQ2VudGVyJ1xyXG4gICAgfWVsc2V7XHJcbiAgICAgIGNvbmZpZy5oZWFkZXJzWydBSG9zdCddID0gJ3N0YXJSb2NrZXQnO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChjb25maWcubWV0aG9kID09ICdwb3N0Jykge1xyXG4gICAgICBjb25maWcuZGF0YSA9IGZvcm1EYXRhRnVuYyh7XHJcbiAgICAgICAgLi4uY29uZmlnLmRhdGFcclxuICAgICAgfSlcclxuICAgIH1lbHNlIGlmKGNvbmZpZy5tZXRob2QgPT0gJ2dldCcpe1xyXG4gICAgICBjb25maWcucGFyYW1zID0ge1xyXG4gICAgICAgIC4uLmNvbmZpZy5wYXJhbXMsXHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBjb25maWc7XHJcbiAgfSxcclxuICBlcnJvciA9PiB7XHJcbiAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZXJyb3IpO1xyXG4gIH1cclxuKTtcclxuLy9odHRwIHJlc3BvbnNlIOaLpuaIquWZqFxyXG5heGlvcy5pbnRlcmNlcHRvcnMucmVzcG9uc2UudXNlKFxyXG4gIHJlc3BvbnNlID0+IHtcclxuICAgIGlmICghcmVzcG9uc2UuZGF0YS5zdWNjZXNzKSB7XHJcbiAgICAgIC8v6ZSZ6K+v5aSE55CGXHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmVzcG9uc2U7XHJcbiAgfSxcclxuICBlcnJvciA9PiB7XHJcbiAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZXJyb3IpO1xyXG4gIH1cclxuKTtcclxuXHJcbi8qKlxyXG4gKiDlsIHoo4VnZXTmlrnms5VcclxuICogQHBhcmFtIHVybFxyXG4gKiBAcGFyYW0gZGF0YVxyXG4gKiBAcmV0dXJucyB7UHJvbWlzZX1cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXQodXJsOnN0cmluZywgcGFyYW1zOk9iamVjdCkge1xyXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICBheGlvcy5nZXQodXJsLCB7IHBhcmFtcyB9KS50aGVuKHJlc3BvbnNlID0+IHtcclxuICAgICAgaWYgKCFyZXNwb25zZS5kYXRhLnN1Y2Nlc3MpIHtcclxuICAgICAgICByZXNvbHZlKHJlc3BvbnNlLmRhdGEuZXJyb3IpO1xyXG4gICAgICB9ZWxzZSB7XHJcbiAgICAgICAgcmVzb2x2ZShyZXNwb25zZS5kYXRhLnBheWxvYWQpO1xyXG4gICAgICB9XHJcbiAgICB9KS5jYXRjaChlcnIgPT4ge1xyXG4gICAgICByZWplY3QoZXJyKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG59XHJcblxyXG4vKipcclxuICog5bCB6KOFcG9zdOivt+axglxyXG4gKiBAcGFyYW0gdXJsXHJcbiAqIEBwYXJhbSBkYXRhXHJcbiAqIEByZXR1cm5zIHtQcm9taXNlfVxyXG4gKi9cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBwb3N0KHVybDpzdHJpbmcsIGRhdGE6T2JqZWN0KSB7XHJcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgIGF4aW9zLnBvc3QodXJsLCBkYXRhKS50aGVuKFxyXG4gICAgICByZXNwb25zZSA9PiB7XHJcbiAgICAgICAgaWYgKCFyZXNwb25zZS5kYXRhLnN1Y2Nlc3MpIHtcclxuICAgICAgICAgIHJlc29sdmUocmVzcG9uc2UuZGF0YS5lcnJvcik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHJlc29sdmUocmVzcG9uc2UuZGF0YS5wYXlsb2FkKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIGVyciA9PiB7XHJcbiAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgIH1cclxuICAgICk7XHJcbiAgfSk7XHJcbn1cclxuIiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAzLTE1IDE0OjUyOjM0XHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAzLTE1IDE0OjUyOjM0XHJcbiAqIEBkZXNjIGxheWHlhazlhbHlt6Xlhbfmlrnms5VcclxuICovXHJcblxyXG5leHBvcnQgZGVmYXVsdCB7XHJcbiAgICBnZXRTY3JlZW4oKXtcclxuICAgICAgICBjb25zdCBzY2VuZUNvbnRhaW5lcjogTGF5YS5TcHJpdGUgPSBMYXlhLlNjZW5lLnJvb3QgYXMgTGF5YS5TcHJpdGU7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzY2VuZUNvbnRhaW5lci5udW1DaGlsZHJlbjsgaSsrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNoaWxkID0gc2NlbmVDb250YWluZXIuZ2V0Q2hpbGRBdChpKTtcclxuICAgICAgICAgICAgaWYgKGNoaWxkIGluc3RhbmNlb2YgTGF5YS5TY2VuZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNoaWxkO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG59IiwiaW1wb3J0IHsgR2FtZU1vZGVsIH0gZnJvbSBcIi4vR2FtZU1vZGVsXCI7XHJcbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xyXG5cclxuXHJcbi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0yMSAxMTo0NjoxNVxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yMSAxMTo0NjoxNVxyXG4gKiBAZGVzYyB3ZWJzb2NrZXTov57mjqVcclxuICovXHJcblxyXG4vL3tcImFwcElkXCI6XCJsdWNreXJvY2tldFwiLFwiZXZlbnRcIjpbe1widG9nZ2xlXCI6MCxcInR5cGVcIjpcInR5cGVfdmFsdWVcIixcImV4cGlyZVRpbWVcIjowfV19XHJcblxyXG5leHBvcnQgY2xhc3MgU29ja2V0IGV4dGVuZHMgTGF5YS5VSUNvbXBvbmVudCB7XHJcbiAgICBcclxuICAgIHN0YXRpYyBXU19VUkw6IHN0cmluZyA9IGB3c3M6Ly90LXdzcy54eWhqLmlvL3dzP2FwcGlkPWx1Y2t5cm9ja2V0QXBwYFxyXG4gICAgc3RhdGljIFdTOiBhbnkgPSAnJztcclxuICAgIC8qKjMw56eS5LiA5qyh5b+D6LezICovXHJcbiAgICBzdGF0aWMgc2V0SW50ZXJ2YWxXZXNvY2tldFB1c2g6YW55ID0gbnVsbDsgXHJcblxyXG4gICAgLyoq5bu656uL6L+e5o6lICovXHJcbiAgICBzdGF0aWMgY3JlYXRlU29ja2V0KCkge1xyXG4gICAgICAgIGNvbnN0IHVzZXJJbmZvOmFueSA9IEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLnVzZXJJbmZvO1xyXG4gICAgICAgIGlmICh1c2VySW5mby51c2VySWQpIHtcclxuICAgICAgICAgICAgU29ja2V0LldTX1VSTCA9IFNvY2tldC5XU19VUkwgKyBgJnVpZD0ke3VzZXJJbmZvLnVzZXJJZH1gXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghU29ja2V0LldTKSB7XHJcbiAgICAgICAgICAgIC8vIFNvY2tldC5XUy5jbG9zZSgpXHJcbiAgICAgICAgICAgIFNvY2tldC5XUyA9IG5ldyBXZWJTb2NrZXQoU29ja2V0LldTX1VSTClcclxuICAgICAgICAgICAgU29ja2V0LldTLm9ub3BlbiA9IFNvY2tldC5vbm9wZW5XUztcclxuICAgICAgICAgICAgU29ja2V0LldTLm9ubWVzc2FnZSA9IFNvY2tldC5vbm1lc3NhZ2VXUztcclxuICAgICAgICAgICAgU29ja2V0LldTLm9uZXJyb3IgPSBTb2NrZXQub25lcnJvcldTO1xyXG4gICAgICAgICAgICBTb2NrZXQuV1Mub25jbG9zZSA9IFNvY2tldC5vbmNsb3NlV1M7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLyoq5omT5byAV1PkuYvlkI7lj5HpgIHlv4Pot7MgKi9cclxuICAgIHN0YXRpYyBvbm9wZW5XUygpIHtcclxuICAgICAgICBTb2NrZXQuc2VuZFBpbmcoKTsgLy/lj5HpgIHlv4Pot7NcclxuICAgIH1cclxuICAgIC8qKui/nuaOpeWksei0pemHjei/niAqL1xyXG4gICAgc3RhdGljIG9uZXJyb3JXUygpIHtcclxuICAgICAgICBTb2NrZXQuV1MuY2xvc2UoKTtcclxuICAgICAgICBTb2NrZXQuY3JlYXRlU29ja2V0KCk7IC8v6YeN6L+eXHJcbiAgICB9XHJcbiAgICAvKipXU+aVsOaNruaOpeaUtue7n+S4gOWkhOeQhiAqL1xyXG4gICAgc3RhdGljIG9ubWVzc2FnZVdTKGU6IGFueSkge1xyXG4gICAgICAgIGxldCByZWRhdGE6YW55O1xyXG4gICAgICAgIGxldCBwYXlsb2FkOmFueTtcclxuICAgICAgICBpZiAoZS5kYXRhID09PSAnb2snIHx8IGUuZGF0YSA9PT0gJ3BvbmcnKSB7XHJcbiAgICAgICAgICAgIHJlZGF0YSA9IGUuZGF0YTsgLy8g5pWw5o2uXHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIHJlZGF0YSA9IEpTT04ucGFyc2UoZS5kYXRhKTsgLy8g5pWw5o2uXHJcbiAgICAgICAgICAgIHBheWxvYWQgPSByZWRhdGEucGF5bG9hZDtcclxuICAgICAgICAgICAgLy8g5LiL5Y+R6LSt5Lmw5Y+356CBXHJcbiAgICAgICAgICAgIGlmIChwYXlsb2FkLnR5cGUgPT09ICdwdXJjaGFzZWQnKSB7XHJcbiAgICAgICAgICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5zZXRHb29kc0FycihwYXlsb2FkLmdvb2RzKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIOS4i+WPkemmlumhteaVsOaNrlxyXG4gICAgICAgICAgICBpZiAocGF5bG9hZC50eXBlID09PSAnaW5kZXgnKSB7XHJcbiAgICAgICAgICAgICAgICAvLyDliLfmlrDngavnrq3mlbDmja5cclxuICAgICAgICAgICAgICAgIEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLnNldFJvY2tldERhdGEocGF5bG9hZC5yYW5raW5nKVxyXG4gICAgICAgICAgICAgICAgLy8g5piv5ZCm5byA5aWW5LqGXHJcbiAgICAgICAgICAgICAgICBpZiAocGF5bG9hZC50b2dnbGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5pc1RvZ2dsZSh0cnVlKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIOS4i+WPkeS4reWlluWQjeWNlVxyXG4gICAgICAgICAgICBpZiAocGF5bG9hZC50eXBlID09PSAnd2lubmluZycpIHtcclxuICAgICAgICAgICAgICAgIEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLm5vdGljZUZ1bmModHJ1ZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyDkuIvlj5Hngavnrq3lpKflpZbmjpLooYzlkI3ljZVcclxuICAgICAgICAgICAgaWYgKHBheWxvYWQudHlwZSA9PT0gJ3JhbmtpbmcnKSB7XHJcbiAgICAgICAgICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5zZXRSb2NrZXRSYW5raW5nKHBheWxvYWQudXNlckluZm8pXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvKirlj5HpgIHmlbDmja4gKi9cclxuICAgIHN0YXRpYyBzZW5kV1NQdXNoKHR5cGU/OiBhbnksdG9nZ2xlOmFueSA9IDEpIHtcclxuICAgICAgICBsZXQgb2JqID0ge1xyXG4gICAgICAgICAgICBcImFwcElkXCI6IFwibHVja3lyb2NrZXRBcHBcIiwgXHJcbiAgICAgICAgICAgIFwiZXZlbnRcIjogW1xyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIFwidHlwZVwiOiB0eXBlLCBcclxuICAgICAgICAgICAgICAgICAgICBcInRvZ2dsZVwiOiB0b2dnbGUsIFxyXG4gICAgICAgICAgICAgICAgICAgIFwiZXhwaXJlVGltZVwiOiAxODAwXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKFNvY2tldC5XUyAhPT0gbnVsbCAmJiBTb2NrZXQuV1MucmVhZHlTdGF0ZSA9PT0gMykge1xyXG4gICAgICAgICAgICBTb2NrZXQuV1MuY2xvc2UoKTtcclxuICAgICAgICAgICAgU29ja2V0LmNyZWF0ZVNvY2tldCgpOy8v6YeN6L+eXHJcbiAgICAgICAgfSBlbHNlIGlmKFNvY2tldC5XUy5yZWFkeVN0YXRlID09PSAxKSB7XHJcbiAgICAgICAgICAgIFNvY2tldC5XUy5zZW5kKEpTT04uc3RyaW5naWZ5KG9iaikpXHJcbiAgICAgICAgfWVsc2UgaWYoU29ja2V0LldTLnJlYWR5U3RhdGUgPT09IDApe1xyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgIFNvY2tldC5XUy5zZW5kKEpTT04uc3RyaW5naWZ5KG9iaikpXHJcbiAgICAgICAgICAgIH0sIDIwMDApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8qKuWFs+mXrVdTICovXHJcbiAgICBzdGF0aWMgb25jbG9zZVdTKCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCfmlq3lvIDov57mjqUnKTtcclxuICAgIH1cclxuICAgIC8qKuWPkemAgeW/g+i3syAqL1xyXG4gICAgc3RhdGljIHNlbmRQaW5nKCl7XHJcbiAgICAgICAgU29ja2V0LldTLnNlbmQoJ3BpbmcnKTtcclxuICAgICAgICBTb2NrZXQuc2V0SW50ZXJ2YWxXZXNvY2tldFB1c2ggPSBzZXRJbnRlcnZhbCgoKSA9PiB7XHJcbiAgICAgICAgICAgIFNvY2tldC5XUy5zZW5kKCdwaW5nJyk7XHJcbiAgICAgICAgfSwgMzAwMDApXHJcbiAgICB9XHJcbn1cclxuXHJcbiIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0NToyOFxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0NToyOFxyXG4gKiBAZGVzYyDlt6Xlhbflh73mlbDpm4blkIhcclxuICovXHJcbmV4cG9ydCBkZWZhdWx0IHtcclxuICAgIC8qKlxyXG4gICAgICog5Y2D5YiG5L2N5qC85byP5YyWXHJcbiAgICAgKiBAcGFyYW0ge251bWJlciB8IHN0cmluZ30gbnVtIOagvOW8j+WMluaVsOWtl1xyXG4gICAgICovXHJcbiAgICBjb21kaWZ5KG51bTogYW55KSB7XHJcbiAgICAgICAgcmV0dXJuIG51bS50b1N0cmluZygpLnJlcGxhY2UoL1xcZCsvLCBmdW5jdGlvbiAobikgeyAvLyDlhYjmj5Dlj5bmlbTmlbDpg6jliIZcclxuICAgICAgICAgICAgcmV0dXJuIG4ucmVwbGFjZSgvKFxcZCkoPz0oXFxkezN9KSskKS9nLCBmdW5jdGlvbiAoJDEpIHsgLy8g5a+55pW05pWw6YOo5YiG5re75Yqg5YiG6ZqU56ymXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJDEgKyBcIixcIjtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5aSN5Yi2XHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29weUluZm8g5aSN5Yi25YaF5a65XHJcbiAgICAgKi9cclxuICAgIENvcHkoY29weUluZm86IGFueSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBjb3B5VXJsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlucHV0XCIpOyAvL+WIm+W7uuS4gOS4qmlucHV05qGG6I635Y+W6ZyA6KaB5aSN5Yi255qE5paH5pys5YaF5a65XHJcbiAgICAgICAgICAgIGNvcHlVcmwudmFsdWUgPSBjb3B5SW5mbztcclxuICAgICAgICAgICAgbGV0IGFwcERpdiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhcHAnKTtcclxuICAgICAgICAgICAgYXBwRGl2LmFwcGVuZENoaWxkKGNvcHlVcmwpO1xyXG4gICAgICAgICAgICBjb3B5VXJsLnNlbGVjdCgpO1xyXG4gICAgICAgICAgICBkb2N1bWVudC5leGVjQ29tbWFuZChcIkNvcHlcIik7XHJcbiAgICAgICAgICAgIGNvcHlVcmwucmVtb3ZlKClcclxuICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcclxuICAgICAgICB9KVxyXG4gICAgfSxcclxuXHJcbiAgICAvKiog5Yik5pat5piv5ZCm5Li65omL5py6Ki9cclxuICAgIGlzUGhvbmUobnVtOiBhbnkpIHtcclxuICAgICAgICB2YXIgcmVnID0gL14xWzM0NTY3ODldXFxkezl9JC87XHJcbiAgICAgICAgcmV0dXJuIHJlZy50ZXN0KG51bSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5YCS6K6h5pe2XHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZyB8IG51bWJlcn0gdGltZXMg5Ymp5L2Z5q+r56eS5pWwIFxyXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sg5Zue6LCD5Ye95pWwXHJcbiAgICAgKi9cclxuICAgIGNvdW50RG93bih0aW1lczogYW55LCBjYWxsYmFjazogYW55KSB7XHJcbiAgICAgICAgbGV0IHRpbWVyID0gbnVsbDtcclxuICAgICAgICB0aW1lciA9IHNldEludGVydmFsKCgpID0+IHtcclxuICAgICAgICAgICAgaWYgKHRpbWVzID4gMCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGRheTogYW55ID0gTWF0aC5mbG9vcih0aW1lcyAvICg2MCAqIDYwICogMjQpKTtcclxuICAgICAgICAgICAgICAgIGxldCBob3VyOiBhbnkgPSBNYXRoLmZsb29yKHRpbWVzIC8gKDYwICogNjApKSAtIChkYXkgKiAyNCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgbWludXRlOiBhbnkgPSBNYXRoLmZsb29yKHRpbWVzIC8gNjApIC0gKGRheSAqIDI0ICogNjApIC0gKGhvdXIgKiA2MCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2Vjb25kOiBhbnkgPSBNYXRoLmZsb29yKHRpbWVzKSAtIChkYXkgKiAyNCAqIDYwICogNjApIC0gKGhvdXIgKiA2MCAqIDYwKSAtIChtaW51dGUgKiA2MCk7XHJcbiAgICAgICAgICAgICAgICBkYXkgPSBgJHtkYXkgPCAxMCA/ICcwJyA6ICcnfSR7ZGF5fWA7XHJcbiAgICAgICAgICAgICAgICBob3VyID0gYCR7aG91ciA8IDEwID8gJzAnIDogJyd9JHtob3VyfWA7XHJcbiAgICAgICAgICAgICAgICBtaW51dGUgPSBgJHttaW51dGUgPCAxMCA/ICcwJyA6ICcnfSR7bWludXRlfWA7XHJcbiAgICAgICAgICAgICAgICBzZWNvbmQgPSBgJHtzZWNvbmQgPCAxMCA/ICcwJyA6ICcnfSR7c2Vjb25kfWA7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhgJHtob3VyfToke21pbnV0ZX06JHtzZWNvbmR9YClcclxuICAgICAgICAgICAgICAgIHRpbWVzLS07XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHRpbWVyKTtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSwgMTAwMCk7XHJcbiAgICAgICAgaWYgKHRpbWVzIDw9IDApIHtcclxuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aW1lcik7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKVxyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiDlsIbmoLzlvI/ljJbml6XmnJ/ovazmjaLmiJDml7bpl7TmiLNcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBteURhdGUg5qC85byP5YyW5pel5pyfXHJcbiAgICAgKi9cclxuICAgIGZvcm1hdERhdGUoeDogYW55LCB5OiBhbnkpIHtcclxuICAgICAgICBpZiAoISh4IGluc3RhbmNlb2YgRGF0ZSkpIHtcclxuICAgICAgICAgICAgdmFyIGRhdGUgPSBuZXcgRGF0ZSgpO1xyXG4gICAgICAgICAgICBkYXRlLnNldFRpbWUoeCAqIDEwMDApO1xyXG4gICAgICAgICAgICB4ID0gZGF0ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHogPSB7XHJcbiAgICAgICAgICAgIHk6IHguZ2V0RnVsbFllYXIoKSxcclxuICAgICAgICAgICAgTTogeC5nZXRNb250aCgpICsgMSxcclxuICAgICAgICAgICAgZDogeC5nZXREYXRlKCksXHJcbiAgICAgICAgICAgIGg6IHguZ2V0SG91cnMoKSxcclxuICAgICAgICAgICAgbTogeC5nZXRNaW51dGVzKCksXHJcbiAgICAgICAgICAgIHM6IHguZ2V0U2Vjb25kcygpXHJcbiAgICAgICAgfTtcclxuICAgICAgICByZXR1cm4geS5yZXBsYWNlKC8oeSt8TSt8ZCt8aCt8bSt8cyspL2csIGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgICAgICAgIHJldHVybiAoKHYubGVuZ3RoID4gMSA/IFwiMFwiIDogXCJcIikgKyBldmFsKFwiei5cIiArIHYuc2xpY2UoLTEpKSkuc2xpY2UoXHJcbiAgICAgICAgICAgICAgICAtKHYubGVuZ3RoID4gMiA/IHYubGVuZ3RoIDogMilcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9KTtcclxuICAgIH0sXHJcbiAgICAvKipcclxuICAgKiDlsIbml7bpl7TmiLPovazmjaLmiJDmoLzlvI/ljJbml6XmnJ9cclxuICAgKiBAcGFyYW0ge3N0cmluZ30gdGltZVN0YW1wIOaXtumXtOaIs1xyXG4gICAqL1xyXG4gICAgZm9ybWF0RGF0ZVRpbWUodGltZVN0YW1wKSB7XHJcbiAgICAgICAgdmFyIGRhdGUgPSBuZXcgRGF0ZSgpO1xyXG4gICAgICAgIGRhdGUuc2V0VGltZSh0aW1lU3RhbXAgKiAxMDAwKTtcclxuICAgICAgICB2YXIgeSA9IGRhdGUuZ2V0RnVsbFllYXIoKTtcclxuICAgICAgICB2YXIgbTpzdHJpbmcgfCBudW1iZXIgPSBkYXRlLmdldE1vbnRoKCkgKyAxO1xyXG4gICAgICAgIG0gPSBtIDwgMTAgPyAoJzAnICsgbSkgOiBtO1xyXG4gICAgICAgIHZhciBkOnN0cmluZyB8IG51bWJlciA9IGRhdGUuZ2V0RGF0ZSgpO1xyXG4gICAgICAgIGQgPSBkIDwgMTAgPyAoJzAnICsgZCkgOiBkO1xyXG4gICAgICAgIHZhciBoOnN0cmluZyB8IG51bWJlciA9IGRhdGUuZ2V0SG91cnMoKTtcclxuICAgICAgICBoID0gaCA8IDEwID8gKCcwJyArIGgpIDogaDtcclxuICAgICAgICB2YXIgbWludXRlOnN0cmluZyB8IG51bWJlciA9IGRhdGUuZ2V0TWludXRlcygpO1xyXG4gICAgICAgIHZhciBzZWNvbmQ6c3RyaW5nIHwgbnVtYmVyID0gZGF0ZS5nZXRTZWNvbmRzKCk7XHJcbiAgICAgICAgbWludXRlID0gbWludXRlIDwgMTAgPyAoJzAnICsgbWludXRlKSA6IG1pbnV0ZTtcclxuICAgICAgICBzZWNvbmQgPSBzZWNvbmQgPCAxMCA/ICgnMCcgKyBzZWNvbmQpIDogc2Vjb25kO1xyXG4gICAgICAgIHJldHVybiB5ICsgJy0nICsgbSArICctJyArIGQgKyAnICcgKyBoICsgJzonICsgbWludXRlICsgJzonICsgc2Vjb25kO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIOS/neeVmW7kvY3lsI/mlbAgIFxyXG4gICAgICogQHBhcmFtIHtzdHJpbmcgfCBudW1iZXJ9IGNudW0g6ZyA6KaB5L+d55WZ55qE5pWw5o2uXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY2luZGV4IOS/neeVmeeahOWwj+aVsOS9jeaVsFxyXG4gICAgICovXHJcbiAgICB0b0RlY2ltYWwoY251bTogYW55LCBjaW5kZXg6IGFueSkge1xyXG4gICAgICAgIGxldCB2YWx1ZSA9IFN0cmluZyhjbnVtKTtcclxuICAgICAgICBpZiAodmFsdWUuaW5kZXhPZihcIi5cIikgPiAwKSB7XHJcbiAgICAgICAgICAgIHZhciBsZWZ0ID0gdmFsdWUuc3Vic3RyKDAsIHZhbHVlLmluZGV4T2YoXCIuXCIpKTtcclxuICAgICAgICAgICAgdmFyIHJpZ2h0ID0gdmFsdWUuc3Vic3RyKHZhbHVlLmluZGV4T2YoXCIuXCIpICsgMSwgdmFsdWUubGVuZ3RoKTtcclxuICAgICAgICAgICAgaWYgKHJpZ2h0Lmxlbmd0aCA+IGNpbmRleCkge1xyXG4gICAgICAgICAgICAgICAgcmlnaHQgPSByaWdodC5zdWJzdHIoMCwgY2luZGV4KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2YWx1ZSA9IGxlZnQgKyBcIi5cIiArIHJpZ2h0O1xyXG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIGNudW07XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICAvKirliqDms5Xov5DnrpcgKi9cclxuICAgIGFjY0FkZChhcmcxLGFyZzIpe1xyXG4gICAgICAgIGxldCByMSxyMixtO1xyXG4gICAgICAgIHRyeXtyMT1hcmcxLnRvU3RyaW5nKCkuc3BsaXQoXCIuXCIpWzFdLmxlbmd0aH1jYXRjaChlKXtyMT0wfVxyXG4gICAgICAgIHRyeXtyMj1hcmcyLnRvU3RyaW5nKCkuc3BsaXQoXCIuXCIpWzFdLmxlbmd0aH1jYXRjaChlKXtyMj0wfVxyXG4gICAgICAgIG09TWF0aC5wb3coMTAsTWF0aC5tYXgocjEscjIpKVxyXG4gICAgICAgIHJldHVybiAoYXJnMSptK2FyZzIqbSkvbVxyXG4gICAgfSxcclxuICAgIC8qKuWHj+azlei/kOeulyAqL1xyXG4gICAgYWNjU3ViKGFyZzEsYXJnMil7XHJcbiAgICAgICAgbGV0IHIxLHIyLG0sbjtcclxuICAgICAgICB0cnl7cjE9YXJnMS50b1N0cmluZygpLnNwbGl0KFwiLlwiKVsxXS5sZW5ndGh9Y2F0Y2goZSl7cjE9MH1cclxuICAgICAgICB0cnl7cjI9YXJnMi50b1N0cmluZygpLnNwbGl0KFwiLlwiKVsxXS5sZW5ndGh9Y2F0Y2goZSl7cjI9MH1cclxuICAgICAgICBtPU1hdGgucG93KDEwLE1hdGgubWF4KHIxLHIyKSk7XHJcbiAgICAgICAgbj0ocjE+PXIyKT9yMTpyMjtcclxuICAgICAgICByZXR1cm4gKChhcmcxKm0tYXJnMiptKS9tKS50b0ZpeGVkKG4pO1xyXG4gICAgfSxcclxuICAgIC8qKumZpOazlei/kOeulyAqL1xyXG4gICAgYWNjRGl2KGFyZzEsYXJnMil7XHJcbiAgICAgICAgbGV0IHQxPTAsdDI9MCxyMSxyMjtcclxuICAgICAgICB0cnl7dDE9YXJnMS50b1N0cmluZygpLnNwbGl0KFwiLlwiKVsxXS5sZW5ndGh9Y2F0Y2goZSl7fTtcclxuICAgICAgICB0cnl7dDI9YXJnMi50b1N0cmluZygpLnNwbGl0KFwiLlwiKVsxXS5sZW5ndGh9Y2F0Y2goZSl7fTtcclxuICAgICAgICByMT1OdW1iZXIoYXJnMS50b1N0cmluZygpLnJlcGxhY2UoXCIuXCIsXCJcIikpXHJcbiAgICAgICAgcjI9TnVtYmVyKGFyZzIudG9TdHJpbmcoKS5yZXBsYWNlKFwiLlwiLFwiXCIpKVxyXG4gICAgICAgIHJldHVybiAocjEvcjIpKk1hdGgucG93KDEwLHQyLXQxKTtcclxuICAgIH0sXHJcbiAgICAvKirkuZjms5Xov5DnrpcgKi9cclxuICAgIGFjY011bChhcmcxLGFyZzIpe1xyXG4gICAgICAgIGxldCBtPTAsczE9YXJnMS50b1N0cmluZygpLHMyPWFyZzIudG9TdHJpbmcoKTtcclxuICAgICAgICB0cnl7bSs9czEuc3BsaXQoXCIuXCIpWzFdLmxlbmd0aH1jYXRjaChlKXt9XHJcbiAgICAgICAgdHJ5e20rPXMyLnNwbGl0KFwiLlwiKVsxXS5sZW5ndGh9Y2F0Y2goZSl7fVxyXG4gICAgICAgIHJldHVybiBOdW1iZXIoczEucmVwbGFjZShcIi5cIixcIlwiKSkqTnVtYmVyKHMyLnJlcGxhY2UoXCIuXCIsXCJcIikpL01hdGgucG93KDEwLG0pXHJcbiAgICB9LFxyXG59XHJcbiIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0yOCAxMToyOTo0MVxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yOCAxMToyOTo0MVxyXG4gKiBAZGVzYyDotYTmupDliJfooahcclxuICovXHJcblxyXG5cclxuLy8g6aaW6aG16LWE5rqQXHJcbmNvbnN0IGNvbXAgPSBbXHJcbiAgICB7IHVybDogXCJyZXMvYXRsYXMvY29tcC5hdGxhc1wiLCB0eXBlOiBcImF0bGFzXCIgfSxcclxuXHR7IHVybDogXCJyZXMvYXRsYXMvY29tcC9ob21lLmF0bGFzXCIsIHR5cGU6IFwiYXRsYXNcIiB9LFxyXG5cdHsgdXJsOiBcInJlcy9hdGxhcy9jb21wL2hvbWUvZmlyZS5hdGxhc1wiLCB0eXBlOiBcImF0bGFzXCIgfSxcclxuXHR7IHVybDogXCJyZXMvYXRsYXMvY29tcC9ob21lL3dhdmUuYXRsYXNcIiwgdHlwZTogXCJhdGxhc1wiIH0sXHJcbiAgICB7IHVybDogXCJjb21wL2ltZ19zdGFyX2JnMDEucG5nXCIsIHR5cGU6IFwiaW1hZ2VcIiB9LFxyXG5dXHJcbmNvbnN0IHNjZW5lID0gW1xyXG4gICAgeyB1cmw6IFwiQ2FyZC5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXHJcbiAgICB7IHVybDogXCJob21lLmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcclxuICAgIHsgdXJsOiBcIlRhYmJhci5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXHJcbl1cclxuZXhwb3J0IGNvbnN0IGxvYWRpbmdSZXNMaXN0ID0gW1xyXG4gICAgLi4uY29tcCxcclxuICAgIC4uLnNjZW5lXHJcbl1cclxuXHJcblxyXG5cclxuLy/pppbpobXkuYvlkI7liqDovb1cclxuY29uc3QgY29tcDEgPSBbXHJcbiAgICB7IHVybDogXCJjb21wL2ltZ19wYXltZW50X2JnMDEucG5nXCIsIHR5cGU6IFwiaW1hZ2VcIiB9LFxyXG4gICAgeyB1cmw6IFwiY29tcC9pbWdfcmFua2xpc3RfYmcwMS5wbmdcIiwgdHlwZTogXCJpbWFnZVwiIH0sXHJcbiAgICB7IHVybDogXCJjb21wL2ltZ19yb2NrZXRSYW5raW5nX2JnMDEucG5nXCIsIHR5cGU6IFwiaW1hZ2VcIiB9LFxyXG4gICAgeyB1cmw6IFwiY29tcC9pbWdfYmFubmVyMDEucG5nXCIsIHR5cGU6IFwiaW1hZ2VcIiB9LFxyXG4gICAgeyB1cmw6IFwiY29tcC9pbWdfbXlyYW5rMDEucG5nXCIsIHR5cGU6IFwiaW1hZ2VcIiB9LFxyXG4gICAgeyB1cmw6IFwiY29tcC9pbWdfcmFuazAxLnBuZ1wiLCB0eXBlOiBcImltYWdlXCIgfSxcclxuICAgIHsgdXJsOiBcImNvbXAvaW1nX3RyZW5kX2Jhbm5lcjAxLnBuZ1wiLCB0eXBlOiBcImltYWdlXCIgfSxcclxuICAgIHsgdXJsOiBcImNvbXAvaW1nX3hjdGpfYmcwMS5wbmdcIiwgdHlwZTogXCJpbWFnZVwiIH0sXHJcbl1cclxuY29uc3Qgc2NlbmUxID0gW1xyXG4gICAgeyB1cmw6IFwidGVtcGxhdGUvc2hvd1JvY2tldC5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXHJcbiAgICB7IHVybDogXCJ0ZW1wbGF0ZS9udW1iZXJMaXN0RE9NLmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcclxuICAgIHsgdXJsOiBcInRlbXBsYXRlL0lucHV0UHdkRGlhbG9nLmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcclxuICAgIHsgdXJsOiBcInRlbXBsYXRlL1RpcHNEaWFsb2cuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxyXG4gICAgLy8geyB1cmw6IFwidGVtcGxhdGUvcmVjaGFyZ2VEaWFsb2cuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxyXG4gICAgeyB1cmw6IFwidGVtcGxhdGUvam9pblJlY29yZHMuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxyXG4gICAgeyB1cmw6IFwidGVtcGxhdGUvcHJldmlvdXNSZWNvcmRzLmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcclxuICAgIHsgdXJsOiBcInRlbXBsYXRlL3ByaXhMaXN0Lmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcclxuICAgIHsgdXJsOiBcInRlbXBsYXRlL3ByaUhpc3RvcnkuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxyXG4gICAgeyB1cmw6IFwidGVtcGxhdGUvcmFua2luZ0xpc3QuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxyXG4gICAgeyB1cmw6IFwidGVtcGxhdGUvc2hvcnRMaXN0Lmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcclxuICAgIHsgdXJsOiBcInRlbXBsYXRlL3RyZW5kTGlzdC5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXHJcbiAgICB7IHVybDogXCJ0ZW1wbGF0ZS93aW5uaW5nTGlzdC5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXHJcbiAgICB7IHVybDogXCJndWVzc2luZy5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXHJcbiAgICB7IHVybDogXCJyZWNvcmQuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxyXG4gICAgeyB1cmw6IFwiYXNzaXN0YW50Lmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcclxuICAgIHsgdXJsOiBcImdyYW5kUHJpeC5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXHJcbiAgICB7IHVybDogXCJwcmlIaXN0b3J5U2NlbmUuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxyXG4gICAgeyB1cmw6IFwic2hvcnRMaXN0ZWQuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxyXG4gICAgeyB1cmw6IFwieGN0ai5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXHJcbl1cclxuZXhwb3J0IGNvbnN0IGxvYWRpbmdSZXNMaXN0MSA9IFtcclxuICAgIC4uLmNvbXAxLFxyXG4gICAgLi4uc2NlbmUxXHJcbl1cclxuIiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ1OjQ2XHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ1OjQ2XHJcbiAqIEBkZXNjIOmhtemdoui3s+i9rOiEmuacrO+8jOeUqOS6jue8lui+keaooeW8j+aPkuWFpVxyXG4gKi9cclxuaW1wb3J0IHsgVGFiYmFyIH0gZnJvbSBcIi4uL3ZpZXcvVGFiYmFyXCI7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQYWdlTmF2U2NyaXB0IGV4dGVuZHMgTGF5YS5TY3JpcHQge1xyXG4gICAgLyoqIEBwcm9wIHtuYW1lOm5hdlBhZ2VTY3JpcHQsdGlwczon6KaB6Lez6L2s55qEc2NlbmUnLHR5cGU6U3RyaW5nLGRlZmF1bHQ6Jyd9ICovXHJcbiAgICBwdWJsaWMgbmF2UGFnZVNjcmlwdDpzdHJpbmcgPSAnJztcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcigpe3N1cGVyKCl9XHJcblxyXG4gICAgb25DbGljaygpOnZvaWQge1xyXG4gICAgICAgIFRhYmJhci5nZXRJbnN0YW5jZSgpLm9wZW5TY2VuZSh0aGlzLm5hdlBhZ2VTY3JpcHQpXHJcbiAgICB9XHJcbn0iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDY6MDhcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDY6MDhcclxuICogQGRlc2Mg6aG16Z2i6Lez6L2s57G777yM5Zyo5Luj56CB5Lit5L2/55SoXHJcbiAqL1xyXG5pbXBvcnQgeyBUYWJiYXIgfSBmcm9tICcuLi92aWV3L1RhYmJhcidcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBhZ2VTY3JpcHQgZXh0ZW5kcyBMYXlhLlNjcmlwdCB7XHJcbiAgICAvKiogQHByb3Age25hbWU6c2hvd1RhYix0aXBzOifmmK/lkKbmnIlUYWJiYXInLHR5cGU6Qm9vbCxkZWZhdWx0OnRydWV9ICovXHJcbiAgICBwdWJsaWMgc2hvd1RhYjpib29sZWFuID0gdHJ1ZTtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcigpe3N1cGVyKCk7fVxyXG5cclxuICAgIG9uRW5hYmxlKCk6dm9pZCB7XHJcbiAgICAgICAgaWYgKHRoaXMuc2hvd1RhYikge1xyXG4gICAgICAgICAgICBUYWJiYXIuc2hvdygpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIG9uRGlzYWJsZSgpOnZvaWQge1xyXG4gICAgICAgIFRhYmJhci5oaWRlKClcclxuICAgIH1cclxufSIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0NjozMFxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0NjozMFxyXG4gKiBAZGVzYyDlsY/luZXoh6rpgILlupTohJrmnKxcclxuICovXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNjcmVlbiBleHRlbmRzIExheWEuU2NyaXB0IHtcclxuICAgIC8qKiBAcHJvcCB7bmFtZTpiZ0NvbG9yLHRpcHM6J+iDjOaZr+minOiJsicsJ3R5cGU6U3RyaW5nLGRlZmF1bHQ6JyMwYTA3MzgnfSAqL1xyXG4gICAgcHVibGljIGJnQ29sb3I6c3RyaW5nID0gJyMwYTA3MzgnXHJcblxyXG4gICAgY29uc3RydWN0b3IoKXtzdXBlcigpO31cclxuXHJcbiAgICBvbkVuYWJsZSgpOnZvaWQge1xyXG4gICAgICAgTGF5YS5zdGFnZS5vbihMYXlhLkV2ZW50LlJFU0laRSx0aGlzLHRoaXMub25SZXNpemUpXHJcbiAgICAgICB0aGlzLm9uUmVzaXplKClcclxuICAgIH1cclxuXHJcbiAgICBvbkRpc2FibGUoKTp2b2lkIHtcclxuICAgICAgICBMYXlhLnN0YWdlLm9mZihMYXlhLkV2ZW50LlJFU0laRSx0aGlzLHRoaXMub25SZXNpemUpXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblJlc2l6ZSgpOnZvaWQge1xyXG4gICAgICAgIGNvbnN0IF90aGF0ID0gKHRoaXMub3duZXIgYXMgTGF5YS5TcHJpdGUpO1xyXG4gICAgICAgIF90aGF0LndpZHRoID0gTGF5YS5zdGFnZS53aWR0aDtcclxuICAgICAgICBfdGhhdC5oZWlnaHQgPSBMYXlhLnN0YWdlLmhlaWdodDtcclxuICAgICAgICBfdGhhdC5ncmFwaGljcy5kcmF3UmVjdCgwLDAsTGF5YS5zdGFnZS53aWR0aCxMYXlhLnN0YWdlLmhlaWdodCx0aGlzLmJnQ29sb3IpO1xyXG4gICAgfVxyXG59IiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTIxIDE2OjM0OjIxXHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTIxIDE2OjM0OjIxXHJcbiAqIEBkZXNjIOWKqeaJi+mhtemdouiEmuacrFxyXG4gKi9cclxuXHJcbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xyXG5pbXBvcnQgYXBpIGZyb20gXCIuLi9qcy9hcGlcIjtcclxuaW1wb3J0IHsgVG9hc3QgfSBmcm9tIFwiLi4vdmlldy9Ub2FzdFwiO1xyXG5pbXBvcnQgc2NyZWVuVXRpbHMgZnJvbSBcIi4uL2pzL3NjcmVlblV0aWxzXCI7XHJcblxyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQXNzaXN0YW50IGV4dGVuZHMgdWkuYXNzaXN0YW50VUkge1xyXG4gICAgcHJpdmF0ZSBjYXRlTGlzdEFycjphbnkgPSBbXTtcclxuICAgIHByaXZhdGUgc2VsZWN0R29vZHNUeXBlOnN0cmluZyA9ICcnO1xyXG4gICAgcHJpdmF0ZSB0YWJUeXBlOm51bWJlciA9IDE7XHJcblxyXG4gICAgc3RhdGljIHJlYWRvbmx5IEhBTEZfU0NST0xMX0VMQVNUSUNfRElTVEFOQ0U6IG51bWJlciA9IDEwMDtcclxuICAgIHByaXZhdGUgX2lzU2Nyb2xsT3ZlckVsYXN0aWNEaXN0YW5jZTogYm9vbGVhbjtcclxuICAgIHByaXZhdGUgcGFnZTpudW1iZXIgPSAxO1xyXG4gICAgY29uc3RydWN0b3IoKXtcclxuICAgICAgICBzdXBlcigpXHJcbiAgICAgICAgdGhpcy5idG5fdHJlbmQub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMudGFiU3dpdGNoLFsxXSlcclxuICAgICAgICB0aGlzLmJ0bl9wcmVidXkub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMudGFiU3dpdGNoLFsyXSlcclxuICAgICAgICB0aGlzLm9uKExheWEuRXZlbnQuUkVTSVpFLHRoaXMsdGhpcy5vblJlc2l6ZSlcclxuICAgIH1cclxuXHJcbiAgICBvbkVuYWJsZSgpOnZvaWR7ICBcclxuICAgICAgICB0aGlzLmdldEdvb2RzQ2F0ZUxpc3QoKVxyXG4gICAgICAgIHRoaXMuY2F0ZVN3aXRjaCgpXHJcblxyXG4gICAgICAgIC8v6LWw5Yq/5YiG5p6Q5rua5Yqo5Yqg6L295pu05aSaXHJcbiAgICAgICAgdGhpcy50cmVuZExpc3Quc2Nyb2xsQmFyLmNoYW5nZUhhbmRsZXIgPSBMYXlhLkhhbmRsZXIuY3JlYXRlKHRoaXMsdGhpcy5vblRyZW5kTGlzdFNjcm9sbENoYW5nZSxudWxsLGZhbHNlKVxyXG4gICAgICAgIHRoaXMudHJlbmRMaXN0LnNjcm9sbEJhci5vbihMYXlhLkV2ZW50LkVORCwgdGhpcywgdGhpcy5vblRyZW5kTGlzdFNjcm9sbEVuZClcclxuICAgIH1cclxuICAgIFxyXG4gICAgLyoq6I635Y+W5ZWG5ZOB57G75Z6LICovXHJcbiAgICBwcml2YXRlIGdldEdvb2RzQ2F0ZUxpc3QoKXtcclxuICAgICAgICBhcGkuZ2V0R29vZHNDYXRlTGlzdCgpLnRoZW4oKHJlczphbnkpPT57XHJcbiAgICAgICAgICAgIHRoaXMuY2F0ZUxpc3RBcnIgPSByZXM7XHJcbiAgICAgICAgICAgIGNvbnN0IEdvb2RzTmFtZUFycjpzdHJpbmdbXSA9IFtdO1xyXG4gICAgICAgICAgICByZXMuZm9yRWFjaCgoaXRlbTphbnkpPT57XHJcbiAgICAgICAgICAgICAgICBHb29kc05hbWVBcnIucHVzaChpdGVtLmdvb2RzTmFtZSlcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgdGhpcy5jYXRlVGFiTGlzdC5yZXBlYXRYID0gR29vZHNOYW1lQXJyLmxlbmd0aDtcclxuICAgICAgICAgICAgdGhpcy5jYXRlVGFiTGlzdC5hcnJheSA9IEdvb2RzTmFtZUFycjtcclxuICAgICAgICAgICAgdGhpcy5jYXRlVGFiTGlzdC5zZWxlY3RlZEluZGV4ID0gMDtcclxuICAgICAgICB9KS5jYXRjaCgoZXJyOmFueSk9PntcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyLm1lc3NhZ2UpO1xyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG5cclxuICAgIC8qKuiOt+WPlui1sOWKv+WIl+ihqCAqL1xyXG4gICAgcHJpdmF0ZSBnZXRHb29kc1RyZW5kKGdvb2RzVHlwZTpzdHJpbmcscGFnZSA9IDEpe1xyXG4gICAgICAgIGFwaS5nZXRHb29kc1RyZW5kKGdvb2RzVHlwZSxwYWdlKS50aGVuKChyZXM6YW55KT0+e1xyXG4gICAgICAgICAgICBpZiAodGhpcy50cmVuZExpc3QuYXJyYXkgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudHJlbmRMaXN0LmFycmF5ID0gWy4uLnRoaXMudHJlbmRMaXN0LmFycmF5LC4uLnJlc11cclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRyZW5kTGlzdC5hcnJheSA9IHJlcztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodGhpcy50cmVuZExpc3QuYXJyYXkubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50cmVuZExpc3QudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KS5jYXRjaCgoZXJyOmFueSk9PntcclxuICAgICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyci5tZXNzYWdlKTtcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5YiH5o2i5YiX6KGoXHJcbiAgICAgKiBAcGFyYW0gdHlwZSAxOui1sOWKv+WIhuaekCAgMu+8mumihOi0rVxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIHRhYlN3aXRjaCh0eXBlOm51bWJlcil7XHJcbiAgICAgICAgaWYgKHNjcmVlblV0aWxzLmdldFNjcmVlbigpLm5hbWUgPT09ICdyZWNvcmQnICYmIHRoaXMudGFiVHlwZSA9PT0gdHlwZSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMudGFiVHlwZSA9IHR5cGU7XHJcbiAgICAgICAgaWYgKHR5cGUgPT09IDIpIHtcclxuICAgICAgICAgICAgVG9hc3Quc2hvdygn5pqC5pyq5byA5pS+77yM5pWs6K+35pyf5b6FJylcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gdGhpcy5jYXRlVGFiTGlzdC5zZWxlY3RlZEluZGV4ID0gMDtcclxuICAgICAgICAvLyBpZiAodGhpcy50YWJUeXBlID09PSAxKSB7XHJcbiAgICAgICAgLy8gICAgIHRoaXMuYnRuX3RyZW5kLnNraW4gPSAnY29tcC9ndWVzc2luZy9pbWdfdGFiX2FjdGl2ZS5wbmcnO1xyXG4gICAgICAgIC8vICAgICB0aGlzLmJ0bl9wcmVidXkuc2tpbiA9ICdjb21wL2d1ZXNzaW5nL2ltZ190YWIucG5nJztcclxuICAgICAgICAvLyAgICAgdGhpcy5saXN0VGl0bGUudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgLy8gICAgIGlmICh0aGlzLnRyZW5kTGlzdC5hcnJheSA9PT0gbnVsbCB8fCB0aGlzLnRyZW5kTGlzdC5hcnJheS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAvLyAgICAgICAgIHRoaXMubm9EYXRhLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgIC8vICAgICB9ZWxzZSB7XHJcbiAgICAgICAgLy8gICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgLy8gICAgICAgICB0aGlzLnRyZW5kTGlzdC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAvLyAgICAgfVxyXG4gICAgICAgIC8vICAgICB0aGlzLnByZWJ1eS5zY3JvbGxUbygwKVxyXG4gICAgICAgIC8vICAgICB0aGlzLnByZWJ1eS52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgLy8gfWVsc2V7XHJcbiAgICAgICAgLy8gICAgIHRoaXMuYnRuX3ByZWJ1eS5za2luID0gJ2NvbXAvZ3Vlc3NpbmcvaW1nX3RhYl9hY3RpdmUucG5nJztcclxuICAgICAgICAvLyAgICAgdGhpcy5idG5fdHJlbmQuc2tpbiA9ICdjb21wL2d1ZXNzaW5nL2ltZ190YWIucG5nJztcclxuICAgICAgICAvLyAgICAgdGhpcy5saXN0VGl0bGUudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICAgIC8vICAgICBpZiAodGhpcy5wcmVidXkuYXJyYXkgPT09IG51bGwgfHwgdGhpcy5wcmVidXkuYXJyYXkubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgLy8gICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAvLyAgICAgfWVsc2Uge1xyXG4gICAgICAgIC8vICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICAgIC8vICAgICAgICAgdGhpcy5wcmVidXkudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgLy8gICAgIH1cclxuICAgICAgICAvLyAgICAgdGhpcy50cmVuZExpc3Quc2Nyb2xsVG8oMCk7XHJcbiAgICAgICAgLy8gICAgIHRoaXMudHJlbmRMaXN0LnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICAvLyB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoq5ZWG5ZOB57G75Z6L5YiH5o2iICovXHJcbiAgICBwcml2YXRlIGNhdGVTd2l0Y2goKXtcclxuICAgICAgICB0aGlzLmNhdGVUYWJMaXN0LnNlbGVjdEhhbmRsZXIgPSBuZXcgTGF5YS5IYW5kbGVyKHRoaXMsIChzZWxlY3RlZEluZGV4OiBhbnkpPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnNlbGVjdEdvb2RzVHlwZSA9IHRoaXMuY2F0ZUxpc3RBcnJbc2VsZWN0ZWRJbmRleF0uZ29vZHNUeXBlO1xyXG4gICAgICAgICAgICBpZiAodGhpcy50YWJUeXBlID09PSAxKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRyZW5kTGlzdC5hcnJheSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wYWdlID0gMTtcclxuICAgICAgICAgICAgICAgIHRoaXMuZ2V0R29vZHNUcmVuZCh0aGlzLnNlbGVjdEdvb2RzVHlwZSx0aGlzLnBhZ2UpXHJcbiAgICAgICAgICAgIH1lbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfmmoLmnKrlvIDmlL4nLHRoaXMuc2VsZWN0R29vZHNUeXBlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvL+aUueWPmHRhYumAieS4reeKtuaAgVxyXG4gICAgICAgICAgICBsZXQgaTogbnVtYmVyID0gdGhpcy5jYXRlVGFiTGlzdC5zdGFydEluZGV4O1xyXG4gICAgICAgICAgICB0aGlzLmNhdGVUYWJMaXN0LmNlbGxzLmZvckVhY2goKGNlbGw6IExheWEuQnV0dG9uKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjZWxsLnNlbGVjdGVkID0gaSA9PT0gc2VsZWN0ZWRJbmRleDtcclxuICAgICAgICAgICAgICAgIGkrKztcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIC8qKuebkeinhuWxj+W5leWkp+Wwj+WPmOWMliAqL1xyXG4gICAgb25SZXNpemUoKXtcclxuICAgICAgICAvL+WIl+ihqOmrmOW6pumAgumFjSA9IOWxj+W5lemrmOW6piAtIChiYW5uZXIgKyB0YWJiYXIpXHJcbiAgICAgICAgdGhpcy50cmVuZExpc3QuaGVpZ2h0ID0gdGhpcy5oZWlnaHQgLSA2MDA7XHJcbiAgICAgICAgY29uc3QgdHJlbmROdW1iZXIgPSB0aGlzLnRyZW5kTGlzdC5oZWlnaHQgLyAxMDA7XHJcbiAgICAgICAgdGhpcy50cmVuZExpc3QucmVwZWF0WSA9IE1hdGguY2VpbCh0cmVuZE51bWJlcilcclxuICAgICAgICB0aGlzLnByZWJ1eS5oZWlnaHQgPSB0aGlzLmhlaWdodCAtIDYwMDtcclxuICAgICAgICBjb25zdCBwcmVidXlOdW1iZXIgPSB0aGlzLnByZWJ1eS5oZWlnaHQgLyAxMDA7XHJcbiAgICAgICAgdGhpcy50cmVuZExpc3QucmVwZWF0WSA9IE1hdGguY2VpbChwcmVidXlOdW1iZXIpXHJcbiAgICB9XHJcblxyXG4gICAgLyoq5Y+C5LiO6K6w5b2V5YiX6KGo5rua5YqoICovXHJcbiAgICBwcml2YXRlIG9uVHJlbmRMaXN0U2Nyb2xsQ2hhbmdlKHY6YW55KSB7XHJcbiAgICAgICAgaWYgKHYgPiB0aGlzLnRyZW5kTGlzdC5zY3JvbGxCYXIubWF4ICsgQXNzaXN0YW50LkhBTEZfU0NST0xMX0VMQVNUSUNfRElTVEFOQ0UpIHtcclxuICAgICAgICAgICAgdGhpcy5faXNTY3JvbGxPdmVyRWxhc3RpY0Rpc3RhbmNlID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBwcml2YXRlIG9uVHJlbmRMaXN0U2Nyb2xsRW5kKCl7XHJcbiAgICAgICAgaWYgKHRoaXMuX2lzU2Nyb2xsT3ZlckVsYXN0aWNEaXN0YW5jZSkge1xyXG4gICAgICAgICAgICB0aGlzLl9pc1Njcm9sbE92ZXJFbGFzdGljRGlzdGFuY2UgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5wYWdlID0gdGhpcy5wYWdlICsgMTtcclxuICAgICAgICAgICAgdGhpcy5nZXRHb29kc1RyZW5kKHRoaXMuc2VsZWN0R29vZHNUeXBlLHRoaXMucGFnZSlcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICBcclxufSIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0NzoxMVxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0NzoxMVxyXG4gKiBAZGVzYyDpppbpobXllYblk4HljaHohJrmnKxcclxuICovXHJcbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xyXG5pbXBvcnQgeyBUYWJiYXIgfSBmcm9tIFwiLi4vdmlldy9UYWJiYXJcIjtcclxuXHJcbmltcG9ydCB1dGlscyBmcm9tICcuLi9qcy91dGlscydcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENhcmQgZXh0ZW5kcyB1aS5DYXJkVUkge1xyXG4gICAgY29uc3RydWN0b3IoKXtcclxuICAgICAgICBzdXBlcigpXHJcbiAgICAgICAgdGhpcy5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5jbGlja0l0ZW0pXHJcbiAgICB9XHJcbiAgICBzZXQgZGF0YVNvdXJjZShpdGVtOiBhbnkpIHtcclxuICAgICAgICB0aGlzLl9kYXRhU291cmNlID0gaXRlbTtcclxuICAgICAgICBpZiAoaXRlbSkge1xyXG4gICAgICAgICAgICAvL+mHkeW4geWbvueJhywgIDEtNDAw6YeR5biB5Zu+5qCHMjsgICA1MDEtMTAwMOmHkeW4geWbvuaghzQ7ICAxMDAx5Lul5LiK6YeR5biB5Zu+5qCHMjBcclxuICAgICAgICAgICAgaWYgKCtpdGVtLmdvb2RzVmFsdWUgPD0gNDAwICkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jYXJkSXRlbS5za2luID0gYGNvbXAvaG9tZS9pbWdfamluYmlfMi5wbmdgXHJcbiAgICAgICAgICAgIH1lbHNlIGlmKCtpdGVtLmdvb2RzVmFsdWUgPD0gMTAwMCl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNhcmRJdGVtLnNraW4gPSBgY29tcC9ob21lL2ltZ19qaW5iaV80LnBuZ2BcclxuICAgICAgICAgICAgfWVsc2UgaWYoK2l0ZW0uZ29vZHNWYWx1ZSA+PSAxMDAxKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNhcmRJdGVtLnNraW4gPSBgY29tcC9ob21lL2ltZ19qaW5iaV8yMC5wbmdgXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5zY2VuZUltZy5za2luID0gYGNvbXAvaG9tZS9pbWdfc2NlbmVfJHtpdGVtLnRvdGFsTnVtfS5wbmdgXHJcbiAgICAgICAgICAgIHRoaXMuZ29vZHNOYW1lLnRleHQgPSBgJHsraXRlbS5nb29kc1ZhbHVlfSBVU0RUYFxyXG4gICAgICAgICAgICB0aGlzLmF3YXJkLnRleHQgPSBgJHt1dGlscy50b0RlY2ltYWwoaXRlbS5hd2FyZCwyKX1gXHJcbiAgICAgICAgICAgIHRoaXMuc29sZE51bV90b3RhbE51bS50ZXh0ID0gYCR7aXRlbS5zb2xkTnVtfS8ke2l0ZW0udG90YWxOdW19YFxyXG4gICAgICAgICAgICB0aGlzLnByb2dyZXNzLnZhbHVlID0gK2Ake2l0ZW0uc29sZE51bS9pdGVtLnRvdGFsTnVtfWBcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjbGlja0l0ZW0oKTp2b2lkIHtcclxuICAgICAgICBpZiAodGhpcy5fZGF0YVNvdXJjZSAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICBUYWJiYXIuZ2V0SW5zdGFuY2UoKS5vcGVuU2NlbmUoJ2d1ZXNzaW5nLnNjZW5lJyx0aGlzLl9kYXRhU291cmNlLmdvb2RzSWQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ3OjU4XHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ3OjU4XHJcbiAqIEBkZXNjIOi0reS5sOmhtemdouiEmuacrFxyXG4gKi9cclxuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XHJcbmltcG9ydCB7IFRvYXN0IH0gZnJvbSBcIi4uL3ZpZXcvVG9hc3RcIjtcclxuaW1wb3J0IHV0aWxzIGZyb20gJy4uL2pzL3V0aWxzJ1xyXG5pbXBvcnQgSXB0UHN3RG9tIGZyb20gXCIuLi90ZW1wbGF0ZS9wc3dJbnB1dFwiO1xyXG5pbXBvcnQgeyBHYW1lTW9kZWwgfSBmcm9tIFwiLi4vanMvR2FtZU1vZGVsXCI7XHJcbmltcG9ydCBhcGkgZnJvbSBcIi4uL2pzL2FwaVwiO1xyXG5pbXBvcnQgeyBTb2NrZXQgfSBmcm9tIFwiLi4vanMvc29ja2V0XCI7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBHdWVzc2luZyBleHRlbmRzIHVpLmd1ZXNzaW5nVUkge1xyXG5cclxuICAgIHByaXZhdGUgZ29vZHNJZDpzdHJpbmcgPSAnJzsvL+WVhuWTgUlEXHJcbiAgICBwcml2YXRlIF9wZXJpb2Q6c3RyaW5nID0gJyc7IC8v5pyf5Y+3XHJcbiAgICBwcml2YXRlIHNlbGVjdE51bWJlcjpudW1iZXIgPSAwOyAvL+mAieS4reS4quaVsFxyXG4gICAgcHJpdmF0ZSB1bml0UHJpY2U6bnVtYmVyID0gMDsgLy/ljZXku7dcclxuICAgIHByaXZhdGUgdG90YWxQcmljZTpudW1iZXIgPSAwOyAvL+aAu+S7t1xyXG4gICAgcHJpdmF0ZSBteUFtb3VudDpudW1iZXIgPSAwOyAvL+aAu+i1hOS6p1xyXG4gICAgcHJpdmF0ZSBudW1iZXJBcnI6bnVtYmVyW10gPSBbXTsgLy/mnKrpgInkuK3nmoTmlbDmja5cclxuICAgIHByaXZhdGUgaGFsZkFycjpudW1iZXJbXSA9IFtdOyAvL+S4gOWNiueahOacqumAieS4reaVsOaNrlxyXG4gICAgcHJpdmF0ZSByYXdEYXRhQXJyX25ldzphbnlbXSA9IFtdOy8v6ZWc5YOP5pWw57uEXHJcbiAgICBwcml2YXRlIHJhd0RhdGFBcnI6YW55W10gPSBbXTsvL+WOn+Wni+aVsOaNrlxyXG5cclxuICAgIHByaXZhdGUgaW5wdXRQd2Q6IElwdFBzd0RvbTsgLy/lr4bnoIHovpPlhaXmoYZcclxuICAgIHByaXZhdGUgY29kZUxpc3Q6c3RyaW5nID0gJyc7IC8v6LSt5Lmw5Y+356CBXHJcblxyXG4gICAgY29uc3RydWN0b3IoKXtcclxuICAgICAgICBzdXBlcigpXHJcblxyXG4gICAgICAgIHRoaXMuYnRuX2J1eS5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5idXlGdW5jKVxyXG5cclxuICAgICAgICAvLyDpgInmi6nmjInpkq7nu4Tnu5Hlrprkuovku7ZcclxuICAgICAgICB0aGlzLnJhbmRvbV9vbmUub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuc2VsZWN0RnVuYyxbMV0pXHJcbiAgICAgICAgdGhpcy5yYW5kb21fYmVmb3JlLm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLnNlbGVjdEZ1bmMsWzJdKVxyXG4gICAgICAgIHRoaXMucmFuZG9tX2FmdGVyLm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLnNlbGVjdEZ1bmMsWzNdKVxyXG4gICAgICAgIHRoaXMucmFuZG9tX2FsbC5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5zZWxlY3RGdW5jLFs0XSlcclxuICAgIH1cclxuXHJcbiAgICBvbkVuYWJsZSgpOnZvaWQge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCfov5vlhaXpobXpnaInKTtcclxuXHJcbiAgICAgICAgLy/ojrflj5bnlKjmiLfotYTkuqdcclxuICAgICAgICBjb25zdCB1c2VySW5mbzphbnkgPSBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS51c2VySW5mbztcclxuICAgICAgICB0aGlzLmJhbGFuY2UudGV4dCA9IGAke3V0aWxzLnRvRGVjaW1hbCh1c2VySW5mby5tb25leSwyKX0gVVNEVGA7XHJcbiAgICAgICAgdGhpcy5teUFtb3VudCA9ICtgJHt1dGlscy50b0RlY2ltYWwodXNlckluZm8ubW9uZXksMil9YDtcclxuICAgICAgICBpZiAoIXVzZXJJbmZvLnVzZXJJZCkgeyAvL+acqueZu+W9leS4jeaYvuekuuaIkeeahOS9meminVxyXG4gICAgICAgICAgICB0aGlzLmJhbGFuY2VCb3gudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLmVzdGltYXRlLnkgPSA4MDtcclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgdGhpcy5iYWxhbmNlQm94LnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLmVzdGltYXRlLnkgPSA0MjtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8g55uR6KeG6LWE5Lqn5Y+Y5YqoXHJcbiAgICAgICAgR2FtZU1vZGVsLmdldEluc3RhbmNlKCkub24oJ2dldFVzZXJJbmZvJyx0aGlzLCgodXNlckluZm86YW55KT0+e1xyXG4gICAgICAgICAgICB0aGlzLmJhbGFuY2UudGV4dCA9IGAke3V0aWxzLnRvRGVjaW1hbCh1c2VySW5mby5tb25leSwyKX0gVVNEVGA7XHJcbiAgICAgICAgICAgIHRoaXMubXlBbW91bnQgPSArYCR7dXRpbHMudG9EZWNpbWFsKHVzZXJJbmZvLm1vbmV5LDIpfWA7XHJcbiAgICAgICAgfSkpXHJcblxyXG4gICAgICAgIC8vIOWPt+eggeiiq+i0reS5sOWPmOWKqFxyXG4gICAgICAgIEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLm9uKCdnZXRidXlHb29kc0FycicsdGhpcywoZ29vZHNBcnI6YW55KT0+e1xyXG4gICAgICAgICAgICB0aGlzLnJhd0RhdGFBcnIuZm9yRWFjaCgoaXRlbTphbnkpPT57XHJcbiAgICAgICAgICAgICAgICBnb29kc0Fyci5mb3JFYWNoKCh2OmFueSk9PntcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS5jb2RlID09PSB2LmNvZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS51c2VySWQgPSB2LnVzZXJJZDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5idXllcklkID0gdi51c2VySWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgdGhpcy5wcm9ncmVzc1NwZWVkLnZhbHVlID0gK2Ake2dvb2RzQXJyLmxlbmd0aCAvIHRoaXMubnVtYmVyTGlzdC5hcnJheS5sZW5ndGh9YDtcclxuICAgICAgICAgICAgdGhpcy5zb2xkTnVtX3NvbGROdW0udGV4dCA9IGAke2dvb2RzQXJyLmxlbmd0aH0vJHt0aGlzLm51bWJlckxpc3QuYXJyYXkubGVuZ3RofWA7XHJcbiAgICAgICAgICAgIHRoaXMubnVtYmVyTGlzdC5hcnJheSA9IHRoaXMucmF3RGF0YUFycjsgLy/lj7fnoIHliJfooahcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG4gICAgb25PcGVuZWQoZ29vZHNJZDphbnkpe1xyXG4gICAgICAgIHRoaXMuZ29vZHNJZCA9IGdvb2RzSWQ7XHJcbiAgICAgICAgdGhpcy5nZXRHb29kc0RldGFpbHModGhpcy5nb29kc0lkKTtcclxuICAgIH1cclxuICAgIG9uRGlzYWJsZSgpe1xyXG4gICAgICAgIC8vICDlhbPpl613ZWJzb2NrZXTkuovku7ZcclxuICAgICAgICBTb2NrZXQuc2VuZFdTUHVzaChgYnV5XyR7dGhpcy5fcGVyaW9kfWAsMClcclxuICAgIH1cclxuXHJcbiAgICAvKirotK3kubAgKi9cclxuICAgIHByaXZhdGUgYnV5RnVuYygpOnZvaWQge1xyXG4gICAgICAgIGxldCB1c2VySW5mbyA9IE9iamVjdC5rZXlzKEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLnVzZXJJbmZvKTtcclxuICAgICAgICBpZiAodXNlckluZm8ubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfmnKrnmbvlvZXot7PovaznmbvlvZUnKTtcclxuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBgaHR0cHM6Ly8ke2RvY3VtZW50LmRvbWFpbn0vIy9zaWduX2luYFxyXG4gICAgICAgIH1lbHNlIGlmICh0aGlzLmdldFNlbGVjdE51bWJlcigpIDw9IDApIHtcclxuICAgICAgICAgICAgVG9hc3Quc2hvdygn6K+36YCJ5oup6LSt5Lmw5Y+356CBJylcclxuICAgICAgICB9ZWxzZSBpZih0aGlzLnRvdGFsUHJpY2UgPiB0aGlzLm15QW1vdW50KXtcclxuICAgICAgICAgICAgVG9hc3Quc2hvdygn5L2Z6aKd5LiN6LazJylcclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgdGhpcy5pbnB1dFB3ZCA9IG5ldyBJcHRQc3dEb20oKVxyXG4gICAgICAgICAgICB0aGlzLmlucHV0UHdkLnBvcHVwKCk7XHJcbiAgICAgICAgICAgIHRoaXMuaW5wdXRQd2Quc2V0RGF0YSh7IC8v5Y+R6YCB5pWw5o2uXHJcbiAgICAgICAgICAgICAgICBwZXJpb2Q6dGhpcy5wZXJpb2QudGV4dCxcclxuICAgICAgICAgICAgICAgIGNvZGVMaXN0OnRoaXMuY29kZUxpc3QsXHJcbiAgICAgICAgICAgICAgICBBbGxDb2RlTGlzdDp0aGlzLm51bWJlckxpc3QuYXJyYXlcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLy8g55uR5ZCs6L6T5YWl5qGG57uE5Lu25LqL5Lu2XHJcbiAgICAgICAgICAgIHRoaXMuaW5wdXRQd2Qub24oJ3JlZnJlc2hEYXRhJyx0aGlzLCgpPT57XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdldEdvb2RzRGV0YWlscyh0aGlzLmdvb2RzSWQpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy50b3RhbC50ZXh0ID0gJzAgVVNEVCc7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog6YCJ5oup5oyJ6ZKu57uEXHJcbiAgICAgKiBAcGFyYW0gdHlwZSDpgInmi6nnsbvlnosgIDE66ZqP5LiAICAy77ya5YmN5Y2KIDPvvJrlkI7ljYogNO+8muWFqOmDqFxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIHNlbGVjdEZ1bmModHlwZTpudW1iZXIpe1xyXG4gICAgICAgIHRoaXMucmF3RGF0YUFycl9uZXcgPSB0aGlzLnJhd0RhdGFBcnI7IC8v5Yid5aeL5YyW5pWw57uEXHJcbiAgICAgICAgdGhpcy5udW1iZXJBcnIgPSBbXTsvL+WIneWni+WMluaVsOe7hFxyXG4gICAgICAgIHRoaXMuaGFsZkFyciA9IFtdOy8v5Yid5aeL5YyW5pWw57uEXHJcblxyXG4gICAgICAgIHRoaXMucmF3RGF0YUFycl9uZXcuZm9yRWFjaChpdGVtPT57XHJcbiAgICAgICAgICAgIGlmIChpdGVtLmJ1eWVySWQgPT09ICcyJykge1xyXG4gICAgICAgICAgICAgICAgaXRlbS5idXllcklkID0gJzAnO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChpdGVtLmJ1eWVySWQgPD0gMikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5udW1iZXJBcnIucHVzaChpdGVtLmNvZGUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBpZiAodHlwZSA9PT0gMSkge1xyXG4gICAgICAgICAgICB0aGlzLnJhbmRvbU51bWJlcih0aGlzLm51bWJlckFyciwxKSAvL+maj+S4gFxyXG4gICAgICAgIH1lbHNlIGlmICh0eXBlID09PSAyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGFsZkFyciA9IHRoaXMubnVtYmVyQXJyLnNsaWNlKDAsTWF0aC5mbG9vcih0aGlzLm51bWJlckFyci5sZW5ndGggLyAyKSkgIC8v5YmN5Y2KXHJcbiAgICAgICAgICAgIHRoaXMucmFuZG9tTnVtYmVyKHRoaXMuaGFsZkFyciwyKVxyXG4gICAgICAgIH1lbHNlIGlmKHR5cGUgPT09IDMpIHtcclxuICAgICAgICAgICAgdGhpcy5oYWxmQXJyID0gdGhpcy5udW1iZXJBcnIuc2xpY2UoTWF0aC5mbG9vcih0aGlzLm51bWJlckFyci5sZW5ndGggLyAyKSkgIC8v5ZCO5Y2KXHJcbiAgICAgICAgICAgIHRoaXMucmFuZG9tTnVtYmVyKHRoaXMuaGFsZkFyciwyKVxyXG4gICAgICAgIH1lbHNlIGlmKHR5cGUgPT09IDQpIHtcclxuICAgICAgICAgICAgdGhpcy5oYWxmQXJyID0gdGhpcy5udW1iZXJBcnI7Ly/lhajpg6hcclxuICAgICAgICAgICAgdGhpcy5yYW5kb21OdW1iZXIodGhpcy5oYWxmQXJyLDIpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKuS7juaVsOe7hOS4remaj+acuuWPluS4gOS4quaVsFxyXG4gICAgICogQHBhcmFtIGFyciDmlbDmja7liJfooahcclxuICAgICAqIEBwYXJhbSB0eXBlIFvlj6/pgIldIOmaj+acuuexu+Wei1xyXG4gICAgICovXHJcbiAgICBwcml2YXRlIHJhbmRvbU51bWJlcihhcnI6bnVtYmVyW10sdHlwZT86bnVtYmVyKXtcclxuICAgICAgICBjb25zdCByYW5kOm51bWJlciA9IE1hdGguZmxvb3IoKE1hdGgucmFuZG9tKCkgKiBhcnIubGVuZ3RoKSk7IC8v6ZqP5LiAXHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgY29kZSA9IGFycltyYW5kXTtcclxuICAgICAgICBcclxuICAgICAgICBpZiAodHlwZSA9PT0gMSkge1xyXG4gICAgICAgICAgICB0aGlzLnJhd0RhdGFBcnJfbmV3LmZvckVhY2goaXRlbSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoaXRlbS5jb2RlID09PSBjb2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbS5idXllcklkID0gJzInO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0eXBlID09PSAyKSB7XHJcbiAgICAgICAgICAgIGFyci5mb3JFYWNoKGVsID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMucmF3RGF0YUFycl9uZXcuZm9yRWFjaChpdGVtID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZWwgPT09IGl0ZW0uY29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLmJ1eWVySWQgPSAnMic7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gdGhpcy5udW1iZXJMaXN0LnJlcGVhdFkgPSB0aGlzLnJhd0RhdGFBcnJfbmV3Lmxlbmd0aDtcclxuICAgICAgICB0aGlzLm51bWJlckxpc3QuYXJyYXkgPSB0aGlzLnJhd0RhdGFBcnJfbmV3O1xyXG4gICAgICAgIHRoaXMuZ2V0U2VsZWN0TnVtYmVyKClcclxuICAgIH1cclxuXHJcbiAgICAvKirojrflj5bllYblk4Hor6bmg4VcclxuICAgICAqIEBwYXJhbSBnb29kc0lkIOWVhuWTgWlkXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgZ2V0R29vZHNEZXRhaWxzKGdvb2RzSWQ6c3RyaW5nKSB7XHJcbiAgICAgICAgYXBpLmdldEdvb2RzRGV0YWlscyhnb29kc0lkKS50aGVuKChyZXM6YW55KT0+e1xyXG5cclxuICAgICAgICAgICAgLy8gIOWPkemAgXdlYnNvY2tldOS6i+S7tlxyXG4gICAgICAgICAgICB0aGlzLl9wZXJpb2QgPSByZXMucGVyaW9kO1xyXG4gICAgICAgICAgICBTb2NrZXQuc2VuZFdTUHVzaChgYnV5XyR7dGhpcy5fcGVyaW9kfWApXHJcblxyXG4gICAgICAgICAgICB0aGlzLnByaWNlLnRleHQgPSBgJHsrcmVzLnByaWNlfWA7XHJcbiAgICAgICAgICAgIHRoaXMuZ29vZHNWYWx1ZS50ZXh0ID0gYCR7K3Jlcy5nb29kc1ZhbHVlfSBVU0RUYDtcclxuICAgICAgICAgICAgdGhpcy5wcm9ncmVzc1NwZWVkLnZhbHVlID0gK2Ake3Jlcy5zb2xkTnVtL3Jlcy50b3RhbE51bX1gO1xyXG4gICAgICAgICAgICB0aGlzLnNvbGROdW1fc29sZE51bS50ZXh0ID0gYCR7cmVzLnNvbGROdW19LyR7cmVzLnRvdGFsTnVtfWA7XHJcbiAgICAgICAgICAgIHRoaXMucGVyaW9kLnRleHQgPSByZXMucGVyaW9kO1xyXG4gICAgICAgICAgICB0aGlzLnVuaXRQcmljZSA9ICtyZXMucHJpY2U7XHJcbiAgICAgICAgICAgIHRoaXMucmF3RGF0YUFyciA9IHJlcy5jb2RlTGlzdDtcclxuICAgICAgICAgICAgdGhpcy5udW1iZXJMaXN0LmFycmF5ID0gdGhpcy5yYXdEYXRhQXJyOyAvL+WPt+eggeWIl+ihqFxyXG4gICAgICAgICAgICB0aGlzLnJhbmRvbV9vbmUudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLm51bWJlckxpc3QuYXJyYXkubGVuZ3RoID4gMikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yYW5kb21fYWZ0ZXIudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJhbmRvbV9iZWZvcmUudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJhbmRvbV9hbGwudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yYW5kb21fb25lLndpZHRoID0gMzAwO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yYW5kb21fb25lLmNlbnRlclggPSAwO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMubnVtYmVyTGlzdC5yZXBlYXRYID0gNTtcclxuICAgICAgICAgICAgdGhpcy5udW1iZXJMaXN0LnJlcGVhdFkgPSA0O1xyXG4gICAgICAgICAgICB0aGlzLm51bWJlckxpc3QuY2VsbHMuZm9yRWFjaCgoaXRlbTogTGF5YS5TcHJpdGUpID0+IHtcclxuICAgICAgICAgICAgICAgIGl0ZW0ub24oXCJHZXRJdGVtXCIsIHRoaXMsIHRoaXMuZ2V0U2VsZWN0TnVtYmVyKVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pLmNhdGNoKChlcnI6YW55KT0+e1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIubWVzc2FnZSk7XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICAvKirnm5HlkKznu5/orqHliJfooajmlbDmja7pgInkuK3kuKrmlbAgKi9cclxuICAgIHByaXZhdGUgZ2V0U2VsZWN0TnVtYmVyKCl7XHJcbiAgICAgICAgdGhpcy5zZWxlY3ROdW1iZXIgPSAwO1xyXG4gICAgICAgIHRoaXMuY29kZUxpc3QgPSAnJztcclxuICAgICAgICB0aGlzLm51bWJlckxpc3QuYXJyYXkuZm9yRWFjaChpdGVtPT57XHJcbiAgICAgICAgICAgIGlmIChpdGVtLmJ1eWVySWQgPT09ICcyJykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3ROdW1iZXIgPSB0aGlzLnNlbGVjdE51bWJlciArIDE7XHJcbiAgICAgICAgICAgICAgICBsZXQgY29kZVN0cmluZzpzdHJpbmcgPSBgJHt0aGlzLmNvZGVMaXN0fSR7dGhpcy5jb2RlTGlzdC5sZW5ndGggPiAwID8gJywnOicnfSR7aXRlbS5jb2RlfWA7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvZGVMaXN0ID0gIGNvZGVTdHJpbmc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgICAgIHRoaXMudG90YWwudGV4dCA9IHV0aWxzLnRvRGVjaW1hbCgodGhpcy51bml0UHJpY2UgKiB0aGlzLnNlbGVjdE51bWJlciksMikgKyAnIFVTRFQnO1xyXG4gICAgICAgIHRoaXMudG90YWxQcmljZSA9ICt1dGlscy50b0RlY2ltYWwoKHRoaXMudW5pdFByaWNlICogdGhpcy5zZWxlY3ROdW1iZXIpLDIpO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcy5zZWxlY3ROdW1iZXI7XHJcbiAgICB9XHJcbn0iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDg6MTZcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDg6MTZcclxuICogQGRlc2Mg6aaW6aG16ISa5pysXHJcbiAqL1xyXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcclxuaW1wb3J0IHsgVG9hc3QgfSBmcm9tIFwiLi4vdmlldy9Ub2FzdFwiO1xyXG5pbXBvcnQgeyBHYW1lTW9kZWwgfSBmcm9tIFwiLi4vanMvR2FtZU1vZGVsXCI7XHJcbmltcG9ydCB1dGlscyBmcm9tICcuLi9qcy91dGlscydcclxuaW1wb3J0IGFwaSBmcm9tIFwiLi4vanMvYXBpXCI7XHJcblxyXG5pbXBvcnQgeyBwb3N0IH0gZnJvbSAnLi4vanMvaHR0cCc7XHJcbmltcG9ydCB7IFNvY2tldCB9IGZyb20gXCIuLi9qcy9zb2NrZXRcIjtcclxuaW1wb3J0IHsgVGFiYmFyIH0gZnJvbSBcIi4uL3ZpZXcvVGFiYmFyXCI7XHJcbi8vIGltcG9ydCByZWNoYXJnZURpYWxvZyBmcm9tICcuLi90ZW1wbGF0ZS9yZWNoYXJnZURpYWxvZyc7XHJcbmltcG9ydCBzY3JlZW5VdGlscyBmcm9tIFwiLi4vanMvc2NyZWVuVXRpbHNcIjtcclxuXHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBIb21lIGV4dGVuZHMgdWkuaG9tZVVJIHtcclxuXHJcbiAgICAvLyBwcml2YXRlIHJlY2hhcmdlRGlhbG9nOiByZWNoYXJnZURpYWxvZzsvL+WFheWAvOW8ueWHulxyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKClcclxuICAgICAgICB0aGlzLnJlY2hhcmdlQm94Lm9uKExheWEuRXZlbnQuQ0xJQ0ssIHRoaXMsIHRoaXMuYnRuUmVjaGFyZ2VGdW5jKTtcclxuICAgICAgICB0aGlzLmJ1eUhlbHAub24oTGF5YS5FdmVudC5DTElDSywgdGhpcywgdGhpcy5vcGVuQnV5SGVscClcclxuICAgICAgICB0aGlzLnB1dGluLm9uKExheWEuRXZlbnQuQ0xJQ0ssIHRoaXMsIHRoaXMucHV0SW5GdW5jKVxyXG4gICAgICAgIHRoaXMuZ29fY2VudGVyLm9uKExheWEuRXZlbnQuQ0xJQ0ssIHRoaXMsIHRoaXMuZ29DZW50ZXIpXHJcbiAgICB9XHJcbiAgICBvbkVuYWJsZSgpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLmdldFVzZXJJbmZvKClcclxuICAgICAgICB0aGlzLnJhbmtUb2RheSgpXHJcbiAgICAgICAgdGhpcy5nZXRHb29kc0xpc3QoKVxyXG5cclxuICAgICAgICAvLyDnm5Hop4bngavnrq3mlbDmja7lj5jliqhcclxuICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5vbignZ2V0Um9ja2V0RGF0YScsIHRoaXMsIChyZXM6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnJvY2tldEFtb3VudC50ZXh0ID0gYCR7dXRpbHMudG9EZWNpbWFsKHJlcy5wb3RNb25leSwgMil9YFxyXG4gICAgICAgICAgICB1dGlscy5jb3VudERvd24ocmVzLmNvdW50RG93biwgKCh0aW1lKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJvY2tldENvdW50RG93bi50ZXh0ID0gdGltZVxyXG4gICAgICAgICAgICB9KSlcclxuICAgICAgICB9KVxyXG4gICAgICAgIC8vIOaYr+WQpuW8gOWlluS6hu+8jOW8gOWlluWIt+aWsOWVhuWTgeWIl+ihqFxyXG4gICAgICAgIEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLm9uKCdpc1RvZ2dsZScsIHRoaXMsIChyZXM6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoc2NyZWVuVXRpbHMuZ2V0U2NyZWVuKCkubmFtZSAgPT09ICdob21lJykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5nZXRHb29kc0xpc3QoKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuXHJcbiAgICB9XHJcblxyXG5cclxuICAgIC8qKuWFheWAvCAqL1xyXG4gICAgcHJpdmF0ZSBidG5SZWNoYXJnZUZ1bmMoKTogdm9pZCB7XHJcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBgaHR0cHM6Ly8ke2RvY3VtZW50LmRvbWFpbn0vIy9tYWluX1BhZ2U/c2hvdz1yZWNoYXJnZWBcclxuICAgICAgICAvLyBUb2FzdC5zaG93KCfngrnlh7vlhYXlgLwnKVxyXG4gICAgICAgIC8vIHRoaXMucmVjaGFyZ2VEaWFsb2cgPSBuZXcgcmVjaGFyZ2VEaWFsb2coKTtcclxuICAgICAgICAvLyB0aGlzLnJlY2hhcmdlRGlhbG9nLnkgPSBMYXlhLnN0YWdlLmhlaWdodCAtIHRoaXMucmVjaGFyZ2VEaWFsb2cuaGVpZ2h0O1xyXG4gICAgICAgIC8vIHRoaXMucmVjaGFyZ2VEaWFsb2cucG9wdXBFZmZlY3QgPSBMYXlhLkhhbmRsZXIuY3JlYXRlKHRoaXMsIHRoaXMucmVjaGFyZ2VEaWFsb2dQb3B1cEZ1bik7XHJcbiAgICAgICAgLy8gdGhpcy5yZWNoYXJnZURpYWxvZy5jbG9zZUVmZmVjdCA9IExheWEuSGFuZGxlci5jcmVhdGUodGhpcywgdGhpcy5yZWNoYXJnZURpYWxvZ0Nsb3NlRnVuKTtcclxuICAgICAgICAvLyB0aGlzLnJlY2hhcmdlRGlhbG9nLnBvcHVwKCk7XHJcbiAgICB9XHJcbiAgICAvKirnqbrmipUgKi9cclxuICAgIHByaXZhdGUgcHV0SW5GdW5jKCkge1xyXG4gICAgICAgIC8vIFRhYmJhci5nZXRJbnN0YW5jZSgpLm9wZW5TY2VuZSgneGN0ai5zY2VuZScpXHJcbiAgICAgICAgVG9hc3Quc2hvdygn5pqC5pyq5byA5pS+77yM5pWs6K+35pyf5b6FJylcclxuICAgIH1cclxuXHJcbiAgICAvKirojrflj5bkuKrkurrkv6Hmga8gKi9cclxuICAgIHByaXZhdGUgZ2V0VXNlckluZm8oKSB7XHJcbiAgICAgICAgYXBpLmdldFVzZXJJbmZvKCkudGhlbigocmVzOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5uaWNrTmFtZS50ZXh0ID0gcmVzLnVzZXJJbmZvLm5pY2tOYW1lXHJcbiAgICAgICAgICAgIHRoaXMubXlBbW91bnQudGV4dCA9IGAke3V0aWxzLnRvRGVjaW1hbChyZXMudXNlckluZm8ubW9uZXksIDIpfWBcclxuICAgICAgICAgICAgdGhpcy5hdmF0YXIuc2tpbiA9IHJlcy51c2VySW5mby5hdmF0YXI7XHJcbiAgICAgICAgfSkuY2F0Y2goKGVycjogYW55KSA9PiB7XHJcbiAgICAgICAgICAgXHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICAvKirku4rml6XlpKflpZbmsaAgKi9cclxuICAgIHByaXZhdGUgcmFua1RvZGF5KCkge1xyXG4gICAgICAgIGFwaS5nZXRSYW5rVG9kYXkoKS50aGVuKChyZXM6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnJvY2tldEFtb3VudC50ZXh0ID0gYCR7dXRpbHMudG9EZWNpbWFsKHJlcy5wb3RNb25leSwgMil9YFxyXG4gICAgICAgICAgICB1dGlscy5jb3VudERvd24ocmVzLmNvdW50RG93biwgKCh0aW1lKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJvY2tldENvdW50RG93bi50ZXh0ID0gdGltZVxyXG4gICAgICAgICAgICB9KSlcclxuICAgICAgICB9KS5jYXRjaCgoZXJyOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyLm1lc3NhZ2UpO1xyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgLyoq6I635Y+W6aaW6aG15ZWG5ZOB5YiX6KGoICovXHJcbiAgICBwcml2YXRlIGdldEdvb2RzTGlzdCgpIHtcclxuICAgICAgICBhcGkuZ2V0R29vZHNMaXN0KCkudGhlbigocmVzOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5saXN0LnJlcGVhdFggPSByZXMubGlzdC5sZW5ndGg7XHJcbiAgICAgICAgICAgIHRoaXMubGlzdC5hcnJheSA9IHJlcy5saXN0O1xyXG4gICAgICAgIH0pLmNhdGNoKChlcnI6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIubWVzc2FnZSk7XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICAvKirnjqnms5Xku4vnu40gKi9cclxuICAgIHByaXZhdGUgb3BlbkJ1eUhlbHAoKSB7XHJcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSAnaHR0cHM6Ly9tLnh5aGouaW8vIy9vcmlnaW4vemgvYnV5SGVscCc7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnb0NlbnRlcigpIHtcclxuICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IGBodHRwczovLyR7ZG9jdW1lbnQuZG9tYWlufS8jL21haW5fUGFnZWBcclxuICAgIH1cclxuXHJcbiAgICAvKirlvLnlh7rlhYXlgLznmoTmlYjmnpwgKi9cclxuICAgIC8vIHJlY2hhcmdlRGlhbG9nUG9wdXBGdW4oZGlhbG9nOiBMYXlhLkRpYWxvZykge1xyXG4gICAgLy8gICAgIGRpYWxvZy5zY2FsZSgxLCAxKTtcclxuICAgIC8vICAgICBkaWFsb2cuX2VmZmVjdFR3ZWVuID0gTGF5YS5Ud2Vlbi5mcm9tKGRpYWxvZyxcclxuICAgIC8vICAgICAgICAgeyB4OiAwLCB5OiBMYXlhLnN0YWdlLmhlaWdodCArIGRpYWxvZy5oZWlnaHQgfSxcclxuICAgIC8vICAgICAgICAgMzAwLFxyXG4gICAgLy8gICAgICAgICBMYXlhLkVhc2UubGluZWFyTm9uZSxcclxuICAgIC8vICAgICAgICAgTGF5YS5IYW5kbGVyLmNyZWF0ZShMYXlhLkRpYWxvZy5tYW5hZ2VyLCBMYXlhLkRpYWxvZy5tYW5hZ2VyLmRvT3BlbiwgW2RpYWxvZ10pLCAwLCBmYWxzZSwgZmFsc2UpO1xyXG4gICAgLy8gfVxyXG4gICAgLyoq5YWz6Zet5YWF5YC855qE5pWI5p6cICovXHJcbiAgICAvLyByZWNoYXJnZURpYWxvZ0Nsb3NlRnVuKGRpYWxvZzogTGF5YS5EaWFsb2cpIHtcclxuICAgIC8vICAgICBkaWFsb2cuX2VmZmVjdFR3ZWVuID0gTGF5YS5Ud2Vlbi50byhkaWFsb2csXHJcbiAgICAvLyAgICAgICAgIHsgeDogMCwgeTogTGF5YS5zdGFnZS5oZWlnaHQgKyBkaWFsb2cuaGVpZ2h0IH0sXHJcbiAgICAvLyAgICAgICAgIDMwMCxcclxuICAgIC8vICAgICAgICAgTGF5YS5FYXNlLmxpbmVhck5vbmUsXHJcbiAgICAvLyAgICAgICAgIExheWEuSGFuZGxlci5jcmVhdGUoTGF5YS5EaWFsb2cubWFuYWdlciwgTGF5YS5EaWFsb2cubWFuYWdlci5kb0Nsb3NlLCBbZGlhbG9nXSksIDAsIGZhbHNlLCBmYWxzZSk7XHJcbiAgICAvLyB9XHJcbn0iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDg6MjhcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDg6MjhcclxuICogQGRlc2Mg6K6w5b2V6aG16Z2i6ISa5pysXHJcbiAqL1xyXG5pbXBvcnQgeyB1aSB9IGZyb20gJy4uL3VpL2xheWFNYXhVSSdcclxuaW1wb3J0IGFwaSBmcm9tICcuLi9qcy9hcGknO1xyXG5pbXBvcnQgc2NyZWVuVXRpbHMgZnJvbSAnLi4vanMvc2NyZWVuVXRpbHMnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVjb3JkIGV4dGVuZHMgdWkucmVjb3JkVUkge1xyXG5cclxuICAgIHN0YXRpYyByZWFkb25seSBIQUxGX1NDUk9MTF9FTEFTVElDX0RJU1RBTkNFOiBudW1iZXIgPSAxMDA7XHJcbiAgICBwcml2YXRlIF9pc1Njcm9sbE92ZXJFbGFzdGljRGlzdGFuY2U6IGJvb2xlYW47XHJcbiAgICBwcml2YXRlIHBhZ2U6bnVtYmVyID0gMTtcclxuICAgIHByaXZhdGUgc2NyZWVuVHlwZTpudW1iZXIgPSAxO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCl7XHJcbiAgICAgICAgc3VwZXIoKVxyXG5cclxuICAgICAgICB0aGlzLmNhbnl1Lm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLnRhYlN3aXRjaCxbMV0pXHJcbiAgICAgICAgdGhpcy53YW5ncWkub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMudGFiU3dpdGNoLFsyXSlcclxuICAgICAgICB0aGlzLm9uKExheWEuRXZlbnQuUkVTSVpFLHRoaXMsdGhpcy5vblJlc2l6ZSlcclxuICAgIH1cclxuXHJcbiAgICBvbkVuYWJsZSgpOnZvaWR7XHJcbiAgICAgICAgdGhpcy5nZXRNeU9yZGVycygpO1xyXG4gICAgICAgIC8vIHRoaXMuZ2V0R29vZHNIaXN0b3J5KCk7XHJcblxyXG4gICAgICAgIC8v5Y+C5LiO6K6w5b2V5rua5Yqo5Yqg6L295pu05aSaXHJcbiAgICAgICAgdGhpcy5qb2luTGlzdC5zY3JvbGxCYXIuY2hhbmdlSGFuZGxlciA9IExheWEuSGFuZGxlci5jcmVhdGUodGhpcyx0aGlzLm9uSm9pbkxpc3RTY3JvbGxDaGFuZ2UsbnVsbCxmYWxzZSlcclxuICAgICAgICB0aGlzLmpvaW5MaXN0LnNjcm9sbEJhci5vbihMYXlhLkV2ZW50LkVORCwgdGhpcywgdGhpcy5vbkpvaW5MaXN0U2Nyb2xsRW5kKVxyXG4gICAgICAgIC8v5b6A5pyf6K6w5b2V5rua5Yqo5Yqg6L295pu05aSaXHJcbiAgICAgICAgdGhpcy5wcmV2aW9vdXNMaXN0LnNjcm9sbEJhci5jaGFuZ2VIYW5kbGVyID0gTGF5YS5IYW5kbGVyLmNyZWF0ZSh0aGlzLHRoaXMub25QcmV2aW9vdXNMaXN0U2Nyb2xsQ2hhbmdlLG51bGwsZmFsc2UpXHJcbiAgICAgICAgdGhpcy5wcmV2aW9vdXNMaXN0LnNjcm9sbEJhci5vbihMYXlhLkV2ZW50LkVORCwgdGhpcywgdGhpcy5vblByZXZpb291c0xpc3RTY3JvbGxFbmQpXHJcbiAgICB9XHJcblxyXG4gICAgLyoq6I635Y+W5Y+C5LiO6K6w5b2VICovXHJcbiAgICBwcml2YXRlIGdldE15T3JkZXJzKHBhZ2UgPSAxKXtcclxuICAgICAgICBhcGkuZ2V0TXlPcmRlcnMocGFnZSkudGhlbigocmVzOmFueSk9PntcclxuICAgICAgICAgICAgaWYgKHRoaXMuam9pbkxpc3QuYXJyYXkgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuam9pbkxpc3QuYXJyYXkgPSBbLi4udGhpcy5qb2luTGlzdC5hcnJheSwuLi5yZXNdXHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgdGhpcy5qb2luTGlzdC5hcnJheSA9IHJlcztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodGhpcy5qb2luTGlzdC5hcnJheS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmpvaW5MaXN0LnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIHRoaXMubm9EYXRhLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSkuY2F0Y2goKGVycjphbnkpPT57XHJcbiAgICAgICAgICAgIHRoaXMubm9EYXRhLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIubWVzc2FnZSk7XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuICAgIC8qKuiOt+WPluW+gOacn+iusOW9lSAqL1xyXG4gICAgcHJpdmF0ZSBnZXRHb29kc0hpc3RvcnkocGFnZT86bnVtYmVyKXtcclxuICAgICAgICBhcGkuZ2V0R29vZHNIaXN0b3J5KHBhZ2UpLnRoZW4oKHJlczphbnkpPT57XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnByZXZpb291c0xpc3QuYXJyYXkgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHJldmlvb3VzTGlzdC5hcnJheSA9IFsuLi50aGlzLnByZXZpb291c0xpc3QuYXJyYXksLi4ucmVzXVxyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIHRoaXMucHJldmlvb3VzTGlzdC5hcnJheSA9IHJlcztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodGhpcy5wcmV2aW9vdXNMaXN0LmFycmF5Lmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubm9EYXRhLnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHRoaXMucHJldmlvb3VzTGlzdC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pLmNhdGNoKChlcnI6YW55KT0+e1xyXG4gICAgICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyLm1lc3NhZ2UpO1xyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiDliIfmjaLorrDlvZXliJfooahcclxuICAgICAqIEBwYXJhbSB0eXBlIDE65Y+C5LiO6K6w5b2VICAy77ya5b6A5pyf6K6w5b2VXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgdGFiU3dpdGNoKHR5cGU6bnVtYmVyKXtcclxuICAgICAgICBpZiAoc2NyZWVuVXRpbHMuZ2V0U2NyZWVuKCkubmFtZSA9PT0gJ3JlY29yZCcgJiYgdGhpcy5zY3JlZW5UeXBlID09PSB0eXBlKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5zY3JlZW5UeXBlID0gdHlwZTtcclxuICAgICAgICB0aGlzLnBhZ2UgPSAxO1xyXG4gICAgICAgIGlmICh0eXBlID09PSAxKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY2FueXUuc2tpbiA9ICdjb21wL2ltZ190YWJfYWN0aXZlLnBuZyc7XHJcbiAgICAgICAgICAgIHRoaXMud2FuZ3FpLnNraW4gPSAnY29tcC9pbWdfdGFiLnBuZyc7XHJcbiAgICAgICAgICAgIHRoaXMuZ2V0TXlPcmRlcnMoKVxyXG4gICAgICAgICAgICB0aGlzLnByZXZpb291c0xpc3Quc2Nyb2xsVG8oMClcclxuICAgICAgICAgICAgdGhpcy5wcmV2aW9vdXNMaXN0LnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5wcmV2aW9vdXNMaXN0LmFycmF5ID0gW107XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIHRoaXMud2FuZ3FpLnNraW4gPSAnY29tcC9pbWdfdGFiX2FjdGl2ZS5wbmcnO1xyXG4gICAgICAgICAgICB0aGlzLmNhbnl1LnNraW4gPSAnY29tcC9pbWdfdGFiLnBuZyc7XHJcbiAgICAgICAgICAgIHRoaXMuZ2V0R29vZHNIaXN0b3J5KCk7XHJcbiAgICAgICAgICAgIHRoaXMuam9pbkxpc3Quc2Nyb2xsVG8oMCk7XHJcbiAgICAgICAgICAgIHRoaXMuam9pbkxpc3QudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLmpvaW5MaXN0LmFycmF5ID0gW107XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKuebkeinhuWxj+W5leWkp+Wwj+WPmOWMliAqL1xyXG4gICAgb25SZXNpemUoKXtcclxuICAgICAgICAvL+WIl+ihqOmrmOW6pumAgumFjSA9IOWxj+W5lemrmOW6piAtIChiYW5uZXIgKyB0YWJiYXIpXHJcbiAgICAgICAgdGhpcy5qb2luTGlzdC5oZWlnaHQgPSB0aGlzLmhlaWdodCAtIDQzMDtcclxuICAgICAgICB0aGlzLnByZXZpb291c0xpc3QuaGVpZ2h0ID0gdGhpcy5oZWlnaHQgLSA0MzA7XHJcbiAgICB9XHJcblxyXG4gICAgLyoq5Y+C5LiO6K6w5b2V5YiX6KGo5rua5YqoICovXHJcbiAgICBwcml2YXRlIG9uSm9pbkxpc3RTY3JvbGxDaGFuZ2UodjphbnkpIHtcclxuICAgICAgICBpZiAodiA+IHRoaXMuam9pbkxpc3Quc2Nyb2xsQmFyLm1heCArIFJlY29yZC5IQUxGX1NDUk9MTF9FTEFTVElDX0RJU1RBTkNFKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2lzU2Nyb2xsT3ZlckVsYXN0aWNEaXN0YW5jZSA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcHJpdmF0ZSBvbkpvaW5MaXN0U2Nyb2xsRW5kKCl7XHJcbiAgICAgICAgaWYgKHRoaXMuX2lzU2Nyb2xsT3ZlckVsYXN0aWNEaXN0YW5jZSkge1xyXG4gICAgICAgICAgICB0aGlzLl9pc1Njcm9sbE92ZXJFbGFzdGljRGlzdGFuY2UgPSBmYWxzZTtcclxuICAgICAgICAgICAgLy8gdGhpcy5ldmVudChHYW1lRXZlbnQuTkVYVF9QQUdFKTtcclxuICAgICAgICAgICAgdGhpcy5wYWdlID0gdGhpcy5wYWdlICsgMTtcclxuICAgICAgICAgICAgdGhpcy5nZXRNeU9yZGVycyh0aGlzLnBhZ2UpXHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKExvZ0ZsYWcuZ2V0KExvZ0ZsYWcuVUkpLCBcIm5leHQgcGFnZVwiKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKuWPguS4juiusOW9leWIl+ihqOa7muWKqCAqL1xyXG4gICAgcHJpdmF0ZSBvblByZXZpb291c0xpc3RTY3JvbGxDaGFuZ2UodjphbnkpIHtcclxuICAgICAgICBpZiAodiA+IHRoaXMucHJldmlvb3VzTGlzdC5zY3JvbGxCYXIubWF4ICsgUmVjb3JkLkhBTEZfU0NST0xMX0VMQVNUSUNfRElTVEFOQ0UpIHtcclxuICAgICAgICAgICAgdGhpcy5faXNTY3JvbGxPdmVyRWxhc3RpY0Rpc3RhbmNlID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBwcml2YXRlIG9uUHJldmlvb3VzTGlzdFNjcm9sbEVuZCgpe1xyXG4gICAgICAgIGlmICh0aGlzLl9pc1Njcm9sbE92ZXJFbGFzdGljRGlzdGFuY2UpIHtcclxuICAgICAgICAgICAgdGhpcy5faXNTY3JvbGxPdmVyRWxhc3RpY0Rpc3RhbmNlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMucGFnZSA9IHRoaXMucGFnZSArIDE7XHJcbiAgICAgICAgICAgIHRoaXMuZ2V0R29vZHNIaXN0b3J5KHRoaXMucGFnZSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjAgMTA6Mjc6MjVcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjAgMTA6Mjc6MjVcclxuICogQGRlc2Mg54Gr566t5aSn5aWW6aG16Z2iXHJcbiAqL1xyXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcclxuaW1wb3J0IHsgZ2V0IH0gZnJvbSBcIi4uL2pzL2h0dHBcIjtcclxuaW1wb3J0IHV0aWxzIGZyb20gXCIuLi9qcy91dGlsc1wiO1xyXG5pbXBvcnQgYXBpIGZyb20gXCIuLi9qcy9hcGlcIjtcclxuaW1wb3J0IHsgVGFiYmFyIH0gZnJvbSBcIi4uL3ZpZXcvVGFiYmFyXCI7XHJcbmltcG9ydCB7IEdhbWVNb2RlbCB9IGZyb20gXCIuLi9qcy9HYW1lTW9kZWxcIjtcclxuXHJcbiBleHBvcnQgZGVmYXVsdCBjbGFzcyBncmFuZFByaXggZXh0ZW5kcyB1aS5ncmFuZFByaXhVSSB7XHJcbiAgICAgY29uc3RydWN0b3IoKXtcclxuICAgICAgICAgc3VwZXIoKVxyXG4gICAgICAgICB0aGlzLnJhbmtQcml6ZUhlbHAub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMub3BlblJhbmtQcml6ZUhlbHApXHJcbiAgICAgICAgIHRoaXMuYnRuX2hpc3Rvcnkub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuQnRuaGlzdG9yeSlcclxuICAgICB9XHJcblxyXG4gICAgIG9uRW5hYmxlKCl7XHJcbiAgICAgICAgdGhpcy5nZXRSYW5rVG9kYXkoKVxyXG4gICAgICAgIExheWEuc3RhZ2Uub24oTGF5YS5FdmVudC5SRVNJWkUsdGhpcyx0aGlzLm9uUmVzaXplKVxyXG4gICAgICAgIHRoaXMub25SZXNpemUoKVxyXG4gICAgICAgIC8vIOebkeinhueBq+eureaVsOaNruWPmOWKqFxyXG4gICAgICAgIEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLm9uKCdnZXRSb2NrZXREYXRhJyx0aGlzLChyZXM6YW55KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuYm9udXMudGV4dCA9IGAke3V0aWxzLnRvRGVjaW1hbChyZXMucG90TW9uZXksMil9YCBcclxuICAgICAgICAgICAgdXRpbHMuY291bnREb3duKHJlcy5jb3VudERvd24sKCh0aW1lKT0+e1xyXG4gICAgICAgICAgICAgICAgdGhpcy5Db3VudERvd24udGV4dCA9IHRpbWVcclxuICAgICAgICAgICAgfSkpXHJcbiAgICAgICAgfSlcclxuICAgICB9XHJcbiAgICAgb25EaXNhYmxlKCk6dm9pZCB7XHJcbiAgICAgICAgTGF5YS5zdGFnZS5vZmYoTGF5YS5FdmVudC5SRVNJWkUsdGhpcyx0aGlzLm9uUmVzaXplKVxyXG4gICAgfVxyXG5cclxuICAgICAvKirojrflj5blpKflpZbkv6Hmga8gKi9cclxuICAgIHByaXZhdGUgZ2V0UmFua1RvZGF5KCl7XHJcbiAgICAgICAgYXBpLmdldFJhbmtUb2RheSgpLnRoZW4oKHJlczphbnkpPT57XHJcbiAgICAgICAgICAgIHRoaXMuYm9udXMudGV4dCA9IGAke3V0aWxzLnRvRGVjaW1hbChyZXMucG90TW9uZXksMil9YCBcclxuICAgICAgICAgICAgdXRpbHMuY291bnREb3duKHJlcy5jb3VudERvd24sKCh0aW1lKT0+e1xyXG4gICAgICAgICAgICAgICAgdGhpcy5Db3VudERvd24udGV4dCA9IHRpbWVcclxuICAgICAgICAgICAgfSkpXHJcbiAgICAgICAgICAgIGlmIChyZXMubGlzdC5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubm9EYXRhLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8v56ys5LiA5ZCNXHJcbiAgICAgICAgICAgIGlmIChyZXMubGlzdC5saXN0MS5kYXRhLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYm94MS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYWxvbmUxLnRleHQgPSBg54us5b6XICR7dXRpbHMudG9EZWNpbWFsKHJlcy5saXN0Lmxpc3QxLmRpdmlkbW9uZXksMil9IFVTRFRgXHJcbiAgICAgICAgICAgICAgICB0aGlzLlByb3BvcnRpb24xLnRleHQgPSBg5Y2g5aWW5rGgJHtyZXMubGlzdC5saXN0MS5wZXJjZW50fWBcclxuICAgICAgICAgICAgICAgIHRoaXMucHJpeExpc3QxLmFycmF5ID0gcmVzLmxpc3QubGlzdDEuZGF0YVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIDItNeWQjVxyXG4gICAgICAgICAgICBpZiAocmVzLmxpc3QubGlzdDIuZGF0YS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJveDIudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFsb25lMi50ZXh0ID0gYOavj+S6uiAke3V0aWxzLnRvRGVjaW1hbChyZXMubGlzdC5saXN0Mi5kaXZpZG1vbmV5LzQsMil9IFVTRFRgXHJcbiAgICAgICAgICAgICAgICB0aGlzLlByb3BvcnRpb24yLnRleHQgPSBg5Y2g5aWW5rGgJHtyZXMubGlzdC5saXN0Mi5wZXJjZW50fWBcclxuICAgICAgICAgICAgICAgIHRoaXMucHJpeExpc3QyLmFycmF5ID0gcmVzLmxpc3QubGlzdDIuZGF0YVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIDUtMTXlkI1cclxuICAgICAgICAgICAgaWYgKHJlcy5saXN0Lmxpc3QzLmRhdGEubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ib3gzLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hbG9uZTMudGV4dCA9IGDmr4/kurogJHt1dGlscy50b0RlY2ltYWwocmVzLmxpc3QubGlzdDMuZGl2aWRtb25leS8xMCwyKX0gVVNEVGBcclxuICAgICAgICAgICAgICAgIHRoaXMuUHJvcG9ydGlvbjMudGV4dCA9IGDljaDlpZbmsaAke3Jlcy5saXN0Lmxpc3QzLnBlcmNlbnR9YFxyXG4gICAgICAgICAgICAgICAgdGhpcy5wcml4TGlzdDMuYXJyYXkgPSByZXMubGlzdC5saXN0My5kYXRhXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy/mnKrnmbvlvZXliJnkuI3mmL7npLrkuKrkurrmjpLlkI1cclxuICAgICAgICAgICAgaWYgKHJlcy5saXN0LnNlbGYudXNlcklkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm15UmFua0JveC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMubXlyYW5raW5nLnRleHQgPSByZXMubGlzdC5zZWxmLnJhbmsgPiAxNSA/ICcxNSsnIDogYCR7cmVzLmxpc3Quc2VsZi5yYW5rfWA7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmF2YXRhci5za2luID0gcmVzLmxpc3Quc2VsZi5hdmF0YXI7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5pY2tOYW1lLnRleHQgPSByZXMubGlzdC5zZWxmLm5pY2tOYW1lO1xyXG4gICAgICAgICAgICAgICAgdGhpcy51aWQudGV4dCA9IHJlcy5saXN0LnNlbGYudXNlcklkO1xyXG4gICAgICAgICAgICAgICAgdGhpcy52b2x1bWUudGV4dCA9IGAke3V0aWxzLnRvRGVjaW1hbChyZXMubGlzdC5zZWxmLmNvbnN1bSwyKX0gVVNEVGBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pLmNhdGNoKChlcnI6YW55KT0+e1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIubWVzc2FnZSk7XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIEJ0bmhpc3RvcnkoKXtcclxuICAgICAgICBUYWJiYXIuZ2V0SW5zdGFuY2UoKS5vcGVuU2NlbmUoJ3ByaUhpc3RvcnlTY2VuZS5zY2VuZScpXHJcbiAgICB9XHJcblxyXG4gICAgLyoq6K+05piOICovXHJcbiAgICBwcml2YXRlIG9wZW5SYW5rUHJpemVIZWxwKCl7XHJcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSAnaHR0cHM6Ly9tLnh5aGouaW8vIy9vcmlnaW4vemgvcmFua1ByaXplSGVscCc7XHJcbiAgICB9XHJcbiAgICBwcml2YXRlIG9uUmVzaXplKCk6dm9pZCB7XHJcbiAgICAgICAgdGhpcy5saXN0Qm94LmhlaWdodCA9IExheWEuc3RhZ2UuaGVpZ2h0IC0gNzAwO1xyXG4gICAgfVxyXG4gfSAiLCJcclxuLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAzLTE4IDE2OjU5OjEzXHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAzLTE4IDE2OjU5OjEzXHJcbiAqIEBkZXNjIOmhtemdouWKoOi9vWxvYWRpbmdcclxuICovXHJcbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xyXG5cclxuIGV4cG9ydCBkZWZhdWx0IGNsYXNzIGxvYWRpbmdTY2VuZSBleHRlbmRzIHVpLmxvYWRpbmdTY2VuZVVJIHtcclxuICAgIFxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoKVxyXG4gICAgfVxyXG5cclxuICAgIHNldFByb2dyZXNzKHZhbHVlOm51bWJlcil7XHJcbiAgICAgICAgY29uc29sZS5sb2codmFsdWUsJ+W9k+WJjei/m+W6picpO1xyXG4gICAgICAgIHRoaXMubG9hZGluZ1Byb2dyZXNzLnZhbHVlID0gdmFsdWU7XHJcbiAgICAgICAgbGV0IHZhbDpzdHJpbmcgID0gYCR7dmFsdWUgKiAxMDB9YDtcclxuICAgICAgICB0aGlzLnByb2dyZXNzLnRleHQgPSBgJHtwYXJzZUludCh2YWwsMCl9JWA7XHJcbiAgICAgICAgdGhpcy5yb2NrZXRsb2FkaW5nLnggPSAzNjUgKiB2YWx1ZTtcclxuICAgIH1cclxuIH1cclxuIiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTIwIDEwOjI3OjI1XHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTIwIDEwOjI3OjI1XHJcbiAqIEBkZXNjIOeBq+eureWkp+WlluWOhuWPsuiusOW9lemhtemdolxyXG4gKi9cclxuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XHJcbmltcG9ydCB1dGlscyBmcm9tIFwiLi4vanMvdXRpbHNcIjtcclxuaW1wb3J0IGFwaSBmcm9tIFwiLi4vanMvYXBpXCI7XHJcbmltcG9ydCB7IFRhYmJhciB9IGZyb20gXCIuLi92aWV3L1RhYmJhclwiO1xyXG5cclxuIGV4cG9ydCBkZWZhdWx0IGNsYXNzIGdyYW5kUHJpeCBleHRlbmRzIHVpLnByaUhpc3RvcnlTY2VuZVVJIHtcclxuICAgICBjb25zdHJ1Y3Rvcigpe1xyXG4gICAgICAgIHN1cGVyKClcclxuICAgICB9XHJcblxyXG4gICAgIG9uRW5hYmxlKCl7XHJcbiAgICAgICAgdGhpcy5nZXRSYW5rSGlzdG9yeSgpXHJcbiAgICAgICAgTGF5YS5zdGFnZS5vbihMYXlhLkV2ZW50LlJFU0laRSx0aGlzLHRoaXMub25SZXNpemUpXHJcbiAgICAgICAgdGhpcy5vblJlc2l6ZSgpXHJcbiAgICAgfVxyXG4gICAgb25EaXNhYmxlKCk6dm9pZCB7XHJcbiAgICAgICAgTGF5YS5zdGFnZS5vZmYoTGF5YS5FdmVudC5SRVNJWkUsdGhpcyx0aGlzLm9uUmVzaXplKVxyXG4gICAgfVxyXG5cclxuICAgICAvKirojrflj5blpKflpZbkv6Hmga8gKi9cclxuICAgIHByaXZhdGUgZ2V0UmFua0hpc3RvcnkoKXtcclxuICAgICAgICBhcGkuZ2V0UmFua0hpc3RvcnkoKS50aGVuKChyZXM6YW55KT0+e1xyXG4gICAgICAgICAgICB0aGlzLnRvdGFsLnRleHQgPSBg5oC75aWW6YeROiR7dXRpbHMudG9EZWNpbWFsKHJlcy5wb3RNb25leSwyKX0gVVNEVGBcclxuICAgICAgICAgICAgaWYgKHJlcy5saXN0Lmxpc3QxLmRhdGEubGVuZ3RoID09PSAwICYmIHJlcy5saXN0Lmxpc3QyLmRhdGEubGVuZ3RoID09PSAwICYmIHJlcy5saXN0Lmxpc3QzLmRhdGEubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxpc3RCb3gudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy/nrKzkuIDlkI1cclxuICAgICAgICAgICAgaWYgKHJlcy5saXN0Lmxpc3QxLmRhdGEubGVuZ3RoID4gMCkgeyAgXHJcbiAgICAgICAgICAgICAgICB0aGlzLmxpc3RCb3gudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJveDEudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFsb25lMS50ZXh0ID0gYOeLrOW+lyAke3V0aWxzLnRvRGVjaW1hbChyZXMubGlzdC5saXN0MS5kaXZpZG1vbmV5LDIpfSBVU0RUYFxyXG4gICAgICAgICAgICAgICAgdGhpcy5Qcm9wb3J0aW9uMS50ZXh0ID0gYOWNoOWlluaxoCR7cmVzLmxpc3QubGlzdDEucGVyY2VudH1gXHJcbiAgICAgICAgICAgICAgICB0aGlzLnByaXhMaXN0MS5hcnJheSA9IHJlcy5saXN0Lmxpc3QxLmRhdGFcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyAyLTXlkI1cclxuICAgICAgICAgICAgaWYgKHJlcy5saXN0Lmxpc3QyLmRhdGEubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5saXN0Qm94LnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ib3gyLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hbG9uZTIudGV4dCA9IGDmr4/kurogJHt1dGlscy50b0RlY2ltYWwocmVzLmxpc3QubGlzdDIuZGl2aWRtb25leS80LDIpfSBVU0RUYFxyXG4gICAgICAgICAgICAgICAgdGhpcy5Qcm9wb3J0aW9uMi50ZXh0ID0gYOWNoOWlluaxoCR7cmVzLmxpc3QubGlzdDIucGVyY2VudH1gXHJcbiAgICAgICAgICAgICAgICB0aGlzLnByaXhMaXN0Mi5hcnJheSA9IHJlcy5saXN0Lmxpc3QyLmRhdGFcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgLy8gNS0xNeWQjVxyXG4gICAgICAgICAgICAgaWYgKHJlcy5saXN0Lmxpc3QzLmRhdGEubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5saXN0Qm94LnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ib3gzLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hbG9uZTMudGV4dCA9IGDmr4/kurogJHt1dGlscy50b0RlY2ltYWwocmVzLmxpc3QubGlzdDMuZGl2aWRtb25leS8xMCwyKX0gVVNEVGBcclxuICAgICAgICAgICAgICAgIHRoaXMuUHJvcG9ydGlvbjMudGV4dCA9IGDljaDlpZbmsaAke3Jlcy5saXN0Lmxpc3QzLnBlcmNlbnR9YFxyXG4gICAgICAgICAgICAgICAgdGhpcy5wcml4TGlzdDMuYXJyYXkgPSByZXMubGlzdC5saXN0My5kYXRhXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KS5jYXRjaCgoZXJyOmFueSk9PntcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyLm1lc3NhZ2UpO1xyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcbiAgICBwcml2YXRlIG9uUmVzaXplKCk6dm9pZCB7XHJcbiAgICAgICAgdGhpcy5saXN0Qm94LmhlaWdodCA9IExheWEuc3RhZ2UuaGVpZ2h0IC0gMjAwO1xyXG4gICAgfVxyXG4gfSAiLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjYgMTE6MDc6MzlcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjYgMTE6MDc6MzlcclxuICogQGRlc2Mg5YWl5Zu05ZCN5Y2VXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XHJcbmltcG9ydCB7IFRhYmJhciB9IGZyb20gXCIuLi92aWV3L1RhYmJhclwiO1xyXG5pbXBvcnQgYXBpIGZyb20gXCIuLi9qcy9hcGlcIjtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNob3J0TGlzdGVkIGV4dGVuZHMgdWkuc2hvcnRMaXN0ZWRVSSB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpXHJcbiAgICAgICAgdGhpcy5vbihMYXlhLkV2ZW50LlJFU0laRSwgdGhpcywgdGhpcy5vblJlc2l6ZSlcclxuICAgIH1cclxuXHJcbiAgICBvbkVuYWJsZSgpIHtcclxuICAgICAgICB0aGlzLmdldFNob3J0TGlzdGVkKClcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRTaG9ydExpc3RlZChwYWdlPzogbnVtYmVyKSB7XHJcbiAgICAgICAgYXBpLmdldFNob3J0TGlzdGVkKHBhZ2UpLnRoZW4oKHJlczogYW55KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuc2hvcnRMaXN0LnJlcGVhdFkgPSByZXMubGVuZ3RoO1xyXG4gICAgICAgICAgICB0aGlzLnNob3J0TGlzdC5hcnJheSA9IHJlcztcclxuICAgICAgICAgICAgdGhpcy5zaG9ydExpc3QudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgfSkuY2F0Y2goKGVycjogYW55KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMubm9EYXRhLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIubWVzc2FnZSk7XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuICAgIC8qKuebkeinhuWxj+W5leWkp+Wwj+WPmOWMliAqL1xyXG4gICAgb25SZXNpemUoKSB7XHJcbiAgICAgICAgLy/liJfooajpq5jluqbpgILphY1cclxuICAgICAgICAvLyB0aGlzLnNob3J0TGlzdC5oZWlnaHQgPSB0aGlzLmhlaWdodCAtIDEwMDtcclxuICAgIH1cclxufVxyXG4iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjYgMTA6MjA6MTVcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjYgMTA6MjA6MTVcclxuICogQGRlc2Mg5Zac5LuO5aSp6ZmN5Lit5aWW5ZCN5Y2VXHJcbiAqL1xyXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcclxuaW1wb3J0IGFwaSBmcm9tIFwiLi4vanMvYXBpXCI7XHJcbmltcG9ydCB7IFRvYXN0IH0gZnJvbSBcIi4uL3ZpZXcvVG9hc3RcIjtcclxuaW1wb3J0IHsgVGFiYmFyIH0gZnJvbSBcIi4uL3ZpZXcvVGFiYmFyXCI7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBXaW5uaW5nIGV4dGVuZHMgdWkueGN0alVJIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKClcclxuICAgICAgICB0aGlzLmJ0bl9zaG9ydGxpc3Qub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuU2hvcnRMaXN0RnVuYylcclxuICAgICAgICB0aGlzLm9uKExheWEuRXZlbnQuUkVTSVpFLHRoaXMsdGhpcy5vblJlc2l6ZSlcclxuICAgIH1cclxuXHJcbiAgICBvbkVuYWJsZSgpe1xyXG4gICAgICAgIHRoaXMuZ2V0WGN0akxpc3QoKVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBwcml2YXRlIGdldFhjdGpMaXN0KHBhZ2U/Om51bWJlcil7XHJcbiAgICAgICAgYXBpLmdldFhjdGpMaXN0KHBhZ2UpLnRoZW4oKHJlczphbnkpPT57XHJcbiAgICAgICAgICAgIHRoaXMud2lubmluZ0xpc3QucmVwZWF0WSA9IHJlcy5sZW5ndGg7XHJcbiAgICAgICAgICAgIHRoaXMud2lubmluZ0xpc3QuYXJyYXkgPSByZXM7XHJcbiAgICAgICAgICAgIHRoaXMud2lubmluZ0xpc3QudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgfSkuY2F0Y2goKGVycjphbnkpPT57XHJcbiAgICAgICAgICAgIHRoaXMubm9EYXRhLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIubWVzc2FnZSk7XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuICAgIFxyXG4gICAgLyoq5p+l55yL5LuK5pel5YWl5Zu05ZCN5Y2VICovXHJcbiAgICBwcml2YXRlIFNob3J0TGlzdEZ1bmMoKXtcclxuICAgICAgICBUYWJiYXIuZ2V0SW5zdGFuY2UoKS5vcGVuU2NlbmUoJ3Nob3J0TGlzdGVkLnNjZW5lJylcclxuICAgIH1cclxuXHJcbiAgICAvKirnm5Hop4blsY/luZXlpKflsI/lj5jljJYgKi9cclxuICAgIG9uUmVzaXplKCl7XHJcbiAgICAgICAgLy/liJfooajpq5jluqbpgILphY0gPSDlsY/luZXpq5jluqYgLSBiYW5uZXJcclxuICAgICAgICB0aGlzLndpbm5pbmdMaXN0LmhlaWdodCA9IHRoaXMuaGVpZ2h0IC0gNjAwO1xyXG4gICAgfVxyXG59XHJcbiIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0ODo0MFxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0ODo0MFxyXG4gKiBAZGVzYyDlj4LkuI7orrDlvZXohJrmnKxcclxuICovXHJcbmltcG9ydCB7IHVpIH0gZnJvbSAnLi4vdWkvbGF5YU1heFVJJ1xyXG5pbXBvcnQgdXRpbHMgZnJvbSAnLi4vanMvdXRpbHMnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3Mgam9pblJlY29yZCBleHRlbmRzIHVpLnRlbXBsYXRlLmpvaW5SZWNvcmRzVUkge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoKVxyXG4gICAgfVxyXG4gICAgc2V0IGRhdGFTb3VyY2UoaXRlbTogYW55KSB7XHJcbiAgICAgICAgdGhpcy5fZGF0YVNvdXJjZSA9IGl0ZW07XHJcblxyXG4gICAgICAgIGlmIChpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMucGVyaW9kLnRleHQgPSBpdGVtLnBlcmlvZDtcclxuICAgICAgICAgICAgdGhpcy5nb29kc1ZhbHVlLnRleHQgPSBgJHsrdXRpbHMudG9EZWNpbWFsKGl0ZW0uZ29vZHNWYWx1ZSwyKX1gO1xyXG4gICAgICAgICAgICB0aGlzLmNvZGVMaXN0LnRleHQgPSBpdGVtLmNvZGVMaXN0Lmxlbmd0aCA+IDM4ID8gYCR7aXRlbS5jb2RlTGlzdC5zdWJzdHIoMCwzOCl9Li4uYCA6IGl0ZW0uY29kZUxpc3Q7XHJcblxyXG4gICAgICAgICAgICBpZiAoaXRlbS5zdGF0dXMgPT09ICcwJykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ub1ByaXplLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ub1ByaXplLnRleHQgPSAn5pyq5byA5aWWJztcclxuICAgICAgICAgICAgICAgIHRoaXMub3BlblRpbWUudGV4dCA9ICctJztcclxuICAgICAgICAgICAgICAgIHRoaXMuaGl0Q29kZS50ZXh0ID0gJy0nO1xyXG4gICAgICAgICAgICB9ZWxzZSBpZihpdGVtLnN0YXR1cyA9PT0gJzEnKXtcclxuICAgICAgICAgICAgICAgIHRoaXMubm9Qcml6ZS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMubm9Qcml6ZS50ZXh0ID0gJ+W8gOWlluS4rSc7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9wZW5UaW1lLnRleHQgPSAnLSc7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhpdENvZGUudGV4dCA9ICctJztcclxuICAgICAgICAgICAgfWVsc2UgaWYoaXRlbS5zdGF0dXMgPT09ICcyJyAmJiAhaXRlbS5oaXQpe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ub1ByaXplLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ub1ByaXplLnRleHQgPSAn5pyq5Lit5aWWJztcclxuICAgICAgICAgICAgICAgIHRoaXMub3BlblRpbWUudGV4dCA9IHV0aWxzLmZvcm1hdERhdGVUaW1lKGl0ZW0ub3BlblRpbWUpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaXRDb2RlLnRleHQgPSBpdGVtLmhpdENvZGU7XHJcbiAgICAgICAgICAgIH1lbHNlIGlmKGl0ZW0uc3RhdHVzID09PSAnMicgJiYgaXRlbS5oaXQpe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wcml6ZS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMub3BlblRpbWUudGV4dCA9IHV0aWxzLmZvcm1hdERhdGVUaW1lKGl0ZW0ub3BlblRpbWUpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaXRDb2RlLnRleHQgPSBpdGVtLmhpdENvZGU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmF3YXJkLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hd2FyZC50ZXh0ID0gYCR7K3V0aWxzLnRvRGVjaW1hbChpdGVtLmF3YXJkLDIpfSBVU0RUYDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0ODo1MFxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0ODo1MFxyXG4gKiBAZGVzYyDotK3kubDpobXpnaLlj7fnoIHliJfooajohJrmnKxcclxuICovXHJcbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xyXG5pbXBvcnQgeyBUb2FzdCB9IGZyb20gXCIuLi92aWV3L1RvYXN0XCI7XHJcbmltcG9ydCB7IEdhbWVNb2RlbCB9IGZyb20gXCIuLi9qcy9HYW1lTW9kZWxcIjtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIG51bWJlckxpc3RET00gZXh0ZW5kcyB1aS50ZW1wbGF0ZS5udW1iZXJMaXN0RE9NVUkge1xyXG4gICAgcHJpdmF0ZSB1c2VySWQ6c3RyaW5nID0gJyc7XHJcblxyXG4gICAgY29uc3RydWN0b3IoKXtcclxuICAgICAgICBzdXBlcigpXHJcbiAgICAgICAgdGhpcy5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5jbGlja051bWJlcilcclxuICAgIH1cclxuICAgIHNldCBkYXRhU291cmNlKGl0ZW06IGFueSkge1xyXG4gICAgICAgIHRoaXMuX2RhdGFTb3VyY2UgPSBpdGVtO1xyXG4gICAgICAgIGlmIChpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29kZS50ZXh0ID0gaXRlbS5jb2RlO1xyXG4gICAgICAgICAgICB0aGlzLmJnSW1nLnNraW4gPSB0aGlzLnJldHVyblN0YXR1c0ltZyhpdGVtLmJ1eWVySWQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIG9uRW5hYmxlKCl7XHJcbiAgICAgICAgLy/ojrflj5bnlKjmiLfotYTkuqdcclxuICAgICAgICBjb25zdCB1c2VySW5mbzphbnkgPSBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS51c2VySW5mbztcclxuICAgICAgICB0aGlzLnVzZXJJZCA9IHVzZXJJbmZvLnVzZXJJZDtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIOmAieaLqeWPt+eggVxyXG4gICAgICogQHBhcmFtIGl0ZW0g5b2T5YmN5oyJ6ZKuXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgY2xpY2tOdW1iZXIoaXRlbTphbnkpOnZvaWQge1xyXG4gICAgICAgIGlmICgrdGhpcy5fZGF0YVNvdXJjZS5idXllcklkID4gMTApIHsgLy/nlKjmiLdpZOW/heWkp+S6jjEw77yM5L2c5Li65Yik5pat5L6d5o2uXHJcbiAgICAgICAgICAgIFRvYXN0LnNob3coJ+ivpeWPt+eggeW3suiiq+i0reS5sCcpXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9ZWxzZSBpZih0aGlzLl9kYXRhU291cmNlLmJ1eWVySWQgPT09ICcwJyl7XHJcbiAgICAgICAgICAgIHRoaXMuYmdJbWcuc2tpbiA9IHRoaXMucmV0dXJuU3RhdHVzSW1nKCcyJylcclxuICAgICAgICAgICAgdGhpcy5fZGF0YVNvdXJjZS5idXllcklkID0gJzInO1xyXG4gICAgICAgIH1lbHNlIGlmKHRoaXMuX2RhdGFTb3VyY2UuYnV5ZXJJZCA9PT0gJzInKXtcclxuICAgICAgICAgICAgdGhpcy5iZ0ltZy5za2luID0gdGhpcy5yZXR1cm5TdGF0dXNJbWcoJzAnKVxyXG4gICAgICAgICAgICB0aGlzLl9kYXRhU291cmNlLmJ1eWVySWQgPSAnMCc7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuZXZlbnQoXCJHZXRJdGVtXCIpO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIOagueaNrueKtuaAgei/lOWbnuWvueW6lOWbvueJh1xyXG4gICAgICogQHBhcmFtIGJ1eWVySWQgIDDvvJrlj6/pgIkgMu+8mumAieS4rSDlpKfkuo4xMDrkuI3lj6/pgIkgIOetieS6juiHquW3sXVzZXJJZO+8muW3sumAiVxyXG4gICAgICogXHJcbiAgICAqL1xyXG4gICAgcHJpdmF0ZSByZXR1cm5TdGF0dXNJbWcoYnV5ZXJJZDpzdHJpbmcpe1xyXG4gICAgICAgIGlmIChidXllcklkID09PSB0aGlzLnVzZXJJZCkge1xyXG4gICAgICAgICAgICByZXR1cm4gJ2NvbXAvaW1nX3lpeHVhbl9zZWxlY3QyMC5wbmcnXHJcbiAgICAgICAgfWVsc2UgaWYoK2J1eWVySWQgPiAxMCl7IC8v55So5oi3aWTlv4XlpKfkuo4xMO+8jOS9nOS4uuWIpOaWreS+neaNrlxyXG4gICAgICAgICAgICByZXR1cm4gJ2NvbXAvaW1nX25vX3NlbGVjdDIwLnBuZydcclxuICAgICAgICB9ZWxzZSBpZihidXllcklkID09PSAnMicpIHtcclxuICAgICAgICAgICAgcmV0dXJuICdjb21wL2ltZ19va19zZWxlY3QyMC5wbmcnXHJcbiAgICAgICAgfWVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gJ2NvbXAvaW1nX2tleHVhbl9zZWxlY3QyMC5wbmcnXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIFxyXG59IiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ5OjA4XHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ5OjA4XHJcbiAqIEBkZXNjIOW+gOacn+iusOW9leiEmuacrFxyXG4gKi9cclxuaW1wb3J0IHsgdWkgfSBmcm9tICcuLi91aS9sYXlhTWF4VUknXHJcbmltcG9ydCB1dGlscyBmcm9tICcuLi9qcy91dGlscyc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBwcmV2aW91c1JlY29yZCBleHRlbmRzIHVpLnRlbXBsYXRlLnByZXZpb3VzUmVjb3Jkc1VJIHtcclxuICAgIGNvbnN0cnVjdG9yKCl7XHJcbiAgICAgICAgc3VwZXIoKVxyXG4gICAgICAgIHRoaXMudHhIYXNoLm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLnNlZUhhc2gpXHJcbiAgICB9XHJcbiAgICBzZXQgZGF0YVNvdXJjZShpdGVtOiBhbnkpIHtcclxuICAgICAgICB0aGlzLl9kYXRhU291cmNlID0gaXRlbTtcclxuICAgICAgICBpZiAoaXRlbSkge1xyXG4gICAgICAgICAgICB0aGlzLnBlcmlvZC50ZXh0ID0gaXRlbS5wZXJpb2Q7XHJcbiAgICAgICAgICAgIHRoaXMuZ29vZHNOYW1lLnRleHQgPSBpdGVtLmdvb2RzTmFtZTtcclxuICAgICAgICAgICAgdGhpcy50eEhhc2gudGV4dCA9IGl0ZW0udHhIYXNoO1xyXG4gICAgICAgICAgICB0aGlzLmhpdENvZGUudGV4dCA9IGl0ZW0uaGl0Q29kZTtcclxuICAgICAgICAgICAgdGhpcy5vcGVuVGltZS50ZXh0ID0gdXRpbHMuZm9ybWF0RGF0ZVRpbWUoaXRlbS5vcGVuVGltZSk7XHJcbiAgICAgICAgICAgIHRoaXMuam9pbmVkTnVtLnRleHQgPSBpdGVtLmpvaW5lZE51bTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoq5p+l55yL5ZOI5biMICovXHJcbiAgICBzZWVIYXNoKCk6dm9pZCB7XHJcbiAgICAgICAgY29uc3QgZG9tYWluID0gZG9jdW1lbnQuZG9tYWluO1xyXG4gICAgICAgIGlmIChkb21haW4uaW5kZXhPZigndC1jZW50ZXInKSA+PSAwIHx8IGRvbWFpbiA9PT0gJ2xvY2FsaG9zdCcpIHtcclxuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBgaHR0cHM6Ly9yb3BzdGVuLmV0aGVyc2Nhbi5pby90eC8ke3RoaXMuX2RhdGFTb3VyY2UudHhIYXNofWA7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBgaHR0cHM6Ly9ldGhlcnNjYW4uaW8vdHgvJHt0aGlzLl9kYXRhU291cmNlLnR4SGFzaH1gO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgIH1cclxufSIsIlxyXG4vKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjIgMTE6NDA6NDJcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjIgMTE6NDA6NDJcclxuICogQGRlc2Mg54Gr566t5aSn5aWW5Y6G5Y+y6K6w5b2V6ISa5pysXHJcbiAqL1xyXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcclxuaW1wb3J0IHV0aWxzIGZyb20gXCIuLi9qcy91dGlsc1wiO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgcHJpSGlzdG9yeSBleHRlbmRzIHVpLnRlbXBsYXRlLnByaUhpc3RvcnlVSSB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpXHJcbiAgICB9XHJcbiAgICBzZXQgZGF0YVNvdXJjZShpdGVtOiBhbnkpIHtcclxuICAgICAgICBpZiAoaXRlbSkge1xyXG4gICAgICAgICAgICB0aGlzLnJhbmtOby50ZXh0ID0gaXRlbS5yYW5rIDwgMTAgPyBgMCR7aXRlbS5yYW5rfWAgOiBgJHtpdGVtLnJhbmt9YDtcclxuICAgICAgICAgICAgdGhpcy5uaWNrTmFtZS50ZXh0ID0gaXRlbS5uaWNrTmFtZTtcclxuICAgICAgICAgICAgdGhpcy5VSUQudGV4dCA9IGBVSUQ6ICR7aXRlbS51c2VySWR9YDtcclxuICAgICAgICAgICAgdGhpcy5Wb2x1bWUudGV4dCA9IGAke3V0aWxzLnRvRGVjaW1hbChpdGVtLmNvbnN1bSwyKX0gVVNEVGBcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0gXHJcbiIsIlxyXG4vKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjIgMTE6NDA6NDJcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjIgMTE6NDA6NDJcclxuICogQGRlc2Mg54Gr566t5aSn5aWW5o6S6KGM5qacXHJcbiAqL1xyXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcclxuaW1wb3J0IHV0aWxzIGZyb20gXCIuLi9qcy91dGlsc1wiO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgcHJpeExpc3QgZXh0ZW5kcyB1aS50ZW1wbGF0ZS5wcml4TGlzdFVJIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKClcclxuICAgIH1cclxuICAgIHNldCBkYXRhU291cmNlKGl0ZW06IGFueSkge1xyXG4gICAgICAgIGlmIChpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMubm8xLnZpc2libGUgPSBpdGVtLnJhbmsgPT09IDEgPyB0cnVlIDogZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMucmFua05vLnZpc2libGUgPSBpdGVtLnJhbmsgPT09IDEgPyBmYWxzZSA6IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMucmFua05vLnRleHQgPSBpdGVtLnJhbms7XHJcbiAgICAgICAgICAgIHRoaXMuYXZhdGFyLnNraW4gPSBpdGVtLmF2YXRhcjtcclxuICAgICAgICAgICAgdGhpcy5uaWNrTmFtZS50ZXh0ID0gaXRlbS5uaWNrTmFtZTtcclxuICAgICAgICAgICAgdGhpcy5VSUQudGV4dCA9IGBVSUQ6ICR7aXRlbS51c2VySWR9YDtcclxuICAgICAgICAgICAgdGhpcy50b2RheVZvbHVtZS50ZXh0ID0gYCR7dXRpbHMudG9EZWNpbWFsKGl0ZW0uY29uc3VtLDIpfSBVU0RUYFxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSBcclxuIiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ5OjIzXHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ5OjIzXHJcbiAqIEBkZXNjIOS6pOaYk+Wvhueggei+k+WFpeW8ueeql+iEmuacrFxyXG4gKi9cclxuaW1wb3J0IHsgdWkgfSBmcm9tICcuLi91aS9sYXlhTWF4VUknXHJcbmltcG9ydCBUaXBzRGlhTG9nIGZyb20gJy4vdGlwRGlhbG9nJztcclxuaW1wb3J0IHsgVG9hc3QgfSBmcm9tICcuLi92aWV3L1RvYXN0JztcclxuaW1wb3J0IEd1ZXNzaW5nIGZyb20gJy4uL3NjcmlwdC9HdWVzc2luZyc7XHJcbmltcG9ydCBhcGkgZnJvbSAnLi4vanMvYXBpJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIElwdFBzd0RvbSBleHRlbmRzIHVpLnRlbXBsYXRlLklucHV0UHdkRGlhbG9nVUkge1xyXG5cclxuICAgIHByaXZhdGUgcGVyaW9kOnN0cmluZyA9ICcnOy8v5pyf5Y+3XHJcbiAgICBwcml2YXRlIGNvZGVMaXN0OnN0cmluZyA9ICcnOy8v6LSt5Lmw5Y+356CBXHJcbiAgICBwcml2YXRlIGlzRW50ZXI6Ym9vbGVhbiA9IGZhbHNlOyAvL+WHveaVsOiKgua1gVxyXG4gICAgcHJpdmF0ZSBBbGxDb2RlTGlzdDphbnkgPSBbXTsvL+aJgOacieWPt+eggeWIl+ihqFxyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKClcclxuICAgIH1cclxuICAgIG9uRW5hYmxlKCl7XHJcbiAgICAgICAgdGhpcy5idG5DbG9zZS5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5jbG9zZUZ1bmMpXHJcbiAgICAgICAgdGhpcy5JcHRQc3cub24oTGF5YS5FdmVudC5GT0NVUyx0aGlzLHRoaXMub25Gb2N1cylcclxuICAgICAgICB0aGlzLklwdFBzdy5vbihMYXlhLkV2ZW50LkJMVVIsdGhpcyx0aGlzLm9uQkxVUilcclxuICAgICAgICB0aGlzLklwdFBzdy5vbihMYXlhLkV2ZW50LktFWV9VUCx0aGlzLHRoaXMub25DaGFuZ2UpXHJcbiAgICB9XHJcblxyXG4gICAgLyoq6I635Y+W5Lyg6YCS55qE5Y+C5pWwICovXHJcbiAgICBzZXREYXRhKGRhdGE6YW55KSB7XHJcbiAgICAgICAgdGhpcy5wZXJpb2QgPSBkYXRhLnBlcmlvZDtcclxuICAgICAgICB0aGlzLmNvZGVMaXN0ID0gZGF0YS5jb2RlTGlzdDtcclxuICAgICAgICB0aGlzLkFsbENvZGVMaXN0ID0gZGF0YS5BbGxDb2RlTGlzdDtcclxuICAgIH1cclxuXHJcbiAgICAvKirovpPlhaXlhoXlrrnmlLnlj5ggKi9cclxuICAgIHByaXZhdGUgb25DaGFuZ2UoKXtcclxuICAgICAgICBpZiAoIXRoaXMuaXNFbnRlciAmJiB0aGlzLklwdFBzdy50ZXh0Lmxlbmd0aCA9PT0gNikge1xyXG4gICAgICAgICAgICB0aGlzLnRyYWRlQnV5KClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoq6LSt5LmwICovXHJcbiAgICBwcml2YXRlIHRyYWRlQnV5KCl7XHJcbiAgICAgICAgdGhpcy5pc0VudGVyID0gdHJ1ZTtcclxuICAgICAgICBhcGkucG9zdFRyYWRlQnV5KHRoaXMucGVyaW9kLHRoaXMuY29kZUxpc3QsdGhpcy5JcHRQc3cudGV4dCkudGhlbigocmVzOmFueSk9PntcclxuICAgICAgICAgICAgdGhpcy5pc0VudGVyID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMuY2xvc2VGdW5jKCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmV2ZW50KFwicmVmcmVzaERhdGFcIik7Ly/liLfmlrDmlbDmja7liJfooahcclxuICAgICAgICAgICAgLy8g6LSt5Lmw5oiQ5Yqf5by55Ye65a+56K+d5qGGXHJcbiAgICAgICAgICAgIGxldCB0aXBzRGlhbG9nOlRpcHNEaWFMb2cgPSBuZXcgVGlwc0RpYUxvZygpXHJcbiAgICAgICAgICAgIHRpcHNEaWFsb2cucG9wdXAoKVxyXG4gICAgICAgICAgICB0aXBzRGlhbG9nLnNldERhdGEoe1xyXG4gICAgICAgICAgICAgICAgQWxsQ29kZUxpc3Q6dGhpcy5BbGxDb2RlTGlzdFxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pLmNhdGNoKChlcnI6YW55KT0+e1xyXG4gICAgICAgICAgICB0aGlzLmlzRW50ZXIgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5jbG9zZUZ1bmMoKTtcclxuXHJcbiAgICAgICAgICAgIFRvYXN0LnNob3coZXJyLm1lc3NhZ2UpXHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICAvKirlhbPpl63lr4bnoIHmoYYgKi9cclxuICAgIHByaXZhdGUgY2xvc2VGdW5jKCl7XHJcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xyXG4gICAgICAgIHRoaXMuSXB0UHN3LnRleHQgPSAnJztcclxuICAgIH1cclxuICAgIC8qKui+k+WFpeahhuiOt+W+l+eEpueCuSAqL1xyXG4gICAgcHJpdmF0ZSBvbkZvY3VzKCl7XHJcbiAgICAgICAgdGhpcy50b3AgPSAxNTA7XHJcbiAgICB9XHJcbiAgICAvKirovpPlhaXmoYbojrflvpfnhKbngrkgKi9cclxuICAgIHByaXZhdGUgb25CTFVSKCl7XHJcbiAgICAgICB0aGlzLnRvcCA9IDQ0MDtcclxuICAgIH1cclxufSIsIlxyXG4vKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjIgMTE6NDA6NDJcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjIgMTE6NDA6NDJcclxuICogQGRlc2Mg54Gr566t5aSn5aWW54Gr566t5ZCN5Y2VXHJcbiAqL1xyXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcclxuaW1wb3J0IHV0aWxzIGZyb20gXCIuLi9qcy91dGlsc1wiO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgcHJpeExpc3QgZXh0ZW5kcyB1aS50ZW1wbGF0ZS5yYW5raW5nTGlzdFVJIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKClcclxuICAgIH1cclxuICAgIHNldCBkYXRhU291cmNlKGl0ZW06IGFueSkge1xyXG4gICAgICAgIGlmIChpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmFua2luZy50ZXh0ID0gaXRlbS5yYW5rO1xyXG4gICAgICAgICAgICB0aGlzLm5pY2tOYW1lLnRleHQgPSBpdGVtLm5pY2tOYW1lLmxlbmd0aCA+IDQgPyBgJHtpdGVtLm5pY2tOYW1lLnN1YnN0cigwLDQpfS4uLmAgOiBpdGVtLm5pY2tOYW1lO1xyXG4gICAgICAgICAgICB0aGlzLnVpZC50ZXh0ID0gaXRlbS51c2VySWQ7XHJcbiAgICAgICAgICAgIHRoaXMuYW1vdW50LnRleHQgPSBpdGVtLmFtb3VudDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0gXHJcbiIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0yNyAxMDowNjoxOFxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yNyAxMDowNjoxOFxyXG4gKiBAZGVzYyDlhYXlgLzmj5DluIHlvLnlh7rohJrmnKxcclxuICovXHJcbmltcG9ydCB7IHVpIH0gZnJvbSAnLi4vdWkvbGF5YU1heFVJJ1xyXG4gXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJlY2hhcmdlRGlhbG9nIGV4dGVuZHMgdWkudGVtcGxhdGUucmVjaGFyZ2VEaWFsb2dVSSB7XHJcbiAgICBjb25zdHJ1Y3Rvcigpe1xyXG4gICAgICAgIHN1cGVyKClcclxuICAgIH1cclxuXHJcbiAgICBvbkVuYWJsZSgpe1xyXG4gICAgICAgIHRoaXMuYnRuX3F1aWNrUmVjaGFyZ2Uub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMucXVpY2tSZWNoYXJnZUZ1bmMpXHJcbiAgICAgICAgdGhpcy5idG5fd2l0aGRyYXcub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMud2l0aGRyYXdGdW5jKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKuW/q+aNt+WFheWAvCAqL1xyXG4gICAgcHJpdmF0ZSBxdWlja1JlY2hhcmdlRnVuYygpe1xyXG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gYGh0dHBzOi8vJHtkb2N1bWVudC5kb21haW59LyMvY2hhcmdlS3VhaUJpYFxyXG4gICAgfVxyXG4gICAgLyoqVVNEVOmSseWMheaPkOW4gSAqL1xyXG4gICAgd2l0aGRyYXdGdW5jKCl7XHJcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBgaHR0cHM6Ly8ke2RvY3VtZW50LmRvbWFpbn0vIy93YWxsZXRDaGFyZ2VgXHJcbiAgICB9XHJcbn1cclxuXHJcbiIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0yNiAxMToxMjowOVxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yNiAxMToxMjowOVxyXG4gKiBAZGVzYyDlhaXlm7TlkI3ljZXliJfooahcclxuICovXHJcbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3Mgc2hvcnRMaXN0Qm94IGV4dGVuZHMgdWkudGVtcGxhdGUuc2hvcnRMaXN0VUkge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoKVxyXG4gICAgfVxyXG4gICAgc2V0IGRhdGFTb3VyY2UoaXRlbTogYW55KSB7XHJcbiAgICAgICAgaWYgKGl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5udW1iZXIudGV4dCA9IGl0ZW0uc2hvcnRsaXN0ZWROdW1iZXIgPCAxMCA/IGAwJHtpdGVtLnNob3J0bGlzdGVkTnVtYmVyfWAgOiBpdGVtLnNob3J0bGlzdGVkTnVtYmVyO1xyXG4gICAgICAgICAgICB0aGlzLm5pY2tOYW1lLnRleHQgPSBpdGVtLm5pY2tOYW1lO1xyXG4gICAgICAgICAgICB0aGlzLnVzZXJJZC50ZXh0ID0gaXRlbS51c2VySWQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbiIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0NDowMlxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0NDowMlxyXG4gKiBAZGVzYyDotK3kubDmiJDlip/lkI7nmoTmj5DnpLrmoYbohJrmnKxcclxuICovXHJcbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xyXG5pbXBvcnQgeyBUYWJiYXIgfSBmcm9tIFwiLi4vdmlldy9UYWJiYXJcIjtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRpcHNEaWFMb2cgZXh0ZW5kcyB1aS50ZW1wbGF0ZS5UaXBzRGlhbG9nVUkge1xyXG4gICAgcHJpdmF0ZSBBbGxDb2RlTGlzdDpvYmplY3RbXSA9IFtdOy8v5Y+356CB5YiX6KGoXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpXHJcbiAgICB9XHJcbiAgICBvbkVuYWJsZSgpe1xyXG4gICAgICAgIHRoaXMuYnRuQ29udGludWUub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuY2xvc2VGdW5jKVxyXG4gICAgICAgIHRoaXMuYnRuVmlld1JlY29yZC5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy52aWV3UmVjb3JkRnVuYylcclxuICAgICAgICBcclxuICAgIH1cclxuXHJcbiAgICAvKirojrflj5bkvKDpgJLnmoTlj4LmlbAgKi9cclxuICAgIHNldERhdGEoZGF0YTphbnkpIHtcclxuICAgICAgICB0aGlzLkFsbENvZGVMaXN0ID0gZGF0YS5BbGxDb2RlTGlzdDtcclxuICAgIH1cclxuXHJcbiAgICAvKirlhbPpl63lr4bnoIHmoYYgKi9cclxuICAgIHByaXZhdGUgY2xvc2VGdW5jKCl7XHJcblxyXG4gICAgICAgIHRoaXMuY2xvc2UoKTtcclxuICAgICAgICAvLyDoi6Xlhajpg6jooqvotK3kubDvvIzliJnlm57liLDpppbpobXph43mlrDpgInmi6notK3kubDmnJ/lj7dcclxuICAgICAgICBsZXQgY291bnQ6bnVtYmVyID0gMDtcclxuICAgICAgICB0aGlzLkFsbENvZGVMaXN0LmZvckVhY2goKHY6YW55KSA9PiB7XHJcbiAgICAgICAgICAgIGlmICh2LmJ1eWVySWQgIT09ICcwJykge1xyXG4gICAgICAgICAgICAgICAgY291bnQgPSBjb3VudCArIDE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICBpZiAoY291bnQgPT09IHRoaXMuQWxsQ29kZUxpc3QubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIFRhYmJhci5nZXRJbnN0YW5jZSgpLm9wZW5TY2VuZSgnaG9tZS5zY2VuZScpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIOafpeeci+iusOW9lVxyXG4gICAgcHJpdmF0ZSB2aWV3UmVjb3JkRnVuYygpe1xyXG4gICAgICAgIHRoaXMuY2xvc2UoKTtcclxuICAgICAgICBUYWJiYXIuZ2V0SW5zdGFuY2UoKS5vcGVuU2NlbmUoJ3JlY29yZC5zY2VuZScpXHJcbiAgICB9XHJcbn0iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjEgMTY6MzI6MDFcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjEgMTY6MzI6MDFcclxuICogQGRlc2Mg6LWw5Yq/5YiX6KGo6ISa5pysXHJcbiAqL1xyXG5pbXBvcnQgeyB1aSB9IGZyb20gJy4uL3VpL2xheWFNYXhVSSdcclxuaW1wb3J0IHV0aWxzIGZyb20gJy4uL2pzL3V0aWxzJztcclxuaW1wb3J0IHsgVGFiYmFyIH0gZnJvbSAnLi4vdmlldy9UYWJiYXInO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgdHJlbmRMaXN0IGV4dGVuZHMgdWkudGVtcGxhdGUudHJlbmRMaXN0VUkge1xyXG4gICAgcHJpdmF0ZSBfaXRlbTphbnk7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpXHJcbiAgICAgICAgdGhpcy5idG5fYnV5Lm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLmJ0bkJ1eUZ1bmMpXHJcbiAgICB9XHJcbiAgICBzZXQgZGF0YVNvdXJjZShpdGVtOmFueSl7XHJcbiAgICAgICAgdGhpcy5faXRlbSA9IGl0ZW07XHJcbiAgICAgICAgaWYgKGl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5wZXJpb2QudGV4dCA9IGl0ZW0ucGVyaW9kO1xyXG4gICAgICAgICAgICB0aGlzLmhpdENvZGUudGV4dCA9IGl0ZW0uaGl0Q29kZTtcclxuICAgICAgICAgICAgdGhpcy5vZGRfZXZlbi50ZXh0ID0gaXRlbS5pcyA9PT0gMCA/ICctJyA6ICBpdGVtLmlzID09PSAxID8gJ+WlhycgOiAn5YG2JztcclxuICAgICAgICAgICAgdGhpcy5pc0JpZy50ZXh0ID0gaXRlbS5pcyA9PT0gMCA/ICctJyA6IGl0ZW0uaXNCaWcgPyAn5aSnJyA6ICflsI8nO1xyXG5cclxuICAgICAgICAgICAgaWYgKGl0ZW0uaXMgPT09IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYnRuX2J1eS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuaGl0Q29kZS52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgdGhpcy5idG5fYnV5LnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuaGl0Q29kZS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyDlpYflgbbmloflrZfpopzoibJcclxuICAgICAgICAgICAgaWYgKGl0ZW0uaXMgPT09IDEpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMub2RkX2V2ZW4uY29sb3IgPSAnI2YxNDg0OCc7XHJcbiAgICAgICAgICAgIH1lbHNlIGlmKGl0ZW0uaXMgPT09IDIpe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vZGRfZXZlbi5jb2xvciA9ICcjMjVmZmZkJztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyDlpKflsI/mloflrZfpopzoibJcclxuICAgICAgICAgICAgaWYgKCFpdGVtLmlzQmlnICYmIGl0ZW0uaXMgIT09IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaXNCaWcuY29sb3IgPSAnI2YxNDg0OCc7XHJcbiAgICAgICAgICAgIH1lbHNlIGlmKGl0ZW0uaXNCaWcgJiYgaXRlbS5pcyAhPT0gMCl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmlzQmlnLmNvbG9yID0gJyMyNWZmZmQnO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKueri+WNs+i0reS5sCAqL1xyXG4gICAgcHJpdmF0ZSBidG5CdXlGdW5jKCl7XHJcbiAgICAgICAgaWYgKHRoaXMuX2l0ZW0gIT09IG51bGwpIHtcclxuICAgICAgICAgICAgVGFiYmFyLmdldEluc3RhbmNlKCkub3BlblNjZW5lKCdndWVzc2luZy5zY2VuZScsdGhpcy5faXRlbS5nb29kc0lkKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0yNiAxMDoyMTozN1xyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yNiAxMDoyMTozN1xyXG4gKiBAZGVzYyDllpzku47lpKnpmY3kuK3lpZblkI3ljZXliJfooajohJrmnKxcclxuICovXHJcbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xyXG5pbXBvcnQgdXRpbHMgZnJvbSBcIi4uL2pzL3V0aWxzXCI7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBXaW5uaW5nTGlzdCBleHRlbmRzIHVpLnRlbXBsYXRlLndpbm5pbmdMaXN0VUkge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoKVxyXG4gICAgfVxyXG4gICAgc2V0IGRhdGFTb3VyY2UoaXRlbTogYW55KSB7XHJcbiAgICAgICAgaWYgKGl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5wZXJpb2QudGV4dCA9IGl0ZW0uYmVsb25nVGltZTtcclxuICAgICAgICAgICAgdGhpcy5kYXRlLnRleHQgPSB1dGlscy5mb3JtYXREYXRlVGltZShpdGVtLmJhbGFuY2VUaW1lKTtcclxuICAgICAgICAgICAgdGhpcy5uaWNrTmFtZS50ZXh0ID0gaXRlbS5uaWNrTmFtZTtcclxuICAgICAgICAgICAgdGhpcy5hbW91bnQudGV4dCA9IGAkeytpdGVtLm1vbmV5fSBVU0RUYDtcclxuICAgICAgICAgICAgdGhpcy5jb2RlLnRleHQgPSBpdGVtLmhpdE51bWJlcjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuIiwiLyoqVGhpcyBjbGFzcyBpcyBhdXRvbWF0aWNhbGx5IGdlbmVyYXRlZCBieSBMYXlhQWlySURFLCBwbGVhc2UgZG8gbm90IG1ha2UgYW55IG1vZGlmaWNhdGlvbnMuICovXG5pbXBvcnQgVmlldz1MYXlhLlZpZXc7XHJcbmltcG9ydCBEaWFsb2c9TGF5YS5EaWFsb2c7XHJcbmltcG9ydCBTY2VuZT1MYXlhLlNjZW5lO1xuZXhwb3J0IG1vZHVsZSB1aSB7XHJcbiAgICBleHBvcnQgY2xhc3MgYXNzaXN0YW50VUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyBidG5fdHJlbmQ6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgYnRuX3ByZWJ1eTpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBjYXRlVGFiTGlzdDpMYXlhLkxpc3Q7XG5cdFx0cHVibGljIGxpc3RUaXRsZTpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgdHJlbmRMaXN0OkxheWEuTGlzdDtcblx0XHRwdWJsaWMgcHJlYnV5OkxheWEuTGlzdDtcblx0XHRwdWJsaWMgbm9EYXRhOkxheWEuSW1hZ2U7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJhc3Npc3RhbnRcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIENhcmRVSSBleHRlbmRzIExheWEuVmlldyB7XHJcblx0XHRwdWJsaWMgYW5pMTpMYXlhLkZyYW1lQW5pbWF0aW9uO1xuXHRcdHB1YmxpYyBjYXJkSXRlbTpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBzY2VuZUltZzpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBnb29kc05hbWU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgcHJvZ3Jlc3M6TGF5YS5Qcm9ncmVzc0Jhcjtcblx0XHRwdWJsaWMgc29sZE51bV90b3RhbE51bTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBhd2FyZDpMYXlhLkxhYmVsO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwiQ2FyZFwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgZ3JhbmRQcml4VUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyBDb3VudERvd246TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgYm9udXM6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgYnRuX2hpc3Rvcnk6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIHJhbmtQcml6ZUhlbHA6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIGxpc3RCb3g6TGF5YS5QYW5lbDtcblx0XHRwdWJsaWMgYm94MTpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgYWxvbmUxOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIFByb3BvcnRpb24xOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHByaXhMaXN0MTpMYXlhLkxpc3Q7XG5cdFx0cHVibGljIGJveDI6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIGFsb25lMjpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBQcm9wb3J0aW9uMjpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBwcml4TGlzdDI6TGF5YS5MaXN0O1xuXHRcdHB1YmxpYyBib3gzOkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyBhbG9uZTM6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgUHJvcG9ydGlvbjM6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgcHJpeExpc3QzOkxheWEuTGlzdDtcblx0XHRwdWJsaWMgbm9EYXRhOkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIG15UmFua0JveDpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBteXJhbmtpbmc6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgYXZhdGFyOkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIG5pY2tOYW1lOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHVpZDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyB2b2x1bWVUaXRsZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyB2b2x1bWU6TGF5YS5MYWJlbDtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcImdyYW5kUHJpeFwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgZ3Vlc3NpbmdVSSBleHRlbmRzIExheWEuU2NlbmUge1xyXG5cdFx0cHVibGljIHByaWNlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGdvb2RzVmFsdWU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgcHJvZ3Jlc3NTcGVlZDpMYXlhLlByb2dyZXNzQmFyO1xuXHRcdHB1YmxpYyBzb2xkTnVtX3NvbGROdW06TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgcGVyaW9kOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIG51bWJlckxpc3Q6TGF5YS5MaXN0O1xuXHRcdHB1YmxpYyBlc3RpbWF0ZTpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgdG90YWw6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgYmFsYW5jZUJveDpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgYmFsYW5jZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBidG5fYnV5OkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIGJ0bl9zZWxlY3Q6TGF5YS5WaWV3O1xuXHRcdHB1YmxpYyByYW5kb21fb25lOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHJhbmRvbV9iZWZvcmU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgcmFuZG9tX2FmdGVyOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHJhbmRvbV9hbGw6TGF5YS5MYWJlbDtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcImd1ZXNzaW5nXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBob21lVUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyBwdXRfaW46TGF5YS5GcmFtZUFuaW1hdGlvbjtcblx0XHRwdWJsaWMgcm9ja2V0X3Nob3c6TGF5YS5GcmFtZUFuaW1hdGlvbjtcblx0XHRwdWJsaWMgZG9tX3Nob3c6TGF5YS5GcmFtZUFuaW1hdGlvbjtcblx0XHRwdWJsaWMgYmdfYW5pOkxheWEuRnJhbWVBbmltYXRpb247XG5cdFx0cHVibGljIGJnX2FuaTI6TGF5YS5GcmFtZUFuaW1hdGlvbjtcblx0XHRwdWJsaWMgYmdfYW5pbWF0aW9uOkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyBnb19jZW50ZXI6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIHR1aWNodTpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBBY2NvdW50Qm94OkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIGF2YXRhcjpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBuaWNrTmFtZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyByZWNoYXJnZUJveDpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBidG5SZWNoYXJnZTpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBteUFtb3VudDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBidXlIZWxwOkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyByb2NrZXJCb3g6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIHJvY2tldEFtb3VudDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBjb3VudERvd246TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIHJvY2tldENvdW50RG93bjpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBsaXN0OkxheWEuTGlzdDtcblx0XHRwdWJsaWMgcHV0aW46TGF5YS5JbWFnZTtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcImhvbWVcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIGxvYWRpbmdTY2VuZVVJIGV4dGVuZHMgTGF5YS5TY2VuZSB7XHJcblx0XHRwdWJsaWMgYW5pMTpMYXlhLkZyYW1lQW5pbWF0aW9uO1xuXHRcdHB1YmxpYyBsb2FkaW5nUHJvZ3Jlc3M6TGF5YS5Qcm9ncmVzc0Jhcjtcblx0XHRwdWJsaWMgcHJvZ3Jlc3M6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgcm9ja2V0bG9hZGluZzpMYXlhLkltYWdlO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwibG9hZGluZ1NjZW5lXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBwcmlIaXN0b3J5U2NlbmVVSSBleHRlbmRzIExheWEuU2NlbmUge1xyXG5cdFx0cHVibGljIHRvdGFsOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGxpc3RCb3g6TGF5YS5QYW5lbDtcblx0XHRwdWJsaWMgYm94MTpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgYWxvbmUxOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIFByb3BvcnRpb24xOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHByaXhMaXN0MTpMYXlhLkxpc3Q7XG5cdFx0cHVibGljIGJveDI6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIGFsb25lMjpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBQcm9wb3J0aW9uMjpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBwcml4TGlzdDI6TGF5YS5MaXN0O1xuXHRcdHB1YmxpYyBib3gzOkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyBhbG9uZTM6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgUHJvcG9ydGlvbjM6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgcHJpeExpc3QzOkxheWEuTGlzdDtcblx0XHRwdWJsaWMgbm9EYXRhOkxheWEuSW1hZ2U7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJwcmlIaXN0b3J5U2NlbmVcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIHJlY29yZFVJIGV4dGVuZHMgTGF5YS5TY2VuZSB7XHJcblx0XHRwdWJsaWMgY2FueXU6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgd2FuZ3FpOkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIGpvaW5MaXN0OkxheWEuTGlzdDtcblx0XHRwdWJsaWMgcHJldmlvb3VzTGlzdDpMYXlhLkxpc3Q7XG5cdFx0cHVibGljIG5vRGF0YTpMYXlhLkltYWdlO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwicmVjb3JkXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBzaG9ydExpc3RlZFVJIGV4dGVuZHMgTGF5YS5TY2VuZSB7XHJcblx0XHRwdWJsaWMgc2hvcnRMaXN0OkxheWEuTGlzdDtcblx0XHRwdWJsaWMgbm9EYXRhOkxheWEuSW1hZ2U7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJzaG9ydExpc3RlZFwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgVGFiYmFyVUkgZXh0ZW5kcyBMYXlhLlZpZXcge1xyXG5cdFx0cHVibGljIHRhYjpMYXlhLlRhYjtcblx0XHRwdWJsaWMgbm90aWNlOkxheWEuU3ByaXRlO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwiVGFiYmFyXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyB4Y3RqVUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyB4Y3RqX3NodW9taW5nOkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyBhbW91bnQ6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgdW5pdDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBjb3VudERvd246TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgYnRuX3Nob3J0bGlzdDpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyB3aW5uaW5nX2NvZGU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgd2lubmluZ0xpc3Q6TGF5YS5MaXN0O1xuXHRcdHB1YmxpYyBub0RhdGE6TGF5YS5JbWFnZTtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInhjdGpcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbmV4cG9ydCBtb2R1bGUgdWkudGVtcGxhdGUge1xyXG4gICAgZXhwb3J0IGNsYXNzIElucHV0UHdkRGlhbG9nVUkgZXh0ZW5kcyBMYXlhLkRpYWxvZyB7XHJcblx0XHRwdWJsaWMgdGl0bGU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgYnRuQ2xvc2U6TGF5YS5Cb3g7XG5cdFx0cHVibGljIElwdFBzdzpMYXlhLlRleHRJbnB1dDtcblx0XHRwdWJsaWMgZm9yZ2V0UGFzc3dvcmQ6TGF5YS5MYWJlbDtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInRlbXBsYXRlL0lucHV0UHdkRGlhbG9nXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBqb2luUmVjb3Jkc1VJIGV4dGVuZHMgTGF5YS5WaWV3IHtcclxuXHRcdHB1YmxpYyBwZXJpb2Q6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgbm9Qcml6ZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBwcml6ZTpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBnb29kc1ZhbHVlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIG9wZW5UaW1lOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGhpdENvZGU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgY29kZUxpc3Q6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgYXdhcmQ6TGF5YS5MYWJlbDtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInRlbXBsYXRlL2pvaW5SZWNvcmRzXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBudW1iZXJMaXN0RE9NVUkgZXh0ZW5kcyBMYXlhLlZpZXcge1xyXG5cdFx0cHVibGljIGJnSW1nOkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIGNvZGU6TGF5YS5MYWJlbDtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInRlbXBsYXRlL251bWJlckxpc3RET01cIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIHByZXZpb3VzUmVjb3Jkc1VJIGV4dGVuZHMgTGF5YS5WaWV3IHtcclxuXHRcdHB1YmxpYyBwZXJpb2Q6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgZ29vZHNOYW1lOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHR4SGFzaDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBoaXRDb2RlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIG9wZW5UaW1lOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGpvaW5lZE51bTpMYXlhLkxhYmVsO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwidGVtcGxhdGUvcHJldmlvdXNSZWNvcmRzXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBwcmlIaXN0b3J5VUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyByYW5rTm86TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgbmlja05hbWU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgVUlEOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIFZvbHVtZTpMYXlhLkxhYmVsO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwidGVtcGxhdGUvcHJpSGlzdG9yeVwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgcHJpeExpc3RVSSBleHRlbmRzIExheWEuU2NlbmUge1xyXG5cdFx0cHVibGljIG5vMTpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyByYW5rTm86TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgYXZhdGFyOkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIG5pY2tOYW1lOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIFVJRDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyB0b2RheVZvbHVtZVRpdGxlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHRvZGF5Vm9sdW1lOkxheWEuTGFiZWw7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJ0ZW1wbGF0ZS9wcml4TGlzdFwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgcmFua2luZ0xpc3RVSSBleHRlbmRzIExheWEuU2NlbmUge1xyXG5cdFx0cHVibGljIHJhbmtpbmc6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgbmlja05hbWU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgdWlkOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGFtb3VudDpMYXlhLkxhYmVsO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwidGVtcGxhdGUvcmFua2luZ0xpc3RcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIHJlY2hhcmdlRGlhbG9nVUkgZXh0ZW5kcyBMYXlhLkRpYWxvZyB7XHJcblx0XHRwdWJsaWMgYnRuX3F1aWNrUmVjaGFyZ2U6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIGJ0bl93aXRoZHJhdzpMYXlhLlNwcml0ZTtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInRlbXBsYXRlL3JlY2hhcmdlRGlhbG9nXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBzaG9ydExpc3RVSSBleHRlbmRzIExheWEuU2NlbmUge1xyXG5cdFx0cHVibGljIG51bWJlcjpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBuaWNrTmFtZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyB1c2VySWQ6TGF5YS5MYWJlbDtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInRlbXBsYXRlL3Nob3J0TGlzdFwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3Mgc2hvd1JvY2tldFVJIGV4dGVuZHMgTGF5YS5EaWFsb2cge1xyXG5cdFx0cHVibGljIGFuaTE6TGF5YS5GcmFtZUFuaW1hdGlvbjtcblx0XHRwdWJsaWMgYW5pMjpMYXlhLkZyYW1lQW5pbWF0aW9uO1xuXHRcdHB1YmxpYyBzaG93YW5pMTpMYXlhLkFuaW1hdGlvbjtcblx0XHRwdWJsaWMgc2hvd2FuaTI6TGF5YS5BbmltYXRpb247XG5cdFx0cHVibGljIGJ0bl9jbG9zZTpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgcmFua2luZzpMYXlhLkxpc3Q7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJ0ZW1wbGF0ZS9zaG93Um9ja2V0XCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBUaXBzRGlhbG9nVUkgZXh0ZW5kcyBMYXlhLkRpYWxvZyB7XHJcblx0XHRwdWJsaWMgdGl0bGU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgYnRuVmlld1JlY29yZDpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBidG5Db250aW51ZTpMYXlhLkltYWdlO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwidGVtcGxhdGUvVGlwc0RpYWxvZ1wiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgdHJlbmRMaXN0VUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyBwZXJpb2Q6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgaGl0Q29kZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBidG5fYnV5OkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIG9kZF9ldmVuOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGlzQmlnOkxheWEuTGFiZWw7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJ0ZW1wbGF0ZS90cmVuZExpc3RcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIHdpbm5pbmdMaXN0VUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyBwZXJpb2RCb3g6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIHBlcmlvZDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBkYXRlQm94OkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyBkYXRlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIG5hbWVCb3g6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIG5pY2tOYW1lOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGFtb3VudEJveDpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgYW1vdW50OkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGNvZGVCb3g6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIGNvZGU6TGF5YS5MYWJlbDtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInRlbXBsYXRlL3dpbm5pbmdMaXN0XCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyIiwiZXhwb3J0IGNvbnN0IExheWVyVHlwZSA9IHtcclxuICAgIExBWUVSX1NDRU5FOiBcIkxBWUVSX1NDRU5FXCIsXHJcbiAgICBMQVlFUl9VSTogXCJMQVlFUl9VSVwiLFxyXG4gICAgTEFZRVJfTVNHOiBcIkxBWUVSX01TR1wiXHJcbn1cclxuY29uc3QgbGF5ZXJNYXAgPSB7fTtcclxuXHJcbmV4cG9ydCBjbGFzcyBMYXllck1hbmFnZXIge1xyXG4gICAgc3RhdGljIGluaXRlZDogYm9vbGVhbjtcclxuICAgIHN0YXRpYyBpbml0KGxheWVyczogc3RyaW5nW10pIHtcclxuICAgICAgICBsYXllcnMuZm9yRWFjaCgobGF5ZXJOYW1lOiBzdHJpbmcpID0+IHtcclxuICAgICAgICAgICAgaWYgKGxheWVyTmFtZSA9PT0gTGF5ZXJUeXBlLkxBWUVSX1NDRU5FKSB7XHJcbiAgICAgICAgICAgICAgICBsYXllck1hcFtsYXllck5hbWVdID0gTGF5YS5TY2VuZS5yb290O1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbGF5ZXI6IExheWEuVUlDb21wb25lbnQgPSBsYXllck1hcFtsYXllck5hbWVdID0gbmV3IExheWEuVUlDb21wb25lbnQoKTtcclxuICAgICAgICAgICAgICAgIGxheWVyLmxlZnQgPSAwO1xyXG4gICAgICAgICAgICAgICAgbGF5ZXIucmlnaHQgPSAwO1xyXG4gICAgICAgICAgICAgICAgbGF5ZXIudG9wID0gMDtcclxuICAgICAgICAgICAgICAgIGxheWVyLmJvdHRvbSA9IDA7XHJcbiAgICAgICAgICAgICAgICBMYXlhLnN0YWdlLmFkZENoaWxkKGxheWVyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIC8vIExheWEuc3RhZ2Uub24oTGF5YS5FdmVudC5SRVNJWkUsIHRoaXMsIHRoaXMub25SZXNpemUpO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBhZGRUb0xheWVyKG5vZGU6IExheWEuTm9kZSwgbGF5ZXJOYW1lKTogQm9vbGVhbiB7XHJcbiAgICAgICAgTGF5ZXJNYW5hZ2VyLmNoZWNrSW5pdCgpO1xyXG4gICAgICAgIGlmICghbm9kZSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIGNvbnN0IGxheWVyID0gbGF5ZXJNYXBbbGF5ZXJOYW1lXTtcclxuICAgICAgICBpZiAoIWxheWVyKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgbGF5ZXIuYWRkQ2hpbGQobm9kZSk7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHJlbW92ZUZyb21MYXllcihub2RlOiBMYXlhLk5vZGUsIGxheWVyTmFtZSk6IEJvb2xlYW4ge1xyXG4gICAgICAgIExheWVyTWFuYWdlci5jaGVja0luaXQoKTtcclxuICAgICAgICBjb25zdCBsYXllcjogTGF5YS5VSUNvbXBvbmVudCA9IGxheWVyTWFwW2xheWVyTmFtZV07XHJcbiAgICAgICAgaWYgKGxheWVyKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJOb2RlOiBMYXlhLk5vZGUgPSBsYXllci5yZW1vdmVDaGlsZChub2RlKVxyXG4gICAgICAgICAgICBpZiAock5vZGUpIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGdldExheWVyKGxheWVyTmFtZSk6IExheWEuQ29tcG9uZW50IHtcclxuICAgICAgICByZXR1cm4gbGF5ZXJNYXBbbGF5ZXJOYW1lXTtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgY2hlY2tJbml0KCkge1xyXG4gICAgICAgIGlmIChMYXllck1hbmFnZXIuaW5pdGVkKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgTGF5ZXJNYW5hZ2VyLmluaXQoW1xyXG4gICAgICAgICAgICBMYXllclR5cGUuTEFZRVJfU0NFTkUsXHJcbiAgICAgICAgICAgIExheWVyVHlwZS5MQVlFUl9VSSxcclxuICAgICAgICAgICAgTGF5ZXJUeXBlLkxBWUVSX01TR1xyXG4gICAgICAgIF0pO1xyXG4gICAgICAgIExheWVyTWFuYWdlci5pbml0ZWQgPSB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc3RhdGljIG9uUmVzaXplKCk6IHZvaWQge1xyXG4gICAgICAgIGZvciAoY29uc3QgbGF5ZXJOYW1lIGluIGxheWVyTWFwKSB7XHJcbiAgICAgICAgICAgIGlmIChsYXllck5hbWUgIT09IExheWVyVHlwZS5MQVlFUl9TQ0VORSAmJiBsYXllck1hcC5oYXNPd25Qcm9wZXJ0eShsYXllck5hbWUpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBsYXllcjogTGF5YS5VSUNvbXBvbmVudCA9IGxheWVyTWFwW2xheWVyTmFtZV07XHJcbiAgICAgICAgICAgICAgICBsYXllci5zaXplKExheWEuc3RhZ2Uud2lkdGgsIExheWEuc3RhZ2UuaGVpZ2h0KTtcclxuICAgICAgICAgICAgICAgIGxheWVyLmV2ZW50KExheWEuRXZlbnQuUkVTSVpFKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbn0iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NTA6MTBcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NTA6MTBcclxuICogQGRlc2Mg5bqV6YOo5a+86IiqVGFiYmFy6ISa5pysXHJcbiAqL1xyXG5pbXBvcnQgeyB1aSB9IGZyb20gJy4uL3VpL2xheWFNYXhVSSdcclxuaW1wb3J0IHsgR2FtZU1vZGVsIH0gZnJvbSAnLi4vanMvR2FtZU1vZGVsJztcclxuXHJcbmNvbnN0IHRhYmJhckFycjpzdHJpbmdbXSA9IFsnaG9tZS5zY2VuZScsJ3JlY29yZC5zY2VuZScsJ2Fzc2lzdGFudC5zY2VuZSddIC8vdGFiYmFy55qE6aG16Z2iXHJcbmNvbnN0IHBhZ2VBcnI6c3RyaW5nW10gPSBbXHJcbiAgICAnZ3Vlc3Npbmcuc2NlbmUnLCdncmFuZFByaXguc2NlbmUnLFxyXG4gICAgJ3ByaUhpc3RvcnlTY2VuZS5zY2VuZScsJ3hjdGouc2NlbmUnLFxyXG4gICAgJ3Nob3J0TGlzdGVkLnNjZW5lJ1xyXG5dIC8v6Z2edGFiYmFy6aG16Z2iXHJcblxyXG5leHBvcnQgY2xhc3MgVGFiYmFyIGV4dGVuZHMgdWkuVGFiYmFyVUkge1xyXG4gICAgLyoq6aG16Z2i5Lyg6YCS55qE5Y+C5pWwICovXHJcbiAgICBwcml2YXRlIF9vcGVuU2NlbmVQYXJhbTogYW55O1xyXG4gICAgLyoq6YCJ5Lit55qEdGFiYmFyICovXHJcbiAgICBzdGF0aWMgX3RhYmJhcjpUYWJiYXI7XHJcbiAgICAvKirpobXpnaLmlbDnu4QgKi9cclxuICAgIHN0YXRpYyByZWFkb25seSBTQ0VORVM6c3RyaW5nW10gPSBbLi4udGFiYmFyQXJyLC4uLnBhZ2VBcnJdXHJcblxyXG4gICAgc3RhdGljIGdldEluc3RhbmNlKCk6VGFiYmFyIHtcclxuICAgICAgICBpZighdGhpcy5fdGFiYmFyKXtcclxuICAgICAgICAgICAgdGhpcy5fdGFiYmFyID0gbmV3IFRhYmJhcigpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzLl90YWJiYXI7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHNob3coKXtcclxuICAgICAgICBsZXQgdGFiSW5zOlRhYmJhciA9IHRoaXMuZ2V0SW5zdGFuY2UoKVxyXG4gICAgICAgIExheWEuc3RhZ2UuYWRkQ2hpbGQodGFiSW5zKVxyXG4gICAgfVxyXG4gICAgc3RhdGljIGhpZGUoKXtcclxuICAgICAgICBpZih0aGlzLl90YWJiYXIpe1xyXG4gICAgICAgICAgICB0aGlzLl90YWJiYXIucmVtb3ZlU2VsZigpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBvbkVuYWJsZSgpe1xyXG4gICAgICAgIEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLm9uKCdnZXROb3RpY2UnLHRoaXMsKHJlczphbnkpPT57XHJcbiAgICAgICAgICAgIGlmIChyZXMpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubm90aWNlLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIHRoaXMubm90aWNlLnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgLyoq6Z2edGFiYmFy6Lez6L2s6aG16Z2iLOWPr+aQuuW4puWPguaVsCAqL1xyXG4gICAgb3BlblNjZW5lKHNjZW5lOiBzdHJpbmcsIHBhcmFtPzogYW55KSB7XHJcbiAgICAgICAgdGhpcy5fb3BlblNjZW5lUGFyYW0gPSBwYXJhbTtcclxuICAgICAgICB0aGlzLnRhYi5zZWxlY3RlZEluZGV4ID0gVGFiYmFyLlNDRU5FUy5pbmRleE9mKHNjZW5lKTtcclxuICAgIH1cclxuXHJcbiAgICAvKirnm5Hop4Z0YWJiYXLmlLnlj5ggKi9cclxuICAgIGNyZWF0ZVZpZXcodmlldzphbnkpe1xyXG4gICAgICAgIHN1cGVyLmNyZWF0ZVZpZXcodmlldylcclxuICAgICAgICB0aGlzLnRhYi5vbihMYXlhLkV2ZW50LkNIQU5HRSx0aGlzLHRoaXMub25DbGlja1RhYik7XHJcbiAgICAgICAgLy8gdGhpcy5vbkNsaWNrVGFiKCk7XHJcbiAgICB9XHJcbiAgICBcclxuXHJcbiAgICAvKirngrnlh7t0YWJiYXLkuovku7YgKi9cclxuICAgIG9uQ2xpY2tUYWIoKSB7XHJcbiAgICAgICAgbGV0IHVzZXJJbmZvID0gT2JqZWN0LmtleXMoR2FtZU1vZGVsLmdldEluc3RhbmNlKCkudXNlckluZm8pO1xyXG4gICAgICAgIGxldCBzY2VuZTpzdHJpbmcgPSBUYWJiYXIuU0NFTkVTW3RoaXMudGFiLnNlbGVjdGVkSW5kZXhdO1xyXG4gICAgICAgIGlmICh1c2VySW5mby5sZW5ndGggPT09IDAgJiYgKHNjZW5lID09PSAncmVjb3JkLnNjZW5lJyB8fCBzY2VuZSA9PT0gJ2Fzc2lzdGFudC5zY2VuZScpKSB7XHJcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gYGh0dHBzOi8vJHtkb2N1bWVudC5kb21haW59LyMvc2lnbl9pbmBcclxuICAgICAgICB9ZWxzZSB7XHJcbiAgICAgICAgICAgIExheWEuU2NlbmUub3BlbihzY2VuZSwgdHJ1ZSwgdGhpcy5fb3BlblNjZW5lUGFyYW0pO1xyXG4gICAgICAgICAgICB0aGlzLl9vcGVuU2NlbmVQYXJhbSA9IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXMudGFiLml0ZW1zLmZvckVhY2goaXRlbT0+e1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGFiQnRuOiBMYXlhLkJ1dHRvbiA9IGl0ZW0gYXMgTGF5YS5CdXR0b247XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpbWdCdG46IExheWEuQnV0dG9uID0gdGFiQnRuLmdldENoaWxkQXQoMCkgYXMgTGF5YS5CdXR0b247XHJcbiAgICAgICAgICAgICAgICBpbWdCdG4uc2VsZWN0ZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgdGFiYmFyQXJyLmZvckVhY2goaXRlbT0+e1xyXG4gICAgICAgICAgICAgICAgaWYgKGl0ZW0gPT09IHNjZW5lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFiQnRuOiBMYXlhLkJ1dHRvbiA9IHRoaXMudGFiLnNlbGVjdGlvbiBhcyBMYXlhLkJ1dHRvbjtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbWdCdG46IExheWEuQnV0dG9uID0gdGFiQnRuLmdldENoaWxkQXQoMCkgYXMgTGF5YS5CdXR0b247XHJcbiAgICAgICAgICAgICAgICAgICAgaW1nQnRuLnNlbGVjdGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLy/lhbPpl63lsI/nuqLngrlcclxuICAgICAgICAgICAgaWYgKHNjZW5lID09PSAncmVjb3JkLnNjZW5lJykge1xyXG4gICAgICAgICAgICAgICAgR2FtZU1vZGVsLmdldEluc3RhbmNlKCkubm90aWNlRnVuYyhmYWxzZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsImltcG9ydCB7IExheWVyTWFuYWdlciwgTGF5ZXJUeXBlIH0gZnJvbSBcIi4vTGF5ZXJNYW5hZ2VyXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgVG9hc3QgZXh0ZW5kcyBMYXlhLlVJQ29tcG9uZW50IHtcclxuXHJcbiAgICBzdGF0aWMgTUlOX1dJRFRIOiBudW1iZXIgPSAyMDA7XHJcbiAgICBzdGF0aWMgTUFYX1dJRFRIOiBudW1iZXIgPSA1MDA7XHJcbiAgICBzdGF0aWMgVE9QOiBudW1iZXIgPSAyMztcclxuICAgIHN0YXRpYyBCT1RUT006IG51bWJlciA9IDIwO1xyXG4gICAgc3RhdGljIE1BUkdJTjogbnVtYmVyID0gMTU7XHJcbiAgICBzdGF0aWMgTUlOX0hFSUdIVDogbnVtYmVyID0gODA7XHJcbiAgICBzdGF0aWMgRk9OVF9TSVpFOiBudW1iZXIgPSAyNjtcclxuICAgIHN0YXRpYyBDT0xPUjogc3RyaW5nID0gXCIjZmZmZmZmXCI7XHJcbiAgICBzdGF0aWMgQkdfSU1HX1VSTDogc3RyaW5nID0gXCJjb21wL2ltZ190b2FzdF9iZy5wbmdcIjtcclxuICAgIHN0YXRpYyBEVVJBVElPTjogbnVtYmVyID0gMjUwMDtcclxuXHJcbiAgICBwcml2YXRlIHN0YXRpYyBpbnN0YW5jZTogVG9hc3Q7XHJcbiAgICBwcml2YXRlIHN0YXRpYyBzdG9yZVRleHRMaXN0OiBhbnlbXSA9IFtdO1xyXG5cclxuICAgIHN0YXRpYyBzaG93KHRleHQ6IHN0cmluZywgZHVyYXRpb246IG51bWJlciA9IFRvYXN0LkRVUkFUSU9OLCBjb3ZlckJlZm9yZTogYm9vbGVhbiA9IHRydWUpIHtcclxuICAgICAgICBpZiAoIVRvYXN0Lmluc3RhbmNlKSB7XHJcbiAgICAgICAgICAgIFRvYXN0Lmluc3RhbmNlID0gbmV3IFRvYXN0KCk7XHJcbiAgICAgICAgICAgIFRvYXN0Lmluc3RhbmNlLm9uKExheWEuRXZlbnQuQ0xPU0UsIFRvYXN0LCBUb2FzdC5vbkNsb3NlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGNvdmVyQmVmb3JlICYmIFRvYXN0Lmluc3RhbmNlLnBhcmVudCkge1xyXG4gICAgICAgICAgICBUb2FzdC5pbnN0YW5jZS5zZXRUZXh0KHRleHQpO1xyXG4gICAgICAgICAgICBUb2FzdC5pbnN0YW5jZS50aW1lci5vbmNlKGR1cmF0aW9uIHx8IFRvYXN0LkRVUkFUSU9OLCBUb2FzdC5pbnN0YW5jZSwgVG9hc3QuaW5zdGFuY2UuY2xvc2UsIG51bGwsIHRydWUpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoIVRvYXN0Lmluc3RhbmNlLnBhcmVudCkge1xyXG4gICAgICAgICAgICBUb2FzdC5kb1Nob3codGV4dCwgZHVyYXRpb24pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIFRvYXN0LnN0b3JlVGV4dExpc3QucHVzaCh7XHJcbiAgICAgICAgICAgICAgICB0ZXh0OiB0ZXh0LFxyXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IGR1cmF0aW9uXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcm90ZWN0ZWQgc3RhdGljIGRvU2hvdyh0ZXh0OiBzdHJpbmcsIGR1cmF0aW9uOiBudW1iZXIpIHtcclxuICAgICAgICBUb2FzdC5pbnN0YW5jZS5zZXRUZXh0KHRleHQpO1xyXG4gICAgICAgIExheWVyTWFuYWdlci5hZGRUb0xheWVyKFRvYXN0Lmluc3RhbmNlLCBMYXllclR5cGUuTEFZRVJfTVNHKTtcclxuICAgICAgICBUb2FzdC5pbnN0YW5jZS50aW1lci5vbmNlKGR1cmF0aW9uIHx8IFRvYXN0LkRVUkFUSU9OLCBUb2FzdC5pbnN0YW5jZSwgVG9hc3QuaW5zdGFuY2UuY2xvc2UsIG51bGwsIHRydWUpO1xyXG4gICAgfVxyXG5cclxuICAgIHByb3RlY3RlZCBzdGF0aWMgb25DbG9zZSgpIHtcclxuICAgICAgICBpZiAoVG9hc3Quc3RvcmVUZXh0TGlzdC5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIHZhciBkYXRhOiBhbnkgPSBUb2FzdC5zdG9yZVRleHRMaXN0LnNoaWZ0KCk7XHJcbiAgICAgICAgICAgIFRvYXN0LmRvU2hvdyhkYXRhLnRleHQsIGRhdGEuZHVyYXRpb24pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBiZzogTGF5YS5JbWFnZTtcclxuICAgIGxhYmVsOiBMYXlhLkxhYmVsO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0VGV4dCh0ZXh0OiBzdHJpbmcpIHtcclxuICAgICAgICB0aGlzLndpZHRoID0gVG9hc3QuTUFYX1dJRFRIO1xyXG4gICAgICAgIHRoaXMubGFiZWwud2lkdGggPSBOYU47XHJcbiAgICAgICAgdGhpcy5sYWJlbC5kYXRhU291cmNlID0gdGV4dDtcclxuICAgICAgICB0aGlzLm9uVGV4dENoYW5nZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGNsb3NlKCkge1xyXG4gICAgICAgIHRoaXMucmVtb3ZlU2VsZigpO1xyXG4gICAgICAgIHRoaXMuZXZlbnQoTGF5YS5FdmVudC5DTE9TRSk7XHJcbiAgICB9XHJcblxyXG4gICAgY3JlYXRlQ2hpbGRyZW4oKSB7XHJcbiAgICAgICAgdGhpcy5jZW50ZXJYID0gMDtcclxuICAgICAgICB0aGlzLmhlaWdodCA9IFRvYXN0Lk1BUkdJTiArIFRvYXN0Lk1BUkdJTjtcclxuXHJcbiAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICB0aGlzLmJnID0gbmV3IExheWEuSW1hZ2UoKTtcclxuICAgICAgICB0aGlzLmJnLnNraW4gPSBUb2FzdC5CR19JTUdfVVJMO1xyXG4gICAgICAgIHRoaXMuYmcuc2l6ZUdyaWQgPSBcIjI1LDI1LDI1LDI1XCI7XHJcbiAgICAgICAgdGhpcy5iZy5sZWZ0ID0gdGhpcy5iZy5yaWdodCA9IHRoaXMuYmcudG9wID0gdGhpcy5iZy5ib3R0b20gPSAwO1xyXG4gICAgICAgIHRoaXMuYWRkQ2hpbGQodGhpcy5iZyk7XHJcblxyXG4gICAgICAgIHRoaXMubGFiZWwgPSBuZXcgTGF5YS5MYWJlbCgpO1xyXG4gICAgICAgIHRoaXMubGFiZWwuY29sb3IgPSBUb2FzdC5DT0xPUjtcclxuICAgICAgICB0aGlzLmxhYmVsLmZvbnRTaXplID0gVG9hc3QuRk9OVF9TSVpFO1xyXG4gICAgICAgIHRoaXMubGFiZWwuYWxpZ24gPSBcImNlbnRlclwiO1xyXG4gICAgICAgIHRoaXMubGFiZWwueSA9IFRvYXN0LlRPUDtcclxuICAgICAgICB0aGlzLmxhYmVsLmNlbnRlclggPSAwO1xyXG4gICAgICAgIC8vIHRoaXMubGFiZWwuY2VudGVyWSA9IDA7XHJcbiAgICAgICAgLy8gdGhpcy5sYWJlbC5zdHJva2UgPSAxO1xyXG4gICAgICAgIC8vIHRoaXMubGFiZWwuc3Ryb2tlQ29sb3IgPSBcIiMwMDAwMDBcIjtcclxuICAgICAgICAvLyB0aGlzLmxhYmVsLnRvcCA9IFRvYXN0Lk1BUkdJTjtcclxuICAgICAgICAvLyB0aGlzLmxhYmVsLmJvdHRvbSA9IFRvYXN0Lk1BUkdJTjtcclxuICAgICAgICAvLyB0aGlzLmxhYmVsLmxlZnQgPSBUb2FzdC5NQVJHSU47XHJcbiAgICAgICAgLy8gdGhpcy5sYWJlbC5yaWdodCA9IFRvYXN0Lk1BUkdJTjtcclxuICAgICAgICB0aGlzLmxhYmVsLmxlYWRpbmcgPSAxNTtcclxuICAgICAgICB0aGlzLmxhYmVsLndvcmRXcmFwID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLmFkZENoaWxkKHRoaXMubGFiZWwpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICAvLyBwcm90ZWN0ZWQgaW5pdGlhbGl6ZSgpIHtcclxuICAgIC8vICAgICBzdXBlci5pbml0aWFsaXplKCk7XHJcbiAgICAvLyAgICAgdGhpcy5iaW5kVmlld0V2ZW50KHRoaXMubGFiZWwsIExheWEuRXZlbnQuQ0hBTkdFLCB0aGlzLm9uVGV4dENoYW5nZSk7XHJcbiAgICAvLyB9XHJcblxyXG4gICAgcHJvdGVjdGVkIG9uVGV4dENoYW5nZSgpIHtcclxuICAgICAgICBsZXQgdGV4dFc6IG51bWJlciA9IHRoaXMubGFiZWwud2lkdGg7XHJcbiAgICAgICAgY29uc3QgbWF4VGV4dFc6IG51bWJlciA9IFRvYXN0Lk1BWF9XSURUSCAtIFRvYXN0Lk1BUkdJTiAqIDI7XHJcbiAgICAgICAgLy8gY29uc3QgbWluVGV4dFc6IG51bWJlciA9IFRvYXN0Lk1JTl9XSURUSCAtIFRvYXN0Lk1BUkdJTiAqIDI7XHJcbiAgICAgICAgaWYgKHRleHRXID4gbWF4VGV4dFcpIHtcclxuICAgICAgICAgICAgdGhpcy5sYWJlbC53aWR0aCA9IG1heFRleHRXO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgdzogbnVtYmVyID0gdGhpcy5sYWJlbC53aWR0aCArIFRvYXN0Lk1BUkdJTiAqIDI7XHJcbiAgICAgICAgdyA9IE1hdGgubWluKHcsIFRvYXN0Lk1BWF9XSURUSCk7XHJcbiAgICAgICAgdyA9IE1hdGgubWF4KHcsIFRvYXN0Lk1JTl9XSURUSCk7XHJcbiAgICAgICAgdGhpcy53aWR0aCA9IHc7XHJcbiAgICAgICAgLy8gdGhpcy5oZWlnaHQgPSB0aGlzLmxhYmVsLmhlaWdodCArIFRvYXN0LlRPUCArIFRvYXN0LkJPVFRPTTtcclxuICAgICAgICB0aGlzLmhlaWdodCA9IHRoaXMubGFiZWwuaGVpZ2h0ICsgVG9hc3QuTUFSR0lOICogMjtcclxuICAgICAgICB0aGlzLnggPSAoTGF5YS5zdGFnZS53aWR0aCAtIHRoaXMud2lkdGgpID4+IDE7XHJcbiAgICAgICAgdGhpcy55ID0gKExheWEuc3RhZ2UuaGVpZ2h0IC0gdGhpcy5oZWlnaHQpID4+IDE7XHJcbiAgICB9XHJcblxyXG4gICAgcHJvdGVjdGVkIG9uQ29tcFJlc2l6ZSgpIHtcclxuICAgICAgICAvLyBpZiAodGhpcy5sYWJlbCkge1xyXG4gICAgICAgIC8vICAgICB0aGlzLmhlaWdodCA9IHRoaXMubGFiZWwuaGVpZ2h0ICsgTWVzc2FnZVRpcC5NQVJHSU4gKyBNZXNzYWdlVGlwLk1BUkdJTjtcclxuICAgICAgICAvLyB9XHJcbiAgICAgICAgaWYgKHRoaXMuYmcpIHtcclxuICAgICAgICAgICAgdGhpcy5iZy53aWR0aCA9IHRoaXMud2lkdGg7XHJcbiAgICAgICAgICAgIHRoaXMuYmcuaGVpZ2h0ID0gdGhpcy5oZWlnaHQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwiaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XHJcbmltcG9ydCB7IEdhbWVNb2RlbCB9IGZyb20gXCIuLi9qcy9HYW1lTW9kZWxcIjtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJvY2tldERpYWxvZyBleHRlbmRzIHVpLnRlbXBsYXRlLnNob3dSb2NrZXRVSSB7XHJcbiAgICBwcml2YXRlIHN0YXRpYyBfZGxnOiBSb2NrZXREaWFsb2c7XHJcblxyXG4gICAgc3RhdGljIGdldCBkbGcoKTogUm9ja2V0RGlhbG9nIHtcclxuICAgICAgICBpZiAoIXRoaXMuX2RsZykge1xyXG4gICAgICAgICAgICB0aGlzLl9kbGcgPSBuZXcgUm9ja2V0RGlhbG9nKCk7XHJcbiAgICAgICAgICAgIHRoaXMuX2RsZy54ID0gMDtcclxuICAgICAgICAgICAgdGhpcy5fZGxnLnkgPSAwO1xyXG4gICAgICAgICAgICB0aGlzLl9kbGcuaXNQb3B1cENlbnRlciA9IGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdGhpcy5fZGxnO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBvbkVuYWJsZSgpe1xyXG4gICAgICAgdGhpcy5idG5fY2xvc2Uub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuY2xvc2VEaWFsb2cpXHJcbiAgICAgICB0aGlzLmFuaTEucGxheSgwLGZhbHNlKVxyXG4gICAgICAgdGhpcy5hbmkyLnBsYXkoMCxmYWxzZSlcclxuICAgIH1cclxuICAgIHN0YXRpYyBpbml0KCl7XHJcbiAgICAgICAgR2FtZU1vZGVsLmdldEluc3RhbmNlKCkub24oJ2dldFJvY2tldFJhbmtpbmcnLHRoaXMsKHJlczphbnkpPT57XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlcyk7XHJcbiAgICAgICAgICAgIHRoaXMuZGxnLnBvcHVwKGZhbHNlLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIHRoaXMuZGxnLnJhbmtpbmcuYXJyYXkgPSByZXM7XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBjbG9zZURpYWxvZygpe1xyXG4gICAgICAgIHRoaXMuY2xvc2UoKVxyXG4gICAgfVxyXG5cclxufSIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XG5cbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iXX0=
