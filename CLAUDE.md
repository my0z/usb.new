# usb.new

usb.kr 사이트. Cloudflare Workers SSR 이며 KV `new-usb-posts`(글)와 D1 `new-usb-db`(방문)를 읽는다. 옛 usb.kr 워커와 저장소는 2026-09-13 에 지웠다. 자세한 구조는 README.md 를 본다.

## 작업 규칙

- 코드 생성 전에 `TZ=Asia/Seoul date` 로 시간을 먼저 맞춘다. 사용자 시간대는 한국 서울이다.
- 한국어 문장에 쉼표를 쓰지 않는다.
- 배포는 GitHub Actions(`.github/workflows/deploy.yml`)가 푸시 때 한다. VM 은 10분마다 `git pull` 로 발행기 코드를 따라온다. 이 세션에서 직접 `wrangler deploy` 하지 않는다.
- KV `new-usb-posts` 는 워커에서 읽기만 한다. 쓰기는 `generator/` 만 한다. D1 은 방문 비콘(`visits`)과 쿠팡 클릭(`clicks`)만 쓴다.

## 토큰 절약 도구

- **ponytail** (플러그인 · `.claude/settings.json` 에서 활성) — 가장 짧게 동작하는 코드를 쓴다. YAGNI · 표준 라이브러리 우선 · 새 의존성 금지. `/ponytail lite|full|ultra` 로 강도 조절.
- **graphify** (`.claude/skills/graphify/SKILL.md`) — 파일을 지식 그래프로 만든다. 트리거: `/graphify`. 사용자가 `/graphify` 를 치면 다른 일보다 먼저 Skill 도구로 `graphify` 를 호출한다. CLI 는 `uv tool install graphifyy`.
- **headroom** · **ollama** — 로컬 머신에서 `claude` 를 띄울 때 적용한다. `tools/claude-setup.sh` 참고.
