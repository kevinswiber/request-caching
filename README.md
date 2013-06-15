# request-caching

An HTTP client with caching, built on top of [request](https://github.com/mikeal/request).

It works as a drop-in replacement for `request`. All that is needed is to pass a `cache` option:

```
request('http://some.url', {cache: cache}, function(err, res, body) {
  
});
```

The `cache` object must be an object with the following methods:

* `add(key, val, function(err){})`
* `get(key, function(err, val){})`

## How it works

* All cacheable responses are cached, even if they are expired.
* Nothing is ever removed from the cache.
* If a cached response is not expired, returns it
* If a cached response is expired, issue request with `If-None-Match` value from cached response's `ETag`.
  If response is 304 (Not Modified), returned cached response.
  * TODO: re-cache with updated expiry date?
