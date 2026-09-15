"""Watches candidate stocks and sends buy/sell alerts. Never places an order itself."""
import asyncio
import contextlib
import logging
import time

from kiwoom_client import extract_records

import config
from src.market_hours import is_past_entry_cutoff, is_past_force_close, now_kst
from src.notifier import telegram_notifier
from src.risk.risk_manager import RiskManager
from src.strategy.momentum_scalping import MomentumScalpingStrategy

logger = logging.getLogger("signal_bot")


def screen_candidates(api):
    """Today's top-volume KOSPI/KOSDAQ stocks (ka10030), plus config.WATCHLIST."""
    codes = list(config.WATCHLIST)
    for market_type in ("0", "1"):  # 0=코스피 1=코스닥
        try:
            response = api.ranking.top_volume_today(
                mrkt_tp=market_type,
                stk_cnd="0",
                trde_qty_tp="5",
                prc_tp="0",
                trde_amt_tp="0",
                updn_tp="0",
            )
        except Exception:
            logger.exception("top_volume_today failed for mrkt_tp=%s", market_type)
            continue
        _, records = extract_records(response)
        codes.extend(r.get("stk_cd") for r in records if r.get("stk_cd"))

    seen = []
    for code in codes:
        if code not in seen:
            seen.append(code)
    if not seen:
        logger.warning("screening returned nothing and WATCHLIST is empty")
    return seen[:config.MAX_SCREEN_CANDIDATES]


class SignalBot:
    def __init__(self, api):
        self.api = api
        self.strategy = MomentumScalpingStrategy()
        self.risk = RiskManager(starting_balance=config.ACCOUNT_BALANCE_HINT)
        self.stopped = False
        self.ws = None
        self.watched = []

    async def run_session(self):
        candidates = await asyncio.to_thread(screen_candidates, self.api)
        if not candidates:
            return

        self.ws = await asyncio.to_thread(self.api.create_websocket)
        self.ws.on("0B", self._on_tick)
        await self.ws.connect()
        added = await self._watch(candidates)
        telegram_notifier.send(f"[감시 시작] {len(added)}개 종목: {', '.join(added)}")

        listen_task = asyncio.create_task(self.ws.listen())
        next_rescreen = time.monotonic() + config.RESCREEN_INTERVAL_SEC
        try:
            while not self.stopped:
                await asyncio.sleep(1)
                if time.monotonic() < next_rescreen:
                    continue
                next_rescreen = time.monotonic() + config.RESCREEN_INTERVAL_SEC
                if is_past_entry_cutoff(now_kst()):
                    continue
                fresh = await asyncio.to_thread(screen_candidates, self.api)
                added = await self._watch(fresh)
                if added:
                    telegram_notifier.send(f"[감시 추가] {len(added)}개 종목: {', '.join(added)}")
        finally:
            with contextlib.suppress(Exception):
                await self.ws.disconnect()
            listen_task.cancel()
            with contextlib.suppress(Exception, asyncio.CancelledError):
                await listen_task

    async def _watch(self, codes):
        """Subscribes to codes not already watched, within MAX_WATCHED_CODES. Returns the new ones."""
        room = config.MAX_WATCHED_CODES - len(self.watched)
        new_codes = [c for c in codes if c not in self.watched][:max(0, room)]
        for code in new_codes:
            await self.ws.subscribe("0B", code)
            self.watched.append(code)
        if new_codes:
            logger.info("watching %d new codes (%d total): %s", len(new_codes), len(self.watched), new_codes)
        return new_codes

    def _on_tick(self, data):
        if self.stopped:
            return
        code = data.get("item")
        values = data.get("values", {})
        # FID 10/13 (현재가/누적거래량) follow Kiwoom's legacy numbering, carried
        # over from OpenAPI+ into the REST WebSocket "0B" frames.
        price = abs(int(values.get("10", 0) or 0))
        volume = abs(int(values.get("13", 0) or 0))
        if not price:
            return

        moment = now_kst()
        if is_past_force_close(moment):
            self._force_close_all(price_lookup={code: price})
            return

        exit_reason = self.risk.check_exit(code, price)
        if exit_reason:
            self.strategy.track(code, price, volume)
            self._alert_close(code, price, exit_reason)
            self._check_daily_stop()
            return

        # should_enter reads history as of the tick *before* this one, so
        # track() must run after it — otherwise a breakout candle's own price
        # ends up counted as the recent high and never breaks out of itself.
        entry_signal = (
            code not in self.risk.open_positions
            and not is_past_entry_cutoff(moment)
            and self.risk.can_open_new_position()
            and self.strategy.should_enter(code, price, volume)
        )
        self.strategy.track(code, price, volume)
        if entry_signal:
            self._alert_open(code, price)

    def _alert_open(self, code, price):
        quantity = self.risk.position_size(price)
        if quantity <= 0:
            return
        self.risk.open_position(code, price, quantity)
        pos = self.risk.open_positions[code]
        telegram_notifier.send(
            f"[매수 신호] {code} 현재가 {price:,}원 제안수량 {quantity}주\n"
            f"손절가 {int(pos['stop_price']):,}원 익절가 {int(pos['target_price']):,}원"
        )
        logger.info("BUY signal %s qty=%d price=%d", code, quantity, price)

    def _alert_close(self, code, price, reason):
        pos = self.risk.open_positions[code]
        pnl = (price - pos["entry_price"]) * pos["quantity"]
        self.risk.record_close(code, pnl)
        label = "익절" if reason == "take_profit" else "손절"
        telegram_notifier.send(
            f"[매도 신호:{label}] {code} 현재가 {price:,}원 수량 {pos['quantity']}주 예상손익 {pnl:,}원"
        )
        logger.info("SELL signal %s qty=%d price=%d reason=%s pnl=%d", code, pos["quantity"], price, reason, pnl)

    def _force_close_all(self, price_lookup):
        for code in list(self.risk.open_positions.keys()):
            price = price_lookup.get(code, self.risk.open_positions[code]["entry_price"])
            self._alert_close(code, price, "force_close")
        self.stopped = True
        telegram_notifier.send("[장 마감 대비] 보유 중인 신호 포지션을 전량 정리하세요. 오늘 감시를 종료합니다.")

    def _check_daily_stop(self):
        if self.risk.daily_target_hit():
            telegram_notifier.send(f"[목표 달성] 예상 누적 손익 {self.risk.realized_pnl:,}원. 오늘 매매를 종료하세요.")
            self.stopped = True
        elif self.risk.daily_loss_limit_hit():
            telegram_notifier.send(f"[손실 한도] 예상 누적 손익 {self.risk.realized_pnl:,}원. 오늘 매매를 중단하세요.")
            self.stopped = True
