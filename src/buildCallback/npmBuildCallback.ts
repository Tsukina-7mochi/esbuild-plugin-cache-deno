import { esbuild, posix } from '../../deps.ts';
import * as npm from '../npm.ts';
import ImportMapResolver from '../importMap.ts';
import { LockMapV3 } from '../types.ts';
import { OnLoadResult } from 'https://deno.land/x/esbuild@v0.19.4/mod.js';

const npmPluginNamespace = 'net.ts7m.esbuild-cache-plugin.npm';

type NpmPluginData = {
  loader?: esbuild.Loader | undefined;
  cachePath: string;
  // hash: string;
};
const npmPluginData = (pluginData: NpmPluginData): NpmPluginData => pluginData;

const onNpmResolve = (
  lockMap: LockMapV3,
  cacheRoot: URL,
  importMapResolver: ImportMapResolver,
  getLoader: (path: string) => esbuild.Loader | null,
) =>
async (
  args: esbuild.OnResolveArgs,
): Promise<esbuild.OnResolveResult | null> => {
  const importerUrl = await Promise.resolve()
    .then(() => new URL(args.importer))
    .catch(() => posix.toFileUrl(args.importer))
    .catch(() => null);
  if (importerUrl === null) {
    return null;
  }

  const url = await npm.resolveImport(
    args.path,
    importerUrl,
    cacheRoot,
    lockMap,
    importMapResolver,
  );
  if (url === null) {
    return null;
  }

  const loader = getLoader(url.href) ?? undefined;
  if (url.protocol === 'node:' && loader !== 'empty') {
    return {
      errors: [{ text: 'Cannot import Node.js\'s core modules.' }],
    };
  }

  const cachePath = loader === 'empty'
    ? ''
    : posix.fromFileUrl(npm.toCacheURL(url, cacheRoot));
  // const hash = lockMap.npm.packages[pkgFullName].integrity;

  return {
    path: url.href,
    namespace: npmPluginNamespace,
    pluginData: npmPluginData({ loader, cachePath }),
  };
};

const onNpmLoad =
  () => async (args: esbuild.OnLoadArgs): Promise<OnLoadResult> => {
    const pluginData = args.pluginData as NpmPluginData;

    try {
      const contents = pluginData.loader === 'empty'
        ? ''
        : await Deno.readFile(pluginData.cachePath);
      // TODO: Verify the hash

      return { contents, loader: pluginData.loader };
    } catch (err) {
      return {
        errors: [{
          text: `Failed to load cache of ${args.path}`,
          detail: (err instanceof Error ? err.message : err),
        }],
      };
    }
  };

export {
  npmPluginNamespace,
  onNpmLoad,
  onNpmResolve,
  onNpmResolve as onNpmNamespaceResolve,
};
