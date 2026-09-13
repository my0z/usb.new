"""Orchestrates screening, entries, exits and daily stop conditions."""
import logging
from datetime import datetime

import config
from src.kiwoom.api import KiwoomAPI
from src.risk.risk_manager import RiskManager
from src.strategy.momentum_scalping import MomentumScalpingStrategy

logger = logging.getLogger("trading_bot")


class TradingBot:
    def __init__(self):
        self.api = KiwoomAPI()
        self.strategy = MomentumScalpingStrategy()
        self.risk = None
        self.stopped = False

    def start(self):
        self.api.login()
        deposit = self.api.get_deposit()
        self.risk = RiskManager(starting_balance=deposit)
        logger.info("logged in account=%s deposit=%s", self.api.account_no, deposit)

        candidates = self.api.screen_volume_surge()
        if not candidates:
            logger.warning("no volume-surge candidates found, nothing to trade today")
            return
        self.api.register_realtime(candidates)
        self.api.on_price_tick = self._on_tick
        logger.info("watching %d candidates: %s", len(candidates), candidates)

    def _on_tick(self, code, price, volume):
        if self.stopped:
            return

        now = datetime.now().strftime("%H:%M:%S")
        if now >= config.FORCE_CLOSE_TIME:
            self._force_close_all(price_lookup={code: price})
            return

        self.strategy.track(code, price, volume)

        exit_reason = self.risk.check_exit(code, price)
        if exit_reason:
            self._close_position(code, price, exit_reason)
            self._check_daily_stop()
            return

        if code in self.risk.open_positions:
            return
        if now >= config.ENTRY_CUTOFF_TIME:
            return
        if not self.risk.can_open_new_position():
            return
        if self.strategy.should_enter(code, price, volume):
            self._open_position(code, price)

    def _open_position(self, code, price):
        quantity = self.risk.position_size(price)
        if quantity <= 0:
            return
        self.api.send_order("scalp_buy", code, quantity, price, order_type=1, is_buy=True)
        self.risk.open_position(code, price, quantity)
        logger.info("BUY %s qty=%d price=%d", code, quantity, price)

    def _close_position(self, code, price, reason):
        pos = self.risk.open_positions[code]
        self.api.send_order(
            "scalp_sell", code, pos["quantity"], price, order_type=1, is_buy=False
        )
        pnl = (price - pos["entry_price"]) * pos["quantity"]
        self.risk.record_close(code, pnl)
        logger.info("SELL %s qty=%d price=%d reason=%s pnl=%d", code, pos["quantity"], price, reason, pnl)

    def _force_close_all(self, price_lookup):
        for code in list(self.risk.open_positions.keys()):
            price = price_lookup.get(code, self.risk.open_positions[code]["entry_price"])
            self._close_position(code, price, "force_close")
        self.stopped = True
        logger.info("force-closed all positions, trading stopped for today")

    def _check_daily_stop(self):
        if self.risk.daily_target_hit():
            logger.info("daily target of %s KRW reached, stopping", config.DAILY_TARGET_PROFIT)
            self.stopped = True
        elif self.risk.daily_loss_limit_hit():
            logger.info("daily loss limit of %s KRW hit, stopping", config.DAILY_MAX_LOSS)
            self.stopped = True
        if self.stopped:
            self.api.unregister_realtime()
