"""Fetches daily OHLC history from Kiwoom REST and normalizes it for pattern_scanner."""
import logging

from kiwoom_client import extract_records, to_number

logger = logging.getLogger("kiwoom_history")

# ka10081's data list key, confirmed against the kiwoom-client examples
# (to_dataframe(chart, key="stk_dt_pole_chart_qry")). If Kiwoom ever renames
# it, request_all() falls back to one page fetched via extract_records below.
DAILY_CHART_DATA_KEY = "stk_dt_pole_chart_qry"

# Field-name guesses for date/close inside each daily-bar record. "cur_prc" is
# confirmed (same field the ranking endpoints use); "dt" is not independently
# verified — if fetch_daily_bars raises a KeyError, check the printed field
# list against https://openapi.kiwoom.com and add the real key here.
DATE_KEYS = ("dt", "stk_dt", "date", "trd_dt")
CLOSE_KEYS = ("cur_prc", "close", "clos_prc", "clsp")


def _pick(record, candidates):
    for key in candidates:
        if key in record:
            return record[key]
    return None


def _normalize_bar(record):
    raw_date = _pick(record, DATE_KEYS)
    raw_close = _pick(record, CLOSE_KEYS)
    if raw_date is None or raw_close is None:
        raise KeyError(
            "일봉 응답에서 날짜/종가 필드를 찾지 못했습니다. "
            f"실제 필드 목록: {sorted(record.keys())} "
            "kiwoom_history.py의 DATE_KEYS/CLOSE_KEYS를 이 값에 맞게 수정하세요."
        )
    return {"date": str(raw_date), "close": abs(to_number(raw_close) or 0)}


def fetch_daily_bars(api, code, base_dt, max_pages=20):
    """Returns {"date", "close"} bars for `code`, oldest first, up to base_dt (YYYYMMDD)."""
    records = api.chart._client.request_all(
        api.chart.RESOURCE_URL,
        "ka10081",
        {"stk_cd": code, "base_dt": base_dt, "updn_tp": "0"},
        data_key=DAILY_CHART_DATA_KEY,
        max_pages=max_pages,
    )
    if not records:
        logger.warning("data_key=%s produced nothing, trying a single-page fallback", DAILY_CHART_DATA_KEY)
        response = api.chart.stock_daily_chart(stk_cd=code, base_dt=base_dt, updn_tp="0")
        _, records = extract_records(response)

    bars = [_normalize_bar(r) for r in records]
    bars.sort(key=lambda b: b["date"])
    return bars
