import config
from src.risk.risk_manager import RiskManager


def test_position_size_respects_cash_limit():
    risk = RiskManager(starting_balance=1_000_000)
    quantity = risk.position_size(entry_price=50_000)
    assert quantity * 50_000 <= 1_000_000


def test_daily_target_hit_stops_new_positions():
    risk = RiskManager(starting_balance=10_000_000)
    risk.record_close("005930", config.DAILY_TARGET_PROFIT)
    assert risk.daily_target_hit()
    assert not risk.can_open_new_position()


def test_daily_loss_limit_stops_new_positions():
    risk = RiskManager(starting_balance=10_000_000)
    risk.record_close("005930", config.DAILY_MAX_LOSS)
    assert risk.daily_loss_limit_hit()
    assert not risk.can_open_new_position()


def test_check_exit_stop_loss_and_take_profit():
    risk = RiskManager(starting_balance=10_000_000)
    risk.open_position("005930", entry_price=10_000, quantity=10)
    assert risk.check_exit("005930", 9_700) == "stop_loss"
    assert risk.check_exit("005930", 10_400) == "take_profit"
    assert risk.check_exit("005930", 10_050) is None
