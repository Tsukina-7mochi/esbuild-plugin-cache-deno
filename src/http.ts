import { sha256 } from "../deps.ts";
import ImportmapResolver from "./importmap.ts";

const resolveImport = function(
  moduleName: string,
  importer: URL,
  importmapResolver?: ImportmapResolver
) {
  let url = null;
  try {
    // simply return if module name is URL
    url = new URL(moduleName);
  } catch {
    if(moduleName.startsWith('/')
      || moduleName.startsWith('./')
      || moduleName.startsWith('../')
    ) {
      url = new URL(moduleName, importer);
    }
  }

  if(importmapResolver !== undefined) {
    const importerDirname = new URL('.', importer).href;
    if(url === null) {
      url = importmapResolver.resolve(moduleName, importerDirname);
    } else {
      url = importmapResolver.resolve(url.href, importerDirname);
    }
  }

  return url;
}

const toCacheURL = function(url: URL, cacheRoot: URL) {
  const protocol = url.protocol.slice(0, -1);
  const hostname = url.hostname;
  const hashContext = new sha256.Sha256();
  const pathHash = hashContext.update(url.pathname).toString();
  const path = ['deps', protocol, hostname, pathHash].join('/');

  return new URL(path, cacheRoot);
}

export { resolveImport, toCacheURL };
