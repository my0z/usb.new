# usb.new

독립 프로그램 모음. 폴더 하나가 프로그램 하나다.

| 폴더 | 내용 |
|---|---|
| `partners-archive/` | 제품 영상 아카이브 + 쿠팡 파트너스 링크 + Claude 글쓰기. 수익형 SNS 운영 도구 |

각 폴더 README 에 설치와 사용법이 있다.

## 자동 코드 리뷰

PR 을 열면 [OpenCodeReview](https://github.com/alibaba/open-code-review) 가 Claude 로 리뷰해서 줄 단위 코멘트를 단다.
PR 댓글에 `/open-code-review` 라고 쓰면 다시 돌린다.
저장소 Secrets 에 `ANTHROPIC_API_KEY` 하나만 넣으면 된다.
