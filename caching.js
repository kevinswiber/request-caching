var request = require('request');

var noOpCache = {
  get: function(uri, cb) {
    cb();
  },

  set: function(uri, private, value, ttlMillis, cb) {
    cb();
  }
};

var FOREVER_MILLIS = 8640000000000000;

module.exports = function(uri, options, callback) {
  if (typeof uri === 'undefined') throw new Error('undefined is not a valid uri or options object.');
  if (typeof options === 'function' && !callback) callback = options;

  var cache = options.cache || noOpCache;

  cache.get(uri, function(err, value) {
    if (err) return callback(err);

    if (value && new Date().getTime() <= value.expiryTimeMillis) {
      return callback(null, value.response, value.response.body);
    }

    if(options.headers === undefined) options.headers = {};

    if (value && 'etag' in value.response.headers) {
      options.headers['If-None-Match'] = value.response.headers['etag'];
    }
    if (value && 'last-modified' in value.response.headers) {
      options.headers['If-Modified-Since'] = value.response.headers['last-modified'];
    }

    request(uri, options, function(err, res, body) {
      if (err) return callback(err, res, body);

      if(res.statusCode == 304) {
        return callback(null, value.response, value.response.body);
      }

      var isCacheable = false;
      var expiryTimeMillis = FOREVER_MILLIS;
      var private = false;
      if ('cache-control' in res.headers) {
        // In case of Cache-Control: no-cache, cacheable should remain false.
        var val = res.headers['cache-control'].replace(/\s/,'').split(',');
        var cacheControl = {};
        val.forEach(function(dir) {
          var arr = dir.split('=');
          if(arr.length == 1) arr.push(true);
          cacheControl[arr[0]] = arr[1];
        });
        private = cacheControl.private;
        if (cacheControl['max-age']) {
          isCacheable = true;
          var date = new Date(res.headers['date']);
          var seconds = +cacheControl['max-age'];
          expiryTimeMillis = date.getTime() + 1000*seconds;
        }
      }
      if ('expires' in res.headers) {
        isCacheable = true;
        var expires = new Date(res.headers['expires']);
        expiryTimeMillis = expires.getTime();
      }
      if ('etag' in res.headers) {
        isCacheable = true;
      }
      if ('last-modified' in res.headers) {
        isCacheable = true;
      }

      if(isCacheable) {
        var ttlMillis = Math.max(expiryTimeMillis - Date.now(), 0);
        var cachedResponse = { response: cachedResponseProperties(res), expiryTimeMillis: expiryTimeMillis };

        cache.set(uri, private, cachedResponse, ttlMillis, function(err) {
          callback(err, res, body);
        });
      } else {
        callback(null, res, body);
      }
    });
  });

  function cachedResponseProperties(res) {
    return {
      statusCode: res.statusCode,
      headers: res.headers,
      body: res.body
    }
  }
};

// Copy over the original request API
for(var func in request) {
  module.exports[func] = request[func];
}
module.exports.get = module.exports;

module.exports.Cache = require('./lib/cache');
module.exports.MemoryStore = require('./lib/memory_store');
module.exports.RedisStore = require('./lib/redis_store');


