import { html, formatDate } from '../lib/html.js';
import { layout } from './layout.js';
import { cardGrid, scoreBadge, sectionHead } from './components.js';
import { categories, categoryName, featuredReview, sortedReviews } from '../data/reviews.js';

const HERO_FALLBACK = '/assets/hero-default.svg';

function hero(review) {
  return html`<section class="hero" aria-labelledby="hero-title">
    <div class="hero__media">
      <img src="${review.cover ?? HERO_FALLBACK}" alt="${review.title} 대표 이미지" width="1600" height="900" fetchpriority="high" />
    </div>
    <div class="hero__inner shell">
      <div class="hero__panel">
        <p class="hero__eyebrow">이번 주 커버 리뷰 · ${categoryName(review.category)}</p>
        <h1 class="hero__title" id="hero-title">
          <a href="/review/${review.slug}">${review.title}</a>
        </h1>
        <p class="hero__sub">${review.subtitle}</p>
        <p class="hero__verdict">${review.verdict}</p>
        <div class="hero__foot">
          ${scoreBadge(review.score, 'lg')}
          <p class="hero__meta">
            <span>${review.author}</span><span aria-hidden="true">·</span
            ><time datetime="${review.date}">${formatDate(review.date)}</time><span aria-hidden="true">·</span
            ><span>읽는 데 ${review.readingTime}분</span>
          </p>
          <a class="btn" href="/review/${review.slug}">리뷰 전문 읽기</a>
        </div>
      </div>
    </div>
  </section>`;
}

export function homePage({ canonical }) {
  const featured = featuredReview();
  const rest = sortedReviews().filter((r) => r.slug !== featured.slug);
  const latest = rest.slice(0, 6);
  const archive = rest.slice(6);

  const body = html`<div class="shell">
    ${sectionHead('최신 리뷰', '새로 측정한 제품들', '/reviews')}
    ${cardGrid(latest)}

    <section class="rail" aria-labelledby="rail-title">
      <h2 class="rail__title" id="rail-title">카테고리로 보기</h2>
      <div class="rail__items">
        ${categories.map(
          (c) => html`<a class="chip" href="/category/${c.slug}">${c.name}</a>`,
        )}
      </div>
    </section>

    ${archive.length
      ? html`${sectionHead('아카이브', '지난 기사', '/reviews')} ${cardGrid(archive, 'compact')}`
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
