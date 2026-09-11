import { html, raw, formatDate } from '../lib/html.js';
import { categoryName } from '../data/reviews.js';

function tone(score) {
  return score >= 9 ? 'gold' : score >= 8 ? 'green' : 'neutral';
}

export function scoreBadge(score, size = 'sm') {
  if (!score) return '';
  return html`<span class="score score--${size} score--${tone(score)}"
    ><b>${score.toFixed(1)}</b><small>/10</small></span
  >`;
}

/** 원형 게이지. 리뷰 본문과 히어로에서 쓴다. */
export function scoreRing(score, size = 112) {
  if (!score) return '';
  const r = 44;
  const c = 2 * Math.PI * r;
  const dash = ((score / 10) * c).toFixed(2);
  return html`<span class="ring ring--${tone(score)}" style="--size:${size}px" role="img" aria-label="평점 ${score.toFixed(1)}점 만점 10점">
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle class="ring__track" cx="50" cy="50" r="${r}" />
      <circle class="ring__bar" cx="50" cy="50" r="${r}" stroke-dasharray="${dash} ${c.toFixed(2)}" />
    </svg>
    <span class="ring__val"><b>${score.toFixed(1)}</b><small>/ 10</small></span>
  </span>`;
}

export function metaLine(review, extra = null) {
  return html`<p class="meta">
    <span class="meta__author">${review.author}</span>
    <time datetime="${review.date}">${formatDate(review.date)}</time>
    <span>${review.readingTime}분</span>
    ${extra}
  </p>`;
}

export function reviewCard(review, { variant = 'default', index = null } = {}) {
  return html`<article class="card card--${variant} reveal" ${index !== null ? html`style="--i:${index}"` : ''}>
    <a class="card__link" href="/review/${review.slug}">
      <div class="card__media">
        <img src="${review.cover}" alt="" loading="lazy" decoding="async" width="800" height="500" />
        <span class="card__cat">${categoryName(review.category)}</span>
        ${scoreBadge(review.score)}
        ${index !== null ? html`<span class="card__num">${String(index + 1).padStart(2, '0')}</span>` : ''}
      </div>
      <div class="card__body">
        <h3 class="card__title">${review.title}</h3>
        <p class="card__sub">${review.subtitle}</p>
        <p class="card__verdict">${review.verdict}</p>
        ${metaLine(review)}
      </div>
    </a>
  </article>`;
}

export function cardGrid(list, { variant = 'default', numbered = false, bento = false } = {}) {
  return html`<div class="grid ${bento ? 'grid--bento' : ''}">
    ${list.map((r, i) => reviewCard(r, { variant: bento && i === 0 ? 'lead' : variant, index: numbered ? i : null }))}
  </div>`;
}

export function sectionHead(number, eyebrow, title, moreHref = null, moreLabel = '전체 보기') {
  return html`<div class="section-head reveal">
    <span class="section-head__num" aria-hidden="true">${number}</span>
    <div class="section-head__text">
      <p class="eyebrow">${eyebrow}</p>
      <h2 class="section-title">${title}</h2>
    </div>
    ${moreHref ? html`<a class="more" href="${moreHref}"><span>${moreLabel}</span><i aria-hidden="true">→</i></a>` : ''}
  </div>`;
}

export const ICON_ARROW = raw('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 5l7 7-7 7"/></svg>');
