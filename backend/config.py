"""
Central configuration — reads from .env via pydantic-settings.
Import `settings` everywhere instead of os.getenv directly.
"""

import logging
import secrets
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        protected_namespaces=("settings_",),  # silence model_ namespace warnings
    )

    # ── Gemini (primary LLM, via its OpenAI-compatible endpoint) ──────────────
    gemini_api_key: str = ""
    gemini_api_key_fallback: str = ""
    gemini_model: str = "gemini-2.5-flash-lite"

    # ── Fallback LLM providers ────────────────────────────────────────────────
    groq_api_key: str = ""
    model_groq_strong: str = "qwen/qwen3.8-27b"
    openrouter_api_key: str = ""
    model_openrouter_free: str = "qwen/qwen3.8-27b:free"

    # ── Database ──────────────────────────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://tripplanner:tripplanner123@localhost:5432/tripplanner_db"

    # ── Weaviate ──────────────────────────────────────────────────────────────
    weaviate_url: str = "http://localhost:8080"
    weaviate_api_key: str = ""

    # ── External APIs ─────────────────────────────────────────────────────────
    unsplash_access_key: str = ""

    # ── App ───────────────────────────────────────────────────────────────────
    app_env: str = "development"
    secret_key: str = ""
    allowed_origins: str = "http://localhost:3000"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if not s.secret_key:
        # Without a stable key, issued login tokens stop working after a restart.
        logger.warning("SECRET_KEY is not set — using a random key for this run.")
        s.secret_key = secrets.token_urlsafe(48)
    return s


settings = get_settings()
