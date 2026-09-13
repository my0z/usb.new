/**
 * 자동 발행 설정.
 * q 는 쿠팡 검색어이고 keyword 는 글의 분류 키워드다.
 * keyword 는 src/data/categories.js 의 키워드와 맞춰 두면 카테고리에 자동 분류된다.
 * t 는 글이 노리는 검색어다. 사람들이 실제로 치는 "○○ 추천" 꼴이며 제목 앞에 들어간다.
 * min 은 최저가. 이름만 같은 싸구려(그립톡 · 케이스 · 스티커)를 걸러낸다.
 */
import { loadEnv } from './lib/env.js';

loadEnv(); // process.env 를 읽기 전에 .env 를 먼저 채운다

export const DAILY_TARGET = 6;

export const KEYWORD_POOL = [
  // 모바일 액세서리 — 신기하고 도움이 되는 것
  { min: 20000, q: '맥세이프 보조배터리 신상', t: '맥세이프 보조배터리 추천', keyword: '보조배터리' },
  { min: 15000, q: '초슬림 카드형 보조배터리', t: '카드형 보조배터리 추천', keyword: '보조배터리' },
  { min: 20000, q: '3in1 무선충전기 폴더블', t: '3in1 무선충전기 추천', keyword: '무선충전기' },
  { min: 15000, q: 'GaN 충전기 초소형 65W', t: '65W GaN 충전기 추천', keyword: '충전기' },
  { q: '자석 차량용 거치대 맥세이프', t: '맥세이프 차량용 거치대 추천', keyword: '차량용거치대' },
  { min: 40000, q: '스마트폰 짐벌 AI 트래킹', t: '스마트폰 짐벌 추천', keyword: '스마트폰짐벌' },
  { q: '접이식 블루투스 키보드 휴대용', t: '접이식 블루투스 키보드 추천', keyword: '블루투스키보드' },
  { q: '스마트폰 렌즈 매크로 키트', t: '스마트폰 매크로 렌즈 추천', keyword: '스마트폰렌즈' },
  { q: '스마트폰 그립톡 거치대 신상', t: '그립톡 거치대 추천', keyword: '스마트폰그립톡' },
  { q: '멀티포트 충전기 데스크', t: '멀티포트 충전기 추천', keyword: '멀티포트충전기' },
  { q: 'C타입 케이블 디스플레이 전력표시', t: '전력표시 C타입 케이블 추천', keyword: 'C타입케이블' },
  { q: '셀카봉 삼각대 리모컨', t: '셀카봉 삼각대 추천', keyword: '셀카봉' },
  // 웨어러블 · 신기한 도우미
  { min: 50000, q: '스마트링 수면측정', t: '스마트링 추천', keyword: '스마트링' },
  { min: 30000, q: 'AI 번역 이어폰', t: '번역 이어폰 추천', keyword: '무선이어폰' },
  { min: 40000, q: 'AI 녹음기 요약', t: 'AI 녹음기 추천', keyword: 'AI녹음기' },
  { min: 8000, q: '스마트 태그 분실방지 애플 찾기', t: '스마트태그 추천', keyword: '스마트태그' },
  { min: 20000, q: '골전도 이어폰 오픈형 신상', t: '골전도 이어폰 추천', keyword: '골전도이어폰' },
  { min: 40000, q: '스마트워치 배터리 오래가는', t: '배터리 오래가는 스마트워치 추천', keyword: '스마트워치' },
  { min: 80000, q: '스마트글래스 카메라', t: '스마트글래스 추천', keyword: '스마트글래스' },
  // 데스크 · 생활 도우미
  { min: 80000, q: '휴대용 모니터 터치 신상', t: '휴대용 모니터 추천', keyword: '휴대용모니터' },
  { min: 60000, q: '미니 빔프로젝터 넷플릭스 내장', t: '미니 빔프로젝터 추천', keyword: '미니빔프로젝터' },
  { min: 30000, q: '포켓 프린터 스마트폰 사진', t: '포켓 포토프린터 추천', keyword: '포켓프린터' },
  { min: 20000, q: '무선 라벨기 스마트폰 연동', t: '무선 라벨기 추천', keyword: '라벨프린터' },
  { q: 'USB 미니 선풍기 목걸이', t: '목걸이 선풍기 추천', keyword: 'usb선풍기' },
  { q: '모니터 라이트바 무선 리모컨', t: '모니터 라이트바 추천', keyword: '모니터라이트바' },
  { q: '무선 프레젠터 레이저 에어마우스', t: '무선 프레젠터 추천', keyword: '무선프레젠터' },
  { min: 100000, q: '전자책 리더기 컬러', t: '컬러 전자책 리더기 추천', keyword: '전자책리더기' },
  { q: '케이블 정리함 데스크', t: '케이블 정리함 추천', keyword: '케이블정리함' },
  // 차량 · 캠핑
  { min: 30000, q: '차량용 무선 카플레이 동글', t: '무선 카플레이 동글 추천', keyword: '차량용무선카플레이' },
  { q: '차량용 공기청정기 스마트', t: '차량용 공기청정기 추천', keyword: '차량용공기청정기' },
  { min: 80000, q: '포터블 파워스테이션 캠핑 소형', t: '캠핑용 파워스테이션 추천', keyword: '포터블파워스테이션' },
  { q: '캠핑랜턴 보조배터리 겸용', t: '캠핑 랜턴 추천', keyword: '캠핑랜턴' },
  // 스마트홈
  { q: '스마트 플러그 전력측정', t: '스마트 플러그 추천', keyword: '스마트플러그' },
  { min: 20000, q: '홈캠 360도 AI 감지', t: '홈캠 추천', keyword: '홈캠' },
  { min: 60000, q: '스마트 도어락 지문 신상', t: '스마트 도어락 추천', keyword: '스마트도어락' },
];

/** 글 하나에 넣을 제품 수. 첫 번째가 주인공이고 나머지는 비교 대상이다. */
export const PRODUCTS_PER_POST = 3;

/** 본문에 넣을 사진 수 (1~2). */
export const IMAGES_PER_POST = 2;

/** 같은 키워드 재사용 금지 기간과 같은 제품 재사용 금지 기간 (기존 워커와 동일). */
export const KEYWORD_USED_TTL_SECONDS = 5 * 24 * 60 * 60;
export const PRODUCT_USED_TTL_SECONDS = 5 * 24 * 60 * 60;

export const LLM = {
  ollamaUrl: process.env.OLLAMA_URL || 'http://127.0.0.1:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'exaone3.5:7.8b',
  // 토큰 절약: 컨텍스트와 출력 길이를 작게 고정한다.
  numCtx: 4096,
  numPredict: 3500, // 한글은 글자당 토큰이 많아 1600 이면 800자 글이 중간에 잘린다
  temperature: 0.7,
  groqKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
  cfToken: process.env.CLOUDFLARE_API_TOKEN || '',
  cfAccount: process.env.CLOUDFLARE_ACCOUNT_ID || '',
  // 심사관 목록 ("groq:모델" · "ollama:모델" · "cf:@cf/모델" 을 쉼표로). 글쓴 모델은 자동 제외된다.
  reviewModels: (process.env.REVIEW_MODELS ?? 'groq:qwen/qwen3.8-27b,groq:openai/gpt-oss-20b,cf:@cf/meta/llama-3.3-70b-instruct-fp8-fast').split(',').map((s) => s.trim()).filter(Boolean),
};
