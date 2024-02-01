import examples from '../example/examples.json' assert { type: 'json' };
import { Hono } from 'hono';
import { serveStatic } from 'hono/middleware.ts';
import { path } from '../deps.ts';

const exampleNames = Object.entries(examples)
  .filter(([_, value]) => value.type === 'serve')
  .map(([key]) => key);
const decoder = new TextDecoder();
const port = 8080;

const stdinIter = Deno.stdin.readable[Symbol.asyncIterator]();
for (const exampleName of exampleNames) {
  const examplePath = path.join('example', exampleName);
  const buildOutput = await new Deno.Command(
    Deno.execPath(),
    {
      cwd: examplePath,
      args: ['task', 'build'],
    },
  ).output();
  if (!buildOutput.success) {
    console.error(`Failed to build ${exampleName} due to following error:`);
    await Deno.stderr.write(buildOutput.stdout);

    console.log(`Skipping ${exampleName}`);
    continue;
  }

  console.log(`Serving ${exampleName}`);

  const app = new Hono();
  app.use('/*', serveStatic({ root: examplePath }));

  const abortController = new AbortController();
  const server = Deno.serve(
    { port, signal: abortController.signal },
    app.fetch,
  );
  console.log('Hit Enter to proceed.');
  await stdinIter.next();

  abortController.abort();
  await server.shutdown();
}
