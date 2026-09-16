#!/usr/bin/env node
/**
 * 쿠팡 골드박스를 받아 KV deals:latest 에 저장하고 텔레그램 · 스레드 · X 에 요약을 올린다. 크론이 매일 07:30(서울)에 돌린다.
 *   node generator/deals.js            저장 + 알림
 *   node generator/deals.js --dry-run  KV 와 SNS 에 안 쓰고 목록만 출력
 *   node generator/deals.js --quiet    저장만 하고 SNS 는 건너뜀
 */
import { loadEnv, requireEnv } from './lib/env.js';
import { goldbox, deeplinks } from './lib/coupang.js';
import { remoteKv, MemoryKv } from './lib/kv.js';
import { announce, dealsMessage } from './lib/social.js';

loadEnv();
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const QUIET = args.includes('--quiet');
const log = (...m) => console.log(new Date().toLocaleTimeString('ko-KR', { hour12: false, timeZone: 'Asia/Seoul' }), '[deals]', ...m);
const kv = DRY ? new MemoryKv() : remoteKv;

async function main() {
  requireEnv(['COUPANG_ACCESS_KEY', 'COUPANG_SECRET_KEY']);
  if (!DRY) requireEnv(['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'KV_NAMESPACE_ID']);
  let items = await goldbox();
  // 골드박스 링크에 파트너스 태그가 없으면 딥링크로 바꾼다
  const plain = items.filter((p) => !/link\.coupang\.com/.test(p.productUrl));
  if (plain.length) {
    const links = await deeplinks(plain.map((p) => p.productUrl));
    plain.forEach((p, i) => (p.productUrl = links[i]));
  }
  items = items
    .map((p) => ({ ...p, affiliateUrl: p.productUrl }))
    .sort((a, b) => b.discountRate - a.discountRate || b.price - a.price)
    .slice(0, 30);
  log(`골드박스 ${items.length}개: ${items.slice(0, 3).map((p) => `${p.name.slice(0, 20)} ${p.discountRate}%`).join(' | ')}`);
  const doc = { date: new Date().toISOString(), items };
  await kv.put('deals:latest', doc);
  await kv.put(`deals:${doc.date.slice(0, 10)}`, doc, { ttl: 30 * 24 * 3600 });
  if (DRY) return console.log(JSON.stringify(items.slice(0, 5), null, 2));
  if (QUIET) return;
  const r = await announce(dealsMessage(items));
  log(`알림: ${JSON.stringify(r)}`);
}

main().catch((e) => {
  console.error('[deals]', e.message);
  process.exit(1);
});
