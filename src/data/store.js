/**
 * 글 저장소.
 * 운영에서는 기존 usb.kr 이 쓰는 KV(POSTS) 와 D1(DB) 을 그대로 읽는다.
 * 바인딩이 없는 로컬 환경에서는 fixtures 로 대체한다.
 */
import { buildFixturePosts, fixtureVisits } from './fixtures.js';

const INDEX_KEY = 'index';
const SUMMARY_KEY = 'posts:summary-list';

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
    let list = safeParse(await this.kv.get(SUMMARY_KEY), null);
    if (!Array.isArray(list) || !list.length) {
      const idx = await this.index();
      const raws = await Promise.all(idx.slice(0, 200).map((s) => this.kv.get(`post:${s}`).catch(() => null)));
      list = raws.map((r) => safeParse(r, null)).filter(Boolean).map(summarize);
    }
    this._summaries = orderPinned(list.filter((s) => s && s.slug && s.title));
    return this._summaries;
  }

  async get(slug) {
    return safeParse(await this.kv.get(`post:${slug}`), null);
  }

  /** 브라우저 비콘으로만 호출된다. returning 은 재방문 쿠키가 있는 경우. */
  async recordVisit(path, returning = false) {
    if (!this.db) return;
    const day = new Date().toISOString().slice(0, 10);
    const r = returning ? 1 : 0;
    await this.db.prepare('INSERT INTO visits(day, path, n, r) VALUES(?, ?, 1, ?) ON CONFLICT(day, path) DO UPDATE SET n = n + 1, r = r + ?').bind(day, path, r, r).run().catch(() => {});
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

  async popular() {
    return [];
  }

  async viewCount() {
    return 0;
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
  async recordVisit() {}
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
