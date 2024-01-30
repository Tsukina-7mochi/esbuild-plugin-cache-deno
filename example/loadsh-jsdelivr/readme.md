# Example: Import Map

You can use import maps to map imports with `importMap` option:

```javascript
esbuildCachePlugin({
  importMap: {
    "imports": {
      "https://example.com/foo/": "./src/polyfill/foo/"
    },
    "scopes": {
      "./src/foo.ts": {
        "https://example.com/foo/": "./src/polyfill/bar/"
      }
    }
  },
}),
```
