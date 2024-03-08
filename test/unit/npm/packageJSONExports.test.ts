import { assertEquals } from 'assert';
import { getPackageJSONExports } from '../../../src/npm/packageJSONExports.ts';

Deno.test('getPackageJSONExports', async (testContext) => {
  await testContext.step('exports object', () => {
    const packageJSON = {
      exports: {
        '.': './index.js',
        './foo': './foo.js',
        './bar': './bar.js',
      },
    };
    const actual = getPackageJSONExports(packageJSON);
    const expected = {
      '.': './index.js',
      './foo': './foo.js',
      './bar': './bar.js',
    };
    assertEquals(actual, expected);
  });

  await testContext.step('exports string', () => {
    const packageJSON = {
      exports: './index.js',
    };
    const actual = getPackageJSONExports(packageJSON);
    const expected = {
      '.': './index.js',
    };
    assertEquals(actual, expected);
  });

  await testContext.step('main', () => {
    const packageJSON = {
      main: './index.js',
    };
    const actual = getPackageJSONExports(packageJSON);
    const expected = {
      '.': './index.js',
    };
    assertEquals(actual, expected);
  });

  await testContext.step('main overwrite exports', () => {
    const packageJSON = {
      main: './index.js',
      exports: {
        '.': './foo.js',
      },
    };
    const actual = getPackageJSONExports(packageJSON);
    const expected = {
      '.': './foo.js',
    };
    assertEquals(actual, expected);
  });

  await testContext.step('exports with conditions', async (testContext) => {
    await testContext.step('prefer require', () => {
      const packageJSON = {
        exports: {
          '.': {
            import: './index.js',
            require: './index.cjs',
          },
          './foo': {
            import: './foo.js',
            require: './foo.cjs',
          },
        },
      };
      const actual = getPackageJSONExports(packageJSON, true, false);
      const expected = {
        '.': './index.cjs',
        './foo': './foo.cjs',
      };
      assertEquals(actual, expected);
    });

    await testContext.step('prefer import', () => {
      const packageJSON = {
        exports: {
          '.': {
            import: './index.js',
            require: './index.cjs',
          },
          './foo': {
            import: './foo.js',
            require: './foo.cjs',
          },
        },
      };
      const actual = getPackageJSONExports(packageJSON, true, true);
      const expected = {
        '.': './index.js',
        './foo': './foo.js',
      };
      assertEquals(actual, expected);
    });
  });

  // NOTE: currently not supported, using the first one
  await testContext.step('exports with alternatives', () => {
    const packageJSON = {
      exports: {
        '.': [
          './index1.js',
          './index2.js',
        ],
        './foo': [
          './foo1.js',
          './foo2.js',
        ],
      },
    };
    const actual = getPackageJSONExports(packageJSON);
    const expected = {
      '.': './index1.js',
      './foo': './foo1.js',
    };
    assertEquals(actual, expected);
  });

  await testContext.step('top-level conditions', async (testContext) => {
    await testContext.step('prefer require', () => {
      const packageJSON = {
        exports: {
          import: './index.js',
          require: './index.cjs',
        },
      };
      const actual = getPackageJSONExports(packageJSON, true, false);
      const expected = {
        '.': './index.cjs',
      };
      assertEquals(actual, expected);
    });

    await testContext.step('prefer import', () => {
      const packageJSON = {
        exports: {
          import: './index.js',
          require: './index.cjs',
        },
      };
      const actual = getPackageJSONExports(packageJSON, true, true);
      const expected = {
        '.': './index.js',
      };
      assertEquals(actual, expected);
    });
  });
});
