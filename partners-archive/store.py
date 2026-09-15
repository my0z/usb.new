"""products.json 읽기 쓰기."""
from __future__ import annotations

import json
import re
import time
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
PRODUCTS = DATA / "products.json"
POSTS = DATA / "posts"
VIDEOS = DATA / "videos"

DISCLOSURE = "이 포스팅은 쿠팡 파트너스 활동의 일환으로 이에 따른 일정액의 수수료를 제공받습니다."


def load() -> list[dict[str, Any]]:
    if not PRODUCTS.exists():
        return []
    return json.loads(PRODUCTS.read_text(encoding="utf-8"))


def save(items: list[dict[str, Any]]) -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    PRODUCTS.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def slugify(text: str) -> str:
    text = re.sub(r"[^0-9A-Za-z가-힣]+", "-", text).strip("-").lower()
    return text[:40] or "item"


def new_id(items: list[dict[str, Any]], title: str) -> str:
    base = slugify(title)
    taken = {i["id"] for i in items}
    if base not in taken:
        return base
    n = 2
    while f"{base}-{n}" in taken:
        n += 1
    return f"{base}-{n}"


def find(items: list[dict[str, Any]], pid: str) -> dict[str, Any]:
    for item in items:
        if item["id"] == pid:
            return item
    raise KeyError(f"상품 없음: {pid}")


def now() -> str:
    return time.strftime("%Y-%m-%d %H:%M:%S")


def load_posts(pid: str) -> dict[str, str]:
    path = POSTS / f"{pid}.json"
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def save_posts(pid: str, posts: dict[str, str]) -> None:
    POSTS.mkdir(parents=True, exist_ok=True)
    (POSTS / f"{pid}.json").write_text(json.dumps(posts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
