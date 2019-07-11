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

},{}],2:[function(require,module,exports){
module.exports = require('./lib/axios');
},{"./lib/axios":4}],3:[function(require,module,exports){
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

},{"../core/createError":10,"./../core/settle":13,"./../helpers/btoa":17,"./../helpers/buildURL":18,"./../helpers/cookies":20,"./../helpers/isURLSameOrigin":22,"./../helpers/parseHeaders":24,"./../utils":26,"_process":1}],4:[function(require,module,exports){
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

},{"./cancel/Cancel":5,"./cancel/CancelToken":6,"./cancel/isCancel":7,"./core/Axios":8,"./defaults":15,"./helpers/bind":16,"./helpers/spread":25,"./utils":26}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
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

},{"./Cancel":5}],7:[function(require,module,exports){
'use strict';

module.exports = function isCancel(value) {
  return !!(value && value.__CANCEL__);
};

},{}],8:[function(require,module,exports){
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

},{"./../defaults":15,"./../utils":26,"./InterceptorManager":9,"./dispatchRequest":11}],9:[function(require,module,exports){
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

},{"./../utils":26}],10:[function(require,module,exports){
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

},{"./enhanceError":12}],11:[function(require,module,exports){
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

},{"../cancel/isCancel":7,"../defaults":15,"./../helpers/combineURLs":19,"./../helpers/isAbsoluteURL":21,"./../utils":26,"./transformData":14}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
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

},{"./createError":10}],14:[function(require,module,exports){
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

},{"./../utils":26}],15:[function(require,module,exports){
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

},{"./adapters/http":3,"./adapters/xhr":3,"./helpers/normalizeHeaderName":23,"./utils":26,"_process":1}],16:[function(require,module,exports){
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

},{}],17:[function(require,module,exports){
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

},{}],18:[function(require,module,exports){
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

},{"./../utils":26}],19:[function(require,module,exports){
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

},{}],20:[function(require,module,exports){
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

},{"./../utils":26}],21:[function(require,module,exports){
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

},{}],22:[function(require,module,exports){
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

},{"./../utils":26}],23:[function(require,module,exports){
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

},{"../utils":26}],24:[function(require,module,exports){
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

},{"./../utils":26}],25:[function(require,module,exports){
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

},{}],26:[function(require,module,exports){
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

},{"./helpers/bind":16,"is-buffer":27}],27:[function(require,module,exports){
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

},{}],28:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**This class is automatically generated by LayaAirIDE, please do not make any modifications. */
var Assistant_1 = require("./script/Assistant");
var PageScript_1 = require("./publicScript/PageScript");
var Screen_1 = require("./publicScript/Screen");
var trendList_1 = require("./template/trendList");
var Card_1 = require("./script/Card");
var grandPrix_1 = require("./script/grandPrix");
var PageNavScript_1 = require("./publicScript/PageNavScript");
var prixList_1 = require("./template/prixList");
var Guessing_1 = require("./script/Guessing");
var numberListDomScript_1 = require("./template/numberListDomScript");
var Home_1 = require("./script/Home");
var loadingScene_1 = require("./script/loadingScene");
var priHistoryScene_1 = require("./script/priHistoryScene");
var priHistory_1 = require("./template/priHistory");
var Record_1 = require("./script/Record");
var joinRecords_1 = require("./template/joinRecords");
var previousRecords_1 = require("./template/previousRecords");
var shortListed_1 = require("./script/shortListed");
var shortListedList_1 = require("./template/shortListedList");
var pswInput_1 = require("./template/pswInput");
var rankingList_1 = require("./template/rankingList");
var rechargeDialog_1 = require("./template/rechargeDialog");
var rocketDialog_1 = require("./view/rocketDialog");
var tipDialog_1 = require("./template/tipDialog");
var winningList_1 = require("./template/winningList");
var winning_1 = require("./script/winning");
/*
* 游戏初始化配置;
*/
var GameConfig = /** @class */ (function () {
    function GameConfig() {
    }
    GameConfig.init = function () {
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
    };
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
    return GameConfig;
}());
exports.default = GameConfig;
GameConfig.init();
},{"./publicScript/PageNavScript":37,"./publicScript/PageScript":38,"./publicScript/Screen":39,"./script/Assistant":40,"./script/Card":41,"./script/Guessing":42,"./script/Home":43,"./script/Record":44,"./script/grandPrix":45,"./script/loadingScene":46,"./script/priHistoryScene":47,"./script/shortListed":48,"./script/winning":49,"./template/joinRecords":50,"./template/numberListDomScript":51,"./template/previousRecords":52,"./template/priHistory":53,"./template/prixList":54,"./template/pswInput":55,"./template/rankingList":56,"./template/rechargeDialog":57,"./template/shortListedList":58,"./template/tipDialog":59,"./template/trendList":60,"./template/winningList":61,"./view/rocketDialog":66}],29:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var GameConfig_1 = require("./GameConfig");
var rocketDialog_1 = require("./view/rocketDialog");
var loadingResList_1 = require("./loadingResList");
var socket_1 = require("./js/socket");
var Main = /** @class */ (function () {
    function Main() {
        // 在微信中，如果跳转到游戏之前页面修改了innerWdth和innerHeight，会导致宽高计算错误
        var win = window;
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
    Main.prototype.onVersionLoaded = function () {
        //激活大小图映射，加载小图的时候，如果发现小图在大图合集里面，则优先加载大图合集，而不是小图
        Laya.AtlasInfoManager.enable("fileconfig.json", Laya.Handler.create(this, this.onConfigLoaded));
    };
    Main.prototype.onConfigLoaded = function () {
        // 连接websocket
        socket_1.Socket.createSocket();
        Laya.Scene.open(GameConfig_1.default.startScene, true, null, Laya.Handler.create(this, this.onLoadingSceneOpened));
    };
    Main.prototype.onLoadingSceneOpened = function (loadingScene) {
        //预加载
        Laya.loader.load(loadingResList_1.loadingResList, Laya.Handler.create(this, this.onGameResLoaded), Laya.Handler.create(this, this.onGameResLoadProgress, [loadingScene], false));
    };
    Main.prototype.onGameResLoadProgress = function (loadingScene, progress) {
        console.log(loadingScene);
        loadingScene.setProgress(progress);
    };
    Main.prototype.onGameResLoaded = function () {
        //加载IDE指定的场景
        Laya.Scene.open('home.scene', true, null, Laya.Handler.create(this, (function () {
            Laya.loader.load(loadingResList_1.loadingResList1);
        })));
    };
    return Main;
}());
//激活启动类
new Main();
},{"./GameConfig":28,"./js/socket":34,"./loadingResList":36,"./view/rocketDialog":66}],30:[function(require,module,exports){
"use strict";
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-20 14:11:26
 * @modify date 2019-02-20 14:11:26
 * @desc 数据通信及保存接口
 */
Object.defineProperty(exports, "__esModule", { value: true });
var GameModel = /** @class */ (function (_super) {
    __extends(GameModel, _super);
    function GameModel() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        /**保存用户信息 */
        _this.userInfo = {}; //用户信息
        /**保存被购买号码 */
        _this.buyGoodsArr = []; //被购买号码
        /**保存火箭数据 */
        _this.rocketData = {};
        /**火箭大奖排行名单 */
        _this.rocketRanking = [];
        return _this;
    }
    GameModel.getInstance = function () {
        if (!this._gameModelInstance) {
            this._gameModelInstance = new GameModel();
        }
        return this._gameModelInstance;
    };
    GameModel.prototype.setUserInfo = function (userInfo) {
        this.userInfo = userInfo;
        this.event('getUserInfo', this.userInfo);
    };
    GameModel.prototype.setGoodsArr = function (goodsArr) {
        this.buyGoodsArr = goodsArr;
        this.event('getbuyGoodsArr', [this.buyGoodsArr]);
    };
    GameModel.prototype.setRocketData = function (data) {
        this.rocketData = data;
        this.event('getRocketData', this.rocketData);
    };
    /**是否开奖了 */
    GameModel.prototype.isToggle = function (status) {
        this.event('isToggle', status);
    };
    /**通知中奖 */
    GameModel.prototype.noticeFunc = function (status) {
        this.event('getNotice', status);
    };
    GameModel.prototype.setRocketRanking = function (data) {
        this.rocketRanking = data;
        this.event('getRocketRanking', [this.rocketRanking]);
    };
    return GameModel;
}(Laya.EventDispatcher));
exports.GameModel = GameModel;
},{}],31:[function(require,module,exports){
"use strict";
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-20 15:15:08
 * @modify date 2019-02-20 15:15:08
 * @desc api接口统一封装处理
 */
Object.defineProperty(exports, "__esModule", { value: true });
var http_1 = require("./http");
var GameModel_1 = require("./GameModel");
exports.default = {
    /**获取用户信息 */
    getUserInfo: function () {
        return new Promise(function (resolve, reject) {
            http_1.get('/user/getInfo', {}).then(function (res) {
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
    getRankToday: function () {
        return new Promise(function (resolve, reject) {
            http_1.get('/rank/today', {}).then(function (res) {
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
    getRankHistory: function (countTime) {
        return new Promise(function (resolve, reject) {
            http_1.get('/rank/history', { countTime: countTime }).then(function (res) {
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
    getGoodsList: function () {
        return new Promise(function (resolve, reject) {
            http_1.get('/goods/index', {}).then(function (res) {
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
    getGoodsDetails: function (goodsId) {
        return new Promise(function (resolve, reject) {
            http_1.get('/goods/get', { goodsId: goodsId }).then(function (res) {
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
    getMyOrders: function (page, pageSize) {
        if (page === void 0) { page = 1; }
        if (pageSize === void 0) { pageSize = 20; }
        return new Promise(function (resolve, reject) {
            http_1.get('/order/myOrders', { page: page, pageSize: pageSize }).then(function (res) {
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
    getGoodsHistory: function (page, pageSize, countTime, searchKey) {
        if (page === void 0) { page = 1; }
        if (pageSize === void 0) { pageSize = 20; }
        return new Promise(function (resolve, reject) {
            http_1.get('/goods/history', { page: page, pageSize: pageSize, countTime: countTime, searchKey: searchKey }).then(function (res) {
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
    getGoodsCateList: function () {
        return new Promise(function (resolve, reject) {
            http_1.get('/goods/cateList', {}).then(function (res) {
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
    getGoodsTrend: function (goodsType, page, pageSize) {
        if (page === void 0) { page = 1; }
        if (pageSize === void 0) { pageSize = 20; }
        return new Promise(function (resolve, reject) {
            http_1.get('/goods/trend', { goodsType: goodsType, page: page, pageSize: pageSize }).then(function (res) {
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
    getXctjList: function (page, pageSize) {
        if (page === void 0) { page = 1; }
        if (pageSize === void 0) { pageSize = 20; }
        return new Promise(function (resolve, reject) {
            http_1.get('/Xctj/bonusLists', { page: page, pageSize: pageSize }).then(function (res) {
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
    getShortListed: function (page, pageSize, date) {
        if (page === void 0) { page = 1; }
        if (pageSize === void 0) { pageSize = 20; }
        return new Promise(function (resolve, reject) {
            http_1.get('/Xctj/shortListed', { page: page, pageSize: pageSize, date: date }).then(function (res) {
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
    postTradeBuy: function (period, codeList, exchangePwd) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            http_1.post('/trade/buy', { period: period, codeList: codeList, exchangePwd: exchangePwd }).then(function (res) {
                if (!res.code) {
                    _this.getUserInfo();
                    resolve(res);
                }
                else {
                    reject(res);
                }
            });
        });
    },
};
},{"./GameModel":30,"./http":32}],32:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:45:06
 * @modify date 2019-02-19 17:45:06
 * @desc axios网络请求封装
 */
var axios_1 = require("axios");
axios_1.default.defaults.timeout = 10000;
axios_1.default.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
axios_1.default.defaults.withCredentials = true; //请求携带cookie
// axios.defaults.crossDomain = true;  //请求携带额外数据(不包含cookie)
var domain = document.domain;
if (domain.indexOf('t-center') >= 0 || domain === 'localhost') {
    axios_1.default.defaults.baseURL = 'https://t-api.xyhj.io/v1/w/zh/';
    // axios.defaults.baseURL = 'https://game.xyhj.io/v1/w/zh'
}
else {
    axios_1.default.defaults.baseURL = 'https://game.xyhj.io/v1/w/zh';
}
/**将post数据转为formData格式 */
function formDataFunc(params) {
    var form = new FormData();
    for (var key in params) {
        form.append(key, params[key]);
    }
    return form;
}
/**游戏平台接口 */
var gameCenter = ['/user/login', '/user/getInfo'];
//http request 拦截器
axios_1.default.interceptors.request.use(function (config) {
    //设置AHost
    if (config.url.indexOf('/user/') >= 0) {
        config.headers['AHost'] = 'gameCenter';
    }
    else {
        config.headers['AHost'] = 'starRocket';
    }
    if (config.method == 'post') {
        config.data = formDataFunc(__assign({}, config.data));
    }
    else if (config.method == 'get') {
        config.params = __assign({}, config.params);
    }
    return config;
}, function (error) {
    return Promise.reject(error);
});
//http response 拦截器
axios_1.default.interceptors.response.use(function (response) {
    if (!response.data.success) {
        //错误处理
    }
    return response;
}, function (error) {
    return Promise.reject(error);
});
/**
 * 封装get方法
 * @param url
 * @param data
 * @returns {Promise}
 */
function get(url, params) {
    return new Promise(function (resolve, reject) {
        axios_1.default.get(url, { params: params }).then(function (response) {
            if (!response.data.success) {
                resolve(response.data.error);
            }
            else {
                resolve(response.data.payload);
            }
        }).catch(function (err) {
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
    return new Promise(function (resolve, reject) {
        axios_1.default.post(url, data).then(function (response) {
            if (!response.data.success) {
                resolve(response.data.error);
            }
            else {
                resolve(response.data.payload);
            }
        }, function (err) {
            reject(err);
        });
    });
}
exports.post = post;
},{"axios":2}],33:[function(require,module,exports){
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
    getScreen: function () {
        var sceneContainer = Laya.Scene.root;
        for (var i = 0; i < sceneContainer.numChildren; i++) {
            var child = sceneContainer.getChildAt(i);
            if (child instanceof Laya.Scene) {
                return child;
            }
        }
        return null;
    }
};
},{}],34:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var GameModel_1 = require("./GameModel");
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-21 11:46:15
 * @modify date 2019-02-21 11:46:15
 * @desc websocket连接
 */
//{"appId":"luckyrocket","event":[{"toggle":0,"type":"type_value","expireTime":0}]}
var Socket = /** @class */ (function (_super) {
    __extends(Socket, _super);
    function Socket() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /**建立连接 */
    Socket.createSocket = function () {
        var userInfo = GameModel_1.GameModel.getInstance().userInfo;
        if (userInfo.userId) {
            Socket.WS_URL = Socket.WS_URL + ("&uid=" + userInfo.userId);
        }
        if (!Socket.WS) {
            // Socket.WS.close()
            Socket.WS = new WebSocket(Socket.WS_URL);
            Socket.WS.onopen = Socket.onopenWS;
            Socket.WS.onmessage = Socket.onmessageWS;
            Socket.WS.onerror = Socket.onerrorWS;
            Socket.WS.onclose = Socket.oncloseWS;
        }
    };
    /**打开WS之后发送心跳 */
    Socket.onopenWS = function () {
        Socket.sendPing(); //发送心跳
    };
    /**连接失败重连 */
    Socket.onerrorWS = function () {
        Socket.WS.close();
        Socket.createSocket(); //重连
    };
    /**WS数据接收统一处理 */
    Socket.onmessageWS = function (e) {
        var redata;
        var payload;
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
    };
    /**发送数据 */
    Socket.sendWSPush = function (type, toggle) {
        if (toggle === void 0) { toggle = 1; }
        var obj = {
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
            setTimeout(function () {
                Socket.WS.send(JSON.stringify(obj));
            }, 2000);
        }
    };
    /**关闭WS */
    Socket.oncloseWS = function () {
        console.log('断开连接');
    };
    /**发送心跳 */
    Socket.sendPing = function () {
        Socket.WS.send('ping');
        Socket.setIntervalWesocketPush = setInterval(function () {
            Socket.WS.send('ping');
        }, 30000);
    };
    Socket.WS_URL = "wss://t-wss.xyhj.io/ws?appid=luckyrocketApp";
    Socket.WS = '';
    /**30秒一次心跳 */
    Socket.setIntervalWesocketPush = null;
    return Socket;
}(Laya.UIComponent));
exports.Socket = Socket;
},{"./GameModel":30}],35:[function(require,module,exports){
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
    comdify: function (num) {
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
    Copy: function (copyInfo) {
        return new Promise(function (resolve, reject) {
            var copyUrl = document.createElement("input"); //创建一个input框获取需要复制的文本内容
            copyUrl.value = copyInfo;
            var appDiv = document.getElementById('app');
            appDiv.appendChild(copyUrl);
            copyUrl.select();
            document.execCommand("Copy");
            copyUrl.remove();
            resolve(true);
        });
    },
    /** 判断是否为手机*/
    isPhone: function (num) {
        var reg = /^1[3456789]\d{9}$/;
        return reg.test(num);
    },
    /**
     * 倒计时
     * @param {string | number} times 剩余毫秒数
     * @param {function} callback 回调函数
     */
    countDown: function (times, callback) {
        var timer = null;
        timer = setInterval(function () {
            if (times > 0) {
                var day = Math.floor(times / (60 * 60 * 24));
                var hour = Math.floor(times / (60 * 60)) - (day * 24);
                var minute = Math.floor(times / 60) - (day * 24 * 60) - (hour * 60);
                var second = Math.floor(times) - (day * 24 * 60 * 60) - (hour * 60 * 60) - (minute * 60);
                day = "" + (day < 10 ? '0' : '') + day;
                hour = "" + (hour < 10 ? '0' : '') + hour;
                minute = "" + (minute < 10 ? '0' : '') + minute;
                second = "" + (second < 10 ? '0' : '') + second;
                callback(hour + ":" + minute + ":" + second);
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
    formatDate: function (x, y) {
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
    formatDateTime: function (timeStamp) {
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
    toDecimal: function (cnum, cindex) {
        var value = String(cnum);
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
    accAdd: function (arg1, arg2) {
        var r1, r2, m;
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
    accSub: function (arg1, arg2) {
        var r1, r2, m, n;
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
    accDiv: function (arg1, arg2) {
        var t1 = 0, t2 = 0, r1, r2;
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
    accMul: function (arg1, arg2) {
        var m = 0, s1 = arg1.toString(), s2 = arg2.toString();
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
},{}],36:[function(require,module,exports){
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
var comp = [
    { url: "res/atlas/comp.atlas", type: "atlas" },
    { url: "res/atlas/comp/home.atlas", type: "atlas" },
    { url: "res/atlas/comp/home/fire.atlas", type: "atlas" },
    { url: "res/atlas/comp/home/wave.atlas", type: "atlas" },
    { url: "comp/img_star_bg01.png", type: "image" },
];
var scene = [
    { url: "Card.json", type: "json" },
    { url: "home.json", type: "json" },
    { url: "Tabbar.json", type: "json" },
];
exports.loadingResList = comp.concat(scene);
//首页之后加载
var comp1 = [
    { url: "comp/img_payment_bg01.png", type: "image" },
    { url: "comp/img_ranklist_bg01.png", type: "image" },
    { url: "comp/img_rocketRanking_bg01.png", type: "image" },
    { url: "comp/img_banner01.png", type: "image" },
    { url: "comp/img_myrank01.png", type: "image" },
    { url: "comp/img_rank01.png", type: "image" },
    { url: "comp/img_trend_banner01.png", type: "image" },
    { url: "comp/img_xctj_bg01.png", type: "image" },
];
var scene1 = [
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
exports.loadingResList1 = comp1.concat(scene1);
},{}],37:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:45:46
 * @modify date 2019-02-19 17:45:46
 * @desc 页面跳转脚本，用于编辑模式插入
 */
var Tabbar_1 = require("../view/Tabbar");
var PageNavScript = /** @class */ (function (_super) {
    __extends(PageNavScript, _super);
    function PageNavScript() {
        var _this = _super.call(this) || this;
        /** @prop {name:navPageScript,tips:'要跳转的scene',type:String,default:''} */
        _this.navPageScript = '';
        return _this;
    }
    PageNavScript.prototype.onClick = function () {
        Tabbar_1.Tabbar.getInstance().openScene(this.navPageScript);
    };
    return PageNavScript;
}(Laya.Script));
exports.default = PageNavScript;
},{"../view/Tabbar":64}],38:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:46:08
 * @modify date 2019-02-19 17:46:08
 * @desc 页面跳转类，在代码中使用
 */
var Tabbar_1 = require("../view/Tabbar");
var PageScript = /** @class */ (function (_super) {
    __extends(PageScript, _super);
    function PageScript() {
        var _this = _super.call(this) || this;
        /** @prop {name:showTab,tips:'是否有Tabbar',type:Bool,default:true} */
        _this.showTab = true;
        return _this;
    }
    PageScript.prototype.onEnable = function () {
        if (this.showTab) {
            Tabbar_1.Tabbar.show();
        }
    };
    PageScript.prototype.onDisable = function () {
        Tabbar_1.Tabbar.hide();
    };
    return PageScript;
}(Laya.Script));
exports.default = PageScript;
},{"../view/Tabbar":64}],39:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:46:30
 * @modify date 2019-02-19 17:46:30
 * @desc 屏幕自适应脚本
 */
var Screen = /** @class */ (function (_super) {
    __extends(Screen, _super);
    function Screen() {
        var _this = _super.call(this) || this;
        /** @prop {name:bgColor,tips:'背景颜色','type:String,default:'#0a0738'} */
        _this.bgColor = '#0a0738';
        return _this;
    }
    Screen.prototype.onEnable = function () {
        Laya.stage.on(Laya.Event.RESIZE, this, this.onResize);
        this.onResize();
    };
    Screen.prototype.onDisable = function () {
        Laya.stage.off(Laya.Event.RESIZE, this, this.onResize);
    };
    Screen.prototype.onResize = function () {
        var _that = this.owner;
        _that.width = Laya.stage.width;
        _that.height = Laya.stage.height;
        _that.graphics.drawRect(0, 0, Laya.stage.width, Laya.stage.height, this.bgColor);
    };
    return Screen;
}(Laya.Script));
exports.default = Screen;
},{}],40:[function(require,module,exports){
"use strict";
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-21 16:34:21
 * @modify date 2019-02-21 16:34:21
 * @desc 助手页面脚本
 */
Object.defineProperty(exports, "__esModule", { value: true });
var layaMaxUI_1 = require("../ui/layaMaxUI");
var api_1 = require("../js/api");
var Toast_1 = require("../view/Toast");
var screenUtils_1 = require("../js/screenUtils");
var Assistant = /** @class */ (function (_super) {
    __extends(Assistant, _super);
    function Assistant() {
        var _this = _super.call(this) || this;
        _this.cateListArr = [];
        _this.selectGoodsType = '';
        _this.tabType = 1;
        _this.page = 1;
        _this.btn_trend.on(Laya.Event.CLICK, _this, _this.tabSwitch, [1]);
        _this.btn_prebuy.on(Laya.Event.CLICK, _this, _this.tabSwitch, [2]);
        _this.on(Laya.Event.RESIZE, _this, _this.onResize);
        return _this;
    }
    Assistant.prototype.onEnable = function () {
        this.getGoodsCateList();
        this.cateSwitch();
        //走势分析滚动加载更多
        this.trendList.scrollBar.changeHandler = Laya.Handler.create(this, this.onTrendListScrollChange, null, false);
        this.trendList.scrollBar.on(Laya.Event.END, this, this.onTrendListScrollEnd);
    };
    /**获取商品类型 */
    Assistant.prototype.getGoodsCateList = function () {
        var _this = this;
        api_1.default.getGoodsCateList().then(function (res) {
            _this.cateListArr = res;
            var GoodsNameArr = [];
            res.forEach(function (item) {
                GoodsNameArr.push(item.goodsName);
            });
            _this.cateTabList.repeatX = GoodsNameArr.length;
            _this.cateTabList.array = GoodsNameArr;
            _this.cateTabList.selectedIndex = 0;
        }).catch(function (err) {
            console.log(err.message);
        });
    };
    /**获取走势列表 */
    Assistant.prototype.getGoodsTrend = function (goodsType, page) {
        var _this = this;
        if (page === void 0) { page = 1; }
        api_1.default.getGoodsTrend(goodsType, page).then(function (res) {
            if (_this.trendList.array !== null) {
                _this.trendList.array = _this.trendList.array.concat(res);
            }
            else {
                _this.trendList.array = res;
            }
            if (_this.trendList.array.length > 0) {
                _this.trendList.visible = true;
            }
            else {
                _this.noData.visible = true;
            }
        }).catch(function (err) {
            _this.noData.visible = true;
            console.log(err.message);
        });
    };
    /**
     * 切换列表
     * @param type 1:走势分析  2：预购
     */
    Assistant.prototype.tabSwitch = function (type) {
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
    };
    /**商品类型切换 */
    Assistant.prototype.cateSwitch = function () {
        var _this = this;
        this.cateTabList.selectHandler = new Laya.Handler(this, function (selectedIndex) {
            _this.selectGoodsType = _this.cateListArr[selectedIndex].goodsType;
            if (_this.tabType === 1) {
                _this.trendList.array = [];
                _this.page = 1;
                _this.getGoodsTrend(_this.selectGoodsType, _this.page);
            }
            else {
                console.log('暂未开放', _this.selectGoodsType);
            }
            //改变tab选中状态
            var i = _this.cateTabList.startIndex;
            _this.cateTabList.cells.forEach(function (cell) {
                cell.selected = i === selectedIndex;
                i++;
            });
        });
    };
    /**监视屏幕大小变化 */
    Assistant.prototype.onResize = function () {
        //列表高度适配 = 屏幕高度 - (banner + tabbar)
        this.trendList.height = this.height - 600;
        var trendNumber = this.trendList.height / 100;
        this.trendList.repeatY = Math.ceil(trendNumber);
        this.prebuy.height = this.height - 600;
        var prebuyNumber = this.prebuy.height / 100;
        this.trendList.repeatY = Math.ceil(prebuyNumber);
    };
    /**参与记录列表滚动 */
    Assistant.prototype.onTrendListScrollChange = function (v) {
        if (v > this.trendList.scrollBar.max + Assistant.HALF_SCROLL_ELASTIC_DISTANCE) {
            this._isScrollOverElasticDistance = true;
        }
    };
    Assistant.prototype.onTrendListScrollEnd = function () {
        if (this._isScrollOverElasticDistance) {
            this._isScrollOverElasticDistance = false;
            this.page = this.page + 1;
            this.getGoodsTrend(this.selectGoodsType, this.page);
        }
    };
    Assistant.HALF_SCROLL_ELASTIC_DISTANCE = 100;
    return Assistant;
}(layaMaxUI_1.ui.assistantUI));
exports.default = Assistant;
},{"../js/api":31,"../js/screenUtils":33,"../ui/layaMaxUI":62,"../view/Toast":65}],41:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:47:11
 * @modify date 2019-02-19 17:47:11
 * @desc 首页商品卡脚本
 */
var layaMaxUI_1 = require("../ui/layaMaxUI");
var Tabbar_1 = require("../view/Tabbar");
var utils_1 = require("../js/utils");
var Card = /** @class */ (function (_super) {
    __extends(Card, _super);
    function Card() {
        var _this = _super.call(this) || this;
        _this.on(Laya.Event.CLICK, _this, _this.clickItem);
        return _this;
    }
    Object.defineProperty(Card.prototype, "dataSource", {
        set: function (item) {
            this._dataSource = item;
            if (item) {
                //金币图片,  1-400金币图标2;   501-1000金币图标4;  1001以上金币图标20
                if (+item.goodsValue <= 400) {
                    this.cardItem.skin = "comp/home/img_jinbi_2.png";
                }
                else if (+item.goodsValue <= 1000) {
                    this.cardItem.skin = "comp/home/img_jinbi_4.png";
                }
                else if (+item.goodsValue >= 1001) {
                    this.cardItem.skin = "comp/home/img_jinbi_20.png";
                }
                this.sceneImg.skin = "comp/home/img_scene_" + item.totalNum + ".png";
                this.goodsName.text = +item.goodsValue + " USDT";
                this.award.text = "" + utils_1.default.toDecimal(item.award, 2);
                this.soldNum_totalNum.text = item.soldNum + "/" + item.totalNum;
                this.progress.value = +("" + item.soldNum / item.totalNum);
            }
        },
        enumerable: true,
        configurable: true
    });
    Card.prototype.clickItem = function () {
        if (this._dataSource !== null) {
            Tabbar_1.Tabbar.getInstance().openScene('guessing.scene', this._dataSource.goodsId);
        }
    };
    return Card;
}(layaMaxUI_1.ui.CardUI));
exports.default = Card;
},{"../js/utils":35,"../ui/layaMaxUI":62,"../view/Tabbar":64}],42:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:47:58
 * @modify date 2019-02-19 17:47:58
 * @desc 购买页面脚本
 */
var layaMaxUI_1 = require("../ui/layaMaxUI");
var Toast_1 = require("../view/Toast");
var utils_1 = require("../js/utils");
var pswInput_1 = require("../template/pswInput");
var GameModel_1 = require("../js/GameModel");
var api_1 = require("../js/api");
var socket_1 = require("../js/socket");
var Guessing = /** @class */ (function (_super) {
    __extends(Guessing, _super);
    function Guessing() {
        var _this = _super.call(this) || this;
        _this.goodsId = ''; //商品ID
        _this._period = ''; //期号
        _this.selectNumber = 0; //选中个数
        _this.unitPrice = 0; //单价
        _this.totalPrice = 0; //总价
        _this.myAmount = 0; //总资产
        _this.numberArr = []; //未选中的数据
        _this.halfArr = []; //一半的未选中数据
        _this.rawDataArr_new = []; //镜像数组
        _this.rawDataArr = []; //原始数据
        _this.codeList = ''; //购买号码
        _this.btn_buy.on(Laya.Event.CLICK, _this, _this.buyFunc);
        // 选择按钮组绑定事件
        _this.random_one.on(Laya.Event.CLICK, _this, _this.selectFunc, [1]);
        _this.random_before.on(Laya.Event.CLICK, _this, _this.selectFunc, [2]);
        _this.random_after.on(Laya.Event.CLICK, _this, _this.selectFunc, [3]);
        _this.random_all.on(Laya.Event.CLICK, _this, _this.selectFunc, [4]);
        return _this;
    }
    Guessing.prototype.onEnable = function () {
        var _this = this;
        console.log('进入页面');
        //获取用户资产
        var userInfo = GameModel_1.GameModel.getInstance().userInfo;
        this.balance.text = utils_1.default.toDecimal(userInfo.money, 2) + " USDT";
        this.myAmount = +("" + utils_1.default.toDecimal(userInfo.money, 2));
        if (!userInfo.userId) { //未登录不显示我的余额
            this.balanceBox.visible = false;
            this.estimate.y = 80;
        }
        else {
            this.balanceBox.visible = true;
            this.estimate.y = 42;
        }
        // 监视资产变动
        GameModel_1.GameModel.getInstance().on('getUserInfo', this, (function (userInfo) {
            _this.balance.text = utils_1.default.toDecimal(userInfo.money, 2) + " USDT";
            _this.myAmount = +("" + utils_1.default.toDecimal(userInfo.money, 2));
        }));
        // 号码被购买变动
        GameModel_1.GameModel.getInstance().on('getbuyGoodsArr', this, function (goodsArr) {
            _this.rawDataArr.forEach(function (item) {
                goodsArr.forEach(function (v) {
                    if (item.code === v.code) {
                        item.userId = v.userId;
                        item.buyerId = v.userId;
                    }
                });
            });
            _this.progressSpeed.value = +("" + goodsArr.length / _this.numberList.array.length);
            _this.soldNum_soldNum.text = goodsArr.length + "/" + _this.numberList.array.length;
            _this.numberList.array = _this.rawDataArr; //号码列表
        });
    };
    Guessing.prototype.onOpened = function (goodsId) {
        this.goodsId = goodsId;
        this.getGoodsDetails(this.goodsId);
    };
    Guessing.prototype.onDisable = function () {
        //  关闭websocket事件
        socket_1.Socket.sendWSPush("buy_" + this._period, 0);
    };
    /**购买 */
    Guessing.prototype.buyFunc = function () {
        var _this = this;
        var userInfo = Object.keys(GameModel_1.GameModel.getInstance().userInfo);
        if (userInfo.length === 0) {
            console.log('未登录跳转登录');
            window.location.href = "https://" + document.domain + "/#/sign_one";
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
            this.inputPwd.on('refreshData', this, function () {
                _this.getGoodsDetails(_this.goodsId);
                _this.total.text = '0 USDT';
            });
        }
    };
    /**
     * 选择按钮组
     * @param type 选择类型  1:随一  2：前半 3：后半 4：全部
     */
    Guessing.prototype.selectFunc = function (type) {
        var _this = this;
        this.rawDataArr_new = this.rawDataArr; //初始化数组
        this.numberArr = []; //初始化数组
        this.halfArr = []; //初始化数组
        this.rawDataArr_new.forEach(function (item) {
            if (item.buyerId === '2') {
                item.buyerId = '0';
            }
            if (item.buyerId <= 2) {
                _this.numberArr.push(item.code);
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
    };
    /**从数组中随机取一个数
     * @param arr 数据列表
     * @param type [可选] 随机类型
     */
    Guessing.prototype.randomNumber = function (arr, type) {
        var _this = this;
        var rand = Math.floor((Math.random() * arr.length)); //随一
        var code = arr[rand];
        if (type === 1) {
            this.rawDataArr_new.forEach(function (item) {
                if (item.code === code) {
                    item.buyerId = '2';
                }
            });
        }
        if (type === 2) {
            arr.forEach(function (el) {
                _this.rawDataArr_new.forEach(function (item) {
                    if (el === item.code) {
                        item.buyerId = '2';
                    }
                });
            });
        }
        // this.numberList.repeatY = this.rawDataArr_new.length;
        this.numberList.array = this.rawDataArr_new;
        this.getSelectNumber();
    };
    /**获取商品详情
     * @param goodsId 商品id
     */
    Guessing.prototype.getGoodsDetails = function (goodsId) {
        var _this = this;
        api_1.default.getGoodsDetails(goodsId).then(function (res) {
            //  发送websocket事件
            _this._period = res.period;
            socket_1.Socket.sendWSPush("buy_" + _this._period);
            _this.price.text = "" + +res.price;
            _this.goodsValue.text = +res.goodsValue + " USDT";
            _this.progressSpeed.value = +("" + res.soldNum / res.totalNum);
            _this.soldNum_soldNum.text = res.soldNum + "/" + res.totalNum;
            _this.period.text = res.period;
            _this.unitPrice = +res.price;
            _this.rawDataArr = res.codeList;
            _this.numberList.array = _this.rawDataArr; //号码列表
            _this.random_one.visible = true;
            if (_this.numberList.array.length > 2) {
                _this.random_after.visible = true;
                _this.random_before.visible = true;
                _this.random_all.visible = true;
            }
            else {
                _this.random_one.width = 300;
                _this.random_one.centerX = 0;
            }
            _this.numberList.repeatX = 5;
            _this.numberList.repeatY = 4;
            _this.numberList.cells.forEach(function (item) {
                item.on("GetItem", _this, _this.getSelectNumber);
            });
        }).catch(function (err) {
            console.log(err.message);
        });
    };
    /**监听统计列表数据选中个数 */
    Guessing.prototype.getSelectNumber = function () {
        var _this = this;
        this.selectNumber = 0;
        this.codeList = '';
        this.numberList.array.forEach(function (item) {
            if (item.buyerId === '2') {
                _this.selectNumber = _this.selectNumber + 1;
                var codeString = "" + _this.codeList + (_this.codeList.length > 0 ? ',' : '') + item.code;
                _this.codeList = codeString;
            }
        });
        this.total.text = utils_1.default.toDecimal((this.unitPrice * this.selectNumber), 2) + ' USDT';
        this.totalPrice = +utils_1.default.toDecimal((this.unitPrice * this.selectNumber), 2);
        return this.selectNumber;
    };
    return Guessing;
}(layaMaxUI_1.ui.guessingUI));
exports.default = Guessing;
},{"../js/GameModel":30,"../js/api":31,"../js/socket":34,"../js/utils":35,"../template/pswInput":55,"../ui/layaMaxUI":62,"../view/Toast":65}],43:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:48:16
 * @modify date 2019-02-19 17:48:16
 * @desc 首页脚本
 */
var layaMaxUI_1 = require("../ui/layaMaxUI");
var Toast_1 = require("../view/Toast");
var GameModel_1 = require("../js/GameModel");
var utils_1 = require("../js/utils");
var api_1 = require("../js/api");
// import rechargeDialog from '../template/rechargeDialog';
var screenUtils_1 = require("../js/screenUtils");
var Home = /** @class */ (function (_super) {
    __extends(Home, _super);
    // private rechargeDialog: rechargeDialog;//充值弹出
    function Home() {
        var _this = _super.call(this) || this;
        _this.rechargeBox.on(Laya.Event.CLICK, _this, _this.btnRechargeFunc);
        _this.buyHelp.on(Laya.Event.CLICK, _this, _this.openBuyHelp);
        _this.putin.on(Laya.Event.CLICK, _this, _this.putInFunc);
        _this.go_center.on(Laya.Event.CLICK, _this, _this.goCenter);
        return _this;
    }
    Home.prototype.onEnable = function () {
        var _this = this;
        this.getUserInfo();
        this.rankToday();
        this.getGoodsList();
        // 监视火箭数据变动
        GameModel_1.GameModel.getInstance().on('getRocketData', this, function (res) {
            _this.rocketAmount.text = "" + utils_1.default.toDecimal(res.potMoney, 2);
            utils_1.default.countDown(res.countDown, (function (time) {
                _this.rocketCountDown.text = time;
            }));
        });
        // 是否开奖了，开奖刷新商品列表
        GameModel_1.GameModel.getInstance().on('isToggle', this, function (res) {
            if (screenUtils_1.default.getScreen().name === 'home') {
                _this.getGoodsList();
            }
        });
    };
    /**充值 */
    Home.prototype.btnRechargeFunc = function () {
        window.location.href = "https://" + document.domain + "/#/main_Page?show=recharge";
        // Toast.show('点击充值')
        // this.rechargeDialog = new rechargeDialog();
        // this.rechargeDialog.y = Laya.stage.height - this.rechargeDialog.height;
        // this.rechargeDialog.popupEffect = Laya.Handler.create(this, this.rechargeDialogPopupFun);
        // this.rechargeDialog.closeEffect = Laya.Handler.create(this, this.rechargeDialogCloseFun);
        // this.rechargeDialog.popup();
    };
    /**空投 */
    Home.prototype.putInFunc = function () {
        // Tabbar.getInstance().openScene('xctj.scene')
        Toast_1.Toast.show('暂未开放，敬请期待');
    };
    /**获取个人信息 */
    Home.prototype.getUserInfo = function () {
        var _this = this;
        api_1.default.getUserInfo().then(function (res) {
            _this.nickName.text = res.userInfo.nickName;
            _this.myAmount.text = "" + utils_1.default.toDecimal(res.userInfo.money, 2);
            _this.avatar.skin = res.userInfo.avatar;
        }).catch(function (err) {
        });
    };
    /**今日大奖池 */
    Home.prototype.rankToday = function () {
        var _this = this;
        api_1.default.getRankToday().then(function (res) {
            _this.rocketAmount.text = "" + utils_1.default.toDecimal(res.potMoney, 2);
            utils_1.default.countDown(res.countDown, (function (time) {
                _this.rocketCountDown.text = time;
            }));
        }).catch(function (err) {
            console.log(err.message);
        });
    };
    /**获取首页商品列表 */
    Home.prototype.getGoodsList = function () {
        var _this = this;
        api_1.default.getGoodsList().then(function (res) {
            _this.list.repeatX = res.list.length;
            _this.list.array = res.list;
        }).catch(function (err) {
            console.log(err.message);
        });
    };
    /**玩法介绍 */
    Home.prototype.openBuyHelp = function () {
        window.location.href = 'https://m.xyhj.io/#/origin/zh/buyHelp';
    };
    Home.prototype.goCenter = function () {
        window.location.href = "https://" + document.domain + "/#/main_Page";
    };
    return Home;
}(layaMaxUI_1.ui.homeUI));
exports.default = Home;
},{"../js/GameModel":30,"../js/api":31,"../js/screenUtils":33,"../js/utils":35,"../ui/layaMaxUI":62,"../view/Toast":65}],44:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:48:28
 * @modify date 2019-02-19 17:48:28
 * @desc 记录页面脚本
 */
var layaMaxUI_1 = require("../ui/layaMaxUI");
var api_1 = require("../js/api");
var screenUtils_1 = require("../js/screenUtils");
var Record = /** @class */ (function (_super) {
    __extends(Record, _super);
    function Record() {
        var _this = _super.call(this) || this;
        _this.page = 1;
        _this.screenType = 1;
        _this.canyu.on(Laya.Event.CLICK, _this, _this.tabSwitch, [1]);
        _this.wangqi.on(Laya.Event.CLICK, _this, _this.tabSwitch, [2]);
        _this.on(Laya.Event.RESIZE, _this, _this.onResize);
        return _this;
    }
    Record.prototype.onEnable = function () {
        this.getMyOrders();
        // this.getGoodsHistory();
        //参与记录滚动加载更多
        this.joinList.scrollBar.changeHandler = Laya.Handler.create(this, this.onJoinListScrollChange, null, false);
        this.joinList.scrollBar.on(Laya.Event.END, this, this.onJoinListScrollEnd);
        //往期记录滚动加载更多
        this.previoousList.scrollBar.changeHandler = Laya.Handler.create(this, this.onPrevioousListScrollChange, null, false);
        this.previoousList.scrollBar.on(Laya.Event.END, this, this.onPrevioousListScrollEnd);
    };
    /**获取参与记录 */
    Record.prototype.getMyOrders = function (page) {
        var _this = this;
        if (page === void 0) { page = 1; }
        api_1.default.getMyOrders(page).then(function (res) {
            if (_this.joinList.array !== null) {
                _this.joinList.array = _this.joinList.array.concat(res);
            }
            else {
                _this.joinList.array = res;
            }
            if (_this.joinList.array.length > 0) {
                _this.noData.visible = false;
                _this.joinList.visible = true;
            }
            else {
                _this.noData.visible = true;
            }
        }).catch(function (err) {
            _this.noData.visible = true;
            console.log(err.message);
        });
    };
    /**获取往期记录 */
    Record.prototype.getGoodsHistory = function (page) {
        var _this = this;
        api_1.default.getGoodsHistory(page).then(function (res) {
            if (_this.previoousList.array !== null) {
                _this.previoousList.array = _this.previoousList.array.concat(res);
            }
            else {
                _this.previoousList.array = res;
            }
            if (_this.previoousList.array.length > 0) {
                _this.noData.visible = false;
                _this.previoousList.visible = true;
            }
            else {
                _this.noData.visible = true;
            }
        }).catch(function (err) {
            _this.noData.visible = true;
            console.log(err.message);
        });
    };
    /**
     * 切换记录列表
     * @param type 1:参与记录  2：往期记录
     */
    Record.prototype.tabSwitch = function (type) {
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
    };
    /**监视屏幕大小变化 */
    Record.prototype.onResize = function () {
        //列表高度适配 = 屏幕高度 - (banner + tabbar)
        this.joinList.height = this.height - 430;
        this.previoousList.height = this.height - 430;
    };
    /**参与记录列表滚动 */
    Record.prototype.onJoinListScrollChange = function (v) {
        if (v > this.joinList.scrollBar.max + Record.HALF_SCROLL_ELASTIC_DISTANCE) {
            this._isScrollOverElasticDistance = true;
        }
    };
    Record.prototype.onJoinListScrollEnd = function () {
        if (this._isScrollOverElasticDistance) {
            this._isScrollOverElasticDistance = false;
            // this.event(GameEvent.NEXT_PAGE);
            this.page = this.page + 1;
            this.getMyOrders(this.page);
            // console.log(LogFlag.get(LogFlag.UI), "next page");
        }
    };
    /**参与记录列表滚动 */
    Record.prototype.onPrevioousListScrollChange = function (v) {
        if (v > this.previoousList.scrollBar.max + Record.HALF_SCROLL_ELASTIC_DISTANCE) {
            this._isScrollOverElasticDistance = true;
        }
    };
    Record.prototype.onPrevioousListScrollEnd = function () {
        if (this._isScrollOverElasticDistance) {
            this._isScrollOverElasticDistance = false;
            this.page = this.page + 1;
            this.getGoodsHistory(this.page);
        }
    };
    Record.HALF_SCROLL_ELASTIC_DISTANCE = 100;
    return Record;
}(layaMaxUI_1.ui.recordUI));
exports.default = Record;
},{"../js/api":31,"../js/screenUtils":33,"../ui/layaMaxUI":62}],45:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-20 10:27:25
 * @modify date 2019-02-20 10:27:25
 * @desc 火箭大奖页面
 */
var layaMaxUI_1 = require("../ui/layaMaxUI");
var utils_1 = require("../js/utils");
var api_1 = require("../js/api");
var Tabbar_1 = require("../view/Tabbar");
var GameModel_1 = require("../js/GameModel");
var grandPrix = /** @class */ (function (_super) {
    __extends(grandPrix, _super);
    function grandPrix() {
        var _this = _super.call(this) || this;
        _this.rankPrizeHelp.on(Laya.Event.CLICK, _this, _this.openRankPrizeHelp);
        _this.btn_history.on(Laya.Event.CLICK, _this, _this.Btnhistory);
        return _this;
    }
    grandPrix.prototype.onEnable = function () {
        var _this = this;
        this.getRankToday();
        Laya.stage.on(Laya.Event.RESIZE, this, this.onResize);
        this.onResize();
        // 监视火箭数据变动
        GameModel_1.GameModel.getInstance().on('getRocketData', this, function (res) {
            _this.bonus.text = "" + utils_1.default.toDecimal(res.potMoney, 2);
            utils_1.default.countDown(res.countDown, (function (time) {
                _this.CountDown.text = time;
            }));
        });
    };
    grandPrix.prototype.onDisable = function () {
        Laya.stage.off(Laya.Event.RESIZE, this, this.onResize);
    };
    /**获取大奖信息 */
    grandPrix.prototype.getRankToday = function () {
        var _this = this;
        api_1.default.getRankToday().then(function (res) {
            _this.bonus.text = "" + utils_1.default.toDecimal(res.potMoney, 2);
            utils_1.default.countDown(res.countDown, (function (time) {
                _this.CountDown.text = time;
            }));
            if (res.list.length === 0) {
                _this.noData.visible = true;
            }
            //第一名
            if (res.list.list1.data.length > 0) {
                _this.box1.visible = true;
                _this.alone1.text = "\u72EC\u5F97 " + utils_1.default.toDecimal(res.list.list1.dividmoney, 2) + " USDT";
                _this.Proportion1.text = "\u5360\u5956\u6C60" + res.list.list1.percent;
                _this.prixList1.array = res.list.list1.data;
            }
            // 2-5名
            if (res.list.list2.data.length > 0) {
                _this.box2.visible = true;
                _this.alone2.text = "\u6BCF\u4EBA " + utils_1.default.toDecimal(res.list.list2.dividmoney / 4, 2) + " USDT";
                _this.Proportion2.text = "\u5360\u5956\u6C60" + res.list.list2.percent;
                _this.prixList2.array = res.list.list2.data;
            }
            // 5-15名
            if (res.list.list3.data.length > 0) {
                _this.box3.visible = true;
                _this.alone3.text = "\u6BCF\u4EBA " + utils_1.default.toDecimal(res.list.list3.dividmoney / 10, 2) + " USDT";
                _this.Proportion3.text = "\u5360\u5956\u6C60" + res.list.list3.percent;
                _this.prixList3.array = res.list.list3.data;
            }
            //未登录则不显示个人排名
            if (res.list.self.userId) {
                _this.myRankBox.visible = true;
                _this.myranking.text = res.list.self.rank > 15 ? '15+' : "" + res.list.self.rank;
                _this.avatar.skin = res.list.self.avatar;
                _this.nickName.text = res.list.self.nickName;
                _this.uid.text = res.list.self.userId;
                _this.volume.text = utils_1.default.toDecimal(res.list.self.consum, 2) + " USDT";
            }
        }).catch(function (err) {
            console.log(err.message);
        });
    };
    grandPrix.prototype.Btnhistory = function () {
        Tabbar_1.Tabbar.getInstance().openScene('priHistoryScene.scene');
    };
    /**说明 */
    grandPrix.prototype.openRankPrizeHelp = function () {
        window.location.href = 'https://m.xyhj.io/#/origin/zh/rankPrizeHelp';
    };
    grandPrix.prototype.onResize = function () {
        this.listBox.height = Laya.stage.height - 700;
    };
    return grandPrix;
}(layaMaxUI_1.ui.grandPrixUI));
exports.default = grandPrix;
},{"../js/GameModel":30,"../js/api":31,"../js/utils":35,"../ui/layaMaxUI":62,"../view/Tabbar":64}],46:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-03-18 16:59:13
 * @modify date 2019-03-18 16:59:13
 * @desc 页面加载loading
 */
var layaMaxUI_1 = require("../ui/layaMaxUI");
var loadingScene = /** @class */ (function (_super) {
    __extends(loadingScene, _super);
    function loadingScene() {
        return _super.call(this) || this;
    }
    loadingScene.prototype.setProgress = function (value) {
        console.log(value, '当前进度');
        this.loadingProgress.value = value;
        var val = "" + value * 100;
        this.progress.text = parseInt(val, 0) + "%";
        this.rocketloading.x = 365 * value;
    };
    return loadingScene;
}(layaMaxUI_1.ui.loadingSceneUI));
exports.default = loadingScene;
},{"../ui/layaMaxUI":62}],47:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-20 10:27:25
 * @modify date 2019-02-20 10:27:25
 * @desc 火箭大奖历史记录页面
 */
var layaMaxUI_1 = require("../ui/layaMaxUI");
var utils_1 = require("../js/utils");
var api_1 = require("../js/api");
var grandPrix = /** @class */ (function (_super) {
    __extends(grandPrix, _super);
    function grandPrix() {
        return _super.call(this) || this;
    }
    grandPrix.prototype.onEnable = function () {
        this.getRankHistory();
        Laya.stage.on(Laya.Event.RESIZE, this, this.onResize);
        this.onResize();
    };
    grandPrix.prototype.onDisable = function () {
        Laya.stage.off(Laya.Event.RESIZE, this, this.onResize);
    };
    /**获取大奖信息 */
    grandPrix.prototype.getRankHistory = function () {
        var _this = this;
        api_1.default.getRankHistory().then(function (res) {
            _this.total.text = "\u603B\u5956\u91D1:" + utils_1.default.toDecimal(res.potMoney, 2) + " USDT";
            if (res.list.list1.data.length === 0 && res.list.list2.data.length === 0 && res.list.list3.data.length === 0) {
                _this.listBox.visible = false;
                _this.noData.visible = true;
            }
            //第一名
            if (res.list.list1.data.length > 0) {
                _this.listBox.visible = true;
                _this.box1.visible = true;
                _this.alone1.text = "\u72EC\u5F97 " + utils_1.default.toDecimal(res.list.list1.dividmoney, 2) + " USDT";
                _this.Proportion1.text = "\u5360\u5956\u6C60" + res.list.list1.percent;
                _this.prixList1.array = res.list.list1.data;
            }
            // 2-5名
            if (res.list.list2.data.length > 0) {
                _this.listBox.visible = true;
                _this.box2.visible = true;
                _this.alone2.text = "\u6BCF\u4EBA " + utils_1.default.toDecimal(res.list.list2.dividmoney / 4, 2) + " USDT";
                _this.Proportion2.text = "\u5360\u5956\u6C60" + res.list.list2.percent;
                _this.prixList2.array = res.list.list2.data;
            }
            // 5-15名
            if (res.list.list3.data.length > 0) {
                _this.listBox.visible = true;
                _this.box3.visible = true;
                _this.alone3.text = "\u6BCF\u4EBA " + utils_1.default.toDecimal(res.list.list3.dividmoney / 10, 2) + " USDT";
                _this.Proportion3.text = "\u5360\u5956\u6C60" + res.list.list3.percent;
                _this.prixList3.array = res.list.list3.data;
            }
        }).catch(function (err) {
            console.log(err.message);
        });
    };
    grandPrix.prototype.onResize = function () {
        this.listBox.height = Laya.stage.height - 200;
    };
    return grandPrix;
}(layaMaxUI_1.ui.priHistorySceneUI));
exports.default = grandPrix;
},{"../js/api":31,"../js/utils":35,"../ui/layaMaxUI":62}],48:[function(require,module,exports){
"use strict";
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-26 11:07:39
 * @modify date 2019-02-26 11:07:39
 * @desc 入围名单
 */
Object.defineProperty(exports, "__esModule", { value: true });
var layaMaxUI_1 = require("../ui/layaMaxUI");
var api_1 = require("../js/api");
var ShortListed = /** @class */ (function (_super) {
    __extends(ShortListed, _super);
    function ShortListed() {
        var _this = _super.call(this) || this;
        _this.on(Laya.Event.RESIZE, _this, _this.onResize);
        return _this;
    }
    ShortListed.prototype.onEnable = function () {
        this.getShortListed();
    };
    ShortListed.prototype.getShortListed = function (page) {
        var _this = this;
        api_1.default.getShortListed(page).then(function (res) {
            _this.shortList.repeatY = res.length;
            _this.shortList.array = res;
            _this.shortList.visible = true;
        }).catch(function (err) {
            _this.noData.visible = true;
            console.log(err.message);
        });
    };
    /**监视屏幕大小变化 */
    ShortListed.prototype.onResize = function () {
        //列表高度适配
        // this.shortList.height = this.height - 100;
    };
    return ShortListed;
}(layaMaxUI_1.ui.shortListedUI));
exports.default = ShortListed;
},{"../js/api":31,"../ui/layaMaxUI":62}],49:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-26 10:20:15
 * @modify date 2019-02-26 10:20:15
 * @desc 喜从天降中奖名单
 */
var layaMaxUI_1 = require("../ui/layaMaxUI");
var api_1 = require("../js/api");
var Tabbar_1 = require("../view/Tabbar");
var Winning = /** @class */ (function (_super) {
    __extends(Winning, _super);
    function Winning() {
        var _this = _super.call(this) || this;
        _this.btn_shortlist.on(Laya.Event.CLICK, _this, _this.ShortListFunc);
        _this.on(Laya.Event.RESIZE, _this, _this.onResize);
        return _this;
    }
    Winning.prototype.onEnable = function () {
        this.getXctjList();
    };
    Winning.prototype.getXctjList = function (page) {
        var _this = this;
        api_1.default.getXctjList(page).then(function (res) {
            _this.winningList.repeatY = res.length;
            _this.winningList.array = res;
            _this.winningList.visible = true;
        }).catch(function (err) {
            _this.noData.visible = true;
            console.log(err.message);
        });
    };
    /**查看今日入围名单 */
    Winning.prototype.ShortListFunc = function () {
        Tabbar_1.Tabbar.getInstance().openScene('shortListed.scene');
    };
    /**监视屏幕大小变化 */
    Winning.prototype.onResize = function () {
        //列表高度适配 = 屏幕高度 - banner
        this.winningList.height = this.height - 600;
    };
    return Winning;
}(layaMaxUI_1.ui.xctjUI));
exports.default = Winning;
},{"../js/api":31,"../ui/layaMaxUI":62,"../view/Tabbar":64}],50:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:48:40
 * @modify date 2019-02-19 17:48:40
 * @desc 参与记录脚本
 */
var layaMaxUI_1 = require("../ui/layaMaxUI");
var utils_1 = require("../js/utils");
var joinRecord = /** @class */ (function (_super) {
    __extends(joinRecord, _super);
    function joinRecord() {
        return _super.call(this) || this;
    }
    Object.defineProperty(joinRecord.prototype, "dataSource", {
        set: function (item) {
            this._dataSource = item;
            if (item) {
                this.period.text = item.period;
                this.goodsValue.text = "" + +utils_1.default.toDecimal(item.goodsValue, 2);
                this.codeList.text = item.codeList.length > 38 ? item.codeList.substr(0, 38) + "..." : item.codeList;
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
                    this.award.text = +utils_1.default.toDecimal(item.award, 2) + " USDT";
                }
            }
        },
        enumerable: true,
        configurable: true
    });
    return joinRecord;
}(layaMaxUI_1.ui.template.joinRecordsUI));
exports.default = joinRecord;
},{"../js/utils":35,"../ui/layaMaxUI":62}],51:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:48:50
 * @modify date 2019-02-19 17:48:50
 * @desc 购买页面号码列表脚本
 */
var layaMaxUI_1 = require("../ui/layaMaxUI");
var Toast_1 = require("../view/Toast");
var GameModel_1 = require("../js/GameModel");
var numberListDOM = /** @class */ (function (_super) {
    __extends(numberListDOM, _super);
    function numberListDOM() {
        var _this = _super.call(this) || this;
        _this.userId = '';
        _this.on(Laya.Event.CLICK, _this, _this.clickNumber);
        return _this;
    }
    Object.defineProperty(numberListDOM.prototype, "dataSource", {
        set: function (item) {
            this._dataSource = item;
            if (item) {
                this.code.text = item.code;
                this.bgImg.skin = this.returnStatusImg(item.buyerId);
            }
        },
        enumerable: true,
        configurable: true
    });
    numberListDOM.prototype.onEnable = function () {
        //获取用户资产
        var userInfo = GameModel_1.GameModel.getInstance().userInfo;
        this.userId = userInfo.userId;
    };
    /**
     * 选择号码
     * @param item 当前按钮
     */
    numberListDOM.prototype.clickNumber = function (item) {
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
    };
    /**
     * 根据状态返回对应图片
     * @param buyerId  0：可选 2：选中 大于10:不可选  等于自己userId：已选
     *
    */
    numberListDOM.prototype.returnStatusImg = function (buyerId) {
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
    };
    return numberListDOM;
}(layaMaxUI_1.ui.template.numberListDOMUI));
exports.default = numberListDOM;
},{"../js/GameModel":30,"../ui/layaMaxUI":62,"../view/Toast":65}],52:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:49:08
 * @modify date 2019-02-19 17:49:08
 * @desc 往期记录脚本
 */
var layaMaxUI_1 = require("../ui/layaMaxUI");
var utils_1 = require("../js/utils");
var previousRecord = /** @class */ (function (_super) {
    __extends(previousRecord, _super);
    function previousRecord() {
        var _this = _super.call(this) || this;
        _this.txHash.on(Laya.Event.CLICK, _this, _this.seeHash);
        return _this;
    }
    Object.defineProperty(previousRecord.prototype, "dataSource", {
        set: function (item) {
            this._dataSource = item;
            if (item) {
                this.period.text = item.period;
                this.goodsName.text = item.goodsName;
                this.txHash.text = item.txHash;
                this.hitCode.text = item.hitCode;
                this.openTime.text = utils_1.default.formatDateTime(item.openTime);
                this.joinedNum.text = item.joinedNum;
            }
        },
        enumerable: true,
        configurable: true
    });
    /**查看哈希 */
    previousRecord.prototype.seeHash = function () {
        var domain = document.domain;
        if (domain.indexOf('t-center') >= 0 || domain === 'localhost') {
            window.location.href = "https://ropsten.etherscan.io/tx/" + this._dataSource.txHash;
        }
        else {
            window.location.href = "https://etherscan.io/tx/" + this._dataSource.txHash;
        }
    };
    return previousRecord;
}(layaMaxUI_1.ui.template.previousRecordsUI));
exports.default = previousRecord;
},{"../js/utils":35,"../ui/layaMaxUI":62}],53:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-22 11:40:42
 * @modify date 2019-02-22 11:40:42
 * @desc 火箭大奖历史记录脚本
 */
var layaMaxUI_1 = require("../ui/layaMaxUI");
var utils_1 = require("../js/utils");
var priHistory = /** @class */ (function (_super) {
    __extends(priHistory, _super);
    function priHistory() {
        return _super.call(this) || this;
    }
    Object.defineProperty(priHistory.prototype, "dataSource", {
        set: function (item) {
            if (item) {
                this.rankNo.text = item.rank < 10 ? "0" + item.rank : "" + item.rank;
                this.nickName.text = item.nickName;
                this.UID.text = "UID: " + item.userId;
                this.Volume.text = utils_1.default.toDecimal(item.consum, 2) + " USDT";
            }
        },
        enumerable: true,
        configurable: true
    });
    return priHistory;
}(layaMaxUI_1.ui.template.priHistoryUI));
exports.default = priHistory;
},{"../js/utils":35,"../ui/layaMaxUI":62}],54:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-22 11:40:42
 * @modify date 2019-02-22 11:40:42
 * @desc 火箭大奖排行榜
 */
var layaMaxUI_1 = require("../ui/layaMaxUI");
var utils_1 = require("../js/utils");
var prixList = /** @class */ (function (_super) {
    __extends(prixList, _super);
    function prixList() {
        return _super.call(this) || this;
    }
    Object.defineProperty(prixList.prototype, "dataSource", {
        set: function (item) {
            if (item) {
                this.no1.visible = item.rank === 1 ? true : false;
                this.rankNo.visible = item.rank === 1 ? false : true;
                this.rankNo.text = item.rank;
                this.avatar.skin = item.avatar;
                this.nickName.text = item.nickName;
                this.UID.text = "UID: " + item.userId;
                this.todayVolume.text = utils_1.default.toDecimal(item.consum, 2) + " USDT";
            }
        },
        enumerable: true,
        configurable: true
    });
    return prixList;
}(layaMaxUI_1.ui.template.prixListUI));
exports.default = prixList;
},{"../js/utils":35,"../ui/layaMaxUI":62}],55:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:49:23
 * @modify date 2019-02-19 17:49:23
 * @desc 交易密码输入弹窗脚本
 */
var layaMaxUI_1 = require("../ui/layaMaxUI");
var tipDialog_1 = require("./tipDialog");
var Toast_1 = require("../view/Toast");
var api_1 = require("../js/api");
var IptPswDom = /** @class */ (function (_super) {
    __extends(IptPswDom, _super);
    function IptPswDom() {
        var _this = _super.call(this) || this;
        _this.period = ''; //期号
        _this.codeList = ''; //购买号码
        _this.isEnter = false; //函数节流
        _this.AllCodeList = []; //所有号码列表
        return _this;
    }
    IptPswDom.prototype.onEnable = function () {
        this.btnClose.on(Laya.Event.CLICK, this, this.closeFunc);
        this.IptPsw.on(Laya.Event.FOCUS, this, this.onFocus);
        this.IptPsw.on(Laya.Event.BLUR, this, this.onBLUR);
        this.IptPsw.on(Laya.Event.KEY_UP, this, this.onChange);
    };
    /**获取传递的参数 */
    IptPswDom.prototype.setData = function (data) {
        this.period = data.period;
        this.codeList = data.codeList;
        this.AllCodeList = data.AllCodeList;
    };
    /**输入内容改变 */
    IptPswDom.prototype.onChange = function () {
        if (!this.isEnter && this.IptPsw.text.length === 6) {
            this.tradeBuy();
        }
    };
    /**购买 */
    IptPswDom.prototype.tradeBuy = function () {
        var _this = this;
        this.isEnter = true;
        api_1.default.postTradeBuy(this.period, this.codeList, this.IptPsw.text).then(function (res) {
            _this.isEnter = false;
            _this.closeFunc();
            _this.event("refreshData"); //刷新数据列表
            // 购买成功弹出对话框
            var tipsDialog = new tipDialog_1.default();
            tipsDialog.popup();
            tipsDialog.setData({
                AllCodeList: _this.AllCodeList
            });
        }).catch(function (err) {
            _this.isEnter = false;
            _this.closeFunc();
            Toast_1.Toast.show(err.message);
        });
    };
    /**关闭密码框 */
    IptPswDom.prototype.closeFunc = function () {
        this.close();
        this.IptPsw.text = '';
    };
    /**输入框获得焦点 */
    IptPswDom.prototype.onFocus = function () {
        this.top = 150;
    };
    /**输入框获得焦点 */
    IptPswDom.prototype.onBLUR = function () {
        this.top = 440;
    };
    return IptPswDom;
}(layaMaxUI_1.ui.template.InputPwdDialogUI));
exports.default = IptPswDom;
},{"../js/api":31,"../ui/layaMaxUI":62,"../view/Toast":65,"./tipDialog":59}],56:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-22 11:40:42
 * @modify date 2019-02-22 11:40:42
 * @desc 火箭大奖火箭名单
 */
var layaMaxUI_1 = require("../ui/layaMaxUI");
var prixList = /** @class */ (function (_super) {
    __extends(prixList, _super);
    function prixList() {
        return _super.call(this) || this;
    }
    Object.defineProperty(prixList.prototype, "dataSource", {
        set: function (item) {
            if (item) {
                this.ranking.text = item.rank;
                this.nickName.text = item.nickName.length > 4 ? item.nickName.substr(0, 4) + "..." : item.nickName;
                this.uid.text = item.userId;
                this.amount.text = item.amount;
            }
        },
        enumerable: true,
        configurable: true
    });
    return prixList;
}(layaMaxUI_1.ui.template.rankingListUI));
exports.default = prixList;
},{"../ui/layaMaxUI":62}],57:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-27 10:06:18
 * @modify date 2019-02-27 10:06:18
 * @desc 充值提币弹出脚本
 */
var layaMaxUI_1 = require("../ui/layaMaxUI");
var RechargeDialog = /** @class */ (function (_super) {
    __extends(RechargeDialog, _super);
    function RechargeDialog() {
        return _super.call(this) || this;
    }
    RechargeDialog.prototype.onEnable = function () {
        this.btn_quickRecharge.on(Laya.Event.CLICK, this, this.quickRechargeFunc);
        this.btn_withdraw.on(Laya.Event.CLICK, this, this.withdrawFunc);
    };
    /**快捷充值 */
    RechargeDialog.prototype.quickRechargeFunc = function () {
        window.location.href = "https://" + document.domain + "/#/chargeKuaiBi";
    };
    /**USDT钱包提币 */
    RechargeDialog.prototype.withdrawFunc = function () {
        window.location.href = "https://" + document.domain + "/#/walletCharge";
    };
    return RechargeDialog;
}(layaMaxUI_1.ui.template.rechargeDialogUI));
exports.default = RechargeDialog;
},{"../ui/layaMaxUI":62}],58:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-26 11:12:09
 * @modify date 2019-02-26 11:12:09
 * @desc 入围名单列表
 */
var layaMaxUI_1 = require("../ui/layaMaxUI");
var shortListBox = /** @class */ (function (_super) {
    __extends(shortListBox, _super);
    function shortListBox() {
        return _super.call(this) || this;
    }
    Object.defineProperty(shortListBox.prototype, "dataSource", {
        set: function (item) {
            if (item) {
                this.number.text = item.shortlistedNumber < 10 ? "0" + item.shortlistedNumber : item.shortlistedNumber;
                this.nickName.text = item.nickName;
                this.userId.text = item.userId;
            }
        },
        enumerable: true,
        configurable: true
    });
    return shortListBox;
}(layaMaxUI_1.ui.template.shortListUI));
exports.default = shortListBox;
},{"../ui/layaMaxUI":62}],59:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:44:02
 * @modify date 2019-02-19 17:44:02
 * @desc 购买成功后的提示框脚本
 */
var layaMaxUI_1 = require("../ui/layaMaxUI");
var Tabbar_1 = require("../view/Tabbar");
var TipsDiaLog = /** @class */ (function (_super) {
    __extends(TipsDiaLog, _super);
    function TipsDiaLog() {
        var _this = _super.call(this) || this;
        _this.AllCodeList = []; //号码列表
        return _this;
    }
    TipsDiaLog.prototype.onEnable = function () {
        this.btnContinue.on(Laya.Event.CLICK, this, this.closeFunc);
        this.btnViewRecord.on(Laya.Event.CLICK, this, this.viewRecordFunc);
    };
    /**获取传递的参数 */
    TipsDiaLog.prototype.setData = function (data) {
        this.AllCodeList = data.AllCodeList;
    };
    /**关闭密码框 */
    TipsDiaLog.prototype.closeFunc = function () {
        this.close();
        // 若全部被购买，则回到首页重新选择购买期号
        var count = 0;
        this.AllCodeList.forEach(function (v) {
            if (v.buyerId !== '0') {
                count = count + 1;
            }
        });
        if (count === this.AllCodeList.length) {
            Tabbar_1.Tabbar.getInstance().openScene('home.scene');
        }
    };
    // 查看记录
    TipsDiaLog.prototype.viewRecordFunc = function () {
        this.close();
        Tabbar_1.Tabbar.getInstance().openScene('record.scene');
    };
    return TipsDiaLog;
}(layaMaxUI_1.ui.template.TipsDialogUI));
exports.default = TipsDiaLog;
},{"../ui/layaMaxUI":62,"../view/Tabbar":64}],60:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-21 16:32:01
 * @modify date 2019-02-21 16:32:01
 * @desc 走势列表脚本
 */
var layaMaxUI_1 = require("../ui/layaMaxUI");
var Tabbar_1 = require("../view/Tabbar");
var trendList = /** @class */ (function (_super) {
    __extends(trendList, _super);
    function trendList() {
        var _this = _super.call(this) || this;
        _this.btn_buy.on(Laya.Event.CLICK, _this, _this.btnBuyFunc);
        return _this;
    }
    Object.defineProperty(trendList.prototype, "dataSource", {
        set: function (item) {
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
        },
        enumerable: true,
        configurable: true
    });
    /**立即购买 */
    trendList.prototype.btnBuyFunc = function () {
        if (this._item !== null) {
            Tabbar_1.Tabbar.getInstance().openScene('guessing.scene', this._item.goodsId);
        }
    };
    return trendList;
}(layaMaxUI_1.ui.template.trendListUI));
exports.default = trendList;
},{"../ui/layaMaxUI":62,"../view/Tabbar":64}],61:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-26 10:21:37
 * @modify date 2019-02-26 10:21:37
 * @desc 喜从天降中奖名单列表脚本
 */
var layaMaxUI_1 = require("../ui/layaMaxUI");
var utils_1 = require("../js/utils");
var WinningList = /** @class */ (function (_super) {
    __extends(WinningList, _super);
    function WinningList() {
        return _super.call(this) || this;
    }
    Object.defineProperty(WinningList.prototype, "dataSource", {
        set: function (item) {
            if (item) {
                this.period.text = item.belongTime;
                this.date.text = utils_1.default.formatDateTime(item.balanceTime);
                this.nickName.text = item.nickName;
                this.amount.text = +item.money + " USDT";
                this.code.text = item.hitNumber;
            }
        },
        enumerable: true,
        configurable: true
    });
    return WinningList;
}(layaMaxUI_1.ui.template.winningListUI));
exports.default = WinningList;
},{"../js/utils":35,"../ui/layaMaxUI":62}],62:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ui;
(function (ui) {
    var assistantUI = /** @class */ (function (_super) {
        __extends(assistantUI, _super);
        function assistantUI() {
            return _super.call(this) || this;
        }
        assistantUI.prototype.createChildren = function () {
            _super.prototype.createChildren.call(this);
            this.loadScene("assistant");
        };
        return assistantUI;
    }(Laya.Scene));
    ui.assistantUI = assistantUI;
    var CardUI = /** @class */ (function (_super) {
        __extends(CardUI, _super);
        function CardUI() {
            return _super.call(this) || this;
        }
        CardUI.prototype.createChildren = function () {
            _super.prototype.createChildren.call(this);
            this.loadScene("Card");
        };
        return CardUI;
    }(Laya.View));
    ui.CardUI = CardUI;
    var grandPrixUI = /** @class */ (function (_super) {
        __extends(grandPrixUI, _super);
        function grandPrixUI() {
            return _super.call(this) || this;
        }
        grandPrixUI.prototype.createChildren = function () {
            _super.prototype.createChildren.call(this);
            this.loadScene("grandPrix");
        };
        return grandPrixUI;
    }(Laya.Scene));
    ui.grandPrixUI = grandPrixUI;
    var guessingUI = /** @class */ (function (_super) {
        __extends(guessingUI, _super);
        function guessingUI() {
            return _super.call(this) || this;
        }
        guessingUI.prototype.createChildren = function () {
            _super.prototype.createChildren.call(this);
            this.loadScene("guessing");
        };
        return guessingUI;
    }(Laya.Scene));
    ui.guessingUI = guessingUI;
    var homeUI = /** @class */ (function (_super) {
        __extends(homeUI, _super);
        function homeUI() {
            return _super.call(this) || this;
        }
        homeUI.prototype.createChildren = function () {
            _super.prototype.createChildren.call(this);
            this.loadScene("home");
        };
        return homeUI;
    }(Laya.Scene));
    ui.homeUI = homeUI;
    var loadingSceneUI = /** @class */ (function (_super) {
        __extends(loadingSceneUI, _super);
        function loadingSceneUI() {
            return _super.call(this) || this;
        }
        loadingSceneUI.prototype.createChildren = function () {
            _super.prototype.createChildren.call(this);
            this.loadScene("loadingScene");
        };
        return loadingSceneUI;
    }(Laya.Scene));
    ui.loadingSceneUI = loadingSceneUI;
    var priHistorySceneUI = /** @class */ (function (_super) {
        __extends(priHistorySceneUI, _super);
        function priHistorySceneUI() {
            return _super.call(this) || this;
        }
        priHistorySceneUI.prototype.createChildren = function () {
            _super.prototype.createChildren.call(this);
            this.loadScene("priHistoryScene");
        };
        return priHistorySceneUI;
    }(Laya.Scene));
    ui.priHistorySceneUI = priHistorySceneUI;
    var recordUI = /** @class */ (function (_super) {
        __extends(recordUI, _super);
        function recordUI() {
            return _super.call(this) || this;
        }
        recordUI.prototype.createChildren = function () {
            _super.prototype.createChildren.call(this);
            this.loadScene("record");
        };
        return recordUI;
    }(Laya.Scene));
    ui.recordUI = recordUI;
    var shortListedUI = /** @class */ (function (_super) {
        __extends(shortListedUI, _super);
        function shortListedUI() {
            return _super.call(this) || this;
        }
        shortListedUI.prototype.createChildren = function () {
            _super.prototype.createChildren.call(this);
            this.loadScene("shortListed");
        };
        return shortListedUI;
    }(Laya.Scene));
    ui.shortListedUI = shortListedUI;
    var TabbarUI = /** @class */ (function (_super) {
        __extends(TabbarUI, _super);
        function TabbarUI() {
            return _super.call(this) || this;
        }
        TabbarUI.prototype.createChildren = function () {
            _super.prototype.createChildren.call(this);
            this.loadScene("Tabbar");
        };
        return TabbarUI;
    }(Laya.View));
    ui.TabbarUI = TabbarUI;
    var xctjUI = /** @class */ (function (_super) {
        __extends(xctjUI, _super);
        function xctjUI() {
            return _super.call(this) || this;
        }
        xctjUI.prototype.createChildren = function () {
            _super.prototype.createChildren.call(this);
            this.loadScene("xctj");
        };
        return xctjUI;
    }(Laya.Scene));
    ui.xctjUI = xctjUI;
})(ui = exports.ui || (exports.ui = {}));
(function (ui) {
    var template;
    (function (template) {
        var InputPwdDialogUI = /** @class */ (function (_super) {
            __extends(InputPwdDialogUI, _super);
            function InputPwdDialogUI() {
                return _super.call(this) || this;
            }
            InputPwdDialogUI.prototype.createChildren = function () {
                _super.prototype.createChildren.call(this);
                this.loadScene("template/InputPwdDialog");
            };
            return InputPwdDialogUI;
        }(Laya.Dialog));
        template.InputPwdDialogUI = InputPwdDialogUI;
        var joinRecordsUI = /** @class */ (function (_super) {
            __extends(joinRecordsUI, _super);
            function joinRecordsUI() {
                return _super.call(this) || this;
            }
            joinRecordsUI.prototype.createChildren = function () {
                _super.prototype.createChildren.call(this);
                this.loadScene("template/joinRecords");
            };
            return joinRecordsUI;
        }(Laya.View));
        template.joinRecordsUI = joinRecordsUI;
        var numberListDOMUI = /** @class */ (function (_super) {
            __extends(numberListDOMUI, _super);
            function numberListDOMUI() {
                return _super.call(this) || this;
            }
            numberListDOMUI.prototype.createChildren = function () {
                _super.prototype.createChildren.call(this);
                this.loadScene("template/numberListDOM");
            };
            return numberListDOMUI;
        }(Laya.View));
        template.numberListDOMUI = numberListDOMUI;
        var previousRecordsUI = /** @class */ (function (_super) {
            __extends(previousRecordsUI, _super);
            function previousRecordsUI() {
                return _super.call(this) || this;
            }
            previousRecordsUI.prototype.createChildren = function () {
                _super.prototype.createChildren.call(this);
                this.loadScene("template/previousRecords");
            };
            return previousRecordsUI;
        }(Laya.View));
        template.previousRecordsUI = previousRecordsUI;
        var priHistoryUI = /** @class */ (function (_super) {
            __extends(priHistoryUI, _super);
            function priHistoryUI() {
                return _super.call(this) || this;
            }
            priHistoryUI.prototype.createChildren = function () {
                _super.prototype.createChildren.call(this);
                this.loadScene("template/priHistory");
            };
            return priHistoryUI;
        }(Laya.Scene));
        template.priHistoryUI = priHistoryUI;
        var prixListUI = /** @class */ (function (_super) {
            __extends(prixListUI, _super);
            function prixListUI() {
                return _super.call(this) || this;
            }
            prixListUI.prototype.createChildren = function () {
                _super.prototype.createChildren.call(this);
                this.loadScene("template/prixList");
            };
            return prixListUI;
        }(Laya.Scene));
        template.prixListUI = prixListUI;
        var rankingListUI = /** @class */ (function (_super) {
            __extends(rankingListUI, _super);
            function rankingListUI() {
                return _super.call(this) || this;
            }
            rankingListUI.prototype.createChildren = function () {
                _super.prototype.createChildren.call(this);
                this.loadScene("template/rankingList");
            };
            return rankingListUI;
        }(Laya.Scene));
        template.rankingListUI = rankingListUI;
        var rechargeDialogUI = /** @class */ (function (_super) {
            __extends(rechargeDialogUI, _super);
            function rechargeDialogUI() {
                return _super.call(this) || this;
            }
            rechargeDialogUI.prototype.createChildren = function () {
                _super.prototype.createChildren.call(this);
                this.loadScene("template/rechargeDialog");
            };
            return rechargeDialogUI;
        }(Laya.Dialog));
        template.rechargeDialogUI = rechargeDialogUI;
        var shortListUI = /** @class */ (function (_super) {
            __extends(shortListUI, _super);
            function shortListUI() {
                return _super.call(this) || this;
            }
            shortListUI.prototype.createChildren = function () {
                _super.prototype.createChildren.call(this);
                this.loadScene("template/shortList");
            };
            return shortListUI;
        }(Laya.Scene));
        template.shortListUI = shortListUI;
        var showRocketUI = /** @class */ (function (_super) {
            __extends(showRocketUI, _super);
            function showRocketUI() {
                return _super.call(this) || this;
            }
            showRocketUI.prototype.createChildren = function () {
                _super.prototype.createChildren.call(this);
                this.loadScene("template/showRocket");
            };
            return showRocketUI;
        }(Laya.Dialog));
        template.showRocketUI = showRocketUI;
        var TipsDialogUI = /** @class */ (function (_super) {
            __extends(TipsDialogUI, _super);
            function TipsDialogUI() {
                return _super.call(this) || this;
            }
            TipsDialogUI.prototype.createChildren = function () {
                _super.prototype.createChildren.call(this);
                this.loadScene("template/TipsDialog");
            };
            return TipsDialogUI;
        }(Laya.Dialog));
        template.TipsDialogUI = TipsDialogUI;
        var trendListUI = /** @class */ (function (_super) {
            __extends(trendListUI, _super);
            function trendListUI() {
                return _super.call(this) || this;
            }
            trendListUI.prototype.createChildren = function () {
                _super.prototype.createChildren.call(this);
                this.loadScene("template/trendList");
            };
            return trendListUI;
        }(Laya.Scene));
        template.trendListUI = trendListUI;
        var winningListUI = /** @class */ (function (_super) {
            __extends(winningListUI, _super);
            function winningListUI() {
                return _super.call(this) || this;
            }
            winningListUI.prototype.createChildren = function () {
                _super.prototype.createChildren.call(this);
                this.loadScene("template/winningList");
            };
            return winningListUI;
        }(Laya.Scene));
        template.winningListUI = winningListUI;
    })(template = ui.template || (ui.template = {}));
})(ui = exports.ui || (exports.ui = {}));
},{}],63:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LayerType = {
    LAYER_SCENE: "LAYER_SCENE",
    LAYER_UI: "LAYER_UI",
    LAYER_MSG: "LAYER_MSG"
};
var layerMap = {};
var LayerManager = /** @class */ (function () {
    function LayerManager() {
    }
    LayerManager.init = function (layers) {
        layers.forEach(function (layerName) {
            if (layerName === exports.LayerType.LAYER_SCENE) {
                layerMap[layerName] = Laya.Scene.root;
            }
            else {
                var layer = layerMap[layerName] = new Laya.UIComponent();
                layer.left = 0;
                layer.right = 0;
                layer.top = 0;
                layer.bottom = 0;
                Laya.stage.addChild(layer);
            }
        });
        // Laya.stage.on(Laya.Event.RESIZE, this, this.onResize);
    };
    LayerManager.addToLayer = function (node, layerName) {
        LayerManager.checkInit();
        if (!node)
            return false;
        var layer = layerMap[layerName];
        if (!layer)
            return false;
        layer.addChild(node);
        return true;
    };
    LayerManager.removeFromLayer = function (node, layerName) {
        LayerManager.checkInit();
        var layer = layerMap[layerName];
        if (layer) {
            var rNode = layer.removeChild(node);
            if (rNode)
                return true;
        }
        return false;
    };
    LayerManager.getLayer = function (layerName) {
        return layerMap[layerName];
    };
    LayerManager.checkInit = function () {
        if (LayerManager.inited) {
            return;
        }
        LayerManager.init([
            exports.LayerType.LAYER_SCENE,
            exports.LayerType.LAYER_UI,
            exports.LayerType.LAYER_MSG
        ]);
        LayerManager.inited = true;
    };
    LayerManager.onResize = function () {
        for (var layerName in layerMap) {
            if (layerName !== exports.LayerType.LAYER_SCENE && layerMap.hasOwnProperty(layerName)) {
                var layer = layerMap[layerName];
                layer.size(Laya.stage.width, Laya.stage.height);
                layer.event(Laya.Event.RESIZE);
            }
        }
    };
    return LayerManager;
}());
exports.LayerManager = LayerManager;
},{}],64:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:50:10
 * @modify date 2019-02-19 17:50:10
 * @desc 底部导航Tabbar脚本
 */
var layaMaxUI_1 = require("../ui/layaMaxUI");
var GameModel_1 = require("../js/GameModel");
var tabbarArr = ['home.scene', 'record.scene', 'assistant.scene']; //tabbar的页面
var pageArr = [
    'guessing.scene', 'grandPrix.scene',
    'priHistoryScene.scene', 'xctj.scene',
    'shortListed.scene'
]; //非tabbar页面
var Tabbar = /** @class */ (function (_super) {
    __extends(Tabbar, _super);
    function Tabbar() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Tabbar.getInstance = function () {
        if (!this._tabbar) {
            this._tabbar = new Tabbar();
        }
        return this._tabbar;
    };
    Tabbar.show = function () {
        var tabIns = this.getInstance();
        Laya.stage.addChild(tabIns);
    };
    Tabbar.hide = function () {
        if (this._tabbar) {
            this._tabbar.removeSelf();
        }
    };
    Tabbar.prototype.onEnable = function () {
        var _this = this;
        GameModel_1.GameModel.getInstance().on('getNotice', this, function (res) {
            if (res) {
                _this.notice.visible = true;
            }
            else {
                _this.notice.visible = false;
            }
        });
    };
    /**非tabbar跳转页面,可携带参数 */
    Tabbar.prototype.openScene = function (scene, param) {
        this._openSceneParam = param;
        this.tab.selectedIndex = Tabbar.SCENES.indexOf(scene);
    };
    /**监视tabbar改变 */
    Tabbar.prototype.createView = function (view) {
        _super.prototype.createView.call(this, view);
        this.tab.on(Laya.Event.CHANGE, this, this.onClickTab);
        // this.onClickTab();
    };
    /**点击tabbar事件 */
    Tabbar.prototype.onClickTab = function () {
        var _this = this;
        var userInfo = Object.keys(GameModel_1.GameModel.getInstance().userInfo);
        var scene = Tabbar.SCENES[this.tab.selectedIndex];
        if (userInfo.length === 0 && (scene === 'record.scene' || scene === 'assistant.scene')) {
            console.log('未登录跳转登录');
            window.location.href = "https://" + document.domain + "/#/sign_one";
        }
        else {
            Laya.Scene.open(scene, true, this._openSceneParam);
            this._openSceneParam = null;
            this.tab.items.forEach(function (item) {
                var tabBtn = item;
                var imgBtn = tabBtn.getChildAt(0);
                imgBtn.selected = false;
            });
            tabbarArr.forEach(function (item) {
                if (item === scene) {
                    var tabBtn = _this.tab.selection;
                    var imgBtn = tabBtn.getChildAt(0);
                    imgBtn.selected = true;
                }
            });
            //关闭小红点
            if (scene === 'record.scene') {
                GameModel_1.GameModel.getInstance().noticeFunc(false);
            }
        }
    };
    /**页面数组 */
    Tabbar.SCENES = tabbarArr.concat(pageArr);
    return Tabbar;
}(layaMaxUI_1.ui.TabbarUI));
exports.Tabbar = Tabbar;
},{"../js/GameModel":30,"../ui/layaMaxUI":62}],65:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var LayerManager_1 = require("./LayerManager");
var Toast = /** @class */ (function (_super) {
    __extends(Toast, _super);
    function Toast() {
        return _super.call(this) || this;
    }
    Toast.show = function (text, duration, coverBefore) {
        if (duration === void 0) { duration = Toast.DURATION; }
        if (coverBefore === void 0) { coverBefore = true; }
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
    };
    Toast.doShow = function (text, duration) {
        Toast.instance.setText(text);
        LayerManager_1.LayerManager.addToLayer(Toast.instance, LayerManager_1.LayerType.LAYER_MSG);
        Toast.instance.timer.once(duration || Toast.DURATION, Toast.instance, Toast.instance.close, null, true);
    };
    Toast.onClose = function () {
        if (Toast.storeTextList.length > 0) {
            var data = Toast.storeTextList.shift();
            Toast.doShow(data.text, data.duration);
        }
    };
    Toast.prototype.setText = function (text) {
        this.width = Toast.MAX_WIDTH;
        this.label.width = NaN;
        this.label.dataSource = text;
        this.onTextChange();
    };
    Toast.prototype.close = function () {
        this.removeSelf();
        this.event(Laya.Event.CLOSE);
    };
    Toast.prototype.createChildren = function () {
        this.centerX = 0;
        this.height = Toast.MARGIN + Toast.MARGIN;
        _super.prototype.createChildren.call(this);
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
    };
    // protected initialize() {
    //     super.initialize();
    //     this.bindViewEvent(this.label, Laya.Event.CHANGE, this.onTextChange);
    // }
    Toast.prototype.onTextChange = function () {
        var textW = this.label.width;
        var maxTextW = Toast.MAX_WIDTH - Toast.MARGIN * 2;
        // const minTextW: number = Toast.MIN_WIDTH - Toast.MARGIN * 2;
        if (textW > maxTextW) {
            this.label.width = maxTextW;
        }
        var w = this.label.width + Toast.MARGIN * 2;
        w = Math.min(w, Toast.MAX_WIDTH);
        w = Math.max(w, Toast.MIN_WIDTH);
        this.width = w;
        // this.height = this.label.height + Toast.TOP + Toast.BOTTOM;
        this.height = this.label.height + Toast.MARGIN * 2;
        this.x = (Laya.stage.width - this.width) >> 1;
        this.y = (Laya.stage.height - this.height) >> 1;
    };
    Toast.prototype.onCompResize = function () {
        // if (this.label) {
        //     this.height = this.label.height + MessageTip.MARGIN + MessageTip.MARGIN;
        // }
        if (this.bg) {
            this.bg.width = this.width;
            this.bg.height = this.height;
        }
    };
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
    return Toast;
}(Laya.UIComponent));
exports.Toast = Toast;
},{"./LayerManager":63}],66:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var layaMaxUI_1 = require("../ui/layaMaxUI");
var GameModel_1 = require("../js/GameModel");
var RocketDialog = /** @class */ (function (_super) {
    __extends(RocketDialog, _super);
    function RocketDialog() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(RocketDialog, "dlg", {
        get: function () {
            if (!this._dlg) {
                this._dlg = new RocketDialog();
                this._dlg.x = 0;
                this._dlg.y = 0;
                this._dlg.isPopupCenter = false;
            }
            return this._dlg;
        },
        enumerable: true,
        configurable: true
    });
    RocketDialog.prototype.onEnable = function () {
        this.btn_close.on(Laya.Event.CLICK, this, this.closeDialog);
        this.ani1.play(0, false);
        this.ani2.play(0, false);
    };
    RocketDialog.init = function () {
        var _this = this;
        GameModel_1.GameModel.getInstance().on('getRocketRanking', this, function (res) {
            console.log(res);
            _this.dlg.popup(false, false);
            _this.dlg.ranking.array = res;
        });
    };
    RocketDialog.prototype.closeDialog = function () {
        this.close();
    };
    return RocketDialog;
}(layaMaxUI_1.ui.template.showRocketUI));
exports.default = RocketDialog;
},{"../js/GameModel":30,"../ui/layaMaxUI":62}]},{},[29])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL1Byb2dyYW0gRmlsZXMgKHg4NikvTGF5YUFpcklERS12Mi4wLjAvcmVzb3VyY2VzL2FwcC9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiLi4vLi4vLi4vLi4vUHJvZ3JhbSBGaWxlcyAoeDg2KS9MYXlhQWlySURFLXYyLjAuMC9yZXNvdXJjZXMvYXBwL25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2FkYXB0ZXJzL3hoci5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvYXhpb3MuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2NhbmNlbC9DYW5jZWwuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2NhbmNlbC9DYW5jZWxUb2tlbi5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvY2FuY2VsL2lzQ2FuY2VsLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9jb3JlL0F4aW9zLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9jb3JlL0ludGVyY2VwdG9yTWFuYWdlci5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvY29yZS9jcmVhdGVFcnJvci5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvY29yZS9kaXNwYXRjaFJlcXVlc3QuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2NvcmUvZW5oYW5jZUVycm9yLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9jb3JlL3NldHRsZS5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvY29yZS90cmFuc2Zvcm1EYXRhLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9kZWZhdWx0cy5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvaGVscGVycy9iaW5kLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9oZWxwZXJzL2J0b2EuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2hlbHBlcnMvYnVpbGRVUkwuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2hlbHBlcnMvY29tYmluZVVSTHMuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2hlbHBlcnMvY29va2llcy5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvaGVscGVycy9pc0Fic29sdXRlVVJMLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9oZWxwZXJzL2lzVVJMU2FtZU9yaWdpbi5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvaGVscGVycy9ub3JtYWxpemVIZWFkZXJOYW1lLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9oZWxwZXJzL3BhcnNlSGVhZGVycy5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvaGVscGVycy9zcHJlYWQuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL3V0aWxzLmpzIiwibm9kZV9tb2R1bGVzL2lzLWJ1ZmZlci9pbmRleC5qcyIsInNyYy9HYW1lQ29uZmlnLnRzIiwic3JjL01haW4udHMiLCJzcmMvanMvR2FtZU1vZGVsLnRzIiwic3JjL2pzL2FwaS50cyIsInNyYy9qcy9odHRwLnRzIiwic3JjL2pzL3NjcmVlblV0aWxzLnRzIiwic3JjL2pzL3NvY2tldC50cyIsInNyYy9qcy91dGlscy50cyIsInNyYy9sb2FkaW5nUmVzTGlzdC50cyIsInNyYy9wdWJsaWNTY3JpcHQvUGFnZU5hdlNjcmlwdC50cyIsInNyYy9wdWJsaWNTY3JpcHQvUGFnZVNjcmlwdC50cyIsInNyYy9wdWJsaWNTY3JpcHQvU2NyZWVuLnRzIiwic3JjL3NjcmlwdC9Bc3Npc3RhbnQudHMiLCJzcmMvc2NyaXB0L0NhcmQudHMiLCJzcmMvc2NyaXB0L0d1ZXNzaW5nLnRzIiwic3JjL3NjcmlwdC9Ib21lLnRzIiwic3JjL3NjcmlwdC9SZWNvcmQudHMiLCJzcmMvc2NyaXB0L2dyYW5kUHJpeC50cyIsInNyYy9zY3JpcHQvbG9hZGluZ1NjZW5lLnRzIiwic3JjL3NjcmlwdC9wcmlIaXN0b3J5U2NlbmUudHMiLCJzcmMvc2NyaXB0L3Nob3J0TGlzdGVkLnRzIiwic3JjL3NjcmlwdC93aW5uaW5nLnRzIiwic3JjL3RlbXBsYXRlL2pvaW5SZWNvcmRzLnRzIiwic3JjL3RlbXBsYXRlL251bWJlckxpc3REb21TY3JpcHQudHMiLCJzcmMvdGVtcGxhdGUvcHJldmlvdXNSZWNvcmRzLnRzIiwic3JjL3RlbXBsYXRlL3ByaUhpc3RvcnkudHMiLCJzcmMvdGVtcGxhdGUvcHJpeExpc3QudHMiLCJzcmMvdGVtcGxhdGUvcHN3SW5wdXQudHMiLCJzcmMvdGVtcGxhdGUvcmFua2luZ0xpc3QudHMiLCJzcmMvdGVtcGxhdGUvcmVjaGFyZ2VEaWFsb2cudHMiLCJzcmMvdGVtcGxhdGUvc2hvcnRMaXN0ZWRMaXN0LnRzIiwic3JjL3RlbXBsYXRlL3RpcERpYWxvZy50cyIsInNyYy90ZW1wbGF0ZS90cmVuZExpc3QudHMiLCJzcmMvdGVtcGxhdGUvd2lubmluZ0xpc3QudHMiLCJzcmMvdWkvbGF5YU1heFVJLnRzIiwic3JjL3ZpZXcvTGF5ZXJNYW5hZ2VyLnRzIiwic3JjL3ZpZXcvVGFiYmFyLnRzIiwic3JjL3ZpZXcvVG9hc3QudHMiLCJzcmMvdmlldy9yb2NrZXREaWFsb2cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeExBOzs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3BMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDaEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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QU0sQ0FBQTtTQUFDO1FBQUEsT0FBTSxDQUFDLEVBQUMsR0FBRTtRQUFBLENBQUM7UUFDdkQsSUFBRztZQUFDLEVBQUUsR0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtTQUFDO1FBQUEsT0FBTSxDQUFDLEVBQUMsR0FBRTtRQUFBLENBQUM7UUFDdkQsRUFBRSxHQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFDLEVBQUUsR0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxPQUFPLENBQUMsRUFBRSxHQUFDLEVBQUUsQ0FBQyxHQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFDLEVBQUUsR0FBQyxFQUFFLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBQ0QsVUFBVTtJQUNWLE1BQU0sWUFBQyxJQUFJLEVBQUMsSUFBSTtRQUNaLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxFQUFFLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFDLEVBQUUsR0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDOUMsSUFBRztZQUFDLENBQUMsSUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtTQUFDO1FBQUEsT0FBTSxDQUFDLEVBQUMsR0FBRTtRQUN6QyxJQUFHO1lBQUMsQ0FBQyxJQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBO1NBQUM7UUFBQSxPQUFNLENBQUMsRUFBQyxHQUFFO1FBQ3pDLE9BQU8sTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFD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QUNyQixDQUFDOzs7T0FBQTtJQUVELCtCQUFRLEdBQVI7UUFDRyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBQyxJQUFJLEVBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ3pELElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxLQUFLLENBQUMsQ0FBQTtRQUN2QixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLENBQUE7SUFDMUIsQ0FBQztJQUNNLGlCQUFJLEdBQVg7UUFBQSxpQkFNQztRQUxHLHFCQUFTLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxDQUFDLGtCQUFrQixFQUFDLElBQUksRUFBQyxVQUFDLEdBQU87WUFDdkQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNqQixLQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDN0IsS0FBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQztRQUNqQyxDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUM7SUFFRCxrQ0FBVyxHQUFYO1FBQ0ksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ2hCLENBQUM7SUFFTCxtQkFBQztBQUFELENBOUJBLEFBOEJDLENBOUJ5QyxjQUFFLENBQUMsUUFBUSxDQUFDLFlBQVksR0E4QmpFIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IChmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgZXh0ZW5kU3RhdGljcyA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fFxyXG4gICAgICAgICh7IF9fcHJvdG9fXzogW10gfSBpbnN0YW5jZW9mIEFycmF5ICYmIGZ1bmN0aW9uIChkLCBiKSB7IGQuX19wcm90b19fID0gYjsgfSkgfHxcclxuICAgICAgICBmdW5jdGlvbiAoZCwgYikgeyBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTsgfTtcclxuICAgIHJldHVybiBmdW5jdGlvbiAoZCwgYikge1xyXG4gICAgICAgIGV4dGVuZFN0YXRpY3MoZCwgYik7XHJcbiAgICAgICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XHJcbiAgICAgICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xyXG4gICAgfTtcclxufSkoKTtcclxuKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XHJcblxyXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcclxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXHJcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcclxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cclxuXHJcbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xyXG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xyXG5cclxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xyXG59XHJcbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcclxufVxyXG4oZnVuY3Rpb24gKCkge1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XHJcbiAgICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xyXG4gICAgfVxyXG4gICAgdHJ5IHtcclxuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcclxuICAgICAgICB9XHJcbiAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcclxuICAgIH1cclxufSAoKSlcclxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcclxuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XHJcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXHJcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcclxuICAgIH1cclxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXHJcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcclxuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcclxuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xyXG4gICAgfVxyXG4gICAgdHJ5IHtcclxuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXHJcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcclxuICAgIH0gY2F0Y2goZSl7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XHJcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcclxuICAgICAgICB9IGNhdGNoKGUpe1xyXG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxyXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbn1cclxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xyXG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XHJcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXHJcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xyXG4gICAgfVxyXG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxyXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XHJcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xyXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcclxuICAgIH1cclxuICAgIHRyeSB7XHJcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xyXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcclxuICAgIH0gY2F0Y2ggKGUpe1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XHJcbiAgICAgICAgfSBjYXRjaCAoZSl7XHJcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxyXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XHJcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG5cclxufVxyXG52YXIgcXVldWUgPSBbXTtcclxudmFyIGRyYWluaW5nID0gZmFsc2U7XHJcbnZhciBjdXJyZW50UXVldWU7XHJcbnZhciBxdWV1ZUluZGV4ID0gLTE7XHJcblxyXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XHJcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xyXG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcclxuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XHJcbiAgICB9XHJcbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XHJcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xyXG4gICAgaWYgKGRyYWluaW5nKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XHJcbiAgICBkcmFpbmluZyA9IHRydWU7XHJcblxyXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcclxuICAgIHdoaWxlKGxlbikge1xyXG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xyXG4gICAgICAgIHF1ZXVlID0gW107XHJcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xyXG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XHJcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xyXG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcclxuICAgIH1cclxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XHJcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xyXG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xyXG59XHJcblxyXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xyXG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xyXG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcclxuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XHJcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcclxuICAgIH1cclxufTtcclxuXHJcbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcclxuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XHJcbiAgICB0aGlzLmZ1biA9IGZ1bjtcclxuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcclxufVxyXG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcclxufTtcclxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcclxucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcclxucHJvY2Vzcy5lbnYgPSB7fTtcclxucHJvY2Vzcy5hcmd2ID0gW107XHJcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xyXG5wcm9jZXNzLnZlcnNpb25zID0ge307XHJcblxyXG5mdW5jdGlvbiBub29wKCkge31cclxuXHJcbnByb2Nlc3Mub24gPSBub29wO1xyXG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcclxucHJvY2Vzcy5vbmNlID0gbm9vcDtcclxucHJvY2Vzcy5vZmYgPSBub29wO1xyXG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcclxucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xyXG5wcm9jZXNzLmVtaXQgPSBub29wO1xyXG5wcm9jZXNzLnByZXBlbmRMaXN0ZW5lciA9IG5vb3A7XHJcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XHJcblxyXG5wcm9jZXNzLmxpc3RlbmVycyA9IGZ1bmN0aW9uIChuYW1lKSB7IHJldHVybiBbXSB9XHJcblxyXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xyXG59O1xyXG5cclxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcclxucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XHJcbn07XHJcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9saWIvYXhpb3MnKTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcbnZhciBzZXR0bGUgPSByZXF1aXJlKCcuLy4uL2NvcmUvc2V0dGxlJyk7XG52YXIgYnVpbGRVUkwgPSByZXF1aXJlKCcuLy4uL2hlbHBlcnMvYnVpbGRVUkwnKTtcbnZhciBwYXJzZUhlYWRlcnMgPSByZXF1aXJlKCcuLy4uL2hlbHBlcnMvcGFyc2VIZWFkZXJzJyk7XG52YXIgaXNVUkxTYW1lT3JpZ2luID0gcmVxdWlyZSgnLi8uLi9oZWxwZXJzL2lzVVJMU2FtZU9yaWdpbicpO1xudmFyIGNyZWF0ZUVycm9yID0gcmVxdWlyZSgnLi4vY29yZS9jcmVhdGVFcnJvcicpO1xudmFyIGJ0b2EgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LmJ0b2EgJiYgd2luZG93LmJ0b2EuYmluZCh3aW5kb3cpKSB8fCByZXF1aXJlKCcuLy4uL2hlbHBlcnMvYnRvYScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHhockFkYXB0ZXIoY29uZmlnKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiBkaXNwYXRjaFhoclJlcXVlc3QocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgdmFyIHJlcXVlc3REYXRhID0gY29uZmlnLmRhdGE7XG4gICAgdmFyIHJlcXVlc3RIZWFkZXJzID0gY29uZmlnLmhlYWRlcnM7XG5cbiAgICBpZiAodXRpbHMuaXNGb3JtRGF0YShyZXF1ZXN0RGF0YSkpIHtcbiAgICAgIGRlbGV0ZSByZXF1ZXN0SGVhZGVyc1snQ29udGVudC1UeXBlJ107IC8vIExldCB0aGUgYnJvd3NlciBzZXQgaXRcbiAgICB9XG5cbiAgICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgIHZhciBsb2FkRXZlbnQgPSAnb25yZWFkeXN0YXRlY2hhbmdlJztcbiAgICB2YXIgeERvbWFpbiA9IGZhbHNlO1xuXG4gICAgLy8gRm9yIElFIDgvOSBDT1JTIHN1cHBvcnRcbiAgICAvLyBPbmx5IHN1cHBvcnRzIFBPU1QgYW5kIEdFVCBjYWxscyBhbmQgZG9lc24ndCByZXR1cm5zIHRoZSByZXNwb25zZSBoZWFkZXJzLlxuICAgIC8vIERPTidUIGRvIHRoaXMgZm9yIHRlc3RpbmcgYi9jIFhNTEh0dHBSZXF1ZXN0IGlzIG1vY2tlZCwgbm90IFhEb21haW5SZXF1ZXN0LlxuICAgIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Rlc3QnICYmXG4gICAgICAgIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICAgIHdpbmRvdy5YRG9tYWluUmVxdWVzdCAmJiAhKCd3aXRoQ3JlZGVudGlhbHMnIGluIHJlcXVlc3QpICYmXG4gICAgICAgICFpc1VSTFNhbWVPcmlnaW4oY29uZmlnLnVybCkpIHtcbiAgICAgIHJlcXVlc3QgPSBuZXcgd2luZG93LlhEb21haW5SZXF1ZXN0KCk7XG4gICAgICBsb2FkRXZlbnQgPSAnb25sb2FkJztcbiAgICAgIHhEb21haW4gPSB0cnVlO1xuICAgICAgcmVxdWVzdC5vbnByb2dyZXNzID0gZnVuY3Rpb24gaGFuZGxlUHJvZ3Jlc3MoKSB7fTtcbiAgICAgIHJlcXVlc3Qub250aW1lb3V0ID0gZnVuY3Rpb24gaGFuZGxlVGltZW91dCgpIHt9O1xuICAgIH1cblxuICAgIC8vIEhUVFAgYmFzaWMgYXV0aGVudGljYXRpb25cbiAgICBpZiAoY29uZmlnLmF1dGgpIHtcbiAgICAgIHZhciB1c2VybmFtZSA9IGNvbmZpZy5hdXRoLnVzZXJuYW1lIHx8ICcnO1xuICAgICAgdmFyIHBhc3N3b3JkID0gY29uZmlnLmF1dGgucGFzc3dvcmQgfHwgJyc7XG4gICAgICByZXF1ZXN0SGVhZGVycy5BdXRob3JpemF0aW9uID0gJ0Jhc2ljICcgKyBidG9hKHVzZXJuYW1lICsgJzonICsgcGFzc3dvcmQpO1xuICAgIH1cblxuICAgIHJlcXVlc3Qub3Blbihjb25maWcubWV0aG9kLnRvVXBwZXJDYXNlKCksIGJ1aWxkVVJMKGNvbmZpZy51cmwsIGNvbmZpZy5wYXJhbXMsIGNvbmZpZy5wYXJhbXNTZXJpYWxpemVyKSwgdHJ1ZSk7XG5cbiAgICAvLyBTZXQgdGhlIHJlcXVlc3QgdGltZW91dCBpbiBNU1xuICAgIHJlcXVlc3QudGltZW91dCA9IGNvbmZpZy50aW1lb3V0O1xuXG4gICAgLy8gTGlzdGVuIGZvciByZWFkeSBzdGF0ZVxuICAgIHJlcXVlc3RbbG9hZEV2ZW50XSA9IGZ1bmN0aW9uIGhhbmRsZUxvYWQoKSB7XG4gICAgICBpZiAoIXJlcXVlc3QgfHwgKHJlcXVlc3QucmVhZHlTdGF0ZSAhPT0gNCAmJiAheERvbWFpbikpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGUgcmVxdWVzdCBlcnJvcmVkIG91dCBhbmQgd2UgZGlkbid0IGdldCBhIHJlc3BvbnNlLCB0aGlzIHdpbGwgYmVcbiAgICAgIC8vIGhhbmRsZWQgYnkgb25lcnJvciBpbnN0ZWFkXG4gICAgICAvLyBXaXRoIG9uZSBleGNlcHRpb246IHJlcXVlc3QgdGhhdCB1c2luZyBmaWxlOiBwcm90b2NvbCwgbW9zdCBicm93c2Vyc1xuICAgICAgLy8gd2lsbCByZXR1cm4gc3RhdHVzIGFzIDAgZXZlbiB0aG91Z2ggaXQncyBhIHN1Y2Nlc3NmdWwgcmVxdWVzdFxuICAgICAgaWYgKHJlcXVlc3Quc3RhdHVzID09PSAwICYmICEocmVxdWVzdC5yZXNwb25zZVVSTCAmJiByZXF1ZXN0LnJlc3BvbnNlVVJMLmluZGV4T2YoJ2ZpbGU6JykgPT09IDApKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gUHJlcGFyZSB0aGUgcmVzcG9uc2VcbiAgICAgIHZhciByZXNwb25zZUhlYWRlcnMgPSAnZ2V0QWxsUmVzcG9uc2VIZWFkZXJzJyBpbiByZXF1ZXN0ID8gcGFyc2VIZWFkZXJzKHJlcXVlc3QuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkpIDogbnVsbDtcbiAgICAgIHZhciByZXNwb25zZURhdGEgPSAhY29uZmlnLnJlc3BvbnNlVHlwZSB8fCBjb25maWcucmVzcG9uc2VUeXBlID09PSAndGV4dCcgPyByZXF1ZXN0LnJlc3BvbnNlVGV4dCA6IHJlcXVlc3QucmVzcG9uc2U7XG4gICAgICB2YXIgcmVzcG9uc2UgPSB7XG4gICAgICAgIGRhdGE6IHJlc3BvbnNlRGF0YSxcbiAgICAgICAgLy8gSUUgc2VuZHMgMTIyMyBpbnN0ZWFkIG9mIDIwNCAoaHR0cHM6Ly9naXRodWIuY29tL2F4aW9zL2F4aW9zL2lzc3Vlcy8yMDEpXG4gICAgICAgIHN0YXR1czogcmVxdWVzdC5zdGF0dXMgPT09IDEyMjMgPyAyMDQgOiByZXF1ZXN0LnN0YXR1cyxcbiAgICAgICAgc3RhdHVzVGV4dDogcmVxdWVzdC5zdGF0dXMgPT09IDEyMjMgPyAnTm8gQ29udGVudCcgOiByZXF1ZXN0LnN0YXR1c1RleHQsXG4gICAgICAgIGhlYWRlcnM6IHJlc3BvbnNlSGVhZGVycyxcbiAgICAgICAgY29uZmlnOiBjb25maWcsXG4gICAgICAgIHJlcXVlc3Q6IHJlcXVlc3RcbiAgICAgIH07XG5cbiAgICAgIHNldHRsZShyZXNvbHZlLCByZWplY3QsIHJlc3BvbnNlKTtcblxuICAgICAgLy8gQ2xlYW4gdXAgcmVxdWVzdFxuICAgICAgcmVxdWVzdCA9IG51bGw7XG4gICAgfTtcblxuICAgIC8vIEhhbmRsZSBsb3cgbGV2ZWwgbmV0d29yayBlcnJvcnNcbiAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbiBoYW5kbGVFcnJvcigpIHtcbiAgICAgIC8vIFJlYWwgZXJyb3JzIGFyZSBoaWRkZW4gZnJvbSB1cyBieSB0aGUgYnJvd3NlclxuICAgICAgLy8gb25lcnJvciBzaG91bGQgb25seSBmaXJlIGlmIGl0J3MgYSBuZXR3b3JrIGVycm9yXG4gICAgICByZWplY3QoY3JlYXRlRXJyb3IoJ05ldHdvcmsgRXJyb3InLCBjb25maWcsIG51bGwsIHJlcXVlc3QpKTtcblxuICAgICAgLy8gQ2xlYW4gdXAgcmVxdWVzdFxuICAgICAgcmVxdWVzdCA9IG51bGw7XG4gICAgfTtcblxuICAgIC8vIEhhbmRsZSB0aW1lb3V0XG4gICAgcmVxdWVzdC5vbnRpbWVvdXQgPSBmdW5jdGlvbiBoYW5kbGVUaW1lb3V0KCkge1xuICAgICAgcmVqZWN0KGNyZWF0ZUVycm9yKCd0aW1lb3V0IG9mICcgKyBjb25maWcudGltZW91dCArICdtcyBleGNlZWRlZCcsIGNvbmZpZywgJ0VDT05OQUJPUlRFRCcsXG4gICAgICAgIHJlcXVlc3QpKTtcblxuICAgICAgLy8gQ2xlYW4gdXAgcmVxdWVzdFxuICAgICAgcmVxdWVzdCA9IG51bGw7XG4gICAgfTtcblxuICAgIC8vIEFkZCB4c3JmIGhlYWRlclxuICAgIC8vIFRoaXMgaXMgb25seSBkb25lIGlmIHJ1bm5pbmcgaW4gYSBzdGFuZGFyZCBicm93c2VyIGVudmlyb25tZW50LlxuICAgIC8vIFNwZWNpZmljYWxseSBub3QgaWYgd2UncmUgaW4gYSB3ZWIgd29ya2VyLCBvciByZWFjdC1uYXRpdmUuXG4gICAgaWYgKHV0aWxzLmlzU3RhbmRhcmRCcm93c2VyRW52KCkpIHtcbiAgICAgIHZhciBjb29raWVzID0gcmVxdWlyZSgnLi8uLi9oZWxwZXJzL2Nvb2tpZXMnKTtcblxuICAgICAgLy8gQWRkIHhzcmYgaGVhZGVyXG4gICAgICB2YXIgeHNyZlZhbHVlID0gKGNvbmZpZy53aXRoQ3JlZGVudGlhbHMgfHwgaXNVUkxTYW1lT3JpZ2luKGNvbmZpZy51cmwpKSAmJiBjb25maWcueHNyZkNvb2tpZU5hbWUgP1xuICAgICAgICAgIGNvb2tpZXMucmVhZChjb25maWcueHNyZkNvb2tpZU5hbWUpIDpcbiAgICAgICAgICB1bmRlZmluZWQ7XG5cbiAgICAgIGlmICh4c3JmVmFsdWUpIHtcbiAgICAgICAgcmVxdWVzdEhlYWRlcnNbY29uZmlnLnhzcmZIZWFkZXJOYW1lXSA9IHhzcmZWYWx1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBZGQgaGVhZGVycyB0byB0aGUgcmVxdWVzdFxuICAgIGlmICgnc2V0UmVxdWVzdEhlYWRlcicgaW4gcmVxdWVzdCkge1xuICAgICAgdXRpbHMuZm9yRWFjaChyZXF1ZXN0SGVhZGVycywgZnVuY3Rpb24gc2V0UmVxdWVzdEhlYWRlcih2YWwsIGtleSkge1xuICAgICAgICBpZiAodHlwZW9mIHJlcXVlc3REYXRhID09PSAndW5kZWZpbmVkJyAmJiBrZXkudG9Mb3dlckNhc2UoKSA9PT0gJ2NvbnRlbnQtdHlwZScpIHtcbiAgICAgICAgICAvLyBSZW1vdmUgQ29udGVudC1UeXBlIGlmIGRhdGEgaXMgdW5kZWZpbmVkXG4gICAgICAgICAgZGVsZXRlIHJlcXVlc3RIZWFkZXJzW2tleV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gT3RoZXJ3aXNlIGFkZCBoZWFkZXIgdG8gdGhlIHJlcXVlc3RcbiAgICAgICAgICByZXF1ZXN0LnNldFJlcXVlc3RIZWFkZXIoa2V5LCB2YWwpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBBZGQgd2l0aENyZWRlbnRpYWxzIHRvIHJlcXVlc3QgaWYgbmVlZGVkXG4gICAgaWYgKGNvbmZpZy53aXRoQ3JlZGVudGlhbHMpIHtcbiAgICAgIHJlcXVlc3Qud2l0aENyZWRlbnRpYWxzID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBBZGQgcmVzcG9uc2VUeXBlIHRvIHJlcXVlc3QgaWYgbmVlZGVkXG4gICAgaWYgKGNvbmZpZy5yZXNwb25zZVR5cGUpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlcXVlc3QucmVzcG9uc2VUeXBlID0gY29uZmlnLnJlc3BvbnNlVHlwZTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gRXhwZWN0ZWQgRE9NRXhjZXB0aW9uIHRocm93biBieSBicm93c2VycyBub3QgY29tcGF0aWJsZSBYTUxIdHRwUmVxdWVzdCBMZXZlbCAyLlxuICAgICAgICAvLyBCdXQsIHRoaXMgY2FuIGJlIHN1cHByZXNzZWQgZm9yICdqc29uJyB0eXBlIGFzIGl0IGNhbiBiZSBwYXJzZWQgYnkgZGVmYXVsdCAndHJhbnNmb3JtUmVzcG9uc2UnIGZ1bmN0aW9uLlxuICAgICAgICBpZiAoY29uZmlnLnJlc3BvbnNlVHlwZSAhPT0gJ2pzb24nKSB7XG4gICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEhhbmRsZSBwcm9ncmVzcyBpZiBuZWVkZWRcbiAgICBpZiAodHlwZW9mIGNvbmZpZy5vbkRvd25sb2FkUHJvZ3Jlc3MgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lcigncHJvZ3Jlc3MnLCBjb25maWcub25Eb3dubG9hZFByb2dyZXNzKTtcbiAgICB9XG5cbiAgICAvLyBOb3QgYWxsIGJyb3dzZXJzIHN1cHBvcnQgdXBsb2FkIGV2ZW50c1xuICAgIGlmICh0eXBlb2YgY29uZmlnLm9uVXBsb2FkUHJvZ3Jlc3MgPT09ICdmdW5jdGlvbicgJiYgcmVxdWVzdC51cGxvYWQpIHtcbiAgICAgIHJlcXVlc3QudXBsb2FkLmFkZEV2ZW50TGlzdGVuZXIoJ3Byb2dyZXNzJywgY29uZmlnLm9uVXBsb2FkUHJvZ3Jlc3MpO1xuICAgIH1cblxuICAgIGlmIChjb25maWcuY2FuY2VsVG9rZW4pIHtcbiAgICAgIC8vIEhhbmRsZSBjYW5jZWxsYXRpb25cbiAgICAgIGNvbmZpZy5jYW5jZWxUb2tlbi5wcm9taXNlLnRoZW4oZnVuY3Rpb24gb25DYW5jZWxlZChjYW5jZWwpIHtcbiAgICAgICAgaWYgKCFyZXF1ZXN0KSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVxdWVzdC5hYm9ydCgpO1xuICAgICAgICByZWplY3QoY2FuY2VsKTtcbiAgICAgICAgLy8gQ2xlYW4gdXAgcmVxdWVzdFxuICAgICAgICByZXF1ZXN0ID0gbnVsbDtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChyZXF1ZXN0RGF0YSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXF1ZXN0RGF0YSA9IG51bGw7XG4gICAgfVxuXG4gICAgLy8gU2VuZCB0aGUgcmVxdWVzdFxuICAgIHJlcXVlc3Quc2VuZChyZXF1ZXN0RGF0YSk7XG4gIH0pO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIGJpbmQgPSByZXF1aXJlKCcuL2hlbHBlcnMvYmluZCcpO1xudmFyIEF4aW9zID0gcmVxdWlyZSgnLi9jb3JlL0F4aW9zJyk7XG52YXIgZGVmYXVsdHMgPSByZXF1aXJlKCcuL2RlZmF1bHRzJyk7XG5cbi8qKlxuICogQ3JlYXRlIGFuIGluc3RhbmNlIG9mIEF4aW9zXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGRlZmF1bHRDb25maWcgVGhlIGRlZmF1bHQgY29uZmlnIGZvciB0aGUgaW5zdGFuY2VcbiAqIEByZXR1cm4ge0F4aW9zfSBBIG5ldyBpbnN0YW5jZSBvZiBBeGlvc1xuICovXG5mdW5jdGlvbiBjcmVhdGVJbnN0YW5jZShkZWZhdWx0Q29uZmlnKSB7XG4gIHZhciBjb250ZXh0ID0gbmV3IEF4aW9zKGRlZmF1bHRDb25maWcpO1xuICB2YXIgaW5zdGFuY2UgPSBiaW5kKEF4aW9zLnByb3RvdHlwZS5yZXF1ZXN0LCBjb250ZXh0KTtcblxuICAvLyBDb3B5IGF4aW9zLnByb3RvdHlwZSB0byBpbnN0YW5jZVxuICB1dGlscy5leHRlbmQoaW5zdGFuY2UsIEF4aW9zLnByb3RvdHlwZSwgY29udGV4dCk7XG5cbiAgLy8gQ29weSBjb250ZXh0IHRvIGluc3RhbmNlXG4gIHV0aWxzLmV4dGVuZChpbnN0YW5jZSwgY29udGV4dCk7XG5cbiAgcmV0dXJuIGluc3RhbmNlO1xufVxuXG4vLyBDcmVhdGUgdGhlIGRlZmF1bHQgaW5zdGFuY2UgdG8gYmUgZXhwb3J0ZWRcbnZhciBheGlvcyA9IGNyZWF0ZUluc3RhbmNlKGRlZmF1bHRzKTtcblxuLy8gRXhwb3NlIEF4aW9zIGNsYXNzIHRvIGFsbG93IGNsYXNzIGluaGVyaXRhbmNlXG5heGlvcy5BeGlvcyA9IEF4aW9zO1xuXG4vLyBGYWN0b3J5IGZvciBjcmVhdGluZyBuZXcgaW5zdGFuY2VzXG5heGlvcy5jcmVhdGUgPSBmdW5jdGlvbiBjcmVhdGUoaW5zdGFuY2VDb25maWcpIHtcbiAgcmV0dXJuIGNyZWF0ZUluc3RhbmNlKHV0aWxzLm1lcmdlKGRlZmF1bHRzLCBpbnN0YW5jZUNvbmZpZykpO1xufTtcblxuLy8gRXhwb3NlIENhbmNlbCAmIENhbmNlbFRva2VuXG5heGlvcy5DYW5jZWwgPSByZXF1aXJlKCcuL2NhbmNlbC9DYW5jZWwnKTtcbmF4aW9zLkNhbmNlbFRva2VuID0gcmVxdWlyZSgnLi9jYW5jZWwvQ2FuY2VsVG9rZW4nKTtcbmF4aW9zLmlzQ2FuY2VsID0gcmVxdWlyZSgnLi9jYW5jZWwvaXNDYW5jZWwnKTtcblxuLy8gRXhwb3NlIGFsbC9zcHJlYWRcbmF4aW9zLmFsbCA9IGZ1bmN0aW9uIGFsbChwcm9taXNlcykge1xuICByZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xufTtcbmF4aW9zLnNwcmVhZCA9IHJlcXVpcmUoJy4vaGVscGVycy9zcHJlYWQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBheGlvcztcblxuLy8gQWxsb3cgdXNlIG9mIGRlZmF1bHQgaW1wb3J0IHN5bnRheCBpbiBUeXBlU2NyaXB0XG5tb2R1bGUuZXhwb3J0cy5kZWZhdWx0ID0gYXhpb3M7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQSBgQ2FuY2VsYCBpcyBhbiBvYmplY3QgdGhhdCBpcyB0aHJvd24gd2hlbiBhbiBvcGVyYXRpb24gaXMgY2FuY2VsZWQuXG4gKlxuICogQGNsYXNzXG4gKiBAcGFyYW0ge3N0cmluZz19IG1lc3NhZ2UgVGhlIG1lc3NhZ2UuXG4gKi9cbmZ1bmN0aW9uIENhbmNlbChtZXNzYWdlKSB7XG4gIHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG59XG5cbkNhbmNlbC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZygpIHtcbiAgcmV0dXJuICdDYW5jZWwnICsgKHRoaXMubWVzc2FnZSA/ICc6ICcgKyB0aGlzLm1lc3NhZ2UgOiAnJyk7XG59O1xuXG5DYW5jZWwucHJvdG90eXBlLl9fQ0FOQ0VMX18gPSB0cnVlO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhbmNlbDtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENhbmNlbCA9IHJlcXVpcmUoJy4vQ2FuY2VsJyk7XG5cbi8qKlxuICogQSBgQ2FuY2VsVG9rZW5gIGlzIGFuIG9iamVjdCB0aGF0IGNhbiBiZSB1c2VkIHRvIHJlcXVlc3QgY2FuY2VsbGF0aW9uIG9mIGFuIG9wZXJhdGlvbi5cbiAqXG4gKiBAY2xhc3NcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGV4ZWN1dG9yIFRoZSBleGVjdXRvciBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gQ2FuY2VsVG9rZW4oZXhlY3V0b3IpIHtcbiAgaWYgKHR5cGVvZiBleGVjdXRvciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2V4ZWN1dG9yIG11c3QgYmUgYSBmdW5jdGlvbi4nKTtcbiAgfVxuXG4gIHZhciByZXNvbHZlUHJvbWlzZTtcbiAgdGhpcy5wcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24gcHJvbWlzZUV4ZWN1dG9yKHJlc29sdmUpIHtcbiAgICByZXNvbHZlUHJvbWlzZSA9IHJlc29sdmU7XG4gIH0pO1xuXG4gIHZhciB0b2tlbiA9IHRoaXM7XG4gIGV4ZWN1dG9yKGZ1bmN0aW9uIGNhbmNlbChtZXNzYWdlKSB7XG4gICAgaWYgKHRva2VuLnJlYXNvbikge1xuICAgICAgLy8gQ2FuY2VsbGF0aW9uIGhhcyBhbHJlYWR5IGJlZW4gcmVxdWVzdGVkXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdG9rZW4ucmVhc29uID0gbmV3IENhbmNlbChtZXNzYWdlKTtcbiAgICByZXNvbHZlUHJvbWlzZSh0b2tlbi5yZWFzb24pO1xuICB9KTtcbn1cblxuLyoqXG4gKiBUaHJvd3MgYSBgQ2FuY2VsYCBpZiBjYW5jZWxsYXRpb24gaGFzIGJlZW4gcmVxdWVzdGVkLlxuICovXG5DYW5jZWxUb2tlbi5wcm90b3R5cGUudGhyb3dJZlJlcXVlc3RlZCA9IGZ1bmN0aW9uIHRocm93SWZSZXF1ZXN0ZWQoKSB7XG4gIGlmICh0aGlzLnJlYXNvbikge1xuICAgIHRocm93IHRoaXMucmVhc29uO1xuICB9XG59O1xuXG4vKipcbiAqIFJldHVybnMgYW4gb2JqZWN0IHRoYXQgY29udGFpbnMgYSBuZXcgYENhbmNlbFRva2VuYCBhbmQgYSBmdW5jdGlvbiB0aGF0LCB3aGVuIGNhbGxlZCxcbiAqIGNhbmNlbHMgdGhlIGBDYW5jZWxUb2tlbmAuXG4gKi9cbkNhbmNlbFRva2VuLnNvdXJjZSA9IGZ1bmN0aW9uIHNvdXJjZSgpIHtcbiAgdmFyIGNhbmNlbDtcbiAgdmFyIHRva2VuID0gbmV3IENhbmNlbFRva2VuKGZ1bmN0aW9uIGV4ZWN1dG9yKGMpIHtcbiAgICBjYW5jZWwgPSBjO1xuICB9KTtcbiAgcmV0dXJuIHtcbiAgICB0b2tlbjogdG9rZW4sXG4gICAgY2FuY2VsOiBjYW5jZWxcbiAgfTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FuY2VsVG9rZW47XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNDYW5jZWwodmFsdWUpIHtcbiAgcmV0dXJuICEhKHZhbHVlICYmIHZhbHVlLl9fQ0FOQ0VMX18pO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGRlZmF1bHRzID0gcmVxdWlyZSgnLi8uLi9kZWZhdWx0cycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xudmFyIEludGVyY2VwdG9yTWFuYWdlciA9IHJlcXVpcmUoJy4vSW50ZXJjZXB0b3JNYW5hZ2VyJyk7XG52YXIgZGlzcGF0Y2hSZXF1ZXN0ID0gcmVxdWlyZSgnLi9kaXNwYXRjaFJlcXVlc3QnKTtcblxuLyoqXG4gKiBDcmVhdGUgYSBuZXcgaW5zdGFuY2Ugb2YgQXhpb3NcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gaW5zdGFuY2VDb25maWcgVGhlIGRlZmF1bHQgY29uZmlnIGZvciB0aGUgaW5zdGFuY2VcbiAqL1xuZnVuY3Rpb24gQXhpb3MoaW5zdGFuY2VDb25maWcpIHtcbiAgdGhpcy5kZWZhdWx0cyA9IGluc3RhbmNlQ29uZmlnO1xuICB0aGlzLmludGVyY2VwdG9ycyA9IHtcbiAgICByZXF1ZXN0OiBuZXcgSW50ZXJjZXB0b3JNYW5hZ2VyKCksXG4gICAgcmVzcG9uc2U6IG5ldyBJbnRlcmNlcHRvck1hbmFnZXIoKVxuICB9O1xufVxuXG4vKipcbiAqIERpc3BhdGNoIGEgcmVxdWVzdFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcgVGhlIGNvbmZpZyBzcGVjaWZpYyBmb3IgdGhpcyByZXF1ZXN0IChtZXJnZWQgd2l0aCB0aGlzLmRlZmF1bHRzKVxuICovXG5BeGlvcy5wcm90b3R5cGUucmVxdWVzdCA9IGZ1bmN0aW9uIHJlcXVlc3QoY29uZmlnKSB7XG4gIC8qZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOjAqL1xuICAvLyBBbGxvdyBmb3IgYXhpb3MoJ2V4YW1wbGUvdXJsJ1ssIGNvbmZpZ10pIGEgbGEgZmV0Y2ggQVBJXG4gIGlmICh0eXBlb2YgY29uZmlnID09PSAnc3RyaW5nJykge1xuICAgIGNvbmZpZyA9IHV0aWxzLm1lcmdlKHtcbiAgICAgIHVybDogYXJndW1lbnRzWzBdXG4gICAgfSwgYXJndW1lbnRzWzFdKTtcbiAgfVxuXG4gIGNvbmZpZyA9IHV0aWxzLm1lcmdlKGRlZmF1bHRzLCB7bWV0aG9kOiAnZ2V0J30sIHRoaXMuZGVmYXVsdHMsIGNvbmZpZyk7XG4gIGNvbmZpZy5tZXRob2QgPSBjb25maWcubWV0aG9kLnRvTG93ZXJDYXNlKCk7XG5cbiAgLy8gSG9vayB1cCBpbnRlcmNlcHRvcnMgbWlkZGxld2FyZVxuICB2YXIgY2hhaW4gPSBbZGlzcGF0Y2hSZXF1ZXN0LCB1bmRlZmluZWRdO1xuICB2YXIgcHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZShjb25maWcpO1xuXG4gIHRoaXMuaW50ZXJjZXB0b3JzLnJlcXVlc3QuZm9yRWFjaChmdW5jdGlvbiB1bnNoaWZ0UmVxdWVzdEludGVyY2VwdG9ycyhpbnRlcmNlcHRvcikge1xuICAgIGNoYWluLnVuc2hpZnQoaW50ZXJjZXB0b3IuZnVsZmlsbGVkLCBpbnRlcmNlcHRvci5yZWplY3RlZCk7XG4gIH0pO1xuXG4gIHRoaXMuaW50ZXJjZXB0b3JzLnJlc3BvbnNlLmZvckVhY2goZnVuY3Rpb24gcHVzaFJlc3BvbnNlSW50ZXJjZXB0b3JzKGludGVyY2VwdG9yKSB7XG4gICAgY2hhaW4ucHVzaChpbnRlcmNlcHRvci5mdWxmaWxsZWQsIGludGVyY2VwdG9yLnJlamVjdGVkKTtcbiAgfSk7XG5cbiAgd2hpbGUgKGNoYWluLmxlbmd0aCkge1xuICAgIHByb21pc2UgPSBwcm9taXNlLnRoZW4oY2hhaW4uc2hpZnQoKSwgY2hhaW4uc2hpZnQoKSk7XG4gIH1cblxuICByZXR1cm4gcHJvbWlzZTtcbn07XG5cbi8vIFByb3ZpZGUgYWxpYXNlcyBmb3Igc3VwcG9ydGVkIHJlcXVlc3QgbWV0aG9kc1xudXRpbHMuZm9yRWFjaChbJ2RlbGV0ZScsICdnZXQnLCAnaGVhZCcsICdvcHRpb25zJ10sIGZ1bmN0aW9uIGZvckVhY2hNZXRob2ROb0RhdGEobWV0aG9kKSB7XG4gIC8qZXNsaW50IGZ1bmMtbmFtZXM6MCovXG4gIEF4aW9zLnByb3RvdHlwZVttZXRob2RdID0gZnVuY3Rpb24odXJsLCBjb25maWcpIHtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KHV0aWxzLm1lcmdlKGNvbmZpZyB8fCB7fSwge1xuICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICB1cmw6IHVybFxuICAgIH0pKTtcbiAgfTtcbn0pO1xuXG51dGlscy5mb3JFYWNoKFsncG9zdCcsICdwdXQnLCAncGF0Y2gnXSwgZnVuY3Rpb24gZm9yRWFjaE1ldGhvZFdpdGhEYXRhKG1ldGhvZCkge1xuICAvKmVzbGludCBmdW5jLW5hbWVzOjAqL1xuICBBeGlvcy5wcm90b3R5cGVbbWV0aG9kXSA9IGZ1bmN0aW9uKHVybCwgZGF0YSwgY29uZmlnKSB7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCh1dGlscy5tZXJnZShjb25maWcgfHwge30sIHtcbiAgICAgIG1ldGhvZDogbWV0aG9kLFxuICAgICAgdXJsOiB1cmwsXG4gICAgICBkYXRhOiBkYXRhXG4gICAgfSkpO1xuICB9O1xufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQXhpb3M7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcblxuZnVuY3Rpb24gSW50ZXJjZXB0b3JNYW5hZ2VyKCkge1xuICB0aGlzLmhhbmRsZXJzID0gW107XG59XG5cbi8qKlxuICogQWRkIGEgbmV3IGludGVyY2VwdG9yIHRvIHRoZSBzdGFja1xuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bGZpbGxlZCBUaGUgZnVuY3Rpb24gdG8gaGFuZGxlIGB0aGVuYCBmb3IgYSBgUHJvbWlzZWBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHJlamVjdGVkIFRoZSBmdW5jdGlvbiB0byBoYW5kbGUgYHJlamVjdGAgZm9yIGEgYFByb21pc2VgXG4gKlxuICogQHJldHVybiB7TnVtYmVyfSBBbiBJRCB1c2VkIHRvIHJlbW92ZSBpbnRlcmNlcHRvciBsYXRlclxuICovXG5JbnRlcmNlcHRvck1hbmFnZXIucHJvdG90eXBlLnVzZSA9IGZ1bmN0aW9uIHVzZShmdWxmaWxsZWQsIHJlamVjdGVkKSB7XG4gIHRoaXMuaGFuZGxlcnMucHVzaCh7XG4gICAgZnVsZmlsbGVkOiBmdWxmaWxsZWQsXG4gICAgcmVqZWN0ZWQ6IHJlamVjdGVkXG4gIH0pO1xuICByZXR1cm4gdGhpcy5oYW5kbGVycy5sZW5ndGggLSAxO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgYW4gaW50ZXJjZXB0b3IgZnJvbSB0aGUgc3RhY2tcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gaWQgVGhlIElEIHRoYXQgd2FzIHJldHVybmVkIGJ5IGB1c2VgXG4gKi9cbkludGVyY2VwdG9yTWFuYWdlci5wcm90b3R5cGUuZWplY3QgPSBmdW5jdGlvbiBlamVjdChpZCkge1xuICBpZiAodGhpcy5oYW5kbGVyc1tpZF0pIHtcbiAgICB0aGlzLmhhbmRsZXJzW2lkXSA9IG51bGw7XG4gIH1cbn07XG5cbi8qKlxuICogSXRlcmF0ZSBvdmVyIGFsbCB0aGUgcmVnaXN0ZXJlZCBpbnRlcmNlcHRvcnNcbiAqXG4gKiBUaGlzIG1ldGhvZCBpcyBwYXJ0aWN1bGFybHkgdXNlZnVsIGZvciBza2lwcGluZyBvdmVyIGFueVxuICogaW50ZXJjZXB0b3JzIHRoYXQgbWF5IGhhdmUgYmVjb21lIGBudWxsYCBjYWxsaW5nIGBlamVjdGAuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgZm9yIGVhY2ggaW50ZXJjZXB0b3JcbiAqL1xuSW50ZXJjZXB0b3JNYW5hZ2VyLnByb3RvdHlwZS5mb3JFYWNoID0gZnVuY3Rpb24gZm9yRWFjaChmbikge1xuICB1dGlscy5mb3JFYWNoKHRoaXMuaGFuZGxlcnMsIGZ1bmN0aW9uIGZvckVhY2hIYW5kbGVyKGgpIHtcbiAgICBpZiAoaCAhPT0gbnVsbCkge1xuICAgICAgZm4oaCk7XG4gICAgfVxuICB9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSW50ZXJjZXB0b3JNYW5hZ2VyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZW5oYW5jZUVycm9yID0gcmVxdWlyZSgnLi9lbmhhbmNlRXJyb3InKTtcblxuLyoqXG4gKiBDcmVhdGUgYW4gRXJyb3Igd2l0aCB0aGUgc3BlY2lmaWVkIG1lc3NhZ2UsIGNvbmZpZywgZXJyb3IgY29kZSwgcmVxdWVzdCBhbmQgcmVzcG9uc2UuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgVGhlIGVycm9yIG1lc3NhZ2UuXG4gKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIFRoZSBjb25maWcuXG4gKiBAcGFyYW0ge3N0cmluZ30gW2NvZGVdIFRoZSBlcnJvciBjb2RlIChmb3IgZXhhbXBsZSwgJ0VDT05OQUJPUlRFRCcpLlxuICogQHBhcmFtIHtPYmplY3R9IFtyZXF1ZXN0XSBUaGUgcmVxdWVzdC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbcmVzcG9uc2VdIFRoZSByZXNwb25zZS5cbiAqIEByZXR1cm5zIHtFcnJvcn0gVGhlIGNyZWF0ZWQgZXJyb3IuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gY3JlYXRlRXJyb3IobWVzc2FnZSwgY29uZmlnLCBjb2RlLCByZXF1ZXN0LCByZXNwb25zZSkge1xuICB2YXIgZXJyb3IgPSBuZXcgRXJyb3IobWVzc2FnZSk7XG4gIHJldHVybiBlbmhhbmNlRXJyb3IoZXJyb3IsIGNvbmZpZywgY29kZSwgcmVxdWVzdCwgcmVzcG9uc2UpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xudmFyIHRyYW5zZm9ybURhdGEgPSByZXF1aXJlKCcuL3RyYW5zZm9ybURhdGEnKTtcbnZhciBpc0NhbmNlbCA9IHJlcXVpcmUoJy4uL2NhbmNlbC9pc0NhbmNlbCcpO1xudmFyIGRlZmF1bHRzID0gcmVxdWlyZSgnLi4vZGVmYXVsdHMnKTtcbnZhciBpc0Fic29sdXRlVVJMID0gcmVxdWlyZSgnLi8uLi9oZWxwZXJzL2lzQWJzb2x1dGVVUkwnKTtcbnZhciBjb21iaW5lVVJMcyA9IHJlcXVpcmUoJy4vLi4vaGVscGVycy9jb21iaW5lVVJMcycpO1xuXG4vKipcbiAqIFRocm93cyBhIGBDYW5jZWxgIGlmIGNhbmNlbGxhdGlvbiBoYXMgYmVlbiByZXF1ZXN0ZWQuXG4gKi9cbmZ1bmN0aW9uIHRocm93SWZDYW5jZWxsYXRpb25SZXF1ZXN0ZWQoY29uZmlnKSB7XG4gIGlmIChjb25maWcuY2FuY2VsVG9rZW4pIHtcbiAgICBjb25maWcuY2FuY2VsVG9rZW4udGhyb3dJZlJlcXVlc3RlZCgpO1xuICB9XG59XG5cbi8qKlxuICogRGlzcGF0Y2ggYSByZXF1ZXN0IHRvIHRoZSBzZXJ2ZXIgdXNpbmcgdGhlIGNvbmZpZ3VyZWQgYWRhcHRlci5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIFRoZSBjb25maWcgdGhhdCBpcyB0byBiZSB1c2VkIGZvciB0aGUgcmVxdWVzdFxuICogQHJldHVybnMge1Byb21pc2V9IFRoZSBQcm9taXNlIHRvIGJlIGZ1bGZpbGxlZFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGRpc3BhdGNoUmVxdWVzdChjb25maWcpIHtcbiAgdGhyb3dJZkNhbmNlbGxhdGlvblJlcXVlc3RlZChjb25maWcpO1xuXG4gIC8vIFN1cHBvcnQgYmFzZVVSTCBjb25maWdcbiAgaWYgKGNvbmZpZy5iYXNlVVJMICYmICFpc0Fic29sdXRlVVJMKGNvbmZpZy51cmwpKSB7XG4gICAgY29uZmlnLnVybCA9IGNvbWJpbmVVUkxzKGNvbmZpZy5iYXNlVVJMLCBjb25maWcudXJsKTtcbiAgfVxuXG4gIC8vIEVuc3VyZSBoZWFkZXJzIGV4aXN0XG4gIGNvbmZpZy5oZWFkZXJzID0gY29uZmlnLmhlYWRlcnMgfHwge307XG5cbiAgLy8gVHJhbnNmb3JtIHJlcXVlc3QgZGF0YVxuICBjb25maWcuZGF0YSA9IHRyYW5zZm9ybURhdGEoXG4gICAgY29uZmlnLmRhdGEsXG4gICAgY29uZmlnLmhlYWRlcnMsXG4gICAgY29uZmlnLnRyYW5zZm9ybVJlcXVlc3RcbiAgKTtcblxuICAvLyBGbGF0dGVuIGhlYWRlcnNcbiAgY29uZmlnLmhlYWRlcnMgPSB1dGlscy5tZXJnZShcbiAgICBjb25maWcuaGVhZGVycy5jb21tb24gfHwge30sXG4gICAgY29uZmlnLmhlYWRlcnNbY29uZmlnLm1ldGhvZF0gfHwge30sXG4gICAgY29uZmlnLmhlYWRlcnMgfHwge31cbiAgKTtcblxuICB1dGlscy5mb3JFYWNoKFxuICAgIFsnZGVsZXRlJywgJ2dldCcsICdoZWFkJywgJ3Bvc3QnLCAncHV0JywgJ3BhdGNoJywgJ2NvbW1vbiddLFxuICAgIGZ1bmN0aW9uIGNsZWFuSGVhZGVyQ29uZmlnKG1ldGhvZCkge1xuICAgICAgZGVsZXRlIGNvbmZpZy5oZWFkZXJzW21ldGhvZF07XG4gICAgfVxuICApO1xuXG4gIHZhciBhZGFwdGVyID0gY29uZmlnLmFkYXB0ZXIgfHwgZGVmYXVsdHMuYWRhcHRlcjtcblxuICByZXR1cm4gYWRhcHRlcihjb25maWcpLnRoZW4oZnVuY3Rpb24gb25BZGFwdGVyUmVzb2x1dGlvbihyZXNwb25zZSkge1xuICAgIHRocm93SWZDYW5jZWxsYXRpb25SZXF1ZXN0ZWQoY29uZmlnKTtcblxuICAgIC8vIFRyYW5zZm9ybSByZXNwb25zZSBkYXRhXG4gICAgcmVzcG9uc2UuZGF0YSA9IHRyYW5zZm9ybURhdGEoXG4gICAgICByZXNwb25zZS5kYXRhLFxuICAgICAgcmVzcG9uc2UuaGVhZGVycyxcbiAgICAgIGNvbmZpZy50cmFuc2Zvcm1SZXNwb25zZVxuICAgICk7XG5cbiAgICByZXR1cm4gcmVzcG9uc2U7XG4gIH0sIGZ1bmN0aW9uIG9uQWRhcHRlclJlamVjdGlvbihyZWFzb24pIHtcbiAgICBpZiAoIWlzQ2FuY2VsKHJlYXNvbikpIHtcbiAgICAgIHRocm93SWZDYW5jZWxsYXRpb25SZXF1ZXN0ZWQoY29uZmlnKTtcblxuICAgICAgLy8gVHJhbnNmb3JtIHJlc3BvbnNlIGRhdGFcbiAgICAgIGlmIChyZWFzb24gJiYgcmVhc29uLnJlc3BvbnNlKSB7XG4gICAgICAgIHJlYXNvbi5yZXNwb25zZS5kYXRhID0gdHJhbnNmb3JtRGF0YShcbiAgICAgICAgICByZWFzb24ucmVzcG9uc2UuZGF0YSxcbiAgICAgICAgICByZWFzb24ucmVzcG9uc2UuaGVhZGVycyxcbiAgICAgICAgICBjb25maWcudHJhbnNmb3JtUmVzcG9uc2VcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QocmVhc29uKTtcbiAgfSk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFVwZGF0ZSBhbiBFcnJvciB3aXRoIHRoZSBzcGVjaWZpZWQgY29uZmlnLCBlcnJvciBjb2RlLCBhbmQgcmVzcG9uc2UuXG4gKlxuICogQHBhcmFtIHtFcnJvcn0gZXJyb3IgVGhlIGVycm9yIHRvIHVwZGF0ZS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcgVGhlIGNvbmZpZy5cbiAqIEBwYXJhbSB7c3RyaW5nfSBbY29kZV0gVGhlIGVycm9yIGNvZGUgKGZvciBleGFtcGxlLCAnRUNPTk5BQk9SVEVEJykuXG4gKiBAcGFyYW0ge09iamVjdH0gW3JlcXVlc3RdIFRoZSByZXF1ZXN0LlxuICogQHBhcmFtIHtPYmplY3R9IFtyZXNwb25zZV0gVGhlIHJlc3BvbnNlLlxuICogQHJldHVybnMge0Vycm9yfSBUaGUgZXJyb3IuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZW5oYW5jZUVycm9yKGVycm9yLCBjb25maWcsIGNvZGUsIHJlcXVlc3QsIHJlc3BvbnNlKSB7XG4gIGVycm9yLmNvbmZpZyA9IGNvbmZpZztcbiAgaWYgKGNvZGUpIHtcbiAgICBlcnJvci5jb2RlID0gY29kZTtcbiAgfVxuICBlcnJvci5yZXF1ZXN0ID0gcmVxdWVzdDtcbiAgZXJyb3IucmVzcG9uc2UgPSByZXNwb25zZTtcbiAgcmV0dXJuIGVycm9yO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNyZWF0ZUVycm9yID0gcmVxdWlyZSgnLi9jcmVhdGVFcnJvcicpO1xuXG4vKipcbiAqIFJlc29sdmUgb3IgcmVqZWN0IGEgUHJvbWlzZSBiYXNlZCBvbiByZXNwb25zZSBzdGF0dXMuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gcmVzb2x2ZSBBIGZ1bmN0aW9uIHRoYXQgcmVzb2x2ZXMgdGhlIHByb21pc2UuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSByZWplY3QgQSBmdW5jdGlvbiB0aGF0IHJlamVjdHMgdGhlIHByb21pc2UuXG4gKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgVGhlIHJlc3BvbnNlLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHNldHRsZShyZXNvbHZlLCByZWplY3QsIHJlc3BvbnNlKSB7XG4gIHZhciB2YWxpZGF0ZVN0YXR1cyA9IHJlc3BvbnNlLmNvbmZpZy52YWxpZGF0ZVN0YXR1cztcbiAgLy8gTm90ZTogc3RhdHVzIGlzIG5vdCBleHBvc2VkIGJ5IFhEb21haW5SZXF1ZXN0XG4gIGlmICghcmVzcG9uc2Uuc3RhdHVzIHx8ICF2YWxpZGF0ZVN0YXR1cyB8fCB2YWxpZGF0ZVN0YXR1cyhyZXNwb25zZS5zdGF0dXMpKSB7XG4gICAgcmVzb2x2ZShyZXNwb25zZSk7XG4gIH0gZWxzZSB7XG4gICAgcmVqZWN0KGNyZWF0ZUVycm9yKFxuICAgICAgJ1JlcXVlc3QgZmFpbGVkIHdpdGggc3RhdHVzIGNvZGUgJyArIHJlc3BvbnNlLnN0YXR1cyxcbiAgICAgIHJlc3BvbnNlLmNvbmZpZyxcbiAgICAgIG51bGwsXG4gICAgICByZXNwb25zZS5yZXF1ZXN0LFxuICAgICAgcmVzcG9uc2VcbiAgICApKTtcbiAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xuXG4vKipcbiAqIFRyYW5zZm9ybSB0aGUgZGF0YSBmb3IgYSByZXF1ZXN0IG9yIGEgcmVzcG9uc2VcbiAqXG4gKiBAcGFyYW0ge09iamVjdHxTdHJpbmd9IGRhdGEgVGhlIGRhdGEgdG8gYmUgdHJhbnNmb3JtZWRcbiAqIEBwYXJhbSB7QXJyYXl9IGhlYWRlcnMgVGhlIGhlYWRlcnMgZm9yIHRoZSByZXF1ZXN0IG9yIHJlc3BvbnNlXG4gKiBAcGFyYW0ge0FycmF5fEZ1bmN0aW9ufSBmbnMgQSBzaW5nbGUgZnVuY3Rpb24gb3IgQXJyYXkgb2YgZnVuY3Rpb25zXG4gKiBAcmV0dXJucyB7Kn0gVGhlIHJlc3VsdGluZyB0cmFuc2Zvcm1lZCBkYXRhXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gdHJhbnNmb3JtRGF0YShkYXRhLCBoZWFkZXJzLCBmbnMpIHtcbiAgLyplc2xpbnQgbm8tcGFyYW0tcmVhc3NpZ246MCovXG4gIHV0aWxzLmZvckVhY2goZm5zLCBmdW5jdGlvbiB0cmFuc2Zvcm0oZm4pIHtcbiAgICBkYXRhID0gZm4oZGF0YSwgaGVhZGVycyk7XG4gIH0pO1xuXG4gIHJldHVybiBkYXRhO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIG5vcm1hbGl6ZUhlYWRlck5hbWUgPSByZXF1aXJlKCcuL2hlbHBlcnMvbm9ybWFsaXplSGVhZGVyTmFtZScpO1xuXG52YXIgREVGQVVMVF9DT05URU5UX1RZUEUgPSB7XG4gICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJ1xufTtcblxuZnVuY3Rpb24gc2V0Q29udGVudFR5cGVJZlVuc2V0KGhlYWRlcnMsIHZhbHVlKSB7XG4gIGlmICghdXRpbHMuaXNVbmRlZmluZWQoaGVhZGVycykgJiYgdXRpbHMuaXNVbmRlZmluZWQoaGVhZGVyc1snQ29udGVudC1UeXBlJ10pKSB7XG4gICAgaGVhZGVyc1snQ29udGVudC1UeXBlJ10gPSB2YWx1ZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXREZWZhdWx0QWRhcHRlcigpIHtcbiAgdmFyIGFkYXB0ZXI7XG4gIGlmICh0eXBlb2YgWE1MSHR0cFJlcXVlc3QgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgLy8gRm9yIGJyb3dzZXJzIHVzZSBYSFIgYWRhcHRlclxuICAgIGFkYXB0ZXIgPSByZXF1aXJlKCcuL2FkYXB0ZXJzL3hocicpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJykge1xuICAgIC8vIEZvciBub2RlIHVzZSBIVFRQIGFkYXB0ZXJcbiAgICBhZGFwdGVyID0gcmVxdWlyZSgnLi9hZGFwdGVycy9odHRwJyk7XG4gIH1cbiAgcmV0dXJuIGFkYXB0ZXI7XG59XG5cbnZhciBkZWZhdWx0cyA9IHtcbiAgYWRhcHRlcjogZ2V0RGVmYXVsdEFkYXB0ZXIoKSxcblxuICB0cmFuc2Zvcm1SZXF1ZXN0OiBbZnVuY3Rpb24gdHJhbnNmb3JtUmVxdWVzdChkYXRhLCBoZWFkZXJzKSB7XG4gICAgbm9ybWFsaXplSGVhZGVyTmFtZShoZWFkZXJzLCAnQ29udGVudC1UeXBlJyk7XG4gICAgaWYgKHV0aWxzLmlzRm9ybURhdGEoZGF0YSkgfHxcbiAgICAgIHV0aWxzLmlzQXJyYXlCdWZmZXIoZGF0YSkgfHxcbiAgICAgIHV0aWxzLmlzQnVmZmVyKGRhdGEpIHx8XG4gICAgICB1dGlscy5pc1N0cmVhbShkYXRhKSB8fFxuICAgICAgdXRpbHMuaXNGaWxlKGRhdGEpIHx8XG4gICAgICB1dGlscy5pc0Jsb2IoZGF0YSlcbiAgICApIHtcbiAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cbiAgICBpZiAodXRpbHMuaXNBcnJheUJ1ZmZlclZpZXcoZGF0YSkpIHtcbiAgICAgIHJldHVybiBkYXRhLmJ1ZmZlcjtcbiAgICB9XG4gICAgaWYgKHV0aWxzLmlzVVJMU2VhcmNoUGFyYW1zKGRhdGEpKSB7XG4gICAgICBzZXRDb250ZW50VHlwZUlmVW5zZXQoaGVhZGVycywgJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDtjaGFyc2V0PXV0Zi04Jyk7XG4gICAgICByZXR1cm4gZGF0YS50b1N0cmluZygpO1xuICAgIH1cbiAgICBpZiAodXRpbHMuaXNPYmplY3QoZGF0YSkpIHtcbiAgICAgIHNldENvbnRlbnRUeXBlSWZVbnNldChoZWFkZXJzLCAnYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PXV0Zi04Jyk7XG4gICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgfVxuICAgIHJldHVybiBkYXRhO1xuICB9XSxcblxuICB0cmFuc2Zvcm1SZXNwb25zZTogW2Z1bmN0aW9uIHRyYW5zZm9ybVJlc3BvbnNlKGRhdGEpIHtcbiAgICAvKmVzbGludCBuby1wYXJhbS1yZWFzc2lnbjowKi9cbiAgICBpZiAodHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0cnkge1xuICAgICAgICBkYXRhID0gSlNPTi5wYXJzZShkYXRhKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHsgLyogSWdub3JlICovIH1cbiAgICB9XG4gICAgcmV0dXJuIGRhdGE7XG4gIH1dLFxuXG4gIC8qKlxuICAgKiBBIHRpbWVvdXQgaW4gbWlsbGlzZWNvbmRzIHRvIGFib3J0IGEgcmVxdWVzdC4gSWYgc2V0IHRvIDAgKGRlZmF1bHQpIGFcbiAgICogdGltZW91dCBpcyBub3QgY3JlYXRlZC5cbiAgICovXG4gIHRpbWVvdXQ6IDAsXG5cbiAgeHNyZkNvb2tpZU5hbWU6ICdYU1JGLVRPS0VOJyxcbiAgeHNyZkhlYWRlck5hbWU6ICdYLVhTUkYtVE9LRU4nLFxuXG4gIG1heENvbnRlbnRMZW5ndGg6IC0xLFxuXG4gIHZhbGlkYXRlU3RhdHVzOiBmdW5jdGlvbiB2YWxpZGF0ZVN0YXR1cyhzdGF0dXMpIHtcbiAgICByZXR1cm4gc3RhdHVzID49IDIwMCAmJiBzdGF0dXMgPCAzMDA7XG4gIH1cbn07XG5cbmRlZmF1bHRzLmhlYWRlcnMgPSB7XG4gIGNvbW1vbjoge1xuICAgICdBY2NlcHQnOiAnYXBwbGljYXRpb24vanNvbiwgdGV4dC9wbGFpbiwgKi8qJ1xuICB9XG59O1xuXG51dGlscy5mb3JFYWNoKFsnZGVsZXRlJywgJ2dldCcsICdoZWFkJ10sIGZ1bmN0aW9uIGZvckVhY2hNZXRob2ROb0RhdGEobWV0aG9kKSB7XG4gIGRlZmF1bHRzLmhlYWRlcnNbbWV0aG9kXSA9IHt9O1xufSk7XG5cbnV0aWxzLmZvckVhY2goWydwb3N0JywgJ3B1dCcsICdwYXRjaCddLCBmdW5jdGlvbiBmb3JFYWNoTWV0aG9kV2l0aERhdGEobWV0aG9kKSB7XG4gIGRlZmF1bHRzLmhlYWRlcnNbbWV0aG9kXSA9IHV0aWxzLm1lcmdlKERFRkFVTFRfQ09OVEVOVF9UWVBFKTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGRlZmF1bHRzO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGJpbmQoZm4sIHRoaXNBcmcpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIHdyYXAoKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBhcmdzW2ldID0gYXJndW1lbnRzW2ldO1xuICAgIH1cbiAgICByZXR1cm4gZm4uYXBwbHkodGhpc0FyZywgYXJncyk7XG4gIH07XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBidG9hIHBvbHlmaWxsIGZvciBJRTwxMCBjb3VydGVzeSBodHRwczovL2dpdGh1Yi5jb20vZGF2aWRjaGFtYmVycy9CYXNlNjQuanNcblxudmFyIGNoYXJzID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky89JztcblxuZnVuY3Rpb24gRSgpIHtcbiAgdGhpcy5tZXNzYWdlID0gJ1N0cmluZyBjb250YWlucyBhbiBpbnZhbGlkIGNoYXJhY3Rlcic7XG59XG5FLnByb3RvdHlwZSA9IG5ldyBFcnJvcjtcbkUucHJvdG90eXBlLmNvZGUgPSA1O1xuRS5wcm90b3R5cGUubmFtZSA9ICdJbnZhbGlkQ2hhcmFjdGVyRXJyb3InO1xuXG5mdW5jdGlvbiBidG9hKGlucHV0KSB7XG4gIHZhciBzdHIgPSBTdHJpbmcoaW5wdXQpO1xuICB2YXIgb3V0cHV0ID0gJyc7XG4gIGZvciAoXG4gICAgLy8gaW5pdGlhbGl6ZSByZXN1bHQgYW5kIGNvdW50ZXJcbiAgICB2YXIgYmxvY2ssIGNoYXJDb2RlLCBpZHggPSAwLCBtYXAgPSBjaGFycztcbiAgICAvLyBpZiB0aGUgbmV4dCBzdHIgaW5kZXggZG9lcyBub3QgZXhpc3Q6XG4gICAgLy8gICBjaGFuZ2UgdGhlIG1hcHBpbmcgdGFibGUgdG8gXCI9XCJcbiAgICAvLyAgIGNoZWNrIGlmIGQgaGFzIG5vIGZyYWN0aW9uYWwgZGlnaXRzXG4gICAgc3RyLmNoYXJBdChpZHggfCAwKSB8fCAobWFwID0gJz0nLCBpZHggJSAxKTtcbiAgICAvLyBcIjggLSBpZHggJSAxICogOFwiIGdlbmVyYXRlcyB0aGUgc2VxdWVuY2UgMiwgNCwgNiwgOFxuICAgIG91dHB1dCArPSBtYXAuY2hhckF0KDYzICYgYmxvY2sgPj4gOCAtIGlkeCAlIDEgKiA4KVxuICApIHtcbiAgICBjaGFyQ29kZSA9IHN0ci5jaGFyQ29kZUF0KGlkeCArPSAzIC8gNCk7XG4gICAgaWYgKGNoYXJDb2RlID4gMHhGRikge1xuICAgICAgdGhyb3cgbmV3IEUoKTtcbiAgICB9XG4gICAgYmxvY2sgPSBibG9jayA8PCA4IHwgY2hhckNvZGU7XG4gIH1cbiAgcmV0dXJuIG91dHB1dDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBidG9hO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XG5cbmZ1bmN0aW9uIGVuY29kZSh2YWwpIHtcbiAgcmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudCh2YWwpLlxuICAgIHJlcGxhY2UoLyU0MC9naSwgJ0AnKS5cbiAgICByZXBsYWNlKC8lM0EvZ2ksICc6JykuXG4gICAgcmVwbGFjZSgvJTI0L2csICckJykuXG4gICAgcmVwbGFjZSgvJTJDL2dpLCAnLCcpLlxuICAgIHJlcGxhY2UoLyUyMC9nLCAnKycpLlxuICAgIHJlcGxhY2UoLyU1Qi9naSwgJ1snKS5cbiAgICByZXBsYWNlKC8lNUQvZ2ksICddJyk7XG59XG5cbi8qKlxuICogQnVpbGQgYSBVUkwgYnkgYXBwZW5kaW5nIHBhcmFtcyB0byB0aGUgZW5kXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHVybCBUaGUgYmFzZSBvZiB0aGUgdXJsIChlLmcuLCBodHRwOi8vd3d3Lmdvb2dsZS5jb20pXG4gKiBAcGFyYW0ge29iamVjdH0gW3BhcmFtc10gVGhlIHBhcmFtcyB0byBiZSBhcHBlbmRlZFxuICogQHJldHVybnMge3N0cmluZ30gVGhlIGZvcm1hdHRlZCB1cmxcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBidWlsZFVSTCh1cmwsIHBhcmFtcywgcGFyYW1zU2VyaWFsaXplcikge1xuICAvKmVzbGludCBuby1wYXJhbS1yZWFzc2lnbjowKi9cbiAgaWYgKCFwYXJhbXMpIHtcbiAgICByZXR1cm4gdXJsO1xuICB9XG5cbiAgdmFyIHNlcmlhbGl6ZWRQYXJhbXM7XG4gIGlmIChwYXJhbXNTZXJpYWxpemVyKSB7XG4gICAgc2VyaWFsaXplZFBhcmFtcyA9IHBhcmFtc1NlcmlhbGl6ZXIocGFyYW1zKTtcbiAgfSBlbHNlIGlmICh1dGlscy5pc1VSTFNlYXJjaFBhcmFtcyhwYXJhbXMpKSB7XG4gICAgc2VyaWFsaXplZFBhcmFtcyA9IHBhcmFtcy50b1N0cmluZygpO1xuICB9IGVsc2Uge1xuICAgIHZhciBwYXJ0cyA9IFtdO1xuXG4gICAgdXRpbHMuZm9yRWFjaChwYXJhbXMsIGZ1bmN0aW9uIHNlcmlhbGl6ZSh2YWwsIGtleSkge1xuICAgICAgaWYgKHZhbCA9PT0gbnVsbCB8fCB0eXBlb2YgdmFsID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmICh1dGlscy5pc0FycmF5KHZhbCkpIHtcbiAgICAgICAga2V5ID0ga2V5ICsgJ1tdJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbCA9IFt2YWxdO1xuICAgICAgfVxuXG4gICAgICB1dGlscy5mb3JFYWNoKHZhbCwgZnVuY3Rpb24gcGFyc2VWYWx1ZSh2KSB7XG4gICAgICAgIGlmICh1dGlscy5pc0RhdGUodikpIHtcbiAgICAgICAgICB2ID0gdi50b0lTT1N0cmluZygpO1xuICAgICAgICB9IGVsc2UgaWYgKHV0aWxzLmlzT2JqZWN0KHYpKSB7XG4gICAgICAgICAgdiA9IEpTT04uc3RyaW5naWZ5KHYpO1xuICAgICAgICB9XG4gICAgICAgIHBhcnRzLnB1c2goZW5jb2RlKGtleSkgKyAnPScgKyBlbmNvZGUodikpO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBzZXJpYWxpemVkUGFyYW1zID0gcGFydHMuam9pbignJicpO1xuICB9XG5cbiAgaWYgKHNlcmlhbGl6ZWRQYXJhbXMpIHtcbiAgICB1cmwgKz0gKHVybC5pbmRleE9mKCc/JykgPT09IC0xID8gJz8nIDogJyYnKSArIHNlcmlhbGl6ZWRQYXJhbXM7XG4gIH1cblxuICByZXR1cm4gdXJsO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IFVSTCBieSBjb21iaW5pbmcgdGhlIHNwZWNpZmllZCBVUkxzXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGJhc2VVUkwgVGhlIGJhc2UgVVJMXG4gKiBAcGFyYW0ge3N0cmluZ30gcmVsYXRpdmVVUkwgVGhlIHJlbGF0aXZlIFVSTFxuICogQHJldHVybnMge3N0cmluZ30gVGhlIGNvbWJpbmVkIFVSTFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGNvbWJpbmVVUkxzKGJhc2VVUkwsIHJlbGF0aXZlVVJMKSB7XG4gIHJldHVybiByZWxhdGl2ZVVSTFxuICAgID8gYmFzZVVSTC5yZXBsYWNlKC9cXC8rJC8sICcnKSArICcvJyArIHJlbGF0aXZlVVJMLnJlcGxhY2UoL15cXC8rLywgJycpXG4gICAgOiBiYXNlVVJMO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IChcbiAgdXRpbHMuaXNTdGFuZGFyZEJyb3dzZXJFbnYoKSA/XG5cbiAgLy8gU3RhbmRhcmQgYnJvd3NlciBlbnZzIHN1cHBvcnQgZG9jdW1lbnQuY29va2llXG4gIChmdW5jdGlvbiBzdGFuZGFyZEJyb3dzZXJFbnYoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHdyaXRlOiBmdW5jdGlvbiB3cml0ZShuYW1lLCB2YWx1ZSwgZXhwaXJlcywgcGF0aCwgZG9tYWluLCBzZWN1cmUpIHtcbiAgICAgICAgdmFyIGNvb2tpZSA9IFtdO1xuICAgICAgICBjb29raWUucHVzaChuYW1lICsgJz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKSk7XG5cbiAgICAgICAgaWYgKHV0aWxzLmlzTnVtYmVyKGV4cGlyZXMpKSB7XG4gICAgICAgICAgY29va2llLnB1c2goJ2V4cGlyZXM9JyArIG5ldyBEYXRlKGV4cGlyZXMpLnRvR01UU3RyaW5nKCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHV0aWxzLmlzU3RyaW5nKHBhdGgpKSB7XG4gICAgICAgICAgY29va2llLnB1c2goJ3BhdGg9JyArIHBhdGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHV0aWxzLmlzU3RyaW5nKGRvbWFpbikpIHtcbiAgICAgICAgICBjb29raWUucHVzaCgnZG9tYWluPScgKyBkb21haW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHNlY3VyZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgIGNvb2tpZS5wdXNoKCdzZWN1cmUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRvY3VtZW50LmNvb2tpZSA9IGNvb2tpZS5qb2luKCc7ICcpO1xuICAgICAgfSxcblxuICAgICAgcmVhZDogZnVuY3Rpb24gcmVhZChuYW1lKSB7XG4gICAgICAgIHZhciBtYXRjaCA9IGRvY3VtZW50LmNvb2tpZS5tYXRjaChuZXcgUmVnRXhwKCcoXnw7XFxcXHMqKSgnICsgbmFtZSArICcpPShbXjtdKiknKSk7XG4gICAgICAgIHJldHVybiAobWF0Y2ggPyBkZWNvZGVVUklDb21wb25lbnQobWF0Y2hbM10pIDogbnVsbCk7XG4gICAgICB9LFxuXG4gICAgICByZW1vdmU6IGZ1bmN0aW9uIHJlbW92ZShuYW1lKSB7XG4gICAgICAgIHRoaXMud3JpdGUobmFtZSwgJycsIERhdGUubm93KCkgLSA4NjQwMDAwMCk7XG4gICAgICB9XG4gICAgfTtcbiAgfSkoKSA6XG5cbiAgLy8gTm9uIHN0YW5kYXJkIGJyb3dzZXIgZW52ICh3ZWIgd29ya2VycywgcmVhY3QtbmF0aXZlKSBsYWNrIG5lZWRlZCBzdXBwb3J0LlxuICAoZnVuY3Rpb24gbm9uU3RhbmRhcmRCcm93c2VyRW52KCkge1xuICAgIHJldHVybiB7XG4gICAgICB3cml0ZTogZnVuY3Rpb24gd3JpdGUoKSB7fSxcbiAgICAgIHJlYWQ6IGZ1bmN0aW9uIHJlYWQoKSB7IHJldHVybiBudWxsOyB9LFxuICAgICAgcmVtb3ZlOiBmdW5jdGlvbiByZW1vdmUoKSB7fVxuICAgIH07XG4gIH0pKClcbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBzcGVjaWZpZWQgVVJMIGlzIGFic29sdXRlXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHVybCBUaGUgVVJMIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHRoZSBzcGVjaWZpZWQgVVJMIGlzIGFic29sdXRlLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0Fic29sdXRlVVJMKHVybCkge1xuICAvLyBBIFVSTCBpcyBjb25zaWRlcmVkIGFic29sdXRlIGlmIGl0IGJlZ2lucyB3aXRoIFwiPHNjaGVtZT46Ly9cIiBvciBcIi8vXCIgKHByb3RvY29sLXJlbGF0aXZlIFVSTCkuXG4gIC8vIFJGQyAzOTg2IGRlZmluZXMgc2NoZW1lIG5hbWUgYXMgYSBzZXF1ZW5jZSBvZiBjaGFyYWN0ZXJzIGJlZ2lubmluZyB3aXRoIGEgbGV0dGVyIGFuZCBmb2xsb3dlZFxuICAvLyBieSBhbnkgY29tYmluYXRpb24gb2YgbGV0dGVycywgZGlnaXRzLCBwbHVzLCBwZXJpb2QsIG9yIGh5cGhlbi5cbiAgcmV0dXJuIC9eKFthLXpdW2EtelxcZFxcK1xcLVxcLl0qOik/XFwvXFwvL2kudGVzdCh1cmwpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IChcbiAgdXRpbHMuaXNTdGFuZGFyZEJyb3dzZXJFbnYoKSA/XG5cbiAgLy8gU3RhbmRhcmQgYnJvd3NlciBlbnZzIGhhdmUgZnVsbCBzdXBwb3J0IG9mIHRoZSBBUElzIG5lZWRlZCB0byB0ZXN0XG4gIC8vIHdoZXRoZXIgdGhlIHJlcXVlc3QgVVJMIGlzIG9mIHRoZSBzYW1lIG9yaWdpbiBhcyBjdXJyZW50IGxvY2F0aW9uLlxuICAoZnVuY3Rpb24gc3RhbmRhcmRCcm93c2VyRW52KCkge1xuICAgIHZhciBtc2llID0gLyhtc2llfHRyaWRlbnQpL2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KTtcbiAgICB2YXIgdXJsUGFyc2luZ05vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgdmFyIG9yaWdpblVSTDtcblxuICAgIC8qKlxuICAgICogUGFyc2UgYSBVUkwgdG8gZGlzY292ZXIgaXQncyBjb21wb25lbnRzXG4gICAgKlxuICAgICogQHBhcmFtIHtTdHJpbmd9IHVybCBUaGUgVVJMIHRvIGJlIHBhcnNlZFxuICAgICogQHJldHVybnMge09iamVjdH1cbiAgICAqL1xuICAgIGZ1bmN0aW9uIHJlc29sdmVVUkwodXJsKSB7XG4gICAgICB2YXIgaHJlZiA9IHVybDtcblxuICAgICAgaWYgKG1zaWUpIHtcbiAgICAgICAgLy8gSUUgbmVlZHMgYXR0cmlidXRlIHNldCB0d2ljZSB0byBub3JtYWxpemUgcHJvcGVydGllc1xuICAgICAgICB1cmxQYXJzaW5nTm9kZS5zZXRBdHRyaWJ1dGUoJ2hyZWYnLCBocmVmKTtcbiAgICAgICAgaHJlZiA9IHVybFBhcnNpbmdOb2RlLmhyZWY7XG4gICAgICB9XG5cbiAgICAgIHVybFBhcnNpbmdOb2RlLnNldEF0dHJpYnV0ZSgnaHJlZicsIGhyZWYpO1xuXG4gICAgICAvLyB1cmxQYXJzaW5nTm9kZSBwcm92aWRlcyB0aGUgVXJsVXRpbHMgaW50ZXJmYWNlIC0gaHR0cDovL3VybC5zcGVjLndoYXR3Zy5vcmcvI3VybHV0aWxzXG4gICAgICByZXR1cm4ge1xuICAgICAgICBocmVmOiB1cmxQYXJzaW5nTm9kZS5ocmVmLFxuICAgICAgICBwcm90b2NvbDogdXJsUGFyc2luZ05vZGUucHJvdG9jb2wgPyB1cmxQYXJzaW5nTm9kZS5wcm90b2NvbC5yZXBsYWNlKC86JC8sICcnKSA6ICcnLFxuICAgICAgICBob3N0OiB1cmxQYXJzaW5nTm9kZS5ob3N0LFxuICAgICAgICBzZWFyY2g6IHVybFBhcnNpbmdOb2RlLnNlYXJjaCA/IHVybFBhcnNpbmdOb2RlLnNlYXJjaC5yZXBsYWNlKC9eXFw/LywgJycpIDogJycsXG4gICAgICAgIGhhc2g6IHVybFBhcnNpbmdOb2RlLmhhc2ggPyB1cmxQYXJzaW5nTm9kZS5oYXNoLnJlcGxhY2UoL14jLywgJycpIDogJycsXG4gICAgICAgIGhvc3RuYW1lOiB1cmxQYXJzaW5nTm9kZS5ob3N0bmFtZSxcbiAgICAgICAgcG9ydDogdXJsUGFyc2luZ05vZGUucG9ydCxcbiAgICAgICAgcGF0aG5hbWU6ICh1cmxQYXJzaW5nTm9kZS5wYXRobmFtZS5jaGFyQXQoMCkgPT09ICcvJykgP1xuICAgICAgICAgICAgICAgICAgdXJsUGFyc2luZ05vZGUucGF0aG5hbWUgOlxuICAgICAgICAgICAgICAgICAgJy8nICsgdXJsUGFyc2luZ05vZGUucGF0aG5hbWVcbiAgICAgIH07XG4gICAgfVxuXG4gICAgb3JpZ2luVVJMID0gcmVzb2x2ZVVSTCh3aW5kb3cubG9jYXRpb24uaHJlZik7XG5cbiAgICAvKipcbiAgICAqIERldGVybWluZSBpZiBhIFVSTCBzaGFyZXMgdGhlIHNhbWUgb3JpZ2luIGFzIHRoZSBjdXJyZW50IGxvY2F0aW9uXG4gICAgKlxuICAgICogQHBhcmFtIHtTdHJpbmd9IHJlcXVlc3RVUkwgVGhlIFVSTCB0byB0ZXN0XG4gICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBVUkwgc2hhcmVzIHRoZSBzYW1lIG9yaWdpbiwgb3RoZXJ3aXNlIGZhbHNlXG4gICAgKi9cbiAgICByZXR1cm4gZnVuY3Rpb24gaXNVUkxTYW1lT3JpZ2luKHJlcXVlc3RVUkwpIHtcbiAgICAgIHZhciBwYXJzZWQgPSAodXRpbHMuaXNTdHJpbmcocmVxdWVzdFVSTCkpID8gcmVzb2x2ZVVSTChyZXF1ZXN0VVJMKSA6IHJlcXVlc3RVUkw7XG4gICAgICByZXR1cm4gKHBhcnNlZC5wcm90b2NvbCA9PT0gb3JpZ2luVVJMLnByb3RvY29sICYmXG4gICAgICAgICAgICBwYXJzZWQuaG9zdCA9PT0gb3JpZ2luVVJMLmhvc3QpO1xuICAgIH07XG4gIH0pKCkgOlxuXG4gIC8vIE5vbiBzdGFuZGFyZCBicm93c2VyIGVudnMgKHdlYiB3b3JrZXJzLCByZWFjdC1uYXRpdmUpIGxhY2sgbmVlZGVkIHN1cHBvcnQuXG4gIChmdW5jdGlvbiBub25TdGFuZGFyZEJyb3dzZXJFbnYoKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGlzVVJMU2FtZU9yaWdpbigpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gIH0pKClcbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gbm9ybWFsaXplSGVhZGVyTmFtZShoZWFkZXJzLCBub3JtYWxpemVkTmFtZSkge1xuICB1dGlscy5mb3JFYWNoKGhlYWRlcnMsIGZ1bmN0aW9uIHByb2Nlc3NIZWFkZXIodmFsdWUsIG5hbWUpIHtcbiAgICBpZiAobmFtZSAhPT0gbm9ybWFsaXplZE5hbWUgJiYgbmFtZS50b1VwcGVyQ2FzZSgpID09PSBub3JtYWxpemVkTmFtZS50b1VwcGVyQ2FzZSgpKSB7XG4gICAgICBoZWFkZXJzW25vcm1hbGl6ZWROYW1lXSA9IHZhbHVlO1xuICAgICAgZGVsZXRlIGhlYWRlcnNbbmFtZV07XG4gICAgfVxuICB9KTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcblxuLy8gSGVhZGVycyB3aG9zZSBkdXBsaWNhdGVzIGFyZSBpZ25vcmVkIGJ5IG5vZGVcbi8vIGMuZi4gaHR0cHM6Ly9ub2RlanMub3JnL2FwaS9odHRwLmh0bWwjaHR0cF9tZXNzYWdlX2hlYWRlcnNcbnZhciBpZ25vcmVEdXBsaWNhdGVPZiA9IFtcbiAgJ2FnZScsICdhdXRob3JpemF0aW9uJywgJ2NvbnRlbnQtbGVuZ3RoJywgJ2NvbnRlbnQtdHlwZScsICdldGFnJyxcbiAgJ2V4cGlyZXMnLCAnZnJvbScsICdob3N0JywgJ2lmLW1vZGlmaWVkLXNpbmNlJywgJ2lmLXVubW9kaWZpZWQtc2luY2UnLFxuICAnbGFzdC1tb2RpZmllZCcsICdsb2NhdGlvbicsICdtYXgtZm9yd2FyZHMnLCAncHJveHktYXV0aG9yaXphdGlvbicsXG4gICdyZWZlcmVyJywgJ3JldHJ5LWFmdGVyJywgJ3VzZXItYWdlbnQnXG5dO1xuXG4vKipcbiAqIFBhcnNlIGhlYWRlcnMgaW50byBhbiBvYmplY3RcbiAqXG4gKiBgYGBcbiAqIERhdGU6IFdlZCwgMjcgQXVnIDIwMTQgMDg6NTg6NDkgR01UXG4gKiBDb250ZW50LVR5cGU6IGFwcGxpY2F0aW9uL2pzb25cbiAqIENvbm5lY3Rpb246IGtlZXAtYWxpdmVcbiAqIFRyYW5zZmVyLUVuY29kaW5nOiBjaHVua2VkXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gaGVhZGVycyBIZWFkZXJzIG5lZWRpbmcgdG8gYmUgcGFyc2VkXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBIZWFkZXJzIHBhcnNlZCBpbnRvIGFuIG9iamVjdFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHBhcnNlSGVhZGVycyhoZWFkZXJzKSB7XG4gIHZhciBwYXJzZWQgPSB7fTtcbiAgdmFyIGtleTtcbiAgdmFyIHZhbDtcbiAgdmFyIGk7XG5cbiAgaWYgKCFoZWFkZXJzKSB7IHJldHVybiBwYXJzZWQ7IH1cblxuICB1dGlscy5mb3JFYWNoKGhlYWRlcnMuc3BsaXQoJ1xcbicpLCBmdW5jdGlvbiBwYXJzZXIobGluZSkge1xuICAgIGkgPSBsaW5lLmluZGV4T2YoJzonKTtcbiAgICBrZXkgPSB1dGlscy50cmltKGxpbmUuc3Vic3RyKDAsIGkpKS50b0xvd2VyQ2FzZSgpO1xuICAgIHZhbCA9IHV0aWxzLnRyaW0obGluZS5zdWJzdHIoaSArIDEpKTtcblxuICAgIGlmIChrZXkpIHtcbiAgICAgIGlmIChwYXJzZWRba2V5XSAmJiBpZ25vcmVEdXBsaWNhdGVPZi5pbmRleE9mKGtleSkgPj0gMCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoa2V5ID09PSAnc2V0LWNvb2tpZScpIHtcbiAgICAgICAgcGFyc2VkW2tleV0gPSAocGFyc2VkW2tleV0gPyBwYXJzZWRba2V5XSA6IFtdKS5jb25jYXQoW3ZhbF0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGFyc2VkW2tleV0gPSBwYXJzZWRba2V5XSA/IHBhcnNlZFtrZXldICsgJywgJyArIHZhbCA6IHZhbDtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBwYXJzZWQ7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFN5bnRhY3RpYyBzdWdhciBmb3IgaW52b2tpbmcgYSBmdW5jdGlvbiBhbmQgZXhwYW5kaW5nIGFuIGFycmF5IGZvciBhcmd1bWVudHMuXG4gKlxuICogQ29tbW9uIHVzZSBjYXNlIHdvdWxkIGJlIHRvIHVzZSBgRnVuY3Rpb24ucHJvdG90eXBlLmFwcGx5YC5cbiAqXG4gKiAgYGBganNcbiAqICBmdW5jdGlvbiBmKHgsIHksIHopIHt9XG4gKiAgdmFyIGFyZ3MgPSBbMSwgMiwgM107XG4gKiAgZi5hcHBseShudWxsLCBhcmdzKTtcbiAqICBgYGBcbiAqXG4gKiBXaXRoIGBzcHJlYWRgIHRoaXMgZXhhbXBsZSBjYW4gYmUgcmUtd3JpdHRlbi5cbiAqXG4gKiAgYGBganNcbiAqICBzcHJlYWQoZnVuY3Rpb24oeCwgeSwgeikge30pKFsxLCAyLCAzXSk7XG4gKiAgYGBgXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAqIEByZXR1cm5zIHtGdW5jdGlvbn1cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBzcHJlYWQoY2FsbGJhY2spIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIHdyYXAoYXJyKSB7XG4gICAgcmV0dXJuIGNhbGxiYWNrLmFwcGx5KG51bGwsIGFycik7XG4gIH07XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgYmluZCA9IHJlcXVpcmUoJy4vaGVscGVycy9iaW5kJyk7XG52YXIgaXNCdWZmZXIgPSByZXF1aXJlKCdpcy1idWZmZXInKTtcblxuLypnbG9iYWwgdG9TdHJpbmc6dHJ1ZSovXG5cbi8vIHV0aWxzIGlzIGEgbGlicmFyeSBvZiBnZW5lcmljIGhlbHBlciBmdW5jdGlvbnMgbm9uLXNwZWNpZmljIHRvIGF4aW9zXG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYW4gQXJyYXlcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhbiBBcnJheSwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzQXJyYXkodmFsKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKHZhbCkgPT09ICdbb2JqZWN0IEFycmF5XSc7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYW4gQXJyYXlCdWZmZXJcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhbiBBcnJheUJ1ZmZlciwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzQXJyYXlCdWZmZXIodmFsKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKHZhbCkgPT09ICdbb2JqZWN0IEFycmF5QnVmZmVyXSc7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBGb3JtRGF0YVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGFuIEZvcm1EYXRhLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNGb3JtRGF0YSh2YWwpIHtcbiAgcmV0dXJuICh0eXBlb2YgRm9ybURhdGEgIT09ICd1bmRlZmluZWQnKSAmJiAodmFsIGluc3RhbmNlb2YgRm9ybURhdGEpO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgdmlldyBvbiBhbiBBcnJheUJ1ZmZlclxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgdmlldyBvbiBhbiBBcnJheUJ1ZmZlciwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzQXJyYXlCdWZmZXJWaWV3KHZhbCkge1xuICB2YXIgcmVzdWx0O1xuICBpZiAoKHR5cGVvZiBBcnJheUJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCcpICYmIChBcnJheUJ1ZmZlci5pc1ZpZXcpKSB7XG4gICAgcmVzdWx0ID0gQXJyYXlCdWZmZXIuaXNWaWV3KHZhbCk7XG4gIH0gZWxzZSB7XG4gICAgcmVzdWx0ID0gKHZhbCkgJiYgKHZhbC5idWZmZXIpICYmICh2YWwuYnVmZmVyIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBTdHJpbmdcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIFN0cmluZywgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzU3RyaW5nKHZhbCkge1xuICByZXR1cm4gdHlwZW9mIHZhbCA9PT0gJ3N0cmluZyc7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBOdW1iZXJcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIE51bWJlciwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzTnVtYmVyKHZhbCkge1xuICByZXR1cm4gdHlwZW9mIHZhbCA9PT0gJ251bWJlcic7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgdW5kZWZpbmVkXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdGhlIHZhbHVlIGlzIHVuZGVmaW5lZCwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKHZhbCkge1xuICByZXR1cm4gdHlwZW9mIHZhbCA9PT0gJ3VuZGVmaW5lZCc7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYW4gT2JqZWN0XG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYW4gT2JqZWN0LCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNPYmplY3QodmFsKSB7XG4gIHJldHVybiB2YWwgIT09IG51bGwgJiYgdHlwZW9mIHZhbCA9PT0gJ29iamVjdCc7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBEYXRlXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBEYXRlLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNEYXRlKHZhbCkge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbCh2YWwpID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBGaWxlXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBGaWxlLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNGaWxlKHZhbCkge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbCh2YWwpID09PSAnW29iamVjdCBGaWxlXSc7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBCbG9iXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBCbG9iLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNCbG9iKHZhbCkge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbCh2YWwpID09PSAnW29iamVjdCBCbG9iXSc7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBGdW5jdGlvblxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgRnVuY3Rpb24sIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKHZhbCkge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbCh2YWwpID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgU3RyZWFtXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBTdHJlYW0sIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc1N0cmVhbSh2YWwpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KHZhbCkgJiYgaXNGdW5jdGlvbih2YWwucGlwZSk7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBVUkxTZWFyY2hQYXJhbXMgb2JqZWN0XG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBVUkxTZWFyY2hQYXJhbXMgb2JqZWN0LCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNVUkxTZWFyY2hQYXJhbXModmFsKSB7XG4gIHJldHVybiB0eXBlb2YgVVJMU2VhcmNoUGFyYW1zICE9PSAndW5kZWZpbmVkJyAmJiB2YWwgaW5zdGFuY2VvZiBVUkxTZWFyY2hQYXJhbXM7XG59XG5cbi8qKlxuICogVHJpbSBleGNlc3Mgd2hpdGVzcGFjZSBvZmYgdGhlIGJlZ2lubmluZyBhbmQgZW5kIG9mIGEgc3RyaW5nXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0ciBUaGUgU3RyaW5nIHRvIHRyaW1cbiAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBTdHJpbmcgZnJlZWQgb2YgZXhjZXNzIHdoaXRlc3BhY2VcbiAqL1xuZnVuY3Rpb24gdHJpbShzdHIpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9eXFxzKi8sICcnKS5yZXBsYWNlKC9cXHMqJC8sICcnKTtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgd2UncmUgcnVubmluZyBpbiBhIHN0YW5kYXJkIGJyb3dzZXIgZW52aXJvbm1lbnRcbiAqXG4gKiBUaGlzIGFsbG93cyBheGlvcyB0byBydW4gaW4gYSB3ZWIgd29ya2VyLCBhbmQgcmVhY3QtbmF0aXZlLlxuICogQm90aCBlbnZpcm9ubWVudHMgc3VwcG9ydCBYTUxIdHRwUmVxdWVzdCwgYnV0IG5vdCBmdWxseSBzdGFuZGFyZCBnbG9iYWxzLlxuICpcbiAqIHdlYiB3b3JrZXJzOlxuICogIHR5cGVvZiB3aW5kb3cgLT4gdW5kZWZpbmVkXG4gKiAgdHlwZW9mIGRvY3VtZW50IC0+IHVuZGVmaW5lZFxuICpcbiAqIHJlYWN0LW5hdGl2ZTpcbiAqICBuYXZpZ2F0b3IucHJvZHVjdCAtPiAnUmVhY3ROYXRpdmUnXG4gKi9cbmZ1bmN0aW9uIGlzU3RhbmRhcmRCcm93c2VyRW52KCkge1xuICBpZiAodHlwZW9mIG5hdmlnYXRvciAhPT0gJ3VuZGVmaW5lZCcgJiYgbmF2aWdhdG9yLnByb2R1Y3QgPT09ICdSZWFjdE5hdGl2ZScpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIChcbiAgICB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJlxuICAgIHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCdcbiAgKTtcbn1cblxuLyoqXG4gKiBJdGVyYXRlIG92ZXIgYW4gQXJyYXkgb3IgYW4gT2JqZWN0IGludm9raW5nIGEgZnVuY3Rpb24gZm9yIGVhY2ggaXRlbS5cbiAqXG4gKiBJZiBgb2JqYCBpcyBhbiBBcnJheSBjYWxsYmFjayB3aWxsIGJlIGNhbGxlZCBwYXNzaW5nXG4gKiB0aGUgdmFsdWUsIGluZGV4LCBhbmQgY29tcGxldGUgYXJyYXkgZm9yIGVhY2ggaXRlbS5cbiAqXG4gKiBJZiAnb2JqJyBpcyBhbiBPYmplY3QgY2FsbGJhY2sgd2lsbCBiZSBjYWxsZWQgcGFzc2luZ1xuICogdGhlIHZhbHVlLCBrZXksIGFuZCBjb21wbGV0ZSBvYmplY3QgZm9yIGVhY2ggcHJvcGVydHkuXG4gKlxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl9IG9iaiBUaGUgb2JqZWN0IHRvIGl0ZXJhdGVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIFRoZSBjYWxsYmFjayB0byBpbnZva2UgZm9yIGVhY2ggaXRlbVxuICovXG5mdW5jdGlvbiBmb3JFYWNoKG9iaiwgZm4pIHtcbiAgLy8gRG9uJ3QgYm90aGVyIGlmIG5vIHZhbHVlIHByb3ZpZGVkXG4gIGlmIChvYmogPT09IG51bGwgfHwgdHlwZW9mIG9iaiA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBGb3JjZSBhbiBhcnJheSBpZiBub3QgYWxyZWFkeSBzb21ldGhpbmcgaXRlcmFibGVcbiAgaWYgKHR5cGVvZiBvYmogIT09ICdvYmplY3QnKSB7XG4gICAgLyplc2xpbnQgbm8tcGFyYW0tcmVhc3NpZ246MCovXG4gICAgb2JqID0gW29ial07XG4gIH1cblxuICBpZiAoaXNBcnJheShvYmopKSB7XG4gICAgLy8gSXRlcmF0ZSBvdmVyIGFycmF5IHZhbHVlc1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gb2JqLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgZm4uY2FsbChudWxsLCBvYmpbaV0sIGksIG9iaik7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIEl0ZXJhdGUgb3ZlciBvYmplY3Qga2V5c1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSB7XG4gICAgICAgIGZuLmNhbGwobnVsbCwgb2JqW2tleV0sIGtleSwgb2JqKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBBY2NlcHRzIHZhcmFyZ3MgZXhwZWN0aW5nIGVhY2ggYXJndW1lbnQgdG8gYmUgYW4gb2JqZWN0LCB0aGVuXG4gKiBpbW11dGFibHkgbWVyZ2VzIHRoZSBwcm9wZXJ0aWVzIG9mIGVhY2ggb2JqZWN0IGFuZCByZXR1cm5zIHJlc3VsdC5cbiAqXG4gKiBXaGVuIG11bHRpcGxlIG9iamVjdHMgY29udGFpbiB0aGUgc2FtZSBrZXkgdGhlIGxhdGVyIG9iamVjdCBpblxuICogdGhlIGFyZ3VtZW50cyBsaXN0IHdpbGwgdGFrZSBwcmVjZWRlbmNlLlxuICpcbiAqIEV4YW1wbGU6XG4gKlxuICogYGBganNcbiAqIHZhciByZXN1bHQgPSBtZXJnZSh7Zm9vOiAxMjN9LCB7Zm9vOiA0NTZ9KTtcbiAqIGNvbnNvbGUubG9nKHJlc3VsdC5mb28pOyAvLyBvdXRwdXRzIDQ1NlxuICogYGBgXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iajEgT2JqZWN0IHRvIG1lcmdlXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBSZXN1bHQgb2YgYWxsIG1lcmdlIHByb3BlcnRpZXNcbiAqL1xuZnVuY3Rpb24gbWVyZ2UoLyogb2JqMSwgb2JqMiwgb2JqMywgLi4uICovKSB7XG4gIHZhciByZXN1bHQgPSB7fTtcbiAgZnVuY3Rpb24gYXNzaWduVmFsdWUodmFsLCBrZXkpIHtcbiAgICBpZiAodHlwZW9mIHJlc3VsdFtrZXldID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgdmFsID09PSAnb2JqZWN0Jykge1xuICAgICAgcmVzdWx0W2tleV0gPSBtZXJnZShyZXN1bHRba2V5XSwgdmFsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0W2tleV0gPSB2YWw7XG4gICAgfVxuICB9XG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgZm9yRWFjaChhcmd1bWVudHNbaV0sIGFzc2lnblZhbHVlKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIEV4dGVuZHMgb2JqZWN0IGEgYnkgbXV0YWJseSBhZGRpbmcgdG8gaXQgdGhlIHByb3BlcnRpZXMgb2Ygb2JqZWN0IGIuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGEgVGhlIG9iamVjdCB0byBiZSBleHRlbmRlZFxuICogQHBhcmFtIHtPYmplY3R9IGIgVGhlIG9iamVjdCB0byBjb3B5IHByb3BlcnRpZXMgZnJvbVxuICogQHBhcmFtIHtPYmplY3R9IHRoaXNBcmcgVGhlIG9iamVjdCB0byBiaW5kIGZ1bmN0aW9uIHRvXG4gKiBAcmV0dXJuIHtPYmplY3R9IFRoZSByZXN1bHRpbmcgdmFsdWUgb2Ygb2JqZWN0IGFcbiAqL1xuZnVuY3Rpb24gZXh0ZW5kKGEsIGIsIHRoaXNBcmcpIHtcbiAgZm9yRWFjaChiLCBmdW5jdGlvbiBhc3NpZ25WYWx1ZSh2YWwsIGtleSkge1xuICAgIGlmICh0aGlzQXJnICYmIHR5cGVvZiB2YWwgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGFba2V5XSA9IGJpbmQodmFsLCB0aGlzQXJnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYVtrZXldID0gdmFsO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBhO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgaXNBcnJheTogaXNBcnJheSxcbiAgaXNBcnJheUJ1ZmZlcjogaXNBcnJheUJ1ZmZlcixcbiAgaXNCdWZmZXI6IGlzQnVmZmVyLFxuICBpc0Zvcm1EYXRhOiBpc0Zvcm1EYXRhLFxuICBpc0FycmF5QnVmZmVyVmlldzogaXNBcnJheUJ1ZmZlclZpZXcsXG4gIGlzU3RyaW5nOiBpc1N0cmluZyxcbiAgaXNOdW1iZXI6IGlzTnVtYmVyLFxuICBpc09iamVjdDogaXNPYmplY3QsXG4gIGlzVW5kZWZpbmVkOiBpc1VuZGVmaW5lZCxcbiAgaXNEYXRlOiBpc0RhdGUsXG4gIGlzRmlsZTogaXNGaWxlLFxuICBpc0Jsb2I6IGlzQmxvYixcbiAgaXNGdW5jdGlvbjogaXNGdW5jdGlvbixcbiAgaXNTdHJlYW06IGlzU3RyZWFtLFxuICBpc1VSTFNlYXJjaFBhcmFtczogaXNVUkxTZWFyY2hQYXJhbXMsXG4gIGlzU3RhbmRhcmRCcm93c2VyRW52OiBpc1N0YW5kYXJkQnJvd3NlckVudixcbiAgZm9yRWFjaDogZm9yRWFjaCxcbiAgbWVyZ2U6IG1lcmdlLFxuICBleHRlbmQ6IGV4dGVuZCxcbiAgdHJpbTogdHJpbVxufTtcbiIsIi8qIVxuICogRGV0ZXJtaW5lIGlmIGFuIG9iamVjdCBpcyBhIEJ1ZmZlclxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxodHRwczovL2Zlcm9zcy5vcmc+XG4gKiBAbGljZW5zZSAgTUlUXG4gKi9cblxuLy8gVGhlIF9pc0J1ZmZlciBjaGVjayBpcyBmb3IgU2FmYXJpIDUtNyBzdXBwb3J0LCBiZWNhdXNlIGl0J3MgbWlzc2luZ1xuLy8gT2JqZWN0LnByb3RvdHlwZS5jb25zdHJ1Y3Rvci4gUmVtb3ZlIHRoaXMgZXZlbnR1YWxseVxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob2JqKSB7XG4gIHJldHVybiBvYmogIT0gbnVsbCAmJiAoaXNCdWZmZXIob2JqKSB8fCBpc1Nsb3dCdWZmZXIob2JqKSB8fCAhIW9iai5faXNCdWZmZXIpXG59XG5cbmZ1bmN0aW9uIGlzQnVmZmVyIChvYmopIHtcbiAgcmV0dXJuICEhb2JqLmNvbnN0cnVjdG9yICYmIHR5cGVvZiBvYmouY29uc3RydWN0b3IuaXNCdWZmZXIgPT09ICdmdW5jdGlvbicgJiYgb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyKG9iailcbn1cblxuLy8gRm9yIE5vZGUgdjAuMTAgc3VwcG9ydC4gUmVtb3ZlIHRoaXMgZXZlbnR1YWxseS5cbmZ1bmN0aW9uIGlzU2xvd0J1ZmZlciAob2JqKSB7XG4gIHJldHVybiB0eXBlb2Ygb2JqLnJlYWRGbG9hdExFID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBvYmouc2xpY2UgPT09ICdmdW5jdGlvbicgJiYgaXNCdWZmZXIob2JqLnNsaWNlKDAsIDApKVxufVxuIiwiLyoqVGhpcyBjbGFzcyBpcyBhdXRvbWF0aWNhbGx5IGdlbmVyYXRlZCBieSBMYXlhQWlySURFLCBwbGVhc2UgZG8gbm90IG1ha2UgYW55IG1vZGlmaWNhdGlvbnMuICovXG5pbXBvcnQgQXNzaXN0YW50IGZyb20gXCIuL3NjcmlwdC9Bc3Npc3RhbnRcIlxuaW1wb3J0IFBhZ2VTY3JpcHQgZnJvbSBcIi4vcHVibGljU2NyaXB0L1BhZ2VTY3JpcHRcIlxuaW1wb3J0IFNjcmVlbiBmcm9tIFwiLi9wdWJsaWNTY3JpcHQvU2NyZWVuXCJcbmltcG9ydCB0cmVuZExpc3QgZnJvbSBcIi4vdGVtcGxhdGUvdHJlbmRMaXN0XCJcbmltcG9ydCBDYXJkIGZyb20gXCIuL3NjcmlwdC9DYXJkXCJcbmltcG9ydCBncmFuZFByaXggZnJvbSBcIi4vc2NyaXB0L2dyYW5kUHJpeFwiXG5pbXBvcnQgUGFnZU5hdlNjcmlwdCBmcm9tIFwiLi9wdWJsaWNTY3JpcHQvUGFnZU5hdlNjcmlwdFwiXG5pbXBvcnQgcHJpeExpc3QgZnJvbSBcIi4vdGVtcGxhdGUvcHJpeExpc3RcIlxuaW1wb3J0IEd1ZXNzaW5nIGZyb20gXCIuL3NjcmlwdC9HdWVzc2luZ1wiXG5pbXBvcnQgbnVtYmVyTGlzdERvbVNjcmlwdCBmcm9tIFwiLi90ZW1wbGF0ZS9udW1iZXJMaXN0RG9tU2NyaXB0XCJcbmltcG9ydCBIb21lIGZyb20gXCIuL3NjcmlwdC9Ib21lXCJcbmltcG9ydCBsb2FkaW5nU2NlbmUgZnJvbSBcIi4vc2NyaXB0L2xvYWRpbmdTY2VuZVwiXG5pbXBvcnQgcHJpSGlzdG9yeVNjZW5lIGZyb20gXCIuL3NjcmlwdC9wcmlIaXN0b3J5U2NlbmVcIlxuaW1wb3J0IHByaUhpc3RvcnkgZnJvbSBcIi4vdGVtcGxhdGUvcHJpSGlzdG9yeVwiXG5pbXBvcnQgUmVjb3JkIGZyb20gXCIuL3NjcmlwdC9SZWNvcmRcIlxuaW1wb3J0IGpvaW5SZWNvcmRzIGZyb20gXCIuL3RlbXBsYXRlL2pvaW5SZWNvcmRzXCJcbmltcG9ydCBwcmV2aW91c1JlY29yZHMgZnJvbSBcIi4vdGVtcGxhdGUvcHJldmlvdXNSZWNvcmRzXCJcbmltcG9ydCBzaG9ydExpc3RlZCBmcm9tIFwiLi9zY3JpcHQvc2hvcnRMaXN0ZWRcIlxuaW1wb3J0IHNob3J0TGlzdGVkTGlzdCBmcm9tIFwiLi90ZW1wbGF0ZS9zaG9ydExpc3RlZExpc3RcIlxuaW1wb3J0IHBzd0lucHV0IGZyb20gXCIuL3RlbXBsYXRlL3Bzd0lucHV0XCJcbmltcG9ydCByYW5raW5nTGlzdCBmcm9tIFwiLi90ZW1wbGF0ZS9yYW5raW5nTGlzdFwiXG5pbXBvcnQgcmVjaGFyZ2VEaWFsb2cgZnJvbSBcIi4vdGVtcGxhdGUvcmVjaGFyZ2VEaWFsb2dcIlxuaW1wb3J0IHJvY2tldERpYWxvZyBmcm9tIFwiLi92aWV3L3JvY2tldERpYWxvZ1wiXG5pbXBvcnQgdGlwRGlhbG9nIGZyb20gXCIuL3RlbXBsYXRlL3RpcERpYWxvZ1wiXG5pbXBvcnQgd2lubmluZ0xpc3QgZnJvbSBcIi4vdGVtcGxhdGUvd2lubmluZ0xpc3RcIlxuaW1wb3J0IHdpbm5pbmcgZnJvbSBcIi4vc2NyaXB0L3dpbm5pbmdcIlxuLypcbiog5ri45oiP5Yid5aeL5YyW6YWN572uO1xuKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEdhbWVDb25maWd7XG4gICAgc3RhdGljIHdpZHRoOm51bWJlcj03NTA7XG4gICAgc3RhdGljIGhlaWdodDpudW1iZXI9MTMzNDtcbiAgICBzdGF0aWMgc2NhbGVNb2RlOnN0cmluZz1cImZpeGVkd2lkdGhcIjtcbiAgICBzdGF0aWMgc2NyZWVuTW9kZTpzdHJpbmc9XCJub25lXCI7XG4gICAgc3RhdGljIGFsaWduVjpzdHJpbmc9XCJ0b3BcIjtcbiAgICBzdGF0aWMgYWxpZ25IOnN0cmluZz1cImxlZnRcIjtcbiAgICBzdGF0aWMgc3RhcnRTY2VuZTphbnk9XCJsb2FkaW5nU2NlbmUuc2NlbmVcIjtcbiAgICBzdGF0aWMgc2NlbmVSb290OnN0cmluZz1cIlwiO1xuICAgIHN0YXRpYyBkZWJ1Zzpib29sZWFuPWZhbHNlO1xuICAgIHN0YXRpYyBzdGF0OmJvb2xlYW49ZmFsc2U7XG4gICAgc3RhdGljIHBoeXNpY3NEZWJ1Zzpib29sZWFuPWZhbHNlO1xuICAgIHN0YXRpYyBleHBvcnRTY2VuZVRvSnNvbjpib29sZWFuPXRydWU7XG4gICAgY29uc3RydWN0b3IoKXt9XG4gICAgc3RhdGljIGluaXQoKXtcbiAgICAgICAgdmFyIHJlZzogRnVuY3Rpb24gPSBMYXlhLkNsYXNzVXRpbHMucmVnQ2xhc3M7XG4gICAgICAgIHJlZyhcInNjcmlwdC9Bc3Npc3RhbnQudHNcIixBc3Npc3RhbnQpO1xuICAgICAgICByZWcoXCJwdWJsaWNTY3JpcHQvUGFnZVNjcmlwdC50c1wiLFBhZ2VTY3JpcHQpO1xuICAgICAgICByZWcoXCJwdWJsaWNTY3JpcHQvU2NyZWVuLnRzXCIsU2NyZWVuKTtcbiAgICAgICAgcmVnKFwidGVtcGxhdGUvdHJlbmRMaXN0LnRzXCIsdHJlbmRMaXN0KTtcbiAgICAgICAgcmVnKFwic2NyaXB0L0NhcmQudHNcIixDYXJkKTtcbiAgICAgICAgcmVnKFwic2NyaXB0L2dyYW5kUHJpeC50c1wiLGdyYW5kUHJpeCk7XG4gICAgICAgIHJlZyhcInB1YmxpY1NjcmlwdC9QYWdlTmF2U2NyaXB0LnRzXCIsUGFnZU5hdlNjcmlwdCk7XG4gICAgICAgIHJlZyhcInRlbXBsYXRlL3ByaXhMaXN0LnRzXCIscHJpeExpc3QpO1xuICAgICAgICByZWcoXCJzY3JpcHQvR3Vlc3NpbmcudHNcIixHdWVzc2luZyk7XG4gICAgICAgIHJlZyhcInRlbXBsYXRlL251bWJlckxpc3REb21TY3JpcHQudHNcIixudW1iZXJMaXN0RG9tU2NyaXB0KTtcbiAgICAgICAgcmVnKFwic2NyaXB0L0hvbWUudHNcIixIb21lKTtcbiAgICAgICAgcmVnKFwic2NyaXB0L2xvYWRpbmdTY2VuZS50c1wiLGxvYWRpbmdTY2VuZSk7XG4gICAgICAgIHJlZyhcInNjcmlwdC9wcmlIaXN0b3J5U2NlbmUudHNcIixwcmlIaXN0b3J5U2NlbmUpO1xuICAgICAgICByZWcoXCJ0ZW1wbGF0ZS9wcmlIaXN0b3J5LnRzXCIscHJpSGlzdG9yeSk7XG4gICAgICAgIHJlZyhcInNjcmlwdC9SZWNvcmQudHNcIixSZWNvcmQpO1xuICAgICAgICByZWcoXCJ0ZW1wbGF0ZS9qb2luUmVjb3Jkcy50c1wiLGpvaW5SZWNvcmRzKTtcbiAgICAgICAgcmVnKFwidGVtcGxhdGUvcHJldmlvdXNSZWNvcmRzLnRzXCIscHJldmlvdXNSZWNvcmRzKTtcbiAgICAgICAgcmVnKFwic2NyaXB0L3Nob3J0TGlzdGVkLnRzXCIsc2hvcnRMaXN0ZWQpO1xuICAgICAgICByZWcoXCJ0ZW1wbGF0ZS9zaG9ydExpc3RlZExpc3QudHNcIixzaG9ydExpc3RlZExpc3QpO1xuICAgICAgICByZWcoXCJ0ZW1wbGF0ZS9wc3dJbnB1dC50c1wiLHBzd0lucHV0KTtcbiAgICAgICAgcmVnKFwidGVtcGxhdGUvcmFua2luZ0xpc3QudHNcIixyYW5raW5nTGlzdCk7XG4gICAgICAgIHJlZyhcInRlbXBsYXRlL3JlY2hhcmdlRGlhbG9nLnRzXCIscmVjaGFyZ2VEaWFsb2cpO1xuICAgICAgICByZWcoXCJ2aWV3L3JvY2tldERpYWxvZy50c1wiLHJvY2tldERpYWxvZyk7XG4gICAgICAgIHJlZyhcInRlbXBsYXRlL3RpcERpYWxvZy50c1wiLHRpcERpYWxvZyk7XG4gICAgICAgIHJlZyhcInRlbXBsYXRlL3dpbm5pbmdMaXN0LnRzXCIsd2lubmluZ0xpc3QpO1xuICAgICAgICByZWcoXCJzY3JpcHQvd2lubmluZy50c1wiLHdpbm5pbmcpO1xuICAgIH1cbn1cbkdhbWVDb25maWcuaW5pdCgpOyIsImltcG9ydCBHYW1lQ29uZmlnIGZyb20gXCIuL0dhbWVDb25maWdcIjtcbmltcG9ydCBSb2NrZXREaWFsb2cgZnJvbSBcIi4vdmlldy9yb2NrZXREaWFsb2dcIjtcbmltcG9ydCB7IGxvYWRpbmdSZXNMaXN0ICwgbG9hZGluZ1Jlc0xpc3QxIH0gZnJvbSAnLi9sb2FkaW5nUmVzTGlzdCdcbmltcG9ydCB7IFNvY2tldCB9IGZyb20gXCIuL2pzL3NvY2tldFwiO1xuaW1wb3J0IExvYWRpbmdTY2VuZSBmcm9tIFwiLi9zY3JpcHQvbG9hZGluZ1NjZW5lXCI7XG5cbmNsYXNzIE1haW4ge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHTCoC8vIOWcqOW+ruS/oeS4re+8jOWmguaenOi3s+i9rOWIsOa4uOaIj+S5i+WJjemhtemdouS/ruaUueS6hmlubmVyV2R0aOWSjGlubmVySGVpZ2h077yM5Lya5a+86Ie05a696auY6K6h566X6ZSZ6K+vXG7CoMKgwqDCoMKgwqDCoMKgY29uc3Qgd2luOiBhbnkgPSB3aW5kb3c7XG7CoMKgwqDCoMKgwqDCoMKgd2luLmlubmVyV2lkdGggPSB3aW4ub3V0ZXJXaWR0aDtcbsKgwqDCoMKgwqDCoMKgwqB3aW4uaW5uZXJIZWlnaHQgPSB3aW4ub3V0ZXJIZWlnaHQ7XG5cdFx0Ly/moLnmja5JREXorr7nva7liJ3lp4vljJblvJXmk45cdFx0XG5cdFx0aWYgKHdpbmRvd1tcIkxheWEzRFwiXSkgTGF5YTNELmluaXQoR2FtZUNvbmZpZy53aWR0aCwgR2FtZUNvbmZpZy5oZWlnaHQpO1xuXHRcdGVsc2UgTGF5YS5pbml0KEdhbWVDb25maWcud2lkdGgsIEdhbWVDb25maWcuaGVpZ2h0LCBMYXlhW1wiV2ViR0xcIl0pO1xuXHRcdExheWFbXCJQaHlzaWNzXCJdICYmIExheWFbXCJQaHlzaWNzXCJdLmVuYWJsZSgpO1xuXHRcdExheWFbXCJEZWJ1Z1BhbmVsXCJdICYmIExheWFbXCJEZWJ1Z1BhbmVsXCJdLmVuYWJsZSgpO1xuXHRcdExheWEuc3RhZ2Uuc2NhbGVNb2RlID0gR2FtZUNvbmZpZy5zY2FsZU1vZGU7XG5cdFx0TGF5YS5zdGFnZS5zY3JlZW5Nb2RlID0gR2FtZUNvbmZpZy5zY3JlZW5Nb2RlO1xuXHRcdExheWEuc3RhZ2UuYmdDb2xvciA9ICcjNDk1NWRkJztcblx0XHQvL+WFvOWuueW+ruS/oeS4jeaUr+aMgeWKoOi9vXNjZW5l5ZCO57yA5Zy65pmvXG5cdFx0TGF5YS5VUkwuZXhwb3J0U2NlbmVUb0pzb24gPSBHYW1lQ29uZmlnLmV4cG9ydFNjZW5lVG9Kc29uO1xuXG5cdFx0Ly/miZPlvIDosIPor5XpnaLmnb/vvIjpgJrov4dJREXorr7nva7osIPor5XmqKHlvI/vvIzmiJbogIV1cmzlnLDlnYDlop7liqBkZWJ1Zz10cnVl5Y+C5pWw77yM5Z2H5Y+v5omT5byA6LCD6K+V6Z2i5p2/77yJXG5cdFx0aWYgKEdhbWVDb25maWcuZGVidWcgfHwgTGF5YS5VdGlscy5nZXRRdWVyeVN0cmluZyhcImRlYnVnXCIpID09IFwidHJ1ZVwiKSBMYXlhLmVuYWJsZURlYnVnUGFuZWwoKTtcblx0XHRpZiAoR2FtZUNvbmZpZy5waHlzaWNzRGVidWcgJiYgTGF5YVtcIlBoeXNpY3NEZWJ1Z0RyYXdcIl0pIExheWFbXCJQaHlzaWNzRGVidWdEcmF3XCJdLmVuYWJsZSgpO1xuXHRcdGlmIChHYW1lQ29uZmlnLnN0YXQpIExheWEuU3RhdC5zaG93KCk7XG5cdFx0TGF5YS5hbGVydEdsb2JhbEVycm9yID0gdHJ1ZTtcblxuXHRcdC8v6Ieq5a6a5LmJ5LqL5Lu2XG5cdFx0Um9ja2V0RGlhbG9nLmluaXQoKTsgLy/ngavnrq3lvIDlpZbmlYjmnpxcblxuXHRcdC8v5r+A5rS76LWE5rqQ54mI5pys5o6n5Yi277yMdmVyc2lvbi5qc29u55SxSURF5Y+R5biD5Yqf6IO96Ieq5Yqo55Sf5oiQ77yM5aaC5p6c5rKh5pyJ5Lmf5LiN5b2x5ZON5ZCO57ut5rWB56iLXG5cdFx0TGF5YS5SZXNvdXJjZVZlcnNpb24uZW5hYmxlKFwidmVyc2lvbi5qc29uXCIsIExheWEuSGFuZGxlci5jcmVhdGUodGhpcywgdGhpcy5vblZlcnNpb25Mb2FkZWQpLCBMYXlhLlJlc291cmNlVmVyc2lvbi5GSUxFTkFNRV9WRVJTSU9OKTtcblx0fVxuXG5cdG9uVmVyc2lvbkxvYWRlZCgpOiB2b2lkIHtcblx0XHQvL+a/gOa0u+Wkp+Wwj+WbvuaYoOWwhO+8jOWKoOi9veWwj+WbvueahOaXtuWAme+8jOWmguaenOWPkeeOsOWwj+WbvuWcqOWkp+WbvuWQiOmbhumHjOmdou+8jOWImeS8mOWFiOWKoOi9veWkp+WbvuWQiOmbhu+8jOiAjOS4jeaYr+Wwj+WbvlxuXHRcdExheWEuQXRsYXNJbmZvTWFuYWdlci5lbmFibGUoXCJmaWxlY29uZmlnLmpzb25cIiwgTGF5YS5IYW5kbGVyLmNyZWF0ZSh0aGlzLCB0aGlzLm9uQ29uZmlnTG9hZGVkKSk7XG5cdH1cblxuXHRvbkNvbmZpZ0xvYWRlZCgpOiB2b2lkIHtcblx0XHQvLyDov57mjqV3ZWJzb2NrZXRcblx0XHRTb2NrZXQuY3JlYXRlU29ja2V0KClcblx0XHRMYXlhLlNjZW5lLm9wZW4oR2FtZUNvbmZpZy5zdGFydFNjZW5lLHRydWUsbnVsbCxMYXlhLkhhbmRsZXIuY3JlYXRlKHRoaXMsdGhpcy5vbkxvYWRpbmdTY2VuZU9wZW5lZCkpXG5cdH1cblx0b25Mb2FkaW5nU2NlbmVPcGVuZWQobG9hZGluZ1NjZW5lOkxvYWRpbmdTY2VuZSk6IHZvaWQge1xuXHRcdC8v6aKE5Yqg6L29XG7CoMKgwqDCoMKgwqDCoMKgTGF5YS5sb2FkZXIubG9hZChsb2FkaW5nUmVzTGlzdCwgXG5cdFx0XHRMYXlhLkhhbmRsZXIuY3JlYXRlKHRoaXMsIHRoaXMub25HYW1lUmVzTG9hZGVkKSxcblx0XHRcdExheWEuSGFuZGxlci5jcmVhdGUodGhpcyx0aGlzLm9uR2FtZVJlc0xvYWRQcm9ncmVzcyxbbG9hZGluZ1NjZW5lXSxmYWxzZSkpO1xuXHR9XG5cblx0b25HYW1lUmVzTG9hZFByb2dyZXNzKGxvYWRpbmdTY2VuZTpMb2FkaW5nU2NlbmUscHJvZ3Jlc3M6bnVtYmVyKXtcblx0XHRjb25zb2xlLmxvZyhsb2FkaW5nU2NlbmUpO1xuXHRcdFxuXHRcdGxvYWRpbmdTY2VuZS5zZXRQcm9ncmVzcyhwcm9ncmVzcylcblx0fVxuXG5cdG9uR2FtZVJlc0xvYWRlZCgpOnZvaWQge1xuXHRcdC8v5Yqg6L29SURF5oyH5a6a55qE5Zy65pmvXG5cdFx0TGF5YS5TY2VuZS5vcGVuKCdob21lLnNjZW5lJyx0cnVlLG51bGwsTGF5YS5IYW5kbGVyLmNyZWF0ZSh0aGlzLCgoKT0+e1xuXHRcdFx0TGF5YS5sb2FkZXIubG9hZChsb2FkaW5nUmVzTGlzdDEpO1xuXHRcdH0pKSk7XG5cdH1cbn1cbi8v5r+A5rS75ZCv5Yqo57G7XG5uZXcgTWFpbigpO1xuIiwiLyoqXG4gKiBAYXV0aG9yIFtTaXdlbl1cbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTIwIDE0OjExOjI2XG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yMCAxNDoxMToyNlxuICogQGRlc2Mg5pWw5o2u6YCa5L+h5Y+K5L+d5a2Y5o6l5Y+jXG4gKi9cblxuZXhwb3J0IGNsYXNzIEdhbWVNb2RlbCBleHRlbmRzIExheWEuRXZlbnREaXNwYXRjaGVyIHtcbiAgICBwcml2YXRlIHN0YXRpYyBfZ2FtZU1vZGVsSW5zdGFuY2U6IEdhbWVNb2RlbDtcblxuICAgIHN0YXRpYyBnZXRJbnN0YW5jZSgpOiBHYW1lTW9kZWwge1xuICAgICAgICBpZiAoIXRoaXMuX2dhbWVNb2RlbEluc3RhbmNlKSB7XG4gICAgICAgICAgICB0aGlzLl9nYW1lTW9kZWxJbnN0YW5jZSA9IG5ldyBHYW1lTW9kZWwoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fZ2FtZU1vZGVsSW5zdGFuY2U7XG4gICAgfVxuXG4gICAgLyoq5L+d5a2Y55So5oi35L+h5oGvICovXG4gICAgdXNlckluZm86b2JqZWN0ID0ge307IC8v55So5oi35L+h5oGvXG4gICAgc2V0VXNlckluZm8odXNlckluZm86b2JqZWN0KXtcbiAgICAgICAgdGhpcy51c2VySW5mbyA9IHVzZXJJbmZvO1xuICAgICAgICB0aGlzLmV2ZW50KCdnZXRVc2VySW5mbycsdGhpcy51c2VySW5mbylcbiAgICB9XG5cbiAgICAvKirkv53lrZjooqvotK3kubDlj7fnoIEgKi9cbiAgICBidXlHb29kc0FycjphbnkgPSBbXTsgLy/ooqvotK3kubDlj7fnoIFcbiAgICBzZXRHb29kc0Fycihnb29kc0FycjphbnkpIHtcbiAgICAgICAgdGhpcy5idXlHb29kc0FyciA9IGdvb2RzQXJyO1xuICAgICAgICB0aGlzLmV2ZW50KCdnZXRidXlHb29kc0FycicsW3RoaXMuYnV5R29vZHNBcnJdKVxuICAgIH1cblxuICAgIC8qKuS/neWtmOeBq+eureaVsOaNriAqL1xuICAgIHJvY2tldERhdGE6T2JqZWN0ID0ge307XG4gICAgc2V0Um9ja2V0RGF0YShkYXRhOm9iamVjdCl7XG4gICAgICAgIHRoaXMucm9ja2V0RGF0YSA9IGRhdGE7XG4gICAgICAgIHRoaXMuZXZlbnQoJ2dldFJvY2tldERhdGEnLHRoaXMucm9ja2V0RGF0YSlcbiAgICB9XG5cbiAgICAvKirmmK/lkKblvIDlpZbkuoYgKi9cbiAgICBpc1RvZ2dsZShzdGF0dXM6Ym9vbGVhbil7XG4gICAgICAgIHRoaXMuZXZlbnQoJ2lzVG9nZ2xlJyxzdGF0dXMpXG4gICAgfVxuXG4gICAgLyoq6YCa55+l5Lit5aWWICovXG4gICAgbm90aWNlRnVuYyhzdGF0dXM6Ym9vbGVhbil7XG4gICAgICAgIHRoaXMuZXZlbnQoJ2dldE5vdGljZScsc3RhdHVzKVxuICAgIH1cbiAgICBcbiAgICAvKirngavnrq3lpKflpZbmjpLooYzlkI3ljZUgKi9cbiAgICByb2NrZXRSYW5raW5nOm9iamVjdFtdID0gW107XG4gICAgc2V0Um9ja2V0UmFua2luZyhkYXRhOm9iamVjdFtdKXtcbiAgICAgICAgdGhpcy5yb2NrZXRSYW5raW5nID0gZGF0YTtcbiAgICAgICAgdGhpcy5ldmVudCgnZ2V0Um9ja2V0UmFua2luZycsW3RoaXMucm9ja2V0UmFua2luZ10pXG4gICAgfVxufSIsIi8qKlxuICogQGF1dGhvciBbU2l3ZW5dXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0yMCAxNToxNTowOFxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjAgMTU6MTU6MDhcbiAqIEBkZXNjIGFwaeaOpeWPo+e7n+S4gOWwgeijheWkhOeQhlxuICovXG5cbmltcG9ydCB7IGdldCwgcG9zdCB9IGZyb20gJy4vaHR0cCc7XG5pbXBvcnQgeyBHYW1lTW9kZWwgfSBmcm9tICcuL0dhbWVNb2RlbCc7XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgICAvKirojrflj5bnlKjmiLfkv6Hmga8gKi9cbiAgICBnZXRVc2VySW5mbygpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGdldCgnL3VzZXIvZ2V0SW5mbycsIHt9KS50aGVuKChyZXM6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghcmVzLmNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8g5L+d5a2Y55So5oi35L+h5oGvXG4gICAgICAgICAgICAgICAgICAgIEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLnNldFVzZXJJbmZvKHJlcy51c2VySW5mbylcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXMpXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgR2FtZU1vZGVsLmdldEluc3RhbmNlKCkuc2V0VXNlckluZm8oe30pXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXMpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9LFxuXG4gICAgLyoq6I635Y+W5LuK5pel5aSn5aWW5rGgICovXG4gICAgZ2V0UmFua1RvZGF5KCkge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgZ2V0KCcvcmFuay90b2RheScsIHt9KS50aGVuKChyZXM6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghcmVzLmNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXMpXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlcylcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH0sXG4gICAgLyoq6I635Y+W5aSn5aWW5rGg5Y6G5Y+y6K6w5b2VXG4gICAgICogQHBhcmFtIGNvdW50VGltZSBb6YCJ5aGrXSDml6XmnJ9cbiAgICAgKi9cbiAgICBnZXRSYW5rSGlzdG9yeShjb3VudFRpbWU/OnN0cmluZyl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBnZXQoJy9yYW5rL2hpc3RvcnknLCB7Y291bnRUaW1lfSkudGhlbigocmVzOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXJlcy5jb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXMpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9LFxuICAgIC8qKuiOt+WPlummlumhteWVhuWTgeWIl+ihqCAqL1xuICAgIGdldEdvb2RzTGlzdCgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGdldCgnL2dvb2RzL2luZGV4Jywge30pLnRoZW4oKHJlczogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlcylcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfSxcblxuICAgIC8qKuiOt+WPluWVhuWTgeivpuaDhVxuICAgICAqIEBwYXJhbSBnb29kc0lkIOWVhuWTgWlkXG4gICAgICovXG4gICAgZ2V0R29vZHNEZXRhaWxzKGdvb2RzSWQ6c3RyaW5nKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgZ2V0KCcvZ29vZHMvZ2V0JywgeyBnb29kc0lkIH0pLnRoZW4oKHJlczogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlcylcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfSxcblxuICAgIC8qKuiOt+WPluWPguS4juiusOW9lVxuICAgICAqIEBwYXJhbSBwYWdlIFvpgInloatdIOmhteeggTFcbiAgICAgKiBAcGFyYW0gcGFnZVNpemUgIFvpgInloatdIOWIhumhteaVsCDpu5jorqQyMFxuICAgICAqL1xuICAgIGdldE15T3JkZXJzKHBhZ2U6bnVtYmVyID0gMSxwYWdlU2l6ZTpudW1iZXIgPSAyMCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpID0+IHtcbiAgICAgICAgICAgIGdldCgnL29yZGVyL215T3JkZXJzJyx7cGFnZSxwYWdlU2l6ZX0pLnRoZW4oKHJlczphbnkpPT57XG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlcylcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfSxcbiAgICBcbiAgICAvKirojrflj5blvoDmnJ/orrDlvZVcbiAgICAgKiBAcGFyYW0gcGFnZSBb6YCJ5aGrXSDpobXnoIExXG4gICAgICogQHBhcmFtIHBhZ2VTaXplICBb6YCJ5aGrXSDliIbpobXmlbAg6buY6K6kMjBcbiAgICAgKiBAcGFyYW0gY291bnRUaW1lIFvpgInloatdIOafpeivouaXtumXtFxuICAgICAqIEBwYXJhbSBzZWFyY2hLZXkgW+mAieWhq10g5p+l6K+i5pyf5Y+3XG4gICAgICovXG4gICAgZ2V0R29vZHNIaXN0b3J5KHBhZ2U6bnVtYmVyID0gMSxwYWdlU2l6ZTpudW1iZXIgPSAyMCxjb3VudFRpbWU/OnN0cmluZyxzZWFyY2hLZXk/OnN0cmluZyl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpID0+IHtcbiAgICAgICAgICAgIGdldCgnL2dvb2RzL2hpc3RvcnknLHtwYWdlLHBhZ2VTaXplLGNvdW50VGltZSxzZWFyY2hLZXl9KS50aGVuKChyZXM6YW55KT0+e1xuICAgICAgICAgICAgICAgIGlmICghcmVzLmNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXMpXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlcylcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH0sXG5cbiAgICAvKirojrflj5bllYblk4HnsbvlnosgKi9cbiAgICBnZXRHb29kc0NhdGVMaXN0KCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBnZXQoJy9nb29kcy9jYXRlTGlzdCcse30pLnRoZW4oKHJlczphbnkpPT57XG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlcylcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfSxcblxuICAgIC8qKuiOt+WPlui1sOWKv1xuICAgICAqIEBwYXJhbSBnb29kc1R5cGUg5ZWG5ZOB57G75Z6LXG4gICAgICogQHBhcmFtIHBhZ2UgW+mAieWhq10g6aG156CBMVxuICAgICAqIEBwYXJhbSBwYWdlU2l6ZSBb6YCJ5aGrXSDliIbpobXmlbAg6buY6K6kMjBcbiAgICAgKi9cbiAgICBnZXRHb29kc1RyZW5kKGdvb2RzVHlwZTpzdHJpbmcscGFnZTpudW1iZXIgPSAxLHBhZ2VTaXplOm51bWJlciA9IDIwKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIGdldCgnL2dvb2RzL3RyZW5kJyx7Z29vZHNUeXBlLHBhZ2UscGFnZVNpemV9KS50aGVuKChyZXM6YW55KT0+e1xuICAgICAgICAgICAgICAgIGlmICghcmVzLmNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXMpXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlcylcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH0sXG5cbiAgICAvKirojrflj5bllpzku47lpKnpmY3kuK3lpZblkI3ljZVcbiAgICAgKiBAcGFyYW0gcGFnZSBb6YCJ5aGrXSDpobXnoIExXG4gICAgICogQHBhcmFtIHBhZ2VTaXplICBb6YCJ5aGrXSDliIbpobXmlbAg6buY6K6kMjBcbiAgICAgKi9cbiAgICBnZXRYY3RqTGlzdChwYWdlOm51bWJlciA9IDEscGFnZVNpemU6bnVtYmVyID0gMjApe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBnZXQoJy9YY3RqL2JvbnVzTGlzdHMnLHtwYWdlLHBhZ2VTaXplfSkudGhlbigocmVzOmFueSk9PntcbiAgICAgICAgICAgICAgICBpZiAoIXJlcy5jb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXMpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9LFxuICAgIFxuICAgIC8qKuiOt+WPluWFpeWbtOWQjeWNlVxuICAgICAqIEBwYXJhbSBwYWdlIFvpgInloatdIOmhteeggTFcbiAgICAgKiBAcGFyYW0gcGFnZVNpemUgIFvpgInloatdIOWIhumhteaVsCDpu5jorqQyMFxuICAgICAqIEBwYXJhbSBkYXRlIFvpgInloatdIOaXtumXtFxuICAgICAqL1xuICAgIGdldFNob3J0TGlzdGVkKHBhZ2U6bnVtYmVyID0gMSxwYWdlU2l6ZTpudW1iZXIgPSAyMCxkYXRlPzpzdHJpbmcpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBnZXQoJy9YY3RqL3Nob3J0TGlzdGVkJyx7cGFnZSxwYWdlU2l6ZSxkYXRlfSkudGhlbigocmVzOmFueSk9PntcbiAgICAgICAgICAgICAgICBpZiAoIXJlcy5jb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXMpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9LFxuXG4gICAgLyoq6LSt5LmwXG4gICAgICogQHBhcmFtIHBlcmlvZCDmnJ/lj7dcbiAgICAgKiBAcGFyYW0gY29kZUxpc3Qg5omA6YCJ5Y+356CBXG4gICAgICogQHBhcmFtIGV4Y2hhbmdlUHdkIOS6pOaYk+WvhueggVxuICAgICAqL1xuICAgIHBvc3RUcmFkZUJ1eShwZXJpb2Q6c3RyaW5nLGNvZGVMaXN0OnN0cmluZyxleGNoYW5nZVB3ZDpzdHJpbmcpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBwb3N0KCcvdHJhZGUvYnV5JywgeyBwZXJpb2QsY29kZUxpc3QsZXhjaGFuZ2VQd2QgfSkudGhlbigocmVzOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXJlcy5jb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ2V0VXNlckluZm8oKVxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlcylcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfSxcbn0iLCIvKipcbiAqIEBhdXRob3IgW1Npd2VuXVxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDU6MDZcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ1OjA2XG4gKiBAZGVzYyBheGlvc+e9kee7nOivt+axguWwgeijhVxuICovXG5pbXBvcnQgYXhpb3MgZnJvbSBcImF4aW9zXCI7XG5cbmF4aW9zLmRlZmF1bHRzLnRpbWVvdXQgPSAxMDAwMDtcbmF4aW9zLmRlZmF1bHRzLmhlYWRlcnMucG9zdFsnQ29udGVudC1UeXBlJ10gPSAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJztcbmF4aW9zLmRlZmF1bHRzLndpdGhDcmVkZW50aWFscyA9IHRydWU7ICAvL+ivt+axguaQuuW4pmNvb2tpZVxuLy8gYXhpb3MuZGVmYXVsdHMuY3Jvc3NEb21haW4gPSB0cnVlOyAgLy/or7fmsYLmkLrluKbpop3lpJbmlbDmja4o5LiN5YyF5ZCrY29va2llKVxuXG5jb25zdCBkb21haW4gPSBkb2N1bWVudC5kb21haW47XG5pZiAoZG9tYWluLmluZGV4T2YoJ3QtY2VudGVyJykgPj0gMCB8fCBkb21haW4gPT09ICdsb2NhbGhvc3QnKSB7XG4gIGF4aW9zLmRlZmF1bHRzLmJhc2VVUkwgPSAnaHR0cHM6Ly90LWFwaS54eWhqLmlvL3YxL3cvemgvJ1xuICAvLyBheGlvcy5kZWZhdWx0cy5iYXNlVVJMID0gJ2h0dHBzOi8vZ2FtZS54eWhqLmlvL3YxL3cvemgnXG59IGVsc2Uge1xuICBheGlvcy5kZWZhdWx0cy5iYXNlVVJMID0gJ2h0dHBzOi8vZ2FtZS54eWhqLmlvL3YxL3cvemgnXG59XG5cbi8qKuWwhnBvc3TmlbDmja7ovazkuLpmb3JtRGF0YeagvOW8jyAqL1xuZnVuY3Rpb24gZm9ybURhdGFGdW5jKHBhcmFtczpPYmplY3QpIHtcbiAgY29uc3QgZm9ybSA9IG5ldyBGb3JtRGF0YSgpO1xuICBmb3IgKGNvbnN0IGtleSBpbiBwYXJhbXMpIHtcbiAgICBmb3JtLmFwcGVuZChrZXkscGFyYW1zW2tleV0pO1xuICB9XG4gIHJldHVybiBmb3JtXG59XG5cbi8qKua4uOaIj+W5s+WPsOaOpeWPoyAqL1xuY29uc3QgZ2FtZUNlbnRlciA9IFsnL3VzZXIvbG9naW4nLCcvdXNlci9nZXRJbmZvJ11cblxuLy9odHRwIHJlcXVlc3Qg5oum5oiq5ZmoXG5heGlvcy5pbnRlcmNlcHRvcnMucmVxdWVzdC51c2UoXG4gIGNvbmZpZyA9PiB7XG4gICAgLy/orr7nva5BSG9zdFxuICAgIGlmIChjb25maWcudXJsLmluZGV4T2YoJy91c2VyLycpID49IDAgKSB7XG4gICAgICBjb25maWcuaGVhZGVyc1snQUhvc3QnXSA9ICdnYW1lQ2VudGVyJ1xuICAgIH1lbHNle1xuICAgICAgY29uZmlnLmhlYWRlcnNbJ0FIb3N0J10gPSAnc3RhclJvY2tldCc7XG4gICAgfVxuXG4gICAgaWYgKGNvbmZpZy5tZXRob2QgPT0gJ3Bvc3QnKSB7XG4gICAgICBjb25maWcuZGF0YSA9IGZvcm1EYXRhRnVuYyh7XG4gICAgICAgIC4uLmNvbmZpZy5kYXRhXG4gICAgICB9KVxuICAgIH1lbHNlIGlmKGNvbmZpZy5tZXRob2QgPT0gJ2dldCcpe1xuICAgICAgY29uZmlnLnBhcmFtcyA9IHtcbiAgICAgICAgLi4uY29uZmlnLnBhcmFtcyxcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNvbmZpZztcbiAgfSxcbiAgZXJyb3IgPT4ge1xuICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlcnJvcik7XG4gIH1cbik7XG4vL2h0dHAgcmVzcG9uc2Ug5oum5oiq5ZmoXG5heGlvcy5pbnRlcmNlcHRvcnMucmVzcG9uc2UudXNlKFxuICByZXNwb25zZSA9PiB7XG4gICAgaWYgKCFyZXNwb25zZS5kYXRhLnN1Y2Nlc3MpIHtcbiAgICAgIC8v6ZSZ6K+v5aSE55CGXG4gICAgfVxuICAgIHJldHVybiByZXNwb25zZTtcbiAgfSxcbiAgZXJyb3IgPT4ge1xuICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlcnJvcik7XG4gIH1cbik7XG5cbi8qKlxuICog5bCB6KOFZ2V05pa55rOVXG4gKiBAcGFyYW0gdXJsXG4gKiBAcGFyYW0gZGF0YVxuICogQHJldHVybnMge1Byb21pc2V9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXQodXJsOnN0cmluZywgcGFyYW1zOk9iamVjdCkge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGF4aW9zLmdldCh1cmwsIHsgcGFyYW1zIH0pLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgaWYgKCFyZXNwb25zZS5kYXRhLnN1Y2Nlc3MpIHtcbiAgICAgICAgcmVzb2x2ZShyZXNwb25zZS5kYXRhLmVycm9yKTtcbiAgICAgIH1lbHNlIHtcbiAgICAgICAgcmVzb2x2ZShyZXNwb25zZS5kYXRhLnBheWxvYWQpO1xuICAgICAgfVxuICAgIH0pLmNhdGNoKGVyciA9PiB7XG4gICAgICByZWplY3QoZXJyKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbi8qKlxuICog5bCB6KOFcG9zdOivt+axglxuICogQHBhcmFtIHVybFxuICogQHBhcmFtIGRhdGFcbiAqIEByZXR1cm5zIHtQcm9taXNlfVxuICovXG5cbmV4cG9ydCBmdW5jdGlvbiBwb3N0KHVybDpzdHJpbmcsIGRhdGE6T2JqZWN0KSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgYXhpb3MucG9zdCh1cmwsIGRhdGEpLnRoZW4oXG4gICAgICByZXNwb25zZSA9PiB7XG4gICAgICAgIGlmICghcmVzcG9uc2UuZGF0YS5zdWNjZXNzKSB7XG4gICAgICAgICAgcmVzb2x2ZShyZXNwb25zZS5kYXRhLmVycm9yKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXNvbHZlKHJlc3BvbnNlLmRhdGEucGF5bG9hZCk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBlcnIgPT4ge1xuICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgIH1cbiAgICApO1xuICB9KTtcbn1cbiIsIi8qKlxuICogQGF1dGhvciBbU2l3ZW5dXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMy0xNSAxNDo1MjozNFxuICogQG1vZGlmeSBkYXRlIDIwMTktMDMtMTUgMTQ6NTI6MzRcbiAqIEBkZXNjIGxheWHlhazlhbHlt6Xlhbfmlrnms5VcbiAqL1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gICAgZ2V0U2NyZWVuKCl7XG4gICAgICAgIGNvbnN0IHNjZW5lQ29udGFpbmVyOiBMYXlhLlNwcml0ZSA9IExheWEuU2NlbmUucm9vdCBhcyBMYXlhLlNwcml0ZTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzY2VuZUNvbnRhaW5lci5udW1DaGlsZHJlbjsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBjaGlsZCA9IHNjZW5lQ29udGFpbmVyLmdldENoaWxkQXQoaSk7XG4gICAgICAgICAgICBpZiAoY2hpbGQgaW5zdGFuY2VvZiBMYXlhLlNjZW5lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNoaWxkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbn0iLCJpbXBvcnQgeyBHYW1lTW9kZWwgfSBmcm9tIFwiLi9HYW1lTW9kZWxcIjtcbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xuXG5cbi8qKlxuICogQGF1dGhvciBbU2l3ZW5dXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0yMSAxMTo0NjoxNVxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjEgMTE6NDY6MTVcbiAqIEBkZXNjIHdlYnNvY2tldOi/nuaOpVxuICovXG5cbi8ve1wiYXBwSWRcIjpcImx1Y2t5cm9ja2V0XCIsXCJldmVudFwiOlt7XCJ0b2dnbGVcIjowLFwidHlwZVwiOlwidHlwZV92YWx1ZVwiLFwiZXhwaXJlVGltZVwiOjB9XX1cblxuZXhwb3J0IGNsYXNzIFNvY2tldCBleHRlbmRzIExheWEuVUlDb21wb25lbnQge1xuICAgIFxuICAgIHN0YXRpYyBXU19VUkw6IHN0cmluZyA9IGB3c3M6Ly90LXdzcy54eWhqLmlvL3dzP2FwcGlkPWx1Y2t5cm9ja2V0QXBwYFxuICAgIHN0YXRpYyBXUzogYW55ID0gJyc7XG4gICAgLyoqMzDnp5LkuIDmrKHlv4Pot7MgKi9cbiAgICBzdGF0aWMgc2V0SW50ZXJ2YWxXZXNvY2tldFB1c2g6YW55ID0gbnVsbDsgXG5cbiAgICAvKirlu7rnq4vov57mjqUgKi9cbiAgICBzdGF0aWMgY3JlYXRlU29ja2V0KCkge1xuICAgICAgICBjb25zdCB1c2VySW5mbzphbnkgPSBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS51c2VySW5mbztcbiAgICAgICAgaWYgKHVzZXJJbmZvLnVzZXJJZCkge1xuICAgICAgICAgICAgU29ja2V0LldTX1VSTCA9IFNvY2tldC5XU19VUkwgKyBgJnVpZD0ke3VzZXJJbmZvLnVzZXJJZH1gXG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFTb2NrZXQuV1MpIHtcbiAgICAgICAgICAgIC8vIFNvY2tldC5XUy5jbG9zZSgpXG4gICAgICAgICAgICBTb2NrZXQuV1MgPSBuZXcgV2ViU29ja2V0KFNvY2tldC5XU19VUkwpXG4gICAgICAgICAgICBTb2NrZXQuV1Mub25vcGVuID0gU29ja2V0Lm9ub3BlbldTO1xuICAgICAgICAgICAgU29ja2V0LldTLm9ubWVzc2FnZSA9IFNvY2tldC5vbm1lc3NhZ2VXUztcbiAgICAgICAgICAgIFNvY2tldC5XUy5vbmVycm9yID0gU29ja2V0Lm9uZXJyb3JXUztcbiAgICAgICAgICAgIFNvY2tldC5XUy5vbmNsb3NlID0gU29ja2V0Lm9uY2xvc2VXUztcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKirmiZPlvIBXU+S5i+WQjuWPkemAgeW/g+i3syAqL1xuICAgIHN0YXRpYyBvbm9wZW5XUygpIHtcbiAgICAgICAgU29ja2V0LnNlbmRQaW5nKCk7IC8v5Y+R6YCB5b+D6LezXG4gICAgfVxuICAgIC8qKui/nuaOpeWksei0pemHjei/niAqL1xuICAgIHN0YXRpYyBvbmVycm9yV1MoKSB7XG4gICAgICAgIFNvY2tldC5XUy5jbG9zZSgpO1xuICAgICAgICBTb2NrZXQuY3JlYXRlU29ja2V0KCk7IC8v6YeN6L+eXG4gICAgfVxuICAgIC8qKldT5pWw5o2u5o6l5pS257uf5LiA5aSE55CGICovXG4gICAgc3RhdGljIG9ubWVzc2FnZVdTKGU6IGFueSkge1xuICAgICAgICBsZXQgcmVkYXRhOmFueTtcbiAgICAgICAgbGV0IHBheWxvYWQ6YW55O1xuICAgICAgICBpZiAoZS5kYXRhID09PSAnb2snIHx8IGUuZGF0YSA9PT0gJ3BvbmcnKSB7XG4gICAgICAgICAgICByZWRhdGEgPSBlLmRhdGE7IC8vIOaVsOaNrlxuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgIHJlZGF0YSA9IEpTT04ucGFyc2UoZS5kYXRhKTsgLy8g5pWw5o2uXG4gICAgICAgICAgICBwYXlsb2FkID0gcmVkYXRhLnBheWxvYWQ7XG4gICAgICAgICAgICAvLyDkuIvlj5HotK3kubDlj7fnoIFcbiAgICAgICAgICAgIGlmIChwYXlsb2FkLnR5cGUgPT09ICdwdXJjaGFzZWQnKSB7XG4gICAgICAgICAgICAgICAgR2FtZU1vZGVsLmdldEluc3RhbmNlKCkuc2V0R29vZHNBcnIocGF5bG9hZC5nb29kcylcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIOS4i+WPkemmlumhteaVsOaNrlxuICAgICAgICAgICAgaWYgKHBheWxvYWQudHlwZSA9PT0gJ2luZGV4Jykge1xuICAgICAgICAgICAgICAgIC8vIOWIt+aWsOeBq+eureaVsOaNrlxuICAgICAgICAgICAgICAgIEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLnNldFJvY2tldERhdGEocGF5bG9hZC5yYW5raW5nKVxuICAgICAgICAgICAgICAgIC8vIOaYr+WQpuW8gOWlluS6hlxuICAgICAgICAgICAgICAgIGlmIChwYXlsb2FkLnRvZ2dsZSkge1xuICAgICAgICAgICAgICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5pc1RvZ2dsZSh0cnVlKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIOS4i+WPkeS4reWlluWQjeWNlVxuICAgICAgICAgICAgaWYgKHBheWxvYWQudHlwZSA9PT0gJ3dpbm5pbmcnKSB7XG4gICAgICAgICAgICAgICAgR2FtZU1vZGVsLmdldEluc3RhbmNlKCkubm90aWNlRnVuYyh0cnVlKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8g5LiL5Y+R54Gr566t5aSn5aWW5o6S6KGM5ZCN5Y2VXG4gICAgICAgICAgICBpZiAocGF5bG9hZC50eXBlID09PSAncmFua2luZycpIHtcbiAgICAgICAgICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5zZXRSb2NrZXRSYW5raW5nKHBheWxvYWQudXNlckluZm8pXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoq5Y+R6YCB5pWw5o2uICovXG4gICAgc3RhdGljIHNlbmRXU1B1c2godHlwZT86IGFueSx0b2dnbGU6YW55ID0gMSkge1xuICAgICAgICBsZXQgb2JqID0ge1xuICAgICAgICAgICAgXCJhcHBJZFwiOiBcImx1Y2t5cm9ja2V0QXBwXCIsIFxuICAgICAgICAgICAgXCJldmVudFwiOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcInR5cGVcIjogdHlwZSwgXG4gICAgICAgICAgICAgICAgICAgIFwidG9nZ2xlXCI6IHRvZ2dsZSwgXG4gICAgICAgICAgICAgICAgICAgIFwiZXhwaXJlVGltZVwiOiAxODAwXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICAgIGlmIChTb2NrZXQuV1MgIT09IG51bGwgJiYgU29ja2V0LldTLnJlYWR5U3RhdGUgPT09IDMpIHtcbiAgICAgICAgICAgIFNvY2tldC5XUy5jbG9zZSgpO1xuICAgICAgICAgICAgU29ja2V0LmNyZWF0ZVNvY2tldCgpOy8v6YeN6L+eXG4gICAgICAgIH0gZWxzZSBpZihTb2NrZXQuV1MucmVhZHlTdGF0ZSA9PT0gMSkge1xuICAgICAgICAgICAgU29ja2V0LldTLnNlbmQoSlNPTi5zdHJpbmdpZnkob2JqKSlcbiAgICAgICAgfWVsc2UgaWYoU29ja2V0LldTLnJlYWR5U3RhdGUgPT09IDApe1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgU29ja2V0LldTLnNlbmQoSlNPTi5zdHJpbmdpZnkob2JqKSlcbiAgICAgICAgICAgIH0sIDIwMDApO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKuWFs+mXrVdTICovXG4gICAgc3RhdGljIG9uY2xvc2VXUygpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ+aWreW8gOi/nuaOpScpO1xuICAgIH1cbiAgICAvKirlj5HpgIHlv4Pot7MgKi9cbiAgICBzdGF0aWMgc2VuZFBpbmcoKXtcbiAgICAgICAgU29ja2V0LldTLnNlbmQoJ3BpbmcnKTtcbiAgICAgICAgU29ja2V0LnNldEludGVydmFsV2Vzb2NrZXRQdXNoID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgU29ja2V0LldTLnNlbmQoJ3BpbmcnKTtcbiAgICAgICAgfSwgMzAwMDApXG4gICAgfVxufVxuXG4iLCIvKipcbiAqIEBhdXRob3IgW1Npd2VuXVxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDU6MjhcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ1OjI4XG4gKiBAZGVzYyDlt6Xlhbflh73mlbDpm4blkIhcbiAqL1xuZXhwb3J0IGRlZmF1bHQge1xuICAgIC8qKlxuICAgICAqIOWNg+WIhuS9jeagvOW8j+WMllxuICAgICAqIEBwYXJhbSB7bnVtYmVyIHwgc3RyaW5nfSBudW0g5qC85byP5YyW5pWw5a2XXG4gICAgICovXG4gICAgY29tZGlmeShudW06IGFueSkge1xuICAgICAgICByZXR1cm4gbnVtLnRvU3RyaW5nKCkucmVwbGFjZSgvXFxkKy8sIGZ1bmN0aW9uIChuKSB7IC8vIOWFiOaPkOWPluaVtOaVsOmDqOWIhlxuICAgICAgICAgICAgcmV0dXJuIG4ucmVwbGFjZSgvKFxcZCkoPz0oXFxkezN9KSskKS9nLCBmdW5jdGlvbiAoJDEpIHsgLy8g5a+55pW05pWw6YOo5YiG5re75Yqg5YiG6ZqU56ymXG4gICAgICAgICAgICAgICAgcmV0dXJuICQxICsgXCIsXCI7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIOWkjeWItlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb3B5SW5mbyDlpI3liLblhoXlrrlcbiAgICAgKi9cbiAgICBDb3B5KGNvcHlJbmZvOiBhbnkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGxldCBjb3B5VXJsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlucHV0XCIpOyAvL+WIm+W7uuS4gOS4qmlucHV05qGG6I635Y+W6ZyA6KaB5aSN5Yi255qE5paH5pys5YaF5a65XG4gICAgICAgICAgICBjb3B5VXJsLnZhbHVlID0gY29weUluZm87XG4gICAgICAgICAgICBsZXQgYXBwRGl2ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FwcCcpO1xuICAgICAgICAgICAgYXBwRGl2LmFwcGVuZENoaWxkKGNvcHlVcmwpO1xuICAgICAgICAgICAgY29weVVybC5zZWxlY3QoKTtcbiAgICAgICAgICAgIGRvY3VtZW50LmV4ZWNDb21tYW5kKFwiQ29weVwiKTtcbiAgICAgICAgICAgIGNvcHlVcmwucmVtb3ZlKClcbiAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgIH0pXG4gICAgfSxcblxuICAgIC8qKiDliKTmlq3mmK/lkKbkuLrmiYvmnLoqL1xuICAgIGlzUGhvbmUobnVtOiBhbnkpIHtcbiAgICAgICAgdmFyIHJlZyA9IC9eMVszNDU2Nzg5XVxcZHs5fSQvO1xuICAgICAgICByZXR1cm4gcmVnLnRlc3QobnVtKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICog5YCS6K6h5pe2XG4gICAgICogQHBhcmFtIHtzdHJpbmcgfCBudW1iZXJ9IHRpbWVzIOWJqeS9meavq+enkuaVsCBcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayDlm57osIPlh73mlbBcbiAgICAgKi9cbiAgICBjb3VudERvd24odGltZXM6IGFueSwgY2FsbGJhY2s6IGFueSkge1xuICAgICAgICBsZXQgdGltZXIgPSBudWxsO1xuICAgICAgICB0aW1lciA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgIGlmICh0aW1lcyA+IDApIHtcbiAgICAgICAgICAgICAgICBsZXQgZGF5OiBhbnkgPSBNYXRoLmZsb29yKHRpbWVzIC8gKDYwICogNjAgKiAyNCkpO1xuICAgICAgICAgICAgICAgIGxldCBob3VyOiBhbnkgPSBNYXRoLmZsb29yKHRpbWVzIC8gKDYwICogNjApKSAtIChkYXkgKiAyNCk7XG4gICAgICAgICAgICAgICAgbGV0IG1pbnV0ZTogYW55ID0gTWF0aC5mbG9vcih0aW1lcyAvIDYwKSAtIChkYXkgKiAyNCAqIDYwKSAtIChob3VyICogNjApO1xuICAgICAgICAgICAgICAgIGxldCBzZWNvbmQ6IGFueSA9IE1hdGguZmxvb3IodGltZXMpIC0gKGRheSAqIDI0ICogNjAgKiA2MCkgLSAoaG91ciAqIDYwICogNjApIC0gKG1pbnV0ZSAqIDYwKTtcbiAgICAgICAgICAgICAgICBkYXkgPSBgJHtkYXkgPCAxMCA/ICcwJyA6ICcnfSR7ZGF5fWA7XG4gICAgICAgICAgICAgICAgaG91ciA9IGAke2hvdXIgPCAxMCA/ICcwJyA6ICcnfSR7aG91cn1gO1xuICAgICAgICAgICAgICAgIG1pbnV0ZSA9IGAke21pbnV0ZSA8IDEwID8gJzAnIDogJyd9JHttaW51dGV9YDtcbiAgICAgICAgICAgICAgICBzZWNvbmQgPSBgJHtzZWNvbmQgPCAxMCA/ICcwJyA6ICcnfSR7c2Vjb25kfWA7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soYCR7aG91cn06JHttaW51dGV9OiR7c2Vjb25kfWApXG4gICAgICAgICAgICAgICAgdGltZXMtLTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aW1lcik7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIDEwMDApO1xuICAgICAgICBpZiAodGltZXMgPD0gMCkge1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aW1lcik7XG4gICAgICAgICAgICBjYWxsYmFjayhmYWxzZSlcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiDlsIbmoLzlvI/ljJbml6XmnJ/ovazmjaLmiJDml7bpl7TmiLNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbXlEYXRlIOagvOW8j+WMluaXpeacn1xuICAgICAqL1xuICAgIGZvcm1hdERhdGUoeDogYW55LCB5OiBhbnkpIHtcbiAgICAgICAgaWYgKCEoeCBpbnN0YW5jZW9mIERhdGUpKSB7XG4gICAgICAgICAgICB2YXIgZGF0ZSA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICBkYXRlLnNldFRpbWUoeCAqIDEwMDApO1xuICAgICAgICAgICAgeCA9IGRhdGU7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHogPSB7XG4gICAgICAgICAgICB5OiB4LmdldEZ1bGxZZWFyKCksXG4gICAgICAgICAgICBNOiB4LmdldE1vbnRoKCkgKyAxLFxuICAgICAgICAgICAgZDogeC5nZXREYXRlKCksXG4gICAgICAgICAgICBoOiB4LmdldEhvdXJzKCksXG4gICAgICAgICAgICBtOiB4LmdldE1pbnV0ZXMoKSxcbiAgICAgICAgICAgIHM6IHguZ2V0U2Vjb25kcygpXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB5LnJlcGxhY2UoLyh5K3xNK3xkK3xoK3xtK3xzKykvZywgZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgIHJldHVybiAoKHYubGVuZ3RoID4gMSA/IFwiMFwiIDogXCJcIikgKyBldmFsKFwiei5cIiArIHYuc2xpY2UoLTEpKSkuc2xpY2UoXG4gICAgICAgICAgICAgICAgLSh2Lmxlbmd0aCA+IDIgPyB2Lmxlbmd0aCA6IDIpXG4gICAgICAgICAgICApO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIC8qKlxuICAgKiDlsIbml7bpl7TmiLPovazmjaLmiJDmoLzlvI/ljJbml6XmnJ9cbiAgICogQHBhcmFtIHtzdHJpbmd9IHRpbWVTdGFtcCDml7bpl7TmiLNcbiAgICovXG4gICAgZm9ybWF0RGF0ZVRpbWUodGltZVN0YW1wKSB7XG4gICAgICAgIHZhciBkYXRlID0gbmV3IERhdGUoKTtcbiAgICAgICAgZGF0ZS5zZXRUaW1lKHRpbWVTdGFtcCAqIDEwMDApO1xuICAgICAgICB2YXIgeSA9IGRhdGUuZ2V0RnVsbFllYXIoKTtcbiAgICAgICAgdmFyIG06c3RyaW5nIHwgbnVtYmVyID0gZGF0ZS5nZXRNb250aCgpICsgMTtcbiAgICAgICAgbSA9IG0gPCAxMCA/ICgnMCcgKyBtKSA6IG07XG4gICAgICAgIHZhciBkOnN0cmluZyB8IG51bWJlciA9IGRhdGUuZ2V0RGF0ZSgpO1xuICAgICAgICBkID0gZCA8IDEwID8gKCcwJyArIGQpIDogZDtcbiAgICAgICAgdmFyIGg6c3RyaW5nIHwgbnVtYmVyID0gZGF0ZS5nZXRIb3VycygpO1xuICAgICAgICBoID0gaCA8IDEwID8gKCcwJyArIGgpIDogaDtcbiAgICAgICAgdmFyIG1pbnV0ZTpzdHJpbmcgfCBudW1iZXIgPSBkYXRlLmdldE1pbnV0ZXMoKTtcbiAgICAgICAgdmFyIHNlY29uZDpzdHJpbmcgfCBudW1iZXIgPSBkYXRlLmdldFNlY29uZHMoKTtcbiAgICAgICAgbWludXRlID0gbWludXRlIDwgMTAgPyAoJzAnICsgbWludXRlKSA6IG1pbnV0ZTtcbiAgICAgICAgc2Vjb25kID0gc2Vjb25kIDwgMTAgPyAoJzAnICsgc2Vjb25kKSA6IHNlY29uZDtcbiAgICAgICAgcmV0dXJuIHkgKyAnLScgKyBtICsgJy0nICsgZCArICcgJyArIGggKyAnOicgKyBtaW51dGUgKyAnOicgKyBzZWNvbmQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIOS/neeVmW7kvY3lsI/mlbAgIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nIHwgbnVtYmVyfSBjbnVtIOmcgOimgeS/neeVmeeahOaVsOaNrlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjaW5kZXgg5L+d55WZ55qE5bCP5pWw5L2N5pWwXG4gICAgICovXG4gICAgdG9EZWNpbWFsKGNudW06IGFueSwgY2luZGV4OiBhbnkpIHtcbiAgICAgICAgbGV0IHZhbHVlID0gU3RyaW5nKGNudW0pO1xuICAgICAgICBpZiAodmFsdWUuaW5kZXhPZihcIi5cIikgPiAwKSB7XG4gICAgICAgICAgICB2YXIgbGVmdCA9IHZhbHVlLnN1YnN0cigwLCB2YWx1ZS5pbmRleE9mKFwiLlwiKSk7XG4gICAgICAgICAgICB2YXIgcmlnaHQgPSB2YWx1ZS5zdWJzdHIodmFsdWUuaW5kZXhPZihcIi5cIikgKyAxLCB2YWx1ZS5sZW5ndGgpO1xuICAgICAgICAgICAgaWYgKHJpZ2h0Lmxlbmd0aCA+IGNpbmRleCkge1xuICAgICAgICAgICAgICAgIHJpZ2h0ID0gcmlnaHQuc3Vic3RyKDAsIGNpbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YWx1ZSA9IGxlZnQgKyBcIi5cIiArIHJpZ2h0O1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGNudW07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoq5Yqg5rOV6L+Q566XICovXG4gICAgYWNjQWRkKGFyZzEsYXJnMil7XG4gICAgICAgIGxldCByMSxyMixtO1xuICAgICAgICB0cnl7cjE9YXJnMS50b1N0cmluZygpLnNwbGl0KFwiLlwiKVsxXS5sZW5ndGh9Y2F0Y2goZSl7cjE9MH1cbiAgICAgICAgdHJ5e3IyPWFyZzIudG9TdHJpbmcoKS5zcGxpdChcIi5cIilbMV0ubGVuZ3RofWNhdGNoKGUpe3IyPTB9XG4gICAgICAgIG09TWF0aC5wb3coMTAsTWF0aC5tYXgocjEscjIpKVxuICAgICAgICByZXR1cm4gKGFyZzEqbSthcmcyKm0pL21cbiAgICB9LFxuICAgIC8qKuWHj+azlei/kOeulyAqL1xuICAgIGFjY1N1YihhcmcxLGFyZzIpe1xuICAgICAgICBsZXQgcjEscjIsbSxuO1xuICAgICAgICB0cnl7cjE9YXJnMS50b1N0cmluZygpLnNwbGl0KFwiLlwiKVsxXS5sZW5ndGh9Y2F0Y2goZSl7cjE9MH1cbiAgICAgICAgdHJ5e3IyPWFyZzIudG9TdHJpbmcoKS5zcGxpdChcIi5cIilbMV0ubGVuZ3RofWNhdGNoKGUpe3IyPTB9XG4gICAgICAgIG09TWF0aC5wb3coMTAsTWF0aC5tYXgocjEscjIpKTtcbiAgICAgICAgbj0ocjE+PXIyKT9yMTpyMjtcbiAgICAgICAgcmV0dXJuICgoYXJnMSptLWFyZzIqbSkvbSkudG9GaXhlZChuKTtcbiAgICB9LFxuICAgIC8qKumZpOazlei/kOeulyAqL1xuICAgIGFjY0RpdihhcmcxLGFyZzIpe1xuICAgICAgICBsZXQgdDE9MCx0Mj0wLHIxLHIyO1xuICAgICAgICB0cnl7dDE9YXJnMS50b1N0cmluZygpLnNwbGl0KFwiLlwiKVsxXS5sZW5ndGh9Y2F0Y2goZSl7fTtcbiAgICAgICAgdHJ5e3QyPWFyZzIudG9TdHJpbmcoKS5zcGxpdChcIi5cIilbMV0ubGVuZ3RofWNhdGNoKGUpe307XG4gICAgICAgIHIxPU51bWJlcihhcmcxLnRvU3RyaW5nKCkucmVwbGFjZShcIi5cIixcIlwiKSlcbiAgICAgICAgcjI9TnVtYmVyKGFyZzIudG9TdHJpbmcoKS5yZXBsYWNlKFwiLlwiLFwiXCIpKVxuICAgICAgICByZXR1cm4gKHIxL3IyKSpNYXRoLnBvdygxMCx0Mi10MSk7XG4gICAgfSxcbiAgICAvKirkuZjms5Xov5DnrpcgKi9cbiAgICBhY2NNdWwoYXJnMSxhcmcyKXtcbiAgICAgICAgbGV0IG09MCxzMT1hcmcxLnRvU3RyaW5nKCksczI9YXJnMi50b1N0cmluZygpO1xuICAgICAgICB0cnl7bSs9czEuc3BsaXQoXCIuXCIpWzFdLmxlbmd0aH1jYXRjaChlKXt9XG4gICAgICAgIHRyeXttKz1zMi5zcGxpdChcIi5cIilbMV0ubGVuZ3RofWNhdGNoKGUpe31cbiAgICAgICAgcmV0dXJuIE51bWJlcihzMS5yZXBsYWNlKFwiLlwiLFwiXCIpKSpOdW1iZXIoczIucmVwbGFjZShcIi5cIixcIlwiKSkvTWF0aC5wb3coMTAsbSlcbiAgICB9LFxufVxuIiwiLyoqXG4gKiBAYXV0aG9yIFtTaXdlbl1cbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTI4IDExOjI5OjQxXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yOCAxMToyOTo0MVxuICogQGRlc2Mg6LWE5rqQ5YiX6KGoXG4gKi9cblxuXG4vLyDpppbpobXotYTmupBcbmNvbnN0IGNvbXAgPSBbXG4gICAgeyB1cmw6IFwicmVzL2F0bGFzL2NvbXAuYXRsYXNcIiwgdHlwZTogXCJhdGxhc1wiIH0sXG5cdHsgdXJsOiBcInJlcy9hdGxhcy9jb21wL2hvbWUuYXRsYXNcIiwgdHlwZTogXCJhdGxhc1wiIH0sXG5cdHsgdXJsOiBcInJlcy9hdGxhcy9jb21wL2hvbWUvZmlyZS5hdGxhc1wiLCB0eXBlOiBcImF0bGFzXCIgfSxcblx0eyB1cmw6IFwicmVzL2F0bGFzL2NvbXAvaG9tZS93YXZlLmF0bGFzXCIsIHR5cGU6IFwiYXRsYXNcIiB9LFxuICAgIHsgdXJsOiBcImNvbXAvaW1nX3N0YXJfYmcwMS5wbmdcIiwgdHlwZTogXCJpbWFnZVwiIH0sXG5dXG5jb25zdCBzY2VuZSA9IFtcbiAgICB7IHVybDogXCJDYXJkLmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcbiAgICB7IHVybDogXCJob21lLmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcbiAgICB7IHVybDogXCJUYWJiYXIuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxuXVxuZXhwb3J0IGNvbnN0IGxvYWRpbmdSZXNMaXN0ID0gW1xuICAgIC4uLmNvbXAsXG4gICAgLi4uc2NlbmVcbl1cblxuXG5cbi8v6aaW6aG15LmL5ZCO5Yqg6L29XG5jb25zdCBjb21wMSA9IFtcbiAgICB7IHVybDogXCJjb21wL2ltZ19wYXltZW50X2JnMDEucG5nXCIsIHR5cGU6IFwiaW1hZ2VcIiB9LFxuICAgIHsgdXJsOiBcImNvbXAvaW1nX3JhbmtsaXN0X2JnMDEucG5nXCIsIHR5cGU6IFwiaW1hZ2VcIiB9LFxuICAgIHsgdXJsOiBcImNvbXAvaW1nX3JvY2tldFJhbmtpbmdfYmcwMS5wbmdcIiwgdHlwZTogXCJpbWFnZVwiIH0sXG4gICAgeyB1cmw6IFwiY29tcC9pbWdfYmFubmVyMDEucG5nXCIsIHR5cGU6IFwiaW1hZ2VcIiB9LFxuICAgIHsgdXJsOiBcImNvbXAvaW1nX215cmFuazAxLnBuZ1wiLCB0eXBlOiBcImltYWdlXCIgfSxcbiAgICB7IHVybDogXCJjb21wL2ltZ19yYW5rMDEucG5nXCIsIHR5cGU6IFwiaW1hZ2VcIiB9LFxuICAgIHsgdXJsOiBcImNvbXAvaW1nX3RyZW5kX2Jhbm5lcjAxLnBuZ1wiLCB0eXBlOiBcImltYWdlXCIgfSxcbiAgICB7IHVybDogXCJjb21wL2ltZ194Y3RqX2JnMDEucG5nXCIsIHR5cGU6IFwiaW1hZ2VcIiB9LFxuXVxuY29uc3Qgc2NlbmUxID0gW1xuICAgIHsgdXJsOiBcInRlbXBsYXRlL3Nob3dSb2NrZXQuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxuICAgIHsgdXJsOiBcInRlbXBsYXRlL251bWJlckxpc3RET00uanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxuICAgIHsgdXJsOiBcInRlbXBsYXRlL0lucHV0UHdkRGlhbG9nLmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcbiAgICB7IHVybDogXCJ0ZW1wbGF0ZS9UaXBzRGlhbG9nLmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcbiAgICAvLyB7IHVybDogXCJ0ZW1wbGF0ZS9yZWNoYXJnZURpYWxvZy5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXG4gICAgeyB1cmw6IFwidGVtcGxhdGUvam9pblJlY29yZHMuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxuICAgIHsgdXJsOiBcInRlbXBsYXRlL3ByZXZpb3VzUmVjb3Jkcy5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXG4gICAgeyB1cmw6IFwidGVtcGxhdGUvcHJpeExpc3QuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxuICAgIHsgdXJsOiBcInRlbXBsYXRlL3ByaUhpc3RvcnkuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxuICAgIHsgdXJsOiBcInRlbXBsYXRlL3JhbmtpbmdMaXN0Lmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcbiAgICB7IHVybDogXCJ0ZW1wbGF0ZS9zaG9ydExpc3QuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxuICAgIHsgdXJsOiBcInRlbXBsYXRlL3RyZW5kTGlzdC5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXG4gICAgeyB1cmw6IFwidGVtcGxhdGUvd2lubmluZ0xpc3QuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxuICAgIHsgdXJsOiBcImd1ZXNzaW5nLmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcbiAgICB7IHVybDogXCJyZWNvcmQuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxuICAgIHsgdXJsOiBcImFzc2lzdGFudC5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXG4gICAgeyB1cmw6IFwiZ3JhbmRQcml4Lmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcbiAgICB7IHVybDogXCJwcmlIaXN0b3J5U2NlbmUuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxuICAgIHsgdXJsOiBcInNob3J0TGlzdGVkLmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcbiAgICB7IHVybDogXCJ4Y3RqLmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcbl1cbmV4cG9ydCBjb25zdCBsb2FkaW5nUmVzTGlzdDEgPSBbXG4gICAgLi4uY29tcDEsXG4gICAgLi4uc2NlbmUxXG5dXG4iLCIvKipcbiAqIEBhdXRob3IgW1Npd2VuXVxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDU6NDZcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ1OjQ2XG4gKiBAZGVzYyDpobXpnaLot7PovazohJrmnKzvvIznlKjkuo7nvJbovpHmqKHlvI/mj5LlhaVcbiAqL1xuaW1wb3J0IHsgVGFiYmFyIH0gZnJvbSBcIi4uL3ZpZXcvVGFiYmFyXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBhZ2VOYXZTY3JpcHQgZXh0ZW5kcyBMYXlhLlNjcmlwdCB7XG4gICAgLyoqIEBwcm9wIHtuYW1lOm5hdlBhZ2VTY3JpcHQsdGlwczon6KaB6Lez6L2s55qEc2NlbmUnLHR5cGU6U3RyaW5nLGRlZmF1bHQ6Jyd9ICovXG4gICAgcHVibGljIG5hdlBhZ2VTY3JpcHQ6c3RyaW5nID0gJyc7XG5cbiAgICBjb25zdHJ1Y3Rvcigpe3N1cGVyKCl9XG5cbiAgICBvbkNsaWNrKCk6dm9pZCB7XG4gICAgICAgIFRhYmJhci5nZXRJbnN0YW5jZSgpLm9wZW5TY2VuZSh0aGlzLm5hdlBhZ2VTY3JpcHQpXG4gICAgfVxufSIsIi8qKlxuICogQGF1dGhvciBbU2l3ZW5dXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0NjowOFxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDY6MDhcbiAqIEBkZXNjIOmhtemdoui3s+i9rOexu++8jOWcqOS7o+eggeS4reS9v+eUqFxuICovXG5pbXBvcnQgeyBUYWJiYXIgfSBmcm9tICcuLi92aWV3L1RhYmJhcidcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGFnZVNjcmlwdCBleHRlbmRzIExheWEuU2NyaXB0IHtcbiAgICAvKiogQHByb3Age25hbWU6c2hvd1RhYix0aXBzOifmmK/lkKbmnIlUYWJiYXInLHR5cGU6Qm9vbCxkZWZhdWx0OnRydWV9ICovXG4gICAgcHVibGljIHNob3dUYWI6Ym9vbGVhbiA9IHRydWU7XG5cbiAgICBjb25zdHJ1Y3Rvcigpe3N1cGVyKCk7fVxuXG4gICAgb25FbmFibGUoKTp2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuc2hvd1RhYikge1xuICAgICAgICAgICAgVGFiYmFyLnNob3coKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgb25EaXNhYmxlKCk6dm9pZCB7XG4gICAgICAgIFRhYmJhci5oaWRlKClcbiAgICB9XG59IiwiLyoqXG4gKiBAYXV0aG9yIFtTaXdlbl1cbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ2OjMwXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0NjozMFxuICogQGRlc2Mg5bGP5bmV6Ieq6YCC5bqU6ISa5pysXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNjcmVlbiBleHRlbmRzIExheWEuU2NyaXB0IHtcbiAgICAvKiogQHByb3Age25hbWU6YmdDb2xvcix0aXBzOifog4zmma/popzoibInLCd0eXBlOlN0cmluZyxkZWZhdWx0OicjMGEwNzM4J30gKi9cbiAgICBwdWJsaWMgYmdDb2xvcjpzdHJpbmcgPSAnIzBhMDczOCdcblxuICAgIGNvbnN0cnVjdG9yKCl7c3VwZXIoKTt9XG5cbiAgICBvbkVuYWJsZSgpOnZvaWQge1xuICAgICAgIExheWEuc3RhZ2Uub24oTGF5YS5FdmVudC5SRVNJWkUsdGhpcyx0aGlzLm9uUmVzaXplKVxuICAgICAgIHRoaXMub25SZXNpemUoKVxuICAgIH1cblxuICAgIG9uRGlzYWJsZSgpOnZvaWQge1xuICAgICAgICBMYXlhLnN0YWdlLm9mZihMYXlhLkV2ZW50LlJFU0laRSx0aGlzLHRoaXMub25SZXNpemUpXG4gICAgfVxuXG4gICAgcHJpdmF0ZSBvblJlc2l6ZSgpOnZvaWQge1xuICAgICAgICBjb25zdCBfdGhhdCA9ICh0aGlzLm93bmVyIGFzIExheWEuU3ByaXRlKTtcbiAgICAgICAgX3RoYXQud2lkdGggPSBMYXlhLnN0YWdlLndpZHRoO1xuICAgICAgICBfdGhhdC5oZWlnaHQgPSBMYXlhLnN0YWdlLmhlaWdodDtcbiAgICAgICAgX3RoYXQuZ3JhcGhpY3MuZHJhd1JlY3QoMCwwLExheWEuc3RhZ2Uud2lkdGgsTGF5YS5zdGFnZS5oZWlnaHQsdGhpcy5iZ0NvbG9yKTtcbiAgICB9XG59IiwiLyoqXG4gKiBAYXV0aG9yIFtTaXdlbl1cbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTIxIDE2OjM0OjIxXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yMSAxNjozNDoyMVxuICogQGRlc2Mg5Yqp5omL6aG16Z2i6ISa5pysXG4gKi9cblxuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XG5pbXBvcnQgYXBpIGZyb20gXCIuLi9qcy9hcGlcIjtcbmltcG9ydCB7IFRvYXN0IH0gZnJvbSBcIi4uL3ZpZXcvVG9hc3RcIjtcbmltcG9ydCBzY3JlZW5VdGlscyBmcm9tIFwiLi4vanMvc2NyZWVuVXRpbHNcIjtcblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBc3Npc3RhbnQgZXh0ZW5kcyB1aS5hc3Npc3RhbnRVSSB7XG4gICAgcHJpdmF0ZSBjYXRlTGlzdEFycjphbnkgPSBbXTtcbiAgICBwcml2YXRlIHNlbGVjdEdvb2RzVHlwZTpzdHJpbmcgPSAnJztcbiAgICBwcml2YXRlIHRhYlR5cGU6bnVtYmVyID0gMTtcblxuICAgIHN0YXRpYyByZWFkb25seSBIQUxGX1NDUk9MTF9FTEFTVElDX0RJU1RBTkNFOiBudW1iZXIgPSAxMDA7XG4gICAgcHJpdmF0ZSBfaXNTY3JvbGxPdmVyRWxhc3RpY0Rpc3RhbmNlOiBib29sZWFuO1xuICAgIHByaXZhdGUgcGFnZTpudW1iZXIgPSAxO1xuICAgIGNvbnN0cnVjdG9yKCl7XG4gICAgICAgIHN1cGVyKClcbiAgICAgICAgdGhpcy5idG5fdHJlbmQub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMudGFiU3dpdGNoLFsxXSlcbiAgICAgICAgdGhpcy5idG5fcHJlYnV5Lm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLnRhYlN3aXRjaCxbMl0pXG4gICAgICAgIHRoaXMub24oTGF5YS5FdmVudC5SRVNJWkUsdGhpcyx0aGlzLm9uUmVzaXplKVxuICAgIH1cblxuICAgIG9uRW5hYmxlKCk6dm9pZHsgIFxuICAgICAgICB0aGlzLmdldEdvb2RzQ2F0ZUxpc3QoKVxuICAgICAgICB0aGlzLmNhdGVTd2l0Y2goKVxuXG4gICAgICAgIC8v6LWw5Yq/5YiG5p6Q5rua5Yqo5Yqg6L295pu05aSaXG4gICAgICAgIHRoaXMudHJlbmRMaXN0LnNjcm9sbEJhci5jaGFuZ2VIYW5kbGVyID0gTGF5YS5IYW5kbGVyLmNyZWF0ZSh0aGlzLHRoaXMub25UcmVuZExpc3RTY3JvbGxDaGFuZ2UsbnVsbCxmYWxzZSlcbiAgICAgICAgdGhpcy50cmVuZExpc3Quc2Nyb2xsQmFyLm9uKExheWEuRXZlbnQuRU5ELCB0aGlzLCB0aGlzLm9uVHJlbmRMaXN0U2Nyb2xsRW5kKVxuICAgIH1cbiAgICBcbiAgICAvKirojrflj5bllYblk4HnsbvlnosgKi9cbiAgICBwcml2YXRlIGdldEdvb2RzQ2F0ZUxpc3QoKXtcbiAgICAgICAgYXBpLmdldEdvb2RzQ2F0ZUxpc3QoKS50aGVuKChyZXM6YW55KT0+e1xuICAgICAgICAgICAgdGhpcy5jYXRlTGlzdEFyciA9IHJlcztcbiAgICAgICAgICAgIGNvbnN0IEdvb2RzTmFtZUFycjpzdHJpbmdbXSA9IFtdO1xuICAgICAgICAgICAgcmVzLmZvckVhY2goKGl0ZW06YW55KT0+e1xuICAgICAgICAgICAgICAgIEdvb2RzTmFtZUFyci5wdXNoKGl0ZW0uZ29vZHNOYW1lKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIHRoaXMuY2F0ZVRhYkxpc3QucmVwZWF0WCA9IEdvb2RzTmFtZUFyci5sZW5ndGg7XG4gICAgICAgICAgICB0aGlzLmNhdGVUYWJMaXN0LmFycmF5ID0gR29vZHNOYW1lQXJyO1xuICAgICAgICAgICAgdGhpcy5jYXRlVGFiTGlzdC5zZWxlY3RlZEluZGV4ID0gMDtcbiAgICAgICAgfSkuY2F0Y2goKGVycjphbnkpPT57XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIubWVzc2FnZSk7XG4gICAgICAgIH0pXG4gICAgfVxuXG5cbiAgICAvKirojrflj5botbDlir/liJfooaggKi9cbiAgICBwcml2YXRlIGdldEdvb2RzVHJlbmQoZ29vZHNUeXBlOnN0cmluZyxwYWdlID0gMSl7XG4gICAgICAgIGFwaS5nZXRHb29kc1RyZW5kKGdvb2RzVHlwZSxwYWdlKS50aGVuKChyZXM6YW55KT0+e1xuICAgICAgICAgICAgaWYgKHRoaXMudHJlbmRMaXN0LmFycmF5ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50cmVuZExpc3QuYXJyYXkgPSBbLi4udGhpcy50cmVuZExpc3QuYXJyYXksLi4ucmVzXVxuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgdGhpcy50cmVuZExpc3QuYXJyYXkgPSByZXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy50cmVuZExpc3QuYXJyYXkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMudHJlbmRMaXN0LnZpc2libGUgPSB0cnVlO1xuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLmNhdGNoKChlcnI6YW55KT0+e1xuICAgICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIubWVzc2FnZSk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5YiH5o2i5YiX6KGoXG4gICAgICogQHBhcmFtIHR5cGUgMTrotbDlir/liIbmnpAgIDLvvJrpooTotK1cbiAgICAgKi9cbiAgICBwcml2YXRlIHRhYlN3aXRjaCh0eXBlOm51bWJlcil7XG4gICAgICAgIGlmIChzY3JlZW5VdGlscy5nZXRTY3JlZW4oKS5uYW1lID09PSAncmVjb3JkJyAmJiB0aGlzLnRhYlR5cGUgPT09IHR5cGUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnRhYlR5cGUgPSB0eXBlO1xuICAgICAgICBpZiAodHlwZSA9PT0gMikge1xuICAgICAgICAgICAgVG9hc3Quc2hvdygn5pqC5pyq5byA5pS+77yM5pWs6K+35pyf5b6FJylcbiAgICAgICAgfVxuICAgICAgICAvLyB0aGlzLmNhdGVUYWJMaXN0LnNlbGVjdGVkSW5kZXggPSAwO1xuICAgICAgICAvLyBpZiAodGhpcy50YWJUeXBlID09PSAxKSB7XG4gICAgICAgIC8vICAgICB0aGlzLmJ0bl90cmVuZC5za2luID0gJ2NvbXAvZ3Vlc3NpbmcvaW1nX3RhYl9hY3RpdmUucG5nJztcbiAgICAgICAgLy8gICAgIHRoaXMuYnRuX3ByZWJ1eS5za2luID0gJ2NvbXAvZ3Vlc3NpbmcvaW1nX3RhYi5wbmcnO1xuICAgICAgICAvLyAgICAgdGhpcy5saXN0VGl0bGUudmlzaWJsZSA9IHRydWU7XG4gICAgICAgIC8vICAgICBpZiAodGhpcy50cmVuZExpc3QuYXJyYXkgPT09IG51bGwgfHwgdGhpcy50cmVuZExpc3QuYXJyYXkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIC8vICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IHRydWU7XG4gICAgICAgIC8vICAgICB9ZWxzZSB7XG4gICAgICAgIC8vICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IGZhbHNlO1xuICAgICAgICAvLyAgICAgICAgIHRoaXMudHJlbmRMaXN0LnZpc2libGUgPSB0cnVlO1xuICAgICAgICAvLyAgICAgfVxuICAgICAgICAvLyAgICAgdGhpcy5wcmVidXkuc2Nyb2xsVG8oMClcbiAgICAgICAgLy8gICAgIHRoaXMucHJlYnV5LnZpc2libGUgPSBmYWxzZTtcbiAgICAgICAgLy8gfWVsc2V7XG4gICAgICAgIC8vICAgICB0aGlzLmJ0bl9wcmVidXkuc2tpbiA9ICdjb21wL2d1ZXNzaW5nL2ltZ190YWJfYWN0aXZlLnBuZyc7XG4gICAgICAgIC8vICAgICB0aGlzLmJ0bl90cmVuZC5za2luID0gJ2NvbXAvZ3Vlc3NpbmcvaW1nX3RhYi5wbmcnO1xuICAgICAgICAvLyAgICAgdGhpcy5saXN0VGl0bGUudmlzaWJsZSA9IGZhbHNlO1xuICAgICAgICAvLyAgICAgaWYgKHRoaXMucHJlYnV5LmFycmF5ID09PSBudWxsIHx8IHRoaXMucHJlYnV5LmFycmF5Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAvLyAgICAgICAgIHRoaXMubm9EYXRhLnZpc2libGUgPSB0cnVlO1xuICAgICAgICAvLyAgICAgfWVsc2Uge1xuICAgICAgICAvLyAgICAgICAgIHRoaXMubm9EYXRhLnZpc2libGUgPSBmYWxzZTtcbiAgICAgICAgLy8gICAgICAgICB0aGlzLnByZWJ1eS52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgLy8gICAgIH1cbiAgICAgICAgLy8gICAgIHRoaXMudHJlbmRMaXN0LnNjcm9sbFRvKDApO1xuICAgICAgICAvLyAgICAgdGhpcy50cmVuZExpc3QudmlzaWJsZSA9IGZhbHNlO1xuICAgICAgICAvLyB9XG4gICAgfVxuXG4gICAgLyoq5ZWG5ZOB57G75Z6L5YiH5o2iICovXG4gICAgcHJpdmF0ZSBjYXRlU3dpdGNoKCl7XG4gICAgICAgIHRoaXMuY2F0ZVRhYkxpc3Quc2VsZWN0SGFuZGxlciA9IG5ldyBMYXlhLkhhbmRsZXIodGhpcywgKHNlbGVjdGVkSW5kZXg6IGFueSk9PiB7XG4gICAgICAgICAgICB0aGlzLnNlbGVjdEdvb2RzVHlwZSA9IHRoaXMuY2F0ZUxpc3RBcnJbc2VsZWN0ZWRJbmRleF0uZ29vZHNUeXBlO1xuICAgICAgICAgICAgaWYgKHRoaXMudGFiVHlwZSA9PT0gMSkge1xuICAgICAgICAgICAgICAgIHRoaXMudHJlbmRMaXN0LmFycmF5ID0gW107XG4gICAgICAgICAgICAgICAgdGhpcy5wYWdlID0gMTtcbiAgICAgICAgICAgICAgICB0aGlzLmdldEdvb2RzVHJlbmQodGhpcy5zZWxlY3RHb29kc1R5cGUsdGhpcy5wYWdlKVxuICAgICAgICAgICAgfWVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfmmoLmnKrlvIDmlL4nLHRoaXMuc2VsZWN0R29vZHNUeXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8v5pS55Y+YdGFi6YCJ5Lit54q25oCBXG4gICAgICAgICAgICBsZXQgaTogbnVtYmVyID0gdGhpcy5jYXRlVGFiTGlzdC5zdGFydEluZGV4O1xuICAgICAgICAgICAgdGhpcy5jYXRlVGFiTGlzdC5jZWxscy5mb3JFYWNoKChjZWxsOiBMYXlhLkJ1dHRvbikgPT4ge1xuICAgICAgICAgICAgICAgIGNlbGwuc2VsZWN0ZWQgPSBpID09PSBzZWxlY3RlZEluZGV4O1xuICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgLyoq55uR6KeG5bGP5bmV5aSn5bCP5Y+Y5YyWICovXG4gICAgb25SZXNpemUoKXtcbiAgICAgICAgLy/liJfooajpq5jluqbpgILphY0gPSDlsY/luZXpq5jluqYgLSAoYmFubmVyICsgdGFiYmFyKVxuICAgICAgICB0aGlzLnRyZW5kTGlzdC5oZWlnaHQgPSB0aGlzLmhlaWdodCAtIDYwMDtcbiAgICAgICAgY29uc3QgdHJlbmROdW1iZXIgPSB0aGlzLnRyZW5kTGlzdC5oZWlnaHQgLyAxMDA7XG4gICAgICAgIHRoaXMudHJlbmRMaXN0LnJlcGVhdFkgPSBNYXRoLmNlaWwodHJlbmROdW1iZXIpXG4gICAgICAgIHRoaXMucHJlYnV5LmhlaWdodCA9IHRoaXMuaGVpZ2h0IC0gNjAwO1xuICAgICAgICBjb25zdCBwcmVidXlOdW1iZXIgPSB0aGlzLnByZWJ1eS5oZWlnaHQgLyAxMDA7XG4gICAgICAgIHRoaXMudHJlbmRMaXN0LnJlcGVhdFkgPSBNYXRoLmNlaWwocHJlYnV5TnVtYmVyKVxuICAgIH1cblxuICAgIC8qKuWPguS4juiusOW9leWIl+ihqOa7muWKqCAqL1xuICAgIHByaXZhdGUgb25UcmVuZExpc3RTY3JvbGxDaGFuZ2UodjphbnkpIHtcbiAgICAgICAgaWYgKHYgPiB0aGlzLnRyZW5kTGlzdC5zY3JvbGxCYXIubWF4ICsgQXNzaXN0YW50LkhBTEZfU0NST0xMX0VMQVNUSUNfRElTVEFOQ0UpIHtcbiAgICAgICAgICAgIHRoaXMuX2lzU2Nyb2xsT3ZlckVsYXN0aWNEaXN0YW5jZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcHJpdmF0ZSBvblRyZW5kTGlzdFNjcm9sbEVuZCgpe1xuICAgICAgICBpZiAodGhpcy5faXNTY3JvbGxPdmVyRWxhc3RpY0Rpc3RhbmNlKSB7XG4gICAgICAgICAgICB0aGlzLl9pc1Njcm9sbE92ZXJFbGFzdGljRGlzdGFuY2UgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMucGFnZSA9IHRoaXMucGFnZSArIDE7XG4gICAgICAgICAgICB0aGlzLmdldEdvb2RzVHJlbmQodGhpcy5zZWxlY3RHb29kc1R5cGUsdGhpcy5wYWdlKVxuICAgICAgICAgICAgXG4gICAgICAgIH1cbiAgICB9XG4gICBcbn0iLCIvKipcbiAqIEBhdXRob3IgW1Npd2VuXVxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDc6MTFcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ3OjExXG4gKiBAZGVzYyDpppbpobXllYblk4HljaHohJrmnKxcbiAqL1xuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XG5pbXBvcnQgeyBUYWJiYXIgfSBmcm9tIFwiLi4vdmlldy9UYWJiYXJcIjtcblxuaW1wb3J0IHV0aWxzIGZyb20gJy4uL2pzL3V0aWxzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDYXJkIGV4dGVuZHMgdWkuQ2FyZFVJIHtcbiAgICBjb25zdHJ1Y3Rvcigpe1xuICAgICAgICBzdXBlcigpXG4gICAgICAgIHRoaXMub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuY2xpY2tJdGVtKVxuICAgIH1cbiAgICBzZXQgZGF0YVNvdXJjZShpdGVtOiBhbnkpIHtcbiAgICAgICAgdGhpcy5fZGF0YVNvdXJjZSA9IGl0ZW07XG4gICAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgICAgICAvL+mHkeW4geWbvueJhywgIDEtNDAw6YeR5biB5Zu+5qCHMjsgICA1MDEtMTAwMOmHkeW4geWbvuaghzQ7ICAxMDAx5Lul5LiK6YeR5biB5Zu+5qCHMjBcbiAgICAgICAgICAgIGlmICgraXRlbS5nb29kc1ZhbHVlIDw9IDQwMCApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNhcmRJdGVtLnNraW4gPSBgY29tcC9ob21lL2ltZ19qaW5iaV8yLnBuZ2BcbiAgICAgICAgICAgIH1lbHNlIGlmKCtpdGVtLmdvb2RzVmFsdWUgPD0gMTAwMCl7XG4gICAgICAgICAgICAgICAgdGhpcy5jYXJkSXRlbS5za2luID0gYGNvbXAvaG9tZS9pbWdfamluYmlfNC5wbmdgXG4gICAgICAgICAgICB9ZWxzZSBpZigraXRlbS5nb29kc1ZhbHVlID49IDEwMDEpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNhcmRJdGVtLnNraW4gPSBgY29tcC9ob21lL2ltZ19qaW5iaV8yMC5wbmdgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnNjZW5lSW1nLnNraW4gPSBgY29tcC9ob21lL2ltZ19zY2VuZV8ke2l0ZW0udG90YWxOdW19LnBuZ2BcbiAgICAgICAgICAgIHRoaXMuZ29vZHNOYW1lLnRleHQgPSBgJHsraXRlbS5nb29kc1ZhbHVlfSBVU0RUYFxuICAgICAgICAgICAgdGhpcy5hd2FyZC50ZXh0ID0gYCR7dXRpbHMudG9EZWNpbWFsKGl0ZW0uYXdhcmQsMil9YFxuICAgICAgICAgICAgdGhpcy5zb2xkTnVtX3RvdGFsTnVtLnRleHQgPSBgJHtpdGVtLnNvbGROdW19LyR7aXRlbS50b3RhbE51bX1gXG4gICAgICAgICAgICB0aGlzLnByb2dyZXNzLnZhbHVlID0gK2Ake2l0ZW0uc29sZE51bS9pdGVtLnRvdGFsTnVtfWBcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgY2xpY2tJdGVtKCk6dm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl9kYXRhU291cmNlICE9PSBudWxsKSB7XG4gICAgICAgICAgICBUYWJiYXIuZ2V0SW5zdGFuY2UoKS5vcGVuU2NlbmUoJ2d1ZXNzaW5nLnNjZW5lJyx0aGlzLl9kYXRhU291cmNlLmdvb2RzSWQpXG4gICAgICAgIH1cbiAgICB9XG59IiwiLyoqXG4gKiBAYXV0aG9yIFtTaXdlbl1cbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ3OjU4XG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0Nzo1OFxuICogQGRlc2Mg6LSt5Lmw6aG16Z2i6ISa5pysXG4gKi9cbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xuaW1wb3J0IHsgVG9hc3QgfSBmcm9tIFwiLi4vdmlldy9Ub2FzdFwiO1xuaW1wb3J0IHV0aWxzIGZyb20gJy4uL2pzL3V0aWxzJ1xuaW1wb3J0IElwdFBzd0RvbSBmcm9tIFwiLi4vdGVtcGxhdGUvcHN3SW5wdXRcIjtcbmltcG9ydCB7IEdhbWVNb2RlbCB9IGZyb20gXCIuLi9qcy9HYW1lTW9kZWxcIjtcbmltcG9ydCBhcGkgZnJvbSBcIi4uL2pzL2FwaVwiO1xuaW1wb3J0IHsgU29ja2V0IH0gZnJvbSBcIi4uL2pzL3NvY2tldFwiO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBHdWVzc2luZyBleHRlbmRzIHVpLmd1ZXNzaW5nVUkge1xuXG4gICAgcHJpdmF0ZSBnb29kc0lkOnN0cmluZyA9ICcnOy8v5ZWG5ZOBSURcbiAgICBwcml2YXRlIF9wZXJpb2Q6c3RyaW5nID0gJyc7IC8v5pyf5Y+3XG4gICAgcHJpdmF0ZSBzZWxlY3ROdW1iZXI6bnVtYmVyID0gMDsgLy/pgInkuK3kuKrmlbBcbiAgICBwcml2YXRlIHVuaXRQcmljZTpudW1iZXIgPSAwOyAvL+WNleS7t1xuICAgIHByaXZhdGUgdG90YWxQcmljZTpudW1iZXIgPSAwOyAvL+aAu+S7t1xuICAgIHByaXZhdGUgbXlBbW91bnQ6bnVtYmVyID0gMDsgLy/mgLvotYTkuqdcbiAgICBwcml2YXRlIG51bWJlckFycjpudW1iZXJbXSA9IFtdOyAvL+acqumAieS4reeahOaVsOaNrlxuICAgIHByaXZhdGUgaGFsZkFycjpudW1iZXJbXSA9IFtdOyAvL+S4gOWNiueahOacqumAieS4reaVsOaNrlxuICAgIHByaXZhdGUgcmF3RGF0YUFycl9uZXc6YW55W10gPSBbXTsvL+mVnOWDj+aVsOe7hFxuICAgIHByaXZhdGUgcmF3RGF0YUFycjphbnlbXSA9IFtdOy8v5Y6f5aeL5pWw5o2uXG5cbiAgICBwcml2YXRlIGlucHV0UHdkOiBJcHRQc3dEb207IC8v5a+G56CB6L6T5YWl5qGGXG4gICAgcHJpdmF0ZSBjb2RlTGlzdDpzdHJpbmcgPSAnJzsgLy/otK3kubDlj7fnoIFcblxuICAgIGNvbnN0cnVjdG9yKCl7XG4gICAgICAgIHN1cGVyKClcblxuICAgICAgICB0aGlzLmJ0bl9idXkub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuYnV5RnVuYylcblxuICAgICAgICAvLyDpgInmi6nmjInpkq7nu4Tnu5Hlrprkuovku7ZcbiAgICAgICAgdGhpcy5yYW5kb21fb25lLm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLnNlbGVjdEZ1bmMsWzFdKVxuICAgICAgICB0aGlzLnJhbmRvbV9iZWZvcmUub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuc2VsZWN0RnVuYyxbMl0pXG4gICAgICAgIHRoaXMucmFuZG9tX2FmdGVyLm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLnNlbGVjdEZ1bmMsWzNdKVxuICAgICAgICB0aGlzLnJhbmRvbV9hbGwub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuc2VsZWN0RnVuYyxbNF0pXG4gICAgfVxuXG4gICAgb25FbmFibGUoKTp2b2lkIHtcbiAgICAgICAgY29uc29sZS5sb2coJ+i/m+WFpemhtemdoicpO1xuXG4gICAgICAgIC8v6I635Y+W55So5oi36LWE5LqnXG4gICAgICAgIGNvbnN0IHVzZXJJbmZvOmFueSA9IEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLnVzZXJJbmZvO1xuICAgICAgICB0aGlzLmJhbGFuY2UudGV4dCA9IGAke3V0aWxzLnRvRGVjaW1hbCh1c2VySW5mby5tb25leSwyKX0gVVNEVGA7XG4gICAgICAgIHRoaXMubXlBbW91bnQgPSArYCR7dXRpbHMudG9EZWNpbWFsKHVzZXJJbmZvLm1vbmV5LDIpfWA7XG4gICAgICAgIGlmICghdXNlckluZm8udXNlcklkKSB7IC8v5pyq55m75b2V5LiN5pi+56S65oiR55qE5L2Z6aKdXG4gICAgICAgICAgICB0aGlzLmJhbGFuY2VCb3gudmlzaWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5lc3RpbWF0ZS55ID0gODA7XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgICAgdGhpcy5iYWxhbmNlQm94LnZpc2libGUgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5lc3RpbWF0ZS55ID0gNDI7XG4gICAgICAgIH1cbiAgICAgICAgLy8g55uR6KeG6LWE5Lqn5Y+Y5YqoXG4gICAgICAgIEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLm9uKCdnZXRVc2VySW5mbycsdGhpcywoKHVzZXJJbmZvOmFueSk9PntcbiAgICAgICAgICAgIHRoaXMuYmFsYW5jZS50ZXh0ID0gYCR7dXRpbHMudG9EZWNpbWFsKHVzZXJJbmZvLm1vbmV5LDIpfSBVU0RUYDtcbiAgICAgICAgICAgIHRoaXMubXlBbW91bnQgPSArYCR7dXRpbHMudG9EZWNpbWFsKHVzZXJJbmZvLm1vbmV5LDIpfWA7XG4gICAgICAgIH0pKVxuXG4gICAgICAgIC8vIOWPt+eggeiiq+i0reS5sOWPmOWKqFxuICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5vbignZ2V0YnV5R29vZHNBcnInLHRoaXMsKGdvb2RzQXJyOmFueSk9PntcbiAgICAgICAgICAgIHRoaXMucmF3RGF0YUFyci5mb3JFYWNoKChpdGVtOmFueSk9PntcbiAgICAgICAgICAgICAgICBnb29kc0Fyci5mb3JFYWNoKCh2OmFueSk9PntcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0uY29kZSA9PT0gdi5jb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnVzZXJJZCA9IHYudXNlcklkO1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5idXllcklkID0gdi51c2VySWQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIHRoaXMucHJvZ3Jlc3NTcGVlZC52YWx1ZSA9ICtgJHtnb29kc0Fyci5sZW5ndGggLyB0aGlzLm51bWJlckxpc3QuYXJyYXkubGVuZ3RofWA7XG4gICAgICAgICAgICB0aGlzLnNvbGROdW1fc29sZE51bS50ZXh0ID0gYCR7Z29vZHNBcnIubGVuZ3RofS8ke3RoaXMubnVtYmVyTGlzdC5hcnJheS5sZW5ndGh9YDtcbiAgICAgICAgICAgIHRoaXMubnVtYmVyTGlzdC5hcnJheSA9IHRoaXMucmF3RGF0YUFycjsgLy/lj7fnoIHliJfooahcbiAgICAgICAgfSlcbiAgICB9XG4gICAgb25PcGVuZWQoZ29vZHNJZDphbnkpe1xuICAgICAgICB0aGlzLmdvb2RzSWQgPSBnb29kc0lkO1xuICAgICAgICB0aGlzLmdldEdvb2RzRGV0YWlscyh0aGlzLmdvb2RzSWQpO1xuICAgIH1cbiAgICBvbkRpc2FibGUoKXtcbiAgICAgICAgLy8gIOWFs+mXrXdlYnNvY2tldOS6i+S7tlxuICAgICAgICBTb2NrZXQuc2VuZFdTUHVzaChgYnV5XyR7dGhpcy5fcGVyaW9kfWAsMClcbiAgICB9XG5cbiAgICAvKirotK3kubAgKi9cbiAgICBwcml2YXRlIGJ1eUZ1bmMoKTp2b2lkIHtcbiAgICAgICAgbGV0IHVzZXJJbmZvID0gT2JqZWN0LmtleXMoR2FtZU1vZGVsLmdldEluc3RhbmNlKCkudXNlckluZm8pO1xuICAgICAgICBpZiAodXNlckluZm8ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn5pyq55m75b2V6Lez6L2s55m75b2VJyk7XG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IGBodHRwczovLyR7ZG9jdW1lbnQuZG9tYWlufS8jL3NpZ25fb25lYFxuICAgICAgICB9ZWxzZSBpZiAodGhpcy5nZXRTZWxlY3ROdW1iZXIoKSA8PSAwKSB7XG4gICAgICAgICAgICBUb2FzdC5zaG93KCfor7fpgInmi6notK3kubDlj7fnoIEnKVxuICAgICAgICB9ZWxzZSBpZih0aGlzLnRvdGFsUHJpY2UgPiB0aGlzLm15QW1vdW50KXtcbiAgICAgICAgICAgIFRvYXN0LnNob3coJ+S9memineS4jei2sycpXG4gICAgICAgIH1lbHNle1xuICAgICAgICAgICAgdGhpcy5pbnB1dFB3ZCA9IG5ldyBJcHRQc3dEb20oKVxuICAgICAgICAgICAgdGhpcy5pbnB1dFB3ZC5wb3B1cCgpO1xuICAgICAgICAgICAgdGhpcy5pbnB1dFB3ZC5zZXREYXRhKHsgLy/lj5HpgIHmlbDmja5cbiAgICAgICAgICAgICAgICBwZXJpb2Q6dGhpcy5wZXJpb2QudGV4dCxcbiAgICAgICAgICAgICAgICBjb2RlTGlzdDp0aGlzLmNvZGVMaXN0LFxuICAgICAgICAgICAgICAgIEFsbENvZGVMaXN0OnRoaXMubnVtYmVyTGlzdC5hcnJheVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC8vIOebkeWQrOi+k+WFpeahhue7hOS7tuS6i+S7tlxuICAgICAgICAgICAgdGhpcy5pbnB1dFB3ZC5vbigncmVmcmVzaERhdGEnLHRoaXMsKCk9PntcbiAgICAgICAgICAgICAgICB0aGlzLmdldEdvb2RzRGV0YWlscyh0aGlzLmdvb2RzSWQpO1xuICAgICAgICAgICAgICAgIHRoaXMudG90YWwudGV4dCA9ICcwIFVTRFQnO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOmAieaLqeaMiemSrue7hFxuICAgICAqIEBwYXJhbSB0eXBlIOmAieaLqeexu+WeiyAgMTrpmo/kuIAgIDLvvJrliY3ljYogM++8muWQjuWNiiA077ya5YWo6YOoXG4gICAgICovXG4gICAgcHJpdmF0ZSBzZWxlY3RGdW5jKHR5cGU6bnVtYmVyKXtcbiAgICAgICAgdGhpcy5yYXdEYXRhQXJyX25ldyA9IHRoaXMucmF3RGF0YUFycjsgLy/liJ3lp4vljJbmlbDnu4RcbiAgICAgICAgdGhpcy5udW1iZXJBcnIgPSBbXTsvL+WIneWni+WMluaVsOe7hFxuICAgICAgICB0aGlzLmhhbGZBcnIgPSBbXTsvL+WIneWni+WMluaVsOe7hFxuXG4gICAgICAgIHRoaXMucmF3RGF0YUFycl9uZXcuZm9yRWFjaChpdGVtPT57XG4gICAgICAgICAgICBpZiAoaXRlbS5idXllcklkID09PSAnMicpIHtcbiAgICAgICAgICAgICAgICBpdGVtLmJ1eWVySWQgPSAnMCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaXRlbS5idXllcklkIDw9IDIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm51bWJlckFyci5wdXNoKGl0ZW0uY29kZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcblxuICAgICAgICBpZiAodHlwZSA9PT0gMSkge1xuICAgICAgICAgICAgdGhpcy5yYW5kb21OdW1iZXIodGhpcy5udW1iZXJBcnIsMSkgLy/pmo/kuIBcbiAgICAgICAgfWVsc2UgaWYgKHR5cGUgPT09IDIpIHtcbiAgICAgICAgICAgIHRoaXMuaGFsZkFyciA9IHRoaXMubnVtYmVyQXJyLnNsaWNlKDAsTWF0aC5mbG9vcih0aGlzLm51bWJlckFyci5sZW5ndGggLyAyKSkgIC8v5YmN5Y2KXG4gICAgICAgICAgICB0aGlzLnJhbmRvbU51bWJlcih0aGlzLmhhbGZBcnIsMilcbiAgICAgICAgfWVsc2UgaWYodHlwZSA9PT0gMykge1xuICAgICAgICAgICAgdGhpcy5oYWxmQXJyID0gdGhpcy5udW1iZXJBcnIuc2xpY2UoTWF0aC5mbG9vcih0aGlzLm51bWJlckFyci5sZW5ndGggLyAyKSkgIC8v5ZCO5Y2KXG4gICAgICAgICAgICB0aGlzLnJhbmRvbU51bWJlcih0aGlzLmhhbGZBcnIsMilcbiAgICAgICAgfWVsc2UgaWYodHlwZSA9PT0gNCkge1xuICAgICAgICAgICAgdGhpcy5oYWxmQXJyID0gdGhpcy5udW1iZXJBcnI7Ly/lhajpg6hcbiAgICAgICAgICAgIHRoaXMucmFuZG9tTnVtYmVyKHRoaXMuaGFsZkFyciwyKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoq5LuO5pWw57uE5Lit6ZqP5py65Y+W5LiA5Liq5pWwXG4gICAgICogQHBhcmFtIGFyciDmlbDmja7liJfooahcbiAgICAgKiBAcGFyYW0gdHlwZSBb5Y+v6YCJXSDpmo/mnLrnsbvlnotcbiAgICAgKi9cbiAgICBwcml2YXRlIHJhbmRvbU51bWJlcihhcnI6bnVtYmVyW10sdHlwZT86bnVtYmVyKXtcbiAgICAgICAgY29uc3QgcmFuZDpudW1iZXIgPSBNYXRoLmZsb29yKChNYXRoLnJhbmRvbSgpICogYXJyLmxlbmd0aCkpOyAvL+maj+S4gFxuICAgICAgICBcbiAgICAgICAgY29uc3QgY29kZSA9IGFycltyYW5kXTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0eXBlID09PSAxKSB7XG4gICAgICAgICAgICB0aGlzLnJhd0RhdGFBcnJfbmV3LmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGl0ZW0uY29kZSA9PT0gY29kZSkge1xuICAgICAgICAgICAgICAgICAgICBpdGVtLmJ1eWVySWQgPSAnMic7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZSA9PT0gMikge1xuICAgICAgICAgICAgYXJyLmZvckVhY2goZWwgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMucmF3RGF0YUFycl9uZXcuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVsID09PSBpdGVtLmNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uYnV5ZXJJZCA9ICcyJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICAvLyB0aGlzLm51bWJlckxpc3QucmVwZWF0WSA9IHRoaXMucmF3RGF0YUFycl9uZXcubGVuZ3RoO1xuICAgICAgICB0aGlzLm51bWJlckxpc3QuYXJyYXkgPSB0aGlzLnJhd0RhdGFBcnJfbmV3O1xuICAgICAgICB0aGlzLmdldFNlbGVjdE51bWJlcigpXG4gICAgfVxuXG4gICAgLyoq6I635Y+W5ZWG5ZOB6K+m5oOFXG4gICAgICogQHBhcmFtIGdvb2RzSWQg5ZWG5ZOBaWRcbiAgICAgKi9cbiAgICBwcml2YXRlIGdldEdvb2RzRGV0YWlscyhnb29kc0lkOnN0cmluZykge1xuICAgICAgICBhcGkuZ2V0R29vZHNEZXRhaWxzKGdvb2RzSWQpLnRoZW4oKHJlczphbnkpPT57XG5cbiAgICAgICAgICAgIC8vICDlj5HpgIF3ZWJzb2NrZXTkuovku7ZcbiAgICAgICAgICAgIHRoaXMuX3BlcmlvZCA9IHJlcy5wZXJpb2Q7XG4gICAgICAgICAgICBTb2NrZXQuc2VuZFdTUHVzaChgYnV5XyR7dGhpcy5fcGVyaW9kfWApXG5cbiAgICAgICAgICAgIHRoaXMucHJpY2UudGV4dCA9IGAkeytyZXMucHJpY2V9YDtcbiAgICAgICAgICAgIHRoaXMuZ29vZHNWYWx1ZS50ZXh0ID0gYCR7K3Jlcy5nb29kc1ZhbHVlfSBVU0RUYDtcbiAgICAgICAgICAgIHRoaXMucHJvZ3Jlc3NTcGVlZC52YWx1ZSA9ICtgJHtyZXMuc29sZE51bS9yZXMudG90YWxOdW19YDtcbiAgICAgICAgICAgIHRoaXMuc29sZE51bV9zb2xkTnVtLnRleHQgPSBgJHtyZXMuc29sZE51bX0vJHtyZXMudG90YWxOdW19YDtcbiAgICAgICAgICAgIHRoaXMucGVyaW9kLnRleHQgPSByZXMucGVyaW9kO1xuICAgICAgICAgICAgdGhpcy51bml0UHJpY2UgPSArcmVzLnByaWNlO1xuICAgICAgICAgICAgdGhpcy5yYXdEYXRhQXJyID0gcmVzLmNvZGVMaXN0O1xuICAgICAgICAgICAgdGhpcy5udW1iZXJMaXN0LmFycmF5ID0gdGhpcy5yYXdEYXRhQXJyOyAvL+WPt+eggeWIl+ihqFxuICAgICAgICAgICAgdGhpcy5yYW5kb21fb25lLnZpc2libGUgPSB0cnVlO1xuICAgICAgICAgICAgaWYgKHRoaXMubnVtYmVyTGlzdC5hcnJheS5sZW5ndGggPiAyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yYW5kb21fYWZ0ZXIudmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5yYW5kb21fYmVmb3JlLnZpc2libGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMucmFuZG9tX2FsbC52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgIHRoaXMucmFuZG9tX29uZS53aWR0aCA9IDMwMDtcbiAgICAgICAgICAgICAgICB0aGlzLnJhbmRvbV9vbmUuY2VudGVyWCA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLm51bWJlckxpc3QucmVwZWF0WCA9IDU7XG4gICAgICAgICAgICB0aGlzLm51bWJlckxpc3QucmVwZWF0WSA9IDQ7XG4gICAgICAgICAgICB0aGlzLm51bWJlckxpc3QuY2VsbHMuZm9yRWFjaCgoaXRlbTogTGF5YS5TcHJpdGUpID0+IHtcbiAgICAgICAgICAgICAgICBpdGVtLm9uKFwiR2V0SXRlbVwiLCB0aGlzLCB0aGlzLmdldFNlbGVjdE51bWJlcilcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pLmNhdGNoKChlcnI6YW55KT0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyLm1lc3NhZ2UpO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIC8qKuebkeWQrOe7n+iuoeWIl+ihqOaVsOaNrumAieS4reS4quaVsCAqL1xuICAgIHByaXZhdGUgZ2V0U2VsZWN0TnVtYmVyKCl7XG4gICAgICAgIHRoaXMuc2VsZWN0TnVtYmVyID0gMDtcbiAgICAgICAgdGhpcy5jb2RlTGlzdCA9ICcnO1xuICAgICAgICB0aGlzLm51bWJlckxpc3QuYXJyYXkuZm9yRWFjaChpdGVtPT57XG4gICAgICAgICAgICBpZiAoaXRlbS5idXllcklkID09PSAnMicpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdE51bWJlciA9IHRoaXMuc2VsZWN0TnVtYmVyICsgMTtcbiAgICAgICAgICAgICAgICBsZXQgY29kZVN0cmluZzpzdHJpbmcgPSBgJHt0aGlzLmNvZGVMaXN0fSR7dGhpcy5jb2RlTGlzdC5sZW5ndGggPiAwID8gJywnOicnfSR7aXRlbS5jb2RlfWA7XG4gICAgICAgICAgICAgICAgdGhpcy5jb2RlTGlzdCA9ICBjb2RlU3RyaW5nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICB0aGlzLnRvdGFsLnRleHQgPSB1dGlscy50b0RlY2ltYWwoKHRoaXMudW5pdFByaWNlICogdGhpcy5zZWxlY3ROdW1iZXIpLDIpICsgJyBVU0RUJztcbiAgICAgICAgdGhpcy50b3RhbFByaWNlID0gK3V0aWxzLnRvRGVjaW1hbCgodGhpcy51bml0UHJpY2UgKiB0aGlzLnNlbGVjdE51bWJlciksMik7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuc2VsZWN0TnVtYmVyO1xuICAgIH1cbn0iLCIvKipcbiAqIEBhdXRob3IgW1Npd2VuXVxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDg6MTZcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ4OjE2XG4gKiBAZGVzYyDpppbpobXohJrmnKxcbiAqL1xuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XG5pbXBvcnQgeyBUb2FzdCB9IGZyb20gXCIuLi92aWV3L1RvYXN0XCI7XG5pbXBvcnQgeyBHYW1lTW9kZWwgfSBmcm9tIFwiLi4vanMvR2FtZU1vZGVsXCI7XG5pbXBvcnQgdXRpbHMgZnJvbSAnLi4vanMvdXRpbHMnXG5pbXBvcnQgYXBpIGZyb20gXCIuLi9qcy9hcGlcIjtcblxuaW1wb3J0IHsgcG9zdCB9IGZyb20gJy4uL2pzL2h0dHAnO1xuaW1wb3J0IHsgU29ja2V0IH0gZnJvbSBcIi4uL2pzL3NvY2tldFwiO1xuaW1wb3J0IHsgVGFiYmFyIH0gZnJvbSBcIi4uL3ZpZXcvVGFiYmFyXCI7XG4vLyBpbXBvcnQgcmVjaGFyZ2VEaWFsb2cgZnJvbSAnLi4vdGVtcGxhdGUvcmVjaGFyZ2VEaWFsb2cnO1xuaW1wb3J0IHNjcmVlblV0aWxzIGZyb20gXCIuLi9qcy9zY3JlZW5VdGlsc1wiO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEhvbWUgZXh0ZW5kcyB1aS5ob21lVUkge1xuXG4gICAgLy8gcHJpdmF0ZSByZWNoYXJnZURpYWxvZzogcmVjaGFyZ2VEaWFsb2c7Ly/lhYXlgLzlvLnlh7pcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpXG4gICAgICAgIHRoaXMucmVjaGFyZ2VCb3gub24oTGF5YS5FdmVudC5DTElDSywgdGhpcywgdGhpcy5idG5SZWNoYXJnZUZ1bmMpO1xuICAgICAgICB0aGlzLmJ1eUhlbHAub24oTGF5YS5FdmVudC5DTElDSywgdGhpcywgdGhpcy5vcGVuQnV5SGVscClcbiAgICAgICAgdGhpcy5wdXRpbi5vbihMYXlhLkV2ZW50LkNMSUNLLCB0aGlzLCB0aGlzLnB1dEluRnVuYylcbiAgICAgICAgdGhpcy5nb19jZW50ZXIub24oTGF5YS5FdmVudC5DTElDSywgdGhpcywgdGhpcy5nb0NlbnRlcilcbiAgICB9XG4gICAgb25FbmFibGUoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuZ2V0VXNlckluZm8oKVxuICAgICAgICB0aGlzLnJhbmtUb2RheSgpXG4gICAgICAgIHRoaXMuZ2V0R29vZHNMaXN0KClcblxuICAgICAgICAvLyDnm5Hop4bngavnrq3mlbDmja7lj5jliqhcbiAgICAgICAgR2FtZU1vZGVsLmdldEluc3RhbmNlKCkub24oJ2dldFJvY2tldERhdGEnLCB0aGlzLCAocmVzOiBhbnkpID0+IHtcbiAgICAgICAgICAgIHRoaXMucm9ja2V0QW1vdW50LnRleHQgPSBgJHt1dGlscy50b0RlY2ltYWwocmVzLnBvdE1vbmV5LCAyKX1gXG4gICAgICAgICAgICB1dGlscy5jb3VudERvd24ocmVzLmNvdW50RG93biwgKCh0aW1lKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5yb2NrZXRDb3VudERvd24udGV4dCA9IHRpbWVcbiAgICAgICAgICAgIH0pKVxuICAgICAgICB9KVxuICAgICAgICAvLyDmmK/lkKblvIDlpZbkuobvvIzlvIDlpZbliLfmlrDllYblk4HliJfooahcbiAgICAgICAgR2FtZU1vZGVsLmdldEluc3RhbmNlKCkub24oJ2lzVG9nZ2xlJywgdGhpcywgKHJlczogYW55KSA9PiB7XG4gICAgICAgICAgICBpZiAoc2NyZWVuVXRpbHMuZ2V0U2NyZWVuKCkubmFtZSAgPT09ICdob21lJykge1xuICAgICAgICAgICAgICAgIHRoaXMuZ2V0R29vZHNMaXN0KClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcblxuICAgIH1cblxuXG4gICAgLyoq5YWF5YC8ICovXG4gICAgcHJpdmF0ZSBidG5SZWNoYXJnZUZ1bmMoKTogdm9pZCB7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gYGh0dHBzOi8vJHtkb2N1bWVudC5kb21haW59LyMvbWFpbl9QYWdlP3Nob3c9cmVjaGFyZ2VgXG4gICAgICAgIC8vIFRvYXN0LnNob3coJ+eCueWHu+WFheWAvCcpXG4gICAgICAgIC8vIHRoaXMucmVjaGFyZ2VEaWFsb2cgPSBuZXcgcmVjaGFyZ2VEaWFsb2coKTtcbiAgICAgICAgLy8gdGhpcy5yZWNoYXJnZURpYWxvZy55ID0gTGF5YS5zdGFnZS5oZWlnaHQgLSB0aGlzLnJlY2hhcmdlRGlhbG9nLmhlaWdodDtcbiAgICAgICAgLy8gdGhpcy5yZWNoYXJnZURpYWxvZy5wb3B1cEVmZmVjdCA9IExheWEuSGFuZGxlci5jcmVhdGUodGhpcywgdGhpcy5yZWNoYXJnZURpYWxvZ1BvcHVwRnVuKTtcbiAgICAgICAgLy8gdGhpcy5yZWNoYXJnZURpYWxvZy5jbG9zZUVmZmVjdCA9IExheWEuSGFuZGxlci5jcmVhdGUodGhpcywgdGhpcy5yZWNoYXJnZURpYWxvZ0Nsb3NlRnVuKTtcbiAgICAgICAgLy8gdGhpcy5yZWNoYXJnZURpYWxvZy5wb3B1cCgpO1xuICAgIH1cbiAgICAvKirnqbrmipUgKi9cbiAgICBwcml2YXRlIHB1dEluRnVuYygpIHtcbiAgICAgICAgLy8gVGFiYmFyLmdldEluc3RhbmNlKCkub3BlblNjZW5lKCd4Y3RqLnNjZW5lJylcbiAgICAgICAgVG9hc3Quc2hvdygn5pqC5pyq5byA5pS+77yM5pWs6K+35pyf5b6FJylcbiAgICB9XG5cbiAgICAvKirojrflj5bkuKrkurrkv6Hmga8gKi9cbiAgICBwcml2YXRlIGdldFVzZXJJbmZvKCkge1xuICAgICAgICBhcGkuZ2V0VXNlckluZm8oKS50aGVuKChyZXM6IGFueSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5uaWNrTmFtZS50ZXh0ID0gcmVzLnVzZXJJbmZvLm5pY2tOYW1lXG4gICAgICAgICAgICB0aGlzLm15QW1vdW50LnRleHQgPSBgJHt1dGlscy50b0RlY2ltYWwocmVzLnVzZXJJbmZvLm1vbmV5LCAyKX1gXG4gICAgICAgICAgICB0aGlzLmF2YXRhci5za2luID0gcmVzLnVzZXJJbmZvLmF2YXRhcjtcbiAgICAgICAgfSkuY2F0Y2goKGVycjogYW55KSA9PiB7XG4gICAgICAgICAgIFxuICAgICAgICB9KVxuICAgIH1cblxuICAgIC8qKuS7iuaXpeWkp+WlluaxoCAqL1xuICAgIHByaXZhdGUgcmFua1RvZGF5KCkge1xuICAgICAgICBhcGkuZ2V0UmFua1RvZGF5KCkudGhlbigocmVzOiBhbnkpID0+IHtcbiAgICAgICAgICAgIHRoaXMucm9ja2V0QW1vdW50LnRleHQgPSBgJHt1dGlscy50b0RlY2ltYWwocmVzLnBvdE1vbmV5LCAyKX1gXG4gICAgICAgICAgICB1dGlscy5jb3VudERvd24ocmVzLmNvdW50RG93biwgKCh0aW1lKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5yb2NrZXRDb3VudERvd24udGV4dCA9IHRpbWVcbiAgICAgICAgICAgIH0pKVxuICAgICAgICB9KS5jYXRjaCgoZXJyOiBhbnkpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyci5tZXNzYWdlKTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICAvKirojrflj5bpppbpobXllYblk4HliJfooaggKi9cbiAgICBwcml2YXRlIGdldEdvb2RzTGlzdCgpIHtcbiAgICAgICAgYXBpLmdldEdvb2RzTGlzdCgpLnRoZW4oKHJlczogYW55KSA9PiB7XG4gICAgICAgICAgICB0aGlzLmxpc3QucmVwZWF0WCA9IHJlcy5saXN0Lmxlbmd0aDtcbiAgICAgICAgICAgIHRoaXMubGlzdC5hcnJheSA9IHJlcy5saXN0O1xuICAgICAgICB9KS5jYXRjaCgoZXJyOiBhbnkpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyci5tZXNzYWdlKTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICAvKirnjqnms5Xku4vnu40gKi9cbiAgICBwcml2YXRlIG9wZW5CdXlIZWxwKCkge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9ICdodHRwczovL20ueHloai5pby8jL29yaWdpbi96aC9idXlIZWxwJztcbiAgICB9XG5cbiAgICBwcml2YXRlIGdvQ2VudGVyKCkge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IGBodHRwczovLyR7ZG9jdW1lbnQuZG9tYWlufS8jL21haW5fUGFnZWBcbiAgICB9XG5cbiAgICAvKirlvLnlh7rlhYXlgLznmoTmlYjmnpwgKi9cbiAgICAvLyByZWNoYXJnZURpYWxvZ1BvcHVwRnVuKGRpYWxvZzogTGF5YS5EaWFsb2cpIHtcbiAgICAvLyAgICAgZGlhbG9nLnNjYWxlKDEsIDEpO1xuICAgIC8vICAgICBkaWFsb2cuX2VmZmVjdFR3ZWVuID0gTGF5YS5Ud2Vlbi5mcm9tKGRpYWxvZyxcbiAgICAvLyAgICAgICAgIHsgeDogMCwgeTogTGF5YS5zdGFnZS5oZWlnaHQgKyBkaWFsb2cuaGVpZ2h0IH0sXG4gICAgLy8gICAgICAgICAzMDAsXG4gICAgLy8gICAgICAgICBMYXlhLkVhc2UubGluZWFyTm9uZSxcbiAgICAvLyAgICAgICAgIExheWEuSGFuZGxlci5jcmVhdGUoTGF5YS5EaWFsb2cubWFuYWdlciwgTGF5YS5EaWFsb2cubWFuYWdlci5kb09wZW4sIFtkaWFsb2ddKSwgMCwgZmFsc2UsIGZhbHNlKTtcbiAgICAvLyB9XG4gICAgLyoq5YWz6Zet5YWF5YC855qE5pWI5p6cICovXG4gICAgLy8gcmVjaGFyZ2VEaWFsb2dDbG9zZUZ1bihkaWFsb2c6IExheWEuRGlhbG9nKSB7XG4gICAgLy8gICAgIGRpYWxvZy5fZWZmZWN0VHdlZW4gPSBMYXlhLlR3ZWVuLnRvKGRpYWxvZyxcbiAgICAvLyAgICAgICAgIHsgeDogMCwgeTogTGF5YS5zdGFnZS5oZWlnaHQgKyBkaWFsb2cuaGVpZ2h0IH0sXG4gICAgLy8gICAgICAgICAzMDAsXG4gICAgLy8gICAgICAgICBMYXlhLkVhc2UubGluZWFyTm9uZSxcbiAgICAvLyAgICAgICAgIExheWEuSGFuZGxlci5jcmVhdGUoTGF5YS5EaWFsb2cubWFuYWdlciwgTGF5YS5EaWFsb2cubWFuYWdlci5kb0Nsb3NlLCBbZGlhbG9nXSksIDAsIGZhbHNlLCBmYWxzZSk7XG4gICAgLy8gfVxufSIsIi8qKlxuICogQGF1dGhvciBbU2l3ZW5dXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0ODoyOFxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDg6MjhcbiAqIEBkZXNjIOiusOW9lemhtemdouiEmuacrFxuICovXG5pbXBvcnQgeyB1aSB9IGZyb20gJy4uL3VpL2xheWFNYXhVSSdcbmltcG9ydCBhcGkgZnJvbSAnLi4vanMvYXBpJztcbmltcG9ydCBzY3JlZW5VdGlscyBmcm9tICcuLi9qcy9zY3JlZW5VdGlscyc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJlY29yZCBleHRlbmRzIHVpLnJlY29yZFVJIHtcblxuICAgIHN0YXRpYyByZWFkb25seSBIQUxGX1NDUk9MTF9FTEFTVElDX0RJU1RBTkNFOiBudW1iZXIgPSAxMDA7XG4gICAgcHJpdmF0ZSBfaXNTY3JvbGxPdmVyRWxhc3RpY0Rpc3RhbmNlOiBib29sZWFuO1xuICAgIHByaXZhdGUgcGFnZTpudW1iZXIgPSAxO1xuICAgIHByaXZhdGUgc2NyZWVuVHlwZTpudW1iZXIgPSAxO1xuXG4gICAgY29uc3RydWN0b3IoKXtcbiAgICAgICAgc3VwZXIoKVxuXG4gICAgICAgIHRoaXMuY2FueXUub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMudGFiU3dpdGNoLFsxXSlcbiAgICAgICAgdGhpcy53YW5ncWkub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMudGFiU3dpdGNoLFsyXSlcbiAgICAgICAgdGhpcy5vbihMYXlhLkV2ZW50LlJFU0laRSx0aGlzLHRoaXMub25SZXNpemUpXG4gICAgfVxuXG4gICAgb25FbmFibGUoKTp2b2lke1xuICAgICAgICB0aGlzLmdldE15T3JkZXJzKCk7XG4gICAgICAgIC8vIHRoaXMuZ2V0R29vZHNIaXN0b3J5KCk7XG5cbiAgICAgICAgLy/lj4LkuI7orrDlvZXmu5rliqjliqDovb3mm7TlpJpcbiAgICAgICAgdGhpcy5qb2luTGlzdC5zY3JvbGxCYXIuY2hhbmdlSGFuZGxlciA9IExheWEuSGFuZGxlci5jcmVhdGUodGhpcyx0aGlzLm9uSm9pbkxpc3RTY3JvbGxDaGFuZ2UsbnVsbCxmYWxzZSlcbiAgICAgICAgdGhpcy5qb2luTGlzdC5zY3JvbGxCYXIub24oTGF5YS5FdmVudC5FTkQsIHRoaXMsIHRoaXMub25Kb2luTGlzdFNjcm9sbEVuZClcbiAgICAgICAgLy/lvoDmnJ/orrDlvZXmu5rliqjliqDovb3mm7TlpJpcbiAgICAgICAgdGhpcy5wcmV2aW9vdXNMaXN0LnNjcm9sbEJhci5jaGFuZ2VIYW5kbGVyID0gTGF5YS5IYW5kbGVyLmNyZWF0ZSh0aGlzLHRoaXMub25QcmV2aW9vdXNMaXN0U2Nyb2xsQ2hhbmdlLG51bGwsZmFsc2UpXG4gICAgICAgIHRoaXMucHJldmlvb3VzTGlzdC5zY3JvbGxCYXIub24oTGF5YS5FdmVudC5FTkQsIHRoaXMsIHRoaXMub25QcmV2aW9vdXNMaXN0U2Nyb2xsRW5kKVxuICAgIH1cblxuICAgIC8qKuiOt+WPluWPguS4juiusOW9lSAqL1xuICAgIHByaXZhdGUgZ2V0TXlPcmRlcnMocGFnZSA9IDEpe1xuICAgICAgICBhcGkuZ2V0TXlPcmRlcnMocGFnZSkudGhlbigocmVzOmFueSk9PntcbiAgICAgICAgICAgIGlmICh0aGlzLmpvaW5MaXN0LmFycmF5ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5qb2luTGlzdC5hcnJheSA9IFsuLi50aGlzLmpvaW5MaXN0LmFycmF5LC4uLnJlc11cbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgIHRoaXMuam9pbkxpc3QuYXJyYXkgPSByZXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5qb2luTGlzdC5hcnJheS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHRoaXMuam9pbkxpc3QudmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkuY2F0Y2goKGVycjphbnkpPT57XG4gICAgICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyci5tZXNzYWdlKTtcbiAgICAgICAgfSlcbiAgICB9XG4gICAgLyoq6I635Y+W5b6A5pyf6K6w5b2VICovXG4gICAgcHJpdmF0ZSBnZXRHb29kc0hpc3RvcnkocGFnZT86bnVtYmVyKXtcbiAgICAgICAgYXBpLmdldEdvb2RzSGlzdG9yeShwYWdlKS50aGVuKChyZXM6YW55KT0+e1xuICAgICAgICAgICAgaWYgKHRoaXMucHJldmlvb3VzTGlzdC5hcnJheSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHRoaXMucHJldmlvb3VzTGlzdC5hcnJheSA9IFsuLi50aGlzLnByZXZpb291c0xpc3QuYXJyYXksLi4ucmVzXVxuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmV2aW9vdXNMaXN0LmFycmF5ID0gcmVzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMucHJldmlvb3VzTGlzdC5hcnJheS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHRoaXMucHJldmlvb3VzTGlzdC52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgIHRoaXMubm9EYXRhLnZpc2libGUgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KS5jYXRjaCgoZXJyOmFueSk9PntcbiAgICAgICAgICAgIHRoaXMubm9EYXRhLnZpc2libGUgPSB0cnVlO1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyLm1lc3NhZ2UpO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOWIh+aNouiusOW9leWIl+ihqFxuICAgICAqIEBwYXJhbSB0eXBlIDE65Y+C5LiO6K6w5b2VICAy77ya5b6A5pyf6K6w5b2VXG4gICAgICovXG4gICAgcHJpdmF0ZSB0YWJTd2l0Y2godHlwZTpudW1iZXIpe1xuICAgICAgICBpZiAoc2NyZWVuVXRpbHMuZ2V0U2NyZWVuKCkubmFtZSA9PT0gJ3JlY29yZCcgJiYgdGhpcy5zY3JlZW5UeXBlID09PSB0eXBlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zY3JlZW5UeXBlID0gdHlwZTtcbiAgICAgICAgdGhpcy5wYWdlID0gMTtcbiAgICAgICAgaWYgKHR5cGUgPT09IDEpIHtcbiAgICAgICAgICAgIHRoaXMuY2FueXUuc2tpbiA9ICdjb21wL2ltZ190YWJfYWN0aXZlLnBuZyc7XG4gICAgICAgICAgICB0aGlzLndhbmdxaS5za2luID0gJ2NvbXAvaW1nX3RhYi5wbmcnO1xuICAgICAgICAgICAgdGhpcy5nZXRNeU9yZGVycygpXG4gICAgICAgICAgICB0aGlzLnByZXZpb291c0xpc3Quc2Nyb2xsVG8oMClcbiAgICAgICAgICAgIHRoaXMucHJldmlvb3VzTGlzdC52aXNpYmxlID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLnByZXZpb291c0xpc3QuYXJyYXkgPSBbXTtcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICB0aGlzLndhbmdxaS5za2luID0gJ2NvbXAvaW1nX3RhYl9hY3RpdmUucG5nJztcbiAgICAgICAgICAgIHRoaXMuY2FueXUuc2tpbiA9ICdjb21wL2ltZ190YWIucG5nJztcbiAgICAgICAgICAgIHRoaXMuZ2V0R29vZHNIaXN0b3J5KCk7XG4gICAgICAgICAgICB0aGlzLmpvaW5MaXN0LnNjcm9sbFRvKDApO1xuICAgICAgICAgICAgdGhpcy5qb2luTGlzdC52aXNpYmxlID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLmpvaW5MaXN0LmFycmF5ID0gW107XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKirnm5Hop4blsY/luZXlpKflsI/lj5jljJYgKi9cbiAgICBvblJlc2l6ZSgpe1xuICAgICAgICAvL+WIl+ihqOmrmOW6pumAgumFjSA9IOWxj+W5lemrmOW6piAtIChiYW5uZXIgKyB0YWJiYXIpXG4gICAgICAgIHRoaXMuam9pbkxpc3QuaGVpZ2h0ID0gdGhpcy5oZWlnaHQgLSA0MzA7XG4gICAgICAgIHRoaXMucHJldmlvb3VzTGlzdC5oZWlnaHQgPSB0aGlzLmhlaWdodCAtIDQzMDtcbiAgICB9XG5cbiAgICAvKirlj4LkuI7orrDlvZXliJfooajmu5rliqggKi9cbiAgICBwcml2YXRlIG9uSm9pbkxpc3RTY3JvbGxDaGFuZ2UodjphbnkpIHtcbiAgICAgICAgaWYgKHYgPiB0aGlzLmpvaW5MaXN0LnNjcm9sbEJhci5tYXggKyBSZWNvcmQuSEFMRl9TQ1JPTExfRUxBU1RJQ19ESVNUQU5DRSkge1xuICAgICAgICAgICAgdGhpcy5faXNTY3JvbGxPdmVyRWxhc3RpY0Rpc3RhbmNlID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBwcml2YXRlIG9uSm9pbkxpc3RTY3JvbGxFbmQoKXtcbiAgICAgICAgaWYgKHRoaXMuX2lzU2Nyb2xsT3ZlckVsYXN0aWNEaXN0YW5jZSkge1xuICAgICAgICAgICAgdGhpcy5faXNTY3JvbGxPdmVyRWxhc3RpY0Rpc3RhbmNlID0gZmFsc2U7XG4gICAgICAgICAgICAvLyB0aGlzLmV2ZW50KEdhbWVFdmVudC5ORVhUX1BBR0UpO1xuICAgICAgICAgICAgdGhpcy5wYWdlID0gdGhpcy5wYWdlICsgMTtcbiAgICAgICAgICAgIHRoaXMuZ2V0TXlPcmRlcnModGhpcy5wYWdlKVxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coTG9nRmxhZy5nZXQoTG9nRmxhZy5VSSksIFwibmV4dCBwYWdlXCIpO1xuICAgICAgICAgICAgXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKirlj4LkuI7orrDlvZXliJfooajmu5rliqggKi9cbiAgICBwcml2YXRlIG9uUHJldmlvb3VzTGlzdFNjcm9sbENoYW5nZSh2OmFueSkge1xuICAgICAgICBpZiAodiA+IHRoaXMucHJldmlvb3VzTGlzdC5zY3JvbGxCYXIubWF4ICsgUmVjb3JkLkhBTEZfU0NST0xMX0VMQVNUSUNfRElTVEFOQ0UpIHtcbiAgICAgICAgICAgIHRoaXMuX2lzU2Nyb2xsT3ZlckVsYXN0aWNEaXN0YW5jZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcHJpdmF0ZSBvblByZXZpb291c0xpc3RTY3JvbGxFbmQoKXtcbiAgICAgICAgaWYgKHRoaXMuX2lzU2Nyb2xsT3ZlckVsYXN0aWNEaXN0YW5jZSkge1xuICAgICAgICAgICAgdGhpcy5faXNTY3JvbGxPdmVyRWxhc3RpY0Rpc3RhbmNlID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLnBhZ2UgPSB0aGlzLnBhZ2UgKyAxO1xuICAgICAgICAgICAgdGhpcy5nZXRHb29kc0hpc3RvcnkodGhpcy5wYWdlKVxuICAgICAgICB9XG4gICAgfVxufSIsIi8qKlxuICogQGF1dGhvciBbU2l3ZW5dXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0yMCAxMDoyNzoyNVxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjAgMTA6Mjc6MjVcbiAqIEBkZXNjIOeBq+eureWkp+WllumhtemdolxuICovXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcbmltcG9ydCB7IGdldCB9IGZyb20gXCIuLi9qcy9odHRwXCI7XG5pbXBvcnQgdXRpbHMgZnJvbSBcIi4uL2pzL3V0aWxzXCI7XG5pbXBvcnQgYXBpIGZyb20gXCIuLi9qcy9hcGlcIjtcbmltcG9ydCB7IFRhYmJhciB9IGZyb20gXCIuLi92aWV3L1RhYmJhclwiO1xuaW1wb3J0IHsgR2FtZU1vZGVsIH0gZnJvbSBcIi4uL2pzL0dhbWVNb2RlbFwiO1xuXG4gZXhwb3J0IGRlZmF1bHQgY2xhc3MgZ3JhbmRQcml4IGV4dGVuZHMgdWkuZ3JhbmRQcml4VUkge1xuICAgICBjb25zdHJ1Y3Rvcigpe1xuICAgICAgICAgc3VwZXIoKVxuICAgICAgICAgdGhpcy5yYW5rUHJpemVIZWxwLm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLm9wZW5SYW5rUHJpemVIZWxwKVxuICAgICAgICAgdGhpcy5idG5faGlzdG9yeS5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5CdG5oaXN0b3J5KVxuICAgICB9XG5cbiAgICAgb25FbmFibGUoKXtcbiAgICAgICAgdGhpcy5nZXRSYW5rVG9kYXkoKVxuICAgICAgICBMYXlhLnN0YWdlLm9uKExheWEuRXZlbnQuUkVTSVpFLHRoaXMsdGhpcy5vblJlc2l6ZSlcbiAgICAgICAgdGhpcy5vblJlc2l6ZSgpXG4gICAgICAgIC8vIOebkeinhueBq+eureaVsOaNruWPmOWKqFxuICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5vbignZ2V0Um9ja2V0RGF0YScsdGhpcywocmVzOmFueSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5ib251cy50ZXh0ID0gYCR7dXRpbHMudG9EZWNpbWFsKHJlcy5wb3RNb25leSwyKX1gIFxuICAgICAgICAgICAgdXRpbHMuY291bnREb3duKHJlcy5jb3VudERvd24sKCh0aW1lKT0+e1xuICAgICAgICAgICAgICAgIHRoaXMuQ291bnREb3duLnRleHQgPSB0aW1lXG4gICAgICAgICAgICB9KSlcbiAgICAgICAgfSlcbiAgICAgfVxuICAgICBvbkRpc2FibGUoKTp2b2lkIHtcbiAgICAgICAgTGF5YS5zdGFnZS5vZmYoTGF5YS5FdmVudC5SRVNJWkUsdGhpcyx0aGlzLm9uUmVzaXplKVxuICAgIH1cblxuICAgICAvKirojrflj5blpKflpZbkv6Hmga8gKi9cbiAgICBwcml2YXRlIGdldFJhbmtUb2RheSgpe1xuICAgICAgICBhcGkuZ2V0UmFua1RvZGF5KCkudGhlbigocmVzOmFueSk9PntcbiAgICAgICAgICAgIHRoaXMuYm9udXMudGV4dCA9IGAke3V0aWxzLnRvRGVjaW1hbChyZXMucG90TW9uZXksMil9YCBcbiAgICAgICAgICAgIHV0aWxzLmNvdW50RG93bihyZXMuY291bnREb3duLCgodGltZSk9PntcbiAgICAgICAgICAgICAgICB0aGlzLkNvdW50RG93bi50ZXh0ID0gdGltZVxuICAgICAgICAgICAgfSkpXG4gICAgICAgICAgICBpZiAocmVzLmxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvL+esrOS4gOWQjVxuICAgICAgICAgICAgaWYgKHJlcy5saXN0Lmxpc3QxLmRhdGEubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuYm94MS52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmFsb25lMS50ZXh0ID0gYOeLrOW+lyAke3V0aWxzLnRvRGVjaW1hbChyZXMubGlzdC5saXN0MS5kaXZpZG1vbmV5LDIpfSBVU0RUYFxuICAgICAgICAgICAgICAgIHRoaXMuUHJvcG9ydGlvbjEudGV4dCA9IGDljaDlpZbmsaAke3Jlcy5saXN0Lmxpc3QxLnBlcmNlbnR9YFxuICAgICAgICAgICAgICAgIHRoaXMucHJpeExpc3QxLmFycmF5ID0gcmVzLmxpc3QubGlzdDEuZGF0YVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gMi015ZCNXG4gICAgICAgICAgICBpZiAocmVzLmxpc3QubGlzdDIuZGF0YS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5ib3gyLnZpc2libGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuYWxvbmUyLnRleHQgPSBg5q+P5Lq6ICR7dXRpbHMudG9EZWNpbWFsKHJlcy5saXN0Lmxpc3QyLmRpdmlkbW9uZXkvNCwyKX0gVVNEVGBcbiAgICAgICAgICAgICAgICB0aGlzLlByb3BvcnRpb24yLnRleHQgPSBg5Y2g5aWW5rGgJHtyZXMubGlzdC5saXN0Mi5wZXJjZW50fWBcbiAgICAgICAgICAgICAgICB0aGlzLnByaXhMaXN0Mi5hcnJheSA9IHJlcy5saXN0Lmxpc3QyLmRhdGFcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIDUtMTXlkI1cbiAgICAgICAgICAgIGlmIChyZXMubGlzdC5saXN0My5kYXRhLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmJveDMudmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5hbG9uZTMudGV4dCA9IGDmr4/kurogJHt1dGlscy50b0RlY2ltYWwocmVzLmxpc3QubGlzdDMuZGl2aWRtb25leS8xMCwyKX0gVVNEVGBcbiAgICAgICAgICAgICAgICB0aGlzLlByb3BvcnRpb24zLnRleHQgPSBg5Y2g5aWW5rGgJHtyZXMubGlzdC5saXN0My5wZXJjZW50fWBcbiAgICAgICAgICAgICAgICB0aGlzLnByaXhMaXN0My5hcnJheSA9IHJlcy5saXN0Lmxpc3QzLmRhdGFcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8v5pyq55m75b2V5YiZ5LiN5pi+56S65Liq5Lq65o6S5ZCNXG4gICAgICAgICAgICBpZiAocmVzLmxpc3Quc2VsZi51c2VySWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm15UmFua0JveC52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLm15cmFua2luZy50ZXh0ID0gcmVzLmxpc3Quc2VsZi5yYW5rID4gMTUgPyAnMTUrJyA6IGAke3Jlcy5saXN0LnNlbGYucmFua31gO1xuICAgICAgICAgICAgICAgIHRoaXMuYXZhdGFyLnNraW4gPSByZXMubGlzdC5zZWxmLmF2YXRhcjtcbiAgICAgICAgICAgICAgICB0aGlzLm5pY2tOYW1lLnRleHQgPSByZXMubGlzdC5zZWxmLm5pY2tOYW1lO1xuICAgICAgICAgICAgICAgIHRoaXMudWlkLnRleHQgPSByZXMubGlzdC5zZWxmLnVzZXJJZDtcbiAgICAgICAgICAgICAgICB0aGlzLnZvbHVtZS50ZXh0ID0gYCR7dXRpbHMudG9EZWNpbWFsKHJlcy5saXN0LnNlbGYuY29uc3VtLDIpfSBVU0RUYFxuICAgICAgICAgICAgfVxuICAgICAgICB9KS5jYXRjaCgoZXJyOmFueSk9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyci5tZXNzYWdlKTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwcml2YXRlIEJ0bmhpc3RvcnkoKXtcbiAgICAgICAgVGFiYmFyLmdldEluc3RhbmNlKCkub3BlblNjZW5lKCdwcmlIaXN0b3J5U2NlbmUuc2NlbmUnKVxuICAgIH1cblxuICAgIC8qKuivtOaYjiAqL1xuICAgIHByaXZhdGUgb3BlblJhbmtQcml6ZUhlbHAoKXtcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSAnaHR0cHM6Ly9tLnh5aGouaW8vIy9vcmlnaW4vemgvcmFua1ByaXplSGVscCc7XG4gICAgfVxuICAgIHByaXZhdGUgb25SZXNpemUoKTp2b2lkIHtcbiAgICAgICAgdGhpcy5saXN0Qm94LmhlaWdodCA9IExheWEuc3RhZ2UuaGVpZ2h0IC0gNzAwO1xuICAgIH1cbiB9ICIsIlxuLyoqXG4gKiBAYXV0aG9yIFtTaXdlbl1cbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAzLTE4IDE2OjU5OjEzXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMy0xOCAxNjo1OToxM1xuICogQGRlc2Mg6aG16Z2i5Yqg6L29bG9hZGluZ1xuICovXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcblxuIGV4cG9ydCBkZWZhdWx0IGNsYXNzIGxvYWRpbmdTY2VuZSBleHRlbmRzIHVpLmxvYWRpbmdTY2VuZVVJIHtcbiAgICBcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKVxuICAgIH1cblxuICAgIHNldFByb2dyZXNzKHZhbHVlOm51bWJlcil7XG4gICAgICAgIGNvbnNvbGUubG9nKHZhbHVlLCflvZPliY3ov5vluqYnKTtcbiAgICAgICAgdGhpcy5sb2FkaW5nUHJvZ3Jlc3MudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgbGV0IHZhbDpzdHJpbmcgID0gYCR7dmFsdWUgKiAxMDB9YDtcbiAgICAgICAgdGhpcy5wcm9ncmVzcy50ZXh0ID0gYCR7cGFyc2VJbnQodmFsLDApfSVgO1xuICAgICAgICB0aGlzLnJvY2tldGxvYWRpbmcueCA9IDM2NSAqIHZhbHVlO1xuICAgIH1cbiB9XG4iLCIvKipcbiAqIEBhdXRob3IgW1Npd2VuXVxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjAgMTA6Mjc6MjVcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTIwIDEwOjI3OjI1XG4gKiBAZGVzYyDngavnrq3lpKflpZbljoblj7LorrDlvZXpobXpnaJcbiAqL1xuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XG5pbXBvcnQgdXRpbHMgZnJvbSBcIi4uL2pzL3V0aWxzXCI7XG5pbXBvcnQgYXBpIGZyb20gXCIuLi9qcy9hcGlcIjtcbmltcG9ydCB7IFRhYmJhciB9IGZyb20gXCIuLi92aWV3L1RhYmJhclwiO1xuXG4gZXhwb3J0IGRlZmF1bHQgY2xhc3MgZ3JhbmRQcml4IGV4dGVuZHMgdWkucHJpSGlzdG9yeVNjZW5lVUkge1xuICAgICBjb25zdHJ1Y3Rvcigpe1xuICAgICAgICBzdXBlcigpXG4gICAgIH1cblxuICAgICBvbkVuYWJsZSgpe1xuICAgICAgICB0aGlzLmdldFJhbmtIaXN0b3J5KClcbiAgICAgICAgTGF5YS5zdGFnZS5vbihMYXlhLkV2ZW50LlJFU0laRSx0aGlzLHRoaXMub25SZXNpemUpXG4gICAgICAgIHRoaXMub25SZXNpemUoKVxuICAgICB9XG4gICAgb25EaXNhYmxlKCk6dm9pZCB7XG4gICAgICAgIExheWEuc3RhZ2Uub2ZmKExheWEuRXZlbnQuUkVTSVpFLHRoaXMsdGhpcy5vblJlc2l6ZSlcbiAgICB9XG5cbiAgICAgLyoq6I635Y+W5aSn5aWW5L+h5oGvICovXG4gICAgcHJpdmF0ZSBnZXRSYW5rSGlzdG9yeSgpe1xuICAgICAgICBhcGkuZ2V0UmFua0hpc3RvcnkoKS50aGVuKChyZXM6YW55KT0+e1xuICAgICAgICAgICAgdGhpcy50b3RhbC50ZXh0ID0gYOaAu+WllumHkToke3V0aWxzLnRvRGVjaW1hbChyZXMucG90TW9uZXksMil9IFVTRFRgXG4gICAgICAgICAgICBpZiAocmVzLmxpc3QubGlzdDEuZGF0YS5sZW5ndGggPT09IDAgJiYgcmVzLmxpc3QubGlzdDIuZGF0YS5sZW5ndGggPT09IDAgJiYgcmVzLmxpc3QubGlzdDMuZGF0YS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmxpc3RCb3gudmlzaWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHRoaXMubm9EYXRhLnZpc2libGUgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy/nrKzkuIDlkI1cbiAgICAgICAgICAgIGlmIChyZXMubGlzdC5saXN0MS5kYXRhLmxlbmd0aCA+IDApIHsgIFxuICAgICAgICAgICAgICAgIHRoaXMubGlzdEJveC52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmJveDEudmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5hbG9uZTEudGV4dCA9IGDni6zlvpcgJHt1dGlscy50b0RlY2ltYWwocmVzLmxpc3QubGlzdDEuZGl2aWRtb25leSwyKX0gVVNEVGBcbiAgICAgICAgICAgICAgICB0aGlzLlByb3BvcnRpb24xLnRleHQgPSBg5Y2g5aWW5rGgJHtyZXMubGlzdC5saXN0MS5wZXJjZW50fWBcbiAgICAgICAgICAgICAgICB0aGlzLnByaXhMaXN0MS5hcnJheSA9IHJlcy5saXN0Lmxpc3QxLmRhdGFcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIDItNeWQjVxuICAgICAgICAgICAgaWYgKHJlcy5saXN0Lmxpc3QyLmRhdGEubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMubGlzdEJveC52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmJveDIudmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5hbG9uZTIudGV4dCA9IGDmr4/kurogJHt1dGlscy50b0RlY2ltYWwocmVzLmxpc3QubGlzdDIuZGl2aWRtb25leS80LDIpfSBVU0RUYFxuICAgICAgICAgICAgICAgIHRoaXMuUHJvcG9ydGlvbjIudGV4dCA9IGDljaDlpZbmsaAke3Jlcy5saXN0Lmxpc3QyLnBlcmNlbnR9YFxuICAgICAgICAgICAgICAgIHRoaXMucHJpeExpc3QyLmFycmF5ID0gcmVzLmxpc3QubGlzdDIuZGF0YVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgIC8vIDUtMTXlkI1cbiAgICAgICAgICAgICBpZiAocmVzLmxpc3QubGlzdDMuZGF0YS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5saXN0Qm94LnZpc2libGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuYm94My52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmFsb25lMy50ZXh0ID0gYOavj+S6uiAke3V0aWxzLnRvRGVjaW1hbChyZXMubGlzdC5saXN0My5kaXZpZG1vbmV5LzEwLDIpfSBVU0RUYFxuICAgICAgICAgICAgICAgIHRoaXMuUHJvcG9ydGlvbjMudGV4dCA9IGDljaDlpZbmsaAke3Jlcy5saXN0Lmxpc3QzLnBlcmNlbnR9YFxuICAgICAgICAgICAgICAgIHRoaXMucHJpeExpc3QzLmFycmF5ID0gcmVzLmxpc3QubGlzdDMuZGF0YVxuICAgICAgICAgICAgfVxuICAgICAgICB9KS5jYXRjaCgoZXJyOmFueSk9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyci5tZXNzYWdlKTtcbiAgICAgICAgfSlcbiAgICB9XG4gICAgcHJpdmF0ZSBvblJlc2l6ZSgpOnZvaWQge1xuICAgICAgICB0aGlzLmxpc3RCb3guaGVpZ2h0ID0gTGF5YS5zdGFnZS5oZWlnaHQgLSAyMDA7XG4gICAgfVxuIH0gIiwiLyoqXG4gKiBAYXV0aG9yIFtTaXdlbl1cbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTI2IDExOjA3OjM5XG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yNiAxMTowNzozOVxuICogQGRlc2Mg5YWl5Zu05ZCN5Y2VXG4gKi9cblxuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XG5pbXBvcnQgeyBUYWJiYXIgfSBmcm9tIFwiLi4vdmlldy9UYWJiYXJcIjtcbmltcG9ydCBhcGkgZnJvbSBcIi4uL2pzL2FwaVwiO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTaG9ydExpc3RlZCBleHRlbmRzIHVpLnNob3J0TGlzdGVkVUkge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpXG4gICAgICAgIHRoaXMub24oTGF5YS5FdmVudC5SRVNJWkUsIHRoaXMsIHRoaXMub25SZXNpemUpXG4gICAgfVxuXG4gICAgb25FbmFibGUoKSB7XG4gICAgICAgIHRoaXMuZ2V0U2hvcnRMaXN0ZWQoKVxuXG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXRTaG9ydExpc3RlZChwYWdlPzogbnVtYmVyKSB7XG4gICAgICAgIGFwaS5nZXRTaG9ydExpc3RlZChwYWdlKS50aGVuKChyZXM6IGFueSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zaG9ydExpc3QucmVwZWF0WSA9IHJlcy5sZW5ndGg7XG4gICAgICAgICAgICB0aGlzLnNob3J0TGlzdC5hcnJheSA9IHJlcztcbiAgICAgICAgICAgIHRoaXMuc2hvcnRMaXN0LnZpc2libGUgPSB0cnVlO1xuICAgICAgICB9KS5jYXRjaCgoZXJyOiBhbnkpID0+IHtcbiAgICAgICAgICAgIHRoaXMubm9EYXRhLnZpc2libGUgPSB0cnVlO1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyLm1lc3NhZ2UpO1xuICAgICAgICB9KVxuICAgIH1cbiAgICAvKirnm5Hop4blsY/luZXlpKflsI/lj5jljJYgKi9cbiAgICBvblJlc2l6ZSgpIHtcbiAgICAgICAgLy/liJfooajpq5jluqbpgILphY1cbiAgICAgICAgLy8gdGhpcy5zaG9ydExpc3QuaGVpZ2h0ID0gdGhpcy5oZWlnaHQgLSAxMDA7XG4gICAgfVxufVxuIiwiLyoqXG4gKiBAYXV0aG9yIFtTaXdlbl1cbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTI2IDEwOjIwOjE1XG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yNiAxMDoyMDoxNVxuICogQGRlc2Mg5Zac5LuO5aSp6ZmN5Lit5aWW5ZCN5Y2VXG4gKi9cbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xuaW1wb3J0IGFwaSBmcm9tIFwiLi4vanMvYXBpXCI7XG5pbXBvcnQgeyBUb2FzdCB9IGZyb20gXCIuLi92aWV3L1RvYXN0XCI7XG5pbXBvcnQgeyBUYWJiYXIgfSBmcm9tIFwiLi4vdmlldy9UYWJiYXJcIjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgV2lubmluZyBleHRlbmRzIHVpLnhjdGpVSSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKClcbiAgICAgICAgdGhpcy5idG5fc2hvcnRsaXN0Lm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLlNob3J0TGlzdEZ1bmMpXG4gICAgICAgIHRoaXMub24oTGF5YS5FdmVudC5SRVNJWkUsdGhpcyx0aGlzLm9uUmVzaXplKVxuICAgIH1cblxuICAgIG9uRW5hYmxlKCl7XG4gICAgICAgIHRoaXMuZ2V0WGN0akxpc3QoKVxuICAgIH1cblxuXG4gICAgcHJpdmF0ZSBnZXRYY3RqTGlzdChwYWdlPzpudW1iZXIpe1xuICAgICAgICBhcGkuZ2V0WGN0akxpc3QocGFnZSkudGhlbigocmVzOmFueSk9PntcbiAgICAgICAgICAgIHRoaXMud2lubmluZ0xpc3QucmVwZWF0WSA9IHJlcy5sZW5ndGg7XG4gICAgICAgICAgICB0aGlzLndpbm5pbmdMaXN0LmFycmF5ID0gcmVzO1xuICAgICAgICAgICAgdGhpcy53aW5uaW5nTGlzdC52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgfSkuY2F0Y2goKGVycjphbnkpPT57XG4gICAgICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyci5tZXNzYWdlKTtcbiAgICAgICAgfSlcbiAgICB9XG4gICAgXG4gICAgLyoq5p+l55yL5LuK5pel5YWl5Zu05ZCN5Y2VICovXG4gICAgcHJpdmF0ZSBTaG9ydExpc3RGdW5jKCl7XG4gICAgICAgIFRhYmJhci5nZXRJbnN0YW5jZSgpLm9wZW5TY2VuZSgnc2hvcnRMaXN0ZWQuc2NlbmUnKVxuICAgIH1cblxuICAgIC8qKuebkeinhuWxj+W5leWkp+Wwj+WPmOWMliAqL1xuICAgIG9uUmVzaXplKCl7XG4gICAgICAgIC8v5YiX6KGo6auY5bqm6YCC6YWNID0g5bGP5bmV6auY5bqmIC0gYmFubmVyXG4gICAgICAgIHRoaXMud2lubmluZ0xpc3QuaGVpZ2h0ID0gdGhpcy5oZWlnaHQgLSA2MDA7XG4gICAgfVxufVxuIiwiLyoqXG4gKiBAYXV0aG9yIFtTaXdlbl1cbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ4OjQwXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0ODo0MFxuICogQGRlc2Mg5Y+C5LiO6K6w5b2V6ISa5pysXG4gKi9cbmltcG9ydCB7IHVpIH0gZnJvbSAnLi4vdWkvbGF5YU1heFVJJ1xuaW1wb3J0IHV0aWxzIGZyb20gJy4uL2pzL3V0aWxzJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3Mgam9pblJlY29yZCBleHRlbmRzIHVpLnRlbXBsYXRlLmpvaW5SZWNvcmRzVUkge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpXG4gICAgfVxuICAgIHNldCBkYXRhU291cmNlKGl0ZW06IGFueSkge1xuICAgICAgICB0aGlzLl9kYXRhU291cmNlID0gaXRlbTtcblxuICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgICAgdGhpcy5wZXJpb2QudGV4dCA9IGl0ZW0ucGVyaW9kO1xuICAgICAgICAgICAgdGhpcy5nb29kc1ZhbHVlLnRleHQgPSBgJHsrdXRpbHMudG9EZWNpbWFsKGl0ZW0uZ29vZHNWYWx1ZSwyKX1gO1xuICAgICAgICAgICAgdGhpcy5jb2RlTGlzdC50ZXh0ID0gaXRlbS5jb2RlTGlzdC5sZW5ndGggPiAzOCA/IGAke2l0ZW0uY29kZUxpc3Quc3Vic3RyKDAsMzgpfS4uLmAgOiBpdGVtLmNvZGVMaXN0O1xuXG4gICAgICAgICAgICBpZiAoaXRlbS5zdGF0dXMgPT09ICcwJykge1xuICAgICAgICAgICAgICAgIHRoaXMubm9Qcml6ZS52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLm5vUHJpemUudGV4dCA9ICfmnKrlvIDlpZYnO1xuICAgICAgICAgICAgICAgIHRoaXMub3BlblRpbWUudGV4dCA9ICctJztcbiAgICAgICAgICAgICAgICB0aGlzLmhpdENvZGUudGV4dCA9ICctJztcbiAgICAgICAgICAgIH1lbHNlIGlmKGl0ZW0uc3RhdHVzID09PSAnMScpe1xuICAgICAgICAgICAgICAgIHRoaXMubm9Qcml6ZS52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLm5vUHJpemUudGV4dCA9ICflvIDlpZbkuK0nO1xuICAgICAgICAgICAgICAgIHRoaXMub3BlblRpbWUudGV4dCA9ICctJztcbiAgICAgICAgICAgICAgICB0aGlzLmhpdENvZGUudGV4dCA9ICctJztcbiAgICAgICAgICAgIH1lbHNlIGlmKGl0ZW0uc3RhdHVzID09PSAnMicgJiYgIWl0ZW0uaGl0KXtcbiAgICAgICAgICAgICAgICB0aGlzLm5vUHJpemUudmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5ub1ByaXplLnRleHQgPSAn5pyq5Lit5aWWJztcbiAgICAgICAgICAgICAgICB0aGlzLm9wZW5UaW1lLnRleHQgPSB1dGlscy5mb3JtYXREYXRlVGltZShpdGVtLm9wZW5UaW1lKTtcbiAgICAgICAgICAgICAgICB0aGlzLmhpdENvZGUudGV4dCA9IGl0ZW0uaGl0Q29kZTtcbiAgICAgICAgICAgIH1lbHNlIGlmKGl0ZW0uc3RhdHVzID09PSAnMicgJiYgaXRlbS5oaXQpe1xuICAgICAgICAgICAgICAgIHRoaXMucHJpemUudmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5vcGVuVGltZS50ZXh0ID0gdXRpbHMuZm9ybWF0RGF0ZVRpbWUoaXRlbS5vcGVuVGltZSk7XG4gICAgICAgICAgICAgICAgdGhpcy5oaXRDb2RlLnRleHQgPSBpdGVtLmhpdENvZGU7XG4gICAgICAgICAgICAgICAgdGhpcy5hd2FyZC52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmF3YXJkLnRleHQgPSBgJHsrdXRpbHMudG9EZWNpbWFsKGl0ZW0uYXdhcmQsMil9IFVTRFRgO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufSIsIi8qKlxuICogQGF1dGhvciBbU2l3ZW5dXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0ODo1MFxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDg6NTBcbiAqIEBkZXNjIOi0reS5sOmhtemdouWPt+eggeWIl+ihqOiEmuacrFxuICovXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcbmltcG9ydCB7IFRvYXN0IH0gZnJvbSBcIi4uL3ZpZXcvVG9hc3RcIjtcbmltcG9ydCB7IEdhbWVNb2RlbCB9IGZyb20gXCIuLi9qcy9HYW1lTW9kZWxcIjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgbnVtYmVyTGlzdERPTSBleHRlbmRzIHVpLnRlbXBsYXRlLm51bWJlckxpc3RET01VSSB7XG4gICAgcHJpdmF0ZSB1c2VySWQ6c3RyaW5nID0gJyc7XG5cbiAgICBjb25zdHJ1Y3Rvcigpe1xuICAgICAgICBzdXBlcigpXG4gICAgICAgIHRoaXMub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuY2xpY2tOdW1iZXIpXG4gICAgfVxuICAgIHNldCBkYXRhU291cmNlKGl0ZW06IGFueSkge1xuICAgICAgICB0aGlzLl9kYXRhU291cmNlID0gaXRlbTtcbiAgICAgICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgICAgIHRoaXMuY29kZS50ZXh0ID0gaXRlbS5jb2RlO1xuICAgICAgICAgICAgdGhpcy5iZ0ltZy5za2luID0gdGhpcy5yZXR1cm5TdGF0dXNJbWcoaXRlbS5idXllcklkKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgb25FbmFibGUoKXtcbiAgICAgICAgLy/ojrflj5bnlKjmiLfotYTkuqdcbiAgICAgICAgY29uc3QgdXNlckluZm86YW55ID0gR2FtZU1vZGVsLmdldEluc3RhbmNlKCkudXNlckluZm87XG4gICAgICAgIHRoaXMudXNlcklkID0gdXNlckluZm8udXNlcklkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOmAieaLqeWPt+eggVxuICAgICAqIEBwYXJhbSBpdGVtIOW9k+WJjeaMiemSrlxuICAgICAqL1xuICAgIHByaXZhdGUgY2xpY2tOdW1iZXIoaXRlbTphbnkpOnZvaWQge1xuICAgICAgICBpZiAoK3RoaXMuX2RhdGFTb3VyY2UuYnV5ZXJJZCA+IDEwKSB7IC8v55So5oi3aWTlv4XlpKfkuo4xMO+8jOS9nOS4uuWIpOaWreS+neaNrlxuICAgICAgICAgICAgVG9hc3Quc2hvdygn6K+l5Y+356CB5bey6KKr6LSt5LmwJylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfWVsc2UgaWYodGhpcy5fZGF0YVNvdXJjZS5idXllcklkID09PSAnMCcpe1xuICAgICAgICAgICAgdGhpcy5iZ0ltZy5za2luID0gdGhpcy5yZXR1cm5TdGF0dXNJbWcoJzInKVxuICAgICAgICAgICAgdGhpcy5fZGF0YVNvdXJjZS5idXllcklkID0gJzInO1xuICAgICAgICB9ZWxzZSBpZih0aGlzLl9kYXRhU291cmNlLmJ1eWVySWQgPT09ICcyJyl7XG4gICAgICAgICAgICB0aGlzLmJnSW1nLnNraW4gPSB0aGlzLnJldHVyblN0YXR1c0ltZygnMCcpXG4gICAgICAgICAgICB0aGlzLl9kYXRhU291cmNlLmJ1eWVySWQgPSAnMCc7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5ldmVudChcIkdldEl0ZW1cIik7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiDmoLnmja7nirbmgIHov5Tlm57lr7nlupTlm77niYdcbiAgICAgKiBAcGFyYW0gYnV5ZXJJZCAgMO+8muWPr+mAiSAy77ya6YCJ5LitIOWkp+S6jjEwOuS4jeWPr+mAiSAg562J5LqO6Ieq5bexdXNlcklk77ya5bey6YCJXG4gICAgICogXG4gICAgKi9cbiAgICBwcml2YXRlIHJldHVyblN0YXR1c0ltZyhidXllcklkOnN0cmluZyl7XG4gICAgICAgIGlmIChidXllcklkID09PSB0aGlzLnVzZXJJZCkge1xuICAgICAgICAgICAgcmV0dXJuICdjb21wL2ltZ195aXh1YW5fc2VsZWN0MjAucG5nJ1xuICAgICAgICB9ZWxzZSBpZigrYnV5ZXJJZCA+IDEwKXsgLy/nlKjmiLdpZOW/heWkp+S6jjEw77yM5L2c5Li65Yik5pat5L6d5o2uXG4gICAgICAgICAgICByZXR1cm4gJ2NvbXAvaW1nX25vX3NlbGVjdDIwLnBuZydcbiAgICAgICAgfWVsc2UgaWYoYnV5ZXJJZCA9PT0gJzInKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2NvbXAvaW1nX29rX3NlbGVjdDIwLnBuZydcbiAgICAgICAgfWVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuICdjb21wL2ltZ19rZXh1YW5fc2VsZWN0MjAucG5nJ1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgXG59IiwiLyoqXG4gKiBAYXV0aG9yIFtTaXdlbl1cbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ5OjA4XG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0OTowOFxuICogQGRlc2Mg5b6A5pyf6K6w5b2V6ISa5pysXG4gKi9cbmltcG9ydCB7IHVpIH0gZnJvbSAnLi4vdWkvbGF5YU1heFVJJ1xuaW1wb3J0IHV0aWxzIGZyb20gJy4uL2pzL3V0aWxzJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgcHJldmlvdXNSZWNvcmQgZXh0ZW5kcyB1aS50ZW1wbGF0ZS5wcmV2aW91c1JlY29yZHNVSSB7XG4gICAgY29uc3RydWN0b3IoKXtcbiAgICAgICAgc3VwZXIoKVxuICAgICAgICB0aGlzLnR4SGFzaC5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5zZWVIYXNoKVxuICAgIH1cbiAgICBzZXQgZGF0YVNvdXJjZShpdGVtOiBhbnkpIHtcbiAgICAgICAgdGhpcy5fZGF0YVNvdXJjZSA9IGl0ZW07XG4gICAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgICAgICB0aGlzLnBlcmlvZC50ZXh0ID0gaXRlbS5wZXJpb2Q7XG4gICAgICAgICAgICB0aGlzLmdvb2RzTmFtZS50ZXh0ID0gaXRlbS5nb29kc05hbWU7XG4gICAgICAgICAgICB0aGlzLnR4SGFzaC50ZXh0ID0gaXRlbS50eEhhc2g7XG4gICAgICAgICAgICB0aGlzLmhpdENvZGUudGV4dCA9IGl0ZW0uaGl0Q29kZTtcbiAgICAgICAgICAgIHRoaXMub3BlblRpbWUudGV4dCA9IHV0aWxzLmZvcm1hdERhdGVUaW1lKGl0ZW0ub3BlblRpbWUpO1xuICAgICAgICAgICAgdGhpcy5qb2luZWROdW0udGV4dCA9IGl0ZW0uam9pbmVkTnVtO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoq5p+l55yL5ZOI5biMICovXG4gICAgc2VlSGFzaCgpOnZvaWQge1xuICAgICAgICBjb25zdCBkb21haW4gPSBkb2N1bWVudC5kb21haW47XG4gICAgICAgIGlmIChkb21haW4uaW5kZXhPZigndC1jZW50ZXInKSA+PSAwIHx8IGRvbWFpbiA9PT0gJ2xvY2FsaG9zdCcpIHtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gYGh0dHBzOi8vcm9wc3Rlbi5ldGhlcnNjYW4uaW8vdHgvJHt0aGlzLl9kYXRhU291cmNlLnR4SGFzaH1gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBgaHR0cHM6Ly9ldGhlcnNjYW4uaW8vdHgvJHt0aGlzLl9kYXRhU291cmNlLnR4SGFzaH1gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgIH1cbn0iLCJcbi8qKlxuICogQGF1dGhvciBbU2l3ZW5dXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0yMiAxMTo0MDo0MlxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjIgMTE6NDA6NDJcbiAqIEBkZXNjIOeBq+eureWkp+WlluWOhuWPsuiusOW9leiEmuacrFxuICovXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcbmltcG9ydCB1dGlscyBmcm9tIFwiLi4vanMvdXRpbHNcIjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgcHJpSGlzdG9yeSBleHRlbmRzIHVpLnRlbXBsYXRlLnByaUhpc3RvcnlVSSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKClcbiAgICB9XG4gICAgc2V0IGRhdGFTb3VyY2UoaXRlbTogYW55KSB7XG4gICAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgICAgICB0aGlzLnJhbmtOby50ZXh0ID0gaXRlbS5yYW5rIDwgMTAgPyBgMCR7aXRlbS5yYW5rfWAgOiBgJHtpdGVtLnJhbmt9YDtcbiAgICAgICAgICAgIHRoaXMubmlja05hbWUudGV4dCA9IGl0ZW0ubmlja05hbWU7XG4gICAgICAgICAgICB0aGlzLlVJRC50ZXh0ID0gYFVJRDogJHtpdGVtLnVzZXJJZH1gO1xuICAgICAgICAgICAgdGhpcy5Wb2x1bWUudGV4dCA9IGAke3V0aWxzLnRvRGVjaW1hbChpdGVtLmNvbnN1bSwyKX0gVVNEVGBcbiAgICAgICAgfVxuICAgIH1cbn0gXG4iLCJcbi8qKlxuICogQGF1dGhvciBbU2l3ZW5dXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0yMiAxMTo0MDo0MlxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjIgMTE6NDA6NDJcbiAqIEBkZXNjIOeBq+eureWkp+WlluaOkuihjOamnFxuICovXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcbmltcG9ydCB1dGlscyBmcm9tIFwiLi4vanMvdXRpbHNcIjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgcHJpeExpc3QgZXh0ZW5kcyB1aS50ZW1wbGF0ZS5wcml4TGlzdFVJIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKVxuICAgIH1cbiAgICBzZXQgZGF0YVNvdXJjZShpdGVtOiBhbnkpIHtcbiAgICAgICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgICAgIHRoaXMubm8xLnZpc2libGUgPSBpdGVtLnJhbmsgPT09IDEgPyB0cnVlIDogZmFsc2U7XG4gICAgICAgICAgICB0aGlzLnJhbmtOby52aXNpYmxlID0gaXRlbS5yYW5rID09PSAxID8gZmFsc2UgOiB0cnVlO1xuICAgICAgICAgICAgdGhpcy5yYW5rTm8udGV4dCA9IGl0ZW0ucmFuaztcbiAgICAgICAgICAgIHRoaXMuYXZhdGFyLnNraW4gPSBpdGVtLmF2YXRhcjtcbiAgICAgICAgICAgIHRoaXMubmlja05hbWUudGV4dCA9IGl0ZW0ubmlja05hbWU7XG4gICAgICAgICAgICB0aGlzLlVJRC50ZXh0ID0gYFVJRDogJHtpdGVtLnVzZXJJZH1gO1xuICAgICAgICAgICAgdGhpcy50b2RheVZvbHVtZS50ZXh0ID0gYCR7dXRpbHMudG9EZWNpbWFsKGl0ZW0uY29uc3VtLDIpfSBVU0RUYFxuICAgICAgICB9XG4gICAgfVxufSBcbiIsIi8qKlxuICogQGF1dGhvciBbU2l3ZW5dXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0OToyM1xuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDk6MjNcbiAqIEBkZXNjIOS6pOaYk+Wvhueggei+k+WFpeW8ueeql+iEmuacrFxuICovXG5pbXBvcnQgeyB1aSB9IGZyb20gJy4uL3VpL2xheWFNYXhVSSdcbmltcG9ydCBUaXBzRGlhTG9nIGZyb20gJy4vdGlwRGlhbG9nJztcbmltcG9ydCB7IFRvYXN0IH0gZnJvbSAnLi4vdmlldy9Ub2FzdCc7XG5pbXBvcnQgR3Vlc3NpbmcgZnJvbSAnLi4vc2NyaXB0L0d1ZXNzaW5nJztcbmltcG9ydCBhcGkgZnJvbSAnLi4vanMvYXBpJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSXB0UHN3RG9tIGV4dGVuZHMgdWkudGVtcGxhdGUuSW5wdXRQd2REaWFsb2dVSSB7XG5cbiAgICBwcml2YXRlIHBlcmlvZDpzdHJpbmcgPSAnJzsvL+acn+WPt1xuICAgIHByaXZhdGUgY29kZUxpc3Q6c3RyaW5nID0gJyc7Ly/otK3kubDlj7fnoIFcbiAgICBwcml2YXRlIGlzRW50ZXI6Ym9vbGVhbiA9IGZhbHNlOyAvL+WHveaVsOiKgua1gVxuICAgIHByaXZhdGUgQWxsQ29kZUxpc3Q6YW55ID0gW107Ly/miYDmnInlj7fnoIHliJfooahcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpXG4gICAgfVxuICAgIG9uRW5hYmxlKCl7XG4gICAgICAgIHRoaXMuYnRuQ2xvc2Uub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuY2xvc2VGdW5jKVxuICAgICAgICB0aGlzLklwdFBzdy5vbihMYXlhLkV2ZW50LkZPQ1VTLHRoaXMsdGhpcy5vbkZvY3VzKVxuICAgICAgICB0aGlzLklwdFBzdy5vbihMYXlhLkV2ZW50LkJMVVIsdGhpcyx0aGlzLm9uQkxVUilcbiAgICAgICAgdGhpcy5JcHRQc3cub24oTGF5YS5FdmVudC5LRVlfVVAsdGhpcyx0aGlzLm9uQ2hhbmdlKVxuICAgIH1cblxuICAgIC8qKuiOt+WPluS8oOmAkueahOWPguaVsCAqL1xuICAgIHNldERhdGEoZGF0YTphbnkpIHtcbiAgICAgICAgdGhpcy5wZXJpb2QgPSBkYXRhLnBlcmlvZDtcbiAgICAgICAgdGhpcy5jb2RlTGlzdCA9IGRhdGEuY29kZUxpc3Q7XG4gICAgICAgIHRoaXMuQWxsQ29kZUxpc3QgPSBkYXRhLkFsbENvZGVMaXN0O1xuICAgIH1cblxuICAgIC8qKui+k+WFpeWGheWuueaUueWPmCAqL1xuICAgIHByaXZhdGUgb25DaGFuZ2UoKXtcbiAgICAgICAgaWYgKCF0aGlzLmlzRW50ZXIgJiYgdGhpcy5JcHRQc3cudGV4dC5sZW5ndGggPT09IDYpIHtcbiAgICAgICAgICAgIHRoaXMudHJhZGVCdXkoKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoq6LSt5LmwICovXG4gICAgcHJpdmF0ZSB0cmFkZUJ1eSgpe1xuICAgICAgICB0aGlzLmlzRW50ZXIgPSB0cnVlO1xuICAgICAgICBhcGkucG9zdFRyYWRlQnV5KHRoaXMucGVyaW9kLHRoaXMuY29kZUxpc3QsdGhpcy5JcHRQc3cudGV4dCkudGhlbigocmVzOmFueSk9PntcbiAgICAgICAgICAgIHRoaXMuaXNFbnRlciA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5jbG9zZUZ1bmMoKTtcblxuICAgICAgICAgICAgdGhpcy5ldmVudChcInJlZnJlc2hEYXRhXCIpOy8v5Yi35paw5pWw5o2u5YiX6KGoXG4gICAgICAgICAgICAvLyDotK3kubDmiJDlip/lvLnlh7rlr7nor53moYZcbiAgICAgICAgICAgIGxldCB0aXBzRGlhbG9nOlRpcHNEaWFMb2cgPSBuZXcgVGlwc0RpYUxvZygpXG4gICAgICAgICAgICB0aXBzRGlhbG9nLnBvcHVwKClcbiAgICAgICAgICAgIHRpcHNEaWFsb2cuc2V0RGF0YSh7XG4gICAgICAgICAgICAgICAgQWxsQ29kZUxpc3Q6dGhpcy5BbGxDb2RlTGlzdFxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSkuY2F0Y2goKGVycjphbnkpPT57XG4gICAgICAgICAgICB0aGlzLmlzRW50ZXIgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuY2xvc2VGdW5jKCk7XG5cbiAgICAgICAgICAgIFRvYXN0LnNob3coZXJyLm1lc3NhZ2UpXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgLyoq5YWz6Zet5a+G56CB5qGGICovXG4gICAgcHJpdmF0ZSBjbG9zZUZ1bmMoKXtcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICB0aGlzLklwdFBzdy50ZXh0ID0gJyc7XG4gICAgfVxuICAgIC8qKui+k+WFpeahhuiOt+W+l+eEpueCuSAqL1xuICAgIHByaXZhdGUgb25Gb2N1cygpe1xuICAgICAgICB0aGlzLnRvcCA9IDE1MDtcbiAgICB9XG4gICAgLyoq6L6T5YWl5qGG6I635b6X54Sm54K5ICovXG4gICAgcHJpdmF0ZSBvbkJMVVIoKXtcbiAgICAgICB0aGlzLnRvcCA9IDQ0MDtcbiAgICB9XG59IiwiXG4vKipcbiAqIEBhdXRob3IgW1Npd2VuXVxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjIgMTE6NDA6NDJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTIyIDExOjQwOjQyXG4gKiBAZGVzYyDngavnrq3lpKflpZbngavnrq3lkI3ljZVcbiAqL1xuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XG5pbXBvcnQgdXRpbHMgZnJvbSBcIi4uL2pzL3V0aWxzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHByaXhMaXN0IGV4dGVuZHMgdWkudGVtcGxhdGUucmFua2luZ0xpc3RVSSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKClcbiAgICB9XG4gICAgc2V0IGRhdGFTb3VyY2UoaXRlbTogYW55KSB7XG4gICAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgICAgICB0aGlzLnJhbmtpbmcudGV4dCA9IGl0ZW0ucmFuaztcbiAgICAgICAgICAgIHRoaXMubmlja05hbWUudGV4dCA9IGl0ZW0ubmlja05hbWUubGVuZ3RoID4gNCA/IGAke2l0ZW0ubmlja05hbWUuc3Vic3RyKDAsNCl9Li4uYCA6IGl0ZW0ubmlja05hbWU7XG4gICAgICAgICAgICB0aGlzLnVpZC50ZXh0ID0gaXRlbS51c2VySWQ7XG4gICAgICAgICAgICB0aGlzLmFtb3VudC50ZXh0ID0gaXRlbS5hbW91bnQ7XG4gICAgICAgIH1cbiAgICB9XG59IFxuIiwiLyoqXG4gKiBAYXV0aG9yIFtTaXdlbl1cbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTI3IDEwOjA2OjE4XG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yNyAxMDowNjoxOFxuICogQGRlc2Mg5YWF5YC85o+Q5biB5by55Ye66ISa5pysXG4gKi9cbmltcG9ydCB7IHVpIH0gZnJvbSAnLi4vdWkvbGF5YU1heFVJJ1xuIFxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVjaGFyZ2VEaWFsb2cgZXh0ZW5kcyB1aS50ZW1wbGF0ZS5yZWNoYXJnZURpYWxvZ1VJIHtcbiAgICBjb25zdHJ1Y3Rvcigpe1xuICAgICAgICBzdXBlcigpXG4gICAgfVxuXG4gICAgb25FbmFibGUoKXtcbiAgICAgICAgdGhpcy5idG5fcXVpY2tSZWNoYXJnZS5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5xdWlja1JlY2hhcmdlRnVuYylcbiAgICAgICAgdGhpcy5idG5fd2l0aGRyYXcub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMud2l0aGRyYXdGdW5jKVxuICAgIH1cblxuICAgIC8qKuW/q+aNt+WFheWAvCAqL1xuICAgIHByaXZhdGUgcXVpY2tSZWNoYXJnZUZ1bmMoKXtcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBgaHR0cHM6Ly8ke2RvY3VtZW50LmRvbWFpbn0vIy9jaGFyZ2VLdWFpQmlgXG4gICAgfVxuICAgIC8qKlVTRFTpkrHljIXmj5DluIEgKi9cbiAgICB3aXRoZHJhd0Z1bmMoKXtcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBgaHR0cHM6Ly8ke2RvY3VtZW50LmRvbWFpbn0vIy93YWxsZXRDaGFyZ2VgXG4gICAgfVxufVxuXG4iLCIvKipcbiAqIEBhdXRob3IgW1Npd2VuXVxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjYgMTE6MTI6MDlcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTI2IDExOjEyOjA5XG4gKiBAZGVzYyDlhaXlm7TlkI3ljZXliJfooahcbiAqL1xuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHNob3J0TGlzdEJveCBleHRlbmRzIHVpLnRlbXBsYXRlLnNob3J0TGlzdFVJIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKVxuICAgIH1cbiAgICBzZXQgZGF0YVNvdXJjZShpdGVtOiBhbnkpIHtcbiAgICAgICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgICAgIHRoaXMubnVtYmVyLnRleHQgPSBpdGVtLnNob3J0bGlzdGVkTnVtYmVyIDwgMTAgPyBgMCR7aXRlbS5zaG9ydGxpc3RlZE51bWJlcn1gIDogaXRlbS5zaG9ydGxpc3RlZE51bWJlcjtcbiAgICAgICAgICAgIHRoaXMubmlja05hbWUudGV4dCA9IGl0ZW0ubmlja05hbWU7XG4gICAgICAgICAgICB0aGlzLnVzZXJJZC50ZXh0ID0gaXRlbS51c2VySWQ7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCIvKipcbiAqIEBhdXRob3IgW1Npd2VuXVxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDQ6MDJcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ0OjAyXG4gKiBAZGVzYyDotK3kubDmiJDlip/lkI7nmoTmj5DnpLrmoYbohJrmnKxcbiAqL1xuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XG5pbXBvcnQgeyBUYWJiYXIgfSBmcm9tIFwiLi4vdmlldy9UYWJiYXJcIjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGlwc0RpYUxvZyBleHRlbmRzIHVpLnRlbXBsYXRlLlRpcHNEaWFsb2dVSSB7XG4gICAgcHJpdmF0ZSBBbGxDb2RlTGlzdDpvYmplY3RbXSA9IFtdOy8v5Y+356CB5YiX6KGoXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKClcbiAgICB9XG4gICAgb25FbmFibGUoKXtcbiAgICAgICAgdGhpcy5idG5Db250aW51ZS5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5jbG9zZUZ1bmMpXG4gICAgICAgIHRoaXMuYnRuVmlld1JlY29yZC5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy52aWV3UmVjb3JkRnVuYylcbiAgICAgICAgXG4gICAgfVxuXG4gICAgLyoq6I635Y+W5Lyg6YCS55qE5Y+C5pWwICovXG4gICAgc2V0RGF0YShkYXRhOmFueSkge1xuICAgICAgICB0aGlzLkFsbENvZGVMaXN0ID0gZGF0YS5BbGxDb2RlTGlzdDtcbiAgICB9XG5cbiAgICAvKirlhbPpl63lr4bnoIHmoYYgKi9cbiAgICBwcml2YXRlIGNsb3NlRnVuYygpe1xuXG4gICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgLy8g6Iul5YWo6YOo6KKr6LSt5Lmw77yM5YiZ5Zue5Yiw6aaW6aG16YeN5paw6YCJ5oup6LSt5Lmw5pyf5Y+3XG4gICAgICAgIGxldCBjb3VudDpudW1iZXIgPSAwO1xuICAgICAgICB0aGlzLkFsbENvZGVMaXN0LmZvckVhY2goKHY6YW55KSA9PiB7XG4gICAgICAgICAgICBpZiAodi5idXllcklkICE9PSAnMCcpIHtcbiAgICAgICAgICAgICAgICBjb3VudCA9IGNvdW50ICsgMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChjb3VudCA9PT0gdGhpcy5BbGxDb2RlTGlzdC5sZW5ndGgpIHtcbiAgICAgICAgICAgIFRhYmJhci5nZXRJbnN0YW5jZSgpLm9wZW5TY2VuZSgnaG9tZS5zY2VuZScpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyDmn6XnnIvorrDlvZVcbiAgICBwcml2YXRlIHZpZXdSZWNvcmRGdW5jKCl7XG4gICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgVGFiYmFyLmdldEluc3RhbmNlKCkub3BlblNjZW5lKCdyZWNvcmQuc2NlbmUnKVxuICAgIH1cbn0iLCIvKipcbiAqIEBhdXRob3IgW1Npd2VuXVxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjEgMTY6MzI6MDFcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTIxIDE2OjMyOjAxXG4gKiBAZGVzYyDotbDlir/liJfooajohJrmnKxcbiAqL1xuaW1wb3J0IHsgdWkgfSBmcm9tICcuLi91aS9sYXlhTWF4VUknXG5pbXBvcnQgdXRpbHMgZnJvbSAnLi4vanMvdXRpbHMnO1xuaW1wb3J0IHsgVGFiYmFyIH0gZnJvbSAnLi4vdmlldy9UYWJiYXInO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyB0cmVuZExpc3QgZXh0ZW5kcyB1aS50ZW1wbGF0ZS50cmVuZExpc3RVSSB7XG4gICAgcHJpdmF0ZSBfaXRlbTphbnk7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKClcbiAgICAgICAgdGhpcy5idG5fYnV5Lm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLmJ0bkJ1eUZ1bmMpXG4gICAgfVxuICAgIHNldCBkYXRhU291cmNlKGl0ZW06YW55KXtcbiAgICAgICAgdGhpcy5faXRlbSA9IGl0ZW07XG4gICAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgICAgICB0aGlzLnBlcmlvZC50ZXh0ID0gaXRlbS5wZXJpb2Q7XG4gICAgICAgICAgICB0aGlzLmhpdENvZGUudGV4dCA9IGl0ZW0uaGl0Q29kZTtcbiAgICAgICAgICAgIHRoaXMub2RkX2V2ZW4udGV4dCA9IGl0ZW0uaXMgPT09IDAgPyAnLScgOiAgaXRlbS5pcyA9PT0gMSA/ICflpYcnIDogJ+WBtic7XG4gICAgICAgICAgICB0aGlzLmlzQmlnLnRleHQgPSBpdGVtLmlzID09PSAwID8gJy0nIDogaXRlbS5pc0JpZyA/ICflpKcnIDogJ+Wwjyc7XG5cbiAgICAgICAgICAgIGlmIChpdGVtLmlzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5idG5fYnV5LnZpc2libGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuaGl0Q29kZS52aXNpYmxlID0gZmFsc2U7XG4gICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICB0aGlzLmJ0bl9idXkudmlzaWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHRoaXMuaGl0Q29kZS52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIOWlh+WBtuaWh+Wtl+minOiJslxuICAgICAgICAgICAgaWYgKGl0ZW0uaXMgPT09IDEpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm9kZF9ldmVuLmNvbG9yID0gJyNmMTQ4NDgnO1xuICAgICAgICAgICAgfWVsc2UgaWYoaXRlbS5pcyA9PT0gMil7XG4gICAgICAgICAgICAgICAgdGhpcy5vZGRfZXZlbi5jb2xvciA9ICcjMjVmZmZkJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIOWkp+Wwj+aWh+Wtl+minOiJslxuICAgICAgICAgICAgaWYgKCFpdGVtLmlzQmlnICYmIGl0ZW0uaXMgIT09IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmlzQmlnLmNvbG9yID0gJyNmMTQ4NDgnO1xuICAgICAgICAgICAgfWVsc2UgaWYoaXRlbS5pc0JpZyAmJiBpdGVtLmlzICE9PSAwKXtcbiAgICAgICAgICAgICAgICB0aGlzLmlzQmlnLmNvbG9yID0gJyMyNWZmZmQnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoq56uL5Y2z6LSt5LmwICovXG4gICAgcHJpdmF0ZSBidG5CdXlGdW5jKCl7XG4gICAgICAgIGlmICh0aGlzLl9pdGVtICE9PSBudWxsKSB7XG4gICAgICAgICAgICBUYWJiYXIuZ2V0SW5zdGFuY2UoKS5vcGVuU2NlbmUoJ2d1ZXNzaW5nLnNjZW5lJyx0aGlzLl9pdGVtLmdvb2RzSWQpXG4gICAgICAgIH1cbiAgICB9XG59IiwiLyoqXG4gKiBAYXV0aG9yIFtTaXdlbl1cbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTI2IDEwOjIxOjM3XG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yNiAxMDoyMTozN1xuICogQGRlc2Mg5Zac5LuO5aSp6ZmN5Lit5aWW5ZCN5Y2V5YiX6KGo6ISa5pysXG4gKi9cbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xuaW1wb3J0IHV0aWxzIGZyb20gXCIuLi9qcy91dGlsc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBXaW5uaW5nTGlzdCBleHRlbmRzIHVpLnRlbXBsYXRlLndpbm5pbmdMaXN0VUkge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpXG4gICAgfVxuICAgIHNldCBkYXRhU291cmNlKGl0ZW06IGFueSkge1xuICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgICAgdGhpcy5wZXJpb2QudGV4dCA9IGl0ZW0uYmVsb25nVGltZTtcbiAgICAgICAgICAgIHRoaXMuZGF0ZS50ZXh0ID0gdXRpbHMuZm9ybWF0RGF0ZVRpbWUoaXRlbS5iYWxhbmNlVGltZSk7XG4gICAgICAgICAgICB0aGlzLm5pY2tOYW1lLnRleHQgPSBpdGVtLm5pY2tOYW1lO1xuICAgICAgICAgICAgdGhpcy5hbW91bnQudGV4dCA9IGAkeytpdGVtLm1vbmV5fSBVU0RUYDtcbiAgICAgICAgICAgIHRoaXMuY29kZS50ZXh0ID0gaXRlbS5oaXROdW1iZXI7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCIvKipUaGlzIGNsYXNzIGlzIGF1dG9tYXRpY2FsbHkgZ2VuZXJhdGVkIGJ5IExheWFBaXJJREUsIHBsZWFzZSBkbyBub3QgbWFrZSBhbnkgbW9kaWZpY2F0aW9ucy4gKi9cbmltcG9ydCBWaWV3PUxheWEuVmlldztcclxuaW1wb3J0IERpYWxvZz1MYXlhLkRpYWxvZztcclxuaW1wb3J0IFNjZW5lPUxheWEuU2NlbmU7XG5leHBvcnQgbW9kdWxlIHVpIHtcclxuICAgIGV4cG9ydCBjbGFzcyBhc3Npc3RhbnRVSSBleHRlbmRzIExheWEuU2NlbmUge1xyXG5cdFx0cHVibGljIGJ0bl90cmVuZDpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBidG5fcHJlYnV5OkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIGNhdGVUYWJMaXN0OkxheWEuTGlzdDtcblx0XHRwdWJsaWMgbGlzdFRpdGxlOkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyB0cmVuZExpc3Q6TGF5YS5MaXN0O1xuXHRcdHB1YmxpYyBwcmVidXk6TGF5YS5MaXN0O1xuXHRcdHB1YmxpYyBub0RhdGE6TGF5YS5JbWFnZTtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcImFzc2lzdGFudFwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgQ2FyZFVJIGV4dGVuZHMgTGF5YS5WaWV3IHtcclxuXHRcdHB1YmxpYyBhbmkxOkxheWEuRnJhbWVBbmltYXRpb247XG5cdFx0cHVibGljIGNhcmRJdGVtOkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIHNjZW5lSW1nOkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIGdvb2RzTmFtZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBwcm9ncmVzczpMYXlhLlByb2dyZXNzQmFyO1xuXHRcdHB1YmxpYyBzb2xkTnVtX3RvdGFsTnVtOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGF3YXJkOkxheWEuTGFiZWw7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJDYXJkXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBncmFuZFByaXhVSSBleHRlbmRzIExheWEuU2NlbmUge1xyXG5cdFx0cHVibGljIENvdW50RG93bjpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBib251czpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBidG5faGlzdG9yeTpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgcmFua1ByaXplSGVscDpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgbGlzdEJveDpMYXlhLlBhbmVsO1xuXHRcdHB1YmxpYyBib3gxOkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyBhbG9uZTE6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgUHJvcG9ydGlvbjE6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgcHJpeExpc3QxOkxheWEuTGlzdDtcblx0XHRwdWJsaWMgYm94MjpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgYWxvbmUyOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIFByb3BvcnRpb24yOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHByaXhMaXN0MjpMYXlhLkxpc3Q7XG5cdFx0cHVibGljIGJveDM6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIGFsb25lMzpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBQcm9wb3J0aW9uMzpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBwcml4TGlzdDM6TGF5YS5MaXN0O1xuXHRcdHB1YmxpYyBub0RhdGE6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgbXlSYW5rQm94OkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIG15cmFua2luZzpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBhdmF0YXI6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgbmlja05hbWU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgdWlkOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHZvbHVtZVRpdGxlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHZvbHVtZTpMYXlhLkxhYmVsO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwiZ3JhbmRQcml4XCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBndWVzc2luZ1VJIGV4dGVuZHMgTGF5YS5TY2VuZSB7XHJcblx0XHRwdWJsaWMgcHJpY2U6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgZ29vZHNWYWx1ZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBwcm9ncmVzc1NwZWVkOkxheWEuUHJvZ3Jlc3NCYXI7XG5cdFx0cHVibGljIHNvbGROdW1fc29sZE51bTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBwZXJpb2Q6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgbnVtYmVyTGlzdDpMYXlhLkxpc3Q7XG5cdFx0cHVibGljIGVzdGltYXRlOkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyB0b3RhbDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBiYWxhbmNlQm94OkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyBiYWxhbmNlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGJ0bl9idXk6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgYnRuX3NlbGVjdDpMYXlhLlZpZXc7XG5cdFx0cHVibGljIHJhbmRvbV9vbmU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgcmFuZG9tX2JlZm9yZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyByYW5kb21fYWZ0ZXI6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgcmFuZG9tX2FsbDpMYXlhLkxhYmVsO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwiZ3Vlc3NpbmdcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIGhvbWVVSSBleHRlbmRzIExheWEuU2NlbmUge1xyXG5cdFx0cHVibGljIHB1dF9pbjpMYXlhLkZyYW1lQW5pbWF0aW9uO1xuXHRcdHB1YmxpYyByb2NrZXRfc2hvdzpMYXlhLkZyYW1lQW5pbWF0aW9uO1xuXHRcdHB1YmxpYyBkb21fc2hvdzpMYXlhLkZyYW1lQW5pbWF0aW9uO1xuXHRcdHB1YmxpYyBiZ19hbmk6TGF5YS5GcmFtZUFuaW1hdGlvbjtcblx0XHRwdWJsaWMgYmdfYW5pMjpMYXlhLkZyYW1lQW5pbWF0aW9uO1xuXHRcdHB1YmxpYyBiZ19hbmltYXRpb246TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIGdvX2NlbnRlcjpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgdHVpY2h1OkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIEFjY291bnRCb3g6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgYXZhdGFyOkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIG5pY2tOYW1lOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHJlY2hhcmdlQm94OkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIGJ0blJlY2hhcmdlOkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIG15QW1vdW50OkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGJ1eUhlbHA6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIHJvY2tlckJveDpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgcm9ja2V0QW1vdW50OkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGNvdW50RG93bjpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgcm9ja2V0Q291bnREb3duOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGxpc3Q6TGF5YS5MaXN0O1xuXHRcdHB1YmxpYyBwdXRpbjpMYXlhLkltYWdlO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwiaG9tZVwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgbG9hZGluZ1NjZW5lVUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyBhbmkxOkxheWEuRnJhbWVBbmltYXRpb247XG5cdFx0cHVibGljIGxvYWRpbmdQcm9ncmVzczpMYXlhLlByb2dyZXNzQmFyO1xuXHRcdHB1YmxpYyBwcm9ncmVzczpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyByb2NrZXRsb2FkaW5nOkxheWEuSW1hZ2U7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJsb2FkaW5nU2NlbmVcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIHByaUhpc3RvcnlTY2VuZVVJIGV4dGVuZHMgTGF5YS5TY2VuZSB7XHJcblx0XHRwdWJsaWMgdG90YWw6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgbGlzdEJveDpMYXlhLlBhbmVsO1xuXHRcdHB1YmxpYyBib3gxOkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyBhbG9uZTE6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgUHJvcG9ydGlvbjE6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgcHJpeExpc3QxOkxheWEuTGlzdDtcblx0XHRwdWJsaWMgYm94MjpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgYWxvbmUyOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIFByb3BvcnRpb24yOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHByaXhMaXN0MjpMYXlhLkxpc3Q7XG5cdFx0cHVibGljIGJveDM6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIGFsb25lMzpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBQcm9wb3J0aW9uMzpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBwcml4TGlzdDM6TGF5YS5MaXN0O1xuXHRcdHB1YmxpYyBub0RhdGE6TGF5YS5JbWFnZTtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInByaUhpc3RvcnlTY2VuZVwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgcmVjb3JkVUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyBjYW55dTpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyB3YW5ncWk6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgam9pbkxpc3Q6TGF5YS5MaXN0O1xuXHRcdHB1YmxpYyBwcmV2aW9vdXNMaXN0OkxheWEuTGlzdDtcblx0XHRwdWJsaWMgbm9EYXRhOkxheWEuSW1hZ2U7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJyZWNvcmRcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIHNob3J0TGlzdGVkVUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyBzaG9ydExpc3Q6TGF5YS5MaXN0O1xuXHRcdHB1YmxpYyBub0RhdGE6TGF5YS5JbWFnZTtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInNob3J0TGlzdGVkXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBUYWJiYXJVSSBleHRlbmRzIExheWEuVmlldyB7XHJcblx0XHRwdWJsaWMgdGFiOkxheWEuVGFiO1xuXHRcdHB1YmxpYyBub3RpY2U6TGF5YS5TcHJpdGU7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJUYWJiYXJcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIHhjdGpVSSBleHRlbmRzIExheWEuU2NlbmUge1xyXG5cdFx0cHVibGljIHhjdGpfc2h1b21pbmc6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIGFtb3VudDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyB1bml0OkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGNvdW50RG93bjpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBidG5fc2hvcnRsaXN0OkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIHdpbm5pbmdfY29kZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyB3aW5uaW5nTGlzdDpMYXlhLkxpc3Q7XG5cdFx0cHVibGljIG5vRGF0YTpMYXlhLkltYWdlO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwieGN0alwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0IG1vZHVsZSB1aS50ZW1wbGF0ZSB7XHJcbiAgICBleHBvcnQgY2xhc3MgSW5wdXRQd2REaWFsb2dVSSBleHRlbmRzIExheWEuRGlhbG9nIHtcclxuXHRcdHB1YmxpYyB0aXRsZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBidG5DbG9zZTpMYXlhLkJveDtcblx0XHRwdWJsaWMgSXB0UHN3OkxheWEuVGV4dElucHV0O1xuXHRcdHB1YmxpYyBmb3JnZXRQYXNzd29yZDpMYXlhLkxhYmVsO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwidGVtcGxhdGUvSW5wdXRQd2REaWFsb2dcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIGpvaW5SZWNvcmRzVUkgZXh0ZW5kcyBMYXlhLlZpZXcge1xyXG5cdFx0cHVibGljIHBlcmlvZDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBub1ByaXplOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHByaXplOkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIGdvb2RzVmFsdWU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgb3BlblRpbWU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgaGl0Q29kZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBjb2RlTGlzdDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBhd2FyZDpMYXlhLkxhYmVsO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwidGVtcGxhdGUvam9pblJlY29yZHNcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIG51bWJlckxpc3RET01VSSBleHRlbmRzIExheWEuVmlldyB7XHJcblx0XHRwdWJsaWMgYmdJbWc6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgY29kZTpMYXlhLkxhYmVsO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwidGVtcGxhdGUvbnVtYmVyTGlzdERPTVwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgcHJldmlvdXNSZWNvcmRzVUkgZXh0ZW5kcyBMYXlhLlZpZXcge1xyXG5cdFx0cHVibGljIHBlcmlvZDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBnb29kc05hbWU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgdHhIYXNoOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGhpdENvZGU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgb3BlblRpbWU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgam9pbmVkTnVtOkxheWEuTGFiZWw7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJ0ZW1wbGF0ZS9wcmV2aW91c1JlY29yZHNcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIHByaUhpc3RvcnlVSSBleHRlbmRzIExheWEuU2NlbmUge1xyXG5cdFx0cHVibGljIHJhbmtObzpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBuaWNrTmFtZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBVSUQ6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgVm9sdW1lOkxheWEuTGFiZWw7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJ0ZW1wbGF0ZS9wcmlIaXN0b3J5XCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBwcml4TGlzdFVJIGV4dGVuZHMgTGF5YS5TY2VuZSB7XHJcblx0XHRwdWJsaWMgbm8xOkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIHJhbmtObzpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBhdmF0YXI6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgbmlja05hbWU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgVUlEOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHRvZGF5Vm9sdW1lVGl0bGU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgdG9kYXlWb2x1bWU6TGF5YS5MYWJlbDtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInRlbXBsYXRlL3ByaXhMaXN0XCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyByYW5raW5nTGlzdFVJIGV4dGVuZHMgTGF5YS5TY2VuZSB7XHJcblx0XHRwdWJsaWMgcmFua2luZzpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBuaWNrTmFtZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyB1aWQ6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgYW1vdW50OkxheWEuTGFiZWw7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJ0ZW1wbGF0ZS9yYW5raW5nTGlzdFwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgcmVjaGFyZ2VEaWFsb2dVSSBleHRlbmRzIExheWEuRGlhbG9nIHtcclxuXHRcdHB1YmxpYyBidG5fcXVpY2tSZWNoYXJnZTpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgYnRuX3dpdGhkcmF3OkxheWEuU3ByaXRlO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwidGVtcGxhdGUvcmVjaGFyZ2VEaWFsb2dcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIHNob3J0TGlzdFVJIGV4dGVuZHMgTGF5YS5TY2VuZSB7XHJcblx0XHRwdWJsaWMgbnVtYmVyOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIG5pY2tOYW1lOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHVzZXJJZDpMYXlhLkxhYmVsO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwidGVtcGxhdGUvc2hvcnRMaXN0XCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBzaG93Um9ja2V0VUkgZXh0ZW5kcyBMYXlhLkRpYWxvZyB7XHJcblx0XHRwdWJsaWMgYW5pMTpMYXlhLkZyYW1lQW5pbWF0aW9uO1xuXHRcdHB1YmxpYyBhbmkyOkxheWEuRnJhbWVBbmltYXRpb247XG5cdFx0cHVibGljIHNob3dhbmkxOkxheWEuQW5pbWF0aW9uO1xuXHRcdHB1YmxpYyBzaG93YW5pMjpMYXlhLkFuaW1hdGlvbjtcblx0XHRwdWJsaWMgYnRuX2Nsb3NlOkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyByYW5raW5nOkxheWEuTGlzdDtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInRlbXBsYXRlL3Nob3dSb2NrZXRcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIFRpcHNEaWFsb2dVSSBleHRlbmRzIExheWEuRGlhbG9nIHtcclxuXHRcdHB1YmxpYyB0aXRsZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBidG5WaWV3UmVjb3JkOkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIGJ0bkNvbnRpbnVlOkxheWEuSW1hZ2U7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJ0ZW1wbGF0ZS9UaXBzRGlhbG9nXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyB0cmVuZExpc3RVSSBleHRlbmRzIExheWEuU2NlbmUge1xyXG5cdFx0cHVibGljIHBlcmlvZDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBoaXRDb2RlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGJ0bl9idXk6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgb2RkX2V2ZW46TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgaXNCaWc6TGF5YS5MYWJlbDtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInRlbXBsYXRlL3RyZW5kTGlzdFwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3Mgd2lubmluZ0xpc3RVSSBleHRlbmRzIExheWEuU2NlbmUge1xyXG5cdFx0cHVibGljIHBlcmlvZEJveDpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgcGVyaW9kOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGRhdGVCb3g6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIGRhdGU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgbmFtZUJveDpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgbmlja05hbWU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgYW1vdW50Qm94OkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyBhbW91bnQ6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgY29kZUJveDpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgY29kZTpMYXlhLkxhYmVsO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwidGVtcGxhdGUvd2lubmluZ0xpc3RcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHIiLCJleHBvcnQgY29uc3QgTGF5ZXJUeXBlID0ge1xuICAgIExBWUVSX1NDRU5FOiBcIkxBWUVSX1NDRU5FXCIsXG4gICAgTEFZRVJfVUk6IFwiTEFZRVJfVUlcIixcbiAgICBMQVlFUl9NU0c6IFwiTEFZRVJfTVNHXCJcbn1cbmNvbnN0IGxheWVyTWFwID0ge307XG5cbmV4cG9ydCBjbGFzcyBMYXllck1hbmFnZXIge1xuICAgIHN0YXRpYyBpbml0ZWQ6IGJvb2xlYW47XG4gICAgc3RhdGljIGluaXQobGF5ZXJzOiBzdHJpbmdbXSkge1xuICAgICAgICBsYXllcnMuZm9yRWFjaCgobGF5ZXJOYW1lOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgIGlmIChsYXllck5hbWUgPT09IExheWVyVHlwZS5MQVlFUl9TQ0VORSkge1xuICAgICAgICAgICAgICAgIGxheWVyTWFwW2xheWVyTmFtZV0gPSBMYXlhLlNjZW5lLnJvb3Q7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IGxheWVyOiBMYXlhLlVJQ29tcG9uZW50ID0gbGF5ZXJNYXBbbGF5ZXJOYW1lXSA9IG5ldyBMYXlhLlVJQ29tcG9uZW50KCk7XG4gICAgICAgICAgICAgICAgbGF5ZXIubGVmdCA9IDA7XG4gICAgICAgICAgICAgICAgbGF5ZXIucmlnaHQgPSAwO1xuICAgICAgICAgICAgICAgIGxheWVyLnRvcCA9IDA7XG4gICAgICAgICAgICAgICAgbGF5ZXIuYm90dG9tID0gMDtcbiAgICAgICAgICAgICAgICBMYXlhLnN0YWdlLmFkZENoaWxkKGxheWVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIC8vIExheWEuc3RhZ2Uub24oTGF5YS5FdmVudC5SRVNJWkUsIHRoaXMsIHRoaXMub25SZXNpemUpO1xuICAgIH1cblxuICAgIHN0YXRpYyBhZGRUb0xheWVyKG5vZGU6IExheWEuTm9kZSwgbGF5ZXJOYW1lKTogQm9vbGVhbiB7XG4gICAgICAgIExheWVyTWFuYWdlci5jaGVja0luaXQoKTtcbiAgICAgICAgaWYgKCFub2RlKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGNvbnN0IGxheWVyID0gbGF5ZXJNYXBbbGF5ZXJOYW1lXTtcbiAgICAgICAgaWYgKCFsYXllcikgcmV0dXJuIGZhbHNlO1xuICAgICAgICBsYXllci5hZGRDaGlsZChub2RlKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgc3RhdGljIHJlbW92ZUZyb21MYXllcihub2RlOiBMYXlhLk5vZGUsIGxheWVyTmFtZSk6IEJvb2xlYW4ge1xuICAgICAgICBMYXllck1hbmFnZXIuY2hlY2tJbml0KCk7XG4gICAgICAgIGNvbnN0IGxheWVyOiBMYXlhLlVJQ29tcG9uZW50ID0gbGF5ZXJNYXBbbGF5ZXJOYW1lXTtcbiAgICAgICAgaWYgKGxheWVyKSB7XG4gICAgICAgICAgICBjb25zdCByTm9kZTogTGF5YS5Ob2RlID0gbGF5ZXIucmVtb3ZlQ2hpbGQobm9kZSlcbiAgICAgICAgICAgIGlmIChyTm9kZSkgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHN0YXRpYyBnZXRMYXllcihsYXllck5hbWUpOiBMYXlhLkNvbXBvbmVudCB7XG4gICAgICAgIHJldHVybiBsYXllck1hcFtsYXllck5hbWVdO1xuICAgIH1cblxuICAgIHN0YXRpYyBjaGVja0luaXQoKSB7XG4gICAgICAgIGlmIChMYXllck1hbmFnZXIuaW5pdGVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgTGF5ZXJNYW5hZ2VyLmluaXQoW1xuICAgICAgICAgICAgTGF5ZXJUeXBlLkxBWUVSX1NDRU5FLFxuICAgICAgICAgICAgTGF5ZXJUeXBlLkxBWUVSX1VJLFxuICAgICAgICAgICAgTGF5ZXJUeXBlLkxBWUVSX01TR1xuICAgICAgICBdKTtcbiAgICAgICAgTGF5ZXJNYW5hZ2VyLmluaXRlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBzdGF0aWMgb25SZXNpemUoKTogdm9pZCB7XG4gICAgICAgIGZvciAoY29uc3QgbGF5ZXJOYW1lIGluIGxheWVyTWFwKSB7XG4gICAgICAgICAgICBpZiAobGF5ZXJOYW1lICE9PSBMYXllclR5cGUuTEFZRVJfU0NFTkUgJiYgbGF5ZXJNYXAuaGFzT3duUHJvcGVydHkobGF5ZXJOYW1lKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGxheWVyOiBMYXlhLlVJQ29tcG9uZW50ID0gbGF5ZXJNYXBbbGF5ZXJOYW1lXTtcbiAgICAgICAgICAgICAgICBsYXllci5zaXplKExheWEuc3RhZ2Uud2lkdGgsIExheWEuc3RhZ2UuaGVpZ2h0KTtcbiAgICAgICAgICAgICAgICBsYXllci5ldmVudChMYXlhLkV2ZW50LlJFU0laRSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbn0iLCIvKipcbiAqIEBhdXRob3IgW1Npd2VuXVxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NTA6MTBcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTE5IDE3OjUwOjEwXG4gKiBAZGVzYyDlupXpg6jlr7zoiKpUYWJiYXLohJrmnKxcbiAqL1xuaW1wb3J0IHsgdWkgfSBmcm9tICcuLi91aS9sYXlhTWF4VUknXG5pbXBvcnQgeyBHYW1lTW9kZWwgfSBmcm9tICcuLi9qcy9HYW1lTW9kZWwnO1xuXG5jb25zdCB0YWJiYXJBcnI6c3RyaW5nW10gPSBbJ2hvbWUuc2NlbmUnLCdyZWNvcmQuc2NlbmUnLCdhc3Npc3RhbnQuc2NlbmUnXSAvL3RhYmJhcueahOmhtemdolxuY29uc3QgcGFnZUFycjpzdHJpbmdbXSA9IFtcbiAgICAnZ3Vlc3Npbmcuc2NlbmUnLCdncmFuZFByaXguc2NlbmUnLFxuICAgICdwcmlIaXN0b3J5U2NlbmUuc2NlbmUnLCd4Y3RqLnNjZW5lJyxcbiAgICAnc2hvcnRMaXN0ZWQuc2NlbmUnXG5dIC8v6Z2edGFiYmFy6aG16Z2iXG5cbmV4cG9ydCBjbGFzcyBUYWJiYXIgZXh0ZW5kcyB1aS5UYWJiYXJVSSB7XG4gICAgLyoq6aG16Z2i5Lyg6YCS55qE5Y+C5pWwICovXG4gICAgcHJpdmF0ZSBfb3BlblNjZW5lUGFyYW06IGFueTtcbiAgICAvKirpgInkuK3nmoR0YWJiYXIgKi9cbiAgICBzdGF0aWMgX3RhYmJhcjpUYWJiYXI7XG4gICAgLyoq6aG16Z2i5pWw57uEICovXG4gICAgc3RhdGljIHJlYWRvbmx5IFNDRU5FUzpzdHJpbmdbXSA9IFsuLi50YWJiYXJBcnIsLi4ucGFnZUFycl1cblxuICAgIHN0YXRpYyBnZXRJbnN0YW5jZSgpOlRhYmJhciB7XG4gICAgICAgIGlmKCF0aGlzLl90YWJiYXIpe1xuICAgICAgICAgICAgdGhpcy5fdGFiYmFyID0gbmV3IFRhYmJhcigpXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3RhYmJhcjtcbiAgICB9XG5cbiAgICBzdGF0aWMgc2hvdygpe1xuICAgICAgICBsZXQgdGFiSW5zOlRhYmJhciA9IHRoaXMuZ2V0SW5zdGFuY2UoKVxuICAgICAgICBMYXlhLnN0YWdlLmFkZENoaWxkKHRhYklucylcbiAgICB9XG4gICAgc3RhdGljIGhpZGUoKXtcbiAgICAgICAgaWYodGhpcy5fdGFiYmFyKXtcbiAgICAgICAgICAgIHRoaXMuX3RhYmJhci5yZW1vdmVTZWxmKClcbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgb25FbmFibGUoKXtcbiAgICAgICAgR2FtZU1vZGVsLmdldEluc3RhbmNlKCkub24oJ2dldE5vdGljZScsdGhpcywocmVzOmFueSk9PntcbiAgICAgICAgICAgIGlmIChyZXMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm5vdGljZS52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgIHRoaXMubm90aWNlLnZpc2libGUgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICAvKirpnZ50YWJiYXLot7PovazpobXpnaIs5Y+v5pC65bim5Y+C5pWwICovXG4gICAgb3BlblNjZW5lKHNjZW5lOiBzdHJpbmcsIHBhcmFtPzogYW55KSB7XG4gICAgICAgIHRoaXMuX29wZW5TY2VuZVBhcmFtID0gcGFyYW07XG4gICAgICAgIHRoaXMudGFiLnNlbGVjdGVkSW5kZXggPSBUYWJiYXIuU0NFTkVTLmluZGV4T2Yoc2NlbmUpO1xuICAgIH1cblxuICAgIC8qKuebkeinhnRhYmJhcuaUueWPmCAqL1xuICAgIGNyZWF0ZVZpZXcodmlldzphbnkpe1xuICAgICAgICBzdXBlci5jcmVhdGVWaWV3KHZpZXcpXG4gICAgICAgIHRoaXMudGFiLm9uKExheWEuRXZlbnQuQ0hBTkdFLHRoaXMsdGhpcy5vbkNsaWNrVGFiKTtcbiAgICAgICAgLy8gdGhpcy5vbkNsaWNrVGFiKCk7XG4gICAgfVxuICAgIFxuXG4gICAgLyoq54K55Ye7dGFiYmFy5LqL5Lu2ICovXG4gICAgb25DbGlja1RhYigpIHtcbiAgICAgICAgbGV0IHVzZXJJbmZvID0gT2JqZWN0LmtleXMoR2FtZU1vZGVsLmdldEluc3RhbmNlKCkudXNlckluZm8pO1xuICAgICAgICBsZXQgc2NlbmU6c3RyaW5nID0gVGFiYmFyLlNDRU5FU1t0aGlzLnRhYi5zZWxlY3RlZEluZGV4XTtcbiAgICAgICAgaWYgKHVzZXJJbmZvLmxlbmd0aCA9PT0gMCAmJiAoc2NlbmUgPT09ICdyZWNvcmQuc2NlbmUnIHx8IHNjZW5lID09PSAnYXNzaXN0YW50LnNjZW5lJykpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfmnKrnmbvlvZXot7PovaznmbvlvZUnKTtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gYGh0dHBzOi8vJHtkb2N1bWVudC5kb21haW59LyMvc2lnbl9vbmVgXG4gICAgICAgIH1lbHNlIHtcbiAgICAgICAgICAgIExheWEuU2NlbmUub3BlbihzY2VuZSwgdHJ1ZSwgdGhpcy5fb3BlblNjZW5lUGFyYW0pO1xuICAgICAgICAgICAgdGhpcy5fb3BlblNjZW5lUGFyYW0gPSBudWxsO1xuICAgICAgICAgICAgdGhpcy50YWIuaXRlbXMuZm9yRWFjaChpdGVtPT57XG4gICAgICAgICAgICAgICAgY29uc3QgdGFiQnRuOiBMYXlhLkJ1dHRvbiA9IGl0ZW0gYXMgTGF5YS5CdXR0b247XG4gICAgICAgICAgICAgICAgY29uc3QgaW1nQnRuOiBMYXlhLkJ1dHRvbiA9IHRhYkJ0bi5nZXRDaGlsZEF0KDApIGFzIExheWEuQnV0dG9uO1xuICAgICAgICAgICAgICAgIGltZ0J0bi5zZWxlY3RlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIHRhYmJhckFyci5mb3JFYWNoKGl0ZW09PntcbiAgICAgICAgICAgICAgICBpZiAoaXRlbSA9PT0gc2NlbmUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFiQnRuOiBMYXlhLkJ1dHRvbiA9IHRoaXMudGFiLnNlbGVjdGlvbiBhcyBMYXlhLkJ1dHRvbjtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW1nQnRuOiBMYXlhLkJ1dHRvbiA9IHRhYkJ0bi5nZXRDaGlsZEF0KDApIGFzIExheWEuQnV0dG9uO1xuICAgICAgICAgICAgICAgICAgICBpbWdCdG4uc2VsZWN0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAvL+WFs+mXreWwj+e6oueCuVxuICAgICAgICAgICAgaWYgKHNjZW5lID09PSAncmVjb3JkLnNjZW5lJykge1xuICAgICAgICAgICAgICAgIEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLm5vdGljZUZ1bmMoZmFsc2UpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59IiwiaW1wb3J0IHsgTGF5ZXJNYW5hZ2VyLCBMYXllclR5cGUgfSBmcm9tIFwiLi9MYXllck1hbmFnZXJcIjtcblxuZXhwb3J0IGNsYXNzIFRvYXN0IGV4dGVuZHMgTGF5YS5VSUNvbXBvbmVudCB7XG5cbiAgICBzdGF0aWMgTUlOX1dJRFRIOiBudW1iZXIgPSAyMDA7XG4gICAgc3RhdGljIE1BWF9XSURUSDogbnVtYmVyID0gNTAwO1xuICAgIHN0YXRpYyBUT1A6IG51bWJlciA9IDIzO1xuICAgIHN0YXRpYyBCT1RUT006IG51bWJlciA9IDIwO1xuICAgIHN0YXRpYyBNQVJHSU46IG51bWJlciA9IDE1O1xuICAgIHN0YXRpYyBNSU5fSEVJR0hUOiBudW1iZXIgPSA4MDtcbiAgICBzdGF0aWMgRk9OVF9TSVpFOiBudW1iZXIgPSAyNjtcbiAgICBzdGF0aWMgQ09MT1I6IHN0cmluZyA9IFwiI2ZmZmZmZlwiO1xuICAgIHN0YXRpYyBCR19JTUdfVVJMOiBzdHJpbmcgPSBcImNvbXAvaW1nX3RvYXN0X2JnLnBuZ1wiO1xuICAgIHN0YXRpYyBEVVJBVElPTjogbnVtYmVyID0gMjUwMDtcblxuICAgIHByaXZhdGUgc3RhdGljIGluc3RhbmNlOiBUb2FzdDtcbiAgICBwcml2YXRlIHN0YXRpYyBzdG9yZVRleHRMaXN0OiBhbnlbXSA9IFtdO1xuXG4gICAgc3RhdGljIHNob3codGV4dDogc3RyaW5nLCBkdXJhdGlvbjogbnVtYmVyID0gVG9hc3QuRFVSQVRJT04sIGNvdmVyQmVmb3JlOiBib29sZWFuID0gdHJ1ZSkge1xuICAgICAgICBpZiAoIVRvYXN0Lmluc3RhbmNlKSB7XG4gICAgICAgICAgICBUb2FzdC5pbnN0YW5jZSA9IG5ldyBUb2FzdCgpO1xuICAgICAgICAgICAgVG9hc3QuaW5zdGFuY2Uub24oTGF5YS5FdmVudC5DTE9TRSwgVG9hc3QsIFRvYXN0Lm9uQ2xvc2UpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb3ZlckJlZm9yZSAmJiBUb2FzdC5pbnN0YW5jZS5wYXJlbnQpIHtcbiAgICAgICAgICAgIFRvYXN0Lmluc3RhbmNlLnNldFRleHQodGV4dCk7XG4gICAgICAgICAgICBUb2FzdC5pbnN0YW5jZS50aW1lci5vbmNlKGR1cmF0aW9uIHx8IFRvYXN0LkRVUkFUSU9OLCBUb2FzdC5pbnN0YW5jZSwgVG9hc3QuaW5zdGFuY2UuY2xvc2UsIG51bGwsIHRydWUpO1xuICAgICAgICB9IGVsc2UgaWYgKCFUb2FzdC5pbnN0YW5jZS5wYXJlbnQpIHtcbiAgICAgICAgICAgIFRvYXN0LmRvU2hvdyh0ZXh0LCBkdXJhdGlvbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBUb2FzdC5zdG9yZVRleHRMaXN0LnB1c2goe1xuICAgICAgICAgICAgICAgIHRleHQ6IHRleHQsXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IGR1cmF0aW9uXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByb3RlY3RlZCBzdGF0aWMgZG9TaG93KHRleHQ6IHN0cmluZywgZHVyYXRpb246IG51bWJlcikge1xuICAgICAgICBUb2FzdC5pbnN0YW5jZS5zZXRUZXh0KHRleHQpO1xuICAgICAgICBMYXllck1hbmFnZXIuYWRkVG9MYXllcihUb2FzdC5pbnN0YW5jZSwgTGF5ZXJUeXBlLkxBWUVSX01TRyk7XG4gICAgICAgIFRvYXN0Lmluc3RhbmNlLnRpbWVyLm9uY2UoZHVyYXRpb24gfHwgVG9hc3QuRFVSQVRJT04sIFRvYXN0Lmluc3RhbmNlLCBUb2FzdC5pbnN0YW5jZS5jbG9zZSwgbnVsbCwgdHJ1ZSk7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIHN0YXRpYyBvbkNsb3NlKCkge1xuICAgICAgICBpZiAoVG9hc3Quc3RvcmVUZXh0TGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB2YXIgZGF0YTogYW55ID0gVG9hc3Quc3RvcmVUZXh0TGlzdC5zaGlmdCgpO1xuICAgICAgICAgICAgVG9hc3QuZG9TaG93KGRhdGEudGV4dCwgZGF0YS5kdXJhdGlvbik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBiZzogTGF5YS5JbWFnZTtcbiAgICBsYWJlbDogTGF5YS5MYWJlbDtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgIH1cblxuICAgIHNldFRleHQodGV4dDogc3RyaW5nKSB7XG4gICAgICAgIHRoaXMud2lkdGggPSBUb2FzdC5NQVhfV0lEVEg7XG4gICAgICAgIHRoaXMubGFiZWwud2lkdGggPSBOYU47XG4gICAgICAgIHRoaXMubGFiZWwuZGF0YVNvdXJjZSA9IHRleHQ7XG4gICAgICAgIHRoaXMub25UZXh0Q2hhbmdlKCk7XG4gICAgfVxuXG4gICAgY2xvc2UoKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlU2VsZigpO1xuICAgICAgICB0aGlzLmV2ZW50KExheWEuRXZlbnQuQ0xPU0UpO1xuICAgIH1cblxuICAgIGNyZWF0ZUNoaWxkcmVuKCkge1xuICAgICAgICB0aGlzLmNlbnRlclggPSAwO1xuICAgICAgICB0aGlzLmhlaWdodCA9IFRvYXN0Lk1BUkdJTiArIFRvYXN0Lk1BUkdJTjtcblxuICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xuICAgICAgICB0aGlzLmJnID0gbmV3IExheWEuSW1hZ2UoKTtcbiAgICAgICAgdGhpcy5iZy5za2luID0gVG9hc3QuQkdfSU1HX1VSTDtcbiAgICAgICAgdGhpcy5iZy5zaXplR3JpZCA9IFwiMjUsMjUsMjUsMjVcIjtcbiAgICAgICAgdGhpcy5iZy5sZWZ0ID0gdGhpcy5iZy5yaWdodCA9IHRoaXMuYmcudG9wID0gdGhpcy5iZy5ib3R0b20gPSAwO1xuICAgICAgICB0aGlzLmFkZENoaWxkKHRoaXMuYmcpO1xuXG4gICAgICAgIHRoaXMubGFiZWwgPSBuZXcgTGF5YS5MYWJlbCgpO1xuICAgICAgICB0aGlzLmxhYmVsLmNvbG9yID0gVG9hc3QuQ09MT1I7XG4gICAgICAgIHRoaXMubGFiZWwuZm9udFNpemUgPSBUb2FzdC5GT05UX1NJWkU7XG4gICAgICAgIHRoaXMubGFiZWwuYWxpZ24gPSBcImNlbnRlclwiO1xuICAgICAgICB0aGlzLmxhYmVsLnkgPSBUb2FzdC5UT1A7XG4gICAgICAgIHRoaXMubGFiZWwuY2VudGVyWCA9IDA7XG4gICAgICAgIC8vIHRoaXMubGFiZWwuY2VudGVyWSA9IDA7XG4gICAgICAgIC8vIHRoaXMubGFiZWwuc3Ryb2tlID0gMTtcbiAgICAgICAgLy8gdGhpcy5sYWJlbC5zdHJva2VDb2xvciA9IFwiIzAwMDAwMFwiO1xuICAgICAgICAvLyB0aGlzLmxhYmVsLnRvcCA9IFRvYXN0Lk1BUkdJTjtcbiAgICAgICAgLy8gdGhpcy5sYWJlbC5ib3R0b20gPSBUb2FzdC5NQVJHSU47XG4gICAgICAgIC8vIHRoaXMubGFiZWwubGVmdCA9IFRvYXN0Lk1BUkdJTjtcbiAgICAgICAgLy8gdGhpcy5sYWJlbC5yaWdodCA9IFRvYXN0Lk1BUkdJTjtcbiAgICAgICAgdGhpcy5sYWJlbC5sZWFkaW5nID0gMTU7XG4gICAgICAgIHRoaXMubGFiZWwud29yZFdyYXAgPSB0cnVlO1xuICAgICAgICB0aGlzLmFkZENoaWxkKHRoaXMubGFiZWwpO1xuXG4gICAgfVxuXG4gICAgLy8gcHJvdGVjdGVkIGluaXRpYWxpemUoKSB7XG4gICAgLy8gICAgIHN1cGVyLmluaXRpYWxpemUoKTtcbiAgICAvLyAgICAgdGhpcy5iaW5kVmlld0V2ZW50KHRoaXMubGFiZWwsIExheWEuRXZlbnQuQ0hBTkdFLCB0aGlzLm9uVGV4dENoYW5nZSk7XG4gICAgLy8gfVxuXG4gICAgcHJvdGVjdGVkIG9uVGV4dENoYW5nZSgpIHtcbiAgICAgICAgbGV0IHRleHRXOiBudW1iZXIgPSB0aGlzLmxhYmVsLndpZHRoO1xuICAgICAgICBjb25zdCBtYXhUZXh0VzogbnVtYmVyID0gVG9hc3QuTUFYX1dJRFRIIC0gVG9hc3QuTUFSR0lOICogMjtcbiAgICAgICAgLy8gY29uc3QgbWluVGV4dFc6IG51bWJlciA9IFRvYXN0Lk1JTl9XSURUSCAtIFRvYXN0Lk1BUkdJTiAqIDI7XG4gICAgICAgIGlmICh0ZXh0VyA+IG1heFRleHRXKSB7XG4gICAgICAgICAgICB0aGlzLmxhYmVsLndpZHRoID0gbWF4VGV4dFc7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHc6IG51bWJlciA9IHRoaXMubGFiZWwud2lkdGggKyBUb2FzdC5NQVJHSU4gKiAyO1xuICAgICAgICB3ID0gTWF0aC5taW4odywgVG9hc3QuTUFYX1dJRFRIKTtcbiAgICAgICAgdyA9IE1hdGgubWF4KHcsIFRvYXN0Lk1JTl9XSURUSCk7XG4gICAgICAgIHRoaXMud2lkdGggPSB3O1xuICAgICAgICAvLyB0aGlzLmhlaWdodCA9IHRoaXMubGFiZWwuaGVpZ2h0ICsgVG9hc3QuVE9QICsgVG9hc3QuQk9UVE9NO1xuICAgICAgICB0aGlzLmhlaWdodCA9IHRoaXMubGFiZWwuaGVpZ2h0ICsgVG9hc3QuTUFSR0lOICogMjtcbiAgICAgICAgdGhpcy54ID0gKExheWEuc3RhZ2Uud2lkdGggLSB0aGlzLndpZHRoKSA+PiAxO1xuICAgICAgICB0aGlzLnkgPSAoTGF5YS5zdGFnZS5oZWlnaHQgLSB0aGlzLmhlaWdodCkgPj4gMTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgb25Db21wUmVzaXplKCkge1xuICAgICAgICAvLyBpZiAodGhpcy5sYWJlbCkge1xuICAgICAgICAvLyAgICAgdGhpcy5oZWlnaHQgPSB0aGlzLmxhYmVsLmhlaWdodCArIE1lc3NhZ2VUaXAuTUFSR0lOICsgTWVzc2FnZVRpcC5NQVJHSU47XG4gICAgICAgIC8vIH1cbiAgICAgICAgaWYgKHRoaXMuYmcpIHtcbiAgICAgICAgICAgIHRoaXMuYmcud2lkdGggPSB0aGlzLndpZHRoO1xuICAgICAgICAgICAgdGhpcy5iZy5oZWlnaHQgPSB0aGlzLmhlaWdodDtcbiAgICAgICAgfVxuICAgIH1cbn0iLCJpbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcbmltcG9ydCB7IEdhbWVNb2RlbCB9IGZyb20gXCIuLi9qcy9HYW1lTW9kZWxcIjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUm9ja2V0RGlhbG9nIGV4dGVuZHMgdWkudGVtcGxhdGUuc2hvd1JvY2tldFVJIHtcbiAgICBwcml2YXRlIHN0YXRpYyBfZGxnOiBSb2NrZXREaWFsb2c7XG5cbiAgICBzdGF0aWMgZ2V0IGRsZygpOiBSb2NrZXREaWFsb2cge1xuICAgICAgICBpZiAoIXRoaXMuX2RsZykge1xuICAgICAgICAgICAgdGhpcy5fZGxnID0gbmV3IFJvY2tldERpYWxvZygpO1xuICAgICAgICAgICAgdGhpcy5fZGxnLnggPSAwO1xuICAgICAgICAgICAgdGhpcy5fZGxnLnkgPSAwO1xuICAgICAgICAgICAgdGhpcy5fZGxnLmlzUG9wdXBDZW50ZXIgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fZGxnO1xuICAgIH1cbiAgICBcbiAgICBvbkVuYWJsZSgpe1xuICAgICAgIHRoaXMuYnRuX2Nsb3NlLm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLmNsb3NlRGlhbG9nKVxuICAgICAgIHRoaXMuYW5pMS5wbGF5KDAsZmFsc2UpXG4gICAgICAgdGhpcy5hbmkyLnBsYXkoMCxmYWxzZSlcbiAgICB9XG4gICAgc3RhdGljIGluaXQoKXtcbiAgICAgICAgR2FtZU1vZGVsLmdldEluc3RhbmNlKCkub24oJ2dldFJvY2tldFJhbmtpbmcnLHRoaXMsKHJlczphbnkpPT57XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhyZXMpO1xuICAgICAgICAgICAgdGhpcy5kbGcucG9wdXAoZmFsc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIHRoaXMuZGxnLnJhbmtpbmcuYXJyYXkgPSByZXM7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgY2xvc2VEaWFsb2coKXtcbiAgICAgICAgdGhpcy5jbG9zZSgpXG4gICAgfVxuXG59Il19
