"""Pipeline metrics collection for the end-of-call report.

A single :class:`CallMetricsObserver` is attached to the pipeline worker. It
listens to pushed frames and accumulates the raw numbers the report needs:

* LLM token usage (input / cached-input / output) from ``LLMUsageMetricsData``.
* TTS characters from ``TTSUsageMetricsData``.
* STT audio seconds, summed from user speaking spans
  (``UserStartedSpeakingFrame`` → ``UserStoppedSpeakingFrame``).
* Barge-in interruptions, counted from ``InterruptionFrame``.
* Voice-to-voice latency samples: wall-clock from the user stopping speaking to
  the bot starting to speak, reduced to p50 / p95 at report time.

Metrics/system frames cross several processor boundaries and are observed once
per boundary, so every frame is de-duplicated by ``frame.id`` before it counts.
Pricing is deliberately NOT computed here — the report carries raw usage and
the platform API turns it into cost.
"""

from __future__ import annotations

import time

from loguru import logger
from pipecat.frames.frames import (
    BotStartedSpeakingFrame,
    InterruptionFrame,
    MetricsFrame,
    UserStartedSpeakingFrame,
    UserStoppedSpeakingFrame,
)
from pipecat.metrics.metrics import (
    LLMUsageMetricsData,
    TTSUsageMetricsData,
)
from pipecat.observers.base_observer import BaseObserver, FramePushed


def _percentile(samples: list[float], pct: float) -> float:
    """Nearest-rank percentile over a copy of ``samples`` (assumed non-empty)."""
    ordered = sorted(samples)
    k = max(0, min(len(ordered) - 1, round((pct / 100.0) * (len(ordered) - 1))))
    return ordered[k]


class CallMetricsObserver(BaseObserver):
    """Accumulates usage + latency numbers for one call."""

    def __init__(self) -> None:
        super().__init__()
        self._seen_frame_ids: set[int] = set()

        # LLM token usage.
        self.llm_input_tokens: int = 0
        self.llm_cached_input_tokens: int = 0
        self.llm_output_tokens: int = 0
        self.llm_model: str | None = None

        # TTS.
        self.tts_characters: int = 0
        self.tts_model: str | None = None

        # STT audio seconds (summed user speaking spans).
        self.stt_seconds: float = 0.0
        self._user_speech_started_at: float | None = None

        # Interruptions (user barge-in).
        self.interruptions: int = 0

        # Voice-to-voice latency samples (seconds).
        self.v2v_latencies: list[float] = []
        self._user_stopped_at: float | None = None

    async def on_push_frame(self, data: FramePushed) -> None:
        frame = data.frame

        # De-duplicate: the same frame is pushed across many boundaries.
        fid = getattr(frame, "id", None)
        if fid is not None:
            if fid in self._seen_frame_ids:
                return
            self._seen_frame_ids.add(fid)

        if isinstance(frame, MetricsFrame):
            self._handle_metrics(frame)
        elif isinstance(frame, UserStartedSpeakingFrame):
            self._user_speech_started_at = time.monotonic()
        elif isinstance(frame, UserStoppedSpeakingFrame):
            now = time.monotonic()
            if self._user_speech_started_at is not None:
                self.stt_seconds += max(0.0, now - self._user_speech_started_at)
                self._user_speech_started_at = None
            # Arm the voice-to-voice timer: waiting for the bot to respond.
            self._user_stopped_at = now
        elif isinstance(frame, BotStartedSpeakingFrame):
            if self._user_stopped_at is not None:
                self.v2v_latencies.append(max(0.0, time.monotonic() - self._user_stopped_at))
                self._user_stopped_at = None
        elif isinstance(frame, InterruptionFrame):
            self.interruptions += 1

    def _handle_metrics(self, frame: MetricsFrame) -> None:
        for md in frame.data:
            if isinstance(md, LLMUsageMetricsData):
                usage = md.value
                self.llm_input_tokens += getattr(usage, "prompt_tokens", 0) or 0
                self.llm_output_tokens += getattr(usage, "completion_tokens", 0) or 0
                self.llm_cached_input_tokens += getattr(usage, "cache_read_input_tokens", 0) or 0
                if md.model:
                    self.llm_model = md.model
            elif isinstance(md, TTSUsageMetricsData):
                self.tts_characters += md.value or 0
                if md.model:
                    self.tts_model = md.model

    # ── Report-time reducers ─────────────────────────────────────────────────

    def voice_to_voice_p50_ms(self) -> int | None:
        if not self.v2v_latencies:
            return None
        return round(_percentile(self.v2v_latencies, 50) * 1000)

    def voice_to_voice_p95_ms(self) -> int | None:
        if not self.v2v_latencies:
            return None
        return round(_percentile(self.v2v_latencies, 95) * 1000)

    def log_summary(self, call_id: str) -> None:
        logger.info(
            f"[metrics {call_id}] llm_in={self.llm_input_tokens} "
            f"llm_out={self.llm_output_tokens} llm_cached={self.llm_cached_input_tokens} "
            f"tts_chars={self.tts_characters} stt_secs={round(self.stt_seconds, 2)} "
            f"interruptions={self.interruptions} v2v_samples={len(self.v2v_latencies)}"
        )
