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
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  Flag,
  Grid3x3,
  MessageSquare,
  PhoneForwarded,
  Play,
  Plus,
  X,
} from "lucide-react";
import type { Agent, FlowNodeData, FlowNodeKind } from "@/types";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { nodeTypes } from "@/components/flow/flow-nodes";

const initialNodes: Node[] = [
  {
    id: "greet",
    type: "stage",
    position: { x: 0, y: 160 },
    data: {
      kind: "initial" as FlowNodeKind,
      label: "Greet & verify identity",
      task: "Confirm you're speaking with the patient. Verify DOB before discussing any appointment details.",
      toolCount: 1,
      firstMessage: "Hi, this is Riya calling from Acme Inc about an upcoming appointment.",
    },
  },
  {
    id: "confirm",
    type: "stage",
    position: { x: 340, y: 60 },
    data: {
      kind: "node" as FlowNodeKind,
      label: "Confirm appointment",
      task: "State the appointment date, time and provider. Ask if it still works.",
      toolCount: 1,
      kbBound: true,
    },
  },
  {
    id: "reschedule",
    type: "stage",
    position: { x: 680, y: 0 },
    data: {
      kind: "node" as FlowNodeKind,
      label: "Offer new slots",
      task: "Fetch open slots for the same provider. Offer at most two options at a time.",
      toolCount: 2,
      modelOverride: "gpt-4.1",
    },
  },
  {
    id: "sms",
    type: "stage",
    position: { x: 1020, y: 60 },
    data: {
      kind: "sms" as FlowNodeKind,
      label: "Send confirmation SMS",
      task: "Text the confirmed date, time, and clinic address to the caller's mobile.",
    },
  },
  {
    id: "transfer",
    type: "stage",
    position: { x: 680, y: 330 },
    data: {
      kind: "transfer" as FlowNodeKind,
      label: "Warm transfer to desk",
      task: "Announce the caller and hand over with a one-line summary of the conversation.",
    },
  },
  {
    id: "end",
    type: "stage",
    position: { x: 1360, y: 180 },
    data: {
      kind: "end" as FlowNodeKind,
      label: "Wrap up & goodbye",
      task: "Thank the caller, restate any confirmed changes, and end the call politely.",
    },
  },
];

const edgeStyle = { strokeWidth: 1.5 };
const marker = { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "var(--ink)" };
const labelStyle = {
  fontSize: 10,
  fontWeight: 700,
  fill: "var(--ink)",
  fontFamily: "var(--font-inter-tight)",
  letterSpacing: "0.06em",
};
const labelBg = { fill: "var(--cream)", fillOpacity: 0.95 };

const initialEdges: Edge[] = [
  { id: "e1", source: "greet", target: "confirm", label: "identity_verified", markerEnd: marker, style: edgeStyle, labelStyle, labelBgStyle: labelBg, labelBgPadding: [6, 3] as [number, number], labelBgBorderRadius: 6 },
  { id: "e2", source: "greet", target: "transfer", label: "requests_human", markerEnd: marker, style: edgeStyle, labelStyle, labelBgStyle: labelBg, labelBgPadding: [6, 3] as [number, number], labelBgBorderRadius: 6 },
  { id: "e3", source: "confirm", target: "end", label: "appointment_confirmed", markerEnd: marker, style: edgeStyle, labelStyle, labelBgStyle: labelBg, labelBgPadding: [6, 3] as [number, number], labelBgBorderRadius: 6 },
  { id: "e4", source: "confirm", target: "reschedule", label: "wants_reschedule", markerEnd: marker, style: edgeStyle, labelStyle, labelBgStyle: labelBg, labelBgPadding: [6, 3] as [number, number], labelBgBorderRadius: 6 },
  { id: "e5", source: "reschedule", target: "sms", label: "slot_selected", markerEnd: marker, style: edgeStyle, labelStyle, labelBgStyle: labelBg, labelBgPadding: [6, 3] as [number, number], labelBgBorderRadius: 6 },
  { id: "e6", source: "sms", target: "end", label: "sms_success", markerEnd: marker, style: edgeStyle, labelStyle, labelBgStyle: labelBg, labelBgPadding: [6, 3] as [number, number], labelBgBorderRadius: 6 },
  { id: "e7", source: "sms", target: "transfer", label: "sms_failure", markerEnd: marker, style: edgeStyle, labelStyle, labelBgStyle: labelBg, labelBgPadding: [6, 3] as [number, number], labelBgBorderRadius: 6 },
  { id: "e8", source: "transfer", target: "end", label: "transfer_failure", markerEnd: marker, style: edgeStyle, labelStyle, labelBgStyle: labelBg, labelBgPadding: [6, 3] as [number, number], labelBgBorderRadius: 6 },
];

const PALETTE: { kind: FlowNodeKind; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { kind: "node", label: "Stage", icon: MessageSquare },
  { kind: "transfer", label: "Transfer", icon: PhoneForwarded },
  { kind: "sms", label: "SMS", icon: MessageSquare },
  { kind: "dtmf", label: "DTMF", icon: Grid3x3 },
  { kind: "end", label: "End", icon: Flag },
];

export function FlowDesigner({ agent }: { agent: Agent }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const counter = React.useRef(0);

  const selected = nodes.find((n) => n.id === selectedId);
  const selectedData = selected?.data as FlowNodeData | undefined;
  const outgoing = edges.filter((e) => e.source === selectedId);

  const addNode = (kind: FlowNodeKind, label: string) => {
    counter.current += 1;
    const id = `new_${kind}_${counter.current}`;
    setNodes((ns) => [
      ...ns,
      {
        id,
        type: "stage",
        position: { x: 340 + counter.current * 40, y: 480 + counter.current * 20 },
        data: {
          kind,
          label: `New ${label.toLowerCase()}`,
          task: "Describe this stage's objective — the LLM uses it as the node prompt.",
        },
      },
    ]);
    setSelectedId(id);
    toast(`${label} node added`, { description: "Drag it into place, then wire its transitions." });
  };

  const updateSelected = (patch: Partial<FlowNodeData>) => {
    if (!selectedId) return;
    setNodes((ns) =>
      ns.map((n) => (n.id === selectedId ? { ...n, data: { ...n.data, ...patch } } : n)),
    );
  };

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
          <span className="sticker ml-2 text-[9px]">
            <CircleCheck className="size-3 text-forest" />
            Valid — 1 entry · 1 end · no dead ends
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {PALETTE.map((p) => (
            <button
              key={p.kind + p.label}
              type="button"
              onClick={() => addNode(p.kind, p.label)}
              className="flex items-center gap-1.5 rounded-full border-[1.5px] border-border bg-paper px-3.5 py-2 font-display text-[10px] font-extrabold tracking-[0.1em] text-muted-foreground uppercase transition-colors hover:border-ink hover:text-ink"
            >
              <Plus className="size-3" />
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => toast.success(`Published v${agent.version + 1}`, { description: "Flow validated — serving calls now." })}
            className="group ml-2 flex h-10 items-center gap-2 rounded-full bg-ink px-5 font-display text-[11px] font-extrabold tracking-[0.1em] text-paper uppercase transition-transform hover:-translate-y-0.5"
          >
            Publish
            <span className="flex size-5 items-center justify-center rounded-full bg-lime text-forest transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="size-3 stroke-[3]" />
            </span>
          </button>
        </div>
      </div>

      {/* canvas + inspector */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-3xl border-[1.5px] border-ink bg-paper shadow-[6px_6px_0_var(--ink)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeClick={(_, n) => setSelectedId(n.id)}
          onPaneClick={() => setSelectedId(null)}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color="#d9d4c5" />
          <Controls position="bottom-left" showInteractive={false} />
        </ReactFlow>

        {/* inspector */}
        {selected && selectedData && (
          <aside className="absolute inset-y-4 right-4 z-10 flex w-[300px] flex-col overflow-y-auto rounded-2xl border-[1.5px] border-ink bg-paper p-5 shadow-[4px_4px_0_var(--ink)]">
            <div className="mb-4 flex items-center justify-between">
              <span className="eyebrow flex items-center gap-1.5 text-[9.5px] text-muted-foreground">
                <Play className="size-3" />
                {selectedData.kind} node
              </span>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="flex size-6 items-center justify-center rounded-full hover:bg-sand"
                aria-label="Close inspector"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <label className="eyebrow mb-1.5 block text-[9.5px] text-ink">Label</label>
            <Input
              value={selectedData.label}
              onChange={(e) => updateSelected({ label: e.target.value })}
              className="mb-4 h-10 rounded-xl border-[1.5px] border-input text-[13px]"
            />

            <label className="eyebrow mb-1.5 block text-[9.5px] text-ink">Objective (task message)</label>
            <Textarea
              value={selectedData.task}
              onChange={(e) => updateSelected({ task: e.target.value })}
              className="mb-4 min-h-[96px] rounded-xl border-[1.5px] border-input text-[12.5px] leading-relaxed"
            />

            {selectedData.kind === "initial" && (
              <>
                <label className="eyebrow mb-1.5 block text-[9.5px] text-ink">First message (exact TTS)</label>
                <Textarea
                  value={selectedData.firstMessage ?? ""}
                  onChange={(e) => updateSelected({ firstMessage: e.target.value })}
                  className="mb-4 min-h-[64px] rounded-xl border-[1.5px] border-input text-[12.5px]"
                />
              </>
            )}

            <label className="eyebrow mb-1.5 block text-[9.5px] text-ink">Context strategy</label>
            <Select defaultValue="append">
              <SelectTrigger className="mb-4 h-10 w-full rounded-xl border-[1.5px] border-input text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="append">Append — keep full history</SelectItem>
                <SelectItem value="reset">Reset — fresh context</SelectItem>
                <SelectItem value="reset_with_summary">Reset with summary</SelectItem>
              </SelectContent>
            </Select>

            {outgoing.length > 0 && (
              <>
                <div className="eyebrow mb-2 text-[9.5px] text-ink">Transitions</div>
                <div className="space-y-2">
                  {outgoing.map((e) => (
                    <div key={e.id} className="rounded-xl bg-cream/80 px-3 py-2.5">
                      <div className="font-mono text-[11.5px] font-semibold text-forest">{String(e.label)}</div>
                      <div className="mt-0.5 text-[10.5px] text-muted-foreground">
                        → {nodes.find((n) => n.id === e.target)?.data.label as string}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
