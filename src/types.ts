type LockMapV2 = {
  version: '2';
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

type LockMapV3 = {
  version: '3';
  remote?: { [key: string]: string };
  redirects?: { [key: string]: string };
  packages?: {
    specifiers?: { [key: string]: string };
    npm?: {
      [key: string]: {
        integrity: string;
        dependencies: { [key: string]: string };
      };
    };
  };
}

type PartialPackageJSON = {
  name: string;
  main?: string;
  exports?: string | {
    [key: string]: string | string[] | null | {
      [key: string]: string | string[] | null;
    };
  };
  imports?: string | {
    [key: string]: string | { [key: string]: string };
  };
}

type ImportKind = 'import' | 'require';

type ModuleScope = {
  root: URL;
  resolve: (
    moduleName: string,
    baseURL: URL,
    kind: ImportKind,
  ) => URL | null | Promise<URL | null>;
}

type ModuleFilePath = {
  url: URL;
  scope: ModuleScope | null;
  toCacheURL: (cacheDirname: URL) => URL | null | Promise<URL | null>;
}

export type {
  LockMapV2,
  LockMapV3,
  ModuleFilePath,
  ModuleScope,
  PartialPackageJSON,
};
