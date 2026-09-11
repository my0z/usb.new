/**
 * 쿠팡 파트너스 Open API.
 * 검색과 딥링크 두 가지만 쓴다. 서명 방식은 기존 워커와 동일하다.
 */
import { createHmac } from 'node:crypto';

const HOST = 'https://api-gateway.coupang.com';
const BASE = '/v2/providers/affiliate_open_api/apis/openapi';

function signedHeaders(method, pathWithQuery) {
  const datetime = new Date().toISOString().slice(2, 19).replace(/[-:]/g, '') + 'Z';
  const [path, query = ''] = pathWithQuery.split('?');
  const message = datetime + method + path + query;
  const signature = createHmac('sha256', process.env.COUPANG_SECRET_KEY).update(message).digest('hex');
  return {
    Authorization: `CEA algorithm=HmacSHA256, access-key=${process.env.COUPANG_ACCESS_KEY}, signed-date=${datetime}, signature=${signature}`,
    'Content-Type': 'application/json',
  };
}

async function call(method, pathWithQuery, body = null) {
  const res = await fetch(HOST + pathWithQuery, {
    method,
    headers: signedHeaders(method, pathWithQuery),
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`쿠팡 응답이 JSON 이 아니다 (${res.status}): ${text.slice(0, 160)}`);
  }
  if (!res.ok) throw new Error(`쿠팡 API ${res.status}: ${text.slice(0, 200)}`);
  return data;
}

/** 검색 결과를 사이트 스키마에 가까운 형태로 정규화한다. */
export async function searchProducts(keyword, limit = 10) {
  const q = encodeURIComponent(String(keyword).slice(0, 50));
  const data = await call('GET', `${BASE}/products/search?keyword=${q}&limit=${limit}`);
  const list = data?.data?.productData ?? [];
  if (!list.length) throw new Error(`쿠팡 검색 결과 없음 (${keyword}) rCode=${data?.rCode ?? '?'} rMessage=${data?.rMessage ?? '?'} raw=${JSON.stringify(data).slice(0, 200)}`);
  return list
    .filter((p) => p.productName && p.productUrl && p.productImage)
    .map((p) => ({
      productId: p.productId ?? null,
      name: String(p.productName).trim(),
      price: Number(p.productPrice) || 0,
      image: p.productImage,
      productUrl: p.productUrl,
      isRocket: !!p.isRocket,
      isFreeShipping: !!p.isFreeShipping,
      category: p.categoryName ?? '',
      rank: p.rank ?? 0,
    }));
}

/** 상품 URL 배열을 파트너스 단축 링크로 바꾼다. 실패하면 원본 URL 을 그대로 쓴다. */
export async function deeplinks(urls) {
  try {
    const data = await call('POST', `${BASE}/v1/deeplink`, { coupangUrls: urls });
    const rows = data?.data ?? [];
    return urls.map((u) => rows.find((r) => r.originalUrl === u)?.shortenUrl || u);
  } catch (e) {
    console.warn(`딥링크 실패 — 원본 URL 사용: ${e.message}`);
    return urls;
  }
}
