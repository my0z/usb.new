import { html } from '../lib/html.js';
import { layout } from './layout.js';
import { postUrl } from './components.js';
import { categories, categoryOfPost } from '../data/categories.js';

/** 운영자용 통계. robots 에서 막고 링크도 두지 않는다. */
export function statsPage({ canonical, summaries }) {
  const byCat = new Map();
  const byDay = new Map();
  let products = 0;
  for (const s of summaries) {
    const c = categoryOfPost(s)?.name ?? '미분류';
    byCat.set(c, (byCat.get(c) ?? 0) + 1);
    const d = String(s.createdAt).slice(0, 10);
    byDay.set(d, (byDay.get(d) ?? 0) + 1);
    products += s.productCount ?? s.products?.length ?? 0;
  }
  const days = [...byDay].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14);
  const cats = [...byCat].sort((a, b) => b[1] - a[1]);
  const gen = summaries.filter((s) => /^[a-z0-9]{5}$/.test(s.slug)).length;
  const tiles = [
    ['발행한 글', summaries.length, '건'],
    ['발행기 글', gen, '건'],
    ['다룬 제품', products, '개'],
    ['활성 카테고리', cats.filter(([n]) => n !== '미분류').length, '개'],
  ];
  const body = html`<div class="shell">
    <header class="page-head reveal">
      <p class="eyebrow">운영 통계</p>
      <h1 class="page-title">발행 현황</h1>
      <p class="page-desc">KV 에 있는 글 기준. 이 페이지는 색인되지 않는다.</p>
    </header>
    <section class="stats stats--page reveal">
      ${tiles.map(([l, v, u]) => html`<div class="stat"><span class="stat__value">${v}<small>${u}</small></span><span class="stat__label">${l}</span></div>`)}
    </section>
    <div class="stats__grid">
      <section class="specs reveal"><div class="specs__head"><h2 class="specs__title">최근 14일 발행</h2></div>
        <table><tbody>${days.map(([d, n]) => html`<tr><th scope="row">${d}</th><td>${n}건</td></tr>`)}</tbody></table>
      </section>
      <section class="specs reveal"><div class="specs__head"><h2 class="specs__title">카테고리별</h2></div>
        <table><tbody>${cats.map(([c, n]) => html`<tr><th scope="row">${c}</th><td>${n}건</td></tr>`)}</tbody></table>
      </section>
    </div>
    <section class="specs reveal"><div class="specs__head"><h2 class="specs__title">최근 발행 20건</h2></div>
      <table><tbody>${summaries.slice(0, 20).map((s) => html`<tr><th scope="row"><a href="${postUrl(s)}">${s.title}</a></th><td>${String(s.createdAt).slice(0, 16).replace('T', ' ')}</td></tr>`)}</tbody></table>
    </section>
  </div>`;
  return layout({ title: '발행 현황', description: '운영 통계', canonical, active: '', body });
}
