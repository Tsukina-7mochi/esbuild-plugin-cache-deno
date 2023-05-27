import { fs } from "../deps.ts";
import type { LockMap, PartialPackageJSON } from "./types.ts";
import ImportmapResolver from "./importmap.ts";

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

const testFileExistence = async function(url: URL, cacheRoot: URL) {
  if(await fs.exists(toCacheURL(url, cacheRoot), { isFile: true })) {
    return url;
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

const toCacheURL = function(url: URL, cacheRoot: URL) {
  const pathSegments = url.pathname.split('/');
  const pkgFullName = pathSegments[1];
  const [pkgName, pkgVersion] = decomposePackageNameVersion(pkgFullName);
  const path = [
    'npm',
    'registry.npmjs.org',
    pkgName,
    pkgVersion,
    ...pathSegments.slice(2)
  ].join('/');
  return new URL(path, cacheRoot);
}

const normalizeNodeNpmUrl = function(url: URL) {
  if(url.pathname === '' || url.pathname === '/') {
    throw Error('URL path must not be empty or root (/).');
  }

  let pathname = url.pathname;
  if(!pathname.startsWith('/')) {
    pathname = '/' + pathname;
  }
  if(pathname.split('/').length < 3) {
    pathname += '/';
  }

  return new URL(`${url.protocol}${pathname}`);
}

const findClosestPackageScope = async function(url: URL, cacheRoot: URL) {
  const normalizedUrl = normalizeNodeNpmUrl(url);
  let packageJsonUrl = new URL('./package.json', normalizedUrl);

  while(await testFileExistence(packageJsonUrl, cacheRoot) === null) {
    packageJsonUrl = new URL('../package.json', packageJsonUrl);
    if(packageJsonUrl.pathname.split('/').length < 3) {
      return null;
    }
  }

  return new URL('.', packageJsonUrl);
}

const getPackageExports = function(packageJSON: PartialPackageJSON, useMain = true) {
  const exports: Record<string, string> = {};
  if(useMain && typeof packageJSON['main'] === 'string') {
    exports['.'] = packageJSON['main'];
  }

  const rawExports = packageJSON['exports'];
  if(rawExports === undefined) {
    // do nothing
  } else if(typeof rawExports === 'string') {
    exports['.'] = rawExports;
  } else {
    const keyTypes = Object.keys(rawExports).map(key => key === '.' || key.startsWith('./'));
    if(keyTypes.every(v => v)) {
      // keys are path
      for(const key in rawExports) {
        let value = rawExports[key];
        if(value === null) {
          continue;
        } else if(typeof value === 'string') {
          exports[key] = value;
        } else if(Array.isArray(value)) {
          // TODO: support alternatives
          if(value.length > 0) {
            exports[key] = value[0];
          }
        } else {
          value = value['require'] ?? value['default'];
          if(typeof value === 'string') {
            exports[key] = value;
          }
        }
      }
    } else if(keyTypes.every(v => !v)) {
      // keys are conditions
      const value = rawExports['require'] ?? rawExports['default'];
      if(typeof value === 'string') {
        exports['.'] = value;
      }
    } else {
      throw Error('Condition and path are mixed in the keys of package.json exports');
    }
  }

  return exports;
}

const resolveExports = function (path: string, exports: Record<string, string>) {
  if(path === '.' || path ==='') {
    return exports['.'];
  }

  for(const key in exports) {
    if(key.includes('*')) {
      // TODO: support wild cards
    } else {
      if(key.endsWith('/')) {
        if(path.startsWith(key)) {
          return exports[key] + path.slice(key.length);
        }
      } else {
        if(key === path) {
          return exports[key];
        }
      }
    }
  }
}

// const getPackageImports = function(packageJSON: PackageJSON) {
//   return {};
// }

const resolveAsFile = async function(url: URL, cacheRoot: URL) {
  // .cjs or .mjs support?
  return await testFileExistence(url, cacheRoot)
    ?? await testFileExistence(new URL(`${url.href}.js`), cacheRoot)
    ?? await testFileExistence(new URL(`${url.href}.json`), cacheRoot)
    ?? await testFileExistence(new URL(`${url.href}.node`), cacheRoot);
}

const resolveIndex = async function(url: URL, cacheRoot: URL) {
  // .cjs or .mjs support?
  return await testFileExistence(new URL('index.js', url), cacheRoot)
    ?? await testFileExistence(new URL('index.json', url), cacheRoot)
    ?? await testFileExistence(new URL('index.node', url), cacheRoot);
}

const resolveAsDirectory = async function(
  url: URL,
  cacheRoot: URL
) {
  if(await testFileExistence(new URL('package.json', url), cacheRoot)) {
    const content = await Deno.readTextFile(toCacheURL(new URL('package.json', url), cacheRoot));
    const packageJSON = JSON.parse(content) as PartialPackageJSON;
    const exports = getPackageExports(packageJSON);
    const main = exports['.'];

    if(typeof main === 'string') {
      const mainURL = new URL(main, url);
      return await resolveAsFile(mainURL, cacheRoot)
        ?? await resolveIndex(mainURL, cacheRoot)
        ?? await resolveIndex(url, cacheRoot);
    }
    return null;
  }

  return resolveIndex(url, cacheRoot);
}

const resolveImport = async function(
  moduleName: string,
  importer: URL,
  cacheRoot: URL,
  lockMap: LockMap,
  importmapResolver?: ImportmapResolver
) {
  const importerDirname = new URL('.', importer);

  if(moduleName.startsWith('node:')) {
    return importmapResolver?.resolve(moduleName, importerDirname)
      ?? new URL(moduleName);
  }
  if(coreModuleNames.includes(moduleName)) {
    return importmapResolver?.resolve(`node:${moduleName}`, importerDirname)
      ?? new URL(`node:${moduleName}`);
  }

  if(moduleName.startsWith('/')) {
    throw Error('Node.js module does not allowed to use absolute path import.');
  }
  if(moduleName.startsWith('./') || moduleName.startsWith('../')) {
    const url = new URL(moduleName, importer);
    const resolved = await resolveAsFile(url, cacheRoot)
      ?? await resolveAsDirectory(url, cacheRoot);
    if(resolved === null) {
      return null;
    }

    return importmapResolver?.resolve(resolved.href, importerDirname)
      ?? resolved;
  }

  if(moduleName.startsWith('#')) {
    // resolve imports
  }

  const moduleNamePath = moduleName.includes(':')
  ? moduleName.slice(moduleName.lastIndexOf(':') + 1)
  : moduleName;
  const pkgFullName = moduleNamePath.replace(/^\//, '').split('/')[0];
  const [pkgName, _] = decomposePackageNameVersion(pkgFullName);
  const path = moduleNamePath.replace(/^\//, '').split('/').slice(1);

  let dependencies: Record<string, string> | undefined;
  if(importer.protocol === 'file:') {
    dependencies = lockMap.npm?.specifiers;
  } else {
    const pkgFullName = normalizeNodeNpmUrl(importer).pathname.split('/')[1];
    dependencies = lockMap.npm?.packages?.[pkgFullName]?.dependencies;
  }

  // resolve self package exports
  if(importer.protocol !== 'file:') {
    let scope = await findClosestPackageScope(importer, cacheRoot);
    while(scope !== null) {
      const importerPkgFullName = normalizeNodeNpmUrl(importer).pathname.split('/')[1];
      const packageJSONText = await Deno.readTextFile(toCacheURL(new URL('package.json', scope), cacheRoot));
      const packageJSON = JSON.parse(packageJSONText) as PartialPackageJSON;
      if(packageJSON['name'] === pkgName) {
        const exports = getPackageExports(packageJSON, false);
        if(path.length === 0) {
          if(typeof exports['.'] === 'string') {
            const url = new URL(exports['.'], `npm:/${importerPkgFullName}/`);
            return importmapResolver?.resolve(url.href, importerDirname) ?? url;
          }
        } else {
          const exportResolved = resolveExports(`./${path.join('/')}`, exports);
          if(typeof exportResolved === 'string') {
            const url = new URL(exportResolved, `npm:/${importerPkgFullName}/`);
            return importmapResolver?.resolve(url.href, importerDirname) ?? url;
          }
        }
      }

      if(scope.pathname.split('/').length <= 3) {
        break;
      }
      scope = await findClosestPackageScope(new URL('..', scope), cacheRoot);
    }
  }

  // Get the list of dependencies depending on the importer's protocol.
  if(dependencies === undefined) {
    return null;
  }
  const pkgToImportFullName = importer.protocol === 'file:'
    ? dependencies[pkgFullName]
    : dependencies[pkgName];
  if(typeof pkgToImportFullName !== 'string') {
    return null;
  }
  const packageJSONText = await Deno.readTextFile(toCacheURL(new URL(`npm:/${pkgToImportFullName}/package.json`), cacheRoot));
  const packageJSON = JSON.parse(packageJSONText) as PartialPackageJSON;
  const exports = getPackageExports(packageJSON);
  if(path.length === 0) {
    if(exports['.'] === undefined) {
      return null;
    }
    const url = new URL(exports['.'], `npm:/${pkgToImportFullName}/`);
    return importmapResolver?.resolve(url.href, importerDirname) ?? url;
  } else {
    const exportResolved = resolveExports(`./${path.join('/')}`, exports);
    if(typeof exportResolved === 'string') {
      const url = new URL(exportResolved, `npm:/${pkgToImportFullName}/`);
      return importmapResolver?.resolve(url.href, importerDirname) ?? url;
    } else {
      // default behavior
      const url = new URL(`npm:/${[pkgToImportFullName, ...path].join('/')}`);
      return importmapResolver?.resolve(url.href, importerDirname) ?? url;
    }
  }
}

export { resolveImport, toCacheURL };

export const __test = {
  testFileExistence,
  decomposePackageNameVersion,
  toCacheURL,
  normalizeNodeNpmUrl,
  findClosestPackageScope,
  getPackageExports,
  resolveExports,
  resolveAsFile,
  resolveIndex,
  resolveAsDirectory,
  resolveImport
};
