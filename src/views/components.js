import { html, formatDate } from '../lib/html.js';
import { categoryName } from '../data/reviews.js';

export function scoreBadge(score, size = 'sm') {
  if (!score) return '';
  const tone = score >= 9 ? 'gold' : score >= 8 ? 'green' : 'neutral';
  return html`<span class="score score--${size} score--${tone}"
    ><b>${score.toFixed(1)}</b><small>/10</small></span
  >`;
}

export function reviewCard(review, variant = 'default') {
  return html`<article class="card card--${variant}">
    <a class="card__link" href="/review/${review.slug}">
      <div class="card__media">
        <img src="${review.cover}" alt="" loading="lazy" decoding="async" width="800" height="500" />
        <span class="card__cat">${categoryName(review.category)}</span>
        ${scoreBadge(review.score)}
      </div>
      <div class="card__body">
        <h3 class="card__title">${review.title}</h3>
        <p class="card__sub">${review.subtitle}</p>
        <p class="card__verdict">${review.verdict}</p>
        <p class="card__meta">
          <span>${review.author}</span><span aria-hidden="true">·</span
          ><time datetime="${review.date}">${formatDate(review.date)}</time><span aria-hidden="true">·</span
          ><span>${review.readingTime}분</span>
        </p>
      </div>
    </a>
  </article>`;
}

export function cardGrid(list, variant = 'default') {
  return html`<div class="grid">${list.map((r) => reviewCard(r, variant))}</div>`;
}

export function sectionHead(eyebrow, title, moreHref = null, moreLabel = '전체 보기') {
  return html`<div class="section-head">
    <div>
      <p class="eyebrow">${eyebrow}</p>
      <h2 class="section-title">${title}</h2>
    </div>
    ${moreHref ? html`<a class="more" href="${moreHref}">${moreLabel} →</a>` : ''}
  </div>`;
}
