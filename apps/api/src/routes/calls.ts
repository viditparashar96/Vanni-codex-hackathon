import { Router, type Request, type Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { calls, realtimeFeedbackEvents } from "../db/schema/index.js";
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

// ── List calls ────────────────────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  const rows = await db
    .select()
    .from(calls)
    .where(eq(calls.orgId, orgOf(req)))
    .orderBy(desc(calls.createdAt))
    .limit(100);
  res.json({ calls: rows });
});

// ── Get one call (with its event timeline) ────────────────────────────────────
router.get("/:callId", async (req: Request, res: Response) => {
  const [call] = await db
    .select()
    .from(calls)
    .where(and(eq(calls.id, String(req.params.callId)), eq(calls.orgId, orgOf(req))));
  if (!call) {
    res.status(404).json({ error: "Call not found" });
    return;
  }
  const events = await db
    .select()
    .from(realtimeFeedbackEvents)
    .where(eq(realtimeFeedbackEvents.callId, call.id))
    .orderBy(realtimeFeedbackEvents.ts);
  res.json({ call, events });
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
