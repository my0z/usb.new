/**
 * 글 저장소.
 * 운영에서는 KV(POSTS) 와 D1(DB) 을 읽는다.
 * 바인딩이 없는 로컬 환경에서는 fixtures 로 대체한다.
 */
import { buildFixturePosts, fixtureVisits } from './fixtures.js';

const INDEX_KEY = 'index';
const SUMMARY_KEY = 'posts:summary-list';
// 목록은 아이솔레이트 안에서 60초 공유한다 (엣지 캐시를 안 타는 /search · /0 · 캐시 만료 직후 요청이 KV 를 안 두드리게)
const MEMO_TTL = 60 * 1000;
let memo = { at: 0, list: null };

function safeParse(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function summarize(p) {
  return {
    slug: p.slug,
    title: p.title,
    keyword: p.keyword,
    type: p.type,
    createdAt: p.createdAt,
    intro: p.intro,
    tldr: p.tldr,
    metaDescription: p.metaDescription,
    products: p.products?.[0] ? [p.products[0]] : [],
    productCount: p.products?.length ?? 0,
    pinnedUntil: p.pinnedUntil || 0,
  };
}

function orderPinned(list) {
  const now = Date.now();
  const pinned = list.filter((s) => s.pinnedUntil && s.pinnedUntil > now);
  if (!pinned.length) return list;
  const rest = list.filter((s) => !(s.pinnedUntil && s.pinnedUntil > now));
  pinned.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return [...pinned, ...rest];
}

class KvStore {
  constructor(env) {
    this.kv = env.POSTS;
    this.db = env.DB ?? null;
    this._summaries = null;
  }

  async index() {
    return safeParse(await this.kv.get(INDEX_KEY), []);
  }

  async summaries() {
    if (this._summaries) return this._summaries;
    if (Date.now() - memo.at < MEMO_TTL && memo.list) return (this._summaries = memo.list);
    let list = safeParse(await this.kv.get(SUMMARY_KEY, { cacheTtl: 300 }), null);
    if (!Array.isArray(list) || !list.length) {
      const idx = await this.index();
      const raws = await Promise.all(idx.slice(0, 200).map((s) => this.kv.get(`post:${s}`).catch(() => null)));
      list = raws.map((r) => safeParse(r, null)).filter(Boolean).map(summarize);
    }
    this._summaries = orderPinned(list.filter((s) => s && s.slug && s.title));
    memo = { at: Date.now(), list: this._summaries };
    return this._summaries;
  }

  async get(slug) {
    return safeParse(await this.kv.get(`post:${slug}`, { cacheTtl: 600 }), null);
  }

  /** 브라우저 비콘으로만 호출된다. returning 은 재방문 쿠키가 있는 경우. */
  async recordVisit(path, returning = false) {
    if (!this.db) return;
    const day = new Date().toISOString().slice(0, 10);
    const r = returning ? 1 : 0;
    await this.db.prepare('INSERT INTO visits(day, path, n, r) VALUES(?, ?, 1, ?) ON CONFLICT(day, path) DO UPDATE SET n = n + 1, r = r + ?').bind(day, path, r, r).run().catch(() => {});
  }

  /** 쿠팡 버튼 클릭. /out 을 지날 때 글 slug 별로 센다. 표가 없으면 처음 한 번 만든다. */
  async recordClick(slug) {
    if (!this.db) return;
    const day = new Date().toISOString().slice(0, 10);
    const ins = () => this.db.prepare('INSERT INTO clicks(day, slug, n) VALUES(?, ?, 1) ON CONFLICT(day, slug) DO UPDATE SET n = n + 1').bind(day, slug).run();
    await ins().catch(() => this.db.prepare('CREATE TABLE IF NOT EXISTS clicks(day TEXT, slug TEXT, n INTEGER, PRIMARY KEY(day, slug))').run().then(ins)).catch(() => {});
  }

  /** 글별 7일 클릭과 방문. 방문 path 는 "/slug" 라 앞 슬래시를 떼서 맞춘다. */
  async clickStats() {
    if (!this.db) return null;
    const since = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
    const q = (sql) => this.db.prepare(sql).bind(since).all().then((r) => r.results).catch(() => []);
    const [clicks, visits] = await Promise.all([
      q('SELECT slug, SUM(n) AS n FROM clicks WHERE day >= ? GROUP BY slug'),
      q("SELECT substr(path, 2) AS slug, SUM(n) AS n FROM visits WHERE day >= ? AND path LIKE '/%' GROUP BY path"),
    ]);
    const views = new Map(visits.map((r) => [decodeURIComponent(r.slug), Number(r.n)]));
    const rows = clicks.map((r) => ({ slug: r.slug, clicks: Number(r.n), views: views.get(r.slug) ?? 0 })).sort((a, b) => b.clicks - a.clicks);
    const total = rows.reduce((a, r) => a + r.clicks, 0);
    const totalViews = [...views.values()].reduce((a, n) => a + n, 0);
    return { rows, total, totalViews };
  }

  /* 관리자 페이지에서 넣는 글 생성 요청. VM 의 generator/queue.js 가 5분마다 가져가 발행하고 결과를 적는다. */
  async ensureQueue() {
    await this.db.prepare('CREATE TABLE IF NOT EXISTS gen_queue(id INTEGER PRIMARY KEY AUTOINCREMENT, q TEXT, keyword TEXT, status TEXT DEFAULT \'대기\', at TEXT, done_at TEXT, result TEXT)').run().catch(() => {});
  }
  async enqueueGen(q, keyword) {
    if (!this.db) return;
    await this.ensureQueue();
    await this.db.prepare('INSERT INTO gen_queue(q, keyword, at) VALUES(?, ?, ?)').bind(q, keyword, new Date().toISOString()).run();
  }
  async genQueue(limit = 10) {
    if (!this.db) return [];
    await this.ensureQueue();
    return this.db.prepare('SELECT * FROM gen_queue ORDER BY id DESC LIMIT ?').bind(limit).all().then((r) => r.results).catch(() => []);
  }
  async pendingGen() {
    if (!this.db) return [];
    await this.ensureQueue();
    return this.db.prepare("SELECT id, q, keyword FROM gen_queue WHERE status = '대기' ORDER BY id").all().then((r) => r.results).catch(() => []);
  }
  async finishGen(id, ok, result) {
    if (!this.db) return;
    await this.db.prepare('UPDATE gen_queue SET status = ?, done_at = ?, result = ? WHERE id = ?').bind(ok ? '완료' : '실패', new Date().toISOString(), String(result ?? '').slice(0, 200), Number(id)).run();
  }

  async visitStats() {
    if (!this.db) return null;
    const q = (sql, ...b) => this.db.prepare(sql).bind(...b).all().then((r) => r.results).catch(() => []);
    const since = (d) => new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);
    const [days, top, totals] = await Promise.all([
      q('SELECT day, SUM(n) AS n, SUM(r) AS r FROM visits WHERE day >= ? GROUP BY day ORDER BY day DESC', since(14)),
      q('SELECT path, SUM(n) AS n FROM visits WHERE day >= ? GROUP BY path ORDER BY n DESC LIMIT 20', since(7)),
      q('SELECT SUM(CASE WHEN day = ? THEN n ELSE 0 END) AS today, SUM(CASE WHEN day = ? THEN r ELSE 0 END) AS todayR, SUM(CASE WHEN day >= ? THEN n ELSE 0 END) AS week, SUM(CASE WHEN day >= ? THEN r ELSE 0 END) AS weekR, SUM(n) AS total, SUM(r) AS totalR FROM visits', since(0), since(0), since(7), since(7)),
    ]);
    return { days, top, ...(totals[0] ?? {}) };
  }

  async getMany(slugs) {
    const raws = await Promise.all(slugs.map((s) => this.kv.get(`post:${s}`).catch(() => null)));
    return raws.map((r) => safeParse(r, null)).filter(Boolean);
  }

  /** 발행기 실행 기록. generator/run.js 가 남긴다. 최신이 앞. */
  async genRuns() {
    const v = safeParse(await this.kv.get('gen:runs', { cacheTtl: 60 }), []);
    return Array.isArray(v) ? v : [];
  }

  /** path → 최근 30일 방문 수 */
  async viewsByPath() {
    if (!this.db) return new Map();
    const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const rows = await this.db.prepare('SELECT path, SUM(n) AS n FROM visits WHERE day >= ? GROUP BY path').bind(since).all().then((r) => r.results).catch(() => []);
    return new Map(rows.map((r) => [r.path, Number(r.n)]));
  }

  /** 홈 인기 순위. 최근 30일 방문이 있는 글을 많이 본 순서로. path 는 비콘이 보낸 location.pathname 과 같은 인코딩이다. */
  async popular(limit = 6) {
    const [all, views] = await Promise.all([this.summaries(), this.viewsByPath()]);
    return all
      .map((s) => ({ ...s, views: views.get(`/${encodeURIComponent(s.slug)}`) ?? 0 }))
      .filter((s) => s.views >= 3)
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  }

  /** 글 하나의 최근 30일 방문 수. 본문의 조회 표시에 쓴다. */
  async viewCount(slug) {
    if (!this.db) return 0;
    const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const r = await this.db.prepare('SELECT SUM(n) AS n FROM visits WHERE day >= ? AND path = ?').bind(since, `/${encodeURIComponent(slug)}`).first().catch(() => null);
    return Number(r?.n ?? 0);
  }
}

class FixtureStore {
  constructor() {
    this.posts = buildFixturePosts().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async index() {
    return this.posts.map((p) => p.slug);
  }
  async summaries() {
    return orderPinned(this.posts.map(summarize));
  }
  async get(slug) {
    return this.posts.find((p) => p.slug === slug) ?? null;
  }
  async getMany(slugs) {
    return slugs.map((s) => this.posts.find((p) => p.slug === s)).filter(Boolean);
  }
  async genRuns() {
    return [];
  }
  async popular(limit = 6) {
    const all = await this.summaries();
    return Object.entries(fixtureVisits)
      .sort((a, b) => b[1] - a[1])
      .map(([slug, views]) => ({ ...all.find((s) => s.slug === slug), views }))
      .filter((s) => s.slug)
      .slice(0, limit);
  }
  async viewCount(slug) {
    return fixtureVisits[slug] ?? 0;
  }
  async viewsByPath() {
    return new Map(Object.entries(fixtureVisits).map(([s, n]) => [`/${s}`, n]));
  }
  async recordVisit() {}
  async recordClick() {}
  async clickStats() {
    return null;
  }
  async enqueueGen() {}
  async genQueue() {
    return [];
  }
  async pendingGen() {
    return [];
  }
  async finishGen() {}
  async visitStats() {
    return null;
  }
}

export function getStore(env) {
  return env?.POSTS ? new KvStore(env) : new FixtureStore();
}

export function excerpt(html, max = 130) {
  const text = String(html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

export function paragraphs(html) {
  if (!html) return [];
  const m = String(html).match(/<p[^>]*>[\s\S]*?<\/p>/gi);
  return m && m.length ? m : [String(html)];
}

export function searchSummaries(list, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return list.filter((s) =>
    [s.title, s.keyword, s.tldr, s.metaDescription, s.products?.[0]?.name].filter(Boolean).join(' ').toLowerCase().includes(q),
  );
}
