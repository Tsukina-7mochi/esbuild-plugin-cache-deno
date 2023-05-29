const urlHashAndSearchRemoved = function(url: URL) {
  const url_ = new URL(url);
  url_.hash = '';
  url_.search = '';
  return url_;
}

const urlIsDescendant = function(base: URL, target: URL) {
  const base_ = urlHashAndSearchRemoved(base);
  const target_ = urlHashAndSearchRemoved(target);
  return target_.href.startsWith(base_.href);
}

export {
  urlHashAndSearchRemoved,
  urlIsDescendant,
};
