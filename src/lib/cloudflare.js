/**
 * Cloudflare 이번 달 예상 청구. sell.usb.kr(insta.coupang) 의 costCompute 를 그대로 가져와
 * 이 사이트가 쓰는 항목(Workers 요청 · D1 · Workers AI)만 남겼다. R2 는 안 쓰니 뺐다.
 * 공개 요금표 기준 근사값이라 청구서와 몇 % 다를 수 있다. 정확한 금액은 대시보드 Billing 에서 본다.
 * 필요한 설정: CLOUDFLARE_ACCOUNT_ID(변수) · CLOUDFLARE_ANALYTICS_TOKEN(시크릿 · Account Analytics Read).
 * 결과는 아이솔레이트 안에서 30분 캐시한다.
 */
const TTL = 30 * 60 * 1000;
const P = {
  paidBase: 5, // Workers 유료 플랜 월 기본료 ($)
  reqFree: 10e6, reqPerM: 0.3, // Workers 요청: 월 1천만 포함 · 이후 100만 건당
  d1ReadFree: 25e9, d1ReadPerM: 0.001, // D1 읽은 줄: 월 250억 포함 · 이후 100만 줄당
  d1WriteFree: 50e6, d1WritePerM: 1.0, // D1 쓴 줄: 월 5천만 포함 · 이후 100만 줄당
  d1GbFree: 5, d1GbMonth: 0.75, // D1 저장 GB
  aiFreeDay: 10000, aiPerK: 0.011, // Workers AI 뉴런: 하루 1만 무료(UTC 0시 초기화) · 이후 1천 뉴런당
};
let cache = { at: 0, data: null };

export const cfConfigured = (env) => Boolean(env?.CLOUDFLARE_ACCOUNT_ID && env?.CLOUDFLARE_ANALYTICS_TOKEN);

async function cfGraphql(env, query, vars) {
  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.CLOUDFLARE_ANALYTICS_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables: vars }),
    signal: AbortSignal.timeout(8000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.errors?.length) throw new Error(json.errors?.[0]?.message ?? `HTTP ${res.status}`);
  return json.data?.viewer?.accounts?.[0] ?? {};
}

const over = (used, free) => Math.max(0, used - free);
const ymd = (d) => d.toISOString().slice(0, 10);

async function load(env) {
  const now = new Date();
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  const day = now.getUTCDate() + now.getUTCHours() / 24;
  const vars = { a: env.CLOUDFLARE_ACCOUNT_ID, f: ymd(first), t: ymd(now), fd: first.toISOString(), td: now.toISOString() };
  const missing = [];
  const ask = async (name, q) => {
    try {
      return await cfGraphql(env, q, vars);
    } catch (e) {
      missing.push(`${name}: ${String(e.message).slice(0, 80)}`);
      return {};
    }
  };
  const head = 'query($a:String!,$f:Date!,$t:Date!,$fd:Time!,$td:Time!){viewer{accounts(filter:{accountTag:$a}){';
  const [w, d, ds, ai] = await Promise.all([
    ask('Workers 요청', `${head}w:workersInvocationsAdaptive(limit:10000,filter:{datetime_geq:$fd,datetime_leq:$td}){sum{requests}}}}}`),
    ask('D1 읽기·쓰기', `${head}d:d1AnalyticsAdaptiveGroups(limit:10000,filter:{date_geq:$f,date_leq:$t}){sum{rowsRead rowsWritten}}}}}`),
    ask('D1 저장', `${head}ds:d1StorageAdaptiveGroups(limit:100,filter:{date_geq:$f,date_leq:$t}){max{databaseSizeBytes}}}}}`),
    ask('Workers AI 뉴런', `${head}ai:aiInferenceAdaptiveGroups(limit:10000,filter:{datetime_geq:$fd,datetime_leq:$td}){sum{totalNeurons} dimensions{datetimeHour}}}}}`),
  ]);
  const sum = (rows, f) => (rows ?? []).reduce((n, x) => n + Number(f(x) ?? 0), 0);
  const requests = sum(w.w, (x) => x.sum?.requests);
  const rowsRead = sum(d.d, (x) => x.sum?.rowsRead);
  const rowsWritten = sum(d.d, (x) => x.sum?.rowsWritten);
  const d1Gb = Math.max(0, ...(ds.ds ?? []).map((x) => Number(x.max?.databaseSizeBytes ?? 0))) / 1e9;
  // 뉴런은 하루(UTC)마다 1만까지 무료라서 날짜별로 모아서 넘은 만큼만 센다
  const aiDay = {};
  for (const x of ai.ai ?? []) {
    const k = String(x.dimensions?.datetimeHour ?? '').slice(0, 10);
    aiDay[k] = (aiDay[k] ?? 0) + Number(x.sum?.totalNeurons ?? 0);
  }
  const aiTotal = Object.values(aiDay).reduce((n, x) => n + x, 0);
  const aiOver = Object.values(aiDay).reduce((n, x) => n + over(x, P.aiFreeDay), 0);
  const items = [
    { name: 'Workers 요청', used: requests, unit: '건', free: P.reqFree, usd: (over(requests, P.reqFree) / 1e6) * P.reqPerM, scale: true },
    { name: 'D1 읽은 줄', used: rowsRead, unit: '줄', free: P.d1ReadFree, usd: (over(rowsRead, P.d1ReadFree) / 1e6) * P.d1ReadPerM, scale: true },
    { name: 'D1 쓴 줄', used: rowsWritten, unit: '줄', free: P.d1WriteFree, usd: (over(rowsWritten, P.d1WriteFree) / 1e6) * P.d1WritePerM, scale: true },
    { name: 'D1 저장', used: d1Gb, unit: 'GB', free: P.d1GbFree, usd: over(d1Gb, P.d1GbFree) * P.d1GbMonth, scale: false },
    { name: 'Workers AI 뉴런', used: aiTotal, unit: '', free: P.aiFreeDay * Math.ceil(day), usd: (aiOver / 1e3) * P.aiPerK, scale: true },
  ];
  const usage = items.reduce((n, x) => n + x.usd, 0);
  const projUsage = items.reduce((n, x) => n + (x.scale ? (x.usd * daysInMonth) / Math.max(day, 0.5) : x.usd), 0);
  const rate = Number(env.USD_KRW) || 1400;
  cache = {
    at: Date.now(),
    data: {
      usd: P.paidBase + usage,
      projUsd: P.paidBase + projUsage,
      krw: Math.round((P.paidBase + usage) * rate),
      projKrw: Math.round((P.paidBase + projUsage) * rate),
      base: P.paidBase,
      rate,
      items,
      missing,
      day: Math.floor(day),
      days: daysInMonth,
      monthStart: vars.f,
    },
  };
  return cache.data;
}

/** 이번 달 Workers · D1 · Workers AI 사용량과 공개 요금 기준 예상 청구(기본료 포함). 설정이 없으면 null. */
export async function cfUsage(env) {
  if (!cfConfigured(env)) return null;
  if (Date.now() - cache.at < TTL) return cache.data;
  try {
    return await load(env);
  } catch (e) {
    if (cache.data) return { ...cache.data, stale: e.message };
    throw e;
  }
}
