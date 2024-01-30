import { esbuild } from '../../deps.ts';
import esbuildCachePlugin from '../../mod.ts';

const lockMap = JSON.parse(Deno.readTextFileSync('./deno.lock'));

const denoPath = await esbuildCachePlugin.util.getDenoDir();
await esbuild.build({
  entryPoints: ['./index.ts'],
  bundle: true,
  outfile: './bundle.js',
  plugins: [
    esbuildCachePlugin({
      denoCacheDirectory: denoPath,
      lockMap,
      loaderRules: [
        { test: /^node:/, loader: 'empty' },
      ],
    }),
  ],
});

await esbuild.stop();
