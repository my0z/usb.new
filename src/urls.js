/** 붙여 넣은 글에서 쿠팡 상품 주소를 골라낸다. */

const COUPANG_HOSTS = ['www.coupang.com', 'coupang.com', 'm.coupang.com', 'link.coupang.com'];

/** 글 안의 URL 을 전부 뽑는다. 앞뒤 따옴표나 괄호는 뗀다. */
export function extractUrls(text) {
  const found = String(text).match(/https?:\/\/[^\s<>"'`]+/g) ?? [];
  const seen = new Set();
  const out = [];
  for (let u of found) {
    u = u.replace(/[)\]}>.,;:!?]+$/, '');
    if (!seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}

export function isCoupang(url) {
  try {
    return COUPANG_HOSTS.includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** 이미 파트너스 단축 링크인가 (link.coupang.com/a/...) */
export function isShortLink(url) {
  try {
    const u = new URL(url);
    return u.hostname === 'link.coupang.com' && u.pathname.startsWith('/a/');
  } catch {
    return false;
  }
}

/** 추적 파라미터를 걷어내 깨끗한 상품 주소로 만든다. 모바일 주소는 PC 주소로 맞춘다. */
export function cleanProductUrl(url) {
  const u = new URL(url);
  if (u.hostname === 'm.coupang.com') {
    const m = u.pathname.match(/\/vm\/products\/(\d+)/);
    if (m) {
      const itemId = u.searchParams.get('itemId');
      const vendorItemId = u.searchParams.get('vendorItemId');
      const q = new URLSearchParams();
      if (itemId) q.set('itemId', itemId);
      if (vendorItemId) q.set('vendorItemId', vendorItemId);
      const qs = q.toString();
      return `https://www.coupang.com/vp/products/${m[1]}${qs ? '?' + qs : ''}`;
    }
  }
  if (u.hostname === 'coupang.com') u.hostname = 'www.coupang.com';
  const keep = new URLSearchParams();
  for (const k of ['itemId', 'vendorItemId']) {
    const v = u.searchParams.get(k);
    if (v) keep.set(k, v);
  }
  u.search = keep.toString() ? '?' + keep.toString() : '';
  u.hash = '';
  return u.toString();
}

/** 상품 번호. 제목 조회나 로그에 쓴다. */
export function productId(url) {
  const m = String(url).match(/\/(?:vp|vm)\/products\/(\d+)/);
  return m ? m[1] : null;
}
