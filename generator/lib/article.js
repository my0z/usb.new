/**
 * 프롬프트와 결과 검증.
 * 모델에는 제품 사실만 압축해서 넘긴다. 긴 설명이나 페이지 원문은 넣지 않는다.
 */

const SYSTEM = `당신은 한국 전자기기 리뷰 매거진의 에디터다. 최근 출시된 전자기기와 스마트 가젯을 소개하는 리뷰를 쓴다. 무엇이 이전 세대나 흔한 제품과 다른지에 초점을 맞춘다.
규칙:
- 반드시 JSON 하나만 출력한다. 설명이나 마크다운 코드블록을 붙이지 않는다.
- 한국어 경어체("~합니다")로 쓴다. 과장 광고 문구와 이모지는 쓰지 않는다.
- 주어진 제품 정보(제품명 · 가격 · 배송)에 없는 기능이나 수치를 지어내지 않는다. 센서 정확도 · 암호화 · 앱 연동 · 배터리 시간처럼 제품명에 없는 것은 쓰지 않는다. 대신 "이런 제품을 고를 때 무엇을 봐야 하는가"를 설명한다.
- 느낌표와 "혁신" "최첨단" "강력히 추천" 같은 광고 표현을 쓰지 않는다. 담담한 설명체로 쓴다.
- 문단은 <p> 태그로 감싼다. 다른 HTML 태그는 쓰지 않는다.
- 첫 번째 제품이 주인공이다. 나머지는 비교 대상으로 짧게 다룬다.
출력 JSON 형식:
{
  "title": "40자 이내 제목. 제품 종류와 핵심 매력 한 가지",
  "tldr": "90자 이내 한 줄 요약",
  "intro_html": "<p>..</p><p>..</p>  (2문단. 왜 이 제품이 눈에 띄는지)",
  "sections": [
    {"heading": "소제목", "body_html": "<p>..</p><p>..</p>"},
    {"heading": "소제목", "body_html": "<p>..</p><p>..</p>"},
    {"heading": "소제목", "body_html": "<p>..</p>"}
  ],
  "outro_html": "<p>누구에게 맞는지 한 문단으로 정리</p>",
  "faq": [
    {"q": "질문", "a": "답변 한두 문장"},
    {"q": "질문", "a": "답변 한두 문장"},
    {"q": "질문", "a": "답변 한두 문장"}
  ]
}`;

function won(n) {
  return `${Number(n).toLocaleString('ko-KR')}원`;
}

export function buildPrompt({ keyword, query, products }) {
  const lines = products.map((p, i) => {
    const ship = p.isRocket ? '로켓배송' : p.isFreeShipping ? '무료배송' : '일반배송';
    return `${i + 1}. ${p.name} — ${won(p.price)} · ${ship}${p.category ? ` · 분류: ${p.category}` : ''}`;
  });
  const user = `주제 키워드: ${keyword}
검색어: ${query}
제품 목록 (1번이 주인공):
${lines.join('\n')}

섹션 구성 제안: 1) 무엇이 새로운가 2) 실제로 쓸 때 어떤 점이 편한가 3) 비교 대상과의 차이와 고를 때 기준
위 형식의 JSON 으로만 답하라.`;
  return { system: SYSTEM, user };
}

function stripCodeFence(text) {
  return String(text)
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
}

function ensureParagraphs(html) {
  const s = String(html ?? '').trim();
  if (!s) return '';
  if (/<p[\s>]/i.test(s)) return s;
  return s
    .split(/\n{2,}|\n/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => `<p>${t}</p>`)
    .join('');
}

const BANNED = /[一-鿿]|<script|<iframe|javascript:/i;

/** 모델 출력이 형식에 맞는지 확인하고 정리한다. 실패하면 이유를 던진다. */
export function parseArticle(text) {
  let obj;
  try {
    obj = JSON.parse(stripCodeFence(text));
  } catch (e) {
    throw new Error(`JSON 파싱 실패: ${e.message}`);
  }
  const calm = (t) => String(t ?? '').replace(/!+/g, '.').replace(/\.{2,}/g, '.').trim();
  const title = calm(obj.title);
  const tldr = calm(obj.tldr);
  const intro_html = ensureParagraphs(obj.intro_html);
  const outro_html = ensureParagraphs(obj.outro_html);
  const sections = (Array.isArray(obj.sections) ? obj.sections : [])
    .map((s) => ({ heading: String(s?.heading ?? '').trim(), body_html: ensureParagraphs(s?.body_html) }))
    .filter((s) => s.heading && s.body_html)
    .slice(0, 5);
  const faq = (Array.isArray(obj.faq) ? obj.faq : [])
    .map((f) => ({ q: String(f?.q ?? '').trim(), a: String(f?.a ?? '').trim() }))
    .filter((f) => f.q && f.a)
    .slice(0, 5);

  if (title.length < 8 || title.length > 60) throw new Error(`제목 길이 이상: "${title}"`);
  if (!intro_html) throw new Error('intro 없음');
  if (sections.length < 2) throw new Error('섹션 부족');
  const all = [title, tldr, intro_html, outro_html, ...sections.flatMap((s) => [s.heading, s.body_html]), ...faq.flatMap((f) => [f.q, f.a])].join(' ');
  if (BANNED.test(all)) throw new Error('허용되지 않는 문자나 태그 포함(한자 · 스크립트)');
  const textLen = all.replace(/<[^>]+>/g, '').length;
  if (textLen < 500) throw new Error(`본문이 너무 짧다 (${textLen}자)`);

  return { title, tldr: tldr.slice(0, 120), intro_html, sections, outro_html, faq };
}

export function makeExcerpt(html, max = 150) {
  const t = String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max).trim()}…` : t;
}
