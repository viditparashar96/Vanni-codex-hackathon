"""TTS factory. Phase 1: Cartesia (default) + OpenAI. ElevenLabs/Deepgram in Phase 4."""

from __future__ import annotations

import uuid

from loguru import logger

from engine.config import settings
from engine.contract import VoiceConfig

# A safe default Cartesia voice so a call works before a voice is chosen.
_DEFAULT_CARTESIA_VOICE = "71a7ad14-091c-4e8e-a314-022ece01c121"


def _cartesia_voice_id(configured: str | None) -> str:
    """Cartesia requires a UUID voice id. A friendly name (e.g. "Aria") from the
    builder isn't valid, so fall back to the default rather than 400 mid-call."""
    if configured:
        try:
            uuid.UUID(configured)
            return configured
        except ValueError:
            logger.warning(f"[tts] '{configured}' is not a Cartesia voice UUID — using default")
    return _DEFAULT_CARTESIA_VOICE


def create_tts_service(voice: VoiceConfig, keys: dict[str, str | None] | None = None):
    keys = keys or {}
    provider = voice.tts_provider

    if provider == "cartesia":
        from pipecat.services.cartesia.tts import CartesiaTTSService

        api_key = keys.get("cartesia") or settings.cartesia_api_key
        if not api_key:
            raise RuntimeError("CARTESIA_API_KEY missing (no org key, no platform default).")
        return CartesiaTTSService(
            api_key=api_key,
            voice_id=_cartesia_voice_id(voice.tts_voice),
            model=voice.tts_model or "sonic-3.5",
        )

    if provider == "openai":
        from pipecat.services.openai.tts import OpenAITTSService

        api_key = keys.get("openai") or settings.openai_api_key
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY missing for TTS.")
        return OpenAITTSService(api_key=api_key, voice=voice.tts_voice or "alloy")

    logger.warning(f"[tts] provider '{provider}' not wired yet (Phase 4); falling back to cartesia")
    return create_tts_service(voice.model_copy(update={"tts_provider": "cartesia"}), keys)
