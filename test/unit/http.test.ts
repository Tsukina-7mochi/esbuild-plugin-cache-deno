import { asserts } from '../../deps.ts';
import * as http from '../../src/http.ts';

const testName = (name: string) => `[http] ${name}`;

Deno.test(testName('resolveImport absolute'), () => {
  const actual = http.resolveImport(
    '/test.js',
    new URL('https://example.com/path/file.js')
  );

  asserts.assertEquals(actual, new URL('https://example.com/test.js'));
});

Deno.test(testName('resolveImport relative'), () => {
  const actual = http.resolveImport(
    './test.js',
    new URL('https://example.com/path/file.js')
  );

  asserts.assertEquals(actual, new URL('https://example.com/path/test.js'));
});

Deno.test(testName('resolveImport relative (parent)'), () => {
  const actual = http.resolveImport(
    '../test.js',
    new URL('https://example.com/path/file.js')
  );

  asserts.assertEquals(actual, new URL('https://example.com/test.js'));
});

Deno.test(testName('toCacheURL'), () => {
  const actual = http.toCacheURL(
    new URL('https://example.com/test.js'),
    new URL('file:///home/user/.cache/deno/')
  );

  asserts.assertEquals(
    actual,
    new URL('file:///home/user/.cache/deno/deps/https/example.com/062b4f93067a219972f47a23d79b25200061a2149da746af1395ed8f15752a99')
  );
});
