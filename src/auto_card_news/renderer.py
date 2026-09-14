"""Render summarized cards into card-news PNG images."""

import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from .summarizer import Card

CARD_WIDTH = 1080
CARD_HEIGHT = 1350
MARGIN = 90

FONT_DIR = Path(__file__).resolve().parent.parent.parent / "fonts"
FONT_REGULAR = FONT_DIR / "NanumGothic-Regular.ttf"
FONT_BOLD = FONT_DIR / "NanumGothic-Bold.ttf"
FONT_EXTRABOLD = FONT_DIR / "NanumGothic-ExtraBold.ttf"

COVER_BG = (76, 52, 235)
COVER_FG = (255, 255, 255)
CONTENT_BG = (255, 255, 255)
CONTENT_HEADING_FG = (76, 52, 235)
CONTENT_BODY_FG = (35, 35, 40)
BADGE_BG = (235, 232, 254)


def render_cards(
    cards: list[Card],
    output_dir: str,
    brand: str = "auto_card_news",
    file_prefix: str = "card",
) -> list[str]:
    os.makedirs(output_dir, exist_ok=True)
    paths = []

    for index, card in enumerate(cards):
        image = _render_cover(card, brand) if index == 0 else _render_content(
            card, index, len(cards), brand
        )
        path = os.path.join(output_dir, f"{file_prefix}_{index + 1:02d}.png")
        image.save(path)
        paths.append(path)

    return paths


def _render_cover(card: Card, brand: str) -> Image.Image:
    image = Image.new("RGB", (CARD_WIDTH, CARD_HEIGHT), COVER_BG)
    draw = ImageDraw.Draw(image)

    title_font = ImageFont.truetype(str(FONT_EXTRABOLD), 68)
    brand_font = ImageFont.truetype(str(FONT_BOLD), 32)

    lines = _wrap_text(draw, card.heading, title_font, CARD_WIDTH - 2 * MARGIN)
    line_height = title_font.getbbox("가")[3] + 20
    total_height = line_height * len(lines)
    y = (CARD_HEIGHT - total_height) // 2

    for line in lines:
        width = draw.textlength(line, font=title_font)
        x = (CARD_WIDTH - width) // 2
        draw.text((x, y), line, font=title_font, fill=COVER_FG)
        y += line_height

    draw.text((MARGIN, CARD_HEIGHT - MARGIN - 32), brand, font=brand_font, fill=COVER_FG)

    return image


def _render_content(card: Card, index: int, total: int, brand: str) -> Image.Image:
    image = Image.new("RGB", (CARD_WIDTH, CARD_HEIGHT), CONTENT_BG)
    draw = ImageDraw.Draw(image)

    badge_font = ImageFont.truetype(str(FONT_BOLD), 30)
    heading_font = ImageFont.truetype(str(FONT_EXTRABOLD), 54)
    body_font = ImageFont.truetype(str(FONT_REGULAR), 40)
    footer_font = ImageFont.truetype(str(FONT_BOLD), 28)

    badge_text = f"{index:02d}"
    badge_size = 80
    badge_x, badge_y = MARGIN, MARGIN
    draw.ellipse(
        (badge_x, badge_y, badge_x + badge_size, badge_y + badge_size), fill=BADGE_BG
    )
    bbox = draw.textbbox((0, 0), badge_text, font=badge_font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(
        (badge_x + (badge_size - tw) / 2, badge_y + (badge_size - th) / 2 - bbox[1]),
        badge_text,
        font=badge_font,
        fill=CONTENT_HEADING_FG,
    )

    y = badge_y + badge_size + 50
    heading_lines = _wrap_text(draw, card.heading, heading_font, CARD_WIDTH - 2 * MARGIN)
    line_height = heading_font.getbbox("가")[3] + 16
    for line in heading_lines:
        draw.text((MARGIN, y), line, font=heading_font, fill=CONTENT_HEADING_FG)
        y += line_height

    y += 30
    body_line_height = body_font.getbbox("가")[3] + 24
    for bullet in card.bullets:
        draw.ellipse((MARGIN, y + 16, MARGIN + 12, y + 28), fill=CONTENT_HEADING_FG)
        bullet_lines = _wrap_text(
            draw, bullet, body_font, CARD_WIDTH - 2 * MARGIN - 36
        )
        for i, line in enumerate(bullet_lines):
            x = MARGIN + 36
            draw.text((x, y), line, font=body_font, fill=CONTENT_BODY_FG)
            y += body_line_height
        y += 16

    footer_text = f"{brand}  ·  {index}/{total - 1}"
    draw.text(
        (MARGIN, CARD_HEIGHT - MARGIN - 28),
        footer_text,
        font=footer_font,
        fill=(150, 150, 160),
    )

    return image


def _wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split(" ")
    lines: list[str] = []
    current = ""

    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textlength(candidate, font=font) <= max_width:
            current = candidate
            continue

        if current:
            lines.append(current)
            current = ""

        while draw.textlength(word, font=font) > max_width and len(word) > 1:
            cut = len(word)
            while cut > 1 and draw.textlength(word[:cut], font=font) > max_width:
                cut -= 1
            lines.append(word[:cut])
            word = word[cut:]

        current = word

    if current:
        lines.append(current)

    return lines or [""]
