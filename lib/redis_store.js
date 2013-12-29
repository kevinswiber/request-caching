/**
 * Creates a new Redis backed storage.
 *
 * @param redis a redis client, obtained by require('redis').createClient()
 */
module.exports = function RedisStore(redis) {
  this.set = function(key, value, ttlMillis, cb) {
    if(ttlMillis > 0) {
      redis.psetex(key, ttlMillis, value, cb);
    } else {
      redis.set(key, value, cb);
    }
  };

  this.get = function(key, cb) {
    redis.get(key, cb);
  };

  this.flush = function(cb) { 
    redis.flushdb(cb);
  };

  this.delMatched = function(wildcardKey, cb) {
    redis.keys(wildcardKey, function(err, keys) {
      if(err) return cb(err);
      if(keys.length === 0) return cb(null, 0);
      redis.del(keys, function(err) {
        if(err) return cb(err);
        cb(null, keys.length);
      });
    });
  };
};
