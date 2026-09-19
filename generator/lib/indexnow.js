/**
 * IndexNow. 새 URL 을 네이버 · 빙 등에 바로 알린다 (네이버 서치어드바이저가 IndexNow 를 받는다).
 * api.indexnow.org 는 참여 검색엔진 전체에 전달하고 네이버 엔드포인트에도 한 번 더 보낸다. 실패해도 발행은 그대로 간다.
 */
import { INDEXNOW_KEY } from '../config.js';

const SITE = (process.env.SITE_URL || 'https://usb.kr').replace(/\/$/, '');

export async function indexNow(paths) {
  const host = new URL(SITE).host;
  const body = JSON.stringify({ host, key: INDEXNOW_KEY, keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`, urlList: paths.map((p) => `${SITE}${p}`) });
  const out = {};
  for (const [name, url] of [['indexnow', 'https://api.indexnow.org/indexnow'], ['naver', 'https://searchadvisor.naver.com/indexnow']]) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, body, signal: AbortSignal.timeout(10000) });
      out[name] = r.status;
    } catch (e) {
      out[name] = e.message;
    }
  }
  return out;
}
