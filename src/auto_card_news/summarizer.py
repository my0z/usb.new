"""Summarize article text into a card-news structure using Claude."""

import json
from dataclasses import dataclass

import anthropic

DEFAULT_MODEL = "claude-sonnet-5"

SYSTEM_PROMPT = (
    "당신은 카드뉴스 에디터입니다. 주어진 기사 본문을 읽고 "
    "인스타그램 카드뉴스용 슬라이드 구성을 JSON으로만 출력하세요. "
    "다른 설명 문장은 출력하지 마세요."
)

USER_PROMPT_TEMPLATE = """다음 기사를 카드뉴스 {num_cards}장으로 요약해 주세요.

기사 제목: {title}

기사 본문:
{text}

출력 형식은 아래 JSON 스키마를 따르세요.
{{
  "cards": [
    {{"heading": "슬라이드 소제목", "bullets": ["핵심 문장 1", "핵심 문장 2"]}}
  ]
}}

규칙:
- 첫 번째 카드는 표지 역할로 heading에 전체 제목을 넣고 bullets는 빈 배열로 둡니다.
- 이후 카드는 heading에 짧은 소제목을, bullets에 1~3개의 핵심 문장을 담습니다.
- 각 bullet 문장은 40자 이내로 간결하게 작성합니다.
- 총 카드 수는 {num_cards}장을 맞춥니다.
"""


@dataclass
class Card:
    heading: str
    bullets: list[str]


def summarize_to_cards(
    title: str,
    text: str,
    api_key: str,
    num_cards: int = 6,
    model: str = DEFAULT_MODEL,
) -> list[Card]:
    client = anthropic.Anthropic(api_key=api_key)

    message = client.messages.create(
        model=model,
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": USER_PROMPT_TEMPLATE.format(
                    num_cards=num_cards, title=title, text=text[:8000]
                ),
            }
        ],
    )

    raw = "".join(block.text for block in message.content if block.type == "text")
    data = _parse_json(raw)

    return [Card(heading=c["heading"], bullets=c.get("bullets", [])) for c in data["cards"]]


def _parse_json(raw: str) -> dict:
    raw = raw.strip()
    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"모델 응답에서 JSON을 찾지 못했습니다: {raw[:200]}")
    return json.loads(raw[start : end + 1])
