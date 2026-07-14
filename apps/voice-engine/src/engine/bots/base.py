"""Simple-agent pipeline (Phase 1 walking skeleton).

Builds STT -> LLM -> TTS over a SmallWebRTC transport, runs it until the client
disconnects, then produces the MANDATORY end-of-call report.
"""

from __future__ import annotations

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
from pipecat.workers.runner import WorkerRunner

from engine.contract import (
    CallMetrics,
    DispatchRequest,
    EndOfCallReport,
    TranscriptEntry,
)
from engine.services.llm import create_llm_service
from engine.services.stt import create_stt_service
from engine.services.tts import create_tts_service
from engine.variables import build_variable_map, substitute

ReportSink = Callable[[EndOfCallReport], Awaitable[None]]


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
        ),
    )

    transport = SmallWebRTCTransport(
        connection,
        params=TransportParams(audio_in_enabled=True, audio_out_enabled=True),
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

    worker = PipelineWorker(
        pipeline,
        conversation_id=dispatch.call_id,
        idle_timeout_secs=adv.max_call_duration_secs,
        params=PipelineParams(enable_metrics=True, enable_usage_metrics=True),
    )
    runner = WorkerRunner(handle_sigint=False)

    @transport.event_handler("on_client_connected")
    async def on_connected(_transport, _client):
        logger.info(f"[call {dispatch.call_id}] client connected")
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
        ended_at = int(time.time() * 1000)
        transcript = _extract_transcript(context, started_at)
        report = EndOfCallReport(
            call_id=dispatch.call_id,
            status=status,  # type: ignore[arg-type]
            started_at=started_at,
            ended_at=ended_at,
            duration_secs=round((ended_at - started_at) / 1000, 2),
            transcript=transcript,
            metrics=CallMetrics(turns=len([t for t in transcript if t.role == "agent"])),
            error=error,
        )
        try:
            await report_sink(report)
        except Exception:
            logger.exception(f"[call {dispatch.call_id}] failed to deliver end-of-call report")


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
