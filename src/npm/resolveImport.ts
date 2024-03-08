import { fs } from '../../deps.ts';
import toCacheURL from './toCacheURL.ts';
import ImportMapResolver from '../importMapResolver.ts';
import { LockMapV3 } from '../types.ts';
import { resolveCoreModuleImport } from './coreModule.ts';
import testCacheFileExistence from './testCacheFileExistence.ts';
import {
  getPackageJSONExports,
  resolvePackageJSONExports,
} from './packageJSONExports.ts';
import { decomposeNPMModuleURL } from './moduleName.ts';

const resolveFileImport = async function (
  url: URL,
  cacheRoot: URL,
): Promise<URL | null> {
  return await testCacheFileExistence(url, cacheRoot) ??
    await testCacheFileExistence(new URL(`${url.href}.js`), cacheRoot) ??
    await testCacheFileExistence(new URL(`${url.href}.cjs`), cacheRoot) ??
    await testCacheFileExistence(new URL(`${url.href}.mjs`), cacheRoot) ??
    await testCacheFileExistence(new URL(`${url.href}.json`), cacheRoot) ??
    await testCacheFileExistence(new URL(`${url.href}.node`), cacheRoot);
};

const resolveIndexJsImport = async function (
  url: URL,
  cacheRoot: URL,
): Promise<URL | null> {
  if (!url.href.endsWith('/')) {
    url = new URL(`${url.href}/`);
  }
  return await testCacheFileExistence(new URL('index.js', url), cacheRoot) ??
    await testCacheFileExistence(new URL('index.cjs', url), cacheRoot) ??
    await testCacheFileExistence(new URL('index.mjs', url), cacheRoot) ??
    await testCacheFileExistence(new URL('index.json', url), cacheRoot) ??
    await testCacheFileExistence(new URL('index.node', url), cacheRoot);
};

const resolveDirectoryImport = async function (
  url: URL,
  cacheRoot: URL,
): Promise<URL | null> {
  if (!url.href.endsWith('/')) {
    url = new URL(`${url.href}/`);
  }

  const packageJSON = await testCacheFileExistence(
    new URL('package.json', url),
    cacheRoot,
  );
  if (packageJSON === null) {
    return resolveIndexJsImport(url, cacheRoot);
  }
  const packageJSONContent = await Deno.readTextFile(
    toCacheURL(new URL('package.json', url), cacheRoot),
  );
  const exports = getPackageJSONExports(JSON.parse(packageJSONContent));
  const main = exports['.'];

  if (typeof main !== 'string') {
    return null;
  }

  const mainURL = new URL(main, url);
  return await resolveFileImport(mainURL, cacheRoot) ??
    await resolveIndexJsImport(mainURL, cacheRoot) ??
    await resolveIndexJsImport(url, cacheRoot);
};

const resolveRelativeImport = async function (
  moduleSpecifier: string,
  importer: URL,
  cacheRoot: URL,
): Promise<URL | null> {
  if (moduleSpecifier.startsWith('/')) {
    throw Error('Absolute path import is not permitted in Node.js modules.');
  }
  if (moduleSpecifier.startsWith('./') || moduleSpecifier.startsWith('../')) {
    const url = new URL(moduleSpecifier, importer);

    return await resolveFileImport(url, cacheRoot) ??
      await resolveDirectoryImport(url, cacheRoot);
  }

  return null;
};

const resolvePackageSpecifier = function (
  moduleSpecifier: string,
  importer: URL,
  lockMap: LockMapV3,
): URL | null {
  if (importer.protocol === 'file:') {
    if (!moduleSpecifier.startsWith('npm:')) {
      return null;
    }
    const module = decomposeNPMModuleURL(moduleSpecifier);
    if (module == null) {
      return null;
    }
    const moduleFullName = lockMap.packages?.specifiers
      ?.[`npm:${module.fullName}`];
    if (!moduleFullName) {
      return null;
    }
    return new URL(`${moduleFullName}${module.path}`);
  } else if (importer.protocol === 'npm:') {
    const module = decomposeNPMModuleURL(`npm:${moduleSpecifier}`);
    const importerModule = decomposeNPMModuleURL(importer.href);
    if (module === null || importerModule === null) {
      return null;
    }

    if (module.name === importerModule.name) {
      return new URL(`npm:${importerModule.fullName}`);
    }
    const moduleFullName = lockMap.packages?.npm?.[importerModule.fullName]
      ?.dependencies?.[module.fullName];
    if (!moduleFullName) {
      return null;
    }
    return new URL(`npm:${moduleFullName}${module.path}`);
  }
  return null;
};

const resolvePackageImport = async function (
  moduleSpecifier: string,
  importer: URL,
  cacheRoot: URL,
  lockMap: LockMapV3,
): Promise<URL | null> {
  let packageURL = resolvePackageSpecifier(moduleSpecifier, importer, lockMap);
  if (packageURL === null) {
    return null;
  }

  const module = decomposeNPMModuleURL(packageURL.href);
  if (!module) {
    return null;
  }
  // normalize packageURL
  packageURL = new URL(`npm:/${module.fullName}/`);

  const packageJSONFileURL = toCacheURL(
    new URL('package.json', packageURL),
    cacheRoot,
  );
  if (!await fs.exists(packageJSONFileURL)) {
    return null;
  }
  const packageJSON = JSON.parse(await Deno.readTextFile(packageJSONFileURL));
  const packageExports = getPackageJSONExports(packageJSON);
  const resolved = resolvePackageJSONExports(`.${module.path}`, packageExports);
  if (typeof resolved === 'string') {
    return new URL(resolved, packageURL);
  }

  return new URL(module.path, packageURL);
};

const resolveImport = async function (
  moduleSpecifier: string,
  importer: URL,
  cacheRoot: URL,
  lockMap: LockMapV3,
  importMapResolver?: ImportMapResolver,
): Promise<URL | null> {
  const resolved = resolveCoreModuleImport(moduleSpecifier) ??
    await resolveRelativeImport(moduleSpecifier, importer, cacheRoot) ??
    // resolveImportImport (# imports) ??
    await resolvePackageImport(moduleSpecifier, importer, cacheRoot, lockMap);

  if (resolved === null) {
    return null;
  }
  return importMapResolver?.resolve(resolved.href, importer) ?? resolved;
};

export default resolveImport;
