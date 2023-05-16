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

interface ModuleScope {
  root: URL;
  resolve: (moduleName: string, basePath: string) => URL | null;
}

interface ModuleFilePath {
  url: URL;
  scope: ModuleScope;
  toCachePath: (cacheDirname: string) => string;
}

export type { LockMap, ModuleScope, ModuleFilePath };
