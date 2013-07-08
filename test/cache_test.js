var assert = require('assert');
var LRU = require('lru-cache');
var Storage = require('../lib/memory_storage');
var storage = new Storage(new LRU());

var Cache = require('../lib/cache');

describe('Cache', function() {
  beforeEach(storage.flush);

  it('Uses default publicKeyFn if none is provided', function(cb) {
    var cache = new Cache(storage);
    cache.set('my-uri', false, 'my-value', 1000, function(err) {
      if(err) return cb(err);
      storage.get('public:my-uri', function(err, value) {
        if(err) return cb(err);
        assert.equal(JSON.parse(value), 'my-value');
        cb();
      });
    });
  });

  it('Requires an explicit privateKeyFn for private caching', function(cb) {
    var cache = new Cache(storage);
    cache.set('my-uri', true, 'my-value', 1000, function(err) {
      if(!err) return cb(new Error('Should fail'));
      assert.equal(err.message, 'No provided key function for private caching');
      cb();
    });
  });

  it('Expires cached keys after TTL', function(cb) {
    var cache = new Cache(storage);
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
});
