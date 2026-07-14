"""Flow-agent pipeline.

Same transport, metrics, and MANDATORY end-of-call report as the simple bot
(``bots/base.py``), but the conversation is driven by a Pipecat Flows
``FlowManager`` walking a node graph instead of a single system prompt.

Each node advertises its transition functions as LLM tools; when the model
calls one, the flow captures any properties as variables, applies the node's
context strategy, optionally speaks a transition line, and moves to the target
node. Per-node ``serviceOverrides`` re-tune the LLM/TTS/STT for that node, and
``end`` nodes / ``end_conversation`` transitions hang up gracefully.

Global + per-node HTTP tools are compiled to Flows functions and handed to the
FlowManager (global tools once at init, per-node tools on the node). Telephony
nodes (transfer/dtmf/sms) log their intended action and branch — no carrier
calls are placed yet.
"""

from __future__ import annotations

import asyncio
import time

from loguru import logger
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.flows import FlowManager
from pipecat.frames.frames import TTSSpeakFrame
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

from engine.bots.base import (
    ReportSink,
    _build_background_mixer,
    _build_usage,
    _extract_transcript,
    _shape_analysis,
    _structured_schema,
)
from engine.config import settings
from engine.contract import (
    CallMetrics,
    DispatchRequest,
    EndOfCallReport,
    GlobalCallSettings,
    PostCallAnalysis,
    QaResult,
)
from engine.flows import FlowRuntime, register_flow_actions
from engine.metrics import CallMetricsObserver
from engine.services.llm import create_llm_service
from engine.services.qa_analyzer import analyze as analyze_call
from engine.services.stt import create_stt_service
from engine.services.tts import create_tts_service
from engine.variables import build_flow_variable_map, substitute


async def run_flow_bot(
    connection: SmallWebRTCConnection,
    dispatch: DispatchRequest,
    report_sink: ReportSink,
) -> None:
    cfg = dispatch.agent_config
    started_at = int(time.time() * 1000)

    if cfg.flow is None:
        raise RuntimeError("flow agent dispatched without a flowConfig")
    flow = cfg.flow
    gcs: GlobalCallSettings = flow.global_call_settings or GlobalCallSettings()

    values = build_flow_variable_map(flow, dispatch.variables, gcs.timezone)
    runtime = FlowRuntime(flow, values, cfg.tools)

    stt = create_stt_service(cfg.voice)
    llm = create_llm_service(cfg.voice)
    tts = create_tts_service(cfg.voice)

    # FlowManager owns the context; start empty and let each node set messages.
    context = LLMContext()
    aggregators = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(
            vad_analyzer=SileroVADAnalyzer(
                params=VADParams(
                    stop_secs=gcs.vad.stop_secs,
                    confidence=gcs.vad.confidence,
                    min_volume=gcs.vad.min_volume,
                )
            ),
        ),
    )

    transport = SmallWebRTCTransport(
        connection,
        params=TransportParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            audio_out_mixer=_build_background_mixer(gcs.background_noise),
        ),
    )

    pipeline = Pipeline(
        [
            transport.input(),
            stt,
            aggregators.user(),
            llm,
            tts,
            transport.output(),
            aggregators.assistant(),
        ]
    )

    inactivity_secs = gcs.inactivity_timeout_secs if gcs.inactivity_timeout_secs > 0 else None
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

    flow_manager = FlowManager(
        llm=llm,
        context_aggregator=aggregators,
        worker=worker,
        transport=transport,
        global_functions=runtime.global_functions(),
    )
    # Per-node service-switch actions (LLM/TTS/STT overrides).
    register_flow_actions(flow_manager)

    # ── Graceful end plumbing (mirrors bots/base.py) ─────────────────────────
    ending = False
    max_duration_task: asyncio.Task | None = None

    async def graceful_end(reason: str) -> None:
        nonlocal ending
        if ending:
            return
        ending = True
        logger.info(f"[call {dispatch.call_id}] ending call: {reason}")
        goodbye = substitute(gcs.goodbye_message, values) if gcs.graceful_exit_enabled else ""
        if goodbye:
            await worker.queue_frames([TTSSpeakFrame(goodbye)])
        await worker.stop_when_done()

    async def max_duration_guard() -> None:
        try:
            await asyncio.sleep(gcs.max_call_duration_secs)
        except asyncio.CancelledError:
            return
        await graceful_end(f"max call duration ({gcs.max_call_duration_secs}s) reached")

    @worker.event_handler("on_idle_timeout")
    async def on_idle_timeout(_worker):
        await graceful_end(f"user inactive for {inactivity_secs}s")

    @transport.event_handler("on_client_connected")
    async def on_connected(_transport, _client):
        nonlocal max_duration_task
        logger.info(f"[call {dispatch.call_id}] client connected; starting flow")
        if gcs.max_call_duration_secs and gcs.max_call_duration_secs > 0:
            max_duration_task = asyncio.create_task(max_duration_guard())
        try:
            await flow_manager.initialize(runtime.build_initial_node(flow_manager))
            logger.info(f"[call {dispatch.call_id}] flow started at node '{runtime.initial_id}'")
        except Exception:
            logger.exception(f"[call {dispatch.call_id}] flow initialization failed")
            await graceful_end("flow initialization failed")

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
        logger.exception(f"[call {dispatch.call_id}] flow pipeline error")
    finally:
        if max_duration_task is not None:
            max_duration_task.cancel()
        ended_at = int(time.time() * 1000)
        transcript = _extract_transcript(context, started_at)
        turns = len([t for t in transcript if t.role == "agent"])

        metrics_observer.log_summary(dispatch.call_id)

        metrics = CallMetrics(
            voice_to_voice_p50_ms=metrics_observer.voice_to_voice_p50_ms(),
            voice_to_voice_p95_ms=metrics_observer.voice_to_voice_p95_ms(),
            interruptions=metrics_observer.interruptions,
            turns=turns,
        )
        usage = _build_usage(cfg.voice, metrics_observer)

        # Which flow node we ended on + any captured properties — useful context
        # for the report consumer.
        collected = dict(flow_manager.state.get("collected_params", {}))
        if collected:
            logger.info(f"[call {dispatch.call_id}] captured across flow: {collected}")

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
