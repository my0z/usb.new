import { html } from '../lib/html.js';
import { layout } from './layout.js';
import { cardGrid } from './components.js';

export function listPage({ eyebrow, title, description, items, canonical, active, empty = '아직 등록된 글이 없다.' }) {
  const body = html`<div class="shell">
    <header class="page-head">
      <p class="eyebrow">${eyebrow}</p>
      <h1 class="page-title">${title}</h1>
      <p class="page-desc">${description}</p>
    </header>
    ${items.length ? cardGrid(items) : html`<p class="empty">${empty}</p>`}
  </div>`;

  return layout({ title, description, canonical, active, body });
}
