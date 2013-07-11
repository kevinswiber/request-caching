module.exports = function Cache(store, publicKeyFn, privateKeyFn, ttlFn) {
  if(!publicKeyFn) {
    publicKeyFn = function(uri, cb) {
      cb(null, 'public:' + uri);
    };
  }

  this.set = function(uri, private, value, ttlMillis, cb) {
    var keyFn = private ? privateKeyFn : publicKeyFn;
    if(!keyFn) {
      var level = private ? 'private' : 'public';
      return cb(new Error('No provided key function for ' + level + ' caching'));
    }
    keyFn(uri, function(err, key) {
      if(err) return cb(err);
      ttlMillis = ttlFn ? ttlFn(ttlMillis) : ttlMillis;
      store.set(key, toJson(value), ttlMillis, cb);
    });
  };

  this.get = function(uri, cb) {
    function publicGet() {
      publicKeyFn(uri, function(err, key) {
        if(err) return cb(err);
        store.get(key, function(err, value) {
          if(err) return cb(err);
          return cb(null, fromJson(value));
        });
      });
    }

    if(privateKeyFn) {
      privateKeyFn(uri, function(err, key) {
        if(err) return cb(err);
        store.get(key, function(err, value) {
          if(err) return cb(err);
          if(value) return cb(null, fromJson(value));
          publicGet();
        });
      });
    } else {
      publicGet();
    }
  };

  function toJson(value) {
    return JSON.stringify(value, function(k, v) {
      return (typeof v == 'function') ? null : v;
    });
  }

  function fromJson(value) {
    return value ? JSON.parse(value) : value;
  }
};
