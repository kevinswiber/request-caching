request-caching
===============

An HTTP client with caching, built on top of [request](https://github.com/mikeal/request).

It works as a drop-in replacement for `request`. All that is needed is to pass a `cache` option:

```
request('http://some.url', {cache: cache}, function(err, res, body) {
  
});
```

The `cache` object must be an object with the following methods:

* `add(key, val, function(err){})`
* `remove(key, function(err){})`
* `get(key, function(err, val){})`
