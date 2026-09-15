/** 쿠팡 파트너스 Open API 딥링크. 서명은 HMAC-SHA256 이다. */
import { createHmac } from 'node:crypto';

const HOST = 'https://api-gateway.coupang.com';
const PATH = '/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink';

function signedHeaders(method, path, query = '') {
  const { COUPANG_ACCESS_KEY: access, COUPANG_SECRET_KEY: secret } = process.env;
  if (!access || !secret) throw new Error('COUPANG_ACCESS_KEY 와 COUPANG_SECRET_KEY 가 .env 에 없다');
  const datetime = new Date().toISOString().slice(2, 19).replace(/[-:]/g, '') + 'Z';
  const signature = createHmac('sha256', secret).update(datetime + method + path + query).digest('hex');
  return {
    Authorization: `CEA algorithm=HmacSHA256, access-key=${access}, signed-date=${datetime}, signature=${signature}`,
    'Content-Type': 'application/json',
  };
}

/**
 * 상품 주소 배열 → 단축 링크 배열 (같은 순서).
 * 실패한 항목은 null 이다.
 */
export async function deeplinks(urls, { subId = process.env.COUPANG_SUB_ID, fetchImpl = fetch } = {}) {
  if (!urls.length) return [];
  const body = { coupangUrls: urls };
  if (subId) body.subId = subId;
  const res = await fetchImpl(HOST + PATH, {
    method: 'POST',
    headers: signedHeaders('POST', PATH),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`쿠팡 응답이 JSON 이 아니다 (${res.status}): ${text.slice(0, 160)}`);
  }
  if (!res.ok || data.rCode !== '0') {
    throw new Error(`쿠팡 API 오류 ${res.status} rCode=${data.rCode ?? '?'} ${data.rMessage ?? text.slice(0, 200)}`);
  }
  const rows = Array.isArray(data.data) ? data.data : [];
  return urls.map((u, i) => rows.find((r) => r.originalUrl === u)?.shortenUrl ?? rows[i]?.shortenUrl ?? null);
}
