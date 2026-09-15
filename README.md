# 제휴 링크 자동 변환

쿠팡 상품 주소만 붙여 넣으면 파트너스 제휴 링크와 고지 문구가 담긴 쇼츠 설명이 나온다. 영상마다 파트너스 사이트에 들어가서 로그인 → 상품 검색 → 링크 생성 → 복사 → 고지 문구 적기를 반복하지 않아도 된다.

의존성 없이 Node 18 이상으로 돈다. 다른 프로젝트와 연동하지 않는 독립 프로그램이다.

## 준비

1. 쿠팡 파트너스 → 링크 생성 → API 키 발급
2. `.env.example` 을 `.env` 로 복사하고 `COUPANG_ACCESS_KEY` 와 `COUPANG_SECRET_KEY` 를 넣는다

## 웹 화면

```sh
npm start
```

`http://127.0.0.1:3000` 을 연다. 상품 주소를 붙여 넣으면 바로 변환되고 설명 글이 클립보드에 들어간다. 쇼츠 설명란에 붙여 넣기만 하면 끝이다.

## 명령줄

```sh
node cli.js https://www.coupang.com/vp/products/123
node cli.js --intro "오늘 소개한 제품" --tag 쿠팡추천 https://www.coupang.com/vp/products/123
echo "글 안에 https://www.coupang.com/vp/products/123 이 있어도 된다" | node cli.js
node cli.js --json https://www.coupang.com/vp/products/123
```

## 동작

- 글 안에서 주소를 전부 뽑아 쿠팡 주소만 고른다. 나머지는 건너뛴다
- 모바일 주소(`m.coupang.com`)는 PC 주소로 맞추고 추적 파라미터는 걷어낸다
- 이미 단축 링크(`link.coupang.com/a/...`)면 그대로 쓴다
- 쿠팡 파트너스 딥링크 API 로 단축 링크를 받는다. `COUPANG_SUB_ID` 를 두면 채널별 성과를 나눠 볼 수 있다
- 설명 글 마지막에 고지 문구가 항상 붙는다. 문구를 바꾸려면 `.env` 의 `DISCLOSURE` 에 적는다

## 시험

```sh
npm test
```
