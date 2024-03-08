import { h, render } from 'preact';
import Counter from './counter.tsx';

globalThis.addEventListener('DOMContentLoaded', () => {
  const element = h(Counter, null);
  render(element, document.getElementById('root')!);
});
