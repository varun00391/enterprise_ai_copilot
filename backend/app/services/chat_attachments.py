"""Build chat query text from optional image / audio / video using Groq vision + Whisper (thread offload)."""

from __future__ import annotations

import asyncio
import os
import tempfile
from pathlib import Path

from fastapi import UploadFile

from app.services.groq_media import (
    groq_extract_video,
    groq_transcribe_file,
    groq_vision_describe_image,
)

MAX_CHAT_ATTACHMENT_BYTES = 25 * 1024 * 1024


def _unlink(paths: list[Path]) -> None:
    for p in paths:
        try:
            p.unlink(missing_ok=True)
        except OSError:
            pass


def _bytes_to_temp(data: bytes, suffix: str) -> Path:
    if len(data) > MAX_CHAT_ATTACHMENT_BYTES:
        raise ValueError("Attachment exceeds 25MB limit.")
    fd, path = tempfile.mkstemp(suffix=suffix)
    os.close(fd)
    p = Path(path)
    p.write_bytes(data)
    return p


async def augment_message_from_uploads(
    base_message: str,
    image: UploadFile | None,
    audio: UploadFile | None,
    video: UploadFile | None,
) -> str:
    parts: list[str] = []
    if base_message and base_message.strip():
        parts.append(base_message.strip())

    tmp_paths: list[Path] = []
    try:
        if image is not None and (image.filename or image.content_type):
            raw = await image.read()
            if raw:
                suf = Path(image.filename or "img").suffix.lower()
                if suf not in {".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".tif", ".tiff"}:
                    suf = ".png"
                p = _bytes_to_temp(raw, suf)
                tmp_paths.append(p)
                desc = await asyncio.to_thread(groq_vision_describe_image, p)
                parts.append(f"[Attached image — vision model]\n{desc}")

        if audio is not None and (audio.filename or audio.content_type):
            raw = await audio.read()
            if raw:
                suf = Path(audio.filename or "audio").suffix.lower() or ".webm"
                p = _bytes_to_temp(raw, suf)
                tmp_paths.append(p)
                tx = await asyncio.to_thread(groq_transcribe_file, p)
                parts.append(
                    f"[Attached audio — Whisper transcription]\n{tx or '(no speech detected)'}"
                )

        if video is not None and (video.filename or video.content_type):
            raw = await video.read()
            if raw:
                suf = Path(video.filename or "video").suffix.lower() or ".mp4"
                p = _bytes_to_temp(raw, suf)
                tmp_paths.append(p)
                vtext = await asyncio.to_thread(groq_extract_video, p)
                parts.append(f"[Attached video — Whisper + vision on frames]\n{vtext}")
    finally:
        _unlink(tmp_paths)

    if not parts:
        raise ValueError("Send a text message or attach an image, audio, or video.")

    full = "\n\n".join(parts)
    if len(full) > 16000:
        full = full[:16000] + "\n\n…(truncated for context length)"
    return full
