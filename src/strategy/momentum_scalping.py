"""Breakout momentum scalping strategy for volume-surge candidates."""
from collections import deque

import config


class MomentumScalpingStrategy:
    def __init__(self):
        self.price_history = {}  # code -> deque of recent prices
        self.volume_baseline = {}  # code -> first observed volume, for ratio check

    def track(self, code, price, volume):
        history = self.price_history.setdefault(
            code, deque(maxlen=config.BREAKOUT_LOOKBACK_TICKS)
        )
        self.volume_baseline.setdefault(code, volume or 1)
        history.append(price)

    def should_enter(self, code, price, volume):
        history = self.price_history.get(code)
        if not history or len(history) < config.BREAKOUT_LOOKBACK_TICKS:
            return False
        if not (config.MIN_PRICE <= price <= config.MAX_PRICE):
            return False
        recent_high = max(history)
        volume_ratio = volume / self.volume_baseline.get(code, 1)
        breakout = price > recent_high
        volume_spike = volume_ratio >= config.MIN_VOLUME_RATIO
        return breakout and volume_spike
