/**
 * 같은 사람이 운영하는 쿠팡 파트너스 사이트(bodcar.com · vuty.kr · seareal.kr · zakgong.com)의 /0 통계를 usb.kr/0 에서 같이 본다. — 작업: 2026-11-17 15:21
 * 메인은 usb.kr 이고 이 둘은 요약만 가져와 붙인다. 각 사이트의 /0 은 Basic 인증이라
 * 그 사이트의 ADMIN_PASSWORD 와 같은 값을 이 워커의 시크릿(BODCAR_ADMIN_PASSWORD · VUTY_ADMIN_PASSWORD · SEAREAL_ADMIN_PASSWORD · ZAKGONG_ADMIN_PASSWORD · PEMILY_ADMIN_PASSWORD · BEBEPONG_ADMIN_PASSWORD)으로 넣어야 뜬다.
 * 그쪽 코드는 손대지 않고 이미 있는 /0 HTML 에서 KPI 카드만 긁어온다.
 */
import { edgeCached } from './edgecache.js';

const TTL = 10 * 60 * 1000;
let cache = { at: 0, data: [], sig: '' };

// 통계를 가져올 그룹 사이트 목록 (seareal 추가) — 작업: 2026-11-17 15:21
const SITES = [
  { key: 'bodcar', name: 'bodcar.com', url: 'https://bodcar.com/0', env: 'BODCAR_ADMIN_PASSWORD' },
  { key: 'vuty', name: 'vuty.kr', url: 'https://vuty.kr/0', env: 'VUTY_ADMIN_PASSWORD' },
  { key: 'seareal', name: 'seareal.kr', url: 'https://seareal.kr/0', env: 'SEAREAL_ADMIN_PASSWORD' },
  { key: 'zakgong', name: 'zakgong.com', url: 'https://zakgong.com/0', env: 'ZAKGONG_ADMIN_PASSWORD' },
  { key: 'pemily', name: 'pemily.kr', url: 'https://pemily.kr/0', env: 'PEMILY_ADMIN_PASSWORD' },
  { key: 'bebepong', name: 'bbping.kr', url: 'https://bbping.kr/0', env: 'BEBEPONG_ADMIN_PASSWORD' },
  { key: 'noridong', name: 'noridong.com', url: 'https://noridong.com/0', env: 'NORIDONG_ADMIN_PASSWORD', shared: true, direct: true }, // 같은 워커라 비밀번호가 다른 사이트와 같다
];

// 카드를 누르면 가는 주소: 기본은 그 사이트의 /0 로 바로 간다 (direct: false 로 적은 사이트만 이 사이트 안의 중계 경로로 비밀번호 없이 연다)
const linkOf = (site) => (site.direct === false ? `/0/go/${site.key}` : site.url);

// 사이트 비밀번호. shared 사이트는 전용 시크릿이 없으면 다른 사이트의 같은 비밀번호를 쓴다
const pwOf = (env, site) => env?.[site.env] || (site.shared ? SITES.map((x) => env?.[x.env]).find(Boolean) : '') || '';

function parseKpis(html) {
  const re = /<div class="kpi"><b>([^<]*)<\/b><span>([^<]*)<\/span><\/div>/g;
  const kpis = [];
  for (const m of html.matchAll(re)) kpis.push({ value: m[1], label: m[2] });
  return kpis;
}

function auth(env, site) {
  return `Basic ${btoa(`:${pwOf(env, site)}`)}`;
}

async function loadOne(site, env) {
  const res = await fetch(site.url, { headers: { authorization: auth(env, site) }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const kpis = parseKpis(html);
  if (!kpis.length) throw new Error('KPI 를 못 읽었다 (페이지 형식이 바뀌었을 수 있다)');
  return { name: site.name, path: linkOf(site), kpis };
}

/** [{name, path, kpis} | {name, path, error}] 배열. 시크릿이 없는 사이트는 뺀다. ctx 를 주면 콜로 캐시도 같이 쓴다. */
export async function siblingStats(env, ctx) {
  const sites = SITES.filter((s) => pwOf(env, s));
  if (!sites.length) return [];
  const sig = sites.map((s) => s.key).join('-'); // 사이트가 늘거나 시크릿이 바뀌면 캐시를 새로 만든다
  if (cache.sig === sig && Date.now() - cache.at < TTL) return cache.data;
  const key = new Request(`https://edge-cache.internal/sibling-stats-v6-${sig}`);
  let data = null;
  try { const hit = await caches.default.match(key); if (hit) data = await hit.json(); } catch {}
  if (!data) {
    data = await Promise.all(
      sites.map((s) =>
        loadOne(s, env).catch((e) => ({ name: s.name, path: linkOf(s), error: e.message })),
      ),
    );
    // 실패가 하나라도 있으면 1분만 보관해서 곧바로 다시 시도하게 한다
    const ttl = data.some((d) => d.error) ? 60 : TTL / 1000;
    if (ctx) ctx.waitUntil(caches.default.put(key, new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json', 'cache-control': `max-age=${ttl}` } })).catch(() => {}));
    cache = { at: Date.now() - (TTL - ttl * 1000), data, sig };
    return data;
  }
  cache = { at: data.some((d) => d.error) ? Date.now() - (TTL - 60000) : Date.now(), data, sig };
  return data;
}

/** 모든 사이트 배너의 노출과 클릭 7일 합계 (vuty.kr 이 모아 둔 숫자). 시크릿이 없거나 실패하면 null. 10분 캐시 */
export async function bannerSummary(env, ctx) {
  const pw = SITES.map((x) => env?.[x.env]).find(Boolean);
  if (!pw) return null;
  return edgeCached(ctx, 'banner-summary-v1', 600, async () => {
    const res = await fetch('https://vuty.kr/0/bn.json?d=7', { headers: { authorization: `Basic ${btoa(`:${pw}`)}` }, signal: AbortSignal.timeout(15000) }).catch(() => null);
    if (!res || !res.ok) return { error: res ? `HTTP ${res.status}` : '접속 실패' };
    const j = await res.json().catch(() => null);
    return j && j.total ? { total: j.total, video: j.video, image: j.image } : { error: '숫자를 못 읽었다' };
  });
}

/** usb.kr/0/go/<key> 로 들어온 요청을 그 사이트의 /0 에 Basic 인증을 붙여 그대로 중계한다 (비밀번호를 다시 안 물어본다).
 * 응답 HTML 안의 자기 자신 링크(/0?d=...)와 삭제·공지 POST(fetch('/0',...))만 이 중계 경로로 고쳐 써서
 * 탭 전환과 글 삭제 버튼이 계속 이 경로를 통해 동작하게 한다. 시크릿이 없으면 null. */
export async function siblingProxy(key, request, env) {
  const site = SITES.find((s) => s.key === key);
  if (!site || !pwOf(env, site)) return null;
  const target = new URL(site.url);
  target.search = new URL(request.url).search;
  const init = { headers: { authorization: auth(env, site) }, signal: AbortSignal.timeout(20000) };
  if (request.method === 'POST') {
    init.method = 'POST';
    init.headers['content-type'] = request.headers.get('content-type') || 'application/json';
    init.body = await request.text();
  }
  const res = await fetch(target.toString(), init);
  const type = res.headers.get('content-type') || 'text/html; charset=utf-8';
  let body = await res.text();
  if (type.includes('text/html')) {
    const base = `/0/go/${key}`;
    body = body.replace(/href="\/0(\?[^"]*)?"/g, (_, q) => `href="${base}${q ?? ''}"`).replace(/fetch\('\/0'/g, `fetch('${base}'`);
  }
  return new Response(body, { status: res.status, headers: { 'content-type': type, 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
}
