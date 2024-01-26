import { path } from '../../deps.ts';
import { decomposeNPMModuleURL } from './moduleName.ts';

const semverRegExp =
  /^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+)?/;

const toCacheURL = function (url: URL, cacheRoot: URL): URL {
  const module = decomposeNPMModuleURL(url.href);
  if (module === null) {
    throw Error(`Cannot convert ${url.href} into cache URL`);
  }
  if (typeof module.version !== 'string') {
    throw Error(`Cannot convert ${url.href} into cache URL`);
  }

  const pkgVersion = module.version.match(semverRegExp)?.[0] ?? '.';
  const cachePath = path.join(
    'npm',
    'registry.npmjs.org',
    module.name,
    pkgVersion,
    module.path,
  );
  return new URL(cachePath, cacheRoot);
};

export default toCacheURL;
