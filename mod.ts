import { esbuild, fs, posix, sha256 } from './deps.ts';
import requireNodeModule from './npm.ts';

type CustomOnResolveResult<PluginData>
  = Partial<esbuild.OnResolveResult> | { pluginData: PluginData };

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

const getNodeModulePath = async function(name: string, version: string, denoCacheDirectory: string) {
  const cacheBasePath = posix.resolve(
    denoCacheDirectory,
    'npm',
    'registry.npmjs.org',
    name,
    version
  );

  // try to open package.json
  const getPackageJsonMainField = () => Deno.readTextFile(posix.join(cacheBasePath, 'package.json'))
    .then((fileContent) => JSON.parse(fileContent)['main'])
    .then((mainField) => {
      if(typeof mainField === 'string') {
        return posix.join(cacheBasePath, mainField);
      }
    })
    .catch(() => null);

  const getFile = (filename: string) => Promise.resolve(posix.join(cacheBasePath, filename))
    .then(async (path) => ({ path, exists: await fs.exists(path, { isFile: true }) }))
    .then(({ path, exists }) => exists ? path : null);

  return await getPackageJsonMainField()
    ?? await getFile('index.js')
    ?? await getFile('index.json')
    ?? await getFile('index.node');
}

const resolveNodeModule = async function(
  importName: string,
  importer: string,
  dependencies: { [key: string]: string },
  denoCacheDirectory: string,
  polyfills: {
    [key: string]: { moduleName: string } | { loader: string };
  },
  asModule = false
): Promise<CustomOnResolveResult<NpmCachePluginData> | null> {
  const nodeModule = await requireNodeModule(
    importName,
    importer,
    Object.keys(dependencies)
  );

  if(nodeModule === null) {
    return null;
  }

  if(!asModule && nodeModule.type === 'file') {
    return {
      path: nodeModule.name,
      pluginData: {}
    };
  } else if(asModule || nodeModule.type === 'core-module' || nodeModule.type === 'module') {

    if(nodeModule.name in polyfills) {
      const polyfill = polyfills[nodeModule.name];
      if('moduleName' in polyfill) {
        return await resolveNodeModule(
          polyfill.moduleName,
          importer,
          dependencies,
          denoCacheDirectory,
          polyfills
        );
      } else {
        return {
          path: 'stub',
          pluginData: { loader: polyfill.loader }
        }
      }
    }

    if(nodeModule.type === 'core-module') {
      return { errors: [{ text: `Cannot bundle core module ${nodeModule.name}` }] };
    }

    const pkgStr = dependencies[nodeModule.name];
    if(typeof pkgStr !== 'string') {
      return null;
    }

    const [pkgName, pkgVersion] = decomposePackageNameVersion(pkgStr);
    const modulePath = await getNodeModulePath(pkgName, pkgVersion, denoCacheDirectory);
    if(typeof modulePath !== 'string') {
      return null;
    }

    return {
      path: modulePath,
      pluginData: {
        pkgStr: pkgStr
      }
    };
  }

  return null;
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
  const npmModulePolyfill = options.npmModulePolyfill ?? {};

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
            importer: args.importer,
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
        return {
          ...await resolveNodeModule(
            args.path.slice(4),
            args.importer,
            options.lockMap.npm.specifiers,
            options.denoCacheDirectory,
            npmModulePolyfill
          ),
          namespace: npmCacheNamespace
        };
      });

      build.onResolve({ filter: /.*/, namespace: npmCacheNamespace }, async (args) => {
        const pluginData = args.pluginData as NpmCachePluginData;
        const result = {
          ...await resolveNodeModule(
            args.path,
            args.importer,
            options.lockMap.npm.packages[pluginData.pkgStr]?.dependencies ?? {},
            options.denoCacheDirectory,
            npmModulePolyfill
          ),
          namespace: npmCacheNamespace,
        };

        if('pluginData' in result) {
          result.pluginData = {
            ...pluginData,
            ...result.pluginData,
            asModule: false
          };
        }

        return result;
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
            const loader = pluginData.loader ?? getLoader(args.path);

            return {
              contents,
              loader,
              pluginData,
            };
          } else if(pluginData.loader === 'empty') {
            return {
              contents: '',
              loader: pluginData.loader,
              pluginData,
            };
          }
        }
      );
    },
  };
}

export { esbuildCachePlugin };

export default esbuildCachePlugin;
