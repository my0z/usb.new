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

## 오라클 VM 자동 배포

`main` 브랜치에 푸시하면 GitHub Actions가 오라클 VM에 SSH로 접속해서 최신 코드를 가져오고 빌드까지 처리합니다 (`.github/workflows/deploy.yml`). CLI는 상시 실행되는 서버가 아니라서 재시작 단계는 없고 다음 실행부터 최신 코드가 적용됩니다.

### VM 최초 설정 (한 번만)

```bash
sudo apt update && sudo apt install -y nodejs npm git
git clone https://github.com/my0z/usb.new.git /opt/usb
cd /opt/usb
npm ci
cp .env.example .env   # 여기서 실제 API 키 채워 넣기
npm run build
```

배포용 SSH 키 쌍을 따로 만들어서 공개키는 VM의 `~/.ssh/authorized_keys`에 등록하세요.

```bash
ssh-keygen -t ed25519 -f deploy_key -N ""
```

### GitHub Secrets 등록

레포 Settings → Secrets and variables → Actions에서 아래 값을 등록하세요.

| Secret | 값 |
| --- | --- |
| `ORACLE_HOST` | VM 공인 IP |
| `ORACLE_USER` | SSH 접속 계정 |
| `ORACLE_SSH_KEY` | `deploy_key` 개인키 전체 내용 |
| `ORACLE_PORT` | SSH 포트 (기본 22, 생략 가능) |
| `ORACLE_APP_DIR` | VM 상의 레포 경로 (예: `/opt/usb`) |

등록 후 `main`에 푸시하면 자동으로 VM 코드가 갱신됩니다. `.env`는 git 추적 대상이 아니라서 배포 때 덮어써지지 않습니다.

## 참고

각 플랫폼의 앱 등록 승인 정책과 토큰 만료 주기가 다르므로 실제 운영 전 테스트 계정으로 먼저 검증하세요.
