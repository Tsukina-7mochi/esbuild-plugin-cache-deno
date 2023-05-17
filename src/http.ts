import { posix, sha256 } from "../deps.ts";
import type { ModuleScope, ModuleFilePath } from "./types.ts";
import ImportmapResolver from "./importmap.ts";

class HttpModuleScope implements ModuleScope {
  root: URL;
  importmapResolver: ImportmapResolver | null;

  constructor(root: URL, importmapResolver?: ImportmapResolver) {
    if(root.protocol !== 'http:' && root.protocol !== 'https:') {
      throw Error(`Protocol must be http or https, not ${root.protocol}`);
    }
    if(root.pathname !== '/') {
      throw Error(`Pathname must be "/", not ${root.href}`);
    }

    this.root = new URL(root);
    this.importmapResolver = importmapResolver ?? null;
  }

  resolve(moduleName: string, basePath: string) {
    let url = null;
    try {
      url = new URL(moduleName);
    } catch {}

    if(url !== null){
      // do nothing
    }if(moduleName.startsWith('/')) {
      url = new URL(moduleName, this.root);
    } else if(moduleName.startsWith('./') || moduleName.startsWith('../')) {
      url = new URL(`${basePath}/${moduleName}`, this.root);
    }

    if(this.importmapResolver !== null){
      if(url === null) {
        const resolved = this.importmapResolver.resolve(moduleName, basePath);
        if(resolved !== null) {
          return resolved;
        }
      } else {
        const resolved = this.importmapResolver.resolve(url.href, basePath);
        if(resolved !== null) {
          return resolved;
        }
      }
    }

    return url;
  }
}

class HttpModuleFilePath implements ModuleFilePath {
  url: URL;
  scope: HttpModuleScope;

  constructor(url: URL, scope?: HttpModuleScope) {
    this.url = new URL(url);
    this.scope = scope ?? getHttpModuleScope(this.url);
  }

  toCachePath(cacheDirname: string) {
    const hashContext = new sha256.Sha256();
    const pathHash = hashContext.update(this.url.pathname).toString();
    const cachePath = posix.resolve(
      cacheDirname,
      'deps',
      this.url.protocol.slice(0, -1),
      this.url.hostname,
      pathHash,
    );
    return cachePath;
  }
}

const cachedModuleScope = new Map<string, HttpModuleScope>();
const getHttpModuleScope = function(url_: URL) {
  const url = new URL(url_);
  url.pathname = '/';
  url.hash = '';
  url.search = '';

  const cachedScope = cachedModuleScope.get(url.href);
  if(cachedScope !== undefined) {
    return cachedScope;
  }

  const scope = new HttpModuleScope(url);
  cachedModuleScope.set(url.href, scope);

  return scope;
}

export { HttpModuleScope, HttpModuleFilePath, getHttpModuleScope };
