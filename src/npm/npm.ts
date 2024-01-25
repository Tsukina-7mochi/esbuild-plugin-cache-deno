import toCacheURL from './toCacheURL.ts';
import resolveImport from './resolveImport.ts';

export { resolveImport, toCacheURL };

// import { fs } from '../../deps.ts';
// import type { LockMapV3, PackageJSON } from '../types.ts';
// import ImportMapResolver from '../importMapResolver.ts';
// import coreModuleNames from './coreModuleNames.ts';
//
// const testFileExistence = async function (url: URL, cacheRoot: URL): Promise<URL | null> {
//   if (await fs.exists(toCacheURL(url, cacheRoot), { isFile: true })) {
//     return url;
//   }
//   return null;
// };
//
// const decomposePackageNameVersion = function (
//   pkgStr: string,
// ): [string, string] {
//   const index = pkgStr.lastIndexOf('@');
//   if (index <= 0) {
//     return [pkgStr, ''];
//   } else {
//     return [pkgStr.slice(0, index), pkgStr.slice(index + 1)];
//   }
// };
//
// const toCacheURL = function (url: URL, cacheRoot: URL): URL {
//   const pathSegments = url.pathname.split('/');
//   const pkgFullName = pathSegments[1];
//   const [pkgName, pkgVersion] = decomposePackageNameVersion(pkgFullName);
//   const path = [
//     'npm',
//     'registry.npmjs.org',
//     pkgName,
//     pkgVersion,
//     ...pathSegments.slice(2),
//   ].join('/');
//   return new URL(path, cacheRoot);
// };
//
// const normalizeNodeNpmUrl = function (url: URL): URL {
//   if (url.pathname === '' || url.pathname === '/') {
//     throw Error('URL path must not be empty or root (/).');
//   }
//
//   let pathname = url.pathname;
//   if (!pathname.startsWith('/')) {
//     pathname = '/' + pathname;
//   }
//   if (pathname.split('/').length < 3) {
//     pathname += '/';
//   }
//
//   return new URL(`${url.protocol}${pathname}`);
// };
//
// const findClosestPackageScope = async function (url: URL, cacheRoot: URL): Promise<URL | null> {
//   const normalizedUrl = normalizeNodeNpmUrl(url);
//   let packageJsonUrl = new URL('./package.json', normalizedUrl);
//
//   while (await testFileExistence(packageJsonUrl, cacheRoot) === null) {
//     packageJsonUrl = new URL('../package.json', packageJsonUrl);
//     if (packageJsonUrl.pathname.split('/').length < 3) {
//       return null;
//     }
//   }
//
//   return new URL('.', packageJsonUrl);
// };
//
// const getPackageExports = function (
//   packageJSON: PackageJSON,
//   useMain = true,
//   preferImport = false,
// ): Record<string, string> {
//   const exports: Record<string, string> = {};
//   if (useMain && typeof packageJSON['main'] === 'string') {
//     exports['.'] = packageJSON['main'];
//   }
//
//   const rawExports = packageJSON['exports'];
//   if (rawExports === undefined) {
//     // do nothing
//   } else if (typeof rawExports === 'string') {
//     exports['.'] = rawExports;
//   } else {
//     const keyTypes = Object.keys(rawExports).map((key) =>
//       key === '.' || key.startsWith('./')
//     );
//     if (keyTypes.every((v) => v)) {
//       // keys are path
//       for (const key in rawExports) {
//         let value = rawExports[key];
//         if (value === null) {
//           continue;
//         } else if (typeof value === 'string') {
//           exports[key] = value;
//         } else if (Array.isArray(value)) {
//           // TODO: support alternatives
//           if (value.length > 0) {
//             exports[key] = value[0];
//           }
//         } else {
//           if (preferImport) {
//             value = value['import'] ??
//               value['require'] ??
//               value['default'];
//           } else {
//             value = value['require'] ??
//               value['import'] ??
//               value['default'];
//           }
//           if (typeof value === 'string') {
//             exports[key] = value;
//           }
//         }
//       }
//     } else if (keyTypes.every((v) => !v)) {
//       // keys are conditions
//       let value = null;
//       if (preferImport) {
//         value = rawExports['import'] ??
//           rawExports['require'] ??
//           rawExports['default'];
//       } else {
//         value = rawExports['require'] ??
//           rawExports['import'] ??
//           rawExports['default'];
//       }
//       if (typeof value === 'string') {
//         exports['.'] = value;
//       }
//     } else {
//       throw Error(
//         'Condition and path are mixed in the keys of package.json exports',
//       );
//     }
//   }
//
//   return exports;
// };
//
// const resolveExports = function (
//   path: string,
//   exports: Record<string, string>,
// ): string | null {
//   if (path === '.' || path === '') {
//     return exports['.'];
//   }
//
//   for (const key in exports) {
//     if (key.includes('*')) {
//       // TODO: support wild cards
//     } else {
//       if (key.endsWith('/')) {
//         if (path.startsWith(key)) {
//           return exports[key] + path.slice(key.length);
//         }
//       } else {
//         if (key === path) {
//           return exports[key];
//         }
//       }
//     }
//   }
//
//   return null;
// };
//
// // const getPackageImports = function(packageJSON: PackageJSON) {
// //   return {};
// // }
//
// const resolveAsFile = async function (url: URL, cacheRoot: URL): Promise<URL | null> {
//   // .cjs or .mjs support?
//   return await testFileExistence(url, cacheRoot) ??
//     await testFileExistence(new URL(`${url.href}.js`), cacheRoot) ??
//     await testFileExistence(new URL(`${url.href}.json`), cacheRoot) ??
//     await testFileExistence(new URL(`${url.href}.node`), cacheRoot);
// };
//
// const resolveIndex = async function (url: URL, cacheRoot: URL): Promise<URL | null> {
//   // .cjs or .mjs support?
//   return await testFileExistence(new URL('index.js', url), cacheRoot) ??
//     await testFileExistence(new URL('index.json', url), cacheRoot) ??
//     await testFileExistence(new URL('index.node', url), cacheRoot);
// };
//
// const resolveAsDirectory = async function (
//   url: URL,
//   cacheRoot: URL,
// ): Promise<URL | null> {
//   if (await testFileExistence(new URL('package.json', url), cacheRoot)) {
//     const content = await Deno.readTextFile(
//       toCacheURL(new URL('package.json', url), cacheRoot),
//     );
//     const packageJSON = JSON.parse(content) as PackageJSON;
//     const exports = getPackageExports(packageJSON);
//     const main = exports['.'];
//     const mainURL = new URL(main, url);
//
//     if (typeof main === 'string') {
//       return await resolveAsFile(mainURL, cacheRoot) ??
//         await resolveIndex(mainURL, cacheRoot) ??
//         await resolveIndex(url, cacheRoot);
//     }
//     return null;
//   }
//
//   return resolveIndex(url, cacheRoot);
// };
//
// const resolveImport = async function (
//   moduleName: string,
//   importer: URL,
//   cacheRoot: URL,
//   lockMap: LockMapV3,
//   importMapResolver?: ImportMapResolver,
// ): Promise<URL | null> {
//   if (moduleName.startsWith('node:')) {
//     return importMapResolver?.resolve(moduleName, importer) ??
//       new URL(moduleName);
//   }
//   if (coreModuleNames.includes(moduleName)) {
//     return importMapResolver?.resolve(`node:${moduleName}`, importer) ??
//       new URL(`node:${moduleName}`);
//   }
//
//   if (moduleName.startsWith('/')) {
//     throw Error('absolute path import is not permitted in Node.js modules.');
//   }
//   if (moduleName.startsWith('./') || moduleName.startsWith('../')) {
//     const url = new URL(moduleName, importer);
//     const resolved = await resolveAsFile(url, cacheRoot) ??
//       await resolveAsDirectory(url, cacheRoot);
//     if (resolved === null) {
//       return null;
//     }
//
//     return importMapResolver?.resolve(resolved.href, importer) ??
//       resolved;
//   }
//
//   if (moduleName.startsWith('#')) {
//     // resolve imports
//   }
//
//   if (importer.protocol === 'file:' && !moduleName.includes('@')) {
//     for (const pkg of Object.keys(lockMap.packages?.specifiers ?? {})) {
//       if (pkg.startsWith(moduleName)) {
//         moduleName = pkg;
//         break;
//       }
//     }
//   }
//
//   const moduleNamePath = moduleName.includes(':')
//     ? moduleName.slice(moduleName.lastIndexOf(':') + 1)
//     : moduleName;
//   const pkgFullName = moduleNamePath.replace(/^\//, '').split('/')[0];
//   const [pkgName, _] = decomposePackageNameVersion(pkgFullName);
//   const path = moduleNamePath.replace(/^\//, '').split('/').slice(1);
//
//   let dependencies: Record<string, string> | undefined;
//   if (importer.protocol === 'file:') {
//     dependencies = lockMap.packages?.specifiers;
//   } else {
//     const pkgFullName = normalizeNodeNpmUrl(importer).pathname.split('/')[1];
//     dependencies = lockMap.packages?.npm?.[pkgFullName]?.dependencies;
//   }
//
//   // resolve self package exports
//   if (importer.protocol !== 'file:') {
//     let scope = await findClosestPackageScope(importer, cacheRoot);
//     while (scope !== null) {
//       const importerPkgFullName =
//         normalizeNodeNpmUrl(importer).pathname.split('/')[1];
//       const packageJSONText = await Deno.readTextFile(
//         toCacheURL(new URL('package.json', scope), cacheRoot),
//       );
//       const packageJSON = JSON.parse(packageJSONText) as PackageJSON;
//       if (packageJSON['name'] === pkgName) {
//         const exports = getPackageExports(packageJSON, false);
//         if (path.length === 0) {
//           if (typeof exports['.'] === 'string') {
//             const url = new URL(exports['.'], `npm:/${importerPkgFullName}/`);
//             return importMapResolver?.resolve(url.href, importer) ?? url;
//           }
//         } else {
//           const exportResolved = resolveExports(`./${path.join('/')}`, exports);
//           if (typeof exportResolved === 'string') {
//             const url = new URL(exportResolved, `npm:/${importerPkgFullName}/`);
//             return importMapResolver?.resolve(url.href, importer) ?? url;
//           }
//         }
//       }
//
//       if (scope.pathname.split('/').length <= 3) {
//         break;
//       }
//       scope = await findClosestPackageScope(new URL('..', scope), cacheRoot);
//     }
//   }
//
//   // Get the list of dependencies depending on the importer's protocol.
//   if (dependencies === undefined) {
//     return null;
//   }
//   const pkgToImportFullName = importer.protocol === 'file:'
//     ? dependencies[`npm:${pkgFullName}`]?.slice(4)
//     : dependencies[pkgName];
//
//   if (typeof pkgToImportFullName !== 'string') {
//     return null;
//   }
//   const packageJSONText = await Deno.readTextFile(
//     toCacheURL(new URL(`npm:/${pkgToImportFullName}/package.json`), cacheRoot),
//   );
//   const packageJSON = JSON.parse(packageJSONText) as PackageJSON;
//   const exports = getPackageExports(
//     packageJSON,
//     true,
//     importer.protocol === 'file:',
//   );
//   if (path.length === 0) {
//     if (exports['.'] === undefined) {
//       return null;
//     }
//     const url = new URL(exports['.'], `npm:/${pkgToImportFullName}/`);
//     return importMapResolver?.resolve(url.href, importer) ?? url;
//   } else {
//     const exportResolved = resolveExports(`./${path.join('/')}`, exports);
//     if (typeof exportResolved === 'string') {
//       const url = new URL(exportResolved, `npm:/${pkgToImportFullName}/`);
//       return importMapResolver?.resolve(url.href, importer) ?? url;
//     } else {
//       // default behavior
//       const url = new URL(`npm:/${[pkgToImportFullName, ...path].join('/')}`);
//       return importMapResolver?.resolve(url.href, importer) ?? url;
//     }
//   }
// };
//
// export { resolveImport, toCacheURL };
//
// export const __test = {
//   testFileExistence,
//   decomposePackageNameVersion,
//   toCacheURL,
//   normalizeNodeNpmUrl,
//   findClosestPackageScope,
//   getPackageExports,
//   resolveExports,
//   resolveAsFile,
//   resolveIndex,
//   resolveAsDirectory,
//   resolveImport,
// };