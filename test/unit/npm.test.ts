import { asserts, posix, fs } from '../../deps.ts';
import { __test as npm } from '../../src/npm.ts';

const testName = (name: string) => `[npm] ${name}`;
const cacheRootPath = '/tmp/net.ts7m.esbuild-cache-plugin/';
const cacheRoot = posix.toFileUrl(cacheRootPath);
const modulePath = (path: string) => {
  return posix.join(cacheRootPath, 'npm', 'registry.npmjs.org', path);
}
const cleanCache = async function() {
  if(await fs.exists(cacheRootPath)) {
    await Deno.remove(cacheRootPath, { recursive: true });
  }
}

Deno.test(testName('testFileExistence success'), async () => {
  await cleanCache();
  await fs.ensureDir(modulePath('module/1.0.0/'));
  await Deno.writeTextFile(modulePath('module/1.0.0/test.txt'), '');

  const testResult = await npm.testFileExistence(
    new URL('npm:/module@1.0.0/test.txt'),
    cacheRoot
  );

  asserts.assertEquals(
    testResult,
    new URL('npm:/module@1.0.0/test.txt')
  );
});

Deno.test(testName('testFileExistence fail'), async () => {
  await cleanCache();
  await fs.ensureDir(modulePath('module/1.0.0/'));

  const testResult = await npm.testFileExistence(
    new URL('npm:/module@1.0.0/file_does_not_exists.txt'),
    cacheRoot
  );

  asserts.assertEquals(
    testResult,
    null
  );
});

Deno.test(testName('decomposePackageNameVersion "module@1.0.0"'), () => {
  const actual = npm.decomposePackageNameVersion('module@1.0.0');

  asserts.assertEquals(
    actual,
    ['module', '1.0.0']
  );
});

Deno.test(testName('decomposePackageNameVersion "module"'), () => {
  const actual = npm.decomposePackageNameVersion('module');

  asserts.assertEquals(
    actual,
    ['module', '']
  );
});

Deno.test(testName('decomposePackageNameVersion "@author/module@1.0.0"'), () => {
  const actual = npm.decomposePackageNameVersion('@author/module@1.0.0');

  asserts.assertEquals(
    actual,
    ['@author/module', '1.0.0']
  );
});

Deno.test(testName('decomposePackageNameVersion "@author/module"'), () => {
  const actual = npm.decomposePackageNameVersion('@author/module');

  asserts.assertEquals(
    actual,
    ['@author/module', '']
  );
});

Deno.test(testName('toCacheURL #1'), () => {
  const actual = npm.toCacheURL(
    new URL('npm:/module@1.0.0/'),
    new URL('file:///home/user/.cache/deno/')
  );

  asserts.assertEquals(
    actual,
    new URL('file:///home/user/.cache/deno/npm/registry.npmjs.org/module/1.0.0/')
  );
});

Deno.test(testName('toCacheURL #2'), () => {
  const actual = npm.toCacheURL(
    new URL('npm:/module@1.0.0/path/'),
    new URL('file:///home/user/.cache/deno/')
  );

  asserts.assertEquals(
    actual,
    new URL('file:///home/user/.cache/deno/npm/registry.npmjs.org/module/1.0.0/path/')
  );
});

Deno.test(testName('toCacheURL #3'), () => {
  const actual = npm.toCacheURL(
    new URL('npm:/module@1.0.0/path/to/file.js'),
    new URL('file:///home/user/.cache/deno/')
  );

  asserts.assertEquals(
    actual,
    new URL('file:///home/user/.cache/deno/npm/registry.npmjs.org/module/1.0.0/path/to/file.js')
  );
});

Deno.test(testName('normalizeNodeNpmUrl node-style'), () => {
  const actual = npm.normalizeNodeNpmUrl(
    new URL('npm:module@1.0.0')
  );

  asserts.assertEquals(
    actual,
    new URL('npm:/module@1.0.0/')
  );
});

Deno.test(testName('normalizeNodeNpmUrl url root'), () => {
  const actual = npm.normalizeNodeNpmUrl(
    new URL('npm:/module@1.0.0/')
  );

  asserts.assertEquals(
    actual,
    new URL('npm:/module@1.0.0/')
  );
});

Deno.test(testName('normalizeNodeNpmUrl url directory'), () => {
  const actual = npm.normalizeNodeNpmUrl(
    new URL('npm:/module@1.0.0/path/')
  );

  asserts.assertEquals(
    actual,
    new URL('npm:/module@1.0.0/path/')
  );
});

Deno.test(testName('normalizeNodeNpmUrl url file'), () => {
  const actual = npm.normalizeNodeNpmUrl(
    new URL('npm:/module@1.0.0/path/to/file.js')
  );

  asserts.assertEquals(
    actual,
    new URL('npm:/module@1.0.0/path/to/file.js')
  );
});

Deno.test(testName('normalizeNodeNpmUrl url root without terminal slash'), () => {
  const actual = npm.normalizeNodeNpmUrl(
    new URL('npm:/module@1.0.0')
  );

  asserts.assertEquals(
    actual,
    new URL('npm:/module@1.0.0/')
  );
});

Deno.test(testName('fileClosestPackageScope module root'), async () => {
  await cleanCache();
  await fs.ensureDir(modulePath('module/1.0.0/'));
  await Deno.writeTextFile(modulePath('module/1.0.0/package.json'), '{}');

  const scopeUrl = await npm.findClosestPackageScope(
    new URL('npm:/module@1.0.0/'),
    cacheRoot
  );

  asserts.assertEquals(
    scopeUrl,
    new URL('npm:/module@1.0.0/')
  );
});

Deno.test(testName('fileClosestPackageScope module descendant'), async () => {
  await cleanCache();
  await fs.ensureDir(modulePath('module/1.0.0/path/to/'));
  await Deno.writeTextFile(modulePath('module/1.0.0/package.json'), '{}');

  const scopeUrl = await npm.findClosestPackageScope(
    new URL('npm:/module@1.0.0/path/to/'),
    cacheRoot
  );

  asserts.assertEquals(
    scopeUrl,
    new URL('npm:/module@1.0.0/')
  );
});

Deno.test(testName('fileClosestPackageScope submodule'), async () => {
  await cleanCache();
  await fs.ensureDir(modulePath('module/1.0.0/path/to/submodule/'));
  await Deno.writeTextFile(modulePath('module/1.0.0/package.json'), '{}');
  await Deno.writeTextFile(modulePath('module/1.0.0/path/to/submodule/package.json'), '{}');

  const scopeUrl = await npm.findClosestPackageScope(
    new URL('npm:/module@1.0.0/path/to/submodule/'),
    cacheRoot
  );

  asserts.assertEquals(
    scopeUrl,
    new URL('npm:/module@1.0.0/path/to/submodule/')
  );
});

Deno.test(testName('fileClosestPackageScope submodule descendant'), async () => {
  await cleanCache();
  await fs.ensureDir(modulePath('module/1.0.0/path/to/submodule/path/'));
  await Deno.writeTextFile(modulePath('module/1.0.0/package.json'), '{}');
  await Deno.writeTextFile(modulePath('module/1.0.0/path/to/submodule/package.json'), '{}');

  const scopeUrl = await npm.findClosestPackageScope(
    new URL('npm:/module@1.0.0/path/to/submodule/path/'),
    cacheRoot
  );

  asserts.assertEquals(
    scopeUrl,
    new URL('npm:/module@1.0.0/path/to/submodule/')
  );
});

Deno.test(testName('getFileExports as-is'), async () => {
  const exports = npm.getPackageExports({
    name: '',
    exports: {
      '.': './index.js',
      './foo': './foo/index.js',
      './bar/': './bar/',
    },
  });

  asserts.assertEquals(
    exports,
    {
      '.': './index.js',
      './foo': './foo/index.js',
      './bar/': './bar/',
    }
  );
});

Deno.test(testName('getFileExports conditional import'), async () => {
  const exports = npm.getPackageExports({
    name: '',
    exports: {
      '.': './index.js',
      './foo': './foo/index.js',
      './bar/': './bar/',
    },
  });

  asserts.assertEquals(
    exports,
    {
      '.': './index.js',
      './foo': './foo/index.js',
      './bar/': './bar/',
    }
  );
});

Deno.test(testName('getFileExports main field'), async () => {
  const exports = npm.getPackageExports({
    name: '',
    main: './index.js',
  });

  asserts.assertEquals(
    exports,
    { '.': './index.js' }
  );
});

Deno.test(testName('getFileExports main override'), async () => {
  const exports = npm.getPackageExports({
    name: '',
    main: './index.js',
    exports: { '.': './index2.js' }
  });

  asserts.assertEquals(
    exports,
    { '.': './index2.js' }
  );
});

Deno.test(testName('getFileExports conditional exports'), async () => {
  const exports = npm.getPackageExports({
    name: '',
    exports: {
      '.': {
        'require': './index.js',
        'import': './index.mjs',
      },
    },
  }, true);

  asserts.assertEquals(
    exports,
    { '.': './index.js' }
  );
});
Deno.test(testName('getFileExports conditional alternative'), async () => {
  const exports = npm.getPackageExports({
    name: '',
    exports: {
      'require': './index.js',
      'import': './index.mjs',
    },
  });

  asserts.assertEquals(
    exports,
    { '.': './index.js' }
  );
});

Deno.test(testName('getFileExports no entry'), async () => {
  const exports = npm.getPackageExports({
    name: '',
  }, false);

  asserts.assertEquals(
    exports,
    {}
  );
});

Deno.test(testName('getFileExports no main'), async () => {
  const exports = npm.getPackageExports({
    name: '',
    main: './index.js',
    exports: { './foo.js': './foo.js' }
  }, false);

  asserts.assertEquals(
    exports,
    { './foo.js': './foo.js' }
  );
});

Deno.test(testName('resolveExports entry'), async () => {
  const exports = {
    '.': './index.js',
    './sub/path': './sub-path.js',
    './prefix/': './prefix/',
    './prefix2/*': './prefix2/*/*.js',
    './prefix3/*.js': './prefix3/*/*.js',
  };

  const resolved = npm.resolveExports('.', exports);

  asserts.assertEquals(
    resolved,
    './index.js'
  );
});

Deno.test(testName('resolveExports normal'), async () => {
  const exports = {
    '.': './index.js',
    './sub/path': './sub-path.js',
    './prefix/': './prefix/',
    './prefix2/*': './prefix2/*/*.js',
    './prefix3/*.js': './prefix3/*/*.js',
  };

  const resolved = npm.resolveExports('./sub/path', exports);

  asserts.assertEquals(
    resolved,
    './sub-path.js'
  );
});

Deno.test(testName('resolveExports prefix'), async () => {
  const exports = {
    '.': './index.js',
    './sub/path': './sub-path.js',
    './prefix/': './directory/',
    './prefix2/*': './directory2/*/*.js',
    './prefix3/*.js': './directory3/*/*.js',
  };

  const resolved = npm.resolveExports('./prefix/index.js', exports);

  asserts.assertEquals(
    resolved,
    './directory/index.js'
  );
});

Deno.test(testName('resolveAsFile full filename'), async () => {
  await cleanCache();
  await fs.ensureDir(modulePath('module/1.0.0/'));
  await Deno.writeTextFile(modulePath('module/1.0.0/index.js'), '');
  await Deno.writeTextFile(modulePath('module/1.0.0/index.json'), '');
  await Deno.writeTextFile(modulePath('module/1.0.0/index.node'), '');

  const fileUrl = await npm.resolveAsFile(
    new URL('npm:/module@1.0.0/index.json'),
    cacheRoot
  );

  asserts.assertEquals(
    fileUrl,
    new URL('npm:/module@1.0.0/index.json')
  );
});

Deno.test(testName('resolveAsFile .js complement'), async () => {
  await cleanCache();
  await fs.ensureDir(modulePath('module/1.0.0/'));
  await Deno.writeTextFile(modulePath('module/1.0.0/index.js'), '');
  await Deno.writeTextFile(modulePath('module/1.0.0/index.json'), '');
  await Deno.writeTextFile(modulePath('module/1.0.0/index.node'), '');

  const fileUrl = await npm.resolveAsFile(
    new URL('npm:/module@1.0.0/index'),
    cacheRoot
  );

  asserts.assertEquals(
    fileUrl,
    new URL('npm:/module@1.0.0/index.js')
  );
});

Deno.test(testName('resolveAsFile .json complement'), async () => {
  await cleanCache();
  await fs.ensureDir(modulePath('module/1.0.0/'));
  await Deno.writeTextFile(modulePath('module/1.0.0/index.json'), '');
  await Deno.writeTextFile(modulePath('module/1.0.0/index.node'), '');

  const fileUrl = await npm.resolveAsFile(
    new URL('npm:/module@1.0.0/index'),
    cacheRoot
  );

  asserts.assertEquals(
    fileUrl,
    new URL('npm:/module@1.0.0/index.json')
  );
});

Deno.test(testName('resolveAsFile .node complement'), async () => {
  await cleanCache();
  await fs.ensureDir(modulePath('module/1.0.0/'));
  await Deno.writeTextFile(modulePath('module/1.0.0/index.node'), '');

  const fileUrl = await npm.resolveAsFile(
    new URL('npm:/module@1.0.0/index'),
    cacheRoot
  );

  asserts.assertEquals(
    fileUrl,
    new URL('npm:/module@1.0.0/index.node')
  );
});

Deno.test(testName('resolveAsFile non-exist'), async () => {
  await cleanCache();
  await fs.ensureDir(modulePath('module/1.0.0/'));

  const fileUrl = await npm.resolveAsFile(
    new URL('npm:/module@1.0.0/index'),
    cacheRoot
  );

  asserts.assertEquals(
    fileUrl,
    null
  );
});

Deno.test(testName('resolveIndex index.js'), async () => {
  await cleanCache();
  await fs.ensureDir(modulePath('module/1.0.0/'));
  await Deno.writeTextFile(modulePath('module/1.0.0/index.js'), '');
  await Deno.writeTextFile(modulePath('module/1.0.0/index.json'), '');
  await Deno.writeTextFile(modulePath('module/1.0.0/index.node'), '');

  const fileUrl = await npm.resolveIndex(
    new URL('npm:/module@1.0.0/'),
    cacheRoot
  );

  asserts.assertEquals(
    fileUrl,
    new URL('npm:/module@1.0.0/index.js')
  );
});

Deno.test(testName('resolveIndex index.json'), async () => {
  await cleanCache();
  await fs.ensureDir(modulePath('module/1.0.0/'));
  await Deno.writeTextFile(modulePath('module/1.0.0/index.json'), '');
  await Deno.writeTextFile(modulePath('module/1.0.0/index.node'), '');

  const fileUrl = await npm.resolveIndex(
    new URL('npm:/module@1.0.0/'),
    cacheRoot
  );

  asserts.assertEquals(
    fileUrl,
    new URL('npm:/module@1.0.0/index.json')
  );
});

Deno.test(testName('resolveIndex index.node'), async () => {
  await cleanCache();
  await fs.ensureDir(modulePath('module/1.0.0/'));
  await Deno.writeTextFile(modulePath('module/1.0.0/index.node'), '');

  const fileUrl = await npm.resolveIndex(
    new URL('npm:/module@1.0.0/'),
    cacheRoot
  );

  asserts.assertEquals(
    fileUrl,
    new URL('npm:/module@1.0.0/index.node')
  );
});

Deno.test(testName('resolveIndex no entry'), async () => {
  await cleanCache();
  await fs.ensureDir(modulePath('module/1.0.0/'));

  const fileUrl = await npm.resolveIndex(
    new URL('npm:/module@1.0.0/'),
    cacheRoot
  );

  asserts.assertEquals(
    fileUrl,
    null
  );
});

Deno.test(testName('resolveAsDirectory package.json'), async () => {
  await cleanCache();
  await fs.ensureDir(modulePath('module/1.0.0/'));
  await Deno.writeTextFile(
    modulePath('module/1.0.0/package.json'),
    '{"name": "module", "main": "main.js"}'
  );
  await Deno.writeTextFile(modulePath('module/1.0.0/main.js'), '');
  await Deno.writeTextFile(modulePath('module/1.0.0/index.js'), '');

  const fileUrl = await npm.resolveAsDirectory(
    new URL('npm:/module@1.0.0/'),
    cacheRoot
  );

  asserts.assertEquals(
    fileUrl,
    new URL('npm:/module@1.0.0/main.js')
  );
});

Deno.test(testName('resolveAsDirectory index.js'), async () => {
  await cleanCache();
  await fs.ensureDir(modulePath('module/1.0.0/'));
  await Deno.writeTextFile(modulePath('module/1.0.0/main.js'), '');
  await Deno.writeTextFile(modulePath('module/1.0.0/index.js'), '');
  await Deno.writeTextFile(modulePath('module/1.0.0/index.json'), '');
  await Deno.writeTextFile(modulePath('module/1.0.0/index.node'), '');

  const fileUrl = await npm.resolveAsDirectory(
    new URL('npm:/module@1.0.0/'),
    cacheRoot
  );

  asserts.assertEquals(
    fileUrl,
    new URL('npm:/module@1.0.0/index.js')
  );
});

Deno.test(testName('resolveAsDirectory index.json'), async () => {
  await cleanCache();
  await fs.ensureDir(modulePath('module/1.0.0/'));
  await Deno.writeTextFile(modulePath('module/1.0.0/main.js'), '');
  await Deno.writeTextFile(modulePath('module/1.0.0/index.json'), '');
  await Deno.writeTextFile(modulePath('module/1.0.0/index.node'), '');

  const fileUrl = await npm.resolveAsDirectory(
    new URL('npm:/module@1.0.0/'),
    cacheRoot
  );

  asserts.assertEquals(
    fileUrl,
    new URL('npm:/module@1.0.0/index.json')
  );
});

Deno.test(testName('resolveAsDirectory index.node'), async () => {
  await cleanCache();
  await fs.ensureDir(modulePath('module/1.0.0/'));
  await Deno.writeTextFile(modulePath('module/1.0.0/main.js'), '');
  await Deno.writeTextFile(modulePath('module/1.0.0/index.node'), '');

  const fileUrl = await npm.resolveAsDirectory(
    new URL('npm:/module@1.0.0/'),
    cacheRoot
  );

  asserts.assertEquals(
    fileUrl,
    new URL('npm:/module@1.0.0/index.node')
  );
});

Deno.test(testName('resolveAsDirectory no entry'), async () => {
  await cleanCache();
  await fs.ensureDir(modulePath('module/1.0.0/'));
  await Deno.writeTextFile(modulePath('module/1.0.0/main.js'), '');

  const fileUrl = await npm.resolveAsDirectory(
    new URL('npm:/module@1.0.0/'),
    cacheRoot
  );

  asserts.assertEquals(
    fileUrl,
    null
  );
});

Deno.test(testName('resolveImport core module URL'), async () => {
  const fileUrl = await npm.resolveImport(
    'node:util',
    new URL('npm:/module@1.0.0/index.js'),
    cacheRoot,
    {
      version: '2',
    }
  );

  asserts.assertEquals(
    fileUrl,
    new URL('node:util')
  );
});

Deno.test(testName('resolveImport core module name'), async () => {
  await cleanCache();
  await fs.ensureDir(modulePath('module/1.0.0/'));
  await Deno.writeTextFile(modulePath('module/1.0.0/index.js'), '');
  await Deno.writeTextFile(modulePath('module/1.0.0/util.js'), '');
  const fileUrl = await npm.resolveImport(
    'util',
    new URL('npm:/module@1.0.0/index.js'),
    cacheRoot,
    {
      version: '2',
    }
  );

  asserts.assertEquals(
    fileUrl,
    new URL('node:util')
  );
});

Deno.test(testName('resolveImport relative'), async () => {
  await cleanCache();
  await fs.ensureDir(modulePath('module/1.0.0/foo/'));
  await Deno.writeTextFile(modulePath('module/1.0.0/foo/index.js'), '');
  await Deno.writeTextFile(modulePath('module/1.0.0/foo/bar.js'), '');
  const fileUrl = await npm.resolveImport(
    './bar.js',
    new URL('npm:/module@1.0.0/foo/index.js'),
    cacheRoot,
    {
      version: '2',
    }
  );

  asserts.assertEquals(
    fileUrl,
    new URL('npm:/module@1.0.0/foo/bar.js')
  );
});

Deno.test(testName('resolveImport relative parent'), async () => {
  await cleanCache();
  await fs.ensureDir(modulePath('module/1.0.0/foo/'));
  await Deno.writeTextFile(modulePath('module/1.0.0/foo/index.js'), '');
  await Deno.writeTextFile(modulePath('module/1.0.0/bar.js'), '');
  const fileUrl = await npm.resolveImport(
    '../bar.js',
    new URL('npm:/module@1.0.0/foo/index.js'),
    cacheRoot,
    {
      version: '2',
    }
  );

  asserts.assertEquals(
    fileUrl,
    new URL('npm:/module@1.0.0/bar.js')
  );
});

Deno.test(testName('resolveImport relative directory'), async () => {
  await cleanCache();
  await fs.ensureDir(modulePath('module/1.0.0/foo/'));
  await Deno.writeTextFile(modulePath('module/1.0.0/foo.js'), '');
  await Deno.writeTextFile(modulePath('module/1.0.0/index.js'), '');
  const fileUrl = await npm.resolveImport(
    './',
    new URL('npm:/module@1.0.0/foo.js'),
    cacheRoot,
    {
      version: '2',
    }
  );

  asserts.assertEquals(
    fileUrl,
    new URL('npm:/module@1.0.0/index.js')
  );
});

Deno.test(testName('resolveImport relative no entry'), async () => {
  await cleanCache();
  await fs.ensureDir(modulePath('module/1.0.0/foo/'));
  await Deno.writeTextFile(modulePath('module/1.0.0/foo.js'), '');
  const fileUrl = await npm.resolveImport(
    './file_does_not_exists.js',
    new URL('npm:/module@1.0.0/foo.js'),
    cacheRoot,
    {
      version: '2',
    }
  );

  asserts.assertEquals(
    fileUrl,
    null
  );
});

// TODO: Add tests for imports

// TODO: Add tests for self package exports

Deno.test(testName('resolveImport deps from file'), async () => {
  await cleanCache();
  await fs.ensureDir(modulePath('module/1.0.0/'));
  await Deno.writeTextFile(
    modulePath('module/1.0.0/package.json'),
    '{ "name": "module", "main": "main.js" }'
    );
  await Deno.writeTextFile(modulePath('module/1.0.0/main.js'), '');
  const fileUrl = await npm.resolveImport(
    'npm:module',
    new URL('file:///path/to/root/main.js'),
    cacheRoot,
    {
      version: '2',
      npm: {
        specifiers: {
          "module": "module@1.0.0"
        },
        packages: {
          "module@1.0.0": {
            "integrity": "SHA HASH HERE",
            "dependencies": {}
          },
        },
      },
    }
  );

  asserts.assertEquals(
    fileUrl,
    new URL('npm:/module@1.0.0/main.js')
  );
});

Deno.test(testName('resolveImport deps from module'), async () => {
  await cleanCache();
  await fs.ensureDir(modulePath('module1/1.0.0/'));
  await Deno.writeTextFile(
    modulePath('module1/1.0.0/package.json'),
    '{ "name": "module1", "main": "main.js" }'
    );
  await Deno.writeTextFile(modulePath('module1/1.0.0/main.js'), '');
  await fs.ensureDir(modulePath('module2/1.0.0/'));
  await Deno.writeTextFile(
    modulePath('module2/1.0.0/package.json'),
    '{ "name": "module2", "main": "main.js" }'
    );
  await Deno.writeTextFile(modulePath('module2/1.0.0/main.js'), '');
  const fileUrl = await npm.resolveImport(
    'module2',
    new URL('npm:/module1@1.0.0/main.js'),
    cacheRoot,
    {
      version: '2',
      npm: {
        specifiers: {
          "module1": "module1@1.0.0"
        },
        packages: {
          "module1@1.0.0": {
            "integrity": "SHA HASH HERE",
            "dependencies": {
              "module2": "module2@1.0.0"
            }
          },
          "module2@1.0.0": {
            "integrity": "SHA HASH HERE",
            "dependencies": {
            },
          },
        },
      },
    }
  );

  asserts.assertEquals(
    fileUrl,
    new URL('npm:/module2@1.0.0/main.js')
  );
});

Deno.test(testName('resolveImport self exports'), async () => {
  await cleanCache();
  await fs.ensureDir(modulePath('some-module/1.0.0/'));
  await Deno.writeTextFile(
    modulePath('some-module/1.0.0/package.json'),
    '{ "name": "some-module", "exports": { ".": "./main.js" }}'
  );
  await Deno.writeTextFile(modulePath('some-module/1.0.0/main.js'), '');
  const fileUrl = await npm.resolveImport(
    'some-module',
    new URL('npm:/some-module@1.0.0/foo.js'),
    cacheRoot,
    {
      version: '2',
      npm: {
        specifiers: {
          "some-module": "some-module@1.0.0"
        },
        packages: {
          "some-module@1.0.0": {
            "integrity": "SHA HASH HERE",
            "dependencies": {
            }
          },
        },
      },
    }
  );

  asserts.assertEquals(
    fileUrl,
    new URL('npm:/some-module@1.0.0/main.js')
  );
});

Deno.test(testName('resolveImport non-exist'), async () => {
  await cleanCache();
  const fileUrl = await npm.resolveImport(
    'npm:module',
    new URL('file:///path/to/root/main.js'),
    cacheRoot,
    { version: '2' }
  );

  asserts.assertEquals(
    fileUrl,
    null
  );
});

// TODO: Add tests for exports field of npm module
