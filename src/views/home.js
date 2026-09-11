import { html, formatDate } from '../lib/html.js';
import { layout } from './layout.js';
import { cardGrid, scoreRing, sectionHead, metaLine, ICON_ARROW } from './components.js';
import { categories, categoryName, featuredReview, sortedReviews, reviews } from '../data/reviews.js';

const HERO_FALLBACK = '/assets/hero-default.svg';

function hero(review) {
  return html`<section class="hero" aria-labelledby="hero-title">
    <div class="hero__bg" aria-hidden="true">
      <img src="${review.cover ?? HERO_FALLBACK}" alt="" width="1600" height="900" fetchpriority="high" />
    </div>
    <div class="hero__inner shell">
      <div class="hero__copy">
        <p class="hero__eyebrow"><span class="dot"></span>이번 주 커버 스토리 · ${categoryName(review.category)}</p>
        <h1 class="hero__title" id="hero-title">
          <a href="/review/${review.slug}">${review.title}</a>
        </h1>
        <p class="hero__sub">${review.subtitle}</p>
        <blockquote class="hero__verdict">${review.verdict}</blockquote>
        <div class="hero__foot">
          <a class="btn btn--primary" href="/review/${review.slug}">리뷰 전문 읽기 ${ICON_ARROW}</a>
          ${metaLine(review)}
        </div>
      </div>
      <a class="hero__figure" href="/review/${review.slug}" aria-label="${review.title} 리뷰 열기">
        <img src="${review.cover ?? HERO_FALLBACK}" alt="${review.title} 대표 이미지" width="1600" height="900" fetchpriority="high" />
        <span class="hero__ring">${scoreRing(review.score, 128)}</span>
        <span class="hero__tags">${review.tags.map((t) => html`<i>${t}</i>`)}</span>
      </a>
    </div>
    <p class="hero__ghost" aria-hidden="true">COVER STORY</p>
  </section>`;
}

function stats() {
  const scored = reviews.filter((r) => r.score > 0);
  const avg = scored.reduce((s, r) => s + r.score, 0) / scored.length;
  const authors = new Set(reviews.map((r) => r.author)).size;
  const items = [
    ['측정 완료 제품', String(reviews.length), '건'],
    ['취급 카테고리', String(categories.length), '개'],
    ['평균 평점', avg.toFixed(1), '/ 10'],
    ['참여 에디터', String(authors), '명'],
  ];
  return html`<section class="stats reveal" aria-label="측정 현황">
    ${items.map(
      ([label, value, unit]) => html`<div class="stat">
        <span class="stat__value">${value}<small>${unit}</small></span>
        <span class="stat__label">${label}</span>
      </div>`,
    )}
  </section>`;
}

export function homePage({ canonical }) {
  const featured = featuredReview();
  const rest = sortedReviews().filter((r) => r.slug !== featured.slug);
  const latest = rest.slice(0, 5);
  const archive = rest.slice(5);

  const body = html`<div class="shell">
    ${stats()}

    ${sectionHead('01', '최신 리뷰', '새로 측정한 제품들', '/reviews')}
    ${cardGrid(latest, { bento: true, numbered: true })}

    <section class="rail reveal" aria-labelledby="rail-title">
      <div class="rail__head">
        <h2 class="rail__title" id="rail-title">카테고리로 보기</h2>
        <p class="rail__desc">관심 있는 장비군만 골라 읽는다.</p>
      </div>
      <div class="rail__items">
        ${categories.map(
          (c) => html`<a class="chip" href="/category/${c.slug}"><span>${c.name}</span><small>${reviews.filter((r) => r.category === c.slug).length}</small></a>`,
        )}
      </div>
    </section>

    ${archive.length
      ? html`${sectionHead('02', '아카이브', '지난 기사', '/reviews')} ${cardGrid(archive, { variant: 'compact' })}`
      : ''}
  </div>`;

  return layout({
    title: '',
    description: 'USB 메모리와 포터블 SSD 와 허브와 케이블을 직접 사서 측정하는 리뷰 매거진.',
    canonical,
    active: 'home',
    heroSlot: hero(featured),
    body,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'USB.KR',
      url: canonical,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${new URL(canonical).origin}/search?q={query}`,
        'query-input': 'required name=query',
      },
    },
  });
}
