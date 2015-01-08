var request = require('request');

var null_cache = {
  get: function(uri, cb) {
    cb();
  },

  add: function(uri, private, value, cb) {
    cb();
  }
};

module.exports = function(uri, options, callback) {
  if (typeof uri === 'undefined') throw new Error('undefined is not a valid uri or options object.');
  if (typeof options === 'function' && !callback) callback = options;

  var cache = options.cache || null_cache;

  cache.get(uri, function(err, value) {
    if (err) return callback(err);

    if (value && new Date().getTime() <= value.expires_millis) {
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
        if (!value) { // weird stuff ???
          console.log('value is unexpectedly null')
          throw new Error('value is unexpectedly null')
        } else {
          value.response.headers = res.headers;
          return callback(null, value.response, value.response.body);
        }
      }

      var cacheable = false;
      var expires_millis = undefined;
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
          cacheable = true;
          var date = new Date(res.headers['date']);
          var seconds = +cacheControl['max-age'];
          expires_millis = date.getTime() + 1000*seconds;
        }
      } else if ('expires' in res.headers) {
        cacheable = true;
        var expires = new Date(res.headers['expires']);
        expires_millis = expires.getTime();
      } else if ('etag' in res.headers) {
        cacheable = true;
      } else if ('last-modified' in res.headers) {
        cacheable = true;
      }

      if(cacheable) {
        cache.add(uri, private, { response: cachable(res), expires_millis: expires_millis }, function(err) {
          callback(null, res, body);
        });
      } else {
        callback(null, res, body);
      }
    });
  });

  function cachable(res) {
    return {
      statusCode: res.statusCode,
      headers: res.headers,
      body: res.body
    }
  }
};

for(var func in request) {
  module.exports[func] = request[func];
}

module.exports.get = module.exports;

module.exports.MemoryCache = require('./lib/memory_cache');
module.exports.RedisCache = require('./lib/redis_cache');


