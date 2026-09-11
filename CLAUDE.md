# usb.new

usb.kr 리뉴얼 사이트. Cloudflare Workers SSR 이며 기존 usb.kr 의 KV(글)와 D1(조회수)을 그대로 읽는다. 자세한 구조는 README.md 를 본다.

## 작업 규칙

- 코드 생성 전에 `date -u` 로 시간을 먼저 맞춘다.
- 한국어 문장에 쉼표를 쓰지 않는다.
- 배포는 사용자의 오라클 VM 에서 `git pull && npm run deploy` 로 한다. 이 세션에서는 배포하지 않는다.
- KV `usb-kr-posts` 와 D1 `usbkr-db` 는 읽기만 한다. 쓰기는 `generator/` 만 한다.

## 토큰 절약 도구

- **ponytail** (플러그인 · `.claude/settings.json` 에서 활성) — 가장 짧게 동작하는 코드를 쓴다. YAGNI · 표준 라이브러리 우선 · 새 의존성 금지. `/ponytail lite|full|ultra` 로 강도 조절.
- **graphify** (`.claude/skills/graphify/SKILL.md`) — 파일을 지식 그래프로 만든다. 트리거: `/graphify`. 사용자가 `/graphify` 를 치면 다른 일보다 먼저 Skill 도구로 `graphify` 를 호출한다. CLI 는 `uv tool install graphifyy`.
- **headroom** · **ollama** — 로컬 머신에서 `claude` 를 띄울 때 적용한다. `tools/claude-setup.sh` 참고.
