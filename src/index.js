import { htmlResponse, escapeHtml } from './lib/html.js';
import { homePage } from './views/home.js';
import { postPage } from './views/post.js';
import { listPage, categoriesPage } from './views/list.js';
import { aboutPage, privacyPage } from './views/about.js';
import { statsPage } from './views/stats.js';
import { bestGroups, bestIndexPage, bestPage, bestUrl } from './views/best.js';
import { dealsPage } from './views/deals.js';
import { ASSET_VERSION, setTracking, setInlineCss } from './views/layout.js';
import { gaReport, gscReport } from './lib/ga.js';
import { coupangConfigured, deeplink, searchUrl, productCount } from './lib/coupang.js';
import { categories, getCategory, categoryOfPost } from './data/categories.js';
import { getStore, searchSummaries, excerpt } from './data/store.js';
import { imgProxy } from './views/components.js';

const HTML_CACHE = 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400';
const FEED_CACHE = 'public, max-age=0, s-maxage=1800, stale-while-revalidate=86400';
const PAGE_SIZE = 30;
const IMAGE_HOST_SUFFIXES = ['.coupangcdn.com', '.coupang.com', '.ytimg.com'];
const IMAGE_HOSTS = ['coupangcdn.com', 'coupang.com'];
const OUT_HOST_SUFFIXES = ['.coupang.com', 'coupa.ng'];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const BOT_UA = /bot|crawl|spider|slurp|preview|fetch|scrape|headless|phantom|selenium|puppeteer|playwright|curl|wget|python|java\/|go-http|okhttp|axios|node|gptbot|chatgpt|oai-search|claude|anthropic|perplexity|bytespider|ccbot|cohere|diffbot|amazonbot|applebot|petalbot|yeti|daumoa|kakaotalk-scrap|yandex|semrush|ahrefs|mj12|dotbot|facebookexternalhit|whatsapp|telegram|discord|slack|lighthouse|pagespeed|pingdom|uptime|monitor/i;

// Link 헤더는 Cloudflare Early Hints(103) 로 나가 HTML 이 도착하기 전에 CSS 와 폰트 연결을 시작한다
const EARLY_HINTS = [
  '<https://fonts.googleapis.com>; rel=preconnect',
  '<https://fonts.gstatic.com>; rel=preconnect; crossorigin',
  '<https://cdn.jsdelivr.net>; rel=preconnect; crossorigin',
].join(', ');

function page(body, { status = 200, cache = HTML_CACHE, noindex = false } = {}) {
  return htmlResponse(body, { status, headers: { 'cache-control': cache, link: EARLY_HINTS, ...(noindex ? { 'x-robots-tag': 'noindex, nofollow' } : {}) } });
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

/** 사진에서 쿠팡 검색어로 쓸 제품명 한 줄을 읽는다. */
async function productFromPhoto(env, file) {
  if (!env?.AI) throw new Error('AI 바인딩이 없다');
  const model = env.VISION_MODEL || '@cf/meta/llama-3.2-11b-vision-instruct';
  const input = {
    prompt: '이 사진에 있는 전자제품의 브랜드와 모델명을 쇼핑몰 검색어로 쓸 수 있게 한 줄로만 답하라. 설명 없이 제품명만. 브랜드나 모델명이 안 보이면 제품 종류와 특징을 한국어로 짧게 (예: 맥세이프 보조배터리 10000mAh).',
    image: [...new Uint8Array(await file.arrayBuffer())],
    max_tokens: 60,
  };
  let r;
  try {
    r = await env.AI.run(model, input);
  } catch (e) {
    // 라마 모델은 계정당 한 번 'agree' 프롬프트로 라이선스에 동의해야 한다 (오류 5016). 동의를 보내고 한 번 다시 부른다.
    if (!/5016|'agree'/.test(String(e?.message))) throw e;
    await env.AI.run(model, { prompt: 'agree' });
    r = await env.AI.run(model, input);
  }
  const text = String(r?.response ?? r?.choices?.[0]?.message?.content ?? r?.description ?? '').trim();
  const name = text.split('\n')[0].replace(/^[\s"'*:-]+|[\s"'*.]+$/g, '').slice(0, 80);
  if (!name) throw new Error('제품명을 못 읽었다');
  return name;
}

/** 검색어가 발행할 만한 제품 종류인지 판단해 D1 에 넣는다. 검색 응답 뒤에 waitUntil 로 돈다. */
async function judgeKeyword(env, store, q) {
  if (!env?.AI || q.length < 2 || q.length > 30 || /[<>{}\[\]"'`$]/.test(q) || (await store.hasKeyword(q))) return;
  const r = await env.AI.run(env.JUDGE_MODEL || '@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      { role: 'system', content: '전자기기·가전 리뷰 사이트의 편집자다. 검색어가 "리뷰 글로 쓸 만한 전자기기나 가전 제품 종류" 인지 판단한다. 사람 이름 · 브랜드만 있는 것 · 성인 · 의약품 · 식품 · 의류 · 모호한 단어는 아니오. JSON 하나만 출력: {"ok":true|false,"keyword":"분류 키워드 (예: 보조배터리 · 공백 없이)","t":"글이 노릴 검색어 (예: 맥세이프 보조배터리 추천)"}' },
      { role: 'user', content: `검색어: ${q}` },
    ],
    max_tokens: 120,
  });
  const text = String(r?.response ?? r?.choices?.[0]?.message?.content ?? '');
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return;
  let j;
  try {
    j = JSON.parse(m[0]);
  } catch {
    return;
  }
  if (!j.ok) return;
  if ((await productCount(env, q)) < 3) return;
  await store.addKeyword({ q, keyword: String(j.keyword || q).replace(/\s+/g, '').slice(0, 30), t: String(j.t || `${q} 추천`).slice(0, 60) });
}

function isAdmin(request, url, env) {
  const key = env?.ADMIN_KEY;
  return !key || url.searchParams.get('key') === key || (request.headers.get('cookie') ?? '').includes(`adm=${key}`);
}

function notFound(url) {
  // 본 도메인에서 돌 때는 옛 사이트가 없으니 홈으로 보낸다
  return redirect(url.hostname === 'usb.kr' ? '/' : `https://usb.kr${url.pathname}`, 301);
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

let cssLoaded = false;

async function proxyImage(token, nobg, w) {
  let target;
  try {
    target = new URL(decodeImgToken(token));
  } catch {
    return new Response('Invalid image', { status: 400 });
  }
  if (target.protocol !== 'https:' || !isAllowedImageHost(target.hostname)) {
    return new Response('Invalid image host', { status: 400 });
  }
  const width = [96, 120, 192, 200, 230, 240, 300, 320, 400, 440, 600].includes(w) ? w : 600;
  const image = { width, quality: 80, format: 'webp' };
  if (nobg) image.segment = 'foreground';
  try {
    // 쿠팡 이미지 서버가 봇 UA 나 연속 요청에 가끔 HTML 을 준다 (변환기가 415 로 거절). 브라우저 UA 로 부르고 실패는 캐시하지 않는다.
    // 변환이 두 번 실패하면 변환 없이 원본이라도 낸다. 깨진 그림보다 JPEG 가 낫다.
    const headers = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36', accept: 'image/avif,image/webp,image/*,*/*;q=0.8' };
    const cache = { cacheTtlByStatus: { '200-299': 604800, '300-599': 0 }, cacheEverything: true };
    let res = await fetch(target.toString(), { headers, cf: { ...cache, image } });
    const firstErr = res.ok ? '' : `${res.status} ${res.headers.get('cf-resized') ?? ''}`;
    if (!res.ok) res = await fetch(target.toString(), { headers, cf: { ...cache, image } });
    if (!res.ok) res = await fetch(target.toString(), { headers, cf: cache });
    if (!res.ok) return new Response(`Image fetch failed (${res.status} ${res.headers.get('cf-resized') ?? ''})`, { status: 502, headers: { 'cache-control': 'no-store' } });
    const type = res.headers.get('content-type') ?? '';
    if (type && !type.startsWith('image/')) return new Response('Not an image', { status: 400 });
    const len = Number(res.headers.get('content-length') ?? 0);
    if (len > MAX_IMAGE_BYTES) return new Response('Image too large', { status: 413 });
    return new Response(res.body, {
      headers: { 'content-type': type || 'image/webp', 'cache-control': 'public, max-age=31536000, immutable', 'cf-resized': res.headers.get('cf-resized') ?? 'none', ...(firstErr ? { 'x-img-err': firstErr } : {}) },
    });
  } catch (e) {
    return new Response(`Image proxy error: ${e.message}`, { status: 502 });
  }
}

function outbound(url, request, env, ctx) {
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
  const slug = url.searchParams.get('s') ?? '';
  const h = (k) => request.headers.get(k) ?? '';
  const bot = BOT_UA.test(h('user-agent')) || request.cf?.botManagement?.verifiedBot === true;
  // 사람 클릭만 센다. 링크를 따라다니는 크롤러는 UA 로 다 못 거르므로 사용자 조작으로 시작한 이동(sec-fetch-user) 이거나 우리 페이지에서 온 이동만 인정한다.
  const human = !bot && (h('sec-fetch-user') === '?1' || (h('sec-fetch-mode') === 'navigate' && /^https:\/\/(www\.)?usb\.kr\//.test(h('referer'))));
  if (slug && human && ctx) ctx.waitUntil(getStore(env).recordClick(slug.slice(0, 80)));
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
  return xml(`<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>USB.KR</title>
    <link>${origin}/</link>
    <atom:link href="${origin}/rss.xml" rel="self" type="application/rss+xml" />
    <description>전자기기 스펙과 가격을 비교하는 리뷰 매거진</description>
    <language>ko</language>
    <lastBuildDate>${new Date(list[0]?.createdAt ?? Date.now()).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`);
}

function sitemap(origin, list) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: `${origin}/`, priority: '1.0', lastmod: String(list[0]?.createdAt ?? '').slice(0, 10) || undefined },
    { loc: `${origin}/posts`, priority: '0.7' },
    { loc: `${origin}/best`, priority: '0.8', lastmod: today },
    { loc: `${origin}/deals`, priority: '0.8', lastmod: today },
    ...bestGroups(list).map((g) => ({ loc: `${origin}${bestUrl(g.keyword)}`, priority: '0.8', lastmod: today })),
    { loc: `${origin}/categories`, priority: '0.5' },
    { loc: `${origin}/about`, priority: '0.3' },
    ...categories.map((c) => ({ loc: `${origin}/category/${c.slug}`, priority: '0.6' })),
    ...list.map((p) => ({ loc: postHref(origin, p.slug), lastmod: String(p.createdAt).slice(0, 10), priority: '0.8', image: p.products?.[0]?.image ? `${origin}${imgProxy(p.products[0].image)}` : null, title: p.title })),
  ];
  const body = urls
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <priority>${u.priority}</priority>${u.image ? `\n    <image:image><image:loc>${escapeHtml(u.image)}</image:loc><image:title>${escapeHtml(u.title)}</image:title></image:image>` : ''}
  </url>`,
    )
    .join('\n');
  return xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${body}\n</urlset>`);
}

const LLMS_INTRO = `# usb.kr

> 실시간 쿠팡 가격 데이터를 기반으로 전자기기 스펙과 가격을 비교하는 한국어 리뷰 매거진이다. AI 가 작성한 참고용 콘텐츠이며 정확한 스펙은 판매 페이지에서 확인을 권한다.
> 인용할 때는 글 제목과 URL 을 함께 표기해 달라. 가격은 게재 시점 기준이다.
`;

function llmsTxt(origin, list) {
  const lines = list.slice(0, 40).map((p) => `- [${p.title}](${postHref(origin, p.slug)}): ${p.tldr || p.metaDescription || ''}`);
  return text(`${LLMS_INTRO}
## 최근 게시글

${lines.join('\n')}

## 전문
- [llms-full.txt](${origin}/llms-full.txt): 최근 글 30건의 본문 전체
`);
}

/** AI 검색용 전문. 최근 30건의 제목 · 요약 · 본문 · 제품 · FAQ 를 마크다운으로 준다. */
function llmsFullTxt(origin, posts) {
  const strip = (h) => String(h ?? '').replace(/<\/(p|h\d|li)>/gi, '\n').replace(/<[^>]+>/g, '').replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim();
  const docs = posts.map((p) => {
    const cat = categoryOfPost(p)?.name ?? p.keyword;
    const products = (p.products ?? []).map((x, i) => `${i + 1}. ${x.name} — ${Number(x.price) > 0 ? `${Number(x.price).toLocaleString('ko-KR')}원` : '가격 미확인'}`).join('\n');
    const sections = (p.sections ?? []).map((s) => `### ${s.heading ?? ''}\n${strip(s.body_html)}`).join('\n\n');
    const faq = (p.faq ?? []).map((f) => `- Q: ${f.q}\n  A: ${strip(f.a)}`).join('\n');
    return `## ${p.title}
- URL: ${postHref(origin, p.slug)}
- 게재: ${String(p.createdAt).slice(0, 10)} · 분류: ${cat} · 키워드: ${p.keyword}
${p.tldr ? `- 한줄요약: ${p.tldr}\n` : ''}
${strip(p.intro)}

${sections}
${products ? `\n### 다룬 제품 (쿠팡 · 게재 시점 가격)\n${products}\n` : ''}${faq ? `\n### 자주 묻는 질문\n${faq}\n` : ''}${p.outro ? `\n${strip(p.outro)}\n` : ''}`;
  });
  return text(`${LLMS_INTRO}\n${docs.join('\n\n---\n\n')}\n`);
}

/* ── 라우터 ────────────────────────────────────────────────── */

async function route(url, env, request, ctx) {
  const store = getStore(env);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const canonical = `${url.origin}${path}`;

  if (path === '/') {
    const [summaries, popular, deals] = await Promise.all([store.summaries(), store.popular(6), store.deals()]);
    return page(homePage({ canonical, summaries, popular, deals }));
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

  if (path === '/deals') return page(dealsPage({ canonical, deals: await store.deals() }));
  if (path === '/best' || path.startsWith('/best/')) {
    const [summaries, views] = await Promise.all([store.summaries(), store.viewsByPath()]);
    const groups = bestGroups(summaries, views);
    if (path === '/best') return page(bestIndexPage({ canonical, groups }));
    let keyword;
    try {
      keyword = decodeURIComponent(path.slice(6));
    } catch {
      return notFound(url);
    }
    const group = groups.find((g) => g.keyword === keyword);
    if (!group) return notFound(url);
    return page(bestPage({ canonical: `${url.origin}${bestUrl(keyword)}`, group }));
  }
  // 검색창에서 추가된 키워드. 발행기가 풀에 합친다
  if (path === '/0/keywords') {
    if (!isAdmin(request, url, env)) return notFound(url);
    return Response.json(await store.keywords(), { headers: { 'cache-control': 'no-store' } });
  }
  // VM 발행기가 가져가는 대기 목록
  if (path === '/0/queue') {
    if (!isAdmin(request, url, env)) return notFound(url);
    return Response.json(await store.pendingGen(), { headers: { 'cache-control': 'no-store' } });
  }
  if (path === '/0') {
    const key = env?.ADMIN_KEY;
    if (!isAdmin(request, url, env)) return notFound(url);
    const [summaries, visits, ga, gsc, runs, clicks, queue, extraKeywords] = await Promise.all([
      store.summaries(),
      store.visitStats(),
      gaReport(env).catch((e) => ({ error: e.message })),
      gscReport(env).catch((e) => ({ error: e.message })),
      store.genRuns(),
      store.clickStats(),
      store.genQueue(),
      store.keywords(30),
    ]);
    const res = page(statsPage({ canonical, summaries, visits, ga, gsc, runs, clicks, queue, extraKeywords, msg: url.searchParams.get('msg') ?? '', siteUrl: env?.SITE_URL || url.origin, psiKey: env?.PSI_KEY ?? '', viduOffpeak: env?.VIDU_OFFPEAK ?? '' }), { cache: 'no-store', noindex: true });
    if (key) res.headers.set('set-cookie', `adm=${key}; Path=/0; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`);
    return res;
  }
  if (path === '/privacy') return page(privacyPage({ canonical }));

  if (path === '/search') {
    const q = (url.searchParams.get('q') ?? '').trim().slice(0, 80);
    // 검색창은 쿠팡 파트너스 검색으로 보낸다. 키워드마다 딥링크를 만들어 30일 캐시하고 클릭은 search 로 센다. 키가 없으면 사이트 안 검색
    if (q && coupangConfigured(env)) {
      const link = await deeplink(env, searchUrl(q)).catch((e) => (console.warn(e.message), searchUrl(q)));
      if (ctx) ctx.waitUntil(Promise.all([store.recordClick('search'), judgeKeyword(env, store, q).catch((e) => console.warn(`검색어 판단 실패: ${e.message}`))]));
      return new Response(null, { status: 302, headers: { location: link, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } });
    }
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
      { cache: 'no-store', noindex: true },
    );
  }

  const categoryMatch = path.match(/^\/category\/([a-z0-9-]+)$/);
  if (categoryMatch) {
    const category = getCategory(categoryMatch[1]);
    if (!category) return notFound(url);
    const all = await store.summaries();
    const items = all.filter((s) => categoryOfPost(s)?.slug === category.slug).slice(0, 60);
    return page(
      listPage({
        eyebrow: '카테고리',
        title: category.name,
        description: category.desc,
        items,
        canonical,
        active: category.slug,
        best: bestGroups(all).filter((g) => g.category?.slug === category.slug),
      }),
    );
  }

  if (path === '/rss.xml' || path === '/feed.xml') return rssFeed(url.origin, await store.summaries());
  if (path === '/sitemap.xml') return sitemap(url.origin, await store.summaries());
  if (path === '/llms.txt') return llmsTxt(url.origin, await store.summaries());
  if (path === '/llms-full.txt') {
    const slugs = (await store.summaries()).slice(0, 30).map((s) => s.slug);
    return llmsFullTxt(url.origin, await store.getMany(slugs));
  }
  // IndexNow 키 확인 파일
  if (env?.INDEXNOW_KEY && path === `/${env.INDEXNOW_KEY}.txt`) return text(env.INDEXNOW_KEY);
  if (path === '/robots.txt') {
    const ai = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'anthropic-ai', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended', 'Bytespider', 'CCBot', 'Amazonbot', 'meta-externalagent', 'DuckAssistBot', 'YouBot', 'cohere-ai'];
    return text(`User-agent: *\nAllow: /\nDisallow: /out\nDisallow: /search\nDisallow: /0\nDisallow: /img/\nDisallow: /hit\n\nUser-agent: Yeti\nAllow: /\nDisallow: /out\nDisallow: /search\nDisallow: /0\n\n${ai.map((b) => `User-agent: ${b}\nAllow: /\n`).join('\n')}\nSitemap: ${url.origin}/sitemap.xml\n# AI 안내: ${url.origin}/llms.txt · 전문 ${url.origin}/llms-full.txt\n`);
  }

  if (path === '/healthz') {
    const all = await store.summaries();
    return Response.json({ ok: true, posts: all.length, source: env?.POSTS ? 'kv' : 'fixtures' }, { headers: { 'cache-control': 'no-store' } });
  }

  if (path.startsWith('/img/')) return proxyImage(path.slice(5), url.searchParams.get('nobg') === '1', Number(url.searchParams.get('w')));
  if (path === '/out') return outbound(url, request, env, ctx);

  if (path.startsWith('/post/')) return redirect(`/${path.slice(6)}`);

  // 마지막으로 글 슬러그. 숫자 또는 "키워드-숫자" 형태이며 한글이 포함될 수 있다.
  const slugMatch = path.match(/^\/([^/]+)$/);
  if (slugMatch) {
    let slug;
    try {
      slug = decodeURIComponent(slugMatch[1]);
    } catch {
      return notFound(url);
    }
    const [post, all, views] = await Promise.all([store.get(slug), store.summaries(), store.viewCount(slug)]);
    if (!post) return notFound(url);
    const cat = categoryOfPost(post);
    const same = all.filter((s) => s.slug !== slug && cat && categoryOfPost(s)?.slug === cat.slug);
    const rest = all.filter((s) => s.slug !== slug && !same.includes(s));
    const related = [...same, ...rest].slice(0, 3);
    const best = bestGroups(all).find((g) => g.keyword === post.keyword) ?? null;
    return page(postPage(post, { canonical: postHref(url.origin, slug), related, views, best }));
  }

  return notFound(url);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    setTracking(env);
    if (!cssLoaded && env?.ASSETS) {
      cssLoaded = true; // 실패해도 다시 안 읽는다. 그때는 <link> 로 낸다
      const css = await env.ASSETS.fetch(new Request(`${url.origin}/assets/styles.css`)).then((r) => (r.ok ? r.text() : '')).catch(() => '');
      if (css) setInlineCss(css);
    }

    // 정식 주소는 usb.kr 하나. 옛 n.usb.kr 링크와 www 는 같은 경로로 301 해 검색 신뢰를 한곳에 모은다
    if ((url.hostname === 'n.usb.kr' || url.hostname === 'www.usb.kr') && request.method !== 'POST') {
      return redirect(`https://usb.kr${url.pathname}${url.search}`, 301);
    }

    // 방문 비콘. 자바스크립트를 실행한 브라우저만 보내므로 크롤러와 AI 봇은 제외된다.
    if (request.method === 'POST' && url.pathname === '/hit') {
      const ua = request.headers.get('user-agent') ?? '';
      const bot = BOT_UA.test(ua) || request.cf?.botManagement?.verifiedBot === true;
      const path = (await request.text()).slice(0, 200).replace(/[^\w\-\/%.]/g, '');
      const returning = /(^|;\s*)uv=1(;|$)/.test(request.headers.get('cookie') ?? '');
      if (!bot && path && path !== '/0' && ctx) ctx.waitUntil(getStore(env).recordVisit(path, returning));
      return new Response(null, { status: 204, headers: returning ? {} : { 'set-cookie': 'uv=1; Max-Age=31536000; Path=/; Secure; SameSite=Lax' } });
    }

    // 관리자: 글 생성 요청 넣기 (폼) · 결과 적기 (VM 발행기)
    if (request.method === 'POST' && (url.pathname === '/0/gen' || url.pathname === '/0/queue')) {
      if (!isAdmin(request, url, env)) return notFound(url);
      const store = getStore(env);
      if (url.pathname === '/0/gen') {
        const form = await request.formData();
        let q = String(form.get('q') ?? '').trim().slice(0, 80);
        const photo = form.get('photo');
        let msg = '';
        if (!q && photo && typeof photo === 'object' && photo.size > 0) {
          try {
            q = await productFromPhoto(env, photo);
            msg = `사진에서 읽은 제품명: ${q}`;
          } catch (e) {
            msg = `사진 인식 실패: ${e.message}`;
          }
        }
        const keyword = String(form.get('keyword') ?? '').trim().replace(/\s+/g, '').slice(0, 40) || q;
        if (q) await store.enqueueGen(q, keyword);
        return redirect(`/0${msg ? `?msg=${encodeURIComponent(msg)}` : ''}`, 303);
      }
      const body = await request.json().catch(() => ({}));
      if (body?.id) await store.finishGen(body.id, Boolean(body.ok), body.ok ? body.slug : body.err);
      return Response.json({ ok: true });
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
    const isImg = url.pathname.startsWith('/img/');
    const cacheable = request.method === 'GET' && (!url.search || isImg) && !['/0', '/search', '/healthz'].includes(url.pathname) && typeof caches !== 'undefined';
    // 캐시 키에 버전을 넣어 새 배포가 이전 캐시를 자동으로 버리게 한다. 이미지는 폭(w) 마다 따로 둔다
    const cacheKey = cacheable ? new Request(`${url.origin}${url.pathname}?${isImg ? `${url.searchParams}&` : ''}v=${ASSET_VERSION}`) : null;
    if (cacheable) {
      const hit = await caches.default.match(cacheKey);
      if (hit) return hit;
    }
    const response = await route(url, env, request, ctx);
    if (cacheable && response.status === 200 && ctx) ctx.waitUntil(caches.default.put(cacheKey, response.clone()));
    if (request.method === 'HEAD') {
      return new Response(null, { status: response.status, headers: response.headers });
    }
    return response;
  },
};
