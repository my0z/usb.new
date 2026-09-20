import { html } from '../lib/html.js';
import { layout } from './layout.js';
import { cardGrid, imgProxy, imgSrc, metaLine, postUrl, priceBadge, sectionHead, won, ICON_ARROW, ICON_ROCKET } from './components.js';
import { categories, categoryOfPost } from '../data/categories.js';
import { excerpt } from '../data/store.js';

const HERO_FALLBACK = '/assets/hero-default.svg';

function hero(p) {
  const first = p.products?.[0];
  const cover = first?.image ? imgProxy(first.image) : HERO_FALLBACK;
  const cat = categoryOfPost(p);
  const summary = p.tldr || p.metaDescription || excerpt(p.intro, 160);
  return html`<section class="hero" aria-labelledby="hero-title">
    <div class="hero__bg" aria-hidden="true">
      <img src="${cover}" alt="" width="600" height="600" fetchpriority="high" />
    </div>
    <div class="hero__inner shell">
      <div class="hero__copy">
        <p class="hero__eyebrow"><span class="dot"></span>오늘의 커버 스토리 · ${cat?.name ?? p.keyword}</p>
        <h1 class="hero__title" id="hero-title">
          <a href="${postUrl(p)}">${p.title}</a>
        </h1>
        ${first ? html`<p class="hero__sub">${first.name}</p>` : ''}
        <blockquote class="hero__verdict">${summary}</blockquote>
        <div class="hero__foot">
          <a class="btn btn--primary" href="${postUrl(p)}">글 읽기 ${ICON_ARROW}</a>
          ${metaLine(p)}
        </div>
      </div>
      <a class="hero__figure hero__figure--product" href="${postUrl(p)}" aria-label="${p.title} 열기">
        <img src="${cover}" alt="${first?.altText || first?.name || p.title}" width="600" height="600" fetchpriority="high" />
        ${first ? html`<span class="hero__pricecard">
          <small>${first.isRocket ? html`${ICON_ROCKET} 로켓배송` : '쿠팡 최저가'}</small>
          <b>${won(first.price)}</b>
        </span>` : ''}
        <span class="hero__tags">
          <i>${p.keyword}</i>
          ${p.products?.length > 1 ? html`<i>${p.products.length}개 제품 비교</i>` : ''}
        </span>
      </a>
    </div>
    <p class="hero__ghost" aria-hidden="true">COVER STORY</p>
  </section>`;
}

function popularRail(list) {
  if (!list.length) return '';
  return html`<section class="popular reveal" aria-labelledby="popular-title">
    <div class="popular__head">
      <p class="eyebrow">지금 많이 보는 글</p>
      <h2 class="popular__title" id="popular-title">인기 순위</h2>
    </div>
    <ol class="popular__list">
      ${list.map(
        (p, i) => html`<li class="popular__item">
          <a href="${postUrl(p)}">
            <span class="popular__rank">${String(i + 1).padStart(2, '0')}</span>
            <span class="popular__thumb"><img ${imgSrc(p.products?.[0]?.image || HERO_FALLBACK, 120)} alt="" loading="lazy" width="120" height="120" /></span>
            <span class="popular__text">
              <b>${p.title}</b>
              <small>${p.keyword} · 조회 ${Number(p.views).toLocaleString('ko-KR')}</small>
            </span>
            ${p.products?.[0] ? priceBadge(p.products[0]) : ''}
          </a>
        </li>`,
      )}
    </ol>
  </section>`;
}

export function homePage({ canonical, summaries, popular }) {
  const featured = summaries[0];
  const rest = summaries.slice(1);
  const latest = rest.slice(0, 5);
  const more = rest.slice(5, 14);
  const counts = new Map();
  for (const s of summaries) {
    const c = categoryOfPost(s);
    if (c) counts.set(c.slug, (counts.get(c.slug) ?? 0) + 1);
  }
  const activeCats = categories.filter((c) => counts.get(c.slug)).sort((a, b) => counts.get(b.slug) - counts.get(a.slug));

  const body = html`<div class="shell">
    ${sectionHead('01', '최신 글', '새로 발행한 비교와 리뷰', '/posts')}
    ${cardGrid(latest, { bento: true, numbered: true, eagerFirst: false })}

    ${popularRail(popular)}

    <section class="rail reveal" aria-labelledby="rail-title">
      <div class="rail__head">
        <h2 class="rail__title" id="rail-title">카테고리로 보기</h2>
        <p class="rail__desc">관심 있는 장비군만 골라 읽는다.</p>
      </div>
      <div class="rail__items">
        ${activeCats.map(
          (c) => html`<a class="chip" href="/category/${c.slug}"><span>${c.name}</span><small>${counts.get(c.slug)}</small></a>`,
        )}
        <a class="chip chip--ghost" href="/categories"><span>전체 카테고리</span></a>
      </div>
    </section>

    ${more.length ? html`${sectionHead('02', '이어서 보기', '지난 글', '/posts')} ${cardGrid(more, { variant: 'compact', eagerFirst: false })}` : ''}
  </div>`;

  return layout({
    title: '',
    description: '실시간 쿠팡 가격 데이터를 바탕으로 전자기기 스펙과 가격을 비교하는 리뷰 매거진.',
    canonical,
    active: 'home',
    heroSlot: featured ? hero(featured) : null,
    preload: featured?.products?.[0]?.image ? imgProxy(featured.products[0].image) : null,
    tickerItems: summaries.slice(0, 8),
    body,
    jsonLd: [
      {
        '@type': 'WebSite',
        '@id': `${canonical}#website`,
        name: 'USB.KR',
        url: canonical,
        inLanguage: 'ko',
        description: '실시간 쿠팡 가격 데이터를 바탕으로 전자기기 스펙과 가격을 비교하는 리뷰 매거진.',
        publisher: { '@id': `${canonical}#org` },
        potentialAction: { '@type': 'SearchAction', target: `${new URL(canonical).origin}/search?q={query}`, 'query-input': 'required name=query' },
      },
      { '@type': 'Organization', '@id': `${canonical}#org`, name: 'USB.KR', url: canonical, logo: `${new URL(canonical).origin}/assets/favicon.svg` },
    ],
  });
}
