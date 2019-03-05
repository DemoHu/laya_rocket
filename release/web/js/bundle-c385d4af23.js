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
        //预加载
        Laya.loader.load(loadingResList_1.default, Laya.Handler.create(this, this.onGameResLoaded));
    }
    onGameResLoaded() {
        //加载IDE指定的场景
        GameConfig_1.default.startScene && Laya.Scene.open(GameConfig_1.default.startScene);
    }
}
//激活启动类
new Main();
},{"./GameConfig":27,"./loadingResList":34,"./view/rocketDialog":63}],29:[function(require,module,exports){
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
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-28 11:29:41
 * @modify date 2019-02-28 11:29:41
 * @desc 资源列表
 */
Object.defineProperty(exports, "__esModule", { value: true });
//图片资源
const comp = [
    { url: "res/atlas/comp.atlas", type: "atlas" },
    { url: "res/atlas/comp/home.atlas", type: "atlas" },
    { url: "res/atlas/comp/home/fire.atlas", type: "atlas" },
    { url: "res/atlas/comp/home/wave.atlas", type: "atlas" },
    { url: "comp/img_star_bg01.png", type: "image" },
    // { url: "comp/img_banner01.png", type: "image" },
    // { url: "comp/img_myrank01.png", type: "image" },
    { url: "comp/img_payment_bg01.png", type: "image" },
    // { url: "comp/img_rank01.png", type: "image" },
    { url: "comp/img_ranklist_bg01.png", type: "image" },
    { url: "comp/img_rocketRanking_bg01.png", type: "image" },
];
// 页面资源
const scene = [
    { url: "assistant.json", type: "json" },
    { url: "Card.json", type: "json" },
    { url: "fileconfig.json", type: "json" },
    // { url: "grandPrix.json", type: "json" },
    { url: "guessing.json", type: "json" },
    { url: "home.json", type: "json" },
    // { url: "priHistoryScene.json", type: "json" },
    // { url: "record.json", type: "json" },
    { url: "unpack.json", type: "json" },
    // { url: "shortListed.json", type: "json" },
    { url: "Tabbar.json", type: "json" },
    { url: "version.json", type: "json" },
    // { url: "xctj.json", type: "json" },
    { url: "template/InputPwdDialog.json", type: "json" },
    // { url: "template/joinRecords.json", type: "json" },
    { url: "template/numberListDOM.json", type: "json" },
    // { url: "template/previousRecords.json", type: "json" },
    // { url: "template/priHistory.json", type: "json" },
    // { url: "template/prixList.json", type: "json" },
    // { url: "template/rankingList.json", type: "json" },
    { url: "template/rechargeDialog.json", type: "json" },
    // { url: "template/shortList.json", type: "json" },
    { url: "template/showRocket.json", type: "json" },
    { url: "template/TipsDialog.json", type: "json" },
    { url: "template/trendList.json", type: "json" },
];
const loadingResList = [
    ...comp,
    ...scene
];
exports.default = loadingResList;
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
        Tabbar_1.Tabbar.getInstance().openScene('guessing.scene', this._dataSource.goodsId);
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
const socket_1 = require("../js/socket");
const rechargeDialog_1 = require("../template/rechargeDialog");
class Home extends layaMaxUI_1.ui.homeUI {
    constructor() {
        super();
        this.btnRecharge.on(Laya.Event.CLICK, this, this.btnRechargeFunc);
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
        const domain = document.domain;
        window.location.href = `https://${domain}/#/main_Page`;
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
},{"../js/GameModel":29,"../js/api":30,"../js/socket":32,"../js/utils":33,"../template/rechargeDialog":54,"../ui/layaMaxUI":59,"../view/Toast":62}],42:[function(require,module,exports){
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
        console.log(this._item.period);
        Tabbar_1.Tabbar.getInstance().openScene('guessing.scene', this._item.goodsId);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL0Rvd25sb2Fkcy9MYXlhQWlySURFL3Jlc291cmNlcy9hcHAvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvYWRhcHRlcnMveGhyLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9heGlvcy5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvY2FuY2VsL0NhbmNlbC5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvY2FuY2VsL0NhbmNlbFRva2VuLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9jYW5jZWwvaXNDYW5jZWwuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2NvcmUvQXhpb3MuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2NvcmUvSW50ZXJjZXB0b3JNYW5hZ2VyLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9jb3JlL2NyZWF0ZUVycm9yLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9jb3JlL2Rpc3BhdGNoUmVxdWVzdC5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvY29yZS9lbmhhbmNlRXJyb3IuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2NvcmUvc2V0dGxlLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9jb3JlL3RyYW5zZm9ybURhdGEuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2RlZmF1bHRzLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9oZWxwZXJzL2JpbmQuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2hlbHBlcnMvYnRvYS5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvaGVscGVycy9idWlsZFVSTC5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvaGVscGVycy9jb21iaW5lVVJMcy5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvaGVscGVycy9jb29raWVzLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9oZWxwZXJzL2lzQWJzb2x1dGVVUkwuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2hlbHBlcnMvaXNVUkxTYW1lT3JpZ2luLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9oZWxwZXJzL25vcm1hbGl6ZUhlYWRlck5hbWUuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2hlbHBlcnMvcGFyc2VIZWFkZXJzLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9oZWxwZXJzL3NwcmVhZC5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvdXRpbHMuanMiLCJub2RlX21vZHVsZXMvYXhpb3Mvbm9kZV9tb2R1bGVzL2lzLWJ1ZmZlci9pbmRleC5qcyIsInNyYy9HYW1lQ29uZmlnLnRzIiwic3JjL01haW4udHMiLCJzcmMvanMvR2FtZU1vZGVsLnRzIiwic3JjL2pzL2FwaS50cyIsInNyYy9qcy9odHRwLnRzIiwic3JjL2pzL3NvY2tldC50cyIsInNyYy9qcy91dGlscy50cyIsInNyYy9sb2FkaW5nUmVzTGlzdC50cyIsInNyYy9wdWJsaWNTY3JpcHQvUGFnZU5hdlNjcmlwdC50cyIsInNyYy9wdWJsaWNTY3JpcHQvUGFnZVNjcmlwdC50cyIsInNyYy9wdWJsaWNTY3JpcHQvU2NyZWVuLnRzIiwic3JjL3NjcmlwdC9Bc3Npc3RhbnQudHMiLCJzcmMvc2NyaXB0L0NhcmQudHMiLCJzcmMvc2NyaXB0L0d1ZXNzaW5nLnRzIiwic3JjL3NjcmlwdC9Ib21lLnRzIiwic3JjL3NjcmlwdC9SZWNvcmQudHMiLCJzcmMvc2NyaXB0L2dyYW5kUHJpeC50cyIsInNyYy9zY3JpcHQvcHJpSGlzdG9yeVNjZW5lLnRzIiwic3JjL3NjcmlwdC9zaG9ydExpc3RlZC50cyIsInNyYy9zY3JpcHQvd2lubmluZy50cyIsInNyYy90ZW1wbGF0ZS9qb2luUmVjb3Jkcy50cyIsInNyYy90ZW1wbGF0ZS9udW1iZXJMaXN0RG9tU2NyaXB0LnRzIiwic3JjL3RlbXBsYXRlL3ByZXZpb3VzUmVjb3Jkcy50cyIsInNyYy90ZW1wbGF0ZS9wcmlIaXN0b3J5LnRzIiwic3JjL3RlbXBsYXRlL3ByaXhMaXN0LnRzIiwic3JjL3RlbXBsYXRlL3Bzd0lucHV0LnRzIiwic3JjL3RlbXBsYXRlL3JhbmtpbmdMaXN0LnRzIiwic3JjL3RlbXBsYXRlL3JlY2hhcmdlRGlhbG9nLnRzIiwic3JjL3RlbXBsYXRlL3Nob3J0TGlzdGVkTGlzdC50cyIsInNyYy90ZW1wbGF0ZS90aXBEaWFsb2cudHMiLCJzcmMvdGVtcGxhdGUvdHJlbmRMaXN0LnRzIiwic3JjL3RlbXBsYXRlL3dpbm5pbmdMaXN0LnRzIiwic3JjL3VpL2xheWFNYXhVSS50cyIsInNyYy92aWV3L0xheWVyTWFuYWdlci50cyIsInNyYy92aWV3L1RhYmJhci50cyIsInNyYy92aWV3L1RvYXN0LnRzIiwic3JjL3ZpZXcvcm9ja2V0RGlhbG9nLnRzIiwiLi4vLi4vRG93bmxvYWRzL0xheWFBaXJJREUvcmVzb3VyY2VzL2FwcC9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNWQTs7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNwTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QyxDQUFDLENBQUE7UUFDOUIsT0FBTyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtJQUM1QixDQUFDO0lBQ0QsVUFBVTtJQUNWLE1BQU0sQ0FBQyxJQUFJLEVBQUMsSUFBSTtRQUNaLElBQUksRUFBRSxFQUFDLEVBQUUsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDO1FBQ2QsSUFBRztZQUFDLEVBQUUsR0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtTQUFDO1FBQUEsT0FBTSxDQUFDLEVBQUM7WUFBQyxFQUFFLEdBQUMsQ0FBQyxDQUFBO1NBQUM7UUFDMUQsSUFBRztZQUFDLEVBQUUsR0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtTQUFDO1FBQUEsT0FBTSxDQUFDLEVBQUM7WUFBQyxFQUFFLEdBQUMsQ0FBQyxDQUFBO1NBQUM7UUFDMUQsQ0FBQyxHQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDL0IsQ0FBQyxHQUFDLENBQUMsRUFBRSxJQUFFLEVBQUUsQ0FBQyxDQUFBLENBQUMsQ0FBQSxFQUFFLENBQUEsQ0FBQyxDQUFBLEVBQUUsQ0FBQztRQUNqQixPQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLElBQUksR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUNELFVBQVU7SUFDVixNQUFNLENBQUMsSUFBSSxFQUFDLElBQUk7UUFDWixJQUFJLEVBQUUsR0FBQyxDQUFDLEVBQUMsRUFBRSxHQUFDLENBQUMsRUFBQyxFQUFFLEVBQUMsRUFBRSxDQUFDO1FBQ3BCLElBQUc7WUFBQyxFQUFFLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7U0FBQztRQUFBLE9BQU0sQ0FBQyxFQUFDLEdBQUU7UUFBQSxDQUFDO1FBQ3ZELElBQUc7WUFBQyxFQUFFLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7U0FBQztRQUFBLE9BQU0sQ0FBQyxFQUFDLEdBQUU7UUFBQSxDQUFDO1FBQ3ZELEVBQUUsR0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxFQUFFLEdBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUMsT0FBTyxDQUFDLEVBQUUsR0FBQyxFQUFFLENBQUMsR0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBQyxFQUFFLEdBQUMsRUFBRSxDQUFDLENBQUM7SUFDdEMsQ0FBQztJQUNELFVBQVU7SUFDVixNQUFNLENBQUMsSUFBSSxFQUFDLElBQUk7UUFDWixJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUMsRUFBRSxHQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBQyxFQUFFLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQzlDLElBQUc7WUFBQyxDQUFDLElBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7U0FBQztRQUFBLE9BQU0sQ0FBQyxFQUFDLEdBQUU7UUFDekMsSUFBRztZQUFDLENBQUMsSUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FB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RUFBQyxJQUFJLEVBQUMsR0FBRyxFQUFDLFFBQVEsRUFBQyxNQUFNLEVBQUMsUUFBUSxFQUFDO1lBQ3pELEVBQUMsT0FBTyxFQUFDLElBQUksRUFBQyxRQUFRLEVBQUMsSUFBSSxFQUFDLEdBQUcsRUFBQyxRQUFRLEVBQUMsTUFBTSxFQUFDLFFBQVEsRUFBQztZQUN6RCxFQUFDLE9BQU8sRUFBQyxJQUFJLEVBQUMsUUFBUSxFQUFDLElBQUksRUFBQyxHQUFHLEVBQUMsUUFBUSxFQUFDLE1BQU0sRUFBQyxRQUFRLEVBQUM7WUFDekQsRUFBQyxPQUFPLEVBQUMsSUFBSSxFQUFDLFFBQVEsRUFBQyxJQUFJLEVBQUMsR0FBRyxFQUFDLFFBQVEsRUFBQyxNQUFNLEVBQUMsUUFBUSxFQUFDO1lBQ3pELEVBQUMsT0FBTyxFQUFDLElBQUksRUFBQyxRQUFRLEVBQUMsSUFBSSxFQUFDLEdBQUcsRUFBQyxRQUFRLEVBQUMsTUFBTSxFQUFDLFFBQVEsRUFBQztZQUN6RCxFQUFDLE9BQU8sRUFBQyxJQUFJLEVBQUMsUUFBUSxFQUFDLElBQUksRUFBQyxHQUFHLEVBQUMsUUFBUSxFQUFDLE1BQU0sRUFBQyxRQUFRLEVBQUM7WUFDekQsRUFBQyxPQUFPLEVBQUMsSUFBSSxFQUFDLFFBQVEsRUFBQyxJQUFJLEVBQUMsR0FBRyxFQUFDLFFBQVEsRUFBQyxNQUFNLEVBQUMsUUFBUSxFQUFDO1lBQ3pELEVBQUMsT0FBTyxFQUFDLElBQUksRUFBQyxRQUFRLEVBQUMsSUFBSSxFQUFDLEdBQUcsRUFBQyxRQUFRLEVBQUMsTUFBTSxFQUFDLFFBQVEsRUFBQztZQUN6RCxFQUFDLE9BQU8sRUFBQyxJQUFJLEVBQUMsUUFBUSxFQUFDLElBQUksRUFBQyxHQUFHLEVBQUMsUUFBUSxFQUFDLE1BQU0sRUFBQyxRQUFRLEVBQUM7WUFDekQsRUFBQyxPQUFPLEVBQUMsSUFBSSxFQUFDLFFBQVEsRUFBQyxJQUFJLEVBQUMsR0FBRyxFQUFDLFFBQVEsRUFBQyxNQUFNLEVBQUMsUUFBUSxFQUFDO1lBQ3pELEVBQUMsT0FBTyxFQUFDLElBQUksRUFBQyxRQUFRLEVBQUMsSUFBSSxFQUFDLEdBQUcsRUFBQyxRQUFRLEVBQUMsTUFBTSxFQUFDLFFBQVEsRUFBQztZQUN6RCxFQUFDLE9BQU8sRUFBQyxJQUFJLEVBQUMsUUFBUSxFQUFDLElBQUksRUFBQyxHQUFHLEVBQUMsUUFBUSxFQUFDLE1BQU0sRUFBQyxRQUFRLEVBQUM7WUFDekQsRUFBQyxPQUFPLEVBQUMsSUFBSSxFQUFDLFFBQVEsRUFBQyxJQUFJLEVBQUMsR0FBRyxFQUFDLFFBQVEsRUFBQyxNQUFNLEVBQUMsUUFBUSxFQUFDO1lBQ3pELEVBQUMsT0FBTyxFQUFDLElBQUksRUFBQyxRQUFRLEVBQUMsSUFBSSxFQUFDLEdBQUcsRUFBQyxRQUFRLEVBQUMsTUFBTSxFQUFDLFFBQVEsRUFBQztTQUM1RCxDQUFBO0lBQ0osQ0FBQztJQUNELE1BQU0sQ0FBQyxJQUFJO1FBQ1AscUJBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLENBQUMsa0JBQWtCLEVBQUMsSUFBSSxFQUFDLENBQUMsR0FBTyxFQUFDLEVBQUU7WUFDMUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNyQixJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDakMsQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDO0lBRUQsV0FBVztRQUNQLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUNoQixDQUFDO0NBRUo7QUE5Q0QsK0JBOENDOztBQ2pERDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IChmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgZXh0ZW5kU3RhdGljcyA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fFxyXG4gICAgICAgICh7IF9fcHJvdG9fXzogW10gfSBpbnN0YW5jZW9mIEFycmF5ICYmIGZ1bmN0aW9uIChkLCBiKSB7IGQuX19wcm90b19fID0gYjsgfSkgfHxcclxuICAgICAgICBmdW5jdGlvbiAoZCwgYikgeyBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTsgfTtcclxuICAgIHJldHVybiBmdW5jdGlvbiAoZCwgYikge1xyXG4gICAgICAgIGV4dGVuZFN0YXRpY3MoZCwgYik7XHJcbiAgICAgICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XHJcbiAgICAgICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xyXG4gICAgfTtcclxufSkoKTtcclxuKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9saWIvYXhpb3MnKTsiLCIndXNlIHN0cmljdCc7XHJcblxyXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XHJcbnZhciBzZXR0bGUgPSByZXF1aXJlKCcuLy4uL2NvcmUvc2V0dGxlJyk7XHJcbnZhciBidWlsZFVSTCA9IHJlcXVpcmUoJy4vLi4vaGVscGVycy9idWlsZFVSTCcpO1xyXG52YXIgcGFyc2VIZWFkZXJzID0gcmVxdWlyZSgnLi8uLi9oZWxwZXJzL3BhcnNlSGVhZGVycycpO1xyXG52YXIgaXNVUkxTYW1lT3JpZ2luID0gcmVxdWlyZSgnLi8uLi9oZWxwZXJzL2lzVVJMU2FtZU9yaWdpbicpO1xyXG52YXIgY3JlYXRlRXJyb3IgPSByZXF1aXJlKCcuLi9jb3JlL2NyZWF0ZUVycm9yJyk7XHJcbnZhciBidG9hID0gKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5idG9hICYmIHdpbmRvdy5idG9hLmJpbmQod2luZG93KSkgfHwgcmVxdWlyZSgnLi8uLi9oZWxwZXJzL2J0b2EnKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24geGhyQWRhcHRlcihjb25maWcpIHtcclxuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gZGlzcGF0Y2hYaHJSZXF1ZXN0KHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgdmFyIHJlcXVlc3REYXRhID0gY29uZmlnLmRhdGE7XHJcbiAgICB2YXIgcmVxdWVzdEhlYWRlcnMgPSBjb25maWcuaGVhZGVycztcclxuXHJcbiAgICBpZiAodXRpbHMuaXNGb3JtRGF0YShyZXF1ZXN0RGF0YSkpIHtcclxuICAgICAgZGVsZXRlIHJlcXVlc3RIZWFkZXJzWydDb250ZW50LVR5cGUnXTsgLy8gTGV0IHRoZSBicm93c2VyIHNldCBpdFxyXG4gICAgfVxyXG5cclxuICAgIHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcbiAgICB2YXIgbG9hZEV2ZW50ID0gJ29ucmVhZHlzdGF0ZWNoYW5nZSc7XHJcbiAgICB2YXIgeERvbWFpbiA9IGZhbHNlO1xyXG5cclxuICAgIC8vIEZvciBJRSA4LzkgQ09SUyBzdXBwb3J0XHJcbiAgICAvLyBPbmx5IHN1cHBvcnRzIFBPU1QgYW5kIEdFVCBjYWxscyBhbmQgZG9lc24ndCByZXR1cm5zIHRoZSByZXNwb25zZSBoZWFkZXJzLlxyXG4gICAgLy8gRE9OJ1QgZG8gdGhpcyBmb3IgdGVzdGluZyBiL2MgWE1MSHR0cFJlcXVlc3QgaXMgbW9ja2VkLCBub3QgWERvbWFpblJlcXVlc3QuXHJcbiAgICBpZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICd0ZXN0JyAmJlxyXG4gICAgICAgIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmXHJcbiAgICAgICAgd2luZG93LlhEb21haW5SZXF1ZXN0ICYmICEoJ3dpdGhDcmVkZW50aWFscycgaW4gcmVxdWVzdCkgJiZcclxuICAgICAgICAhaXNVUkxTYW1lT3JpZ2luKGNvbmZpZy51cmwpKSB7XHJcbiAgICAgIHJlcXVlc3QgPSBuZXcgd2luZG93LlhEb21haW5SZXF1ZXN0KCk7XHJcbiAgICAgIGxvYWRFdmVudCA9ICdvbmxvYWQnO1xyXG4gICAgICB4RG9tYWluID0gdHJ1ZTtcclxuICAgICAgcmVxdWVzdC5vbnByb2dyZXNzID0gZnVuY3Rpb24gaGFuZGxlUHJvZ3Jlc3MoKSB7fTtcclxuICAgICAgcmVxdWVzdC5vbnRpbWVvdXQgPSBmdW5jdGlvbiBoYW5kbGVUaW1lb3V0KCkge307XHJcbiAgICB9XHJcblxyXG4gICAgLy8gSFRUUCBiYXNpYyBhdXRoZW50aWNhdGlvblxyXG4gICAgaWYgKGNvbmZpZy5hdXRoKSB7XHJcbiAgICAgIHZhciB1c2VybmFtZSA9IGNvbmZpZy5hdXRoLnVzZXJuYW1lIHx8ICcnO1xyXG4gICAgICB2YXIgcGFzc3dvcmQgPSBjb25maWcuYXV0aC5wYXNzd29yZCB8fCAnJztcclxuICAgICAgcmVxdWVzdEhlYWRlcnMuQXV0aG9yaXphdGlvbiA9ICdCYXNpYyAnICsgYnRvYSh1c2VybmFtZSArICc6JyArIHBhc3N3b3JkKTtcclxuICAgIH1cclxuXHJcbiAgICByZXF1ZXN0Lm9wZW4oY29uZmlnLm1ldGhvZC50b1VwcGVyQ2FzZSgpLCBidWlsZFVSTChjb25maWcudXJsLCBjb25maWcucGFyYW1zLCBjb25maWcucGFyYW1zU2VyaWFsaXplciksIHRydWUpO1xyXG5cclxuICAgIC8vIFNldCB0aGUgcmVxdWVzdCB0aW1lb3V0IGluIE1TXHJcbiAgICByZXF1ZXN0LnRpbWVvdXQgPSBjb25maWcudGltZW91dDtcclxuXHJcbiAgICAvLyBMaXN0ZW4gZm9yIHJlYWR5IHN0YXRlXHJcbiAgICByZXF1ZXN0W2xvYWRFdmVudF0gPSBmdW5jdGlvbiBoYW5kbGVMb2FkKCkge1xyXG4gICAgICBpZiAoIXJlcXVlc3QgfHwgKHJlcXVlc3QucmVhZHlTdGF0ZSAhPT0gNCAmJiAheERvbWFpbikpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFRoZSByZXF1ZXN0IGVycm9yZWQgb3V0IGFuZCB3ZSBkaWRuJ3QgZ2V0IGEgcmVzcG9uc2UsIHRoaXMgd2lsbCBiZVxyXG4gICAgICAvLyBoYW5kbGVkIGJ5IG9uZXJyb3IgaW5zdGVhZFxyXG4gICAgICAvLyBXaXRoIG9uZSBleGNlcHRpb246IHJlcXVlc3QgdGhhdCB1c2luZyBmaWxlOiBwcm90b2NvbCwgbW9zdCBicm93c2Vyc1xyXG4gICAgICAvLyB3aWxsIHJldHVybiBzdGF0dXMgYXMgMCBldmVuIHRob3VnaCBpdCdzIGEgc3VjY2Vzc2Z1bCByZXF1ZXN0XHJcbiAgICAgIGlmIChyZXF1ZXN0LnN0YXR1cyA9PT0gMCAmJiAhKHJlcXVlc3QucmVzcG9uc2VVUkwgJiYgcmVxdWVzdC5yZXNwb25zZVVSTC5pbmRleE9mKCdmaWxlOicpID09PSAwKSkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gUHJlcGFyZSB0aGUgcmVzcG9uc2VcclxuICAgICAgdmFyIHJlc3BvbnNlSGVhZGVycyA9ICdnZXRBbGxSZXNwb25zZUhlYWRlcnMnIGluIHJlcXVlc3QgPyBwYXJzZUhlYWRlcnMocmVxdWVzdC5nZXRBbGxSZXNwb25zZUhlYWRlcnMoKSkgOiBudWxsO1xyXG4gICAgICB2YXIgcmVzcG9uc2VEYXRhID0gIWNvbmZpZy5yZXNwb25zZVR5cGUgfHwgY29uZmlnLnJlc3BvbnNlVHlwZSA9PT0gJ3RleHQnID8gcmVxdWVzdC5yZXNwb25zZVRleHQgOiByZXF1ZXN0LnJlc3BvbnNlO1xyXG4gICAgICB2YXIgcmVzcG9uc2UgPSB7XHJcbiAgICAgICAgZGF0YTogcmVzcG9uc2VEYXRhLFxyXG4gICAgICAgIC8vIElFIHNlbmRzIDEyMjMgaW5zdGVhZCBvZiAyMDQgKGh0dHBzOi8vZ2l0aHViLmNvbS9heGlvcy9heGlvcy9pc3N1ZXMvMjAxKVxyXG4gICAgICAgIHN0YXR1czogcmVxdWVzdC5zdGF0dXMgPT09IDEyMjMgPyAyMDQgOiByZXF1ZXN0LnN0YXR1cyxcclxuICAgICAgICBzdGF0dXNUZXh0OiByZXF1ZXN0LnN0YXR1cyA9PT0gMTIyMyA/ICdObyBDb250ZW50JyA6IHJlcXVlc3Quc3RhdHVzVGV4dCxcclxuICAgICAgICBoZWFkZXJzOiByZXNwb25zZUhlYWRlcnMsXHJcbiAgICAgICAgY29uZmlnOiBjb25maWcsXHJcbiAgICAgICAgcmVxdWVzdDogcmVxdWVzdFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgcmVzcG9uc2UpO1xyXG5cclxuICAgICAgLy8gQ2xlYW4gdXAgcmVxdWVzdFxyXG4gICAgICByZXF1ZXN0ID0gbnVsbDtcclxuICAgIH07XHJcblxyXG4gICAgLy8gSGFuZGxlIGxvdyBsZXZlbCBuZXR3b3JrIGVycm9yc1xyXG4gICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24gaGFuZGxlRXJyb3IoKSB7XHJcbiAgICAgIC8vIFJlYWwgZXJyb3JzIGFyZSBoaWRkZW4gZnJvbSB1cyBieSB0aGUgYnJvd3NlclxyXG4gICAgICAvLyBvbmVycm9yIHNob3VsZCBvbmx5IGZpcmUgaWYgaXQncyBhIG5ldHdvcmsgZXJyb3JcclxuICAgICAgcmVqZWN0KGNyZWF0ZUVycm9yKCdOZXR3b3JrIEVycm9yJywgY29uZmlnLCBudWxsLCByZXF1ZXN0KSk7XHJcblxyXG4gICAgICAvLyBDbGVhbiB1cCByZXF1ZXN0XHJcbiAgICAgIHJlcXVlc3QgPSBudWxsO1xyXG4gICAgfTtcclxuXHJcbiAgICAvLyBIYW5kbGUgdGltZW91dFxyXG4gICAgcmVxdWVzdC5vbnRpbWVvdXQgPSBmdW5jdGlvbiBoYW5kbGVUaW1lb3V0KCkge1xyXG4gICAgICByZWplY3QoY3JlYXRlRXJyb3IoJ3RpbWVvdXQgb2YgJyArIGNvbmZpZy50aW1lb3V0ICsgJ21zIGV4Y2VlZGVkJywgY29uZmlnLCAnRUNPTk5BQk9SVEVEJyxcclxuICAgICAgICByZXF1ZXN0KSk7XHJcblxyXG4gICAgICAvLyBDbGVhbiB1cCByZXF1ZXN0XHJcbiAgICAgIHJlcXVlc3QgPSBudWxsO1xyXG4gICAgfTtcclxuXHJcbiAgICAvLyBBZGQgeHNyZiBoZWFkZXJcclxuICAgIC8vIFRoaXMgaXMgb25seSBkb25lIGlmIHJ1bm5pbmcgaW4gYSBzdGFuZGFyZCBicm93c2VyIGVudmlyb25tZW50LlxyXG4gICAgLy8gU3BlY2lmaWNhbGx5IG5vdCBpZiB3ZSdyZSBpbiBhIHdlYiB3b3JrZXIsIG9yIHJlYWN0LW5hdGl2ZS5cclxuICAgIGlmICh1dGlscy5pc1N0YW5kYXJkQnJvd3NlckVudigpKSB7XHJcbiAgICAgIHZhciBjb29raWVzID0gcmVxdWlyZSgnLi8uLi9oZWxwZXJzL2Nvb2tpZXMnKTtcclxuXHJcbiAgICAgIC8vIEFkZCB4c3JmIGhlYWRlclxyXG4gICAgICB2YXIgeHNyZlZhbHVlID0gKGNvbmZpZy53aXRoQ3JlZGVudGlhbHMgfHwgaXNVUkxTYW1lT3JpZ2luKGNvbmZpZy51cmwpKSAmJiBjb25maWcueHNyZkNvb2tpZU5hbWUgP1xyXG4gICAgICAgICAgY29va2llcy5yZWFkKGNvbmZpZy54c3JmQ29va2llTmFtZSkgOlxyXG4gICAgICAgICAgdW5kZWZpbmVkO1xyXG5cclxuICAgICAgaWYgKHhzcmZWYWx1ZSkge1xyXG4gICAgICAgIHJlcXVlc3RIZWFkZXJzW2NvbmZpZy54c3JmSGVhZGVyTmFtZV0gPSB4c3JmVmFsdWU7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBBZGQgaGVhZGVycyB0byB0aGUgcmVxdWVzdFxyXG4gICAgaWYgKCdzZXRSZXF1ZXN0SGVhZGVyJyBpbiByZXF1ZXN0KSB7XHJcbiAgICAgIHV0aWxzLmZvckVhY2gocmVxdWVzdEhlYWRlcnMsIGZ1bmN0aW9uIHNldFJlcXVlc3RIZWFkZXIodmFsLCBrZXkpIHtcclxuICAgICAgICBpZiAodHlwZW9mIHJlcXVlc3REYXRhID09PSAndW5kZWZpbmVkJyAmJiBrZXkudG9Mb3dlckNhc2UoKSA9PT0gJ2NvbnRlbnQtdHlwZScpIHtcclxuICAgICAgICAgIC8vIFJlbW92ZSBDb250ZW50LVR5cGUgaWYgZGF0YSBpcyB1bmRlZmluZWRcclxuICAgICAgICAgIGRlbGV0ZSByZXF1ZXN0SGVhZGVyc1trZXldO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAvLyBPdGhlcndpc2UgYWRkIGhlYWRlciB0byB0aGUgcmVxdWVzdFxyXG4gICAgICAgICAgcmVxdWVzdC5zZXRSZXF1ZXN0SGVhZGVyKGtleSwgdmFsKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEFkZCB3aXRoQ3JlZGVudGlhbHMgdG8gcmVxdWVzdCBpZiBuZWVkZWRcclxuICAgIGlmIChjb25maWcud2l0aENyZWRlbnRpYWxzKSB7XHJcbiAgICAgIHJlcXVlc3Qud2l0aENyZWRlbnRpYWxzID0gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBBZGQgcmVzcG9uc2VUeXBlIHRvIHJlcXVlc3QgaWYgbmVlZGVkXHJcbiAgICBpZiAoY29uZmlnLnJlc3BvbnNlVHlwZSkge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIHJlcXVlc3QucmVzcG9uc2VUeXBlID0gY29uZmlnLnJlc3BvbnNlVHlwZTtcclxuICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIC8vIEV4cGVjdGVkIERPTUV4Y2VwdGlvbiB0aHJvd24gYnkgYnJvd3NlcnMgbm90IGNvbXBhdGlibGUgWE1MSHR0cFJlcXVlc3QgTGV2ZWwgMi5cclxuICAgICAgICAvLyBCdXQsIHRoaXMgY2FuIGJlIHN1cHByZXNzZWQgZm9yICdqc29uJyB0eXBlIGFzIGl0IGNhbiBiZSBwYXJzZWQgYnkgZGVmYXVsdCAndHJhbnNmb3JtUmVzcG9uc2UnIGZ1bmN0aW9uLlxyXG4gICAgICAgIGlmIChjb25maWcucmVzcG9uc2VUeXBlICE9PSAnanNvbicpIHtcclxuICAgICAgICAgIHRocm93IGU7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gSGFuZGxlIHByb2dyZXNzIGlmIG5lZWRlZFxyXG4gICAgaWYgKHR5cGVvZiBjb25maWcub25Eb3dubG9hZFByb2dyZXNzID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgIHJlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lcigncHJvZ3Jlc3MnLCBjb25maWcub25Eb3dubG9hZFByb2dyZXNzKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBOb3QgYWxsIGJyb3dzZXJzIHN1cHBvcnQgdXBsb2FkIGV2ZW50c1xyXG4gICAgaWYgKHR5cGVvZiBjb25maWcub25VcGxvYWRQcm9ncmVzcyA9PT0gJ2Z1bmN0aW9uJyAmJiByZXF1ZXN0LnVwbG9hZCkge1xyXG4gICAgICByZXF1ZXN0LnVwbG9hZC5hZGRFdmVudExpc3RlbmVyKCdwcm9ncmVzcycsIGNvbmZpZy5vblVwbG9hZFByb2dyZXNzKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoY29uZmlnLmNhbmNlbFRva2VuKSB7XHJcbiAgICAgIC8vIEhhbmRsZSBjYW5jZWxsYXRpb25cclxuICAgICAgY29uZmlnLmNhbmNlbFRva2VuLnByb21pc2UudGhlbihmdW5jdGlvbiBvbkNhbmNlbGVkKGNhbmNlbCkge1xyXG4gICAgICAgIGlmICghcmVxdWVzdCkge1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmVxdWVzdC5hYm9ydCgpO1xyXG4gICAgICAgIHJlamVjdChjYW5jZWwpO1xyXG4gICAgICAgIC8vIENsZWFuIHVwIHJlcXVlc3RcclxuICAgICAgICByZXF1ZXN0ID0gbnVsbDtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHJlcXVlc3REYXRhID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgcmVxdWVzdERhdGEgPSBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFNlbmQgdGhlIHJlcXVlc3RcclxuICAgIHJlcXVlc3Quc2VuZChyZXF1ZXN0RGF0YSk7XHJcbiAgfSk7XHJcbn07XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcclxudmFyIGJpbmQgPSByZXF1aXJlKCcuL2hlbHBlcnMvYmluZCcpO1xyXG52YXIgQXhpb3MgPSByZXF1aXJlKCcuL2NvcmUvQXhpb3MnKTtcclxudmFyIGRlZmF1bHRzID0gcmVxdWlyZSgnLi9kZWZhdWx0cycpO1xyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSBhbiBpbnN0YW5jZSBvZiBBeGlvc1xyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gZGVmYXVsdENvbmZpZyBUaGUgZGVmYXVsdCBjb25maWcgZm9yIHRoZSBpbnN0YW5jZVxyXG4gKiBAcmV0dXJuIHtBeGlvc30gQSBuZXcgaW5zdGFuY2Ugb2YgQXhpb3NcclxuICovXHJcbmZ1bmN0aW9uIGNyZWF0ZUluc3RhbmNlKGRlZmF1bHRDb25maWcpIHtcclxuICB2YXIgY29udGV4dCA9IG5ldyBBeGlvcyhkZWZhdWx0Q29uZmlnKTtcclxuICB2YXIgaW5zdGFuY2UgPSBiaW5kKEF4aW9zLnByb3RvdHlwZS5yZXF1ZXN0LCBjb250ZXh0KTtcclxuXHJcbiAgLy8gQ29weSBheGlvcy5wcm90b3R5cGUgdG8gaW5zdGFuY2VcclxuICB1dGlscy5leHRlbmQoaW5zdGFuY2UsIEF4aW9zLnByb3RvdHlwZSwgY29udGV4dCk7XHJcblxyXG4gIC8vIENvcHkgY29udGV4dCB0byBpbnN0YW5jZVxyXG4gIHV0aWxzLmV4dGVuZChpbnN0YW5jZSwgY29udGV4dCk7XHJcblxyXG4gIHJldHVybiBpbnN0YW5jZTtcclxufVxyXG5cclxuLy8gQ3JlYXRlIHRoZSBkZWZhdWx0IGluc3RhbmNlIHRvIGJlIGV4cG9ydGVkXHJcbnZhciBheGlvcyA9IGNyZWF0ZUluc3RhbmNlKGRlZmF1bHRzKTtcclxuXHJcbi8vIEV4cG9zZSBBeGlvcyBjbGFzcyB0byBhbGxvdyBjbGFzcyBpbmhlcml0YW5jZVxyXG5heGlvcy5BeGlvcyA9IEF4aW9zO1xyXG5cclxuLy8gRmFjdG9yeSBmb3IgY3JlYXRpbmcgbmV3IGluc3RhbmNlc1xyXG5heGlvcy5jcmVhdGUgPSBmdW5jdGlvbiBjcmVhdGUoaW5zdGFuY2VDb25maWcpIHtcclxuICByZXR1cm4gY3JlYXRlSW5zdGFuY2UodXRpbHMubWVyZ2UoZGVmYXVsdHMsIGluc3RhbmNlQ29uZmlnKSk7XHJcbn07XHJcblxyXG4vLyBFeHBvc2UgQ2FuY2VsICYgQ2FuY2VsVG9rZW5cclxuYXhpb3MuQ2FuY2VsID0gcmVxdWlyZSgnLi9jYW5jZWwvQ2FuY2VsJyk7XHJcbmF4aW9zLkNhbmNlbFRva2VuID0gcmVxdWlyZSgnLi9jYW5jZWwvQ2FuY2VsVG9rZW4nKTtcclxuYXhpb3MuaXNDYW5jZWwgPSByZXF1aXJlKCcuL2NhbmNlbC9pc0NhbmNlbCcpO1xyXG5cclxuLy8gRXhwb3NlIGFsbC9zcHJlYWRcclxuYXhpb3MuYWxsID0gZnVuY3Rpb24gYWxsKHByb21pc2VzKSB7XHJcbiAgcmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKTtcclxufTtcclxuYXhpb3Muc3ByZWFkID0gcmVxdWlyZSgnLi9oZWxwZXJzL3NwcmVhZCcpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBheGlvcztcclxuXHJcbi8vIEFsbG93IHVzZSBvZiBkZWZhdWx0IGltcG9ydCBzeW50YXggaW4gVHlwZVNjcmlwdFxyXG5tb2R1bGUuZXhwb3J0cy5kZWZhdWx0ID0gYXhpb3M7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbi8qKlxyXG4gKiBBIGBDYW5jZWxgIGlzIGFuIG9iamVjdCB0aGF0IGlzIHRocm93biB3aGVuIGFuIG9wZXJhdGlvbiBpcyBjYW5jZWxlZC5cclxuICpcclxuICogQGNsYXNzXHJcbiAqIEBwYXJhbSB7c3RyaW5nPX0gbWVzc2FnZSBUaGUgbWVzc2FnZS5cclxuICovXHJcbmZ1bmN0aW9uIENhbmNlbChtZXNzYWdlKSB7XHJcbiAgdGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcclxufVxyXG5cclxuQ2FuY2VsLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nKCkge1xyXG4gIHJldHVybiAnQ2FuY2VsJyArICh0aGlzLm1lc3NhZ2UgPyAnOiAnICsgdGhpcy5tZXNzYWdlIDogJycpO1xyXG59O1xyXG5cclxuQ2FuY2VsLnByb3RvdHlwZS5fX0NBTkNFTF9fID0gdHJ1ZTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ2FuY2VsO1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG52YXIgQ2FuY2VsID0gcmVxdWlyZSgnLi9DYW5jZWwnKTtcclxuXHJcbi8qKlxyXG4gKiBBIGBDYW5jZWxUb2tlbmAgaXMgYW4gb2JqZWN0IHRoYXQgY2FuIGJlIHVzZWQgdG8gcmVxdWVzdCBjYW5jZWxsYXRpb24gb2YgYW4gb3BlcmF0aW9uLlxyXG4gKlxyXG4gKiBAY2xhc3NcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gZXhlY3V0b3IgVGhlIGV4ZWN1dG9yIGZ1bmN0aW9uLlxyXG4gKi9cclxuZnVuY3Rpb24gQ2FuY2VsVG9rZW4oZXhlY3V0b3IpIHtcclxuICBpZiAodHlwZW9mIGV4ZWN1dG9yICE9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdleGVjdXRvciBtdXN0IGJlIGEgZnVuY3Rpb24uJyk7XHJcbiAgfVxyXG5cclxuICB2YXIgcmVzb2x2ZVByb21pc2U7XHJcbiAgdGhpcy5wcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24gcHJvbWlzZUV4ZWN1dG9yKHJlc29sdmUpIHtcclxuICAgIHJlc29sdmVQcm9taXNlID0gcmVzb2x2ZTtcclxuICB9KTtcclxuXHJcbiAgdmFyIHRva2VuID0gdGhpcztcclxuICBleGVjdXRvcihmdW5jdGlvbiBjYW5jZWwobWVzc2FnZSkge1xyXG4gICAgaWYgKHRva2VuLnJlYXNvbikge1xyXG4gICAgICAvLyBDYW5jZWxsYXRpb24gaGFzIGFscmVhZHkgYmVlbiByZXF1ZXN0ZWRcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHRva2VuLnJlYXNvbiA9IG5ldyBDYW5jZWwobWVzc2FnZSk7XHJcbiAgICByZXNvbHZlUHJvbWlzZSh0b2tlbi5yZWFzb24pO1xyXG4gIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogVGhyb3dzIGEgYENhbmNlbGAgaWYgY2FuY2VsbGF0aW9uIGhhcyBiZWVuIHJlcXVlc3RlZC5cclxuICovXHJcbkNhbmNlbFRva2VuLnByb3RvdHlwZS50aHJvd0lmUmVxdWVzdGVkID0gZnVuY3Rpb24gdGhyb3dJZlJlcXVlc3RlZCgpIHtcclxuICBpZiAodGhpcy5yZWFzb24pIHtcclxuICAgIHRocm93IHRoaXMucmVhc29uO1xyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZXR1cm5zIGFuIG9iamVjdCB0aGF0IGNvbnRhaW5zIGEgbmV3IGBDYW5jZWxUb2tlbmAgYW5kIGEgZnVuY3Rpb24gdGhhdCwgd2hlbiBjYWxsZWQsXHJcbiAqIGNhbmNlbHMgdGhlIGBDYW5jZWxUb2tlbmAuXHJcbiAqL1xyXG5DYW5jZWxUb2tlbi5zb3VyY2UgPSBmdW5jdGlvbiBzb3VyY2UoKSB7XHJcbiAgdmFyIGNhbmNlbDtcclxuICB2YXIgdG9rZW4gPSBuZXcgQ2FuY2VsVG9rZW4oZnVuY3Rpb24gZXhlY3V0b3IoYykge1xyXG4gICAgY2FuY2VsID0gYztcclxuICB9KTtcclxuICByZXR1cm4ge1xyXG4gICAgdG9rZW46IHRva2VuLFxyXG4gICAgY2FuY2VsOiBjYW5jZWxcclxuICB9O1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDYW5jZWxUb2tlbjtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0NhbmNlbCh2YWx1ZSkge1xyXG4gIHJldHVybiAhISh2YWx1ZSAmJiB2YWx1ZS5fX0NBTkNFTF9fKTtcclxufTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIGRlZmF1bHRzID0gcmVxdWlyZSgnLi8uLi9kZWZhdWx0cycpO1xyXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XHJcbnZhciBJbnRlcmNlcHRvck1hbmFnZXIgPSByZXF1aXJlKCcuL0ludGVyY2VwdG9yTWFuYWdlcicpO1xyXG52YXIgZGlzcGF0Y2hSZXF1ZXN0ID0gcmVxdWlyZSgnLi9kaXNwYXRjaFJlcXVlc3QnKTtcclxuXHJcbi8qKlxyXG4gKiBDcmVhdGUgYSBuZXcgaW5zdGFuY2Ugb2YgQXhpb3NcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IGluc3RhbmNlQ29uZmlnIFRoZSBkZWZhdWx0IGNvbmZpZyBmb3IgdGhlIGluc3RhbmNlXHJcbiAqL1xyXG5mdW5jdGlvbiBBeGlvcyhpbnN0YW5jZUNvbmZpZykge1xyXG4gIHRoaXMuZGVmYXVsdHMgPSBpbnN0YW5jZUNvbmZpZztcclxuICB0aGlzLmludGVyY2VwdG9ycyA9IHtcclxuICAgIHJlcXVlc3Q6IG5ldyBJbnRlcmNlcHRvck1hbmFnZXIoKSxcclxuICAgIHJlc3BvbnNlOiBuZXcgSW50ZXJjZXB0b3JNYW5hZ2VyKClcclxuICB9O1xyXG59XHJcblxyXG4vKipcclxuICogRGlzcGF0Y2ggYSByZXF1ZXN0XHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcgVGhlIGNvbmZpZyBzcGVjaWZpYyBmb3IgdGhpcyByZXF1ZXN0IChtZXJnZWQgd2l0aCB0aGlzLmRlZmF1bHRzKVxyXG4gKi9cclxuQXhpb3MucHJvdG90eXBlLnJlcXVlc3QgPSBmdW5jdGlvbiByZXF1ZXN0KGNvbmZpZykge1xyXG4gIC8qZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOjAqL1xyXG4gIC8vIEFsbG93IGZvciBheGlvcygnZXhhbXBsZS91cmwnWywgY29uZmlnXSkgYSBsYSBmZXRjaCBBUElcclxuICBpZiAodHlwZW9mIGNvbmZpZyA9PT0gJ3N0cmluZycpIHtcclxuICAgIGNvbmZpZyA9IHV0aWxzLm1lcmdlKHtcclxuICAgICAgdXJsOiBhcmd1bWVudHNbMF1cclxuICAgIH0sIGFyZ3VtZW50c1sxXSk7XHJcbiAgfVxyXG5cclxuICBjb25maWcgPSB1dGlscy5tZXJnZShkZWZhdWx0cywge21ldGhvZDogJ2dldCd9LCB0aGlzLmRlZmF1bHRzLCBjb25maWcpO1xyXG4gIGNvbmZpZy5tZXRob2QgPSBjb25maWcubWV0aG9kLnRvTG93ZXJDYXNlKCk7XHJcblxyXG4gIC8vIEhvb2sgdXAgaW50ZXJjZXB0b3JzIG1pZGRsZXdhcmVcclxuICB2YXIgY2hhaW4gPSBbZGlzcGF0Y2hSZXF1ZXN0LCB1bmRlZmluZWRdO1xyXG4gIHZhciBwcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKGNvbmZpZyk7XHJcblxyXG4gIHRoaXMuaW50ZXJjZXB0b3JzLnJlcXVlc3QuZm9yRWFjaChmdW5jdGlvbiB1bnNoaWZ0UmVxdWVzdEludGVyY2VwdG9ycyhpbnRlcmNlcHRvcikge1xyXG4gICAgY2hhaW4udW5zaGlmdChpbnRlcmNlcHRvci5mdWxmaWxsZWQsIGludGVyY2VwdG9yLnJlamVjdGVkKTtcclxuICB9KTtcclxuXHJcbiAgdGhpcy5pbnRlcmNlcHRvcnMucmVzcG9uc2UuZm9yRWFjaChmdW5jdGlvbiBwdXNoUmVzcG9uc2VJbnRlcmNlcHRvcnMoaW50ZXJjZXB0b3IpIHtcclxuICAgIGNoYWluLnB1c2goaW50ZXJjZXB0b3IuZnVsZmlsbGVkLCBpbnRlcmNlcHRvci5yZWplY3RlZCk7XHJcbiAgfSk7XHJcblxyXG4gIHdoaWxlIChjaGFpbi5sZW5ndGgpIHtcclxuICAgIHByb21pc2UgPSBwcm9taXNlLnRoZW4oY2hhaW4uc2hpZnQoKSwgY2hhaW4uc2hpZnQoKSk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gcHJvbWlzZTtcclxufTtcclxuXHJcbi8vIFByb3ZpZGUgYWxpYXNlcyBmb3Igc3VwcG9ydGVkIHJlcXVlc3QgbWV0aG9kc1xyXG51dGlscy5mb3JFYWNoKFsnZGVsZXRlJywgJ2dldCcsICdoZWFkJywgJ29wdGlvbnMnXSwgZnVuY3Rpb24gZm9yRWFjaE1ldGhvZE5vRGF0YShtZXRob2QpIHtcclxuICAvKmVzbGludCBmdW5jLW5hbWVzOjAqL1xyXG4gIEF4aW9zLnByb3RvdHlwZVttZXRob2RdID0gZnVuY3Rpb24odXJsLCBjb25maWcpIHtcclxuICAgIHJldHVybiB0aGlzLnJlcXVlc3QodXRpbHMubWVyZ2UoY29uZmlnIHx8IHt9LCB7XHJcbiAgICAgIG1ldGhvZDogbWV0aG9kLFxyXG4gICAgICB1cmw6IHVybFxyXG4gICAgfSkpO1xyXG4gIH07XHJcbn0pO1xyXG5cclxudXRpbHMuZm9yRWFjaChbJ3Bvc3QnLCAncHV0JywgJ3BhdGNoJ10sIGZ1bmN0aW9uIGZvckVhY2hNZXRob2RXaXRoRGF0YShtZXRob2QpIHtcclxuICAvKmVzbGludCBmdW5jLW5hbWVzOjAqL1xyXG4gIEF4aW9zLnByb3RvdHlwZVttZXRob2RdID0gZnVuY3Rpb24odXJsLCBkYXRhLCBjb25maWcpIHtcclxuICAgIHJldHVybiB0aGlzLnJlcXVlc3QodXRpbHMubWVyZ2UoY29uZmlnIHx8IHt9LCB7XHJcbiAgICAgIG1ldGhvZDogbWV0aG9kLFxyXG4gICAgICB1cmw6IHVybCxcclxuICAgICAgZGF0YTogZGF0YVxyXG4gICAgfSkpO1xyXG4gIH07XHJcbn0pO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBBeGlvcztcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xyXG5cclxuZnVuY3Rpb24gSW50ZXJjZXB0b3JNYW5hZ2VyKCkge1xyXG4gIHRoaXMuaGFuZGxlcnMgPSBbXTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEFkZCBhIG5ldyBpbnRlcmNlcHRvciB0byB0aGUgc3RhY2tcclxuICpcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVsZmlsbGVkIFRoZSBmdW5jdGlvbiB0byBoYW5kbGUgYHRoZW5gIGZvciBhIGBQcm9taXNlYFxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSByZWplY3RlZCBUaGUgZnVuY3Rpb24gdG8gaGFuZGxlIGByZWplY3RgIGZvciBhIGBQcm9taXNlYFxyXG4gKlxyXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IEFuIElEIHVzZWQgdG8gcmVtb3ZlIGludGVyY2VwdG9yIGxhdGVyXHJcbiAqL1xyXG5JbnRlcmNlcHRvck1hbmFnZXIucHJvdG90eXBlLnVzZSA9IGZ1bmN0aW9uIHVzZShmdWxmaWxsZWQsIHJlamVjdGVkKSB7XHJcbiAgdGhpcy5oYW5kbGVycy5wdXNoKHtcclxuICAgIGZ1bGZpbGxlZDogZnVsZmlsbGVkLFxyXG4gICAgcmVqZWN0ZWQ6IHJlamVjdGVkXHJcbiAgfSk7XHJcbiAgcmV0dXJuIHRoaXMuaGFuZGxlcnMubGVuZ3RoIC0gMTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZW1vdmUgYW4gaW50ZXJjZXB0b3IgZnJvbSB0aGUgc3RhY2tcclxuICpcclxuICogQHBhcmFtIHtOdW1iZXJ9IGlkIFRoZSBJRCB0aGF0IHdhcyByZXR1cm5lZCBieSBgdXNlYFxyXG4gKi9cclxuSW50ZXJjZXB0b3JNYW5hZ2VyLnByb3RvdHlwZS5lamVjdCA9IGZ1bmN0aW9uIGVqZWN0KGlkKSB7XHJcbiAgaWYgKHRoaXMuaGFuZGxlcnNbaWRdKSB7XHJcbiAgICB0aGlzLmhhbmRsZXJzW2lkXSA9IG51bGw7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEl0ZXJhdGUgb3ZlciBhbGwgdGhlIHJlZ2lzdGVyZWQgaW50ZXJjZXB0b3JzXHJcbiAqXHJcbiAqIFRoaXMgbWV0aG9kIGlzIHBhcnRpY3VsYXJseSB1c2VmdWwgZm9yIHNraXBwaW5nIG92ZXIgYW55XHJcbiAqIGludGVyY2VwdG9ycyB0aGF0IG1heSBoYXZlIGJlY29tZSBgbnVsbGAgY2FsbGluZyBgZWplY3RgLlxyXG4gKlxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBUaGUgZnVuY3Rpb24gdG8gY2FsbCBmb3IgZWFjaCBpbnRlcmNlcHRvclxyXG4gKi9cclxuSW50ZXJjZXB0b3JNYW5hZ2VyLnByb3RvdHlwZS5mb3JFYWNoID0gZnVuY3Rpb24gZm9yRWFjaChmbikge1xyXG4gIHV0aWxzLmZvckVhY2godGhpcy5oYW5kbGVycywgZnVuY3Rpb24gZm9yRWFjaEhhbmRsZXIoaCkge1xyXG4gICAgaWYgKGggIT09IG51bGwpIHtcclxuICAgICAgZm4oaCk7XHJcbiAgICB9XHJcbiAgfSk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEludGVyY2VwdG9yTWFuYWdlcjtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIGVuaGFuY2VFcnJvciA9IHJlcXVpcmUoJy4vZW5oYW5jZUVycm9yJyk7XHJcblxyXG4vKipcclxuICogQ3JlYXRlIGFuIEVycm9yIHdpdGggdGhlIHNwZWNpZmllZCBtZXNzYWdlLCBjb25maWcsIGVycm9yIGNvZGUsIHJlcXVlc3QgYW5kIHJlc3BvbnNlLlxyXG4gKlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSBUaGUgZXJyb3IgbWVzc2FnZS5cclxuICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyBUaGUgY29uZmlnLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gW2NvZGVdIFRoZSBlcnJvciBjb2RlIChmb3IgZXhhbXBsZSwgJ0VDT05OQUJPUlRFRCcpLlxyXG4gKiBAcGFyYW0ge09iamVjdH0gW3JlcXVlc3RdIFRoZSByZXF1ZXN0LlxyXG4gKiBAcGFyYW0ge09iamVjdH0gW3Jlc3BvbnNlXSBUaGUgcmVzcG9uc2UuXHJcbiAqIEByZXR1cm5zIHtFcnJvcn0gVGhlIGNyZWF0ZWQgZXJyb3IuXHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGNyZWF0ZUVycm9yKG1lc3NhZ2UsIGNvbmZpZywgY29kZSwgcmVxdWVzdCwgcmVzcG9uc2UpIHtcclxuICB2YXIgZXJyb3IgPSBuZXcgRXJyb3IobWVzc2FnZSk7XHJcbiAgcmV0dXJuIGVuaGFuY2VFcnJvcihlcnJvciwgY29uZmlnLCBjb2RlLCByZXF1ZXN0LCByZXNwb25zZSk7XHJcbn07XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcclxudmFyIHRyYW5zZm9ybURhdGEgPSByZXF1aXJlKCcuL3RyYW5zZm9ybURhdGEnKTtcclxudmFyIGlzQ2FuY2VsID0gcmVxdWlyZSgnLi4vY2FuY2VsL2lzQ2FuY2VsJyk7XHJcbnZhciBkZWZhdWx0cyA9IHJlcXVpcmUoJy4uL2RlZmF1bHRzJyk7XHJcbnZhciBpc0Fic29sdXRlVVJMID0gcmVxdWlyZSgnLi8uLi9oZWxwZXJzL2lzQWJzb2x1dGVVUkwnKTtcclxudmFyIGNvbWJpbmVVUkxzID0gcmVxdWlyZSgnLi8uLi9oZWxwZXJzL2NvbWJpbmVVUkxzJyk7XHJcblxyXG4vKipcclxuICogVGhyb3dzIGEgYENhbmNlbGAgaWYgY2FuY2VsbGF0aW9uIGhhcyBiZWVuIHJlcXVlc3RlZC5cclxuICovXHJcbmZ1bmN0aW9uIHRocm93SWZDYW5jZWxsYXRpb25SZXF1ZXN0ZWQoY29uZmlnKSB7XHJcbiAgaWYgKGNvbmZpZy5jYW5jZWxUb2tlbikge1xyXG4gICAgY29uZmlnLmNhbmNlbFRva2VuLnRocm93SWZSZXF1ZXN0ZWQoKTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEaXNwYXRjaCBhIHJlcXVlc3QgdG8gdGhlIHNlcnZlciB1c2luZyB0aGUgY29uZmlndXJlZCBhZGFwdGVyLlxyXG4gKlxyXG4gKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIFRoZSBjb25maWcgdGhhdCBpcyB0byBiZSB1c2VkIGZvciB0aGUgcmVxdWVzdFxyXG4gKiBAcmV0dXJucyB7UHJvbWlzZX0gVGhlIFByb21pc2UgdG8gYmUgZnVsZmlsbGVkXHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGRpc3BhdGNoUmVxdWVzdChjb25maWcpIHtcclxuICB0aHJvd0lmQ2FuY2VsbGF0aW9uUmVxdWVzdGVkKGNvbmZpZyk7XHJcblxyXG4gIC8vIFN1cHBvcnQgYmFzZVVSTCBjb25maWdcclxuICBpZiAoY29uZmlnLmJhc2VVUkwgJiYgIWlzQWJzb2x1dGVVUkwoY29uZmlnLnVybCkpIHtcclxuICAgIGNvbmZpZy51cmwgPSBjb21iaW5lVVJMcyhjb25maWcuYmFzZVVSTCwgY29uZmlnLnVybCk7XHJcbiAgfVxyXG5cclxuICAvLyBFbnN1cmUgaGVhZGVycyBleGlzdFxyXG4gIGNvbmZpZy5oZWFkZXJzID0gY29uZmlnLmhlYWRlcnMgfHwge307XHJcblxyXG4gIC8vIFRyYW5zZm9ybSByZXF1ZXN0IGRhdGFcclxuICBjb25maWcuZGF0YSA9IHRyYW5zZm9ybURhdGEoXHJcbiAgICBjb25maWcuZGF0YSxcclxuICAgIGNvbmZpZy5oZWFkZXJzLFxyXG4gICAgY29uZmlnLnRyYW5zZm9ybVJlcXVlc3RcclxuICApO1xyXG5cclxuICAvLyBGbGF0dGVuIGhlYWRlcnNcclxuICBjb25maWcuaGVhZGVycyA9IHV0aWxzLm1lcmdlKFxyXG4gICAgY29uZmlnLmhlYWRlcnMuY29tbW9uIHx8IHt9LFxyXG4gICAgY29uZmlnLmhlYWRlcnNbY29uZmlnLm1ldGhvZF0gfHwge30sXHJcbiAgICBjb25maWcuaGVhZGVycyB8fCB7fVxyXG4gICk7XHJcblxyXG4gIHV0aWxzLmZvckVhY2goXHJcbiAgICBbJ2RlbGV0ZScsICdnZXQnLCAnaGVhZCcsICdwb3N0JywgJ3B1dCcsICdwYXRjaCcsICdjb21tb24nXSxcclxuICAgIGZ1bmN0aW9uIGNsZWFuSGVhZGVyQ29uZmlnKG1ldGhvZCkge1xyXG4gICAgICBkZWxldGUgY29uZmlnLmhlYWRlcnNbbWV0aG9kXTtcclxuICAgIH1cclxuICApO1xyXG5cclxuICB2YXIgYWRhcHRlciA9IGNvbmZpZy5hZGFwdGVyIHx8IGRlZmF1bHRzLmFkYXB0ZXI7XHJcblxyXG4gIHJldHVybiBhZGFwdGVyKGNvbmZpZykudGhlbihmdW5jdGlvbiBvbkFkYXB0ZXJSZXNvbHV0aW9uKHJlc3BvbnNlKSB7XHJcbiAgICB0aHJvd0lmQ2FuY2VsbGF0aW9uUmVxdWVzdGVkKGNvbmZpZyk7XHJcblxyXG4gICAgLy8gVHJhbnNmb3JtIHJlc3BvbnNlIGRhdGFcclxuICAgIHJlc3BvbnNlLmRhdGEgPSB0cmFuc2Zvcm1EYXRhKFxyXG4gICAgICByZXNwb25zZS5kYXRhLFxyXG4gICAgICByZXNwb25zZS5oZWFkZXJzLFxyXG4gICAgICBjb25maWcudHJhbnNmb3JtUmVzcG9uc2VcclxuICAgICk7XHJcblxyXG4gICAgcmV0dXJuIHJlc3BvbnNlO1xyXG4gIH0sIGZ1bmN0aW9uIG9uQWRhcHRlclJlamVjdGlvbihyZWFzb24pIHtcclxuICAgIGlmICghaXNDYW5jZWwocmVhc29uKSkge1xyXG4gICAgICB0aHJvd0lmQ2FuY2VsbGF0aW9uUmVxdWVzdGVkKGNvbmZpZyk7XHJcblxyXG4gICAgICAvLyBUcmFuc2Zvcm0gcmVzcG9uc2UgZGF0YVxyXG4gICAgICBpZiAocmVhc29uICYmIHJlYXNvbi5yZXNwb25zZSkge1xyXG4gICAgICAgIHJlYXNvbi5yZXNwb25zZS5kYXRhID0gdHJhbnNmb3JtRGF0YShcclxuICAgICAgICAgIHJlYXNvbi5yZXNwb25zZS5kYXRhLFxyXG4gICAgICAgICAgcmVhc29uLnJlc3BvbnNlLmhlYWRlcnMsXHJcbiAgICAgICAgICBjb25maWcudHJhbnNmb3JtUmVzcG9uc2VcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIFByb21pc2UucmVqZWN0KHJlYXNvbik7XHJcbiAgfSk7XHJcbn07XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbi8qKlxyXG4gKiBVcGRhdGUgYW4gRXJyb3Igd2l0aCB0aGUgc3BlY2lmaWVkIGNvbmZpZywgZXJyb3IgY29kZSwgYW5kIHJlc3BvbnNlLlxyXG4gKlxyXG4gKiBAcGFyYW0ge0Vycm9yfSBlcnJvciBUaGUgZXJyb3IgdG8gdXBkYXRlLlxyXG4gKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIFRoZSBjb25maWcuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBbY29kZV0gVGhlIGVycm9yIGNvZGUgKGZvciBleGFtcGxlLCAnRUNPTk5BQk9SVEVEJykuXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBbcmVxdWVzdF0gVGhlIHJlcXVlc3QuXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBbcmVzcG9uc2VdIFRoZSByZXNwb25zZS5cclxuICogQHJldHVybnMge0Vycm9yfSBUaGUgZXJyb3IuXHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGVuaGFuY2VFcnJvcihlcnJvciwgY29uZmlnLCBjb2RlLCByZXF1ZXN0LCByZXNwb25zZSkge1xyXG4gIGVycm9yLmNvbmZpZyA9IGNvbmZpZztcclxuICBpZiAoY29kZSkge1xyXG4gICAgZXJyb3IuY29kZSA9IGNvZGU7XHJcbiAgfVxyXG4gIGVycm9yLnJlcXVlc3QgPSByZXF1ZXN0O1xyXG4gIGVycm9yLnJlc3BvbnNlID0gcmVzcG9uc2U7XHJcbiAgcmV0dXJuIGVycm9yO1xyXG59O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG52YXIgY3JlYXRlRXJyb3IgPSByZXF1aXJlKCcuL2NyZWF0ZUVycm9yJyk7XHJcblxyXG4vKipcclxuICogUmVzb2x2ZSBvciByZWplY3QgYSBQcm9taXNlIGJhc2VkIG9uIHJlc3BvbnNlIHN0YXR1cy5cclxuICpcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gcmVzb2x2ZSBBIGZ1bmN0aW9uIHRoYXQgcmVzb2x2ZXMgdGhlIHByb21pc2UuXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHJlamVjdCBBIGZ1bmN0aW9uIHRoYXQgcmVqZWN0cyB0aGUgcHJvbWlzZS5cclxuICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIFRoZSByZXNwb25zZS5cclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgcmVzcG9uc2UpIHtcclxuICB2YXIgdmFsaWRhdGVTdGF0dXMgPSByZXNwb25zZS5jb25maWcudmFsaWRhdGVTdGF0dXM7XHJcbiAgLy8gTm90ZTogc3RhdHVzIGlzIG5vdCBleHBvc2VkIGJ5IFhEb21haW5SZXF1ZXN0XHJcbiAgaWYgKCFyZXNwb25zZS5zdGF0dXMgfHwgIXZhbGlkYXRlU3RhdHVzIHx8IHZhbGlkYXRlU3RhdHVzKHJlc3BvbnNlLnN0YXR1cykpIHtcclxuICAgIHJlc29sdmUocmVzcG9uc2UpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICByZWplY3QoY3JlYXRlRXJyb3IoXHJcbiAgICAgICdSZXF1ZXN0IGZhaWxlZCB3aXRoIHN0YXR1cyBjb2RlICcgKyByZXNwb25zZS5zdGF0dXMsXHJcbiAgICAgIHJlc3BvbnNlLmNvbmZpZyxcclxuICAgICAgbnVsbCxcclxuICAgICAgcmVzcG9uc2UucmVxdWVzdCxcclxuICAgICAgcmVzcG9uc2VcclxuICAgICkpO1xyXG4gIH1cclxufTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xyXG5cclxuLyoqXHJcbiAqIFRyYW5zZm9ybSB0aGUgZGF0YSBmb3IgYSByZXF1ZXN0IG9yIGEgcmVzcG9uc2VcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R8U3RyaW5nfSBkYXRhIFRoZSBkYXRhIHRvIGJlIHRyYW5zZm9ybWVkXHJcbiAqIEBwYXJhbSB7QXJyYXl9IGhlYWRlcnMgVGhlIGhlYWRlcnMgZm9yIHRoZSByZXF1ZXN0IG9yIHJlc3BvbnNlXHJcbiAqIEBwYXJhbSB7QXJyYXl8RnVuY3Rpb259IGZucyBBIHNpbmdsZSBmdW5jdGlvbiBvciBBcnJheSBvZiBmdW5jdGlvbnNcclxuICogQHJldHVybnMgeyp9IFRoZSByZXN1bHRpbmcgdHJhbnNmb3JtZWQgZGF0YVxyXG4gKi9cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB0cmFuc2Zvcm1EYXRhKGRhdGEsIGhlYWRlcnMsIGZucykge1xyXG4gIC8qZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOjAqL1xyXG4gIHV0aWxzLmZvckVhY2goZm5zLCBmdW5jdGlvbiB0cmFuc2Zvcm0oZm4pIHtcclxuICAgIGRhdGEgPSBmbihkYXRhLCBoZWFkZXJzKTtcclxuICB9KTtcclxuXHJcbiAgcmV0dXJuIGRhdGE7XHJcbn07XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcclxudmFyIG5vcm1hbGl6ZUhlYWRlck5hbWUgPSByZXF1aXJlKCcuL2hlbHBlcnMvbm9ybWFsaXplSGVhZGVyTmFtZScpO1xyXG5cclxudmFyIERFRkFVTFRfQ09OVEVOVF9UWVBFID0ge1xyXG4gICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJ1xyXG59O1xyXG5cclxuZnVuY3Rpb24gc2V0Q29udGVudFR5cGVJZlVuc2V0KGhlYWRlcnMsIHZhbHVlKSB7XHJcbiAgaWYgKCF1dGlscy5pc1VuZGVmaW5lZChoZWFkZXJzKSAmJiB1dGlscy5pc1VuZGVmaW5lZChoZWFkZXJzWydDb250ZW50LVR5cGUnXSkpIHtcclxuICAgIGhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddID0gdmFsdWU7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBnZXREZWZhdWx0QWRhcHRlcigpIHtcclxuICB2YXIgYWRhcHRlcjtcclxuICBpZiAodHlwZW9mIFhNTEh0dHBSZXF1ZXN0ICE9PSAndW5kZWZpbmVkJykge1xyXG4gICAgLy8gRm9yIGJyb3dzZXJzIHVzZSBYSFIgYWRhcHRlclxyXG4gICAgYWRhcHRlciA9IHJlcXVpcmUoJy4vYWRhcHRlcnMveGhyJyk7XHJcbiAgfSBlbHNlIGlmICh0eXBlb2YgcHJvY2VzcyAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgIC8vIEZvciBub2RlIHVzZSBIVFRQIGFkYXB0ZXJcclxuICAgIGFkYXB0ZXIgPSByZXF1aXJlKCcuL2FkYXB0ZXJzL2h0dHAnKTtcclxuICB9XHJcbiAgcmV0dXJuIGFkYXB0ZXI7XHJcbn1cclxuXHJcbnZhciBkZWZhdWx0cyA9IHtcclxuICBhZGFwdGVyOiBnZXREZWZhdWx0QWRhcHRlcigpLFxyXG5cclxuICB0cmFuc2Zvcm1SZXF1ZXN0OiBbZnVuY3Rpb24gdHJhbnNmb3JtUmVxdWVzdChkYXRhLCBoZWFkZXJzKSB7XHJcbiAgICBub3JtYWxpemVIZWFkZXJOYW1lKGhlYWRlcnMsICdDb250ZW50LVR5cGUnKTtcclxuICAgIGlmICh1dGlscy5pc0Zvcm1EYXRhKGRhdGEpIHx8XHJcbiAgICAgIHV0aWxzLmlzQXJyYXlCdWZmZXIoZGF0YSkgfHxcclxuICAgICAgdXRpbHMuaXNCdWZmZXIoZGF0YSkgfHxcclxuICAgICAgdXRpbHMuaXNTdHJlYW0oZGF0YSkgfHxcclxuICAgICAgdXRpbHMuaXNGaWxlKGRhdGEpIHx8XHJcbiAgICAgIHV0aWxzLmlzQmxvYihkYXRhKVxyXG4gICAgKSB7XHJcbiAgICAgIHJldHVybiBkYXRhO1xyXG4gICAgfVxyXG4gICAgaWYgKHV0aWxzLmlzQXJyYXlCdWZmZXJWaWV3KGRhdGEpKSB7XHJcbiAgICAgIHJldHVybiBkYXRhLmJ1ZmZlcjtcclxuICAgIH1cclxuICAgIGlmICh1dGlscy5pc1VSTFNlYXJjaFBhcmFtcyhkYXRhKSkge1xyXG4gICAgICBzZXRDb250ZW50VHlwZUlmVW5zZXQoaGVhZGVycywgJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDtjaGFyc2V0PXV0Zi04Jyk7XHJcbiAgICAgIHJldHVybiBkYXRhLnRvU3RyaW5nKCk7XHJcbiAgICB9XHJcbiAgICBpZiAodXRpbHMuaXNPYmplY3QoZGF0YSkpIHtcclxuICAgICAgc2V0Q29udGVudFR5cGVJZlVuc2V0KGhlYWRlcnMsICdhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTgnKTtcclxuICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGRhdGEpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGRhdGE7XHJcbiAgfV0sXHJcblxyXG4gIHRyYW5zZm9ybVJlc3BvbnNlOiBbZnVuY3Rpb24gdHJhbnNmb3JtUmVzcG9uc2UoZGF0YSkge1xyXG4gICAgLyplc2xpbnQgbm8tcGFyYW0tcmVhc3NpZ246MCovXHJcbiAgICBpZiAodHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgZGF0YSA9IEpTT04ucGFyc2UoZGF0YSk7XHJcbiAgICAgIH0gY2F0Y2ggKGUpIHsgLyogSWdub3JlICovIH1cclxuICAgIH1cclxuICAgIHJldHVybiBkYXRhO1xyXG4gIH1dLFxyXG5cclxuICAvKipcclxuICAgKiBBIHRpbWVvdXQgaW4gbWlsbGlzZWNvbmRzIHRvIGFib3J0IGEgcmVxdWVzdC4gSWYgc2V0IHRvIDAgKGRlZmF1bHQpIGFcclxuICAgKiB0aW1lb3V0IGlzIG5vdCBjcmVhdGVkLlxyXG4gICAqL1xyXG4gIHRpbWVvdXQ6IDAsXHJcblxyXG4gIHhzcmZDb29raWVOYW1lOiAnWFNSRi1UT0tFTicsXHJcbiAgeHNyZkhlYWRlck5hbWU6ICdYLVhTUkYtVE9LRU4nLFxyXG5cclxuICBtYXhDb250ZW50TGVuZ3RoOiAtMSxcclxuXHJcbiAgdmFsaWRhdGVTdGF0dXM6IGZ1bmN0aW9uIHZhbGlkYXRlU3RhdHVzKHN0YXR1cykge1xyXG4gICAgcmV0dXJuIHN0YXR1cyA+PSAyMDAgJiYgc3RhdHVzIDwgMzAwO1xyXG4gIH1cclxufTtcclxuXHJcbmRlZmF1bHRzLmhlYWRlcnMgPSB7XHJcbiAgY29tbW9uOiB7XHJcbiAgICAnQWNjZXB0JzogJ2FwcGxpY2F0aW9uL2pzb24sIHRleHQvcGxhaW4sICovKidcclxuICB9XHJcbn07XHJcblxyXG51dGlscy5mb3JFYWNoKFsnZGVsZXRlJywgJ2dldCcsICdoZWFkJ10sIGZ1bmN0aW9uIGZvckVhY2hNZXRob2ROb0RhdGEobWV0aG9kKSB7XHJcbiAgZGVmYXVsdHMuaGVhZGVyc1ttZXRob2RdID0ge307XHJcbn0pO1xyXG5cclxudXRpbHMuZm9yRWFjaChbJ3Bvc3QnLCAncHV0JywgJ3BhdGNoJ10sIGZ1bmN0aW9uIGZvckVhY2hNZXRob2RXaXRoRGF0YShtZXRob2QpIHtcclxuICBkZWZhdWx0cy5oZWFkZXJzW21ldGhvZF0gPSB1dGlscy5tZXJnZShERUZBVUxUX0NPTlRFTlRfVFlQRSk7XHJcbn0pO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBkZWZhdWx0cztcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBiaW5kKGZuLCB0aGlzQXJnKSB7XHJcbiAgcmV0dXJuIGZ1bmN0aW9uIHdyYXAoKSB7XHJcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBhcmdzW2ldID0gYXJndW1lbnRzW2ldO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xyXG4gIH07XHJcbn07XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbi8vIGJ0b2EgcG9seWZpbGwgZm9yIElFPDEwIGNvdXJ0ZXN5IGh0dHBzOi8vZ2l0aHViLmNvbS9kYXZpZGNoYW1iZXJzL0Jhc2U2NC5qc1xyXG5cclxudmFyIGNoYXJzID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky89JztcclxuXHJcbmZ1bmN0aW9uIEUoKSB7XHJcbiAgdGhpcy5tZXNzYWdlID0gJ1N0cmluZyBjb250YWlucyBhbiBpbnZhbGlkIGNoYXJhY3Rlcic7XHJcbn1cclxuRS5wcm90b3R5cGUgPSBuZXcgRXJyb3I7XHJcbkUucHJvdG90eXBlLmNvZGUgPSA1O1xyXG5FLnByb3RvdHlwZS5uYW1lID0gJ0ludmFsaWRDaGFyYWN0ZXJFcnJvcic7XHJcblxyXG5mdW5jdGlvbiBidG9hKGlucHV0KSB7XHJcbiAgdmFyIHN0ciA9IFN0cmluZyhpbnB1dCk7XHJcbiAgdmFyIG91dHB1dCA9ICcnO1xyXG4gIGZvciAoXHJcbiAgICAvLyBpbml0aWFsaXplIHJlc3VsdCBhbmQgY291bnRlclxyXG4gICAgdmFyIGJsb2NrLCBjaGFyQ29kZSwgaWR4ID0gMCwgbWFwID0gY2hhcnM7XHJcbiAgICAvLyBpZiB0aGUgbmV4dCBzdHIgaW5kZXggZG9lcyBub3QgZXhpc3Q6XHJcbiAgICAvLyAgIGNoYW5nZSB0aGUgbWFwcGluZyB0YWJsZSB0byBcIj1cIlxyXG4gICAgLy8gICBjaGVjayBpZiBkIGhhcyBubyBmcmFjdGlvbmFsIGRpZ2l0c1xyXG4gICAgc3RyLmNoYXJBdChpZHggfCAwKSB8fCAobWFwID0gJz0nLCBpZHggJSAxKTtcclxuICAgIC8vIFwiOCAtIGlkeCAlIDEgKiA4XCIgZ2VuZXJhdGVzIHRoZSBzZXF1ZW5jZSAyLCA0LCA2LCA4XHJcbiAgICBvdXRwdXQgKz0gbWFwLmNoYXJBdCg2MyAmIGJsb2NrID4+IDggLSBpZHggJSAxICogOClcclxuICApIHtcclxuICAgIGNoYXJDb2RlID0gc3RyLmNoYXJDb2RlQXQoaWR4ICs9IDMgLyA0KTtcclxuICAgIGlmIChjaGFyQ29kZSA+IDB4RkYpIHtcclxuICAgICAgdGhyb3cgbmV3IEUoKTtcclxuICAgIH1cclxuICAgIGJsb2NrID0gYmxvY2sgPDwgOCB8IGNoYXJDb2RlO1xyXG4gIH1cclxuICByZXR1cm4gb3V0cHV0O1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGJ0b2E7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcclxuXHJcbmZ1bmN0aW9uIGVuY29kZSh2YWwpIHtcclxuICByZXR1cm4gZW5jb2RlVVJJQ29tcG9uZW50KHZhbCkuXHJcbiAgICByZXBsYWNlKC8lNDAvZ2ksICdAJykuXHJcbiAgICByZXBsYWNlKC8lM0EvZ2ksICc6JykuXHJcbiAgICByZXBsYWNlKC8lMjQvZywgJyQnKS5cclxuICAgIHJlcGxhY2UoLyUyQy9naSwgJywnKS5cclxuICAgIHJlcGxhY2UoLyUyMC9nLCAnKycpLlxyXG4gICAgcmVwbGFjZSgvJTVCL2dpLCAnWycpLlxyXG4gICAgcmVwbGFjZSgvJTVEL2dpLCAnXScpO1xyXG59XHJcblxyXG4vKipcclxuICogQnVpbGQgYSBVUkwgYnkgYXBwZW5kaW5nIHBhcmFtcyB0byB0aGUgZW5kXHJcbiAqXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgVGhlIGJhc2Ugb2YgdGhlIHVybCAoZS5nLiwgaHR0cDovL3d3dy5nb29nbGUuY29tKVxyXG4gKiBAcGFyYW0ge29iamVjdH0gW3BhcmFtc10gVGhlIHBhcmFtcyB0byBiZSBhcHBlbmRlZFxyXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgZm9ybWF0dGVkIHVybFxyXG4gKi9cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBidWlsZFVSTCh1cmwsIHBhcmFtcywgcGFyYW1zU2VyaWFsaXplcikge1xyXG4gIC8qZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOjAqL1xyXG4gIGlmICghcGFyYW1zKSB7XHJcbiAgICByZXR1cm4gdXJsO1xyXG4gIH1cclxuXHJcbiAgdmFyIHNlcmlhbGl6ZWRQYXJhbXM7XHJcbiAgaWYgKHBhcmFtc1NlcmlhbGl6ZXIpIHtcclxuICAgIHNlcmlhbGl6ZWRQYXJhbXMgPSBwYXJhbXNTZXJpYWxpemVyKHBhcmFtcyk7XHJcbiAgfSBlbHNlIGlmICh1dGlscy5pc1VSTFNlYXJjaFBhcmFtcyhwYXJhbXMpKSB7XHJcbiAgICBzZXJpYWxpemVkUGFyYW1zID0gcGFyYW1zLnRvU3RyaW5nKCk7XHJcbiAgfSBlbHNlIHtcclxuICAgIHZhciBwYXJ0cyA9IFtdO1xyXG5cclxuICAgIHV0aWxzLmZvckVhY2gocGFyYW1zLCBmdW5jdGlvbiBzZXJpYWxpemUodmFsLCBrZXkpIHtcclxuICAgICAgaWYgKHZhbCA9PT0gbnVsbCB8fCB0eXBlb2YgdmFsID09PSAndW5kZWZpbmVkJykge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHV0aWxzLmlzQXJyYXkodmFsKSkge1xyXG4gICAgICAgIGtleSA9IGtleSArICdbXSc7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdmFsID0gW3ZhbF07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHV0aWxzLmZvckVhY2godmFsLCBmdW5jdGlvbiBwYXJzZVZhbHVlKHYpIHtcclxuICAgICAgICBpZiAodXRpbHMuaXNEYXRlKHYpKSB7XHJcbiAgICAgICAgICB2ID0gdi50b0lTT1N0cmluZygpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAodXRpbHMuaXNPYmplY3QodikpIHtcclxuICAgICAgICAgIHYgPSBKU09OLnN0cmluZ2lmeSh2KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcGFydHMucHVzaChlbmNvZGUoa2V5KSArICc9JyArIGVuY29kZSh2KSk7XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgc2VyaWFsaXplZFBhcmFtcyA9IHBhcnRzLmpvaW4oJyYnKTtcclxuICB9XHJcblxyXG4gIGlmIChzZXJpYWxpemVkUGFyYW1zKSB7XHJcbiAgICB1cmwgKz0gKHVybC5pbmRleE9mKCc/JykgPT09IC0xID8gJz8nIDogJyYnKSArIHNlcmlhbGl6ZWRQYXJhbXM7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gdXJsO1xyXG59O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhIG5ldyBVUkwgYnkgY29tYmluaW5nIHRoZSBzcGVjaWZpZWQgVVJMc1xyXG4gKlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gYmFzZVVSTCBUaGUgYmFzZSBVUkxcclxuICogQHBhcmFtIHtzdHJpbmd9IHJlbGF0aXZlVVJMIFRoZSByZWxhdGl2ZSBVUkxcclxuICogQHJldHVybnMge3N0cmluZ30gVGhlIGNvbWJpbmVkIFVSTFxyXG4gKi9cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBjb21iaW5lVVJMcyhiYXNlVVJMLCByZWxhdGl2ZVVSTCkge1xyXG4gIHJldHVybiByZWxhdGl2ZVVSTFxyXG4gICAgPyBiYXNlVVJMLnJlcGxhY2UoL1xcLyskLywgJycpICsgJy8nICsgcmVsYXRpdmVVUkwucmVwbGFjZSgvXlxcLysvLCAnJylcclxuICAgIDogYmFzZVVSTDtcclxufTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSAoXHJcbiAgdXRpbHMuaXNTdGFuZGFyZEJyb3dzZXJFbnYoKSA/XHJcblxyXG4gIC8vIFN0YW5kYXJkIGJyb3dzZXIgZW52cyBzdXBwb3J0IGRvY3VtZW50LmNvb2tpZVxyXG4gIChmdW5jdGlvbiBzdGFuZGFyZEJyb3dzZXJFbnYoKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB3cml0ZTogZnVuY3Rpb24gd3JpdGUobmFtZSwgdmFsdWUsIGV4cGlyZXMsIHBhdGgsIGRvbWFpbiwgc2VjdXJlKSB7XHJcbiAgICAgICAgdmFyIGNvb2tpZSA9IFtdO1xyXG4gICAgICAgIGNvb2tpZS5wdXNoKG5hbWUgKyAnPScgKyBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpKTtcclxuXHJcbiAgICAgICAgaWYgKHV0aWxzLmlzTnVtYmVyKGV4cGlyZXMpKSB7XHJcbiAgICAgICAgICBjb29raWUucHVzaCgnZXhwaXJlcz0nICsgbmV3IERhdGUoZXhwaXJlcykudG9HTVRTdHJpbmcoKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodXRpbHMuaXNTdHJpbmcocGF0aCkpIHtcclxuICAgICAgICAgIGNvb2tpZS5wdXNoKCdwYXRoPScgKyBwYXRoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh1dGlscy5pc1N0cmluZyhkb21haW4pKSB7XHJcbiAgICAgICAgICBjb29raWUucHVzaCgnZG9tYWluPScgKyBkb21haW4pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHNlY3VyZSA9PT0gdHJ1ZSkge1xyXG4gICAgICAgICAgY29va2llLnB1c2goJ3NlY3VyZScpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZG9jdW1lbnQuY29va2llID0gY29va2llLmpvaW4oJzsgJyk7XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICByZWFkOiBmdW5jdGlvbiByZWFkKG5hbWUpIHtcclxuICAgICAgICB2YXIgbWF0Y2ggPSBkb2N1bWVudC5jb29raWUubWF0Y2gobmV3IFJlZ0V4cCgnKF58O1xcXFxzKikoJyArIG5hbWUgKyAnKT0oW147XSopJykpO1xyXG4gICAgICAgIHJldHVybiAobWF0Y2ggPyBkZWNvZGVVUklDb21wb25lbnQobWF0Y2hbM10pIDogbnVsbCk7XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICByZW1vdmU6IGZ1bmN0aW9uIHJlbW92ZShuYW1lKSB7XHJcbiAgICAgICAgdGhpcy53cml0ZShuYW1lLCAnJywgRGF0ZS5ub3coKSAtIDg2NDAwMDAwKTtcclxuICAgICAgfVxyXG4gICAgfTtcclxuICB9KSgpIDpcclxuXHJcbiAgLy8gTm9uIHN0YW5kYXJkIGJyb3dzZXIgZW52ICh3ZWIgd29ya2VycywgcmVhY3QtbmF0aXZlKSBsYWNrIG5lZWRlZCBzdXBwb3J0LlxyXG4gIChmdW5jdGlvbiBub25TdGFuZGFyZEJyb3dzZXJFbnYoKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB3cml0ZTogZnVuY3Rpb24gd3JpdGUoKSB7fSxcclxuICAgICAgcmVhZDogZnVuY3Rpb24gcmVhZCgpIHsgcmV0dXJuIG51bGw7IH0sXHJcbiAgICAgIHJlbW92ZTogZnVuY3Rpb24gcmVtb3ZlKCkge31cclxuICAgIH07XHJcbiAgfSkoKVxyXG4pO1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG4vKipcclxuICogRGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBzcGVjaWZpZWQgVVJMIGlzIGFic29sdXRlXHJcbiAqXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgVGhlIFVSTCB0byB0ZXN0XHJcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHRoZSBzcGVjaWZpZWQgVVJMIGlzIGFic29sdXRlLCBvdGhlcndpc2UgZmFsc2VcclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNBYnNvbHV0ZVVSTCh1cmwpIHtcclxuICAvLyBBIFVSTCBpcyBjb25zaWRlcmVkIGFic29sdXRlIGlmIGl0IGJlZ2lucyB3aXRoIFwiPHNjaGVtZT46Ly9cIiBvciBcIi8vXCIgKHByb3RvY29sLXJlbGF0aXZlIFVSTCkuXHJcbiAgLy8gUkZDIDM5ODYgZGVmaW5lcyBzY2hlbWUgbmFtZSBhcyBhIHNlcXVlbmNlIG9mIGNoYXJhY3RlcnMgYmVnaW5uaW5nIHdpdGggYSBsZXR0ZXIgYW5kIGZvbGxvd2VkXHJcbiAgLy8gYnkgYW55IGNvbWJpbmF0aW9uIG9mIGxldHRlcnMsIGRpZ2l0cywgcGx1cywgcGVyaW9kLCBvciBoeXBoZW4uXHJcbiAgcmV0dXJuIC9eKFthLXpdW2EtelxcZFxcK1xcLVxcLl0qOik/XFwvXFwvL2kudGVzdCh1cmwpO1xyXG59O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IChcclxuICB1dGlscy5pc1N0YW5kYXJkQnJvd3NlckVudigpID9cclxuXHJcbiAgLy8gU3RhbmRhcmQgYnJvd3NlciBlbnZzIGhhdmUgZnVsbCBzdXBwb3J0IG9mIHRoZSBBUElzIG5lZWRlZCB0byB0ZXN0XHJcbiAgLy8gd2hldGhlciB0aGUgcmVxdWVzdCBVUkwgaXMgb2YgdGhlIHNhbWUgb3JpZ2luIGFzIGN1cnJlbnQgbG9jYXRpb24uXHJcbiAgKGZ1bmN0aW9uIHN0YW5kYXJkQnJvd3NlckVudigpIHtcclxuICAgIHZhciBtc2llID0gLyhtc2llfHRyaWRlbnQpL2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KTtcclxuICAgIHZhciB1cmxQYXJzaW5nTm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcclxuICAgIHZhciBvcmlnaW5VUkw7XHJcblxyXG4gICAgLyoqXHJcbiAgICAqIFBhcnNlIGEgVVJMIHRvIGRpc2NvdmVyIGl0J3MgY29tcG9uZW50c1xyXG4gICAgKlxyXG4gICAgKiBAcGFyYW0ge1N0cmluZ30gdXJsIFRoZSBVUkwgdG8gYmUgcGFyc2VkXHJcbiAgICAqIEByZXR1cm5zIHtPYmplY3R9XHJcbiAgICAqL1xyXG4gICAgZnVuY3Rpb24gcmVzb2x2ZVVSTCh1cmwpIHtcclxuICAgICAgdmFyIGhyZWYgPSB1cmw7XHJcblxyXG4gICAgICBpZiAobXNpZSkge1xyXG4gICAgICAgIC8vIElFIG5lZWRzIGF0dHJpYnV0ZSBzZXQgdHdpY2UgdG8gbm9ybWFsaXplIHByb3BlcnRpZXNcclxuICAgICAgICB1cmxQYXJzaW5nTm9kZS5zZXRBdHRyaWJ1dGUoJ2hyZWYnLCBocmVmKTtcclxuICAgICAgICBocmVmID0gdXJsUGFyc2luZ05vZGUuaHJlZjtcclxuICAgICAgfVxyXG5cclxuICAgICAgdXJsUGFyc2luZ05vZGUuc2V0QXR0cmlidXRlKCdocmVmJywgaHJlZik7XHJcblxyXG4gICAgICAvLyB1cmxQYXJzaW5nTm9kZSBwcm92aWRlcyB0aGUgVXJsVXRpbHMgaW50ZXJmYWNlIC0gaHR0cDovL3VybC5zcGVjLndoYXR3Zy5vcmcvI3VybHV0aWxzXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgaHJlZjogdXJsUGFyc2luZ05vZGUuaHJlZixcclxuICAgICAgICBwcm90b2NvbDogdXJsUGFyc2luZ05vZGUucHJvdG9jb2wgPyB1cmxQYXJzaW5nTm9kZS5wcm90b2NvbC5yZXBsYWNlKC86JC8sICcnKSA6ICcnLFxyXG4gICAgICAgIGhvc3Q6IHVybFBhcnNpbmdOb2RlLmhvc3QsXHJcbiAgICAgICAgc2VhcmNoOiB1cmxQYXJzaW5nTm9kZS5zZWFyY2ggPyB1cmxQYXJzaW5nTm9kZS5zZWFyY2gucmVwbGFjZSgvXlxcPy8sICcnKSA6ICcnLFxyXG4gICAgICAgIGhhc2g6IHVybFBhcnNpbmdOb2RlLmhhc2ggPyB1cmxQYXJzaW5nTm9kZS5oYXNoLnJlcGxhY2UoL14jLywgJycpIDogJycsXHJcbiAgICAgICAgaG9zdG5hbWU6IHVybFBhcnNpbmdOb2RlLmhvc3RuYW1lLFxyXG4gICAgICAgIHBvcnQ6IHVybFBhcnNpbmdOb2RlLnBvcnQsXHJcbiAgICAgICAgcGF0aG5hbWU6ICh1cmxQYXJzaW5nTm9kZS5wYXRobmFtZS5jaGFyQXQoMCkgPT09ICcvJykgP1xyXG4gICAgICAgICAgICAgICAgICB1cmxQYXJzaW5nTm9kZS5wYXRobmFtZSA6XHJcbiAgICAgICAgICAgICAgICAgICcvJyArIHVybFBhcnNpbmdOb2RlLnBhdGhuYW1lXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgb3JpZ2luVVJMID0gcmVzb2x2ZVVSTCh3aW5kb3cubG9jYXRpb24uaHJlZik7XHJcblxyXG4gICAgLyoqXHJcbiAgICAqIERldGVybWluZSBpZiBhIFVSTCBzaGFyZXMgdGhlIHNhbWUgb3JpZ2luIGFzIHRoZSBjdXJyZW50IGxvY2F0aW9uXHJcbiAgICAqXHJcbiAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXF1ZXN0VVJMIFRoZSBVUkwgdG8gdGVzdFxyXG4gICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBVUkwgc2hhcmVzIHRoZSBzYW1lIG9yaWdpbiwgb3RoZXJ3aXNlIGZhbHNlXHJcbiAgICAqL1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIGlzVVJMU2FtZU9yaWdpbihyZXF1ZXN0VVJMKSB7XHJcbiAgICAgIHZhciBwYXJzZWQgPSAodXRpbHMuaXNTdHJpbmcocmVxdWVzdFVSTCkpID8gcmVzb2x2ZVVSTChyZXF1ZXN0VVJMKSA6IHJlcXVlc3RVUkw7XHJcbiAgICAgIHJldHVybiAocGFyc2VkLnByb3RvY29sID09PSBvcmlnaW5VUkwucHJvdG9jb2wgJiZcclxuICAgICAgICAgICAgcGFyc2VkLmhvc3QgPT09IG9yaWdpblVSTC5ob3N0KTtcclxuICAgIH07XHJcbiAgfSkoKSA6XHJcblxyXG4gIC8vIE5vbiBzdGFuZGFyZCBicm93c2VyIGVudnMgKHdlYiB3b3JrZXJzLCByZWFjdC1uYXRpdmUpIGxhY2sgbmVlZGVkIHN1cHBvcnQuXHJcbiAgKGZ1bmN0aW9uIG5vblN0YW5kYXJkQnJvd3NlckVudigpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiBpc1VSTFNhbWVPcmlnaW4oKSB7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfTtcclxuICB9KSgpXHJcbik7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIG5vcm1hbGl6ZUhlYWRlck5hbWUoaGVhZGVycywgbm9ybWFsaXplZE5hbWUpIHtcclxuICB1dGlscy5mb3JFYWNoKGhlYWRlcnMsIGZ1bmN0aW9uIHByb2Nlc3NIZWFkZXIodmFsdWUsIG5hbWUpIHtcclxuICAgIGlmIChuYW1lICE9PSBub3JtYWxpemVkTmFtZSAmJiBuYW1lLnRvVXBwZXJDYXNlKCkgPT09IG5vcm1hbGl6ZWROYW1lLnRvVXBwZXJDYXNlKCkpIHtcclxuICAgICAgaGVhZGVyc1tub3JtYWxpemVkTmFtZV0gPSB2YWx1ZTtcclxuICAgICAgZGVsZXRlIGhlYWRlcnNbbmFtZV07XHJcbiAgICB9XHJcbiAgfSk7XHJcbn07XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcclxuXHJcbi8vIEhlYWRlcnMgd2hvc2UgZHVwbGljYXRlcyBhcmUgaWdub3JlZCBieSBub2RlXHJcbi8vIGMuZi4gaHR0cHM6Ly9ub2RlanMub3JnL2FwaS9odHRwLmh0bWwjaHR0cF9tZXNzYWdlX2hlYWRlcnNcclxudmFyIGlnbm9yZUR1cGxpY2F0ZU9mID0gW1xyXG4gICdhZ2UnLCAnYXV0aG9yaXphdGlvbicsICdjb250ZW50LWxlbmd0aCcsICdjb250ZW50LXR5cGUnLCAnZXRhZycsXHJcbiAgJ2V4cGlyZXMnLCAnZnJvbScsICdob3N0JywgJ2lmLW1vZGlmaWVkLXNpbmNlJywgJ2lmLXVubW9kaWZpZWQtc2luY2UnLFxyXG4gICdsYXN0LW1vZGlmaWVkJywgJ2xvY2F0aW9uJywgJ21heC1mb3J3YXJkcycsICdwcm94eS1hdXRob3JpemF0aW9uJyxcclxuICAncmVmZXJlcicsICdyZXRyeS1hZnRlcicsICd1c2VyLWFnZW50J1xyXG5dO1xyXG5cclxuLyoqXHJcbiAqIFBhcnNlIGhlYWRlcnMgaW50byBhbiBvYmplY3RcclxuICpcclxuICogYGBgXHJcbiAqIERhdGU6IFdlZCwgMjcgQXVnIDIwMTQgMDg6NTg6NDkgR01UXHJcbiAqIENvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvblxyXG4gKiBDb25uZWN0aW9uOiBrZWVwLWFsaXZlXHJcbiAqIFRyYW5zZmVyLUVuY29kaW5nOiBjaHVua2VkXHJcbiAqIGBgYFxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gaGVhZGVycyBIZWFkZXJzIG5lZWRpbmcgdG8gYmUgcGFyc2VkXHJcbiAqIEByZXR1cm5zIHtPYmplY3R9IEhlYWRlcnMgcGFyc2VkIGludG8gYW4gb2JqZWN0XHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHBhcnNlSGVhZGVycyhoZWFkZXJzKSB7XHJcbiAgdmFyIHBhcnNlZCA9IHt9O1xyXG4gIHZhciBrZXk7XHJcbiAgdmFyIHZhbDtcclxuICB2YXIgaTtcclxuXHJcbiAgaWYgKCFoZWFkZXJzKSB7IHJldHVybiBwYXJzZWQ7IH1cclxuXHJcbiAgdXRpbHMuZm9yRWFjaChoZWFkZXJzLnNwbGl0KCdcXG4nKSwgZnVuY3Rpb24gcGFyc2VyKGxpbmUpIHtcclxuICAgIGkgPSBsaW5lLmluZGV4T2YoJzonKTtcclxuICAgIGtleSA9IHV0aWxzLnRyaW0obGluZS5zdWJzdHIoMCwgaSkpLnRvTG93ZXJDYXNlKCk7XHJcbiAgICB2YWwgPSB1dGlscy50cmltKGxpbmUuc3Vic3RyKGkgKyAxKSk7XHJcblxyXG4gICAgaWYgKGtleSkge1xyXG4gICAgICBpZiAocGFyc2VkW2tleV0gJiYgaWdub3JlRHVwbGljYXRlT2YuaW5kZXhPZihrZXkpID49IDApIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGtleSA9PT0gJ3NldC1jb29raWUnKSB7XHJcbiAgICAgICAgcGFyc2VkW2tleV0gPSAocGFyc2VkW2tleV0gPyBwYXJzZWRba2V5XSA6IFtdKS5jb25jYXQoW3ZhbF0pO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHBhcnNlZFtrZXldID0gcGFyc2VkW2tleV0gPyBwYXJzZWRba2V5XSArICcsICcgKyB2YWwgOiB2YWw7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9KTtcclxuXHJcbiAgcmV0dXJuIHBhcnNlZDtcclxufTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuLyoqXHJcbiAqIFN5bnRhY3RpYyBzdWdhciBmb3IgaW52b2tpbmcgYSBmdW5jdGlvbiBhbmQgZXhwYW5kaW5nIGFuIGFycmF5IGZvciBhcmd1bWVudHMuXHJcbiAqXHJcbiAqIENvbW1vbiB1c2UgY2FzZSB3b3VsZCBiZSB0byB1c2UgYEZ1bmN0aW9uLnByb3RvdHlwZS5hcHBseWAuXHJcbiAqXHJcbiAqICBgYGBqc1xyXG4gKiAgZnVuY3Rpb24gZih4LCB5LCB6KSB7fVxyXG4gKiAgdmFyIGFyZ3MgPSBbMSwgMiwgM107XHJcbiAqICBmLmFwcGx5KG51bGwsIGFyZ3MpO1xyXG4gKiAgYGBgXHJcbiAqXHJcbiAqIFdpdGggYHNwcmVhZGAgdGhpcyBleGFtcGxlIGNhbiBiZSByZS13cml0dGVuLlxyXG4gKlxyXG4gKiAgYGBganNcclxuICogIHNwcmVhZChmdW5jdGlvbih4LCB5LCB6KSB7fSkoWzEsIDIsIDNdKTtcclxuICogIGBgYFxyXG4gKlxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xyXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259XHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHNwcmVhZChjYWxsYmFjaykge1xyXG4gIHJldHVybiBmdW5jdGlvbiB3cmFwKGFycikge1xyXG4gICAgcmV0dXJuIGNhbGxiYWNrLmFwcGx5KG51bGwsIGFycik7XHJcbiAgfTtcclxufTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIGJpbmQgPSByZXF1aXJlKCcuL2hlbHBlcnMvYmluZCcpO1xyXG52YXIgaXNCdWZmZXIgPSByZXF1aXJlKCdpcy1idWZmZXInKTtcclxuXHJcbi8qZ2xvYmFsIHRvU3RyaW5nOnRydWUqL1xyXG5cclxuLy8gdXRpbHMgaXMgYSBsaWJyYXJ5IG9mIGdlbmVyaWMgaGVscGVyIGZ1bmN0aW9ucyBub24tc3BlY2lmaWMgdG8gYXhpb3NcclxuXHJcbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XHJcblxyXG4vKipcclxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYW4gQXJyYXlcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhbiBBcnJheSwgb3RoZXJ3aXNlIGZhbHNlXHJcbiAqL1xyXG5mdW5jdGlvbiBpc0FycmF5KHZhbCkge1xyXG4gIHJldHVybiB0b1N0cmluZy5jYWxsKHZhbCkgPT09ICdbb2JqZWN0IEFycmF5XSc7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhbiBBcnJheUJ1ZmZlclxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XHJcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGFuIEFycmF5QnVmZmVyLCBvdGhlcndpc2UgZmFsc2VcclxuICovXHJcbmZ1bmN0aW9uIGlzQXJyYXlCdWZmZXIodmFsKSB7XHJcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwodmFsKSA9PT0gJ1tvYmplY3QgQXJyYXlCdWZmZXJdJztcclxufVxyXG5cclxuLyoqXHJcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgRm9ybURhdGFcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhbiBGb3JtRGF0YSwgb3RoZXJ3aXNlIGZhbHNlXHJcbiAqL1xyXG5mdW5jdGlvbiBpc0Zvcm1EYXRhKHZhbCkge1xyXG4gIHJldHVybiAodHlwZW9mIEZvcm1EYXRhICE9PSAndW5kZWZpbmVkJykgJiYgKHZhbCBpbnN0YW5jZW9mIEZvcm1EYXRhKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgdmlldyBvbiBhbiBBcnJheUJ1ZmZlclxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XHJcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgdmlldyBvbiBhbiBBcnJheUJ1ZmZlciwgb3RoZXJ3aXNlIGZhbHNlXHJcbiAqL1xyXG5mdW5jdGlvbiBpc0FycmF5QnVmZmVyVmlldyh2YWwpIHtcclxuICB2YXIgcmVzdWx0O1xyXG4gIGlmICgodHlwZW9mIEFycmF5QnVmZmVyICE9PSAndW5kZWZpbmVkJykgJiYgKEFycmF5QnVmZmVyLmlzVmlldykpIHtcclxuICAgIHJlc3VsdCA9IEFycmF5QnVmZmVyLmlzVmlldyh2YWwpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICByZXN1bHQgPSAodmFsKSAmJiAodmFsLmJ1ZmZlcikgJiYgKHZhbC5idWZmZXIgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcik7XHJcbiAgfVxyXG4gIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhIFN0cmluZ1xyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XHJcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgU3RyaW5nLCBvdGhlcndpc2UgZmFsc2VcclxuICovXHJcbmZ1bmN0aW9uIGlzU3RyaW5nKHZhbCkge1xyXG4gIHJldHVybiB0eXBlb2YgdmFsID09PSAnc3RyaW5nJztcclxufVxyXG5cclxuLyoqXHJcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgTnVtYmVyXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcclxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBOdW1iZXIsIG90aGVyd2lzZSBmYWxzZVxyXG4gKi9cclxuZnVuY3Rpb24gaXNOdW1iZXIodmFsKSB7XHJcbiAgcmV0dXJuIHR5cGVvZiB2YWwgPT09ICdudW1iZXInO1xyXG59XHJcblxyXG4vKipcclxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgdW5kZWZpbmVkXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcclxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdGhlIHZhbHVlIGlzIHVuZGVmaW5lZCwgb3RoZXJ3aXNlIGZhbHNlXHJcbiAqL1xyXG5mdW5jdGlvbiBpc1VuZGVmaW5lZCh2YWwpIHtcclxuICByZXR1cm4gdHlwZW9mIHZhbCA9PT0gJ3VuZGVmaW5lZCc7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhbiBPYmplY3RcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhbiBPYmplY3QsIG90aGVyd2lzZSBmYWxzZVxyXG4gKi9cclxuZnVuY3Rpb24gaXNPYmplY3QodmFsKSB7XHJcbiAgcmV0dXJuIHZhbCAhPT0gbnVsbCAmJiB0eXBlb2YgdmFsID09PSAnb2JqZWN0JztcclxufVxyXG5cclxuLyoqXHJcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgRGF0ZVxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XHJcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgRGF0ZSwgb3RoZXJ3aXNlIGZhbHNlXHJcbiAqL1xyXG5mdW5jdGlvbiBpc0RhdGUodmFsKSB7XHJcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwodmFsKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xyXG59XHJcblxyXG4vKipcclxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBGaWxlXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcclxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBGaWxlLCBvdGhlcndpc2UgZmFsc2VcclxuICovXHJcbmZ1bmN0aW9uIGlzRmlsZSh2YWwpIHtcclxuICByZXR1cm4gdG9TdHJpbmcuY2FsbCh2YWwpID09PSAnW29iamVjdCBGaWxlXSc7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhIEJsb2JcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIEJsb2IsIG90aGVyd2lzZSBmYWxzZVxyXG4gKi9cclxuZnVuY3Rpb24gaXNCbG9iKHZhbCkge1xyXG4gIHJldHVybiB0b1N0cmluZy5jYWxsKHZhbCkgPT09ICdbb2JqZWN0IEJsb2JdJztcclxufVxyXG5cclxuLyoqXHJcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgRnVuY3Rpb25cclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIEZ1bmN0aW9uLCBvdGhlcndpc2UgZmFsc2VcclxuICovXHJcbmZ1bmN0aW9uIGlzRnVuY3Rpb24odmFsKSB7XHJcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwodmFsKSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcclxufVxyXG5cclxuLyoqXHJcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgU3RyZWFtXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcclxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBTdHJlYW0sIG90aGVyd2lzZSBmYWxzZVxyXG4gKi9cclxuZnVuY3Rpb24gaXNTdHJlYW0odmFsKSB7XHJcbiAgcmV0dXJuIGlzT2JqZWN0KHZhbCkgJiYgaXNGdW5jdGlvbih2YWwucGlwZSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhIFVSTFNlYXJjaFBhcmFtcyBvYmplY3RcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIFVSTFNlYXJjaFBhcmFtcyBvYmplY3QsIG90aGVyd2lzZSBmYWxzZVxyXG4gKi9cclxuZnVuY3Rpb24gaXNVUkxTZWFyY2hQYXJhbXModmFsKSB7XHJcbiAgcmV0dXJuIHR5cGVvZiBVUkxTZWFyY2hQYXJhbXMgIT09ICd1bmRlZmluZWQnICYmIHZhbCBpbnN0YW5jZW9mIFVSTFNlYXJjaFBhcmFtcztcclxufVxyXG5cclxuLyoqXHJcbiAqIFRyaW0gZXhjZXNzIHdoaXRlc3BhY2Ugb2ZmIHRoZSBiZWdpbm5pbmcgYW5kIGVuZCBvZiBhIHN0cmluZ1xyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyIFRoZSBTdHJpbmcgdG8gdHJpbVxyXG4gKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgU3RyaW5nIGZyZWVkIG9mIGV4Y2VzcyB3aGl0ZXNwYWNlXHJcbiAqL1xyXG5mdW5jdGlvbiB0cmltKHN0cikge1xyXG4gIHJldHVybiBzdHIucmVwbGFjZSgvXlxccyovLCAnJykucmVwbGFjZSgvXFxzKiQvLCAnJyk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZXRlcm1pbmUgaWYgd2UncmUgcnVubmluZyBpbiBhIHN0YW5kYXJkIGJyb3dzZXIgZW52aXJvbm1lbnRcclxuICpcclxuICogVGhpcyBhbGxvd3MgYXhpb3MgdG8gcnVuIGluIGEgd2ViIHdvcmtlciwgYW5kIHJlYWN0LW5hdGl2ZS5cclxuICogQm90aCBlbnZpcm9ubWVudHMgc3VwcG9ydCBYTUxIdHRwUmVxdWVzdCwgYnV0IG5vdCBmdWxseSBzdGFuZGFyZCBnbG9iYWxzLlxyXG4gKlxyXG4gKiB3ZWIgd29ya2VyczpcclxuICogIHR5cGVvZiB3aW5kb3cgLT4gdW5kZWZpbmVkXHJcbiAqICB0eXBlb2YgZG9jdW1lbnQgLT4gdW5kZWZpbmVkXHJcbiAqXHJcbiAqIHJlYWN0LW5hdGl2ZTpcclxuICogIG5hdmlnYXRvci5wcm9kdWN0IC0+ICdSZWFjdE5hdGl2ZSdcclxuICovXHJcbmZ1bmN0aW9uIGlzU3RhbmRhcmRCcm93c2VyRW52KCkge1xyXG4gIGlmICh0eXBlb2YgbmF2aWdhdG9yICE9PSAndW5kZWZpbmVkJyAmJiBuYXZpZ2F0b3IucHJvZHVjdCA9PT0gJ1JlYWN0TmF0aXZlJykge1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuICByZXR1cm4gKFxyXG4gICAgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiZcclxuICAgIHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCdcclxuICApO1xyXG59XHJcblxyXG4vKipcclxuICogSXRlcmF0ZSBvdmVyIGFuIEFycmF5IG9yIGFuIE9iamVjdCBpbnZva2luZyBhIGZ1bmN0aW9uIGZvciBlYWNoIGl0ZW0uXHJcbiAqXHJcbiAqIElmIGBvYmpgIGlzIGFuIEFycmF5IGNhbGxiYWNrIHdpbGwgYmUgY2FsbGVkIHBhc3NpbmdcclxuICogdGhlIHZhbHVlLCBpbmRleCwgYW5kIGNvbXBsZXRlIGFycmF5IGZvciBlYWNoIGl0ZW0uXHJcbiAqXHJcbiAqIElmICdvYmonIGlzIGFuIE9iamVjdCBjYWxsYmFjayB3aWxsIGJlIGNhbGxlZCBwYXNzaW5nXHJcbiAqIHRoZSB2YWx1ZSwga2V5LCBhbmQgY29tcGxldGUgb2JqZWN0IGZvciBlYWNoIHByb3BlcnR5LlxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheX0gb2JqIFRoZSBvYmplY3QgdG8gaXRlcmF0ZVxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBUaGUgY2FsbGJhY2sgdG8gaW52b2tlIGZvciBlYWNoIGl0ZW1cclxuICovXHJcbmZ1bmN0aW9uIGZvckVhY2gob2JqLCBmbikge1xyXG4gIC8vIERvbid0IGJvdGhlciBpZiBubyB2YWx1ZSBwcm92aWRlZFxyXG4gIGlmIChvYmogPT09IG51bGwgfHwgdHlwZW9mIG9iaiA9PT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIC8vIEZvcmNlIGFuIGFycmF5IGlmIG5vdCBhbHJlYWR5IHNvbWV0aGluZyBpdGVyYWJsZVxyXG4gIGlmICh0eXBlb2Ygb2JqICE9PSAnb2JqZWN0Jykge1xyXG4gICAgLyplc2xpbnQgbm8tcGFyYW0tcmVhc3NpZ246MCovXHJcbiAgICBvYmogPSBbb2JqXTtcclxuICB9XHJcblxyXG4gIGlmIChpc0FycmF5KG9iaikpIHtcclxuICAgIC8vIEl0ZXJhdGUgb3ZlciBhcnJheSB2YWx1ZXNcclxuICAgIGZvciAodmFyIGkgPSAwLCBsID0gb2JqLmxlbmd0aDsgaSA8IGw7IGkrKykge1xyXG4gICAgICBmbi5jYWxsKG51bGwsIG9ialtpXSwgaSwgb2JqKTtcclxuICAgIH1cclxuICB9IGVsc2Uge1xyXG4gICAgLy8gSXRlcmF0ZSBvdmVyIG9iamVjdCBrZXlzXHJcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XHJcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSB7XHJcbiAgICAgICAgZm4uY2FsbChudWxsLCBvYmpba2V5XSwga2V5LCBvYmopO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogQWNjZXB0cyB2YXJhcmdzIGV4cGVjdGluZyBlYWNoIGFyZ3VtZW50IHRvIGJlIGFuIG9iamVjdCwgdGhlblxyXG4gKiBpbW11dGFibHkgbWVyZ2VzIHRoZSBwcm9wZXJ0aWVzIG9mIGVhY2ggb2JqZWN0IGFuZCByZXR1cm5zIHJlc3VsdC5cclxuICpcclxuICogV2hlbiBtdWx0aXBsZSBvYmplY3RzIGNvbnRhaW4gdGhlIHNhbWUga2V5IHRoZSBsYXRlciBvYmplY3QgaW5cclxuICogdGhlIGFyZ3VtZW50cyBsaXN0IHdpbGwgdGFrZSBwcmVjZWRlbmNlLlxyXG4gKlxyXG4gKiBFeGFtcGxlOlxyXG4gKlxyXG4gKiBgYGBqc1xyXG4gKiB2YXIgcmVzdWx0ID0gbWVyZ2Uoe2ZvbzogMTIzfSwge2ZvbzogNDU2fSk7XHJcbiAqIGNvbnNvbGUubG9nKHJlc3VsdC5mb28pOyAvLyBvdXRwdXRzIDQ1NlxyXG4gKiBgYGBcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IG9iajEgT2JqZWN0IHRvIG1lcmdlXHJcbiAqIEByZXR1cm5zIHtPYmplY3R9IFJlc3VsdCBvZiBhbGwgbWVyZ2UgcHJvcGVydGllc1xyXG4gKi9cclxuZnVuY3Rpb24gbWVyZ2UoLyogb2JqMSwgb2JqMiwgb2JqMywgLi4uICovKSB7XHJcbiAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gIGZ1bmN0aW9uIGFzc2lnblZhbHVlKHZhbCwga2V5KSB7XHJcbiAgICBpZiAodHlwZW9mIHJlc3VsdFtrZXldID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgdmFsID09PSAnb2JqZWN0Jykge1xyXG4gICAgICByZXN1bHRba2V5XSA9IG1lcmdlKHJlc3VsdFtrZXldLCB2YWwpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmVzdWx0W2tleV0gPSB2YWw7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmb3IgKHZhciBpID0gMCwgbCA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcclxuICAgIGZvckVhY2goYXJndW1lbnRzW2ldLCBhc3NpZ25WYWx1ZSk7XHJcbiAgfVxyXG4gIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBFeHRlbmRzIG9iamVjdCBhIGJ5IG11dGFibHkgYWRkaW5nIHRvIGl0IHRoZSBwcm9wZXJ0aWVzIG9mIG9iamVjdCBiLlxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gYSBUaGUgb2JqZWN0IHRvIGJlIGV4dGVuZGVkXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBiIFRoZSBvYmplY3QgdG8gY29weSBwcm9wZXJ0aWVzIGZyb21cclxuICogQHBhcmFtIHtPYmplY3R9IHRoaXNBcmcgVGhlIG9iamVjdCB0byBiaW5kIGZ1bmN0aW9uIHRvXHJcbiAqIEByZXR1cm4ge09iamVjdH0gVGhlIHJlc3VsdGluZyB2YWx1ZSBvZiBvYmplY3QgYVxyXG4gKi9cclxuZnVuY3Rpb24gZXh0ZW5kKGEsIGIsIHRoaXNBcmcpIHtcclxuICBmb3JFYWNoKGIsIGZ1bmN0aW9uIGFzc2lnblZhbHVlKHZhbCwga2V5KSB7XHJcbiAgICBpZiAodGhpc0FyZyAmJiB0eXBlb2YgdmFsID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgIGFba2V5XSA9IGJpbmQodmFsLCB0aGlzQXJnKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGFba2V5XSA9IHZhbDtcclxuICAgIH1cclxuICB9KTtcclxuICByZXR1cm4gYTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgaXNBcnJheTogaXNBcnJheSxcclxuICBpc0FycmF5QnVmZmVyOiBpc0FycmF5QnVmZmVyLFxyXG4gIGlzQnVmZmVyOiBpc0J1ZmZlcixcclxuICBpc0Zvcm1EYXRhOiBpc0Zvcm1EYXRhLFxyXG4gIGlzQXJyYXlCdWZmZXJWaWV3OiBpc0FycmF5QnVmZmVyVmlldyxcclxuICBpc1N0cmluZzogaXNTdHJpbmcsXHJcbiAgaXNOdW1iZXI6IGlzTnVtYmVyLFxyXG4gIGlzT2JqZWN0OiBpc09iamVjdCxcclxuICBpc1VuZGVmaW5lZDogaXNVbmRlZmluZWQsXHJcbiAgaXNEYXRlOiBpc0RhdGUsXHJcbiAgaXNGaWxlOiBpc0ZpbGUsXHJcbiAgaXNCbG9iOiBpc0Jsb2IsXHJcbiAgaXNGdW5jdGlvbjogaXNGdW5jdGlvbixcclxuICBpc1N0cmVhbTogaXNTdHJlYW0sXHJcbiAgaXNVUkxTZWFyY2hQYXJhbXM6IGlzVVJMU2VhcmNoUGFyYW1zLFxyXG4gIGlzU3RhbmRhcmRCcm93c2VyRW52OiBpc1N0YW5kYXJkQnJvd3NlckVudixcclxuICBmb3JFYWNoOiBmb3JFYWNoLFxyXG4gIG1lcmdlOiBtZXJnZSxcclxuICBleHRlbmQ6IGV4dGVuZCxcclxuICB0cmltOiB0cmltXHJcbn07XHJcbiIsIi8qIVxyXG4gKiBEZXRlcm1pbmUgaWYgYW4gb2JqZWN0IGlzIGEgQnVmZmVyXHJcbiAqXHJcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxodHRwczovL2Zlcm9zcy5vcmc+XHJcbiAqIEBsaWNlbnNlICBNSVRcclxuICovXHJcblxyXG4vLyBUaGUgX2lzQnVmZmVyIGNoZWNrIGlzIGZvciBTYWZhcmkgNS03IHN1cHBvcnQsIGJlY2F1c2UgaXQncyBtaXNzaW5nXHJcbi8vIE9iamVjdC5wcm90b3R5cGUuY29uc3RydWN0b3IuIFJlbW92ZSB0aGlzIGV2ZW50dWFsbHlcclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob2JqKSB7XHJcbiAgcmV0dXJuIG9iaiAhPSBudWxsICYmIChpc0J1ZmZlcihvYmopIHx8IGlzU2xvd0J1ZmZlcihvYmopIHx8ICEhb2JqLl9pc0J1ZmZlcilcclxufVxyXG5cclxuZnVuY3Rpb24gaXNCdWZmZXIgKG9iaikge1xyXG4gIHJldHVybiAhIW9iai5jb25zdHJ1Y3RvciAmJiB0eXBlb2Ygb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyID09PSAnZnVuY3Rpb24nICYmIG9iai5jb25zdHJ1Y3Rvci5pc0J1ZmZlcihvYmopXHJcbn1cclxuXHJcbi8vIEZvciBOb2RlIHYwLjEwIHN1cHBvcnQuIFJlbW92ZSB0aGlzIGV2ZW50dWFsbHkuXHJcbmZ1bmN0aW9uIGlzU2xvd0J1ZmZlciAob2JqKSB7XHJcbiAgcmV0dXJuIHR5cGVvZiBvYmoucmVhZEZsb2F0TEUgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIG9iai5zbGljZSA9PT0gJ2Z1bmN0aW9uJyAmJiBpc0J1ZmZlcihvYmouc2xpY2UoMCwgMCkpXHJcbn1cclxuIiwiLyoqVGhpcyBjbGFzcyBpcyBhdXRvbWF0aWNhbGx5IGdlbmVyYXRlZCBieSBMYXlhQWlySURFLCBwbGVhc2UgZG8gbm90IG1ha2UgYW55IG1vZGlmaWNhdGlvbnMuICovXHJcbmltcG9ydCBBc3Npc3RhbnQgZnJvbSBcIi4vc2NyaXB0L0Fzc2lzdGFudFwiXG5pbXBvcnQgUGFnZVNjcmlwdCBmcm9tIFwiLi9wdWJsaWNTY3JpcHQvUGFnZVNjcmlwdFwiXG5pbXBvcnQgU2NyZWVuIGZyb20gXCIuL3B1YmxpY1NjcmlwdC9TY3JlZW5cIlxuaW1wb3J0IHRyZW5kTGlzdCBmcm9tIFwiLi90ZW1wbGF0ZS90cmVuZExpc3RcIlxuaW1wb3J0IHByZXZpb3VzUmVjb3JkcyBmcm9tIFwiLi90ZW1wbGF0ZS9wcmV2aW91c1JlY29yZHNcIlxuaW1wb3J0IENhcmQgZnJvbSBcIi4vc2NyaXB0L0NhcmRcIlxuaW1wb3J0IGdyYW5kUHJpeCBmcm9tIFwiLi9zY3JpcHQvZ3JhbmRQcml4XCJcbmltcG9ydCBQYWdlTmF2U2NyaXB0IGZyb20gXCIuL3B1YmxpY1NjcmlwdC9QYWdlTmF2U2NyaXB0XCJcbmltcG9ydCBwcml4TGlzdCBmcm9tIFwiLi90ZW1wbGF0ZS9wcml4TGlzdFwiXG5pbXBvcnQgR3Vlc3NpbmcgZnJvbSBcIi4vc2NyaXB0L0d1ZXNzaW5nXCJcbmltcG9ydCBudW1iZXJMaXN0RG9tU2NyaXB0IGZyb20gXCIuL3RlbXBsYXRlL251bWJlckxpc3REb21TY3JpcHRcIlxuaW1wb3J0IEhvbWUgZnJvbSBcIi4vc2NyaXB0L0hvbWVcIlxuaW1wb3J0IHByaUhpc3RvcnlTY2VuZSBmcm9tIFwiLi9zY3JpcHQvcHJpSGlzdG9yeVNjZW5lXCJcbmltcG9ydCBwcmlIaXN0b3J5IGZyb20gXCIuL3RlbXBsYXRlL3ByaUhpc3RvcnlcIlxuaW1wb3J0IFJlY29yZCBmcm9tIFwiLi9zY3JpcHQvUmVjb3JkXCJcbmltcG9ydCBqb2luUmVjb3JkcyBmcm9tIFwiLi90ZW1wbGF0ZS9qb2luUmVjb3Jkc1wiXG5pbXBvcnQgc2hvcnRMaXN0ZWQgZnJvbSBcIi4vc2NyaXB0L3Nob3J0TGlzdGVkXCJcbmltcG9ydCBzaG9ydExpc3RlZExpc3QgZnJvbSBcIi4vdGVtcGxhdGUvc2hvcnRMaXN0ZWRMaXN0XCJcbmltcG9ydCBwc3dJbnB1dCBmcm9tIFwiLi90ZW1wbGF0ZS9wc3dJbnB1dFwiXG5pbXBvcnQgcmFua2luZ0xpc3QgZnJvbSBcIi4vdGVtcGxhdGUvcmFua2luZ0xpc3RcIlxuaW1wb3J0IHJlY2hhcmdlRGlhbG9nIGZyb20gXCIuL3RlbXBsYXRlL3JlY2hhcmdlRGlhbG9nXCJcbmltcG9ydCByb2NrZXREaWFsb2cgZnJvbSBcIi4vdmlldy9yb2NrZXREaWFsb2dcIlxuaW1wb3J0IHRpcERpYWxvZyBmcm9tIFwiLi90ZW1wbGF0ZS90aXBEaWFsb2dcIlxuaW1wb3J0IHdpbm5pbmdMaXN0IGZyb20gXCIuL3RlbXBsYXRlL3dpbm5pbmdMaXN0XCJcbmltcG9ydCB3aW5uaW5nIGZyb20gXCIuL3NjcmlwdC93aW5uaW5nXCJcclxuLypcclxuKiDmuLjmiI/liJ3lp4vljJbphY3nva47XHJcbiovXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEdhbWVDb25maWd7XHJcbiAgICBzdGF0aWMgd2lkdGg6bnVtYmVyPTc1MDtcclxuICAgIHN0YXRpYyBoZWlnaHQ6bnVtYmVyPTEzMzQ7XHJcbiAgICBzdGF0aWMgc2NhbGVNb2RlOnN0cmluZz1cImZpeGVkd2lkdGhcIjtcclxuICAgIHN0YXRpYyBzY3JlZW5Nb2RlOnN0cmluZz1cIm5vbmVcIjtcclxuICAgIHN0YXRpYyBhbGlnblY6c3RyaW5nPVwidG9wXCI7XHJcbiAgICBzdGF0aWMgYWxpZ25IOnN0cmluZz1cImxlZnRcIjtcclxuICAgIHN0YXRpYyBzdGFydFNjZW5lOmFueT1cImhvbWUuc2NlbmVcIjtcclxuICAgIHN0YXRpYyBzY2VuZVJvb3Q6c3RyaW5nPVwiXCI7XHJcbiAgICBzdGF0aWMgZGVidWc6Ym9vbGVhbj1mYWxzZTtcclxuICAgIHN0YXRpYyBzdGF0OmJvb2xlYW49ZmFsc2U7XHJcbiAgICBzdGF0aWMgcGh5c2ljc0RlYnVnOmJvb2xlYW49ZmFsc2U7XHJcbiAgICBzdGF0aWMgZXhwb3J0U2NlbmVUb0pzb246Ym9vbGVhbj10cnVlO1xyXG4gICAgY29uc3RydWN0b3IoKXt9XHJcbiAgICBzdGF0aWMgaW5pdCgpe1xyXG4gICAgICAgIHZhciByZWc6IEZ1bmN0aW9uID0gTGF5YS5DbGFzc1V0aWxzLnJlZ0NsYXNzO1xyXG4gICAgICAgIHJlZyhcInNjcmlwdC9Bc3Npc3RhbnQudHNcIixBc3Npc3RhbnQpO1xuICAgICAgICByZWcoXCJwdWJsaWNTY3JpcHQvUGFnZVNjcmlwdC50c1wiLFBhZ2VTY3JpcHQpO1xuICAgICAgICByZWcoXCJwdWJsaWNTY3JpcHQvU2NyZWVuLnRzXCIsU2NyZWVuKTtcbiAgICAgICAgcmVnKFwidGVtcGxhdGUvdHJlbmRMaXN0LnRzXCIsdHJlbmRMaXN0KTtcbiAgICAgICAgcmVnKFwidGVtcGxhdGUvcHJldmlvdXNSZWNvcmRzLnRzXCIscHJldmlvdXNSZWNvcmRzKTtcbiAgICAgICAgcmVnKFwic2NyaXB0L0NhcmQudHNcIixDYXJkKTtcbiAgICAgICAgcmVnKFwic2NyaXB0L2dyYW5kUHJpeC50c1wiLGdyYW5kUHJpeCk7XG4gICAgICAgIHJlZyhcInB1YmxpY1NjcmlwdC9QYWdlTmF2U2NyaXB0LnRzXCIsUGFnZU5hdlNjcmlwdCk7XG4gICAgICAgIHJlZyhcInRlbXBsYXRlL3ByaXhMaXN0LnRzXCIscHJpeExpc3QpO1xuICAgICAgICByZWcoXCJzY3JpcHQvR3Vlc3NpbmcudHNcIixHdWVzc2luZyk7XG4gICAgICAgIHJlZyhcInRlbXBsYXRlL251bWJlckxpc3REb21TY3JpcHQudHNcIixudW1iZXJMaXN0RG9tU2NyaXB0KTtcbiAgICAgICAgcmVnKFwic2NyaXB0L0hvbWUudHNcIixIb21lKTtcbiAgICAgICAgcmVnKFwic2NyaXB0L3ByaUhpc3RvcnlTY2VuZS50c1wiLHByaUhpc3RvcnlTY2VuZSk7XG4gICAgICAgIHJlZyhcInRlbXBsYXRlL3ByaUhpc3RvcnkudHNcIixwcmlIaXN0b3J5KTtcbiAgICAgICAgcmVnKFwic2NyaXB0L1JlY29yZC50c1wiLFJlY29yZCk7XG4gICAgICAgIHJlZyhcInRlbXBsYXRlL2pvaW5SZWNvcmRzLnRzXCIsam9pblJlY29yZHMpO1xuICAgICAgICByZWcoXCJzY3JpcHQvc2hvcnRMaXN0ZWQudHNcIixzaG9ydExpc3RlZCk7XG4gICAgICAgIHJlZyhcInRlbXBsYXRlL3Nob3J0TGlzdGVkTGlzdC50c1wiLHNob3J0TGlzdGVkTGlzdCk7XG4gICAgICAgIHJlZyhcInRlbXBsYXRlL3Bzd0lucHV0LnRzXCIscHN3SW5wdXQpO1xuICAgICAgICByZWcoXCJ0ZW1wbGF0ZS9yYW5raW5nTGlzdC50c1wiLHJhbmtpbmdMaXN0KTtcbiAgICAgICAgcmVnKFwidGVtcGxhdGUvcmVjaGFyZ2VEaWFsb2cudHNcIixyZWNoYXJnZURpYWxvZyk7XG4gICAgICAgIHJlZyhcInZpZXcvcm9ja2V0RGlhbG9nLnRzXCIscm9ja2V0RGlhbG9nKTtcbiAgICAgICAgcmVnKFwidGVtcGxhdGUvdGlwRGlhbG9nLnRzXCIsdGlwRGlhbG9nKTtcbiAgICAgICAgcmVnKFwidGVtcGxhdGUvd2lubmluZ0xpc3QudHNcIix3aW5uaW5nTGlzdCk7XG4gICAgICAgIHJlZyhcInNjcmlwdC93aW5uaW5nLnRzXCIsd2lubmluZyk7XHJcbiAgICB9XHJcbn1cclxuR2FtZUNvbmZpZy5pbml0KCk7IiwiaW1wb3J0IEdhbWVDb25maWcgZnJvbSBcIi4vR2FtZUNvbmZpZ1wiO1xyXG5pbXBvcnQgUm9ja2V0RGlhbG9nIGZyb20gXCIuL3ZpZXcvcm9ja2V0RGlhbG9nXCI7XHJcbmltcG9ydCBsb2FkaW5nUmVzTGlzdCBmcm9tIFwiLi9sb2FkaW5nUmVzTGlzdFwiO1xyXG5cclxuY2xhc3MgTWFpbiB7XHJcblx0Y29uc3RydWN0b3IoKSB7XHJcblx0XHQvL+agueaNrklEReiuvue9ruWIneWni+WMluW8leaTjlx0XHRcclxuXHRcdGlmICh3aW5kb3dbXCJMYXlhM0RcIl0pIExheWEzRC5pbml0KEdhbWVDb25maWcud2lkdGgsIEdhbWVDb25maWcuaGVpZ2h0KTtcclxuXHRcdGVsc2UgTGF5YS5pbml0KEdhbWVDb25maWcud2lkdGgsIEdhbWVDb25maWcuaGVpZ2h0LCBMYXlhW1wiV2ViR0xcIl0pO1xyXG5cdFx0TGF5YVtcIlBoeXNpY3NcIl0gJiYgTGF5YVtcIlBoeXNpY3NcIl0uZW5hYmxlKCk7XHJcblx0XHRMYXlhW1wiRGVidWdQYW5lbFwiXSAmJiBMYXlhW1wiRGVidWdQYW5lbFwiXS5lbmFibGUoKTtcclxuXHRcdExheWEuc3RhZ2Uuc2NhbGVNb2RlID0gR2FtZUNvbmZpZy5zY2FsZU1vZGU7XHJcblx0XHRMYXlhLnN0YWdlLnNjcmVlbk1vZGUgPSBHYW1lQ29uZmlnLnNjcmVlbk1vZGU7XHJcblx0XHQvL+WFvOWuueW+ruS/oeS4jeaUr+aMgeWKoOi9vXNjZW5l5ZCO57yA5Zy65pmvXHJcblx0XHRMYXlhLlVSTC5leHBvcnRTY2VuZVRvSnNvbiA9IEdhbWVDb25maWcuZXhwb3J0U2NlbmVUb0pzb247XHJcblxyXG5cdFx0Ly/miZPlvIDosIPor5XpnaLmnb/vvIjpgJrov4dJREXorr7nva7osIPor5XmqKHlvI/vvIzmiJbogIV1cmzlnLDlnYDlop7liqBkZWJ1Zz10cnVl5Y+C5pWw77yM5Z2H5Y+v5omT5byA6LCD6K+V6Z2i5p2/77yJXHJcblx0XHRpZiAoR2FtZUNvbmZpZy5kZWJ1ZyB8fCBMYXlhLlV0aWxzLmdldFF1ZXJ5U3RyaW5nKFwiZGVidWdcIikgPT0gXCJ0cnVlXCIpIExheWEuZW5hYmxlRGVidWdQYW5lbCgpO1xyXG5cdFx0aWYgKEdhbWVDb25maWcucGh5c2ljc0RlYnVnICYmIExheWFbXCJQaHlzaWNzRGVidWdEcmF3XCJdKSBMYXlhW1wiUGh5c2ljc0RlYnVnRHJhd1wiXS5lbmFibGUoKTtcclxuXHRcdGlmIChHYW1lQ29uZmlnLnN0YXQpIExheWEuU3RhdC5zaG93KCk7XHJcblx0XHRMYXlhLmFsZXJ0R2xvYmFsRXJyb3IgPSB0cnVlO1xyXG5cclxuXHRcdC8v6Ieq5a6a5LmJ5LqL5Lu2XHJcblx0XHRSb2NrZXREaWFsb2cuaW5pdCgpOyAvL+eBq+eureW8gOWlluaViOaenFxyXG5cclxuXHRcdC8v5r+A5rS76LWE5rqQ54mI5pys5o6n5Yi277yMdmVyc2lvbi5qc29u55SxSURF5Y+R5biD5Yqf6IO96Ieq5Yqo55Sf5oiQ77yM5aaC5p6c5rKh5pyJ5Lmf5LiN5b2x5ZON5ZCO57ut5rWB56iLXHJcblx0XHRMYXlhLlJlc291cmNlVmVyc2lvbi5lbmFibGUoXCJ2ZXJzaW9uLmpzb25cIiwgTGF5YS5IYW5kbGVyLmNyZWF0ZSh0aGlzLCB0aGlzLm9uVmVyc2lvbkxvYWRlZCksIExheWEuUmVzb3VyY2VWZXJzaW9uLkZJTEVOQU1FX1ZFUlNJT04pO1xyXG5cdH1cclxuXHJcblx0b25WZXJzaW9uTG9hZGVkKCk6IHZvaWQge1xyXG5cdFx0Ly/mv4DmtLvlpKflsI/lm77mmKDlsITvvIzliqDovb3lsI/lm77nmoTml7blgJnvvIzlpoLmnpzlj5HnjrDlsI/lm77lnKjlpKflm77lkIjpm4bph4zpnaLvvIzliJnkvJjlhYjliqDovb3lpKflm77lkIjpm4bvvIzogIzkuI3mmK/lsI/lm75cclxuXHRcdExheWEuQXRsYXNJbmZvTWFuYWdlci5lbmFibGUoXCJmaWxlY29uZmlnLmpzb25cIiwgTGF5YS5IYW5kbGVyLmNyZWF0ZSh0aGlzLCB0aGlzLm9uQ29uZmlnTG9hZGVkKSk7XHJcblx0fVxyXG5cclxuXHRvbkNvbmZpZ0xvYWRlZCgpOiB2b2lkIHtcclxuXHRcdC8v6aKE5Yqg6L29XHJcbsKgwqDCoMKgwqDCoMKgwqBMYXlhLmxvYWRlci5sb2FkKGxvYWRpbmdSZXNMaXN0LCBMYXlhLkhhbmRsZXIuY3JlYXRlKHRoaXMsIHRoaXMub25HYW1lUmVzTG9hZGVkKSk7XHJcblx0fVxyXG5cdG9uR2FtZVJlc0xvYWRlZCgpOnZvaWQge1xyXG5cdFx0Ly/liqDovb1JREXmjIflrprnmoTlnLrmma9cclxuXHRcdEdhbWVDb25maWcuc3RhcnRTY2VuZSAmJiBMYXlhLlNjZW5lLm9wZW4oR2FtZUNvbmZpZy5zdGFydFNjZW5lKTtcclxuXHR9XHJcbn1cclxuLy/mv4DmtLvlkK/liqjnsbtcclxubmV3IE1haW4oKTtcclxuIiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTIwIDE0OjExOjI2XHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTIwIDE0OjExOjI2XHJcbiAqIEBkZXNjIOaVsOaNrumAmuS/oeWPiuS/neWtmOaOpeWPo1xyXG4gKi9cclxuXHJcbmV4cG9ydCBjbGFzcyBHYW1lTW9kZWwgZXh0ZW5kcyBMYXlhLkV2ZW50RGlzcGF0Y2hlciB7XHJcbiAgICBwcml2YXRlIHN0YXRpYyBfZ2FtZU1vZGVsSW5zdGFuY2U6IEdhbWVNb2RlbDtcclxuXHJcbiAgICBzdGF0aWMgZ2V0SW5zdGFuY2UoKTogR2FtZU1vZGVsIHtcclxuICAgICAgICBpZiAoIXRoaXMuX2dhbWVNb2RlbEluc3RhbmNlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2dhbWVNb2RlbEluc3RhbmNlID0gbmV3IEdhbWVNb2RlbCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdGhpcy5fZ2FtZU1vZGVsSW5zdGFuY2U7XHJcbiAgICB9XHJcblxyXG4gICAgLyoq5L+d5a2Y55So5oi35L+h5oGvICovXHJcbiAgICB1c2VySW5mbzpvYmplY3QgPSB7fTsgLy/nlKjmiLfkv6Hmga9cclxuICAgIHNldFVzZXJJbmZvKHVzZXJJbmZvOm9iamVjdCl7XHJcbiAgICAgICAgdGhpcy51c2VySW5mbyA9IHVzZXJJbmZvO1xyXG4gICAgICAgIHRoaXMuZXZlbnQoJ2dldFVzZXJJbmZvJyx0aGlzLnVzZXJJbmZvKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKuS/neWtmOiiq+i0reS5sOWPt+eggSAqL1xyXG4gICAgYnV5R29vZHNBcnI6YW55ID0gW107IC8v6KKr6LSt5Lmw5Y+356CBXHJcbiAgICBzZXRHb29kc0Fycihnb29kc0FycjphbnkpIHtcclxuICAgICAgICB0aGlzLmJ1eUdvb2RzQXJyID0gZ29vZHNBcnI7XHJcbiAgICAgICAgdGhpcy5ldmVudCgnZ2V0YnV5R29vZHNBcnInLFt0aGlzLmJ1eUdvb2RzQXJyXSlcclxuICAgIH1cclxuXHJcbiAgICAvKirkv53lrZjngavnrq3mlbDmja4gKi9cclxuICAgIHJvY2tldERhdGE6T2JqZWN0ID0ge307XHJcbiAgICBzZXRSb2NrZXREYXRhKGRhdGE6b2JqZWN0KXtcclxuICAgICAgICB0aGlzLnJvY2tldERhdGEgPSBkYXRhO1xyXG4gICAgICAgIHRoaXMuZXZlbnQoJ2dldFJvY2tldERhdGEnLHRoaXMucm9ja2V0RGF0YSlcclxuICAgIH1cclxuXHJcbiAgICAvKirmmK/lkKblvIDlpZbkuoYgKi9cclxuICAgIGlzVG9nZ2xlKHN0YXR1czpib29sZWFuKXtcclxuICAgICAgICB0aGlzLmV2ZW50KCdpc1RvZ2dsZScsc3RhdHVzKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKumAmuefpeS4reWlliAqL1xyXG4gICAgbm90aWNlRnVuYyhzdGF0dXM6Ym9vbGVhbil7XHJcbiAgICAgICAgdGhpcy5ldmVudCgnZ2V0Tm90aWNlJyxzdGF0dXMpXHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qKueBq+eureWkp+WlluaOkuihjOWQjeWNlSAqL1xyXG4gICAgcm9ja2V0UmFua2luZzpvYmplY3RbXSA9IFtdO1xyXG4gICAgc2V0Um9ja2V0UmFua2luZyhkYXRhOm9iamVjdFtdKXtcclxuICAgICAgICB0aGlzLnJvY2tldFJhbmtpbmcgPSBkYXRhO1xyXG4gICAgICAgIHRoaXMuZXZlbnQoJ2dldFJvY2tldFJhbmtpbmcnLHRoaXMucm9ja2V0UmFua2luZylcclxuICAgIH1cclxufSIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0yMCAxNToxNTowOFxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yMCAxNToxNTowOFxyXG4gKiBAZGVzYyBhcGnmjqXlj6Pnu5/kuIDlsIHoo4XlpITnkIZcclxuICovXHJcblxyXG5pbXBvcnQgeyBnZXQsIHBvc3QgfSBmcm9tICcuL2h0dHAnO1xyXG5pbXBvcnQgeyBHYW1lTW9kZWwgfSBmcm9tICcuL0dhbWVNb2RlbCc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCB7XHJcbiAgICAvKirojrflj5bnlKjmiLfkv6Hmga8gKi9cclxuICAgIGdldFVzZXJJbmZvKCkge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGdldCgnL3VzZXIvZ2V0SW5mbycsIHt9KS50aGVuKChyZXM6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOS/neWtmOeUqOaIt+S/oeaBr1xyXG4gICAgICAgICAgICAgICAgICAgIEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLnNldFVzZXJJbmZvKHJlcy51c2VySW5mbylcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlcylcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlcylcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9KVxyXG4gICAgfSxcclxuXHJcbiAgICAvKirojrflj5bku4rml6XlpKflpZbmsaAgKi9cclxuICAgIGdldFJhbmtUb2RheSgpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBnZXQoJy9yYW5rL3RvZGF5Jywge30pLnRoZW4oKHJlczogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXJlcy5jb2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXMpXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXMpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgIH0sXHJcbiAgICAvKirojrflj5blpKflpZbmsaDljoblj7LorrDlvZVcclxuICAgICAqIEBwYXJhbSBjb3VudFRpbWUgW+mAieWhq10g5pel5pyfXHJcbiAgICAgKi9cclxuICAgIGdldFJhbmtIaXN0b3J5KGNvdW50VGltZT86c3RyaW5nKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBnZXQoJy9yYW5rL2hpc3RvcnknLCB7Y291bnRUaW1lfSkudGhlbigocmVzOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICghcmVzLmNvZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlcylcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlcylcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9KVxyXG4gICAgfSxcclxuICAgIC8qKuiOt+WPlummlumhteWVhuWTgeWIl+ihqCAqL1xyXG4gICAgZ2V0R29vZHNMaXN0KCkge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGdldCgnL2dvb2RzL2luZGV4Jywge30pLnRoZW4oKHJlczogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXJlcy5jb2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXMpXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXMpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgIH0sXHJcblxyXG4gICAgLyoq6I635Y+W5ZWG5ZOB6K+m5oOFXHJcbiAgICAgKiBAcGFyYW0gZ29vZHNJZCDllYblk4FpZFxyXG4gICAgICovXHJcbiAgICBnZXRHb29kc0RldGFpbHMoZ29vZHNJZDpzdHJpbmcpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpID0+IHtcclxuICAgICAgICAgICAgZ2V0KCcvZ29vZHMvZ2V0JywgeyBnb29kc0lkIH0pLnRoZW4oKHJlczogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXJlcy5jb2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXMpXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXMpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgIH0sXHJcblxyXG4gICAgLyoq6I635Y+W5Y+C5LiO6K6w5b2VXHJcbiAgICAgKiBAcGFyYW0gcGFnZSBb6YCJ5aGrXSDpobXnoIExXHJcbiAgICAgKiBAcGFyYW0gcGFnZVNpemUgIFvpgInloatdIOWIhumhteaVsCDpu5jorqQyMFxyXG4gICAgICovXHJcbiAgICBnZXRNeU9yZGVycyhwYWdlOm51bWJlciA9IDEscGFnZVNpemU6bnVtYmVyID0gMjApe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpID0+IHtcclxuICAgICAgICAgICAgZ2V0KCcvb3JkZXIvbXlPcmRlcnMnLHtwYWdlLHBhZ2VTaXplfSkudGhlbigocmVzOmFueSk9PntcclxuICAgICAgICAgICAgICAgIGlmICghcmVzLmNvZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlcylcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlcylcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9KVxyXG4gICAgfSxcclxuICAgIFxyXG4gICAgLyoq6I635Y+W5b6A5pyf6K6w5b2VXHJcbiAgICAgKiBAcGFyYW0gcGFnZSBb6YCJ5aGrXSDpobXnoIExXHJcbiAgICAgKiBAcGFyYW0gcGFnZVNpemUgIFvpgInloatdIOWIhumhteaVsCDpu5jorqQyMFxyXG4gICAgICogQHBhcmFtIGNvdW50VGltZSBb6YCJ5aGrXSDmn6Xor6Lml7bpl7RcclxuICAgICAqIEBwYXJhbSBzZWFyY2hLZXkgW+mAieWhq10g5p+l6K+i5pyf5Y+3XHJcbiAgICAgKi9cclxuICAgIGdldEdvb2RzSGlzdG9yeShwYWdlOm51bWJlciA9IDEscGFnZVNpemU6bnVtYmVyID0gMjAsY291bnRUaW1lPzpzdHJpbmcsc2VhcmNoS2V5PzpzdHJpbmcpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpID0+IHtcclxuICAgICAgICAgICAgZ2V0KCcvZ29vZHMvaGlzdG9yeScse3BhZ2UscGFnZVNpemUsY291bnRUaW1lLHNlYXJjaEtleX0pLnRoZW4oKHJlczphbnkpPT57XHJcbiAgICAgICAgICAgICAgICBpZiAoIXJlcy5jb2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXMpXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXMpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgIH0sXHJcblxyXG4gICAgLyoq6I635Y+W5ZWG5ZOB57G75Z6LICovXHJcbiAgICBnZXRHb29kc0NhdGVMaXN0KCl7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcclxuICAgICAgICAgICAgZ2V0KCcvZ29vZHMvY2F0ZUxpc3QnLHt9KS50aGVuKChyZXM6YW55KT0+e1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9LFxyXG5cclxuICAgIC8qKuiOt+WPlui1sOWKv1xyXG4gICAgICogQHBhcmFtIGdvb2RzVHlwZSDllYblk4HnsbvlnotcclxuICAgICAqIEBwYXJhbSBwYWdlIFvpgInloatdIOmhteeggTFcclxuICAgICAqIEBwYXJhbSBwYWdlU2l6ZSBb6YCJ5aGrXSDliIbpobXmlbAg6buY6K6kMjBcclxuICAgICAqL1xyXG4gICAgZ2V0R29vZHNUcmVuZChnb29kc1R5cGU6c3RyaW5nLHBhZ2U6bnVtYmVyID0gMSxwYWdlU2l6ZTpudW1iZXIgPSAyMCl7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcclxuICAgICAgICAgICAgZ2V0KCcvZ29vZHMvdHJlbmQnLHtnb29kc1R5cGUscGFnZSxwYWdlU2l6ZX0pLnRoZW4oKHJlczphbnkpPT57XHJcbiAgICAgICAgICAgICAgICBpZiAoIXJlcy5jb2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXMpXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXMpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgIH0sXHJcblxyXG4gICAgLyoq6I635Y+W5Zac5LuO5aSp6ZmN5Lit5aWW5ZCN5Y2VXHJcbiAgICAgKiBAcGFyYW0gcGFnZSBb6YCJ5aGrXSDpobXnoIExXHJcbiAgICAgKiBAcGFyYW0gcGFnZVNpemUgIFvpgInloatdIOWIhumhteaVsCDpu5jorqQyMFxyXG4gICAgICovXHJcbiAgICBnZXRYY3RqTGlzdChwYWdlOm51bWJlciA9IDEscGFnZVNpemU6bnVtYmVyID0gMjApe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpID0+IHtcclxuICAgICAgICAgICAgZ2V0KCcvWGN0ai9ib251c0xpc3RzJyx7cGFnZSxwYWdlU2l6ZX0pLnRoZW4oKHJlczphbnkpPT57XHJcbiAgICAgICAgICAgICAgICBpZiAoIXJlcy5jb2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXMpXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXMpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgIH0sXHJcbiAgICBcclxuICAgIC8qKuiOt+WPluWFpeWbtOWQjeWNlVxyXG4gICAgICogQHBhcmFtIHBhZ2UgW+mAieWhq10g6aG156CBMVxyXG4gICAgICogQHBhcmFtIHBhZ2VTaXplICBb6YCJ5aGrXSDliIbpobXmlbAg6buY6K6kMjBcclxuICAgICAqIEBwYXJhbSBkYXRlIFvpgInloatdIOaXtumXtFxyXG4gICAgICovXHJcbiAgICBnZXRTaG9ydExpc3RlZChwYWdlOm51bWJlciA9IDEscGFnZVNpemU6bnVtYmVyID0gMjAsZGF0ZT86c3RyaW5nKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGdldCgnL1hjdGovc2hvcnRMaXN0ZWQnLHtwYWdlLHBhZ2VTaXplLGRhdGV9KS50aGVuKChyZXM6YW55KT0+e1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9LFxyXG5cclxuICAgIC8qKui0reS5sFxyXG4gICAgICogQHBhcmFtIHBlcmlvZCDmnJ/lj7dcclxuICAgICAqIEBwYXJhbSBjb2RlTGlzdCDmiYDpgInlj7fnoIFcclxuICAgICAqIEBwYXJhbSBleGNoYW5nZVB3ZCDkuqTmmJPlr4bnoIFcclxuICAgICAqL1xyXG4gICAgcG9zdFRyYWRlQnV5KHBlcmlvZDpzdHJpbmcsY29kZUxpc3Q6c3RyaW5nLGV4Y2hhbmdlUHdkOnN0cmluZyl7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBwb3N0KCcvdHJhZGUvYnV5JywgeyBwZXJpb2QsY29kZUxpc3QsZXhjaGFuZ2VQd2QgfSkudGhlbigocmVzOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICghcmVzLmNvZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmdldFVzZXJJbmZvKClcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlcylcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlcylcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9KVxyXG4gICAgfSxcclxufSIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0NTowNlxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0NTowNlxyXG4gKiBAZGVzYyBheGlvc+e9kee7nOivt+axguWwgeijhVxyXG4gKi9cclxuaW1wb3J0IGF4aW9zIGZyb20gXCJheGlvc1wiO1xyXG5cclxuYXhpb3MuZGVmYXVsdHMudGltZW91dCA9IDEwMDAwO1xyXG5heGlvcy5kZWZhdWx0cy5oZWFkZXJzLnBvc3RbJ0NvbnRlbnQtVHlwZSddID0gJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCc7XHJcbmF4aW9zLmRlZmF1bHRzLndpdGhDcmVkZW50aWFscyA9IHRydWU7ICAvL+ivt+axguaQuuW4pmNvb2tpZVxyXG4vLyBheGlvcy5kZWZhdWx0cy5jcm9zc0RvbWFpbiA9IHRydWU7ICAvL+ivt+axguaQuuW4pumineWkluaVsOaNrijkuI3ljIXlkKtjb29raWUpXHJcblxyXG5jb25zdCBkb21haW4gPSBkb2N1bWVudC5kb21haW47XHJcbmlmIChkb21haW4uaW5kZXhPZigndC1jZW50ZXInKSA+PSAwIHx8IGRvbWFpbiA9PT0gJ2xvY2FsaG9zdCcpIHtcclxuICBheGlvcy5kZWZhdWx0cy5iYXNlVVJMID0gJ2h0dHBzOi8vdC1hcGkueHloai5pby92MS93L3poLydcclxufSBlbHNlIHtcclxuICBheGlvcy5kZWZhdWx0cy5iYXNlVVJMID0gJ2h0dHBzOi8vZ2FtZS54eWhqLmlvL3YxL3cvemgnXHJcbn1cclxuXHJcbi8qKuWwhnBvc3TmlbDmja7ovazkuLpmb3JtRGF0YeagvOW8jyAqL1xyXG5mdW5jdGlvbiBmb3JtRGF0YUZ1bmMocGFyYW1zOk9iamVjdCkge1xyXG4gIGNvbnN0IGZvcm0gPSBuZXcgRm9ybURhdGEoKTtcclxuICBmb3IgKGNvbnN0IGtleSBpbiBwYXJhbXMpIHtcclxuICAgIGZvcm0uYXBwZW5kKGtleSxwYXJhbXNba2V5XSk7XHJcbiAgfVxyXG4gIHJldHVybiBmb3JtXHJcbn1cclxuXHJcbi8qKua4uOaIj+W5s+WPsOaOpeWPoyAqL1xyXG5jb25zdCBnYW1lQ2VudGVyID0gWycvdXNlci9sb2dpbicsJy91c2VyL2dldEluZm8nXVxyXG5cclxuLy9odHRwIHJlcXVlc3Qg5oum5oiq5ZmoXHJcbmF4aW9zLmludGVyY2VwdG9ycy5yZXF1ZXN0LnVzZShcclxuICBjb25maWcgPT4ge1xyXG4gICAgLy/orr7nva5BSG9zdFxyXG4gICAgaWYgKGNvbmZpZy51cmwuaW5kZXhPZignL3VzZXIvJykgPj0gMCApIHtcclxuICAgICAgY29uZmlnLmhlYWRlcnNbJ0FIb3N0J10gPSAnZ2FtZUNlbnRlcidcclxuICAgIH1lbHNle1xyXG4gICAgICBjb25maWcuaGVhZGVyc1snQUhvc3QnXSA9ICdzdGFyUm9ja2V0JztcclxuICAgIH1cclxuXHJcbiAgICBpZiAoY29uZmlnLm1ldGhvZCA9PSAncG9zdCcpIHtcclxuICAgICAgY29uZmlnLmRhdGEgPSBmb3JtRGF0YUZ1bmMoe1xyXG4gICAgICAgIC4uLmNvbmZpZy5kYXRhXHJcbiAgICAgIH0pXHJcbiAgICB9ZWxzZSBpZihjb25maWcubWV0aG9kID09ICdnZXQnKXtcclxuICAgICAgY29uZmlnLnBhcmFtcyA9IHtcclxuICAgICAgICAuLi5jb25maWcucGFyYW1zLFxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gY29uZmlnO1xyXG4gIH0sXHJcbiAgZXJyb3IgPT4ge1xyXG4gICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGVycm9yKTtcclxuICB9XHJcbik7XHJcbi8vaHR0cCByZXNwb25zZSDmi6bmiKrlmahcclxuYXhpb3MuaW50ZXJjZXB0b3JzLnJlc3BvbnNlLnVzZShcclxuICByZXNwb25zZSA9PiB7XHJcbiAgICBpZiAoIXJlc3BvbnNlLmRhdGEuc3VjY2Vzcykge1xyXG4gICAgICAvL+mUmeivr+WkhOeQhlxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJlc3BvbnNlO1xyXG4gIH0sXHJcbiAgZXJyb3IgPT4ge1xyXG4gICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGVycm9yKTtcclxuICB9XHJcbik7XHJcblxyXG4vKipcclxuICog5bCB6KOFZ2V05pa55rOVXHJcbiAqIEBwYXJhbSB1cmxcclxuICogQHBhcmFtIGRhdGFcclxuICogQHJldHVybnMge1Byb21pc2V9XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0KHVybDpzdHJpbmcsIHBhcmFtczpPYmplY3QpIHtcclxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgYXhpb3MuZ2V0KHVybCwgeyBwYXJhbXMgfSkudGhlbihyZXNwb25zZSA9PiB7XHJcbiAgICAgIGlmICghcmVzcG9uc2UuZGF0YS5zdWNjZXNzKSB7XHJcbiAgICAgICAgcmVzb2x2ZShyZXNwb25zZS5kYXRhLmVycm9yKTtcclxuICAgICAgfWVsc2Uge1xyXG4gICAgICAgIHJlc29sdmUocmVzcG9uc2UuZGF0YS5wYXlsb2FkKTtcclxuICAgICAgfVxyXG4gICAgfSkuY2F0Y2goZXJyID0+IHtcclxuICAgICAgcmVqZWN0KGVycik7XHJcbiAgICB9KTtcclxuICB9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIOWwgeijhXBvc3Tor7fmsYJcclxuICogQHBhcmFtIHVybFxyXG4gKiBAcGFyYW0gZGF0YVxyXG4gKiBAcmV0dXJucyB7UHJvbWlzZX1cclxuICovXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcG9zdCh1cmw6c3RyaW5nLCBkYXRhOk9iamVjdCkge1xyXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICBheGlvcy5wb3N0KHVybCwgZGF0YSkudGhlbihcclxuICAgICAgcmVzcG9uc2UgPT4ge1xyXG4gICAgICAgIGlmICghcmVzcG9uc2UuZGF0YS5zdWNjZXNzKSB7XHJcbiAgICAgICAgICByZXNvbHZlKHJlc3BvbnNlLmRhdGEuZXJyb3IpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICByZXNvbHZlKHJlc3BvbnNlLmRhdGEucGF5bG9hZCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG4gICAgICBlcnIgPT4ge1xyXG4gICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICB9XHJcbiAgICApO1xyXG4gIH0pO1xyXG59XHJcbiIsImltcG9ydCB7IEdhbWVNb2RlbCB9IGZyb20gXCIuL0dhbWVNb2RlbFwiO1xyXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcclxuXHJcblxyXG4vKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjEgMTE6NDY6MTVcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjEgMTE6NDY6MTVcclxuICogQGRlc2Mgd2Vic29ja2V06L+e5o6lXHJcbiAqL1xyXG5cclxuLy97XCJhcHBJZFwiOlwibHVja3lyb2NrZXRcIixcImV2ZW50XCI6W3tcInRvZ2dsZVwiOjAsXCJ0eXBlXCI6XCJ0eXBlX3ZhbHVlXCIsXCJleHBpcmVUaW1lXCI6MH1dfVxyXG5cclxuZXhwb3J0IGNsYXNzIFNvY2tldCBleHRlbmRzIExheWEuVUlDb21wb25lbnQge1xyXG4gICAgXHJcbiAgICBzdGF0aWMgV1NfVVJMOiBzdHJpbmcgPSBgd3NzOi8vdC13c3MueHloai5pby93cz9hcHBpZD1sdWNreXJvY2tldEFwcGBcclxuICAgIHN0YXRpYyBXUzogYW55ID0gJyc7XHJcbiAgICAvKiozMOenkuS4gOasoeW/g+i3syAqL1xyXG4gICAgc3RhdGljIHNldEludGVydmFsV2Vzb2NrZXRQdXNoOmFueSA9IG51bGw7IFxyXG5cclxuICAgIC8qKuW7uueri+i/nuaOpSAqL1xyXG4gICAgc3RhdGljIGNyZWF0ZVNvY2tldCgpIHtcclxuICAgICAgICBjb25zdCB1c2VySW5mbzphbnkgPSBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS51c2VySW5mbztcclxuICAgICAgICBpZiAodXNlckluZm8udXNlcklkKSB7XHJcbiAgICAgICAgICAgIFNvY2tldC5XU19VUkwgPSBTb2NrZXQuV1NfVVJMICsgYCZ1aWQ9JHt1c2VySW5mby51c2VySWR9YFxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIVNvY2tldC5XUykge1xyXG4gICAgICAgICAgICAvLyBTb2NrZXQuV1MuY2xvc2UoKVxyXG4gICAgICAgICAgICBTb2NrZXQuV1MgPSBuZXcgV2ViU29ja2V0KFNvY2tldC5XU19VUkwpXHJcbiAgICAgICAgICAgIFNvY2tldC5XUy5vbm9wZW4gPSBTb2NrZXQub25vcGVuV1M7XHJcbiAgICAgICAgICAgIFNvY2tldC5XUy5vbm1lc3NhZ2UgPSBTb2NrZXQub25tZXNzYWdlV1M7XHJcbiAgICAgICAgICAgIFNvY2tldC5XUy5vbmVycm9yID0gU29ja2V0Lm9uZXJyb3JXUztcclxuICAgICAgICAgICAgU29ja2V0LldTLm9uY2xvc2UgPSBTb2NrZXQub25jbG9zZVdTO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8qKuaJk+W8gFdT5LmL5ZCO5Y+R6YCB5b+D6LezICovXHJcbiAgICBzdGF0aWMgb25vcGVuV1MoKSB7XHJcbiAgICAgICAgU29ja2V0LnNlbmRQaW5nKCk7IC8v5Y+R6YCB5b+D6LezXHJcbiAgICB9XHJcbiAgICAvKirov57mjqXlpLHotKXph43ov54gKi9cclxuICAgIHN0YXRpYyBvbmVycm9yV1MoKSB7XHJcbiAgICAgICAgU29ja2V0LldTLmNsb3NlKCk7XHJcbiAgICAgICAgU29ja2V0LmNyZWF0ZVNvY2tldCgpOyAvL+mHjei/nlxyXG4gICAgfVxyXG4gICAgLyoqV1PmlbDmja7mjqXmlLbnu5/kuIDlpITnkIYgKi9cclxuICAgIHN0YXRpYyBvbm1lc3NhZ2VXUyhlOiBhbnkpIHtcclxuICAgICAgICBsZXQgcmVkYXRhOmFueTtcclxuICAgICAgICBsZXQgcGF5bG9hZDphbnk7XHJcbiAgICAgICAgaWYgKGUuZGF0YSA9PT0gJ29rJyB8fCBlLmRhdGEgPT09ICdwb25nJykge1xyXG4gICAgICAgICAgICByZWRhdGEgPSBlLmRhdGE7IC8vIOaVsOaNrlxyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICByZWRhdGEgPSBKU09OLnBhcnNlKGUuZGF0YSk7IC8vIOaVsOaNrlxyXG4gICAgICAgICAgICBwYXlsb2FkID0gcmVkYXRhLnBheWxvYWQ7XHJcbiAgICAgICAgICAgIC8vIOS4i+WPkei0reS5sOWPt+eggVxyXG4gICAgICAgICAgICBpZiAocGF5bG9hZC50eXBlID09PSAncHVyY2hhc2VkJykge1xyXG4gICAgICAgICAgICAgICAgR2FtZU1vZGVsLmdldEluc3RhbmNlKCkuc2V0R29vZHNBcnIocGF5bG9hZC5nb29kcylcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyDkuIvlj5HpppbpobXmlbDmja5cclxuICAgICAgICAgICAgaWYgKHBheWxvYWQudHlwZSA9PT0gJ2luZGV4Jykge1xyXG4gICAgICAgICAgICAgICAgLy8g5Yi35paw54Gr566t5pWw5o2uXHJcbiAgICAgICAgICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5zZXRSb2NrZXREYXRhKHBheWxvYWQucmFua2luZylcclxuICAgICAgICAgICAgICAgIC8vIOaYr+WQpuW8gOWlluS6hlxyXG4gICAgICAgICAgICAgICAgaWYgKHBheWxvYWQudG9nZ2xlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgR2FtZU1vZGVsLmdldEluc3RhbmNlKCkuaXNUb2dnbGUodHJ1ZSlcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyDkuIvlj5HkuK3lpZblkI3ljZVcclxuICAgICAgICAgICAgaWYgKHBheWxvYWQudHlwZSA9PT0gJ3dpbm5pbmcnKSB7XHJcbiAgICAgICAgICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5ub3RpY2VGdW5jKHRydWUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8g5LiL5Y+R54Gr566t5aSn5aWW5o6S6KGM5ZCN5Y2VXHJcbiAgICAgICAgICAgIGlmIChwYXlsb2FkLnR5cGUgPT09ICdyYW5raW5nJykge1xyXG4gICAgICAgICAgICAgICAgR2FtZU1vZGVsLmdldEluc3RhbmNlKCkuc2V0Um9ja2V0UmFua2luZyhwYXlsb2FkLnVzZXJJbmZvKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLyoq5Y+R6YCB5pWw5o2uICovXHJcbiAgICBzdGF0aWMgc2VuZFdTUHVzaCh0eXBlPzogYW55LHRvZ2dsZTphbnkgPSAxKSB7XHJcbiAgICAgICAgaWYgKFNvY2tldC5XUyAhPT0gbnVsbCAmJiBTb2NrZXQuV1MucmVhZHlTdGF0ZSA9PT0gMykge1xyXG4gICAgICAgICAgICBTb2NrZXQuV1MuY2xvc2UoKTtcclxuICAgICAgICAgICAgU29ja2V0LmNyZWF0ZVNvY2tldCgpOy8v6YeN6L+eXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbGV0IG9iaiA9IHtcclxuICAgICAgICAgICAgICAgIFwiYXBwSWRcIjogXCJsdWNreXJvY2tldEFwcFwiLCBcclxuICAgICAgICAgICAgICAgIFwiZXZlbnRcIjogW1xyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IHR5cGUsIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBcInRvZ2dsZVwiOiB0b2dnbGUsIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBcImV4cGlyZVRpbWVcIjogMTgwMFxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBTb2NrZXQuV1Muc2VuZChKU09OLnN0cmluZ2lmeShvYmopKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8qKuWFs+mXrVdTICovXHJcbiAgICBzdGF0aWMgb25jbG9zZVdTKCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCfmlq3lvIDov57mjqUnKTtcclxuICAgIH1cclxuICAgIC8qKuWPkemAgeW/g+i3syAqL1xyXG4gICAgc3RhdGljIHNlbmRQaW5nKCl7XHJcbiAgICAgICAgU29ja2V0LldTLnNlbmQoJ3BpbmcnKTtcclxuICAgICAgICBTb2NrZXQuc2V0SW50ZXJ2YWxXZXNvY2tldFB1c2ggPSBzZXRJbnRlcnZhbCgoKSA9PiB7XHJcbiAgICAgICAgICAgIFNvY2tldC5XUy5zZW5kKCdwaW5nJyk7XHJcbiAgICAgICAgfSwgMzAwMDApXHJcbiAgICB9XHJcbn1cclxuXHJcbiIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0NToyOFxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0NToyOFxyXG4gKiBAZGVzYyDlt6Xlhbflh73mlbDpm4blkIhcclxuICovXHJcbmV4cG9ydCBkZWZhdWx0IHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIOWNg+WIhuS9jeagvOW8j+WMllxyXG4gICAgICogQHBhcmFtIHtudW1iZXIgfCBzdHJpbmd9IG51bSDmoLzlvI/ljJbmlbDlrZdcclxuICAgICAqL1xyXG4gICAgY29tZGlmeShudW06IGFueSkge1xyXG4gICAgICAgIHJldHVybiBudW0udG9TdHJpbmcoKS5yZXBsYWNlKC9cXGQrLywgZnVuY3Rpb24gKG4pIHsgLy8g5YWI5o+Q5Y+W5pW05pWw6YOo5YiGXHJcbiAgICAgICAgICAgIHJldHVybiBuLnJlcGxhY2UoLyhcXGQpKD89KFxcZHszfSkrJCkvZywgZnVuY3Rpb24gKCQxKSB7IC8vIOWvueaVtOaVsOmDqOWIhua3u+WKoOWIhumalOesplxyXG4gICAgICAgICAgICAgICAgcmV0dXJuICQxICsgXCIsXCI7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIOWkjeWItlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNvcHlJbmZvIOWkjeWItuWGheWuuVxyXG4gICAgICovXHJcbiAgICBDb3B5KGNvcHlJbmZvOiBhbnkpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBsZXQgY29weVVybCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiKTsgLy/liJvlu7rkuIDkuKppbnB1dOahhuiOt+WPlumcgOimgeWkjeWItueahOaWh+acrOWGheWuuVxyXG4gICAgICAgICAgICBjb3B5VXJsLnZhbHVlID0gY29weUluZm87XHJcbiAgICAgICAgICAgIGxldCBhcHBEaXYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXBwJyk7XHJcbiAgICAgICAgICAgIGFwcERpdi5hcHBlbmRDaGlsZChjb3B5VXJsKTtcclxuICAgICAgICAgICAgY29weVVybC5zZWxlY3QoKTtcclxuICAgICAgICAgICAgZG9jdW1lbnQuZXhlY0NvbW1hbmQoXCJDb3B5XCIpO1xyXG4gICAgICAgICAgICBjb3B5VXJsLnJlbW92ZSgpXHJcbiAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XHJcbiAgICAgICAgfSlcclxuICAgIH0sXHJcblxyXG4gICAgLyoqIOWIpOaWreaYr+WQpuS4uuaJi+acuiovXHJcbiAgICBpc1Bob25lKG51bTogYW55KSB7XHJcbiAgICAgICAgdmFyIHJlZyA9IC9eMVszNDU2Nzg5XVxcZHs5fSQvO1xyXG4gICAgICAgIHJldHVybiByZWcudGVzdChudW0pO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIOWAkuiuoeaXtlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmcgfCBudW1iZXJ9IHRpbWVzIOWJqeS9meavq+enkuaVsCBcclxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIOWbnuiwg+WHveaVsFxyXG4gICAgICovXHJcbiAgICBjb3VudERvd24odGltZXM6IGFueSwgY2FsbGJhY2s6IGFueSkge1xyXG4gICAgICAgIGxldCB0aW1lciA9IG51bGw7XHJcbiAgICAgICAgdGltZXIgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XHJcbiAgICAgICAgICAgIGlmICh0aW1lcyA+IDApIHtcclxuICAgICAgICAgICAgICAgIGxldCBkYXk6IGFueSA9IE1hdGguZmxvb3IodGltZXMgLyAoNjAgKiA2MCAqIDI0KSk7XHJcbiAgICAgICAgICAgICAgICBsZXQgaG91cjogYW55ID0gTWF0aC5mbG9vcih0aW1lcyAvICg2MCAqIDYwKSkgLSAoZGF5ICogMjQpO1xyXG4gICAgICAgICAgICAgICAgbGV0IG1pbnV0ZTogYW55ID0gTWF0aC5mbG9vcih0aW1lcyAvIDYwKSAtIChkYXkgKiAyNCAqIDYwKSAtIChob3VyICogNjApO1xyXG4gICAgICAgICAgICAgICAgbGV0IHNlY29uZDogYW55ID0gTWF0aC5mbG9vcih0aW1lcykgLSAoZGF5ICogMjQgKiA2MCAqIDYwKSAtIChob3VyICogNjAgKiA2MCkgLSAobWludXRlICogNjApO1xyXG4gICAgICAgICAgICAgICAgZGF5ID0gYCR7ZGF5IDwgMTAgPyAnMCcgOiAnJ30ke2RheX1gO1xyXG4gICAgICAgICAgICAgICAgaG91ciA9IGAke2hvdXIgPCAxMCA/ICcwJyA6ICcnfSR7aG91cn1gO1xyXG4gICAgICAgICAgICAgICAgbWludXRlID0gYCR7bWludXRlIDwgMTAgPyAnMCcgOiAnJ30ke21pbnV0ZX1gO1xyXG4gICAgICAgICAgICAgICAgc2Vjb25kID0gYCR7c2Vjb25kIDwgMTAgPyAnMCcgOiAnJ30ke3NlY29uZH1gO1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2soYCR7aG91cn06JHttaW51dGV9OiR7c2Vjb25kfWApXHJcbiAgICAgICAgICAgICAgICB0aW1lcy0tO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aW1lcik7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sIDEwMDApO1xyXG4gICAgICAgIGlmICh0aW1lcyA8PSAwKSB7XHJcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGltZXIpO1xyXG4gICAgICAgICAgICBjYWxsYmFjayhmYWxzZSlcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5bCG5qC85byP5YyW5pel5pyf6L2s5o2i5oiQ5pe26Ze05oizXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbXlEYXRlIOagvOW8j+WMluaXpeacn1xyXG4gICAgICovXHJcbiAgICBmb3JtYXREYXRlKHg6IGFueSwgeTogYW55KSB7XHJcbiAgICAgICAgaWYgKCEoeCBpbnN0YW5jZW9mIERhdGUpKSB7XHJcbiAgICAgICAgICAgIHZhciBkYXRlID0gbmV3IERhdGUoKTtcclxuICAgICAgICAgICAgZGF0ZS5zZXRUaW1lKHggKiAxMDAwKTtcclxuICAgICAgICAgICAgeCA9IGRhdGU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciB6ID0ge1xyXG4gICAgICAgICAgICB5OiB4LmdldEZ1bGxZZWFyKCksXHJcbiAgICAgICAgICAgIE06IHguZ2V0TW9udGgoKSArIDEsXHJcbiAgICAgICAgICAgIGQ6IHguZ2V0RGF0ZSgpLFxyXG4gICAgICAgICAgICBoOiB4LmdldEhvdXJzKCksXHJcbiAgICAgICAgICAgIG06IHguZ2V0TWludXRlcygpLFxyXG4gICAgICAgICAgICBzOiB4LmdldFNlY29uZHMoKVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmV0dXJuIHkucmVwbGFjZSgvKHkrfE0rfGQrfGgrfG0rfHMrKS9nLCBmdW5jdGlvbiAodikge1xyXG4gICAgICAgICAgICByZXR1cm4gKCh2Lmxlbmd0aCA+IDEgPyBcIjBcIiA6IFwiXCIpICsgZXZhbChcInouXCIgKyB2LnNsaWNlKC0xKSkpLnNsaWNlKFxyXG4gICAgICAgICAgICAgICAgLSh2Lmxlbmd0aCA+IDIgPyB2Lmxlbmd0aCA6IDIpXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9LFxyXG4gICAgLyoqXHJcbiAgICog5bCG5pe26Ze05oiz6L2s5o2i5oiQ5qC85byP5YyW5pel5pyfXHJcbiAgICogQHBhcmFtIHtzdHJpbmd9IHRpbWVTdGFtcCDml7bpl7TmiLNcclxuICAgKi9cclxuICAgIGZvcm1hdERhdGVUaW1lKHRpbWVTdGFtcCkge1xyXG4gICAgICAgIHZhciBkYXRlID0gbmV3IERhdGUoKTtcclxuICAgICAgICBkYXRlLnNldFRpbWUodGltZVN0YW1wICogMTAwMCk7XHJcbiAgICAgICAgdmFyIHkgPSBkYXRlLmdldEZ1bGxZZWFyKCk7XHJcbiAgICAgICAgdmFyIG06c3RyaW5nIHwgbnVtYmVyID0gZGF0ZS5nZXRNb250aCgpICsgMTtcclxuICAgICAgICBtID0gbSA8IDEwID8gKCcwJyArIG0pIDogbTtcclxuICAgICAgICB2YXIgZDpzdHJpbmcgfCBudW1iZXIgPSBkYXRlLmdldERhdGUoKTtcclxuICAgICAgICBkID0gZCA8IDEwID8gKCcwJyArIGQpIDogZDtcclxuICAgICAgICB2YXIgaDpzdHJpbmcgfCBudW1iZXIgPSBkYXRlLmdldEhvdXJzKCk7XHJcbiAgICAgICAgaCA9IGggPCAxMCA/ICgnMCcgKyBoKSA6IGg7XHJcbiAgICAgICAgdmFyIG1pbnV0ZTpzdHJpbmcgfCBudW1iZXIgPSBkYXRlLmdldE1pbnV0ZXMoKTtcclxuICAgICAgICB2YXIgc2Vjb25kOnN0cmluZyB8IG51bWJlciA9IGRhdGUuZ2V0U2Vjb25kcygpO1xyXG4gICAgICAgIG1pbnV0ZSA9IG1pbnV0ZSA8IDEwID8gKCcwJyArIG1pbnV0ZSkgOiBtaW51dGU7XHJcbiAgICAgICAgc2Vjb25kID0gc2Vjb25kIDwgMTAgPyAoJzAnICsgc2Vjb25kKSA6IHNlY29uZDtcclxuICAgICAgICByZXR1cm4geSArICctJyArIG0gKyAnLScgKyBkICsgJyAnICsgaCArICc6JyArIG1pbnV0ZSArICc6JyArIHNlY29uZDtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiDkv53nlZlu5L2N5bCP5pWwICBcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nIHwgbnVtYmVyfSBjbnVtIOmcgOimgeS/neeVmeeahOaVsOaNrlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNpbmRleCDkv53nlZnnmoTlsI/mlbDkvY3mlbBcclxuICAgICAqL1xyXG4gICAgdG9EZWNpbWFsKGNudW06IGFueSwgY2luZGV4OiBhbnkpIHtcclxuICAgICAgICBsZXQgdmFsdWUgPSBTdHJpbmcoY251bSk7XHJcbiAgICAgICAgaWYgKHZhbHVlLmluZGV4T2YoXCIuXCIpID4gMCkge1xyXG4gICAgICAgICAgICB2YXIgbGVmdCA9IHZhbHVlLnN1YnN0cigwLCB2YWx1ZS5pbmRleE9mKFwiLlwiKSk7XHJcbiAgICAgICAgICAgIHZhciByaWdodCA9IHZhbHVlLnN1YnN0cih2YWx1ZS5pbmRleE9mKFwiLlwiKSArIDEsIHZhbHVlLmxlbmd0aCk7XHJcbiAgICAgICAgICAgIGlmIChyaWdodC5sZW5ndGggPiBjaW5kZXgpIHtcclxuICAgICAgICAgICAgICAgIHJpZ2h0ID0gcmlnaHQuc3Vic3RyKDAsIGNpbmRleCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFsdWUgPSBsZWZ0ICsgXCIuXCIgKyByaWdodDtcclxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBjbnVtO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgLyoq5Yqg5rOV6L+Q566XICovXHJcbiAgICBhY2NBZGQoYXJnMSxhcmcyKXtcclxuICAgICAgICBsZXQgcjEscjIsbTtcclxuICAgICAgICB0cnl7cjE9YXJnMS50b1N0cmluZygpLnNwbGl0KFwiLlwiKVsxXS5sZW5ndGh9Y2F0Y2goZSl7cjE9MH1cclxuICAgICAgICB0cnl7cjI9YXJnMi50b1N0cmluZygpLnNwbGl0KFwiLlwiKVsxXS5sZW5ndGh9Y2F0Y2goZSl7cjI9MH1cclxuICAgICAgICBtPU1hdGgucG93KDEwLE1hdGgubWF4KHIxLHIyKSlcclxuICAgICAgICByZXR1cm4gKGFyZzEqbSthcmcyKm0pL21cclxuICAgIH0sXHJcbiAgICAvKirlh4/ms5Xov5DnrpcgKi9cclxuICAgIGFjY1N1YihhcmcxLGFyZzIpe1xyXG4gICAgICAgIGxldCByMSxyMixtLG47XHJcbiAgICAgICAgdHJ5e3IxPWFyZzEudG9TdHJpbmcoKS5zcGxpdChcIi5cIilbMV0ubGVuZ3RofWNhdGNoKGUpe3IxPTB9XHJcbiAgICAgICAgdHJ5e3IyPWFyZzIudG9TdHJpbmcoKS5zcGxpdChcIi5cIilbMV0ubGVuZ3RofWNhdGNoKGUpe3IyPTB9XHJcbiAgICAgICAgbT1NYXRoLnBvdygxMCxNYXRoLm1heChyMSxyMikpO1xyXG4gICAgICAgIG49KHIxPj1yMik/cjE6cjI7XHJcbiAgICAgICAgcmV0dXJuICgoYXJnMSptLWFyZzIqbSkvbSkudG9GaXhlZChuKTtcclxuICAgIH0sXHJcbiAgICAvKirpmaTms5Xov5DnrpcgKi9cclxuICAgIGFjY0RpdihhcmcxLGFyZzIpe1xyXG4gICAgICAgIGxldCB0MT0wLHQyPTAscjEscjI7XHJcbiAgICAgICAgdHJ5e3QxPWFyZzEudG9TdHJpbmcoKS5zcGxpdChcIi5cIilbMV0ubGVuZ3RofWNhdGNoKGUpe307XHJcbiAgICAgICAgdHJ5e3QyPWFyZzIudG9TdHJpbmcoKS5zcGxpdChcIi5cIilbMV0ubGVuZ3RofWNhdGNoKGUpe307XHJcbiAgICAgICAgcjE9TnVtYmVyKGFyZzEudG9TdHJpbmcoKS5yZXBsYWNlKFwiLlwiLFwiXCIpKVxyXG4gICAgICAgIHIyPU51bWJlcihhcmcyLnRvU3RyaW5nKCkucmVwbGFjZShcIi5cIixcIlwiKSlcclxuICAgICAgICByZXR1cm4gKHIxL3IyKSpNYXRoLnBvdygxMCx0Mi10MSk7XHJcbiAgICB9LFxyXG4gICAgLyoq5LmY5rOV6L+Q566XICovXHJcbiAgICBhY2NNdWwoYXJnMSxhcmcyKXtcclxuICAgICAgICBsZXQgbT0wLHMxPWFyZzEudG9TdHJpbmcoKSxzMj1hcmcyLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgdHJ5e20rPXMxLnNwbGl0KFwiLlwiKVsxXS5sZW5ndGh9Y2F0Y2goZSl7fVxyXG4gICAgICAgIHRyeXttKz1zMi5zcGxpdChcIi5cIilbMV0ubGVuZ3RofWNhdGNoKGUpe31cclxuICAgICAgICByZXR1cm4gTnVtYmVyKHMxLnJlcGxhY2UoXCIuXCIsXCJcIikpKk51bWJlcihzMi5yZXBsYWNlKFwiLlwiLFwiXCIpKS9NYXRoLnBvdygxMCxtKVxyXG4gICAgfSxcclxufVxyXG4iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjggMTE6Mjk6NDFcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjggMTE6Mjk6NDFcclxuICogQGRlc2Mg6LWE5rqQ5YiX6KGoXHJcbiAqL1xyXG5cclxuXHJcbi8v5Zu+54mH6LWE5rqQXHJcbmNvbnN0IGNvbXAgPSBbXHJcbiAgICB7IHVybDogXCJyZXMvYXRsYXMvY29tcC5hdGxhc1wiLCB0eXBlOiBcImF0bGFzXCIgfSxcclxuXHR7IHVybDogXCJyZXMvYXRsYXMvY29tcC9ob21lLmF0bGFzXCIsIHR5cGU6IFwiYXRsYXNcIiB9LFxyXG5cdHsgdXJsOiBcInJlcy9hdGxhcy9jb21wL2hvbWUvZmlyZS5hdGxhc1wiLCB0eXBlOiBcImF0bGFzXCIgfSxcclxuXHR7IHVybDogXCJyZXMvYXRsYXMvY29tcC9ob21lL3dhdmUuYXRsYXNcIiwgdHlwZTogXCJhdGxhc1wiIH0sXHJcbiAgICB7IHVybDogXCJjb21wL2ltZ19zdGFyX2JnMDEucG5nXCIsIHR5cGU6IFwiaW1hZ2VcIiB9LFxyXG4gICAgLy8geyB1cmw6IFwiY29tcC9pbWdfYmFubmVyMDEucG5nXCIsIHR5cGU6IFwiaW1hZ2VcIiB9LFxyXG4gICAgLy8geyB1cmw6IFwiY29tcC9pbWdfbXlyYW5rMDEucG5nXCIsIHR5cGU6IFwiaW1hZ2VcIiB9LFxyXG4gICAgeyB1cmw6IFwiY29tcC9pbWdfcGF5bWVudF9iZzAxLnBuZ1wiLCB0eXBlOiBcImltYWdlXCIgfSxcclxuICAgIC8vIHsgdXJsOiBcImNvbXAvaW1nX3JhbmswMS5wbmdcIiwgdHlwZTogXCJpbWFnZVwiIH0sXHJcbiAgICB7IHVybDogXCJjb21wL2ltZ19yYW5rbGlzdF9iZzAxLnBuZ1wiLCB0eXBlOiBcImltYWdlXCIgfSxcclxuICAgIHsgdXJsOiBcImNvbXAvaW1nX3JvY2tldFJhbmtpbmdfYmcwMS5wbmdcIiwgdHlwZTogXCJpbWFnZVwiIH0sXHJcbiAgICAvLyB7IHVybDogXCJjb21wL2ltZ190cmVuZF9iYW5uZXIwMS5wbmdcIiwgdHlwZTogXCJpbWFnZVwiIH0sXHJcbiAgICAvLyB7IHVybDogXCJjb21wL2ltZ194Y3RqX2JnMDEucG5nXCIsIHR5cGU6IFwiaW1hZ2VcIiB9LFxyXG5dXHJcblxyXG4vLyDpobXpnaLotYTmupBcclxuY29uc3Qgc2NlbmUgPSBbXHJcbiAgICB7IHVybDogXCJhc3Npc3RhbnQuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxyXG4gICAgeyB1cmw6IFwiQ2FyZC5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXHJcbiAgICB7IHVybDogXCJmaWxlY29uZmlnLmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcclxuICAgIC8vIHsgdXJsOiBcImdyYW5kUHJpeC5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXHJcbiAgICB7IHVybDogXCJndWVzc2luZy5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXHJcbiAgICB7IHVybDogXCJob21lLmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcclxuICAgIC8vIHsgdXJsOiBcInByaUhpc3RvcnlTY2VuZS5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXHJcbiAgICAvLyB7IHVybDogXCJyZWNvcmQuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxyXG4gICAgeyB1cmw6IFwidW5wYWNrLmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcclxuICAgIC8vIHsgdXJsOiBcInNob3J0TGlzdGVkLmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcclxuICAgIHsgdXJsOiBcIlRhYmJhci5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXHJcbiAgICB7IHVybDogXCJ2ZXJzaW9uLmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcclxuICAgIC8vIHsgdXJsOiBcInhjdGouanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxyXG5cclxuICAgIHsgdXJsOiBcInRlbXBsYXRlL0lucHV0UHdkRGlhbG9nLmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcclxuICAgIC8vIHsgdXJsOiBcInRlbXBsYXRlL2pvaW5SZWNvcmRzLmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcclxuICAgIHsgdXJsOiBcInRlbXBsYXRlL251bWJlckxpc3RET00uanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxyXG4gICAgLy8geyB1cmw6IFwidGVtcGxhdGUvcHJldmlvdXNSZWNvcmRzLmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcclxuICAgIC8vIHsgdXJsOiBcInRlbXBsYXRlL3ByaUhpc3RvcnkuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxyXG4gICAgLy8geyB1cmw6IFwidGVtcGxhdGUvcHJpeExpc3QuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxyXG4gICAgLy8geyB1cmw6IFwidGVtcGxhdGUvcmFua2luZ0xpc3QuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxyXG4gICAgeyB1cmw6IFwidGVtcGxhdGUvcmVjaGFyZ2VEaWFsb2cuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxyXG4gICAgLy8geyB1cmw6IFwidGVtcGxhdGUvc2hvcnRMaXN0Lmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcclxuICAgIHsgdXJsOiBcInRlbXBsYXRlL3Nob3dSb2NrZXQuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxyXG4gICAgeyB1cmw6IFwidGVtcGxhdGUvVGlwc0RpYWxvZy5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXHJcbiAgICB7IHVybDogXCJ0ZW1wbGF0ZS90cmVuZExpc3QuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxyXG4gICAgLy8geyB1cmw6IFwidGVtcGxhdGUvd2lubmluZ0xpc3QuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxyXG5dXHJcblxyXG5jb25zdCBsb2FkaW5nUmVzTGlzdCA9IFtcclxuICAgIC4uLmNvbXAsXHJcbiAgICAuLi5zY2VuZVxyXG5dXHJcbmV4cG9ydCBkZWZhdWx0IGxvYWRpbmdSZXNMaXN0O1xyXG4iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDU6NDZcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDU6NDZcclxuICogQGRlc2Mg6aG16Z2i6Lez6L2s6ISa5pys77yM55So5LqO57yW6L6R5qih5byP5o+S5YWlXHJcbiAqL1xyXG5pbXBvcnQgeyBUYWJiYXIgfSBmcm9tIFwiLi4vdmlldy9UYWJiYXJcIjtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBhZ2VOYXZTY3JpcHQgZXh0ZW5kcyBMYXlhLlNjcmlwdCB7XHJcbiAgICAvKiogQHByb3Age25hbWU6bmF2UGFnZVNjcmlwdCx0aXBzOifopoHot7PovaznmoRzY2VuZScsdHlwZTpTdHJpbmcsZGVmYXVsdDonJ30gKi9cclxuICAgIHB1YmxpYyBuYXZQYWdlU2NyaXB0OnN0cmluZyA9ICcnO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCl7c3VwZXIoKX1cclxuXHJcbiAgICBvbkNsaWNrKCk6dm9pZCB7XHJcbiAgICAgICAgVGFiYmFyLmdldEluc3RhbmNlKCkub3BlblNjZW5lKHRoaXMubmF2UGFnZVNjcmlwdClcclxuICAgIH1cclxufSIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0NjowOFxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0NjowOFxyXG4gKiBAZGVzYyDpobXpnaLot7PovaznsbvvvIzlnKjku6PnoIHkuK3kvb/nlKhcclxuICovXHJcbmltcG9ydCB7IFRhYmJhciB9IGZyb20gJy4uL3ZpZXcvVGFiYmFyJ1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGFnZVNjcmlwdCBleHRlbmRzIExheWEuU2NyaXB0IHtcclxuICAgIC8qKiBAcHJvcCB7bmFtZTpzaG93VGFiLHRpcHM6J+aYr+WQpuaciVRhYmJhcicsdHlwZTpCb29sLGRlZmF1bHQ6dHJ1ZX0gKi9cclxuICAgIHB1YmxpYyBzaG93VGFiOmJvb2xlYW4gPSB0cnVlO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCl7c3VwZXIoKTt9XHJcblxyXG4gICAgb25FbmFibGUoKTp2b2lkIHtcclxuICAgICAgICBpZiAodGhpcy5zaG93VGFiKSB7XHJcbiAgICAgICAgICAgIFRhYmJhci5zaG93KClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgb25EaXNhYmxlKCk6dm9pZCB7XHJcbiAgICAgICAgVGFiYmFyLmhpZGUoKVxyXG4gICAgfVxyXG59IiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ2OjMwXHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ2OjMwXHJcbiAqIEBkZXNjIOWxj+W5leiHqumAguW6lOiEmuacrFxyXG4gKi9cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU2NyZWVuIGV4dGVuZHMgTGF5YS5TY3JpcHQge1xyXG4gICAgLyoqIEBwcm9wIHtuYW1lOmJnQ29sb3IsdGlwczon6IOM5pmv6aKc6ImyJywndHlwZTpTdHJpbmcsZGVmYXVsdDonIzBhMDczOCd9ICovXHJcbiAgICBwdWJsaWMgYmdDb2xvcjpzdHJpbmcgPSAnIzBhMDczOCdcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcigpe3N1cGVyKCk7fVxyXG5cclxuICAgIG9uRW5hYmxlKCk6dm9pZCB7XHJcbiAgICAgICBMYXlhLnN0YWdlLm9uKExheWEuRXZlbnQuUkVTSVpFLHRoaXMsdGhpcy5vblJlc2l6ZSlcclxuICAgICAgIHRoaXMub25SZXNpemUoKVxyXG4gICAgfVxyXG5cclxuICAgIG9uRGlzYWJsZSgpOnZvaWQge1xyXG4gICAgICAgIExheWEuc3RhZ2Uub2ZmKExheWEuRXZlbnQuUkVTSVpFLHRoaXMsdGhpcy5vblJlc2l6ZSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uUmVzaXplKCk6dm9pZCB7XHJcbiAgICAgICAgY29uc3QgX3RoYXQgPSAodGhpcy5vd25lciBhcyBMYXlhLlNwcml0ZSk7XHJcbiAgICAgICAgX3RoYXQud2lkdGggPSBMYXlhLnN0YWdlLndpZHRoO1xyXG4gICAgICAgIF90aGF0LmhlaWdodCA9IExheWEuc3RhZ2UuaGVpZ2h0O1xyXG4gICAgICAgIF90aGF0LmdyYXBoaWNzLmRyYXdSZWN0KDAsMCxMYXlhLnN0YWdlLndpZHRoLExheWEuc3RhZ2UuaGVpZ2h0LHRoaXMuYmdDb2xvcik7XHJcbiAgICB9XHJcbn0iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjEgMTY6MzQ6MjFcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjEgMTY6MzQ6MjFcclxuICogQGRlc2Mg5Yqp5omL6aG16Z2i6ISa5pysXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XHJcbmltcG9ydCBhcGkgZnJvbSBcIi4uL2pzL2FwaVwiO1xyXG5pbXBvcnQgeyBUb2FzdCB9IGZyb20gXCIuLi92aWV3L1RvYXN0XCI7XHJcblxyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQXNzaXN0YW50IGV4dGVuZHMgdWkuYXNzaXN0YW50VUkge1xyXG4gICAgcHJpdmF0ZSBjYXRlTGlzdEFycjphbnkgPSBbXTtcclxuICAgIHByaXZhdGUgc2VsZWN0R29vZHNUeXBlOnN0cmluZyA9ICcnO1xyXG4gICAgcHJpdmF0ZSB0YWJUeXBlOm51bWJlciA9IDE7XHJcbiAgICBjb25zdHJ1Y3Rvcigpe1xyXG4gICAgICAgIHN1cGVyKClcclxuICAgICAgICB0aGlzLmJ0bl90cmVuZC5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy50YWJTd2l0Y2gsWzFdKVxyXG4gICAgICAgIHRoaXMuYnRuX3ByZWJ1eS5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy50YWJTd2l0Y2gsWzJdKVxyXG4gICAgICAgIHRoaXMub24oTGF5YS5FdmVudC5SRVNJWkUsdGhpcyx0aGlzLm9uUmVzaXplKVxyXG4gICAgfVxyXG5cclxuICAgIG9uRW5hYmxlKCk6dm9pZHsgIFxyXG4gICAgICAgIHRoaXMuZ2V0R29vZHNDYXRlTGlzdCgpXHJcbiAgICAgICAgdGhpcy5jYXRlU3dpdGNoKClcclxuICAgIH1cclxuICAgIFxyXG4gICAgLyoq6I635Y+W5ZWG5ZOB57G75Z6LICovXHJcbiAgICBwcml2YXRlIGdldEdvb2RzQ2F0ZUxpc3QoKXtcclxuICAgICAgICBhcGkuZ2V0R29vZHNDYXRlTGlzdCgpLnRoZW4oKHJlczphbnkpPT57XHJcbiAgICAgICAgICAgIHRoaXMuY2F0ZUxpc3RBcnIgPSByZXM7XHJcbiAgICAgICAgICAgIGNvbnN0IEdvb2RzTmFtZUFycjpzdHJpbmdbXSA9IFtdO1xyXG4gICAgICAgICAgICByZXMuZm9yRWFjaCgoaXRlbTphbnkpPT57XHJcbiAgICAgICAgICAgICAgICBHb29kc05hbWVBcnIucHVzaChpdGVtLmdvb2RzTmFtZSlcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgdGhpcy5jYXRlVGFiTGlzdC5yZXBlYXRYID0gR29vZHNOYW1lQXJyLmxlbmd0aDtcclxuICAgICAgICAgICAgdGhpcy5jYXRlVGFiTGlzdC5hcnJheSA9IEdvb2RzTmFtZUFycjtcclxuICAgICAgICAgICAgdGhpcy5jYXRlVGFiTGlzdC5zZWxlY3RlZEluZGV4ID0gMDtcclxuICAgICAgICB9KS5jYXRjaCgoZXJyOmFueSk9PntcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyLm1lc3NhZ2UpO1xyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG5cclxuICAgIC8qKuiOt+WPlui1sOWKv+WIl+ihqCAqL1xyXG4gICAgcHJpdmF0ZSBnZXRHb29kc1RyZW5kKGdvb2RzVHlwZTpzdHJpbmcpe1xyXG4gICAgICAgIGFwaS5nZXRHb29kc1RyZW5kKGdvb2RzVHlwZSkudGhlbigocmVzOmFueSk9PntcclxuICAgICAgICAgICAgdGhpcy50cmVuZExpc3QuYXJyYXkgPSByZXM7XHJcbiAgICAgICAgICAgIHRoaXMudHJlbmRMaXN0LnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgIH0pLmNhdGNoKChlcnI6YW55KT0+e1xyXG4gICAgICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyLm1lc3NhZ2UpO1xyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiDliIfmjaLliJfooahcclxuICAgICAqIEBwYXJhbSB0eXBlIDE66LWw5Yq/5YiG5p6QICAy77ya6aKE6LStXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgdGFiU3dpdGNoKHR5cGU6bnVtYmVyKXtcclxuICAgICAgICBpZiAodHlwZSA9PT0gMikge1xyXG4gICAgICAgICAgICBUb2FzdC5zaG93KCfmmoLmnKrlvIDmlL7vvIzmlazor7fmnJ/lvoUnKVxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyB0aGlzLnRhYlR5cGUgPSB0eXBlO1xyXG4gICAgICAgIC8vIHRoaXMuY2F0ZVRhYkxpc3Quc2VsZWN0ZWRJbmRleCA9IDA7XHJcbiAgICAgICAgLy8gaWYgKHRoaXMudGFiVHlwZSA9PT0gMSkge1xyXG4gICAgICAgIC8vICAgICB0aGlzLmJ0bl90cmVuZC5za2luID0gJ2NvbXAvZ3Vlc3NpbmcvaW1nX3RhYl9hY3RpdmUucG5nJztcclxuICAgICAgICAvLyAgICAgdGhpcy5idG5fcHJlYnV5LnNraW4gPSAnY29tcC9ndWVzc2luZy9pbWdfdGFiLnBuZyc7XHJcbiAgICAgICAgLy8gICAgIHRoaXMubGlzdFRpdGxlLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgIC8vICAgICBpZiAodGhpcy50cmVuZExpc3QuYXJyYXkgPT09IG51bGwgfHwgdGhpcy50cmVuZExpc3QuYXJyYXkubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgLy8gICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAvLyAgICAgfWVsc2Uge1xyXG4gICAgICAgIC8vICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICAgIC8vICAgICAgICAgdGhpcy50cmVuZExpc3QudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgLy8gICAgIH1cclxuICAgICAgICAvLyAgICAgdGhpcy5wcmVidXkuc2Nyb2xsVG8oMClcclxuICAgICAgICAvLyAgICAgdGhpcy5wcmVidXkudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICAgIC8vIH1lbHNle1xyXG4gICAgICAgIC8vICAgICB0aGlzLmJ0bl9wcmVidXkuc2tpbiA9ICdjb21wL2d1ZXNzaW5nL2ltZ190YWJfYWN0aXZlLnBuZyc7XHJcbiAgICAgICAgLy8gICAgIHRoaXMuYnRuX3RyZW5kLnNraW4gPSAnY29tcC9ndWVzc2luZy9pbWdfdGFiLnBuZyc7XHJcbiAgICAgICAgLy8gICAgIHRoaXMubGlzdFRpdGxlLnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICAvLyAgICAgaWYgKHRoaXMucHJlYnV5LmFycmF5ID09PSBudWxsIHx8IHRoaXMucHJlYnV5LmFycmF5Lmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIC8vICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgLy8gICAgIH1lbHNlIHtcclxuICAgICAgICAvLyAgICAgICAgIHRoaXMubm9EYXRhLnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICAvLyAgICAgICAgIHRoaXMucHJlYnV5LnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgIC8vICAgICB9XHJcbiAgICAgICAgLy8gICAgIHRoaXMudHJlbmRMaXN0LnNjcm9sbFRvKDApO1xyXG4gICAgICAgIC8vICAgICB0aGlzLnRyZW5kTGlzdC52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgLy8gfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKuWVhuWTgeexu+Wei+WIh+aNoiAqL1xyXG4gICAgcHJpdmF0ZSBjYXRlU3dpdGNoKCl7XHJcbiAgICAgICAgdGhpcy5jYXRlVGFiTGlzdC5zZWxlY3RIYW5kbGVyID0gbmV3IExheWEuSGFuZGxlcih0aGlzLCAoc2VsZWN0ZWRJbmRleDogYW55KT0+IHtcclxuICAgICAgICAgICAgdGhpcy5zZWxlY3RHb29kc1R5cGUgPSB0aGlzLmNhdGVMaXN0QXJyW3NlbGVjdGVkSW5kZXhdLmdvb2RzVHlwZTtcclxuICAgICAgICAgICAgaWYgKHRoaXMudGFiVHlwZSA9PT0gMSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5nZXRHb29kc1RyZW5kKHRoaXMuc2VsZWN0R29vZHNUeXBlKVxyXG4gICAgICAgICAgICB9ZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn5pqC5pyq5byA5pS+Jyx0aGlzLnNlbGVjdEdvb2RzVHlwZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy/mlLnlj5h0YWLpgInkuK3nirbmgIFcclxuICAgICAgICAgICAgbGV0IGk6IG51bWJlciA9IHRoaXMuY2F0ZVRhYkxpc3Quc3RhcnRJbmRleDtcclxuICAgICAgICAgICAgdGhpcy5jYXRlVGFiTGlzdC5jZWxscy5mb3JFYWNoKChjZWxsOiBMYXlhLkJ1dHRvbikgPT4ge1xyXG4gICAgICAgICAgICAgICAgY2VsbC5zZWxlY3RlZCA9IGkgPT09IHNlbGVjdGVkSW5kZXg7XHJcbiAgICAgICAgICAgICAgICBpKys7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICAvKirnm5Hop4blsY/luZXlpKflsI/lj5jljJYgKi9cclxuICAgIG9uUmVzaXplKCl7XHJcbiAgICAgICAgLy/liJfooajpq5jluqbpgILphY0gPSDlsY/luZXpq5jluqYgLSAoYmFubmVyICsgdGFiYmFyKVxyXG4gICAgICAgIHRoaXMudHJlbmRMaXN0LmhlaWdodCA9IHRoaXMuaGVpZ2h0IC0gNjAwO1xyXG4gICAgICAgIGNvbnN0IHRyZW5kTnVtYmVyID0gdGhpcy50cmVuZExpc3QuaGVpZ2h0IC8gMTAwO1xyXG4gICAgICAgIHRoaXMudHJlbmRMaXN0LnJlcGVhdFkgPSBNYXRoLmNlaWwodHJlbmROdW1iZXIpXHJcbiAgICAgICAgdGhpcy5wcmVidXkuaGVpZ2h0ID0gdGhpcy5oZWlnaHQgLSA2MDA7XHJcbiAgICAgICAgY29uc3QgcHJlYnV5TnVtYmVyID0gdGhpcy5wcmVidXkuaGVpZ2h0IC8gMTAwO1xyXG4gICAgICAgIHRoaXMudHJlbmRMaXN0LnJlcGVhdFkgPSBNYXRoLmNlaWwocHJlYnV5TnVtYmVyKVxyXG4gICAgfVxyXG4gICBcclxufSIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0NzoxMVxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0NzoxMVxyXG4gKiBAZGVzYyDpppbpobXllYblk4HljaHohJrmnKxcclxuICovXHJcbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xyXG5pbXBvcnQgeyBUYWJiYXIgfSBmcm9tIFwiLi4vdmlldy9UYWJiYXJcIjtcclxuXHJcbmltcG9ydCB1dGlscyBmcm9tICcuLi9qcy91dGlscydcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENhcmQgZXh0ZW5kcyB1aS5DYXJkVUkge1xyXG4gICAgY29uc3RydWN0b3IoKXtcclxuICAgICAgICBzdXBlcigpXHJcbiAgICAgICAgdGhpcy5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5jbGlja0l0ZW0pXHJcbiAgICB9XHJcbiAgICBzZXQgZGF0YVNvdXJjZShpdGVtOiBhbnkpIHtcclxuICAgICAgICB0aGlzLl9kYXRhU291cmNlID0gaXRlbTtcclxuICAgICAgICBpZiAoaXRlbSkge1xyXG4gICAgICAgICAgICAvL+mHkeW4geWbvueJhywgIDEtNDAw6YeR5biB5Zu+5qCHMjsgICA1MDEtMTAwMOmHkeW4geWbvuaghzQ7ICAxMDAx5Lul5LiK6YeR5biB5Zu+5qCHMjBcclxuICAgICAgICAgICAgaWYgKCtpdGVtLmdvb2RzVmFsdWUgPD0gNDAwICkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jYXJkSXRlbS5za2luID0gYGNvbXAvaG9tZS9pbWdfamluYmlfMi5wbmdgXHJcbiAgICAgICAgICAgIH1lbHNlIGlmKCtpdGVtLmdvb2RzVmFsdWUgPD0gMTAwMCl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNhcmRJdGVtLnNraW4gPSBgY29tcC9ob21lL2ltZ19qaW5iaV80LnBuZ2BcclxuICAgICAgICAgICAgfWVsc2UgaWYoK2l0ZW0uZ29vZHNWYWx1ZSA+PSAxMDAxKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNhcmRJdGVtLnNraW4gPSBgY29tcC9ob21lL2ltZ19qaW5iaV8yMC5wbmdgXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5zY2VuZUltZy5za2luID0gYGNvbXAvaG9tZS9pbWdfc2NlbmVfJHtpdGVtLnRvdGFsTnVtfS5wbmdgXHJcbiAgICAgICAgICAgIHRoaXMuZ29vZHNOYW1lLnRleHQgPSBgJHsraXRlbS5nb29kc1ZhbHVlfSBVU0RUYFxyXG4gICAgICAgICAgICB0aGlzLmF3YXJkLnRleHQgPSBgJHt1dGlscy50b0RlY2ltYWwoaXRlbS5hd2FyZCwyKX1gXHJcbiAgICAgICAgICAgIHRoaXMuc29sZE51bV90b3RhbE51bS50ZXh0ID0gYCR7aXRlbS5zb2xkTnVtfS8ke2l0ZW0udG90YWxOdW19YFxyXG4gICAgICAgICAgICB0aGlzLnByb2dyZXNzLnZhbHVlID0gK2Ake2l0ZW0uc29sZE51bS9pdGVtLnRvdGFsTnVtfWBcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjbGlja0l0ZW0oKTp2b2lkIHtcclxuICAgICAgICBUYWJiYXIuZ2V0SW5zdGFuY2UoKS5vcGVuU2NlbmUoJ2d1ZXNzaW5nLnNjZW5lJyx0aGlzLl9kYXRhU291cmNlLmdvb2RzSWQpXHJcbiAgICB9XHJcbn0iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDc6NThcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDc6NThcclxuICogQGRlc2Mg6LSt5Lmw6aG16Z2i6ISa5pysXHJcbiAqL1xyXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcclxuaW1wb3J0IHsgVG9hc3QgfSBmcm9tIFwiLi4vdmlldy9Ub2FzdFwiO1xyXG5pbXBvcnQgdXRpbHMgZnJvbSAnLi4vanMvdXRpbHMnXHJcbmltcG9ydCBJcHRQc3dEb20gZnJvbSBcIi4uL3RlbXBsYXRlL3Bzd0lucHV0XCI7XHJcbmltcG9ydCB7IEdhbWVNb2RlbCB9IGZyb20gXCIuLi9qcy9HYW1lTW9kZWxcIjtcclxuaW1wb3J0IGFwaSBmcm9tIFwiLi4vanMvYXBpXCI7XHJcbmltcG9ydCB7IFNvY2tldCB9IGZyb20gXCIuLi9qcy9zb2NrZXRcIjtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEd1ZXNzaW5nIGV4dGVuZHMgdWkuZ3Vlc3NpbmdVSSB7XHJcblxyXG4gICAgcHJpdmF0ZSBnb29kc0lkOnN0cmluZyA9ICcnOy8v5ZWG5ZOBSURcclxuICAgIHByaXZhdGUgX3BlcmlvZDpzdHJpbmcgPSAnJzsgLy/mnJ/lj7dcclxuICAgIHByaXZhdGUgc2VsZWN0TnVtYmVyOm51bWJlciA9IDA7IC8v6YCJ5Lit5Liq5pWwXHJcbiAgICBwcml2YXRlIHVuaXRQcmljZTpudW1iZXIgPSAwOyAvL+WNleS7t1xyXG4gICAgcHJpdmF0ZSB0b3RhbFByaWNlOm51bWJlciA9IDA7IC8v5oC75Lu3XHJcbiAgICBwcml2YXRlIG15QW1vdW50Om51bWJlciA9IDA7IC8v5oC76LWE5LqnXHJcbiAgICBwcml2YXRlIG51bWJlckFycjpudW1iZXJbXSA9IFtdOyAvL+acqumAieS4reeahOaVsOaNrlxyXG4gICAgcHJpdmF0ZSBoYWxmQXJyOm51bWJlcltdID0gW107IC8v5LiA5Y2K55qE5pyq6YCJ5Lit5pWw5o2uXHJcbiAgICBwcml2YXRlIHJhd0RhdGFBcnJfbmV3OmFueVtdID0gW107Ly/plZzlg4/mlbDnu4RcclxuICAgIHByaXZhdGUgcmF3RGF0YUFycjphbnlbXSA9IFtdOy8v5Y6f5aeL5pWw5o2uXHJcblxyXG4gICAgcHJpdmF0ZSBpbnB1dFB3ZDogSXB0UHN3RG9tOyAvL+Wvhueggei+k+WFpeahhlxyXG4gICAgcHJpdmF0ZSBjb2RlTGlzdDpzdHJpbmcgPSAnJzsgLy/otK3kubDlj7fnoIFcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcigpe1xyXG4gICAgICAgIHN1cGVyKClcclxuXHJcbiAgICAgICAgdGhpcy5idG5fYnV5Lm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLmJ1eUZ1bmMpXHJcblxyXG4gICAgICAgIC8vIOmAieaLqeaMiemSrue7hOe7keWumuS6i+S7tlxyXG4gICAgICAgIHRoaXMucmFuZG9tX29uZS5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5zZWxlY3RGdW5jLFsxXSlcclxuICAgICAgICB0aGlzLnJhbmRvbV9iZWZvcmUub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuc2VsZWN0RnVuYyxbMl0pXHJcbiAgICAgICAgdGhpcy5yYW5kb21fYWZ0ZXIub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuc2VsZWN0RnVuYyxbM10pXHJcbiAgICAgICAgdGhpcy5yYW5kb21fYWxsLm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLnNlbGVjdEZ1bmMsWzRdKVxyXG4gICAgfVxyXG5cclxuICAgIG9uRW5hYmxlKCk6dm9pZCB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ+i/m+WFpemhtemdoicpO1xyXG5cclxuICAgICAgICAvL+iOt+WPlueUqOaIt+i1hOS6p1xyXG4gICAgICAgIGNvbnN0IHVzZXJJbmZvOmFueSA9IEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLnVzZXJJbmZvO1xyXG4gICAgICAgIHRoaXMuYmFsYW5jZS50ZXh0ID0gYCR7dXRpbHMudG9EZWNpbWFsKHVzZXJJbmZvLm1vbmV5LDIpfSBVU0RUYDtcclxuICAgICAgICB0aGlzLm15QW1vdW50ID0gK2Ake3V0aWxzLnRvRGVjaW1hbCh1c2VySW5mby5tb25leSwyKX1gO1xyXG4gICAgICAgIGlmICghdXNlckluZm8udXNlcklkKSB7IC8v5pyq55m75b2V5LiN5pi+56S65oiR55qE5L2Z6aKdXHJcbiAgICAgICAgICAgIHRoaXMuYmFsYW5jZUJveC52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMuZXN0aW1hdGUueSA9IDgwO1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICB0aGlzLmJhbGFuY2VCb3gudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuZXN0aW1hdGUueSA9IDQyO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyDnm5Hop4botYTkuqflj5jliqhcclxuICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5vbignZ2V0VXNlckluZm8nLHRoaXMsKCh1c2VySW5mbzphbnkpPT57XHJcbiAgICAgICAgICAgIHRoaXMuYmFsYW5jZS50ZXh0ID0gYCR7dXRpbHMudG9EZWNpbWFsKHVzZXJJbmZvLm1vbmV5LDIpfSBVU0RUYDtcclxuICAgICAgICAgICAgdGhpcy5teUFtb3VudCA9ICtgJHt1dGlscy50b0RlY2ltYWwodXNlckluZm8ubW9uZXksMil9YDtcclxuICAgICAgICB9KSlcclxuXHJcbiAgICAgICAgLy8g5Y+356CB6KKr6LSt5Lmw5Y+Y5YqoXHJcbiAgICAgICAgR2FtZU1vZGVsLmdldEluc3RhbmNlKCkub24oJ2dldGJ1eUdvb2RzQXJyJyx0aGlzLChnb29kc0FycjphbnkpPT57XHJcbiAgICAgICAgICAgIHRoaXMucmF3RGF0YUFyci5mb3JFYWNoKChpdGVtOmFueSk9PntcclxuICAgICAgICAgICAgICAgIGdvb2RzQXJyLmZvckVhY2goKHY6YW55KT0+e1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpdGVtLmNvZGUgPT09IHYuY29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnVzZXJJZCA9IHYudXNlcklkO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLmJ1eWVySWQgPSB2LnVzZXJJZDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB0aGlzLnByb2dyZXNzU3BlZWQudmFsdWUgPSArYCR7Z29vZHNBcnIubGVuZ3RoIC8gdGhpcy5udW1iZXJMaXN0LmFycmF5Lmxlbmd0aH1gO1xyXG4gICAgICAgICAgICB0aGlzLnNvbGROdW1fc29sZE51bS50ZXh0ID0gYCR7Z29vZHNBcnIubGVuZ3RofS8ke3RoaXMubnVtYmVyTGlzdC5hcnJheS5sZW5ndGh9YDtcclxuICAgICAgICAgICAgdGhpcy5udW1iZXJMaXN0LmFycmF5ID0gdGhpcy5yYXdEYXRhQXJyOyAvL+WPt+eggeWIl+ihqFxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcbiAgICBvbk9wZW5lZChnb29kc0lkOmFueSl7XHJcbiAgICAgICAgdGhpcy5nb29kc0lkID0gZ29vZHNJZDtcclxuICAgICAgICB0aGlzLmdldEdvb2RzRGV0YWlscyh0aGlzLmdvb2RzSWQpO1xyXG4gICAgfVxyXG4gICAgb25EaXNhYmxlKCl7XHJcbiAgICAgICAgLy8gIOWFs+mXrXdlYnNvY2tldOS6i+S7tlxyXG4gICAgICAgIFNvY2tldC5zZW5kV1NQdXNoKGBidXlfJHt0aGlzLl9wZXJpb2R9YCwwKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKui0reS5sCAqL1xyXG4gICAgcHJpdmF0ZSBidXlGdW5jKCk6dm9pZCB7XHJcbiAgICAgICAgaWYgKHRoaXMuZ2V0U2VsZWN0TnVtYmVyKCkgPD0gMCkge1xyXG4gICAgICAgICAgICBUb2FzdC5zaG93KCfor7fpgInmi6notK3kubDlj7fnoIEnKVxyXG4gICAgICAgIH1lbHNlIGlmKHRoaXMudG90YWxQcmljZSA+IHRoaXMubXlBbW91bnQpe1xyXG4gICAgICAgICAgICBUb2FzdC5zaG93KCfkvZnpop3kuI3otrMnKVxyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICB0aGlzLmlucHV0UHdkID0gbmV3IElwdFBzd0RvbSgpXHJcbiAgICAgICAgICAgIHRoaXMuaW5wdXRQd2QucG9wdXAoKTtcclxuICAgICAgICAgICAgdGhpcy5pbnB1dFB3ZC5zZXREYXRhKHsgLy/lj5HpgIHmlbDmja5cclxuICAgICAgICAgICAgICAgIHBlcmlvZDp0aGlzLnBlcmlvZC50ZXh0LFxyXG4gICAgICAgICAgICAgICAgY29kZUxpc3Q6dGhpcy5jb2RlTGlzdCxcclxuICAgICAgICAgICAgICAgIEFsbENvZGVMaXN0OnRoaXMubnVtYmVyTGlzdC5hcnJheVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAvLyDnm5HlkKzovpPlhaXmoYbnu4Tku7bkuovku7ZcclxuICAgICAgICAgICAgdGhpcy5pbnB1dFB3ZC5vbigncmVmcmVzaERhdGEnLHRoaXMsKCk9PntcclxuICAgICAgICAgICAgICAgIHRoaXMuZ2V0R29vZHNEZXRhaWxzKHRoaXMuZ29vZHNJZCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRvdGFsLnRleHQgPSAnMCBVU0RUJztcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiDpgInmi6nmjInpkq7nu4RcclxuICAgICAqIEBwYXJhbSB0eXBlIOmAieaLqeexu+WeiyAgMTrpmo/kuIAgIDLvvJrliY3ljYogM++8muWQjuWNiiA077ya5YWo6YOoXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgc2VsZWN0RnVuYyh0eXBlOm51bWJlcil7XHJcbiAgICAgICAgdGhpcy5yYXdEYXRhQXJyX25ldyA9IHRoaXMucmF3RGF0YUFycjsgLy/liJ3lp4vljJbmlbDnu4RcclxuICAgICAgICB0aGlzLm51bWJlckFyciA9IFtdOy8v5Yid5aeL5YyW5pWw57uEXHJcbiAgICAgICAgdGhpcy5oYWxmQXJyID0gW107Ly/liJ3lp4vljJbmlbDnu4RcclxuXHJcbiAgICAgICAgdGhpcy5yYXdEYXRhQXJyX25ldy5mb3JFYWNoKGl0ZW09PntcclxuICAgICAgICAgICAgaWYgKGl0ZW0uYnV5ZXJJZCA9PT0gJzInKSB7XHJcbiAgICAgICAgICAgICAgICBpdGVtLmJ1eWVySWQgPSAnMCc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGl0ZW0uYnV5ZXJJZCA8PSAyKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm51bWJlckFyci5wdXNoKGl0ZW0uY29kZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGlmICh0eXBlID09PSAxKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmFuZG9tTnVtYmVyKHRoaXMubnVtYmVyQXJyLDEpIC8v6ZqP5LiAXHJcbiAgICAgICAgfWVsc2UgaWYgKHR5cGUgPT09IDIpIHtcclxuICAgICAgICAgICAgdGhpcy5oYWxmQXJyID0gdGhpcy5udW1iZXJBcnIuc2xpY2UoMCxNYXRoLmZsb29yKHRoaXMubnVtYmVyQXJyLmxlbmd0aCAvIDIpKSAgLy/liY3ljYpcclxuICAgICAgICAgICAgdGhpcy5yYW5kb21OdW1iZXIodGhpcy5oYWxmQXJyLDIpXHJcbiAgICAgICAgfWVsc2UgaWYodHlwZSA9PT0gMykge1xyXG4gICAgICAgICAgICB0aGlzLmhhbGZBcnIgPSB0aGlzLm51bWJlckFyci5zbGljZShNYXRoLmZsb29yKHRoaXMubnVtYmVyQXJyLmxlbmd0aCAvIDIpKSAgLy/lkI7ljYpcclxuICAgICAgICAgICAgdGhpcy5yYW5kb21OdW1iZXIodGhpcy5oYWxmQXJyLDIpXHJcbiAgICAgICAgfWVsc2UgaWYodHlwZSA9PT0gNCkge1xyXG4gICAgICAgICAgICB0aGlzLmhhbGZBcnIgPSB0aGlzLm51bWJlckFycjsvL+WFqOmDqFxyXG4gICAgICAgICAgICB0aGlzLnJhbmRvbU51bWJlcih0aGlzLmhhbGZBcnIsMilcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoq5LuO5pWw57uE5Lit6ZqP5py65Y+W5LiA5Liq5pWwXHJcbiAgICAgKiBAcGFyYW0gYXJyIOaVsOaNruWIl+ihqFxyXG4gICAgICogQHBhcmFtIHR5cGUgW+WPr+mAiV0g6ZqP5py657G75Z6LXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgcmFuZG9tTnVtYmVyKGFycjpudW1iZXJbXSx0eXBlPzpudW1iZXIpe1xyXG4gICAgICAgIGNvbnN0IHJhbmQ6bnVtYmVyID0gTWF0aC5mbG9vcigoTWF0aC5yYW5kb20oKSAqIGFyci5sZW5ndGgpKTsgLy/pmo/kuIBcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCBjb2RlID0gYXJyW3JhbmRdO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmICh0eXBlID09PSAxKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmF3RGF0YUFycl9uZXcuZm9yRWFjaChpdGVtID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChpdGVtLmNvZGUgPT09IGNvZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtLmJ1eWVySWQgPSAnMic7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHR5cGUgPT09IDIpIHtcclxuICAgICAgICAgICAgYXJyLmZvckVhY2goZWwgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yYXdEYXRhQXJyX25ldy5mb3JFYWNoKGl0ZW0gPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChlbCA9PT0gaXRlbS5jb2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uYnV5ZXJJZCA9ICcyJztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyB0aGlzLm51bWJlckxpc3QucmVwZWF0WSA9IHRoaXMucmF3RGF0YUFycl9uZXcubGVuZ3RoO1xyXG4gICAgICAgIHRoaXMubnVtYmVyTGlzdC5hcnJheSA9IHRoaXMucmF3RGF0YUFycl9uZXc7XHJcbiAgICAgICAgdGhpcy5nZXRTZWxlY3ROdW1iZXIoKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKuiOt+WPluWVhuWTgeivpuaDhVxyXG4gICAgICogQHBhcmFtIGdvb2RzSWQg5ZWG5ZOBaWRcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBnZXRHb29kc0RldGFpbHMoZ29vZHNJZDpzdHJpbmcpIHtcclxuICAgICAgICBhcGkuZ2V0R29vZHNEZXRhaWxzKGdvb2RzSWQpLnRoZW4oKHJlczphbnkpPT57XHJcblxyXG4gICAgICAgICAgICAvLyAg5Y+R6YCBd2Vic29ja2V05LqL5Lu2XHJcbiAgICAgICAgICAgIHRoaXMuX3BlcmlvZCA9IHJlcy5wZXJpb2Q7XHJcbiAgICAgICAgICAgIFNvY2tldC5zZW5kV1NQdXNoKGBidXlfJHt0aGlzLl9wZXJpb2R9YClcclxuXHJcbiAgICAgICAgICAgIHRoaXMucHJpY2UudGV4dCA9IGAkeytyZXMucHJpY2V9YDtcclxuICAgICAgICAgICAgdGhpcy5nb29kc1ZhbHVlLnRleHQgPSBgJHsrcmVzLmdvb2RzVmFsdWV9IFVTRFRgO1xyXG4gICAgICAgICAgICB0aGlzLnByb2dyZXNzU3BlZWQudmFsdWUgPSArYCR7cmVzLnNvbGROdW0vcmVzLnRvdGFsTnVtfWA7XHJcbiAgICAgICAgICAgIHRoaXMuc29sZE51bV9zb2xkTnVtLnRleHQgPSBgJHtyZXMuc29sZE51bX0vJHtyZXMudG90YWxOdW19YDtcclxuICAgICAgICAgICAgdGhpcy5wZXJpb2QudGV4dCA9IHJlcy5wZXJpb2Q7XHJcbiAgICAgICAgICAgIHRoaXMudW5pdFByaWNlID0gK3Jlcy5wcmljZTtcclxuICAgICAgICAgICAgdGhpcy5yYXdEYXRhQXJyID0gcmVzLmNvZGVMaXN0O1xyXG4gICAgICAgICAgICB0aGlzLm51bWJlckxpc3QuYXJyYXkgPSB0aGlzLnJhd0RhdGFBcnI7IC8v5Y+356CB5YiX6KGoXHJcbiAgICAgICAgICAgIHRoaXMucmFuZG9tX29uZS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgaWYgKHRoaXMubnVtYmVyTGlzdC5hcnJheS5sZW5ndGggPiAyKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJhbmRvbV9hZnRlci52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMucmFuZG9tX2JlZm9yZS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMucmFuZG9tX2FsbC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJhbmRvbV9vbmUud2lkdGggPSAzMDA7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJhbmRvbV9vbmUuY2VudGVyWCA9IDA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5udW1iZXJMaXN0LnJlcGVhdFggPSA1O1xyXG4gICAgICAgICAgICB0aGlzLm51bWJlckxpc3QucmVwZWF0WSA9IDQ7XHJcbiAgICAgICAgICAgIHRoaXMubnVtYmVyTGlzdC5jZWxscy5mb3JFYWNoKChpdGVtOiBMYXlhLlNwcml0ZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaXRlbS5vbihcIkdldEl0ZW1cIiwgdGhpcywgdGhpcy5nZXRTZWxlY3ROdW1iZXIpXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSkuY2F0Y2goKGVycjphbnkpPT57XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyci5tZXNzYWdlKTtcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIC8qKuebkeWQrOe7n+iuoeWIl+ihqOaVsOaNrumAieS4reS4quaVsCAqL1xyXG4gICAgcHJpdmF0ZSBnZXRTZWxlY3ROdW1iZXIoKXtcclxuICAgICAgICB0aGlzLnNlbGVjdE51bWJlciA9IDA7XHJcbiAgICAgICAgdGhpcy5jb2RlTGlzdCA9ICcnO1xyXG4gICAgICAgIHRoaXMubnVtYmVyTGlzdC5hcnJheS5mb3JFYWNoKGl0ZW09PntcclxuICAgICAgICAgICAgaWYgKGl0ZW0uYnV5ZXJJZCA9PT0gJzInKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdE51bWJlciA9IHRoaXMuc2VsZWN0TnVtYmVyICsgMTtcclxuICAgICAgICAgICAgICAgIGxldCBjb2RlU3RyaW5nOnN0cmluZyA9IGAke3RoaXMuY29kZUxpc3R9JHt0aGlzLmNvZGVMaXN0Lmxlbmd0aCA+IDAgPyAnLCc6Jyd9JHtpdGVtLmNvZGV9YDtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29kZUxpc3QgPSAgY29kZVN0cmluZztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgdGhpcy50b3RhbC50ZXh0ID0gdXRpbHMudG9EZWNpbWFsKCh0aGlzLnVuaXRQcmljZSAqIHRoaXMuc2VsZWN0TnVtYmVyKSwyKSArICcgVVNEVCc7XHJcbiAgICAgICAgdGhpcy50b3RhbFByaWNlID0gK3V0aWxzLnRvRGVjaW1hbCgodGhpcy51bml0UHJpY2UgKiB0aGlzLnNlbGVjdE51bWJlciksMik7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzLnNlbGVjdE51bWJlcjtcclxuICAgIH1cclxufSIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0ODoxNlxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0ODoxNlxyXG4gKiBAZGVzYyDpppbpobXohJrmnKxcclxuICovXHJcbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xyXG5pbXBvcnQgeyBUb2FzdCB9IGZyb20gXCIuLi92aWV3L1RvYXN0XCI7XHJcbmltcG9ydCB7IEdhbWVNb2RlbCB9IGZyb20gXCIuLi9qcy9HYW1lTW9kZWxcIjtcclxuaW1wb3J0IHV0aWxzIGZyb20gJy4uL2pzL3V0aWxzJ1xyXG5pbXBvcnQgYXBpIGZyb20gXCIuLi9qcy9hcGlcIjtcclxuXHJcbmltcG9ydCB7IHBvc3QgfSBmcm9tICcuLi9qcy9odHRwJztcclxuaW1wb3J0IHsgU29ja2V0IH0gZnJvbSBcIi4uL2pzL3NvY2tldFwiO1xyXG5pbXBvcnQgeyBUYWJiYXIgfSBmcm9tIFwiLi4vdmlldy9UYWJiYXJcIjtcclxuaW1wb3J0IHJlY2hhcmdlRGlhbG9nIGZyb20gJy4uL3RlbXBsYXRlL3JlY2hhcmdlRGlhbG9nJztcclxuXHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBIb21lIGV4dGVuZHMgdWkuaG9tZVVJIHtcclxuXHJcbiAgICBwcml2YXRlIHJlY2hhcmdlRGlhbG9nOiByZWNoYXJnZURpYWxvZzsvL+WFheWAvOW8ueWHulxyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKClcclxuICAgICAgICB0aGlzLmJ0blJlY2hhcmdlLm9uKExheWEuRXZlbnQuQ0xJQ0ssIHRoaXMsIHRoaXMuYnRuUmVjaGFyZ2VGdW5jKTtcclxuICAgICAgICB0aGlzLmJ1eUhlbHAub24oTGF5YS5FdmVudC5DTElDSywgdGhpcywgdGhpcy5vcGVuQnV5SGVscClcclxuICAgICAgICB0aGlzLnB1dGluLm9uKExheWEuRXZlbnQuQ0xJQ0ssIHRoaXMsIHRoaXMucHV0SW5GdW5jKVxyXG4gICAgICAgIHRoaXMuZ29fY2VudGVyLm9uKExheWEuRXZlbnQuQ0xJQ0ssIHRoaXMsIHRoaXMuZ29DZW50ZXIpXHJcbiAgICB9XHJcbiAgICBvbkVuYWJsZSgpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLmdldFVzZXJJbmZvKClcclxuICAgICAgICB0aGlzLnJhbmtUb2RheSgpXHJcbiAgICAgICAgdGhpcy5nZXRHb29kc0xpc3QoKVxyXG5cclxuICAgICAgICAvLyDnm5Hop4bngavnrq3mlbDmja7lj5jliqhcclxuICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5vbignZ2V0Um9ja2V0RGF0YScsIHRoaXMsIChyZXM6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnJvY2tldEFtb3VudC50ZXh0ID0gYCR7dXRpbHMudG9EZWNpbWFsKHJlcy5wb3RNb25leSwgMil9YFxyXG4gICAgICAgICAgICB1dGlscy5jb3VudERvd24ocmVzLmNvdW50RG93biwgKCh0aW1lKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJvY2tldENvdW50RG93bi50ZXh0ID0gdGltZVxyXG4gICAgICAgICAgICB9KSlcclxuICAgICAgICB9KVxyXG4gICAgICAgIC8vIOaYr+WQpuW8gOWlluS6hu+8jOW8gOWlluWIt+aWsOWVhuWTgeWIl+ihqFxyXG4gICAgICAgIEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLm9uKCdpc1RvZ2dsZScsIHRoaXMsIChyZXM6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmdldEdvb2RzTGlzdCgpXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICB9XHJcblxyXG5cclxuICAgIC8qKuWFheWAvCAqL1xyXG4gICAgcHJpdmF0ZSBidG5SZWNoYXJnZUZ1bmMoKTogdm9pZCB7XHJcbiAgICAgICAgLy8gVG9hc3Quc2hvdygn54K55Ye75YWF5YC8JylcclxuICAgICAgICB0aGlzLnJlY2hhcmdlRGlhbG9nID0gbmV3IHJlY2hhcmdlRGlhbG9nKCk7XHJcbiAgICAgICAgdGhpcy5yZWNoYXJnZURpYWxvZy55ID0gTGF5YS5zdGFnZS5oZWlnaHQgLSB0aGlzLnJlY2hhcmdlRGlhbG9nLmhlaWdodDtcclxuICAgICAgICB0aGlzLnJlY2hhcmdlRGlhbG9nLnBvcHVwRWZmZWN0ID0gTGF5YS5IYW5kbGVyLmNyZWF0ZSh0aGlzLCB0aGlzLnJlY2hhcmdlRGlhbG9nUG9wdXBGdW4pO1xyXG4gICAgICAgIHRoaXMucmVjaGFyZ2VEaWFsb2cuY2xvc2VFZmZlY3QgPSBMYXlhLkhhbmRsZXIuY3JlYXRlKHRoaXMsIHRoaXMucmVjaGFyZ2VEaWFsb2dDbG9zZUZ1bik7XHJcbiAgICAgICAgdGhpcy5yZWNoYXJnZURpYWxvZy5wb3B1cCgpO1xyXG4gICAgfVxyXG4gICAgLyoq56m65oqVICovXHJcbiAgICBwcml2YXRlIHB1dEluRnVuYygpIHtcclxuICAgICAgICAvLyBUYWJiYXIuZ2V0SW5zdGFuY2UoKS5vcGVuU2NlbmUoJ3hjdGouc2NlbmUnKVxyXG4gICAgICAgIFRvYXN0LnNob3coJ+aaguacquW8gOaUvu+8jOaVrOivt+acn+W+hScpXHJcbiAgICB9XHJcblxyXG4gICAgLyoq6I635Y+W5Liq5Lq65L+h5oGvICovXHJcbiAgICBwcml2YXRlIGdldFVzZXJJbmZvKCkge1xyXG4gICAgICAgIGFwaS5nZXRVc2VySW5mbygpLnRoZW4oKHJlczogYW55KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMubmlja05hbWUudGV4dCA9IHJlcy51c2VySW5mby5uaWNrTmFtZVxyXG4gICAgICAgICAgICB0aGlzLm15QW1vdW50LnRleHQgPSBgJHt1dGlscy50b0RlY2ltYWwocmVzLnVzZXJJbmZvLm1vbmV5LCAyKX1gXHJcbiAgICAgICAgICAgIHRoaXMuYXZhdGFyLnNraW4gPSByZXMudXNlckluZm8uYXZhdGFyO1xyXG4gICAgICAgICAgICAvLyDkv53lrZjnlKjmiLfkv6Hmga9cclxuICAgICAgICAgICAgR2FtZU1vZGVsLmdldEluc3RhbmNlKCkuc2V0VXNlckluZm8ocmVzLnVzZXJJbmZvKVxyXG4gICAgICAgICAgICAvLyDov57mjqV3ZWJzb2NrZXRcclxuICAgICAgICAgICAgU29ja2V0LmNyZWF0ZVNvY2tldCgpXHJcbiAgICAgICAgfSkuY2F0Y2goKGVycjogYW55KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyci5tZXNzYWdlKTtcclxuICAgICAgICAgICAgLy8g6I635Y+W5L+h5oGv5aSx6LSl5pu05paw5L+h5oGvXHJcbiAgICAgICAgICAgIEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLnNldFVzZXJJbmZvKHtcclxuICAgICAgICAgICAgICAgIHVzZXJJbmZvOiB7fVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAvLyDov57mjqV3ZWJzb2NrZXRcclxuICAgICAgICAgICAgU29ja2V0LmNyZWF0ZVNvY2tldCgpXHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICAvKirku4rml6XlpKflpZbmsaAgKi9cclxuICAgIHByaXZhdGUgcmFua1RvZGF5KCkge1xyXG4gICAgICAgIGFwaS5nZXRSYW5rVG9kYXkoKS50aGVuKChyZXM6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnJvY2tldEFtb3VudC50ZXh0ID0gYCR7dXRpbHMudG9EZWNpbWFsKHJlcy5wb3RNb25leSwgMil9YFxyXG4gICAgICAgICAgICB1dGlscy5jb3VudERvd24ocmVzLmNvdW50RG93biwgKCh0aW1lKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJvY2tldENvdW50RG93bi50ZXh0ID0gdGltZVxyXG4gICAgICAgICAgICB9KSlcclxuICAgICAgICB9KS5jYXRjaCgoZXJyOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyLm1lc3NhZ2UpO1xyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgLyoq6I635Y+W6aaW6aG15ZWG5ZOB5YiX6KGoICovXHJcbiAgICBwcml2YXRlIGdldEdvb2RzTGlzdCgpIHtcclxuICAgICAgICBhcGkuZ2V0R29vZHNMaXN0KCkudGhlbigocmVzOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5saXN0LnJlcGVhdFggPSByZXMubGlzdC5sZW5ndGg7XHJcbiAgICAgICAgICAgIHRoaXMubGlzdC5hcnJheSA9IHJlcy5saXN0O1xyXG4gICAgICAgIH0pLmNhdGNoKChlcnI6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIubWVzc2FnZSk7XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICAvKirnjqnms5Xku4vnu40gKi9cclxuICAgIHByaXZhdGUgb3BlbkJ1eUhlbHAoKSB7XHJcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSAnaHR0cHM6Ly9tLnh5aGouaW8vYnV5SGVscC5odG1sJztcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdvQ2VudGVyKCkge1xyXG4gICAgICAgIGNvbnN0IGRvbWFpbiA9IGRvY3VtZW50LmRvbWFpbjtcclxuICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IGBodHRwczovLyR7ZG9tYWlufS8jL21haW5fUGFnZWBcclxuICAgIH1cclxuXHJcbiAgICAvKirlvLnlh7rlhYXlgLznmoTmlYjmnpwgKi9cclxuICAgIHJlY2hhcmdlRGlhbG9nUG9wdXBGdW4oZGlhbG9nOiBMYXlhLkRpYWxvZykge1xyXG4gICAgICAgIGRpYWxvZy5zY2FsZSgxLCAxKTtcclxuICAgICAgICBkaWFsb2cuX2VmZmVjdFR3ZWVuID0gTGF5YS5Ud2Vlbi5mcm9tKGRpYWxvZyxcclxuICAgICAgICAgICAgeyB4OiAwLCB5OiBMYXlhLnN0YWdlLmhlaWdodCArIGRpYWxvZy5oZWlnaHQgfSxcclxuICAgICAgICAgICAgMzAwLFxyXG4gICAgICAgICAgICBMYXlhLkVhc2UubGluZWFyTm9uZSxcclxuICAgICAgICAgICAgTGF5YS5IYW5kbGVyLmNyZWF0ZShMYXlhLkRpYWxvZy5tYW5hZ2VyLCBMYXlhLkRpYWxvZy5tYW5hZ2VyLmRvT3BlbiwgW2RpYWxvZ10pLCAwLCBmYWxzZSwgZmFsc2UpO1xyXG4gICAgfVxyXG4gICAgLyoq5YWz6Zet5YWF5YC855qE5pWI5p6cICovXHJcbiAgICByZWNoYXJnZURpYWxvZ0Nsb3NlRnVuKGRpYWxvZzogTGF5YS5EaWFsb2cpIHtcclxuICAgICAgICBkaWFsb2cuX2VmZmVjdFR3ZWVuID0gTGF5YS5Ud2Vlbi50byhkaWFsb2csXHJcbiAgICAgICAgICAgIHsgeDogMCwgeTogTGF5YS5zdGFnZS5oZWlnaHQgKyBkaWFsb2cuaGVpZ2h0IH0sXHJcbiAgICAgICAgICAgIDMwMCxcclxuICAgICAgICAgICAgTGF5YS5FYXNlLmxpbmVhck5vbmUsXHJcbiAgICAgICAgICAgIExheWEuSGFuZGxlci5jcmVhdGUoTGF5YS5EaWFsb2cubWFuYWdlciwgTGF5YS5EaWFsb2cubWFuYWdlci5kb0Nsb3NlLCBbZGlhbG9nXSksIDAsIGZhbHNlLCBmYWxzZSk7XHJcbiAgICB9XHJcbn0iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDg6MjhcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDg6MjhcclxuICogQGRlc2Mg6K6w5b2V6aG16Z2i6ISa5pysXHJcbiAqL1xyXG5pbXBvcnQgeyB1aSB9IGZyb20gJy4uL3VpL2xheWFNYXhVSSdcclxuaW1wb3J0IGFwaSBmcm9tICcuLi9qcy9hcGknO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVjb3JkIGV4dGVuZHMgdWkucmVjb3JkVUkge1xyXG4gICAgY29uc3RydWN0b3IoKXtcclxuICAgICAgICBzdXBlcigpXHJcblxyXG4gICAgICAgIHRoaXMuY2FueXUub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMudGFiU3dpdGNoLFsxXSlcclxuICAgICAgICB0aGlzLndhbmdxaS5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy50YWJTd2l0Y2gsWzJdKVxyXG4gICAgICAgIHRoaXMub24oTGF5YS5FdmVudC5SRVNJWkUsdGhpcyx0aGlzLm9uUmVzaXplKVxyXG4gICAgfVxyXG5cclxuICAgIG9uRW5hYmxlKCk6dm9pZHtcclxuICAgICAgICB0aGlzLmdldE15T3JkZXJzKCk7XHJcbiAgICAgICAgdGhpcy5nZXRHb29kc0hpc3RvcnkoKTtcclxuICAgIH1cclxuXHJcbiAgICAvKirojrflj5blj4LkuI7orrDlvZUgKi9cclxuICAgIHByaXZhdGUgZ2V0TXlPcmRlcnMocGFnZT86bnVtYmVyKXtcclxuICAgICAgICBhcGkuZ2V0TXlPcmRlcnMocGFnZSkudGhlbigocmVzOmFueSk9PntcclxuICAgICAgICAgICAgdGhpcy5qb2luTGlzdC5yZXBlYXRZID0gcmVzLmxlbmd0aDtcclxuICAgICAgICAgICAgdGhpcy5qb2luTGlzdC5hcnJheSA9IHJlcztcclxuICAgICAgICAgICAgdGhpcy5qb2luTGlzdC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICB9KS5jYXRjaCgoZXJyOmFueSk9PntcclxuICAgICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyci5tZXNzYWdlKTtcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG4gICAgLyoq6I635Y+W5b6A5pyf6K6w5b2VICovXHJcbiAgICBwcml2YXRlIGdldEdvb2RzSGlzdG9yeShwYWdlPzpudW1iZXIpe1xyXG4gICAgICAgIGFwaS5nZXRHb29kc0hpc3RvcnkocGFnZSkudGhlbigocmVzOmFueSk9PntcclxuICAgICAgICAgICAgdGhpcy5wcmV2aW9vdXNMaXN0LnJlcGVhdFkgPSByZXMubGVuZ3RoO1xyXG4gICAgICAgICAgICB0aGlzLnByZXZpb291c0xpc3QuYXJyYXkgPSByZXM7XHJcbiAgICAgICAgfSkuY2F0Y2goKGVycjphbnkpPT57XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyci5tZXNzYWdlKTtcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5YiH5o2i6K6w5b2V5YiX6KGoXHJcbiAgICAgKiBAcGFyYW0gdHlwZSAxOuWPguS4juiusOW9lSAgMu+8muW+gOacn+iusOW9lVxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIHRhYlN3aXRjaCh0eXBlOm51bWJlcil7XHJcbiAgICAgICAgaWYgKHR5cGUgPT09IDEpIHtcclxuICAgICAgICAgICAgdGhpcy5jYW55dS5za2luID0gJ2NvbXAvZ3Vlc3NpbmcvaW1nX3RhYl9hY3RpdmUucG5nJztcclxuICAgICAgICAgICAgdGhpcy53YW5ncWkuc2tpbiA9ICdjb21wL2d1ZXNzaW5nL2ltZ190YWIucG5nJztcclxuICAgICAgICAgICAgdGhpcy5nZXRNeU9yZGVycygpXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmpvaW5MaXN0LmFycmF5ID09PSBudWxsIHx8IHRoaXMuam9pbkxpc3QuYXJyYXkubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgfWVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5qb2luTGlzdC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLnByZXZpb291c0xpc3Quc2Nyb2xsVG8oMClcclxuICAgICAgICAgICAgdGhpcy5wcmV2aW9vdXNMaXN0LnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgdGhpcy53YW5ncWkuc2tpbiA9ICdjb21wL2d1ZXNzaW5nL2ltZ190YWJfYWN0aXZlLnBuZyc7XHJcbiAgICAgICAgICAgIHRoaXMuY2FueXUuc2tpbiA9ICdjb21wL2d1ZXNzaW5nL2ltZ190YWIucG5nJztcclxuICAgICAgICAgICAgdGhpcy5nZXRHb29kc0hpc3RvcnkoKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMucHJldmlvb3VzTGlzdC5hcnJheSA9PT0gbnVsbCB8fCB0aGlzLnByZXZpb291c0xpc3QuYXJyYXkubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgfWVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wcmV2aW9vdXNMaXN0LnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuam9pbkxpc3Quc2Nyb2xsVG8oMCk7XHJcbiAgICAgICAgICAgIHRoaXMuam9pbkxpc3QudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKirnm5Hop4blsY/luZXlpKflsI/lj5jljJYgKi9cclxuICAgIG9uUmVzaXplKCl7XHJcbiAgICAgICAgLy/liJfooajpq5jluqbpgILphY0gPSDlsY/luZXpq5jluqYgLSAoYmFubmVyICsgdGFiYmFyKVxyXG4gICAgICAgIHRoaXMuam9pbkxpc3QuaGVpZ2h0ID0gdGhpcy5oZWlnaHQgLSA0MzA7XHJcbiAgICAgICAgdGhpcy5wcmV2aW9vdXNMaXN0LmhlaWdodCA9IHRoaXMuaGVpZ2h0IC0gNDMwO1xyXG4gICAgfVxyXG59IiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTIwIDEwOjI3OjI1XHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTIwIDEwOjI3OjI1XHJcbiAqIEBkZXNjIOeBq+eureWkp+WllumhtemdolxyXG4gKi9cclxuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XHJcbmltcG9ydCB7IGdldCB9IGZyb20gXCIuLi9qcy9odHRwXCI7XHJcbmltcG9ydCB1dGlscyBmcm9tIFwiLi4vanMvdXRpbHNcIjtcclxuaW1wb3J0IGFwaSBmcm9tIFwiLi4vanMvYXBpXCI7XHJcbmltcG9ydCB7IFRhYmJhciB9IGZyb20gXCIuLi92aWV3L1RhYmJhclwiO1xyXG5pbXBvcnQgeyBHYW1lTW9kZWwgfSBmcm9tIFwiLi4vanMvR2FtZU1vZGVsXCI7XHJcblxyXG4gZXhwb3J0IGRlZmF1bHQgY2xhc3MgZ3JhbmRQcml4IGV4dGVuZHMgdWkuZ3JhbmRQcml4VUkge1xyXG4gICAgIGNvbnN0cnVjdG9yKCl7XHJcbiAgICAgICAgIHN1cGVyKClcclxuICAgICAgICAgdGhpcy5yYW5rUHJpemVIZWxwLm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLm9wZW5SYW5rUHJpemVIZWxwKVxyXG4gICAgICAgICB0aGlzLmJ0bl9oaXN0b3J5Lm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLkJ0bmhpc3RvcnkpXHJcbiAgICAgfVxyXG5cclxuICAgICBvbkVuYWJsZSgpe1xyXG4gICAgICAgIHRoaXMuZ2V0UmFua1RvZGF5KClcclxuICAgICAgICAvLyDnm5Hop4bngavnrq3mlbDmja7lj5jliqhcclxuICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5vbignZ2V0Um9ja2V0RGF0YScsdGhpcywocmVzOmFueSkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmJvbnVzLnRleHQgPSBgJHt1dGlscy50b0RlY2ltYWwocmVzLnBvdE1vbmV5LDIpfWAgXHJcbiAgICAgICAgICAgIHV0aWxzLmNvdW50RG93bihyZXMuY291bnREb3duLCgodGltZSk9PntcclxuICAgICAgICAgICAgICAgIHRoaXMuQ291bnREb3duLnRleHQgPSB0aW1lXHJcbiAgICAgICAgICAgIH0pKVxyXG4gICAgICAgIH0pXHJcbiAgICAgfVxyXG5cclxuICAgICAvKirojrflj5blpKflpZbkv6Hmga8gKi9cclxuICAgIHByaXZhdGUgZ2V0UmFua1RvZGF5KCl7XHJcbiAgICAgICAgYXBpLmdldFJhbmtUb2RheSgpLnRoZW4oKHJlczphbnkpPT57XHJcbiAgICAgICAgICAgIHRoaXMuYm9udXMudGV4dCA9IGAke3V0aWxzLnRvRGVjaW1hbChyZXMucG90TW9uZXksMil9YCBcclxuICAgICAgICAgICAgdXRpbHMuY291bnREb3duKHJlcy5jb3VudERvd24sKCh0aW1lKT0+e1xyXG4gICAgICAgICAgICAgICAgdGhpcy5Db3VudERvd24udGV4dCA9IHRpbWVcclxuICAgICAgICAgICAgfSkpXHJcbiAgICAgICAgICAgIGlmIChyZXMubGlzdC5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubm9EYXRhLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8v56ys5LiA5ZCNXHJcbiAgICAgICAgICAgIGlmIChyZXMubGlzdC5saXN0MS5kYXRhLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYm94MS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYWxvbmUxLnRleHQgPSBg54us5b6XICR7dXRpbHMudG9EZWNpbWFsKHJlcy5saXN0Lmxpc3QxLmRpdmlkbW9uZXksMil9IFVTRFRgXHJcbiAgICAgICAgICAgICAgICB0aGlzLlByb3BvcnRpb24xLnRleHQgPSBg5Y2g5aWW5rGgJHtyZXMubGlzdC5saXN0MS5wZXJjZW50fWBcclxuICAgICAgICAgICAgICAgIHRoaXMucHJpeExpc3QxLmFycmF5ID0gcmVzLmxpc3QubGlzdDEuZGF0YVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIDItNeWQjVxyXG4gICAgICAgICAgICBpZiAocmVzLmxpc3QubGlzdDIuZGF0YS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJveDIudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFsb25lMi50ZXh0ID0gYOavj+S6uiAke3V0aWxzLnRvRGVjaW1hbChyZXMubGlzdC5saXN0Mi5kaXZpZG1vbmV5LzQsMil9IFVTRFRgXHJcbiAgICAgICAgICAgICAgICB0aGlzLlByb3BvcnRpb24yLnRleHQgPSBg5Y2g5aWW5rGgJHtyZXMubGlzdC5saXN0Mi5wZXJjZW50fWBcclxuICAgICAgICAgICAgICAgIHRoaXMucHJpeExpc3QyLmFycmF5ID0gcmVzLmxpc3QubGlzdDIuZGF0YVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIDUtMTXlkI1cclxuICAgICAgICAgICAgaWYgKHJlcy5saXN0Lmxpc3QzLmRhdGEubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ib3gzLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hbG9uZTMudGV4dCA9IGDmr4/kurogJHt1dGlscy50b0RlY2ltYWwocmVzLmxpc3QubGlzdDMuZGl2aWRtb25leS8xMCwyKX0gVVNEVGBcclxuICAgICAgICAgICAgICAgIHRoaXMuUHJvcG9ydGlvbjMudGV4dCA9IGDljaDlpZbmsaAke3Jlcy5saXN0Lmxpc3QzLnBlcmNlbnR9YFxyXG4gICAgICAgICAgICAgICAgdGhpcy5wcml4TGlzdDMuYXJyYXkgPSByZXMubGlzdC5saXN0My5kYXRhXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy/mnKrnmbvlvZXliJnkuI3mmL7npLrkuKrkurrmjpLlkI1cclxuICAgICAgICAgICAgaWYgKHJlcy5saXN0LnNlbGYudXNlcklkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm15UmFua0JveC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMubXlyYW5raW5nLnRleHQgPSByZXMubGlzdC5zZWxmLnJhbmsgPiAxNSA/ICcxNSsnIDogYCR7cmVzLmxpc3Quc2VsZi5yYW5rfWA7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmF2YXRhci5za2luID0gcmVzLmxpc3Quc2VsZi5hdmF0YXI7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5pY2tOYW1lLnRleHQgPSByZXMubGlzdC5zZWxmLm5pY2tOYW1lO1xyXG4gICAgICAgICAgICAgICAgdGhpcy51aWQudGV4dCA9IHJlcy5saXN0LnNlbGYudXNlcklkO1xyXG4gICAgICAgICAgICAgICAgdGhpcy52b2x1bWUudGV4dCA9IGAke3V0aWxzLnRvRGVjaW1hbChyZXMubGlzdC5zZWxmLmNvbnN1bSwyKX0gVVNEVGBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pLmNhdGNoKChlcnI6YW55KT0+e1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIubWVzc2FnZSk7XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIEJ0bmhpc3RvcnkoKXtcclxuICAgICAgICBUYWJiYXIuZ2V0SW5zdGFuY2UoKS5vcGVuU2NlbmUoJ3ByaUhpc3RvcnlTY2VuZS5zY2VuZScpXHJcbiAgICB9XHJcblxyXG4gICAgLyoq6K+05piOICovXHJcbiAgICBwcml2YXRlIG9wZW5SYW5rUHJpemVIZWxwKCl7XHJcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSAnaHR0cHM6Ly9tLnh5aGouaW8vcmFua1ByaXplSGVscC5odG1sJztcclxuICAgIH1cclxuIH0gIiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTIwIDEwOjI3OjI1XHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTIwIDEwOjI3OjI1XHJcbiAqIEBkZXNjIOeBq+eureWkp+WlluWOhuWPsuiusOW9lemhtemdolxyXG4gKi9cclxuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XHJcbmltcG9ydCB1dGlscyBmcm9tIFwiLi4vanMvdXRpbHNcIjtcclxuaW1wb3J0IGFwaSBmcm9tIFwiLi4vanMvYXBpXCI7XHJcbmltcG9ydCB7IFRhYmJhciB9IGZyb20gXCIuLi92aWV3L1RhYmJhclwiO1xyXG5cclxuIGV4cG9ydCBkZWZhdWx0IGNsYXNzIGdyYW5kUHJpeCBleHRlbmRzIHVpLnByaUhpc3RvcnlTY2VuZVVJIHtcclxuICAgICBjb25zdHJ1Y3Rvcigpe1xyXG4gICAgICAgICBzdXBlcigpXHJcbiAgICAgfVxyXG5cclxuICAgICBvbkVuYWJsZSgpe1xyXG4gICAgICAgIHRoaXMuZ2V0UmFua0hpc3RvcnkoKVxyXG4gICAgIH1cclxuXHJcbiAgICAgLyoq6I635Y+W5aSn5aWW5L+h5oGvICovXHJcbiAgICBwcml2YXRlIGdldFJhbmtIaXN0b3J5KCl7XHJcbiAgICAgICAgYXBpLmdldFJhbmtIaXN0b3J5KCkudGhlbigocmVzOmFueSk9PntcclxuICAgICAgICAgICAgdGhpcy50b3RhbC50ZXh0ID0gYOaAu+WllumHkToke3V0aWxzLnRvRGVjaW1hbChyZXMucG90TW9uZXksMil9IFVTRFRgXHJcbiAgICAgICAgICAgIGlmIChyZXMubGlzdC5saXN0MS5kYXRhLmxlbmd0aCA9PT0gMCAmJiByZXMubGlzdC5saXN0Mi5kYXRhLmxlbmd0aCA9PT0gMCAmJiByZXMubGlzdC5saXN0My5kYXRhLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5saXN0Qm94LnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHRoaXMubm9EYXRhLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8v56ys5LiA5ZCNXHJcbiAgICAgICAgICAgIGlmIChyZXMubGlzdC5saXN0MS5kYXRhLmxlbmd0aCA+IDApIHsgIFxyXG4gICAgICAgICAgICAgICAgdGhpcy5saXN0Qm94LnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ib3gxLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hbG9uZTEudGV4dCA9IGDni6zlvpcgJHt1dGlscy50b0RlY2ltYWwocmVzLmxpc3QubGlzdDEuZGl2aWRtb25leSwyKX0gVVNEVGBcclxuICAgICAgICAgICAgICAgIHRoaXMuUHJvcG9ydGlvbjEudGV4dCA9IGDljaDlpZbmsaAke3Jlcy5saXN0Lmxpc3QxLnBlcmNlbnR9YFxyXG4gICAgICAgICAgICAgICAgdGhpcy5wcml4TGlzdDEuYXJyYXkgPSByZXMubGlzdC5saXN0MS5kYXRhXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gMi015ZCNXHJcbiAgICAgICAgICAgIGlmIChyZXMubGlzdC5saXN0Mi5kYXRhLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubGlzdEJveC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYm94Mi52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYWxvbmUyLnRleHQgPSBg5q+P5Lq6ICR7dXRpbHMudG9EZWNpbWFsKHJlcy5saXN0Lmxpc3QyLmRpdmlkbW9uZXkvNCwyKX0gVVNEVGBcclxuICAgICAgICAgICAgICAgIHRoaXMuUHJvcG9ydGlvbjIudGV4dCA9IGDljaDlpZbmsaAke3Jlcy5saXN0Lmxpc3QyLnBlcmNlbnR9YFxyXG4gICAgICAgICAgICAgICAgdGhpcy5wcml4TGlzdDIuYXJyYXkgPSByZXMubGlzdC5saXN0Mi5kYXRhXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgIC8vIDUtMTXlkI1cclxuICAgICAgICAgICAgIGlmIChyZXMubGlzdC5saXN0My5kYXRhLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubGlzdEJveC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYm94My52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYWxvbmUzLnRleHQgPSBg5q+P5Lq6ICR7dXRpbHMudG9EZWNpbWFsKHJlcy5saXN0Lmxpc3QzLmRpdmlkbW9uZXkvMTAsMil9IFVTRFRgXHJcbiAgICAgICAgICAgICAgICB0aGlzLlByb3BvcnRpb24zLnRleHQgPSBg5Y2g5aWW5rGgJHtyZXMubGlzdC5saXN0My5wZXJjZW50fWBcclxuICAgICAgICAgICAgICAgIHRoaXMucHJpeExpc3QzLmFycmF5ID0gcmVzLmxpc3QubGlzdDMuZGF0YVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSkuY2F0Y2goKGVycjphbnkpPT57XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyci5tZXNzYWdlKTtcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG4gfSAiLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjYgMTE6MDc6MzlcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjYgMTE6MDc6MzlcclxuICogQGRlc2Mg5YWl5Zu05ZCN5Y2VXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XHJcbmltcG9ydCB7IFRhYmJhciB9IGZyb20gXCIuLi92aWV3L1RhYmJhclwiO1xyXG5pbXBvcnQgYXBpIGZyb20gXCIuLi9qcy9hcGlcIjtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNob3J0TGlzdGVkIGV4dGVuZHMgdWkuc2hvcnRMaXN0ZWRVSSB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpXHJcbiAgICAgICAgdGhpcy5vbihMYXlhLkV2ZW50LlJFU0laRSwgdGhpcywgdGhpcy5vblJlc2l6ZSlcclxuICAgIH1cclxuXHJcbiAgICBvbkVuYWJsZSgpIHtcclxuICAgICAgICB0aGlzLmdldFNob3J0TGlzdGVkKClcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRTaG9ydExpc3RlZChwYWdlPzogbnVtYmVyKSB7XHJcbiAgICAgICAgYXBpLmdldFNob3J0TGlzdGVkKHBhZ2UpLnRoZW4oKHJlczogYW55KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuc2hvcnRMaXN0LnJlcGVhdFkgPSByZXMubGVuZ3RoO1xyXG4gICAgICAgICAgICB0aGlzLnNob3J0TGlzdC5hcnJheSA9IHJlcztcclxuICAgICAgICAgICAgdGhpcy5zaG9ydExpc3QudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgfSkuY2F0Y2goKGVycjogYW55KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMubm9EYXRhLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIubWVzc2FnZSk7XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuICAgIC8qKuebkeinhuWxj+W5leWkp+Wwj+WPmOWMliAqL1xyXG4gICAgb25SZXNpemUoKSB7XHJcbiAgICAgICAgLy/liJfooajpq5jluqbpgILphY1cclxuICAgICAgICAvLyB0aGlzLnNob3J0TGlzdC5oZWlnaHQgPSB0aGlzLmhlaWdodCAtIDEwMDtcclxuICAgIH1cclxufVxyXG4iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjYgMTA6MjA6MTVcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjYgMTA6MjA6MTVcclxuICogQGRlc2Mg5Zac5LuO5aSp6ZmN5Lit5aWW5ZCN5Y2VXHJcbiAqL1xyXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcclxuaW1wb3J0IGFwaSBmcm9tIFwiLi4vanMvYXBpXCI7XHJcbmltcG9ydCB7IFRvYXN0IH0gZnJvbSBcIi4uL3ZpZXcvVG9hc3RcIjtcclxuaW1wb3J0IHsgVGFiYmFyIH0gZnJvbSBcIi4uL3ZpZXcvVGFiYmFyXCI7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBXaW5uaW5nIGV4dGVuZHMgdWkueGN0alVJIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKClcclxuICAgICAgICB0aGlzLmJ0bl9zaG9ydGxpc3Qub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuU2hvcnRMaXN0RnVuYylcclxuICAgICAgICB0aGlzLm9uKExheWEuRXZlbnQuUkVTSVpFLHRoaXMsdGhpcy5vblJlc2l6ZSlcclxuICAgIH1cclxuXHJcbiAgICBvbkVuYWJsZSgpe1xyXG4gICAgICAgIHRoaXMuZ2V0WGN0akxpc3QoKVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBwcml2YXRlIGdldFhjdGpMaXN0KHBhZ2U/Om51bWJlcil7XHJcbiAgICAgICAgYXBpLmdldFhjdGpMaXN0KHBhZ2UpLnRoZW4oKHJlczphbnkpPT57XHJcbiAgICAgICAgICAgIHRoaXMud2lubmluZ0xpc3QucmVwZWF0WSA9IHJlcy5sZW5ndGg7XHJcbiAgICAgICAgICAgIHRoaXMud2lubmluZ0xpc3QuYXJyYXkgPSByZXM7XHJcbiAgICAgICAgICAgIHRoaXMud2lubmluZ0xpc3QudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgfSkuY2F0Y2goKGVycjphbnkpPT57XHJcbiAgICAgICAgICAgIHRoaXMubm9EYXRhLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIubWVzc2FnZSk7XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuICAgIFxyXG4gICAgLyoq5p+l55yL5LuK5pel5YWl5Zu05ZCN5Y2VICovXHJcbiAgICBwcml2YXRlIFNob3J0TGlzdEZ1bmMoKXtcclxuICAgICAgICBUYWJiYXIuZ2V0SW5zdGFuY2UoKS5vcGVuU2NlbmUoJ3Nob3J0TGlzdGVkLnNjZW5lJylcclxuICAgIH1cclxuXHJcbiAgICAvKirnm5Hop4blsY/luZXlpKflsI/lj5jljJYgKi9cclxuICAgIG9uUmVzaXplKCl7XHJcbiAgICAgICAgLy/liJfooajpq5jluqbpgILphY0gPSDlsY/luZXpq5jluqYgLSBiYW5uZXJcclxuICAgICAgICB0aGlzLndpbm5pbmdMaXN0LmhlaWdodCA9IHRoaXMuaGVpZ2h0IC0gNjAwO1xyXG4gICAgfVxyXG59XHJcbiIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0ODo0MFxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0ODo0MFxyXG4gKiBAZGVzYyDlj4LkuI7orrDlvZXohJrmnKxcclxuICovXHJcbmltcG9ydCB7IHVpIH0gZnJvbSAnLi4vdWkvbGF5YU1heFVJJ1xyXG5pbXBvcnQgdXRpbHMgZnJvbSAnLi4vanMvdXRpbHMnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3Mgam9pblJlY29yZCBleHRlbmRzIHVpLnRlbXBsYXRlLmpvaW5SZWNvcmRzVUkge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoKVxyXG4gICAgfVxyXG4gICAgc2V0IGRhdGFTb3VyY2UoaXRlbTogYW55KSB7XHJcbiAgICAgICAgdGhpcy5fZGF0YVNvdXJjZSA9IGl0ZW07XHJcblxyXG4gICAgICAgIGlmIChpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMucGVyaW9kLnRleHQgPSBpdGVtLnBlcmlvZDtcclxuICAgICAgICAgICAgdGhpcy5nb29kc1ZhbHVlLnRleHQgPSBgJHsrdXRpbHMudG9EZWNpbWFsKGl0ZW0uZ29vZHNWYWx1ZSwyKX1gO1xyXG4gICAgICAgICAgICB0aGlzLmNvZGVMaXN0LnRleHQgPSBpdGVtLmNvZGVMaXN0Lmxlbmd0aCA+IDM4ID8gYCR7aXRlbS5jb2RlTGlzdC5zdWJzdHIoMCwzOCl9Li4uYCA6IGl0ZW0uY29kZUxpc3Q7XHJcblxyXG4gICAgICAgICAgICBpZiAoaXRlbS5zdGF0dXMgPT09ICcwJykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ub1ByaXplLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ub1ByaXplLnRleHQgPSAn5pyq5byA5aWWJztcclxuICAgICAgICAgICAgICAgIHRoaXMub3BlblRpbWUudGV4dCA9ICctJztcclxuICAgICAgICAgICAgICAgIHRoaXMuaGl0Q29kZS50ZXh0ID0gJy0nO1xyXG4gICAgICAgICAgICB9ZWxzZSBpZihpdGVtLnN0YXR1cyA9PT0gJzEnKXtcclxuICAgICAgICAgICAgICAgIHRoaXMubm9Qcml6ZS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMubm9Qcml6ZS50ZXh0ID0gJ+W8gOWlluS4rSc7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9wZW5UaW1lLnRleHQgPSAnLSc7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhpdENvZGUudGV4dCA9ICctJztcclxuICAgICAgICAgICAgfWVsc2UgaWYoaXRlbS5zdGF0dXMgPT09ICcyJyAmJiAhaXRlbS5oaXQpe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ub1ByaXplLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ub1ByaXplLnRleHQgPSAn5pyq5Lit5aWWJztcclxuICAgICAgICAgICAgICAgIHRoaXMub3BlblRpbWUudGV4dCA9IHV0aWxzLmZvcm1hdERhdGVUaW1lKGl0ZW0ub3BlblRpbWUpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaXRDb2RlLnRleHQgPSBpdGVtLmhpdENvZGU7XHJcbiAgICAgICAgICAgIH1lbHNlIGlmKGl0ZW0uc3RhdHVzID09PSAnMicgJiYgaXRlbS5oaXQpe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wcml6ZS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMub3BlblRpbWUudGV4dCA9IHV0aWxzLmZvcm1hdERhdGVUaW1lKGl0ZW0ub3BlblRpbWUpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaXRDb2RlLnRleHQgPSBpdGVtLmhpdENvZGU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmF3YXJkLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hd2FyZC50ZXh0ID0gYCR7K3V0aWxzLnRvRGVjaW1hbChpdGVtLmF3YXJkLDIpfSBVU0RUYDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0ODo1MFxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0ODo1MFxyXG4gKiBAZGVzYyDotK3kubDpobXpnaLlj7fnoIHliJfooajohJrmnKxcclxuICovXHJcbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xyXG5pbXBvcnQgeyBUb2FzdCB9IGZyb20gXCIuLi92aWV3L1RvYXN0XCI7XHJcbmltcG9ydCB7IEdhbWVNb2RlbCB9IGZyb20gXCIuLi9qcy9HYW1lTW9kZWxcIjtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIG51bWJlckxpc3RET00gZXh0ZW5kcyB1aS50ZW1wbGF0ZS5udW1iZXJMaXN0RE9NVUkge1xyXG4gICAgcHJpdmF0ZSB1c2VySWQ6c3RyaW5nID0gJyc7XHJcblxyXG4gICAgY29uc3RydWN0b3IoKXtcclxuICAgICAgICBzdXBlcigpXHJcbiAgICAgICAgdGhpcy5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5jbGlja051bWJlcilcclxuICAgIH1cclxuICAgIHNldCBkYXRhU291cmNlKGl0ZW06IGFueSkge1xyXG4gICAgICAgIHRoaXMuX2RhdGFTb3VyY2UgPSBpdGVtO1xyXG4gICAgICAgIGlmIChpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29kZS50ZXh0ID0gaXRlbS5jb2RlO1xyXG4gICAgICAgICAgICB0aGlzLmJnSW1nLnNraW4gPSB0aGlzLnJldHVyblN0YXR1c0ltZyhpdGVtLmJ1eWVySWQpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIG9uRW5hYmxlKCl7XHJcbiAgICAgICAgLy/ojrflj5bnlKjmiLfotYTkuqdcclxuICAgICAgICBjb25zdCB1c2VySW5mbzphbnkgPSBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS51c2VySW5mbztcclxuICAgICAgICB0aGlzLnVzZXJJZCA9IHVzZXJJbmZvLnVzZXJJZDtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIOmAieaLqeWPt+eggVxyXG4gICAgICogQHBhcmFtIGl0ZW0g5b2T5YmN5oyJ6ZKuXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgY2xpY2tOdW1iZXIoaXRlbTphbnkpOnZvaWQge1xyXG4gICAgICAgIGlmICgrdGhpcy5fZGF0YVNvdXJjZS5idXllcklkID4gMTApIHsgLy/nlKjmiLdpZOW/heWkp+S6jjEw77yM5L2c5Li65Yik5pat5L6d5o2uXHJcbiAgICAgICAgICAgIFRvYXN0LnNob3coJ+ivpeWPt+eggeW3suiiq+i0reS5sCcpXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9ZWxzZSBpZih0aGlzLl9kYXRhU291cmNlLmJ1eWVySWQgPT09ICcwJyl7XHJcbiAgICAgICAgICAgIHRoaXMuYmdJbWcuc2tpbiA9IHRoaXMucmV0dXJuU3RhdHVzSW1nKCcyJylcclxuICAgICAgICAgICAgdGhpcy5fZGF0YVNvdXJjZS5idXllcklkID0gJzInO1xyXG4gICAgICAgIH1lbHNlIGlmKHRoaXMuX2RhdGFTb3VyY2UuYnV5ZXJJZCA9PT0gJzInKXtcclxuICAgICAgICAgICAgdGhpcy5iZ0ltZy5za2luID0gdGhpcy5yZXR1cm5TdGF0dXNJbWcoJzAnKVxyXG4gICAgICAgICAgICB0aGlzLl9kYXRhU291cmNlLmJ1eWVySWQgPSAnMCc7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuZXZlbnQoXCJHZXRJdGVtXCIpO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIOagueaNrueKtuaAgei/lOWbnuWvueW6lOWbvueJh1xyXG4gICAgICogQHBhcmFtIGJ1eWVySWQgIDDvvJrlj6/pgIkgMu+8mumAieS4rSDlpKfkuo4xMDrkuI3lj6/pgIkgIOetieS6juiHquW3sXVzZXJJZO+8muW3sumAiVxyXG4gICAgICogXHJcbiAgICAqL1xyXG4gICAgcHJpdmF0ZSByZXR1cm5TdGF0dXNJbWcoYnV5ZXJJZDpzdHJpbmcpe1xyXG4gICAgICAgIGlmIChidXllcklkID09PSB0aGlzLnVzZXJJZCkge1xyXG4gICAgICAgICAgICByZXR1cm4gJ2NvbXAvaW1nX3lpeHVhbl9zZWxlY3QyMC5wbmcnXHJcbiAgICAgICAgfWVsc2UgaWYoK2J1eWVySWQgPiAxMCl7IC8v55So5oi3aWTlv4XlpKfkuo4xMO+8jOS9nOS4uuWIpOaWreS+neaNrlxyXG4gICAgICAgICAgICByZXR1cm4gJ2NvbXAvaW1nX25vX3NlbGVjdDIwLnBuZydcclxuICAgICAgICB9ZWxzZSBpZihidXllcklkID09PSAnMicpIHtcclxuICAgICAgICAgICAgcmV0dXJuICdjb21wL2ltZ19va19zZWxlY3QyMC5wbmcnXHJcbiAgICAgICAgfWVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gJ2NvbXAvaW1nX2tleHVhbl9zZWxlY3QyMC5wbmcnXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIFxyXG59IiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ5OjA4XHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ5OjA4XHJcbiAqIEBkZXNjIOW+gOacn+iusOW9leiEmuacrFxyXG4gKi9cclxuaW1wb3J0IHsgdWkgfSBmcm9tICcuLi91aS9sYXlhTWF4VUknXHJcbmltcG9ydCB1dGlscyBmcm9tICcuLi9qcy91dGlscyc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBwcmV2aW91c1JlY29yZCBleHRlbmRzIHVpLnRlbXBsYXRlLnByZXZpb3VzUmVjb3Jkc1VJIHtcclxuICAgIGNvbnN0cnVjdG9yKCl7XHJcbiAgICAgICAgc3VwZXIoKVxyXG4gICAgICAgIHRoaXMudHhIYXNoLm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLnNlZUhhc2gpXHJcbiAgICB9XHJcbiAgICBzZXQgZGF0YVNvdXJjZShpdGVtOiBhbnkpIHtcclxuICAgICAgICB0aGlzLl9kYXRhU291cmNlID0gaXRlbTtcclxuICAgICAgICBpZiAoaXRlbSkge1xyXG4gICAgICAgICAgICB0aGlzLnBlcmlvZC50ZXh0ID0gaXRlbS5wZXJpb2Q7XHJcbiAgICAgICAgICAgIHRoaXMucmVxdWVzdFR5cGUudGV4dCA9IGl0ZW0ucmVxdWVzdFR5cGU7XHJcbiAgICAgICAgICAgIHRoaXMuZ29vZHNOYW1lLnRleHQgPSBpdGVtLmdvb2RzTmFtZTtcclxuICAgICAgICAgICAgdGhpcy50eEhhc2gudGV4dCA9IGl0ZW0udHhIYXNoO1xyXG4gICAgICAgICAgICB0aGlzLmhpdENvZGUudGV4dCA9IGl0ZW0uaGl0Q29kZTtcclxuICAgICAgICAgICAgdGhpcy5vcGVuVGltZS50ZXh0ID0gdXRpbHMuZm9ybWF0RGF0ZVRpbWUoaXRlbS5vcGVuVGltZSk7XHJcbiAgICAgICAgICAgIHRoaXMuam9pbmVkTnVtLnRleHQgPSBpdGVtLmpvaW5lZE51bTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoq5p+l55yL5ZOI5biMICovXHJcbiAgICBzZWVIYXNoKCk6dm9pZCB7XHJcbiAgICAgICAgY29uc3QgZG9tYWluID0gZG9jdW1lbnQuZG9tYWluO1xyXG4gICAgICAgIGlmIChkb21haW4uaW5kZXhPZigndC1jZW50ZXInKSA+PSAwIHx8IGRvbWFpbiA9PT0gJ2xvY2FsaG9zdCcpIHtcclxuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBgaHR0cHM6Ly9yb3BzdGVuLmV0aGVyc2Nhbi5pby90eC8ke3RoaXMuX2RhdGFTb3VyY2UudHhIYXNofWA7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBgaHR0cHM6Ly9ldGhlcnNjYW4uaW8vdHgvJHt0aGlzLl9kYXRhU291cmNlLnR4SGFzaH1gO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgIH1cclxufSIsIlxyXG4vKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjIgMTE6NDA6NDJcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjIgMTE6NDA6NDJcclxuICogQGRlc2Mg54Gr566t5aSn5aWW5Y6G5Y+y6K6w5b2V6ISa5pysXHJcbiAqL1xyXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcclxuaW1wb3J0IHV0aWxzIGZyb20gXCIuLi9qcy91dGlsc1wiO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgcHJpSGlzdG9yeSBleHRlbmRzIHVpLnRlbXBsYXRlLnByaUhpc3RvcnlVSSB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpXHJcbiAgICB9XHJcbiAgICBzZXQgZGF0YVNvdXJjZShpdGVtOiBhbnkpIHtcclxuICAgICAgICBpZiAoaXRlbSkge1xyXG4gICAgICAgICAgICB0aGlzLnJhbmtOby50ZXh0ID0gaXRlbS5yYW5rIDwgMTAgPyBgMCR7aXRlbS5yYW5rfWAgOiBgJHtpdGVtLnJhbmt9YDtcclxuICAgICAgICAgICAgdGhpcy5uaWNrTmFtZS50ZXh0ID0gaXRlbS5uaWNrTmFtZTtcclxuICAgICAgICAgICAgdGhpcy5VSUQudGV4dCA9IGBVSUQ6ICR7aXRlbS51c2VySWR9YDtcclxuICAgICAgICAgICAgdGhpcy5Wb2x1bWUudGV4dCA9IGAke3V0aWxzLnRvRGVjaW1hbChpdGVtLmNvbnN1bSwyKX0gVVNEVGBcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0gXHJcbiIsIlxyXG4vKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjIgMTE6NDA6NDJcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjIgMTE6NDA6NDJcclxuICogQGRlc2Mg54Gr566t5aSn5aWW5o6S6KGM5qacXHJcbiAqL1xyXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcclxuaW1wb3J0IHV0aWxzIGZyb20gXCIuLi9qcy91dGlsc1wiO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgcHJpeExpc3QgZXh0ZW5kcyB1aS50ZW1wbGF0ZS5wcml4TGlzdFVJIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKClcclxuICAgIH1cclxuICAgIHNldCBkYXRhU291cmNlKGl0ZW06IGFueSkge1xyXG4gICAgICAgIGlmIChpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMubm8xLnZpc2libGUgPSBpdGVtLnJhbmsgPT09IDEgPyB0cnVlIDogZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMucmFua05vLnZpc2libGUgPSBpdGVtLnJhbmsgPT09IDEgPyBmYWxzZSA6IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMucmFua05vLnRleHQgPSBpdGVtLnJhbms7XHJcbiAgICAgICAgICAgIHRoaXMuYXZhdGFyLnNraW4gPSBpdGVtLmF2YXRhcjtcclxuICAgICAgICAgICAgdGhpcy5uaWNrTmFtZS50ZXh0ID0gaXRlbS5uaWNrTmFtZTtcclxuICAgICAgICAgICAgdGhpcy5VSUQudGV4dCA9IGBVSUQ6ICR7aXRlbS51c2VySWR9YDtcclxuICAgICAgICAgICAgdGhpcy50b2RheVZvbHVtZS50ZXh0ID0gYCR7dXRpbHMudG9EZWNpbWFsKGl0ZW0uY29uc3VtLDIpfSBVU0RUYFxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSBcclxuIiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ5OjIzXHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ5OjIzXHJcbiAqIEBkZXNjIOS6pOaYk+Wvhueggei+k+WFpeW8ueeql+iEmuacrFxyXG4gKi9cclxuaW1wb3J0IHsgdWkgfSBmcm9tICcuLi91aS9sYXlhTWF4VUknXHJcbmltcG9ydCBUaXBzRGlhTG9nIGZyb20gJy4vdGlwRGlhbG9nJztcclxuaW1wb3J0IHsgVG9hc3QgfSBmcm9tICcuLi92aWV3L1RvYXN0JztcclxuaW1wb3J0IEd1ZXNzaW5nIGZyb20gJy4uL3NjcmlwdC9HdWVzc2luZyc7XHJcbmltcG9ydCBhcGkgZnJvbSAnLi4vanMvYXBpJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIElwdFBzd0RvbSBleHRlbmRzIHVpLnRlbXBsYXRlLklucHV0UHdkRGlhbG9nVUkge1xyXG5cclxuICAgIHByaXZhdGUgcGVyaW9kOnN0cmluZyA9ICcnOy8v5pyf5Y+3XHJcbiAgICBwcml2YXRlIGNvZGVMaXN0OnN0cmluZyA9ICcnOy8v6LSt5Lmw5Y+356CBXHJcbiAgICBwcml2YXRlIGlzRW50ZXI6Ym9vbGVhbiA9IGZhbHNlOyAvL+WHveaVsOiKgua1gVxyXG4gICAgcHJpdmF0ZSBBbGxDb2RlTGlzdDphbnkgPSBbXTsvL+aJgOacieWPt+eggeWIl+ihqFxyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKClcclxuICAgIH1cclxuICAgIG9uRW5hYmxlKCl7XHJcbiAgICAgICAgdGhpcy5idG5DbG9zZS5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5jbG9zZUZ1bmMpXHJcbiAgICAgICAgdGhpcy5JcHRQc3cub24oTGF5YS5FdmVudC5GT0NVUyx0aGlzLHRoaXMub25Gb2N1cylcclxuICAgICAgICB0aGlzLklwdFBzdy5vbihMYXlhLkV2ZW50LkJMVVIsdGhpcyx0aGlzLm9uQkxVUilcclxuICAgICAgICB0aGlzLklwdFBzdy5vbihMYXlhLkV2ZW50LktFWV9VUCx0aGlzLHRoaXMub25DaGFuZ2UpXHJcbiAgICB9XHJcblxyXG4gICAgLyoq6I635Y+W5Lyg6YCS55qE5Y+C5pWwICovXHJcbiAgICBzZXREYXRhKGRhdGE6YW55KSB7XHJcbiAgICAgICAgdGhpcy5wZXJpb2QgPSBkYXRhLnBlcmlvZDtcclxuICAgICAgICB0aGlzLmNvZGVMaXN0ID0gZGF0YS5jb2RlTGlzdDtcclxuICAgICAgICB0aGlzLkFsbENvZGVMaXN0ID0gZGF0YS5BbGxDb2RlTGlzdDtcclxuICAgIH1cclxuXHJcbiAgICAvKirovpPlhaXlhoXlrrnmlLnlj5ggKi9cclxuICAgIHByaXZhdGUgb25DaGFuZ2UoKXtcclxuICAgICAgICBpZiAoIXRoaXMuaXNFbnRlciAmJiB0aGlzLklwdFBzdy50ZXh0Lmxlbmd0aCA9PT0gNikge1xyXG4gICAgICAgICAgICB0aGlzLnRyYWRlQnV5KClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoq6LSt5LmwICovXHJcbiAgICBwcml2YXRlIHRyYWRlQnV5KCl7XHJcbiAgICAgICAgdGhpcy5pc0VudGVyID0gdHJ1ZTtcclxuICAgICAgICBhcGkucG9zdFRyYWRlQnV5KHRoaXMucGVyaW9kLHRoaXMuY29kZUxpc3QsdGhpcy5JcHRQc3cudGV4dCkudGhlbigocmVzOmFueSk9PntcclxuICAgICAgICAgICAgdGhpcy5pc0VudGVyID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMuY2xvc2VGdW5jKCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmV2ZW50KFwicmVmcmVzaERhdGFcIik7Ly/liLfmlrDmlbDmja7liJfooahcclxuICAgICAgICAgICAgLy8g6LSt5Lmw5oiQ5Yqf5by55Ye65a+56K+d5qGGXHJcbiAgICAgICAgICAgIGxldCB0aXBzRGlhbG9nOlRpcHNEaWFMb2cgPSBuZXcgVGlwc0RpYUxvZygpXHJcbiAgICAgICAgICAgIHRpcHNEaWFsb2cucG9wdXAoKVxyXG4gICAgICAgICAgICB0aXBzRGlhbG9nLnNldERhdGEoe1xyXG4gICAgICAgICAgICAgICAgQWxsQ29kZUxpc3Q6dGhpcy5BbGxDb2RlTGlzdFxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pLmNhdGNoKChlcnI6YW55KT0+e1xyXG4gICAgICAgICAgICB0aGlzLmlzRW50ZXIgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5jbG9zZUZ1bmMoKTtcclxuXHJcbiAgICAgICAgICAgIFRvYXN0LnNob3coZXJyLm1lc3NhZ2UpXHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICAvKirlhbPpl63lr4bnoIHmoYYgKi9cclxuICAgIHByaXZhdGUgY2xvc2VGdW5jKCl7XHJcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xyXG4gICAgICAgIHRoaXMuSXB0UHN3LnRleHQgPSAnJztcclxuICAgIH1cclxuICAgIC8qKui+k+WFpeahhuiOt+W+l+eEpueCuSAqL1xyXG4gICAgcHJpdmF0ZSBvbkZvY3VzKCl7XHJcbiAgICAgICAgdGhpcy50b3AgPSAxNTA7XHJcbiAgICB9XHJcbiAgICAvKirovpPlhaXmoYbojrflvpfnhKbngrkgKi9cclxuICAgIHByaXZhdGUgb25CTFVSKCl7XHJcbiAgICAgICB0aGlzLnRvcCA9IDQ0MDtcclxuICAgIH1cclxufSIsIlxyXG4vKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjIgMTE6NDA6NDJcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjIgMTE6NDA6NDJcclxuICogQGRlc2Mg54Gr566t5aSn5aWW54Gr566t5ZCN5Y2VXHJcbiAqL1xyXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcclxuaW1wb3J0IHV0aWxzIGZyb20gXCIuLi9qcy91dGlsc1wiO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgcHJpeExpc3QgZXh0ZW5kcyB1aS50ZW1wbGF0ZS5yYW5raW5nTGlzdFVJIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKClcclxuICAgIH1cclxuICAgIHNldCBkYXRhU291cmNlKGl0ZW06IGFueSkge1xyXG4gICAgICAgIGlmIChpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmFua2luZy50ZXh0ID0gaXRlbS5yYW5raW5nO1xyXG4gICAgICAgICAgICB0aGlzLm5pY2tOYW1lLnRleHQgPSBpdGVtLm5pY2tOYW1lO1xyXG4gICAgICAgICAgICB0aGlzLnVpZC50ZXh0ID0gaXRlbS51aWQ7XHJcbiAgICAgICAgICAgIHRoaXMuYW1vdW50LnRleHQgPSBpdGVtLmFtb3VudDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0gXHJcbiIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0yNyAxMDowNjoxOFxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yNyAxMDowNjoxOFxyXG4gKiBAZGVzYyDlhYXlgLzmj5DluIHlvLnlh7rohJrmnKxcclxuICovXHJcbmltcG9ydCB7IHVpIH0gZnJvbSAnLi4vdWkvbGF5YU1heFVJJ1xyXG4gXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJlY2hhcmdlRGlhbG9nIGV4dGVuZHMgdWkudGVtcGxhdGUucmVjaGFyZ2VEaWFsb2dVSSB7XHJcbiAgICBjb25zdHJ1Y3Rvcigpe1xyXG4gICAgICAgIHN1cGVyKClcclxuICAgIH1cclxuXHJcbiAgICBvbkVuYWJsZSgpe1xyXG4gICAgICAgIHRoaXMuYnRuX3F1aWNrUmVjaGFyZ2Uub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMucXVpY2tSZWNoYXJnZUZ1bmMpXHJcbiAgICAgICAgdGhpcy5idG5fd2l0aGRyYXcub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMud2l0aGRyYXdGdW5jKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKuW/q+aNt+WFheWAvCAqL1xyXG4gICAgcHJpdmF0ZSBxdWlja1JlY2hhcmdlRnVuYygpe1xyXG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gYGh0dHBzOi8vJHtkb2N1bWVudC5kb21haW59LyMvY2hhcmdlS3VhaUJpYFxyXG4gICAgfVxyXG4gICAgLyoqVVNEVOmSseWMheaPkOW4gSAqL1xyXG4gICAgd2l0aGRyYXdGdW5jKCl7XHJcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBgaHR0cHM6Ly8ke2RvY3VtZW50LmRvbWFpbn0vIy93YWxsZXRDaGFyZ2VgXHJcbiAgICB9XHJcbn1cclxuXHJcbiIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0yNiAxMToxMjowOVxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yNiAxMToxMjowOVxyXG4gKiBAZGVzYyDlhaXlm7TlkI3ljZXliJfooahcclxuICovXHJcbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3Mgc2hvcnRMaXN0Qm94IGV4dGVuZHMgdWkudGVtcGxhdGUuc2hvcnRMaXN0VUkge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoKVxyXG4gICAgfVxyXG4gICAgc2V0IGRhdGFTb3VyY2UoaXRlbTogYW55KSB7XHJcbiAgICAgICAgaWYgKGl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5udW1iZXIudGV4dCA9IGl0ZW0uc2hvcnRsaXN0ZWROdW1iZXIgPCAxMCA/IGAwJHtpdGVtLnNob3J0bGlzdGVkTnVtYmVyfWAgOiBpdGVtLnNob3J0bGlzdGVkTnVtYmVyO1xyXG4gICAgICAgICAgICB0aGlzLm5pY2tOYW1lLnRleHQgPSBpdGVtLm5pY2tOYW1lO1xyXG4gICAgICAgICAgICB0aGlzLnVzZXJJZC50ZXh0ID0gaXRlbS51c2VySWQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbiIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0NDowMlxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0NDowMlxyXG4gKiBAZGVzYyDotK3kubDmiJDlip/lkI7nmoTmj5DnpLrmoYbohJrmnKxcclxuICovXHJcbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xyXG5pbXBvcnQgeyBUYWJiYXIgfSBmcm9tIFwiLi4vdmlldy9UYWJiYXJcIjtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRpcHNEaWFMb2cgZXh0ZW5kcyB1aS50ZW1wbGF0ZS5UaXBzRGlhbG9nVUkge1xyXG4gICAgcHJpdmF0ZSBBbGxDb2RlTGlzdDpvYmplY3RbXSA9IFtdOy8v5Y+356CB5YiX6KGoXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpXHJcbiAgICB9XHJcbiAgICBvbkVuYWJsZSgpe1xyXG4gICAgICAgIHRoaXMuYnRuQ29udGludWUub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuY2xvc2VGdW5jKVxyXG4gICAgICAgIHRoaXMuYnRuVmlld1JlY29yZC5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy52aWV3UmVjb3JkRnVuYylcclxuICAgICAgICBcclxuICAgIH1cclxuXHJcbiAgICAvKirojrflj5bkvKDpgJLnmoTlj4LmlbAgKi9cclxuICAgIHNldERhdGEoZGF0YTphbnkpIHtcclxuICAgICAgICB0aGlzLkFsbENvZGVMaXN0ID0gZGF0YS5BbGxDb2RlTGlzdDtcclxuICAgIH1cclxuXHJcbiAgICAvKirlhbPpl63lr4bnoIHmoYYgKi9cclxuICAgIHByaXZhdGUgY2xvc2VGdW5jKCl7XHJcblxyXG4gICAgICAgIHRoaXMuY2xvc2UoKTtcclxuICAgICAgICAvLyDoi6Xlhajpg6jooqvotK3kubDvvIzliJnlm57liLDpppbpobXph43mlrDpgInmi6notK3kubDmnJ/lj7dcclxuICAgICAgICBsZXQgY291bnQ6bnVtYmVyID0gMDtcclxuICAgICAgICB0aGlzLkFsbENvZGVMaXN0LmZvckVhY2goKHY6YW55KSA9PiB7XHJcbiAgICAgICAgICAgIGlmICh2LmJ1eWVySWQgIT09ICcwJykge1xyXG4gICAgICAgICAgICAgICAgY291bnQgPSBjb3VudCArIDE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICBpZiAoY291bnQgPT09IHRoaXMuQWxsQ29kZUxpc3QubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIFRhYmJhci5nZXRJbnN0YW5jZSgpLm9wZW5TY2VuZSgnaG9tZS5zY2VuZScpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIOafpeeci+iusOW9lVxyXG4gICAgcHJpdmF0ZSB2aWV3UmVjb3JkRnVuYygpe1xyXG4gICAgICAgIHRoaXMuY2xvc2UoKTtcclxuICAgICAgICBUYWJiYXIuZ2V0SW5zdGFuY2UoKS5vcGVuU2NlbmUoJ3JlY29yZC5zY2VuZScpXHJcbiAgICB9XHJcbn0iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjEgMTY6MzI6MDFcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjEgMTY6MzI6MDFcclxuICogQGRlc2Mg6LWw5Yq/5YiX6KGo6ISa5pysXHJcbiAqL1xyXG5pbXBvcnQgeyB1aSB9IGZyb20gJy4uL3VpL2xheWFNYXhVSSdcclxuaW1wb3J0IHV0aWxzIGZyb20gJy4uL2pzL3V0aWxzJztcclxuaW1wb3J0IHsgVGFiYmFyIH0gZnJvbSAnLi4vdmlldy9UYWJiYXInO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgdHJlbmRMaXN0IGV4dGVuZHMgdWkudGVtcGxhdGUudHJlbmRMaXN0VUkge1xyXG4gICAgcHJpdmF0ZSBfaXRlbTphbnk7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpXHJcbiAgICAgICAgdGhpcy5idG5fYnV5Lm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLmJ0bkJ1eUZ1bmMpXHJcbiAgICB9XHJcbiAgICBzZXQgZGF0YVNvdXJjZShpdGVtOmFueSl7XHJcbiAgICAgICAgdGhpcy5faXRlbSA9IGl0ZW07XHJcbiAgICAgICAgaWYgKGl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5wZXJpb2QudGV4dCA9IGl0ZW0ucGVyaW9kO1xyXG4gICAgICAgICAgICB0aGlzLmhpdENvZGUudGV4dCA9IGl0ZW0uaGl0Q29kZTtcclxuICAgICAgICAgICAgdGhpcy5vZGRfZXZlbi50ZXh0ID0gaXRlbS5pcyA9PT0gMCA/ICctJyA6ICBpdGVtLmlzID09PSAxID8gJ+WlhycgOiAn5YG2JztcclxuICAgICAgICAgICAgdGhpcy5pc0JpZy50ZXh0ID0gaXRlbS5pcyA9PT0gMCA/ICctJyA6IGl0ZW0uaXNCaWcgPyAn5aSnJyA6ICflsI8nO1xyXG5cclxuICAgICAgICAgICAgaWYgKGl0ZW0uaXMgPT09IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYnRuX2J1eS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuaGl0Q29kZS52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgdGhpcy5idG5fYnV5LnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuaGl0Q29kZS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyDlpYflgbbmloflrZfpopzoibJcclxuICAgICAgICAgICAgaWYgKGl0ZW0uaXMgPT09IDEpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMub2RkX2V2ZW4uY29sb3IgPSAnI2YxNDg0OCc7XHJcbiAgICAgICAgICAgIH1lbHNlIGlmKGl0ZW0uaXMgPT09IDIpe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vZGRfZXZlbi5jb2xvciA9ICcjMjVmZmZkJztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyDlpKflsI/mloflrZfpopzoibJcclxuICAgICAgICAgICAgaWYgKCFpdGVtLmlzQmlnICYmIGl0ZW0uaXMgIT09IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaXNCaWcuY29sb3IgPSAnI2YxNDg0OCc7XHJcbiAgICAgICAgICAgIH1lbHNlIGlmKGl0ZW0uaXNCaWcgJiYgaXRlbS5pcyAhPT0gMCl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmlzQmlnLmNvbG9yID0gJyMyNWZmZmQnO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKueri+WNs+i0reS5sCAqL1xyXG4gICAgcHJpdmF0ZSBidG5CdXlGdW5jKCl7XHJcbiAgICAgICAgY29uc29sZS5sb2codGhpcy5faXRlbS5wZXJpb2QpO1xyXG4gICAgICAgIFRhYmJhci5nZXRJbnN0YW5jZSgpLm9wZW5TY2VuZSgnZ3Vlc3Npbmcuc2NlbmUnLHRoaXMuX2l0ZW0uZ29vZHNJZClcclxuICAgIH1cclxufSIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0yNiAxMDoyMTozN1xyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yNiAxMDoyMTozN1xyXG4gKiBAZGVzYyDllpzku47lpKnpmY3kuK3lpZblkI3ljZXliJfooajohJrmnKxcclxuICovXHJcbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xyXG5pbXBvcnQgdXRpbHMgZnJvbSBcIi4uL2pzL3V0aWxzXCI7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBXaW5uaW5nTGlzdCBleHRlbmRzIHVpLnRlbXBsYXRlLndpbm5pbmdMaXN0VUkge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoKVxyXG4gICAgfVxyXG4gICAgc2V0IGRhdGFTb3VyY2UoaXRlbTogYW55KSB7XHJcbiAgICAgICAgaWYgKGl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5wZXJpb2QudGV4dCA9IGl0ZW0uYmVsb25nVGltZTtcclxuICAgICAgICAgICAgdGhpcy5kYXRlLnRleHQgPSB1dGlscy5mb3JtYXREYXRlVGltZShpdGVtLmJhbGFuY2VUaW1lKTtcclxuICAgICAgICAgICAgdGhpcy5uaWNrTmFtZS50ZXh0ID0gaXRlbS5uaWNrTmFtZTtcclxuICAgICAgICAgICAgdGhpcy5hbW91bnQudGV4dCA9IGAkeytpdGVtLm1vbmV5fSBVU0RUYDtcclxuICAgICAgICAgICAgdGhpcy5jb2RlLnRleHQgPSBpdGVtLmhpdE51bWJlcjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuIiwiLyoqVGhpcyBjbGFzcyBpcyBhdXRvbWF0aWNhbGx5IGdlbmVyYXRlZCBieSBMYXlhQWlySURFLCBwbGVhc2UgZG8gbm90IG1ha2UgYW55IG1vZGlmaWNhdGlvbnMuICovXG5pbXBvcnQgVmlldz1MYXlhLlZpZXc7XHJcbmltcG9ydCBEaWFsb2c9TGF5YS5EaWFsb2c7XHJcbmltcG9ydCBTY2VuZT1MYXlhLlNjZW5lO1xuZXhwb3J0IG1vZHVsZSB1aSB7XHJcbiAgICBleHBvcnQgY2xhc3MgYXNzaXN0YW50VUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyBidG5fdHJlbmQ6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgYnRuX3ByZWJ1eTpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBjYXRlVGFiTGlzdDpMYXlhLkxpc3Q7XG5cdFx0cHVibGljIGxpc3RUaXRsZTpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgdHJlbmRMaXN0OkxheWEuTGlzdDtcblx0XHRwdWJsaWMgcHJlYnV5OkxheWEuTGlzdDtcblx0XHRwdWJsaWMgbm9EYXRhOkxheWEuSW1hZ2U7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJhc3Npc3RhbnRcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIENhcmRVSSBleHRlbmRzIExheWEuVmlldyB7XHJcblx0XHRwdWJsaWMgYW5pMTpMYXlhLkZyYW1lQW5pbWF0aW9uO1xuXHRcdHB1YmxpYyBjYXJkSXRlbTpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBzY2VuZUltZzpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBnb29kc05hbWU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgcHJvZ3Jlc3M6TGF5YS5Qcm9ncmVzc0Jhcjtcblx0XHRwdWJsaWMgc29sZE51bV90b3RhbE51bTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBhd2FyZDpMYXlhLkxhYmVsO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwiQ2FyZFwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgZ3JhbmRQcml4VUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyBDb3VudERvd246TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgYm9udXM6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgYnRuX2hpc3Rvcnk6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIHJhbmtQcml6ZUhlbHA6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIGJveDE6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIGFsb25lMTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBQcm9wb3J0aW9uMTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBwcml4TGlzdDE6TGF5YS5MaXN0O1xuXHRcdHB1YmxpYyBib3gyOkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyBhbG9uZTI6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgUHJvcG9ydGlvbjI6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgcHJpeExpc3QyOkxheWEuTGlzdDtcblx0XHRwdWJsaWMgYm94MzpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgYWxvbmUzOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIFByb3BvcnRpb24zOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHByaXhMaXN0MzpMYXlhLkxpc3Q7XG5cdFx0cHVibGljIG5vRGF0YTpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBteVJhbmtCb3g6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgbXlyYW5raW5nOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGF2YXRhcjpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBuaWNrTmFtZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyB1aWQ6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgdm9sdW1lVGl0bGU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgdm9sdW1lOkxheWEuTGFiZWw7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJncmFuZFByaXhcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIGd1ZXNzaW5nVUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyBwcmljZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBnb29kc1ZhbHVlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHByb2dyZXNzU3BlZWQ6TGF5YS5Qcm9ncmVzc0Jhcjtcblx0XHRwdWJsaWMgc29sZE51bV9zb2xkTnVtOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHBlcmlvZDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBudW1iZXJMaXN0OkxheWEuTGlzdDtcblx0XHRwdWJsaWMgZXN0aW1hdGU6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIHRvdGFsOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGJhbGFuY2VCb3g6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIGJhbGFuY2U6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgYnRuX2J1eTpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBidG5fc2VsZWN0OkxheWEuVmlldztcblx0XHRwdWJsaWMgcmFuZG9tX29uZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyByYW5kb21fYmVmb3JlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHJhbmRvbV9hZnRlcjpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyByYW5kb21fYWxsOkxheWEuTGFiZWw7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJndWVzc2luZ1wiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgaG9tZVVJIGV4dGVuZHMgTGF5YS5TY2VuZSB7XHJcblx0XHRwdWJsaWMgcHV0X2luOkxheWEuRnJhbWVBbmltYXRpb247XG5cdFx0cHVibGljIHJvY2tldF9zaG93OkxheWEuRnJhbWVBbmltYXRpb247XG5cdFx0cHVibGljIGRvbV9zaG93OkxheWEuRnJhbWVBbmltYXRpb247XG5cdFx0cHVibGljIGJnX2FuaTpMYXlhLkZyYW1lQW5pbWF0aW9uO1xuXHRcdHB1YmxpYyBiZ19hbmkyOkxheWEuRnJhbWVBbmltYXRpb247XG5cdFx0cHVibGljIGJnX2FuaW1hdGlvbjpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgZ29fY2VudGVyOkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyB0dWljaHU6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgQWNjb3VudEJveDpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBhdmF0YXI6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgbmlja05hbWU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgcmVjaGFyZ2VCb3g6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgYnRuUmVjaGFyZ2U6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgbXlBbW91bnQ6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgYnV5SGVscDpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgcm9ja2VyQm94OkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyByb2NrZXRBbW91bnQ6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgY291bnREb3duOkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyByb2NrZXRDb3VudERvd246TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgbGlzdDpMYXlhLkxpc3Q7XG5cdFx0cHVibGljIHB1dGluOkxheWEuSW1hZ2U7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJob21lXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBwcmlIaXN0b3J5U2NlbmVVSSBleHRlbmRzIExheWEuU2NlbmUge1xyXG5cdFx0cHVibGljIHRvdGFsOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGxpc3RCb3g6TGF5YS5QYW5lbDtcblx0XHRwdWJsaWMgYm94MTpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgYWxvbmUxOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIFByb3BvcnRpb24xOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHByaXhMaXN0MTpMYXlhLkxpc3Q7XG5cdFx0cHVibGljIGJveDI6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIGFsb25lMjpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBQcm9wb3J0aW9uMjpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBwcml4TGlzdDI6TGF5YS5MaXN0O1xuXHRcdHB1YmxpYyBib3gzOkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyBhbG9uZTM6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgUHJvcG9ydGlvbjM6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgcHJpeExpc3QzOkxheWEuTGlzdDtcblx0XHRwdWJsaWMgbm9EYXRhOkxheWEuSW1hZ2U7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJwcmlIaXN0b3J5U2NlbmVcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIHJlY29yZFVJIGV4dGVuZHMgTGF5YS5TY2VuZSB7XHJcblx0XHRwdWJsaWMgY2FueXU6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgd2FuZ3FpOkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIGpvaW5MaXN0OkxheWEuTGlzdDtcblx0XHRwdWJsaWMgcHJldmlvb3VzTGlzdDpMYXlhLkxpc3Q7XG5cdFx0cHVibGljIG5vRGF0YTpMYXlhLkltYWdlO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwicmVjb3JkXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBzaG9ydExpc3RlZFVJIGV4dGVuZHMgTGF5YS5TY2VuZSB7XHJcblx0XHRwdWJsaWMgc2hvcnRMaXN0OkxheWEuTGlzdDtcblx0XHRwdWJsaWMgbm9EYXRhOkxheWEuSW1hZ2U7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJzaG9ydExpc3RlZFwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgVGFiYmFyVUkgZXh0ZW5kcyBMYXlhLlZpZXcge1xyXG5cdFx0cHVibGljIHRhYjpMYXlhLlRhYjtcblx0XHRwdWJsaWMgbm90aWNlOkxheWEuU3ByaXRlO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwiVGFiYmFyXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyB4Y3RqVUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyB4Y3RqX3NodW9taW5nOkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyBhbW91bnQ6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgdW5pdDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBjb3VudERvd246TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgYnRuX3Nob3J0bGlzdDpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyB3aW5uaW5nX2NvZGU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgd2lubmluZ0xpc3Q6TGF5YS5MaXN0O1xuXHRcdHB1YmxpYyBub0RhdGE6TGF5YS5JbWFnZTtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInhjdGpcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbmV4cG9ydCBtb2R1bGUgdWkudGVtcGxhdGUge1xyXG4gICAgZXhwb3J0IGNsYXNzIElucHV0UHdkRGlhbG9nVUkgZXh0ZW5kcyBMYXlhLkRpYWxvZyB7XHJcblx0XHRwdWJsaWMgdGl0bGU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgYnRuQ2xvc2U6TGF5YS5Cb3g7XG5cdFx0cHVibGljIElwdFBzdzpMYXlhLlRleHRJbnB1dDtcblx0XHRwdWJsaWMgZm9yZ2V0UGFzc3dvcmQ6TGF5YS5MYWJlbDtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInRlbXBsYXRlL0lucHV0UHdkRGlhbG9nXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBqb2luUmVjb3Jkc1VJIGV4dGVuZHMgTGF5YS5WaWV3IHtcclxuXHRcdHB1YmxpYyBwZXJpb2Q6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgbm9Qcml6ZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBwcml6ZTpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBnb29kc1ZhbHVlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIG9wZW5UaW1lOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGhpdENvZGU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgY29kZUxpc3Q6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgYXdhcmQ6TGF5YS5MYWJlbDtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInRlbXBsYXRlL2pvaW5SZWNvcmRzXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBudW1iZXJMaXN0RE9NVUkgZXh0ZW5kcyBMYXlhLlZpZXcge1xyXG5cdFx0cHVibGljIGJnSW1nOkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIGNvZGU6TGF5YS5MYWJlbDtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInRlbXBsYXRlL251bWJlckxpc3RET01cIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIHByZXZpb3VzUmVjb3Jkc1VJIGV4dGVuZHMgTGF5YS5WaWV3IHtcclxuXHRcdHB1YmxpYyBwZXJpb2Q6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgcmVxdWVzdFR5cGU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgZ29vZHNOYW1lOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHR4SGFzaDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBoaXRDb2RlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIG9wZW5UaW1lOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGpvaW5lZE51bTpMYXlhLkxhYmVsO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwidGVtcGxhdGUvcHJldmlvdXNSZWNvcmRzXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBwcmlIaXN0b3J5VUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyByYW5rTm86TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgbmlja05hbWU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgVUlEOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIFZvbHVtZTpMYXlhLkxhYmVsO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwidGVtcGxhdGUvcHJpSGlzdG9yeVwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgcHJpeExpc3RVSSBleHRlbmRzIExheWEuU2NlbmUge1xyXG5cdFx0cHVibGljIG5vMTpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyByYW5rTm86TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgYXZhdGFyOkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIG5pY2tOYW1lOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIFVJRDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyB0b2RheVZvbHVtZVRpdGxlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHRvZGF5Vm9sdW1lOkxheWEuTGFiZWw7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJ0ZW1wbGF0ZS9wcml4TGlzdFwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgcmFua2luZ0xpc3RVSSBleHRlbmRzIExheWEuU2NlbmUge1xyXG5cdFx0cHVibGljIHJhbmtpbmc6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgbmlja05hbWU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgdWlkOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGFtb3VudDpMYXlhLkxhYmVsO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwidGVtcGxhdGUvcmFua2luZ0xpc3RcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIHJlY2hhcmdlRGlhbG9nVUkgZXh0ZW5kcyBMYXlhLkRpYWxvZyB7XHJcblx0XHRwdWJsaWMgYnRuX3F1aWNrUmVjaGFyZ2U6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIGJ0bl93aXRoZHJhdzpMYXlhLlNwcml0ZTtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInRlbXBsYXRlL3JlY2hhcmdlRGlhbG9nXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBzaG9ydExpc3RVSSBleHRlbmRzIExheWEuU2NlbmUge1xyXG5cdFx0cHVibGljIG51bWJlcjpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBuaWNrTmFtZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyB1c2VySWQ6TGF5YS5MYWJlbDtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInRlbXBsYXRlL3Nob3J0TGlzdFwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3Mgc2hvd1JvY2tldFVJIGV4dGVuZHMgTGF5YS5EaWFsb2cge1xyXG5cdFx0cHVibGljIGFuaTE6TGF5YS5GcmFtZUFuaW1hdGlvbjtcblx0XHRwdWJsaWMgYW5pMjpMYXlhLkZyYW1lQW5pbWF0aW9uO1xuXHRcdHB1YmxpYyBzaG93YW5pMTpMYXlhLkFuaW1hdGlvbjtcblx0XHRwdWJsaWMgc2hvd2FuaTI6TGF5YS5BbmltYXRpb247XG5cdFx0cHVibGljIGJ0bl9jbG9zZTpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgcmFua2luZzpMYXlhLkxpc3Q7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJ0ZW1wbGF0ZS9zaG93Um9ja2V0XCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBUaXBzRGlhbG9nVUkgZXh0ZW5kcyBMYXlhLkRpYWxvZyB7XHJcblx0XHRwdWJsaWMgdGl0bGU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgYnRuVmlld1JlY29yZDpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBidG5Db250aW51ZTpMYXlhLkltYWdlO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwidGVtcGxhdGUvVGlwc0RpYWxvZ1wiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgdHJlbmRMaXN0VUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyBwZXJpb2Q6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgaGl0Q29kZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBidG5fYnV5OkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIG9kZF9ldmVuOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGlzQmlnOkxheWEuTGFiZWw7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJ0ZW1wbGF0ZS90cmVuZExpc3RcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIHdpbm5pbmdMaXN0VUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyBwZXJpb2RCb3g6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIHBlcmlvZDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBkYXRlQm94OkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyBkYXRlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIG5hbWVCb3g6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIG5pY2tOYW1lOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGFtb3VudEJveDpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgYW1vdW50OkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGNvZGVCb3g6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIGNvZGU6TGF5YS5MYWJlbDtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInRlbXBsYXRlL3dpbm5pbmdMaXN0XCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyIiwiZXhwb3J0IGNvbnN0IExheWVyVHlwZSA9IHtcclxuICAgIExBWUVSX1NDRU5FOiBcIkxBWUVSX1NDRU5FXCIsXHJcbiAgICBMQVlFUl9VSTogXCJMQVlFUl9VSVwiLFxyXG4gICAgTEFZRVJfTVNHOiBcIkxBWUVSX01TR1wiXHJcbn1cclxuY29uc3QgbGF5ZXJNYXAgPSB7fTtcclxuXHJcbmV4cG9ydCBjbGFzcyBMYXllck1hbmFnZXIge1xyXG4gICAgc3RhdGljIGluaXRlZDogYm9vbGVhbjtcclxuICAgIHN0YXRpYyBpbml0KGxheWVyczogc3RyaW5nW10pIHtcclxuICAgICAgICBsYXllcnMuZm9yRWFjaCgobGF5ZXJOYW1lOiBzdHJpbmcpID0+IHtcclxuICAgICAgICAgICAgaWYgKGxheWVyTmFtZSA9PT0gTGF5ZXJUeXBlLkxBWUVSX1NDRU5FKSB7XHJcbiAgICAgICAgICAgICAgICBsYXllck1hcFtsYXllck5hbWVdID0gTGF5YS5TY2VuZS5yb290O1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbGF5ZXI6IExheWEuVUlDb21wb25lbnQgPSBsYXllck1hcFtsYXllck5hbWVdID0gbmV3IExheWEuVUlDb21wb25lbnQoKTtcclxuICAgICAgICAgICAgICAgIGxheWVyLmxlZnQgPSAwO1xyXG4gICAgICAgICAgICAgICAgbGF5ZXIucmlnaHQgPSAwO1xyXG4gICAgICAgICAgICAgICAgbGF5ZXIudG9wID0gMDtcclxuICAgICAgICAgICAgICAgIGxheWVyLmJvdHRvbSA9IDA7XHJcbiAgICAgICAgICAgICAgICBMYXlhLnN0YWdlLmFkZENoaWxkKGxheWVyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIC8vIExheWEuc3RhZ2Uub24oTGF5YS5FdmVudC5SRVNJWkUsIHRoaXMsIHRoaXMub25SZXNpemUpO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBhZGRUb0xheWVyKG5vZGU6IExheWEuTm9kZSwgbGF5ZXJOYW1lKTogQm9vbGVhbiB7XHJcbiAgICAgICAgTGF5ZXJNYW5hZ2VyLmNoZWNrSW5pdCgpO1xyXG4gICAgICAgIGlmICghbm9kZSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIGNvbnN0IGxheWVyID0gbGF5ZXJNYXBbbGF5ZXJOYW1lXTtcclxuICAgICAgICBpZiAoIWxheWVyKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgbGF5ZXIuYWRkQ2hpbGQobm9kZSk7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHJlbW92ZUZyb21MYXllcihub2RlOiBMYXlhLk5vZGUsIGxheWVyTmFtZSk6IEJvb2xlYW4ge1xyXG4gICAgICAgIExheWVyTWFuYWdlci5jaGVja0luaXQoKTtcclxuICAgICAgICBjb25zdCBsYXllcjogTGF5YS5VSUNvbXBvbmVudCA9IGxheWVyTWFwW2xheWVyTmFtZV07XHJcbiAgICAgICAgaWYgKGxheWVyKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJOb2RlOiBMYXlhLk5vZGUgPSBsYXllci5yZW1vdmVDaGlsZChub2RlKVxyXG4gICAgICAgICAgICBpZiAock5vZGUpIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGdldExheWVyKGxheWVyTmFtZSk6IExheWEuQ29tcG9uZW50IHtcclxuICAgICAgICByZXR1cm4gbGF5ZXJNYXBbbGF5ZXJOYW1lXTtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgY2hlY2tJbml0KCkge1xyXG4gICAgICAgIGlmIChMYXllck1hbmFnZXIuaW5pdGVkKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgTGF5ZXJNYW5hZ2VyLmluaXQoW1xyXG4gICAgICAgICAgICBMYXllclR5cGUuTEFZRVJfU0NFTkUsXHJcbiAgICAgICAgICAgIExheWVyVHlwZS5MQVlFUl9VSSxcclxuICAgICAgICAgICAgTGF5ZXJUeXBlLkxBWUVSX01TR1xyXG4gICAgICAgIF0pO1xyXG4gICAgICAgIExheWVyTWFuYWdlci5pbml0ZWQgPSB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc3RhdGljIG9uUmVzaXplKCk6IHZvaWQge1xyXG4gICAgICAgIGZvciAoY29uc3QgbGF5ZXJOYW1lIGluIGxheWVyTWFwKSB7XHJcbiAgICAgICAgICAgIGlmIChsYXllck5hbWUgIT09IExheWVyVHlwZS5MQVlFUl9TQ0VORSAmJiBsYXllck1hcC5oYXNPd25Qcm9wZXJ0eShsYXllck5hbWUpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBsYXllcjogTGF5YS5VSUNvbXBvbmVudCA9IGxheWVyTWFwW2xheWVyTmFtZV07XHJcbiAgICAgICAgICAgICAgICBsYXllci5zaXplKExheWEuc3RhZ2Uud2lkdGgsIExheWEuc3RhZ2UuaGVpZ2h0KTtcclxuICAgICAgICAgICAgICAgIGxheWVyLmV2ZW50KExheWEuRXZlbnQuUkVTSVpFKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbn0iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NTA6MTBcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NTA6MTBcclxuICogQGRlc2Mg5bqV6YOo5a+86IiqVGFiYmFy6ISa5pysXHJcbiAqL1xyXG5pbXBvcnQgeyB1aSB9IGZyb20gJy4uL3VpL2xheWFNYXhVSSdcclxuaW1wb3J0IHsgR2FtZU1vZGVsIH0gZnJvbSAnLi4vanMvR2FtZU1vZGVsJztcclxuXHJcbmNvbnN0IHRhYmJhckFycjpzdHJpbmdbXSA9IFsnaG9tZS5zY2VuZScsJ3JlY29yZC5zY2VuZScsJ2Fzc2lzdGFudC5zY2VuZSddIC8vdGFiYmFy55qE6aG16Z2iXHJcbmNvbnN0IHBhZ2VBcnI6c3RyaW5nW10gPSBbXHJcbiAgICAnZ3Vlc3Npbmcuc2NlbmUnLCdncmFuZFByaXguc2NlbmUnLFxyXG4gICAgJ3ByaUhpc3RvcnlTY2VuZS5zY2VuZScsJ3hjdGouc2NlbmUnLFxyXG4gICAgJ3Nob3J0TGlzdGVkLnNjZW5lJ1xyXG5dIC8v6Z2edGFiYmFy6aG16Z2iXHJcblxyXG5leHBvcnQgY2xhc3MgVGFiYmFyIGV4dGVuZHMgdWkuVGFiYmFyVUkge1xyXG4gICAgLyoq6aG16Z2i5Lyg6YCS55qE5Y+C5pWwICovXHJcbiAgICBwcml2YXRlIF9vcGVuU2NlbmVQYXJhbTogYW55O1xyXG4gICAgLyoq6YCJ5Lit55qEdGFiYmFyICovXHJcbiAgICBzdGF0aWMgX3RhYmJhcjpUYWJiYXI7XHJcbiAgICAvKirpobXpnaLmlbDnu4QgKi9cclxuICAgIHN0YXRpYyByZWFkb25seSBTQ0VORVM6c3RyaW5nW10gPSBbLi4udGFiYmFyQXJyLC4uLnBhZ2VBcnJdXHJcblxyXG4gICAgc3RhdGljIGdldEluc3RhbmNlKCk6VGFiYmFyIHtcclxuICAgICAgICBpZighdGhpcy5fdGFiYmFyKXtcclxuICAgICAgICAgICAgdGhpcy5fdGFiYmFyID0gbmV3IFRhYmJhcigpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzLl90YWJiYXI7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHNob3coKXtcclxuICAgICAgICBsZXQgdGFiSW5zOlRhYmJhciA9IHRoaXMuZ2V0SW5zdGFuY2UoKVxyXG4gICAgICAgIExheWEuc3RhZ2UuYWRkQ2hpbGQodGFiSW5zKVxyXG4gICAgfVxyXG4gICAgc3RhdGljIGhpZGUoKXtcclxuICAgICAgICBpZih0aGlzLl90YWJiYXIpe1xyXG4gICAgICAgICAgICB0aGlzLl90YWJiYXIucmVtb3ZlU2VsZigpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBvbkVuYWJsZSgpe1xyXG4gICAgICAgIEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLm9uKCdnZXROb3RpY2UnLHRoaXMsKHJlczphbnkpPT57XHJcbiAgICAgICAgICAgIGlmIChyZXMpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubm90aWNlLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIHRoaXMubm90aWNlLnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgLyoq6Z2edGFiYmFy6Lez6L2s6aG16Z2iLOWPr+aQuuW4puWPguaVsCAqL1xyXG4gICAgb3BlblNjZW5lKHNjZW5lOiBzdHJpbmcsIHBhcmFtPzogYW55KSB7XHJcbiAgICAgICAgdGhpcy5fb3BlblNjZW5lUGFyYW0gPSBwYXJhbTtcclxuICAgICAgICB0aGlzLnRhYi5zZWxlY3RlZEluZGV4ID0gVGFiYmFyLlNDRU5FUy5pbmRleE9mKHNjZW5lKTtcclxuICAgIH1cclxuXHJcbiAgICAvKirnm5Hop4Z0YWJiYXLmlLnlj5ggKi9cclxuICAgIGNyZWF0ZVZpZXcodmlldzphbnkpe1xyXG4gICAgICAgIHN1cGVyLmNyZWF0ZVZpZXcodmlldylcclxuICAgICAgICB0aGlzLnRhYi5vbihMYXlhLkV2ZW50LkNIQU5HRSx0aGlzLHRoaXMub25DbGlja1RhYik7XHJcbiAgICAgICAgLy8gdGhpcy5vbkNsaWNrVGFiKCk7XHJcbiAgICB9XHJcbiAgICBcclxuXHJcbiAgICAvKirngrnlh7t0YWJiYXLkuovku7YgKi9cclxuICAgIG9uQ2xpY2tUYWIoKSB7XHJcbiAgICAgICAgbGV0IHNjZW5lOnN0cmluZyA9IFRhYmJhci5TQ0VORVNbdGhpcy50YWIuc2VsZWN0ZWRJbmRleF1cclxuICAgICAgICBMYXlhLlNjZW5lLm9wZW4oc2NlbmUsIHRydWUsIHRoaXMuX29wZW5TY2VuZVBhcmFtKTtcclxuICAgICAgICB0aGlzLl9vcGVuU2NlbmVQYXJhbSA9IG51bGw7XHJcblxyXG4gICAgICAgIHRoaXMudGFiLml0ZW1zLmZvckVhY2goaXRlbT0+e1xyXG4gICAgICAgICAgICBjb25zdCB0YWJCdG46IExheWEuQnV0dG9uID0gaXRlbSBhcyBMYXlhLkJ1dHRvbjtcclxuICAgICAgICAgICAgY29uc3QgaW1nQnRuOiBMYXlhLkJ1dHRvbiA9IHRhYkJ0bi5nZXRDaGlsZEF0KDApIGFzIExheWEuQnV0dG9uO1xyXG4gICAgICAgICAgICBpbWdCdG4uc2VsZWN0ZWQgPSBmYWxzZTtcclxuICAgICAgICB9KVxyXG4gICAgICAgIHRhYmJhckFyci5mb3JFYWNoKGl0ZW09PntcclxuICAgICAgICAgICAgaWYgKGl0ZW0gPT09IHNjZW5lKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0YWJCdG46IExheWEuQnV0dG9uID0gdGhpcy50YWIuc2VsZWN0aW9uIGFzIExheWEuQnV0dG9uO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaW1nQnRuOiBMYXlhLkJ1dHRvbiA9IHRhYkJ0bi5nZXRDaGlsZEF0KDApIGFzIExheWEuQnV0dG9uO1xyXG4gICAgICAgICAgICAgICAgaW1nQnRuLnNlbGVjdGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIC8v5YWz6Zet5bCP57qi54K5XHJcbiAgICAgICAgaWYgKHNjZW5lID09PSAncmVjb3JkLnNjZW5lJykge1xyXG4gICAgICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5ub3RpY2VGdW5jKGZhbHNlKVxyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgIH1cclxufSIsImltcG9ydCB7IExheWVyTWFuYWdlciwgTGF5ZXJUeXBlIH0gZnJvbSBcIi4vTGF5ZXJNYW5hZ2VyXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgVG9hc3QgZXh0ZW5kcyBMYXlhLlVJQ29tcG9uZW50IHtcclxuXHJcbiAgICBzdGF0aWMgTUlOX1dJRFRIOiBudW1iZXIgPSAyMDA7XHJcbiAgICBzdGF0aWMgTUFYX1dJRFRIOiBudW1iZXIgPSA1MDA7XHJcbiAgICBzdGF0aWMgVE9QOiBudW1iZXIgPSAyMztcclxuICAgIHN0YXRpYyBCT1RUT006IG51bWJlciA9IDIwO1xyXG4gICAgc3RhdGljIE1BUkdJTjogbnVtYmVyID0gMTU7XHJcbiAgICBzdGF0aWMgTUlOX0hFSUdIVDogbnVtYmVyID0gODA7XHJcbiAgICBzdGF0aWMgRk9OVF9TSVpFOiBudW1iZXIgPSAyNjtcclxuICAgIHN0YXRpYyBDT0xPUjogc3RyaW5nID0gXCIjZmZmZmZmXCI7XHJcbiAgICBzdGF0aWMgQkdfSU1HX1VSTDogc3RyaW5nID0gXCJjb21wL2ltZ190b2FzdF9iZy5wbmdcIjtcclxuICAgIHN0YXRpYyBEVVJBVElPTjogbnVtYmVyID0gMjUwMDtcclxuXHJcbiAgICBwcml2YXRlIHN0YXRpYyBpbnN0YW5jZTogVG9hc3Q7XHJcbiAgICBwcml2YXRlIHN0YXRpYyBzdG9yZVRleHRMaXN0OiBhbnlbXSA9IFtdO1xyXG5cclxuICAgIHN0YXRpYyBzaG93KHRleHQ6IHN0cmluZywgZHVyYXRpb246IG51bWJlciA9IFRvYXN0LkRVUkFUSU9OLCBjb3ZlckJlZm9yZTogYm9vbGVhbiA9IHRydWUpIHtcclxuICAgICAgICBpZiAoIVRvYXN0Lmluc3RhbmNlKSB7XHJcbiAgICAgICAgICAgIFRvYXN0Lmluc3RhbmNlID0gbmV3IFRvYXN0KCk7XHJcbiAgICAgICAgICAgIFRvYXN0Lmluc3RhbmNlLm9uKExheWEuRXZlbnQuQ0xPU0UsIFRvYXN0LCBUb2FzdC5vbkNsb3NlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGNvdmVyQmVmb3JlICYmIFRvYXN0Lmluc3RhbmNlLnBhcmVudCkge1xyXG4gICAgICAgICAgICBUb2FzdC5pbnN0YW5jZS5zZXRUZXh0KHRleHQpO1xyXG4gICAgICAgICAgICBUb2FzdC5pbnN0YW5jZS50aW1lci5vbmNlKGR1cmF0aW9uIHx8IFRvYXN0LkRVUkFUSU9OLCBUb2FzdC5pbnN0YW5jZSwgVG9hc3QuaW5zdGFuY2UuY2xvc2UsIG51bGwsIHRydWUpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoIVRvYXN0Lmluc3RhbmNlLnBhcmVudCkge1xyXG4gICAgICAgICAgICBUb2FzdC5kb1Nob3codGV4dCwgZHVyYXRpb24pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIFRvYXN0LnN0b3JlVGV4dExpc3QucHVzaCh7XHJcbiAgICAgICAgICAgICAgICB0ZXh0OiB0ZXh0LFxyXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IGR1cmF0aW9uXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcm90ZWN0ZWQgc3RhdGljIGRvU2hvdyh0ZXh0OiBzdHJpbmcsIGR1cmF0aW9uOiBudW1iZXIpIHtcclxuICAgICAgICBUb2FzdC5pbnN0YW5jZS5zZXRUZXh0KHRleHQpO1xyXG4gICAgICAgIExheWVyTWFuYWdlci5hZGRUb0xheWVyKFRvYXN0Lmluc3RhbmNlLCBMYXllclR5cGUuTEFZRVJfTVNHKTtcclxuICAgICAgICBUb2FzdC5pbnN0YW5jZS50aW1lci5vbmNlKGR1cmF0aW9uIHx8IFRvYXN0LkRVUkFUSU9OLCBUb2FzdC5pbnN0YW5jZSwgVG9hc3QuaW5zdGFuY2UuY2xvc2UsIG51bGwsIHRydWUpO1xyXG4gICAgfVxyXG5cclxuICAgIHByb3RlY3RlZCBzdGF0aWMgb25DbG9zZSgpIHtcclxuICAgICAgICBpZiAoVG9hc3Quc3RvcmVUZXh0TGlzdC5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIHZhciBkYXRhOiBhbnkgPSBUb2FzdC5zdG9yZVRleHRMaXN0LnNoaWZ0KCk7XHJcbiAgICAgICAgICAgIFRvYXN0LmRvU2hvdyhkYXRhLnRleHQsIGRhdGEuZHVyYXRpb24pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBiZzogTGF5YS5JbWFnZTtcclxuICAgIGxhYmVsOiBMYXlhLkxhYmVsO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0VGV4dCh0ZXh0OiBzdHJpbmcpIHtcclxuICAgICAgICB0aGlzLndpZHRoID0gVG9hc3QuTUFYX1dJRFRIO1xyXG4gICAgICAgIHRoaXMubGFiZWwud2lkdGggPSBOYU47XHJcbiAgICAgICAgdGhpcy5sYWJlbC5kYXRhU291cmNlID0gdGV4dDtcclxuICAgICAgICB0aGlzLm9uVGV4dENoYW5nZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGNsb3NlKCkge1xyXG4gICAgICAgIHRoaXMucmVtb3ZlU2VsZigpO1xyXG4gICAgICAgIHRoaXMuZXZlbnQoTGF5YS5FdmVudC5DTE9TRSk7XHJcbiAgICB9XHJcblxyXG4gICAgY3JlYXRlQ2hpbGRyZW4oKSB7XHJcbiAgICAgICAgdGhpcy5jZW50ZXJYID0gMDtcclxuICAgICAgICB0aGlzLmhlaWdodCA9IFRvYXN0Lk1BUkdJTiArIFRvYXN0Lk1BUkdJTjtcclxuXHJcbiAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICB0aGlzLmJnID0gbmV3IExheWEuSW1hZ2UoKTtcclxuICAgICAgICB0aGlzLmJnLnNraW4gPSBUb2FzdC5CR19JTUdfVVJMO1xyXG4gICAgICAgIHRoaXMuYmcuc2l6ZUdyaWQgPSBcIjI1LDI1LDI1LDI1XCI7XHJcbiAgICAgICAgdGhpcy5iZy5sZWZ0ID0gdGhpcy5iZy5yaWdodCA9IHRoaXMuYmcudG9wID0gdGhpcy5iZy5ib3R0b20gPSAwO1xyXG4gICAgICAgIHRoaXMuYWRkQ2hpbGQodGhpcy5iZyk7XHJcblxyXG4gICAgICAgIHRoaXMubGFiZWwgPSBuZXcgTGF5YS5MYWJlbCgpO1xyXG4gICAgICAgIHRoaXMubGFiZWwuY29sb3IgPSBUb2FzdC5DT0xPUjtcclxuICAgICAgICB0aGlzLmxhYmVsLmZvbnRTaXplID0gVG9hc3QuRk9OVF9TSVpFO1xyXG4gICAgICAgIHRoaXMubGFiZWwuYWxpZ24gPSBcImNlbnRlclwiO1xyXG4gICAgICAgIHRoaXMubGFiZWwueSA9IFRvYXN0LlRPUDtcclxuICAgICAgICB0aGlzLmxhYmVsLmNlbnRlclggPSAwO1xyXG4gICAgICAgIC8vIHRoaXMubGFiZWwuY2VudGVyWSA9IDA7XHJcbiAgICAgICAgLy8gdGhpcy5sYWJlbC5zdHJva2UgPSAxO1xyXG4gICAgICAgIC8vIHRoaXMubGFiZWwuc3Ryb2tlQ29sb3IgPSBcIiMwMDAwMDBcIjtcclxuICAgICAgICAvLyB0aGlzLmxhYmVsLnRvcCA9IFRvYXN0Lk1BUkdJTjtcclxuICAgICAgICAvLyB0aGlzLmxhYmVsLmJvdHRvbSA9IFRvYXN0Lk1BUkdJTjtcclxuICAgICAgICAvLyB0aGlzLmxhYmVsLmxlZnQgPSBUb2FzdC5NQVJHSU47XHJcbiAgICAgICAgLy8gdGhpcy5sYWJlbC5yaWdodCA9IFRvYXN0Lk1BUkdJTjtcclxuICAgICAgICB0aGlzLmxhYmVsLmxlYWRpbmcgPSAxNTtcclxuICAgICAgICB0aGlzLmxhYmVsLndvcmRXcmFwID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLmFkZENoaWxkKHRoaXMubGFiZWwpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICAvLyBwcm90ZWN0ZWQgaW5pdGlhbGl6ZSgpIHtcclxuICAgIC8vICAgICBzdXBlci5pbml0aWFsaXplKCk7XHJcbiAgICAvLyAgICAgdGhpcy5iaW5kVmlld0V2ZW50KHRoaXMubGFiZWwsIExheWEuRXZlbnQuQ0hBTkdFLCB0aGlzLm9uVGV4dENoYW5nZSk7XHJcbiAgICAvLyB9XHJcblxyXG4gICAgcHJvdGVjdGVkIG9uVGV4dENoYW5nZSgpIHtcclxuICAgICAgICBsZXQgdGV4dFc6IG51bWJlciA9IHRoaXMubGFiZWwud2lkdGg7XHJcbiAgICAgICAgY29uc3QgbWF4VGV4dFc6IG51bWJlciA9IFRvYXN0Lk1BWF9XSURUSCAtIFRvYXN0Lk1BUkdJTiAqIDI7XHJcbiAgICAgICAgLy8gY29uc3QgbWluVGV4dFc6IG51bWJlciA9IFRvYXN0Lk1JTl9XSURUSCAtIFRvYXN0Lk1BUkdJTiAqIDI7XHJcbiAgICAgICAgaWYgKHRleHRXID4gbWF4VGV4dFcpIHtcclxuICAgICAgICAgICAgdGhpcy5sYWJlbC53aWR0aCA9IG1heFRleHRXO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgdzogbnVtYmVyID0gdGhpcy5sYWJlbC53aWR0aCArIFRvYXN0Lk1BUkdJTiAqIDI7XHJcbiAgICAgICAgdyA9IE1hdGgubWluKHcsIFRvYXN0Lk1BWF9XSURUSCk7XHJcbiAgICAgICAgdyA9IE1hdGgubWF4KHcsIFRvYXN0Lk1JTl9XSURUSCk7XHJcbiAgICAgICAgdGhpcy53aWR0aCA9IHc7XHJcbiAgICAgICAgLy8gdGhpcy5oZWlnaHQgPSB0aGlzLmxhYmVsLmhlaWdodCArIFRvYXN0LlRPUCArIFRvYXN0LkJPVFRPTTtcclxuICAgICAgICB0aGlzLmhlaWdodCA9IHRoaXMubGFiZWwuaGVpZ2h0ICsgVG9hc3QuTUFSR0lOICogMjtcclxuICAgICAgICB0aGlzLnggPSAoTGF5YS5zdGFnZS53aWR0aCAtIHRoaXMud2lkdGgpID4+IDE7XHJcbiAgICAgICAgdGhpcy55ID0gKExheWEuc3RhZ2UuaGVpZ2h0IC0gdGhpcy5oZWlnaHQpID4+IDE7XHJcbiAgICB9XHJcblxyXG4gICAgcHJvdGVjdGVkIG9uQ29tcFJlc2l6ZSgpIHtcclxuICAgICAgICAvLyBpZiAodGhpcy5sYWJlbCkge1xyXG4gICAgICAgIC8vICAgICB0aGlzLmhlaWdodCA9IHRoaXMubGFiZWwuaGVpZ2h0ICsgTWVzc2FnZVRpcC5NQVJHSU4gKyBNZXNzYWdlVGlwLk1BUkdJTjtcclxuICAgICAgICAvLyB9XHJcbiAgICAgICAgaWYgKHRoaXMuYmcpIHtcclxuICAgICAgICAgICAgdGhpcy5iZy53aWR0aCA9IHRoaXMud2lkdGg7XHJcbiAgICAgICAgICAgIHRoaXMuYmcuaGVpZ2h0ID0gdGhpcy5oZWlnaHQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwiaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XHJcbmltcG9ydCB7IEdhbWVNb2RlbCB9IGZyb20gXCIuLi9qcy9HYW1lTW9kZWxcIjtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJvY2tldERpYWxvZyBleHRlbmRzIHVpLnRlbXBsYXRlLnNob3dSb2NrZXRVSSB7XHJcbiAgICBwcml2YXRlIHN0YXRpYyBfZGxnOiBSb2NrZXREaWFsb2c7XHJcblxyXG4gICAgc3RhdGljIGdldCBkbGcoKTogUm9ja2V0RGlhbG9nIHtcclxuICAgICAgICBpZiAoIXRoaXMuX2RsZykge1xyXG4gICAgICAgICAgICB0aGlzLl9kbGcgPSBuZXcgUm9ja2V0RGlhbG9nKCk7XHJcbiAgICAgICAgICAgIHRoaXMuX2RsZy54ID0gMDtcclxuICAgICAgICAgICAgdGhpcy5fZGxnLnkgPSAwO1xyXG4gICAgICAgICAgICB0aGlzLl9kbGcuaXNQb3B1cENlbnRlciA9IGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdGhpcy5fZGxnO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBvbkVuYWJsZSgpe1xyXG4gICAgICAgdGhpcy5idG5fY2xvc2Uub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuY2xvc2VEaWFsb2cpXHJcbiAgICAgICB0aGlzLmFuaTEucGxheSgwLGZhbHNlKVxyXG4gICAgICAgdGhpcy5hbmkyLnBsYXkoMCxmYWxzZSlcclxuICAgICAgIHRoaXMucmFua2luZy5hcnJheSA9IFtcclxuICAgICAgICAgICB7cmFua2luZzonMDEnLG5pY2tOYW1lOiflvKDkuIknLHVpZDonMTIzMzIzJyxhbW91bnQ6JzMyMy4zMid9LFxyXG4gICAgICAgICAgIHtyYW5raW5nOicwMicsbmlja05hbWU6J+W8oOS4iScsdWlkOicxMjMzMjMnLGFtb3VudDonMzIzLjMyJ30sXHJcbiAgICAgICAgICAge3Jhbmtpbmc6JzAzJyxuaWNrTmFtZTon5byg5LiJJyx1aWQ6JzEyMzMyMycsYW1vdW50OiczMjMuMzInfSxcclxuICAgICAgICAgICB7cmFua2luZzonMDQnLG5pY2tOYW1lOiflvKDkuIknLHVpZDonMTIzMzIzJyxhbW91bnQ6JzMyMy4zMid9LFxyXG4gICAgICAgICAgIHtyYW5raW5nOicwNScsbmlja05hbWU6J+W8oOS4iScsdWlkOicxMjMzMjMnLGFtb3VudDonMzIzLjMyJ30sXHJcbiAgICAgICAgICAge3Jhbmtpbmc6JzA2JyxuaWNrTmFtZTon5byg5LiJJyx1aWQ6JzEyMzMyMycsYW1vdW50OiczMjMuMzInfSxcclxuICAgICAgICAgICB7cmFua2luZzonMDcnLG5pY2tOYW1lOiflvKDkuIknLHVpZDonMTIzMzIzJyxhbW91bnQ6JzMyMy4zMid9LFxyXG4gICAgICAgICAgIHtyYW5raW5nOicwOCcsbmlja05hbWU6J+W8oOS4iScsdWlkOicxMjMzMjMnLGFtb3VudDonMzIzLjMyJ30sXHJcbiAgICAgICAgICAge3Jhbmtpbmc6JzA5JyxuaWNrTmFtZTon5byg5LiJJyx1aWQ6JzEyMzMyMycsYW1vdW50OiczMjMuMzInfSxcclxuICAgICAgICAgICB7cmFua2luZzonMTAnLG5pY2tOYW1lOiflvKDkuIknLHVpZDonMTIzMzIzJyxhbW91bnQ6JzMyMy4zMid9LFxyXG4gICAgICAgICAgIHtyYW5raW5nOicxMScsbmlja05hbWU6J+W8oOS4iScsdWlkOicxMjMzMjMnLGFtb3VudDonMzIzLjMyJ30sXHJcbiAgICAgICAgICAge3Jhbmtpbmc6JzEyJyxuaWNrTmFtZTon5byg5LiJJyx1aWQ6JzEyMzMyMycsYW1vdW50OiczMjMuMzInfSxcclxuICAgICAgICAgICB7cmFua2luZzonMTMnLG5pY2tOYW1lOiflvKDkuIknLHVpZDonMTIzMzIzJyxhbW91bnQ6JzMyMy4zMid9LFxyXG4gICAgICAgICAgIHtyYW5raW5nOicxNCcsbmlja05hbWU6J+W8oOS4iScsdWlkOicxMjMzMjMnLGFtb3VudDonMzIzLjMyJ30sXHJcbiAgICAgICAgICAge3Jhbmtpbmc6JzE1JyxuaWNrTmFtZTon5byg5LiJJyx1aWQ6JzEyMzMyMycsYW1vdW50OiczMjMuMzInfVxyXG4gICAgICAgXVxyXG4gICAgfVxyXG4gICAgc3RhdGljIGluaXQoKXtcclxuICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5vbignZ2V0Um9ja2V0UmFua2luZycsdGhpcywocmVzOmFueSk9PntcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ+aVsOaNruWPmOWKqDInKTtcclxuICAgICAgICAgICAgdGhpcy5kbGcucG9wdXAoZmFsc2UsIGZhbHNlKTtcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIGNsb3NlRGlhbG9nKCl7XHJcbiAgICAgICAgdGhpcy5jbG9zZSgpXHJcbiAgICB9XHJcblxyXG59IiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXHJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcclxuXHJcbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxyXG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcclxuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxyXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxyXG5cclxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XHJcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XHJcblxyXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XHJcbn1cclxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xyXG59XHJcbihmdW5jdGlvbiAoKSB7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcclxuICAgICAgICB9XHJcbiAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XHJcbiAgICB9XHJcbiAgICB0cnkge1xyXG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xyXG4gICAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xyXG4gICAgfVxyXG59ICgpKVxyXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xyXG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcclxuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcclxuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xyXG4gICAgfVxyXG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcclxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xyXG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xyXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XHJcbiAgICB9XHJcbiAgICB0cnkge1xyXG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcclxuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xyXG4gICAgfSBjYXRjaChlKXtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xyXG4gICAgICAgIH0gY2F0Y2goZSl7XHJcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXHJcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxufVxyXG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XHJcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcclxuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcclxuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XHJcbiAgICB9XHJcbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXHJcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcclxuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XHJcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xyXG4gICAgfVxyXG4gICAgdHJ5IHtcclxuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXHJcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xyXG4gICAgfSBjYXRjaCAoZSl7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxyXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcclxuICAgICAgICB9IGNhdGNoIChlKXtcclxuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXHJcbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcblxyXG59XHJcbnZhciBxdWV1ZSA9IFtdO1xyXG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcclxudmFyIGN1cnJlbnRRdWV1ZTtcclxudmFyIHF1ZXVlSW5kZXggPSAtMTtcclxuXHJcbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcclxuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGRyYWluaW5nID0gZmFsc2U7XHJcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xyXG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcclxuICAgIH1cclxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcclxuICAgICAgICBkcmFpblF1ZXVlKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XHJcbiAgICBpZiAoZHJhaW5pbmcpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcclxuICAgIGRyYWluaW5nID0gdHJ1ZTtcclxuXHJcbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xyXG4gICAgd2hpbGUobGVuKSB7XHJcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XHJcbiAgICAgICAgcXVldWUgPSBbXTtcclxuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XHJcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcclxuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XHJcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xyXG4gICAgfVxyXG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcclxuICAgIGRyYWluaW5nID0gZmFsc2U7XHJcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XHJcbn1cclxuXHJcbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XHJcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XHJcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcclxuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xyXG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcclxuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xyXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcclxuICAgIHRoaXMuZnVuID0gZnVuO1xyXG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xyXG59XHJcbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xyXG59O1xyXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xyXG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xyXG5wcm9jZXNzLmVudiA9IHt9O1xyXG5wcm9jZXNzLmFyZ3YgPSBbXTtcclxucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXHJcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcclxuXHJcbmZ1bmN0aW9uIG5vb3AoKSB7fVxyXG5cclxucHJvY2Vzcy5vbiA9IG5vb3A7XHJcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xyXG5wcm9jZXNzLm9uY2UgPSBub29wO1xyXG5wcm9jZXNzLm9mZiA9IG5vb3A7XHJcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xyXG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XHJcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XHJcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcclxucHJvY2Vzcy5wcmVwZW5kT25jZUxpc3RlbmVyID0gbm9vcDtcclxuXHJcbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cclxuXHJcbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XHJcbn07XHJcblxyXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xyXG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcclxufTtcclxucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcclxuIl19
