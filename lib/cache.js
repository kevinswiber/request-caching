module.exports = function Cache(store, prefix, privateSuffix, ttlFn) {
  this.set = function (key, private, value, ttlMillis, cb) {
    if (private && !privateSuffix) return cb(new Error("Cannot cache privately without a privateSuffix"));
    ttlMillis = ttlFn ? ttlFn(ttlMillis) : ttlMillis;
    store.set(storeKey(key, private), toJson(value), ttlMillis, cb);
  };

  this.get = function (key, cb) {
    store.get(storeKey(key, false), function (err, value) {
      if (err) return cb(err);
      if (value) return cb(null, fromJson(value));
      store.get(storeKey(key, true), function (err, value) {
        if (err) return cb(err);
        cb(null, fromJson(value));
      });
    });
  };

  this.flush = function (cb) {
    store.flush(prefix, cb);
  };

  function storeKey(key, private) {
    return (prefix || '') + key + (private ? privateSuffix : '');
  }

  function toJson(value) {
    return JSON.stringify(value, function (k, v) {
      return (typeof v == 'function') ? null : v;
    });
  }

  function fromJson(value) {
    return value ? JSON.parse(value) : value;
  }
};
