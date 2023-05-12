/**
 * Returns DENO_DIR (Deno's cache directory).
 * Requires `--allow-run` permission.
 */
const getDenoDir = async () => {
  const textDecoder = new TextDecoder();
  const command = new Deno.Command(Deno.execPath(), {
    args: ['info'],
  });
  const { code, stdout } = await command.output();
  if(code !== 0) {
    throw Error('Failed to get deno cache directory');
  }
  const stdoutText = textDecoder.decode(stdout)
    .replace(/\x1b\[([0-9]{1,3}(;[0-9]{1,2};?)?)?[mGK]/g, '');
  const firstLine = stdoutText.split('\n')[0];
  return firstLine.slice(firstLine.lastIndexOf(':') + 2).trim();
}

export { getDenoDir };
