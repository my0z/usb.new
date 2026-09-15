/** 붙여 넣은 글 한 덩어리 → 제휴 링크 목록 + 설명 글. CLI 와 웹 화면이 같이 쓴다. */
import { extractUrls, isCoupang, isShortLink, cleanProductUrl, productId } from './urls.js';
import { deeplinks } from './coupang.js';
import { buildCaption } from './caption.js';

export async function convert(text, opts = {}) {
  const urls = extractUrls(text);
  const items = [];
  const toConvert = [];
  for (const raw of urls) {
    if (!isCoupang(raw)) {
      items.push({ input: raw, link: null, skipped: '쿠팡 주소가 아니다' });
      continue;
    }
    if (isShortLink(raw)) {
      items.push({ input: raw, link: raw, skipped: null, already: true });
      continue;
    }
    const clean = cleanProductUrl(raw);
    const it = { input: raw, clean, productId: productId(clean), link: null, skipped: null };
    items.push(it);
    toConvert.push(it);
  }
  if (toConvert.length) {
    const links = await deeplinks(toConvert.map((it) => it.clean), opts);
    toConvert.forEach((it, i) => {
      it.link = links[i];
      if (!it.link) it.skipped = '쿠팡이 링크를 돌려주지 않았다';
    });
  }
  const ok = items.filter((it) => it.link);
  const caption = ok.length ? buildCaption(ok.map((it) => ({ title: it.title, link: it.link })), opts) : '';
  return { items, caption };
}
