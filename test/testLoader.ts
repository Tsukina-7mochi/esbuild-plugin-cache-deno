import { esbuild, asserts } from '../deps.ts';
import esbuildCachePlugin from '../mod.ts';
import { getDenoCacheDir, denoRunScript } from './util.ts';
import lockMap from './lock.json' assert { type: 'json' };

const testName = (name: string) => `[loader] ${name}`;

Deno.test(testName('Load as text'), async () => {
  const denoCacheDirectory = await getDenoCacheDir();

  try {
    await esbuild.build({
      entryPoints: ['./test/loader/loader1.ts'],
      bundle: true,
      outdir: './test/dist',
      platform: 'browser',
      plugins: [
        esbuildCachePlugin({
          lockMap,
          denoCacheDirectory,
          loaderRules: [
            { test: /^https:\/\/esm\.sh\/react@18\.2\.0/, loader: 'text' },
          ],
        }),
      ],
    });
  } finally {
    esbuild.stop();
  }

  asserts.assertEquals(
    (await denoRunScript('./test/dist/loader1.js', ['-A']))?.trim(),
    '/* esm.sh - react@18.2.0 */\nexport * from "https://esm.sh/stable/react@18.2.0/deno/react.mjs";\nexport { default } from "https://esm.sh/stable/react@18.2.0/deno/react.mjs";'
  );
});
