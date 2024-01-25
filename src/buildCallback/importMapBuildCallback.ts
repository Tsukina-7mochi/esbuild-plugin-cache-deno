import { esbuild, path } from '../../deps.ts';
import ImportMapResolver from '../importMapResolver.ts';
import { createURL } from '../util.ts';

const toURL = function (specifier: string): URL {
  return createURL(specifier) ?? path.toFileUrl(path.resolve(specifier));
};

const onImportMapKeyResolve = (
  build: esbuild.PluginBuild,
  importMapResolver: ImportMapResolver,
  importMapBasePath: string,
  remoteCacheNamespace: string,
  npmCacheNamespace: string,
) =>
(args: esbuild.OnResolveArgs): Promise<esbuild.OnResolveResult> | null => {
  if (
    args.namespace === remoteCacheNamespace ||
    args.namespace === npmCacheNamespace
  ) {
    // Within the namespace, each resolver is responsible for importMap resolution
    return null;
  }

  const specifier = createURL(args.path)?.href ?? args.path;
  const importer = toURL(args.importer !== '' ? args.importer : Deno.cwd());
  const url = importMapResolver.resolve(specifier, importer, true);
  if (url === null) {
    return null;
  }

  const resolved = url.protocol === 'file:'
    ? build.resolve(path.fromFileUrl(url), {
      kind: args.kind,
      importer: args.importer,
      resolveDir: importMapBasePath,
    })
    : build.resolve(url.href, {
      kind: args.kind,
      importer: args.importer,
      resolveDir: importMapBasePath,
    });

  return resolved.then((res) => ({
    ...res,
    warnings: [
      ...res.warnings,
      ...importMapResolver.warnings
    ]
  }));
};

export { onImportMapKeyResolve };
