/**
 * Internal callbacks (voice-engine → API). Mounted at /api/internal, NO session
 * auth — reachable only from inside the cluster. The engine posts the mandatory
 * end-of-call report and realtime event batches here.
 *
 * Callback URLs are minted in lib/dispatch.ts:
 *   POST /api/internal/calls/:callId/report
 *   POST /api/internal/calls/:callId/events
 */

import { Router, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { EndOfCallReportSchema, FeedbackEventBatchSchema } from "@vaani/shared";
import { db } from "../db/index.js";
import { calls, realtimeFeedbackEvents } from "../db/schema/index.js";

const router: Router = Router();

// ── Mandatory end-of-call report ──────────────────────────────────────────────
// Idempotent on callId: re-delivery overwrites the same row rather than dupes.
router.post("/calls/:callId/report", async (req: Request, res: Response) => {
  const parsed = EndOfCallReportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid report", details: parsed.error.issues });
    return;
  }
  const report = parsed.data;
  if (report.callId !== String(req.params.callId)) {
    res.status(400).json({ error: "callId mismatch between path and body" });
    return;
  }

  const [updated] = await db
    .update(calls)
    .set({
      status: report.status,
      startedAt: new Date(report.startedAt),
      endedAt: new Date(report.endedAt),
      durationSecs: Math.round(report.durationSecs),
      transcript: report.transcript,
      metrics: report.metrics,
      usage: report.usage,
      analysis: report.analysis,
      qa: report.qa,
      callQualityScore: report.qa?.callQualityScore,
      sentiment: report.qa?.overallSentiment ?? report.analysis?.sentiment,
      summary: report.qa?.summary ?? report.analysis?.summary,
      recordingPath: report.recording?.storagePath,
      error: report.error,
    })
    .where(eq(calls.id, report.callId))
    .returning({ id: calls.id });

  if (!updated) {
    res.status(404).json({ error: "Call not found" });
    return;
  }
  res.json({ ok: true });
});

// ── Realtime feedback event batch (dual-sink DB half) ─────────────────────────
router.post("/calls/:callId/events", async (req: Request, res: Response) => {
  const parsed = FeedbackEventBatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid event batch", details: parsed.error.issues });
    return;
  }
  const { events } = parsed.data;
  if (events.length > 0) {
    await db.insert(realtimeFeedbackEvents).values(
      events.map((e) => ({
        callId: e.callId,
        type: e.type,
        ts: e.ts,
        payload: e.payload,
      }))
    );
  }
  res.json({ ok: true, ingested: events.length });
});

export default router;
