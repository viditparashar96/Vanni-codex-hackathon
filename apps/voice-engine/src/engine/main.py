"""Vaani voice engine — FastAPI dispatch + SmallWebRTC signaling.

Flow (Phase 1, SmallWebRTC):
  1. POST /dispatch      — API (or a client) registers a DispatchRequest.
  2. POST /api/offer     — browser sends its WebRTC offer (+ optional call_id);
                           we build the pipeline and return the answer. The bot
                           runs as a background task until the client disconnects.
  3. POST <callbacks.report> — the engine posts the mandatory end-of-call report.

The browser client is Pipecat's official prebuilt SmallWebRTC UI, mounted at `/`
(known-good mic + audio playback). When it connects without a linked dispatch we
fall back to the most-recent /dispatch, then to a built-in default agent — so the
page "just works" for a quick test. A dev report sink (/dev/report-sink) lets you
see reports before the platform API exists.
"""

from __future__ import annotations

import pathlib

import httpx
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from loguru import logger
from pipecat.transports.smallwebrtc.connection import SmallWebRTCConnection

from engine.bots.base import run_simple_bot
from engine.config import settings
from engine.contract import AgentConfig, DispatchAck, DispatchRequest, EndOfCallReport

app = FastAPI(title="Vaani Voice Engine")

# The browser posts its WebRTC offer here cross-origin (dashboard on :3000 →
# engine on :7860), so allow the CORS preflight. Permissive by design: the
# offer carries no secrets and the call is authorized upstream at dispatch.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_STATIC = pathlib.Path(__file__).parent / "static"
_ICE_SERVERS = ["stun:stun.l.google.com:19302"]

# callId -> DispatchRequest awaiting a browser offer
_pending: dict[str, DispatchRequest] = {}
# pc_id -> live SmallWebRTCConnection
_pcs: dict[str, SmallWebRTCConnection] = {}


def _default_dispatch(call_id: str) -> DispatchRequest:
    """Built-in agent used when the prebuilt UI connects with no linked dispatch."""
    return DispatchRequest.model_validate(
        {
            "callId": call_id,
            "orgId": "org_dev",
            "agentId": "agt_default",
            "versionId": "v1",
            "mode": "web_test",
            "direction": "inbound",
            "transport": {"type": "smallwebrtc"},
            "agentConfig": {
                "type": "simple",
                "voice": {
                    "llmProvider": "openai",
                    "llmModel": "gpt-4.1-mini",
                    "sttProvider": "deepgram",
                    "ttsProvider": "cartesia",
                    "language": "en",
                },
                "persona": {
                    "systemPrompt": (
                        "You are Vaani, a warm, concise voice receptionist for Bright Smile "
                        "Dental. Keep replies to one or two short sentences."
                    ),
                    "agentSpeaksFirst": True,
                    "greetingMessage": "Hi, this is Vaani at Bright Smile Dental. How can I help you today?",
                },
            },
            "variables": {},
            "callbacks": {"report": "/dev/report-sink", "events": "/dev/report-sink"},
        }
    )


# ── API routes (defined BEFORE the static mount so they take precedence) ─────


@app.get("/health")
async def health():
    return {"status": "ok", "pending": len(_pending), "active": len(_pcs)}


@app.post("/dispatch")
async def dispatch(req: DispatchRequest) -> DispatchAck:
    """Register a call. In production the platform API calls this; a client may too."""
    _pending[req.call_id] = req
    logger.info(f"[dispatch] registered call {req.call_id} agent={req.agent_id} mode={req.mode}")
    return DispatchAck(call_id=req.call_id, accepted=True, reason="offer at POST /api/offer")


@app.post("/api/offer")
async def offer(request: dict, background_tasks: BackgroundTasks):
    """WebRTC signaling. Body: { sdp, type, pc_id?, call_id? }."""
    pc_id = request.get("pc_id")
    if pc_id and pc_id in _pcs:
        conn = _pcs[pc_id]
        await conn.renegotiate(
            sdp=request["sdp"], type=request["type"], restart_pc=request.get("restart_pc", False)
        )
        return conn.get_answer()

    if "sdp" not in request or "type" not in request:
        raise HTTPException(status_code=400, detail="offer requires 'sdp' and 'type'")

    # Resolve which agent runs this call: explicit call_id > most-recent pending > default.
    call_id = request.get("call_id")
    dispatch_req = _pending.pop(call_id, None) if call_id else None
    if dispatch_req is None and _pending:
        _, dispatch_req = _pending.popitem()  # most-recent dispatch
    if dispatch_req is None:
        dispatch_req = _default_dispatch(call_id or "call_dev")
        logger.info(f"[offer] no linked dispatch — using built-in default agent ({dispatch_req.call_id})")

    conn = SmallWebRTCConnection(_ICE_SERVERS)
    await conn.initialize(sdp=request["sdp"], type=request["type"])

    @conn.event_handler("closed")
    async def _on_closed(c: SmallWebRTCConnection):
        _pcs.pop(c.pc_id, None)
        logger.info(f"[offer] connection closed pc_id={c.pc_id}")

    background_tasks.add_task(run_simple_bot, conn, dispatch_req, _make_report_sink(dispatch_req))

    answer = conn.get_answer()
    _pcs[answer["pc_id"]] = conn
    return answer


def _make_report_sink(req: DispatchRequest):
    url = req.callbacks.report
    if url.startswith("/"):  # relative → resolve against this engine
        url = f"http://127.0.0.1:{settings.port}{url}"

    async def sink(report: EndOfCallReport):
        payload = report.model_dump(by_alias=True, exclude_none=True)
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(url, json=payload)
            logger.info(f"[report] delivered call {report.call_id} -> {url}")
        except Exception:
            logger.exception(f"[report] delivery failed call {report.call_id} -> {url}")

    return sink


@app.post("/dev/report-sink")
async def dev_report_sink(report: dict):
    """Local sink so you can SEE the end-of-call report without the platform API."""
    logger.info(
        f"[dev/report-sink] {report.get('callId')} status={report.get('status')} "
        f"turns={report.get('metrics', {}).get('turns')} "
        f"transcript_lines={len(report.get('transcript', []))}"
    )
    for entry in report.get("transcript", []):
        logger.info(f"    {entry.get('role')}: {entry.get('text')}")
    return JSONResponse({"received": True})


@app.get("/")
async def index():
    """Browser test console (hand-rolled SmallWebRTC client)."""
    return FileResponse(_STATIC / "index.html")


def main():
    import uvicorn

    uvicorn.run("engine.main:app", host="0.0.0.0", port=settings.port, reload=False)


if __name__ == "__main__":
    main()
