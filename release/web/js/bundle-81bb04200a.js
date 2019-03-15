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

},{"../core/createError":9,"./../core/settle":12,"./../helpers/btoa":16,"./../helpers/buildURL":17,"./../helpers/cookies":19,"./../helpers/isURLSameOrigin":21,"./../helpers/parseHeaders":23,"./../utils":25,"_process":64}],3:[function(require,module,exports){
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

},{"./adapters/http":2,"./adapters/xhr":2,"./helpers/normalizeHeaderName":22,"./utils":25,"_process":64}],15:[function(require,module,exports){
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
GameConfig.startScene = "home.scene";
GameConfig.sceneRoot = "";
GameConfig.debug = false;
GameConfig.stat = false;
GameConfig.physicsDebug = false;
GameConfig.exportSceneToJson = true;
exports.default = GameConfig;
GameConfig.init();
},{"./publicScript/PageNavScript":35,"./publicScript/PageScript":36,"./publicScript/Screen":37,"./script/Assistant":38,"./script/Card":39,"./script/Guessing":40,"./script/Home":41,"./script/Record":42,"./script/grandPrix":43,"./script/priHistoryScene":44,"./script/shortListed":45,"./script/winning":46,"./template/joinRecords":47,"./template/numberListDomScript":48,"./template/previousRecords":49,"./template/priHistory":50,"./template/prixList":51,"./template/pswInput":52,"./template/rankingList":53,"./template/rechargeDialog":54,"./template/shortListedList":55,"./template/tipDialog":56,"./template/trendList":57,"./template/winningList":58,"./view/rocketDialog":63}],28:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GameConfig_1 = require("./GameConfig");
const rocketDialog_1 = require("./view/rocketDialog");
const loadingResList_1 = require("./loadingResList");
const socket_1 = require("./js/socket");
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
        //预加载
        Laya.loader.load(loadingResList_1.loadingResList, Laya.Handler.create(this, this.onGameResLoaded), Laya.Handler.create(this, (progress) => {
            console.log(progress);
        }));
    }
    onGameResLoaded() {
        //加载IDE指定的场景
        GameConfig_1.default.startScene && Laya.Scene.open(GameConfig_1.default.startScene, true, null, Laya.Handler.create(this, (() => {
            Laya.loader.load(loadingResList_1.loadingResList1);
        })));
    }
}
//激活启动类
new Main();
},{"./GameConfig":27,"./js/socket":32,"./loadingResList":34,"./view/rocketDialog":63}],29:[function(require,module,exports){
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
        this.event('getRocketRanking', this.rocketRanking);
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
    { url: "template/rechargeDialog.json", type: "json" },
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
},{}],35:[function(require,module,exports){
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
},{"../view/Tabbar":61}],36:[function(require,module,exports){
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
},{"../view/Tabbar":61}],37:[function(require,module,exports){
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
},{}],38:[function(require,module,exports){
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
},{"../js/api":30,"../ui/layaMaxUI":59,"../view/Toast":62}],39:[function(require,module,exports){
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
},{"../js/utils":33,"../ui/layaMaxUI":59,"../view/Tabbar":61}],40:[function(require,module,exports){
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
            window.location.href = `https://${document.domain}/#/sign_one`;
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
},{"../js/GameModel":29,"../js/api":30,"../js/socket":32,"../js/utils":33,"../template/pswInput":52,"../ui/layaMaxUI":59,"../view/Toast":62}],41:[function(require,module,exports){
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
const rechargeDialog_1 = require("../template/rechargeDialog");
class Home extends layaMaxUI_1.ui.homeUI {
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
            this.getGoodsList();
        });
    }
    /**充值 */
    btnRechargeFunc() {
        // Toast.show('点击充值')
        this.rechargeDialog = new rechargeDialog_1.default();
        this.rechargeDialog.y = Laya.stage.height - this.rechargeDialog.height;
        this.rechargeDialog.popupEffect = Laya.Handler.create(this, this.rechargeDialogPopupFun);
        this.rechargeDialog.closeEffect = Laya.Handler.create(this, this.rechargeDialogCloseFun);
        this.rechargeDialog.popup();
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
        window.location.href = 'https://m.xyhj.io/buyHelp.html';
    }
    goCenter() {
        window.location.href = `https://${document.domain}/#/main_Page`;
    }
    /**弹出充值的效果 */
    rechargeDialogPopupFun(dialog) {
        dialog.scale(1, 1);
        dialog._effectTween = Laya.Tween.from(dialog, { x: 0, y: Laya.stage.height + dialog.height }, 300, Laya.Ease.linearNone, Laya.Handler.create(Laya.Dialog.manager, Laya.Dialog.manager.doOpen, [dialog]), 0, false, false);
    }
    /**关闭充值的效果 */
    rechargeDialogCloseFun(dialog) {
        dialog._effectTween = Laya.Tween.to(dialog, { x: 0, y: Laya.stage.height + dialog.height }, 300, Laya.Ease.linearNone, Laya.Handler.create(Laya.Dialog.manager, Laya.Dialog.manager.doClose, [dialog]), 0, false, false);
    }
}
exports.default = Home;
},{"../js/GameModel":29,"../js/api":30,"../js/utils":33,"../template/rechargeDialog":54,"../ui/layaMaxUI":59,"../view/Toast":62}],42:[function(require,module,exports){
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
        this.page = 1;
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
},{"../js/api":30,"../ui/layaMaxUI":59}],43:[function(require,module,exports){
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
        window.location.href = 'https://m.xyhj.io/rankPrizeHelp.html';
    }
    onResize() {
        this.listBox.height = Laya.stage.height - 700;
    }
}
exports.default = grandPrix;
},{"../js/GameModel":29,"../js/api":30,"../js/utils":33,"../ui/layaMaxUI":59,"../view/Tabbar":61}],44:[function(require,module,exports){
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
},{"../js/api":30,"../js/utils":33,"../ui/layaMaxUI":59}],45:[function(require,module,exports){
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
},{"../js/api":30,"../ui/layaMaxUI":59}],46:[function(require,module,exports){
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
},{"../js/api":30,"../ui/layaMaxUI":59,"../view/Tabbar":61}],47:[function(require,module,exports){
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
},{"../js/utils":33,"../ui/layaMaxUI":59}],48:[function(require,module,exports){
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
},{"../js/GameModel":29,"../ui/layaMaxUI":59,"../view/Toast":62}],49:[function(require,module,exports){
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
},{"../js/utils":33,"../ui/layaMaxUI":59}],50:[function(require,module,exports){
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
},{"../js/utils":33,"../ui/layaMaxUI":59}],51:[function(require,module,exports){
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
},{"../js/utils":33,"../ui/layaMaxUI":59}],52:[function(require,module,exports){
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
},{"../js/api":30,"../ui/layaMaxUI":59,"../view/Toast":62,"./tipDialog":56}],53:[function(require,module,exports){
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
            this.ranking.text = item.ranking;
            this.nickName.text = item.nickName;
            this.uid.text = item.uid;
            this.amount.text = item.amount;
        }
    }
}
exports.default = prixList;
},{"../ui/layaMaxUI":59}],54:[function(require,module,exports){
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
},{"../ui/layaMaxUI":59}],55:[function(require,module,exports){
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
},{"../ui/layaMaxUI":59}],56:[function(require,module,exports){
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
},{"../ui/layaMaxUI":59,"../view/Tabbar":61}],57:[function(require,module,exports){
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
},{"../ui/layaMaxUI":59,"../view/Tabbar":61}],58:[function(require,module,exports){
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
},{"../js/utils":33,"../ui/layaMaxUI":59}],59:[function(require,module,exports){
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
},{}],60:[function(require,module,exports){
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
},{}],61:[function(require,module,exports){
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
            console.log('未登录跳转登录');
            window.location.href = `https://${document.domain}/#/sign_one`;
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
},{"../js/GameModel":29,"../ui/layaMaxUI":59}],62:[function(require,module,exports){
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
},{"./LayerManager":60}],63:[function(require,module,exports){
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
        this.ranking.array = [
            { ranking: '01', nickName: '张三', uid: '123323', amount: '323.32' },
            { ranking: '02', nickName: '张三', uid: '123323', amount: '323.32' },
            { ranking: '03', nickName: '张三', uid: '123323', amount: '323.32' },
            { ranking: '04', nickName: '张三', uid: '123323', amount: '323.32' },
            { ranking: '05', nickName: '张三', uid: '123323', amount: '323.32' },
            { ranking: '06', nickName: '张三', uid: '123323', amount: '323.32' },
            { ranking: '07', nickName: '张三', uid: '123323', amount: '323.32' },
            { ranking: '08', nickName: '张三', uid: '123323', amount: '323.32' },
            { ranking: '09', nickName: '张三', uid: '123323', amount: '323.32' },
            { ranking: '10', nickName: '张三', uid: '123323', amount: '323.32' },
            { ranking: '11', nickName: '张三', uid: '123323', amount: '323.32' },
            { ranking: '12', nickName: '张三', uid: '123323', amount: '323.32' },
            { ranking: '13', nickName: '张三', uid: '123323', amount: '323.32' },
            { ranking: '14', nickName: '张三', uid: '123323', amount: '323.32' },
            { ranking: '15', nickName: '张三', uid: '123323', amount: '323.32' }
        ];
    }
    static init() {
        GameModel_1.GameModel.getInstance().on('getRocketRanking', this, (res) => {
            console.log('数据变动2');
            this.dlg.popup(false, false);
        });
    }
    closeDialog() {
        this.close();
    }
}
exports.default = RocketDialog;
},{"../js/GameModel":29,"../ui/layaMaxUI":59}],64:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL0Rvd25sb2Fkcy9MYXlhQWlySURFL3Jlc291cmNlcy9hcHAvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvYWRhcHRlcnMveGhyLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9heGlvcy5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvY2FuY2VsL0NhbmNlbC5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvY2FuY2VsL0NhbmNlbFRva2VuLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9jYW5jZWwvaXNDYW5jZWwuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2NvcmUvQXhpb3MuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2NvcmUvSW50ZXJjZXB0b3JNYW5hZ2VyLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9jb3JlL2NyZWF0ZUVycm9yLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9jb3JlL2Rpc3BhdGNoUmVxdWVzdC5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvY29yZS9lbmhhbmNlRXJyb3IuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2NvcmUvc2V0dGxlLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9jb3JlL3RyYW5zZm9ybURhdGEuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2RlZmF1bHRzLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9oZWxwZXJzL2JpbmQuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2hlbHBlcnMvYnRvYS5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvaGVscGVycy9idWlsZFVSTC5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvaGVscGVycy9jb21iaW5lVVJMcy5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvaGVscGVycy9jb29raWVzLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9oZWxwZXJzL2lzQWJzb2x1dGVVUkwuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2hlbHBlcnMvaXNVUkxTYW1lT3JpZ2luLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9oZWxwZXJzL25vcm1hbGl6ZUhlYWRlck5hbWUuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2hlbHBlcnMvcGFyc2VIZWFkZXJzLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9oZWxwZXJzL3NwcmVhZC5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvdXRpbHMuanMiLCJub2RlX21vZHVsZXMvYXhpb3Mvbm9kZV9tb2R1bGVzL2lzLWJ1ZmZlci9pbmRleC5qcyIsInNyYy9HYW1lQ29uZmlnLnRzIiwic3JjL01haW4udHMiLCJzcmMvanMvR2FtZU1vZGVsLnRzIiwic3JjL2pzL2FwaS50cyIsInNyYy9qcy9odHRwLnRzIiwic3JjL2pzL3NvY2tldC50cyIsInNyYy9qcy91dGlscy50cyIsInNyYy9sb2FkaW5nUmVzTGlzdC50cyIsInNyYy9wdWJsaWNTY3JpcHQvUGFnZU5hdlNjcmlwdC50cyIsInNyYy9wdWJsaWNTY3JpcHQvUGFnZVNjcmlwdC50cyIsInNyYy9wdWJsaWNTY3JpcHQvU2NyZWVuLnRzIiwic3JjL3NjcmlwdC9Bc3Npc3RhbnQudHMiLCJzcmMvc2NyaXB0L0NhcmQudHMiLCJzcmMvc2NyaXB0L0d1ZXNzaW5nLnRzIiwic3JjL3NjcmlwdC9Ib21lLnRzIiwic3JjL3NjcmlwdC9SZWNvcmQudHMiLCJzcmMvc2NyaXB0L2dyYW5kUHJpeC50cyIsInNyYy9zY3JpcHQvcHJpSGlzdG9yeVNjZW5lLnRzIiwic3JjL3NjcmlwdC9zaG9ydExpc3RlZC50cyIsInNyYy9zY3JpcHQvd2lubmluZy50cyIsInNyYy90ZW1wbGF0ZS9qb2luUmVjb3Jkcy50cyIsInNyYy90ZW1wbGF0ZS9udW1iZXJMaXN0RG9tU2NyaXB0LnRzIiwic3JjL3RlbXBsYXRlL3ByZXZpb3VzUmVjb3Jkcy50cyIsInNyYy90ZW1wbGF0ZS9wcmlIaXN0b3J5LnRzIiwic3JjL3RlbXBsYXRlL3ByaXhMaXN0LnRzIiwic3JjL3RlbXBsYXRlL3Bzd0lucHV0LnRzIiwic3JjL3RlbXBsYXRlL3JhbmtpbmdMaXN0LnRzIiwic3JjL3RlbXBsYXRlL3JlY2hhcmdlRGlhbG9nLnRzIiwic3JjL3RlbXBsYXRlL3Nob3J0TGlzdGVkTGlzdC50cyIsInNyYy90ZW1wbGF0ZS90aXBEaWFsb2cudHMiLCJzcmMvdGVtcGxhdGUvdHJlbmRMaXN0LnRzIiwic3JjL3RlbXBsYXRlL3dpbm5pbmdMaXN0LnRzIiwic3JjL3VpL2xheWFNYXhVSS50cyIsInNyYy92aWV3L0xheWVyTWFuYWdlci50cyIsInNyYy92aWV3L1RhYmJhci50cyIsInNyYy92aWV3L1RvYXN0LnRzIiwic3JjL3ZpZXcvcm9ja2V0RGlhbG9nLnRzIiwiLi4vLi4vRG93bmxvYWRzL0xheWFBaXJJREUvcmVzb3VyY2VzL2FwcC9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNWQTs7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNwTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QUNGLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsRUFBRSxVQUFVLENBQUM7WUFDaEQsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FDL0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDakMsQ0FBQztRQUNOLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUNEOzs7S0FHQztJQUNELGNBQWMsQ0FBQyxTQUFTO1FBQ3BCLElBQUksSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7UUFDdEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDL0IsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzNCLElBQUksQ0FBQyxHQUFtQixJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzVDLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNCLElBQUksQ0FBQyxHQUFtQixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDdkMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0IsSUFBSSxDQUFDLEdBQW1CLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN4QyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzQixJQUFJLE1BQU0sR0FBbUIsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQy9DLElBQUksTUFBTSxHQUFtQixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDL0MsTUFBTSxHQUFHLE1BQU0sR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFDL0MsTUFBTSxHQUFHLE1BQU0sR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFDL0MsT0FBTyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLE1BQU0sR0FBRyxHQUFHLEdBQUcsTUFBTSxDQUFDO0lBQ3pFLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsU0FBUyxDQUFDLElBQVMsRUFBRSxNQUFXO1FBQzVCLElBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6QixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3hCLElBQUksSUFBSSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQyxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMvRCxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsTUFBTSxFQUFFO2dCQUN2QixLQUFLLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7YUFDbkM7WUFDRCxLQUFLLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxLQUFLLENBQUM7WUFDM0IsT0FBTyxLQUFLLENBQUM7U0FDaEI7YUFBTTtZQUNILE9BQU8sSUFBSSxDQUFDO1NBQ2Y7SUFDTCxDQUFDO0lBRUQsVUFBVTtJQUNWLE1BQU0sQ0FBQyxJQUFJLEVBQUMsSUFBSTtRQUNaLElBQUksRUFBRSxFQUFDLEVBQUUsRUFBQyxDQUFDLENBQUM7UUFDWixJQUFHO1lBQUMsRUFBRSxHQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBO1NBQUM7UUFBQSxPQUFNLENBQUMsRUFBQztZQUFDLEVBQUUsR0FBQyxDQUFDLENBQUE7U0FBQztRQUMxRCxJQUFHO1lBQUMsRUFBRSxHQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBO1NBQUM7UUFBQSxPQUFNLENBQUMsRUFBQztZQUFDLEVBQUUsR0FBQyxDQUFDLENBQUE7U0FBQztRQUMxRCxDQUFDLEdBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM5QixPQUFPLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0lBQzVCLENBQUM7SUFDRCxVQUFVO0lBQ1YsTUFBTSxDQUFDLElBQUksRUFBQyxJQUFJO1FBQ1osSUFBSSxFQUFFLEVBQUMsRUFBRSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7UUFDZCxJQUFHO1lBQUMsRUFBRSxHQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBO1NBQUM7UUFBQSxPQUFNLENBQUMsRUFBQztZQUFDLEVBQUUsR0FBQyxDQUFDLENBQUE7U0FBQztRQUMxRCxJQUFHO1lBQUMsRUFBRSxHQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBO1NBQUM7UUFBQSxPQUFNLENBQUMsRUFBQztZQUFDLEVBQUUsR0FBQyxDQUFDLENBQUE7U0FBQztRQUMxRCxDQUFDLEdBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMvQixDQUFDLEdBQUMsQ0FBQyxFQUFFLElBQUUsRUFBRSxDQUFDLENBQUEsQ0FBQyxDQUFBLEVBQUUsQ0FBQSxDQUFDLENBQUEsRUFBRSxDQUFDO1FBQ2pCLE9BQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBQ0QsVUFBVTtJQUNWLE1BQU0sQ0FBQyxJQUFJLEVBQUMsSUFBSTtRQUNaLElBQUksRUFBRSxHQUFDLENBQUMsRUFBQyxFQUFFLEdBQUMsQ0FBQyxFQUFDLEVBQUUsRUFBQyxFQUFFLENBQUM7UUFDcEIsSUFBRztZQUFDLEVBQUUsR0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtTQUFDO1FBQUEsT0FBTSxDQUFDLEVBQUMsR0FBRTtRQUFBLENBQUM7UUFDdkQsSUFBRztZQUFDLEVBQUUsR0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtTQUFDO1FBQUEsT0FBTSxDQUFDLEVBQUMsR0FBRTtRQUFBLENBQUM7UUFDdkQsRUFBRSxHQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFDLEVBQUUsR0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxPQUFPLENBQUMsRUFBRSxHQUFDLEVBQUUsQ0FBQyxHQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFDLEVBQUUsR0FBQyxFQUFFLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBQ0QsVUFBVTtJQUNWLE1BQU0sQ0FBQyxJQUFJLEVBQUMsSUFBSTtRQUNaLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxFQUFFLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFDLEVBQUUsR0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDOUMsSUFBRztZQUFDLENBQUMsSUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtTQUFDO1FBQUEsT0FBTSxDQUFDLEVBQUMsR0FBRTtRQUN6QyxJQUFHO1lBQUMsQ0FBQyxJQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBO1NBQUM7UUFBQSxPQUFNLENBQUMsRUFBQyxHQUFFO1FBQ3pDLE9BQU8sTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUE7SUFDL0UsQ0FBQztDQUNKLENBQUE7OztBQzVLRDs7Ozs7O0dBTUc7O0FBR0gsT0FB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QTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbInZhciBfX2V4dGVuZHMgPSAodGhpcyAmJiB0aGlzLl9fZXh0ZW5kcykgfHwgKGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBleHRlbmRTdGF0aWNzID0gT2JqZWN0LnNldFByb3RvdHlwZU9mIHx8XHJcbiAgICAgICAgKHsgX19wcm90b19fOiBbXSB9IGluc3RhbmNlb2YgQXJyYXkgJiYgZnVuY3Rpb24gKGQsIGIpIHsgZC5fX3Byb3RvX18gPSBiOyB9KSB8fFxyXG4gICAgICAgIGZ1bmN0aW9uIChkLCBiKSB7IGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdOyB9O1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChkLCBiKSB7XHJcbiAgICAgICAgZXh0ZW5kU3RhdGljcyhkLCBiKTtcclxuICAgICAgICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cclxuICAgICAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XHJcbiAgICB9O1xyXG59KSgpO1xyXG4oZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2xpYi9heGlvcycpOyIsIid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcclxudmFyIHNldHRsZSA9IHJlcXVpcmUoJy4vLi4vY29yZS9zZXR0bGUnKTtcclxudmFyIGJ1aWxkVVJMID0gcmVxdWlyZSgnLi8uLi9oZWxwZXJzL2J1aWxkVVJMJyk7XHJcbnZhciBwYXJzZUhlYWRlcnMgPSByZXF1aXJlKCcuLy4uL2hlbHBlcnMvcGFyc2VIZWFkZXJzJyk7XHJcbnZhciBpc1VSTFNhbWVPcmlnaW4gPSByZXF1aXJlKCcuLy4uL2hlbHBlcnMvaXNVUkxTYW1lT3JpZ2luJyk7XHJcbnZhciBjcmVhdGVFcnJvciA9IHJlcXVpcmUoJy4uL2NvcmUvY3JlYXRlRXJyb3InKTtcclxudmFyIGJ0b2EgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LmJ0b2EgJiYgd2luZG93LmJ0b2EuYmluZCh3aW5kb3cpKSB8fCByZXF1aXJlKCcuLy4uL2hlbHBlcnMvYnRvYScpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB4aHJBZGFwdGVyKGNvbmZpZykge1xyXG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiBkaXNwYXRjaFhoclJlcXVlc3QocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICB2YXIgcmVxdWVzdERhdGEgPSBjb25maWcuZGF0YTtcclxuICAgIHZhciByZXF1ZXN0SGVhZGVycyA9IGNvbmZpZy5oZWFkZXJzO1xyXG5cclxuICAgIGlmICh1dGlscy5pc0Zvcm1EYXRhKHJlcXVlc3REYXRhKSkge1xyXG4gICAgICBkZWxldGUgcmVxdWVzdEhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddOyAvLyBMZXQgdGhlIGJyb3dzZXIgc2V0IGl0XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcclxuICAgIHZhciBsb2FkRXZlbnQgPSAnb25yZWFkeXN0YXRlY2hhbmdlJztcclxuICAgIHZhciB4RG9tYWluID0gZmFsc2U7XHJcblxyXG4gICAgLy8gRm9yIElFIDgvOSBDT1JTIHN1cHBvcnRcclxuICAgIC8vIE9ubHkgc3VwcG9ydHMgUE9TVCBhbmQgR0VUIGNhbGxzIGFuZCBkb2Vzbid0IHJldHVybnMgdGhlIHJlc3BvbnNlIGhlYWRlcnMuXHJcbiAgICAvLyBET04nVCBkbyB0aGlzIGZvciB0ZXN0aW5nIGIvYyBYTUxIdHRwUmVxdWVzdCBpcyBtb2NrZWQsIG5vdCBYRG9tYWluUmVxdWVzdC5cclxuICAgIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Rlc3QnICYmXHJcbiAgICAgICAgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiZcclxuICAgICAgICB3aW5kb3cuWERvbWFpblJlcXVlc3QgJiYgISgnd2l0aENyZWRlbnRpYWxzJyBpbiByZXF1ZXN0KSAmJlxyXG4gICAgICAgICFpc1VSTFNhbWVPcmlnaW4oY29uZmlnLnVybCkpIHtcclxuICAgICAgcmVxdWVzdCA9IG5ldyB3aW5kb3cuWERvbWFpblJlcXVlc3QoKTtcclxuICAgICAgbG9hZEV2ZW50ID0gJ29ubG9hZCc7XHJcbiAgICAgIHhEb21haW4gPSB0cnVlO1xyXG4gICAgICByZXF1ZXN0Lm9ucHJvZ3Jlc3MgPSBmdW5jdGlvbiBoYW5kbGVQcm9ncmVzcygpIHt9O1xyXG4gICAgICByZXF1ZXN0Lm9udGltZW91dCA9IGZ1bmN0aW9uIGhhbmRsZVRpbWVvdXQoKSB7fTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBIVFRQIGJhc2ljIGF1dGhlbnRpY2F0aW9uXHJcbiAgICBpZiAoY29uZmlnLmF1dGgpIHtcclxuICAgICAgdmFyIHVzZXJuYW1lID0gY29uZmlnLmF1dGgudXNlcm5hbWUgfHwgJyc7XHJcbiAgICAgIHZhciBwYXNzd29yZCA9IGNvbmZpZy5hdXRoLnBhc3N3b3JkIHx8ICcnO1xyXG4gICAgICByZXF1ZXN0SGVhZGVycy5BdXRob3JpemF0aW9uID0gJ0Jhc2ljICcgKyBidG9hKHVzZXJuYW1lICsgJzonICsgcGFzc3dvcmQpO1xyXG4gICAgfVxyXG5cclxuICAgIHJlcXVlc3Qub3Blbihjb25maWcubWV0aG9kLnRvVXBwZXJDYXNlKCksIGJ1aWxkVVJMKGNvbmZpZy51cmwsIGNvbmZpZy5wYXJhbXMsIGNvbmZpZy5wYXJhbXNTZXJpYWxpemVyKSwgdHJ1ZSk7XHJcblxyXG4gICAgLy8gU2V0IHRoZSByZXF1ZXN0IHRpbWVvdXQgaW4gTVNcclxuICAgIHJlcXVlc3QudGltZW91dCA9IGNvbmZpZy50aW1lb3V0O1xyXG5cclxuICAgIC8vIExpc3RlbiBmb3IgcmVhZHkgc3RhdGVcclxuICAgIHJlcXVlc3RbbG9hZEV2ZW50XSA9IGZ1bmN0aW9uIGhhbmRsZUxvYWQoKSB7XHJcbiAgICAgIGlmICghcmVxdWVzdCB8fCAocmVxdWVzdC5yZWFkeVN0YXRlICE9PSA0ICYmICF4RG9tYWluKSkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gVGhlIHJlcXVlc3QgZXJyb3JlZCBvdXQgYW5kIHdlIGRpZG4ndCBnZXQgYSByZXNwb25zZSwgdGhpcyB3aWxsIGJlXHJcbiAgICAgIC8vIGhhbmRsZWQgYnkgb25lcnJvciBpbnN0ZWFkXHJcbiAgICAgIC8vIFdpdGggb25lIGV4Y2VwdGlvbjogcmVxdWVzdCB0aGF0IHVzaW5nIGZpbGU6IHByb3RvY29sLCBtb3N0IGJyb3dzZXJzXHJcbiAgICAgIC8vIHdpbGwgcmV0dXJuIHN0YXR1cyBhcyAwIGV2ZW4gdGhvdWdoIGl0J3MgYSBzdWNjZXNzZnVsIHJlcXVlc3RcclxuICAgICAgaWYgKHJlcXVlc3Quc3RhdHVzID09PSAwICYmICEocmVxdWVzdC5yZXNwb25zZVVSTCAmJiByZXF1ZXN0LnJlc3BvbnNlVVJMLmluZGV4T2YoJ2ZpbGU6JykgPT09IDApKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBQcmVwYXJlIHRoZSByZXNwb25zZVxyXG4gICAgICB2YXIgcmVzcG9uc2VIZWFkZXJzID0gJ2dldEFsbFJlc3BvbnNlSGVhZGVycycgaW4gcmVxdWVzdCA/IHBhcnNlSGVhZGVycyhyZXF1ZXN0LmdldEFsbFJlc3BvbnNlSGVhZGVycygpKSA6IG51bGw7XHJcbiAgICAgIHZhciByZXNwb25zZURhdGEgPSAhY29uZmlnLnJlc3BvbnNlVHlwZSB8fCBjb25maWcucmVzcG9uc2VUeXBlID09PSAndGV4dCcgPyByZXF1ZXN0LnJlc3BvbnNlVGV4dCA6IHJlcXVlc3QucmVzcG9uc2U7XHJcbiAgICAgIHZhciByZXNwb25zZSA9IHtcclxuICAgICAgICBkYXRhOiByZXNwb25zZURhdGEsXHJcbiAgICAgICAgLy8gSUUgc2VuZHMgMTIyMyBpbnN0ZWFkIG9mIDIwNCAoaHR0cHM6Ly9naXRodWIuY29tL2F4aW9zL2F4aW9zL2lzc3Vlcy8yMDEpXHJcbiAgICAgICAgc3RhdHVzOiByZXF1ZXN0LnN0YXR1cyA9PT0gMTIyMyA/IDIwNCA6IHJlcXVlc3Quc3RhdHVzLFxyXG4gICAgICAgIHN0YXR1c1RleHQ6IHJlcXVlc3Quc3RhdHVzID09PSAxMjIzID8gJ05vIENvbnRlbnQnIDogcmVxdWVzdC5zdGF0dXNUZXh0LFxyXG4gICAgICAgIGhlYWRlcnM6IHJlc3BvbnNlSGVhZGVycyxcclxuICAgICAgICBjb25maWc6IGNvbmZpZyxcclxuICAgICAgICByZXF1ZXN0OiByZXF1ZXN0XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCByZXNwb25zZSk7XHJcblxyXG4gICAgICAvLyBDbGVhbiB1cCByZXF1ZXN0XHJcbiAgICAgIHJlcXVlc3QgPSBudWxsO1xyXG4gICAgfTtcclxuXHJcbiAgICAvLyBIYW5kbGUgbG93IGxldmVsIG5ldHdvcmsgZXJyb3JzXHJcbiAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbiBoYW5kbGVFcnJvcigpIHtcclxuICAgICAgLy8gUmVhbCBlcnJvcnMgYXJlIGhpZGRlbiBmcm9tIHVzIGJ5IHRoZSBicm93c2VyXHJcbiAgICAgIC8vIG9uZXJyb3Igc2hvdWxkIG9ubHkgZmlyZSBpZiBpdCdzIGEgbmV0d29yayBlcnJvclxyXG4gICAgICByZWplY3QoY3JlYXRlRXJyb3IoJ05ldHdvcmsgRXJyb3InLCBjb25maWcsIG51bGwsIHJlcXVlc3QpKTtcclxuXHJcbiAgICAgIC8vIENsZWFuIHVwIHJlcXVlc3RcclxuICAgICAgcmVxdWVzdCA9IG51bGw7XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEhhbmRsZSB0aW1lb3V0XHJcbiAgICByZXF1ZXN0Lm9udGltZW91dCA9IGZ1bmN0aW9uIGhhbmRsZVRpbWVvdXQoKSB7XHJcbiAgICAgIHJlamVjdChjcmVhdGVFcnJvcigndGltZW91dCBvZiAnICsgY29uZmlnLnRpbWVvdXQgKyAnbXMgZXhjZWVkZWQnLCBjb25maWcsICdFQ09OTkFCT1JURUQnLFxyXG4gICAgICAgIHJlcXVlc3QpKTtcclxuXHJcbiAgICAgIC8vIENsZWFuIHVwIHJlcXVlc3RcclxuICAgICAgcmVxdWVzdCA9IG51bGw7XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEFkZCB4c3JmIGhlYWRlclxyXG4gICAgLy8gVGhpcyBpcyBvbmx5IGRvbmUgaWYgcnVubmluZyBpbiBhIHN0YW5kYXJkIGJyb3dzZXIgZW52aXJvbm1lbnQuXHJcbiAgICAvLyBTcGVjaWZpY2FsbHkgbm90IGlmIHdlJ3JlIGluIGEgd2ViIHdvcmtlciwgb3IgcmVhY3QtbmF0aXZlLlxyXG4gICAgaWYgKHV0aWxzLmlzU3RhbmRhcmRCcm93c2VyRW52KCkpIHtcclxuICAgICAgdmFyIGNvb2tpZXMgPSByZXF1aXJlKCcuLy4uL2hlbHBlcnMvY29va2llcycpO1xyXG5cclxuICAgICAgLy8gQWRkIHhzcmYgaGVhZGVyXHJcbiAgICAgIHZhciB4c3JmVmFsdWUgPSAoY29uZmlnLndpdGhDcmVkZW50aWFscyB8fCBpc1VSTFNhbWVPcmlnaW4oY29uZmlnLnVybCkpICYmIGNvbmZpZy54c3JmQ29va2llTmFtZSA/XHJcbiAgICAgICAgICBjb29raWVzLnJlYWQoY29uZmlnLnhzcmZDb29raWVOYW1lKSA6XHJcbiAgICAgICAgICB1bmRlZmluZWQ7XHJcblxyXG4gICAgICBpZiAoeHNyZlZhbHVlKSB7XHJcbiAgICAgICAgcmVxdWVzdEhlYWRlcnNbY29uZmlnLnhzcmZIZWFkZXJOYW1lXSA9IHhzcmZWYWx1ZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIEFkZCBoZWFkZXJzIHRvIHRoZSByZXF1ZXN0XHJcbiAgICBpZiAoJ3NldFJlcXVlc3RIZWFkZXInIGluIHJlcXVlc3QpIHtcclxuICAgICAgdXRpbHMuZm9yRWFjaChyZXF1ZXN0SGVhZGVycywgZnVuY3Rpb24gc2V0UmVxdWVzdEhlYWRlcih2YWwsIGtleSkge1xyXG4gICAgICAgIGlmICh0eXBlb2YgcmVxdWVzdERhdGEgPT09ICd1bmRlZmluZWQnICYmIGtleS50b0xvd2VyQ2FzZSgpID09PSAnY29udGVudC10eXBlJykge1xyXG4gICAgICAgICAgLy8gUmVtb3ZlIENvbnRlbnQtVHlwZSBpZiBkYXRhIGlzIHVuZGVmaW5lZFxyXG4gICAgICAgICAgZGVsZXRlIHJlcXVlc3RIZWFkZXJzW2tleV07XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIC8vIE90aGVyd2lzZSBhZGQgaGVhZGVyIHRvIHRoZSByZXF1ZXN0XHJcbiAgICAgICAgICByZXF1ZXN0LnNldFJlcXVlc3RIZWFkZXIoa2V5LCB2YWwpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQWRkIHdpdGhDcmVkZW50aWFscyB0byByZXF1ZXN0IGlmIG5lZWRlZFxyXG4gICAgaWYgKGNvbmZpZy53aXRoQ3JlZGVudGlhbHMpIHtcclxuICAgICAgcmVxdWVzdC53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEFkZCByZXNwb25zZVR5cGUgdG8gcmVxdWVzdCBpZiBuZWVkZWRcclxuICAgIGlmIChjb25maWcucmVzcG9uc2VUeXBlKSB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgcmVxdWVzdC5yZXNwb25zZVR5cGUgPSBjb25maWcucmVzcG9uc2VUeXBlO1xyXG4gICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgLy8gRXhwZWN0ZWQgRE9NRXhjZXB0aW9uIHRocm93biBieSBicm93c2VycyBub3QgY29tcGF0aWJsZSBYTUxIdHRwUmVxdWVzdCBMZXZlbCAyLlxyXG4gICAgICAgIC8vIEJ1dCwgdGhpcyBjYW4gYmUgc3VwcHJlc3NlZCBmb3IgJ2pzb24nIHR5cGUgYXMgaXQgY2FuIGJlIHBhcnNlZCBieSBkZWZhdWx0ICd0cmFuc2Zvcm1SZXNwb25zZScgZnVuY3Rpb24uXHJcbiAgICAgICAgaWYgKGNvbmZpZy5yZXNwb25zZVR5cGUgIT09ICdqc29uJykge1xyXG4gICAgICAgICAgdGhyb3cgZTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBIYW5kbGUgcHJvZ3Jlc3MgaWYgbmVlZGVkXHJcbiAgICBpZiAodHlwZW9mIGNvbmZpZy5vbkRvd25sb2FkUHJvZ3Jlc3MgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgcmVxdWVzdC5hZGRFdmVudExpc3RlbmVyKCdwcm9ncmVzcycsIGNvbmZpZy5vbkRvd25sb2FkUHJvZ3Jlc3MpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIE5vdCBhbGwgYnJvd3NlcnMgc3VwcG9ydCB1cGxvYWQgZXZlbnRzXHJcbiAgICBpZiAodHlwZW9mIGNvbmZpZy5vblVwbG9hZFByb2dyZXNzID09PSAnZnVuY3Rpb24nICYmIHJlcXVlc3QudXBsb2FkKSB7XHJcbiAgICAgIHJlcXVlc3QudXBsb2FkLmFkZEV2ZW50TGlzdGVuZXIoJ3Byb2dyZXNzJywgY29uZmlnLm9uVXBsb2FkUHJvZ3Jlc3MpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChjb25maWcuY2FuY2VsVG9rZW4pIHtcclxuICAgICAgLy8gSGFuZGxlIGNhbmNlbGxhdGlvblxyXG4gICAgICBjb25maWcuY2FuY2VsVG9rZW4ucHJvbWlzZS50aGVuKGZ1bmN0aW9uIG9uQ2FuY2VsZWQoY2FuY2VsKSB7XHJcbiAgICAgICAgaWYgKCFyZXF1ZXN0KSB7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXF1ZXN0LmFib3J0KCk7XHJcbiAgICAgICAgcmVqZWN0KGNhbmNlbCk7XHJcbiAgICAgICAgLy8gQ2xlYW4gdXAgcmVxdWVzdFxyXG4gICAgICAgIHJlcXVlc3QgPSBudWxsO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAocmVxdWVzdERhdGEgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICByZXF1ZXN0RGF0YSA9IG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gU2VuZCB0aGUgcmVxdWVzdFxyXG4gICAgcmVxdWVzdC5zZW5kKHJlcXVlc3REYXRhKTtcclxuICB9KTtcclxufTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xyXG52YXIgYmluZCA9IHJlcXVpcmUoJy4vaGVscGVycy9iaW5kJyk7XHJcbnZhciBBeGlvcyA9IHJlcXVpcmUoJy4vY29yZS9BeGlvcycpO1xyXG52YXIgZGVmYXVsdHMgPSByZXF1aXJlKCcuL2RlZmF1bHRzJyk7XHJcblxyXG4vKipcclxuICogQ3JlYXRlIGFuIGluc3RhbmNlIG9mIEF4aW9zXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBkZWZhdWx0Q29uZmlnIFRoZSBkZWZhdWx0IGNvbmZpZyBmb3IgdGhlIGluc3RhbmNlXHJcbiAqIEByZXR1cm4ge0F4aW9zfSBBIG5ldyBpbnN0YW5jZSBvZiBBeGlvc1xyXG4gKi9cclxuZnVuY3Rpb24gY3JlYXRlSW5zdGFuY2UoZGVmYXVsdENvbmZpZykge1xyXG4gIHZhciBjb250ZXh0ID0gbmV3IEF4aW9zKGRlZmF1bHRDb25maWcpO1xyXG4gIHZhciBpbnN0YW5jZSA9IGJpbmQoQXhpb3MucHJvdG90eXBlLnJlcXVlc3QsIGNvbnRleHQpO1xyXG5cclxuICAvLyBDb3B5IGF4aW9zLnByb3RvdHlwZSB0byBpbnN0YW5jZVxyXG4gIHV0aWxzLmV4dGVuZChpbnN0YW5jZSwgQXhpb3MucHJvdG90eXBlLCBjb250ZXh0KTtcclxuXHJcbiAgLy8gQ29weSBjb250ZXh0IHRvIGluc3RhbmNlXHJcbiAgdXRpbHMuZXh0ZW5kKGluc3RhbmNlLCBjb250ZXh0KTtcclxuXHJcbiAgcmV0dXJuIGluc3RhbmNlO1xyXG59XHJcblxyXG4vLyBDcmVhdGUgdGhlIGRlZmF1bHQgaW5zdGFuY2UgdG8gYmUgZXhwb3J0ZWRcclxudmFyIGF4aW9zID0gY3JlYXRlSW5zdGFuY2UoZGVmYXVsdHMpO1xyXG5cclxuLy8gRXhwb3NlIEF4aW9zIGNsYXNzIHRvIGFsbG93IGNsYXNzIGluaGVyaXRhbmNlXHJcbmF4aW9zLkF4aW9zID0gQXhpb3M7XHJcblxyXG4vLyBGYWN0b3J5IGZvciBjcmVhdGluZyBuZXcgaW5zdGFuY2VzXHJcbmF4aW9zLmNyZWF0ZSA9IGZ1bmN0aW9uIGNyZWF0ZShpbnN0YW5jZUNvbmZpZykge1xyXG4gIHJldHVybiBjcmVhdGVJbnN0YW5jZSh1dGlscy5tZXJnZShkZWZhdWx0cywgaW5zdGFuY2VDb25maWcpKTtcclxufTtcclxuXHJcbi8vIEV4cG9zZSBDYW5jZWwgJiBDYW5jZWxUb2tlblxyXG5heGlvcy5DYW5jZWwgPSByZXF1aXJlKCcuL2NhbmNlbC9DYW5jZWwnKTtcclxuYXhpb3MuQ2FuY2VsVG9rZW4gPSByZXF1aXJlKCcuL2NhbmNlbC9DYW5jZWxUb2tlbicpO1xyXG5heGlvcy5pc0NhbmNlbCA9IHJlcXVpcmUoJy4vY2FuY2VsL2lzQ2FuY2VsJyk7XHJcblxyXG4vLyBFeHBvc2UgYWxsL3NwcmVhZFxyXG5heGlvcy5hbGwgPSBmdW5jdGlvbiBhbGwocHJvbWlzZXMpIHtcclxuICByZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xyXG59O1xyXG5heGlvcy5zcHJlYWQgPSByZXF1aXJlKCcuL2hlbHBlcnMvc3ByZWFkJyk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGF4aW9zO1xyXG5cclxuLy8gQWxsb3cgdXNlIG9mIGRlZmF1bHQgaW1wb3J0IHN5bnRheCBpbiBUeXBlU2NyaXB0XHJcbm1vZHVsZS5leHBvcnRzLmRlZmF1bHQgPSBheGlvcztcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuLyoqXHJcbiAqIEEgYENhbmNlbGAgaXMgYW4gb2JqZWN0IHRoYXQgaXMgdGhyb3duIHdoZW4gYW4gb3BlcmF0aW9uIGlzIGNhbmNlbGVkLlxyXG4gKlxyXG4gKiBAY2xhc3NcclxuICogQHBhcmFtIHtzdHJpbmc9fSBtZXNzYWdlIFRoZSBtZXNzYWdlLlxyXG4gKi9cclxuZnVuY3Rpb24gQ2FuY2VsKG1lc3NhZ2UpIHtcclxuICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xyXG59XHJcblxyXG5DYW5jZWwucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcoKSB7XHJcbiAgcmV0dXJuICdDYW5jZWwnICsgKHRoaXMubWVzc2FnZSA/ICc6ICcgKyB0aGlzLm1lc3NhZ2UgOiAnJyk7XHJcbn07XHJcblxyXG5DYW5jZWwucHJvdG90eXBlLl9fQ0FOQ0VMX18gPSB0cnVlO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDYW5jZWw7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciBDYW5jZWwgPSByZXF1aXJlKCcuL0NhbmNlbCcpO1xyXG5cclxuLyoqXHJcbiAqIEEgYENhbmNlbFRva2VuYCBpcyBhbiBvYmplY3QgdGhhdCBjYW4gYmUgdXNlZCB0byByZXF1ZXN0IGNhbmNlbGxhdGlvbiBvZiBhbiBvcGVyYXRpb24uXHJcbiAqXHJcbiAqIEBjbGFzc1xyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBleGVjdXRvciBUaGUgZXhlY3V0b3IgZnVuY3Rpb24uXHJcbiAqL1xyXG5mdW5jdGlvbiBDYW5jZWxUb2tlbihleGVjdXRvcikge1xyXG4gIGlmICh0eXBlb2YgZXhlY3V0b3IgIT09ICdmdW5jdGlvbicpIHtcclxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2V4ZWN1dG9yIG11c3QgYmUgYSBmdW5jdGlvbi4nKTtcclxuICB9XHJcblxyXG4gIHZhciByZXNvbHZlUHJvbWlzZTtcclxuICB0aGlzLnByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiBwcm9taXNlRXhlY3V0b3IocmVzb2x2ZSkge1xyXG4gICAgcmVzb2x2ZVByb21pc2UgPSByZXNvbHZlO1xyXG4gIH0pO1xyXG5cclxuICB2YXIgdG9rZW4gPSB0aGlzO1xyXG4gIGV4ZWN1dG9yKGZ1bmN0aW9uIGNhbmNlbChtZXNzYWdlKSB7XHJcbiAgICBpZiAodG9rZW4ucmVhc29uKSB7XHJcbiAgICAgIC8vIENhbmNlbGxhdGlvbiBoYXMgYWxyZWFkeSBiZWVuIHJlcXVlc3RlZFxyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdG9rZW4ucmVhc29uID0gbmV3IENhbmNlbChtZXNzYWdlKTtcclxuICAgIHJlc29sdmVQcm9taXNlKHRva2VuLnJlYXNvbik7XHJcbiAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBUaHJvd3MgYSBgQ2FuY2VsYCBpZiBjYW5jZWxsYXRpb24gaGFzIGJlZW4gcmVxdWVzdGVkLlxyXG4gKi9cclxuQ2FuY2VsVG9rZW4ucHJvdG90eXBlLnRocm93SWZSZXF1ZXN0ZWQgPSBmdW5jdGlvbiB0aHJvd0lmUmVxdWVzdGVkKCkge1xyXG4gIGlmICh0aGlzLnJlYXNvbikge1xyXG4gICAgdGhyb3cgdGhpcy5yZWFzb247XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJldHVybnMgYW4gb2JqZWN0IHRoYXQgY29udGFpbnMgYSBuZXcgYENhbmNlbFRva2VuYCBhbmQgYSBmdW5jdGlvbiB0aGF0LCB3aGVuIGNhbGxlZCxcclxuICogY2FuY2VscyB0aGUgYENhbmNlbFRva2VuYC5cclxuICovXHJcbkNhbmNlbFRva2VuLnNvdXJjZSA9IGZ1bmN0aW9uIHNvdXJjZSgpIHtcclxuICB2YXIgY2FuY2VsO1xyXG4gIHZhciB0b2tlbiA9IG5ldyBDYW5jZWxUb2tlbihmdW5jdGlvbiBleGVjdXRvcihjKSB7XHJcbiAgICBjYW5jZWwgPSBjO1xyXG4gIH0pO1xyXG4gIHJldHVybiB7XHJcbiAgICB0b2tlbjogdG9rZW4sXHJcbiAgICBjYW5jZWw6IGNhbmNlbFxyXG4gIH07XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENhbmNlbFRva2VuO1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQ2FuY2VsKHZhbHVlKSB7XHJcbiAgcmV0dXJuICEhKHZhbHVlICYmIHZhbHVlLl9fQ0FOQ0VMX18pO1xyXG59O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG52YXIgZGVmYXVsdHMgPSByZXF1aXJlKCcuLy4uL2RlZmF1bHRzJyk7XHJcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcclxudmFyIEludGVyY2VwdG9yTWFuYWdlciA9IHJlcXVpcmUoJy4vSW50ZXJjZXB0b3JNYW5hZ2VyJyk7XHJcbnZhciBkaXNwYXRjaFJlcXVlc3QgPSByZXF1aXJlKCcuL2Rpc3BhdGNoUmVxdWVzdCcpO1xyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSBhIG5ldyBpbnN0YW5jZSBvZiBBeGlvc1xyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gaW5zdGFuY2VDb25maWcgVGhlIGRlZmF1bHQgY29uZmlnIGZvciB0aGUgaW5zdGFuY2VcclxuICovXHJcbmZ1bmN0aW9uIEF4aW9zKGluc3RhbmNlQ29uZmlnKSB7XHJcbiAgdGhpcy5kZWZhdWx0cyA9IGluc3RhbmNlQ29uZmlnO1xyXG4gIHRoaXMuaW50ZXJjZXB0b3JzID0ge1xyXG4gICAgcmVxdWVzdDogbmV3IEludGVyY2VwdG9yTWFuYWdlcigpLFxyXG4gICAgcmVzcG9uc2U6IG5ldyBJbnRlcmNlcHRvck1hbmFnZXIoKVxyXG4gIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEaXNwYXRjaCBhIHJlcXVlc3RcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyBUaGUgY29uZmlnIHNwZWNpZmljIGZvciB0aGlzIHJlcXVlc3QgKG1lcmdlZCB3aXRoIHRoaXMuZGVmYXVsdHMpXHJcbiAqL1xyXG5BeGlvcy5wcm90b3R5cGUucmVxdWVzdCA9IGZ1bmN0aW9uIHJlcXVlc3QoY29uZmlnKSB7XHJcbiAgLyplc2xpbnQgbm8tcGFyYW0tcmVhc3NpZ246MCovXHJcbiAgLy8gQWxsb3cgZm9yIGF4aW9zKCdleGFtcGxlL3VybCdbLCBjb25maWddKSBhIGxhIGZldGNoIEFQSVxyXG4gIGlmICh0eXBlb2YgY29uZmlnID09PSAnc3RyaW5nJykge1xyXG4gICAgY29uZmlnID0gdXRpbHMubWVyZ2Uoe1xyXG4gICAgICB1cmw6IGFyZ3VtZW50c1swXVxyXG4gICAgfSwgYXJndW1lbnRzWzFdKTtcclxuICB9XHJcblxyXG4gIGNvbmZpZyA9IHV0aWxzLm1lcmdlKGRlZmF1bHRzLCB7bWV0aG9kOiAnZ2V0J30sIHRoaXMuZGVmYXVsdHMsIGNvbmZpZyk7XHJcbiAgY29uZmlnLm1ldGhvZCA9IGNvbmZpZy5tZXRob2QudG9Mb3dlckNhc2UoKTtcclxuXHJcbiAgLy8gSG9vayB1cCBpbnRlcmNlcHRvcnMgbWlkZGxld2FyZVxyXG4gIHZhciBjaGFpbiA9IFtkaXNwYXRjaFJlcXVlc3QsIHVuZGVmaW5lZF07XHJcbiAgdmFyIHByb21pc2UgPSBQcm9taXNlLnJlc29sdmUoY29uZmlnKTtcclxuXHJcbiAgdGhpcy5pbnRlcmNlcHRvcnMucmVxdWVzdC5mb3JFYWNoKGZ1bmN0aW9uIHVuc2hpZnRSZXF1ZXN0SW50ZXJjZXB0b3JzKGludGVyY2VwdG9yKSB7XHJcbiAgICBjaGFpbi51bnNoaWZ0KGludGVyY2VwdG9yLmZ1bGZpbGxlZCwgaW50ZXJjZXB0b3IucmVqZWN0ZWQpO1xyXG4gIH0pO1xyXG5cclxuICB0aGlzLmludGVyY2VwdG9ycy5yZXNwb25zZS5mb3JFYWNoKGZ1bmN0aW9uIHB1c2hSZXNwb25zZUludGVyY2VwdG9ycyhpbnRlcmNlcHRvcikge1xyXG4gICAgY2hhaW4ucHVzaChpbnRlcmNlcHRvci5mdWxmaWxsZWQsIGludGVyY2VwdG9yLnJlamVjdGVkKTtcclxuICB9KTtcclxuXHJcbiAgd2hpbGUgKGNoYWluLmxlbmd0aCkge1xyXG4gICAgcHJvbWlzZSA9IHByb21pc2UudGhlbihjaGFpbi5zaGlmdCgpLCBjaGFpbi5zaGlmdCgpKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBwcm9taXNlO1xyXG59O1xyXG5cclxuLy8gUHJvdmlkZSBhbGlhc2VzIGZvciBzdXBwb3J0ZWQgcmVxdWVzdCBtZXRob2RzXHJcbnV0aWxzLmZvckVhY2goWydkZWxldGUnLCAnZ2V0JywgJ2hlYWQnLCAnb3B0aW9ucyddLCBmdW5jdGlvbiBmb3JFYWNoTWV0aG9kTm9EYXRhKG1ldGhvZCkge1xyXG4gIC8qZXNsaW50IGZ1bmMtbmFtZXM6MCovXHJcbiAgQXhpb3MucHJvdG90eXBlW21ldGhvZF0gPSBmdW5jdGlvbih1cmwsIGNvbmZpZykge1xyXG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCh1dGlscy5tZXJnZShjb25maWcgfHwge30sIHtcclxuICAgICAgbWV0aG9kOiBtZXRob2QsXHJcbiAgICAgIHVybDogdXJsXHJcbiAgICB9KSk7XHJcbiAgfTtcclxufSk7XHJcblxyXG51dGlscy5mb3JFYWNoKFsncG9zdCcsICdwdXQnLCAncGF0Y2gnXSwgZnVuY3Rpb24gZm9yRWFjaE1ldGhvZFdpdGhEYXRhKG1ldGhvZCkge1xyXG4gIC8qZXNsaW50IGZ1bmMtbmFtZXM6MCovXHJcbiAgQXhpb3MucHJvdG90eXBlW21ldGhvZF0gPSBmdW5jdGlvbih1cmwsIGRhdGEsIGNvbmZpZykge1xyXG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCh1dGlscy5tZXJnZShjb25maWcgfHwge30sIHtcclxuICAgICAgbWV0aG9kOiBtZXRob2QsXHJcbiAgICAgIHVybDogdXJsLFxyXG4gICAgICBkYXRhOiBkYXRhXHJcbiAgICB9KSk7XHJcbiAgfTtcclxufSk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEF4aW9zO1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XHJcblxyXG5mdW5jdGlvbiBJbnRlcmNlcHRvck1hbmFnZXIoKSB7XHJcbiAgdGhpcy5oYW5kbGVycyA9IFtdO1xyXG59XHJcblxyXG4vKipcclxuICogQWRkIGEgbmV3IGludGVyY2VwdG9yIHRvIHRoZSBzdGFja1xyXG4gKlxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdWxmaWxsZWQgVGhlIGZ1bmN0aW9uIHRvIGhhbmRsZSBgdGhlbmAgZm9yIGEgYFByb21pc2VgXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHJlamVjdGVkIFRoZSBmdW5jdGlvbiB0byBoYW5kbGUgYHJlamVjdGAgZm9yIGEgYFByb21pc2VgXHJcbiAqXHJcbiAqIEByZXR1cm4ge051bWJlcn0gQW4gSUQgdXNlZCB0byByZW1vdmUgaW50ZXJjZXB0b3IgbGF0ZXJcclxuICovXHJcbkludGVyY2VwdG9yTWFuYWdlci5wcm90b3R5cGUudXNlID0gZnVuY3Rpb24gdXNlKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpIHtcclxuICB0aGlzLmhhbmRsZXJzLnB1c2goe1xyXG4gICAgZnVsZmlsbGVkOiBmdWxmaWxsZWQsXHJcbiAgICByZWplY3RlZDogcmVqZWN0ZWRcclxuICB9KTtcclxuICByZXR1cm4gdGhpcy5oYW5kbGVycy5sZW5ndGggLSAxO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlbW92ZSBhbiBpbnRlcmNlcHRvciBmcm9tIHRoZSBzdGFja1xyXG4gKlxyXG4gKiBAcGFyYW0ge051bWJlcn0gaWQgVGhlIElEIHRoYXQgd2FzIHJldHVybmVkIGJ5IGB1c2VgXHJcbiAqL1xyXG5JbnRlcmNlcHRvck1hbmFnZXIucHJvdG90eXBlLmVqZWN0ID0gZnVuY3Rpb24gZWplY3QoaWQpIHtcclxuICBpZiAodGhpcy5oYW5kbGVyc1tpZF0pIHtcclxuICAgIHRoaXMuaGFuZGxlcnNbaWRdID0gbnVsbDtcclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogSXRlcmF0ZSBvdmVyIGFsbCB0aGUgcmVnaXN0ZXJlZCBpbnRlcmNlcHRvcnNcclxuICpcclxuICogVGhpcyBtZXRob2QgaXMgcGFydGljdWxhcmx5IHVzZWZ1bCBmb3Igc2tpcHBpbmcgb3ZlciBhbnlcclxuICogaW50ZXJjZXB0b3JzIHRoYXQgbWF5IGhhdmUgYmVjb21lIGBudWxsYCBjYWxsaW5nIGBlamVjdGAuXHJcbiAqXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIFRoZSBmdW5jdGlvbiB0byBjYWxsIGZvciBlYWNoIGludGVyY2VwdG9yXHJcbiAqL1xyXG5JbnRlcmNlcHRvck1hbmFnZXIucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbiBmb3JFYWNoKGZuKSB7XHJcbiAgdXRpbHMuZm9yRWFjaCh0aGlzLmhhbmRsZXJzLCBmdW5jdGlvbiBmb3JFYWNoSGFuZGxlcihoKSB7XHJcbiAgICBpZiAoaCAhPT0gbnVsbCkge1xyXG4gICAgICBmbihoKTtcclxuICAgIH1cclxuICB9KTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSW50ZXJjZXB0b3JNYW5hZ2VyO1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG52YXIgZW5oYW5jZUVycm9yID0gcmVxdWlyZSgnLi9lbmhhbmNlRXJyb3InKTtcclxuXHJcbi8qKlxyXG4gKiBDcmVhdGUgYW4gRXJyb3Igd2l0aCB0aGUgc3BlY2lmaWVkIG1lc3NhZ2UsIGNvbmZpZywgZXJyb3IgY29kZSwgcmVxdWVzdCBhbmQgcmVzcG9uc2UuXHJcbiAqXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIFRoZSBlcnJvciBtZXNzYWdlLlxyXG4gKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIFRoZSBjb25maWcuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBbY29kZV0gVGhlIGVycm9yIGNvZGUgKGZvciBleGFtcGxlLCAnRUNPTk5BQk9SVEVEJykuXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBbcmVxdWVzdF0gVGhlIHJlcXVlc3QuXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBbcmVzcG9uc2VdIFRoZSByZXNwb25zZS5cclxuICogQHJldHVybnMge0Vycm9yfSBUaGUgY3JlYXRlZCBlcnJvci5cclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gY3JlYXRlRXJyb3IobWVzc2FnZSwgY29uZmlnLCBjb2RlLCByZXF1ZXN0LCByZXNwb25zZSkge1xyXG4gIHZhciBlcnJvciA9IG5ldyBFcnJvcihtZXNzYWdlKTtcclxuICByZXR1cm4gZW5oYW5jZUVycm9yKGVycm9yLCBjb25maWcsIGNvZGUsIHJlcXVlc3QsIHJlc3BvbnNlKTtcclxufTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xyXG52YXIgdHJhbnNmb3JtRGF0YSA9IHJlcXVpcmUoJy4vdHJhbnNmb3JtRGF0YScpO1xyXG52YXIgaXNDYW5jZWwgPSByZXF1aXJlKCcuLi9jYW5jZWwvaXNDYW5jZWwnKTtcclxudmFyIGRlZmF1bHRzID0gcmVxdWlyZSgnLi4vZGVmYXVsdHMnKTtcclxudmFyIGlzQWJzb2x1dGVVUkwgPSByZXF1aXJlKCcuLy4uL2hlbHBlcnMvaXNBYnNvbHV0ZVVSTCcpO1xyXG52YXIgY29tYmluZVVSTHMgPSByZXF1aXJlKCcuLy4uL2hlbHBlcnMvY29tYmluZVVSTHMnKTtcclxuXHJcbi8qKlxyXG4gKiBUaHJvd3MgYSBgQ2FuY2VsYCBpZiBjYW5jZWxsYXRpb24gaGFzIGJlZW4gcmVxdWVzdGVkLlxyXG4gKi9cclxuZnVuY3Rpb24gdGhyb3dJZkNhbmNlbGxhdGlvblJlcXVlc3RlZChjb25maWcpIHtcclxuICBpZiAoY29uZmlnLmNhbmNlbFRva2VuKSB7XHJcbiAgICBjb25maWcuY2FuY2VsVG9rZW4udGhyb3dJZlJlcXVlc3RlZCgpO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIERpc3BhdGNoIGEgcmVxdWVzdCB0byB0aGUgc2VydmVyIHVzaW5nIHRoZSBjb25maWd1cmVkIGFkYXB0ZXIuXHJcbiAqXHJcbiAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgVGhlIGNvbmZpZyB0aGF0IGlzIHRvIGJlIHVzZWQgZm9yIHRoZSByZXF1ZXN0XHJcbiAqIEByZXR1cm5zIHtQcm9taXNlfSBUaGUgUHJvbWlzZSB0byBiZSBmdWxmaWxsZWRcclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZGlzcGF0Y2hSZXF1ZXN0KGNvbmZpZykge1xyXG4gIHRocm93SWZDYW5jZWxsYXRpb25SZXF1ZXN0ZWQoY29uZmlnKTtcclxuXHJcbiAgLy8gU3VwcG9ydCBiYXNlVVJMIGNvbmZpZ1xyXG4gIGlmIChjb25maWcuYmFzZVVSTCAmJiAhaXNBYnNvbHV0ZVVSTChjb25maWcudXJsKSkge1xyXG4gICAgY29uZmlnLnVybCA9IGNvbWJpbmVVUkxzKGNvbmZpZy5iYXNlVVJMLCBjb25maWcudXJsKTtcclxuICB9XHJcblxyXG4gIC8vIEVuc3VyZSBoZWFkZXJzIGV4aXN0XHJcbiAgY29uZmlnLmhlYWRlcnMgPSBjb25maWcuaGVhZGVycyB8fCB7fTtcclxuXHJcbiAgLy8gVHJhbnNmb3JtIHJlcXVlc3QgZGF0YVxyXG4gIGNvbmZpZy5kYXRhID0gdHJhbnNmb3JtRGF0YShcclxuICAgIGNvbmZpZy5kYXRhLFxyXG4gICAgY29uZmlnLmhlYWRlcnMsXHJcbiAgICBjb25maWcudHJhbnNmb3JtUmVxdWVzdFxyXG4gICk7XHJcblxyXG4gIC8vIEZsYXR0ZW4gaGVhZGVyc1xyXG4gIGNvbmZpZy5oZWFkZXJzID0gdXRpbHMubWVyZ2UoXHJcbiAgICBjb25maWcuaGVhZGVycy5jb21tb24gfHwge30sXHJcbiAgICBjb25maWcuaGVhZGVyc1tjb25maWcubWV0aG9kXSB8fCB7fSxcclxuICAgIGNvbmZpZy5oZWFkZXJzIHx8IHt9XHJcbiAgKTtcclxuXHJcbiAgdXRpbHMuZm9yRWFjaChcclxuICAgIFsnZGVsZXRlJywgJ2dldCcsICdoZWFkJywgJ3Bvc3QnLCAncHV0JywgJ3BhdGNoJywgJ2NvbW1vbiddLFxyXG4gICAgZnVuY3Rpb24gY2xlYW5IZWFkZXJDb25maWcobWV0aG9kKSB7XHJcbiAgICAgIGRlbGV0ZSBjb25maWcuaGVhZGVyc1ttZXRob2RdO1xyXG4gICAgfVxyXG4gICk7XHJcblxyXG4gIHZhciBhZGFwdGVyID0gY29uZmlnLmFkYXB0ZXIgfHwgZGVmYXVsdHMuYWRhcHRlcjtcclxuXHJcbiAgcmV0dXJuIGFkYXB0ZXIoY29uZmlnKS50aGVuKGZ1bmN0aW9uIG9uQWRhcHRlclJlc29sdXRpb24ocmVzcG9uc2UpIHtcclxuICAgIHRocm93SWZDYW5jZWxsYXRpb25SZXF1ZXN0ZWQoY29uZmlnKTtcclxuXHJcbiAgICAvLyBUcmFuc2Zvcm0gcmVzcG9uc2UgZGF0YVxyXG4gICAgcmVzcG9uc2UuZGF0YSA9IHRyYW5zZm9ybURhdGEoXHJcbiAgICAgIHJlc3BvbnNlLmRhdGEsXHJcbiAgICAgIHJlc3BvbnNlLmhlYWRlcnMsXHJcbiAgICAgIGNvbmZpZy50cmFuc2Zvcm1SZXNwb25zZVxyXG4gICAgKTtcclxuXHJcbiAgICByZXR1cm4gcmVzcG9uc2U7XHJcbiAgfSwgZnVuY3Rpb24gb25BZGFwdGVyUmVqZWN0aW9uKHJlYXNvbikge1xyXG4gICAgaWYgKCFpc0NhbmNlbChyZWFzb24pKSB7XHJcbiAgICAgIHRocm93SWZDYW5jZWxsYXRpb25SZXF1ZXN0ZWQoY29uZmlnKTtcclxuXHJcbiAgICAgIC8vIFRyYW5zZm9ybSByZXNwb25zZSBkYXRhXHJcbiAgICAgIGlmIChyZWFzb24gJiYgcmVhc29uLnJlc3BvbnNlKSB7XHJcbiAgICAgICAgcmVhc29uLnJlc3BvbnNlLmRhdGEgPSB0cmFuc2Zvcm1EYXRhKFxyXG4gICAgICAgICAgcmVhc29uLnJlc3BvbnNlLmRhdGEsXHJcbiAgICAgICAgICByZWFzb24ucmVzcG9uc2UuaGVhZGVycyxcclxuICAgICAgICAgIGNvbmZpZy50cmFuc2Zvcm1SZXNwb25zZVxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QocmVhc29uKTtcclxuICB9KTtcclxufTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuLyoqXHJcbiAqIFVwZGF0ZSBhbiBFcnJvciB3aXRoIHRoZSBzcGVjaWZpZWQgY29uZmlnLCBlcnJvciBjb2RlLCBhbmQgcmVzcG9uc2UuXHJcbiAqXHJcbiAqIEBwYXJhbSB7RXJyb3J9IGVycm9yIFRoZSBlcnJvciB0byB1cGRhdGUuXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcgVGhlIGNvbmZpZy5cclxuICogQHBhcmFtIHtzdHJpbmd9IFtjb2RlXSBUaGUgZXJyb3IgY29kZSAoZm9yIGV4YW1wbGUsICdFQ09OTkFCT1JURUQnKS5cclxuICogQHBhcmFtIHtPYmplY3R9IFtyZXF1ZXN0XSBUaGUgcmVxdWVzdC5cclxuICogQHBhcmFtIHtPYmplY3R9IFtyZXNwb25zZV0gVGhlIHJlc3BvbnNlLlxyXG4gKiBAcmV0dXJucyB7RXJyb3J9IFRoZSBlcnJvci5cclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZW5oYW5jZUVycm9yKGVycm9yLCBjb25maWcsIGNvZGUsIHJlcXVlc3QsIHJlc3BvbnNlKSB7XHJcbiAgZXJyb3IuY29uZmlnID0gY29uZmlnO1xyXG4gIGlmIChjb2RlKSB7XHJcbiAgICBlcnJvci5jb2RlID0gY29kZTtcclxuICB9XHJcbiAgZXJyb3IucmVxdWVzdCA9IHJlcXVlc3Q7XHJcbiAgZXJyb3IucmVzcG9uc2UgPSByZXNwb25zZTtcclxuICByZXR1cm4gZXJyb3I7XHJcbn07XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciBjcmVhdGVFcnJvciA9IHJlcXVpcmUoJy4vY3JlYXRlRXJyb3InKTtcclxuXHJcbi8qKlxyXG4gKiBSZXNvbHZlIG9yIHJlamVjdCBhIFByb21pc2UgYmFzZWQgb24gcmVzcG9uc2Ugc3RhdHVzLlxyXG4gKlxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSByZXNvbHZlIEEgZnVuY3Rpb24gdGhhdCByZXNvbHZlcyB0aGUgcHJvbWlzZS5cclxuICogQHBhcmFtIHtGdW5jdGlvbn0gcmVqZWN0IEEgZnVuY3Rpb24gdGhhdCByZWplY3RzIHRoZSBwcm9taXNlLlxyXG4gKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgVGhlIHJlc3BvbnNlLlxyXG4gKi9cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCByZXNwb25zZSkge1xyXG4gIHZhciB2YWxpZGF0ZVN0YXR1cyA9IHJlc3BvbnNlLmNvbmZpZy52YWxpZGF0ZVN0YXR1cztcclxuICAvLyBOb3RlOiBzdGF0dXMgaXMgbm90IGV4cG9zZWQgYnkgWERvbWFpblJlcXVlc3RcclxuICBpZiAoIXJlc3BvbnNlLnN0YXR1cyB8fCAhdmFsaWRhdGVTdGF0dXMgfHwgdmFsaWRhdGVTdGF0dXMocmVzcG9uc2Uuc3RhdHVzKSkge1xyXG4gICAgcmVzb2x2ZShyZXNwb25zZSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIHJlamVjdChjcmVhdGVFcnJvcihcclxuICAgICAgJ1JlcXVlc3QgZmFpbGVkIHdpdGggc3RhdHVzIGNvZGUgJyArIHJlc3BvbnNlLnN0YXR1cyxcclxuICAgICAgcmVzcG9uc2UuY29uZmlnLFxyXG4gICAgICBudWxsLFxyXG4gICAgICByZXNwb25zZS5yZXF1ZXN0LFxyXG4gICAgICByZXNwb25zZVxyXG4gICAgKSk7XHJcbiAgfVxyXG59O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XHJcblxyXG4vKipcclxuICogVHJhbnNmb3JtIHRoZSBkYXRhIGZvciBhIHJlcXVlc3Qgb3IgYSByZXNwb25zZVxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdHxTdHJpbmd9IGRhdGEgVGhlIGRhdGEgdG8gYmUgdHJhbnNmb3JtZWRcclxuICogQHBhcmFtIHtBcnJheX0gaGVhZGVycyBUaGUgaGVhZGVycyBmb3IgdGhlIHJlcXVlc3Qgb3IgcmVzcG9uc2VcclxuICogQHBhcmFtIHtBcnJheXxGdW5jdGlvbn0gZm5zIEEgc2luZ2xlIGZ1bmN0aW9uIG9yIEFycmF5IG9mIGZ1bmN0aW9uc1xyXG4gKiBAcmV0dXJucyB7Kn0gVGhlIHJlc3VsdGluZyB0cmFuc2Zvcm1lZCBkYXRhXHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHRyYW5zZm9ybURhdGEoZGF0YSwgaGVhZGVycywgZm5zKSB7XHJcbiAgLyplc2xpbnQgbm8tcGFyYW0tcmVhc3NpZ246MCovXHJcbiAgdXRpbHMuZm9yRWFjaChmbnMsIGZ1bmN0aW9uIHRyYW5zZm9ybShmbikge1xyXG4gICAgZGF0YSA9IGZuKGRhdGEsIGhlYWRlcnMpO1xyXG4gIH0pO1xyXG5cclxuICByZXR1cm4gZGF0YTtcclxufTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xyXG52YXIgbm9ybWFsaXplSGVhZGVyTmFtZSA9IHJlcXVpcmUoJy4vaGVscGVycy9ub3JtYWxpemVIZWFkZXJOYW1lJyk7XHJcblxyXG52YXIgREVGQVVMVF9DT05URU5UX1RZUEUgPSB7XHJcbiAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnXHJcbn07XHJcblxyXG5mdW5jdGlvbiBzZXRDb250ZW50VHlwZUlmVW5zZXQoaGVhZGVycywgdmFsdWUpIHtcclxuICBpZiAoIXV0aWxzLmlzVW5kZWZpbmVkKGhlYWRlcnMpICYmIHV0aWxzLmlzVW5kZWZpbmVkKGhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddKSkge1xyXG4gICAgaGVhZGVyc1snQ29udGVudC1UeXBlJ10gPSB2YWx1ZTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldERlZmF1bHRBZGFwdGVyKCkge1xyXG4gIHZhciBhZGFwdGVyO1xyXG4gIGlmICh0eXBlb2YgWE1MSHR0cFJlcXVlc3QgIT09ICd1bmRlZmluZWQnKSB7XHJcbiAgICAvLyBGb3IgYnJvd3NlcnMgdXNlIFhIUiBhZGFwdGVyXHJcbiAgICBhZGFwdGVyID0gcmVxdWlyZSgnLi9hZGFwdGVycy94aHInKTtcclxuICB9IGVsc2UgaWYgKHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJykge1xyXG4gICAgLy8gRm9yIG5vZGUgdXNlIEhUVFAgYWRhcHRlclxyXG4gICAgYWRhcHRlciA9IHJlcXVpcmUoJy4vYWRhcHRlcnMvaHR0cCcpO1xyXG4gIH1cclxuICByZXR1cm4gYWRhcHRlcjtcclxufVxyXG5cclxudmFyIGRlZmF1bHRzID0ge1xyXG4gIGFkYXB0ZXI6IGdldERlZmF1bHRBZGFwdGVyKCksXHJcblxyXG4gIHRyYW5zZm9ybVJlcXVlc3Q6IFtmdW5jdGlvbiB0cmFuc2Zvcm1SZXF1ZXN0KGRhdGEsIGhlYWRlcnMpIHtcclxuICAgIG5vcm1hbGl6ZUhlYWRlck5hbWUoaGVhZGVycywgJ0NvbnRlbnQtVHlwZScpO1xyXG4gICAgaWYgKHV0aWxzLmlzRm9ybURhdGEoZGF0YSkgfHxcclxuICAgICAgdXRpbHMuaXNBcnJheUJ1ZmZlcihkYXRhKSB8fFxyXG4gICAgICB1dGlscy5pc0J1ZmZlcihkYXRhKSB8fFxyXG4gICAgICB1dGlscy5pc1N0cmVhbShkYXRhKSB8fFxyXG4gICAgICB1dGlscy5pc0ZpbGUoZGF0YSkgfHxcclxuICAgICAgdXRpbHMuaXNCbG9iKGRhdGEpXHJcbiAgICApIHtcclxuICAgICAgcmV0dXJuIGRhdGE7XHJcbiAgICB9XHJcbiAgICBpZiAodXRpbHMuaXNBcnJheUJ1ZmZlclZpZXcoZGF0YSkpIHtcclxuICAgICAgcmV0dXJuIGRhdGEuYnVmZmVyO1xyXG4gICAgfVxyXG4gICAgaWYgKHV0aWxzLmlzVVJMU2VhcmNoUGFyYW1zKGRhdGEpKSB7XHJcbiAgICAgIHNldENvbnRlbnRUeXBlSWZVbnNldChoZWFkZXJzLCAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkO2NoYXJzZXQ9dXRmLTgnKTtcclxuICAgICAgcmV0dXJuIGRhdGEudG9TdHJpbmcoKTtcclxuICAgIH1cclxuICAgIGlmICh1dGlscy5pc09iamVjdChkYXRhKSkge1xyXG4gICAgICBzZXRDb250ZW50VHlwZUlmVW5zZXQoaGVhZGVycywgJ2FwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtOCcpO1xyXG4gICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZGF0YTtcclxuICB9XSxcclxuXHJcbiAgdHJhbnNmb3JtUmVzcG9uc2U6IFtmdW5jdGlvbiB0cmFuc2Zvcm1SZXNwb25zZShkYXRhKSB7XHJcbiAgICAvKmVzbGludCBuby1wYXJhbS1yZWFzc2lnbjowKi9cclxuICAgIGlmICh0eXBlb2YgZGF0YSA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgdHJ5IHtcclxuICAgICAgICBkYXRhID0gSlNPTi5wYXJzZShkYXRhKTtcclxuICAgICAgfSBjYXRjaCAoZSkgeyAvKiBJZ25vcmUgKi8gfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGRhdGE7XHJcbiAgfV0sXHJcblxyXG4gIC8qKlxyXG4gICAqIEEgdGltZW91dCBpbiBtaWxsaXNlY29uZHMgdG8gYWJvcnQgYSByZXF1ZXN0LiBJZiBzZXQgdG8gMCAoZGVmYXVsdCkgYVxyXG4gICAqIHRpbWVvdXQgaXMgbm90IGNyZWF0ZWQuXHJcbiAgICovXHJcbiAgdGltZW91dDogMCxcclxuXHJcbiAgeHNyZkNvb2tpZU5hbWU6ICdYU1JGLVRPS0VOJyxcclxuICB4c3JmSGVhZGVyTmFtZTogJ1gtWFNSRi1UT0tFTicsXHJcblxyXG4gIG1heENvbnRlbnRMZW5ndGg6IC0xLFxyXG5cclxuICB2YWxpZGF0ZVN0YXR1czogZnVuY3Rpb24gdmFsaWRhdGVTdGF0dXMoc3RhdHVzKSB7XHJcbiAgICByZXR1cm4gc3RhdHVzID49IDIwMCAmJiBzdGF0dXMgPCAzMDA7XHJcbiAgfVxyXG59O1xyXG5cclxuZGVmYXVsdHMuaGVhZGVycyA9IHtcclxuICBjb21tb246IHtcclxuICAgICdBY2NlcHQnOiAnYXBwbGljYXRpb24vanNvbiwgdGV4dC9wbGFpbiwgKi8qJ1xyXG4gIH1cclxufTtcclxuXHJcbnV0aWxzLmZvckVhY2goWydkZWxldGUnLCAnZ2V0JywgJ2hlYWQnXSwgZnVuY3Rpb24gZm9yRWFjaE1ldGhvZE5vRGF0YShtZXRob2QpIHtcclxuICBkZWZhdWx0cy5oZWFkZXJzW21ldGhvZF0gPSB7fTtcclxufSk7XHJcblxyXG51dGlscy5mb3JFYWNoKFsncG9zdCcsICdwdXQnLCAncGF0Y2gnXSwgZnVuY3Rpb24gZm9yRWFjaE1ldGhvZFdpdGhEYXRhKG1ldGhvZCkge1xyXG4gIGRlZmF1bHRzLmhlYWRlcnNbbWV0aG9kXSA9IHV0aWxzLm1lcmdlKERFRkFVTFRfQ09OVEVOVF9UWVBFKTtcclxufSk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGRlZmF1bHRzO1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGJpbmQoZm4sIHRoaXNBcmcpIHtcclxuICByZXR1cm4gZnVuY3Rpb24gd3JhcCgpIHtcclxuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGgpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGFyZ3NbaV0gPSBhcmd1bWVudHNbaV07XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZm4uYXBwbHkodGhpc0FyZywgYXJncyk7XHJcbiAgfTtcclxufTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuLy8gYnRvYSBwb2x5ZmlsbCBmb3IgSUU8MTAgY291cnRlc3kgaHR0cHM6Ly9naXRodWIuY29tL2RhdmlkY2hhbWJlcnMvQmFzZTY0LmpzXHJcblxyXG52YXIgY2hhcnMgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLz0nO1xyXG5cclxuZnVuY3Rpb24gRSgpIHtcclxuICB0aGlzLm1lc3NhZ2UgPSAnU3RyaW5nIGNvbnRhaW5zIGFuIGludmFsaWQgY2hhcmFjdGVyJztcclxufVxyXG5FLnByb3RvdHlwZSA9IG5ldyBFcnJvcjtcclxuRS5wcm90b3R5cGUuY29kZSA9IDU7XHJcbkUucHJvdG90eXBlLm5hbWUgPSAnSW52YWxpZENoYXJhY3RlckVycm9yJztcclxuXHJcbmZ1bmN0aW9uIGJ0b2EoaW5wdXQpIHtcclxuICB2YXIgc3RyID0gU3RyaW5nKGlucHV0KTtcclxuICB2YXIgb3V0cHV0ID0gJyc7XHJcbiAgZm9yIChcclxuICAgIC8vIGluaXRpYWxpemUgcmVzdWx0IGFuZCBjb3VudGVyXHJcbiAgICB2YXIgYmxvY2ssIGNoYXJDb2RlLCBpZHggPSAwLCBtYXAgPSBjaGFycztcclxuICAgIC8vIGlmIHRoZSBuZXh0IHN0ciBpbmRleCBkb2VzIG5vdCBleGlzdDpcclxuICAgIC8vICAgY2hhbmdlIHRoZSBtYXBwaW5nIHRhYmxlIHRvIFwiPVwiXHJcbiAgICAvLyAgIGNoZWNrIGlmIGQgaGFzIG5vIGZyYWN0aW9uYWwgZGlnaXRzXHJcbiAgICBzdHIuY2hhckF0KGlkeCB8IDApIHx8IChtYXAgPSAnPScsIGlkeCAlIDEpO1xyXG4gICAgLy8gXCI4IC0gaWR4ICUgMSAqIDhcIiBnZW5lcmF0ZXMgdGhlIHNlcXVlbmNlIDIsIDQsIDYsIDhcclxuICAgIG91dHB1dCArPSBtYXAuY2hhckF0KDYzICYgYmxvY2sgPj4gOCAtIGlkeCAlIDEgKiA4KVxyXG4gICkge1xyXG4gICAgY2hhckNvZGUgPSBzdHIuY2hhckNvZGVBdChpZHggKz0gMyAvIDQpO1xyXG4gICAgaWYgKGNoYXJDb2RlID4gMHhGRikge1xyXG4gICAgICB0aHJvdyBuZXcgRSgpO1xyXG4gICAgfVxyXG4gICAgYmxvY2sgPSBibG9jayA8PCA4IHwgY2hhckNvZGU7XHJcbiAgfVxyXG4gIHJldHVybiBvdXRwdXQ7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gYnRvYTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xyXG5cclxuZnVuY3Rpb24gZW5jb2RlKHZhbCkge1xyXG4gIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQodmFsKS5cclxuICAgIHJlcGxhY2UoLyU0MC9naSwgJ0AnKS5cclxuICAgIHJlcGxhY2UoLyUzQS9naSwgJzonKS5cclxuICAgIHJlcGxhY2UoLyUyNC9nLCAnJCcpLlxyXG4gICAgcmVwbGFjZSgvJTJDL2dpLCAnLCcpLlxyXG4gICAgcmVwbGFjZSgvJTIwL2csICcrJykuXHJcbiAgICByZXBsYWNlKC8lNUIvZ2ksICdbJykuXHJcbiAgICByZXBsYWNlKC8lNUQvZ2ksICddJyk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBCdWlsZCBhIFVSTCBieSBhcHBlbmRpbmcgcGFyYW1zIHRvIHRoZSBlbmRcclxuICpcclxuICogQHBhcmFtIHtzdHJpbmd9IHVybCBUaGUgYmFzZSBvZiB0aGUgdXJsIChlLmcuLCBodHRwOi8vd3d3Lmdvb2dsZS5jb20pXHJcbiAqIEBwYXJhbSB7b2JqZWN0fSBbcGFyYW1zXSBUaGUgcGFyYW1zIHRvIGJlIGFwcGVuZGVkXHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBmb3JtYXR0ZWQgdXJsXHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGJ1aWxkVVJMKHVybCwgcGFyYW1zLCBwYXJhbXNTZXJpYWxpemVyKSB7XHJcbiAgLyplc2xpbnQgbm8tcGFyYW0tcmVhc3NpZ246MCovXHJcbiAgaWYgKCFwYXJhbXMpIHtcclxuICAgIHJldHVybiB1cmw7XHJcbiAgfVxyXG5cclxuICB2YXIgc2VyaWFsaXplZFBhcmFtcztcclxuICBpZiAocGFyYW1zU2VyaWFsaXplcikge1xyXG4gICAgc2VyaWFsaXplZFBhcmFtcyA9IHBhcmFtc1NlcmlhbGl6ZXIocGFyYW1zKTtcclxuICB9IGVsc2UgaWYgKHV0aWxzLmlzVVJMU2VhcmNoUGFyYW1zKHBhcmFtcykpIHtcclxuICAgIHNlcmlhbGl6ZWRQYXJhbXMgPSBwYXJhbXMudG9TdHJpbmcoKTtcclxuICB9IGVsc2Uge1xyXG4gICAgdmFyIHBhcnRzID0gW107XHJcblxyXG4gICAgdXRpbHMuZm9yRWFjaChwYXJhbXMsIGZ1bmN0aW9uIHNlcmlhbGl6ZSh2YWwsIGtleSkge1xyXG4gICAgICBpZiAodmFsID09PSBudWxsIHx8IHR5cGVvZiB2YWwgPT09ICd1bmRlZmluZWQnKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAodXRpbHMuaXNBcnJheSh2YWwpKSB7XHJcbiAgICAgICAga2V5ID0ga2V5ICsgJ1tdJztcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB2YWwgPSBbdmFsXTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdXRpbHMuZm9yRWFjaCh2YWwsIGZ1bmN0aW9uIHBhcnNlVmFsdWUodikge1xyXG4gICAgICAgIGlmICh1dGlscy5pc0RhdGUodikpIHtcclxuICAgICAgICAgIHYgPSB2LnRvSVNPU3RyaW5nKCk7XHJcbiAgICAgICAgfSBlbHNlIGlmICh1dGlscy5pc09iamVjdCh2KSkge1xyXG4gICAgICAgICAgdiA9IEpTT04uc3RyaW5naWZ5KHYpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwYXJ0cy5wdXNoKGVuY29kZShrZXkpICsgJz0nICsgZW5jb2RlKHYpKTtcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBzZXJpYWxpemVkUGFyYW1zID0gcGFydHMuam9pbignJicpO1xyXG4gIH1cclxuXHJcbiAgaWYgKHNlcmlhbGl6ZWRQYXJhbXMpIHtcclxuICAgIHVybCArPSAodXJsLmluZGV4T2YoJz8nKSA9PT0gLTEgPyAnPycgOiAnJicpICsgc2VyaWFsaXplZFBhcmFtcztcclxuICB9XHJcblxyXG4gIHJldHVybiB1cmw7XHJcbn07XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGEgbmV3IFVSTCBieSBjb21iaW5pbmcgdGhlIHNwZWNpZmllZCBVUkxzXHJcbiAqXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBiYXNlVVJMIFRoZSBiYXNlIFVSTFxyXG4gKiBAcGFyYW0ge3N0cmluZ30gcmVsYXRpdmVVUkwgVGhlIHJlbGF0aXZlIFVSTFxyXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgY29tYmluZWQgVVJMXHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGNvbWJpbmVVUkxzKGJhc2VVUkwsIHJlbGF0aXZlVVJMKSB7XHJcbiAgcmV0dXJuIHJlbGF0aXZlVVJMXHJcbiAgICA/IGJhc2VVUkwucmVwbGFjZSgvXFwvKyQvLCAnJykgKyAnLycgKyByZWxhdGl2ZVVSTC5yZXBsYWNlKC9eXFwvKy8sICcnKVxyXG4gICAgOiBiYXNlVVJMO1xyXG59O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IChcclxuICB1dGlscy5pc1N0YW5kYXJkQnJvd3NlckVudigpID9cclxuXHJcbiAgLy8gU3RhbmRhcmQgYnJvd3NlciBlbnZzIHN1cHBvcnQgZG9jdW1lbnQuY29va2llXHJcbiAgKGZ1bmN0aW9uIHN0YW5kYXJkQnJvd3NlckVudigpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHdyaXRlOiBmdW5jdGlvbiB3cml0ZShuYW1lLCB2YWx1ZSwgZXhwaXJlcywgcGF0aCwgZG9tYWluLCBzZWN1cmUpIHtcclxuICAgICAgICB2YXIgY29va2llID0gW107XHJcbiAgICAgICAgY29va2llLnB1c2gobmFtZSArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSkpO1xyXG5cclxuICAgICAgICBpZiAodXRpbHMuaXNOdW1iZXIoZXhwaXJlcykpIHtcclxuICAgICAgICAgIGNvb2tpZS5wdXNoKCdleHBpcmVzPScgKyBuZXcgRGF0ZShleHBpcmVzKS50b0dNVFN0cmluZygpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh1dGlscy5pc1N0cmluZyhwYXRoKSkge1xyXG4gICAgICAgICAgY29va2llLnB1c2goJ3BhdGg9JyArIHBhdGgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHV0aWxzLmlzU3RyaW5nKGRvbWFpbikpIHtcclxuICAgICAgICAgIGNvb2tpZS5wdXNoKCdkb21haW49JyArIGRvbWFpbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoc2VjdXJlID09PSB0cnVlKSB7XHJcbiAgICAgICAgICBjb29raWUucHVzaCgnc2VjdXJlJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBkb2N1bWVudC5jb29raWUgPSBjb29raWUuam9pbignOyAnKTtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIHJlYWQ6IGZ1bmN0aW9uIHJlYWQobmFtZSkge1xyXG4gICAgICAgIHZhciBtYXRjaCA9IGRvY3VtZW50LmNvb2tpZS5tYXRjaChuZXcgUmVnRXhwKCcoXnw7XFxcXHMqKSgnICsgbmFtZSArICcpPShbXjtdKiknKSk7XHJcbiAgICAgICAgcmV0dXJuIChtYXRjaCA/IGRlY29kZVVSSUNvbXBvbmVudChtYXRjaFszXSkgOiBudWxsKTtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIHJlbW92ZTogZnVuY3Rpb24gcmVtb3ZlKG5hbWUpIHtcclxuICAgICAgICB0aGlzLndyaXRlKG5hbWUsICcnLCBEYXRlLm5vdygpIC0gODY0MDAwMDApO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gIH0pKCkgOlxyXG5cclxuICAvLyBOb24gc3RhbmRhcmQgYnJvd3NlciBlbnYgKHdlYiB3b3JrZXJzLCByZWFjdC1uYXRpdmUpIGxhY2sgbmVlZGVkIHN1cHBvcnQuXHJcbiAgKGZ1bmN0aW9uIG5vblN0YW5kYXJkQnJvd3NlckVudigpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHdyaXRlOiBmdW5jdGlvbiB3cml0ZSgpIHt9LFxyXG4gICAgICByZWFkOiBmdW5jdGlvbiByZWFkKCkgeyByZXR1cm4gbnVsbDsgfSxcclxuICAgICAgcmVtb3ZlOiBmdW5jdGlvbiByZW1vdmUoKSB7fVxyXG4gICAgfTtcclxuICB9KSgpXHJcbik7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbi8qKlxyXG4gKiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhlIHNwZWNpZmllZCBVUkwgaXMgYWJzb2x1dGVcclxuICpcclxuICogQHBhcmFtIHtzdHJpbmd9IHVybCBUaGUgVVJMIHRvIHRlc3RcclxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdGhlIHNwZWNpZmllZCBVUkwgaXMgYWJzb2x1dGUsIG90aGVyd2lzZSBmYWxzZVxyXG4gKi9cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0Fic29sdXRlVVJMKHVybCkge1xyXG4gIC8vIEEgVVJMIGlzIGNvbnNpZGVyZWQgYWJzb2x1dGUgaWYgaXQgYmVnaW5zIHdpdGggXCI8c2NoZW1lPjovL1wiIG9yIFwiLy9cIiAocHJvdG9jb2wtcmVsYXRpdmUgVVJMKS5cclxuICAvLyBSRkMgMzk4NiBkZWZpbmVzIHNjaGVtZSBuYW1lIGFzIGEgc2VxdWVuY2Ugb2YgY2hhcmFjdGVycyBiZWdpbm5pbmcgd2l0aCBhIGxldHRlciBhbmQgZm9sbG93ZWRcclxuICAvLyBieSBhbnkgY29tYmluYXRpb24gb2YgbGV0dGVycywgZGlnaXRzLCBwbHVzLCBwZXJpb2QsIG9yIGh5cGhlbi5cclxuICByZXR1cm4gL14oW2Etel1bYS16XFxkXFwrXFwtXFwuXSo6KT9cXC9cXC8vaS50ZXN0KHVybCk7XHJcbn07XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gKFxyXG4gIHV0aWxzLmlzU3RhbmRhcmRCcm93c2VyRW52KCkgP1xyXG5cclxuICAvLyBTdGFuZGFyZCBicm93c2VyIGVudnMgaGF2ZSBmdWxsIHN1cHBvcnQgb2YgdGhlIEFQSXMgbmVlZGVkIHRvIHRlc3RcclxuICAvLyB3aGV0aGVyIHRoZSByZXF1ZXN0IFVSTCBpcyBvZiB0aGUgc2FtZSBvcmlnaW4gYXMgY3VycmVudCBsb2NhdGlvbi5cclxuICAoZnVuY3Rpb24gc3RhbmRhcmRCcm93c2VyRW52KCkge1xyXG4gICAgdmFyIG1zaWUgPSAvKG1zaWV8dHJpZGVudCkvaS50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpO1xyXG4gICAgdmFyIHVybFBhcnNpbmdOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xyXG4gICAgdmFyIG9yaWdpblVSTDtcclxuXHJcbiAgICAvKipcclxuICAgICogUGFyc2UgYSBVUkwgdG8gZGlzY292ZXIgaXQncyBjb21wb25lbnRzXHJcbiAgICAqXHJcbiAgICAqIEBwYXJhbSB7U3RyaW5nfSB1cmwgVGhlIFVSTCB0byBiZSBwYXJzZWRcclxuICAgICogQHJldHVybnMge09iamVjdH1cclxuICAgICovXHJcbiAgICBmdW5jdGlvbiByZXNvbHZlVVJMKHVybCkge1xyXG4gICAgICB2YXIgaHJlZiA9IHVybDtcclxuXHJcbiAgICAgIGlmIChtc2llKSB7XHJcbiAgICAgICAgLy8gSUUgbmVlZHMgYXR0cmlidXRlIHNldCB0d2ljZSB0byBub3JtYWxpemUgcHJvcGVydGllc1xyXG4gICAgICAgIHVybFBhcnNpbmdOb2RlLnNldEF0dHJpYnV0ZSgnaHJlZicsIGhyZWYpO1xyXG4gICAgICAgIGhyZWYgPSB1cmxQYXJzaW5nTm9kZS5ocmVmO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB1cmxQYXJzaW5nTm9kZS5zZXRBdHRyaWJ1dGUoJ2hyZWYnLCBocmVmKTtcclxuXHJcbiAgICAgIC8vIHVybFBhcnNpbmdOb2RlIHByb3ZpZGVzIHRoZSBVcmxVdGlscyBpbnRlcmZhY2UgLSBodHRwOi8vdXJsLnNwZWMud2hhdHdnLm9yZy8jdXJsdXRpbHNcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBocmVmOiB1cmxQYXJzaW5nTm9kZS5ocmVmLFxyXG4gICAgICAgIHByb3RvY29sOiB1cmxQYXJzaW5nTm9kZS5wcm90b2NvbCA/IHVybFBhcnNpbmdOb2RlLnByb3RvY29sLnJlcGxhY2UoLzokLywgJycpIDogJycsXHJcbiAgICAgICAgaG9zdDogdXJsUGFyc2luZ05vZGUuaG9zdCxcclxuICAgICAgICBzZWFyY2g6IHVybFBhcnNpbmdOb2RlLnNlYXJjaCA/IHVybFBhcnNpbmdOb2RlLnNlYXJjaC5yZXBsYWNlKC9eXFw/LywgJycpIDogJycsXHJcbiAgICAgICAgaGFzaDogdXJsUGFyc2luZ05vZGUuaGFzaCA/IHVybFBhcnNpbmdOb2RlLmhhc2gucmVwbGFjZSgvXiMvLCAnJykgOiAnJyxcclxuICAgICAgICBob3N0bmFtZTogdXJsUGFyc2luZ05vZGUuaG9zdG5hbWUsXHJcbiAgICAgICAgcG9ydDogdXJsUGFyc2luZ05vZGUucG9ydCxcclxuICAgICAgICBwYXRobmFtZTogKHVybFBhcnNpbmdOb2RlLnBhdGhuYW1lLmNoYXJBdCgwKSA9PT0gJy8nKSA/XHJcbiAgICAgICAgICAgICAgICAgIHVybFBhcnNpbmdOb2RlLnBhdGhuYW1lIDpcclxuICAgICAgICAgICAgICAgICAgJy8nICsgdXJsUGFyc2luZ05vZGUucGF0aG5hbWVcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBvcmlnaW5VUkwgPSByZXNvbHZlVVJMKHdpbmRvdy5sb2NhdGlvbi5ocmVmKTtcclxuXHJcbiAgICAvKipcclxuICAgICogRGV0ZXJtaW5lIGlmIGEgVVJMIHNoYXJlcyB0aGUgc2FtZSBvcmlnaW4gYXMgdGhlIGN1cnJlbnQgbG9jYXRpb25cclxuICAgICpcclxuICAgICogQHBhcmFtIHtTdHJpbmd9IHJlcXVlc3RVUkwgVGhlIFVSTCB0byB0ZXN0XHJcbiAgICAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIFVSTCBzaGFyZXMgdGhlIHNhbWUgb3JpZ2luLCBvdGhlcndpc2UgZmFsc2VcclxuICAgICovXHJcbiAgICByZXR1cm4gZnVuY3Rpb24gaXNVUkxTYW1lT3JpZ2luKHJlcXVlc3RVUkwpIHtcclxuICAgICAgdmFyIHBhcnNlZCA9ICh1dGlscy5pc1N0cmluZyhyZXF1ZXN0VVJMKSkgPyByZXNvbHZlVVJMKHJlcXVlc3RVUkwpIDogcmVxdWVzdFVSTDtcclxuICAgICAgcmV0dXJuIChwYXJzZWQucHJvdG9jb2wgPT09IG9yaWdpblVSTC5wcm90b2NvbCAmJlxyXG4gICAgICAgICAgICBwYXJzZWQuaG9zdCA9PT0gb3JpZ2luVVJMLmhvc3QpO1xyXG4gICAgfTtcclxuICB9KSgpIDpcclxuXHJcbiAgLy8gTm9uIHN0YW5kYXJkIGJyb3dzZXIgZW52cyAod2ViIHdvcmtlcnMsIHJlYWN0LW5hdGl2ZSkgbGFjayBuZWVkZWQgc3VwcG9ydC5cclxuICAoZnVuY3Rpb24gbm9uU3RhbmRhcmRCcm93c2VyRW52KCkge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIGlzVVJMU2FtZU9yaWdpbigpIHtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9O1xyXG4gIH0pKClcclxuKTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gbm9ybWFsaXplSGVhZGVyTmFtZShoZWFkZXJzLCBub3JtYWxpemVkTmFtZSkge1xyXG4gIHV0aWxzLmZvckVhY2goaGVhZGVycywgZnVuY3Rpb24gcHJvY2Vzc0hlYWRlcih2YWx1ZSwgbmFtZSkge1xyXG4gICAgaWYgKG5hbWUgIT09IG5vcm1hbGl6ZWROYW1lICYmIG5hbWUudG9VcHBlckNhc2UoKSA9PT0gbm9ybWFsaXplZE5hbWUudG9VcHBlckNhc2UoKSkge1xyXG4gICAgICBoZWFkZXJzW25vcm1hbGl6ZWROYW1lXSA9IHZhbHVlO1xyXG4gICAgICBkZWxldGUgaGVhZGVyc1tuYW1lXTtcclxuICAgIH1cclxuICB9KTtcclxufTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xyXG5cclxuLy8gSGVhZGVycyB3aG9zZSBkdXBsaWNhdGVzIGFyZSBpZ25vcmVkIGJ5IG5vZGVcclxuLy8gYy5mLiBodHRwczovL25vZGVqcy5vcmcvYXBpL2h0dHAuaHRtbCNodHRwX21lc3NhZ2VfaGVhZGVyc1xyXG52YXIgaWdub3JlRHVwbGljYXRlT2YgPSBbXHJcbiAgJ2FnZScsICdhdXRob3JpemF0aW9uJywgJ2NvbnRlbnQtbGVuZ3RoJywgJ2NvbnRlbnQtdHlwZScsICdldGFnJyxcclxuICAnZXhwaXJlcycsICdmcm9tJywgJ2hvc3QnLCAnaWYtbW9kaWZpZWQtc2luY2UnLCAnaWYtdW5tb2RpZmllZC1zaW5jZScsXHJcbiAgJ2xhc3QtbW9kaWZpZWQnLCAnbG9jYXRpb24nLCAnbWF4LWZvcndhcmRzJywgJ3Byb3h5LWF1dGhvcml6YXRpb24nLFxyXG4gICdyZWZlcmVyJywgJ3JldHJ5LWFmdGVyJywgJ3VzZXItYWdlbnQnXHJcbl07XHJcblxyXG4vKipcclxuICogUGFyc2UgaGVhZGVycyBpbnRvIGFuIG9iamVjdFxyXG4gKlxyXG4gKiBgYGBcclxuICogRGF0ZTogV2VkLCAyNyBBdWcgMjAxNCAwODo1ODo0OSBHTVRcclxuICogQ29udGVudC1UeXBlOiBhcHBsaWNhdGlvbi9qc29uXHJcbiAqIENvbm5lY3Rpb246IGtlZXAtYWxpdmVcclxuICogVHJhbnNmZXItRW5jb2Rpbmc6IGNodW5rZWRcclxuICogYGBgXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBoZWFkZXJzIEhlYWRlcnMgbmVlZGluZyB0byBiZSBwYXJzZWRcclxuICogQHJldHVybnMge09iamVjdH0gSGVhZGVycyBwYXJzZWQgaW50byBhbiBvYmplY3RcclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gcGFyc2VIZWFkZXJzKGhlYWRlcnMpIHtcclxuICB2YXIgcGFyc2VkID0ge307XHJcbiAgdmFyIGtleTtcclxuICB2YXIgdmFsO1xyXG4gIHZhciBpO1xyXG5cclxuICBpZiAoIWhlYWRlcnMpIHsgcmV0dXJuIHBhcnNlZDsgfVxyXG5cclxuICB1dGlscy5mb3JFYWNoKGhlYWRlcnMuc3BsaXQoJ1xcbicpLCBmdW5jdGlvbiBwYXJzZXIobGluZSkge1xyXG4gICAgaSA9IGxpbmUuaW5kZXhPZignOicpO1xyXG4gICAga2V5ID0gdXRpbHMudHJpbShsaW5lLnN1YnN0cigwLCBpKSkudG9Mb3dlckNhc2UoKTtcclxuICAgIHZhbCA9IHV0aWxzLnRyaW0obGluZS5zdWJzdHIoaSArIDEpKTtcclxuXHJcbiAgICBpZiAoa2V5KSB7XHJcbiAgICAgIGlmIChwYXJzZWRba2V5XSAmJiBpZ25vcmVEdXBsaWNhdGVPZi5pbmRleE9mKGtleSkgPj0gMCkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG4gICAgICBpZiAoa2V5ID09PSAnc2V0LWNvb2tpZScpIHtcclxuICAgICAgICBwYXJzZWRba2V5XSA9IChwYXJzZWRba2V5XSA/IHBhcnNlZFtrZXldIDogW10pLmNvbmNhdChbdmFsXSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcGFyc2VkW2tleV0gPSBwYXJzZWRba2V5XSA/IHBhcnNlZFtrZXldICsgJywgJyArIHZhbCA6IHZhbDtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0pO1xyXG5cclxuICByZXR1cm4gcGFyc2VkO1xyXG59O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG4vKipcclxuICogU3ludGFjdGljIHN1Z2FyIGZvciBpbnZva2luZyBhIGZ1bmN0aW9uIGFuZCBleHBhbmRpbmcgYW4gYXJyYXkgZm9yIGFyZ3VtZW50cy5cclxuICpcclxuICogQ29tbW9uIHVzZSBjYXNlIHdvdWxkIGJlIHRvIHVzZSBgRnVuY3Rpb24ucHJvdG90eXBlLmFwcGx5YC5cclxuICpcclxuICogIGBgYGpzXHJcbiAqICBmdW5jdGlvbiBmKHgsIHksIHopIHt9XHJcbiAqICB2YXIgYXJncyA9IFsxLCAyLCAzXTtcclxuICogIGYuYXBwbHkobnVsbCwgYXJncyk7XHJcbiAqICBgYGBcclxuICpcclxuICogV2l0aCBgc3ByZWFkYCB0aGlzIGV4YW1wbGUgY2FuIGJlIHJlLXdyaXR0ZW4uXHJcbiAqXHJcbiAqICBgYGBqc1xyXG4gKiAgc3ByZWFkKGZ1bmN0aW9uKHgsIHksIHopIHt9KShbMSwgMiwgM10pO1xyXG4gKiAgYGBgXHJcbiAqXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXHJcbiAqIEByZXR1cm5zIHtGdW5jdGlvbn1cclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gc3ByZWFkKGNhbGxiYWNrKSB7XHJcbiAgcmV0dXJuIGZ1bmN0aW9uIHdyYXAoYXJyKSB7XHJcbiAgICByZXR1cm4gY2FsbGJhY2suYXBwbHkobnVsbCwgYXJyKTtcclxuICB9O1xyXG59O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG52YXIgYmluZCA9IHJlcXVpcmUoJy4vaGVscGVycy9iaW5kJyk7XHJcbnZhciBpc0J1ZmZlciA9IHJlcXVpcmUoJ2lzLWJ1ZmZlcicpO1xyXG5cclxuLypnbG9iYWwgdG9TdHJpbmc6dHJ1ZSovXHJcblxyXG4vLyB1dGlscyBpcyBhIGxpYnJhcnkgb2YgZ2VuZXJpYyBoZWxwZXIgZnVuY3Rpb25zIG5vbi1zcGVjaWZpYyB0byBheGlvc1xyXG5cclxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcclxuXHJcbi8qKlxyXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhbiBBcnJheVxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XHJcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGFuIEFycmF5LCBvdGhlcndpc2UgZmFsc2VcclxuICovXHJcbmZ1bmN0aW9uIGlzQXJyYXkodmFsKSB7XHJcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwodmFsKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcclxufVxyXG5cclxuLyoqXHJcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGFuIEFycmF5QnVmZmVyXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcclxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYW4gQXJyYXlCdWZmZXIsIG90aGVyd2lzZSBmYWxzZVxyXG4gKi9cclxuZnVuY3Rpb24gaXNBcnJheUJ1ZmZlcih2YWwpIHtcclxuICByZXR1cm4gdG9TdHJpbmcuY2FsbCh2YWwpID09PSAnW29iamVjdCBBcnJheUJ1ZmZlcl0nO1xyXG59XHJcblxyXG4vKipcclxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBGb3JtRGF0YVxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XHJcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGFuIEZvcm1EYXRhLCBvdGhlcndpc2UgZmFsc2VcclxuICovXHJcbmZ1bmN0aW9uIGlzRm9ybURhdGEodmFsKSB7XHJcbiAgcmV0dXJuICh0eXBlb2YgRm9ybURhdGEgIT09ICd1bmRlZmluZWQnKSAmJiAodmFsIGluc3RhbmNlb2YgRm9ybURhdGEpO1xyXG59XHJcblxyXG4vKipcclxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSB2aWV3IG9uIGFuIEFycmF5QnVmZmVyXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcclxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSB2aWV3IG9uIGFuIEFycmF5QnVmZmVyLCBvdGhlcndpc2UgZmFsc2VcclxuICovXHJcbmZ1bmN0aW9uIGlzQXJyYXlCdWZmZXJWaWV3KHZhbCkge1xyXG4gIHZhciByZXN1bHQ7XHJcbiAgaWYgKCh0eXBlb2YgQXJyYXlCdWZmZXIgIT09ICd1bmRlZmluZWQnKSAmJiAoQXJyYXlCdWZmZXIuaXNWaWV3KSkge1xyXG4gICAgcmVzdWx0ID0gQXJyYXlCdWZmZXIuaXNWaWV3KHZhbCk7XHJcbiAgfSBlbHNlIHtcclxuICAgIHJlc3VsdCA9ICh2YWwpICYmICh2YWwuYnVmZmVyKSAmJiAodmFsLmJ1ZmZlciBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKTtcclxuICB9XHJcbiAgcmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxuLyoqXHJcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgU3RyaW5nXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcclxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBTdHJpbmcsIG90aGVyd2lzZSBmYWxzZVxyXG4gKi9cclxuZnVuY3Rpb24gaXNTdHJpbmcodmFsKSB7XHJcbiAgcmV0dXJuIHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnO1xyXG59XHJcblxyXG4vKipcclxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBOdW1iZXJcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIE51bWJlciwgb3RoZXJ3aXNlIGZhbHNlXHJcbiAqL1xyXG5mdW5jdGlvbiBpc051bWJlcih2YWwpIHtcclxuICByZXR1cm4gdHlwZW9mIHZhbCA9PT0gJ251bWJlcic7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyB1bmRlZmluZWRcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB0aGUgdmFsdWUgaXMgdW5kZWZpbmVkLCBvdGhlcndpc2UgZmFsc2VcclxuICovXHJcbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKHZhbCkge1xyXG4gIHJldHVybiB0eXBlb2YgdmFsID09PSAndW5kZWZpbmVkJztcclxufVxyXG5cclxuLyoqXHJcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGFuIE9iamVjdFxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XHJcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGFuIE9iamVjdCwgb3RoZXJ3aXNlIGZhbHNlXHJcbiAqL1xyXG5mdW5jdGlvbiBpc09iamVjdCh2YWwpIHtcclxuICByZXR1cm4gdmFsICE9PSBudWxsICYmIHR5cGVvZiB2YWwgPT09ICdvYmplY3QnO1xyXG59XHJcblxyXG4vKipcclxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBEYXRlXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcclxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBEYXRlLCBvdGhlcndpc2UgZmFsc2VcclxuICovXHJcbmZ1bmN0aW9uIGlzRGF0ZSh2YWwpIHtcclxuICByZXR1cm4gdG9TdHJpbmcuY2FsbCh2YWwpID09PSAnW29iamVjdCBEYXRlXSc7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhIEZpbGVcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIEZpbGUsIG90aGVyd2lzZSBmYWxzZVxyXG4gKi9cclxuZnVuY3Rpb24gaXNGaWxlKHZhbCkge1xyXG4gIHJldHVybiB0b1N0cmluZy5jYWxsKHZhbCkgPT09ICdbb2JqZWN0IEZpbGVdJztcclxufVxyXG5cclxuLyoqXHJcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgQmxvYlxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XHJcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgQmxvYiwgb3RoZXJ3aXNlIGZhbHNlXHJcbiAqL1xyXG5mdW5jdGlvbiBpc0Jsb2IodmFsKSB7XHJcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwodmFsKSA9PT0gJ1tvYmplY3QgQmxvYl0nO1xyXG59XHJcblxyXG4vKipcclxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBGdW5jdGlvblxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XHJcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgRnVuY3Rpb24sIG90aGVyd2lzZSBmYWxzZVxyXG4gKi9cclxuZnVuY3Rpb24gaXNGdW5jdGlvbih2YWwpIHtcclxuICByZXR1cm4gdG9TdHJpbmcuY2FsbCh2YWwpID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xyXG59XHJcblxyXG4vKipcclxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBTdHJlYW1cclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIFN0cmVhbSwgb3RoZXJ3aXNlIGZhbHNlXHJcbiAqL1xyXG5mdW5jdGlvbiBpc1N0cmVhbSh2YWwpIHtcclxuICByZXR1cm4gaXNPYmplY3QodmFsKSAmJiBpc0Z1bmN0aW9uKHZhbC5waXBlKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgVVJMU2VhcmNoUGFyYW1zIG9iamVjdFxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XHJcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgVVJMU2VhcmNoUGFyYW1zIG9iamVjdCwgb3RoZXJ3aXNlIGZhbHNlXHJcbiAqL1xyXG5mdW5jdGlvbiBpc1VSTFNlYXJjaFBhcmFtcyh2YWwpIHtcclxuICByZXR1cm4gdHlwZW9mIFVSTFNlYXJjaFBhcmFtcyAhPT0gJ3VuZGVmaW5lZCcgJiYgdmFsIGluc3RhbmNlb2YgVVJMU2VhcmNoUGFyYW1zO1xyXG59XHJcblxyXG4vKipcclxuICogVHJpbSBleGNlc3Mgd2hpdGVzcGFjZSBvZmYgdGhlIGJlZ2lubmluZyBhbmQgZW5kIG9mIGEgc3RyaW5nXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHIgVGhlIFN0cmluZyB0byB0cmltXHJcbiAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBTdHJpbmcgZnJlZWQgb2YgZXhjZXNzIHdoaXRlc3BhY2VcclxuICovXHJcbmZ1bmN0aW9uIHRyaW0oc3RyKSB7XHJcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9eXFxzKi8sICcnKS5yZXBsYWNlKC9cXHMqJC8sICcnKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIERldGVybWluZSBpZiB3ZSdyZSBydW5uaW5nIGluIGEgc3RhbmRhcmQgYnJvd3NlciBlbnZpcm9ubWVudFxyXG4gKlxyXG4gKiBUaGlzIGFsbG93cyBheGlvcyB0byBydW4gaW4gYSB3ZWIgd29ya2VyLCBhbmQgcmVhY3QtbmF0aXZlLlxyXG4gKiBCb3RoIGVudmlyb25tZW50cyBzdXBwb3J0IFhNTEh0dHBSZXF1ZXN0LCBidXQgbm90IGZ1bGx5IHN0YW5kYXJkIGdsb2JhbHMuXHJcbiAqXHJcbiAqIHdlYiB3b3JrZXJzOlxyXG4gKiAgdHlwZW9mIHdpbmRvdyAtPiB1bmRlZmluZWRcclxuICogIHR5cGVvZiBkb2N1bWVudCAtPiB1bmRlZmluZWRcclxuICpcclxuICogcmVhY3QtbmF0aXZlOlxyXG4gKiAgbmF2aWdhdG9yLnByb2R1Y3QgLT4gJ1JlYWN0TmF0aXZlJ1xyXG4gKi9cclxuZnVuY3Rpb24gaXNTdGFuZGFyZEJyb3dzZXJFbnYoKSB7XHJcbiAgaWYgKHR5cGVvZiBuYXZpZ2F0b3IgIT09ICd1bmRlZmluZWQnICYmIG5hdmlnYXRvci5wcm9kdWN0ID09PSAnUmVhY3ROYXRpdmUnKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG4gIHJldHVybiAoXHJcbiAgICB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJlxyXG4gICAgdHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJ1xyXG4gICk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBJdGVyYXRlIG92ZXIgYW4gQXJyYXkgb3IgYW4gT2JqZWN0IGludm9raW5nIGEgZnVuY3Rpb24gZm9yIGVhY2ggaXRlbS5cclxuICpcclxuICogSWYgYG9iamAgaXMgYW4gQXJyYXkgY2FsbGJhY2sgd2lsbCBiZSBjYWxsZWQgcGFzc2luZ1xyXG4gKiB0aGUgdmFsdWUsIGluZGV4LCBhbmQgY29tcGxldGUgYXJyYXkgZm9yIGVhY2ggaXRlbS5cclxuICpcclxuICogSWYgJ29iaicgaXMgYW4gT2JqZWN0IGNhbGxiYWNrIHdpbGwgYmUgY2FsbGVkIHBhc3NpbmdcclxuICogdGhlIHZhbHVlLCBrZXksIGFuZCBjb21wbGV0ZSBvYmplY3QgZm9yIGVhY2ggcHJvcGVydHkuXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fSBvYmogVGhlIG9iamVjdCB0byBpdGVyYXRlXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIFRoZSBjYWxsYmFjayB0byBpbnZva2UgZm9yIGVhY2ggaXRlbVxyXG4gKi9cclxuZnVuY3Rpb24gZm9yRWFjaChvYmosIGZuKSB7XHJcbiAgLy8gRG9uJ3QgYm90aGVyIGlmIG5vIHZhbHVlIHByb3ZpZGVkXHJcbiAgaWYgKG9iaiA9PT0gbnVsbCB8fCB0eXBlb2Ygb2JqID09PSAndW5kZWZpbmVkJykge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgLy8gRm9yY2UgYW4gYXJyYXkgaWYgbm90IGFscmVhZHkgc29tZXRoaW5nIGl0ZXJhYmxlXHJcbiAgaWYgKHR5cGVvZiBvYmogIT09ICdvYmplY3QnKSB7XHJcbiAgICAvKmVzbGludCBuby1wYXJhbS1yZWFzc2lnbjowKi9cclxuICAgIG9iaiA9IFtvYmpdO1xyXG4gIH1cclxuXHJcbiAgaWYgKGlzQXJyYXkob2JqKSkge1xyXG4gICAgLy8gSXRlcmF0ZSBvdmVyIGFycmF5IHZhbHVlc1xyXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBvYmoubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XHJcbiAgICAgIGZuLmNhbGwobnVsbCwgb2JqW2ldLCBpLCBvYmopO1xyXG4gICAgfVxyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBJdGVyYXRlIG92ZXIgb2JqZWN0IGtleXNcclxuICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcclxuICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIHtcclxuICAgICAgICBmbi5jYWxsKG51bGwsIG9ialtrZXldLCBrZXksIG9iaik7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBBY2NlcHRzIHZhcmFyZ3MgZXhwZWN0aW5nIGVhY2ggYXJndW1lbnQgdG8gYmUgYW4gb2JqZWN0LCB0aGVuXHJcbiAqIGltbXV0YWJseSBtZXJnZXMgdGhlIHByb3BlcnRpZXMgb2YgZWFjaCBvYmplY3QgYW5kIHJldHVybnMgcmVzdWx0LlxyXG4gKlxyXG4gKiBXaGVuIG11bHRpcGxlIG9iamVjdHMgY29udGFpbiB0aGUgc2FtZSBrZXkgdGhlIGxhdGVyIG9iamVjdCBpblxyXG4gKiB0aGUgYXJndW1lbnRzIGxpc3Qgd2lsbCB0YWtlIHByZWNlZGVuY2UuXHJcbiAqXHJcbiAqIEV4YW1wbGU6XHJcbiAqXHJcbiAqIGBgYGpzXHJcbiAqIHZhciByZXN1bHQgPSBtZXJnZSh7Zm9vOiAxMjN9LCB7Zm9vOiA0NTZ9KTtcclxuICogY29uc29sZS5sb2cocmVzdWx0LmZvbyk7IC8vIG91dHB1dHMgNDU2XHJcbiAqIGBgYFxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqMSBPYmplY3QgdG8gbWVyZ2VcclxuICogQHJldHVybnMge09iamVjdH0gUmVzdWx0IG9mIGFsbCBtZXJnZSBwcm9wZXJ0aWVzXHJcbiAqL1xyXG5mdW5jdGlvbiBtZXJnZSgvKiBvYmoxLCBvYmoyLCBvYmozLCAuLi4gKi8pIHtcclxuICB2YXIgcmVzdWx0ID0ge307XHJcbiAgZnVuY3Rpb24gYXNzaWduVmFsdWUodmFsLCBrZXkpIHtcclxuICAgIGlmICh0eXBlb2YgcmVzdWx0W2tleV0gPT09ICdvYmplY3QnICYmIHR5cGVvZiB2YWwgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgIHJlc3VsdFtrZXldID0gbWVyZ2UocmVzdWx0W2tleV0sIHZhbCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXN1bHRba2V5XSA9IHZhbDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZvciAodmFyIGkgPSAwLCBsID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xyXG4gICAgZm9yRWFjaChhcmd1bWVudHNbaV0sIGFzc2lnblZhbHVlKTtcclxuICB9XHJcbiAgcmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxuLyoqXHJcbiAqIEV4dGVuZHMgb2JqZWN0IGEgYnkgbXV0YWJseSBhZGRpbmcgdG8gaXQgdGhlIHByb3BlcnRpZXMgb2Ygb2JqZWN0IGIuXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBhIFRoZSBvYmplY3QgdG8gYmUgZXh0ZW5kZWRcclxuICogQHBhcmFtIHtPYmplY3R9IGIgVGhlIG9iamVjdCB0byBjb3B5IHByb3BlcnRpZXMgZnJvbVxyXG4gKiBAcGFyYW0ge09iamVjdH0gdGhpc0FyZyBUaGUgb2JqZWN0IHRvIGJpbmQgZnVuY3Rpb24gdG9cclxuICogQHJldHVybiB7T2JqZWN0fSBUaGUgcmVzdWx0aW5nIHZhbHVlIG9mIG9iamVjdCBhXHJcbiAqL1xyXG5mdW5jdGlvbiBleHRlbmQoYSwgYiwgdGhpc0FyZykge1xyXG4gIGZvckVhY2goYiwgZnVuY3Rpb24gYXNzaWduVmFsdWUodmFsLCBrZXkpIHtcclxuICAgIGlmICh0aGlzQXJnICYmIHR5cGVvZiB2YWwgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgYVtrZXldID0gYmluZCh2YWwsIHRoaXNBcmcpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgYVtrZXldID0gdmFsO1xyXG4gICAgfVxyXG4gIH0pO1xyXG4gIHJldHVybiBhO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICBpc0FycmF5OiBpc0FycmF5LFxyXG4gIGlzQXJyYXlCdWZmZXI6IGlzQXJyYXlCdWZmZXIsXHJcbiAgaXNCdWZmZXI6IGlzQnVmZmVyLFxyXG4gIGlzRm9ybURhdGE6IGlzRm9ybURhdGEsXHJcbiAgaXNBcnJheUJ1ZmZlclZpZXc6IGlzQXJyYXlCdWZmZXJWaWV3LFxyXG4gIGlzU3RyaW5nOiBpc1N0cmluZyxcclxuICBpc051bWJlcjogaXNOdW1iZXIsXHJcbiAgaXNPYmplY3Q6IGlzT2JqZWN0LFxyXG4gIGlzVW5kZWZpbmVkOiBpc1VuZGVmaW5lZCxcclxuICBpc0RhdGU6IGlzRGF0ZSxcclxuICBpc0ZpbGU6IGlzRmlsZSxcclxuICBpc0Jsb2I6IGlzQmxvYixcclxuICBpc0Z1bmN0aW9uOiBpc0Z1bmN0aW9uLFxyXG4gIGlzU3RyZWFtOiBpc1N0cmVhbSxcclxuICBpc1VSTFNlYXJjaFBhcmFtczogaXNVUkxTZWFyY2hQYXJhbXMsXHJcbiAgaXNTdGFuZGFyZEJyb3dzZXJFbnY6IGlzU3RhbmRhcmRCcm93c2VyRW52LFxyXG4gIGZvckVhY2g6IGZvckVhY2gsXHJcbiAgbWVyZ2U6IG1lcmdlLFxyXG4gIGV4dGVuZDogZXh0ZW5kLFxyXG4gIHRyaW06IHRyaW1cclxufTtcclxuIiwiLyohXHJcbiAqIERldGVybWluZSBpZiBhbiBvYmplY3QgaXMgYSBCdWZmZXJcclxuICpcclxuICogQGF1dGhvciAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGh0dHBzOi8vZmVyb3NzLm9yZz5cclxuICogQGxpY2Vuc2UgIE1JVFxyXG4gKi9cclxuXHJcbi8vIFRoZSBfaXNCdWZmZXIgY2hlY2sgaXMgZm9yIFNhZmFyaSA1LTcgc3VwcG9ydCwgYmVjYXVzZSBpdCdzIG1pc3NpbmdcclxuLy8gT2JqZWN0LnByb3RvdHlwZS5jb25zdHJ1Y3Rvci4gUmVtb3ZlIHRoaXMgZXZlbnR1YWxseVxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvYmopIHtcclxuICByZXR1cm4gb2JqICE9IG51bGwgJiYgKGlzQnVmZmVyKG9iaikgfHwgaXNTbG93QnVmZmVyKG9iaikgfHwgISFvYmouX2lzQnVmZmVyKVxyXG59XHJcblxyXG5mdW5jdGlvbiBpc0J1ZmZlciAob2JqKSB7XHJcbiAgcmV0dXJuICEhb2JqLmNvbnN0cnVjdG9yICYmIHR5cGVvZiBvYmouY29uc3RydWN0b3IuaXNCdWZmZXIgPT09ICdmdW5jdGlvbicgJiYgb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyKG9iailcclxufVxyXG5cclxuLy8gRm9yIE5vZGUgdjAuMTAgc3VwcG9ydC4gUmVtb3ZlIHRoaXMgZXZlbnR1YWxseS5cclxuZnVuY3Rpb24gaXNTbG93QnVmZmVyIChvYmopIHtcclxuICByZXR1cm4gdHlwZW9mIG9iai5yZWFkRmxvYXRMRSA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2Ygb2JqLnNsaWNlID09PSAnZnVuY3Rpb24nICYmIGlzQnVmZmVyKG9iai5zbGljZSgwLCAwKSlcclxufVxyXG4iLCIvKipUaGlzIGNsYXNzIGlzIGF1dG9tYXRpY2FsbHkgZ2VuZXJhdGVkIGJ5IExheWFBaXJJREUsIHBsZWFzZSBkbyBub3QgbWFrZSBhbnkgbW9kaWZpY2F0aW9ucy4gKi9cclxuaW1wb3J0IEFzc2lzdGFudCBmcm9tIFwiLi9zY3JpcHQvQXNzaXN0YW50XCJcbmltcG9ydCBQYWdlU2NyaXB0IGZyb20gXCIuL3B1YmxpY1NjcmlwdC9QYWdlU2NyaXB0XCJcbmltcG9ydCBTY3JlZW4gZnJvbSBcIi4vcHVibGljU2NyaXB0L1NjcmVlblwiXG5pbXBvcnQgdHJlbmRMaXN0IGZyb20gXCIuL3RlbXBsYXRlL3RyZW5kTGlzdFwiXG5pbXBvcnQgQ2FyZCBmcm9tIFwiLi9zY3JpcHQvQ2FyZFwiXG5pbXBvcnQgZ3JhbmRQcml4IGZyb20gXCIuL3NjcmlwdC9ncmFuZFByaXhcIlxuaW1wb3J0IFBhZ2VOYXZTY3JpcHQgZnJvbSBcIi4vcHVibGljU2NyaXB0L1BhZ2VOYXZTY3JpcHRcIlxuaW1wb3J0IHByaXhMaXN0IGZyb20gXCIuL3RlbXBsYXRlL3ByaXhMaXN0XCJcbmltcG9ydCBHdWVzc2luZyBmcm9tIFwiLi9zY3JpcHQvR3Vlc3NpbmdcIlxuaW1wb3J0IG51bWJlckxpc3REb21TY3JpcHQgZnJvbSBcIi4vdGVtcGxhdGUvbnVtYmVyTGlzdERvbVNjcmlwdFwiXG5pbXBvcnQgSG9tZSBmcm9tIFwiLi9zY3JpcHQvSG9tZVwiXG5pbXBvcnQgcHJpSGlzdG9yeVNjZW5lIGZyb20gXCIuL3NjcmlwdC9wcmlIaXN0b3J5U2NlbmVcIlxuaW1wb3J0IHByaUhpc3RvcnkgZnJvbSBcIi4vdGVtcGxhdGUvcHJpSGlzdG9yeVwiXG5pbXBvcnQgUmVjb3JkIGZyb20gXCIuL3NjcmlwdC9SZWNvcmRcIlxuaW1wb3J0IGpvaW5SZWNvcmRzIGZyb20gXCIuL3RlbXBsYXRlL2pvaW5SZWNvcmRzXCJcbmltcG9ydCBwcmV2aW91c1JlY29yZHMgZnJvbSBcIi4vdGVtcGxhdGUvcHJldmlvdXNSZWNvcmRzXCJcbmltcG9ydCBzaG9ydExpc3RlZCBmcm9tIFwiLi9zY3JpcHQvc2hvcnRMaXN0ZWRcIlxuaW1wb3J0IHNob3J0TGlzdGVkTGlzdCBmcm9tIFwiLi90ZW1wbGF0ZS9zaG9ydExpc3RlZExpc3RcIlxuaW1wb3J0IHBzd0lucHV0IGZyb20gXCIuL3RlbXBsYXRlL3Bzd0lucHV0XCJcbmltcG9ydCByYW5raW5nTGlzdCBmcm9tIFwiLi90ZW1wbGF0ZS9yYW5raW5nTGlzdFwiXG5pbXBvcnQgcmVjaGFyZ2VEaWFsb2cgZnJvbSBcIi4vdGVtcGxhdGUvcmVjaGFyZ2VEaWFsb2dcIlxuaW1wb3J0IHJvY2tldERpYWxvZyBmcm9tIFwiLi92aWV3L3JvY2tldERpYWxvZ1wiXG5pbXBvcnQgdGlwRGlhbG9nIGZyb20gXCIuL3RlbXBsYXRlL3RpcERpYWxvZ1wiXG5pbXBvcnQgd2lubmluZ0xpc3QgZnJvbSBcIi4vdGVtcGxhdGUvd2lubmluZ0xpc3RcIlxuaW1wb3J0IHdpbm5pbmcgZnJvbSBcIi4vc2NyaXB0L3dpbm5pbmdcIlxyXG4vKlxyXG4qIOa4uOaIj+WIneWni+WMlumFjee9rjtcclxuKi9cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgR2FtZUNvbmZpZ3tcclxuICAgIHN0YXRpYyB3aWR0aDpudW1iZXI9NzUwO1xyXG4gICAgc3RhdGljIGhlaWdodDpudW1iZXI9MTMzNDtcclxuICAgIHN0YXRpYyBzY2FsZU1vZGU6c3RyaW5nPVwiZml4ZWR3aWR0aFwiO1xyXG4gICAgc3RhdGljIHNjcmVlbk1vZGU6c3RyaW5nPVwibm9uZVwiO1xyXG4gICAgc3RhdGljIGFsaWduVjpzdHJpbmc9XCJ0b3BcIjtcclxuICAgIHN0YXRpYyBhbGlnbkg6c3RyaW5nPVwibGVmdFwiO1xyXG4gICAgc3RhdGljIHN0YXJ0U2NlbmU6YW55PVwiaG9tZS5zY2VuZVwiO1xyXG4gICAgc3RhdGljIHNjZW5lUm9vdDpzdHJpbmc9XCJcIjtcclxuICAgIHN0YXRpYyBkZWJ1Zzpib29sZWFuPWZhbHNlO1xyXG4gICAgc3RhdGljIHN0YXQ6Ym9vbGVhbj1mYWxzZTtcclxuICAgIHN0YXRpYyBwaHlzaWNzRGVidWc6Ym9vbGVhbj1mYWxzZTtcclxuICAgIHN0YXRpYyBleHBvcnRTY2VuZVRvSnNvbjpib29sZWFuPXRydWU7XHJcbiAgICBjb25zdHJ1Y3Rvcigpe31cclxuICAgIHN0YXRpYyBpbml0KCl7XHJcbiAgICAgICAgdmFyIHJlZzogRnVuY3Rpb24gPSBMYXlhLkNsYXNzVXRpbHMucmVnQ2xhc3M7XHJcbiAgICAgICAgcmVnKFwic2NyaXB0L0Fzc2lzdGFudC50c1wiLEFzc2lzdGFudCk7XG4gICAgICAgIHJlZyhcInB1YmxpY1NjcmlwdC9QYWdlU2NyaXB0LnRzXCIsUGFnZVNjcmlwdCk7XG4gICAgICAgIHJlZyhcInB1YmxpY1NjcmlwdC9TY3JlZW4udHNcIixTY3JlZW4pO1xuICAgICAgICByZWcoXCJ0ZW1wbGF0ZS90cmVuZExpc3QudHNcIix0cmVuZExpc3QpO1xuICAgICAgICByZWcoXCJzY3JpcHQvQ2FyZC50c1wiLENhcmQpO1xuICAgICAgICByZWcoXCJzY3JpcHQvZ3JhbmRQcml4LnRzXCIsZ3JhbmRQcml4KTtcbiAgICAgICAgcmVnKFwicHVibGljU2NyaXB0L1BhZ2VOYXZTY3JpcHQudHNcIixQYWdlTmF2U2NyaXB0KTtcbiAgICAgICAgcmVnKFwidGVtcGxhdGUvcHJpeExpc3QudHNcIixwcml4TGlzdCk7XG4gICAgICAgIHJlZyhcInNjcmlwdC9HdWVzc2luZy50c1wiLEd1ZXNzaW5nKTtcbiAgICAgICAgcmVnKFwidGVtcGxhdGUvbnVtYmVyTGlzdERvbVNjcmlwdC50c1wiLG51bWJlckxpc3REb21TY3JpcHQpO1xuICAgICAgICByZWcoXCJzY3JpcHQvSG9tZS50c1wiLEhvbWUpO1xuICAgICAgICByZWcoXCJzY3JpcHQvcHJpSGlzdG9yeVNjZW5lLnRzXCIscHJpSGlzdG9yeVNjZW5lKTtcbiAgICAgICAgcmVnKFwidGVtcGxhdGUvcHJpSGlzdG9yeS50c1wiLHByaUhpc3RvcnkpO1xuICAgICAgICByZWcoXCJzY3JpcHQvUmVjb3JkLnRzXCIsUmVjb3JkKTtcbiAgICAgICAgcmVnKFwidGVtcGxhdGUvam9pblJlY29yZHMudHNcIixqb2luUmVjb3Jkcyk7XG4gICAgICAgIHJlZyhcInRlbXBsYXRlL3ByZXZpb3VzUmVjb3Jkcy50c1wiLHByZXZpb3VzUmVjb3Jkcyk7XG4gICAgICAgIHJlZyhcInNjcmlwdC9zaG9ydExpc3RlZC50c1wiLHNob3J0TGlzdGVkKTtcbiAgICAgICAgcmVnKFwidGVtcGxhdGUvc2hvcnRMaXN0ZWRMaXN0LnRzXCIsc2hvcnRMaXN0ZWRMaXN0KTtcbiAgICAgICAgcmVnKFwidGVtcGxhdGUvcHN3SW5wdXQudHNcIixwc3dJbnB1dCk7XG4gICAgICAgIHJlZyhcInRlbXBsYXRlL3JhbmtpbmdMaXN0LnRzXCIscmFua2luZ0xpc3QpO1xuICAgICAgICByZWcoXCJ0ZW1wbGF0ZS9yZWNoYXJnZURpYWxvZy50c1wiLHJlY2hhcmdlRGlhbG9nKTtcbiAgICAgICAgcmVnKFwidmlldy9yb2NrZXREaWFsb2cudHNcIixyb2NrZXREaWFsb2cpO1xuICAgICAgICByZWcoXCJ0ZW1wbGF0ZS90aXBEaWFsb2cudHNcIix0aXBEaWFsb2cpO1xuICAgICAgICByZWcoXCJ0ZW1wbGF0ZS93aW5uaW5nTGlzdC50c1wiLHdpbm5pbmdMaXN0KTtcbiAgICAgICAgcmVnKFwic2NyaXB0L3dpbm5pbmcudHNcIix3aW5uaW5nKTtcclxuICAgIH1cclxufVxyXG5HYW1lQ29uZmlnLmluaXQoKTsiLCJpbXBvcnQgR2FtZUNvbmZpZyBmcm9tIFwiLi9HYW1lQ29uZmlnXCI7XHJcbmltcG9ydCBSb2NrZXREaWFsb2cgZnJvbSBcIi4vdmlldy9yb2NrZXREaWFsb2dcIjtcclxuaW1wb3J0IHsgbG9hZGluZ1Jlc0xpc3QgLCBsb2FkaW5nUmVzTGlzdDEgfSBmcm9tICcuL2xvYWRpbmdSZXNMaXN0J1xyXG5pbXBvcnQgeyBTb2NrZXQgfSBmcm9tIFwiLi9qcy9zb2NrZXRcIjtcclxuXHJcbmNsYXNzIE1haW4ge1xyXG5cdGNvbnN0cnVjdG9yKCkge1xyXG5cdFx0Ly/moLnmja5JREXorr7nva7liJ3lp4vljJblvJXmk45cdFx0XHJcblx0XHRpZiAod2luZG93W1wiTGF5YTNEXCJdKSBMYXlhM0QuaW5pdChHYW1lQ29uZmlnLndpZHRoLCBHYW1lQ29uZmlnLmhlaWdodCk7XHJcblx0XHRlbHNlIExheWEuaW5pdChHYW1lQ29uZmlnLndpZHRoLCBHYW1lQ29uZmlnLmhlaWdodCwgTGF5YVtcIldlYkdMXCJdKTtcclxuXHRcdExheWFbXCJQaHlzaWNzXCJdICYmIExheWFbXCJQaHlzaWNzXCJdLmVuYWJsZSgpO1xyXG5cdFx0TGF5YVtcIkRlYnVnUGFuZWxcIl0gJiYgTGF5YVtcIkRlYnVnUGFuZWxcIl0uZW5hYmxlKCk7XHJcblx0XHRMYXlhLnN0YWdlLnNjYWxlTW9kZSA9IEdhbWVDb25maWcuc2NhbGVNb2RlO1xyXG5cdFx0TGF5YS5zdGFnZS5zY3JlZW5Nb2RlID0gR2FtZUNvbmZpZy5zY3JlZW5Nb2RlO1xyXG5cdFx0Ly/lhbzlrrnlvq7kv6HkuI3mlK/mjIHliqDovb1zY2VuZeWQjue8gOWcuuaZr1xyXG5cdFx0TGF5YS5VUkwuZXhwb3J0U2NlbmVUb0pzb24gPSBHYW1lQ29uZmlnLmV4cG9ydFNjZW5lVG9Kc29uO1xyXG5cclxuXHRcdC8v5omT5byA6LCD6K+V6Z2i5p2/77yI6YCa6L+HSURF6K6+572u6LCD6K+V5qih5byP77yM5oiW6ICFdXJs5Zyw5Z2A5aKe5YqgZGVidWc9dHJ1ZeWPguaVsO+8jOWdh+WPr+aJk+W8gOiwg+ivlemdouadv++8iVxyXG5cdFx0aWYgKEdhbWVDb25maWcuZGVidWcgfHwgTGF5YS5VdGlscy5nZXRRdWVyeVN0cmluZyhcImRlYnVnXCIpID09IFwidHJ1ZVwiKSBMYXlhLmVuYWJsZURlYnVnUGFuZWwoKTtcclxuXHRcdGlmIChHYW1lQ29uZmlnLnBoeXNpY3NEZWJ1ZyAmJiBMYXlhW1wiUGh5c2ljc0RlYnVnRHJhd1wiXSkgTGF5YVtcIlBoeXNpY3NEZWJ1Z0RyYXdcIl0uZW5hYmxlKCk7XHJcblx0XHRpZiAoR2FtZUNvbmZpZy5zdGF0KSBMYXlhLlN0YXQuc2hvdygpO1xyXG5cdFx0TGF5YS5hbGVydEdsb2JhbEVycm9yID0gdHJ1ZTtcclxuXHJcblx0XHQvL+iHquWumuS5ieS6i+S7tlxyXG5cdFx0Um9ja2V0RGlhbG9nLmluaXQoKTsgLy/ngavnrq3lvIDlpZbmlYjmnpxcclxuXHJcblx0XHQvL+a/gOa0u+i1hOa6kOeJiOacrOaOp+WItu+8jHZlcnNpb24uanNvbueUsUlEReWPkeW4g+WKn+iDveiHquWKqOeUn+aIkO+8jOWmguaenOayoeacieS5n+S4jeW9seWTjeWQjue7rea1geeoi1xyXG5cdFx0TGF5YS5SZXNvdXJjZVZlcnNpb24uZW5hYmxlKFwidmVyc2lvbi5qc29uXCIsIExheWEuSGFuZGxlci5jcmVhdGUodGhpcywgdGhpcy5vblZlcnNpb25Mb2FkZWQpLCBMYXlhLlJlc291cmNlVmVyc2lvbi5GSUxFTkFNRV9WRVJTSU9OKTtcclxuXHR9XHJcblxyXG5cdG9uVmVyc2lvbkxvYWRlZCgpOiB2b2lkIHtcclxuXHRcdC8v5r+A5rS75aSn5bCP5Zu+5pig5bCE77yM5Yqg6L295bCP5Zu+55qE5pe25YCZ77yM5aaC5p6c5Y+R546w5bCP5Zu+5Zyo5aSn5Zu+5ZCI6ZuG6YeM6Z2i77yM5YiZ5LyY5YWI5Yqg6L295aSn5Zu+5ZCI6ZuG77yM6ICM5LiN5piv5bCP5Zu+XHJcblx0XHRMYXlhLkF0bGFzSW5mb01hbmFnZXIuZW5hYmxlKFwiZmlsZWNvbmZpZy5qc29uXCIsIExheWEuSGFuZGxlci5jcmVhdGUodGhpcywgdGhpcy5vbkNvbmZpZ0xvYWRlZCkpO1xyXG5cdH1cclxuXHJcblx0b25Db25maWdMb2FkZWQoKTogdm9pZCB7XHJcblx0XHQvLyDov57mjqV3ZWJzb2NrZXRcclxuXHRcdFNvY2tldC5jcmVhdGVTb2NrZXQoKVxyXG5cdFx0Ly/pooTliqDovb1cclxuwqDCoMKgwqDCoMKgwqDCoExheWEubG9hZGVyLmxvYWQobG9hZGluZ1Jlc0xpc3QsIExheWEuSGFuZGxlci5jcmVhdGUodGhpcywgdGhpcy5vbkdhbWVSZXNMb2FkZWQpLExheWEuSGFuZGxlci5jcmVhdGUodGhpcywocHJvZ3Jlc3M6bnVtYmVyKT0+e1xyXG5cdFx0XHRjb25zb2xlLmxvZyhwcm9ncmVzcyk7XHJcblx0XHR9KSk7XHJcblx0fVxyXG5cdG9uR2FtZVJlc0xvYWRlZCgpOnZvaWQge1xyXG5cdFx0Ly/liqDovb1JREXmjIflrprnmoTlnLrmma9cclxuXHRcdEdhbWVDb25maWcuc3RhcnRTY2VuZSAmJiBMYXlhLlNjZW5lLm9wZW4oR2FtZUNvbmZpZy5zdGFydFNjZW5lLHRydWUsbnVsbCxMYXlhLkhhbmRsZXIuY3JlYXRlKHRoaXMsKCgpPT57XHJcblx0XHRcdExheWEubG9hZGVyLmxvYWQobG9hZGluZ1Jlc0xpc3QxKTtcclxuXHRcdH0pKSk7XHJcblx0fVxyXG59XHJcbi8v5r+A5rS75ZCv5Yqo57G7XHJcbm5ldyBNYWluKCk7XHJcbiIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0yMCAxNDoxMToyNlxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yMCAxNDoxMToyNlxyXG4gKiBAZGVzYyDmlbDmja7pgJrkv6Hlj4rkv53lrZjmjqXlj6NcclxuICovXHJcblxyXG5leHBvcnQgY2xhc3MgR2FtZU1vZGVsIGV4dGVuZHMgTGF5YS5FdmVudERpc3BhdGNoZXIge1xyXG4gICAgcHJpdmF0ZSBzdGF0aWMgX2dhbWVNb2RlbEluc3RhbmNlOiBHYW1lTW9kZWw7XHJcblxyXG4gICAgc3RhdGljIGdldEluc3RhbmNlKCk6IEdhbWVNb2RlbCB7XHJcbiAgICAgICAgaWYgKCF0aGlzLl9nYW1lTW9kZWxJbnN0YW5jZSkge1xyXG4gICAgICAgICAgICB0aGlzLl9nYW1lTW9kZWxJbnN0YW5jZSA9IG5ldyBHYW1lTW9kZWwoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2dhbWVNb2RlbEluc3RhbmNlO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKuS/neWtmOeUqOaIt+S/oeaBryAqL1xyXG4gICAgdXNlckluZm86b2JqZWN0ID0ge307IC8v55So5oi35L+h5oGvXHJcbiAgICBzZXRVc2VySW5mbyh1c2VySW5mbzpvYmplY3Qpe1xyXG4gICAgICAgIHRoaXMudXNlckluZm8gPSB1c2VySW5mbztcclxuICAgICAgICB0aGlzLmV2ZW50KCdnZXRVc2VySW5mbycsdGhpcy51c2VySW5mbylcclxuICAgIH1cclxuXHJcbiAgICAvKirkv53lrZjooqvotK3kubDlj7fnoIEgKi9cclxuICAgIGJ1eUdvb2RzQXJyOmFueSA9IFtdOyAvL+iiq+i0reS5sOWPt+eggVxyXG4gICAgc2V0R29vZHNBcnIoZ29vZHNBcnI6YW55KSB7XHJcbiAgICAgICAgdGhpcy5idXlHb29kc0FyciA9IGdvb2RzQXJyO1xyXG4gICAgICAgIHRoaXMuZXZlbnQoJ2dldGJ1eUdvb2RzQXJyJyxbdGhpcy5idXlHb29kc0Fycl0pXHJcbiAgICB9XHJcblxyXG4gICAgLyoq5L+d5a2Y54Gr566t5pWw5o2uICovXHJcbiAgICByb2NrZXREYXRhOk9iamVjdCA9IHt9O1xyXG4gICAgc2V0Um9ja2V0RGF0YShkYXRhOm9iamVjdCl7XHJcbiAgICAgICAgdGhpcy5yb2NrZXREYXRhID0gZGF0YTtcclxuICAgICAgICB0aGlzLmV2ZW50KCdnZXRSb2NrZXREYXRhJyx0aGlzLnJvY2tldERhdGEpXHJcbiAgICB9XHJcblxyXG4gICAgLyoq5piv5ZCm5byA5aWW5LqGICovXHJcbiAgICBpc1RvZ2dsZShzdGF0dXM6Ym9vbGVhbil7XHJcbiAgICAgICAgdGhpcy5ldmVudCgnaXNUb2dnbGUnLHN0YXR1cylcclxuICAgIH1cclxuXHJcbiAgICAvKirpgJrnn6XkuK3lpZYgKi9cclxuICAgIG5vdGljZUZ1bmMoc3RhdHVzOmJvb2xlYW4pe1xyXG4gICAgICAgIHRoaXMuZXZlbnQoJ2dldE5vdGljZScsc3RhdHVzKVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvKirngavnrq3lpKflpZbmjpLooYzlkI3ljZUgKi9cclxuICAgIHJvY2tldFJhbmtpbmc6b2JqZWN0W10gPSBbXTtcclxuICAgIHNldFJvY2tldFJhbmtpbmcoZGF0YTpvYmplY3RbXSl7XHJcbiAgICAgICAgdGhpcy5yb2NrZXRSYW5raW5nID0gZGF0YTtcclxuICAgICAgICB0aGlzLmV2ZW50KCdnZXRSb2NrZXRSYW5raW5nJyx0aGlzLnJvY2tldFJhbmtpbmcpXHJcbiAgICB9XHJcbn0iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjAgMTU6MTU6MDhcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjAgMTU6MTU6MDhcclxuICogQGRlc2MgYXBp5o6l5Y+j57uf5LiA5bCB6KOF5aSE55CGXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgZ2V0LCBwb3N0IH0gZnJvbSAnLi9odHRwJztcclxuaW1wb3J0IHsgR2FtZU1vZGVsIH0gZnJvbSAnLi9HYW1lTW9kZWwnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQge1xyXG4gICAgLyoq6I635Y+W55So5oi35L+h5oGvICovXHJcbiAgICBnZXRVc2VySW5mbygpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBnZXQoJy91c2VyL2dldEluZm8nLCB7fSkudGhlbigocmVzOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICghcmVzLmNvZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyDkv53lrZjnlKjmiLfkv6Hmga9cclxuICAgICAgICAgICAgICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5zZXRVc2VySW5mbyhyZXMudXNlckluZm8pXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXMpXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLnNldFVzZXJJbmZvKHt9KVxyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXMpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgIH0sXHJcblxyXG4gICAgLyoq6I635Y+W5LuK5pel5aSn5aWW5rGgICovXHJcbiAgICBnZXRSYW5rVG9kYXkoKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgZ2V0KCcvcmFuay90b2RheScsIHt9KS50aGVuKChyZXM6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9LFxyXG4gICAgLyoq6I635Y+W5aSn5aWW5rGg5Y6G5Y+y6K6w5b2VXHJcbiAgICAgKiBAcGFyYW0gY291bnRUaW1lIFvpgInloatdIOaXpeacn1xyXG4gICAgICovXHJcbiAgICBnZXRSYW5rSGlzdG9yeShjb3VudFRpbWU/OnN0cmluZyl7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgZ2V0KCcvcmFuay9oaXN0b3J5Jywge2NvdW50VGltZX0pLnRoZW4oKHJlczogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXJlcy5jb2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXMpXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXMpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgIH0sXHJcbiAgICAvKirojrflj5bpppbpobXllYblk4HliJfooaggKi9cclxuICAgIGdldEdvb2RzTGlzdCgpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBnZXQoJy9nb29kcy9pbmRleCcsIHt9KS50aGVuKChyZXM6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9LFxyXG5cclxuICAgIC8qKuiOt+WPluWVhuWTgeivpuaDhVxyXG4gICAgICogQHBhcmFtIGdvb2RzSWQg5ZWG5ZOBaWRcclxuICAgICAqL1xyXG4gICAgZ2V0R29vZHNEZXRhaWxzKGdvb2RzSWQ6c3RyaW5nKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGdldCgnL2dvb2RzL2dldCcsIHsgZ29vZHNJZCB9KS50aGVuKChyZXM6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9LFxyXG5cclxuICAgIC8qKuiOt+WPluWPguS4juiusOW9lVxyXG4gICAgICogQHBhcmFtIHBhZ2UgW+mAieWhq10g6aG156CBMVxyXG4gICAgICogQHBhcmFtIHBhZ2VTaXplICBb6YCJ5aGrXSDliIbpobXmlbAg6buY6K6kMjBcclxuICAgICAqL1xyXG4gICAgZ2V0TXlPcmRlcnMocGFnZTpudW1iZXIgPSAxLHBhZ2VTaXplOm51bWJlciA9IDIwKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGdldCgnL29yZGVyL215T3JkZXJzJyx7cGFnZSxwYWdlU2l6ZX0pLnRoZW4oKHJlczphbnkpPT57XHJcbiAgICAgICAgICAgICAgICBpZiAoIXJlcy5jb2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXMpXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXMpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgIH0sXHJcbiAgICBcclxuICAgIC8qKuiOt+WPluW+gOacn+iusOW9lVxyXG4gICAgICogQHBhcmFtIHBhZ2UgW+mAieWhq10g6aG156CBMVxyXG4gICAgICogQHBhcmFtIHBhZ2VTaXplICBb6YCJ5aGrXSDliIbpobXmlbAg6buY6K6kMjBcclxuICAgICAqIEBwYXJhbSBjb3VudFRpbWUgW+mAieWhq10g5p+l6K+i5pe26Ze0XHJcbiAgICAgKiBAcGFyYW0gc2VhcmNoS2V5IFvpgInloatdIOafpeivouacn+WPt1xyXG4gICAgICovXHJcbiAgICBnZXRHb29kc0hpc3RvcnkocGFnZTpudW1iZXIgPSAxLHBhZ2VTaXplOm51bWJlciA9IDIwLGNvdW50VGltZT86c3RyaW5nLHNlYXJjaEtleT86c3RyaW5nKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGdldCgnL2dvb2RzL2hpc3RvcnknLHtwYWdlLHBhZ2VTaXplLGNvdW50VGltZSxzZWFyY2hLZXl9KS50aGVuKChyZXM6YW55KT0+e1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9LFxyXG5cclxuICAgIC8qKuiOt+WPluWVhuWTgeexu+WeiyAqL1xyXG4gICAgZ2V0R29vZHNDYXRlTGlzdCgpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XHJcbiAgICAgICAgICAgIGdldCgnL2dvb2RzL2NhdGVMaXN0Jyx7fSkudGhlbigocmVzOmFueSk9PntcclxuICAgICAgICAgICAgICAgIGlmICghcmVzLmNvZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlcylcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlcylcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9KVxyXG4gICAgfSxcclxuXHJcbiAgICAvKirojrflj5botbDlir9cclxuICAgICAqIEBwYXJhbSBnb29kc1R5cGUg5ZWG5ZOB57G75Z6LXHJcbiAgICAgKiBAcGFyYW0gcGFnZSBb6YCJ5aGrXSDpobXnoIExXHJcbiAgICAgKiBAcGFyYW0gcGFnZVNpemUgW+mAieWhq10g5YiG6aG15pWwIOm7mOiupDIwXHJcbiAgICAgKi9cclxuICAgIGdldEdvb2RzVHJlbmQoZ29vZHNUeXBlOnN0cmluZyxwYWdlOm51bWJlciA9IDEscGFnZVNpemU6bnVtYmVyID0gMjApe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XHJcbiAgICAgICAgICAgIGdldCgnL2dvb2RzL3RyZW5kJyx7Z29vZHNUeXBlLHBhZ2UscGFnZVNpemV9KS50aGVuKChyZXM6YW55KT0+e1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9LFxyXG5cclxuICAgIC8qKuiOt+WPluWWnOS7juWkqemZjeS4reWlluWQjeWNlVxyXG4gICAgICogQHBhcmFtIHBhZ2UgW+mAieWhq10g6aG156CBMVxyXG4gICAgICogQHBhcmFtIHBhZ2VTaXplICBb6YCJ5aGrXSDliIbpobXmlbAg6buY6K6kMjBcclxuICAgICAqL1xyXG4gICAgZ2V0WGN0akxpc3QocGFnZTpudW1iZXIgPSAxLHBhZ2VTaXplOm51bWJlciA9IDIwKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGdldCgnL1hjdGovYm9udXNMaXN0cycse3BhZ2UscGFnZVNpemV9KS50aGVuKChyZXM6YW55KT0+e1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9LFxyXG4gICAgXHJcbiAgICAvKirojrflj5blhaXlm7TlkI3ljZVcclxuICAgICAqIEBwYXJhbSBwYWdlIFvpgInloatdIOmhteeggTFcclxuICAgICAqIEBwYXJhbSBwYWdlU2l6ZSAgW+mAieWhq10g5YiG6aG15pWwIOm7mOiupDIwXHJcbiAgICAgKiBAcGFyYW0gZGF0ZSBb6YCJ5aGrXSDml7bpl7RcclxuICAgICAqL1xyXG4gICAgZ2V0U2hvcnRMaXN0ZWQocGFnZTpudW1iZXIgPSAxLHBhZ2VTaXplOm51bWJlciA9IDIwLGRhdGU/OnN0cmluZyl7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBnZXQoJy9YY3RqL3Nob3J0TGlzdGVkJyx7cGFnZSxwYWdlU2l6ZSxkYXRlfSkudGhlbigocmVzOmFueSk9PntcclxuICAgICAgICAgICAgICAgIGlmICghcmVzLmNvZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlcylcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlcylcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9KVxyXG4gICAgfSxcclxuXHJcbiAgICAvKirotK3kubBcclxuICAgICAqIEBwYXJhbSBwZXJpb2Qg5pyf5Y+3XHJcbiAgICAgKiBAcGFyYW0gY29kZUxpc3Qg5omA6YCJ5Y+356CBXHJcbiAgICAgKiBAcGFyYW0gZXhjaGFuZ2VQd2Qg5Lqk5piT5a+G56CBXHJcbiAgICAgKi9cclxuICAgIHBvc3RUcmFkZUJ1eShwZXJpb2Q6c3RyaW5nLGNvZGVMaXN0OnN0cmluZyxleGNoYW5nZVB3ZDpzdHJpbmcpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpID0+IHtcclxuICAgICAgICAgICAgcG9zdCgnL3RyYWRlL2J1eScsIHsgcGVyaW9kLGNvZGVMaXN0LGV4Y2hhbmdlUHdkIH0pLnRoZW4oKHJlczogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXJlcy5jb2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5nZXRVc2VySW5mbygpXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXMpXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXMpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgIH0sXHJcbn0iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDU6MDZcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDU6MDZcclxuICogQGRlc2MgYXhpb3PnvZHnu5zor7fmsYLlsIHoo4VcclxuICovXHJcbmltcG9ydCBheGlvcyBmcm9tIFwiYXhpb3NcIjtcclxuXHJcbmF4aW9zLmRlZmF1bHRzLnRpbWVvdXQgPSAxMDAwMDtcclxuYXhpb3MuZGVmYXVsdHMuaGVhZGVycy5wb3N0WydDb250ZW50LVR5cGUnXSA9ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnO1xyXG5heGlvcy5kZWZhdWx0cy53aXRoQ3JlZGVudGlhbHMgPSB0cnVlOyAgLy/or7fmsYLmkLrluKZjb29raWVcclxuLy8gYXhpb3MuZGVmYXVsdHMuY3Jvc3NEb21haW4gPSB0cnVlOyAgLy/or7fmsYLmkLrluKbpop3lpJbmlbDmja4o5LiN5YyF5ZCrY29va2llKVxyXG5cclxuY29uc3QgZG9tYWluID0gZG9jdW1lbnQuZG9tYWluO1xyXG5pZiAoZG9tYWluLmluZGV4T2YoJ3QtY2VudGVyJykgPj0gMCB8fCBkb21haW4gPT09ICdsb2NhbGhvc3QnKSB7XHJcbiAgYXhpb3MuZGVmYXVsdHMuYmFzZVVSTCA9ICdodHRwczovL3QtYXBpLnh5aGouaW8vdjEvdy96aC8nXHJcbiAgLy8gYXhpb3MuZGVmYXVsdHMuYmFzZVVSTCA9ICdodHRwczovL2dhbWUueHloai5pby92MS93L3poJ1xyXG59IGVsc2Uge1xyXG4gIGF4aW9zLmRlZmF1bHRzLmJhc2VVUkwgPSAnaHR0cHM6Ly9nYW1lLnh5aGouaW8vdjEvdy96aCdcclxufVxyXG5cclxuLyoq5bCGcG9zdOaVsOaNrui9rOS4umZvcm1EYXRh5qC85byPICovXHJcbmZ1bmN0aW9uIGZvcm1EYXRhRnVuYyhwYXJhbXM6T2JqZWN0KSB7XHJcbiAgY29uc3QgZm9ybSA9IG5ldyBGb3JtRGF0YSgpO1xyXG4gIGZvciAoY29uc3Qga2V5IGluIHBhcmFtcykge1xyXG4gICAgZm9ybS5hcHBlbmQoa2V5LHBhcmFtc1trZXldKTtcclxuICB9XHJcbiAgcmV0dXJuIGZvcm1cclxufVxyXG5cclxuLyoq5ri45oiP5bmz5Y+w5o6l5Y+jICovXHJcbmNvbnN0IGdhbWVDZW50ZXIgPSBbJy91c2VyL2xvZ2luJywnL3VzZXIvZ2V0SW5mbyddXHJcblxyXG4vL2h0dHAgcmVxdWVzdCDmi6bmiKrlmahcclxuYXhpb3MuaW50ZXJjZXB0b3JzLnJlcXVlc3QudXNlKFxyXG4gIGNvbmZpZyA9PiB7XHJcbiAgICAvL+iuvue9rkFIb3N0XHJcbiAgICBpZiAoY29uZmlnLnVybC5pbmRleE9mKCcvdXNlci8nKSA+PSAwICkge1xyXG4gICAgICBjb25maWcuaGVhZGVyc1snQUhvc3QnXSA9ICdnYW1lQ2VudGVyJ1xyXG4gICAgfWVsc2V7XHJcbiAgICAgIGNvbmZpZy5oZWFkZXJzWydBSG9zdCddID0gJ3N0YXJSb2NrZXQnO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChjb25maWcubWV0aG9kID09ICdwb3N0Jykge1xyXG4gICAgICBjb25maWcuZGF0YSA9IGZvcm1EYXRhRnVuYyh7XHJcbiAgICAgICAgLi4uY29uZmlnLmRhdGFcclxuICAgICAgfSlcclxuICAgIH1lbHNlIGlmKGNvbmZpZy5tZXRob2QgPT0gJ2dldCcpe1xyXG4gICAgICBjb25maWcucGFyYW1zID0ge1xyXG4gICAgICAgIC4uLmNvbmZpZy5wYXJhbXMsXHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBjb25maWc7XHJcbiAgfSxcclxuICBlcnJvciA9PiB7XHJcbiAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZXJyb3IpO1xyXG4gIH1cclxuKTtcclxuLy9odHRwIHJlc3BvbnNlIOaLpuaIquWZqFxyXG5heGlvcy5pbnRlcmNlcHRvcnMucmVzcG9uc2UudXNlKFxyXG4gIHJlc3BvbnNlID0+IHtcclxuICAgIGlmICghcmVzcG9uc2UuZGF0YS5zdWNjZXNzKSB7XHJcbiAgICAgIC8v6ZSZ6K+v5aSE55CGXHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmVzcG9uc2U7XHJcbiAgfSxcclxuICBlcnJvciA9PiB7XHJcbiAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZXJyb3IpO1xyXG4gIH1cclxuKTtcclxuXHJcbi8qKlxyXG4gKiDlsIHoo4VnZXTmlrnms5VcclxuICogQHBhcmFtIHVybFxyXG4gKiBAcGFyYW0gZGF0YVxyXG4gKiBAcmV0dXJucyB7UHJvbWlzZX1cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXQodXJsOnN0cmluZywgcGFyYW1zOk9iamVjdCkge1xyXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICBheGlvcy5nZXQodXJsLCB7IHBhcmFtcyB9KS50aGVuKHJlc3BvbnNlID0+IHtcclxuICAgICAgaWYgKCFyZXNwb25zZS5kYXRhLnN1Y2Nlc3MpIHtcclxuICAgICAgICByZXNvbHZlKHJlc3BvbnNlLmRhdGEuZXJyb3IpO1xyXG4gICAgICB9ZWxzZSB7XHJcbiAgICAgICAgcmVzb2x2ZShyZXNwb25zZS5kYXRhLnBheWxvYWQpO1xyXG4gICAgICB9XHJcbiAgICB9KS5jYXRjaChlcnIgPT4ge1xyXG4gICAgICByZWplY3QoZXJyKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG59XHJcblxyXG4vKipcclxuICog5bCB6KOFcG9zdOivt+axglxyXG4gKiBAcGFyYW0gdXJsXHJcbiAqIEBwYXJhbSBkYXRhXHJcbiAqIEByZXR1cm5zIHtQcm9taXNlfVxyXG4gKi9cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBwb3N0KHVybDpzdHJpbmcsIGRhdGE6T2JqZWN0KSB7XHJcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgIGF4aW9zLnBvc3QodXJsLCBkYXRhKS50aGVuKFxyXG4gICAgICByZXNwb25zZSA9PiB7XHJcbiAgICAgICAgaWYgKCFyZXNwb25zZS5kYXRhLnN1Y2Nlc3MpIHtcclxuICAgICAgICAgIHJlc29sdmUocmVzcG9uc2UuZGF0YS5lcnJvcik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHJlc29sdmUocmVzcG9uc2UuZGF0YS5wYXlsb2FkKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIGVyciA9PiB7XHJcbiAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgIH1cclxuICAgICk7XHJcbiAgfSk7XHJcbn1cclxuIiwiaW1wb3J0IHsgR2FtZU1vZGVsIH0gZnJvbSBcIi4vR2FtZU1vZGVsXCI7XHJcbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xyXG5cclxuXHJcbi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0yMSAxMTo0NjoxNVxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yMSAxMTo0NjoxNVxyXG4gKiBAZGVzYyB3ZWJzb2NrZXTov57mjqVcclxuICovXHJcblxyXG4vL3tcImFwcElkXCI6XCJsdWNreXJvY2tldFwiLFwiZXZlbnRcIjpbe1widG9nZ2xlXCI6MCxcInR5cGVcIjpcInR5cGVfdmFsdWVcIixcImV4cGlyZVRpbWVcIjowfV19XHJcblxyXG5leHBvcnQgY2xhc3MgU29ja2V0IGV4dGVuZHMgTGF5YS5VSUNvbXBvbmVudCB7XHJcbiAgICBcclxuICAgIHN0YXRpYyBXU19VUkw6IHN0cmluZyA9IGB3c3M6Ly90LXdzcy54eWhqLmlvL3dzP2FwcGlkPWx1Y2t5cm9ja2V0QXBwYFxyXG4gICAgc3RhdGljIFdTOiBhbnkgPSAnJztcclxuICAgIC8qKjMw56eS5LiA5qyh5b+D6LezICovXHJcbiAgICBzdGF0aWMgc2V0SW50ZXJ2YWxXZXNvY2tldFB1c2g6YW55ID0gbnVsbDsgXHJcblxyXG4gICAgLyoq5bu656uL6L+e5o6lICovXHJcbiAgICBzdGF0aWMgY3JlYXRlU29ja2V0KCkge1xyXG4gICAgICAgIGNvbnN0IHVzZXJJbmZvOmFueSA9IEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLnVzZXJJbmZvO1xyXG4gICAgICAgIGlmICh1c2VySW5mby51c2VySWQpIHtcclxuICAgICAgICAgICAgU29ja2V0LldTX1VSTCA9IFNvY2tldC5XU19VUkwgKyBgJnVpZD0ke3VzZXJJbmZvLnVzZXJJZH1gXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghU29ja2V0LldTKSB7XHJcbiAgICAgICAgICAgIC8vIFNvY2tldC5XUy5jbG9zZSgpXHJcbiAgICAgICAgICAgIFNvY2tldC5XUyA9IG5ldyBXZWJTb2NrZXQoU29ja2V0LldTX1VSTClcclxuICAgICAgICAgICAgU29ja2V0LldTLm9ub3BlbiA9IFNvY2tldC5vbm9wZW5XUztcclxuICAgICAgICAgICAgU29ja2V0LldTLm9ubWVzc2FnZSA9IFNvY2tldC5vbm1lc3NhZ2VXUztcclxuICAgICAgICAgICAgU29ja2V0LldTLm9uZXJyb3IgPSBTb2NrZXQub25lcnJvcldTO1xyXG4gICAgICAgICAgICBTb2NrZXQuV1Mub25jbG9zZSA9IFNvY2tldC5vbmNsb3NlV1M7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLyoq5omT5byAV1PkuYvlkI7lj5HpgIHlv4Pot7MgKi9cclxuICAgIHN0YXRpYyBvbm9wZW5XUygpIHtcclxuICAgICAgICBTb2NrZXQuc2VuZFBpbmcoKTsgLy/lj5HpgIHlv4Pot7NcclxuICAgIH1cclxuICAgIC8qKui/nuaOpeWksei0pemHjei/niAqL1xyXG4gICAgc3RhdGljIG9uZXJyb3JXUygpIHtcclxuICAgICAgICBTb2NrZXQuV1MuY2xvc2UoKTtcclxuICAgICAgICBTb2NrZXQuY3JlYXRlU29ja2V0KCk7IC8v6YeN6L+eXHJcbiAgICB9XHJcbiAgICAvKipXU+aVsOaNruaOpeaUtue7n+S4gOWkhOeQhiAqL1xyXG4gICAgc3RhdGljIG9ubWVzc2FnZVdTKGU6IGFueSkge1xyXG4gICAgICAgIGxldCByZWRhdGE6YW55O1xyXG4gICAgICAgIGxldCBwYXlsb2FkOmFueTtcclxuICAgICAgICBpZiAoZS5kYXRhID09PSAnb2snIHx8IGUuZGF0YSA9PT0gJ3BvbmcnKSB7XHJcbiAgICAgICAgICAgIHJlZGF0YSA9IGUuZGF0YTsgLy8g5pWw5o2uXHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIHJlZGF0YSA9IEpTT04ucGFyc2UoZS5kYXRhKTsgLy8g5pWw5o2uXHJcbiAgICAgICAgICAgIHBheWxvYWQgPSByZWRhdGEucGF5bG9hZDtcclxuICAgICAgICAgICAgLy8g5LiL5Y+R6LSt5Lmw5Y+356CBXHJcbiAgICAgICAgICAgIGlmIChwYXlsb2FkLnR5cGUgPT09ICdwdXJjaGFzZWQnKSB7XHJcbiAgICAgICAgICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5zZXRHb29kc0FycihwYXlsb2FkLmdvb2RzKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIOS4i+WPkemmlumhteaVsOaNrlxyXG4gICAgICAgICAgICBpZiAocGF5bG9hZC50eXBlID09PSAnaW5kZXgnKSB7XHJcbiAgICAgICAgICAgICAgICAvLyDliLfmlrDngavnrq3mlbDmja5cclxuICAgICAgICAgICAgICAgIEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLnNldFJvY2tldERhdGEocGF5bG9hZC5yYW5raW5nKVxyXG4gICAgICAgICAgICAgICAgLy8g5piv5ZCm5byA5aWW5LqGXHJcbiAgICAgICAgICAgICAgICBpZiAocGF5bG9hZC50b2dnbGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5pc1RvZ2dsZSh0cnVlKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIOS4i+WPkeS4reWlluWQjeWNlVxyXG4gICAgICAgICAgICBpZiAocGF5bG9hZC50eXBlID09PSAnd2lubmluZycpIHtcclxuICAgICAgICAgICAgICAgIEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLm5vdGljZUZ1bmModHJ1ZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyDkuIvlj5Hngavnrq3lpKflpZbmjpLooYzlkI3ljZVcclxuICAgICAgICAgICAgaWYgKHBheWxvYWQudHlwZSA9PT0gJ3JhbmtpbmcnKSB7XHJcbiAgICAgICAgICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5zZXRSb2NrZXRSYW5raW5nKHBheWxvYWQudXNlckluZm8pXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvKirlj5HpgIHmlbDmja4gKi9cclxuICAgIHN0YXRpYyBzZW5kV1NQdXNoKHR5cGU/OiBhbnksdG9nZ2xlOmFueSA9IDEpIHtcclxuICAgICAgICBsZXQgb2JqID0ge1xyXG4gICAgICAgICAgICBcImFwcElkXCI6IFwibHVja3lyb2NrZXRBcHBcIiwgXHJcbiAgICAgICAgICAgIFwiZXZlbnRcIjogW1xyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIFwidHlwZVwiOiB0eXBlLCBcclxuICAgICAgICAgICAgICAgICAgICBcInRvZ2dsZVwiOiB0b2dnbGUsIFxyXG4gICAgICAgICAgICAgICAgICAgIFwiZXhwaXJlVGltZVwiOiAxODAwXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKFNvY2tldC5XUyAhPT0gbnVsbCAmJiBTb2NrZXQuV1MucmVhZHlTdGF0ZSA9PT0gMykge1xyXG4gICAgICAgICAgICBTb2NrZXQuV1MuY2xvc2UoKTtcclxuICAgICAgICAgICAgU29ja2V0LmNyZWF0ZVNvY2tldCgpOy8v6YeN6L+eXHJcbiAgICAgICAgfSBlbHNlIGlmKFNvY2tldC5XUy5yZWFkeVN0YXRlID09PSAxKSB7XHJcbiAgICAgICAgICAgIFNvY2tldC5XUy5zZW5kKEpTT04uc3RyaW5naWZ5KG9iaikpXHJcbiAgICAgICAgfWVsc2UgaWYoU29ja2V0LldTLnJlYWR5U3RhdGUgPT09IDApe1xyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgIFNvY2tldC5XUy5zZW5kKEpTT04uc3RyaW5naWZ5KG9iaikpXHJcbiAgICAgICAgICAgIH0sIDIwMDApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8qKuWFs+mXrVdTICovXHJcbiAgICBzdGF0aWMgb25jbG9zZVdTKCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCfmlq3lvIDov57mjqUnKTtcclxuICAgIH1cclxuICAgIC8qKuWPkemAgeW/g+i3syAqL1xyXG4gICAgc3RhdGljIHNlbmRQaW5nKCl7XHJcbiAgICAgICAgU29ja2V0LldTLnNlbmQoJ3BpbmcnKTtcclxuICAgICAgICBTb2NrZXQuc2V0SW50ZXJ2YWxXZXNvY2tldFB1c2ggPSBzZXRJbnRlcnZhbCgoKSA9PiB7XHJcbiAgICAgICAgICAgIFNvY2tldC5XUy5zZW5kKCdwaW5nJyk7XHJcbiAgICAgICAgfSwgMzAwMDApXHJcbiAgICB9XHJcbn1cclxuXHJcbiIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0NToyOFxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0NToyOFxyXG4gKiBAZGVzYyDlt6Xlhbflh73mlbDpm4blkIhcclxuICovXHJcbmV4cG9ydCBkZWZhdWx0IHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIOWNg+WIhuS9jeagvOW8j+WMllxyXG4gICAgICogQHBhcmFtIHtudW1iZXIgfCBzdHJpbmd9IG51bSDmoLzlvI/ljJbmlbDlrZdcclxuICAgICAqL1xyXG4gICAgY29tZGlmeShudW06IGFueSkge1xyXG4gICAgICAgIHJldHVybiBudW0udG9TdHJpbmcoKS5yZXBsYWNlKC9cXGQrLywgZnVuY3Rpb24gKG4pIHsgLy8g5YWI5o+Q5Y+W5pW05pWw6YOo5YiGXHJcbiAgICAgICAgICAgIHJldHVybiBuLnJlcGxhY2UoLyhcXGQpKD89KFxcZHszfSkrJCkvZywgZnVuY3Rpb24gKCQxKSB7IC8vIOWvueaVtOaVsOmDqOWIhua3u+WKoOWIhumalOesplxyXG4gICAgICAgICAgICAgICAgcmV0dXJuICQxICsgXCIsXCI7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIOWkjeWItlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNvcHlJbmZvIOWkjeWItuWGheWuuVxyXG4gICAgICovXHJcbiAgICBDb3B5KGNvcHlJbmZvOiBhbnkpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBsZXQgY29weVVybCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiKTsgLy/liJvlu7rkuIDkuKppbnB1dOahhuiOt+WPlumcgOimgeWkjeWItueahOaWh+acrOWGheWuuVxyXG4gICAgICAgICAgICBjb3B5VXJsLnZhbHVlID0gY29weUluZm87XHJcbiAgICAgICAgICAgIGxldCBhcHBEaXYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXBwJyk7XHJcbiAgICAgICAgICAgIGFwcERpdi5hcHBlbmRDaGlsZChjb3B5VXJsKTtcclxuICAgICAgICAgICAgY29weVVybC5zZWxlY3QoKTtcclxuICAgICAgICAgICAgZG9jdW1lbnQuZXhlY0NvbW1hbmQoXCJDb3B5XCIpO1xyXG4gICAgICAgICAgICBjb3B5VXJsLnJlbW92ZSgpXHJcbiAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XHJcbiAgICAgICAgfSlcclxuICAgIH0sXHJcblxyXG4gICAgLyoqIOWIpOaWreaYr+WQpuS4uuaJi+acuiovXHJcbiAgICBpc1Bob25lKG51bTogYW55KSB7XHJcbiAgICAgICAgdmFyIHJlZyA9IC9eMVszNDU2Nzg5XVxcZHs5fSQvO1xyXG4gICAgICAgIHJldHVybiByZWcudGVzdChudW0pO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIOWAkuiuoeaXtlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmcgfCBudW1iZXJ9IHRpbWVzIOWJqeS9meavq+enkuaVsCBcclxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIOWbnuiwg+WHveaVsFxyXG4gICAgICovXHJcbiAgICBjb3VudERvd24odGltZXM6IGFueSwgY2FsbGJhY2s6IGFueSkge1xyXG4gICAgICAgIGxldCB0aW1lciA9IG51bGw7XHJcbiAgICAgICAgdGltZXIgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XHJcbiAgICAgICAgICAgIGlmICh0aW1lcyA+IDApIHtcclxuICAgICAgICAgICAgICAgIGxldCBkYXk6IGFueSA9IE1hdGguZmxvb3IodGltZXMgLyAoNjAgKiA2MCAqIDI0KSk7XHJcbiAgICAgICAgICAgICAgICBsZXQgaG91cjogYW55ID0gTWF0aC5mbG9vcih0aW1lcyAvICg2MCAqIDYwKSkgLSAoZGF5ICogMjQpO1xyXG4gICAgICAgICAgICAgICAgbGV0IG1pbnV0ZTogYW55ID0gTWF0aC5mbG9vcih0aW1lcyAvIDYwKSAtIChkYXkgKiAyNCAqIDYwKSAtIChob3VyICogNjApO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNlY29uZDogYW55ID0gTWF0aC5mbG9vcih0aW1lcykgLSAoZGF5ICogMjQgKiA2MCAqIDYwKSAtIChob3VyICogNjAgKiA2MCkgLSAobWludXRlICogNjApO1xyXG4gICAgICAgICAgICAgICAgZGF5ID0gYCR7ZGF5IDwgMTAgPyAnMCcgOiAnJ30ke2RheX1gO1xyXG4gICAgICAgICAgICAgICAgaG91ciA9IGAke2hvdXIgPCAxMCA/ICcwJyA6ICcnfSR7aG91cn1gO1xyXG4gICAgICAgICAgICAgICAgbWludXRlID0gYCR7bWludXRlIDwgMTAgPyAnMCcgOiAnJ30ke21pbnV0ZX1gO1xyXG4gICAgICAgICAgICAgICAgc2Vjb25kID0gYCR7c2Vjb25kIDwgMTAgPyAnMCcgOiAnJ30ke3NlY29uZH1gO1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2soYCR7aG91cn06JHttaW51dGV9OiR7c2Vjb25kfWApXHJcbiAgICAgICAgICAgICAgICB0aW1lcy0tO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aW1lcik7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sIDEwMDApO1xyXG4gICAgICAgIGlmICh0aW1lcyA8PSAwKSB7XHJcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGltZXIpO1xyXG4gICAgICAgICAgICBjYWxsYmFjayhmYWxzZSlcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5bCG5qC85byP5YyW5pel5pyf6L2s5o2i5oiQ5pe26Ze05oizXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbXlEYXRlIOagvOW8j+WMluaXpeacn1xyXG4gICAgICovXHJcbiAgICBmb3JtYXREYXRlKHg6IGFueSwgeTogYW55KSB7XHJcbiAgICAgICAgaWYgKCEoeCBpbnN0YW5jZW9mIERhdGUpKSB7XHJcbiAgICAgICAgICAgIHZhciBkYXRlID0gbmV3IERhdGUoKTtcclxuICAgICAgICAgICAgZGF0ZS5zZXRUaW1lKHggKiAxMDAwKTtcclxuICAgICAgICAgICAgeCA9IGRhdGU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciB6ID0ge1xyXG4gICAgICAgICAgICB5OiB4LmdldEZ1bGxZZWFyKCksXHJcbiAgICAgICAgICAgIE06IHguZ2V0TW9udGgoKSArIDEsXHJcbiAgICAgICAgICAgIGQ6IHguZ2V0RGF0ZSgpLFxyXG4gICAgICAgICAgICBoOiB4LmdldEhvdXJzKCksXHJcbiAgICAgICAgICAgIG06IHguZ2V0TWludXRlcygpLFxyXG4gICAgICAgICAgICBzOiB4LmdldFNlY29uZHMoKVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmV0dXJuIHkucmVwbGFjZSgvKHkrfE0rfGQrfGgrfG0rfHMrKS9nLCBmdW5jdGlvbiAodikge1xyXG4gICAgICAgICAgICByZXR1cm4gKCh2Lmxlbmd0aCA+IDEgPyBcIjBcIiA6IFwiXCIpICsgZXZhbChcInouXCIgKyB2LnNsaWNlKC0xKSkpLnNsaWNlKFxyXG4gICAgICAgICAgICAgICAgLSh2Lmxlbmd0aCA+IDIgPyB2Lmxlbmd0aCA6IDIpXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9LFxyXG4gICAgLyoqXHJcbiAgICog5bCG5pe26Ze05oiz6L2s5o2i5oiQ5qC85byP5YyW5pel5pyfXHJcbiAgICogQHBhcmFtIHtzdHJpbmd9IHRpbWVTdGFtcCDml7bpl7TmiLNcclxuICAgKi9cclxuICAgIGZvcm1hdERhdGVUaW1lKHRpbWVTdGFtcCkge1xyXG4gICAgICAgIHZhciBkYXRlID0gbmV3IERhdGUoKTtcclxuICAgICAgICBkYXRlLnNldFRpbWUodGltZVN0YW1wICogMTAwMCk7XHJcbiAgICAgICAgdmFyIHkgPSBkYXRlLmdldEZ1bGxZZWFyKCk7XHJcbiAgICAgICAgdmFyIG06c3RyaW5nIHwgbnVtYmVyID0gZGF0ZS5nZXRNb250aCgpICsgMTtcclxuICAgICAgICBtID0gbSA8IDEwID8gKCcwJyArIG0pIDogbTtcclxuICAgICAgICB2YXIgZDpzdHJpbmcgfCBudW1iZXIgPSBkYXRlLmdldERhdGUoKTtcclxuICAgICAgICBkID0gZCA8IDEwID8gKCcwJyArIGQpIDogZDtcclxuICAgICAgICB2YXIgaDpzdHJpbmcgfCBudW1iZXIgPSBkYXRlLmdldEhvdXJzKCk7XHJcbiAgICAgICAgaCA9IGggPCAxMCA/ICgnMCcgKyBoKSA6IGg7XHJcbiAgICAgICAgdmFyIG1pbnV0ZTpzdHJpbmcgfCBudW1iZXIgPSBkYXRlLmdldE1pbnV0ZXMoKTtcclxuICAgICAgICB2YXIgc2Vjb25kOnN0cmluZyB8IG51bWJlciA9IGRhdGUuZ2V0U2Vjb25kcygpO1xyXG4gICAgICAgIG1pbnV0ZSA9IG1pbnV0ZSA8IDEwID8gKCcwJyArIG1pbnV0ZSkgOiBtaW51dGU7XHJcbiAgICAgICAgc2Vjb25kID0gc2Vjb25kIDwgMTAgPyAoJzAnICsgc2Vjb25kKSA6IHNlY29uZDtcclxuICAgICAgICByZXR1cm4geSArICctJyArIG0gKyAnLScgKyBkICsgJyAnICsgaCArICc6JyArIG1pbnV0ZSArICc6JyArIHNlY29uZDtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiDkv53nlZlu5L2N5bCP5pWwICBcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nIHwgbnVtYmVyfSBjbnVtIOmcgOimgeS/neeVmeeahOaVsOaNrlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNpbmRleCDkv53nlZnnmoTlsI/mlbDkvY3mlbBcclxuICAgICAqL1xyXG4gICAgdG9EZWNpbWFsKGNudW06IGFueSwgY2luZGV4OiBhbnkpIHtcclxuICAgICAgICBsZXQgdmFsdWUgPSBTdHJpbmcoY251bSk7XHJcbiAgICAgICAgaWYgKHZhbHVlLmluZGV4T2YoXCIuXCIpID4gMCkge1xyXG4gICAgICAgICAgICB2YXIgbGVmdCA9IHZhbHVlLnN1YnN0cigwLCB2YWx1ZS5pbmRleE9mKFwiLlwiKSk7XHJcbiAgICAgICAgICAgIHZhciByaWdodCA9IHZhbHVlLnN1YnN0cih2YWx1ZS5pbmRleE9mKFwiLlwiKSArIDEsIHZhbHVlLmxlbmd0aCk7XHJcbiAgICAgICAgICAgIGlmIChyaWdodC5sZW5ndGggPiBjaW5kZXgpIHtcclxuICAgICAgICAgICAgICAgIHJpZ2h0ID0gcmlnaHQuc3Vic3RyKDAsIGNpbmRleCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFsdWUgPSBsZWZ0ICsgXCIuXCIgKyByaWdodDtcclxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBjbnVtO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgLyoq5Yqg5rOV6L+Q566XICovXHJcbiAgICBhY2NBZGQoYXJnMSxhcmcyKXtcclxuICAgICAgICBsZXQgcjEscjIsbTtcclxuICAgICAgICB0cnl7cjE9YXJnMS50b1N0cmluZygpLnNwbGl0KFwiLlwiKVsxXS5sZW5ndGh9Y2F0Y2goZSl7cjE9MH1cclxuICAgICAgICB0cnl7cjI9YXJnMi50b1N0cmluZygpLnNwbGl0KFwiLlwiKVsxXS5sZW5ndGh9Y2F0Y2goZSl7cjI9MH1cclxuICAgICAgICBtPU1hdGgucG93KDEwLE1hdGgubWF4KHIxLHIyKSlcclxuICAgICAgICByZXR1cm4gKGFyZzEqbSthcmcyKm0pL21cclxuICAgIH0sXHJcbiAgICAvKirlh4/ms5Xov5DnrpcgKi9cclxuICAgIGFjY1N1YihhcmcxLGFyZzIpe1xyXG4gICAgICAgIGxldCByMSxyMixtLG47XHJcbiAgICAgICAgdHJ5e3IxPWFyZzEudG9TdHJpbmcoKS5zcGxpdChcIi5cIilbMV0ubGVuZ3RofWNhdGNoKGUpe3IxPTB9XHJcbiAgICAgICAgdHJ5e3IyPWFyZzIudG9TdHJpbmcoKS5zcGxpdChcIi5cIilbMV0ubGVuZ3RofWNhdGNoKGUpe3IyPTB9XHJcbiAgICAgICAgbT1NYXRoLnBvdygxMCxNYXRoLm1heChyMSxyMikpO1xyXG4gICAgICAgIG49KHIxPj1yMik/cjE6cjI7XHJcbiAgICAgICAgcmV0dXJuICgoYXJnMSptLWFyZzIqbSkvbSkudG9GaXhlZChuKTtcclxuICAgIH0sXHJcbiAgICAvKirpmaTms5Xov5DnrpcgKi9cclxuICAgIGFjY0RpdihhcmcxLGFyZzIpe1xyXG4gICAgICAgIGxldCB0MT0wLHQyPTAscjEscjI7XHJcbiAgICAgICAgdHJ5e3QxPWFyZzEudG9TdHJpbmcoKS5zcGxpdChcIi5cIilbMV0ubGVuZ3RofWNhdGNoKGUpe307XHJcbiAgICAgICAgdHJ5e3QyPWFyZzIudG9TdHJpbmcoKS5zcGxpdChcIi5cIilbMV0ubGVuZ3RofWNhdGNoKGUpe307XHJcbiAgICAgICAgcjE9TnVtYmVyKGFyZzEudG9TdHJpbmcoKS5yZXBsYWNlKFwiLlwiLFwiXCIpKVxyXG4gICAgICAgIHIyPU51bWJlcihhcmcyLnRvU3RyaW5nKCkucmVwbGFjZShcIi5cIixcIlwiKSlcclxuICAgICAgICByZXR1cm4gKHIxL3IyKSpNYXRoLnBvdygxMCx0Mi10MSk7XHJcbiAgICB9LFxyXG4gICAgLyoq5LmY5rOV6L+Q566XICovXHJcbiAgICBhY2NNdWwoYXJnMSxhcmcyKXtcclxuICAgICAgICBsZXQgbT0wLHMxPWFyZzEudG9TdHJpbmcoKSxzMj1hcmcyLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgdHJ5e20rPXMxLnNwbGl0KFwiLlwiKVsxXS5sZW5ndGh9Y2F0Y2goZSl7fVxyXG4gICAgICAgIHRyeXttKz1zMi5zcGxpdChcIi5cIilbMV0ubGVuZ3RofWNhdGNoKGUpe31cclxuICAgICAgICByZXR1cm4gTnVtYmVyKHMxLnJlcGxhY2UoXCIuXCIsXCJcIikpKk51bWJlcihzMi5yZXBsYWNlKFwiLlwiLFwiXCIpKS9NYXRoLnBvdygxMCxtKVxyXG4gICAgfSxcclxufVxyXG4iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjggMTE6Mjk6NDFcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjggMTE6Mjk6NDFcclxuICogQGRlc2Mg6LWE5rqQ5YiX6KGoXHJcbiAqL1xyXG5cclxuXHJcbi8vIOmmlumhtei1hOa6kFxyXG5jb25zdCBjb21wID0gW1xyXG4gICAgeyB1cmw6IFwicmVzL2F0bGFzL2NvbXAuYXRsYXNcIiwgdHlwZTogXCJhdGxhc1wiIH0sXHJcblx0eyB1cmw6IFwicmVzL2F0bGFzL2NvbXAvaG9tZS5hdGxhc1wiLCB0eXBlOiBcImF0bGFzXCIgfSxcclxuXHR7IHVybDogXCJyZXMvYXRsYXMvY29tcC9ob21lL2ZpcmUuYXRsYXNcIiwgdHlwZTogXCJhdGxhc1wiIH0sXHJcblx0eyB1cmw6IFwicmVzL2F0bGFzL2NvbXAvaG9tZS93YXZlLmF0bGFzXCIsIHR5cGU6IFwiYXRsYXNcIiB9LFxyXG4gICAgeyB1cmw6IFwiY29tcC9pbWdfc3Rhcl9iZzAxLnBuZ1wiLCB0eXBlOiBcImltYWdlXCIgfSxcclxuXVxyXG5jb25zdCBzY2VuZSA9IFtcclxuICAgIHsgdXJsOiBcIkNhcmQuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxyXG4gICAgeyB1cmw6IFwiaG9tZS5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXHJcbiAgICB7IHVybDogXCJUYWJiYXIuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxyXG5dXHJcbmV4cG9ydCBjb25zdCBsb2FkaW5nUmVzTGlzdCA9IFtcclxuICAgIC4uLmNvbXAsXHJcbiAgICAuLi5zY2VuZVxyXG5dXHJcblxyXG5cclxuXHJcbi8v6aaW6aG15LmL5ZCO5Yqg6L29XHJcbmNvbnN0IGNvbXAxID0gW1xyXG4gICAgeyB1cmw6IFwiY29tcC9pbWdfcGF5bWVudF9iZzAxLnBuZ1wiLCB0eXBlOiBcImltYWdlXCIgfSxcclxuICAgIHsgdXJsOiBcImNvbXAvaW1nX3JhbmtsaXN0X2JnMDEucG5nXCIsIHR5cGU6IFwiaW1hZ2VcIiB9LFxyXG4gICAgeyB1cmw6IFwiY29tcC9pbWdfcm9ja2V0UmFua2luZ19iZzAxLnBuZ1wiLCB0eXBlOiBcImltYWdlXCIgfSxcclxuICAgIHsgdXJsOiBcImNvbXAvaW1nX2Jhbm5lcjAxLnBuZ1wiLCB0eXBlOiBcImltYWdlXCIgfSxcclxuICAgIHsgdXJsOiBcImNvbXAvaW1nX215cmFuazAxLnBuZ1wiLCB0eXBlOiBcImltYWdlXCIgfSxcclxuICAgIHsgdXJsOiBcImNvbXAvaW1nX3JhbmswMS5wbmdcIiwgdHlwZTogXCJpbWFnZVwiIH0sXHJcbiAgICB7IHVybDogXCJjb21wL2ltZ190cmVuZF9iYW5uZXIwMS5wbmdcIiwgdHlwZTogXCJpbWFnZVwiIH0sXHJcbiAgICB7IHVybDogXCJjb21wL2ltZ194Y3RqX2JnMDEucG5nXCIsIHR5cGU6IFwiaW1hZ2VcIiB9LFxyXG5dXHJcbmNvbnN0IHNjZW5lMSA9IFtcclxuICAgIHsgdXJsOiBcInRlbXBsYXRlL3Nob3dSb2NrZXQuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxyXG4gICAgeyB1cmw6IFwidGVtcGxhdGUvbnVtYmVyTGlzdERPTS5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXHJcbiAgICB7IHVybDogXCJ0ZW1wbGF0ZS9JbnB1dFB3ZERpYWxvZy5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXHJcbiAgICB7IHVybDogXCJ0ZW1wbGF0ZS9UaXBzRGlhbG9nLmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcclxuICAgIHsgdXJsOiBcInRlbXBsYXRlL3JlY2hhcmdlRGlhbG9nLmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcclxuICAgIHsgdXJsOiBcInRlbXBsYXRlL2pvaW5SZWNvcmRzLmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcclxuICAgIHsgdXJsOiBcInRlbXBsYXRlL3ByZXZpb3VzUmVjb3Jkcy5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXHJcbiAgICB7IHVybDogXCJ0ZW1wbGF0ZS9wcml4TGlzdC5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXHJcbiAgICB7IHVybDogXCJ0ZW1wbGF0ZS9wcmlIaXN0b3J5Lmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcclxuICAgIHsgdXJsOiBcInRlbXBsYXRlL3JhbmtpbmdMaXN0Lmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcclxuICAgIHsgdXJsOiBcInRlbXBsYXRlL3Nob3J0TGlzdC5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXHJcbiAgICB7IHVybDogXCJ0ZW1wbGF0ZS90cmVuZExpc3QuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxyXG4gICAgeyB1cmw6IFwidGVtcGxhdGUvd2lubmluZ0xpc3QuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxyXG4gICAgeyB1cmw6IFwiZ3Vlc3NpbmcuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxyXG4gICAgeyB1cmw6IFwicmVjb3JkLmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcclxuICAgIHsgdXJsOiBcImFzc2lzdGFudC5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXHJcbiAgICB7IHVybDogXCJncmFuZFByaXguanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxyXG4gICAgeyB1cmw6IFwicHJpSGlzdG9yeVNjZW5lLmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcclxuICAgIHsgdXJsOiBcInNob3J0TGlzdGVkLmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcclxuICAgIHsgdXJsOiBcInhjdGouanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxyXG5dXHJcbmV4cG9ydCBjb25zdCBsb2FkaW5nUmVzTGlzdDEgPSBbXHJcbiAgICAuLi5jb21wMSxcclxuICAgIC4uLnNjZW5lMVxyXG5dXHJcbiIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0NTo0NlxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0NTo0NlxyXG4gKiBAZGVzYyDpobXpnaLot7PovazohJrmnKzvvIznlKjkuo7nvJbovpHmqKHlvI/mj5LlhaVcclxuICovXHJcbmltcG9ydCB7IFRhYmJhciB9IGZyb20gXCIuLi92aWV3L1RhYmJhclwiO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGFnZU5hdlNjcmlwdCBleHRlbmRzIExheWEuU2NyaXB0IHtcclxuICAgIC8qKiBAcHJvcCB7bmFtZTpuYXZQYWdlU2NyaXB0LHRpcHM6J+imgei3s+i9rOeahHNjZW5lJyx0eXBlOlN0cmluZyxkZWZhdWx0OicnfSAqL1xyXG4gICAgcHVibGljIG5hdlBhZ2VTY3JpcHQ6c3RyaW5nID0gJyc7XHJcblxyXG4gICAgY29uc3RydWN0b3IoKXtzdXBlcigpfVxyXG5cclxuICAgIG9uQ2xpY2soKTp2b2lkIHtcclxuICAgICAgICBUYWJiYXIuZ2V0SW5zdGFuY2UoKS5vcGVuU2NlbmUodGhpcy5uYXZQYWdlU2NyaXB0KVxyXG4gICAgfVxyXG59IiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ2OjA4XHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ2OjA4XHJcbiAqIEBkZXNjIOmhtemdoui3s+i9rOexu++8jOWcqOS7o+eggeS4reS9v+eUqFxyXG4gKi9cclxuaW1wb3J0IHsgVGFiYmFyIH0gZnJvbSAnLi4vdmlldy9UYWJiYXInXHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQYWdlU2NyaXB0IGV4dGVuZHMgTGF5YS5TY3JpcHQge1xyXG4gICAgLyoqIEBwcm9wIHtuYW1lOnNob3dUYWIsdGlwczon5piv5ZCm5pyJVGFiYmFyJyx0eXBlOkJvb2wsZGVmYXVsdDp0cnVlfSAqL1xyXG4gICAgcHVibGljIHNob3dUYWI6Ym9vbGVhbiA9IHRydWU7XHJcblxyXG4gICAgY29uc3RydWN0b3IoKXtzdXBlcigpO31cclxuXHJcbiAgICBvbkVuYWJsZSgpOnZvaWQge1xyXG4gICAgICAgIGlmICh0aGlzLnNob3dUYWIpIHtcclxuICAgICAgICAgICAgVGFiYmFyLnNob3coKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBvbkRpc2FibGUoKTp2b2lkIHtcclxuICAgICAgICBUYWJiYXIuaGlkZSgpXHJcbiAgICB9XHJcbn0iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDY6MzBcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDY6MzBcclxuICogQGRlc2Mg5bGP5bmV6Ieq6YCC5bqU6ISa5pysXHJcbiAqL1xyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTY3JlZW4gZXh0ZW5kcyBMYXlhLlNjcmlwdCB7XHJcbiAgICAvKiogQHByb3Age25hbWU6YmdDb2xvcix0aXBzOifog4zmma/popzoibInLCd0eXBlOlN0cmluZyxkZWZhdWx0OicjMGEwNzM4J30gKi9cclxuICAgIHB1YmxpYyBiZ0NvbG9yOnN0cmluZyA9ICcjMGEwNzM4J1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCl7c3VwZXIoKTt9XHJcblxyXG4gICAgb25FbmFibGUoKTp2b2lkIHtcclxuICAgICAgIExheWEuc3RhZ2Uub24oTGF5YS5FdmVudC5SRVNJWkUsdGhpcyx0aGlzLm9uUmVzaXplKVxyXG4gICAgICAgdGhpcy5vblJlc2l6ZSgpXHJcbiAgICB9XHJcblxyXG4gICAgb25EaXNhYmxlKCk6dm9pZCB7XHJcbiAgICAgICAgTGF5YS5zdGFnZS5vZmYoTGF5YS5FdmVudC5SRVNJWkUsdGhpcyx0aGlzLm9uUmVzaXplKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25SZXNpemUoKTp2b2lkIHtcclxuICAgICAgICBjb25zdCBfdGhhdCA9ICh0aGlzLm93bmVyIGFzIExheWEuU3ByaXRlKTtcclxuICAgICAgICBfdGhhdC53aWR0aCA9IExheWEuc3RhZ2Uud2lkdGg7XHJcbiAgICAgICAgX3RoYXQuaGVpZ2h0ID0gTGF5YS5zdGFnZS5oZWlnaHQ7XHJcbiAgICAgICAgX3RoYXQuZ3JhcGhpY3MuZHJhd1JlY3QoMCwwLExheWEuc3RhZ2Uud2lkdGgsTGF5YS5zdGFnZS5oZWlnaHQsdGhpcy5iZ0NvbG9yKTtcclxuICAgIH1cclxufSIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0yMSAxNjozNDoyMVxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yMSAxNjozNDoyMVxyXG4gKiBAZGVzYyDliqnmiYvpobXpnaLohJrmnKxcclxuICovXHJcblxyXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcclxuaW1wb3J0IGFwaSBmcm9tIFwiLi4vanMvYXBpXCI7XHJcbmltcG9ydCB7IFRvYXN0IH0gZnJvbSBcIi4uL3ZpZXcvVG9hc3RcIjtcclxuXHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBc3Npc3RhbnQgZXh0ZW5kcyB1aS5hc3Npc3RhbnRVSSB7XHJcbiAgICBwcml2YXRlIGNhdGVMaXN0QXJyOmFueSA9IFtdO1xyXG4gICAgcHJpdmF0ZSBzZWxlY3RHb29kc1R5cGU6c3RyaW5nID0gJyc7XHJcbiAgICBwcml2YXRlIHRhYlR5cGU6bnVtYmVyID0gMTtcclxuXHJcbiAgICBzdGF0aWMgcmVhZG9ubHkgSEFMRl9TQ1JPTExfRUxBU1RJQ19ESVNUQU5DRTogbnVtYmVyID0gMTAwO1xyXG4gICAgcHJpdmF0ZSBfaXNTY3JvbGxPdmVyRWxhc3RpY0Rpc3RhbmNlOiBib29sZWFuO1xyXG4gICAgcHJpdmF0ZSBwYWdlOm51bWJlciA9IDE7XHJcbiAgICBjb25zdHJ1Y3Rvcigpe1xyXG4gICAgICAgIHN1cGVyKClcclxuICAgICAgICB0aGlzLmJ0bl90cmVuZC5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy50YWJTd2l0Y2gsWzFdKVxyXG4gICAgICAgIHRoaXMuYnRuX3ByZWJ1eS5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy50YWJTd2l0Y2gsWzJdKVxyXG4gICAgICAgIHRoaXMub24oTGF5YS5FdmVudC5SRVNJWkUsdGhpcyx0aGlzLm9uUmVzaXplKVxyXG4gICAgfVxyXG5cclxuICAgIG9uRW5hYmxlKCk6dm9pZHsgIFxyXG4gICAgICAgIHRoaXMuZ2V0R29vZHNDYXRlTGlzdCgpXHJcbiAgICAgICAgdGhpcy5jYXRlU3dpdGNoKClcclxuXHJcbiAgICAgICAgLy/otbDlir/liIbmnpDmu5rliqjliqDovb3mm7TlpJpcclxuICAgICAgICB0aGlzLnRyZW5kTGlzdC5zY3JvbGxCYXIuY2hhbmdlSGFuZGxlciA9IExheWEuSGFuZGxlci5jcmVhdGUodGhpcyx0aGlzLm9uVHJlbmRMaXN0U2Nyb2xsQ2hhbmdlLG51bGwsZmFsc2UpXHJcbiAgICAgICAgdGhpcy50cmVuZExpc3Quc2Nyb2xsQmFyLm9uKExheWEuRXZlbnQuRU5ELCB0aGlzLCB0aGlzLm9uVHJlbmRMaXN0U2Nyb2xsRW5kKVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvKirojrflj5bllYblk4HnsbvlnosgKi9cclxuICAgIHByaXZhdGUgZ2V0R29vZHNDYXRlTGlzdCgpe1xyXG4gICAgICAgIGFwaS5nZXRHb29kc0NhdGVMaXN0KCkudGhlbigocmVzOmFueSk9PntcclxuICAgICAgICAgICAgdGhpcy5jYXRlTGlzdEFyciA9IHJlcztcclxuICAgICAgICAgICAgY29uc3QgR29vZHNOYW1lQXJyOnN0cmluZ1tdID0gW107XHJcbiAgICAgICAgICAgIHJlcy5mb3JFYWNoKChpdGVtOmFueSk9PntcclxuICAgICAgICAgICAgICAgIEdvb2RzTmFtZUFyci5wdXNoKGl0ZW0uZ29vZHNOYW1lKVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB0aGlzLmNhdGVUYWJMaXN0LnJlcGVhdFggPSBHb29kc05hbWVBcnIubGVuZ3RoO1xyXG4gICAgICAgICAgICB0aGlzLmNhdGVUYWJMaXN0LmFycmF5ID0gR29vZHNOYW1lQXJyO1xyXG4gICAgICAgICAgICB0aGlzLmNhdGVUYWJMaXN0LnNlbGVjdGVkSW5kZXggPSAwO1xyXG4gICAgICAgIH0pLmNhdGNoKChlcnI6YW55KT0+e1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIubWVzc2FnZSk7XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcblxyXG4gICAgLyoq6I635Y+W6LWw5Yq/5YiX6KGoICovXHJcbiAgICBwcml2YXRlIGdldEdvb2RzVHJlbmQoZ29vZHNUeXBlOnN0cmluZyxwYWdlID0gMSl7XHJcbiAgICAgICAgYXBpLmdldEdvb2RzVHJlbmQoZ29vZHNUeXBlLHBhZ2UpLnRoZW4oKHJlczphbnkpPT57XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnRyZW5kTGlzdC5hcnJheSAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50cmVuZExpc3QuYXJyYXkgPSBbLi4udGhpcy50cmVuZExpc3QuYXJyYXksLi4ucmVzXVxyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIHRoaXMudHJlbmRMaXN0LmFycmF5ID0gcmVzO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnRyZW5kTGlzdC5hcnJheS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRyZW5kTGlzdC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pLmNhdGNoKChlcnI6YW55KT0+e1xyXG4gICAgICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyLm1lc3NhZ2UpO1xyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiDliIfmjaLliJfooahcclxuICAgICAqIEBwYXJhbSB0eXBlIDE66LWw5Yq/5YiG5p6QICAy77ya6aKE6LStXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgdGFiU3dpdGNoKHR5cGU6bnVtYmVyKXtcclxuICAgICAgICBpZiAodHlwZSA9PT0gMikge1xyXG4gICAgICAgICAgICBUb2FzdC5zaG93KCfmmoLmnKrlvIDmlL7vvIzmlazor7fmnJ/lvoUnKVxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyB0aGlzLnRhYlR5cGUgPSB0eXBlO1xyXG4gICAgICAgIC8vIHRoaXMuY2F0ZVRhYkxpc3Quc2VsZWN0ZWRJbmRleCA9IDA7XHJcbiAgICAgICAgLy8gaWYgKHRoaXMudGFiVHlwZSA9PT0gMSkge1xyXG4gICAgICAgIC8vICAgICB0aGlzLmJ0bl90cmVuZC5za2luID0gJ2NvbXAvZ3Vlc3NpbmcvaW1nX3RhYl9hY3RpdmUucG5nJztcclxuICAgICAgICAvLyAgICAgdGhpcy5idG5fcHJlYnV5LnNraW4gPSAnY29tcC9ndWVzc2luZy9pbWdfdGFiLnBuZyc7XHJcbiAgICAgICAgLy8gICAgIHRoaXMubGlzdFRpdGxlLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgIC8vICAgICBpZiAodGhpcy50cmVuZExpc3QuYXJyYXkgPT09IG51bGwgfHwgdGhpcy50cmVuZExpc3QuYXJyYXkubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgLy8gICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAvLyAgICAgfWVsc2Uge1xyXG4gICAgICAgIC8vICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICAgIC8vICAgICAgICAgdGhpcy50cmVuZExpc3QudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgLy8gICAgIH1cclxuICAgICAgICAvLyAgICAgdGhpcy5wcmVidXkuc2Nyb2xsVG8oMClcclxuICAgICAgICAvLyAgICAgdGhpcy5wcmVidXkudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICAgIC8vIH1lbHNle1xyXG4gICAgICAgIC8vICAgICB0aGlzLmJ0bl9wcmVidXkuc2tpbiA9ICdjb21wL2d1ZXNzaW5nL2ltZ190YWJfYWN0aXZlLnBuZyc7XHJcbiAgICAgICAgLy8gICAgIHRoaXMuYnRuX3RyZW5kLnNraW4gPSAnY29tcC9ndWVzc2luZy9pbWdfdGFiLnBuZyc7XHJcbiAgICAgICAgLy8gICAgIHRoaXMubGlzdFRpdGxlLnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICAvLyAgICAgaWYgKHRoaXMucHJlYnV5LmFycmF5ID09PSBudWxsIHx8IHRoaXMucHJlYnV5LmFycmF5Lmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIC8vICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgLy8gICAgIH1lbHNlIHtcclxuICAgICAgICAvLyAgICAgICAgIHRoaXMubm9EYXRhLnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICAvLyAgICAgICAgIHRoaXMucHJlYnV5LnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgIC8vICAgICB9XHJcbiAgICAgICAgLy8gICAgIHRoaXMudHJlbmRMaXN0LnNjcm9sbFRvKDApO1xyXG4gICAgICAgIC8vICAgICB0aGlzLnRyZW5kTGlzdC52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgLy8gfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKuWVhuWTgeexu+Wei+WIh+aNoiAqL1xyXG4gICAgcHJpdmF0ZSBjYXRlU3dpdGNoKCl7XHJcbiAgICAgICAgdGhpcy5jYXRlVGFiTGlzdC5zZWxlY3RIYW5kbGVyID0gbmV3IExheWEuSGFuZGxlcih0aGlzLCAoc2VsZWN0ZWRJbmRleDogYW55KT0+IHtcclxuICAgICAgICAgICAgdGhpcy5zZWxlY3RHb29kc1R5cGUgPSB0aGlzLmNhdGVMaXN0QXJyW3NlbGVjdGVkSW5kZXhdLmdvb2RzVHlwZTtcclxuICAgICAgICAgICAgaWYgKHRoaXMudGFiVHlwZSA9PT0gMSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50cmVuZExpc3QuYXJyYXkgPSBbXTtcclxuICAgICAgICAgICAgICAgIHRoaXMucGFnZSA9IDE7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdldEdvb2RzVHJlbmQodGhpcy5zZWxlY3RHb29kc1R5cGUsdGhpcy5wYWdlKVxyXG4gICAgICAgICAgICB9ZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn5pqC5pyq5byA5pS+Jyx0aGlzLnNlbGVjdEdvb2RzVHlwZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy/mlLnlj5h0YWLpgInkuK3nirbmgIFcclxuICAgICAgICAgICAgbGV0IGk6IG51bWJlciA9IHRoaXMuY2F0ZVRhYkxpc3Quc3RhcnRJbmRleDtcclxuICAgICAgICAgICAgdGhpcy5jYXRlVGFiTGlzdC5jZWxscy5mb3JFYWNoKChjZWxsOiBMYXlhLkJ1dHRvbikgPT4ge1xyXG4gICAgICAgICAgICAgICAgY2VsbC5zZWxlY3RlZCA9IGkgPT09IHNlbGVjdGVkSW5kZXg7XHJcbiAgICAgICAgICAgICAgICBpKys7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICAvKirnm5Hop4blsY/luZXlpKflsI/lj5jljJYgKi9cclxuICAgIG9uUmVzaXplKCl7XHJcbiAgICAgICAgLy/liJfooajpq5jluqbpgILphY0gPSDlsY/luZXpq5jluqYgLSAoYmFubmVyICsgdGFiYmFyKVxyXG4gICAgICAgIHRoaXMudHJlbmRMaXN0LmhlaWdodCA9IHRoaXMuaGVpZ2h0IC0gNjAwO1xyXG4gICAgICAgIGNvbnN0IHRyZW5kTnVtYmVyID0gdGhpcy50cmVuZExpc3QuaGVpZ2h0IC8gMTAwO1xyXG4gICAgICAgIHRoaXMudHJlbmRMaXN0LnJlcGVhdFkgPSBNYXRoLmNlaWwodHJlbmROdW1iZXIpXHJcbiAgICAgICAgdGhpcy5wcmVidXkuaGVpZ2h0ID0gdGhpcy5oZWlnaHQgLSA2MDA7XHJcbiAgICAgICAgY29uc3QgcHJlYnV5TnVtYmVyID0gdGhpcy5wcmVidXkuaGVpZ2h0IC8gMTAwO1xyXG4gICAgICAgIHRoaXMudHJlbmRMaXN0LnJlcGVhdFkgPSBNYXRoLmNlaWwocHJlYnV5TnVtYmVyKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKuWPguS4juiusOW9leWIl+ihqOa7muWKqCAqL1xyXG4gICAgcHJpdmF0ZSBvblRyZW5kTGlzdFNjcm9sbENoYW5nZSh2OmFueSkge1xyXG4gICAgICAgIGlmICh2ID4gdGhpcy50cmVuZExpc3Quc2Nyb2xsQmFyLm1heCArIEFzc2lzdGFudC5IQUxGX1NDUk9MTF9FTEFTVElDX0RJU1RBTkNFKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2lzU2Nyb2xsT3ZlckVsYXN0aWNEaXN0YW5jZSA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcHJpdmF0ZSBvblRyZW5kTGlzdFNjcm9sbEVuZCgpe1xyXG4gICAgICAgIGlmICh0aGlzLl9pc1Njcm9sbE92ZXJFbGFzdGljRGlzdGFuY2UpIHtcclxuICAgICAgICAgICAgdGhpcy5faXNTY3JvbGxPdmVyRWxhc3RpY0Rpc3RhbmNlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMucGFnZSA9IHRoaXMucGFnZSArIDE7XHJcbiAgICAgICAgICAgIHRoaXMuZ2V0R29vZHNUcmVuZCh0aGlzLnNlbGVjdEdvb2RzVHlwZSx0aGlzLnBhZ2UpXHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgXHJcbn0iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDc6MTFcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDc6MTFcclxuICogQGRlc2Mg6aaW6aG15ZWG5ZOB5Y2h6ISa5pysXHJcbiAqL1xyXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcclxuaW1wb3J0IHsgVGFiYmFyIH0gZnJvbSBcIi4uL3ZpZXcvVGFiYmFyXCI7XHJcblxyXG5pbXBvcnQgdXRpbHMgZnJvbSAnLi4vanMvdXRpbHMnXHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDYXJkIGV4dGVuZHMgdWkuQ2FyZFVJIHtcclxuICAgIGNvbnN0cnVjdG9yKCl7XHJcbiAgICAgICAgc3VwZXIoKVxyXG4gICAgICAgIHRoaXMub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuY2xpY2tJdGVtKVxyXG4gICAgfVxyXG4gICAgc2V0IGRhdGFTb3VyY2UoaXRlbTogYW55KSB7XHJcbiAgICAgICAgdGhpcy5fZGF0YVNvdXJjZSA9IGl0ZW07XHJcbiAgICAgICAgaWYgKGl0ZW0pIHtcclxuICAgICAgICAgICAgLy/ph5HluIHlm77niYcsICAxLTQwMOmHkeW4geWbvuaghzI7ICAgNTAxLTEwMDDph5HluIHlm77moIc0OyAgMTAwMeS7peS4iumHkeW4geWbvuaghzIwXHJcbiAgICAgICAgICAgIGlmICgraXRlbS5nb29kc1ZhbHVlIDw9IDQwMCApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2FyZEl0ZW0uc2tpbiA9IGBjb21wL2hvbWUvaW1nX2ppbmJpXzIucG5nYFxyXG4gICAgICAgICAgICB9ZWxzZSBpZigraXRlbS5nb29kc1ZhbHVlIDw9IDEwMDApe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jYXJkSXRlbS5za2luID0gYGNvbXAvaG9tZS9pbWdfamluYmlfNC5wbmdgXHJcbiAgICAgICAgICAgIH1lbHNlIGlmKCtpdGVtLmdvb2RzVmFsdWUgPj0gMTAwMSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jYXJkSXRlbS5za2luID0gYGNvbXAvaG9tZS9pbWdfamluYmlfMjAucG5nYFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuc2NlbmVJbWcuc2tpbiA9IGBjb21wL2hvbWUvaW1nX3NjZW5lXyR7aXRlbS50b3RhbE51bX0ucG5nYFxyXG4gICAgICAgICAgICB0aGlzLmdvb2RzTmFtZS50ZXh0ID0gYCR7K2l0ZW0uZ29vZHNWYWx1ZX0gVVNEVGBcclxuICAgICAgICAgICAgdGhpcy5hd2FyZC50ZXh0ID0gYCR7dXRpbHMudG9EZWNpbWFsKGl0ZW0uYXdhcmQsMil9YFxyXG4gICAgICAgICAgICB0aGlzLnNvbGROdW1fdG90YWxOdW0udGV4dCA9IGAke2l0ZW0uc29sZE51bX0vJHtpdGVtLnRvdGFsTnVtfWBcclxuICAgICAgICAgICAgdGhpcy5wcm9ncmVzcy52YWx1ZSA9ICtgJHtpdGVtLnNvbGROdW0vaXRlbS50b3RhbE51bX1gXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY2xpY2tJdGVtKCk6dm9pZCB7XHJcbiAgICAgICAgaWYgKHRoaXMuX2RhdGFTb3VyY2UgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgVGFiYmFyLmdldEluc3RhbmNlKCkub3BlblNjZW5lKCdndWVzc2luZy5zY2VuZScsdGhpcy5fZGF0YVNvdXJjZS5nb29kc0lkKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0Nzo1OFxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0Nzo1OFxyXG4gKiBAZGVzYyDotK3kubDpobXpnaLohJrmnKxcclxuICovXHJcbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xyXG5pbXBvcnQgeyBUb2FzdCB9IGZyb20gXCIuLi92aWV3L1RvYXN0XCI7XHJcbmltcG9ydCB1dGlscyBmcm9tICcuLi9qcy91dGlscydcclxuaW1wb3J0IElwdFBzd0RvbSBmcm9tIFwiLi4vdGVtcGxhdGUvcHN3SW5wdXRcIjtcclxuaW1wb3J0IHsgR2FtZU1vZGVsIH0gZnJvbSBcIi4uL2pzL0dhbWVNb2RlbFwiO1xyXG5pbXBvcnQgYXBpIGZyb20gXCIuLi9qcy9hcGlcIjtcclxuaW1wb3J0IHsgU29ja2V0IH0gZnJvbSBcIi4uL2pzL3NvY2tldFwiO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgR3Vlc3NpbmcgZXh0ZW5kcyB1aS5ndWVzc2luZ1VJIHtcclxuXHJcbiAgICBwcml2YXRlIGdvb2RzSWQ6c3RyaW5nID0gJyc7Ly/llYblk4FJRFxyXG4gICAgcHJpdmF0ZSBfcGVyaW9kOnN0cmluZyA9ICcnOyAvL+acn+WPt1xyXG4gICAgcHJpdmF0ZSBzZWxlY3ROdW1iZXI6bnVtYmVyID0gMDsgLy/pgInkuK3kuKrmlbBcclxuICAgIHByaXZhdGUgdW5pdFByaWNlOm51bWJlciA9IDA7IC8v5Y2V5Lu3XHJcbiAgICBwcml2YXRlIHRvdGFsUHJpY2U6bnVtYmVyID0gMDsgLy/mgLvku7dcclxuICAgIHByaXZhdGUgbXlBbW91bnQ6bnVtYmVyID0gMDsgLy/mgLvotYTkuqdcclxuICAgIHByaXZhdGUgbnVtYmVyQXJyOm51bWJlcltdID0gW107IC8v5pyq6YCJ5Lit55qE5pWw5o2uXHJcbiAgICBwcml2YXRlIGhhbGZBcnI6bnVtYmVyW10gPSBbXTsgLy/kuIDljYrnmoTmnKrpgInkuK3mlbDmja5cclxuICAgIHByaXZhdGUgcmF3RGF0YUFycl9uZXc6YW55W10gPSBbXTsvL+mVnOWDj+aVsOe7hFxyXG4gICAgcHJpdmF0ZSByYXdEYXRhQXJyOmFueVtdID0gW107Ly/ljp/lp4vmlbDmja5cclxuXHJcbiAgICBwcml2YXRlIGlucHV0UHdkOiBJcHRQc3dEb207IC8v5a+G56CB6L6T5YWl5qGGXHJcbiAgICBwcml2YXRlIGNvZGVMaXN0OnN0cmluZyA9ICcnOyAvL+i0reS5sOWPt+eggVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKCl7XHJcbiAgICAgICAgc3VwZXIoKVxyXG5cclxuICAgICAgICB0aGlzLmJ0bl9idXkub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuYnV5RnVuYylcclxuXHJcbiAgICAgICAgLy8g6YCJ5oup5oyJ6ZKu57uE57uR5a6a5LqL5Lu2XHJcbiAgICAgICAgdGhpcy5yYW5kb21fb25lLm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLnNlbGVjdEZ1bmMsWzFdKVxyXG4gICAgICAgIHRoaXMucmFuZG9tX2JlZm9yZS5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5zZWxlY3RGdW5jLFsyXSlcclxuICAgICAgICB0aGlzLnJhbmRvbV9hZnRlci5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5zZWxlY3RGdW5jLFszXSlcclxuICAgICAgICB0aGlzLnJhbmRvbV9hbGwub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuc2VsZWN0RnVuYyxbNF0pXHJcbiAgICB9XHJcblxyXG4gICAgb25FbmFibGUoKTp2b2lkIHtcclxuICAgICAgICBjb25zb2xlLmxvZygn6L+b5YWl6aG16Z2iJyk7XHJcblxyXG4gICAgICAgIC8v6I635Y+W55So5oi36LWE5LqnXHJcbiAgICAgICAgY29uc3QgdXNlckluZm86YW55ID0gR2FtZU1vZGVsLmdldEluc3RhbmNlKCkudXNlckluZm87XHJcbiAgICAgICAgdGhpcy5iYWxhbmNlLnRleHQgPSBgJHt1dGlscy50b0RlY2ltYWwodXNlckluZm8ubW9uZXksMil9IFVTRFRgO1xyXG4gICAgICAgIHRoaXMubXlBbW91bnQgPSArYCR7dXRpbHMudG9EZWNpbWFsKHVzZXJJbmZvLm1vbmV5LDIpfWA7XHJcbiAgICAgICAgaWYgKCF1c2VySW5mby51c2VySWQpIHsgLy/mnKrnmbvlvZXkuI3mmL7npLrmiJHnmoTkvZnpop1cclxuICAgICAgICAgICAgdGhpcy5iYWxhbmNlQm94LnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5lc3RpbWF0ZS55ID0gODA7XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIHRoaXMuYmFsYW5jZUJveC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5lc3RpbWF0ZS55ID0gNDI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIOebkeinhui1hOS6p+WPmOWKqFxyXG4gICAgICAgIEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLm9uKCdnZXRVc2VySW5mbycsdGhpcywoKHVzZXJJbmZvOmFueSk9PntcclxuICAgICAgICAgICAgdGhpcy5iYWxhbmNlLnRleHQgPSBgJHt1dGlscy50b0RlY2ltYWwodXNlckluZm8ubW9uZXksMil9IFVTRFRgO1xyXG4gICAgICAgICAgICB0aGlzLm15QW1vdW50ID0gK2Ake3V0aWxzLnRvRGVjaW1hbCh1c2VySW5mby5tb25leSwyKX1gO1xyXG4gICAgICAgIH0pKVxyXG5cclxuICAgICAgICAvLyDlj7fnoIHooqvotK3kubDlj5jliqhcclxuICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5vbignZ2V0YnV5R29vZHNBcnInLHRoaXMsKGdvb2RzQXJyOmFueSk9PntcclxuICAgICAgICAgICAgdGhpcy5yYXdEYXRhQXJyLmZvckVhY2goKGl0ZW06YW55KT0+e1xyXG4gICAgICAgICAgICAgICAgZ29vZHNBcnIuZm9yRWFjaCgodjphbnkpPT57XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0uY29kZSA9PT0gdi5jb2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0udXNlcklkID0gdi51c2VySWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uYnV5ZXJJZCA9IHYudXNlcklkO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIHRoaXMucHJvZ3Jlc3NTcGVlZC52YWx1ZSA9ICtgJHtnb29kc0Fyci5sZW5ndGggLyB0aGlzLm51bWJlckxpc3QuYXJyYXkubGVuZ3RofWA7XHJcbiAgICAgICAgICAgIHRoaXMuc29sZE51bV9zb2xkTnVtLnRleHQgPSBgJHtnb29kc0Fyci5sZW5ndGh9LyR7dGhpcy5udW1iZXJMaXN0LmFycmF5Lmxlbmd0aH1gO1xyXG4gICAgICAgICAgICB0aGlzLm51bWJlckxpc3QuYXJyYXkgPSB0aGlzLnJhd0RhdGFBcnI7IC8v5Y+356CB5YiX6KGoXHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuICAgIG9uT3BlbmVkKGdvb2RzSWQ6YW55KXtcclxuICAgICAgICB0aGlzLmdvb2RzSWQgPSBnb29kc0lkO1xyXG4gICAgICAgIHRoaXMuZ2V0R29vZHNEZXRhaWxzKHRoaXMuZ29vZHNJZCk7XHJcbiAgICB9XHJcbiAgICBvbkRpc2FibGUoKXtcclxuICAgICAgICAvLyAg5YWz6Zetd2Vic29ja2V05LqL5Lu2XHJcbiAgICAgICAgU29ja2V0LnNlbmRXU1B1c2goYGJ1eV8ke3RoaXMuX3BlcmlvZH1gLDApXHJcbiAgICB9XHJcblxyXG4gICAgLyoq6LSt5LmwICovXHJcbiAgICBwcml2YXRlIGJ1eUZ1bmMoKTp2b2lkIHtcclxuICAgICAgICBsZXQgdXNlckluZm8gPSBPYmplY3Qua2V5cyhHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS51c2VySW5mbyk7XHJcbiAgICAgICAgaWYgKHVzZXJJbmZvLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygn5pyq55m75b2V6Lez6L2s55m75b2VJyk7XHJcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gYGh0dHBzOi8vJHtkb2N1bWVudC5kb21haW59LyMvc2lnbl9vbmVgXHJcbiAgICAgICAgfWVsc2UgaWYgKHRoaXMuZ2V0U2VsZWN0TnVtYmVyKCkgPD0gMCkge1xyXG4gICAgICAgICAgICBUb2FzdC5zaG93KCfor7fpgInmi6notK3kubDlj7fnoIEnKVxyXG4gICAgICAgIH1lbHNlIGlmKHRoaXMudG90YWxQcmljZSA+IHRoaXMubXlBbW91bnQpe1xyXG4gICAgICAgICAgICBUb2FzdC5zaG93KCfkvZnpop3kuI3otrMnKVxyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICB0aGlzLmlucHV0UHdkID0gbmV3IElwdFBzd0RvbSgpXHJcbiAgICAgICAgICAgIHRoaXMuaW5wdXRQd2QucG9wdXAoKTtcclxuICAgICAgICAgICAgdGhpcy5pbnB1dFB3ZC5zZXREYXRhKHsgLy/lj5HpgIHmlbDmja5cclxuICAgICAgICAgICAgICAgIHBlcmlvZDp0aGlzLnBlcmlvZC50ZXh0LFxyXG4gICAgICAgICAgICAgICAgY29kZUxpc3Q6dGhpcy5jb2RlTGlzdCxcclxuICAgICAgICAgICAgICAgIEFsbENvZGVMaXN0OnRoaXMubnVtYmVyTGlzdC5hcnJheVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAvLyDnm5HlkKzovpPlhaXmoYbnu4Tku7bkuovku7ZcclxuICAgICAgICAgICAgdGhpcy5pbnB1dFB3ZC5vbigncmVmcmVzaERhdGEnLHRoaXMsKCk9PntcclxuICAgICAgICAgICAgICAgIHRoaXMuZ2V0R29vZHNEZXRhaWxzKHRoaXMuZ29vZHNJZCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRvdGFsLnRleHQgPSAnMCBVU0RUJztcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiDpgInmi6nmjInpkq7nu4RcclxuICAgICAqIEBwYXJhbSB0eXBlIOmAieaLqeexu+WeiyAgMTrpmo/kuIAgIDLvvJrliY3ljYogM++8muWQjuWNiiA077ya5YWo6YOoXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgc2VsZWN0RnVuYyh0eXBlOm51bWJlcil7XHJcbiAgICAgICAgdGhpcy5yYXdEYXRhQXJyX25ldyA9IHRoaXMucmF3RGF0YUFycjsgLy/liJ3lp4vljJbmlbDnu4RcclxuICAgICAgICB0aGlzLm51bWJlckFyciA9IFtdOy8v5Yid5aeL5YyW5pWw57uEXHJcbiAgICAgICAgdGhpcy5oYWxmQXJyID0gW107Ly/liJ3lp4vljJbmlbDnu4RcclxuXHJcbiAgICAgICAgdGhpcy5yYXdEYXRhQXJyX25ldy5mb3JFYWNoKGl0ZW09PntcclxuICAgICAgICAgICAgaWYgKGl0ZW0uYnV5ZXJJZCA9PT0gJzInKSB7XHJcbiAgICAgICAgICAgICAgICBpdGVtLmJ1eWVySWQgPSAnMCc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGl0ZW0uYnV5ZXJJZCA8PSAyKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm51bWJlckFyci5wdXNoKGl0ZW0uY29kZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGlmICh0eXBlID09PSAxKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmFuZG9tTnVtYmVyKHRoaXMubnVtYmVyQXJyLDEpIC8v6ZqP5LiAXHJcbiAgICAgICAgfWVsc2UgaWYgKHR5cGUgPT09IDIpIHtcclxuICAgICAgICAgICAgdGhpcy5oYWxmQXJyID0gdGhpcy5udW1iZXJBcnIuc2xpY2UoMCxNYXRoLmZsb29yKHRoaXMubnVtYmVyQXJyLmxlbmd0aCAvIDIpKSAgLy/liY3ljYpcclxuICAgICAgICAgICAgdGhpcy5yYW5kb21OdW1iZXIodGhpcy5oYWxmQXJyLDIpXHJcbiAgICAgICAgfWVsc2UgaWYodHlwZSA9PT0gMykge1xyXG4gICAgICAgICAgICB0aGlzLmhhbGZBcnIgPSB0aGlzLm51bWJlckFyci5zbGljZShNYXRoLmZsb29yKHRoaXMubnVtYmVyQXJyLmxlbmd0aCAvIDIpKSAgLy/lkI7ljYpcclxuICAgICAgICAgICAgdGhpcy5yYW5kb21OdW1iZXIodGhpcy5oYWxmQXJyLDIpXHJcbiAgICAgICAgfWVsc2UgaWYodHlwZSA9PT0gNCkge1xyXG4gICAgICAgICAgICB0aGlzLmhhbGZBcnIgPSB0aGlzLm51bWJlckFycjsvL+WFqOmDqFxyXG4gICAgICAgICAgICB0aGlzLnJhbmRvbU51bWJlcih0aGlzLmhhbGZBcnIsMilcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoq5LuO5pWw57uE5Lit6ZqP5py65Y+W5LiA5Liq5pWwXHJcbiAgICAgKiBAcGFyYW0gYXJyIOaVsOaNruWIl+ihqFxyXG4gICAgICogQHBhcmFtIHR5cGUgW+WPr+mAiV0g6ZqP5py657G75Z6LXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgcmFuZG9tTnVtYmVyKGFycjpudW1iZXJbXSx0eXBlPzpudW1iZXIpe1xyXG4gICAgICAgIGNvbnN0IHJhbmQ6bnVtYmVyID0gTWF0aC5mbG9vcigoTWF0aC5yYW5kb20oKSAqIGFyci5sZW5ndGgpKTsgLy/pmo/kuIBcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCBjb2RlID0gYXJyW3JhbmRdO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmICh0eXBlID09PSAxKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmF3RGF0YUFycl9uZXcuZm9yRWFjaChpdGVtID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChpdGVtLmNvZGUgPT09IGNvZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtLmJ1eWVySWQgPSAnMic7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHR5cGUgPT09IDIpIHtcclxuICAgICAgICAgICAgYXJyLmZvckVhY2goZWwgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yYXdEYXRhQXJyX25ldy5mb3JFYWNoKGl0ZW0gPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChlbCA9PT0gaXRlbS5jb2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uYnV5ZXJJZCA9ICcyJztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyB0aGlzLm51bWJlckxpc3QucmVwZWF0WSA9IHRoaXMucmF3RGF0YUFycl9uZXcubGVuZ3RoO1xyXG4gICAgICAgIHRoaXMubnVtYmVyTGlzdC5hcnJheSA9IHRoaXMucmF3RGF0YUFycl9uZXc7XHJcbiAgICAgICAgdGhpcy5nZXRTZWxlY3ROdW1iZXIoKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKuiOt+WPluWVhuWTgeivpuaDhVxyXG4gICAgICogQHBhcmFtIGdvb2RzSWQg5ZWG5ZOBaWRcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBnZXRHb29kc0RldGFpbHMoZ29vZHNJZDpzdHJpbmcpIHtcclxuICAgICAgICBhcGkuZ2V0R29vZHNEZXRhaWxzKGdvb2RzSWQpLnRoZW4oKHJlczphbnkpPT57XHJcblxyXG4gICAgICAgICAgICAvLyAg5Y+R6YCBd2Vic29ja2V05LqL5Lu2XHJcbiAgICAgICAgICAgIHRoaXMuX3BlcmlvZCA9IHJlcy5wZXJpb2Q7XHJcbiAgICAgICAgICAgIFNvY2tldC5zZW5kV1NQdXNoKGBidXlfJHt0aGlzLl9wZXJpb2R9YClcclxuXHJcbiAgICAgICAgICAgIHRoaXMucHJpY2UudGV4dCA9IGAkeytyZXMucHJpY2V9YDtcclxuICAgICAgICAgICAgdGhpcy5nb29kc1ZhbHVlLnRleHQgPSBgJHsrcmVzLmdvb2RzVmFsdWV9IFVTRFRgO1xyXG4gICAgICAgICAgICB0aGlzLnByb2dyZXNzU3BlZWQudmFsdWUgPSArYCR7cmVzLnNvbGROdW0vcmVzLnRvdGFsTnVtfWA7XHJcbiAgICAgICAgICAgIHRoaXMuc29sZE51bV9zb2xkTnVtLnRleHQgPSBgJHtyZXMuc29sZE51bX0vJHtyZXMudG90YWxOdW19YDtcclxuICAgICAgICAgICAgdGhpcy5wZXJpb2QudGV4dCA9IHJlcy5wZXJpb2Q7XHJcbiAgICAgICAgICAgIHRoaXMudW5pdFByaWNlID0gK3Jlcy5wcmljZTtcclxuICAgICAgICAgICAgdGhpcy5yYXdEYXRhQXJyID0gcmVzLmNvZGVMaXN0O1xyXG4gICAgICAgICAgICB0aGlzLm51bWJlckxpc3QuYXJyYXkgPSB0aGlzLnJhd0RhdGFBcnI7IC8v5Y+356CB5YiX6KGoXHJcbiAgICAgICAgICAgIHRoaXMucmFuZG9tX29uZS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgaWYgKHRoaXMubnVtYmVyTGlzdC5hcnJheS5sZW5ndGggPiAyKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJhbmRvbV9hZnRlci52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMucmFuZG9tX2JlZm9yZS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMucmFuZG9tX2FsbC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJhbmRvbV9vbmUud2lkdGggPSAzMDA7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJhbmRvbV9vbmUuY2VudGVyWCA9IDA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5udW1iZXJMaXN0LnJlcGVhdFggPSA1O1xyXG4gICAgICAgICAgICB0aGlzLm51bWJlckxpc3QucmVwZWF0WSA9IDQ7XHJcbiAgICAgICAgICAgIHRoaXMubnVtYmVyTGlzdC5jZWxscy5mb3JFYWNoKChpdGVtOiBMYXlhLlNwcml0ZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaXRlbS5vbihcIkdldEl0ZW1cIiwgdGhpcywgdGhpcy5nZXRTZWxlY3ROdW1iZXIpXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSkuY2F0Y2goKGVycjphbnkpPT57XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyci5tZXNzYWdlKTtcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIC8qKuebkeWQrOe7n+iuoeWIl+ihqOaVsOaNrumAieS4reS4quaVsCAqL1xyXG4gICAgcHJpdmF0ZSBnZXRTZWxlY3ROdW1iZXIoKXtcclxuICAgICAgICB0aGlzLnNlbGVjdE51bWJlciA9IDA7XHJcbiAgICAgICAgdGhpcy5jb2RlTGlzdCA9ICcnO1xyXG4gICAgICAgIHRoaXMubnVtYmVyTGlzdC5hcnJheS5mb3JFYWNoKGl0ZW09PntcclxuICAgICAgICAgICAgaWYgKGl0ZW0uYnV5ZXJJZCA9PT0gJzInKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdE51bWJlciA9IHRoaXMuc2VsZWN0TnVtYmVyICsgMTtcclxuICAgICAgICAgICAgICAgIGxldCBjb2RlU3RyaW5nOnN0cmluZyA9IGAke3RoaXMuY29kZUxpc3R9JHt0aGlzLmNvZGVMaXN0Lmxlbmd0aCA+IDAgPyAnLCc6Jyd9JHtpdGVtLmNvZGV9YDtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29kZUxpc3QgPSAgY29kZVN0cmluZztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgdGhpcy50b3RhbC50ZXh0ID0gdXRpbHMudG9EZWNpbWFsKCh0aGlzLnVuaXRQcmljZSAqIHRoaXMuc2VsZWN0TnVtYmVyKSwyKSArICcgVVNEVCc7XHJcbiAgICAgICAgdGhpcy50b3RhbFByaWNlID0gK3V0aWxzLnRvRGVjaW1hbCgodGhpcy51bml0UHJpY2UgKiB0aGlzLnNlbGVjdE51bWJlciksMik7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzLnNlbGVjdE51bWJlcjtcclxuICAgIH1cclxufSIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0ODoxNlxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0ODoxNlxyXG4gKiBAZGVzYyDpppbpobXohJrmnKxcclxuICovXHJcbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xyXG5pbXBvcnQgeyBUb2FzdCB9IGZyb20gXCIuLi92aWV3L1RvYXN0XCI7XHJcbmltcG9ydCB7IEdhbWVNb2RlbCB9IGZyb20gXCIuLi9qcy9HYW1lTW9kZWxcIjtcclxuaW1wb3J0IHV0aWxzIGZyb20gJy4uL2pzL3V0aWxzJ1xyXG5pbXBvcnQgYXBpIGZyb20gXCIuLi9qcy9hcGlcIjtcclxuXHJcbmltcG9ydCB7IHBvc3QgfSBmcm9tICcuLi9qcy9odHRwJztcclxuaW1wb3J0IHsgU29ja2V0IH0gZnJvbSBcIi4uL2pzL3NvY2tldFwiO1xyXG5pbXBvcnQgeyBUYWJiYXIgfSBmcm9tIFwiLi4vdmlldy9UYWJiYXJcIjtcclxuaW1wb3J0IHJlY2hhcmdlRGlhbG9nIGZyb20gJy4uL3RlbXBsYXRlL3JlY2hhcmdlRGlhbG9nJztcclxuXHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBIb21lIGV4dGVuZHMgdWkuaG9tZVVJIHtcclxuXHJcbiAgICBwcml2YXRlIHJlY2hhcmdlRGlhbG9nOiByZWNoYXJnZURpYWxvZzsvL+WFheWAvOW8ueWHulxyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKClcclxuICAgICAgICB0aGlzLnJlY2hhcmdlQm94Lm9uKExheWEuRXZlbnQuQ0xJQ0ssIHRoaXMsIHRoaXMuYnRuUmVjaGFyZ2VGdW5jKTtcclxuICAgICAgICB0aGlzLmJ1eUhlbHAub24oTGF5YS5FdmVudC5DTElDSywgdGhpcywgdGhpcy5vcGVuQnV5SGVscClcclxuICAgICAgICB0aGlzLnB1dGluLm9uKExheWEuRXZlbnQuQ0xJQ0ssIHRoaXMsIHRoaXMucHV0SW5GdW5jKVxyXG4gICAgICAgIHRoaXMuZ29fY2VudGVyLm9uKExheWEuRXZlbnQuQ0xJQ0ssIHRoaXMsIHRoaXMuZ29DZW50ZXIpXHJcbiAgICB9XHJcbiAgICBvbkVuYWJsZSgpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLmdldFVzZXJJbmZvKClcclxuICAgICAgICB0aGlzLnJhbmtUb2RheSgpXHJcbiAgICAgICAgdGhpcy5nZXRHb29kc0xpc3QoKVxyXG5cclxuICAgICAgICAvLyDnm5Hop4bngavnrq3mlbDmja7lj5jliqhcclxuICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5vbignZ2V0Um9ja2V0RGF0YScsIHRoaXMsIChyZXM6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnJvY2tldEFtb3VudC50ZXh0ID0gYCR7dXRpbHMudG9EZWNpbWFsKHJlcy5wb3RNb25leSwgMil9YFxyXG4gICAgICAgICAgICB1dGlscy5jb3VudERvd24ocmVzLmNvdW50RG93biwgKCh0aW1lKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJvY2tldENvdW50RG93bi50ZXh0ID0gdGltZVxyXG4gICAgICAgICAgICB9KSlcclxuICAgICAgICB9KVxyXG4gICAgICAgIC8vIOaYr+WQpuW8gOWlluS6hu+8jOW8gOWlluWIt+aWsOWVhuWTgeWIl+ihqFxyXG4gICAgICAgIEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLm9uKCdpc1RvZ2dsZScsIHRoaXMsIChyZXM6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmdldEdvb2RzTGlzdCgpXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICB9XHJcblxyXG5cclxuICAgIC8qKuWFheWAvCAqL1xyXG4gICAgcHJpdmF0ZSBidG5SZWNoYXJnZUZ1bmMoKTogdm9pZCB7XHJcbiAgICAgICAgLy8gVG9hc3Quc2hvdygn54K55Ye75YWF5YC8JylcclxuICAgICAgICB0aGlzLnJlY2hhcmdlRGlhbG9nID0gbmV3IHJlY2hhcmdlRGlhbG9nKCk7XHJcbiAgICAgICAgdGhpcy5yZWNoYXJnZURpYWxvZy55ID0gTGF5YS5zdGFnZS5oZWlnaHQgLSB0aGlzLnJlY2hhcmdlRGlhbG9nLmhlaWdodDtcclxuICAgICAgICB0aGlzLnJlY2hhcmdlRGlhbG9nLnBvcHVwRWZmZWN0ID0gTGF5YS5IYW5kbGVyLmNyZWF0ZSh0aGlzLCB0aGlzLnJlY2hhcmdlRGlhbG9nUG9wdXBGdW4pO1xyXG4gICAgICAgIHRoaXMucmVjaGFyZ2VEaWFsb2cuY2xvc2VFZmZlY3QgPSBMYXlhLkhhbmRsZXIuY3JlYXRlKHRoaXMsIHRoaXMucmVjaGFyZ2VEaWFsb2dDbG9zZUZ1bik7XHJcbiAgICAgICAgdGhpcy5yZWNoYXJnZURpYWxvZy5wb3B1cCgpO1xyXG4gICAgfVxyXG4gICAgLyoq56m65oqVICovXHJcbiAgICBwcml2YXRlIHB1dEluRnVuYygpIHtcclxuICAgICAgICAvLyBUYWJiYXIuZ2V0SW5zdGFuY2UoKS5vcGVuU2NlbmUoJ3hjdGouc2NlbmUnKVxyXG4gICAgICAgIFRvYXN0LnNob3coJ+aaguacquW8gOaUvu+8jOaVrOivt+acn+W+hScpXHJcbiAgICB9XHJcblxyXG4gICAgLyoq6I635Y+W5Liq5Lq65L+h5oGvICovXHJcbiAgICBwcml2YXRlIGdldFVzZXJJbmZvKCkge1xyXG4gICAgICAgIGFwaS5nZXRVc2VySW5mbygpLnRoZW4oKHJlczogYW55KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMubmlja05hbWUudGV4dCA9IHJlcy51c2VySW5mby5uaWNrTmFtZVxyXG4gICAgICAgICAgICB0aGlzLm15QW1vdW50LnRleHQgPSBgJHt1dGlscy50b0RlY2ltYWwocmVzLnVzZXJJbmZvLm1vbmV5LCAyKX1gXHJcbiAgICAgICAgICAgIHRoaXMuYXZhdGFyLnNraW4gPSByZXMudXNlckluZm8uYXZhdGFyO1xyXG4gICAgICAgIH0pLmNhdGNoKChlcnI6IGFueSkgPT4ge1xyXG4gICAgICAgICAgIFxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgLyoq5LuK5pel5aSn5aWW5rGgICovXHJcbiAgICBwcml2YXRlIHJhbmtUb2RheSgpIHtcclxuICAgICAgICBhcGkuZ2V0UmFua1RvZGF5KCkudGhlbigocmVzOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5yb2NrZXRBbW91bnQudGV4dCA9IGAke3V0aWxzLnRvRGVjaW1hbChyZXMucG90TW9uZXksIDIpfWBcclxuICAgICAgICAgICAgdXRpbHMuY291bnREb3duKHJlcy5jb3VudERvd24sICgodGltZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yb2NrZXRDb3VudERvd24udGV4dCA9IHRpbWVcclxuICAgICAgICAgICAgfSkpXHJcbiAgICAgICAgfSkuY2F0Y2goKGVycjogYW55KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyci5tZXNzYWdlKTtcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIC8qKuiOt+WPlummlumhteWVhuWTgeWIl+ihqCAqL1xyXG4gICAgcHJpdmF0ZSBnZXRHb29kc0xpc3QoKSB7XHJcbiAgICAgICAgYXBpLmdldEdvb2RzTGlzdCgpLnRoZW4oKHJlczogYW55KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMubGlzdC5yZXBlYXRYID0gcmVzLmxpc3QubGVuZ3RoO1xyXG4gICAgICAgICAgICB0aGlzLmxpc3QuYXJyYXkgPSByZXMubGlzdDtcclxuICAgICAgICB9KS5jYXRjaCgoZXJyOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyLm1lc3NhZ2UpO1xyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgLyoq546p5rOV5LuL57uNICovXHJcbiAgICBwcml2YXRlIG9wZW5CdXlIZWxwKCkge1xyXG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gJ2h0dHBzOi8vbS54eWhqLmlvL2J1eUhlbHAuaHRtbCc7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnb0NlbnRlcigpIHtcclxuICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IGBodHRwczovLyR7ZG9jdW1lbnQuZG9tYWlufS8jL21haW5fUGFnZWBcclxuICAgIH1cclxuXHJcbiAgICAvKirlvLnlh7rlhYXlgLznmoTmlYjmnpwgKi9cclxuICAgIHJlY2hhcmdlRGlhbG9nUG9wdXBGdW4oZGlhbG9nOiBMYXlhLkRpYWxvZykge1xyXG4gICAgICAgIGRpYWxvZy5zY2FsZSgxLCAxKTtcclxuICAgICAgICBkaWFsb2cuX2VmZmVjdFR3ZWVuID0gTGF5YS5Ud2Vlbi5mcm9tKGRpYWxvZyxcclxuICAgICAgICAgICAgeyB4OiAwLCB5OiBMYXlhLnN0YWdlLmhlaWdodCArIGRpYWxvZy5oZWlnaHQgfSxcclxuICAgICAgICAgICAgMzAwLFxyXG4gICAgICAgICAgICBMYXlhLkVhc2UubGluZWFyTm9uZSxcclxuICAgICAgICAgICAgTGF5YS5IYW5kbGVyLmNyZWF0ZShMYXlhLkRpYWxvZy5tYW5hZ2VyLCBMYXlhLkRpYWxvZy5tYW5hZ2VyLmRvT3BlbiwgW2RpYWxvZ10pLCAwLCBmYWxzZSwgZmFsc2UpO1xyXG4gICAgfVxyXG4gICAgLyoq5YWz6Zet5YWF5YC855qE5pWI5p6cICovXHJcbiAgICByZWNoYXJnZURpYWxvZ0Nsb3NlRnVuKGRpYWxvZzogTGF5YS5EaWFsb2cpIHtcclxuICAgICAgICBkaWFsb2cuX2VmZmVjdFR3ZWVuID0gTGF5YS5Ud2Vlbi50byhkaWFsb2csXHJcbiAgICAgICAgICAgIHsgeDogMCwgeTogTGF5YS5zdGFnZS5oZWlnaHQgKyBkaWFsb2cuaGVpZ2h0IH0sXHJcbiAgICAgICAgICAgIDMwMCxcclxuICAgICAgICAgICAgTGF5YS5FYXNlLmxpbmVhck5vbmUsXHJcbiAgICAgICAgICAgIExheWEuSGFuZGxlci5jcmVhdGUoTGF5YS5EaWFsb2cubWFuYWdlciwgTGF5YS5EaWFsb2cubWFuYWdlci5kb0Nsb3NlLCBbZGlhbG9nXSksIDAsIGZhbHNlLCBmYWxzZSk7XHJcbiAgICB9XHJcbn0iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDg6MjhcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDg6MjhcclxuICogQGRlc2Mg6K6w5b2V6aG16Z2i6ISa5pysXHJcbiAqL1xyXG5pbXBvcnQgeyB1aSB9IGZyb20gJy4uL3VpL2xheWFNYXhVSSdcclxuaW1wb3J0IGFwaSBmcm9tICcuLi9qcy9hcGknO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVjb3JkIGV4dGVuZHMgdWkucmVjb3JkVUkge1xyXG5cclxuICAgIHN0YXRpYyByZWFkb25seSBIQUxGX1NDUk9MTF9FTEFTVElDX0RJU1RBTkNFOiBudW1iZXIgPSAxMDA7XHJcbiAgICBwcml2YXRlIF9pc1Njcm9sbE92ZXJFbGFzdGljRGlzdGFuY2U6IGJvb2xlYW47XHJcbiAgICBwcml2YXRlIHBhZ2U6bnVtYmVyID0gMTtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcigpe1xyXG4gICAgICAgIHN1cGVyKClcclxuXHJcbiAgICAgICAgdGhpcy5jYW55dS5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy50YWJTd2l0Y2gsWzFdKVxyXG4gICAgICAgIHRoaXMud2FuZ3FpLm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLnRhYlN3aXRjaCxbMl0pXHJcbiAgICAgICAgdGhpcy5vbihMYXlhLkV2ZW50LlJFU0laRSx0aGlzLHRoaXMub25SZXNpemUpXHJcbiAgICB9XHJcblxyXG4gICAgb25FbmFibGUoKTp2b2lke1xyXG4gICAgICAgIHRoaXMuZ2V0TXlPcmRlcnMoKTtcclxuICAgICAgICAvLyB0aGlzLmdldEdvb2RzSGlzdG9yeSgpO1xyXG5cclxuICAgICAgICAvL+WPguS4juiusOW9lea7muWKqOWKoOi9veabtOWkmlxyXG4gICAgICAgIHRoaXMuam9pbkxpc3Quc2Nyb2xsQmFyLmNoYW5nZUhhbmRsZXIgPSBMYXlhLkhhbmRsZXIuY3JlYXRlKHRoaXMsdGhpcy5vbkpvaW5MaXN0U2Nyb2xsQ2hhbmdlLG51bGwsZmFsc2UpXHJcbiAgICAgICAgdGhpcy5qb2luTGlzdC5zY3JvbGxCYXIub24oTGF5YS5FdmVudC5FTkQsIHRoaXMsIHRoaXMub25Kb2luTGlzdFNjcm9sbEVuZClcclxuICAgICAgICAvL+W+gOacn+iusOW9lea7muWKqOWKoOi9veabtOWkmlxyXG4gICAgICAgIHRoaXMucHJldmlvb3VzTGlzdC5zY3JvbGxCYXIuY2hhbmdlSGFuZGxlciA9IExheWEuSGFuZGxlci5jcmVhdGUodGhpcyx0aGlzLm9uUHJldmlvb3VzTGlzdFNjcm9sbENoYW5nZSxudWxsLGZhbHNlKVxyXG4gICAgICAgIHRoaXMucHJldmlvb3VzTGlzdC5zY3JvbGxCYXIub24oTGF5YS5FdmVudC5FTkQsIHRoaXMsIHRoaXMub25QcmV2aW9vdXNMaXN0U2Nyb2xsRW5kKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKuiOt+WPluWPguS4juiusOW9lSAqL1xyXG4gICAgcHJpdmF0ZSBnZXRNeU9yZGVycyhwYWdlID0gMSl7XHJcbiAgICAgICAgYXBpLmdldE15T3JkZXJzKHBhZ2UpLnRoZW4oKHJlczphbnkpPT57XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmpvaW5MaXN0LmFycmF5ICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmpvaW5MaXN0LmFycmF5ID0gWy4uLnRoaXMuam9pbkxpc3QuYXJyYXksLi4ucmVzXVxyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIHRoaXMuam9pbkxpc3QuYXJyYXkgPSByZXM7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRoaXMuam9pbkxpc3QuYXJyYXkubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5qb2luTGlzdC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pLmNhdGNoKChlcnI6YW55KT0+e1xyXG4gICAgICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyLm1lc3NhZ2UpO1xyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcbiAgICAvKirojrflj5blvoDmnJ/orrDlvZUgKi9cclxuICAgIHByaXZhdGUgZ2V0R29vZHNIaXN0b3J5KHBhZ2U/Om51bWJlcil7XHJcbiAgICAgICAgYXBpLmdldEdvb2RzSGlzdG9yeShwYWdlKS50aGVuKChyZXM6YW55KT0+e1xyXG4gICAgICAgICAgICBpZiAodGhpcy5wcmV2aW9vdXNMaXN0LmFycmF5ICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnByZXZpb291c0xpc3QuYXJyYXkgPSBbLi4udGhpcy5wcmV2aW9vdXNMaXN0LmFycmF5LC4uLnJlc11cclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnByZXZpb291c0xpc3QuYXJyYXkgPSByZXM7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRoaXMucHJldmlvb3VzTGlzdC5hcnJheS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnByZXZpb291c0xpc3QudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KS5jYXRjaCgoZXJyOmFueSk9PntcclxuICAgICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyci5tZXNzYWdlKTtcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5YiH5o2i6K6w5b2V5YiX6KGoXHJcbiAgICAgKiBAcGFyYW0gdHlwZSAxOuWPguS4juiusOW9lSAgMu+8muW+gOacn+iusOW9lVxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIHRhYlN3aXRjaCh0eXBlOm51bWJlcil7XHJcbiAgICAgICAgdGhpcy5wYWdlID0gMTtcclxuICAgICAgICBpZiAodHlwZSA9PT0gMSkge1xyXG4gICAgICAgICAgICB0aGlzLmNhbnl1LnNraW4gPSAnY29tcC9pbWdfdGFiX2FjdGl2ZS5wbmcnO1xyXG4gICAgICAgICAgICB0aGlzLndhbmdxaS5za2luID0gJ2NvbXAvaW1nX3RhYi5wbmcnO1xyXG4gICAgICAgICAgICB0aGlzLmdldE15T3JkZXJzKClcclxuICAgICAgICAgICAgdGhpcy5wcmV2aW9vdXNMaXN0LnNjcm9sbFRvKDApXHJcbiAgICAgICAgICAgIHRoaXMucHJldmlvb3VzTGlzdC52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMucHJldmlvb3VzTGlzdC5hcnJheSA9IFtdO1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICB0aGlzLndhbmdxaS5za2luID0gJ2NvbXAvaW1nX3RhYl9hY3RpdmUucG5nJztcclxuICAgICAgICAgICAgdGhpcy5jYW55dS5za2luID0gJ2NvbXAvaW1nX3RhYi5wbmcnO1xyXG4gICAgICAgICAgICB0aGlzLmdldEdvb2RzSGlzdG9yeSgpO1xyXG4gICAgICAgICAgICB0aGlzLmpvaW5MaXN0LnNjcm9sbFRvKDApO1xyXG4gICAgICAgICAgICB0aGlzLmpvaW5MaXN0LnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5qb2luTGlzdC5hcnJheSA9IFtdO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKirnm5Hop4blsY/luZXlpKflsI/lj5jljJYgKi9cclxuICAgIG9uUmVzaXplKCl7XHJcbiAgICAgICAgLy/liJfooajpq5jluqbpgILphY0gPSDlsY/luZXpq5jluqYgLSAoYmFubmVyICsgdGFiYmFyKVxyXG4gICAgICAgIHRoaXMuam9pbkxpc3QuaGVpZ2h0ID0gdGhpcy5oZWlnaHQgLSA0MzA7XHJcbiAgICAgICAgdGhpcy5wcmV2aW9vdXNMaXN0LmhlaWdodCA9IHRoaXMuaGVpZ2h0IC0gNDMwO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKuWPguS4juiusOW9leWIl+ihqOa7muWKqCAqL1xyXG4gICAgcHJpdmF0ZSBvbkpvaW5MaXN0U2Nyb2xsQ2hhbmdlKHY6YW55KSB7XHJcbiAgICAgICAgaWYgKHYgPiB0aGlzLmpvaW5MaXN0LnNjcm9sbEJhci5tYXggKyBSZWNvcmQuSEFMRl9TQ1JPTExfRUxBU1RJQ19ESVNUQU5DRSkge1xyXG4gICAgICAgICAgICB0aGlzLl9pc1Njcm9sbE92ZXJFbGFzdGljRGlzdGFuY2UgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHByaXZhdGUgb25Kb2luTGlzdFNjcm9sbEVuZCgpe1xyXG4gICAgICAgIGlmICh0aGlzLl9pc1Njcm9sbE92ZXJFbGFzdGljRGlzdGFuY2UpIHtcclxuICAgICAgICAgICAgdGhpcy5faXNTY3JvbGxPdmVyRWxhc3RpY0Rpc3RhbmNlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIC8vIHRoaXMuZXZlbnQoR2FtZUV2ZW50Lk5FWFRfUEFHRSk7XHJcbiAgICAgICAgICAgIHRoaXMucGFnZSA9IHRoaXMucGFnZSArIDE7XHJcbiAgICAgICAgICAgIHRoaXMuZ2V0TXlPcmRlcnModGhpcy5wYWdlKVxyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhMb2dGbGFnLmdldChMb2dGbGFnLlVJKSwgXCJuZXh0IHBhZ2VcIik7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKirlj4LkuI7orrDlvZXliJfooajmu5rliqggKi9cclxuICAgIHByaXZhdGUgb25QcmV2aW9vdXNMaXN0U2Nyb2xsQ2hhbmdlKHY6YW55KSB7XHJcbiAgICAgICAgaWYgKHYgPiB0aGlzLnByZXZpb291c0xpc3Quc2Nyb2xsQmFyLm1heCArIFJlY29yZC5IQUxGX1NDUk9MTF9FTEFTVElDX0RJU1RBTkNFKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2lzU2Nyb2xsT3ZlckVsYXN0aWNEaXN0YW5jZSA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcHJpdmF0ZSBvblByZXZpb291c0xpc3RTY3JvbGxFbmQoKXtcclxuICAgICAgICBpZiAodGhpcy5faXNTY3JvbGxPdmVyRWxhc3RpY0Rpc3RhbmNlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2lzU2Nyb2xsT3ZlckVsYXN0aWNEaXN0YW5jZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLnBhZ2UgPSB0aGlzLnBhZ2UgKyAxO1xyXG4gICAgICAgICAgICB0aGlzLmdldEdvb2RzSGlzdG9yeSh0aGlzLnBhZ2UpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTIwIDEwOjI3OjI1XHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTIwIDEwOjI3OjI1XHJcbiAqIEBkZXNjIOeBq+eureWkp+WllumhtemdolxyXG4gKi9cclxuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XHJcbmltcG9ydCB7IGdldCB9IGZyb20gXCIuLi9qcy9odHRwXCI7XHJcbmltcG9ydCB1dGlscyBmcm9tIFwiLi4vanMvdXRpbHNcIjtcclxuaW1wb3J0IGFwaSBmcm9tIFwiLi4vanMvYXBpXCI7XHJcbmltcG9ydCB7IFRhYmJhciB9IGZyb20gXCIuLi92aWV3L1RhYmJhclwiO1xyXG5pbXBvcnQgeyBHYW1lTW9kZWwgfSBmcm9tIFwiLi4vanMvR2FtZU1vZGVsXCI7XHJcblxyXG4gZXhwb3J0IGRlZmF1bHQgY2xhc3MgZ3JhbmRQcml4IGV4dGVuZHMgdWkuZ3JhbmRQcml4VUkge1xyXG4gICAgIGNvbnN0cnVjdG9yKCl7XHJcbiAgICAgICAgIHN1cGVyKClcclxuICAgICAgICAgdGhpcy5yYW5rUHJpemVIZWxwLm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLm9wZW5SYW5rUHJpemVIZWxwKVxyXG4gICAgICAgICB0aGlzLmJ0bl9oaXN0b3J5Lm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLkJ0bmhpc3RvcnkpXHJcbiAgICAgfVxyXG5cclxuICAgICBvbkVuYWJsZSgpe1xyXG4gICAgICAgIHRoaXMuZ2V0UmFua1RvZGF5KClcclxuICAgICAgICBMYXlhLnN0YWdlLm9uKExheWEuRXZlbnQuUkVTSVpFLHRoaXMsdGhpcy5vblJlc2l6ZSlcclxuICAgICAgICB0aGlzLm9uUmVzaXplKClcclxuICAgICAgICAvLyDnm5Hop4bngavnrq3mlbDmja7lj5jliqhcclxuICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5vbignZ2V0Um9ja2V0RGF0YScsdGhpcywocmVzOmFueSkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmJvbnVzLnRleHQgPSBgJHt1dGlscy50b0RlY2ltYWwocmVzLnBvdE1vbmV5LDIpfWAgXHJcbiAgICAgICAgICAgIHV0aWxzLmNvdW50RG93bihyZXMuY291bnREb3duLCgodGltZSk9PntcclxuICAgICAgICAgICAgICAgIHRoaXMuQ291bnREb3duLnRleHQgPSB0aW1lXHJcbiAgICAgICAgICAgIH0pKVxyXG4gICAgICAgIH0pXHJcbiAgICAgfVxyXG4gICAgIG9uRGlzYWJsZSgpOnZvaWQge1xyXG4gICAgICAgIExheWEuc3RhZ2Uub2ZmKExheWEuRXZlbnQuUkVTSVpFLHRoaXMsdGhpcy5vblJlc2l6ZSlcclxuICAgIH1cclxuXHJcbiAgICAgLyoq6I635Y+W5aSn5aWW5L+h5oGvICovXHJcbiAgICBwcml2YXRlIGdldFJhbmtUb2RheSgpe1xyXG4gICAgICAgIGFwaS5nZXRSYW5rVG9kYXkoKS50aGVuKChyZXM6YW55KT0+e1xyXG4gICAgICAgICAgICB0aGlzLmJvbnVzLnRleHQgPSBgJHt1dGlscy50b0RlY2ltYWwocmVzLnBvdE1vbmV5LDIpfWAgXHJcbiAgICAgICAgICAgIHV0aWxzLmNvdW50RG93bihyZXMuY291bnREb3duLCgodGltZSk9PntcclxuICAgICAgICAgICAgICAgIHRoaXMuQ291bnREb3duLnRleHQgPSB0aW1lXHJcbiAgICAgICAgICAgIH0pKVxyXG4gICAgICAgICAgICBpZiAocmVzLmxpc3QubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvL+esrOS4gOWQjVxyXG4gICAgICAgICAgICBpZiAocmVzLmxpc3QubGlzdDEuZGF0YS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJveDEudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFsb25lMS50ZXh0ID0gYOeLrOW+lyAke3V0aWxzLnRvRGVjaW1hbChyZXMubGlzdC5saXN0MS5kaXZpZG1vbmV5LDIpfSBVU0RUYFxyXG4gICAgICAgICAgICAgICAgdGhpcy5Qcm9wb3J0aW9uMS50ZXh0ID0gYOWNoOWlluaxoCR7cmVzLmxpc3QubGlzdDEucGVyY2VudH1gXHJcbiAgICAgICAgICAgICAgICB0aGlzLnByaXhMaXN0MS5hcnJheSA9IHJlcy5saXN0Lmxpc3QxLmRhdGFcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyAyLTXlkI1cclxuICAgICAgICAgICAgaWYgKHJlcy5saXN0Lmxpc3QyLmRhdGEubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ib3gyLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hbG9uZTIudGV4dCA9IGDmr4/kurogJHt1dGlscy50b0RlY2ltYWwocmVzLmxpc3QubGlzdDIuZGl2aWRtb25leS80LDIpfSBVU0RUYFxyXG4gICAgICAgICAgICAgICAgdGhpcy5Qcm9wb3J0aW9uMi50ZXh0ID0gYOWNoOWlluaxoCR7cmVzLmxpc3QubGlzdDIucGVyY2VudH1gXHJcbiAgICAgICAgICAgICAgICB0aGlzLnByaXhMaXN0Mi5hcnJheSA9IHJlcy5saXN0Lmxpc3QyLmRhdGFcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyA1LTE15ZCNXHJcbiAgICAgICAgICAgIGlmIChyZXMubGlzdC5saXN0My5kYXRhLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYm94My52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYWxvbmUzLnRleHQgPSBg5q+P5Lq6ICR7dXRpbHMudG9EZWNpbWFsKHJlcy5saXN0Lmxpc3QzLmRpdmlkbW9uZXkvMTAsMil9IFVTRFRgXHJcbiAgICAgICAgICAgICAgICB0aGlzLlByb3BvcnRpb24zLnRleHQgPSBg5Y2g5aWW5rGgJHtyZXMubGlzdC5saXN0My5wZXJjZW50fWBcclxuICAgICAgICAgICAgICAgIHRoaXMucHJpeExpc3QzLmFycmF5ID0gcmVzLmxpc3QubGlzdDMuZGF0YVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8v5pyq55m75b2V5YiZ5LiN5pi+56S65Liq5Lq65o6S5ZCNXHJcbiAgICAgICAgICAgIGlmIChyZXMubGlzdC5zZWxmLnVzZXJJZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5teVJhbmtCb3gudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm15cmFua2luZy50ZXh0ID0gcmVzLmxpc3Quc2VsZi5yYW5rID4gMTUgPyAnMTUrJyA6IGAke3Jlcy5saXN0LnNlbGYucmFua31gO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hdmF0YXIuc2tpbiA9IHJlcy5saXN0LnNlbGYuYXZhdGFyO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5uaWNrTmFtZS50ZXh0ID0gcmVzLmxpc3Quc2VsZi5uaWNrTmFtZTtcclxuICAgICAgICAgICAgICAgIHRoaXMudWlkLnRleHQgPSByZXMubGlzdC5zZWxmLnVzZXJJZDtcclxuICAgICAgICAgICAgICAgIHRoaXMudm9sdW1lLnRleHQgPSBgJHt1dGlscy50b0RlY2ltYWwocmVzLmxpc3Quc2VsZi5jb25zdW0sMil9IFVTRFRgXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KS5jYXRjaCgoZXJyOmFueSk9PntcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyLm1lc3NhZ2UpO1xyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBCdG5oaXN0b3J5KCl7XHJcbiAgICAgICAgVGFiYmFyLmdldEluc3RhbmNlKCkub3BlblNjZW5lKCdwcmlIaXN0b3J5U2NlbmUuc2NlbmUnKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKuivtOaYjiAqL1xyXG4gICAgcHJpdmF0ZSBvcGVuUmFua1ByaXplSGVscCgpe1xyXG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gJ2h0dHBzOi8vbS54eWhqLmlvL3JhbmtQcml6ZUhlbHAuaHRtbCc7XHJcbiAgICB9XHJcbiAgICBwcml2YXRlIG9uUmVzaXplKCk6dm9pZCB7XHJcbiAgICAgICAgdGhpcy5saXN0Qm94LmhlaWdodCA9IExheWEuc3RhZ2UuaGVpZ2h0IC0gNzAwO1xyXG4gICAgfVxyXG4gfSAiLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjAgMTA6Mjc6MjVcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjAgMTA6Mjc6MjVcclxuICogQGRlc2Mg54Gr566t5aSn5aWW5Y6G5Y+y6K6w5b2V6aG16Z2iXHJcbiAqL1xyXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcclxuaW1wb3J0IHV0aWxzIGZyb20gXCIuLi9qcy91dGlsc1wiO1xyXG5pbXBvcnQgYXBpIGZyb20gXCIuLi9qcy9hcGlcIjtcclxuaW1wb3J0IHsgVGFiYmFyIH0gZnJvbSBcIi4uL3ZpZXcvVGFiYmFyXCI7XHJcblxyXG4gZXhwb3J0IGRlZmF1bHQgY2xhc3MgZ3JhbmRQcml4IGV4dGVuZHMgdWkucHJpSGlzdG9yeVNjZW5lVUkge1xyXG4gICAgIGNvbnN0cnVjdG9yKCl7XHJcbiAgICAgICAgc3VwZXIoKVxyXG4gICAgIH1cclxuXHJcbiAgICAgb25FbmFibGUoKXtcclxuICAgICAgICB0aGlzLmdldFJhbmtIaXN0b3J5KClcclxuICAgICAgICBMYXlhLnN0YWdlLm9uKExheWEuRXZlbnQuUkVTSVpFLHRoaXMsdGhpcy5vblJlc2l6ZSlcclxuICAgICAgICB0aGlzLm9uUmVzaXplKClcclxuICAgICB9XHJcbiAgICBvbkRpc2FibGUoKTp2b2lkIHtcclxuICAgICAgICBMYXlhLnN0YWdlLm9mZihMYXlhLkV2ZW50LlJFU0laRSx0aGlzLHRoaXMub25SZXNpemUpXHJcbiAgICB9XHJcblxyXG4gICAgIC8qKuiOt+WPluWkp+WlluS/oeaBryAqL1xyXG4gICAgcHJpdmF0ZSBnZXRSYW5rSGlzdG9yeSgpe1xyXG4gICAgICAgIGFwaS5nZXRSYW5rSGlzdG9yeSgpLnRoZW4oKHJlczphbnkpPT57XHJcbiAgICAgICAgICAgIHRoaXMudG90YWwudGV4dCA9IGDmgLvlpZbph5E6JHt1dGlscy50b0RlY2ltYWwocmVzLnBvdE1vbmV5LDIpfSBVU0RUYFxyXG4gICAgICAgICAgICBpZiAocmVzLmxpc3QubGlzdDEuZGF0YS5sZW5ndGggPT09IDAgJiYgcmVzLmxpc3QubGlzdDIuZGF0YS5sZW5ndGggPT09IDAgJiYgcmVzLmxpc3QubGlzdDMuZGF0YS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubGlzdEJveC52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvL+esrOS4gOWQjVxyXG4gICAgICAgICAgICBpZiAocmVzLmxpc3QubGlzdDEuZGF0YS5sZW5ndGggPiAwKSB7ICBcclxuICAgICAgICAgICAgICAgIHRoaXMubGlzdEJveC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYm94MS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYWxvbmUxLnRleHQgPSBg54us5b6XICR7dXRpbHMudG9EZWNpbWFsKHJlcy5saXN0Lmxpc3QxLmRpdmlkbW9uZXksMil9IFVTRFRgXHJcbiAgICAgICAgICAgICAgICB0aGlzLlByb3BvcnRpb24xLnRleHQgPSBg5Y2g5aWW5rGgJHtyZXMubGlzdC5saXN0MS5wZXJjZW50fWBcclxuICAgICAgICAgICAgICAgIHRoaXMucHJpeExpc3QxLmFycmF5ID0gcmVzLmxpc3QubGlzdDEuZGF0YVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIDItNeWQjVxyXG4gICAgICAgICAgICBpZiAocmVzLmxpc3QubGlzdDIuZGF0YS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxpc3RCb3gudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJveDIudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFsb25lMi50ZXh0ID0gYOavj+S6uiAke3V0aWxzLnRvRGVjaW1hbChyZXMubGlzdC5saXN0Mi5kaXZpZG1vbmV5LzQsMil9IFVTRFRgXHJcbiAgICAgICAgICAgICAgICB0aGlzLlByb3BvcnRpb24yLnRleHQgPSBg5Y2g5aWW5rGgJHtyZXMubGlzdC5saXN0Mi5wZXJjZW50fWBcclxuICAgICAgICAgICAgICAgIHRoaXMucHJpeExpc3QyLmFycmF5ID0gcmVzLmxpc3QubGlzdDIuZGF0YVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAvLyA1LTE15ZCNXHJcbiAgICAgICAgICAgICBpZiAocmVzLmxpc3QubGlzdDMuZGF0YS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxpc3RCb3gudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJveDMudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFsb25lMy50ZXh0ID0gYOavj+S6uiAke3V0aWxzLnRvRGVjaW1hbChyZXMubGlzdC5saXN0My5kaXZpZG1vbmV5LzEwLDIpfSBVU0RUYFxyXG4gICAgICAgICAgICAgICAgdGhpcy5Qcm9wb3J0aW9uMy50ZXh0ID0gYOWNoOWlluaxoCR7cmVzLmxpc3QubGlzdDMucGVyY2VudH1gXHJcbiAgICAgICAgICAgICAgICB0aGlzLnByaXhMaXN0My5hcnJheSA9IHJlcy5saXN0Lmxpc3QzLmRhdGFcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pLmNhdGNoKChlcnI6YW55KT0+e1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIubWVzc2FnZSk7XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuICAgIHByaXZhdGUgb25SZXNpemUoKTp2b2lkIHtcclxuICAgICAgICB0aGlzLmxpc3RCb3guaGVpZ2h0ID0gTGF5YS5zdGFnZS5oZWlnaHQgLSAyMDA7XHJcbiAgICB9XHJcbiB9ICIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0yNiAxMTowNzozOVxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yNiAxMTowNzozOVxyXG4gKiBAZGVzYyDlhaXlm7TlkI3ljZVcclxuICovXHJcblxyXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcclxuaW1wb3J0IHsgVGFiYmFyIH0gZnJvbSBcIi4uL3ZpZXcvVGFiYmFyXCI7XHJcbmltcG9ydCBhcGkgZnJvbSBcIi4uL2pzL2FwaVwiO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU2hvcnRMaXN0ZWQgZXh0ZW5kcyB1aS5zaG9ydExpc3RlZFVJIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKClcclxuICAgICAgICB0aGlzLm9uKExheWEuRXZlbnQuUkVTSVpFLCB0aGlzLCB0aGlzLm9uUmVzaXplKVxyXG4gICAgfVxyXG5cclxuICAgIG9uRW5hYmxlKCkge1xyXG4gICAgICAgIHRoaXMuZ2V0U2hvcnRMaXN0ZWQoKVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldFNob3J0TGlzdGVkKHBhZ2U/OiBudW1iZXIpIHtcclxuICAgICAgICBhcGkuZ2V0U2hvcnRMaXN0ZWQocGFnZSkudGhlbigocmVzOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5zaG9ydExpc3QucmVwZWF0WSA9IHJlcy5sZW5ndGg7XHJcbiAgICAgICAgICAgIHRoaXMuc2hvcnRMaXN0LmFycmF5ID0gcmVzO1xyXG4gICAgICAgICAgICB0aGlzLnNob3J0TGlzdC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICB9KS5jYXRjaCgoZXJyOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyci5tZXNzYWdlKTtcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG4gICAgLyoq55uR6KeG5bGP5bmV5aSn5bCP5Y+Y5YyWICovXHJcbiAgICBvblJlc2l6ZSgpIHtcclxuICAgICAgICAvL+WIl+ihqOmrmOW6pumAgumFjVxyXG4gICAgICAgIC8vIHRoaXMuc2hvcnRMaXN0LmhlaWdodCA9IHRoaXMuaGVpZ2h0IC0gMTAwO1xyXG4gICAgfVxyXG59XHJcbiIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0yNiAxMDoyMDoxNVxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yNiAxMDoyMDoxNVxyXG4gKiBAZGVzYyDllpzku47lpKnpmY3kuK3lpZblkI3ljZVcclxuICovXHJcbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xyXG5pbXBvcnQgYXBpIGZyb20gXCIuLi9qcy9hcGlcIjtcclxuaW1wb3J0IHsgVG9hc3QgfSBmcm9tIFwiLi4vdmlldy9Ub2FzdFwiO1xyXG5pbXBvcnQgeyBUYWJiYXIgfSBmcm9tIFwiLi4vdmlldy9UYWJiYXJcIjtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFdpbm5pbmcgZXh0ZW5kcyB1aS54Y3RqVUkge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoKVxyXG4gICAgICAgIHRoaXMuYnRuX3Nob3J0bGlzdC5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5TaG9ydExpc3RGdW5jKVxyXG4gICAgICAgIHRoaXMub24oTGF5YS5FdmVudC5SRVNJWkUsdGhpcyx0aGlzLm9uUmVzaXplKVxyXG4gICAgfVxyXG5cclxuICAgIG9uRW5hYmxlKCl7XHJcbiAgICAgICAgdGhpcy5nZXRYY3RqTGlzdCgpXHJcbiAgICB9XHJcblxyXG5cclxuICAgIHByaXZhdGUgZ2V0WGN0akxpc3QocGFnZT86bnVtYmVyKXtcclxuICAgICAgICBhcGkuZ2V0WGN0akxpc3QocGFnZSkudGhlbigocmVzOmFueSk9PntcclxuICAgICAgICAgICAgdGhpcy53aW5uaW5nTGlzdC5yZXBlYXRZID0gcmVzLmxlbmd0aDtcclxuICAgICAgICAgICAgdGhpcy53aW5uaW5nTGlzdC5hcnJheSA9IHJlcztcclxuICAgICAgICAgICAgdGhpcy53aW5uaW5nTGlzdC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICB9KS5jYXRjaCgoZXJyOmFueSk9PntcclxuICAgICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyci5tZXNzYWdlKTtcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvKirmn6XnnIvku4rml6XlhaXlm7TlkI3ljZUgKi9cclxuICAgIHByaXZhdGUgU2hvcnRMaXN0RnVuYygpe1xyXG4gICAgICAgIFRhYmJhci5nZXRJbnN0YW5jZSgpLm9wZW5TY2VuZSgnc2hvcnRMaXN0ZWQuc2NlbmUnKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKuebkeinhuWxj+W5leWkp+Wwj+WPmOWMliAqL1xyXG4gICAgb25SZXNpemUoKXtcclxuICAgICAgICAvL+WIl+ihqOmrmOW6pumAgumFjSA9IOWxj+W5lemrmOW6piAtIGJhbm5lclxyXG4gICAgICAgIHRoaXMud2lubmluZ0xpc3QuaGVpZ2h0ID0gdGhpcy5oZWlnaHQgLSA2MDA7XHJcbiAgICB9XHJcbn1cclxuIiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ4OjQwXHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ4OjQwXHJcbiAqIEBkZXNjIOWPguS4juiusOW9leiEmuacrFxyXG4gKi9cclxuaW1wb3J0IHsgdWkgfSBmcm9tICcuLi91aS9sYXlhTWF4VUknXHJcbmltcG9ydCB1dGlscyBmcm9tICcuLi9qcy91dGlscyc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBqb2luUmVjb3JkIGV4dGVuZHMgdWkudGVtcGxhdGUuam9pblJlY29yZHNVSSB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpXHJcbiAgICB9XHJcbiAgICBzZXQgZGF0YVNvdXJjZShpdGVtOiBhbnkpIHtcclxuICAgICAgICB0aGlzLl9kYXRhU291cmNlID0gaXRlbTtcclxuXHJcbiAgICAgICAgaWYgKGl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5wZXJpb2QudGV4dCA9IGl0ZW0ucGVyaW9kO1xyXG4gICAgICAgICAgICB0aGlzLmdvb2RzVmFsdWUudGV4dCA9IGAkeyt1dGlscy50b0RlY2ltYWwoaXRlbS5nb29kc1ZhbHVlLDIpfWA7XHJcbiAgICAgICAgICAgIHRoaXMuY29kZUxpc3QudGV4dCA9IGl0ZW0uY29kZUxpc3QubGVuZ3RoID4gMzggPyBgJHtpdGVtLmNvZGVMaXN0LnN1YnN0cigwLDM4KX0uLi5gIDogaXRlbS5jb2RlTGlzdDtcclxuXHJcbiAgICAgICAgICAgIGlmIChpdGVtLnN0YXR1cyA9PT0gJzAnKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5vUHJpemUudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5vUHJpemUudGV4dCA9ICfmnKrlvIDlpZYnO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vcGVuVGltZS50ZXh0ID0gJy0nO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaXRDb2RlLnRleHQgPSAnLSc7XHJcbiAgICAgICAgICAgIH1lbHNlIGlmKGl0ZW0uc3RhdHVzID09PSAnMScpe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ub1ByaXplLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ub1ByaXplLnRleHQgPSAn5byA5aWW5LitJztcclxuICAgICAgICAgICAgICAgIHRoaXMub3BlblRpbWUudGV4dCA9ICctJztcclxuICAgICAgICAgICAgICAgIHRoaXMuaGl0Q29kZS50ZXh0ID0gJy0nO1xyXG4gICAgICAgICAgICB9ZWxzZSBpZihpdGVtLnN0YXR1cyA9PT0gJzInICYmICFpdGVtLmhpdCl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5vUHJpemUudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5vUHJpemUudGV4dCA9ICfmnKrkuK3lpZYnO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vcGVuVGltZS50ZXh0ID0gdXRpbHMuZm9ybWF0RGF0ZVRpbWUoaXRlbS5vcGVuVGltZSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhpdENvZGUudGV4dCA9IGl0ZW0uaGl0Q29kZTtcclxuICAgICAgICAgICAgfWVsc2UgaWYoaXRlbS5zdGF0dXMgPT09ICcyJyAmJiBpdGVtLmhpdCl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnByaXplLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vcGVuVGltZS50ZXh0ID0gdXRpbHMuZm9ybWF0RGF0ZVRpbWUoaXRlbS5vcGVuVGltZSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhpdENvZGUudGV4dCA9IGl0ZW0uaGl0Q29kZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYXdhcmQudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmF3YXJkLnRleHQgPSBgJHsrdXRpbHMudG9EZWNpbWFsKGl0ZW0uYXdhcmQsMil9IFVTRFRgO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ4OjUwXHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ4OjUwXHJcbiAqIEBkZXNjIOi0reS5sOmhtemdouWPt+eggeWIl+ihqOiEmuacrFxyXG4gKi9cclxuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XHJcbmltcG9ydCB7IFRvYXN0IH0gZnJvbSBcIi4uL3ZpZXcvVG9hc3RcIjtcclxuaW1wb3J0IHsgR2FtZU1vZGVsIH0gZnJvbSBcIi4uL2pzL0dhbWVNb2RlbFwiO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgbnVtYmVyTGlzdERPTSBleHRlbmRzIHVpLnRlbXBsYXRlLm51bWJlckxpc3RET01VSSB7XHJcbiAgICBwcml2YXRlIHVzZXJJZDpzdHJpbmcgPSAnJztcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcigpe1xyXG4gICAgICAgIHN1cGVyKClcclxuICAgICAgICB0aGlzLm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLmNsaWNrTnVtYmVyKVxyXG4gICAgfVxyXG4gICAgc2V0IGRhdGFTb3VyY2UoaXRlbTogYW55KSB7XHJcbiAgICAgICAgdGhpcy5fZGF0YVNvdXJjZSA9IGl0ZW07XHJcbiAgICAgICAgaWYgKGl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5jb2RlLnRleHQgPSBpdGVtLmNvZGU7XHJcbiAgICAgICAgICAgIHRoaXMuYmdJbWcuc2tpbiA9IHRoaXMucmV0dXJuU3RhdHVzSW1nKGl0ZW0uYnV5ZXJJZClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgb25FbmFibGUoKXtcclxuICAgICAgICAvL+iOt+WPlueUqOaIt+i1hOS6p1xyXG4gICAgICAgIGNvbnN0IHVzZXJJbmZvOmFueSA9IEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLnVzZXJJbmZvO1xyXG4gICAgICAgIHRoaXMudXNlcklkID0gdXNlckluZm8udXNlcklkO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog6YCJ5oup5Y+356CBXHJcbiAgICAgKiBAcGFyYW0gaXRlbSDlvZPliY3mjInpkq5cclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBjbGlja051bWJlcihpdGVtOmFueSk6dm9pZCB7XHJcbiAgICAgICAgaWYgKCt0aGlzLl9kYXRhU291cmNlLmJ1eWVySWQgPiAxMCkgeyAvL+eUqOaIt2lk5b+F5aSn5LqOMTDvvIzkvZzkuLrliKTmlq3kvp3mja5cclxuICAgICAgICAgICAgVG9hc3Quc2hvdygn6K+l5Y+356CB5bey6KKr6LSt5LmwJylcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1lbHNlIGlmKHRoaXMuX2RhdGFTb3VyY2UuYnV5ZXJJZCA9PT0gJzAnKXtcclxuICAgICAgICAgICAgdGhpcy5iZ0ltZy5za2luID0gdGhpcy5yZXR1cm5TdGF0dXNJbWcoJzInKVxyXG4gICAgICAgICAgICB0aGlzLl9kYXRhU291cmNlLmJ1eWVySWQgPSAnMic7XHJcbiAgICAgICAgfWVsc2UgaWYodGhpcy5fZGF0YVNvdXJjZS5idXllcklkID09PSAnMicpe1xyXG4gICAgICAgICAgICB0aGlzLmJnSW1nLnNraW4gPSB0aGlzLnJldHVyblN0YXR1c0ltZygnMCcpXHJcbiAgICAgICAgICAgIHRoaXMuX2RhdGFTb3VyY2UuYnV5ZXJJZCA9ICcwJztcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5ldmVudChcIkdldEl0ZW1cIik7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5qC55o2u54q25oCB6L+U5Zue5a+55bqU5Zu+54mHXHJcbiAgICAgKiBAcGFyYW0gYnV5ZXJJZCAgMO+8muWPr+mAiSAy77ya6YCJ5LitIOWkp+S6jjEwOuS4jeWPr+mAiSAg562J5LqO6Ieq5bexdXNlcklk77ya5bey6YCJXHJcbiAgICAgKiBcclxuICAgICovXHJcbiAgICBwcml2YXRlIHJldHVyblN0YXR1c0ltZyhidXllcklkOnN0cmluZyl7XHJcbiAgICAgICAgaWYgKGJ1eWVySWQgPT09IHRoaXMudXNlcklkKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAnY29tcC9pbWdfeWl4dWFuX3NlbGVjdDIwLnBuZydcclxuICAgICAgICB9ZWxzZSBpZigrYnV5ZXJJZCA+IDEwKXsgLy/nlKjmiLdpZOW/heWkp+S6jjEw77yM5L2c5Li65Yik5pat5L6d5o2uXHJcbiAgICAgICAgICAgIHJldHVybiAnY29tcC9pbWdfbm9fc2VsZWN0MjAucG5nJ1xyXG4gICAgICAgIH1lbHNlIGlmKGJ1eWVySWQgPT09ICcyJykge1xyXG4gICAgICAgICAgICByZXR1cm4gJ2NvbXAvaW1nX29rX3NlbGVjdDIwLnBuZydcclxuICAgICAgICB9ZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiAnY29tcC9pbWdfa2V4dWFuX3NlbGVjdDIwLnBuZydcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgXHJcbn0iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDk6MDhcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDk6MDhcclxuICogQGRlc2Mg5b6A5pyf6K6w5b2V6ISa5pysXHJcbiAqL1xyXG5pbXBvcnQgeyB1aSB9IGZyb20gJy4uL3VpL2xheWFNYXhVSSdcclxuaW1wb3J0IHV0aWxzIGZyb20gJy4uL2pzL3V0aWxzJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHByZXZpb3VzUmVjb3JkIGV4dGVuZHMgdWkudGVtcGxhdGUucHJldmlvdXNSZWNvcmRzVUkge1xyXG4gICAgY29uc3RydWN0b3IoKXtcclxuICAgICAgICBzdXBlcigpXHJcbiAgICAgICAgdGhpcy50eEhhc2gub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuc2VlSGFzaClcclxuICAgIH1cclxuICAgIHNldCBkYXRhU291cmNlKGl0ZW06IGFueSkge1xyXG4gICAgICAgIHRoaXMuX2RhdGFTb3VyY2UgPSBpdGVtO1xyXG4gICAgICAgIGlmIChpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMucGVyaW9kLnRleHQgPSBpdGVtLnBlcmlvZDtcclxuICAgICAgICAgICAgdGhpcy5yZXF1ZXN0VHlwZS50ZXh0ID0gaXRlbS5yZXF1ZXN0VHlwZTtcclxuICAgICAgICAgICAgdGhpcy5nb29kc05hbWUudGV4dCA9IGl0ZW0uZ29vZHNOYW1lO1xyXG4gICAgICAgICAgICB0aGlzLnR4SGFzaC50ZXh0ID0gaXRlbS50eEhhc2g7XHJcbiAgICAgICAgICAgIHRoaXMuaGl0Q29kZS50ZXh0ID0gaXRlbS5oaXRDb2RlO1xyXG4gICAgICAgICAgICB0aGlzLm9wZW5UaW1lLnRleHQgPSB1dGlscy5mb3JtYXREYXRlVGltZShpdGVtLm9wZW5UaW1lKTtcclxuICAgICAgICAgICAgdGhpcy5qb2luZWROdW0udGV4dCA9IGl0ZW0uam9pbmVkTnVtO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKirmn6XnnIvlk4jluIwgKi9cclxuICAgIHNlZUhhc2goKTp2b2lkIHtcclxuICAgICAgICBjb25zdCBkb21haW4gPSBkb2N1bWVudC5kb21haW47XHJcbiAgICAgICAgaWYgKGRvbWFpbi5pbmRleE9mKCd0LWNlbnRlcicpID49IDAgfHwgZG9tYWluID09PSAnbG9jYWxob3N0Jykge1xyXG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IGBodHRwczovL3JvcHN0ZW4uZXRoZXJzY2FuLmlvL3R4LyR7dGhpcy5fZGF0YVNvdXJjZS50eEhhc2h9YDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IGBodHRwczovL2V0aGVyc2Nhbi5pby90eC8ke3RoaXMuX2RhdGFTb3VyY2UudHhIYXNofWA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgfVxyXG59IiwiXHJcbi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0yMiAxMTo0MDo0MlxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yMiAxMTo0MDo0MlxyXG4gKiBAZGVzYyDngavnrq3lpKflpZbljoblj7LorrDlvZXohJrmnKxcclxuICovXHJcbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xyXG5pbXBvcnQgdXRpbHMgZnJvbSBcIi4uL2pzL3V0aWxzXCI7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBwcmlIaXN0b3J5IGV4dGVuZHMgdWkudGVtcGxhdGUucHJpSGlzdG9yeVVJIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKClcclxuICAgIH1cclxuICAgIHNldCBkYXRhU291cmNlKGl0ZW06IGFueSkge1xyXG4gICAgICAgIGlmIChpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmFua05vLnRleHQgPSBpdGVtLnJhbmsgPCAxMCA/IGAwJHtpdGVtLnJhbmt9YCA6IGAke2l0ZW0ucmFua31gO1xyXG4gICAgICAgICAgICB0aGlzLm5pY2tOYW1lLnRleHQgPSBpdGVtLm5pY2tOYW1lO1xyXG4gICAgICAgICAgICB0aGlzLlVJRC50ZXh0ID0gYFVJRDogJHtpdGVtLnVzZXJJZH1gO1xyXG4gICAgICAgICAgICB0aGlzLlZvbHVtZS50ZXh0ID0gYCR7dXRpbHMudG9EZWNpbWFsKGl0ZW0uY29uc3VtLDIpfSBVU0RUYFxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSBcclxuIiwiXHJcbi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0yMiAxMTo0MDo0MlxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yMiAxMTo0MDo0MlxyXG4gKiBAZGVzYyDngavnrq3lpKflpZbmjpLooYzmppxcclxuICovXHJcbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xyXG5pbXBvcnQgdXRpbHMgZnJvbSBcIi4uL2pzL3V0aWxzXCI7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBwcml4TGlzdCBleHRlbmRzIHVpLnRlbXBsYXRlLnByaXhMaXN0VUkge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoKVxyXG4gICAgfVxyXG4gICAgc2V0IGRhdGFTb3VyY2UoaXRlbTogYW55KSB7XHJcbiAgICAgICAgaWYgKGl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5ubzEudmlzaWJsZSA9IGl0ZW0ucmFuayA9PT0gMSA/IHRydWUgOiBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5yYW5rTm8udmlzaWJsZSA9IGl0ZW0ucmFuayA9PT0gMSA/IGZhbHNlIDogdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5yYW5rTm8udGV4dCA9IGl0ZW0ucmFuaztcclxuICAgICAgICAgICAgdGhpcy5hdmF0YXIuc2tpbiA9IGl0ZW0uYXZhdGFyO1xyXG4gICAgICAgICAgICB0aGlzLm5pY2tOYW1lLnRleHQgPSBpdGVtLm5pY2tOYW1lO1xyXG4gICAgICAgICAgICB0aGlzLlVJRC50ZXh0ID0gYFVJRDogJHtpdGVtLnVzZXJJZH1gO1xyXG4gICAgICAgICAgICB0aGlzLnRvZGF5Vm9sdW1lLnRleHQgPSBgJHt1dGlscy50b0RlY2ltYWwoaXRlbS5jb25zdW0sMil9IFVTRFRgXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IFxyXG4iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDk6MjNcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDk6MjNcclxuICogQGRlc2Mg5Lqk5piT5a+G56CB6L6T5YWl5by556qX6ISa5pysXHJcbiAqL1xyXG5pbXBvcnQgeyB1aSB9IGZyb20gJy4uL3VpL2xheWFNYXhVSSdcclxuaW1wb3J0IFRpcHNEaWFMb2cgZnJvbSAnLi90aXBEaWFsb2cnO1xyXG5pbXBvcnQgeyBUb2FzdCB9IGZyb20gJy4uL3ZpZXcvVG9hc3QnO1xyXG5pbXBvcnQgR3Vlc3NpbmcgZnJvbSAnLi4vc2NyaXB0L0d1ZXNzaW5nJztcclxuaW1wb3J0IGFwaSBmcm9tICcuLi9qcy9hcGknO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSXB0UHN3RG9tIGV4dGVuZHMgdWkudGVtcGxhdGUuSW5wdXRQd2REaWFsb2dVSSB7XHJcblxyXG4gICAgcHJpdmF0ZSBwZXJpb2Q6c3RyaW5nID0gJyc7Ly/mnJ/lj7dcclxuICAgIHByaXZhdGUgY29kZUxpc3Q6c3RyaW5nID0gJyc7Ly/otK3kubDlj7fnoIFcclxuICAgIHByaXZhdGUgaXNFbnRlcjpib29sZWFuID0gZmFsc2U7IC8v5Ye95pWw6IqC5rWBXHJcbiAgICBwcml2YXRlIEFsbENvZGVMaXN0OmFueSA9IFtdOy8v5omA5pyJ5Y+356CB5YiX6KGoXHJcblxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoKVxyXG4gICAgfVxyXG4gICAgb25FbmFibGUoKXtcclxuICAgICAgICB0aGlzLmJ0bkNsb3NlLm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLmNsb3NlRnVuYylcclxuICAgICAgICB0aGlzLklwdFBzdy5vbihMYXlhLkV2ZW50LkZPQ1VTLHRoaXMsdGhpcy5vbkZvY3VzKVxyXG4gICAgICAgIHRoaXMuSXB0UHN3Lm9uKExheWEuRXZlbnQuQkxVUix0aGlzLHRoaXMub25CTFVSKVxyXG4gICAgICAgIHRoaXMuSXB0UHN3Lm9uKExheWEuRXZlbnQuS0VZX1VQLHRoaXMsdGhpcy5vbkNoYW5nZSlcclxuICAgIH1cclxuXHJcbiAgICAvKirojrflj5bkvKDpgJLnmoTlj4LmlbAgKi9cclxuICAgIHNldERhdGEoZGF0YTphbnkpIHtcclxuICAgICAgICB0aGlzLnBlcmlvZCA9IGRhdGEucGVyaW9kO1xyXG4gICAgICAgIHRoaXMuY29kZUxpc3QgPSBkYXRhLmNvZGVMaXN0O1xyXG4gICAgICAgIHRoaXMuQWxsQ29kZUxpc3QgPSBkYXRhLkFsbENvZGVMaXN0O1xyXG4gICAgfVxyXG5cclxuICAgIC8qKui+k+WFpeWGheWuueaUueWPmCAqL1xyXG4gICAgcHJpdmF0ZSBvbkNoYW5nZSgpe1xyXG4gICAgICAgIGlmICghdGhpcy5pc0VudGVyICYmIHRoaXMuSXB0UHN3LnRleHQubGVuZ3RoID09PSA2KSB7XHJcbiAgICAgICAgICAgIHRoaXMudHJhZGVCdXkoKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKirotK3kubAgKi9cclxuICAgIHByaXZhdGUgdHJhZGVCdXkoKXtcclxuICAgICAgICB0aGlzLmlzRW50ZXIgPSB0cnVlO1xyXG4gICAgICAgIGFwaS5wb3N0VHJhZGVCdXkodGhpcy5wZXJpb2QsdGhpcy5jb2RlTGlzdCx0aGlzLklwdFBzdy50ZXh0KS50aGVuKChyZXM6YW55KT0+e1xyXG4gICAgICAgICAgICB0aGlzLmlzRW50ZXIgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5jbG9zZUZ1bmMoKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuZXZlbnQoXCJyZWZyZXNoRGF0YVwiKTsvL+WIt+aWsOaVsOaNruWIl+ihqFxyXG4gICAgICAgICAgICAvLyDotK3kubDmiJDlip/lvLnlh7rlr7nor53moYZcclxuICAgICAgICAgICAgbGV0IHRpcHNEaWFsb2c6VGlwc0RpYUxvZyA9IG5ldyBUaXBzRGlhTG9nKClcclxuICAgICAgICAgICAgdGlwc0RpYWxvZy5wb3B1cCgpXHJcbiAgICAgICAgICAgIHRpcHNEaWFsb2cuc2V0RGF0YSh7XHJcbiAgICAgICAgICAgICAgICBBbGxDb2RlTGlzdDp0aGlzLkFsbENvZGVMaXN0XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSkuY2F0Y2goKGVycjphbnkpPT57XHJcbiAgICAgICAgICAgIHRoaXMuaXNFbnRlciA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLmNsb3NlRnVuYygpO1xyXG5cclxuICAgICAgICAgICAgVG9hc3Quc2hvdyhlcnIubWVzc2FnZSlcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIC8qKuWFs+mXreWvhueggeahhiAqL1xyXG4gICAgcHJpdmF0ZSBjbG9zZUZ1bmMoKXtcclxuICAgICAgICB0aGlzLmNsb3NlKCk7XHJcbiAgICAgICAgdGhpcy5JcHRQc3cudGV4dCA9ICcnO1xyXG4gICAgfVxyXG4gICAgLyoq6L6T5YWl5qGG6I635b6X54Sm54K5ICovXHJcbiAgICBwcml2YXRlIG9uRm9jdXMoKXtcclxuICAgICAgICB0aGlzLnRvcCA9IDE1MDtcclxuICAgIH1cclxuICAgIC8qKui+k+WFpeahhuiOt+W+l+eEpueCuSAqL1xyXG4gICAgcHJpdmF0ZSBvbkJMVVIoKXtcclxuICAgICAgIHRoaXMudG9wID0gNDQwO1xyXG4gICAgfVxyXG59IiwiXHJcbi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0yMiAxMTo0MDo0MlxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yMiAxMTo0MDo0MlxyXG4gKiBAZGVzYyDngavnrq3lpKflpZbngavnrq3lkI3ljZVcclxuICovXHJcbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xyXG5pbXBvcnQgdXRpbHMgZnJvbSBcIi4uL2pzL3V0aWxzXCI7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBwcml4TGlzdCBleHRlbmRzIHVpLnRlbXBsYXRlLnJhbmtpbmdMaXN0VUkge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoKVxyXG4gICAgfVxyXG4gICAgc2V0IGRhdGFTb3VyY2UoaXRlbTogYW55KSB7XHJcbiAgICAgICAgaWYgKGl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5yYW5raW5nLnRleHQgPSBpdGVtLnJhbmtpbmc7XHJcbiAgICAgICAgICAgIHRoaXMubmlja05hbWUudGV4dCA9IGl0ZW0ubmlja05hbWU7XHJcbiAgICAgICAgICAgIHRoaXMudWlkLnRleHQgPSBpdGVtLnVpZDtcclxuICAgICAgICAgICAgdGhpcy5hbW91bnQudGV4dCA9IGl0ZW0uYW1vdW50O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSBcclxuIiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTI3IDEwOjA2OjE4XHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTI3IDEwOjA2OjE4XHJcbiAqIEBkZXNjIOWFheWAvOaPkOW4geW8ueWHuuiEmuacrFxyXG4gKi9cclxuaW1wb3J0IHsgdWkgfSBmcm9tICcuLi91aS9sYXlhTWF4VUknXHJcbiBcclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVjaGFyZ2VEaWFsb2cgZXh0ZW5kcyB1aS50ZW1wbGF0ZS5yZWNoYXJnZURpYWxvZ1VJIHtcclxuICAgIGNvbnN0cnVjdG9yKCl7XHJcbiAgICAgICAgc3VwZXIoKVxyXG4gICAgfVxyXG5cclxuICAgIG9uRW5hYmxlKCl7XHJcbiAgICAgICAgdGhpcy5idG5fcXVpY2tSZWNoYXJnZS5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5xdWlja1JlY2hhcmdlRnVuYylcclxuICAgICAgICB0aGlzLmJ0bl93aXRoZHJhdy5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy53aXRoZHJhd0Z1bmMpXHJcbiAgICB9XHJcblxyXG4gICAgLyoq5b+r5o235YWF5YC8ICovXHJcbiAgICBwcml2YXRlIHF1aWNrUmVjaGFyZ2VGdW5jKCl7XHJcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBgaHR0cHM6Ly8ke2RvY3VtZW50LmRvbWFpbn0vIy9jaGFyZ2VLdWFpQmlgXHJcbiAgICB9XHJcbiAgICAvKipVU0RU6ZKx5YyF5o+Q5biBICovXHJcbiAgICB3aXRoZHJhd0Z1bmMoKXtcclxuICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IGBodHRwczovLyR7ZG9jdW1lbnQuZG9tYWlufS8jL3dhbGxldENoYXJnZWBcclxuICAgIH1cclxufVxyXG5cclxuIiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTI2IDExOjEyOjA5XHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTI2IDExOjEyOjA5XHJcbiAqIEBkZXNjIOWFpeWbtOWQjeWNleWIl+ihqFxyXG4gKi9cclxuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBzaG9ydExpc3RCb3ggZXh0ZW5kcyB1aS50ZW1wbGF0ZS5zaG9ydExpc3RVSSB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpXHJcbiAgICB9XHJcbiAgICBzZXQgZGF0YVNvdXJjZShpdGVtOiBhbnkpIHtcclxuICAgICAgICBpZiAoaXRlbSkge1xyXG4gICAgICAgICAgICB0aGlzLm51bWJlci50ZXh0ID0gaXRlbS5zaG9ydGxpc3RlZE51bWJlciA8IDEwID8gYDAke2l0ZW0uc2hvcnRsaXN0ZWROdW1iZXJ9YCA6IGl0ZW0uc2hvcnRsaXN0ZWROdW1iZXI7XHJcbiAgICAgICAgICAgIHRoaXMubmlja05hbWUudGV4dCA9IGl0ZW0ubmlja05hbWU7XHJcbiAgICAgICAgICAgIHRoaXMudXNlcklkLnRleHQgPSBpdGVtLnVzZXJJZDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuIiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ0OjAyXHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ0OjAyXHJcbiAqIEBkZXNjIOi0reS5sOaIkOWKn+WQjueahOaPkOekuuahhuiEmuacrFxyXG4gKi9cclxuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XHJcbmltcG9ydCB7IFRhYmJhciB9IGZyb20gXCIuLi92aWV3L1RhYmJhclwiO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGlwc0RpYUxvZyBleHRlbmRzIHVpLnRlbXBsYXRlLlRpcHNEaWFsb2dVSSB7XHJcbiAgICBwcml2YXRlIEFsbENvZGVMaXN0Om9iamVjdFtdID0gW107Ly/lj7fnoIHliJfooahcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKClcclxuICAgIH1cclxuICAgIG9uRW5hYmxlKCl7XHJcbiAgICAgICAgdGhpcy5idG5Db250aW51ZS5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5jbG9zZUZ1bmMpXHJcbiAgICAgICAgdGhpcy5idG5WaWV3UmVjb3JkLm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLnZpZXdSZWNvcmRGdW5jKVxyXG4gICAgICAgIFxyXG4gICAgfVxyXG5cclxuICAgIC8qKuiOt+WPluS8oOmAkueahOWPguaVsCAqL1xyXG4gICAgc2V0RGF0YShkYXRhOmFueSkge1xyXG4gICAgICAgIHRoaXMuQWxsQ29kZUxpc3QgPSBkYXRhLkFsbENvZGVMaXN0O1xyXG4gICAgfVxyXG5cclxuICAgIC8qKuWFs+mXreWvhueggeahhiAqL1xyXG4gICAgcHJpdmF0ZSBjbG9zZUZ1bmMoKXtcclxuXHJcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xyXG4gICAgICAgIC8vIOiLpeWFqOmDqOiiq+i0reS5sO+8jOWImeWbnuWIsOmmlumhtemHjeaWsOmAieaLqei0reS5sOacn+WPt1xyXG4gICAgICAgIGxldCBjb3VudDpudW1iZXIgPSAwO1xyXG4gICAgICAgIHRoaXMuQWxsQ29kZUxpc3QuZm9yRWFjaCgodjphbnkpID0+IHtcclxuICAgICAgICAgICAgaWYgKHYuYnV5ZXJJZCAhPT0gJzAnKSB7XHJcbiAgICAgICAgICAgICAgICBjb3VudCA9IGNvdW50ICsgMTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGlmIChjb3VudCA9PT0gdGhpcy5BbGxDb2RlTGlzdC5sZW5ndGgpIHtcclxuICAgICAgICAgICAgVGFiYmFyLmdldEluc3RhbmNlKCkub3BlblNjZW5lKCdob21lLnNjZW5lJylcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8g5p+l55yL6K6w5b2VXHJcbiAgICBwcml2YXRlIHZpZXdSZWNvcmRGdW5jKCl7XHJcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xyXG4gICAgICAgIFRhYmJhci5nZXRJbnN0YW5jZSgpLm9wZW5TY2VuZSgncmVjb3JkLnNjZW5lJylcclxuICAgIH1cclxufSIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0yMSAxNjozMjowMVxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yMSAxNjozMjowMVxyXG4gKiBAZGVzYyDotbDlir/liJfooajohJrmnKxcclxuICovXHJcbmltcG9ydCB7IHVpIH0gZnJvbSAnLi4vdWkvbGF5YU1heFVJJ1xyXG5pbXBvcnQgdXRpbHMgZnJvbSAnLi4vanMvdXRpbHMnO1xyXG5pbXBvcnQgeyBUYWJiYXIgfSBmcm9tICcuLi92aWV3L1RhYmJhcic7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyB0cmVuZExpc3QgZXh0ZW5kcyB1aS50ZW1wbGF0ZS50cmVuZExpc3RVSSB7XHJcbiAgICBwcml2YXRlIF9pdGVtOmFueTtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKClcclxuICAgICAgICB0aGlzLmJ0bl9idXkub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuYnRuQnV5RnVuYylcclxuICAgIH1cclxuICAgIHNldCBkYXRhU291cmNlKGl0ZW06YW55KXtcclxuICAgICAgICB0aGlzLl9pdGVtID0gaXRlbTtcclxuICAgICAgICBpZiAoaXRlbSkge1xyXG4gICAgICAgICAgICB0aGlzLnBlcmlvZC50ZXh0ID0gaXRlbS5wZXJpb2Q7XHJcbiAgICAgICAgICAgIHRoaXMuaGl0Q29kZS50ZXh0ID0gaXRlbS5oaXRDb2RlO1xyXG4gICAgICAgICAgICB0aGlzLm9kZF9ldmVuLnRleHQgPSBpdGVtLmlzID09PSAwID8gJy0nIDogIGl0ZW0uaXMgPT09IDEgPyAn5aWHJyA6ICflgbYnO1xyXG4gICAgICAgICAgICB0aGlzLmlzQmlnLnRleHQgPSBpdGVtLmlzID09PSAwID8gJy0nIDogaXRlbS5pc0JpZyA/ICflpKcnIDogJ+Wwjyc7XHJcblxyXG4gICAgICAgICAgICBpZiAoaXRlbS5pcyA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5idG5fYnV5LnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaXRDb2RlLnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ0bl9idXkudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaXRDb2RlLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIOWlh+WBtuaWh+Wtl+minOiJslxyXG4gICAgICAgICAgICBpZiAoaXRlbS5pcyA9PT0gMSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vZGRfZXZlbi5jb2xvciA9ICcjZjE0ODQ4JztcclxuICAgICAgICAgICAgfWVsc2UgaWYoaXRlbS5pcyA9PT0gMil7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9kZF9ldmVuLmNvbG9yID0gJyMyNWZmZmQnO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIOWkp+Wwj+aWh+Wtl+minOiJslxyXG4gICAgICAgICAgICBpZiAoIWl0ZW0uaXNCaWcgJiYgaXRlbS5pcyAhPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pc0JpZy5jb2xvciA9ICcjZjE0ODQ4JztcclxuICAgICAgICAgICAgfWVsc2UgaWYoaXRlbS5pc0JpZyAmJiBpdGVtLmlzICE9PSAwKXtcclxuICAgICAgICAgICAgICAgIHRoaXMuaXNCaWcuY29sb3IgPSAnIzI1ZmZmZCc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoq56uL5Y2z6LSt5LmwICovXHJcbiAgICBwcml2YXRlIGJ0bkJ1eUZ1bmMoKXtcclxuICAgICAgICBpZiAodGhpcy5faXRlbSAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICBUYWJiYXIuZ2V0SW5zdGFuY2UoKS5vcGVuU2NlbmUoJ2d1ZXNzaW5nLnNjZW5lJyx0aGlzLl9pdGVtLmdvb2RzSWQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTI2IDEwOjIxOjM3XHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTI2IDEwOjIxOjM3XHJcbiAqIEBkZXNjIOWWnOS7juWkqemZjeS4reWlluWQjeWNleWIl+ihqOiEmuacrFxyXG4gKi9cclxuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XHJcbmltcG9ydCB1dGlscyBmcm9tIFwiLi4vanMvdXRpbHNcIjtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFdpbm5pbmdMaXN0IGV4dGVuZHMgdWkudGVtcGxhdGUud2lubmluZ0xpc3RVSSB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpXHJcbiAgICB9XHJcbiAgICBzZXQgZGF0YVNvdXJjZShpdGVtOiBhbnkpIHtcclxuICAgICAgICBpZiAoaXRlbSkge1xyXG4gICAgICAgICAgICB0aGlzLnBlcmlvZC50ZXh0ID0gaXRlbS5iZWxvbmdUaW1lO1xyXG4gICAgICAgICAgICB0aGlzLmRhdGUudGV4dCA9IHV0aWxzLmZvcm1hdERhdGVUaW1lKGl0ZW0uYmFsYW5jZVRpbWUpO1xyXG4gICAgICAgICAgICB0aGlzLm5pY2tOYW1lLnRleHQgPSBpdGVtLm5pY2tOYW1lO1xyXG4gICAgICAgICAgICB0aGlzLmFtb3VudC50ZXh0ID0gYCR7K2l0ZW0ubW9uZXl9IFVTRFRgO1xyXG4gICAgICAgICAgICB0aGlzLmNvZGUudGV4dCA9IGl0ZW0uaGl0TnVtYmVyO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG4iLCIvKipUaGlzIGNsYXNzIGlzIGF1dG9tYXRpY2FsbHkgZ2VuZXJhdGVkIGJ5IExheWFBaXJJREUsIHBsZWFzZSBkbyBub3QgbWFrZSBhbnkgbW9kaWZpY2F0aW9ucy4gKi9cbmltcG9ydCBWaWV3PUxheWEuVmlldztcclxuaW1wb3J0IERpYWxvZz1MYXlhLkRpYWxvZztcclxuaW1wb3J0IFNjZW5lPUxheWEuU2NlbmU7XG5leHBvcnQgbW9kdWxlIHVpIHtcclxuICAgIGV4cG9ydCBjbGFzcyBhc3Npc3RhbnRVSSBleHRlbmRzIExheWEuU2NlbmUge1xyXG5cdFx0cHVibGljIGJ0bl90cmVuZDpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBidG5fcHJlYnV5OkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIGNhdGVUYWJMaXN0OkxheWEuTGlzdDtcblx0XHRwdWJsaWMgbGlzdFRpdGxlOkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyB0cmVuZExpc3Q6TGF5YS5MaXN0O1xuXHRcdHB1YmxpYyBwcmVidXk6TGF5YS5MaXN0O1xuXHRcdHB1YmxpYyBub0RhdGE6TGF5YS5JbWFnZTtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcImFzc2lzdGFudFwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgQ2FyZFVJIGV4dGVuZHMgTGF5YS5WaWV3IHtcclxuXHRcdHB1YmxpYyBhbmkxOkxheWEuRnJhbWVBbmltYXRpb247XG5cdFx0cHVibGljIGNhcmRJdGVtOkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIHNjZW5lSW1nOkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIGdvb2RzTmFtZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBwcm9ncmVzczpMYXlhLlByb2dyZXNzQmFyO1xuXHRcdHB1YmxpYyBzb2xkTnVtX3RvdGFsTnVtOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGF3YXJkOkxheWEuTGFiZWw7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJDYXJkXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBncmFuZFByaXhVSSBleHRlbmRzIExheWEuU2NlbmUge1xyXG5cdFx0cHVibGljIENvdW50RG93bjpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBib251czpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBidG5faGlzdG9yeTpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgcmFua1ByaXplSGVscDpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgbGlzdEJveDpMYXlhLlBhbmVsO1xuXHRcdHB1YmxpYyBib3gxOkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyBhbG9uZTE6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgUHJvcG9ydGlvbjE6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgcHJpeExpc3QxOkxheWEuTGlzdDtcblx0XHRwdWJsaWMgYm94MjpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgYWxvbmUyOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIFByb3BvcnRpb24yOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHByaXhMaXN0MjpMYXlhLkxpc3Q7XG5cdFx0cHVibGljIGJveDM6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIGFsb25lMzpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBQcm9wb3J0aW9uMzpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBwcml4TGlzdDM6TGF5YS5MaXN0O1xuXHRcdHB1YmxpYyBub0RhdGE6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgbXlSYW5rQm94OkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIG15cmFua2luZzpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBhdmF0YXI6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgbmlja05hbWU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgdWlkOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHZvbHVtZVRpdGxlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHZvbHVtZTpMYXlhLkxhYmVsO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwiZ3JhbmRQcml4XCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBndWVzc2luZ1VJIGV4dGVuZHMgTGF5YS5TY2VuZSB7XHJcblx0XHRwdWJsaWMgcHJpY2U6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgZ29vZHNWYWx1ZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBwcm9ncmVzc1NwZWVkOkxheWEuUHJvZ3Jlc3NCYXI7XG5cdFx0cHVibGljIHNvbGROdW1fc29sZE51bTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBwZXJpb2Q6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgbnVtYmVyTGlzdDpMYXlhLkxpc3Q7XG5cdFx0cHVibGljIGVzdGltYXRlOkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyB0b3RhbDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBiYWxhbmNlQm94OkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyBiYWxhbmNlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGJ0bl9idXk6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgYnRuX3NlbGVjdDpMYXlhLlZpZXc7XG5cdFx0cHVibGljIHJhbmRvbV9vbmU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgcmFuZG9tX2JlZm9yZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyByYW5kb21fYWZ0ZXI6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgcmFuZG9tX2FsbDpMYXlhLkxhYmVsO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwiZ3Vlc3NpbmdcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIGhvbWVVSSBleHRlbmRzIExheWEuU2NlbmUge1xyXG5cdFx0cHVibGljIHB1dF9pbjpMYXlhLkZyYW1lQW5pbWF0aW9uO1xuXHRcdHB1YmxpYyByb2NrZXRfc2hvdzpMYXlhLkZyYW1lQW5pbWF0aW9uO1xuXHRcdHB1YmxpYyBkb21fc2hvdzpMYXlhLkZyYW1lQW5pbWF0aW9uO1xuXHRcdHB1YmxpYyBiZ19hbmk6TGF5YS5GcmFtZUFuaW1hdGlvbjtcblx0XHRwdWJsaWMgYmdfYW5pMjpMYXlhLkZyYW1lQW5pbWF0aW9uO1xuXHRcdHB1YmxpYyBiZ19hbmltYXRpb246TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIGdvX2NlbnRlcjpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgdHVpY2h1OkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIEFjY291bnRCb3g6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgYXZhdGFyOkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIG5pY2tOYW1lOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHJlY2hhcmdlQm94OkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIGJ0blJlY2hhcmdlOkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIG15QW1vdW50OkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGJ1eUhlbHA6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIHJvY2tlckJveDpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgcm9ja2V0QW1vdW50OkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGNvdW50RG93bjpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgcm9ja2V0Q291bnREb3duOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGxpc3Q6TGF5YS5MaXN0O1xuXHRcdHB1YmxpYyBwdXRpbjpMYXlhLkltYWdlO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwiaG9tZVwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgcHJpSGlzdG9yeVNjZW5lVUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyB0b3RhbDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBsaXN0Qm94OkxheWEuUGFuZWw7XG5cdFx0cHVibGljIGJveDE6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIGFsb25lMTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBQcm9wb3J0aW9uMTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBwcml4TGlzdDE6TGF5YS5MaXN0O1xuXHRcdHB1YmxpYyBib3gyOkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyBhbG9uZTI6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgUHJvcG9ydGlvbjI6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgcHJpeExpc3QyOkxheWEuTGlzdDtcblx0XHRwdWJsaWMgYm94MzpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgYWxvbmUzOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIFByb3BvcnRpb24zOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHByaXhMaXN0MzpMYXlhLkxpc3Q7XG5cdFx0cHVibGljIG5vRGF0YTpMYXlhLkltYWdlO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwicHJpSGlzdG9yeVNjZW5lXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyByZWNvcmRVSSBleHRlbmRzIExheWEuU2NlbmUge1xyXG5cdFx0cHVibGljIGNhbnl1OkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIHdhbmdxaTpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBqb2luTGlzdDpMYXlhLkxpc3Q7XG5cdFx0cHVibGljIHByZXZpb291c0xpc3Q6TGF5YS5MaXN0O1xuXHRcdHB1YmxpYyBub0RhdGE6TGF5YS5JbWFnZTtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInJlY29yZFwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3Mgc2hvcnRMaXN0ZWRVSSBleHRlbmRzIExheWEuU2NlbmUge1xyXG5cdFx0cHVibGljIHNob3J0TGlzdDpMYXlhLkxpc3Q7XG5cdFx0cHVibGljIG5vRGF0YTpMYXlhLkltYWdlO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwic2hvcnRMaXN0ZWRcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIFRhYmJhclVJIGV4dGVuZHMgTGF5YS5WaWV3IHtcclxuXHRcdHB1YmxpYyB0YWI6TGF5YS5UYWI7XG5cdFx0cHVibGljIG5vdGljZTpMYXlhLlNwcml0ZTtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcIlRhYmJhclwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgeGN0alVJIGV4dGVuZHMgTGF5YS5TY2VuZSB7XHJcblx0XHRwdWJsaWMgeGN0al9zaHVvbWluZzpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgYW1vdW50OkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHVuaXQ6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgY291bnREb3duOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGJ0bl9zaG9ydGxpc3Q6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgd2lubmluZ19jb2RlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHdpbm5pbmdMaXN0OkxheWEuTGlzdDtcblx0XHRwdWJsaWMgbm9EYXRhOkxheWEuSW1hZ2U7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJ4Y3RqXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5leHBvcnQgbW9kdWxlIHVpLnRlbXBsYXRlIHtcclxuICAgIGV4cG9ydCBjbGFzcyBJbnB1dFB3ZERpYWxvZ1VJIGV4dGVuZHMgTGF5YS5EaWFsb2cge1xyXG5cdFx0cHVibGljIHRpdGxlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGJ0bkNsb3NlOkxheWEuQm94O1xuXHRcdHB1YmxpYyBJcHRQc3c6TGF5YS5UZXh0SW5wdXQ7XG5cdFx0cHVibGljIGZvcmdldFBhc3N3b3JkOkxheWEuTGFiZWw7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJ0ZW1wbGF0ZS9JbnB1dFB3ZERpYWxvZ1wiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3Mgam9pblJlY29yZHNVSSBleHRlbmRzIExheWEuVmlldyB7XHJcblx0XHRwdWJsaWMgcGVyaW9kOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIG5vUHJpemU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgcHJpemU6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgZ29vZHNWYWx1ZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBvcGVuVGltZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBoaXRDb2RlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGNvZGVMaXN0OkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGF3YXJkOkxheWEuTGFiZWw7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJ0ZW1wbGF0ZS9qb2luUmVjb3Jkc1wiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgbnVtYmVyTGlzdERPTVVJIGV4dGVuZHMgTGF5YS5WaWV3IHtcclxuXHRcdHB1YmxpYyBiZ0ltZzpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBjb2RlOkxheWEuTGFiZWw7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJ0ZW1wbGF0ZS9udW1iZXJMaXN0RE9NXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBwcmV2aW91c1JlY29yZHNVSSBleHRlbmRzIExheWEuVmlldyB7XHJcblx0XHRwdWJsaWMgcGVyaW9kOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHJlcXVlc3RUeXBlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGdvb2RzTmFtZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyB0eEhhc2g6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgaGl0Q29kZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBvcGVuVGltZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBqb2luZWROdW06TGF5YS5MYWJlbDtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInRlbXBsYXRlL3ByZXZpb3VzUmVjb3Jkc1wiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgcHJpSGlzdG9yeVVJIGV4dGVuZHMgTGF5YS5TY2VuZSB7XHJcblx0XHRwdWJsaWMgcmFua05vOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIG5pY2tOYW1lOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIFVJRDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBWb2x1bWU6TGF5YS5MYWJlbDtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInRlbXBsYXRlL3ByaUhpc3RvcnlcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIHByaXhMaXN0VUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyBubzE6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgcmFua05vOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGF2YXRhcjpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBuaWNrTmFtZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBVSUQ6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgdG9kYXlWb2x1bWVUaXRsZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyB0b2RheVZvbHVtZTpMYXlhLkxhYmVsO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwidGVtcGxhdGUvcHJpeExpc3RcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIHJhbmtpbmdMaXN0VUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyByYW5raW5nOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIG5pY2tOYW1lOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHVpZDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBhbW91bnQ6TGF5YS5MYWJlbDtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInRlbXBsYXRlL3JhbmtpbmdMaXN0XCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyByZWNoYXJnZURpYWxvZ1VJIGV4dGVuZHMgTGF5YS5EaWFsb2cge1xyXG5cdFx0cHVibGljIGJ0bl9xdWlja1JlY2hhcmdlOkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyBidG5fd2l0aGRyYXc6TGF5YS5TcHJpdGU7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJ0ZW1wbGF0ZS9yZWNoYXJnZURpYWxvZ1wiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3Mgc2hvcnRMaXN0VUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyBudW1iZXI6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgbmlja05hbWU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgdXNlcklkOkxheWEuTGFiZWw7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJ0ZW1wbGF0ZS9zaG9ydExpc3RcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIHNob3dSb2NrZXRVSSBleHRlbmRzIExheWEuRGlhbG9nIHtcclxuXHRcdHB1YmxpYyBhbmkxOkxheWEuRnJhbWVBbmltYXRpb247XG5cdFx0cHVibGljIGFuaTI6TGF5YS5GcmFtZUFuaW1hdGlvbjtcblx0XHRwdWJsaWMgc2hvd2FuaTE6TGF5YS5BbmltYXRpb247XG5cdFx0cHVibGljIHNob3dhbmkyOkxheWEuQW5pbWF0aW9uO1xuXHRcdHB1YmxpYyBidG5fY2xvc2U6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIHJhbmtpbmc6TGF5YS5MaXN0O1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwidGVtcGxhdGUvc2hvd1JvY2tldFwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgVGlwc0RpYWxvZ1VJIGV4dGVuZHMgTGF5YS5EaWFsb2cge1xyXG5cdFx0cHVibGljIHRpdGxlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGJ0blZpZXdSZWNvcmQ6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgYnRuQ29udGludWU6TGF5YS5JbWFnZTtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInRlbXBsYXRlL1RpcHNEaWFsb2dcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIHRyZW5kTGlzdFVJIGV4dGVuZHMgTGF5YS5TY2VuZSB7XHJcblx0XHRwdWJsaWMgcGVyaW9kOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGhpdENvZGU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgYnRuX2J1eTpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBvZGRfZXZlbjpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBpc0JpZzpMYXlhLkxhYmVsO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwidGVtcGxhdGUvdHJlbmRMaXN0XCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyB3aW5uaW5nTGlzdFVJIGV4dGVuZHMgTGF5YS5TY2VuZSB7XHJcblx0XHRwdWJsaWMgcGVyaW9kQm94OkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyBwZXJpb2Q6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgZGF0ZUJveDpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgZGF0ZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBuYW1lQm94OkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyBuaWNrTmFtZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBhbW91bnRCb3g6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIGFtb3VudDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBjb2RlQm94OkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyBjb2RlOkxheWEuTGFiZWw7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJ0ZW1wbGF0ZS93aW5uaW5nTGlzdFwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cciIsImV4cG9ydCBjb25zdCBMYXllclR5cGUgPSB7XHJcbiAgICBMQVlFUl9TQ0VORTogXCJMQVlFUl9TQ0VORVwiLFxyXG4gICAgTEFZRVJfVUk6IFwiTEFZRVJfVUlcIixcclxuICAgIExBWUVSX01TRzogXCJMQVlFUl9NU0dcIlxyXG59XHJcbmNvbnN0IGxheWVyTWFwID0ge307XHJcblxyXG5leHBvcnQgY2xhc3MgTGF5ZXJNYW5hZ2VyIHtcclxuICAgIHN0YXRpYyBpbml0ZWQ6IGJvb2xlYW47XHJcbiAgICBzdGF0aWMgaW5pdChsYXllcnM6IHN0cmluZ1tdKSB7XHJcbiAgICAgICAgbGF5ZXJzLmZvckVhY2goKGxheWVyTmFtZTogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChsYXllck5hbWUgPT09IExheWVyVHlwZS5MQVlFUl9TQ0VORSkge1xyXG4gICAgICAgICAgICAgICAgbGF5ZXJNYXBbbGF5ZXJOYW1lXSA9IExheWEuU2NlbmUucm9vdDtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGxheWVyOiBMYXlhLlVJQ29tcG9uZW50ID0gbGF5ZXJNYXBbbGF5ZXJOYW1lXSA9IG5ldyBMYXlhLlVJQ29tcG9uZW50KCk7XHJcbiAgICAgICAgICAgICAgICBsYXllci5sZWZ0ID0gMDtcclxuICAgICAgICAgICAgICAgIGxheWVyLnJpZ2h0ID0gMDtcclxuICAgICAgICAgICAgICAgIGxheWVyLnRvcCA9IDA7XHJcbiAgICAgICAgICAgICAgICBsYXllci5ib3R0b20gPSAwO1xyXG4gICAgICAgICAgICAgICAgTGF5YS5zdGFnZS5hZGRDaGlsZChsYXllcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICAvLyBMYXlhLnN0YWdlLm9uKExheWEuRXZlbnQuUkVTSVpFLCB0aGlzLCB0aGlzLm9uUmVzaXplKTtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgYWRkVG9MYXllcihub2RlOiBMYXlhLk5vZGUsIGxheWVyTmFtZSk6IEJvb2xlYW4ge1xyXG4gICAgICAgIExheWVyTWFuYWdlci5jaGVja0luaXQoKTtcclxuICAgICAgICBpZiAoIW5vZGUpIHJldHVybiBmYWxzZTtcclxuICAgICAgICBjb25zdCBsYXllciA9IGxheWVyTWFwW2xheWVyTmFtZV07XHJcbiAgICAgICAgaWYgKCFsYXllcikgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIGxheWVyLmFkZENoaWxkKG5vZGUpO1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyByZW1vdmVGcm9tTGF5ZXIobm9kZTogTGF5YS5Ob2RlLCBsYXllck5hbWUpOiBCb29sZWFuIHtcclxuICAgICAgICBMYXllck1hbmFnZXIuY2hlY2tJbml0KCk7XHJcbiAgICAgICAgY29uc3QgbGF5ZXI6IExheWEuVUlDb21wb25lbnQgPSBsYXllck1hcFtsYXllck5hbWVdO1xyXG4gICAgICAgIGlmIChsYXllcikge1xyXG4gICAgICAgICAgICBjb25zdCByTm9kZTogTGF5YS5Ob2RlID0gbGF5ZXIucmVtb3ZlQ2hpbGQobm9kZSlcclxuICAgICAgICAgICAgaWYgKHJOb2RlKSByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBnZXRMYXllcihsYXllck5hbWUpOiBMYXlhLkNvbXBvbmVudCB7XHJcbiAgICAgICAgcmV0dXJuIGxheWVyTWFwW2xheWVyTmFtZV07XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGNoZWNrSW5pdCgpIHtcclxuICAgICAgICBpZiAoTGF5ZXJNYW5hZ2VyLmluaXRlZCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIExheWVyTWFuYWdlci5pbml0KFtcclxuICAgICAgICAgICAgTGF5ZXJUeXBlLkxBWUVSX1NDRU5FLFxyXG4gICAgICAgICAgICBMYXllclR5cGUuTEFZRVJfVUksXHJcbiAgICAgICAgICAgIExheWVyVHlwZS5MQVlFUl9NU0dcclxuICAgICAgICBdKTtcclxuICAgICAgICBMYXllck1hbmFnZXIuaW5pdGVkID0gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHN0YXRpYyBvblJlc2l6ZSgpOiB2b2lkIHtcclxuICAgICAgICBmb3IgKGNvbnN0IGxheWVyTmFtZSBpbiBsYXllck1hcCkge1xyXG4gICAgICAgICAgICBpZiAobGF5ZXJOYW1lICE9PSBMYXllclR5cGUuTEFZRVJfU0NFTkUgJiYgbGF5ZXJNYXAuaGFzT3duUHJvcGVydHkobGF5ZXJOYW1lKSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbGF5ZXI6IExheWEuVUlDb21wb25lbnQgPSBsYXllck1hcFtsYXllck5hbWVdO1xyXG4gICAgICAgICAgICAgICAgbGF5ZXIuc2l6ZShMYXlhLnN0YWdlLndpZHRoLCBMYXlhLnN0YWdlLmhlaWdodCk7XHJcbiAgICAgICAgICAgICAgICBsYXllci5ldmVudChMYXlhLkV2ZW50LlJFU0laRSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG59IiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTE5IDE3OjUwOjEwXHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTE5IDE3OjUwOjEwXHJcbiAqIEBkZXNjIOW6lemDqOWvvOiIqlRhYmJhcuiEmuacrFxyXG4gKi9cclxuaW1wb3J0IHsgdWkgfSBmcm9tICcuLi91aS9sYXlhTWF4VUknXHJcbmltcG9ydCB7IEdhbWVNb2RlbCB9IGZyb20gJy4uL2pzL0dhbWVNb2RlbCc7XHJcblxyXG5jb25zdCB0YWJiYXJBcnI6c3RyaW5nW10gPSBbJ2hvbWUuc2NlbmUnLCdyZWNvcmQuc2NlbmUnLCdhc3Npc3RhbnQuc2NlbmUnXSAvL3RhYmJhcueahOmhtemdolxyXG5jb25zdCBwYWdlQXJyOnN0cmluZ1tdID0gW1xyXG4gICAgJ2d1ZXNzaW5nLnNjZW5lJywnZ3JhbmRQcml4LnNjZW5lJyxcclxuICAgICdwcmlIaXN0b3J5U2NlbmUuc2NlbmUnLCd4Y3RqLnNjZW5lJyxcclxuICAgICdzaG9ydExpc3RlZC5zY2VuZSdcclxuXSAvL+mdnnRhYmJhcumhtemdolxyXG5cclxuZXhwb3J0IGNsYXNzIFRhYmJhciBleHRlbmRzIHVpLlRhYmJhclVJIHtcclxuICAgIC8qKumhtemdouS8oOmAkueahOWPguaVsCAqL1xyXG4gICAgcHJpdmF0ZSBfb3BlblNjZW5lUGFyYW06IGFueTtcclxuICAgIC8qKumAieS4reeahHRhYmJhciAqL1xyXG4gICAgc3RhdGljIF90YWJiYXI6VGFiYmFyO1xyXG4gICAgLyoq6aG16Z2i5pWw57uEICovXHJcbiAgICBzdGF0aWMgcmVhZG9ubHkgU0NFTkVTOnN0cmluZ1tdID0gWy4uLnRhYmJhckFyciwuLi5wYWdlQXJyXVxyXG5cclxuICAgIHN0YXRpYyBnZXRJbnN0YW5jZSgpOlRhYmJhciB7XHJcbiAgICAgICAgaWYoIXRoaXMuX3RhYmJhcil7XHJcbiAgICAgICAgICAgIHRoaXMuX3RhYmJhciA9IG5ldyBUYWJiYXIoKVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdGhpcy5fdGFiYmFyO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBzaG93KCl7XHJcbiAgICAgICAgbGV0IHRhYkluczpUYWJiYXIgPSB0aGlzLmdldEluc3RhbmNlKClcclxuICAgICAgICBMYXlhLnN0YWdlLmFkZENoaWxkKHRhYklucylcclxuICAgIH1cclxuICAgIHN0YXRpYyBoaWRlKCl7XHJcbiAgICAgICAgaWYodGhpcy5fdGFiYmFyKXtcclxuICAgICAgICAgICAgdGhpcy5fdGFiYmFyLnJlbW92ZVNlbGYoKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgb25FbmFibGUoKXtcclxuICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5vbignZ2V0Tm90aWNlJyx0aGlzLChyZXM6YW55KT0+e1xyXG4gICAgICAgICAgICBpZiAocmVzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5vdGljZS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5vdGljZS52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIC8qKumdnnRhYmJhcui3s+i9rOmhtemdoizlj6/mkLrluKblj4LmlbAgKi9cclxuICAgIG9wZW5TY2VuZShzY2VuZTogc3RyaW5nLCBwYXJhbT86IGFueSkge1xyXG4gICAgICAgIHRoaXMuX29wZW5TY2VuZVBhcmFtID0gcGFyYW07XHJcbiAgICAgICAgdGhpcy50YWIuc2VsZWN0ZWRJbmRleCA9IFRhYmJhci5TQ0VORVMuaW5kZXhPZihzY2VuZSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoq55uR6KeGdGFiYmFy5pS55Y+YICovXHJcbiAgICBjcmVhdGVWaWV3KHZpZXc6YW55KXtcclxuICAgICAgICBzdXBlci5jcmVhdGVWaWV3KHZpZXcpXHJcbiAgICAgICAgdGhpcy50YWIub24oTGF5YS5FdmVudC5DSEFOR0UsdGhpcyx0aGlzLm9uQ2xpY2tUYWIpO1xyXG4gICAgICAgIC8vIHRoaXMub25DbGlja1RhYigpO1xyXG4gICAgfVxyXG4gICAgXHJcblxyXG4gICAgLyoq54K55Ye7dGFiYmFy5LqL5Lu2ICovXHJcbiAgICBvbkNsaWNrVGFiKCkge1xyXG4gICAgICAgIGxldCB1c2VySW5mbyA9IE9iamVjdC5rZXlzKEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLnVzZXJJbmZvKTtcclxuICAgICAgICBsZXQgc2NlbmU6c3RyaW5nID0gVGFiYmFyLlNDRU5FU1t0aGlzLnRhYi5zZWxlY3RlZEluZGV4XTtcclxuICAgICAgICBpZiAodXNlckluZm8ubGVuZ3RoID09PSAwICYmIChzY2VuZSA9PT0gJ3JlY29yZC5zY2VuZScgfHwgc2NlbmUgPT09ICdhc3Npc3RhbnQuc2NlbmUnKSkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygn5pyq55m75b2V6Lez6L2s55m75b2VJyk7XHJcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gYGh0dHBzOi8vJHtkb2N1bWVudC5kb21haW59LyMvc2lnbl9vbmVgXHJcbiAgICAgICAgfWVsc2Uge1xyXG4gICAgICAgICAgICBMYXlhLlNjZW5lLm9wZW4oc2NlbmUsIHRydWUsIHRoaXMuX29wZW5TY2VuZVBhcmFtKTtcclxuICAgICAgICAgICAgdGhpcy5fb3BlblNjZW5lUGFyYW0gPSBudWxsO1xyXG4gICAgICAgICAgICB0aGlzLnRhYi5pdGVtcy5mb3JFYWNoKGl0ZW09PntcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRhYkJ0bjogTGF5YS5CdXR0b24gPSBpdGVtIGFzIExheWEuQnV0dG9uO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaW1nQnRuOiBMYXlhLkJ1dHRvbiA9IHRhYkJ0bi5nZXRDaGlsZEF0KDApIGFzIExheWEuQnV0dG9uO1xyXG4gICAgICAgICAgICAgICAgaW1nQnRuLnNlbGVjdGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIHRhYmJhckFyci5mb3JFYWNoKGl0ZW09PntcclxuICAgICAgICAgICAgICAgIGlmIChpdGVtID09PSBzY2VuZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhYkJ0bjogTGF5YS5CdXR0b24gPSB0aGlzLnRhYi5zZWxlY3Rpb24gYXMgTGF5YS5CdXR0b247XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW1nQnRuOiBMYXlhLkJ1dHRvbiA9IHRhYkJ0bi5nZXRDaGlsZEF0KDApIGFzIExheWEuQnV0dG9uO1xyXG4gICAgICAgICAgICAgICAgICAgIGltZ0J0bi5zZWxlY3RlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC8v5YWz6Zet5bCP57qi54K5XHJcbiAgICAgICAgICAgIGlmIChzY2VuZSA9PT0gJ3JlY29yZC5zY2VuZScpIHtcclxuICAgICAgICAgICAgICAgIEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLm5vdGljZUZ1bmMoZmFsc2UpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJpbXBvcnQgeyBMYXllck1hbmFnZXIsIExheWVyVHlwZSB9IGZyb20gXCIuL0xheWVyTWFuYWdlclwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFRvYXN0IGV4dGVuZHMgTGF5YS5VSUNvbXBvbmVudCB7XHJcblxyXG4gICAgc3RhdGljIE1JTl9XSURUSDogbnVtYmVyID0gMjAwO1xyXG4gICAgc3RhdGljIE1BWF9XSURUSDogbnVtYmVyID0gNTAwO1xyXG4gICAgc3RhdGljIFRPUDogbnVtYmVyID0gMjM7XHJcbiAgICBzdGF0aWMgQk9UVE9NOiBudW1iZXIgPSAyMDtcclxuICAgIHN0YXRpYyBNQVJHSU46IG51bWJlciA9IDE1O1xyXG4gICAgc3RhdGljIE1JTl9IRUlHSFQ6IG51bWJlciA9IDgwO1xyXG4gICAgc3RhdGljIEZPTlRfU0laRTogbnVtYmVyID0gMjY7XHJcbiAgICBzdGF0aWMgQ09MT1I6IHN0cmluZyA9IFwiI2ZmZmZmZlwiO1xyXG4gICAgc3RhdGljIEJHX0lNR19VUkw6IHN0cmluZyA9IFwiY29tcC9pbWdfdG9hc3RfYmcucG5nXCI7XHJcbiAgICBzdGF0aWMgRFVSQVRJT046IG51bWJlciA9IDI1MDA7XHJcblxyXG4gICAgcHJpdmF0ZSBzdGF0aWMgaW5zdGFuY2U6IFRvYXN0O1xyXG4gICAgcHJpdmF0ZSBzdGF0aWMgc3RvcmVUZXh0TGlzdDogYW55W10gPSBbXTtcclxuXHJcbiAgICBzdGF0aWMgc2hvdyh0ZXh0OiBzdHJpbmcsIGR1cmF0aW9uOiBudW1iZXIgPSBUb2FzdC5EVVJBVElPTiwgY292ZXJCZWZvcmU6IGJvb2xlYW4gPSB0cnVlKSB7XHJcbiAgICAgICAgaWYgKCFUb2FzdC5pbnN0YW5jZSkge1xyXG4gICAgICAgICAgICBUb2FzdC5pbnN0YW5jZSA9IG5ldyBUb2FzdCgpO1xyXG4gICAgICAgICAgICBUb2FzdC5pbnN0YW5jZS5vbihMYXlhLkV2ZW50LkNMT1NFLCBUb2FzdCwgVG9hc3Qub25DbG9zZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChjb3ZlckJlZm9yZSAmJiBUb2FzdC5pbnN0YW5jZS5wYXJlbnQpIHtcclxuICAgICAgICAgICAgVG9hc3QuaW5zdGFuY2Uuc2V0VGV4dCh0ZXh0KTtcclxuICAgICAgICAgICAgVG9hc3QuaW5zdGFuY2UudGltZXIub25jZShkdXJhdGlvbiB8fCBUb2FzdC5EVVJBVElPTiwgVG9hc3QuaW5zdGFuY2UsIFRvYXN0Lmluc3RhbmNlLmNsb3NlLCBudWxsLCB0cnVlKTtcclxuICAgICAgICB9IGVsc2UgaWYgKCFUb2FzdC5pbnN0YW5jZS5wYXJlbnQpIHtcclxuICAgICAgICAgICAgVG9hc3QuZG9TaG93KHRleHQsIGR1cmF0aW9uKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBUb2FzdC5zdG9yZVRleHRMaXN0LnB1c2goe1xyXG4gICAgICAgICAgICAgICAgdGV4dDogdGV4dCxcclxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiBkdXJhdGlvblxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJvdGVjdGVkIHN0YXRpYyBkb1Nob3codGV4dDogc3RyaW5nLCBkdXJhdGlvbjogbnVtYmVyKSB7XHJcbiAgICAgICAgVG9hc3QuaW5zdGFuY2Uuc2V0VGV4dCh0ZXh0KTtcclxuICAgICAgICBMYXllck1hbmFnZXIuYWRkVG9MYXllcihUb2FzdC5pbnN0YW5jZSwgTGF5ZXJUeXBlLkxBWUVSX01TRyk7XHJcbiAgICAgICAgVG9hc3QuaW5zdGFuY2UudGltZXIub25jZShkdXJhdGlvbiB8fCBUb2FzdC5EVVJBVElPTiwgVG9hc3QuaW5zdGFuY2UsIFRvYXN0Lmluc3RhbmNlLmNsb3NlLCBudWxsLCB0cnVlKTtcclxuICAgIH1cclxuXHJcbiAgICBwcm90ZWN0ZWQgc3RhdGljIG9uQ2xvc2UoKSB7XHJcbiAgICAgICAgaWYgKFRvYXN0LnN0b3JlVGV4dExpc3QubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICB2YXIgZGF0YTogYW55ID0gVG9hc3Quc3RvcmVUZXh0TGlzdC5zaGlmdCgpO1xyXG4gICAgICAgICAgICBUb2FzdC5kb1Nob3coZGF0YS50ZXh0LCBkYXRhLmR1cmF0aW9uKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYmc6IExheWEuSW1hZ2U7XHJcbiAgICBsYWJlbDogTGF5YS5MYWJlbDtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgfVxyXG5cclxuICAgIHNldFRleHQodGV4dDogc3RyaW5nKSB7XHJcbiAgICAgICAgdGhpcy53aWR0aCA9IFRvYXN0Lk1BWF9XSURUSDtcclxuICAgICAgICB0aGlzLmxhYmVsLndpZHRoID0gTmFOO1xyXG4gICAgICAgIHRoaXMubGFiZWwuZGF0YVNvdXJjZSA9IHRleHQ7XHJcbiAgICAgICAgdGhpcy5vblRleHRDaGFuZ2UoKTtcclxuICAgIH1cclxuXHJcbiAgICBjbG9zZSgpIHtcclxuICAgICAgICB0aGlzLnJlbW92ZVNlbGYoKTtcclxuICAgICAgICB0aGlzLmV2ZW50KExheWEuRXZlbnQuQ0xPU0UpO1xyXG4gICAgfVxyXG5cclxuICAgIGNyZWF0ZUNoaWxkcmVuKCkge1xyXG4gICAgICAgIHRoaXMuY2VudGVyWCA9IDA7XHJcbiAgICAgICAgdGhpcy5oZWlnaHQgPSBUb2FzdC5NQVJHSU4gKyBUb2FzdC5NQVJHSU47XHJcblxyXG4gICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgdGhpcy5iZyA9IG5ldyBMYXlhLkltYWdlKCk7XHJcbiAgICAgICAgdGhpcy5iZy5za2luID0gVG9hc3QuQkdfSU1HX1VSTDtcclxuICAgICAgICB0aGlzLmJnLnNpemVHcmlkID0gXCIyNSwyNSwyNSwyNVwiO1xyXG4gICAgICAgIHRoaXMuYmcubGVmdCA9IHRoaXMuYmcucmlnaHQgPSB0aGlzLmJnLnRvcCA9IHRoaXMuYmcuYm90dG9tID0gMDtcclxuICAgICAgICB0aGlzLmFkZENoaWxkKHRoaXMuYmcpO1xyXG5cclxuICAgICAgICB0aGlzLmxhYmVsID0gbmV3IExheWEuTGFiZWwoKTtcclxuICAgICAgICB0aGlzLmxhYmVsLmNvbG9yID0gVG9hc3QuQ09MT1I7XHJcbiAgICAgICAgdGhpcy5sYWJlbC5mb250U2l6ZSA9IFRvYXN0LkZPTlRfU0laRTtcclxuICAgICAgICB0aGlzLmxhYmVsLmFsaWduID0gXCJjZW50ZXJcIjtcclxuICAgICAgICB0aGlzLmxhYmVsLnkgPSBUb2FzdC5UT1A7XHJcbiAgICAgICAgdGhpcy5sYWJlbC5jZW50ZXJYID0gMDtcclxuICAgICAgICAvLyB0aGlzLmxhYmVsLmNlbnRlclkgPSAwO1xyXG4gICAgICAgIC8vIHRoaXMubGFiZWwuc3Ryb2tlID0gMTtcclxuICAgICAgICAvLyB0aGlzLmxhYmVsLnN0cm9rZUNvbG9yID0gXCIjMDAwMDAwXCI7XHJcbiAgICAgICAgLy8gdGhpcy5sYWJlbC50b3AgPSBUb2FzdC5NQVJHSU47XHJcbiAgICAgICAgLy8gdGhpcy5sYWJlbC5ib3R0b20gPSBUb2FzdC5NQVJHSU47XHJcbiAgICAgICAgLy8gdGhpcy5sYWJlbC5sZWZ0ID0gVG9hc3QuTUFSR0lOO1xyXG4gICAgICAgIC8vIHRoaXMubGFiZWwucmlnaHQgPSBUb2FzdC5NQVJHSU47XHJcbiAgICAgICAgdGhpcy5sYWJlbC5sZWFkaW5nID0gMTU7XHJcbiAgICAgICAgdGhpcy5sYWJlbC53b3JkV3JhcCA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5hZGRDaGlsZCh0aGlzLmxhYmVsKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gcHJvdGVjdGVkIGluaXRpYWxpemUoKSB7XHJcbiAgICAvLyAgICAgc3VwZXIuaW5pdGlhbGl6ZSgpO1xyXG4gICAgLy8gICAgIHRoaXMuYmluZFZpZXdFdmVudCh0aGlzLmxhYmVsLCBMYXlhLkV2ZW50LkNIQU5HRSwgdGhpcy5vblRleHRDaGFuZ2UpO1xyXG4gICAgLy8gfVxyXG5cclxuICAgIHByb3RlY3RlZCBvblRleHRDaGFuZ2UoKSB7XHJcbiAgICAgICAgbGV0IHRleHRXOiBudW1iZXIgPSB0aGlzLmxhYmVsLndpZHRoO1xyXG4gICAgICAgIGNvbnN0IG1heFRleHRXOiBudW1iZXIgPSBUb2FzdC5NQVhfV0lEVEggLSBUb2FzdC5NQVJHSU4gKiAyO1xyXG4gICAgICAgIC8vIGNvbnN0IG1pblRleHRXOiBudW1iZXIgPSBUb2FzdC5NSU5fV0lEVEggLSBUb2FzdC5NQVJHSU4gKiAyO1xyXG4gICAgICAgIGlmICh0ZXh0VyA+IG1heFRleHRXKSB7XHJcbiAgICAgICAgICAgIHRoaXMubGFiZWwud2lkdGggPSBtYXhUZXh0VztcclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IHc6IG51bWJlciA9IHRoaXMubGFiZWwud2lkdGggKyBUb2FzdC5NQVJHSU4gKiAyO1xyXG4gICAgICAgIHcgPSBNYXRoLm1pbih3LCBUb2FzdC5NQVhfV0lEVEgpO1xyXG4gICAgICAgIHcgPSBNYXRoLm1heCh3LCBUb2FzdC5NSU5fV0lEVEgpO1xyXG4gICAgICAgIHRoaXMud2lkdGggPSB3O1xyXG4gICAgICAgIC8vIHRoaXMuaGVpZ2h0ID0gdGhpcy5sYWJlbC5oZWlnaHQgKyBUb2FzdC5UT1AgKyBUb2FzdC5CT1RUT007XHJcbiAgICAgICAgdGhpcy5oZWlnaHQgPSB0aGlzLmxhYmVsLmhlaWdodCArIFRvYXN0Lk1BUkdJTiAqIDI7XHJcbiAgICAgICAgdGhpcy54ID0gKExheWEuc3RhZ2Uud2lkdGggLSB0aGlzLndpZHRoKSA+PiAxO1xyXG4gICAgICAgIHRoaXMueSA9IChMYXlhLnN0YWdlLmhlaWdodCAtIHRoaXMuaGVpZ2h0KSA+PiAxO1xyXG4gICAgfVxyXG5cclxuICAgIHByb3RlY3RlZCBvbkNvbXBSZXNpemUoKSB7XHJcbiAgICAgICAgLy8gaWYgKHRoaXMubGFiZWwpIHtcclxuICAgICAgICAvLyAgICAgdGhpcy5oZWlnaHQgPSB0aGlzLmxhYmVsLmhlaWdodCArIE1lc3NhZ2VUaXAuTUFSR0lOICsgTWVzc2FnZVRpcC5NQVJHSU47XHJcbiAgICAgICAgLy8gfVxyXG4gICAgICAgIGlmICh0aGlzLmJnKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYmcud2lkdGggPSB0aGlzLndpZHRoO1xyXG4gICAgICAgICAgICB0aGlzLmJnLmhlaWdodCA9IHRoaXMuaGVpZ2h0O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsImltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xyXG5pbXBvcnQgeyBHYW1lTW9kZWwgfSBmcm9tIFwiLi4vanMvR2FtZU1vZGVsXCI7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSb2NrZXREaWFsb2cgZXh0ZW5kcyB1aS50ZW1wbGF0ZS5zaG93Um9ja2V0VUkge1xyXG4gICAgcHJpdmF0ZSBzdGF0aWMgX2RsZzogUm9ja2V0RGlhbG9nO1xyXG5cclxuICAgIHN0YXRpYyBnZXQgZGxnKCk6IFJvY2tldERpYWxvZyB7XHJcbiAgICAgICAgaWYgKCF0aGlzLl9kbGcpIHtcclxuICAgICAgICAgICAgdGhpcy5fZGxnID0gbmV3IFJvY2tldERpYWxvZygpO1xyXG4gICAgICAgICAgICB0aGlzLl9kbGcueCA9IDA7XHJcbiAgICAgICAgICAgIHRoaXMuX2RsZy55ID0gMDtcclxuICAgICAgICAgICAgdGhpcy5fZGxnLmlzUG9wdXBDZW50ZXIgPSBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RsZztcclxuICAgIH1cclxuICAgIFxyXG4gICAgb25FbmFibGUoKXtcclxuICAgICAgIHRoaXMuYnRuX2Nsb3NlLm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLmNsb3NlRGlhbG9nKVxyXG4gICAgICAgdGhpcy5hbmkxLnBsYXkoMCxmYWxzZSlcclxuICAgICAgIHRoaXMuYW5pMi5wbGF5KDAsZmFsc2UpXHJcbiAgICAgICB0aGlzLnJhbmtpbmcuYXJyYXkgPSBbXHJcbiAgICAgICAgICAge3Jhbmtpbmc6JzAxJyxuaWNrTmFtZTon5byg5LiJJyx1aWQ6JzEyMzMyMycsYW1vdW50OiczMjMuMzInfSxcclxuICAgICAgICAgICB7cmFua2luZzonMDInLG5pY2tOYW1lOiflvKDkuIknLHVpZDonMTIzMzIzJyxhbW91bnQ6JzMyMy4zMid9LFxyXG4gICAgICAgICAgIHtyYW5raW5nOicwMycsbmlja05hbWU6J+W8oOS4iScsdWlkOicxMjMzMjMnLGFtb3VudDonMzIzLjMyJ30sXHJcbiAgICAgICAgICAge3Jhbmtpbmc6JzA0JyxuaWNrTmFtZTon5byg5LiJJyx1aWQ6JzEyMzMyMycsYW1vdW50OiczMjMuMzInfSxcclxuICAgICAgICAgICB7cmFua2luZzonMDUnLG5pY2tOYW1lOiflvKDkuIknLHVpZDonMTIzMzIzJyxhbW91bnQ6JzMyMy4zMid9LFxyXG4gICAgICAgICAgIHtyYW5raW5nOicwNicsbmlja05hbWU6J+W8oOS4iScsdWlkOicxMjMzMjMnLGFtb3VudDonMzIzLjMyJ30sXHJcbiAgICAgICAgICAge3Jhbmtpbmc6JzA3JyxuaWNrTmFtZTon5byg5LiJJyx1aWQ6JzEyMzMyMycsYW1vdW50OiczMjMuMzInfSxcclxuICAgICAgICAgICB7cmFua2luZzonMDgnLG5pY2tOYW1lOiflvKDkuIknLHVpZDonMTIzMzIzJyxhbW91bnQ6JzMyMy4zMid9LFxyXG4gICAgICAgICAgIHtyYW5raW5nOicwOScsbmlja05hbWU6J+W8oOS4iScsdWlkOicxMjMzMjMnLGFtb3VudDonMzIzLjMyJ30sXHJcbiAgICAgICAgICAge3Jhbmtpbmc6JzEwJyxuaWNrTmFtZTon5byg5LiJJyx1aWQ6JzEyMzMyMycsYW1vdW50OiczMjMuMzInfSxcclxuICAgICAgICAgICB7cmFua2luZzonMTEnLG5pY2tOYW1lOiflvKDkuIknLHVpZDonMTIzMzIzJyxhbW91bnQ6JzMyMy4zMid9LFxyXG4gICAgICAgICAgIHtyYW5raW5nOicxMicsbmlja05hbWU6J+W8oOS4iScsdWlkOicxMjMzMjMnLGFtb3VudDonMzIzLjMyJ30sXHJcbiAgICAgICAgICAge3Jhbmtpbmc6JzEzJyxuaWNrTmFtZTon5byg5LiJJyx1aWQ6JzEyMzMyMycsYW1vdW50OiczMjMuMzInfSxcclxuICAgICAgICAgICB7cmFua2luZzonMTQnLG5pY2tOYW1lOiflvKDkuIknLHVpZDonMTIzMzIzJyxhbW91bnQ6JzMyMy4zMid9LFxyXG4gICAgICAgICAgIHtyYW5raW5nOicxNScsbmlja05hbWU6J+W8oOS4iScsdWlkOicxMjMzMjMnLGFtb3VudDonMzIzLjMyJ31cclxuICAgICAgIF1cclxuICAgIH1cclxuICAgIHN0YXRpYyBpbml0KCl7XHJcbiAgICAgICAgR2FtZU1vZGVsLmdldEluc3RhbmNlKCkub24oJ2dldFJvY2tldFJhbmtpbmcnLHRoaXMsKHJlczphbnkpPT57XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfmlbDmja7lj5jliqgyJyk7XHJcbiAgICAgICAgICAgIHRoaXMuZGxnLnBvcHVwKGZhbHNlLCBmYWxzZSk7XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBjbG9zZURpYWxvZygpe1xyXG4gICAgICAgIHRoaXMuY2xvc2UoKVxyXG4gICAgfVxyXG5cclxufSIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XHJcblxyXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcclxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXHJcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcclxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cclxuXHJcbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xyXG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xyXG5cclxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xyXG59XHJcbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcclxufVxyXG4oZnVuY3Rpb24gKCkge1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XHJcbiAgICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xyXG4gICAgfVxyXG4gICAgdHJ5IHtcclxuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcclxuICAgICAgICB9XHJcbiAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcclxuICAgIH1cclxufSAoKSlcclxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcclxuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XHJcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXHJcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcclxuICAgIH1cclxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXHJcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcclxuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcclxuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xyXG4gICAgfVxyXG4gICAgdHJ5IHtcclxuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXHJcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcclxuICAgIH0gY2F0Y2goZSl7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XHJcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcclxuICAgICAgICB9IGNhdGNoKGUpe1xyXG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxyXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbn1cclxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xyXG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XHJcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXHJcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xyXG4gICAgfVxyXG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxyXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XHJcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xyXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcclxuICAgIH1cclxuICAgIHRyeSB7XHJcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xyXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcclxuICAgIH0gY2F0Y2ggKGUpe1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XHJcbiAgICAgICAgfSBjYXRjaCAoZSl7XHJcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxyXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XHJcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG5cclxufVxyXG52YXIgcXVldWUgPSBbXTtcclxudmFyIGRyYWluaW5nID0gZmFsc2U7XHJcbnZhciBjdXJyZW50UXVldWU7XHJcbnZhciBxdWV1ZUluZGV4ID0gLTE7XHJcblxyXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XHJcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xyXG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcclxuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XHJcbiAgICB9XHJcbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XHJcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xyXG4gICAgaWYgKGRyYWluaW5nKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XHJcbiAgICBkcmFpbmluZyA9IHRydWU7XHJcblxyXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcclxuICAgIHdoaWxlKGxlbikge1xyXG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xyXG4gICAgICAgIHF1ZXVlID0gW107XHJcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xyXG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XHJcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xyXG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcclxuICAgIH1cclxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XHJcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xyXG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xyXG59XHJcblxyXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xyXG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xyXG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcclxuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XHJcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcclxuICAgIH1cclxufTtcclxuXHJcbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcclxuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XHJcbiAgICB0aGlzLmZ1biA9IGZ1bjtcclxuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcclxufVxyXG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcclxufTtcclxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcclxucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcclxucHJvY2Vzcy5lbnYgPSB7fTtcclxucHJvY2Vzcy5hcmd2ID0gW107XHJcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xyXG5wcm9jZXNzLnZlcnNpb25zID0ge307XHJcblxyXG5mdW5jdGlvbiBub29wKCkge31cclxuXHJcbnByb2Nlc3Mub24gPSBub29wO1xyXG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcclxucHJvY2Vzcy5vbmNlID0gbm9vcDtcclxucHJvY2Vzcy5vZmYgPSBub29wO1xyXG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcclxucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xyXG5wcm9jZXNzLmVtaXQgPSBub29wO1xyXG5wcm9jZXNzLnByZXBlbmRMaXN0ZW5lciA9IG5vb3A7XHJcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XHJcblxyXG5wcm9jZXNzLmxpc3RlbmVycyA9IGZ1bmN0aW9uIChuYW1lKSB7IHJldHVybiBbXSB9XHJcblxyXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xyXG59O1xyXG5cclxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcclxucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XHJcbn07XHJcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XHJcbiJdfQ==
