/**
 * GA4 Data API. 서비스 계정 키로 JWT 를 만들어 액세스 토큰을 받고 runReport 를 부른다.
 * 필요한 설정: GA_PROPERTY_ID(변수) · GA_SA_EMAIL · GA_SA_KEY(시크릿 · PEM).
 * 결과는 아이솔레이트 안에서 10분 캐시한다 (관리자 페이지 하나가 쓰므로 충분하다).
 */
const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const TTL = 10 * 60 * 1000;
let token = { value: '', exp: 0 };
let report = { at: 0, data: null };

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

async function run(env, method, body) {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${env.GA_PROPERTY_ID}:${method}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${await accessToken(env)}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GA ${method} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

const rows = (r) => (r.rows ?? []).map((x) => ({ d: (x.dimensionValues ?? []).map((v) => v.value), m: x.metricValues.map((v) => Number(v.value)) }));
const week = { startDate: '7daysAgo', endDate: 'today' };
const top = (metricName) => ({ orderBys: [{ metric: { metricName }, desc: true }] });

export const gaConfigured = (env) => Boolean(env?.GA_PROPERTY_ID && env?.GA_SA_EMAIL && env?.GA_SA_KEY);

/** 관리자 페이지용 요약. 설정이 없으면 null. */
export async function gaReport(env) {
  if (!gaConfigured(env)) return null;
  if (Date.now() - report.at < TTL) return report.data;
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
  report = {
    at: Date.now(),
    data: {
      realtime: rows(realtime)[0]?.m[0] ?? 0,
      today: byRange.date_range_0 ?? zero,
      week: byRange.date_range_1 ?? zero,
      month: byRange.date_range_2 ?? zero,
      pages: rows(pages).map((r) => ({ path: r.d[0], views: r.m[0] })),
      sources: rows(sources).map((r) => ({ source: r.d[0], sessions: r.m[0] })),
      days: rows(daily).map((r) => ({ date: r.d[0].replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3'), users: r.m[0], views: r.m[1] })),
    },
  };
  return report.data;
}
