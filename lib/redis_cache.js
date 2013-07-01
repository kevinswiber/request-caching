/**
 * Creates a new Redis backed cache.
 *
 * @param redis a redis client
 * @param private_key_fn a function that returns a user-specific key for a uri.
 *        This can for example be a hash of an oauth token plus the uri.
 */
module.exports = function RedisCache(redis, private_key_fn) {
  this.add = function(uri, private, value, cb) {
    try {
      var key = private ? private_key_fn(uri) : uri;
      var val = JSON.stringify(value, function(k, v) {
        return (typeof v == 'function') ? null : v;
      });
      redis.set(key, val, cb);
    } catch(err) {
      cb(err);
    }
  };

  this.get = function(uri, cb) {
    // Look in private cache first
    redis.get(private_key_fn(uri), function(err, value) {
      if(err) return cb(err);
      if(value) return cb(null, JSON.parse(value));

      // Look in public cache
      redis.get(uri, function(err, value) {
        if(err) return cb(err);
        return cb(null, JSON.parse(value));
      });
    });
  };

  this.flush = function(cb) { 
    redis.flushdb(cb);
  };
};
