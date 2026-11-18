/**
 * 같은 사람이 운영하는 쿠팡 파트너스 사이트(bodcar.com · vuty.kr)의 /0 통계를 usb.kr/0 에서 같이 본다.
 * 메인은 usb.kr 이고 이 둘은 요약만 가져와 붙인다. 각 사이트의 /0 은 Basic 인증이라
 * 그 사이트의 ADMIN_PASSWORD 와 같은 값을 이 워커의 시크릿(BODCAR_ADMIN_PASSWORD · VUTY_ADMIN_PASSWORD)으로 넣어야 뜬다.
 * 그쪽 코드는 손대지 않고 이미 있는 /0 HTML 에서 KPI 카드만 긁어온다.
 */
import { edgeCached } from './edgecache.js';

const TTL = 10 * 60 * 1000;
let cache = { at: 0, data: [] };

const SITES = [
  { key: 'bodcar', name: 'bodcar.com', url: 'https://bodcar.com/0', env: 'BODCAR_ADMIN_PASSWORD' },
  { key: 'vuty', name: 'vuty.kr', url: 'https://vuty.kr/0', env: 'VUTY_ADMIN_PASSWORD' },
  { key: 'seareal', name: 'seareal.kr', url: 'https://seareal.kr/0', env: 'SEAREAL_ADMIN_PASSWORD' },
];

function parseKpis(html) {
  const re = /<div class="kpi"><b>([^<]*)<\/b><span>([^<]*)<\/span><\/div>/g;
  const kpis = [];
  for (const m of html.matchAll(re)) kpis.push({ value: m[1], label: m[2] });
  return kpis;
}

function auth(env, site) {
  return `Basic ${btoa(`:${env[site.env]}`)}`;
}

async function loadOne(site, env) {
  const res = await fetch(site.url, { headers: { authorization: auth(env, site) }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const kpis = parseKpis(html);
  if (!kpis.length) throw new Error('KPI 를 못 읽었다 (페이지 형식이 바뀌었을 수 있다)');
  return { name: site.name, path: `/0/go/${site.key}`, kpis };
}

/** [{name, path, kpis} | {name, path, error}] 배열. 시크릿이 없는 사이트는 뺀다. ctx 를 주면 콜로 캐시도 같이 쓴다. */
export async function siblingStats(env, ctx) {
  const sites = SITES.filter((s) => env?.[s.env]);
  if (!sites.length) return [];
  if (Date.now() - cache.at < TTL) return cache.data;
  const data = await edgeCached(ctx, 'sibling-stats-v2', TTL / 1000, async () =>
    Promise.all(
      sites.map((s) =>
        loadOne(s, env)
          .catch((e) => ({ name: s.name, path: `/0/go/${s.key}`, error: e.message })),
      ),
    ),
  );
  cache = { at: Date.now(), data };
  return data;
}

/** usb.kr/0/go/<key> 로 들어온 요청을 그 사이트의 /0 에 Basic 인증을 붙여 그대로 중계한다 (비밀번호를 다시 안 물어본다).
 * 응답 HTML 안의 자기 자신 링크(/0?d=...)와 삭제·공지 POST(fetch('/0',...))만 이 중계 경로로 고쳐 써서
 * 탭 전환과 글 삭제 버튼이 계속 이 경로를 통해 동작하게 한다. 시크릿이 없으면 null. */
export async function siblingProxy(key, request, env) {
  const site = SITES.find((s) => s.key === key);
  if (!site || !env?.[site.env]) return null;
  const target = new URL(site.url);
  target.search = new URL(request.url).search;
  const init = { headers: { authorization: auth(env, site) }, signal: AbortSignal.timeout(8000) };
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
