import { html, raw, formatDate } from '../lib/html.js';
import { categoryOfPost } from '../data/categories.js';
import { excerpt } from '../data/store.js';

export const ICON_ARROW = raw('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 5l7 7-7 7"/></svg>');
export const ICON_ROCKET = raw('<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c3.5 2 5.5 6 5.5 10l-2.5 2.5-1.5 4-2-2h-3l-2 2-1.5-4L4.5 12C4.5 8 6.5 4 12 2zm0 6a2 2 0 100 4 2 2 0 000-4z"/></svg>');

/** 쿠팡 CDN 이미지를 워커 프록시 경로로 바꾼다. */
export function imgProxy(url, { nobg = false, w = 0 } = {}) {
  if (!url) return '';
  if (url.startsWith('/')) return url;
  const b64 = btoa(unescape(encodeURIComponent(url))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const q = [nobg && 'nobg=1', w && `w=${w}`].filter(Boolean).join('&');
  return `/img/${b64}${q ? `?${q}` : ''}`;
}

function decodeImg(path) {
  let b64 = path.slice(5).split('?')[0].replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  return decodeURIComponent(escape(atob(b64)));
}

/** 표시 폭에 맞춘 src 와 2배 srcset. 워커 프록시가 폭대로 줄여 보내므로 작은 썸네일에 600px 을 안 보낸다. */
export function imgSrc(url, w) {
  if (String(url).startsWith('/img/')) url = decodeImg(url); // 이미 프록시 경로면 원본으로 되돌려 폭을 붙인다
  const src = imgProxy(url, { w });
  if (src.startsWith('/assets/')) return raw(`src="${src}"`);
  return raw(`src="${src}" srcset="${src} 1x, ${imgProxy(url, { w: Math.min(w * 2, 600) })} 2x"`);
}

export function outUrl(product, slug) {
  return `/out?u=${encodeURIComponent(product.affiliateUrl ?? '')}&s=${encodeURIComponent(slug)}`;
}

export function won(n) {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? `${v.toLocaleString('ko-KR')}원` : '';
}

export function postUrl(p) {
  return `/${encodeURIComponent(p.slug)}`;
}

export function typeLabel(type) {
  return type === 'review' ? '단일 리뷰' : type === 'comparison' ? '비교' : '가이드';
}

export function priceBadge(product, size = 'sm') {
  const price = won(product?.price);
  if (!price) return '';
  return html`<span class="price price--${size} ${product.isRocket ? 'price--rocket' : ''}"
    ><b>${price}</b>${product.isRocket ? html`<i>${ICON_ROCKET}로켓</i>` : ''}</span
  >`;
}

/** 카드처럼 이미 <a> 안에 있을 때는 link=false 로 중첩 앵커를 피한다. */
export function metaLine(p, extra = null, { link = true } = {}) {
  const cat = categoryOfPost(p);
  const label = cat?.name ?? p.keyword;
  return html`<p class="meta">
    ${cat && link ? html`<a class="meta__cat" href="/category/${cat.slug}">${label}</a>` : html`<span class="meta__cat">${label}</span>`}
    <time datetime="${p.createdAt}">${formatDate(String(p.createdAt).slice(0, 10))}</time>
    <span>${typeLabel(p.type)}</span>
    ${extra}
  </p>`;
}

export function postCard(p, { variant = 'default', index = null, eager = false } = {}) {
  const first = p.products?.[0];
  const cover = first?.image ? imgProxy(first.image) : '/assets/hero-default.svg';
  const summary = p.tldr || p.metaDescription || excerpt(p.intro);
  return html`<article class="card card--${variant} reveal" ${index !== null ? html`style="--i:${index}"` : ''}>
    <a class="card__link" href="${postUrl(p)}">
      <div class="card__media card__media--product">
        <img ${imgSrc(first?.image || '/assets/hero-default.svg', variant === 'compact' ? 300 : variant === 'lead' || eager ? 600 : 320)} alt="" ${eager ? html`fetchpriority="high"` : html`loading="lazy"`} decoding="async" width="600" height="600" />
        <span class="card__cat">${p.keyword}</span>
        ${first ? priceBadge(first) : ''}
        ${index !== null ? html`<span class="card__num">${String(index + 1).padStart(2, '0')}</span>` : ''}
      </div>
      <div class="card__body">
        <h3 class="card__title">${p.title}</h3>
        ${first ? html`<p class="card__sub">${first.name}</p>` : ''}
        <p class="card__verdict">${summary}</p>
        ${metaLine(p, p.views ? html`<span class="meta__views">조회 ${Number(p.views).toLocaleString('ko-KR')}</span>` : null, { link: false })}
      </div>
    </a>
  </article>`;
}

export function cardGrid(list, { variant = 'default', numbered = false, bento = false, eagerFirst = true } = {}) {
  return html`<div class="grid ${bento ? 'grid--bento' : ''}">
    ${list.map((p, i) => postCard(p, { variant: bento && i === 0 ? 'lead' : variant, index: numbered ? i : null, eager: eagerFirst && i === 0 }))}
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

/** 본문 안에 삽입되는 상품 블록 */
export function productBlock(product, slug, { rank = null, top = false } = {}) {
  const drop = product.previousPrice && Number(product.previousPrice) > Number(product.price);
  return html`<div class="pbox ${top ? 'pbox--top' : ''}">
    <a class="pbox__media" href="${outUrl(product, slug)}" target="_blank" rel="nofollow sponsored noopener">
      <img ${imgSrc(product.image, 200)} alt="${product.altText || product.name}" loading="lazy" decoding="async" width="440" height="440" />
      ${top ? html`<span class="pbox__badge">추천 1위</span>` : rank !== null ? html`<span class="pbox__rank">${String(rank).padStart(2, '0')}</span>` : ''}
    </a>
    <div class="pbox__body">
      <h3 class="pbox__name">${product.name}</h3>
      <div class="pbox__price">
        ${drop ? html`<s>${won(product.previousPrice)}</s>` : ''}
        <b>${won(product.price)}</b>
      </div>
      <div class="pbox__ship">
        ${product.isRocket ? html`<span class="ship ship--rocket">${ICON_ROCKET} 로켓배송</span>` : ''}
        ${!product.isRocket && product.isFreeShipping ? html`<span class="ship">무료배송</span>` : ''}
      </div>
      <a class="btn btn--primary btn--sm" href="${outUrl(product, slug)}" target="_blank" rel="nofollow sponsored noopener">최저가 확인 ${ICON_ARROW}</a>
    </div>
  </div>`;
}
