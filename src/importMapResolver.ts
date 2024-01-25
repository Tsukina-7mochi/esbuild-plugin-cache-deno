import { isSpecialURL } from './util.ts';
import WarningsHandler from './warningsHandler.ts';
import { createURL } from './util.ts';

type ImportMap = {
  imports?: Record<string, string>;
  scopes?: {
    [key: string]: Record<string, string>;
  };
};

type ModuleSpecifierMapItem = {
  key: string;
  value: URL | null;
  verbosity: number;
};

type ImportMapScopeItem = {
  prefix: string;
  imports: ModuleSpecifierMapItem[];
  verbosity: number;
};

const resolveURLLikeModuleSpecifier = function (
  specifier: string,
  baseURL?: URL,
): URL | null {
  if (
    specifier.startsWith('/') || specifier.startsWith('./') ||
    specifier.startsWith('../')
  ) {
    return createURL(specifier, baseURL);
  }

  return createURL(specifier);
};

const normalizeSpecifierKey = function (
  specifierKey: string,
  baseURL: URL,
  warnings: WarningsHandler,
): string | null {
  if (specifierKey === '') {
    warnings.push({ text: 'Import map specifier key is empty' });
    return null;
  }
  return resolveURLLikeModuleSpecifier(specifierKey, baseURL)?.href ??
    specifierKey;
};

const getVerbosity = function (specifier: string): number {
  const split = specifier.split('/');
  return split[split.length - 1] === '' ? split.length - 1 : split.length;
};

const sortAndNormalizeModuleSpecifierMap = function (
  map: Record<string, string>,
  baseURL: URL,
  warnings: WarningsHandler,
): ModuleSpecifierMapItem[] {
  const result: ModuleSpecifierMapItem[] = [];

  for (const [key, value] of Object.entries(map)) {
    const normalizedKey = normalizeSpecifierKey(key, baseURL, warnings);
    if (normalizedKey === null) {
      warnings.push({
        text: `Import map module specifier key ${key} is ignored.`,
      });
      continue;
    }
    const verbosity = getVerbosity(normalizedKey);

    const addressURL = resolveURLLikeModuleSpecifier(value, baseURL);
    if (addressURL === null) {
      warnings.push({
        text:
          `Import map module specifier value ${value} for ${key} is invalid.`,
      });
      result.push({ key: normalizedKey, value: null, verbosity });
      continue;
    }

    if (key.endsWith('/') && !addressURL.href.endsWith('/')) {
      warnings.push({
        text:
          `Import map key ${key} ends with "/" but the relevant URL ${addressURL.href} does not ends with "/".`,
      });
      result.push({ key: normalizedKey, value: null, verbosity });
      continue;
    }

    result.push({
      key: normalizedKey,
      value: addressURL,
      verbosity,
    });
  }

  result.sort((a, b) => b.verbosity - a.verbosity);

  return result;
};

const sortAndNormalizeScopes = function (
  scopes: { [key: string]: Record<string, string> },
  baseURL: URL,
  warnings: WarningsHandler,
): ImportMapScopeItem[] {
  const result: ImportMapScopeItem[] = [];

  for (const [scopePrefix, imports] of Object.entries(scopes)) {
    try {
      const scopePrefixURL = new URL(scopePrefix, baseURL);
      result.push({
        prefix: scopePrefixURL.href,
        imports: sortAndNormalizeModuleSpecifierMap(imports, baseURL, warnings),
        verbosity: getVerbosity(scopePrefixURL.href),
      });
    } catch {
      warnings.push({
        text: `Import map scope prefix ${scopePrefix} is ignored.`,
      });
      continue;
    }
  }

  result.sort((a, b) => b.verbosity - a.verbosity);

  return result;
};

const resolveImportsMatch = function (
  normalizedSpecifier: string,
  specifierURL: URL | null,
  specifierMap: ModuleSpecifierMapItem[],
): URL | null {
  for (const mapItem of specifierMap) {
    const specifierKey = mapItem.key;
    const resolutionResult = mapItem.value;

    if (specifierKey === normalizedSpecifier) {
      if (resolutionResult === null) {
        throw TypeError(
          `Cannot resolve ${specifierKey}, the resolution result is null for some reason.`,
        );
      }
      return resolutionResult;
    }
    if (
      specifierKey.endsWith('/') &&
      normalizedSpecifier.startsWith(specifierKey) &&
      (specifierURL === null || isSpecialURL(specifierURL))
    ) {
      if (resolutionResult === null) {
        throw TypeError(
          `Cannot resolve ${specifierKey}, the resolution result is null for some reason.`,
        );
      }
      const afterPrefix = normalizedSpecifier.slice(specifierKey.length);
      const url = createURL(afterPrefix, resolutionResult);
      if (url === null) {
        throw TypeError(
          `Cannot resolve ${normalizedSpecifier} on ${resolutionResult} for ${specifierKey}`,
        );
      }
      if (!url.href.startsWith(resolutionResult.href)) {
        throw TypeError(
          `Cannot resolve ${normalizedSpecifier} on ${resolutionResult} for ${specifierKey}; backtracking is not allowed.`,
        );
      }

      return url;
    }
  }

  return null;
};

/**
 * module specifier resolver bound to specific `ImportMap`
 *
 * @class ImportMapResolver
 */
class ImportMapResolver {
  imports: ModuleSpecifierMapItem[];
  scopes: ImportMapScopeItem[];
  baseURL: URL;
  warnings: WarningsHandler;

  constructor(importMap: ImportMap, baseURL: URL) {
    this.warnings = new WarningsHandler();
    this.imports = sortAndNormalizeModuleSpecifierMap(
      importMap.imports ?? {},
      baseURL,
      this.warnings,
    );
    this.scopes = sortAndNormalizeScopes(
      importMap.scopes ?? {},
      baseURL,
      this.warnings,
    );
    this.baseURL = baseURL;
  }

  /**
   * resolves module specifier into module `URL`
   *
   * @param {string} moduleSpecifier
   * @param {URL} importer
   * @return {*}  {(URL | null)}
   * @memberof ImportMapResolver
   */
  resolve(
    moduleSpecifier: string,
    importer: URL,
    noSpecifierItself = false,
  ): URL | null {
    const baseURLString = importer?.href ?? this.baseURL.href;
    const specifierURL = resolveURLLikeModuleSpecifier(
      moduleSpecifier,
      this.baseURL,
    );
    const normalizedSpecifier = specifierURL?.href ?? moduleSpecifier;

    for (const scope of this.scopes) {
      const isPrefix = scope.prefix.endsWith('/') &&
        baseURLString.startsWith(scope.prefix);
      if (scope.prefix === baseURLString || isPrefix) {
        const scopeImportsMatch = resolveImportsMatch(
          normalizedSpecifier,
          specifierURL,
          scope.imports,
        );
        if (scopeImportsMatch !== null) {
          return scopeImportsMatch;
        }
      }
    }

    const importsMatch = resolveImportsMatch(
      normalizedSpecifier,
      specifierURL,
      this.imports,
    );
    if (importsMatch !== null) {
      return importsMatch;
    }

    return noSpecifierItself ? null : specifierURL;
  }
}

export type { ImportMap };
export default ImportMapResolver;
