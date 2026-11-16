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
];

function parseKpis(html) {
  const re = /<div class="kpi"><b>([^<]*)<\/b><span>([^<]*)<\/span><\/div>/g;
  const kpis = [];
  for (const m of html.matchAll(re)) kpis.push({ value: m[1], label: m[2] });
  return kpis;
}

async function loadOne(site, env) {
  const pass = env[site.env];
  const auth = `Basic ${btoa(`:${pass}`)}`;
  const res = await fetch(site.url, { headers: { authorization: auth }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const kpis = parseKpis(html);
  if (!kpis.length) throw new Error('KPI 를 못 읽었다 (페이지 형식이 바뀌었을 수 있다)');
  return { name: site.name, url: site.url, kpis };
}

/** [{name, url, kpis} | {name, url, error}] 배열. 시크릿이 없는 사이트는 뺀다. ctx 를 주면 콜로 캐시도 같이 쓴다. */
export async function siblingStats(env, ctx) {
  const sites = SITES.filter((s) => env?.[s.env]);
  if (!sites.length) return [];
  if (Date.now() - cache.at < TTL) return cache.data;
  const data = await edgeCached(ctx, 'sibling-stats', TTL / 1000, async () =>
    Promise.all(
      sites.map((s) =>
        loadOne(s, env)
          .catch((e) => ({ name: s.name, url: s.url, error: e.message })),
      ),
    ),
  );
  cache = { at: Date.now(), data };
  return data;
}
