# Example: Using Lit from npm registry

Using Lit from npm registry, mapping `lit` to npm module (see
`import_map.json`.) Note that esbuild compiles typescript decorators
(`experimentalDecorators`) into ES decorators, therefore compiled code can be
executed only with browsers that supports ES decorators.
