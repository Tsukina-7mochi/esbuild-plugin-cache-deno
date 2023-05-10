import { esbuild, posix, fs } from "./deps.ts";

type OnResolveReturnType = esbuild.OnResolveResult | null | undefined;

const coreModules = [
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

const requireNodeModule = async function(moduleName: string, importer: string): Promise<OnResolveReturnType> {
  const importerPath = posix.dirname(importer);

  if(moduleName.startsWith('node:') || coreModules.includes(moduleName)) {
    return { errors: [{ text: `Cannot bundle core module "${moduleName}"` }] };
  }

  if(moduleName.startsWith('/')) {
    return await loadAsFile(moduleName)
      ?? await loadAsDirectory(moduleName);
  }

  if(moduleName.startsWith('./') || moduleName.startsWith('../')) {
    return await loadAsFile(posix.join(importerPath, moduleName))
      ?? await loadAsDirectory(posix.join(importerPath, moduleName));
  }
}

const loadAsFile = async function(path: string): Promise<OnResolveReturnType> {
  // compleate extension
  if(await fs.exists(path, { isFile: true })) {
    return { path };
  }
  if(await fs.exists(`${path}.js`, { isFile: true })) {
    return { path: `${path}.js` };
  }
  if(await fs.exists(`${path}.json`, { isFile: true })) {
    return { path: `${path}.json` };
  }
  if(await fs.exists(`${path}.node`, { isFile: true })) {
    return { path: `${path}.node` };
  }
}

const loadIndex = async function(path: string): Promise<OnResolveReturnType> {
  if(await fs.exists(posix.join(path, 'index.js'), { isFile: true })) {
    return { path: posix.join(path, 'index.js') };
  }
  if(await fs.exists(posix.join(path, 'index.json'), { isFile: true })) {
    return { path: posix.join(path, 'index.json') };
  }
  if(await fs.exists(posix.join(path, 'index.json'), { isFile: true })) {
    return { path: posix.join(path, 'index.node') };
  }
}

const loadAsDirectory = async function(path: string): Promise<OnResolveReturnType> {
  const packageJsonPath = posix.join(path, 'package.json');
  if(!await fs.exists(packageJsonPath)) {
    // load index
  } else {
    const content = await Deno.readTextFile(packageJsonPath);
    const entry = JSON.parse(content).main;
    if(typeof entry !== 'string') {
      return;
      // return index
    }
    const entryPath = posix.join(path, entry);

    return await loadAsFile(entryPath)
      ?? await loadIndex(entryPath)
      ?? await loadIndex(path);
  }
}

export default requireNodeModule;
