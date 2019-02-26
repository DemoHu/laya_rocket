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

},{"../core/createError":9,"./../core/settle":12,"./../helpers/btoa":16,"./../helpers/buildURL":17,"./../helpers/cookies":19,"./../helpers/isURLSameOrigin":21,"./../helpers/parseHeaders":23,"./../utils":25,"_process":60}],3:[function(require,module,exports){
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

},{"./adapters/http":2,"./adapters/xhr":2,"./helpers/normalizeHeaderName":22,"./utils":25,"_process":60}],15:[function(require,module,exports){
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
const previousRecords_1 = require("./template/previousRecords");
const Card_1 = require("./script/Card");
const grandPrix_1 = require("./script/grandPrix");
const PageNavScript_1 = require("./publicScript/PageNavScript");
const prixList_1 = require("./template/prixList");
const Guessing_1 = require("./script/Guessing");
const numberListDomScript_1 = require("./template/numberListDomScript");
const Home_1 = require("./script/Home");
const priHistoryScene_1 = require("./script/priHistoryScene");
const priHistory_1 = require("./template/priHistory");
const Record_1 = require("./script/Record");
const joinRecords_1 = require("./template/joinRecords");
const shortListed_1 = require("./script/shortListed");
const shortListedList_1 = require("./template/shortListedList");
const pswInput_1 = require("./template/pswInput");
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
        reg("template/previousRecords.ts", previousRecords_1.default);
        reg("script/Card.ts", Card_1.default);
        reg("script/grandPrix.ts", grandPrix_1.default);
        reg("publicScript/PageNavScript.ts", PageNavScript_1.default);
        reg("template/prixList.ts", prixList_1.default);
        reg("script/Guessing.ts", Guessing_1.default);
        reg("template/numberListDomScript.ts", numberListDomScript_1.default);
        reg("script/Home.ts", Home_1.default);
        reg("script/priHistoryScene.ts", priHistoryScene_1.default);
        reg("template/priHistory.ts", priHistory_1.default);
        reg("script/Record.ts", Record_1.default);
        reg("template/joinRecords.ts", joinRecords_1.default);
        reg("script/shortListed.ts", shortListed_1.default);
        reg("template/shortListedList.ts", shortListedList_1.default);
        reg("template/pswInput.ts", pswInput_1.default);
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
GameConfig.startScene = "home.scene";
GameConfig.sceneRoot = "";
GameConfig.debug = false;
GameConfig.stat = false;
GameConfig.physicsDebug = false;
GameConfig.exportSceneToJson = true;
exports.default = GameConfig;
GameConfig.init();
},{"./publicScript/PageNavScript":34,"./publicScript/PageScript":35,"./publicScript/Screen":36,"./script/Assistant":37,"./script/Card":38,"./script/Guessing":39,"./script/Home":40,"./script/Record":41,"./script/grandPrix":42,"./script/priHistoryScene":43,"./script/shortListed":44,"./script/winning":45,"./template/joinRecords":46,"./template/numberListDomScript":47,"./template/previousRecords":48,"./template/priHistory":49,"./template/prixList":50,"./template/pswInput":51,"./template/shortListedList":52,"./template/tipDialog":53,"./template/trendList":54,"./template/winningList":55}],28:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GameConfig_1 = require("./GameConfig");
class Main {
    constructor() {
        //根据IDE设置初始化引擎		
        if (window["Laya3D"])
            Laya3D.init(GameConfig_1.default.width, GameConfig_1.default.height);
        else
            Laya.init(GameConfig_1.default.width, GameConfig_1.default.height, Laya["WebGL"]);
        Laya["Physics"] && Laya["Physics"].enable();
        Laya["DebugPanel"] && Laya["DebugPanel"].enable();
        Laya.stage.scaleMode = GameConfig_1.default.scaleMode;
        Laya.stage.screenMode = GameConfig_1.default.screenMode;
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
        //激活资源版本控制，version.json由IDE发布功能自动生成，如果没有也不影响后续流程
        Laya.ResourceVersion.enable("version.json", Laya.Handler.create(this, this.onVersionLoaded), Laya.ResourceVersion.FILENAME_VERSION);
    }
    onVersionLoaded() {
        //激活大小图映射，加载小图的时候，如果发现小图在大图合集里面，则优先加载大图合集，而不是小图
        Laya.AtlasInfoManager.enable("fileconfig.json", Laya.Handler.create(this, this.onConfigLoaded));
    }
    onConfigLoaded() {
        //加载IDE指定的场景
        GameConfig_1.default.startScene && Laya.Scene.open(GameConfig_1.default.startScene);
    }
}
//激活启动类
new Main();
},{"./GameConfig":27}],29:[function(require,module,exports){
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
        this.rocketData = {}; //火箭数据
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
axios_1.default.defaults.baseURL = 'https://t-api.xyhj.io/v1/w/zh/';
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
        }
    }
    /**发送数据 */
    static sendWSPush(type, toggle = 1) {
        if (Socket.WS !== null && Socket.WS.readyState === 3) {
            Socket.WS.close();
            Socket.createSocket(); //重连
        }
        else {
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
            Socket.WS.send(JSON.stringify(obj));
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
},{"./GameModel":29}],33:[function(require,module,exports){
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
},{}],34:[function(require,module,exports){
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
},{"../view/Tabbar":58}],35:[function(require,module,exports){
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
},{"../view/Tabbar":58}],36:[function(require,module,exports){
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
},{}],37:[function(require,module,exports){
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
class Assistant extends layaMaxUI_1.ui.assistantUI {
    constructor() {
        super();
        this.cateListArr = [];
        this.selectGoodsType = '';
        this.tabType = 1;
        this.btn_trend.on(Laya.Event.CLICK, this, this.tabSwitch, [1]);
        this.btn_prebuy.on(Laya.Event.CLICK, this, this.tabSwitch, [2]);
        this.on(Laya.Event.RESIZE, this, this.onResize);
    }
    onEnable() {
        this.getGoodsCateList();
        this.cateSwitch();
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
    getGoodsTrend(goodsType) {
        api_1.default.getGoodsTrend(goodsType).then((res) => {
            this.trendList.array = res;
            this.trendList.visible = true;
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
        if (type === 2) {
            Toast_1.Toast.show('暂未开放，敬请期待');
        }
        // this.tabType = type;
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
                this.getGoodsTrend(this.selectGoodsType);
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
}
exports.default = Assistant;
},{"../js/api":30,"../ui/layaMaxUI":56,"../view/Toast":59}],38:[function(require,module,exports){
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
        Tabbar_1.Tabbar.getInstance().openScene('guessing.scene', this._dataSource.goodsId);
    }
}
exports.default = Card;
},{"../js/utils":33,"../ui/layaMaxUI":56,"../view/Tabbar":58}],39:[function(require,module,exports){
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
        if (this.getSelectNumber() <= 0) {
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
},{"../js/GameModel":29,"../js/api":30,"../js/socket":32,"../js/utils":33,"../template/pswInput":51,"../ui/layaMaxUI":56,"../view/Toast":59}],40:[function(require,module,exports){
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
const http_1 = require("../js/http");
const socket_1 = require("../js/socket");
class Home extends layaMaxUI_1.ui.homeUI {
    constructor() {
        super();
        this.btnRecharge.on(Laya.Event.CLICK, this, this.btnRechargeFunc);
        this.buyHelp.on(Laya.Event.CLICK, this, this.openBuyHelp);
        this.putin.on(Laya.Event.CLICK, this, this.putInFunc);
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
            this.getGoodsList();
        });
    }
    /**充值 */
    btnRechargeFunc() {
        Toast_1.Toast.show('点击充值');
    }
    /**空投 */
    putInFunc() {
        // Tabbar.getInstance().openScene('xctj.scene')
        Toast_1.Toast.show('暂未开放，敬请期待');
    }
    /**获取个人信息 */
    getUserInfo() {
        return new Promise((resolve, reject) => {
            http_1.post('/user/login', {
                orgId: 1,
                account: '18900000003'
            }).then((res) => {
                api_1.default.getUserInfo().then((res) => {
                    this.nickName.text = res.userInfo.nickName;
                    this.myAmount.text = `${utils_1.default.toDecimal(res.userInfo.money, 2)}`;
                    this.avatar.skin = res.userInfo.avatar;
                    // 保存用户信息
                    GameModel_1.GameModel.getInstance().setUserInfo(res.userInfo);
                    // 连接websocket
                    socket_1.Socket.createSocket();
                }).catch((err) => {
                    console.log(err.message);
                    // 获取信息失败更新信息
                    GameModel_1.GameModel.getInstance().setUserInfo({
                        userInfo: {}
                    });
                    // 连接websocket
                    socket_1.Socket.createSocket();
                });
            });
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
        window.location.href = 'https://m.xyhj.io/buyHelp.html';
    }
}
exports.default = Home;
},{"../js/GameModel":29,"../js/api":30,"../js/http":31,"../js/socket":32,"../js/utils":33,"../ui/layaMaxUI":56,"../view/Toast":59}],41:[function(require,module,exports){
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
class Record extends layaMaxUI_1.ui.recordUI {
    constructor() {
        super();
        this.canyu.on(Laya.Event.CLICK, this, this.tabSwitch, [1]);
        this.wangqi.on(Laya.Event.CLICK, this, this.tabSwitch, [2]);
        this.on(Laya.Event.RESIZE, this, this.onResize);
    }
    onEnable() {
        this.getMyOrders();
        this.getGoodsHistory();
    }
    /**获取参与记录 */
    getMyOrders(page) {
        api_1.default.getMyOrders(page).then((res) => {
            this.joinList.repeatY = res.length;
            this.joinList.array = res;
            this.joinList.visible = true;
        }).catch((err) => {
            this.noData.visible = true;
            console.log(err.message);
        });
    }
    /**获取往期记录 */
    getGoodsHistory(page) {
        api_1.default.getGoodsHistory(page).then((res) => {
            this.previoousList.repeatY = res.length;
            this.previoousList.array = res;
        }).catch((err) => {
            console.log(err.message);
        });
    }
    /**
     * 切换记录列表
     * @param type 1:参与记录  2：往期记录
     */
    tabSwitch(type) {
        if (type === 1) {
            this.canyu.skin = 'comp/guessing/img_tab_active.png';
            this.wangqi.skin = 'comp/guessing/img_tab.png';
            this.getMyOrders();
            if (this.joinList.array === null || this.joinList.array.length === 0) {
                this.noData.visible = true;
            }
            else {
                this.noData.visible = false;
                this.joinList.visible = true;
            }
            this.previoousList.scrollTo(0);
            this.previoousList.visible = false;
        }
        else {
            this.wangqi.skin = 'comp/guessing/img_tab_active.png';
            this.canyu.skin = 'comp/guessing/img_tab.png';
            this.getGoodsHistory();
            if (this.previoousList.array === null || this.previoousList.array.length === 0) {
                this.noData.visible = true;
            }
            else {
                this.noData.visible = false;
                this.previoousList.visible = true;
            }
            this.joinList.scrollTo(0);
            this.joinList.visible = false;
        }
    }
    /**监视屏幕大小变化 */
    onResize() {
        //列表高度适配 = 屏幕高度 - (banner + tabbar)
        this.joinList.height = this.height - 430;
        this.previoousList.height = this.height - 430;
    }
}
exports.default = Record;
},{"../js/api":30,"../ui/layaMaxUI":56}],42:[function(require,module,exports){
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
        // 监视火箭数据变动
        GameModel_1.GameModel.getInstance().on('getRocketData', this, (res) => {
            this.bonus.text = `${utils_1.default.toDecimal(res.potMoney, 2)}`;
            utils_1.default.countDown(res.countDown, ((time) => {
                this.CountDown.text = time;
            }));
        });
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
        window.location.href = 'https://m.xyhj.io/rankPrizeHelp.html';
    }
}
exports.default = grandPrix;
},{"../js/GameModel":29,"../js/api":30,"../js/utils":33,"../ui/layaMaxUI":56,"../view/Tabbar":58}],43:[function(require,module,exports){
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
}
exports.default = grandPrix;
},{"../js/api":30,"../js/utils":33,"../ui/layaMaxUI":56}],44:[function(require,module,exports){
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
},{"../js/api":30,"../ui/layaMaxUI":56}],45:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const layaMaxUI_1 = require("../ui/layaMaxUI");
const api_1 = require("../js/api");
const Tabbar_1 = require("../view/Tabbar");
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-26 10:20:15
 * @modify date 2019-02-26 10:20:15
 * @desc 喜从天降中奖名单
 */
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
},{"../js/api":30,"../ui/layaMaxUI":56,"../view/Tabbar":58}],46:[function(require,module,exports){
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
},{"../js/utils":33,"../ui/layaMaxUI":56}],47:[function(require,module,exports){
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
            return 'comp/guessing/img_yixuan_select20.png';
        }
        else if (+buyerId > 10) { //用户id必大于10，作为判断依据
            return 'comp/guessing/img_no_select20.png';
        }
        else if (buyerId === '2') {
            return 'comp/guessing/img_ok_select20.png';
        }
        else {
            return 'comp/guessing/img_kexuan_select20.png';
        }
    }
}
exports.default = numberListDOM;
},{"../js/GameModel":29,"../ui/layaMaxUI":56,"../view/Toast":59}],48:[function(require,module,exports){
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
            this.requestType.text = item.requestType;
            this.goodsName.text = item.goodsName;
            this.txHash.text = item.txHash;
            this.hitCode.text = item.hitCode;
            this.openTime.text = utils_1.default.formatDateTime(item.openTime);
            this.joinedNum.text = item.joinedNum;
        }
    }
    /**查看哈希 */
    seeHash() {
        // "https://ropsten.etherscan.io/tx/" : "https://etherscan.io/tx/"
        window.location.href = `https://ropsten.etherscan.io/tx/${this._dataSource.txHash}`;
    }
}
exports.default = previousRecord;
},{"../js/utils":33,"../ui/layaMaxUI":56}],49:[function(require,module,exports){
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
},{"../js/utils":33,"../ui/layaMaxUI":56}],50:[function(require,module,exports){
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
},{"../js/utils":33,"../ui/layaMaxUI":56}],51:[function(require,module,exports){
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
},{"../js/api":30,"../ui/layaMaxUI":56,"../view/Toast":59,"./tipDialog":53}],52:[function(require,module,exports){
"use strict";
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-26 11:12:09
 * @modify date 2019-02-26 11:12:09
 * @desc 入围名单列表
 */
Object.defineProperty(exports, "__esModule", { value: true });
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
},{"../ui/layaMaxUI":56}],53:[function(require,module,exports){
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
},{"../ui/layaMaxUI":56,"../view/Tabbar":58}],54:[function(require,module,exports){
"use strict";
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-21 16:32:01
 * @modify date 2019-02-21 16:32:01
 * @desc 走势列表脚本
 */
Object.defineProperty(exports, "__esModule", { value: true });
const layaMaxUI_1 = require("../ui/layaMaxUI");
const Tabbar_1 = require("../view/Tabbar");
class trendList extends layaMaxUI_1.ui.template.trendListUI {
    constructor() {
        super();
        this.btnBuy.on(Laya.Event.CLICK, this, this.btnBuyFunc);
    }
    set dataSource(item) {
        this._item = item;
        if (item) {
            this.period.text = item.period;
            this.hitCode.text = item.hitCode;
            this.odd_even.text = item.is === 0 ? '-' : item.is === 1 ? '奇' : '偶';
            this.isBig.text = item.is === 0 ? '-' : item.isBig ? '大' : '小';
            if (item.is === 0) {
                this.btnBuy.visible = true;
                this.hitCode.visible = false;
            }
            else {
                this.btnBuy.visible = false;
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
        console.log(this._item.period);
        Tabbar_1.Tabbar.getInstance().openScene('guessing.scene', this._item.goodsId);
    }
}
exports.default = trendList;
},{"../ui/layaMaxUI":56,"../view/Tabbar":58}],55:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const layaMaxUI_1 = require("../ui/layaMaxUI");
const utils_1 = require("../js/utils");
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-26 10:21:37
 * @modify date 2019-02-26 10:21:37
 * @desc 喜从天降中奖名单列表脚本
 */
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
},{"../js/utils":33,"../ui/layaMaxUI":56}],56:[function(require,module,exports){
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
        class shortListUI extends Laya.Scene {
            constructor() { super(); }
            createChildren() {
                super.createChildren();
                this.loadScene("template/shortList");
            }
        }
        template.shortListUI = shortListUI;
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
},{}],57:[function(require,module,exports){
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
},{}],58:[function(require,module,exports){
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
        let scene = Tabbar.SCENES[this.tab.selectedIndex];
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
/**页面数组 */
Tabbar.SCENES = [...tabbarArr, ...pageArr];
exports.Tabbar = Tabbar;
},{"../js/GameModel":29,"../ui/layaMaxUI":56}],59:[function(require,module,exports){
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
},{"./LayerManager":57}],60:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL0Rvd25sb2Fkcy9MYXlhQWlySURFL3Jlc291cmNlcy9hcHAvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIm5vZGVfbW9kdWxlcy9fYXhpb3NAMC4xOC4wQGF4aW9zL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL19heGlvc0AwLjE4LjBAYXhpb3MvbGliL2FkYXB0ZXJzL3hoci5qcyIsIm5vZGVfbW9kdWxlcy9fYXhpb3NAMC4xOC4wQGF4aW9zL2xpYi9heGlvcy5qcyIsIm5vZGVfbW9kdWxlcy9fYXhpb3NAMC4xOC4wQGF4aW9zL2xpYi9jYW5jZWwvQ2FuY2VsLmpzIiwibm9kZV9tb2R1bGVzL19heGlvc0AwLjE4LjBAYXhpb3MvbGliL2NhbmNlbC9DYW5jZWxUb2tlbi5qcyIsIm5vZGVfbW9kdWxlcy9fYXhpb3NAMC4xOC4wQGF4aW9zL2xpYi9jYW5jZWwvaXNDYW5jZWwuanMiLCJub2RlX21vZHVsZXMvX2F4aW9zQDAuMTguMEBheGlvcy9saWIvY29yZS9BeGlvcy5qcyIsIm5vZGVfbW9kdWxlcy9fYXhpb3NAMC4xOC4wQGF4aW9zL2xpYi9jb3JlL0ludGVyY2VwdG9yTWFuYWdlci5qcyIsIm5vZGVfbW9kdWxlcy9fYXhpb3NAMC4xOC4wQGF4aW9zL2xpYi9jb3JlL2NyZWF0ZUVycm9yLmpzIiwibm9kZV9tb2R1bGVzL19heGlvc0AwLjE4LjBAYXhpb3MvbGliL2NvcmUvZGlzcGF0Y2hSZXF1ZXN0LmpzIiwibm9kZV9tb2R1bGVzL19heGlvc0AwLjE4LjBAYXhpb3MvbGliL2NvcmUvZW5oYW5jZUVycm9yLmpzIiwibm9kZV9tb2R1bGVzL19heGlvc0AwLjE4LjBAYXhpb3MvbGliL2NvcmUvc2V0dGxlLmpzIiwibm9kZV9tb2R1bGVzL19heGlvc0AwLjE4LjBAYXhpb3MvbGliL2NvcmUvdHJhbnNmb3JtRGF0YS5qcyIsIm5vZGVfbW9kdWxlcy9fYXhpb3NAMC4xOC4wQGF4aW9zL2xpYi9kZWZhdWx0cy5qcyIsIm5vZGVfbW9kdWxlcy9fYXhpb3NAMC4xOC4wQGF4aW9zL2xpYi9oZWxwZXJzL2JpbmQuanMiLCJub2RlX21vZHVsZXMvX2F4aW9zQDAuMTguMEBheGlvcy9saWIvaGVscGVycy9idG9hLmpzIiwibm9kZV9tb2R1bGVzL19heGlvc0AwLjE4LjBAYXhpb3MvbGliL2hlbHBlcnMvYnVpbGRVUkwuanMiLCJub2RlX21vZHVsZXMvX2F4aW9zQDAuMTguMEBheGlvcy9saWIvaGVscGVycy9jb21iaW5lVVJMcy5qcyIsIm5vZGVfbW9kdWxlcy9fYXhpb3NAMC4xOC4wQGF4aW9zL2xpYi9oZWxwZXJzL2Nvb2tpZXMuanMiLCJub2RlX21vZHVsZXMvX2F4aW9zQDAuMTguMEBheGlvcy9saWIvaGVscGVycy9pc0Fic29sdXRlVVJMLmpzIiwibm9kZV9tb2R1bGVzL19heGlvc0AwLjE4LjBAYXhpb3MvbGliL2hlbHBlcnMvaXNVUkxTYW1lT3JpZ2luLmpzIiwibm9kZV9tb2R1bGVzL19heGlvc0AwLjE4LjBAYXhpb3MvbGliL2hlbHBlcnMvbm9ybWFsaXplSGVhZGVyTmFtZS5qcyIsIm5vZGVfbW9kdWxlcy9fYXhpb3NAMC4xOC4wQGF4aW9zL2xpYi9oZWxwZXJzL3BhcnNlSGVhZGVycy5qcyIsIm5vZGVfbW9kdWxlcy9fYXhpb3NAMC4xOC4wQGF4aW9zL2xpYi9oZWxwZXJzL3NwcmVhZC5qcyIsIm5vZGVfbW9kdWxlcy9fYXhpb3NAMC4xOC4wQGF4aW9zL2xpYi91dGlscy5qcyIsIm5vZGVfbW9kdWxlcy9faXMtYnVmZmVyQDEuMS42QGlzLWJ1ZmZlci9pbmRleC5qcyIsInNyYy9HYW1lQ29uZmlnLnRzIiwic3JjL01haW4udHMiLCJzcmMvanMvR2FtZU1vZGVsLnRzIiwic3JjL2pzL2FwaS50cyIsInNyYy9qcy9odHRwLnRzIiwic3JjL2pzL3NvY2tldC50cyIsInNyYy9qcy91dGlscy50cyIsInNyYy9wdWJsaWNTY3JpcHQvUGFnZU5hdlNjcmlwdC50cyIsInNyYy9wdWJsaWNTY3JpcHQvUGFnZVNjcmlwdC50cyIsInNyYy9wdWJsaWNTY3JpcHQvU2NyZWVuLnRzIiwic3JjL3NjcmlwdC9Bc3Npc3RhbnQudHMiLCJzcmMvc2NyaXB0L0NhcmQudHMiLCJzcmMvc2NyaXB0L0d1ZXNzaW5nLnRzIiwic3JjL3NjcmlwdC9Ib21lLnRzIiwic3JjL3NjcmlwdC9SZWNvcmQudHMiLCJzcmMvc2NyaXB0L2dyYW5kUHJpeC50cyIsInNyYy9zY3JpcHQvcHJpSGlzdG9yeVNjZW5lLnRzIiwic3JjL3NjcmlwdC9zaG9ydExpc3RlZC50cyIsInNyYy9zY3JpcHQvd2lubmluZy50cyIsInNyYy90ZW1wbGF0ZS9qb2luUmVjb3Jkcy50cyIsInNyYy90ZW1wbGF0ZS9udW1iZXJMaXN0RG9tU2NyaXB0LnRzIiwic3JjL3RlbXBsYXRlL3ByZXZpb3VzUmVjb3Jkcy50cyIsInNyYy90ZW1wbGF0ZS9wcmlIaXN0b3J5LnRzIiwic3JjL3RlbXBsYXRlL3ByaXhMaXN0LnRzIiwic3JjL3RlbXBsYXRlL3Bzd0lucHV0LnRzIiwic3JjL3RlbXBsYXRlL3Nob3J0TGlzdGVkTGlzdC50cyIsInNyYy90ZW1wbGF0ZS90aXBEaWFsb2cudHMiLCJzcmMvdGVtcGxhdGUvdHJlbmRMaXN0LnRzIiwic3JjL3RlbXBsYXRlL3dpbm5pbmdMaXN0LnRzIiwic3JjL3VpL2xheWFNYXhVSS50cyIsInNyYy92aWV3L0xheWVyTWFuYWdlci50cyIsInNyYy92aWV3L1RhYmJhci50cyIsInNyYy92aWV3L1RvYXN0LnRzIiwiLi4vLi4vRG93bmxvYWRzL0xheWFBaXJJREUvcmVzb3VyY2VzL2FwcC9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNWQTs7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNwTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNyQkEsZ0dBQWdHO0FBQ2hHLGtEQUEwQztBQUMxQywwREFBa0Q7QUFDbEQsa0RBQTBDO0FBQzFDLG9EQUE0QztBQUM1QyxnRUFBd0Q7QUFDeEQsd0NBQWdDO0FBQ2hDLGtEQUEwQztBQUMxQyxnRUFBd0Q7QUFDeEQsa0RBQTBDO0FBQzFDLGdEQUF3QztBQUN4Qyx3RUFBZ0U7QUFDaEUsd0NBQWdDO0FB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QUM7WUFBQyxFQUFFLEdBQUMsQ0FBQyxDQUFBO1NBQUM7UUFDMUQsSUFBRztZQUFDLEVBQUUsR0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtTQUFDO1FBQUEsT0FBTSxDQUFDLEVBQUM7WUFBQyxFQUFFLEdBQUMsQ0FBQyxDQUFBO1NBQUM7UUFDMUQsQ0FBQyxHQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDOUIsT0FBTyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtJQUM1QixDQUFDO0lBQ0QsVUFBVTtJQUNWLE1BQU0sQ0FBQyxJQUFJLEVBQUMsSUFBSTtRQUNaLElBQUksRUFBRSxFQUFDLEVBQUUsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDO1FBQ2QsSUFBRztZQUFDLEVBQUUsR0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtTQUFDO1FBQUEsT0FBTSxDQUFDLEVBQUM7WUFBQyxFQUFFLEdBQUMsQ0FBQyxDQUFBO1NBQUM7UUFDMUQsSUFBRztZQUFDLEVBQUUsR0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtTQUFDO1FBQUEsT0FBTSxDQUFDLEVBQUM7WUFBQyxFQUFFLEdBQUMsQ0FBQyxDQUFBO1NBQUM7UUFDMUQsQ0FBQyxHQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDL0IsQ0FBQyxHQUFDLENBQUMsRUFBRSxJQUFFLEVBQUUsQ0FBQyxDQUFBLENBQUMsQ0FBQSxFQUFFLENBQUEsQ0FBQyxDQUFBLEVBQUUsQ0FBQztRQUNqQixPQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLElBQUksR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUNELFVBQVU7SUFDVixNQUFNLENBQUMsSUFBSSxFQUFDLElBQUk7UUFDWixJQUFJLEVBQUUsR0FBQyxDQUFDLEVBQUMsRUFBRSxHQUFDLENBQUMsRUFBQyxFQUFFLEVBQUMsRUFBRSxDQUFDO1FBQ3BCLElBQUc7WUFBQyxFQUFFLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7U0FBQztRQUFBLE9BQU0sQ0FBQyxFQUFDLEdBQUU7UUFBQSxDQUFDO1FBQ3ZELElBQUc7WUFBQyxFQUFFLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7U0FBQztRQUFBLE9BQU0sQ0FBQyxFQUFDLEdBQUU7UUFBQSxDQUFDO1FBQ3ZELEVBQUUsR0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxFQUFFLEdBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUMsT0FBTyxDQUFDLEVBQUUsR0FBQyxFQUFFLENBQUMsR0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBQyxFQUFFLEdBQUMsRUFBRSxDQUFDLENBQUM7SUFDdEMsQ0FBQztJQUNELFVBQVU7SUFDVixNQUFNLENBQUMsSUFBSSxFQUFDLElBQUk7UUFDWixJQUFJLENB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Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsidmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCAoZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGV4dGVuZFN0YXRpY3MgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgfHxcclxuICAgICAgICAoeyBfX3Byb3RvX186IFtdIH0gaW5zdGFuY2VvZiBBcnJheSAmJiBmdW5jdGlvbiAoZCwgYikgeyBkLl9fcHJvdG9fXyA9IGI7IH0pIHx8XHJcbiAgICAgICAgZnVuY3Rpb24gKGQsIGIpIHsgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07IH07XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKGQsIGIpIHtcclxuICAgICAgICBleHRlbmRTdGF0aWNzKGQsIGIpO1xyXG4gICAgICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxyXG4gICAgICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcclxuICAgIH07XHJcbn0pKCk7XHJcbihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vbGliL2F4aW9zJyk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XG52YXIgc2V0dGxlID0gcmVxdWlyZSgnLi8uLi9jb3JlL3NldHRsZScpO1xudmFyIGJ1aWxkVVJMID0gcmVxdWlyZSgnLi8uLi9oZWxwZXJzL2J1aWxkVVJMJyk7XG52YXIgcGFyc2VIZWFkZXJzID0gcmVxdWlyZSgnLi8uLi9oZWxwZXJzL3BhcnNlSGVhZGVycycpO1xudmFyIGlzVVJMU2FtZU9yaWdpbiA9IHJlcXVpcmUoJy4vLi4vaGVscGVycy9pc1VSTFNhbWVPcmlnaW4nKTtcbnZhciBjcmVhdGVFcnJvciA9IHJlcXVpcmUoJy4uL2NvcmUvY3JlYXRlRXJyb3InKTtcbnZhciBidG9hID0gKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5idG9hICYmIHdpbmRvdy5idG9hLmJpbmQod2luZG93KSkgfHwgcmVxdWlyZSgnLi8uLi9oZWxwZXJzL2J0b2EnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB4aHJBZGFwdGVyKGNvbmZpZykge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gZGlzcGF0Y2hYaHJSZXF1ZXN0KHJlc29sdmUsIHJlamVjdCkge1xuICAgIHZhciByZXF1ZXN0RGF0YSA9IGNvbmZpZy5kYXRhO1xuICAgIHZhciByZXF1ZXN0SGVhZGVycyA9IGNvbmZpZy5oZWFkZXJzO1xuXG4gICAgaWYgKHV0aWxzLmlzRm9ybURhdGEocmVxdWVzdERhdGEpKSB7XG4gICAgICBkZWxldGUgcmVxdWVzdEhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddOyAvLyBMZXQgdGhlIGJyb3dzZXIgc2V0IGl0XG4gICAgfVxuXG4gICAgdmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICB2YXIgbG9hZEV2ZW50ID0gJ29ucmVhZHlzdGF0ZWNoYW5nZSc7XG4gICAgdmFyIHhEb21haW4gPSBmYWxzZTtcblxuICAgIC8vIEZvciBJRSA4LzkgQ09SUyBzdXBwb3J0XG4gICAgLy8gT25seSBzdXBwb3J0cyBQT1NUIGFuZCBHRVQgY2FsbHMgYW5kIGRvZXNuJ3QgcmV0dXJucyB0aGUgcmVzcG9uc2UgaGVhZGVycy5cbiAgICAvLyBET04nVCBkbyB0aGlzIGZvciB0ZXN0aW5nIGIvYyBYTUxIdHRwUmVxdWVzdCBpcyBtb2NrZWQsIG5vdCBYRG9tYWluUmVxdWVzdC5cbiAgICBpZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICd0ZXN0JyAmJlxuICAgICAgICB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgICB3aW5kb3cuWERvbWFpblJlcXVlc3QgJiYgISgnd2l0aENyZWRlbnRpYWxzJyBpbiByZXF1ZXN0KSAmJlxuICAgICAgICAhaXNVUkxTYW1lT3JpZ2luKGNvbmZpZy51cmwpKSB7XG4gICAgICByZXF1ZXN0ID0gbmV3IHdpbmRvdy5YRG9tYWluUmVxdWVzdCgpO1xuICAgICAgbG9hZEV2ZW50ID0gJ29ubG9hZCc7XG4gICAgICB4RG9tYWluID0gdHJ1ZTtcbiAgICAgIHJlcXVlc3Qub25wcm9ncmVzcyA9IGZ1bmN0aW9uIGhhbmRsZVByb2dyZXNzKCkge307XG4gICAgICByZXF1ZXN0Lm9udGltZW91dCA9IGZ1bmN0aW9uIGhhbmRsZVRpbWVvdXQoKSB7fTtcbiAgICB9XG5cbiAgICAvLyBIVFRQIGJhc2ljIGF1dGhlbnRpY2F0aW9uXG4gICAgaWYgKGNvbmZpZy5hdXRoKSB7XG4gICAgICB2YXIgdXNlcm5hbWUgPSBjb25maWcuYXV0aC51c2VybmFtZSB8fCAnJztcbiAgICAgIHZhciBwYXNzd29yZCA9IGNvbmZpZy5hdXRoLnBhc3N3b3JkIHx8ICcnO1xuICAgICAgcmVxdWVzdEhlYWRlcnMuQXV0aG9yaXphdGlvbiA9ICdCYXNpYyAnICsgYnRvYSh1c2VybmFtZSArICc6JyArIHBhc3N3b3JkKTtcbiAgICB9XG5cbiAgICByZXF1ZXN0Lm9wZW4oY29uZmlnLm1ldGhvZC50b1VwcGVyQ2FzZSgpLCBidWlsZFVSTChjb25maWcudXJsLCBjb25maWcucGFyYW1zLCBjb25maWcucGFyYW1zU2VyaWFsaXplciksIHRydWUpO1xuXG4gICAgLy8gU2V0IHRoZSByZXF1ZXN0IHRpbWVvdXQgaW4gTVNcbiAgICByZXF1ZXN0LnRpbWVvdXQgPSBjb25maWcudGltZW91dDtcblxuICAgIC8vIExpc3RlbiBmb3IgcmVhZHkgc3RhdGVcbiAgICByZXF1ZXN0W2xvYWRFdmVudF0gPSBmdW5jdGlvbiBoYW5kbGVMb2FkKCkge1xuICAgICAgaWYgKCFyZXF1ZXN0IHx8IChyZXF1ZXN0LnJlYWR5U3RhdGUgIT09IDQgJiYgIXhEb21haW4pKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gVGhlIHJlcXVlc3QgZXJyb3JlZCBvdXQgYW5kIHdlIGRpZG4ndCBnZXQgYSByZXNwb25zZSwgdGhpcyB3aWxsIGJlXG4gICAgICAvLyBoYW5kbGVkIGJ5IG9uZXJyb3IgaW5zdGVhZFxuICAgICAgLy8gV2l0aCBvbmUgZXhjZXB0aW9uOiByZXF1ZXN0IHRoYXQgdXNpbmcgZmlsZTogcHJvdG9jb2wsIG1vc3QgYnJvd3NlcnNcbiAgICAgIC8vIHdpbGwgcmV0dXJuIHN0YXR1cyBhcyAwIGV2ZW4gdGhvdWdoIGl0J3MgYSBzdWNjZXNzZnVsIHJlcXVlc3RcbiAgICAgIGlmIChyZXF1ZXN0LnN0YXR1cyA9PT0gMCAmJiAhKHJlcXVlc3QucmVzcG9uc2VVUkwgJiYgcmVxdWVzdC5yZXNwb25zZVVSTC5pbmRleE9mKCdmaWxlOicpID09PSAwKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIFByZXBhcmUgdGhlIHJlc3BvbnNlXG4gICAgICB2YXIgcmVzcG9uc2VIZWFkZXJzID0gJ2dldEFsbFJlc3BvbnNlSGVhZGVycycgaW4gcmVxdWVzdCA/IHBhcnNlSGVhZGVycyhyZXF1ZXN0LmdldEFsbFJlc3BvbnNlSGVhZGVycygpKSA6IG51bGw7XG4gICAgICB2YXIgcmVzcG9uc2VEYXRhID0gIWNvbmZpZy5yZXNwb25zZVR5cGUgfHwgY29uZmlnLnJlc3BvbnNlVHlwZSA9PT0gJ3RleHQnID8gcmVxdWVzdC5yZXNwb25zZVRleHQgOiByZXF1ZXN0LnJlc3BvbnNlO1xuICAgICAgdmFyIHJlc3BvbnNlID0ge1xuICAgICAgICBkYXRhOiByZXNwb25zZURhdGEsXG4gICAgICAgIC8vIElFIHNlbmRzIDEyMjMgaW5zdGVhZCBvZiAyMDQgKGh0dHBzOi8vZ2l0aHViLmNvbS9heGlvcy9heGlvcy9pc3N1ZXMvMjAxKVxuICAgICAgICBzdGF0dXM6IHJlcXVlc3Quc3RhdHVzID09PSAxMjIzID8gMjA0IDogcmVxdWVzdC5zdGF0dXMsXG4gICAgICAgIHN0YXR1c1RleHQ6IHJlcXVlc3Quc3RhdHVzID09PSAxMjIzID8gJ05vIENvbnRlbnQnIDogcmVxdWVzdC5zdGF0dXNUZXh0LFxuICAgICAgICBoZWFkZXJzOiByZXNwb25zZUhlYWRlcnMsXG4gICAgICAgIGNvbmZpZzogY29uZmlnLFxuICAgICAgICByZXF1ZXN0OiByZXF1ZXN0XG4gICAgICB9O1xuXG4gICAgICBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCByZXNwb25zZSk7XG5cbiAgICAgIC8vIENsZWFuIHVwIHJlcXVlc3RcbiAgICAgIHJlcXVlc3QgPSBudWxsO1xuICAgIH07XG5cbiAgICAvLyBIYW5kbGUgbG93IGxldmVsIG5ldHdvcmsgZXJyb3JzXG4gICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24gaGFuZGxlRXJyb3IoKSB7XG4gICAgICAvLyBSZWFsIGVycm9ycyBhcmUgaGlkZGVuIGZyb20gdXMgYnkgdGhlIGJyb3dzZXJcbiAgICAgIC8vIG9uZXJyb3Igc2hvdWxkIG9ubHkgZmlyZSBpZiBpdCdzIGEgbmV0d29yayBlcnJvclxuICAgICAgcmVqZWN0KGNyZWF0ZUVycm9yKCdOZXR3b3JrIEVycm9yJywgY29uZmlnLCBudWxsLCByZXF1ZXN0KSk7XG5cbiAgICAgIC8vIENsZWFuIHVwIHJlcXVlc3RcbiAgICAgIHJlcXVlc3QgPSBudWxsO1xuICAgIH07XG5cbiAgICAvLyBIYW5kbGUgdGltZW91dFxuICAgIHJlcXVlc3Qub250aW1lb3V0ID0gZnVuY3Rpb24gaGFuZGxlVGltZW91dCgpIHtcbiAgICAgIHJlamVjdChjcmVhdGVFcnJvcigndGltZW91dCBvZiAnICsgY29uZmlnLnRpbWVvdXQgKyAnbXMgZXhjZWVkZWQnLCBjb25maWcsICdFQ09OTkFCT1JURUQnLFxuICAgICAgICByZXF1ZXN0KSk7XG5cbiAgICAgIC8vIENsZWFuIHVwIHJlcXVlc3RcbiAgICAgIHJlcXVlc3QgPSBudWxsO1xuICAgIH07XG5cbiAgICAvLyBBZGQgeHNyZiBoZWFkZXJcbiAgICAvLyBUaGlzIGlzIG9ubHkgZG9uZSBpZiBydW5uaW5nIGluIGEgc3RhbmRhcmQgYnJvd3NlciBlbnZpcm9ubWVudC5cbiAgICAvLyBTcGVjaWZpY2FsbHkgbm90IGlmIHdlJ3JlIGluIGEgd2ViIHdvcmtlciwgb3IgcmVhY3QtbmF0aXZlLlxuICAgIGlmICh1dGlscy5pc1N0YW5kYXJkQnJvd3NlckVudigpKSB7XG4gICAgICB2YXIgY29va2llcyA9IHJlcXVpcmUoJy4vLi4vaGVscGVycy9jb29raWVzJyk7XG5cbiAgICAgIC8vIEFkZCB4c3JmIGhlYWRlclxuICAgICAgdmFyIHhzcmZWYWx1ZSA9IChjb25maWcud2l0aENyZWRlbnRpYWxzIHx8IGlzVVJMU2FtZU9yaWdpbihjb25maWcudXJsKSkgJiYgY29uZmlnLnhzcmZDb29raWVOYW1lID9cbiAgICAgICAgICBjb29raWVzLnJlYWQoY29uZmlnLnhzcmZDb29raWVOYW1lKSA6XG4gICAgICAgICAgdW5kZWZpbmVkO1xuXG4gICAgICBpZiAoeHNyZlZhbHVlKSB7XG4gICAgICAgIHJlcXVlc3RIZWFkZXJzW2NvbmZpZy54c3JmSGVhZGVyTmFtZV0gPSB4c3JmVmFsdWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWRkIGhlYWRlcnMgdG8gdGhlIHJlcXVlc3RcbiAgICBpZiAoJ3NldFJlcXVlc3RIZWFkZXInIGluIHJlcXVlc3QpIHtcbiAgICAgIHV0aWxzLmZvckVhY2gocmVxdWVzdEhlYWRlcnMsIGZ1bmN0aW9uIHNldFJlcXVlc3RIZWFkZXIodmFsLCBrZXkpIHtcbiAgICAgICAgaWYgKHR5cGVvZiByZXF1ZXN0RGF0YSA9PT0gJ3VuZGVmaW5lZCcgJiYga2V5LnRvTG93ZXJDYXNlKCkgPT09ICdjb250ZW50LXR5cGUnKSB7XG4gICAgICAgICAgLy8gUmVtb3ZlIENvbnRlbnQtVHlwZSBpZiBkYXRhIGlzIHVuZGVmaW5lZFxuICAgICAgICAgIGRlbGV0ZSByZXF1ZXN0SGVhZGVyc1trZXldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIE90aGVyd2lzZSBhZGQgaGVhZGVyIHRvIHRoZSByZXF1ZXN0XG4gICAgICAgICAgcmVxdWVzdC5zZXRSZXF1ZXN0SGVhZGVyKGtleSwgdmFsKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gQWRkIHdpdGhDcmVkZW50aWFscyB0byByZXF1ZXN0IGlmIG5lZWRlZFxuICAgIGlmIChjb25maWcud2l0aENyZWRlbnRpYWxzKSB7XG4gICAgICByZXF1ZXN0LndpdGhDcmVkZW50aWFscyA9IHRydWU7XG4gICAgfVxuXG4gICAgLy8gQWRkIHJlc3BvbnNlVHlwZSB0byByZXF1ZXN0IGlmIG5lZWRlZFxuICAgIGlmIChjb25maWcucmVzcG9uc2VUeXBlKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXF1ZXN0LnJlc3BvbnNlVHlwZSA9IGNvbmZpZy5yZXNwb25zZVR5cGU7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIEV4cGVjdGVkIERPTUV4Y2VwdGlvbiB0aHJvd24gYnkgYnJvd3NlcnMgbm90IGNvbXBhdGlibGUgWE1MSHR0cFJlcXVlc3QgTGV2ZWwgMi5cbiAgICAgICAgLy8gQnV0LCB0aGlzIGNhbiBiZSBzdXBwcmVzc2VkIGZvciAnanNvbicgdHlwZSBhcyBpdCBjYW4gYmUgcGFyc2VkIGJ5IGRlZmF1bHQgJ3RyYW5zZm9ybVJlc3BvbnNlJyBmdW5jdGlvbi5cbiAgICAgICAgaWYgKGNvbmZpZy5yZXNwb25zZVR5cGUgIT09ICdqc29uJykge1xuICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBIYW5kbGUgcHJvZ3Jlc3MgaWYgbmVlZGVkXG4gICAgaWYgKHR5cGVvZiBjb25maWcub25Eb3dubG9hZFByb2dyZXNzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXF1ZXN0LmFkZEV2ZW50TGlzdGVuZXIoJ3Byb2dyZXNzJywgY29uZmlnLm9uRG93bmxvYWRQcm9ncmVzcyk7XG4gICAgfVxuXG4gICAgLy8gTm90IGFsbCBicm93c2VycyBzdXBwb3J0IHVwbG9hZCBldmVudHNcbiAgICBpZiAodHlwZW9mIGNvbmZpZy5vblVwbG9hZFByb2dyZXNzID09PSAnZnVuY3Rpb24nICYmIHJlcXVlc3QudXBsb2FkKSB7XG4gICAgICByZXF1ZXN0LnVwbG9hZC5hZGRFdmVudExpc3RlbmVyKCdwcm9ncmVzcycsIGNvbmZpZy5vblVwbG9hZFByb2dyZXNzKTtcbiAgICB9XG5cbiAgICBpZiAoY29uZmlnLmNhbmNlbFRva2VuKSB7XG4gICAgICAvLyBIYW5kbGUgY2FuY2VsbGF0aW9uXG4gICAgICBjb25maWcuY2FuY2VsVG9rZW4ucHJvbWlzZS50aGVuKGZ1bmN0aW9uIG9uQ2FuY2VsZWQoY2FuY2VsKSB7XG4gICAgICAgIGlmICghcmVxdWVzdCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlcXVlc3QuYWJvcnQoKTtcbiAgICAgICAgcmVqZWN0KGNhbmNlbCk7XG4gICAgICAgIC8vIENsZWFuIHVwIHJlcXVlc3RcbiAgICAgICAgcmVxdWVzdCA9IG51bGw7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAocmVxdWVzdERhdGEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmVxdWVzdERhdGEgPSBudWxsO1xuICAgIH1cblxuICAgIC8vIFNlbmQgdGhlIHJlcXVlc3RcbiAgICByZXF1ZXN0LnNlbmQocmVxdWVzdERhdGEpO1xuICB9KTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBiaW5kID0gcmVxdWlyZSgnLi9oZWxwZXJzL2JpbmQnKTtcbnZhciBBeGlvcyA9IHJlcXVpcmUoJy4vY29yZS9BeGlvcycpO1xudmFyIGRlZmF1bHRzID0gcmVxdWlyZSgnLi9kZWZhdWx0cycpO1xuXG4vKipcbiAqIENyZWF0ZSBhbiBpbnN0YW5jZSBvZiBBeGlvc1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBkZWZhdWx0Q29uZmlnIFRoZSBkZWZhdWx0IGNvbmZpZyBmb3IgdGhlIGluc3RhbmNlXG4gKiBAcmV0dXJuIHtBeGlvc30gQSBuZXcgaW5zdGFuY2Ugb2YgQXhpb3NcbiAqL1xuZnVuY3Rpb24gY3JlYXRlSW5zdGFuY2UoZGVmYXVsdENvbmZpZykge1xuICB2YXIgY29udGV4dCA9IG5ldyBBeGlvcyhkZWZhdWx0Q29uZmlnKTtcbiAgdmFyIGluc3RhbmNlID0gYmluZChBeGlvcy5wcm90b3R5cGUucmVxdWVzdCwgY29udGV4dCk7XG5cbiAgLy8gQ29weSBheGlvcy5wcm90b3R5cGUgdG8gaW5zdGFuY2VcbiAgdXRpbHMuZXh0ZW5kKGluc3RhbmNlLCBBeGlvcy5wcm90b3R5cGUsIGNvbnRleHQpO1xuXG4gIC8vIENvcHkgY29udGV4dCB0byBpbnN0YW5jZVxuICB1dGlscy5leHRlbmQoaW5zdGFuY2UsIGNvbnRleHQpO1xuXG4gIHJldHVybiBpbnN0YW5jZTtcbn1cblxuLy8gQ3JlYXRlIHRoZSBkZWZhdWx0IGluc3RhbmNlIHRvIGJlIGV4cG9ydGVkXG52YXIgYXhpb3MgPSBjcmVhdGVJbnN0YW5jZShkZWZhdWx0cyk7XG5cbi8vIEV4cG9zZSBBeGlvcyBjbGFzcyB0byBhbGxvdyBjbGFzcyBpbmhlcml0YW5jZVxuYXhpb3MuQXhpb3MgPSBBeGlvcztcblxuLy8gRmFjdG9yeSBmb3IgY3JlYXRpbmcgbmV3IGluc3RhbmNlc1xuYXhpb3MuY3JlYXRlID0gZnVuY3Rpb24gY3JlYXRlKGluc3RhbmNlQ29uZmlnKSB7XG4gIHJldHVybiBjcmVhdGVJbnN0YW5jZSh1dGlscy5tZXJnZShkZWZhdWx0cywgaW5zdGFuY2VDb25maWcpKTtcbn07XG5cbi8vIEV4cG9zZSBDYW5jZWwgJiBDYW5jZWxUb2tlblxuYXhpb3MuQ2FuY2VsID0gcmVxdWlyZSgnLi9jYW5jZWwvQ2FuY2VsJyk7XG5heGlvcy5DYW5jZWxUb2tlbiA9IHJlcXVpcmUoJy4vY2FuY2VsL0NhbmNlbFRva2VuJyk7XG5heGlvcy5pc0NhbmNlbCA9IHJlcXVpcmUoJy4vY2FuY2VsL2lzQ2FuY2VsJyk7XG5cbi8vIEV4cG9zZSBhbGwvc3ByZWFkXG5heGlvcy5hbGwgPSBmdW5jdGlvbiBhbGwocHJvbWlzZXMpIHtcbiAgcmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKTtcbn07XG5heGlvcy5zcHJlYWQgPSByZXF1aXJlKCcuL2hlbHBlcnMvc3ByZWFkJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gYXhpb3M7XG5cbi8vIEFsbG93IHVzZSBvZiBkZWZhdWx0IGltcG9ydCBzeW50YXggaW4gVHlwZVNjcmlwdFxubW9kdWxlLmV4cG9ydHMuZGVmYXVsdCA9IGF4aW9zO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEEgYENhbmNlbGAgaXMgYW4gb2JqZWN0IHRoYXQgaXMgdGhyb3duIHdoZW4gYW4gb3BlcmF0aW9uIGlzIGNhbmNlbGVkLlxuICpcbiAqIEBjbGFzc1xuICogQHBhcmFtIHtzdHJpbmc9fSBtZXNzYWdlIFRoZSBtZXNzYWdlLlxuICovXG5mdW5jdGlvbiBDYW5jZWwobWVzc2FnZSkge1xuICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xufVxuXG5DYW5jZWwucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcoKSB7XG4gIHJldHVybiAnQ2FuY2VsJyArICh0aGlzLm1lc3NhZ2UgPyAnOiAnICsgdGhpcy5tZXNzYWdlIDogJycpO1xufTtcblxuQ2FuY2VsLnByb3RvdHlwZS5fX0NBTkNFTF9fID0gdHJ1ZTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYW5jZWw7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDYW5jZWwgPSByZXF1aXJlKCcuL0NhbmNlbCcpO1xuXG4vKipcbiAqIEEgYENhbmNlbFRva2VuYCBpcyBhbiBvYmplY3QgdGhhdCBjYW4gYmUgdXNlZCB0byByZXF1ZXN0IGNhbmNlbGxhdGlvbiBvZiBhbiBvcGVyYXRpb24uXG4gKlxuICogQGNsYXNzXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBleGVjdXRvciBUaGUgZXhlY3V0b3IgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIENhbmNlbFRva2VuKGV4ZWN1dG9yKSB7XG4gIGlmICh0eXBlb2YgZXhlY3V0b3IgIT09ICdmdW5jdGlvbicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdleGVjdXRvciBtdXN0IGJlIGEgZnVuY3Rpb24uJyk7XG4gIH1cblxuICB2YXIgcmVzb2x2ZVByb21pc2U7XG4gIHRoaXMucHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIHByb21pc2VFeGVjdXRvcihyZXNvbHZlKSB7XG4gICAgcmVzb2x2ZVByb21pc2UgPSByZXNvbHZlO1xuICB9KTtcblxuICB2YXIgdG9rZW4gPSB0aGlzO1xuICBleGVjdXRvcihmdW5jdGlvbiBjYW5jZWwobWVzc2FnZSkge1xuICAgIGlmICh0b2tlbi5yZWFzb24pIHtcbiAgICAgIC8vIENhbmNlbGxhdGlvbiBoYXMgYWxyZWFkeSBiZWVuIHJlcXVlc3RlZFxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRva2VuLnJlYXNvbiA9IG5ldyBDYW5jZWwobWVzc2FnZSk7XG4gICAgcmVzb2x2ZVByb21pc2UodG9rZW4ucmVhc29uKTtcbiAgfSk7XG59XG5cbi8qKlxuICogVGhyb3dzIGEgYENhbmNlbGAgaWYgY2FuY2VsbGF0aW9uIGhhcyBiZWVuIHJlcXVlc3RlZC5cbiAqL1xuQ2FuY2VsVG9rZW4ucHJvdG90eXBlLnRocm93SWZSZXF1ZXN0ZWQgPSBmdW5jdGlvbiB0aHJvd0lmUmVxdWVzdGVkKCkge1xuICBpZiAodGhpcy5yZWFzb24pIHtcbiAgICB0aHJvdyB0aGlzLnJlYXNvbjtcbiAgfVxufTtcblxuLyoqXG4gKiBSZXR1cm5zIGFuIG9iamVjdCB0aGF0IGNvbnRhaW5zIGEgbmV3IGBDYW5jZWxUb2tlbmAgYW5kIGEgZnVuY3Rpb24gdGhhdCwgd2hlbiBjYWxsZWQsXG4gKiBjYW5jZWxzIHRoZSBgQ2FuY2VsVG9rZW5gLlxuICovXG5DYW5jZWxUb2tlbi5zb3VyY2UgPSBmdW5jdGlvbiBzb3VyY2UoKSB7XG4gIHZhciBjYW5jZWw7XG4gIHZhciB0b2tlbiA9IG5ldyBDYW5jZWxUb2tlbihmdW5jdGlvbiBleGVjdXRvcihjKSB7XG4gICAgY2FuY2VsID0gYztcbiAgfSk7XG4gIHJldHVybiB7XG4gICAgdG9rZW46IHRva2VuLFxuICAgIGNhbmNlbDogY2FuY2VsXG4gIH07XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhbmNlbFRva2VuO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQ2FuY2VsKHZhbHVlKSB7XG4gIHJldHVybiAhISh2YWx1ZSAmJiB2YWx1ZS5fX0NBTkNFTF9fKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBkZWZhdWx0cyA9IHJlcXVpcmUoJy4vLi4vZGVmYXVsdHMnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcbnZhciBJbnRlcmNlcHRvck1hbmFnZXIgPSByZXF1aXJlKCcuL0ludGVyY2VwdG9yTWFuYWdlcicpO1xudmFyIGRpc3BhdGNoUmVxdWVzdCA9IHJlcXVpcmUoJy4vZGlzcGF0Y2hSZXF1ZXN0Jyk7XG5cbi8qKlxuICogQ3JlYXRlIGEgbmV3IGluc3RhbmNlIG9mIEF4aW9zXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGluc3RhbmNlQ29uZmlnIFRoZSBkZWZhdWx0IGNvbmZpZyBmb3IgdGhlIGluc3RhbmNlXG4gKi9cbmZ1bmN0aW9uIEF4aW9zKGluc3RhbmNlQ29uZmlnKSB7XG4gIHRoaXMuZGVmYXVsdHMgPSBpbnN0YW5jZUNvbmZpZztcbiAgdGhpcy5pbnRlcmNlcHRvcnMgPSB7XG4gICAgcmVxdWVzdDogbmV3IEludGVyY2VwdG9yTWFuYWdlcigpLFxuICAgIHJlc3BvbnNlOiBuZXcgSW50ZXJjZXB0b3JNYW5hZ2VyKClcbiAgfTtcbn1cblxuLyoqXG4gKiBEaXNwYXRjaCBhIHJlcXVlc3RcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIFRoZSBjb25maWcgc3BlY2lmaWMgZm9yIHRoaXMgcmVxdWVzdCAobWVyZ2VkIHdpdGggdGhpcy5kZWZhdWx0cylcbiAqL1xuQXhpb3MucHJvdG90eXBlLnJlcXVlc3QgPSBmdW5jdGlvbiByZXF1ZXN0KGNvbmZpZykge1xuICAvKmVzbGludCBuby1wYXJhbS1yZWFzc2lnbjowKi9cbiAgLy8gQWxsb3cgZm9yIGF4aW9zKCdleGFtcGxlL3VybCdbLCBjb25maWddKSBhIGxhIGZldGNoIEFQSVxuICBpZiAodHlwZW9mIGNvbmZpZyA9PT0gJ3N0cmluZycpIHtcbiAgICBjb25maWcgPSB1dGlscy5tZXJnZSh7XG4gICAgICB1cmw6IGFyZ3VtZW50c1swXVxuICAgIH0sIGFyZ3VtZW50c1sxXSk7XG4gIH1cblxuICBjb25maWcgPSB1dGlscy5tZXJnZShkZWZhdWx0cywge21ldGhvZDogJ2dldCd9LCB0aGlzLmRlZmF1bHRzLCBjb25maWcpO1xuICBjb25maWcubWV0aG9kID0gY29uZmlnLm1ldGhvZC50b0xvd2VyQ2FzZSgpO1xuXG4gIC8vIEhvb2sgdXAgaW50ZXJjZXB0b3JzIG1pZGRsZXdhcmVcbiAgdmFyIGNoYWluID0gW2Rpc3BhdGNoUmVxdWVzdCwgdW5kZWZpbmVkXTtcbiAgdmFyIHByb21pc2UgPSBQcm9taXNlLnJlc29sdmUoY29uZmlnKTtcblxuICB0aGlzLmludGVyY2VwdG9ycy5yZXF1ZXN0LmZvckVhY2goZnVuY3Rpb24gdW5zaGlmdFJlcXVlc3RJbnRlcmNlcHRvcnMoaW50ZXJjZXB0b3IpIHtcbiAgICBjaGFpbi51bnNoaWZ0KGludGVyY2VwdG9yLmZ1bGZpbGxlZCwgaW50ZXJjZXB0b3IucmVqZWN0ZWQpO1xuICB9KTtcblxuICB0aGlzLmludGVyY2VwdG9ycy5yZXNwb25zZS5mb3JFYWNoKGZ1bmN0aW9uIHB1c2hSZXNwb25zZUludGVyY2VwdG9ycyhpbnRlcmNlcHRvcikge1xuICAgIGNoYWluLnB1c2goaW50ZXJjZXB0b3IuZnVsZmlsbGVkLCBpbnRlcmNlcHRvci5yZWplY3RlZCk7XG4gIH0pO1xuXG4gIHdoaWxlIChjaGFpbi5sZW5ndGgpIHtcbiAgICBwcm9taXNlID0gcHJvbWlzZS50aGVuKGNoYWluLnNoaWZ0KCksIGNoYWluLnNoaWZ0KCkpO1xuICB9XG5cbiAgcmV0dXJuIHByb21pc2U7XG59O1xuXG4vLyBQcm92aWRlIGFsaWFzZXMgZm9yIHN1cHBvcnRlZCByZXF1ZXN0IG1ldGhvZHNcbnV0aWxzLmZvckVhY2goWydkZWxldGUnLCAnZ2V0JywgJ2hlYWQnLCAnb3B0aW9ucyddLCBmdW5jdGlvbiBmb3JFYWNoTWV0aG9kTm9EYXRhKG1ldGhvZCkge1xuICAvKmVzbGludCBmdW5jLW5hbWVzOjAqL1xuICBBeGlvcy5wcm90b3R5cGVbbWV0aG9kXSA9IGZ1bmN0aW9uKHVybCwgY29uZmlnKSB7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCh1dGlscy5tZXJnZShjb25maWcgfHwge30sIHtcbiAgICAgIG1ldGhvZDogbWV0aG9kLFxuICAgICAgdXJsOiB1cmxcbiAgICB9KSk7XG4gIH07XG59KTtcblxudXRpbHMuZm9yRWFjaChbJ3Bvc3QnLCAncHV0JywgJ3BhdGNoJ10sIGZ1bmN0aW9uIGZvckVhY2hNZXRob2RXaXRoRGF0YShtZXRob2QpIHtcbiAgLyplc2xpbnQgZnVuYy1uYW1lczowKi9cbiAgQXhpb3MucHJvdG90eXBlW21ldGhvZF0gPSBmdW5jdGlvbih1cmwsIGRhdGEsIGNvbmZpZykge1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QodXRpbHMubWVyZ2UoY29uZmlnIHx8IHt9LCB7XG4gICAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICAgIHVybDogdXJsLFxuICAgICAgZGF0YTogZGF0YVxuICAgIH0pKTtcbiAgfTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEF4aW9zO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XG5cbmZ1bmN0aW9uIEludGVyY2VwdG9yTWFuYWdlcigpIHtcbiAgdGhpcy5oYW5kbGVycyA9IFtdO1xufVxuXG4vKipcbiAqIEFkZCBhIG5ldyBpbnRlcmNlcHRvciB0byB0aGUgc3RhY2tcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdWxmaWxsZWQgVGhlIGZ1bmN0aW9uIHRvIGhhbmRsZSBgdGhlbmAgZm9yIGEgYFByb21pc2VgXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSByZWplY3RlZCBUaGUgZnVuY3Rpb24gdG8gaGFuZGxlIGByZWplY3RgIGZvciBhIGBQcm9taXNlYFxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gQW4gSUQgdXNlZCB0byByZW1vdmUgaW50ZXJjZXB0b3IgbGF0ZXJcbiAqL1xuSW50ZXJjZXB0b3JNYW5hZ2VyLnByb3RvdHlwZS51c2UgPSBmdW5jdGlvbiB1c2UoZnVsZmlsbGVkLCByZWplY3RlZCkge1xuICB0aGlzLmhhbmRsZXJzLnB1c2goe1xuICAgIGZ1bGZpbGxlZDogZnVsZmlsbGVkLFxuICAgIHJlamVjdGVkOiByZWplY3RlZFxuICB9KTtcbiAgcmV0dXJuIHRoaXMuaGFuZGxlcnMubGVuZ3RoIC0gMTtcbn07XG5cbi8qKlxuICogUmVtb3ZlIGFuIGludGVyY2VwdG9yIGZyb20gdGhlIHN0YWNrXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IGlkIFRoZSBJRCB0aGF0IHdhcyByZXR1cm5lZCBieSBgdXNlYFxuICovXG5JbnRlcmNlcHRvck1hbmFnZXIucHJvdG90eXBlLmVqZWN0ID0gZnVuY3Rpb24gZWplY3QoaWQpIHtcbiAgaWYgKHRoaXMuaGFuZGxlcnNbaWRdKSB7XG4gICAgdGhpcy5oYW5kbGVyc1tpZF0gPSBudWxsO1xuICB9XG59O1xuXG4vKipcbiAqIEl0ZXJhdGUgb3ZlciBhbGwgdGhlIHJlZ2lzdGVyZWQgaW50ZXJjZXB0b3JzXG4gKlxuICogVGhpcyBtZXRob2QgaXMgcGFydGljdWxhcmx5IHVzZWZ1bCBmb3Igc2tpcHBpbmcgb3ZlciBhbnlcbiAqIGludGVyY2VwdG9ycyB0aGF0IG1heSBoYXZlIGJlY29tZSBgbnVsbGAgY2FsbGluZyBgZWplY3RgLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIFRoZSBmdW5jdGlvbiB0byBjYWxsIGZvciBlYWNoIGludGVyY2VwdG9yXG4gKi9cbkludGVyY2VwdG9yTWFuYWdlci5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uIGZvckVhY2goZm4pIHtcbiAgdXRpbHMuZm9yRWFjaCh0aGlzLmhhbmRsZXJzLCBmdW5jdGlvbiBmb3JFYWNoSGFuZGxlcihoKSB7XG4gICAgaWYgKGggIT09IG51bGwpIHtcbiAgICAgIGZuKGgpO1xuICAgIH1cbiAgfSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEludGVyY2VwdG9yTWFuYWdlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGVuaGFuY2VFcnJvciA9IHJlcXVpcmUoJy4vZW5oYW5jZUVycm9yJyk7XG5cbi8qKlxuICogQ3JlYXRlIGFuIEVycm9yIHdpdGggdGhlIHNwZWNpZmllZCBtZXNzYWdlLCBjb25maWcsIGVycm9yIGNvZGUsIHJlcXVlc3QgYW5kIHJlc3BvbnNlLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIFRoZSBlcnJvciBtZXNzYWdlLlxuICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyBUaGUgY29uZmlnLlxuICogQHBhcmFtIHtzdHJpbmd9IFtjb2RlXSBUaGUgZXJyb3IgY29kZSAoZm9yIGV4YW1wbGUsICdFQ09OTkFCT1JURUQnKS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbcmVxdWVzdF0gVGhlIHJlcXVlc3QuXG4gKiBAcGFyYW0ge09iamVjdH0gW3Jlc3BvbnNlXSBUaGUgcmVzcG9uc2UuXG4gKiBAcmV0dXJucyB7RXJyb3J9IFRoZSBjcmVhdGVkIGVycm9yLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGNyZWF0ZUVycm9yKG1lc3NhZ2UsIGNvbmZpZywgY29kZSwgcmVxdWVzdCwgcmVzcG9uc2UpIHtcbiAgdmFyIGVycm9yID0gbmV3IEVycm9yKG1lc3NhZ2UpO1xuICByZXR1cm4gZW5oYW5jZUVycm9yKGVycm9yLCBjb25maWcsIGNvZGUsIHJlcXVlc3QsIHJlc3BvbnNlKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcbnZhciB0cmFuc2Zvcm1EYXRhID0gcmVxdWlyZSgnLi90cmFuc2Zvcm1EYXRhJyk7XG52YXIgaXNDYW5jZWwgPSByZXF1aXJlKCcuLi9jYW5jZWwvaXNDYW5jZWwnKTtcbnZhciBkZWZhdWx0cyA9IHJlcXVpcmUoJy4uL2RlZmF1bHRzJyk7XG52YXIgaXNBYnNvbHV0ZVVSTCA9IHJlcXVpcmUoJy4vLi4vaGVscGVycy9pc0Fic29sdXRlVVJMJyk7XG52YXIgY29tYmluZVVSTHMgPSByZXF1aXJlKCcuLy4uL2hlbHBlcnMvY29tYmluZVVSTHMnKTtcblxuLyoqXG4gKiBUaHJvd3MgYSBgQ2FuY2VsYCBpZiBjYW5jZWxsYXRpb24gaGFzIGJlZW4gcmVxdWVzdGVkLlxuICovXG5mdW5jdGlvbiB0aHJvd0lmQ2FuY2VsbGF0aW9uUmVxdWVzdGVkKGNvbmZpZykge1xuICBpZiAoY29uZmlnLmNhbmNlbFRva2VuKSB7XG4gICAgY29uZmlnLmNhbmNlbFRva2VuLnRocm93SWZSZXF1ZXN0ZWQoKTtcbiAgfVxufVxuXG4vKipcbiAqIERpc3BhdGNoIGEgcmVxdWVzdCB0byB0aGUgc2VydmVyIHVzaW5nIHRoZSBjb25maWd1cmVkIGFkYXB0ZXIuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyBUaGUgY29uZmlnIHRoYXQgaXMgdG8gYmUgdXNlZCBmb3IgdGhlIHJlcXVlc3RcbiAqIEByZXR1cm5zIHtQcm9taXNlfSBUaGUgUHJvbWlzZSB0byBiZSBmdWxmaWxsZWRcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBkaXNwYXRjaFJlcXVlc3QoY29uZmlnKSB7XG4gIHRocm93SWZDYW5jZWxsYXRpb25SZXF1ZXN0ZWQoY29uZmlnKTtcblxuICAvLyBTdXBwb3J0IGJhc2VVUkwgY29uZmlnXG4gIGlmIChjb25maWcuYmFzZVVSTCAmJiAhaXNBYnNvbHV0ZVVSTChjb25maWcudXJsKSkge1xuICAgIGNvbmZpZy51cmwgPSBjb21iaW5lVVJMcyhjb25maWcuYmFzZVVSTCwgY29uZmlnLnVybCk7XG4gIH1cblxuICAvLyBFbnN1cmUgaGVhZGVycyBleGlzdFxuICBjb25maWcuaGVhZGVycyA9IGNvbmZpZy5oZWFkZXJzIHx8IHt9O1xuXG4gIC8vIFRyYW5zZm9ybSByZXF1ZXN0IGRhdGFcbiAgY29uZmlnLmRhdGEgPSB0cmFuc2Zvcm1EYXRhKFxuICAgIGNvbmZpZy5kYXRhLFxuICAgIGNvbmZpZy5oZWFkZXJzLFxuICAgIGNvbmZpZy50cmFuc2Zvcm1SZXF1ZXN0XG4gICk7XG5cbiAgLy8gRmxhdHRlbiBoZWFkZXJzXG4gIGNvbmZpZy5oZWFkZXJzID0gdXRpbHMubWVyZ2UoXG4gICAgY29uZmlnLmhlYWRlcnMuY29tbW9uIHx8IHt9LFxuICAgIGNvbmZpZy5oZWFkZXJzW2NvbmZpZy5tZXRob2RdIHx8IHt9LFxuICAgIGNvbmZpZy5oZWFkZXJzIHx8IHt9XG4gICk7XG5cbiAgdXRpbHMuZm9yRWFjaChcbiAgICBbJ2RlbGV0ZScsICdnZXQnLCAnaGVhZCcsICdwb3N0JywgJ3B1dCcsICdwYXRjaCcsICdjb21tb24nXSxcbiAgICBmdW5jdGlvbiBjbGVhbkhlYWRlckNvbmZpZyhtZXRob2QpIHtcbiAgICAgIGRlbGV0ZSBjb25maWcuaGVhZGVyc1ttZXRob2RdO1xuICAgIH1cbiAgKTtcblxuICB2YXIgYWRhcHRlciA9IGNvbmZpZy5hZGFwdGVyIHx8IGRlZmF1bHRzLmFkYXB0ZXI7XG5cbiAgcmV0dXJuIGFkYXB0ZXIoY29uZmlnKS50aGVuKGZ1bmN0aW9uIG9uQWRhcHRlclJlc29sdXRpb24ocmVzcG9uc2UpIHtcbiAgICB0aHJvd0lmQ2FuY2VsbGF0aW9uUmVxdWVzdGVkKGNvbmZpZyk7XG5cbiAgICAvLyBUcmFuc2Zvcm0gcmVzcG9uc2UgZGF0YVxuICAgIHJlc3BvbnNlLmRhdGEgPSB0cmFuc2Zvcm1EYXRhKFxuICAgICAgcmVzcG9uc2UuZGF0YSxcbiAgICAgIHJlc3BvbnNlLmhlYWRlcnMsXG4gICAgICBjb25maWcudHJhbnNmb3JtUmVzcG9uc2VcbiAgICApO1xuXG4gICAgcmV0dXJuIHJlc3BvbnNlO1xuICB9LCBmdW5jdGlvbiBvbkFkYXB0ZXJSZWplY3Rpb24ocmVhc29uKSB7XG4gICAgaWYgKCFpc0NhbmNlbChyZWFzb24pKSB7XG4gICAgICB0aHJvd0lmQ2FuY2VsbGF0aW9uUmVxdWVzdGVkKGNvbmZpZyk7XG5cbiAgICAgIC8vIFRyYW5zZm9ybSByZXNwb25zZSBkYXRhXG4gICAgICBpZiAocmVhc29uICYmIHJlYXNvbi5yZXNwb25zZSkge1xuICAgICAgICByZWFzb24ucmVzcG9uc2UuZGF0YSA9IHRyYW5zZm9ybURhdGEoXG4gICAgICAgICAgcmVhc29uLnJlc3BvbnNlLmRhdGEsXG4gICAgICAgICAgcmVhc29uLnJlc3BvbnNlLmhlYWRlcnMsXG4gICAgICAgICAgY29uZmlnLnRyYW5zZm9ybVJlc3BvbnNlXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIFByb21pc2UucmVqZWN0KHJlYXNvbik7XG4gIH0pO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBVcGRhdGUgYW4gRXJyb3Igd2l0aCB0aGUgc3BlY2lmaWVkIGNvbmZpZywgZXJyb3IgY29kZSwgYW5kIHJlc3BvbnNlLlxuICpcbiAqIEBwYXJhbSB7RXJyb3J9IGVycm9yIFRoZSBlcnJvciB0byB1cGRhdGUuXG4gKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIFRoZSBjb25maWcuXG4gKiBAcGFyYW0ge3N0cmluZ30gW2NvZGVdIFRoZSBlcnJvciBjb2RlIChmb3IgZXhhbXBsZSwgJ0VDT05OQUJPUlRFRCcpLlxuICogQHBhcmFtIHtPYmplY3R9IFtyZXF1ZXN0XSBUaGUgcmVxdWVzdC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbcmVzcG9uc2VdIFRoZSByZXNwb25zZS5cbiAqIEByZXR1cm5zIHtFcnJvcn0gVGhlIGVycm9yLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGVuaGFuY2VFcnJvcihlcnJvciwgY29uZmlnLCBjb2RlLCByZXF1ZXN0LCByZXNwb25zZSkge1xuICBlcnJvci5jb25maWcgPSBjb25maWc7XG4gIGlmIChjb2RlKSB7XG4gICAgZXJyb3IuY29kZSA9IGNvZGU7XG4gIH1cbiAgZXJyb3IucmVxdWVzdCA9IHJlcXVlc3Q7XG4gIGVycm9yLnJlc3BvbnNlID0gcmVzcG9uc2U7XG4gIHJldHVybiBlcnJvcjtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBjcmVhdGVFcnJvciA9IHJlcXVpcmUoJy4vY3JlYXRlRXJyb3InKTtcblxuLyoqXG4gKiBSZXNvbHZlIG9yIHJlamVjdCBhIFByb21pc2UgYmFzZWQgb24gcmVzcG9uc2Ugc3RhdHVzLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHJlc29sdmUgQSBmdW5jdGlvbiB0aGF0IHJlc29sdmVzIHRoZSBwcm9taXNlLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gcmVqZWN0IEEgZnVuY3Rpb24gdGhhdCByZWplY3RzIHRoZSBwcm9taXNlLlxuICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIFRoZSByZXNwb25zZS5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCByZXNwb25zZSkge1xuICB2YXIgdmFsaWRhdGVTdGF0dXMgPSByZXNwb25zZS5jb25maWcudmFsaWRhdGVTdGF0dXM7XG4gIC8vIE5vdGU6IHN0YXR1cyBpcyBub3QgZXhwb3NlZCBieSBYRG9tYWluUmVxdWVzdFxuICBpZiAoIXJlc3BvbnNlLnN0YXR1cyB8fCAhdmFsaWRhdGVTdGF0dXMgfHwgdmFsaWRhdGVTdGF0dXMocmVzcG9uc2Uuc3RhdHVzKSkge1xuICAgIHJlc29sdmUocmVzcG9uc2UpO1xuICB9IGVsc2Uge1xuICAgIHJlamVjdChjcmVhdGVFcnJvcihcbiAgICAgICdSZXF1ZXN0IGZhaWxlZCB3aXRoIHN0YXR1cyBjb2RlICcgKyByZXNwb25zZS5zdGF0dXMsXG4gICAgICByZXNwb25zZS5jb25maWcsXG4gICAgICBudWxsLFxuICAgICAgcmVzcG9uc2UucmVxdWVzdCxcbiAgICAgIHJlc3BvbnNlXG4gICAgKSk7XG4gIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcblxuLyoqXG4gKiBUcmFuc2Zvcm0gdGhlIGRhdGEgZm9yIGEgcmVxdWVzdCBvciBhIHJlc3BvbnNlXG4gKlxuICogQHBhcmFtIHtPYmplY3R8U3RyaW5nfSBkYXRhIFRoZSBkYXRhIHRvIGJlIHRyYW5zZm9ybWVkXG4gKiBAcGFyYW0ge0FycmF5fSBoZWFkZXJzIFRoZSBoZWFkZXJzIGZvciB0aGUgcmVxdWVzdCBvciByZXNwb25zZVxuICogQHBhcmFtIHtBcnJheXxGdW5jdGlvbn0gZm5zIEEgc2luZ2xlIGZ1bmN0aW9uIG9yIEFycmF5IG9mIGZ1bmN0aW9uc1xuICogQHJldHVybnMgeyp9IFRoZSByZXN1bHRpbmcgdHJhbnNmb3JtZWQgZGF0YVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHRyYW5zZm9ybURhdGEoZGF0YSwgaGVhZGVycywgZm5zKSB7XG4gIC8qZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOjAqL1xuICB1dGlscy5mb3JFYWNoKGZucywgZnVuY3Rpb24gdHJhbnNmb3JtKGZuKSB7XG4gICAgZGF0YSA9IGZuKGRhdGEsIGhlYWRlcnMpO1xuICB9KTtcblxuICByZXR1cm4gZGF0YTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBub3JtYWxpemVIZWFkZXJOYW1lID0gcmVxdWlyZSgnLi9oZWxwZXJzL25vcm1hbGl6ZUhlYWRlck5hbWUnKTtcblxudmFyIERFRkFVTFRfQ09OVEVOVF9UWVBFID0ge1xuICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCdcbn07XG5cbmZ1bmN0aW9uIHNldENvbnRlbnRUeXBlSWZVbnNldChoZWFkZXJzLCB2YWx1ZSkge1xuICBpZiAoIXV0aWxzLmlzVW5kZWZpbmVkKGhlYWRlcnMpICYmIHV0aWxzLmlzVW5kZWZpbmVkKGhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddKSkge1xuICAgIGhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddID0gdmFsdWU7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0RGVmYXVsdEFkYXB0ZXIoKSB7XG4gIHZhciBhZGFwdGVyO1xuICBpZiAodHlwZW9mIFhNTEh0dHBSZXF1ZXN0ICE9PSAndW5kZWZpbmVkJykge1xuICAgIC8vIEZvciBicm93c2VycyB1c2UgWEhSIGFkYXB0ZXJcbiAgICBhZGFwdGVyID0gcmVxdWlyZSgnLi9hZGFwdGVycy94aHInKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgcHJvY2VzcyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAvLyBGb3Igbm9kZSB1c2UgSFRUUCBhZGFwdGVyXG4gICAgYWRhcHRlciA9IHJlcXVpcmUoJy4vYWRhcHRlcnMvaHR0cCcpO1xuICB9XG4gIHJldHVybiBhZGFwdGVyO1xufVxuXG52YXIgZGVmYXVsdHMgPSB7XG4gIGFkYXB0ZXI6IGdldERlZmF1bHRBZGFwdGVyKCksXG5cbiAgdHJhbnNmb3JtUmVxdWVzdDogW2Z1bmN0aW9uIHRyYW5zZm9ybVJlcXVlc3QoZGF0YSwgaGVhZGVycykge1xuICAgIG5vcm1hbGl6ZUhlYWRlck5hbWUoaGVhZGVycywgJ0NvbnRlbnQtVHlwZScpO1xuICAgIGlmICh1dGlscy5pc0Zvcm1EYXRhKGRhdGEpIHx8XG4gICAgICB1dGlscy5pc0FycmF5QnVmZmVyKGRhdGEpIHx8XG4gICAgICB1dGlscy5pc0J1ZmZlcihkYXRhKSB8fFxuICAgICAgdXRpbHMuaXNTdHJlYW0oZGF0YSkgfHxcbiAgICAgIHV0aWxzLmlzRmlsZShkYXRhKSB8fFxuICAgICAgdXRpbHMuaXNCbG9iKGRhdGEpXG4gICAgKSB7XG4gICAgICByZXR1cm4gZGF0YTtcbiAgICB9XG4gICAgaWYgKHV0aWxzLmlzQXJyYXlCdWZmZXJWaWV3KGRhdGEpKSB7XG4gICAgICByZXR1cm4gZGF0YS5idWZmZXI7XG4gICAgfVxuICAgIGlmICh1dGlscy5pc1VSTFNlYXJjaFBhcmFtcyhkYXRhKSkge1xuICAgICAgc2V0Q29udGVudFR5cGVJZlVuc2V0KGhlYWRlcnMsICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQ7Y2hhcnNldD11dGYtOCcpO1xuICAgICAgcmV0dXJuIGRhdGEudG9TdHJpbmcoKTtcbiAgICB9XG4gICAgaWYgKHV0aWxzLmlzT2JqZWN0KGRhdGEpKSB7XG4gICAgICBzZXRDb250ZW50VHlwZUlmVW5zZXQoaGVhZGVycywgJ2FwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtOCcpO1xuICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuICAgIH1cbiAgICByZXR1cm4gZGF0YTtcbiAgfV0sXG5cbiAgdHJhbnNmb3JtUmVzcG9uc2U6IFtmdW5jdGlvbiB0cmFuc2Zvcm1SZXNwb25zZShkYXRhKSB7XG4gICAgLyplc2xpbnQgbm8tcGFyYW0tcmVhc3NpZ246MCovXG4gICAgaWYgKHR5cGVvZiBkYXRhID09PSAnc3RyaW5nJykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgZGF0YSA9IEpTT04ucGFyc2UoZGF0YSk7XG4gICAgICB9IGNhdGNoIChlKSB7IC8qIElnbm9yZSAqLyB9XG4gICAgfVxuICAgIHJldHVybiBkYXRhO1xuICB9XSxcblxuICAvKipcbiAgICogQSB0aW1lb3V0IGluIG1pbGxpc2Vjb25kcyB0byBhYm9ydCBhIHJlcXVlc3QuIElmIHNldCB0byAwIChkZWZhdWx0KSBhXG4gICAqIHRpbWVvdXQgaXMgbm90IGNyZWF0ZWQuXG4gICAqL1xuICB0aW1lb3V0OiAwLFxuXG4gIHhzcmZDb29raWVOYW1lOiAnWFNSRi1UT0tFTicsXG4gIHhzcmZIZWFkZXJOYW1lOiAnWC1YU1JGLVRPS0VOJyxcblxuICBtYXhDb250ZW50TGVuZ3RoOiAtMSxcblxuICB2YWxpZGF0ZVN0YXR1czogZnVuY3Rpb24gdmFsaWRhdGVTdGF0dXMoc3RhdHVzKSB7XG4gICAgcmV0dXJuIHN0YXR1cyA+PSAyMDAgJiYgc3RhdHVzIDwgMzAwO1xuICB9XG59O1xuXG5kZWZhdWx0cy5oZWFkZXJzID0ge1xuICBjb21tb246IHtcbiAgICAnQWNjZXB0JzogJ2FwcGxpY2F0aW9uL2pzb24sIHRleHQvcGxhaW4sICovKidcbiAgfVxufTtcblxudXRpbHMuZm9yRWFjaChbJ2RlbGV0ZScsICdnZXQnLCAnaGVhZCddLCBmdW5jdGlvbiBmb3JFYWNoTWV0aG9kTm9EYXRhKG1ldGhvZCkge1xuICBkZWZhdWx0cy5oZWFkZXJzW21ldGhvZF0gPSB7fTtcbn0pO1xuXG51dGlscy5mb3JFYWNoKFsncG9zdCcsICdwdXQnLCAncGF0Y2gnXSwgZnVuY3Rpb24gZm9yRWFjaE1ldGhvZFdpdGhEYXRhKG1ldGhvZCkge1xuICBkZWZhdWx0cy5oZWFkZXJzW21ldGhvZF0gPSB1dGlscy5tZXJnZShERUZBVUxUX0NPTlRFTlRfVFlQRSk7XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBkZWZhdWx0cztcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBiaW5kKGZuLCB0aGlzQXJnKSB7XG4gIHJldHVybiBmdW5jdGlvbiB3cmFwKCkge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xuICAgICAgYXJnc1tpXSA9IGFyZ3VtZW50c1tpXTtcbiAgICB9XG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xuICB9O1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gYnRvYSBwb2x5ZmlsbCBmb3IgSUU8MTAgY291cnRlc3kgaHR0cHM6Ly9naXRodWIuY29tL2RhdmlkY2hhbWJlcnMvQmFzZTY0LmpzXG5cbnZhciBjaGFycyA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvPSc7XG5cbmZ1bmN0aW9uIEUoKSB7XG4gIHRoaXMubWVzc2FnZSA9ICdTdHJpbmcgY29udGFpbnMgYW4gaW52YWxpZCBjaGFyYWN0ZXInO1xufVxuRS5wcm90b3R5cGUgPSBuZXcgRXJyb3I7XG5FLnByb3RvdHlwZS5jb2RlID0gNTtcbkUucHJvdG90eXBlLm5hbWUgPSAnSW52YWxpZENoYXJhY3RlckVycm9yJztcblxuZnVuY3Rpb24gYnRvYShpbnB1dCkge1xuICB2YXIgc3RyID0gU3RyaW5nKGlucHV0KTtcbiAgdmFyIG91dHB1dCA9ICcnO1xuICBmb3IgKFxuICAgIC8vIGluaXRpYWxpemUgcmVzdWx0IGFuZCBjb3VudGVyXG4gICAgdmFyIGJsb2NrLCBjaGFyQ29kZSwgaWR4ID0gMCwgbWFwID0gY2hhcnM7XG4gICAgLy8gaWYgdGhlIG5leHQgc3RyIGluZGV4IGRvZXMgbm90IGV4aXN0OlxuICAgIC8vICAgY2hhbmdlIHRoZSBtYXBwaW5nIHRhYmxlIHRvIFwiPVwiXG4gICAgLy8gICBjaGVjayBpZiBkIGhhcyBubyBmcmFjdGlvbmFsIGRpZ2l0c1xuICAgIHN0ci5jaGFyQXQoaWR4IHwgMCkgfHwgKG1hcCA9ICc9JywgaWR4ICUgMSk7XG4gICAgLy8gXCI4IC0gaWR4ICUgMSAqIDhcIiBnZW5lcmF0ZXMgdGhlIHNlcXVlbmNlIDIsIDQsIDYsIDhcbiAgICBvdXRwdXQgKz0gbWFwLmNoYXJBdCg2MyAmIGJsb2NrID4+IDggLSBpZHggJSAxICogOClcbiAgKSB7XG4gICAgY2hhckNvZGUgPSBzdHIuY2hhckNvZGVBdChpZHggKz0gMyAvIDQpO1xuICAgIGlmIChjaGFyQ29kZSA+IDB4RkYpIHtcbiAgICAgIHRocm93IG5ldyBFKCk7XG4gICAgfVxuICAgIGJsb2NrID0gYmxvY2sgPDwgOCB8IGNoYXJDb2RlO1xuICB9XG4gIHJldHVybiBvdXRwdXQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gYnRvYTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xuXG5mdW5jdGlvbiBlbmNvZGUodmFsKSB7XG4gIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQodmFsKS5cbiAgICByZXBsYWNlKC8lNDAvZ2ksICdAJykuXG4gICAgcmVwbGFjZSgvJTNBL2dpLCAnOicpLlxuICAgIHJlcGxhY2UoLyUyNC9nLCAnJCcpLlxuICAgIHJlcGxhY2UoLyUyQy9naSwgJywnKS5cbiAgICByZXBsYWNlKC8lMjAvZywgJysnKS5cbiAgICByZXBsYWNlKC8lNUIvZ2ksICdbJykuXG4gICAgcmVwbGFjZSgvJTVEL2dpLCAnXScpO1xufVxuXG4vKipcbiAqIEJ1aWxkIGEgVVJMIGJ5IGFwcGVuZGluZyBwYXJhbXMgdG8gdGhlIGVuZFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgVGhlIGJhc2Ugb2YgdGhlIHVybCAoZS5nLiwgaHR0cDovL3d3dy5nb29nbGUuY29tKVxuICogQHBhcmFtIHtvYmplY3R9IFtwYXJhbXNdIFRoZSBwYXJhbXMgdG8gYmUgYXBwZW5kZWRcbiAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBmb3JtYXR0ZWQgdXJsXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gYnVpbGRVUkwodXJsLCBwYXJhbXMsIHBhcmFtc1NlcmlhbGl6ZXIpIHtcbiAgLyplc2xpbnQgbm8tcGFyYW0tcmVhc3NpZ246MCovXG4gIGlmICghcGFyYW1zKSB7XG4gICAgcmV0dXJuIHVybDtcbiAgfVxuXG4gIHZhciBzZXJpYWxpemVkUGFyYW1zO1xuICBpZiAocGFyYW1zU2VyaWFsaXplcikge1xuICAgIHNlcmlhbGl6ZWRQYXJhbXMgPSBwYXJhbXNTZXJpYWxpemVyKHBhcmFtcyk7XG4gIH0gZWxzZSBpZiAodXRpbHMuaXNVUkxTZWFyY2hQYXJhbXMocGFyYW1zKSkge1xuICAgIHNlcmlhbGl6ZWRQYXJhbXMgPSBwYXJhbXMudG9TdHJpbmcoKTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgcGFydHMgPSBbXTtcblxuICAgIHV0aWxzLmZvckVhY2gocGFyYW1zLCBmdW5jdGlvbiBzZXJpYWxpemUodmFsLCBrZXkpIHtcbiAgICAgIGlmICh2YWwgPT09IG51bGwgfHwgdHlwZW9mIHZhbCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAodXRpbHMuaXNBcnJheSh2YWwpKSB7XG4gICAgICAgIGtleSA9IGtleSArICdbXSc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWwgPSBbdmFsXTtcbiAgICAgIH1cblxuICAgICAgdXRpbHMuZm9yRWFjaCh2YWwsIGZ1bmN0aW9uIHBhcnNlVmFsdWUodikge1xuICAgICAgICBpZiAodXRpbHMuaXNEYXRlKHYpKSB7XG4gICAgICAgICAgdiA9IHYudG9JU09TdHJpbmcoKTtcbiAgICAgICAgfSBlbHNlIGlmICh1dGlscy5pc09iamVjdCh2KSkge1xuICAgICAgICAgIHYgPSBKU09OLnN0cmluZ2lmeSh2KTtcbiAgICAgICAgfVxuICAgICAgICBwYXJ0cy5wdXNoKGVuY29kZShrZXkpICsgJz0nICsgZW5jb2RlKHYpKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgc2VyaWFsaXplZFBhcmFtcyA9IHBhcnRzLmpvaW4oJyYnKTtcbiAgfVxuXG4gIGlmIChzZXJpYWxpemVkUGFyYW1zKSB7XG4gICAgdXJsICs9ICh1cmwuaW5kZXhPZignPycpID09PSAtMSA/ICc/JyA6ICcmJykgKyBzZXJpYWxpemVkUGFyYW1zO1xuICB9XG5cbiAgcmV0dXJuIHVybDtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBVUkwgYnkgY29tYmluaW5nIHRoZSBzcGVjaWZpZWQgVVJMc1xuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBiYXNlVVJMIFRoZSBiYXNlIFVSTFxuICogQHBhcmFtIHtzdHJpbmd9IHJlbGF0aXZlVVJMIFRoZSByZWxhdGl2ZSBVUkxcbiAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBjb21iaW5lZCBVUkxcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBjb21iaW5lVVJMcyhiYXNlVVJMLCByZWxhdGl2ZVVSTCkge1xuICByZXR1cm4gcmVsYXRpdmVVUkxcbiAgICA/IGJhc2VVUkwucmVwbGFjZSgvXFwvKyQvLCAnJykgKyAnLycgKyByZWxhdGl2ZVVSTC5yZXBsYWNlKC9eXFwvKy8sICcnKVxuICAgIDogYmFzZVVSTDtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSAoXG4gIHV0aWxzLmlzU3RhbmRhcmRCcm93c2VyRW52KCkgP1xuXG4gIC8vIFN0YW5kYXJkIGJyb3dzZXIgZW52cyBzdXBwb3J0IGRvY3VtZW50LmNvb2tpZVxuICAoZnVuY3Rpb24gc3RhbmRhcmRCcm93c2VyRW52KCkge1xuICAgIHJldHVybiB7XG4gICAgICB3cml0ZTogZnVuY3Rpb24gd3JpdGUobmFtZSwgdmFsdWUsIGV4cGlyZXMsIHBhdGgsIGRvbWFpbiwgc2VjdXJlKSB7XG4gICAgICAgIHZhciBjb29raWUgPSBbXTtcbiAgICAgICAgY29va2llLnB1c2gobmFtZSArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSkpO1xuXG4gICAgICAgIGlmICh1dGlscy5pc051bWJlcihleHBpcmVzKSkge1xuICAgICAgICAgIGNvb2tpZS5wdXNoKCdleHBpcmVzPScgKyBuZXcgRGF0ZShleHBpcmVzKS50b0dNVFN0cmluZygpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh1dGlscy5pc1N0cmluZyhwYXRoKSkge1xuICAgICAgICAgIGNvb2tpZS5wdXNoKCdwYXRoPScgKyBwYXRoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh1dGlscy5pc1N0cmluZyhkb21haW4pKSB7XG4gICAgICAgICAgY29va2llLnB1c2goJ2RvbWFpbj0nICsgZG9tYWluKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzZWN1cmUgPT09IHRydWUpIHtcbiAgICAgICAgICBjb29raWUucHVzaCgnc2VjdXJlJyk7XG4gICAgICAgIH1cblxuICAgICAgICBkb2N1bWVudC5jb29raWUgPSBjb29raWUuam9pbignOyAnKTtcbiAgICAgIH0sXG5cbiAgICAgIHJlYWQ6IGZ1bmN0aW9uIHJlYWQobmFtZSkge1xuICAgICAgICB2YXIgbWF0Y2ggPSBkb2N1bWVudC5jb29raWUubWF0Y2gobmV3IFJlZ0V4cCgnKF58O1xcXFxzKikoJyArIG5hbWUgKyAnKT0oW147XSopJykpO1xuICAgICAgICByZXR1cm4gKG1hdGNoID8gZGVjb2RlVVJJQ29tcG9uZW50KG1hdGNoWzNdKSA6IG51bGwpO1xuICAgICAgfSxcblxuICAgICAgcmVtb3ZlOiBmdW5jdGlvbiByZW1vdmUobmFtZSkge1xuICAgICAgICB0aGlzLndyaXRlKG5hbWUsICcnLCBEYXRlLm5vdygpIC0gODY0MDAwMDApO1xuICAgICAgfVxuICAgIH07XG4gIH0pKCkgOlxuXG4gIC8vIE5vbiBzdGFuZGFyZCBicm93c2VyIGVudiAod2ViIHdvcmtlcnMsIHJlYWN0LW5hdGl2ZSkgbGFjayBuZWVkZWQgc3VwcG9ydC5cbiAgKGZ1bmN0aW9uIG5vblN0YW5kYXJkQnJvd3NlckVudigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgd3JpdGU6IGZ1bmN0aW9uIHdyaXRlKCkge30sXG4gICAgICByZWFkOiBmdW5jdGlvbiByZWFkKCkgeyByZXR1cm4gbnVsbDsgfSxcbiAgICAgIHJlbW92ZTogZnVuY3Rpb24gcmVtb3ZlKCkge31cbiAgICB9O1xuICB9KSgpXG4pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIERldGVybWluZXMgd2hldGhlciB0aGUgc3BlY2lmaWVkIFVSTCBpcyBhYnNvbHV0ZVxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgVGhlIFVSTCB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB0aGUgc3BlY2lmaWVkIFVSTCBpcyBhYnNvbHV0ZSwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNBYnNvbHV0ZVVSTCh1cmwpIHtcbiAgLy8gQSBVUkwgaXMgY29uc2lkZXJlZCBhYnNvbHV0ZSBpZiBpdCBiZWdpbnMgd2l0aCBcIjxzY2hlbWU+Oi8vXCIgb3IgXCIvL1wiIChwcm90b2NvbC1yZWxhdGl2ZSBVUkwpLlxuICAvLyBSRkMgMzk4NiBkZWZpbmVzIHNjaGVtZSBuYW1lIGFzIGEgc2VxdWVuY2Ugb2YgY2hhcmFjdGVycyBiZWdpbm5pbmcgd2l0aCBhIGxldHRlciBhbmQgZm9sbG93ZWRcbiAgLy8gYnkgYW55IGNvbWJpbmF0aW9uIG9mIGxldHRlcnMsIGRpZ2l0cywgcGx1cywgcGVyaW9kLCBvciBoeXBoZW4uXG4gIHJldHVybiAvXihbYS16XVthLXpcXGRcXCtcXC1cXC5dKjopP1xcL1xcLy9pLnRlc3QodXJsKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSAoXG4gIHV0aWxzLmlzU3RhbmRhcmRCcm93c2VyRW52KCkgP1xuXG4gIC8vIFN0YW5kYXJkIGJyb3dzZXIgZW52cyBoYXZlIGZ1bGwgc3VwcG9ydCBvZiB0aGUgQVBJcyBuZWVkZWQgdG8gdGVzdFxuICAvLyB3aGV0aGVyIHRoZSByZXF1ZXN0IFVSTCBpcyBvZiB0aGUgc2FtZSBvcmlnaW4gYXMgY3VycmVudCBsb2NhdGlvbi5cbiAgKGZ1bmN0aW9uIHN0YW5kYXJkQnJvd3NlckVudigpIHtcbiAgICB2YXIgbXNpZSA9IC8obXNpZXx0cmlkZW50KS9pLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCk7XG4gICAgdmFyIHVybFBhcnNpbmdOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgIHZhciBvcmlnaW5VUkw7XG5cbiAgICAvKipcbiAgICAqIFBhcnNlIGEgVVJMIHRvIGRpc2NvdmVyIGl0J3MgY29tcG9uZW50c1xuICAgICpcbiAgICAqIEBwYXJhbSB7U3RyaW5nfSB1cmwgVGhlIFVSTCB0byBiZSBwYXJzZWRcbiAgICAqIEByZXR1cm5zIHtPYmplY3R9XG4gICAgKi9cbiAgICBmdW5jdGlvbiByZXNvbHZlVVJMKHVybCkge1xuICAgICAgdmFyIGhyZWYgPSB1cmw7XG5cbiAgICAgIGlmIChtc2llKSB7XG4gICAgICAgIC8vIElFIG5lZWRzIGF0dHJpYnV0ZSBzZXQgdHdpY2UgdG8gbm9ybWFsaXplIHByb3BlcnRpZXNcbiAgICAgICAgdXJsUGFyc2luZ05vZGUuc2V0QXR0cmlidXRlKCdocmVmJywgaHJlZik7XG4gICAgICAgIGhyZWYgPSB1cmxQYXJzaW5nTm9kZS5ocmVmO1xuICAgICAgfVxuXG4gICAgICB1cmxQYXJzaW5nTm9kZS5zZXRBdHRyaWJ1dGUoJ2hyZWYnLCBocmVmKTtcblxuICAgICAgLy8gdXJsUGFyc2luZ05vZGUgcHJvdmlkZXMgdGhlIFVybFV0aWxzIGludGVyZmFjZSAtIGh0dHA6Ly91cmwuc3BlYy53aGF0d2cub3JnLyN1cmx1dGlsc1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaHJlZjogdXJsUGFyc2luZ05vZGUuaHJlZixcbiAgICAgICAgcHJvdG9jb2w6IHVybFBhcnNpbmdOb2RlLnByb3RvY29sID8gdXJsUGFyc2luZ05vZGUucHJvdG9jb2wucmVwbGFjZSgvOiQvLCAnJykgOiAnJyxcbiAgICAgICAgaG9zdDogdXJsUGFyc2luZ05vZGUuaG9zdCxcbiAgICAgICAgc2VhcmNoOiB1cmxQYXJzaW5nTm9kZS5zZWFyY2ggPyB1cmxQYXJzaW5nTm9kZS5zZWFyY2gucmVwbGFjZSgvXlxcPy8sICcnKSA6ICcnLFxuICAgICAgICBoYXNoOiB1cmxQYXJzaW5nTm9kZS5oYXNoID8gdXJsUGFyc2luZ05vZGUuaGFzaC5yZXBsYWNlKC9eIy8sICcnKSA6ICcnLFxuICAgICAgICBob3N0bmFtZTogdXJsUGFyc2luZ05vZGUuaG9zdG5hbWUsXG4gICAgICAgIHBvcnQ6IHVybFBhcnNpbmdOb2RlLnBvcnQsXG4gICAgICAgIHBhdGhuYW1lOiAodXJsUGFyc2luZ05vZGUucGF0aG5hbWUuY2hhckF0KDApID09PSAnLycpID9cbiAgICAgICAgICAgICAgICAgIHVybFBhcnNpbmdOb2RlLnBhdGhuYW1lIDpcbiAgICAgICAgICAgICAgICAgICcvJyArIHVybFBhcnNpbmdOb2RlLnBhdGhuYW1lXG4gICAgICB9O1xuICAgIH1cblxuICAgIG9yaWdpblVSTCA9IHJlc29sdmVVUkwod2luZG93LmxvY2F0aW9uLmhyZWYpO1xuXG4gICAgLyoqXG4gICAgKiBEZXRlcm1pbmUgaWYgYSBVUkwgc2hhcmVzIHRoZSBzYW1lIG9yaWdpbiBhcyB0aGUgY3VycmVudCBsb2NhdGlvblxuICAgICpcbiAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXF1ZXN0VVJMIFRoZSBVUkwgdG8gdGVzdFxuICAgICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgVVJMIHNoYXJlcyB0aGUgc2FtZSBvcmlnaW4sIG90aGVyd2lzZSBmYWxzZVxuICAgICovXG4gICAgcmV0dXJuIGZ1bmN0aW9uIGlzVVJMU2FtZU9yaWdpbihyZXF1ZXN0VVJMKSB7XG4gICAgICB2YXIgcGFyc2VkID0gKHV0aWxzLmlzU3RyaW5nKHJlcXVlc3RVUkwpKSA/IHJlc29sdmVVUkwocmVxdWVzdFVSTCkgOiByZXF1ZXN0VVJMO1xuICAgICAgcmV0dXJuIChwYXJzZWQucHJvdG9jb2wgPT09IG9yaWdpblVSTC5wcm90b2NvbCAmJlxuICAgICAgICAgICAgcGFyc2VkLmhvc3QgPT09IG9yaWdpblVSTC5ob3N0KTtcbiAgICB9O1xuICB9KSgpIDpcblxuICAvLyBOb24gc3RhbmRhcmQgYnJvd3NlciBlbnZzICh3ZWIgd29ya2VycywgcmVhY3QtbmF0aXZlKSBsYWNrIG5lZWRlZCBzdXBwb3J0LlxuICAoZnVuY3Rpb24gbm9uU3RhbmRhcmRCcm93c2VyRW52KCkge1xuICAgIHJldHVybiBmdW5jdGlvbiBpc1VSTFNhbWVPcmlnaW4oKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICB9KSgpXG4pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIG5vcm1hbGl6ZUhlYWRlck5hbWUoaGVhZGVycywgbm9ybWFsaXplZE5hbWUpIHtcbiAgdXRpbHMuZm9yRWFjaChoZWFkZXJzLCBmdW5jdGlvbiBwcm9jZXNzSGVhZGVyKHZhbHVlLCBuYW1lKSB7XG4gICAgaWYgKG5hbWUgIT09IG5vcm1hbGl6ZWROYW1lICYmIG5hbWUudG9VcHBlckNhc2UoKSA9PT0gbm9ybWFsaXplZE5hbWUudG9VcHBlckNhc2UoKSkge1xuICAgICAgaGVhZGVyc1tub3JtYWxpemVkTmFtZV0gPSB2YWx1ZTtcbiAgICAgIGRlbGV0ZSBoZWFkZXJzW25hbWVdO1xuICAgIH1cbiAgfSk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XG5cbi8vIEhlYWRlcnMgd2hvc2UgZHVwbGljYXRlcyBhcmUgaWdub3JlZCBieSBub2RlXG4vLyBjLmYuIGh0dHBzOi8vbm9kZWpzLm9yZy9hcGkvaHR0cC5odG1sI2h0dHBfbWVzc2FnZV9oZWFkZXJzXG52YXIgaWdub3JlRHVwbGljYXRlT2YgPSBbXG4gICdhZ2UnLCAnYXV0aG9yaXphdGlvbicsICdjb250ZW50LWxlbmd0aCcsICdjb250ZW50LXR5cGUnLCAnZXRhZycsXG4gICdleHBpcmVzJywgJ2Zyb20nLCAnaG9zdCcsICdpZi1tb2RpZmllZC1zaW5jZScsICdpZi11bm1vZGlmaWVkLXNpbmNlJyxcbiAgJ2xhc3QtbW9kaWZpZWQnLCAnbG9jYXRpb24nLCAnbWF4LWZvcndhcmRzJywgJ3Byb3h5LWF1dGhvcml6YXRpb24nLFxuICAncmVmZXJlcicsICdyZXRyeS1hZnRlcicsICd1c2VyLWFnZW50J1xuXTtcblxuLyoqXG4gKiBQYXJzZSBoZWFkZXJzIGludG8gYW4gb2JqZWN0XG4gKlxuICogYGBgXG4gKiBEYXRlOiBXZWQsIDI3IEF1ZyAyMDE0IDA4OjU4OjQ5IEdNVFxuICogQ29udGVudC1UeXBlOiBhcHBsaWNhdGlvbi9qc29uXG4gKiBDb25uZWN0aW9uOiBrZWVwLWFsaXZlXG4gKiBUcmFuc2Zlci1FbmNvZGluZzogY2h1bmtlZFxuICogYGBgXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGhlYWRlcnMgSGVhZGVycyBuZWVkaW5nIHRvIGJlIHBhcnNlZFxuICogQHJldHVybnMge09iamVjdH0gSGVhZGVycyBwYXJzZWQgaW50byBhbiBvYmplY3RcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBwYXJzZUhlYWRlcnMoaGVhZGVycykge1xuICB2YXIgcGFyc2VkID0ge307XG4gIHZhciBrZXk7XG4gIHZhciB2YWw7XG4gIHZhciBpO1xuXG4gIGlmICghaGVhZGVycykgeyByZXR1cm4gcGFyc2VkOyB9XG5cbiAgdXRpbHMuZm9yRWFjaChoZWFkZXJzLnNwbGl0KCdcXG4nKSwgZnVuY3Rpb24gcGFyc2VyKGxpbmUpIHtcbiAgICBpID0gbGluZS5pbmRleE9mKCc6Jyk7XG4gICAga2V5ID0gdXRpbHMudHJpbShsaW5lLnN1YnN0cigwLCBpKSkudG9Mb3dlckNhc2UoKTtcbiAgICB2YWwgPSB1dGlscy50cmltKGxpbmUuc3Vic3RyKGkgKyAxKSk7XG5cbiAgICBpZiAoa2V5KSB7XG4gICAgICBpZiAocGFyc2VkW2tleV0gJiYgaWdub3JlRHVwbGljYXRlT2YuaW5kZXhPZihrZXkpID49IDApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKGtleSA9PT0gJ3NldC1jb29raWUnKSB7XG4gICAgICAgIHBhcnNlZFtrZXldID0gKHBhcnNlZFtrZXldID8gcGFyc2VkW2tleV0gOiBbXSkuY29uY2F0KFt2YWxdKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcnNlZFtrZXldID0gcGFyc2VkW2tleV0gPyBwYXJzZWRba2V5XSArICcsICcgKyB2YWwgOiB2YWw7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gcGFyc2VkO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBTeW50YWN0aWMgc3VnYXIgZm9yIGludm9raW5nIGEgZnVuY3Rpb24gYW5kIGV4cGFuZGluZyBhbiBhcnJheSBmb3IgYXJndW1lbnRzLlxuICpcbiAqIENvbW1vbiB1c2UgY2FzZSB3b3VsZCBiZSB0byB1c2UgYEZ1bmN0aW9uLnByb3RvdHlwZS5hcHBseWAuXG4gKlxuICogIGBgYGpzXG4gKiAgZnVuY3Rpb24gZih4LCB5LCB6KSB7fVxuICogIHZhciBhcmdzID0gWzEsIDIsIDNdO1xuICogIGYuYXBwbHkobnVsbCwgYXJncyk7XG4gKiAgYGBgXG4gKlxuICogV2l0aCBgc3ByZWFkYCB0aGlzIGV4YW1wbGUgY2FuIGJlIHJlLXdyaXR0ZW4uXG4gKlxuICogIGBgYGpzXG4gKiAgc3ByZWFkKGZ1bmN0aW9uKHgsIHksIHopIHt9KShbMSwgMiwgM10pO1xuICogIGBgYFxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gc3ByZWFkKGNhbGxiYWNrKSB7XG4gIHJldHVybiBmdW5jdGlvbiB3cmFwKGFycikge1xuICAgIHJldHVybiBjYWxsYmFjay5hcHBseShudWxsLCBhcnIpO1xuICB9O1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGJpbmQgPSByZXF1aXJlKCcuL2hlbHBlcnMvYmluZCcpO1xudmFyIGlzQnVmZmVyID0gcmVxdWlyZSgnaXMtYnVmZmVyJyk7XG5cbi8qZ2xvYmFsIHRvU3RyaW5nOnRydWUqL1xuXG4vLyB1dGlscyBpcyBhIGxpYnJhcnkgb2YgZ2VuZXJpYyBoZWxwZXIgZnVuY3Rpb25zIG5vbi1zcGVjaWZpYyB0byBheGlvc1xuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGFuIEFycmF5XG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYW4gQXJyYXksIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc0FycmF5KHZhbCkge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbCh2YWwpID09PSAnW29iamVjdCBBcnJheV0nO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGFuIEFycmF5QnVmZmVyXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYW4gQXJyYXlCdWZmZXIsIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc0FycmF5QnVmZmVyKHZhbCkge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbCh2YWwpID09PSAnW29iamVjdCBBcnJheUJ1ZmZlcl0nO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgRm9ybURhdGFcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhbiBGb3JtRGF0YSwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzRm9ybURhdGEodmFsKSB7XG4gIHJldHVybiAodHlwZW9mIEZvcm1EYXRhICE9PSAndW5kZWZpbmVkJykgJiYgKHZhbCBpbnN0YW5jZW9mIEZvcm1EYXRhKTtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhIHZpZXcgb24gYW4gQXJyYXlCdWZmZXJcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIHZpZXcgb24gYW4gQXJyYXlCdWZmZXIsIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc0FycmF5QnVmZmVyVmlldyh2YWwpIHtcbiAgdmFyIHJlc3VsdDtcbiAgaWYgKCh0eXBlb2YgQXJyYXlCdWZmZXIgIT09ICd1bmRlZmluZWQnKSAmJiAoQXJyYXlCdWZmZXIuaXNWaWV3KSkge1xuICAgIHJlc3VsdCA9IEFycmF5QnVmZmVyLmlzVmlldyh2YWwpO1xuICB9IGVsc2Uge1xuICAgIHJlc3VsdCA9ICh2YWwpICYmICh2YWwuYnVmZmVyKSAmJiAodmFsLmJ1ZmZlciBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgU3RyaW5nXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBTdHJpbmcsIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc1N0cmluZyh2YWwpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgTnVtYmVyXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBOdW1iZXIsIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc051bWJlcih2YWwpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWwgPT09ICdudW1iZXInO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIHVuZGVmaW5lZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHRoZSB2YWx1ZSBpcyB1bmRlZmluZWQsIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc1VuZGVmaW5lZCh2YWwpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWwgPT09ICd1bmRlZmluZWQnO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGFuIE9iamVjdFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGFuIE9iamVjdCwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0KHZhbCkge1xuICByZXR1cm4gdmFsICE9PSBudWxsICYmIHR5cGVvZiB2YWwgPT09ICdvYmplY3QnO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgRGF0ZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgRGF0ZSwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzRGF0ZSh2YWwpIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwodmFsKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgRmlsZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgRmlsZSwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzRmlsZSh2YWwpIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwodmFsKSA9PT0gJ1tvYmplY3QgRmlsZV0nO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgQmxvYlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgQmxvYiwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzQmxvYih2YWwpIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwodmFsKSA9PT0gJ1tvYmplY3QgQmxvYl0nO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgRnVuY3Rpb25cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIEZ1bmN0aW9uLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNGdW5jdGlvbih2YWwpIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwodmFsKSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhIFN0cmVhbVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgU3RyZWFtLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNTdHJlYW0odmFsKSB7XG4gIHJldHVybiBpc09iamVjdCh2YWwpICYmIGlzRnVuY3Rpb24odmFsLnBpcGUpO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgVVJMU2VhcmNoUGFyYW1zIG9iamVjdFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgVVJMU2VhcmNoUGFyYW1zIG9iamVjdCwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzVVJMU2VhcmNoUGFyYW1zKHZhbCkge1xuICByZXR1cm4gdHlwZW9mIFVSTFNlYXJjaFBhcmFtcyAhPT0gJ3VuZGVmaW5lZCcgJiYgdmFsIGluc3RhbmNlb2YgVVJMU2VhcmNoUGFyYW1zO1xufVxuXG4vKipcbiAqIFRyaW0gZXhjZXNzIHdoaXRlc3BhY2Ugb2ZmIHRoZSBiZWdpbm5pbmcgYW5kIGVuZCBvZiBhIHN0cmluZ1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHIgVGhlIFN0cmluZyB0byB0cmltXG4gKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgU3RyaW5nIGZyZWVkIG9mIGV4Y2VzcyB3aGl0ZXNwYWNlXG4gKi9cbmZ1bmN0aW9uIHRyaW0oc3RyKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvXlxccyovLCAnJykucmVwbGFjZSgvXFxzKiQvLCAnJyk7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIHdlJ3JlIHJ1bm5pbmcgaW4gYSBzdGFuZGFyZCBicm93c2VyIGVudmlyb25tZW50XG4gKlxuICogVGhpcyBhbGxvd3MgYXhpb3MgdG8gcnVuIGluIGEgd2ViIHdvcmtlciwgYW5kIHJlYWN0LW5hdGl2ZS5cbiAqIEJvdGggZW52aXJvbm1lbnRzIHN1cHBvcnQgWE1MSHR0cFJlcXVlc3QsIGJ1dCBub3QgZnVsbHkgc3RhbmRhcmQgZ2xvYmFscy5cbiAqXG4gKiB3ZWIgd29ya2VyczpcbiAqICB0eXBlb2Ygd2luZG93IC0+IHVuZGVmaW5lZFxuICogIHR5cGVvZiBkb2N1bWVudCAtPiB1bmRlZmluZWRcbiAqXG4gKiByZWFjdC1uYXRpdmU6XG4gKiAgbmF2aWdhdG9yLnByb2R1Y3QgLT4gJ1JlYWN0TmF0aXZlJ1xuICovXG5mdW5jdGlvbiBpc1N0YW5kYXJkQnJvd3NlckVudigpIHtcbiAgaWYgKHR5cGVvZiBuYXZpZ2F0b3IgIT09ICd1bmRlZmluZWQnICYmIG5hdmlnYXRvci5wcm9kdWN0ID09PSAnUmVhY3ROYXRpdmUnKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiAoXG4gICAgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICB0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnXG4gICk7XG59XG5cbi8qKlxuICogSXRlcmF0ZSBvdmVyIGFuIEFycmF5IG9yIGFuIE9iamVjdCBpbnZva2luZyBhIGZ1bmN0aW9uIGZvciBlYWNoIGl0ZW0uXG4gKlxuICogSWYgYG9iamAgaXMgYW4gQXJyYXkgY2FsbGJhY2sgd2lsbCBiZSBjYWxsZWQgcGFzc2luZ1xuICogdGhlIHZhbHVlLCBpbmRleCwgYW5kIGNvbXBsZXRlIGFycmF5IGZvciBlYWNoIGl0ZW0uXG4gKlxuICogSWYgJ29iaicgaXMgYW4gT2JqZWN0IGNhbGxiYWNrIHdpbGwgYmUgY2FsbGVkIHBhc3NpbmdcbiAqIHRoZSB2YWx1ZSwga2V5LCBhbmQgY29tcGxldGUgb2JqZWN0IGZvciBlYWNoIHByb3BlcnR5LlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fSBvYmogVGhlIG9iamVjdCB0byBpdGVyYXRlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBUaGUgY2FsbGJhY2sgdG8gaW52b2tlIGZvciBlYWNoIGl0ZW1cbiAqL1xuZnVuY3Rpb24gZm9yRWFjaChvYmosIGZuKSB7XG4gIC8vIERvbid0IGJvdGhlciBpZiBubyB2YWx1ZSBwcm92aWRlZFxuICBpZiAob2JqID09PSBudWxsIHx8IHR5cGVvZiBvYmogPT09ICd1bmRlZmluZWQnKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gRm9yY2UgYW4gYXJyYXkgaWYgbm90IGFscmVhZHkgc29tZXRoaW5nIGl0ZXJhYmxlXG4gIGlmICh0eXBlb2Ygb2JqICE9PSAnb2JqZWN0Jykge1xuICAgIC8qZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOjAqL1xuICAgIG9iaiA9IFtvYmpdO1xuICB9XG5cbiAgaWYgKGlzQXJyYXkob2JqKSkge1xuICAgIC8vIEl0ZXJhdGUgb3ZlciBhcnJheSB2YWx1ZXNcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IG9iai5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIGZuLmNhbGwobnVsbCwgb2JqW2ldLCBpLCBvYmopO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBJdGVyYXRlIG92ZXIgb2JqZWN0IGtleXNcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KSkge1xuICAgICAgICBmbi5jYWxsKG51bGwsIG9ialtrZXldLCBrZXksIG9iaik7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQWNjZXB0cyB2YXJhcmdzIGV4cGVjdGluZyBlYWNoIGFyZ3VtZW50IHRvIGJlIGFuIG9iamVjdCwgdGhlblxuICogaW1tdXRhYmx5IG1lcmdlcyB0aGUgcHJvcGVydGllcyBvZiBlYWNoIG9iamVjdCBhbmQgcmV0dXJucyByZXN1bHQuXG4gKlxuICogV2hlbiBtdWx0aXBsZSBvYmplY3RzIGNvbnRhaW4gdGhlIHNhbWUga2V5IHRoZSBsYXRlciBvYmplY3QgaW5cbiAqIHRoZSBhcmd1bWVudHMgbGlzdCB3aWxsIHRha2UgcHJlY2VkZW5jZS5cbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqIGBgYGpzXG4gKiB2YXIgcmVzdWx0ID0gbWVyZ2Uoe2ZvbzogMTIzfSwge2ZvbzogNDU2fSk7XG4gKiBjb25zb2xlLmxvZyhyZXN1bHQuZm9vKTsgLy8gb3V0cHV0cyA0NTZcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmoxIE9iamVjdCB0byBtZXJnZVxuICogQHJldHVybnMge09iamVjdH0gUmVzdWx0IG9mIGFsbCBtZXJnZSBwcm9wZXJ0aWVzXG4gKi9cbmZ1bmN0aW9uIG1lcmdlKC8qIG9iajEsIG9iajIsIG9iajMsIC4uLiAqLykge1xuICB2YXIgcmVzdWx0ID0ge307XG4gIGZ1bmN0aW9uIGFzc2lnblZhbHVlKHZhbCwga2V5KSB7XG4gICAgaWYgKHR5cGVvZiByZXN1bHRba2V5XSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIHZhbCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHJlc3VsdFtrZXldID0gbWVyZ2UocmVzdWx0W2tleV0sIHZhbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdFtrZXldID0gdmFsO1xuICAgIH1cbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGZvckVhY2goYXJndW1lbnRzW2ldLCBhc3NpZ25WYWx1ZSk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBFeHRlbmRzIG9iamVjdCBhIGJ5IG11dGFibHkgYWRkaW5nIHRvIGl0IHRoZSBwcm9wZXJ0aWVzIG9mIG9iamVjdCBiLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBhIFRoZSBvYmplY3QgdG8gYmUgZXh0ZW5kZWRcbiAqIEBwYXJhbSB7T2JqZWN0fSBiIFRoZSBvYmplY3QgdG8gY29weSBwcm9wZXJ0aWVzIGZyb21cbiAqIEBwYXJhbSB7T2JqZWN0fSB0aGlzQXJnIFRoZSBvYmplY3QgdG8gYmluZCBmdW5jdGlvbiB0b1xuICogQHJldHVybiB7T2JqZWN0fSBUaGUgcmVzdWx0aW5nIHZhbHVlIG9mIG9iamVjdCBhXG4gKi9cbmZ1bmN0aW9uIGV4dGVuZChhLCBiLCB0aGlzQXJnKSB7XG4gIGZvckVhY2goYiwgZnVuY3Rpb24gYXNzaWduVmFsdWUodmFsLCBrZXkpIHtcbiAgICBpZiAodGhpc0FyZyAmJiB0eXBlb2YgdmFsID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBhW2tleV0gPSBiaW5kKHZhbCwgdGhpc0FyZyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGFba2V5XSA9IHZhbDtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gYTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGlzQXJyYXk6IGlzQXJyYXksXG4gIGlzQXJyYXlCdWZmZXI6IGlzQXJyYXlCdWZmZXIsXG4gIGlzQnVmZmVyOiBpc0J1ZmZlcixcbiAgaXNGb3JtRGF0YTogaXNGb3JtRGF0YSxcbiAgaXNBcnJheUJ1ZmZlclZpZXc6IGlzQXJyYXlCdWZmZXJWaWV3LFxuICBpc1N0cmluZzogaXNTdHJpbmcsXG4gIGlzTnVtYmVyOiBpc051bWJlcixcbiAgaXNPYmplY3Q6IGlzT2JqZWN0LFxuICBpc1VuZGVmaW5lZDogaXNVbmRlZmluZWQsXG4gIGlzRGF0ZTogaXNEYXRlLFxuICBpc0ZpbGU6IGlzRmlsZSxcbiAgaXNCbG9iOiBpc0Jsb2IsXG4gIGlzRnVuY3Rpb246IGlzRnVuY3Rpb24sXG4gIGlzU3RyZWFtOiBpc1N0cmVhbSxcbiAgaXNVUkxTZWFyY2hQYXJhbXM6IGlzVVJMU2VhcmNoUGFyYW1zLFxuICBpc1N0YW5kYXJkQnJvd3NlckVudjogaXNTdGFuZGFyZEJyb3dzZXJFbnYsXG4gIGZvckVhY2g6IGZvckVhY2gsXG4gIG1lcmdlOiBtZXJnZSxcbiAgZXh0ZW5kOiBleHRlbmQsXG4gIHRyaW06IHRyaW1cbn07XG4iLCIvKiFcbiAqIERldGVybWluZSBpZiBhbiBvYmplY3QgaXMgYSBCdWZmZXJcbiAqXG4gKiBAYXV0aG9yICAgRmVyb3NzIEFib3VraGFkaWplaCA8aHR0cHM6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG5cbi8vIFRoZSBfaXNCdWZmZXIgY2hlY2sgaXMgZm9yIFNhZmFyaSA1LTcgc3VwcG9ydCwgYmVjYXVzZSBpdCdzIG1pc3Npbmdcbi8vIE9iamVjdC5wcm90b3R5cGUuY29uc3RydWN0b3IuIFJlbW92ZSB0aGlzIGV2ZW50dWFsbHlcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9iaikge1xuICByZXR1cm4gb2JqICE9IG51bGwgJiYgKGlzQnVmZmVyKG9iaikgfHwgaXNTbG93QnVmZmVyKG9iaikgfHwgISFvYmouX2lzQnVmZmVyKVxufVxuXG5mdW5jdGlvbiBpc0J1ZmZlciAob2JqKSB7XG4gIHJldHVybiAhIW9iai5jb25zdHJ1Y3RvciAmJiB0eXBlb2Ygb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyID09PSAnZnVuY3Rpb24nICYmIG9iai5jb25zdHJ1Y3Rvci5pc0J1ZmZlcihvYmopXG59XG5cbi8vIEZvciBOb2RlIHYwLjEwIHN1cHBvcnQuIFJlbW92ZSB0aGlzIGV2ZW50dWFsbHkuXG5mdW5jdGlvbiBpc1Nsb3dCdWZmZXIgKG9iaikge1xuICByZXR1cm4gdHlwZW9mIG9iai5yZWFkRmxvYXRMRSA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2Ygb2JqLnNsaWNlID09PSAnZnVuY3Rpb24nICYmIGlzQnVmZmVyKG9iai5zbGljZSgwLCAwKSlcbn1cbiIsIi8qKlRoaXMgY2xhc3MgaXMgYXV0b21hdGljYWxseSBnZW5lcmF0ZWQgYnkgTGF5YUFpcklERSwgcGxlYXNlIGRvIG5vdCBtYWtlIGFueSBtb2RpZmljYXRpb25zLiAqL1xyXG5pbXBvcnQgQXNzaXN0YW50IGZyb20gXCIuL3NjcmlwdC9Bc3Npc3RhbnRcIlxuaW1wb3J0IFBhZ2VTY3JpcHQgZnJvbSBcIi4vcHVibGljU2NyaXB0L1BhZ2VTY3JpcHRcIlxuaW1wb3J0IFNjcmVlbiBmcm9tIFwiLi9wdWJsaWNTY3JpcHQvU2NyZWVuXCJcbmltcG9ydCB0cmVuZExpc3QgZnJvbSBcIi4vdGVtcGxhdGUvdHJlbmRMaXN0XCJcbmltcG9ydCBwcmV2aW91c1JlY29yZHMgZnJvbSBcIi4vdGVtcGxhdGUvcHJldmlvdXNSZWNvcmRzXCJcbmltcG9ydCBDYXJkIGZyb20gXCIuL3NjcmlwdC9DYXJkXCJcbmltcG9ydCBncmFuZFByaXggZnJvbSBcIi4vc2NyaXB0L2dyYW5kUHJpeFwiXG5pbXBvcnQgUGFnZU5hdlNjcmlwdCBmcm9tIFwiLi9wdWJsaWNTY3JpcHQvUGFnZU5hdlNjcmlwdFwiXG5pbXBvcnQgcHJpeExpc3QgZnJvbSBcIi4vdGVtcGxhdGUvcHJpeExpc3RcIlxuaW1wb3J0IEd1ZXNzaW5nIGZyb20gXCIuL3NjcmlwdC9HdWVzc2luZ1wiXG5pbXBvcnQgbnVtYmVyTGlzdERvbVNjcmlwdCBmcm9tIFwiLi90ZW1wbGF0ZS9udW1iZXJMaXN0RG9tU2NyaXB0XCJcbmltcG9ydCBIb21lIGZyb20gXCIuL3NjcmlwdC9Ib21lXCJcbmltcG9ydCBwcmlIaXN0b3J5U2NlbmUgZnJvbSBcIi4vc2NyaXB0L3ByaUhpc3RvcnlTY2VuZVwiXG5pbXBvcnQgcHJpSGlzdG9yeSBmcm9tIFwiLi90ZW1wbGF0ZS9wcmlIaXN0b3J5XCJcbmltcG9ydCBSZWNvcmQgZnJvbSBcIi4vc2NyaXB0L1JlY29yZFwiXG5pbXBvcnQgam9pblJlY29yZHMgZnJvbSBcIi4vdGVtcGxhdGUvam9pblJlY29yZHNcIlxuaW1wb3J0IHNob3J0TGlzdGVkIGZyb20gXCIuL3NjcmlwdC9zaG9ydExpc3RlZFwiXG5pbXBvcnQgc2hvcnRMaXN0ZWRMaXN0IGZyb20gXCIuL3RlbXBsYXRlL3Nob3J0TGlzdGVkTGlzdFwiXG5pbXBvcnQgcHN3SW5wdXQgZnJvbSBcIi4vdGVtcGxhdGUvcHN3SW5wdXRcIlxuaW1wb3J0IHRpcERpYWxvZyBmcm9tIFwiLi90ZW1wbGF0ZS90aXBEaWFsb2dcIlxuaW1wb3J0IHdpbm5pbmdMaXN0IGZyb20gXCIuL3RlbXBsYXRlL3dpbm5pbmdMaXN0XCJcbmltcG9ydCB3aW5uaW5nIGZyb20gXCIuL3NjcmlwdC93aW5uaW5nXCJcclxuLypcclxuKiDmuLjmiI/liJ3lp4vljJbphY3nva47XHJcbiovXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEdhbWVDb25maWd7XHJcbiAgICBzdGF0aWMgd2lkdGg6bnVtYmVyPTc1MDtcclxuICAgIHN0YXRpYyBoZWlnaHQ6bnVtYmVyPTEzMzQ7XHJcbiAgICBzdGF0aWMgc2NhbGVNb2RlOnN0cmluZz1cImZpeGVkd2lkdGhcIjtcclxuICAgIHN0YXRpYyBzY3JlZW5Nb2RlOnN0cmluZz1cIm5vbmVcIjtcclxuICAgIHN0YXRpYyBhbGlnblY6c3RyaW5nPVwidG9wXCI7XHJcbiAgICBzdGF0aWMgYWxpZ25IOnN0cmluZz1cImxlZnRcIjtcclxuICAgIHN0YXRpYyBzdGFydFNjZW5lOmFueT1cImhvbWUuc2NlbmVcIjtcclxuICAgIHN0YXRpYyBzY2VuZVJvb3Q6c3RyaW5nPVwiXCI7XHJcbiAgICBzdGF0aWMgZGVidWc6Ym9vbGVhbj1mYWxzZTtcclxuICAgIHN0YXRpYyBzdGF0OmJvb2xlYW49ZmFsc2U7XHJcbiAgICBzdGF0aWMgcGh5c2ljc0RlYnVnOmJvb2xlYW49ZmFsc2U7XHJcbiAgICBzdGF0aWMgZXhwb3J0U2NlbmVUb0pzb246Ym9vbGVhbj10cnVlO1xyXG4gICAgY29uc3RydWN0b3IoKXt9XHJcbiAgICBzdGF0aWMgaW5pdCgpe1xyXG4gICAgICAgIHZhciByZWc6IEZ1bmN0aW9uID0gTGF5YS5DbGFzc1V0aWxzLnJlZ0NsYXNzO1xyXG4gICAgICAgIHJlZyhcInNjcmlwdC9Bc3Npc3RhbnQudHNcIixBc3Npc3RhbnQpO1xuICAgICAgICByZWcoXCJwdWJsaWNTY3JpcHQvUGFnZVNjcmlwdC50c1wiLFBhZ2VTY3JpcHQpO1xuICAgICAgICByZWcoXCJwdWJsaWNTY3JpcHQvU2NyZWVuLnRzXCIsU2NyZWVuKTtcbiAgICAgICAgcmVnKFwidGVtcGxhdGUvdHJlbmRMaXN0LnRzXCIsdHJlbmRMaXN0KTtcbiAgICAgICAgcmVnKFwidGVtcGxhdGUvcHJldmlvdXNSZWNvcmRzLnRzXCIscHJldmlvdXNSZWNvcmRzKTtcbiAgICAgICAgcmVnKFwic2NyaXB0L0NhcmQudHNcIixDYXJkKTtcbiAgICAgICAgcmVnKFwic2NyaXB0L2dyYW5kUHJpeC50c1wiLGdyYW5kUHJpeCk7XG4gICAgICAgIHJlZyhcInB1YmxpY1NjcmlwdC9QYWdlTmF2U2NyaXB0LnRzXCIsUGFnZU5hdlNjcmlwdCk7XG4gICAgICAgIHJlZyhcInRlbXBsYXRlL3ByaXhMaXN0LnRzXCIscHJpeExpc3QpO1xuICAgICAgICByZWcoXCJzY3JpcHQvR3Vlc3NpbmcudHNcIixHdWVzc2luZyk7XG4gICAgICAgIHJlZyhcInRlbXBsYXRlL251bWJlckxpc3REb21TY3JpcHQudHNcIixudW1iZXJMaXN0RG9tU2NyaXB0KTtcbiAgICAgICAgcmVnKFwic2NyaXB0L0hvbWUudHNcIixIb21lKTtcbiAgICAgICAgcmVnKFwic2NyaXB0L3ByaUhpc3RvcnlTY2VuZS50c1wiLHByaUhpc3RvcnlTY2VuZSk7XG4gICAgICAgIHJlZyhcInRlbXBsYXRlL3ByaUhpc3RvcnkudHNcIixwcmlIaXN0b3J5KTtcbiAgICAgICAgcmVnKFwic2NyaXB0L1JlY29yZC50c1wiLFJlY29yZCk7XG4gICAgICAgIHJlZyhcInRlbXBsYXRlL2pvaW5SZWNvcmRzLnRzXCIsam9pblJlY29yZHMpO1xuICAgICAgICByZWcoXCJzY3JpcHQvc2hvcnRMaXN0ZWQudHNcIixzaG9ydExpc3RlZCk7XG4gICAgICAgIHJlZyhcInRlbXBsYXRlL3Nob3J0TGlzdGVkTGlzdC50c1wiLHNob3J0TGlzdGVkTGlzdCk7XG4gICAgICAgIHJlZyhcInRlbXBsYXRlL3Bzd0lucHV0LnRzXCIscHN3SW5wdXQpO1xuICAgICAgICByZWcoXCJ0ZW1wbGF0ZS90aXBEaWFsb2cudHNcIix0aXBEaWFsb2cpO1xuICAgICAgICByZWcoXCJ0ZW1wbGF0ZS93aW5uaW5nTGlzdC50c1wiLHdpbm5pbmdMaXN0KTtcbiAgICAgICAgcmVnKFwic2NyaXB0L3dpbm5pbmcudHNcIix3aW5uaW5nKTtcclxuICAgIH1cclxufVxyXG5HYW1lQ29uZmlnLmluaXQoKTsiLCJpbXBvcnQgR2FtZUNvbmZpZyBmcm9tIFwiLi9HYW1lQ29uZmlnXCI7XHJcbmNsYXNzIE1haW4ge1xyXG5cdGNvbnN0cnVjdG9yKCkge1xyXG5cdFx0Ly/moLnmja5JREXorr7nva7liJ3lp4vljJblvJXmk45cdFx0XHJcblx0XHRpZiAod2luZG93W1wiTGF5YTNEXCJdKSBMYXlhM0QuaW5pdChHYW1lQ29uZmlnLndpZHRoLCBHYW1lQ29uZmlnLmhlaWdodCk7XHJcblx0XHRlbHNlIExheWEuaW5pdChHYW1lQ29uZmlnLndpZHRoLCBHYW1lQ29uZmlnLmhlaWdodCwgTGF5YVtcIldlYkdMXCJdKTtcclxuXHRcdExheWFbXCJQaHlzaWNzXCJdICYmIExheWFbXCJQaHlzaWNzXCJdLmVuYWJsZSgpO1xyXG5cdFx0TGF5YVtcIkRlYnVnUGFuZWxcIl0gJiYgTGF5YVtcIkRlYnVnUGFuZWxcIl0uZW5hYmxlKCk7XHJcblx0XHRMYXlhLnN0YWdlLnNjYWxlTW9kZSA9IEdhbWVDb25maWcuc2NhbGVNb2RlO1xyXG5cdFx0TGF5YS5zdGFnZS5zY3JlZW5Nb2RlID0gR2FtZUNvbmZpZy5zY3JlZW5Nb2RlO1xyXG5cdFx0Ly/lhbzlrrnlvq7kv6HkuI3mlK/mjIHliqDovb1zY2VuZeWQjue8gOWcuuaZr1xyXG5cdFx0TGF5YS5VUkwuZXhwb3J0U2NlbmVUb0pzb24gPSBHYW1lQ29uZmlnLmV4cG9ydFNjZW5lVG9Kc29uO1xyXG5cclxuXHRcdC8v5omT5byA6LCD6K+V6Z2i5p2/77yI6YCa6L+HSURF6K6+572u6LCD6K+V5qih5byP77yM5oiW6ICFdXJs5Zyw5Z2A5aKe5YqgZGVidWc9dHJ1ZeWPguaVsO+8jOWdh+WPr+aJk+W8gOiwg+ivlemdouadv++8iVxyXG5cdFx0aWYgKEdhbWVDb25maWcuZGVidWcgfHwgTGF5YS5VdGlscy5nZXRRdWVyeVN0cmluZyhcImRlYnVnXCIpID09IFwidHJ1ZVwiKSBMYXlhLmVuYWJsZURlYnVnUGFuZWwoKTtcclxuXHRcdGlmIChHYW1lQ29uZmlnLnBoeXNpY3NEZWJ1ZyAmJiBMYXlhW1wiUGh5c2ljc0RlYnVnRHJhd1wiXSkgTGF5YVtcIlBoeXNpY3NEZWJ1Z0RyYXdcIl0uZW5hYmxlKCk7XHJcblx0XHRpZiAoR2FtZUNvbmZpZy5zdGF0KSBMYXlhLlN0YXQuc2hvdygpO1xyXG5cdFx0TGF5YS5hbGVydEdsb2JhbEVycm9yID0gdHJ1ZTtcclxuXHJcblx0XHQvL+a/gOa0u+i1hOa6kOeJiOacrOaOp+WItu+8jHZlcnNpb24uanNvbueUsUlEReWPkeW4g+WKn+iDveiHquWKqOeUn+aIkO+8jOWmguaenOayoeacieS5n+S4jeW9seWTjeWQjue7rea1geeoi1xyXG5cdFx0TGF5YS5SZXNvdXJjZVZlcnNpb24uZW5hYmxlKFwidmVyc2lvbi5qc29uXCIsIExheWEuSGFuZGxlci5jcmVhdGUodGhpcywgdGhpcy5vblZlcnNpb25Mb2FkZWQpLCBMYXlhLlJlc291cmNlVmVyc2lvbi5GSUxFTkFNRV9WRVJTSU9OKTtcclxuXHR9XHJcblxyXG5cdG9uVmVyc2lvbkxvYWRlZCgpOiB2b2lkIHtcclxuXHRcdC8v5r+A5rS75aSn5bCP5Zu+5pig5bCE77yM5Yqg6L295bCP5Zu+55qE5pe25YCZ77yM5aaC5p6c5Y+R546w5bCP5Zu+5Zyo5aSn5Zu+5ZCI6ZuG6YeM6Z2i77yM5YiZ5LyY5YWI5Yqg6L295aSn5Zu+5ZCI6ZuG77yM6ICM5LiN5piv5bCP5Zu+XHJcblx0XHRMYXlhLkF0bGFzSW5mb01hbmFnZXIuZW5hYmxlKFwiZmlsZWNvbmZpZy5qc29uXCIsIExheWEuSGFuZGxlci5jcmVhdGUodGhpcywgdGhpcy5vbkNvbmZpZ0xvYWRlZCkpO1xyXG5cdH1cclxuXHJcblx0b25Db25maWdMb2FkZWQoKTogdm9pZCB7XHJcblx0XHQvL+WKoOi9vUlEReaMh+WumueahOWcuuaZr1xyXG5cdFx0R2FtZUNvbmZpZy5zdGFydFNjZW5lICYmIExheWEuU2NlbmUub3BlbihHYW1lQ29uZmlnLnN0YXJ0U2NlbmUpO1xyXG5cdH1cclxufVxyXG4vL+a/gOa0u+WQr+WKqOexu1xyXG5uZXcgTWFpbigpO1xyXG4iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjAgMTQ6MTE6MjZcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjAgMTQ6MTE6MjZcclxuICogQGRlc2Mg5pWw5o2u6YCa5L+h5Y+K5L+d5a2Y5o6l5Y+jXHJcbiAqL1xyXG5cclxuZXhwb3J0IGNsYXNzIEdhbWVNb2RlbCBleHRlbmRzIExheWEuRXZlbnREaXNwYXRjaGVyIHtcclxuICAgIHByaXZhdGUgc3RhdGljIF9nYW1lTW9kZWxJbnN0YW5jZTogR2FtZU1vZGVsO1xyXG5cclxuICAgIHN0YXRpYyBnZXRJbnN0YW5jZSgpOiBHYW1lTW9kZWwge1xyXG4gICAgICAgIGlmICghdGhpcy5fZ2FtZU1vZGVsSW5zdGFuY2UpIHtcclxuICAgICAgICAgICAgdGhpcy5fZ2FtZU1vZGVsSW5zdGFuY2UgPSBuZXcgR2FtZU1vZGVsKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzLl9nYW1lTW9kZWxJbnN0YW5jZTtcclxuICAgIH1cclxuXHJcbiAgICAvKirkv53lrZjnlKjmiLfkv6Hmga8gKi9cclxuICAgIHVzZXJJbmZvOm9iamVjdCA9IHt9OyAvL+eUqOaIt+S/oeaBr1xyXG4gICAgc2V0VXNlckluZm8odXNlckluZm86b2JqZWN0KXtcclxuICAgICAgICB0aGlzLnVzZXJJbmZvID0gdXNlckluZm87XHJcbiAgICAgICAgdGhpcy5ldmVudCgnZ2V0VXNlckluZm8nLHRoaXMudXNlckluZm8pXHJcbiAgICB9XHJcblxyXG4gICAgLyoq5L+d5a2Y6KKr6LSt5Lmw5Y+356CBICovXHJcbiAgICBidXlHb29kc0FycjphbnkgPSBbXTsgLy/ooqvotK3kubDlj7fnoIFcclxuICAgIHNldEdvb2RzQXJyKGdvb2RzQXJyOmFueSkge1xyXG4gICAgICAgIHRoaXMuYnV5R29vZHNBcnIgPSBnb29kc0FycjtcclxuICAgICAgICB0aGlzLmV2ZW50KCdnZXRidXlHb29kc0FycicsW3RoaXMuYnV5R29vZHNBcnJdKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKuS/neWtmOeBq+eureaVsOaNriAqL1xyXG4gICAgcm9ja2V0RGF0YTpPYmplY3QgPSB7fTsvL+eBq+eureaVsOaNrlxyXG4gICAgc2V0Um9ja2V0RGF0YShkYXRhOm9iamVjdCl7XHJcbiAgICAgICAgdGhpcy5yb2NrZXREYXRhID0gZGF0YTtcclxuICAgICAgICB0aGlzLmV2ZW50KCdnZXRSb2NrZXREYXRhJyx0aGlzLnJvY2tldERhdGEpXHJcbiAgICB9XHJcblxyXG4gICAgLyoq5piv5ZCm5byA5aWW5LqGICovXHJcbiAgICBpc1RvZ2dsZShzdGF0dXM6Ym9vbGVhbil7XHJcbiAgICAgICAgdGhpcy5ldmVudCgnaXNUb2dnbGUnLHN0YXR1cylcclxuICAgIH1cclxuXHJcbiAgICAvKirpgJrnn6XkuK3lpZYgKi9cclxuICAgIG5vdGljZUZ1bmMoc3RhdHVzOmJvb2xlYW4pe1xyXG4gICAgICAgIHRoaXMuZXZlbnQoJ2dldE5vdGljZScsc3RhdHVzKVxyXG4gICAgfVxyXG4gICAgXHJcbn0iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjAgMTU6MTU6MDhcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjAgMTU6MTU6MDhcclxuICogQGRlc2MgYXBp5o6l5Y+j57uf5LiA5bCB6KOF5aSE55CGXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgZ2V0LCBwb3N0IH0gZnJvbSAnLi9odHRwJztcclxuaW1wb3J0IHsgR2FtZU1vZGVsIH0gZnJvbSAnLi9HYW1lTW9kZWwnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQge1xyXG4gICAgLyoq6I635Y+W55So5oi35L+h5oGvICovXHJcbiAgICBnZXRVc2VySW5mbygpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBnZXQoJy91c2VyL2dldEluZm8nLCB7fSkudGhlbigocmVzOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICghcmVzLmNvZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyDkv53lrZjnlKjmiLfkv6Hmga9cclxuICAgICAgICAgICAgICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5zZXRVc2VySW5mbyhyZXMudXNlckluZm8pXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXMpXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXMpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgIH0sXHJcblxyXG4gICAgLyoq6I635Y+W5LuK5pel5aSn5aWW5rGgICovXHJcbiAgICBnZXRSYW5rVG9kYXkoKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgZ2V0KCcvcmFuay90b2RheScsIHt9KS50aGVuKChyZXM6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9LFxyXG4gICAgLyoq6I635Y+W5aSn5aWW5rGg5Y6G5Y+y6K6w5b2VXHJcbiAgICAgKiBAcGFyYW0gY291bnRUaW1lIFvpgInloatdIOaXpeacn1xyXG4gICAgICovXHJcbiAgICBnZXRSYW5rSGlzdG9yeShjb3VudFRpbWU/OnN0cmluZyl7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgZ2V0KCcvcmFuay9oaXN0b3J5Jywge2NvdW50VGltZX0pLnRoZW4oKHJlczogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXJlcy5jb2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXMpXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXMpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgIH0sXHJcbiAgICAvKirojrflj5bpppbpobXllYblk4HliJfooaggKi9cclxuICAgIGdldEdvb2RzTGlzdCgpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBnZXQoJy9nb29kcy9pbmRleCcsIHt9KS50aGVuKChyZXM6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9LFxyXG5cclxuICAgIC8qKuiOt+WPluWVhuWTgeivpuaDhVxyXG4gICAgICogQHBhcmFtIGdvb2RzSWQg5ZWG5ZOBaWRcclxuICAgICAqL1xyXG4gICAgZ2V0R29vZHNEZXRhaWxzKGdvb2RzSWQ6c3RyaW5nKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGdldCgnL2dvb2RzL2dldCcsIHsgZ29vZHNJZCB9KS50aGVuKChyZXM6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9LFxyXG5cclxuICAgIC8qKuiOt+WPluWPguS4juiusOW9lVxyXG4gICAgICogQHBhcmFtIHBhZ2UgW+mAieWhq10g6aG156CBMVxyXG4gICAgICogQHBhcmFtIHBhZ2VTaXplICBb6YCJ5aGrXSDliIbpobXmlbAg6buY6K6kMjBcclxuICAgICAqL1xyXG4gICAgZ2V0TXlPcmRlcnMocGFnZTpudW1iZXIgPSAxLHBhZ2VTaXplOm51bWJlciA9IDIwKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGdldCgnL29yZGVyL215T3JkZXJzJyx7cGFnZSxwYWdlU2l6ZX0pLnRoZW4oKHJlczphbnkpPT57XHJcbiAgICAgICAgICAgICAgICBpZiAoIXJlcy5jb2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXMpXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXMpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgIH0sXHJcbiAgICBcclxuICAgIC8qKuiOt+WPluW+gOacn+iusOW9lVxyXG4gICAgICogQHBhcmFtIHBhZ2UgW+mAieWhq10g6aG156CBMVxyXG4gICAgICogQHBhcmFtIHBhZ2VTaXplICBb6YCJ5aGrXSDliIbpobXmlbAg6buY6K6kMjBcclxuICAgICAqIEBwYXJhbSBjb3VudFRpbWUgW+mAieWhq10g5p+l6K+i5pe26Ze0XHJcbiAgICAgKiBAcGFyYW0gc2VhcmNoS2V5IFvpgInloatdIOafpeivouacn+WPt1xyXG4gICAgICovXHJcbiAgICBnZXRHb29kc0hpc3RvcnkocGFnZTpudW1iZXIgPSAxLHBhZ2VTaXplOm51bWJlciA9IDIwLGNvdW50VGltZT86c3RyaW5nLHNlYXJjaEtleT86c3RyaW5nKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGdldCgnL2dvb2RzL2hpc3RvcnknLHtwYWdlLHBhZ2VTaXplLGNvdW50VGltZSxzZWFyY2hLZXl9KS50aGVuKChyZXM6YW55KT0+e1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9LFxyXG5cclxuICAgIC8qKuiOt+WPluWVhuWTgeexu+WeiyAqL1xyXG4gICAgZ2V0R29vZHNDYXRlTGlzdCgpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XHJcbiAgICAgICAgICAgIGdldCgnL2dvb2RzL2NhdGVMaXN0Jyx7fSkudGhlbigocmVzOmFueSk9PntcclxuICAgICAgICAgICAgICAgIGlmICghcmVzLmNvZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlcylcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlcylcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9KVxyXG4gICAgfSxcclxuXHJcbiAgICAvKirojrflj5botbDlir9cclxuICAgICAqIEBwYXJhbSBnb29kc1R5cGUg5ZWG5ZOB57G75Z6LXHJcbiAgICAgKiBAcGFyYW0gcGFnZSBb6YCJ5aGrXSDpobXnoIExXHJcbiAgICAgKiBAcGFyYW0gcGFnZVNpemUgW+mAieWhq10g5YiG6aG15pWwIOm7mOiupDIwXHJcbiAgICAgKi9cclxuICAgIGdldEdvb2RzVHJlbmQoZ29vZHNUeXBlOnN0cmluZyxwYWdlOm51bWJlciA9IDEscGFnZVNpemU6bnVtYmVyID0gMjApe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XHJcbiAgICAgICAgICAgIGdldCgnL2dvb2RzL3RyZW5kJyx7Z29vZHNUeXBlLHBhZ2UscGFnZVNpemV9KS50aGVuKChyZXM6YW55KT0+e1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9LFxyXG5cclxuICAgIC8qKuiOt+WPluWWnOS7juWkqemZjeS4reWlluWQjeWNlVxyXG4gICAgICogQHBhcmFtIHBhZ2UgW+mAieWhq10g6aG156CBMVxyXG4gICAgICogQHBhcmFtIHBhZ2VTaXplICBb6YCJ5aGrXSDliIbpobXmlbAg6buY6K6kMjBcclxuICAgICAqL1xyXG4gICAgZ2V0WGN0akxpc3QocGFnZTpudW1iZXIgPSAxLHBhZ2VTaXplOm51bWJlciA9IDIwKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGdldCgnL1hjdGovYm9udXNMaXN0cycse3BhZ2UscGFnZVNpemV9KS50aGVuKChyZXM6YW55KT0+e1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9LFxyXG4gICAgXHJcbiAgICAvKirojrflj5blhaXlm7TlkI3ljZVcclxuICAgICAqIEBwYXJhbSBwYWdlIFvpgInloatdIOmhteeggTFcclxuICAgICAqIEBwYXJhbSBwYWdlU2l6ZSAgW+mAieWhq10g5YiG6aG15pWwIOm7mOiupDIwXHJcbiAgICAgKiBAcGFyYW0gZGF0ZSBb6YCJ5aGrXSDml7bpl7RcclxuICAgICAqL1xyXG4gICAgZ2V0U2hvcnRMaXN0ZWQocGFnZTpudW1iZXIgPSAxLHBhZ2VTaXplOm51bWJlciA9IDIwLGRhdGU/OnN0cmluZyl7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBnZXQoJy9YY3RqL3Nob3J0TGlzdGVkJyx7cGFnZSxwYWdlU2l6ZSxkYXRlfSkudGhlbigocmVzOmFueSk9PntcclxuICAgICAgICAgICAgICAgIGlmICghcmVzLmNvZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlcylcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlcylcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9KVxyXG4gICAgfSxcclxuXHJcbiAgICAvKirotK3kubBcclxuICAgICAqIEBwYXJhbSBwZXJpb2Qg5pyf5Y+3XHJcbiAgICAgKiBAcGFyYW0gY29kZUxpc3Qg5omA6YCJ5Y+356CBXHJcbiAgICAgKiBAcGFyYW0gZXhjaGFuZ2VQd2Qg5Lqk5piT5a+G56CBXHJcbiAgICAgKi9cclxuICAgIHBvc3RUcmFkZUJ1eShwZXJpb2Q6c3RyaW5nLGNvZGVMaXN0OnN0cmluZyxleGNoYW5nZVB3ZDpzdHJpbmcpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpID0+IHtcclxuICAgICAgICAgICAgcG9zdCgnL3RyYWRlL2J1eScsIHsgcGVyaW9kLGNvZGVMaXN0LGV4Y2hhbmdlUHdkIH0pLnRoZW4oKHJlczogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXJlcy5jb2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5nZXRVc2VySW5mbygpXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXMpXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXMpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgIH0sXHJcbn0iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDU6MDZcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDU6MDZcclxuICogQGRlc2MgYXhpb3PnvZHnu5zor7fmsYLlsIHoo4VcclxuICovXHJcbmltcG9ydCBheGlvcyBmcm9tIFwiYXhpb3NcIjtcclxuXHJcbmF4aW9zLmRlZmF1bHRzLnRpbWVvdXQgPSAxMDAwMDtcclxuYXhpb3MuZGVmYXVsdHMuaGVhZGVycy5wb3N0WydDb250ZW50LVR5cGUnXSA9ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnO1xyXG5heGlvcy5kZWZhdWx0cy53aXRoQ3JlZGVudGlhbHMgPSB0cnVlOyAgLy/or7fmsYLmkLrluKZjb29raWVcclxuLy8gYXhpb3MuZGVmYXVsdHMuY3Jvc3NEb21haW4gPSB0cnVlOyAgLy/or7fmsYLmkLrluKbpop3lpJbmlbDmja4o5LiN5YyF5ZCrY29va2llKVxyXG5heGlvcy5kZWZhdWx0cy5iYXNlVVJMID0gJ2h0dHBzOi8vdC1hcGkueHloai5pby92MS93L3poLydcclxuXHJcblxyXG5cclxuXHJcbi8qKuWwhnBvc3TmlbDmja7ovazkuLpmb3JtRGF0YeagvOW8jyAqL1xyXG5mdW5jdGlvbiBmb3JtRGF0YUZ1bmMocGFyYW1zOk9iamVjdCkge1xyXG4gIGNvbnN0IGZvcm0gPSBuZXcgRm9ybURhdGEoKTtcclxuICBmb3IgKGNvbnN0IGtleSBpbiBwYXJhbXMpIHtcclxuICAgIGZvcm0uYXBwZW5kKGtleSxwYXJhbXNba2V5XSk7XHJcbiAgfVxyXG4gIHJldHVybiBmb3JtXHJcbn1cclxuXHJcbi8qKua4uOaIj+W5s+WPsOaOpeWPoyAqL1xyXG5jb25zdCBnYW1lQ2VudGVyID0gWycvdXNlci9sb2dpbicsJy91c2VyL2dldEluZm8nXVxyXG5cclxuLy9odHRwIHJlcXVlc3Qg5oum5oiq5ZmoXHJcbmF4aW9zLmludGVyY2VwdG9ycy5yZXF1ZXN0LnVzZShcclxuICBjb25maWcgPT4ge1xyXG4gICAgLy/orr7nva5BSG9zdFxyXG4gICAgaWYgKGNvbmZpZy51cmwuaW5kZXhPZignL3VzZXIvJykgPj0gMCApIHtcclxuICAgICAgY29uZmlnLmhlYWRlcnNbJ0FIb3N0J10gPSAnZ2FtZUNlbnRlcidcclxuICAgIH1lbHNle1xyXG4gICAgICBjb25maWcuaGVhZGVyc1snQUhvc3QnXSA9ICdzdGFyUm9ja2V0JztcclxuICAgIH1cclxuXHJcbiAgICBpZiAoY29uZmlnLm1ldGhvZCA9PSAncG9zdCcpIHtcclxuICAgICAgY29uZmlnLmRhdGEgPSBmb3JtRGF0YUZ1bmMoe1xyXG4gICAgICAgIC4uLmNvbmZpZy5kYXRhXHJcbiAgICAgIH0pXHJcbiAgICB9ZWxzZSBpZihjb25maWcubWV0aG9kID09ICdnZXQnKXtcclxuICAgICAgY29uZmlnLnBhcmFtcyA9IHtcclxuICAgICAgICAuLi5jb25maWcucGFyYW1zLFxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gY29uZmlnO1xyXG4gIH0sXHJcbiAgZXJyb3IgPT4ge1xyXG4gICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGVycm9yKTtcclxuICB9XHJcbik7XHJcbi8vaHR0cCByZXNwb25zZSDmi6bmiKrlmahcclxuYXhpb3MuaW50ZXJjZXB0b3JzLnJlc3BvbnNlLnVzZShcclxuICByZXNwb25zZSA9PiB7XHJcbiAgICBpZiAoIXJlc3BvbnNlLmRhdGEuc3VjY2Vzcykge1xyXG4gICAgICAvL+mUmeivr+WkhOeQhlxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJlc3BvbnNlO1xyXG4gIH0sXHJcbiAgZXJyb3IgPT4ge1xyXG4gICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGVycm9yKTtcclxuICB9XHJcbik7XHJcblxyXG4vKipcclxuICog5bCB6KOFZ2V05pa55rOVXHJcbiAqIEBwYXJhbSB1cmxcclxuICogQHBhcmFtIGRhdGFcclxuICogQHJldHVybnMge1Byb21pc2V9XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0KHVybDpzdHJpbmcsIHBhcmFtczpPYmplY3QpIHtcclxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgYXhpb3MuZ2V0KHVybCwgeyBwYXJhbXMgfSkudGhlbihyZXNwb25zZSA9PiB7XHJcbiAgICAgIGlmICghcmVzcG9uc2UuZGF0YS5zdWNjZXNzKSB7XHJcbiAgICAgICAgcmVzb2x2ZShyZXNwb25zZS5kYXRhLmVycm9yKTtcclxuICAgICAgfWVsc2Uge1xyXG4gICAgICAgIHJlc29sdmUocmVzcG9uc2UuZGF0YS5wYXlsb2FkKTtcclxuICAgICAgfVxyXG4gICAgfSkuY2F0Y2goZXJyID0+IHtcclxuICAgICAgcmVqZWN0KGVycik7XHJcbiAgICB9KTtcclxuICB9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIOWwgeijhXBvc3Tor7fmsYJcclxuICogQHBhcmFtIHVybFxyXG4gKiBAcGFyYW0gZGF0YVxyXG4gKiBAcmV0dXJucyB7UHJvbWlzZX1cclxuICovXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcG9zdCh1cmw6c3RyaW5nLCBkYXRhOk9iamVjdCkge1xyXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICBheGlvcy5wb3N0KHVybCwgZGF0YSkudGhlbihcclxuICAgICAgcmVzcG9uc2UgPT4ge1xyXG4gICAgICAgIGlmICghcmVzcG9uc2UuZGF0YS5zdWNjZXNzKSB7XHJcbiAgICAgICAgICByZXNvbHZlKHJlc3BvbnNlLmRhdGEuZXJyb3IpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICByZXNvbHZlKHJlc3BvbnNlLmRhdGEucGF5bG9hZCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG4gICAgICBlcnIgPT4ge1xyXG4gICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICB9XHJcbiAgICApO1xyXG4gIH0pO1xyXG59XHJcbiIsImltcG9ydCB7IEdhbWVNb2RlbCB9IGZyb20gXCIuL0dhbWVNb2RlbFwiO1xyXG5cclxuLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTIxIDExOjQ2OjE1XHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTIxIDExOjQ2OjE1XHJcbiAqIEBkZXNjIHdlYnNvY2tldOi/nuaOpVxyXG4gKi9cclxuXHJcbi8ve1wiYXBwSWRcIjpcImx1Y2t5cm9ja2V0XCIsXCJldmVudFwiOlt7XCJ0b2dnbGVcIjowLFwidHlwZVwiOlwidHlwZV92YWx1ZVwiLFwiZXhwaXJlVGltZVwiOjB9XX1cclxuXHJcbmV4cG9ydCBjbGFzcyBTb2NrZXQgZXh0ZW5kcyBMYXlhLlVJQ29tcG9uZW50IHtcclxuICAgIFxyXG4gICAgc3RhdGljIFdTX1VSTDogc3RyaW5nID0gYHdzczovL3Qtd3NzLnh5aGouaW8vd3M/YXBwaWQ9bHVja3lyb2NrZXRBcHBgXHJcbiAgICBzdGF0aWMgV1M6IGFueSA9ICcnO1xyXG4gICAgLyoqMzDnp5LkuIDmrKHlv4Pot7MgKi9cclxuICAgIHN0YXRpYyBzZXRJbnRlcnZhbFdlc29ja2V0UHVzaDphbnkgPSBudWxsOyBcclxuXHJcbiAgICAvKirlu7rnq4vov57mjqUgKi9cclxuICAgIHN0YXRpYyBjcmVhdGVTb2NrZXQoKSB7XHJcbiAgICAgICAgY29uc3QgdXNlckluZm86YW55ID0gR2FtZU1vZGVsLmdldEluc3RhbmNlKCkudXNlckluZm87XHJcbiAgICAgICAgaWYgKHVzZXJJbmZvLnVzZXJJZCkge1xyXG4gICAgICAgICAgICBTb2NrZXQuV1NfVVJMID0gU29ja2V0LldTX1VSTCArIGAmdWlkPSR7dXNlckluZm8udXNlcklkfWBcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCFTb2NrZXQuV1MpIHtcclxuICAgICAgICAgICAgLy8gU29ja2V0LldTLmNsb3NlKClcclxuICAgICAgICAgICAgU29ja2V0LldTID0gbmV3IFdlYlNvY2tldChTb2NrZXQuV1NfVVJMKVxyXG4gICAgICAgICAgICBTb2NrZXQuV1Mub25vcGVuID0gU29ja2V0Lm9ub3BlbldTO1xyXG4gICAgICAgICAgICBTb2NrZXQuV1Mub25tZXNzYWdlID0gU29ja2V0Lm9ubWVzc2FnZVdTO1xyXG4gICAgICAgICAgICBTb2NrZXQuV1Mub25lcnJvciA9IFNvY2tldC5vbmVycm9yV1M7XHJcbiAgICAgICAgICAgIFNvY2tldC5XUy5vbmNsb3NlID0gU29ja2V0Lm9uY2xvc2VXUztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvKirmiZPlvIBXU+S5i+WQjuWPkemAgeW/g+i3syAqL1xyXG4gICAgc3RhdGljIG9ub3BlbldTKCkge1xyXG4gICAgICAgIFNvY2tldC5zZW5kUGluZygpOyAvL+WPkemAgeW/g+i3s1xyXG4gICAgfVxyXG4gICAgLyoq6L+e5o6l5aSx6LSl6YeN6L+eICovXHJcbiAgICBzdGF0aWMgb25lcnJvcldTKCkge1xyXG4gICAgICAgIFNvY2tldC5XUy5jbG9zZSgpO1xyXG4gICAgICAgIFNvY2tldC5jcmVhdGVTb2NrZXQoKTsgLy/ph43ov55cclxuICAgIH1cclxuICAgIC8qKldT5pWw5o2u5o6l5pS257uf5LiA5aSE55CGICovXHJcbiAgICBzdGF0aWMgb25tZXNzYWdlV1MoZTogYW55KSB7XHJcbiAgICAgICAgbGV0IHJlZGF0YTphbnk7XHJcbiAgICAgICAgbGV0IHBheWxvYWQ6YW55O1xyXG4gICAgICAgIGlmIChlLmRhdGEgPT09ICdvaycgfHwgZS5kYXRhID09PSAncG9uZycpIHtcclxuICAgICAgICAgICAgcmVkYXRhID0gZS5kYXRhOyAvLyDmlbDmja5cclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgcmVkYXRhID0gSlNPTi5wYXJzZShlLmRhdGEpOyAvLyDmlbDmja5cclxuICAgICAgICAgICAgcGF5bG9hZCA9IHJlZGF0YS5wYXlsb2FkO1xyXG4gICAgICAgICAgICAvLyDkuIvlj5HotK3kubDlj7fnoIFcclxuICAgICAgICAgICAgaWYgKHBheWxvYWQudHlwZSA9PT0gJ3B1cmNoYXNlZCcpIHtcclxuICAgICAgICAgICAgICAgIEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLnNldEdvb2RzQXJyKHBheWxvYWQuZ29vZHMpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8g5LiL5Y+R6aaW6aG15pWw5o2uXHJcbiAgICAgICAgICAgIGlmIChwYXlsb2FkLnR5cGUgPT09ICdpbmRleCcpIHtcclxuICAgICAgICAgICAgICAgIC8vIOWIt+aWsOeBq+eureaVsOaNrlxyXG4gICAgICAgICAgICAgICAgR2FtZU1vZGVsLmdldEluc3RhbmNlKCkuc2V0Um9ja2V0RGF0YShwYXlsb2FkLnJhbmtpbmcpXHJcbiAgICAgICAgICAgICAgICAvLyDmmK/lkKblvIDlpZbkuoZcclxuICAgICAgICAgICAgICAgIGlmIChwYXlsb2FkLnRvZ2dsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLmlzVG9nZ2xlKHRydWUpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8g5LiL5Y+R5Lit5aWW5ZCN5Y2VXHJcbiAgICAgICAgICAgIGlmIChwYXlsb2FkLnR5cGUgPT09ICd3aW5uaW5nJykge1xyXG4gICAgICAgICAgICAgICAgR2FtZU1vZGVsLmdldEluc3RhbmNlKCkubm90aWNlRnVuYyh0cnVlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLyoq5Y+R6YCB5pWw5o2uICovXHJcbiAgICBzdGF0aWMgc2VuZFdTUHVzaCh0eXBlPzogYW55LHRvZ2dsZTphbnkgPSAxKSB7XHJcbiAgICAgICAgaWYgKFNvY2tldC5XUyAhPT0gbnVsbCAmJiBTb2NrZXQuV1MucmVhZHlTdGF0ZSA9PT0gMykge1xyXG4gICAgICAgICAgICBTb2NrZXQuV1MuY2xvc2UoKTtcclxuICAgICAgICAgICAgU29ja2V0LmNyZWF0ZVNvY2tldCgpOy8v6YeN6L+eXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbGV0IG9iaiA9IHtcclxuICAgICAgICAgICAgICAgIFwiYXBwSWRcIjogXCJsdWNreXJvY2tldEFwcFwiLCBcclxuICAgICAgICAgICAgICAgIFwiZXZlbnRcIjogW1xyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IHR5cGUsIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBcInRvZ2dsZVwiOiB0b2dnbGUsIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBcImV4cGlyZVRpbWVcIjogMTgwMFxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBTb2NrZXQuV1Muc2VuZChKU09OLnN0cmluZ2lmeShvYmopKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8qKuWFs+mXrVdTICovXHJcbiAgICBzdGF0aWMgb25jbG9zZVdTKCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCfmlq3lvIDov57mjqUnKTtcclxuICAgIH1cclxuICAgIC8qKuWPkemAgeW/g+i3syAqL1xyXG4gICAgc3RhdGljIHNlbmRQaW5nKCl7XHJcbiAgICAgICAgU29ja2V0LldTLnNlbmQoJ3BpbmcnKTtcclxuICAgICAgICBTb2NrZXQuc2V0SW50ZXJ2YWxXZXNvY2tldFB1c2ggPSBzZXRJbnRlcnZhbCgoKSA9PiB7XHJcbiAgICAgICAgICAgIFNvY2tldC5XUy5zZW5kKCdwaW5nJyk7XHJcbiAgICAgICAgfSwgMzAwMDApXHJcbiAgICB9XHJcbn1cclxuXHJcbiIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0NToyOFxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0NToyOFxyXG4gKiBAZGVzYyDlt6Xlhbflh73mlbDpm4blkIhcclxuICovXHJcbmV4cG9ydCBkZWZhdWx0IHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIOWNg+WIhuS9jeagvOW8j+WMllxyXG4gICAgICogQHBhcmFtIHtudW1iZXIgfCBzdHJpbmd9IG51bSDmoLzlvI/ljJbmlbDlrZdcclxuICAgICAqL1xyXG4gICAgY29tZGlmeShudW06IGFueSkge1xyXG4gICAgICAgIHJldHVybiBudW0udG9TdHJpbmcoKS5yZXBsYWNlKC9cXGQrLywgZnVuY3Rpb24gKG4pIHsgLy8g5YWI5o+Q5Y+W5pW05pWw6YOo5YiGXHJcbiAgICAgICAgICAgIHJldHVybiBuLnJlcGxhY2UoLyhcXGQpKD89KFxcZHszfSkrJCkvZywgZnVuY3Rpb24gKCQxKSB7IC8vIOWvueaVtOaVsOmDqOWIhua3u+WKoOWIhumalOesplxyXG4gICAgICAgICAgICAgICAgcmV0dXJuICQxICsgXCIsXCI7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIOWkjeWItlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNvcHlJbmZvIOWkjeWItuWGheWuuVxyXG4gICAgICovXHJcbiAgICBDb3B5KGNvcHlJbmZvOiBhbnkpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBsZXQgY29weVVybCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiKTsgLy/liJvlu7rkuIDkuKppbnB1dOahhuiOt+WPlumcgOimgeWkjeWItueahOaWh+acrOWGheWuuVxyXG4gICAgICAgICAgICBjb3B5VXJsLnZhbHVlID0gY29weUluZm87XHJcbiAgICAgICAgICAgIGxldCBhcHBEaXYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXBwJyk7XHJcbiAgICAgICAgICAgIGFwcERpdi5hcHBlbmRDaGlsZChjb3B5VXJsKTtcclxuICAgICAgICAgICAgY29weVVybC5zZWxlY3QoKTtcclxuICAgICAgICAgICAgZG9jdW1lbnQuZXhlY0NvbW1hbmQoXCJDb3B5XCIpO1xyXG4gICAgICAgICAgICBjb3B5VXJsLnJlbW92ZSgpXHJcbiAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XHJcbiAgICAgICAgfSlcclxuICAgIH0sXHJcblxyXG4gICAgLyoqIOWIpOaWreaYr+WQpuS4uuaJi+acuiovXHJcbiAgICBpc1Bob25lKG51bTogYW55KSB7XHJcbiAgICAgICAgdmFyIHJlZyA9IC9eMVszNDU2Nzg5XVxcZHs5fSQvO1xyXG4gICAgICAgIHJldHVybiByZWcudGVzdChudW0pO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIOWAkuiuoeaXtlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmcgfCBudW1iZXJ9IHRpbWVzIOWJqeS9meavq+enkuaVsCBcclxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIOWbnuiwg+WHveaVsFxyXG4gICAgICovXHJcbiAgICBjb3VudERvd24odGltZXM6IGFueSwgY2FsbGJhY2s6IGFueSkge1xyXG4gICAgICAgIGxldCB0aW1lciA9IG51bGw7XHJcbiAgICAgICAgdGltZXIgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XHJcbiAgICAgICAgICAgIGlmICh0aW1lcyA+IDApIHtcclxuICAgICAgICAgICAgICAgIGxldCBkYXk6IGFueSA9IE1hdGguZmxvb3IodGltZXMgLyAoNjAgKiA2MCAqIDI0KSk7XHJcbiAgICAgICAgICAgICAgICBsZXQgaG91cjogYW55ID0gTWF0aC5mbG9vcih0aW1lcyAvICg2MCAqIDYwKSkgLSAoZGF5ICogMjQpO1xyXG4gICAgICAgICAgICAgICAgbGV0IG1pbnV0ZTogYW55ID0gTWF0aC5mbG9vcih0aW1lcyAvIDYwKSAtIChkYXkgKiAyNCAqIDYwKSAtIChob3VyICogNjApO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNlY29uZDogYW55ID0gTWF0aC5mbG9vcih0aW1lcykgLSAoZGF5ICogMjQgKiA2MCAqIDYwKSAtIChob3VyICogNjAgKiA2MCkgLSAobWludXRlICogNjApO1xyXG4gICAgICAgICAgICAgICAgZGF5ID0gYCR7ZGF5IDwgMTAgPyAnMCcgOiAnJ30ke2RheX1gO1xyXG4gICAgICAgICAgICAgICAgaG91ciA9IGAke2hvdXIgPCAxMCA/ICcwJyA6ICcnfSR7aG91cn1gO1xyXG4gICAgICAgICAgICAgICAgbWludXRlID0gYCR7bWludXRlIDwgMTAgPyAnMCcgOiAnJ30ke21pbnV0ZX1gO1xyXG4gICAgICAgICAgICAgICAgc2Vjb25kID0gYCR7c2Vjb25kIDwgMTAgPyAnMCcgOiAnJ30ke3NlY29uZH1gO1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2soYCR7aG91cn06JHttaW51dGV9OiR7c2Vjb25kfWApXHJcbiAgICAgICAgICAgICAgICB0aW1lcy0tO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aW1lcik7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sIDEwMDApO1xyXG4gICAgICAgIGlmICh0aW1lcyA8PSAwKSB7XHJcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGltZXIpO1xyXG4gICAgICAgICAgICBjYWxsYmFjayhmYWxzZSlcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5bCG5qC85byP5YyW5pel5pyf6L2s5o2i5oiQ5pe26Ze05oizXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbXlEYXRlIOagvOW8j+WMluaXpeacn1xyXG4gICAgICovXHJcbiAgICBmb3JtYXREYXRlKHg6IGFueSwgeTogYW55KSB7XHJcbiAgICAgICAgaWYgKCEoeCBpbnN0YW5jZW9mIERhdGUpKSB7XHJcbiAgICAgICAgICAgIHZhciBkYXRlID0gbmV3IERhdGUoKTtcclxuICAgICAgICAgICAgZGF0ZS5zZXRUaW1lKHggKiAxMDAwKTtcclxuICAgICAgICAgICAgeCA9IGRhdGU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciB6ID0ge1xyXG4gICAgICAgICAgICB5OiB4LmdldEZ1bGxZZWFyKCksXHJcbiAgICAgICAgICAgIE06IHguZ2V0TW9udGgoKSArIDEsXHJcbiAgICAgICAgICAgIGQ6IHguZ2V0RGF0ZSgpLFxyXG4gICAgICAgICAgICBoOiB4LmdldEhvdXJzKCksXHJcbiAgICAgICAgICAgIG06IHguZ2V0TWludXRlcygpLFxyXG4gICAgICAgICAgICBzOiB4LmdldFNlY29uZHMoKVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmV0dXJuIHkucmVwbGFjZSgvKHkrfE0rfGQrfGgrfG0rfHMrKS9nLCBmdW5jdGlvbiAodikge1xyXG4gICAgICAgICAgICByZXR1cm4gKCh2Lmxlbmd0aCA+IDEgPyBcIjBcIiA6IFwiXCIpICsgZXZhbChcInouXCIgKyB2LnNsaWNlKC0xKSkpLnNsaWNlKFxyXG4gICAgICAgICAgICAgICAgLSh2Lmxlbmd0aCA+IDIgPyB2Lmxlbmd0aCA6IDIpXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9LFxyXG4gICAgLyoqXHJcbiAgICog5bCG5pe26Ze05oiz6L2s5o2i5oiQ5qC85byP5YyW5pel5pyfXHJcbiAgICogQHBhcmFtIHtzdHJpbmd9IHRpbWVTdGFtcCDml7bpl7TmiLNcclxuICAgKi9cclxuICAgIGZvcm1hdERhdGVUaW1lKHRpbWVTdGFtcCkge1xyXG4gICAgICAgIHZhciBkYXRlID0gbmV3IERhdGUoKTtcclxuICAgICAgICBkYXRlLnNldFRpbWUodGltZVN0YW1wICogMTAwMCk7XHJcbiAgICAgICAgdmFyIHkgPSBkYXRlLmdldEZ1bGxZZWFyKCk7XHJcbiAgICAgICAgdmFyIG06c3RyaW5nIHwgbnVtYmVyID0gZGF0ZS5nZXRNb250aCgpICsgMTtcclxuICAgICAgICBtID0gbSA8IDEwID8gKCcwJyArIG0pIDogbTtcclxuICAgICAgICB2YXIgZDpzdHJpbmcgfCBudW1iZXIgPSBkYXRlLmdldERhdGUoKTtcclxuICAgICAgICBkID0gZCA8IDEwID8gKCcwJyArIGQpIDogZDtcclxuICAgICAgICB2YXIgaDpzdHJpbmcgfCBudW1iZXIgPSBkYXRlLmdldEhvdXJzKCk7XHJcbiAgICAgICAgaCA9IGggPCAxMCA/ICgnMCcgKyBoKSA6IGg7XHJcbiAgICAgICAgdmFyIG1pbnV0ZTpzdHJpbmcgfCBudW1iZXIgPSBkYXRlLmdldE1pbnV0ZXMoKTtcclxuICAgICAgICB2YXIgc2Vjb25kOnN0cmluZyB8IG51bWJlciA9IGRhdGUuZ2V0U2Vjb25kcygpO1xyXG4gICAgICAgIG1pbnV0ZSA9IG1pbnV0ZSA8IDEwID8gKCcwJyArIG1pbnV0ZSkgOiBtaW51dGU7XHJcbiAgICAgICAgc2Vjb25kID0gc2Vjb25kIDwgMTAgPyAoJzAnICsgc2Vjb25kKSA6IHNlY29uZDtcclxuICAgICAgICByZXR1cm4geSArICctJyArIG0gKyAnLScgKyBkICsgJyAnICsgaCArICc6JyArIG1pbnV0ZSArICc6JyArIHNlY29uZDtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiDkv53nlZlu5L2N5bCP5pWwICBcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nIHwgbnVtYmVyfSBjbnVtIOmcgOimgeS/neeVmeeahOaVsOaNrlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNpbmRleCDkv53nlZnnmoTlsI/mlbDkvY3mlbBcclxuICAgICAqL1xyXG4gICAgdG9EZWNpbWFsKGNudW06IGFueSwgY2luZGV4OiBhbnkpIHtcclxuICAgICAgICBsZXQgdmFsdWUgPSBTdHJpbmcoY251bSk7XHJcbiAgICAgICAgaWYgKHZhbHVlLmluZGV4T2YoXCIuXCIpID4gMCkge1xyXG4gICAgICAgICAgICB2YXIgbGVmdCA9IHZhbHVlLnN1YnN0cigwLCB2YWx1ZS5pbmRleE9mKFwiLlwiKSk7XHJcbiAgICAgICAgICAgIHZhciByaWdodCA9IHZhbHVlLnN1YnN0cih2YWx1ZS5pbmRleE9mKFwiLlwiKSArIDEsIHZhbHVlLmxlbmd0aCk7XHJcbiAgICAgICAgICAgIGlmIChyaWdodC5sZW5ndGggPiBjaW5kZXgpIHtcclxuICAgICAgICAgICAgICAgIHJpZ2h0ID0gcmlnaHQuc3Vic3RyKDAsIGNpbmRleCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFsdWUgPSBsZWZ0ICsgXCIuXCIgKyByaWdodDtcclxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBjbnVtO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgLyoq5Yqg5rOV6L+Q566XICovXHJcbiAgICBhY2NBZGQoYXJnMSxhcmcyKXtcclxuICAgICAgICBsZXQgcjEscjIsbTtcclxuICAgICAgICB0cnl7cjE9YXJnMS50b1N0cmluZygpLnNwbGl0KFwiLlwiKVsxXS5sZW5ndGh9Y2F0Y2goZSl7cjE9MH1cclxuICAgICAgICB0cnl7cjI9YXJnMi50b1N0cmluZygpLnNwbGl0KFwiLlwiKVsxXS5sZW5ndGh9Y2F0Y2goZSl7cjI9MH1cclxuICAgICAgICBtPU1hdGgucG93KDEwLE1hdGgubWF4KHIxLHIyKSlcclxuICAgICAgICByZXR1cm4gKGFyZzEqbSthcmcyKm0pL21cclxuICAgIH0sXHJcbiAgICAvKirlh4/ms5Xov5DnrpcgKi9cclxuICAgIGFjY1N1YihhcmcxLGFyZzIpe1xyXG4gICAgICAgIGxldCByMSxyMixtLG47XHJcbiAgICAgICAgdHJ5e3IxPWFyZzEudG9TdHJpbmcoKS5zcGxpdChcIi5cIilbMV0ubGVuZ3RofWNhdGNoKGUpe3IxPTB9XHJcbiAgICAgICAgdHJ5e3IyPWFyZzIudG9TdHJpbmcoKS5zcGxpdChcIi5cIilbMV0ubGVuZ3RofWNhdGNoKGUpe3IyPTB9XHJcbiAgICAgICAgbT1NYXRoLnBvdygxMCxNYXRoLm1heChyMSxyMikpO1xyXG4gICAgICAgIG49KHIxPj1yMik/cjE6cjI7XHJcbiAgICAgICAgcmV0dXJuICgoYXJnMSptLWFyZzIqbSkvbSkudG9GaXhlZChuKTtcclxuICAgIH0sXHJcbiAgICAvKirpmaTms5Xov5DnrpcgKi9cclxuICAgIGFjY0RpdihhcmcxLGFyZzIpe1xyXG4gICAgICAgIGxldCB0MT0wLHQyPTAscjEscjI7XHJcbiAgICAgICAgdHJ5e3QxPWFyZzEudG9TdHJpbmcoKS5zcGxpdChcIi5cIilbMV0ubGVuZ3RofWNhdGNoKGUpe307XHJcbiAgICAgICAgdHJ5e3QyPWFyZzIudG9TdHJpbmcoKS5zcGxpdChcIi5cIilbMV0ubGVuZ3RofWNhdGNoKGUpe307XHJcbiAgICAgICAgcjE9TnVtYmVyKGFyZzEudG9TdHJpbmcoKS5yZXBsYWNlKFwiLlwiLFwiXCIpKVxyXG4gICAgICAgIHIyPU51bWJlcihhcmcyLnRvU3RyaW5nKCkucmVwbGFjZShcIi5cIixcIlwiKSlcclxuICAgICAgICByZXR1cm4gKHIxL3IyKSpNYXRoLnBvdygxMCx0Mi10MSk7XHJcbiAgICB9LFxyXG4gICAgLyoq5LmY5rOV6L+Q566XICovXHJcbiAgICBhY2NNdWwoYXJnMSxhcmcyKXtcclxuICAgICAgICBsZXQgbT0wLHMxPWFyZzEudG9TdHJpbmcoKSxzMj1hcmcyLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgdHJ5e20rPXMxLnNwbGl0KFwiLlwiKVsxXS5sZW5ndGh9Y2F0Y2goZSl7fVxyXG4gICAgICAgIHRyeXttKz1zMi5zcGxpdChcIi5cIilbMV0ubGVuZ3RofWNhdGNoKGUpe31cclxuICAgICAgICByZXR1cm4gTnVtYmVyKHMxLnJlcGxhY2UoXCIuXCIsXCJcIikpKk51bWJlcihzMi5yZXBsYWNlKFwiLlwiLFwiXCIpKS9NYXRoLnBvdygxMCxtKVxyXG4gICAgfSxcclxufVxyXG4iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDU6NDZcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDU6NDZcclxuICogQGRlc2Mg6aG16Z2i6Lez6L2s6ISa5pys77yM55So5LqO57yW6L6R5qih5byP5o+S5YWlXHJcbiAqL1xyXG5pbXBvcnQgeyBUYWJiYXIgfSBmcm9tIFwiLi4vdmlldy9UYWJiYXJcIjtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBhZ2VOYXZTY3JpcHQgZXh0ZW5kcyBMYXlhLlNjcmlwdCB7XHJcbiAgICAvKiogQHByb3Age25hbWU6bmF2UGFnZVNjcmlwdCx0aXBzOifopoHot7PovaznmoRzY2VuZScsdHlwZTpTdHJpbmcsZGVmYXVsdDonJ30gKi9cclxuICAgIHB1YmxpYyBuYXZQYWdlU2NyaXB0OnN0cmluZyA9ICcnO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCl7c3VwZXIoKX1cclxuXHJcbiAgICBvbkNsaWNrKCk6dm9pZCB7XHJcbiAgICAgICAgVGFiYmFyLmdldEluc3RhbmNlKCkub3BlblNjZW5lKHRoaXMubmF2UGFnZVNjcmlwdClcclxuICAgIH1cclxufSIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0NjowOFxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0NjowOFxyXG4gKiBAZGVzYyDpobXpnaLot7PovaznsbvvvIzlnKjku6PnoIHkuK3kvb/nlKhcclxuICovXHJcbmltcG9ydCB7IFRhYmJhciB9IGZyb20gJy4uL3ZpZXcvVGFiYmFyJ1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGFnZVNjcmlwdCBleHRlbmRzIExheWEuU2NyaXB0IHtcclxuICAgIC8qKiBAcHJvcCB7bmFtZTpzaG93VGFiLHRpcHM6J+aYr+WQpuaciVRhYmJhcicsdHlwZTpCb29sLGRlZmF1bHQ6dHJ1ZX0gKi9cclxuICAgIHB1YmxpYyBzaG93VGFiOmJvb2xlYW4gPSB0cnVlO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCl7c3VwZXIoKTt9XHJcblxyXG4gICAgb25FbmFibGUoKTp2b2lkIHtcclxuICAgICAgICBpZiAodGhpcy5zaG93VGFiKSB7XHJcbiAgICAgICAgICAgIFRhYmJhci5zaG93KClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgb25EaXNhYmxlKCk6dm9pZCB7XHJcbiAgICAgICAgVGFiYmFyLmhpZGUoKVxyXG4gICAgfVxyXG59IiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ2OjMwXHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ2OjMwXHJcbiAqIEBkZXNjIOWxj+W5leiHqumAguW6lOiEmuacrFxyXG4gKi9cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU2NyZWVuIGV4dGVuZHMgTGF5YS5TY3JpcHQge1xyXG4gICAgLyoqIEBwcm9wIHtuYW1lOmJnQ29sb3IsdGlwczon6IOM5pmv6aKc6ImyJywndHlwZTpTdHJpbmcsZGVmYXVsdDonIzBhMDczOCd9ICovXHJcbiAgICBwdWJsaWMgYmdDb2xvcjpzdHJpbmcgPSAnIzBhMDczOCdcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcigpe3N1cGVyKCk7fVxyXG5cclxuICAgIG9uRW5hYmxlKCk6dm9pZCB7XHJcbiAgICAgICBMYXlhLnN0YWdlLm9uKExheWEuRXZlbnQuUkVTSVpFLHRoaXMsdGhpcy5vblJlc2l6ZSlcclxuICAgICAgIHRoaXMub25SZXNpemUoKVxyXG4gICAgfVxyXG5cclxuICAgIG9uRGlzYWJsZSgpOnZvaWQge1xyXG4gICAgICAgIExheWEuc3RhZ2Uub2ZmKExheWEuRXZlbnQuUkVTSVpFLHRoaXMsdGhpcy5vblJlc2l6ZSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uUmVzaXplKCk6dm9pZCB7XHJcbiAgICAgICAgY29uc3QgX3RoYXQgPSAodGhpcy5vd25lciBhcyBMYXlhLlNwcml0ZSk7XHJcbiAgICAgICAgX3RoYXQud2lkdGggPSBMYXlhLnN0YWdlLndpZHRoO1xyXG4gICAgICAgIF90aGF0LmhlaWdodCA9IExheWEuc3RhZ2UuaGVpZ2h0O1xyXG4gICAgICAgIF90aGF0LmdyYXBoaWNzLmRyYXdSZWN0KDAsMCxMYXlhLnN0YWdlLndpZHRoLExheWEuc3RhZ2UuaGVpZ2h0LHRoaXMuYmdDb2xvcik7XHJcbiAgICAgICBcclxuICAgIH1cclxufSIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0yMSAxNjozNDoyMVxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yMSAxNjozNDoyMVxyXG4gKiBAZGVzYyDliqnmiYvpobXpnaLohJrmnKxcclxuICovXHJcblxyXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcclxuaW1wb3J0IGFwaSBmcm9tIFwiLi4vanMvYXBpXCI7XHJcbmltcG9ydCB7IFRvYXN0IH0gZnJvbSBcIi4uL3ZpZXcvVG9hc3RcIjtcclxuXHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBc3Npc3RhbnQgZXh0ZW5kcyB1aS5hc3Npc3RhbnRVSSB7XHJcbiAgICBwcml2YXRlIGNhdGVMaXN0QXJyOmFueSA9IFtdO1xyXG4gICAgcHJpdmF0ZSBzZWxlY3RHb29kc1R5cGU6c3RyaW5nID0gJyc7XHJcbiAgICBwcml2YXRlIHRhYlR5cGU6bnVtYmVyID0gMTtcclxuICAgIGNvbnN0cnVjdG9yKCl7XHJcbiAgICAgICAgc3VwZXIoKVxyXG4gICAgICAgIHRoaXMuYnRuX3RyZW5kLm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLnRhYlN3aXRjaCxbMV0pXHJcbiAgICAgICAgdGhpcy5idG5fcHJlYnV5Lm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLnRhYlN3aXRjaCxbMl0pXHJcbiAgICAgICAgdGhpcy5vbihMYXlhLkV2ZW50LlJFU0laRSx0aGlzLHRoaXMub25SZXNpemUpXHJcbiAgICB9XHJcblxyXG4gICAgb25FbmFibGUoKTp2b2lkeyAgXHJcbiAgICAgICAgdGhpcy5nZXRHb29kc0NhdGVMaXN0KClcclxuICAgICAgICB0aGlzLmNhdGVTd2l0Y2goKVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvKirojrflj5bllYblk4HnsbvlnosgKi9cclxuICAgIHByaXZhdGUgZ2V0R29vZHNDYXRlTGlzdCgpe1xyXG4gICAgICAgIGFwaS5nZXRHb29kc0NhdGVMaXN0KCkudGhlbigocmVzOmFueSk9PntcclxuICAgICAgICAgICAgdGhpcy5jYXRlTGlzdEFyciA9IHJlcztcclxuICAgICAgICAgICAgY29uc3QgR29vZHNOYW1lQXJyOnN0cmluZ1tdID0gW107XHJcbiAgICAgICAgICAgIHJlcy5mb3JFYWNoKChpdGVtOmFueSk9PntcclxuICAgICAgICAgICAgICAgIEdvb2RzTmFtZUFyci5wdXNoKGl0ZW0uZ29vZHNOYW1lKVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB0aGlzLmNhdGVUYWJMaXN0LnJlcGVhdFggPSBHb29kc05hbWVBcnIubGVuZ3RoO1xyXG4gICAgICAgICAgICB0aGlzLmNhdGVUYWJMaXN0LmFycmF5ID0gR29vZHNOYW1lQXJyO1xyXG4gICAgICAgICAgICB0aGlzLmNhdGVUYWJMaXN0LnNlbGVjdGVkSW5kZXggPSAwO1xyXG4gICAgICAgIH0pLmNhdGNoKChlcnI6YW55KT0+e1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIubWVzc2FnZSk7XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcblxyXG4gICAgLyoq6I635Y+W6LWw5Yq/5YiX6KGoICovXHJcbiAgICBwcml2YXRlIGdldEdvb2RzVHJlbmQoZ29vZHNUeXBlOnN0cmluZyl7XHJcbiAgICAgICAgYXBpLmdldEdvb2RzVHJlbmQoZ29vZHNUeXBlKS50aGVuKChyZXM6YW55KT0+e1xyXG4gICAgICAgICAgICB0aGlzLnRyZW5kTGlzdC5hcnJheSA9IHJlcztcclxuICAgICAgICAgICAgdGhpcy50cmVuZExpc3QudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgfSkuY2F0Y2goKGVycjphbnkpPT57XHJcbiAgICAgICAgICAgIHRoaXMubm9EYXRhLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIubWVzc2FnZSk7XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIOWIh+aNouWIl+ihqFxyXG4gICAgICogQHBhcmFtIHR5cGUgMTrotbDlir/liIbmnpAgIDLvvJrpooTotK1cclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSB0YWJTd2l0Y2godHlwZTpudW1iZXIpe1xyXG4gICAgICAgIGlmICh0eXBlID09PSAyKSB7XHJcbiAgICAgICAgICAgIFRvYXN0LnNob3coJ+aaguacquW8gOaUvu+8jOaVrOivt+acn+W+hScpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIHRoaXMudGFiVHlwZSA9IHR5cGU7XHJcbiAgICAgICAgLy8gdGhpcy5jYXRlVGFiTGlzdC5zZWxlY3RlZEluZGV4ID0gMDtcclxuICAgICAgICAvLyBpZiAodGhpcy50YWJUeXBlID09PSAxKSB7XHJcbiAgICAgICAgLy8gICAgIHRoaXMuYnRuX3RyZW5kLnNraW4gPSAnY29tcC9ndWVzc2luZy9pbWdfdGFiX2FjdGl2ZS5wbmcnO1xyXG4gICAgICAgIC8vICAgICB0aGlzLmJ0bl9wcmVidXkuc2tpbiA9ICdjb21wL2d1ZXNzaW5nL2ltZ190YWIucG5nJztcclxuICAgICAgICAvLyAgICAgdGhpcy5saXN0VGl0bGUudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgLy8gICAgIGlmICh0aGlzLnRyZW5kTGlzdC5hcnJheSA9PT0gbnVsbCB8fCB0aGlzLnRyZW5kTGlzdC5hcnJheS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAvLyAgICAgICAgIHRoaXMubm9EYXRhLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgIC8vICAgICB9ZWxzZSB7XHJcbiAgICAgICAgLy8gICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgLy8gICAgICAgICB0aGlzLnRyZW5kTGlzdC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAvLyAgICAgfVxyXG4gICAgICAgIC8vICAgICB0aGlzLnByZWJ1eS5zY3JvbGxUbygwKVxyXG4gICAgICAgIC8vICAgICB0aGlzLnByZWJ1eS52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgLy8gfWVsc2V7XHJcbiAgICAgICAgLy8gICAgIHRoaXMuYnRuX3ByZWJ1eS5za2luID0gJ2NvbXAvZ3Vlc3NpbmcvaW1nX3RhYl9hY3RpdmUucG5nJztcclxuICAgICAgICAvLyAgICAgdGhpcy5idG5fdHJlbmQuc2tpbiA9ICdjb21wL2d1ZXNzaW5nL2ltZ190YWIucG5nJztcclxuICAgICAgICAvLyAgICAgdGhpcy5saXN0VGl0bGUudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICAgIC8vICAgICBpZiAodGhpcy5wcmVidXkuYXJyYXkgPT09IG51bGwgfHwgdGhpcy5wcmVidXkuYXJyYXkubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgLy8gICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAvLyAgICAgfWVsc2Uge1xyXG4gICAgICAgIC8vICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICAgIC8vICAgICAgICAgdGhpcy5wcmVidXkudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgLy8gICAgIH1cclxuICAgICAgICAvLyAgICAgdGhpcy50cmVuZExpc3Quc2Nyb2xsVG8oMCk7XHJcbiAgICAgICAgLy8gICAgIHRoaXMudHJlbmRMaXN0LnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICAvLyB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoq5ZWG5ZOB57G75Z6L5YiH5o2iICovXHJcbiAgICBwcml2YXRlIGNhdGVTd2l0Y2goKXtcclxuICAgICAgICB0aGlzLmNhdGVUYWJMaXN0LnNlbGVjdEhhbmRsZXIgPSBuZXcgTGF5YS5IYW5kbGVyKHRoaXMsIChzZWxlY3RlZEluZGV4OiBhbnkpPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnNlbGVjdEdvb2RzVHlwZSA9IHRoaXMuY2F0ZUxpc3RBcnJbc2VsZWN0ZWRJbmRleF0uZ29vZHNUeXBlO1xyXG4gICAgICAgICAgICBpZiAodGhpcy50YWJUeXBlID09PSAxKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdldEdvb2RzVHJlbmQodGhpcy5zZWxlY3RHb29kc1R5cGUpXHJcbiAgICAgICAgICAgIH1lbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfmmoLmnKrlvIDmlL4nLHRoaXMuc2VsZWN0R29vZHNUeXBlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvL+aUueWPmHRhYumAieS4reeKtuaAgVxyXG4gICAgICAgICAgICBsZXQgaTogbnVtYmVyID0gdGhpcy5jYXRlVGFiTGlzdC5zdGFydEluZGV4O1xyXG4gICAgICAgICAgICB0aGlzLmNhdGVUYWJMaXN0LmNlbGxzLmZvckVhY2goKGNlbGw6IExheWEuQnV0dG9uKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjZWxsLnNlbGVjdGVkID0gaSA9PT0gc2VsZWN0ZWRJbmRleDtcclxuICAgICAgICAgICAgICAgIGkrKztcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIC8qKuebkeinhuWxj+W5leWkp+Wwj+WPmOWMliAqL1xyXG4gICAgb25SZXNpemUoKXtcclxuICAgICAgICAvL+WIl+ihqOmrmOW6pumAgumFjSA9IOWxj+W5lemrmOW6piAtIChiYW5uZXIgKyB0YWJiYXIpXHJcbiAgICAgICAgdGhpcy50cmVuZExpc3QuaGVpZ2h0ID0gdGhpcy5oZWlnaHQgLSA2MDA7XHJcbiAgICAgICAgY29uc3QgdHJlbmROdW1iZXIgPSB0aGlzLnRyZW5kTGlzdC5oZWlnaHQgLyAxMDA7XHJcbiAgICAgICAgdGhpcy50cmVuZExpc3QucmVwZWF0WSA9IE1hdGguY2VpbCh0cmVuZE51bWJlcilcclxuICAgICAgICB0aGlzLnByZWJ1eS5oZWlnaHQgPSB0aGlzLmhlaWdodCAtIDYwMDtcclxuICAgICAgICBjb25zdCBwcmVidXlOdW1iZXIgPSB0aGlzLnByZWJ1eS5oZWlnaHQgLyAxMDA7XHJcbiAgICAgICAgdGhpcy50cmVuZExpc3QucmVwZWF0WSA9IE1hdGguY2VpbChwcmVidXlOdW1iZXIpXHJcbiAgICB9XHJcbiAgIFxyXG59IiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ3OjExXHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ3OjExXHJcbiAqIEBkZXNjIOmmlumhteWVhuWTgeWNoeiEmuacrFxyXG4gKi9cclxuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XHJcbmltcG9ydCB7IFRhYmJhciB9IGZyb20gXCIuLi92aWV3L1RhYmJhclwiO1xyXG5cclxuaW1wb3J0IHV0aWxzIGZyb20gJy4uL2pzL3V0aWxzJ1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ2FyZCBleHRlbmRzIHVpLkNhcmRVSSB7XHJcbiAgICBjb25zdHJ1Y3Rvcigpe1xyXG4gICAgICAgIHN1cGVyKClcclxuICAgICAgICB0aGlzLm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLmNsaWNrSXRlbSlcclxuICAgIH1cclxuICAgIHNldCBkYXRhU291cmNlKGl0ZW06IGFueSkge1xyXG4gICAgICAgIHRoaXMuX2RhdGFTb3VyY2UgPSBpdGVtO1xyXG4gICAgICAgIGlmIChpdGVtKSB7XHJcbiAgICAgICAgICAgIC8v6YeR5biB5Zu+54mHLCAgMS00MDDph5HluIHlm77moIcyOyAgIDUwMS0xMDAw6YeR5biB5Zu+5qCHNDsgIDEwMDHku6XkuIrph5HluIHlm77moIcyMFxyXG4gICAgICAgICAgICBpZiAoK2l0ZW0uZ29vZHNWYWx1ZSA8PSA0MDAgKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNhcmRJdGVtLnNraW4gPSBgY29tcC9ob21lL2ltZ19qaW5iaV8yLnBuZ2BcclxuICAgICAgICAgICAgfWVsc2UgaWYoK2l0ZW0uZ29vZHNWYWx1ZSA8PSAxMDAwKXtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2FyZEl0ZW0uc2tpbiA9IGBjb21wL2hvbWUvaW1nX2ppbmJpXzQucG5nYFxyXG4gICAgICAgICAgICB9ZWxzZSBpZigraXRlbS5nb29kc1ZhbHVlID49IDEwMDEpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2FyZEl0ZW0uc2tpbiA9IGBjb21wL2hvbWUvaW1nX2ppbmJpXzIwLnBuZ2BcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLnNjZW5lSW1nLnNraW4gPSBgY29tcC9ob21lL2ltZ19zY2VuZV8ke2l0ZW0udG90YWxOdW19LnBuZ2BcclxuICAgICAgICAgICAgdGhpcy5nb29kc05hbWUudGV4dCA9IGAkeytpdGVtLmdvb2RzVmFsdWV9IFVTRFRgXHJcbiAgICAgICAgICAgIHRoaXMuYXdhcmQudGV4dCA9IGAke3V0aWxzLnRvRGVjaW1hbChpdGVtLmF3YXJkLDIpfWBcclxuICAgICAgICAgICAgdGhpcy5zb2xkTnVtX3RvdGFsTnVtLnRleHQgPSBgJHtpdGVtLnNvbGROdW19LyR7aXRlbS50b3RhbE51bX1gXHJcbiAgICAgICAgICAgIHRoaXMucHJvZ3Jlc3MudmFsdWUgPSArYCR7aXRlbS5zb2xkTnVtL2l0ZW0udG90YWxOdW19YFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNsaWNrSXRlbSgpOnZvaWQge1xyXG4gICAgICAgIFRhYmJhci5nZXRJbnN0YW5jZSgpLm9wZW5TY2VuZSgnZ3Vlc3Npbmcuc2NlbmUnLHRoaXMuX2RhdGFTb3VyY2UuZ29vZHNJZClcclxuICAgIH1cclxufSIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0Nzo1OFxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0Nzo1OFxyXG4gKiBAZGVzYyDotK3kubDpobXpnaLohJrmnKxcclxuICovXHJcbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xyXG5pbXBvcnQgeyBUb2FzdCB9IGZyb20gXCIuLi92aWV3L1RvYXN0XCI7XHJcbmltcG9ydCB1dGlscyBmcm9tICcuLi9qcy91dGlscydcclxuaW1wb3J0IElwdFBzd0RvbSBmcm9tIFwiLi4vdGVtcGxhdGUvcHN3SW5wdXRcIjtcclxuaW1wb3J0IHsgR2FtZU1vZGVsIH0gZnJvbSBcIi4uL2pzL0dhbWVNb2RlbFwiO1xyXG5pbXBvcnQgYXBpIGZyb20gXCIuLi9qcy9hcGlcIjtcclxuaW1wb3J0IHsgU29ja2V0IH0gZnJvbSBcIi4uL2pzL3NvY2tldFwiO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgR3Vlc3NpbmcgZXh0ZW5kcyB1aS5ndWVzc2luZ1VJIHtcclxuXHJcbiAgICBwcml2YXRlIGdvb2RzSWQ6c3RyaW5nID0gJyc7Ly/llYblk4FJRFxyXG4gICAgcHJpdmF0ZSBfcGVyaW9kOnN0cmluZyA9ICcnOyAvL+acn+WPt1xyXG4gICAgcHJpdmF0ZSBzZWxlY3ROdW1iZXI6bnVtYmVyID0gMDsgLy/pgInkuK3kuKrmlbBcclxuICAgIHByaXZhdGUgdW5pdFByaWNlOm51bWJlciA9IDA7IC8v5Y2V5Lu3XHJcbiAgICBwcml2YXRlIHRvdGFsUHJpY2U6bnVtYmVyID0gMDsgLy/mgLvku7dcclxuICAgIHByaXZhdGUgbXlBbW91bnQ6bnVtYmVyID0gMDsgLy/mgLvotYTkuqdcclxuICAgIHByaXZhdGUgbnVtYmVyQXJyOm51bWJlcltdID0gW107IC8v5pyq6YCJ5Lit55qE5pWw5o2uXHJcbiAgICBwcml2YXRlIGhhbGZBcnI6bnVtYmVyW10gPSBbXTsgLy/kuIDljYrnmoTmnKrpgInkuK3mlbDmja5cclxuICAgIHByaXZhdGUgcmF3RGF0YUFycl9uZXc6YW55W10gPSBbXTsvL+mVnOWDj+aVsOe7hFxyXG4gICAgcHJpdmF0ZSByYXdEYXRhQXJyOmFueVtdID0gW107Ly/ljp/lp4vmlbDmja5cclxuXHJcbiAgICBwcml2YXRlIGlucHV0UHdkOiBJcHRQc3dEb207IC8v5a+G56CB6L6T5YWl5qGGXHJcbiAgICBwcml2YXRlIGNvZGVMaXN0OnN0cmluZyA9ICcnOyAvL+i0reS5sOWPt+eggVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKCl7XHJcbiAgICAgICAgc3VwZXIoKVxyXG5cclxuICAgICAgICB0aGlzLmJ0bl9idXkub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuYnV5RnVuYylcclxuXHJcbiAgICAgICAgLy8g6YCJ5oup5oyJ6ZKu57uE57uR5a6a5LqL5Lu2XHJcbiAgICAgICAgdGhpcy5yYW5kb21fb25lLm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLnNlbGVjdEZ1bmMsWzFdKVxyXG4gICAgICAgIHRoaXMucmFuZG9tX2JlZm9yZS5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5zZWxlY3RGdW5jLFsyXSlcclxuICAgICAgICB0aGlzLnJhbmRvbV9hZnRlci5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5zZWxlY3RGdW5jLFszXSlcclxuICAgICAgICB0aGlzLnJhbmRvbV9hbGwub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuc2VsZWN0RnVuYyxbNF0pXHJcbiAgICB9XHJcblxyXG4gICAgb25FbmFibGUoKTp2b2lkIHtcclxuICAgICAgICBjb25zb2xlLmxvZygn6L+b5YWl6aG16Z2iJyk7XHJcblxyXG4gICAgICAgIC8v6I635Y+W55So5oi36LWE5LqnXHJcbiAgICAgICAgY29uc3QgdXNlckluZm86YW55ID0gR2FtZU1vZGVsLmdldEluc3RhbmNlKCkudXNlckluZm87XHJcbiAgICAgICAgdGhpcy5iYWxhbmNlLnRleHQgPSBgJHt1dGlscy50b0RlY2ltYWwodXNlckluZm8ubW9uZXksMil9IFVTRFRgO1xyXG4gICAgICAgIHRoaXMubXlBbW91bnQgPSArYCR7dXRpbHMudG9EZWNpbWFsKHVzZXJJbmZvLm1vbmV5LDIpfWA7XHJcbiAgICAgICAgaWYgKCF1c2VySW5mby51c2VySWQpIHsgLy/mnKrnmbvlvZXkuI3mmL7npLrmiJHnmoTkvZnpop1cclxuICAgICAgICAgICAgdGhpcy5iYWxhbmNlQm94LnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5lc3RpbWF0ZS55ID0gODA7XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIHRoaXMuYmFsYW5jZUJveC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5lc3RpbWF0ZS55ID0gNDI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIOebkeinhui1hOS6p+WPmOWKqFxyXG4gICAgICAgIEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLm9uKCdnZXRVc2VySW5mbycsdGhpcywoKHVzZXJJbmZvOmFueSk9PntcclxuICAgICAgICAgICAgdGhpcy5iYWxhbmNlLnRleHQgPSBgJHt1dGlscy50b0RlY2ltYWwodXNlckluZm8ubW9uZXksMil9IFVTRFRgO1xyXG4gICAgICAgICAgICB0aGlzLm15QW1vdW50ID0gK2Ake3V0aWxzLnRvRGVjaW1hbCh1c2VySW5mby5tb25leSwyKX1gO1xyXG4gICAgICAgIH0pKVxyXG5cclxuICAgICAgICAvLyDlj7fnoIHooqvotK3kubDlj5jliqhcclxuICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5vbignZ2V0YnV5R29vZHNBcnInLHRoaXMsKGdvb2RzQXJyOmFueSk9PntcclxuICAgICAgICAgICAgdGhpcy5yYXdEYXRhQXJyLmZvckVhY2goKGl0ZW06YW55KT0+e1xyXG4gICAgICAgICAgICAgICAgZ29vZHNBcnIuZm9yRWFjaCgodjphbnkpPT57XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0uY29kZSA9PT0gdi5jb2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0udXNlcklkID0gdi51c2VySWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uYnV5ZXJJZCA9IHYudXNlcklkO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIHRoaXMucHJvZ3Jlc3NTcGVlZC52YWx1ZSA9ICtgJHtnb29kc0Fyci5sZW5ndGggLyB0aGlzLm51bWJlckxpc3QuYXJyYXkubGVuZ3RofWA7XHJcbiAgICAgICAgICAgIHRoaXMuc29sZE51bV9zb2xkTnVtLnRleHQgPSBgJHtnb29kc0Fyci5sZW5ndGh9LyR7dGhpcy5udW1iZXJMaXN0LmFycmF5Lmxlbmd0aH1gO1xyXG4gICAgICAgICAgICB0aGlzLm51bWJlckxpc3QuYXJyYXkgPSB0aGlzLnJhd0RhdGFBcnI7IC8v5Y+356CB5YiX6KGoXHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuICAgIG9uT3BlbmVkKGdvb2RzSWQ6YW55KXtcclxuICAgICAgICB0aGlzLmdvb2RzSWQgPSBnb29kc0lkO1xyXG4gICAgICAgIHRoaXMuZ2V0R29vZHNEZXRhaWxzKHRoaXMuZ29vZHNJZCk7XHJcbiAgICB9XHJcbiAgICBvbkRpc2FibGUoKXtcclxuICAgICAgICAvLyAg5YWz6Zetd2Vic29ja2V05LqL5Lu2XHJcbiAgICAgICAgU29ja2V0LnNlbmRXU1B1c2goYGJ1eV8ke3RoaXMuX3BlcmlvZH1gLDApXHJcbiAgICB9XHJcblxyXG4gICAgLyoq6LSt5LmwICovXHJcbiAgICBwcml2YXRlIGJ1eUZ1bmMoKTp2b2lkIHtcclxuICAgICAgICBpZiAodGhpcy5nZXRTZWxlY3ROdW1iZXIoKSA8PSAwKSB7XHJcbiAgICAgICAgICAgIFRvYXN0LnNob3coJ+ivt+mAieaLqei0reS5sOWPt+eggScpXHJcbiAgICAgICAgfWVsc2UgaWYodGhpcy50b3RhbFByaWNlID4gdGhpcy5teUFtb3VudCl7XHJcbiAgICAgICAgICAgIFRvYXN0LnNob3coJ+S9memineS4jei2sycpXHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIHRoaXMuaW5wdXRQd2QgPSBuZXcgSXB0UHN3RG9tKClcclxuICAgICAgICAgICAgdGhpcy5pbnB1dFB3ZC5wb3B1cCgpO1xyXG4gICAgICAgICAgICB0aGlzLmlucHV0UHdkLnNldERhdGEoeyAvL+WPkemAgeaVsOaNrlxyXG4gICAgICAgICAgICAgICAgcGVyaW9kOnRoaXMucGVyaW9kLnRleHQsXHJcbiAgICAgICAgICAgICAgICBjb2RlTGlzdDp0aGlzLmNvZGVMaXN0LFxyXG4gICAgICAgICAgICAgICAgQWxsQ29kZUxpc3Q6dGhpcy5udW1iZXJMaXN0LmFycmF5XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC8vIOebkeWQrOi+k+WFpeahhue7hOS7tuS6i+S7tlxyXG4gICAgICAgICAgICB0aGlzLmlucHV0UHdkLm9uKCdyZWZyZXNoRGF0YScsdGhpcywoKT0+e1xyXG4gICAgICAgICAgICAgICAgdGhpcy5nZXRHb29kc0RldGFpbHModGhpcy5nb29kc0lkKTtcclxuICAgICAgICAgICAgICAgIHRoaXMudG90YWwudGV4dCA9ICcwIFVTRFQnO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIOmAieaLqeaMiemSrue7hFxyXG4gICAgICogQHBhcmFtIHR5cGUg6YCJ5oup57G75Z6LICAxOumaj+S4gCAgMu+8muWJjeWNiiAz77ya5ZCO5Y2KIDTvvJrlhajpg6hcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBzZWxlY3RGdW5jKHR5cGU6bnVtYmVyKXtcclxuICAgICAgICB0aGlzLnJhd0RhdGFBcnJfbmV3ID0gdGhpcy5yYXdEYXRhQXJyOyAvL+WIneWni+WMluaVsOe7hFxyXG4gICAgICAgIHRoaXMubnVtYmVyQXJyID0gW107Ly/liJ3lp4vljJbmlbDnu4RcclxuICAgICAgICB0aGlzLmhhbGZBcnIgPSBbXTsvL+WIneWni+WMluaVsOe7hFxyXG5cclxuICAgICAgICB0aGlzLnJhd0RhdGFBcnJfbmV3LmZvckVhY2goaXRlbT0+e1xyXG4gICAgICAgICAgICBpZiAoaXRlbS5idXllcklkID09PSAnMicpIHtcclxuICAgICAgICAgICAgICAgIGl0ZW0uYnV5ZXJJZCA9ICcwJztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoaXRlbS5idXllcklkIDw9IDIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubnVtYmVyQXJyLnB1c2goaXRlbS5jb2RlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgaWYgKHR5cGUgPT09IDEpIHtcclxuICAgICAgICAgICAgdGhpcy5yYW5kb21OdW1iZXIodGhpcy5udW1iZXJBcnIsMSkgLy/pmo/kuIBcclxuICAgICAgICB9ZWxzZSBpZiAodHlwZSA9PT0gMikge1xyXG4gICAgICAgICAgICB0aGlzLmhhbGZBcnIgPSB0aGlzLm51bWJlckFyci5zbGljZSgwLE1hdGguZmxvb3IodGhpcy5udW1iZXJBcnIubGVuZ3RoIC8gMikpICAvL+WJjeWNilxyXG4gICAgICAgICAgICB0aGlzLnJhbmRvbU51bWJlcih0aGlzLmhhbGZBcnIsMilcclxuICAgICAgICB9ZWxzZSBpZih0eXBlID09PSAzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGFsZkFyciA9IHRoaXMubnVtYmVyQXJyLnNsaWNlKE1hdGguZmxvb3IodGhpcy5udW1iZXJBcnIubGVuZ3RoIC8gMikpICAvL+WQjuWNilxyXG4gICAgICAgICAgICB0aGlzLnJhbmRvbU51bWJlcih0aGlzLmhhbGZBcnIsMilcclxuICAgICAgICB9ZWxzZSBpZih0eXBlID09PSA0KSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGFsZkFyciA9IHRoaXMubnVtYmVyQXJyOy8v5YWo6YOoXHJcbiAgICAgICAgICAgIHRoaXMucmFuZG9tTnVtYmVyKHRoaXMuaGFsZkFyciwyKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKirku47mlbDnu4TkuK3pmo/mnLrlj5bkuIDkuKrmlbBcclxuICAgICAqIEBwYXJhbSBhcnIg5pWw5o2u5YiX6KGoXHJcbiAgICAgKiBAcGFyYW0gdHlwZSBb5Y+v6YCJXSDpmo/mnLrnsbvlnotcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSByYW5kb21OdW1iZXIoYXJyOm51bWJlcltdLHR5cGU/Om51bWJlcil7XHJcbiAgICAgICAgY29uc3QgcmFuZDpudW1iZXIgPSBNYXRoLmZsb29yKChNYXRoLnJhbmRvbSgpICogYXJyLmxlbmd0aCkpOyAvL+maj+S4gFxyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IGNvZGUgPSBhcnJbcmFuZF07XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKHR5cGUgPT09IDEpIHtcclxuICAgICAgICAgICAgdGhpcy5yYXdEYXRhQXJyX25ldy5mb3JFYWNoKGl0ZW0gPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGl0ZW0uY29kZSA9PT0gY29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW0uYnV5ZXJJZCA9ICcyJztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodHlwZSA9PT0gMikge1xyXG4gICAgICAgICAgICBhcnIuZm9yRWFjaChlbCA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJhd0RhdGFBcnJfbmV3LmZvckVhY2goaXRlbSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVsID09PSBpdGVtLmNvZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5idXllcklkID0gJzInO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIHRoaXMubnVtYmVyTGlzdC5yZXBlYXRZID0gdGhpcy5yYXdEYXRhQXJyX25ldy5sZW5ndGg7XHJcbiAgICAgICAgdGhpcy5udW1iZXJMaXN0LmFycmF5ID0gdGhpcy5yYXdEYXRhQXJyX25ldztcclxuICAgICAgICB0aGlzLmdldFNlbGVjdE51bWJlcigpXHJcbiAgICB9XHJcblxyXG4gICAgLyoq6I635Y+W5ZWG5ZOB6K+m5oOFXHJcbiAgICAgKiBAcGFyYW0gZ29vZHNJZCDllYblk4FpZFxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGdldEdvb2RzRGV0YWlscyhnb29kc0lkOnN0cmluZykge1xyXG4gICAgICAgIGFwaS5nZXRHb29kc0RldGFpbHMoZ29vZHNJZCkudGhlbigocmVzOmFueSk9PntcclxuXHJcbiAgICAgICAgICAgIC8vICDlj5HpgIF3ZWJzb2NrZXTkuovku7ZcclxuICAgICAgICAgICAgdGhpcy5fcGVyaW9kID0gcmVzLnBlcmlvZDtcclxuICAgICAgICAgICAgU29ja2V0LnNlbmRXU1B1c2goYGJ1eV8ke3RoaXMuX3BlcmlvZH1gKVxyXG5cclxuICAgICAgICAgICAgdGhpcy5wcmljZS50ZXh0ID0gYCR7K3Jlcy5wcmljZX1gO1xyXG4gICAgICAgICAgICB0aGlzLmdvb2RzVmFsdWUudGV4dCA9IGAkeytyZXMuZ29vZHNWYWx1ZX0gVVNEVGA7XHJcbiAgICAgICAgICAgIHRoaXMucHJvZ3Jlc3NTcGVlZC52YWx1ZSA9ICtgJHtyZXMuc29sZE51bS9yZXMudG90YWxOdW19YDtcclxuICAgICAgICAgICAgdGhpcy5zb2xkTnVtX3NvbGROdW0udGV4dCA9IGAke3Jlcy5zb2xkTnVtfS8ke3Jlcy50b3RhbE51bX1gO1xyXG4gICAgICAgICAgICB0aGlzLnBlcmlvZC50ZXh0ID0gcmVzLnBlcmlvZDtcclxuICAgICAgICAgICAgdGhpcy51bml0UHJpY2UgPSArcmVzLnByaWNlO1xyXG4gICAgICAgICAgICB0aGlzLnJhd0RhdGFBcnIgPSByZXMuY29kZUxpc3Q7XHJcbiAgICAgICAgICAgIHRoaXMubnVtYmVyTGlzdC5hcnJheSA9IHRoaXMucmF3RGF0YUFycjsgLy/lj7fnoIHliJfooahcclxuICAgICAgICAgICAgdGhpcy5yYW5kb21fb25lLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5udW1iZXJMaXN0LmFycmF5Lmxlbmd0aCA+IDIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucmFuZG9tX2FmdGVyLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yYW5kb21fYmVmb3JlLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yYW5kb21fYWxsLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIHRoaXMucmFuZG9tX29uZS53aWR0aCA9IDMwMDtcclxuICAgICAgICAgICAgICAgIHRoaXMucmFuZG9tX29uZS5jZW50ZXJYID0gMDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLm51bWJlckxpc3QucmVwZWF0WCA9IDU7XHJcbiAgICAgICAgICAgIHRoaXMubnVtYmVyTGlzdC5yZXBlYXRZID0gNDtcclxuICAgICAgICAgICAgdGhpcy5udW1iZXJMaXN0LmNlbGxzLmZvckVhY2goKGl0ZW06IExheWEuU3ByaXRlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpdGVtLm9uKFwiR2V0SXRlbVwiLCB0aGlzLCB0aGlzLmdldFNlbGVjdE51bWJlcilcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9KS5jYXRjaCgoZXJyOmFueSk9PntcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyLm1lc3NhZ2UpO1xyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgLyoq55uR5ZCs57uf6K6h5YiX6KGo5pWw5o2u6YCJ5Lit5Liq5pWwICovXHJcbiAgICBwcml2YXRlIGdldFNlbGVjdE51bWJlcigpe1xyXG4gICAgICAgIHRoaXMuc2VsZWN0TnVtYmVyID0gMDtcclxuICAgICAgICB0aGlzLmNvZGVMaXN0ID0gJyc7XHJcbiAgICAgICAgdGhpcy5udW1iZXJMaXN0LmFycmF5LmZvckVhY2goaXRlbT0+e1xyXG4gICAgICAgICAgICBpZiAoaXRlbS5idXllcklkID09PSAnMicpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0TnVtYmVyID0gdGhpcy5zZWxlY3ROdW1iZXIgKyAxO1xyXG4gICAgICAgICAgICAgICAgbGV0IGNvZGVTdHJpbmc6c3RyaW5nID0gYCR7dGhpcy5jb2RlTGlzdH0ke3RoaXMuY29kZUxpc3QubGVuZ3RoID4gMCA/ICcsJzonJ30ke2l0ZW0uY29kZX1gO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb2RlTGlzdCA9ICBjb2RlU3RyaW5nO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgICB0aGlzLnRvdGFsLnRleHQgPSB1dGlscy50b0RlY2ltYWwoKHRoaXMudW5pdFByaWNlICogdGhpcy5zZWxlY3ROdW1iZXIpLDIpICsgJyBVU0RUJztcclxuICAgICAgICB0aGlzLnRvdGFsUHJpY2UgPSArdXRpbHMudG9EZWNpbWFsKCh0aGlzLnVuaXRQcmljZSAqIHRoaXMuc2VsZWN0TnVtYmVyKSwyKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2VsZWN0TnVtYmVyO1xyXG4gICAgfVxyXG59IiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ4OjE2XHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ4OjE2XHJcbiAqIEBkZXNjIOmmlumhteiEmuacrFxyXG4gKi9cclxuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XHJcbmltcG9ydCB7IFRvYXN0IH0gZnJvbSBcIi4uL3ZpZXcvVG9hc3RcIjtcclxuaW1wb3J0IHsgR2FtZU1vZGVsIH0gZnJvbSBcIi4uL2pzL0dhbWVNb2RlbFwiO1xyXG5pbXBvcnQgdXRpbHMgZnJvbSAnLi4vanMvdXRpbHMnXHJcbmltcG9ydCBhcGkgZnJvbSBcIi4uL2pzL2FwaVwiO1xyXG5cclxuaW1wb3J0IHsgcG9zdCB9IGZyb20gJy4uL2pzL2h0dHAnO1xyXG5pbXBvcnQgeyBTb2NrZXQgfSBmcm9tIFwiLi4vanMvc29ja2V0XCI7XHJcbmltcG9ydCB7IFRhYmJhciB9IGZyb20gXCIuLi92aWV3L1RhYmJhclwiO1xyXG5cclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEhvbWUgZXh0ZW5kcyB1aS5ob21lVUkge1xyXG4gICAgY29uc3RydWN0b3IoKXtcclxuICAgICAgICBzdXBlcigpXHJcbiAgICAgICAgdGhpcy5idG5SZWNoYXJnZS5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5idG5SZWNoYXJnZUZ1bmMpO1xyXG4gICAgICAgIHRoaXMuYnV5SGVscC5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5vcGVuQnV5SGVscClcclxuICAgICAgICB0aGlzLnB1dGluLm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLnB1dEluRnVuYylcclxuICAgIH1cclxuICAgIG9uRW5hYmxlKCk6dm9pZHtcclxuICAgICAgICB0aGlzLmdldFVzZXJJbmZvKClcclxuICAgICAgICB0aGlzLnJhbmtUb2RheSgpXHJcbiAgICAgICAgdGhpcy5nZXRHb29kc0xpc3QoKVxyXG5cclxuICAgICAgICAvLyDnm5Hop4bngavnrq3mlbDmja7lj5jliqhcclxuICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5vbignZ2V0Um9ja2V0RGF0YScsdGhpcywocmVzOmFueSkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnJvY2tldEFtb3VudC50ZXh0ID0gYCR7dXRpbHMudG9EZWNpbWFsKHJlcy5wb3RNb25leSwyKX1gXHJcbiAgICAgICAgICAgIHV0aWxzLmNvdW50RG93bihyZXMuY291bnREb3duLCgodGltZSk9PntcclxuICAgICAgICAgICAgICAgIHRoaXMucm9ja2V0Q291bnREb3duLnRleHQgPSB0aW1lXHJcbiAgICAgICAgICAgIH0pKVxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLy8g5piv5ZCm5byA5aWW5LqG77yM5byA5aWW5Yi35paw5ZWG5ZOB5YiX6KGoXHJcbiAgICAgICAgR2FtZU1vZGVsLmdldEluc3RhbmNlKCkub24oJ2lzVG9nZ2xlJyx0aGlzLChyZXM6YW55KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuZ2V0R29vZHNMaXN0KClcclxuICAgICAgICB9KVxyXG4gICAgICAgIFxyXG4gICAgfVxyXG4gICAgXHJcblxyXG4gICAgLyoq5YWF5YC8ICovXHJcbiAgICBwcml2YXRlIGJ0blJlY2hhcmdlRnVuYygpOnZvaWQge1xyXG4gICAgICAgIFRvYXN0LnNob3coJ+eCueWHu+WFheWAvCcpXHJcbiAgICB9XHJcbiAgICAvKirnqbrmipUgKi9cclxuICAgIHByaXZhdGUgcHV0SW5GdW5jKCl7XHJcbiAgICAgICAgLy8gVGFiYmFyLmdldEluc3RhbmNlKCkub3BlblNjZW5lKCd4Y3RqLnNjZW5lJylcclxuICAgICAgICBUb2FzdC5zaG93KCfmmoLmnKrlvIDmlL7vvIzmlazor7fmnJ/lvoUnKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKuiOt+WPluS4quS6uuS/oeaBryAqL1xyXG4gICAgcHJpdmF0ZSBnZXRVc2VySW5mbygpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIHBvc3QoJy91c2VyL2xvZ2luJyx7XHJcbiAgICAgICAgICAgICAgICBvcmdJZDoxLFxyXG4gICAgICAgICAgICAgICAgYWNjb3VudDonMTg5MDAwMDAwMDMnXHJcbiAgICAgICAgICAgIH0pLnRoZW4oKHJlczphbnkpPT57XHJcbiAgICAgICAgICAgICAgICBhcGkuZ2V0VXNlckluZm8oKS50aGVuKChyZXM6YW55KT0+e1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubmlja05hbWUudGV4dCA9IHJlcy51c2VySW5mby5uaWNrTmFtZVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubXlBbW91bnQudGV4dCA9YCR7dXRpbHMudG9EZWNpbWFsKHJlcy51c2VySW5mby5tb25leSwyKX1gXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hdmF0YXIuc2tpbiA9IHJlcy51c2VySW5mby5hdmF0YXI7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5L+d5a2Y55So5oi35L+h5oGvXHJcbiAgICAgICAgICAgICAgICAgICAgR2FtZU1vZGVsLmdldEluc3RhbmNlKCkuc2V0VXNlckluZm8ocmVzLnVzZXJJbmZvKVxyXG4gICAgICAgICAgICAgICAgICAgIC8vIOi/nuaOpXdlYnNvY2tldFxyXG4gICAgICAgICAgICAgICAgICAgIFNvY2tldC5jcmVhdGVTb2NrZXQoKVxyXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycjphbnkpPT57XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyLm1lc3NhZ2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOiOt+WPluS/oeaBr+Wksei0peabtOaWsOS/oeaBr1xyXG4gICAgICAgICAgICAgICAgICAgIEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLnNldFVzZXJJbmZvKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXNlckluZm86e31cclxuICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgIC8vIOi/nuaOpXdlYnNvY2tldFxyXG4gICAgICAgICAgICAgICAgICAgIFNvY2tldC5jcmVhdGVTb2NrZXQoKVxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIC8qKuS7iuaXpeWkp+WlluaxoCAqL1xyXG4gICAgcHJpdmF0ZSByYW5rVG9kYXkoKXtcclxuICAgICAgICBhcGkuZ2V0UmFua1RvZGF5KCkudGhlbigocmVzOmFueSk9PntcclxuICAgICAgICAgICAgdGhpcy5yb2NrZXRBbW91bnQudGV4dCA9IGAke3V0aWxzLnRvRGVjaW1hbChyZXMucG90TW9uZXksMil9YFxyXG4gICAgICAgICAgICB1dGlscy5jb3VudERvd24ocmVzLmNvdW50RG93biwoKHRpbWUpPT57XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJvY2tldENvdW50RG93bi50ZXh0ID0gdGltZVxyXG4gICAgICAgICAgICB9KSlcclxuICAgICAgICB9KS5jYXRjaCgoZXJyOmFueSk9PntcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyLm1lc3NhZ2UpO1xyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgLyoq6I635Y+W6aaW6aG15ZWG5ZOB5YiX6KGoICovXHJcbiAgICBwcml2YXRlIGdldEdvb2RzTGlzdCgpe1xyXG4gICAgICAgIGFwaS5nZXRHb29kc0xpc3QoKS50aGVuKChyZXM6YW55KT0+e1xyXG4gICAgICAgICAgICB0aGlzLmxpc3QucmVwZWF0WCA9IHJlcy5saXN0Lmxlbmd0aDtcclxuICAgICAgICAgICAgdGhpcy5saXN0LmFycmF5ID0gcmVzLmxpc3Q7XHJcbiAgICAgICAgfSkuY2F0Y2goKGVycjphbnkpPT57XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyci5tZXNzYWdlKTtcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIC8qKueOqeazleS7i+e7jSAqL1xyXG4gICAgcHJpdmF0ZSBvcGVuQnV5SGVscCgpe1xyXG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gJ2h0dHBzOi8vbS54eWhqLmlvL2J1eUhlbHAuaHRtbCc7XHJcbiAgICB9XHJcbn0iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDg6MjhcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDg6MjhcclxuICogQGRlc2Mg6K6w5b2V6aG16Z2i6ISa5pysXHJcbiAqL1xyXG5pbXBvcnQgeyB1aSB9IGZyb20gJy4uL3VpL2xheWFNYXhVSSdcclxuaW1wb3J0IGFwaSBmcm9tICcuLi9qcy9hcGknO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVjb3JkIGV4dGVuZHMgdWkucmVjb3JkVUkge1xyXG4gICAgY29uc3RydWN0b3IoKXtcclxuICAgICAgICBzdXBlcigpXHJcblxyXG4gICAgICAgIHRoaXMuY2FueXUub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMudGFiU3dpdGNoLFsxXSlcclxuICAgICAgICB0aGlzLndhbmdxaS5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy50YWJTd2l0Y2gsWzJdKVxyXG4gICAgICAgIHRoaXMub24oTGF5YS5FdmVudC5SRVNJWkUsdGhpcyx0aGlzLm9uUmVzaXplKVxyXG4gICAgfVxyXG5cclxuICAgIG9uRW5hYmxlKCk6dm9pZHtcclxuICAgICAgICB0aGlzLmdldE15T3JkZXJzKCk7XHJcbiAgICAgICAgdGhpcy5nZXRHb29kc0hpc3RvcnkoKTtcclxuICAgIH1cclxuXHJcbiAgICAvKirojrflj5blj4LkuI7orrDlvZUgKi9cclxuICAgIHByaXZhdGUgZ2V0TXlPcmRlcnMocGFnZT86bnVtYmVyKXtcclxuICAgICAgICBhcGkuZ2V0TXlPcmRlcnMocGFnZSkudGhlbigocmVzOmFueSk9PntcclxuICAgICAgICAgICAgdGhpcy5qb2luTGlzdC5yZXBlYXRZID0gcmVzLmxlbmd0aDtcclxuICAgICAgICAgICAgdGhpcy5qb2luTGlzdC5hcnJheSA9IHJlcztcclxuICAgICAgICAgICAgdGhpcy5qb2luTGlzdC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICB9KS5jYXRjaCgoZXJyOmFueSk9PntcclxuICAgICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyci5tZXNzYWdlKTtcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG4gICAgLyoq6I635Y+W5b6A5pyf6K6w5b2VICovXHJcbiAgICBwcml2YXRlIGdldEdvb2RzSGlzdG9yeShwYWdlPzpudW1iZXIpe1xyXG4gICAgICAgIGFwaS5nZXRHb29kc0hpc3RvcnkocGFnZSkudGhlbigocmVzOmFueSk9PntcclxuICAgICAgICAgICAgdGhpcy5wcmV2aW9vdXNMaXN0LnJlcGVhdFkgPSByZXMubGVuZ3RoO1xyXG4gICAgICAgICAgICB0aGlzLnByZXZpb291c0xpc3QuYXJyYXkgPSByZXM7XHJcbiAgICAgICAgfSkuY2F0Y2goKGVycjphbnkpPT57XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyci5tZXNzYWdlKTtcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5YiH5o2i6K6w5b2V5YiX6KGoXHJcbiAgICAgKiBAcGFyYW0gdHlwZSAxOuWPguS4juiusOW9lSAgMu+8muW+gOacn+iusOW9lVxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIHRhYlN3aXRjaCh0eXBlOm51bWJlcil7XHJcbiAgICAgICAgaWYgKHR5cGUgPT09IDEpIHtcclxuICAgICAgICAgICAgdGhpcy5jYW55dS5za2luID0gJ2NvbXAvZ3Vlc3NpbmcvaW1nX3RhYl9hY3RpdmUucG5nJztcclxuICAgICAgICAgICAgdGhpcy53YW5ncWkuc2tpbiA9ICdjb21wL2d1ZXNzaW5nL2ltZ190YWIucG5nJztcclxuICAgICAgICAgICAgdGhpcy5nZXRNeU9yZGVycygpXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmpvaW5MaXN0LmFycmF5ID09PSBudWxsIHx8IHRoaXMuam9pbkxpc3QuYXJyYXkubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgfWVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5qb2luTGlzdC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLnByZXZpb291c0xpc3Quc2Nyb2xsVG8oMClcclxuICAgICAgICAgICAgdGhpcy5wcmV2aW9vdXNMaXN0LnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgdGhpcy53YW5ncWkuc2tpbiA9ICdjb21wL2d1ZXNzaW5nL2ltZ190YWJfYWN0aXZlLnBuZyc7XHJcbiAgICAgICAgICAgIHRoaXMuY2FueXUuc2tpbiA9ICdjb21wL2d1ZXNzaW5nL2ltZ190YWIucG5nJztcclxuICAgICAgICAgICAgdGhpcy5nZXRHb29kc0hpc3RvcnkoKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMucHJldmlvb3VzTGlzdC5hcnJheSA9PT0gbnVsbCB8fCB0aGlzLnByZXZpb291c0xpc3QuYXJyYXkubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgfWVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wcmV2aW9vdXNMaXN0LnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuam9pbkxpc3Quc2Nyb2xsVG8oMCk7XHJcbiAgICAgICAgICAgIHRoaXMuam9pbkxpc3QudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKirnm5Hop4blsY/luZXlpKflsI/lj5jljJYgKi9cclxuICAgIG9uUmVzaXplKCl7XHJcbiAgICAgICAgLy/liJfooajpq5jluqbpgILphY0gPSDlsY/luZXpq5jluqYgLSAoYmFubmVyICsgdGFiYmFyKVxyXG4gICAgICAgIHRoaXMuam9pbkxpc3QuaGVpZ2h0ID0gdGhpcy5oZWlnaHQgLSA0MzA7XHJcbiAgICAgICAgdGhpcy5wcmV2aW9vdXNMaXN0LmhlaWdodCA9IHRoaXMuaGVpZ2h0IC0gNDMwO1xyXG4gICAgfVxyXG59IiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTIwIDEwOjI3OjI1XHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTIwIDEwOjI3OjI1XHJcbiAqIEBkZXNjIOeBq+eureWkp+WllumhtemdolxyXG4gKi9cclxuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XHJcbmltcG9ydCB7IGdldCB9IGZyb20gXCIuLi9qcy9odHRwXCI7XHJcbmltcG9ydCB1dGlscyBmcm9tIFwiLi4vanMvdXRpbHNcIjtcclxuaW1wb3J0IGFwaSBmcm9tIFwiLi4vanMvYXBpXCI7XHJcbmltcG9ydCB7IFRhYmJhciB9IGZyb20gXCIuLi92aWV3L1RhYmJhclwiO1xyXG5pbXBvcnQgeyBHYW1lTW9kZWwgfSBmcm9tIFwiLi4vanMvR2FtZU1vZGVsXCI7XHJcblxyXG4gZXhwb3J0IGRlZmF1bHQgY2xhc3MgZ3JhbmRQcml4IGV4dGVuZHMgdWkuZ3JhbmRQcml4VUkge1xyXG4gICAgIGNvbnN0cnVjdG9yKCl7XHJcbiAgICAgICAgIHN1cGVyKClcclxuICAgICAgICAgdGhpcy5yYW5rUHJpemVIZWxwLm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLm9wZW5SYW5rUHJpemVIZWxwKVxyXG4gICAgICAgICB0aGlzLmJ0bl9oaXN0b3J5Lm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLkJ0bmhpc3RvcnkpXHJcbiAgICAgfVxyXG5cclxuICAgICBvbkVuYWJsZSgpe1xyXG4gICAgICAgIHRoaXMuZ2V0UmFua1RvZGF5KClcclxuICAgICAgICAvLyDnm5Hop4bngavnrq3mlbDmja7lj5jliqhcclxuICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5vbignZ2V0Um9ja2V0RGF0YScsdGhpcywocmVzOmFueSkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmJvbnVzLnRleHQgPSBgJHt1dGlscy50b0RlY2ltYWwocmVzLnBvdE1vbmV5LDIpfWAgXHJcbiAgICAgICAgICAgIHV0aWxzLmNvdW50RG93bihyZXMuY291bnREb3duLCgodGltZSk9PntcclxuICAgICAgICAgICAgICAgIHRoaXMuQ291bnREb3duLnRleHQgPSB0aW1lXHJcbiAgICAgICAgICAgIH0pKVxyXG4gICAgICAgIH0pXHJcbiAgICAgfVxyXG5cclxuICAgICAvKirojrflj5blpKflpZbkv6Hmga8gKi9cclxuICAgIHByaXZhdGUgZ2V0UmFua1RvZGF5KCl7XHJcbiAgICAgICAgYXBpLmdldFJhbmtUb2RheSgpLnRoZW4oKHJlczphbnkpPT57XHJcbiAgICAgICAgICAgIHRoaXMuYm9udXMudGV4dCA9IGAke3V0aWxzLnRvRGVjaW1hbChyZXMucG90TW9uZXksMil9YCBcclxuICAgICAgICAgICAgdXRpbHMuY291bnREb3duKHJlcy5jb3VudERvd24sKCh0aW1lKT0+e1xyXG4gICAgICAgICAgICAgICAgdGhpcy5Db3VudERvd24udGV4dCA9IHRpbWVcclxuICAgICAgICAgICAgfSkpXHJcbiAgICAgICAgICAgIGlmIChyZXMubGlzdC5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubm9EYXRhLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8v56ys5LiA5ZCNXHJcbiAgICAgICAgICAgIGlmIChyZXMubGlzdC5saXN0MS5kYXRhLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYm94MS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYWxvbmUxLnRleHQgPSBg54us5b6XICR7dXRpbHMudG9EZWNpbWFsKHJlcy5saXN0Lmxpc3QxLmRpdmlkbW9uZXksMil9IFVTRFRgXHJcbiAgICAgICAgICAgICAgICB0aGlzLlByb3BvcnRpb24xLnRleHQgPSBg5Y2g5aWW5rGgJHtyZXMubGlzdC5saXN0MS5wZXJjZW50fWBcclxuICAgICAgICAgICAgICAgIHRoaXMucHJpeExpc3QxLmFycmF5ID0gcmVzLmxpc3QubGlzdDEuZGF0YVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIDItNeWQjVxyXG4gICAgICAgICAgICBpZiAocmVzLmxpc3QubGlzdDIuZGF0YS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJveDIudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFsb25lMi50ZXh0ID0gYOavj+S6uiAke3V0aWxzLnRvRGVjaW1hbChyZXMubGlzdC5saXN0Mi5kaXZpZG1vbmV5LzQsMil9IFVTRFRgXHJcbiAgICAgICAgICAgICAgICB0aGlzLlByb3BvcnRpb24yLnRleHQgPSBg5Y2g5aWW5rGgJHtyZXMubGlzdC5saXN0Mi5wZXJjZW50fWBcclxuICAgICAgICAgICAgICAgIHRoaXMucHJpeExpc3QyLmFycmF5ID0gcmVzLmxpc3QubGlzdDIuZGF0YVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIDUtMTXlkI1cclxuICAgICAgICAgICAgaWYgKHJlcy5saXN0Lmxpc3QzLmRhdGEubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ib3gzLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hbG9uZTMudGV4dCA9IGDmr4/kurogJHt1dGlscy50b0RlY2ltYWwocmVzLmxpc3QubGlzdDMuZGl2aWRtb25leS8xMCwyKX0gVVNEVGBcclxuICAgICAgICAgICAgICAgIHRoaXMuUHJvcG9ydGlvbjMudGV4dCA9IGDljaDlpZbmsaAke3Jlcy5saXN0Lmxpc3QzLnBlcmNlbnR9YFxyXG4gICAgICAgICAgICAgICAgdGhpcy5wcml4TGlzdDMuYXJyYXkgPSByZXMubGlzdC5saXN0My5kYXRhXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy/mnKrnmbvlvZXliJnkuI3mmL7npLrkuKrkurrmjpLlkI1cclxuICAgICAgICAgICAgaWYgKHJlcy5saXN0LnNlbGYudXNlcklkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm15UmFua0JveC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMubXlyYW5raW5nLnRleHQgPSByZXMubGlzdC5zZWxmLnJhbmsgPiAxNSA/ICcxNSsnIDogYCR7cmVzLmxpc3Quc2VsZi5yYW5rfWA7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmF2YXRhci5za2luID0gcmVzLmxpc3Quc2VsZi5hdmF0YXI7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5pY2tOYW1lLnRleHQgPSByZXMubGlzdC5zZWxmLm5pY2tOYW1lO1xyXG4gICAgICAgICAgICAgICAgdGhpcy51aWQudGV4dCA9IHJlcy5saXN0LnNlbGYudXNlcklkO1xyXG4gICAgICAgICAgICAgICAgdGhpcy52b2x1bWUudGV4dCA9IGAke3V0aWxzLnRvRGVjaW1hbChyZXMubGlzdC5zZWxmLmNvbnN1bSwyKX0gVVNEVGBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pLmNhdGNoKChlcnI6YW55KT0+e1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIubWVzc2FnZSk7XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIEJ0bmhpc3RvcnkoKXtcclxuICAgICAgICBUYWJiYXIuZ2V0SW5zdGFuY2UoKS5vcGVuU2NlbmUoJ3ByaUhpc3RvcnlTY2VuZS5zY2VuZScpXHJcbiAgICB9XHJcblxyXG4gICAgLyoq6K+05piOICovXHJcbiAgICBwcml2YXRlIG9wZW5SYW5rUHJpemVIZWxwKCl7XHJcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSAnaHR0cHM6Ly9tLnh5aGouaW8vcmFua1ByaXplSGVscC5odG1sJztcclxuICAgIH1cclxuIH0gIiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTIwIDEwOjI3OjI1XHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTIwIDEwOjI3OjI1XHJcbiAqIEBkZXNjIOeBq+eureWkp+WlluWOhuWPsuiusOW9lemhtemdolxyXG4gKi9cclxuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XHJcbmltcG9ydCB1dGlscyBmcm9tIFwiLi4vanMvdXRpbHNcIjtcclxuaW1wb3J0IGFwaSBmcm9tIFwiLi4vanMvYXBpXCI7XHJcbmltcG9ydCB7IFRhYmJhciB9IGZyb20gXCIuLi92aWV3L1RhYmJhclwiO1xyXG5cclxuIGV4cG9ydCBkZWZhdWx0IGNsYXNzIGdyYW5kUHJpeCBleHRlbmRzIHVpLnByaUhpc3RvcnlTY2VuZVVJIHtcclxuICAgICBjb25zdHJ1Y3Rvcigpe1xyXG4gICAgICAgICBzdXBlcigpXHJcbiAgICAgfVxyXG5cclxuICAgICBvbkVuYWJsZSgpe1xyXG4gICAgICAgIHRoaXMuZ2V0UmFua0hpc3RvcnkoKVxyXG4gICAgIH1cclxuXHJcbiAgICAgLyoq6I635Y+W5aSn5aWW5L+h5oGvICovXHJcbiAgICBwcml2YXRlIGdldFJhbmtIaXN0b3J5KCl7XHJcbiAgICAgICAgYXBpLmdldFJhbmtIaXN0b3J5KCkudGhlbigocmVzOmFueSk9PntcclxuICAgICAgICAgICAgdGhpcy50b3RhbC50ZXh0ID0gYOaAu+WllumHkToke3V0aWxzLnRvRGVjaW1hbChyZXMucG90TW9uZXksMil9IFVTRFRgXHJcbiAgICAgICAgICAgIGlmIChyZXMubGlzdC5saXN0MS5kYXRhLmxlbmd0aCA9PT0gMCAmJiByZXMubGlzdC5saXN0Mi5kYXRhLmxlbmd0aCA9PT0gMCAmJiByZXMubGlzdC5saXN0My5kYXRhLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5saXN0Qm94LnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHRoaXMubm9EYXRhLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8v56ys5LiA5ZCNXHJcbiAgICAgICAgICAgIGlmIChyZXMubGlzdC5saXN0MS5kYXRhLmxlbmd0aCA+IDApIHsgIFxyXG4gICAgICAgICAgICAgICAgdGhpcy5saXN0Qm94LnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ib3gxLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hbG9uZTEudGV4dCA9IGDni6zlvpcgJHt1dGlscy50b0RlY2ltYWwocmVzLmxpc3QubGlzdDEuZGl2aWRtb25leSwyKX0gVVNEVGBcclxuICAgICAgICAgICAgICAgIHRoaXMuUHJvcG9ydGlvbjEudGV4dCA9IGDljaDlpZbmsaAke3Jlcy5saXN0Lmxpc3QxLnBlcmNlbnR9YFxyXG4gICAgICAgICAgICAgICAgdGhpcy5wcml4TGlzdDEuYXJyYXkgPSByZXMubGlzdC5saXN0MS5kYXRhXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gMi015ZCNXHJcbiAgICAgICAgICAgIGlmIChyZXMubGlzdC5saXN0Mi5kYXRhLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubGlzdEJveC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYm94Mi52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYWxvbmUyLnRleHQgPSBg5q+P5Lq6ICR7dXRpbHMudG9EZWNpbWFsKHJlcy5saXN0Lmxpc3QyLmRpdmlkbW9uZXkvNCwyKX0gVVNEVGBcclxuICAgICAgICAgICAgICAgIHRoaXMuUHJvcG9ydGlvbjIudGV4dCA9IGDljaDlpZbmsaAke3Jlcy5saXN0Lmxpc3QyLnBlcmNlbnR9YFxyXG4gICAgICAgICAgICAgICAgdGhpcy5wcml4TGlzdDIuYXJyYXkgPSByZXMubGlzdC5saXN0Mi5kYXRhXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgIC8vIDUtMTXlkI1cclxuICAgICAgICAgICAgIGlmIChyZXMubGlzdC5saXN0My5kYXRhLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubGlzdEJveC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYm94My52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYWxvbmUzLnRleHQgPSBg5q+P5Lq6ICR7dXRpbHMudG9EZWNpbWFsKHJlcy5saXN0Lmxpc3QzLmRpdmlkbW9uZXkvMTAsMil9IFVTRFRgXHJcbiAgICAgICAgICAgICAgICB0aGlzLlByb3BvcnRpb24zLnRleHQgPSBg5Y2g5aWW5rGgJHtyZXMubGlzdC5saXN0My5wZXJjZW50fWBcclxuICAgICAgICAgICAgICAgIHRoaXMucHJpeExpc3QzLmFycmF5ID0gcmVzLmxpc3QubGlzdDMuZGF0YVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSkuY2F0Y2goKGVycjphbnkpPT57XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyci5tZXNzYWdlKTtcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG4gfSAiLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjYgMTE6MDc6MzlcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjYgMTE6MDc6MzlcclxuICogQGRlc2Mg5YWl5Zu05ZCN5Y2VXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XHJcbmltcG9ydCB7IFRhYmJhciB9IGZyb20gXCIuLi92aWV3L1RhYmJhclwiO1xyXG5pbXBvcnQgYXBpIGZyb20gXCIuLi9qcy9hcGlcIjtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNob3J0TGlzdGVkIGV4dGVuZHMgdWkuc2hvcnRMaXN0ZWRVSSB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpXHJcbiAgICAgICAgdGhpcy5vbihMYXlhLkV2ZW50LlJFU0laRSwgdGhpcywgdGhpcy5vblJlc2l6ZSlcclxuICAgIH1cclxuXHJcbiAgICBvbkVuYWJsZSgpIHtcclxuICAgICAgICB0aGlzLmdldFNob3J0TGlzdGVkKClcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRTaG9ydExpc3RlZChwYWdlPzogbnVtYmVyKSB7XHJcbiAgICAgICAgYXBpLmdldFNob3J0TGlzdGVkKHBhZ2UpLnRoZW4oKHJlczogYW55KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuc2hvcnRMaXN0LnJlcGVhdFkgPSByZXMubGVuZ3RoO1xyXG4gICAgICAgICAgICB0aGlzLnNob3J0TGlzdC5hcnJheSA9IHJlcztcclxuICAgICAgICAgICAgdGhpcy5zaG9ydExpc3QudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgfSkuY2F0Y2goKGVycjogYW55KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMubm9EYXRhLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIubWVzc2FnZSk7XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuICAgIC8qKuebkeinhuWxj+W5leWkp+Wwj+WPmOWMliAqL1xyXG4gICAgb25SZXNpemUoKSB7XHJcbiAgICAgICAgLy/liJfooajpq5jluqbpgILphY1cclxuICAgICAgICAvLyB0aGlzLnNob3J0TGlzdC5oZWlnaHQgPSB0aGlzLmhlaWdodCAtIDEwMDtcclxuICAgIH1cclxufVxyXG4iLCJpbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcclxuaW1wb3J0IGFwaSBmcm9tIFwiLi4vanMvYXBpXCI7XHJcbmltcG9ydCB7IFRvYXN0IH0gZnJvbSBcIi4uL3ZpZXcvVG9hc3RcIjtcclxuaW1wb3J0IHsgVGFiYmFyIH0gZnJvbSBcIi4uL3ZpZXcvVGFiYmFyXCI7XHJcblxyXG4vKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjYgMTA6MjA6MTVcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjYgMTA6MjA6MTVcclxuICogQGRlc2Mg5Zac5LuO5aSp6ZmN5Lit5aWW5ZCN5Y2VXHJcbiAqL1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgV2lubmluZyBleHRlbmRzIHVpLnhjdGpVSSB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpXHJcbiAgICAgICAgdGhpcy5idG5fc2hvcnRsaXN0Lm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLlNob3J0TGlzdEZ1bmMpXHJcbiAgICAgICAgdGhpcy5vbihMYXlhLkV2ZW50LlJFU0laRSx0aGlzLHRoaXMub25SZXNpemUpXHJcbiAgICB9XHJcblxyXG4gICAgb25FbmFibGUoKXtcclxuICAgICAgICB0aGlzLmdldFhjdGpMaXN0KClcclxuICAgIH1cclxuXHJcblxyXG4gICAgcHJpdmF0ZSBnZXRYY3RqTGlzdChwYWdlPzpudW1iZXIpe1xyXG4gICAgICAgIGFwaS5nZXRYY3RqTGlzdChwYWdlKS50aGVuKChyZXM6YW55KT0+e1xyXG4gICAgICAgICAgICB0aGlzLndpbm5pbmdMaXN0LnJlcGVhdFkgPSByZXMubGVuZ3RoO1xyXG4gICAgICAgICAgICB0aGlzLndpbm5pbmdMaXN0LmFycmF5ID0gcmVzO1xyXG4gICAgICAgICAgICB0aGlzLndpbm5pbmdMaXN0LnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgIH0pLmNhdGNoKChlcnI6YW55KT0+e1xyXG4gICAgICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyLm1lc3NhZ2UpO1xyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qKuafpeeci+S7iuaXpeWFpeWbtOWQjeWNlSAqL1xyXG4gICAgcHJpdmF0ZSBTaG9ydExpc3RGdW5jKCl7XHJcbiAgICAgICAgVGFiYmFyLmdldEluc3RhbmNlKCkub3BlblNjZW5lKCdzaG9ydExpc3RlZC5zY2VuZScpXHJcbiAgICB9XHJcblxyXG4gICAgLyoq55uR6KeG5bGP5bmV5aSn5bCP5Y+Y5YyWICovXHJcbiAgICBvblJlc2l6ZSgpe1xyXG4gICAgICAgIC8v5YiX6KGo6auY5bqm6YCC6YWNID0g5bGP5bmV6auY5bqmIC0gYmFubmVyXHJcbiAgICAgICAgdGhpcy53aW5uaW5nTGlzdC5oZWlnaHQgPSB0aGlzLmhlaWdodCAtIDYwMDtcclxuICAgIH1cclxufVxyXG4iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDg6NDBcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDg6NDBcclxuICogQGRlc2Mg5Y+C5LiO6K6w5b2V6ISa5pysXHJcbiAqL1xyXG5pbXBvcnQgeyB1aSB9IGZyb20gJy4uL3VpL2xheWFNYXhVSSdcclxuaW1wb3J0IHV0aWxzIGZyb20gJy4uL2pzL3V0aWxzJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIGpvaW5SZWNvcmQgZXh0ZW5kcyB1aS50ZW1wbGF0ZS5qb2luUmVjb3Jkc1VJIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKClcclxuICAgIH1cclxuICAgIHNldCBkYXRhU291cmNlKGl0ZW06IGFueSkge1xyXG4gICAgICAgIHRoaXMuX2RhdGFTb3VyY2UgPSBpdGVtO1xyXG5cclxuICAgICAgICBpZiAoaXRlbSkge1xyXG4gICAgICAgICAgICB0aGlzLnBlcmlvZC50ZXh0ID0gaXRlbS5wZXJpb2Q7XHJcbiAgICAgICAgICAgIHRoaXMuZ29vZHNWYWx1ZS50ZXh0ID0gYCR7K3V0aWxzLnRvRGVjaW1hbChpdGVtLmdvb2RzVmFsdWUsMil9YDtcclxuICAgICAgICAgICAgdGhpcy5jb2RlTGlzdC50ZXh0ID0gaXRlbS5jb2RlTGlzdC5sZW5ndGggPiAzOCA/IGAke2l0ZW0uY29kZUxpc3Quc3Vic3RyKDAsMzgpfS4uLmAgOiBpdGVtLmNvZGVMaXN0O1xyXG5cclxuICAgICAgICAgICAgaWYgKGl0ZW0uc3RhdHVzID09PSAnMCcpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubm9Qcml6ZS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMubm9Qcml6ZS50ZXh0ID0gJ+acquW8gOWllic7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9wZW5UaW1lLnRleHQgPSAnLSc7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhpdENvZGUudGV4dCA9ICctJztcclxuICAgICAgICAgICAgfWVsc2UgaWYoaXRlbS5zdGF0dXMgPT09ICcxJyl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5vUHJpemUudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5vUHJpemUudGV4dCA9ICflvIDlpZbkuK0nO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vcGVuVGltZS50ZXh0ID0gJy0nO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaXRDb2RlLnRleHQgPSAnLSc7XHJcbiAgICAgICAgICAgIH1lbHNlIGlmKGl0ZW0uc3RhdHVzID09PSAnMicgJiYgIWl0ZW0uaGl0KXtcclxuICAgICAgICAgICAgICAgIHRoaXMubm9Qcml6ZS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMubm9Qcml6ZS50ZXh0ID0gJ+acquS4reWllic7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9wZW5UaW1lLnRleHQgPSB1dGlscy5mb3JtYXREYXRlVGltZShpdGVtLm9wZW5UaW1lKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuaGl0Q29kZS50ZXh0ID0gaXRlbS5oaXRDb2RlO1xyXG4gICAgICAgICAgICB9ZWxzZSBpZihpdGVtLnN0YXR1cyA9PT0gJzInICYmIGl0ZW0uaGl0KXtcclxuICAgICAgICAgICAgICAgIHRoaXMucHJpemUudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9wZW5UaW1lLnRleHQgPSB1dGlscy5mb3JtYXREYXRlVGltZShpdGVtLm9wZW5UaW1lKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuaGl0Q29kZS50ZXh0ID0gaXRlbS5oaXRDb2RlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hd2FyZC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYXdhcmQudGV4dCA9IGAkeyt1dGlscy50b0RlY2ltYWwoaXRlbS5hd2FyZCwyKX0gVVNEVGA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDg6NTBcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDg6NTBcclxuICogQGRlc2Mg6LSt5Lmw6aG16Z2i5Y+356CB5YiX6KGo6ISa5pysXHJcbiAqL1xyXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcclxuaW1wb3J0IHsgVG9hc3QgfSBmcm9tIFwiLi4vdmlldy9Ub2FzdFwiO1xyXG5pbXBvcnQgeyBHYW1lTW9kZWwgfSBmcm9tIFwiLi4vanMvR2FtZU1vZGVsXCI7XHJcblxyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgbnVtYmVyTGlzdERPTSBleHRlbmRzIHVpLnRlbXBsYXRlLm51bWJlckxpc3RET01VSSB7XHJcbiAgICBwcml2YXRlIHVzZXJJZDpzdHJpbmcgPSAnJztcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcigpe1xyXG4gICAgICAgIHN1cGVyKClcclxuICAgICAgICB0aGlzLm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLmNsaWNrTnVtYmVyKVxyXG4gICAgfVxyXG4gICAgc2V0IGRhdGFTb3VyY2UoaXRlbTogYW55KSB7XHJcbiAgICAgICAgdGhpcy5fZGF0YVNvdXJjZSA9IGl0ZW07XHJcbiAgICAgICAgaWYgKGl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5jb2RlLnRleHQgPSBpdGVtLmNvZGU7XHJcbiAgICAgICAgICAgIHRoaXMuYmdJbWcuc2tpbiA9IHRoaXMucmV0dXJuU3RhdHVzSW1nKGl0ZW0uYnV5ZXJJZClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgb25FbmFibGUoKXtcclxuICAgICAgICAvL+iOt+WPlueUqOaIt+i1hOS6p1xyXG4gICAgICAgIGNvbnN0IHVzZXJJbmZvOmFueSA9IEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLnVzZXJJbmZvO1xyXG4gICAgICAgIHRoaXMudXNlcklkID0gdXNlckluZm8udXNlcklkO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog6YCJ5oup5Y+356CBXHJcbiAgICAgKiBAcGFyYW0gaXRlbSDlvZPliY3mjInpkq5cclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBjbGlja051bWJlcihpdGVtOmFueSk6dm9pZCB7XHJcbiAgICAgICAgaWYgKCt0aGlzLl9kYXRhU291cmNlLmJ1eWVySWQgPiAxMCkgeyAvL+eUqOaIt2lk5b+F5aSn5LqOMTDvvIzkvZzkuLrliKTmlq3kvp3mja5cclxuICAgICAgICAgICAgVG9hc3Quc2hvdygn6K+l5Y+356CB5bey6KKr6LSt5LmwJylcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1lbHNlIGlmKHRoaXMuX2RhdGFTb3VyY2UuYnV5ZXJJZCA9PT0gJzAnKXtcclxuICAgICAgICAgICAgdGhpcy5iZ0ltZy5za2luID0gdGhpcy5yZXR1cm5TdGF0dXNJbWcoJzInKVxyXG4gICAgICAgICAgICB0aGlzLl9kYXRhU291cmNlLmJ1eWVySWQgPSAnMic7XHJcbiAgICAgICAgfWVsc2UgaWYodGhpcy5fZGF0YVNvdXJjZS5idXllcklkID09PSAnMicpe1xyXG4gICAgICAgICAgICB0aGlzLmJnSW1nLnNraW4gPSB0aGlzLnJldHVyblN0YXR1c0ltZygnMCcpXHJcbiAgICAgICAgICAgIHRoaXMuX2RhdGFTb3VyY2UuYnV5ZXJJZCA9ICcwJztcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5ldmVudChcIkdldEl0ZW1cIik7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5qC55o2u54q25oCB6L+U5Zue5a+55bqU5Zu+54mHXHJcbiAgICAgKiBAcGFyYW0gYnV5ZXJJZCAgMO+8muWPr+mAiSAy77ya6YCJ5LitIOWkp+S6jjEwOuS4jeWPr+mAiSAg562J5LqO6Ieq5bexdXNlcklk77ya5bey6YCJXHJcbiAgICAgKiBcclxuICAgICovXHJcbiAgICBwcml2YXRlIHJldHVyblN0YXR1c0ltZyhidXllcklkOnN0cmluZyl7XHJcbiAgICAgICAgaWYgKGJ1eWVySWQgPT09IHRoaXMudXNlcklkKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAnY29tcC9ndWVzc2luZy9pbWdfeWl4dWFuX3NlbGVjdDIwLnBuZydcclxuICAgICAgICB9ZWxzZSBpZigrYnV5ZXJJZCA+IDEwKXsgLy/nlKjmiLdpZOW/heWkp+S6jjEw77yM5L2c5Li65Yik5pat5L6d5o2uXHJcbiAgICAgICAgICAgIHJldHVybiAnY29tcC9ndWVzc2luZy9pbWdfbm9fc2VsZWN0MjAucG5nJ1xyXG4gICAgICAgIH1lbHNlIGlmKGJ1eWVySWQgPT09ICcyJykge1xyXG4gICAgICAgICAgICByZXR1cm4gJ2NvbXAvZ3Vlc3NpbmcvaW1nX29rX3NlbGVjdDIwLnBuZydcclxuICAgICAgICB9ZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiAnY29tcC9ndWVzc2luZy9pbWdfa2V4dWFuX3NlbGVjdDIwLnBuZydcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgXHJcbn0iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDk6MDhcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDk6MDhcclxuICogQGRlc2Mg5b6A5pyf6K6w5b2V6ISa5pysXHJcbiAqL1xyXG5pbXBvcnQgeyB1aSB9IGZyb20gJy4uL3VpL2xheWFNYXhVSSdcclxuaW1wb3J0IHV0aWxzIGZyb20gJy4uL2pzL3V0aWxzJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHByZXZpb3VzUmVjb3JkIGV4dGVuZHMgdWkudGVtcGxhdGUucHJldmlvdXNSZWNvcmRzVUkge1xyXG4gICAgY29uc3RydWN0b3IoKXtcclxuICAgICAgICBzdXBlcigpXHJcbiAgICAgICAgdGhpcy50eEhhc2gub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuc2VlSGFzaClcclxuICAgIH1cclxuICAgIHNldCBkYXRhU291cmNlKGl0ZW06IGFueSkge1xyXG4gICAgICAgIHRoaXMuX2RhdGFTb3VyY2UgPSBpdGVtO1xyXG4gICAgICAgIGlmIChpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMucGVyaW9kLnRleHQgPSBpdGVtLnBlcmlvZDtcclxuICAgICAgICAgICAgdGhpcy5yZXF1ZXN0VHlwZS50ZXh0ID0gaXRlbS5yZXF1ZXN0VHlwZTtcclxuICAgICAgICAgICAgdGhpcy5nb29kc05hbWUudGV4dCA9IGl0ZW0uZ29vZHNOYW1lO1xyXG4gICAgICAgICAgICB0aGlzLnR4SGFzaC50ZXh0ID0gaXRlbS50eEhhc2g7XHJcbiAgICAgICAgICAgIHRoaXMuaGl0Q29kZS50ZXh0ID0gaXRlbS5oaXRDb2RlO1xyXG4gICAgICAgICAgICB0aGlzLm9wZW5UaW1lLnRleHQgPSB1dGlscy5mb3JtYXREYXRlVGltZShpdGVtLm9wZW5UaW1lKTtcclxuICAgICAgICAgICAgdGhpcy5qb2luZWROdW0udGV4dCA9IGl0ZW0uam9pbmVkTnVtO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKirmn6XnnIvlk4jluIwgKi9cclxuICAgIHNlZUhhc2goKTp2b2lkIHtcclxuICAgICAgICAvLyBcImh0dHBzOi8vcm9wc3Rlbi5ldGhlcnNjYW4uaW8vdHgvXCIgOiBcImh0dHBzOi8vZXRoZXJzY2FuLmlvL3R4L1wiXHJcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBgaHR0cHM6Ly9yb3BzdGVuLmV0aGVyc2Nhbi5pby90eC8ke3RoaXMuX2RhdGFTb3VyY2UudHhIYXNofWA7XHJcbiAgICB9XHJcbn0iLCJcclxuLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTIyIDExOjQwOjQyXHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTIyIDExOjQwOjQyXHJcbiAqIEBkZXNjIOeBq+eureWkp+WlluWOhuWPsuiusOW9leiEmuacrFxyXG4gKi9cclxuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XHJcbmltcG9ydCB1dGlscyBmcm9tIFwiLi4vanMvdXRpbHNcIjtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHByaUhpc3RvcnkgZXh0ZW5kcyB1aS50ZW1wbGF0ZS5wcmlIaXN0b3J5VUkge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoKVxyXG4gICAgfVxyXG4gICAgc2V0IGRhdGFTb3VyY2UoaXRlbTogYW55KSB7XHJcbiAgICAgICAgaWYgKGl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5yYW5rTm8udGV4dCA9IGl0ZW0ucmFuayA8IDEwID8gYDAke2l0ZW0ucmFua31gIDogYCR7aXRlbS5yYW5rfWA7XHJcbiAgICAgICAgICAgIHRoaXMubmlja05hbWUudGV4dCA9IGl0ZW0ubmlja05hbWU7XHJcbiAgICAgICAgICAgIHRoaXMuVUlELnRleHQgPSBgVUlEOiAke2l0ZW0udXNlcklkfWA7XHJcbiAgICAgICAgICAgIHRoaXMuVm9sdW1lLnRleHQgPSBgJHt1dGlscy50b0RlY2ltYWwoaXRlbS5jb25zdW0sMil9IFVTRFRgXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IFxyXG4iLCJcclxuLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTIyIDExOjQwOjQyXHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTIyIDExOjQwOjQyXHJcbiAqIEBkZXNjIOeBq+eureWkp+WlluaOkuihjOamnFxyXG4gKi9cclxuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XHJcbmltcG9ydCB1dGlscyBmcm9tIFwiLi4vanMvdXRpbHNcIjtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHByaXhMaXN0IGV4dGVuZHMgdWkudGVtcGxhdGUucHJpeExpc3RVSSB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpXHJcbiAgICB9XHJcbiAgICBzZXQgZGF0YVNvdXJjZShpdGVtOiBhbnkpIHtcclxuICAgICAgICBpZiAoaXRlbSkge1xyXG4gICAgICAgICAgICB0aGlzLm5vMS52aXNpYmxlID0gaXRlbS5yYW5rID09PSAxID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLnJhbmtOby52aXNpYmxlID0gaXRlbS5yYW5rID09PSAxID8gZmFsc2UgOiB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLnJhbmtOby50ZXh0ID0gaXRlbS5yYW5rO1xyXG4gICAgICAgICAgICB0aGlzLmF2YXRhci5za2luID0gaXRlbS5hdmF0YXI7XHJcbiAgICAgICAgICAgIHRoaXMubmlja05hbWUudGV4dCA9IGl0ZW0ubmlja05hbWU7XHJcbiAgICAgICAgICAgIHRoaXMuVUlELnRleHQgPSBgVUlEOiAke2l0ZW0udXNlcklkfWA7XHJcbiAgICAgICAgICAgIHRoaXMudG9kYXlWb2x1bWUudGV4dCA9IGAke3V0aWxzLnRvRGVjaW1hbChpdGVtLmNvbnN1bSwyKX0gVVNEVGBcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0gXHJcbiIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0OToyM1xyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0OToyM1xyXG4gKiBAZGVzYyDkuqTmmJPlr4bnoIHovpPlhaXlvLnnqpfohJrmnKxcclxuICovXHJcbmltcG9ydCB7IHVpIH0gZnJvbSAnLi4vdWkvbGF5YU1heFVJJ1xyXG5pbXBvcnQgVGlwc0RpYUxvZyBmcm9tICcuL3RpcERpYWxvZyc7XHJcbmltcG9ydCB7IFRvYXN0IH0gZnJvbSAnLi4vdmlldy9Ub2FzdCc7XHJcbmltcG9ydCBHdWVzc2luZyBmcm9tICcuLi9zY3JpcHQvR3Vlc3NpbmcnO1xyXG5pbXBvcnQgYXBpIGZyb20gJy4uL2pzL2FwaSc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBJcHRQc3dEb20gZXh0ZW5kcyB1aS50ZW1wbGF0ZS5JbnB1dFB3ZERpYWxvZ1VJIHtcclxuXHJcbiAgICBwcml2YXRlIHBlcmlvZDpzdHJpbmcgPSAnJzsvL+acn+WPt1xyXG4gICAgcHJpdmF0ZSBjb2RlTGlzdDpzdHJpbmcgPSAnJzsvL+i0reS5sOWPt+eggVxyXG4gICAgcHJpdmF0ZSBpc0VudGVyOmJvb2xlYW4gPSBmYWxzZTsgLy/lh73mlbDoioLmtYFcclxuICAgIHByaXZhdGUgQWxsQ29kZUxpc3Q6YW55ID0gW107Ly/miYDmnInlj7fnoIHliJfooahcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpXHJcbiAgICB9XHJcbiAgICBvbkVuYWJsZSgpe1xyXG4gICAgICAgIHRoaXMuYnRuQ2xvc2Uub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuY2xvc2VGdW5jKVxyXG4gICAgICAgIHRoaXMuSXB0UHN3Lm9uKExheWEuRXZlbnQuRk9DVVMsdGhpcyx0aGlzLm9uRm9jdXMpXHJcbiAgICAgICAgdGhpcy5JcHRQc3cub24oTGF5YS5FdmVudC5CTFVSLHRoaXMsdGhpcy5vbkJMVVIpXHJcbiAgICAgICAgdGhpcy5JcHRQc3cub24oTGF5YS5FdmVudC5LRVlfVVAsdGhpcyx0aGlzLm9uQ2hhbmdlKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKuiOt+WPluS8oOmAkueahOWPguaVsCAqL1xyXG4gICAgc2V0RGF0YShkYXRhOmFueSkge1xyXG4gICAgICAgIHRoaXMucGVyaW9kID0gZGF0YS5wZXJpb2Q7XHJcbiAgICAgICAgdGhpcy5jb2RlTGlzdCA9IGRhdGEuY29kZUxpc3Q7XHJcbiAgICAgICAgdGhpcy5BbGxDb2RlTGlzdCA9IGRhdGEuQWxsQ29kZUxpc3Q7XHJcbiAgICB9XHJcblxyXG4gICAgLyoq6L6T5YWl5YaF5a655pS55Y+YICovXHJcbiAgICBwcml2YXRlIG9uQ2hhbmdlKCl7XHJcbiAgICAgICAgaWYgKCF0aGlzLmlzRW50ZXIgJiYgdGhpcy5JcHRQc3cudGV4dC5sZW5ndGggPT09IDYpIHtcclxuICAgICAgICAgICAgdGhpcy50cmFkZUJ1eSgpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKui0reS5sCAqL1xyXG4gICAgcHJpdmF0ZSB0cmFkZUJ1eSgpe1xyXG4gICAgICAgIHRoaXMuaXNFbnRlciA9IHRydWU7XHJcbiAgICAgICAgYXBpLnBvc3RUcmFkZUJ1eSh0aGlzLnBlcmlvZCx0aGlzLmNvZGVMaXN0LHRoaXMuSXB0UHN3LnRleHQpLnRoZW4oKHJlczphbnkpPT57XHJcbiAgICAgICAgICAgIHRoaXMuaXNFbnRlciA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLmNsb3NlRnVuYygpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5ldmVudChcInJlZnJlc2hEYXRhXCIpOy8v5Yi35paw5pWw5o2u5YiX6KGoXHJcbiAgICAgICAgICAgIC8vIOi0reS5sOaIkOWKn+W8ueWHuuWvueivneahhlxyXG4gICAgICAgICAgICBsZXQgdGlwc0RpYWxvZzpUaXBzRGlhTG9nID0gbmV3IFRpcHNEaWFMb2coKVxyXG4gICAgICAgICAgICB0aXBzRGlhbG9nLnBvcHVwKClcclxuICAgICAgICAgICAgdGlwc0RpYWxvZy5zZXREYXRhKHtcclxuICAgICAgICAgICAgICAgIEFsbENvZGVMaXN0OnRoaXMuQWxsQ29kZUxpc3RcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9KS5jYXRjaCgoZXJyOmFueSk9PntcclxuICAgICAgICAgICAgdGhpcy5pc0VudGVyID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMuY2xvc2VGdW5jKCk7XHJcblxyXG4gICAgICAgICAgICBUb2FzdC5zaG93KGVyci5tZXNzYWdlKVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgLyoq5YWz6Zet5a+G56CB5qGGICovXHJcbiAgICBwcml2YXRlIGNsb3NlRnVuYygpe1xyXG4gICAgICAgIHRoaXMuY2xvc2UoKTtcclxuICAgIH1cclxuICAgIC8qKui+k+WFpeahhuiOt+W+l+eEpueCuSAqL1xyXG4gICAgcHJpdmF0ZSBvbkZvY3VzKCl7XHJcbiAgICAgICAgdGhpcy50b3AgPSAxNTA7XHJcbiAgICB9XHJcbiAgICAvKirovpPlhaXmoYbojrflvpfnhKbngrkgKi9cclxuICAgIHByaXZhdGUgb25CTFVSKCl7XHJcbiAgICAgICB0aGlzLnRvcCA9IDQ0MDtcclxuICAgIH1cclxufSIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0yNiAxMToxMjowOVxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yNiAxMToxMjowOVxyXG4gKiBAZGVzYyDlhaXlm7TlkI3ljZXliJfooahcclxuICovXHJcblxyXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHNob3J0TGlzdEJveCBleHRlbmRzIHVpLnRlbXBsYXRlLnNob3J0TGlzdFVJIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKClcclxuICAgIH1cclxuICAgIHNldCBkYXRhU291cmNlKGl0ZW06IGFueSkge1xyXG4gICAgICAgIGlmIChpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMubnVtYmVyLnRleHQgPSBpdGVtLnNob3J0bGlzdGVkTnVtYmVyIDwgMTAgPyBgMCR7aXRlbS5zaG9ydGxpc3RlZE51bWJlcn1gIDogaXRlbS5zaG9ydGxpc3RlZE51bWJlcjtcclxuICAgICAgICAgICAgdGhpcy5uaWNrTmFtZS50ZXh0ID0gaXRlbS5uaWNrTmFtZTtcclxuICAgICAgICAgICAgdGhpcy51c2VySWQudGV4dCA9IGl0ZW0udXNlcklkO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG4iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDQ6MDJcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDQ6MDJcclxuICogQGRlc2Mg6LSt5Lmw5oiQ5Yqf5ZCO55qE5o+Q56S65qGG6ISa5pysXHJcbiAqL1xyXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcclxuaW1wb3J0IHsgVGFiYmFyIH0gZnJvbSBcIi4uL3ZpZXcvVGFiYmFyXCI7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUaXBzRGlhTG9nIGV4dGVuZHMgdWkudGVtcGxhdGUuVGlwc0RpYWxvZ1VJIHtcclxuICAgIHByaXZhdGUgQWxsQ29kZUxpc3Q6b2JqZWN0W10gPSBbXTsvL+WPt+eggeWIl+ihqFxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoKVxyXG4gICAgfVxyXG4gICAgb25FbmFibGUoKXtcclxuICAgICAgICB0aGlzLmJ0bkNvbnRpbnVlLm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLmNsb3NlRnVuYylcclxuICAgICAgICB0aGlzLmJ0blZpZXdSZWNvcmQub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMudmlld1JlY29yZEZ1bmMpXHJcbiAgICAgICAgXHJcbiAgICB9XHJcblxyXG4gICAgLyoq6I635Y+W5Lyg6YCS55qE5Y+C5pWwICovXHJcbiAgICBzZXREYXRhKGRhdGE6YW55KSB7XHJcbiAgICAgICAgdGhpcy5BbGxDb2RlTGlzdCA9IGRhdGEuQWxsQ29kZUxpc3Q7XHJcbiAgICB9XHJcblxyXG4gICAgLyoq5YWz6Zet5a+G56CB5qGGICovXHJcbiAgICBwcml2YXRlIGNsb3NlRnVuYygpe1xyXG5cclxuICAgICAgICB0aGlzLmNsb3NlKCk7XHJcbiAgICAgICAgLy8g6Iul5YWo6YOo6KKr6LSt5Lmw77yM5YiZ5Zue5Yiw6aaW6aG16YeN5paw6YCJ5oup6LSt5Lmw5pyf5Y+3XHJcbiAgICAgICAgbGV0IGNvdW50Om51bWJlciA9IDA7XHJcbiAgICAgICAgdGhpcy5BbGxDb2RlTGlzdC5mb3JFYWNoKCh2OmFueSkgPT4ge1xyXG4gICAgICAgICAgICBpZiAodi5idXllcklkICE9PSAnMCcpIHtcclxuICAgICAgICAgICAgICAgIGNvdW50ID0gY291bnQgKyAxO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgaWYgKGNvdW50ID09PSB0aGlzLkFsbENvZGVMaXN0Lmxlbmd0aCkge1xyXG4gICAgICAgICAgICBUYWJiYXIuZ2V0SW5zdGFuY2UoKS5vcGVuU2NlbmUoJ2hvbWUuc2NlbmUnKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyDmn6XnnIvorrDlvZVcclxuICAgIHByaXZhdGUgdmlld1JlY29yZEZ1bmMoKXtcclxuICAgICAgICB0aGlzLmNsb3NlKCk7XHJcbiAgICAgICAgVGFiYmFyLmdldEluc3RhbmNlKCkub3BlblNjZW5lKCdyZWNvcmQuc2NlbmUnKVxyXG4gICAgfVxyXG59IiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTIxIDE2OjMyOjAxXHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTIxIDE2OjMyOjAxXHJcbiAqIEBkZXNjIOi1sOWKv+WIl+ihqOiEmuacrFxyXG4gKi9cclxuXHJcbmltcG9ydCB7IHVpIH0gZnJvbSAnLi4vdWkvbGF5YU1heFVJJ1xyXG5pbXBvcnQgdXRpbHMgZnJvbSAnLi4vanMvdXRpbHMnO1xyXG5pbXBvcnQgeyBUYWJiYXIgfSBmcm9tICcuLi92aWV3L1RhYmJhcic7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyB0cmVuZExpc3QgZXh0ZW5kcyB1aS50ZW1wbGF0ZS50cmVuZExpc3RVSSB7XHJcbiAgICBwcml2YXRlIF9pdGVtOmFueTtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKClcclxuICAgICAgICB0aGlzLmJ0bkJ1eS5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5idG5CdXlGdW5jKVxyXG4gICAgfVxyXG4gICAgc2V0IGRhdGFTb3VyY2UoaXRlbTphbnkpe1xyXG4gICAgICAgIHRoaXMuX2l0ZW0gPSBpdGVtO1xyXG4gICAgICAgIGlmIChpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMucGVyaW9kLnRleHQgPSBpdGVtLnBlcmlvZDtcclxuICAgICAgICAgICAgdGhpcy5oaXRDb2RlLnRleHQgPSBpdGVtLmhpdENvZGU7XHJcbiAgICAgICAgICAgIHRoaXMub2RkX2V2ZW4udGV4dCA9IGl0ZW0uaXMgPT09IDAgPyAnLScgOiAgaXRlbS5pcyA9PT0gMSA/ICflpYcnIDogJ+WBtic7XHJcbiAgICAgICAgICAgIHRoaXMuaXNCaWcudGV4dCA9IGl0ZW0uaXMgPT09IDAgPyAnLScgOiBpdGVtLmlzQmlnID8gJ+WkpycgOiAn5bCPJztcclxuXHJcbiAgICAgICAgICAgIGlmIChpdGVtLmlzID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ0bkJ1eS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuaGl0Q29kZS52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgdGhpcy5idG5CdXkudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaXRDb2RlLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIOWlh+WBtuaWh+Wtl+minOiJslxyXG4gICAgICAgICAgICBpZiAoaXRlbS5pcyA9PT0gMSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vZGRfZXZlbi5jb2xvciA9ICcjZjE0ODQ4JztcclxuICAgICAgICAgICAgfWVsc2UgaWYoaXRlbS5pcyA9PT0gMil7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9kZF9ldmVuLmNvbG9yID0gJyMyNWZmZmQnO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIOWkp+Wwj+aWh+Wtl+minOiJslxyXG4gICAgICAgICAgICBpZiAoIWl0ZW0uaXNCaWcgJiYgaXRlbS5pcyAhPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pc0JpZy5jb2xvciA9ICcjZjE0ODQ4JztcclxuICAgICAgICAgICAgfWVsc2UgaWYoaXRlbS5pc0JpZyAmJiBpdGVtLmlzICE9PSAwKXtcclxuICAgICAgICAgICAgICAgIHRoaXMuaXNCaWcuY29sb3IgPSAnIzI1ZmZmZCc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoq56uL5Y2z6LSt5LmwICovXHJcbiAgICBwcml2YXRlIGJ0bkJ1eUZ1bmMoKXtcclxuICAgICAgICBjb25zb2xlLmxvZyh0aGlzLl9pdGVtLnBlcmlvZCk7XHJcbiAgICAgICAgVGFiYmFyLmdldEluc3RhbmNlKCkub3BlblNjZW5lKCdndWVzc2luZy5zY2VuZScsdGhpcy5faXRlbS5nb29kc0lkKVxyXG4gICAgfVxyXG59IiwiaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XHJcbmltcG9ydCB1dGlscyBmcm9tIFwiLi4vanMvdXRpbHNcIjtcclxuXHJcbi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0yNiAxMDoyMTozN1xyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yNiAxMDoyMTozN1xyXG4gKiBAZGVzYyDllpzku47lpKnpmY3kuK3lpZblkI3ljZXliJfooajohJrmnKxcclxuICovXHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBXaW5uaW5nTGlzdCBleHRlbmRzIHVpLnRlbXBsYXRlLndpbm5pbmdMaXN0VUkge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoKVxyXG4gICAgfVxyXG4gICAgc2V0IGRhdGFTb3VyY2UoaXRlbTogYW55KSB7XHJcbiAgICAgICAgaWYgKGl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5wZXJpb2QudGV4dCA9IGl0ZW0uYmVsb25nVGltZTtcclxuICAgICAgICAgICAgdGhpcy5kYXRlLnRleHQgPSB1dGlscy5mb3JtYXREYXRlVGltZShpdGVtLmJhbGFuY2VUaW1lKTtcclxuICAgICAgICAgICAgdGhpcy5uaWNrTmFtZS50ZXh0ID0gaXRlbS5uaWNrTmFtZTtcclxuICAgICAgICAgICAgdGhpcy5hbW91bnQudGV4dCA9IGAkeytpdGVtLm1vbmV5fSBVU0RUYDtcclxuICAgICAgICAgICAgdGhpcy5jb2RlLnRleHQgPSBpdGVtLmhpdE51bWJlcjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuIiwiLyoqVGhpcyBjbGFzcyBpcyBhdXRvbWF0aWNhbGx5IGdlbmVyYXRlZCBieSBMYXlhQWlySURFLCBwbGVhc2UgZG8gbm90IG1ha2UgYW55IG1vZGlmaWNhdGlvbnMuICovXG5pbXBvcnQgVmlldz1MYXlhLlZpZXc7XHJcbmltcG9ydCBEaWFsb2c9TGF5YS5EaWFsb2c7XHJcbmltcG9ydCBTY2VuZT1MYXlhLlNjZW5lO1xuZXhwb3J0IG1vZHVsZSB1aSB7XHJcbiAgICBleHBvcnQgY2xhc3MgYXNzaXN0YW50VUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyBidG5fdHJlbmQ6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgYnRuX3ByZWJ1eTpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBjYXRlVGFiTGlzdDpMYXlhLkxpc3Q7XG5cdFx0cHVibGljIGxpc3RUaXRsZTpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgdHJlbmRMaXN0OkxheWEuTGlzdDtcblx0XHRwdWJsaWMgcHJlYnV5OkxheWEuTGlzdDtcblx0XHRwdWJsaWMgbm9EYXRhOkxheWEuSW1hZ2U7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJhc3Npc3RhbnRcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIENhcmRVSSBleHRlbmRzIExheWEuVmlldyB7XHJcblx0XHRwdWJsaWMgYW5pMTpMYXlhLkZyYW1lQW5pbWF0aW9uO1xuXHRcdHB1YmxpYyBjYXJkSXRlbTpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBzY2VuZUltZzpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBnb29kc05hbWU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgcHJvZ3Jlc3M6TGF5YS5Qcm9ncmVzc0Jhcjtcblx0XHRwdWJsaWMgc29sZE51bV90b3RhbE51bTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBhd2FyZDpMYXlhLkxhYmVsO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwiQ2FyZFwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgZ3JhbmRQcml4VUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyBDb3VudERvd246TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgYm9udXM6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgYnRuX2hpc3Rvcnk6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIHJhbmtQcml6ZUhlbHA6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIGJveDE6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIGFsb25lMTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBQcm9wb3J0aW9uMTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBwcml4TGlzdDE6TGF5YS5MaXN0O1xuXHRcdHB1YmxpYyBib3gyOkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyBhbG9uZTI6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgUHJvcG9ydGlvbjI6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgcHJpeExpc3QyOkxheWEuTGlzdDtcblx0XHRwdWJsaWMgYm94MzpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgYWxvbmUzOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIFByb3BvcnRpb24zOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHByaXhMaXN0MzpMYXlhLkxpc3Q7XG5cdFx0cHVibGljIG5vRGF0YTpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBteVJhbmtCb3g6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgbXlyYW5raW5nOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGF2YXRhcjpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBuaWNrTmFtZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyB1aWQ6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgdm9sdW1lVGl0bGU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgdm9sdW1lOkxheWEuTGFiZWw7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJncmFuZFByaXhcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIGd1ZXNzaW5nVUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyBwcmljZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBnb29kc1ZhbHVlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHByb2dyZXNzU3BlZWQ6TGF5YS5Qcm9ncmVzc0Jhcjtcblx0XHRwdWJsaWMgc29sZE51bV9zb2xkTnVtOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHBlcmlvZDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBudW1iZXJMaXN0OkxheWEuTGlzdDtcblx0XHRwdWJsaWMgZXN0aW1hdGU6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIHRvdGFsOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGJhbGFuY2VCb3g6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIGJhbGFuY2U6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgYnRuX2J1eTpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBidG5fc2VsZWN0OkxheWEuVmlldztcblx0XHRwdWJsaWMgcmFuZG9tX29uZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyByYW5kb21fYmVmb3JlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHJhbmRvbV9hZnRlcjpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyByYW5kb21fYWxsOkxheWEuTGFiZWw7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJndWVzc2luZ1wiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgaG9tZVVJIGV4dGVuZHMgTGF5YS5TY2VuZSB7XHJcblx0XHRwdWJsaWMgcHV0X2luOkxheWEuRnJhbWVBbmltYXRpb247XG5cdFx0cHVibGljIHJvY2tldF9zaG93OkxheWEuRnJhbWVBbmltYXRpb247XG5cdFx0cHVibGljIGRvbV9zaG93OkxheWEuRnJhbWVBbmltYXRpb247XG5cdFx0cHVibGljIGJnX2FuaTpMYXlhLkZyYW1lQW5pbWF0aW9uO1xuXHRcdHB1YmxpYyBiZ19hbmltYXRpb246TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIHR1aWNodTpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBBY2NvdW50Qm94OkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIGF2YXRhcjpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBuaWNrTmFtZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyByZWNoYXJnZUJveDpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBidG5SZWNoYXJnZTpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBteUFtb3VudDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBidXlIZWxwOkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyByb2NrZXJCb3g6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIHJvY2tldEFtb3VudDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBjb3VudERvd246TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIHJvY2tldENvdW50RG93bjpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBsaXN0OkxheWEuTGlzdDtcblx0XHRwdWJsaWMgcHV0aW46TGF5YS5JbWFnZTtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcImhvbWVcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIHByaUhpc3RvcnlTY2VuZVVJIGV4dGVuZHMgTGF5YS5TY2VuZSB7XHJcblx0XHRwdWJsaWMgdG90YWw6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgbGlzdEJveDpMYXlhLlBhbmVsO1xuXHRcdHB1YmxpYyBib3gxOkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyBhbG9uZTE6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgUHJvcG9ydGlvbjE6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgcHJpeExpc3QxOkxheWEuTGlzdDtcblx0XHRwdWJsaWMgYm94MjpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgYWxvbmUyOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIFByb3BvcnRpb24yOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHByaXhMaXN0MjpMYXlhLkxpc3Q7XG5cdFx0cHVibGljIGJveDM6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIGFsb25lMzpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBQcm9wb3J0aW9uMzpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBwcml4TGlzdDM6TGF5YS5MaXN0O1xuXHRcdHB1YmxpYyBub0RhdGE6TGF5YS5JbWFnZTtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInByaUhpc3RvcnlTY2VuZVwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgcmVjb3JkVUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyBjYW55dTpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyB3YW5ncWk6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgam9pbkxpc3Q6TGF5YS5MaXN0O1xuXHRcdHB1YmxpYyBwcmV2aW9vdXNMaXN0OkxheWEuTGlzdDtcblx0XHRwdWJsaWMgbm9EYXRhOkxheWEuSW1hZ2U7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJyZWNvcmRcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIHNob3J0TGlzdGVkVUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyBzaG9ydExpc3Q6TGF5YS5MaXN0O1xuXHRcdHB1YmxpYyBub0RhdGE6TGF5YS5JbWFnZTtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInNob3J0TGlzdGVkXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBUYWJiYXJVSSBleHRlbmRzIExheWEuVmlldyB7XHJcblx0XHRwdWJsaWMgdGFiOkxheWEuVGFiO1xuXHRcdHB1YmxpYyBub3RpY2U6TGF5YS5TcHJpdGU7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJUYWJiYXJcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIHhjdGpVSSBleHRlbmRzIExheWEuU2NlbmUge1xyXG5cdFx0cHVibGljIHhjdGpfc2h1b21pbmc6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIGFtb3VudDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyB1bml0OkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGNvdW50RG93bjpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBidG5fc2hvcnRsaXN0OkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIHdpbm5pbmdfY29kZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyB3aW5uaW5nTGlzdDpMYXlhLkxpc3Q7XG5cdFx0cHVibGljIG5vRGF0YTpMYXlhLkltYWdlO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwieGN0alwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0IG1vZHVsZSB1aS50ZW1wbGF0ZSB7XHJcbiAgICBleHBvcnQgY2xhc3MgSW5wdXRQd2REaWFsb2dVSSBleHRlbmRzIExheWEuRGlhbG9nIHtcclxuXHRcdHB1YmxpYyB0aXRsZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBidG5DbG9zZTpMYXlhLkJveDtcblx0XHRwdWJsaWMgSXB0UHN3OkxheWEuVGV4dElucHV0O1xuXHRcdHB1YmxpYyBmb3JnZXRQYXNzd29yZDpMYXlhLkxhYmVsO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwidGVtcGxhdGUvSW5wdXRQd2REaWFsb2dcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIGpvaW5SZWNvcmRzVUkgZXh0ZW5kcyBMYXlhLlZpZXcge1xyXG5cdFx0cHVibGljIHBlcmlvZDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBub1ByaXplOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHByaXplOkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIGdvb2RzVmFsdWU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgb3BlblRpbWU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgaGl0Q29kZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBjb2RlTGlzdDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBhd2FyZDpMYXlhLkxhYmVsO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwidGVtcGxhdGUvam9pblJlY29yZHNcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIG51bWJlckxpc3RET01VSSBleHRlbmRzIExheWEuVmlldyB7XHJcblx0XHRwdWJsaWMgYmdJbWc6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgY29kZTpMYXlhLkxhYmVsO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwidGVtcGxhdGUvbnVtYmVyTGlzdERPTVwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgcHJldmlvdXNSZWNvcmRzVUkgZXh0ZW5kcyBMYXlhLlZpZXcge1xyXG5cdFx0cHVibGljIHBlcmlvZDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyByZXF1ZXN0VHlwZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBnb29kc05hbWU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgdHhIYXNoOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGhpdENvZGU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgb3BlblRpbWU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgam9pbmVkTnVtOkxheWEuTGFiZWw7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJ0ZW1wbGF0ZS9wcmV2aW91c1JlY29yZHNcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIHByaUhpc3RvcnlVSSBleHRlbmRzIExheWEuU2NlbmUge1xyXG5cdFx0cHVibGljIHJhbmtObzpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBuaWNrTmFtZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBVSUQ6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgVm9sdW1lOkxheWEuTGFiZWw7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJ0ZW1wbGF0ZS9wcmlIaXN0b3J5XCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBwcml4TGlzdFVJIGV4dGVuZHMgTGF5YS5TY2VuZSB7XHJcblx0XHRwdWJsaWMgbm8xOkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIHJhbmtObzpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBhdmF0YXI6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgbmlja05hbWU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgVUlEOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHRvZGF5Vm9sdW1lVGl0bGU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgdG9kYXlWb2x1bWU6TGF5YS5MYWJlbDtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInRlbXBsYXRlL3ByaXhMaXN0XCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBzaG9ydExpc3RVSSBleHRlbmRzIExheWEuU2NlbmUge1xyXG5cdFx0cHVibGljIG51bWJlcjpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBuaWNrTmFtZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyB1c2VySWQ6TGF5YS5MYWJlbDtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInRlbXBsYXRlL3Nob3J0TGlzdFwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgVGlwc0RpYWxvZ1VJIGV4dGVuZHMgTGF5YS5EaWFsb2cge1xyXG5cdFx0cHVibGljIHRpdGxlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGJ0blZpZXdSZWNvcmQ6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgYnRuQ29udGludWU6TGF5YS5JbWFnZTtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInRlbXBsYXRlL1RpcHNEaWFsb2dcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIHRyZW5kTGlzdFVJIGV4dGVuZHMgTGF5YS5TY2VuZSB7XHJcblx0XHRwdWJsaWMgcGVyaW9kOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGhpdENvZGU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgYnRuQnV5OkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIG9kZF9ldmVuOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGlzQmlnOkxheWEuTGFiZWw7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJ0ZW1wbGF0ZS90cmVuZExpc3RcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIHdpbm5pbmdMaXN0VUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyBwZXJpb2RCb3g6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIHBlcmlvZDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBkYXRlQm94OkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyBkYXRlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIG5hbWVCb3g6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIG5pY2tOYW1lOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGFtb3VudEJveDpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgYW1vdW50OkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGNvZGVCb3g6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIGNvZGU6TGF5YS5MYWJlbDtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInRlbXBsYXRlL3dpbm5pbmdMaXN0XCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyIiwiZXhwb3J0IGNvbnN0IExheWVyVHlwZSA9IHtcclxuICAgIExBWUVSX1NDRU5FOiBcIkxBWUVSX1NDRU5FXCIsXHJcbiAgICBMQVlFUl9VSTogXCJMQVlFUl9VSVwiLFxyXG4gICAgTEFZRVJfTVNHOiBcIkxBWUVSX01TR1wiXHJcbn1cclxuY29uc3QgbGF5ZXJNYXAgPSB7fTtcclxuXHJcbmV4cG9ydCBjbGFzcyBMYXllck1hbmFnZXIge1xyXG4gICAgc3RhdGljIGluaXRlZDogYm9vbGVhbjtcclxuICAgIHN0YXRpYyBpbml0KGxheWVyczogc3RyaW5nW10pIHtcclxuICAgICAgICBsYXllcnMuZm9yRWFjaCgobGF5ZXJOYW1lOiBzdHJpbmcpID0+IHtcclxuICAgICAgICAgICAgaWYgKGxheWVyTmFtZSA9PT0gTGF5ZXJUeXBlLkxBWUVSX1NDRU5FKSB7XHJcbiAgICAgICAgICAgICAgICBsYXllck1hcFtsYXllck5hbWVdID0gTGF5YS5TY2VuZS5yb290O1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbGF5ZXI6IExheWEuVUlDb21wb25lbnQgPSBsYXllck1hcFtsYXllck5hbWVdID0gbmV3IExheWEuVUlDb21wb25lbnQoKTtcclxuICAgICAgICAgICAgICAgIGxheWVyLmxlZnQgPSAwO1xyXG4gICAgICAgICAgICAgICAgbGF5ZXIucmlnaHQgPSAwO1xyXG4gICAgICAgICAgICAgICAgbGF5ZXIudG9wID0gMDtcclxuICAgICAgICAgICAgICAgIGxheWVyLmJvdHRvbSA9IDA7XHJcbiAgICAgICAgICAgICAgICBMYXlhLnN0YWdlLmFkZENoaWxkKGxheWVyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIC8vIExheWEuc3RhZ2Uub24oTGF5YS5FdmVudC5SRVNJWkUsIHRoaXMsIHRoaXMub25SZXNpemUpO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBhZGRUb0xheWVyKG5vZGU6IExheWEuTm9kZSwgbGF5ZXJOYW1lKTogQm9vbGVhbiB7XHJcbiAgICAgICAgTGF5ZXJNYW5hZ2VyLmNoZWNrSW5pdCgpO1xyXG4gICAgICAgIGlmICghbm9kZSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIGNvbnN0IGxheWVyID0gbGF5ZXJNYXBbbGF5ZXJOYW1lXTtcclxuICAgICAgICBpZiAoIWxheWVyKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgbGF5ZXIuYWRkQ2hpbGQobm9kZSk7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHJlbW92ZUZyb21MYXllcihub2RlOiBMYXlhLk5vZGUsIGxheWVyTmFtZSk6IEJvb2xlYW4ge1xyXG4gICAgICAgIExheWVyTWFuYWdlci5jaGVja0luaXQoKTtcclxuICAgICAgICBjb25zdCBsYXllcjogTGF5YS5VSUNvbXBvbmVudCA9IGxheWVyTWFwW2xheWVyTmFtZV07XHJcbiAgICAgICAgaWYgKGxheWVyKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJOb2RlOiBMYXlhLk5vZGUgPSBsYXllci5yZW1vdmVDaGlsZChub2RlKVxyXG4gICAgICAgICAgICBpZiAock5vZGUpIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGdldExheWVyKGxheWVyTmFtZSk6IExheWEuQ29tcG9uZW50IHtcclxuICAgICAgICByZXR1cm4gbGF5ZXJNYXBbbGF5ZXJOYW1lXTtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgY2hlY2tJbml0KCkge1xyXG4gICAgICAgIGlmIChMYXllck1hbmFnZXIuaW5pdGVkKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgTGF5ZXJNYW5hZ2VyLmluaXQoW1xyXG4gICAgICAgICAgICBMYXllclR5cGUuTEFZRVJfU0NFTkUsXHJcbiAgICAgICAgICAgIExheWVyVHlwZS5MQVlFUl9VSSxcclxuICAgICAgICAgICAgTGF5ZXJUeXBlLkxBWUVSX01TR1xyXG4gICAgICAgIF0pO1xyXG4gICAgICAgIExheWVyTWFuYWdlci5pbml0ZWQgPSB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc3RhdGljIG9uUmVzaXplKCk6IHZvaWQge1xyXG4gICAgICAgIGZvciAoY29uc3QgbGF5ZXJOYW1lIGluIGxheWVyTWFwKSB7XHJcbiAgICAgICAgICAgIGlmIChsYXllck5hbWUgIT09IExheWVyVHlwZS5MQVlFUl9TQ0VORSAmJiBsYXllck1hcC5oYXNPd25Qcm9wZXJ0eShsYXllck5hbWUpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBsYXllcjogTGF5YS5VSUNvbXBvbmVudCA9IGxheWVyTWFwW2xheWVyTmFtZV07XHJcbiAgICAgICAgICAgICAgICBsYXllci5zaXplKExheWEuc3RhZ2Uud2lkdGgsIExheWEuc3RhZ2UuaGVpZ2h0KTtcclxuICAgICAgICAgICAgICAgIGxheWVyLmV2ZW50KExheWEuRXZlbnQuUkVTSVpFKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbn0iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NTA6MTBcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NTA6MTBcclxuICogQGRlc2Mg5bqV6YOo5a+86IiqVGFiYmFy6ISa5pysXHJcbiAqL1xyXG5pbXBvcnQgeyB1aSB9IGZyb20gJy4uL3VpL2xheWFNYXhVSSdcclxuaW1wb3J0IHsgR2FtZU1vZGVsIH0gZnJvbSAnLi4vanMvR2FtZU1vZGVsJztcclxuXHJcblxyXG5jb25zdCB0YWJiYXJBcnI6c3RyaW5nW10gPSBbJ2hvbWUuc2NlbmUnLCdyZWNvcmQuc2NlbmUnLCdhc3Npc3RhbnQuc2NlbmUnXSAvL3RhYmJhcueahOmhtemdolxyXG5jb25zdCBwYWdlQXJyOnN0cmluZ1tdID0gW1xyXG4gICAgJ2d1ZXNzaW5nLnNjZW5lJywnZ3JhbmRQcml4LnNjZW5lJyxcclxuICAgICdwcmlIaXN0b3J5U2NlbmUuc2NlbmUnLCd4Y3RqLnNjZW5lJyxcclxuICAgICdzaG9ydExpc3RlZC5zY2VuZSdcclxuXSAvL+mdnnRhYmJhcumhtemdolxyXG5cclxuZXhwb3J0IGNsYXNzIFRhYmJhciBleHRlbmRzIHVpLlRhYmJhclVJIHtcclxuICAgIC8qKumhtemdouS8oOmAkueahOWPguaVsCAqL1xyXG4gICAgcHJpdmF0ZSBfb3BlblNjZW5lUGFyYW06IGFueTtcclxuICAgIC8qKumAieS4reeahHRhYmJhciAqL1xyXG4gICAgc3RhdGljIF90YWJiYXI6VGFiYmFyO1xyXG4gICAgLyoq6aG16Z2i5pWw57uEICovXHJcbiAgICBzdGF0aWMgcmVhZG9ubHkgU0NFTkVTOnN0cmluZ1tdID0gWy4uLnRhYmJhckFyciwuLi5wYWdlQXJyXVxyXG5cclxuICAgIHN0YXRpYyBnZXRJbnN0YW5jZSgpOlRhYmJhciB7XHJcbiAgICAgICAgaWYoIXRoaXMuX3RhYmJhcil7XHJcbiAgICAgICAgICAgIHRoaXMuX3RhYmJhciA9IG5ldyBUYWJiYXIoKVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdGhpcy5fdGFiYmFyO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBzaG93KCl7XHJcbiAgICAgICAgbGV0IHRhYkluczpUYWJiYXIgPSB0aGlzLmdldEluc3RhbmNlKClcclxuICAgICAgICBMYXlhLnN0YWdlLmFkZENoaWxkKHRhYklucylcclxuICAgIH1cclxuICAgIHN0YXRpYyBoaWRlKCl7XHJcbiAgICAgICAgaWYodGhpcy5fdGFiYmFyKXtcclxuICAgICAgICAgICAgdGhpcy5fdGFiYmFyLnJlbW92ZVNlbGYoKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgb25FbmFibGUoKXtcclxuICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5vbignZ2V0Tm90aWNlJyx0aGlzLChyZXM6YW55KT0+e1xyXG4gICAgICAgICAgICBpZiAocmVzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5vdGljZS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5vdGljZS52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIC8qKumdnnRhYmJhcui3s+i9rOmhtemdoizlj6/mkLrluKblj4LmlbAgKi9cclxuICAgIG9wZW5TY2VuZShzY2VuZTogc3RyaW5nLCBwYXJhbT86IGFueSkge1xyXG4gICAgICAgIHRoaXMuX29wZW5TY2VuZVBhcmFtID0gcGFyYW07XHJcbiAgICAgICAgdGhpcy50YWIuc2VsZWN0ZWRJbmRleCA9IFRhYmJhci5TQ0VORVMuaW5kZXhPZihzY2VuZSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoq55uR6KeGdGFiYmFy5pS55Y+YICovXHJcbiAgICBjcmVhdGVWaWV3KHZpZXc6YW55KXtcclxuICAgICAgICBzdXBlci5jcmVhdGVWaWV3KHZpZXcpXHJcbiAgICAgICAgdGhpcy50YWIub24oTGF5YS5FdmVudC5DSEFOR0UsdGhpcyx0aGlzLm9uQ2xpY2tUYWIpO1xyXG4gICAgICAgIC8vIHRoaXMub25DbGlja1RhYigpO1xyXG4gICAgfVxyXG4gICAgXHJcblxyXG4gICAgLyoq54K55Ye7dGFiYmFy5LqL5Lu2ICovXHJcbiAgICBvbkNsaWNrVGFiKCkge1xyXG4gICAgICAgIGxldCBzY2VuZTpzdHJpbmcgPSBUYWJiYXIuU0NFTkVTW3RoaXMudGFiLnNlbGVjdGVkSW5kZXhdXHJcbiAgICAgICAgTGF5YS5TY2VuZS5vcGVuKHNjZW5lLCB0cnVlLCB0aGlzLl9vcGVuU2NlbmVQYXJhbSk7XHJcbiAgICAgICAgdGhpcy5fb3BlblNjZW5lUGFyYW0gPSBudWxsO1xyXG5cclxuICAgICAgICB0aGlzLnRhYi5pdGVtcy5mb3JFYWNoKGl0ZW09PntcclxuICAgICAgICAgICAgY29uc3QgdGFiQnRuOiBMYXlhLkJ1dHRvbiA9IGl0ZW0gYXMgTGF5YS5CdXR0b247XHJcbiAgICAgICAgICAgIGNvbnN0IGltZ0J0bjogTGF5YS5CdXR0b24gPSB0YWJCdG4uZ2V0Q2hpbGRBdCgwKSBhcyBMYXlhLkJ1dHRvbjtcclxuICAgICAgICAgICAgaW1nQnRuLnNlbGVjdGVkID0gZmFsc2U7XHJcbiAgICAgICAgfSlcclxuICAgICAgICB0YWJiYXJBcnIuZm9yRWFjaChpdGVtPT57XHJcbiAgICAgICAgICAgIGlmIChpdGVtID09PSBzY2VuZSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGFiQnRuOiBMYXlhLkJ1dHRvbiA9IHRoaXMudGFiLnNlbGVjdGlvbiBhcyBMYXlhLkJ1dHRvbjtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGltZ0J0bjogTGF5YS5CdXR0b24gPSB0YWJCdG4uZ2V0Q2hpbGRBdCgwKSBhcyBMYXlhLkJ1dHRvbjtcclxuICAgICAgICAgICAgICAgIGltZ0J0bi5zZWxlY3RlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICAvL+WFs+mXreWwj+e6oueCuVxyXG4gICAgICAgIGlmIChzY2VuZSA9PT0gJ3JlY29yZC5zY2VuZScpIHtcclxuICAgICAgICAgICAgR2FtZU1vZGVsLmdldEluc3RhbmNlKCkubm90aWNlRnVuYyhmYWxzZSlcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICB9XHJcbn0iLCJpbXBvcnQgeyBMYXllck1hbmFnZXIsIExheWVyVHlwZSB9IGZyb20gXCIuL0xheWVyTWFuYWdlclwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFRvYXN0IGV4dGVuZHMgTGF5YS5VSUNvbXBvbmVudCB7XHJcblxyXG4gICAgc3RhdGljIE1JTl9XSURUSDogbnVtYmVyID0gMjAwO1xyXG4gICAgc3RhdGljIE1BWF9XSURUSDogbnVtYmVyID0gNTAwO1xyXG4gICAgc3RhdGljIFRPUDogbnVtYmVyID0gMjM7XHJcbiAgICBzdGF0aWMgQk9UVE9NOiBudW1iZXIgPSAyMDtcclxuICAgIHN0YXRpYyBNQVJHSU46IG51bWJlciA9IDE1O1xyXG4gICAgc3RhdGljIE1JTl9IRUlHSFQ6IG51bWJlciA9IDgwO1xyXG4gICAgc3RhdGljIEZPTlRfU0laRTogbnVtYmVyID0gMjY7XHJcbiAgICBzdGF0aWMgQ09MT1I6IHN0cmluZyA9IFwiI2ZmZmZmZlwiO1xyXG4gICAgc3RhdGljIEJHX0lNR19VUkw6IHN0cmluZyA9IFwiY29tcC9pbWdfdG9hc3RfYmcucG5nXCI7XHJcbiAgICBzdGF0aWMgRFVSQVRJT046IG51bWJlciA9IDI1MDA7XHJcblxyXG4gICAgcHJpdmF0ZSBzdGF0aWMgaW5zdGFuY2U6IFRvYXN0O1xyXG4gICAgcHJpdmF0ZSBzdGF0aWMgc3RvcmVUZXh0TGlzdDogYW55W10gPSBbXTtcclxuXHJcbiAgICBzdGF0aWMgc2hvdyh0ZXh0OiBzdHJpbmcsIGR1cmF0aW9uOiBudW1iZXIgPSBUb2FzdC5EVVJBVElPTiwgY292ZXJCZWZvcmU6IGJvb2xlYW4gPSB0cnVlKSB7XHJcbiAgICAgICAgaWYgKCFUb2FzdC5pbnN0YW5jZSkge1xyXG4gICAgICAgICAgICBUb2FzdC5pbnN0YW5jZSA9IG5ldyBUb2FzdCgpO1xyXG4gICAgICAgICAgICBUb2FzdC5pbnN0YW5jZS5vbihMYXlhLkV2ZW50LkNMT1NFLCBUb2FzdCwgVG9hc3Qub25DbG9zZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChjb3ZlckJlZm9yZSAmJiBUb2FzdC5pbnN0YW5jZS5wYXJlbnQpIHtcclxuICAgICAgICAgICAgVG9hc3QuaW5zdGFuY2Uuc2V0VGV4dCh0ZXh0KTtcclxuICAgICAgICAgICAgVG9hc3QuaW5zdGFuY2UudGltZXIub25jZShkdXJhdGlvbiB8fCBUb2FzdC5EVVJBVElPTiwgVG9hc3QuaW5zdGFuY2UsIFRvYXN0Lmluc3RhbmNlLmNsb3NlLCBudWxsLCB0cnVlKTtcclxuICAgICAgICB9IGVsc2UgaWYgKCFUb2FzdC5pbnN0YW5jZS5wYXJlbnQpIHtcclxuICAgICAgICAgICAgVG9hc3QuZG9TaG93KHRleHQsIGR1cmF0aW9uKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBUb2FzdC5zdG9yZVRleHRMaXN0LnB1c2goe1xyXG4gICAgICAgICAgICAgICAgdGV4dDogdGV4dCxcclxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiBkdXJhdGlvblxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJvdGVjdGVkIHN0YXRpYyBkb1Nob3codGV4dDogc3RyaW5nLCBkdXJhdGlvbjogbnVtYmVyKSB7XHJcbiAgICAgICAgVG9hc3QuaW5zdGFuY2Uuc2V0VGV4dCh0ZXh0KTtcclxuICAgICAgICBMYXllck1hbmFnZXIuYWRkVG9MYXllcihUb2FzdC5pbnN0YW5jZSwgTGF5ZXJUeXBlLkxBWUVSX01TRyk7XHJcbiAgICAgICAgVG9hc3QuaW5zdGFuY2UudGltZXIub25jZShkdXJhdGlvbiB8fCBUb2FzdC5EVVJBVElPTiwgVG9hc3QuaW5zdGFuY2UsIFRvYXN0Lmluc3RhbmNlLmNsb3NlLCBudWxsLCB0cnVlKTtcclxuICAgIH1cclxuXHJcbiAgICBwcm90ZWN0ZWQgc3RhdGljIG9uQ2xvc2UoKSB7XHJcbiAgICAgICAgaWYgKFRvYXN0LnN0b3JlVGV4dExpc3QubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICB2YXIgZGF0YTogYW55ID0gVG9hc3Quc3RvcmVUZXh0TGlzdC5zaGlmdCgpO1xyXG4gICAgICAgICAgICBUb2FzdC5kb1Nob3coZGF0YS50ZXh0LCBkYXRhLmR1cmF0aW9uKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYmc6IExheWEuSW1hZ2U7XHJcbiAgICBsYWJlbDogTGF5YS5MYWJlbDtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgfVxyXG5cclxuICAgIHNldFRleHQodGV4dDogc3RyaW5nKSB7XHJcbiAgICAgICAgdGhpcy53aWR0aCA9IFRvYXN0Lk1BWF9XSURUSDtcclxuICAgICAgICB0aGlzLmxhYmVsLndpZHRoID0gTmFOO1xyXG4gICAgICAgIHRoaXMubGFiZWwuZGF0YVNvdXJjZSA9IHRleHQ7XHJcbiAgICAgICAgdGhpcy5vblRleHRDaGFuZ2UoKTtcclxuICAgIH1cclxuXHJcbiAgICBjbG9zZSgpIHtcclxuICAgICAgICB0aGlzLnJlbW92ZVNlbGYoKTtcclxuICAgICAgICB0aGlzLmV2ZW50KExheWEuRXZlbnQuQ0xPU0UpO1xyXG4gICAgfVxyXG5cclxuICAgIGNyZWF0ZUNoaWxkcmVuKCkge1xyXG4gICAgICAgIHRoaXMuY2VudGVyWCA9IDA7XHJcbiAgICAgICAgdGhpcy5oZWlnaHQgPSBUb2FzdC5NQVJHSU4gKyBUb2FzdC5NQVJHSU47XHJcblxyXG4gICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgdGhpcy5iZyA9IG5ldyBMYXlhLkltYWdlKCk7XHJcbiAgICAgICAgdGhpcy5iZy5za2luID0gVG9hc3QuQkdfSU1HX1VSTDtcclxuICAgICAgICB0aGlzLmJnLnNpemVHcmlkID0gXCIyNSwyNSwyNSwyNVwiO1xyXG4gICAgICAgIHRoaXMuYmcubGVmdCA9IHRoaXMuYmcucmlnaHQgPSB0aGlzLmJnLnRvcCA9IHRoaXMuYmcuYm90dG9tID0gMDtcclxuICAgICAgICB0aGlzLmFkZENoaWxkKHRoaXMuYmcpO1xyXG5cclxuICAgICAgICB0aGlzLmxhYmVsID0gbmV3IExheWEuTGFiZWwoKTtcclxuICAgICAgICB0aGlzLmxhYmVsLmNvbG9yID0gVG9hc3QuQ09MT1I7XHJcbiAgICAgICAgdGhpcy5sYWJlbC5mb250U2l6ZSA9IFRvYXN0LkZPTlRfU0laRTtcclxuICAgICAgICB0aGlzLmxhYmVsLmFsaWduID0gXCJjZW50ZXJcIjtcclxuICAgICAgICB0aGlzLmxhYmVsLnkgPSBUb2FzdC5UT1A7XHJcbiAgICAgICAgdGhpcy5sYWJlbC5jZW50ZXJYID0gMDtcclxuICAgICAgICAvLyB0aGlzLmxhYmVsLmNlbnRlclkgPSAwO1xyXG4gICAgICAgIC8vIHRoaXMubGFiZWwuc3Ryb2tlID0gMTtcclxuICAgICAgICAvLyB0aGlzLmxhYmVsLnN0cm9rZUNvbG9yID0gXCIjMDAwMDAwXCI7XHJcbiAgICAgICAgLy8gdGhpcy5sYWJlbC50b3AgPSBUb2FzdC5NQVJHSU47XHJcbiAgICAgICAgLy8gdGhpcy5sYWJlbC5ib3R0b20gPSBUb2FzdC5NQVJHSU47XHJcbiAgICAgICAgLy8gdGhpcy5sYWJlbC5sZWZ0ID0gVG9hc3QuTUFSR0lOO1xyXG4gICAgICAgIC8vIHRoaXMubGFiZWwucmlnaHQgPSBUb2FzdC5NQVJHSU47XHJcbiAgICAgICAgdGhpcy5sYWJlbC5sZWFkaW5nID0gMTU7XHJcbiAgICAgICAgdGhpcy5sYWJlbC53b3JkV3JhcCA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5hZGRDaGlsZCh0aGlzLmxhYmVsKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gcHJvdGVjdGVkIGluaXRpYWxpemUoKSB7XHJcbiAgICAvLyAgICAgc3VwZXIuaW5pdGlhbGl6ZSgpO1xyXG4gICAgLy8gICAgIHRoaXMuYmluZFZpZXdFdmVudCh0aGlzLmxhYmVsLCBMYXlhLkV2ZW50LkNIQU5HRSwgdGhpcy5vblRleHRDaGFuZ2UpO1xyXG4gICAgLy8gfVxyXG5cclxuICAgIHByb3RlY3RlZCBvblRleHRDaGFuZ2UoKSB7XHJcbiAgICAgICAgbGV0IHRleHRXOiBudW1iZXIgPSB0aGlzLmxhYmVsLndpZHRoO1xyXG4gICAgICAgIGNvbnN0IG1heFRleHRXOiBudW1iZXIgPSBUb2FzdC5NQVhfV0lEVEggLSBUb2FzdC5NQVJHSU4gKiAyO1xyXG4gICAgICAgIC8vIGNvbnN0IG1pblRleHRXOiBudW1iZXIgPSBUb2FzdC5NSU5fV0lEVEggLSBUb2FzdC5NQVJHSU4gKiAyO1xyXG4gICAgICAgIGlmICh0ZXh0VyA+IG1heFRleHRXKSB7XHJcbiAgICAgICAgICAgIHRoaXMubGFiZWwud2lkdGggPSBtYXhUZXh0VztcclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IHc6IG51bWJlciA9IHRoaXMubGFiZWwud2lkdGggKyBUb2FzdC5NQVJHSU4gKiAyO1xyXG4gICAgICAgIHcgPSBNYXRoLm1pbih3LCBUb2FzdC5NQVhfV0lEVEgpO1xyXG4gICAgICAgIHcgPSBNYXRoLm1heCh3LCBUb2FzdC5NSU5fV0lEVEgpO1xyXG4gICAgICAgIHRoaXMud2lkdGggPSB3O1xyXG4gICAgICAgIC8vIHRoaXMuaGVpZ2h0ID0gdGhpcy5sYWJlbC5oZWlnaHQgKyBUb2FzdC5UT1AgKyBUb2FzdC5CT1RUT007XHJcbiAgICAgICAgdGhpcy5oZWlnaHQgPSB0aGlzLmxhYmVsLmhlaWdodCArIFRvYXN0Lk1BUkdJTiAqIDI7XHJcbiAgICAgICAgdGhpcy54ID0gKExheWEuc3RhZ2Uud2lkdGggLSB0aGlzLndpZHRoKSA+PiAxO1xyXG4gICAgICAgIHRoaXMueSA9IChMYXlhLnN0YWdlLmhlaWdodCAtIHRoaXMuaGVpZ2h0KSA+PiAxO1xyXG4gICAgfVxyXG5cclxuICAgIHByb3RlY3RlZCBvbkNvbXBSZXNpemUoKSB7XHJcbiAgICAgICAgLy8gaWYgKHRoaXMubGFiZWwpIHtcclxuICAgICAgICAvLyAgICAgdGhpcy5oZWlnaHQgPSB0aGlzLmxhYmVsLmhlaWdodCArIE1lc3NhZ2VUaXAuTUFSR0lOICsgTWVzc2FnZVRpcC5NQVJHSU47XHJcbiAgICAgICAgLy8gfVxyXG4gICAgICAgIGlmICh0aGlzLmJnKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYmcud2lkdGggPSB0aGlzLndpZHRoO1xyXG4gICAgICAgICAgICB0aGlzLmJnLmhlaWdodCA9IHRoaXMuaGVpZ2h0O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XHJcblxyXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcclxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXHJcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcclxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cclxuXHJcbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xyXG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xyXG5cclxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xyXG59XHJcbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcclxufVxyXG4oZnVuY3Rpb24gKCkge1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XHJcbiAgICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xyXG4gICAgfVxyXG4gICAgdHJ5IHtcclxuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcclxuICAgICAgICB9XHJcbiAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcclxuICAgIH1cclxufSAoKSlcclxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcclxuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XHJcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXHJcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcclxuICAgIH1cclxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXHJcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcclxuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcclxuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xyXG4gICAgfVxyXG4gICAgdHJ5IHtcclxuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXHJcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcclxuICAgIH0gY2F0Y2goZSl7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XHJcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcclxuICAgICAgICB9IGNhdGNoKGUpe1xyXG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxyXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbn1cclxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xyXG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XHJcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXHJcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xyXG4gICAgfVxyXG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxyXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XHJcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xyXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcclxuICAgIH1cclxuICAgIHRyeSB7XHJcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xyXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcclxuICAgIH0gY2F0Y2ggKGUpe1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XHJcbiAgICAgICAgfSBjYXRjaCAoZSl7XHJcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxyXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XHJcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG5cclxufVxyXG52YXIgcXVldWUgPSBbXTtcclxudmFyIGRyYWluaW5nID0gZmFsc2U7XHJcbnZhciBjdXJyZW50UXVldWU7XHJcbnZhciBxdWV1ZUluZGV4ID0gLTE7XHJcblxyXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XHJcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xyXG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcclxuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XHJcbiAgICB9XHJcbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XHJcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xyXG4gICAgaWYgKGRyYWluaW5nKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XHJcbiAgICBkcmFpbmluZyA9IHRydWU7XHJcblxyXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcclxuICAgIHdoaWxlKGxlbikge1xyXG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xyXG4gICAgICAgIHF1ZXVlID0gW107XHJcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xyXG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XHJcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xyXG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcclxuICAgIH1cclxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XHJcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xyXG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xyXG59XHJcblxyXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xyXG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xyXG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcclxuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XHJcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcclxuICAgIH1cclxufTtcclxuXHJcbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcclxuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XHJcbiAgICB0aGlzLmZ1biA9IGZ1bjtcclxuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcclxufVxyXG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcclxufTtcclxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcclxucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcclxucHJvY2Vzcy5lbnYgPSB7fTtcclxucHJvY2Vzcy5hcmd2ID0gW107XHJcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xyXG5wcm9jZXNzLnZlcnNpb25zID0ge307XHJcblxyXG5mdW5jdGlvbiBub29wKCkge31cclxuXHJcbnByb2Nlc3Mub24gPSBub29wO1xyXG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcclxucHJvY2Vzcy5vbmNlID0gbm9vcDtcclxucHJvY2Vzcy5vZmYgPSBub29wO1xyXG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcclxucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xyXG5wcm9jZXNzLmVtaXQgPSBub29wO1xyXG5wcm9jZXNzLnByZXBlbmRMaXN0ZW5lciA9IG5vb3A7XHJcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XHJcblxyXG5wcm9jZXNzLmxpc3RlbmVycyA9IGZ1bmN0aW9uIChuYW1lKSB7IHJldHVybiBbXSB9XHJcblxyXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xyXG59O1xyXG5cclxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcclxucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XHJcbn07XHJcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XHJcbiJdfQ==
