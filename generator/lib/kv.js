/**
 * Cloudflare KV REST 클라이언트.
 * 기존 워커와 같은 키 규칙을 지켜서 두 사이트 모두 새 글을 바로 읽게 한다.
 */
const API = 'https://api.cloudflare.com/client/v4';

function base() {
  return `${API}/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${process.env.KV_NAMESPACE_ID}`;
}

function headers(extra = {}) {
  return { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, ...extra };
}

export async function kvGet(key) {
  const res = await fetch(`${base()}/values/${encodeURIComponent(key)}`, { headers: headers(), signal: AbortSignal.timeout(15000) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`KV GET ${key} 실패: ${res.status} ${(await res.text()).slice(0, 160)}`);
  return res.text();
}

export async function kvGetJson(key, fallback) {
  const raw = await kvGet(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function kvPut(key, value, { ttl = null } = {}) {
  const url = new URL(`${base()}/values/${encodeURIComponent(key)}`);
  if (ttl) url.searchParams.set('expiration_ttl', String(ttl));
  const res = await fetch(url, {
    method: 'PUT',
    headers: headers({ 'Content-Type': 'text/plain; charset=utf-8' }),
    body: typeof value === 'string' ? value : JSON.stringify(value),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`KV PUT ${key} 실패: ${res.status} ${(await res.text()).slice(0, 160)}`);
}

/** 메모리 KV. --mock 이나 --dry-run 에서 쓴다. */
export class MemoryKv {
  constructor(seed = {}) {
    this.map = new Map(Object.entries(seed));
  }
  async get(k) {
    return this.map.has(k) ? this.map.get(k) : null;
  }
  async getJson(k, fb) {
    const v = await this.get(k);
    if (v === null) return fb;
    try {
      return JSON.parse(v);
    } catch {
      return fb;
    }
  }
  async put(k, v) {
    this.map.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  }
}

export const remoteKv = { get: kvGet, getJson: kvGetJson, put: kvPut };
