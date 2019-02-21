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

},{"../core/createError":9,"./../core/settle":12,"./../helpers/btoa":16,"./../helpers/buildURL":17,"./../helpers/cookies":19,"./../helpers/isURLSameOrigin":21,"./../helpers/parseHeaders":23,"./../utils":25,"_process":52}],3:[function(require,module,exports){
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

},{"./adapters/http":2,"./adapters/xhr":2,"./helpers/normalizeHeaderName":22,"./utils":25,"_process":52}],15:[function(require,module,exports){
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
const Guessing_1 = require("./script/Guessing");
const numberListDomScript_1 = require("./template/numberListDomScript");
const Home_1 = require("./script/Home");
const Record_1 = require("./script/Record");
const joinRecords_1 = require("./template/joinRecords");
const pswInput_1 = require("./template/pswInput");
const tipDialog_1 = require("./template/tipDialog");
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
        reg("script/Guessing.ts", Guessing_1.default);
        reg("template/numberListDomScript.ts", numberListDomScript_1.default);
        reg("script/Home.ts", Home_1.default);
        reg("script/Record.ts", Record_1.default);
        reg("template/joinRecords.ts", joinRecords_1.default);
        reg("template/pswInput.ts", pswInput_1.default);
        reg("template/tipDialog.ts", tipDialog_1.default);
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
},{"./publicScript/PageNavScript":33,"./publicScript/PageScript":34,"./publicScript/Screen":35,"./script/Assistant":36,"./script/Card":37,"./script/Guessing":38,"./script/Home":39,"./script/Record":40,"./script/grandPrix":41,"./template/joinRecords":42,"./template/numberListDomScript":43,"./template/previousRecords":44,"./template/pswInput":45,"./template/tipDialog":46,"./template/trendList":47}],28:[function(require,module,exports){
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
        this.userInfo = {}; //用户信息
    }
    static getInstance() {
        if (!this._gameModelInstance) {
            this._gameModelInstance = new GameModel();
        }
        return this._gameModelInstance;
    }
    /**保存用户信息 */
    setUserInfo(userInfo) {
        this.userInfo = userInfo;
        this.event('getUserInfo', this.userInfo);
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
},{}],33:[function(require,module,exports){
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
},{"../view/Tabbar":50}],34:[function(require,module,exports){
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
},{"../view/Tabbar":50}],35:[function(require,module,exports){
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
},{}],36:[function(require,module,exports){
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
            this.cateTabList.array = GoodsNameArr;
            this.cateTabList.repeatX = GoodsNameArr.length;
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
            Toast_1.Toast.show('暂未开放，敬请期待暂未开放，敬请期待暂未开放，敬请期待暂未开放，敬请期待');
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
},{"../js/api":30,"../ui/layaMaxUI":48,"../view/Toast":51}],37:[function(require,module,exports){
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
            this.award.text = `${utils_1.default.toDecimal(item.award, 2)}  USDT`;
            this.soldNum_totalNum.text = `${item.soldNum}/${item.totalNum}`;
            this.progress.value = +`${item.soldNum / item.totalNum}`;
        }
    }
    clickItem() {
        Tabbar_1.Tabbar.getInstance().openScene('guessing.scene', this._dataSource.goodsId);
    }
}
exports.default = Card;
},{"../js/utils":32,"../ui/layaMaxUI":48,"../view/Tabbar":50}],38:[function(require,module,exports){
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
class Guessing extends layaMaxUI_1.ui.guessingUI {
    constructor() {
        super();
        this.goodsId = ''; //商品ID
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
    }
    onOpened(goodsId) {
        this.goodsId = goodsId;
        this.getGoodsDetails(this.goodsId);
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
                codeList: this.codeList
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
        this.numberList.array = this.rawDataArr_new;
        this.getSelectNumber();
    }
    /**获取商品详情
     * @param goodsId 商品id
     */
    getGoodsDetails(goodsId) {
        api_1.default.getGoodsDetails(goodsId).then((res) => {
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
},{"../js/GameModel":29,"../js/api":30,"../js/utils":32,"../template/pswInput":45,"../ui/layaMaxUI":48,"../view/Toast":51}],39:[function(require,module,exports){
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
    }
    /**充值 */
    btnRechargeFunc() {
        Toast_1.Toast.show('点击充值');
    }
    /**空投 */
    putInFunc() {
        Toast_1.Toast.show('暂未开放，敬请期待');
    }
    /**获取个人信息 */
    getUserInfo() {
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
            }).catch((err) => {
                console.log(err.message);
                // 获取信息失败更新信息
                GameModel_1.GameModel.getInstance().setUserInfo({
                    userInfo: {}
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
},{"../js/GameModel":29,"../js/api":30,"../js/http":31,"../js/utils":32,"../ui/layaMaxUI":48,"../view/Toast":51}],40:[function(require,module,exports){
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
},{"../js/api":30,"../ui/layaMaxUI":48}],41:[function(require,module,exports){
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
class grandPrix extends layaMaxUI_1.ui.grandPrixUI {
    constructor() {
        super();
        this.rankPrizeHelp.on(Laya.Event.CLICK, this, this.openRankPrizeHelp);
    }
    onEnable() {
        this.getRankToday();
    }
    /**获取大奖信息 */
    getRankToday() {
        api_1.default.getRankToday().then((res) => {
            this.bonus.text = `${utils_1.default.toDecimal(res.potMoney, 2)}`;
            utils_1.default.countDown(res.countDown, ((time) => {
                this.CountDown.text = time;
            }));
            //未登录则不显示个人排名
            if (res.list.self.userId) {
                this.myRankBox.visible = true;
                this.myranking.text = res.list.self.rank > 15 ? '15+' : `${res.list.self.rank}`;
                this.avatar.skin = res.list.self.avatar;
                this.nickName.text = res.list.self.nickName;
                this.uid.text = res.list.self.userId;
                this.volume.text = `${res.list.self.consum} USDT`;
            }
        }).catch((err) => {
            console.log(err.message);
        });
    }
    /**说明 */
    openRankPrizeHelp() {
        window.location.href = 'https://m.xyhj.io/rankPrizeHelp.html';
    }
}
exports.default = grandPrix;
},{"../js/api":30,"../js/utils":32,"../ui/layaMaxUI":48}],42:[function(require,module,exports){
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
            this.openTime.text = utils_1.default.formatDateTime(item.openTime);
            this.hitCode.text = item.hitCode;
            this.codeList.text = item.codeList;
            if (item.status === '0') {
                this.noPrize.visible = true;
                this.prize.visible = false;
                this.noPrize.text = '未开奖';
                this.openTime.text = '---';
                this.hitCode.text = '---';
            }
            else if (item.status === '1') {
                this.noPrize.visible = true;
                this.prize.visible = false;
                this.noPrize.text = '开奖中';
                this.openTime.text = '---';
                this.hitCode.text = '---';
            }
            else if (item.status === '2' && item.hit === 0) {
                this.noPrize.visible = true;
                this.prize.visible = false;
                this.noPrize.text = '未中奖';
                this.award.visible = false;
            }
            else if (item.status === '2' && item.hit === 1) {
                this.prize.visible = true;
                this.noPrize.visible = false;
                this.award.text = `${+utils_1.default.toDecimal(item.goodsValue, 2)} USDT`;
                this.award.visible = true;
            }
        }
    }
}
exports.default = joinRecord;
},{"../js/utils":32,"../ui/layaMaxUI":48}],43:[function(require,module,exports){
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
},{"../js/GameModel":29,"../ui/layaMaxUI":48,"../view/Toast":51}],44:[function(require,module,exports){
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
        alert(`前往hash地址：${this._dataSource.txHash}`);
    }
}
exports.default = previousRecord;
},{"../js/utils":32,"../ui/layaMaxUI":48}],45:[function(require,module,exports){
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
},{"../js/api":30,"../ui/layaMaxUI":48,"../view/Toast":51,"./tipDialog":46}],46:[function(require,module,exports){
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
    }
    onEnable() {
        this.btnContinue.on(Laya.Event.CLICK, this, this.closeFunc);
        this.btnViewRecord.on(Laya.Event.CLICK, this, this.viewRecordFunc);
    }
    /**关闭密码框 */
    closeFunc() {
        this.close();
    }
    viewRecordFunc() {
        this.close();
        Tabbar_1.Tabbar.getInstance().openScene('record.scene');
    }
}
exports.default = TipsDiaLog;
},{"../ui/layaMaxUI":48,"../view/Tabbar":50}],47:[function(require,module,exports){
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
},{"../ui/layaMaxUI":48,"../view/Tabbar":50}],48:[function(require,module,exports){
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
    class recordUI extends Laya.Scene {
        constructor() { super(); }
        createChildren() {
            super.createChildren();
            this.loadScene("record");
        }
    }
    ui.recordUI = recordUI;
    class TabbarUI extends Laya.View {
        constructor() { super(); }
        createChildren() {
            super.createChildren();
            this.loadScene("Tabbar");
        }
    }
    ui.TabbarUI = TabbarUI;
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
    })(template = ui.template || (ui.template = {}));
})(ui = exports.ui || (exports.ui = {}));
},{}],49:[function(require,module,exports){
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
},{}],50:[function(require,module,exports){
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
const tabbarArr = ['home.scene', 'record.scene', 'assistant.scene']; //tabbar的页面
const pageArr = ['guessing.scene', 'grandPrix.scene']; //非tabbar页面
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
    /**非tabbar跳转页面,可携带参数 */
    openScene(scene, param) {
        this._openSceneParam = param;
        this.tab.selectedIndex = Tabbar.SCENES.indexOf(scene);
    }
    /**监视tabbar改变 */
    createView(view) {
        super.createView(view);
        this.tab.on(Laya.Event.CHANGE, this, this.onClickTab);
        this.onClickTab();
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
    }
}
/**页面数组 */
Tabbar.SCENES = [...tabbarArr, ...pageArr];
exports.Tabbar = Tabbar;
},{"../ui/layaMaxUI":48}],51:[function(require,module,exports){
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
Toast.DURATION = 3000;
Toast.storeTextList = [];
exports.Toast = Toast;
},{"./LayerManager":49}],52:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL0Rvd25sb2Fkcy9MYXlhQWlySURFL3Jlc291cmNlcy9hcHAvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIm5vZGVfbW9kdWxlcy9fYXhpb3NAMC4xOC4wQGF4aW9zL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL19heGlvc0AwLjE4LjBAYXhpb3MvbGliL2FkYXB0ZXJzL3hoci5qcyIsIm5vZGVfbW9kdWxlcy9fYXhpb3NAMC4xOC4wQGF4aW9zL2xpYi9heGlvcy5qcyIsIm5vZGVfbW9kdWxlcy9fYXhpb3NAMC4xOC4wQGF4aW9zL2xpYi9jYW5jZWwvQ2FuY2VsLmpzIiwibm9kZV9tb2R1bGVzL19heGlvc0AwLjE4LjBAYXhpb3MvbGliL2NhbmNlbC9DYW5jZWxUb2tlbi5qcyIsIm5vZGVfbW9kdWxlcy9fYXhpb3NAMC4xOC4wQGF4aW9zL2xpYi9jYW5jZWwvaXNDYW5jZWwuanMiLCJub2RlX21vZHVsZXMvX2F4aW9zQDAuMTguMEBheGlvcy9saWIvY29yZS9BeGlvcy5qcyIsIm5vZGVfbW9kdWxlcy9fYXhpb3NAMC4xOC4wQGF4aW9zL2xpYi9jb3JlL0ludGVyY2VwdG9yTWFuYWdlci5qcyIsIm5vZGVfbW9kdWxlcy9fYXhpb3NAMC4xOC4wQGF4aW9zL2xpYi9jb3JlL2NyZWF0ZUVycm9yLmpzIiwibm9kZV9tb2R1bGVzL19heGlvc0AwLjE4LjBAYXhpb3MvbGliL2NvcmUvZGlzcGF0Y2hSZXF1ZXN0LmpzIiwibm9kZV9tb2R1bGVzL19heGlvc0AwLjE4LjBAYXhpb3MvbGliL2NvcmUvZW5oYW5jZUVycm9yLmpzIiwibm9kZV9tb2R1bGVzL19heGlvc0AwLjE4LjBAYXhpb3MvbGliL2NvcmUvc2V0dGxlLmpzIiwibm9kZV9tb2R1bGVzL19heGlvc0AwLjE4LjBAYXhpb3MvbGliL2NvcmUvdHJhbnNmb3JtRGF0YS5qcyIsIm5vZGVfbW9kdWxlcy9fYXhpb3NAMC4xOC4wQGF4aW9zL2xpYi9kZWZhdWx0cy5qcyIsIm5vZGVfbW9kdWxlcy9fYXhpb3NAMC4xOC4wQGF4aW9zL2xpYi9oZWxwZXJzL2JpbmQuanMiLCJub2RlX21vZHVsZXMvX2F4aW9zQDAuMTguMEBheGlvcy9saWIvaGVscGVycy9idG9hLmpzIiwibm9kZV9tb2R1bGVzL19heGlvc0AwLjE4LjBAYXhpb3MvbGliL2hlbHBlcnMvYnVpbGRVUkwuanMiLCJub2RlX21vZHVsZXMvX2F4aW9zQDAuMTguMEBheGlvcy9saWIvaGVscGVycy9jb21iaW5lVVJMcy5qcyIsIm5vZGVfbW9kdWxlcy9fYXhpb3NAMC4xOC4wQGF4aW9zL2xpYi9oZWxwZXJzL2Nvb2tpZXMuanMiLCJub2RlX21vZHVsZXMvX2F4aW9zQDAuMTguMEBheGlvcy9saWIvaGVscGVycy9pc0Fic29sdXRlVVJMLmpzIiwibm9kZV9tb2R1bGVzL19heGlvc0AwLjE4LjBAYXhpb3MvbGliL2hlbHBlcnMvaXNVUkxTYW1lT3JpZ2luLmpzIiwibm9kZV9tb2R1bGVzL19heGlvc0AwLjE4LjBAYXhpb3MvbGliL2hlbHBlcnMvbm9ybWFsaXplSGVhZGVyTmFtZS5qcyIsIm5vZGVfbW9kdWxlcy9fYXhpb3NAMC4xOC4wQGF4aW9zL2xpYi9oZWxwZXJzL3BhcnNlSGVhZGVycy5qcyIsIm5vZGVfbW9kdWxlcy9fYXhpb3NAMC4xOC4wQGF4aW9zL2xpYi9oZWxwZXJzL3NwcmVhZC5qcyIsIm5vZGVfbW9kdWxlcy9fYXhpb3NAMC4xOC4wQGF4aW9zL2xpYi91dGlscy5qcyIsIm5vZGVfbW9kdWxlcy9faXMtYnVmZmVyQDEuMS42QGlzLWJ1ZmZlci9pbmRleC5qcyIsInNyYy9HYW1lQ29uZmlnLnRzIiwic3JjL01haW4udHMiLCJzcmMvanMvR2FtZU1vZGVsLnRzIiwic3JjL2pzL2FwaS50cyIsInNyYy9qcy9odHRwLnRzIiwic3JjL2pzL3V0aWxzLnRzIiwic3JjL3B1YmxpY1NjcmlwdC9QYWdlTmF2U2NyaXB0LnRzIiwic3JjL3B1YmxpY1NjcmlwdC9QYWdlU2NyaXB0LnRzIiwic3JjL3B1YmxpY1NjcmlwdC9TY3JlZW4udHMiLCJzcmMvc2NyaXB0L0Fzc2lzdGFudC50cyIsInNyYy9zY3JpcHQvQ2FyZC50cyIsInNyYy9zY3JpcHQvR3Vlc3NpbmcudHMiLCJzcmMvc2NyaXB0L0hvbWUudHMiLCJzcmMvc2NyaXB0L1JlY29yZC50cyIsInNyYy9zY3JpcHQvZ3JhbmRQcml4LnRzIiwic3JjL3RlbXBsYXRlL2pvaW5SZWNvcmRzLnRzIiwic3JjL3RlbXBsYXRlL251bWJlckxpc3REb21TY3JpcHQudHMiLCJzcmMvdGVtcGxhdGUvcHJldmlvdXNSZWNvcmRzLnRzIiwic3JjL3RlbXBsYXRlL3Bzd0lucHV0LnRzIiwic3JjL3RlbXBsYXRlL3RpcERpYWxvZy50cyIsInNyYy90ZW1wbGF0ZS90cmVuZExpc3QudHMiLCJzcmMvdWkvbGF5YU1heFVJLnRzIiwic3JjL3ZpZXcvTGF5ZXJNYW5hZ2VyLnRzIiwic3JjL3ZpZXcvVGFiYmFyLnRzIiwic3JjL3ZpZXcvVG9hc3QudHMiLCIuLi8uLi9Eb3dubG9hZHMvTGF5YUFpcklERS9yZXNvdXJjZXMvYXBwL25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1ZBOzs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3BMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDaEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9TQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3JCQSxnR0FBZ0c7QUFDaEcsa0RBQTBDO0FBQzFDLDBEQUFrRDtBQUNsRCxrREFBMEM7QUFDMUMsb0RBQTRDO0FBQzVDLGdFQUF3RDtBQUN4RCx3Q0FBZ0M7QUFDaEMsa0RBQTBDO0FBQzFDLGdFQUF3RDtBQUN4RCxnREFBd0M7QUFDeEMsd0VBQWdFO0FBQ2hFLHdDQUFnQztBQUNoQyw0Q0FBb0M7QUFDcEMsd0RBQWdEO0FBQ2hELGtEQUEwQztBQUMxQyxvREFBNEM7QUFDNUM7O0VBRUU7QUFDRjtJQWFJLGdCQUFjLENBQUM7SUFDZixNQUFNLENBQUMsSUFBSTtRQUNQLElBQUksR0FBRyxHQUFhLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDO1FBQzdDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBQyxtQkFBUyxDQUFDLENBQUM7UUFDckMsR0FBRyxDQUFDLDRCQUE0QixFQUFDLG9CQUFVLENBQUMsQ0FBQztRQUM3QyxHQUFHLENBQUMsd0JBQXdCLEVBQUMsZ0JBQU0sQ0FBQyxDQUFDO1FBQ3JDLEdBQUcsQ0FBQyx1QkFBdUIsRUFBQyxtQkFBUyxDQUFDLENBQUM7UUFDdkMsR0FBRyxDQUFDLDZCQUE2QixFQUFDLHlCQUFlLENBQUMsQ0FBQztRQUNuRCxHQUFHLENBQUMsZ0JBQWdCLEVBQUMsY0FBSSxDQUFDLENBQUM7UUFDM0IsR0FBRyxDQUFDLHFCQUFxQixFQUFDLG1CQUFTLENBQUMsQ0FBQztRQUNyQyxHQUFHLENBQUMsK0JBQStCLEVBQUMsdUJBQWEsQ0FBQyxDQUFDO1FBQ25ELEdBQUcsQ0FBQyxvQkFBb0IsRUFBQyxrQkFBUSxDQUFDLENBQUM7UUFDbkMsR0FBRyxDQUFDLGlDQUFpQyxFQUFDLDZCQUFtQixDQUFDLENBQUM7UUFDM0QsR0FBRyxDQUFDLGdCQUFnQixFQUFDLGNBQUksQ0FBQyxDQUFDO1FBQzNCLEdBQUcsQ0FBQyxrQkFBa0IsRUFBQyxnQkFBTSxDQUFDLENBQUM7UUFDL0IsR0FBRyxDQUFDLHlCQUF5QixFQUFDLHFCQUFXLENBQUMsQ0FBQztRQUMzQyxHQUFHLENBQUMsc0JBQXNCLEVBQUMsa0JBQVEsQ0FBQyxDQUFDO1FBQ3JDLEdBQUcsQ0FBQyx1QkFBdUIsRUFBQyxtQkFBUyxDQUFDLENBQUM7SUFDM0MsQ0FBQzs7QUE5Qk0sZ0JBQUssR0FBUSxHQUFHLENBQUM7QUFDakIsaUJBQU0sR0FBUSxJQUFJLENBQUM7QUFDbkIsb0JBQVMsR0FBUSxZQUFZLENBQUM7QUFDOUIscUJBQVUsR0FBUSxNQUFNLENBQUM7QUFDekIsaUJBQU0sR0FBUSxLQUFLLENBQUM7QUFDcEIsaUJBQU0sR0FBUSxNQUFNLENBQUM7QUFDckIscUJBQVUsR0FBSyxZQUFZLENBQUM7QUFDNUIsb0JBQVMsR0FBUSxFQUFFLENBQUM7QUFDcEIsZ0JBQUssR0FBUyxLQUFLLENBQUM7QUFDcEIsZUFBSSxHQUFTLEtBQUssQ0FBQztBQUNuQix1QkFBWSxHQUFTLEtBQUssQ0FBQztBQUMzQiw0QkFBaUIsR0FBUyxJQUFJLENBQUM7QUFaMUMsNkJBZ0NDO0FBQ0QsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDOzs7O0FDcERsQiw2Q0FBc0M7QUFDdEM7SUFDQztRQUNDLGdCQUFnQjtRQUNoQixJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUM7WUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLG9CQUFVLENBQUMsS0FBSyxFQUFFLG9CQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7O1lBQ2xFLElBQUksQ0FBQyxJQUFJLENBQUMsb0JBQVUsQ0FBQyxLQUFLLEVBQUUsb0JBQVUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDbkUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUM1QyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2xELElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLG9CQUFVLENBQUMsU0FBUyxDQUFDO1FBQzVDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLG9CQUFVLENBQUMsVUFBVSxDQUFDO1FBQzlDLG9CQUFvQjtRQUNwQixJQUFJLENBQUMsR0FBRyxDQUFDLGlCQUFpQixHQUFHLG9CQUFVLENBQUMsaUJBQWlCLENBQUM7UUFFMUQsb0RBQW9EO1FBQ3BELElBQUksb0JBQVUsQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLElBQUksTUFBTTtZQUFFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQzlGLElBQUksb0JBQVUsQ0FBQyxZQUFZLElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDO1lBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDM0YsSUFBSSxvQkFBVSxDQUFDLElBQUk7WUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3RDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7UUFFN0IsZ0RBQWdEO1FBQ2hELElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUNySSxDQUFDO0lBRUQsZUFBZTtRQUNkLCtDQUErQztRQUMvQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztJQUNqRyxDQUFDO0lBRUQsY0FBYztRQUNiLFlBQVk7UUFDWixvQkFBVSxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxvQkFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ2pFLENBQUM7Q0FDRDtBQUNELE9BQU87QUFDUCxJQUFJLElBQUksRUFBRSxDQUFDOzs7QUNsQ1g7Ozs7OztHQU1HOztBQUVILGVBQXVCLFNBQVEsSUFBSSxDQUFDLGVBQWU7SUFBbkQ7O1FBR0ksYUFBUSxHQUFVLEVBQUUsQ0FBQyxDQUFDLE1BQU07SUFjaEMsQ0FBQztJQVpHLE1BQU0sQ0FBQyxXQUFXO1FBQ2QsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRTtZQUMxQixJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxTQUFTLEVBQUUsQ0FBQztTQUM3QztRQUNELE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDO0lBQ25DLENBQUM7SUFFRCxZQUFZO0lBQ1osV0FBVyxDQUFDLFFBQWU7UUFDdkIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQzNDLENBQUM7Q0FDSjtBQWpCRCw4QkFpQkM7OztBQ3pCRDs7Ozs7O0dBTUc7O0FBRUgsaUNBQW1DO0FBQ25DLDJDQUF3QztBQUV4QyxrQkFBZTtJQUNYLFlBQVk7SUFDWixXQUFXO1FBQ1AsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUNuQyxVQUFHLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQVEsRUFBRSxFQUFFO2dCQUN2QyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTtvQkFDWCxTQUFTO29CQUNULHFCQUFTLENBQUMsV0FBVyxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtvQkFDakQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBO2lCQUNmO3FCQUFNO29CQUNILE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtpQkFDZDtZQUNMLENBQUMsQ0FBQyxDQUFBO1FBQ04sQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDO0lBRUQsYUFBYTtJQUNiLFlBQVk7UUFDUixPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ25DLFVBQUcsQ0FBQyxhQUFhLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBUSxFQUFFLEVBQUU7Z0JBQ3JDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFO29CQUNYLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtpQkFDZjtxQkFBTTtvQkFDSCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7aUJBQ2Q7WUFDTCxDQUFDLENBQUMsQ0FBQTtRQUNOLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQztJQUVELGNBQWM7SUFDZCxZQUFZO1FBQ1IsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUNuQyxVQUFHLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQVEsRUFBRSxFQUFFO2dCQUN0QyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTtvQkFDWCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7aUJBQ2Y7cUJBQU07b0JBQ0gsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO2lCQUNkO1lBQ0wsQ0FBQyxDQUFDLENBQUE7UUFDTixDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUM7SUFFRDs7T0FFRztJQUNILGVBQWUsQ0FBQyxPQUFjO1FBQzFCLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUMsTUFBTSxFQUFFLEVBQUU7WUFDbEMsVUFBRyxDQUFDLFlBQVksRUFBRSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBUSxFQUFFLEVBQUU7Z0JBQzdDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFO29CQUNYLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtpQkFDZjtxQkFBTTtvQkFDSCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7aUJBQ2Q7WUFDTCxDQUFDLENBQUMsQ0FBQTtRQUNOLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQztJQUVEOzs7T0FHRztJQUNILFdBQVcsQ0FBQyxPQUFjLENBQUMsRUFBQyxXQUFrQixFQUFFO1FBQzVDLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUMsTUFBTSxFQUFFLEVBQUU7WUFDbEMsVUFBRyxDQUFDLGlCQUFpQixFQUFDLEVBQUMsSUFBSSxFQUFDLFFBQVEsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBTyxFQUFDLEVBQUU7Z0JBQ25ELElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFO29CQUNYLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtpQkFDZjtxQkFBTTtvQkFDSCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7aUJBQ2Q7WUFDTCxDQUFDLENBQUMsQ0FBQTtRQUNOLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0gsZUFBZSxDQUFDLE9BQWMsQ0FBQyxFQUFDLFdBQWtCLEVBQUUsRUFBQyxTQUFpQixFQUFDLFNBQWlCO1FBQ3BGLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUMsTUFBTSxFQUFFLEVBQUU7WUFDbEMsVUFBRyxDQUFDLGdCQUFnQixFQUFDLEVBQUMsSUFBSSxFQUFDLFFBQVEsRUFBQyxTQUFTLEVBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFPLEVBQUMsRUFBRTtnQkFDdEUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUU7b0JBQ1gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBO2lCQUNmO3FCQUFNO29CQUNILE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtpQkFDZDtZQUNMLENBQUMsQ0FBQyxDQUFBO1FBQ04sQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDO0lBRUQsWUFBWTtJQUNaLGdCQUFnQjtRQUNaLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUMsTUFBTSxFQUFDLEVBQUU7WUFDakMsVUFBRyxDQUFDLGlCQUFpQixFQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQU8sRUFBQyxFQUFFO2dCQUN0QyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTtvQkFDWCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7aUJBQ2Y7cUJBQU07b0JBQ0gsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO2lCQUNkO1lBQ0wsQ0FBQyxDQUFDLENBQUE7UUFDTixDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsYUFBYSxDQUFDLFNBQWdCLEVBQUMsT0FBYyxDQUFDLEVBQUMsV0FBa0IsRUFBRTtRQUMvRCxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFDLE1BQU0sRUFBQyxFQUFFO1lBQ2pDLFVBQUcsQ0FBQyxjQUFjLEVBQUMsRUFBQyxTQUFTLEVBQUMsSUFBSSxFQUFDLFFBQVEsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBTyxFQUFDLEVBQUU7Z0JBQzFELElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFO29CQUNYLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtpQkFDZjtxQkFBTTtvQkFDSCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7aUJBQ2Q7WUFDTCxDQUFDLENBQUMsQ0FBQTtRQUNOLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxZQUFZLENBQUMsTUFBYSxFQUFDLFFBQWUsRUFBQyxXQUFrQjtRQUN6RCxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ2xDLFdBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRSxNQUFNLEVBQUMsUUFBUSxFQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBUSxFQUFFLEVBQUU7Z0JBQ2xFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFO29CQUNYLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtvQkFDbEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBO2lCQUNmO3FCQUFNO29CQUNILE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtpQkFDZDtZQUNMLENBQUMsQ0FBQyxDQUFBO1FBQ04sQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDO0NBQ0osQ0FBQTs7OztBQ3JKRDs7Ozs7O0dBTUc7QUFDSCxpQ0FBMEI7QUFFMUIsZUFBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO0FBQy9CLGVBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxtQ0FBbUMsQ0FBQztBQUNsRixlQUFLLENBQUMsUUFBUSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsQ0FBRSxZQUFZO0FBQ3BELDREQUE0RDtBQUM1RCxlQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sR0FBRyxnQ0FBZ0MsQ0FBQTtBQUt6RCx5QkFBeUI7QUFDekIsc0JBQXNCLE1BQWE7SUFDakMsTUFBTSxJQUFJLEdBQUcsSUFBSSxRQUFRLEVBQUUsQ0FBQztJQUM1QixLQUFLLE1BQU0sR0FBRyxJQUFJLE1BQU0sRUFBRTtRQUN4QixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztLQUM5QjtJQUNELE9BQU8sSUFBSSxDQUFBO0FBQ2IsQ0FBQztBQUVELFlBQVk7QUFDWixNQUFNLFVBQVUsR0FBRyxDQUFDLGFBQWEsRUFBQyxlQUFlLENBQUMsQ0FBQTtBQUVsRCxrQkFBa0I7QUFDbEIsZUFBSyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUM1QixNQUFNLENBQUMsRUFBRTtJQUNQLFNBQVM7SUFDVCxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRztRQUN0QyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLFlBQVksQ0FBQTtLQUN2QztTQUFJO1FBQ0gsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxZQUFZLENBQUM7S0FDeEM7SUFFRCxJQUFJLE1BQU0sQ0FBQyxNQUFNLElBQUksTUFBTSxFQUFFO1FBQzNCLE1BQU0sQ0FBQyxJQUFJLEdBQUcsWUFBWSxtQkFDckIsTUFBTSxDQUFDLElBQUksRUFDZCxDQUFBO0tBQ0g7U0FBSyxJQUFHLE1BQU0sQ0FBQyxNQUFNLElBQUksS0FBSyxFQUFDO1FBQzlCLE1BQU0sQ0FBQyxNQUFNLHFCQUNSLE1BQU0sQ0FBQyxNQUFNLENBQ2pCLENBQUE7S0FDRjtJQUNELE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUMsRUFDRCxLQUFLLENBQUMsRUFBRTtJQUNOLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMvQixDQUFDLENBQ0YsQ0FBQztBQUNGLG1CQUFtQjtBQUNuQixlQUFLLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQzdCLFFBQVEsQ0FBQyxFQUFFO0lBQ1QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFO1FBQzFCLE1BQU07S0FDUDtJQUNELE9BQU8sUUFBUSxDQUFDO0FBQ2xCLENBQUMsRUFDRCxLQUFLLENBQUMsRUFBRTtJQUNOLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMvQixDQUFDLENBQ0YsQ0FBQztBQUVGOzs7OztHQUtHO0FBQ0gsYUFBb0IsR0FBVSxFQUFFLE1BQWE7SUFDM0MsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUNyQyxlQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQ3pDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRTtnQkFDMUIsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDOUI7aUJBQUs7Z0JBQ0osT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDaEM7UUFDSCxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDYixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQVpELGtCQVlDO0FBRUQ7Ozs7O0dBS0c7QUFFSCxjQUFxQixHQUFVLEVBQUUsSUFBVztJQUMxQyxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3JDLGVBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLElBQUksQ0FDeEIsUUFBUSxDQUFDLEVBQUU7WUFDVCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUU7Z0JBQzFCLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQzlCO2lCQUFNO2dCQUNMLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQ2hDO1FBQ0gsQ0FBQyxFQUNELEdBQUcsQ0FBQyxFQUFFO1lBQ0osTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsQ0FBQyxDQUNGLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFmRCxvQkFlQzs7OztBQzlHRDs7Ozs7O0dBTUc7QUFDSCxrQkFBZTtJQUVYOzs7T0FHRztJQUNILE9BQU8sQ0FBQyxHQUFRO1FBQ1osT0FBTyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUM7WUFDNUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLG9CQUFvQixFQUFFLFVBQVUsRUFBRTtnQkFDL0MsT0FBTyxFQUFFLEdBQUcsR0FBRyxDQUFDO1lBQ3BCLENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsSUFBSSxDQUFDLFFBQWE7UUFDZCxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ25DLElBQUksT0FBTyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyx1QkFBdUI7WUFDdEUsT0FBTyxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUM7WUFDekIsSUFBSSxNQUFNLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzVCLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNqQixRQUFRLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzdCLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQTtZQUNoQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEIsQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDO0lBRUQsYUFBYTtJQUNiLE9BQU8sQ0FBQyxHQUFRO1FBQ1osSUFBSSxHQUFHLEdBQUcsbUJBQW1CLENBQUM7UUFDOUIsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3pCLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsU0FBUyxDQUFDLEtBQVUsRUFBRSxRQUFhO1FBQy9CLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQztRQUNqQixLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsRUFBRTtZQUNyQixJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUU7Z0JBQ1gsSUFBSSxHQUFHLEdBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xELElBQUksSUFBSSxHQUFRLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUM7Z0JBQzNELElBQUksTUFBTSxHQUFRLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQztnQkFDekUsSUFBSSxNQUFNLEdBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsQ0FBQztnQkFDOUYsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsR0FBRyxFQUFFLENBQUM7Z0JBQ3JDLElBQUksR0FBRyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLElBQUksRUFBRSxDQUFDO2dCQUN4QyxNQUFNLEdBQUcsR0FBRyxNQUFNLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxNQUFNLEVBQUUsQ0FBQztnQkFDOUMsTUFBTSxHQUFHLEdBQUcsTUFBTSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsTUFBTSxFQUFFLENBQUM7Z0JBQzlDLFFBQVEsQ0FBQyxHQUFHLElBQUksSUFBSSxNQUFNLElBQUksTUFBTSxFQUFFLENBQUMsQ0FBQTtnQkFDdkMsS0FBSyxFQUFFLENBQUM7YUFDWDtpQkFBTTtnQkFDSCxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3JCLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQTthQUNsQjtRQUNMLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNULElBQUksS0FBSyxJQUFJLENBQUMsRUFBRTtZQUNaLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNyQixRQUFRLENBQUMsS0FBSyxDQUFDLENBQUE7U0FDbEI7SUFDTCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsVUFBVSxDQUFDLENBQU0sRUFBRSxDQUFNO1FBQ3JCLElBQUksQ0FBQyxDQUFDLENBQUMsWUFBWSxJQUFJLENBQUMsRUFBRTtZQUN0QixJQUFJLElBQUksR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO1lBQ3ZCLENBQUMsR0FBRyxJQUFJLENBQUM7U0FDWjtRQUNELElBQUksQ0FBQyxHQUFHO1lBQ0osQ0FBQyxFQUFFLENBQUMsQ0FBQyxXQUFXLEVBQUU7WUFDbEIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDO1lBQ25CLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFO1lBQ2QsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUU7WUFDZixDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsRUFBRTtZQUNqQixDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsRUFBRTtTQUNwQixDQUFDO1FBQ0YsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLHNCQUFzQixFQUFFLFVBQVUsQ0FBQztZQUNoRCxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUMvRCxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUNqQyxDQUFDO1FBQ04sQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBQ0Q7OztLQUdDO0lBQ0QsY0FBYyxDQUFDLFNBQVM7UUFDcEIsSUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUN0QixJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDM0IsSUFBSSxDQUFDLEdBQW1CLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDNUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0IsSUFBSSxDQUFDLEdBQW1CLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN2QyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzQixJQUFJLENBQUMsR0FBbUIsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3hDLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNCLElBQUksTUFBTSxHQUFtQixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDL0MsSUFBSSxNQUFNLEdBQW1CLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUMvQyxNQUFNLEdBQUcsTUFBTSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUMvQyxNQUFNLEdBQUcsTUFBTSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUMvQyxPQUFPLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsTUFBTSxHQUFHLEdBQUcsR0FBRyxNQUFNLENBQUM7SUFDekUsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxTQUFTLENBQUMsSUFBUyxFQUFFLE1BQVc7UUFDNUIsSUFBSSxLQUFLLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pCLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDeEIsSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQy9DLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQy9ELElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxNQUFNLEVBQUU7Z0JBQ3ZCLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQzthQUNuQztZQUNELEtBQUssR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLEtBQUssQ0FBQztZQUMzQixPQUFPLEtBQUssQ0FBQztTQUNoQjthQUFNO1lBQ0gsT0FBTyxJQUFJLENBQUM7U0FDZjtJQUNMLENBQUM7SUFFRCxVQUFVO0lBQ1YsTUFBTSxDQUFDLElBQUksRUFBQyxJQUFJO1FBQ1osSUFBSSxFQUFFLEVBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQztRQUNaLElBQUc7WUFBQyxFQUFFLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7U0FBQztRQUFBLE9BQU0sQ0FBQyxFQUFDO1lBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQTtTQUFDO1FBQzFELElBQUc7WUFBQyxFQUFFLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7U0FBQztRQUFBLE9BQU0sQ0FBQyxFQUFDO1lBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQTtTQUFDO1FBQzFELENBQUMsR0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzlCLE9BQU8sQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLElBQUksR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7SUFDNUIsQ0FBQztJQUNELFVBQVU7SUFDVixNQUFNLENBQUMsSUFBSSxFQUFDLElBQUk7UUFDWixJQUFJLEVBQUUsRUFBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztRQUNkLElBQUc7WUFBQyxFQUFFLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7U0FBQztRQUFBLE9BQU0sQ0FBQyxFQUFDO1lBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQTtTQUFDO1FBQzFELElBQUc7WUFBQyxFQUFFLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7U0FBQztRQUFBLE9BQU0sQ0FBQyxFQUFDO1lBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQTtTQUFDO1FBQzFELENBQUMsR0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQy9CLENBQUMsR0FBQyxDQUFDLEVBQUUsSUFBRSxFQUFFLENBQUMsQ0FBQSxDQUFDLENBQUEsRUFBRSxDQUFBLENBQUMsQ0FBQSxFQUFFLENBQUM7UUFDakIsT0FBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFDRCxVQUFVO0lBQ1YsTUFBTSxDQUFDLElBQUksRUFBQyxJQUFJO1FBQ1osSUFBSSxFQUFFLEdBQUMsQ0FBQyxFQUFDLEVBQUUsR0FBQyxDQUFDLEVBQUMsRUFBRSxFQUFDLEVBQUUsQ0FBQztRQUNwQixJQUFHO1lBQUMsRUFBRSxHQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBO1NBQUM7UUFBQSxPQUFNLENBQUMsRUFBQyxHQUFFO1FBQUEsQ0FBQztRQUN2RCxJQUFHO1lBQUMsRUFBRSxHQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBO1NBQUM7UUFBQSxPQUFNLENBQUMsRUFBQyxHQUFFO1FBQUEsQ0FBQztRQUN2RCxFQUFFLEdBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUMsRUFBRSxHQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFDLE9BQU8sQ0FBQyxFQUFFLEdBQUMsRUFBRSxDQUFDLEdBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUMsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFDRCxVQUFVO0lBQ1YsTUFBTSxDQUFDLElBQUksRUFBQyxJQUFJO1FBQ1osSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFDLEVBQUUsR0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUMsRUFBRSxHQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUM5QyxJQUFHO1lBQUMsQ0FBQyxJQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBO1NBQUM7UUFBQSxPQUFNLENBQUMsRUFBQyxHQUFFO1FBQ3pDLElBQUc7WUFBQyxDQUFDLElBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7U0FB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O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IChmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgZXh0ZW5kU3RhdGljcyA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fFxyXG4gICAgICAgICh7IF9fcHJvdG9fXzogW10gfSBpbnN0YW5jZW9mIEFycmF5ICYmIGZ1bmN0aW9uIChkLCBiKSB7IGQuX19wcm90b19fID0gYjsgfSkgfHxcclxuICAgICAgICBmdW5jdGlvbiAoZCwgYikgeyBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTsgfTtcclxuICAgIHJldHVybiBmdW5jdGlvbiAoZCwgYikge1xyXG4gICAgICAgIGV4dGVuZFN0YXRpY3MoZCwgYik7XHJcbiAgICAgICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XHJcbiAgICAgICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xyXG4gICAgfTtcclxufSkoKTtcclxuKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9saWIvYXhpb3MnKTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcbnZhciBzZXR0bGUgPSByZXF1aXJlKCcuLy4uL2NvcmUvc2V0dGxlJyk7XG52YXIgYnVpbGRVUkwgPSByZXF1aXJlKCcuLy4uL2hlbHBlcnMvYnVpbGRVUkwnKTtcbnZhciBwYXJzZUhlYWRlcnMgPSByZXF1aXJlKCcuLy4uL2hlbHBlcnMvcGFyc2VIZWFkZXJzJyk7XG52YXIgaXNVUkxTYW1lT3JpZ2luID0gcmVxdWlyZSgnLi8uLi9oZWxwZXJzL2lzVVJMU2FtZU9yaWdpbicpO1xudmFyIGNyZWF0ZUVycm9yID0gcmVxdWlyZSgnLi4vY29yZS9jcmVhdGVFcnJvcicpO1xudmFyIGJ0b2EgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LmJ0b2EgJiYgd2luZG93LmJ0b2EuYmluZCh3aW5kb3cpKSB8fCByZXF1aXJlKCcuLy4uL2hlbHBlcnMvYnRvYScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHhockFkYXB0ZXIoY29uZmlnKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiBkaXNwYXRjaFhoclJlcXVlc3QocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgdmFyIHJlcXVlc3REYXRhID0gY29uZmlnLmRhdGE7XG4gICAgdmFyIHJlcXVlc3RIZWFkZXJzID0gY29uZmlnLmhlYWRlcnM7XG5cbiAgICBpZiAodXRpbHMuaXNGb3JtRGF0YShyZXF1ZXN0RGF0YSkpIHtcbiAgICAgIGRlbGV0ZSByZXF1ZXN0SGVhZGVyc1snQ29udGVudC1UeXBlJ107IC8vIExldCB0aGUgYnJvd3NlciBzZXQgaXRcbiAgICB9XG5cbiAgICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgIHZhciBsb2FkRXZlbnQgPSAnb25yZWFkeXN0YXRlY2hhbmdlJztcbiAgICB2YXIgeERvbWFpbiA9IGZhbHNlO1xuXG4gICAgLy8gRm9yIElFIDgvOSBDT1JTIHN1cHBvcnRcbiAgICAvLyBPbmx5IHN1cHBvcnRzIFBPU1QgYW5kIEdFVCBjYWxscyBhbmQgZG9lc24ndCByZXR1cm5zIHRoZSByZXNwb25zZSBoZWFkZXJzLlxuICAgIC8vIERPTidUIGRvIHRoaXMgZm9yIHRlc3RpbmcgYi9jIFhNTEh0dHBSZXF1ZXN0IGlzIG1vY2tlZCwgbm90IFhEb21haW5SZXF1ZXN0LlxuICAgIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Rlc3QnICYmXG4gICAgICAgIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICAgIHdpbmRvdy5YRG9tYWluUmVxdWVzdCAmJiAhKCd3aXRoQ3JlZGVudGlhbHMnIGluIHJlcXVlc3QpICYmXG4gICAgICAgICFpc1VSTFNhbWVPcmlnaW4oY29uZmlnLnVybCkpIHtcbiAgICAgIHJlcXVlc3QgPSBuZXcgd2luZG93LlhEb21haW5SZXF1ZXN0KCk7XG4gICAgICBsb2FkRXZlbnQgPSAnb25sb2FkJztcbiAgICAgIHhEb21haW4gPSB0cnVlO1xuICAgICAgcmVxdWVzdC5vbnByb2dyZXNzID0gZnVuY3Rpb24gaGFuZGxlUHJvZ3Jlc3MoKSB7fTtcbiAgICAgIHJlcXVlc3Qub250aW1lb3V0ID0gZnVuY3Rpb24gaGFuZGxlVGltZW91dCgpIHt9O1xuICAgIH1cblxuICAgIC8vIEhUVFAgYmFzaWMgYXV0aGVudGljYXRpb25cbiAgICBpZiAoY29uZmlnLmF1dGgpIHtcbiAgICAgIHZhciB1c2VybmFtZSA9IGNvbmZpZy5hdXRoLnVzZXJuYW1lIHx8ICcnO1xuICAgICAgdmFyIHBhc3N3b3JkID0gY29uZmlnLmF1dGgucGFzc3dvcmQgfHwgJyc7XG4gICAgICByZXF1ZXN0SGVhZGVycy5BdXRob3JpemF0aW9uID0gJ0Jhc2ljICcgKyBidG9hKHVzZXJuYW1lICsgJzonICsgcGFzc3dvcmQpO1xuICAgIH1cblxuICAgIHJlcXVlc3Qub3Blbihjb25maWcubWV0aG9kLnRvVXBwZXJDYXNlKCksIGJ1aWxkVVJMKGNvbmZpZy51cmwsIGNvbmZpZy5wYXJhbXMsIGNvbmZpZy5wYXJhbXNTZXJpYWxpemVyKSwgdHJ1ZSk7XG5cbiAgICAvLyBTZXQgdGhlIHJlcXVlc3QgdGltZW91dCBpbiBNU1xuICAgIHJlcXVlc3QudGltZW91dCA9IGNvbmZpZy50aW1lb3V0O1xuXG4gICAgLy8gTGlzdGVuIGZvciByZWFkeSBzdGF0ZVxuICAgIHJlcXVlc3RbbG9hZEV2ZW50XSA9IGZ1bmN0aW9uIGhhbmRsZUxvYWQoKSB7XG4gICAgICBpZiAoIXJlcXVlc3QgfHwgKHJlcXVlc3QucmVhZHlTdGF0ZSAhPT0gNCAmJiAheERvbWFpbikpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGUgcmVxdWVzdCBlcnJvcmVkIG91dCBhbmQgd2UgZGlkbid0IGdldCBhIHJlc3BvbnNlLCB0aGlzIHdpbGwgYmVcbiAgICAgIC8vIGhhbmRsZWQgYnkgb25lcnJvciBpbnN0ZWFkXG4gICAgICAvLyBXaXRoIG9uZSBleGNlcHRpb246IHJlcXVlc3QgdGhhdCB1c2luZyBmaWxlOiBwcm90b2NvbCwgbW9zdCBicm93c2Vyc1xuICAgICAgLy8gd2lsbCByZXR1cm4gc3RhdHVzIGFzIDAgZXZlbiB0aG91Z2ggaXQncyBhIHN1Y2Nlc3NmdWwgcmVxdWVzdFxuICAgICAgaWYgKHJlcXVlc3Quc3RhdHVzID09PSAwICYmICEocmVxdWVzdC5yZXNwb25zZVVSTCAmJiByZXF1ZXN0LnJlc3BvbnNlVVJMLmluZGV4T2YoJ2ZpbGU6JykgPT09IDApKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gUHJlcGFyZSB0aGUgcmVzcG9uc2VcbiAgICAgIHZhciByZXNwb25zZUhlYWRlcnMgPSAnZ2V0QWxsUmVzcG9uc2VIZWFkZXJzJyBpbiByZXF1ZXN0ID8gcGFyc2VIZWFkZXJzKHJlcXVlc3QuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkpIDogbnVsbDtcbiAgICAgIHZhciByZXNwb25zZURhdGEgPSAhY29uZmlnLnJlc3BvbnNlVHlwZSB8fCBjb25maWcucmVzcG9uc2VUeXBlID09PSAndGV4dCcgPyByZXF1ZXN0LnJlc3BvbnNlVGV4dCA6IHJlcXVlc3QucmVzcG9uc2U7XG4gICAgICB2YXIgcmVzcG9uc2UgPSB7XG4gICAgICAgIGRhdGE6IHJlc3BvbnNlRGF0YSxcbiAgICAgICAgLy8gSUUgc2VuZHMgMTIyMyBpbnN0ZWFkIG9mIDIwNCAoaHR0cHM6Ly9naXRodWIuY29tL2F4aW9zL2F4aW9zL2lzc3Vlcy8yMDEpXG4gICAgICAgIHN0YXR1czogcmVxdWVzdC5zdGF0dXMgPT09IDEyMjMgPyAyMDQgOiByZXF1ZXN0LnN0YXR1cyxcbiAgICAgICAgc3RhdHVzVGV4dDogcmVxdWVzdC5zdGF0dXMgPT09IDEyMjMgPyAnTm8gQ29udGVudCcgOiByZXF1ZXN0LnN0YXR1c1RleHQsXG4gICAgICAgIGhlYWRlcnM6IHJlc3BvbnNlSGVhZGVycyxcbiAgICAgICAgY29uZmlnOiBjb25maWcsXG4gICAgICAgIHJlcXVlc3Q6IHJlcXVlc3RcbiAgICAgIH07XG5cbiAgICAgIHNldHRsZShyZXNvbHZlLCByZWplY3QsIHJlc3BvbnNlKTtcblxuICAgICAgLy8gQ2xlYW4gdXAgcmVxdWVzdFxuICAgICAgcmVxdWVzdCA9IG51bGw7XG4gICAgfTtcblxuICAgIC8vIEhhbmRsZSBsb3cgbGV2ZWwgbmV0d29yayBlcnJvcnNcbiAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbiBoYW5kbGVFcnJvcigpIHtcbiAgICAgIC8vIFJlYWwgZXJyb3JzIGFyZSBoaWRkZW4gZnJvbSB1cyBieSB0aGUgYnJvd3NlclxuICAgICAgLy8gb25lcnJvciBzaG91bGQgb25seSBmaXJlIGlmIGl0J3MgYSBuZXR3b3JrIGVycm9yXG4gICAgICByZWplY3QoY3JlYXRlRXJyb3IoJ05ldHdvcmsgRXJyb3InLCBjb25maWcsIG51bGwsIHJlcXVlc3QpKTtcblxuICAgICAgLy8gQ2xlYW4gdXAgcmVxdWVzdFxuICAgICAgcmVxdWVzdCA9IG51bGw7XG4gICAgfTtcblxuICAgIC8vIEhhbmRsZSB0aW1lb3V0XG4gICAgcmVxdWVzdC5vbnRpbWVvdXQgPSBmdW5jdGlvbiBoYW5kbGVUaW1lb3V0KCkge1xuICAgICAgcmVqZWN0KGNyZWF0ZUVycm9yKCd0aW1lb3V0IG9mICcgKyBjb25maWcudGltZW91dCArICdtcyBleGNlZWRlZCcsIGNvbmZpZywgJ0VDT05OQUJPUlRFRCcsXG4gICAgICAgIHJlcXVlc3QpKTtcblxuICAgICAgLy8gQ2xlYW4gdXAgcmVxdWVzdFxuICAgICAgcmVxdWVzdCA9IG51bGw7XG4gICAgfTtcblxuICAgIC8vIEFkZCB4c3JmIGhlYWRlclxuICAgIC8vIFRoaXMgaXMgb25seSBkb25lIGlmIHJ1bm5pbmcgaW4gYSBzdGFuZGFyZCBicm93c2VyIGVudmlyb25tZW50LlxuICAgIC8vIFNwZWNpZmljYWxseSBub3QgaWYgd2UncmUgaW4gYSB3ZWIgd29ya2VyLCBvciByZWFjdC1uYXRpdmUuXG4gICAgaWYgKHV0aWxzLmlzU3RhbmRhcmRCcm93c2VyRW52KCkpIHtcbiAgICAgIHZhciBjb29raWVzID0gcmVxdWlyZSgnLi8uLi9oZWxwZXJzL2Nvb2tpZXMnKTtcblxuICAgICAgLy8gQWRkIHhzcmYgaGVhZGVyXG4gICAgICB2YXIgeHNyZlZhbHVlID0gKGNvbmZpZy53aXRoQ3JlZGVudGlhbHMgfHwgaXNVUkxTYW1lT3JpZ2luKGNvbmZpZy51cmwpKSAmJiBjb25maWcueHNyZkNvb2tpZU5hbWUgP1xuICAgICAgICAgIGNvb2tpZXMucmVhZChjb25maWcueHNyZkNvb2tpZU5hbWUpIDpcbiAgICAgICAgICB1bmRlZmluZWQ7XG5cbiAgICAgIGlmICh4c3JmVmFsdWUpIHtcbiAgICAgICAgcmVxdWVzdEhlYWRlcnNbY29uZmlnLnhzcmZIZWFkZXJOYW1lXSA9IHhzcmZWYWx1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBZGQgaGVhZGVycyB0byB0aGUgcmVxdWVzdFxuICAgIGlmICgnc2V0UmVxdWVzdEhlYWRlcicgaW4gcmVxdWVzdCkge1xuICAgICAgdXRpbHMuZm9yRWFjaChyZXF1ZXN0SGVhZGVycywgZnVuY3Rpb24gc2V0UmVxdWVzdEhlYWRlcih2YWwsIGtleSkge1xuICAgICAgICBpZiAodHlwZW9mIHJlcXVlc3REYXRhID09PSAndW5kZWZpbmVkJyAmJiBrZXkudG9Mb3dlckNhc2UoKSA9PT0gJ2NvbnRlbnQtdHlwZScpIHtcbiAgICAgICAgICAvLyBSZW1vdmUgQ29udGVudC1UeXBlIGlmIGRhdGEgaXMgdW5kZWZpbmVkXG4gICAgICAgICAgZGVsZXRlIHJlcXVlc3RIZWFkZXJzW2tleV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gT3RoZXJ3aXNlIGFkZCBoZWFkZXIgdG8gdGhlIHJlcXVlc3RcbiAgICAgICAgICByZXF1ZXN0LnNldFJlcXVlc3RIZWFkZXIoa2V5LCB2YWwpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBBZGQgd2l0aENyZWRlbnRpYWxzIHRvIHJlcXVlc3QgaWYgbmVlZGVkXG4gICAgaWYgKGNvbmZpZy53aXRoQ3JlZGVudGlhbHMpIHtcbiAgICAgIHJlcXVlc3Qud2l0aENyZWRlbnRpYWxzID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBBZGQgcmVzcG9uc2VUeXBlIHRvIHJlcXVlc3QgaWYgbmVlZGVkXG4gICAgaWYgKGNvbmZpZy5yZXNwb25zZVR5cGUpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlcXVlc3QucmVzcG9uc2VUeXBlID0gY29uZmlnLnJlc3BvbnNlVHlwZTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gRXhwZWN0ZWQgRE9NRXhjZXB0aW9uIHRocm93biBieSBicm93c2VycyBub3QgY29tcGF0aWJsZSBYTUxIdHRwUmVxdWVzdCBMZXZlbCAyLlxuICAgICAgICAvLyBCdXQsIHRoaXMgY2FuIGJlIHN1cHByZXNzZWQgZm9yICdqc29uJyB0eXBlIGFzIGl0IGNhbiBiZSBwYXJzZWQgYnkgZGVmYXVsdCAndHJhbnNmb3JtUmVzcG9uc2UnIGZ1bmN0aW9uLlxuICAgICAgICBpZiAoY29uZmlnLnJlc3BvbnNlVHlwZSAhPT0gJ2pzb24nKSB7XG4gICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEhhbmRsZSBwcm9ncmVzcyBpZiBuZWVkZWRcbiAgICBpZiAodHlwZW9mIGNvbmZpZy5vbkRvd25sb2FkUHJvZ3Jlc3MgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lcigncHJvZ3Jlc3MnLCBjb25maWcub25Eb3dubG9hZFByb2dyZXNzKTtcbiAgICB9XG5cbiAgICAvLyBOb3QgYWxsIGJyb3dzZXJzIHN1cHBvcnQgdXBsb2FkIGV2ZW50c1xuICAgIGlmICh0eXBlb2YgY29uZmlnLm9uVXBsb2FkUHJvZ3Jlc3MgPT09ICdmdW5jdGlvbicgJiYgcmVxdWVzdC51cGxvYWQpIHtcbiAgICAgIHJlcXVlc3QudXBsb2FkLmFkZEV2ZW50TGlzdGVuZXIoJ3Byb2dyZXNzJywgY29uZmlnLm9uVXBsb2FkUHJvZ3Jlc3MpO1xuICAgIH1cblxuICAgIGlmIChjb25maWcuY2FuY2VsVG9rZW4pIHtcbiAgICAgIC8vIEhhbmRsZSBjYW5jZWxsYXRpb25cbiAgICAgIGNvbmZpZy5jYW5jZWxUb2tlbi5wcm9taXNlLnRoZW4oZnVuY3Rpb24gb25DYW5jZWxlZChjYW5jZWwpIHtcbiAgICAgICAgaWYgKCFyZXF1ZXN0KSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVxdWVzdC5hYm9ydCgpO1xuICAgICAgICByZWplY3QoY2FuY2VsKTtcbiAgICAgICAgLy8gQ2xlYW4gdXAgcmVxdWVzdFxuICAgICAgICByZXF1ZXN0ID0gbnVsbDtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChyZXF1ZXN0RGF0YSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXF1ZXN0RGF0YSA9IG51bGw7XG4gICAgfVxuXG4gICAgLy8gU2VuZCB0aGUgcmVxdWVzdFxuICAgIHJlcXVlc3Quc2VuZChyZXF1ZXN0RGF0YSk7XG4gIH0pO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIGJpbmQgPSByZXF1aXJlKCcuL2hlbHBlcnMvYmluZCcpO1xudmFyIEF4aW9zID0gcmVxdWlyZSgnLi9jb3JlL0F4aW9zJyk7XG52YXIgZGVmYXVsdHMgPSByZXF1aXJlKCcuL2RlZmF1bHRzJyk7XG5cbi8qKlxuICogQ3JlYXRlIGFuIGluc3RhbmNlIG9mIEF4aW9zXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGRlZmF1bHRDb25maWcgVGhlIGRlZmF1bHQgY29uZmlnIGZvciB0aGUgaW5zdGFuY2VcbiAqIEByZXR1cm4ge0F4aW9zfSBBIG5ldyBpbnN0YW5jZSBvZiBBeGlvc1xuICovXG5mdW5jdGlvbiBjcmVhdGVJbnN0YW5jZShkZWZhdWx0Q29uZmlnKSB7XG4gIHZhciBjb250ZXh0ID0gbmV3IEF4aW9zKGRlZmF1bHRDb25maWcpO1xuICB2YXIgaW5zdGFuY2UgPSBiaW5kKEF4aW9zLnByb3RvdHlwZS5yZXF1ZXN0LCBjb250ZXh0KTtcblxuICAvLyBDb3B5IGF4aW9zLnByb3RvdHlwZSB0byBpbnN0YW5jZVxuICB1dGlscy5leHRlbmQoaW5zdGFuY2UsIEF4aW9zLnByb3RvdHlwZSwgY29udGV4dCk7XG5cbiAgLy8gQ29weSBjb250ZXh0IHRvIGluc3RhbmNlXG4gIHV0aWxzLmV4dGVuZChpbnN0YW5jZSwgY29udGV4dCk7XG5cbiAgcmV0dXJuIGluc3RhbmNlO1xufVxuXG4vLyBDcmVhdGUgdGhlIGRlZmF1bHQgaW5zdGFuY2UgdG8gYmUgZXhwb3J0ZWRcbnZhciBheGlvcyA9IGNyZWF0ZUluc3RhbmNlKGRlZmF1bHRzKTtcblxuLy8gRXhwb3NlIEF4aW9zIGNsYXNzIHRvIGFsbG93IGNsYXNzIGluaGVyaXRhbmNlXG5heGlvcy5BeGlvcyA9IEF4aW9zO1xuXG4vLyBGYWN0b3J5IGZvciBjcmVhdGluZyBuZXcgaW5zdGFuY2VzXG5heGlvcy5jcmVhdGUgPSBmdW5jdGlvbiBjcmVhdGUoaW5zdGFuY2VDb25maWcpIHtcbiAgcmV0dXJuIGNyZWF0ZUluc3RhbmNlKHV0aWxzLm1lcmdlKGRlZmF1bHRzLCBpbnN0YW5jZUNvbmZpZykpO1xufTtcblxuLy8gRXhwb3NlIENhbmNlbCAmIENhbmNlbFRva2VuXG5heGlvcy5DYW5jZWwgPSByZXF1aXJlKCcuL2NhbmNlbC9DYW5jZWwnKTtcbmF4aW9zLkNhbmNlbFRva2VuID0gcmVxdWlyZSgnLi9jYW5jZWwvQ2FuY2VsVG9rZW4nKTtcbmF4aW9zLmlzQ2FuY2VsID0gcmVxdWlyZSgnLi9jYW5jZWwvaXNDYW5jZWwnKTtcblxuLy8gRXhwb3NlIGFsbC9zcHJlYWRcbmF4aW9zLmFsbCA9IGZ1bmN0aW9uIGFsbChwcm9taXNlcykge1xuICByZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xufTtcbmF4aW9zLnNwcmVhZCA9IHJlcXVpcmUoJy4vaGVscGVycy9zcHJlYWQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBheGlvcztcblxuLy8gQWxsb3cgdXNlIG9mIGRlZmF1bHQgaW1wb3J0IHN5bnRheCBpbiBUeXBlU2NyaXB0XG5tb2R1bGUuZXhwb3J0cy5kZWZhdWx0ID0gYXhpb3M7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQSBgQ2FuY2VsYCBpcyBhbiBvYmplY3QgdGhhdCBpcyB0aHJvd24gd2hlbiBhbiBvcGVyYXRpb24gaXMgY2FuY2VsZWQuXG4gKlxuICogQGNsYXNzXG4gKiBAcGFyYW0ge3N0cmluZz19IG1lc3NhZ2UgVGhlIG1lc3NhZ2UuXG4gKi9cbmZ1bmN0aW9uIENhbmNlbChtZXNzYWdlKSB7XG4gIHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG59XG5cbkNhbmNlbC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZygpIHtcbiAgcmV0dXJuICdDYW5jZWwnICsgKHRoaXMubWVzc2FnZSA/ICc6ICcgKyB0aGlzLm1lc3NhZ2UgOiAnJyk7XG59O1xuXG5DYW5jZWwucHJvdG90eXBlLl9fQ0FOQ0VMX18gPSB0cnVlO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhbmNlbDtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENhbmNlbCA9IHJlcXVpcmUoJy4vQ2FuY2VsJyk7XG5cbi8qKlxuICogQSBgQ2FuY2VsVG9rZW5gIGlzIGFuIG9iamVjdCB0aGF0IGNhbiBiZSB1c2VkIHRvIHJlcXVlc3QgY2FuY2VsbGF0aW9uIG9mIGFuIG9wZXJhdGlvbi5cbiAqXG4gKiBAY2xhc3NcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGV4ZWN1dG9yIFRoZSBleGVjdXRvciBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gQ2FuY2VsVG9rZW4oZXhlY3V0b3IpIHtcbiAgaWYgKHR5cGVvZiBleGVjdXRvciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2V4ZWN1dG9yIG11c3QgYmUgYSBmdW5jdGlvbi4nKTtcbiAgfVxuXG4gIHZhciByZXNvbHZlUHJvbWlzZTtcbiAgdGhpcy5wcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24gcHJvbWlzZUV4ZWN1dG9yKHJlc29sdmUpIHtcbiAgICByZXNvbHZlUHJvbWlzZSA9IHJlc29sdmU7XG4gIH0pO1xuXG4gIHZhciB0b2tlbiA9IHRoaXM7XG4gIGV4ZWN1dG9yKGZ1bmN0aW9uIGNhbmNlbChtZXNzYWdlKSB7XG4gICAgaWYgKHRva2VuLnJlYXNvbikge1xuICAgICAgLy8gQ2FuY2VsbGF0aW9uIGhhcyBhbHJlYWR5IGJlZW4gcmVxdWVzdGVkXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdG9rZW4ucmVhc29uID0gbmV3IENhbmNlbChtZXNzYWdlKTtcbiAgICByZXNvbHZlUHJvbWlzZSh0b2tlbi5yZWFzb24pO1xuICB9KTtcbn1cblxuLyoqXG4gKiBUaHJvd3MgYSBgQ2FuY2VsYCBpZiBjYW5jZWxsYXRpb24gaGFzIGJlZW4gcmVxdWVzdGVkLlxuICovXG5DYW5jZWxUb2tlbi5wcm90b3R5cGUudGhyb3dJZlJlcXVlc3RlZCA9IGZ1bmN0aW9uIHRocm93SWZSZXF1ZXN0ZWQoKSB7XG4gIGlmICh0aGlzLnJlYXNvbikge1xuICAgIHRocm93IHRoaXMucmVhc29uO1xuICB9XG59O1xuXG4vKipcbiAqIFJldHVybnMgYW4gb2JqZWN0IHRoYXQgY29udGFpbnMgYSBuZXcgYENhbmNlbFRva2VuYCBhbmQgYSBmdW5jdGlvbiB0aGF0LCB3aGVuIGNhbGxlZCxcbiAqIGNhbmNlbHMgdGhlIGBDYW5jZWxUb2tlbmAuXG4gKi9cbkNhbmNlbFRva2VuLnNvdXJjZSA9IGZ1bmN0aW9uIHNvdXJjZSgpIHtcbiAgdmFyIGNhbmNlbDtcbiAgdmFyIHRva2VuID0gbmV3IENhbmNlbFRva2VuKGZ1bmN0aW9uIGV4ZWN1dG9yKGMpIHtcbiAgICBjYW5jZWwgPSBjO1xuICB9KTtcbiAgcmV0dXJuIHtcbiAgICB0b2tlbjogdG9rZW4sXG4gICAgY2FuY2VsOiBjYW5jZWxcbiAgfTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FuY2VsVG9rZW47XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNDYW5jZWwodmFsdWUpIHtcbiAgcmV0dXJuICEhKHZhbHVlICYmIHZhbHVlLl9fQ0FOQ0VMX18pO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGRlZmF1bHRzID0gcmVxdWlyZSgnLi8uLi9kZWZhdWx0cycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xudmFyIEludGVyY2VwdG9yTWFuYWdlciA9IHJlcXVpcmUoJy4vSW50ZXJjZXB0b3JNYW5hZ2VyJyk7XG52YXIgZGlzcGF0Y2hSZXF1ZXN0ID0gcmVxdWlyZSgnLi9kaXNwYXRjaFJlcXVlc3QnKTtcblxuLyoqXG4gKiBDcmVhdGUgYSBuZXcgaW5zdGFuY2Ugb2YgQXhpb3NcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gaW5zdGFuY2VDb25maWcgVGhlIGRlZmF1bHQgY29uZmlnIGZvciB0aGUgaW5zdGFuY2VcbiAqL1xuZnVuY3Rpb24gQXhpb3MoaW5zdGFuY2VDb25maWcpIHtcbiAgdGhpcy5kZWZhdWx0cyA9IGluc3RhbmNlQ29uZmlnO1xuICB0aGlzLmludGVyY2VwdG9ycyA9IHtcbiAgICByZXF1ZXN0OiBuZXcgSW50ZXJjZXB0b3JNYW5hZ2VyKCksXG4gICAgcmVzcG9uc2U6IG5ldyBJbnRlcmNlcHRvck1hbmFnZXIoKVxuICB9O1xufVxuXG4vKipcbiAqIERpc3BhdGNoIGEgcmVxdWVzdFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcgVGhlIGNvbmZpZyBzcGVjaWZpYyBmb3IgdGhpcyByZXF1ZXN0IChtZXJnZWQgd2l0aCB0aGlzLmRlZmF1bHRzKVxuICovXG5BeGlvcy5wcm90b3R5cGUucmVxdWVzdCA9IGZ1bmN0aW9uIHJlcXVlc3QoY29uZmlnKSB7XG4gIC8qZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOjAqL1xuICAvLyBBbGxvdyBmb3IgYXhpb3MoJ2V4YW1wbGUvdXJsJ1ssIGNvbmZpZ10pIGEgbGEgZmV0Y2ggQVBJXG4gIGlmICh0eXBlb2YgY29uZmlnID09PSAnc3RyaW5nJykge1xuICAgIGNvbmZpZyA9IHV0aWxzLm1lcmdlKHtcbiAgICAgIHVybDogYXJndW1lbnRzWzBdXG4gICAgfSwgYXJndW1lbnRzWzFdKTtcbiAgfVxuXG4gIGNvbmZpZyA9IHV0aWxzLm1lcmdlKGRlZmF1bHRzLCB7bWV0aG9kOiAnZ2V0J30sIHRoaXMuZGVmYXVsdHMsIGNvbmZpZyk7XG4gIGNvbmZpZy5tZXRob2QgPSBjb25maWcubWV0aG9kLnRvTG93ZXJDYXNlKCk7XG5cbiAgLy8gSG9vayB1cCBpbnRlcmNlcHRvcnMgbWlkZGxld2FyZVxuICB2YXIgY2hhaW4gPSBbZGlzcGF0Y2hSZXF1ZXN0LCB1bmRlZmluZWRdO1xuICB2YXIgcHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZShjb25maWcpO1xuXG4gIHRoaXMuaW50ZXJjZXB0b3JzLnJlcXVlc3QuZm9yRWFjaChmdW5jdGlvbiB1bnNoaWZ0UmVxdWVzdEludGVyY2VwdG9ycyhpbnRlcmNlcHRvcikge1xuICAgIGNoYWluLnVuc2hpZnQoaW50ZXJjZXB0b3IuZnVsZmlsbGVkLCBpbnRlcmNlcHRvci5yZWplY3RlZCk7XG4gIH0pO1xuXG4gIHRoaXMuaW50ZXJjZXB0b3JzLnJlc3BvbnNlLmZvckVhY2goZnVuY3Rpb24gcHVzaFJlc3BvbnNlSW50ZXJjZXB0b3JzKGludGVyY2VwdG9yKSB7XG4gICAgY2hhaW4ucHVzaChpbnRlcmNlcHRvci5mdWxmaWxsZWQsIGludGVyY2VwdG9yLnJlamVjdGVkKTtcbiAgfSk7XG5cbiAgd2hpbGUgKGNoYWluLmxlbmd0aCkge1xuICAgIHByb21pc2UgPSBwcm9taXNlLnRoZW4oY2hhaW4uc2hpZnQoKSwgY2hhaW4uc2hpZnQoKSk7XG4gIH1cblxuICByZXR1cm4gcHJvbWlzZTtcbn07XG5cbi8vIFByb3ZpZGUgYWxpYXNlcyBmb3Igc3VwcG9ydGVkIHJlcXVlc3QgbWV0aG9kc1xudXRpbHMuZm9yRWFjaChbJ2RlbGV0ZScsICdnZXQnLCAnaGVhZCcsICdvcHRpb25zJ10sIGZ1bmN0aW9uIGZvckVhY2hNZXRob2ROb0RhdGEobWV0aG9kKSB7XG4gIC8qZXNsaW50IGZ1bmMtbmFtZXM6MCovXG4gIEF4aW9zLnByb3RvdHlwZVttZXRob2RdID0gZnVuY3Rpb24odXJsLCBjb25maWcpIHtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KHV0aWxzLm1lcmdlKGNvbmZpZyB8fCB7fSwge1xuICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICB1cmw6IHVybFxuICAgIH0pKTtcbiAgfTtcbn0pO1xuXG51dGlscy5mb3JFYWNoKFsncG9zdCcsICdwdXQnLCAncGF0Y2gnXSwgZnVuY3Rpb24gZm9yRWFjaE1ldGhvZFdpdGhEYXRhKG1ldGhvZCkge1xuICAvKmVzbGludCBmdW5jLW5hbWVzOjAqL1xuICBBeGlvcy5wcm90b3R5cGVbbWV0aG9kXSA9IGZ1bmN0aW9uKHVybCwgZGF0YSwgY29uZmlnKSB7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCh1dGlscy5tZXJnZShjb25maWcgfHwge30sIHtcbiAgICAgIG1ldGhvZDogbWV0aG9kLFxuICAgICAgdXJsOiB1cmwsXG4gICAgICBkYXRhOiBkYXRhXG4gICAgfSkpO1xuICB9O1xufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQXhpb3M7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcblxuZnVuY3Rpb24gSW50ZXJjZXB0b3JNYW5hZ2VyKCkge1xuICB0aGlzLmhhbmRsZXJzID0gW107XG59XG5cbi8qKlxuICogQWRkIGEgbmV3IGludGVyY2VwdG9yIHRvIHRoZSBzdGFja1xuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bGZpbGxlZCBUaGUgZnVuY3Rpb24gdG8gaGFuZGxlIGB0aGVuYCBmb3IgYSBgUHJvbWlzZWBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHJlamVjdGVkIFRoZSBmdW5jdGlvbiB0byBoYW5kbGUgYHJlamVjdGAgZm9yIGEgYFByb21pc2VgXG4gKlxuICogQHJldHVybiB7TnVtYmVyfSBBbiBJRCB1c2VkIHRvIHJlbW92ZSBpbnRlcmNlcHRvciBsYXRlclxuICovXG5JbnRlcmNlcHRvck1hbmFnZXIucHJvdG90eXBlLnVzZSA9IGZ1bmN0aW9uIHVzZShmdWxmaWxsZWQsIHJlamVjdGVkKSB7XG4gIHRoaXMuaGFuZGxlcnMucHVzaCh7XG4gICAgZnVsZmlsbGVkOiBmdWxmaWxsZWQsXG4gICAgcmVqZWN0ZWQ6IHJlamVjdGVkXG4gIH0pO1xuICByZXR1cm4gdGhpcy5oYW5kbGVycy5sZW5ndGggLSAxO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgYW4gaW50ZXJjZXB0b3IgZnJvbSB0aGUgc3RhY2tcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gaWQgVGhlIElEIHRoYXQgd2FzIHJldHVybmVkIGJ5IGB1c2VgXG4gKi9cbkludGVyY2VwdG9yTWFuYWdlci5wcm90b3R5cGUuZWplY3QgPSBmdW5jdGlvbiBlamVjdChpZCkge1xuICBpZiAodGhpcy5oYW5kbGVyc1tpZF0pIHtcbiAgICB0aGlzLmhhbmRsZXJzW2lkXSA9IG51bGw7XG4gIH1cbn07XG5cbi8qKlxuICogSXRlcmF0ZSBvdmVyIGFsbCB0aGUgcmVnaXN0ZXJlZCBpbnRlcmNlcHRvcnNcbiAqXG4gKiBUaGlzIG1ldGhvZCBpcyBwYXJ0aWN1bGFybHkgdXNlZnVsIGZvciBza2lwcGluZyBvdmVyIGFueVxuICogaW50ZXJjZXB0b3JzIHRoYXQgbWF5IGhhdmUgYmVjb21lIGBudWxsYCBjYWxsaW5nIGBlamVjdGAuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgZm9yIGVhY2ggaW50ZXJjZXB0b3JcbiAqL1xuSW50ZXJjZXB0b3JNYW5hZ2VyLnByb3RvdHlwZS5mb3JFYWNoID0gZnVuY3Rpb24gZm9yRWFjaChmbikge1xuICB1dGlscy5mb3JFYWNoKHRoaXMuaGFuZGxlcnMsIGZ1bmN0aW9uIGZvckVhY2hIYW5kbGVyKGgpIHtcbiAgICBpZiAoaCAhPT0gbnVsbCkge1xuICAgICAgZm4oaCk7XG4gICAgfVxuICB9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSW50ZXJjZXB0b3JNYW5hZ2VyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZW5oYW5jZUVycm9yID0gcmVxdWlyZSgnLi9lbmhhbmNlRXJyb3InKTtcblxuLyoqXG4gKiBDcmVhdGUgYW4gRXJyb3Igd2l0aCB0aGUgc3BlY2lmaWVkIG1lc3NhZ2UsIGNvbmZpZywgZXJyb3IgY29kZSwgcmVxdWVzdCBhbmQgcmVzcG9uc2UuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgVGhlIGVycm9yIG1lc3NhZ2UuXG4gKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIFRoZSBjb25maWcuXG4gKiBAcGFyYW0ge3N0cmluZ30gW2NvZGVdIFRoZSBlcnJvciBjb2RlIChmb3IgZXhhbXBsZSwgJ0VDT05OQUJPUlRFRCcpLlxuICogQHBhcmFtIHtPYmplY3R9IFtyZXF1ZXN0XSBUaGUgcmVxdWVzdC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbcmVzcG9uc2VdIFRoZSByZXNwb25zZS5cbiAqIEByZXR1cm5zIHtFcnJvcn0gVGhlIGNyZWF0ZWQgZXJyb3IuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gY3JlYXRlRXJyb3IobWVzc2FnZSwgY29uZmlnLCBjb2RlLCByZXF1ZXN0LCByZXNwb25zZSkge1xuICB2YXIgZXJyb3IgPSBuZXcgRXJyb3IobWVzc2FnZSk7XG4gIHJldHVybiBlbmhhbmNlRXJyb3IoZXJyb3IsIGNvbmZpZywgY29kZSwgcmVxdWVzdCwgcmVzcG9uc2UpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xudmFyIHRyYW5zZm9ybURhdGEgPSByZXF1aXJlKCcuL3RyYW5zZm9ybURhdGEnKTtcbnZhciBpc0NhbmNlbCA9IHJlcXVpcmUoJy4uL2NhbmNlbC9pc0NhbmNlbCcpO1xudmFyIGRlZmF1bHRzID0gcmVxdWlyZSgnLi4vZGVmYXVsdHMnKTtcbnZhciBpc0Fic29sdXRlVVJMID0gcmVxdWlyZSgnLi8uLi9oZWxwZXJzL2lzQWJzb2x1dGVVUkwnKTtcbnZhciBjb21iaW5lVVJMcyA9IHJlcXVpcmUoJy4vLi4vaGVscGVycy9jb21iaW5lVVJMcycpO1xuXG4vKipcbiAqIFRocm93cyBhIGBDYW5jZWxgIGlmIGNhbmNlbGxhdGlvbiBoYXMgYmVlbiByZXF1ZXN0ZWQuXG4gKi9cbmZ1bmN0aW9uIHRocm93SWZDYW5jZWxsYXRpb25SZXF1ZXN0ZWQoY29uZmlnKSB7XG4gIGlmIChjb25maWcuY2FuY2VsVG9rZW4pIHtcbiAgICBjb25maWcuY2FuY2VsVG9rZW4udGhyb3dJZlJlcXVlc3RlZCgpO1xuICB9XG59XG5cbi8qKlxuICogRGlzcGF0Y2ggYSByZXF1ZXN0IHRvIHRoZSBzZXJ2ZXIgdXNpbmcgdGhlIGNvbmZpZ3VyZWQgYWRhcHRlci5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIFRoZSBjb25maWcgdGhhdCBpcyB0byBiZSB1c2VkIGZvciB0aGUgcmVxdWVzdFxuICogQHJldHVybnMge1Byb21pc2V9IFRoZSBQcm9taXNlIHRvIGJlIGZ1bGZpbGxlZFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGRpc3BhdGNoUmVxdWVzdChjb25maWcpIHtcbiAgdGhyb3dJZkNhbmNlbGxhdGlvblJlcXVlc3RlZChjb25maWcpO1xuXG4gIC8vIFN1cHBvcnQgYmFzZVVSTCBjb25maWdcbiAgaWYgKGNvbmZpZy5iYXNlVVJMICYmICFpc0Fic29sdXRlVVJMKGNvbmZpZy51cmwpKSB7XG4gICAgY29uZmlnLnVybCA9IGNvbWJpbmVVUkxzKGNvbmZpZy5iYXNlVVJMLCBjb25maWcudXJsKTtcbiAgfVxuXG4gIC8vIEVuc3VyZSBoZWFkZXJzIGV4aXN0XG4gIGNvbmZpZy5oZWFkZXJzID0gY29uZmlnLmhlYWRlcnMgfHwge307XG5cbiAgLy8gVHJhbnNmb3JtIHJlcXVlc3QgZGF0YVxuICBjb25maWcuZGF0YSA9IHRyYW5zZm9ybURhdGEoXG4gICAgY29uZmlnLmRhdGEsXG4gICAgY29uZmlnLmhlYWRlcnMsXG4gICAgY29uZmlnLnRyYW5zZm9ybVJlcXVlc3RcbiAgKTtcblxuICAvLyBGbGF0dGVuIGhlYWRlcnNcbiAgY29uZmlnLmhlYWRlcnMgPSB1dGlscy5tZXJnZShcbiAgICBjb25maWcuaGVhZGVycy5jb21tb24gfHwge30sXG4gICAgY29uZmlnLmhlYWRlcnNbY29uZmlnLm1ldGhvZF0gfHwge30sXG4gICAgY29uZmlnLmhlYWRlcnMgfHwge31cbiAgKTtcblxuICB1dGlscy5mb3JFYWNoKFxuICAgIFsnZGVsZXRlJywgJ2dldCcsICdoZWFkJywgJ3Bvc3QnLCAncHV0JywgJ3BhdGNoJywgJ2NvbW1vbiddLFxuICAgIGZ1bmN0aW9uIGNsZWFuSGVhZGVyQ29uZmlnKG1ldGhvZCkge1xuICAgICAgZGVsZXRlIGNvbmZpZy5oZWFkZXJzW21ldGhvZF07XG4gICAgfVxuICApO1xuXG4gIHZhciBhZGFwdGVyID0gY29uZmlnLmFkYXB0ZXIgfHwgZGVmYXVsdHMuYWRhcHRlcjtcblxuICByZXR1cm4gYWRhcHRlcihjb25maWcpLnRoZW4oZnVuY3Rpb24gb25BZGFwdGVyUmVzb2x1dGlvbihyZXNwb25zZSkge1xuICAgIHRocm93SWZDYW5jZWxsYXRpb25SZXF1ZXN0ZWQoY29uZmlnKTtcblxuICAgIC8vIFRyYW5zZm9ybSByZXNwb25zZSBkYXRhXG4gICAgcmVzcG9uc2UuZGF0YSA9IHRyYW5zZm9ybURhdGEoXG4gICAgICByZXNwb25zZS5kYXRhLFxuICAgICAgcmVzcG9uc2UuaGVhZGVycyxcbiAgICAgIGNvbmZpZy50cmFuc2Zvcm1SZXNwb25zZVxuICAgICk7XG5cbiAgICByZXR1cm4gcmVzcG9uc2U7XG4gIH0sIGZ1bmN0aW9uIG9uQWRhcHRlclJlamVjdGlvbihyZWFzb24pIHtcbiAgICBpZiAoIWlzQ2FuY2VsKHJlYXNvbikpIHtcbiAgICAgIHRocm93SWZDYW5jZWxsYXRpb25SZXF1ZXN0ZWQoY29uZmlnKTtcblxuICAgICAgLy8gVHJhbnNmb3JtIHJlc3BvbnNlIGRhdGFcbiAgICAgIGlmIChyZWFzb24gJiYgcmVhc29uLnJlc3BvbnNlKSB7XG4gICAgICAgIHJlYXNvbi5yZXNwb25zZS5kYXRhID0gdHJhbnNmb3JtRGF0YShcbiAgICAgICAgICByZWFzb24ucmVzcG9uc2UuZGF0YSxcbiAgICAgICAgICByZWFzb24ucmVzcG9uc2UuaGVhZGVycyxcbiAgICAgICAgICBjb25maWcudHJhbnNmb3JtUmVzcG9uc2VcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QocmVhc29uKTtcbiAgfSk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFVwZGF0ZSBhbiBFcnJvciB3aXRoIHRoZSBzcGVjaWZpZWQgY29uZmlnLCBlcnJvciBjb2RlLCBhbmQgcmVzcG9uc2UuXG4gKlxuICogQHBhcmFtIHtFcnJvcn0gZXJyb3IgVGhlIGVycm9yIHRvIHVwZGF0ZS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcgVGhlIGNvbmZpZy5cbiAqIEBwYXJhbSB7c3RyaW5nfSBbY29kZV0gVGhlIGVycm9yIGNvZGUgKGZvciBleGFtcGxlLCAnRUNPTk5BQk9SVEVEJykuXG4gKiBAcGFyYW0ge09iamVjdH0gW3JlcXVlc3RdIFRoZSByZXF1ZXN0LlxuICogQHBhcmFtIHtPYmplY3R9IFtyZXNwb25zZV0gVGhlIHJlc3BvbnNlLlxuICogQHJldHVybnMge0Vycm9yfSBUaGUgZXJyb3IuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZW5oYW5jZUVycm9yKGVycm9yLCBjb25maWcsIGNvZGUsIHJlcXVlc3QsIHJlc3BvbnNlKSB7XG4gIGVycm9yLmNvbmZpZyA9IGNvbmZpZztcbiAgaWYgKGNvZGUpIHtcbiAgICBlcnJvci5jb2RlID0gY29kZTtcbiAgfVxuICBlcnJvci5yZXF1ZXN0ID0gcmVxdWVzdDtcbiAgZXJyb3IucmVzcG9uc2UgPSByZXNwb25zZTtcbiAgcmV0dXJuIGVycm9yO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNyZWF0ZUVycm9yID0gcmVxdWlyZSgnLi9jcmVhdGVFcnJvcicpO1xuXG4vKipcbiAqIFJlc29sdmUgb3IgcmVqZWN0IGEgUHJvbWlzZSBiYXNlZCBvbiByZXNwb25zZSBzdGF0dXMuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gcmVzb2x2ZSBBIGZ1bmN0aW9uIHRoYXQgcmVzb2x2ZXMgdGhlIHByb21pc2UuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSByZWplY3QgQSBmdW5jdGlvbiB0aGF0IHJlamVjdHMgdGhlIHByb21pc2UuXG4gKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgVGhlIHJlc3BvbnNlLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHNldHRsZShyZXNvbHZlLCByZWplY3QsIHJlc3BvbnNlKSB7XG4gIHZhciB2YWxpZGF0ZVN0YXR1cyA9IHJlc3BvbnNlLmNvbmZpZy52YWxpZGF0ZVN0YXR1cztcbiAgLy8gTm90ZTogc3RhdHVzIGlzIG5vdCBleHBvc2VkIGJ5IFhEb21haW5SZXF1ZXN0XG4gIGlmICghcmVzcG9uc2Uuc3RhdHVzIHx8ICF2YWxpZGF0ZVN0YXR1cyB8fCB2YWxpZGF0ZVN0YXR1cyhyZXNwb25zZS5zdGF0dXMpKSB7XG4gICAgcmVzb2x2ZShyZXNwb25zZSk7XG4gIH0gZWxzZSB7XG4gICAgcmVqZWN0KGNyZWF0ZUVycm9yKFxuICAgICAgJ1JlcXVlc3QgZmFpbGVkIHdpdGggc3RhdHVzIGNvZGUgJyArIHJlc3BvbnNlLnN0YXR1cyxcbiAgICAgIHJlc3BvbnNlLmNvbmZpZyxcbiAgICAgIG51bGwsXG4gICAgICByZXNwb25zZS5yZXF1ZXN0LFxuICAgICAgcmVzcG9uc2VcbiAgICApKTtcbiAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xuXG4vKipcbiAqIFRyYW5zZm9ybSB0aGUgZGF0YSBmb3IgYSByZXF1ZXN0IG9yIGEgcmVzcG9uc2VcbiAqXG4gKiBAcGFyYW0ge09iamVjdHxTdHJpbmd9IGRhdGEgVGhlIGRhdGEgdG8gYmUgdHJhbnNmb3JtZWRcbiAqIEBwYXJhbSB7QXJyYXl9IGhlYWRlcnMgVGhlIGhlYWRlcnMgZm9yIHRoZSByZXF1ZXN0IG9yIHJlc3BvbnNlXG4gKiBAcGFyYW0ge0FycmF5fEZ1bmN0aW9ufSBmbnMgQSBzaW5nbGUgZnVuY3Rpb24gb3IgQXJyYXkgb2YgZnVuY3Rpb25zXG4gKiBAcmV0dXJucyB7Kn0gVGhlIHJlc3VsdGluZyB0cmFuc2Zvcm1lZCBkYXRhXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gdHJhbnNmb3JtRGF0YShkYXRhLCBoZWFkZXJzLCBmbnMpIHtcbiAgLyplc2xpbnQgbm8tcGFyYW0tcmVhc3NpZ246MCovXG4gIHV0aWxzLmZvckVhY2goZm5zLCBmdW5jdGlvbiB0cmFuc2Zvcm0oZm4pIHtcbiAgICBkYXRhID0gZm4oZGF0YSwgaGVhZGVycyk7XG4gIH0pO1xuXG4gIHJldHVybiBkYXRhO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIG5vcm1hbGl6ZUhlYWRlck5hbWUgPSByZXF1aXJlKCcuL2hlbHBlcnMvbm9ybWFsaXplSGVhZGVyTmFtZScpO1xuXG52YXIgREVGQVVMVF9DT05URU5UX1RZUEUgPSB7XG4gICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJ1xufTtcblxuZnVuY3Rpb24gc2V0Q29udGVudFR5cGVJZlVuc2V0KGhlYWRlcnMsIHZhbHVlKSB7XG4gIGlmICghdXRpbHMuaXNVbmRlZmluZWQoaGVhZGVycykgJiYgdXRpbHMuaXNVbmRlZmluZWQoaGVhZGVyc1snQ29udGVudC1UeXBlJ10pKSB7XG4gICAgaGVhZGVyc1snQ29udGVudC1UeXBlJ10gPSB2YWx1ZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXREZWZhdWx0QWRhcHRlcigpIHtcbiAgdmFyIGFkYXB0ZXI7XG4gIGlmICh0eXBlb2YgWE1MSHR0cFJlcXVlc3QgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgLy8gRm9yIGJyb3dzZXJzIHVzZSBYSFIgYWRhcHRlclxuICAgIGFkYXB0ZXIgPSByZXF1aXJlKCcuL2FkYXB0ZXJzL3hocicpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJykge1xuICAgIC8vIEZvciBub2RlIHVzZSBIVFRQIGFkYXB0ZXJcbiAgICBhZGFwdGVyID0gcmVxdWlyZSgnLi9hZGFwdGVycy9odHRwJyk7XG4gIH1cbiAgcmV0dXJuIGFkYXB0ZXI7XG59XG5cbnZhciBkZWZhdWx0cyA9IHtcbiAgYWRhcHRlcjogZ2V0RGVmYXVsdEFkYXB0ZXIoKSxcblxuICB0cmFuc2Zvcm1SZXF1ZXN0OiBbZnVuY3Rpb24gdHJhbnNmb3JtUmVxdWVzdChkYXRhLCBoZWFkZXJzKSB7XG4gICAgbm9ybWFsaXplSGVhZGVyTmFtZShoZWFkZXJzLCAnQ29udGVudC1UeXBlJyk7XG4gICAgaWYgKHV0aWxzLmlzRm9ybURhdGEoZGF0YSkgfHxcbiAgICAgIHV0aWxzLmlzQXJyYXlCdWZmZXIoZGF0YSkgfHxcbiAgICAgIHV0aWxzLmlzQnVmZmVyKGRhdGEpIHx8XG4gICAgICB1dGlscy5pc1N0cmVhbShkYXRhKSB8fFxuICAgICAgdXRpbHMuaXNGaWxlKGRhdGEpIHx8XG4gICAgICB1dGlscy5pc0Jsb2IoZGF0YSlcbiAgICApIHtcbiAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cbiAgICBpZiAodXRpbHMuaXNBcnJheUJ1ZmZlclZpZXcoZGF0YSkpIHtcbiAgICAgIHJldHVybiBkYXRhLmJ1ZmZlcjtcbiAgICB9XG4gICAgaWYgKHV0aWxzLmlzVVJMU2VhcmNoUGFyYW1zKGRhdGEpKSB7XG4gICAgICBzZXRDb250ZW50VHlwZUlmVW5zZXQoaGVhZGVycywgJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDtjaGFyc2V0PXV0Zi04Jyk7XG4gICAgICByZXR1cm4gZGF0YS50b1N0cmluZygpO1xuICAgIH1cbiAgICBpZiAodXRpbHMuaXNPYmplY3QoZGF0YSkpIHtcbiAgICAgIHNldENvbnRlbnRUeXBlSWZVbnNldChoZWFkZXJzLCAnYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PXV0Zi04Jyk7XG4gICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgfVxuICAgIHJldHVybiBkYXRhO1xuICB9XSxcblxuICB0cmFuc2Zvcm1SZXNwb25zZTogW2Z1bmN0aW9uIHRyYW5zZm9ybVJlc3BvbnNlKGRhdGEpIHtcbiAgICAvKmVzbGludCBuby1wYXJhbS1yZWFzc2lnbjowKi9cbiAgICBpZiAodHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0cnkge1xuICAgICAgICBkYXRhID0gSlNPTi5wYXJzZShkYXRhKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHsgLyogSWdub3JlICovIH1cbiAgICB9XG4gICAgcmV0dXJuIGRhdGE7XG4gIH1dLFxuXG4gIC8qKlxuICAgKiBBIHRpbWVvdXQgaW4gbWlsbGlzZWNvbmRzIHRvIGFib3J0IGEgcmVxdWVzdC4gSWYgc2V0IHRvIDAgKGRlZmF1bHQpIGFcbiAgICogdGltZW91dCBpcyBub3QgY3JlYXRlZC5cbiAgICovXG4gIHRpbWVvdXQ6IDAsXG5cbiAgeHNyZkNvb2tpZU5hbWU6ICdYU1JGLVRPS0VOJyxcbiAgeHNyZkhlYWRlck5hbWU6ICdYLVhTUkYtVE9LRU4nLFxuXG4gIG1heENvbnRlbnRMZW5ndGg6IC0xLFxuXG4gIHZhbGlkYXRlU3RhdHVzOiBmdW5jdGlvbiB2YWxpZGF0ZVN0YXR1cyhzdGF0dXMpIHtcbiAgICByZXR1cm4gc3RhdHVzID49IDIwMCAmJiBzdGF0dXMgPCAzMDA7XG4gIH1cbn07XG5cbmRlZmF1bHRzLmhlYWRlcnMgPSB7XG4gIGNvbW1vbjoge1xuICAgICdBY2NlcHQnOiAnYXBwbGljYXRpb24vanNvbiwgdGV4dC9wbGFpbiwgKi8qJ1xuICB9XG59O1xuXG51dGlscy5mb3JFYWNoKFsnZGVsZXRlJywgJ2dldCcsICdoZWFkJ10sIGZ1bmN0aW9uIGZvckVhY2hNZXRob2ROb0RhdGEobWV0aG9kKSB7XG4gIGRlZmF1bHRzLmhlYWRlcnNbbWV0aG9kXSA9IHt9O1xufSk7XG5cbnV0aWxzLmZvckVhY2goWydwb3N0JywgJ3B1dCcsICdwYXRjaCddLCBmdW5jdGlvbiBmb3JFYWNoTWV0aG9kV2l0aERhdGEobWV0aG9kKSB7XG4gIGRlZmF1bHRzLmhlYWRlcnNbbWV0aG9kXSA9IHV0aWxzLm1lcmdlKERFRkFVTFRfQ09OVEVOVF9UWVBFKTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGRlZmF1bHRzO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGJpbmQoZm4sIHRoaXNBcmcpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIHdyYXAoKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBhcmdzW2ldID0gYXJndW1lbnRzW2ldO1xuICAgIH1cbiAgICByZXR1cm4gZm4uYXBwbHkodGhpc0FyZywgYXJncyk7XG4gIH07XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBidG9hIHBvbHlmaWxsIGZvciBJRTwxMCBjb3VydGVzeSBodHRwczovL2dpdGh1Yi5jb20vZGF2aWRjaGFtYmVycy9CYXNlNjQuanNcblxudmFyIGNoYXJzID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky89JztcblxuZnVuY3Rpb24gRSgpIHtcbiAgdGhpcy5tZXNzYWdlID0gJ1N0cmluZyBjb250YWlucyBhbiBpbnZhbGlkIGNoYXJhY3Rlcic7XG59XG5FLnByb3RvdHlwZSA9IG5ldyBFcnJvcjtcbkUucHJvdG90eXBlLmNvZGUgPSA1O1xuRS5wcm90b3R5cGUubmFtZSA9ICdJbnZhbGlkQ2hhcmFjdGVyRXJyb3InO1xuXG5mdW5jdGlvbiBidG9hKGlucHV0KSB7XG4gIHZhciBzdHIgPSBTdHJpbmcoaW5wdXQpO1xuICB2YXIgb3V0cHV0ID0gJyc7XG4gIGZvciAoXG4gICAgLy8gaW5pdGlhbGl6ZSByZXN1bHQgYW5kIGNvdW50ZXJcbiAgICB2YXIgYmxvY2ssIGNoYXJDb2RlLCBpZHggPSAwLCBtYXAgPSBjaGFycztcbiAgICAvLyBpZiB0aGUgbmV4dCBzdHIgaW5kZXggZG9lcyBub3QgZXhpc3Q6XG4gICAgLy8gICBjaGFuZ2UgdGhlIG1hcHBpbmcgdGFibGUgdG8gXCI9XCJcbiAgICAvLyAgIGNoZWNrIGlmIGQgaGFzIG5vIGZyYWN0aW9uYWwgZGlnaXRzXG4gICAgc3RyLmNoYXJBdChpZHggfCAwKSB8fCAobWFwID0gJz0nLCBpZHggJSAxKTtcbiAgICAvLyBcIjggLSBpZHggJSAxICogOFwiIGdlbmVyYXRlcyB0aGUgc2VxdWVuY2UgMiwgNCwgNiwgOFxuICAgIG91dHB1dCArPSBtYXAuY2hhckF0KDYzICYgYmxvY2sgPj4gOCAtIGlkeCAlIDEgKiA4KVxuICApIHtcbiAgICBjaGFyQ29kZSA9IHN0ci5jaGFyQ29kZUF0KGlkeCArPSAzIC8gNCk7XG4gICAgaWYgKGNoYXJDb2RlID4gMHhGRikge1xuICAgICAgdGhyb3cgbmV3IEUoKTtcbiAgICB9XG4gICAgYmxvY2sgPSBibG9jayA8PCA4IHwgY2hhckNvZGU7XG4gIH1cbiAgcmV0dXJuIG91dHB1dDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBidG9hO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XG5cbmZ1bmN0aW9uIGVuY29kZSh2YWwpIHtcbiAgcmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudCh2YWwpLlxuICAgIHJlcGxhY2UoLyU0MC9naSwgJ0AnKS5cbiAgICByZXBsYWNlKC8lM0EvZ2ksICc6JykuXG4gICAgcmVwbGFjZSgvJTI0L2csICckJykuXG4gICAgcmVwbGFjZSgvJTJDL2dpLCAnLCcpLlxuICAgIHJlcGxhY2UoLyUyMC9nLCAnKycpLlxuICAgIHJlcGxhY2UoLyU1Qi9naSwgJ1snKS5cbiAgICByZXBsYWNlKC8lNUQvZ2ksICddJyk7XG59XG5cbi8qKlxuICogQnVpbGQgYSBVUkwgYnkgYXBwZW5kaW5nIHBhcmFtcyB0byB0aGUgZW5kXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHVybCBUaGUgYmFzZSBvZiB0aGUgdXJsIChlLmcuLCBodHRwOi8vd3d3Lmdvb2dsZS5jb20pXG4gKiBAcGFyYW0ge29iamVjdH0gW3BhcmFtc10gVGhlIHBhcmFtcyB0byBiZSBhcHBlbmRlZFxuICogQHJldHVybnMge3N0cmluZ30gVGhlIGZvcm1hdHRlZCB1cmxcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBidWlsZFVSTCh1cmwsIHBhcmFtcywgcGFyYW1zU2VyaWFsaXplcikge1xuICAvKmVzbGludCBuby1wYXJhbS1yZWFzc2lnbjowKi9cbiAgaWYgKCFwYXJhbXMpIHtcbiAgICByZXR1cm4gdXJsO1xuICB9XG5cbiAgdmFyIHNlcmlhbGl6ZWRQYXJhbXM7XG4gIGlmIChwYXJhbXNTZXJpYWxpemVyKSB7XG4gICAgc2VyaWFsaXplZFBhcmFtcyA9IHBhcmFtc1NlcmlhbGl6ZXIocGFyYW1zKTtcbiAgfSBlbHNlIGlmICh1dGlscy5pc1VSTFNlYXJjaFBhcmFtcyhwYXJhbXMpKSB7XG4gICAgc2VyaWFsaXplZFBhcmFtcyA9IHBhcmFtcy50b1N0cmluZygpO1xuICB9IGVsc2Uge1xuICAgIHZhciBwYXJ0cyA9IFtdO1xuXG4gICAgdXRpbHMuZm9yRWFjaChwYXJhbXMsIGZ1bmN0aW9uIHNlcmlhbGl6ZSh2YWwsIGtleSkge1xuICAgICAgaWYgKHZhbCA9PT0gbnVsbCB8fCB0eXBlb2YgdmFsID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmICh1dGlscy5pc0FycmF5KHZhbCkpIHtcbiAgICAgICAga2V5ID0ga2V5ICsgJ1tdJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbCA9IFt2YWxdO1xuICAgICAgfVxuXG4gICAgICB1dGlscy5mb3JFYWNoKHZhbCwgZnVuY3Rpb24gcGFyc2VWYWx1ZSh2KSB7XG4gICAgICAgIGlmICh1dGlscy5pc0RhdGUodikpIHtcbiAgICAgICAgICB2ID0gdi50b0lTT1N0cmluZygpO1xuICAgICAgICB9IGVsc2UgaWYgKHV0aWxzLmlzT2JqZWN0KHYpKSB7XG4gICAgICAgICAgdiA9IEpTT04uc3RyaW5naWZ5KHYpO1xuICAgICAgICB9XG4gICAgICAgIHBhcnRzLnB1c2goZW5jb2RlKGtleSkgKyAnPScgKyBlbmNvZGUodikpO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBzZXJpYWxpemVkUGFyYW1zID0gcGFydHMuam9pbignJicpO1xuICB9XG5cbiAgaWYgKHNlcmlhbGl6ZWRQYXJhbXMpIHtcbiAgICB1cmwgKz0gKHVybC5pbmRleE9mKCc/JykgPT09IC0xID8gJz8nIDogJyYnKSArIHNlcmlhbGl6ZWRQYXJhbXM7XG4gIH1cblxuICByZXR1cm4gdXJsO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IFVSTCBieSBjb21iaW5pbmcgdGhlIHNwZWNpZmllZCBVUkxzXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGJhc2VVUkwgVGhlIGJhc2UgVVJMXG4gKiBAcGFyYW0ge3N0cmluZ30gcmVsYXRpdmVVUkwgVGhlIHJlbGF0aXZlIFVSTFxuICogQHJldHVybnMge3N0cmluZ30gVGhlIGNvbWJpbmVkIFVSTFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGNvbWJpbmVVUkxzKGJhc2VVUkwsIHJlbGF0aXZlVVJMKSB7XG4gIHJldHVybiByZWxhdGl2ZVVSTFxuICAgID8gYmFzZVVSTC5yZXBsYWNlKC9cXC8rJC8sICcnKSArICcvJyArIHJlbGF0aXZlVVJMLnJlcGxhY2UoL15cXC8rLywgJycpXG4gICAgOiBiYXNlVVJMO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IChcbiAgdXRpbHMuaXNTdGFuZGFyZEJyb3dzZXJFbnYoKSA/XG5cbiAgLy8gU3RhbmRhcmQgYnJvd3NlciBlbnZzIHN1cHBvcnQgZG9jdW1lbnQuY29va2llXG4gIChmdW5jdGlvbiBzdGFuZGFyZEJyb3dzZXJFbnYoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHdyaXRlOiBmdW5jdGlvbiB3cml0ZShuYW1lLCB2YWx1ZSwgZXhwaXJlcywgcGF0aCwgZG9tYWluLCBzZWN1cmUpIHtcbiAgICAgICAgdmFyIGNvb2tpZSA9IFtdO1xuICAgICAgICBjb29raWUucHVzaChuYW1lICsgJz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKSk7XG5cbiAgICAgICAgaWYgKHV0aWxzLmlzTnVtYmVyKGV4cGlyZXMpKSB7XG4gICAgICAgICAgY29va2llLnB1c2goJ2V4cGlyZXM9JyArIG5ldyBEYXRlKGV4cGlyZXMpLnRvR01UU3RyaW5nKCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHV0aWxzLmlzU3RyaW5nKHBhdGgpKSB7XG4gICAgICAgICAgY29va2llLnB1c2goJ3BhdGg9JyArIHBhdGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHV0aWxzLmlzU3RyaW5nKGRvbWFpbikpIHtcbiAgICAgICAgICBjb29raWUucHVzaCgnZG9tYWluPScgKyBkb21haW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHNlY3VyZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgIGNvb2tpZS5wdXNoKCdzZWN1cmUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRvY3VtZW50LmNvb2tpZSA9IGNvb2tpZS5qb2luKCc7ICcpO1xuICAgICAgfSxcblxuICAgICAgcmVhZDogZnVuY3Rpb24gcmVhZChuYW1lKSB7XG4gICAgICAgIHZhciBtYXRjaCA9IGRvY3VtZW50LmNvb2tpZS5tYXRjaChuZXcgUmVnRXhwKCcoXnw7XFxcXHMqKSgnICsgbmFtZSArICcpPShbXjtdKiknKSk7XG4gICAgICAgIHJldHVybiAobWF0Y2ggPyBkZWNvZGVVUklDb21wb25lbnQobWF0Y2hbM10pIDogbnVsbCk7XG4gICAgICB9LFxuXG4gICAgICByZW1vdmU6IGZ1bmN0aW9uIHJlbW92ZShuYW1lKSB7XG4gICAgICAgIHRoaXMud3JpdGUobmFtZSwgJycsIERhdGUubm93KCkgLSA4NjQwMDAwMCk7XG4gICAgICB9XG4gICAgfTtcbiAgfSkoKSA6XG5cbiAgLy8gTm9uIHN0YW5kYXJkIGJyb3dzZXIgZW52ICh3ZWIgd29ya2VycywgcmVhY3QtbmF0aXZlKSBsYWNrIG5lZWRlZCBzdXBwb3J0LlxuICAoZnVuY3Rpb24gbm9uU3RhbmRhcmRCcm93c2VyRW52KCkge1xuICAgIHJldHVybiB7XG4gICAgICB3cml0ZTogZnVuY3Rpb24gd3JpdGUoKSB7fSxcbiAgICAgIHJlYWQ6IGZ1bmN0aW9uIHJlYWQoKSB7IHJldHVybiBudWxsOyB9LFxuICAgICAgcmVtb3ZlOiBmdW5jdGlvbiByZW1vdmUoKSB7fVxuICAgIH07XG4gIH0pKClcbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBzcGVjaWZpZWQgVVJMIGlzIGFic29sdXRlXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHVybCBUaGUgVVJMIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHRoZSBzcGVjaWZpZWQgVVJMIGlzIGFic29sdXRlLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0Fic29sdXRlVVJMKHVybCkge1xuICAvLyBBIFVSTCBpcyBjb25zaWRlcmVkIGFic29sdXRlIGlmIGl0IGJlZ2lucyB3aXRoIFwiPHNjaGVtZT46Ly9cIiBvciBcIi8vXCIgKHByb3RvY29sLXJlbGF0aXZlIFVSTCkuXG4gIC8vIFJGQyAzOTg2IGRlZmluZXMgc2NoZW1lIG5hbWUgYXMgYSBzZXF1ZW5jZSBvZiBjaGFyYWN0ZXJzIGJlZ2lubmluZyB3aXRoIGEgbGV0dGVyIGFuZCBmb2xsb3dlZFxuICAvLyBieSBhbnkgY29tYmluYXRpb24gb2YgbGV0dGVycywgZGlnaXRzLCBwbHVzLCBwZXJpb2QsIG9yIGh5cGhlbi5cbiAgcmV0dXJuIC9eKFthLXpdW2EtelxcZFxcK1xcLVxcLl0qOik/XFwvXFwvL2kudGVzdCh1cmwpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IChcbiAgdXRpbHMuaXNTdGFuZGFyZEJyb3dzZXJFbnYoKSA/XG5cbiAgLy8gU3RhbmRhcmQgYnJvd3NlciBlbnZzIGhhdmUgZnVsbCBzdXBwb3J0IG9mIHRoZSBBUElzIG5lZWRlZCB0byB0ZXN0XG4gIC8vIHdoZXRoZXIgdGhlIHJlcXVlc3QgVVJMIGlzIG9mIHRoZSBzYW1lIG9yaWdpbiBhcyBjdXJyZW50IGxvY2F0aW9uLlxuICAoZnVuY3Rpb24gc3RhbmRhcmRCcm93c2VyRW52KCkge1xuICAgIHZhciBtc2llID0gLyhtc2llfHRyaWRlbnQpL2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KTtcbiAgICB2YXIgdXJsUGFyc2luZ05vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgdmFyIG9yaWdpblVSTDtcblxuICAgIC8qKlxuICAgICogUGFyc2UgYSBVUkwgdG8gZGlzY292ZXIgaXQncyBjb21wb25lbnRzXG4gICAgKlxuICAgICogQHBhcmFtIHtTdHJpbmd9IHVybCBUaGUgVVJMIHRvIGJlIHBhcnNlZFxuICAgICogQHJldHVybnMge09iamVjdH1cbiAgICAqL1xuICAgIGZ1bmN0aW9uIHJlc29sdmVVUkwodXJsKSB7XG4gICAgICB2YXIgaHJlZiA9IHVybDtcblxuICAgICAgaWYgKG1zaWUpIHtcbiAgICAgICAgLy8gSUUgbmVlZHMgYXR0cmlidXRlIHNldCB0d2ljZSB0byBub3JtYWxpemUgcHJvcGVydGllc1xuICAgICAgICB1cmxQYXJzaW5nTm9kZS5zZXRBdHRyaWJ1dGUoJ2hyZWYnLCBocmVmKTtcbiAgICAgICAgaHJlZiA9IHVybFBhcnNpbmdOb2RlLmhyZWY7XG4gICAgICB9XG5cbiAgICAgIHVybFBhcnNpbmdOb2RlLnNldEF0dHJpYnV0ZSgnaHJlZicsIGhyZWYpO1xuXG4gICAgICAvLyB1cmxQYXJzaW5nTm9kZSBwcm92aWRlcyB0aGUgVXJsVXRpbHMgaW50ZXJmYWNlIC0gaHR0cDovL3VybC5zcGVjLndoYXR3Zy5vcmcvI3VybHV0aWxzXG4gICAgICByZXR1cm4ge1xuICAgICAgICBocmVmOiB1cmxQYXJzaW5nTm9kZS5ocmVmLFxuICAgICAgICBwcm90b2NvbDogdXJsUGFyc2luZ05vZGUucHJvdG9jb2wgPyB1cmxQYXJzaW5nTm9kZS5wcm90b2NvbC5yZXBsYWNlKC86JC8sICcnKSA6ICcnLFxuICAgICAgICBob3N0OiB1cmxQYXJzaW5nTm9kZS5ob3N0LFxuICAgICAgICBzZWFyY2g6IHVybFBhcnNpbmdOb2RlLnNlYXJjaCA/IHVybFBhcnNpbmdOb2RlLnNlYXJjaC5yZXBsYWNlKC9eXFw/LywgJycpIDogJycsXG4gICAgICAgIGhhc2g6IHVybFBhcnNpbmdOb2RlLmhhc2ggPyB1cmxQYXJzaW5nTm9kZS5oYXNoLnJlcGxhY2UoL14jLywgJycpIDogJycsXG4gICAgICAgIGhvc3RuYW1lOiB1cmxQYXJzaW5nTm9kZS5ob3N0bmFtZSxcbiAgICAgICAgcG9ydDogdXJsUGFyc2luZ05vZGUucG9ydCxcbiAgICAgICAgcGF0aG5hbWU6ICh1cmxQYXJzaW5nTm9kZS5wYXRobmFtZS5jaGFyQXQoMCkgPT09ICcvJykgP1xuICAgICAgICAgICAgICAgICAgdXJsUGFyc2luZ05vZGUucGF0aG5hbWUgOlxuICAgICAgICAgICAgICAgICAgJy8nICsgdXJsUGFyc2luZ05vZGUucGF0aG5hbWVcbiAgICAgIH07XG4gICAgfVxuXG4gICAgb3JpZ2luVVJMID0gcmVzb2x2ZVVSTCh3aW5kb3cubG9jYXRpb24uaHJlZik7XG5cbiAgICAvKipcbiAgICAqIERldGVybWluZSBpZiBhIFVSTCBzaGFyZXMgdGhlIHNhbWUgb3JpZ2luIGFzIHRoZSBjdXJyZW50IGxvY2F0aW9uXG4gICAgKlxuICAgICogQHBhcmFtIHtTdHJpbmd9IHJlcXVlc3RVUkwgVGhlIFVSTCB0byB0ZXN0XG4gICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBVUkwgc2hhcmVzIHRoZSBzYW1lIG9yaWdpbiwgb3RoZXJ3aXNlIGZhbHNlXG4gICAgKi9cbiAgICByZXR1cm4gZnVuY3Rpb24gaXNVUkxTYW1lT3JpZ2luKHJlcXVlc3RVUkwpIHtcbiAgICAgIHZhciBwYXJzZWQgPSAodXRpbHMuaXNTdHJpbmcocmVxdWVzdFVSTCkpID8gcmVzb2x2ZVVSTChyZXF1ZXN0VVJMKSA6IHJlcXVlc3RVUkw7XG4gICAgICByZXR1cm4gKHBhcnNlZC5wcm90b2NvbCA9PT0gb3JpZ2luVVJMLnByb3RvY29sICYmXG4gICAgICAgICAgICBwYXJzZWQuaG9zdCA9PT0gb3JpZ2luVVJMLmhvc3QpO1xuICAgIH07XG4gIH0pKCkgOlxuXG4gIC8vIE5vbiBzdGFuZGFyZCBicm93c2VyIGVudnMgKHdlYiB3b3JrZXJzLCByZWFjdC1uYXRpdmUpIGxhY2sgbmVlZGVkIHN1cHBvcnQuXG4gIChmdW5jdGlvbiBub25TdGFuZGFyZEJyb3dzZXJFbnYoKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGlzVVJMU2FtZU9yaWdpbigpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gIH0pKClcbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gbm9ybWFsaXplSGVhZGVyTmFtZShoZWFkZXJzLCBub3JtYWxpemVkTmFtZSkge1xuICB1dGlscy5mb3JFYWNoKGhlYWRlcnMsIGZ1bmN0aW9uIHByb2Nlc3NIZWFkZXIodmFsdWUsIG5hbWUpIHtcbiAgICBpZiAobmFtZSAhPT0gbm9ybWFsaXplZE5hbWUgJiYgbmFtZS50b1VwcGVyQ2FzZSgpID09PSBub3JtYWxpemVkTmFtZS50b1VwcGVyQ2FzZSgpKSB7XG4gICAgICBoZWFkZXJzW25vcm1hbGl6ZWROYW1lXSA9IHZhbHVlO1xuICAgICAgZGVsZXRlIGhlYWRlcnNbbmFtZV07XG4gICAgfVxuICB9KTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcblxuLy8gSGVhZGVycyB3aG9zZSBkdXBsaWNhdGVzIGFyZSBpZ25vcmVkIGJ5IG5vZGVcbi8vIGMuZi4gaHR0cHM6Ly9ub2RlanMub3JnL2FwaS9odHRwLmh0bWwjaHR0cF9tZXNzYWdlX2hlYWRlcnNcbnZhciBpZ25vcmVEdXBsaWNhdGVPZiA9IFtcbiAgJ2FnZScsICdhdXRob3JpemF0aW9uJywgJ2NvbnRlbnQtbGVuZ3RoJywgJ2NvbnRlbnQtdHlwZScsICdldGFnJyxcbiAgJ2V4cGlyZXMnLCAnZnJvbScsICdob3N0JywgJ2lmLW1vZGlmaWVkLXNpbmNlJywgJ2lmLXVubW9kaWZpZWQtc2luY2UnLFxuICAnbGFzdC1tb2RpZmllZCcsICdsb2NhdGlvbicsICdtYXgtZm9yd2FyZHMnLCAncHJveHktYXV0aG9yaXphdGlvbicsXG4gICdyZWZlcmVyJywgJ3JldHJ5LWFmdGVyJywgJ3VzZXItYWdlbnQnXG5dO1xuXG4vKipcbiAqIFBhcnNlIGhlYWRlcnMgaW50byBhbiBvYmplY3RcbiAqXG4gKiBgYGBcbiAqIERhdGU6IFdlZCwgMjcgQXVnIDIwMTQgMDg6NTg6NDkgR01UXG4gKiBDb250ZW50LVR5cGU6IGFwcGxpY2F0aW9uL2pzb25cbiAqIENvbm5lY3Rpb246IGtlZXAtYWxpdmVcbiAqIFRyYW5zZmVyLUVuY29kaW5nOiBjaHVua2VkXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gaGVhZGVycyBIZWFkZXJzIG5lZWRpbmcgdG8gYmUgcGFyc2VkXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBIZWFkZXJzIHBhcnNlZCBpbnRvIGFuIG9iamVjdFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHBhcnNlSGVhZGVycyhoZWFkZXJzKSB7XG4gIHZhciBwYXJzZWQgPSB7fTtcbiAgdmFyIGtleTtcbiAgdmFyIHZhbDtcbiAgdmFyIGk7XG5cbiAgaWYgKCFoZWFkZXJzKSB7IHJldHVybiBwYXJzZWQ7IH1cblxuICB1dGlscy5mb3JFYWNoKGhlYWRlcnMuc3BsaXQoJ1xcbicpLCBmdW5jdGlvbiBwYXJzZXIobGluZSkge1xuICAgIGkgPSBsaW5lLmluZGV4T2YoJzonKTtcbiAgICBrZXkgPSB1dGlscy50cmltKGxpbmUuc3Vic3RyKDAsIGkpKS50b0xvd2VyQ2FzZSgpO1xuICAgIHZhbCA9IHV0aWxzLnRyaW0obGluZS5zdWJzdHIoaSArIDEpKTtcblxuICAgIGlmIChrZXkpIHtcbiAgICAgIGlmIChwYXJzZWRba2V5XSAmJiBpZ25vcmVEdXBsaWNhdGVPZi5pbmRleE9mKGtleSkgPj0gMCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoa2V5ID09PSAnc2V0LWNvb2tpZScpIHtcbiAgICAgICAgcGFyc2VkW2tleV0gPSAocGFyc2VkW2tleV0gPyBwYXJzZWRba2V5XSA6IFtdKS5jb25jYXQoW3ZhbF0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGFyc2VkW2tleV0gPSBwYXJzZWRba2V5XSA/IHBhcnNlZFtrZXldICsgJywgJyArIHZhbCA6IHZhbDtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBwYXJzZWQ7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFN5bnRhY3RpYyBzdWdhciBmb3IgaW52b2tpbmcgYSBmdW5jdGlvbiBhbmQgZXhwYW5kaW5nIGFuIGFycmF5IGZvciBhcmd1bWVudHMuXG4gKlxuICogQ29tbW9uIHVzZSBjYXNlIHdvdWxkIGJlIHRvIHVzZSBgRnVuY3Rpb24ucHJvdG90eXBlLmFwcGx5YC5cbiAqXG4gKiAgYGBganNcbiAqICBmdW5jdGlvbiBmKHgsIHksIHopIHt9XG4gKiAgdmFyIGFyZ3MgPSBbMSwgMiwgM107XG4gKiAgZi5hcHBseShudWxsLCBhcmdzKTtcbiAqICBgYGBcbiAqXG4gKiBXaXRoIGBzcHJlYWRgIHRoaXMgZXhhbXBsZSBjYW4gYmUgcmUtd3JpdHRlbi5cbiAqXG4gKiAgYGBganNcbiAqICBzcHJlYWQoZnVuY3Rpb24oeCwgeSwgeikge30pKFsxLCAyLCAzXSk7XG4gKiAgYGBgXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAqIEByZXR1cm5zIHtGdW5jdGlvbn1cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBzcHJlYWQoY2FsbGJhY2spIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIHdyYXAoYXJyKSB7XG4gICAgcmV0dXJuIGNhbGxiYWNrLmFwcGx5KG51bGwsIGFycik7XG4gIH07XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgYmluZCA9IHJlcXVpcmUoJy4vaGVscGVycy9iaW5kJyk7XG52YXIgaXNCdWZmZXIgPSByZXF1aXJlKCdpcy1idWZmZXInKTtcblxuLypnbG9iYWwgdG9TdHJpbmc6dHJ1ZSovXG5cbi8vIHV0aWxzIGlzIGEgbGlicmFyeSBvZiBnZW5lcmljIGhlbHBlciBmdW5jdGlvbnMgbm9uLXNwZWNpZmljIHRvIGF4aW9zXG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYW4gQXJyYXlcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhbiBBcnJheSwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzQXJyYXkodmFsKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKHZhbCkgPT09ICdbb2JqZWN0IEFycmF5XSc7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYW4gQXJyYXlCdWZmZXJcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhbiBBcnJheUJ1ZmZlciwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzQXJyYXlCdWZmZXIodmFsKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKHZhbCkgPT09ICdbb2JqZWN0IEFycmF5QnVmZmVyXSc7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBGb3JtRGF0YVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGFuIEZvcm1EYXRhLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNGb3JtRGF0YSh2YWwpIHtcbiAgcmV0dXJuICh0eXBlb2YgRm9ybURhdGEgIT09ICd1bmRlZmluZWQnKSAmJiAodmFsIGluc3RhbmNlb2YgRm9ybURhdGEpO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgdmlldyBvbiBhbiBBcnJheUJ1ZmZlclxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgdmlldyBvbiBhbiBBcnJheUJ1ZmZlciwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzQXJyYXlCdWZmZXJWaWV3KHZhbCkge1xuICB2YXIgcmVzdWx0O1xuICBpZiAoKHR5cGVvZiBBcnJheUJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCcpICYmIChBcnJheUJ1ZmZlci5pc1ZpZXcpKSB7XG4gICAgcmVzdWx0ID0gQXJyYXlCdWZmZXIuaXNWaWV3KHZhbCk7XG4gIH0gZWxzZSB7XG4gICAgcmVzdWx0ID0gKHZhbCkgJiYgKHZhbC5idWZmZXIpICYmICh2YWwuYnVmZmVyIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBTdHJpbmdcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIFN0cmluZywgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzU3RyaW5nKHZhbCkge1xuICByZXR1cm4gdHlwZW9mIHZhbCA9PT0gJ3N0cmluZyc7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBOdW1iZXJcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIE51bWJlciwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzTnVtYmVyKHZhbCkge1xuICByZXR1cm4gdHlwZW9mIHZhbCA9PT0gJ251bWJlcic7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgdW5kZWZpbmVkXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdGhlIHZhbHVlIGlzIHVuZGVmaW5lZCwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKHZhbCkge1xuICByZXR1cm4gdHlwZW9mIHZhbCA9PT0gJ3VuZGVmaW5lZCc7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYW4gT2JqZWN0XG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYW4gT2JqZWN0LCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNPYmplY3QodmFsKSB7XG4gIHJldHVybiB2YWwgIT09IG51bGwgJiYgdHlwZW9mIHZhbCA9PT0gJ29iamVjdCc7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBEYXRlXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBEYXRlLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNEYXRlKHZhbCkge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbCh2YWwpID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBGaWxlXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBGaWxlLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNGaWxlKHZhbCkge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbCh2YWwpID09PSAnW29iamVjdCBGaWxlXSc7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBCbG9iXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBCbG9iLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNCbG9iKHZhbCkge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbCh2YWwpID09PSAnW29iamVjdCBCbG9iXSc7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBGdW5jdGlvblxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgRnVuY3Rpb24sIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKHZhbCkge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbCh2YWwpID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgU3RyZWFtXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBTdHJlYW0sIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc1N0cmVhbSh2YWwpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KHZhbCkgJiYgaXNGdW5jdGlvbih2YWwucGlwZSk7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBVUkxTZWFyY2hQYXJhbXMgb2JqZWN0XG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBVUkxTZWFyY2hQYXJhbXMgb2JqZWN0LCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNVUkxTZWFyY2hQYXJhbXModmFsKSB7XG4gIHJldHVybiB0eXBlb2YgVVJMU2VhcmNoUGFyYW1zICE9PSAndW5kZWZpbmVkJyAmJiB2YWwgaW5zdGFuY2VvZiBVUkxTZWFyY2hQYXJhbXM7XG59XG5cbi8qKlxuICogVHJpbSBleGNlc3Mgd2hpdGVzcGFjZSBvZmYgdGhlIGJlZ2lubmluZyBhbmQgZW5kIG9mIGEgc3RyaW5nXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0ciBUaGUgU3RyaW5nIHRvIHRyaW1cbiAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBTdHJpbmcgZnJlZWQgb2YgZXhjZXNzIHdoaXRlc3BhY2VcbiAqL1xuZnVuY3Rpb24gdHJpbShzdHIpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9eXFxzKi8sICcnKS5yZXBsYWNlKC9cXHMqJC8sICcnKTtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgd2UncmUgcnVubmluZyBpbiBhIHN0YW5kYXJkIGJyb3dzZXIgZW52aXJvbm1lbnRcbiAqXG4gKiBUaGlzIGFsbG93cyBheGlvcyB0byBydW4gaW4gYSB3ZWIgd29ya2VyLCBhbmQgcmVhY3QtbmF0aXZlLlxuICogQm90aCBlbnZpcm9ubWVudHMgc3VwcG9ydCBYTUxIdHRwUmVxdWVzdCwgYnV0IG5vdCBmdWxseSBzdGFuZGFyZCBnbG9iYWxzLlxuICpcbiAqIHdlYiB3b3JrZXJzOlxuICogIHR5cGVvZiB3aW5kb3cgLT4gdW5kZWZpbmVkXG4gKiAgdHlwZW9mIGRvY3VtZW50IC0+IHVuZGVmaW5lZFxuICpcbiAqIHJlYWN0LW5hdGl2ZTpcbiAqICBuYXZpZ2F0b3IucHJvZHVjdCAtPiAnUmVhY3ROYXRpdmUnXG4gKi9cbmZ1bmN0aW9uIGlzU3RhbmRhcmRCcm93c2VyRW52KCkge1xuICBpZiAodHlwZW9mIG5hdmlnYXRvciAhPT0gJ3VuZGVmaW5lZCcgJiYgbmF2aWdhdG9yLnByb2R1Y3QgPT09ICdSZWFjdE5hdGl2ZScpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIChcbiAgICB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJlxuICAgIHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCdcbiAgKTtcbn1cblxuLyoqXG4gKiBJdGVyYXRlIG92ZXIgYW4gQXJyYXkgb3IgYW4gT2JqZWN0IGludm9raW5nIGEgZnVuY3Rpb24gZm9yIGVhY2ggaXRlbS5cbiAqXG4gKiBJZiBgb2JqYCBpcyBhbiBBcnJheSBjYWxsYmFjayB3aWxsIGJlIGNhbGxlZCBwYXNzaW5nXG4gKiB0aGUgdmFsdWUsIGluZGV4LCBhbmQgY29tcGxldGUgYXJyYXkgZm9yIGVhY2ggaXRlbS5cbiAqXG4gKiBJZiAnb2JqJyBpcyBhbiBPYmplY3QgY2FsbGJhY2sgd2lsbCBiZSBjYWxsZWQgcGFzc2luZ1xuICogdGhlIHZhbHVlLCBrZXksIGFuZCBjb21wbGV0ZSBvYmplY3QgZm9yIGVhY2ggcHJvcGVydHkuXG4gKlxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl9IG9iaiBUaGUgb2JqZWN0IHRvIGl0ZXJhdGVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIFRoZSBjYWxsYmFjayB0byBpbnZva2UgZm9yIGVhY2ggaXRlbVxuICovXG5mdW5jdGlvbiBmb3JFYWNoKG9iaiwgZm4pIHtcbiAgLy8gRG9uJ3QgYm90aGVyIGlmIG5vIHZhbHVlIHByb3ZpZGVkXG4gIGlmIChvYmogPT09IG51bGwgfHwgdHlwZW9mIG9iaiA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBGb3JjZSBhbiBhcnJheSBpZiBub3QgYWxyZWFkeSBzb21ldGhpbmcgaXRlcmFibGVcbiAgaWYgKHR5cGVvZiBvYmogIT09ICdvYmplY3QnKSB7XG4gICAgLyplc2xpbnQgbm8tcGFyYW0tcmVhc3NpZ246MCovXG4gICAgb2JqID0gW29ial07XG4gIH1cblxuICBpZiAoaXNBcnJheShvYmopKSB7XG4gICAgLy8gSXRlcmF0ZSBvdmVyIGFycmF5IHZhbHVlc1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gb2JqLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgZm4uY2FsbChudWxsLCBvYmpbaV0sIGksIG9iaik7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIEl0ZXJhdGUgb3ZlciBvYmplY3Qga2V5c1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSB7XG4gICAgICAgIGZuLmNhbGwobnVsbCwgb2JqW2tleV0sIGtleSwgb2JqKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBBY2NlcHRzIHZhcmFyZ3MgZXhwZWN0aW5nIGVhY2ggYXJndW1lbnQgdG8gYmUgYW4gb2JqZWN0LCB0aGVuXG4gKiBpbW11dGFibHkgbWVyZ2VzIHRoZSBwcm9wZXJ0aWVzIG9mIGVhY2ggb2JqZWN0IGFuZCByZXR1cm5zIHJlc3VsdC5cbiAqXG4gKiBXaGVuIG11bHRpcGxlIG9iamVjdHMgY29udGFpbiB0aGUgc2FtZSBrZXkgdGhlIGxhdGVyIG9iamVjdCBpblxuICogdGhlIGFyZ3VtZW50cyBsaXN0IHdpbGwgdGFrZSBwcmVjZWRlbmNlLlxuICpcbiAqIEV4YW1wbGU6XG4gKlxuICogYGBganNcbiAqIHZhciByZXN1bHQgPSBtZXJnZSh7Zm9vOiAxMjN9LCB7Zm9vOiA0NTZ9KTtcbiAqIGNvbnNvbGUubG9nKHJlc3VsdC5mb28pOyAvLyBvdXRwdXRzIDQ1NlxuICogYGBgXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iajEgT2JqZWN0IHRvIG1lcmdlXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBSZXN1bHQgb2YgYWxsIG1lcmdlIHByb3BlcnRpZXNcbiAqL1xuZnVuY3Rpb24gbWVyZ2UoLyogb2JqMSwgb2JqMiwgb2JqMywgLi4uICovKSB7XG4gIHZhciByZXN1bHQgPSB7fTtcbiAgZnVuY3Rpb24gYXNzaWduVmFsdWUodmFsLCBrZXkpIHtcbiAgICBpZiAodHlwZW9mIHJlc3VsdFtrZXldID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgdmFsID09PSAnb2JqZWN0Jykge1xuICAgICAgcmVzdWx0W2tleV0gPSBtZXJnZShyZXN1bHRba2V5XSwgdmFsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0W2tleV0gPSB2YWw7XG4gICAgfVxuICB9XG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgZm9yRWFjaChhcmd1bWVudHNbaV0sIGFzc2lnblZhbHVlKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIEV4dGVuZHMgb2JqZWN0IGEgYnkgbXV0YWJseSBhZGRpbmcgdG8gaXQgdGhlIHByb3BlcnRpZXMgb2Ygb2JqZWN0IGIuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGEgVGhlIG9iamVjdCB0byBiZSBleHRlbmRlZFxuICogQHBhcmFtIHtPYmplY3R9IGIgVGhlIG9iamVjdCB0byBjb3B5IHByb3BlcnRpZXMgZnJvbVxuICogQHBhcmFtIHtPYmplY3R9IHRoaXNBcmcgVGhlIG9iamVjdCB0byBiaW5kIGZ1bmN0aW9uIHRvXG4gKiBAcmV0dXJuIHtPYmplY3R9IFRoZSByZXN1bHRpbmcgdmFsdWUgb2Ygb2JqZWN0IGFcbiAqL1xuZnVuY3Rpb24gZXh0ZW5kKGEsIGIsIHRoaXNBcmcpIHtcbiAgZm9yRWFjaChiLCBmdW5jdGlvbiBhc3NpZ25WYWx1ZSh2YWwsIGtleSkge1xuICAgIGlmICh0aGlzQXJnICYmIHR5cGVvZiB2YWwgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGFba2V5XSA9IGJpbmQodmFsLCB0aGlzQXJnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYVtrZXldID0gdmFsO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBhO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgaXNBcnJheTogaXNBcnJheSxcbiAgaXNBcnJheUJ1ZmZlcjogaXNBcnJheUJ1ZmZlcixcbiAgaXNCdWZmZXI6IGlzQnVmZmVyLFxuICBpc0Zvcm1EYXRhOiBpc0Zvcm1EYXRhLFxuICBpc0FycmF5QnVmZmVyVmlldzogaXNBcnJheUJ1ZmZlclZpZXcsXG4gIGlzU3RyaW5nOiBpc1N0cmluZyxcbiAgaXNOdW1iZXI6IGlzTnVtYmVyLFxuICBpc09iamVjdDogaXNPYmplY3QsXG4gIGlzVW5kZWZpbmVkOiBpc1VuZGVmaW5lZCxcbiAgaXNEYXRlOiBpc0RhdGUsXG4gIGlzRmlsZTogaXNGaWxlLFxuICBpc0Jsb2I6IGlzQmxvYixcbiAgaXNGdW5jdGlvbjogaXNGdW5jdGlvbixcbiAgaXNTdHJlYW06IGlzU3RyZWFtLFxuICBpc1VSTFNlYXJjaFBhcmFtczogaXNVUkxTZWFyY2hQYXJhbXMsXG4gIGlzU3RhbmRhcmRCcm93c2VyRW52OiBpc1N0YW5kYXJkQnJvd3NlckVudixcbiAgZm9yRWFjaDogZm9yRWFjaCxcbiAgbWVyZ2U6IG1lcmdlLFxuICBleHRlbmQ6IGV4dGVuZCxcbiAgdHJpbTogdHJpbVxufTtcbiIsIi8qIVxuICogRGV0ZXJtaW5lIGlmIGFuIG9iamVjdCBpcyBhIEJ1ZmZlclxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxodHRwczovL2Zlcm9zcy5vcmc+XG4gKiBAbGljZW5zZSAgTUlUXG4gKi9cblxuLy8gVGhlIF9pc0J1ZmZlciBjaGVjayBpcyBmb3IgU2FmYXJpIDUtNyBzdXBwb3J0LCBiZWNhdXNlIGl0J3MgbWlzc2luZ1xuLy8gT2JqZWN0LnByb3RvdHlwZS5jb25zdHJ1Y3Rvci4gUmVtb3ZlIHRoaXMgZXZlbnR1YWxseVxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob2JqKSB7XG4gIHJldHVybiBvYmogIT0gbnVsbCAmJiAoaXNCdWZmZXIob2JqKSB8fCBpc1Nsb3dCdWZmZXIob2JqKSB8fCAhIW9iai5faXNCdWZmZXIpXG59XG5cbmZ1bmN0aW9uIGlzQnVmZmVyIChvYmopIHtcbiAgcmV0dXJuICEhb2JqLmNvbnN0cnVjdG9yICYmIHR5cGVvZiBvYmouY29uc3RydWN0b3IuaXNCdWZmZXIgPT09ICdmdW5jdGlvbicgJiYgb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyKG9iailcbn1cblxuLy8gRm9yIE5vZGUgdjAuMTAgc3VwcG9ydC4gUmVtb3ZlIHRoaXMgZXZlbnR1YWxseS5cbmZ1bmN0aW9uIGlzU2xvd0J1ZmZlciAob2JqKSB7XG4gIHJldHVybiB0eXBlb2Ygb2JqLnJlYWRGbG9hdExFID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBvYmouc2xpY2UgPT09ICdmdW5jdGlvbicgJiYgaXNCdWZmZXIob2JqLnNsaWNlKDAsIDApKVxufVxuIiwiLyoqVGhpcyBjbGFzcyBpcyBhdXRvbWF0aWNhbGx5IGdlbmVyYXRlZCBieSBMYXlhQWlySURFLCBwbGVhc2UgZG8gbm90IG1ha2UgYW55IG1vZGlmaWNhdGlvbnMuICovXHJcbmltcG9ydCBBc3Npc3RhbnQgZnJvbSBcIi4vc2NyaXB0L0Fzc2lzdGFudFwiXG5pbXBvcnQgUGFnZVNjcmlwdCBmcm9tIFwiLi9wdWJsaWNTY3JpcHQvUGFnZVNjcmlwdFwiXG5pbXBvcnQgU2NyZWVuIGZyb20gXCIuL3B1YmxpY1NjcmlwdC9TY3JlZW5cIlxuaW1wb3J0IHRyZW5kTGlzdCBmcm9tIFwiLi90ZW1wbGF0ZS90cmVuZExpc3RcIlxuaW1wb3J0IHByZXZpb3VzUmVjb3JkcyBmcm9tIFwiLi90ZW1wbGF0ZS9wcmV2aW91c1JlY29yZHNcIlxuaW1wb3J0IENhcmQgZnJvbSBcIi4vc2NyaXB0L0NhcmRcIlxuaW1wb3J0IGdyYW5kUHJpeCBmcm9tIFwiLi9zY3JpcHQvZ3JhbmRQcml4XCJcbmltcG9ydCBQYWdlTmF2U2NyaXB0IGZyb20gXCIuL3B1YmxpY1NjcmlwdC9QYWdlTmF2U2NyaXB0XCJcbmltcG9ydCBHdWVzc2luZyBmcm9tIFwiLi9zY3JpcHQvR3Vlc3NpbmdcIlxuaW1wb3J0IG51bWJlckxpc3REb21TY3JpcHQgZnJvbSBcIi4vdGVtcGxhdGUvbnVtYmVyTGlzdERvbVNjcmlwdFwiXG5pbXBvcnQgSG9tZSBmcm9tIFwiLi9zY3JpcHQvSG9tZVwiXG5pbXBvcnQgUmVjb3JkIGZyb20gXCIuL3NjcmlwdC9SZWNvcmRcIlxuaW1wb3J0IGpvaW5SZWNvcmRzIGZyb20gXCIuL3RlbXBsYXRlL2pvaW5SZWNvcmRzXCJcbmltcG9ydCBwc3dJbnB1dCBmcm9tIFwiLi90ZW1wbGF0ZS9wc3dJbnB1dFwiXG5pbXBvcnQgdGlwRGlhbG9nIGZyb20gXCIuL3RlbXBsYXRlL3RpcERpYWxvZ1wiXHJcbi8qXHJcbiog5ri45oiP5Yid5aeL5YyW6YWN572uO1xyXG4qL1xyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBHYW1lQ29uZmlne1xyXG4gICAgc3RhdGljIHdpZHRoOm51bWJlcj03NTA7XHJcbiAgICBzdGF0aWMgaGVpZ2h0Om51bWJlcj0xMzM0O1xyXG4gICAgc3RhdGljIHNjYWxlTW9kZTpzdHJpbmc9XCJmaXhlZHdpZHRoXCI7XHJcbiAgICBzdGF0aWMgc2NyZWVuTW9kZTpzdHJpbmc9XCJub25lXCI7XHJcbiAgICBzdGF0aWMgYWxpZ25WOnN0cmluZz1cInRvcFwiO1xyXG4gICAgc3RhdGljIGFsaWduSDpzdHJpbmc9XCJsZWZ0XCI7XHJcbiAgICBzdGF0aWMgc3RhcnRTY2VuZTphbnk9XCJob21lLnNjZW5lXCI7XHJcbiAgICBzdGF0aWMgc2NlbmVSb290OnN0cmluZz1cIlwiO1xyXG4gICAgc3RhdGljIGRlYnVnOmJvb2xlYW49ZmFsc2U7XHJcbiAgICBzdGF0aWMgc3RhdDpib29sZWFuPWZhbHNlO1xyXG4gICAgc3RhdGljIHBoeXNpY3NEZWJ1Zzpib29sZWFuPWZhbHNlO1xyXG4gICAgc3RhdGljIGV4cG9ydFNjZW5lVG9Kc29uOmJvb2xlYW49dHJ1ZTtcclxuICAgIGNvbnN0cnVjdG9yKCl7fVxyXG4gICAgc3RhdGljIGluaXQoKXtcclxuICAgICAgICB2YXIgcmVnOiBGdW5jdGlvbiA9IExheWEuQ2xhc3NVdGlscy5yZWdDbGFzcztcclxuICAgICAgICByZWcoXCJzY3JpcHQvQXNzaXN0YW50LnRzXCIsQXNzaXN0YW50KTtcbiAgICAgICAgcmVnKFwicHVibGljU2NyaXB0L1BhZ2VTY3JpcHQudHNcIixQYWdlU2NyaXB0KTtcbiAgICAgICAgcmVnKFwicHVibGljU2NyaXB0L1NjcmVlbi50c1wiLFNjcmVlbik7XG4gICAgICAgIHJlZyhcInRlbXBsYXRlL3RyZW5kTGlzdC50c1wiLHRyZW5kTGlzdCk7XG4gICAgICAgIHJlZyhcInRlbXBsYXRlL3ByZXZpb3VzUmVjb3Jkcy50c1wiLHByZXZpb3VzUmVjb3Jkcyk7XG4gICAgICAgIHJlZyhcInNjcmlwdC9DYXJkLnRzXCIsQ2FyZCk7XG4gICAgICAgIHJlZyhcInNjcmlwdC9ncmFuZFByaXgudHNcIixncmFuZFByaXgpO1xuICAgICAgICByZWcoXCJwdWJsaWNTY3JpcHQvUGFnZU5hdlNjcmlwdC50c1wiLFBhZ2VOYXZTY3JpcHQpO1xuICAgICAgICByZWcoXCJzY3JpcHQvR3Vlc3NpbmcudHNcIixHdWVzc2luZyk7XG4gICAgICAgIHJlZyhcInRlbXBsYXRlL251bWJlckxpc3REb21TY3JpcHQudHNcIixudW1iZXJMaXN0RG9tU2NyaXB0KTtcbiAgICAgICAgcmVnKFwic2NyaXB0L0hvbWUudHNcIixIb21lKTtcbiAgICAgICAgcmVnKFwic2NyaXB0L1JlY29yZC50c1wiLFJlY29yZCk7XG4gICAgICAgIHJlZyhcInRlbXBsYXRlL2pvaW5SZWNvcmRzLnRzXCIsam9pblJlY29yZHMpO1xuICAgICAgICByZWcoXCJ0ZW1wbGF0ZS9wc3dJbnB1dC50c1wiLHBzd0lucHV0KTtcbiAgICAgICAgcmVnKFwidGVtcGxhdGUvdGlwRGlhbG9nLnRzXCIsdGlwRGlhbG9nKTtcclxuICAgIH1cclxufVxyXG5HYW1lQ29uZmlnLmluaXQoKTsiLCJpbXBvcnQgR2FtZUNvbmZpZyBmcm9tIFwiLi9HYW1lQ29uZmlnXCI7XHJcbmNsYXNzIE1haW4ge1xyXG5cdGNvbnN0cnVjdG9yKCkge1xyXG5cdFx0Ly/moLnmja5JREXorr7nva7liJ3lp4vljJblvJXmk45cdFx0XHJcblx0XHRpZiAod2luZG93W1wiTGF5YTNEXCJdKSBMYXlhM0QuaW5pdChHYW1lQ29uZmlnLndpZHRoLCBHYW1lQ29uZmlnLmhlaWdodCk7XHJcblx0XHRlbHNlIExheWEuaW5pdChHYW1lQ29uZmlnLndpZHRoLCBHYW1lQ29uZmlnLmhlaWdodCwgTGF5YVtcIldlYkdMXCJdKTtcclxuXHRcdExheWFbXCJQaHlzaWNzXCJdICYmIExheWFbXCJQaHlzaWNzXCJdLmVuYWJsZSgpO1xyXG5cdFx0TGF5YVtcIkRlYnVnUGFuZWxcIl0gJiYgTGF5YVtcIkRlYnVnUGFuZWxcIl0uZW5hYmxlKCk7XHJcblx0XHRMYXlhLnN0YWdlLnNjYWxlTW9kZSA9IEdhbWVDb25maWcuc2NhbGVNb2RlO1xyXG5cdFx0TGF5YS5zdGFnZS5zY3JlZW5Nb2RlID0gR2FtZUNvbmZpZy5zY3JlZW5Nb2RlO1xyXG5cdFx0Ly/lhbzlrrnlvq7kv6HkuI3mlK/mjIHliqDovb1zY2VuZeWQjue8gOWcuuaZr1xyXG5cdFx0TGF5YS5VUkwuZXhwb3J0U2NlbmVUb0pzb24gPSBHYW1lQ29uZmlnLmV4cG9ydFNjZW5lVG9Kc29uO1xyXG5cclxuXHRcdC8v5omT5byA6LCD6K+V6Z2i5p2/77yI6YCa6L+HSURF6K6+572u6LCD6K+V5qih5byP77yM5oiW6ICFdXJs5Zyw5Z2A5aKe5YqgZGVidWc9dHJ1ZeWPguaVsO+8jOWdh+WPr+aJk+W8gOiwg+ivlemdouadv++8iVxyXG5cdFx0aWYgKEdhbWVDb25maWcuZGVidWcgfHwgTGF5YS5VdGlscy5nZXRRdWVyeVN0cmluZyhcImRlYnVnXCIpID09IFwidHJ1ZVwiKSBMYXlhLmVuYWJsZURlYnVnUGFuZWwoKTtcclxuXHRcdGlmIChHYW1lQ29uZmlnLnBoeXNpY3NEZWJ1ZyAmJiBMYXlhW1wiUGh5c2ljc0RlYnVnRHJhd1wiXSkgTGF5YVtcIlBoeXNpY3NEZWJ1Z0RyYXdcIl0uZW5hYmxlKCk7XHJcblx0XHRpZiAoR2FtZUNvbmZpZy5zdGF0KSBMYXlhLlN0YXQuc2hvdygpO1xyXG5cdFx0TGF5YS5hbGVydEdsb2JhbEVycm9yID0gdHJ1ZTtcclxuXHJcblx0XHQvL+a/gOa0u+i1hOa6kOeJiOacrOaOp+WItu+8jHZlcnNpb24uanNvbueUsUlEReWPkeW4g+WKn+iDveiHquWKqOeUn+aIkO+8jOWmguaenOayoeacieS5n+S4jeW9seWTjeWQjue7rea1geeoi1xyXG5cdFx0TGF5YS5SZXNvdXJjZVZlcnNpb24uZW5hYmxlKFwidmVyc2lvbi5qc29uXCIsIExheWEuSGFuZGxlci5jcmVhdGUodGhpcywgdGhpcy5vblZlcnNpb25Mb2FkZWQpLCBMYXlhLlJlc291cmNlVmVyc2lvbi5GSUxFTkFNRV9WRVJTSU9OKTtcclxuXHR9XHJcblxyXG5cdG9uVmVyc2lvbkxvYWRlZCgpOiB2b2lkIHtcclxuXHRcdC8v5r+A5rS75aSn5bCP5Zu+5pig5bCE77yM5Yqg6L295bCP5Zu+55qE5pe25YCZ77yM5aaC5p6c5Y+R546w5bCP5Zu+5Zyo5aSn5Zu+5ZCI6ZuG6YeM6Z2i77yM5YiZ5LyY5YWI5Yqg6L295aSn5Zu+5ZCI6ZuG77yM6ICM5LiN5piv5bCP5Zu+XHJcblx0XHRMYXlhLkF0bGFzSW5mb01hbmFnZXIuZW5hYmxlKFwiZmlsZWNvbmZpZy5qc29uXCIsIExheWEuSGFuZGxlci5jcmVhdGUodGhpcywgdGhpcy5vbkNvbmZpZ0xvYWRlZCkpO1xyXG5cdH1cclxuXHJcblx0b25Db25maWdMb2FkZWQoKTogdm9pZCB7XHJcblx0XHQvL+WKoOi9vUlEReaMh+WumueahOWcuuaZr1xyXG5cdFx0R2FtZUNvbmZpZy5zdGFydFNjZW5lICYmIExheWEuU2NlbmUub3BlbihHYW1lQ29uZmlnLnN0YXJ0U2NlbmUpO1xyXG5cdH1cclxufVxyXG4vL+a/gOa0u+WQr+WKqOexu1xyXG5uZXcgTWFpbigpO1xyXG4iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjAgMTQ6MTE6MjZcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjAgMTQ6MTE6MjZcclxuICogQGRlc2Mg5pWw5o2u6YCa5L+h5Y+K5L+d5a2Y5o6l5Y+jXHJcbiAqL1xyXG5cclxuZXhwb3J0IGNsYXNzIEdhbWVNb2RlbCBleHRlbmRzIExheWEuRXZlbnREaXNwYXRjaGVyIHtcclxuICAgIHByaXZhdGUgc3RhdGljIF9nYW1lTW9kZWxJbnN0YW5jZTogR2FtZU1vZGVsO1xyXG5cclxuICAgIHVzZXJJbmZvOm9iamVjdCA9IHt9OyAvL+eUqOaIt+S/oeaBr1xyXG5cclxuICAgIHN0YXRpYyBnZXRJbnN0YW5jZSgpOiBHYW1lTW9kZWwge1xyXG4gICAgICAgIGlmICghdGhpcy5fZ2FtZU1vZGVsSW5zdGFuY2UpIHtcclxuICAgICAgICAgICAgdGhpcy5fZ2FtZU1vZGVsSW5zdGFuY2UgPSBuZXcgR2FtZU1vZGVsKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzLl9nYW1lTW9kZWxJbnN0YW5jZTtcclxuICAgIH1cclxuXHJcbiAgICAvKirkv53lrZjnlKjmiLfkv6Hmga8gKi9cclxuICAgIHNldFVzZXJJbmZvKHVzZXJJbmZvOm9iamVjdCl7XHJcbiAgICAgICAgdGhpcy51c2VySW5mbyA9IHVzZXJJbmZvO1xyXG4gICAgICAgIHRoaXMuZXZlbnQoJ2dldFVzZXJJbmZvJyx0aGlzLnVzZXJJbmZvKVxyXG4gICAgfVxyXG59IiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTIwIDE1OjE1OjA4XHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTIwIDE1OjE1OjA4XHJcbiAqIEBkZXNjIGFwaeaOpeWPo+e7n+S4gOWwgeijheWkhOeQhlxyXG4gKi9cclxuXHJcbmltcG9ydCB7IGdldCwgcG9zdCB9IGZyb20gJy4vaHR0cCc7XHJcbmltcG9ydCB7IEdhbWVNb2RlbCB9IGZyb20gJy4vR2FtZU1vZGVsJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IHtcclxuICAgIC8qKuiOt+WPlueUqOaIt+S/oeaBryAqL1xyXG4gICAgZ2V0VXNlckluZm8oKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgZ2V0KCcvdXNlci9nZXRJbmZvJywge30pLnRoZW4oKHJlczogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXJlcy5jb2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5L+d5a2Y55So5oi35L+h5oGvXHJcbiAgICAgICAgICAgICAgICAgICAgR2FtZU1vZGVsLmdldEluc3RhbmNlKCkuc2V0VXNlckluZm8ocmVzLnVzZXJJbmZvKVxyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9LFxyXG5cclxuICAgIC8qKuiOt+WPluS7iuaXpeWkp+WlluaxoCAqL1xyXG4gICAgZ2V0UmFua1RvZGF5KCkge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGdldCgnL3JhbmsvdG9kYXknLCB7fSkudGhlbigocmVzOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICghcmVzLmNvZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlcylcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlcylcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9KVxyXG4gICAgfSxcclxuXHJcbiAgICAvKirojrflj5bpppbpobXllYblk4HliJfooaggKi9cclxuICAgIGdldEdvb2RzTGlzdCgpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBnZXQoJy9nb29kcy9pbmRleCcsIHt9KS50aGVuKChyZXM6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9LFxyXG5cclxuICAgIC8qKuiOt+WPluWVhuWTgeivpuaDhVxyXG4gICAgICogQHBhcmFtIGdvb2RzSWQg5ZWG5ZOBaWRcclxuICAgICAqL1xyXG4gICAgZ2V0R29vZHNEZXRhaWxzKGdvb2RzSWQ6c3RyaW5nKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGdldCgnL2dvb2RzL2dldCcsIHsgZ29vZHNJZCB9KS50aGVuKChyZXM6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9LFxyXG5cclxuICAgIC8qKuiOt+WPluWPguS4juiusOW9lVxyXG4gICAgICogQHBhcmFtIHBhZ2UgW+mAieWhq10g6aG156CBMVxyXG4gICAgICogQHBhcmFtIHBhZ2VTaXplICBb6YCJ5aGrXSDliIbpobXmlbAg6buY6K6kMjBcclxuICAgICAqL1xyXG4gICAgZ2V0TXlPcmRlcnMocGFnZTpudW1iZXIgPSAxLHBhZ2VTaXplOm51bWJlciA9IDIwKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGdldCgnL29yZGVyL215T3JkZXJzJyx7cGFnZSxwYWdlU2l6ZX0pLnRoZW4oKHJlczphbnkpPT57XHJcbiAgICAgICAgICAgICAgICBpZiAoIXJlcy5jb2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXMpXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXMpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgIH0sXHJcbiAgICBcclxuICAgIC8qKuiOt+WPluW+gOacn+iusOW9lVxyXG4gICAgICogQHBhcmFtIHBhZ2UgW+mAieWhq10g6aG156CBMVxyXG4gICAgICogQHBhcmFtIHBhZ2VTaXplICBb6YCJ5aGrXSDliIbpobXmlbAg6buY6K6kMjBcclxuICAgICAqIEBwYXJhbSBjb3VudFRpbWUgW+mAieWhq10g5p+l6K+i5pe26Ze0XHJcbiAgICAgKiBAcGFyYW0gc2VhcmNoS2V5IFvpgInloatdIOafpeivouacn+WPt1xyXG4gICAgICovXHJcbiAgICBnZXRHb29kc0hpc3RvcnkocGFnZTpudW1iZXIgPSAxLHBhZ2VTaXplOm51bWJlciA9IDIwLGNvdW50VGltZT86c3RyaW5nLHNlYXJjaEtleT86c3RyaW5nKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGdldCgnL2dvb2RzL2hpc3RvcnknLHtwYWdlLHBhZ2VTaXplLGNvdW50VGltZSxzZWFyY2hLZXl9KS50aGVuKChyZXM6YW55KT0+e1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9LFxyXG5cclxuICAgIC8qKuiOt+WPluWVhuWTgeexu+WeiyAqL1xyXG4gICAgZ2V0R29vZHNDYXRlTGlzdCgpe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XHJcbiAgICAgICAgICAgIGdldCgnL2dvb2RzL2NhdGVMaXN0Jyx7fSkudGhlbigocmVzOmFueSk9PntcclxuICAgICAgICAgICAgICAgIGlmICghcmVzLmNvZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlcylcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlcylcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9KVxyXG4gICAgfSxcclxuXHJcbiAgICAvKirojrflj5botbDlir9cclxuICAgICAqIEBwYXJhbSBnb29kc1R5cGUg5ZWG5ZOB57G75Z6LXHJcbiAgICAgKiBAcGFyYW0gcGFnZSBb6YCJ5aGrXSDpobXnoIExXHJcbiAgICAgKiBAcGFyYW0gcGFnZVNpemUgW+mAieWhq10g5YiG6aG15pWwIOm7mOiupDIwXHJcbiAgICAgKi9cclxuICAgIGdldEdvb2RzVHJlbmQoZ29vZHNUeXBlOnN0cmluZyxwYWdlOm51bWJlciA9IDEscGFnZVNpemU6bnVtYmVyID0gMjApe1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XHJcbiAgICAgICAgICAgIGdldCgnL2dvb2RzL3RyZW5kJyx7Z29vZHNUeXBlLHBhZ2UscGFnZVNpemV9KS50aGVuKChyZXM6YW55KT0+e1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9LFxyXG5cclxuICAgIC8qKui0reS5sFxyXG4gICAgICogQHBhcmFtIHBlcmlvZCDmnJ/lj7dcclxuICAgICAqIEBwYXJhbSBjb2RlTGlzdCDmiYDpgInlj7fnoIFcclxuICAgICAqIEBwYXJhbSBleGNoYW5nZVB3ZCDkuqTmmJPlr4bnoIFcclxuICAgICAqL1xyXG4gICAgcG9zdFRyYWRlQnV5KHBlcmlvZDpzdHJpbmcsY29kZUxpc3Q6c3RyaW5nLGV4Y2hhbmdlUHdkOnN0cmluZyl7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBwb3N0KCcvdHJhZGUvYnV5JywgeyBwZXJpb2QsY29kZUxpc3QsZXhjaGFuZ2VQd2QgfSkudGhlbigocmVzOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICghcmVzLmNvZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmdldFVzZXJJbmZvKClcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlcylcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlcylcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9KVxyXG4gICAgfSxcclxufSIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0NTowNlxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0NTowNlxyXG4gKiBAZGVzYyBheGlvc+e9kee7nOivt+axguWwgeijhVxyXG4gKi9cclxuaW1wb3J0IGF4aW9zIGZyb20gXCJheGlvc1wiO1xyXG5cclxuYXhpb3MuZGVmYXVsdHMudGltZW91dCA9IDEwMDAwO1xyXG5heGlvcy5kZWZhdWx0cy5oZWFkZXJzLnBvc3RbJ0NvbnRlbnQtVHlwZSddID0gJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCc7XHJcbmF4aW9zLmRlZmF1bHRzLndpdGhDcmVkZW50aWFscyA9IHRydWU7ICAvL+ivt+axguaQuuW4pmNvb2tpZVxyXG4vLyBheGlvcy5kZWZhdWx0cy5jcm9zc0RvbWFpbiA9IHRydWU7ICAvL+ivt+axguaQuuW4pumineWkluaVsOaNrijkuI3ljIXlkKtjb29raWUpXHJcbmF4aW9zLmRlZmF1bHRzLmJhc2VVUkwgPSAnaHR0cHM6Ly90LWFwaS54eWhqLmlvL3YxL3cvemgvJ1xyXG5cclxuXHJcblxyXG5cclxuLyoq5bCGcG9zdOaVsOaNrui9rOS4umZvcm1EYXRh5qC85byPICovXHJcbmZ1bmN0aW9uIGZvcm1EYXRhRnVuYyhwYXJhbXM6T2JqZWN0KSB7XHJcbiAgY29uc3QgZm9ybSA9IG5ldyBGb3JtRGF0YSgpO1xyXG4gIGZvciAoY29uc3Qga2V5IGluIHBhcmFtcykge1xyXG4gICAgZm9ybS5hcHBlbmQoa2V5LHBhcmFtc1trZXldKTtcclxuICB9XHJcbiAgcmV0dXJuIGZvcm1cclxufVxyXG5cclxuLyoq5ri45oiP5bmz5Y+w5o6l5Y+jICovXHJcbmNvbnN0IGdhbWVDZW50ZXIgPSBbJy91c2VyL2xvZ2luJywnL3VzZXIvZ2V0SW5mbyddXHJcblxyXG4vL2h0dHAgcmVxdWVzdCDmi6bmiKrlmahcclxuYXhpb3MuaW50ZXJjZXB0b3JzLnJlcXVlc3QudXNlKFxyXG4gIGNvbmZpZyA9PiB7XHJcbiAgICAvL+iuvue9rkFIb3N0XHJcbiAgICBpZiAoY29uZmlnLnVybC5pbmRleE9mKCcvdXNlci8nKSA+PSAwICkge1xyXG4gICAgICBjb25maWcuaGVhZGVyc1snQUhvc3QnXSA9ICdnYW1lQ2VudGVyJ1xyXG4gICAgfWVsc2V7XHJcbiAgICAgIGNvbmZpZy5oZWFkZXJzWydBSG9zdCddID0gJ3N0YXJSb2NrZXQnO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChjb25maWcubWV0aG9kID09ICdwb3N0Jykge1xyXG4gICAgICBjb25maWcuZGF0YSA9IGZvcm1EYXRhRnVuYyh7XHJcbiAgICAgICAgLi4uY29uZmlnLmRhdGFcclxuICAgICAgfSlcclxuICAgIH1lbHNlIGlmKGNvbmZpZy5tZXRob2QgPT0gJ2dldCcpe1xyXG4gICAgICBjb25maWcucGFyYW1zID0ge1xyXG4gICAgICAgIC4uLmNvbmZpZy5wYXJhbXMsXHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBjb25maWc7XHJcbiAgfSxcclxuICBlcnJvciA9PiB7XHJcbiAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZXJyb3IpO1xyXG4gIH1cclxuKTtcclxuLy9odHRwIHJlc3BvbnNlIOaLpuaIquWZqFxyXG5heGlvcy5pbnRlcmNlcHRvcnMucmVzcG9uc2UudXNlKFxyXG4gIHJlc3BvbnNlID0+IHtcclxuICAgIGlmICghcmVzcG9uc2UuZGF0YS5zdWNjZXNzKSB7XHJcbiAgICAgIC8v6ZSZ6K+v5aSE55CGXHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmVzcG9uc2U7XHJcbiAgfSxcclxuICBlcnJvciA9PiB7XHJcbiAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZXJyb3IpO1xyXG4gIH1cclxuKTtcclxuXHJcbi8qKlxyXG4gKiDlsIHoo4VnZXTmlrnms5VcclxuICogQHBhcmFtIHVybFxyXG4gKiBAcGFyYW0gZGF0YVxyXG4gKiBAcmV0dXJucyB7UHJvbWlzZX1cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXQodXJsOnN0cmluZywgcGFyYW1zOk9iamVjdCkge1xyXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICBheGlvcy5nZXQodXJsLCB7IHBhcmFtcyB9KS50aGVuKHJlc3BvbnNlID0+IHtcclxuICAgICAgaWYgKCFyZXNwb25zZS5kYXRhLnN1Y2Nlc3MpIHtcclxuICAgICAgICByZXNvbHZlKHJlc3BvbnNlLmRhdGEuZXJyb3IpO1xyXG4gICAgICB9ZWxzZSB7XHJcbiAgICAgICAgcmVzb2x2ZShyZXNwb25zZS5kYXRhLnBheWxvYWQpO1xyXG4gICAgICB9XHJcbiAgICB9KS5jYXRjaChlcnIgPT4ge1xyXG4gICAgICByZWplY3QoZXJyKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG59XHJcblxyXG4vKipcclxuICog5bCB6KOFcG9zdOivt+axglxyXG4gKiBAcGFyYW0gdXJsXHJcbiAqIEBwYXJhbSBkYXRhXHJcbiAqIEByZXR1cm5zIHtQcm9taXNlfVxyXG4gKi9cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBwb3N0KHVybDpzdHJpbmcsIGRhdGE6T2JqZWN0KSB7XHJcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgIGF4aW9zLnBvc3QodXJsLCBkYXRhKS50aGVuKFxyXG4gICAgICByZXNwb25zZSA9PiB7XHJcbiAgICAgICAgaWYgKCFyZXNwb25zZS5kYXRhLnN1Y2Nlc3MpIHtcclxuICAgICAgICAgIHJlc29sdmUocmVzcG9uc2UuZGF0YS5lcnJvcik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHJlc29sdmUocmVzcG9uc2UuZGF0YS5wYXlsb2FkKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIGVyciA9PiB7XHJcbiAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgIH1cclxuICAgICk7XHJcbiAgfSk7XHJcbn1cclxuIiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ1OjI4XHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ1OjI4XHJcbiAqIEBkZXNjIOW3peWFt+WHveaVsOmbhuWQiFxyXG4gKi9cclxuZXhwb3J0IGRlZmF1bHQge1xyXG5cclxuICAgIC8qKlxyXG4gICAgICog5Y2D5YiG5L2N5qC85byP5YyWXHJcbiAgICAgKiBAcGFyYW0ge251bWJlciB8IHN0cmluZ30gbnVtIOagvOW8j+WMluaVsOWtl1xyXG4gICAgICovXHJcbiAgICBjb21kaWZ5KG51bTogYW55KSB7XHJcbiAgICAgICAgcmV0dXJuIG51bS50b1N0cmluZygpLnJlcGxhY2UoL1xcZCsvLCBmdW5jdGlvbiAobikgeyAvLyDlhYjmj5Dlj5bmlbTmlbDpg6jliIZcclxuICAgICAgICAgICAgcmV0dXJuIG4ucmVwbGFjZSgvKFxcZCkoPz0oXFxkezN9KSskKS9nLCBmdW5jdGlvbiAoJDEpIHsgLy8g5a+55pW05pWw6YOo5YiG5re75Yqg5YiG6ZqU56ymXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJDEgKyBcIixcIjtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5aSN5Yi2XHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29weUluZm8g5aSN5Yi25YaF5a65XHJcbiAgICAgKi9cclxuICAgIENvcHkoY29weUluZm86IGFueSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBjb3B5VXJsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlucHV0XCIpOyAvL+WIm+W7uuS4gOS4qmlucHV05qGG6I635Y+W6ZyA6KaB5aSN5Yi255qE5paH5pys5YaF5a65XHJcbiAgICAgICAgICAgIGNvcHlVcmwudmFsdWUgPSBjb3B5SW5mbztcclxuICAgICAgICAgICAgbGV0IGFwcERpdiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhcHAnKTtcclxuICAgICAgICAgICAgYXBwRGl2LmFwcGVuZENoaWxkKGNvcHlVcmwpO1xyXG4gICAgICAgICAgICBjb3B5VXJsLnNlbGVjdCgpO1xyXG4gICAgICAgICAgICBkb2N1bWVudC5leGVjQ29tbWFuZChcIkNvcHlcIik7XHJcbiAgICAgICAgICAgIGNvcHlVcmwucmVtb3ZlKClcclxuICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcclxuICAgICAgICB9KVxyXG4gICAgfSxcclxuXHJcbiAgICAvKiog5Yik5pat5piv5ZCm5Li65omL5py6Ki9cclxuICAgIGlzUGhvbmUobnVtOiBhbnkpIHtcclxuICAgICAgICB2YXIgcmVnID0gL14xWzM0NTY3ODldXFxkezl9JC87XHJcbiAgICAgICAgcmV0dXJuIHJlZy50ZXN0KG51bSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5YCS6K6h5pe2XHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZyB8IG51bWJlcn0gdGltZXMg5Ymp5L2Z5q+r56eS5pWwIFxyXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sg5Zue6LCD5Ye95pWwXHJcbiAgICAgKi9cclxuICAgIGNvdW50RG93bih0aW1lczogYW55LCBjYWxsYmFjazogYW55KSB7XHJcbiAgICAgICAgbGV0IHRpbWVyID0gbnVsbDtcclxuICAgICAgICB0aW1lciA9IHNldEludGVydmFsKCgpID0+IHtcclxuICAgICAgICAgICAgaWYgKHRpbWVzID4gMCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGRheTogYW55ID0gTWF0aC5mbG9vcih0aW1lcyAvICg2MCAqIDYwICogMjQpKTtcclxuICAgICAgICAgICAgICAgIGxldCBob3VyOiBhbnkgPSBNYXRoLmZsb29yKHRpbWVzIC8gKDYwICogNjApKSAtIChkYXkgKiAyNCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgbWludXRlOiBhbnkgPSBNYXRoLmZsb29yKHRpbWVzIC8gNjApIC0gKGRheSAqIDI0ICogNjApIC0gKGhvdXIgKiA2MCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2Vjb25kOiBhbnkgPSBNYXRoLmZsb29yKHRpbWVzKSAtIChkYXkgKiAyNCAqIDYwICogNjApIC0gKGhvdXIgKiA2MCAqIDYwKSAtIChtaW51dGUgKiA2MCk7XHJcbiAgICAgICAgICAgICAgICBkYXkgPSBgJHtkYXkgPCAxMCA/ICcwJyA6ICcnfSR7ZGF5fWA7XHJcbiAgICAgICAgICAgICAgICBob3VyID0gYCR7aG91ciA8IDEwID8gJzAnIDogJyd9JHtob3VyfWA7XHJcbiAgICAgICAgICAgICAgICBtaW51dGUgPSBgJHttaW51dGUgPCAxMCA/ICcwJyA6ICcnfSR7bWludXRlfWA7XHJcbiAgICAgICAgICAgICAgICBzZWNvbmQgPSBgJHtzZWNvbmQgPCAxMCA/ICcwJyA6ICcnfSR7c2Vjb25kfWA7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhgJHtob3VyfToke21pbnV0ZX06JHtzZWNvbmR9YClcclxuICAgICAgICAgICAgICAgIHRpbWVzLS07XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHRpbWVyKTtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSwgMTAwMCk7XHJcbiAgICAgICAgaWYgKHRpbWVzIDw9IDApIHtcclxuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aW1lcik7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKVxyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiDlsIbmoLzlvI/ljJbml6XmnJ/ovazmjaLmiJDml7bpl7TmiLNcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBteURhdGUg5qC85byP5YyW5pel5pyfXHJcbiAgICAgKi9cclxuICAgIGZvcm1hdERhdGUoeDogYW55LCB5OiBhbnkpIHtcclxuICAgICAgICBpZiAoISh4IGluc3RhbmNlb2YgRGF0ZSkpIHtcclxuICAgICAgICAgICAgdmFyIGRhdGUgPSBuZXcgRGF0ZSgpO1xyXG4gICAgICAgICAgICBkYXRlLnNldFRpbWUoeCAqIDEwMDApO1xyXG4gICAgICAgICAgICB4ID0gZGF0ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHogPSB7XHJcbiAgICAgICAgICAgIHk6IHguZ2V0RnVsbFllYXIoKSxcclxuICAgICAgICAgICAgTTogeC5nZXRNb250aCgpICsgMSxcclxuICAgICAgICAgICAgZDogeC5nZXREYXRlKCksXHJcbiAgICAgICAgICAgIGg6IHguZ2V0SG91cnMoKSxcclxuICAgICAgICAgICAgbTogeC5nZXRNaW51dGVzKCksXHJcbiAgICAgICAgICAgIHM6IHguZ2V0U2Vjb25kcygpXHJcbiAgICAgICAgfTtcclxuICAgICAgICByZXR1cm4geS5yZXBsYWNlKC8oeSt8TSt8ZCt8aCt8bSt8cyspL2csIGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgICAgICAgIHJldHVybiAoKHYubGVuZ3RoID4gMSA/IFwiMFwiIDogXCJcIikgKyBldmFsKFwiei5cIiArIHYuc2xpY2UoLTEpKSkuc2xpY2UoXHJcbiAgICAgICAgICAgICAgICAtKHYubGVuZ3RoID4gMiA/IHYubGVuZ3RoIDogMilcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9KTtcclxuICAgIH0sXHJcbiAgICAvKipcclxuICAgKiDlsIbml7bpl7TmiLPovazmjaLmiJDmoLzlvI/ljJbml6XmnJ9cclxuICAgKiBAcGFyYW0ge3N0cmluZ30gdGltZVN0YW1wIOaXtumXtOaIs1xyXG4gICAqL1xyXG4gICAgZm9ybWF0RGF0ZVRpbWUodGltZVN0YW1wKSB7XHJcbiAgICAgICAgdmFyIGRhdGUgPSBuZXcgRGF0ZSgpO1xyXG4gICAgICAgIGRhdGUuc2V0VGltZSh0aW1lU3RhbXAgKiAxMDAwKTtcclxuICAgICAgICB2YXIgeSA9IGRhdGUuZ2V0RnVsbFllYXIoKTtcclxuICAgICAgICB2YXIgbTpzdHJpbmcgfCBudW1iZXIgPSBkYXRlLmdldE1vbnRoKCkgKyAxO1xyXG4gICAgICAgIG0gPSBtIDwgMTAgPyAoJzAnICsgbSkgOiBtO1xyXG4gICAgICAgIHZhciBkOnN0cmluZyB8IG51bWJlciA9IGRhdGUuZ2V0RGF0ZSgpO1xyXG4gICAgICAgIGQgPSBkIDwgMTAgPyAoJzAnICsgZCkgOiBkO1xyXG4gICAgICAgIHZhciBoOnN0cmluZyB8IG51bWJlciA9IGRhdGUuZ2V0SG91cnMoKTtcclxuICAgICAgICBoID0gaCA8IDEwID8gKCcwJyArIGgpIDogaDtcclxuICAgICAgICB2YXIgbWludXRlOnN0cmluZyB8IG51bWJlciA9IGRhdGUuZ2V0TWludXRlcygpO1xyXG4gICAgICAgIHZhciBzZWNvbmQ6c3RyaW5nIHwgbnVtYmVyID0gZGF0ZS5nZXRTZWNvbmRzKCk7XHJcbiAgICAgICAgbWludXRlID0gbWludXRlIDwgMTAgPyAoJzAnICsgbWludXRlKSA6IG1pbnV0ZTtcclxuICAgICAgICBzZWNvbmQgPSBzZWNvbmQgPCAxMCA/ICgnMCcgKyBzZWNvbmQpIDogc2Vjb25kO1xyXG4gICAgICAgIHJldHVybiB5ICsgJy0nICsgbSArICctJyArIGQgKyAnICcgKyBoICsgJzonICsgbWludXRlICsgJzonICsgc2Vjb25kO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIOS/neeVmW7kvY3lsI/mlbAgIFxyXG4gICAgICogQHBhcmFtIHtzdHJpbmcgfCBudW1iZXJ9IGNudW0g6ZyA6KaB5L+d55WZ55qE5pWw5o2uXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY2luZGV4IOS/neeVmeeahOWwj+aVsOS9jeaVsFxyXG4gICAgICovXHJcbiAgICB0b0RlY2ltYWwoY251bTogYW55LCBjaW5kZXg6IGFueSkge1xyXG4gICAgICAgIGxldCB2YWx1ZSA9IFN0cmluZyhjbnVtKTtcclxuICAgICAgICBpZiAodmFsdWUuaW5kZXhPZihcIi5cIikgPiAwKSB7XHJcbiAgICAgICAgICAgIHZhciBsZWZ0ID0gdmFsdWUuc3Vic3RyKDAsIHZhbHVlLmluZGV4T2YoXCIuXCIpKTtcclxuICAgICAgICAgICAgdmFyIHJpZ2h0ID0gdmFsdWUuc3Vic3RyKHZhbHVlLmluZGV4T2YoXCIuXCIpICsgMSwgdmFsdWUubGVuZ3RoKTtcclxuICAgICAgICAgICAgaWYgKHJpZ2h0Lmxlbmd0aCA+IGNpbmRleCkge1xyXG4gICAgICAgICAgICAgICAgcmlnaHQgPSByaWdodC5zdWJzdHIoMCwgY2luZGV4KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2YWx1ZSA9IGxlZnQgKyBcIi5cIiArIHJpZ2h0O1xyXG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIGNudW07XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICAvKirliqDms5Xov5DnrpcgKi9cclxuICAgIGFjY0FkZChhcmcxLGFyZzIpe1xyXG4gICAgICAgIGxldCByMSxyMixtO1xyXG4gICAgICAgIHRyeXtyMT1hcmcxLnRvU3RyaW5nKCkuc3BsaXQoXCIuXCIpWzFdLmxlbmd0aH1jYXRjaChlKXtyMT0wfVxyXG4gICAgICAgIHRyeXtyMj1hcmcyLnRvU3RyaW5nKCkuc3BsaXQoXCIuXCIpWzFdLmxlbmd0aH1jYXRjaChlKXtyMj0wfVxyXG4gICAgICAgIG09TWF0aC5wb3coMTAsTWF0aC5tYXgocjEscjIpKVxyXG4gICAgICAgIHJldHVybiAoYXJnMSptK2FyZzIqbSkvbVxyXG4gICAgfSxcclxuICAgIC8qKuWHj+azlei/kOeulyAqL1xyXG4gICAgYWNjU3ViKGFyZzEsYXJnMil7XHJcbiAgICAgICAgbGV0IHIxLHIyLG0sbjtcclxuICAgICAgICB0cnl7cjE9YXJnMS50b1N0cmluZygpLnNwbGl0KFwiLlwiKVsxXS5sZW5ndGh9Y2F0Y2goZSl7cjE9MH1cclxuICAgICAgICB0cnl7cjI9YXJnMi50b1N0cmluZygpLnNwbGl0KFwiLlwiKVsxXS5sZW5ndGh9Y2F0Y2goZSl7cjI9MH1cclxuICAgICAgICBtPU1hdGgucG93KDEwLE1hdGgubWF4KHIxLHIyKSk7XHJcbiAgICAgICAgbj0ocjE+PXIyKT9yMTpyMjtcclxuICAgICAgICByZXR1cm4gKChhcmcxKm0tYXJnMiptKS9tKS50b0ZpeGVkKG4pO1xyXG4gICAgfSxcclxuICAgIC8qKumZpOazlei/kOeulyAqL1xyXG4gICAgYWNjRGl2KGFyZzEsYXJnMil7XHJcbiAgICAgICAgbGV0IHQxPTAsdDI9MCxyMSxyMjtcclxuICAgICAgICB0cnl7dDE9YXJnMS50b1N0cmluZygpLnNwbGl0KFwiLlwiKVsxXS5sZW5ndGh9Y2F0Y2goZSl7fTtcclxuICAgICAgICB0cnl7dDI9YXJnMi50b1N0cmluZygpLnNwbGl0KFwiLlwiKVsxXS5sZW5ndGh9Y2F0Y2goZSl7fTtcclxuICAgICAgICByMT1OdW1iZXIoYXJnMS50b1N0cmluZygpLnJlcGxhY2UoXCIuXCIsXCJcIikpXHJcbiAgICAgICAgcjI9TnVtYmVyKGFyZzIudG9TdHJpbmcoKS5yZXBsYWNlKFwiLlwiLFwiXCIpKVxyXG4gICAgICAgIHJldHVybiAocjEvcjIpKk1hdGgucG93KDEwLHQyLXQxKTtcclxuICAgIH0sXHJcbiAgICAvKirkuZjms5Xov5DnrpcgKi9cclxuICAgIGFjY011bChhcmcxLGFyZzIpe1xyXG4gICAgICAgIGxldCBtPTAsczE9YXJnMS50b1N0cmluZygpLHMyPWFyZzIudG9TdHJpbmcoKTtcclxuICAgICAgICB0cnl7bSs9czEuc3BsaXQoXCIuXCIpWzFdLmxlbmd0aH1jYXRjaChlKXt9XHJcbiAgICAgICAgdHJ5e20rPXMyLnNwbGl0KFwiLlwiKVsxXS5sZW5ndGh9Y2F0Y2goZSl7fVxyXG4gICAgICAgIHJldHVybiBOdW1iZXIoczEucmVwbGFjZShcIi5cIixcIlwiKSkqTnVtYmVyKHMyLnJlcGxhY2UoXCIuXCIsXCJcIikpL01hdGgucG93KDEwLG0pXHJcbiAgICB9LFxyXG59XHJcbiIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0NTo0NlxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0NTo0NlxyXG4gKiBAZGVzYyDpobXpnaLot7PovazohJrmnKzvvIznlKjkuo7nvJbovpHmqKHlvI/mj5LlhaVcclxuICovXHJcbmltcG9ydCB7IFRhYmJhciB9IGZyb20gXCIuLi92aWV3L1RhYmJhclwiO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGFnZU5hdlNjcmlwdCBleHRlbmRzIExheWEuU2NyaXB0IHtcclxuICAgIC8qKiBAcHJvcCB7bmFtZTpuYXZQYWdlU2NyaXB0LHRpcHM6J+imgei3s+i9rOeahHNjZW5lJyx0eXBlOlN0cmluZyxkZWZhdWx0OicnfSAqL1xyXG4gICAgcHVibGljIG5hdlBhZ2VTY3JpcHQ6c3RyaW5nID0gJyc7XHJcblxyXG4gICAgY29uc3RydWN0b3IoKXtzdXBlcigpfVxyXG5cclxuICAgIG9uQ2xpY2soKTp2b2lkIHtcclxuICAgICAgICBUYWJiYXIuZ2V0SW5zdGFuY2UoKS5vcGVuU2NlbmUodGhpcy5uYXZQYWdlU2NyaXB0KVxyXG4gICAgfVxyXG59IiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ2OjA4XHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ2OjA4XHJcbiAqIEBkZXNjIOmhtemdoui3s+i9rOexu++8jOWcqOS7o+eggeS4reS9v+eUqFxyXG4gKi9cclxuaW1wb3J0IHsgVGFiYmFyIH0gZnJvbSAnLi4vdmlldy9UYWJiYXInXHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQYWdlU2NyaXB0IGV4dGVuZHMgTGF5YS5TY3JpcHQge1xyXG4gICAgLyoqIEBwcm9wIHtuYW1lOnNob3dUYWIsdGlwczon5piv5ZCm5pyJVGFiYmFyJyx0eXBlOkJvb2wsZGVmYXVsdDp0cnVlfSAqL1xyXG4gICAgcHVibGljIHNob3dUYWI6Ym9vbGVhbiA9IHRydWU7XHJcblxyXG4gICAgY29uc3RydWN0b3IoKXtzdXBlcigpO31cclxuXHJcbiAgICBvbkVuYWJsZSgpOnZvaWQge1xyXG4gICAgICAgIGlmICh0aGlzLnNob3dUYWIpIHtcclxuICAgICAgICAgICAgVGFiYmFyLnNob3coKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBvbkRpc2FibGUoKTp2b2lkIHtcclxuICAgICAgICBUYWJiYXIuaGlkZSgpXHJcbiAgICB9XHJcbn0iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDY6MzBcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDY6MzBcclxuICogQGRlc2Mg5bGP5bmV6Ieq6YCC5bqU6ISa5pysXHJcbiAqL1xyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTY3JlZW4gZXh0ZW5kcyBMYXlhLlNjcmlwdCB7XHJcbiAgICAvKiogQHByb3Age25hbWU6YmdDb2xvcix0aXBzOifog4zmma/popzoibInLCd0eXBlOlN0cmluZyxkZWZhdWx0OicjMGEwNzM4J30gKi9cclxuICAgIHB1YmxpYyBiZ0NvbG9yOnN0cmluZyA9ICcjMGEwNzM4J1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCl7c3VwZXIoKTt9XHJcblxyXG4gICAgb25FbmFibGUoKTp2b2lkIHtcclxuICAgICAgIExheWEuc3RhZ2Uub24oTGF5YS5FdmVudC5SRVNJWkUsdGhpcyx0aGlzLm9uUmVzaXplKVxyXG4gICAgICAgdGhpcy5vblJlc2l6ZSgpXHJcbiAgICB9XHJcblxyXG4gICAgb25EaXNhYmxlKCk6dm9pZCB7XHJcbiAgICAgICAgTGF5YS5zdGFnZS5vZmYoTGF5YS5FdmVudC5SRVNJWkUsdGhpcyx0aGlzLm9uUmVzaXplKVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25SZXNpemUoKTp2b2lkIHtcclxuICAgICAgICBjb25zdCBfdGhhdCA9ICh0aGlzLm93bmVyIGFzIExheWEuU3ByaXRlKTtcclxuICAgICAgICBfdGhhdC53aWR0aCA9IExheWEuc3RhZ2Uud2lkdGg7XHJcbiAgICAgICAgX3RoYXQuaGVpZ2h0ID0gTGF5YS5zdGFnZS5oZWlnaHQ7XHJcbiAgICAgICAgX3RoYXQuZ3JhcGhpY3MuZHJhd1JlY3QoMCwwLExheWEuc3RhZ2Uud2lkdGgsTGF5YS5zdGFnZS5oZWlnaHQsdGhpcy5iZ0NvbG9yKTtcclxuICAgICAgIFxyXG4gICAgfVxyXG59IiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTIxIDE2OjM0OjIxXHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTIxIDE2OjM0OjIxXHJcbiAqIEBkZXNjIOWKqeaJi+mhtemdouiEmuacrFxyXG4gKi9cclxuXHJcbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xyXG5pbXBvcnQgYXBpIGZyb20gXCIuLi9qcy9hcGlcIjtcclxuaW1wb3J0IHsgVG9hc3QgfSBmcm9tIFwiLi4vdmlldy9Ub2FzdFwiO1xyXG5cclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFzc2lzdGFudCBleHRlbmRzIHVpLmFzc2lzdGFudFVJIHtcclxuICAgIHByaXZhdGUgY2F0ZUxpc3RBcnI6YW55ID0gW107XHJcbiAgICBwcml2YXRlIHNlbGVjdEdvb2RzVHlwZTpzdHJpbmcgPSAnJztcclxuICAgIHByaXZhdGUgdGFiVHlwZTpudW1iZXIgPSAxO1xyXG4gICAgY29uc3RydWN0b3IoKXtcclxuICAgICAgICBzdXBlcigpXHJcbiAgICAgICAgdGhpcy5idG5fdHJlbmQub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMudGFiU3dpdGNoLFsxXSlcclxuICAgICAgICB0aGlzLmJ0bl9wcmVidXkub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMudGFiU3dpdGNoLFsyXSlcclxuICAgICAgICB0aGlzLm9uKExheWEuRXZlbnQuUkVTSVpFLHRoaXMsdGhpcy5vblJlc2l6ZSlcclxuICAgIH1cclxuXHJcbiAgICBvbkVuYWJsZSgpOnZvaWR7ICBcclxuICAgICAgICB0aGlzLmdldEdvb2RzQ2F0ZUxpc3QoKVxyXG4gICAgICAgIHRoaXMuY2F0ZVN3aXRjaCgpXHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qKuiOt+WPluWVhuWTgeexu+WeiyAqL1xyXG4gICAgcHJpdmF0ZSBnZXRHb29kc0NhdGVMaXN0KCl7XHJcbiAgICAgICAgYXBpLmdldEdvb2RzQ2F0ZUxpc3QoKS50aGVuKChyZXM6YW55KT0+e1xyXG4gICAgICAgICAgICB0aGlzLmNhdGVMaXN0QXJyID0gcmVzO1xyXG4gICAgICAgICAgICBjb25zdCBHb29kc05hbWVBcnI6c3RyaW5nW10gPSBbXTtcclxuICAgICAgICAgICAgcmVzLmZvckVhY2goKGl0ZW06YW55KT0+e1xyXG4gICAgICAgICAgICAgICAgR29vZHNOYW1lQXJyLnB1c2goaXRlbS5nb29kc05hbWUpXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIHRoaXMuY2F0ZVRhYkxpc3QuYXJyYXkgPSBHb29kc05hbWVBcnI7XHJcbiAgICAgICAgICAgIHRoaXMuY2F0ZVRhYkxpc3QucmVwZWF0WCA9IEdvb2RzTmFtZUFyci5sZW5ndGg7XHJcbiAgICAgICAgICAgIHRoaXMuY2F0ZVRhYkxpc3Quc2VsZWN0ZWRJbmRleCA9IDA7XHJcbiAgICAgICAgfSkuY2F0Y2goKGVycjphbnkpPT57XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyci5tZXNzYWdlKTtcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICAvKirojrflj5botbDlir/liJfooaggKi9cclxuICAgIHByaXZhdGUgZ2V0R29vZHNUcmVuZChnb29kc1R5cGU6c3RyaW5nKXtcclxuICAgICAgICBhcGkuZ2V0R29vZHNUcmVuZChnb29kc1R5cGUpLnRoZW4oKHJlczphbnkpPT57XHJcbiAgICAgICAgICAgIHRoaXMudHJlbmRMaXN0LmFycmF5ID0gcmVzO1xyXG4gICAgICAgICAgICB0aGlzLnRyZW5kTGlzdC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICB9KS5jYXRjaCgoZXJyOmFueSk9PntcclxuICAgICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyci5tZXNzYWdlKTtcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5YiH5o2i5YiX6KGoXHJcbiAgICAgKiBAcGFyYW0gdHlwZSAxOui1sOWKv+WIhuaekCAgMu+8mumihOi0rVxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIHRhYlN3aXRjaCh0eXBlOm51bWJlcil7XHJcbiAgICAgICAgaWYgKHR5cGUgPT09IDIpIHtcclxuICAgICAgICAgICAgVG9hc3Quc2hvdygn5pqC5pyq5byA5pS+77yM5pWs6K+35pyf5b6F5pqC5pyq5byA5pS+77yM5pWs6K+35pyf5b6F5pqC5pyq5byA5pS+77yM5pWs6K+35pyf5b6F5pqC5pyq5byA5pS+77yM5pWs6K+35pyf5b6FJylcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gdGhpcy50YWJUeXBlID0gdHlwZTtcclxuICAgICAgICAvLyB0aGlzLmNhdGVUYWJMaXN0LnNlbGVjdGVkSW5kZXggPSAwO1xyXG4gICAgICAgIC8vIGlmICh0aGlzLnRhYlR5cGUgPT09IDEpIHtcclxuICAgICAgICAvLyAgICAgdGhpcy5idG5fdHJlbmQuc2tpbiA9ICdjb21wL2d1ZXNzaW5nL2ltZ190YWJfYWN0aXZlLnBuZyc7XHJcbiAgICAgICAgLy8gICAgIHRoaXMuYnRuX3ByZWJ1eS5za2luID0gJ2NvbXAvZ3Vlc3NpbmcvaW1nX3RhYi5wbmcnO1xyXG4gICAgICAgIC8vICAgICB0aGlzLmxpc3RUaXRsZS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAvLyAgICAgaWYgKHRoaXMudHJlbmRMaXN0LmFycmF5ID09PSBudWxsIHx8IHRoaXMudHJlbmRMaXN0LmFycmF5Lmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIC8vICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgLy8gICAgIH1lbHNlIHtcclxuICAgICAgICAvLyAgICAgICAgIHRoaXMubm9EYXRhLnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICAvLyAgICAgICAgIHRoaXMudHJlbmRMaXN0LnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgIC8vICAgICB9XHJcbiAgICAgICAgLy8gICAgIHRoaXMucHJlYnV5LnNjcm9sbFRvKDApXHJcbiAgICAgICAgLy8gICAgIHRoaXMucHJlYnV5LnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICAvLyB9ZWxzZXtcclxuICAgICAgICAvLyAgICAgdGhpcy5idG5fcHJlYnV5LnNraW4gPSAnY29tcC9ndWVzc2luZy9pbWdfdGFiX2FjdGl2ZS5wbmcnO1xyXG4gICAgICAgIC8vICAgICB0aGlzLmJ0bl90cmVuZC5za2luID0gJ2NvbXAvZ3Vlc3NpbmcvaW1nX3RhYi5wbmcnO1xyXG4gICAgICAgIC8vICAgICB0aGlzLmxpc3RUaXRsZS52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgLy8gICAgIGlmICh0aGlzLnByZWJ1eS5hcnJheSA9PT0gbnVsbCB8fCB0aGlzLnByZWJ1eS5hcnJheS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAvLyAgICAgICAgIHRoaXMubm9EYXRhLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgIC8vICAgICB9ZWxzZSB7XHJcbiAgICAgICAgLy8gICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgLy8gICAgICAgICB0aGlzLnByZWJ1eS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAvLyAgICAgfVxyXG4gICAgICAgIC8vICAgICB0aGlzLnRyZW5kTGlzdC5zY3JvbGxUbygwKTtcclxuICAgICAgICAvLyAgICAgdGhpcy50cmVuZExpc3QudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICAgIC8vIH1cclxuICAgIH1cclxuXHJcbiAgICAvKirllYblk4HnsbvlnovliIfmjaIgKi9cclxuICAgIHByaXZhdGUgY2F0ZVN3aXRjaCgpe1xyXG4gICAgICAgIHRoaXMuY2F0ZVRhYkxpc3Quc2VsZWN0SGFuZGxlciA9IG5ldyBMYXlhLkhhbmRsZXIodGhpcywgKHNlbGVjdGVkSW5kZXg6IGFueSk9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0R29vZHNUeXBlID0gdGhpcy5jYXRlTGlzdEFycltzZWxlY3RlZEluZGV4XS5nb29kc1R5cGU7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnRhYlR5cGUgPT09IDEpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZ2V0R29vZHNUcmVuZCh0aGlzLnNlbGVjdEdvb2RzVHlwZSlcclxuICAgICAgICAgICAgfWVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+aaguacquW8gOaUvicsdGhpcy5zZWxlY3RHb29kc1R5cGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8v5pS55Y+YdGFi6YCJ5Lit54q25oCBXHJcbiAgICAgICAgICAgIGxldCBpOiBudW1iZXIgPSB0aGlzLmNhdGVUYWJMaXN0LnN0YXJ0SW5kZXg7XHJcbiAgICAgICAgICAgIHRoaXMuY2F0ZVRhYkxpc3QuY2VsbHMuZm9yRWFjaCgoY2VsbDogTGF5YS5CdXR0b24pID0+IHtcclxuICAgICAgICAgICAgICAgIGNlbGwuc2VsZWN0ZWQgPSBpID09PSBzZWxlY3RlZEluZGV4O1xyXG4gICAgICAgICAgICAgICAgaSsrO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgLyoq55uR6KeG5bGP5bmV5aSn5bCP5Y+Y5YyWICovXHJcbiAgICBvblJlc2l6ZSgpe1xyXG4gICAgICAgIC8v5YiX6KGo6auY5bqm6YCC6YWNID0g5bGP5bmV6auY5bqmIC0gKGJhbm5lciArIHRhYmJhcilcclxuICAgICAgICB0aGlzLnRyZW5kTGlzdC5oZWlnaHQgPSB0aGlzLmhlaWdodCAtIDYwMDtcclxuICAgICAgICBjb25zdCB0cmVuZE51bWJlciA9IHRoaXMudHJlbmRMaXN0LmhlaWdodCAvIDEwMDtcclxuICAgICAgICB0aGlzLnRyZW5kTGlzdC5yZXBlYXRZID0gTWF0aC5jZWlsKHRyZW5kTnVtYmVyKVxyXG4gICAgICAgIHRoaXMucHJlYnV5LmhlaWdodCA9IHRoaXMuaGVpZ2h0IC0gNjAwO1xyXG4gICAgICAgIGNvbnN0IHByZWJ1eU51bWJlciA9IHRoaXMucHJlYnV5LmhlaWdodCAvIDEwMDtcclxuICAgICAgICB0aGlzLnRyZW5kTGlzdC5yZXBlYXRZID0gTWF0aC5jZWlsKHByZWJ1eU51bWJlcilcclxuICAgIH1cclxuICAgXHJcbn0iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDc6MTFcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDc6MTFcclxuICogQGRlc2Mg6aaW6aG15ZWG5ZOB5Y2h6ISa5pysXHJcbiAqL1xyXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcclxuaW1wb3J0IHsgVGFiYmFyIH0gZnJvbSBcIi4uL3ZpZXcvVGFiYmFyXCI7XHJcblxyXG5pbXBvcnQgdXRpbHMgZnJvbSAnLi4vanMvdXRpbHMnXHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDYXJkIGV4dGVuZHMgdWkuQ2FyZFVJIHtcclxuICAgIGNvbnN0cnVjdG9yKCl7XHJcbiAgICAgICAgc3VwZXIoKVxyXG4gICAgICAgIHRoaXMub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuY2xpY2tJdGVtKVxyXG4gICAgfVxyXG4gICAgc2V0IGRhdGFTb3VyY2UoaXRlbTogYW55KSB7XHJcbiAgICAgICAgdGhpcy5fZGF0YVNvdXJjZSA9IGl0ZW07XHJcbiAgICAgICAgaWYgKGl0ZW0pIHtcclxuICAgICAgICAgICAgLy/ph5HluIHlm77niYcsICAxLTQwMOmHkeW4geWbvuaghzI7ICAgNTAxLTEwMDDph5HluIHlm77moIc0OyAgMTAwMeS7peS4iumHkeW4geWbvuaghzIwXHJcbiAgICAgICAgICAgIGlmICgraXRlbS5nb29kc1ZhbHVlIDw9IDQwMCApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2FyZEl0ZW0uc2tpbiA9IGBjb21wL2hvbWUvaW1nX2ppbmJpXzIucG5nYFxyXG4gICAgICAgICAgICB9ZWxzZSBpZigraXRlbS5nb29kc1ZhbHVlIDw9IDEwMDApe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jYXJkSXRlbS5za2luID0gYGNvbXAvaG9tZS9pbWdfamluYmlfNC5wbmdgXHJcbiAgICAgICAgICAgIH1lbHNlIGlmKCtpdGVtLmdvb2RzVmFsdWUgPj0gMTAwMSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jYXJkSXRlbS5za2luID0gYGNvbXAvaG9tZS9pbWdfamluYmlfMjAucG5nYFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuc2NlbmVJbWcuc2tpbiA9IGBjb21wL2hvbWUvaW1nX3NjZW5lXyR7aXRlbS50b3RhbE51bX0ucG5nYFxyXG4gICAgICAgICAgICB0aGlzLmdvb2RzTmFtZS50ZXh0ID0gYCR7K2l0ZW0uZ29vZHNWYWx1ZX0gVVNEVGBcclxuICAgICAgICAgICAgdGhpcy5hd2FyZC50ZXh0ID0gYCR7dXRpbHMudG9EZWNpbWFsKGl0ZW0uYXdhcmQsMil9ICBVU0RUYFxyXG4gICAgICAgICAgICB0aGlzLnNvbGROdW1fdG90YWxOdW0udGV4dCA9IGAke2l0ZW0uc29sZE51bX0vJHtpdGVtLnRvdGFsTnVtfWBcclxuICAgICAgICAgICAgdGhpcy5wcm9ncmVzcy52YWx1ZSA9ICtgJHtpdGVtLnNvbGROdW0vaXRlbS50b3RhbE51bX1gXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY2xpY2tJdGVtKCk6dm9pZCB7XHJcbiAgICAgICAgVGFiYmFyLmdldEluc3RhbmNlKCkub3BlblNjZW5lKCdndWVzc2luZy5zY2VuZScsdGhpcy5fZGF0YVNvdXJjZS5nb29kc0lkKVxyXG4gICAgfVxyXG59IiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ3OjU4XHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ3OjU4XHJcbiAqIEBkZXNjIOi0reS5sOmhtemdouiEmuacrFxyXG4gKi9cclxuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XHJcbmltcG9ydCB7IFRvYXN0IH0gZnJvbSBcIi4uL3ZpZXcvVG9hc3RcIjtcclxuaW1wb3J0IHV0aWxzIGZyb20gJy4uL2pzL3V0aWxzJ1xyXG5pbXBvcnQgSXB0UHN3RG9tIGZyb20gXCIuLi90ZW1wbGF0ZS9wc3dJbnB1dFwiO1xyXG5pbXBvcnQgeyBHYW1lTW9kZWwgfSBmcm9tIFwiLi4vanMvR2FtZU1vZGVsXCI7XHJcbmltcG9ydCBhcGkgZnJvbSBcIi4uL2pzL2FwaVwiO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgR3Vlc3NpbmcgZXh0ZW5kcyB1aS5ndWVzc2luZ1VJIHtcclxuXHJcbiAgICBwcml2YXRlIGdvb2RzSWQ6c3RyaW5nID0gJyc7Ly/llYblk4FJRFxyXG4gICAgcHJpdmF0ZSBzZWxlY3ROdW1iZXI6bnVtYmVyID0gMDsgLy/pgInkuK3kuKrmlbBcclxuICAgIHByaXZhdGUgdW5pdFByaWNlOm51bWJlciA9IDA7IC8v5Y2V5Lu3XHJcbiAgICBwcml2YXRlIHRvdGFsUHJpY2U6bnVtYmVyID0gMDsgLy/mgLvku7dcclxuICAgIHByaXZhdGUgbXlBbW91bnQ6bnVtYmVyID0gMDsgLy/mgLvotYTkuqdcclxuICAgIHByaXZhdGUgbnVtYmVyQXJyOm51bWJlcltdID0gW107IC8v5pyq6YCJ5Lit55qE5pWw5o2uXHJcbiAgICBwcml2YXRlIGhhbGZBcnI6bnVtYmVyW10gPSBbXTsgLy/kuIDljYrnmoTmnKrpgInkuK3mlbDmja5cclxuICAgIHByaXZhdGUgcmF3RGF0YUFycl9uZXc6YW55W10gPSBbXTsvL+mVnOWDj+aVsOe7hFxyXG4gICAgcHJpdmF0ZSByYXdEYXRhQXJyOmFueVtdID0gW107Ly/ljp/lp4vmlbDmja5cclxuXHJcbiAgICBwcml2YXRlIGlucHV0UHdkOiBJcHRQc3dEb207IC8v5a+G56CB6L6T5YWl5qGGXHJcbiAgICBwcml2YXRlIGNvZGVMaXN0OnN0cmluZyA9ICcnOyAvL+i0reS5sOWPt+eggVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKCl7XHJcbiAgICAgICAgc3VwZXIoKVxyXG5cclxuICAgICAgICB0aGlzLmJ0bl9idXkub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuYnV5RnVuYylcclxuXHJcbiAgICAgICAgLy8g6YCJ5oup5oyJ6ZKu57uE57uR5a6a5LqL5Lu2XHJcbiAgICAgICAgdGhpcy5yYW5kb21fb25lLm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLnNlbGVjdEZ1bmMsWzFdKVxyXG4gICAgICAgIHRoaXMucmFuZG9tX2JlZm9yZS5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5zZWxlY3RGdW5jLFsyXSlcclxuICAgICAgICB0aGlzLnJhbmRvbV9hZnRlci5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5zZWxlY3RGdW5jLFszXSlcclxuICAgICAgICB0aGlzLnJhbmRvbV9hbGwub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuc2VsZWN0RnVuYyxbNF0pXHJcbiAgICB9XHJcblxyXG4gICAgb25FbmFibGUoKTp2b2lkIHtcclxuICAgICAgICBjb25zb2xlLmxvZygn6L+b5YWl6aG16Z2iJyk7XHJcblxyXG4gICAgICAgIC8v6I635Y+W55So5oi36LWE5LqnXHJcbiAgICAgICAgY29uc3QgdXNlckluZm86YW55ID0gR2FtZU1vZGVsLmdldEluc3RhbmNlKCkudXNlckluZm87XHJcbiAgICAgICAgdGhpcy5iYWxhbmNlLnRleHQgPSBgJHt1dGlscy50b0RlY2ltYWwodXNlckluZm8ubW9uZXksMil9IFVTRFRgO1xyXG4gICAgICAgIHRoaXMubXlBbW91bnQgPSArYCR7dXRpbHMudG9EZWNpbWFsKHVzZXJJbmZvLm1vbmV5LDIpfWA7XHJcbiAgICAgICAgaWYgKCF1c2VySW5mby51c2VySWQpIHsgLy/mnKrnmbvlvZXkuI3mmL7npLrmiJHnmoTkvZnpop1cclxuICAgICAgICAgICAgdGhpcy5iYWxhbmNlQm94LnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5lc3RpbWF0ZS55ID0gODA7XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIHRoaXMuYmFsYW5jZUJveC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5lc3RpbWF0ZS55ID0gNDI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIOebkeinhui1hOS6p+WPmOWKqFxyXG4gICAgICAgIEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLm9uKCdnZXRVc2VySW5mbycsdGhpcywoKHVzZXJJbmZvOmFueSk9PntcclxuICAgICAgICAgICAgdGhpcy5iYWxhbmNlLnRleHQgPSBgJHt1dGlscy50b0RlY2ltYWwodXNlckluZm8ubW9uZXksMil9IFVTRFRgO1xyXG4gICAgICAgICAgICB0aGlzLm15QW1vdW50ID0gK2Ake3V0aWxzLnRvRGVjaW1hbCh1c2VySW5mby5tb25leSwyKX1gO1xyXG4gICAgICAgIH0pKVxyXG4gICAgfVxyXG4gICAgb25PcGVuZWQoZ29vZHNJZDphbnkpe1xyXG4gICAgICAgIHRoaXMuZ29vZHNJZCA9IGdvb2RzSWQ7XHJcbiAgICAgICAgdGhpcy5nZXRHb29kc0RldGFpbHModGhpcy5nb29kc0lkKTtcclxuICAgIH1cclxuXHJcbiAgICAvKirotK3kubAgKi9cclxuICAgIHByaXZhdGUgYnV5RnVuYygpOnZvaWQge1xyXG4gICAgICAgIGlmICh0aGlzLmdldFNlbGVjdE51bWJlcigpIDw9IDApIHtcclxuICAgICAgICAgICAgVG9hc3Quc2hvdygn6K+36YCJ5oup6LSt5Lmw5Y+356CBJylcclxuICAgICAgICB9ZWxzZSBpZih0aGlzLnRvdGFsUHJpY2UgPiB0aGlzLm15QW1vdW50KXtcclxuICAgICAgICAgICAgVG9hc3Quc2hvdygn5L2Z6aKd5LiN6LazJylcclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgdGhpcy5pbnB1dFB3ZCA9IG5ldyBJcHRQc3dEb20oKVxyXG4gICAgICAgICAgICB0aGlzLmlucHV0UHdkLnBvcHVwKCk7XHJcbiAgICAgICAgICAgIHRoaXMuaW5wdXRQd2Quc2V0RGF0YSh7IC8v5Y+R6YCB5pWw5o2uXHJcbiAgICAgICAgICAgICAgICBwZXJpb2Q6dGhpcy5wZXJpb2QudGV4dCxcclxuICAgICAgICAgICAgICAgIGNvZGVMaXN0OnRoaXMuY29kZUxpc3RcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLy8g55uR5ZCs6L6T5YWl5qGG57uE5Lu25LqL5Lu2XHJcbiAgICAgICAgICAgIHRoaXMuaW5wdXRQd2Qub24oJ3JlZnJlc2hEYXRhJyx0aGlzLCgpPT57XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdldEdvb2RzRGV0YWlscyh0aGlzLmdvb2RzSWQpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy50b3RhbC50ZXh0ID0gJzAgVVNEVCc7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog6YCJ5oup5oyJ6ZKu57uEXHJcbiAgICAgKiBAcGFyYW0gdHlwZSDpgInmi6nnsbvlnosgIDE66ZqP5LiAICAy77ya5YmN5Y2KIDPvvJrlkI7ljYogNO+8muWFqOmDqFxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIHNlbGVjdEZ1bmModHlwZTpudW1iZXIpe1xyXG4gICAgICAgIHRoaXMucmF3RGF0YUFycl9uZXcgPSB0aGlzLnJhd0RhdGFBcnI7IC8v5Yid5aeL5YyW5pWw57uEXHJcbiAgICAgICAgdGhpcy5udW1iZXJBcnIgPSBbXTsvL+WIneWni+WMluaVsOe7hFxyXG4gICAgICAgIHRoaXMuaGFsZkFyciA9IFtdOy8v5Yid5aeL5YyW5pWw57uEXHJcblxyXG4gICAgICAgIHRoaXMucmF3RGF0YUFycl9uZXcuZm9yRWFjaChpdGVtPT57XHJcbiAgICAgICAgICAgIGlmIChpdGVtLmJ1eWVySWQgPT09ICcyJykge1xyXG4gICAgICAgICAgICAgICAgaXRlbS5idXllcklkID0gJzAnO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChpdGVtLmJ1eWVySWQgPD0gMikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5udW1iZXJBcnIucHVzaChpdGVtLmNvZGUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBpZiAodHlwZSA9PT0gMSkge1xyXG4gICAgICAgICAgICB0aGlzLnJhbmRvbU51bWJlcih0aGlzLm51bWJlckFyciwxKSAvL+maj+S4gFxyXG4gICAgICAgIH1lbHNlIGlmICh0eXBlID09PSAyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGFsZkFyciA9IHRoaXMubnVtYmVyQXJyLnNsaWNlKDAsTWF0aC5mbG9vcih0aGlzLm51bWJlckFyci5sZW5ndGggLyAyKSkgIC8v5YmN5Y2KXHJcbiAgICAgICAgICAgIHRoaXMucmFuZG9tTnVtYmVyKHRoaXMuaGFsZkFyciwyKVxyXG4gICAgICAgIH1lbHNlIGlmKHR5cGUgPT09IDMpIHtcclxuICAgICAgICAgICAgdGhpcy5oYWxmQXJyID0gdGhpcy5udW1iZXJBcnIuc2xpY2UoTWF0aC5mbG9vcih0aGlzLm51bWJlckFyci5sZW5ndGggLyAyKSkgIC8v5ZCO5Y2KXHJcbiAgICAgICAgICAgIHRoaXMucmFuZG9tTnVtYmVyKHRoaXMuaGFsZkFyciwyKVxyXG4gICAgICAgIH1lbHNlIGlmKHR5cGUgPT09IDQpIHtcclxuICAgICAgICAgICAgdGhpcy5oYWxmQXJyID0gdGhpcy5udW1iZXJBcnI7Ly/lhajpg6hcclxuICAgICAgICAgICAgdGhpcy5yYW5kb21OdW1iZXIodGhpcy5oYWxmQXJyLDIpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKuS7juaVsOe7hOS4remaj+acuuWPluS4gOS4quaVsFxyXG4gICAgICogQHBhcmFtIGFyciDmlbDmja7liJfooahcclxuICAgICAqIEBwYXJhbSB0eXBlIFvlj6/pgIldIOmaj+acuuexu+Wei1xyXG4gICAgICovXHJcbiAgICBwcml2YXRlIHJhbmRvbU51bWJlcihhcnI6bnVtYmVyW10sdHlwZT86bnVtYmVyKXtcclxuICAgICAgICBjb25zdCByYW5kOm51bWJlciA9IE1hdGguZmxvb3IoKE1hdGgucmFuZG9tKCkgKiBhcnIubGVuZ3RoKSk7IC8v6ZqP5LiAXHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgY29kZSA9IGFycltyYW5kXTtcclxuICAgICAgICBcclxuICAgICAgICBpZiAodHlwZSA9PT0gMSkge1xyXG4gICAgICAgICAgICB0aGlzLnJhd0RhdGFBcnJfbmV3LmZvckVhY2goaXRlbSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoaXRlbS5jb2RlID09PSBjb2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbS5idXllcklkID0gJzInO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0eXBlID09PSAyKSB7XHJcbiAgICAgICAgICAgIGFyci5mb3JFYWNoKGVsID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMucmF3RGF0YUFycl9uZXcuZm9yRWFjaChpdGVtID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZWwgPT09IGl0ZW0uY29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLmJ1eWVySWQgPSAnMic7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5udW1iZXJMaXN0LmFycmF5ID0gdGhpcy5yYXdEYXRhQXJyX25ldztcclxuICAgICAgICB0aGlzLmdldFNlbGVjdE51bWJlcigpXHJcbiAgICB9XHJcblxyXG4gICAgLyoq6I635Y+W5ZWG5ZOB6K+m5oOFXHJcbiAgICAgKiBAcGFyYW0gZ29vZHNJZCDllYblk4FpZFxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGdldEdvb2RzRGV0YWlscyhnb29kc0lkOnN0cmluZykge1xyXG4gICAgICAgIGFwaS5nZXRHb29kc0RldGFpbHMoZ29vZHNJZCkudGhlbigocmVzOmFueSk9PntcclxuICAgICAgICAgICAgdGhpcy5wcmljZS50ZXh0ID0gYCR7K3Jlcy5wcmljZX1gO1xyXG4gICAgICAgICAgICB0aGlzLmdvb2RzVmFsdWUudGV4dCA9IGAkeytyZXMuZ29vZHNWYWx1ZX0gVVNEVGA7XHJcbiAgICAgICAgICAgIHRoaXMucHJvZ3Jlc3NTcGVlZC52YWx1ZSA9ICtgJHtyZXMuc29sZE51bS9yZXMudG90YWxOdW19YDtcclxuICAgICAgICAgICAgdGhpcy5zb2xkTnVtX3NvbGROdW0udGV4dCA9IGAke3Jlcy5zb2xkTnVtfS8ke3Jlcy50b3RhbE51bX1gO1xyXG4gICAgICAgICAgICB0aGlzLnBlcmlvZC50ZXh0ID0gcmVzLnBlcmlvZDtcclxuICAgICAgICAgICAgdGhpcy51bml0UHJpY2UgPSArcmVzLnByaWNlO1xyXG4gICAgICAgICAgICB0aGlzLnJhd0RhdGFBcnIgPSByZXMuY29kZUxpc3Q7XHJcbiAgICAgICAgICAgIHRoaXMubnVtYmVyTGlzdC5hcnJheSA9IHRoaXMucmF3RGF0YUFycjsgLy/lj7fnoIHliJfooahcclxuICAgICAgICAgICAgdGhpcy5yYW5kb21fb25lLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5udW1iZXJMaXN0LmFycmF5Lmxlbmd0aCA+IDIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucmFuZG9tX2FmdGVyLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yYW5kb21fYmVmb3JlLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yYW5kb21fYWxsLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIHRoaXMucmFuZG9tX29uZS53aWR0aCA9IDMwMDtcclxuICAgICAgICAgICAgICAgIHRoaXMucmFuZG9tX29uZS5jZW50ZXJYID0gMDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLm51bWJlckxpc3QucmVwZWF0WCA9IDU7XHJcbiAgICAgICAgICAgIHRoaXMubnVtYmVyTGlzdC5yZXBlYXRZID0gNDtcclxuICAgICAgICAgICAgdGhpcy5udW1iZXJMaXN0LmNlbGxzLmZvckVhY2goKGl0ZW06IExheWEuU3ByaXRlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpdGVtLm9uKFwiR2V0SXRlbVwiLCB0aGlzLCB0aGlzLmdldFNlbGVjdE51bWJlcilcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9KS5jYXRjaCgoZXJyOmFueSk9PntcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyLm1lc3NhZ2UpO1xyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgLyoq55uR5ZCs57uf6K6h5YiX6KGo5pWw5o2u6YCJ5Lit5Liq5pWwICovXHJcbiAgICBwcml2YXRlIGdldFNlbGVjdE51bWJlcigpe1xyXG4gICAgICAgIHRoaXMuc2VsZWN0TnVtYmVyID0gMDtcclxuICAgICAgICB0aGlzLmNvZGVMaXN0ID0gJyc7XHJcbiAgICAgICAgdGhpcy5udW1iZXJMaXN0LmFycmF5LmZvckVhY2goaXRlbT0+e1xyXG4gICAgICAgICAgICBpZiAoaXRlbS5idXllcklkID09PSAnMicpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0TnVtYmVyID0gdGhpcy5zZWxlY3ROdW1iZXIgKyAxO1xyXG4gICAgICAgICAgICAgICAgbGV0IGNvZGVTdHJpbmc6c3RyaW5nID0gYCR7dGhpcy5jb2RlTGlzdH0ke3RoaXMuY29kZUxpc3QubGVuZ3RoID4gMCA/ICcsJzonJ30ke2l0ZW0uY29kZX1gO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb2RlTGlzdCA9ICBjb2RlU3RyaW5nO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgICB0aGlzLnRvdGFsLnRleHQgPSB1dGlscy50b0RlY2ltYWwoKHRoaXMudW5pdFByaWNlICogdGhpcy5zZWxlY3ROdW1iZXIpLDIpICsgJyBVU0RUJztcclxuICAgICAgICB0aGlzLnRvdGFsUHJpY2UgPSArdXRpbHMudG9EZWNpbWFsKCh0aGlzLnVuaXRQcmljZSAqIHRoaXMuc2VsZWN0TnVtYmVyKSwyKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2VsZWN0TnVtYmVyO1xyXG4gICAgfVxyXG59IiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ4OjE2XHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ4OjE2XHJcbiAqIEBkZXNjIOmmlumhteiEmuacrFxyXG4gKi9cclxuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XHJcbmltcG9ydCB7IFRvYXN0IH0gZnJvbSBcIi4uL3ZpZXcvVG9hc3RcIjtcclxuaW1wb3J0IHsgR2FtZU1vZGVsIH0gZnJvbSBcIi4uL2pzL0dhbWVNb2RlbFwiO1xyXG5pbXBvcnQgdXRpbHMgZnJvbSAnLi4vanMvdXRpbHMnXHJcbmltcG9ydCBhcGkgZnJvbSBcIi4uL2pzL2FwaVwiO1xyXG5cclxuaW1wb3J0IHsgcG9zdCB9IGZyb20gJy4uL2pzL2h0dHAnO1xyXG5cclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEhvbWUgZXh0ZW5kcyB1aS5ob21lVUkge1xyXG4gICAgY29uc3RydWN0b3IoKXtcclxuICAgICAgICBzdXBlcigpXHJcbiAgICAgICAgdGhpcy5idG5SZWNoYXJnZS5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5idG5SZWNoYXJnZUZ1bmMpO1xyXG4gICAgICAgIHRoaXMuYnV5SGVscC5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5vcGVuQnV5SGVscClcclxuICAgICAgICB0aGlzLnB1dGluLm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLnB1dEluRnVuYylcclxuICAgIH1cclxuICAgIG9uRW5hYmxlKCk6dm9pZHtcclxuICAgICAgICB0aGlzLmdldFVzZXJJbmZvKClcclxuICAgICAgICB0aGlzLnJhbmtUb2RheSgpXHJcbiAgICAgICAgdGhpcy5nZXRHb29kc0xpc3QoKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKuWFheWAvCAqL1xyXG4gICAgcHJpdmF0ZSBidG5SZWNoYXJnZUZ1bmMoKTp2b2lkIHtcclxuICAgICAgICBUb2FzdC5zaG93KCfngrnlh7vlhYXlgLwnKVxyXG4gICAgfVxyXG4gICAgLyoq56m65oqVICovXHJcbiAgICBwcml2YXRlIHB1dEluRnVuYygpe1xyXG4gICAgICAgIFRvYXN0LnNob3coJ+aaguacquW8gOaUvu+8jOaVrOivt+acn+W+hScpXHJcbiAgICB9XHJcblxyXG4gICAgLyoq6I635Y+W5Liq5Lq65L+h5oGvICovXHJcbiAgICBwcml2YXRlIGdldFVzZXJJbmZvKCkge1xyXG4gICAgICAgIHBvc3QoJy91c2VyL2xvZ2luJyx7XHJcbiAgICAgICAgICAgIG9yZ0lkOjEsXHJcbiAgICAgICAgICAgIGFjY291bnQ6JzE4OTAwMDAwMDAzJ1xyXG4gICAgICAgIH0pLnRoZW4oKHJlczphbnkpPT57XHJcbiAgICAgICAgICAgIGFwaS5nZXRVc2VySW5mbygpLnRoZW4oKHJlczphbnkpPT57XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5pY2tOYW1lLnRleHQgPSByZXMudXNlckluZm8ubmlja05hbWVcclxuICAgICAgICAgICAgICAgIHRoaXMubXlBbW91bnQudGV4dCA9YCR7dXRpbHMudG9EZWNpbWFsKHJlcy51c2VySW5mby5tb25leSwyKX1gXHJcbiAgICAgICAgICAgICAgICB0aGlzLmF2YXRhci5za2luID0gcmVzLnVzZXJJbmZvLmF2YXRhcjtcclxuICAgICAgICAgICAgICAgIC8vIOS/neWtmOeUqOaIt+S/oeaBr1xyXG4gICAgICAgICAgICAgICAgR2FtZU1vZGVsLmdldEluc3RhbmNlKCkuc2V0VXNlckluZm8ocmVzLnVzZXJJbmZvKVxyXG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOmFueSk9PntcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyci5tZXNzYWdlKTtcclxuICAgICAgICAgICAgICAgIC8vIOiOt+WPluS/oeaBr+Wksei0peabtOaWsOS/oeaBr1xyXG4gICAgICAgICAgICAgICAgR2FtZU1vZGVsLmdldEluc3RhbmNlKCkuc2V0VXNlckluZm8oe1xyXG4gICAgICAgICAgICAgICAgICAgIHVzZXJJbmZvOnt9XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgLyoq5LuK5pel5aSn5aWW5rGgICovXHJcbiAgICBwcml2YXRlIHJhbmtUb2RheSgpe1xyXG4gICAgICAgIGFwaS5nZXRSYW5rVG9kYXkoKS50aGVuKChyZXM6YW55KT0+e1xyXG4gICAgICAgICAgICB0aGlzLnJvY2tldEFtb3VudC50ZXh0ID0gYCR7dXRpbHMudG9EZWNpbWFsKHJlcy5wb3RNb25leSwyKX1gXHJcbiAgICAgICAgICAgIHV0aWxzLmNvdW50RG93bihyZXMuY291bnREb3duLCgodGltZSk9PntcclxuICAgICAgICAgICAgICAgIHRoaXMucm9ja2V0Q291bnREb3duLnRleHQgPSB0aW1lXHJcbiAgICAgICAgICAgIH0pKVxyXG4gICAgICAgIH0pLmNhdGNoKChlcnI6YW55KT0+e1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIubWVzc2FnZSk7XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICAvKirojrflj5bpppbpobXllYblk4HliJfooaggKi9cclxuICAgIHByaXZhdGUgZ2V0R29vZHNMaXN0KCl7XHJcbiAgICAgICAgYXBpLmdldEdvb2RzTGlzdCgpLnRoZW4oKHJlczphbnkpPT57XHJcbiAgICAgICAgICAgIHRoaXMubGlzdC5hcnJheSA9IHJlcy5saXN0XHJcbiAgICAgICAgfSkuY2F0Y2goKGVycjphbnkpPT57XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyci5tZXNzYWdlKTtcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIC8qKueOqeazleS7i+e7jSAqL1xyXG4gICAgcHJpdmF0ZSBvcGVuQnV5SGVscCgpe1xyXG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gJ2h0dHBzOi8vbS54eWhqLmlvL2J1eUhlbHAuaHRtbCc7XHJcbiAgICB9XHJcbn0iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDg6MjhcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDg6MjhcclxuICogQGRlc2Mg6K6w5b2V6aG16Z2i6ISa5pysXHJcbiAqL1xyXG5pbXBvcnQgeyB1aSB9IGZyb20gJy4uL3VpL2xheWFNYXhVSSdcclxuaW1wb3J0IGFwaSBmcm9tICcuLi9qcy9hcGknO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVjb3JkIGV4dGVuZHMgdWkucmVjb3JkVUkge1xyXG4gICAgY29uc3RydWN0b3IoKXtcclxuICAgICAgICBzdXBlcigpXHJcblxyXG4gICAgICAgIHRoaXMuY2FueXUub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMudGFiU3dpdGNoLFsxXSlcclxuICAgICAgICB0aGlzLndhbmdxaS5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy50YWJTd2l0Y2gsWzJdKVxyXG4gICAgICAgIHRoaXMub24oTGF5YS5FdmVudC5SRVNJWkUsdGhpcyx0aGlzLm9uUmVzaXplKVxyXG4gICAgfVxyXG5cclxuICAgIG9uRW5hYmxlKCk6dm9pZHtcclxuICAgICAgICB0aGlzLmdldE15T3JkZXJzKCk7XHJcbiAgICAgICAgdGhpcy5nZXRHb29kc0hpc3RvcnkoKTtcclxuICAgIH1cclxuXHJcbiAgICAvKirojrflj5blj4LkuI7orrDlvZUgKi9cclxuICAgIHByaXZhdGUgZ2V0TXlPcmRlcnMocGFnZT86bnVtYmVyKXtcclxuICAgICAgICBhcGkuZ2V0TXlPcmRlcnMocGFnZSkudGhlbigocmVzOmFueSk9PntcclxuICAgICAgICAgICAgdGhpcy5qb2luTGlzdC5hcnJheSA9IHJlcztcclxuICAgICAgICAgICAgdGhpcy5qb2luTGlzdC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICB9KS5jYXRjaCgoZXJyOmFueSk9PntcclxuICAgICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyci5tZXNzYWdlKTtcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG4gICAgLyoq6I635Y+W5b6A5pyf6K6w5b2VICovXHJcbiAgICBwcml2YXRlIGdldEdvb2RzSGlzdG9yeShwYWdlPzpudW1iZXIpe1xyXG4gICAgICAgIGFwaS5nZXRHb29kc0hpc3RvcnkocGFnZSkudGhlbigocmVzOmFueSk9PntcclxuICAgICAgICAgICAgdGhpcy5wcmV2aW9vdXNMaXN0LmFycmF5ID0gcmVzO1xyXG4gICAgICAgIH0pLmNhdGNoKChlcnI6YW55KT0+e1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIubWVzc2FnZSk7XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIOWIh+aNouiusOW9leWIl+ihqFxyXG4gICAgICogQHBhcmFtIHR5cGUgMTrlj4LkuI7orrDlvZUgIDLvvJrlvoDmnJ/orrDlvZVcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSB0YWJTd2l0Y2godHlwZTpudW1iZXIpe1xyXG4gICAgICAgIGlmICh0eXBlID09PSAxKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY2FueXUuc2tpbiA9ICdjb21wL2d1ZXNzaW5nL2ltZ190YWJfYWN0aXZlLnBuZyc7XHJcbiAgICAgICAgICAgIHRoaXMud2FuZ3FpLnNraW4gPSAnY29tcC9ndWVzc2luZy9pbWdfdGFiLnBuZyc7XHJcbiAgICAgICAgICAgIHRoaXMuZ2V0TXlPcmRlcnMoKVxyXG4gICAgICAgICAgICBpZiAodGhpcy5qb2luTGlzdC5hcnJheSA9PT0gbnVsbCB8fCB0aGlzLmpvaW5MaXN0LmFycmF5Lmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgIH1lbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubm9EYXRhLnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuam9pbkxpc3QudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5wcmV2aW9vdXNMaXN0LnNjcm9sbFRvKDApXHJcbiAgICAgICAgICAgIHRoaXMucHJldmlvb3VzTGlzdC52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIHRoaXMud2FuZ3FpLnNraW4gPSAnY29tcC9ndWVzc2luZy9pbWdfdGFiX2FjdGl2ZS5wbmcnO1xyXG4gICAgICAgICAgICB0aGlzLmNhbnl1LnNraW4gPSAnY29tcC9ndWVzc2luZy9pbWdfdGFiLnBuZyc7XHJcbiAgICAgICAgICAgIHRoaXMuZ2V0R29vZHNIaXN0b3J5KCk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnByZXZpb291c0xpc3QuYXJyYXkgPT09IG51bGwgfHwgdGhpcy5wcmV2aW9vdXNMaXN0LmFycmF5Lmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgIH1lbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubm9EYXRhLnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHRoaXMucHJldmlvb3VzTGlzdC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmpvaW5MaXN0LnNjcm9sbFRvKDApO1xyXG4gICAgICAgICAgICB0aGlzLmpvaW5MaXN0LnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoq55uR6KeG5bGP5bmV5aSn5bCP5Y+Y5YyWICovXHJcbiAgICBvblJlc2l6ZSgpe1xyXG4gICAgICAgIC8v5YiX6KGo6auY5bqm6YCC6YWNID0g5bGP5bmV6auY5bqmIC0gKGJhbm5lciArIHRhYmJhcilcclxuICAgICAgICB0aGlzLmpvaW5MaXN0LmhlaWdodCA9IHRoaXMuaGVpZ2h0IC0gNDMwO1xyXG4gICAgICAgIHRoaXMucHJldmlvb3VzTGlzdC5oZWlnaHQgPSB0aGlzLmhlaWdodCAtIDQzMDtcclxuICAgIH1cclxufSIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0yMCAxMDoyNzoyNVxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yMCAxMDoyNzoyNVxyXG4gKiBAZGVzYyDngavnrq3lpKflpZbpobXpnaJcclxuICovXHJcbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xyXG5pbXBvcnQgeyBnZXQgfSBmcm9tIFwiLi4vanMvaHR0cFwiO1xyXG5pbXBvcnQgdXRpbHMgZnJvbSBcIi4uL2pzL3V0aWxzXCI7XHJcbmltcG9ydCBhcGkgZnJvbSBcIi4uL2pzL2FwaVwiO1xyXG5cclxuIGV4cG9ydCBkZWZhdWx0IGNsYXNzIGdyYW5kUHJpeCBleHRlbmRzIHVpLmdyYW5kUHJpeFVJIHtcclxuICAgICBjb25zdHJ1Y3Rvcigpe1xyXG4gICAgICAgICBzdXBlcigpXHJcbiAgICAgICAgIHRoaXMucmFua1ByaXplSGVscC5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5vcGVuUmFua1ByaXplSGVscClcclxuICAgICB9XHJcblxyXG4gICAgIG9uRW5hYmxlKCl7XHJcbiAgICAgICAgdGhpcy5nZXRSYW5rVG9kYXkoKVxyXG4gICAgIH1cclxuXHJcbiAgICAgLyoq6I635Y+W5aSn5aWW5L+h5oGvICovXHJcbiAgICBwcml2YXRlIGdldFJhbmtUb2RheSgpe1xyXG4gICAgICAgIGFwaS5nZXRSYW5rVG9kYXkoKS50aGVuKChyZXM6YW55KT0+e1xyXG4gICAgICAgICAgICB0aGlzLmJvbnVzLnRleHQgPSBgJHt1dGlscy50b0RlY2ltYWwocmVzLnBvdE1vbmV5LDIpfWAgXHJcbiAgICAgICAgICAgIHV0aWxzLmNvdW50RG93bihyZXMuY291bnREb3duLCgodGltZSk9PntcclxuICAgICAgICAgICAgICAgIHRoaXMuQ291bnREb3duLnRleHQgPSB0aW1lXHJcbiAgICAgICAgICAgIH0pKVxyXG4gICAgICAgICAgICAvL+acqueZu+W9leWImeS4jeaYvuekuuS4quS6uuaOkuWQjVxyXG4gICAgICAgICAgICBpZiAocmVzLmxpc3Quc2VsZi51c2VySWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubXlSYW5rQm94LnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5teXJhbmtpbmcudGV4dCA9IHJlcy5saXN0LnNlbGYucmFuayA+IDE1ID8gJzE1KycgOiBgJHtyZXMubGlzdC5zZWxmLnJhbmt9YDtcclxuICAgICAgICAgICAgICAgIHRoaXMuYXZhdGFyLnNraW4gPSByZXMubGlzdC5zZWxmLmF2YXRhcjtcclxuICAgICAgICAgICAgICAgIHRoaXMubmlja05hbWUudGV4dCA9IHJlcy5saXN0LnNlbGYubmlja05hbWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnVpZC50ZXh0ID0gcmVzLmxpc3Quc2VsZi51c2VySWQ7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnZvbHVtZS50ZXh0ID0gYCR7cmVzLmxpc3Quc2VsZi5jb25zdW19IFVTRFRgO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSkuY2F0Y2goKGVycjphbnkpPT57XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyci5tZXNzYWdlKTtcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIC8qKuivtOaYjiAqL1xyXG4gICAgcHJpdmF0ZSBvcGVuUmFua1ByaXplSGVscCgpe1xyXG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gJ2h0dHBzOi8vbS54eWhqLmlvL3JhbmtQcml6ZUhlbHAuaHRtbCc7XHJcbiAgICB9XHJcbiB9ICIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0ODo0MFxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0ODo0MFxyXG4gKiBAZGVzYyDlj4LkuI7orrDlvZXohJrmnKxcclxuICovXHJcbmltcG9ydCB7IHVpIH0gZnJvbSAnLi4vdWkvbGF5YU1heFVJJ1xyXG5pbXBvcnQgdXRpbHMgZnJvbSAnLi4vanMvdXRpbHMnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3Mgam9pblJlY29yZCBleHRlbmRzIHVpLnRlbXBsYXRlLmpvaW5SZWNvcmRzVUkge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoKVxyXG4gICAgfVxyXG4gICAgc2V0IGRhdGFTb3VyY2UoaXRlbTogYW55KSB7XHJcbiAgICAgICAgdGhpcy5fZGF0YVNvdXJjZSA9IGl0ZW07XHJcblxyXG4gICAgICAgIGlmIChpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMucGVyaW9kLnRleHQgPSBpdGVtLnBlcmlvZDtcclxuICAgICAgICAgICAgdGhpcy5nb29kc1ZhbHVlLnRleHQgPSBgJHsrdXRpbHMudG9EZWNpbWFsKGl0ZW0uZ29vZHNWYWx1ZSwyKX1gO1xyXG4gICAgICAgICAgICB0aGlzLm9wZW5UaW1lLnRleHQgPSB1dGlscy5mb3JtYXREYXRlVGltZShpdGVtLm9wZW5UaW1lKTtcclxuICAgICAgICAgICAgdGhpcy5oaXRDb2RlLnRleHQgPSBpdGVtLmhpdENvZGU7XHJcbiAgICAgICAgICAgIHRoaXMuY29kZUxpc3QudGV4dCA9IGl0ZW0uY29kZUxpc3Q7XHJcbiAgICAgICAgICAgIGlmIChpdGVtLnN0YXR1cyA9PT0gJzAnKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5vUHJpemUudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnByaXplLnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHRoaXMubm9Qcml6ZS50ZXh0ID0gJ+acquW8gOWllic7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9wZW5UaW1lLnRleHQgPSAnLS0tJztcclxuICAgICAgICAgICAgICAgIHRoaXMuaGl0Q29kZS50ZXh0ID0gJy0tLSc7XHJcbiAgICAgICAgICAgIH1lbHNlIGlmKGl0ZW0uc3RhdHVzID09PSAnMScpe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ub1ByaXplLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wcml6ZS52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5vUHJpemUudGV4dCA9ICflvIDlpZbkuK0nO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vcGVuVGltZS50ZXh0ID0gJy0tLSc7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhpdENvZGUudGV4dCA9ICctLS0nO1xyXG4gICAgICAgICAgICB9ZWxzZSBpZihpdGVtLnN0YXR1cyA9PT0gJzInICYmIGl0ZW0uaGl0ID09PSAwKXtcclxuICAgICAgICAgICAgICAgIHRoaXMubm9Qcml6ZS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMucHJpemUudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ub1ByaXplLnRleHQgPSAn5pyq5Lit5aWWJztcclxuICAgICAgICAgICAgICAgIHRoaXMuYXdhcmQudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9ZWxzZSBpZihpdGVtLnN0YXR1cyA9PT0gJzInICYmIGl0ZW0uaGl0ID09PSAxKXtcclxuICAgICAgICAgICAgICAgIHRoaXMucHJpemUudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5vUHJpemUudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hd2FyZC50ZXh0ID0gYCR7K3V0aWxzLnRvRGVjaW1hbChpdGVtLmdvb2RzVmFsdWUsMil9IFVTRFRgO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hd2FyZC52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0ODo1MFxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0ODo1MFxyXG4gKiBAZGVzYyDotK3kubDpobXpnaLlj7fnoIHliJfooajohJrmnKxcclxuICovXHJcbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xyXG5pbXBvcnQgeyBUb2FzdCB9IGZyb20gXCIuLi92aWV3L1RvYXN0XCI7XHJcbmltcG9ydCB7IEdhbWVNb2RlbCB9IGZyb20gXCIuLi9qcy9HYW1lTW9kZWxcIjtcclxuXHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBudW1iZXJMaXN0RE9NIGV4dGVuZHMgdWkudGVtcGxhdGUubnVtYmVyTGlzdERPTVVJIHtcclxuICAgIHByaXZhdGUgdXNlcklkOnN0cmluZyA9ICcnO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCl7XHJcbiAgICAgICAgc3VwZXIoKVxyXG4gICAgICAgIHRoaXMub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuY2xpY2tOdW1iZXIpXHJcbiAgICB9XHJcbiAgICBzZXQgZGF0YVNvdXJjZShpdGVtOiBhbnkpIHtcclxuICAgICAgICB0aGlzLl9kYXRhU291cmNlID0gaXRlbTtcclxuICAgICAgICBpZiAoaXRlbSkge1xyXG4gICAgICAgICAgICB0aGlzLmNvZGUudGV4dCA9IGl0ZW0uY29kZTtcclxuICAgICAgICAgICAgdGhpcy5iZ0ltZy5za2luID0gdGhpcy5yZXR1cm5TdGF0dXNJbWcoaXRlbS5idXllcklkKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBvbkVuYWJsZSgpe1xyXG4gICAgICAgIC8v6I635Y+W55So5oi36LWE5LqnXHJcbiAgICAgICAgY29uc3QgdXNlckluZm86YW55ID0gR2FtZU1vZGVsLmdldEluc3RhbmNlKCkudXNlckluZm87XHJcbiAgICAgICAgdGhpcy51c2VySWQgPSB1c2VySW5mby51c2VySWQ7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiDpgInmi6nlj7fnoIFcclxuICAgICAqIEBwYXJhbSBpdGVtIOW9k+WJjeaMiemSrlxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGNsaWNrTnVtYmVyKGl0ZW06YW55KTp2b2lkIHtcclxuICAgICAgICBpZiAoK3RoaXMuX2RhdGFTb3VyY2UuYnV5ZXJJZCA+IDEwKSB7IC8v55So5oi3aWTlv4XlpKfkuo4xMO+8jOS9nOS4uuWIpOaWreS+neaNrlxyXG4gICAgICAgICAgICBUb2FzdC5zaG93KCfor6Xlj7fnoIHlt7LooqvotK3kubAnKVxyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfWVsc2UgaWYodGhpcy5fZGF0YVNvdXJjZS5idXllcklkID09PSAnMCcpe1xyXG4gICAgICAgICAgICB0aGlzLmJnSW1nLnNraW4gPSB0aGlzLnJldHVyblN0YXR1c0ltZygnMicpXHJcbiAgICAgICAgICAgIHRoaXMuX2RhdGFTb3VyY2UuYnV5ZXJJZCA9ICcyJztcclxuICAgICAgICB9ZWxzZSBpZih0aGlzLl9kYXRhU291cmNlLmJ1eWVySWQgPT09ICcyJyl7XHJcbiAgICAgICAgICAgIHRoaXMuYmdJbWcuc2tpbiA9IHRoaXMucmV0dXJuU3RhdHVzSW1nKCcwJylcclxuICAgICAgICAgICAgdGhpcy5fZGF0YVNvdXJjZS5idXllcklkID0gJzAnO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmV2ZW50KFwiR2V0SXRlbVwiKTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiDmoLnmja7nirbmgIHov5Tlm57lr7nlupTlm77niYdcclxuICAgICAqIEBwYXJhbSBidXllcklkICAw77ya5Y+v6YCJIDLvvJrpgInkuK0g5aSn5LqOMTA65LiN5Y+v6YCJICDnrYnkuo7oh6rlt7F1c2VySWTvvJrlt7LpgIlcclxuICAgICAqIFxyXG4gICAgKi9cclxuICAgIHByaXZhdGUgcmV0dXJuU3RhdHVzSW1nKGJ1eWVySWQ6c3RyaW5nKXtcclxuICAgICAgICBpZiAoYnV5ZXJJZCA9PT0gdGhpcy51c2VySWQpIHtcclxuICAgICAgICAgICAgcmV0dXJuICdjb21wL2d1ZXNzaW5nL2ltZ195aXh1YW5fc2VsZWN0MjAucG5nJ1xyXG4gICAgICAgIH1lbHNlIGlmKCtidXllcklkID4gMTApeyAvL+eUqOaIt2lk5b+F5aSn5LqOMTDvvIzkvZzkuLrliKTmlq3kvp3mja5cclxuICAgICAgICAgICAgcmV0dXJuICdjb21wL2d1ZXNzaW5nL2ltZ19ub19zZWxlY3QyMC5wbmcnXHJcbiAgICAgICAgfWVsc2UgaWYoYnV5ZXJJZCA9PT0gJzInKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAnY29tcC9ndWVzc2luZy9pbWdfb2tfc2VsZWN0MjAucG5nJ1xyXG4gICAgICAgIH1lbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuICdjb21wL2d1ZXNzaW5nL2ltZ19rZXh1YW5fc2VsZWN0MjAucG5nJ1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBcclxufSIsIi8qKlxyXG4gKiBAYXV0aG9yIFtTaXdlbl1cclxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxyXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0OTowOFxyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0OTowOFxyXG4gKiBAZGVzYyDlvoDmnJ/orrDlvZXohJrmnKxcclxuICovXHJcbmltcG9ydCB7IHVpIH0gZnJvbSAnLi4vdWkvbGF5YU1heFVJJ1xyXG5pbXBvcnQgdXRpbHMgZnJvbSAnLi4vanMvdXRpbHMnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgcHJldmlvdXNSZWNvcmQgZXh0ZW5kcyB1aS50ZW1wbGF0ZS5wcmV2aW91c1JlY29yZHNVSSB7XHJcbiAgICBjb25zdHJ1Y3Rvcigpe1xyXG4gICAgICAgIHN1cGVyKClcclxuICAgICAgICB0aGlzLnR4SGFzaC5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5zZWVIYXNoKVxyXG4gICAgfVxyXG4gICAgc2V0IGRhdGFTb3VyY2UoaXRlbTogYW55KSB7XHJcbiAgICAgICAgdGhpcy5fZGF0YVNvdXJjZSA9IGl0ZW07XHJcbiAgICAgICAgaWYgKGl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5wZXJpb2QudGV4dCA9IGl0ZW0ucGVyaW9kO1xyXG4gICAgICAgICAgICB0aGlzLnJlcXVlc3RUeXBlLnRleHQgPSBpdGVtLnJlcXVlc3RUeXBlO1xyXG4gICAgICAgICAgICB0aGlzLmdvb2RzTmFtZS50ZXh0ID0gaXRlbS5nb29kc05hbWU7XHJcbiAgICAgICAgICAgIHRoaXMudHhIYXNoLnRleHQgPSBpdGVtLnR4SGFzaDtcclxuICAgICAgICAgICAgdGhpcy5oaXRDb2RlLnRleHQgPSBpdGVtLmhpdENvZGU7XHJcbiAgICAgICAgICAgIHRoaXMub3BlblRpbWUudGV4dCA9IHV0aWxzLmZvcm1hdERhdGVUaW1lKGl0ZW0ub3BlblRpbWUpO1xyXG4gICAgICAgICAgICB0aGlzLmpvaW5lZE51bS50ZXh0ID0gaXRlbS5qb2luZWROdW07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKuafpeeci+WTiOW4jCAqL1xyXG4gICAgc2VlSGFzaCgpOnZvaWQge1xyXG4gICAgICAgIGFsZXJ0KGDliY3lvoBoYXNo5Zyw5Z2A77yaJHt0aGlzLl9kYXRhU291cmNlLnR4SGFzaH1gKVxyXG4gICAgfVxyXG59IiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ5OjIzXHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ5OjIzXHJcbiAqIEBkZXNjIOS6pOaYk+Wvhueggei+k+WFpeW8ueeql+iEmuacrFxyXG4gKi9cclxuaW1wb3J0IHsgdWkgfSBmcm9tICcuLi91aS9sYXlhTWF4VUknXHJcbmltcG9ydCBUaXBzRGlhTG9nIGZyb20gJy4vdGlwRGlhbG9nJztcclxuaW1wb3J0IHsgVG9hc3QgfSBmcm9tICcuLi92aWV3L1RvYXN0JztcclxuaW1wb3J0IEd1ZXNzaW5nIGZyb20gJy4uL3NjcmlwdC9HdWVzc2luZyc7XHJcbmltcG9ydCBhcGkgZnJvbSAnLi4vanMvYXBpJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIElwdFBzd0RvbSBleHRlbmRzIHVpLnRlbXBsYXRlLklucHV0UHdkRGlhbG9nVUkge1xyXG5cclxuICAgIHByaXZhdGUgcGVyaW9kOnN0cmluZyA9ICcnOy8v5pyf5Y+3XHJcbiAgICBwcml2YXRlIGNvZGVMaXN0OnN0cmluZyA9ICcnOy8v6LSt5Lmw5Y+356CBXHJcbiAgICBwcml2YXRlIGlzRW50ZXI6Ym9vbGVhbiA9IGZhbHNlOyAvL+WHveaVsOiKgua1gVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKClcclxuICAgIH1cclxuICAgIG9uRW5hYmxlKCl7XHJcbiAgICAgICAgdGhpcy5idG5DbG9zZS5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5jbG9zZUZ1bmMpXHJcbiAgICAgICAgdGhpcy5JcHRQc3cub24oTGF5YS5FdmVudC5GT0NVUyx0aGlzLHRoaXMub25Gb2N1cylcclxuICAgICAgICB0aGlzLklwdFBzdy5vbihMYXlhLkV2ZW50LkJMVVIsdGhpcyx0aGlzLm9uQkxVUilcclxuICAgICAgICB0aGlzLklwdFBzdy5vbihMYXlhLkV2ZW50LktFWV9VUCx0aGlzLHRoaXMub25DaGFuZ2UpXHJcbiAgICB9XHJcblxyXG4gICAgLyoq6I635Y+W5Lyg6YCS55qE5Y+C5pWwICovXHJcbiAgICBzZXREYXRhKGRhdGE6YW55KSB7XHJcbiAgICAgICAgdGhpcy5wZXJpb2QgPSBkYXRhLnBlcmlvZDtcclxuICAgICAgICB0aGlzLmNvZGVMaXN0ID0gZGF0YS5jb2RlTGlzdDtcclxuICAgIH1cclxuXHJcbiAgICAvKirovpPlhaXlhoXlrrnmlLnlj5ggKi9cclxuICAgIHByaXZhdGUgb25DaGFuZ2UoKXtcclxuICAgICAgICBpZiAoIXRoaXMuaXNFbnRlciAmJiB0aGlzLklwdFBzdy50ZXh0Lmxlbmd0aCA9PT0gNikge1xyXG4gICAgICAgICAgICB0aGlzLnRyYWRlQnV5KClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoq6LSt5LmwICovXHJcbiAgICBwcml2YXRlIHRyYWRlQnV5KCl7XHJcbiAgICAgICAgdGhpcy5pc0VudGVyID0gdHJ1ZTtcclxuICAgICAgICBhcGkucG9zdFRyYWRlQnV5KHRoaXMucGVyaW9kLHRoaXMuY29kZUxpc3QsdGhpcy5JcHRQc3cudGV4dCkudGhlbigocmVzOmFueSk9PntcclxuICAgICAgICAgICAgdGhpcy5pc0VudGVyID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMuY2xvc2VGdW5jKCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmV2ZW50KFwicmVmcmVzaERhdGFcIik7Ly/liLfmlrDmlbDmja7liJfooahcclxuICAgICAgICAgICAgLy8g6LSt5Lmw5oiQ5Yqf5by55Ye65a+56K+d5qGGXHJcbiAgICAgICAgICAgIGxldCB0aXBzRGlhbG9nOlRpcHNEaWFMb2cgPSBuZXcgVGlwc0RpYUxvZygpXHJcbiAgICAgICAgICAgIHRpcHNEaWFsb2cucG9wdXAoKVxyXG4gICAgICAgIH0pLmNhdGNoKChlcnI6YW55KT0+e1xyXG4gICAgICAgICAgICB0aGlzLmlzRW50ZXIgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5jbG9zZUZ1bmMoKTtcclxuXHJcbiAgICAgICAgICAgIFRvYXN0LnNob3coZXJyLm1lc3NhZ2UpXHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICAvKirlhbPpl63lr4bnoIHmoYYgKi9cclxuICAgIHByaXZhdGUgY2xvc2VGdW5jKCl7XHJcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xyXG4gICAgfVxyXG4gICAgLyoq6L6T5YWl5qGG6I635b6X54Sm54K5ICovXHJcbiAgICBwcml2YXRlIG9uRm9jdXMoKXtcclxuICAgICAgICB0aGlzLnRvcCA9IDE1MDtcclxuICAgIH1cclxuICAgIC8qKui+k+WFpeahhuiOt+W+l+eEpueCuSAqL1xyXG4gICAgcHJpdmF0ZSBvbkJMVVIoKXtcclxuICAgICAgIHRoaXMudG9wID0gNDQwO1xyXG4gICAgfVxyXG59IiwiLyoqXHJcbiAqIEBhdXRob3IgW1Npd2VuXVxyXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXHJcbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ0OjAyXHJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ0OjAyXHJcbiAqIEBkZXNjIOi0reS5sOaIkOWKn+WQjueahOaPkOekuuahhuiEmuacrFxyXG4gKi9cclxuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XHJcbmltcG9ydCB7IFRhYmJhciB9IGZyb20gXCIuLi92aWV3L1RhYmJhclwiO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGlwc0RpYUxvZyBleHRlbmRzIHVpLnRlbXBsYXRlLlRpcHNEaWFsb2dVSSB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpXHJcbiAgICB9XHJcbiAgICBvbkVuYWJsZSgpe1xyXG4gICAgICAgIHRoaXMuYnRuQ29udGludWUub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuY2xvc2VGdW5jKVxyXG4gICAgICAgIHRoaXMuYnRuVmlld1JlY29yZC5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy52aWV3UmVjb3JkRnVuYylcclxuICAgICAgICBcclxuICAgIH1cclxuXHJcbiAgICAvKirlhbPpl63lr4bnoIHmoYYgKi9cclxuICAgIHByaXZhdGUgY2xvc2VGdW5jKCl7XHJcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xyXG4gICAgfVxyXG4gICAgcHJpdmF0ZSB2aWV3UmVjb3JkRnVuYygpe1xyXG4gICAgICAgIHRoaXMuY2xvc2UoKTtcclxuICAgICAgICBUYWJiYXIuZ2V0SW5zdGFuY2UoKS5vcGVuU2NlbmUoJ3JlY29yZC5zY2VuZScpXHJcbiAgICB9XHJcbn0iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjEgMTY6MzI6MDFcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjEgMTY6MzI6MDFcclxuICogQGRlc2Mg6LWw5Yq/5YiX6KGo6ISa5pysXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgdWkgfSBmcm9tICcuLi91aS9sYXlhTWF4VUknXHJcbmltcG9ydCB1dGlscyBmcm9tICcuLi9qcy91dGlscyc7XHJcbmltcG9ydCB7IFRhYmJhciB9IGZyb20gJy4uL3ZpZXcvVGFiYmFyJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHRyZW5kTGlzdCBleHRlbmRzIHVpLnRlbXBsYXRlLnRyZW5kTGlzdFVJIHtcclxuICAgIHByaXZhdGUgX2l0ZW06YW55O1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoKVxyXG4gICAgICAgIHRoaXMuYnRuQnV5Lm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLmJ0bkJ1eUZ1bmMpXHJcbiAgICB9XHJcbiAgICBzZXQgZGF0YVNvdXJjZShpdGVtOmFueSl7XHJcbiAgICAgICAgdGhpcy5faXRlbSA9IGl0ZW07XHJcbiAgICAgICAgaWYgKGl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5wZXJpb2QudGV4dCA9IGl0ZW0ucGVyaW9kO1xyXG4gICAgICAgICAgICB0aGlzLmhpdENvZGUudGV4dCA9IGl0ZW0uaGl0Q29kZTtcclxuICAgICAgICAgICAgdGhpcy5vZGRfZXZlbi50ZXh0ID0gaXRlbS5pcyA9PT0gMCA/ICctJyA6ICBpdGVtLmlzID09PSAxID8gJ+WlhycgOiAn5YG2JztcclxuICAgICAgICAgICAgdGhpcy5pc0JpZy50ZXh0ID0gaXRlbS5pcyA9PT0gMCA/ICctJyA6IGl0ZW0uaXNCaWcgPyAn5aSnJyA6ICflsI8nO1xyXG5cclxuICAgICAgICAgICAgaWYgKGl0ZW0uaXMgPT09IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYnRuQnV5LnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaXRDb2RlLnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ0bkJ1eS52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhpdENvZGUudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8g5aWH5YG25paH5a2X6aKc6ImyXHJcbiAgICAgICAgICAgIGlmIChpdGVtLmlzID09PSAxKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9kZF9ldmVuLmNvbG9yID0gJyNmMTQ4NDgnO1xyXG4gICAgICAgICAgICB9ZWxzZSBpZihpdGVtLmlzID09PSAyKXtcclxuICAgICAgICAgICAgICAgIHRoaXMub2RkX2V2ZW4uY29sb3IgPSAnIzI1ZmZmZCc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8g5aSn5bCP5paH5a2X6aKc6ImyXHJcbiAgICAgICAgICAgIGlmICghaXRlbS5pc0JpZyAmJiBpdGVtLmlzICE9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmlzQmlnLmNvbG9yID0gJyNmMTQ4NDgnO1xyXG4gICAgICAgICAgICB9ZWxzZSBpZihpdGVtLmlzQmlnICYmIGl0ZW0uaXMgIT09IDApe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pc0JpZy5jb2xvciA9ICcjMjVmZmZkJztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKirnq4vljbPotK3kubAgKi9cclxuICAgIHByaXZhdGUgYnRuQnV5RnVuYygpe1xyXG4gICAgICAgIGNvbnNvbGUubG9nKHRoaXMuX2l0ZW0ucGVyaW9kKTtcclxuICAgICAgICBUYWJiYXIuZ2V0SW5zdGFuY2UoKS5vcGVuU2NlbmUoJ2d1ZXNzaW5nLnNjZW5lJyx0aGlzLl9pdGVtLmdvb2RzSWQpXHJcbiAgICB9XHJcbn0iLCIvKipUaGlzIGNsYXNzIGlzIGF1dG9tYXRpY2FsbHkgZ2VuZXJhdGVkIGJ5IExheWFBaXJJREUsIHBsZWFzZSBkbyBub3QgbWFrZSBhbnkgbW9kaWZpY2F0aW9ucy4gKi9cbmltcG9ydCBWaWV3PUxheWEuVmlldztcclxuaW1wb3J0IERpYWxvZz1MYXlhLkRpYWxvZztcclxuaW1wb3J0IFNjZW5lPUxheWEuU2NlbmU7XG5leHBvcnQgbW9kdWxlIHVpIHtcclxuICAgIGV4cG9ydCBjbGFzcyBhc3Npc3RhbnRVSSBleHRlbmRzIExheWEuU2NlbmUge1xyXG5cdFx0cHVibGljIGJ0bl90cmVuZDpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBidG5fcHJlYnV5OkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIGNhdGVUYWJMaXN0OkxheWEuTGlzdDtcblx0XHRwdWJsaWMgbGlzdFRpdGxlOkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyB0cmVuZExpc3Q6TGF5YS5MaXN0O1xuXHRcdHB1YmxpYyBwcmVidXk6TGF5YS5MaXN0O1xuXHRcdHB1YmxpYyBub0RhdGE6TGF5YS5JbWFnZTtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcImFzc2lzdGFudFwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgQ2FyZFVJIGV4dGVuZHMgTGF5YS5WaWV3IHtcclxuXHRcdHB1YmxpYyBhbmkxOkxheWEuRnJhbWVBbmltYXRpb247XG5cdFx0cHVibGljIGNhcmRJdGVtOkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIHNjZW5lSW1nOkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIGdvb2RzTmFtZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBhd2FyZDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBwcm9ncmVzczpMYXlhLlByb2dyZXNzQmFyO1xuXHRcdHB1YmxpYyBzb2xkTnVtX3RvdGFsTnVtOkxheWEuTGFiZWw7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJDYXJkXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBncmFuZFByaXhVSSBleHRlbmRzIExheWEuU2NlbmUge1xyXG5cdFx0cHVibGljIENvdW50RG93bjpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBib251czpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyByYW5rUHJpemVIZWxwOkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyBteVJhbmtCb3g6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgbXlyYW5raW5nOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGF2YXRhcjpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBuaWNrTmFtZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyB1aWQ6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgdm9sdW1lVGl0bGU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgdm9sdW1lOkxheWEuTGFiZWw7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJncmFuZFByaXhcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIGd1ZXNzaW5nVUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyBwcmljZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBnb29kc1ZhbHVlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHByb2dyZXNzU3BlZWQ6TGF5YS5Qcm9ncmVzc0Jhcjtcblx0XHRwdWJsaWMgc29sZE51bV9zb2xkTnVtOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHBlcmlvZDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBudW1iZXJMaXN0OkxheWEuTGlzdDtcblx0XHRwdWJsaWMgZXN0aW1hdGU6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIHRvdGFsOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGJhbGFuY2VCb3g6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIGJhbGFuY2U6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgYnRuX2J1eTpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBidG5fc2VsZWN0OkxheWEuVmlldztcblx0XHRwdWJsaWMgcmFuZG9tX29uZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyByYW5kb21fYmVmb3JlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHJhbmRvbV9hZnRlcjpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyByYW5kb21fYWxsOkxheWEuTGFiZWw7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJndWVzc2luZ1wiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgaG9tZVVJIGV4dGVuZHMgTGF5YS5TY2VuZSB7XHJcblx0XHRwdWJsaWMgcHV0X2luOkxheWEuRnJhbWVBbmltYXRpb247XG5cdFx0cHVibGljIHJvY2tldF9zaG93OkxheWEuRnJhbWVBbmltYXRpb247XG5cdFx0cHVibGljIGRvbV9zaG93OkxheWEuRnJhbWVBbmltYXRpb247XG5cdFx0cHVibGljIGJnX2FuaTpMYXlhLkZyYW1lQW5pbWF0aW9uO1xuXHRcdHB1YmxpYyBiZ19hbmltYXRpb246TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIHR1aWNodTpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBBY2NvdW50Qm94OkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIGF2YXRhcjpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBuaWNrTmFtZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyByZWNoYXJnZUJveDpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBidG5SZWNoYXJnZTpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBteUFtb3VudDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBidXlIZWxwOkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyByb2NrZXJCb3g6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIGNvdW50RG93bjpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgcm9ja2V0QW1vdW50OkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHJvY2tldENvdW50RG93bjpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBsaXN0OkxheWEuTGlzdDtcblx0XHRwdWJsaWMgcHV0aW46TGF5YS5TcHJpdGU7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJob21lXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyByZWNvcmRVSSBleHRlbmRzIExheWEuU2NlbmUge1xyXG5cdFx0cHVibGljIGNhbnl1OkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIHdhbmdxaTpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBqb2luTGlzdDpMYXlhLkxpc3Q7XG5cdFx0cHVibGljIHByZXZpb291c0xpc3Q6TGF5YS5MaXN0O1xuXHRcdHB1YmxpYyBub0RhdGE6TGF5YS5JbWFnZTtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInJlY29yZFwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgVGFiYmFyVUkgZXh0ZW5kcyBMYXlhLlZpZXcge1xyXG5cdFx0cHVibGljIHRhYjpMYXlhLlRhYjtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcIlRhYmJhclwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0IG1vZHVsZSB1aS50ZW1wbGF0ZSB7XHJcbiAgICBleHBvcnQgY2xhc3MgSW5wdXRQd2REaWFsb2dVSSBleHRlbmRzIExheWEuRGlhbG9nIHtcclxuXHRcdHB1YmxpYyB0aXRsZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBidG5DbG9zZTpMYXlhLkJveDtcblx0XHRwdWJsaWMgSXB0UHN3OkxheWEuVGV4dElucHV0O1xuXHRcdHB1YmxpYyBmb3JnZXRQYXNzd29yZDpMYXlhLkxhYmVsO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwidGVtcGxhdGUvSW5wdXRQd2REaWFsb2dcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIGpvaW5SZWNvcmRzVUkgZXh0ZW5kcyBMYXlhLlZpZXcge1xyXG5cdFx0cHVibGljIHBlcmlvZDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBub1ByaXplOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHByaXplOkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIGdvb2RzVmFsdWU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgb3BlblRpbWU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgaGl0Q29kZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBjb2RlTGlzdDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBhd2FyZDpMYXlhLkxhYmVsO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwidGVtcGxhdGUvam9pblJlY29yZHNcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIG51bWJlckxpc3RET01VSSBleHRlbmRzIExheWEuVmlldyB7XHJcblx0XHRwdWJsaWMgYmdJbWc6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgY29kZTpMYXlhLkxhYmVsO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwidGVtcGxhdGUvbnVtYmVyTGlzdERPTVwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgcHJldmlvdXNSZWNvcmRzVUkgZXh0ZW5kcyBMYXlhLlZpZXcge1xyXG5cdFx0cHVibGljIHBlcmlvZDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyByZXF1ZXN0VHlwZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBnb29kc05hbWU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgdHhIYXNoOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGhpdENvZGU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgb3BlblRpbWU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgam9pbmVkTnVtOkxheWEuTGFiZWw7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJ0ZW1wbGF0ZS9wcmV2aW91c1JlY29yZHNcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIFRpcHNEaWFsb2dVSSBleHRlbmRzIExheWEuRGlhbG9nIHtcclxuXHRcdHB1YmxpYyB0aXRsZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBidG5WaWV3UmVjb3JkOkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIGJ0bkNvbnRpbnVlOkxheWEuSW1hZ2U7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJ0ZW1wbGF0ZS9UaXBzRGlhbG9nXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyB0cmVuZExpc3RVSSBleHRlbmRzIExheWEuU2NlbmUge1xyXG5cdFx0cHVibGljIHBlcmlvZDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBoaXRDb2RlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGJ0bkJ1eTpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBvZGRfZXZlbjpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBpc0JpZzpMYXlhLkxhYmVsO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwidGVtcGxhdGUvdHJlbmRMaXN0XCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyIiwiZXhwb3J0IGNvbnN0IExheWVyVHlwZSA9IHtcclxuICAgIExBWUVSX1NDRU5FOiBcIkxBWUVSX1NDRU5FXCIsXHJcbiAgICBMQVlFUl9VSTogXCJMQVlFUl9VSVwiLFxyXG4gICAgTEFZRVJfTVNHOiBcIkxBWUVSX01TR1wiXHJcbn1cclxuY29uc3QgbGF5ZXJNYXAgPSB7fTtcclxuXHJcbmV4cG9ydCBjbGFzcyBMYXllck1hbmFnZXIge1xyXG4gICAgc3RhdGljIGluaXRlZDogYm9vbGVhbjtcclxuICAgIHN0YXRpYyBpbml0KGxheWVyczogc3RyaW5nW10pIHtcclxuICAgICAgICBsYXllcnMuZm9yRWFjaCgobGF5ZXJOYW1lOiBzdHJpbmcpID0+IHtcclxuICAgICAgICAgICAgaWYgKGxheWVyTmFtZSA9PT0gTGF5ZXJUeXBlLkxBWUVSX1NDRU5FKSB7XHJcbiAgICAgICAgICAgICAgICBsYXllck1hcFtsYXllck5hbWVdID0gTGF5YS5TY2VuZS5yb290O1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbGF5ZXI6IExheWEuVUlDb21wb25lbnQgPSBsYXllck1hcFtsYXllck5hbWVdID0gbmV3IExheWEuVUlDb21wb25lbnQoKTtcclxuICAgICAgICAgICAgICAgIGxheWVyLmxlZnQgPSAwO1xyXG4gICAgICAgICAgICAgICAgbGF5ZXIucmlnaHQgPSAwO1xyXG4gICAgICAgICAgICAgICAgbGF5ZXIudG9wID0gMDtcclxuICAgICAgICAgICAgICAgIGxheWVyLmJvdHRvbSA9IDA7XHJcbiAgICAgICAgICAgICAgICBMYXlhLnN0YWdlLmFkZENoaWxkKGxheWVyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIC8vIExheWEuc3RhZ2Uub24oTGF5YS5FdmVudC5SRVNJWkUsIHRoaXMsIHRoaXMub25SZXNpemUpO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBhZGRUb0xheWVyKG5vZGU6IExheWEuTm9kZSwgbGF5ZXJOYW1lKTogQm9vbGVhbiB7XHJcbiAgICAgICAgTGF5ZXJNYW5hZ2VyLmNoZWNrSW5pdCgpO1xyXG4gICAgICAgIGlmICghbm9kZSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIGNvbnN0IGxheWVyID0gbGF5ZXJNYXBbbGF5ZXJOYW1lXTtcclxuICAgICAgICBpZiAoIWxheWVyKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgbGF5ZXIuYWRkQ2hpbGQobm9kZSk7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHJlbW92ZUZyb21MYXllcihub2RlOiBMYXlhLk5vZGUsIGxheWVyTmFtZSk6IEJvb2xlYW4ge1xyXG4gICAgICAgIExheWVyTWFuYWdlci5jaGVja0luaXQoKTtcclxuICAgICAgICBjb25zdCBsYXllcjogTGF5YS5VSUNvbXBvbmVudCA9IGxheWVyTWFwW2xheWVyTmFtZV07XHJcbiAgICAgICAgaWYgKGxheWVyKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJOb2RlOiBMYXlhLk5vZGUgPSBsYXllci5yZW1vdmVDaGlsZChub2RlKVxyXG4gICAgICAgICAgICBpZiAock5vZGUpIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGdldExheWVyKGxheWVyTmFtZSk6IExheWEuQ29tcG9uZW50IHtcclxuICAgICAgICByZXR1cm4gbGF5ZXJNYXBbbGF5ZXJOYW1lXTtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgY2hlY2tJbml0KCkge1xyXG4gICAgICAgIGlmIChMYXllck1hbmFnZXIuaW5pdGVkKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgTGF5ZXJNYW5hZ2VyLmluaXQoW1xyXG4gICAgICAgICAgICBMYXllclR5cGUuTEFZRVJfU0NFTkUsXHJcbiAgICAgICAgICAgIExheWVyVHlwZS5MQVlFUl9VSSxcclxuICAgICAgICAgICAgTGF5ZXJUeXBlLkxBWUVSX01TR1xyXG4gICAgICAgIF0pO1xyXG4gICAgICAgIExheWVyTWFuYWdlci5pbml0ZWQgPSB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc3RhdGljIG9uUmVzaXplKCk6IHZvaWQge1xyXG4gICAgICAgIGZvciAoY29uc3QgbGF5ZXJOYW1lIGluIGxheWVyTWFwKSB7XHJcbiAgICAgICAgICAgIGlmIChsYXllck5hbWUgIT09IExheWVyVHlwZS5MQVlFUl9TQ0VORSAmJiBsYXllck1hcC5oYXNPd25Qcm9wZXJ0eShsYXllck5hbWUpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBsYXllcjogTGF5YS5VSUNvbXBvbmVudCA9IGxheWVyTWFwW2xheWVyTmFtZV07XHJcbiAgICAgICAgICAgICAgICBsYXllci5zaXplKExheWEuc3RhZ2Uud2lkdGgsIExheWEuc3RhZ2UuaGVpZ2h0KTtcclxuICAgICAgICAgICAgICAgIGxheWVyLmV2ZW50KExheWEuRXZlbnQuUkVTSVpFKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbn0iLCIvKipcclxuICogQGF1dGhvciBbU2l3ZW5dXHJcbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cclxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NTA6MTBcclxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NTA6MTBcclxuICogQGRlc2Mg5bqV6YOo5a+86IiqVGFiYmFy6ISa5pysXHJcbiAqL1xyXG5pbXBvcnQgeyB1aSB9IGZyb20gJy4uL3VpL2xheWFNYXhVSSdcclxuXHJcblxyXG5jb25zdCB0YWJiYXJBcnI6c3RyaW5nW10gPSBbJ2hvbWUuc2NlbmUnLCdyZWNvcmQuc2NlbmUnLCdhc3Npc3RhbnQuc2NlbmUnXSAvL3RhYmJhcueahOmhtemdolxyXG5jb25zdCBwYWdlQXJyOnN0cmluZ1tdID0gWydndWVzc2luZy5zY2VuZScsJ2dyYW5kUHJpeC5zY2VuZSddIC8v6Z2edGFiYmFy6aG16Z2iXHJcblxyXG5leHBvcnQgY2xhc3MgVGFiYmFyIGV4dGVuZHMgdWkuVGFiYmFyVUkge1xyXG4gICAgLyoq6aG16Z2i5Lyg6YCS55qE5Y+C5pWwICovXHJcbiAgICBwcml2YXRlIF9vcGVuU2NlbmVQYXJhbTogYW55O1xyXG4gICAgLyoq6YCJ5Lit55qEdGFiYmFyICovXHJcbiAgICBzdGF0aWMgX3RhYmJhcjpUYWJiYXI7XHJcbiAgICAvKirpobXpnaLmlbDnu4QgKi9cclxuICAgIHN0YXRpYyByZWFkb25seSBTQ0VORVM6c3RyaW5nW10gPSBbLi4udGFiYmFyQXJyLC4uLnBhZ2VBcnJdXHJcblxyXG4gICAgc3RhdGljIGdldEluc3RhbmNlKCk6VGFiYmFyIHtcclxuICAgICAgICBpZighdGhpcy5fdGFiYmFyKXtcclxuICAgICAgICAgICAgdGhpcy5fdGFiYmFyID0gbmV3IFRhYmJhcigpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzLl90YWJiYXI7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHNob3coKXtcclxuICAgICAgICBsZXQgdGFiSW5zOlRhYmJhciA9IHRoaXMuZ2V0SW5zdGFuY2UoKVxyXG4gICAgICAgIExheWEuc3RhZ2UuYWRkQ2hpbGQodGFiSW5zKVxyXG4gICAgfVxyXG4gICAgc3RhdGljIGhpZGUoKXtcclxuICAgICAgICBpZih0aGlzLl90YWJiYXIpe1xyXG4gICAgICAgICAgICB0aGlzLl90YWJiYXIucmVtb3ZlU2VsZigpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKumdnnRhYmJhcui3s+i9rOmhtemdoizlj6/mkLrluKblj4LmlbAgKi9cclxuICAgIG9wZW5TY2VuZShzY2VuZTogc3RyaW5nLCBwYXJhbT86IGFueSkge1xyXG4gICAgICAgIHRoaXMuX29wZW5TY2VuZVBhcmFtID0gcGFyYW07XHJcbiAgICAgICAgdGhpcy50YWIuc2VsZWN0ZWRJbmRleCA9IFRhYmJhci5TQ0VORVMuaW5kZXhPZihzY2VuZSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoq55uR6KeGdGFiYmFy5pS55Y+YICovXHJcbiAgICBjcmVhdGVWaWV3KHZpZXc6YW55KXtcclxuICAgICAgICBzdXBlci5jcmVhdGVWaWV3KHZpZXcpXHJcbiAgICAgICAgdGhpcy50YWIub24oTGF5YS5FdmVudC5DSEFOR0UsdGhpcyx0aGlzLm9uQ2xpY2tUYWIpO1xyXG4gICAgICAgIHRoaXMub25DbGlja1RhYigpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKueCueWHu3RhYmJhcuS6i+S7tiAqL1xyXG4gICAgb25DbGlja1RhYigpIHtcclxuICAgICAgICBsZXQgc2NlbmU6c3RyaW5nID0gVGFiYmFyLlNDRU5FU1t0aGlzLnRhYi5zZWxlY3RlZEluZGV4XVxyXG4gICAgICAgIExheWEuU2NlbmUub3BlbihzY2VuZSwgdHJ1ZSwgdGhpcy5fb3BlblNjZW5lUGFyYW0pO1xyXG4gICAgICAgIHRoaXMuX29wZW5TY2VuZVBhcmFtID0gbnVsbDtcclxuXHJcbiAgICAgICAgdGhpcy50YWIuaXRlbXMuZm9yRWFjaChpdGVtPT57XHJcbiAgICAgICAgICAgIGNvbnN0IHRhYkJ0bjogTGF5YS5CdXR0b24gPSBpdGVtIGFzIExheWEuQnV0dG9uO1xyXG4gICAgICAgICAgICBjb25zdCBpbWdCdG46IExheWEuQnV0dG9uID0gdGFiQnRuLmdldENoaWxkQXQoMCkgYXMgTGF5YS5CdXR0b247XHJcbiAgICAgICAgICAgIGltZ0J0bi5zZWxlY3RlZCA9IGZhbHNlO1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgdGFiYmFyQXJyLmZvckVhY2goaXRlbT0+e1xyXG4gICAgICAgICAgICBpZiAoaXRlbSA9PT0gc2NlbmUpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRhYkJ0bjogTGF5YS5CdXR0b24gPSB0aGlzLnRhYi5zZWxlY3Rpb24gYXMgTGF5YS5CdXR0b247XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpbWdCdG46IExheWEuQnV0dG9uID0gdGFiQnRuLmdldENoaWxkQXQoMCkgYXMgTGF5YS5CdXR0b247XHJcbiAgICAgICAgICAgICAgICBpbWdCdG4uc2VsZWN0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgICBcclxuICAgIH1cclxufSIsImltcG9ydCB7IExheWVyTWFuYWdlciwgTGF5ZXJUeXBlIH0gZnJvbSBcIi4vTGF5ZXJNYW5hZ2VyXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgVG9hc3QgZXh0ZW5kcyBMYXlhLlVJQ29tcG9uZW50IHtcclxuXHJcbiAgICBzdGF0aWMgTUlOX1dJRFRIOiBudW1iZXIgPSAyMDA7XHJcbiAgICBzdGF0aWMgTUFYX1dJRFRIOiBudW1iZXIgPSA1MDA7XHJcbiAgICBzdGF0aWMgVE9QOiBudW1iZXIgPSAyMztcclxuICAgIHN0YXRpYyBCT1RUT006IG51bWJlciA9IDIwO1xyXG4gICAgc3RhdGljIE1BUkdJTjogbnVtYmVyID0gMTU7XHJcbiAgICBzdGF0aWMgTUlOX0hFSUdIVDogbnVtYmVyID0gODA7XHJcbiAgICBzdGF0aWMgRk9OVF9TSVpFOiBudW1iZXIgPSAyNjtcclxuICAgIHN0YXRpYyBDT0xPUjogc3RyaW5nID0gXCIjZmZmZmZmXCI7XHJcbiAgICBzdGF0aWMgQkdfSU1HX1VSTDogc3RyaW5nID0gXCJjb21wL2ltZ190b2FzdF9iZy5wbmdcIjtcclxuICAgIHN0YXRpYyBEVVJBVElPTjogbnVtYmVyID0gMzAwMDtcclxuXHJcbiAgICBwcml2YXRlIHN0YXRpYyBpbnN0YW5jZTogVG9hc3Q7XHJcbiAgICBwcml2YXRlIHN0YXRpYyBzdG9yZVRleHRMaXN0OiBhbnlbXSA9IFtdO1xyXG5cclxuICAgIHN0YXRpYyBzaG93KHRleHQ6IHN0cmluZywgZHVyYXRpb246IG51bWJlciA9IFRvYXN0LkRVUkFUSU9OLCBjb3ZlckJlZm9yZTogYm9vbGVhbiA9IHRydWUpIHtcclxuICAgICAgICBpZiAoIVRvYXN0Lmluc3RhbmNlKSB7XHJcbiAgICAgICAgICAgIFRvYXN0Lmluc3RhbmNlID0gbmV3IFRvYXN0KCk7XHJcbiAgICAgICAgICAgIFRvYXN0Lmluc3RhbmNlLm9uKExheWEuRXZlbnQuQ0xPU0UsIFRvYXN0LCBUb2FzdC5vbkNsb3NlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGNvdmVyQmVmb3JlICYmIFRvYXN0Lmluc3RhbmNlLnBhcmVudCkge1xyXG4gICAgICAgICAgICBUb2FzdC5pbnN0YW5jZS5zZXRUZXh0KHRleHQpO1xyXG4gICAgICAgICAgICBUb2FzdC5pbnN0YW5jZS50aW1lci5vbmNlKGR1cmF0aW9uIHx8IFRvYXN0LkRVUkFUSU9OLCBUb2FzdC5pbnN0YW5jZSwgVG9hc3QuaW5zdGFuY2UuY2xvc2UsIG51bGwsIHRydWUpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoIVRvYXN0Lmluc3RhbmNlLnBhcmVudCkge1xyXG4gICAgICAgICAgICBUb2FzdC5kb1Nob3codGV4dCwgZHVyYXRpb24pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIFRvYXN0LnN0b3JlVGV4dExpc3QucHVzaCh7XHJcbiAgICAgICAgICAgICAgICB0ZXh0OiB0ZXh0LFxyXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IGR1cmF0aW9uXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcm90ZWN0ZWQgc3RhdGljIGRvU2hvdyh0ZXh0OiBzdHJpbmcsIGR1cmF0aW9uOiBudW1iZXIpIHtcclxuICAgICAgICBUb2FzdC5pbnN0YW5jZS5zZXRUZXh0KHRleHQpO1xyXG4gICAgICAgIExheWVyTWFuYWdlci5hZGRUb0xheWVyKFRvYXN0Lmluc3RhbmNlLCBMYXllclR5cGUuTEFZRVJfTVNHKTtcclxuICAgICAgICBUb2FzdC5pbnN0YW5jZS50aW1lci5vbmNlKGR1cmF0aW9uIHx8IFRvYXN0LkRVUkFUSU9OLCBUb2FzdC5pbnN0YW5jZSwgVG9hc3QuaW5zdGFuY2UuY2xvc2UsIG51bGwsIHRydWUpO1xyXG4gICAgfVxyXG5cclxuICAgIHByb3RlY3RlZCBzdGF0aWMgb25DbG9zZSgpIHtcclxuICAgICAgICBpZiAoVG9hc3Quc3RvcmVUZXh0TGlzdC5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIHZhciBkYXRhOiBhbnkgPSBUb2FzdC5zdG9yZVRleHRMaXN0LnNoaWZ0KCk7XHJcbiAgICAgICAgICAgIFRvYXN0LmRvU2hvdyhkYXRhLnRleHQsIGRhdGEuZHVyYXRpb24pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBiZzogTGF5YS5JbWFnZTtcclxuICAgIGxhYmVsOiBMYXlhLkxhYmVsO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0VGV4dCh0ZXh0OiBzdHJpbmcpIHtcclxuICAgICAgICB0aGlzLndpZHRoID0gVG9hc3QuTUFYX1dJRFRIO1xyXG4gICAgICAgIHRoaXMubGFiZWwud2lkdGggPSBOYU47XHJcbiAgICAgICAgdGhpcy5sYWJlbC5kYXRhU291cmNlID0gdGV4dDtcclxuICAgICAgICB0aGlzLm9uVGV4dENoYW5nZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGNsb3NlKCkge1xyXG4gICAgICAgIHRoaXMucmVtb3ZlU2VsZigpO1xyXG4gICAgICAgIHRoaXMuZXZlbnQoTGF5YS5FdmVudC5DTE9TRSk7XHJcbiAgICB9XHJcblxyXG4gICAgY3JlYXRlQ2hpbGRyZW4oKSB7XHJcbiAgICAgICAgdGhpcy5jZW50ZXJYID0gMDtcclxuICAgICAgICB0aGlzLmhlaWdodCA9IFRvYXN0Lk1BUkdJTiArIFRvYXN0Lk1BUkdJTjtcclxuXHJcbiAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICB0aGlzLmJnID0gbmV3IExheWEuSW1hZ2UoKTtcclxuICAgICAgICB0aGlzLmJnLnNraW4gPSBUb2FzdC5CR19JTUdfVVJMO1xyXG4gICAgICAgIHRoaXMuYmcuc2l6ZUdyaWQgPSBcIjI1LDI1LDI1LDI1XCI7XHJcbiAgICAgICAgdGhpcy5iZy5sZWZ0ID0gdGhpcy5iZy5yaWdodCA9IHRoaXMuYmcudG9wID0gdGhpcy5iZy5ib3R0b20gPSAwO1xyXG4gICAgICAgIHRoaXMuYWRkQ2hpbGQodGhpcy5iZyk7XHJcblxyXG4gICAgICAgIHRoaXMubGFiZWwgPSBuZXcgTGF5YS5MYWJlbCgpO1xyXG4gICAgICAgIHRoaXMubGFiZWwuY29sb3IgPSBUb2FzdC5DT0xPUjtcclxuICAgICAgICB0aGlzLmxhYmVsLmZvbnRTaXplID0gVG9hc3QuRk9OVF9TSVpFO1xyXG4gICAgICAgIHRoaXMubGFiZWwuYWxpZ24gPSBcImNlbnRlclwiO1xyXG4gICAgICAgIHRoaXMubGFiZWwueSA9IFRvYXN0LlRPUDtcclxuICAgICAgICB0aGlzLmxhYmVsLmNlbnRlclggPSAwO1xyXG4gICAgICAgIC8vIHRoaXMubGFiZWwuY2VudGVyWSA9IDA7XHJcbiAgICAgICAgLy8gdGhpcy5sYWJlbC5zdHJva2UgPSAxO1xyXG4gICAgICAgIC8vIHRoaXMubGFiZWwuc3Ryb2tlQ29sb3IgPSBcIiMwMDAwMDBcIjtcclxuICAgICAgICAvLyB0aGlzLmxhYmVsLnRvcCA9IFRvYXN0Lk1BUkdJTjtcclxuICAgICAgICAvLyB0aGlzLmxhYmVsLmJvdHRvbSA9IFRvYXN0Lk1BUkdJTjtcclxuICAgICAgICAvLyB0aGlzLmxhYmVsLmxlZnQgPSBUb2FzdC5NQVJHSU47XHJcbiAgICAgICAgLy8gdGhpcy5sYWJlbC5yaWdodCA9IFRvYXN0Lk1BUkdJTjtcclxuICAgICAgICB0aGlzLmxhYmVsLmxlYWRpbmcgPSAxNTtcclxuICAgICAgICB0aGlzLmxhYmVsLndvcmRXcmFwID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLmFkZENoaWxkKHRoaXMubGFiZWwpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICAvLyBwcm90ZWN0ZWQgaW5pdGlhbGl6ZSgpIHtcclxuICAgIC8vICAgICBzdXBlci5pbml0aWFsaXplKCk7XHJcbiAgICAvLyAgICAgdGhpcy5iaW5kVmlld0V2ZW50KHRoaXMubGFiZWwsIExheWEuRXZlbnQuQ0hBTkdFLCB0aGlzLm9uVGV4dENoYW5nZSk7XHJcbiAgICAvLyB9XHJcblxyXG4gICAgcHJvdGVjdGVkIG9uVGV4dENoYW5nZSgpIHtcclxuICAgICAgICBsZXQgdGV4dFc6IG51bWJlciA9IHRoaXMubGFiZWwud2lkdGg7XHJcbiAgICAgICAgY29uc3QgbWF4VGV4dFc6IG51bWJlciA9IFRvYXN0Lk1BWF9XSURUSCAtIFRvYXN0Lk1BUkdJTiAqIDI7XHJcbiAgICAgICAgLy8gY29uc3QgbWluVGV4dFc6IG51bWJlciA9IFRvYXN0Lk1JTl9XSURUSCAtIFRvYXN0Lk1BUkdJTiAqIDI7XHJcbiAgICAgICAgaWYgKHRleHRXID4gbWF4VGV4dFcpIHtcclxuICAgICAgICAgICAgdGhpcy5sYWJlbC53aWR0aCA9IG1heFRleHRXO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgdzogbnVtYmVyID0gdGhpcy5sYWJlbC53aWR0aCArIFRvYXN0Lk1BUkdJTiAqIDI7XHJcbiAgICAgICAgdyA9IE1hdGgubWluKHcsIFRvYXN0Lk1BWF9XSURUSCk7XHJcbiAgICAgICAgdyA9IE1hdGgubWF4KHcsIFRvYXN0Lk1JTl9XSURUSCk7XHJcbiAgICAgICAgdGhpcy53aWR0aCA9IHc7XHJcbiAgICAgICAgLy8gdGhpcy5oZWlnaHQgPSB0aGlzLmxhYmVsLmhlaWdodCArIFRvYXN0LlRPUCArIFRvYXN0LkJPVFRPTTtcclxuICAgICAgICB0aGlzLmhlaWdodCA9IHRoaXMubGFiZWwuaGVpZ2h0ICsgVG9hc3QuTUFSR0lOICogMjtcclxuICAgICAgICB0aGlzLnggPSAoTGF5YS5zdGFnZS53aWR0aCAtIHRoaXMud2lkdGgpID4+IDE7XHJcbiAgICAgICAgdGhpcy55ID0gKExheWEuc3RhZ2UuaGVpZ2h0IC0gdGhpcy5oZWlnaHQpID4+IDE7XHJcbiAgICB9XHJcblxyXG4gICAgcHJvdGVjdGVkIG9uQ29tcFJlc2l6ZSgpIHtcclxuICAgICAgICAvLyBpZiAodGhpcy5sYWJlbCkge1xyXG4gICAgICAgIC8vICAgICB0aGlzLmhlaWdodCA9IHRoaXMubGFiZWwuaGVpZ2h0ICsgTWVzc2FnZVRpcC5NQVJHSU4gKyBNZXNzYWdlVGlwLk1BUkdJTjtcclxuICAgICAgICAvLyB9XHJcbiAgICAgICAgaWYgKHRoaXMuYmcpIHtcclxuICAgICAgICAgICAgdGhpcy5iZy53aWR0aCA9IHRoaXMud2lkdGg7XHJcbiAgICAgICAgICAgIHRoaXMuYmcuaGVpZ2h0ID0gdGhpcy5oZWlnaHQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXHJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcclxuXHJcbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxyXG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcclxuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxyXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxyXG5cclxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XHJcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XHJcblxyXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XHJcbn1cclxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xyXG59XHJcbihmdW5jdGlvbiAoKSB7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcclxuICAgICAgICB9XHJcbiAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XHJcbiAgICB9XHJcbiAgICB0cnkge1xyXG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xyXG4gICAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xyXG4gICAgfVxyXG59ICgpKVxyXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xyXG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcclxuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcclxuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xyXG4gICAgfVxyXG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcclxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xyXG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xyXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XHJcbiAgICB9XHJcbiAgICB0cnkge1xyXG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcclxuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xyXG4gICAgfSBjYXRjaChlKXtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xyXG4gICAgICAgIH0gY2F0Y2goZSl7XHJcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXHJcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxufVxyXG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XHJcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcclxuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcclxuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XHJcbiAgICB9XHJcbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXHJcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcclxuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XHJcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xyXG4gICAgfVxyXG4gICAgdHJ5IHtcclxuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXHJcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xyXG4gICAgfSBjYXRjaCAoZSl7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxyXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcclxuICAgICAgICB9IGNhdGNoIChlKXtcclxuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXHJcbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcblxyXG59XHJcbnZhciBxdWV1ZSA9IFtdO1xyXG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcclxudmFyIGN1cnJlbnRRdWV1ZTtcclxudmFyIHF1ZXVlSW5kZXggPSAtMTtcclxuXHJcbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcclxuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGRyYWluaW5nID0gZmFsc2U7XHJcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xyXG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcclxuICAgIH1cclxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcclxuICAgICAgICBkcmFpblF1ZXVlKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XHJcbiAgICBpZiAoZHJhaW5pbmcpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcclxuICAgIGRyYWluaW5nID0gdHJ1ZTtcclxuXHJcbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xyXG4gICAgd2hpbGUobGVuKSB7XHJcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XHJcbiAgICAgICAgcXVldWUgPSBbXTtcclxuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XHJcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcclxuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XHJcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xyXG4gICAgfVxyXG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcclxuICAgIGRyYWluaW5nID0gZmFsc2U7XHJcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XHJcbn1cclxuXHJcbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XHJcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XHJcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcclxuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xyXG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcclxuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xyXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcclxuICAgIHRoaXMuZnVuID0gZnVuO1xyXG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xyXG59XHJcbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xyXG59O1xyXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xyXG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xyXG5wcm9jZXNzLmVudiA9IHt9O1xyXG5wcm9jZXNzLmFyZ3YgPSBbXTtcclxucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXHJcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcclxuXHJcbmZ1bmN0aW9uIG5vb3AoKSB7fVxyXG5cclxucHJvY2Vzcy5vbiA9IG5vb3A7XHJcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xyXG5wcm9jZXNzLm9uY2UgPSBub29wO1xyXG5wcm9jZXNzLm9mZiA9IG5vb3A7XHJcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xyXG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XHJcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XHJcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcclxucHJvY2Vzcy5wcmVwZW5kT25jZUxpc3RlbmVyID0gbm9vcDtcclxuXHJcbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cclxuXHJcbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XHJcbn07XHJcblxyXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xyXG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcclxufTtcclxucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcclxuIl19
