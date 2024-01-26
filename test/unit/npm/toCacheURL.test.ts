import { assertEquals } from 'assert';
import { toCacheURL } from '../../../src/npm.ts';

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
    'npm:/react@1.0.0/',
    'file:///cache/',
    'file:///cache/npm/registry.npmjs.org/react/1.0.0/'
  );

  await testToCacheURL(
    'npm:/react@1.0.0/package.json',
    'file:///cache/',
    'file:///cache/npm/registry.npmjs.org/react/1.0.0/package.json'
  );

  // use part of version that can be read as semver
  await testToCacheURL(
    'npm:/react-dom@18.2.0_react@18.2.0/package.json',
    'file:///cache/',
    'file:///cache/npm/registry.npmjs.org/react-dom/18.2.0/package.json'
  );
});
