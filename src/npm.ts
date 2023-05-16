import { posix, fs } from "../deps.ts";

interface ModuleResolveResult {
  name: string;
  type: 'file' | 'core-module' | 'module';
}

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

const testFilePath = async function(path: string) {
  if(await fs.exists(path, { isFile: true })) {
    return path;
  }
  return null;
}

const decomposePackageNameVersion = function (
  pkgStr: string,
): [string, string] {
  const index = pkgStr.lastIndexOf('@');
  if (index <= 0) {
    return [pkgStr, ''];
  } else {
    return [pkgStr.slice(0, index), pkgStr.slice(index + 1)];
  }
};

const npmUrlToCachePath = function(url: URL, cacheDirectory: string) {
  const path = url.pathname.split('/');
  const pkgFullName = path[1];
  const [pkgName, pkgVersion] = decomposePackageNameVersion(pkgFullName);
  const innerPath = path.slice(2).join('/');
  const cachePath = posix.resolve(
    cacheDirectory,
    'npm',
    'registry.npmjs.org',
    pkgName,
    pkgVersion,
    innerPath
  );

  return cachePath + (url.pathname.endsWith('/') ? '/' : '');
}

const npmCachePathToUrl = function(path_: string) {
  const cacheRootPath = posix.join('npm', 'registry.npmjs.org');
  const moduleNameIndex = path_.indexOf(cacheRootPath);
  const path = path_.slice(moduleNameIndex + cacheRootPath.length).split('/');
  const pkgFullName = `${path[1]}@${path[2]}`;
  const innerPath = path.slice(3).join('/');
  return new URL(`npm:/${pkgFullName}/${innerPath}`);
}

const resolveNpmCachePath = async function(path: string) {
  if(await fs.exists(path, { isDirectory: true })) {
    if(await testFilePath(posix.join(path, 'package.json'))) {
      const content = await Deno.readTextFile(posix.join(path, 'package.json'));
      const main = JSON.parse(content)['main'];
      if(typeof main === 'string') {
        return posix.resolve(path, main);
      }
    }

    return testFilePath(posix.join(path, 'index.js'))
      ?? testFilePath(posix.join(path, 'index.json'))
      ?? testFilePath(posix.join(path, 'index.node'));
  }

  return testFilePath(path)
    ?? testFilePath(`${path}.js`)
    ?? testFilePath(`${path}.json`)
    ?? testFilePath(`${path}.node`);
}

const packageFullNamePattern = /^@?[^@]+@\d+\.\d+\.\d+.*$/;

class NpmNameSpace {
  root: URL;
  specifiers: { [key: string]: string };
  cacheDirectory: string;
  exports: { [key: string]: string[] };

  constructor(
    root: NpmNameSpace["root"],
    cacheDirectory: string,
    specifiers: NpmNameSpace["specifiers"],
    exports: { [key: string]: string | string[] | { [key: string]: string } } | string
  ) {
    if(!root.pathname.startsWith('/')) {
      throw Error(`npm module URL must starts with "/", like "npm:/module/".`);
    }
    if(!root.pathname.endsWith('/')) {
      throw Error(`npm module URL must ends with "/", like "npm:/module/".`);
    }
    for(const value of Object.values(specifiers)) {
      if(!packageFullNamePattern.test(value)) {
        throw Error(`Package full name ${value} is invalid.`);
      }
    }

    this.root = root;
    this.cacheDirectory = cacheDirectory;
    this.specifiers = specifiers;
    this.exports = {};

    if(typeof exports === 'string') {
      this.exports[this.root.pathname] = [exports];
    } else if(Object.keys(exports).some(v => !v.startsWith('.'))) {
      // only conditions
      if('import' in exports) {
        this.exports[this.root.pathname] = [exports['import']];
      } else if('require' in exports) {
        this.exports[this.root.pathname] = [exports['require']];
      } else if('umd' in exports) {
        this.exports[this.root.pathname] = [exports['umd']];
      } else {
        throw Error(`Cannot interpret export ${key} in ${this.root}`);
      }
    } else {
      for(const key in exports) {
        const value = exports[key];
        const path = posix.resolve(this.root.pathname, key);

        if(typeof value === 'string') {
          this.exports[path] = [value];
        } else if(Array.isArray(value)) {
          this.exports[path] = value;
        } else {
          if('import' in value) {
            this.exports[path] = [value['import']];
          } else if('require' in value) {
            this.exports[path] = [value['require']];
          } else if('umd' in value) {
            this.exports[path] = [value['umd']];
          } else {
            throw Error(`Cannot interpret export ${key} in ${this.root}`);
          }
        }
      }
    }
  }

  async resolve(path: string, basePath?: string) {
    const absPath = posix.resolve(this.root.pathname, basePath ?? '', path);
    // resolve exports
    for(const key in this.exports) {
      if(key.endsWith('/')) {
        if(absPath.startsWith(key)) {
          for(const path of this.exports[absPath]) {
            const url = new URL(path + absPath.slice(0, -key.length), this.root);
            const resolved = await resolveNpmCachePath(npmUrlToCachePath(url, this.cacheDirectory));
            if(resolved !== null) {
              return npmCachePathToUrl(resolved);
            }
          }
        }
      } else if(key.endsWith('/*')) {
        //
      } else {
        if(absPath === key) {
          for(const path of this.exports[absPath]) {
            const url = new URL(path, this.root);
            const resolved = await resolveNpmCachePath(npmUrlToCachePath(url, this.cacheDirectory));
            if(resolved !== null) {
              return npmCachePathToUrl(resolved);
            }
          }
        }
      }
    }

    if(path.startsWith('/')) {
      // absolute path
      const url = new URL(path, this.root);
      const resolved = await resolveNpmCachePath(npmUrlToCachePath(url, this.cacheDirectory));
      if(resolved === null) {
        return null;
      }
      return npmCachePathToUrl(resolved);
    } else if(path.startsWith('./') || path.startsWith('../')) {
      // relative path
      if(typeof basePath !== 'string') {
        throw Error('Cannot resolve relative path without base path');
      }
      const url = new URL(
        posix.resolve(posix.join(this.root.pathname, basePath), path),
        `${this.root.protocol}/`
      );
      const resolved = await resolveNpmCachePath(npmUrlToCachePath(url, this.cacheDirectory));
      if(resolved === null) {
        return null;
      }
      return npmCachePathToUrl(resolved);
    } else {
      // bare module
      if(path.startsWith('node:')) {
        return new URL(path);
      }
      if(coreModuleNames.includes(path)) {
        return new URL(`node:${path}`);
      }
      if(path in this.specifiers) {
        return new URL(`npm:${this.specifiers[path]}`);
      }
    }

    throw Error(`Cannot resolve ${path}.`);
  }
}

export {
  npmUrlToCachePath,
  npmCachePathToUrl,
  NpmNameSpace
};
