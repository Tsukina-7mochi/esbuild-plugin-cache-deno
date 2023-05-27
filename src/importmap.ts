interface Importmap {
  imports?: Record<string, string>;
  scopes?: {
    [key: string]: Record<string, string>;
  };
}

interface Scope {
  path: string;
  isFullUrl: boolean;
  pathSegments: string[];
  map: Record<string, URL>;
}

const getImportmapValueUrl = function(value: string, docRoot: URL): URL {
  try {
    return new URL(value);
  } catch {
    if(value.startsWith('/')) {
      return new URL('file://' + value);
    } else if(value.startsWith('./') || value.startsWith('../')) {
      return new URL(value, docRoot);
    }
    throw Error(`${value} is not valid for importmap value.`);
  }
}

const importmapMapToUrl = function(
  map: Record<string, string>,
  docRoot: URL
): Record<string, URL> {
  const urlMap: Record<string, URL> = {};
  for(const key in map) {
    let newKey = key;
    if(key.startsWith('./') || key.startsWith('../') || key.startsWith('/')) {
      newKey = new URL(key, docRoot).href;
    }
    urlMap[newKey] = getImportmapValueUrl(map[key], docRoot);
  }
  return urlMap;
}

const getImportmapScopes = function(importmap: Importmap, docRoot: URL): Scope[] {
  const scopes = importmap.scopes;
  if(scopes === undefined) {
    return [];
  }

  return Object.keys(scopes)
    .map((path) => {
      try {
        const url = new URL(path);
        return {
          path,
          isFullUrl: true,
          pathSegments: url.pathname.split('/').filter((v) => v.length > 0),
          map: importmapMapToUrl(scopes[path], docRoot),
        };
      } catch {
        return {
          path,
          isFullUrl: false,
          pathSegments: path.split('/').filter((v) => v.length > 0),
          map: importmapMapToUrl(scopes[path], docRoot),
        };
      }
    })
    .toSorted((a, b) => b.pathSegments.length - a.pathSegments.length);
}

const resolveWithImports = function(path: string, map: Record<string, URL>) {
  for (const key in map) {
    // keys can be used as prefix only when it ends with "/"
    if (key.endsWith('/')) {
      if (path.startsWith(key)) {
        return new URL(path.slice(key.length), map[key]);
      }
    } else {
      if (path === key) {
        return map[key];
      }
    }
  }

  return null;
}

class ImportmapResolver {
  imports: Record<string, URL>;
  scopes: Scope[] | null;
  docRoot: URL;

  constructor(importmap: Importmap, docRoot: URL) {
    this.imports = importmapMapToUrl(importmap?.imports ?? {}, docRoot);
    const scopes = getImportmapScopes(importmap ?? {}, docRoot);
    if(scopes.length > 0) {
      this.scopes = scopes;
    } else {
      this.scopes = null;
    }
    this.docRoot = docRoot;
  }

  // importer -> URL
  resolve(path: string, importerDirname: URL) {
    if(path.startsWith('./') || path.startsWith('../') || path.startsWith('/')) {
      path = new URL(path, this.docRoot).href;
    }

    if(this.scopes !== null) {
      for(const scope of this.scopes) {
        if (scope.isFullUrl) {
          if (importerDirname.href.startsWith(scope.path)) {
            const resolved = resolveWithImports(path, scope.map);
            if (typeof resolved !== null) {
              return resolved;
            }
          }
        } else {
          if (
            importerDirname.href.includes(`/${scope.pathSegments.join('/')}/`) ||
            importerDirname.href.endsWith(`/${scope.pathSegments.join('/')}`)
          ) {
            const resolved = resolveWithImports(path, scope.map);
            if (typeof resolved !== null) {
              return resolved;
            }
          }
        }
      }
    }

    if(this.imports !== null) {
      return resolveWithImports(path, this.imports);
    }

    return null;
  }
}

export type { Importmap, Scope };
export default ImportmapResolver;
