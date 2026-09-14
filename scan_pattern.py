"""On-demand scan: which watched stocks show the creep/spike/plateau/crash/base pattern.

Run manually, e.g. `python scan_pattern.py` or `python scan_pattern.py 005930 000660`.
Read-only: it never places an order and never runs continuously.
"""
import logging
import sys

from kiwoom_client import KiwoomAPI

import config
from src.backtest.kiwoom_history import fetch_daily_bars
from src.backtest.pattern_scanner import find_pump_then_dump
from src.market_hours import now_kst
from src.notifier import telegram_notifier
from src.signal_bot import screen_candidates

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("scan_pattern")


def main():
    api = KiwoomAPI(
        app_key=config.KIWOOM_APP_KEY,
        app_secret=config.KIWOOM_APP_SECRET,
        is_mock=config.IS_MOCK_ACCOUNT,
    )
    codes = sys.argv[1:] or screen_candidates(api)
    if not codes:
        logger.warning("no codes to scan (pass codes as args or set WATCHLIST)")
        return

    base_dt = now_kst().strftime("%Y%m%d")
    lines = []
    for code in codes:
        try:
            bars = fetch_daily_bars(api, code, base_dt)
        except Exception:
            logger.exception("failed to fetch history for %s", code)
            continue

        matches = find_pump_then_dump(bars)
        if not matches:
            continue
        for m in matches:
            line = (
                f"{code} 스파이크 {m['spike_date']}(+{m['spike_return_pct']}%) -> "
                f"급락 {m['crash_date']}({m['crash_return_pct']}%) -> "
                f"{m['base_end_date']}까지 안정"
            )
            logger.info(line)
            lines.append(line)

    if lines:
        telegram_notifier.send("[패턴 스캔 결과]\n" + "\n".join(lines))
    else:
        logger.info("no matches found among %d codes", len(codes))


if __name__ == "__main__":
    main()
