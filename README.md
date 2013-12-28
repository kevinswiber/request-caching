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

## Examples

Below are some common use cases:

### In-memory cache

```javascript
var LRU = require('lru-cache');
var store = new request.MemoryStore(new LRU());
var cache = new request.Cache(store);

request('http://some.url', {cache: cache}, function(err, res, body) {
  
});
```

### Redis cache

```javascript
var redis = require('redis').createClient();
var store = new request.RedisStore(redis);
var cache = new request.Cache(store);

request('http://some.url', {cache: cache}, function(err, res, body) {
  
});
```

### Private caching

Some HTTP responses should be cached privately - i.e. it shouldn't be available for other users.
This is the case when the server responds with `Cache-Control: private`.

To handle this you should supply a `privateKey` function that will compute a cache key unique
to the user associated with the request.

```javascript
function publicKey(key, cb) {
  cb(null, 'yourapp:' + key + ':public');
}

function privateKey(key, cb) {
  // If you don't have a user, you should use the session id: req.cookies['connect.sid']
  cb(null, 'yourapp:' + key + ':private:' + req.currentUser._id);
}

var cache = new request.Cache(store, publicFn, privateFn);

request('http://some.url', {cache: cache}, function(err, res, body) {
  
});
```

It's a good idea to prefix the key with the name of your app (or API) to make it easier to find
(and delete) keys selectively. See `Cache.delMatched`. 

### Custom TTL

```javascript
var store = new request.RedisStore(redis);

function myTtl(ttl) {
  return ttl * 1000; // cache it longer than the server told us to.
}

var cache = new request.Cache(store, null, null, myTtl);

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
