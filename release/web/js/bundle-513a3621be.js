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
(function (global){
/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
/* global global, define, System, Reflect, Promise */
var __extends;
var __assign;
var __rest;
var __decorate;
var __param;
var __metadata;
var __awaiter;
var __generator;
var __exportStar;
var __values;
var __read;
var __spread;
var __spreadArrays;
var __await;
var __asyncGenerator;
var __asyncDelegator;
var __asyncValues;
var __makeTemplateObject;
var __importStar;
var __importDefault;
(function (factory) {
    var root = typeof global === "object" ? global : typeof self === "object" ? self : typeof this === "object" ? this : {};
    if (typeof define === "function" && define.amd) {
        define("tslib", ["exports"], function (exports) { factory(createExporter(root, createExporter(exports))); });
    }
    else if (typeof module === "object" && typeof module.exports === "object") {
        factory(createExporter(root, createExporter(module.exports)));
    }
    else {
        factory(createExporter(root));
    }
    function createExporter(exports, previous) {
        if (exports !== root) {
            if (typeof Object.create === "function") {
                Object.defineProperty(exports, "__esModule", { value: true });
            }
            else {
                exports.__esModule = true;
            }
        }
        return function (id, v) { return exports[id] = previous ? previous(id, v) : v; };
    }
})
(function (exporter) {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };

    __extends = function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };

    __assign = Object.assign || function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };

    __rest = function (s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
            t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                    t[p[i]] = s[p[i]];
            }
        return t;
    };

    __decorate = function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };

    __param = function (paramIndex, decorator) {
        return function (target, key) { decorator(target, key, paramIndex); }
    };

    __metadata = function (metadataKey, metadataValue) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
    };

    __awaiter = function (thisArg, _arguments, P, generator) {
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };

    __generator = function (thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    };

    __exportStar = function (m, exports) {
        for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
    };

    __values = function (o) {
        var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
        if (m) return m.call(o);
        return {
            next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
            }
        };
    };

    __read = function (o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    };

    __spread = function () {
        for (var ar = [], i = 0; i < arguments.length; i++)
            ar = ar.concat(__read(arguments[i]));
        return ar;
    };

    __spreadArrays = function () {
        for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
        for (var r = Array(s), k = 0, i = 0; i < il; i++)
            for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
                r[k] = a[j];
        return r;
    };

    __await = function (v) {
        return this instanceof __await ? (this.v = v, this) : new __await(v);
    };

    __asyncGenerator = function (thisArg, _arguments, generator) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var g = generator.apply(thisArg, _arguments || []), i, q = [];
        return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
        function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
        function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
        function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);  }
        function fulfill(value) { resume("next", value); }
        function reject(value) { resume("throw", value); }
        function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
    };

    __asyncDelegator = function (o) {
        var i, p;
        return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
        function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: n === "return" } : f ? f(v) : v; } : f; }
    };

    __asyncValues = function (o) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var m = o[Symbol.asyncIterator], i;
        return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
        function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
        function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
    };

    __makeTemplateObject = function (cooked, raw) {
        if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
        return cooked;
    };

    __importStar = function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
        result["default"] = mod;
        return result;
    };

    __importDefault = function (mod) {
        return (mod && mod.__esModule) ? mod : { "default": mod };
    };

    exporter("__extends", __extends);
    exporter("__assign", __assign);
    exporter("__rest", __rest);
    exporter("__decorate", __decorate);
    exporter("__param", __param);
    exporter("__metadata", __metadata);
    exporter("__awaiter", __awaiter);
    exporter("__generator", __generator);
    exporter("__exportStar", __exportStar);
    exporter("__values", __values);
    exporter("__read", __read);
    exporter("__spread", __spread);
    exporter("__spreadArrays", __spreadArrays);
    exporter("__await", __await);
    exporter("__asyncGenerator", __asyncGenerator);
    exporter("__asyncDelegator", __asyncDelegator);
    exporter("__asyncValues", __asyncValues);
    exporter("__makeTemplateObject", __makeTemplateObject);
    exporter("__importStar", __importStar);
    exporter("__importDefault", __importDefault);
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],29:[function(require,module,exports){
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

},{"./publicScript/PageNavScript":38,"./publicScript/PageScript":39,"./publicScript/Screen":40,"./script/Assistant":41,"./script/Card":42,"./script/Guessing":43,"./script/Home":44,"./script/Record":45,"./script/grandPrix":46,"./script/loadingScene":47,"./script/priHistoryScene":48,"./script/shortListed":49,"./script/winning":50,"./template/joinRecords":51,"./template/numberListDomScript":52,"./template/previousRecords":53,"./template/priHistory":54,"./template/prixList":55,"./template/pswInput":56,"./template/rankingList":57,"./template/rechargeDialog":58,"./template/shortListedList":59,"./template/tipDialog":60,"./template/trendList":61,"./template/winningList":62,"./view/rocketDialog":67}],30:[function(require,module,exports){
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

},{"./GameConfig":29,"./js/socket":35,"./loadingResList":37,"./view/rocketDialog":67}],31:[function(require,module,exports){
"use strict";
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-20 14:11:26
 * @modify date 2019-02-20 14:11:26
 * @desc 数据通信及保存接口
 */
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var GameModel = /** @class */ (function (_super) {
    tslib_1.__extends(GameModel, _super);
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

},{"tslib":28}],32:[function(require,module,exports){
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

},{"./GameModel":31,"./http":33}],33:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
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
        config.data = formDataFunc(tslib_1.__assign({}, config.data));
    }
    else if (config.method == 'get') {
        config.params = tslib_1.__assign({}, config.params);
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

},{"axios":2,"tslib":28}],34:[function(require,module,exports){
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

},{}],35:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
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
    tslib_1.__extends(Socket, _super);
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

},{"./GameModel":31,"tslib":28}],36:[function(require,module,exports){
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

},{}],37:[function(require,module,exports){
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

},{}],38:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:45:46
 * @modify date 2019-02-19 17:45:46
 * @desc 页面跳转脚本，用于编辑模式插入
 */
var Tabbar_1 = require("../view/Tabbar");
var PageNavScript = /** @class */ (function (_super) {
    tslib_1.__extends(PageNavScript, _super);
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

},{"../view/Tabbar":65,"tslib":28}],39:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:46:08
 * @modify date 2019-02-19 17:46:08
 * @desc 页面跳转类，在代码中使用
 */
var Tabbar_1 = require("../view/Tabbar");
var PageScript = /** @class */ (function (_super) {
    tslib_1.__extends(PageScript, _super);
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

},{"../view/Tabbar":65,"tslib":28}],40:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-19 17:46:30
 * @modify date 2019-02-19 17:46:30
 * @desc 屏幕自适应脚本
 */
var Screen = /** @class */ (function (_super) {
    tslib_1.__extends(Screen, _super);
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

},{"tslib":28}],41:[function(require,module,exports){
"use strict";
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-21 16:34:21
 * @modify date 2019-02-21 16:34:21
 * @desc 助手页面脚本
 */
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var layaMaxUI_1 = require("../ui/layaMaxUI");
var api_1 = require("../js/api");
var Toast_1 = require("../view/Toast");
var screenUtils_1 = require("../js/screenUtils");
var Assistant = /** @class */ (function (_super) {
    tslib_1.__extends(Assistant, _super);
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

},{"../js/api":32,"../js/screenUtils":34,"../ui/layaMaxUI":63,"../view/Toast":66,"tslib":28}],42:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
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
    tslib_1.__extends(Card, _super);
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

},{"../js/utils":36,"../ui/layaMaxUI":63,"../view/Tabbar":65,"tslib":28}],43:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
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
    tslib_1.__extends(Guessing, _super);
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

},{"../js/GameModel":31,"../js/api":32,"../js/socket":35,"../js/utils":36,"../template/pswInput":56,"../ui/layaMaxUI":63,"../view/Toast":66,"tslib":28}],44:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
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
    tslib_1.__extends(Home, _super);
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

},{"../js/GameModel":31,"../js/api":32,"../js/screenUtils":34,"../js/utils":36,"../ui/layaMaxUI":63,"../view/Toast":66,"tslib":28}],45:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
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
    tslib_1.__extends(Record, _super);
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

},{"../js/api":32,"../js/screenUtils":34,"../ui/layaMaxUI":63,"tslib":28}],46:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
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
    tslib_1.__extends(grandPrix, _super);
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

},{"../js/GameModel":31,"../js/api":32,"../js/utils":36,"../ui/layaMaxUI":63,"../view/Tabbar":65,"tslib":28}],47:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-03-18 16:59:13
 * @modify date 2019-03-18 16:59:13
 * @desc 页面加载loading
 */
var layaMaxUI_1 = require("../ui/layaMaxUI");
var loadingScene = /** @class */ (function (_super) {
    tslib_1.__extends(loadingScene, _super);
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

},{"../ui/layaMaxUI":63,"tslib":28}],48:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
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
    tslib_1.__extends(grandPrix, _super);
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

},{"../js/api":32,"../js/utils":36,"../ui/layaMaxUI":63,"tslib":28}],49:[function(require,module,exports){
"use strict";
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-26 11:07:39
 * @modify date 2019-02-26 11:07:39
 * @desc 入围名单
 */
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var layaMaxUI_1 = require("../ui/layaMaxUI");
var api_1 = require("../js/api");
var ShortListed = /** @class */ (function (_super) {
    tslib_1.__extends(ShortListed, _super);
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

},{"../js/api":32,"../ui/layaMaxUI":63,"tslib":28}],50:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
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
    tslib_1.__extends(Winning, _super);
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

},{"../js/api":32,"../ui/layaMaxUI":63,"../view/Tabbar":65,"tslib":28}],51:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
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
    tslib_1.__extends(joinRecord, _super);
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

},{"../js/utils":36,"../ui/layaMaxUI":63,"tslib":28}],52:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
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
    tslib_1.__extends(numberListDOM, _super);
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

},{"../js/GameModel":31,"../ui/layaMaxUI":63,"../view/Toast":66,"tslib":28}],53:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
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
    tslib_1.__extends(previousRecord, _super);
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

},{"../js/utils":36,"../ui/layaMaxUI":63,"tslib":28}],54:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
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
    tslib_1.__extends(priHistory, _super);
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

},{"../js/utils":36,"../ui/layaMaxUI":63,"tslib":28}],55:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
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
    tslib_1.__extends(prixList, _super);
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

},{"../js/utils":36,"../ui/layaMaxUI":63,"tslib":28}],56:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
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
    tslib_1.__extends(IptPswDom, _super);
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

},{"../js/api":32,"../ui/layaMaxUI":63,"../view/Toast":66,"./tipDialog":60,"tslib":28}],57:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-22 11:40:42
 * @modify date 2019-02-22 11:40:42
 * @desc 火箭大奖火箭名单
 */
var layaMaxUI_1 = require("../ui/layaMaxUI");
var prixList = /** @class */ (function (_super) {
    tslib_1.__extends(prixList, _super);
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

},{"../ui/layaMaxUI":63,"tslib":28}],58:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-27 10:06:18
 * @modify date 2019-02-27 10:06:18
 * @desc 充值提币弹出脚本
 */
var layaMaxUI_1 = require("../ui/layaMaxUI");
var RechargeDialog = /** @class */ (function (_super) {
    tslib_1.__extends(RechargeDialog, _super);
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

},{"../ui/layaMaxUI":63,"tslib":28}],59:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
/**
 * @author [Siwen]
 * @email [623746556@qq.com]
 * @create date 2019-02-26 11:12:09
 * @modify date 2019-02-26 11:12:09
 * @desc 入围名单列表
 */
var layaMaxUI_1 = require("../ui/layaMaxUI");
var shortListBox = /** @class */ (function (_super) {
    tslib_1.__extends(shortListBox, _super);
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

},{"../ui/layaMaxUI":63,"tslib":28}],60:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
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
    tslib_1.__extends(TipsDiaLog, _super);
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

},{"../ui/layaMaxUI":63,"../view/Tabbar":65,"tslib":28}],61:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
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
    tslib_1.__extends(trendList, _super);
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

},{"../ui/layaMaxUI":63,"../view/Tabbar":65,"tslib":28}],62:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
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
    tslib_1.__extends(WinningList, _super);
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

},{"../js/utils":36,"../ui/layaMaxUI":63,"tslib":28}],63:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var ui;
(function (ui) {
    var assistantUI = /** @class */ (function (_super) {
        tslib_1.__extends(assistantUI, _super);
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
        tslib_1.__extends(CardUI, _super);
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
        tslib_1.__extends(grandPrixUI, _super);
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
        tslib_1.__extends(guessingUI, _super);
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
        tslib_1.__extends(homeUI, _super);
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
        tslib_1.__extends(loadingSceneUI, _super);
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
        tslib_1.__extends(priHistorySceneUI, _super);
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
        tslib_1.__extends(recordUI, _super);
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
        tslib_1.__extends(shortListedUI, _super);
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
        tslib_1.__extends(TabbarUI, _super);
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
        tslib_1.__extends(xctjUI, _super);
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
            tslib_1.__extends(InputPwdDialogUI, _super);
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
            tslib_1.__extends(joinRecordsUI, _super);
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
            tslib_1.__extends(numberListDOMUI, _super);
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
            tslib_1.__extends(previousRecordsUI, _super);
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
            tslib_1.__extends(priHistoryUI, _super);
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
            tslib_1.__extends(prixListUI, _super);
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
            tslib_1.__extends(rankingListUI, _super);
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
            tslib_1.__extends(rechargeDialogUI, _super);
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
            tslib_1.__extends(shortListUI, _super);
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
            tslib_1.__extends(showRocketUI, _super);
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
            tslib_1.__extends(TipsDialogUI, _super);
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
            tslib_1.__extends(trendListUI, _super);
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
            tslib_1.__extends(winningListUI, _super);
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

},{"tslib":28}],64:[function(require,module,exports){
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

},{}],65:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
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
    tslib_1.__extends(Tabbar, _super);
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

},{"../js/GameModel":31,"../ui/layaMaxUI":63,"tslib":28}],66:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var LayerManager_1 = require("./LayerManager");
var Toast = /** @class */ (function (_super) {
    tslib_1.__extends(Toast, _super);
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

},{"./LayerManager":64,"tslib":28}],67:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var layaMaxUI_1 = require("../ui/layaMaxUI");
var GameModel_1 = require("../js/GameModel");
var RocketDialog = /** @class */ (function (_super) {
    tslib_1.__extends(RocketDialog, _super);
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

},{"../js/GameModel":31,"../ui/layaMaxUI":63,"tslib":28}]},{},[30]);
