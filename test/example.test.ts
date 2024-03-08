// NOTE
// This test does only check differences between
// bundled and un-bundled script outputs.
// You MUST check whether the output is correct by yourself.

import { assertEquals } from 'assert';
import { path } from '../deps.ts';

const decoder = new TextDecoder();

const executeDenoTask = function(cwd: string, taskName: string, ...args: string[]): Promise<Deno.CommandOutput> {
  const process = new Deno.Command(Deno.execPath(), {
    args: ['task', taskName, ...args],
    cwd,
    stdin: 'null',
    stdout: 'piped',
    stderr: 'piped',
  }).spawn();

  return process.output().then((output) => new Promise<typeof output>((resolve, reject) => {
    if(output.success) {
      resolve(output);
    } else {
      reject(output);
    }
  }));
}

const buildExample = async function(exampleName: string) {
  const examplePath = path.resolve('example', exampleName);

  await executeDenoTask(examplePath, 'clean')
    .catch((output) => {
      const stdout = decoder.decode(output.stdout);
      const stderr = decoder.decode(output.stderr);
      throw Error(`Clean process failed with:\n Error ${stdout}\n Output ${stderr}`);
    });

  await executeDenoTask(examplePath, 'cache')
    .catch((output) => {
      const stdout = decoder.decode(output.stdout);
      const stderr = decoder.decode(output.stderr);
      throw Error(`Clean process failed with:\n Error ${stdout}\n Output ${stderr}`);
    });

  await executeDenoTask(examplePath, 'build')
    .catch((output) => {
      const stdout = decoder.decode(output.stdout);
      const stderr = decoder.decode(output.stderr);
      throw Error(`Build process failed with:\n Error ${stdout}\n Output ${stderr}`);
    });
}

const compareExampleOutput  = async function(exampleName: string) {
  const examplePath = path.resolve('example', exampleName);

  const runRawOutput = await executeDenoTask(examplePath, 'run:raw')
    .catch((output) => {
      const stdout = decoder.decode(output.stdout);
      const stderr = decoder.decode(output.stderr);
      throw Error(`Execution (raw) process failed with:\n Error ${stdout}\n Output ${stderr}`);
    });
  const runRawStdout = decoder.decode(runRawOutput.stdout);

  const runBundleOutput = await executeDenoTask(examplePath, 'run:bundle')
    .catch((output) => {
      const stdout = decoder.decode(output.stdout);
      const stderr = decoder.decode(output.stderr);
      throw Error(`Execution (bundle) process failed with:\n Error ${stdout}\n Output ${stderr}`);
    });
  const runBundleStdout = decoder.decode(runBundleOutput.stdout);

  assertEquals(runRawStdout, runBundleStdout);
}

const buildTestOf = function(testContext: Deno.TestContext) {
  return async function(exampleName: string) {
    await testContext.step(exampleName, async () => {
      await buildExample(exampleName);
    });
  }
}

const buildAndCompareTestOf = function(testContext: Deno.TestContext) {
  return async function(exampleName: string) {
    await testContext.step(exampleName, async () => {
      await buildExample(exampleName);
      await compareExampleOutput(exampleName);
    });
  }
}

Deno.test('examples', async (testContext) => {
  const buildTest = buildTestOf(testContext);
  const buildAndCompareTest = buildAndCompareTestOf(testContext);

  await buildAndCompareTest('ignore-modules');
  await buildAndCompareTest('import-map');
  await buildTest('lit-esmsh');
  await buildTest('lit-npm');
  await buildAndCompareTest('lodash-jsdelivr');
  await buildAndCompareTest('lodash-npm');
  await buildTest('preact-esmsh');
  await buildTest('preact-npm');
  await buildTest('react-esmsh');
  await buildTest('react-npm');
});
