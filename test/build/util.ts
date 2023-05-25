const cachedTextDecoder = new TextDecoder();

const getDenoCacheDir = async () => {
  const command = new Deno.Command(Deno.execPath(), {
    args: ['info'],
  });
  const { code, stdout } = await command.output();
  if(code !== 0) {
    throw Error('Failed to get deno cache directory');
  }
  const stdoutText = cachedTextDecoder.decode(stdout)
    .replace(/\x1b\[([0-9]{1,3}(;[0-9]{1,2};?)?)?[mGK]/g, '');
  const firstLine = stdoutText.split('\n')[0];
  return firstLine.slice(firstLine.lastIndexOf(':') + 2).trim();
}

const denoRunScript = async (path: string, args: string[]) => {
  const command = new Deno.Command(Deno.execPath(), {
    args: ['run', ...args, path],
  });
  const { code, stdout } = await command.output();
  if(code !== 0) {
    throw Error(`failed to execute ${path} with arguments [${args.join(', ')}]`);
  }

  const stdoutText = cachedTextDecoder.decode(stdout);
  return stdoutText;
}

export {
  getDenoCacheDir,
  denoRunScript,
};
