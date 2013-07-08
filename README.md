# request-caching

An HTTP client with caching, built on top of [request](https://github.com/mikeal/request).
It works as a drop-in replacement for `request`. All that is needed is to pass a `cache` option:

## Features

* Drop-in replacement for `request`
* Memory or Redis backed cache
* Takes advantage of `ETag` by using `If-None-Match`
* Supports both public and private caching

## Example

```javascript
var LRU = require('lru-cache');
var public_lru = new LRU();
var private_lru = new LRU();
var cache = new MemoryCache(public_lru, private_lru);
request('http://some.url', {cache: cache}, function(err, res, body) {
  
});
```

The `cache` object must be an object with the following methods:

* `add(key, private, val, expires_millis, function(err){})`
* `get(key, function(err, val){})`

## How it works

* All cacheable responses are cached, even if they are expired.
* Nothing is ever removed from the cache.
* If a cached response is not expired, returns it
* If a cached response is expired, issue request with `If-None-Match` value from cached response's `ETag`.
  If response is 304 (Not Modified), returned cached response.
  * TODO: re-cache with updated expiry date?
* Cacheable responses marked as private are added to a private cache
* Cache lookups look in private cache first, and then in the public cache.
