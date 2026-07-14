"""LLM factory. Phase 1: OpenAI. Anthropic/Google/Groq land in Phase 4."""

from __future__ import annotations

from loguru import logger

from engine.config import settings
from engine.contract import VoiceConfig


def create_llm_service(voice: VoiceConfig, keys: dict[str, str | None] | None = None):
    keys = keys or {}
    provider = voice.llm_provider

    if provider == "openai":
        from pipecat.services.openai.llm import OpenAILLMService

        api_key = keys.get("openai") or settings.openai_api_key
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY missing (no org key, no platform default).")
        return OpenAILLMService(api_key=api_key, model=voice.llm_model or "gpt-4.1-mini")

    logger.warning(f"[llm] provider '{provider}' not wired yet (Phase 4); falling back to openai")
    return create_llm_service(voice.model_copy(update={"llm_provider": "openai"}), keys)
