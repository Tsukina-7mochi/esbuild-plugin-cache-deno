import { esbuild, posix } from '../deps.ts';
import type { ImportMap } from './importMap.ts';
import type { LockMapV3 } from './types.ts';
import ImportMapResolver from './importMap.ts';
import * as util from '../util.ts';
import { onImportMapKeyResolve } from './buildCallback/importMapBuildCallback.ts';
import {
  onRemoteLoad,
  onRemoteNamespaceResolve,
  onRemoteResolve,
  remotePluginNamespace,
} from './buildCallback/remoteBuildCallback.ts';
import {
  npmPluginNamespace,
  onNpmLoad,
  onNpmNamespaceResolve,
  onNpmResolve,
} from './buildCallback/npmBuildCallback.ts';

type LoaderRules = {
  test: RegExp;
  loader: esbuild.Loader;
}[];

type Options = {
  lockMap: LockMapV3;
  denoCacheDirectory: string;
  /** @deprecated */
  importmap?: ImportMap;
  importMap?: ImportMap;
  /** @deprecated */
  importmapBasePath?: string;
  importMapBasePath?: string;
  loaderRules?: LoaderRules;
}

type NormalizedOptions = {
  lockMap: LockMapV3;
  denoCacheDirectory: string;
  importMap?: ImportMap;
  importMapBasePath?: string;
  loaderRules?: LoaderRules;
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

const normalizeOptions = function (options: Options): NormalizedOptions {
  return {
    lockMap: options.lockMap,
    denoCacheDirectory: options.denoCacheDirectory,
    importMap: options.importMap ?? options.importmap,
    importMapBasePath: options.importMapBasePath ?? options.importmapBasePath,
    loaderRules: options.loaderRules,
  };
};

function esbuildCachePlugin(options: Options): esbuild.Plugin {
  options = normalizeOptions(options);

  const lockMap = {
    version: options.lockMap.version,
    remote: options.lockMap.remote ?? {},
    redirects: options.lockMap.redirects ?? {},
    packages: {
      specifiers: options.lockMap.packages?.specifiers ?? {},
      npm: options.lockMap.packages?.npm ?? {},
    },
  };
  const cacheRoot = posix.toFileUrl(options.denoCacheDirectory);
  if (!cacheRoot.pathname.endsWith('/')) {
    cacheRoot.pathname += '/';
  }
  const importMap = options.importMap ?? {};
  const importMapBasePath_ = posix.resolve(options.importMapBasePath ?? '.');
  const importMapBasePath = importMapBasePath_.endsWith('/')
    ? importMapBasePath_
    : `${importMapBasePath_}/`;
  const importMapBaseUrl = posix.toFileUrl(importMapBasePath);
  const importMapResolver = new ImportMapResolver(importMap, importMapBaseUrl);
  const loaderRules = [
    // Rules that appear early take precedence
    ...(options.loaderRules ?? []),
    ...defaultLoaderRules,
  ];

  if (lockMap.version !== '3') {
    throw Error(
      `Lock map version ${lockMap.version} is not supported.`,
    );
  }

  const getLoader = function (path: string): esbuild.Loader | null {
    for (const rule of loaderRules) {
      if (rule.test.test(path)) {
        return rule.loader;
      }
    }
    return null;
  };

  return {
    name: 'esbuild-cache-plugin',
    setup(build) {
      // redirect imports in import map
      const importKeys = new Set([
        ...Object.keys(importMap?.imports ?? {}),
        ...Object.values(importMap?.scopes ?? {})
          .flatMap((map) => Object.keys(map)),
      ]);
      for (const importKey of importKeys) {
        const filter = importKey.endsWith('/')
          ? new RegExp(`^${importKey}`, 'i')
          : new RegExp(`^${importKey}$`, 'i');

        build.onResolve(
          { filter },
          onImportMapKeyResolve(
            build,
            importMapResolver,
            importMapBasePath,
            remotePluginNamespace,
            npmPluginNamespace,
          ),
        );
      }

      // listen import starts with "http" and "https"
      build.onResolve(
        { filter: /^https?:\/\// },
        onRemoteResolve(
          lockMap,
          cacheRoot,
          getLoader,
        ),
      );

      build.onResolve(
        { filter: /.*/, namespace: remotePluginNamespace },
        onRemoteNamespaceResolve(
          build,
          importMapResolver,
        ),
      );

      // resolve npm imports
      build.onResolve(
        { filter: /^npm:/ },
        onNpmResolve(
          lockMap,
          cacheRoot,
          importMapResolver,
          getLoader,
        ),
      );
      build.onResolve(
        { filter: /.*/, namespace: npmPluginNamespace },
        onNpmNamespaceResolve(
          lockMap,
          cacheRoot,
          importMapResolver,
          getLoader,
        ),
      );

      // verify the hash of the cached file
      // and return the content with the appropriate loader
      build.onLoad(
        { filter: /.*/, namespace: remotePluginNamespace },
        onRemoteLoad(),
      );

      // return the content with the appropriate loader
      build.onLoad(
        { filter: /.*/, namespace: npmPluginNamespace },
        onNpmLoad(),
      );
    },
  };
}

esbuildCachePlugin.util = util;

export { esbuildCachePlugin };
export default esbuildCachePlugin;
