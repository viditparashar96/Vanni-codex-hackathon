"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  useNodesState,
  type Connection,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft,
  CircleCheck,
  Flag,
  Grid3x3,
  Loader2,
  MessageSquare,
  PhoneForwarded,
  Plus,
  Save,
  Send,
  TriangleAlert,
} from "lucide-react";
import type { Agent, KnowledgeBase, ToolDef } from "@/types";
import { api } from "@/lib/api-client";
import {
  ADDABLE_NODE_TYPES,
  type FlowConfig,
  type FlowNodeData,
  type FlowNodeType,
  type FlowTransition,
  type SourceHandle,
  makeNode,
  starterFlow,
  toSnakeCase,
  uniqueTransitionName,
  validateFlowGraph,
} from "@/lib/flow-contract";
import {
  type EdgeDescriptor,
  type RFNode,
  configToNodes,
  nodesToConfig,
  nodesToEdges,
  parseEdgeId,
} from "@/lib/flow-transform";
import { nodeTypes } from "@/components/flow/flow-nodes";
import { NodeInspector } from "@/components/flow/node-inspector";

const API_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_API_URL);

const PALETTE: { kind: FlowNodeType; label: string; icon: React.ComponentType<{ className?: string }> }[] = (
  [
    { kind: "node", label: "Stage", icon: MessageSquare },
    { kind: "transfer", label: "Transfer", icon: PhoneForwarded },
    { kind: "sms", label: "SMS", icon: Send },
    { kind: "dtmf", label: "DTMF", icon: Grid3x3 },
    { kind: "end", label: "End", icon: Flag },
  ] as { kind: FlowNodeType; label: string; icon: React.ComponentType<{ className?: string }> }[]
).filter((p) => ADDABLE_NODE_TYPES.includes(p.kind));

// ── Edge styling (matches the dashboard's design language) ───────────────────
const marker = { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "var(--ink)" };
const HANDLE_COLOR: Record<SourceHandle, string> = {
  "transfer-failure": "var(--orange)",
  "sms-success": "var(--forest)",
  "sms-failure": "var(--orange)",
};
const labelStyle = {
  fontSize: 10,
  fontWeight: 700,
  fill: "var(--ink)",
  fontFamily: "var(--font-inter-tight)",
  letterSpacing: "0.04em",
};
const labelBg = { fill: "var(--cream)", fillOpacity: 0.95 };

function descriptorToEdge(d: EdgeDescriptor, selected: boolean): Edge {
  const branch = d.sourceHandle as SourceHandle | undefined;
  const color = branch ? HANDLE_COLOR[branch] : "var(--ink)";
  return {
    id: d.id,
    source: d.source,
    target: d.target,
    sourceHandle: d.sourceHandle,
    label: d.transition.name,
    selected,
    markerEnd: { ...marker, color },
    style: { strokeWidth: selected ? 2.5 : 1.5, stroke: color },
    labelStyle,
    labelBgStyle: labelBg,
    labelBgPadding: [6, 3] as [number, number],
    labelBgBorderRadius: 6,
  };
}

export function FlowDesigner({
  agent,
  tools,
  knowledgeBases,
}: {
  agent: Agent;
  tools: ToolDef[];
  knowledgeBases: KnowledgeBase[];
}) {
  // Base config (meta + global blocks) preserved across edits.
  const baseRef = React.useRef<FlowConfig>(
    (agent.flowConfig && (agent.flowConfig as unknown as FlowConfig).nodes?.length
      ? (agent.flowConfig as unknown as FlowConfig)
      : starterFlow(agent.name)),
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode>(
    configToNodes(baseRef.current),
  );
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [errorNodeIds, setErrorNodeIds] = React.useState<Set<string>>(new Set());
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const counter = React.useRef(0);

  // Edges are a pure projection of the nodes' transitions (single source of
  // truth), so there's no separate edge state to keep in sync.
  const edges = React.useMemo<Edge[]>(
    () => nodesToEdges(nodes).map((d) => descriptorToEdge(d, d.id === selectedEdgeId)),
    [nodes, selectedEdgeId],
  );

  // ── Live validation (local instant + backend authoritative) ───────────────
  React.useEffect(() => {
    const handle = setTimeout(() => {
      const config = nodesToConfig(nodes, baseRef.current);
      const local = validateFlowGraph(config);
      setErrors(local.map((e) => (e.nodeId ? `[${e.nodeId}] ${e.message}` : e.message)));
      setErrorNodeIds(new Set(local.map((e) => e.nodeId).filter(Boolean) as string[]));

      if (API_CONFIGURED) {
        api
          .validateFlow(agent.id, config as unknown as Record<string, unknown>)
          .then((res) => setErrors(res.errors))
          .catch(() => {
            /* keep local errors on network / unconfigured backend */
          });
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [nodes, agent.id]);

  const nodeMap = React.useMemo(() => {
    const m = new Map<string, RFNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) : undefined;

  // ── Mutations ─────────────────────────────────────────────────────────────
  const updateNodeData = React.useCallback(
    (nodeId: string, patch: Partial<FlowNodeData>) => {
      setNodes((ns) =>
        ns.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, node: { ...n.data.node, ...patch } } } : n,
        ),
      );
      setDirty(true);
    },
    [setNodes],
  );

  const deleteNode = React.useCallback(
    (nodeId: string) => {
      setNodes((ns) =>
        ns
          .filter((n) => n.id !== nodeId)
          .map((n) => {
            const fns = n.data.node.functions ?? [];
            if (!fns.some((f) => f.targetNode === nodeId)) return n;
            return {
              ...n,
              data: {
                ...n.data,
                node: {
                  ...n.data.node,
                  functions: fns.map((f) =>
                    f.targetNode === nodeId ? { ...f, targetNode: undefined } : f,
                  ),
                },
              },
            };
          }),
      );
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setDirty(true);
    },
    [setNodes],
  );

  const addNode = (kind: FlowNodeType) => {
    counter.current += 1;
    const existing = new Set(nodes.map((n) => n.id));
    let id = `${kind}_${counter.current}`;
    while (existing.has(id)) {
      counter.current += 1;
      id = `${kind}_${counter.current}`;
    }
    const position = {
      x: 120 + (counter.current % 4) * 60,
      y: 420 + (counter.current % 5) * 40,
    };
    const created = makeNode(kind, id, position);
    setNodes((ns) => [
      ...ns,
      { id, type: "flowNode", position, data: { kind, node: created.data } },
    ]);
    setSelectedNodeId(id);
    setSelectedEdgeId(null);
    setDirty(true);
    toast(`${kind} node added`, { description: "Wire its transitions on the canvas or in the inspector." });
  };

  // ── Canvas interaction ────────────────────────────────────────────────────
  const onConnect = React.useCallback(
    (conn: Connection) => {
      if (!conn.source || !conn.target) return;
      setNodes((ns) => {
        const source = ns.find((n) => n.id === conn.source);
        const targetNode = ns.find((n) => n.id === conn.target);
        if (!source) return ns;
        const taken = new Set(source.data.node.functions.map((f) => f.name));
        const branch = (conn.sourceHandle as SourceHandle | null) ?? undefined;
        const baseName = branch ?? `to_${targetNode?.data.node.label ?? conn.target}`;
        const fn: FlowTransition = {
          name: uniqueTransitionName(toSnakeCase(baseName), taken),
          description: "",
          handlerType: "transition",
          targetNode: conn.target,
          sourceHandle: branch,
        };
        return ns.map((n) =>
          n.id === conn.source
            ? { ...n, data: { ...n.data, node: { ...n.data.node, functions: [...n.data.node.functions, fn] } } }
            : n,
        );
      });
      setDirty(true);
    },
    [setNodes],
  );

  const onEdgesDelete = React.useCallback(
    (deleted: Edge[]) => {
      setNodes((ns) => {
        let next = ns;
        for (const e of deleted) {
          const [sourceId, fnName] = parseEdgeId(e.id);
          next = next.map((n) =>
            n.id === sourceId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    node: {
                      ...n.data.node,
                      functions: n.data.node.functions.filter((f) => f.name !== fnName),
                    },
                  },
                }
              : n,
          );
        }
        return next;
      });
      setDirty(true);
    },
    [setNodes],
  );

  // ── Save ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const config = nodesToConfig(nodes, baseRef.current);
    const local = validateFlowGraph(config);
    if (local.length > 0) {
      toast.error("Fix validation errors before saving", {
        description: `${local.length} issue${local.length === 1 ? "" : "s"} remaining.`,
      });
      return;
    }
    setSaving(true);
    try {
      const version = await api.saveFlow(
        agent.id,
        config as unknown as Record<string, unknown>,
        `Flow v${agent.version + 1}`,
      );
      baseRef.current = config;
      setDirty(false);
      toast.success(`Saved as version ${version.versionNumber}`, {
        description: "Flow validated — new version created.",
      });
    } catch (err) {
      toast.error("Save failed", {
        description: err instanceof Error ? err.message : "Could not create version.",
      });
    } finally {
      setSaving(false);
    }
  };

  const valid = errors.length === 0;
  const nodeCount = nodes.length;

  // Ring nodes that carry a validation error.
  const styledNodes = React.useMemo<RFNode[]>(
    () =>
      nodes.map((n) =>
        errorNodeIds.has(n.id)
          ? { ...n, style: { ...n.style, borderRadius: 18, boxShadow: "0 0 0 2.5px var(--orange)" } }
          : { ...n, style: { ...n.style, boxShadow: undefined } },
      ),
    [nodes, errorNodeIds],
  );

  return (
    <div className="mx-auto flex h-[calc(100vh-140px)] max-w-[1400px] flex-col">
      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pt-4 pb-5">
        <div className="flex items-center gap-4">
          <Link
            href={`/agents/${agent.id}`}
            className="flex size-9 items-center justify-center rounded-full border-[1.5px] border-ink bg-paper shadow-[2px_2px_0_var(--ink)] transition-transform hover:-translate-x-0.5"
            aria-label="Back to agent"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <div className="eyebrow text-[9.5px] text-muted-foreground">Flow designer</div>
            <h1 className="display text-[20px] text-ink">{agent.name}</h1>
          </div>
          {valid ? (
            <span className="sticker ml-2 text-[9px]">
              <CircleCheck className="size-3 text-forest" />
              Valid · {nodeCount} nodes
            </span>
          ) : (
            <span className="sticker ml-2 border-brand-orange text-[9px] text-brand-orange">
              <TriangleAlert className="size-3" />
              {errors.length} issue{errors.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {PALETTE.map((p) => (
            <button
              key={p.kind}
              type="button"
              onClick={() => addNode(p.kind)}
              className="flex items-center gap-1.5 rounded-full border-[1.5px] border-border bg-paper px-3.5 py-2 font-display text-[10px] font-extrabold tracking-[0.1em] text-muted-foreground uppercase transition-colors hover:border-ink hover:text-ink"
            >
              <Plus className="size-3" />
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !valid}
            className="group ml-2 flex h-10 items-center gap-2 rounded-full bg-ink px-5 font-display text-[11px] font-extrabold tracking-[0.1em] text-paper uppercase transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            {saving ? "Saving" : dirty ? "Save flow" : "Saved"}
          </button>
        </div>
      </div>

      {/* canvas + inspector */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-3xl border-[1.5px] border-ink bg-paper shadow-[6px_6px_0_var(--ink)]">
        <ReactFlow
          nodes={styledNodes}
          edges={edges}
          onNodesChange={(c) => {
            onNodesChange(c);
            if (c.some((ch) => ch.type === "position" || ch.type === "remove")) setDirty(true);
          }}
          onConnect={onConnect}
          onEdgesDelete={onEdgesDelete}
          nodeTypes={nodeTypes}
          onNodeClick={(_, n) => {
            setSelectedNodeId(n.id);
            setSelectedEdgeId(null);
          }}
          onEdgeClick={(_, e) => {
            const [sourceId] = parseEdgeId(e.id);
            setSelectedNodeId(sourceId);
            setSelectedEdgeId(e.id);
          }}
          onPaneClick={() => {
            setSelectedNodeId(null);
            setSelectedEdgeId(null);
          }}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color="#d9d4c5" />
          <Controls position="bottom-left" showInteractive={false} />
        </ReactFlow>

        {/* validation errors */}
        {!valid && (
          <div className="absolute inset-x-4 bottom-4 z-10 max-w-[520px] rounded-2xl border-[1.5px] border-brand-orange bg-paper p-3.5 shadow-[3px_3px_0_var(--ink)]">
            <div className="eyebrow mb-1.5 flex items-center gap-1.5 text-[9.5px] text-brand-orange">
              <TriangleAlert className="size-3" />
              Validation
            </div>
            <ul className="max-h-28 space-y-1 overflow-y-auto text-[11.5px] leading-snug text-ink">
              {errors.map((e, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="text-brand-orange">•</span>
                  {e}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* inspector */}
        {selectedNode && (
          <NodeInspector
            key={selectedNode.id}
            nodeId={selectedNode.id}
            kind={selectedNode.data.kind}
            data={selectedNode.data.node}
            targets={nodes
              .filter((n) => n.id !== selectedNode.id)
              .map((n) => ({ id: n.id, label: n.data.node.label, kind: n.data.kind }))}
            tools={tools}
            knowledgeBases={knowledgeBases}
            onChange={(patch) => updateNodeData(selectedNode.id, patch)}
            onDelete={() => deleteNode(selectedNode.id)}
            onClose={() => {
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
            }}
            focusTransition={
              selectedEdgeId
                ? selectedNode.data.node.functions.findIndex(
                    (f) => f.name === parseEdgeId(selectedEdgeId)[1],
                  )
                : null
            }
          />
        )}
      </div>
    </div>
  );
}
