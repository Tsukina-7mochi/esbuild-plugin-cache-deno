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
};

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
};

type PackageJSON = {
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
};

export type { LockMapV2, LockMapV3, PackageJSON };
