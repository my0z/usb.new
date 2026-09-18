#!/usr/bin/env node
/**
 * 신상품 리뷰 자동 발행.
 *
 *   node generator/run.js                 글 1건 발행
 *   node generator/run.js --count 2       글 2건 발행
 *   node generator/run.js --keyword 보조배터리 --query "맥세이프 보조배터리 신상"
 *   node generator/run.js --dry-run       KV 에 쓰지 않고 결과만 출력
 *   node generator/run.js --mock          쿠팡과 모델 없이 가짜 데이터로 파이프라인 점검
 *
 * 흐름: 키워드 선택 → 쿠팡 검색 → 최근 안 쓴 제품 고르기 → 딥링크 → Ollama 로 글 생성
 *       → 사진 삽입 → KV 저장(post · index · summary · 중복 방지 키)
 */
import { loadEnv, requireEnv } from './lib/env.js';
import { KEYWORD_POOL, PRODUCTS_PER_POST, KEYWORD_USED_TTL_SECONDS, PRODUCT_USED_TTL_SECONDS, LLM } from './config.js';
import { searchProducts, deeplinks } from './lib/coupang.js';
import { remoteKv, MemoryKv } from './lib/kv.js';
import { generateJson, ollamaHealthy } from './lib/llm.js';
import { buildPrompt, parseArticle } from './lib/article.js';
import { reviewArticle } from './lib/review.js';
import { buildPost, embedImages, summarize, newSlug } from './lib/post.js';
import { mockProducts, mockArticleJson } from './lib/mock.js';
import { findVideo } from './lib/video.js';
import { announce, articleMessage } from './lib/social.js';
import { enrich } from './lib/naver.js';
import { indexNow } from './lib/indexnow.js';

loadEnv();

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, def = null) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def;
};
const COUNT = Math.max(1, parseInt(opt('count', '1'), 10) || 1);
const DRY = flag('dry-run');
const MOCK = flag('mock');
const log = (...m) => console.log(new Date().toLocaleTimeString('ko-KR', { hour12: false, timeZone: 'Asia/Seoul' }), ...m);

const kv = MOCK || DRY ? new MemoryKv() : remoteKv;

function productKey(p) {
  return p.productId ? `id:${p.productId}` : `url:${p.productUrl}`;
}

/** KV REST GET 은 퍼센트 인코딩된 키 길이(한글 1자 = 9바이트)로 512 한도를 재므로 40자 안으로 자른다. */
function normalizeName(name) {
  return String(name).trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 40);
}

function coreTokens(keyword) {
  const raw = String(keyword).toLowerCase().split(/[\s,/()\-]+/).filter((t) => t.length >= 2);
  const core = raw.filter((t) => t.length >= 3);
  return core.length ? core : raw;
}

async function keywordUsedRecently(keyword) {
  if (await kv.get(`usedKeyword:${keyword}`)) return true;
  const list = await kv.getJson('recent-keywords-list', []);
  const cutoff = Date.now() - KEYWORD_USED_TTL_SECONDS * 1000;
  const mine = coreTokens(keyword);
  return list.some((e) => e.at >= cutoff && e.keyword !== keyword && (e.tokens ?? []).some((t) => mine.includes(t)));
}

/** 검색창에서 추가된 키워드 (/0/keywords). config 풀에 없는 것만 d=20 으로 합친다. 실패하면 빈 배열. */
async function extraKeywords() {
  if (MOCK || !process.env.ADMIN_KEY) return [];
  try {
    const site = (process.env.SITE_URL || 'https://usb.kr').replace(/\/$/, '');
    const res = await fetch(`${site}/0/keywords?key=${encodeURIComponent(process.env.ADMIN_KEY)}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const known = new Set(KEYWORD_POOL.flatMap((k) => [k.keyword, k.q]));
    return (await res.json()).filter((k) => !known.has(k.keyword) && !known.has(k.q)).map((k) => ({ d: 20, min: 3000, q: k.q, t: k.t, keyword: k.keyword }));
  } catch {
    return [];
  }
}

async function pickKeyword(forced) {
  if (forced) return forced;
  // 검색량(d)으로 가중한 무작위 순서. 지수 100 이 지수 4 보다 다섯 배쯤 앞에 온다 (제곱근 가중)
  const all = [...KEYWORD_POOL, ...(await extraKeywords())];
  const pool = all.map((k) => [Math.random() ** (1 / Math.sqrt(Math.max(1, k.d ?? 1))), k]).sort((a, b) => b[0] - a[0]).map(([, k]) => k);
  for (const item of pool) {
    if (!(await keywordUsedRecently(item.keyword))) return item;
  }
  throw new Error('모든 키워드가 최근에 쓰였다. KEYWORD_POOL 을 늘리거나 며칠 뒤 다시 실행하라.');
}

async function recentlyUsedProductKeys() {
  const list = await kv.getJson('recent-used-products', []);
  const cutoff = Date.now() - PRODUCT_USED_TTL_SECONDS * 1000;
  return new Set(list.filter((e) => e.at >= cutoff).map((e) => e.id));
}

const GENERIC = new Set(['스마트', '신상', '휴대용', '무선', '미니', '고속', '초소형', '가정용', '차량용', '스마트폰', '연동', '기능']);

/** 검색어의 핵심 단어가 제품명이나 쿠팡 분류에 하나도 없으면 엉뚱한 상품으로 본다. */
function relevant(p, query) {
  // coreTokens 는 3자 이상만 남겨서 "스마트 물병" 이 "스마트" 하나로 줄고 그게 GENERIC 에 걸려 필터가 꺼졌다. 2자 토큰까지 본다.
  const toks = String(query).toLowerCase().split(/[\s,/()\-]+/).filter((t) => t.length >= 2 && !GENERIC.has(t) && !/^[a-z0-9]{1,2}$/.test(t));
  if (!toks.length) return true;
  const hay = `${p.name} ${p.category}`.toLowerCase().replace(/\s+/g, '');
  return toks.some((t) => hay.includes(t.replace(/\s+/g, '')));
}

const NEW_RE = /2026|2025|신상|신형|신제품|new|2세대|3세대|gen ?[2-9]|pro|max|ultra|plus/i;
const newness = (p) => (NEW_RE.test(p.name) ? 1 : 0);

/** "2026" 과 "신상" 을 붙인 검색을 먼저 하고 결과를 합쳐 최신 제품이 앞에 오게 정렬한다. */
async function searchLatest(query) {
  if (MOCK) return mockProducts;
  const seen = new Set();
  const all = [];
  for (const q of [`${query} 2026`, `${query} 신상`, query]) {
    for (const p of await searchProducts(q, 10).catch(() => [])) {
      const k = p.productId ?? p.productUrl;
      if (!seen.has(k)) seen.add(k) && all.push(p);
    }
    if (all.length >= 15) break;
  }
  return all.sort((a, b) => newness(b) - newness(a) || a.rank - b.rank);
}

async function chooseProducts(query, min = 3000) {
  const found = (await searchLatest(query)).filter((p) => MOCK || relevant(p, query));
  if (!found.length) throw new Error(`검색어와 맞는 제품 없음: ${query}`);
  const used = await recentlyUsedProductKeys();
  const fresh = [];
  const seenNames = new Set();
  for (const p of found) {
    if (used.has(productKey(p))) continue;
    if (await kv.get(`product-post-map:${normalizeName(p.name)}`)) continue;
    if (p.price < min) continue;
    const nameKey = normalizeName(p.name).slice(0, 18);
    if (seenNames.has(nameKey)) continue;
    seenNames.add(nameKey);
    fresh.push(p);
    if (fresh.length >= PRODUCTS_PER_POST) break;
  }
  if (!fresh.length) throw new Error(`새 제품이 없다 (검색 ${found.length}건 모두 최근 사용): ${query}`);
  const links = MOCK ? fresh.map((p) => `https://link.coupang.com/a/mock${p.productId}`) : await deeplinks(fresh.map((p) => p.productUrl));
  return fresh.map((p, i) => ({ ...p, affiliateUrl: links[i] }));
}

async function writeArticle(keyword, query, intent, products, facts = []) {
  if (MOCK) return { article: parseArticle(mockArticleJson), model: 'mock' };
  const { system, user, productLines } = buildPrompt({ keyword, query, intent, products, facts });
  let lastErr;
  let issues = [];
  let prev = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const feedback = !issues.length ? '' : `\n\n아래는 이전 초안이다. 지적된 문장은 근거 없는 수치와 기능을 빼고 "고를 때 확인할 점" 으로 바꾼다. 새로운 기능 · 수치 · 사양을 절대 추가하지 않는다. 나머지는 유지해서 같은 JSON 형식으로 다시 출력하라.\n이전 초안: ${JSON.stringify(prev)}\n문제점:\n- ${issues.join('\n- ')}`;
    const { text, model } = await generateJson(system, user + feedback);
    let article;
    try {
      article = parseArticle(text);
    } catch (e) {
      lastErr = e;
      log(`생성 결과 검증 실패 (${attempt}/2): ${e.message} — 원문: ${String(text).replace(/\s+/g, ' ').slice(0, 240)}`);
      continue;
    }
    prev = article;
    issues = await reviewArticle(article, productLines, model);
    if (!issues.length) return { article, model, attempts: attempt };
    lastErr = new Error(`심사 불합격: ${issues.join(' / ')}`);
    log(`심사 불합격 (${attempt}/2) → 고쳐 씀: ${issues.slice(0, 3).join(' / ')}`);
  }
  throw lastErr;
}

async function publish(post, products) {
  await kv.put(`post:${post.slug}`, post);

  const idx = await kv.getJson('index', []);
  idx.unshift(post.slug);
  await kv.put('index', idx.slice(0, 500));

  const summaries = await kv.getJson('posts:summary-list', []);
  await kv.put('posts:summary-list', [summarize(post), ...summaries.filter((s) => s.slug !== post.slug)]);

  await kv.put(`usedKeyword:${post.keyword}`, '1', { ttl: KEYWORD_USED_TTL_SECONDS });
  const recentKw = await kv.getJson('recent-keywords-list', []);
  const cutoff = Date.now() - KEYWORD_USED_TTL_SECONDS * 1000;
  await kv.put('recent-keywords-list', [{ keyword: post.keyword, tokens: coreTokens(post.keyword), at: Date.now() }, ...recentKw.filter((e) => e.at >= cutoff)].slice(0, 200));

  const usedList = (await kv.getJson('recent-used-products', [])).filter((e) => e.at >= Date.now() - PRODUCT_USED_TTL_SECONDS * 1000);
  for (const p of products) usedList.push({ id: productKey(p), at: Date.now() });
  await kv.put('recent-used-products', usedList.slice(-2000));

  await kv.put(`product-post-map:${normalizeName(products[0].name)}`, post.slug, { ttl: 180 * 24 * 60 * 60 });
}

/** 실행 결과를 KV `gen:runs` 에 남긴다 (최신이 앞 · 200건). 관리자 페이지 /0 가 성공률과 소요 시간을 그린다. */
async function recordRun(run) {
  const list = await kv.getJson('gen:runs', []);
  await kv.put('gen:runs', [run, ...list].slice(0, 200));
}

async function runOnce(forcedKeyword, forcedQuery) {
  const t0 = Date.now();
  const run = { at: new Date().toISOString(), keyword: forcedKeyword ?? '', ok: 0, attempts: 0, ms: 0 };
  try {
    const item = await pickKeyword(forcedKeyword ? { keyword: forcedKeyword, q: forcedQuery || forcedKeyword } : null);
    run.keyword = item.keyword;
    log(`키워드: ${item.keyword} · 검색어: ${item.q}`);
    const { products, facts } = MOCK ? { products: await chooseProducts(item.q, item.min), facts: [] } : await enrich(await chooseProducts(item.q, item.min));
    log(`제품 ${products.length}개: ${products.map((p) => p.name.slice(0, 30)).join(' | ')}${facts.length ? ` · 참고 자료 ${facts.length}건` : ''}`);
    const [{ article, model, attempts }, video] = await Promise.all([
      writeArticle(item.keyword, item.q, item.t, products, facts),
      MOCK ? null : findVideo(products[0].name, item.keyword).catch(() => null),
    ]);
    Object.assign(run, { model, attempts: attempts ?? 1 });
    if (video) log(`영상: ${video.title} (${video.channel})`);
    let slug = newSlug();
    while (await kv.get(`post:${slug}`)) slug = newSlug();
    const post = buildPost({ article: embedImages(article, products), keyword: item.keyword, products, modelUsed: model, slug, video, facts });
    run.slug = post.slug;
    if (DRY || MOCK) {
      console.log(JSON.stringify(post, null, 2));
      log(`(dry-run) KV 에 쓰지 않음 — slug ${post.slug}`);
    } else {
      await publish(post, products);
      log(`발행 완료: https://usb.kr/${post.slug} — ${post.title}`);
      log(`IndexNow: ${JSON.stringify(await indexNow([`/${post.slug}`, '/', '/sitemap.xml']))}`);
      const sns = await announce(articleMessage(post));
      if (Object.values(sns).some((v) => v !== 'skip')) log(`SNS: ${JSON.stringify(sns)}`);
    }
    run.ok = 1;
    return post;
  } catch (e) {
    run.err = String(e.message).slice(0, 160);
    throw e;
  } finally {
    run.ms = Date.now() - t0;
    await recordRun(run).catch((e) => log(`실행 기록 실패: ${e.message}`));
  }
}

async function main() {
  if (!MOCK) {
    requireEnv(['COUPANG_ACCESS_KEY', 'COUPANG_SECRET_KEY']);
    if (!DRY) requireEnv(['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'KV_NAMESPACE_ID']);
    const health = await ollamaHealthy();
    if (LLM.groqKey) log(`모델: Groq ${LLM.groqModel} (예비: Ollama ${health.ok ? LLM.ollamaModel : '없음'})`);
    else if (!health.ok) throw new Error(`Ollama 사용 불가: ${health.reason}. \`ollama pull ${LLM.ollamaModel}\` 을 먼저 실행하라.`);
  }
  // 심사 불합격이나 제품 없음으로 실패하면 다른 키워드로 다시 고른다. 목표 건수의 세 배까지 시도한다
  let ok = 0;
  let tries = 0;
  while (ok < COUNT && tries < COUNT * 3) {
    tries += 1;
    try {
      await runOnce(opt('keyword'), opt('query'));
      ok += 1;
    } catch (e) {
      log(`실패 (시도 ${tries} · 성공 ${ok}/${COUNT}): ${e.message}`);
      if (opt('keyword') || /모든 키워드/.test(e.message)) break;
    }
  }
  log(`완료: ${ok}/${COUNT} 건 (${tries}회 시도)`);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
