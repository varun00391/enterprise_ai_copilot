from __future__ import annotations

import json

import httpx

from app.config import get_settings


SYSTEM = (
    "You are an enterprise assistant. Use both of the following when answering:\n"
    "1) The user's message — it may include text produced by vision models (attached images), "
    "Whisper transcription (attached audio), or video (transcript + frame descriptions). "
    "If the user asks about what is in an attachment, answer from that attachment text.\n"
    "2) Retrieved knowledge-base snippets from the company corpus — use them for policy, HR, docs, etc.\n"
    "If neither the user message nor the knowledge base supports an answer, say you do not have that information. "
    "Be concise; cite snippet labels when helpful."
)


async def generate_answer(query: str, contexts: list[dict]) -> str:
    settings = get_settings()
    ctx_blocks = []
    for i, c in enumerate(contexts, 1):
        name = c.get("filename", "document")
        ctx_blocks.append(f"[KB {i}] ({name})\n{c.get('text', '')}")
    context_str = "\n\n".join(ctx_blocks) if ctx_blocks else "(no matching documents retrieved)"

    user_msg = (
        f"User message (includes any attachment-derived vision / transcript / video text):\n{query}\n\n"
        f"Retrieved knowledge-base snippets:\n{context_str}"
    )

    if settings.groq_api_key:
        return await _groq_chat(user_msg)
    if settings.openai_api_key:
        return await _openai_chat(user_msg)
    if settings.ollama_base_url:
        return await _ollama_chat(user_msg)
    return _fallback_answer(query, contexts)


async def _groq_chat(user_msg: str) -> str:
    settings = get_settings()
    base = settings.groq_base_url.rstrip("/")
    async with httpx.AsyncClient(timeout=180.0) as client:
        r = await client.post(
            f"{base}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.groq_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.groq_chat_model,
                "messages": [
                    {"role": "system", "content": SYSTEM},
                    {"role": "user", "content": user_msg},
                ],
                "temperature": 0.2,
            },
        )
        r.raise_for_status()
        data = r.json()
        return data["choices"][0]["message"]["content"].strip()


async def _openai_chat(user_msg: str) -> str:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.openai_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.openai_model,
                "messages": [
                    {"role": "system", "content": SYSTEM},
                    {"role": "user", "content": user_msg},
                ],
                "temperature": 0.2,
            },
        )
        r.raise_for_status()
        data = r.json()
        return data["choices"][0]["message"]["content"].strip()


async def _ollama_chat(user_msg: str) -> str:
    settings = get_settings()
    base = settings.ollama_base_url.rstrip("/")
    async with httpx.AsyncClient(timeout=180.0) as client:
        r = await client.post(
            f"{base}/api/chat",
            json={
                "model": settings.ollama_model,
                "messages": [
                    {"role": "system", "content": SYSTEM},
                    {"role": "user", "content": user_msg},
                ],
                "stream": False,
            },
        )
        r.raise_for_status()
        data = r.json()
        return (data.get("message") or {}).get("content", "").strip() or json.dumps(data)


def _fallback_answer(query: str, contexts: list[dict]) -> str:
    if not contexts:
        return (
            "No LLM is configured (set GROQ_API_KEY, or OPENAI_API_KEY, or OLLAMA_BASE_URL). "
            "No matching context was found in the knowledge base for your question."
        )
    parts = [f"— From {c.get('filename', 'doc')}: {c.get('text', '')[:500]}" for c in contexts[:5]]
    return (
        "[Demo mode: set GROQ_API_KEY (recommended), or OPENAI_API_KEY, or OLLAMA_BASE_URL.]\n\n"
        + "\n\n".join(parts)
    )
