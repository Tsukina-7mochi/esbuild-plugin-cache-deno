import { PackageJSON } from '../types.ts';

const getPackageJSONExports = function (
  packageJSON: Pick<PackageJSON, 'main' | 'exports'>,
  useMain = true,
  preferImport = false,
): Record<string, string> {
  const exports: Record<string, string> = {};
  if (useMain && typeof packageJSON['main'] === 'string') {
    exports['.'] = packageJSON['main'];
  }

  const rawExports = packageJSON['exports'];
  if (rawExports === undefined) {
    // do nothing
  } else if (typeof rawExports === 'string') {
    exports['.'] = rawExports;
  } else {
    const keyTypes = Object.keys(rawExports).map((key) =>
      key === '.' || key.startsWith('./')
    );
    if (keyTypes.every((v) => v)) {
      // keys are path
      for (const key in rawExports) {
        let value = rawExports[key];
        if (value === null) {
          continue;
        } else if (typeof value === 'string') {
          exports[key] = value;
        } else if (Array.isArray(value)) {
          // TODO: support alternatives
          if (value.length > 0) {
            exports[key] = value[0];
          }
        } else {
          if (preferImport) {
            value = value['import'] ??
              value['require'] ??
              value['default'];
          } else {
            value = value['require'] ??
              value['import'] ??
              value['default'];
          }
          if (typeof value === 'string') {
            exports[key] = value;
          }
        }
      }
    } else if (keyTypes.every((v) => !v)) {
      // keys are conditions
      let value = null;
      if (preferImport) {
        value = rawExports['import'] ??
          rawExports['require'] ??
          rawExports['default'];
      } else {
        value = rawExports['require'] ??
          rawExports['import'] ??
          rawExports['default'];
      }
      if (typeof value === 'string') {
        exports['.'] = value;
      }
    } else {
      throw Error(
        'Condition and path are mixed in the keys of package.json exports',
      );
    }
  }

  return exports;
};

const resolvePackageJSONExports = function (
  specifier: string,
  exports: Record<string, string>,
): string | null {
  if (specifier === '' || specifier === '.' || specifier === './') {
    return exports['.'];
  }

  for (const key in exports) {
    if (key.includes('*')) {
      // TODO: support glob
    } else {
      if (key.endsWith('/')) {
        if (specifier.startsWith(key)) {
          return exports[key] + specifier.slice(key.length);
        }
      } else {
        if (specifier === key) {
          return exports[key];
        }
      }
    }
  }

  return null;
};

export { getPackageJSONExports, resolvePackageJSONExports };
