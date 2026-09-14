"""KST-aware market session helpers. Explicit zoneinfo so this works on a UTC server."""
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

import config

KST = ZoneInfo(config.TIMEZONE)


def now_kst():
    return datetime.now(KST)


def _parse(hms):
    return time.fromisoformat(hms)


def is_weekday(moment):
    return moment.weekday() < 5  # 공휴일은 별도 캘린더가 없어 반영되지 않음


def is_before_open(moment):
    return moment.time() < _parse(config.MARKET_OPEN_TIME)


def is_past_close(moment):
    return moment.time() >= _parse(config.MARKET_CLOSE_TIME)


def is_past_entry_cutoff(moment):
    return moment.time() >= _parse(config.ENTRY_CUTOFF_TIME)


def is_past_force_close(moment):
    return moment.time() >= _parse(config.FORCE_CLOSE_TIME)


def seconds_until_next_open(moment):
    """Seconds to sleep until the next market-day open, at least 1 second."""
    open_time = _parse(config.MARKET_OPEN_TIME)
    candidate_day = moment
    if not (is_weekday(moment) and is_before_open(moment)):
        candidate_day = moment + timedelta(days=1)
        while not is_weekday(candidate_day):
            candidate_day += timedelta(days=1)
    target = candidate_day.replace(
        hour=open_time.hour, minute=open_time.minute, second=open_time.second, microsecond=0
    )
    return max(1, int((target - moment).total_seconds()))
