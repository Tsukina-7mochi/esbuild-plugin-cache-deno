import { esbuild, asserts } from '../deps.ts';
import esbuildCachePlugin from '../mod.ts';
import { getDenoCacheDir, denoRunScript } from './util.ts';
import lockMap from './lock.json' assert { type: 'json' };
import importmap from './import_map.json' assert { type: 'json' };

const testName = (name: string) => `[importmap] ${name}`;

Deno.test(testName('Simple'), async () => {
  const denoCacheDirectory = await getDenoCacheDir();

  try {
    await esbuild.build({
      entryPoints: ['./test/importmap/simple/main.ts'],
      bundle: true,
      outdir: './test/dist',
      platform: 'browser',
      plugins: [
        esbuildCachePlugin({
          lockMap,
          importmap,
          importmapBasePath: 'test/',
          denoCacheDirectory,
        }),
      ],
    });
  } finally {
    esbuild.stop();
  }

  asserts.assertEquals(
    (await denoRunScript('./test/dist/main.js', ['-A']))?.trim(),
    'true'
  );
});

Deno.test(testName('Path prefix'), async () => {
  const denoCacheDirectory = await getDenoCacheDir();

  try {
    await esbuild.build({
      entryPoints: ['./test/importmap/pathPrefix/main.ts'],
      bundle: true,
      outdir: './test/dist',
      platform: 'browser',
      plugins: [
        esbuildCachePlugin({
          lockMap,
          importmap,
          importmapBasePath: 'test/',
          denoCacheDirectory,
        }),
      ],
    });
  } finally {
    esbuild.stop();
  }

  asserts.assertEquals(
    (await denoRunScript('./test/dist/main.js', ['-A']))?.trim(),
    'true'
  );
});

Deno.test(testName('Scope'), async () => {
  const denoCacheDirectory = await getDenoCacheDir();

  try {
    await esbuild.build({
      entryPoints: ['./test/importmap/scope/main.ts'],
      bundle: true,
      outdir: './test/dist',
      platform: 'browser',
      plugins: [
        esbuildCachePlugin({
          lockMap,
          importmap,
          importmapBasePath: 'test/',
          denoCacheDirectory,
        }),
      ],
    });
  } finally {
    esbuild.stop();
  }

  asserts.assertEquals(
    (await denoRunScript('./test/dist/main.js', ['-A']))?.trim(),
    'true'
  );
});
