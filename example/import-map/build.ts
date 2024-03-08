import { esbuild } from '../../deps.ts';
import esbuildCachePlugin from '../../mod.ts';

const importMap = JSON.parse(Deno.readTextFileSync('./import_map.json'));
const lockMap = JSON.parse(Deno.readTextFileSync('./deno.lock'));

const denoPath = await esbuildCachePlugin.util.getDenoDir();
await esbuild.build({
  entryPoints: ['./src/index.ts'],
  bundle: true,
  outfile: './bundle.js',
  plugins: [
    esbuildCachePlugin({
      denoCacheDirectory: denoPath,
      lockMap,
      importMap,
    }),
  ],
});

await esbuild.stop();
