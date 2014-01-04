var assert = require('assert');
var Cache = require('../lib/cache');

var redis = require('redis').createClient();
var RedisStore = require('../lib/redis_store');
var redisStore = new RedisStore(redis);

var LRU = require('lru-cache');
var MemoryStore = require('../lib/memory_store');
var memoryStore = new MemoryStore(new LRU());

[redisStore, memoryStore].forEach(function (store) {
  describe('Cache with ' + store.constructor.name, function () {
    beforeEach(store.flushAll);

    it('Keys off uri when no prefix is provided', function (cb) {
      var cache = new Cache(store);
      cache.set('my-uri', false, 'my-value', 1000, function (err) {
        if (err) return cb(err);
        store.get('my-uri', function (err, value) {
          if (err) return cb(err);
          assert.equal(JSON.parse(value), 'my-value');
          cb();
        });
      });
    });

    it('Requires privateSuffix for private caching', function (cb) {
      var cache = new Cache(store);
      cache.set('my-uri', true, 'my-value', 1000, function (err) {
        if (!err) return cb(new Error('Should fail'));
        assert.equal(err.message, 'Cannot cache privately without a privateSuffix');
        cb();
      });
    });

    it('Expires cached keys after TTL', function (cb) {
      var cache = new Cache(store);
      cache.set('my-uri', false, 'my-value', 10, function (err) {
        if (err) return cb(err);
        cache.get('my-uri', function (err, value) {
          if (err) return cb(err);
          assert.equal(value, 'my-value');
          setTimeout(function () {
            cache.get('my-uri', function (err, value) {
              if (err) return cb(err);
              assert.equal(value, undefined);
              cb();
            });
          }, 10);
        });
      });
    });

    it('Overrides TTL with custom function', function (cb) {
      function oneMillisecond(ttl) {
        return 1;
      }

      var cache = new Cache(store, null, null, oneMillisecond);
      cache.set('my-uri', false, 'my-value', 100, function (err) {
        if (err) return cb(err);
        setTimeout(function () {
          cache.get('my-uri', function (err, value) {
            if (err) return cb(err);
            assert.equal(value, undefined);
            cb();
          });
        }, 10);
      });
    });

    it('Deletes Redis keys by match', function (cb) {
      var fooCache = new Cache(store, 'foo:');
      var barCache = new Cache(store, 'bar:');

      fooCache.set('KEY', false, 'FOO', 10000, function (err) {
        if (err) return cb(err);
        barCache.set('KEY', false, 'BAR', 10000, function (err) {
          if (err) return cb(err);

          fooCache.flush(function (err, n) {
            if (err) return cb(err);
            assert.equal(n, 1);
            fooCache.get('KEY', function (err, value) {
              if (err) return cb(err);
              assert.equal(value, undefined);
              barCache.get('KEY', function (err, value) {
                if (err) return cb(err);
                assert.equal(value, 'BAR');
                cb();
              });
            });
          });
        });
      });
    });
  });
});
