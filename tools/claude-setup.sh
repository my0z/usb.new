#!/usr/bin/env bash
# 로컬 머신(오라클 VM 이나 PC)에서 Claude Code 를 쓸 때 토큰 절약 도구 네 가지를 한 번에 붙인다.
#   ponytail  — 최소 코드 스킬 (Claude Code 플러그인)
#   graphify  — 코드베이스 지식 그래프 스킬
#   headroom  — 컨텍스트 압축 프록시 (claude 를 감싸서 실행)
#   ollama    — 로컬 모델로 Claude Code 실행 (구독 없이)
# 사용법: bash tools/claude-setup.sh [--no-ollama]
set -euo pipefail

need() { command -v "$1" >/dev/null 2>&1 || { echo "필요: $1"; exit 1; }; }
need node
need claude

if ! command -v uv >/dev/null 2>&1; then
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="$HOME/.local/bin:$PATH"
fi

echo "== ponytail"
claude plugin marketplace add DietrichGebert/ponytail || true
claude plugin install ponytail@ponytail --scope user -y || true

echo "== graphify"
uv tool install --python 3.11 graphifyy || uv tool upgrade graphifyy
graphify install --platform claude

echo "== headroom"
uv tool install --python 3.13 "headroom-ai[all]" || uv tool upgrade headroom-ai
headroom doctor || true

if [[ "${1:-}" != "--no-ollama" ]]; then
  echo "== ollama"
  if ! command -v ollama >/dev/null 2>&1; then
    curl -fsSL https://ollama.com/install.sh | sh
  fi
  echo "로컬 모델로 Claude Code 를 띄우려면:  ollama launch claude"
fi

cat <<'MSG'

완료. 이후 Claude Code 를 이렇게 띄운다:

  headroom wrap claude        # 압축 프록시를 통해 실행 (토큰 50~90% 절감)
  ollama launch claude        # 구독 없이 로컬 모델로 실행 (품질은 낮다)

세션 안에서:
  /ponytail ultra             # 최소 코드 모드 강도 조절
  /graphify .                 # 코드베이스 그래프 생성
MSG
