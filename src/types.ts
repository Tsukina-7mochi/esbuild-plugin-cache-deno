interface LockMap {
  version: string;
  remote?: { [key: string]: string };
  npm?: {
    specifiers: { [key: string]: string };
    packages: {
      [key: string]: {
        integrity: string;
        dependencies: { [key: string]: string };
      };
    };
  };
}

interface PartialPackageJson {
  main?: string;
  exports?: string | {
    [key: string]: string | { [key: string]: string },
  },
  imports?: string | {
    [key: string]: string | { [key: string]: string },
  }
}
type PackageJson = Required<PartialPackageJson>;

type ImportKind = 'import' | 'require';

interface ModuleScope {
  root: URL;
  resolve: (moduleName: string, baseURL: URL, kind: ImportKind) => URL | null | Promise<URL | null>;
}

interface ModuleFilePath {
  url: URL;
  scope: ModuleScope | null;
  toCacheURL: (cacheDirname: URL) => URL | null | Promise<URL | null>;
}

export type { LockMap, PackageJson, ModuleScope, ModuleFilePath };
