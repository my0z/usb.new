// ex.scsi.kr 간단한 게시판: 글은 관리자만 쓰고 방문자는 읽기만 한다. 저장은 D1(DB)의 board 표.
import { escapeHtml as esc } from './html.js';

const PER = 20;
const CSS = `body{margin:0;background:#f6f7f9;color:#222;font:16px/1.7 'Noto Sans KR',system-ui,sans-serif}
.w{max-width:860px;margin:0 auto;padding:20px 16px 60px}
header{background:#111;color:#fff}header .w{padding:14px 16px;display:flex;justify-content:space-between;align-items:center}
header a{color:#fff;text-decoration:none;font-weight:800}
h1{font-size:1.4rem;margin:22px 0 14px}
.row{display:flex;justify-content:space-between;gap:12px;padding:13px 4px;border-bottom:1px solid #e3e5e8}
.row a{color:#222;text-decoration:none;font-weight:600}.row a:hover{text-decoration:underline}
.row time{color:#888;font-size:.85rem;white-space:nowrap}
.card{background:#fff;border-radius:12px;padding:22px;box-shadow:0 1px 4px rgba(0,0,0,.07)}
.body{white-space:normal;word-break:break-word}
.pg{display:flex;gap:8px;justify-content:center;margin-top:22px}.pg a,.pg b{padding:6px 12px;border-radius:8px;background:#fff;text-decoration:none;color:#222;border:1px solid #ddd}
input,textarea{width:100%;box-sizing:border-box;padding:11px;border:1px solid #ccc;border-radius:8px;font:inherit}
textarea{min-height:260px}button,.btn{background:#111;color:#fff;border:0;border-radius:8px;padding:10px 18px;font:inherit;cursor:pointer;text-decoration:none;display:inline-block}
.muted{color:#888;font-size:.9rem}.act{display:flex;gap:10px;margin-top:18px}`;

const shell = (title, inner, admin) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)} | Scsi mania</title><style>${CSS}</style></head><body><header><div class="w"><a href="/">Scsi mania</a><a href="/board">게시판</a></div></header><div class="w">${inner}${admin ? '<p class="muted">관리자 모드</p>' : ''}</div></body></html>`;
const html = (body, status = 200) => new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
const when = (t) => new Date(Number(t) + 9 * 3600e3).toISOString().slice(0, 10);
const linkify = (s) => esc(s).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener nofollow">$1</a>').replace(/\n/g, '<br>');

async function ensure(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS board(id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, body TEXT NOT NULL, t INTEGER NOT NULL)').run();
}

// 쓰기는 ADMIN_KEY 시크릿이 있을 때만 허용한다 (키가 없으면 아무도 못 쓴다)
function adminOf(request, url, env) {
  const key = env?.ADMIN_KEY;
  if (!key) return false;
  return url.searchParams.get('key') === key || (request.headers.get('cookie') ?? '').split(/;\s*/).includes(`bk=${key}`);
}

export async function recentPosts(env, n = 5) {
  if (!env?.DB) return [];
  try { await ensure(env.DB); return (await env.DB.prepare('SELECT id,title,t FROM board ORDER BY id DESC LIMIT ?').bind(n).all()).results ?? []; } catch { return []; }
}

export async function boardRoute(request, url, env) {
  const p = url.pathname.replace(/\/+$/, '');
  if (p !== '/board' && !p.startsWith('/board/')) return null;
  if (!env?.DB) return html(shell('게시판', '<h1>게시판</h1><p>저장소가 연결되지 않았습니다.</p>'), 503);
  await ensure(env.DB);
  const admin = adminOf(request, url, env);
  const setCookie = admin && url.searchParams.get('key') ? { 'set-cookie': `bk=${env.ADMIN_KEY}; Path=/board; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax` } : {};
  const done = (res) => { for (const [k, v] of Object.entries(setCookie)) res.headers.set(k, v); return res; };

  if (p === '/board/write') {
    if (!admin) return html(shell('게시판', '<h1>글쓰기</h1><p>관리자만 쓸 수 있습니다.</p>'), 403);
    if (request.method === 'POST') {
      const f = await request.formData();
      const title = String(f.get('title') ?? '').trim().slice(0, 120), body = String(f.get('body') ?? '').trim().slice(0, 20000);
      if (!title || !body) return html(shell('글쓰기', '<p>제목과 내용을 입력하세요.</p>', true), 400);
      const r = await env.DB.prepare('INSERT INTO board(title,body,t) VALUES(?,?,?)').bind(title, body, Date.now()).run();
      return done(Response.redirect(`${url.origin}/board/${r.meta.last_row_id}`, 303));
    }
    return done(html(shell('글쓰기', `<h1>글쓰기</h1><form method="post" action="/board/write"><p><input name="title" placeholder="제목" maxlength="120" required></p><p><textarea name="body" placeholder="내용" required></textarea></p><button>등록</button></form>`, true)));
  }
  if (p === '/board/delete' && request.method === 'POST') {
    if (!admin) return html(shell('게시판', '<p>관리자만 지울 수 있습니다.</p>'), 403);
    const id = Number((await request.formData()).get('id'));
    if (id) await env.DB.prepare('DELETE FROM board WHERE id=?').bind(id).run();
    return Response.redirect(`${url.origin}/board`, 303);
  }
  const m = p.match(/^\/board\/(\d+)$/);
  if (m) {
    const row = await env.DB.prepare('SELECT id,title,body,t FROM board WHERE id=?').bind(Number(m[1])).first();
    if (!row) return html(shell('게시판', '<h1>없는 글입니다</h1><p><a href="/board">목록으로</a></p>'), 404);
    const del = admin ? `<form method="post" action="/board/delete" onsubmit="return confirm('지울까요?')"><input type="hidden" name="id" value="${row.id}"><button>삭제</button></form>` : '';
    return done(html(shell(row.title, `<h1>${esc(row.title)}</h1><p class="muted">${when(row.t)}</p><div class="card body">${linkify(row.body)}</div><div class="act"><a class="btn" href="/board">목록</a>${del}</div>`, admin)));
  }
  if (p === '/board') {
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const total = (await env.DB.prepare('SELECT COUNT(*) n FROM board').first())?.n ?? 0;
    const rows = (await env.DB.prepare('SELECT id,title,t FROM board ORDER BY id DESC LIMIT ? OFFSET ?').bind(PER, (page - 1) * PER).all()).results ?? [];
    const pages = Math.max(1, Math.ceil(total / PER));
    const list = rows.length ? rows.map((r) => `<div class="row"><a href="/board/${r.id}">${esc(r.title)}</a><time>${when(r.t)}</time></div>`).join('') : '<p class="muted">아직 글이 없습니다.</p>';
    const pg = pages > 1 ? `<div class="pg">${Array.from({ length: pages }, (_, i) => (i + 1 === page ? `<b>${i + 1}</b>` : `<a href="/board?page=${i + 1}">${i + 1}</a>`)).join('')}</div>` : '';
    const write = admin ? '<p><a class="btn" href="/board/write">글쓰기</a></p>' : '';
    return done(html(shell('게시판', `<h1>게시판</h1>${write}${list}${pg}`, admin)));
  }
  return html(shell('게시판', '<h1>없는 주소입니다</h1><p><a href="/board">목록으로</a></p>'), 404);
}

// ex.scsi.kr 방문 수 (서버에서 사람 요청만 센다) — D1 ex_visits 표
export async function countVisit(env, ctx) {
  if (!env?.DB || !ctx) return;
  const day = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  ctx.waitUntil((async () => {
    const up = () => env.DB.prepare('INSERT INTO ex_visits(day,n) VALUES(?,1) ON CONFLICT(day) DO UPDATE SET n=n+1').bind(day).run();
    await up().catch(() => env.DB.prepare('CREATE TABLE IF NOT EXISTS ex_visits(day TEXT PRIMARY KEY, n INTEGER)').run().then(up)).catch(() => {});
  })());
}

// usb.kr/0 에 다른 사이트처럼 보여 줄 요약 카드
export async function exStats(env) {
  if (!env?.DB) return null;
  try {
    await ensure(env.DB);
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS ex_visits(day TEXT PRIMARY KEY, n INTEGER)').run();
    const now = Date.now() + 9 * 3600e3, d = (k) => new Date(now - k * 864e5).toISOString().slice(0, 10);
    const today = (await env.DB.prepare('SELECT n FROM ex_visits WHERE day=?').bind(d(0)).first())?.n ?? 0;
    const week = (await env.DB.prepare('SELECT COALESCE(SUM(n),0) n FROM ex_visits WHERE day>=?').bind(d(6)).first())?.n ?? 0;
    const total = (await env.DB.prepare('SELECT COALESCE(SUM(n),0) n FROM ex_visits').first())?.n ?? 0;
    const posts = (await env.DB.prepare('SELECT COUNT(*) n FROM board').first())?.n ?? 0;
    const f = (n) => Number(n).toLocaleString('ko-KR');
    return { name: 'ex.scsi.kr', path: 'https://ex.scsi.kr/board', kpis: [{ label: '오늘 방문', value: f(today) }, { label: '7일 방문', value: f(week) }, { label: '누적 방문', value: f(total) }, { label: '게시글', value: f(posts) }] };
  } catch (e) { return { name: 'ex.scsi.kr', path: 'https://ex.scsi.kr/board', error: e.message }; }
}
