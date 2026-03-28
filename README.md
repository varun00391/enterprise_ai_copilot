# Enterprise AI Copilot

Internal RAG assistant: admins upload department-scoped company data; signed-in users chat with hybrid **dense + sparse** retrieval so answers stay grounded and keyword-heavy details are less likely to be missed.

## Features

- **Admin panel**: **batch upload** (many files at once per department), single-file upload still available, URL ingest, document library. Media uses **Groq vision** (images / video frames) and **Groq Whisper** (audio / video soundtrack).
- **User panel**: chat across **all ingested documents** anytime (optional department filter). Attach **image** (vision), **audio** (mic → record, then Whisper transcribe; or audio file), or **video** (Whisper + frame vision); text + attachments are merged into one grounded answer.
- **Hybrid RAG**: vector search (sentence-transformers + Chroma) plus BM25; results fused with **reciprocal rank fusion (RRF)** before answering.
- **Auth**: JWT; default admin `admin@gmail.com` / `admin123`; users can register and sign in.

## LLM and media (Groq)

**Recommended:** set `GROQ_API_KEY`. The app uses Groq’s OpenAI-compatible API for:

| Use | Env | Notes |
|-----|-----|--------|
| Chat answers | `GROQ_CHAT_MODEL` (default `llama-3.3-70b-versatile`) | Highest priority in `rag/llm.py` when `GROQ_API_KEY` is set |
| Images | `GROQ_VISION_MODEL` (default `meta-llama/llama-4-scout-17b-16e-instruct`) | Replaces Tesseract OCR |
| Audio | `GROQ_WHISPER_MODEL` (default `whisper-large-v3-turbo`) | Hosted Whisper on Groq, not a local Whisper install |
| Video | Whisper + `ffmpeg` frame samples + vision | Transcribes the audio track; vision describes up to 5 frames for on-screen text / slides |

**Why Whisper is “not local”:** Earlier versions used a **placeholder** for audio/video because no speech API was wired in. Transcription now uses **Groq’s Whisper API** (same API key as chat/vision).

**Fallbacks** (only if `GROQ_API_KEY` is unset): `OPENAI_API_KEY`, then `OLLAMA_BASE_URL`. If none are set, chat returns a short **demo** answer built from retrieved snippets.

## Local development

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# Video frame extraction: install ffmpeg (e.g. brew install ffmpeg on macOS)
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Set `GROQ_API_KEY` in the environment or a `.env` file in `backend/`.

API base: `http://127.0.0.1:8000` — OpenAPI docs: `http://127.0.0.1:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite dev server proxies `/api` to `http://127.0.0.1:8000` (see `frontend/vite.config.js`).

## Docker

From the repository root:

```bash
cp .env.example .env
# Edit .env: set GROQ_API_KEY (and SECRET_KEY for production)
docker compose up --build
```

- **Frontend + API gateway**: [http://localhost:8080](http://localhost:8080) — Nginx serves the React app and proxies `/api` to the backend.
- **Backend only (direct)**: [http://localhost:8000](http://localhost:8000)

Data (SQLite, uploads, Chroma, Hugging Face cache) persists in the `backend_data` Docker volume.

## Project layout

- `backend/` — FastAPI, SQLAlchemy, ingestion, Chroma, BM25, hybrid retrieval.
- `frontend/` — React, Tailwind CSS, admin and user UIs.
- `architecture.md` — system design and data flow.

## Security notes

Change `SECRET_KEY` and admin credentials in production. Use HTTPS and restrict CORS in real deployments.
