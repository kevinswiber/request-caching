/**
 * Creates a new in-memory LRU backed storage.
 *
 * @param lru an LRU instance, created by var LRU = require('lru'); lru = new LRU();
 */
 module.exports = function MemoryStore(lru) {
  this.set = function(uri, value, ttlMillis, cb) {
    lru.set(uri, value);
    setTimeout(function() {
      lru.del(uri);
    }, ttlMillis);
    cb();
  };

  this.get = function(uri, cb) { 
    cb(null, lru.get(uri));
  };

  this.flush = function(cb) {
    lru.reset(); 
    cb();
  }
};
