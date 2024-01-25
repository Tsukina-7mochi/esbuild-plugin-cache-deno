import { assertEquals } from 'assert';
import { resolveImport, toCacheURL } from '../../src/http.ts';

Deno.test('resolveImport', async (testContext) => {
  const testResolveImport = (
    moduleName: string,
    importer: string,
    expected: string | null,
  ) => {
    return testContext.step(`${moduleName} (${expected}) <- ${importer}`, async () => {
      const actual = resolveImport(moduleName, new URL(importer));
      assertEquals(actual?.href, expected);
    });
  }

  await testResolveImport(
    'https://example.com/package/index.js',
    'protocol:///any-url',
    'https://example.com/package/index.js'
  );

  await testResolveImport(
    '/foo.js',
    'https://example.com/package/index.js',
    'https://example.com/foo.js'
  );

  await testResolveImport(
    './foo.js',
    'https://example.com/package/index.js',
    'https://example.com/package/foo.js'
  );

  await testResolveImport(
    '../foo.js',
    'https://example.com/package/index.js',
    'https://example.com/foo.js'
  );
});

Deno.test('toCacheURL', async (testContext) => {
  const testToCacheURL = function(
    url: string,
    cacheRoot: string,
    expected: string,
  ) {
    return testContext.step(url, () => {
      const actual = toCacheURL(new URL(url), new URL(cacheRoot)).href;

      assertEquals(actual, expected);
    });
  }

  await testToCacheURL(
    'https://example.com/package/index.js',
    'file:///cache/',
    'file:///cache/deps/https/example.com/e828a20945a43e9a7cd0946c44ea9b69942446887e6a188edb6ecde7a8256bf1'
  );
});
