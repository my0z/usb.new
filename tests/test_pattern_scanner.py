from src.backtest.pattern_scanner import find_pump_then_dump


def _bars(dates, closes):
    return [{"date": d, "close": c} for d, c in zip(dates, closes)]


def test_detects_creep_spike_plateau_crash_base():
    dates = [f"2026010{i}" if i < 10 else f"202601{i}" for i in range(1, 14)]
    closes = [
        10000, 10200, 10400, 10600, 10800,  # gradual creep up
        11880,                              # spike day (+10%)
        11800, 11950, 11850,                # plateau near the spike close
        8887.5,                             # crash (-25% from plateau)
        8900, 8850, 8950,                   # settles at the new lower level
    ]
    bars = _bars(dates, closes)

    matches = find_pump_then_dump(bars)

    assert len(matches) == 1
    match = matches[0]
    assert match["spike_date"] == dates[5]
    assert match["spike_return_pct"] > 0
    assert match["crash_date"] == dates[9]
    assert match["crash_return_pct"] <= -20.0
    assert match["base_end_date"] == dates[12]


def test_no_match_when_price_is_flat():
    dates = [f"2026010{i}" for i in range(1, 10)]
    closes = [10000, 10050, 9980, 10020, 10010, 9990, 10030, 10000, 10015]
    bars = _bars(dates, closes)

    assert find_pump_then_dump(bars) == []


def test_no_match_when_spike_is_too_small():
    dates = [f"2026010{i}" if i < 10 else f"202601{i}" for i in range(1, 14)]
    closes = [
        10000, 10200, 10400, 10600, 10800,
        10850,  # tiny bump, not a real spike
        10800, 10820, 10810,
        8600, 8620, 8580, 8610,  # even if a crash happens later, no spike precedes it
    ]
    bars = _bars(dates, closes)

    assert find_pump_then_dump(bars) == []
