import { esbuild, posix } from '../../deps.ts';
import * as http from '../http.ts';
import ImportMapResolver from '../importMap.ts';
import { LockMapV3 } from '../types.ts';

const remotePluginNamespace = 'net.ts7m.esbuild-cache-plugin.general';
type RemotePluginData = {
  loader: esbuild.Loader | undefined;
  cachePath: string;
  fileHash: string;
}
const remotePluginData = (pluginData: RemotePluginData): RemotePluginData => pluginData;

const onRemoteResolve = (
  lockMap: LockMapV3,
  cacheRoot: URL,
  getLoader: (path: string) => esbuild.Loader | null,
) => (args: esbuild.OnResolveArgs): esbuild.OnResolveResult | null => {
  let fileUrl = new URL(args.path);

  if(lockMap.remote === undefined) {
    return null;
  }

  if (!(fileUrl.href in lockMap.remote)) {
    // check if the redirect destination is in list
    return null;
  }

  if (fileUrl === null) {
    return null;
  }
  const cachePath = posix.fromFileUrl(http.toCacheURL(fileUrl, cacheRoot));
  const loader = getLoader(fileUrl.href) ?? undefined;
  const fileHash = lockMap.remote[fileUrl.href];
  return {
    path: fileUrl.href,
    namespace: remotePluginNamespace,
    pluginData: remotePluginData({ loader, cachePath, fileHash }),
  };
};

const onRemoteNamespaceResolve = (
  build: esbuild.PluginBuild,
  importMapResolver: ImportMapResolver
) => (args: esbuild.OnResolveArgs): Promise<esbuild.OnResolveResult> | null => {
  const fileUrl = http.resolveImport(
    args.path,
    new URL(args.importer),
    importMapResolver,
  );
  if (fileUrl === null) {
    return null;
  }

  return build.resolve(fileUrl.href, {
    kind: args.kind,
    importer: args.importer,
  });
};

const onRemoteLoad = () => async (args: esbuild.OnLoadArgs): Promise<esbuild.OnLoadResult> => {
  const pluginData = args.pluginData as RemotePluginData;

  try {
    const contents = await Deno.readFile(pluginData.cachePath);
    const hashArrayBuffer = await crypto.subtle.digest(
      'SHA-256',
      contents,
    );
    const hashView = new Uint8Array(hashArrayBuffer);
    const hashHexString = Array.from(hashView)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (hashHexString !== pluginData.fileHash) {
      return {
        errors: [{ text: `Outdated cache detected for ${args.path}` }],
      };
    }

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
  remotePluginNamespace,
  onRemoteResolve,
  onRemoteNamespaceResolve,
  onRemoteLoad,
};
