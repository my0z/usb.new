import asyncio
from unittest.mock import patch

import config
from src.signal_bot import SignalBot, screen_candidates


class FakeRanking:
    def __init__(self):
        self.calls = 0

    def top_volume_today(self, **kwargs):
        self.calls += 1
        rows = [
            {"stk_cd": "005930", "stk_nm": "삼성전자"},
            {"stk_cd": "000660", "stk_nm": "SK하이닉스"},
        ]
        if self.calls > 2:  # 두 시장 조회가 끝난 뒤의 재스크리닝에서만 새 종목 등장
            rows.append({"stk_cd": "035720", "stk_nm": "카카오"})
        return {"tdy_trde_qty_upper": rows}


class FakeWs:
    def __init__(self):
        self.subscribed = []

    def on(self, data_type, callback):
        self.callback = callback

    async def connect(self):
        pass

    async def subscribe(self, data_type, code):
        self.subscribed.append(code)

    async def listen(self):
        await asyncio.sleep(3600)

    async def disconnect(self):
        pass


class FakeApi:
    def __init__(self):
        self.ranking = FakeRanking()
        self.ws = FakeWs()

    def create_websocket(self):
        return self.ws


def test_rescreen_subscribes_newly_surfacing_codes():
    api = FakeApi()
    bot = SignalBot(api=api)

    async def run_then_stop():
        task = asyncio.create_task(bot.run_session())
        await asyncio.sleep(2.5)
        bot.stopped = True
        await task

    with patch("src.signal_bot.telegram_notifier.send"), \
         patch("src.signal_bot.is_past_entry_cutoff", return_value=False), \
         patch.object(config, "RESCREEN_INTERVAL_SEC", 0), \
         patch.object(config, "WATCHLIST", []):
        asyncio.run(run_then_stop())

    assert api.ws.subscribed[:2] == ["005930", "000660"]
    assert "035720" in api.ws.subscribed
    assert api.ws.subscribed.count("005930") == 1  # 이미 보던 종목은 다시 구독하지 않음


def test_watch_respects_max_watched_codes():
    api = FakeApi()
    bot = SignalBot(api=api)
    bot.ws = api.ws

    with patch.object(config, "MAX_WATCHED_CODES", 2):
        added = asyncio.run(bot._watch(["A", "B", "C"]))

    assert added == ["A", "B"]
    assert bot.watched == ["A", "B"]


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
