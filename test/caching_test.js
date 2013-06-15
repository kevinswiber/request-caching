var assert = require('assert');
var http = require('http');
var request = require('../caching');

var cache = new request.MemoryCache();

describe('request-caching', function() {
  it('caches when Cache-Control header is set with max-age', function() {
    var s = http.createServer(function(req, res) {
      var date = new Date().toUTCString();
      res.writeHead(200, { 'Date': date, 'Cache-Control': 'max-age=300' });
      res.end('Cachifiable!');
    }).listen(8080, function() {
      request('http://localhost:8080', { cache: cache }, function(err, res) {
        cache.get('http://localhost:8080', function(err, val) {
          assert.equal(val.response.body, 'Cachifiable!');
          s.close();
        });
      });
    });
  });

  it('caches when Expires headeris set', function() {
    var s = http.createServer(function(req, res) {
      var date = new Date().toUTCString();
      var expires = new Date(date);
      expires = new Date(expires.setSeconds(expires.getSeconds() + 30)).toUTCString();

      res.writeHead(200, { 'Date': date, 'Expires': expires });
      res.end('Cachifiable!');
    }).listen(8081, function() {
      request('http://localhost:8081', { cache: cache }, function(err, res) {
        cache.get('http://localhost:8081', function(err, val) {
          assert.equal(val.response.body, 'Cachifiable!');
          s.close();
        });
      });
    });
  });
});
