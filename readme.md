# Esbuild Cache Plugin for Deno

Esbuild Cache Plugin for Deno is an esbuild plugin to resolve remote (http/https) and even npm modules using Deno's cache.

## Features

- Resolves http/https imports to Deno's cache.
- Resolves npm module imports to Deno's cache.
  - Of course resolving `import`s and `require`s in the npm module.
  - Supports polyfill for npm modules.
- Resolves [importmaps](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap).

## Examlpe

```typescript
import { esbuild } from '../deps.ts';
import esbuildCachePlugin from '../mod.ts';
import importmap from './import_map.json' assert { type: 'json' };
import lockMap from './lock.json' assert { type: 'json' };

// to use deno.lock file, you should parse the file manually
// const lockMap = JSON.parse(Deno.readTextFileSync('./deno.lock'));

const config: esbuild.BuildOptions = {
  entryPoints: [ 'src/main.ts' ],
  bundle: true,
  outdir: './dist',
  platform: 'browser',
  plugins: [
    esbuildCachePlugin({
      lockMap,
      denoCacheDirectory: '/home/ts7m/.cache/deno',
      importmap,
      npmModulePolyfill: {
        'util': { loader: 'empty' },
      },
    }),
  ],
};

await esbuild.build(config);

esbuild.stop();

```

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
- `importmap`:
  [importmap](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap)
  for resolve import
- `rules`: Rules for loader selection based on file name
  - `test`: `RegExp` object to test file name
  - `loader` a loader used to load file (default:
    [esbuild default](https://esbuild.github.io/plugins/#on-load-results))
