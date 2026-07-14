import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { TestConsole } from "@/components/agents/test-console";

export default async function TestPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  const agent = await api.getAgent(agentId);
  if (!agent) notFound();

  return <TestConsole agent={agent} />;
}
