var assert = require('assert');
var http = require('http');
var request = require('../caching');

var cache = new request.MemoryCache();

var s = http.createServer(function(req, res) {
  var date = new Date().toUTCString();
  res.writeHead(200, { 'Date': date, 'Cache-Control': 'max-age=300' });
  res.end('Cachifiable!');
}).listen(8080, function() {
  request('http://localhost:8080', { cache: cache }, function(err, res) {
    cache.get('http://localhost:8080', function(err, val) {
      assert.equal(val.response.body, 'Cachifiable!');
      console.log('1 test passed.');
      s.close();
    });
  });
});
