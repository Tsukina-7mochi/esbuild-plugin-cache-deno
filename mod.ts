import { esbuild, fs, posix, sha256 } from './deps.ts';
import requireNodeModule from './npm.ts';

interface Importmap {
  imports?: { [key: string]: string };
  scopes?: {
    [key: string]: { [key: string]: string };
  };
}

interface LockMap {
  version: string;
  remote?: { [key: string]: string };
  npm?: {
    specifiers: { [key: string]: string };
    packages: {
      [key: string]: {
        integrity: string;
        dependencies: { [key: string]: string };
      };
    };
  };
}

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
  npmModulePolyfill?: {
    [key: string]: { moduleName: string } | { loader: string };
  };
}

interface RemoteCachePluginData {
  loader: esbuild.Loader | undefined;
  cachePath: string;
  fileHash: string;
}

interface NpmCachePluginData {
  asModule?: boolean;
  pkgStr: string;
  loader?: esbuild.Loader | undefined;
  requireResolve?: boolean;
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

const getNodeModulePath = async function (
  name: string,
  version: string,
  denoCacheDirectory: string,
) {
  const cacheBasePath = posix.resolve(
    denoCacheDirectory,
    'npm',
    'registry.npmjs.org',
    name,
    version,
  );

  // try to open package.json
  const getPackageJsonMainField = () =>
    Deno.readTextFile(posix.join(cacheBasePath, 'package.json'))
      .then((fileContent) => JSON.parse(fileContent)['main'])
      .then((mainField) => {
        if (typeof mainField === 'string') {
          return posix.join(cacheBasePath, mainField);
        }
      })
      .catch(() => null);

  const getFile = (filename: string) =>
    Promise.resolve(posix.join(cacheBasePath, filename))
      .then(async (path) => ({
        path,
        exists: await fs.exists(path, { isFile: true }),
      }))
      .then(({ path, exists }) => exists ? path : null);

  return await getPackageJsonMainField() ??
    await getFile('index.js') ??
    await getFile('index.json') ??
    await getFile('index.node');
};

const resolveNodeModule = async function (
  importName: string,
  importer: string,
  dependencies: { [key: string]: string },
  denoCacheDirectory: string,
  polyfills: {
    [key: string]: { moduleName: string } | { loader: string };
  },
  asModule = false,
): Promise<esbuild.OnResolveResult | null> {
  const nodeModule = await requireNodeModule(
    importName,
    importer,
    Object.keys(dependencies),
  );

  if (nodeModule === null) {
    return null;
  }

  if (!asModule && nodeModule.type === 'file') {
    return {
      path: nodeModule.name,
      pluginData: {},
    };
  } else if (
    asModule || nodeModule.type === 'core-module' ||
    nodeModule.type === 'module'
  ) {
    if (nodeModule.name in polyfills) {
      const polyfill = polyfills[nodeModule.name];
      if ('moduleName' in polyfill) {
        return {
          path: polyfill.moduleName,
          pluginData: { requireResolve: true },
        };
      } else {
        return {
          path: 'stub',
          pluginData: { loader: polyfill.loader },
        };
      }
    }

    if (nodeModule.type === 'core-module') {
      return {
        errors: [{ text: `Cannot bundle core module ${nodeModule.name}` }],
      };
    }

    const pkgStr = dependencies[nodeModule.name];
    if (typeof pkgStr !== 'string') {
      return null;
    }

    const [pkgName, pkgVersion] = decomposePackageNameVersion(pkgStr);
    const modulePath = await getNodeModulePath(
      pkgName,
      pkgVersion,
      denoCacheDirectory,
    );
    if (typeof modulePath !== 'string') {
      return null;
    }

    return {
      path: modulePath,
      pluginData: {
        pkgStr: pkgStr,
      },
    };
  }

  return null;
};

/**
 * @example "package@version" -> ["package", "version"]
 * @example "package" -> ["package", ""]
 * @example "@author/package@version" -> ["@author/package", "version"]
 * @example "@author/package" -> ["@author/package", ""]
 */
const decomposePackageNameVersion = function (
  pkgStr: string,
): [string, string] {
  const index = pkgStr.lastIndexOf('@');
  if (index <= 0) {
    return [pkgStr, ''];
  } else {
    return [pkgStr.slice(0, index), pkgStr.slice(index + 1)];
  }
};

const resolvePathWithImportMap = function (
  map: { [key: string]: string },
  path: string,
) {
  for (const key in map) {
    // keys can be used as prefix only when it ends with "/"
    if (key.endsWith('/')) {
      if (path.startsWith(key)) {
        return map[key] + path.slice(key.length);
      }
    } else {
      if (path === key) {
        return map[key];
      }
    }
  }

  return null;
};

function esbuildCachePlugin(options: Options): esbuild.Plugin {
  if (options.lockMap.version !== '2') {
    throw Error(
      `Lock map version ${options.lockMap.version} is not supported.`,
    );
  }

  const remoteCacheNamespace = 'net.ts7m.esbuild-cache-plugin.general';
  const npmCacheNamespace = 'net.ts7m.esbuild-cache-plugin.npm';
  const imports = options.importmap?.imports ?? {};
  const _scopes = options.importmap?.scopes ?? {};
  const scopes = Object.keys(_scopes)
    .map((path) => {
      try {
        const url = new URL(path);
        return {
          path,
          isFullUrl: true,
          pathSegments: url.pathname.split('/').filter((v) => v.length > 0),
          map: _scopes[path],
        };
      } catch {
        return {
          path,
          isFullUrl: false,
          pathSegments: path.split('/').filter((v) => v.length > 0),
          map: _scopes[path],
        };
      }
    })
    .toSorted((a, b) => b.pathSegments.length - a.pathSegments.length);

  const importmapBasePath = posix.resolve(options.importmapBasePath ?? '.');
  const npmModulePolyfill = options.npmModulePolyfill ?? {};
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
      for (const importName in imports) {
        const filter = importName.endsWith('/')
          ? new RegExp(`^${importName}`, 'i')
          : new RegExp(`^${importName}$`, 'i');
        build.onResolve({ filter }, (args) => {
          let path = resolvePathWithImportMap(imports, args.path);

          for (const scope of scopes) {
            if (scope.isFullUrl) {
              if (args.importer.startsWith(scope.path)) {
                const resolved = resolvePathWithImportMap(scope.map, args.path);
                if (typeof resolved === 'string') {
                  path = resolved;
                  break;
                }
              }
            } else {
              if (
                args.importer.includes(`/${scope.pathSegments.join('/')}/`) ||
                args.importer.endsWith(`/${scope.pathSegments.join('/')}`)
              ) {
                const resolved = resolvePathWithImportMap(scope.map, args.path);
                if (typeof resolved === 'string') {
                  path = resolved;
                  break;
                }
              }
            }
          }

          if (path === null) {
            return null;
          }

          return build.resolve(path, {
            kind: args.kind,
            importer: args.importer,
            resolveDir: importmapBasePath,
          });
        });
      }

      // listen import starts with "http" and "https"
      build.onResolve({ filter: /^https?:\/\// }, async (args) => {
        let remoteUrl = args.path;
        if (!(remoteUrl in lockMap.remote)) {
          // check if the redirect destination is in list
          const redirectLocation = await getRedirectedLocation(remoteUrl);
          if (typeof redirectLocation !== 'string') {
            return null;
          }
          if (!(redirectLocation in lockMap.remote)) {
            return {
              warnings: [{ text: `${args.path} not found in lock map` }],
            };
          }

          remoteUrl = redirectLocation;
        }

        const url = new URL(remoteUrl);
        const hashContext = new sha256.Sha256();
        const pathHash = hashContext.update(url.pathname).toString();
        const cachePath = posix.resolve(
          options.denoCacheDirectory,
          'deps',
          url.protocol.slice(0, -1),
          url.hostname,
          pathHash,
        );
        const loader = getLoader(remoteUrl);
        const fileHash = lockMap.remote[remoteUrl];
        return {
          path: remoteUrl,
          namespace: remoteCacheNamespace,
          pluginData: { loader, cachePath, fileHash },
        };
      });

      // resolve npm imports
      build.onResolve({ filter: /^npm:/ }, async (args) => {
        const result = await resolveNodeModule(
          args.path.slice(4),
          args.importer,
          lockMap.npm.specifiers,
          options.denoCacheDirectory,
          npmModulePolyfill,
        );
        if(result === null || (typeof result.path !== 'string')) {
          return null;
        }

        if(result.pluginData?.requireResolve) {
          return await build.resolve(result.path, {
            importer: args.importer,
            kind: args.kind,
            resolveDir: '.',
          });
        }

        return {
          ...result,
          namespace: npmCacheNamespace,
        };
      });

      build.onResolve(
        { filter: /.*/, namespace: npmCacheNamespace },
        async (args) => {
          const pluginData = args.pluginData as NpmCachePluginData;
          const _result = await resolveNodeModule(
            args.path,
            args.importer,
            lockMap.npm.packages[pluginData.pkgStr]?.dependencies ?? {},
            options.denoCacheDirectory,
            npmModulePolyfill,
          );
          if(_result === null || (typeof _result.path !== 'string')) {
            return null;
          }
          if(_result.pluginData?.requireResolve) {
            return await build.resolve(_result.path, {
              importer: args.importer,
              kind: args.kind,
              resolveDir: '.',
            });
          }

          const result = {
            ..._result,
            namespace: npmCacheNamespace,
          };

          if ('pluginData' in result) {
            result.pluginData = {
              ...pluginData,
              ...result.pluginData,
              asModule: false,
            };
          }

          return result;
        },
      );

      // verify the checksum of the cached file
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
          } catch {
            return {
              errors: [{ text: `Failed to load cache of ${args.path}` }],
            };
          }
        },
      );

      // return the content with the appropriate loader
      build.onLoad(
        { filter: /.*/, namespace: npmCacheNamespace },
        async (args) => {
          const pluginData = args.pluginData as NpmCachePluginData;

          if (posix.isAbsolute(args.path)) {
            const contents = await Deno.readTextFile(args.path);
            const loader = pluginData.loader ?? getLoader(args.path);

            return {
              contents,
              loader,
              pluginData,
            };
          } else if (pluginData.loader === 'empty') {
            return {
              contents: '',
              loader: pluginData.loader,
              pluginData,
            };
          }
        },
      );
    },
  };
}

import * as util from './util.ts';
esbuildCachePlugin.util = util;
export { esbuildCachePlugin };

export default esbuildCachePlugin;
