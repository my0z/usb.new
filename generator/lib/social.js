/**
 * 텔레그램 · 스레드 · X 에 글을 올린다. 키가 없는 곳은 건너뛴다.
 * .env: TELEGRAM_BOT_TOKEN · TELEGRAM_CHAT_ID(@채널명 또는 숫자) · THREADS_USER_ID · THREADS_TOKEN
 *       X_API_KEY · X_API_SECRET · X_ACCESS_TOKEN · X_ACCESS_SECRET
 */
import { createHmac, randomBytes } from 'node:crypto';

const env = (k) => process.env[k] || '';
const timeout = () => AbortSignal.timeout(20000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function telegram({ text, imageUrl }) {
  const token = env('TELEGRAM_BOT_TOKEN');
  const chat = env('TELEGRAM_CHAT_ID');
  if (!token || !chat) return 'skip';
  const send = (method, body) =>
    fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: timeout() }).then(async (r) => {
      if (!r.ok) throw new Error(`telegram ${r.status}: ${(await r.text()).slice(0, 120)}`);
    });
  if (imageUrl && text.length <= 1000) {
    try {
      await send('sendPhoto', { chat_id: chat, photo: imageUrl, caption: text });
      return 'ok';
    } catch {}
  }
  await send('sendMessage', { chat_id: chat, text, disable_web_page_preview: false });
  return 'ok';
}

async function threads({ text, imageUrl }) {
  const user = env('THREADS_USER_ID');
  const token = env('THREADS_TOKEN');
  if (!user || !token) return 'skip';
  const api = async (path, params) => {
    const r = await fetch(`https://graph.threads.net/v1.0/${user}/${path}`, { method: 'POST', body: new URLSearchParams({ ...params, access_token: token }), signal: timeout() });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.id) throw new Error(`threads ${r.status}: ${JSON.stringify(d).slice(0, 160)}`);
    return d.id;
  };
  let id;
  try {
    id = imageUrl ? await api('threads', { media_type: 'IMAGE', image_url: imageUrl, text }) : await api('threads', { media_type: 'TEXT', text });
  } catch (e) {
    if (!imageUrl) throw e;
    id = await api('threads', { media_type: 'TEXT', text });
  }
  if (imageUrl) await sleep(5000); // 이미지 컨테이너는 처리 시간이 필요하다
  await api('threads_publish', { creation_id: id });
  return 'ok';
}

const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

/** OAuth 1.0a (HMAC-SHA1) 로 서명한 X API v2 트윗. */
async function x({ textShort }) {
  const keys = ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET'].map(env);
  if (keys.some((k) => !k)) return 'skip';
  const [apiKey, apiSecret, accessToken, accessSecret] = keys;
  const url = 'https://api.x.com/2/tweets';
  const oauth = {
    oauth_consumer_key: apiKey,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: accessToken,
    oauth_version: '1.0',
  };
  const base = ['POST', enc(url), enc(Object.keys(oauth).sort().map((k) => `${enc(k)}=${enc(oauth[k])}`).join('&'))].join('&');
  oauth.oauth_signature = createHmac('sha1', `${enc(apiSecret)}&${enc(accessSecret)}`).update(base).digest('base64');
  const header = `OAuth ${Object.keys(oauth).sort().map((k) => `${enc(k)}="${enc(oauth[k])}"`).join(', ')}`;
  const r = await fetch(url, { method: 'POST', headers: { authorization: header, 'content-type': 'application/json' }, body: JSON.stringify({ text: textShort }), signal: timeout() });
  if (!r.ok) throw new Error(`x ${r.status}: ${(await r.text()).slice(0, 160)}`);
  return 'ok';
}

/**
 * 세 곳에 올린다. { text, textShort, imageUrl }. textShort 는 X 용 (한글 140자 안).
 * 결과는 { telegram: 'ok'|'skip'|'오류' ... } 로 돌려주고 절대 던지지 않는다.
 */
export async function announce(msg) {
  const out = {};
  for (const [name, fn] of [['telegram', telegram], ['threads', threads], ['x', x]]) {
    try {
      out[name] = await fn(msg);
    } catch (e) {
      out[name] = e.message;
    }
  }
  return out;
}

/** X 는 280자인데 한글은 2자로 세니 링크(23) 빼고 120자 안으로 줄인다. */
export function shorten(s, max = 120) {
  const t = String(s).replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export function articleMessage(post, site = 'https://usb.kr') {
  const link = `${site}/${post.slug}`;
  const tldr = post.tldr || post.metaDescription || '';
  return {
    text: `${post.title}\n\n${tldr}\n\n${link}`.trim(),
    textShort: `${shorten(post.title, 100)}\n${link}`,
    imageUrl: post.products?.[0]?.image || null,
  };
}

export function dealsMessage(items, site = 'https://usb.kr') {
  const top = items.slice(0, 5);
  const line = (p, i) => `${i + 1}. ${shorten(p.name, 34)} ${p.discountRate ? `${p.discountRate}%↓ ` : ''}${p.price.toLocaleString('ko-KR')}원`;
  const date = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', timeZone: 'Asia/Seoul' });
  return {
    text: `🔥 ${date} 쿠팡 골드박스 특가\n\n${top.map(line).join('\n')}\n\n전체 보기 👉 ${site}/deals`,
    textShort: `🔥 오늘의 쿠팡 골드박스\n${top.slice(0, 3).map((p, i) => line(p, i)).join('\n')}\n${site}/deals`,
    imageUrl: top[0]?.image || null,
  };
}
