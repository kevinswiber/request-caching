var request = require('request');

module.exports = function(uri, options, callback) {
  if (typeof uri === 'undefined') throw new Error('undefined is not a valid uri or options object.');
  if (typeof options === 'function' && !callback) callback = options;

  var cache = options.cache;

  cache.get(uri, function(err, value) {
    if (err) return callback.call(request, err);

    if (value && new Date() <= value.expires) {
      return callback.call(request, null, value.response, value.response.body);
    }

    if(options.headers === undefined) options.headers = {};
    if (value && 'etag' in value.response.headers) {
      options.headers['If-None-Match'] = value.response.headers.etag;
    }

    request(uri, options, function(err, res, body) {
      if (err) return callback(err, res, body);

      if(res.statusCode == 304) {
        return callback.call(request, null, value.response, value.response.body);
      }

      // Add to cache if cacheable.
      if ('cache-control' in res.headers) {
        var val = res.headers['cache-control'].replace(/\s/,'').split(',');
        var cacheControl = {};
        val.forEach(function(dir) {
          var arr = dir.split('=');
          if(arr.length == 1) arr.push(true);
          cacheControl[arr[0]] = arr[1];
        });
        if (cacheControl['max-age']) {
          var seconds = +cacheControl['max-age'];
          var date = new Date(res.headers['date']);
          var expires = new Date(date);
          expires.setSeconds(expires.getUTCSeconds() + seconds);

          cache.add(uri, cacheControl.private, { response: res, expires: expires }, function(err) {
            callback.call(this, err, res, body);
          });
        } else {
          callback.call(this, err, res, body);
        }
      } else if ('expires' in res.headers) {
        var expires = new Date(res.headers['expires']);

        cache.add(uri, false, { response: res, expires: expires }, function(err) {
          callback.call(this, err, res, body);
        });
      } else {
        callback.call(this, err, res, body);
      }
    });
  });
};

for(var func in request) {
  module.exports[func] = request[func];
}

module.exports.get = module.exports;

module.exports.MemoryCache = require('./lib/memory_cache');
module.exports.RedisCache = require('./lib/redis_cache');


