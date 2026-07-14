import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { FlowDesigner } from "@/components/flow/flow-designer";

export default async function FlowPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  const [agent, tools, knowledgeBases] = await Promise.all([
    api.getAgent(agentId),
    api.getTools(),
    api.getKnowledgeBases(),
  ]);
  if (!agent) notFound();

  return <FlowDesigner agent={agent} tools={tools} knowledgeBases={knowledgeBases} />;
}
