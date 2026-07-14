"""Per-node service-switching actions for the flow runtime.

Each flow node may override the pipeline's LLM/TTS/STT settings for the duration
of that node. The pipeline keeps ONE instance of each service; a node "switches"
a service by pushing an update-settings frame on entry (as a Flows pre-action),
and the next node's own settings implicitly revert it.

These handlers are registered on a ``FlowManager`` via :func:`register_flow_actions`
and referenced by ``{"type": <action>, ...}`` entries the loader emits from a
node's ``serviceOverrides``. The action-handler contract is Pipecat Flows'
modern form: ``async def handler(action: dict, flow_manager) -> None``.

The built-in ``tts_say``, ``end_conversation`` and ``function`` actions are
provided by Flows itself and are NOT registered here.
"""

from __future__ import annotations

from typing import Any

from loguru import logger
from pipecat.frames.frames import (
    LLMUpdateSettingsFrame,
    STTMuteFrame,
    STTUpdateSettingsFrame,
    TTSUpdateSettingsFrame,
)


async def handle_switch_llm_settings(action: dict[str, Any], flow_manager: Any) -> None:
    settings: dict[str, Any] = {}
    if action.get("model") is not None:
        settings["model"] = action["model"]
    if action.get("temperature") is not None:
        settings["temperature"] = action["temperature"]
    if settings:
        logger.info(f"[flow] switch LLM settings: {settings}")
        await flow_manager.worker.queue_frame(LLMUpdateSettingsFrame(settings=settings))


async def handle_switch_tts_voice(action: dict[str, Any], flow_manager: Any) -> None:
    settings: dict[str, Any] = {}
    if action.get("voice") is not None:
        settings["voice"] = action["voice"]
    if action.get("model") is not None:
        settings["model"] = action["model"]
    if settings:
        logger.info(f"[flow] switch TTS settings: {settings}")
        await flow_manager.worker.queue_frame(TTSUpdateSettingsFrame(settings=settings))


async def handle_switch_tts_speed(action: dict[str, Any], flow_manager: Any) -> None:
    """Set the TTS voice speed for the current node.

    Cartesia expects a ``GenerationConfig``; degrade gracefully if that provider
    isn't installed rather than crashing the transition."""
    speed = float(action.get("speed", 1.0))
    logger.info(f"[flow] switch TTS speed: {speed}")
    try:
        from pipecat.services.cartesia.tts import GenerationConfig

        await flow_manager.worker.queue_frame(
            TTSUpdateSettingsFrame(settings={"generation_config": GenerationConfig(speed=speed)})
        )
    except ImportError:
        logger.warning("[flow] Cartesia TTS not available — cannot set voice speed")


async def handle_switch_stt_settings(action: dict[str, Any], flow_manager: Any) -> None:
    settings: dict[str, Any] = {}
    if action.get("model") is not None:
        settings["model"] = action["model"]
    if action.get("language") is not None:
        settings["language"] = action["language"]
    if settings:
        logger.info(f"[flow] switch STT settings: {settings}")
        await flow_manager.worker.queue_frame(STTUpdateSettingsFrame(settings=settings))


async def handle_stt_mute(action: dict[str, Any], flow_manager: Any) -> None:
    """Hard-mute transcription for an agent-only monologue node."""
    mute = bool(action.get("mute", True))
    logger.info(f"[flow] {'muting' if mute else 'unmuting'} STT")
    await flow_manager.worker.queue_frame(STTMuteFrame(mute=mute))


ACTION_HANDLERS: dict[str, Any] = {
    "switch_llm_settings": handle_switch_llm_settings,
    "switch_tts_voice": handle_switch_tts_voice,
    "switch_tts_speed": handle_switch_tts_speed,
    "switch_stt_settings": handle_switch_stt_settings,
    "stt_mute": handle_stt_mute,
}


def register_flow_actions(flow_manager: Any) -> None:
    """Register all service-switch action handlers on a FlowManager."""
    for action_type, handler in ACTION_HANDLERS.items():
        flow_manager.register_action(action_type, handler)
    logger.debug(f"[flow] registered {len(ACTION_HANDLERS)} service-switch actions")
