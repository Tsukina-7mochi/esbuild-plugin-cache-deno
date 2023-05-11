import { esbuild, asserts } from "../deps.ts";
import esbuildCachePlugin from "../mod.ts";
import lockMap from './lock.json' assert { type: 'json' };
import { getDenoCacheDir, denoRunScript } from "./util.ts";

const testName = (name: string) => `[remote-direct] ${name}`;

Deno.test(testName('CDN #1'), async () => {
  const denoCacheDirectory = await getDenoCacheDir();

  try {
    await esbuild.build({
      entryPoints: ['./test/remote-direct/cdn1.ts'],
      bundle: true,
      outdir: './test/dist',
      platform: 'browser',
      plugins: [
        esbuildCachePlugin({
          lockMap,
          denoCacheDirectory,
        }),
      ],
    });
  } finally {
    esbuild.stop();
  }

  asserts.assertEquals(
    (await denoRunScript('./test/dist/cdn1.js', ['-A']))?.trim(),
    'true'
  );
});

Deno.test(testName('CDN #2'), async () => {
  const denoCacheDirectory = await getDenoCacheDir();

  try {
    await esbuild.build({
      entryPoints: ['./test/remote-direct/cdn2.ts'],
      bundle: true,
      outdir: './test/dist',
      platform: 'browser',
      plugins: [
        esbuildCachePlugin({
          lockMap,
          denoCacheDirectory,
        }),
      ],
    });
  } finally {
    esbuild.stop();
  }

  asserts.assertEquals(
    (await denoRunScript('./test/dist/cdn2.js', ['-A']))?.trim(),
    'true'
  );
});

Deno.test(testName('CDN #3 (redirect)'), async () => {
  const denoCacheDirectory = await getDenoCacheDir();

  try {
    await esbuild.build({
      entryPoints: ['./test/remote-direct/cdn3.ts'],
      bundle: true,
      outdir: './test/dist',
      platform: 'browser',
      plugins: [
        esbuildCachePlugin({
          lockMap,
          denoCacheDirectory,
        }),
      ],
    });
  } finally {
    esbuild.stop();
  }

  asserts.assertEquals(
    (await denoRunScript('./test/dist/cdn3.js', ['-A']))?.trim(),
    'true'
  );
});

Deno.test(testName('npm #1'), async () => {
  const denoCacheDirectory = await getDenoCacheDir();

  try {
    await esbuild.build({
      entryPoints: ['./test/remote-direct/npm1.ts'],
      bundle: true,
      outdir: './test/dist',
      platform: 'browser',
      plugins: [
        esbuildCachePlugin({
          lockMap,
          denoCacheDirectory,
        }),
      ],
    });
  } finally {
    esbuild.stop();
  }

  asserts.assertEquals(
    (await denoRunScript('./test/dist/npm1.js', ['-A']))?.trim(),
    'true'
  );
});

Deno.test(testName('npm #2'), async () => {
  const denoCacheDirectory = await getDenoCacheDir();

  try {
    await esbuild.build({
      entryPoints: ['./test/remote-direct/npm2.ts'],
      bundle: true,
      outdir: './test/dist',
      platform: 'browser',
      plugins: [
        esbuildCachePlugin({
          lockMap,
          denoCacheDirectory,
        }),
      ],
    });
  } finally {
    esbuild.stop();
  }

  asserts.assertEquals(
    (await denoRunScript('./test/dist/cdn2.js', ['-A']))?.trim(),
    'true'
  );
});
