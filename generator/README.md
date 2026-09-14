# 신상품 리뷰 자동 발행기

오라클 VM 에서 돌아가는 Node 스크립트다. 하루 6건 정도 신상품(모바일 액세서리 · 신기한 도우미 가젯)을 찾아 쿠팡 파트너스 링크와 사진을 넣은 리뷰를 쓰고 기존 usb.kr 과 새 사이트가 함께 읽는 KV 에 발행한다.

글쓰기는 VM 에 설치한 **Ollama** 로 처리한다. 월 구독 없이 돌아가고 프롬프트에는 제품 사실만 압축해 넘겨 토큰을 아낀다. Ollama 가 멈췄을 때만 Groq 키가 있으면 대체한다.

글이 나오면 **다른 모델들이 심사**한다 (`REVIEW_MODELS` · 기본은 Groq 의 qwen3.8-27b · gpt-oss-20b 와 Cloudflare Workers AI 의 llama-3.3-70b). 제품 정보에 없는 스펙 · 가격 불일치 · 과장 표현 · 어색한 한국어를 잡아내고 하나라도 불합격이면 문제점을 붙여 최대 3번 다시 쓴다. 끝까지 불합격이면 그 글은 발행하지 않는다.

## 1. Ollama 설치 (VM 에서 한 번)

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull exaone3.5:7.8b      # 한국어에 강한 7.8B 모델 · 약 5GB
ollama run exaone3.5:7.8b "안녕" # 동작 확인 후 /bye
```

메모리가 8GB 미만이면 `exaone3.5:2.4b` 나 `qwen2.5:3b` 로 바꾸고 `.env` 의 `OLLAMA_MODEL` 도 맞춘다.

## 2. 키 설정

```bash
cp generator/.env.example generator/.env
nano generator/.env
```

- `COUPANG_ACCESS_KEY` `COUPANG_SECRET_KEY` — 쿠팡 파트너스 API 키
- `CLOUDFLARE_API_TOKEN` — **Workers KV Storage: Edit** 권한이 포함된 토큰 (배포용 토큰과 별도로 만들어도 된다)
- `YOUTUBE_API_KEY` (선택) — 있으면 주인공 제품의 최근 1년 영상을 찾아 글에 넣는다. Google Cloud 콘솔에서 YouTube Data API v3 를 켜고 API 키를 만든다. 하루 100회 검색까지 무료

## 3. 점검

```bash
node generator/run.js --mock       # 네트워크 없이 파이프라인 확인
node generator/run.js --dry-run    # 쿠팡 검색 + 글 생성까지 하고 KV 에는 안 씀
node generator/run.js              # 실제 발행 1건
```

## 4. 자동 실행

```bash
bash generator/install-cron.sh     # 0시 4시 8시 12시 16시 20시 (서울) 에 2건씩
tail -f ~/usb-generator.log
```

## 동작 방식

1. `config.js` 의 키워드 풀에서 최근 5일간 안 쓴 키워드를 고른다
2. 쿠팡 검색 → 최근 5일간 안 쓴 제품 3개를 고르고 딥링크를 만든다
3. Ollama 에 제품 사실만 넘겨 JSON 형식의 글을 받는다 (제목 · 요약 · 서론 · 섹션 3개 · 결론 · FAQ)
4. 첫 섹션 뒤에 주인공 사진을 넣고 마지막 섹션 뒤에 비교 제품 사진을 넣는다
5. `post:<slug>` 저장 후 `index` 와 `posts:summary-list` 를 갱신하고 중복 방지 키를 남긴다

중복 방지 키(`usedKeyword:` `recent-used-products` `product-post-map:`)는 기존 워커와 같은 규칙이라 두 발행기가 서로 같은 제품을 다시 쓰지 않는다.

## 키워드 바꾸기

`generator/config.js` 의 `KEYWORD_POOL` 에 `{ q: '쿠팡 검색어', keyword: '분류 키워드' }` 를 추가한다. `keyword` 는 `src/data/categories.js` 의 키워드와 맞추면 카테고리에 자동 분류된다.

## 관리자 페이지에서 글 요청

`/0` 의 "글 생성 요청" 폼에 상품명이나 쿠팡 검색어를 넣으면 워커가 D1 `gen_queue` 에 적고 VM 의 `generator/queue.js` 가 5분마다 가져가 `run.js --keyword … --query …` 로 발행한 뒤 결과(글 링크 또는 실패 사유)를 돌려준다. `.env` 에 `ADMIN_KEY`(워커 시크릿과 같은 값)가 있어야 하고 크론은 `bash generator/install-cron.sh` 로 다시 등록한다. 정기 발행이 도는 동안엔 다음 틱으로 미룬다.
