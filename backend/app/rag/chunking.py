from __future__ import annotations

import re

from app.config import get_settings


def split_text(text: str) -> list[str]:
    settings = get_settings()
    size = settings.chunk_size
    overlap = settings.chunk_overlap
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []
    if len(text) <= size:
        return [text]
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + size, len(text))
        chunk = text[start:end]
        chunks.append(chunk.strip())
        if end >= len(text):
            break
        start = end - overlap
        if start < 0:
            start = 0
    return [c for c in chunks if c]
