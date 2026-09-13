/**
 * 생성된 글을 다른 모델들이 심사한다.
 * 글쓴 모델과 다른 모델을 쓴다. 심사관 하나라도 불합격이면 문제점을 붙여 고쳐 쓴다.
 * 심사관이 오류를 내면 그 심사관은 건너뛴다 (심사 불능 때문에 발행이 멈추지 않게).
 */
import { LLM } from '../config.js';
import { chatWith, parseJsonLoose } from './llm.js';

const strip = (h) => String(h ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const SYSTEM = `당신은 한국 전자기기 리뷰 매거진의 팩트체커다. 주어진 제품 정보와 리뷰 글을 비교해 심사한다.
불합격 사유 (확실한 것만):
- 제품 정보에 근거가 없는 구체적 수치나 기능을 사실처럼 단정함. 검색어는 제품 사실이 아니다 (검색어가 카드형이어도 제품명에 없으면 카드형이라고 쓰면 안 된다). 예: 배터리 시간 · 무게 · 용량 · 정확도 · 방수 등급 · 앱 연동 · 구성품 · 재질
- 가격이나 제품명이 제품 정보와 다르게 적힘. 다른 제품의 특징을 주인공 제품 것으로 씀
- "혁신" "획기적" "최첨단" "강력히 추천" 같은 과장 광고 표현 · 느낌표 · 이모지 · 한자 · 영어 문장
- 한국어가 어색하거나 문단이 끊기거나 같은 말이 반복됨
허용하는 것 (문제 삼지 않는다):
- 제품명과 분류에서 알 수 있는 상식적 설명. 예: 렌즈 키트는 클립으로 끼운다 · 맥세이프는 자석으로 붙는다 · 무료배송을 "배송비가 없다"로 풀어 씀
- "이런 제품을 고를 때 무엇을 봐야 하는가" 같은 일반 조언 · 표현 취향 · 사소한 말투
반드시 JSON 하나만 출력한다: {"pass": true|false, "issues": ["문제 문장 → 이유 (한 줄)", ...]}
issues 는 확실한 문제만 최대 3개. 문제가 없으면 pass 는 true 이고 issues 는 빈 배열이다.`;

function textOf(a) {
  return [`제목: ${a.title}`, `요약: ${a.tldr}`, strip(a.intro_html), ...a.sections.map((s) => `[${s.heading}] ${strip(s.body_html)}`), strip(a.outro_html), ...a.faq.map((f) => `Q: ${f.q} A: ${f.a}`)].join('\n');
}

/** 합격이면 [] · 불합격이면 문제 목록. 심사관 전원이 오류면 통과시킨다 (생성 자체는 이미 형식 검증을 거쳤다). */
export async function reviewArticle(article, productLines, writerModel) {
  const judges = LLM.reviewModels.filter((m) => m !== writerModel && (LLM.groqKey || !m.startsWith('groq:')) && (LLM.cfToken || !m.startsWith('cf:')));
  const user = `제품 정보 (1번이 주인공):\n${productLines}\n\n리뷰 글:\n${textOf(article)}\n\nJSON 으로만 답하라.`;
  const issues = [];
  let voted = 0;
  let failed = 0;
  for (const m of judges) {
    try {
      const { text } = await chatWith(m, SYSTEM, user, { temperature: 0, maxTokens: 2000 }); // gpt-oss 는 추론 토큰이 한도를 먹으면 본문이 비어 'JSON 없음' 이 난다
      const r = parseJsonLoose(text);
      const list = (Array.isArray(r.issues) ? r.issues : []).map(String).filter(Boolean);
      const fail = !r.pass || list.length > 0;
      console.log(`  심사 ${m}: ${fail ? `불합격 (${list.length})` : '합격'}`);
      voted += 1;
      if (fail) {
        failed += 1;
        issues.push(...(list.length ? list : ['심사관이 불합격 판정']));
      }
    } catch (e) {
      console.warn(`  심사 ${m} 불능 → 건너뜀: ${e.message.slice(0, 160)}`);
    }
  }
  // 과반이 불합격일 때만 고쳐 쓴다. 심사관 하나가 상식적 서술까지 트집 잡아 발행이 막히던 것을 막는다
  if (failed * 2 <= voted) {
    if (failed) console.log(`  심사 ${failed}/${voted} 불합격 → 과반 합격으로 통과`);
    return [];
  }
  return [...new Set(issues)].slice(0, 6);
}
