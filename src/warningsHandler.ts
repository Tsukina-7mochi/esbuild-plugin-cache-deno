import { esbuild } from '../deps.ts';

export default class WarningsHandler {
  warnings: esbuild.PartialMessage[];

  [Symbol.iterator]() {
    return this.warnings.values();
  }

  constructor() {
    this.warnings = [];
  }

  clear(): void {
    this.warnings = [];
  }

  push(...warnings: esbuild.PartialMessage[]): void {
    this.warnings.push(...warnings);
  }
}
