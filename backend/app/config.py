from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    secret_key: str = "change-me-in-production-use-long-random-string"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    database_url: str = "sqlite+aiosqlite:///./data/app.db"
    upload_dir: Path = Path("./data/uploads")
    chroma_dir: Path = Path("./data/chroma")

    groq_api_key: str | None = None
    groq_base_url: str = "https://api.groq.com/openai/v1"
    groq_chat_model: str = "llama-3.3-70b-versatile"
    groq_vision_model: str = "meta-llama/llama-4-scout-17b-16e-instruct"
    groq_whisper_model: str = "whisper-large-v3-turbo"

    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    ollama_base_url: str | None = None
    ollama_model: str = "llama3.2"

    embedding_model: str = "all-MiniLM-L6-v2"
    chunk_size: int = 800
    chunk_overlap: int = 120
    dense_top_k: int = 12
    sparse_top_k: int = 12
    hybrid_top_k: int = 8
    rrf_k: int = 60


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    Path("./data").mkdir(parents=True, exist_ok=True)
    s.upload_dir.mkdir(parents=True, exist_ok=True)
    s.chroma_dir.mkdir(parents=True, exist_ok=True)
    return s
