import { Router, type Request, type Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { agents, calls, realtimeFeedbackEvents } from "../db/schema/index.js";
import { requireOrg } from "../middleware/auth.js";
import { resolveAgentConfig } from "../lib/config-resolver.js";
import { buildDispatchRequest, dispatchToEngine } from "../lib/dispatch.js";

// mergeParams so `:orgId` from the parent mount is visible to requireOrg.
const router: Router = Router({ mergeParams: true });
router.use(requireOrg);

function orgOf(req: Request): string {
  return req.orgId!;
}

function engineOfferUrl(): string {
  const base = (process.env.VOICE_ENGINE_URL || "http://localhost:7860").replace(/\/$/, "");
  return `${base}/api/offer`;
}

// ── Call CONTRACT serialization ─────────────────────────────────────────────
// Maps a DB `calls` row (+ optional realtime event rows) to the exact `Call`
// shape the dashboard expects. Kept local to this router.

type CallRow = typeof calls.$inferSelect;
type EventRow = typeof realtimeFeedbackEvents.$inferSelect;

const CONTRACT_STATUS: Record<string, string> = {
  queued: "in_progress",
  in_progress: "in_progress",
  completed: "completed",
  failed: "failed",
  no_answer: "no_answer",
  busy: "failed",
  voicemail: "voicemail",
};

const CONTRACT_SENTIMENT = new Set(["positive", "neutral", "negative"]);

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

// epoch-ms `ts` → seconds relative to the call's start (never negative).
function toSec(ts: unknown, startMs: number): number {
  if (typeof ts !== "number" || !Number.isFinite(ts)) return 0;
  if (!startMs) return 0;
  const s = (ts - startMs) / 1000;
  return s > 0 ? s : 0;
}

function serializeCall(
  call: CallRow,
  agentName: string,
  events: EventRow[]
): Record<string, unknown> {
  const startDate = call.startedAt ?? call.createdAt;
  const startMs = startDate ? new Date(startDate).getTime() : 0;

  const usage = asRecord(call.usage);
  const stt = asRecord(usage.stt);
  const llm = asRecord(usage.llm);
  const tts = asRecord(usage.tts);
  const costBreakdown = {
    stt: num(stt.cost),
    llm: num(llm.cost),
    tts: num(tts.cost),
    platform: num(usage.platform ?? usage.platformCost),
  };

  const metrics = asRecord(call.metrics);
  const analysis = asRecord(call.analysis);
  const qa = asRecord(call.qa);

  const turns = (call.transcript ?? [])
    .filter((t) => t && (t.role === "user" || t.role === "agent"))
    .map((t) => {
      const turn: Record<string, unknown> = {
        role: t.role === "user" ? "caller" : "agent",
        text: t.text ?? "",
        atSec: toSec(t.ts, startMs),
      };
      if (typeof t.latencyMs === "number") turn.latencyMs = t.latencyMs;
      return turn;
    });

  const mappedEvents = events.map((e) => {
    const payload = asRecord(e.payload);
    const event: Record<string, unknown> = {
      id: e.id,
      type: e.type,
      label: typeof payload.label === "string" ? payload.label : e.type,
      atSec: toSec(e.ts, startMs),
    };
    if (typeof payload.detail === "string") event.detail = payload.detail;
    if (typeof payload.latencyMs === "number") event.latencyMs = payload.latencyMs;
    return event;
  });

  const sentiment =
    call.sentiment && CONTRACT_SENTIMENT.has(call.sentiment) ? call.sentiment : "neutral";

  const result: Record<string, unknown> = {
    id: call.id,
    agentId: call.agentId,
    agentName,
    direction: call.direction,
    mode: call.mode,
    from: call.fromNumber ?? "",
    to: call.toNumber ?? "",
    status: CONTRACT_STATUS[call.status] ?? "in_progress",
    startedAt: (startDate ? new Date(startDate) : new Date()).toISOString(),
    durationSecs: num(call.durationSecs),
    cost: num(call.totalCost),
    costBreakdown,
    qaScore: call.callQualityScore ?? null,
    sentiment,
    summary: call.summary ?? "",
    latencyP50Ms: num(metrics.voiceToVoiceP50Ms),
    interruptions: num(metrics.interruptions),
    structuredData: asRecord(analysis.structuredData),
    qaTags: Array.isArray(qa.tags) ? qa.tags : [],
    turns,
    events: mappedEvents,
  };

  const currentNode = metrics.currentNode ?? analysis.currentNode;
  if (typeof currentNode === "string") result.currentNode = currentNode;

  return result;
}

// ── List calls ────────────────────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  const rows = await db
    .select({ call: calls, agentName: agents.name })
    .from(calls)
    .leftJoin(agents, eq(calls.agentId, agents.id))
    .where(eq(calls.orgId, orgOf(req)))
    .orderBy(desc(calls.createdAt))
    .limit(100);

  const serialized = rows.map((r) => serializeCall(r.call, r.agentName ?? "", []));
  res.json(serialized);
});

// ── Get one call (with its event timeline) ────────────────────────────────────
router.get("/:callId", async (req: Request, res: Response) => {
  const [row] = await db
    .select({ call: calls, agentName: agents.name })
    .from(calls)
    .leftJoin(agents, eq(calls.agentId, agents.id))
    .where(and(eq(calls.id, String(req.params.callId)), eq(calls.orgId, orgOf(req))));

  if (!row) {
    res.status(404).json({ error: "Call not found" });
    return;
  }

  const events = await db
    .select()
    .from(realtimeFeedbackEvents)
    .where(eq(realtimeFeedbackEvents.callId, row.call.id))
    .orderBy(realtimeFeedbackEvents.ts);

  res.json(serializeCall(row.call, row.agentName ?? "", events));
});

// ── Start a web-test session ──────────────────────────────────────────────────
// Resolves the agent to a runnable config, creates the call row, dispatches to
// the voice engine, and returns the URL the browser connects to for SmallWebRTC.
router.post("/:agentId/test-session", async (req: Request, res: Response) => {
  const orgId = orgOf(req);
  const versionId: string | undefined = req.body?.versionId;
  const variables: Record<string, string> = req.body?.variables ?? {};

  const resolved = await resolveAgentConfig(orgId, String(req.params.agentId), versionId);
  if (!resolved) {
    res.status(404).json({ error: "Agent or a usable version not found" });
    return;
  }

  const [call] = await db
    .insert(calls)
    .values({
      orgId,
      agentId: resolved.agent.id,
      agentVersionId: resolved.version.id,
      mode: "web_test",
      direction: "inbound",
      status: "queued",
      variables,
    })
    .returning();

  const dispatch = buildDispatchRequest({
    callId: call.id,
    orgId,
    agentId: resolved.agent.id,
    versionId: resolved.version.id,
    mode: "web_test",
    direction: "inbound",
    agentConfig: resolved.agentConfig,
    variables,
  });

  const ack = await dispatchToEngine(dispatch);
  if (!ack.accepted) {
    await db.update(calls).set({ status: "failed", error: ack.reason }).where(eq(calls.id, call.id));
    res.status(502).json({ error: "Voice engine rejected dispatch", reason: ack.reason });
    return;
  }

  res.status(201).json({ callId: call.id, engineOfferUrl: engineOfferUrl() });
});

export default router;
