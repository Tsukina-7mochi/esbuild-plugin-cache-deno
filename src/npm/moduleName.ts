type DecomposeNPMModuleURLResult = {
  name: string;
  version?: string;
  fullName: string;
  path: string;
};

const moduleURLRegExp1 =
  /^npm:\/?((?<pkgName>@?[^/][^@]*)@(?<version>[^/]+))(?<path>.+)?$/;
const moduleURLRegExp2 =
  /^npm:\/?((?<pkgName>([^@][^/]+|@[^/]+\/[^/]+)))(?<path>.+)?$/;
const decomposeNPMModuleURL = function (
  moduleSpecifier: string,
): DecomposeNPMModuleURLResult | null {
  const matchResult = moduleSpecifier.match(moduleURLRegExp1) ??
    moduleSpecifier.match(moduleURLRegExp2);
  if (matchResult === null) {
    return null;
  }
  const { pkgName, version, path } = matchResult.groups!;
  return {
    name: pkgName,
    version,
    fullName: version ? `${pkgName}@${version}` : pkgName,
    path: path ?? '/',
  };
};

export { decomposeNPMModuleURL };
