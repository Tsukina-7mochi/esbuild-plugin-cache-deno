import { path, fs } from '../../deps.ts';

type PathEntry = {
  [key: string]: string | PathEntry;
};

const textEncoder = new TextEncoder();
const createTempFiles = async function(entry: PathEntry, root: string, clean = true): Promise<string> {
  if(clean) {
    await Deno.remove(root, { recursive: true });
    await fs.ensureDir(root);
  }

  for(const key in entry) {
    const item = entry[key];
    if(typeof item === 'string') {
      await Deno.writeFile(path.join(root, key), textEncoder.encode(item));
    } else {
      const pathName = path.join(root, key.replace('/', path.SEP));
      await fs.ensureDir(pathName);
      await createTempFiles(item, pathName, false);
    }
  }

  return root;
}

export type { PathEntry };
export { createTempFiles };
