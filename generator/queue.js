#!/usr/bin/env node
/**
 * 관리자 페이지(/0)에서 넣은 글 생성 요청을 가져와 하나씩 발행한다. 크론이 5분마다 돌린다.
 *   node generator/queue.js            대기 요청을 모두 처리
 *   QUEUE_MOCK=1 node generator/queue.js   run.js 를 --mock 으로 돌려 흐름만 점검
 * 필요한 .env: ADMIN_KEY (워커 시크릿과 같은 값) · SITE_URL (기본 https://usb.kr)
 */
import { execFile, execSync } from 'node:child_process';
import { loadEnv, requireEnv } from './lib/env.js';

loadEnv();
requireEnv(['ADMIN_KEY']);
const SITE = (process.env.SITE_URL || 'https://usb.kr').replace(/\/$/, '');
const log = (...m) => console.log(new Date().toLocaleTimeString('ko-KR', { hour12: false, timeZone: 'Asia/Seoul' }), '[queue]', ...m);

const api = (path, init) => fetch(`${SITE}${path}?key=${encodeURIComponent(process.env.ADMIN_KEY)}`, { ...init, signal: AbortSignal.timeout(15000) });

function runOnce(item) {
  const args = ['generator/run.js', '--keyword', item.keyword || item.q, '--query', item.q, ...(process.env.QUEUE_MOCK ? ['--mock'] : [])];
  return new Promise((resolve) => {
    execFile(process.execPath, args, { timeout: 15 * 60 * 1000, maxBuffer: 8 * 1024 * 1024 }, (err, stdout, stderr) => {
      const out = `${stdout}\n${stderr}`;
      const slug = out.match(/발행 완료: \S+\/([^\s/]+)/)?.[1] ?? (process.env.QUEUE_MOCK ? out.match(/slug (\w+)/)?.[1] : null);
      if (slug) return resolve({ ok: true, slug });
      const reason = out.split('\n').filter((l) => /실패|Error|오류|누락|없다|없음/.test(l)).pop() ?? err?.message ?? '원인 불명';
      resolve({ ok: false, err: reason.replace(/^\S+ /, '').slice(0, 160) });
    });
  });
}

async function main() {
  // 정기 발행(run.js)과 겹치면 KV 목록을 서로 덮어쓸 수 있어 다음 틱으로 미룬다
  const running = execSync('pgrep -f "[g]enerator/run.js" || true').toString().trim();
  if (running) return log('run.js 실행 중이라 건너뜀');
  const res = await api('/0/queue');
  if (!res.ok) throw new Error(`대기 목록 ${res.status}`);
  const items = await res.json();
  if (!items.length) return;
  for (const item of items) {
    log(`#${item.id} ${item.q} (${item.keyword})`);
    const result = await runOnce(item);
    log(`#${item.id} ${result.ok ? `완료 /${result.slug}` : `실패: ${result.err}`}`);
    await api('/0/queue', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: item.id, ...result }) });
  }
}

main().catch((e) => {
  console.error('[queue]', e.message);
  process.exit(1);
});
