import { html, raw } from '../lib/html.js';
import { categories } from '../data/categories.js';
import { postUrl, won } from './components.js';

const SITE_NAME = 'USB.KR';
const SITE_TAGLINE = '전자기기 스펙과 가격을 비교한다';
/** 스타일 변경 시 올려서 브라우저 캐시를 무효화한다. */
export const ASSET_VERSION = '20260913c';

/** GA4 측정 ID (G-XXXX) 와 Cloudflare Web Analytics 토큰. 요청마다 index.js 가 env 에서 넣는다. 비어 있으면 태그를 안 넣는다. */
export let GA_ID = '';
let CF_BEACON = '';
export const setTracking = (env) => {
  GA_ID = String(env?.GA_ID ?? '').trim();
  CF_BEACON = String(env?.CF_BEACON_TOKEN ?? '').trim();
};
const NAV_PRIMARY = ['audio', 'mobile', 'pc', 'display', 'wearable', 'smarthome', 'camera', 'car'];

function issueLabel() {
  const now = new Date();
  const week = Math.ceil(((now - new Date(now.getFullYear(), 0, 1)) / 86400000 + 1) / 7);
  return `Vol.${now.getFullYear() - 2025} · No.${String(week).padStart(2, '0')}`;
}

function navLinks(active) {
  return categories
    .filter((c) => NAV_PRIMARY.includes(c.slug))
    .map((c) => html`<a class="nav__link ${c.slug === active ? 'is-active' : ''}" href="/category/${c.slug}">${c.name}</a>`);
}

function ticker(items) {
  if (!items?.length) return '';
  const run = items.map(
    (p) => html`<a class="ticker__item" href="${postUrl(p)}"><b>${won(p.products?.[0]?.price) || p.keyword}</b>${p.title}</a>`,
  );
  return html`<div class="ticker" aria-label="최신 글 흐름">
    <div class="ticker__track">${run}${run}</div>
  </div>`;
}

const INLINE_SCRIPT = raw(`
(function(){
  var d=document;
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  d.documentElement.classList.add('js');
  if(navigator.sendBeacon&&location.pathname!=='/0')navigator.sendBeacon('/hit',location.pathname);
  if(reduce||!('IntersectionObserver' in window)){d.documentElement.classList.add('no-reveal');return}
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px',threshold:0.08});
  d.querySelectorAll('.reveal').forEach(function(el){io.observe(el)});
  var bar=d.querySelector('.progress');
  if(bar){var t;addEventListener('scroll',function(){if(t)return;t=requestAnimationFrame(function(){t=0;var h=d.documentElement;var p=h.scrollTop/(h.scrollHeight-h.clientHeight);bar.style.transform='scaleX('+Math.min(1,Math.max(0,p))+')'})},{passive:true})}
  var mh=d.querySelector('.masthead');
  var brand=d.querySelector('.brand');
  addEventListener('scroll',function(){var p=Math.min(1,scrollY/160);mh.classList.toggle('is-compact',scrollY>80);brand.style.setProperty('--brand-s',1-0.7*p)},{passive:true});
})();
`);

export function layout({ title, description, canonical, active, body, heroSlot = null, jsonLd = null, progress = false, tickerItems = null, ogImage = null, article = null }) {
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
    <meta property="og:type" content="${article ? 'article' : 'website'}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:locale" content="ko_KR" />
    ${ogImage ? html`<meta property="og:image" content="${ogImage}" />` : ''}
    ${article ? html`<meta property="article:published_time" content="${article.published}" />${article.section ? html`<meta property="article:section" content="${article.section}" />` : ''}` : ''}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${fullTitle}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
    <link rel="alternate" type="application/rss+xml" title="${SITE_NAME}" href="/rss.xml" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;700;900&family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,700;0,9..144,900;1,9..144,500&display=swap"
      media="print"
      onload="this.media='all'"
    />
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
      media="print"
      onload="this.media='all'"
    />
    <link rel="stylesheet" href="/assets/styles.css?v=${ASSET_VERSION}" />
    ${jsonLd ? html`<script type="application/ld+json">${raw(JSON.stringify(Array.isArray(jsonLd) ? { '@context': 'https://schema.org', '@graph': jsonLd } : jsonLd))}</script>` : ''}
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
          <label class="sr-only" for="q">글 검색</label>
          <svg class="search__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input id="q" name="q" type="search" placeholder="제품 또는 키워드 검색" autocomplete="off" />
          <kbd aria-hidden="true">↵</kbd>
        </form>
      </div>
      <nav class="nav shell" aria-label="카테고리">
        <a class="nav__link ${active === 'home' ? 'is-active' : ''}" href="/">전체</a>
        ${navLinks(active)}
        <a class="nav__link ${active === 'categories' ? 'is-active' : ''}" href="/categories">더 보기</a>
      </nav>
    </header>
    ${active === 'home' ? ticker(tickerItems) : ''}
    ${heroSlot ?? ''}
    <main id="main">${body}</main>
    <footer class="footer">
      <div class="shell footer__grid">
        <div class="footer__intro">
          <p class="footer__brand">USB<span>.</span>KR</p>
          <p class="footer__note">
            실시간 쿠팡 가격 데이터를 바탕으로 전자기기 스펙과 가격을 비교한다. 이 사이트는 쿠팡 파트너스 활동의 일환으로 수수료를 제공받을 수 있다.
          </p>
          <p class="footer__issue">${issueLabel()}</p>
        </div>
        <div>
          <h2 class="footer__title">카테고리</h2>
          <ul class="footer__list footer__list--cols">
            ${categories.map((c) => html`<li><a href="/category/${c.slug}">${c.name}</a></li>`)}
          </ul>
        </div>
        <div>
          <h2 class="footer__title">더 보기</h2>
          <ul class="footer__list">
            <li><a href="/about">사이트 소개</a></li>
            <li><a href="/posts">전체 글</a></li>
            <li><a href="/privacy">개인정보처리방침</a></li>
            <li><a href="/rss.xml">RSS 구독</a></li>
            <li><a href="/sitemap.xml">사이트맵</a></li>
          </ul>
        </div>
      </div>
      <div class="footer__wordmark" aria-hidden="true"><span>USB.KR</span></div>
      <div class="shell footer__legal">
        <p>© ${new Date().getFullYear()} USB.KR — AI 가 작성한 참고용 콘텐츠이며 정확한 스펙은 판매 페이지에서 확인을 권한다.</p>
        <p>Cloudflare Workers 위에서 동작한다.</p>
      </div>
    </footer>
    <script>${INLINE_SCRIPT}</script>
    ${GA_ID ? html`<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}')</script>` : ''}
    ${CF_BEACON ? html`<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${CF_BEACON}"}'></script>` : ''}
  </body>
</html>`;
}
