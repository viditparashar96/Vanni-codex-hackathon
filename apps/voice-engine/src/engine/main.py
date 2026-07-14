"""Vaani voice engine — FastAPI dispatch + SmallWebRTC signaling.

Flow (Phase 1, SmallWebRTC):
  1. POST /dispatch      — API (or the test page) registers a DispatchRequest.
  2. POST /api/offer     — browser sends its WebRTC offer + call_id; we build the
                           pipeline for that call and return the answer. The bot
                           runs as a background task until the client disconnects.
  3. POST <callbacks.report> — the engine posts the mandatory end-of-call report.

A dev report sink (/dev/report-sink) lets you see reports before the platform API
exists. The test client is served at GET / .
"""

from __future__ import annotations

import pathlib

import httpx
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from loguru import logger
from pipecat.transports.smallwebrtc.connection import SmallWebRTCConnection

from engine.bots.base import run_simple_bot
from engine.config import settings
from engine.contract import DispatchAck, DispatchRequest, EndOfCallReport

app = FastAPI(title="Vaani Voice Engine")

_STATIC = pathlib.Path(__file__).parent / "static"
_ICE_SERVERS = ["stun:stun.l.google.com:19302"]

# callId -> DispatchRequest awaiting a browser offer
_pending: dict[str, DispatchRequest] = {}
# pc_id -> live SmallWebRTCConnection
_pcs: dict[str, SmallWebRTCConnection] = {}


@app.get("/health")
async def health():
    return {"status": "ok", "pending": len(_pending), "active": len(_pcs)}


@app.post("/dispatch")
async def dispatch(req: DispatchRequest) -> DispatchAck:
    """Register a call. In production the platform API calls this; the test page
    calls it too. Stores the resolved config until the browser sends its offer."""
    _pending[req.call_id] = req
    logger.info(f"[dispatch] registered call {req.call_id} agent={req.agent_id} mode={req.mode}")
    return DispatchAck(call_id=req.call_id, accepted=True, reason="offer at POST /api/offer")


@app.post("/api/offer")
async def offer(request: dict, background_tasks: BackgroundTasks):
    """WebRTC signaling. Body: { sdp, type, call_id, pc_id? }."""
    pc_id = request.get("pc_id")

    if pc_id and pc_id in _pcs:
        conn = _pcs[pc_id]
        await conn.renegotiate(
            sdp=request["sdp"], type=request["type"], restart_pc=request.get("restart_pc", False)
        )
        return conn.get_answer()

    call_id = request.get("call_id")
    dispatch_req = _pending.get(call_id) if call_id else None
    if dispatch_req is None:
        raise HTTPException(status_code=404, detail=f"no dispatched call for call_id={call_id!r}")

    conn = SmallWebRTCConnection(_ICE_SERVERS)
    await conn.initialize(sdp=request["sdp"], type=request["type"])

    @conn.event_handler("closed")
    async def _on_closed(c: SmallWebRTCConnection):
        _pcs.pop(c.pc_id, None)
        logger.info(f"[offer] connection closed pc_id={c.pc_id}")

    background_tasks.add_task(run_simple_bot, conn, dispatch_req, _make_report_sink(dispatch_req))

    answer = conn.get_answer()
    _pcs[answer["pc_id"]] = conn
    _pending.pop(call_id, None)  # consumed
    return answer


def _make_report_sink(req: DispatchRequest):
    async def sink(report: EndOfCallReport):
        url = req.callbacks.report
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
    logger.info(f"[dev/report-sink] {report.get('callId')} status={report.get('status')} "
                f"turns={report.get('metrics', {}).get('turns')} "
                f"transcript_lines={len(report.get('transcript', []))}")
    return JSONResponse({"received": True})


@app.get("/")
async def index():
    return FileResponse(_STATIC / "index.html")


def main():
    import uvicorn

    uvicorn.run("engine.main:app", host="0.0.0.0", port=settings.port, reload=False)


if __name__ == "__main__":
    main()
