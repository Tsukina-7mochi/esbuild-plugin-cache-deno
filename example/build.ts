import { esbuild } from '../deps.ts';
import esbuildCachePlugin from '../mod.ts';
import importmap from './import_map.json' assert { type: 'json' };
import lockMap from './lock.json' assert { type: 'json' };

const denoPath = Deno.args[0];

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
      denoCacheDirectory: denoPath,
      importmap,
      npmModulePolyfill: {
        'util': { loader: 'empty' },
      },
    }),
  ],
};

await esbuild.build(config);

esbuild.stop();
