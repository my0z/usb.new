import { html } from '../lib/html.js';
import { layout } from './layout.js';
import { cardGrid } from './components.js';

export function listPage({ eyebrow, title, description, items, canonical, active, empty = '아직 등록된 글이 없다.' }) {
  const body = html`<div class="shell">
    <header class="page-head reveal">
      <p class="eyebrow">${eyebrow}</p>
      <h1 class="page-title">${title}</h1>
      <p class="page-desc">${description}</p>
      <span class="page-count">${items.length}<small>건</small></span>
    </header>
    ${items.length ? cardGrid(items, { numbered: true }) : html`<p class="empty">${empty}</p>`}
  </div>`;

  return layout({ title, description, canonical, active, body });
}
