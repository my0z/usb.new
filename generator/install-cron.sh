#!/usr/bin/env bash
# 하루 6번 (4시간 간격) 글 2건씩 발행하는 crontab 을 등록한다. 하루 12건.
# 사용법: bash generator/install-cron.sh
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
NODE="$(command -v node)"
LOG="$HOME/usb-generator.log"
LINE="0 0,4,8,12,16,20 * * * cd $REPO && $NODE generator/run.js --count 2 >> $LOG 2>&1"
( crontab -l 2>/dev/null | grep -v 'generator/run.js' ; echo "$LINE" ) | crontab -
echo "등록됨:"
crontab -l | grep 'generator/run.js'
echo "로그: $LOG"
