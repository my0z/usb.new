"""Daily profit target and per-trade risk control."""
import config


class RiskManager:
    def __init__(self, starting_balance):
        self.starting_balance = starting_balance
        self.realized_pnl = 0
        self.trade_count = 0
        self.open_positions = {}

    def record_close(self, code, pnl):
        self.realized_pnl += pnl
        self.trade_count += 1
        self.open_positions.pop(code, None)

    def daily_target_hit(self):
        return self.realized_pnl >= config.DAILY_TARGET_PROFIT

    def daily_loss_limit_hit(self):
        return self.realized_pnl <= config.DAILY_MAX_LOSS

    def trade_budget_exhausted(self):
        return self.trade_count >= config.MAX_TRADES_PER_DAY

    def can_open_new_position(self):
        if len(self.open_positions) >= config.MAX_CONCURRENT_POSITIONS:
            return False
        return not (
            self.daily_target_hit()
            or self.daily_loss_limit_hit()
            or self.trade_budget_exhausted()
        )

    def position_size(self, entry_price):
        risk_amount = self.starting_balance * config.RISK_PER_TRADE_RATIO
        stop_distance = entry_price * config.STOP_LOSS_RATIO
        if stop_distance <= 0:
            return 0
        quantity = int(risk_amount / stop_distance)
        max_by_cash = int(self.starting_balance / entry_price)
        return max(0, min(quantity, max_by_cash))

    def open_position(self, code, entry_price, quantity):
        self.open_positions[code] = {
            "entry_price": entry_price,
            "quantity": quantity,
            "stop_price": entry_price * (1 - config.STOP_LOSS_RATIO),
            "target_price": entry_price * (1 + config.TAKE_PROFIT_RATIO),
        }

    def check_exit(self, code, current_price):
        pos = self.open_positions.get(code)
        if not pos:
            return None
        if current_price <= pos["stop_price"]:
            return "stop_loss"
        if current_price >= pos["target_price"]:
            return "take_profit"
        return None
