var http = require('http');
var request = require('./caching');
var LRU = require('lru-cache');
var store = new request.MemoryStore(new LRU());
var cache = new request.Cache(store);

http.createServer(function(req, res) {
  var date = new Date().toUTCString();
  res.writeHead(200, { 'Date': date, 'Cache-Control': 'max-age=5' });
  console.log("Server hit!");
  res.end('Hello ' + date);
}).listen(3000, function(err) {

  setInterval(function() { 
    request('http://localhost:3000', { cache: cache }, function(err, res, body) {
      console.log("Client: " + body);
    });
  }, 2000);

});

