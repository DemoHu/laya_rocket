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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL1Byb2dyYW0gRmlsZXMgKHg4NikvTGF5YUFpcklERS12Mi4xL3Jlc291cmNlcy9hcHAvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4uLy4uLy4uLy4uL1Byb2dyYW0gRmlsZXMgKHg4NikvTGF5YUFpcklERS12Mi4xL3Jlc291cmNlcy9hcHAvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvYWRhcHRlcnMveGhyLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9heGlvcy5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvY2FuY2VsL0NhbmNlbC5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvY2FuY2VsL0NhbmNlbFRva2VuLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9jYW5jZWwvaXNDYW5jZWwuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2NvcmUvQXhpb3MuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2NvcmUvSW50ZXJjZXB0b3JNYW5hZ2VyLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9jb3JlL2NyZWF0ZUVycm9yLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9jb3JlL2Rpc3BhdGNoUmVxdWVzdC5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvY29yZS9lbmhhbmNlRXJyb3IuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2NvcmUvc2V0dGxlLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9jb3JlL3RyYW5zZm9ybURhdGEuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2RlZmF1bHRzLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9oZWxwZXJzL2JpbmQuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2hlbHBlcnMvYnRvYS5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvaGVscGVycy9idWlsZFVSTC5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvaGVscGVycy9jb21iaW5lVVJMcy5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvaGVscGVycy9jb29raWVzLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9oZWxwZXJzL2lzQWJzb2x1dGVVUkwuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2hlbHBlcnMvaXNVUkxTYW1lT3JpZ2luLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9oZWxwZXJzL25vcm1hbGl6ZUhlYWRlck5hbWUuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2hlbHBlcnMvcGFyc2VIZWFkZXJzLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9oZWxwZXJzL3NwcmVhZC5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvdXRpbHMuanMiLCJub2RlX21vZHVsZXMvaXMtYnVmZmVyL2luZGV4LmpzIiwic3JjL0dhbWVDb25maWcudHMiLCJzcmMvTWFpbi50cyIsInNyYy9qcy9HYW1lTW9kZWwudHMiLCJzcmMvanMvYXBpLnRzIiwic3JjL2pzL2h0dHAudHMiLCJzcmMvanMvc2NyZWVuVXRpbHMudHMiLCJzcmMvanMvc29ja2V0LnRzIiwic3JjL2pzL3V0aWxzLnRzIiwic3JjL2xvYWRpbmdSZXNMaXN0LnRzIiwic3JjL3B1YmxpY1NjcmlwdC9QYWdlTmF2U2NyaXB0LnRzIiwic3JjL3B1YmxpY1NjcmlwdC9QYWdlU2NyaXB0LnRzIiwic3JjL3B1YmxpY1NjcmlwdC9TY3JlZW4udHMiLCJzcmMvc2NyaXB0L0Fzc2lzdGFudC50cyIsInNyYy9zY3JpcHQvQ2FyZC50cyIsInNyYy9zY3JpcHQvR3Vlc3NpbmcudHMiLCJzcmMvc2NyaXB0L0hvbWUudHMiLCJzcmMvc2NyaXB0L1JlY29yZC50cyIsInNyYy9zY3JpcHQvZ3JhbmRQcml4LnRzIiwic3JjL3NjcmlwdC9sb2FkaW5nU2NlbmUudHMiLCJzcmMvc2NyaXB0L3ByaUhpc3RvcnlTY2VuZS50cyIsInNyYy9zY3JpcHQvc2hvcnRMaXN0ZWQudHMiLCJzcmMvc2NyaXB0L3dpbm5pbmcudHMiLCJzcmMvdGVtcGxhdGUvam9pblJlY29yZHMudHMiLCJzcmMvdGVtcGxhdGUvbnVtYmVyTGlzdERvbVNjcmlwdC50cyIsInNyYy90ZW1wbGF0ZS9wcmV2aW91c1JlY29yZHMudHMiLCJzcmMvdGVtcGxhdGUvcHJpSGlzdG9yeS50cyIsInNyYy90ZW1wbGF0ZS9wcml4TGlzdC50cyIsInNyYy90ZW1wbGF0ZS9wc3dJbnB1dC50cyIsInNyYy90ZW1wbGF0ZS9yYW5raW5nTGlzdC50cyIsInNyYy90ZW1wbGF0ZS9yZWNoYXJnZURpYWxvZy50cyIsInNyYy90ZW1wbGF0ZS9zaG9ydExpc3RlZExpc3QudHMiLCJzcmMvdGVtcGxhdGUvdGlwRGlhbG9nLnRzIiwic3JjL3RlbXBsYXRlL3RyZW5kTGlzdC50cyIsInNyYy90ZW1wbGF0ZS93aW5uaW5nTGlzdC50cyIsInNyYy91aS9sYXlhTWF4VUkudHMiLCJzcmMvdmlldy9MYXllck1hbmFnZXIudHMiLCJzcmMvdmlldy9UYWJiYXIudHMiLCJzcmMvdmlldy9Ub2FzdC50cyIsInNyYy92aWV3L3JvY2tldERpYWxvZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TEE7OztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDcExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNoR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDckJBLGdHQUFnRztBQUNoRyxnREFBMEM7QUFDMUMsd0RBQWtEO0FBQ2xELGdEQUEwQztBQUMxQyxrREFBNEM7QUFDNUMsc0NBQWdDO0FBQ2hDLGdEQUEwQztBQUMxQyw4REFBd0Q7QUFDeEQsZ0RBQTBDO0FBQzFDLDhDQUF3QztBQUN4QyxzRUFBZ0U7QUFDaEUsc0NBQWdDO0FBQ2hDLHNEQUFnRDtBQUNoRCw0REFBc0Q7QUFDdEQsb0RBQThDO0FBQzlDLDBDQUFvQztBQUNwQyxzREFBZ0Q7QUFDaEQsOERBQXdEO0FBQ3hELG9EQUE4QztBQUM5Qyw4REFBd0Q7QUFDeEQsZ0RBQTBDO0FBQzFDLHNEQUFnRDtBQUNoRCw0REFBc0Q7QUFDdEQsb0RBQThDO0FBQzlDLGtEQUE0QztBQUM1QyxzREFBZ0Q7QUFDaEQsNENBQXNDO0FBQ3RDOztFQUVFO0FBQ0Y7SUFhSTtJQUFjLENBQUM7SUFDUixlQUFJLEdBQVg7UUFDSSxJQUFJLEdBQUcsR0FBYSxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQztRQUM3QyxHQUFHLENBQUMscUJBQXFCLEVBQUMsbUJBQVMsQ0FBQyxDQUFDO1FBQ3JDLEdBQUcsQ0FBQyw0QkFBNEIsRUFBQyxvQkFBVSxDQUFDLENBQUM7UUFDN0MsR0FBRyxDQUFDLHdCQUF3QixFQUFDLGdCQUFNLENBQUMsQ0FBQztRQUNyQyxHQUFHLENBQUMsdUJBQXVCLEVBQUMsbUJBQVMsQ0FBQyxDQUFDO1FBQ3ZDLEdBQUcsQ0FBQyxnQkFBZ0IsRUFBQyxjQUFJLENBQUMsQ0FBQztRQUMzQixHQUFHLENBQUMscUJBQXFCLEVBQUMsbUJBQVMsQ0FBQyxDQUFDO1FBQ3JDLEdBQUcsQ0FBQywrQkFBK0IsRUFBQyx1QkFBYSxDQUFDLENBQUM7UUFDbkQsR0FBRyxDQUFDLHNCQUFzQixFQUFDLGtCQUFRLENBQUMsQ0FBQztRQUNyQyxHQUFHLENBQUMsb0JBQW9CLEVBQUMsa0JBQVEsQ0FBQyxDQUFDO1FBQ25DLEdBQUcsQ0FBQyxpQ0FBaUMsRUFBQyw2QkFBbUIsQ0FBQyxDQUFDO1FBQzNELEdBQUcsQ0FBQyxnQkFBZ0IsRUFBQyxjQUFJLENBQUMsQ0FBQztRQUMzQixHQUFHLENBQUMsd0JBQXdCLEVBQUMsc0JBQVksQ0FBQyxDQUFDO1FBQzNDLEdBQUcsQ0FBQywyQkFBMkIsRUFBQyx5QkFBZSxDQUFDLENBQUM7UUFDakQsR0FBRyxDQUFDLHdCQUF3QixFQUFDLG9CQUFVLENBQUMsQ0FBQztRQUN6QyxHQUFHLENBQUMsa0JBQWtCLEVBQUMsZ0JBQU0sQ0FBQyxDQUFDO1FBQy9CLEdBQUcsQ0FBQyx5QkFBeUIsRUFBQyxxQkFBVyxDQUFDLENBQUM7UUFDM0MsR0FBRyxDQUFDLDZCQUE2QixFQUFDLHlCQUFlLENBQUMsQ0FBQztRQUNuRCxHQUFHLENBQUMsdUJBQXVCLEVBQUMscUJBQVcsQ0FBQyxDQUFDO1FBQ3pDLEdBQUcsQ0FBQyw2QkFBNkIsRUFBQyx5QkFBZSxDQUFDLENBQUM7UUFDbkQsR0FBRyxDQUFDLHNCQUFzQixFQUFDLGtCQUFRLENBQUMsQ0FBQztRQUNyQyxHQUFHLENBQUMseUJBQXlCLEVBQUMscUJBQVcsQ0FBQyxDQUFDO1FBQzNDLEdBQUcsQ0FBQyw0QkFBNEIsRUFBQyx3QkFBYyxDQUFDLENBQUM7UUFDakQsR0FBRyxDQUFDLHNCQUFzQixFQUFDLHNCQUFZLENBQUMsQ0FBQztRQUN6QyxHQUFHLENBQUMsdUJBQXVCLEVBQUMsbUJBQVMsQ0FBQyxDQUFDO1FBQ3ZDLEdBQUcsQ0FBQyx5QkFBeUIsRUFBQyxxQkFBVyxDQUFDLENBQUM7UUFDM0MsR0FBRyxDQUFDLG1CQUFtQixFQUFDLGlCQUFPLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBekNNLGdCQUFLLEdBQVEsR0FBRyxDQUFDO0lBQ2pCLGlCQUFNLEdBQVEsSUFBSSxDQUFDO0lBQ25CLG9CQUFTLEdBQVEsWUFBWSxDQUFDO0lBQzlCLHFCQUFVLEdBQVEsTUFBTSxDQUFDO0lBQ3pCLGlCQUFNLEdBQVEsS0FBSyxDQUFDO0lBQ3BCLGlCQUFNLEdBQVEsTUFBTSxDQUFDO0lBQ3JCLHFCQUFVLEdBQUssb0JBQW9CLENBQUM7SUFDcEMsb0JBQVMsR0FBUSxFQUFFLENBQUM7SUFDcEIsZ0JBQUssR0FBUyxLQUFLLENBQUM7SUFDcEIsZUFBSSxHQUFTLEtBQUssQ0FBQztJQUNuQix1QkFBWSxHQUFTLEtBQUssQ0FBQztJQUMzQiw0QkFBaUIsR0FBUyxJQUFJLENBQUM7SUErQjFDLGlCQUFDO0NBM0NELEFBMkNDLElBQUE7a0JBM0NvQixVQUFVO0FBNEMvQixVQUFVLENBQUMsSUFBSSxFQUFFLENBQUM7Ozs7QUMxRWxCLDJDQUFzQztBQUN0QyxvREFBK0M7QUFDL0MsbURBQW1FO0FBQ25FLHNDQUFxQztBQUdyQztJQUNDO1FBQ0UscURBQXFEO1FBQ2hELElBQU0sR0FBRyxHQUFRLE1BQU0sQ0FBQztRQUN4QixHQUFHLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUM7UUFDaEMsR0FBRyxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDO1FBQ3hDLGdCQUFnQjtRQUNoQixJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUM7WUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLG9CQUFVLENBQUMsS0FBSyxFQUFFLG9CQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7O1lBQ2xFLElBQUksQ0FBQyxJQUFJLENBQUMsb0JBQVUsQ0FBQyxLQUFLLEVBQUUsb0JBQVUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDbkUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUM1QyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2xELElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLG9CQUFVLENBQUMsU0FBUyxDQUFDO1FBQzVDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLG9CQUFVLENBQUMsVUFBVSxDQUFDO1FBQzlDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQztRQUMvQixvQkFBb0I7UUFDcEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsR0FBRyxvQkFBVSxDQUFDLGlCQUFpQixDQUFDO1FBRTFELG9EQUFvRDtRQUNwRCxJQUFJLG9CQUFVLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxJQUFJLE1BQU07WUFBRSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUM5RixJQUFJLG9CQUFVLENBQUMsWUFBWSxJQUFJLElBQUksQ0FBQyxrQkFBa0IsQ0FBQztZQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQzNGLElBQUksb0JBQVUsQ0FBQyxJQUFJO1lBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUN0QyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDO1FBRTdCLE9BQU87UUFDUCxzQkFBWSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsUUFBUTtRQUU3QixnREFBZ0Q7UUFDaEQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3JJLENBQUM7SUFFRCw4QkFBZSxHQUFmO1FBQ0MsK0NBQStDO1FBQy9DLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO0lBQ2pHLENBQUM7SUFFRCw2QkFBYyxHQUFkO1FBQ0MsY0FBYztRQUNkLGVBQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUNyQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxvQkFBVSxDQUFDLFVBQVUsRUFBQyxJQUFJLEVBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksRUFBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFBO0lBQ3JHLENBQUM7SUFDRCxtQ0FBb0IsR0FBcEIsVUFBcUIsWUFBeUI7UUFDN0MsS0FBSztRQUNDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLCtCQUFjLEVBQ3BDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLEVBQy9DLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksRUFBQyxJQUFJLENBQUMscUJBQXFCLEVBQUMsQ0FBQyxZQUFZLENBQUMsRUFBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQzdFLENBQUM7SUFFRCxvQ0FBcUIsR0FBckIsVUFBc0IsWUFBeUIsRUFBQyxRQUFlO1FBQzlELE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFMUIsWUFBWSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsOEJBQWUsR0FBZjtRQUNDLFlBQVk7UUFDWixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUMsSUFBSSxFQUFDLElBQUksRUFBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUMsQ0FBQztZQUNoRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxnQ0FBZSxDQUFDLENBQUM7UUFDbkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ04sQ0FBQztJQUNGLFdBQUM7QUFBRCxDQTNEQSxBQTJEQyxJQUFBO0FBQ0QsT0FBTztBQUNQLElBQUksSUFBSSxFQUFFLENBQUM7OztBQ25FWDs7Ozs7O0dBTUc7O0FBRUg7SUFBK0IsNkJBQW9CO0lBQW5EO1FBQUEscUVBK0NDO1FBckNHLFlBQVk7UUFDWixjQUFRLEdBQVUsRUFBRSxDQUFDLENBQUMsTUFBTTtRQU01QixhQUFhO1FBQ2IsaUJBQVcsR0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPO1FBTTdCLFlBQVk7UUFDWixnQkFBVSxHQUFVLEVBQUUsQ0FBQztRQWdCdkIsY0FBYztRQUNkLG1CQUFhLEdBQVksRUFBRSxDQUFDOztJQUtoQyxDQUFDO0lBNUNVLHFCQUFXLEdBQWxCO1FBQ0ksSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRTtZQUMxQixJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxTQUFTLEVBQUUsQ0FBQztTQUM3QztRQUNELE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDO0lBQ25DLENBQUM7SUFJRCwrQkFBVyxHQUFYLFVBQVksUUFBZTtRQUN2QixJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUN6QixJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUlELCtCQUFXLEdBQVgsVUFBWSxRQUFZO1FBQ3BCLElBQUksQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFDO1FBQzVCLElBQUksQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQTtJQUNuRCxDQUFDO0lBSUQsaUNBQWEsR0FBYixVQUFjLElBQVc7UUFDckIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7UUFDdkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQy9DLENBQUM7SUFFRCxXQUFXO0lBQ1gsNEJBQVEsR0FBUixVQUFTLE1BQWM7UUFDbkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUMsTUFBTSxDQUFDLENBQUE7SUFDakMsQ0FBQztJQUVELFVBQVU7SUFDViw4QkFBVSxHQUFWLFVBQVcsTUFBYztRQUNyQixJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBQyxNQUFNLENBQUMsQ0FBQTtJQUNsQyxDQUFDO0lBSUQsb0NBQWdCLEdBQWhCLFVBQWlCLElBQWE7UUFDMUIsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUM7UUFDMUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsRUFBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFBO0lBQ3ZELENBQUM7SUFDTCxnQkFBQztBQUFELENBL0NBLEFBK0NDLENBL0M4QixJQUFJLENBQUMsZUFBZSxHQStDbEQ7QUEvQ1ksOEJBQVM7OztBQ1J0Qjs7Ozs7O0dBTUc7O0FBRUgsK0JBQW1DO0FBQ25DLHlDQUF3QztBQUV4QyxrQkFBZTtJQUNYLFlBQVk7SUFDWixXQUFXO1FBQ1AsT0FBTyxJQUFJLE9BQU8sQ0FBQyxVQUFDLE9BQU8sRUFBRSxNQUFNO1lBQy9CLFVBQUcsQ0FBQyxlQUFlLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsR0FBUTtnQkFDbkMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUU7b0JBQ1gsU0FBUztvQkFDVCxxQkFBUyxDQUFDLFdBQVcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7b0JBQ2pELE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtpQkFDZjtxQkFBTTtvQkFDSCxxQkFBUyxDQUFDLFdBQVcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQTtvQkFDdkMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO2lCQUNkO1lBQ0wsQ0FBQyxDQUFDLENBQUE7UUFDTixDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUM7SUFFRCxhQUFhO0lBQ2IsWUFBWTtRQUNSLE9BQU8sSUFBSSxPQUFPLENBQUMsVUFBQyxPQUFPLEVBQUUsTUFBTTtZQUMvQixVQUFHLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLEdBQVE7Z0JBQ2pDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFO29CQUNYLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtpQkFDZjtxQkFBTTtvQkFDSCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7aUJBQ2Q7WUFDTCxDQUFDLENBQUMsQ0FBQTtRQUNOLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQztJQUNEOztPQUVHO0lBQ0gsY0FBYyxZQUFDLFNBQWlCO1FBQzVCLE9BQU8sSUFBSSxPQUFPLENBQUMsVUFBQyxPQUFPLEVBQUUsTUFBTTtZQUMvQixVQUFHLENBQUMsZUFBZSxFQUFFLEVBQUMsU0FBUyxXQUFBLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLEdBQVE7Z0JBQzVDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFO29CQUNYLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtpQkFDZjtxQkFBTTtvQkFDSCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7aUJBQ2Q7WUFDTCxDQUFDLENBQUMsQ0FBQTtRQUNOLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQztJQUNELGNBQWM7SUFDZCxZQUFZO1FBQ1IsT0FBTyxJQUFJLE9BQU8sQ0FBQyxVQUFDLE9BQU8sRUFBRSxNQUFNO1lBQy9CLFVBQUcsQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsR0FBUTtnQkFDbEMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUU7b0JBQ1gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBO2lCQUNmO3FCQUFNO29CQUNILE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtpQkFDZDtZQUNMLENBQUMsQ0FBQyxDQUFBO1FBQ04sQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDO0lBRUQ7O09BRUc7SUFDSCxlQUFlLFlBQUMsT0FBYztRQUMxQixPQUFPLElBQUksT0FBTyxDQUFDLFVBQUMsT0FBTyxFQUFDLE1BQU07WUFDOUIsVUFBRyxDQUFDLFlBQVksRUFBRSxFQUFFLE9BQU8sU0FBQSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxHQUFRO2dCQUN6QyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTtvQkFDWCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7aUJBQ2Y7cUJBQU07b0JBQ0gsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO2lCQUNkO1lBQ0wsQ0FBQyxDQUFDLENBQUE7UUFDTixDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUM7SUFFRDs7O09BR0c7SUFDSCxXQUFXLFlBQUMsSUFBZSxFQUFDLFFBQW9CO1FBQXBDLHFCQUFBLEVBQUEsUUFBZTtRQUFDLHlCQUFBLEVBQUEsYUFBb0I7UUFDNUMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxVQUFDLE9BQU8sRUFBQyxNQUFNO1lBQzlCLFVBQUcsQ0FBQyxpQkFBaUIsRUFBQyxFQUFDLElBQUksTUFBQSxFQUFDLFFBQVEsVUFBQSxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxHQUFPO2dCQUNoRCxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTtvQkFDWCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7aUJBQ2Y7cUJBQU07b0JBQ0gsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO2lCQUNkO1lBQ0wsQ0FBQyxDQUFDLENBQUE7UUFDTixDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILGVBQWUsWUFBQyxJQUFlLEVBQUMsUUFBb0IsRUFBQyxTQUFpQixFQUFDLFNBQWlCO1FBQXhFLHFCQUFBLEVBQUEsUUFBZTtRQUFDLHlCQUFBLEVBQUEsYUFBb0I7UUFDaEQsT0FBTyxJQUFJLE9BQU8sQ0FBQyxVQUFDLE9BQU8sRUFBQyxNQUFNO1lBQzlCLFVBQUcsQ0FBQyxnQkFBZ0IsRUFBQyxFQUFDLElBQUksTUFBQSxFQUFDLFFBQVEsVUFBQSxFQUFDLFNBQVMsV0FBQSxFQUFDLFNBQVMsV0FBQSxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxHQUFPO2dCQUNuRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTtvQkFDWCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7aUJBQ2Y7cUJBQU07b0JBQ0gsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO2lCQUNkO1lBQ0wsQ0FBQyxDQUFDLENBQUE7UUFDTixDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUM7SUFFRCxZQUFZO0lBQ1osZ0JBQWdCO1FBQ1osT0FBTyxJQUFJLE9BQU8sQ0FBQyxVQUFDLE9BQU8sRUFBQyxNQUFNO1lBQzlCLFVBQUcsQ0FBQyxpQkFBaUIsRUFBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxHQUFPO2dCQUNuQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTtvQkFDWCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7aUJBQ2Y7cUJBQU07b0JBQ0gsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO2lCQUNkO1lBQ0wsQ0FBQyxDQUFDLENBQUE7UUFDTixDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsYUFBYSxZQUFDLFNBQWdCLEVBQUMsSUFBZSxFQUFDLFFBQW9CO1FBQXBDLHFCQUFBLEVBQUEsUUFBZTtRQUFDLHlCQUFBLEVBQUEsYUFBb0I7UUFDL0QsT0FBTyxJQUFJLE9BQU8sQ0FBQyxVQUFDLE9BQU8sRUFBQyxNQUFNO1lBQzlCLFVBQUcsQ0FBQyxjQUFjLEVBQUMsRUFBQyxTQUFTLFdBQUEsRUFBQyxJQUFJLE1BQUEsRUFBQyxRQUFRLFVBQUEsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsR0FBTztnQkFDdkQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUU7b0JBQ1gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBO2lCQUNmO3FCQUFNO29CQUNILE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtpQkFDZDtZQUNMLENBQUMsQ0FBQyxDQUFBO1FBQ04sQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsV0FBVyxZQUFDLElBQWUsRUFBQyxRQUFvQjtRQUFwQyxxQkFBQSxFQUFBLFFBQWU7UUFBQyx5QkFBQSxFQUFBLGFBQW9CO1FBQzVDLE9BQU8sSUFBSSxPQUFPLENBQUMsVUFBQyxPQUFPLEVBQUMsTUFBTTtZQUM5QixVQUFHLENBQUMsa0JBQWtCLEVBQUMsRUFBQyxJQUFJLE1BQUEsRUFBQyxRQUFRLFVBQUEsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsR0FBTztnQkFDakQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUU7b0JBQ1gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBO2lCQUNmO3FCQUFNO29CQUNILE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtpQkFDZDtZQUNMLENBQUMsQ0FBQyxDQUFBO1FBQ04sQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILGNBQWMsWUFBQyxJQUFlLEVBQUMsUUFBb0IsRUFBQyxJQUFZO1FBQWpELHFCQUFBLEVBQUEsUUFBZTtRQUFDLHlCQUFBLEVBQUEsYUFBb0I7UUFDL0MsT0FBTyxJQUFJLE9BQU8sQ0FBQyxVQUFDLE9BQU8sRUFBQyxNQUFNO1lBQzlCLFVBQUcsQ0FBQyxtQkFBbUIsRUFBQyxFQUFDLElBQUksTUFBQSxFQUFDLFFBQVEsVUFBQSxFQUFDLElBQUksTUFBQSxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxHQUFPO2dCQUN2RCxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTtvQkFDWCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7aUJBQ2Y7cUJBQU07b0JBQ0gsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO2lCQUNkO1lBQ0wsQ0FBQyxDQUFDLENBQUE7UUFDTixDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsWUFBWSxZQUFDLE1BQWEsRUFBQyxRQUFlLEVBQUMsV0FBa0I7UUFBN0QsaUJBV0M7UUFWRyxPQUFPLElBQUksT0FBTyxDQUFDLFVBQUMsT0FBTyxFQUFDLE1BQU07WUFDOUIsV0FBSSxDQUFDLFlBQVksRUFBRSxFQUFFLE1BQU0sUUFBQSxFQUFDLFFBQVEsVUFBQSxFQUFDLFdBQVcsYUFBQSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxHQUFRO2dCQUM5RCxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTtvQkFDWCxLQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7b0JBQ2xCLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtpQkFDZjtxQkFBTTtvQkFDSCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7aUJBQ2Q7WUFDTCxDQUFDLENBQUMsQ0FBQTtRQUNOLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQztDQUNKLENBQUE7Ozs7QUNwTUQ7Ozs7OztHQU1HO0FBQ0gsK0JBQTBCO0FBRTFCLGVBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztBQUMvQixlQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsbUNBQW1DLENBQUM7QUFDbEYsZUFBSyxDQUFDLFFBQVEsQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLENBQUUsWUFBWTtBQUNwRCw0REFBNEQ7QUFFNUQsSUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQztBQUMvQixJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLE1BQU0sS0FBSyxXQUFXLEVBQUU7SUFDN0QsZUFBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEdBQUcsZ0NBQWdDLENBQUE7SUFDekQsMERBQTBEO0NBQzNEO0tBQU07SUFDTCxlQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sR0FBRyw4QkFBOEIsQ0FBQTtDQUN4RDtBQUVELHlCQUF5QjtBQUN6QixzQkFBc0IsTUFBYTtJQUNqQyxJQUFNLElBQUksR0FBRyxJQUFJLFFBQVEsRUFBRSxDQUFDO0lBQzVCLEtBQUssSUFBTSxHQUFHLElBQUksTUFBTSxFQUFFO1FBQ3hCLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0tBQzlCO0lBQ0QsT0FBTyxJQUFJLENBQUE7QUFDYixDQUFDO0FBRUQsWUFBWTtBQUNaLElBQU0sVUFBVSxHQUFHLENBQUMsYUFBYSxFQUFDLGVBQWUsQ0FBQyxDQUFBO0FBRWxELGtCQUFrQjtBQUNsQixlQUFLLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQzVCLFVBQUEsTUFBTTtJQUNKLFNBQVM7SUFDVCxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRztRQUN0QyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLFlBQVksQ0FBQTtLQUN2QztTQUFJO1FBQ0gsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxZQUFZLENBQUM7S0FDeEM7SUFFRCxJQUFJLE1BQU0sQ0FBQyxNQUFNLElBQUksTUFBTSxFQUFFO1FBQzNCLE1BQU0sQ0FBQyxJQUFJLEdBQUcsWUFBWSxjQUNyQixNQUFNLENBQUMsSUFBSSxFQUNkLENBQUE7S0FDSDtTQUFLLElBQUcsTUFBTSxDQUFDLE1BQU0sSUFBSSxLQUFLLEVBQUM7UUFDOUIsTUFBTSxDQUFDLE1BQU0sZ0JBQ1IsTUFBTSxDQUFDLE1BQU0sQ0FDakIsQ0FBQTtLQUNGO0lBQ0QsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQyxFQUNELFVBQUEsS0FBSztJQUNILE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMvQixDQUFDLENBQ0YsQ0FBQztBQUNGLG1CQUFtQjtBQUNuQixlQUFLLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQzdCLFVBQUEsUUFBUTtJQUNOLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRTtRQUMxQixNQUFNO0tBQ1A7SUFDRCxPQUFPLFFBQVEsQ0FBQztBQUNsQixDQUFDLEVBQ0QsVUFBQSxLQUFLO0lBQ0gsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQy9CLENBQUMsQ0FDRixDQUFDO0FBRUY7Ozs7O0dBS0c7QUFDSCxhQUFvQixHQUFVLEVBQUUsTUFBYTtJQUMzQyxPQUFPLElBQUksT0FBTyxDQUFDLFVBQUMsT0FBTyxFQUFFLE1BQU07UUFDakMsZUFBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsRUFBRSxNQUFNLFFBQUEsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUEsUUFBUTtZQUN0QyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUU7Z0JBQzFCLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQzlCO2lCQUFLO2dCQUNKLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQ2hDO1FBQ0gsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQUEsR0FBRztZQUNWLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNkLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBWkQsa0JBWUM7QUFFRDs7Ozs7R0FLRztBQUVILGNBQXFCLEdBQVUsRUFBRSxJQUFXO0lBQzFDLE9BQU8sSUFBSSxPQUFPLENBQUMsVUFBQyxPQUFPLEVBQUUsTUFBTTtRQUNqQyxlQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQ3hCLFVBQUEsUUFBUTtZQUNOLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRTtnQkFDMUIsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDOUI7aUJBQU07Z0JBQ0wsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDaEM7UUFDSCxDQUFDLEVBQ0QsVUFBQSxHQUFHO1lBQ0QsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsQ0FBQyxDQUNGLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFmRCxvQkFlQzs7O0FDbEhEOzs7Ozs7R0FNRzs7QUFFSCxrQkFBZTtJQUNYLFNBQVM7UUFDTCxJQUFNLGNBQWMsR0FBZ0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFtQixDQUFDO1FBQ25FLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxjQUFjLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ2pELElBQU0sS0FBSyxHQUFHLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0MsSUFBSSxLQUFLLFlBQVksSUFBSSxDQUFDLEtBQUssRUFBRTtnQkFDN0IsT0FBTyxLQUFLLENBQUM7YUFDaEI7U0FDSjtRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2hCLENBQUM7Q0FDSixDQUFBOzs7O0FDbkJELHlDQUF3QztBQUl4Qzs7Ozs7O0dBTUc7QUFFSCxtRkFBbUY7QUFFbkY7SUFBNEIsMEJBQWdCO0lBQTVDOztJQWlHQSxDQUFDO0lBMUZHLFVBQVU7SUFDSCxtQkFBWSxHQUFuQjtRQUNJLElBQU0sUUFBUSxHQUFPLHFCQUFTLENBQUMsV0FBVyxFQUFFLENBQUMsUUFBUSxDQUFDO1FBQ3RELElBQUksUUFBUSxDQUFDLE1BQU0sRUFBRTtZQUNqQixNQUFNLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLElBQUcsVUFBUSxRQUFRLENBQUMsTUFBUSxDQUFBLENBQUE7U0FDNUQ7UUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRTtZQUNaLG9CQUFvQjtZQUNwQixNQUFNLENBQUMsRUFBRSxHQUFHLElBQUksU0FBUyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN4QyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDO1lBQ25DLE1BQU0sQ0FBQyxFQUFFLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUM7WUFDekMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQztZQUNyQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDO1NBQ3hDO0lBQ0wsQ0FBQztJQUNELGdCQUFnQjtJQUNULGVBQVEsR0FBZjtRQUNJLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLE1BQU07SUFDN0IsQ0FBQztJQUNELFlBQVk7SUFDTCxnQkFBUyxHQUFoQjtRQUNJLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDbEIsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsSUFBSTtJQUMvQixDQUFDO0lBQ0QsZ0JBQWdCO0lBQ1Qsa0JBQVcsR0FBbEIsVUFBbUIsQ0FBTTtRQUNyQixJQUFJLE1BQVUsQ0FBQztRQUNmLElBQUksT0FBVyxDQUFDO1FBQ2hCLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUU7WUFDdEMsTUFBTSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLO1NBQ3pCO2FBQUk7WUFDRCxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLO1lBQ2xDLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDO1lBQ3pCLFNBQVM7WUFDVCxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssV0FBVyxFQUFFO2dCQUM5QixxQkFBUyxDQUFDLFdBQVcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7YUFDckQ7WUFDRCxTQUFTO1lBQ1QsSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRTtnQkFDMUIsU0FBUztnQkFDVCxxQkFBUyxDQUFDLFdBQVcsRUFBRSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUE7Z0JBQ3RELFFBQVE7Z0JBQ1IsSUFBSSxPQUFPLENBQUMsTUFBTSxFQUFFO29CQUNoQixxQkFBUyxDQUFDLFdBQVcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtpQkFDekM7YUFDSjtZQUNELFNBQVM7WUFDVCxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFO2dCQUM1QixxQkFBUyxDQUFDLFdBQVcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQTthQUMzQztZQUNELGFBQWE7WUFDYixJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFO2dCQUM1QixxQkFBUyxDQUFDLFdBQVcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTthQUM3RDtTQUNKO0lBQ0wsQ0FBQztJQUNELFVBQVU7SUFDSCxpQkFBVSxHQUFqQixVQUFrQixJQUFVLEVBQUMsTUFBYztRQUFkLHVCQUFBLEVBQUEsVUFBYztRQUN2QyxJQUFJLEdBQUcsR0FBRztZQUNOLE9BQU8sRUFBRSxnQkFBZ0I7WUFDekIsT0FBTyxFQUFFO2dCQUNMO29CQUNJLE1BQU0sRUFBRSxJQUFJO29CQUNaLFFBQVEsRUFBRSxNQUFNO29CQUNoQixZQUFZLEVBQUUsSUFBSTtpQkFDckI7YUFDSjtTQUNKLENBQUE7UUFDRCxJQUFJLE1BQU0sQ0FBQyxFQUFFLEtBQUssSUFBSSxJQUFJLE1BQU0sQ0FBQyxFQUFFLENBQUMsVUFBVSxLQUFLLENBQUMsRUFBRTtZQUNsRCxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2xCLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFBLElBQUk7U0FDN0I7YUFBTSxJQUFHLE1BQU0sQ0FBQyxFQUFFLENBQUMsVUFBVSxLQUFLLENBQUMsRUFBRTtZQUNsQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7U0FDdEM7YUFBSyxJQUFHLE1BQU0sQ0FBQyxFQUFFLENBQUMsVUFBVSxLQUFLLENBQUMsRUFBQztZQUNoQyxVQUFVLENBQUM7Z0JBQ1AsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQ3ZDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztTQUNaO0lBQ0wsQ0FBQztJQUNELFVBQVU7SUFDSCxnQkFBUyxHQUFoQjtRQUNJLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDeEIsQ0FBQztJQUNELFVBQVU7SUFDSCxlQUFRLEdBQWY7UUFDSSxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN2QixNQUFNLENBQUMsdUJBQXVCLEdBQUcsV0FBVyxDQUFDO1lBQ3pDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzNCLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUNiLENBQUM7SUE5Rk0sYUFBTSxHQUFXLDZDQUE2QyxDQUFBO0lBQzlELFNBQUUsR0FBUSxFQUFFLENBQUM7SUFDcEIsYUFBYTtJQUNOLDhCQUF1QixHQUFPLElBQUksQ0FBQztJQTRGOUMsYUFBQztDQWpHRCxBQWlHQyxDQWpHMkIsSUFBSSxDQUFDLFdBQVcsR0FpRzNDO0FBakdZLHdCQUFNOzs7O0FDZG5COzs7Ozs7R0FNRztBQUNILGtCQUFlO0lBQ1g7OztPQUdHO0lBQ0gsT0FBTyxZQUFDLEdBQVE7UUFDWixPQUFPLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQztZQUM1QyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLEVBQUUsVUFBVSxFQUFFO2dCQUMvQyxPQUFPLEVBQUUsR0FBRyxHQUFHLENBQUM7WUFDcEIsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFRDs7O09BR0c7SUFDSCxJQUFJLFlBQUMsUUFBYTtRQUNkLE9BQU8sSUFBSSxPQUFPLENBQUMsVUFBQyxPQUFPLEVBQUUsTUFBTTtZQUMvQixJQUFJLE9BQU8sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsdUJBQXVCO1lBQ3RFLE9BQU8sQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDO1lBQ3pCLElBQUksTUFBTSxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM1QixPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakIsUUFBUSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM3QixPQUFPLENBQUMsTUFBTSxFQUFFLENBQUE7WUFDaEIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xCLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQztJQUVELGFBQWE7SUFDYixPQUFPLFlBQUMsR0FBUTtRQUNaLElBQUksR0FBRyxHQUFHLG1CQUFtQixDQUFDO1FBQzlCLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN6QixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILFNBQVMsWUFBQyxLQUFVLEVBQUUsUUFBYTtRQUMvQixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUM7UUFDakIsS0FBSyxHQUFHLFdBQVcsQ0FBQztZQUNoQixJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUU7Z0JBQ1gsSUFBSSxHQUFHLEdBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xELElBQUksSUFBSSxHQUFRLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUM7Z0JBQzNELElBQUksTUFBTSxHQUFRLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQztnQkFDekUsSUFBSSxNQUFNLEdBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsQ0FBQztnQkFDOUYsR0FBRyxHQUFHLE1BQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUcsR0FBSyxDQUFDO2dCQUNyQyxJQUFJLEdBQUcsTUFBRyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBRyxJQUFNLENBQUM7Z0JBQ3hDLE1BQU0sR0FBRyxNQUFHLE1BQU0sR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFHLE1BQVEsQ0FBQztnQkFDOUMsTUFBTSxHQUFHLE1BQUcsTUFBTSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUcsTUFBUSxDQUFDO2dCQUM5QyxRQUFRLENBQUksSUFBSSxTQUFJLE1BQU0sU0FBSSxNQUFRLENBQUMsQ0FBQTtnQkFDdkMsS0FBSyxFQUFFLENBQUM7YUFDWDtpQkFBTTtnQkFDSCxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3JCLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQTthQUNsQjtRQUNMLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNULElBQUksS0FBSyxJQUFJLENBQUMsRUFBRTtZQUNaLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNyQixRQUFRLENBQUMsS0FBSyxDQUFDLENBQUE7U0FDbEI7SUFDTCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsVUFBVSxZQUFDLENBQU0sRUFBRSxDQUFNO1FBQ3JCLElBQUksQ0FBQyxDQUFDLENBQUMsWUFBWSxJQUFJLENBQUMsRUFBRTtZQUN0QixJQUFJLElBQUksR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO1lBQ3ZCLENBQUMsR0FBRyxJQUFJLENBQUM7U0FDWjtRQUNELElBQUksQ0FBQyxHQUFHO1lBQ0osQ0FBQyxFQUFFLENBQUMsQ0FBQyxXQUFXLEVBQUU7WUFDbEIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDO1lBQ25CLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFO1lBQ2QsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUU7WUFDZixDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsRUFBRTtZQUNqQixDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsRUFBRTtTQUNwQixDQUFDO1FBQ0YsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLHNCQUFzQixFQUFFLFVBQVUsQ0FBQztZQUNoRCxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUMvRCxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUNqQyxDQUFDO1FBQ04sQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBQ0Q7OztLQUdDO0lBQ0QsY0FBYyxZQUFDLFNBQVM7UUFDcEIsSUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUN0QixJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDM0IsSUFBSSxDQUFDLEdBQW1CLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDNUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0IsSUFBSSxDQUFDLEdBQW1CLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN2QyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzQixJQUFJLENBQUMsR0FBbUIsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3hDLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNCLElBQUksTUFBTSxHQUFtQixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDL0MsSUFBSSxNQUFNLEdBQW1CLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUMvQyxNQUFNLEdBQUcsTUFBTSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUMvQyxNQUFNLEdBQUcsTUFBTSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUMvQyxPQUFPLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsTUFBTSxHQUFHLEdBQUcsR0FBRyxNQUFNLENBQUM7SUFDekUsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxTQUFTLFlBQUMsSUFBUyxFQUFFLE1BQVc7UUFDNUIsSUFBSSxLQUFLLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pCLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDeEIsSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQy9DLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQy9ELElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxNQUFNLEVBQUU7Z0JBQ3ZCLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQzthQUNuQztZQUNELEtBQUssR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLEtBQUssQ0FBQztZQUMzQixPQUFPLEtBQUssQ0FBQztTQUNoQjthQUFNO1lBQ0gsT0FBTyxJQUFJLENBQUM7U0FDZjtJQUNMLENBQUM7SUFFRCxVQUFVO0lBQ1YsTUFBTSxZQUFDLElBQUksRUFBQyxJQUFJO1FBQ1osSUFBSSxFQUFFLEVBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQztRQUNaLElBQUc7WUFBQyxFQUFFLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7U0FBQztRQUFBLE9BQU0sQ0FBQyxFQUFDO1lBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQTtTQUFDO1FBQzFELElBQUc7WUFBQyxFQUFFLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7U0FBQztRQUFBLE9BQU0sQ0FBQyxFQUFDO1lBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQTtTQUFDO1FBQzFELENBQUMsR0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzlCLE9BQU8sQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLElBQUksR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7SUFDNUIsQ0FBQztJQUNELFVBQVU7SUFDVixNQUFNLFlBQUMsSUFBSSxFQUFDLElBQUk7UUFDWixJQUFJLEVBQUUsRUFBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztRQUNkLElBQUc7WUFBQyxFQUFFLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7U0FBQztRQUFBLE9BQU0sQ0FBQyxFQUFDO1lBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQTtTQUFDO1FBQzFELElBQUc7WUFBQyxFQUFFLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7U0FBQztRQUFBLE9BQU0sQ0FBQyxFQUFDO1lBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQTtTQUFDO1FBQzFELENBQUMsR0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQy9CLENBQUMsR0FBQyxDQUFDLEVBQUUsSUFBRSxFQUFFLENBQUMsQ0FBQSxDQUFDLENBQUEsRUFBRSxDQUFBLENBQUMsQ0FBQSxFQUFFLENBQUM7UUFDakIsT0FBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFDRCxVQUFVO0lBQ1YsTUFBTSxZQUFDLElBQUksRUFBQyxJQUFJO1FBQ1osSUFBSSxFQUFFLEdBQUMsQ0FBQyxFQUFDLEVBQUUsR0FBQyxDQUFDLEVBQUMsRUFBRSxFQUFDLEVBQUUsQ0FBQztRQUNwQixJQUFHO1lBQUMsRUFBRSxHQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxD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LENBQUM7OztPQUFBO0lBRUQsK0JBQVEsR0FBUjtRQUNHLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFDLElBQUksRUFBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDekQsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3ZCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxLQUFLLENBQUMsQ0FBQTtJQUMxQixDQUFDO0lBQ00saUJBQUksR0FBWDtRQUFBLGlCQU1DO1FBTEcscUJBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLENBQUMsa0JBQWtCLEVBQUMsSUFBSSxFQUFDLFVBQUMsR0FBTztZQUN2RCxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2pCLEtBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztZQUM3QixLQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDO1FBQ2pDLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQztJQUVELGtDQUFXLEdBQVg7UUFDSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDaEIsQ0FBQztJQUVMLG1CQUFDO0FBQUQsQ0E5QkEsQUE4QkMsQ0E5QnlDLGNBQUUsQ0FBQyxRQUFRLENBQUMsWUFBWSxHQThCakUiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbInZhciBfX2V4dGVuZHMgPSAodGhpcyAmJiB0aGlzLl9fZXh0ZW5kcykgfHwgKGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBleHRlbmRTdGF0aWNzID0gT2JqZWN0LnNldFByb3RvdHlwZU9mIHx8XHJcbiAgICAgICAgKHsgX19wcm90b19fOiBbXSB9IGluc3RhbmNlb2YgQXJyYXkgJiYgZnVuY3Rpb24gKGQsIGIpIHsgZC5fX3Byb3RvX18gPSBiOyB9KSB8fFxyXG4gICAgICAgIGZ1bmN0aW9uIChkLCBiKSB7IGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdOyB9O1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChkLCBiKSB7XHJcbiAgICAgICAgZXh0ZW5kU3RhdGljcyhkLCBiKTtcclxuICAgICAgICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cclxuICAgICAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XHJcbiAgICB9O1xyXG59KSgpO1xyXG4oZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXHJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcclxuXHJcbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxyXG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcclxuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxyXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxyXG5cclxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XHJcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XHJcblxyXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XHJcbn1cclxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xyXG59XHJcbihmdW5jdGlvbiAoKSB7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcclxuICAgICAgICB9XHJcbiAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XHJcbiAgICB9XHJcbiAgICB0cnkge1xyXG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xyXG4gICAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xyXG4gICAgfVxyXG59ICgpKVxyXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xyXG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcclxuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcclxuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xyXG4gICAgfVxyXG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcclxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xyXG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xyXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XHJcbiAgICB9XHJcbiAgICB0cnkge1xyXG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcclxuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xyXG4gICAgfSBjYXRjaChlKXtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xyXG4gICAgICAgIH0gY2F0Y2goZSl7XHJcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXHJcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxufVxyXG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XHJcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcclxuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcclxuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XHJcbiAgICB9XHJcbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXHJcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcclxuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XHJcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xyXG4gICAgfVxyXG4gICAgdHJ5IHtcclxuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXHJcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xyXG4gICAgfSBjYXRjaCAoZSl7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxyXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcclxuICAgICAgICB9IGNhdGNoIChlKXtcclxuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXHJcbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcblxyXG59XHJcbnZhciBxdWV1ZSA9IFtdO1xyXG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcclxudmFyIGN1cnJlbnRRdWV1ZTtcclxudmFyIHF1ZXVlSW5kZXggPSAtMTtcclxuXHJcbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcclxuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGRyYWluaW5nID0gZmFsc2U7XHJcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xyXG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcclxuICAgIH1cclxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcclxuICAgICAgICBkcmFpblF1ZXVlKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XHJcbiAgICBpZiAoZHJhaW5pbmcpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcclxuICAgIGRyYWluaW5nID0gdHJ1ZTtcclxuXHJcbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xyXG4gICAgd2hpbGUobGVuKSB7XHJcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XHJcbiAgICAgICAgcXVldWUgPSBbXTtcclxuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XHJcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcclxuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XHJcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xyXG4gICAgfVxyXG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcclxuICAgIGRyYWluaW5nID0gZmFsc2U7XHJcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XHJcbn1cclxuXHJcbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XHJcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XHJcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcclxuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xyXG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcclxuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xyXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcclxuICAgIHRoaXMuZnVuID0gZnVuO1xyXG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xyXG59XHJcbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xyXG59O1xyXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xyXG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xyXG5wcm9jZXNzLmVudiA9IHt9O1xyXG5wcm9jZXNzLmFyZ3YgPSBbXTtcclxucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXHJcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcclxuXHJcbmZ1bmN0aW9uIG5vb3AoKSB7fVxyXG5cclxucHJvY2Vzcy5vbiA9IG5vb3A7XHJcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xyXG5wcm9jZXNzLm9uY2UgPSBub29wO1xyXG5wcm9jZXNzLm9mZiA9IG5vb3A7XHJcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xyXG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XHJcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XHJcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcclxucHJvY2Vzcy5wcmVwZW5kT25jZUxpc3RlbmVyID0gbm9vcDtcclxuXHJcbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cclxuXHJcbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XHJcbn07XHJcblxyXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xyXG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcclxufTtcclxucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcclxuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2xpYi9heGlvcycpOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xudmFyIHNldHRsZSA9IHJlcXVpcmUoJy4vLi4vY29yZS9zZXR0bGUnKTtcbnZhciBidWlsZFVSTCA9IHJlcXVpcmUoJy4vLi4vaGVscGVycy9idWlsZFVSTCcpO1xudmFyIHBhcnNlSGVhZGVycyA9IHJlcXVpcmUoJy4vLi4vaGVscGVycy9wYXJzZUhlYWRlcnMnKTtcbnZhciBpc1VSTFNhbWVPcmlnaW4gPSByZXF1aXJlKCcuLy4uL2hlbHBlcnMvaXNVUkxTYW1lT3JpZ2luJyk7XG52YXIgY3JlYXRlRXJyb3IgPSByZXF1aXJlKCcuLi9jb3JlL2NyZWF0ZUVycm9yJyk7XG52YXIgYnRvYSA9ICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cuYnRvYSAmJiB3aW5kb3cuYnRvYS5iaW5kKHdpbmRvdykpIHx8IHJlcXVpcmUoJy4vLi4vaGVscGVycy9idG9hJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24geGhyQWRhcHRlcihjb25maWcpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIGRpc3BhdGNoWGhyUmVxdWVzdChyZXNvbHZlLCByZWplY3QpIHtcbiAgICB2YXIgcmVxdWVzdERhdGEgPSBjb25maWcuZGF0YTtcbiAgICB2YXIgcmVxdWVzdEhlYWRlcnMgPSBjb25maWcuaGVhZGVycztcblxuICAgIGlmICh1dGlscy5pc0Zvcm1EYXRhKHJlcXVlc3REYXRhKSkge1xuICAgICAgZGVsZXRlIHJlcXVlc3RIZWFkZXJzWydDb250ZW50LVR5cGUnXTsgLy8gTGV0IHRoZSBicm93c2VyIHNldCBpdFxuICAgIH1cblxuICAgIHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgdmFyIGxvYWRFdmVudCA9ICdvbnJlYWR5c3RhdGVjaGFuZ2UnO1xuICAgIHZhciB4RG9tYWluID0gZmFsc2U7XG5cbiAgICAvLyBGb3IgSUUgOC85IENPUlMgc3VwcG9ydFxuICAgIC8vIE9ubHkgc3VwcG9ydHMgUE9TVCBhbmQgR0VUIGNhbGxzIGFuZCBkb2Vzbid0IHJldHVybnMgdGhlIHJlc3BvbnNlIGhlYWRlcnMuXG4gICAgLy8gRE9OJ1QgZG8gdGhpcyBmb3IgdGVzdGluZyBiL2MgWE1MSHR0cFJlcXVlc3QgaXMgbW9ja2VkLCBub3QgWERvbWFpblJlcXVlc3QuXG4gICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAndGVzdCcgJiZcbiAgICAgICAgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgICAgd2luZG93LlhEb21haW5SZXF1ZXN0ICYmICEoJ3dpdGhDcmVkZW50aWFscycgaW4gcmVxdWVzdCkgJiZcbiAgICAgICAgIWlzVVJMU2FtZU9yaWdpbihjb25maWcudXJsKSkge1xuICAgICAgcmVxdWVzdCA9IG5ldyB3aW5kb3cuWERvbWFpblJlcXVlc3QoKTtcbiAgICAgIGxvYWRFdmVudCA9ICdvbmxvYWQnO1xuICAgICAgeERvbWFpbiA9IHRydWU7XG4gICAgICByZXF1ZXN0Lm9ucHJvZ3Jlc3MgPSBmdW5jdGlvbiBoYW5kbGVQcm9ncmVzcygpIHt9O1xuICAgICAgcmVxdWVzdC5vbnRpbWVvdXQgPSBmdW5jdGlvbiBoYW5kbGVUaW1lb3V0KCkge307XG4gICAgfVxuXG4gICAgLy8gSFRUUCBiYXNpYyBhdXRoZW50aWNhdGlvblxuICAgIGlmIChjb25maWcuYXV0aCkge1xuICAgICAgdmFyIHVzZXJuYW1lID0gY29uZmlnLmF1dGgudXNlcm5hbWUgfHwgJyc7XG4gICAgICB2YXIgcGFzc3dvcmQgPSBjb25maWcuYXV0aC5wYXNzd29yZCB8fCAnJztcbiAgICAgIHJlcXVlc3RIZWFkZXJzLkF1dGhvcml6YXRpb24gPSAnQmFzaWMgJyArIGJ0b2EodXNlcm5hbWUgKyAnOicgKyBwYXNzd29yZCk7XG4gICAgfVxuXG4gICAgcmVxdWVzdC5vcGVuKGNvbmZpZy5tZXRob2QudG9VcHBlckNhc2UoKSwgYnVpbGRVUkwoY29uZmlnLnVybCwgY29uZmlnLnBhcmFtcywgY29uZmlnLnBhcmFtc1NlcmlhbGl6ZXIpLCB0cnVlKTtcblxuICAgIC8vIFNldCB0aGUgcmVxdWVzdCB0aW1lb3V0IGluIE1TXG4gICAgcmVxdWVzdC50aW1lb3V0ID0gY29uZmlnLnRpbWVvdXQ7XG5cbiAgICAvLyBMaXN0ZW4gZm9yIHJlYWR5IHN0YXRlXG4gICAgcmVxdWVzdFtsb2FkRXZlbnRdID0gZnVuY3Rpb24gaGFuZGxlTG9hZCgpIHtcbiAgICAgIGlmICghcmVxdWVzdCB8fCAocmVxdWVzdC5yZWFkeVN0YXRlICE9PSA0ICYmICF4RG9tYWluKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIFRoZSByZXF1ZXN0IGVycm9yZWQgb3V0IGFuZCB3ZSBkaWRuJ3QgZ2V0IGEgcmVzcG9uc2UsIHRoaXMgd2lsbCBiZVxuICAgICAgLy8gaGFuZGxlZCBieSBvbmVycm9yIGluc3RlYWRcbiAgICAgIC8vIFdpdGggb25lIGV4Y2VwdGlvbjogcmVxdWVzdCB0aGF0IHVzaW5nIGZpbGU6IHByb3RvY29sLCBtb3N0IGJyb3dzZXJzXG4gICAgICAvLyB3aWxsIHJldHVybiBzdGF0dXMgYXMgMCBldmVuIHRob3VnaCBpdCdzIGEgc3VjY2Vzc2Z1bCByZXF1ZXN0XG4gICAgICBpZiAocmVxdWVzdC5zdGF0dXMgPT09IDAgJiYgIShyZXF1ZXN0LnJlc3BvbnNlVVJMICYmIHJlcXVlc3QucmVzcG9uc2VVUkwuaW5kZXhPZignZmlsZTonKSA9PT0gMCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBQcmVwYXJlIHRoZSByZXNwb25zZVxuICAgICAgdmFyIHJlc3BvbnNlSGVhZGVycyA9ICdnZXRBbGxSZXNwb25zZUhlYWRlcnMnIGluIHJlcXVlc3QgPyBwYXJzZUhlYWRlcnMocmVxdWVzdC5nZXRBbGxSZXNwb25zZUhlYWRlcnMoKSkgOiBudWxsO1xuICAgICAgdmFyIHJlc3BvbnNlRGF0YSA9ICFjb25maWcucmVzcG9uc2VUeXBlIHx8IGNvbmZpZy5yZXNwb25zZVR5cGUgPT09ICd0ZXh0JyA/IHJlcXVlc3QucmVzcG9uc2VUZXh0IDogcmVxdWVzdC5yZXNwb25zZTtcbiAgICAgIHZhciByZXNwb25zZSA9IHtcbiAgICAgICAgZGF0YTogcmVzcG9uc2VEYXRhLFxuICAgICAgICAvLyBJRSBzZW5kcyAxMjIzIGluc3RlYWQgb2YgMjA0IChodHRwczovL2dpdGh1Yi5jb20vYXhpb3MvYXhpb3MvaXNzdWVzLzIwMSlcbiAgICAgICAgc3RhdHVzOiByZXF1ZXN0LnN0YXR1cyA9PT0gMTIyMyA/IDIwNCA6IHJlcXVlc3Quc3RhdHVzLFxuICAgICAgICBzdGF0dXNUZXh0OiByZXF1ZXN0LnN0YXR1cyA9PT0gMTIyMyA/ICdObyBDb250ZW50JyA6IHJlcXVlc3Quc3RhdHVzVGV4dCxcbiAgICAgICAgaGVhZGVyczogcmVzcG9uc2VIZWFkZXJzLFxuICAgICAgICBjb25maWc6IGNvbmZpZyxcbiAgICAgICAgcmVxdWVzdDogcmVxdWVzdFxuICAgICAgfTtcblxuICAgICAgc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgcmVzcG9uc2UpO1xuXG4gICAgICAvLyBDbGVhbiB1cCByZXF1ZXN0XG4gICAgICByZXF1ZXN0ID0gbnVsbDtcbiAgICB9O1xuXG4gICAgLy8gSGFuZGxlIGxvdyBsZXZlbCBuZXR3b3JrIGVycm9yc1xuICAgIHJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uIGhhbmRsZUVycm9yKCkge1xuICAgICAgLy8gUmVhbCBlcnJvcnMgYXJlIGhpZGRlbiBmcm9tIHVzIGJ5IHRoZSBicm93c2VyXG4gICAgICAvLyBvbmVycm9yIHNob3VsZCBvbmx5IGZpcmUgaWYgaXQncyBhIG5ldHdvcmsgZXJyb3JcbiAgICAgIHJlamVjdChjcmVhdGVFcnJvcignTmV0d29yayBFcnJvcicsIGNvbmZpZywgbnVsbCwgcmVxdWVzdCkpO1xuXG4gICAgICAvLyBDbGVhbiB1cCByZXF1ZXN0XG4gICAgICByZXF1ZXN0ID0gbnVsbDtcbiAgICB9O1xuXG4gICAgLy8gSGFuZGxlIHRpbWVvdXRcbiAgICByZXF1ZXN0Lm9udGltZW91dCA9IGZ1bmN0aW9uIGhhbmRsZVRpbWVvdXQoKSB7XG4gICAgICByZWplY3QoY3JlYXRlRXJyb3IoJ3RpbWVvdXQgb2YgJyArIGNvbmZpZy50aW1lb3V0ICsgJ21zIGV4Y2VlZGVkJywgY29uZmlnLCAnRUNPTk5BQk9SVEVEJyxcbiAgICAgICAgcmVxdWVzdCkpO1xuXG4gICAgICAvLyBDbGVhbiB1cCByZXF1ZXN0XG4gICAgICByZXF1ZXN0ID0gbnVsbDtcbiAgICB9O1xuXG4gICAgLy8gQWRkIHhzcmYgaGVhZGVyXG4gICAgLy8gVGhpcyBpcyBvbmx5IGRvbmUgaWYgcnVubmluZyBpbiBhIHN0YW5kYXJkIGJyb3dzZXIgZW52aXJvbm1lbnQuXG4gICAgLy8gU3BlY2lmaWNhbGx5IG5vdCBpZiB3ZSdyZSBpbiBhIHdlYiB3b3JrZXIsIG9yIHJlYWN0LW5hdGl2ZS5cbiAgICBpZiAodXRpbHMuaXNTdGFuZGFyZEJyb3dzZXJFbnYoKSkge1xuICAgICAgdmFyIGNvb2tpZXMgPSByZXF1aXJlKCcuLy4uL2hlbHBlcnMvY29va2llcycpO1xuXG4gICAgICAvLyBBZGQgeHNyZiBoZWFkZXJcbiAgICAgIHZhciB4c3JmVmFsdWUgPSAoY29uZmlnLndpdGhDcmVkZW50aWFscyB8fCBpc1VSTFNhbWVPcmlnaW4oY29uZmlnLnVybCkpICYmIGNvbmZpZy54c3JmQ29va2llTmFtZSA/XG4gICAgICAgICAgY29va2llcy5yZWFkKGNvbmZpZy54c3JmQ29va2llTmFtZSkgOlxuICAgICAgICAgIHVuZGVmaW5lZDtcblxuICAgICAgaWYgKHhzcmZWYWx1ZSkge1xuICAgICAgICByZXF1ZXN0SGVhZGVyc1tjb25maWcueHNyZkhlYWRlck5hbWVdID0geHNyZlZhbHVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFkZCBoZWFkZXJzIHRvIHRoZSByZXF1ZXN0XG4gICAgaWYgKCdzZXRSZXF1ZXN0SGVhZGVyJyBpbiByZXF1ZXN0KSB7XG4gICAgICB1dGlscy5mb3JFYWNoKHJlcXVlc3RIZWFkZXJzLCBmdW5jdGlvbiBzZXRSZXF1ZXN0SGVhZGVyKHZhbCwga2V5KSB7XG4gICAgICAgIGlmICh0eXBlb2YgcmVxdWVzdERhdGEgPT09ICd1bmRlZmluZWQnICYmIGtleS50b0xvd2VyQ2FzZSgpID09PSAnY29udGVudC10eXBlJykge1xuICAgICAgICAgIC8vIFJlbW92ZSBDb250ZW50LVR5cGUgaWYgZGF0YSBpcyB1bmRlZmluZWRcbiAgICAgICAgICBkZWxldGUgcmVxdWVzdEhlYWRlcnNba2V5XTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBPdGhlcndpc2UgYWRkIGhlYWRlciB0byB0aGUgcmVxdWVzdFxuICAgICAgICAgIHJlcXVlc3Quc2V0UmVxdWVzdEhlYWRlcihrZXksIHZhbCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEFkZCB3aXRoQ3JlZGVudGlhbHMgdG8gcmVxdWVzdCBpZiBuZWVkZWRcbiAgICBpZiAoY29uZmlnLndpdGhDcmVkZW50aWFscykge1xuICAgICAgcmVxdWVzdC53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuICAgIH1cblxuICAgIC8vIEFkZCByZXNwb25zZVR5cGUgdG8gcmVxdWVzdCBpZiBuZWVkZWRcbiAgICBpZiAoY29uZmlnLnJlc3BvbnNlVHlwZSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVxdWVzdC5yZXNwb25zZVR5cGUgPSBjb25maWcucmVzcG9uc2VUeXBlO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBFeHBlY3RlZCBET01FeGNlcHRpb24gdGhyb3duIGJ5IGJyb3dzZXJzIG5vdCBjb21wYXRpYmxlIFhNTEh0dHBSZXF1ZXN0IExldmVsIDIuXG4gICAgICAgIC8vIEJ1dCwgdGhpcyBjYW4gYmUgc3VwcHJlc3NlZCBmb3IgJ2pzb24nIHR5cGUgYXMgaXQgY2FuIGJlIHBhcnNlZCBieSBkZWZhdWx0ICd0cmFuc2Zvcm1SZXNwb25zZScgZnVuY3Rpb24uXG4gICAgICAgIGlmIChjb25maWcucmVzcG9uc2VUeXBlICE9PSAnanNvbicpIHtcbiAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSGFuZGxlIHByb2dyZXNzIGlmIG5lZWRlZFxuICAgIGlmICh0eXBlb2YgY29uZmlnLm9uRG93bmxvYWRQcm9ncmVzcyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmVxdWVzdC5hZGRFdmVudExpc3RlbmVyKCdwcm9ncmVzcycsIGNvbmZpZy5vbkRvd25sb2FkUHJvZ3Jlc3MpO1xuICAgIH1cblxuICAgIC8vIE5vdCBhbGwgYnJvd3NlcnMgc3VwcG9ydCB1cGxvYWQgZXZlbnRzXG4gICAgaWYgKHR5cGVvZiBjb25maWcub25VcGxvYWRQcm9ncmVzcyA9PT0gJ2Z1bmN0aW9uJyAmJiByZXF1ZXN0LnVwbG9hZCkge1xuICAgICAgcmVxdWVzdC51cGxvYWQuYWRkRXZlbnRMaXN0ZW5lcigncHJvZ3Jlc3MnLCBjb25maWcub25VcGxvYWRQcm9ncmVzcyk7XG4gICAgfVxuXG4gICAgaWYgKGNvbmZpZy5jYW5jZWxUb2tlbikge1xuICAgICAgLy8gSGFuZGxlIGNhbmNlbGxhdGlvblxuICAgICAgY29uZmlnLmNhbmNlbFRva2VuLnByb21pc2UudGhlbihmdW5jdGlvbiBvbkNhbmNlbGVkKGNhbmNlbCkge1xuICAgICAgICBpZiAoIXJlcXVlc3QpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICByZXF1ZXN0LmFib3J0KCk7XG4gICAgICAgIHJlamVjdChjYW5jZWwpO1xuICAgICAgICAvLyBDbGVhbiB1cCByZXF1ZXN0XG4gICAgICAgIHJlcXVlc3QgPSBudWxsO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHJlcXVlc3REYXRhID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJlcXVlc3REYXRhID0gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBTZW5kIHRoZSByZXF1ZXN0XG4gICAgcmVxdWVzdC5zZW5kKHJlcXVlc3REYXRhKTtcbiAgfSk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG52YXIgYmluZCA9IHJlcXVpcmUoJy4vaGVscGVycy9iaW5kJyk7XG52YXIgQXhpb3MgPSByZXF1aXJlKCcuL2NvcmUvQXhpb3MnKTtcbnZhciBkZWZhdWx0cyA9IHJlcXVpcmUoJy4vZGVmYXVsdHMnKTtcblxuLyoqXG4gKiBDcmVhdGUgYW4gaW5zdGFuY2Ugb2YgQXhpb3NcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gZGVmYXVsdENvbmZpZyBUaGUgZGVmYXVsdCBjb25maWcgZm9yIHRoZSBpbnN0YW5jZVxuICogQHJldHVybiB7QXhpb3N9IEEgbmV3IGluc3RhbmNlIG9mIEF4aW9zXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUluc3RhbmNlKGRlZmF1bHRDb25maWcpIHtcbiAgdmFyIGNvbnRleHQgPSBuZXcgQXhpb3MoZGVmYXVsdENvbmZpZyk7XG4gIHZhciBpbnN0YW5jZSA9IGJpbmQoQXhpb3MucHJvdG90eXBlLnJlcXVlc3QsIGNvbnRleHQpO1xuXG4gIC8vIENvcHkgYXhpb3MucHJvdG90eXBlIHRvIGluc3RhbmNlXG4gIHV0aWxzLmV4dGVuZChpbnN0YW5jZSwgQXhpb3MucHJvdG90eXBlLCBjb250ZXh0KTtcblxuICAvLyBDb3B5IGNvbnRleHQgdG8gaW5zdGFuY2VcbiAgdXRpbHMuZXh0ZW5kKGluc3RhbmNlLCBjb250ZXh0KTtcblxuICByZXR1cm4gaW5zdGFuY2U7XG59XG5cbi8vIENyZWF0ZSB0aGUgZGVmYXVsdCBpbnN0YW5jZSB0byBiZSBleHBvcnRlZFxudmFyIGF4aW9zID0gY3JlYXRlSW5zdGFuY2UoZGVmYXVsdHMpO1xuXG4vLyBFeHBvc2UgQXhpb3MgY2xhc3MgdG8gYWxsb3cgY2xhc3MgaW5oZXJpdGFuY2VcbmF4aW9zLkF4aW9zID0gQXhpb3M7XG5cbi8vIEZhY3RvcnkgZm9yIGNyZWF0aW5nIG5ldyBpbnN0YW5jZXNcbmF4aW9zLmNyZWF0ZSA9IGZ1bmN0aW9uIGNyZWF0ZShpbnN0YW5jZUNvbmZpZykge1xuICByZXR1cm4gY3JlYXRlSW5zdGFuY2UodXRpbHMubWVyZ2UoZGVmYXVsdHMsIGluc3RhbmNlQ29uZmlnKSk7XG59O1xuXG4vLyBFeHBvc2UgQ2FuY2VsICYgQ2FuY2VsVG9rZW5cbmF4aW9zLkNhbmNlbCA9IHJlcXVpcmUoJy4vY2FuY2VsL0NhbmNlbCcpO1xuYXhpb3MuQ2FuY2VsVG9rZW4gPSByZXF1aXJlKCcuL2NhbmNlbC9DYW5jZWxUb2tlbicpO1xuYXhpb3MuaXNDYW5jZWwgPSByZXF1aXJlKCcuL2NhbmNlbC9pc0NhbmNlbCcpO1xuXG4vLyBFeHBvc2UgYWxsL3NwcmVhZFxuYXhpb3MuYWxsID0gZnVuY3Rpb24gYWxsKHByb21pc2VzKSB7XG4gIHJldHVybiBQcm9taXNlLmFsbChwcm9taXNlcyk7XG59O1xuYXhpb3Muc3ByZWFkID0gcmVxdWlyZSgnLi9oZWxwZXJzL3NwcmVhZCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGF4aW9zO1xuXG4vLyBBbGxvdyB1c2Ugb2YgZGVmYXVsdCBpbXBvcnQgc3ludGF4IGluIFR5cGVTY3JpcHRcbm1vZHVsZS5leHBvcnRzLmRlZmF1bHQgPSBheGlvcztcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBBIGBDYW5jZWxgIGlzIGFuIG9iamVjdCB0aGF0IGlzIHRocm93biB3aGVuIGFuIG9wZXJhdGlvbiBpcyBjYW5jZWxlZC5cbiAqXG4gKiBAY2xhc3NcbiAqIEBwYXJhbSB7c3RyaW5nPX0gbWVzc2FnZSBUaGUgbWVzc2FnZS5cbiAqL1xuZnVuY3Rpb24gQ2FuY2VsKG1lc3NhZ2UpIHtcbiAgdGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcbn1cblxuQ2FuY2VsLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nKCkge1xuICByZXR1cm4gJ0NhbmNlbCcgKyAodGhpcy5tZXNzYWdlID8gJzogJyArIHRoaXMubWVzc2FnZSA6ICcnKTtcbn07XG5cbkNhbmNlbC5wcm90b3R5cGUuX19DQU5DRUxfXyA9IHRydWU7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FuY2VsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ2FuY2VsID0gcmVxdWlyZSgnLi9DYW5jZWwnKTtcblxuLyoqXG4gKiBBIGBDYW5jZWxUb2tlbmAgaXMgYW4gb2JqZWN0IHRoYXQgY2FuIGJlIHVzZWQgdG8gcmVxdWVzdCBjYW5jZWxsYXRpb24gb2YgYW4gb3BlcmF0aW9uLlxuICpcbiAqIEBjbGFzc1xuICogQHBhcmFtIHtGdW5jdGlvbn0gZXhlY3V0b3IgVGhlIGV4ZWN1dG9yIGZ1bmN0aW9uLlxuICovXG5mdW5jdGlvbiBDYW5jZWxUb2tlbihleGVjdXRvcikge1xuICBpZiAodHlwZW9mIGV4ZWN1dG9yICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignZXhlY3V0b3IgbXVzdCBiZSBhIGZ1bmN0aW9uLicpO1xuICB9XG5cbiAgdmFyIHJlc29sdmVQcm9taXNlO1xuICB0aGlzLnByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiBwcm9taXNlRXhlY3V0b3IocmVzb2x2ZSkge1xuICAgIHJlc29sdmVQcm9taXNlID0gcmVzb2x2ZTtcbiAgfSk7XG5cbiAgdmFyIHRva2VuID0gdGhpcztcbiAgZXhlY3V0b3IoZnVuY3Rpb24gY2FuY2VsKG1lc3NhZ2UpIHtcbiAgICBpZiAodG9rZW4ucmVhc29uKSB7XG4gICAgICAvLyBDYW5jZWxsYXRpb24gaGFzIGFscmVhZHkgYmVlbiByZXF1ZXN0ZWRcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0b2tlbi5yZWFzb24gPSBuZXcgQ2FuY2VsKG1lc3NhZ2UpO1xuICAgIHJlc29sdmVQcm9taXNlKHRva2VuLnJlYXNvbik7XG4gIH0pO1xufVxuXG4vKipcbiAqIFRocm93cyBhIGBDYW5jZWxgIGlmIGNhbmNlbGxhdGlvbiBoYXMgYmVlbiByZXF1ZXN0ZWQuXG4gKi9cbkNhbmNlbFRva2VuLnByb3RvdHlwZS50aHJvd0lmUmVxdWVzdGVkID0gZnVuY3Rpb24gdGhyb3dJZlJlcXVlc3RlZCgpIHtcbiAgaWYgKHRoaXMucmVhc29uKSB7XG4gICAgdGhyb3cgdGhpcy5yZWFzb247XG4gIH1cbn07XG5cbi8qKlxuICogUmV0dXJucyBhbiBvYmplY3QgdGhhdCBjb250YWlucyBhIG5ldyBgQ2FuY2VsVG9rZW5gIGFuZCBhIGZ1bmN0aW9uIHRoYXQsIHdoZW4gY2FsbGVkLFxuICogY2FuY2VscyB0aGUgYENhbmNlbFRva2VuYC5cbiAqL1xuQ2FuY2VsVG9rZW4uc291cmNlID0gZnVuY3Rpb24gc291cmNlKCkge1xuICB2YXIgY2FuY2VsO1xuICB2YXIgdG9rZW4gPSBuZXcgQ2FuY2VsVG9rZW4oZnVuY3Rpb24gZXhlY3V0b3IoYykge1xuICAgIGNhbmNlbCA9IGM7XG4gIH0pO1xuICByZXR1cm4ge1xuICAgIHRva2VuOiB0b2tlbixcbiAgICBjYW5jZWw6IGNhbmNlbFxuICB9O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYW5jZWxUb2tlbjtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0NhbmNlbCh2YWx1ZSkge1xuICByZXR1cm4gISEodmFsdWUgJiYgdmFsdWUuX19DQU5DRUxfXyk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZGVmYXVsdHMgPSByZXF1aXJlKCcuLy4uL2RlZmF1bHRzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XG52YXIgSW50ZXJjZXB0b3JNYW5hZ2VyID0gcmVxdWlyZSgnLi9JbnRlcmNlcHRvck1hbmFnZXInKTtcbnZhciBkaXNwYXRjaFJlcXVlc3QgPSByZXF1aXJlKCcuL2Rpc3BhdGNoUmVxdWVzdCcpO1xuXG4vKipcbiAqIENyZWF0ZSBhIG5ldyBpbnN0YW5jZSBvZiBBeGlvc1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBpbnN0YW5jZUNvbmZpZyBUaGUgZGVmYXVsdCBjb25maWcgZm9yIHRoZSBpbnN0YW5jZVxuICovXG5mdW5jdGlvbiBBeGlvcyhpbnN0YW5jZUNvbmZpZykge1xuICB0aGlzLmRlZmF1bHRzID0gaW5zdGFuY2VDb25maWc7XG4gIHRoaXMuaW50ZXJjZXB0b3JzID0ge1xuICAgIHJlcXVlc3Q6IG5ldyBJbnRlcmNlcHRvck1hbmFnZXIoKSxcbiAgICByZXNwb25zZTogbmV3IEludGVyY2VwdG9yTWFuYWdlcigpXG4gIH07XG59XG5cbi8qKlxuICogRGlzcGF0Y2ggYSByZXF1ZXN0XG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyBUaGUgY29uZmlnIHNwZWNpZmljIGZvciB0aGlzIHJlcXVlc3QgKG1lcmdlZCB3aXRoIHRoaXMuZGVmYXVsdHMpXG4gKi9cbkF4aW9zLnByb3RvdHlwZS5yZXF1ZXN0ID0gZnVuY3Rpb24gcmVxdWVzdChjb25maWcpIHtcbiAgLyplc2xpbnQgbm8tcGFyYW0tcmVhc3NpZ246MCovXG4gIC8vIEFsbG93IGZvciBheGlvcygnZXhhbXBsZS91cmwnWywgY29uZmlnXSkgYSBsYSBmZXRjaCBBUElcbiAgaWYgKHR5cGVvZiBjb25maWcgPT09ICdzdHJpbmcnKSB7XG4gICAgY29uZmlnID0gdXRpbHMubWVyZ2Uoe1xuICAgICAgdXJsOiBhcmd1bWVudHNbMF1cbiAgICB9LCBhcmd1bWVudHNbMV0pO1xuICB9XG5cbiAgY29uZmlnID0gdXRpbHMubWVyZ2UoZGVmYXVsdHMsIHttZXRob2Q6ICdnZXQnfSwgdGhpcy5kZWZhdWx0cywgY29uZmlnKTtcbiAgY29uZmlnLm1ldGhvZCA9IGNvbmZpZy5tZXRob2QudG9Mb3dlckNhc2UoKTtcblxuICAvLyBIb29rIHVwIGludGVyY2VwdG9ycyBtaWRkbGV3YXJlXG4gIHZhciBjaGFpbiA9IFtkaXNwYXRjaFJlcXVlc3QsIHVuZGVmaW5lZF07XG4gIHZhciBwcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKGNvbmZpZyk7XG5cbiAgdGhpcy5pbnRlcmNlcHRvcnMucmVxdWVzdC5mb3JFYWNoKGZ1bmN0aW9uIHVuc2hpZnRSZXF1ZXN0SW50ZXJjZXB0b3JzKGludGVyY2VwdG9yKSB7XG4gICAgY2hhaW4udW5zaGlmdChpbnRlcmNlcHRvci5mdWxmaWxsZWQsIGludGVyY2VwdG9yLnJlamVjdGVkKTtcbiAgfSk7XG5cbiAgdGhpcy5pbnRlcmNlcHRvcnMucmVzcG9uc2UuZm9yRWFjaChmdW5jdGlvbiBwdXNoUmVzcG9uc2VJbnRlcmNlcHRvcnMoaW50ZXJjZXB0b3IpIHtcbiAgICBjaGFpbi5wdXNoKGludGVyY2VwdG9yLmZ1bGZpbGxlZCwgaW50ZXJjZXB0b3IucmVqZWN0ZWQpO1xuICB9KTtcblxuICB3aGlsZSAoY2hhaW4ubGVuZ3RoKSB7XG4gICAgcHJvbWlzZSA9IHByb21pc2UudGhlbihjaGFpbi5zaGlmdCgpLCBjaGFpbi5zaGlmdCgpKTtcbiAgfVxuXG4gIHJldHVybiBwcm9taXNlO1xufTtcblxuLy8gUHJvdmlkZSBhbGlhc2VzIGZvciBzdXBwb3J0ZWQgcmVxdWVzdCBtZXRob2RzXG51dGlscy5mb3JFYWNoKFsnZGVsZXRlJywgJ2dldCcsICdoZWFkJywgJ29wdGlvbnMnXSwgZnVuY3Rpb24gZm9yRWFjaE1ldGhvZE5vRGF0YShtZXRob2QpIHtcbiAgLyplc2xpbnQgZnVuYy1uYW1lczowKi9cbiAgQXhpb3MucHJvdG90eXBlW21ldGhvZF0gPSBmdW5jdGlvbih1cmwsIGNvbmZpZykge1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QodXRpbHMubWVyZ2UoY29uZmlnIHx8IHt9LCB7XG4gICAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICAgIHVybDogdXJsXG4gICAgfSkpO1xuICB9O1xufSk7XG5cbnV0aWxzLmZvckVhY2goWydwb3N0JywgJ3B1dCcsICdwYXRjaCddLCBmdW5jdGlvbiBmb3JFYWNoTWV0aG9kV2l0aERhdGEobWV0aG9kKSB7XG4gIC8qZXNsaW50IGZ1bmMtbmFtZXM6MCovXG4gIEF4aW9zLnByb3RvdHlwZVttZXRob2RdID0gZnVuY3Rpb24odXJsLCBkYXRhLCBjb25maWcpIHtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KHV0aWxzLm1lcmdlKGNvbmZpZyB8fCB7fSwge1xuICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICB1cmw6IHVybCxcbiAgICAgIGRhdGE6IGRhdGFcbiAgICB9KSk7XG4gIH07XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBBeGlvcztcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xuXG5mdW5jdGlvbiBJbnRlcmNlcHRvck1hbmFnZXIoKSB7XG4gIHRoaXMuaGFuZGxlcnMgPSBbXTtcbn1cblxuLyoqXG4gKiBBZGQgYSBuZXcgaW50ZXJjZXB0b3IgdG8gdGhlIHN0YWNrXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVsZmlsbGVkIFRoZSBmdW5jdGlvbiB0byBoYW5kbGUgYHRoZW5gIGZvciBhIGBQcm9taXNlYFxuICogQHBhcmFtIHtGdW5jdGlvbn0gcmVqZWN0ZWQgVGhlIGZ1bmN0aW9uIHRvIGhhbmRsZSBgcmVqZWN0YCBmb3IgYSBgUHJvbWlzZWBcbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IEFuIElEIHVzZWQgdG8gcmVtb3ZlIGludGVyY2VwdG9yIGxhdGVyXG4gKi9cbkludGVyY2VwdG9yTWFuYWdlci5wcm90b3R5cGUudXNlID0gZnVuY3Rpb24gdXNlKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpIHtcbiAgdGhpcy5oYW5kbGVycy5wdXNoKHtcbiAgICBmdWxmaWxsZWQ6IGZ1bGZpbGxlZCxcbiAgICByZWplY3RlZDogcmVqZWN0ZWRcbiAgfSk7XG4gIHJldHVybiB0aGlzLmhhbmRsZXJzLmxlbmd0aCAtIDE7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBhbiBpbnRlcmNlcHRvciBmcm9tIHRoZSBzdGFja1xuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBpZCBUaGUgSUQgdGhhdCB3YXMgcmV0dXJuZWQgYnkgYHVzZWBcbiAqL1xuSW50ZXJjZXB0b3JNYW5hZ2VyLnByb3RvdHlwZS5lamVjdCA9IGZ1bmN0aW9uIGVqZWN0KGlkKSB7XG4gIGlmICh0aGlzLmhhbmRsZXJzW2lkXSkge1xuICAgIHRoaXMuaGFuZGxlcnNbaWRdID0gbnVsbDtcbiAgfVxufTtcblxuLyoqXG4gKiBJdGVyYXRlIG92ZXIgYWxsIHRoZSByZWdpc3RlcmVkIGludGVyY2VwdG9yc1xuICpcbiAqIFRoaXMgbWV0aG9kIGlzIHBhcnRpY3VsYXJseSB1c2VmdWwgZm9yIHNraXBwaW5nIG92ZXIgYW55XG4gKiBpbnRlcmNlcHRvcnMgdGhhdCBtYXkgaGF2ZSBiZWNvbWUgYG51bGxgIGNhbGxpbmcgYGVqZWN0YC5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBUaGUgZnVuY3Rpb24gdG8gY2FsbCBmb3IgZWFjaCBpbnRlcmNlcHRvclxuICovXG5JbnRlcmNlcHRvck1hbmFnZXIucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbiBmb3JFYWNoKGZuKSB7XG4gIHV0aWxzLmZvckVhY2godGhpcy5oYW5kbGVycywgZnVuY3Rpb24gZm9yRWFjaEhhbmRsZXIoaCkge1xuICAgIGlmIChoICE9PSBudWxsKSB7XG4gICAgICBmbihoKTtcbiAgICB9XG4gIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBJbnRlcmNlcHRvck1hbmFnZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBlbmhhbmNlRXJyb3IgPSByZXF1aXJlKCcuL2VuaGFuY2VFcnJvcicpO1xuXG4vKipcbiAqIENyZWF0ZSBhbiBFcnJvciB3aXRoIHRoZSBzcGVjaWZpZWQgbWVzc2FnZSwgY29uZmlnLCBlcnJvciBjb2RlLCByZXF1ZXN0IGFuZCByZXNwb25zZS5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSBUaGUgZXJyb3IgbWVzc2FnZS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcgVGhlIGNvbmZpZy5cbiAqIEBwYXJhbSB7c3RyaW5nfSBbY29kZV0gVGhlIGVycm9yIGNvZGUgKGZvciBleGFtcGxlLCAnRUNPTk5BQk9SVEVEJykuXG4gKiBAcGFyYW0ge09iamVjdH0gW3JlcXVlc3RdIFRoZSByZXF1ZXN0LlxuICogQHBhcmFtIHtPYmplY3R9IFtyZXNwb25zZV0gVGhlIHJlc3BvbnNlLlxuICogQHJldHVybnMge0Vycm9yfSBUaGUgY3JlYXRlZCBlcnJvci5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBjcmVhdGVFcnJvcihtZXNzYWdlLCBjb25maWcsIGNvZGUsIHJlcXVlc3QsIHJlc3BvbnNlKSB7XG4gIHZhciBlcnJvciA9IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgcmV0dXJuIGVuaGFuY2VFcnJvcihlcnJvciwgY29uZmlnLCBjb2RlLCByZXF1ZXN0LCByZXNwb25zZSk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XG52YXIgdHJhbnNmb3JtRGF0YSA9IHJlcXVpcmUoJy4vdHJhbnNmb3JtRGF0YScpO1xudmFyIGlzQ2FuY2VsID0gcmVxdWlyZSgnLi4vY2FuY2VsL2lzQ2FuY2VsJyk7XG52YXIgZGVmYXVsdHMgPSByZXF1aXJlKCcuLi9kZWZhdWx0cycpO1xudmFyIGlzQWJzb2x1dGVVUkwgPSByZXF1aXJlKCcuLy4uL2hlbHBlcnMvaXNBYnNvbHV0ZVVSTCcpO1xudmFyIGNvbWJpbmVVUkxzID0gcmVxdWlyZSgnLi8uLi9oZWxwZXJzL2NvbWJpbmVVUkxzJyk7XG5cbi8qKlxuICogVGhyb3dzIGEgYENhbmNlbGAgaWYgY2FuY2VsbGF0aW9uIGhhcyBiZWVuIHJlcXVlc3RlZC5cbiAqL1xuZnVuY3Rpb24gdGhyb3dJZkNhbmNlbGxhdGlvblJlcXVlc3RlZChjb25maWcpIHtcbiAgaWYgKGNvbmZpZy5jYW5jZWxUb2tlbikge1xuICAgIGNvbmZpZy5jYW5jZWxUb2tlbi50aHJvd0lmUmVxdWVzdGVkKCk7XG4gIH1cbn1cblxuLyoqXG4gKiBEaXNwYXRjaCBhIHJlcXVlc3QgdG8gdGhlIHNlcnZlciB1c2luZyB0aGUgY29uZmlndXJlZCBhZGFwdGVyLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgVGhlIGNvbmZpZyB0aGF0IGlzIHRvIGJlIHVzZWQgZm9yIHRoZSByZXF1ZXN0XG4gKiBAcmV0dXJucyB7UHJvbWlzZX0gVGhlIFByb21pc2UgdG8gYmUgZnVsZmlsbGVkXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZGlzcGF0Y2hSZXF1ZXN0KGNvbmZpZykge1xuICB0aHJvd0lmQ2FuY2VsbGF0aW9uUmVxdWVzdGVkKGNvbmZpZyk7XG5cbiAgLy8gU3VwcG9ydCBiYXNlVVJMIGNvbmZpZ1xuICBpZiAoY29uZmlnLmJhc2VVUkwgJiYgIWlzQWJzb2x1dGVVUkwoY29uZmlnLnVybCkpIHtcbiAgICBjb25maWcudXJsID0gY29tYmluZVVSTHMoY29uZmlnLmJhc2VVUkwsIGNvbmZpZy51cmwpO1xuICB9XG5cbiAgLy8gRW5zdXJlIGhlYWRlcnMgZXhpc3RcbiAgY29uZmlnLmhlYWRlcnMgPSBjb25maWcuaGVhZGVycyB8fCB7fTtcblxuICAvLyBUcmFuc2Zvcm0gcmVxdWVzdCBkYXRhXG4gIGNvbmZpZy5kYXRhID0gdHJhbnNmb3JtRGF0YShcbiAgICBjb25maWcuZGF0YSxcbiAgICBjb25maWcuaGVhZGVycyxcbiAgICBjb25maWcudHJhbnNmb3JtUmVxdWVzdFxuICApO1xuXG4gIC8vIEZsYXR0ZW4gaGVhZGVyc1xuICBjb25maWcuaGVhZGVycyA9IHV0aWxzLm1lcmdlKFxuICAgIGNvbmZpZy5oZWFkZXJzLmNvbW1vbiB8fCB7fSxcbiAgICBjb25maWcuaGVhZGVyc1tjb25maWcubWV0aG9kXSB8fCB7fSxcbiAgICBjb25maWcuaGVhZGVycyB8fCB7fVxuICApO1xuXG4gIHV0aWxzLmZvckVhY2goXG4gICAgWydkZWxldGUnLCAnZ2V0JywgJ2hlYWQnLCAncG9zdCcsICdwdXQnLCAncGF0Y2gnLCAnY29tbW9uJ10sXG4gICAgZnVuY3Rpb24gY2xlYW5IZWFkZXJDb25maWcobWV0aG9kKSB7XG4gICAgICBkZWxldGUgY29uZmlnLmhlYWRlcnNbbWV0aG9kXTtcbiAgICB9XG4gICk7XG5cbiAgdmFyIGFkYXB0ZXIgPSBjb25maWcuYWRhcHRlciB8fCBkZWZhdWx0cy5hZGFwdGVyO1xuXG4gIHJldHVybiBhZGFwdGVyKGNvbmZpZykudGhlbihmdW5jdGlvbiBvbkFkYXB0ZXJSZXNvbHV0aW9uKHJlc3BvbnNlKSB7XG4gICAgdGhyb3dJZkNhbmNlbGxhdGlvblJlcXVlc3RlZChjb25maWcpO1xuXG4gICAgLy8gVHJhbnNmb3JtIHJlc3BvbnNlIGRhdGFcbiAgICByZXNwb25zZS5kYXRhID0gdHJhbnNmb3JtRGF0YShcbiAgICAgIHJlc3BvbnNlLmRhdGEsXG4gICAgICByZXNwb25zZS5oZWFkZXJzLFxuICAgICAgY29uZmlnLnRyYW5zZm9ybVJlc3BvbnNlXG4gICAgKTtcblxuICAgIHJldHVybiByZXNwb25zZTtcbiAgfSwgZnVuY3Rpb24gb25BZGFwdGVyUmVqZWN0aW9uKHJlYXNvbikge1xuICAgIGlmICghaXNDYW5jZWwocmVhc29uKSkge1xuICAgICAgdGhyb3dJZkNhbmNlbGxhdGlvblJlcXVlc3RlZChjb25maWcpO1xuXG4gICAgICAvLyBUcmFuc2Zvcm0gcmVzcG9uc2UgZGF0YVxuICAgICAgaWYgKHJlYXNvbiAmJiByZWFzb24ucmVzcG9uc2UpIHtcbiAgICAgICAgcmVhc29uLnJlc3BvbnNlLmRhdGEgPSB0cmFuc2Zvcm1EYXRhKFxuICAgICAgICAgIHJlYXNvbi5yZXNwb25zZS5kYXRhLFxuICAgICAgICAgIHJlYXNvbi5yZXNwb25zZS5oZWFkZXJzLFxuICAgICAgICAgIGNvbmZpZy50cmFuc2Zvcm1SZXNwb25zZVxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBQcm9taXNlLnJlamVjdChyZWFzb24pO1xuICB9KTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogVXBkYXRlIGFuIEVycm9yIHdpdGggdGhlIHNwZWNpZmllZCBjb25maWcsIGVycm9yIGNvZGUsIGFuZCByZXNwb25zZS5cbiAqXG4gKiBAcGFyYW0ge0Vycm9yfSBlcnJvciBUaGUgZXJyb3IgdG8gdXBkYXRlLlxuICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyBUaGUgY29uZmlnLlxuICogQHBhcmFtIHtzdHJpbmd9IFtjb2RlXSBUaGUgZXJyb3IgY29kZSAoZm9yIGV4YW1wbGUsICdFQ09OTkFCT1JURUQnKS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbcmVxdWVzdF0gVGhlIHJlcXVlc3QuXG4gKiBAcGFyYW0ge09iamVjdH0gW3Jlc3BvbnNlXSBUaGUgcmVzcG9uc2UuXG4gKiBAcmV0dXJucyB7RXJyb3J9IFRoZSBlcnJvci5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBlbmhhbmNlRXJyb3IoZXJyb3IsIGNvbmZpZywgY29kZSwgcmVxdWVzdCwgcmVzcG9uc2UpIHtcbiAgZXJyb3IuY29uZmlnID0gY29uZmlnO1xuICBpZiAoY29kZSkge1xuICAgIGVycm9yLmNvZGUgPSBjb2RlO1xuICB9XG4gIGVycm9yLnJlcXVlc3QgPSByZXF1ZXN0O1xuICBlcnJvci5yZXNwb25zZSA9IHJlc3BvbnNlO1xuICByZXR1cm4gZXJyb3I7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY3JlYXRlRXJyb3IgPSByZXF1aXJlKCcuL2NyZWF0ZUVycm9yJyk7XG5cbi8qKlxuICogUmVzb2x2ZSBvciByZWplY3QgYSBQcm9taXNlIGJhc2VkIG9uIHJlc3BvbnNlIHN0YXR1cy5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSByZXNvbHZlIEEgZnVuY3Rpb24gdGhhdCByZXNvbHZlcyB0aGUgcHJvbWlzZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IHJlamVjdCBBIGZ1bmN0aW9uIHRoYXQgcmVqZWN0cyB0aGUgcHJvbWlzZS5cbiAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSBUaGUgcmVzcG9uc2UuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgcmVzcG9uc2UpIHtcbiAgdmFyIHZhbGlkYXRlU3RhdHVzID0gcmVzcG9uc2UuY29uZmlnLnZhbGlkYXRlU3RhdHVzO1xuICAvLyBOb3RlOiBzdGF0dXMgaXMgbm90IGV4cG9zZWQgYnkgWERvbWFpblJlcXVlc3RcbiAgaWYgKCFyZXNwb25zZS5zdGF0dXMgfHwgIXZhbGlkYXRlU3RhdHVzIHx8IHZhbGlkYXRlU3RhdHVzKHJlc3BvbnNlLnN0YXR1cykpIHtcbiAgICByZXNvbHZlKHJlc3BvbnNlKTtcbiAgfSBlbHNlIHtcbiAgICByZWplY3QoY3JlYXRlRXJyb3IoXG4gICAgICAnUmVxdWVzdCBmYWlsZWQgd2l0aCBzdGF0dXMgY29kZSAnICsgcmVzcG9uc2Uuc3RhdHVzLFxuICAgICAgcmVzcG9uc2UuY29uZmlnLFxuICAgICAgbnVsbCxcbiAgICAgIHJlc3BvbnNlLnJlcXVlc3QsXG4gICAgICByZXNwb25zZVxuICAgICkpO1xuICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XG5cbi8qKlxuICogVHJhbnNmb3JtIHRoZSBkYXRhIGZvciBhIHJlcXVlc3Qgb3IgYSByZXNwb25zZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fFN0cmluZ30gZGF0YSBUaGUgZGF0YSB0byBiZSB0cmFuc2Zvcm1lZFxuICogQHBhcmFtIHtBcnJheX0gaGVhZGVycyBUaGUgaGVhZGVycyBmb3IgdGhlIHJlcXVlc3Qgb3IgcmVzcG9uc2VcbiAqIEBwYXJhbSB7QXJyYXl8RnVuY3Rpb259IGZucyBBIHNpbmdsZSBmdW5jdGlvbiBvciBBcnJheSBvZiBmdW5jdGlvbnNcbiAqIEByZXR1cm5zIHsqfSBUaGUgcmVzdWx0aW5nIHRyYW5zZm9ybWVkIGRhdGFcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB0cmFuc2Zvcm1EYXRhKGRhdGEsIGhlYWRlcnMsIGZucykge1xuICAvKmVzbGludCBuby1wYXJhbS1yZWFzc2lnbjowKi9cbiAgdXRpbHMuZm9yRWFjaChmbnMsIGZ1bmN0aW9uIHRyYW5zZm9ybShmbikge1xuICAgIGRhdGEgPSBmbihkYXRhLCBoZWFkZXJzKTtcbiAgfSk7XG5cbiAgcmV0dXJuIGRhdGE7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG52YXIgbm9ybWFsaXplSGVhZGVyTmFtZSA9IHJlcXVpcmUoJy4vaGVscGVycy9ub3JtYWxpemVIZWFkZXJOYW1lJyk7XG5cbnZhciBERUZBVUxUX0NPTlRFTlRfVFlQRSA9IHtcbiAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnXG59O1xuXG5mdW5jdGlvbiBzZXRDb250ZW50VHlwZUlmVW5zZXQoaGVhZGVycywgdmFsdWUpIHtcbiAgaWYgKCF1dGlscy5pc1VuZGVmaW5lZChoZWFkZXJzKSAmJiB1dGlscy5pc1VuZGVmaW5lZChoZWFkZXJzWydDb250ZW50LVR5cGUnXSkpIHtcbiAgICBoZWFkZXJzWydDb250ZW50LVR5cGUnXSA9IHZhbHVlO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldERlZmF1bHRBZGFwdGVyKCkge1xuICB2YXIgYWRhcHRlcjtcbiAgaWYgKHR5cGVvZiBYTUxIdHRwUmVxdWVzdCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAvLyBGb3IgYnJvd3NlcnMgdXNlIFhIUiBhZGFwdGVyXG4gICAgYWRhcHRlciA9IHJlcXVpcmUoJy4vYWRhcHRlcnMveGhyJyk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgLy8gRm9yIG5vZGUgdXNlIEhUVFAgYWRhcHRlclxuICAgIGFkYXB0ZXIgPSByZXF1aXJlKCcuL2FkYXB0ZXJzL2h0dHAnKTtcbiAgfVxuICByZXR1cm4gYWRhcHRlcjtcbn1cblxudmFyIGRlZmF1bHRzID0ge1xuICBhZGFwdGVyOiBnZXREZWZhdWx0QWRhcHRlcigpLFxuXG4gIHRyYW5zZm9ybVJlcXVlc3Q6IFtmdW5jdGlvbiB0cmFuc2Zvcm1SZXF1ZXN0KGRhdGEsIGhlYWRlcnMpIHtcbiAgICBub3JtYWxpemVIZWFkZXJOYW1lKGhlYWRlcnMsICdDb250ZW50LVR5cGUnKTtcbiAgICBpZiAodXRpbHMuaXNGb3JtRGF0YShkYXRhKSB8fFxuICAgICAgdXRpbHMuaXNBcnJheUJ1ZmZlcihkYXRhKSB8fFxuICAgICAgdXRpbHMuaXNCdWZmZXIoZGF0YSkgfHxcbiAgICAgIHV0aWxzLmlzU3RyZWFtKGRhdGEpIHx8XG4gICAgICB1dGlscy5pc0ZpbGUoZGF0YSkgfHxcbiAgICAgIHV0aWxzLmlzQmxvYihkYXRhKVxuICAgICkge1xuICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxuICAgIGlmICh1dGlscy5pc0FycmF5QnVmZmVyVmlldyhkYXRhKSkge1xuICAgICAgcmV0dXJuIGRhdGEuYnVmZmVyO1xuICAgIH1cbiAgICBpZiAodXRpbHMuaXNVUkxTZWFyY2hQYXJhbXMoZGF0YSkpIHtcbiAgICAgIHNldENvbnRlbnRUeXBlSWZVbnNldChoZWFkZXJzLCAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkO2NoYXJzZXQ9dXRmLTgnKTtcbiAgICAgIHJldHVybiBkYXRhLnRvU3RyaW5nKCk7XG4gICAgfVxuICAgIGlmICh1dGlscy5pc09iamVjdChkYXRhKSkge1xuICAgICAgc2V0Q29udGVudFR5cGVJZlVuc2V0KGhlYWRlcnMsICdhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTgnKTtcbiAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShkYXRhKTtcbiAgICB9XG4gICAgcmV0dXJuIGRhdGE7XG4gIH1dLFxuXG4gIHRyYW5zZm9ybVJlc3BvbnNlOiBbZnVuY3Rpb24gdHJhbnNmb3JtUmVzcG9uc2UoZGF0YSkge1xuICAgIC8qZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOjAqL1xuICAgIGlmICh0eXBlb2YgZGF0YSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGRhdGEgPSBKU09OLnBhcnNlKGRhdGEpO1xuICAgICAgfSBjYXRjaCAoZSkgeyAvKiBJZ25vcmUgKi8gfVxuICAgIH1cbiAgICByZXR1cm4gZGF0YTtcbiAgfV0sXG5cbiAgLyoqXG4gICAqIEEgdGltZW91dCBpbiBtaWxsaXNlY29uZHMgdG8gYWJvcnQgYSByZXF1ZXN0LiBJZiBzZXQgdG8gMCAoZGVmYXVsdCkgYVxuICAgKiB0aW1lb3V0IGlzIG5vdCBjcmVhdGVkLlxuICAgKi9cbiAgdGltZW91dDogMCxcblxuICB4c3JmQ29va2llTmFtZTogJ1hTUkYtVE9LRU4nLFxuICB4c3JmSGVhZGVyTmFtZTogJ1gtWFNSRi1UT0tFTicsXG5cbiAgbWF4Q29udGVudExlbmd0aDogLTEsXG5cbiAgdmFsaWRhdGVTdGF0dXM6IGZ1bmN0aW9uIHZhbGlkYXRlU3RhdHVzKHN0YXR1cykge1xuICAgIHJldHVybiBzdGF0dXMgPj0gMjAwICYmIHN0YXR1cyA8IDMwMDtcbiAgfVxufTtcblxuZGVmYXVsdHMuaGVhZGVycyA9IHtcbiAgY29tbW9uOiB7XG4gICAgJ0FjY2VwdCc6ICdhcHBsaWNhdGlvbi9qc29uLCB0ZXh0L3BsYWluLCAqLyonXG4gIH1cbn07XG5cbnV0aWxzLmZvckVhY2goWydkZWxldGUnLCAnZ2V0JywgJ2hlYWQnXSwgZnVuY3Rpb24gZm9yRWFjaE1ldGhvZE5vRGF0YShtZXRob2QpIHtcbiAgZGVmYXVsdHMuaGVhZGVyc1ttZXRob2RdID0ge307XG59KTtcblxudXRpbHMuZm9yRWFjaChbJ3Bvc3QnLCAncHV0JywgJ3BhdGNoJ10sIGZ1bmN0aW9uIGZvckVhY2hNZXRob2RXaXRoRGF0YShtZXRob2QpIHtcbiAgZGVmYXVsdHMuaGVhZGVyc1ttZXRob2RdID0gdXRpbHMubWVyZ2UoREVGQVVMVF9DT05URU5UX1RZUEUpO1xufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gZGVmYXVsdHM7XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gYmluZChmbiwgdGhpc0FyZykge1xuICByZXR1cm4gZnVuY3Rpb24gd3JhcCgpIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIGFyZ3NbaV0gPSBhcmd1bWVudHNbaV07XG4gICAgfVxuICAgIHJldHVybiBmbi5hcHBseSh0aGlzQXJnLCBhcmdzKTtcbiAgfTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIGJ0b2EgcG9seWZpbGwgZm9yIElFPDEwIGNvdXJ0ZXN5IGh0dHBzOi8vZ2l0aHViLmNvbS9kYXZpZGNoYW1iZXJzL0Jhc2U2NC5qc1xuXG52YXIgY2hhcnMgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLz0nO1xuXG5mdW5jdGlvbiBFKCkge1xuICB0aGlzLm1lc3NhZ2UgPSAnU3RyaW5nIGNvbnRhaW5zIGFuIGludmFsaWQgY2hhcmFjdGVyJztcbn1cbkUucHJvdG90eXBlID0gbmV3IEVycm9yO1xuRS5wcm90b3R5cGUuY29kZSA9IDU7XG5FLnByb3RvdHlwZS5uYW1lID0gJ0ludmFsaWRDaGFyYWN0ZXJFcnJvcic7XG5cbmZ1bmN0aW9uIGJ0b2EoaW5wdXQpIHtcbiAgdmFyIHN0ciA9IFN0cmluZyhpbnB1dCk7XG4gIHZhciBvdXRwdXQgPSAnJztcbiAgZm9yIChcbiAgICAvLyBpbml0aWFsaXplIHJlc3VsdCBhbmQgY291bnRlclxuICAgIHZhciBibG9jaywgY2hhckNvZGUsIGlkeCA9IDAsIG1hcCA9IGNoYXJzO1xuICAgIC8vIGlmIHRoZSBuZXh0IHN0ciBpbmRleCBkb2VzIG5vdCBleGlzdDpcbiAgICAvLyAgIGNoYW5nZSB0aGUgbWFwcGluZyB0YWJsZSB0byBcIj1cIlxuICAgIC8vICAgY2hlY2sgaWYgZCBoYXMgbm8gZnJhY3Rpb25hbCBkaWdpdHNcbiAgICBzdHIuY2hhckF0KGlkeCB8IDApIHx8IChtYXAgPSAnPScsIGlkeCAlIDEpO1xuICAgIC8vIFwiOCAtIGlkeCAlIDEgKiA4XCIgZ2VuZXJhdGVzIHRoZSBzZXF1ZW5jZSAyLCA0LCA2LCA4XG4gICAgb3V0cHV0ICs9IG1hcC5jaGFyQXQoNjMgJiBibG9jayA+PiA4IC0gaWR4ICUgMSAqIDgpXG4gICkge1xuICAgIGNoYXJDb2RlID0gc3RyLmNoYXJDb2RlQXQoaWR4ICs9IDMgLyA0KTtcbiAgICBpZiAoY2hhckNvZGUgPiAweEZGKSB7XG4gICAgICB0aHJvdyBuZXcgRSgpO1xuICAgIH1cbiAgICBibG9jayA9IGJsb2NrIDw8IDggfCBjaGFyQ29kZTtcbiAgfVxuICByZXR1cm4gb3V0cHV0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGJ0b2E7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcblxuZnVuY3Rpb24gZW5jb2RlKHZhbCkge1xuICByZXR1cm4gZW5jb2RlVVJJQ29tcG9uZW50KHZhbCkuXG4gICAgcmVwbGFjZSgvJTQwL2dpLCAnQCcpLlxuICAgIHJlcGxhY2UoLyUzQS9naSwgJzonKS5cbiAgICByZXBsYWNlKC8lMjQvZywgJyQnKS5cbiAgICByZXBsYWNlKC8lMkMvZ2ksICcsJykuXG4gICAgcmVwbGFjZSgvJTIwL2csICcrJykuXG4gICAgcmVwbGFjZSgvJTVCL2dpLCAnWycpLlxuICAgIHJlcGxhY2UoLyU1RC9naSwgJ10nKTtcbn1cblxuLyoqXG4gKiBCdWlsZCBhIFVSTCBieSBhcHBlbmRpbmcgcGFyYW1zIHRvIHRoZSBlbmRcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdXJsIFRoZSBiYXNlIG9mIHRoZSB1cmwgKGUuZy4sIGh0dHA6Ly93d3cuZ29vZ2xlLmNvbSlcbiAqIEBwYXJhbSB7b2JqZWN0fSBbcGFyYW1zXSBUaGUgcGFyYW1zIHRvIGJlIGFwcGVuZGVkXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgZm9ybWF0dGVkIHVybFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGJ1aWxkVVJMKHVybCwgcGFyYW1zLCBwYXJhbXNTZXJpYWxpemVyKSB7XG4gIC8qZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOjAqL1xuICBpZiAoIXBhcmFtcykge1xuICAgIHJldHVybiB1cmw7XG4gIH1cblxuICB2YXIgc2VyaWFsaXplZFBhcmFtcztcbiAgaWYgKHBhcmFtc1NlcmlhbGl6ZXIpIHtcbiAgICBzZXJpYWxpemVkUGFyYW1zID0gcGFyYW1zU2VyaWFsaXplcihwYXJhbXMpO1xuICB9IGVsc2UgaWYgKHV0aWxzLmlzVVJMU2VhcmNoUGFyYW1zKHBhcmFtcykpIHtcbiAgICBzZXJpYWxpemVkUGFyYW1zID0gcGFyYW1zLnRvU3RyaW5nKCk7XG4gIH0gZWxzZSB7XG4gICAgdmFyIHBhcnRzID0gW107XG5cbiAgICB1dGlscy5mb3JFYWNoKHBhcmFtcywgZnVuY3Rpb24gc2VyaWFsaXplKHZhbCwga2V5KSB7XG4gICAgICBpZiAodmFsID09PSBudWxsIHx8IHR5cGVvZiB2YWwgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKHV0aWxzLmlzQXJyYXkodmFsKSkge1xuICAgICAgICBrZXkgPSBrZXkgKyAnW10nO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFsID0gW3ZhbF07XG4gICAgICB9XG5cbiAgICAgIHV0aWxzLmZvckVhY2godmFsLCBmdW5jdGlvbiBwYXJzZVZhbHVlKHYpIHtcbiAgICAgICAgaWYgKHV0aWxzLmlzRGF0ZSh2KSkge1xuICAgICAgICAgIHYgPSB2LnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIH0gZWxzZSBpZiAodXRpbHMuaXNPYmplY3QodikpIHtcbiAgICAgICAgICB2ID0gSlNPTi5zdHJpbmdpZnkodik7XG4gICAgICAgIH1cbiAgICAgICAgcGFydHMucHVzaChlbmNvZGUoa2V5KSArICc9JyArIGVuY29kZSh2KSk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHNlcmlhbGl6ZWRQYXJhbXMgPSBwYXJ0cy5qb2luKCcmJyk7XG4gIH1cblxuICBpZiAoc2VyaWFsaXplZFBhcmFtcykge1xuICAgIHVybCArPSAodXJsLmluZGV4T2YoJz8nKSA9PT0gLTEgPyAnPycgOiAnJicpICsgc2VyaWFsaXplZFBhcmFtcztcbiAgfVxuXG4gIHJldHVybiB1cmw7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgVVJMIGJ5IGNvbWJpbmluZyB0aGUgc3BlY2lmaWVkIFVSTHNcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gYmFzZVVSTCBUaGUgYmFzZSBVUkxcbiAqIEBwYXJhbSB7c3RyaW5nfSByZWxhdGl2ZVVSTCBUaGUgcmVsYXRpdmUgVVJMXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgY29tYmluZWQgVVJMXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gY29tYmluZVVSTHMoYmFzZVVSTCwgcmVsYXRpdmVVUkwpIHtcbiAgcmV0dXJuIHJlbGF0aXZlVVJMXG4gICAgPyBiYXNlVVJMLnJlcGxhY2UoL1xcLyskLywgJycpICsgJy8nICsgcmVsYXRpdmVVUkwucmVwbGFjZSgvXlxcLysvLCAnJylcbiAgICA6IGJhc2VVUkw7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gKFxuICB1dGlscy5pc1N0YW5kYXJkQnJvd3NlckVudigpID9cblxuICAvLyBTdGFuZGFyZCBicm93c2VyIGVudnMgc3VwcG9ydCBkb2N1bWVudC5jb29raWVcbiAgKGZ1bmN0aW9uIHN0YW5kYXJkQnJvd3NlckVudigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgd3JpdGU6IGZ1bmN0aW9uIHdyaXRlKG5hbWUsIHZhbHVlLCBleHBpcmVzLCBwYXRoLCBkb21haW4sIHNlY3VyZSkge1xuICAgICAgICB2YXIgY29va2llID0gW107XG4gICAgICAgIGNvb2tpZS5wdXNoKG5hbWUgKyAnPScgKyBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpKTtcblxuICAgICAgICBpZiAodXRpbHMuaXNOdW1iZXIoZXhwaXJlcykpIHtcbiAgICAgICAgICBjb29raWUucHVzaCgnZXhwaXJlcz0nICsgbmV3IERhdGUoZXhwaXJlcykudG9HTVRTdHJpbmcoKSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodXRpbHMuaXNTdHJpbmcocGF0aCkpIHtcbiAgICAgICAgICBjb29raWUucHVzaCgncGF0aD0nICsgcGF0aCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodXRpbHMuaXNTdHJpbmcoZG9tYWluKSkge1xuICAgICAgICAgIGNvb2tpZS5wdXNoKCdkb21haW49JyArIGRvbWFpbik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc2VjdXJlID09PSB0cnVlKSB7XG4gICAgICAgICAgY29va2llLnB1c2goJ3NlY3VyZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgZG9jdW1lbnQuY29va2llID0gY29va2llLmpvaW4oJzsgJyk7XG4gICAgICB9LFxuXG4gICAgICByZWFkOiBmdW5jdGlvbiByZWFkKG5hbWUpIHtcbiAgICAgICAgdmFyIG1hdGNoID0gZG9jdW1lbnQuY29va2llLm1hdGNoKG5ldyBSZWdFeHAoJyhefDtcXFxccyopKCcgKyBuYW1lICsgJyk9KFteO10qKScpKTtcbiAgICAgICAgcmV0dXJuIChtYXRjaCA/IGRlY29kZVVSSUNvbXBvbmVudChtYXRjaFszXSkgOiBudWxsKTtcbiAgICAgIH0sXG5cbiAgICAgIHJlbW92ZTogZnVuY3Rpb24gcmVtb3ZlKG5hbWUpIHtcbiAgICAgICAgdGhpcy53cml0ZShuYW1lLCAnJywgRGF0ZS5ub3coKSAtIDg2NDAwMDAwKTtcbiAgICAgIH1cbiAgICB9O1xuICB9KSgpIDpcblxuICAvLyBOb24gc3RhbmRhcmQgYnJvd3NlciBlbnYgKHdlYiB3b3JrZXJzLCByZWFjdC1uYXRpdmUpIGxhY2sgbmVlZGVkIHN1cHBvcnQuXG4gIChmdW5jdGlvbiBub25TdGFuZGFyZEJyb3dzZXJFbnYoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHdyaXRlOiBmdW5jdGlvbiB3cml0ZSgpIHt9LFxuICAgICAgcmVhZDogZnVuY3Rpb24gcmVhZCgpIHsgcmV0dXJuIG51bGw7IH0sXG4gICAgICByZW1vdmU6IGZ1bmN0aW9uIHJlbW92ZSgpIHt9XG4gICAgfTtcbiAgfSkoKVxuKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhlIHNwZWNpZmllZCBVUkwgaXMgYWJzb2x1dGVcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdXJsIFRoZSBVUkwgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdGhlIHNwZWNpZmllZCBVUkwgaXMgYWJzb2x1dGUsIG90aGVyd2lzZSBmYWxzZVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQWJzb2x1dGVVUkwodXJsKSB7XG4gIC8vIEEgVVJMIGlzIGNvbnNpZGVyZWQgYWJzb2x1dGUgaWYgaXQgYmVnaW5zIHdpdGggXCI8c2NoZW1lPjovL1wiIG9yIFwiLy9cIiAocHJvdG9jb2wtcmVsYXRpdmUgVVJMKS5cbiAgLy8gUkZDIDM5ODYgZGVmaW5lcyBzY2hlbWUgbmFtZSBhcyBhIHNlcXVlbmNlIG9mIGNoYXJhY3RlcnMgYmVnaW5uaW5nIHdpdGggYSBsZXR0ZXIgYW5kIGZvbGxvd2VkXG4gIC8vIGJ5IGFueSBjb21iaW5hdGlvbiBvZiBsZXR0ZXJzLCBkaWdpdHMsIHBsdXMsIHBlcmlvZCwgb3IgaHlwaGVuLlxuICByZXR1cm4gL14oW2Etel1bYS16XFxkXFwrXFwtXFwuXSo6KT9cXC9cXC8vaS50ZXN0KHVybCk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gKFxuICB1dGlscy5pc1N0YW5kYXJkQnJvd3NlckVudigpID9cblxuICAvLyBTdGFuZGFyZCBicm93c2VyIGVudnMgaGF2ZSBmdWxsIHN1cHBvcnQgb2YgdGhlIEFQSXMgbmVlZGVkIHRvIHRlc3RcbiAgLy8gd2hldGhlciB0aGUgcmVxdWVzdCBVUkwgaXMgb2YgdGhlIHNhbWUgb3JpZ2luIGFzIGN1cnJlbnQgbG9jYXRpb24uXG4gIChmdW5jdGlvbiBzdGFuZGFyZEJyb3dzZXJFbnYoKSB7XG4gICAgdmFyIG1zaWUgPSAvKG1zaWV8dHJpZGVudCkvaS50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpO1xuICAgIHZhciB1cmxQYXJzaW5nTm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICB2YXIgb3JpZ2luVVJMO1xuXG4gICAgLyoqXG4gICAgKiBQYXJzZSBhIFVSTCB0byBkaXNjb3ZlciBpdCdzIGNvbXBvbmVudHNcbiAgICAqXG4gICAgKiBAcGFyYW0ge1N0cmluZ30gdXJsIFRoZSBVUkwgdG8gYmUgcGFyc2VkXG4gICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgICovXG4gICAgZnVuY3Rpb24gcmVzb2x2ZVVSTCh1cmwpIHtcbiAgICAgIHZhciBocmVmID0gdXJsO1xuXG4gICAgICBpZiAobXNpZSkge1xuICAgICAgICAvLyBJRSBuZWVkcyBhdHRyaWJ1dGUgc2V0IHR3aWNlIHRvIG5vcm1hbGl6ZSBwcm9wZXJ0aWVzXG4gICAgICAgIHVybFBhcnNpbmdOb2RlLnNldEF0dHJpYnV0ZSgnaHJlZicsIGhyZWYpO1xuICAgICAgICBocmVmID0gdXJsUGFyc2luZ05vZGUuaHJlZjtcbiAgICAgIH1cblxuICAgICAgdXJsUGFyc2luZ05vZGUuc2V0QXR0cmlidXRlKCdocmVmJywgaHJlZik7XG5cbiAgICAgIC8vIHVybFBhcnNpbmdOb2RlIHByb3ZpZGVzIHRoZSBVcmxVdGlscyBpbnRlcmZhY2UgLSBodHRwOi8vdXJsLnNwZWMud2hhdHdnLm9yZy8jdXJsdXRpbHNcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGhyZWY6IHVybFBhcnNpbmdOb2RlLmhyZWYsXG4gICAgICAgIHByb3RvY29sOiB1cmxQYXJzaW5nTm9kZS5wcm90b2NvbCA/IHVybFBhcnNpbmdOb2RlLnByb3RvY29sLnJlcGxhY2UoLzokLywgJycpIDogJycsXG4gICAgICAgIGhvc3Q6IHVybFBhcnNpbmdOb2RlLmhvc3QsXG4gICAgICAgIHNlYXJjaDogdXJsUGFyc2luZ05vZGUuc2VhcmNoID8gdXJsUGFyc2luZ05vZGUuc2VhcmNoLnJlcGxhY2UoL15cXD8vLCAnJykgOiAnJyxcbiAgICAgICAgaGFzaDogdXJsUGFyc2luZ05vZGUuaGFzaCA/IHVybFBhcnNpbmdOb2RlLmhhc2gucmVwbGFjZSgvXiMvLCAnJykgOiAnJyxcbiAgICAgICAgaG9zdG5hbWU6IHVybFBhcnNpbmdOb2RlLmhvc3RuYW1lLFxuICAgICAgICBwb3J0OiB1cmxQYXJzaW5nTm9kZS5wb3J0LFxuICAgICAgICBwYXRobmFtZTogKHVybFBhcnNpbmdOb2RlLnBhdGhuYW1lLmNoYXJBdCgwKSA9PT0gJy8nKSA/XG4gICAgICAgICAgICAgICAgICB1cmxQYXJzaW5nTm9kZS5wYXRobmFtZSA6XG4gICAgICAgICAgICAgICAgICAnLycgKyB1cmxQYXJzaW5nTm9kZS5wYXRobmFtZVxuICAgICAgfTtcbiAgICB9XG5cbiAgICBvcmlnaW5VUkwgPSByZXNvbHZlVVJMKHdpbmRvdy5sb2NhdGlvbi5ocmVmKTtcblxuICAgIC8qKlxuICAgICogRGV0ZXJtaW5lIGlmIGEgVVJMIHNoYXJlcyB0aGUgc2FtZSBvcmlnaW4gYXMgdGhlIGN1cnJlbnQgbG9jYXRpb25cbiAgICAqXG4gICAgKiBAcGFyYW0ge1N0cmluZ30gcmVxdWVzdFVSTCBUaGUgVVJMIHRvIHRlc3RcbiAgICAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIFVSTCBzaGFyZXMgdGhlIHNhbWUgb3JpZ2luLCBvdGhlcndpc2UgZmFsc2VcbiAgICAqL1xuICAgIHJldHVybiBmdW5jdGlvbiBpc1VSTFNhbWVPcmlnaW4ocmVxdWVzdFVSTCkge1xuICAgICAgdmFyIHBhcnNlZCA9ICh1dGlscy5pc1N0cmluZyhyZXF1ZXN0VVJMKSkgPyByZXNvbHZlVVJMKHJlcXVlc3RVUkwpIDogcmVxdWVzdFVSTDtcbiAgICAgIHJldHVybiAocGFyc2VkLnByb3RvY29sID09PSBvcmlnaW5VUkwucHJvdG9jb2wgJiZcbiAgICAgICAgICAgIHBhcnNlZC5ob3N0ID09PSBvcmlnaW5VUkwuaG9zdCk7XG4gICAgfTtcbiAgfSkoKSA6XG5cbiAgLy8gTm9uIHN0YW5kYXJkIGJyb3dzZXIgZW52cyAod2ViIHdvcmtlcnMsIHJlYWN0LW5hdGl2ZSkgbGFjayBuZWVkZWQgc3VwcG9ydC5cbiAgKGZ1bmN0aW9uIG5vblN0YW5kYXJkQnJvd3NlckVudigpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gaXNVUkxTYW1lT3JpZ2luKCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgfSkoKVxuKTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBub3JtYWxpemVIZWFkZXJOYW1lKGhlYWRlcnMsIG5vcm1hbGl6ZWROYW1lKSB7XG4gIHV0aWxzLmZvckVhY2goaGVhZGVycywgZnVuY3Rpb24gcHJvY2Vzc0hlYWRlcih2YWx1ZSwgbmFtZSkge1xuICAgIGlmIChuYW1lICE9PSBub3JtYWxpemVkTmFtZSAmJiBuYW1lLnRvVXBwZXJDYXNlKCkgPT09IG5vcm1hbGl6ZWROYW1lLnRvVXBwZXJDYXNlKCkpIHtcbiAgICAgIGhlYWRlcnNbbm9ybWFsaXplZE5hbWVdID0gdmFsdWU7XG4gICAgICBkZWxldGUgaGVhZGVyc1tuYW1lXTtcbiAgICB9XG4gIH0pO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xuXG4vLyBIZWFkZXJzIHdob3NlIGR1cGxpY2F0ZXMgYXJlIGlnbm9yZWQgYnkgbm9kZVxuLy8gYy5mLiBodHRwczovL25vZGVqcy5vcmcvYXBpL2h0dHAuaHRtbCNodHRwX21lc3NhZ2VfaGVhZGVyc1xudmFyIGlnbm9yZUR1cGxpY2F0ZU9mID0gW1xuICAnYWdlJywgJ2F1dGhvcml6YXRpb24nLCAnY29udGVudC1sZW5ndGgnLCAnY29udGVudC10eXBlJywgJ2V0YWcnLFxuICAnZXhwaXJlcycsICdmcm9tJywgJ2hvc3QnLCAnaWYtbW9kaWZpZWQtc2luY2UnLCAnaWYtdW5tb2RpZmllZC1zaW5jZScsXG4gICdsYXN0LW1vZGlmaWVkJywgJ2xvY2F0aW9uJywgJ21heC1mb3J3YXJkcycsICdwcm94eS1hdXRob3JpemF0aW9uJyxcbiAgJ3JlZmVyZXInLCAncmV0cnktYWZ0ZXInLCAndXNlci1hZ2VudCdcbl07XG5cbi8qKlxuICogUGFyc2UgaGVhZGVycyBpbnRvIGFuIG9iamVjdFxuICpcbiAqIGBgYFxuICogRGF0ZTogV2VkLCAyNyBBdWcgMjAxNCAwODo1ODo0OSBHTVRcbiAqIENvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvblxuICogQ29ubmVjdGlvbjoga2VlcC1hbGl2ZVxuICogVHJhbnNmZXItRW5jb2Rpbmc6IGNodW5rZWRcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBoZWFkZXJzIEhlYWRlcnMgbmVlZGluZyB0byBiZSBwYXJzZWRcbiAqIEByZXR1cm5zIHtPYmplY3R9IEhlYWRlcnMgcGFyc2VkIGludG8gYW4gb2JqZWN0XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gcGFyc2VIZWFkZXJzKGhlYWRlcnMpIHtcbiAgdmFyIHBhcnNlZCA9IHt9O1xuICB2YXIga2V5O1xuICB2YXIgdmFsO1xuICB2YXIgaTtcblxuICBpZiAoIWhlYWRlcnMpIHsgcmV0dXJuIHBhcnNlZDsgfVxuXG4gIHV0aWxzLmZvckVhY2goaGVhZGVycy5zcGxpdCgnXFxuJyksIGZ1bmN0aW9uIHBhcnNlcihsaW5lKSB7XG4gICAgaSA9IGxpbmUuaW5kZXhPZignOicpO1xuICAgIGtleSA9IHV0aWxzLnRyaW0obGluZS5zdWJzdHIoMCwgaSkpLnRvTG93ZXJDYXNlKCk7XG4gICAgdmFsID0gdXRpbHMudHJpbShsaW5lLnN1YnN0cihpICsgMSkpO1xuXG4gICAgaWYgKGtleSkge1xuICAgICAgaWYgKHBhcnNlZFtrZXldICYmIGlnbm9yZUR1cGxpY2F0ZU9mLmluZGV4T2Yoa2V5KSA+PSAwKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmIChrZXkgPT09ICdzZXQtY29va2llJykge1xuICAgICAgICBwYXJzZWRba2V5XSA9IChwYXJzZWRba2V5XSA/IHBhcnNlZFtrZXldIDogW10pLmNvbmNhdChbdmFsXSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwYXJzZWRba2V5XSA9IHBhcnNlZFtrZXldID8gcGFyc2VkW2tleV0gKyAnLCAnICsgdmFsIDogdmFsO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHBhcnNlZDtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogU3ludGFjdGljIHN1Z2FyIGZvciBpbnZva2luZyBhIGZ1bmN0aW9uIGFuZCBleHBhbmRpbmcgYW4gYXJyYXkgZm9yIGFyZ3VtZW50cy5cbiAqXG4gKiBDb21tb24gdXNlIGNhc2Ugd291bGQgYmUgdG8gdXNlIGBGdW5jdGlvbi5wcm90b3R5cGUuYXBwbHlgLlxuICpcbiAqICBgYGBqc1xuICogIGZ1bmN0aW9uIGYoeCwgeSwgeikge31cbiAqICB2YXIgYXJncyA9IFsxLCAyLCAzXTtcbiAqICBmLmFwcGx5KG51bGwsIGFyZ3MpO1xuICogIGBgYFxuICpcbiAqIFdpdGggYHNwcmVhZGAgdGhpcyBleGFtcGxlIGNhbiBiZSByZS13cml0dGVuLlxuICpcbiAqICBgYGBqc1xuICogIHNwcmVhZChmdW5jdGlvbih4LCB5LCB6KSB7fSkoWzEsIDIsIDNdKTtcbiAqICBgYGBcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICogQHJldHVybnMge0Z1bmN0aW9ufVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHNwcmVhZChjYWxsYmFjaykge1xuICByZXR1cm4gZnVuY3Rpb24gd3JhcChhcnIpIHtcbiAgICByZXR1cm4gY2FsbGJhY2suYXBwbHkobnVsbCwgYXJyKTtcbiAgfTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBiaW5kID0gcmVxdWlyZSgnLi9oZWxwZXJzL2JpbmQnKTtcbnZhciBpc0J1ZmZlciA9IHJlcXVpcmUoJ2lzLWJ1ZmZlcicpO1xuXG4vKmdsb2JhbCB0b1N0cmluZzp0cnVlKi9cblxuLy8gdXRpbHMgaXMgYSBsaWJyYXJ5IG9mIGdlbmVyaWMgaGVscGVyIGZ1bmN0aW9ucyBub24tc3BlY2lmaWMgdG8gYXhpb3NcblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhbiBBcnJheVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGFuIEFycmF5LCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNBcnJheSh2YWwpIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwodmFsKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhbiBBcnJheUJ1ZmZlclxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGFuIEFycmF5QnVmZmVyLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNBcnJheUJ1ZmZlcih2YWwpIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwodmFsKSA9PT0gJ1tvYmplY3QgQXJyYXlCdWZmZXJdJztcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhIEZvcm1EYXRhXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYW4gRm9ybURhdGEsIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc0Zvcm1EYXRhKHZhbCkge1xuICByZXR1cm4gKHR5cGVvZiBGb3JtRGF0YSAhPT0gJ3VuZGVmaW5lZCcpICYmICh2YWwgaW5zdGFuY2VvZiBGb3JtRGF0YSk7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSB2aWV3IG9uIGFuIEFycmF5QnVmZmVyXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSB2aWV3IG9uIGFuIEFycmF5QnVmZmVyLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNBcnJheUJ1ZmZlclZpZXcodmFsKSB7XG4gIHZhciByZXN1bHQ7XG4gIGlmICgodHlwZW9mIEFycmF5QnVmZmVyICE9PSAndW5kZWZpbmVkJykgJiYgKEFycmF5QnVmZmVyLmlzVmlldykpIHtcbiAgICByZXN1bHQgPSBBcnJheUJ1ZmZlci5pc1ZpZXcodmFsKTtcbiAgfSBlbHNlIHtcbiAgICByZXN1bHQgPSAodmFsKSAmJiAodmFsLmJ1ZmZlcikgJiYgKHZhbC5idWZmZXIgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcik7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhIFN0cmluZ1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgU3RyaW5nLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNTdHJpbmcodmFsKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsID09PSAnc3RyaW5nJztcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhIE51bWJlclxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgTnVtYmVyLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNOdW1iZXIodmFsKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsID09PSAnbnVtYmVyJztcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyB1bmRlZmluZWRcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB0aGUgdmFsdWUgaXMgdW5kZWZpbmVkLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNVbmRlZmluZWQodmFsKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsID09PSAndW5kZWZpbmVkJztcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhbiBPYmplY3RcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhbiBPYmplY3QsIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc09iamVjdCh2YWwpIHtcbiAgcmV0dXJuIHZhbCAhPT0gbnVsbCAmJiB0eXBlb2YgdmFsID09PSAnb2JqZWN0Jztcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhIERhdGVcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIERhdGUsIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc0RhdGUodmFsKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKHZhbCkgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhIEZpbGVcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIEZpbGUsIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc0ZpbGUodmFsKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKHZhbCkgPT09ICdbb2JqZWN0IEZpbGVdJztcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhIEJsb2JcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIEJsb2IsIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc0Jsb2IodmFsKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKHZhbCkgPT09ICdbb2JqZWN0IEJsb2JdJztcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhIEZ1bmN0aW9uXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBGdW5jdGlvbiwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzRnVuY3Rpb24odmFsKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKHZhbCkgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBTdHJlYW1cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIFN0cmVhbSwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzU3RyZWFtKHZhbCkge1xuICByZXR1cm4gaXNPYmplY3QodmFsKSAmJiBpc0Z1bmN0aW9uKHZhbC5waXBlKTtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhIFVSTFNlYXJjaFBhcmFtcyBvYmplY3RcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIFVSTFNlYXJjaFBhcmFtcyBvYmplY3QsIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc1VSTFNlYXJjaFBhcmFtcyh2YWwpIHtcbiAgcmV0dXJuIHR5cGVvZiBVUkxTZWFyY2hQYXJhbXMgIT09ICd1bmRlZmluZWQnICYmIHZhbCBpbnN0YW5jZW9mIFVSTFNlYXJjaFBhcmFtcztcbn1cblxuLyoqXG4gKiBUcmltIGV4Y2VzcyB3aGl0ZXNwYWNlIG9mZiB0aGUgYmVnaW5uaW5nIGFuZCBlbmQgb2YgYSBzdHJpbmdcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyIFRoZSBTdHJpbmcgdG8gdHJpbVxuICogQHJldHVybnMge1N0cmluZ30gVGhlIFN0cmluZyBmcmVlZCBvZiBleGNlc3Mgd2hpdGVzcGFjZVxuICovXG5mdW5jdGlvbiB0cmltKHN0cikge1xuICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHMqLywgJycpLnJlcGxhY2UoL1xccyokLywgJycpO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiB3ZSdyZSBydW5uaW5nIGluIGEgc3RhbmRhcmQgYnJvd3NlciBlbnZpcm9ubWVudFxuICpcbiAqIFRoaXMgYWxsb3dzIGF4aW9zIHRvIHJ1biBpbiBhIHdlYiB3b3JrZXIsIGFuZCByZWFjdC1uYXRpdmUuXG4gKiBCb3RoIGVudmlyb25tZW50cyBzdXBwb3J0IFhNTEh0dHBSZXF1ZXN0LCBidXQgbm90IGZ1bGx5IHN0YW5kYXJkIGdsb2JhbHMuXG4gKlxuICogd2ViIHdvcmtlcnM6XG4gKiAgdHlwZW9mIHdpbmRvdyAtPiB1bmRlZmluZWRcbiAqICB0eXBlb2YgZG9jdW1lbnQgLT4gdW5kZWZpbmVkXG4gKlxuICogcmVhY3QtbmF0aXZlOlxuICogIG5hdmlnYXRvci5wcm9kdWN0IC0+ICdSZWFjdE5hdGl2ZSdcbiAqL1xuZnVuY3Rpb24gaXNTdGFuZGFyZEJyb3dzZXJFbnYoKSB7XG4gIGlmICh0eXBlb2YgbmF2aWdhdG9yICE9PSAndW5kZWZpbmVkJyAmJiBuYXZpZ2F0b3IucHJvZHVjdCA9PT0gJ1JlYWN0TmF0aXZlJykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gKFxuICAgIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmXG4gICAgdHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJ1xuICApO1xufVxuXG4vKipcbiAqIEl0ZXJhdGUgb3ZlciBhbiBBcnJheSBvciBhbiBPYmplY3QgaW52b2tpbmcgYSBmdW5jdGlvbiBmb3IgZWFjaCBpdGVtLlxuICpcbiAqIElmIGBvYmpgIGlzIGFuIEFycmF5IGNhbGxiYWNrIHdpbGwgYmUgY2FsbGVkIHBhc3NpbmdcbiAqIHRoZSB2YWx1ZSwgaW5kZXgsIGFuZCBjb21wbGV0ZSBhcnJheSBmb3IgZWFjaCBpdGVtLlxuICpcbiAqIElmICdvYmonIGlzIGFuIE9iamVjdCBjYWxsYmFjayB3aWxsIGJlIGNhbGxlZCBwYXNzaW5nXG4gKiB0aGUgdmFsdWUsIGtleSwgYW5kIGNvbXBsZXRlIG9iamVjdCBmb3IgZWFjaCBwcm9wZXJ0eS5cbiAqXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheX0gb2JqIFRoZSBvYmplY3QgdG8gaXRlcmF0ZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gVGhlIGNhbGxiYWNrIHRvIGludm9rZSBmb3IgZWFjaCBpdGVtXG4gKi9cbmZ1bmN0aW9uIGZvckVhY2gob2JqLCBmbikge1xuICAvLyBEb24ndCBib3RoZXIgaWYgbm8gdmFsdWUgcHJvdmlkZWRcbiAgaWYgKG9iaiA9PT0gbnVsbCB8fCB0eXBlb2Ygb2JqID09PSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIEZvcmNlIGFuIGFycmF5IGlmIG5vdCBhbHJlYWR5IHNvbWV0aGluZyBpdGVyYWJsZVxuICBpZiAodHlwZW9mIG9iaiAhPT0gJ29iamVjdCcpIHtcbiAgICAvKmVzbGludCBuby1wYXJhbS1yZWFzc2lnbjowKi9cbiAgICBvYmogPSBbb2JqXTtcbiAgfVxuXG4gIGlmIChpc0FycmF5KG9iaikpIHtcbiAgICAvLyBJdGVyYXRlIG92ZXIgYXJyYXkgdmFsdWVzXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBvYmoubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBmbi5jYWxsKG51bGwsIG9ialtpXSwgaSwgb2JqKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gSXRlcmF0ZSBvdmVyIG9iamVjdCBrZXlzXG4gICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIHtcbiAgICAgICAgZm4uY2FsbChudWxsLCBvYmpba2V5XSwga2V5LCBvYmopO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIEFjY2VwdHMgdmFyYXJncyBleHBlY3RpbmcgZWFjaCBhcmd1bWVudCB0byBiZSBhbiBvYmplY3QsIHRoZW5cbiAqIGltbXV0YWJseSBtZXJnZXMgdGhlIHByb3BlcnRpZXMgb2YgZWFjaCBvYmplY3QgYW5kIHJldHVybnMgcmVzdWx0LlxuICpcbiAqIFdoZW4gbXVsdGlwbGUgb2JqZWN0cyBjb250YWluIHRoZSBzYW1lIGtleSB0aGUgbGF0ZXIgb2JqZWN0IGluXG4gKiB0aGUgYXJndW1lbnRzIGxpc3Qgd2lsbCB0YWtlIHByZWNlZGVuY2UuXG4gKlxuICogRXhhbXBsZTpcbiAqXG4gKiBgYGBqc1xuICogdmFyIHJlc3VsdCA9IG1lcmdlKHtmb286IDEyM30sIHtmb286IDQ1Nn0pO1xuICogY29uc29sZS5sb2cocmVzdWx0LmZvbyk7IC8vIG91dHB1dHMgNDU2XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqMSBPYmplY3QgdG8gbWVyZ2VcbiAqIEByZXR1cm5zIHtPYmplY3R9IFJlc3VsdCBvZiBhbGwgbWVyZ2UgcHJvcGVydGllc1xuICovXG5mdW5jdGlvbiBtZXJnZSgvKiBvYmoxLCBvYmoyLCBvYmozLCAuLi4gKi8pIHtcbiAgdmFyIHJlc3VsdCA9IHt9O1xuICBmdW5jdGlvbiBhc3NpZ25WYWx1ZSh2YWwsIGtleSkge1xuICAgIGlmICh0eXBlb2YgcmVzdWx0W2tleV0gPT09ICdvYmplY3QnICYmIHR5cGVvZiB2YWwgPT09ICdvYmplY3QnKSB7XG4gICAgICByZXN1bHRba2V5XSA9IG1lcmdlKHJlc3VsdFtrZXldLCB2YWwpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHRba2V5XSA9IHZhbDtcbiAgICB9XG4gIH1cblxuICBmb3IgKHZhciBpID0gMCwgbCA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBmb3JFYWNoKGFyZ3VtZW50c1tpXSwgYXNzaWduVmFsdWUpO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogRXh0ZW5kcyBvYmplY3QgYSBieSBtdXRhYmx5IGFkZGluZyB0byBpdCB0aGUgcHJvcGVydGllcyBvZiBvYmplY3QgYi5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gYSBUaGUgb2JqZWN0IHRvIGJlIGV4dGVuZGVkXG4gKiBAcGFyYW0ge09iamVjdH0gYiBUaGUgb2JqZWN0IHRvIGNvcHkgcHJvcGVydGllcyBmcm9tXG4gKiBAcGFyYW0ge09iamVjdH0gdGhpc0FyZyBUaGUgb2JqZWN0IHRvIGJpbmQgZnVuY3Rpb24gdG9cbiAqIEByZXR1cm4ge09iamVjdH0gVGhlIHJlc3VsdGluZyB2YWx1ZSBvZiBvYmplY3QgYVxuICovXG5mdW5jdGlvbiBleHRlbmQoYSwgYiwgdGhpc0FyZykge1xuICBmb3JFYWNoKGIsIGZ1bmN0aW9uIGFzc2lnblZhbHVlKHZhbCwga2V5KSB7XG4gICAgaWYgKHRoaXNBcmcgJiYgdHlwZW9mIHZhbCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgYVtrZXldID0gYmluZCh2YWwsIHRoaXNBcmcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBhW2tleV0gPSB2YWw7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIGE7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBpc0FycmF5OiBpc0FycmF5LFxuICBpc0FycmF5QnVmZmVyOiBpc0FycmF5QnVmZmVyLFxuICBpc0J1ZmZlcjogaXNCdWZmZXIsXG4gIGlzRm9ybURhdGE6IGlzRm9ybURhdGEsXG4gIGlzQXJyYXlCdWZmZXJWaWV3OiBpc0FycmF5QnVmZmVyVmlldyxcbiAgaXNTdHJpbmc6IGlzU3RyaW5nLFxuICBpc051bWJlcjogaXNOdW1iZXIsXG4gIGlzT2JqZWN0OiBpc09iamVjdCxcbiAgaXNVbmRlZmluZWQ6IGlzVW5kZWZpbmVkLFxuICBpc0RhdGU6IGlzRGF0ZSxcbiAgaXNGaWxlOiBpc0ZpbGUsXG4gIGlzQmxvYjogaXNCbG9iLFxuICBpc0Z1bmN0aW9uOiBpc0Z1bmN0aW9uLFxuICBpc1N0cmVhbTogaXNTdHJlYW0sXG4gIGlzVVJMU2VhcmNoUGFyYW1zOiBpc1VSTFNlYXJjaFBhcmFtcyxcbiAgaXNTdGFuZGFyZEJyb3dzZXJFbnY6IGlzU3RhbmRhcmRCcm93c2VyRW52LFxuICBmb3JFYWNoOiBmb3JFYWNoLFxuICBtZXJnZTogbWVyZ2UsXG4gIGV4dGVuZDogZXh0ZW5kLFxuICB0cmltOiB0cmltXG59O1xuIiwiLyohXG4gKiBEZXRlcm1pbmUgaWYgYW4gb2JqZWN0IGlzIGEgQnVmZmVyXG4gKlxuICogQGF1dGhvciAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGh0dHBzOi8vZmVyb3NzLm9yZz5cbiAqIEBsaWNlbnNlICBNSVRcbiAqL1xuXG4vLyBUaGUgX2lzQnVmZmVyIGNoZWNrIGlzIGZvciBTYWZhcmkgNS03IHN1cHBvcnQsIGJlY2F1c2UgaXQncyBtaXNzaW5nXG4vLyBPYmplY3QucHJvdG90eXBlLmNvbnN0cnVjdG9yLiBSZW1vdmUgdGhpcyBldmVudHVhbGx5XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvYmopIHtcbiAgcmV0dXJuIG9iaiAhPSBudWxsICYmIChpc0J1ZmZlcihvYmopIHx8IGlzU2xvd0J1ZmZlcihvYmopIHx8ICEhb2JqLl9pc0J1ZmZlcilcbn1cblxuZnVuY3Rpb24gaXNCdWZmZXIgKG9iaikge1xuICByZXR1cm4gISFvYmouY29uc3RydWN0b3IgJiYgdHlwZW9mIG9iai5jb25zdHJ1Y3Rvci5pc0J1ZmZlciA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmouY29uc3RydWN0b3IuaXNCdWZmZXIob2JqKVxufVxuXG4vLyBGb3IgTm9kZSB2MC4xMCBzdXBwb3J0LiBSZW1vdmUgdGhpcyBldmVudHVhbGx5LlxuZnVuY3Rpb24gaXNTbG93QnVmZmVyIChvYmopIHtcbiAgcmV0dXJuIHR5cGVvZiBvYmoucmVhZEZsb2F0TEUgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIG9iai5zbGljZSA9PT0gJ2Z1bmN0aW9uJyAmJiBpc0J1ZmZlcihvYmouc2xpY2UoMCwgMCkpXG59XG4iLCIvKipUaGlzIGNsYXNzIGlzIGF1dG9tYXRpY2FsbHkgZ2VuZXJhdGVkIGJ5IExheWFBaXJJREUsIHBsZWFzZSBkbyBub3QgbWFrZSBhbnkgbW9kaWZpY2F0aW9ucy4gKi9cbmltcG9ydCBBc3Npc3RhbnQgZnJvbSBcIi4vc2NyaXB0L0Fzc2lzdGFudFwiXG5pbXBvcnQgUGFnZVNjcmlwdCBmcm9tIFwiLi9wdWJsaWNTY3JpcHQvUGFnZVNjcmlwdFwiXG5pbXBvcnQgU2NyZWVuIGZyb20gXCIuL3B1YmxpY1NjcmlwdC9TY3JlZW5cIlxuaW1wb3J0IHRyZW5kTGlzdCBmcm9tIFwiLi90ZW1wbGF0ZS90cmVuZExpc3RcIlxuaW1wb3J0IENhcmQgZnJvbSBcIi4vc2NyaXB0L0NhcmRcIlxuaW1wb3J0IGdyYW5kUHJpeCBmcm9tIFwiLi9zY3JpcHQvZ3JhbmRQcml4XCJcbmltcG9ydCBQYWdlTmF2U2NyaXB0IGZyb20gXCIuL3B1YmxpY1NjcmlwdC9QYWdlTmF2U2NyaXB0XCJcbmltcG9ydCBwcml4TGlzdCBmcm9tIFwiLi90ZW1wbGF0ZS9wcml4TGlzdFwiXG5pbXBvcnQgR3Vlc3NpbmcgZnJvbSBcIi4vc2NyaXB0L0d1ZXNzaW5nXCJcbmltcG9ydCBudW1iZXJMaXN0RG9tU2NyaXB0IGZyb20gXCIuL3RlbXBsYXRlL251bWJlckxpc3REb21TY3JpcHRcIlxuaW1wb3J0IEhvbWUgZnJvbSBcIi4vc2NyaXB0L0hvbWVcIlxuaW1wb3J0IGxvYWRpbmdTY2VuZSBmcm9tIFwiLi9zY3JpcHQvbG9hZGluZ1NjZW5lXCJcbmltcG9ydCBwcmlIaXN0b3J5U2NlbmUgZnJvbSBcIi4vc2NyaXB0L3ByaUhpc3RvcnlTY2VuZVwiXG5pbXBvcnQgcHJpSGlzdG9yeSBmcm9tIFwiLi90ZW1wbGF0ZS9wcmlIaXN0b3J5XCJcbmltcG9ydCBSZWNvcmQgZnJvbSBcIi4vc2NyaXB0L1JlY29yZFwiXG5pbXBvcnQgam9pblJlY29yZHMgZnJvbSBcIi4vdGVtcGxhdGUvam9pblJlY29yZHNcIlxuaW1wb3J0IHByZXZpb3VzUmVjb3JkcyBmcm9tIFwiLi90ZW1wbGF0ZS9wcmV2aW91c1JlY29yZHNcIlxuaW1wb3J0IHNob3J0TGlzdGVkIGZyb20gXCIuL3NjcmlwdC9zaG9ydExpc3RlZFwiXG5pbXBvcnQgc2hvcnRMaXN0ZWRMaXN0IGZyb20gXCIuL3RlbXBsYXRlL3Nob3J0TGlzdGVkTGlzdFwiXG5pbXBvcnQgcHN3SW5wdXQgZnJvbSBcIi4vdGVtcGxhdGUvcHN3SW5wdXRcIlxuaW1wb3J0IHJhbmtpbmdMaXN0IGZyb20gXCIuL3RlbXBsYXRlL3JhbmtpbmdMaXN0XCJcbmltcG9ydCByZWNoYXJnZURpYWxvZyBmcm9tIFwiLi90ZW1wbGF0ZS9yZWNoYXJnZURpYWxvZ1wiXG5pbXBvcnQgcm9ja2V0RGlhbG9nIGZyb20gXCIuL3ZpZXcvcm9ja2V0RGlhbG9nXCJcbmltcG9ydCB0aXBEaWFsb2cgZnJvbSBcIi4vdGVtcGxhdGUvdGlwRGlhbG9nXCJcbmltcG9ydCB3aW5uaW5nTGlzdCBmcm9tIFwiLi90ZW1wbGF0ZS93aW5uaW5nTGlzdFwiXG5pbXBvcnQgd2lubmluZyBmcm9tIFwiLi9zY3JpcHQvd2lubmluZ1wiXG4vKlxuKiDmuLjmiI/liJ3lp4vljJbphY3nva47XG4qL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgR2FtZUNvbmZpZ3tcbiAgICBzdGF0aWMgd2lkdGg6bnVtYmVyPTc1MDtcbiAgICBzdGF0aWMgaGVpZ2h0Om51bWJlcj0xMzM0O1xuICAgIHN0YXRpYyBzY2FsZU1vZGU6c3RyaW5nPVwiZml4ZWR3aWR0aFwiO1xuICAgIHN0YXRpYyBzY3JlZW5Nb2RlOnN0cmluZz1cIm5vbmVcIjtcbiAgICBzdGF0aWMgYWxpZ25WOnN0cmluZz1cInRvcFwiO1xuICAgIHN0YXRpYyBhbGlnbkg6c3RyaW5nPVwibGVmdFwiO1xuICAgIHN0YXRpYyBzdGFydFNjZW5lOmFueT1cImxvYWRpbmdTY2VuZS5zY2VuZVwiO1xuICAgIHN0YXRpYyBzY2VuZVJvb3Q6c3RyaW5nPVwiXCI7XG4gICAgc3RhdGljIGRlYnVnOmJvb2xlYW49ZmFsc2U7XG4gICAgc3RhdGljIHN0YXQ6Ym9vbGVhbj1mYWxzZTtcbiAgICBzdGF0aWMgcGh5c2ljc0RlYnVnOmJvb2xlYW49ZmFsc2U7XG4gICAgc3RhdGljIGV4cG9ydFNjZW5lVG9Kc29uOmJvb2xlYW49dHJ1ZTtcbiAgICBjb25zdHJ1Y3Rvcigpe31cbiAgICBzdGF0aWMgaW5pdCgpe1xuICAgICAgICB2YXIgcmVnOiBGdW5jdGlvbiA9IExheWEuQ2xhc3NVdGlscy5yZWdDbGFzcztcbiAgICAgICAgcmVnKFwic2NyaXB0L0Fzc2lzdGFudC50c1wiLEFzc2lzdGFudCk7XG4gICAgICAgIHJlZyhcInB1YmxpY1NjcmlwdC9QYWdlU2NyaXB0LnRzXCIsUGFnZVNjcmlwdCk7XG4gICAgICAgIHJlZyhcInB1YmxpY1NjcmlwdC9TY3JlZW4udHNcIixTY3JlZW4pO1xuICAgICAgICByZWcoXCJ0ZW1wbGF0ZS90cmVuZExpc3QudHNcIix0cmVuZExpc3QpO1xuICAgICAgICByZWcoXCJzY3JpcHQvQ2FyZC50c1wiLENhcmQpO1xuICAgICAgICByZWcoXCJzY3JpcHQvZ3JhbmRQcml4LnRzXCIsZ3JhbmRQcml4KTtcbiAgICAgICAgcmVnKFwicHVibGljU2NyaXB0L1BhZ2VOYXZTY3JpcHQudHNcIixQYWdlTmF2U2NyaXB0KTtcbiAgICAgICAgcmVnKFwidGVtcGxhdGUvcHJpeExpc3QudHNcIixwcml4TGlzdCk7XG4gICAgICAgIHJlZyhcInNjcmlwdC9HdWVzc2luZy50c1wiLEd1ZXNzaW5nKTtcbiAgICAgICAgcmVnKFwidGVtcGxhdGUvbnVtYmVyTGlzdERvbVNjcmlwdC50c1wiLG51bWJlckxpc3REb21TY3JpcHQpO1xuICAgICAgICByZWcoXCJzY3JpcHQvSG9tZS50c1wiLEhvbWUpO1xuICAgICAgICByZWcoXCJzY3JpcHQvbG9hZGluZ1NjZW5lLnRzXCIsbG9hZGluZ1NjZW5lKTtcbiAgICAgICAgcmVnKFwic2NyaXB0L3ByaUhpc3RvcnlTY2VuZS50c1wiLHByaUhpc3RvcnlTY2VuZSk7XG4gICAgICAgIHJlZyhcInRlbXBsYXRlL3ByaUhpc3RvcnkudHNcIixwcmlIaXN0b3J5KTtcbiAgICAgICAgcmVnKFwic2NyaXB0L1JlY29yZC50c1wiLFJlY29yZCk7XG4gICAgICAgIHJlZyhcInRlbXBsYXRlL2pvaW5SZWNvcmRzLnRzXCIsam9pblJlY29yZHMpO1xuICAgICAgICByZWcoXCJ0ZW1wbGF0ZS9wcmV2aW91c1JlY29yZHMudHNcIixwcmV2aW91c1JlY29yZHMpO1xuICAgICAgICByZWcoXCJzY3JpcHQvc2hvcnRMaXN0ZWQudHNcIixzaG9ydExpc3RlZCk7XG4gICAgICAgIHJlZyhcInRlbXBsYXRlL3Nob3J0TGlzdGVkTGlzdC50c1wiLHNob3J0TGlzdGVkTGlzdCk7XG4gICAgICAgIHJlZyhcInRlbXBsYXRlL3Bzd0lucHV0LnRzXCIscHN3SW5wdXQpO1xuICAgICAgICByZWcoXCJ0ZW1wbGF0ZS9yYW5raW5nTGlzdC50c1wiLHJhbmtpbmdMaXN0KTtcbiAgICAgICAgcmVnKFwidGVtcGxhdGUvcmVjaGFyZ2VEaWFsb2cudHNcIixyZWNoYXJnZURpYWxvZyk7XG4gICAgICAgIHJlZyhcInZpZXcvcm9ja2V0RGlhbG9nLnRzXCIscm9ja2V0RGlhbG9nKTtcbiAgICAgICAgcmVnKFwidGVtcGxhdGUvdGlwRGlhbG9nLnRzXCIsdGlwRGlhbG9nKTtcbiAgICAgICAgcmVnKFwidGVtcGxhdGUvd2lubmluZ0xpc3QudHNcIix3aW5uaW5nTGlzdCk7XG4gICAgICAgIHJlZyhcInNjcmlwdC93aW5uaW5nLnRzXCIsd2lubmluZyk7XG4gICAgfVxufVxuR2FtZUNvbmZpZy5pbml0KCk7IiwiaW1wb3J0IEdhbWVDb25maWcgZnJvbSBcIi4vR2FtZUNvbmZpZ1wiO1xuaW1wb3J0IFJvY2tldERpYWxvZyBmcm9tIFwiLi92aWV3L3JvY2tldERpYWxvZ1wiO1xuaW1wb3J0IHsgbG9hZGluZ1Jlc0xpc3QgLCBsb2FkaW5nUmVzTGlzdDEgfSBmcm9tICcuL2xvYWRpbmdSZXNMaXN0J1xuaW1wb3J0IHsgU29ja2V0IH0gZnJvbSBcIi4vanMvc29ja2V0XCI7XG5pbXBvcnQgTG9hZGluZ1NjZW5lIGZyb20gXCIuL3NjcmlwdC9sb2FkaW5nU2NlbmVcIjtcblxuY2xhc3MgTWFpbiB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdMKgLy8g5Zyo5b6u5L+h5Lit77yM5aaC5p6c6Lez6L2s5Yiw5ri45oiP5LmL5YmN6aG16Z2i5L+u5pS55LqGaW5uZXJXZHRo5ZKMaW5uZXJIZWlnaHTvvIzkvJrlr7zoh7Tlrr3pq5jorqHnrpfplJnor69cbsKgwqDCoMKgwqDCoMKgwqBjb25zdCB3aW46IGFueSA9IHdpbmRvdztcbsKgwqDCoMKgwqDCoMKgwqB3aW4uaW5uZXJXaWR0aCA9IHdpbi5vdXRlcldpZHRoO1xuwqDCoMKgwqDCoMKgwqDCoHdpbi5pbm5lckhlaWdodCA9IHdpbi5vdXRlckhlaWdodDtcblx0XHQvL+agueaNrklEReiuvue9ruWIneWni+WMluW8leaTjlx0XHRcblx0XHRpZiAod2luZG93W1wiTGF5YTNEXCJdKSBMYXlhM0QuaW5pdChHYW1lQ29uZmlnLndpZHRoLCBHYW1lQ29uZmlnLmhlaWdodCk7XG5cdFx0ZWxzZSBMYXlhLmluaXQoR2FtZUNvbmZpZy53aWR0aCwgR2FtZUNvbmZpZy5oZWlnaHQsIExheWFbXCJXZWJHTFwiXSk7XG5cdFx0TGF5YVtcIlBoeXNpY3NcIl0gJiYgTGF5YVtcIlBoeXNpY3NcIl0uZW5hYmxlKCk7XG5cdFx0TGF5YVtcIkRlYnVnUGFuZWxcIl0gJiYgTGF5YVtcIkRlYnVnUGFuZWxcIl0uZW5hYmxlKCk7XG5cdFx0TGF5YS5zdGFnZS5zY2FsZU1vZGUgPSBHYW1lQ29uZmlnLnNjYWxlTW9kZTtcblx0XHRMYXlhLnN0YWdlLnNjcmVlbk1vZGUgPSBHYW1lQ29uZmlnLnNjcmVlbk1vZGU7XG5cdFx0TGF5YS5zdGFnZS5iZ0NvbG9yID0gJyM0OTU1ZGQnO1xuXHRcdC8v5YW85a655b6u5L+h5LiN5pSv5oyB5Yqg6L29c2NlbmXlkI7nvIDlnLrmma9cblx0XHRMYXlhLlVSTC5leHBvcnRTY2VuZVRvSnNvbiA9IEdhbWVDb25maWcuZXhwb3J0U2NlbmVUb0pzb247XG5cblx0XHQvL+aJk+W8gOiwg+ivlemdouadv++8iOmAmui/h0lEReiuvue9ruiwg+ivleaooeW8j++8jOaIluiAhXVybOWcsOWdgOWinuWKoGRlYnVnPXRydWXlj4LmlbDvvIzlnYflj6/miZPlvIDosIPor5XpnaLmnb/vvIlcblx0XHRpZiAoR2FtZUNvbmZpZy5kZWJ1ZyB8fCBMYXlhLlV0aWxzLmdldFF1ZXJ5U3RyaW5nKFwiZGVidWdcIikgPT0gXCJ0cnVlXCIpIExheWEuZW5hYmxlRGVidWdQYW5lbCgpO1xuXHRcdGlmIChHYW1lQ29uZmlnLnBoeXNpY3NEZWJ1ZyAmJiBMYXlhW1wiUGh5c2ljc0RlYnVnRHJhd1wiXSkgTGF5YVtcIlBoeXNpY3NEZWJ1Z0RyYXdcIl0uZW5hYmxlKCk7XG5cdFx0aWYgKEdhbWVDb25maWcuc3RhdCkgTGF5YS5TdGF0LnNob3coKTtcblx0XHRMYXlhLmFsZXJ0R2xvYmFsRXJyb3IgPSB0cnVlO1xuXG5cdFx0Ly/oh6rlrprkuYnkuovku7Zcblx0XHRSb2NrZXREaWFsb2cuaW5pdCgpOyAvL+eBq+eureW8gOWlluaViOaenFxuXG5cdFx0Ly/mv4DmtLvotYTmupDniYjmnKzmjqfliLbvvIx2ZXJzaW9uLmpzb27nlLFJREXlj5HluIPlip/og73oh6rliqjnlJ/miJDvvIzlpoLmnpzmsqHmnInkuZ/kuI3lvbHlk43lkI7nu63mtYHnqItcblx0XHRMYXlhLlJlc291cmNlVmVyc2lvbi5lbmFibGUoXCJ2ZXJzaW9uLmpzb25cIiwgTGF5YS5IYW5kbGVyLmNyZWF0ZSh0aGlzLCB0aGlzLm9uVmVyc2lvbkxvYWRlZCksIExheWEuUmVzb3VyY2VWZXJzaW9uLkZJTEVOQU1FX1ZFUlNJT04pO1xuXHR9XG5cblx0b25WZXJzaW9uTG9hZGVkKCk6IHZvaWQge1xuXHRcdC8v5r+A5rS75aSn5bCP5Zu+5pig5bCE77yM5Yqg6L295bCP5Zu+55qE5pe25YCZ77yM5aaC5p6c5Y+R546w5bCP5Zu+5Zyo5aSn5Zu+5ZCI6ZuG6YeM6Z2i77yM5YiZ5LyY5YWI5Yqg6L295aSn5Zu+5ZCI6ZuG77yM6ICM5LiN5piv5bCP5Zu+XG5cdFx0TGF5YS5BdGxhc0luZm9NYW5hZ2VyLmVuYWJsZShcImZpbGVjb25maWcuanNvblwiLCBMYXlhLkhhbmRsZXIuY3JlYXRlKHRoaXMsIHRoaXMub25Db25maWdMb2FkZWQpKTtcblx0fVxuXG5cdG9uQ29uZmlnTG9hZGVkKCk6IHZvaWQge1xuXHRcdC8vIOi/nuaOpXdlYnNvY2tldFxuXHRcdFNvY2tldC5jcmVhdGVTb2NrZXQoKVxuXHRcdExheWEuU2NlbmUub3BlbihHYW1lQ29uZmlnLnN0YXJ0U2NlbmUsdHJ1ZSxudWxsLExheWEuSGFuZGxlci5jcmVhdGUodGhpcyx0aGlzLm9uTG9hZGluZ1NjZW5lT3BlbmVkKSlcblx0fVxuXHRvbkxvYWRpbmdTY2VuZU9wZW5lZChsb2FkaW5nU2NlbmU6TG9hZGluZ1NjZW5lKTogdm9pZCB7XG5cdFx0Ly/pooTliqDovb1cbsKgwqDCoMKgwqDCoMKgwqBMYXlhLmxvYWRlci5sb2FkKGxvYWRpbmdSZXNMaXN0LCBcblx0XHRcdExheWEuSGFuZGxlci5jcmVhdGUodGhpcywgdGhpcy5vbkdhbWVSZXNMb2FkZWQpLFxuXHRcdFx0TGF5YS5IYW5kbGVyLmNyZWF0ZSh0aGlzLHRoaXMub25HYW1lUmVzTG9hZFByb2dyZXNzLFtsb2FkaW5nU2NlbmVdLGZhbHNlKSk7XG5cdH1cblxuXHRvbkdhbWVSZXNMb2FkUHJvZ3Jlc3MobG9hZGluZ1NjZW5lOkxvYWRpbmdTY2VuZSxwcm9ncmVzczpudW1iZXIpe1xuXHRcdGNvbnNvbGUubG9nKGxvYWRpbmdTY2VuZSk7XG5cdFx0XG5cdFx0bG9hZGluZ1NjZW5lLnNldFByb2dyZXNzKHByb2dyZXNzKVxuXHR9XG5cblx0b25HYW1lUmVzTG9hZGVkKCk6dm9pZCB7XG5cdFx0Ly/liqDovb1JREXmjIflrprnmoTlnLrmma9cblx0XHRMYXlhLlNjZW5lLm9wZW4oJ2hvbWUuc2NlbmUnLHRydWUsbnVsbCxMYXlhLkhhbmRsZXIuY3JlYXRlKHRoaXMsKCgpPT57XG5cdFx0XHRMYXlhLmxvYWRlci5sb2FkKGxvYWRpbmdSZXNMaXN0MSk7XG5cdFx0fSkpKTtcblx0fVxufVxuLy/mv4DmtLvlkK/liqjnsbtcbm5ldyBNYWluKCk7XG4iLCIvKipcbiAqIEBhdXRob3IgW1Npd2VuXVxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjAgMTQ6MTE6MjZcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTIwIDE0OjExOjI2XG4gKiBAZGVzYyDmlbDmja7pgJrkv6Hlj4rkv53lrZjmjqXlj6NcbiAqL1xuXG5leHBvcnQgY2xhc3MgR2FtZU1vZGVsIGV4dGVuZHMgTGF5YS5FdmVudERpc3BhdGNoZXIge1xuICAgIHByaXZhdGUgc3RhdGljIF9nYW1lTW9kZWxJbnN0YW5jZTogR2FtZU1vZGVsO1xuXG4gICAgc3RhdGljIGdldEluc3RhbmNlKCk6IEdhbWVNb2RlbCB7XG4gICAgICAgIGlmICghdGhpcy5fZ2FtZU1vZGVsSW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHRoaXMuX2dhbWVNb2RlbEluc3RhbmNlID0gbmV3IEdhbWVNb2RlbCgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9nYW1lTW9kZWxJbnN0YW5jZTtcbiAgICB9XG5cbiAgICAvKirkv53lrZjnlKjmiLfkv6Hmga8gKi9cbiAgICB1c2VySW5mbzpvYmplY3QgPSB7fTsgLy/nlKjmiLfkv6Hmga9cbiAgICBzZXRVc2VySW5mbyh1c2VySW5mbzpvYmplY3Qpe1xuICAgICAgICB0aGlzLnVzZXJJbmZvID0gdXNlckluZm87XG4gICAgICAgIHRoaXMuZXZlbnQoJ2dldFVzZXJJbmZvJyx0aGlzLnVzZXJJbmZvKVxuICAgIH1cblxuICAgIC8qKuS/neWtmOiiq+i0reS5sOWPt+eggSAqL1xuICAgIGJ1eUdvb2RzQXJyOmFueSA9IFtdOyAvL+iiq+i0reS5sOWPt+eggVxuICAgIHNldEdvb2RzQXJyKGdvb2RzQXJyOmFueSkge1xuICAgICAgICB0aGlzLmJ1eUdvb2RzQXJyID0gZ29vZHNBcnI7XG4gICAgICAgIHRoaXMuZXZlbnQoJ2dldGJ1eUdvb2RzQXJyJyxbdGhpcy5idXlHb29kc0Fycl0pXG4gICAgfVxuXG4gICAgLyoq5L+d5a2Y54Gr566t5pWw5o2uICovXG4gICAgcm9ja2V0RGF0YTpPYmplY3QgPSB7fTtcbiAgICBzZXRSb2NrZXREYXRhKGRhdGE6b2JqZWN0KXtcbiAgICAgICAgdGhpcy5yb2NrZXREYXRhID0gZGF0YTtcbiAgICAgICAgdGhpcy5ldmVudCgnZ2V0Um9ja2V0RGF0YScsdGhpcy5yb2NrZXREYXRhKVxuICAgIH1cblxuICAgIC8qKuaYr+WQpuW8gOWlluS6hiAqL1xuICAgIGlzVG9nZ2xlKHN0YXR1czpib29sZWFuKXtcbiAgICAgICAgdGhpcy5ldmVudCgnaXNUb2dnbGUnLHN0YXR1cylcbiAgICB9XG5cbiAgICAvKirpgJrnn6XkuK3lpZYgKi9cbiAgICBub3RpY2VGdW5jKHN0YXR1czpib29sZWFuKXtcbiAgICAgICAgdGhpcy5ldmVudCgnZ2V0Tm90aWNlJyxzdGF0dXMpXG4gICAgfVxuICAgIFxuICAgIC8qKueBq+eureWkp+WlluaOkuihjOWQjeWNlSAqL1xuICAgIHJvY2tldFJhbmtpbmc6b2JqZWN0W10gPSBbXTtcbiAgICBzZXRSb2NrZXRSYW5raW5nKGRhdGE6b2JqZWN0W10pe1xuICAgICAgICB0aGlzLnJvY2tldFJhbmtpbmcgPSBkYXRhO1xuICAgICAgICB0aGlzLmV2ZW50KCdnZXRSb2NrZXRSYW5raW5nJyxbdGhpcy5yb2NrZXRSYW5raW5nXSlcbiAgICB9XG59IiwiLyoqXG4gKiBAYXV0aG9yIFtTaXdlbl1cbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTIwIDE1OjE1OjA4XG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yMCAxNToxNTowOFxuICogQGRlc2MgYXBp5o6l5Y+j57uf5LiA5bCB6KOF5aSE55CGXG4gKi9cblxuaW1wb3J0IHsgZ2V0LCBwb3N0IH0gZnJvbSAnLi9odHRwJztcbmltcG9ydCB7IEdhbWVNb2RlbCB9IGZyb20gJy4vR2FtZU1vZGVsJztcblxuZXhwb3J0IGRlZmF1bHQge1xuICAgIC8qKuiOt+WPlueUqOaIt+S/oeaBryAqL1xuICAgIGdldFVzZXJJbmZvKCkge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgZ2V0KCcvdXNlci9nZXRJbmZvJywge30pLnRoZW4oKHJlczogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyDkv53lrZjnlKjmiLfkv6Hmga9cbiAgICAgICAgICAgICAgICAgICAgR2FtZU1vZGVsLmdldEluc3RhbmNlKCkuc2V0VXNlckluZm8ocmVzLnVzZXJJbmZvKVxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlcylcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5zZXRVc2VySW5mbyh7fSlcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlcylcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH0sXG5cbiAgICAvKirojrflj5bku4rml6XlpKflpZbmsaAgKi9cbiAgICBnZXRSYW5rVG9kYXkoKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBnZXQoJy9yYW5rL3RvZGF5Jywge30pLnRoZW4oKHJlczogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlcylcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfSxcbiAgICAvKirojrflj5blpKflpZbmsaDljoblj7LorrDlvZVcbiAgICAgKiBAcGFyYW0gY291bnRUaW1lIFvpgInloatdIOaXpeacn1xuICAgICAqL1xuICAgIGdldFJhbmtIaXN0b3J5KGNvdW50VGltZT86c3RyaW5nKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGdldCgnL3JhbmsvaGlzdG9yeScsIHtjb3VudFRpbWV9KS50aGVuKChyZXM6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghcmVzLmNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXMpXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlcylcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH0sXG4gICAgLyoq6I635Y+W6aaW6aG15ZWG5ZOB5YiX6KGoICovXG4gICAgZ2V0R29vZHNMaXN0KCkge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgZ2V0KCcvZ29vZHMvaW5kZXgnLCB7fSkudGhlbigocmVzOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXJlcy5jb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXMpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9LFxuXG4gICAgLyoq6I635Y+W5ZWG5ZOB6K+m5oOFXG4gICAgICogQHBhcmFtIGdvb2RzSWQg5ZWG5ZOBaWRcbiAgICAgKi9cbiAgICBnZXRHb29kc0RldGFpbHMoZ29vZHNJZDpzdHJpbmcpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBnZXQoJy9nb29kcy9nZXQnLCB7IGdvb2RzSWQgfSkudGhlbigocmVzOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXJlcy5jb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXMpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9LFxuXG4gICAgLyoq6I635Y+W5Y+C5LiO6K6w5b2VXG4gICAgICogQHBhcmFtIHBhZ2UgW+mAieWhq10g6aG156CBMVxuICAgICAqIEBwYXJhbSBwYWdlU2l6ZSAgW+mAieWhq10g5YiG6aG15pWwIOm7mOiupDIwXG4gICAgICovXG4gICAgZ2V0TXlPcmRlcnMocGFnZTpudW1iZXIgPSAxLHBhZ2VTaXplOm51bWJlciA9IDIwKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgZ2V0KCcvb3JkZXIvbXlPcmRlcnMnLHtwYWdlLHBhZ2VTaXplfSkudGhlbigocmVzOmFueSk9PntcbiAgICAgICAgICAgICAgICBpZiAoIXJlcy5jb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXMpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9LFxuICAgIFxuICAgIC8qKuiOt+WPluW+gOacn+iusOW9lVxuICAgICAqIEBwYXJhbSBwYWdlIFvpgInloatdIOmhteeggTFcbiAgICAgKiBAcGFyYW0gcGFnZVNpemUgIFvpgInloatdIOWIhumhteaVsCDpu5jorqQyMFxuICAgICAqIEBwYXJhbSBjb3VudFRpbWUgW+mAieWhq10g5p+l6K+i5pe26Ze0XG4gICAgICogQHBhcmFtIHNlYXJjaEtleSBb6YCJ5aGrXSDmn6Xor6LmnJ/lj7dcbiAgICAgKi9cbiAgICBnZXRHb29kc0hpc3RvcnkocGFnZTpudW1iZXIgPSAxLHBhZ2VTaXplOm51bWJlciA9IDIwLGNvdW50VGltZT86c3RyaW5nLHNlYXJjaEtleT86c3RyaW5nKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgZ2V0KCcvZ29vZHMvaGlzdG9yeScse3BhZ2UscGFnZVNpemUsY291bnRUaW1lLHNlYXJjaEtleX0pLnRoZW4oKHJlczphbnkpPT57XG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlcylcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfSxcblxuICAgIC8qKuiOt+WPluWVhuWTgeexu+WeiyAqL1xuICAgIGdldEdvb2RzQ2F0ZUxpc3QoKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIGdldCgnL2dvb2RzL2NhdGVMaXN0Jyx7fSkudGhlbigocmVzOmFueSk9PntcbiAgICAgICAgICAgICAgICBpZiAoIXJlcy5jb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXMpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9LFxuXG4gICAgLyoq6I635Y+W6LWw5Yq/XG4gICAgICogQHBhcmFtIGdvb2RzVHlwZSDllYblk4HnsbvlnotcbiAgICAgKiBAcGFyYW0gcGFnZSBb6YCJ5aGrXSDpobXnoIExXG4gICAgICogQHBhcmFtIHBhZ2VTaXplIFvpgInloatdIOWIhumhteaVsCDpu5jorqQyMFxuICAgICAqL1xuICAgIGdldEdvb2RzVHJlbmQoZ29vZHNUeXBlOnN0cmluZyxwYWdlOm51bWJlciA9IDEscGFnZVNpemU6bnVtYmVyID0gMjApe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgZ2V0KCcvZ29vZHMvdHJlbmQnLHtnb29kc1R5cGUscGFnZSxwYWdlU2l6ZX0pLnRoZW4oKHJlczphbnkpPT57XG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuY29kZSkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlcylcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfSxcblxuICAgIC8qKuiOt+WPluWWnOS7juWkqemZjeS4reWlluWQjeWNlVxuICAgICAqIEBwYXJhbSBwYWdlIFvpgInloatdIOmhteeggTFcbiAgICAgKiBAcGFyYW0gcGFnZVNpemUgIFvpgInloatdIOWIhumhteaVsCDpu5jorqQyMFxuICAgICAqL1xuICAgIGdldFhjdGpMaXN0KHBhZ2U6bnVtYmVyID0gMSxwYWdlU2l6ZTpudW1iZXIgPSAyMCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpID0+IHtcbiAgICAgICAgICAgIGdldCgnL1hjdGovYm9udXNMaXN0cycse3BhZ2UscGFnZVNpemV9KS50aGVuKChyZXM6YW55KT0+e1xuICAgICAgICAgICAgICAgIGlmICghcmVzLmNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXMpXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlcylcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH0sXG4gICAgXG4gICAgLyoq6I635Y+W5YWl5Zu05ZCN5Y2VXG4gICAgICogQHBhcmFtIHBhZ2UgW+mAieWhq10g6aG156CBMVxuICAgICAqIEBwYXJhbSBwYWdlU2l6ZSAgW+mAieWhq10g5YiG6aG15pWwIOm7mOiupDIwXG4gICAgICogQHBhcmFtIGRhdGUgW+mAieWhq10g5pe26Ze0XG4gICAgICovXG4gICAgZ2V0U2hvcnRMaXN0ZWQocGFnZTpudW1iZXIgPSAxLHBhZ2VTaXplOm51bWJlciA9IDIwLGRhdGU/OnN0cmluZyl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpID0+IHtcbiAgICAgICAgICAgIGdldCgnL1hjdGovc2hvcnRMaXN0ZWQnLHtwYWdlLHBhZ2VTaXplLGRhdGV9KS50aGVuKChyZXM6YW55KT0+e1xuICAgICAgICAgICAgICAgIGlmICghcmVzLmNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXMpXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlcylcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH0sXG5cbiAgICAvKirotK3kubBcbiAgICAgKiBAcGFyYW0gcGVyaW9kIOacn+WPt1xuICAgICAqIEBwYXJhbSBjb2RlTGlzdCDmiYDpgInlj7fnoIFcbiAgICAgKiBAcGFyYW0gZXhjaGFuZ2VQd2Qg5Lqk5piT5a+G56CBXG4gICAgICovXG4gICAgcG9zdFRyYWRlQnV5KHBlcmlvZDpzdHJpbmcsY29kZUxpc3Q6c3RyaW5nLGV4Y2hhbmdlUHdkOnN0cmluZyl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpID0+IHtcbiAgICAgICAgICAgIHBvc3QoJy90cmFkZS9idXknLCB7IHBlcmlvZCxjb2RlTGlzdCxleGNoYW5nZVB3ZCB9KS50aGVuKChyZXM6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghcmVzLmNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5nZXRVc2VySW5mbygpXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXMpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9LFxufSIsIi8qKlxuICogQGF1dGhvciBbU2l3ZW5dXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0NTowNlxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDU6MDZcbiAqIEBkZXNjIGF4aW9z572R57uc6K+35rGC5bCB6KOFXG4gKi9cbmltcG9ydCBheGlvcyBmcm9tIFwiYXhpb3NcIjtcblxuYXhpb3MuZGVmYXVsdHMudGltZW91dCA9IDEwMDAwO1xuYXhpb3MuZGVmYXVsdHMuaGVhZGVycy5wb3N0WydDb250ZW50LVR5cGUnXSA9ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnO1xuYXhpb3MuZGVmYXVsdHMud2l0aENyZWRlbnRpYWxzID0gdHJ1ZTsgIC8v6K+35rGC5pC65bimY29va2llXG4vLyBheGlvcy5kZWZhdWx0cy5jcm9zc0RvbWFpbiA9IHRydWU7ICAvL+ivt+axguaQuuW4pumineWkluaVsOaNrijkuI3ljIXlkKtjb29raWUpXG5cbmNvbnN0IGRvbWFpbiA9IGRvY3VtZW50LmRvbWFpbjtcbmlmIChkb21haW4uaW5kZXhPZigndC1jZW50ZXInKSA+PSAwIHx8IGRvbWFpbiA9PT0gJ2xvY2FsaG9zdCcpIHtcbiAgYXhpb3MuZGVmYXVsdHMuYmFzZVVSTCA9ICdodHRwczovL3QtYXBpLnh5aGouaW8vdjEvdy96aC8nXG4gIC8vIGF4aW9zLmRlZmF1bHRzLmJhc2VVUkwgPSAnaHR0cHM6Ly9nYW1lLnh5aGouaW8vdjEvdy96aCdcbn0gZWxzZSB7XG4gIGF4aW9zLmRlZmF1bHRzLmJhc2VVUkwgPSAnaHR0cHM6Ly9nYW1lLnh5aGouaW8vdjEvdy96aCdcbn1cblxuLyoq5bCGcG9zdOaVsOaNrui9rOS4umZvcm1EYXRh5qC85byPICovXG5mdW5jdGlvbiBmb3JtRGF0YUZ1bmMocGFyYW1zOk9iamVjdCkge1xuICBjb25zdCBmb3JtID0gbmV3IEZvcm1EYXRhKCk7XG4gIGZvciAoY29uc3Qga2V5IGluIHBhcmFtcykge1xuICAgIGZvcm0uYXBwZW5kKGtleSxwYXJhbXNba2V5XSk7XG4gIH1cbiAgcmV0dXJuIGZvcm1cbn1cblxuLyoq5ri45oiP5bmz5Y+w5o6l5Y+jICovXG5jb25zdCBnYW1lQ2VudGVyID0gWycvdXNlci9sb2dpbicsJy91c2VyL2dldEluZm8nXVxuXG4vL2h0dHAgcmVxdWVzdCDmi6bmiKrlmahcbmF4aW9zLmludGVyY2VwdG9ycy5yZXF1ZXN0LnVzZShcbiAgY29uZmlnID0+IHtcbiAgICAvL+iuvue9rkFIb3N0XG4gICAgaWYgKGNvbmZpZy51cmwuaW5kZXhPZignL3VzZXIvJykgPj0gMCApIHtcbiAgICAgIGNvbmZpZy5oZWFkZXJzWydBSG9zdCddID0gJ2dhbWVDZW50ZXInXG4gICAgfWVsc2V7XG4gICAgICBjb25maWcuaGVhZGVyc1snQUhvc3QnXSA9ICdzdGFyUm9ja2V0JztcbiAgICB9XG5cbiAgICBpZiAoY29uZmlnLm1ldGhvZCA9PSAncG9zdCcpIHtcbiAgICAgIGNvbmZpZy5kYXRhID0gZm9ybURhdGFGdW5jKHtcbiAgICAgICAgLi4uY29uZmlnLmRhdGFcbiAgICAgIH0pXG4gICAgfWVsc2UgaWYoY29uZmlnLm1ldGhvZCA9PSAnZ2V0Jyl7XG4gICAgICBjb25maWcucGFyYW1zID0ge1xuICAgICAgICAuLi5jb25maWcucGFyYW1zLFxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY29uZmlnO1xuICB9LFxuICBlcnJvciA9PiB7XG4gICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGVycm9yKTtcbiAgfVxuKTtcbi8vaHR0cCByZXNwb25zZSDmi6bmiKrlmahcbmF4aW9zLmludGVyY2VwdG9ycy5yZXNwb25zZS51c2UoXG4gIHJlc3BvbnNlID0+IHtcbiAgICBpZiAoIXJlc3BvbnNlLmRhdGEuc3VjY2Vzcykge1xuICAgICAgLy/plJnor6/lpITnkIZcbiAgICB9XG4gICAgcmV0dXJuIHJlc3BvbnNlO1xuICB9LFxuICBlcnJvciA9PiB7XG4gICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGVycm9yKTtcbiAgfVxuKTtcblxuLyoqXG4gKiDlsIHoo4VnZXTmlrnms5VcbiAqIEBwYXJhbSB1cmxcbiAqIEBwYXJhbSBkYXRhXG4gKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldCh1cmw6c3RyaW5nLCBwYXJhbXM6T2JqZWN0KSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgYXhpb3MuZ2V0KHVybCwgeyBwYXJhbXMgfSkudGhlbihyZXNwb25zZSA9PiB7XG4gICAgICBpZiAoIXJlc3BvbnNlLmRhdGEuc3VjY2Vzcykge1xuICAgICAgICByZXNvbHZlKHJlc3BvbnNlLmRhdGEuZXJyb3IpO1xuICAgICAgfWVsc2Uge1xuICAgICAgICByZXNvbHZlKHJlc3BvbnNlLmRhdGEucGF5bG9hZCk7XG4gICAgICB9XG4gICAgfSkuY2F0Y2goZXJyID0+IHtcbiAgICAgIHJlamVjdChlcnIpO1xuICAgIH0pO1xuICB9KTtcbn1cblxuLyoqXG4gKiDlsIHoo4Vwb3N06K+35rGCXG4gKiBAcGFyYW0gdXJsXG4gKiBAcGFyYW0gZGF0YVxuICogQHJldHVybnMge1Byb21pc2V9XG4gKi9cblxuZXhwb3J0IGZ1bmN0aW9uIHBvc3QodXJsOnN0cmluZywgZGF0YTpPYmplY3QpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBheGlvcy5wb3N0KHVybCwgZGF0YSkudGhlbihcbiAgICAgIHJlc3BvbnNlID0+IHtcbiAgICAgICAgaWYgKCFyZXNwb25zZS5kYXRhLnN1Y2Nlc3MpIHtcbiAgICAgICAgICByZXNvbHZlKHJlc3BvbnNlLmRhdGEuZXJyb3IpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc29sdmUocmVzcG9uc2UuZGF0YS5wYXlsb2FkKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGVyciA9PiB7XG4gICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgfVxuICAgICk7XG4gIH0pO1xufVxuIiwiLyoqXG4gKiBAYXV0aG9yIFtTaXdlbl1cbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAzLTE1IDE0OjUyOjM0XG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMy0xNSAxNDo1MjozNFxuICogQGRlc2MgbGF5YeWFrOWFseW3peWFt+aWueazlVxuICovXG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgICBnZXRTY3JlZW4oKXtcbiAgICAgICAgY29uc3Qgc2NlbmVDb250YWluZXI6IExheWEuU3ByaXRlID0gTGF5YS5TY2VuZS5yb290IGFzIExheWEuU3ByaXRlO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNjZW5lQ29udGFpbmVyLm51bUNoaWxkcmVuOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGNoaWxkID0gc2NlbmVDb250YWluZXIuZ2V0Q2hpbGRBdChpKTtcbiAgICAgICAgICAgIGlmIChjaGlsZCBpbnN0YW5jZW9mIExheWEuU2NlbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2hpbGQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxufSIsImltcG9ydCB7IEdhbWVNb2RlbCB9IGZyb20gXCIuL0dhbWVNb2RlbFwiO1xuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XG5cblxuLyoqXG4gKiBAYXV0aG9yIFtTaXdlbl1cbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTIxIDExOjQ2OjE1XG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yMSAxMTo0NjoxNVxuICogQGRlc2Mgd2Vic29ja2V06L+e5o6lXG4gKi9cblxuLy97XCJhcHBJZFwiOlwibHVja3lyb2NrZXRcIixcImV2ZW50XCI6W3tcInRvZ2dsZVwiOjAsXCJ0eXBlXCI6XCJ0eXBlX3ZhbHVlXCIsXCJleHBpcmVUaW1lXCI6MH1dfVxuXG5leHBvcnQgY2xhc3MgU29ja2V0IGV4dGVuZHMgTGF5YS5VSUNvbXBvbmVudCB7XG4gICAgXG4gICAgc3RhdGljIFdTX1VSTDogc3RyaW5nID0gYHdzczovL3Qtd3NzLnh5aGouaW8vd3M/YXBwaWQ9bHVja3lyb2NrZXRBcHBgXG4gICAgc3RhdGljIFdTOiBhbnkgPSAnJztcbiAgICAvKiozMOenkuS4gOasoeW/g+i3syAqL1xuICAgIHN0YXRpYyBzZXRJbnRlcnZhbFdlc29ja2V0UHVzaDphbnkgPSBudWxsOyBcblxuICAgIC8qKuW7uueri+i/nuaOpSAqL1xuICAgIHN0YXRpYyBjcmVhdGVTb2NrZXQoKSB7XG4gICAgICAgIGNvbnN0IHVzZXJJbmZvOmFueSA9IEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLnVzZXJJbmZvO1xuICAgICAgICBpZiAodXNlckluZm8udXNlcklkKSB7XG4gICAgICAgICAgICBTb2NrZXQuV1NfVVJMID0gU29ja2V0LldTX1VSTCArIGAmdWlkPSR7dXNlckluZm8udXNlcklkfWBcbiAgICAgICAgfVxuICAgICAgICBpZiAoIVNvY2tldC5XUykge1xuICAgICAgICAgICAgLy8gU29ja2V0LldTLmNsb3NlKClcbiAgICAgICAgICAgIFNvY2tldC5XUyA9IG5ldyBXZWJTb2NrZXQoU29ja2V0LldTX1VSTClcbiAgICAgICAgICAgIFNvY2tldC5XUy5vbm9wZW4gPSBTb2NrZXQub25vcGVuV1M7XG4gICAgICAgICAgICBTb2NrZXQuV1Mub25tZXNzYWdlID0gU29ja2V0Lm9ubWVzc2FnZVdTO1xuICAgICAgICAgICAgU29ja2V0LldTLm9uZXJyb3IgPSBTb2NrZXQub25lcnJvcldTO1xuICAgICAgICAgICAgU29ja2V0LldTLm9uY2xvc2UgPSBTb2NrZXQub25jbG9zZVdTO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKuaJk+W8gFdT5LmL5ZCO5Y+R6YCB5b+D6LezICovXG4gICAgc3RhdGljIG9ub3BlbldTKCkge1xuICAgICAgICBTb2NrZXQuc2VuZFBpbmcoKTsgLy/lj5HpgIHlv4Pot7NcbiAgICB9XG4gICAgLyoq6L+e5o6l5aSx6LSl6YeN6L+eICovXG4gICAgc3RhdGljIG9uZXJyb3JXUygpIHtcbiAgICAgICAgU29ja2V0LldTLmNsb3NlKCk7XG4gICAgICAgIFNvY2tldC5jcmVhdGVTb2NrZXQoKTsgLy/ph43ov55cbiAgICB9XG4gICAgLyoqV1PmlbDmja7mjqXmlLbnu5/kuIDlpITnkIYgKi9cbiAgICBzdGF0aWMgb25tZXNzYWdlV1MoZTogYW55KSB7XG4gICAgICAgIGxldCByZWRhdGE6YW55O1xuICAgICAgICBsZXQgcGF5bG9hZDphbnk7XG4gICAgICAgIGlmIChlLmRhdGEgPT09ICdvaycgfHwgZS5kYXRhID09PSAncG9uZycpIHtcbiAgICAgICAgICAgIHJlZGF0YSA9IGUuZGF0YTsgLy8g5pWw5o2uXG4gICAgICAgIH1lbHNle1xuICAgICAgICAgICAgcmVkYXRhID0gSlNPTi5wYXJzZShlLmRhdGEpOyAvLyDmlbDmja5cbiAgICAgICAgICAgIHBheWxvYWQgPSByZWRhdGEucGF5bG9hZDtcbiAgICAgICAgICAgIC8vIOS4i+WPkei0reS5sOWPt+eggVxuICAgICAgICAgICAgaWYgKHBheWxvYWQudHlwZSA9PT0gJ3B1cmNoYXNlZCcpIHtcbiAgICAgICAgICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5zZXRHb29kc0FycihwYXlsb2FkLmdvb2RzKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8g5LiL5Y+R6aaW6aG15pWw5o2uXG4gICAgICAgICAgICBpZiAocGF5bG9hZC50eXBlID09PSAnaW5kZXgnKSB7XG4gICAgICAgICAgICAgICAgLy8g5Yi35paw54Gr566t5pWw5o2uXG4gICAgICAgICAgICAgICAgR2FtZU1vZGVsLmdldEluc3RhbmNlKCkuc2V0Um9ja2V0RGF0YShwYXlsb2FkLnJhbmtpbmcpXG4gICAgICAgICAgICAgICAgLy8g5piv5ZCm5byA5aWW5LqGXG4gICAgICAgICAgICAgICAgaWYgKHBheWxvYWQudG9nZ2xlKSB7XG4gICAgICAgICAgICAgICAgICAgIEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLmlzVG9nZ2xlKHRydWUpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8g5LiL5Y+R5Lit5aWW5ZCN5Y2VXG4gICAgICAgICAgICBpZiAocGF5bG9hZC50eXBlID09PSAnd2lubmluZycpIHtcbiAgICAgICAgICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5ub3RpY2VGdW5jKHRydWUpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyDkuIvlj5Hngavnrq3lpKflpZbmjpLooYzlkI3ljZVcbiAgICAgICAgICAgIGlmIChwYXlsb2FkLnR5cGUgPT09ICdyYW5raW5nJykge1xuICAgICAgICAgICAgICAgIEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLnNldFJvY2tldFJhbmtpbmcocGF5bG9hZC51c2VySW5mbylcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvKirlj5HpgIHmlbDmja4gKi9cbiAgICBzdGF0aWMgc2VuZFdTUHVzaCh0eXBlPzogYW55LHRvZ2dsZTphbnkgPSAxKSB7XG4gICAgICAgIGxldCBvYmogPSB7XG4gICAgICAgICAgICBcImFwcElkXCI6IFwibHVja3lyb2NrZXRBcHBcIiwgXG4gICAgICAgICAgICBcImV2ZW50XCI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFwidHlwZVwiOiB0eXBlLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ0b2dnbGVcIjogdG9nZ2xlLCBcbiAgICAgICAgICAgICAgICAgICAgXCJleHBpcmVUaW1lXCI6IDE4MDBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgICAgaWYgKFNvY2tldC5XUyAhPT0gbnVsbCAmJiBTb2NrZXQuV1MucmVhZHlTdGF0ZSA9PT0gMykge1xuICAgICAgICAgICAgU29ja2V0LldTLmNsb3NlKCk7XG4gICAgICAgICAgICBTb2NrZXQuY3JlYXRlU29ja2V0KCk7Ly/ph43ov55cbiAgICAgICAgfSBlbHNlIGlmKFNvY2tldC5XUy5yZWFkeVN0YXRlID09PSAxKSB7XG4gICAgICAgICAgICBTb2NrZXQuV1Muc2VuZChKU09OLnN0cmluZ2lmeShvYmopKVxuICAgICAgICB9ZWxzZSBpZihTb2NrZXQuV1MucmVhZHlTdGF0ZSA9PT0gMCl7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBTb2NrZXQuV1Muc2VuZChKU09OLnN0cmluZ2lmeShvYmopKVxuICAgICAgICAgICAgfSwgMjAwMCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoq5YWz6ZetV1MgKi9cbiAgICBzdGF0aWMgb25jbG9zZVdTKCkge1xuICAgICAgICBjb25zb2xlLmxvZygn5pat5byA6L+e5o6lJyk7XG4gICAgfVxuICAgIC8qKuWPkemAgeW/g+i3syAqL1xuICAgIHN0YXRpYyBzZW5kUGluZygpe1xuICAgICAgICBTb2NrZXQuV1Muc2VuZCgncGluZycpO1xuICAgICAgICBTb2NrZXQuc2V0SW50ZXJ2YWxXZXNvY2tldFB1c2ggPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICBTb2NrZXQuV1Muc2VuZCgncGluZycpO1xuICAgICAgICB9LCAzMDAwMClcbiAgICB9XG59XG5cbiIsIi8qKlxuICogQGF1dGhvciBbU2l3ZW5dXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0NToyOFxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDU6MjhcbiAqIEBkZXNjIOW3peWFt+WHveaVsOmbhuWQiFxuICovXG5leHBvcnQgZGVmYXVsdCB7XG4gICAgLyoqXG4gICAgICog5Y2D5YiG5L2N5qC85byP5YyWXG4gICAgICogQHBhcmFtIHtudW1iZXIgfCBzdHJpbmd9IG51bSDmoLzlvI/ljJbmlbDlrZdcbiAgICAgKi9cbiAgICBjb21kaWZ5KG51bTogYW55KSB7XG4gICAgICAgIHJldHVybiBudW0udG9TdHJpbmcoKS5yZXBsYWNlKC9cXGQrLywgZnVuY3Rpb24gKG4pIHsgLy8g5YWI5o+Q5Y+W5pW05pWw6YOo5YiGXG4gICAgICAgICAgICByZXR1cm4gbi5yZXBsYWNlKC8oXFxkKSg/PShcXGR7M30pKyQpL2csIGZ1bmN0aW9uICgkMSkgeyAvLyDlr7nmlbTmlbDpg6jliIbmt7vliqDliIbpmpTnrKZcbiAgICAgICAgICAgICAgICByZXR1cm4gJDEgKyBcIixcIjtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICog5aSN5Yi2XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNvcHlJbmZvIOWkjeWItuWGheWuuVxuICAgICAqL1xuICAgIENvcHkoY29weUluZm86IGFueSkge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgbGV0IGNvcHlVcmwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIik7IC8v5Yib5bu65LiA5LiqaW5wdXTmoYbojrflj5bpnIDopoHlpI3liLbnmoTmlofmnKzlhoXlrrlcbiAgICAgICAgICAgIGNvcHlVcmwudmFsdWUgPSBjb3B5SW5mbztcbiAgICAgICAgICAgIGxldCBhcHBEaXYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXBwJyk7XG4gICAgICAgICAgICBhcHBEaXYuYXBwZW5kQ2hpbGQoY29weVVybCk7XG4gICAgICAgICAgICBjb3B5VXJsLnNlbGVjdCgpO1xuICAgICAgICAgICAgZG9jdW1lbnQuZXhlY0NvbW1hbmQoXCJDb3B5XCIpO1xuICAgICAgICAgICAgY29weVVybC5yZW1vdmUoKVxuICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgfSlcbiAgICB9LFxuXG4gICAgLyoqIOWIpOaWreaYr+WQpuS4uuaJi+acuiovXG4gICAgaXNQaG9uZShudW06IGFueSkge1xuICAgICAgICB2YXIgcmVnID0gL14xWzM0NTY3ODldXFxkezl9JC87XG4gICAgICAgIHJldHVybiByZWcudGVzdChudW0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiDlgJLorqHml7ZcbiAgICAgKiBAcGFyYW0ge3N0cmluZyB8IG51bWJlcn0gdGltZXMg5Ymp5L2Z5q+r56eS5pWwIFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIOWbnuiwg+WHveaVsFxuICAgICAqL1xuICAgIGNvdW50RG93bih0aW1lczogYW55LCBjYWxsYmFjazogYW55KSB7XG4gICAgICAgIGxldCB0aW1lciA9IG51bGw7XG4gICAgICAgIHRpbWVyID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgaWYgKHRpbWVzID4gMCkge1xuICAgICAgICAgICAgICAgIGxldCBkYXk6IGFueSA9IE1hdGguZmxvb3IodGltZXMgLyAoNjAgKiA2MCAqIDI0KSk7XG4gICAgICAgICAgICAgICAgbGV0IGhvdXI6IGFueSA9IE1hdGguZmxvb3IodGltZXMgLyAoNjAgKiA2MCkpIC0gKGRheSAqIDI0KTtcbiAgICAgICAgICAgICAgICBsZXQgbWludXRlOiBhbnkgPSBNYXRoLmZsb29yKHRpbWVzIC8gNjApIC0gKGRheSAqIDI0ICogNjApIC0gKGhvdXIgKiA2MCk7XG4gICAgICAgICAgICAgICAgbGV0IHNlY29uZDogYW55ID0gTWF0aC5mbG9vcih0aW1lcykgLSAoZGF5ICogMjQgKiA2MCAqIDYwKSAtIChob3VyICogNjAgKiA2MCkgLSAobWludXRlICogNjApO1xuICAgICAgICAgICAgICAgIGRheSA9IGAke2RheSA8IDEwID8gJzAnIDogJyd9JHtkYXl9YDtcbiAgICAgICAgICAgICAgICBob3VyID0gYCR7aG91ciA8IDEwID8gJzAnIDogJyd9JHtob3VyfWA7XG4gICAgICAgICAgICAgICAgbWludXRlID0gYCR7bWludXRlIDwgMTAgPyAnMCcgOiAnJ30ke21pbnV0ZX1gO1xuICAgICAgICAgICAgICAgIHNlY29uZCA9IGAke3NlY29uZCA8IDEwID8gJzAnIDogJyd9JHtzZWNvbmR9YDtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhgJHtob3VyfToke21pbnV0ZX06JHtzZWNvbmR9YClcbiAgICAgICAgICAgICAgICB0aW1lcy0tO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHRpbWVyKTtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgMTAwMCk7XG4gICAgICAgIGlmICh0aW1lcyA8PSAwKSB7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKHRpbWVyKTtcbiAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIOWwhuagvOW8j+WMluaXpeacn+i9rOaNouaIkOaXtumXtOaIs1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBteURhdGUg5qC85byP5YyW5pel5pyfXG4gICAgICovXG4gICAgZm9ybWF0RGF0ZSh4OiBhbnksIHk6IGFueSkge1xuICAgICAgICBpZiAoISh4IGluc3RhbmNlb2YgRGF0ZSkpIHtcbiAgICAgICAgICAgIHZhciBkYXRlID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgIGRhdGUuc2V0VGltZSh4ICogMTAwMCk7XG4gICAgICAgICAgICB4ID0gZGF0ZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgeiA9IHtcbiAgICAgICAgICAgIHk6IHguZ2V0RnVsbFllYXIoKSxcbiAgICAgICAgICAgIE06IHguZ2V0TW9udGgoKSArIDEsXG4gICAgICAgICAgICBkOiB4LmdldERhdGUoKSxcbiAgICAgICAgICAgIGg6IHguZ2V0SG91cnMoKSxcbiAgICAgICAgICAgIG06IHguZ2V0TWludXRlcygpLFxuICAgICAgICAgICAgczogeC5nZXRTZWNvbmRzKClcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHkucmVwbGFjZSgvKHkrfE0rfGQrfGgrfG0rfHMrKS9nLCBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgcmV0dXJuICgodi5sZW5ndGggPiAxID8gXCIwXCIgOiBcIlwiKSArIGV2YWwoXCJ6LlwiICsgdi5zbGljZSgtMSkpKS5zbGljZShcbiAgICAgICAgICAgICAgICAtKHYubGVuZ3RoID4gMiA/IHYubGVuZ3RoIDogMilcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgLyoqXG4gICAqIOWwhuaXtumXtOaIs+i9rOaNouaIkOagvOW8j+WMluaXpeacn1xuICAgKiBAcGFyYW0ge3N0cmluZ30gdGltZVN0YW1wIOaXtumXtOaIs1xuICAgKi9cbiAgICBmb3JtYXREYXRlVGltZSh0aW1lU3RhbXApIHtcbiAgICAgICAgdmFyIGRhdGUgPSBuZXcgRGF0ZSgpO1xuICAgICAgICBkYXRlLnNldFRpbWUodGltZVN0YW1wICogMTAwMCk7XG4gICAgICAgIHZhciB5ID0gZGF0ZS5nZXRGdWxsWWVhcigpO1xuICAgICAgICB2YXIgbTpzdHJpbmcgfCBudW1iZXIgPSBkYXRlLmdldE1vbnRoKCkgKyAxO1xuICAgICAgICBtID0gbSA8IDEwID8gKCcwJyArIG0pIDogbTtcbiAgICAgICAgdmFyIGQ6c3RyaW5nIHwgbnVtYmVyID0gZGF0ZS5nZXREYXRlKCk7XG4gICAgICAgIGQgPSBkIDwgMTAgPyAoJzAnICsgZCkgOiBkO1xuICAgICAgICB2YXIgaDpzdHJpbmcgfCBudW1iZXIgPSBkYXRlLmdldEhvdXJzKCk7XG4gICAgICAgIGggPSBoIDwgMTAgPyAoJzAnICsgaCkgOiBoO1xuICAgICAgICB2YXIgbWludXRlOnN0cmluZyB8IG51bWJlciA9IGRhdGUuZ2V0TWludXRlcygpO1xuICAgICAgICB2YXIgc2Vjb25kOnN0cmluZyB8IG51bWJlciA9IGRhdGUuZ2V0U2Vjb25kcygpO1xuICAgICAgICBtaW51dGUgPSBtaW51dGUgPCAxMCA/ICgnMCcgKyBtaW51dGUpIDogbWludXRlO1xuICAgICAgICBzZWNvbmQgPSBzZWNvbmQgPCAxMCA/ICgnMCcgKyBzZWNvbmQpIDogc2Vjb25kO1xuICAgICAgICByZXR1cm4geSArICctJyArIG0gKyAnLScgKyBkICsgJyAnICsgaCArICc6JyArIG1pbnV0ZSArICc6JyArIHNlY29uZDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICog5L+d55WZbuS9jeWwj+aVsCAgXG4gICAgICogQHBhcmFtIHtzdHJpbmcgfCBudW1iZXJ9IGNudW0g6ZyA6KaB5L+d55WZ55qE5pWw5o2uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNpbmRleCDkv53nlZnnmoTlsI/mlbDkvY3mlbBcbiAgICAgKi9cbiAgICB0b0RlY2ltYWwoY251bTogYW55LCBjaW5kZXg6IGFueSkge1xuICAgICAgICBsZXQgdmFsdWUgPSBTdHJpbmcoY251bSk7XG4gICAgICAgIGlmICh2YWx1ZS5pbmRleE9mKFwiLlwiKSA+IDApIHtcbiAgICAgICAgICAgIHZhciBsZWZ0ID0gdmFsdWUuc3Vic3RyKDAsIHZhbHVlLmluZGV4T2YoXCIuXCIpKTtcbiAgICAgICAgICAgIHZhciByaWdodCA9IHZhbHVlLnN1YnN0cih2YWx1ZS5pbmRleE9mKFwiLlwiKSArIDEsIHZhbHVlLmxlbmd0aCk7XG4gICAgICAgICAgICBpZiAocmlnaHQubGVuZ3RoID4gY2luZGV4KSB7XG4gICAgICAgICAgICAgICAgcmlnaHQgPSByaWdodC5zdWJzdHIoMCwgY2luZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhbHVlID0gbGVmdCArIFwiLlwiICsgcmlnaHQ7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gY251bTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKirliqDms5Xov5DnrpcgKi9cbiAgICBhY2NBZGQoYXJnMSxhcmcyKXtcbiAgICAgICAgbGV0IHIxLHIyLG07XG4gICAgICAgIHRyeXtyMT1hcmcxLnRvU3RyaW5nKCkuc3BsaXQoXCIuXCIpWzFdLmxlbmd0aH1jYXRjaChlKXtyMT0wfVxuICAgICAgICB0cnl7cjI9YXJnMi50b1N0cmluZygpLnNwbGl0KFwiLlwiKVsxXS5sZW5ndGh9Y2F0Y2goZSl7cjI9MH1cbiAgICAgICAgbT1NYXRoLnBvdygxMCxNYXRoLm1heChyMSxyMikpXG4gICAgICAgIHJldHVybiAoYXJnMSptK2FyZzIqbSkvbVxuICAgIH0sXG4gICAgLyoq5YeP5rOV6L+Q566XICovXG4gICAgYWNjU3ViKGFyZzEsYXJnMil7XG4gICAgICAgIGxldCByMSxyMixtLG47XG4gICAgICAgIHRyeXtyMT1hcmcxLnRvU3RyaW5nKCkuc3BsaXQoXCIuXCIpWzFdLmxlbmd0aH1jYXRjaChlKXtyMT0wfVxuICAgICAgICB0cnl7cjI9YXJnMi50b1N0cmluZygpLnNwbGl0KFwiLlwiKVsxXS5sZW5ndGh9Y2F0Y2goZSl7cjI9MH1cbiAgICAgICAgbT1NYXRoLnBvdygxMCxNYXRoLm1heChyMSxyMikpO1xuICAgICAgICBuPShyMT49cjIpP3IxOnIyO1xuICAgICAgICByZXR1cm4gKChhcmcxKm0tYXJnMiptKS9tKS50b0ZpeGVkKG4pO1xuICAgIH0sXG4gICAgLyoq6Zmk5rOV6L+Q566XICovXG4gICAgYWNjRGl2KGFyZzEsYXJnMil7XG4gICAgICAgIGxldCB0MT0wLHQyPTAscjEscjI7XG4gICAgICAgIHRyeXt0MT1hcmcxLnRvU3RyaW5nKCkuc3BsaXQoXCIuXCIpWzFdLmxlbmd0aH1jYXRjaChlKXt9O1xuICAgICAgICB0cnl7dDI9YXJnMi50b1N0cmluZygpLnNwbGl0KFwiLlwiKVsxXS5sZW5ndGh9Y2F0Y2goZSl7fTtcbiAgICAgICAgcjE9TnVtYmVyKGFyZzEudG9TdHJpbmcoKS5yZXBsYWNlKFwiLlwiLFwiXCIpKVxuICAgICAgICByMj1OdW1iZXIoYXJnMi50b1N0cmluZygpLnJlcGxhY2UoXCIuXCIsXCJcIikpXG4gICAgICAgIHJldHVybiAocjEvcjIpKk1hdGgucG93KDEwLHQyLXQxKTtcbiAgICB9LFxuICAgIC8qKuS5mOazlei/kOeulyAqL1xuICAgIGFjY011bChhcmcxLGFyZzIpe1xuICAgICAgICBsZXQgbT0wLHMxPWFyZzEudG9TdHJpbmcoKSxzMj1hcmcyLnRvU3RyaW5nKCk7XG4gICAgICAgIHRyeXttKz1zMS5zcGxpdChcIi5cIilbMV0ubGVuZ3RofWNhdGNoKGUpe31cbiAgICAgICAgdHJ5e20rPXMyLnNwbGl0KFwiLlwiKVsxXS5sZW5ndGh9Y2F0Y2goZSl7fVxuICAgICAgICByZXR1cm4gTnVtYmVyKHMxLnJlcGxhY2UoXCIuXCIsXCJcIikpKk51bWJlcihzMi5yZXBsYWNlKFwiLlwiLFwiXCIpKS9NYXRoLnBvdygxMCxtKVxuICAgIH0sXG59XG4iLCIvKipcbiAqIEBhdXRob3IgW1Npd2VuXVxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjggMTE6Mjk6NDFcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTI4IDExOjI5OjQxXG4gKiBAZGVzYyDotYTmupDliJfooahcbiAqL1xuXG5cbi8vIOmmlumhtei1hOa6kFxuY29uc3QgY29tcCA9IFtcbiAgICB7IHVybDogXCJyZXMvYXRsYXMvY29tcC5hdGxhc1wiLCB0eXBlOiBcImF0bGFzXCIgfSxcblx0eyB1cmw6IFwicmVzL2F0bGFzL2NvbXAvaG9tZS5hdGxhc1wiLCB0eXBlOiBcImF0bGFzXCIgfSxcblx0eyB1cmw6IFwicmVzL2F0bGFzL2NvbXAvaG9tZS9maXJlLmF0bGFzXCIsIHR5cGU6IFwiYXRsYXNcIiB9LFxuXHR7IHVybDogXCJyZXMvYXRsYXMvY29tcC9ob21lL3dhdmUuYXRsYXNcIiwgdHlwZTogXCJhdGxhc1wiIH0sXG4gICAgeyB1cmw6IFwiY29tcC9pbWdfc3Rhcl9iZzAxLnBuZ1wiLCB0eXBlOiBcImltYWdlXCIgfSxcbl1cbmNvbnN0IHNjZW5lID0gW1xuICAgIHsgdXJsOiBcIkNhcmQuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxuICAgIHsgdXJsOiBcImhvbWUuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxuICAgIHsgdXJsOiBcIlRhYmJhci5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXG5dXG5leHBvcnQgY29uc3QgbG9hZGluZ1Jlc0xpc3QgPSBbXG4gICAgLi4uY29tcCxcbiAgICAuLi5zY2VuZVxuXVxuXG5cblxuLy/pppbpobXkuYvlkI7liqDovb1cbmNvbnN0IGNvbXAxID0gW1xuICAgIHsgdXJsOiBcImNvbXAvaW1nX3BheW1lbnRfYmcwMS5wbmdcIiwgdHlwZTogXCJpbWFnZVwiIH0sXG4gICAgeyB1cmw6IFwiY29tcC9pbWdfcmFua2xpc3RfYmcwMS5wbmdcIiwgdHlwZTogXCJpbWFnZVwiIH0sXG4gICAgeyB1cmw6IFwiY29tcC9pbWdfcm9ja2V0UmFua2luZ19iZzAxLnBuZ1wiLCB0eXBlOiBcImltYWdlXCIgfSxcbiAgICB7IHVybDogXCJjb21wL2ltZ19iYW5uZXIwMS5wbmdcIiwgdHlwZTogXCJpbWFnZVwiIH0sXG4gICAgeyB1cmw6IFwiY29tcC9pbWdfbXlyYW5rMDEucG5nXCIsIHR5cGU6IFwiaW1hZ2VcIiB9LFxuICAgIHsgdXJsOiBcImNvbXAvaW1nX3JhbmswMS5wbmdcIiwgdHlwZTogXCJpbWFnZVwiIH0sXG4gICAgeyB1cmw6IFwiY29tcC9pbWdfdHJlbmRfYmFubmVyMDEucG5nXCIsIHR5cGU6IFwiaW1hZ2VcIiB9LFxuICAgIHsgdXJsOiBcImNvbXAvaW1nX3hjdGpfYmcwMS5wbmdcIiwgdHlwZTogXCJpbWFnZVwiIH0sXG5dXG5jb25zdCBzY2VuZTEgPSBbXG4gICAgeyB1cmw6IFwidGVtcGxhdGUvc2hvd1JvY2tldC5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXG4gICAgeyB1cmw6IFwidGVtcGxhdGUvbnVtYmVyTGlzdERPTS5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXG4gICAgeyB1cmw6IFwidGVtcGxhdGUvSW5wdXRQd2REaWFsb2cuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxuICAgIHsgdXJsOiBcInRlbXBsYXRlL1RpcHNEaWFsb2cuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxuICAgIC8vIHsgdXJsOiBcInRlbXBsYXRlL3JlY2hhcmdlRGlhbG9nLmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcbiAgICB7IHVybDogXCJ0ZW1wbGF0ZS9qb2luUmVjb3Jkcy5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXG4gICAgeyB1cmw6IFwidGVtcGxhdGUvcHJldmlvdXNSZWNvcmRzLmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcbiAgICB7IHVybDogXCJ0ZW1wbGF0ZS9wcml4TGlzdC5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXG4gICAgeyB1cmw6IFwidGVtcGxhdGUvcHJpSGlzdG9yeS5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXG4gICAgeyB1cmw6IFwidGVtcGxhdGUvcmFua2luZ0xpc3QuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxuICAgIHsgdXJsOiBcInRlbXBsYXRlL3Nob3J0TGlzdC5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXG4gICAgeyB1cmw6IFwidGVtcGxhdGUvdHJlbmRMaXN0Lmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcbiAgICB7IHVybDogXCJ0ZW1wbGF0ZS93aW5uaW5nTGlzdC5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXG4gICAgeyB1cmw6IFwiZ3Vlc3NpbmcuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxuICAgIHsgdXJsOiBcInJlY29yZC5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXG4gICAgeyB1cmw6IFwiYXNzaXN0YW50Lmpzb25cIiwgdHlwZTogXCJqc29uXCIgfSxcbiAgICB7IHVybDogXCJncmFuZFByaXguanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxuICAgIHsgdXJsOiBcInByaUhpc3RvcnlTY2VuZS5qc29uXCIsIHR5cGU6IFwianNvblwiIH0sXG4gICAgeyB1cmw6IFwic2hvcnRMaXN0ZWQuanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxuICAgIHsgdXJsOiBcInhjdGouanNvblwiLCB0eXBlOiBcImpzb25cIiB9LFxuXVxuZXhwb3J0IGNvbnN0IGxvYWRpbmdSZXNMaXN0MSA9IFtcbiAgICAuLi5jb21wMSxcbiAgICAuLi5zY2VuZTFcbl1cbiIsIi8qKlxuICogQGF1dGhvciBbU2l3ZW5dXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0NTo0NlxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDU6NDZcbiAqIEBkZXNjIOmhtemdoui3s+i9rOiEmuacrO+8jOeUqOS6jue8lui+keaooeW8j+aPkuWFpVxuICovXG5pbXBvcnQgeyBUYWJiYXIgfSBmcm9tIFwiLi4vdmlldy9UYWJiYXJcIjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGFnZU5hdlNjcmlwdCBleHRlbmRzIExheWEuU2NyaXB0IHtcbiAgICAvKiogQHByb3Age25hbWU6bmF2UGFnZVNjcmlwdCx0aXBzOifopoHot7PovaznmoRzY2VuZScsdHlwZTpTdHJpbmcsZGVmYXVsdDonJ30gKi9cbiAgICBwdWJsaWMgbmF2UGFnZVNjcmlwdDpzdHJpbmcgPSAnJztcblxuICAgIGNvbnN0cnVjdG9yKCl7c3VwZXIoKX1cblxuICAgIG9uQ2xpY2soKTp2b2lkIHtcbiAgICAgICAgVGFiYmFyLmdldEluc3RhbmNlKCkub3BlblNjZW5lKHRoaXMubmF2UGFnZVNjcmlwdClcbiAgICB9XG59IiwiLyoqXG4gKiBAYXV0aG9yIFtTaXdlbl1cbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ2OjA4XG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0NjowOFxuICogQGRlc2Mg6aG16Z2i6Lez6L2s57G777yM5Zyo5Luj56CB5Lit5L2/55SoXG4gKi9cbmltcG9ydCB7IFRhYmJhciB9IGZyb20gJy4uL3ZpZXcvVGFiYmFyJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQYWdlU2NyaXB0IGV4dGVuZHMgTGF5YS5TY3JpcHQge1xuICAgIC8qKiBAcHJvcCB7bmFtZTpzaG93VGFiLHRpcHM6J+aYr+WQpuaciVRhYmJhcicsdHlwZTpCb29sLGRlZmF1bHQ6dHJ1ZX0gKi9cbiAgICBwdWJsaWMgc2hvd1RhYjpib29sZWFuID0gdHJ1ZTtcblxuICAgIGNvbnN0cnVjdG9yKCl7c3VwZXIoKTt9XG5cbiAgICBvbkVuYWJsZSgpOnZvaWQge1xuICAgICAgICBpZiAodGhpcy5zaG93VGFiKSB7XG4gICAgICAgICAgICBUYWJiYXIuc2hvdygpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBvbkRpc2FibGUoKTp2b2lkIHtcbiAgICAgICAgVGFiYmFyLmhpZGUoKVxuICAgIH1cbn0iLCIvKipcbiAqIEBhdXRob3IgW1Npd2VuXVxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDY6MzBcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ2OjMwXG4gKiBAZGVzYyDlsY/luZXoh6rpgILlupTohJrmnKxcbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU2NyZWVuIGV4dGVuZHMgTGF5YS5TY3JpcHQge1xuICAgIC8qKiBAcHJvcCB7bmFtZTpiZ0NvbG9yLHRpcHM6J+iDjOaZr+minOiJsicsJ3R5cGU6U3RyaW5nLGRlZmF1bHQ6JyMwYTA3MzgnfSAqL1xuICAgIHB1YmxpYyBiZ0NvbG9yOnN0cmluZyA9ICcjMGEwNzM4J1xuXG4gICAgY29uc3RydWN0b3IoKXtzdXBlcigpO31cblxuICAgIG9uRW5hYmxlKCk6dm9pZCB7XG4gICAgICAgTGF5YS5zdGFnZS5vbihMYXlhLkV2ZW50LlJFU0laRSx0aGlzLHRoaXMub25SZXNpemUpXG4gICAgICAgdGhpcy5vblJlc2l6ZSgpXG4gICAgfVxuXG4gICAgb25EaXNhYmxlKCk6dm9pZCB7XG4gICAgICAgIExheWEuc3RhZ2Uub2ZmKExheWEuRXZlbnQuUkVTSVpFLHRoaXMsdGhpcy5vblJlc2l6ZSlcbiAgICB9XG5cbiAgICBwcml2YXRlIG9uUmVzaXplKCk6dm9pZCB7XG4gICAgICAgIGNvbnN0IF90aGF0ID0gKHRoaXMub3duZXIgYXMgTGF5YS5TcHJpdGUpO1xuICAgICAgICBfdGhhdC53aWR0aCA9IExheWEuc3RhZ2Uud2lkdGg7XG4gICAgICAgIF90aGF0LmhlaWdodCA9IExheWEuc3RhZ2UuaGVpZ2h0O1xuICAgICAgICBfdGhhdC5ncmFwaGljcy5kcmF3UmVjdCgwLDAsTGF5YS5zdGFnZS53aWR0aCxMYXlhLnN0YWdlLmhlaWdodCx0aGlzLmJnQ29sb3IpO1xuICAgIH1cbn0iLCIvKipcbiAqIEBhdXRob3IgW1Npd2VuXVxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjEgMTY6MzQ6MjFcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTIxIDE2OjM0OjIxXG4gKiBAZGVzYyDliqnmiYvpobXpnaLohJrmnKxcbiAqL1xuXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcbmltcG9ydCBhcGkgZnJvbSBcIi4uL2pzL2FwaVwiO1xuaW1wb3J0IHsgVG9hc3QgfSBmcm9tIFwiLi4vdmlldy9Ub2FzdFwiO1xuaW1wb3J0IHNjcmVlblV0aWxzIGZyb20gXCIuLi9qcy9zY3JlZW5VdGlsc1wiO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFzc2lzdGFudCBleHRlbmRzIHVpLmFzc2lzdGFudFVJIHtcbiAgICBwcml2YXRlIGNhdGVMaXN0QXJyOmFueSA9IFtdO1xuICAgIHByaXZhdGUgc2VsZWN0R29vZHNUeXBlOnN0cmluZyA9ICcnO1xuICAgIHByaXZhdGUgdGFiVHlwZTpudW1iZXIgPSAxO1xuXG4gICAgc3RhdGljIHJlYWRvbmx5IEhBTEZfU0NST0xMX0VMQVNUSUNfRElTVEFOQ0U6IG51bWJlciA9IDEwMDtcbiAgICBwcml2YXRlIF9pc1Njcm9sbE92ZXJFbGFzdGljRGlzdGFuY2U6IGJvb2xlYW47XG4gICAgcHJpdmF0ZSBwYWdlOm51bWJlciA9IDE7XG4gICAgY29uc3RydWN0b3IoKXtcbiAgICAgICAgc3VwZXIoKVxuICAgICAgICB0aGlzLmJ0bl90cmVuZC5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy50YWJTd2l0Y2gsWzFdKVxuICAgICAgICB0aGlzLmJ0bl9wcmVidXkub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMudGFiU3dpdGNoLFsyXSlcbiAgICAgICAgdGhpcy5vbihMYXlhLkV2ZW50LlJFU0laRSx0aGlzLHRoaXMub25SZXNpemUpXG4gICAgfVxuXG4gICAgb25FbmFibGUoKTp2b2lkeyAgXG4gICAgICAgIHRoaXMuZ2V0R29vZHNDYXRlTGlzdCgpXG4gICAgICAgIHRoaXMuY2F0ZVN3aXRjaCgpXG5cbiAgICAgICAgLy/otbDlir/liIbmnpDmu5rliqjliqDovb3mm7TlpJpcbiAgICAgICAgdGhpcy50cmVuZExpc3Quc2Nyb2xsQmFyLmNoYW5nZUhhbmRsZXIgPSBMYXlhLkhhbmRsZXIuY3JlYXRlKHRoaXMsdGhpcy5vblRyZW5kTGlzdFNjcm9sbENoYW5nZSxudWxsLGZhbHNlKVxuICAgICAgICB0aGlzLnRyZW5kTGlzdC5zY3JvbGxCYXIub24oTGF5YS5FdmVudC5FTkQsIHRoaXMsIHRoaXMub25UcmVuZExpc3RTY3JvbGxFbmQpXG4gICAgfVxuICAgIFxuICAgIC8qKuiOt+WPluWVhuWTgeexu+WeiyAqL1xuICAgIHByaXZhdGUgZ2V0R29vZHNDYXRlTGlzdCgpe1xuICAgICAgICBhcGkuZ2V0R29vZHNDYXRlTGlzdCgpLnRoZW4oKHJlczphbnkpPT57XG4gICAgICAgICAgICB0aGlzLmNhdGVMaXN0QXJyID0gcmVzO1xuICAgICAgICAgICAgY29uc3QgR29vZHNOYW1lQXJyOnN0cmluZ1tdID0gW107XG4gICAgICAgICAgICByZXMuZm9yRWFjaCgoaXRlbTphbnkpPT57XG4gICAgICAgICAgICAgICAgR29vZHNOYW1lQXJyLnB1c2goaXRlbS5nb29kc05hbWUpXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgdGhpcy5jYXRlVGFiTGlzdC5yZXBlYXRYID0gR29vZHNOYW1lQXJyLmxlbmd0aDtcbiAgICAgICAgICAgIHRoaXMuY2F0ZVRhYkxpc3QuYXJyYXkgPSBHb29kc05hbWVBcnI7XG4gICAgICAgICAgICB0aGlzLmNhdGVUYWJMaXN0LnNlbGVjdGVkSW5kZXggPSAwO1xuICAgICAgICB9KS5jYXRjaCgoZXJyOmFueSk9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyci5tZXNzYWdlKTtcbiAgICAgICAgfSlcbiAgICB9XG5cblxuICAgIC8qKuiOt+WPlui1sOWKv+WIl+ihqCAqL1xuICAgIHByaXZhdGUgZ2V0R29vZHNUcmVuZChnb29kc1R5cGU6c3RyaW5nLHBhZ2UgPSAxKXtcbiAgICAgICAgYXBpLmdldEdvb2RzVHJlbmQoZ29vZHNUeXBlLHBhZ2UpLnRoZW4oKHJlczphbnkpPT57XG4gICAgICAgICAgICBpZiAodGhpcy50cmVuZExpc3QuYXJyYXkgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRyZW5kTGlzdC5hcnJheSA9IFsuLi50aGlzLnRyZW5kTGlzdC5hcnJheSwuLi5yZXNdXG4gICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICB0aGlzLnRyZW5kTGlzdC5hcnJheSA9IHJlcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLnRyZW5kTGlzdC5hcnJheS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50cmVuZExpc3QudmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkuY2F0Y2goKGVycjphbnkpPT57XG4gICAgICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyci5tZXNzYWdlKTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDliIfmjaLliJfooahcbiAgICAgKiBAcGFyYW0gdHlwZSAxOui1sOWKv+WIhuaekCAgMu+8mumihOi0rVxuICAgICAqL1xuICAgIHByaXZhdGUgdGFiU3dpdGNoKHR5cGU6bnVtYmVyKXtcbiAgICAgICAgaWYgKHNjcmVlblV0aWxzLmdldFNjcmVlbigpLm5hbWUgPT09ICdyZWNvcmQnICYmIHRoaXMudGFiVHlwZSA9PT0gdHlwZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudGFiVHlwZSA9IHR5cGU7XG4gICAgICAgIGlmICh0eXBlID09PSAyKSB7XG4gICAgICAgICAgICBUb2FzdC5zaG93KCfmmoLmnKrlvIDmlL7vvIzmlazor7fmnJ/lvoUnKVxuICAgICAgICB9XG4gICAgICAgIC8vIHRoaXMuY2F0ZVRhYkxpc3Quc2VsZWN0ZWRJbmRleCA9IDA7XG4gICAgICAgIC8vIGlmICh0aGlzLnRhYlR5cGUgPT09IDEpIHtcbiAgICAgICAgLy8gICAgIHRoaXMuYnRuX3RyZW5kLnNraW4gPSAnY29tcC9ndWVzc2luZy9pbWdfdGFiX2FjdGl2ZS5wbmcnO1xuICAgICAgICAvLyAgICAgdGhpcy5idG5fcHJlYnV5LnNraW4gPSAnY29tcC9ndWVzc2luZy9pbWdfdGFiLnBuZyc7XG4gICAgICAgIC8vICAgICB0aGlzLmxpc3RUaXRsZS52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgLy8gICAgIGlmICh0aGlzLnRyZW5kTGlzdC5hcnJheSA9PT0gbnVsbCB8fCB0aGlzLnRyZW5kTGlzdC5hcnJheS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgLy8gICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgLy8gICAgIH1lbHNlIHtcbiAgICAgICAgLy8gICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gZmFsc2U7XG4gICAgICAgIC8vICAgICAgICAgdGhpcy50cmVuZExpc3QudmlzaWJsZSA9IHRydWU7XG4gICAgICAgIC8vICAgICB9XG4gICAgICAgIC8vICAgICB0aGlzLnByZWJ1eS5zY3JvbGxUbygwKVxuICAgICAgICAvLyAgICAgdGhpcy5wcmVidXkudmlzaWJsZSA9IGZhbHNlO1xuICAgICAgICAvLyB9ZWxzZXtcbiAgICAgICAgLy8gICAgIHRoaXMuYnRuX3ByZWJ1eS5za2luID0gJ2NvbXAvZ3Vlc3NpbmcvaW1nX3RhYl9hY3RpdmUucG5nJztcbiAgICAgICAgLy8gICAgIHRoaXMuYnRuX3RyZW5kLnNraW4gPSAnY29tcC9ndWVzc2luZy9pbWdfdGFiLnBuZyc7XG4gICAgICAgIC8vICAgICB0aGlzLmxpc3RUaXRsZS52aXNpYmxlID0gZmFsc2U7XG4gICAgICAgIC8vICAgICBpZiAodGhpcy5wcmVidXkuYXJyYXkgPT09IG51bGwgfHwgdGhpcy5wcmVidXkuYXJyYXkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIC8vICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IHRydWU7XG4gICAgICAgIC8vICAgICB9ZWxzZSB7XG4gICAgICAgIC8vICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IGZhbHNlO1xuICAgICAgICAvLyAgICAgICAgIHRoaXMucHJlYnV5LnZpc2libGUgPSB0cnVlO1xuICAgICAgICAvLyAgICAgfVxuICAgICAgICAvLyAgICAgdGhpcy50cmVuZExpc3Quc2Nyb2xsVG8oMCk7XG4gICAgICAgIC8vICAgICB0aGlzLnRyZW5kTGlzdC52aXNpYmxlID0gZmFsc2U7XG4gICAgICAgIC8vIH1cbiAgICB9XG5cbiAgICAvKirllYblk4HnsbvlnovliIfmjaIgKi9cbiAgICBwcml2YXRlIGNhdGVTd2l0Y2goKXtcbiAgICAgICAgdGhpcy5jYXRlVGFiTGlzdC5zZWxlY3RIYW5kbGVyID0gbmV3IExheWEuSGFuZGxlcih0aGlzLCAoc2VsZWN0ZWRJbmRleDogYW55KT0+IHtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0R29vZHNUeXBlID0gdGhpcy5jYXRlTGlzdEFycltzZWxlY3RlZEluZGV4XS5nb29kc1R5cGU7XG4gICAgICAgICAgICBpZiAodGhpcy50YWJUeXBlID09PSAxKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50cmVuZExpc3QuYXJyYXkgPSBbXTtcbiAgICAgICAgICAgICAgICB0aGlzLnBhZ2UgPSAxO1xuICAgICAgICAgICAgICAgIHRoaXMuZ2V0R29vZHNUcmVuZCh0aGlzLnNlbGVjdEdvb2RzVHlwZSx0aGlzLnBhZ2UpXG4gICAgICAgICAgICB9ZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+aaguacquW8gOaUvicsdGhpcy5zZWxlY3RHb29kc1R5cGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy/mlLnlj5h0YWLpgInkuK3nirbmgIFcbiAgICAgICAgICAgIGxldCBpOiBudW1iZXIgPSB0aGlzLmNhdGVUYWJMaXN0LnN0YXJ0SW5kZXg7XG4gICAgICAgICAgICB0aGlzLmNhdGVUYWJMaXN0LmNlbGxzLmZvckVhY2goKGNlbGw6IExheWEuQnV0dG9uKSA9PiB7XG4gICAgICAgICAgICAgICAgY2VsbC5zZWxlY3RlZCA9IGkgPT09IHNlbGVjdGVkSW5kZXg7XG4gICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICAvKirnm5Hop4blsY/luZXlpKflsI/lj5jljJYgKi9cbiAgICBvblJlc2l6ZSgpe1xuICAgICAgICAvL+WIl+ihqOmrmOW6pumAgumFjSA9IOWxj+W5lemrmOW6piAtIChiYW5uZXIgKyB0YWJiYXIpXG4gICAgICAgIHRoaXMudHJlbmRMaXN0LmhlaWdodCA9IHRoaXMuaGVpZ2h0IC0gNjAwO1xuICAgICAgICBjb25zdCB0cmVuZE51bWJlciA9IHRoaXMudHJlbmRMaXN0LmhlaWdodCAvIDEwMDtcbiAgICAgICAgdGhpcy50cmVuZExpc3QucmVwZWF0WSA9IE1hdGguY2VpbCh0cmVuZE51bWJlcilcbiAgICAgICAgdGhpcy5wcmVidXkuaGVpZ2h0ID0gdGhpcy5oZWlnaHQgLSA2MDA7XG4gICAgICAgIGNvbnN0IHByZWJ1eU51bWJlciA9IHRoaXMucHJlYnV5LmhlaWdodCAvIDEwMDtcbiAgICAgICAgdGhpcy50cmVuZExpc3QucmVwZWF0WSA9IE1hdGguY2VpbChwcmVidXlOdW1iZXIpXG4gICAgfVxuXG4gICAgLyoq5Y+C5LiO6K6w5b2V5YiX6KGo5rua5YqoICovXG4gICAgcHJpdmF0ZSBvblRyZW5kTGlzdFNjcm9sbENoYW5nZSh2OmFueSkge1xuICAgICAgICBpZiAodiA+IHRoaXMudHJlbmRMaXN0LnNjcm9sbEJhci5tYXggKyBBc3Npc3RhbnQuSEFMRl9TQ1JPTExfRUxBU1RJQ19ESVNUQU5DRSkge1xuICAgICAgICAgICAgdGhpcy5faXNTY3JvbGxPdmVyRWxhc3RpY0Rpc3RhbmNlID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBwcml2YXRlIG9uVHJlbmRMaXN0U2Nyb2xsRW5kKCl7XG4gICAgICAgIGlmICh0aGlzLl9pc1Njcm9sbE92ZXJFbGFzdGljRGlzdGFuY2UpIHtcbiAgICAgICAgICAgIHRoaXMuX2lzU2Nyb2xsT3ZlckVsYXN0aWNEaXN0YW5jZSA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5wYWdlID0gdGhpcy5wYWdlICsgMTtcbiAgICAgICAgICAgIHRoaXMuZ2V0R29vZHNUcmVuZCh0aGlzLnNlbGVjdEdvb2RzVHlwZSx0aGlzLnBhZ2UpXG4gICAgICAgICAgICBcbiAgICAgICAgfVxuICAgIH1cbiAgIFxufSIsIi8qKlxuICogQGF1dGhvciBbU2l3ZW5dXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0NzoxMVxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDc6MTFcbiAqIEBkZXNjIOmmlumhteWVhuWTgeWNoeiEmuacrFxuICovXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcbmltcG9ydCB7IFRhYmJhciB9IGZyb20gXCIuLi92aWV3L1RhYmJhclwiO1xuXG5pbXBvcnQgdXRpbHMgZnJvbSAnLi4vanMvdXRpbHMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENhcmQgZXh0ZW5kcyB1aS5DYXJkVUkge1xuICAgIGNvbnN0cnVjdG9yKCl7XG4gICAgICAgIHN1cGVyKClcbiAgICAgICAgdGhpcy5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5jbGlja0l0ZW0pXG4gICAgfVxuICAgIHNldCBkYXRhU291cmNlKGl0ZW06IGFueSkge1xuICAgICAgICB0aGlzLl9kYXRhU291cmNlID0gaXRlbTtcbiAgICAgICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgICAgIC8v6YeR5biB5Zu+54mHLCAgMS00MDDph5HluIHlm77moIcyOyAgIDUwMS0xMDAw6YeR5biB5Zu+5qCHNDsgIDEwMDHku6XkuIrph5HluIHlm77moIcyMFxuICAgICAgICAgICAgaWYgKCtpdGVtLmdvb2RzVmFsdWUgPD0gNDAwICkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2FyZEl0ZW0uc2tpbiA9IGBjb21wL2hvbWUvaW1nX2ppbmJpXzIucG5nYFxuICAgICAgICAgICAgfWVsc2UgaWYoK2l0ZW0uZ29vZHNWYWx1ZSA8PSAxMDAwKXtcbiAgICAgICAgICAgICAgICB0aGlzLmNhcmRJdGVtLnNraW4gPSBgY29tcC9ob21lL2ltZ19qaW5iaV80LnBuZ2BcbiAgICAgICAgICAgIH1lbHNlIGlmKCtpdGVtLmdvb2RzVmFsdWUgPj0gMTAwMSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2FyZEl0ZW0uc2tpbiA9IGBjb21wL2hvbWUvaW1nX2ppbmJpXzIwLnBuZ2BcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc2NlbmVJbWcuc2tpbiA9IGBjb21wL2hvbWUvaW1nX3NjZW5lXyR7aXRlbS50b3RhbE51bX0ucG5nYFxuICAgICAgICAgICAgdGhpcy5nb29kc05hbWUudGV4dCA9IGAkeytpdGVtLmdvb2RzVmFsdWV9IFVTRFRgXG4gICAgICAgICAgICB0aGlzLmF3YXJkLnRleHQgPSBgJHt1dGlscy50b0RlY2ltYWwoaXRlbS5hd2FyZCwyKX1gXG4gICAgICAgICAgICB0aGlzLnNvbGROdW1fdG90YWxOdW0udGV4dCA9IGAke2l0ZW0uc29sZE51bX0vJHtpdGVtLnRvdGFsTnVtfWBcbiAgICAgICAgICAgIHRoaXMucHJvZ3Jlc3MudmFsdWUgPSArYCR7aXRlbS5zb2xkTnVtL2l0ZW0udG90YWxOdW19YFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBjbGlja0l0ZW0oKTp2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuX2RhdGFTb3VyY2UgIT09IG51bGwpIHtcbiAgICAgICAgICAgIFRhYmJhci5nZXRJbnN0YW5jZSgpLm9wZW5TY2VuZSgnZ3Vlc3Npbmcuc2NlbmUnLHRoaXMuX2RhdGFTb3VyY2UuZ29vZHNJZClcbiAgICAgICAgfVxuICAgIH1cbn0iLCIvKipcbiAqIEBhdXRob3IgW1Npd2VuXVxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDc6NThcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ3OjU4XG4gKiBAZGVzYyDotK3kubDpobXpnaLohJrmnKxcbiAqL1xuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XG5pbXBvcnQgeyBUb2FzdCB9IGZyb20gXCIuLi92aWV3L1RvYXN0XCI7XG5pbXBvcnQgdXRpbHMgZnJvbSAnLi4vanMvdXRpbHMnXG5pbXBvcnQgSXB0UHN3RG9tIGZyb20gXCIuLi90ZW1wbGF0ZS9wc3dJbnB1dFwiO1xuaW1wb3J0IHsgR2FtZU1vZGVsIH0gZnJvbSBcIi4uL2pzL0dhbWVNb2RlbFwiO1xuaW1wb3J0IGFwaSBmcm9tIFwiLi4vanMvYXBpXCI7XG5pbXBvcnQgeyBTb2NrZXQgfSBmcm9tIFwiLi4vanMvc29ja2V0XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEd1ZXNzaW5nIGV4dGVuZHMgdWkuZ3Vlc3NpbmdVSSB7XG5cbiAgICBwcml2YXRlIGdvb2RzSWQ6c3RyaW5nID0gJyc7Ly/llYblk4FJRFxuICAgIHByaXZhdGUgX3BlcmlvZDpzdHJpbmcgPSAnJzsgLy/mnJ/lj7dcbiAgICBwcml2YXRlIHNlbGVjdE51bWJlcjpudW1iZXIgPSAwOyAvL+mAieS4reS4quaVsFxuICAgIHByaXZhdGUgdW5pdFByaWNlOm51bWJlciA9IDA7IC8v5Y2V5Lu3XG4gICAgcHJpdmF0ZSB0b3RhbFByaWNlOm51bWJlciA9IDA7IC8v5oC75Lu3XG4gICAgcHJpdmF0ZSBteUFtb3VudDpudW1iZXIgPSAwOyAvL+aAu+i1hOS6p1xuICAgIHByaXZhdGUgbnVtYmVyQXJyOm51bWJlcltdID0gW107IC8v5pyq6YCJ5Lit55qE5pWw5o2uXG4gICAgcHJpdmF0ZSBoYWxmQXJyOm51bWJlcltdID0gW107IC8v5LiA5Y2K55qE5pyq6YCJ5Lit5pWw5o2uXG4gICAgcHJpdmF0ZSByYXdEYXRhQXJyX25ldzphbnlbXSA9IFtdOy8v6ZWc5YOP5pWw57uEXG4gICAgcHJpdmF0ZSByYXdEYXRhQXJyOmFueVtdID0gW107Ly/ljp/lp4vmlbDmja5cblxuICAgIHByaXZhdGUgaW5wdXRQd2Q6IElwdFBzd0RvbTsgLy/lr4bnoIHovpPlhaXmoYZcbiAgICBwcml2YXRlIGNvZGVMaXN0OnN0cmluZyA9ICcnOyAvL+i0reS5sOWPt+eggVxuXG4gICAgY29uc3RydWN0b3IoKXtcbiAgICAgICAgc3VwZXIoKVxuXG4gICAgICAgIHRoaXMuYnRuX2J1eS5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5idXlGdW5jKVxuXG4gICAgICAgIC8vIOmAieaLqeaMiemSrue7hOe7keWumuS6i+S7tlxuICAgICAgICB0aGlzLnJhbmRvbV9vbmUub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuc2VsZWN0RnVuYyxbMV0pXG4gICAgICAgIHRoaXMucmFuZG9tX2JlZm9yZS5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5zZWxlY3RGdW5jLFsyXSlcbiAgICAgICAgdGhpcy5yYW5kb21fYWZ0ZXIub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuc2VsZWN0RnVuYyxbM10pXG4gICAgICAgIHRoaXMucmFuZG9tX2FsbC5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5zZWxlY3RGdW5jLFs0XSlcbiAgICB9XG5cbiAgICBvbkVuYWJsZSgpOnZvaWQge1xuICAgICAgICBjb25zb2xlLmxvZygn6L+b5YWl6aG16Z2iJyk7XG5cbiAgICAgICAgLy/ojrflj5bnlKjmiLfotYTkuqdcbiAgICAgICAgY29uc3QgdXNlckluZm86YW55ID0gR2FtZU1vZGVsLmdldEluc3RhbmNlKCkudXNlckluZm87XG4gICAgICAgIHRoaXMuYmFsYW5jZS50ZXh0ID0gYCR7dXRpbHMudG9EZWNpbWFsKHVzZXJJbmZvLm1vbmV5LDIpfSBVU0RUYDtcbiAgICAgICAgdGhpcy5teUFtb3VudCA9ICtgJHt1dGlscy50b0RlY2ltYWwodXNlckluZm8ubW9uZXksMil9YDtcbiAgICAgICAgaWYgKCF1c2VySW5mby51c2VySWQpIHsgLy/mnKrnmbvlvZXkuI3mmL7npLrmiJHnmoTkvZnpop1cbiAgICAgICAgICAgIHRoaXMuYmFsYW5jZUJveC52aXNpYmxlID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLmVzdGltYXRlLnkgPSA4MDtcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICB0aGlzLmJhbGFuY2VCb3gudmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLmVzdGltYXRlLnkgPSA0MjtcbiAgICAgICAgfVxuICAgICAgICAvLyDnm5Hop4botYTkuqflj5jliqhcbiAgICAgICAgR2FtZU1vZGVsLmdldEluc3RhbmNlKCkub24oJ2dldFVzZXJJbmZvJyx0aGlzLCgodXNlckluZm86YW55KT0+e1xuICAgICAgICAgICAgdGhpcy5iYWxhbmNlLnRleHQgPSBgJHt1dGlscy50b0RlY2ltYWwodXNlckluZm8ubW9uZXksMil9IFVTRFRgO1xuICAgICAgICAgICAgdGhpcy5teUFtb3VudCA9ICtgJHt1dGlscy50b0RlY2ltYWwodXNlckluZm8ubW9uZXksMil9YDtcbiAgICAgICAgfSkpXG5cbiAgICAgICAgLy8g5Y+356CB6KKr6LSt5Lmw5Y+Y5YqoXG4gICAgICAgIEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLm9uKCdnZXRidXlHb29kc0FycicsdGhpcywoZ29vZHNBcnI6YW55KT0+e1xuICAgICAgICAgICAgdGhpcy5yYXdEYXRhQXJyLmZvckVhY2goKGl0ZW06YW55KT0+e1xuICAgICAgICAgICAgICAgIGdvb2RzQXJyLmZvckVhY2goKHY6YW55KT0+e1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS5jb2RlID09PSB2LmNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0udXNlcklkID0gdi51c2VySWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLmJ1eWVySWQgPSB2LnVzZXJJZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgdGhpcy5wcm9ncmVzc1NwZWVkLnZhbHVlID0gK2Ake2dvb2RzQXJyLmxlbmd0aCAvIHRoaXMubnVtYmVyTGlzdC5hcnJheS5sZW5ndGh9YDtcbiAgICAgICAgICAgIHRoaXMuc29sZE51bV9zb2xkTnVtLnRleHQgPSBgJHtnb29kc0Fyci5sZW5ndGh9LyR7dGhpcy5udW1iZXJMaXN0LmFycmF5Lmxlbmd0aH1gO1xuICAgICAgICAgICAgdGhpcy5udW1iZXJMaXN0LmFycmF5ID0gdGhpcy5yYXdEYXRhQXJyOyAvL+WPt+eggeWIl+ihqFxuICAgICAgICB9KVxuICAgIH1cbiAgICBvbk9wZW5lZChnb29kc0lkOmFueSl7XG4gICAgICAgIHRoaXMuZ29vZHNJZCA9IGdvb2RzSWQ7XG4gICAgICAgIHRoaXMuZ2V0R29vZHNEZXRhaWxzKHRoaXMuZ29vZHNJZCk7XG4gICAgfVxuICAgIG9uRGlzYWJsZSgpe1xuICAgICAgICAvLyAg5YWz6Zetd2Vic29ja2V05LqL5Lu2XG4gICAgICAgIFNvY2tldC5zZW5kV1NQdXNoKGBidXlfJHt0aGlzLl9wZXJpb2R9YCwwKVxuICAgIH1cblxuICAgIC8qKui0reS5sCAqL1xuICAgIHByaXZhdGUgYnV5RnVuYygpOnZvaWQge1xuICAgICAgICBsZXQgdXNlckluZm8gPSBPYmplY3Qua2V5cyhHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS51c2VySW5mbyk7XG4gICAgICAgIGlmICh1c2VySW5mby5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfmnKrnmbvlvZXot7PovaznmbvlvZUnKTtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gYGh0dHBzOi8vJHtkb2N1bWVudC5kb21haW59LyMvc2lnbl9vbmVgXG4gICAgICAgIH1lbHNlIGlmICh0aGlzLmdldFNlbGVjdE51bWJlcigpIDw9IDApIHtcbiAgICAgICAgICAgIFRvYXN0LnNob3coJ+ivt+mAieaLqei0reS5sOWPt+eggScpXG4gICAgICAgIH1lbHNlIGlmKHRoaXMudG90YWxQcmljZSA+IHRoaXMubXlBbW91bnQpe1xuICAgICAgICAgICAgVG9hc3Quc2hvdygn5L2Z6aKd5LiN6LazJylcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICB0aGlzLmlucHV0UHdkID0gbmV3IElwdFBzd0RvbSgpXG4gICAgICAgICAgICB0aGlzLmlucHV0UHdkLnBvcHVwKCk7XG4gICAgICAgICAgICB0aGlzLmlucHV0UHdkLnNldERhdGEoeyAvL+WPkemAgeaVsOaNrlxuICAgICAgICAgICAgICAgIHBlcmlvZDp0aGlzLnBlcmlvZC50ZXh0LFxuICAgICAgICAgICAgICAgIGNvZGVMaXN0OnRoaXMuY29kZUxpc3QsXG4gICAgICAgICAgICAgICAgQWxsQ29kZUxpc3Q6dGhpcy5udW1iZXJMaXN0LmFycmF5XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLy8g55uR5ZCs6L6T5YWl5qGG57uE5Lu25LqL5Lu2XG4gICAgICAgICAgICB0aGlzLmlucHV0UHdkLm9uKCdyZWZyZXNoRGF0YScsdGhpcywoKT0+e1xuICAgICAgICAgICAgICAgIHRoaXMuZ2V0R29vZHNEZXRhaWxzKHRoaXMuZ29vZHNJZCk7XG4gICAgICAgICAgICAgICAgdGhpcy50b3RhbC50ZXh0ID0gJzAgVVNEVCc7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog6YCJ5oup5oyJ6ZKu57uEXG4gICAgICogQHBhcmFtIHR5cGUg6YCJ5oup57G75Z6LICAxOumaj+S4gCAgMu+8muWJjeWNiiAz77ya5ZCO5Y2KIDTvvJrlhajpg6hcbiAgICAgKi9cbiAgICBwcml2YXRlIHNlbGVjdEZ1bmModHlwZTpudW1iZXIpe1xuICAgICAgICB0aGlzLnJhd0RhdGFBcnJfbmV3ID0gdGhpcy5yYXdEYXRhQXJyOyAvL+WIneWni+WMluaVsOe7hFxuICAgICAgICB0aGlzLm51bWJlckFyciA9IFtdOy8v5Yid5aeL5YyW5pWw57uEXG4gICAgICAgIHRoaXMuaGFsZkFyciA9IFtdOy8v5Yid5aeL5YyW5pWw57uEXG5cbiAgICAgICAgdGhpcy5yYXdEYXRhQXJyX25ldy5mb3JFYWNoKGl0ZW09PntcbiAgICAgICAgICAgIGlmIChpdGVtLmJ1eWVySWQgPT09ICcyJykge1xuICAgICAgICAgICAgICAgIGl0ZW0uYnV5ZXJJZCA9ICcwJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpdGVtLmJ1eWVySWQgPD0gMikge1xuICAgICAgICAgICAgICAgIHRoaXMubnVtYmVyQXJyLnB1c2goaXRlbS5jb2RlKVxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIGlmICh0eXBlID09PSAxKSB7XG4gICAgICAgICAgICB0aGlzLnJhbmRvbU51bWJlcih0aGlzLm51bWJlckFyciwxKSAvL+maj+S4gFxuICAgICAgICB9ZWxzZSBpZiAodHlwZSA9PT0gMikge1xuICAgICAgICAgICAgdGhpcy5oYWxmQXJyID0gdGhpcy5udW1iZXJBcnIuc2xpY2UoMCxNYXRoLmZsb29yKHRoaXMubnVtYmVyQXJyLmxlbmd0aCAvIDIpKSAgLy/liY3ljYpcbiAgICAgICAgICAgIHRoaXMucmFuZG9tTnVtYmVyKHRoaXMuaGFsZkFyciwyKVxuICAgICAgICB9ZWxzZSBpZih0eXBlID09PSAzKSB7XG4gICAgICAgICAgICB0aGlzLmhhbGZBcnIgPSB0aGlzLm51bWJlckFyci5zbGljZShNYXRoLmZsb29yKHRoaXMubnVtYmVyQXJyLmxlbmd0aCAvIDIpKSAgLy/lkI7ljYpcbiAgICAgICAgICAgIHRoaXMucmFuZG9tTnVtYmVyKHRoaXMuaGFsZkFyciwyKVxuICAgICAgICB9ZWxzZSBpZih0eXBlID09PSA0KSB7XG4gICAgICAgICAgICB0aGlzLmhhbGZBcnIgPSB0aGlzLm51bWJlckFycjsvL+WFqOmDqFxuICAgICAgICAgICAgdGhpcy5yYW5kb21OdW1iZXIodGhpcy5oYWxmQXJyLDIpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKirku47mlbDnu4TkuK3pmo/mnLrlj5bkuIDkuKrmlbBcbiAgICAgKiBAcGFyYW0gYXJyIOaVsOaNruWIl+ihqFxuICAgICAqIEBwYXJhbSB0eXBlIFvlj6/pgIldIOmaj+acuuexu+Wei1xuICAgICAqL1xuICAgIHByaXZhdGUgcmFuZG9tTnVtYmVyKGFycjpudW1iZXJbXSx0eXBlPzpudW1iZXIpe1xuICAgICAgICBjb25zdCByYW5kOm51bWJlciA9IE1hdGguZmxvb3IoKE1hdGgucmFuZG9tKCkgKiBhcnIubGVuZ3RoKSk7IC8v6ZqP5LiAXG4gICAgICAgIFxuICAgICAgICBjb25zdCBjb2RlID0gYXJyW3JhbmRdO1xuICAgICAgICBcbiAgICAgICAgaWYgKHR5cGUgPT09IDEpIHtcbiAgICAgICAgICAgIHRoaXMucmF3RGF0YUFycl9uZXcuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoaXRlbS5jb2RlID09PSBjb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0uYnV5ZXJJZCA9ICcyJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlID09PSAyKSB7XG4gICAgICAgICAgICBhcnIuZm9yRWFjaChlbCA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5yYXdEYXRhQXJyX25ldy5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZWwgPT09IGl0ZW0uY29kZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5idXllcklkID0gJzInO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIC8vIHRoaXMubnVtYmVyTGlzdC5yZXBlYXRZID0gdGhpcy5yYXdEYXRhQXJyX25ldy5sZW5ndGg7XG4gICAgICAgIHRoaXMubnVtYmVyTGlzdC5hcnJheSA9IHRoaXMucmF3RGF0YUFycl9uZXc7XG4gICAgICAgIHRoaXMuZ2V0U2VsZWN0TnVtYmVyKClcbiAgICB9XG5cbiAgICAvKirojrflj5bllYblk4Hor6bmg4VcbiAgICAgKiBAcGFyYW0gZ29vZHNJZCDllYblk4FpZFxuICAgICAqL1xuICAgIHByaXZhdGUgZ2V0R29vZHNEZXRhaWxzKGdvb2RzSWQ6c3RyaW5nKSB7XG4gICAgICAgIGFwaS5nZXRHb29kc0RldGFpbHMoZ29vZHNJZCkudGhlbigocmVzOmFueSk9PntcblxuICAgICAgICAgICAgLy8gIOWPkemAgXdlYnNvY2tldOS6i+S7tlxuICAgICAgICAgICAgdGhpcy5fcGVyaW9kID0gcmVzLnBlcmlvZDtcbiAgICAgICAgICAgIFNvY2tldC5zZW5kV1NQdXNoKGBidXlfJHt0aGlzLl9wZXJpb2R9YClcblxuICAgICAgICAgICAgdGhpcy5wcmljZS50ZXh0ID0gYCR7K3Jlcy5wcmljZX1gO1xuICAgICAgICAgICAgdGhpcy5nb29kc1ZhbHVlLnRleHQgPSBgJHsrcmVzLmdvb2RzVmFsdWV9IFVTRFRgO1xuICAgICAgICAgICAgdGhpcy5wcm9ncmVzc1NwZWVkLnZhbHVlID0gK2Ake3Jlcy5zb2xkTnVtL3Jlcy50b3RhbE51bX1gO1xuICAgICAgICAgICAgdGhpcy5zb2xkTnVtX3NvbGROdW0udGV4dCA9IGAke3Jlcy5zb2xkTnVtfS8ke3Jlcy50b3RhbE51bX1gO1xuICAgICAgICAgICAgdGhpcy5wZXJpb2QudGV4dCA9IHJlcy5wZXJpb2Q7XG4gICAgICAgICAgICB0aGlzLnVuaXRQcmljZSA9ICtyZXMucHJpY2U7XG4gICAgICAgICAgICB0aGlzLnJhd0RhdGFBcnIgPSByZXMuY29kZUxpc3Q7XG4gICAgICAgICAgICB0aGlzLm51bWJlckxpc3QuYXJyYXkgPSB0aGlzLnJhd0RhdGFBcnI7IC8v5Y+356CB5YiX6KGoXG4gICAgICAgICAgICB0aGlzLnJhbmRvbV9vbmUudmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICBpZiAodGhpcy5udW1iZXJMaXN0LmFycmF5Lmxlbmd0aCA+IDIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJhbmRvbV9hZnRlci52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLnJhbmRvbV9iZWZvcmUudmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5yYW5kb21fYWxsLnZpc2libGUgPSB0cnVlO1xuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgdGhpcy5yYW5kb21fb25lLndpZHRoID0gMzAwO1xuICAgICAgICAgICAgICAgIHRoaXMucmFuZG9tX29uZS5jZW50ZXJYID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubnVtYmVyTGlzdC5yZXBlYXRYID0gNTtcbiAgICAgICAgICAgIHRoaXMubnVtYmVyTGlzdC5yZXBlYXRZID0gNDtcbiAgICAgICAgICAgIHRoaXMubnVtYmVyTGlzdC5jZWxscy5mb3JFYWNoKChpdGVtOiBMYXlhLlNwcml0ZSkgPT4ge1xuICAgICAgICAgICAgICAgIGl0ZW0ub24oXCJHZXRJdGVtXCIsIHRoaXMsIHRoaXMuZ2V0U2VsZWN0TnVtYmVyKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSkuY2F0Y2goKGVycjphbnkpPT57XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIubWVzc2FnZSk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgLyoq55uR5ZCs57uf6K6h5YiX6KGo5pWw5o2u6YCJ5Lit5Liq5pWwICovXG4gICAgcHJpdmF0ZSBnZXRTZWxlY3ROdW1iZXIoKXtcbiAgICAgICAgdGhpcy5zZWxlY3ROdW1iZXIgPSAwO1xuICAgICAgICB0aGlzLmNvZGVMaXN0ID0gJyc7XG4gICAgICAgIHRoaXMubnVtYmVyTGlzdC5hcnJheS5mb3JFYWNoKGl0ZW09PntcbiAgICAgICAgICAgIGlmIChpdGVtLmJ1eWVySWQgPT09ICcyJykge1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0TnVtYmVyID0gdGhpcy5zZWxlY3ROdW1iZXIgKyAxO1xuICAgICAgICAgICAgICAgIGxldCBjb2RlU3RyaW5nOnN0cmluZyA9IGAke3RoaXMuY29kZUxpc3R9JHt0aGlzLmNvZGVMaXN0Lmxlbmd0aCA+IDAgPyAnLCc6Jyd9JHtpdGVtLmNvZGV9YDtcbiAgICAgICAgICAgICAgICB0aGlzLmNvZGVMaXN0ID0gIGNvZGVTdHJpbmc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIHRoaXMudG90YWwudGV4dCA9IHV0aWxzLnRvRGVjaW1hbCgodGhpcy51bml0UHJpY2UgKiB0aGlzLnNlbGVjdE51bWJlciksMikgKyAnIFVTRFQnO1xuICAgICAgICB0aGlzLnRvdGFsUHJpY2UgPSArdXRpbHMudG9EZWNpbWFsKCh0aGlzLnVuaXRQcmljZSAqIHRoaXMuc2VsZWN0TnVtYmVyKSwyKTtcblxuICAgICAgICByZXR1cm4gdGhpcy5zZWxlY3ROdW1iZXI7XG4gICAgfVxufSIsIi8qKlxuICogQGF1dGhvciBbU2l3ZW5dXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0ODoxNlxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDg6MTZcbiAqIEBkZXNjIOmmlumhteiEmuacrFxuICovXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcbmltcG9ydCB7IFRvYXN0IH0gZnJvbSBcIi4uL3ZpZXcvVG9hc3RcIjtcbmltcG9ydCB7IEdhbWVNb2RlbCB9IGZyb20gXCIuLi9qcy9HYW1lTW9kZWxcIjtcbmltcG9ydCB1dGlscyBmcm9tICcuLi9qcy91dGlscydcbmltcG9ydCBhcGkgZnJvbSBcIi4uL2pzL2FwaVwiO1xuXG5pbXBvcnQgeyBwb3N0IH0gZnJvbSAnLi4vanMvaHR0cCc7XG5pbXBvcnQgeyBTb2NrZXQgfSBmcm9tIFwiLi4vanMvc29ja2V0XCI7XG5pbXBvcnQgeyBUYWJiYXIgfSBmcm9tIFwiLi4vdmlldy9UYWJiYXJcIjtcbi8vIGltcG9ydCByZWNoYXJnZURpYWxvZyBmcm9tICcuLi90ZW1wbGF0ZS9yZWNoYXJnZURpYWxvZyc7XG5pbXBvcnQgc2NyZWVuVXRpbHMgZnJvbSBcIi4uL2pzL3NjcmVlblV0aWxzXCI7XG5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSG9tZSBleHRlbmRzIHVpLmhvbWVVSSB7XG5cbiAgICAvLyBwcml2YXRlIHJlY2hhcmdlRGlhbG9nOiByZWNoYXJnZURpYWxvZzsvL+WFheWAvOW8ueWHulxuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKClcbiAgICAgICAgdGhpcy5yZWNoYXJnZUJveC5vbihMYXlhLkV2ZW50LkNMSUNLLCB0aGlzLCB0aGlzLmJ0blJlY2hhcmdlRnVuYyk7XG4gICAgICAgIHRoaXMuYnV5SGVscC5vbihMYXlhLkV2ZW50LkNMSUNLLCB0aGlzLCB0aGlzLm9wZW5CdXlIZWxwKVxuICAgICAgICB0aGlzLnB1dGluLm9uKExheWEuRXZlbnQuQ0xJQ0ssIHRoaXMsIHRoaXMucHV0SW5GdW5jKVxuICAgICAgICB0aGlzLmdvX2NlbnRlci5vbihMYXlhLkV2ZW50LkNMSUNLLCB0aGlzLCB0aGlzLmdvQ2VudGVyKVxuICAgIH1cbiAgICBvbkVuYWJsZSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5nZXRVc2VySW5mbygpXG4gICAgICAgIHRoaXMucmFua1RvZGF5KClcbiAgICAgICAgdGhpcy5nZXRHb29kc0xpc3QoKVxuXG4gICAgICAgIC8vIOebkeinhueBq+eureaVsOaNruWPmOWKqFxuICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5vbignZ2V0Um9ja2V0RGF0YScsIHRoaXMsIChyZXM6IGFueSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5yb2NrZXRBbW91bnQudGV4dCA9IGAke3V0aWxzLnRvRGVjaW1hbChyZXMucG90TW9uZXksIDIpfWBcbiAgICAgICAgICAgIHV0aWxzLmNvdW50RG93bihyZXMuY291bnREb3duLCAoKHRpbWUpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnJvY2tldENvdW50RG93bi50ZXh0ID0gdGltZVxuICAgICAgICAgICAgfSkpXG4gICAgICAgIH0pXG4gICAgICAgIC8vIOaYr+WQpuW8gOWlluS6hu+8jOW8gOWlluWIt+aWsOWVhuWTgeWIl+ihqFxuICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5vbignaXNUb2dnbGUnLCB0aGlzLCAocmVzOiBhbnkpID0+IHtcbiAgICAgICAgICAgIGlmIChzY3JlZW5VdGlscy5nZXRTY3JlZW4oKS5uYW1lICA9PT0gJ2hvbWUnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5nZXRHb29kc0xpc3QoKVxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgfVxuXG5cbiAgICAvKirlhYXlgLwgKi9cbiAgICBwcml2YXRlIGJ0blJlY2hhcmdlRnVuYygpOiB2b2lkIHtcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBgaHR0cHM6Ly8ke2RvY3VtZW50LmRvbWFpbn0vIy9tYWluX1BhZ2U/c2hvdz1yZWNoYXJnZWBcbiAgICAgICAgLy8gVG9hc3Quc2hvdygn54K55Ye75YWF5YC8JylcbiAgICAgICAgLy8gdGhpcy5yZWNoYXJnZURpYWxvZyA9IG5ldyByZWNoYXJnZURpYWxvZygpO1xuICAgICAgICAvLyB0aGlzLnJlY2hhcmdlRGlhbG9nLnkgPSBMYXlhLnN0YWdlLmhlaWdodCAtIHRoaXMucmVjaGFyZ2VEaWFsb2cuaGVpZ2h0O1xuICAgICAgICAvLyB0aGlzLnJlY2hhcmdlRGlhbG9nLnBvcHVwRWZmZWN0ID0gTGF5YS5IYW5kbGVyLmNyZWF0ZSh0aGlzLCB0aGlzLnJlY2hhcmdlRGlhbG9nUG9wdXBGdW4pO1xuICAgICAgICAvLyB0aGlzLnJlY2hhcmdlRGlhbG9nLmNsb3NlRWZmZWN0ID0gTGF5YS5IYW5kbGVyLmNyZWF0ZSh0aGlzLCB0aGlzLnJlY2hhcmdlRGlhbG9nQ2xvc2VGdW4pO1xuICAgICAgICAvLyB0aGlzLnJlY2hhcmdlRGlhbG9nLnBvcHVwKCk7XG4gICAgfVxuICAgIC8qKuepuuaKlSAqL1xuICAgIHByaXZhdGUgcHV0SW5GdW5jKCkge1xuICAgICAgICAvLyBUYWJiYXIuZ2V0SW5zdGFuY2UoKS5vcGVuU2NlbmUoJ3hjdGouc2NlbmUnKVxuICAgICAgICBUb2FzdC5zaG93KCfmmoLmnKrlvIDmlL7vvIzmlazor7fmnJ/lvoUnKVxuICAgIH1cblxuICAgIC8qKuiOt+WPluS4quS6uuS/oeaBryAqL1xuICAgIHByaXZhdGUgZ2V0VXNlckluZm8oKSB7XG4gICAgICAgIGFwaS5nZXRVc2VySW5mbygpLnRoZW4oKHJlczogYW55KSA9PiB7XG4gICAgICAgICAgICB0aGlzLm5pY2tOYW1lLnRleHQgPSByZXMudXNlckluZm8ubmlja05hbWVcbiAgICAgICAgICAgIHRoaXMubXlBbW91bnQudGV4dCA9IGAke3V0aWxzLnRvRGVjaW1hbChyZXMudXNlckluZm8ubW9uZXksIDIpfWBcbiAgICAgICAgICAgIHRoaXMuYXZhdGFyLnNraW4gPSByZXMudXNlckluZm8uYXZhdGFyO1xuICAgICAgICB9KS5jYXRjaCgoZXJyOiBhbnkpID0+IHtcbiAgICAgICAgICAgXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgLyoq5LuK5pel5aSn5aWW5rGgICovXG4gICAgcHJpdmF0ZSByYW5rVG9kYXkoKSB7XG4gICAgICAgIGFwaS5nZXRSYW5rVG9kYXkoKS50aGVuKChyZXM6IGFueSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5yb2NrZXRBbW91bnQudGV4dCA9IGAke3V0aWxzLnRvRGVjaW1hbChyZXMucG90TW9uZXksIDIpfWBcbiAgICAgICAgICAgIHV0aWxzLmNvdW50RG93bihyZXMuY291bnREb3duLCAoKHRpbWUpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnJvY2tldENvdW50RG93bi50ZXh0ID0gdGltZVxuICAgICAgICAgICAgfSkpXG4gICAgICAgIH0pLmNhdGNoKChlcnI6IGFueSkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyLm1lc3NhZ2UpO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIC8qKuiOt+WPlummlumhteWVhuWTgeWIl+ihqCAqL1xuICAgIHByaXZhdGUgZ2V0R29vZHNMaXN0KCkge1xuICAgICAgICBhcGkuZ2V0R29vZHNMaXN0KCkudGhlbigocmVzOiBhbnkpID0+IHtcbiAgICAgICAgICAgIHRoaXMubGlzdC5yZXBlYXRYID0gcmVzLmxpc3QubGVuZ3RoO1xuICAgICAgICAgICAgdGhpcy5saXN0LmFycmF5ID0gcmVzLmxpc3Q7XG4gICAgICAgIH0pLmNhdGNoKChlcnI6IGFueSkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyLm1lc3NhZ2UpO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIC8qKueOqeazleS7i+e7jSAqL1xuICAgIHByaXZhdGUgb3BlbkJ1eUhlbHAoKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gJ2h0dHBzOi8vbS54eWhqLmlvLyMvb3JpZ2luL3poL2J1eUhlbHAnO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ29DZW50ZXIoKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gYGh0dHBzOi8vJHtkb2N1bWVudC5kb21haW59LyMvbWFpbl9QYWdlYFxuICAgIH1cblxuICAgIC8qKuW8ueWHuuWFheWAvOeahOaViOaenCAqL1xuICAgIC8vIHJlY2hhcmdlRGlhbG9nUG9wdXBGdW4oZGlhbG9nOiBMYXlhLkRpYWxvZykge1xuICAgIC8vICAgICBkaWFsb2cuc2NhbGUoMSwgMSk7XG4gICAgLy8gICAgIGRpYWxvZy5fZWZmZWN0VHdlZW4gPSBMYXlhLlR3ZWVuLmZyb20oZGlhbG9nLFxuICAgIC8vICAgICAgICAgeyB4OiAwLCB5OiBMYXlhLnN0YWdlLmhlaWdodCArIGRpYWxvZy5oZWlnaHQgfSxcbiAgICAvLyAgICAgICAgIDMwMCxcbiAgICAvLyAgICAgICAgIExheWEuRWFzZS5saW5lYXJOb25lLFxuICAgIC8vICAgICAgICAgTGF5YS5IYW5kbGVyLmNyZWF0ZShMYXlhLkRpYWxvZy5tYW5hZ2VyLCBMYXlhLkRpYWxvZy5tYW5hZ2VyLmRvT3BlbiwgW2RpYWxvZ10pLCAwLCBmYWxzZSwgZmFsc2UpO1xuICAgIC8vIH1cbiAgICAvKirlhbPpl63lhYXlgLznmoTmlYjmnpwgKi9cbiAgICAvLyByZWNoYXJnZURpYWxvZ0Nsb3NlRnVuKGRpYWxvZzogTGF5YS5EaWFsb2cpIHtcbiAgICAvLyAgICAgZGlhbG9nLl9lZmZlY3RUd2VlbiA9IExheWEuVHdlZW4udG8oZGlhbG9nLFxuICAgIC8vICAgICAgICAgeyB4OiAwLCB5OiBMYXlhLnN0YWdlLmhlaWdodCArIGRpYWxvZy5oZWlnaHQgfSxcbiAgICAvLyAgICAgICAgIDMwMCxcbiAgICAvLyAgICAgICAgIExheWEuRWFzZS5saW5lYXJOb25lLFxuICAgIC8vICAgICAgICAgTGF5YS5IYW5kbGVyLmNyZWF0ZShMYXlhLkRpYWxvZy5tYW5hZ2VyLCBMYXlhLkRpYWxvZy5tYW5hZ2VyLmRvQ2xvc2UsIFtkaWFsb2ddKSwgMCwgZmFsc2UsIGZhbHNlKTtcbiAgICAvLyB9XG59IiwiLyoqXG4gKiBAYXV0aG9yIFtTaXdlbl1cbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ4OjI4XG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0ODoyOFxuICogQGRlc2Mg6K6w5b2V6aG16Z2i6ISa5pysXG4gKi9cbmltcG9ydCB7IHVpIH0gZnJvbSAnLi4vdWkvbGF5YU1heFVJJ1xuaW1wb3J0IGFwaSBmcm9tICcuLi9qcy9hcGknO1xuaW1wb3J0IHNjcmVlblV0aWxzIGZyb20gJy4uL2pzL3NjcmVlblV0aWxzJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVjb3JkIGV4dGVuZHMgdWkucmVjb3JkVUkge1xuXG4gICAgc3RhdGljIHJlYWRvbmx5IEhBTEZfU0NST0xMX0VMQVNUSUNfRElTVEFOQ0U6IG51bWJlciA9IDEwMDtcbiAgICBwcml2YXRlIF9pc1Njcm9sbE92ZXJFbGFzdGljRGlzdGFuY2U6IGJvb2xlYW47XG4gICAgcHJpdmF0ZSBwYWdlOm51bWJlciA9IDE7XG4gICAgcHJpdmF0ZSBzY3JlZW5UeXBlOm51bWJlciA9IDE7XG5cbiAgICBjb25zdHJ1Y3Rvcigpe1xuICAgICAgICBzdXBlcigpXG5cbiAgICAgICAgdGhpcy5jYW55dS5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy50YWJTd2l0Y2gsWzFdKVxuICAgICAgICB0aGlzLndhbmdxaS5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy50YWJTd2l0Y2gsWzJdKVxuICAgICAgICB0aGlzLm9uKExheWEuRXZlbnQuUkVTSVpFLHRoaXMsdGhpcy5vblJlc2l6ZSlcbiAgICB9XG5cbiAgICBvbkVuYWJsZSgpOnZvaWR7XG4gICAgICAgIHRoaXMuZ2V0TXlPcmRlcnMoKTtcbiAgICAgICAgLy8gdGhpcy5nZXRHb29kc0hpc3RvcnkoKTtcblxuICAgICAgICAvL+WPguS4juiusOW9lea7muWKqOWKoOi9veabtOWkmlxuICAgICAgICB0aGlzLmpvaW5MaXN0LnNjcm9sbEJhci5jaGFuZ2VIYW5kbGVyID0gTGF5YS5IYW5kbGVyLmNyZWF0ZSh0aGlzLHRoaXMub25Kb2luTGlzdFNjcm9sbENoYW5nZSxudWxsLGZhbHNlKVxuICAgICAgICB0aGlzLmpvaW5MaXN0LnNjcm9sbEJhci5vbihMYXlhLkV2ZW50LkVORCwgdGhpcywgdGhpcy5vbkpvaW5MaXN0U2Nyb2xsRW5kKVxuICAgICAgICAvL+W+gOacn+iusOW9lea7muWKqOWKoOi9veabtOWkmlxuICAgICAgICB0aGlzLnByZXZpb291c0xpc3Quc2Nyb2xsQmFyLmNoYW5nZUhhbmRsZXIgPSBMYXlhLkhhbmRsZXIuY3JlYXRlKHRoaXMsdGhpcy5vblByZXZpb291c0xpc3RTY3JvbGxDaGFuZ2UsbnVsbCxmYWxzZSlcbiAgICAgICAgdGhpcy5wcmV2aW9vdXNMaXN0LnNjcm9sbEJhci5vbihMYXlhLkV2ZW50LkVORCwgdGhpcywgdGhpcy5vblByZXZpb291c0xpc3RTY3JvbGxFbmQpXG4gICAgfVxuXG4gICAgLyoq6I635Y+W5Y+C5LiO6K6w5b2VICovXG4gICAgcHJpdmF0ZSBnZXRNeU9yZGVycyhwYWdlID0gMSl7XG4gICAgICAgIGFwaS5nZXRNeU9yZGVycyhwYWdlKS50aGVuKChyZXM6YW55KT0+e1xuICAgICAgICAgICAgaWYgKHRoaXMuam9pbkxpc3QuYXJyYXkgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmpvaW5MaXN0LmFycmF5ID0gWy4uLnRoaXMuam9pbkxpc3QuYXJyYXksLi4ucmVzXVxuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgdGhpcy5qb2luTGlzdC5hcnJheSA9IHJlcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLmpvaW5MaXN0LmFycmF5Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdGhpcy5qb2luTGlzdC52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgIHRoaXMubm9EYXRhLnZpc2libGUgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KS5jYXRjaCgoZXJyOmFueSk9PntcbiAgICAgICAgICAgIHRoaXMubm9EYXRhLnZpc2libGUgPSB0cnVlO1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyLm1lc3NhZ2UpO1xuICAgICAgICB9KVxuICAgIH1cbiAgICAvKirojrflj5blvoDmnJ/orrDlvZUgKi9cbiAgICBwcml2YXRlIGdldEdvb2RzSGlzdG9yeShwYWdlPzpudW1iZXIpe1xuICAgICAgICBhcGkuZ2V0R29vZHNIaXN0b3J5KHBhZ2UpLnRoZW4oKHJlczphbnkpPT57XG4gICAgICAgICAgICBpZiAodGhpcy5wcmV2aW9vdXNMaXN0LmFycmF5ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmV2aW9vdXNMaXN0LmFycmF5ID0gWy4uLnRoaXMucHJldmlvb3VzTGlzdC5hcnJheSwuLi5yZXNdXG4gICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICB0aGlzLnByZXZpb291c0xpc3QuYXJyYXkgPSByZXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5wcmV2aW9vdXNMaXN0LmFycmF5Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmV2aW9vdXNMaXN0LnZpc2libGUgPSB0cnVlO1xuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLmNhdGNoKChlcnI6YW55KT0+e1xuICAgICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIubWVzc2FnZSk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5YiH5o2i6K6w5b2V5YiX6KGoXG4gICAgICogQHBhcmFtIHR5cGUgMTrlj4LkuI7orrDlvZUgIDLvvJrlvoDmnJ/orrDlvZVcbiAgICAgKi9cbiAgICBwcml2YXRlIHRhYlN3aXRjaCh0eXBlOm51bWJlcil7XG4gICAgICAgIGlmIChzY3JlZW5VdGlscy5nZXRTY3JlZW4oKS5uYW1lID09PSAncmVjb3JkJyAmJiB0aGlzLnNjcmVlblR5cGUgPT09IHR5cGUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNjcmVlblR5cGUgPSB0eXBlO1xuICAgICAgICB0aGlzLnBhZ2UgPSAxO1xuICAgICAgICBpZiAodHlwZSA9PT0gMSkge1xuICAgICAgICAgICAgdGhpcy5jYW55dS5za2luID0gJ2NvbXAvaW1nX3RhYl9hY3RpdmUucG5nJztcbiAgICAgICAgICAgIHRoaXMud2FuZ3FpLnNraW4gPSAnY29tcC9pbWdfdGFiLnBuZyc7XG4gICAgICAgICAgICB0aGlzLmdldE15T3JkZXJzKClcbiAgICAgICAgICAgIHRoaXMucHJldmlvb3VzTGlzdC5zY3JvbGxUbygwKVxuICAgICAgICAgICAgdGhpcy5wcmV2aW9vdXNMaXN0LnZpc2libGUgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMucHJldmlvb3VzTGlzdC5hcnJheSA9IFtdO1xuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgIHRoaXMud2FuZ3FpLnNraW4gPSAnY29tcC9pbWdfdGFiX2FjdGl2ZS5wbmcnO1xuICAgICAgICAgICAgdGhpcy5jYW55dS5za2luID0gJ2NvbXAvaW1nX3RhYi5wbmcnO1xuICAgICAgICAgICAgdGhpcy5nZXRHb29kc0hpc3RvcnkoKTtcbiAgICAgICAgICAgIHRoaXMuam9pbkxpc3Quc2Nyb2xsVG8oMCk7XG4gICAgICAgICAgICB0aGlzLmpvaW5MaXN0LnZpc2libGUgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuam9pbkxpc3QuYXJyYXkgPSBbXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKuebkeinhuWxj+W5leWkp+Wwj+WPmOWMliAqL1xuICAgIG9uUmVzaXplKCl7XG4gICAgICAgIC8v5YiX6KGo6auY5bqm6YCC6YWNID0g5bGP5bmV6auY5bqmIC0gKGJhbm5lciArIHRhYmJhcilcbiAgICAgICAgdGhpcy5qb2luTGlzdC5oZWlnaHQgPSB0aGlzLmhlaWdodCAtIDQzMDtcbiAgICAgICAgdGhpcy5wcmV2aW9vdXNMaXN0LmhlaWdodCA9IHRoaXMuaGVpZ2h0IC0gNDMwO1xuICAgIH1cblxuICAgIC8qKuWPguS4juiusOW9leWIl+ihqOa7muWKqCAqL1xuICAgIHByaXZhdGUgb25Kb2luTGlzdFNjcm9sbENoYW5nZSh2OmFueSkge1xuICAgICAgICBpZiAodiA+IHRoaXMuam9pbkxpc3Quc2Nyb2xsQmFyLm1heCArIFJlY29yZC5IQUxGX1NDUk9MTF9FTEFTVElDX0RJU1RBTkNFKSB7XG4gICAgICAgICAgICB0aGlzLl9pc1Njcm9sbE92ZXJFbGFzdGljRGlzdGFuY2UgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHByaXZhdGUgb25Kb2luTGlzdFNjcm9sbEVuZCgpe1xuICAgICAgICBpZiAodGhpcy5faXNTY3JvbGxPdmVyRWxhc3RpY0Rpc3RhbmNlKSB7XG4gICAgICAgICAgICB0aGlzLl9pc1Njcm9sbE92ZXJFbGFzdGljRGlzdGFuY2UgPSBmYWxzZTtcbiAgICAgICAgICAgIC8vIHRoaXMuZXZlbnQoR2FtZUV2ZW50Lk5FWFRfUEFHRSk7XG4gICAgICAgICAgICB0aGlzLnBhZ2UgPSB0aGlzLnBhZ2UgKyAxO1xuICAgICAgICAgICAgdGhpcy5nZXRNeU9yZGVycyh0aGlzLnBhZ2UpXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhMb2dGbGFnLmdldChMb2dGbGFnLlVJKSwgXCJuZXh0IHBhZ2VcIik7XG4gICAgICAgICAgICBcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKuWPguS4juiusOW9leWIl+ihqOa7muWKqCAqL1xuICAgIHByaXZhdGUgb25QcmV2aW9vdXNMaXN0U2Nyb2xsQ2hhbmdlKHY6YW55KSB7XG4gICAgICAgIGlmICh2ID4gdGhpcy5wcmV2aW9vdXNMaXN0LnNjcm9sbEJhci5tYXggKyBSZWNvcmQuSEFMRl9TQ1JPTExfRUxBU1RJQ19ESVNUQU5DRSkge1xuICAgICAgICAgICAgdGhpcy5faXNTY3JvbGxPdmVyRWxhc3RpY0Rpc3RhbmNlID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBwcml2YXRlIG9uUHJldmlvb3VzTGlzdFNjcm9sbEVuZCgpe1xuICAgICAgICBpZiAodGhpcy5faXNTY3JvbGxPdmVyRWxhc3RpY0Rpc3RhbmNlKSB7XG4gICAgICAgICAgICB0aGlzLl9pc1Njcm9sbE92ZXJFbGFzdGljRGlzdGFuY2UgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMucGFnZSA9IHRoaXMucGFnZSArIDE7XG4gICAgICAgICAgICB0aGlzLmdldEdvb2RzSGlzdG9yeSh0aGlzLnBhZ2UpXG4gICAgICAgIH1cbiAgICB9XG59IiwiLyoqXG4gKiBAYXV0aG9yIFtTaXdlbl1cbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTIwIDEwOjI3OjI1XG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yMCAxMDoyNzoyNVxuICogQGRlc2Mg54Gr566t5aSn5aWW6aG16Z2iXG4gKi9cbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xuaW1wb3J0IHsgZ2V0IH0gZnJvbSBcIi4uL2pzL2h0dHBcIjtcbmltcG9ydCB1dGlscyBmcm9tIFwiLi4vanMvdXRpbHNcIjtcbmltcG9ydCBhcGkgZnJvbSBcIi4uL2pzL2FwaVwiO1xuaW1wb3J0IHsgVGFiYmFyIH0gZnJvbSBcIi4uL3ZpZXcvVGFiYmFyXCI7XG5pbXBvcnQgeyBHYW1lTW9kZWwgfSBmcm9tIFwiLi4vanMvR2FtZU1vZGVsXCI7XG5cbiBleHBvcnQgZGVmYXVsdCBjbGFzcyBncmFuZFByaXggZXh0ZW5kcyB1aS5ncmFuZFByaXhVSSB7XG4gICAgIGNvbnN0cnVjdG9yKCl7XG4gICAgICAgICBzdXBlcigpXG4gICAgICAgICB0aGlzLnJhbmtQcml6ZUhlbHAub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMub3BlblJhbmtQcml6ZUhlbHApXG4gICAgICAgICB0aGlzLmJ0bl9oaXN0b3J5Lm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLkJ0bmhpc3RvcnkpXG4gICAgIH1cblxuICAgICBvbkVuYWJsZSgpe1xuICAgICAgICB0aGlzLmdldFJhbmtUb2RheSgpXG4gICAgICAgIExheWEuc3RhZ2Uub24oTGF5YS5FdmVudC5SRVNJWkUsdGhpcyx0aGlzLm9uUmVzaXplKVxuICAgICAgICB0aGlzLm9uUmVzaXplKClcbiAgICAgICAgLy8g55uR6KeG54Gr566t5pWw5o2u5Y+Y5YqoXG4gICAgICAgIEdhbWVNb2RlbC5nZXRJbnN0YW5jZSgpLm9uKCdnZXRSb2NrZXREYXRhJyx0aGlzLChyZXM6YW55KSA9PiB7XG4gICAgICAgICAgICB0aGlzLmJvbnVzLnRleHQgPSBgJHt1dGlscy50b0RlY2ltYWwocmVzLnBvdE1vbmV5LDIpfWAgXG4gICAgICAgICAgICB1dGlscy5jb3VudERvd24ocmVzLmNvdW50RG93biwoKHRpbWUpPT57XG4gICAgICAgICAgICAgICAgdGhpcy5Db3VudERvd24udGV4dCA9IHRpbWVcbiAgICAgICAgICAgIH0pKVxuICAgICAgICB9KVxuICAgICB9XG4gICAgIG9uRGlzYWJsZSgpOnZvaWQge1xuICAgICAgICBMYXlhLnN0YWdlLm9mZihMYXlhLkV2ZW50LlJFU0laRSx0aGlzLHRoaXMub25SZXNpemUpXG4gICAgfVxuXG4gICAgIC8qKuiOt+WPluWkp+WlluS/oeaBryAqL1xuICAgIHByaXZhdGUgZ2V0UmFua1RvZGF5KCl7XG4gICAgICAgIGFwaS5nZXRSYW5rVG9kYXkoKS50aGVuKChyZXM6YW55KT0+e1xuICAgICAgICAgICAgdGhpcy5ib251cy50ZXh0ID0gYCR7dXRpbHMudG9EZWNpbWFsKHJlcy5wb3RNb25leSwyKX1gIFxuICAgICAgICAgICAgdXRpbHMuY291bnREb3duKHJlcy5jb3VudERvd24sKCh0aW1lKT0+e1xuICAgICAgICAgICAgICAgIHRoaXMuQ291bnREb3duLnRleHQgPSB0aW1lXG4gICAgICAgICAgICB9KSlcbiAgICAgICAgICAgIGlmIChyZXMubGlzdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLm5vRGF0YS52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8v56ys5LiA5ZCNXG4gICAgICAgICAgICBpZiAocmVzLmxpc3QubGlzdDEuZGF0YS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5ib3gxLnZpc2libGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuYWxvbmUxLnRleHQgPSBg54us5b6XICR7dXRpbHMudG9EZWNpbWFsKHJlcy5saXN0Lmxpc3QxLmRpdmlkbW9uZXksMil9IFVTRFRgXG4gICAgICAgICAgICAgICAgdGhpcy5Qcm9wb3J0aW9uMS50ZXh0ID0gYOWNoOWlluaxoCR7cmVzLmxpc3QubGlzdDEucGVyY2VudH1gXG4gICAgICAgICAgICAgICAgdGhpcy5wcml4TGlzdDEuYXJyYXkgPSByZXMubGlzdC5saXN0MS5kYXRhXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyAyLTXlkI1cbiAgICAgICAgICAgIGlmIChyZXMubGlzdC5saXN0Mi5kYXRhLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmJveDIudmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5hbG9uZTIudGV4dCA9IGDmr4/kurogJHt1dGlscy50b0RlY2ltYWwocmVzLmxpc3QubGlzdDIuZGl2aWRtb25leS80LDIpfSBVU0RUYFxuICAgICAgICAgICAgICAgIHRoaXMuUHJvcG9ydGlvbjIudGV4dCA9IGDljaDlpZbmsaAke3Jlcy5saXN0Lmxpc3QyLnBlcmNlbnR9YFxuICAgICAgICAgICAgICAgIHRoaXMucHJpeExpc3QyLmFycmF5ID0gcmVzLmxpc3QubGlzdDIuZGF0YVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gNS0xNeWQjVxuICAgICAgICAgICAgaWYgKHJlcy5saXN0Lmxpc3QzLmRhdGEubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuYm94My52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmFsb25lMy50ZXh0ID0gYOavj+S6uiAke3V0aWxzLnRvRGVjaW1hbChyZXMubGlzdC5saXN0My5kaXZpZG1vbmV5LzEwLDIpfSBVU0RUYFxuICAgICAgICAgICAgICAgIHRoaXMuUHJvcG9ydGlvbjMudGV4dCA9IGDljaDlpZbmsaAke3Jlcy5saXN0Lmxpc3QzLnBlcmNlbnR9YFxuICAgICAgICAgICAgICAgIHRoaXMucHJpeExpc3QzLmFycmF5ID0gcmVzLmxpc3QubGlzdDMuZGF0YVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy/mnKrnmbvlvZXliJnkuI3mmL7npLrkuKrkurrmjpLlkI1cbiAgICAgICAgICAgIGlmIChyZXMubGlzdC5zZWxmLnVzZXJJZCkge1xuICAgICAgICAgICAgICAgIHRoaXMubXlSYW5rQm94LnZpc2libGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMubXlyYW5raW5nLnRleHQgPSByZXMubGlzdC5zZWxmLnJhbmsgPiAxNSA/ICcxNSsnIDogYCR7cmVzLmxpc3Quc2VsZi5yYW5rfWA7XG4gICAgICAgICAgICAgICAgdGhpcy5hdmF0YXIuc2tpbiA9IHJlcy5saXN0LnNlbGYuYXZhdGFyO1xuICAgICAgICAgICAgICAgIHRoaXMubmlja05hbWUudGV4dCA9IHJlcy5saXN0LnNlbGYubmlja05hbWU7XG4gICAgICAgICAgICAgICAgdGhpcy51aWQudGV4dCA9IHJlcy5saXN0LnNlbGYudXNlcklkO1xuICAgICAgICAgICAgICAgIHRoaXMudm9sdW1lLnRleHQgPSBgJHt1dGlscy50b0RlY2ltYWwocmVzLmxpc3Quc2VsZi5jb25zdW0sMil9IFVTRFRgXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLmNhdGNoKChlcnI6YW55KT0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyLm1lc3NhZ2UpO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIHByaXZhdGUgQnRuaGlzdG9yeSgpe1xuICAgICAgICBUYWJiYXIuZ2V0SW5zdGFuY2UoKS5vcGVuU2NlbmUoJ3ByaUhpc3RvcnlTY2VuZS5zY2VuZScpXG4gICAgfVxuXG4gICAgLyoq6K+05piOICovXG4gICAgcHJpdmF0ZSBvcGVuUmFua1ByaXplSGVscCgpe1xuICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9ICdodHRwczovL20ueHloai5pby8jL29yaWdpbi96aC9yYW5rUHJpemVIZWxwJztcbiAgICB9XG4gICAgcHJpdmF0ZSBvblJlc2l6ZSgpOnZvaWQge1xuICAgICAgICB0aGlzLmxpc3RCb3guaGVpZ2h0ID0gTGF5YS5zdGFnZS5oZWlnaHQgLSA3MDA7XG4gICAgfVxuIH0gIiwiXG4vKipcbiAqIEBhdXRob3IgW1Npd2VuXVxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDMtMTggMTY6NTk6MTNcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAzLTE4IDE2OjU5OjEzXG4gKiBAZGVzYyDpobXpnaLliqDovb1sb2FkaW5nXG4gKi9cbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xuXG4gZXhwb3J0IGRlZmF1bHQgY2xhc3MgbG9hZGluZ1NjZW5lIGV4dGVuZHMgdWkubG9hZGluZ1NjZW5lVUkge1xuICAgIFxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpXG4gICAgfVxuXG4gICAgc2V0UHJvZ3Jlc3ModmFsdWU6bnVtYmVyKXtcbiAgICAgICAgY29uc29sZS5sb2codmFsdWUsJ+W9k+WJjei/m+W6picpO1xuICAgICAgICB0aGlzLmxvYWRpbmdQcm9ncmVzcy52YWx1ZSA9IHZhbHVlO1xuICAgICAgICBsZXQgdmFsOnN0cmluZyAgPSBgJHt2YWx1ZSAqIDEwMH1gO1xuICAgICAgICB0aGlzLnByb2dyZXNzLnRleHQgPSBgJHtwYXJzZUludCh2YWwsMCl9JWA7XG4gICAgICAgIHRoaXMucm9ja2V0bG9hZGluZy54ID0gMzY1ICogdmFsdWU7XG4gICAgfVxuIH1cbiIsIi8qKlxuICogQGF1dGhvciBbU2l3ZW5dXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0yMCAxMDoyNzoyNVxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjAgMTA6Mjc6MjVcbiAqIEBkZXNjIOeBq+eureWkp+WlluWOhuWPsuiusOW9lemhtemdolxuICovXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcbmltcG9ydCB1dGlscyBmcm9tIFwiLi4vanMvdXRpbHNcIjtcbmltcG9ydCBhcGkgZnJvbSBcIi4uL2pzL2FwaVwiO1xuaW1wb3J0IHsgVGFiYmFyIH0gZnJvbSBcIi4uL3ZpZXcvVGFiYmFyXCI7XG5cbiBleHBvcnQgZGVmYXVsdCBjbGFzcyBncmFuZFByaXggZXh0ZW5kcyB1aS5wcmlIaXN0b3J5U2NlbmVVSSB7XG4gICAgIGNvbnN0cnVjdG9yKCl7XG4gICAgICAgIHN1cGVyKClcbiAgICAgfVxuXG4gICAgIG9uRW5hYmxlKCl7XG4gICAgICAgIHRoaXMuZ2V0UmFua0hpc3RvcnkoKVxuICAgICAgICBMYXlhLnN0YWdlLm9uKExheWEuRXZlbnQuUkVTSVpFLHRoaXMsdGhpcy5vblJlc2l6ZSlcbiAgICAgICAgdGhpcy5vblJlc2l6ZSgpXG4gICAgIH1cbiAgICBvbkRpc2FibGUoKTp2b2lkIHtcbiAgICAgICAgTGF5YS5zdGFnZS5vZmYoTGF5YS5FdmVudC5SRVNJWkUsdGhpcyx0aGlzLm9uUmVzaXplKVxuICAgIH1cblxuICAgICAvKirojrflj5blpKflpZbkv6Hmga8gKi9cbiAgICBwcml2YXRlIGdldFJhbmtIaXN0b3J5KCl7XG4gICAgICAgIGFwaS5nZXRSYW5rSGlzdG9yeSgpLnRoZW4oKHJlczphbnkpPT57XG4gICAgICAgICAgICB0aGlzLnRvdGFsLnRleHQgPSBg5oC75aWW6YeROiR7dXRpbHMudG9EZWNpbWFsKHJlcy5wb3RNb25leSwyKX0gVVNEVGBcbiAgICAgICAgICAgIGlmIChyZXMubGlzdC5saXN0MS5kYXRhLmxlbmd0aCA9PT0gMCAmJiByZXMubGlzdC5saXN0Mi5kYXRhLmxlbmd0aCA9PT0gMCAmJiByZXMubGlzdC5saXN0My5kYXRhLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMubGlzdEJveC52aXNpYmxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvL+esrOS4gOWQjVxuICAgICAgICAgICAgaWYgKHJlcy5saXN0Lmxpc3QxLmRhdGEubGVuZ3RoID4gMCkgeyAgXG4gICAgICAgICAgICAgICAgdGhpcy5saXN0Qm94LnZpc2libGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuYm94MS52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmFsb25lMS50ZXh0ID0gYOeLrOW+lyAke3V0aWxzLnRvRGVjaW1hbChyZXMubGlzdC5saXN0MS5kaXZpZG1vbmV5LDIpfSBVU0RUYFxuICAgICAgICAgICAgICAgIHRoaXMuUHJvcG9ydGlvbjEudGV4dCA9IGDljaDlpZbmsaAke3Jlcy5saXN0Lmxpc3QxLnBlcmNlbnR9YFxuICAgICAgICAgICAgICAgIHRoaXMucHJpeExpc3QxLmFycmF5ID0gcmVzLmxpc3QubGlzdDEuZGF0YVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gMi015ZCNXG4gICAgICAgICAgICBpZiAocmVzLmxpc3QubGlzdDIuZGF0YS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5saXN0Qm94LnZpc2libGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuYm94Mi52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmFsb25lMi50ZXh0ID0gYOavj+S6uiAke3V0aWxzLnRvRGVjaW1hbChyZXMubGlzdC5saXN0Mi5kaXZpZG1vbmV5LzQsMil9IFVTRFRgXG4gICAgICAgICAgICAgICAgdGhpcy5Qcm9wb3J0aW9uMi50ZXh0ID0gYOWNoOWlluaxoCR7cmVzLmxpc3QubGlzdDIucGVyY2VudH1gXG4gICAgICAgICAgICAgICAgdGhpcy5wcml4TGlzdDIuYXJyYXkgPSByZXMubGlzdC5saXN0Mi5kYXRhXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAgLy8gNS0xNeWQjVxuICAgICAgICAgICAgIGlmIChyZXMubGlzdC5saXN0My5kYXRhLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmxpc3RCb3gudmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5ib3gzLnZpc2libGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuYWxvbmUzLnRleHQgPSBg5q+P5Lq6ICR7dXRpbHMudG9EZWNpbWFsKHJlcy5saXN0Lmxpc3QzLmRpdmlkbW9uZXkvMTAsMil9IFVTRFRgXG4gICAgICAgICAgICAgICAgdGhpcy5Qcm9wb3J0aW9uMy50ZXh0ID0gYOWNoOWlluaxoCR7cmVzLmxpc3QubGlzdDMucGVyY2VudH1gXG4gICAgICAgICAgICAgICAgdGhpcy5wcml4TGlzdDMuYXJyYXkgPSByZXMubGlzdC5saXN0My5kYXRhXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLmNhdGNoKChlcnI6YW55KT0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyLm1lc3NhZ2UpO1xuICAgICAgICB9KVxuICAgIH1cbiAgICBwcml2YXRlIG9uUmVzaXplKCk6dm9pZCB7XG4gICAgICAgIHRoaXMubGlzdEJveC5oZWlnaHQgPSBMYXlhLnN0YWdlLmhlaWdodCAtIDIwMDtcbiAgICB9XG4gfSAiLCIvKipcbiAqIEBhdXRob3IgW1Npd2VuXVxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjYgMTE6MDc6MzlcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTI2IDExOjA3OjM5XG4gKiBAZGVzYyDlhaXlm7TlkI3ljZVcbiAqL1xuXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcbmltcG9ydCB7IFRhYmJhciB9IGZyb20gXCIuLi92aWV3L1RhYmJhclwiO1xuaW1wb3J0IGFwaSBmcm9tIFwiLi4vanMvYXBpXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNob3J0TGlzdGVkIGV4dGVuZHMgdWkuc2hvcnRMaXN0ZWRVSSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKClcbiAgICAgICAgdGhpcy5vbihMYXlhLkV2ZW50LlJFU0laRSwgdGhpcywgdGhpcy5vblJlc2l6ZSlcbiAgICB9XG5cbiAgICBvbkVuYWJsZSgpIHtcbiAgICAgICAgdGhpcy5nZXRTaG9ydExpc3RlZCgpXG5cbiAgICB9XG5cbiAgICBwcml2YXRlIGdldFNob3J0TGlzdGVkKHBhZ2U/OiBudW1iZXIpIHtcbiAgICAgICAgYXBpLmdldFNob3J0TGlzdGVkKHBhZ2UpLnRoZW4oKHJlczogYW55KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNob3J0TGlzdC5yZXBlYXRZID0gcmVzLmxlbmd0aDtcbiAgICAgICAgICAgIHRoaXMuc2hvcnRMaXN0LmFycmF5ID0gcmVzO1xuICAgICAgICAgICAgdGhpcy5zaG9ydExpc3QudmlzaWJsZSA9IHRydWU7XG4gICAgICAgIH0pLmNhdGNoKChlcnI6IGFueSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5ub0RhdGEudmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIubWVzc2FnZSk7XG4gICAgICAgIH0pXG4gICAgfVxuICAgIC8qKuebkeinhuWxj+W5leWkp+Wwj+WPmOWMliAqL1xuICAgIG9uUmVzaXplKCkge1xuICAgICAgICAvL+WIl+ihqOmrmOW6pumAgumFjVxuICAgICAgICAvLyB0aGlzLnNob3J0TGlzdC5oZWlnaHQgPSB0aGlzLmhlaWdodCAtIDEwMDtcbiAgICB9XG59XG4iLCIvKipcbiAqIEBhdXRob3IgW1Npd2VuXVxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjYgMTA6MjA6MTVcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTI2IDEwOjIwOjE1XG4gKiBAZGVzYyDllpzku47lpKnpmY3kuK3lpZblkI3ljZVcbiAqL1xuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XG5pbXBvcnQgYXBpIGZyb20gXCIuLi9qcy9hcGlcIjtcbmltcG9ydCB7IFRvYXN0IH0gZnJvbSBcIi4uL3ZpZXcvVG9hc3RcIjtcbmltcG9ydCB7IFRhYmJhciB9IGZyb20gXCIuLi92aWV3L1RhYmJhclwiO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBXaW5uaW5nIGV4dGVuZHMgdWkueGN0alVJIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKVxuICAgICAgICB0aGlzLmJ0bl9zaG9ydGxpc3Qub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuU2hvcnRMaXN0RnVuYylcbiAgICAgICAgdGhpcy5vbihMYXlhLkV2ZW50LlJFU0laRSx0aGlzLHRoaXMub25SZXNpemUpXG4gICAgfVxuXG4gICAgb25FbmFibGUoKXtcbiAgICAgICAgdGhpcy5nZXRYY3RqTGlzdCgpXG4gICAgfVxuXG5cbiAgICBwcml2YXRlIGdldFhjdGpMaXN0KHBhZ2U/Om51bWJlcil7XG4gICAgICAgIGFwaS5nZXRYY3RqTGlzdChwYWdlKS50aGVuKChyZXM6YW55KT0+e1xuICAgICAgICAgICAgdGhpcy53aW5uaW5nTGlzdC5yZXBlYXRZID0gcmVzLmxlbmd0aDtcbiAgICAgICAgICAgIHRoaXMud2lubmluZ0xpc3QuYXJyYXkgPSByZXM7XG4gICAgICAgICAgICB0aGlzLndpbm5pbmdMaXN0LnZpc2libGUgPSB0cnVlO1xuICAgICAgICB9KS5jYXRjaCgoZXJyOmFueSk9PntcbiAgICAgICAgICAgIHRoaXMubm9EYXRhLnZpc2libGUgPSB0cnVlO1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyLm1lc3NhZ2UpO1xuICAgICAgICB9KVxuICAgIH1cbiAgICBcbiAgICAvKirmn6XnnIvku4rml6XlhaXlm7TlkI3ljZUgKi9cbiAgICBwcml2YXRlIFNob3J0TGlzdEZ1bmMoKXtcbiAgICAgICAgVGFiYmFyLmdldEluc3RhbmNlKCkub3BlblNjZW5lKCdzaG9ydExpc3RlZC5zY2VuZScpXG4gICAgfVxuXG4gICAgLyoq55uR6KeG5bGP5bmV5aSn5bCP5Y+Y5YyWICovXG4gICAgb25SZXNpemUoKXtcbiAgICAgICAgLy/liJfooajpq5jluqbpgILphY0gPSDlsY/luZXpq5jluqYgLSBiYW5uZXJcbiAgICAgICAgdGhpcy53aW5uaW5nTGlzdC5oZWlnaHQgPSB0aGlzLmhlaWdodCAtIDYwMDtcbiAgICB9XG59XG4iLCIvKipcbiAqIEBhdXRob3IgW1Npd2VuXVxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDg6NDBcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ4OjQwXG4gKiBAZGVzYyDlj4LkuI7orrDlvZXohJrmnKxcbiAqL1xuaW1wb3J0IHsgdWkgfSBmcm9tICcuLi91aS9sYXlhTWF4VUknXG5pbXBvcnQgdXRpbHMgZnJvbSAnLi4vanMvdXRpbHMnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBqb2luUmVjb3JkIGV4dGVuZHMgdWkudGVtcGxhdGUuam9pblJlY29yZHNVSSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKClcbiAgICB9XG4gICAgc2V0IGRhdGFTb3VyY2UoaXRlbTogYW55KSB7XG4gICAgICAgIHRoaXMuX2RhdGFTb3VyY2UgPSBpdGVtO1xuXG4gICAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgICAgICB0aGlzLnBlcmlvZC50ZXh0ID0gaXRlbS5wZXJpb2Q7XG4gICAgICAgICAgICB0aGlzLmdvb2RzVmFsdWUudGV4dCA9IGAkeyt1dGlscy50b0RlY2ltYWwoaXRlbS5nb29kc1ZhbHVlLDIpfWA7XG4gICAgICAgICAgICB0aGlzLmNvZGVMaXN0LnRleHQgPSBpdGVtLmNvZGVMaXN0Lmxlbmd0aCA+IDM4ID8gYCR7aXRlbS5jb2RlTGlzdC5zdWJzdHIoMCwzOCl9Li4uYCA6IGl0ZW0uY29kZUxpc3Q7XG5cbiAgICAgICAgICAgIGlmIChpdGVtLnN0YXR1cyA9PT0gJzAnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5ub1ByaXplLnZpc2libGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMubm9Qcml6ZS50ZXh0ID0gJ+acquW8gOWllic7XG4gICAgICAgICAgICAgICAgdGhpcy5vcGVuVGltZS50ZXh0ID0gJy0nO1xuICAgICAgICAgICAgICAgIHRoaXMuaGl0Q29kZS50ZXh0ID0gJy0nO1xuICAgICAgICAgICAgfWVsc2UgaWYoaXRlbS5zdGF0dXMgPT09ICcxJyl7XG4gICAgICAgICAgICAgICAgdGhpcy5ub1ByaXplLnZpc2libGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMubm9Qcml6ZS50ZXh0ID0gJ+W8gOWlluS4rSc7XG4gICAgICAgICAgICAgICAgdGhpcy5vcGVuVGltZS50ZXh0ID0gJy0nO1xuICAgICAgICAgICAgICAgIHRoaXMuaGl0Q29kZS50ZXh0ID0gJy0nO1xuICAgICAgICAgICAgfWVsc2UgaWYoaXRlbS5zdGF0dXMgPT09ICcyJyAmJiAhaXRlbS5oaXQpe1xuICAgICAgICAgICAgICAgIHRoaXMubm9Qcml6ZS52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLm5vUHJpemUudGV4dCA9ICfmnKrkuK3lpZYnO1xuICAgICAgICAgICAgICAgIHRoaXMub3BlblRpbWUudGV4dCA9IHV0aWxzLmZvcm1hdERhdGVUaW1lKGl0ZW0ub3BlblRpbWUpO1xuICAgICAgICAgICAgICAgIHRoaXMuaGl0Q29kZS50ZXh0ID0gaXRlbS5oaXRDb2RlO1xuICAgICAgICAgICAgfWVsc2UgaWYoaXRlbS5zdGF0dXMgPT09ICcyJyAmJiBpdGVtLmhpdCl7XG4gICAgICAgICAgICAgICAgdGhpcy5wcml6ZS52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLm9wZW5UaW1lLnRleHQgPSB1dGlscy5mb3JtYXREYXRlVGltZShpdGVtLm9wZW5UaW1lKTtcbiAgICAgICAgICAgICAgICB0aGlzLmhpdENvZGUudGV4dCA9IGl0ZW0uaGl0Q29kZTtcbiAgICAgICAgICAgICAgICB0aGlzLmF3YXJkLnZpc2libGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuYXdhcmQudGV4dCA9IGAkeyt1dGlscy50b0RlY2ltYWwoaXRlbS5hd2FyZCwyKX0gVVNEVGA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59IiwiLyoqXG4gKiBAYXV0aG9yIFtTaXdlbl1cbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ4OjUwXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0ODo1MFxuICogQGRlc2Mg6LSt5Lmw6aG16Z2i5Y+356CB5YiX6KGo6ISa5pysXG4gKi9cbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xuaW1wb3J0IHsgVG9hc3QgfSBmcm9tIFwiLi4vdmlldy9Ub2FzdFwiO1xuaW1wb3J0IHsgR2FtZU1vZGVsIH0gZnJvbSBcIi4uL2pzL0dhbWVNb2RlbFwiO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBudW1iZXJMaXN0RE9NIGV4dGVuZHMgdWkudGVtcGxhdGUubnVtYmVyTGlzdERPTVVJIHtcbiAgICBwcml2YXRlIHVzZXJJZDpzdHJpbmcgPSAnJztcblxuICAgIGNvbnN0cnVjdG9yKCl7XG4gICAgICAgIHN1cGVyKClcbiAgICAgICAgdGhpcy5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5jbGlja051bWJlcilcbiAgICB9XG4gICAgc2V0IGRhdGFTb3VyY2UoaXRlbTogYW55KSB7XG4gICAgICAgIHRoaXMuX2RhdGFTb3VyY2UgPSBpdGVtO1xuICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgICAgdGhpcy5jb2RlLnRleHQgPSBpdGVtLmNvZGU7XG4gICAgICAgICAgICB0aGlzLmJnSW1nLnNraW4gPSB0aGlzLnJldHVyblN0YXR1c0ltZyhpdGVtLmJ1eWVySWQpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBvbkVuYWJsZSgpe1xuICAgICAgICAvL+iOt+WPlueUqOaIt+i1hOS6p1xuICAgICAgICBjb25zdCB1c2VySW5mbzphbnkgPSBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS51c2VySW5mbztcbiAgICAgICAgdGhpcy51c2VySWQgPSB1c2VySW5mby51c2VySWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog6YCJ5oup5Y+356CBXG4gICAgICogQHBhcmFtIGl0ZW0g5b2T5YmN5oyJ6ZKuXG4gICAgICovXG4gICAgcHJpdmF0ZSBjbGlja051bWJlcihpdGVtOmFueSk6dm9pZCB7XG4gICAgICAgIGlmICgrdGhpcy5fZGF0YVNvdXJjZS5idXllcklkID4gMTApIHsgLy/nlKjmiLdpZOW/heWkp+S6jjEw77yM5L2c5Li65Yik5pat5L6d5o2uXG4gICAgICAgICAgICBUb2FzdC5zaG93KCfor6Xlj7fnoIHlt7LooqvotK3kubAnKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9ZWxzZSBpZih0aGlzLl9kYXRhU291cmNlLmJ1eWVySWQgPT09ICcwJyl7XG4gICAgICAgICAgICB0aGlzLmJnSW1nLnNraW4gPSB0aGlzLnJldHVyblN0YXR1c0ltZygnMicpXG4gICAgICAgICAgICB0aGlzLl9kYXRhU291cmNlLmJ1eWVySWQgPSAnMic7XG4gICAgICAgIH1lbHNlIGlmKHRoaXMuX2RhdGFTb3VyY2UuYnV5ZXJJZCA9PT0gJzInKXtcbiAgICAgICAgICAgIHRoaXMuYmdJbWcuc2tpbiA9IHRoaXMucmV0dXJuU3RhdHVzSW1nKCcwJylcbiAgICAgICAgICAgIHRoaXMuX2RhdGFTb3VyY2UuYnV5ZXJJZCA9ICcwJztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmV2ZW50KFwiR2V0SXRlbVwiKTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIOagueaNrueKtuaAgei/lOWbnuWvueW6lOWbvueJh1xuICAgICAqIEBwYXJhbSBidXllcklkICAw77ya5Y+v6YCJIDLvvJrpgInkuK0g5aSn5LqOMTA65LiN5Y+v6YCJICDnrYnkuo7oh6rlt7F1c2VySWTvvJrlt7LpgIlcbiAgICAgKiBcbiAgICAqL1xuICAgIHByaXZhdGUgcmV0dXJuU3RhdHVzSW1nKGJ1eWVySWQ6c3RyaW5nKXtcbiAgICAgICAgaWYgKGJ1eWVySWQgPT09IHRoaXMudXNlcklkKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2NvbXAvaW1nX3lpeHVhbl9zZWxlY3QyMC5wbmcnXG4gICAgICAgIH1lbHNlIGlmKCtidXllcklkID4gMTApeyAvL+eUqOaIt2lk5b+F5aSn5LqOMTDvvIzkvZzkuLrliKTmlq3kvp3mja5cbiAgICAgICAgICAgIHJldHVybiAnY29tcC9pbWdfbm9fc2VsZWN0MjAucG5nJ1xuICAgICAgICB9ZWxzZSBpZihidXllcklkID09PSAnMicpIHtcbiAgICAgICAgICAgIHJldHVybiAnY29tcC9pbWdfb2tfc2VsZWN0MjAucG5nJ1xuICAgICAgICB9ZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gJ2NvbXAvaW1nX2tleHVhbl9zZWxlY3QyMC5wbmcnXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBcbn0iLCIvKipcbiAqIEBhdXRob3IgW1Npd2VuXVxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMTkgMTc6NDk6MDhcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ5OjA4XG4gKiBAZGVzYyDlvoDmnJ/orrDlvZXohJrmnKxcbiAqL1xuaW1wb3J0IHsgdWkgfSBmcm9tICcuLi91aS9sYXlhTWF4VUknXG5pbXBvcnQgdXRpbHMgZnJvbSAnLi4vanMvdXRpbHMnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBwcmV2aW91c1JlY29yZCBleHRlbmRzIHVpLnRlbXBsYXRlLnByZXZpb3VzUmVjb3Jkc1VJIHtcbiAgICBjb25zdHJ1Y3Rvcigpe1xuICAgICAgICBzdXBlcigpXG4gICAgICAgIHRoaXMudHhIYXNoLm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLnNlZUhhc2gpXG4gICAgfVxuICAgIHNldCBkYXRhU291cmNlKGl0ZW06IGFueSkge1xuICAgICAgICB0aGlzLl9kYXRhU291cmNlID0gaXRlbTtcbiAgICAgICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgICAgIHRoaXMucGVyaW9kLnRleHQgPSBpdGVtLnBlcmlvZDtcbiAgICAgICAgICAgIHRoaXMuZ29vZHNOYW1lLnRleHQgPSBpdGVtLmdvb2RzTmFtZTtcbiAgICAgICAgICAgIHRoaXMudHhIYXNoLnRleHQgPSBpdGVtLnR4SGFzaDtcbiAgICAgICAgICAgIHRoaXMuaGl0Q29kZS50ZXh0ID0gaXRlbS5oaXRDb2RlO1xuICAgICAgICAgICAgdGhpcy5vcGVuVGltZS50ZXh0ID0gdXRpbHMuZm9ybWF0RGF0ZVRpbWUoaXRlbS5vcGVuVGltZSk7XG4gICAgICAgICAgICB0aGlzLmpvaW5lZE51bS50ZXh0ID0gaXRlbS5qb2luZWROdW07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKirmn6XnnIvlk4jluIwgKi9cbiAgICBzZWVIYXNoKCk6dm9pZCB7XG4gICAgICAgIGNvbnN0IGRvbWFpbiA9IGRvY3VtZW50LmRvbWFpbjtcbiAgICAgICAgaWYgKGRvbWFpbi5pbmRleE9mKCd0LWNlbnRlcicpID49IDAgfHwgZG9tYWluID09PSAnbG9jYWxob3N0Jykge1xuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBgaHR0cHM6Ly9yb3BzdGVuLmV0aGVyc2Nhbi5pby90eC8ke3RoaXMuX2RhdGFTb3VyY2UudHhIYXNofWA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IGBodHRwczovL2V0aGVyc2Nhbi5pby90eC8ke3RoaXMuX2RhdGFTb3VyY2UudHhIYXNofWA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgfVxufSIsIlxuLyoqXG4gKiBAYXV0aG9yIFtTaXdlbl1cbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTIyIDExOjQwOjQyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yMiAxMTo0MDo0MlxuICogQGRlc2Mg54Gr566t5aSn5aWW5Y6G5Y+y6K6w5b2V6ISa5pysXG4gKi9cbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xuaW1wb3J0IHV0aWxzIGZyb20gXCIuLi9qcy91dGlsc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBwcmlIaXN0b3J5IGV4dGVuZHMgdWkudGVtcGxhdGUucHJpSGlzdG9yeVVJIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKVxuICAgIH1cbiAgICBzZXQgZGF0YVNvdXJjZShpdGVtOiBhbnkpIHtcbiAgICAgICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgICAgIHRoaXMucmFua05vLnRleHQgPSBpdGVtLnJhbmsgPCAxMCA/IGAwJHtpdGVtLnJhbmt9YCA6IGAke2l0ZW0ucmFua31gO1xuICAgICAgICAgICAgdGhpcy5uaWNrTmFtZS50ZXh0ID0gaXRlbS5uaWNrTmFtZTtcbiAgICAgICAgICAgIHRoaXMuVUlELnRleHQgPSBgVUlEOiAke2l0ZW0udXNlcklkfWA7XG4gICAgICAgICAgICB0aGlzLlZvbHVtZS50ZXh0ID0gYCR7dXRpbHMudG9EZWNpbWFsKGl0ZW0uY29uc3VtLDIpfSBVU0RUYFxuICAgICAgICB9XG4gICAgfVxufSBcbiIsIlxuLyoqXG4gKiBAYXV0aG9yIFtTaXdlbl1cbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTIyIDExOjQwOjQyXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0yMiAxMTo0MDo0MlxuICogQGRlc2Mg54Gr566t5aSn5aWW5o6S6KGM5qacXG4gKi9cbmltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xuaW1wb3J0IHV0aWxzIGZyb20gXCIuLi9qcy91dGlsc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBwcml4TGlzdCBleHRlbmRzIHVpLnRlbXBsYXRlLnByaXhMaXN0VUkge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpXG4gICAgfVxuICAgIHNldCBkYXRhU291cmNlKGl0ZW06IGFueSkge1xuICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgICAgdGhpcy5ubzEudmlzaWJsZSA9IGl0ZW0ucmFuayA9PT0gMSA/IHRydWUgOiBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMucmFua05vLnZpc2libGUgPSBpdGVtLnJhbmsgPT09IDEgPyBmYWxzZSA6IHRydWU7XG4gICAgICAgICAgICB0aGlzLnJhbmtOby50ZXh0ID0gaXRlbS5yYW5rO1xuICAgICAgICAgICAgdGhpcy5hdmF0YXIuc2tpbiA9IGl0ZW0uYXZhdGFyO1xuICAgICAgICAgICAgdGhpcy5uaWNrTmFtZS50ZXh0ID0gaXRlbS5uaWNrTmFtZTtcbiAgICAgICAgICAgIHRoaXMuVUlELnRleHQgPSBgVUlEOiAke2l0ZW0udXNlcklkfWA7XG4gICAgICAgICAgICB0aGlzLnRvZGF5Vm9sdW1lLnRleHQgPSBgJHt1dGlscy50b0RlY2ltYWwoaXRlbS5jb25zdW0sMil9IFVTRFRgXG4gICAgICAgIH1cbiAgICB9XG59IFxuIiwiLyoqXG4gKiBAYXV0aG9yIFtTaXdlbl1cbiAqIEBlbWFpbCBbNjIzNzQ2NTU2QHFxLmNvbV1cbiAqIEBjcmVhdGUgZGF0ZSAyMDE5LTAyLTE5IDE3OjQ5OjIzXG4gKiBAbW9kaWZ5IGRhdGUgMjAxOS0wMi0xOSAxNzo0OToyM1xuICogQGRlc2Mg5Lqk5piT5a+G56CB6L6T5YWl5by556qX6ISa5pysXG4gKi9cbmltcG9ydCB7IHVpIH0gZnJvbSAnLi4vdWkvbGF5YU1heFVJJ1xuaW1wb3J0IFRpcHNEaWFMb2cgZnJvbSAnLi90aXBEaWFsb2cnO1xuaW1wb3J0IHsgVG9hc3QgfSBmcm9tICcuLi92aWV3L1RvYXN0JztcbmltcG9ydCBHdWVzc2luZyBmcm9tICcuLi9zY3JpcHQvR3Vlc3NpbmcnO1xuaW1wb3J0IGFwaSBmcm9tICcuLi9qcy9hcGknO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBJcHRQc3dEb20gZXh0ZW5kcyB1aS50ZW1wbGF0ZS5JbnB1dFB3ZERpYWxvZ1VJIHtcblxuICAgIHByaXZhdGUgcGVyaW9kOnN0cmluZyA9ICcnOy8v5pyf5Y+3XG4gICAgcHJpdmF0ZSBjb2RlTGlzdDpzdHJpbmcgPSAnJzsvL+i0reS5sOWPt+eggVxuICAgIHByaXZhdGUgaXNFbnRlcjpib29sZWFuID0gZmFsc2U7IC8v5Ye95pWw6IqC5rWBXG4gICAgcHJpdmF0ZSBBbGxDb2RlTGlzdDphbnkgPSBbXTsvL+aJgOacieWPt+eggeWIl+ihqFxuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKClcbiAgICB9XG4gICAgb25FbmFibGUoKXtcbiAgICAgICAgdGhpcy5idG5DbG9zZS5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy5jbG9zZUZ1bmMpXG4gICAgICAgIHRoaXMuSXB0UHN3Lm9uKExheWEuRXZlbnQuRk9DVVMsdGhpcyx0aGlzLm9uRm9jdXMpXG4gICAgICAgIHRoaXMuSXB0UHN3Lm9uKExheWEuRXZlbnQuQkxVUix0aGlzLHRoaXMub25CTFVSKVxuICAgICAgICB0aGlzLklwdFBzdy5vbihMYXlhLkV2ZW50LktFWV9VUCx0aGlzLHRoaXMub25DaGFuZ2UpXG4gICAgfVxuXG4gICAgLyoq6I635Y+W5Lyg6YCS55qE5Y+C5pWwICovXG4gICAgc2V0RGF0YShkYXRhOmFueSkge1xuICAgICAgICB0aGlzLnBlcmlvZCA9IGRhdGEucGVyaW9kO1xuICAgICAgICB0aGlzLmNvZGVMaXN0ID0gZGF0YS5jb2RlTGlzdDtcbiAgICAgICAgdGhpcy5BbGxDb2RlTGlzdCA9IGRhdGEuQWxsQ29kZUxpc3Q7XG4gICAgfVxuXG4gICAgLyoq6L6T5YWl5YaF5a655pS55Y+YICovXG4gICAgcHJpdmF0ZSBvbkNoYW5nZSgpe1xuICAgICAgICBpZiAoIXRoaXMuaXNFbnRlciAmJiB0aGlzLklwdFBzdy50ZXh0Lmxlbmd0aCA9PT0gNikge1xuICAgICAgICAgICAgdGhpcy50cmFkZUJ1eSgpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKirotK3kubAgKi9cbiAgICBwcml2YXRlIHRyYWRlQnV5KCl7XG4gICAgICAgIHRoaXMuaXNFbnRlciA9IHRydWU7XG4gICAgICAgIGFwaS5wb3N0VHJhZGVCdXkodGhpcy5wZXJpb2QsdGhpcy5jb2RlTGlzdCx0aGlzLklwdFBzdy50ZXh0KS50aGVuKChyZXM6YW55KT0+e1xuICAgICAgICAgICAgdGhpcy5pc0VudGVyID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLmNsb3NlRnVuYygpO1xuXG4gICAgICAgICAgICB0aGlzLmV2ZW50KFwicmVmcmVzaERhdGFcIik7Ly/liLfmlrDmlbDmja7liJfooahcbiAgICAgICAgICAgIC8vIOi0reS5sOaIkOWKn+W8ueWHuuWvueivneahhlxuICAgICAgICAgICAgbGV0IHRpcHNEaWFsb2c6VGlwc0RpYUxvZyA9IG5ldyBUaXBzRGlhTG9nKClcbiAgICAgICAgICAgIHRpcHNEaWFsb2cucG9wdXAoKVxuICAgICAgICAgICAgdGlwc0RpYWxvZy5zZXREYXRhKHtcbiAgICAgICAgICAgICAgICBBbGxDb2RlTGlzdDp0aGlzLkFsbENvZGVMaXN0XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KS5jYXRjaCgoZXJyOmFueSk9PntcbiAgICAgICAgICAgIHRoaXMuaXNFbnRlciA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5jbG9zZUZ1bmMoKTtcblxuICAgICAgICAgICAgVG9hc3Quc2hvdyhlcnIubWVzc2FnZSlcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICAvKirlhbPpl63lr4bnoIHmoYYgKi9cbiAgICBwcml2YXRlIGNsb3NlRnVuYygpe1xuICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgIHRoaXMuSXB0UHN3LnRleHQgPSAnJztcbiAgICB9XG4gICAgLyoq6L6T5YWl5qGG6I635b6X54Sm54K5ICovXG4gICAgcHJpdmF0ZSBvbkZvY3VzKCl7XG4gICAgICAgIHRoaXMudG9wID0gMTUwO1xuICAgIH1cbiAgICAvKirovpPlhaXmoYbojrflvpfnhKbngrkgKi9cbiAgICBwcml2YXRlIG9uQkxVUigpe1xuICAgICAgIHRoaXMudG9wID0gNDQwO1xuICAgIH1cbn0iLCJcbi8qKlxuICogQGF1dGhvciBbU2l3ZW5dXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0yMiAxMTo0MDo0MlxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjIgMTE6NDA6NDJcbiAqIEBkZXNjIOeBq+eureWkp+WllueBq+eureWQjeWNlVxuICovXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcbmltcG9ydCB1dGlscyBmcm9tIFwiLi4vanMvdXRpbHNcIjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgcHJpeExpc3QgZXh0ZW5kcyB1aS50ZW1wbGF0ZS5yYW5raW5nTGlzdFVJIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKVxuICAgIH1cbiAgICBzZXQgZGF0YVNvdXJjZShpdGVtOiBhbnkpIHtcbiAgICAgICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgICAgIHRoaXMucmFua2luZy50ZXh0ID0gaXRlbS5yYW5rO1xuICAgICAgICAgICAgdGhpcy5uaWNrTmFtZS50ZXh0ID0gaXRlbS5uaWNrTmFtZS5sZW5ndGggPiA0ID8gYCR7aXRlbS5uaWNrTmFtZS5zdWJzdHIoMCw0KX0uLi5gIDogaXRlbS5uaWNrTmFtZTtcbiAgICAgICAgICAgIHRoaXMudWlkLnRleHQgPSBpdGVtLnVzZXJJZDtcbiAgICAgICAgICAgIHRoaXMuYW1vdW50LnRleHQgPSBpdGVtLmFtb3VudDtcbiAgICAgICAgfVxuICAgIH1cbn0gXG4iLCIvKipcbiAqIEBhdXRob3IgW1Npd2VuXVxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjcgMTA6MDY6MThcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTI3IDEwOjA2OjE4XG4gKiBAZGVzYyDlhYXlgLzmj5DluIHlvLnlh7rohJrmnKxcbiAqL1xuaW1wb3J0IHsgdWkgfSBmcm9tICcuLi91aS9sYXlhTWF4VUknXG4gXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSZWNoYXJnZURpYWxvZyBleHRlbmRzIHVpLnRlbXBsYXRlLnJlY2hhcmdlRGlhbG9nVUkge1xuICAgIGNvbnN0cnVjdG9yKCl7XG4gICAgICAgIHN1cGVyKClcbiAgICB9XG5cbiAgICBvbkVuYWJsZSgpe1xuICAgICAgICB0aGlzLmJ0bl9xdWlja1JlY2hhcmdlLm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLnF1aWNrUmVjaGFyZ2VGdW5jKVxuICAgICAgICB0aGlzLmJ0bl93aXRoZHJhdy5vbihMYXlhLkV2ZW50LkNMSUNLLHRoaXMsdGhpcy53aXRoZHJhd0Z1bmMpXG4gICAgfVxuXG4gICAgLyoq5b+r5o235YWF5YC8ICovXG4gICAgcHJpdmF0ZSBxdWlja1JlY2hhcmdlRnVuYygpe1xuICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IGBodHRwczovLyR7ZG9jdW1lbnQuZG9tYWlufS8jL2NoYXJnZUt1YWlCaWBcbiAgICB9XG4gICAgLyoqVVNEVOmSseWMheaPkOW4gSAqL1xuICAgIHdpdGhkcmF3RnVuYygpe1xuICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IGBodHRwczovLyR7ZG9jdW1lbnQuZG9tYWlufS8jL3dhbGxldENoYXJnZWBcbiAgICB9XG59XG5cbiIsIi8qKlxuICogQGF1dGhvciBbU2l3ZW5dXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0yNiAxMToxMjowOVxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjYgMTE6MTI6MDlcbiAqIEBkZXNjIOWFpeWbtOWQjeWNleWIl+ihqFxuICovXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3Mgc2hvcnRMaXN0Qm94IGV4dGVuZHMgdWkudGVtcGxhdGUuc2hvcnRMaXN0VUkge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpXG4gICAgfVxuICAgIHNldCBkYXRhU291cmNlKGl0ZW06IGFueSkge1xuICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgICAgdGhpcy5udW1iZXIudGV4dCA9IGl0ZW0uc2hvcnRsaXN0ZWROdW1iZXIgPCAxMCA/IGAwJHtpdGVtLnNob3J0bGlzdGVkTnVtYmVyfWAgOiBpdGVtLnNob3J0bGlzdGVkTnVtYmVyO1xuICAgICAgICAgICAgdGhpcy5uaWNrTmFtZS50ZXh0ID0gaXRlbS5uaWNrTmFtZTtcbiAgICAgICAgICAgIHRoaXMudXNlcklkLnRleHQgPSBpdGVtLnVzZXJJZDtcbiAgICAgICAgfVxuICAgIH1cbn1cbiIsIi8qKlxuICogQGF1dGhvciBbU2l3ZW5dXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo0NDowMlxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NDQ6MDJcbiAqIEBkZXNjIOi0reS5sOaIkOWKn+WQjueahOaPkOekuuahhuiEmuacrFxuICovXG5pbXBvcnQgeyB1aSB9IGZyb20gXCIuLi91aS9sYXlhTWF4VUlcIjtcbmltcG9ydCB7IFRhYmJhciB9IGZyb20gXCIuLi92aWV3L1RhYmJhclwiO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUaXBzRGlhTG9nIGV4dGVuZHMgdWkudGVtcGxhdGUuVGlwc0RpYWxvZ1VJIHtcbiAgICBwcml2YXRlIEFsbENvZGVMaXN0Om9iamVjdFtdID0gW107Ly/lj7fnoIHliJfooahcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKVxuICAgIH1cbiAgICBvbkVuYWJsZSgpe1xuICAgICAgICB0aGlzLmJ0bkNvbnRpbnVlLm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLmNsb3NlRnVuYylcbiAgICAgICAgdGhpcy5idG5WaWV3UmVjb3JkLm9uKExheWEuRXZlbnQuQ0xJQ0ssdGhpcyx0aGlzLnZpZXdSZWNvcmRGdW5jKVxuICAgICAgICBcbiAgICB9XG5cbiAgICAvKirojrflj5bkvKDpgJLnmoTlj4LmlbAgKi9cbiAgICBzZXREYXRhKGRhdGE6YW55KSB7XG4gICAgICAgIHRoaXMuQWxsQ29kZUxpc3QgPSBkYXRhLkFsbENvZGVMaXN0O1xuICAgIH1cblxuICAgIC8qKuWFs+mXreWvhueggeahhiAqL1xuICAgIHByaXZhdGUgY2xvc2VGdW5jKCl7XG5cbiAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAvLyDoi6Xlhajpg6jooqvotK3kubDvvIzliJnlm57liLDpppbpobXph43mlrDpgInmi6notK3kubDmnJ/lj7dcbiAgICAgICAgbGV0IGNvdW50Om51bWJlciA9IDA7XG4gICAgICAgIHRoaXMuQWxsQ29kZUxpc3QuZm9yRWFjaCgodjphbnkpID0+IHtcbiAgICAgICAgICAgIGlmICh2LmJ1eWVySWQgIT09ICcwJykge1xuICAgICAgICAgICAgICAgIGNvdW50ID0gY291bnQgKyAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGNvdW50ID09PSB0aGlzLkFsbENvZGVMaXN0Lmxlbmd0aCkge1xuICAgICAgICAgICAgVGFiYmFyLmdldEluc3RhbmNlKCkub3BlblNjZW5lKCdob21lLnNjZW5lJylcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIOafpeeci+iusOW9lVxuICAgIHByaXZhdGUgdmlld1JlY29yZEZ1bmMoKXtcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICBUYWJiYXIuZ2V0SW5zdGFuY2UoKS5vcGVuU2NlbmUoJ3JlY29yZC5zY2VuZScpXG4gICAgfVxufSIsIi8qKlxuICogQGF1dGhvciBbU2l3ZW5dXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0yMSAxNjozMjowMVxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMjEgMTY6MzI6MDFcbiAqIEBkZXNjIOi1sOWKv+WIl+ihqOiEmuacrFxuICovXG5pbXBvcnQgeyB1aSB9IGZyb20gJy4uL3VpL2xheWFNYXhVSSdcbmltcG9ydCB1dGlscyBmcm9tICcuLi9qcy91dGlscyc7XG5pbXBvcnQgeyBUYWJiYXIgfSBmcm9tICcuLi92aWV3L1RhYmJhcic7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHRyZW5kTGlzdCBleHRlbmRzIHVpLnRlbXBsYXRlLnRyZW5kTGlzdFVJIHtcbiAgICBwcml2YXRlIF9pdGVtOmFueTtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKVxuICAgICAgICB0aGlzLmJ0bl9idXkub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuYnRuQnV5RnVuYylcbiAgICB9XG4gICAgc2V0IGRhdGFTb3VyY2UoaXRlbTphbnkpe1xuICAgICAgICB0aGlzLl9pdGVtID0gaXRlbTtcbiAgICAgICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgICAgIHRoaXMucGVyaW9kLnRleHQgPSBpdGVtLnBlcmlvZDtcbiAgICAgICAgICAgIHRoaXMuaGl0Q29kZS50ZXh0ID0gaXRlbS5oaXRDb2RlO1xuICAgICAgICAgICAgdGhpcy5vZGRfZXZlbi50ZXh0ID0gaXRlbS5pcyA9PT0gMCA/ICctJyA6ICBpdGVtLmlzID09PSAxID8gJ+WlhycgOiAn5YG2JztcbiAgICAgICAgICAgIHRoaXMuaXNCaWcudGV4dCA9IGl0ZW0uaXMgPT09IDAgPyAnLScgOiBpdGVtLmlzQmlnID8gJ+WkpycgOiAn5bCPJztcblxuICAgICAgICAgICAgaWYgKGl0ZW0uaXMgPT09IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmJ0bl9idXkudmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5oaXRDb2RlLnZpc2libGUgPSBmYWxzZTtcbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgIHRoaXMuYnRuX2J1eS52aXNpYmxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdGhpcy5oaXRDb2RlLnZpc2libGUgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8g5aWH5YG25paH5a2X6aKc6ImyXG4gICAgICAgICAgICBpZiAoaXRlbS5pcyA9PT0gMSkge1xuICAgICAgICAgICAgICAgIHRoaXMub2RkX2V2ZW4uY29sb3IgPSAnI2YxNDg0OCc7XG4gICAgICAgICAgICB9ZWxzZSBpZihpdGVtLmlzID09PSAyKXtcbiAgICAgICAgICAgICAgICB0aGlzLm9kZF9ldmVuLmNvbG9yID0gJyMyNWZmZmQnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8g5aSn5bCP5paH5a2X6aKc6ImyXG4gICAgICAgICAgICBpZiAoIWl0ZW0uaXNCaWcgJiYgaXRlbS5pcyAhPT0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuaXNCaWcuY29sb3IgPSAnI2YxNDg0OCc7XG4gICAgICAgICAgICB9ZWxzZSBpZihpdGVtLmlzQmlnICYmIGl0ZW0uaXMgIT09IDApe1xuICAgICAgICAgICAgICAgIHRoaXMuaXNCaWcuY29sb3IgPSAnIzI1ZmZmZCc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKirnq4vljbPotK3kubAgKi9cbiAgICBwcml2YXRlIGJ0bkJ1eUZ1bmMoKXtcbiAgICAgICAgaWYgKHRoaXMuX2l0ZW0gIT09IG51bGwpIHtcbiAgICAgICAgICAgIFRhYmJhci5nZXRJbnN0YW5jZSgpLm9wZW5TY2VuZSgnZ3Vlc3Npbmcuc2NlbmUnLHRoaXMuX2l0ZW0uZ29vZHNJZClcbiAgICAgICAgfVxuICAgIH1cbn0iLCIvKipcbiAqIEBhdXRob3IgW1Npd2VuXVxuICogQGVtYWlsIFs2MjM3NDY1NTZAcXEuY29tXVxuICogQGNyZWF0ZSBkYXRlIDIwMTktMDItMjYgMTA6MjE6MzdcbiAqIEBtb2RpZnkgZGF0ZSAyMDE5LTAyLTI2IDEwOjIxOjM3XG4gKiBAZGVzYyDllpzku47lpKnpmY3kuK3lpZblkI3ljZXliJfooajohJrmnKxcbiAqL1xuaW1wb3J0IHsgdWkgfSBmcm9tIFwiLi4vdWkvbGF5YU1heFVJXCI7XG5pbXBvcnQgdXRpbHMgZnJvbSBcIi4uL2pzL3V0aWxzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFdpbm5pbmdMaXN0IGV4dGVuZHMgdWkudGVtcGxhdGUud2lubmluZ0xpc3RVSSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKClcbiAgICB9XG4gICAgc2V0IGRhdGFTb3VyY2UoaXRlbTogYW55KSB7XG4gICAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgICAgICB0aGlzLnBlcmlvZC50ZXh0ID0gaXRlbS5iZWxvbmdUaW1lO1xuICAgICAgICAgICAgdGhpcy5kYXRlLnRleHQgPSB1dGlscy5mb3JtYXREYXRlVGltZShpdGVtLmJhbGFuY2VUaW1lKTtcbiAgICAgICAgICAgIHRoaXMubmlja05hbWUudGV4dCA9IGl0ZW0ubmlja05hbWU7XG4gICAgICAgICAgICB0aGlzLmFtb3VudC50ZXh0ID0gYCR7K2l0ZW0ubW9uZXl9IFVTRFRgO1xuICAgICAgICAgICAgdGhpcy5jb2RlLnRleHQgPSBpdGVtLmhpdE51bWJlcjtcbiAgICAgICAgfVxuICAgIH1cbn1cbiIsIi8qKlRoaXMgY2xhc3MgaXMgYXV0b21hdGljYWxseSBnZW5lcmF0ZWQgYnkgTGF5YUFpcklERSwgcGxlYXNlIGRvIG5vdCBtYWtlIGFueSBtb2RpZmljYXRpb25zLiAqL1xuaW1wb3J0IFZpZXc9TGF5YS5WaWV3O1xyXG5pbXBvcnQgRGlhbG9nPUxheWEuRGlhbG9nO1xyXG5pbXBvcnQgU2NlbmU9TGF5YS5TY2VuZTtcbmV4cG9ydCBtb2R1bGUgdWkge1xyXG4gICAgZXhwb3J0IGNsYXNzIGFzc2lzdGFudFVJIGV4dGVuZHMgTGF5YS5TY2VuZSB7XHJcblx0XHRwdWJsaWMgYnRuX3RyZW5kOkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIGJ0bl9wcmVidXk6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgY2F0ZVRhYkxpc3Q6TGF5YS5MaXN0O1xuXHRcdHB1YmxpYyBsaXN0VGl0bGU6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIHRyZW5kTGlzdDpMYXlhLkxpc3Q7XG5cdFx0cHVibGljIHByZWJ1eTpMYXlhLkxpc3Q7XG5cdFx0cHVibGljIG5vRGF0YTpMYXlhLkltYWdlO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwiYXNzaXN0YW50XCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBDYXJkVUkgZXh0ZW5kcyBMYXlhLlZpZXcge1xyXG5cdFx0cHVibGljIGFuaTE6TGF5YS5GcmFtZUFuaW1hdGlvbjtcblx0XHRwdWJsaWMgY2FyZEl0ZW06TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgc2NlbmVJbWc6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgZ29vZHNOYW1lOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHByb2dyZXNzOkxheWEuUHJvZ3Jlc3NCYXI7XG5cdFx0cHVibGljIHNvbGROdW1fdG90YWxOdW06TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgYXdhcmQ6TGF5YS5MYWJlbDtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcIkNhcmRcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIGdyYW5kUHJpeFVJIGV4dGVuZHMgTGF5YS5TY2VuZSB7XHJcblx0XHRwdWJsaWMgQ291bnREb3duOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGJvbnVzOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGJ0bl9oaXN0b3J5OkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyByYW5rUHJpemVIZWxwOkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyBsaXN0Qm94OkxheWEuUGFuZWw7XG5cdFx0cHVibGljIGJveDE6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIGFsb25lMTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBQcm9wb3J0aW9uMTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBwcml4TGlzdDE6TGF5YS5MaXN0O1xuXHRcdHB1YmxpYyBib3gyOkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyBhbG9uZTI6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgUHJvcG9ydGlvbjI6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgcHJpeExpc3QyOkxheWEuTGlzdDtcblx0XHRwdWJsaWMgYm94MzpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgYWxvbmUzOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIFByb3BvcnRpb24zOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHByaXhMaXN0MzpMYXlhLkxpc3Q7XG5cdFx0cHVibGljIG5vRGF0YTpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBteVJhbmtCb3g6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgbXlyYW5raW5nOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGF2YXRhcjpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBuaWNrTmFtZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyB1aWQ6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgdm9sdW1lVGl0bGU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgdm9sdW1lOkxheWEuTGFiZWw7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJncmFuZFByaXhcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIGd1ZXNzaW5nVUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyBwcmljZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBnb29kc1ZhbHVlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHByb2dyZXNzU3BlZWQ6TGF5YS5Qcm9ncmVzc0Jhcjtcblx0XHRwdWJsaWMgc29sZE51bV9zb2xkTnVtOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHBlcmlvZDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBudW1iZXJMaXN0OkxheWEuTGlzdDtcblx0XHRwdWJsaWMgZXN0aW1hdGU6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIHRvdGFsOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGJhbGFuY2VCb3g6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIGJhbGFuY2U6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgYnRuX2J1eTpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBidG5fc2VsZWN0OkxheWEuVmlldztcblx0XHRwdWJsaWMgcmFuZG9tX29uZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyByYW5kb21fYmVmb3JlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHJhbmRvbV9hZnRlcjpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyByYW5kb21fYWxsOkxheWEuTGFiZWw7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJndWVzc2luZ1wiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgaG9tZVVJIGV4dGVuZHMgTGF5YS5TY2VuZSB7XHJcblx0XHRwdWJsaWMgcHV0X2luOkxheWEuRnJhbWVBbmltYXRpb247XG5cdFx0cHVibGljIHJvY2tldF9zaG93OkxheWEuRnJhbWVBbmltYXRpb247XG5cdFx0cHVibGljIGRvbV9zaG93OkxheWEuRnJhbWVBbmltYXRpb247XG5cdFx0cHVibGljIGJnX2FuaTpMYXlhLkZyYW1lQW5pbWF0aW9uO1xuXHRcdHB1YmxpYyBiZ19hbmkyOkxheWEuRnJhbWVBbmltYXRpb247XG5cdFx0cHVibGljIGJnX2FuaW1hdGlvbjpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgZ29fY2VudGVyOkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyB0dWljaHU6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgQWNjb3VudEJveDpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBhdmF0YXI6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgbmlja05hbWU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgcmVjaGFyZ2VCb3g6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgYnRuUmVjaGFyZ2U6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgbXlBbW91bnQ6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgYnV5SGVscDpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgcm9ja2VyQm94OkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyByb2NrZXRBbW91bnQ6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgY291bnREb3duOkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyByb2NrZXRDb3VudERvd246TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgbGlzdDpMYXlhLkxpc3Q7XG5cdFx0cHVibGljIHB1dGluOkxheWEuSW1hZ2U7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJob21lXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBsb2FkaW5nU2NlbmVVSSBleHRlbmRzIExheWEuU2NlbmUge1xyXG5cdFx0cHVibGljIGFuaTE6TGF5YS5GcmFtZUFuaW1hdGlvbjtcblx0XHRwdWJsaWMgbG9hZGluZ1Byb2dyZXNzOkxheWEuUHJvZ3Jlc3NCYXI7XG5cdFx0cHVibGljIHByb2dyZXNzOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHJvY2tldGxvYWRpbmc6TGF5YS5JbWFnZTtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcImxvYWRpbmdTY2VuZVwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgcHJpSGlzdG9yeVNjZW5lVUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyB0b3RhbDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBsaXN0Qm94OkxheWEuUGFuZWw7XG5cdFx0cHVibGljIGJveDE6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIGFsb25lMTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBQcm9wb3J0aW9uMTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBwcml4TGlzdDE6TGF5YS5MaXN0O1xuXHRcdHB1YmxpYyBib3gyOkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyBhbG9uZTI6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgUHJvcG9ydGlvbjI6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgcHJpeExpc3QyOkxheWEuTGlzdDtcblx0XHRwdWJsaWMgYm94MzpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgYWxvbmUzOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIFByb3BvcnRpb24zOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHByaXhMaXN0MzpMYXlhLkxpc3Q7XG5cdFx0cHVibGljIG5vRGF0YTpMYXlhLkltYWdlO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwicHJpSGlzdG9yeVNjZW5lXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyByZWNvcmRVSSBleHRlbmRzIExheWEuU2NlbmUge1xyXG5cdFx0cHVibGljIGNhbnl1OkxheWEuSW1hZ2U7XG5cdFx0cHVibGljIHdhbmdxaTpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBqb2luTGlzdDpMYXlhLkxpc3Q7XG5cdFx0cHVibGljIHByZXZpb291c0xpc3Q6TGF5YS5MaXN0O1xuXHRcdHB1YmxpYyBub0RhdGE6TGF5YS5JbWFnZTtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInJlY29yZFwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3Mgc2hvcnRMaXN0ZWRVSSBleHRlbmRzIExheWEuU2NlbmUge1xyXG5cdFx0cHVibGljIHNob3J0TGlzdDpMYXlhLkxpc3Q7XG5cdFx0cHVibGljIG5vRGF0YTpMYXlhLkltYWdlO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwic2hvcnRMaXN0ZWRcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIFRhYmJhclVJIGV4dGVuZHMgTGF5YS5WaWV3IHtcclxuXHRcdHB1YmxpYyB0YWI6TGF5YS5UYWI7XG5cdFx0cHVibGljIG5vdGljZTpMYXlhLlNwcml0ZTtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcIlRhYmJhclwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgeGN0alVJIGV4dGVuZHMgTGF5YS5TY2VuZSB7XHJcblx0XHRwdWJsaWMgeGN0al9zaHVvbWluZzpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgYW1vdW50OkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHVuaXQ6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgY291bnREb3duOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGJ0bl9zaG9ydGxpc3Q6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgd2lubmluZ19jb2RlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHdpbm5pbmdMaXN0OkxheWEuTGlzdDtcblx0XHRwdWJsaWMgbm9EYXRhOkxheWEuSW1hZ2U7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJ4Y3RqXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5leHBvcnQgbW9kdWxlIHVpLnRlbXBsYXRlIHtcclxuICAgIGV4cG9ydCBjbGFzcyBJbnB1dFB3ZERpYWxvZ1VJIGV4dGVuZHMgTGF5YS5EaWFsb2cge1xyXG5cdFx0cHVibGljIHRpdGxlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGJ0bkNsb3NlOkxheWEuQm94O1xuXHRcdHB1YmxpYyBJcHRQc3c6TGF5YS5UZXh0SW5wdXQ7XG5cdFx0cHVibGljIGZvcmdldFBhc3N3b3JkOkxheWEuTGFiZWw7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJ0ZW1wbGF0ZS9JbnB1dFB3ZERpYWxvZ1wiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3Mgam9pblJlY29yZHNVSSBleHRlbmRzIExheWEuVmlldyB7XHJcblx0XHRwdWJsaWMgcGVyaW9kOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIG5vUHJpemU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgcHJpemU6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgZ29vZHNWYWx1ZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBvcGVuVGltZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBoaXRDb2RlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGNvZGVMaXN0OkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGF3YXJkOkxheWEuTGFiZWw7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJ0ZW1wbGF0ZS9qb2luUmVjb3Jkc1wiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgbnVtYmVyTGlzdERPTVVJIGV4dGVuZHMgTGF5YS5WaWV3IHtcclxuXHRcdHB1YmxpYyBiZ0ltZzpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBjb2RlOkxheWEuTGFiZWw7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJ0ZW1wbGF0ZS9udW1iZXJMaXN0RE9NXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBwcmV2aW91c1JlY29yZHNVSSBleHRlbmRzIExheWEuVmlldyB7XHJcblx0XHRwdWJsaWMgcGVyaW9kOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGdvb2RzTmFtZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyB0eEhhc2g6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgaGl0Q29kZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBvcGVuVGltZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBqb2luZWROdW06TGF5YS5MYWJlbDtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInRlbXBsYXRlL3ByZXZpb3VzUmVjb3Jkc1wiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgcHJpSGlzdG9yeVVJIGV4dGVuZHMgTGF5YS5TY2VuZSB7XHJcblx0XHRwdWJsaWMgcmFua05vOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIG5pY2tOYW1lOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIFVJRDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBWb2x1bWU6TGF5YS5MYWJlbDtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInRlbXBsYXRlL3ByaUhpc3RvcnlcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIHByaXhMaXN0VUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyBubzE6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgcmFua05vOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGF2YXRhcjpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBuaWNrTmFtZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBVSUQ6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgdG9kYXlWb2x1bWVUaXRsZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyB0b2RheVZvbHVtZTpMYXlhLkxhYmVsO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwidGVtcGxhdGUvcHJpeExpc3RcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIHJhbmtpbmdMaXN0VUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyByYW5raW5nOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIG5pY2tOYW1lOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIHVpZDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBhbW91bnQ6TGF5YS5MYWJlbDtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInRlbXBsYXRlL3JhbmtpbmdMaXN0XCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyByZWNoYXJnZURpYWxvZ1VJIGV4dGVuZHMgTGF5YS5EaWFsb2cge1xyXG5cdFx0cHVibGljIGJ0bl9xdWlja1JlY2hhcmdlOkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyBidG5fd2l0aGRyYXc6TGF5YS5TcHJpdGU7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJ0ZW1wbGF0ZS9yZWNoYXJnZURpYWxvZ1wiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3Mgc2hvcnRMaXN0VUkgZXh0ZW5kcyBMYXlhLlNjZW5lIHtcclxuXHRcdHB1YmxpYyBudW1iZXI6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgbmlja05hbWU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgdXNlcklkOkxheWEuTGFiZWw7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJ0ZW1wbGF0ZS9zaG9ydExpc3RcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIHNob3dSb2NrZXRVSSBleHRlbmRzIExheWEuRGlhbG9nIHtcclxuXHRcdHB1YmxpYyBhbmkxOkxheWEuRnJhbWVBbmltYXRpb247XG5cdFx0cHVibGljIGFuaTI6TGF5YS5GcmFtZUFuaW1hdGlvbjtcblx0XHRwdWJsaWMgc2hvd2FuaTE6TGF5YS5BbmltYXRpb247XG5cdFx0cHVibGljIHNob3dhbmkyOkxheWEuQW5pbWF0aW9uO1xuXHRcdHB1YmxpYyBidG5fY2xvc2U6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIHJhbmtpbmc6TGF5YS5MaXN0O1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwidGVtcGxhdGUvc2hvd1JvY2tldFwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgVGlwc0RpYWxvZ1VJIGV4dGVuZHMgTGF5YS5EaWFsb2cge1xyXG5cdFx0cHVibGljIHRpdGxlOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGJ0blZpZXdSZWNvcmQ6TGF5YS5JbWFnZTtcblx0XHRwdWJsaWMgYnRuQ29udGludWU6TGF5YS5JbWFnZTtcbiAgICAgICAgY29uc3RydWN0b3IoKXsgc3VwZXIoKX1cclxuICAgICAgICBjcmVhdGVDaGlsZHJlbigpOnZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jcmVhdGVDaGlsZHJlbigpO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRTY2VuZShcInRlbXBsYXRlL1RpcHNEaWFsb2dcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIHRyZW5kTGlzdFVJIGV4dGVuZHMgTGF5YS5TY2VuZSB7XHJcblx0XHRwdWJsaWMgcGVyaW9kOkxheWEuTGFiZWw7XG5cdFx0cHVibGljIGhpdENvZGU6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgYnRuX2J1eTpMYXlhLkltYWdlO1xuXHRcdHB1YmxpYyBvZGRfZXZlbjpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBpc0JpZzpMYXlhLkxhYmVsO1xuICAgICAgICBjb25zdHJ1Y3RvcigpeyBzdXBlcigpfVxyXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuKCk6dm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFNjZW5lKFwidGVtcGxhdGUvdHJlbmRMaXN0XCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyB3aW5uaW5nTGlzdFVJIGV4dGVuZHMgTGF5YS5TY2VuZSB7XHJcblx0XHRwdWJsaWMgcGVyaW9kQm94OkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyBwZXJpb2Q6TGF5YS5MYWJlbDtcblx0XHRwdWJsaWMgZGF0ZUJveDpMYXlhLlNwcml0ZTtcblx0XHRwdWJsaWMgZGF0ZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBuYW1lQm94OkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyBuaWNrTmFtZTpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBhbW91bnRCb3g6TGF5YS5TcHJpdGU7XG5cdFx0cHVibGljIGFtb3VudDpMYXlhLkxhYmVsO1xuXHRcdHB1YmxpYyBjb2RlQm94OkxheWEuU3ByaXRlO1xuXHRcdHB1YmxpYyBjb2RlOkxheWEuTGFiZWw7XG4gICAgICAgIGNvbnN0cnVjdG9yKCl7IHN1cGVyKCl9XHJcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW4oKTp2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY3JlYXRlQ2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkU2NlbmUoXCJ0ZW1wbGF0ZS93aW5uaW5nTGlzdFwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cciIsImV4cG9ydCBjb25zdCBMYXllclR5cGUgPSB7XG4gICAgTEFZRVJfU0NFTkU6IFwiTEFZRVJfU0NFTkVcIixcbiAgICBMQVlFUl9VSTogXCJMQVlFUl9VSVwiLFxuICAgIExBWUVSX01TRzogXCJMQVlFUl9NU0dcIlxufVxuY29uc3QgbGF5ZXJNYXAgPSB7fTtcblxuZXhwb3J0IGNsYXNzIExheWVyTWFuYWdlciB7XG4gICAgc3RhdGljIGluaXRlZDogYm9vbGVhbjtcbiAgICBzdGF0aWMgaW5pdChsYXllcnM6IHN0cmluZ1tdKSB7XG4gICAgICAgIGxheWVycy5mb3JFYWNoKChsYXllck5hbWU6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgaWYgKGxheWVyTmFtZSA9PT0gTGF5ZXJUeXBlLkxBWUVSX1NDRU5FKSB7XG4gICAgICAgICAgICAgICAgbGF5ZXJNYXBbbGF5ZXJOYW1lXSA9IExheWEuU2NlbmUucm9vdDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbGF5ZXI6IExheWEuVUlDb21wb25lbnQgPSBsYXllck1hcFtsYXllck5hbWVdID0gbmV3IExheWEuVUlDb21wb25lbnQoKTtcbiAgICAgICAgICAgICAgICBsYXllci5sZWZ0ID0gMDtcbiAgICAgICAgICAgICAgICBsYXllci5yaWdodCA9IDA7XG4gICAgICAgICAgICAgICAgbGF5ZXIudG9wID0gMDtcbiAgICAgICAgICAgICAgICBsYXllci5ib3R0b20gPSAwO1xuICAgICAgICAgICAgICAgIExheWEuc3RhZ2UuYWRkQ2hpbGQobGF5ZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgLy8gTGF5YS5zdGFnZS5vbihMYXlhLkV2ZW50LlJFU0laRSwgdGhpcywgdGhpcy5vblJlc2l6ZSk7XG4gICAgfVxuXG4gICAgc3RhdGljIGFkZFRvTGF5ZXIobm9kZTogTGF5YS5Ob2RlLCBsYXllck5hbWUpOiBCb29sZWFuIHtcbiAgICAgICAgTGF5ZXJNYW5hZ2VyLmNoZWNrSW5pdCgpO1xuICAgICAgICBpZiAoIW5vZGUpIHJldHVybiBmYWxzZTtcbiAgICAgICAgY29uc3QgbGF5ZXIgPSBsYXllck1hcFtsYXllck5hbWVdO1xuICAgICAgICBpZiAoIWxheWVyKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGxheWVyLmFkZENoaWxkKG5vZGUpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBzdGF0aWMgcmVtb3ZlRnJvbUxheWVyKG5vZGU6IExheWEuTm9kZSwgbGF5ZXJOYW1lKTogQm9vbGVhbiB7XG4gICAgICAgIExheWVyTWFuYWdlci5jaGVja0luaXQoKTtcbiAgICAgICAgY29uc3QgbGF5ZXI6IExheWEuVUlDb21wb25lbnQgPSBsYXllck1hcFtsYXllck5hbWVdO1xuICAgICAgICBpZiAobGF5ZXIpIHtcbiAgICAgICAgICAgIGNvbnN0IHJOb2RlOiBMYXlhLk5vZGUgPSBsYXllci5yZW1vdmVDaGlsZChub2RlKVxuICAgICAgICAgICAgaWYgKHJOb2RlKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgc3RhdGljIGdldExheWVyKGxheWVyTmFtZSk6IExheWEuQ29tcG9uZW50IHtcbiAgICAgICAgcmV0dXJuIGxheWVyTWFwW2xheWVyTmFtZV07XG4gICAgfVxuXG4gICAgc3RhdGljIGNoZWNrSW5pdCgpIHtcbiAgICAgICAgaWYgKExheWVyTWFuYWdlci5pbml0ZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBMYXllck1hbmFnZXIuaW5pdChbXG4gICAgICAgICAgICBMYXllclR5cGUuTEFZRVJfU0NFTkUsXG4gICAgICAgICAgICBMYXllclR5cGUuTEFZRVJfVUksXG4gICAgICAgICAgICBMYXllclR5cGUuTEFZRVJfTVNHXG4gICAgICAgIF0pO1xuICAgICAgICBMYXllck1hbmFnZXIuaW5pdGVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHN0YXRpYyBvblJlc2l6ZSgpOiB2b2lkIHtcbiAgICAgICAgZm9yIChjb25zdCBsYXllck5hbWUgaW4gbGF5ZXJNYXApIHtcbiAgICAgICAgICAgIGlmIChsYXllck5hbWUgIT09IExheWVyVHlwZS5MQVlFUl9TQ0VORSAmJiBsYXllck1hcC5oYXNPd25Qcm9wZXJ0eShsYXllck5hbWUpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbGF5ZXI6IExheWEuVUlDb21wb25lbnQgPSBsYXllck1hcFtsYXllck5hbWVdO1xuICAgICAgICAgICAgICAgIGxheWVyLnNpemUoTGF5YS5zdGFnZS53aWR0aCwgTGF5YS5zdGFnZS5oZWlnaHQpO1xuICAgICAgICAgICAgICAgIGxheWVyLmV2ZW50KExheWEuRXZlbnQuUkVTSVpFKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxufSIsIi8qKlxuICogQGF1dGhvciBbU2l3ZW5dXG4gKiBAZW1haWwgWzYyMzc0NjU1NkBxcS5jb21dXG4gKiBAY3JlYXRlIGRhdGUgMjAxOS0wMi0xOSAxNzo1MDoxMFxuICogQG1vZGlmeSBkYXRlIDIwMTktMDItMTkgMTc6NTA6MTBcbiAqIEBkZXNjIOW6lemDqOWvvOiIqlRhYmJhcuiEmuacrFxuICovXG5pbXBvcnQgeyB1aSB9IGZyb20gJy4uL3VpL2xheWFNYXhVSSdcbmltcG9ydCB7IEdhbWVNb2RlbCB9IGZyb20gJy4uL2pzL0dhbWVNb2RlbCc7XG5cbmNvbnN0IHRhYmJhckFycjpzdHJpbmdbXSA9IFsnaG9tZS5zY2VuZScsJ3JlY29yZC5zY2VuZScsJ2Fzc2lzdGFudC5zY2VuZSddIC8vdGFiYmFy55qE6aG16Z2iXG5jb25zdCBwYWdlQXJyOnN0cmluZ1tdID0gW1xuICAgICdndWVzc2luZy5zY2VuZScsJ2dyYW5kUHJpeC5zY2VuZScsXG4gICAgJ3ByaUhpc3RvcnlTY2VuZS5zY2VuZScsJ3hjdGouc2NlbmUnLFxuICAgICdzaG9ydExpc3RlZC5zY2VuZSdcbl0gLy/pnZ50YWJiYXLpobXpnaJcblxuZXhwb3J0IGNsYXNzIFRhYmJhciBleHRlbmRzIHVpLlRhYmJhclVJIHtcbiAgICAvKirpobXpnaLkvKDpgJLnmoTlj4LmlbAgKi9cbiAgICBwcml2YXRlIF9vcGVuU2NlbmVQYXJhbTogYW55O1xuICAgIC8qKumAieS4reeahHRhYmJhciAqL1xuICAgIHN0YXRpYyBfdGFiYmFyOlRhYmJhcjtcbiAgICAvKirpobXpnaLmlbDnu4QgKi9cbiAgICBzdGF0aWMgcmVhZG9ubHkgU0NFTkVTOnN0cmluZ1tdID0gWy4uLnRhYmJhckFyciwuLi5wYWdlQXJyXVxuXG4gICAgc3RhdGljIGdldEluc3RhbmNlKCk6VGFiYmFyIHtcbiAgICAgICAgaWYoIXRoaXMuX3RhYmJhcil7XG4gICAgICAgICAgICB0aGlzLl90YWJiYXIgPSBuZXcgVGFiYmFyKClcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fdGFiYmFyO1xuICAgIH1cblxuICAgIHN0YXRpYyBzaG93KCl7XG4gICAgICAgIGxldCB0YWJJbnM6VGFiYmFyID0gdGhpcy5nZXRJbnN0YW5jZSgpXG4gICAgICAgIExheWEuc3RhZ2UuYWRkQ2hpbGQodGFiSW5zKVxuICAgIH1cbiAgICBzdGF0aWMgaGlkZSgpe1xuICAgICAgICBpZih0aGlzLl90YWJiYXIpe1xuICAgICAgICAgICAgdGhpcy5fdGFiYmFyLnJlbW92ZVNlbGYoKVxuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICBvbkVuYWJsZSgpe1xuICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5vbignZ2V0Tm90aWNlJyx0aGlzLChyZXM6YW55KT0+e1xuICAgICAgICAgICAgaWYgKHJlcykge1xuICAgICAgICAgICAgICAgIHRoaXMubm90aWNlLnZpc2libGUgPSB0cnVlO1xuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgdGhpcy5ub3RpY2UudmlzaWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIC8qKumdnnRhYmJhcui3s+i9rOmhtemdoizlj6/mkLrluKblj4LmlbAgKi9cbiAgICBvcGVuU2NlbmUoc2NlbmU6IHN0cmluZywgcGFyYW0/OiBhbnkpIHtcbiAgICAgICAgdGhpcy5fb3BlblNjZW5lUGFyYW0gPSBwYXJhbTtcbiAgICAgICAgdGhpcy50YWIuc2VsZWN0ZWRJbmRleCA9IFRhYmJhci5TQ0VORVMuaW5kZXhPZihzY2VuZSk7XG4gICAgfVxuXG4gICAgLyoq55uR6KeGdGFiYmFy5pS55Y+YICovXG4gICAgY3JlYXRlVmlldyh2aWV3OmFueSl7XG4gICAgICAgIHN1cGVyLmNyZWF0ZVZpZXcodmlldylcbiAgICAgICAgdGhpcy50YWIub24oTGF5YS5FdmVudC5DSEFOR0UsdGhpcyx0aGlzLm9uQ2xpY2tUYWIpO1xuICAgICAgICAvLyB0aGlzLm9uQ2xpY2tUYWIoKTtcbiAgICB9XG4gICAgXG5cbiAgICAvKirngrnlh7t0YWJiYXLkuovku7YgKi9cbiAgICBvbkNsaWNrVGFiKCkge1xuICAgICAgICBsZXQgdXNlckluZm8gPSBPYmplY3Qua2V5cyhHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS51c2VySW5mbyk7XG4gICAgICAgIGxldCBzY2VuZTpzdHJpbmcgPSBUYWJiYXIuU0NFTkVTW3RoaXMudGFiLnNlbGVjdGVkSW5kZXhdO1xuICAgICAgICBpZiAodXNlckluZm8ubGVuZ3RoID09PSAwICYmIChzY2VuZSA9PT0gJ3JlY29yZC5zY2VuZScgfHwgc2NlbmUgPT09ICdhc3Npc3RhbnQuc2NlbmUnKSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ+acqueZu+W9lei3s+i9rOeZu+W9lScpO1xuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBgaHR0cHM6Ly8ke2RvY3VtZW50LmRvbWFpbn0vIy9zaWduX29uZWBcbiAgICAgICAgfWVsc2Uge1xuICAgICAgICAgICAgTGF5YS5TY2VuZS5vcGVuKHNjZW5lLCB0cnVlLCB0aGlzLl9vcGVuU2NlbmVQYXJhbSk7XG4gICAgICAgICAgICB0aGlzLl9vcGVuU2NlbmVQYXJhbSA9IG51bGw7XG4gICAgICAgICAgICB0aGlzLnRhYi5pdGVtcy5mb3JFYWNoKGl0ZW09PntcbiAgICAgICAgICAgICAgICBjb25zdCB0YWJCdG46IExheWEuQnV0dG9uID0gaXRlbSBhcyBMYXlhLkJ1dHRvbjtcbiAgICAgICAgICAgICAgICBjb25zdCBpbWdCdG46IExheWEuQnV0dG9uID0gdGFiQnRuLmdldENoaWxkQXQoMCkgYXMgTGF5YS5CdXR0b247XG4gICAgICAgICAgICAgICAgaW1nQnRuLnNlbGVjdGVkID0gZmFsc2U7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgdGFiYmFyQXJyLmZvckVhY2goaXRlbT0+e1xuICAgICAgICAgICAgICAgIGlmIChpdGVtID09PSBzY2VuZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0YWJCdG46IExheWEuQnV0dG9uID0gdGhpcy50YWIuc2VsZWN0aW9uIGFzIExheWEuQnV0dG9uO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbWdCdG46IExheWEuQnV0dG9uID0gdGFiQnRuLmdldENoaWxkQXQoMCkgYXMgTGF5YS5CdXR0b247XG4gICAgICAgICAgICAgICAgICAgIGltZ0J0bi5zZWxlY3RlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC8v5YWz6Zet5bCP57qi54K5XG4gICAgICAgICAgICBpZiAoc2NlbmUgPT09ICdyZWNvcmQuc2NlbmUnKSB7XG4gICAgICAgICAgICAgICAgR2FtZU1vZGVsLmdldEluc3RhbmNlKCkubm90aWNlRnVuYyhmYWxzZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn0iLCJpbXBvcnQgeyBMYXllck1hbmFnZXIsIExheWVyVHlwZSB9IGZyb20gXCIuL0xheWVyTWFuYWdlclwiO1xuXG5leHBvcnQgY2xhc3MgVG9hc3QgZXh0ZW5kcyBMYXlhLlVJQ29tcG9uZW50IHtcblxuICAgIHN0YXRpYyBNSU5fV0lEVEg6IG51bWJlciA9IDIwMDtcbiAgICBzdGF0aWMgTUFYX1dJRFRIOiBudW1iZXIgPSA1MDA7XG4gICAgc3RhdGljIFRPUDogbnVtYmVyID0gMjM7XG4gICAgc3RhdGljIEJPVFRPTTogbnVtYmVyID0gMjA7XG4gICAgc3RhdGljIE1BUkdJTjogbnVtYmVyID0gMTU7XG4gICAgc3RhdGljIE1JTl9IRUlHSFQ6IG51bWJlciA9IDgwO1xuICAgIHN0YXRpYyBGT05UX1NJWkU6IG51bWJlciA9IDI2O1xuICAgIHN0YXRpYyBDT0xPUjogc3RyaW5nID0gXCIjZmZmZmZmXCI7XG4gICAgc3RhdGljIEJHX0lNR19VUkw6IHN0cmluZyA9IFwiY29tcC9pbWdfdG9hc3RfYmcucG5nXCI7XG4gICAgc3RhdGljIERVUkFUSU9OOiBudW1iZXIgPSAyNTAwO1xuXG4gICAgcHJpdmF0ZSBzdGF0aWMgaW5zdGFuY2U6IFRvYXN0O1xuICAgIHByaXZhdGUgc3RhdGljIHN0b3JlVGV4dExpc3Q6IGFueVtdID0gW107XG5cbiAgICBzdGF0aWMgc2hvdyh0ZXh0OiBzdHJpbmcsIGR1cmF0aW9uOiBudW1iZXIgPSBUb2FzdC5EVVJBVElPTiwgY292ZXJCZWZvcmU6IGJvb2xlYW4gPSB0cnVlKSB7XG4gICAgICAgIGlmICghVG9hc3QuaW5zdGFuY2UpIHtcbiAgICAgICAgICAgIFRvYXN0Lmluc3RhbmNlID0gbmV3IFRvYXN0KCk7XG4gICAgICAgICAgICBUb2FzdC5pbnN0YW5jZS5vbihMYXlhLkV2ZW50LkNMT1NFLCBUb2FzdCwgVG9hc3Qub25DbG9zZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvdmVyQmVmb3JlICYmIFRvYXN0Lmluc3RhbmNlLnBhcmVudCkge1xuICAgICAgICAgICAgVG9hc3QuaW5zdGFuY2Uuc2V0VGV4dCh0ZXh0KTtcbiAgICAgICAgICAgIFRvYXN0Lmluc3RhbmNlLnRpbWVyLm9uY2UoZHVyYXRpb24gfHwgVG9hc3QuRFVSQVRJT04sIFRvYXN0Lmluc3RhbmNlLCBUb2FzdC5pbnN0YW5jZS5jbG9zZSwgbnVsbCwgdHJ1ZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoIVRvYXN0Lmluc3RhbmNlLnBhcmVudCkge1xuICAgICAgICAgICAgVG9hc3QuZG9TaG93KHRleHQsIGR1cmF0aW9uKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFRvYXN0LnN0b3JlVGV4dExpc3QucHVzaCh7XG4gICAgICAgICAgICAgICAgdGV4dDogdGV4dCxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogZHVyYXRpb25cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIHN0YXRpYyBkb1Nob3codGV4dDogc3RyaW5nLCBkdXJhdGlvbjogbnVtYmVyKSB7XG4gICAgICAgIFRvYXN0Lmluc3RhbmNlLnNldFRleHQodGV4dCk7XG4gICAgICAgIExheWVyTWFuYWdlci5hZGRUb0xheWVyKFRvYXN0Lmluc3RhbmNlLCBMYXllclR5cGUuTEFZRVJfTVNHKTtcbiAgICAgICAgVG9hc3QuaW5zdGFuY2UudGltZXIub25jZShkdXJhdGlvbiB8fCBUb2FzdC5EVVJBVElPTiwgVG9hc3QuaW5zdGFuY2UsIFRvYXN0Lmluc3RhbmNlLmNsb3NlLCBudWxsLCB0cnVlKTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgc3RhdGljIG9uQ2xvc2UoKSB7XG4gICAgICAgIGlmIChUb2FzdC5zdG9yZVRleHRMaXN0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHZhciBkYXRhOiBhbnkgPSBUb2FzdC5zdG9yZVRleHRMaXN0LnNoaWZ0KCk7XG4gICAgICAgICAgICBUb2FzdC5kb1Nob3coZGF0YS50ZXh0LCBkYXRhLmR1cmF0aW9uKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGJnOiBMYXlhLkltYWdlO1xuICAgIGxhYmVsOiBMYXlhLkxhYmVsO1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgfVxuXG4gICAgc2V0VGV4dCh0ZXh0OiBzdHJpbmcpIHtcbiAgICAgICAgdGhpcy53aWR0aCA9IFRvYXN0Lk1BWF9XSURUSDtcbiAgICAgICAgdGhpcy5sYWJlbC53aWR0aCA9IE5hTjtcbiAgICAgICAgdGhpcy5sYWJlbC5kYXRhU291cmNlID0gdGV4dDtcbiAgICAgICAgdGhpcy5vblRleHRDaGFuZ2UoKTtcbiAgICB9XG5cbiAgICBjbG9zZSgpIHtcbiAgICAgICAgdGhpcy5yZW1vdmVTZWxmKCk7XG4gICAgICAgIHRoaXMuZXZlbnQoTGF5YS5FdmVudC5DTE9TRSk7XG4gICAgfVxuXG4gICAgY3JlYXRlQ2hpbGRyZW4oKSB7XG4gICAgICAgIHRoaXMuY2VudGVyWCA9IDA7XG4gICAgICAgIHRoaXMuaGVpZ2h0ID0gVG9hc3QuTUFSR0lOICsgVG9hc3QuTUFSR0lOO1xuXG4gICAgICAgIHN1cGVyLmNyZWF0ZUNoaWxkcmVuKCk7XG4gICAgICAgIHRoaXMuYmcgPSBuZXcgTGF5YS5JbWFnZSgpO1xuICAgICAgICB0aGlzLmJnLnNraW4gPSBUb2FzdC5CR19JTUdfVVJMO1xuICAgICAgICB0aGlzLmJnLnNpemVHcmlkID0gXCIyNSwyNSwyNSwyNVwiO1xuICAgICAgICB0aGlzLmJnLmxlZnQgPSB0aGlzLmJnLnJpZ2h0ID0gdGhpcy5iZy50b3AgPSB0aGlzLmJnLmJvdHRvbSA9IDA7XG4gICAgICAgIHRoaXMuYWRkQ2hpbGQodGhpcy5iZyk7XG5cbiAgICAgICAgdGhpcy5sYWJlbCA9IG5ldyBMYXlhLkxhYmVsKCk7XG4gICAgICAgIHRoaXMubGFiZWwuY29sb3IgPSBUb2FzdC5DT0xPUjtcbiAgICAgICAgdGhpcy5sYWJlbC5mb250U2l6ZSA9IFRvYXN0LkZPTlRfU0laRTtcbiAgICAgICAgdGhpcy5sYWJlbC5hbGlnbiA9IFwiY2VudGVyXCI7XG4gICAgICAgIHRoaXMubGFiZWwueSA9IFRvYXN0LlRPUDtcbiAgICAgICAgdGhpcy5sYWJlbC5jZW50ZXJYID0gMDtcbiAgICAgICAgLy8gdGhpcy5sYWJlbC5jZW50ZXJZID0gMDtcbiAgICAgICAgLy8gdGhpcy5sYWJlbC5zdHJva2UgPSAxO1xuICAgICAgICAvLyB0aGlzLmxhYmVsLnN0cm9rZUNvbG9yID0gXCIjMDAwMDAwXCI7XG4gICAgICAgIC8vIHRoaXMubGFiZWwudG9wID0gVG9hc3QuTUFSR0lOO1xuICAgICAgICAvLyB0aGlzLmxhYmVsLmJvdHRvbSA9IFRvYXN0Lk1BUkdJTjtcbiAgICAgICAgLy8gdGhpcy5sYWJlbC5sZWZ0ID0gVG9hc3QuTUFSR0lOO1xuICAgICAgICAvLyB0aGlzLmxhYmVsLnJpZ2h0ID0gVG9hc3QuTUFSR0lOO1xuICAgICAgICB0aGlzLmxhYmVsLmxlYWRpbmcgPSAxNTtcbiAgICAgICAgdGhpcy5sYWJlbC53b3JkV3JhcCA9IHRydWU7XG4gICAgICAgIHRoaXMuYWRkQ2hpbGQodGhpcy5sYWJlbCk7XG5cbiAgICB9XG5cbiAgICAvLyBwcm90ZWN0ZWQgaW5pdGlhbGl6ZSgpIHtcbiAgICAvLyAgICAgc3VwZXIuaW5pdGlhbGl6ZSgpO1xuICAgIC8vICAgICB0aGlzLmJpbmRWaWV3RXZlbnQodGhpcy5sYWJlbCwgTGF5YS5FdmVudC5DSEFOR0UsIHRoaXMub25UZXh0Q2hhbmdlKTtcbiAgICAvLyB9XG5cbiAgICBwcm90ZWN0ZWQgb25UZXh0Q2hhbmdlKCkge1xuICAgICAgICBsZXQgdGV4dFc6IG51bWJlciA9IHRoaXMubGFiZWwud2lkdGg7XG4gICAgICAgIGNvbnN0IG1heFRleHRXOiBudW1iZXIgPSBUb2FzdC5NQVhfV0lEVEggLSBUb2FzdC5NQVJHSU4gKiAyO1xuICAgICAgICAvLyBjb25zdCBtaW5UZXh0VzogbnVtYmVyID0gVG9hc3QuTUlOX1dJRFRIIC0gVG9hc3QuTUFSR0lOICogMjtcbiAgICAgICAgaWYgKHRleHRXID4gbWF4VGV4dFcpIHtcbiAgICAgICAgICAgIHRoaXMubGFiZWwud2lkdGggPSBtYXhUZXh0VztcbiAgICAgICAgfVxuICAgICAgICBsZXQgdzogbnVtYmVyID0gdGhpcy5sYWJlbC53aWR0aCArIFRvYXN0Lk1BUkdJTiAqIDI7XG4gICAgICAgIHcgPSBNYXRoLm1pbih3LCBUb2FzdC5NQVhfV0lEVEgpO1xuICAgICAgICB3ID0gTWF0aC5tYXgodywgVG9hc3QuTUlOX1dJRFRIKTtcbiAgICAgICAgdGhpcy53aWR0aCA9IHc7XG4gICAgICAgIC8vIHRoaXMuaGVpZ2h0ID0gdGhpcy5sYWJlbC5oZWlnaHQgKyBUb2FzdC5UT1AgKyBUb2FzdC5CT1RUT007XG4gICAgICAgIHRoaXMuaGVpZ2h0ID0gdGhpcy5sYWJlbC5oZWlnaHQgKyBUb2FzdC5NQVJHSU4gKiAyO1xuICAgICAgICB0aGlzLnggPSAoTGF5YS5zdGFnZS53aWR0aCAtIHRoaXMud2lkdGgpID4+IDE7XG4gICAgICAgIHRoaXMueSA9IChMYXlhLnN0YWdlLmhlaWdodCAtIHRoaXMuaGVpZ2h0KSA+PiAxO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBvbkNvbXBSZXNpemUoKSB7XG4gICAgICAgIC8vIGlmICh0aGlzLmxhYmVsKSB7XG4gICAgICAgIC8vICAgICB0aGlzLmhlaWdodCA9IHRoaXMubGFiZWwuaGVpZ2h0ICsgTWVzc2FnZVRpcC5NQVJHSU4gKyBNZXNzYWdlVGlwLk1BUkdJTjtcbiAgICAgICAgLy8gfVxuICAgICAgICBpZiAodGhpcy5iZykge1xuICAgICAgICAgICAgdGhpcy5iZy53aWR0aCA9IHRoaXMud2lkdGg7XG4gICAgICAgICAgICB0aGlzLmJnLmhlaWdodCA9IHRoaXMuaGVpZ2h0O1xuICAgICAgICB9XG4gICAgfVxufSIsImltcG9ydCB7IHVpIH0gZnJvbSBcIi4uL3VpL2xheWFNYXhVSVwiO1xuaW1wb3J0IHsgR2FtZU1vZGVsIH0gZnJvbSBcIi4uL2pzL0dhbWVNb2RlbFwiO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSb2NrZXREaWFsb2cgZXh0ZW5kcyB1aS50ZW1wbGF0ZS5zaG93Um9ja2V0VUkge1xuICAgIHByaXZhdGUgc3RhdGljIF9kbGc6IFJvY2tldERpYWxvZztcblxuICAgIHN0YXRpYyBnZXQgZGxnKCk6IFJvY2tldERpYWxvZyB7XG4gICAgICAgIGlmICghdGhpcy5fZGxnKSB7XG4gICAgICAgICAgICB0aGlzLl9kbGcgPSBuZXcgUm9ja2V0RGlhbG9nKCk7XG4gICAgICAgICAgICB0aGlzLl9kbGcueCA9IDA7XG4gICAgICAgICAgICB0aGlzLl9kbGcueSA9IDA7XG4gICAgICAgICAgICB0aGlzLl9kbGcuaXNQb3B1cENlbnRlciA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9kbGc7XG4gICAgfVxuICAgIFxuICAgIG9uRW5hYmxlKCl7XG4gICAgICAgdGhpcy5idG5fY2xvc2Uub24oTGF5YS5FdmVudC5DTElDSyx0aGlzLHRoaXMuY2xvc2VEaWFsb2cpXG4gICAgICAgdGhpcy5hbmkxLnBsYXkoMCxmYWxzZSlcbiAgICAgICB0aGlzLmFuaTIucGxheSgwLGZhbHNlKVxuICAgIH1cbiAgICBzdGF0aWMgaW5pdCgpe1xuICAgICAgICBHYW1lTW9kZWwuZ2V0SW5zdGFuY2UoKS5vbignZ2V0Um9ja2V0UmFua2luZycsdGhpcywocmVzOmFueSk9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlcyk7XG4gICAgICAgICAgICB0aGlzLmRsZy5wb3B1cChmYWxzZSwgZmFsc2UpO1xuICAgICAgICAgICAgdGhpcy5kbGcucmFua2luZy5hcnJheSA9IHJlcztcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBjbG9zZURpYWxvZygpe1xuICAgICAgICB0aGlzLmNsb3NlKClcbiAgICB9XG5cbn0iXX0=
