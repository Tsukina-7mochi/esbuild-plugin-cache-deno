import { esbuild } from './deps.ts';
import { cache as Cache } from './deps.ts';
import { posix } from './deps.ts';

interface Importmap {
  imports?: { [key: string]: string },
  scope?: {
    [key: string]: { [key: string]: string }
  },
}

interface Options {
  directory?: string;
  importmap?: Importmap;
  rules?: [{
    test: RegExp;
    loader: esbuild.Loader | string;
  }];
}

function esbuildCachePlugin(options: Options): esbuild.Plugin {
  const namespace = 'esbuild-cache-plugin';
  if (options.directory) {
    Cache.configure({ directory: options.directory });
  }
  const imports = options.importmap?.imports ?? {};
  const scope = options.importmap?.scope ?? {};

  return {
    name: 'esbuild-cache-plugin',
    setup(build) {
      // resolve import map
      for(const importName in imports) {
        const filter = new RegExp(`^${importName}$`, 'i');

        build.onResolve({ filter }, (args) => {
          let path = imports[args.path];
          for(const scopePath in scope) {
            if(!posix.relative(scopePath, args.importer).startsWith('..')) {
              if(args.path in scope[scopePath]) {
                path = scope[scopePath][args.path];
              }
            }
          }

          return { path, namespace };
        });
      }

      // npm import is not currently supported
      build.onResolve({ filter: /^npm:/ }, (args) => {
        return {
          path: args.path,
          warnings: [{
            text: 'npm import is not supported by esbuild-cache-plugin',
          }],
        };
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
          loader: loader as esbuild.Loader,
        };
      });
    },
  };
}

export { esbuildCachePlugin };

export default esbuildCachePlugin;
