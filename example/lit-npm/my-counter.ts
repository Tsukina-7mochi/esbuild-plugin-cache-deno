import { html, LitElement } from 'lit';
// decorators are not currently supported by esbuild
// import { customElement, property } from 'lit/decorators.js';

export class MyCounter extends LitElement {
  static properties = {
    count: { type: Number },
  };

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
