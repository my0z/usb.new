/**
 * 네이버 검색 API 로 제품 자료를 보강한다. 블로그 · 뉴스 · 웹문서 검색에서 실제 리뷰 문장을 가져와 모델의 참고 자료로 쓴다.
 * (쇼핑 검색 API 는 2026년 현재 없어져서 최저가 · 브랜드는 못 받는다.)
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

/** 쿠팡 제품명은 "인바디 다이얼 체중계, H40NWi, 블랙" 처럼 모델명이 쉼표 뒤에 오기도 한다. 이름 전체에서 숫자와 글자가 섞인 토큰을 모델명으로 본다. */
const modelTokens = (name) => [...new Set((String(name).toLowerCase().match(/[a-z가-힣]*\d[a-z0-9-]*[a-z][a-z0-9-]*|[a-z][a-z0-9-]*\d[a-z0-9-]*/g) ?? []).filter((t) => t.length >= 4 && !/^\d+(개|입|매|p|ea|세대|인용|mah|w|ml|kg|g)$/.test(t)))];

/** 제품명 앞 4단어에 모델명을 붙인 검색어. */
function shortName(name) {
  const base = cleanName(name).split(/\s+/).slice(0, 4);
  const model = modelTokens(name).find((t) => !base.map((b) => b.toLowerCase()).includes(t));
  return [...base, ...(model ? [model] : [])].join(' ');
}

const GENERIC = new Set(['리뷰', '추천', '무선', '유선', '이어폰', '블루투스', '정품', '신형', '신제품', '세트', '화이트', '블랙', '용', '형', '개', '국내', '해외', '프로', 'pro', '맥스', 'max', '플러스', 'plus', '울트라', 'ultra', '미니', 'mini', '라이트', 'lite', '에디션', '시리즈']);
// 광고성 블로그 패턴. 검색 결과의 절반이 이런 글이라 걸러야 엉뚱한 사실이 안 들어간다
const SPAM = /추천 상품을 소개|할인율|가격 확인|상세 정보|쿠팡파트너스|파트너스 활동|수수료를|최저가 보기|구매 링크|(#\S+\s*){3,}/;

/** 같은 제품 이야기인지. 모델명(숫자 섞인 단어 · 버즈3 · hx2540)이 있으면 그게 꼭 있어야 하고 나머지 핵심 단어도 하나 더 맞아야 한다. */
function about(name, hay) {
  const toks = [...new Set([...cleanName(name).toLowerCase().split(/[\s/]+/), ...modelTokens(name)].filter((t) => t.length >= 2 && !GENERIC.has(t) && !/^\d+(개|입|매|p|ea)$/.test(t)))];
  if (!toks.length) return true;
  const models = toks.filter((t) => /\d/.test(t));
  if (models.length && !models.some((t) => hay.includes(t))) return false;
  const hit = toks.filter((t) => hay.includes(t));
  return hit.length >= Math.min(2, toks.length);
}

/** 블로그 · 뉴스 · 웹문서에서 같은 제품의 리뷰 문장 최대 n 개. [{ title, text, link, kind }] */
export async function snippets(name, n = 6) {
  if (!ready()) return [];
  const q = `${shortName(name)} 리뷰`;
  const [blog, news, web] = await Promise.all([api('blog', q, 10).catch(() => []), api('news', q, 5).catch(() => []), api('webkr', q, 5).catch(() => [])]);
  const out = [];
  const seen = new Set();
  for (const [kind, list] of [['news', news], ['web', web], ['blog', blog]]) {
    for (const it of list) {
      const title = strip(it.title);
      const text = strip(it.description);
      const hay = `${title} ${text}`.toLowerCase();
      const key = title.toLowerCase().replace(/\s+/g, '').slice(0, 30);
      if (text.length < 40 || SPAM.test(hay) || !about(name, hay) || seen.has(key)) continue;
      seen.add(key);
      out.push({ kind, title: title.slice(0, 80), text: text.slice(0, 220), link: it.originallink || it.link });
    }
  }
  return out.slice(0, n);
}

/** 주인공 제품의 참고 자료를 돌려준다. 실패하면 빈 배열. */
export async function enrich(products) {
  const facts = ready() ? await snippets(products[0].name).catch(() => []) : [];
  return { products, facts };
}
