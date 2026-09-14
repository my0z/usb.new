"""Detects a creep-up -> spike -> plateau -> crash -> re-base pattern in daily closes."""
import config


def _pct_change(base, value):
    if base == 0:
        return 0.0
    return (value - base) / base * 100


def _daily_returns(closes):
    return [_pct_change(closes[i], closes[i + 1]) for i in range(len(closes) - 1)]


def _is_gradual_rise(returns):
    if not returns:
        return False
    if any(r > config.RISE_DAILY_MAX_PCT for r in returns):
        return False
    up_days = sum(1 for r in returns if r > 0)
    if up_days / len(returns) < config.RISE_MIN_UP_DAY_RATIO:
        return False
    return sum(returns) > 0


def _within_band(values, reference, tolerance_pct):
    return all(abs(_pct_change(reference, v)) <= tolerance_pct for v in values)


def _find_plateau_crash_base(closes, dates, spike_idx):
    n = len(closes)
    spike_close = closes[spike_idx]
    for plateau_len in range(config.PLATEAU_MIN_DAYS, config.PLATEAU_MAX_DAYS + 1):
        plateau_end = spike_idx + plateau_len
        if plateau_end >= n:
            break
        plateau_slice = closes[spike_idx + 1:plateau_end + 1]
        if not _within_band(plateau_slice, spike_close, config.PLATEAU_TOLERANCE_PCT):
            continue

        last_plateau_close = closes[plateau_end]
        for window in range(1, config.CRASH_WINDOW_DAYS + 1):
            crash_idx = plateau_end + window
            if crash_idx >= n:
                break
            crash_return = _pct_change(last_plateau_close, closes[crash_idx])
            if crash_return > -config.CRASH_MIN_PCT:
                continue

            base_end = crash_idx + config.POST_CRASH_MIN_DAYS
            if base_end >= n:
                continue
            base_slice = closes[crash_idx + 1:base_end + 1]
            if not _within_band(base_slice, closes[crash_idx], config.POST_CRASH_TOLERANCE_PCT):
                continue

            return {
                "plateau_end_date": dates[plateau_end],
                "crash_date": dates[crash_idx],
                "crash_return_pct": round(crash_return, 2),
                "base_end_date": dates[base_end],
            }
    return None


def find_pump_then_dump(bars):
    """bars: [{"date": str, "close": float}, ...] ascending by date."""
    dates = [b["date"] for b in bars]
    closes = [b["close"] for b in bars]
    n = len(closes)
    matches = []

    for spike_idx in range(config.RISE_LOOKBACK_MIN, n):
        for rise_len in range(config.RISE_LOOKBACK_MIN, config.RISE_LOOKBACK_MAX + 1):
            rise_start = spike_idx - rise_len
            if rise_start < 0:
                break
            rise_returns = _daily_returns(closes[rise_start:spike_idx])
            if not _is_gradual_rise(rise_returns):
                continue

            spike_return = _pct_change(closes[spike_idx - 1], closes[spike_idx])
            if spike_return < config.SPIKE_MIN_PCT:
                continue
            avg_rise_return = sum(rise_returns) / len(rise_returns)
            if avg_rise_return > 0 and spike_return < avg_rise_return * config.SPIKE_TO_RISE_RATIO:
                continue

            tail = _find_plateau_crash_base(closes, dates, spike_idx)
            if not tail:
                continue

            matches.append({
                "rise_start_date": dates[rise_start],
                "rise_return_pct": round(_pct_change(closes[rise_start], closes[spike_idx - 1]), 2),
                "spike_date": dates[spike_idx],
                "spike_return_pct": round(spike_return, 2),
                **tail,
            })
            break  # one match per spike day is enough
    return matches
