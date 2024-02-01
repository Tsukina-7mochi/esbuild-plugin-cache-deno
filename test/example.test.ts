// NOTE
// This test does only check differences between
// bundled and un-bundled script outputs.
// You MUST check whether the output is correct by yourself.

import { assertEquals } from 'assert';
import { path } from '../deps.ts';
import examples from '../example/examples.json' assert { type: 'json' };

const exampleNames = Object.entries(examples)
  .filter(([_, value]) => value.type === 'simple')
  .map(([key]) => key);

const executeDenoTask = async function(cwd: string, taskName: string, ...args: string[]) {
  const process = new Deno.Command(Deno.execPath(), {
    args: ['task', taskName, ...args],
    cwd,
    stdin: "null",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  return await process.output();
}

Deno.test("examples", async (testContext) => {
  const decoder = new TextDecoder();

  for(const exampleName of exampleNames) {
    const examplePath = path.resolve('example', exampleName);
    await testContext.step(exampleName, async () => {
      const cleanOutput = await executeDenoTask(examplePath, 'clean');
      if(!cleanOutput.success) {
        const stdout = decoder.decode(cleanOutput.stdout);
        const stderr = decoder.decode(cleanOutput.stderr);
        throw Error(`Clean process failed with:\n Error ${stdout}\n Output ${stderr}`);
      }

      const buildOutput = await executeDenoTask(examplePath, 'build');
      if(!buildOutput.success) {
        const stdout = decoder.decode(buildOutput.stdout);
        const stderr = decoder.decode(buildOutput.stderr);
        throw Error(`Build process failed with:\n Error ${stdout}\n Output ${stderr}`);
      }

      const runRawOutput = await executeDenoTask(examplePath, 'run:raw');
      const runRawStdout = decoder.decode(runRawOutput.stdout);
      if(!runRawOutput.success) {
        const stderr = decoder.decode(runRawOutput.stderr);
        throw Error(`Build process failed with:\n Error ${runRawStdout}\n Output ${stderr}`);
      }

      const runBundleOutput = await executeDenoTask(examplePath, 'run:bundle');
      const runBundleStdout = decoder.decode(runBundleOutput.stdout);
      if(!runBundleOutput.success) {
        const stderr = decoder.decode(runBundleOutput.stderr);
        throw Error(`Build process failed with:\n Error ${runBundleStdout}\n Output ${stderr}`);
      }

      assertEquals(runRawStdout, runBundleStdout);
    });
  }
});
