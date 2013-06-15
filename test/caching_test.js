var assert = require('assert');
var http = require('http');
var request = require('../caching');

var LRU = require('lru-cache');
var lru = new LRU();
var memory_cache = {
  add: function(key, value, cb) { lru.set(key, value); cb(null); },
  get: function(key, cb) { cb(null, lru.get(key)); },
  // Only used by the test
  flush: function(cb) { lru.reset; cb(null); },
  name: 'Memory'
};

var redis = require('redis').createClient();
var redis_cache = {
  add: function(key, value, cb) { redis.set(key, JSON.stringify(value), cb) },
  get: function(key, cb) { 
    redis.get(key, function(err, value) {
      if(err) return cb(err);
      return cb(null, JSON.parse(value));
    });
  },
  // Only used by the test
  flush: function(cb) { redis.flushdb(cb); },
  name: 'Redis'
};

[memory_cache, redis_cache].forEach(function(cache) {
  describe(cache.name + ' request-caching', function() {
    beforeEach(function(cb) {
      cache.flush(cb);
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

    it('caches when Expires header is set', function(cb) {
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

    it('re-requests with etag', function(cb) {
      var etag_cache = false;
      var s = http.createServer(function(req, res) {
        var date = new Date().toUTCString();
        var expires = new Date(date);
        expires = new Date(expires.setSeconds(expires.getSeconds() + 30)).toUTCString();

        if(req.headers['if-none-match'] == 'the-etag') {
          etag_cache = true;
          res.writeHead(304);
          res.end();
        } else {
          var date = new Date().toUTCString();
          var expires = new Date(date);
          expires = new Date(expires.setSeconds(expires.getSeconds() -1)).toUTCString();

          res.writeHead(200, { 'Date': date, 'Expires': expires, 'ETag': 'the-etag' });
          res.end('Cachifiable!');
        }
      }).listen(8082, function() {
        request('http://localhost:8082', { cache: cache }, function(err, res, body) {
          if(err) return cb(err);
          request.get('http://localhost:8082', { cache: cache }, function(err, res, body) {
            if(err) return cb(err);
            assert(etag_cache);
            assert.equal(body, 'Cachifiable!');
            s.close();
            cb();
          });
        });
      });
    });

    it('delegates to request for non-GET methods', function(cb) {
      var s = http.createServer(function(req, res) {
        if(req.method == 'POST') {
          res.writeHead(201);
          res.end();
        } else {
          res.writeHead(405);
          res.end();
        }
      }).listen(8083, function() {
        request.post('http://localhost:8083', { cache: cache }, function(err, res, body) {
          if(err) return cb(err);
          assert.equal(res.statusCode, 201);
          s.close();
          cb();
        });
      });
    });
  });

});
