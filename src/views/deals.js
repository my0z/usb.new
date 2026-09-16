import { html } from '../lib/html.js';
import { layout } from './layout.js';
import { imgProxy, outUrl, won, ICON_ARROW, ICON_ROCKET } from './components.js';

/** 쿠팡 골드박스 특가. generator/deals.js 가 매일 07:30 에 KV deals:latest 에 넣는다. 클릭은 /out 을 지나 deals 슬러그로 센다. */
export function dealsPage({ canonical, deals }) {
  const items = deals?.items ?? [];
  const when = deals?.date ? new Date(deals.date).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' }) : '';
  const title = '오늘의 쿠팡 골드박스 특가';
  const description = items.length ? `${when} 기준 골드박스 ${items.length}개. ${items[0].name} 등 할인율 순으로 본다.` : '매일 아침 갱신되는 쿠팡 골드박스 특가 모음.';
  const body = html`<div class="shell">
    <nav class="crumbs" aria-label="현재 위치"><a href="/">홈</a> › <span>핫딜</span></nav>
    <header class="page-head reveal">
      <p class="eyebrow">핫딜 · ${when || '준비 중'}</p>
      <h1 class="page-title">${title}</h1>
      <p class="page-desc">쿠팡 골드박스는 매일 아침 7시에 바뀐다. 할인율 높은 순서로 보여 주고 재고와 가격은 쿠팡에서 다시 확인한다.</p>
      <span class="page-count">${items.length}<small>개</small></span>
    </header>
    ${items.length
      ? html`<ol class="deals">
          ${items.map(
            (p, i) => html`<li class="deal reveal" style="--i:${i}">
              <a class="deal__media" href="${outUrl(p, 'deals')}" target="_blank" rel="nofollow sponsored noopener">
                <img src="${imgProxy(p.image)}" alt="${p.name}" loading="lazy" decoding="async" width="300" height="300" />
                ${p.discountRate ? html`<span class="deal__off">${p.discountRate}%</span>` : ''}
              </a>
              <div class="deal__body">
                <p class="deal__name">${p.name}</p>
                <p class="deal__price">${p.originalPrice > p.price ? html`<s>${won(p.originalPrice)}</s>` : ''}<b>${won(p.price)}</b></p>
                <p class="deal__ship">${p.isRocket ? html`<span class="ship ship--rocket">${ICON_ROCKET} 로켓배송</span>` : p.isFreeShipping ? html`<span class="ship">무료배송</span>` : ''}</p>
                <a class="btn btn--primary btn--sm" href="${outUrl(p, 'deals')}" target="_blank" rel="nofollow sponsored noopener">쿠팡에서 보기 ${ICON_ARROW}</a>
              </div>
            </li>`,
          )}
        </ol>`
      : html`<p class="empty">오늘 목록이 아직 안 들어왔다. 아침 7시 30분에 채워진다.</p>`}
    <p class="disclosure">이 페이지의 링크는 쿠팡 파트너스 활동의 일환으로 수수료를 제공받을 수 있다. 가격과 할인율은 아침 갱신 시점 기준이다.</p>
  </div>`;
  const origin = new URL(canonical).origin;
  const jsonLd = items.length
    ? [
        {
          '@type': 'ItemList',
          name: title,
          url: canonical,
          numberOfItems: items.length,
          itemListElement: items.slice(0, 20).map((p, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'Product', name: p.name, image: `${origin}${imgProxy(p.image)}`, offers: { '@type': 'Offer', price: p.price, priceCurrency: 'KRW', availability: 'https://schema.org/InStock' } } })),
        },
      ]
    : null;
  return layout({ title, description, canonical, active: 'deals', body, jsonLd, ogImage: items[0] ? `${origin}${imgProxy(items[0].image)}` : null });
}
