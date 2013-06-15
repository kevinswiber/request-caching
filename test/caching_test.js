var assert = require('assert');
var http = require('http');
var request = require('../caching');

var LRU = require('lru-cache');
var lru = new LRU();
var cache = {
  add: function(key, value, cb) { lru.set(key, value); cb(null); },
  remove: function(key, cb) { lru.del(key); cb(null); },
  get: function(key, cb) { cb(null, lru.get(key)); }
};

describe('request-caching', function() {
  beforeEach(function() {
    lru.reset();
  });

  it('caches when Cache-Control header is set with max-age', function(cb) {
    var s = http.createServer(function(req, res) {
      var date = new Date().toUTCString();
      res.writeHead(200, { 'Date': date, 'Cache-Control': 'max-age=300' });
      res.end('Cachifiable!');
    }).listen(8080, function() {
      request('http://localhost:8080', { cache: cache }, function(err, res) {
        if(err) return cb(err);
        cache.get('http://localhost:8080', function(err, val) {
          if(err) return cb(err);
          assert.equal(val.response.body, 'Cachifiable!');
          s.close();
          cb();
        });
      });
    });
  });

  it('caches when Expires headeris set', function(cb) {
    var s = http.createServer(function(req, res) {
      var date = new Date().toUTCString();
      var expires = new Date(date);
      expires = new Date(expires.setSeconds(expires.getSeconds() + 30)).toUTCString();

      res.writeHead(200, { 'Date': date, 'Expires': expires });
      res.end('Cachifiable!');
    }).listen(8081, function() {
      request('http://localhost:8081', { cache: cache }, function(err, res) {
        if(err) return cb(err);
        cache.get('http://localhost:8081', function(err, val) {
          if(err) return cb(err);
          assert.equal(val.response.body, 'Cachifiable!');
          s.close();
          cb();
        });
      });
    });
  });
});
