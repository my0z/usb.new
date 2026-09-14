from datetime import datetime
from zoneinfo import ZoneInfo

from src.market_hours import (
    is_past_entry_cutoff,
    is_past_force_close,
    seconds_until_next_open,
)

KST = ZoneInfo("Asia/Seoul")


def _dt(y, m, d, h, mi, s=0):
    return datetime(y, m, d, h, mi, s, tzinfo=KST)


def test_same_day_wait_when_before_open():
    monday_before_open = _dt(2026, 9, 14, 7, 0)  # 2026-09-14 is a Monday
    seconds = seconds_until_next_open(monday_before_open)
    assert seconds == 2 * 3600


def test_rolls_to_next_weekday_after_close():
    friday_evening = _dt(2026, 9, 18, 20, 0)  # 2026-09-18 is a Friday
    seconds = seconds_until_next_open(friday_evening)
    target = friday_evening.fromtimestamp(
        friday_evening.timestamp() + seconds, tz=KST
    )
    assert target.weekday() == 0  # rolls over the weekend to Monday
    assert target.strftime("%H:%M:%S") == "09:00:00"


def test_entry_cutoff_and_force_close_boundaries():
    before_cutoff = _dt(2026, 9, 14, 14, 59, 59)
    at_cutoff = _dt(2026, 9, 14, 15, 0, 0)
    at_force_close = _dt(2026, 9, 14, 15, 20, 0)

    assert not is_past_entry_cutoff(before_cutoff)
    assert is_past_entry_cutoff(at_cutoff)
    assert not is_past_force_close(at_cutoff)
    assert is_past_force_close(at_force_close)
