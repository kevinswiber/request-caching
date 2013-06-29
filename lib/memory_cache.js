module.exports = function MemoryCache(public_lru, private_lru) {
  this.add = function(uri, private, value, cb) {
    var lru = private ? private_lru : public_lru;
    lru.set(uri, value); cb(); 
  };

  this.get = function(uri, cb) { 
    cb(null, private_lru.get(uri) || public_lru.get(uri));
  };

  this.flush = function(cb) {
    private_lru.reset(); 
    public_lru.reset(); 
    cb();
  }
}
