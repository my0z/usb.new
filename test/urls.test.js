import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractUrls, isCoupang, isShortLink, cleanProductUrl, productId } from '../src/urls.js';

test('글 속 주소를 뽑고 꼬리 문장부호를 뗀다', () => {
  const t = '보세요 https://www.coupang.com/vp/products/1?itemId=2. 그리고 (https://naver.com)';
  assert.deepEqual(extractUrls(t), ['https://www.coupang.com/vp/products/1?itemId=2', 'https://naver.com']);
});

test('쿠팡 판별', () => {
  assert.equal(isCoupang('https://www.coupang.com/vp/products/1'), true);
  assert.equal(isCoupang('https://m.coupang.com/vm/products/1'), true);
  assert.equal(isCoupang('https://naver.com'), false);
  assert.equal(isShortLink('https://link.coupang.com/a/abc'), true);
});

test('추적 파라미터 제거 · 모바일 주소 통일', () => {
  assert.equal(
    cleanProductUrl('https://www.coupang.com/vp/products/123?itemId=4&vendorItemId=5&src=1&spec=2#x'),
    'https://www.coupang.com/vp/products/123?itemId=4&vendorItemId=5',
  );
  assert.equal(cleanProductUrl('https://m.coupang.com/vm/products/123?itemId=4&q=z'), 'https://www.coupang.com/vp/products/123?itemId=4');
  assert.equal(productId('https://www.coupang.com/vp/products/987?itemId=1'), '987');
});
