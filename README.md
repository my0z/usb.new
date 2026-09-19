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
| `/search?q=` | 검색창. 키워드의 쿠팡 검색 결과를 파트너스 딥링크로 바꿔 보낸다 (워커 시크릿 `COUPANG_ACCESS_KEY` · `COUPANG_SECRET_KEY`). 키가 없으면 사이트 안 글 검색 |
| `/0` | 관리자 통계. 방문(사람만 · 재방문 구분) · 글별 쿠팡 클릭률 · 발행 현황 · 발행기 성공률과 소요 시간 · 구글 애널리틱스 · 서치콘솔 검색 유입 · PageSpeed 점수 |

### 구글 애널리틱스

태그: `wrangler.jsonc` 의 `GA_ID` 에 GA4 측정 ID(`G-XXXXXXXX`)를 넣고 배포하면 모든 페이지에 들어간다.

`/0` 에 GA 집계(실시간 · 오늘/7일/28일 사용자 · 인기 페이지 · 유입 경로 · 일별)를 띄우려면 서비스 계정이 필요하다.

1. console.cloud.google.com → 프로젝트 → "API 및 서비스" → **Google Analytics Data API** 사용 설정
2. "IAM 및 관리자" → 서비스 계정 만들기 → 키 추가 (JSON) 다운로드
3. GA4 관리 → 속성 액세스 관리 → 서비스 계정 이메일을 **뷰어**로 추가
4. GA4 관리 → 속성 설정 → 속성 ID(숫자) 를 `wrangler.jsonc` 의 `GA_PROPERTY_ID` 에 넣는다
5. VM 에서 시크릿 등록 후 배포

```sh
cd ~/usb.new
jq -r .client_email ~/ga-key.json | npx wrangler secret put GA_SA_EMAIL
jq -r .private_key  ~/ga-key.json | npx wrangler secret put GA_SA_KEY
npm run deploy
```

결과는 워커 안에서 10분 캐시한다. Data API 무료 한도(하루 25만 토큰)에 한참 못 미친다.

### 구글 서치콘솔

검색 클릭 · 노출 · 순위 · 검색어가 `/0` 에 뜬다. 위 서비스 계정을 그대로 쓴다.

1. search.google.com/search-console → 속성 추가 → **도메인** `usb.kr` → 안내하는 TXT 레코드를 Cloudflare DNS 에 넣고 확인
2. console.cloud.google.com → "API 및 서비스" → **Google Search Console API** 사용 설정
3. 서치콘솔 → 설정 → 사용자 및 권한 → 서비스 계정 이메일을 **전체** 권한으로 추가
4. `wrangler.jsonc` 의 `GSC_SITE` 가 속성과 같은지 본다 (도메인 속성 `sc-domain:usb.kr` · URL 접두어 속성이면 `https://usb.kr/`)

검색 데이터는 이틀쯤 늦게 들어온다. URL 접두어 속성으로 만들었으면 메타태그 확인용 `GOOGLE_SITE_VERIFICATION` 도 채운다.

### 발행기 기록 · 페이지 속도

`generator/run.js` 는 실행마다 KV `gen:runs` 에 성공 여부 · 시도 횟수 · 소요 시간 · 오류를 남기고 `/0` 가 30일 성공률로 보여 준다. 페이지 속도는 `/0` 를 연 브라우저가 PageSpeed Insights API 를 직접 불러 모바일 점수와 LCP · CLS · TBT 를 그린다 (1시간 localStorage 캐시). 키 없이 쓰면 공용 한도라 가끔 429 가 나는데 30초 뒤 한 번 다시 재고 그래도 안 되면 PageSpeed 사이트 링크를 준다. 구글 클라우드에서 PageSpeed Insights API 를 켜고 API 키를 만들어 시크릿으로 넣으면(`echo 키 | npx wrangler secret put PSI_KEY`) 한도가 따로 잡혀 사라진다. 키는 관리자 페이지 HTML 에 실리니 구글 콘솔에서 웹사이트 `https://usb.kr/*` 로 제한한다.

### 네이버 · 빙 색인

발행기가 글을 올릴 때마다 IndexNow(`generator/lib/indexnow.js`)로 새 URL 을 알린다. 네이버 서치어드바이저가 IndexNow 를 받으므로 크롤러를 기다리지 않는다. 키는 `wrangler.jsonc` 의 `INDEXNOW_KEY` 와 `generator/config.js` 가 같아야 하고 워커가 `/<키>.txt` 로 공개한다. 서치어드바이저에서 손으로 할 것: 요청 → 사이트맵 제출(`/sitemap.xml`) · RSS 제출(`/rss.xml`) 한 번씩.

### 자동 배포

`claude/usb-kr-renewal-site-6725i8` 나 `main` 에 푸시하면 `.github/workflows/deploy.yml` 이 `wrangler deploy` 를 돌린다. 한 번만 준비한다:

1. dash.cloudflare.com → 오른쪽 위 프로필 → API 토큰 → 토큰 만들기 → "Cloudflare Workers 편집" 템플릿 → 계정과 usb.kr 존 선택 → 만들기 → 값 복사
2. github.com/my0z/usb.new → Settings → Secrets and variables → Actions → New repository secret → 이름 `CLOUDFLARE_API_TOKEN` · 값 붙여넣기

VM 의 발행기는 크론이 10분마다 `git pull` 해서 따라온다 (`bash generator/install-cron.sh` 로 등록).

### Cloudflare 부가 기능

| 기능 | 상태 | 어떻게 |
| --- | --- | --- |
| Workers Logs (observability) | 켜짐 | 대시보드 → Workers → new → Logs 에서 요청 로그와 오류를 본다 |
| Smart Placement | 켜짐 | KV · D1 · 구글 API 에 가까운 곳에서 워커가 돈다 |
| Image Transformations | 코드 준비됨 | 대시보드 → usb.kr 존 → Images → Transformations 켜기 |
| Web Analytics (무료 · 쿠키 없음) | 선택 | 대시보드 → Analytics → Web Analytics → n.usb.kr 추가. 프록시 존이라 자동 삽입을 고르면 코드 없이 된다. 수동이면 토큰을 `CF_BEACON_TOKEN` 에 |
| Workers AI | 발행기 심사관 · 관리자 페이지의 사진 → 제품명 인식 (`ai` 바인딩 · `VISION_MODEL`) | 토큰에 "Workers AI: Read" 추가하면 llama-3.3-70b 가 세 번째 심사관이 된다 (유료 플랜 하루 1만 뉴런 포함) |
| Cache Reserve · Speed Brain · Early Hints | 선택 | 존 설정 → Caching / Speed 에서 토글. 코드 변경 없음 |

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
npm run deploy       # 손으로 배포 (보통은 푸시하면 GitHub Actions 가 한다)
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
