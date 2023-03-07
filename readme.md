# esbuild-cache-plugin for Deno

An esbuild plugin to cache HTTP/HTTPS imports for Deno.

## Example

```typescript
import esbuild from 'esbuild';
import esbuildCachePlugin from 'esbuild-cache-plugin';

await esbuild.build([
    entryPoints: ['app.js'],
    bundle: true,
    outfile: 'out.js',
    plugins: [
        esbuildCachePlugin({
            directory: cachePath,
            rules: [
                {
                    test: /\.css$/,
                    loader: 'css'
                }
            ]
        }),
    ],
]);
```

## Options

```typescript
interface Options {
  directory?: string;
  rules?: [{
    test: RegExp;
    loader: Loader | string;
  }];
}
```

- `directory`: location where cache files are created
- `rules`: Rules for loader selection based on file name
    - `test`: `RegExp` object to test file name
    - `loader` a loader used to load file (default: [esbuild default](https://esbuild.github.io/plugins/#on-load-results))
