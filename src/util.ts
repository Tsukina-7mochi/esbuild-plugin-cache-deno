/**
 * Creates URL or returns null
 *
 * @param {(string | URL)} url
 * @param {(string | URL)} [base]
 * @return {*}  {(URL | null)}
 */
const createURL = function(url: string | URL, base?: string | URL): URL | null {
  try {
    return new URL(url, base);
  } catch {
    return null;
  }
}

/**
 * Returns true if `url` is special; a url with specific scheme
 * @see: https://url.spec.whatwg.org/#url-miscellaneous
 *
 * @param {URL} url
 * @return {*}  {boolean}
 */
const isSpecialURL = function (url: URL): boolean {
  switch (url.protocol) {
    case 'ftp:':
    case 'file:':
    case 'http:':
    case 'https:':
    case 'ws:':
    case 'wss:':
      return true;
    default:
      return false;
  }
};

export { createURL, isSpecialURL };
