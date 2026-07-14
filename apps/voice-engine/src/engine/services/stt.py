"""STT factory. Phase 1: Deepgram (default) + OpenAI Whisper. Others land in Phase 4."""

from __future__ import annotations

from loguru import logger

from engine.config import settings
from engine.contract import VoiceConfig


def create_stt_service(voice: VoiceConfig, keys: dict[str, str | None] | None = None):
    keys = keys or {}
    provider = voice.stt_provider
    language = voice.stt_language or voice.language

    if provider == "deepgram":
        from pipecat.services.deepgram.stt import DeepgramSTTService, LiveOptions

        api_key = keys.get("deepgram") or settings.deepgram_api_key
        if not api_key:
            raise RuntimeError("DEEPGRAM_API_KEY missing (no org key, no platform default).")
        return DeepgramSTTService(
            api_key=api_key,
            live_options=LiveOptions(
                model=voice.stt_model or "nova-3-general",
                language=language,
            ),
        )

    if provider == "openai":
        from pipecat.services.openai.stt import OpenAISTTService

        api_key = keys.get("openai") or settings.openai_api_key
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY missing for STT.")
        return OpenAISTTService(api_key=api_key, model=voice.stt_model or "whisper-1")

    logger.warning(f"[stt] provider '{provider}' not wired yet (Phase 4); falling back to deepgram")
    return create_stt_service(voice.model_copy(update={"stt_provider": "deepgram"}), keys)
