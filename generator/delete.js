#!/usr/bin/env node
/** 글 삭제: node generator/delete.js <slug> [slug...] */
import { loadEnv, requireEnv } from './lib/env.js';
import { kvGetJson, kvPut } from './lib/kv.js';

loadEnv();
requireEnv(['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'KV_NAMESPACE_ID']);
const slugs = process.argv.slice(2);
if (!slugs.length) {
  console.error('사용법: node generator/delete.js <slug> [slug...]');
  process.exit(1);
}
const base = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${process.env.KV_NAMESPACE_ID}/values/`;
for (const slug of slugs) {
  await fetch(base + encodeURIComponent(`post:${slug}`), { method: 'DELETE', headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` } });
}
await kvPut('index', (await kvGetJson('index', [])).filter((s) => !slugs.includes(s)));
await kvPut('posts:summary-list', (await kvGetJson('posts:summary-list', [])).filter((p) => !slugs.includes(p.slug)));
console.log(`삭제: ${slugs.join(' ')}`);
