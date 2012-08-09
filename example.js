var request = require('./caching');

var cache = new request.MemoryCache();

request('http://localhost:3000', { cache: cache }, function(err, res, body) {
    console.log(body);
    setTimeout(function() { 
      request('http://localhost:3000', { cache: cache }, function(err, res, body) {
        console.log(body);
      });
    }, 2000);
});
