import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import {
  PersonaConfigSchema,
  VoiceConfigSchema,
  AdvancedConfigSchema,
  HttpToolSchema,
  KnowledgeBaseBindingSchema,
  type PersonaConfig,
  type VoiceConfig,
} from "@vaani/shared";
import { db } from "../db/index.js";
import { agents, agentVersions, calls } from "../db/schema/index.js";
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

// Flat voice block from the dashboard create form (contract-shaped, not DB-shaped).
const flatVoiceSchema = z.object({
  llm: z.string().optional(),
  stt: z.string().optional(),
  tts: z.string().optional(),
  voice: z.string().optional(),
  language: z.string().optional(),
});

const createAgentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["simple", "flow"]).default("simple"),
  tags: z.array(z.string()).optional(),
  // Nested (canonical) version-1 config.
  version: versionConfigSchema.optional(),
  // Flat convenience form (dashboard) — mapped into persona/voice on version 1.
  systemPrompt: z.string().optional(),
  greetingMessage: z.string().optional(),
  agentSpeaksFirst: z.boolean().optional(),
  voice: flatVoiceSchema.optional(),
});

function orgOf(req: Request): string {
  return req.orgId!;
}

// ── Serialization to the client Agent contract ───────────────────────────────

type AgentRow = typeof agents.$inferSelect;
type VersionRow = typeof agentVersions.$inferSelect;

interface AgentStats {
  callsLast7d: number;
  avgQaScore: number | null;
}

// DB carries a 'testing' status the client doesn't model — collapse it to 'draft'.
function clientStatus(status: string): "draft" | "active" | "archived" {
  if (status === "active") return "active";
  if (status === "archived") return "archived";
  return "draft";
}

function serializeAgent(
  agent: AgentRow,
  version: VersionRow | undefined,
  stats: AgentStats
) {
  const vc = (version?.voiceConfig ?? {}) as Partial<VoiceConfig>;
  const pc = (version?.personaConfig ?? {}) as Partial<PersonaConfig>;

  return {
    id: agent.id,
    name: agent.name,
    description: agent.description ?? "",
    type: agent.type,
    status: clientStatus(agent.status),
    folder: null as string | null,
    version: version?.versionNumber ?? 1,
    voice: {
      llm: vc.llmModel ?? vc.llmProvider ?? "",
      stt: vc.sttModel ?? vc.sttProvider ?? "",
      tts: vc.ttsModel ?? vc.ttsProvider ?? "",
      voice: vc.ttsVoice ?? "",
      language: vc.language ?? "en",
    },
    phoneNumbers: [] as string[],
    callsLast7d: stats.callsLast7d,
    avgQaScore: stats.avgQaScore,
    createdAt: agent.createdAt.toISOString(),
    updatedAt: agent.updatedAt.toISOString(),
    systemPrompt: pc.systemPrompt,
    greetingMessage: pc.greetingMessage,
    agentSpeaksFirst: pc.agentSpeaksFirst,
  };
}

// Latest (highest versionNumber) version row for an agent.
async function latestVersion(agentId: string): Promise<VersionRow | undefined> {
  const [v] = await db
    .select()
    .from(agentVersions)
    .where(eq(agentVersions.agentId, agentId))
    .orderBy(desc(agentVersions.versionNumber))
    .limit(1);
  return v;
}

// Last-7-days call volume + avg QA score for one agent (org-scoped, by createdAt).
async function statsForAgent(orgId: string, agentId: string): Promise<AgentStats> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({
      calls: sql<number>`count(*)::int`,
      avgQa: sql<number | null>`avg(${calls.callQualityScore})::float`,
    })
    .from(calls)
    .where(
      and(
        eq(calls.orgId, orgId),
        eq(calls.agentId, agentId),
        gte(calls.createdAt, since)
      )
    );
  return {
    callsLast7d: row?.calls ?? 0,
    avgQaScore: row?.avgQa != null ? Number(row.avgQa) : null,
  };
}

async function serializeForResponse(orgId: string, agent: AgentRow) {
  const [version, stats] = await Promise.all([
    latestVersion(agent.id),
    statsForAgent(orgId, agent.id),
  ]);
  return serializeAgent(agent, version, stats);
}

// Map the flat create form into DB-shaped partial persona/voice configs.
function personaFromFlat(input: {
  systemPrompt?: string;
  greetingMessage?: string;
  agentSpeaksFirst?: boolean;
}): Partial<PersonaConfig> | undefined {
  const p: Partial<PersonaConfig> = {};
  if (input.systemPrompt !== undefined) p.systemPrompt = input.systemPrompt;
  if (input.greetingMessage !== undefined) p.greetingMessage = input.greetingMessage;
  if (input.agentSpeaksFirst !== undefined) p.agentSpeaksFirst = input.agentSpeaksFirst;
  return Object.keys(p).length ? p : undefined;
}

function voiceFromFlat(
  v: z.infer<typeof flatVoiceSchema> | undefined
): Partial<VoiceConfig> | undefined {
  if (!v) return undefined;
  const out: Partial<VoiceConfig> = {};
  // The dashboard form uses model names for LLM/STT but a PROVIDER name for TTS
  // (e.g. "cartesia"), and a friendly voice label. Map accordingly and let the
  // engine apply its provider defaults for anything omitted (e.g. TTS model).
  if (v.llm !== undefined) out.llmModel = v.llm;
  if (v.stt !== undefined) out.sttModel = v.stt;
  if (v.tts !== undefined) out.ttsProvider = v.tts as VoiceConfig["ttsProvider"];
  if (v.voice !== undefined) out.ttsVoice = v.voice;
  if (v.language !== undefined) out.language = v.language;
  return Object.keys(out).length ? out : undefined;
}

// ── List ────────────────────────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  const orgId = orgOf(req);
  const rows = await db
    .select()
    .from(agents)
    .where(eq(agents.orgId, orgId))
    .orderBy(desc(agents.updatedAt));

  const serialized = await Promise.all(
    rows.map((agent) => serializeForResponse(orgId, agent))
  );
  res.json(serialized);
});

// ── Create (agent + version 1 draft) ─────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  const parsed = createAgentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.issues });
    return;
  }
  const {
    name,
    description,
    type,
    tags,
    version,
    systemPrompt,
    greetingMessage,
    agentSpeaksFirst,
    voice,
  } = parsed.data;
  const userId = req.user!.id;

  // Nested version config wins; otherwise derive from the flat form.
  const personaConfig =
    version?.personaConfig ??
    personaFromFlat({ systemPrompt, greetingMessage, agentSpeaksFirst });
  const voiceConfig = version?.voiceConfig ?? voiceFromFlat(voice);

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
        personaConfig,
        voiceConfig,
        advancedConfig: version?.advancedConfig,
        flowConfig: version?.flowConfig,
        toolsConfig: version?.toolsConfig ?? [],
        knowledgeBaseBindings: version?.knowledgeBaseBindings ?? [],
        createdBy: userId,
      })
      .returning();

    return { agent, version: v1 };
  });

  // Freshly created — no calls yet, so stats are zero/null.
  res.status(201).json(
    serializeAgent(result.agent, result.version, {
      callsLast7d: 0,
      avgQaScore: null,
    })
  );
});

// ── Get one ──────────────────────────────────────────────────────────────────
router.get("/:agentId", async (req: Request, res: Response) => {
  const orgId = orgOf(req);
  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, String(req.params.agentId)), eq(agents.orgId, orgId)));
  if (!agent) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }
  const versions = await db
    .select()
    .from(agentVersions)
    .where(eq(agentVersions.agentId, agent.id))
    .orderBy(desc(agentVersions.versionNumber));

  const stats = await statsForAgent(orgId, agent.id);
  res.json(serializeAgent(agent, versions[0], stats));
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
  const orgId = orgOf(req);
  const [updated] = await db
    .update(agents)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(agents.id, String(req.params.agentId)), eq(agents.orgId, orgId)))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }
  res.json(await serializeForResponse(orgId, updated));
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
  const orgId = orgOf(req);
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
  res.json(await serializeForResponse(orgId, updated));
});

// ── Archive ────────────────────────────────────────────────────────────────────
router.post("/:agentId/archive", async (req: Request, res: Response) => {
  const orgId = orgOf(req);
  const [updated] = await db
    .update(agents)
    .set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(agents.id, String(req.params.agentId)), eq(agents.orgId, orgId)))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }
  res.json(await serializeForResponse(orgId, updated));
});

export default router;
