import { css, html, LitElement } from 'lit';
// decorators are not currently supported by esbuild
// import { customElement, property } from 'lit/decorators.js';

export class MyCounter extends LitElement {
  static properties = {
    count: { type: Number },
  };
  static styles = css`
    button {
      padding: 1em;
      appearance: unset;
      font-style: unset;
      font-size: inherit;
      font-weight: bolder;
      background-color: transparent;
      color: inherit;
      border-radius: 0.5em;
      border: 2px solid white;
    }
    button:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }
    button:active {
      background-color: rgba(255, 255, 255, 0.2);
    }
  `;

  declare count: number;

  constructor() {
    super();
    this.count = 0;
  }

  private _increment() {
    this.count += 1;
  }

  render() {
    return html`
      <button @click=${this._increment}>Count: ${this.count}</button>
    `;
  }
}
customElements.define('my-counter', MyCounter);
