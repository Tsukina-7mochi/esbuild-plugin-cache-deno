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
            importmap: {
                imports: {
                    "preact": "https://esm.sh/preact@10.13.2"
                }
            },
            rules: [
                {
                    test: /\.css$/,
                    loader: 'css'
                }
            ],
        }),
    ],
]);
```

## Options

```typescript
interface Options {
  directory?: string;
  importmap: Importmap;
  rules?: [{
    test: RegExp;
    loader: Loader | string;
  }];
}
```

- `directory`: location where cache files are created
- `importmap`: [importmap](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap) for resolve import
- `rules`: Rules for loader selection based on file name
    - `test`: `RegExp` object to test file name
    - `loader` a loader used to load file (default: [esbuild default](https://esbuild.github.io/plugins/#on-load-results))
