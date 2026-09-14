from unittest.mock import MagicMock, patch

import config
from src.signal_bot import SignalBot, screen_candidates


class FakeRanking:
    def top_volume_today(self, **kwargs):
        return {
            "tdy_trde_qty_upper": [
                {"stk_cd": "005930", "stk_nm": "삼성전자"},
                {"stk_cd": "000660", "stk_nm": "SK하이닉스"},
            ]
        }


class FakeApi:
    def __init__(self):
        self.ranking = FakeRanking()


def test_screen_candidates_extracts_codes_and_merges_watchlist():
    original_watchlist = config.WATCHLIST
    config.WATCHLIST = ["005380"]
    try:
        codes = screen_candidates(FakeApi())
    finally:
        config.WATCHLIST = original_watchlist
    assert "005930" in codes
    assert "000660" in codes
    assert "005380" in codes


def test_on_tick_generates_buy_then_sell_alert():
    bot = SignalBot(api=FakeApi())
    with patch("src.signal_bot.telegram_notifier.send") as mock_send, \
         patch("src.signal_bot.is_past_entry_cutoff", return_value=False), \
         patch("src.signal_bot.is_past_force_close", return_value=False), \
         patch("src.signal_bot.now_kst", return_value="fixed-moment"):
        for _ in range(config.BREAKOUT_LOOKBACK_TICKS):
            bot._on_tick({"item": "005930", "values": {"10": "10000", "13": "1000"}})

        bot._on_tick({"item": "005930", "values": {"10": "10500", "13": "5000"}})
        assert "005930" in bot.risk.open_positions
        assert any("매수 신호" in call.args[0] for call in mock_send.call_args_list)

        entry_price = bot.risk.open_positions["005930"]["entry_price"]
        target_price = int(entry_price * (1 + config.TAKE_PROFIT_RATIO)) + 1
        bot._on_tick({"item": "005930", "values": {"10": str(target_price), "13": "5000"}})

        assert "005930" not in bot.risk.open_positions
        assert any("익절" in call.args[0] for call in mock_send.call_args_list)
