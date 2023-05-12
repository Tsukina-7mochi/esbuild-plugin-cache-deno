import { esbuild, asserts } from '../deps.ts';
import esbuildCachePlugin from '../mod.ts';
import { getDenoCacheDir, denoRunScript } from './util.ts';
import lockMap from './lock.json' assert { type: 'json' };

const testName = (name: string) => `[polyfill] ${name}`;

Deno.test(testName('Polyfill #1'), async () => {
  const denoCacheDirectory = await getDenoCacheDir();

  try {
    await esbuild.build({
      entryPoints: ['./test/polyfill/polyfill1.ts'],
      bundle: true,
      outdir: './test/dist',
      platform: 'browser',
      plugins: [
        esbuildCachePlugin({
          lockMap,
          denoCacheDirectory,
          npmModulePolyfill: {
            // build will fail because semver@7.5.0 uses Node's core module "util"
            util: { loader: 'empty' },
          },
        }),
      ],
    });
  } finally {
    esbuild.stop();
  }

  asserts.assertEquals(
    (await denoRunScript('./test/dist/polyfill1.js', ['-A']))?.trim(),
    'true'
  );
});

Deno.test(testName('Polyfill #2'), async () => {
  const denoCacheDirectory = await getDenoCacheDir();

  try {
    await esbuild.build({
      entryPoints: ['./test/polyfill/polyfill2.ts'],
      bundle: true,
      outdir: './test/dist',
      platform: 'browser',
      plugins: [
        esbuildCachePlugin({
          lockMap,
          denoCacheDirectory,
          npmModulePolyfill: {
            // build will fail because semver@7.5.0 uses Node's core module "util"
            util: { moduleName: './test/polyfill/polyfill2-util.ts' },
          },
        }),
      ],
    });
  } finally {
    esbuild.stop();
  }

  const content = Deno.readTextFileSync('./test/dist/polyfill2.js');
  asserts.assert(content.includes('net.ts7m.esbuild-cache-plugin.polyfill2-util embedded text'));
});
