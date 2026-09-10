import { html, formatDate } from '../lib/html.js';
import { layout } from './layout.js';
import { cardGrid, scoreBadge, sectionHead } from './components.js';
import { categoryName, relatedReviews } from '../data/reviews.js';

export function reviewPage(review, { canonical }) {
  const related = relatedReviews(review);

  const body = html`<article class="post">
    <header class="post__head shell shell--narrow">
      <p class="post__cat"><a href="/category/${review.category}">${categoryName(review.category)}</a></p>
      <h1 class="post__title">${review.title}</h1>
      <p class="post__sub">${review.subtitle}</p>
      <p class="post__meta">
        <span>${review.author}</span><span aria-hidden="true">·</span
        ><time datetime="${review.date}">${formatDate(review.date)}</time><span aria-hidden="true">·</span
        ><span>읽는 데 ${review.readingTime}분</span>
      </p>
    </header>

    <figure class="post__cover">
      <img src="${review.cover}" alt="${review.title} 대표 이미지" width="1600" height="900" fetchpriority="high" />
      <figcaption>자체 촬영 · 테스트 환경 기준</figcaption>
    </figure>

    <div class="shell shell--narrow">
      <aside class="verdict">
        <div class="verdict__score">${scoreBadge(review.score, 'lg') || html`<span class="verdict__na">가이드</span>`}</div>
        <div>
          <p class="verdict__label">한 줄 평</p>
          <p class="verdict__text">${review.verdict}</p>
          <ul class="tags">${review.tags.map((t) => html`<li>${t}</li>`)}</ul>
        </div>
      </aside>

      <div class="prose">${review.body.map((p) => html`<p>${p}</p>`)}</div>

      <section class="split" aria-label="장단점">
        <div class="split__col split__col--pro">
          <h2>좋은 점</h2>
          <ul>${review.pros.map((p) => html`<li>${p}</li>`)}</ul>
        </div>
        <div class="split__col split__col--con">
          <h2>아쉬운 점</h2>
          <ul>${review.cons.map((c) => html`<li>${c}</li>`)}</ul>
        </div>
      </section>

      <section class="specs" aria-labelledby="specs-title">
        <h2 class="specs__title" id="specs-title">측정 요약</h2>
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

    ${related.length
      ? html`<div class="shell">${sectionHead('이어서 읽기', '관련 리뷰')} ${cardGrid(related, 'compact')}</div>`
      : ''}
  </article>`;

  return layout({
    title: review.title,
    description: review.verdict,
    canonical,
    active: review.category,
    body,
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
