import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  PersonaConfigSchema,
  VoiceConfigSchema,
  AdvancedConfigSchema,
  HttpToolSchema,
  KnowledgeBaseBindingSchema,
} from "@vaani/shared";
import { db } from "../db/index.js";
import { agents, agentVersions } from "../db/schema/index.js";
import { requireOrg } from "../middleware/auth.js";

// mergeParams so `:orgId` from the parent mount is visible to requireOrg.
const router: Router = Router({ mergeParams: true });
router.use(requireOrg);

// Draft config blocks are partial — a version becomes complete at publish/dispatch.
const versionConfigSchema = z.object({
  label: z.string().optional(),
  personaConfig: PersonaConfigSchema.partial().optional(),
  voiceConfig: VoiceConfigSchema.partial().optional(),
  advancedConfig: AdvancedConfigSchema.partial().optional(),
  flowConfig: z.record(z.string(), z.unknown()).optional(),
  toolsConfig: z.array(HttpToolSchema).optional(),
  knowledgeBaseBindings: z.array(KnowledgeBaseBindingSchema).optional(),
});

const createAgentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["simple", "flow"]).default("simple"),
  tags: z.array(z.string()).optional(),
  version: versionConfigSchema.optional(),
});

function orgOf(req: Request): string {
  return req.orgId!;
}

// ── List ────────────────────────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  const rows = await db
    .select()
    .from(agents)
    .where(eq(agents.orgId, orgOf(req)))
    .orderBy(desc(agents.updatedAt));
  res.json({ agents: rows });
});

// ── Create (agent + version 1 draft) ─────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  const parsed = createAgentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.issues });
    return;
  }
  const { name, description, type, tags, version } = parsed.data;
  const userId = req.user!.id;

  const result = await db.transaction(async (tx) => {
    const [agent] = await tx
      .insert(agents)
      .values({ orgId: orgOf(req), name, description, type, tags: tags ?? [], createdBy: userId })
      .returning();

    const [v1] = await tx
      .insert(agentVersions)
      .values({
        agentId: agent.id,
        versionNumber: 1,
        label: version?.label,
        personaConfig: version?.personaConfig,
        voiceConfig: version?.voiceConfig,
        advancedConfig: version?.advancedConfig,
        flowConfig: version?.flowConfig,
        toolsConfig: version?.toolsConfig ?? [],
        knowledgeBaseBindings: version?.knowledgeBaseBindings ?? [],
        createdBy: userId,
      })
      .returning();

    return { agent, version: v1 };
  });

  res.status(201).json(result);
});

// ── Get one (with versions) ──────────────────────────────────────────────────
router.get("/:agentId", async (req: Request, res: Response) => {
  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, String(req.params.agentId)), eq(agents.orgId, orgOf(req))));
  if (!agent) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }
  const versions = await db
    .select()
    .from(agentVersions)
    .where(eq(agentVersions.agentId, agent.id))
    .orderBy(desc(agentVersions.versionNumber));
  res.json({ agent, versions });
});

// ── Update agent metadata ─────────────────────────────────────────────────────
const patchAgentSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["draft", "testing", "active", "archived"]).optional(),
});

router.patch("/:agentId", async (req: Request, res: Response) => {
  const parsed = patchAgentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.issues });
    return;
  }
  const [updated] = await db
    .update(agents)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(agents.id, String(req.params.agentId)), eq(agents.orgId, orgOf(req))))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }
  res.json({ agent: updated });
});

// ── Delete ────────────────────────────────────────────────────────────────────
router.delete("/:agentId", async (req: Request, res: Response) => {
  const [deleted] = await db
    .delete(agents)
    .where(and(eq(agents.id, String(req.params.agentId)), eq(agents.orgId, orgOf(req))))
    .returning({ id: agents.id });
  if (!deleted) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }
  res.json({ ok: true, id: deleted.id });
});

// ── Versions ─────────────────────────────────────────────────────────────────

async function loadOrgAgent(req: Request) {
  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, String(req.params.agentId)), eq(agents.orgId, orgOf(req))));
  return agent;
}

router.get("/:agentId/versions", async (req: Request, res: Response) => {
  const agent = await loadOrgAgent(req);
  if (!agent) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }
  const versions = await db
    .select()
    .from(agentVersions)
    .where(eq(agentVersions.agentId, agent.id))
    .orderBy(desc(agentVersions.versionNumber));
  res.json({ versions });
});

// Create a new immutable version (optionally cloning the latest as a base).
router.post("/:agentId/versions", async (req: Request, res: Response) => {
  const parsed = versionConfigSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.issues });
    return;
  }
  const agent = await loadOrgAgent(req);
  if (!agent) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }

  const created = await db.transaction(async (tx) => {
    const [{ max }] = await tx
      .select({ max: sql<number>`coalesce(max(${agentVersions.versionNumber}), 0)::int` })
      .from(agentVersions)
      .where(eq(agentVersions.agentId, agent.id));

    const [latest] = await tx
      .select()
      .from(agentVersions)
      .where(eq(agentVersions.agentId, agent.id))
      .orderBy(desc(agentVersions.versionNumber))
      .limit(1);

    const cfg = parsed.data;
    const [version] = await tx
      .insert(agentVersions)
      .values({
        agentId: agent.id,
        versionNumber: max + 1,
        label: cfg.label ?? latest?.label ?? null,
        personaConfig: cfg.personaConfig ?? latest?.personaConfig ?? null,
        voiceConfig: cfg.voiceConfig ?? latest?.voiceConfig ?? null,
        advancedConfig: cfg.advancedConfig ?? latest?.advancedConfig ?? null,
        flowConfig: cfg.flowConfig ?? latest?.flowConfig ?? null,
        toolsConfig: cfg.toolsConfig ?? latest?.toolsConfig ?? [],
        knowledgeBaseBindings:
          cfg.knowledgeBaseBindings ?? latest?.knowledgeBaseBindings ?? [],
        createdBy: req.user!.id,
      })
      .returning();
    return version;
  });

  res.status(201).json({ version: created });
});

// ── Publish a version → live ──────────────────────────────────────────────────
const publishSchema = z.object({ versionId: z.string() });

router.post("/:agentId/publish", async (req: Request, res: Response) => {
  const parsed = publishSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "versionId required" });
    return;
  }
  const agent = await loadOrgAgent(req);
  if (!agent) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }
  const [version] = await db
    .select({ id: agentVersions.id })
    .from(agentVersions)
    .where(and(eq(agentVersions.id, parsed.data.versionId), eq(agentVersions.agentId, agent.id)));
  if (!version) {
    res.status(404).json({ error: "Version not found for this agent" });
    return;
  }

  const [updated] = await db
    .update(agents)
    .set({ publishedVersionId: version.id, status: "active", updatedAt: new Date() })
    .where(eq(agents.id, agent.id))
    .returning();
  res.json({ agent: updated });
});

// ── Archive ────────────────────────────────────────────────────────────────────
router.post("/:agentId/archive", async (req: Request, res: Response) => {
  const [updated] = await db
    .update(agents)
    .set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(agents.id, String(req.params.agentId)), eq(agents.orgId, orgOf(req))))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }
  res.json({ agent: updated });
});

export default router;
