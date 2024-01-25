import { esbuild } from '../../deps.ts';

const loaderPluginNamespace = 'net.ts7m.esbuild-cache-plugin.loader';

const registerLoaderCallback = function(
  build: esbuild.PluginBuild,
  filter: RegExp,
  loader: esbuild.Loader
): void {
  build.onResolve({ filter }, (args) => {
    return {
      path: args.path,
      namespace: loaderPluginNamespace,
    };
  });

  build.onLoad(
    { filter, namespace: loaderPluginNamespace },
    async (args) => {
      const contents = loader === 'empty'
        ? ''
        : await Deno.readFile(args.path);

      return { contents, loader };
    },
  );
}

export {
  registerLoaderCallback,
  loaderPluginNamespace
}
