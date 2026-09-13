import config
from src.strategy.momentum_scalping import MomentumScalpingStrategy


def _fill_history(strategy, code, prices, volume):
    for price in prices:
        strategy.track(code, price, volume)


def test_should_enter_requires_full_history():
    strategy = MomentumScalpingStrategy()
    strategy.track("005930", 10_000, 1_000)
    assert not strategy.should_enter("005930", 10_100, 5_000)


def test_should_enter_on_breakout_with_volume_spike():
    strategy = MomentumScalpingStrategy()
    prices = [10_000] * config.BREAKOUT_LOOKBACK_TICKS
    _fill_history(strategy, "005930", prices, volume=1_000)
    assert strategy.should_enter("005930", 10_500, volume=5_000)


def test_should_not_enter_without_volume_spike():
    strategy = MomentumScalpingStrategy()
    prices = [10_000] * config.BREAKOUT_LOOKBACK_TICKS
    _fill_history(strategy, "005930", prices, volume=1_000)
    assert not strategy.should_enter("005930", 10_500, volume=1_500)


def test_should_not_enter_outside_price_band():
    strategy = MomentumScalpingStrategy()
    prices = [config.MAX_PRICE] * config.BREAKOUT_LOOKBACK_TICKS
    _fill_history(strategy, "005930", prices, volume=1_000)
    assert not strategy.should_enter("005930", config.MAX_PRICE + 1_000, volume=5_000)
