import { fs } from '../../deps.ts';
import toCacheURL from './toCacheURL.ts';

/**
 * returns the file: `url` if exists, otherwise null
 *
 * @param {URL} url
 * @param {URL} cacheRoot
 * @return {*}  {(Promise<URL | null>)}
 */
const testCacheFileExistence = async function (
  url: URL,
  cacheRoot: URL,
): Promise<URL | null> {
  if (await fs.exists(toCacheURL(url, cacheRoot), { isFile: true })) {
    return url;
  }
  return null;
};

export default testCacheFileExistence;
