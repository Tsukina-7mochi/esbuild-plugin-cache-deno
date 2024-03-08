import { assertEquals } from 'assert';
import { resolveImport } from '../../../src/npm.ts';
import { LockMapV3 } from '../../../src/types.ts';
import { PathEntry, createTempFiles } from '../tempfile.ts';

Deno.test('resolveImport', async (testContext) => {
  const tempDir = await Deno.makeTempDir();
  const cacheRoot = new URL(`file:///${tempDir}/`);
  const testResolveImport_ = (testContext: Deno.TestContext) => function(
    moduleSpecifier: string,
    importer: string | URL,
    files: PathEntry,
    lockMap: LockMapV3,
    expected: string | null,
  ) {
    // test step does never run concurrently (Deno throws an error)
    return testContext.step(`${moduleSpecifier} (${expected}) <- ${importer}`, async () => {
      await createTempFiles(files, tempDir);
      const actual = await resolveImport(
        moduleSpecifier,
        new URL(importer),
        cacheRoot,
        lockMap
      );

      assertEquals(actual?.href, expected);
    });
  }

  await testContext.step('core module', async (testContext) => {
    const testResolveImport = testResolveImport_(testContext);

    await testResolveImport(
      'node:http',
      'file:///foo.js',
      {},
      {
        version: '3',
      },
      'node:http'
    );

    await testResolveImport(
      'node:http',
      'npm:foo',
      {},
      {
        version: '3',
      },
      'node:http'
    );

    await testResolveImport(
      'http',
      'file:///foo.js',
      {},
      {
        version: '3',
      },
      'node:http'
    );
  });

  await testContext.step('relative file', async (testContext) => {
    const testResolveImport = testResolveImport_(testContext);

    await testResolveImport(
      './foo.js',
      'npm:/package@1.0.0/index.js',
      {
        'npm/registry.npmjs.org/package/1.0.0': {
          'index.js': 'require("./foo.js");',
          'foo.js': 'console.log("foo");',
        },
      },
      {
        version: '3'
      },
      'npm:/package@1.0.0/foo.js'
    );

    await testResolveImport(
      './foo',
      'npm:/package@1.0.0/index.js',
      {
        'npm/registry.npmjs.org/package/1.0.0': {
          'index.js': 'require("./foo.js");',
          'foo.js': 'console.log("foo");',
        },
      },
      {
        version: '3'
      },
      'npm:/package@1.0.0/foo.js'
    );

    await testResolveImport(
      './foo',
      'npm:/package@1.0.0/index.js',
      {
        'npm/registry.npmjs.org/package/1.0.0': {
          'index.js': 'require("./foo.js");',
          'foo': {
            'index.js': 'console.log("foo");',
          },
        },
      },
      {
        version: '3'
      },
      'npm:/package@1.0.0/foo/index.js'
    );

    await testResolveImport(
      './foo',
      'npm:/package@1.0.0/index.js',
      {
        'npm/registry.npmjs.org/package/1.0.0': {
          'index.js': 'require("./foo.js");',
          'foo': {
            'package.json': '{ "main": "main" }',
            'main.js': 'console.log("foo");',
          },
        },
      },
      {
        version: '3'
      },
      'npm:/package@1.0.0/foo/main.js'
    );

    await testResolveImport(
      './foo',
      'npm:/package@1.0.0/index.js',
      {
        'npm/registry.npmjs.org/package/1.0.0': {
          'index.js': 'require("./foo.js");',
          'foo': {
            'package.json': '{ "main": "main" }',
            'main': {
              'index.js': 'console.log("foo");',
            },
          },
        },
      },
      {
        version: '3'
      },
      'npm:/package@1.0.0/foo/main/index.js'
    );

    // NOTE: this case is not recommended
    await testResolveImport(
      './foo',
      'npm:/package@1.0.0/index.js',
      {
        'npm/registry.npmjs.org/package/1.0.0': {
          'index.js': 'require("./foo.js");',
          'foo': {
            'package.json': '{ "main": "main" }',
            'index.js': '',
          },
        },
      },
      {
        version: '3'
      },
      'npm:/package@1.0.0/foo/index.js'
    );
  });

  await testContext.step('package', async (testContext) => {
    const testResolveImport = testResolveImport_(testContext);

    await testResolveImport(
      'npm:package',
      'file:///index.js',
      {
        'npm/registry.npmjs.org/package/1.0.0': {
          'package.json': '{ "main": "index.js" }',
          'index.js': '',
        },
      },
      {
        version: '3',
        packages: {
          specifiers: {
            'npm:package': 'npm:package@1.0.0',
          },
          npm: {
            'package@1.0.0': {
              integrity: '',
              dependencies: {},
            },
          },
        },
      },
      'npm:/package@1.0.0/index.js',
    );

    await testResolveImport(
      'foo',
      'npm:/package@1.0.0/index.js',
      {
        'npm/registry.npmjs.org': {
          'package/1.0.0': {
            'package.json': '{ "main": "index.js" }',
            'index.js': '',
          },
          'foo/1.0.0': {
            'package.json': '{ "main": "index.js" }',
            'index.js': '',
          },
        },
      },
      {
        version: '3',
        packages: {
          specifiers: {
            'npm:package': 'npm:package@1.0.0',
          },
          npm: {
            'package@1.0.0': {
              integrity: '',
              dependencies: { 'foo': 'foo@1.0.0' },
            },
            'foo@1.0.0': {
              integrity: '',
              dependencies: {},
            },
          },
        },
      },
      'npm:/foo@1.0.0/index.js',
    );
  });
});
