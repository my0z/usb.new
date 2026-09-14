"""Entry point. Runs forever: sleeps outside market hours, watches during them.

This process never sends a real order — it only pushes buy/sell alerts to
Telegram. The user executes every trade manually.
"""
import asyncio
import logging
import os

from kiwoom_client import KiwoomAPI

import config
from src.market_hours import now_kst, seconds_until_next_open
from src.notifier import telegram_notifier
from src.signal_bot import SignalBot


def setup_logging():
    os.makedirs(config.LOG_DIR, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.FileHandler(os.path.join(config.LOG_DIR, "signal_bot.log"), encoding="utf-8"),
            logging.StreamHandler(),
        ],
    )


async def main():
    setup_logging()
    logger = logging.getLogger("main")
    api = KiwoomAPI(
        app_key=config.KIWOOM_APP_KEY,
        app_secret=config.KIWOOM_APP_SECRET,
        is_mock=config.IS_MOCK_ACCOUNT,
    )

    while True:
        wait_seconds = seconds_until_next_open(now_kst())
        logger.info("sleeping %d seconds until next market open", wait_seconds)
        await asyncio.sleep(wait_seconds)

        logger.info("market open, starting today's session")
        telegram_notifier.send("[장 시작] 오늘 신호 감시를 시작합니다.")
        try:
            await SignalBot(api).run_session()
        except Exception:
            logger.exception("signal bot session crashed, will retry from tomorrow's open")
            telegram_notifier.send("[오류] 신호봇 세션이 중단됐습니다. 로그를 확인하세요.")


if __name__ == "__main__":
    asyncio.run(main())
