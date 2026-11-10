/**
 * 아이솔레이트가 자주 새로 뜨는 /0 같은 관리자 경로에서 외부 API(구글 · Cloudflare)를
 * 매번 다시 부르지 않게 콜로의 캐시 API에 JSON 으로 얹어 둔다. 아이솔레이트 메모리 캐시보다
 * 오래 산다. 실패하면 조용히 loader() 로 되돌아간다.
 */
export async function edgeCached(ctx, key, ttlSeconds, loader) {
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const req = cache ? new Request(`https://edge-cache.internal/${key}`) : null;
  if (cache) {
    const hit = await cache.match(req).catch(() => null);
    if (hit) return hit.json();
  }
  const data = await loader();
  if (cache && ctx) {
    const res = new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json', 'cache-control': `max-age=${ttlSeconds}` } });
    ctx.waitUntil(cache.put(req, res).catch(() => {}));
  }
  return data;
}
