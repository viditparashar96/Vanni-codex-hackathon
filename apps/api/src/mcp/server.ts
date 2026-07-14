/**
 * Vaani MCP server (PRD §6.17) — platform capabilities as MCP tools, so any
 * MCP client (Claude Code, Claude Desktop, Cursor, …) can build and operate
 * voice agents conversationally.
 *
 * Mounted at POST /api/mcp (Streamable HTTP, stateless). Tool writes go
 * through the same tables + dispatch path as the dashboard routes, so agents
 * built over MCP appear in the UI instantly and vice versa.
 */

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { PersonaConfig, VoiceConfig } from "@vaani/shared";
import { db } from "../db/index.js";
import {
  agents,
  agentVersions,
  calls,
  orgCredits,
} from "../db/schema/index.js";
import { resolveAgentConfig } from "../lib/config-resolver.js";
import { buildDispatchRequest, dispatchToEngine } from "../lib/dispatch.js";
import type { McpContext } from "./context.js";

function clientUrl(): string {
  return (process.env.CLIENT_URL || "http://localhost:3000").replace(/\/$/, "");
}

function engineOfferUrl(): string {
  const base = (process.env.VOICE_ENGINE_URL || "http://localhost:7860").replace(/\/$/, "");
  return `${base}/api/offer`;
}

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function err(message: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

const VOICE_FIELDS = {
  llm: z.string().optional().describe('LLM as "provider/model", e.g. "openai/gpt-4.1-mini"'),
  stt: z.string().optional().describe('STT as "provider/model", e.g. "deepgram/nova-3-general"'),
  tts: z.string().optional().describe('TTS as "provider/model", e.g. "cartesia/sonic-2"'),
  voice: z.string().optional().describe("TTS voice name from the provider catalog"),
  language: z.string().optional().describe('Agent language, e.g. "en"'),
};

type FlatVoice = { llm?: string; stt?: string; tts?: string; voice?: string; language?: string };

/** Same mapping as the dashboard's flat create form (routes/agents.ts). */
function voiceFromFlat(v: FlatVoice): Partial<VoiceConfig> | undefined {
  const out: Partial<VoiceConfig> = {};
  if (v.llm !== undefined) out.llmModel = v.llm;
  if (v.stt !== undefined) out.sttModel = v.stt;
  if (v.tts !== undefined) out.ttsModel = v.tts;
  if (v.voice !== undefined) out.ttsVoice = v.voice;
  if (v.language !== undefined) out.language = v.language;
  return Object.keys(out).length ? out : undefined;
}

async function loadAgent(orgId: string, agentId: string) {
  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.orgId, orgId)));
  return agent;
}

async function latestVersion(agentId: string) {
  const [version] = await db
    .select()
    .from(agentVersions)
    .where(eq(agentVersions.agentId, agentId))
    .orderBy(desc(agentVersions.versionNumber))
    .limit(1);
  return version;
}

export function buildMcpServer(ctx: McpContext): McpServer {
  const server = new McpServer({ name: "vaani", version: "0.1.0" });

  // ── Read tools ────────────────────────────────────────────────────────────

  server.registerTool(
    "list_agents",
    {
      title: "List agents",
      description: `List voice agents in the ${ctx.orgName} workspace with id, type, status and published version.`,
      inputSchema: {
        status: z.enum(["draft", "testing", "active", "archived"]).optional(),
      },
    },
    async ({ status }) => {
      const rows = await db
        .select()
        .from(agents)
        .where(
          status
            ? and(eq(agents.orgId, ctx.orgId), eq(agents.status, status))
            : eq(agents.orgId, ctx.orgId)
        )
        .orderBy(desc(agents.updatedAt));
      return json(
        rows.map((a) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          type: a.type,
          status: a.status,
          published: a.publishedVersionId !== null,
          updatedAt: a.updatedAt,
        }))
      );
    }
  );

  server.registerTool(
    "get_agent",
    {
      title: "Get agent",
      description:
        "Full detail of one agent: latest version's system prompt, greeting, voice stack, and the resolved runnable config.",
      inputSchema: { agentId: z.string() },
    },
    async ({ agentId }) => {
      const agent = await loadAgent(ctx.orgId, agentId);
      if (!agent) return err(`No agent ${agentId} in this workspace`);
      const version = await latestVersion(agent.id);
      return json({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        type: agent.type,
        status: agent.status,
        publishedVersionId: agent.publishedVersionId,
        latestVersion: version
          ? {
              id: version.id,
              versionNumber: version.versionNumber,
              label: version.label,
              personaConfig: version.personaConfig,
              voiceConfig: version.voiceConfig,
              advancedConfig: version.advancedConfig,
            }
          : null,
      });
    }
  );

  // ── Build tools ───────────────────────────────────────────────────────────

  server.registerTool(
    "create_agent",
    {
      title: "Create agent",
      description:
        "Create a new voice agent (with version 1 as a draft). Write the system prompt for speech: short sentences, no markdown. Publish with publish_agent, try it with start_test_call.",
      inputSchema: {
        name: z.string().min(1),
        description: z.string().optional(),
        systemPrompt: z.string().min(1).describe("The agent's brain — instructions written for spoken conversation"),
        greetingMessage: z.string().optional().describe("Exact first line spoken (bypasses the LLM)"),
        agentSpeaksFirst: z.boolean().optional().default(true),
        ...VOICE_FIELDS,
      },
    },
    async ({ name, description, systemPrompt, greetingMessage, agentSpeaksFirst, ...voice }) => {
      const personaConfig: Partial<PersonaConfig> = {
        systemPrompt,
        ...(greetingMessage !== undefined ? { greetingMessage } : {}),
        ...(agentSpeaksFirst !== undefined ? { agentSpeaksFirst } : {}),
      };
      const voiceConfig = voiceFromFlat(voice);

      const result = await db.transaction(async (tx) => {
        const [agent] = await tx
          .insert(agents)
          .values({
            orgId: ctx.orgId,
            name,
            description,
            type: "simple",
            tags: ["mcp"],
            createdBy: ctx.userId,
          })
          .returning();
        const [v1] = await tx
          .insert(agentVersions)
          .values({
            agentId: agent.id,
            versionNumber: 1,
            personaConfig,
            voiceConfig,
            toolsConfig: [],
            knowledgeBaseBindings: [],
            createdBy: ctx.userId,
          })
          .returning();
        return { agent, version: v1 };
      });

      return json({
        created: true,
        agentId: result.agent.id,
        versionId: result.version.id,
        status: result.agent.status,
        dashboardUrl: `${clientUrl()}/agents/${result.agent.id}`,
        next: "Call publish_agent to make it live, or start_test_call to try it in the browser.",
      });
    }
  );

  server.registerTool(
    "update_agent",
    {
      title: "Update agent",
      description:
        "Change an agent's prompt, greeting or voice stack. Creates a new immutable version cloned from the latest (versions are append-only). Re-publish to make it live.",
      inputSchema: {
        agentId: z.string(),
        systemPrompt: z.string().optional(),
        greetingMessage: z.string().optional(),
        agentSpeaksFirst: z.boolean().optional(),
        label: z.string().optional().describe("Short note describing the change"),
        ...VOICE_FIELDS,
      },
    },
    async ({ agentId, systemPrompt, greetingMessage, agentSpeaksFirst, label, ...voice }) => {
      const agent = await loadAgent(ctx.orgId, agentId);
      if (!agent) return err(`No agent ${agentId} in this workspace`);
      const latest = await latestVersion(agent.id);

      const personaConfig: Partial<PersonaConfig> = {
        ...(latest?.personaConfig ?? {}),
        ...(systemPrompt !== undefined ? { systemPrompt } : {}),
        ...(greetingMessage !== undefined ? { greetingMessage } : {}),
        ...(agentSpeaksFirst !== undefined ? { agentSpeaksFirst } : {}),
      };
      const voiceConfig: Partial<VoiceConfig> = {
        ...(latest?.voiceConfig ?? {}),
        ...(voiceFromFlat(voice) ?? {}),
      };

      const [version] = await db
        .insert(agentVersions)
        .values({
          agentId: agent.id,
          versionNumber: (latest?.versionNumber ?? 0) + 1,
          label: label ?? latest?.label ?? null,
          personaConfig,
          voiceConfig,
          advancedConfig: latest?.advancedConfig ?? null,
          flowConfig: latest?.flowConfig ?? null,
          toolsConfig: latest?.toolsConfig ?? [],
          knowledgeBaseBindings: latest?.knowledgeBaseBindings ?? [],
          createdBy: ctx.userId,
        })
        .returning();

      await db.update(agents).set({ updatedAt: new Date() }).where(eq(agents.id, agent.id));

      return json({
        updated: true,
        agentId: agent.id,
        versionId: version.id,
        versionNumber: version.versionNumber,
        next: "This version is a draft. Call publish_agent with this versionId to serve it.",
      });
    }
  );

  server.registerTool(
    "publish_agent",
    {
      title: "Publish agent",
      description:
        "Pin a version as the live one served to calls and mark the agent active. Defaults to the latest version.",
      inputSchema: {
        agentId: z.string(),
        versionId: z.string().optional().describe("Defaults to the latest version"),
      },
    },
    async ({ agentId, versionId }) => {
      const agent = await loadAgent(ctx.orgId, agentId);
      if (!agent) return err(`No agent ${agentId} in this workspace`);

      let targetId = versionId;
      if (!targetId) {
        const latest = await latestVersion(agent.id);
        if (!latest) return err("Agent has no versions to publish");
        targetId = latest.id;
      } else {
        const [v] = await db
          .select({ id: agentVersions.id })
          .from(agentVersions)
          .where(and(eq(agentVersions.id, targetId), eq(agentVersions.agentId, agent.id)));
        if (!v) return err(`Version ${targetId} does not belong to agent ${agentId}`);
      }

      await db
        .update(agents)
        .set({ publishedVersionId: targetId, status: "active", updatedAt: new Date() })
        .where(eq(agents.id, agent.id));

      return json({ published: true, agentId: agent.id, versionId: targetId, status: "active" });
    }
  );

  // ── Operate tools ─────────────────────────────────────────────────────────

  server.registerTool(
    "start_test_call",
    {
      title: "Start test call",
      description:
        "Dispatch a browser test call for an agent: creates the call row, boots a live voice pipeline on the engine, and returns the URLs to talk to it. Open testPageUrl in a browser to speak with the agent.",
      inputSchema: {
        agentId: z.string(),
        versionId: z.string().optional().describe("Defaults to published, then latest"),
        variables: z.record(z.string(), z.string()).optional().describe('Per-call {{variable}} values'),
      },
    },
    async ({ agentId, versionId, variables }) => {
      const resolved = await resolveAgentConfig(ctx.orgId, agentId, versionId);
      if (!resolved) return err(`Agent ${agentId} (or a usable version) not found`);

      const [call] = await db
        .insert(calls)
        .values({
          orgId: ctx.orgId,
          agentId: resolved.agent.id,
          agentVersionId: resolved.version.id,
          mode: "web_test",
          direction: "inbound",
          status: "queued",
          variables: variables ?? {},
          metadata: { source: "mcp" },
        })
        .returning();

      const ack = await dispatchToEngine(
        buildDispatchRequest({
          callId: call.id,
          orgId: ctx.orgId,
          agentId: resolved.agent.id,
          versionId: resolved.version.id,
          mode: "web_test",
          direction: "inbound",
          agentConfig: resolved.agentConfig,
          variables: variables ?? {},
          metadata: { source: "mcp" },
        })
      );

      if (!ack.accepted) {
        await db
          .update(calls)
          .set({ status: "failed", error: ack.reason })
          .where(eq(calls.id, call.id));
        return err(`Voice engine rejected dispatch: ${ack.reason}`);
      }

      return json({
        callId: call.id,
        testPageUrl: `${clientUrl()}/agents/${resolved.agent.id}/test`,
        engineOfferUrl: engineOfferUrl(),
        note: "The pipeline is waiting. Connect WebRTC audio via engineOfferUrl (body: { sdp, type, call_id }), or open testPageUrl. The end-of-call report lands in get_call afterwards.",
      });
    }
  );

  server.registerTool(
    "list_calls",
    {
      title: "List calls",
      description: "Recent calls with status, duration, QA score, cost and summary.",
      inputSchema: {
        agentId: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional().default(20),
      },
    },
    async ({ agentId, limit }) => {
      const rows = await db
        .select({ call: calls, agentName: agents.name })
        .from(calls)
        .leftJoin(agents, eq(calls.agentId, agents.id))
        .where(
          agentId
            ? and(eq(calls.orgId, ctx.orgId), eq(calls.agentId, agentId))
            : eq(calls.orgId, ctx.orgId)
        )
        .orderBy(desc(calls.createdAt))
        .limit(limit ?? 20);

      return json(
        rows.map(({ call, agentName }) => ({
          id: call.id,
          agent: agentName,
          mode: call.mode,
          status: call.status,
          startedAt: call.startedAt,
          durationSecs: call.durationSecs,
          qaScore: call.callQualityScore,
          sentiment: call.sentiment,
          cost: call.totalCost,
          summary: call.summary,
        }))
      );
    }
  );

  server.registerTool(
    "get_call",
    {
      title: "Get call",
      description: "Full call detail including the turn-by-turn transcript and post-call analysis.",
      inputSchema: { callId: z.string() },
    },
    async ({ callId }) => {
      const [row] = await db
        .select({ call: calls, agentName: agents.name })
        .from(calls)
        .leftJoin(agents, eq(calls.agentId, agents.id))
        .where(and(eq(calls.id, callId), eq(calls.orgId, ctx.orgId)));
      if (!row) return err(`No call ${callId} in this workspace`);

      const { call } = row;
      return json({
        id: call.id,
        agent: row.agentName,
        mode: call.mode,
        direction: call.direction,
        status: call.status,
        startedAt: call.startedAt,
        endedAt: call.endedAt,
        durationSecs: call.durationSecs,
        transcript: call.transcript ?? [],
        metrics: call.metrics ?? {},
        qaScore: call.callQualityScore,
        sentiment: call.sentiment,
        summary: call.summary,
        cost: call.totalCost,
        error: call.error,
      });
    }
  );

  server.registerTool(
    "get_analytics_summary",
    {
      title: "Analytics summary",
      description: "Workspace KPIs over a window: call volume, completion rate, minutes, average QA score, total cost.",
      inputSchema: {
        days: z.number().int().min(1).max(365).optional().default(30),
      },
    },
    async ({ days }) => {
      const since = new Date();
      since.setDate(since.getDate() - (days ?? 30));

      const [agg] = await db
        .select({
          totalCalls: sql<number>`count(*)::int`,
          completed: sql<number>`count(*) filter (where ${calls.status} = 'completed')::int`,
          totalSecs: sql<number>`coalesce(sum(${calls.durationSecs}), 0)::int`,
          avgQa: sql<number | null>`avg(${calls.callQualityScore})`,
          totalCost: sql<number>`coalesce(sum(${calls.totalCost}), 0)`,
        })
        .from(calls)
        .where(and(eq(calls.orgId, ctx.orgId), gte(calls.createdAt, since)));

      return json({
        windowDays: days ?? 30,
        totalCalls: agg.totalCalls,
        completedCalls: agg.completed,
        completionRate: agg.totalCalls > 0 ? +((agg.completed / agg.totalCalls) * 100).toFixed(1) : null,
        totalMinutes: Math.round(agg.totalSecs / 60),
        avgQaScore: agg.avgQa !== null ? +Number(agg.avgQa).toFixed(1) : null,
        totalCost: +Number(agg.totalCost).toFixed(2),
      });
    }
  );

  server.registerTool(
    "get_credit_balance",
    {
      title: "Credit balance",
      description: "Prepaid credit balance and lifetime totals for the workspace.",
      inputSchema: {},
    },
    async () => {
      const [row] = await db.select().from(orgCredits).where(eq(orgCredits.orgId, ctx.orgId));
      return json(
        row
          ? {
              balance: row.balance,
              totalDeposited: row.totalDeposited,
              totalSpent: row.totalSpent,
              lowBalanceThreshold: row.lowBalanceThreshold,
            }
          : { balance: 0, note: "No credit row yet for this org" }
      );
    }
  );

  return server;
}
