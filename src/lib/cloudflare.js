/**
 * Cloudflare 계정 사용량. GraphQL Analytics API 로 이번 달 Workers 요청 수를 받아 최소 예상 비용을 어림한다.
 * 정확한 "결제 예정 금액"은 공개 API 로 못 받는다 — Cloudflare 가 청구 쪽은 대시보드에서만 보여 준다.
 * 여기 숫자는 요청 수만 반영한 하한선이다 (KV · D1 · R2 초과 사용분은 빠진다). 정확한 값은 대시보드 Billing 에서 본다.
 * 필요한 설정: CLOUDFLARE_ACCOUNT_ID(변수 · wrangler.jsonc 에 있음) · CLOUDFLARE_ANALYTICS_TOKEN(시크릿 · Account Analytics Read 권한).
 * 결과는 아이솔레이트 안에서 30분 캐시한다.
 */
const TTL = 30 * 60 * 1000;
const INCLUDED_REQUESTS = 10_000_000; // Workers Paid 플랜 월 기본 포함량
const BASE_USD = 5;
const PER_MILLION_USD = 0.3;
let cache = { at: 0, data: null };

export const cfConfigured = (env) => Boolean(env?.CLOUDFLARE_ACCOUNT_ID && env?.CLOUDFLARE_ANALYTICS_TOKEN);

function monthStartISO() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

async function load(env) {
  const start = monthStartISO();
  // 변수 타입 혼선을 피하려고 값을 그대로 박아 넣는다. accountTag · datetime 둘 다 우리 쪽에서만 만드는 값이라 안전하다.
  const query = `{ viewer { accounts(filter: { accountTag: "${env.CLOUDFLARE_ACCOUNT_ID}" }) { workersInvocationsAdaptiveGroups(filter: { datetime_geq: "${start}" }, limit: 100) { sum { requests errors subrequests } } } } }`;
  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.CLOUDFLARE_ANALYTICS_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Cloudflare GraphQL ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(`Cloudflare GraphQL: ${json.errors[0].message}`);
  const rows = json.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptiveGroups ?? [];
  const requests = rows.reduce((a, r) => a + (r.sum?.requests ?? 0), 0);
  const errors = rows.reduce((a, r) => a + (r.sum?.errors ?? 0), 0);
  const subrequests = rows.reduce((a, r) => a + (r.sum?.subrequests ?? 0), 0);
  const overRequests = Math.max(0, requests - INCLUDED_REQUESTS);
  const estUsd = BASE_USD + (overRequests / 1_000_000) * PER_MILLION_USD;
  cache = { at: Date.now(), data: { requests, errors, subrequests, overRequests, estUsd, monthStart: start.slice(0, 10) } };
  return cache.data;
}

/** 이번 달 Workers 요청 수와 요청 기준 최소 예상 비용. 설정이 없으면 null. */
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
