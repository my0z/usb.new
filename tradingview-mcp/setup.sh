#!/usr/bin/env bash
# TradingView MCP 원클릭 설정 (macOS / Linux / WSL)
# 사용법:  ./setup.sh            → 감지된 모든 클라이언트에 등록
#         ./setup.sh claude-code → Claude Code 만
#         ./setup.sh desktop     → Claude Desktop 만
#         ./setup.sh cursor      → Cursor 만
#         ./setup.sh status      → 현재 등록 상태 확인
#         ./setup.sh remove      → Claude Code 에서 제거
set -euo pipefail

TV_NAME="tradingview"
TV_URL="https://mcp.tradingview.com/mcp"
SCOPE="${TV_SCOPE:-user}"   # user = 모든 프로젝트에서 사용 / project = 현재 폴더만

c() { printf '\033[1;36m%s\033[0m\n' "$*"; }
ok() { printf '\033[1;32m✔ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }

merge_json() {  # $1 = 설정 파일 경로  ($TV_NAME 항목을 mcpServers 에 병합)
  local f="$1"
  mkdir -p "$(dirname "$f")"
  [ -s "$f" ] || echo '{}' > "$f"
  if command -v jq >/dev/null; then
    jq --arg n "$TV_NAME" --arg u "$TV_URL" \
      '.mcpServers[$n] = {type:"http", url:$u}' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
  else
    python3 - "$f" "$TV_NAME" "$TV_URL" <<'PY'
import json,sys
p,n,u=sys.argv[1:]
d=json.load(open(p)) if open(p).read().strip() else {}
d.setdefault("mcpServers",{})[n]={"type":"http","url":u}
json.dump(d,open(p,"w"),indent=2,ensure_ascii=False)
PY
  fi
  ok "$f 에 등록됨"
}

do_claude_code() {
  if ! command -v claude >/dev/null; then
    warn "claude CLI 없음 → npm install -g @anthropic-ai/claude-code"; return
  fi
  c "▶ Claude Code 등록 (scope=$SCOPE)"
  claude mcp remove "$TV_NAME" -s "$SCOPE" >/dev/null 2>&1 || true
  claude mcp add --transport http -s "$SCOPE" "$TV_NAME" "$TV_URL"
  ok "완료 → claude 실행 후 /mcp 에서 tradingview 선택 → 브라우저 로그인"
}

do_desktop() {
  local f
  case "$(uname -s)" in
    Darwin) f="$HOME/Library/Application Support/Claude/claude_desktop_config.json" ;;
    *)      f="${APPDATA:-$HOME/.config}/Claude/claude_desktop_config.json" ;;
  esac
  c "▶ Claude Desktop 설정"
  warn "Claude Desktop 은 원격 OAuth 서버를 '설정 → 커넥터 → 커넥터 추가' 에서 URL 입력으로 붙이는 것이 가장 확실합니다"
  warn "URL: $TV_URL"
  merge_json "$f"
}

do_cursor() {
  c "▶ Cursor 설정"
  merge_json "$HOME/.cursor/mcp.json"
}

do_status() {
  c "▶ 상태"
  command -v claude >/dev/null && claude mcp list 2>/dev/null | grep -i "$TV_NAME" || warn "Claude Code 미등록"
  for f in "$HOME/.cursor/mcp.json" \
           "$HOME/Library/Application Support/Claude/claude_desktop_config.json" \
           "$HOME/.config/Claude/claude_desktop_config.json"; do
    [ -f "$f" ] && grep -q "$TV_URL" "$f" && ok "$f"
  done
  true
}

do_remove() {
  command -v claude >/dev/null && { claude mcp remove "$TV_NAME" -s user 2>/dev/null; claude mcp remove "$TV_NAME" -s local 2>/dev/null; } || true
  ok "Claude Code 에서 제거됨 (프로젝트 .mcp.json 과 다른 클라이언트 설정은 직접 삭제)"
}

case "${1:-all}" in
  claude-code|cc) do_claude_code ;;
  desktop)        do_desktop ;;
  cursor)         do_cursor ;;
  status)         do_status ;;
  remove)         do_remove ;;
  all)
    do_claude_code
    [ -d "$HOME/.cursor" ] && do_cursor
    { [ -d "$HOME/Library/Application Support/Claude" ] || [ -d "$HOME/.config/Claude" ]; } && do_desktop
    echo; c "다음 단계: 각 앱을 재시작하고 처음 호출 시 TradingView 로그인 창을 승인하세요"
    ;;
  *) echo "사용법: $0 [all|claude-code|desktop|cursor|status|remove]"; exit 1 ;;
esac
