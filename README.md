# auto_card_news

기사 링크를 넣으면 Claude가 내용을 요약하고 인스타그램용 카드뉴스 PNG 이미지를 자동으로 생성합니다.

## 설치

```bash
pip install -r requirements.txt
cp .env.example .env
# .env 파일에 ANTHROPIC_API_KEY 입력
```

## 사용법

```bash
python main.py "https://example.com/news/article" -n 6 -o assets/output
```

옵션

- `-n, --num-cards` 표지를 포함한 총 카드 수 (기본값 6)
- `-o, --output` 이미지 저장 디렉터리 (기본값 `assets/output`)
- `-b, --brand` 카드 하단에 표시할 브랜드명

실행이 끝나면 `card_01.png`부터 순서대로 카드 이미지가 저장됩니다.

## 동작 방식

1. `scraper.py` 기사 URL에서 제목과 본문을 추출합니다
2. `summarizer.py` Claude API로 본문을 카드별 소제목과 핵심 문장으로 요약합니다
3. `renderer.py` Pillow로 나눔고딕 폰트를 사용해 카드 이미지를 그립니다

## 폰트 라이선스

`fonts/` 디렉터리의 나눔고딕 폰트는 OFL(SIL Open Font License) 라이선스입니다.
