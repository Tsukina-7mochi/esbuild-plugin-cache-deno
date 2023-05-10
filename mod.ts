import { esbuild, fs, posix, sha256 } from './deps.ts';
import requireNodeModule from './npm.ts';

interface Importmap {
  imports?: { [key: string]: string };
  scopes?: {
    [key: string]: { [key: string]: string };
  };
}

interface LockMap {
  version: '2';
  remote: { [key: string]: string };
  npm: {
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
  loaderRules?: LoaderRules;
}

interface RemoteCachePluginData {
  loader: esbuild.Loader | undefined;
  cachePath: string;
  fileHash: string;
}

interface NpmCachePluginData {
  asModule: boolean;
  pkgStr: string;
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
  if (res.status !== 302) {
    return null;
  }

  return res.headers.get('location');
};

const getNodePackagePath = async function(
  importName: string,
  dependencies: { [key: string]: string },
  denoCacheDirectory: string
) {
  if(!(importName in dependencies)) {
    return;
  }
  const pkgStr = dependencies[importName];
  const [pkgName, pkgVersion] = decomposePackageNameVersion(pkgStr);

  const cacheBasePath = posix.resolve(
    denoCacheDirectory,
    'npm',
    'registry.npmjs.org',
    pkgName,
    pkgVersion
  );

  try {
    const pkgJsonContent = await Deno.readTextFile(posix.join(cacheBasePath, 'package.json'));
    const entryFileName = JSON.parse(pkgJsonContent).main;

    if(typeof entryFileName !== 'string') {
      return null;
    }
    return {
      path: posix.join(cacheBasePath, entryFileName),
      pkgStr
    };
  } catch {
    if(await fs.exists(posix.join(cacheBasePath, 'package.json'))) {
      return {
        path: posix.join(cacheBasePath, 'index.json'),
        pkgStr
      };
    }
    return null;
  }
}

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

function esbuildCachePlugin(options: Options): esbuild.Plugin {
  const remoteCacheNamespace = 'net.ts7m.esbuild-cache-plugin.general';
  const npmCacheNamespace = 'net.ts7m.esbuild-cache-plugin.npm';
  const imports = options.importmap?.imports ?? {};
  const scope = options.importmap?.scopes ?? {};

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
      // resolve baseed on import map
      for (const importName in imports) {
        const filter = new RegExp(`^${importName}$`, 'i');
        build.onResolve({ filter }, (args) => {
          let path = imports[args.path];
          for (const scopePath in scope) {
            if (!posix.relative(scopePath, args.importer).startsWith('..')) {
              if (args.path in scope[scopePath]) {
                path = scope[scopePath][args.path];
              }
            }
          }

          return build.resolve(path, {
            kind: args.kind,
          });
        });
      }

      // listen import starts with "http" and "https"
      build.onResolve({ filter: /^https?:\/\// }, async (args) => {
        const lockMap = options.lockMap;
        let remoteUrl = args.path;
        if (!(remoteUrl in lockMap.remote)) {
          // check if the redirect destination is in list
          const redirectLocation = await getRedirectedLocation(remoteUrl);
          if (typeof redirectLocation !== 'string') {
            return null;
          }
          if (!(redirectLocation in lockMap.remote)) {
            return null;
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
        const fileHash = options.lockMap.remote[remoteUrl];
        return {
          path: remoteUrl,
          namespace: remoteCacheNamespace,
          pluginData: { loader, cachePath, fileHash },
        };
      });

      // resolve npm imports
      build.onResolve({ filter: /^npm:/ }, async (args) => {
        const pkg = await getNodePackagePath(
          args.path.slice(4),
          options.lockMap.npm.specifiers,
          options.denoCacheDirectory
        );

        if(pkg === null || pkg === undefined) {
          return null;
        }

        return {
          path: pkg.path,
          namespace: npmCacheNamespace,
          pluginData: {
            pkgStr: pkg.pkgStr,
            asModule: true,
          },
        };
      });

      build.onResolve({ filter: /.*/, namespace: npmCacheNamespace }, async (args) => {
        const pluginData = args.pluginData as NpmCachePluginData;

        if(!pluginData.asModule) {
          const nodePathResolveResult = await requireNodeModule(args.path, args.importer);

          if(nodePathResolveResult !== null && nodePathResolveResult !== undefined) {
            return {
              ...nodePathResolveResult,
              namespace: npmCacheNamespace,
              pluginData: {
                pkgStr: pluginData.pkgStr,
                asModule: false,
              },
            };
          }
        }

        // console.log(args);

        const pkg = await getNodePackagePath(
          args.path,
          options.lockMap.npm.packages[pluginData.pkgStr]?.dependencies ?? {},
          options.denoCacheDirectory
        );
        if(pkg !== null && pkg !== undefined) {
          return {
            path: pkg.path,
            namespace: npmCacheNamespace,
            pluginData: {
              pkgStr: pkg.pkgStr,
              asModule: false,
            },
          }
        }

        return null;
      });

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

          if(posix.isAbsolute(args.path)) {
            const contents = await Deno.readTextFile(args.path);
            const loader = getLoader(args.path);

            return {
              contents,
              loader,
              pluginData: {
                ...pluginData,
                asModule: false,
              },
            };
          }
        }
      );
    },
  };
}

export { esbuildCachePlugin };

export default esbuildCachePlugin;
