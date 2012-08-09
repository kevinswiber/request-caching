var request = require('request');

var caching = function(uri, options, callback) {
  if (typeof uri === 'undefined') throw new Error('undefined is not a valid uri or options object.');
  if (typeof options === 'function' && !callback) callback = options;

  var cache = options.cache;

  cache.get(uri, function(err, value) {
    if (err) {
      callback.call(request, err);
      return;
    }

    if (value) {
      if (new Date() <= value.expires) {
        callback.call(request, null, value.response, value.response.body);
        return;
      } else {
        cache.remove(uri);
      }
    }

    request(uri, options, function(err, res, body) {
      // Add to cache if cacheable.
      if ('cache-control' in res.headers) {
        var val = res.headers['cache-control'].replace(/\s/,'').split(',');

        var cacheControl = {};

        val.forEach(function(dir) {
          var arr = dir.split('=');
          cacheControl[arr[0]] = arr[1];
        });

        if (cacheControl['max-age']) {

          var seconds = +cacheControl['max-age'];

          var date = new Date(res.headers['date']);

          var expires = new Date(date);
          expires.setSeconds(expires.getUTCSeconds() + seconds);

          if (new Date() <= expires) {
            cache.add(uri, { response: res, expires: expires }, function(err, res) {
              callback.call(this, err, res, body);
            });
            return;
          }
        }
      } else if ('expires' in res.headers) {
        var expires = new Date(res.headers['expires']);

        if (new Date() <= expires) {
          cache.add(uri, { response: res, expires: expires }, function(err, res) {
            callback.call(this, err, res, body);
          });
          return;
        }
      }

      callback.call(this, err, res, body);
    });
  });
};

// Listen... this is kinda crappy.
var MemoryCache = function() {
  this._cache = {};
  this._maxLength = 20;
  this._currentIndex = 0;
  this._keys = new Array(this._maxLength);
};

MemoryCache.prototype.add = function(key, value, callback) {
  if (this._currentIndex === this._maxLength - 1) {
    this._currentIndex = 0;
  }

  if (this._keys[this._currentIndex]) {
    delete this._cache[this._keys[this._currentIndex]];
  }

  this._keys[this._currentIndex] = key;

  this._cache[key] = value;

  this._currentIndex++;

  if (callback) callback(null, { key: key, value: value });
};

MemoryCache.prototype.remove = function(key, callback) {
  delete this._cache[key];
  if (callback) callback(null, key);
};

MemoryCache.prototype.get = function(key, callback) {
  var res;
  if (key in this._cache) { res = this._cache[key]; }
  if (callback) callback(null, res);
};

caching.MemoryCache = MemoryCache;

module.exports = caching;
