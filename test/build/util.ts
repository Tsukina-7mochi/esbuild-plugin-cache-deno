const cachedTextDecoder = new TextDecoder();

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
  denoRunScript,
};
