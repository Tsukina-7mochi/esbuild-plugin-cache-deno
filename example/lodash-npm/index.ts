import _ from 'lodash';

console.log(_.merge(
  { a: { b: 0 } },
  { a: { c: 1 }, d: 2 },
));
