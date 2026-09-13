import { html } from '../lib/html.js';
import { layout } from './layout.js';
import { cardGrid, postUrl } from './components.js';
import { categories } from '../data/categories.js';
import { bestUrl } from './best.js';

export function listPage({ eyebrow, title, description, items, canonical, active, empty = '아직 등록된 글이 없다.', total = null, best = [] }) {
  const count = total ?? items.length;
  const body = html`<div class="shell">
    <header class="page-head reveal">
      <p class="eyebrow">${eyebrow}</p>
      <h1 class="page-title">${title}</h1>
      <p class="page-desc">${description}</p>
      <span class="page-count">${count}<small>건</small></span>
    </header>
    ${best.length ? html`<nav class="chips chips--best reveal" aria-label="추천 TOP">${best.map((g) => html`<a class="chip" href="${bestUrl(g.keyword)}">${g.keyword} 추천 TOP<small>${g.items.length}</small></a>`)}</nav>` : ''}
    ${items.length ? cardGrid(items, { numbered: true }) : html`<p class="empty">${empty}</p>`}
  </div>`;

  const origin = new URL(canonical).origin;
  const jsonLd = [
    {
      '@type': 'CollectionPage',
      name: title,
      description,
      url: canonical,
      inLanguage: 'ko',
      mainEntity: { '@type': 'ItemList', numberOfItems: count, itemListElement: items.slice(0, 30).map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.title, url: `${origin}${postUrl(p)}` })) },
    },
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: '홈', item: `${origin}/` }, { '@type': 'ListItem', position: 2, name: title, item: canonical }] },
  ];
  return layout({ title, description, canonical, active, body, jsonLd });
}

export function categoriesPage({ canonical, counts }) {
  const body = html`<div class="shell">
    <header class="page-head reveal">
      <p class="eyebrow">카테고리</p>
      <h1 class="page-title">전체 카테고리</h1>
      <p class="page-desc">키워드 기준으로 자동 분류된다. 글이 없는 카테고리는 흐리게 표시한다.</p>
      <span class="page-count">${categories.length}<small>개</small></span>
    </header>
    <div class="catgrid">
      ${categories.map(
        (c, i) => html`<a class="catcard reveal ${counts.get(c.slug) ? '' : 'is-empty'}" href="/category/${c.slug}" style="--i:${i}">
          <span class="catcard__num">${String(i + 1).padStart(2, '0')}</span>
          <span class="catcard__name">${c.name}</span>
          <span class="catcard__kw">${c.keywords.slice(0, 4).join(' · ')}</span>
          <span class="catcard__count">${counts.get(c.slug) ?? 0}<small>건</small></span>
        </a>`,
      )}
    </div>
  </div>`;
  return layout({ title: '전체 카테고리', description: 'USB.KR 의 모든 카테고리.', canonical, active: 'categories', body });
}
