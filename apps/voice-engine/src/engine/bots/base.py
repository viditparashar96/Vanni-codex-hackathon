"""Simple-agent pipeline (Phase 1 walking skeleton + tool calling).

Builds STT -> LLM -> TTS over a SmallWebRTC transport, runs it until the client
disconnects, then produces the MANDATORY end-of-call report.

On top of the walking skeleton this module wires the ``advancedConfig`` runtime
behaviours:

* Custom HTTP tools + a built-in ``end_call`` (see ``engine.tools``) so the LLM
  can act during the call and hang up gracefully.
* ``inactivityTimeoutSecs`` — end the call (with goodbye) after user silence.
* ``maxCallDurationSecs`` — a hard wall-clock cap on the call.
* ``gracefulExitEnabled`` / ``goodbyeMessage`` — speak a goodbye before ending
  on any of the above paths (tool, inactivity, max-duration).
* ``silenceWhenAgentSpeaks`` / ``silenceDuringIntro`` — user-mute strategies that
  disable barge-in while the agent talks.
* ``backgroundNoise`` — mix ambient audio under the agent (skipped gracefully if
  no ambience asset is bundled).
"""

from __future__ import annotations

import asyncio
import pathlib
import time
from typing import Awaitable, Callable

from loguru import logger
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.frames.frames import LLMRunFrame, TTSSpeakFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.worker import PipelineParams, PipelineWorker
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)
from pipecat.transports.base_transport import TransportParams
from pipecat.transports.smallwebrtc.connection import SmallWebRTCConnection
from pipecat.transports.smallwebrtc.transport import SmallWebRTCTransport
from pipecat.turns.user_mute import AlwaysUserMuteStrategy, FirstSpeechUserMuteStrategy
from pipecat.workers.runner import WorkerRunner

from engine.config import settings
from engine.contract import (
    BackgroundNoise,
    CallMetrics,
    DispatchRequest,
    EndOfCallReport,
    LlmUsage,
    PostCallAnalysis,
    QaResult,
    QaTag,
    SttUsage,
    TranscriptEntry,
    TtsUsage,
    Usage,
)
from engine.metrics import CallMetricsObserver
from engine.services.llm import create_llm_service
from engine.services.qa_analyzer import analyze as analyze_call
from engine.services.stt import create_stt_service
from engine.services.tts import create_tts_service
from engine.tools import register_tools
from engine.variables import build_variable_map, substitute

ReportSink = Callable[[EndOfCallReport], Awaitable[None]]

# Ambience assets live here as mono WAVs named after the BackgroundNoise.sound
# enum (e.g. office.wav). None are bundled by default, so background noise is a
# no-op until an operator drops files in — we log and skip rather than crash.
_AMBIENCE_DIR = pathlib.Path(__file__).resolve().parent.parent / "static" / "ambience"


def _build_background_mixer(noise: BackgroundNoise):
    """Return a SoundfileMixer for the requested ambience, or None if unavailable.

    The ``soundfile`` extra is optional, so we import lazily and degrade to a
    no-op (log + None) when it — or the ambience asset — is missing, rather than
    breaking the whole pipeline.
    """
    if not noise.enabled:
        return None
    asset = _AMBIENCE_DIR / f"{noise.sound}.wav"
    if not asset.is_file():
        logger.warning(
            f"[bg-noise] ambience '{noise.sound}' not bundled at {asset} — skipping"
        )
        return None
    try:
        from pipecat.audio.mixers.soundfile_mixer import SoundfileMixer
    except ImportError:
        logger.warning(
            "[bg-noise] soundfile extra not installed (pipecat-ai[soundfile]) — skipping"
        )
        return None
    try:
        mixer = SoundfileMixer(
            sound_files={noise.sound: str(asset)},
            default_sound=noise.sound,
            volume=noise.volume,
            loop=True,
        )
        logger.info(f"[bg-noise] mixing '{noise.sound}' at volume {noise.volume}")
        return mixer
    except Exception:
        logger.exception(f"[bg-noise] failed to load ambience '{noise.sound}' — skipping")
        return None


async def run_simple_bot(
    connection: SmallWebRTCConnection,
    dispatch: DispatchRequest,
    report_sink: ReportSink,
) -> None:
    cfg = dispatch.agent_config
    persona = cfg.persona
    adv = cfg.advanced
    started_at = int(time.time() * 1000)

    values = build_variable_map(cfg, dispatch.variables, adv.timezone)
    system_prompt = substitute(persona.system_prompt if persona else "You are a helpful voice assistant.", values)
    greeting = substitute(persona.greeting_message if persona else None, values)

    stt = create_stt_service(cfg.voice)
    llm = create_llm_service(cfg.voice)
    tts = create_tts_service(cfg.voice)

    context = LLMContext(messages=[{"role": "system", "content": system_prompt}])

    # Barge-in policy. silence_when_agent_speaks fully disables interruptions
    # while the agent talks; silence_during_intro only guards the first (intro)
    # turn. When neither is set, barge-in stays on (empty strategy list).
    mute_strategies = []
    if adv.silence_when_agent_speaks:
        mute_strategies.append(AlwaysUserMuteStrategy())
        logger.info("[barge-in] disabled while agent speaks (AlwaysUserMuteStrategy)")
    elif adv.silence_during_intro:
        mute_strategies.append(FirstSpeechUserMuteStrategy())
        logger.info("[barge-in] disabled during intro only (FirstSpeechUserMuteStrategy)")

    user_aggregator, assistant_aggregator = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(
            vad_analyzer=SileroVADAnalyzer(
                params=VADParams(
                    stop_secs=adv.vad.stop_secs,
                    confidence=adv.vad.confidence,
                    min_volume=adv.vad.min_volume,
                )
            ),
            user_mute_strategies=mute_strategies,
        ),
    )

    transport = SmallWebRTCTransport(
        connection,
        params=TransportParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            audio_out_mixer=_build_background_mixer(adv.background_noise),
        ),
    )

    pipeline = Pipeline(
        [
            transport.input(),
            stt,
            user_aggregator,
            llm,
            tts,
            transport.output(),
            assistant_aggregator,
        ]
    )

    # inactivity_timeout_secs: the pipeline is "idle" when no bot/user speaking
    # frames arrive for this long. We keep the worker alive on idle
    # (cancel_on_idle_timeout=False) so we can speak a goodbye before ending.
    inactivity_secs = adv.inactivity_timeout_secs if adv.inactivity_timeout_secs > 0 else None

    # Collects token/character/second usage, interruptions and voice-to-voice
    # latency off the frame stream for the end-of-call report.
    metrics_observer = CallMetricsObserver()

    worker = PipelineWorker(
        pipeline,
        conversation_id=dispatch.call_id,
        idle_timeout_secs=inactivity_secs,
        cancel_on_idle_timeout=False,
        observers=[metrics_observer],
        params=PipelineParams(enable_metrics=True, enable_usage_metrics=True),
    )
    runner = WorkerRunner(handle_sigint=False)

    # ── Graceful end plumbing ────────────────────────────────────────────────
    ending = False
    max_duration_task: asyncio.Task | None = None

    async def graceful_end(reason: str) -> None:
        """Speak the goodbye (if enabled) then stop the pipeline once, idempotently."""
        nonlocal ending
        if ending:
            return
        ending = True
        logger.info(f"[call {dispatch.call_id}] ending call: {reason}")
        goodbye = substitute(adv.goodbye_message, values) if adv.graceful_exit_enabled else ""
        if goodbye:
            await worker.queue_frames([TTSSpeakFrame(goodbye)])
        # stop_when_done queues an EndFrame *after* the goodbye TTS, so the
        # farewell plays out and then the pipeline drains and stops.
        await worker.stop_when_done()

    async def on_end_call() -> None:
        await graceful_end("end_call tool invoked")

    async def max_duration_guard() -> None:
        try:
            await asyncio.sleep(adv.max_call_duration_secs)
        except asyncio.CancelledError:
            return
        await graceful_end(f"max call duration ({adv.max_call_duration_secs}s) reached")

    # Attach custom HTTP tools + the built-in end_call to the LLM/context.
    register_tools(
        llm,
        context,
        cfg.tools,
        values,
        on_end_call=on_end_call,
        end_call_enabled=adv.enable_end_call,
        end_call_description=adv.end_call_description,
    )

    @worker.event_handler("on_idle_timeout")
    async def on_idle_timeout(_worker):
        await graceful_end(f"user inactive for {inactivity_secs}s")

    @transport.event_handler("on_client_connected")
    async def on_connected(_transport, _client):
        nonlocal max_duration_task
        logger.info(f"[call {dispatch.call_id}] client connected")
        if adv.max_call_duration_secs and adv.max_call_duration_secs > 0:
            max_duration_task = asyncio.create_task(max_duration_guard())
        if greeting:
            await worker.queue_frames([TTSSpeakFrame(greeting)])
        elif persona and persona.agent_speaks_first:
            context.add_message({"role": "user", "content": "Greet the caller and introduce yourself briefly."})
            await worker.queue_frames([LLMRunFrame()])

    @transport.event_handler("on_client_disconnected")
    async def on_disconnected(_transport, _client):
        logger.info(f"[call {dispatch.call_id}] client disconnected")
        await worker.cancel()

    status = "completed"
    error: str | None = None
    try:
        await runner.add_workers(worker)
        await runner.run()
    except Exception as exc:  # never let the report be skipped
        status = "failed"
        error = str(exc)
        logger.exception(f"[call {dispatch.call_id}] pipeline error")
    finally:
        if max_duration_task is not None:
            max_duration_task.cancel()
        ended_at = int(time.time() * 1000)
        transcript = _extract_transcript(context, started_at)
        turns = len([t for t in transcript if t.role == "agent"])

        metrics_observer.log_summary(dispatch.call_id)

        # Metrics: real voice-to-voice latency percentiles + interruptions + turns.
        metrics = CallMetrics(
            voice_to_voice_p50_ms=metrics_observer.voice_to_voice_p50_ms(),
            voice_to_voice_p95_ms=metrics_observer.voice_to_voice_p95_ms(),
            interruptions=metrics_observer.interruptions,
            turns=turns,
        )

        # Usage: raw counts only — pricing is the platform API's job.
        usage = _build_usage(cfg.voice, metrics_observer)

        # Post-call intelligence: advisory, fail-open. Only when we have a
        # transcript AND an OpenAI key. Never blocks report delivery.
        analysis: PostCallAnalysis | None = None
        qa: QaResult | None = None
        if transcript and settings.openai_api_key:
            try:
                result = await analyze_call(
                    transcript=[
                        {"role": t.role, "text": t.text, "seconds_from_start": None}
                        for t in transcript
                    ],
                    metrics={
                        "turns": turns,
                        "interruptions": metrics_observer.interruptions,
                        "voiceToVoiceP50Ms": metrics.voice_to_voice_p50_ms,
                    },
                    openai_api_key=settings.openai_api_key,
                    structured_schema=_structured_schema(dispatch),
                )
                analysis, qa = _shape_analysis(result)
            except Exception:
                # analyze_call is fail-open, but guard anyway: analysis must
                # never stop the mandatory report from being delivered.
                logger.exception(f"[call {dispatch.call_id}] post-call analysis crashed")

        report = EndOfCallReport(
            call_id=dispatch.call_id,
            status=status,  # type: ignore[arg-type]
            started_at=started_at,
            ended_at=ended_at,
            duration_secs=round((ended_at - started_at) / 1000, 2),
            transcript=transcript,
            metrics=metrics,
            usage=usage,
            analysis=analysis,
            qa=qa,
            error=error,
        )
        try:
            await report_sink(report)
        except Exception:
            logger.exception(f"[call {dispatch.call_id}] failed to deliver end-of-call report")


def _build_usage(voice, observer: CallMetricsObserver) -> Usage:
    """Assemble raw provider usage from config (provider/model) + observed counts.

    Model names prefer what the service actually reported at runtime, falling
    back to the configured model. No pricing is computed here.
    """
    return Usage(
        stt=SttUsage(
            provider=voice.stt_provider,
            model=voice.stt_model or "",
            seconds=round(observer.stt_seconds, 2),
        ),
        llm=LlmUsage(
            provider=voice.llm_provider,
            model=observer.llm_model or voice.llm_model or "",
            input_tokens=observer.llm_input_tokens,
            cached_input_tokens=observer.llm_cached_input_tokens,
            output_tokens=observer.llm_output_tokens,
        ),
        tts=TtsUsage(
            provider=voice.tts_provider,
            model=observer.tts_model or voice.tts_model or "",
            characters=observer.tts_characters,
        ),
    )


def _structured_schema(dispatch: DispatchRequest) -> list[dict] | None:
    """Best-effort extraction schema from dispatch metadata (optional).

    The transport contract carries no dedicated field, so we accept a
    ``postCallAnalysis`` bag in ``metadata`` — either a list of field specs or
    an object exposing ``schema``/``properties``. Absent or malformed → None.
    """
    md = dispatch.metadata or {}
    pca = md.get("postCallAnalysis") or md.get("post_call_analysis")
    if isinstance(pca, list):
        return pca or None
    if isinstance(pca, dict):
        schema = pca.get("schema") or pca.get("properties")
        return schema if isinstance(schema, list) and schema else None
    return None


def _shape_analysis(result: dict) -> tuple[PostCallAnalysis | None, QaResult | None]:
    """Map the analyzer's dict into the report's PostCallAnalysis + QaResult.

    QaResult is only built when the model returned a usable quality score, since
    the contract requires score/sentiment/summary to be present.
    """
    if not result:
        return None, None

    analysis: PostCallAnalysis | None = None
    if result.get("summary") or result.get("sentiment") or result.get("structured_data"):
        analysis = PostCallAnalysis(
            summary=result.get("summary"),
            sentiment=result.get("sentiment"),
            structured_data=result.get("structured_data"),
        )

    qa: QaResult | None = None
    qa_in = result.get("qa") or {}
    score = qa_in.get("call_quality_score")
    if score is not None:
        qa = QaResult(
            call_quality_score=score,
            overall_sentiment=qa_in.get("overall_sentiment") or result.get("sentiment") or "neutral",
            summary=qa_in.get("summary") or result.get("summary") or "",
            tags=[
                QaTag(tag=t["tag"], evidence=t.get("evidence") or None)
                for t in qa_in.get("tags", [])
                if isinstance(t, dict) and t.get("tag")
            ],
        )
    return analysis, qa


def _extract_transcript(context: LLMContext, base_ts: int) -> list[TranscriptEntry]:
    entries: list[TranscriptEntry] = []
    try:
        for msg in context.get_messages():
            role = msg.get("role")
            content = msg.get("content")
            if role not in ("user", "assistant") or not content:
                continue
            text = content if isinstance(content, str) else str(content)
            entries.append(
                TranscriptEntry(role="agent" if role == "assistant" else "user", text=text, ts=base_ts)
            )
    except Exception:
        logger.warning("could not extract transcript from context")
    return entries
