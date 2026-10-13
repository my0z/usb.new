/**
 * 작성 일시: 2026-10-13 11:08
 * AI 참고 이미지. 쿠팡 사진을 가공하지 않고 제품 종류만으로 새 그림을 만든다.
 * 브랜드와 모델명은 프롬프트에 넣지 않는다. 그래서 특정 제품이나 상표를 닮지 않는다.
 * 결과는 KV `genimg:<slug>` 에 base64 로 저장하고 워커가 `/gen/<slug>.jpg` 로 내보낸다.
 */
import { LLM } from '../config.js';
import { generateJson, parseJsonLoose } from './llm.js';
import { remoteKv } from './kv.js';

const MODEL = '@cf/black-forest-labs/flux-1-schnell';

// 작성 일시: 2026-10-13 11:08
// 제품 종류를 영어 한 줄로 일반화한다. 이미지 모델은 영어 프롬프트를 훨씬 잘 알아듣는다.
async function describe(keyword, category) {
  const { text } = await generateJson(
    'You describe a generic product type for an image generator. Reply JSON only: {"prompt":"..."}. Max 25 words. No brand names no model names no logos no text.',
    `product type: ${keyword}${category ? ` (${category})` : ''}`,
  );
  return String(parseJsonLoose(text).prompt || '').slice(0, 200);
}

// ---------- 이미지 생성 — 작업: 2026-10-13 11:08 ----------
// 작성 일시: 2026-10-13 11:08
// 성공하면 글에 넣을 사이트 안 경로를 돌려준다. 키가 없으면 null 이다.
export async function makeIllustration(slug, keyword, product) {
  if (!LLM.cfToken || !LLM.cfAccount) return null;
  const desc = await describe(keyword, product?.category);
  if (!desc) return null;
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${LLM.cfAccount}/ai/run/${MODEL}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LLM.cfToken}` },
    body: JSON.stringify({ prompt: `${desc}, studio product render on a seamless light gray background with a soft shadow, three-quarter view, no text, no logo, no brand marks`, steps: 4 }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`이미지 생성 ${res.status}: ${(await res.text()).slice(0, 120)}`);
  const b64 = (await res.json())?.result?.image;
  if (!b64) throw new Error('이미지 응답에 image 가 없다');
  await remoteKv.put(`genimg:${slug}`, b64);
  return `/gen/${slug}.jpg`;
}
