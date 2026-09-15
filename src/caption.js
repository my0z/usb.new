/** 쇼츠 설명란에 그대로 붙일 글을 만든다. 고지 문구는 반드시 들어간다. */

export const DEFAULT_DISCLOSURE =
  '이 포스팅은 쿠팡 파트너스 활동의 일환으로 이에 따른 일정액의 수수료를 제공받습니다.';

export function disclosure() {
  return process.env.DISCLOSURE || DEFAULT_DISCLOSURE;
}

/**
 * items: [{ title, link }]
 * 제목이 없으면 "상품 N" 으로 채운다.
 */
export function buildCaption(items, { intro = '', hashtags = [] } = {}) {
  const lines = [];
  if (intro) lines.push(intro.trim(), '');
  items.forEach((it, i) => {
    const label = it.title ? it.title : `상품 ${i + 1}`;
    lines.push(`🛒 ${label}`, it.link, '');
  });
  lines.push(disclosure());
  if (hashtags.length) lines.push('', hashtags.map((h) => (h.startsWith('#') ? h : '#' + h)).join(' '));
  return lines.join('\n');
}
