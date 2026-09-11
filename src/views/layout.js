import { html, raw } from '../lib/html.js';
import { categories, sortedReviews } from '../data/reviews.js';

const SITE_NAME = 'USB.KR';
const SITE_TAGLINE = '측정하고 써 보고 기록한다';

function issueLabel() {
  const now = new Date();
  const week = Math.ceil((((now - new Date(now.getFullYear(), 0, 1)) / 86400000) + 1) / 7);
  return `Vol.${now.getFullYear() - 2025} · No.${String(week).padStart(2, '0')}`;
}

function navLinks(active) {
  return categories.map(
    (c) => html`<a class="nav__link ${c.slug === active ? 'is-active' : ''}" href="/category/${c.slug}">${c.name}</a>`,
  );
}

function ticker() {
  const items = sortedReviews().slice(0, 6);
  const run = items.map(
    (r) => html`<a class="ticker__item" href="/review/${r.slug}"><b>${r.score ? r.score.toFixed(1) : 'LAB'}</b>${r.title}</a>`,
  );
  return html`<div class="ticker" aria-label="최신 기사 흐름">
    <div class="ticker__track">${run}${run}</div>
  </div>`;
}

const INLINE_SCRIPT = raw(`
(function(){
  var d=document;
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  d.documentElement.classList.add('js');
  if(reduce||!('IntersectionObserver' in window)){d.documentElement.classList.add('no-reveal');return}
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px',threshold:0.08});
  d.querySelectorAll('.reveal').forEach(function(el){io.observe(el)});
  var bar=d.querySelector('.progress');
  if(bar){var t;addEventListener('scroll',function(){if(t)return;t=requestAnimationFrame(function(){t=0;var h=d.documentElement;var p=h.scrollTop/(h.scrollHeight-h.clientHeight);bar.style.transform='scaleX('+Math.min(1,Math.max(0,p))+')'})},{passive:true})}
  var mh=d.querySelector('.masthead');
  addEventListener('scroll',function(){mh.classList.toggle('is-compact',scrollY>80)},{passive:true});
})();
`);

export function layout({ title, description, canonical, active, body, heroSlot = null, jsonLd = null, progress = false }) {
  const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} · ${SITE_TAGLINE}`;
  return html`<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${fullTitle}</title>
    <meta name="description" content="${description}" />
    <meta name="theme-color" content="#0e0d10" />
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
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;700;900&family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,700;0,9..144,900;1,9..144,500&display=swap"
    />
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
    />
    <link rel="stylesheet" href="/assets/styles.css" />
    ${jsonLd ? html`<script type="application/ld+json">${raw(JSON.stringify(jsonLd))}</script>` : ''}
  </head>
  <body>
    <a class="skip" href="#main">본문으로 건너뛰기</a>
    ${progress ? html`<div class="progress" aria-hidden="true"></div>` : ''}
    <div class="grain" aria-hidden="true"></div>
    <header class="masthead">
      <div class="masthead__top shell">
        <span class="masthead__issue">${issueLabel()}</span>
        <span class="masthead__tagline">${SITE_TAGLINE}</span>
        <span class="masthead__date">${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', timeZone: 'Asia/Seoul' })}</span>
      </div>
      <div class="masthead__bar shell">
        <a class="brand" href="/" aria-label="USB.KR 홈">
          <span class="brand__mark">USB</span><span class="brand__dot">.</span><span class="brand__tld">KR</span>
        </a>
        <form class="search" role="search" action="/search" method="get">
          <label class="sr-only" for="q">리뷰 검색</label>
          <svg class="search__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input id="q" name="q" type="search" placeholder="제품 또는 규격 검색" autocomplete="off" />
          <kbd aria-hidden="true">↵</kbd>
        </form>
      </div>
      <nav class="nav shell" aria-label="카테고리">
        <a class="nav__link ${active === 'home' ? 'is-active' : ''}" href="/">전체</a>
        ${navLinks(active)}
        <a class="nav__link ${active === 'about' ? 'is-active' : ''}" href="/about">소개</a>
      </nav>
    </header>
    ${active === 'home' ? ticker() : ''}
    ${heroSlot ?? ''}
    <main id="main">${body}</main>
    <footer class="footer">
      <div class="shell footer__grid">
        <div class="footer__intro">
          <p class="footer__brand">USB<span>.</span>KR</p>
          <p class="footer__note">
            직접 구매하고 직접 측정한다. 제조사 협찬 제품은 본문 상단에 반드시 표기한다.
          </p>
          <p class="footer__issue">${issueLabel()}</p>
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
            <li><a href="/reviews">전체 기사</a></li>
            <li><a href="/rss.xml">RSS 구독</a></li>
            <li><a href="/sitemap.xml">사이트맵</a></li>
          </ul>
        </div>
      </div>
      <div class="footer__wordmark" aria-hidden="true"><span>USB.KR</span></div>
      <div class="shell footer__legal">
        <p>© ${new Date().getFullYear()} USB.KR — 모든 측정값은 자체 테스트 환경 기준이다.</p>
        <p>Cloudflare Workers 위에서 동작한다.</p>
      </div>
    </footer>
    <script>${INLINE_SCRIPT}</script>
  </body>
</html>`;
}
