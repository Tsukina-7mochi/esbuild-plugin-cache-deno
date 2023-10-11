import { asserts, esbuild, fs, posix } from "../../deps.ts";
import esbuildCachePlugin from '../../mod.ts';
import { denoRunScript } from './util.ts';

const testName = (name: string) => `[loader rules] ${name}`;
const relative = (path: string) => posix.resolve('./test/build/', path);
const cacheRootPath = '/tmp/net.ts7m.esbuild-cache-plugin/';
const cachePath = posix.join(cacheRootPath, 'cache');
const destPath = posix.join(cacheRootPath, 'dest');
const cleanCache = async function() {
  if(await fs.exists(cacheRootPath)) {
    await Deno.remove(cacheRootPath, { recursive: true });
  }
}
const modulePath = (path: string) => {
  return posix.join(cachePath, 'npm', 'registry.npmjs.org', path);
}

// NOTE: Individual functions are unit tested,
// so we only need to test if the importmap is working

Deno.test(testName("Local without importmap"), async () => {
  await cleanCache();
  await fs.ensureDir(destPath);

  try {
    await esbuild.build({
      entryPoints: [
        relative('importmap/main.ts'),
      ],
      bundle: true,
      outdir: destPath,
      platform: 'browser',
      plugins: [
        esbuildCachePlugin({
          lockMap: { version: "3" },
          denoCacheDirectory: cachePath,
          importmap: {},
          importmapBasePath: relative('importmap')
        }),
      ],
    });
  } finally {
    esbuild.stop();
  }

  asserts.assertEquals(
    (await denoRunScript(posix.join(destPath, 'main.js'), ['-A']))?.trim(),
    'module1'
  );
});

Deno.test(testName("Local with importmap"), async () => {
  await cleanCache();
  await fs.ensureDir(destPath);

  try {
    await esbuild.build({
      entryPoints: [
        relative('importmap/main.ts'),
      ],
      bundle: true,
      outdir: destPath,
      platform: 'browser',
      plugins: [
        esbuildCachePlugin({
          lockMap: { version: "3" },
          denoCacheDirectory: cachePath,
          importmap: {
            imports: {
              "./module1.ts": "./module2.ts"
            }
          },
          importmapBasePath: relative('importmap')
        }),
      ],
    });
  } finally {
    esbuild.stop();
  }

  asserts.assertEquals(
    (await denoRunScript(posix.join(destPath, 'main.js'), ['-A']))?.trim(),
    'module2'
  );
});
