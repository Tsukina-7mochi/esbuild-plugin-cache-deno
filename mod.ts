import { esbuild, posix, sha256 } from './deps.ts';
import type { Importmap } from './src/importmap.ts';
import type { LockMap } from './src/types.ts';
import ImportmapResolver from './src/importmap.ts';
import * as http from './src/http.ts';
import * as npm from './src/npm.ts';
import * as util from './util.ts';

type LoaderRules = {
  test: RegExp;
  loader: esbuild.Loader;
}[];

interface Options {
  lockMap: LockMap;
  denoCacheDirectory: string;
  importmap?: Importmap;
  importmapBasePath?: string;
  loaderRules?: LoaderRules;
}

interface RemoteCachePluginData {
  loader: esbuild.Loader | undefined;
  cachePath: string;
  fileHash: string;
}

interface NpmCachePluginData {
  loader?: esbuild.Loader | undefined;
  cachePath: string;
  // hash: string;
}

const defaultLoaderRules: LoaderRules = [
  { test: /\.(c|m)?js$/, loader: 'js' },
  { test: /\.jsx$/, loader: 'jsx' },
  { test: /\.(c|m)?ts$/, loader: 'ts' },
  { test: /\.tsx$/, loader: 'tsx' },
  { test: /\.json$/, loader: 'json' },
  { test: /\.css$/, loader: 'css' },
  { test: /\.txt$/, loader: 'text' },
];

const getRedirectedLocation = async function (url: string) {
  const res = await fetch(url, { redirect: 'manual' });
  // Close response body to prevent resource leakage
  await res.body?.cancel();
  if (res.status !== 302) {
    return null;
  }

  return res.headers.get('location');
};

function esbuildCachePlugin(options: Options): esbuild.Plugin {
  if (options.lockMap.version !== '2') {
    throw Error(
      `Lock map version ${options.lockMap.version} is not supported.`,
    );
  }

  const remoteCacheNamespace = 'net.ts7m.esbuild-cache-plugin.general';
  const npmCacheNamespace = 'net.ts7m.esbuild-cache-plugin.npm';
  const cacheRoot = posix.toFileUrl(options.denoCacheDirectory);
  if (!cacheRoot.pathname.endsWith('/')) {
    cacheRoot.pathname += '/';
  }
  const importmapBasePath = posix.resolve(options.importmapBasePath ?? '.');
  const importmapBaseUrl = posix.toFileUrl(
    importmapBasePath.endsWith('/') ? importmapBasePath : `${importmapBasePath}/`
  );
  const importmapResolver = new ImportmapResolver(
    options.importmap ?? {},
    importmapBaseUrl,
  );
  const lockMap = {
    remote: {},
    npm: { specifiers: {}, packages: {} },
    ...options.lockMap,
  };

  const loaderRules = [
    ...(options.loaderRules ?? []),
    ...defaultLoaderRules,
  ];
  const getLoader = function (path: string) {
    for (const rule of loaderRules) {
      if (rule.test.test(path)) {
        return rule.loader;
      }
    }
    return undefined;
  };

  return {
    name: 'esbuild-cache-plugin',
    setup(build) {
      // resolve based on import map
      const importKeys = new Set([
        ...Object.keys(options.importmap?.imports ?? {}),
        ...Object.values(options.importmap?.scopes ?? {})
          .flatMap((map) => Object.keys(map)),
      ]);
      for (const importKey of importKeys) {
        const filter = importKey.endsWith('/')
          ? new RegExp(`^${importKey}`, 'i')
          : new RegExp(`^${importKey}$`, 'i');
        build.onResolve({ filter }, (args) => {
          const url = importmapResolver.resolve(
            args.path,
            new URL('.', posix.toFileUrl(args.importer)),
          );
          if (url === null) {
            return null;
          }

          if (url.protocol === 'file:') {
            return build.resolve(posix.fromFileUrl(url), {
              kind: args.kind,
              importer: args.importer,
              resolveDir: importmapBasePath,
            });
          }

          return build.resolve(url.href, {
            kind: args.kind,
            importer: args.importer,
            resolveDir: importmapBasePath,
          });
        });
      }

      // listen import starts with "http" and "https"
      build.onResolve({ filter: /^https?:\/\// }, async (args) => {
        let fileUrl = new URL(args.path);

        if (!(fileUrl.href in lockMap.remote)) {
          // check if the redirect destination is in list
          const redirectLocation = await getRedirectedLocation(fileUrl.href);
          if (typeof redirectLocation !== 'string') {
            return null;
          }
          if (!(redirectLocation in lockMap.remote)) {
            return {
              warnings: [{ text: `${args.path} not found in lock map` }],
            };
          }

          fileUrl = new URL(redirectLocation);
        }

        if(fileUrl === null) {
          return null;
        }
        const cachePath = posix.fromFileUrl(http.toCacheURL(fileUrl, cacheRoot));
        const loader = getLoader(fileUrl.href);
        const fileHash = lockMap.remote[fileUrl.href];
        return {
          path: fileUrl.href,
          namespace: remoteCacheNamespace,
          pluginData: { loader, cachePath, fileHash },
        };
      });

      build.onResolve(
        { filter: /.*/, namespace: remoteCacheNamespace },
        (args) => {
          const fileUrl = http.resolveImport(
            args.path,
            new URL(args.importer),
            importmapResolver
          );
          if(fileUrl === null) {
            return null;
          }

          return build.resolve(fileUrl.href, {
            kind: args.kind,
            importer: args.importer,
          });
        },
      );

      // resolve npm imports
      const resolveNpm = async (args: esbuild.OnResolveArgs) => {
        const importerUrl = await Promise.resolve()
          .then(() => new URL(args.importer))
          .catch(() => posix.toFileUrl(args.importer))
          .catch(() => null);
        if(importerUrl === null) {
          return null;
        }

        const url = await npm.resolveImport(
          args.path,
          importerUrl,
          cacheRoot,
          lockMap,
          importmapResolver
        );
        if(url === null) {
          return null;
        }

        const loader = getLoader(url.href);
        if(url.protocol === 'node:' && loader !== 'empty') {
          return { errors: [{ text: 'Cannot import Node.js\'s core modules.' }] };
        }

        const cachePath = loader === 'empty'
          ? ''
          : posix.fromFileUrl(npm.toCacheURL(url, cacheRoot));
        // const hash = lockMap.npm.packages[pkgFullName].integrity;

        return {
          path: url.href,
          namespace: npmCacheNamespace,
          pluginData: { loader, cachePath },
        };
      }
      build.onResolve({ filter: /^npm:/ }, resolveNpm);
      build.onResolve(
        { filter: /.*/, namespace: npmCacheNamespace },
        resolveNpm
      );

      // verify the hash of the cached file
      // and return the content with the appropriate loader
      build.onLoad(
        { filter: /.*/, namespace: remoteCacheNamespace },
        async (args) => {
          const pluginData = args.pluginData as RemoteCachePluginData;

          try {
            const contents = await Deno.readFile(pluginData.cachePath);
            const hashContext = new sha256.Sha256();
            const contentsHash = hashContext.update(contents).toString();

            if (contentsHash !== pluginData.fileHash) {
              return {
                errors: [{ text: `Outdated cache detected for ${args.path}` }],
              };
            }

            return { contents, loader: pluginData.loader };
          } catch(err) {
            return {
              errors: [{
                text: `Failed to load cache of ${args.path}`,
                detail: (err instanceof Error ? err.message : err)
              }],
            };
          }
        },
      );

      // return the content with the appropriate loader
      build.onLoad(
        { filter: /.*/, namespace: npmCacheNamespace },
        async (args) => {
          const pluginData = args.pluginData as NpmCachePluginData;

          try {
            const contents = pluginData.loader === 'empty'
              ? ''
              : await Deno.readFile(pluginData.cachePath);
            // TODO: Verify the hash

            return { contents, loader: pluginData.loader };
          } catch(err) {
            return {
              errors: [{
                text: `Failed to load cache of ${args.path}`,
                detail: (err instanceof Error ? err.message : err)
              }],
            }
          }
        },
      );
    },
  };
}

esbuildCachePlugin.util = util;
export { esbuildCachePlugin };

export default esbuildCachePlugin;
