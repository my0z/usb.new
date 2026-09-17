/**
 * 네이버 검색 API 로 제품 자료를 보강한다. 쇼핑 검색에서 브랜드 · 제조사 · 네이버 최저가를 받고
 * 블로그 · 뉴스 검색에서 실제 리뷰 문장을 가져와 모델의 참고 자료로 쓴다.
 * .env: NAVER_CLIENT_ID · NAVER_CLIENT_SECRET (developers.naver.com 앱 · 무료 하루 2만5천 건). 없으면 조용히 건너뛴다.
 */
import { cleanName } from './video.js';

const ready = () => Boolean(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET);
const strip = (s) => String(s ?? '').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();

async function api(kind, query, display = 5) {
  const res = await fetch(`https://openapi.naver.com/v1/search/${kind}.json?query=${encodeURIComponent(query)}&display=${display}&sort=sim`, {
    headers: { 'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID, 'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`네이버 ${kind} ${res.status}`);
  return (await res.json()).items ?? [];
}

/** 제품명 앞 4단어. 모델명까지 들어가 검색이 잘 맞는다. */
const shortName = (name) => cleanName(name).split(/\s+/).slice(0, 4).join(' ');

/** 쇼핑 검색 첫 결과. { brand, maker, naverPrice, naverCategory } */
export async function shopInfo(name) {
  if (!ready()) return null;
  const items = await api('shop', shortName(name), 3).catch(() => []);
  const it = items[0];
  if (!it) return null;
  return {
    brand: strip(it.brand) || null,
    maker: strip(it.maker) || null,
    naverPrice: Number(it.lprice) || null,
    naverCategory: [it.category2, it.category3, it.category4].filter(Boolean).join(' > ') || null,
  };
}

/** 블로그 · 뉴스에서 리뷰 문장 최대 n 개. [{ title, text, link, kind }] */
export async function snippets(name, n = 5) {
  if (!ready()) return [];
  const q = `${shortName(name)} 리뷰`;
  const [blog, news] = await Promise.all([api('blog', q, 5).catch(() => []), api('news', q, 3).catch(() => [])]);
  const out = [];
  for (const [kind, list] of [['blog', blog], ['news', news]]) {
    for (const it of list) {
      const text = strip(it.description);
      if (text.length < 40) continue;
      out.push({ kind, title: strip(it.title).slice(0, 80), text: text.slice(0, 220), link: it.originallink || it.link });
    }
  }
  return out.slice(0, n);
}

/** 제품 목록에 쇼핑 정보를 붙이고 주인공 제품의 참고 자료를 돌려준다. 실패해도 원본을 그대로 쓴다. */
export async function enrich(products) {
  if (!ready()) return { products, facts: [] };
  const infos = await Promise.all(products.map((p) => shopInfo(p.name).catch(() => null)));
  const enriched = products.map((p, i) => ({ ...p, ...(infos[i] ?? {}) }));
  const facts = await snippets(products[0].name).catch(() => []);
  return { products: enriched, facts };
}
