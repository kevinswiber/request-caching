var assert = require('assert');
var LRU = require('lru-cache');
var Store = require('../lib/memory_store');
var RedisStore = require('../lib/redis_store');
var store = new Store(new LRU());

var Cache = require('../lib/cache');

describe('Cache', function() {
  beforeEach(store.flush);

  it('Uses default publicKeyFn if none is provided', function(cb) {
    var cache = new Cache(store);
    cache.set('my-uri', false, 'my-value', 1000, function(err) {
      if(err) return cb(err);
      store.get('my-uri', function(err, value) {
        if(err) return cb(err);
        assert.equal(JSON.parse(value), 'my-value');
        cb();
      });
    });
  });

  it('Requires an explicit privateKeyFn for private caching', function(cb) {
    var cache = new Cache(store);
    cache.set('my-uri', true, 'my-value', 1000, function(err) {
      if(!err) return cb(new Error('Should fail'));
      assert.equal(err.message, 'No provided key function for private caching');
      cb();
    });
  });

  it('Expires cached keys after TTL', function(cb) {
    var cache = new Cache(store);
    cache.set('my-uri', false, 'my-value', 10, function(err) {
      if(err) return cb(err);
      cache.get('my-uri', function(err, value) {
        if(err) return cb(err);
        assert.equal(value, 'my-value');
        setTimeout(function() {
          cache.get('my-uri', function(err, value) {
            if(err) return cb(err);
            assert.equal(value, undefined);
            cb();
          });
        }, 10);
      });
    });
  });

  it('Overrides TTL with custom function', function(cb) {
    function oneMillisecond(ttl) {
      return 1;
    }
    var cache = new Cache(store, null, null, oneMillisecond);
    cache.set('my-uri', false, 'my-value', 100, function(err) {
      if(err) return cb(err);
      setTimeout(function() {
        cache.get('my-uri', function(err, value) {
          if(err) return cb(err);
          assert.equal(value, undefined);
          cb();
        });
      }, 10);
    });
  });

  it('Deletes LRU keys by match', function(cb) {
    var cache = new Cache(store);
    cache.set('foo.bar.my-uri', false, 'my-bar-value', 1000, function(err) {
      if(err) return cb(err);
      cache.set('foo.zap.my-uri', false, 'my-zap-value', 1000, function(err) {
        if(err) return cb(err);
        cache.delMatched('foo.bar.*', function(err) {
          if(err) return cb(err);
          cache.get('foo.bar.my-uri', function(err, value) {
            if(err) return cb(err);
            assert.equal(value, undefined);
            cache.get('foo.zap.my-uri', function(err, value) {
              if(err) return cb(err);
              assert.equal(value, 'my-zap-value');
              cb();
            });
          });
        });
      });
    });
  });

  it('Deletes Redis keys by match', function(cb) {
    var redis = require('redis').createClient()
    var store = new RedisStore(redis);
    var cache = new Cache(store);
    cache.set('foo.bar.my-uri', false, 'my-bar-value', 10000, function(err) {
      if(err) return cb(err);
      cache.set('foo.zap.my-uri', false, 'my-zap-value', 10000, function(err) {
        if(err) return cb(err);
        cache.delMatched('foo.bar.*', function(err) {
          if(err) return cb(err);
          cache.get('foo.bar.my-uri', function(err, value) {
            if(err) return cb(err);
            assert.equal(value, undefined);
            cache.get('foo.zap.my-uri', function(err, value) {
              if(err) return cb(err);
              assert.equal(value, 'my-zap-value');
              cb();
            });
          });
        });
      });
    });
  });
});
