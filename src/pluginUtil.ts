/**
 * Returns DENO_DIR (Deno's cache directory).
 * Requires `--allow-run` permission.
 */
const getDenoDir = async () => {
  const textDecoder = new TextDecoder();
  const command = new Deno.Command(Deno.execPath(), {
    args: ['info'],
    env: { NO_COLOR: 'true' },
  });
  const { success, stdout } = await command.output();
  if (!success) {
    throw Error('Failed to get deno cache directory');
  }

  const stdoutText = textDecoder.decode(stdout);
  const firstLine = stdoutText.split('\n')[0];
  return firstLine.slice(firstLine.lastIndexOf(':') + 2).trim();
};

export { getDenoDir };
