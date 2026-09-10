# USB.KR

usb.kr 리뉴얼 사이트. USB 주변기기를 다루는 매거진 · 리뷰형 구조이며 Cloudflare Workers 위에서 서버 사이드 렌더링으로 동작한다.

## 구성

- **런타임** — Cloudflare Workers (모듈 워커)
- **렌더링** — 의존성 없는 태그드 템플릿 기반 SSR
- **정적 자산** — Workers Assets 바인딩 (`public/`)
- **빌드 단계 없음** — 소스를 그대로 배포한다

## 화면

| 경로 | 설명 |
| --- | --- |
| `/` | 히어로 커버 리뷰 1건 + 리뷰 카드 그리드 |
| `/reviews` | 전체 기사 목록 |
| `/category/:slug` | 카테고리별 목록 |
| `/review/:slug` | 리뷰 본문 · 한 줄 평 · 장단점 · 측정 요약 |
| `/search?q=` | 제목과 태그와 카테고리 대상 검색 |
| `/about` | 매체 소개와 평점 기준 |
| `/rss.xml` `/sitemap.xml` `/robots.txt` | 피드와 색인용 |
| `/healthz` | 상태 확인 JSON |

## 디렉터리

```
src/
  index.js            라우터 · 캐시 헤더 · 피드 · 사이트맵
  data/reviews.js     리뷰 콘텐츠와 조회 헬퍼
  lib/html.js         이스케이프 · 태그드 템플릿 · 응답 헬퍼
  views/              layout · home · review · list · about · notFound · components
public/assets/        스타일시트와 커버 이미지
scripts/gen-covers.mjs 커버 SVG 생성기
```

## 개발

```bash
npm install
npm run dev      # http://127.0.0.1:8787
npm run deploy   # Cloudflare 계정에 배포
```

커버 이미지를 다시 만들려면 `node scripts/gen-covers.mjs` 를 실행한다.

## 콘텐츠 추가

`src/data/reviews.js` 의 `reviews` 배열에 항목을 추가하면 목록과 카테고리와 피드와 사이트맵에 자동 반영된다. 필드는 다음과 같다.

- `slug` `title` `subtitle` `category` `author` `date` `readingTime` `cover`
- `score` — 0 이면 평점 없는 가이드 기사로 처리된다
- `featured` — `true` 인 항목이 홈 히어로에 노출된다
- `verdict` `tags` `specs` `pros` `cons` `body`

배열은 순수 데이터라서 이후 D1 이나 KV 로 옮길 때 조회 헬퍼만 교체하면 된다.

## 캐시 정책

HTML 은 엣지에서 5분 캐시 후 하루 동안 stale-while-revalidate 로 서빙한다. 피드와 사이트맵은 30분이다. 검색과 404 는 캐시하지 않는다.

## 도메인 연결

`wrangler.jsonc` 에 `routes` 를 추가하고 Cloudflare 대시보드에서 usb.kr 존을 연결한다.

```jsonc
"routes": [{ "pattern": "usb.kr/*", "zone_name": "usb.kr" }]
```
