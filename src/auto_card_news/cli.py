"""Command line entry point: link in, card-news images out."""

import argparse
import os
import sys

from dotenv import load_dotenv

from .renderer import render_cards
from .scraper import fetch_article
from .summarizer import summarize_to_cards


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="기사 링크를 카드뉴스 이미지로 자동 변환합니다."
    )
    parser.add_argument("url", help="카드뉴스로 만들 기사 URL")
    parser.add_argument(
        "-o", "--output", default="assets/output", help="이미지를 저장할 디렉터리"
    )
    parser.add_argument(
        "-n", "--num-cards", type=int, default=6, help="표지를 포함한 총 카드 수"
    )
    parser.add_argument(
        "-b", "--brand", default="auto_card_news", help="카드 하단에 표시할 브랜드명"
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    load_dotenv()

    args = build_parser().parse_args(argv)
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ANTHROPIC_API_KEY 환경 변수가 설정되어 있지 않습니다.", file=sys.stderr)
        return 1

    print(f"기사를 가져오는 중입니다: {args.url}")
    article = fetch_article(args.url)

    print("카드뉴스 내용을 요약하는 중입니다.")
    cards = summarize_to_cards(
        title=article.title,
        text=article.text,
        api_key=api_key,
        num_cards=args.num_cards,
    )

    print("카드 이미지를 생성하는 중입니다.")
    paths = render_cards(cards, args.output, brand=args.brand)

    print("완성된 카드뉴스 이미지")
    for path in paths:
        print(f"  - {path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
