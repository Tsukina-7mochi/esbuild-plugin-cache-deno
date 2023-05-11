import { esbuild, posix, fs } from "./deps.ts";

interface ModuleResolveResult {
  name: string;
  type: 'file' | 'core-module' | 'module';
}

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

const requireNodeModule = async function(
  moduleName: string,
  importer: string,
  modulesInScope: string[]
): Promise<ModuleResolveResult | null> {
  const importerPath = posix.dirname(importer);

  if(moduleName.startsWith('node:')) {
    return {name: moduleName.slice(5), type: 'core-module'};
  } else if(coreModules.includes(moduleName)) {
    return { name: moduleName, type: 'core-module' };
  }

  if(moduleName.startsWith('/')) {
    return await loadAsFile(moduleName)
      ?? await loadAsDirectory(moduleName);
  }

  if(moduleName.startsWith('./') || moduleName.startsWith('../')) {
    return await loadAsFile(posix.join(importerPath, moduleName))
      ?? await loadAsDirectory(posix.join(importerPath, moduleName));
  }

  if(modulesInScope.includes(moduleName)) {
    return { name: moduleName, type: 'module' };
  }

  return null;
}

const loadAsFile = async function(path: string): Promise<ModuleResolveResult | null> {
  // compleate extension
  if(await fs.exists(path, { isFile: true })) {
    return { name: path, type: 'file' };
  }
  if(await fs.exists(`${path}.js`, { isFile: true })) {
    return { name: `${path}.js`, type: 'file' };
  }
  if(await fs.exists(`${path}.json`, { isFile: true })) {
    return { name: `${path}.json`, type: 'file' };
  }
  if(await fs.exists(`${path}.node`, { isFile: true })) {
    return { name: `${path}.node`, type: 'file' };
  }

  return null;
}

const loadIndex = async function(path: string): Promise<ModuleResolveResult | null> {
  if(await fs.exists(posix.join(path, 'index.js'), { isFile: true })) {
    return { name: posix.join(path, 'index.js'), type: 'file' };
  }
  if(await fs.exists(posix.join(path, 'index.json'), { isFile: true })) {
    return { name: posix.join(path, 'index.json'), type: 'file' };
  }
  if(await fs.exists(posix.join(path, 'index.node'), { isFile: true })) {
    return { name: posix.join(path, 'index.node'), type: 'file' };
  }

  return null;
}

const loadAsDirectory = async function(path: string): Promise<ModuleResolveResult | null> {
  const packageJsonPath = posix.join(path, 'package.json');
  if(!await fs.exists(packageJsonPath)) {
    return loadIndex(path);
  }

  const content = await Deno.readTextFile(packageJsonPath);
  const entry = JSON.parse(content).main;
  if(typeof entry !== 'string') {
    return loadIndex(path);
  }
  const entryPath = posix.join(path, entry);

  return await loadAsFile(entryPath)
    ?? await loadIndex(entryPath)
    ?? await loadIndex(path);
}

export default requireNodeModule;
