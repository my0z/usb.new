/**
 * 쿠팡 파트너스 딥링크. 검색창에 친 키워드의 쿠팡 검색 URL 을 파트너스 링크로 바꾼다.
 * 시크릿 COUPANG_ACCESS_KEY · COUPANG_SECRET_KEY (발행기 .env 와 같은 값). 링크는 영구라 30일 캐시한다.
 */
const API = 'https://api-gateway.coupang.com';
const PATH = '/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink';

export const coupangConfigured = (env) => Boolean(env?.COUPANG_ACCESS_KEY && env?.COUPANG_SECRET_KEY);

async function sign(secret, message) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const searchUrl = (q) => `https://www.coupang.com/np/search?component=&q=${encodeURIComponent(q)}&channel=user`;

/** 쿠팡 URL → 파트너스 단축 링크. 실패하면 원본 URL. */
export async function deeplink(env, target) {
  const cacheKey = new Request(`https://usb.kr/__deeplink?u=${encodeURIComponent(target)}`);
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const hit = cache && (await cache.match(cacheKey));
  if (hit) return hit.text();
  const datetime = `${new Date().toISOString().slice(2, 19).replace(/[-:]/g, '')}Z`;
  const signature = await sign(env.COUPANG_SECRET_KEY, `${datetime}POST${PATH}`);
  const res = await fetch(API + PATH, {
    method: 'POST',
    headers: { Authorization: `CEA algorithm=HmacSHA256, access-key=${env.COUPANG_ACCESS_KEY}, signed-date=${datetime}, signature=${signature}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ coupangUrls: [target] }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`쿠팡 딥링크 ${res.status}: ${(await res.text()).slice(0, 120)}`);
  const link = (await res.json())?.data?.[0]?.shortenUrl;
  if (!link) throw new Error('쿠팡 딥링크 응답에 링크 없음');
  if (cache) await cache.put(cacheKey, new Response(link, { headers: { 'cache-control': 'public, max-age=2592000' } }));
  return link;
}
