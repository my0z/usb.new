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
const log = (...m) => console.log(new Date().toISOString().slice(11, 19), ...m);

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

async function pickKeyword(forced) {
  if (forced) return forced;
  const pool = [...KEYWORD_POOL].sort(() => Math.random() - 0.5);
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

async function writeArticle(keyword, query, products) {
  if (MOCK) return { article: parseArticle(mockArticleJson), model: 'mock' };
  const { system, user, productLines } = buildPrompt({ keyword, query, products });
  let lastErr;
  let issues = [];
  let prev = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const feedback = !issues.length ? '' : `\n\n아래는 이전 초안이다. 지적된 문제만 고치고 나머지는 유지해서 같은 JSON 형식으로 다시 출력하라.\n이전 초안: ${JSON.stringify(prev)}\n문제점:\n- ${issues.join('\n- ')}`;
    const { text, model } = await generateJson(system, user + feedback);
    let article;
    try {
      article = parseArticle(text);
    } catch (e) {
      lastErr = e;
      log(`생성 결과 검증 실패 (${attempt}/3): ${e.message} — 원문: ${String(text).replace(/\s+/g, ' ').slice(0, 240)}`);
      continue;
    }
    prev = article;
    issues = await reviewArticle(article, productLines, model);
    if (!issues.length) return { article, model };
    lastErr = new Error(`심사 불합격: ${issues.join(' / ')}`);
    log(`심사 불합격 (${attempt}/3) → 고쳐 씀: ${issues.slice(0, 3).join(' / ')}`);
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

async function runOnce(forcedKeyword, forcedQuery) {
  const item = await pickKeyword(forcedKeyword ? { keyword: forcedKeyword, q: forcedQuery || forcedKeyword } : null);
  log(`키워드: ${item.keyword} · 검색어: ${item.q}`);
  const products = await chooseProducts(item.q, item.min);
  log(`제품 ${products.length}개: ${products.map((p) => p.name.slice(0, 30)).join(' | ')}`);
  const [{ article, model }, video] = await Promise.all([
    writeArticle(item.keyword, item.q, products),
    MOCK ? null : findVideo(products[0].name).catch(() => null),
  ]);
  if (video) log(`영상: ${video.title} (${video.channel})`);
  let slug = newSlug();
  while (await kv.get(`post:${slug}`)) slug = newSlug();
  const post = buildPost({ article: embedImages(article, products), keyword: item.keyword, products, modelUsed: model, slug, video });
  if (DRY || MOCK) {
    console.log(JSON.stringify(post, null, 2));
    log(`(dry-run) KV 에 쓰지 않음 — slug ${post.slug}`);
    return post;
  }
  await publish(post, products);
  log(`발행 완료: https://usb.kr/${post.slug} — ${post.title}`);
  return post;
}

async function main() {
  if (!MOCK) {
    requireEnv(['COUPANG_ACCESS_KEY', 'COUPANG_SECRET_KEY']);
    if (!DRY) requireEnv(['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'KV_NAMESPACE_ID']);
    const health = await ollamaHealthy();
    if (LLM.groqKey) log(`모델: Groq ${LLM.groqModel} (예비: Ollama ${health.ok ? LLM.ollamaModel : '없음'})`);
    else if (!health.ok) throw new Error(`Ollama 사용 불가: ${health.reason}. \`ollama pull ${LLM.ollamaModel}\` 을 먼저 실행하라.`);
  }
  let ok = 0;
  for (let i = 0; i < COUNT; i += 1) {
    try {
      await runOnce(opt('keyword'), opt('query'));
      ok += 1;
    } catch (e) {
      log(`실패 (${i + 1}/${COUNT}): ${e.message}`);
    }
  }
  log(`완료: ${ok}/${COUNT} 건`);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
