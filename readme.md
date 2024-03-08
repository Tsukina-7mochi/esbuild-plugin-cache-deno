# esbuild Cache Plugin for Deno

The esbuild Cache Plugin for Deno is an esbuild plugin designed to resolve remote (HTTP/HTTPS) and npm modules using Deno's cache.

## Features

- Resolve HTTP/HTTPS imports to cached files
- Resolve npm module imports to cached files
- Resolve [import maps](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap)
- Customize loader patterns

## Usage

To resolve http/https/npm imports, a lock file (default to `deno.lock`) file is needed.
To create this file, ensure you have `deno.json` in your workspace directory.

### Quick Example

```typescript
// build.ts
import { esbuild } from 'https://deno.land/x/esbuild';
import esbuildCachePlugin from 'https://deno.land/x/esbuild_plugin_cache_deno';

const lockMap = JSON.parse(Deno.readTextFileSync('./deno.lock'));

// note that `util.getDenoDir` requires `--allow-run` permission
// due to it parses `deno info` output.
const denoDir = await esbuildCachePlugin.util.getDenoDir();
await esbuild.build({
  entryPoints: [ './src/main.ts' ],
  bundle: true,
  outdir: './dist',
  platform: 'browser',
  plugins: [
    esbuildCachePlugin({
      lockMap,
      denoCacheDirectory: denoDir,
    }),
  ],
});

await esbuild.stop();
```

Include remote imports in your code, for instance:

```typescript
// ./src/main.ts
import * as react from "https://esm.sh/react";
// or
// import * as react from "npm:react";

console.log(react.version);
```

Don't forget to cache `src/main.ts` with Deno:

```shell
$ deno cache ./src/main.ts
```

See more examples in `/example` directory.

### Getting Deno's Cache Path

You can retrieve Deno's cache path using `deno info` command:

```sh
$ deno info
DENO_DIR location: /home/user/.cache/deno
Remote modules cache: /home/user/.cache/deno/deps
npm modules cache: /home/user/.cache/deno/npm
Emitted modules cache: /home/user/.cache/deno/gen
Language server registries cache: /home/user/.cache/deno/registries
Origin storage: /home/user/.cache/deno/location_data
```

Or use the utility function to extract the value:

```typescript
const denoDir = await esbuildCachePlugin.util.getDenoDir();
```

## API Reference

### Import

Import the plugin like this:

```typescript
import esbuildCachePlugin from 'https://deno.land/x/esbuild_plugin_cache_deno';
```

Or,

```typescript
import { esbuildCachePlugin } from 'https://deno.land/x/esbuild_plugin_cache_deno';
```

### Options

#### lockMap (required)

The JSON parsed content of lock file.

```typescript
const lockMap = JSON.parse(Deno.readTextFileSync('./deno.lock'));
esbuildCachePlugin({
  lockMap,
  denoCacheDirectory: denoDir,
});
```

#### denoCacheDirectory (required)

The cache directory of Deno (`DENO_DIR` of `deno info` command).

```typescript
const denoDir = await esbuildCachePlugin.util.getDenoDir();
esbuildCachePlugin({
  lockMap,
  denoCacheDirectory: denoDir,
});
```

#### importMap (optional)

The import map of the project. By default, the plugin resolves the map based on cwd of the process. You can overwrite it with the `importMapBasePath` option.

```typescript
esbuildCachePlugin({
  lockMap,
  denoCacheDirectory: denoDir,
  importMap: {
    imports: {
      'react': 'https://esm.sh/react'
    }
  }
});
```

#### importMapBasePath

The base path to resolve import map. Default to `Deno.cwd()`.

```typescript
esbuildCachePlugin({
  lockMap,
  denoCacheDirectory: denoDir,
  importMap: {
    imports: {
      'foo': 'util/foo.ts'
    }
  },
  importMapBasePath: './src',
});
```

#### loaderRules

Rules of the loaders by the module specifier to load. Default to the values below and merged with them taking higher priority.

```
[
  { test: /\.(c|m)?js$/, loader: 'js' },
  { test: /\.jsx$/, loader: 'jsx' },
  { test: /\.(c|m)?ts$/, loader: 'ts' },
  { test: /\.tsx$/, loader: 'tsx' },
  { test: /\.json$/, loader: 'json' },
  { test: /\.css$/, loader: 'css' },
  { test: /\.txt$/, loader: 'text' },
]
```

Setting loader `empty` makes the module ignored:

```typescript
esbuildCachePlugin({
  lockMap,
  denoCacheDirectory: denoDir,
  loaderRules: [{ test: /node:util/, loader: 'empty' }],
});
```

## Tested packages

| Package |  npm  | esm.sh | jsdelivr.net |
| ------- | :---: | :----: | :----------: |
| React   |   ✅   |   ✅    |      -       |
| Preact  |   ✅   |   ✅    |      -       |
| Lit     |   ✅   |   ✅    |      -       |
| Lodash  |   ✅   |   -    |      ✅       |

## npm Module Support

Reference: [Modules: Packages | Node.js v20.2.0 Documentation](https://nodejs.org/api/packages.html#exports-sugar)

|       Specification       | Support |
| ------------------------- | :-----: |
| Main entry point          |    ✅    |
| Subpath exports           | Partial |
| Subpath imports           |    -    |
| Conditional exports       |    ✅    |
| Nested conditions         |    ✅    |
| Resolving user conditions |    -    |
| Package self-referencing  |    ✅    |

### Subpath exports support

Reference: [Package exports | webpack](https://webpack.js.org/guides/package-exports/#support)

|             Specification              | Support |
| -------------------------------------- | :-----: |
| `"."` property                         |    ✅    |
| Normal property                        |    ✅    |
| Property ending with `/`               |    ✅    |
| Property ending with `*`               |    -    |
| Alternatives                           |    -    |
| Abbreviation only path                 |    ✅    |
| Abbreviation only conditions           |    ✅    |
| Conditional syntax                     |    ✅    |
| Nested conditional syntax              |    ✅    |
| Conditions order                       |    -    |
| `"default"` condition                  |    ✅    |
| Path order                             |    -    |
| Error when not mapped                  |    -    |
| Error when mixind conditions and paths |    ✅    |
