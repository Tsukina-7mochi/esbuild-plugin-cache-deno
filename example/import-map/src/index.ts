import sayFoo from './foo.ts';
import sayFooRemote from 'https://example.com/foo/index.ts';

console.log('index.ts');
sayFoo();
sayFooRemote();
