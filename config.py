"""Trading bot configuration."""

# Account
IS_MOCK_ACCOUNT = True  # 모의투자 서버 접속 여부

# Daily targets and risk limits (KRW)
DAILY_TARGET_PROFIT = 1_000_000
DAILY_MAX_LOSS = -500_000

# Per-trade risk
RISK_PER_TRADE_RATIO = 0.02       # 계좌 잔고 대비 1회 매매 최대 손실 비율
STOP_LOSS_RATIO = 0.02            # 매수가 대비 손절 비율
TAKE_PROFIT_RATIO = 0.03          # 매수가 대비 익절 비율
MAX_CONCURRENT_POSITIONS = 3
MAX_TRADES_PER_DAY = 15

# Screening (거래량 급증 종목 스크리닝)
MIN_PRICE = 1_000
MAX_PRICE = 200_000
MIN_VOLUME_RATIO = 3.0            # 전일 대비 거래량 배수
BREAKOUT_LOOKBACK_TICKS = 20

# Session cutoff (동시호가 진입 방지 및 강제 청산)
ENTRY_CUTOFF_TIME = "15:00:00"
FORCE_CLOSE_TIME = "15:20:00"

LOG_DIR = "logs"
