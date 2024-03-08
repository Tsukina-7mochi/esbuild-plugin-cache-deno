import { assertEquals } from 'assert';
import ImportMapResolver, { ImportMap } from '../../src/importMapResolver.ts';

Deno.test('ImportMapResolver.resolve', async (testContext) => {
  const testImportMap = (name: string, testContext_ = testContext) => (
    importMap: ImportMap,
    baseURL: URL | string,
    specifier: string,
    importer: URL | string,
    expected: string | null
  ) => {
    return testContext_.step(name ?? `${specifier} -> ${expected}`, () => {
      const resolver = new ImportMapResolver(importMap, new URL(baseURL));
      const actual = resolver.resolve(specifier, new URL(importer));

      assertEquals(actual?.href, expected);
    });
  }

  await testImportMap('normal specifier -> URL')(
    {
      imports: {
        'foo': 'https://example.com/foo/index.js',
      }
    },
    'https://example.com/index.js',
    'foo',
    'https://example.com/index.js',
    'https://example.com/foo/index.js',
  );

  await testContext.step('normal specifier -> relative path', async (testContext) => {
    await testImportMap('starts with "/"', testContext)(
      {
        imports: {
          'foo': '/foo/index.js',
        }
      },
      'https://example.com/path/to/index.js',
      'foo',
      'https://example.com/path/to/index.js',
      'https://example.com/foo/index.js',
    );

    await testImportMap('starts with "./"', testContext)(
      {
        imports: {
          'foo': './foo/index.js',
        }
      },
      'https://example.com/path/to/index.js',
      'foo',
      'https://example.com/path/to/index.js',
      'https://example.com/path/to/foo/index.js',
    );

    await testImportMap('starts with "../"', testContext)(
      {
        imports: {
          'foo': '../foo/index.js',
        }
      },
      'https://example.com/path/to/index.js',
      'foo',
      'https://example.com/path/to/index.js',
      'https://example.com/path/foo/index.js',
    );
  });

  await testContext.step('relative specifier -> URL', async (testContext) => {
    await testImportMap('starts with "/"', testContext)(
      {
        imports: {
          '/foo': 'https://example.com/foo/index.js',
        }
      },
      'file:///path/to/index.js',
      'file:///foo',
      'file:///path/to/index.js',
      'https://example.com/foo/index.js',
    );

    await testImportMap('starts with "./"', testContext)(
      {
        imports: {
          './foo': 'https://example.com/foo/index.js',
        }
      },
      'file:///path/to/index.js',
      'file:///path/to/foo',
      'file:///path/to/index.js',
      'https://example.com/foo/index.js',
    );

    await testImportMap('starts with "../"', testContext)(
      {
        imports: {
          '../foo': 'https://example.com/foo/index.js',
        }
      },
      'file:///path/to/index.js',
      'file:///path/foo',
      'file:///path/to/index.js',
      'https://example.com/foo/index.js',
    );
  });

  await testImportMap('specifier ends with "/" -> URL')(
    {
      imports: {
        'foo/': 'https://example.com/foo/',
      },
    },
    'file:///path/to/index.js',
    'foo/bar.js',
    'file:///path/to/index.js',
    'https://example.com/foo/bar.js',
  );

  await testImportMap('URL specifier (polyfill) #1')(
    {
      imports: {
        'https://example.com/foo/': 'https://example-pollyfill.com/foo/',
      },
    },
    'file:///path/to/index.js',
    'https://example.com/foo/bar.js',
    'file:///path/to/index.js',
    'https://example-pollyfill.com/foo/bar.js'
  );

  await testImportMap('URL specifier (polyfill) #2')(
    {
      imports: {
        'node:fs': 'https://example.com/node-fs-polyfill@1.0.0/index.js',
      },
    },
    'file:///path/to/index.js',
    'node:fs',
    'file:///path/to/index.js',
    'https://example.com/node-fs-polyfill@1.0.0/index.js'
  );

  await testContext.step('module specifier priority', () => {
    const resolver = new ImportMapResolver(
      {
        imports: {
          'foo/': 'https://example.com/foo/',
          'foo/bar/': 'https://bar-example.com/bar/',
        },
      },
      new URL('file:///path/to/index.js')
    );

    assertEquals(
      resolver.resolve('foo/index.js', new URL('file:///path/to/index.js',))?.href,
      'https://example.com/foo/index.js'
    );
    assertEquals(
      resolver.resolve('foo/bar/index.js', new URL('file:///path/to/index.js',))?.href,
      'https://bar-example.com/bar/index.js'
    );
  });

  await testContext.step('importer in scope', async (testContext) => {
    await testContext.step('specific scope', () => {
      const resolver = new ImportMapResolver(
        {
          imports: {
            'foo/': 'https://example.com/foo/',
          },
          scopes: {
            './scoped/index.js': {
              'foo/': 'https://example-polyfill.com/'
            }
          }
        },
        new URL('file:///path/to/index.js')
      );

      assertEquals(
        resolver.resolve('foo/index.js', new URL('file:///path/to/index.js'))?.href,
        'https://example.com/foo/index.js'
      );
      assertEquals(
        resolver.resolve('foo/index.js', new URL('file:///path/to/scoped/index.js'))?.href,
        'https://example-polyfill.com/index.js'
      );
    });

    await testContext.step('scope ends with "/"', () => {
      const resolver = new ImportMapResolver(
        {
          imports: {
            'foo/': 'https://example.com/foo/',
          },
          scopes: {
            './scoped/': {
              'foo/': 'https://example-polyfill.com/'
            }
          }
        },
        new URL('file:///path/to/index.js')
      );

      assertEquals(
        resolver.resolve('foo/index.js', new URL('file:///path/to/index.js'))?.href,
        'https://example.com/foo/index.js'
      );
      assertEquals(
        resolver.resolve('foo/index.js', new URL('file:///path/to/scoped/index.js'))?.href,
        'https://example-polyfill.com/index.js'
      );
      assertEquals(
        resolver.resolve('foo/index.js', new URL('file:///path/to/scoped/bar.js'))?.href,
        'https://example-polyfill.com/index.js'
      );
    });

    await testContext.step('URL scope', () => {
      const resolver = new ImportMapResolver(
        {
          imports: {
            'foo/': 'https://example.com/foo/',
          },
          scopes: {
            'https://example.com/': {
              'foo/': 'https://example-polyfill.com/'
            }
          }
        },
        new URL('file:///path/to/index.js')
      );

      assertEquals(
        resolver.resolve('foo/index.js', new URL('file:///path/to/index.js'))?.href,
        'https://example.com/foo/index.js'
      );
      assertEquals(
        resolver.resolve('foo/index.js', new URL('https://example.com/index.js'))?.href,
        'https://example-polyfill.com/index.js'
      );
    });
  });

  await testContext.step('scope priority', () => {
    const resolver = new ImportMapResolver(
      {
        imports: {
          'foo/': 'https://example.com/foo/',
        },
        scopes: {
          './scoped/': {
            'foo/': 'https://example-polyfill.com/'
          },
          './scoped/bar.js': {
            'foo/': 'https://example-polyfill-2.com/'
          },
          './scoped/scoped2/': {
            'foo/': 'https://example-polyfill-3.com/'
          }
        }
      },
      new URL('file:///path/to/index.js')
    );

    assertEquals(
      resolver.resolve('foo/index.js', new URL('file:///path/to/index.js'))?.href,
      'https://example.com/foo/index.js'
    );
    assertEquals(
      resolver.resolve('foo/index.js', new URL('file:///path/to/scoped/index.js'))?.href,
      'https://example-polyfill.com/index.js'
    );
    assertEquals(
      resolver.resolve('foo/index.js', new URL('file:///path/to/scoped/bar.js'))?.href,
      'https://example-polyfill-2.com/index.js'
    );
    assertEquals(
      resolver.resolve('foo/index.js', new URL('file:///path/to/scoped/scoped2/index.js'))?.href,
      'https://example-polyfill-3.com/index.js'
    );
  });
});
