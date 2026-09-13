# usb

영상 하나를 인스타그램 스레드 페이스북 틱톡 유튜브 블루스카이 6개 채널에 동시 업로드하는 CLI입니다.

## 설치

```bash
npm install
cp .env.example .env
```

`.env`에 각 플랫폼 API 키를 채워 넣으세요. 키가 없는 플랫폼은 자동으로 건너뜁니다.

## 채널별 준비물

| 채널 | 인증 방식 | 비고 |
| --- | --- | --- |
| YouTube | OAuth2 리프레시 토큰 | 로컬 파일 직접 업로드 지원 |
| Facebook | 페이지 액세스 토큰 | 로컬 파일 또는 URL 업로드 지원 |
| Instagram | 그래프 API 액세스 토큰 | 공개 videoUrl 필수 (비즈니스/크리에이터 계정) |
| Threads | 그래프 API 액세스 토큰 | 공개 videoUrl 필수 |
| TikTok | Content Posting API 토큰 | 도메인 검증된 공개 videoUrl 필수 |
| Bluesky | 앱 비밀번호 | 로컬 파일 또는 URL 지원 |

인스타그램 스레드 틱톡은 파일을 직접 받지 않고 공개 URL을 가져가는 방식이라 `--video-url` 또는 `VIDEO_PUBLIC_URL`을 반드시 지정해야 합니다.

## 실행

```bash
npm run upload -- \
  --video ./sample.mp4 \
  --video-url https://example.com/sample.mp4 \
  --title "영상 제목" \
  --caption "게시글 본문" \
  --hashtags "shorts,daily"
```

각 채널의 업로드 성공 여부와 게시물 URL이 콘솔에 출력됩니다.

## 구조

- `src/platforms/*.ts` - 플랫폼별 업로드 구현
- `src/orchestrator.ts` - 설정된 채널만 골라 병렬 업로드
- `src/config.ts` - 환경변수 로딩
- `src/index.ts` - CLI 진입점

## 참고

각 플랫폼의 앱 등록 승인 정책과 토큰 만료 주기가 다르므로 실제 운영 전 테스트 계정으로 먼저 검증하세요.
