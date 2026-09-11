# USB.KR

usb.kr 리뉴얼 사이트. USB 주변기기를 다루는 매거진 · 리뷰형 구조이며 Cloudflare Workers 위에서 서버 사이드 렌더링으로 동작한다.

## 구성

- **런타임** — Cloudflare Workers (모듈 워커)
- **데이터** — 기존 usb.kr 이 쓰는 KV `usb-kr-posts` 와 D1 `usbkr-db` 를 그대로 읽는다 (쓰기 없음)
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
| D1 `DB` | `visits` | 조회수 (인기 순위) |

글은 기존 usb.kr 워커(`my0z/usbkr`)의 크론이 KV 에 계속 발행한다. 이 사이트는 읽기만 하므로 새 글이 자동으로 반영된다. 카테고리는 `src/data/categories.js` 의 키워드 매핑으로 자동 분류되며 기존 사이트와 동일하다.

## 캐시 정책

HTML 은 엣지에서 5분 캐시 후 하루 동안 stale-while-revalidate 로 서빙한다. 피드와 사이트맵은 30분이다. 검색과 404 는 캐시하지 않는다.

## 도메인 연결

`wrangler.jsonc` 에 `routes` 를 추가하고 Cloudflare 대시보드에서 usb.kr 존을 연결한다.

```jsonc
"routes": [{ "pattern": "usb.kr/*", "zone_name": "usb.kr" }]
```
