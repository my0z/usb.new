# partners-archive

제품 영상 아카이브 + 쿠팡 파트너스 링크 + Claude 글쓰기.
스레드에서 본 "1천개 제품 영상 아카이브" 를 혼자서 돌릴 수 있게 만든 도구다.

## 돈이 나오는 구조

1. 내가 찍은 제품 영상을 `add` 로 등록한다. 쿠팡 URL 은 자동으로 파트너스 수익 링크로 바뀐다.
2. `write` 로 스레드 / 인스타 / 블로그용 글을 Claude 가 써준다. 파트너스 고지문은 자동으로 붙는다.
3. `build` 로 만든 사이트를 GitHub Pages 나 Cloudflare Pages 에 올린다.
4. 사이트를 SNS 에 공유한다. 방문자가 영상 받아가고 글 복사해서 올릴 때 **내 파트너스 링크가 같이 퍼진다.**
5. 프로필 링크(`SITE_PROFILE_URL`)로 강의나 오픈채팅 같은 2차 수익으로 연결한다.

수익 = 사이트 안 구매 링크 클릭 수수료 + 퍼진 글의 링크 수수료 + 프로필 유입.

## 설치

```bash
cd partners-archive
pip install -r requirements.txt
cp .env.example .env   # 키 채우기
```

`.env` 에 넣을 것

| 키 | 어디서 |
|---|---|
| `COUPANG_ACCESS_KEY` `COUPANG_SECRET_KEY` | 쿠팡 파트너스 > 링크 생성 > API 발급 |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `SITE_PROFILE_URL` | 내 프로필이나 판매 페이지 주소 |

쿠팡 키 없어도 등록과 빌드는 된다. 나중에 키 넣고 `relink` 하면 링크가 한 번에 바뀐다.

## 사용

```bash
# 상품 등록 (영상은 파일 경로나 제조사 URL)
python archive.py add --title "곰돌이 실리콘 케이크 몰드" \
  --url "https://www.coupang.com/vp/products/..." \
  --video ~/Videos/mold.mp4 --category 주방용품 --tags "베이킹,실리콘몰드" \
  --note "실제로 써보니 잘 빠짐"

# 쿠팡 검색으로 상품 찾기 (결과 URL 이 곧 수익 링크)
python archive.py search --keyword "실리콘 몰드"

# 글 생성
python archive.py write 곰돌이-실리콘-케이크-몰드 --platform threads,instagram,blog
python archive.py write-all --platform threads      # 글 없는 상품 전부

# 사이트
python archive.py build          # site/ 생성
python archive.py serve          # http://localhost:8000
python archive.py list
```

## 배포

`site/` 폴더가 결과물이다. 정적 파일이라 아무 데나 올리면 된다.

- GitHub Pages: `site/` 를 `gh-pages` 브랜치나 `docs/` 로 밀기
- Cloudflare Pages: 빌드 명령 없이 `partners-archive/site` 를 출력 폴더로 지정

영상이 많아지면 영상만 R2 나 S3 에 올리고 `--video https://...` 로 URL 등록하면 저장소가 가벼워진다.

## 구조

```
archive.py      CLI
coupang_api.py  파트너스 API (HMAC 서명 / 딥링크 / 검색)
writer.py       Claude 글 생성
builder.py      정적 사이트 빌드
store.py        products.json 입출력
templates/      사이트 템플릿
data/           products.json + videos/ + posts/
site/           빌드 결과 (git 제외)
```

## 주의

- 쿠팡 파트너스 고지문은 모든 생성 글 끝에 자동으로 붙는다. 지우면 규정 위반이다.
- 제조사 제공 영상은 해당 제조사가 2차 배포를 허용했는지 확인하고 올려라.
- 토스 쉐어링크처럼 API 가 없는 링크는 `--url` 에 그냥 넣으면 그대로 구매 링크로 쓰인다.
