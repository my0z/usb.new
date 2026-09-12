# USB.KR

usb.kr 리뉴얼 사이트. USB 주변기기를 다루는 매거진 · 리뷰형 구조이며 Cloudflare Workers 위에서 서버 사이드 렌더링으로 동작한다.

## 구성

- **런타임** — Cloudflare Workers (모듈 워커)
- **데이터** — 전용 KV `new-usb-posts`. 글은 `generator/` 가 발행한다. 기존 usb.kr 워커와 독립이다
- **렌더링** — 의존성 없는 태그드 템플릿 기반 SSR
- **정적 자산** — Workers Assets 바인딩 (`public/`)
- **빌드 단계 없음** — 소스를 그대로 배포한다

## 화면

| 경로 | 설명 |
| --- | --- |
| `/` | 히어로 커버 글 1건 + 카드 그리드 + 인기 순위 |
| `/posts?page=N` | 전체 글 목록 |
| `/categories` `/category/:slug` | 카테고리 |
| `/:slug` | 글 본문 (기존 usb.kr 과 같은 주소) · `/post/:slug` 는 리다이렉트 |
| `/search?q=` | 제목 · 키워드 · 요약 검색 |
| `/img/:token` | 쿠팡 이미지 프록시 (기존과 동일 규칙) |
| `/out?u=&s=` | 쿠팡 아웃바운드 리다이렉트 (허용 호스트만) |
| `/about` `/privacy` | 소개 · 개인정보처리방침 |
| `/rss.xml` `/feed.xml` `/sitemap.xml` `/llms.txt` `/robots.txt` | 피드와 색인용 |
| `/healthz` | 상태 확인 JSON (`source` 가 `kv` 면 실데이터) |
| `/0` | 관리자 통계. 방문(사람만 · 재방문 구분) · 발행 현황 · 구글 애널리틱스 링크 |

구글 애널리틱스는 `wrangler.jsonc` 의 `GA_ID` 에 GA4 측정 ID(`G-XXXXXXXX`)를 넣고 배포하면 모든 페이지에 태그가 들어간다. 비워 두면 안 넣는다.

## 디렉터리

```
src/
  index.js            라우터 · 이미지 프록시 · 아웃바운드 · 피드 · 사이트맵
  data/store.js       KV/D1 저장소 어댑터 (바인딩 없으면 fixtures)
  data/categories.js  카테고리 키워드 매핑
  data/fixtures.js    로컬 개발용 샘플 글
  lib/html.js         이스케이프 · 태그드 템플릿 · 응답 헬퍼
  views/              layout · home · post · list · about · notFound · components
public/assets/        스타일시트와 커버 이미지
scripts/gen-covers.mjs 커버 SVG 생성기
```

## 개발

```bash
npm install
npm run dev          # fixtures 로 동작 · http://127.0.0.1:8787
npm run dev:remote   # 실제 KV/D1 을 읽으며 동작
npm run deploy       # Cloudflare 계정에 배포
```

커버 이미지를 다시 만들려면 `node scripts/gen-covers.mjs` 를 실행한다.

## 데이터 소스

| 저장소 | 키 / 테이블 | 용도 |
| --- | --- | --- |
| KV `POSTS` | `index` | 최신순 slug 배열 |
| KV `POSTS` | `post:<slug>` | 글 본문 JSON |
| KV `POSTS` | `posts:summary-list` | 목록용 요약 캐시 |

기존 usb.kr 의 글 610건을 한 번 가져오려면 `node generator/import-old.js` 를 실행한다 (KV 편집 권한 토큰 필요). 카테고리는 `src/data/categories.js` 의 키워드 매핑으로 자동 분류되며 기존 사이트와 동일하다.

## 신상품 자동 발행

`generator/` 에 오라클 VM 에서 돌아가는 발행기가 있다. 하루 6건 신상품을 찾아 쿠팡 파트너스 링크와 사진을 넣은 리뷰를 쓰고 같은 KV 에 발행한다. 글쓰기는 VM 의 Ollama 로 처리해 월 구독 비용이 없다. 자세한 설치는 [generator/README.md](generator/README.md) 를 본다.

```bash
npm run gen:mock   # 네트워크 없이 점검
npm run gen:dry    # 검색과 생성까지만
npm run gen        # 실제 발행 1건
```

## Claude Code 토큰 절약 설정

저장소에 Claude Code 용 설정이 들어 있다. 이 저장소로 세션을 열면 자동 적용된다.

| 도구 | 적용 위치 | 역할 |
| --- | --- | --- |
| [ponytail](https://github.com/DietrichGebert/ponytail) | `.claude/settings.json` 플러그인 | 최소 코드 · YAGNI · 표준 라이브러리 우선 |
| [graphify](https://github.com/safishamsi/graphify) | `.claude/skills/graphify/` | `/graphify` 로 코드베이스 지식 그래프 |
| [headroom](https://github.com/headroomlabs-ai/headroom) | 로컬 실행 시 `headroom wrap claude` | 컨텍스트 압축 프록시 |
| [ollama](https://github.com/ollama/ollama) | 로컬 실행 시 `ollama launch claude` | 구독 없이 로컬 모델 |

로컬 머신에는 `bash tools/claude-setup.sh` 로 한 번에 설치한다.

## 캐시 정책

HTML 은 엣지에서 5분 캐시 후 하루 동안 stale-while-revalidate 로 서빙한다. 피드와 사이트맵은 30분이다. 검색과 404 는 캐시하지 않는다.

## 도메인 연결

`wrangler.jsonc` 에 `routes` 를 추가하고 Cloudflare 대시보드에서 usb.kr 존을 연결한다.

```jsonc
"routes": [{ "pattern": "usb.kr/*", "zone_name": "usb.kr" }]
```
