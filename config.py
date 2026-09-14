"""Signal bot configuration. Secrets come from environment variables (.env)."""
import os

from dotenv import load_dotenv

load_dotenv()

# Kiwoom REST API credentials
KIWOOM_APP_KEY = os.getenv("KIWOOM_APP_KEY", "")
KIWOOM_APP_SECRET = os.getenv("KIWOOM_APP_SECRET", "")
IS_MOCK_ACCOUNT = os.getenv("KIWOOM_IS_MOCK", "true").lower() == "true"

# Telegram notification
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

TIMEZONE = "Asia/Seoul"

# Daily targets and risk limits (KRW) — advisory only, no order is ever sent automatically
DAILY_TARGET_PROFIT = 1_000_000
DAILY_MAX_LOSS = -500_000

# Per-trade sizing suggestion
ACCOUNT_BALANCE_HINT = int(os.getenv("ACCOUNT_BALANCE_HINT", "10000000"))
RISK_PER_TRADE_RATIO = 0.02
STOP_LOSS_RATIO = 0.02
TAKE_PROFIT_RATIO = 0.03
MAX_CONCURRENT_POSITIONS = 3
MAX_TRADES_PER_DAY = 15

# Screening
MIN_PRICE = 1_000
MAX_PRICE = 200_000
MIN_VOLUME_RATIO = 3.0
BREAKOUT_LOOKBACK_TICKS = 20

# Manual fallback watchlist, used when the auto-screening call is unavailable.
# Fill in codes you want monitored regardless of the screener result.
WATCHLIST = [c for c in os.getenv("WATCHLIST", "").split(",") if c]

# Market session (KST)
MARKET_OPEN_TIME = "09:00:00"
ENTRY_CUTOFF_TIME = "15:00:00"
FORCE_CLOSE_TIME = "15:20:00"
MARKET_CLOSE_TIME = "15:30:00"

LOG_DIR = "logs"
