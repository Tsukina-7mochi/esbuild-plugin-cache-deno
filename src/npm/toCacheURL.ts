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

const toCacheURL = function (url: URL, cacheRoot: URL): URL {
  const pathSegments = url.pathname.split('/');
  const pkgFullName = pathSegments[1];
  const [pkgName, pkgVersion] = decomposePackageNameVersion(pkgFullName);
  const path = [
    'npm',
    'registry.npmjs.org',
    pkgName,
    pkgVersion,
    ...pathSegments.slice(2),
  ].join('/');
  return new URL(path, cacheRoot);
};

export default toCacheURL;
