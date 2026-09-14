#!/usr/bin/env bash
# 하루 6번 (4시간 간격) 글 2건씩 발행하고 5분마다 관리자 페이지의 생성 요청을 처리하는 crontab 을 등록한다. 시각은 VM 시간대(서울) 기준.
# 사용법: bash generator/install-cron.sh
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
NODE="$(command -v node)"
LOG="$HOME/usb-generator.log"
LINE="0 0,4,8,12,16,20 * * * cd $REPO && $NODE generator/run.js --count 2 >> $LOG 2>&1"
QUEUE="*/5 * * * * cd $REPO && $NODE generator/queue.js >> $LOG 2>&1"
{ crontab -l 2>/dev/null | grep -v 'generator/run.js' | grep -v 'generator/queue.js' || true; echo "$LINE"; echo "$QUEUE"; } | crontab -
echo "등록됨:"
crontab -l | grep 'generator/'
echo "로그: $LOG"
