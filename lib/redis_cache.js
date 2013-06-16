module.exports = function RedisCache(redis, privateKeyFn) {
  this.add = function(uri, private, value, cb) {
    var key = private ? privateKeyFn(uri) : uri;
    redis.set(key, JSON.stringify(value), cb);
  };

  this.get = function(uri, cb) {
    // Look in private cache first
    redis.get(privateKeyFn(uri), function(err, value) {
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
