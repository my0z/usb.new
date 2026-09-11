#!/usr/bin/env node
/** 기존 usb.kr KV(usb-kr-posts)의 글을 새 KV 로 한 번 복사한다. 이미 있는 글은 건너뛴다. */
import { loadEnv, requireEnv } from './lib/env.js';
import { kvGet, kvPut } from './lib/kv.js';

loadEnv();
requireEnv(['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'KV_NAMESPACE_ID']);
const OLD = process.env.OLD_KV_NAMESPACE_ID || '27853f4363cf4de6a1e7c1c36f3d1640';
const base = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${OLD}`;
const h = { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` };

const oldGet = async (k) => {
  const r = await fetch(`${base}/values/${encodeURIComponent(k)}`, { headers: h });
  return r.ok ? r.text() : null;
};

const idx = JSON.parse((await oldGet('index')) || '[]');
console.log(`옛 index ${idx.length}건`);
let copied = 0;
for (const slug of idx) {
  const key = `post:${slug}`;
  if (await kvGet(key)) continue;
  const raw = await oldGet(key);
  if (!raw) continue;
  await kvPut(key, raw);
  copied += 1;
  if (copied % 25 === 0) console.log(`${copied}건 복사`);
}
const cur = JSON.parse((await kvGet('index')) || '[]');
await kvPut('index', [...new Set([...cur, ...idx])].slice(0, 500));
const sum = await oldGet('posts:summary-list');
if (sum && !(await kvGet('posts:summary-list'))) await kvPut('posts:summary-list', sum);
console.log(`완료: ${copied}건 복사 · index ${Math.min(500, cur.length + idx.length)}건`);
