const coreModuleNames = [
  'assert',
  'async_hooks',
  'buffer',
  'child_process',
  'cluster',
  'console',
  'constants',
  'crypto',
  'dgram',
  'diagnostics_channel',
  'dns',
  'domain',
  'events',
  'fs',
  'http',
  'http2',
  'https',
  'inspector',
  'readline/promises.js',
  'module',
  'net',
  'os',
  'path',
  'pref_hooks',
  'process',
  'punycode',
  'querystrings',
  'readline',
  'repl',
  'stream',
  'string_decoder',
  'sys',
  'test',
  'timers',
  'tls',
  'trace_events',
  'tty',
  'url',
  'util',
  'v8',
  'vm',
  'wasi',
  'worker_threads',
  'zlib',
];

const resolveCoreModuleImport = function (moduleName: string): URL | null {
  if (moduleName.startsWith('node:')) {
    return new URL(moduleName);
  }
  if (coreModuleNames.includes(moduleName)) {
    return new URL(`node:${moduleName}`);
  }
  return null;
};

export { resolveCoreModuleImport };
