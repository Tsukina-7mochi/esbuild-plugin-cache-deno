import { crypto } from '../deps.ts';
import ImportMapResolver from './importMapResolver.ts';

const resolveImport = function (
  moduleName: string,
  importer: URL,
  importMapResolver?: ImportMapResolver,
): URL | null {
  let url = null;
  try {
    // simply return if module name is URL
    url = new URL(moduleName);
  } catch {
    if (
      moduleName.startsWith('/') ||
      moduleName.startsWith('./') ||
      moduleName.startsWith('../')
    ) {
      url = new URL(moduleName, importer);
    }
  }

  if (importMapResolver !== undefined) {
    url = importMapResolver.resolve(url?.href ?? moduleName, importer);
  }

  return url;
};

const toCacheURL = function (url: URL, cacheRoot: URL): URL {
  const protocol = url.protocol.slice(0, -1);
  const hostname = url.hostname;
  // calculate hash of pathname
  const pathCodeArray = [...url.pathname].map((char) => char.charCodeAt(0));
  const pathArray = new Uint8Array(pathCodeArray);
  const pathHashArray = crypto.subtle.digestSync('SHA-256', pathArray);
  const pathHashView = new Uint8Array(pathHashArray);
  const pathHashHexString = Array.from(pathHashView)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const path = ['deps', protocol, hostname, pathHashHexString].join('/');

  return new URL(path, cacheRoot);
};

export { resolveImport, toCacheURL };
