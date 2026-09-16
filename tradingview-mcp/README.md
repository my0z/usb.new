# TradingView MCP 원클릭 설정

TradingView 데이터를 Claude · ChatGPT · Cursor 등 어떤 MCP 클라이언트에서든 바로 쓰게 해주는 독립 설정 키트입니다.
이 폴더 하나만 복사해서 어디서든 실행하면 됩니다. 다른 파일에 의존하지 않습니다.

- 서버 URL: `https://mcp.tradingview.com/mcp`
- 인증: OAuth 2.1 (TradingView 계정으로 브라우저 로그인 · API 키 없음)
- 요금: Essential 이상 플랜 필요 · 체험판은 MCP 미포함

## 1. 가장 빠른 방법

### macOS / Linux / WSL
```bash
cd tradingview-mcp
./setup.sh
```

### Windows PowerShell
```powershell
cd tradingview-mcp
.\setup.ps1
```

스크립트가 설치된 클라이언트(Claude Code · Claude Desktop · Cursor)를 감지해 자동 등록합니다.
끝나면 앱을 재시작하고 첫 호출 때 뜨는 TradingView 로그인 창만 승인하면 됩니다.

특정 클라이언트만 등록하려면 인자를 붙이세요.

| 명령 | 동작 |
|---|---|
| `./setup.sh claude-code` | Claude Code 만 등록 |
| `./setup.sh desktop` | Claude Desktop 만 등록 |
| `./setup.sh cursor` | Cursor 만 등록 |
| `./setup.sh status` | 등록 상태 확인 |
| `./setup.sh remove` | Claude Code 에서 제거 |

기본 범위는 `user` 라서 모든 프로젝트에서 사용 가능합니다.
현재 폴더에서만 쓰려면 `TV_SCOPE=project ./setup.sh claude-code` 로 실행하세요.

## 2. 스크립트 없이 직접 하기

### Claude Code (터미널 한 줄)
```bash
claude mcp add --transport http -s user tradingview https://mcp.tradingview.com/mcp
```
그 다음 `claude` 실행 → `/mcp` 입력 → `tradingview` 선택 → 브라우저에서 로그인.

### Claude Code (프로젝트 파일)
이 폴더의 `.mcp.json` 을 프로젝트 루트에 복사하면 팀원 전체가 같은 설정을 공유합니다.

### Claude 웹 / Claude Desktop
설정 → 커넥터 → 커넥터 추가 → URL 에 `https://mcp.tradingview.com/mcp` 입력 → 연결 → 로그인.

### ChatGPT
설정 → 커넥터 → 만들기(개발자 모드 필요) → 이름 `TradingView` · URL `https://mcp.tradingview.com/mcp` · 인증 OAuth → 만들기 → 로그인.

### Cursor
`~/.cursor/mcp.json` 에 `configs/cursor.json` 내용을 병합.

### VS Code (Copilot)
`.vscode/mcp.json` 에 `configs/vscode.mcp.json` 내용을 병합.

### Windsurf
`~/.codeium/windsurf/mcp_config.json` 에 `configs/windsurf.json` 내용을 병합.

### 그 외 클라이언트
Streamable HTTP 전송 + OAuth 를 지원하면 URL 하나만 넣으면 됩니다.

## 3. 바로 써보는 질문 예시

연결 후 AI 에게 이렇게 물어보세요.

- `삼성전자 현재가와 오늘 거래량 알려줘`
- `BTCUSD 1시간봉 RSI 와 MACD 상태 요약해줘`
- `NASDAQ 100 구성종목 중 오늘 상승률 상위 10개`
- `AAPL 최근 실적 발표 일정과 컨센서스`
- `KOSPI 200 에서 PER 10 이하 · 배당수익률 3% 이상 스크리닝`

실제 제공되는 도구 목록은 클라이언트에서 확인합니다.
Claude Code 는 `/mcp` → `tradingview` → 도구 보기 로 전체 목록이 나옵니다.

## 4. 문제 해결

| 증상 | 해결 |
|---|---|
| 로그인 창이 안 뜸 | `claude mcp remove tradingview -s user` 후 다시 `./setup.sh claude-code` |
| 401 / 403 오류 | TradingView 플랜이 Essential 이상인지 확인 · 체험판은 불가 |
| 도구가 안 보임 | 앱 완전 종료 후 재시작 · `./setup.sh status` 로 등록 확인 |
| 회사 프록시 환경 | `mcp.tradingview.com` 과 `www.tradingview.com` 아웃바운드 허용 필요 |
| 다른 프로젝트에서 안 보임 | `-s local` 로 등록된 경우 → `-s user` 로 재등록 |

## 5. 파일 구성

```
tradingview-mcp/
├── setup.sh               macOS · Linux · WSL 자동 설정
├── setup.ps1              Windows 자동 설정
├── .mcp.json              Claude Code 프로젝트 공유용 (루트에 복사)
└── configs/
    ├── claude-code.mcp.json
    ├── claude-desktop.json
    ├── cursor.json
    ├── vscode.mcp.json
    └── windsurf.json
```
