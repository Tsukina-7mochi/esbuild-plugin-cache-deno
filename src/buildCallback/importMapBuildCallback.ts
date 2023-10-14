import { esbuild, posix } from '../../deps.ts';
import ImportMapResolver from '../importMap.ts';

const onImportMapKeyResolve = (
  build: esbuild.PluginBuild,
  importMapResolver: ImportMapResolver,
  importMapBasePath: string,
  remoteCacheNamespace: string,
  npmCacheNamespace: string
) => (args: esbuild.OnResolveArgs): Promise<esbuild.OnResolveResult> | null => {
  if (
    args.namespace === remoteCacheNamespace ||
    args.namespace === npmCacheNamespace
  ) {
    // Within the namespace, each resolver is responsible for importMap resolution
    return null;
  }

  const url = importMapResolver.resolve(
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
      resolveDir: importMapBasePath,
    });
  }

  return build.resolve(url.href, {
    kind: args.kind,
    importer: args.importer,
    resolveDir: importMapBasePath,
  });
}

export { onImportMapKeyResolve };
