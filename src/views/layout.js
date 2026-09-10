import { html, raw } from '../lib/html.js';
import { categories } from '../data/reviews.js';

const SITE_NAME = 'USB.KR';
const SITE_TAGLINE = '측정하고 써 보고 기록한다';

function navLinks(active) {
  return categories.map(
    (c) => html`<a class="nav__link ${c.slug === active ? 'is-active' : ''}" href="/category/${c.slug}">${c.name}</a>`,
  );
}

export function layout({ title, description, canonical, active, body, heroSlot = null, jsonLd = null }) {
  const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} · ${SITE_TAGLINE}`;
  return html`<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${fullTitle}</title>
    <meta name="description" content="${description}" />
    <meta name="theme-color" content="#0d0d0f" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:title" content="${fullTitle}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonical}" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
    <link rel="alternate" type="application/rss+xml" title="${SITE_NAME} 리뷰" href="/rss.xml" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;700;900&family=Noto+Sans+KR:wght@400;500;700&display=swap"
    />
    <link rel="stylesheet" href="/assets/styles.css" />
    ${jsonLd ? html`<script type="application/ld+json">${raw(JSON.stringify(jsonLd))}</script>` : ''}
  </head>
  <body>
    <a class="skip" href="#main">본문으로 건너뛰기</a>
    <header class="masthead">
      <div class="masthead__bar shell">
        <a class="brand" href="/">
          <span class="brand__mark">USB</span><span class="brand__dot">.</span><span class="brand__tld">KR</span>
        </a>
        <p class="masthead__tagline">${SITE_TAGLINE}</p>
        <form class="search" role="search" action="/search" method="get">
          <label class="sr-only" for="q">리뷰 검색</label>
          <input id="q" name="q" type="search" placeholder="제품 또는 규격 검색" autocomplete="off" />
          <button type="submit" aria-label="검색">↵</button>
        </form>
      </div>
      <nav class="nav shell" aria-label="카테고리">
        <a class="nav__link ${active === 'home' ? 'is-active' : ''}" href="/">전체</a>
        ${navLinks(active)}
        <a class="nav__link ${active === 'about' ? 'is-active' : ''}" href="/about">소개</a>
      </nav>
    </header>
    ${heroSlot ?? ''}
    <main id="main">${body}</main>
    <footer class="footer">
      <div class="shell footer__grid">
        <div>
          <p class="footer__brand">USB<span>.KR</span></p>
          <p class="footer__note">
            직접 구매하고 직접 측정한다. 제조사 협찬 제품은 본문 상단에 반드시 표기한다.
          </p>
        </div>
        <div>
          <h2 class="footer__title">카테고리</h2>
          <ul class="footer__list">
            ${categories.map((c) => html`<li><a href="/category/${c.slug}">${c.name}</a></li>`)}
          </ul>
        </div>
        <div>
          <h2 class="footer__title">더 보기</h2>
          <ul class="footer__list">
            <li><a href="/about">매체 소개</a></li>
            <li><a href="/rss.xml">RSS 구독</a></li>
            <li><a href="/sitemap.xml">사이트맵</a></li>
          </ul>
        </div>
      </div>
      <div class="shell footer__legal">
        <p>© ${new Date().getFullYear()} USB.KR — 모든 측정값은 자체 테스트 환경 기준이다.</p>
      </div>
    </footer>
  </body>
</html>`;
}
