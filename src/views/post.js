import { html, raw, formatDate } from '../lib/html.js';
import { layout } from './layout.js';
import { cardGrid, imgProxy, metaLine, outUrl, productBlock, sectionHead, typeLabel, won, ICON_ROCKET, ICON_ARROW } from './components.js';
import { categoryOfPost } from '../data/categories.js';
import { paragraphs, excerpt } from '../data/store.js';

/** 본문 문단 사이에 상품 블록을 고르게 끼워 넣는다. 기존 사이트의 배치 규칙을 따른다. */
function flow(p) {
  const segments = [...paragraphs(p.intro)];
  (p.sections ?? []).forEach((s, i) => {
    const paras = paragraphs(s.body_html);
    segments.push(`<h2 id="section-${i}">${s.heading ?? ''}</h2>${paras[0] ?? ''}`);
    for (let k = 1; k < paras.length; k += 1) segments.push(paras[k]);
  });
  const products = p.products ?? [];
  const groups = [];
  for (let i = 0; i < products.length; i += 2) groups.push(products.slice(i, i + 2).map((prod, k) => ({ prod, idx: i + k })));
  const points = new Set();
  const insertAt = groups.map((_, g) => {
    let t = Math.round(((g + 1) * segments.length) / (groups.length + 1));
    t = Math.max(1, Math.min(segments.length, t));
    while (points.has(t) && t < segments.length) t += 1;
    points.add(t);
    return t;
  });
  const out = [];
  let g = 0;
  segments.forEach((seg, i) => {
    out.push(raw(seg));
    while (g < groups.length && insertAt[g] === i + 1) {
      out.push(html`<div class="ppair">${groups[g].map(({ prod, idx }) => productBlock(prod, p.slug, { top: idx === 0 && products.length > 1, rank: idx + 1 }))}</div>`);
      g += 1;
    }
  });
  while (g < groups.length) {
    out.push(html`<div class="ppair">${groups[g].map(({ prod, idx }) => productBlock(prod, p.slug, { top: idx === 0 && products.length > 1, rank: idx + 1 }))}</div>`);
    g += 1;
  }
  return out;
}

function compareTable(p) {
  const products = p.products ?? [];
  if (products.length < 2) return '';
  return html`<section class="compare reveal" aria-labelledby="compare-title">
    <div class="specs__head">
      <h2 class="specs__title" id="compare-title">한눈에 비교</h2>
      <span class="specs__note">COUPANG PRICE</span>
    </div>
    <div class="compare__scroll">
      <table>
        <thead><tr><th>제품</th><th class="num">가격</th><th>배송</th><th></th></tr></thead>
        <tbody>
          ${products.map(
            (prod, i) => html`<tr class="${i === 0 ? 'is-top' : ''}">
              <td>${i === 0 ? html`<span class="compare__crown">추천</span>` : ''}${prod.name}</td>
              <td class="num">${won(prod.price)}</td>
              <td>${prod.isRocket ? html`<span class="ship ship--rocket">${ICON_ROCKET} 로켓</span>` : prod.isFreeShipping ? html`<span class="ship">무료배송</span>` : ''}</td>
              <td><a class="compare__go" href="${outUrl(prod, p.slug)}" target="_blank" rel="nofollow sponsored noopener">보러가기 →</a></td>
            </tr>`,
          )}
        </tbody>
      </table>
    </div>
  </section>`;
}

export function postPage(p, { canonical, related, views }) {
  const first = p.products?.[0];
  const cat = categoryOfPost(p);
  const cover = first?.image ? imgProxy(first.image) : null;
  const description = p.metaDescription || p.tldr || excerpt(p.intro, 150);

  const origin = new URL(canonical).origin;
  const abs = (u) => (u ? new URL(u, origin).href : null);
  const text = (h) => String(h ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const body = html`<article class="post">
    <header class="post__head shell">
      <nav class="crumbs" aria-label="현재 위치"><a href="/">홈</a>${cat ? html` › <a href="/category/${cat.slug}">${cat.name}</a>` : ''} › <span aria-current="page">${p.keyword}</span></nav>
      <p class="post__cat">${cat ? html`<a href="/category/${cat.slug}">${cat.name}</a>` : p.keyword}</p>
      <h1 class="post__title">${p.title}</h1>
      ${p.tldr ? html`<p class="post__sub">${p.tldr}</p>` : ''}
      ${metaLine(p, views >= 10 ? html`<span class="meta__views">조회 ${Number(views).toLocaleString('ko-KR')}</span>` : null)}
    </header>

    ${first
      ? html`<figure class="post__cover post__cover--product reveal">
          <a href="${outUrl(first, p.slug)}" target="_blank" rel="nofollow sponsored noopener">
            <img src="${cover}" alt="${first.altText || first.name}" width="600" height="600" fetchpriority="high" />
          </a>
          <figcaption><span>${first.name}</span><span>${won(first.price)}</span></figcaption>
        </figure>`
      : ''}

    <div class="shell post__layout">
      <aside class="post__side">
        <div class="verdict reveal">
          ${first
            ? html`<div class="verdict__product">
                <img src="${cover}" alt="" loading="lazy" width="200" height="200" />
                <p class="verdict__pname">${first.name}</p>
                <p class="verdict__pprice">${won(first.price)}</p>
                ${first.isRocket ? html`<span class="ship ship--rocket">${ICON_ROCKET} 로켓배송</span>` : first.isFreeShipping ? html`<span class="ship">무료배송</span>` : ''}
                <a class="btn btn--primary btn--block" href="${outUrl(first, p.slug)}" target="_blank" rel="nofollow sponsored noopener">쿠팡에서 보기 ${ICON_ARROW}</a>
              </div>`
            : ''}
          ${p.sections?.length >= 3
            ? html`<nav class="toc" aria-label="목차">
                <p class="verdict__label">목차</p>
                <ol>${p.sections.map((s, i) => html`<li><a href="#section-${i}">${s.heading}</a></li>`)}</ol>
              </nav>`
            : ''}
          <dl class="verdict__facts">
            <div><dt>유형</dt><dd>${typeLabel(p.type)}</dd></div>
            <div><dt>키워드</dt><dd>${p.keyword}</dd></div>
            <div><dt>게재</dt><dd><time datetime="${p.createdAt}">${formatDate(String(p.createdAt).slice(0, 10))}</time></dd></div>
            ${p.products?.length ? html`<div><dt>제품</dt><dd>${p.products.length}개</dd></div>` : ''}
          </dl>
        </div>
      </aside>

      <div class="post__main">
        ${p.tldr ? html`<div class="tldr reveal"><span class="tldr__label">✦ 한줄요약</span><p>${p.tldr}</p></div>` : ''}
        ${p.video?.id && /^[\w-]{11}$/.test(p.video.id)
          ? html`<figure class="video reveal">
              <iframe src="https://www.youtube-nocookie.com/embed/${p.video.id}" title="${p.video.title ?? '제품 영상'}" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
              <figcaption><span>${p.video.title ?? ''}</span><span>${p.video.channel ?? ''}</span></figcaption>
            </figure>`
          : ''}
        ${compareTable(p)}
        <div class="prose prose--post">${flow(p)}</div>
        ${p.outro ? html`<div class="prose prose--outro">${raw(p.outro)}</div>` : ''}

        ${p.alternatives?.length
          ? html`<section class="alts reveal" aria-labelledby="alts-title">
              <h2 class="alts__title" id="alts-title">함께 볼 만한 제품</h2>
              <div class="alts__grid">
                ${p.alternatives.map(
                  (a) => html`<a class="alt" href="${outUrl(a, p.slug)}" target="_blank" rel="nofollow sponsored noopener">
                    <img src="${imgProxy(a.image)}" alt="${a.name}" loading="lazy" width="200" height="200" />
                    <span class="alt__name">${a.name}</span>
                    <span class="alt__price">${won(a.price)}</span>
                  </a>`,
                )}
              </div>
            </section>`
          : ''}

        ${p.faq?.length
          ? html`<section class="faq reveal" aria-labelledby="faq-title">
              <h2 class="faq__title" id="faq-title">자주 묻는 질문</h2>
              ${p.faq.map((f) => html`<details class="faq__item"><summary>${f.q}</summary><div class="faq__a">${raw(f.a ?? '')}</div></details>`)}
            </section>`
          : ''}

        <p class="disclosure">
          이 글은 쿠팡 파트너스 활동의 일환으로 일정액의 수수료를 제공받을 수 있다. 가격과 재고는 게재 시점 기준이며 실제 구매 페이지에서 다시 확인하기를 권한다.
        </p>
      </div>
    </div>

    ${related.length ? html`<div class="shell">${sectionHead('→', '이어서 읽기', cat ? `${cat.name} 글 더 보기` : '관련 글')} ${cardGrid(related, { variant: 'compact' })}</div>` : ''}
  </article>`;

  return layout({
    title: p.title,
    description,
    canonical,
    active: cat?.slug ?? '',
    body,
    progress: true,
    ogImage: abs(cover),
    article: { published: p.createdAt, section: cat?.name ?? p.keyword },
    jsonLd: [
      {
        '@type': 'Article',
        '@id': `${canonical}#article`,
        headline: p.title,
        description,
        inLanguage: 'ko',
        datePublished: p.createdAt,
        dateModified: p.updatedAt ?? p.createdAt,
        articleSection: cat?.name ?? p.keyword,
        keywords: [p.keyword, ...(p.products ?? []).map((x) => x.name)].filter(Boolean).slice(0, 6).join(', '),
        wordCount: text([p.intro, ...(p.sections ?? []).map((s) => s.body_html), p.outro].join(' ')).length,
        author: { '@type': 'Organization', name: 'USB.KR', url: `${origin}/about` },
        publisher: { '@type': 'Organization', name: 'USB.KR', url: origin, logo: { '@type': 'ImageObject', url: `${origin}/assets/favicon.svg` } },
        mainEntityOfPage: canonical,
        ...(cover ? { image: [abs(cover)] } : {}),
        ...(p.tldr ? { abstract: p.tldr, speakable: { '@type': 'SpeakableSpecification', cssSelector: ['.post__title', '.tldr p'] } } : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '홈', item: `${origin}/` },
          ...(cat ? [{ '@type': 'ListItem', position: 2, name: cat.name, item: `${origin}/category/${cat.slug}` }] : []),
          { '@type': 'ListItem', position: cat ? 3 : 2, name: p.title, item: canonical },
        ],
      },
      ...(p.faq?.length
        ? [{ '@type': 'FAQPage', mainEntity: p.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: text(f.a) } })) }]
        : []),
      ...(p.products?.length
        ? [
            {
              '@type': 'ItemList',
              name: p.title,
              itemListOrder: 'https://schema.org/ItemListOrderAscending',
              numberOfItems: p.products.length,
              itemListElement: p.products.map((x, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                item: {
                  '@type': 'Product',
                  name: x.name,
                  ...(x.image ? { image: abs(imgProxy(x.image)) } : {}),
                  ...(Number(x.price) > 0 ? { offers: { '@type': 'Offer', price: Number(x.price), priceCurrency: 'KRW', availability: 'https://schema.org/InStock', url: x.affiliateUrl || undefined } } : {}),
                },
              })),
            },
          ]
        : []),
    ],
  });
}
