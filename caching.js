var request = require('request');

module.exports = function(uri, options, callback) {
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
      if (err) {
        callback(err, res, body);
        return;
      }

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
