/**
 * Config resolution: DB agent + version → the resolved AgentConfig the voice
 * engine consumes (the @vaani/shared contract). The engine reads nothing else
 * per-agent, so everything a call needs is assembled here.
 */

import { and, eq, desc } from "drizzle-orm";
import { AgentConfigSchema, type AgentConfig } from "@vaani/shared";
import { db } from "../db/index.js";
import { agents, agentVersions } from "../db/schema/index.js";

export interface ResolvedAgent {
  agent: typeof agents.$inferSelect;
  version: typeof agentVersions.$inferSelect;
  agentConfig: AgentConfig;
}

/**
 * Resolve an agent to a runnable config, scoped to the org.
 *
 * @param versionId  Explicit version to run. Falls back to the agent's
 *                   published version, then the latest version.
 * Returns null when the agent (in this org) or a usable version is missing.
 */
export async function resolveAgentConfig(
  orgId: string,
  agentId: string,
  versionId?: string
): Promise<ResolvedAgent | null> {
  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.orgId, orgId)));
  if (!agent) return null;

  const targetVersionId = versionId ?? agent.publishedVersionId ?? undefined;

  let version: typeof agentVersions.$inferSelect | undefined;
  if (targetVersionId) {
    [version] = await db
      .select()
      .from(agentVersions)
      .where(and(eq(agentVersions.id, targetVersionId), eq(agentVersions.agentId, agentId)));
  } else {
    [version] = await db
      .select()
      .from(agentVersions)
      .where(eq(agentVersions.agentId, agentId))
      .orderBy(desc(agentVersions.versionNumber))
      .limit(1);
  }
  if (!version) return null;

  // Build the raw shape then let the Zod schema apply defaults / validate. This
  // is the single point where stored partial config becomes a complete contract.
  const raw: Record<string, unknown> = {
    type: agent.type,
    voice: version.voiceConfig ?? {},
    advanced: version.advancedConfig ?? {},
    tools: version.toolsConfig ?? [],
    knowledgeBases: version.knowledgeBaseBindings ?? [],
  };
  if (agent.type === "simple") {
    raw.persona = version.personaConfig ?? { systemPrompt: "You are a helpful voice assistant." };
  } else {
    raw.flow = version.flowConfig ?? {};
  }

  const agentConfig = AgentConfigSchema.parse(raw);
  return { agent, version, agentConfig };
}
