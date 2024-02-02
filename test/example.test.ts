// NOTE
// This test does only check differences between
// bundled and un-bundled script outputs.
// You MUST check whether the output is correct by yourself.

import { assertEquals } from 'assert';
import { path } from '../deps.ts';
import examples from '../example/examples.json' assert { type: 'json' };

const executeDenoTask = function(cwd: string, taskName: string, ...args: string[]): Promise<Deno.CommandOutput> {
  const process = new Deno.Command(Deno.execPath(), {
    args: ['task', taskName, ...args],
    cwd,
    stdin: "null",
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  return process.output().then((output) => new Promise<typeof output>((resolve, reject) => {
    if(output.success) {
      resolve(output);
    } else {
      reject(output);
    }
  }));
}

Deno.test("examples", async (testContext) => {
  const decoder = new TextDecoder();

  for(const [exampleName, exampleSettings] of Object.entries(examples)) {
    const examplePath = path.resolve('example', exampleName);
    await testContext.step(exampleName, async () => {
      await executeDenoTask(examplePath, 'clean')
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

      if(exampleSettings.type !== 'simple') {
        return;
      }

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
    });
  }
});
