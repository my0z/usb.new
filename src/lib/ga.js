/**
 * GA4 Data API 와 Search Console API. 같은 서비스 계정 키로 JWT 를 만들어 액세스 토큰 하나를 받아 둘 다 부른다.
 * 필요한 설정: GA_PROPERTY_ID · GSC_SITE(변수) · GA_SA_EMAIL · GA_SA_KEY(시크릿 · PEM).
 * 결과는 아이솔레이트 안에서 10분 캐시하고 콜로 캐시에도 같은 시간 얹어 둔다
 * (관리자 페이지라 아이솔레이트가 자주 새로 떠서 메모리 캐시만으로는 거의 매번 다시 부른다).
 */
import { edgeCached } from './edgecache.js';
const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly';
const TTL = 10 * 60 * 1000;
let token = { value: '', exp: 0 };
let report = { at: 0, data: null };
let gsc = { at: 0, data: null };
let opp = { at: 0, data: [] };

const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const enc = (obj) => b64url(new TextEncoder().encode(JSON.stringify(obj)));

async function accessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  if (token.exp > now + 60) return token.value;
  const der = Uint8Array.from(atob(env.GA_SA_KEY.replace(/\\n/g, '\n').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const unsigned = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({ iss: env.GA_SA_EMAIL, scope: SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${b64url(sig)}` }),
  });
  if (!res.ok) throw new Error(`구글 토큰 ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  token = { value: data.access_token, exp: now + (data.expires_in ?? 3600) };
  return token.value;
}

/** 엣지에서 구글로 가다 5xx 가 나면 한 번 더 간다 (Cloudflare "error code: 502" 는 대개 일시적이다). */
async function post(url, token, body, label) {
  for (let i = 0; ; i += 1) {
    const res = await fetch(url, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) });
    if (res.ok) return res.json();
    const text = (await res.text()).slice(0, 200);
    if (res.status < 500 || i) throw new Error(`${label} ${res.status}: ${text}`);
    await new Promise((r) => setTimeout(r, 400));
  }
}

async function run(env, method, body) {
  return post(`https://analyticsdata.googleapis.com/v1beta/properties/${env.GA_PROPERTY_ID}:${method}`, await accessToken(env), body, `GA ${method}`);
}

const rows = (r) => (r.rows ?? []).map((x) => ({ d: (x.dimensionValues ?? []).map((v) => v.value), m: x.metricValues.map((v) => Number(v.value)) }));
const week = { startDate: '7daysAgo', endDate: 'today' };
const top = (metricName) => ({ orderBys: [{ metric: { metricName }, desc: true }] });

export const gaConfigured = (env) => Boolean(env?.GA_PROPERTY_ID && env?.GA_SA_EMAIL && env?.GA_SA_KEY);

/** 관리자 페이지용 요약. 설정이 없으면 null. ctx 를 주면 콜로 캐시도 같이 쓴다. */
export async function gaReport(env, ctx) {
  if (!gaConfigured(env)) return null;
  if (Date.now() - report.at < TTL) return report.data;
  try {
    const data = await edgeCached(ctx, 'ga-report', TTL / 1000, () => loadGa(env));
    report = { at: Date.now(), data };
    return data;
  } catch (e) {
    // 실패하면 최근 값을 그대로 보여 주고 10분 뒤 다시 시도한다
    if (report.data) return { ...report.data, stale: e.message };
    throw e;
  }
}

async function loadGa(env) {
  const metrics = [{ name: 'activeUsers' }, { name: 'screenPageViews' }, { name: 'sessions' }];
  const [ranges, pages, sources, daily, realtime] = await Promise.all([
    run(env, 'runReport', { dateRanges: [{ startDate: 'today', endDate: 'today' }, week, { startDate: '28daysAgo', endDate: 'today' }], metrics }),
    run(env, 'runReport', { dateRanges: [week], dimensions: [{ name: 'pagePath' }], metrics: [{ name: 'screenPageViews' }], ...top('screenPageViews'), limit: 10 }),
    run(env, 'runReport', { dateRanges: [week], dimensions: [{ name: 'sessionSource' }], metrics: [{ name: 'sessions' }], ...top('sessions'), limit: 8 }),
    run(env, 'runReport', { dateRanges: [{ startDate: '13daysAgo', endDate: 'today' }], dimensions: [{ name: 'date' }], metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }], orderBys: [{ dimension: { dimensionName: 'date' }, desc: true }] }),
    run(env, 'runRealtimeReport', { metrics: [{ name: 'activeUsers' }] }),
  ]);
  const zero = { users: 0, views: 0, sessions: 0 };
  const byRange = Object.fromEntries(rows(ranges).map((r) => [r.d[0] ?? 'date_range_0', { users: r.m[0], views: r.m[1], sessions: r.m[2] }]));
  return {
    realtime: rows(realtime)[0]?.m[0] ?? 0,
    today: byRange.date_range_0 ?? zero,
    week: byRange.date_range_1 ?? zero,
    month: byRange.date_range_2 ?? zero,
    pages: rows(pages).map((r) => ({ path: r.d[0], views: r.m[0] })),
    sources: rows(sources).map((r) => ({ source: r.d[0], sessions: r.m[0] })),
    days: rows(daily).map((r) => ({ date: r.d[0].replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3'), users: r.m[0], views: r.m[1] })),
  };
}

const ymd = (daysAgo) => new Date(Date.now() - daysAgo * 864e5).toISOString().slice(0, 10);

async function query(env, body) {
  const data = await post(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(env.GSC_SITE)}/searchAnalytics/query`, await accessToken(env), { startDate: ymd(28), endDate: ymd(0), ...body }, 'Search Console');
  return data.rows ?? [];
}

export const gscConfigured = (env) => Boolean(env?.GSC_SITE && env?.GA_SA_EMAIL && env?.GA_SA_KEY);

/** 서치콘솔 28일 요약. 검색 데이터는 이틀쯤 늦게 들어온다. 설정이 없으면 null. ctx 를 주면 콜로 캐시도 같이 쓴다. */
export async function gscReport(env, ctx) {
  if (!gscConfigured(env)) return null;
  if (Date.now() - gsc.at < TTL) return gsc.data;
  try {
    const data = await edgeCached(ctx, 'gsc-report', TTL / 1000, () => loadGsc(env));
    gsc = { at: Date.now(), data };
    return data;
  } catch (e) {
    if (gsc.data) return { ...gsc.data, stale: e.message };
    throw e;
  }
}

async function loadGsc(env) {
  const [total, days, queries, pages] = await Promise.all([
    query(env, {}),
    query(env, { dimensions: ['date'] }),
    query(env, { dimensions: ['query'], rowLimit: 10 }),
    query(env, { dimensions: ['page'], rowLimit: 10 }),
  ]);
  const t = total[0] ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  return {
    clicks: t.clicks,
    impressions: t.impressions,
    ctr: t.ctr,
    position: t.position,
    days: days.map((r) => ({ date: r.keys[0], clicks: r.clicks, impressions: r.impressions })).reverse().slice(0, 14),
    queries: queries.map((r) => ({ q: r.keys[0], clicks: r.clicks, impressions: r.impressions, position: r.position })),
    pages: pages.map((r) => ({ path: r.keys[0].replace(/^https?:\/\/[^/]+/, '') || '/', clicks: r.clicks, impressions: r.impressions })),
  };
}

/** 순위 4~30위인데 노출은 있는 검색어와 페이지 (28일 · 노출 많은 순). 조금만 밀면 올라가는 자리다. 발행기가 /0/gsc 로 받아 새 글 키워드와 손볼 글을 고른다. */
export async function gscOpportunities(env, ctx) {
  if (!gscConfigured(env)) return [];
  if (Date.now() - opp.at < TTL) return opp.data;
  const data = await edgeCached(ctx, 'gsc-opportunities', TTL / 1000, async () => {
    const rows = await query(env, { dimensions: ['query', 'page'], rowLimit: 250 });
    return rows
      .filter((r) => r.impressions >= 5 && r.position >= 4 && r.position <= 30)
      .sort((a, b) => b.impressions - a.impressions)
      .map((r) => ({ q: r.keys[0], path: r.keys[1].replace(/^https?:\/\/[^/]+/, '') || '/', clicks: r.clicks, impressions: r.impressions, position: Math.round(r.position * 10) / 10 }));
  });
  opp = { at: Date.now(), data };
  return data;
}
