"""Claude 로 제품 홍보 글을 만든다.

플랫폼별로 길이와 톤이 다르다.
  threads   : 짧고 대화체. 해시태그 3개 이내
  instagram : 릴스 캡션. 첫 줄 훅 + 해시태그 10개 내외
  blog      : 검색 노출용 800자 내외. 소제목 포함
"""
from __future__ import annotations

import os
from typing import Any

import anthropic

from store import DISCLOSURE

MODEL = os.environ.get("WRITER_MODEL", "claude-opus-5")

PLATFORMS = {
    "threads": (
        "스레드(Threads) 게시글. 300자 이내. 친구한테 말하듯 반말 섞인 대화체. "
        "첫 문장에서 왜 이걸 샀는지 또는 어떤 불편이 해결됐는지로 시작. "
        "해시태그는 마지막 줄에 최대 3개."
    ),
    "instagram": (
        "인스타그램 릴스 캡션. 첫 줄은 스크롤을 멈추게 하는 한 줄 훅. "
        "본문 3~5줄로 핵심 장점과 실제 사용 느낌. 줄바꿈 자주. "
        "마지막에 해시태그 8~12개."
    ),
    "blog": (
        "네이버 블로그 후기 글. 700~1000자. 소제목 2~3개 사용. "
        "제목도 첫 줄에 별도로 제안. 검색 키워드가 제목과 첫 문단에 자연스럽게 들어가게. "
        "장점만 나열하지 말고 아쉬운 점 하나를 솔직하게 포함."
    ),
}

SYSTEM = (
    "너는 쿠팡 파트너스로 수익을 내는 한국인 크리에이터의 글을 대신 쓰는 작가다. "
    "과장 광고 표현(최고 1위 무조건 등)을 쓰지 않는다. "
    "제품을 직접 촬영한 영상과 함께 올릴 글이므로 영상에서 보이는 장면을 언급하듯 쓴다. "
    "쉼표를 쓰지 않는다. 문장을 짧게 끊는다. "
    "출력에는 글 본문만 넣고 설명이나 머리말은 넣지 않는다."
)


def _client() -> anthropic.Anthropic:
    return anthropic.Anthropic()


def write_post(product: dict[str, Any], platform: str) -> str:
    if platform not in PLATFORMS:
        raise ValueError(f"지원 안 하는 플랫폼: {platform} (가능: {', '.join(PLATFORMS)})")

    tags = " ".join(f"#{t}" for t in product.get("tags", []))
    prompt = (
        f"[플랫폼 요구사항]\n{PLATFORMS[platform]}\n\n"
        f"[제품]\n제목: {product['title']}\n"
        f"카테고리: {product.get('category', '')}\n"
        f"태그: {tags}\n"
        f"메모: {product.get('note', '') or '없음'}\n\n"
        "위 제품에 대한 글을 써라."
    )

    client = _client()
    response = client.beta.messages.create(
        model=MODEL,
        max_tokens=4000,
        system=SYSTEM,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        output_config={"effort": "medium"},
        messages=[{"role": "user", "content": prompt}],
    )
    if response.stop_reason == "refusal":
        raise RuntimeError("Claude 가 이 요청을 거절했다")

    text = "".join(block.text for block in response.content if block.type == "text").strip()
    return f"{text}\n\n{DISCLOSURE}"
