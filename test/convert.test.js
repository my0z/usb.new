import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convert } from '../src/convert.js';
import { DEFAULT_DISCLOSURE } from '../src/caption.js';

process.env.COUPANG_ACCESS_KEY = 'a';
process.env.COUPANG_SECRET_KEY = 'b';

const fakeFetch = async (url, init) => {
  const body = JSON.parse(init.body);
  assert.match(init.headers.Authorization, /^CEA algorithm=HmacSHA256, access-key=a, signed-date=\d{6}T\d{6}Z, signature=[0-9a-f]{64}$/);
  return {
    ok: true,
    status: 200,
    text: async () =>
      JSON.stringify({ rCode: '0', data: body.coupangUrls.map((u, i) => ({ originalUrl: u, shortenUrl: `https://link.coupang.com/a/x${i}` })) }),
  };
};

test('붙여 넣은 글 → 링크와 설명', async () => {
  const text = '이거 https://www.coupang.com/vp/products/1?itemId=9&src=t 랑 https://link.coupang.com/a/old 그리고 https://naver.com';
  const r = await convert(text, { fetchImpl: fakeFetch, intro: '오늘 제품', hashtags: ['쿠팡', '#추천'] });
  assert.equal(r.items[0].link, 'https://link.coupang.com/a/x0');
  assert.equal(r.items[0].clean, 'https://www.coupang.com/vp/products/1?itemId=9');
  assert.equal(r.items[1].already, true);
  assert.equal(r.items[2].skipped, '쿠팡 주소가 아니다');
  assert.ok(r.caption.startsWith('오늘 제품\n'));
  assert.ok(r.caption.includes(DEFAULT_DISCLOSURE));
  assert.ok(r.caption.endsWith('#쿠팡 #추천'));
});

test('쿠팡 주소가 없으면 API 를 안 부른다', async () => {
  const r = await convert('https://naver.com', { fetchImpl: () => assert.fail('호출되면 안 된다') });
  assert.equal(r.caption, '');
});
