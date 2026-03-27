"""Groq vision (images/video frames) and Whisper (audio/video transcription). OpenAI-compatible HTTP API."""

from __future__ import annotations

import base64
import io
import mimetypes
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

import httpx
from PIL import Image

from app.config import get_settings

VISION_USER_PROMPT = (
    "Extract all readable text (OCR). Summarize charts, diagrams, slides, and on-screen UI. "
    "Output plain text suitable for search indexing. No preamble."
)
FRAME_USER_PROMPT = (
    "Describe visible text, slides, logos, and on-screen content. Be concise. Plain text only."
)


def _clean(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _jpeg_under_base64_limit(path: Path, max_b64_bytes: int = 3_800_000) -> str:
    """Resize/compress to stay under Groq's ~4MB base64 request limit."""
    img = Image.open(path).convert("RGB")
    quality = 88
    max_side = 2048
    for _ in range(14):
        w, h = img.size
        if max(w, h) > max_side:
            ratio = max_side / max(w, h)
            img = img.resize((int(w * ratio), int(h * ratio)), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=quality, optimize=True)
        raw = buf.getvalue()
        b64 = base64.b64encode(raw)
        if len(b64) <= max_b64_bytes:
            return f"data:image/jpeg;base64,{b64.decode('ascii')}"
        quality = max(55, quality - 6)
        max_side = max(512, int(max_side * 0.85))
    b64 = base64.b64encode(raw).decode("ascii")
    return f"data:image/jpeg;base64,{b64}"


def groq_chat_completions(
    messages: list[dict],
    model: str | None = None,
    temperature: float = 0.2,
    max_completion_tokens: int = 4096,
) -> str:
    settings = get_settings()
    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is not set")
    m = model or settings.groq_chat_model
    base = settings.groq_base_url.rstrip("/")
    with httpx.Client(timeout=180.0) as client:
        r = client.post(
            f"{base}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.groq_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": m,
                "messages": messages,
                "temperature": temperature,
                "max_completion_tokens": max_completion_tokens,
            },
        )
        r.raise_for_status()
        data = r.json()
        return (data["choices"][0]["message"]["content"] or "").strip()


def groq_vision_describe_image(path: Path) -> str:
    settings = get_settings()
    if not settings.groq_api_key:
        return (
            "[Set GROQ_API_KEY to extract image content with a Groq vision model. "
            "Tesseract OCR is not used.]"
        )
    data_url = _jpeg_under_base64_limit(path)
    content = groq_chat_completions(
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": VISION_USER_PROMPT},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            }
        ],
        model=settings.groq_vision_model,
        temperature=0.1,
        max_completion_tokens=2048,
    )
    return _clean(content)


def groq_vision_describe_frame(path: Path) -> str:
    settings = get_settings()
    data_url = _jpeg_under_base64_limit(path)
    return _clean(
        groq_chat_completions(
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": FRAME_USER_PROMPT},
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                }
            ],
            model=settings.groq_vision_model,
            temperature=0.1,
            max_completion_tokens=1024,
        )
    )


def groq_transcribe_file(path: Path) -> str:
    """Whisper transcription for audio or video (uses audio track for video)."""
    settings = get_settings()
    if not settings.groq_api_key:
        return ""
    base = settings.groq_base_url.rstrip("/")
    mime = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
    data = {
        "model": settings.groq_whisper_model,
        "response_format": "text",
    }
    content = path.read_bytes()
    files = {"file": (path.name, content, mime)}
    with httpx.Client(timeout=600.0) as client:
        r = client.post(
            f"{base}/audio/transcriptions",
            headers={"Authorization": f"Bearer {settings.groq_api_key}"},
            data=data,
            files=files,
        )
        r.raise_for_status()
        # response_format=text returns plain text body
        return _clean(r.text)


def _ffmpeg_extract_frames(video: Path, max_frames: int = 5) -> tuple[str, list[Path]]:
    tmp = tempfile.mkdtemp(prefix="ec_frames_")
    out_pattern = str(Path(tmp) / "frame_%03d.png")
    try:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(video),
                "-vf",
                "fps=1/15",
                "-frames:v",
                str(max_frames),
                out_pattern,
            ],
            check=True,
            capture_output=True,
            text=True,
        )
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        shutil.rmtree(tmp, ignore_errors=True)
        raise RuntimeError("ffmpeg frame extraction failed") from e
    frames = sorted(Path(tmp).glob("frame_*.png"))
    return tmp, frames


def groq_extract_video(path: Path) -> str:
    """Transcribe spoken audio via Groq Whisper + describe sampled frames via Groq vision."""
    settings = get_settings()
    if not settings.groq_api_key:
        return (
            "[Set GROQ_API_KEY to process video: Groq Whisper (speech) + Groq vision (frames).]"
        )

    sections: list[str] = []

    try:
        tx = groq_transcribe_file(path)
        if tx:
            sections.append("=== Transcription (Whisper on Groq) ===\n" + tx)
    except httpx.HTTPStatusError as e:
        sections.append(f"[Whisper transcription failed: {e.response.status_code}]")
    except Exception as e:  # noqa: BLE001
        sections.append(f"[Whisper transcription failed: {e}]")

    tmp_dir: str | None = None
    try:
        tmp_dir, frames = _ffmpeg_extract_frames(path, max_frames=5)
        if not frames:
            sections.append("[No video frames extracted; install ffmpeg for visual context.]")
        else:
            vis_parts: list[str] = []
            for i, fp in enumerate(frames, start=1):
                try:
                    vis_parts.append(f"--- Frame {i} ---\n{groq_vision_describe_frame(fp)}")
                except Exception as e:  # noqa: BLE001
                    vis_parts.append(f"--- Frame {i} ---\n[vision error: {e}]")
            sections.append("=== Visual context (Groq vision on frames) ===\n" + "\n\n".join(vis_parts))
    except RuntimeError as e:
        sections.append(str(e))
    finally:
        if tmp_dir:
            shutil.rmtree(tmp_dir, ignore_errors=True)

    return _clean("\n\n".join(sections))


def groq_extract_audio(path: Path) -> str:
    if not get_settings().groq_api_key:
        return (
            "[Set GROQ_API_KEY to transcribe audio with Groq Whisper. "
            "Previously this app used a placeholder instead of local Whisper.]"
        )
    try:
        return groq_transcribe_file(path)
    except httpx.HTTPStatusError as e:
        return _clean(f"[Whisper error {e.response.status_code}: {e.response.text[:500]}]")
    except Exception as e:  # noqa: BLE001
        return _clean(f"[Whisper error: {e}]")
