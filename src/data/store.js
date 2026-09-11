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

  async getMany(slugs) {
    const raws = await Promise.all(slugs.map((s) => this.kv.get(`post:${s}`).catch(() => null)));
    return raws.map((r) => safeParse(r, null)).filter(Boolean);
  }

  async popular(limit = 6) {
    if (!this.db) return [];
    try {
      const { results } = await this.db
        .prepare('SELECT slug, count FROM visits ORDER BY count DESC LIMIT ?')
        .bind(limit * 2)
        .all();
      const all = await this.summaries();
      const bySlug = new Map(all.map((s) => [s.slug, s]));
      return results
        .map((r) => ({ ...bySlug.get(r.slug), views: r.count }))
        .filter((s) => s.slug)
        .slice(0, limit);
    } catch {
      return [];
    }
  }

  async viewCount(slug) {
    if (!this.db) return 0;
    try {
      const row = await this.db.prepare('SELECT count FROM visits WHERE slug = ?').bind(slug).first();
      return row?.count ?? 0;
    } catch {
      return 0;
    }
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
