/**
 * Bridge between the authoring contract (`FlowConfig`) and the React Flow
 * canvas model. Nodes carry the full node data (including their outgoing
 * `functions`) as the single source of truth; edges are a pure projection of
 * every transition that targets another node. `end_conversation` transitions
 * have no target and therefore no edge — they live only in the inspector.
 */

import type { Node } from "@xyflow/react";
import {
  type FlowConfig,
  type FlowNode,
  type FlowNodeData,
  type FlowNodeType,
  type FlowTransition,
  isTerminalNode,
} from "@/lib/flow-contract";

/** Data carried on every React Flow node. */
export interface RFNodeData {
  kind: FlowNodeType;
  node: FlowNodeData;
  [key: string]: unknown;
}

export type RFNode = Node<RFNodeData>;

/** Descriptor for a derived edge, before canvas styling is applied. */
export interface EdgeDescriptor {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  /** The transition this edge renders. */
  transition: FlowTransition;
}

export const EDGE_ID_SEP = "::";

/** Stable edge id from a source node + its transition name. */
export function edgeId(sourceId: string, fnName: string): string {
  return `${sourceId}${EDGE_ID_SEP}${fnName}`;
}

/** Split an edge id back into [sourceId, fnName]. */
export function parseEdgeId(id: string): [string, string] {
  const idx = id.indexOf(EDGE_ID_SEP);
  if (idx === -1) return [id, ""];
  return [id.slice(0, idx), id.slice(idx + EDGE_ID_SEP.length)];
}

const GRID_X = 340;
const GRID_Y = 180;

/** FlowConfig → React Flow nodes. Positions fall back to a simple grid. */
export function configToNodes(config: FlowConfig): RFNode[] {
  return config.nodes.map((n, i) => ({
    id: n.id,
    type: "flowNode",
    position: n.position ?? { x: (i % 4) * GRID_X, y: Math.floor(i / 4) * GRID_Y },
    data: { kind: n.type, node: n.data },
  }));
}

/** Derive the canvas edges from the nodes' transitions. */
export function nodesToEdges(nodes: RFNode[]): EdgeDescriptor[] {
  const known = new Set(nodes.map((n) => n.id));
  const edges: EdgeDescriptor[] = [];
  for (const n of nodes) {
    for (const fn of n.data.node.functions ?? []) {
      if (fn.handlerType === "end_conversation") continue;
      if (!fn.targetNode || !known.has(fn.targetNode)) continue;
      edges.push({
        id: edgeId(n.id, fn.name),
        source: n.id,
        target: fn.targetNode,
        sourceHandle: fn.sourceHandle,
        transition: fn,
      });
    }
  }
  return edges;
}

/** React Flow nodes → FlowConfig, preserving meta/global blocks. */
export function nodesToConfig(
  nodes: RFNode[],
  base: FlowConfig,
): FlowConfig {
  const serialized: FlowNode[] = nodes.map((n) => ({
    id: n.id,
    type: n.data.kind,
    position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
    data: cleanNodeData(n.data.node, n.data.kind),
  }));
  return { ...base, nodes: serialized };
}

/**
 * Strip node data down to the fields that matter for its kind and drop empty
 * optionals so the serialized config stays close to what a human authored.
 */
function cleanNodeData(data: FlowNodeData, kind: FlowNodeType): FlowNodeData {
  const out: FlowNodeData = {
    label: data.label,
    taskMessages:
      data.taskMessages?.length > 0
        ? data.taskMessages
        : [{ role: "system", content: "" }],
    functions: (data.functions ?? []).map((f) => ({ ...f })),
  };

  if (data.roleMessages?.length) out.roleMessages = data.roleMessages;
  if (data.respondImmediately !== undefined)
    out.respondImmediately = data.respondImmediately;
  if (data.firstMessage) out.firstMessage = data.firstMessage;
  if (data.contextStrategy) out.contextStrategy = data.contextStrategy;
  if (data.summaryPrompt) out.summaryPrompt = data.summaryPrompt;
  if (data.toolIds?.length) out.toolIds = data.toolIds;
  if (data.knowledgeBase?.knowledgeBaseId)
    out.knowledgeBase = data.knowledgeBase;

  const so = pruneServiceOverrides(data.serviceOverrides);
  if (so) out.serviceOverrides = so;

  if (kind === "transfer") {
    if (data.transferTo) out.transferTo = data.transferTo;
    if (data.transferType) out.transferType = data.transferType;
  }
  if (kind === "dtmf") {
    if (data.dtmfDigits) out.dtmfDigits = data.dtmfDigits;
  }
  if (kind === "sms") {
    if (data.smsContent) out.smsContent = data.smsContent;
    if (data.smsTo) out.smsTo = data.smsTo;
    if (data.smsTo === "static" && data.smsToNumber)
      out.smsToNumber = data.smsToNumber;
  }
  return out;
}

function pruneServiceOverrides(
  so: FlowNodeData["serviceOverrides"],
): FlowNodeData["serviceOverrides"] | undefined {
  if (!so) return undefined;
  const out: NonNullable<FlowNodeData["serviceOverrides"]> = {};
  if (so.llm && (so.llm.model || so.llm.temperature !== undefined))
    out.llm = so.llm;
  if (so.tts && (so.tts.model || so.tts.voice || so.tts.speed !== undefined))
    out.tts = so.tts;
  if (so.stt && (so.stt.model || so.stt.language)) out.stt = so.stt;
  if (so.sttMute) out.sttMute = so.sttMute;
  return Object.keys(out).length ? out : undefined;
}

/** Convenience re-export used by the designer's dead-end hints. */
export { isTerminalNode };
