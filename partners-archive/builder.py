"""data/ 를 읽어 site/ 에 정적 아카이브 사이트를 만든다."""
from __future__ import annotations

import json
import os
import shutil
from pathlib import Path
from typing import Any

from store import DISCLOSURE, ROOT, VIDEOS, load, load_posts

SITE = ROOT / "site"
TEMPLATE = ROOT / "templates" / "index.html"


def build() -> Path:
    items = load()
    SITE.mkdir(exist_ok=True)
    (SITE / "videos").mkdir(exist_ok=True)

    payload: list[dict[str, Any]] = []
    for item in items:
        video = item.get("video", "")
        video_src = ""
        if video:
            if video.startswith("http://") or video.startswith("https://"):
                video_src = video
            else:
                src = (VIDEOS / video) if not os.path.isabs(video) else Path(video)
                if src.exists():
                    dst = SITE / "videos" / src.name
                    if not dst.exists() or dst.stat().st_mtime < src.stat().st_mtime:
                        shutil.copy2(src, dst)
                    video_src = f"videos/{src.name}"
        payload.append(
            {
                "id": item["id"],
                "title": item["title"],
                "category": item.get("category", ""),
                "tags": item.get("tags", []),
                "link": item.get("affiliate_url") or item.get("url", ""),
                "video": video_src,
                "posts": load_posts(item["id"]),
                "added": item.get("added", ""),
            }
        )

    html = TEMPLATE.read_text(encoding="utf-8")
    html = (
        html.replace("__SITE_TITLE__", os.environ.get("SITE_TITLE", "제품 영상 아카이브"))
        .replace("__SITE_OWNER__", os.environ.get("SITE_OWNER", ""))
        .replace("__PROFILE_URL__", os.environ.get("SITE_PROFILE_URL", ""))
        .replace("__DISCLOSURE__", DISCLOSURE)
        .replace("__DATA__", json.dumps(payload, ensure_ascii=False))
    )
    out = SITE / "index.html"
    out.write_text(html, encoding="utf-8")
    return out
