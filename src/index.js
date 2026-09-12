import { htmlResponse, escapeHtml } from './lib/html.js';
import { homePage } from './views/home.js';
import { postPage } from './views/post.js';
import { listPage, categoriesPage } from './views/list.js';
import { aboutPage, privacyPage } from './views/about.js';
import { notFoundPage } from './views/notFound.js';
import { statsPage } from './views/stats.js';
import { ASSET_VERSION } from './views/layout.js';
import { categories, getCategory, categoryOfPost } from './data/categories.js';
import { getStore, searchSummaries, excerpt } from './data/store.js';

const HTML_CACHE = 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400';
const FEED_CACHE = 'public, max-age=0, s-maxage=1800, stale-while-revalidate=86400';
const PAGE_SIZE = 30;
const IMAGE_HOST_SUFFIXES = ['.coupangcdn.com', '.coupang.com'];
const IMAGE_HOSTS = ['coupangcdn.com', 'coupang.com'];
const OUT_HOST_SUFFIXES = ['.coupang.com', 'coupa.ng'];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const BOT_UA = /bot|crawl|spider|slurp|preview|fetch|scrape|headless|phantom|selenium|puppeteer|playwright|curl|wget|python|java\/|go-http|okhttp|axios|node|gptbot|chatgpt|oai-search|claude|anthropic|perplexity|bytespider|ccbot|cohere|diffbot|amazonbot|applebot|petalbot|yandex|semrush|ahrefs|mj12|dotbot|facebookexternalhit|whatsapp|telegram|discord|slack|lighthouse|pagespeed|pingdom|uptime|monitor/i;

function page(body, { status = 200, cache = HTML_CACHE } = {}) {
  return htmlResponse(body, { status, headers: { 'cache-control': cache } });
}

function xml(body, cache = FEED_CACHE) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}`, {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': cache },
  });
}

function text(body, type = 'text/plain; charset=utf-8', cache = FEED_CACHE) {
  return new Response(body, { headers: { 'content-type': type, 'cache-control': cache } });
}

function redirect(location, status = 301) {
  return new Response(null, { status, headers: { location } });
}

function postHref(origin, slug) {
  return `${origin}/${encodeURIComponent(slug)}`;
}

async function notFound(store, canonical) {
  const recent = (await store.summaries()).slice(0, 3);
  return page(notFoundPage({ canonical, recent }), { status: 404, cache: 'no-store' });
}

/* ── 이미지 프록시 · 아웃바운드 (기존 usb.kr 과 동일 규칙) ─────── */

function decodeImgToken(token) {
  let b64 = token.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  return decodeURIComponent(escape(atob(b64)));
}

function isAllowedImageHost(host) {
  return IMAGE_HOSTS.includes(host) || IMAGE_HOST_SUFFIXES.some((s) => host.endsWith(s));
}

async function proxyImage(token, nobg) {
  let target;
  try {
    target = new URL(decodeImgToken(token));
  } catch {
    return new Response('Invalid image', { status: 400 });
  }
  if (target.protocol !== 'https:' || !isAllowedImageHost(target.hostname)) {
    return new Response('Invalid image host', { status: 400 });
  }
  const image = { width: 600, quality: 78, format: 'webp' };
  if (nobg) image.segment = 'foreground';
  try {
    const res = await fetch(target.toString(), {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; usbkrBot/2.0)' },
      cf: { cacheTtl: 604800, cacheEverything: true, image },
    });
    if (!res.ok) return new Response('Image fetch failed', { status: 502 });
    const type = res.headers.get('content-type') ?? '';
    if (type && !type.startsWith('image/')) return new Response('Not an image', { status: 400 });
    const len = Number(res.headers.get('content-length') ?? 0);
    if (len > MAX_IMAGE_BYTES) return new Response('Image too large', { status: 413 });
    return new Response(res.body, {
      headers: { 'content-type': type || 'image/webp', 'cache-control': 'public, max-age=604800, immutable' },
    });
  } catch (e) {
    return new Response(`Image proxy error: ${e.message}`, { status: 502 });
  }
}

function outbound(url) {
  const dest = url.searchParams.get('u');
  if (!dest) return new Response('Missing url', { status: 400 });
  let parsed;
  try {
    parsed = new URL(dest);
  } catch {
    return new Response('Invalid url', { status: 400 });
  }
  const ok = parsed.protocol === 'https:' && OUT_HOST_SUFFIXES.some((s) => parsed.hostname === s.replace(/^\./, '') || parsed.hostname.endsWith(s));
  if (!ok) return new Response('Invalid destination', { status: 400 });
  return new Response(null, { status: 302, headers: { location: dest, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } });
}

/* ── 피드 · 사이트맵 ───────────────────────────────────────── */

function rssFeed(origin, list) {
  const items = list
    .slice(0, 50)
    .map(
      (p) => `    <item>
      <title>${escapeHtml(p.title)}</title>
      <link>${postHref(origin, p.slug)}</link>
      <guid isPermaLink="true">${postHref(origin, p.slug)}</guid>
      <pubDate>${new Date(p.createdAt).toUTCString()}</pubDate>
      <category>${escapeHtml(categoryOfPost(p)?.name ?? p.keyword ?? '')}</category>
      <description>${escapeHtml(p.tldr || p.metaDescription || excerpt(p.intro, 200))}</description>
    </item>`,
    )
    .join('\n');
  return xml(`<rss version="2.0">
  <channel>
    <title>USB.KR</title>
    <link>${origin}/</link>
    <description>전자기기 스펙과 가격을 비교하는 리뷰 매거진</description>
    <language>ko</language>
${items}
  </channel>
</rss>`);
}

function sitemap(origin, list) {
  const urls = [
    { loc: `${origin}/`, priority: '1.0' },
    { loc: `${origin}/posts`, priority: '0.7' },
    { loc: `${origin}/categories`, priority: '0.5' },
    { loc: `${origin}/about`, priority: '0.3' },
    ...categories.map((c) => ({ loc: `${origin}/category/${c.slug}`, priority: '0.6' })),
    ...list.map((p) => ({ loc: postHref(origin, p.slug), lastmod: String(p.createdAt).slice(0, 10), priority: '0.8' })),
  ];
  const body = urls
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <priority>${u.priority}</priority>
  </url>`,
    )
    .join('\n');
  return xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`);
}

function llmsTxt(origin, list) {
  const lines = list.slice(0, 40).map((p) => `- [${p.title}](${postHref(origin, p.slug)}): ${p.tldr || p.metaDescription || ''}`);
  return text(`# usb.kr

> 실시간 쿠팡 가격 데이터를 기반으로 전자기기 스펙과 가격을 비교하는 한국어 리뷰 매거진이다. AI 가 작성한 참고용 콘텐츠이며 정확한 스펙은 판매 페이지에서 확인을 권한다.

## 최근 게시글

${lines.join('\n')}
`);
}

/* ── 라우터 ────────────────────────────────────────────────── */

async function route(url, env, request) {
  const store = getStore(env);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const canonical = `${url.origin}${path}`;

  if (path === '/') {
    const [summaries, popular] = await Promise.all([store.summaries(), store.popular(6)]);
    return page(homePage({ canonical, summaries, popular }));
  }

  if (path === '/reviews') return redirect('/posts');

  if (path === '/posts') {
    const all = await store.summaries();
    const pageNo = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
    const items = all.slice((pageNo - 1) * PAGE_SIZE, pageNo * PAGE_SIZE);
    return page(
      listPage({
        eyebrow: pageNo > 1 ? `전체 글 · ${pageNo}페이지` : '전체 글',
        title: '비교와 리뷰 전체',
        description: '발행 순서대로 모아 둔 목록이다.',
        items,
        total: all.length,
        canonical: pageNo > 1 ? `${canonical}?page=${pageNo}` : canonical,
        active: '',
      }),
    );
  }

  if (path === '/categories') {
    const all = await store.summaries();
    const counts = new Map();
    for (const s of all) {
      const c = categoryOfPost(s);
      if (c) counts.set(c.slug, (counts.get(c.slug) ?? 0) + 1);
    }
    return page(categoriesPage({ canonical, counts }));
  }

  if (path === '/about') return page(aboutPage({ canonical }));
  if (path === '/0') {
    const key = env?.ADMIN_KEY;
    const cookie = request.headers.get('cookie') ?? '';
    if (key && url.searchParams.get('key') !== key && !cookie.includes(`adm=${key}`)) return notFound(store, canonical);
    const [summaries, visits] = await Promise.all([store.summaries(), store.visitStats()]);
    const res = page(statsPage({ canonical, summaries, visits }), { cache: 'no-store' });
    if (key) res.headers.set('set-cookie', `adm=${key}; Path=/0; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`);
    return res;
  }
  if (path === '/privacy') return page(privacyPage({ canonical }));

  if (path === '/search') {
    const q = url.searchParams.get('q') ?? '';
    const items = searchSummaries(await store.summaries(), q).slice(0, 60);
    return page(
      listPage({
        eyebrow: '검색',
        title: q ? `"${q}" 검색 결과` : '검색',
        description: q ? `${items.length}건을 찾았다.` : '제품명이나 키워드를 입력해 보자.',
        items,
        canonical,
        active: '',
        empty: '일치하는 글이 없다. 다른 키워드로 찾아보자.',
      }),
      { cache: 'no-store' },
    );
  }

  const categoryMatch = path.match(/^\/category\/([a-z0-9-]+)$/);
  if (categoryMatch) {
    const category = getCategory(categoryMatch[1]);
    if (!category) return notFound(store, canonical);
    const items = (await store.summaries()).filter((s) => categoryOfPost(s)?.slug === category.slug).slice(0, 60);
    return page(
      listPage({
        eyebrow: '카테고리',
        title: category.name,
        description: `${category.name} 분류의 비교와 리뷰.`,
        items,
        canonical,
        active: category.slug,
      }),
    );
  }

  if (path === '/rss.xml' || path === '/feed.xml') return rssFeed(url.origin, await store.summaries());
  if (path === '/sitemap.xml') return sitemap(url.origin, await store.summaries());
  if (path === '/llms.txt') return llmsTxt(url.origin, await store.summaries());
  if (path === '/robots.txt') return text(`User-agent: *\nAllow: /\nDisallow: /out\nDisallow: /search\nDisallow: /0\nSitemap: ${url.origin}/sitemap.xml\n`);

  if (path === '/healthz') {
    const all = await store.summaries();
    return Response.json({ ok: true, posts: all.length, source: env?.POSTS ? 'kv' : 'fixtures' }, { headers: { 'cache-control': 'no-store' } });
  }

  if (path.startsWith('/img/')) return proxyImage(path.slice(5), url.searchParams.get('nobg') === '1');
  if (path === '/out') return outbound(url);

  if (path.startsWith('/post/')) return redirect(`/${path.slice(6)}`);

  // 마지막으로 글 슬러그. 숫자 또는 "키워드-숫자" 형태이며 한글이 포함될 수 있다.
  const slugMatch = path.match(/^\/([^/]+)$/);
  if (slugMatch) {
    let slug;
    try {
      slug = decodeURIComponent(slugMatch[1]);
    } catch {
      return notFound(store, canonical);
    }
    const post = await store.get(slug);
    if (!post) return notFound(store, canonical);
    const cat = categoryOfPost(post);
    const all = await store.summaries();
    const same = all.filter((s) => s.slug !== slug && cat && categoryOfPost(s)?.slug === cat.slug);
    const rest = all.filter((s) => s.slug !== slug && !same.includes(s));
    const related = [...same, ...rest].slice(0, 3);
    const views = await store.viewCount(slug);
    return page(postPage(post, { canonical: postHref(url.origin, slug), related, views }));
  }

  return notFound(store, canonical);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 방문 비콘. 자바스크립트를 실행한 브라우저만 보내므로 크롤러와 AI 봇은 제외된다.
    if (request.method === 'POST' && url.pathname === '/hit') {
      const ua = request.headers.get('user-agent') ?? '';
      const bot = BOT_UA.test(ua) || request.cf?.botManagement?.verifiedBot === true;
      const path = (await request.text()).slice(0, 200).replace(/[^\w\-\/%.]/g, '');
      const returning = /(^|;\s*)uv=1(;|$)/.test(request.headers.get('cookie') ?? '');
      if (!bot && path && path !== '/0' && ctx) ctx.waitUntil(getStore(env).recordVisit(path, returning));
      return new Response(null, { status: 204, headers: returning ? {} : { 'set-cookie': 'uv=1; Max-Age=31536000; Path=/; Secure; SameSite=Lax' } });
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
    }

    if (url.pathname !== '/' && url.pathname.endsWith('/')) {
      const target = new URL(url);
      target.pathname = url.pathname.replace(/\/+$/, '');
      return Response.redirect(target.toString(), 301);
    }

    // 엣지 캐시: 공개 HTML 은 5분간 KV 를 건너뛴다 (응답의 s-maxage 를 따른다)
    const cacheable = request.method === 'GET' && !url.search && !['/0', '/search', '/healthz'].includes(url.pathname) && typeof caches !== 'undefined';
    // 캐시 키에 버전을 넣어 새 배포가 이전 캐시를 자동으로 버리게 한다
    const cacheKey = cacheable ? new Request(`${url.origin}${url.pathname}?v=${ASSET_VERSION}`) : null;
    if (cacheable) {
      const hit = await caches.default.match(cacheKey);
      if (hit) return hit;
    }
    const response = await route(url, env, request);
    if (cacheable && response.status === 200 && ctx) ctx.waitUntil(caches.default.put(cacheKey, response.clone()));
    if (request.method === 'HEAD') {
      return new Response(null, { status: response.status, headers: response.headers });
    }
    return response;
  },
};
