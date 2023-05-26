import { asserts, esbuild, fs, posix } from "../../deps.ts";
import esbuildCachePlugin from '../../mod.ts';
import { denoRunScript } from './util.ts';

const testName = (name: string) => `[importmap] ${name}`;
const relative = (path: string) => posix.resolve('./test/build/', path);
const nativeCacheRootPath = await esbuildCachePlugin.util.getDenoDir();
const cacheRootPath = '/tmp/net.ts7m.esbuild-cache-plugin/';
const destPath = posix.join(cacheRootPath, 'dest');
const cleanCache = async function() {
  if(await fs.exists(cacheRootPath)) {
    await Deno.remove(cacheRootPath, { recursive: true });
  }
}

Deno.test(testName('CDN #1'), async () => {
  await cleanCache();
  await fs.ensureDir(destPath);
  const lockMapText = await Deno.readTextFile(relative('./remote-direct/lock.json'));
  const lockMap = JSON.parse(lockMapText);

  try {
    await esbuild.build({
      entryPoints: [
        relative('remote-direct/cdn1.ts'),
      ],
      bundle: true,
      outdir: destPath,
      platform: 'browser',
      plugins: [
        esbuildCachePlugin({
          lockMap,
          denoCacheDirectory: nativeCacheRootPath,
        }),
      ],
    });
  } finally {
    esbuild.stop();
  }

  asserts.assertEquals(
    (await denoRunScript(posix.join(destPath, 'cdn1.js'), ['-A']))?.trim(),
    'true'
  );
});

Deno.test(testName('CDN #2'), async () => {
  await cleanCache();
  await fs.ensureDir(destPath);
  const lockMapText = await Deno.readTextFile(relative('./remote-direct/lock.json'));
  const lockMap = JSON.parse(lockMapText);

  try {
    await esbuild.build({
      entryPoints: [
        relative('remote-direct/cdn2.ts'),
      ],
      bundle: true,
      outdir: destPath,
      platform: 'browser',
      plugins: [
        esbuildCachePlugin({
          lockMap,
          denoCacheDirectory: nativeCacheRootPath,
        }),
      ],
    });
  } finally {
    esbuild.stop();
  }

  asserts.assertEquals(
    (await denoRunScript(posix.join(destPath, 'cdn2.js'), ['-A']))?.trim(),
    'true'
  );
});

Deno.test(testName('CDN #3'), async () => {
  await cleanCache();
  await fs.ensureDir(destPath);
  const lockMapText = await Deno.readTextFile(relative('./remote-direct/lock.json'));
  const lockMap = JSON.parse(lockMapText);

  try {
    await esbuild.build({
      entryPoints: [
        relative('remote-direct/cdn3.ts'),
      ],
      bundle: true,
      outdir: destPath,
      platform: 'browser',
      plugins: [
        esbuildCachePlugin({
          lockMap,
          denoCacheDirectory: nativeCacheRootPath,
        }),
      ],
    });
  } finally {
    esbuild.stop();
  }

  asserts.assertEquals(
    (await denoRunScript(posix.join(destPath, 'cdn3.js'), ['-A']))?.trim(),
    'true'
  );
});

Deno.test(testName('npm #1'), async () => {
  await cleanCache();
  await fs.ensureDir(destPath);
  const lockMapText = await Deno.readTextFile(relative('./remote-direct/lock.json'));
  const lockMap = JSON.parse(lockMapText);

  try {
    await esbuild.build({
      entryPoints: [
        relative('remote-direct/npm1.ts'),
      ],
      bundle: true,
      outdir: destPath,
      platform: 'browser',
      plugins: [
        esbuildCachePlugin({
          lockMap,
          denoCacheDirectory: nativeCacheRootPath,
        }),
      ],
    });
  } finally {
    esbuild.stop();
  }

  asserts.assertEquals(
    (await denoRunScript(posix.join(destPath, 'npm1.js'), ['-A']))?.trim(),
    'true'
  );
});

Deno.test(testName('npm #2'), async () => {
  await cleanCache();
  await fs.ensureDir(destPath);
  const lockMapText = await Deno.readTextFile(relative('./remote-direct/lock.json'));
  const lockMap = JSON.parse(lockMapText);

  try {
    await esbuild.build({
      entryPoints: [
        relative('remote-direct/npm2.ts'),
      ],
      bundle: true,
      outdir: destPath,
      platform: 'browser',
      plugins: [
        esbuildCachePlugin({
          lockMap,
          denoCacheDirectory: nativeCacheRootPath,
        }),
      ],
    });
  } finally {
    esbuild.stop();
  }

  asserts.assertEquals(
    (await denoRunScript(posix.join(destPath, 'npm2.js'), ['-A']))?.trim(),
    'true'
  );
});

// TODO: Add test for npm3
