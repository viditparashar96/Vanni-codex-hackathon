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

    if provider == "groq":
        from pipecat.services.groq.llm import GroqLLMService

        api_key = keys.get("groq") or settings.groq_api_key
        if not api_key:
            raise RuntimeError("GROQ_API_KEY missing.")
        return GroqLLMService(api_key=api_key, model=voice.llm_model or "llama-3.3-70b-versatile")

    if provider == "anthropic":
        from pipecat.services.anthropic.llm import AnthropicLLMService

        api_key = keys.get("anthropic") or settings.anthropic_api_key
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY missing.")
        return AnthropicLLMService(api_key=api_key, model=voice.llm_model or "claude-sonnet-4-5")

    if provider == "google":
        from pipecat.services.google.llm import GoogleLLMService

        api_key = keys.get("google") or settings.google_api_key
        if not api_key:
            raise RuntimeError("GOOGLE_API_KEY missing.")
        return GoogleLLMService(api_key=api_key, model=voice.llm_model or "gemini-2.0-flash")

    logger.warning(f"[llm] provider '{provider}' not recognized; falling back to openai")
    return create_llm_service(voice.model_copy(update={"llm_provider": "openai"}), keys)
