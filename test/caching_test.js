var assert = require('assert');
var http = require('http');
var request = require('../caching');
var LRU = require('lru-cache');
var redis = require('redis').createClient();

var port = 8090;

var public_lru = new LRU();
function paul(uri) {return 'paul'+uri;}
function lisa(uri) {return 'lisa'+uri;}
[
  [new request.MemoryCache(public_lru, new LRU()), new request.MemoryCache(public_lru, new LRU())],
  [new request.RedisCache(redis, paul), new request.RedisCache(redis, lisa)]
].forEach(function(caches) {
  var cache = caches[0];
  var other_cache = caches[1];

  describe(cache.constructor.name + ' request-caching', function() {
    beforeEach(function(cb) {
      cache.flush(function(err) {
        if(err) return cb(err);
        other_cache.flush(cb);
      });
    });

    it('caches publicly for Cache-Control: max-age=300', function(cb) {
      http.createServer(function(req, res) {
        var date = new Date().toUTCString();
        res.writeHead(200, { 'Date': date, 'Cache-Control': 'max-age=300' });
        res.end('Cachifiable!');
      }).listen(++port, function() {
        request('http://localhost:'+port, { cache: cache }, function(err, res) {
          if(err) return cb(err);
          other_cache.get('http://localhost:'+port, function(err, val) {
            if(err) return cb(err);
            assert.equal(val.response.body, 'Cachifiable!');
            cb();
          });
        });
      });
    });

    it('caches privately for Cache-Control: private, max-age=300', function(cb) {
      http.createServer(function(req, res) {
        var date = new Date().toUTCString();
        res.writeHead(200, { 'Date': date, 'Cache-Control': 'private, max-age=300' });
        res.end('Cachifiable!');
      }).listen(++port, function() {
        request('http://localhost:'+port, { cache: cache }, function(err, res) {
          if(err) return cb(err);
          cache.get('http://localhost:'+port, function(err, val) {
            if(err) return cb(err);
            assert.equal(val.response.body, 'Cachifiable!');
            other_cache.get('http://localhost:'+port, function(err, val) {
              if(err) return cb(err);
              assert.equal(val, undefined);
              cb();
            });
          });
        });
      });
    });

    it('caches when Expires header is set', function(cb) {
      http.createServer(function(req, res) {
        var date = new Date().toUTCString();
        var expires = new Date(date);
        expires = new Date(expires.setSeconds(expires.getSeconds() + 30)).toUTCString();

        res.writeHead(200, { 'Date': date, 'Expires': expires });
        res.end('Cachifiable!');
      }).listen(++port, function() {
        request('http://localhost:'+port, { cache: cache }, function(err, res) {
          if(err) return cb(err);
          cache.get('http://localhost:'+port, function(err, val) {
            if(err) return cb(err);
            assert.equal(val.response.body, 'Cachifiable!');
            cb();
          });
        });
      });
    });

    it('re-requests with etag', function(cb) {
      var etag_cache = false;
      http.createServer(function(req, res) {
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
      }).listen(++port, function() {
        request('http://localhost:'+port, { cache: cache }, function(err, res, body) {
          if(err) return cb(err);
          request.get('http://localhost:'+port, { cache: cache }, function(err, res, body) {
            if(err) return cb(err);
            assert(etag_cache);
            assert.equal(body, 'Cachifiable!');
            cb();
          });
        });
      });
    });

    it('delegates to request for non-GET methods', function(cb) {
      http.createServer(function(req, res) {
        if(req.method == 'POST') {
          res.writeHead(201);
          res.end();
        } else {
          res.writeHead(405);
          res.end();
        }
      }).listen(++port, function() {
        request.post('http://localhost:'+port, { cache: cache }, function(err, res, body) {
          if(err) return cb(err);
          assert.equal(res.statusCode, 201);
          cb();
        });
      });
    });
  });

});
