"""Sends signal alerts to a Telegram chat. Logs only if credentials are missing."""
import logging

import requests

import config

logger = logging.getLogger("telegram_notifier")

API_URL = "https://api.telegram.org/bot{token}/sendMessage"


def send(text):
    if not config.TELEGRAM_BOT_TOKEN or not config.TELEGRAM_CHAT_ID:
        logger.warning("Telegram not configured, alert not sent: %s", text)
        return
    url = API_URL.format(token=config.TELEGRAM_BOT_TOKEN)
    payload = {"chat_id": config.TELEGRAM_CHAT_ID, "text": text}
    response = requests.post(url, json=payload, timeout=5)
    if response.status_code != 200:
        logger.error("Telegram send failed: %s %s", response.status_code, response.text)
