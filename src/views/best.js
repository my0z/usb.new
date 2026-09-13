import { html } from '../lib/html.js';
import { layout } from './layout.js';
import { productBlock, postUrl, imgProxy } from './components.js';
import { categoryOfPost } from '../data/categories.js';

/** "○○ 추천 TOP 10" 모음 페이지. KV 에 있는 글의 주인공 제품을 키워드별로 묶어 LLM 없이 만든다. */
const MIN_ITEMS = 3;
const MAX_ITEMS = 10;
const nameKey = (n) => String(n ?? '').toLowerCase().replace(/\s+/g, '').slice(0, 18);
export const bestUrl = (keyword) => `/best/${encodeURIComponent(keyword)}`;
const monthLabel = () => new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', timeZone: 'Asia/Seoul' });

/** 키워드별 그룹. views 는 path → 30일 방문 수. 최근 글일수록 · 많이 본 글일수록 앞에 온다. 같은 제품은 한 번만. */
export function bestGroups(summaries, views = new Map()) {
  const by = new Map();
  for (const s of summaries) {
    const p = s.products?.[0];
    const keyword = String(s.keyword ?? '').trim();
    // 옛 글엔 쿠팡 대분류(가전디지털 · 스포츠레저)가 keyword 로 들어간 게 있어 카테고리에 매핑되는 키워드만 쓴다
    if (!keyword || !p?.name || !(Number(p.price) > 0) || !categoryOfPost(s)) continue;
    if (!by.has(keyword)) by.set(keyword, []);
    by.get(keyword).push({ ...s, views: views.get(postUrl(s)) ?? 0 });
  }
  const groups = [];
  for (const [keyword, list] of by) {
    const seen = new Set();
    const items = list
      .sort((a, b) => b.views - a.views || String(b.createdAt).localeCompare(String(a.createdAt)))
      .filter((s) => {
        const k = nameKey(s.products[0].name);
        return seen.has(k) ? false : seen.add(k);
      })
      .slice(0, MAX_ITEMS);
    if (items.length >= MIN_ITEMS) groups.push({ keyword, items, category: categoryOfPost(items[0]) });
  }
  return groups.sort((a, b) => b.items.length - a.items.length || a.keyword.localeCompare(b.keyword, 'ko'));
}

export function bestIndexPage({ canonical, groups }) {
  const body = html`<div class="shell">
    <header class="page-head reveal">
      <p class="eyebrow">추천</p>
      <h1 class="page-title">키워드별 추천 TOP</h1>
      <p class="page-desc">리뷰한 제품을 키워드별로 모아 많이 본 순서와 최신 순서로 정리한다. 가격은 게재 시점 기준이다.</p>
      <span class="page-count">${groups.length}<small>개</small></span>
    </header>
    <div class="catgrid">
      ${groups.map(
        (g, i) => html`<a class="catcard reveal" href="${bestUrl(g.keyword)}" style="--i:${i}">
          <span class="catcard__num">${String(i + 1).padStart(2, '0')}</span>
          <span class="catcard__name">${g.keyword} 추천</span>
          <span class="catcard__kw">${g.items[0].products[0].name}</span>
          <span class="catcard__count">${g.items.length}<small>개</small></span>
        </a>`,
      )}
    </div>
  </div>`;
  return layout({ title: '키워드별 추천 TOP', description: '리뷰한 제품을 키워드별 TOP 으로 모았다.', canonical, active: 'best', body });
}

export function bestPage({ canonical, group }) {
  const { keyword, items, category } = group;
  const title = `${keyword} 추천 TOP ${items.length}`;
  const description = `${monthLabel()} 기준 ${keyword} 추천 ${items.length}선. ${items[0].products[0].name} 등 실제 쿠팡 가격과 리뷰를 함께 본다.`;
  const origin = new URL(canonical).origin;
  const body = html`<div class="shell">
    <nav class="crumbs" aria-label="현재 위치"><a href="/">홈</a> › <a href="/best">추천</a> › <span>${keyword}</span></nav>
    <header class="page-head reveal">
      <p class="eyebrow">추천 · ${monthLabel()}</p>
      <h1 class="page-title">${title}</h1>
      <p class="page-desc">${keyword} 리뷰에서 다룬 제품을 많이 본 순서와 최신 순서로 골랐다. 가격은 리뷰 게재 시점 쿠팡 가격이며 지금 가격은 버튼으로 확인한다.</p>
      <span class="page-count">${items.length}<small>개</small></span>
    </header>
    <ol class="best">
      ${items.map(
        (s, i) => html`<li class="best__item reveal" style="--i:${i}">
          ${productBlock(s.products[0], s.slug, { rank: i + 1, top: i === 0 })}
          <a class="best__review" href="${postUrl(s)}">리뷰 읽기 · ${s.title}</a>
        </li>`,
      )}
    </ol>
    <p class="disclosure">이 페이지의 링크는 쿠팡 파트너스 활동의 일환으로 수수료를 제공받을 수 있다. 순위는 조회수와 최신성 기준이며 광고 순위가 아니다.</p>
  </div>`;
  const jsonLd = [
    {
      '@type': 'ItemList',
      name: title,
      description,
      url: canonical,
      numberOfItems: items.length,
      itemListElement: items.map((s, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Product',
          name: s.products[0].name,
          image: `${origin}${imgProxy(s.products[0].image)}`,
          url: `${origin}${postUrl(s)}`,
          offers: { '@type': 'Offer', price: Number(s.products[0].price), priceCurrency: 'KRW', availability: 'https://schema.org/InStock' },
        },
      })),
    },
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: '홈', item: `${origin}/` }, { '@type': 'ListItem', position: 2, name: '추천', item: `${origin}/best` }, { '@type': 'ListItem', position: 3, name: title, item: canonical }] },
  ];
  return layout({ title, description, canonical, active: category?.slug ?? 'best', body, jsonLd, ogImage: `${origin}${imgProxy(items[0].products[0].image)}` });
}
