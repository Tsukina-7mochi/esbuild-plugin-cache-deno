import { asserts, esbuild, fs, posix } from "../../deps.ts";
import esbuildCachePlugin from '../../mod.ts';
import { denoRunScript } from './util.ts';

const testName = (name: string) => `[polyfill] ${name}`;
const cacheRootPath = '/tmp/net.ts7m.esbuild-cache-plugin/';
const cachePath = posix.join(cacheRootPath, 'cache');
const srcPath = posix.join(cacheRootPath, 'src');
const destPath = posix.join(cacheRootPath, 'dest');
const cleanCache = async function() {
  if(await fs.exists(cacheRootPath)) {
    await Deno.remove(cacheRootPath, { recursive: true });
  }
}
const modulePath = (path: string) => {
  return posix.join(cachePath, 'npm', 'registry.npmjs.org', path);
}

Deno.test(testName("Polyfill #1"), async () => {
  await cleanCache();
  await fs.ensureDir(modulePath('module/1.0.0/'));
  await fs.ensureDir(srcPath);
  await fs.ensureDir(destPath);
  await Promise.all([
    Deno.writeTextFile(
      posix.join(srcPath, 'main.ts'),
      'import * as module from "npm:module@1.0.0"; console.log(module.version);'
    ),
    Deno.writeTextFile(
      modulePath('module/1.0.0/package.json'),
      '{ "name": "module", "main": "index.js" }'
    ),
    Deno.writeTextFile(
      modulePath('module/1.0.0/index.js'),
      'const util = require("util"); util; module.exports = { version: "1.0.0" }'
    ),
  ]);

  try {
    await esbuild.build({
      entryPoints: [
        posix.join(srcPath, 'main.ts'),
      ],
      bundle: true,
      outdir: destPath,
      platform: 'browser',
      plugins: [
        esbuildCachePlugin({
          lockMap: {
            version: "2",
            npm: {
              specifiers: {
                'module@1.0.0': 'module@1.0.0',
              },
              packages: {
                'module@1.0.0': {
                  integrity: 'SHA_HASH_HERE',
                  dependencies: {},
                },
              },
            },
          },
          denoCacheDirectory: cachePath,
          loaderRules: [
            { test: /^node:util/, loader: 'empty' },
          ],
        }),
      ],
    });
  } finally {
    esbuild.stop();
  }

  asserts.assertEquals(
    (await denoRunScript(posix.join(destPath, 'main.js'), ['-A']))?.trim(),
    '1.0.0'
  );
});
