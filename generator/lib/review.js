/**
 * 생성된 글을 다른 모델들이 심사한다.
 * 글쓴 모델과 다른 모델을 쓴다. 심사관 하나라도 불합격이면 문제점을 붙여 다시 쓴다.
 * 심사관이 오류를 내면 그 심사관은 건너뛴다 (심사 불능 때문에 발행이 멈추지 않게).
 */
import { LLM } from '../config.js';
import { chatWith } from './llm.js';

const SYSTEM = `당신은 한국 전자기기 리뷰 매거진의 팩트체커다. 주어진 제품 정보와 리뷰 글을 비교해 심사한다.
불합격 사유:
- 제품 정보(제품명 · 가격 · 배송)에 없는 기능 · 수치 · 스펙을 사실처럼 단정한 문장 (배터리 시간 · 정확도 · 앱 기능 · 재질 등)
- 가격이나 제품명이 제품 정보와 다르게 적힘
- 과장 광고 표현 · 느낌표 · 이모지 · 한자 · 영어 문장
- 한국어가 어색하거나 문단이 끊기거나 같은 말이 반복됨
- 주인공(1번 제품)이 아닌 제품을 중심으로 씀
"이런 제품을 고를 때 무엇을 봐야 하는가" 같은 일반 설명은 허용한다.
반드시 JSON 하나만 출력한다: {"pass": true|false, "issues": ["문제 문장과 이유", ...]}
문제가 없으면 issues 는 빈 배열이다. 사소한 취향 문제는 issues 에 넣지 않는다.`;

function textOf(a) {
  const strip = (h) => String(h ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return [`제목: ${a.title}`, `요약: ${a.tldr}`, strip(a.intro_html), ...a.sections.map((s) => `[${s.heading}] ${strip(s.body_html)}`), strip(a.outro_html), ...a.faq.map((f) => `Q: ${f.q} A: ${f.a}`)].join('\n');
}

/** 합격이면 [] · 불합격이면 문제 목록. 심사관 전원이 오류면 통과시킨다 (생성 자체는 이미 형식 검증을 거쳤다). */
export async function reviewArticle(article, productLines, writerModel) {
  const judges = LLM.reviewModels.filter((m) => m !== writerModel && (LLM.groqKey || !m.startsWith('groq:')));
  const user = `제품 정보 (1번이 주인공):\n${productLines}\n\n리뷰 글:\n${textOf(article)}\n\nJSON 으로만 답하라.`;
  const issues = [];
  for (const m of judges) {
    try {
      const { text } = await chatWith(m, SYSTEM, user, { temperature: 0, maxTokens: 600 });
      const r = JSON.parse(String(text).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
      const list = (Array.isArray(r.issues) ? r.issues : []).map(String).filter(Boolean);
      console.log(`  심사 ${m}: ${r.pass && !list.length ? '합격' : `불합격 (${list.length})`}`);
      if (!r.pass || list.length) issues.push(...(list.length ? list : ['심사관이 불합격 판정']));
    } catch (e) {
      console.warn(`  심사 ${m} 불능 → 건너뜀: ${e.message.slice(0, 160)}`);
    }
  }
  return [...new Set(issues)].slice(0, 8);
}
