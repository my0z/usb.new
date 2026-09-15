#!/usr/bin/env python3
"""쿠팡 파트너스 제품 영상 아카이브 CLI.

  python archive.py add     --url <쿠팡URL> --title <제품명> [--video 파일] [--tags a,b] [--category 주방]
  python archive.py search  --keyword <검색어>           # 파트너스 API 로 상품 찾기 (링크 포함)
  python archive.py write   <id> [--platform threads]   # Claude 로 글 생성
  python archive.py write-all [--platform threads]      # 글 없는 상품 전부 생성
  python archive.py build                               # site/ 에 정적 사이트 생성
  python archive.py serve   [--port 8000]               # 로컬 미리보기
  python archive.py list
"""
from __future__ import annotations

import argparse
import http.server
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

import store  # noqa: E402


def cmd_add(a: argparse.Namespace) -> None:
    items = store.load()
    pid = store.new_id(items, a.title)
    affiliate = ""
    if a.url and "coupang.com" in a.url:
        import coupang_api

        if coupang_api.has_keys():
            try:
                res = coupang_api.deeplink([a.url])
                affiliate = res[0]["shortenUrl"] if res else ""
                print(f"파트너스 링크 생성: {affiliate}")
            except coupang_api.CoupangError as e:
                print(f"[경고] 딥링크 실패. 원본 URL 저장: {e}", file=sys.stderr)
        else:
            print("[안내] 쿠팡 키 없음. 원본 URL 만 저장한다. .env 에 키 넣고 relink 하면 된다.")
    video = a.video or ""
    if video and not video.startswith("http"):
        src = Path(video)
        if src.exists():
            store.VIDEOS.mkdir(parents=True, exist_ok=True)
            dst = store.VIDEOS / src.name
            if src.resolve() != dst.resolve():
                dst.write_bytes(src.read_bytes())
            video = src.name
        else:
            print(f"[경고] 영상 파일 없음: {video}", file=sys.stderr)
    items.append(
        {
            "id": pid,
            "title": a.title,
            "url": a.url or "",
            "affiliate_url": affiliate,
            "video": video,
            "category": a.category or "",
            "tags": [t.strip() for t in (a.tags or "").split(",") if t.strip()],
            "note": a.note or "",
            "added": store.now(),
        }
    )
    store.save(items)
    print(f"추가됨: {pid}")


def cmd_relink(a: argparse.Namespace) -> None:
    import coupang_api

    items = store.load()
    targets = [i for i in items if i.get("url") and not i.get("affiliate_url")]
    if not targets:
        print("변환할 상품 없음")
        return
    res = coupang_api.deeplink([i["url"] for i in targets])
    by_url = {r["originalUrl"]: r["shortenUrl"] for r in res}
    n = 0
    for i in targets:
        if i["url"] in by_url:
            i["affiliate_url"] = by_url[i["url"]]
            n += 1
    store.save(items)
    print(f"{n}개 링크 변환 완료")


def cmd_search(a: argparse.Namespace) -> None:
    import coupang_api

    for p in coupang_api.search(a.keyword, a.limit):
        print(f"- {p.get('productName')}  {p.get('productPrice')}원")
        print(f"  {p.get('productUrl')}")


def _write_one(pid: str, platform: str) -> None:
    import writer

    items = store.load()
    product = store.find(items, pid)
    posts = store.load_posts(pid)
    print(f"[{pid}] {platform} 글 생성 중...")
    posts[platform] = writer.write_post(product, platform)
    store.save_posts(pid, posts)
    print(posts[platform])
    print()


def cmd_write(a: argparse.Namespace) -> None:
    for platform in a.platform.split(","):
        _write_one(a.id, platform.strip())


def cmd_write_all(a: argparse.Namespace) -> None:
    for item in store.load():
        for platform in a.platform.split(","):
            platform = platform.strip()
            if platform in store.load_posts(item["id"]) and not a.force:
                continue
            _write_one(item["id"], platform)


def cmd_build(_: argparse.Namespace) -> None:
    import builder

    out = builder.build()
    print(f"생성됨: {out}")


def cmd_serve(a: argparse.Namespace) -> None:
    import builder

    builder.build()
    os.chdir(builder.SITE)
    print(f"http://localhost:{a.port}")
    http.server.ThreadingHTTPServer(("", a.port), http.server.SimpleHTTPRequestHandler).serve_forever()


def cmd_list(_: argparse.Namespace) -> None:
    items = store.load()
    if not items:
        print("등록된 상품 없음")
    for i in items:
        posts = ",".join(store.load_posts(i["id"]).keys()) or "-"
        link = "✓" if i.get("affiliate_url") else "✗"
        print(f"{i['id']:<30} 링크{link} 글[{posts}] {i['title']}")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("add", help="상품 추가")
    s.add_argument("--title", required=True)
    s.add_argument("--url", default="")
    s.add_argument("--video", default="")
    s.add_argument("--category", default="")
    s.add_argument("--tags", default="")
    s.add_argument("--note", default="")
    s.set_defaults(fn=cmd_add)

    s = sub.add_parser("relink", help="원본 URL 을 파트너스 링크로 일괄 변환")
    s.set_defaults(fn=cmd_relink)

    s = sub.add_parser("search", help="쿠팡 상품 검색")
    s.add_argument("--keyword", required=True)
    s.add_argument("--limit", type=int, default=10)
    s.set_defaults(fn=cmd_search)

    s = sub.add_parser("write", help="글 생성")
    s.add_argument("id")
    s.add_argument("--platform", default="threads")
    s.set_defaults(fn=cmd_write)

    s = sub.add_parser("write-all", help="글 없는 상품 전부 생성")
    s.add_argument("--platform", default="threads")
    s.add_argument("--force", action="store_true")
    s.set_defaults(fn=cmd_write_all)

    s = sub.add_parser("build", help="정적 사이트 생성")
    s.set_defaults(fn=cmd_build)

    s = sub.add_parser("serve", help="로컬 미리보기")
    s.add_argument("--port", type=int, default=8000)
    s.set_defaults(fn=cmd_serve)

    s = sub.add_parser("list", help="목록")
    s.set_defaults(fn=cmd_list)

    a = p.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
