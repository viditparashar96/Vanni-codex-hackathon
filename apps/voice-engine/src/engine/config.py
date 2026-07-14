"""Engine settings — env only. Per-agent config NEVER comes from here; it comes
from the dispatch payload. This holds only process-level config and the
platform-default provider keys (org BYO keys override these per call)."""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Where the engine POSTs end-of-call reports / event batches (cluster-internal).
    platform_api_url: str = "http://localhost:4000"

    port: int = 7860

    # Platform-default provider keys. Org BYO keys arrive in the dispatch payload
    # and take precedence at runtime.
    openai_api_key: str | None = None
    deepgram_api_key: str | None = None
    cartesia_api_key: str | None = None
    elevenlabs_api_key: str | None = None
    anthropic_api_key: str | None = None
    google_api_key: str | None = None
    groq_api_key: str | None = None
    assemblyai_api_key: str | None = None
    azure_speech_key: str | None = None
    azure_speech_region: str | None = None

    # Knowledge base retrieval (Phase 4).
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str | None = None


settings = Settings()
