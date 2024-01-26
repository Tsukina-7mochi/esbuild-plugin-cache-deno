# Example: Ignoring Modules

You can ignore specific module import with `loaderRules` option by mapping `empty` loader to `node:` modules:

```javascript
esbuildCachePlugin({
  loaderRules: [
    // ignore node core modules
    { test: /^node:/, loader: 'empty' },
  ],
})
```

You can also map other patterns to loaders such as `.css$` to `css` loader.
