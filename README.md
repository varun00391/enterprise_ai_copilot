# Enterprise AI Copilot

Internal RAG assistant: admins upload documents into **one shared knowledge base**; users chat with **hybrid dense + sparse** retrieval.

## Features

- **Admin**: batch or single upload (**PDF, Word, Excel, PowerPoint, TXT, CSV, MD**). **URL ingest**. **Image, audio, and video files are not ingested** (rejected with a clear error). All accepted content is chunked and indexed for RAG.
- **Users**: text chat over the full corpus (no department filters in the UI).
- **Hybrid RAG**: Chroma + sentence-transformers (dense) and BM25 (sparse), fused with RRF before the LLM answers.
- **Auth**: JWT; default admin `admin@gmail.com` / `admin123`; registration for normal users.

## LLM (Groq)

Set `GROQ_API_KEY` (see `.env.example`). Fallbacks: `OPENAI_API_KEY`, `OLLAMA_BASE_URL`.

## Local development

**Backend**

```bash
cd backend && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Frontend**

```bash
cd frontend && npm install && npm run dev
```

## Docker

```bash
cp .env.example .env
docker compose up --build
```

UI: http://localhost:8080 · API: http://localhost:8000/docs

## Security

Change `SECRET_KEY` and default admin in production; use HTTPS and tighten CORS when deployed.
