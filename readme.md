# esbuild Cache Plugin for Deno

esbuild Cache Plugin for Deno is an esbuild plugin to resolve remote (http/https) and even npm modules using Deno's cache.

## Features

- Resolves http/https imports to Deno's cache.
- Resolves npm module imports to Deno's cache.
  - Of course resolving `import`s and `require`s in the npm module.
  - Supports polyfill for npm modules.
- Resolves [importmaps](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap).
- Customizing loader of remote files.

## Usage

### Minimum Example

```typescript
import { esbuild } from 'https://deno.land/x/esbuild';
import esbuildCachePlugin from 'https://deno.land/x/esbuild_plugin_cache_deno';
import lockMap from './lock.json' assert { type: 'json' };

// To use deno.lock file, you should parse the file manually
// const lockMap = JSON.parse(Deno.readTextFileSync('./deno.lock'));

const config: esbuild.BuildOptions = {
  entryPoints: [ 'src/main.ts' ],
  bundle: true,
  outdir: './dist',
  platform: 'browser',
  plugins: [
    esbuildCachePlugin({
      lockMap,
      denoCacheDirectory: '/home/[user]/.cache/deno'
    }),
  ],
};

await esbuild.build(config);

esbuild.stop();
```

And don't forget to cache `src/main.ts` with Deno:

```shell
$deno cache --lock=./test/lock.json --lock-write ./src/main.ts
# or to use deno.lock:
# $deno cache ./src/main.ts
```

The you can use remote imports like:

```typescript
// src/main.ts
import * as react from "https://esm.sh/react";

console.log(react.version);
```

### Getting Deno's Cache Path

There's a utility function to get `DENO_PATH` from output of `deno info` command and you can use the pass as `denoCacheDirectory`.

```typescript
const denoPath = await esbuildCachePlugin.util.getDenoDir();
```

Alternatively, you can pass them from CLI argument using shell scripts.

### Using NPM Modules

You can use npm modules just like using them in Deno:

```typescript
// src/main.ts
import * as react from "npm:react";

console.log(react.version);
```

You can replace or remove some modules like Node.js's core modules using import-maps and custom loader (details are in the next section).

```typescript
esbuildCachePlugin({
  lockMap,
  denoCacheDirectory: '/home/[user]/.cache/deno',
  importmap: {
    imports: {
      // replace "http" module to polyfill
      "node:http": "/src/polyfill/http.ts",
    },
  },
  loaderRules: [
    // remote "util" module
    { test: /^node:util/, loader: 'empty' },
  ],
}),
```

### Using Import Maps

You can pass [import maps](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap) with `importmap` option.

```typescript
esbuildCachePlugin({
  lockMap,
  denoCacheDirectory: '/home/[user]/.cache/deno',
  importmap: {
    imports: {
      react: "https://esm.sh/react",
    },
  },
}),
```

Then you can use the module specifier like:

```typescript
// src/main.ts
import * as react from "react";

console.log(react.version);
```

Of cause you can use your import maps you're using for the intellisense:

```typescript
import importmap from './import_map.json' assert type { type: 'json' };

// ...

esbuildCachePlugin({
  lockMap,
  denoCacheDirectory: '/home/[user]/.cache/deno',
  importmap,
}),
```

Also you can disguise import map's path for import maps not located in the CWD:

```typescript
import importmap from './src/import_map.json' assert type { type: 'json' };

// ...

esbuildCachePlugin({
  lockMap,
  denoCacheDirectory: '/home/[user]/.cache/deno',
  importmap,
  importmapBasePath: 'src/',
}),
```

### Customizing loaders

You can specify loaders for files with `loaderRules` option. The plugin uses default loader as the esbuild, you may not need to use this option.

```typescript
esbuildCachePlugin({
  lockMap,
  denoCacheDirectory: '/home/[user]/.cache/deno',
  loaderRules: [
    { test: /\.css$/, loader: 'css' },
  ],
}),
```
