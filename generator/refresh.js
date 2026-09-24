#!/usr/bin/env node
/**
 * 서치콘솔에서 순위 4~30위로 뜨는 글의 제목과 한줄요약을 그 검색어에 맞게 손본다. 크론이 매일 06:40(서울)에 돌린다.
 *   node generator/refresh.js            최대 3건 고침
 *   node generator/refresh.js --dry-run  KV 에 안 쓰고 결과만 출력
 * 본문은 건드리지 않는다. 같은 글은 30일에 한 번만 본다. 검색어와 글이 안 맞으면 모델이 건너뛴다.
 */
import { loadEnv, requireEnv } from './lib/env.js';
import { LLM } from './config.js';
import { remoteKv } from './lib/kv.js';
import { chatWith, parseJsonLoose } from './lib/llm.js';
import { indexNow } from './lib/indexnow.js';

loadEnv();
const DRY = process.argv.includes('--dry-run');
const LIMIT = 3;
const MONTH = 30 * 24 * 60 * 60;
const log = (...m) => console.log(new Date().toLocaleTimeString('ko-KR', { hour12: false, timeZone: 'Asia/Seoul' }), '[refresh]', ...m);
const kv = DRY ? { ...remoteKv, put: async () => {} } : remoteKv;

const SYSTEM = `당신은 한국 전자기기 리뷰 매거진의 편집장이다. 구글에서 어떤 검색어로 노출되는데 순위가 낮은 글의 제목과 한줄요약만 그 검색어에 맞게 고친다.
규칙:
- 반드시 JSON 하나만 출력한다.
- 제목은 검색어의 단어로 시작하고 40자 이내. 뒤에 글의 핵심 매력 한 가지. 한줄요약은 90자 이내.
- 글에 있는 사실만 쓴다. 새 기능 · 수치 · 제품을 넣지 않는다. 느낌표와 과장 표현을 쓰지 않는다.
- 검색어의 뜻이 글 내용과 안 맞으면 {"skip": "이유"} 만 출력한다.
출력: {"title": "...", "tldr": "..."}`;

const strip = (h) => String(h ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const norm = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, '');
const calm = (t) => String(t ?? '').replace(/!+/g, '.').replace(/(혁신적인|혁신적|획기적인|획기적|최첨단|강력한|강력히|놀라운|압도적인) ?/g, '').trim();
const tokens = (q) => String(q).toLowerCase().split(/\s+/).filter((t) => t.length >= 2);

async function main() {
  requireEnv(['ADMIN_KEY', 'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'KV_NAMESPACE_ID']);
  const model = LLM.brainModel || (LLM.groqKey ? `groq:${LLM.groqModel}` : `ollama:${LLM.ollamaModel}`);
  const site = (process.env.SITE_URL || 'https://usb.kr').replace(/\/$/, '');
  const res = await fetch(`${site}/0/gsc?key=${encodeURIComponent(process.env.ADMIN_KEY)}`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`/0/gsc ${res.status}`);
  const rows = (await res.json()).filter((r) => /^\/[a-z0-9]{5}$/.test(r.path) && r.impressions >= 10);
  // 글마다 노출이 가장 많은 검색어 하나만 본다
  const byPost = new Map();
  for (const r of rows) if (!byPost.has(r.path)) byPost.set(r.path, r);
  log(`후보 ${byPost.size}건 · 모델 ${model}`);
  let done = 0;
  const summaries = await kv.getJson('posts:summary-list', []);
  for (const r of byPost.values()) {
    if (done >= LIMIT) break;
    const slug = r.path.slice(1);
    if (await kv.get(`refreshed:${slug}`)) continue;
    const post = await kv.getJson(`post:${slug}`, null);
    if (!post) continue;
    if (norm(post.title).includes(norm(r.q))) continue; // 이미 그 검색어를 제목에 두고 있다
    const user = `검색어: ${r.q} (현재 ${r.position}위 · 28일 노출 ${r.impressions}회)
현재 제목: ${post.title}
현재 한줄요약: ${post.tldr ?? ''}
한줄결론: ${post.verdict ?? ''}
주인공 제품: ${post.products?.[0]?.name ?? ''}
본문 앞부분: ${strip(post.intro).slice(0, 600)}
소제목: ${(post.sections ?? []).map((s) => s.heading).join(' / ')}

JSON 으로만 답하라.`;
    try {
      const { text } = await chatWith(model, SYSTEM, user, { temperature: 0.3, maxTokens: 3000 });
      const o = parseJsonLoose(text);
      if (o.skip) {
        log(`${slug} 건너뜀 (${r.q}): ${o.skip}`);
        await kv.put(`refreshed:${slug}`, 'skip', { ttl: MONTH });
        continue;
      }
      const title = calm(o.title);
      const tldr = calm(o.tldr).slice(0, 120);
      const missing = tokens(r.q).filter((t) => !norm(title).includes(norm(t)));
      if (title.length < 8 || title.length > 60 || !tldr || missing.length) throw new Error(`형식 이상: "${title}"${missing.length ? ` (빠진 단어 ${missing.join(' ')})` : ''}`);
      const updated = { ...post, title, tldr, metaDescription: tldr, updatedAt: new Date().toISOString(), refreshedFor: r.q };
      await kv.put(`post:${slug}`, updated);
      await kv.put('posts:summary-list', summaries.map((s) => (s.slug === slug ? { ...s, title } : s)));
      await kv.put(`refreshed:${slug}`, r.q, { ttl: MONTH });
      if (!DRY) await indexNow([r.path]).catch(() => {});
      log(`${slug} 고침 (${r.q} · ${r.position}위): "${post.title}" → "${title}"`);
      done += 1;
    } catch (e) {
      log(`${slug} 실패: ${e.message}`);
    }
  }
  log(`완료: ${done}건${DRY ? ' (dry-run · KV 에 안 씀)' : ''}`);
}

main().catch((e) => {
  log(`오류: ${e.message}`);
  process.exit(1);
});
