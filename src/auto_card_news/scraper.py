"""Fetch an article URL and extract its title and body text."""

from dataclasses import dataclass

import requests
from bs4 import BeautifulSoup

USER_AGENT = (
    "Mozilla/5.0 (compatible; auto-card-news/0.1; "
    "+https://github.com/my0z/usb.new)"
)


@dataclass
class Article:
    url: str
    title: str
    text: str


def fetch_article(url: str, timeout: int = 15) -> Article:
    response = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=timeout)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "lxml")

    for tag in soup(["script", "style", "nav", "header", "footer", "aside", "form"]):
        tag.decompose()

    title = _extract_title(soup)
    text = _extract_body_text(soup)

    if not text:
        raise ValueError("본문을 추출하지 못했습니다. 다른 링크를 사용해 주세요.")

    return Article(url=url, title=title, text=text)


def _extract_title(soup: BeautifulSoup) -> str:
    og_title = soup.find("meta", property="og:title")
    if og_title and og_title.get("content"):
        return og_title["content"].strip()

    if soup.title and soup.title.string:
        return soup.title.string.strip()

    h1 = soup.find("h1")
    if h1:
        return h1.get_text(strip=True)

    return "제목 없음"


def _extract_body_text(soup: BeautifulSoup) -> str:
    article_tag = soup.find("article")
    container = article_tag if article_tag else soup

    paragraphs = [p.get_text(" ", strip=True) for p in container.find_all("p")]
    paragraphs = [p for p in paragraphs if len(p) > 20]

    return "\n".join(paragraphs)
