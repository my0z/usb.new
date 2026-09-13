"""Entry point. Must run on Windows with 32-bit Python and Kiwoom Open API+ installed."""
import logging
import os
import sys

from PyQt5.QtWidgets import QApplication

import config
from src.trading_bot import TradingBot


def setup_logging():
    os.makedirs(config.LOG_DIR, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.FileHandler(os.path.join(config.LOG_DIR, "trading.log"), encoding="utf-8"),
            logging.StreamHandler(),
        ],
    )


def main():
    setup_logging()
    app = QApplication(sys.argv)
    bot = TradingBot()
    bot.start()
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
