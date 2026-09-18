/**
 * 생각 담당 모델. 글쓴이가 화면(글)을 만들기 전에 다른 모델이 자료를 읽고 알맹이만 정리한다.
 * 제품 정보와 참고 자료 안에서만 뽑는다. 실패하면 null 을 돌려주고 글쓴이는 예전처럼 자료를 직접 읽는다.
 * .env BRAIN_MODEL ("groq:모델" · "ollama:모델" · "cf:@cf/모델"). 비우면 건너뛴다.
 */
import { LLM } from '../config.js';
import { chatWith, parseJsonLoose } from './llm.js';

const SYSTEM = `당신은 한국 전자기기 리뷰 매거진의 조사 담당이다. 글은 쓰지 않는다. 주어진 제품 정보와 참고 자료를 읽고 글쓴이가 쓸 알맹이만 정리한다.
규칙:
- 반드시 JSON 하나만 출력한다.
- 제품 정보와 참고 자료에 있는 사실만 쓴다. 없는 수치 · 기능 · 사양은 절대 넣지 않는다. 검색어는 제품 사실이 아니다.
- 알맹이마다 어디서 왔는지 적는다 (제품명 · 가격 · 참고 자료 n번).
- 참고 자료끼리 어긋나면 뺀다.
- 자료가 부족하면 알맹이를 억지로 채우지 말고 "확인할 점" 을 늘린다.
출력 JSON 형식:
{
  "verdict": "한 줄 결론 (60자 이내 · 누구에게 맞는지)",
  "points": ["알맹이 한 문장 (출처)", "..."],
  "numbers": ["가격 · 용량 · 비교 수치 한 줄 (출처)", "..."],
  "criteria": ["이 종류를 고를 때 볼 기준 한 줄", "..."],
  "checks": ["자료에 없어서 제품 페이지에서 확인해야 할 점", "..."]
}
points 와 numbers 는 각 5개 이내. criteria 와 checks 는 각 4개 이내.`;

const list = (v, n) => (Array.isArray(v) ? v : []).map((s) => String(s ?? '').trim()).filter(Boolean).slice(0, n);

/** 정리된 답 { verdict, points, numbers, criteria, checks, model } 또는 null. */
export async function think(productLines) {
  const spec = LLM.brainModel;
  if (!spec) return null;
  const { text, model } = await chatWith(spec, SYSTEM, `${productLines}\n\nJSON 으로만 답하라.`, { temperature: 0.2, maxTokens: 1500 });
  const o = parseJsonLoose(text);
  const brief = { verdict: String(o.verdict ?? '').trim().slice(0, 80), points: list(o.points, 5), numbers: list(o.numbers, 5), criteria: list(o.criteria, 4), checks: list(o.checks, 4), model };
  if (!brief.verdict || brief.points.length + brief.criteria.length < 2) throw new Error('정리된 답이 비었다');
  return brief;
}

/** 글쓴이 프롬프트에 붙일 블록. */
export function briefBlock(b) {
  if (!b) return '';
  const sec = (t, a) => (a.length ? `${t}:\n${a.map((s) => `- ${s}`).join('\n')}\n` : '');
  return `\n조사 담당이 위 자료에서 정리한 답 (이 안의 사실만 본문에 쓴다 · 숫자는 그대로 옮긴다 · 확인할 점은 단정하지 말고 확인 항목으로 쓴다):\n한 줄 결론: ${b.verdict}\n${sec('알맹이', b.points)}${sec('숫자', b.numbers)}${sec('고를 때 기준', b.criteria)}${sec('확인할 점', b.checks)}`;
}
