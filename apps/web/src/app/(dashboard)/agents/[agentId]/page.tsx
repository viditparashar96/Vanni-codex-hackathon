import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { AgentBuilder } from "@/components/agents/agent-builder";

export default async function AgentPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  const [agent, tools, kbs] = await Promise.all([
    api.getAgent(agentId),
    api.getTools(),
    api.getKnowledgeBases(),
  ]);
  if (!agent) notFound();

  return <AgentBuilder agent={agent} tools={tools} kbs={kbs} />;
}
