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

interface PartialPackageJSON {
  name: string;
  main?: string;
  exports?: string | {
    [key: string]: string | string[] | null | { [key: string]: string | string[] | null },
  },
  imports?: string | {
    [key: string]: string | { [key: string]: string },
  }
}

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

export type { LockMap, PartialPackageJSON, ModuleScope, ModuleFilePath };
