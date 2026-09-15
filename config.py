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
MAX_SCREEN_CANDIDATES = 20      # 한 번의 스크리닝에서 가져올 최대 종목 수
MAX_WATCHED_CODES = 40          # 실시간 구독 상한 (키움 실시간 등록 한도 고려)
RESCREEN_INTERVAL_SEC = 1800    # 장중 재스크리닝 주기. 09:00 직후엔 거래량 순위가 비어 있어 주기적으로 갱신

# Manual fallback watchlist, used when the auto-screening call is unavailable.
# Fill in codes you want monitored regardless of the screener result.
WATCHLIST = [c for c in os.getenv("WATCHLIST", "").split(",") if c]

# Market session (KST)
MARKET_OPEN_TIME = "09:00:00"
ENTRY_CUTOFF_TIME = "15:00:00"
FORCE_CLOSE_TIME = "15:20:00"
MARKET_CLOSE_TIME = "15:30:00"

# PROFILE=aggressive widens every knob at once: more candidates, faster
# re-screening, looser entries, wider TP/SL, more open positions and a loss
# limit as large as the profit target. Alerts only — nothing is ordered.
PROFILE = os.getenv("PROFILE", "standard").lower()
if PROFILE == "aggressive":
    DAILY_MAX_LOSS = -1_000_000
    RISK_PER_TRADE_RATIO = 0.04
    STOP_LOSS_RATIO = 0.03
    TAKE_PROFIT_RATIO = 0.05
    MAX_CONCURRENT_POSITIONS = 5
    MAX_TRADES_PER_DAY = 30
    MIN_VOLUME_RATIO = 2.0
    BREAKOUT_LOOKBACK_TICKS = 10
    MAX_SCREEN_CANDIDATES = 40
    MAX_WATCHED_CODES = 80
    RESCREEN_INTERVAL_SEC = 600

LOG_DIR = "logs"

# Pump-then-dump-then-base pattern scan (src/backtest): a stock creeps up for
# several days, has one standout spike day, holds near that level, then
# crashes at least CRASH_MIN_PCT within CRASH_WINDOW_DAYS and settles again.
RISE_LOOKBACK_MIN = 3
RISE_LOOKBACK_MAX = 10
RISE_DAILY_MAX_PCT = 5.0        # 상승 구간의 하루 상승폭 상한 ("조금씩")
RISE_MIN_UP_DAY_RATIO = 0.6     # 상승 구간에서 상승한 날의 최소 비율

SPIKE_MIN_PCT = 7.0             # 스파이크 당일 최소 상승률
SPIKE_TO_RISE_RATIO = 1.5       # 스파이크가 상승 구간 평균 상승률 대비 최소 몇 배 커야 하는지

PLATEAU_MIN_DAYS = 2
PLATEAU_MAX_DAYS = 10
PLATEAU_TOLERANCE_PCT = 6.0     # 스파이크 종가 대비 유지 구간 허용 변동폭

CRASH_WINDOW_DAYS = 2           # 유지 구간 이후 급락을 찾는 최대 거래일 수
CRASH_MIN_PCT = 20.0            # 최소 급락폭

POST_CRASH_MIN_DAYS = 3
POST_CRASH_TOLERANCE_PCT = 6.0  # 급락 이후 신규 저점 유지 구간 허용 변동폭
