import { esbuild } from '../../deps.ts';
import esbuildCachePlugin from '../../mod.ts';

const importMap = JSON.parse(Deno.readTextFileSync('./import_map.json'));
const lockMap = JSON.parse(Deno.readTextFileSync('./deno.lock'));

const denoPath = await esbuildCachePlugin.util.getDenoDir();
await esbuild.build({
  target: 'esnext',
  platform: 'browser',
  entryPoints: ['./index.ts'],
  bundle: true,
  outfile: './bundle.js',
  plugins: [
    esbuildCachePlugin({
      denoCacheDirectory: denoPath,
      importMap,
      lockMap,
      loaderRules: [
        { test: /^node:/, loader: 'empty' },
      ],
    }),
  ],
});

esbuild.stop();
