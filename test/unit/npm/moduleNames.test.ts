import { assertEquals } from 'assert';
import { decomposeNPMModuleURL } from '../../../src/npm/moduleName.ts';

Deno.test('decomposeNPMModuleURL', async (testContext) => {
  const testDecomposeNPMModuleURL = function(
    moduleSpecifier: string,
    expected: ReturnType<typeof decomposeNPMModuleURL>,
  ) {
    return testContext.step(moduleSpecifier, () => {
      const actual = decomposeNPMModuleURL(moduleSpecifier);

      assertEquals(actual, expected);
    });
  }

  await testDecomposeNPMModuleURL('npm:react', {
    name: 'react',
    version: undefined,
    fullName: 'react',
    path: '/',
  });

  await testDecomposeNPMModuleURL('npm:/react', {
    name: 'react',
    version: undefined,
    fullName: 'react',
    path: '/',
  });

  await testDecomposeNPMModuleURL('npm:react/', {
    name: 'react',
    version: undefined,
    fullName: 'react',
    path: '/',
  });

  await testDecomposeNPMModuleURL('npm:/react/', {
    name: 'react',
    version: undefined,
    fullName: 'react',
    path: '/',
  });

  await testDecomposeNPMModuleURL('npm:react/index.js', {
    name: 'react',
    version: undefined,
    fullName: 'react',
    path: '/index.js',
  });

  await testDecomposeNPMModuleURL('npm:/react/index.js', {
    name: 'react',
    version: undefined,
    fullName: 'react',
    path: '/index.js',
  });

  await testDecomposeNPMModuleURL('npm:react@1.0.0', {
    name: 'react',
    version: '1.0.0',
    fullName: 'react@1.0.0',
    path: '/',
  });

  await testDecomposeNPMModuleURL('npm:/react@1.0.0/index.js', {
    name: 'react',
    version: '1.0.0',
    fullName: 'react@1.0.0',
    path: '/index.js',
  });

  await testDecomposeNPMModuleURL('npm:@types/react/index.js', {
    name: '@types/react',
    version: undefined,
    fullName: '@types/react',
    path: '/index.js',
  });

  await testDecomposeNPMModuleURL('npm:@types/react@1.0.0/index.js', {
    name: '@types/react',
    version: '1.0.0',
    fullName: '@types/react@1.0.0',
    path: '/index.js',
  });

  await testDecomposeNPMModuleURL('npm:/@types/react/index.js', {
    name: '@types/react',
    version: undefined,
    fullName: '@types/react',
    path: '/index.js',
  });

  await testDecomposeNPMModuleURL('npm:/@types/react@1.0.0/index.js', {
    name: '@types/react',
    version: '1.0.0',
    fullName: '@types/react@1.0.0',
    path: '/index.js',
  });

  await testDecomposeNPMModuleURL('npm:react-dom@18.2.0_react@18.2.0/index.js', {
    name: 'react-dom',
    version: '18.2.0_react@18.2.0',
    fullName: 'react-dom@18.2.0_react@18.2.0',
    path: '/index.js',
  });
});
