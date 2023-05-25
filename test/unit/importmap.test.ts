import { asserts } from '../../deps.ts';
import ImportmapResolver from '../../src/importmap.ts';

const testName = (name: string) => `[importmap] ${name}`;

Deno.test(testName('Simple import relative'), () => {
  const resolver = new ImportmapResolver(
    {
      imports: {
        'zzz': './xxx/yyy/zzz.js',
      },
    },
    new URL('file:///path/to/root/')
  );
  const actual = resolver.resolve('zzz', new URL('file:///path/to/root/'));

  asserts.assertEquals(actual, new URL('file:///path/to/root/xxx/yyy/zzz.js'));
});

Deno.test(testName('Simple import absolute'), () => {
  const resolver = new ImportmapResolver(
    {
      imports: {
        'zzz': '/xxx/yyy/zzz.js',
      },
    },
    new URL('file:///path/to/root/')
  );
  const actual = resolver.resolve('zzz', new URL('file:///path/to/root/'));

  asserts.assertEquals(actual, new URL('file:///xxx/yyy/zzz.js'));
});

Deno.test(testName('Simple import URL'), () => {
  const resolver = new ImportmapResolver(
    {
      imports: {
        'module': 'https://example.com/path/to/file.js',
      },
    },
    new URL('file:///path/to/root/')
  );
  const actual = resolver.resolve('module', new URL('file:///path/to/root/'));

  asserts.assertEquals(actual, new URL('https://example.com/path/to/file.js'));
});

Deno.test(testName('Simple import npm URL'), () => {
  const resolver = new ImportmapResolver(
    {
      imports: {
        'module': 'npm:/module@1.0.0/index.js',
      },
    },
    new URL('file:///path/to/root/')
  );
  const actual = resolver.resolve('module', new URL('file:///path/to/root/'));

  asserts.assertEquals(actual, new URL('npm:/module@1.0.0/index.js'));
});

Deno.test(testName('Path import relative'), () => {
  const resolver = new ImportmapResolver(
    {
      imports: {
        'yyy/': './xxx/yyy/',
      },
    },
    new URL('file:///path/to/root/')
  );
  const actual = resolver.resolve('yyy/zzz.js', new URL('file:///path/to/root/'));

  asserts.assertEquals(actual, new URL('file:///path/to/root/xxx/yyy/zzz.js'));
});

Deno.test(testName('Path import URL'), () => {
  const resolver = new ImportmapResolver(
    {
      imports: {
        'module/': 'https://example.com/path/to/module/',
      },
    },
    new URL('file:///path/to/root/')
  );
  const actual = resolver.resolve('module/file.js', new URL('file:///path/to/root/'));

  asserts.assertEquals(actual, new URL('https://example.com/path/to/module/file.js'));
});

Deno.test(testName('Scope match'), () => {
  const resolver = new ImportmapResolver(
    {
      imports: {
        'module': 'https://example.com/path/to/module/file.js',
      },
      scopes: {
        '/src/': {
          'module': 'https://example2.com/path/to/module/file.js',
        },
      },
    },
    new URL('file:///path/to/root/')
  );
  const actual = resolver.resolve('module', new URL('file:///path/to/root/src/'));

  asserts.assertEquals(actual, new URL('https://example2.com/path/to/module/file.js'));
});

Deno.test(testName('Scope default'), () => {
  const resolver = new ImportmapResolver(
    {
      imports: {
        'module': 'https://example.com/path/to/module/file.js',
      },
      scopes: {
        '/src/': {
          'module': 'https://example2.com/path/to/module/file.js',
        },
      },
    },
    new URL('file:///path/to/root/')
  );
  const actual = resolver.resolve('module', new URL('file:///path/to/root/foo/'));

  asserts.assertEquals(actual, new URL('https://example.com/path/to/module/file.js'));
});

Deno.test(testName('Scope priority'), () => {
  const resolver = new ImportmapResolver(
    {
      imports: {
        'module': 'https://example.com/path/to/module/file.js',
      },
      scopes: {
        '/src/': {
          'module': 'https://example2.com/path/to/module/file.js',
        },
        '/src/sub/sub2': {
          'module': 'https://example2.com/path/to/module/file3.js',
        },
        '/src/sub': {
          'module': 'https://example2.com/path/to/module/file2.js',
        },
      },
    },
    new URL('file:///path/to/root/')
  );
  const actual = resolver.resolve('module', new URL('file:///path/to/root/foo/src/sub/sub2'));

  asserts.assertEquals(actual, new URL('https://example2.com/path/to/module/file3.js'));
});

Deno.test(testName('Scope URL path match'), () => {
  const resolver = new ImportmapResolver(
    {
      imports: {
        'module': 'https://example.com/path/to/module/file.js',
      },
      scopes: {
        'https://example2.com/path/': {
          'module': 'https://example2.com/path/to/module/file.js',
        },
      },
    },
    new URL('file:///path/to/root/')
  );
  const actual = resolver.resolve('module', new URL('https://example2.com/path/'));

  asserts.assertEquals(actual, new URL('https://example2.com/path/to/module/file.js'));
});

Deno.test(testName('Scope URL path default'), () => {
  const resolver = new ImportmapResolver(
    {
      imports: {
        'module': 'https://example.com/path/to/module/file.js',
      },
      scopes: {
        'https://example2.com/path/': {
          'module': 'https://example2.com/path/to/module/file.js',
        },
      },
    },
    new URL('file:///path/to/root/')
  );
  const actual = resolver.resolve('module', new URL('https://example2.com/'));

  asserts.assertEquals(actual, new URL('https://example.com/path/to/module/file.js'));
});
