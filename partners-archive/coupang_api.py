"""쿠팡 파트너스 Open API 래퍼.

딥링크 생성과 상품 검색 두 가지만 다룬다.
키가 없으면 호출하지 않고 None 을 돌려준다.
"""
from __future__ import annotations

import hashlib
import hmac
import os
import time
from typing import Any
from urllib.parse import urlencode

import requests

DOMAIN = "https://api-gateway.coupang.com"
DEEPLINK_PATH = "/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink"
SEARCH_PATH = "/v2/providers/affiliate_open_api/apis/openapi/products/search"


class CoupangError(RuntimeError):
    pass


def _keys() -> tuple[str, str] | None:
    access = os.environ.get("COUPANG_ACCESS_KEY", "").strip()
    secret = os.environ.get("COUPANG_SECRET_KEY", "").strip()
    if not access or not secret:
        return None
    return access, secret


def has_keys() -> bool:
    return _keys() is not None


def _authorization(method: str, path: str, query: str, access: str, secret: str) -> str:
    signed_date = time.strftime("%y%m%dT%H%M%SZ", time.gmtime())
    message = signed_date + method + path + query
    signature = hmac.new(secret.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).hexdigest()
    return (
        f"CEA algorithm=HmacSHA256, access-key={access}, "
        f"signed-date={signed_date}, signature={signature}"
    )


def _request(method: str, path: str, query: dict[str, Any] | None = None, body: Any = None) -> Any:
    keys = _keys()
    if keys is None:
        raise CoupangError("COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY 가 설정되지 않았다")
    access, secret = keys
    query_str = urlencode(query) if query else ""
    url = DOMAIN + path + (f"?{query_str}" if query_str else "")
    headers = {
        "Authorization": _authorization(method, path, query_str, access, secret),
        "Content-Type": "application/json;charset=UTF-8",
    }
    resp = requests.request(method, url, headers=headers, json=body, timeout=20)
    if resp.status_code != 200:
        raise CoupangError(f"HTTP {resp.status_code}: {resp.text[:300]}")
    payload = resp.json()
    if payload.get("rCode") not in (None, "0"):
        raise CoupangError(f"{payload.get('rCode')}: {payload.get('rMessage')}")
    return payload.get("data")


def deeplink(urls: list[str]) -> list[dict[str, str]]:
    """일반 쿠팡 URL 목록을 파트너스 수익 링크로 바꾼다.

    반환 항목: originalUrl / shortenUrl / landingUrl
    """
    body: dict[str, Any] = {"coupangUrls": urls}
    sub_id = os.environ.get("COUPANG_SUB_ID", "").strip()
    if sub_id:
        body["subId"] = sub_id
    return _request("POST", DEEPLINK_PATH, body=body) or []


def search(keyword: str, limit: int = 10) -> list[dict[str, Any]]:
    """키워드로 상품을 찾는다. 결과의 productUrl 은 이미 파트너스 링크다."""
    query: dict[str, Any] = {"keyword": keyword, "limit": limit}
    sub_id = os.environ.get("COUPANG_SUB_ID", "").strip()
    if sub_id:
        query["subId"] = sub_id
    data = _request("GET", SEARCH_PATH, query=query) or {}
    return data.get("productData", [])
