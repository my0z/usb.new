import { html, formatDate } from '../lib/html.js';
import { layout } from './layout.js';
import { cardGrid, scoreRing, sectionHead, metaLine } from './components.js';
import { categoryName, relatedReviews } from '../data/reviews.js';

export function reviewPage(review, { canonical }) {
  const related = relatedReviews(review);
  const [lead, ...paragraphs] = review.body;

  const body = html`<article class="post">
    <header class="post__head shell">
      <p class="post__cat"><a href="/category/${review.category}">${categoryName(review.category)}</a></p>
      <h1 class="post__title">${review.title}</h1>
      <p class="post__sub">${review.subtitle}</p>
      ${metaLine(review)}
    </header>

    <figure class="post__cover reveal">
      <img src="${review.cover}" alt="${review.title} 대표 이미지" width="1600" height="900" fetchpriority="high" />
      <figcaption><span>자체 촬영</span><span>테스트 환경 기준</span></figcaption>
    </figure>

    <div class="shell post__layout">
      <aside class="post__side">
        <div class="verdict reveal">
          <div class="verdict__ring">
            ${review.score ? scoreRing(review.score, 132) : html`<span class="verdict__na">LAB<br />GUIDE</span>`}
          </div>
          <p class="verdict__label">한 줄 평</p>
          <p class="verdict__text">${review.verdict}</p>
          <ul class="tags">${review.tags.map((t) => html`<li>${t}</li>`)}</ul>
          <dl class="verdict__facts">
            <div><dt>작성</dt><dd>${review.author}</dd></div>
            <div><dt>게재</dt><dd><time datetime="${review.date}">${formatDate(review.date)}</time></dd></div>
            <div><dt>분량</dt><dd>${review.readingTime}분</dd></div>
          </dl>
        </div>
      </aside>

      <div class="post__main">
        <div class="prose">
          <p class="prose__lead">${lead}</p>
          ${paragraphs.map((p) => html`<p>${p}</p>`)}
        </div>

        <section class="split reveal" aria-label="장단점">
          <div class="split__col split__col--pro">
            <h2><i aria-hidden="true">+</i>좋은 점</h2>
            <ul>${review.pros.map((p) => html`<li>${p}</li>`)}</ul>
          </div>
          <div class="split__col split__col--con">
            <h2><i aria-hidden="true">−</i>아쉬운 점</h2>
            <ul>${review.cons.map((c) => html`<li>${c}</li>`)}</ul>
          </div>
        </section>

        <section class="specs reveal" aria-labelledby="specs-title">
          <div class="specs__head">
            <h2 class="specs__title" id="specs-title">측정 요약</h2>
            <span class="specs__note">USB.KR LAB</span>
          </div>
          <table>
            <tbody>
              ${review.specs.map(
                ([k, v]) => html`<tr>
                  <th scope="row">${k}</th>
                  <td>${v}</td>
                </tr>`,
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>

    ${related.length
      ? html`<div class="shell">${sectionHead('→', '이어서 읽기', '관련 리뷰')} ${cardGrid(related, { variant: 'compact' })}</div>`
      : ''}
  </article>`;

  return layout({
    title: review.title,
    description: review.verdict,
    canonical,
    active: review.category,
    body,
    progress: true,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Review',
      headline: review.title,
      datePublished: review.date,
      author: { '@type': 'Person', name: review.author },
      publisher: { '@type': 'Organization', name: 'USB.KR' },
      itemReviewed: { '@type': 'Product', name: review.title },
      ...(review.score
        ? { reviewRating: { '@type': 'Rating', ratingValue: review.score, bestRating: 10, worstRating: 0 } }
        : {}),
    },
  });
}
