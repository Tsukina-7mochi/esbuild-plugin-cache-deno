type ImportMap = {
  imports?: Record<string, string>;
  scopes?: {
    [key: string]: Record<string, string>;
  };
}

type ImportMapScope = {
  path: string;
  isFullUrl: boolean;
  pathName: string;
  map: Record<string, URL>;
}

/**
 * Converts an import map entry value into `URL`
 *
 * @param {string} value import map entry value
 * @param {URL} docRoot document root path; Generally, the URL of the location where the import map is located
 * @return {*}  {URL}
 *
 * @example
 * getImportMapValueURL('./foo/bar.ts', new URL('http://example.com/'));
 * // -> new URL(http://example.com/foo/bar.ts)
 *
 * @example
 * getImportMapValueURL('/foo/bar.ts', docRoot);
 * // -> new URL(file:///foo/bar.ts)
 *
 * @example
 * getImportMapValueURL('./foo/bar.ts', new URL('file:///project/src/'));
 * // -> new URL(file:///project/src/foo/bar.ts)
 *
 * @example
 * getImportMapValueURL('../foo/bar.ts', new URL('file:///project/src/'));
 * // -> new URL(file:///project/foo/bar.ts)
 */
const getImportMapValueUrl = function (value: string, docRoot: URL): URL {
  try {
    return new URL(value);
  } catch {
    if (value.startsWith('/')) {
      return new URL('file://' + value);
    } else if (value.startsWith('./') || value.startsWith('../')) {
      return new URL(value, docRoot);
    }
    throw Error(`${value} is not valid for importMap value.`);
  }
};

/**
 * Converts name-path map to name-url map in import map
 *
 * @param {Record<string, string>} map import map entry e.g. `importMap.imports` & `importMap.scope['scopeName']`
 * @param {URL} docRoot document root path; Generally, the URL of the location where the import map is located
 * @return {*}  {Record<string, URL>}
 *
 * @example
 * importMapMapToUrl({
 *   'module1': 'http://example.com/module1.ts',
 *   'module2': '/foo/module2.ts',
 *   'module3': './bar/module3.ts',
 *   'module4': '../module4.ts',
 * }, new URL('file:///project/src/'));
 * // -> {
 * //   'module1': new URL('http://example.com/module1.ts'),
 * //   'module2': new URL('file:///foo/module2.ts'),
 * //   'module3': new URL('file:///project/src/bar/module3.ts'),
 * //   'module3': new URL('file:///project/module4.ts'),
 * // }
 */
const importMapMapToUrl = function (
  map: Record<string, string>,
  docRoot: URL,
): Record<string, URL> {
  const urlMap: Record<string, URL> = {};
  for (const key in map) {
    let newKey = key;
    if (key.startsWith('./') || key.startsWith('../') || key.startsWith('/')) {
      newKey = new URL(key, docRoot).href;
    }
    urlMap[newKey] = getImportMapValueUrl(map[key], docRoot);
  }
  return urlMap;
};

/**
 * Creates `ImportMapScope`s from `ImportMap`
 *
 * @param {ImportMap} importMap
 * @param {URL} docRoot document root path; Generally, the URL of the location where the import map is located
 * @return {importMapScopes}  {ImportMapScope[]} scopes sorted by priority
 */
const getImportMapScopes = function (
  importMap: ImportMap,
  docRoot: URL,
): ImportMapScope[] {
  const scopes = importMap.scopes;
  if (scopes === undefined) {
    return [];
  }

  return Object.keys(scopes)
    .map((path) => {
      try {
        const url = new URL(path);
        const pathSegments = url.pathname.split('/').filter((v) => v.length > 0);
        return {
          path,
          isFullUrl: true,
          pathName: `/${pathSegments.join('/')}`,
          map: importMapMapToUrl(scopes[path], docRoot),
          priority: pathSegments.length,
        };
      } catch {
        const pathSegments = path.split('/').filter((v) => v.length > 0);
        return {
          path,
          isFullUrl: false,
          pathName: `/${pathSegments.join('/')}`,
          map: importMapMapToUrl(scopes[path], docRoot),
          priority: pathSegments.length,
        };
      }
    })
    .toSorted((a, b) => b.priority - a.priority);
};

/**
 * Resolve `moduleSpecifier` with module specifier key-`URL` map
 *
 * @param {string} moduleSpecifier
 * @param {Record<string, URL>} map key-`URL` map
 * @return {*}  {(URL | null)}
 */
const resolveWithImports = function (
  moduleSpecifier: string,
  map: Record<string, URL>
): URL | null {
  for (const key in map) {
    // keys can be used as prefix only when it ends with "/"
    if (key.endsWith('/')) {
      if (moduleSpecifier.startsWith(key)) {
        return new URL(moduleSpecifier.slice(key.length), map[key]);
      }
    }

    if (moduleSpecifier === key) {
      return map[key];
    }
  }

  return null;
};

/**
 * module specifier resolver bound to specific `ImportMap`
 *
 * @class ImportMapResolver
 */
class ImportMapResolver {
  imports: Record<string, URL>;
  scopes: ImportMapScope[];
  docRoot: URL;

  constructor(importMap: ImportMap, docRoot: URL) {
    this.imports = importMapMapToUrl(importMap?.imports ?? {}, docRoot);
    this.scopes = getImportMapScopes(importMap, docRoot);
    this.docRoot = docRoot;
  }

  /**
   * resolves module specifier into module `URL`
   *
   * @param {string} moduleSpecifier
   * @param {URL} importer
   * @return {*}  {(URL | null)}
   * @memberof ImportMapResolver
   */
  resolve(moduleSpecifier: string, importer: URL): URL | null {
    const importerDirname = new URL('.', importer);

    if (
      moduleSpecifier.startsWith('/') ||
      moduleSpecifier.startsWith('./') ||
      moduleSpecifier.startsWith('../')
    ) {
      moduleSpecifier = new URL(moduleSpecifier, this.docRoot).href;
    }

    // resolve with `importMap.scope` entries
    for (const scope of this.scopes) {
      if (scope.isFullUrl) {
        if (importerDirname.href.startsWith(scope.path)) {
          const resolved = resolveWithImports(moduleSpecifier, scope.map);
          if (resolved !== null) {
            return resolved;
          }
        }
      } else {
        if (
          importerDirname.href.includes(scope.pathName + '/') ||
          importerDirname.href.endsWith(scope.pathName)
        ) {
          const resolved = resolveWithImports(moduleSpecifier, scope.map);
          if (resolved !== null) {
            return resolved;
          }
        }
      }
    }

    // resolve with `importMap.imports`
    return resolveWithImports(moduleSpecifier, this.imports);
  }
}

export type { ImportMap, ImportMapScope };
export default ImportMapResolver;
