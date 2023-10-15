/**
 * Returns true if `target` `URL` is the descendant of `base` `URL` on pathname
 *
 * @param {URL} base
 * @param {URL} target
 * @param {boolean} [checkOrigin=false] Requires both `base` and `target` has the same origin
 * @return {*}  {boolean}
 */
const urlIsDescendant = function (base: URL, target: URL, checkOrigin = false): boolean {
  if(checkOrigin) {
    if(base.origin !== target.origin) {
      return false;
    }
  }

  return target.pathname.startsWith(base.pathname);
};

export { urlIsDescendant };
