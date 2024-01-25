import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import Counter from "./counter.tsx";

globalThis.addEventListener('DOMContentLoaded', () => {
  const element = React.createElement(Counter);
  ReactDOM.createRoot(document.getElementById('root')!).render(element);
});
