# request-caching

An HTTP client with caching, built on top of [request](https://github.com/mikeal/request).

## Features

* Drop-in replacement for `request`.
* Redis or In-memory (LRU) storage. Easy to build new storage backends.
* Supports both [public and private caching](http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.9.1).
* Takes advantage of the `ETag` response header by using the `If-None-Match` request header.
* Takes advantage of the `Last-Modified` response header by using the `If-Modified-Since` request header.
* Cache TTL is based on the `Expires` response header or `max-age` value in `Cache-Control`, but can be overridden.
* Highly customizeable with sensible defaults.

## Example

### In-memory cache

```javascript
var LRU = require('lru-cache');
var memoryStorage = new request.MemoryStorage(new LRU());
var cache = new request.Cache(memoryStorage);

request('http://some.url', {cache: cache}, function(err, res, body) {
  
});
```

## How it works

* All cacheable responses are cached, even if they are expired.
* The TTL for a cached entry uses the TTL from the response, but can be overridden.
* If a cached response is not expired, returns it.
* If a cached response is expired, issue request with `If-None-Match` value from cached response's `ETag`.
  * If response is 304 (Not Modified), returned cached response.
* Cacheable responses marked as private are cached with a private cache key.
* Cache lookups look in private cache first, and then in the public cache.
