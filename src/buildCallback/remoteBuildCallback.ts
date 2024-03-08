import { esbuild, path } from '../../deps.ts';
import { resolveImport, toCacheURL } from '../http.ts';
import ImportMapResolver from '../importMapResolver.ts';
import { LockMapV3 } from '../types.ts';
import { createURL } from '../util.ts';

const remotePluginNamespace = 'net.ts7m.esbuild-cache-plugin.general';
type RemotePluginData = {
  loader: esbuild.Loader | undefined;
  cachePath: string;
  fileHash: string;
};
const remotePluginData = (pluginData: RemotePluginData): RemotePluginData =>
  pluginData;

const onRemoteResolve = (
  lockMap: LockMapV3,
  cacheRoot: URL,
  getLoader: (path: string) => esbuild.Loader | null,
) =>
(args: esbuild.OnResolveArgs): esbuild.OnResolveResult | null => {
  let remoteURLString = args.path;
  const redirects = lockMap.redirects ?? {};
  const remote = lockMap.remote ?? {};

  while (remoteURLString in redirects) {
    remoteURLString = redirects[remoteURLString];
  }
  const fileHash = remote[remoteURLString];
  if (typeof fileHash !== 'string') {
    return null;
  }

  const remoteURL = createURL(remoteURLString);
  if (remoteURL === null) {
    return null;
  }

  const cachePath = toCacheURL(remoteURL, cacheRoot).href;
  const loader = getLoader(remoteURL.href) ?? undefined;
  return {
    path: remoteURLString,
    namespace: remotePluginNamespace,
    pluginData: remotePluginData({ loader, cachePath, fileHash }),
  };
};

const onRemoteNamespaceResolve = (
  build: esbuild.PluginBuild,
  importMapResolver: ImportMapResolver,
) =>
(args: esbuild.OnResolveArgs): Promise<esbuild.OnResolveResult> | null => {
  const fileUrl = resolveImport(
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
  }).then((res) => ({
    ...res,
    warnings: [
      ...res.warnings,
      ...importMapResolver.warnings,
    ],
  }));
};

const onRemoteLoad =
  () => async (args: esbuild.OnLoadArgs): Promise<esbuild.OnLoadResult> => {
    const pluginData = args.pluginData as RemotePluginData;

    // try {
    const contents = await Deno.readFile(
      path.fromFileUrl(pluginData.cachePath),
    );
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
    // } catch (err) {
    //   return {
    //     errors: [{
    //       text: `Failed to load cache of ${args.path}`,
    //       detail: (err instanceof Error ? err.message : err),
    //     }],
    //   };
    // }
  };

export {
  onRemoteLoad,
  onRemoteNamespaceResolve,
  onRemoteResolve,
  remotePluginNamespace,
};
