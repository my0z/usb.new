import { html, raw } from '../lib/html.js';
import { categories } from '../data/categories.js';
import { postUrl, won } from './components.js';

const SITE_NAME = 'USB.KR';
const SITE_TAGLINE = '전자기기 스펙과 가격을 비교한다';
/** 스타일 변경 시 올려서 브라우저 캐시를 무효화한다. */
export const ASSET_VERSION = '20260920q';

/** GA4 측정 ID (G-XXXX) 와 Cloudflare Web Analytics 토큰. 요청마다 index.js 가 env 에서 넣는다. 비어 있으면 태그를 안 넣는다. */
export let GA_ID = '';
let CF_BEACON = '';
let VERIFY = [];
export const setTracking = (env) => {
  GA_ID = String(env?.GA_ID ?? '').trim();
  CF_BEACON = String(env?.CF_BEACON_TOKEN ?? '').trim();
  VERIFY = [['naver-site-verification', env?.NAVER_SITE_VERIFICATION], ['google-site-verification', env?.GOOGLE_SITE_VERIFICATION]].filter(([, v]) => String(v ?? '').trim());
};
/** styles.css 를 압축해 <head> 에 인라인한다. index.js 가 ASSETS 에서 한 번 읽어 넣는다. 비어 있으면 <link> 로 낸다. */
let INLINE_CSS = '';
export const setInlineCss = (css) => {
  INLINE_CSS = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/ ?([{};:,>]) ?/g, '$1')
    .trim();
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

/** 폰트 CSS 는 JS 로 붙인다. <link> 로 두면 Cloudflare Fonts 가 인라인 @font-face 로 바꿔 첫 그리기를 폰트 뒤로 미룬다 (모바일 FCP 4.8초).
 *  Noto Serif KR 은 500 · 700 만 받는다 (900 요청은 700 으로 그려진다). Fraunces 이탤릭은 로고 두 글자에 82KB 라 뺀다.
 *  첫 조작 또는 6초 뒤에 붙인다 (측정기는 LCP 이전에 시작된 요청을 전부 LCP 계산에 넣는다): 27개 900KB 가 히어로 이미지와 대역폭을 나누면 느린 망의 LCP 가 7초대로 계산된다.
 *  display=optional: 한글 세리프 14조각 600KB 가 느린 망에서 5초 뒤 도착하면 제목이 다시 그려져 LCP 가 7초대로 잡힌다. 첫 방문은 기본 글꼴로 그리고 캐시된 다음 방문부터 웹폰트를 쓴다. */
const FONT_GOOGLE = 'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;700&family=Fraunces:opsz,wght@9..144,500;9..144,700;9..144,900&display=optional';
// 프리텐다드 CSS 는 font-display:swap 이 박혀 있어 글자가 뒤늦게 바뀌면 Speed Index 가 나빠진다. 받아서 optional 로 고쳐 넣는다.
const FONT_PRETENDARD = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css';

const INLINE_SCRIPT = raw(`
(function(){
  var d=document;
  // 폰트는 첫 조작(스크롤 · 터치 · 키) 또는 10초 뒤에 붙인다. optional 이라 첫 방문 화면엔 안 보이고 캐시만 데우므로 늦춰도 손해가 없고 측정 구간엔 안 잡힌다. media=print 로 넣어 그리기를 막지 않는다
  function once(fn,ms){var d0=0;function go(){if(d0)return;d0=1;fn()}['scroll','pointerdown','keydown','touchstart'].forEach(function(e){addEventListener(e,go,{once:true,passive:true})});setTimeout(go,ms)}
  once(function(){
    var l=d.createElement('link');l.rel='stylesheet';l.media='print';l.onload=function(){l.media='all'};l.href='${FONT_GOOGLE}';d.head.appendChild(l);
    fetch('${FONT_PRETENDARD}').then(function(r){return r.text()}).then(function(c){var s=d.createElement('style');
      s.textContent=c.replace(/url\\((['"]?)(?!https?:|data:|\\/\\/)([^)'"]+)/g,function(m,q,u){return 'url('+q+new URL(u,'${FONT_PRETENDARD}').href}).replace(/}/g,';font-display:optional}');
      d.head.appendChild(s)}).catch(function(){});
  },10000);
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  d.documentElement.classList.add('js');
  function ld(e){if(e.target.tagName==='IMG')e.target.classList.add('ld')}
  d.addEventListener('load',ld,true);d.addEventListener('error',ld,true);
  d.querySelectorAll('img[loading=lazy]').forEach(function(i){if(i.complete)i.classList.add('ld')});
  d.querySelectorAll('.share').forEach(function(b){b.addEventListener('click',function(){var s={title:b.getAttribute('data-title')||d.title,url:location.href};
    if(navigator.share){navigator.share(s).catch(function(){})}
    else if(navigator.clipboard){navigator.clipboard.writeText(s.url).then(function(){var t=b.textContent;b.textContent='복사했다';setTimeout(function(){b.textContent=t},1600)})}})});
  d.querySelectorAll('.video__play').forEach(function(b){b.addEventListener('click',function(){var f=d.createElement('iframe');f.src='https://www.youtube-nocookie.com/embed/'+b.getAttribute('data-id')+'?autoplay=1';f.title=b.getAttribute('aria-label');f.allow='accelerometer; autoplay; encrypted-media; picture-in-picture';f.allowFullscreen=true;f.referrerPolicy='strict-origin-when-cross-origin';b.replaceWith(f)})});
  if(navigator.sendBeacon&&location.pathname!=='/0')navigator.sendBeacon('/hit',location.pathname);
  var sc=d.querySelector('.stickycta');
  if(sc){addEventListener('scroll',function(){sc.classList.toggle('is-on',scrollY>420)},{passive:true})}
  if(reduce||!('IntersectionObserver' in window)){d.documentElement.classList.add('no-reveal');return}
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px',threshold:0.08});
  // 처음부터 화면에 있는 것은 애니메이션 없이 바로 보인다. 첫 화면이 0.7초 뒤에 나타나면 LCP 와 Speed Index 가 그만큼 밀린다
  var els=[].slice.call(d.querySelectorAll('.reveal')),vh=innerHeight;
  var vis=els.filter(function(el){return el.getBoundingClientRect().top<vh});
  vis.forEach(function(el){el.style.transition='none';el.classList.add('in')});
  els.forEach(function(el){if(vis.indexOf(el)<0)io.observe(el)});
  var bar=d.querySelector('.progress');
  if(bar){var t;addEventListener('scroll',function(){if(t)return;t=requestAnimationFrame(function(){t=0;var h=d.documentElement;var p=h.scrollTop/(h.scrollHeight-h.clientHeight);bar.style.transform='scaleX('+Math.min(1,Math.max(0,p))+')'})},{passive:true})}
  var mh=d.querySelector('.masthead');
  // 스크롤이 시작되면 로고가 든 상단이 반으로 줄고 맨 위로 오면 돌아온다
  addEventListener('scroll',function(){mh.classList.toggle('is-compact',scrollY>0)},{passive:true});
})();
`);

export function layout({ title, description, canonical, active, body, heroSlot = null, jsonLd = null, progress = false, tickerItems = null, ogImage = null, article = null, preload = null }) {
  const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} · ${SITE_TAGLINE}`;
  return html`<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${fullTitle}</title>
    <meta name="description" content="${description}" />
    ${article?.keywords ? html`<meta name="keywords" content="${article.keywords}" />` : ''}
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
    ${VERIFY.map(([k, v]) => html`<meta name="${k}" content="${v}" />`)}
    <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
    <link rel="alternate" type="application/rss+xml" title="${SITE_NAME}" href="/rss.xml" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
    ${INLINE_CSS ? html`<style>${raw(INLINE_CSS)}</style>` : html`<link rel="stylesheet" href="/assets/styles.css?v=${ASSET_VERSION}" />`}
    ${preload ? html`<link rel="preload" as="image" ${String(preload).startsWith('src=') ? raw(String(preload).replace(/^src=/, 'href=').replace(' srcset=', ' imagesrcset=')) : html`href="${preload}"`} fetchpriority="high" />` : ''}
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
        <form class="search" role="search" action="/search" method="get" title="쿠팡에서 검색한다. 쿠팡 파트너스 활동의 일환으로 수수료를 받을 수 있다">
          <label class="sr-only" for="q">쿠팡에서 제품 검색</label>
          <svg class="search__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input id="q" name="q" type="search" placeholder="쿠팡에서 제품 검색" autocomplete="off" required />
          <kbd aria-hidden="true">↵</kbd>
        </form>
      </div>
      <nav class="nav shell" aria-label="카테고리">
        <a class="nav__link ${active === 'home' ? 'is-active' : ''}" href="/">전체</a>
        ${navLinks(active)}
        <a class="nav__link nav__link--best ${active === 'best' ? 'is-active' : ''}" href="/best">추천 TOP</a>
        <a class="nav__link nav__link--best ${active === 'deals' ? 'is-active' : ''}" href="/deals">핫딜</a>
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
            <li><a href="/best">키워드별 추천 TOP</a></li>
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
    ${GA_ID ? html`<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}');(function(){var d=0;function go(){if(d)return;d=1;var s=document.createElement('script');s.src='https://www.googletagmanager.com/gtag/js?id=${GA_ID}';document.head.appendChild(s)}['scroll','pointerdown','keydown','touchstart'].forEach(function(e){addEventListener(e,go,{once:true,passive:true})});setTimeout(go,10000)})()</script>` : ''}
    ${CF_BEACON ? html`<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${CF_BEACON}"}'></script>` : ''}
  </body>
</html>`;
}
