import { Loader, Plugin } from 'https://deno.land/x/esbuild@v0.17.11/mod.js';
import * as Cache from 'https://deno.land/x/cache@0.2.13/mod.ts';

interface Options {
  directory?: string;
  rules?: [{
    test: RegExp;
    loader: Loader | string;
  }];
}

export function esbuildCachePlugin(options: Options): Plugin {
  const namespace = 'esbuild-cache-plugin';
  if (options.directory) {
    Cache.configure({ directory: options.directory });
  }

  return {
    name: 'esbuild-cache-plugin',
    setup(build) {
      // tag import paths starting with "http:" and "https:"
      // with the namespace
      build.onResolve({ filter: /^https?:\/\// }, (args) => ({
        path: args.path,
        namespace,
      }));

      // npm import is not currently supported
      build.onResolve({ filter: /^npm:/ }, (args) => {
        console.log(args.path);

        return {
          path: args.path,
          warnings: [{ text: 'npm import is not supported by esbuild-cache-plugin' }]
        }
      });

      // Resolve all namespace-marked paths to URLs
      build.onResolve({ filter: /.*/, namespace }, (args) => {
        try {
          return {
            path: new URL(args.path).toString(),
            namespace,
          };
        } catch {
          return {
            path: new URL(args.path, args.importer).toString(),
            namespace,
          };
        }
      });

      build.onLoad({ filter: /.*/, namespace }, async (args) => {
        const file = await Cache.cache(args.path);
        let loader = undefined;

        for (const rule of options.rules ?? []) {
          if (rule.test.test(args.path)) {
            loader = rule.loader;
            break;
          }
        }

        return {
          contents: await Deno.readTextFile(file.path),
          loader: loader as Loader,
        };
      });
    },
  };
}
