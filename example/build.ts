import { esbuild } from '../deps.ts';
import esbuildCachePlugin from '../mod.ts';
import importmap from './import_map.json' assert { type: 'json' };

const lockMap = JSON.parse(Deno.readTextFileSync('deno.lock'));

const config: esbuild.BuildOptions = {
  entryPoints: [
    {
      in: './example/main.ts',
      out: 'main',
    },
    {
      in: './example/someDir/main2.ts',
      out: 'main2',
    },
  ],
  bundle: true,
  outdir: './example/dist',
  platform: 'browser',
  plugins: [
    esbuildCachePlugin({
      lockMap,
      denoCacheDirectory: '/home/ts7m/.cache/deno',
      importmap,
      npmModulePolyfill: {
        'util': { loader: 'empty' }
      }
    }),
  ],
};

await esbuild.build(config);

esbuild.stop();
