"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft,
  CircleCheck,
  Flag,
  Grid3x3,
  LayoutGrid,
  Loader2,
  MessageSquare,
  MousePointerClick,
  PanelRight,
  Phone,
  PhoneForwarded,
  PhoneOff,
  Plus,
  Redo2,
  Save,
  Send,
  ShieldCheck,
  Sliders,
  TriangleAlert,
  Undo2,
} from "lucide-react";
import type { Agent, KnowledgeBase, ToolDef } from "@/types";
import { api } from "@/lib/api-client";
import {
  ADDABLE_NODE_TYPES,
  type CustomVariable,
  type FlowConfig,
  type FlowNodeType,
  type FlowValidationError,
  type SourceHandle,
  validateFlowGraph,
} from "@/lib/flow-contract";
import { type EdgeDescriptor, type RFNode, parseEdgeId } from "@/lib/flow-transform";
import { nodeTypes } from "@/components/flow/flow-nodes";
import { NodeInspector } from "@/components/flow/node-inspector";
import { FlowProvider } from "@/components/flow/flow-context";
import { ResizableSplit } from "@/components/flow/resizable-split";
import { FlowTestPanel } from "@/components/flow/flow-test-panel";
import {
  FlowTestSetupDialog,
  type FlowTestStartOptions,
} from "@/components/flow/flow-test-setup-dialog";
import { GlobalSettingsDialog } from "@/components/flow/global-settings-dialog";
import { useFlowEditor } from "@/hooks/use-flow-editor";
import { useFlowValidation } from "@/hooks/use-flow-validation";
import { useFlowTesting } from "@/hooks/use-flow-testing";
import { useFlowPersistence } from "@/hooks/use-flow-persistence";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const API_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_API_URL);

// ── Node palette ──────────────────────────────────────────────────────────────

const PALETTE: {
  kind: FlowNodeType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  telephony?: boolean;
}[] = (
  [
    { kind: "node", label: "Conversation stage", icon: MessageSquare },
    { kind: "end", label: "End (hang up)", icon: Flag },
    { kind: "transfer", label: "Call transfer", icon: PhoneForwarded, telephony: true },
    { kind: "dtmf", label: "Send digits (DTMF)", icon: Grid3x3, telephony: true },
    { kind: "sms", label: "Send SMS", icon: Send, telephony: true },
  ] as const
).filter((p) => ADDABLE_NODE_TYPES.includes(p.kind));

// ── Edge styling (matches the dashboard's design language) ──────────────────────

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

function descriptorToEdge(d: EdgeDescriptor, selected: boolean, active: boolean): Edge {
  const branch = d.sourceHandle as SourceHandle | undefined;
  const color = active ? "var(--forest)" : branch ? HANDLE_COLOR[branch] : "var(--ink)";
  return {
    id: d.id,
    source: d.source,
    target: d.target,
    sourceHandle: d.sourceHandle,
    label: d.transition.name,
    selected,
    markerEnd: { ...marker, color },
    style: { strokeWidth: active ? 3 : selected ? 2.5 : 1.5, stroke: color },
    labelStyle,
    labelBgStyle: labelBg,
    labelBgPadding: [6, 3] as [number, number],
    labelBgBorderRadius: 6,
    animated: active,
  };
}

/** Recover a leading `[nodeId]` tag from a backend error string, if present. */
function parseError(message: string): FlowValidationError {
  const m = /^\[([^\]]+)\]\s*(.*)$/.exec(message);
  return m ? { nodeId: m[1], message: m[2] } : { message };
}

// ── Public wrapper ──────────────────────────────────────────────────────────────

export function FlowDesigner({
  agent,
  tools,
  knowledgeBases,
}: {
  agent: Agent;
  tools: ToolDef[];
  knowledgeBases: KnowledgeBase[];
}) {
  return (
    <ReactFlowProvider>
      <FlowDesignerInner agent={agent} tools={tools} knowledgeBases={knowledgeBases} />
    </ReactFlowProvider>
  );
}

// ── Editor shell ────────────────────────────────────────────────────────────────

function FlowDesignerInner({
  agent,
  tools,
  knowledgeBases,
}: {
  agent: Agent;
  tools: ToolDef[];
  knowledgeBases: KnowledgeBase[];
}) {
  const editor = useFlowEditor({
    initialConfig: (agent.flowConfig as FlowConfig | null | undefined) ?? null,
    fallbackName: agent.name,
  });
  const {
    nodes,
    edges,
    flowConfig,
    baseConfig,
    selectedNodeId,
    selectedEdgeId,
    selectedNode,
    selectNode,
    selectEdge,
    clearSelection,
    onNodesChange,
    onConnect,
    onEdgesDelete,
    addNode,
    updateNodeData,
    deleteNode,
    autoLayout,
    setFlowConfig,
    isDirty,
    markClean,
    validationErrors,
    setValidationErrors,
    errorNodeIds,
    isValid,
    activeNodeId,
    setActiveNodeId,
    undo,
    redo,
    canUndo,
    canRedo,
  } = editor;

  const [rightPanel, setRightPanel] = React.useState<"inspect" | "test">("inspect");
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [testSetupOpen, setTestSetupOpen] = React.useState(false);
  const [validateBusy, setValidateBusy] = React.useState(false);

  // ── Live validation (local instant + backend authoritative) ──
  useFlowValidation({
    agentId: agent.id,
    flowConfig,
    onResult: setValidationErrors,
  });

  // ── Test call over SmallWebRTC (highlights the active node on the canvas) ──
  const testing = useFlowTesting({
    agentId: agent.id,
    onNodeTransition: setActiveNodeId,
  });
  const isTestActive = testing.status === "live" || testing.status === "connecting";

  // ── Persistence + keyboard shortcuts ──
  const { saving, save } = useFlowPersistence({
    agentId: agent.id,
    flowConfig,
    isDirty,
    label: `Flow v${agent.version + 1}`,
    validate: () => validateFlowGraph(flowConfig),
    onSaved: (version) => {
      markClean();
      toast.success(`Saved as version ${version.versionNumber}`, {
        description: "Flow validated — new version created.",
      });
    },
    onError: (err) => toast.error("Save failed", { description: err.message }),
    onBlocked: (errs) =>
      toast.error("Fix validation errors before saving", {
        description: `${errs.length} issue${errs.length === 1 ? "" : "s"} remaining.`,
      }),
    onUndo: undo,
    onRedo: redo,
  });

  // ── Auto-detect {{variable}} refs across node text, merged with defined ──
  const allCustomVariables = React.useMemo<CustomVariable[]>(() => {
    const defined = flowConfig.customVariables ?? [];
    const names = new Set(defined.map((v) => v.name));
    const BUILT_IN = new Set([
      "current_date",
      "current_time",
      "current_day",
      "timezone",
      "agent_name",
      "org_name",
    ]);
    const detected = new Set<string>();
    const re = /\{\{\s*(\w+)\s*\}\}/g;
    for (const n of nodes) {
      const d = n.data.node;
      const texts = [
        d.firstMessage,
        d.smsContent,
        d.summaryPrompt,
        ...(d.taskMessages ?? []).map((m) => m.content),
        ...(d.roleMessages ?? []).map((m) => m.content),
      ].filter(Boolean) as string[];
      for (const t of texts) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(t)) !== null) {
          const name = m[1];
          if (!names.has(name) && !BUILT_IN.has(name)) detected.add(name);
        }
      }
    }
    return [...defined, ...[...detected].map((name) => ({ name, defaultValue: "" }))];
  }, [flowConfig.customVariables, nodes]);

  // ── Derived canvas views ──
  const rfEdges = React.useMemo<Edge[]>(
    () =>
      edges.map((d) =>
        descriptorToEdge(d, d.id === selectedEdgeId, isTestActive && d.source === activeNodeId),
      ),
    [edges, selectedEdgeId, isTestActive, activeNodeId],
  );

  const styledNodes = React.useMemo<RFNode[]>(
    () =>
      nodes.map((n) => {
        if (isTestActive && n.id === activeNodeId) {
          return {
            ...n,
            style: { ...n.style, borderRadius: 18, boxShadow: "0 0 0 3px var(--forest)" },
          };
        }
        if (errorNodeIds.has(n.id)) {
          return {
            ...n,
            style: { ...n.style, borderRadius: 18, boxShadow: "0 0 0 2.5px var(--orange)" },
          };
        }
        return { ...n, style: { ...n.style, boxShadow: undefined } };
      }),
    [nodes, errorNodeIds, isTestActive, activeNodeId],
  );

  // ── Handlers ──
  const handleValidate = React.useCallback(async () => {
    const local = validateFlowGraph(flowConfig);
    setValidationErrors(local);
    if (!API_CONFIGURED) {
      if (local.length === 0) toast.success("Flow is valid");
      else
        toast.error(`${local.length} issue${local.length === 1 ? "" : "s"} found`, {
          description: local[0]?.message,
        });
      return;
    }
    setValidateBusy(true);
    try {
      const res = await api.validateFlow(
        agent.id,
        flowConfig as unknown as Record<string, unknown>,
      );
      setValidationErrors(res.errors.map(parseError));
      if (res.valid) toast.success("Flow is valid");
      else
        toast.error(`${res.errors.length} issue${res.errors.length === 1 ? "" : "s"} found`, {
          description: res.errors[0],
        });
    } catch {
      toast.message("Validated locally", {
        description: "Backend unavailable — showing local checks only.",
      });
    } finally {
      setValidateBusy(false);
    }
  }, [agent.id, flowConfig, setValidationErrors]);

  const handleTestButton = React.useCallback(() => {
    if (isTestActive) {
      testing.stop();
      setRightPanel("inspect");
      return;
    }
    if (isDirty) {
      void save().then((version) => {
        if (version) setTestSetupOpen(true);
      });
    } else {
      setTestSetupOpen(true);
    }
  }, [isTestActive, isDirty, save, testing]);

  const handleTestStart = React.useCallback(
    (_options: FlowTestStartOptions) => {
      setRightPanel("test");
      void testing.start();
    },
    [testing],
  );

  const handleAddNode = React.useCallback(
    (kind: FlowNodeType) => {
      addNode(kind);
      setRightPanel("inspect");
      toast(`${kind} node added`, {
        description: "Wire its transitions on the canvas or in the inspector.",
      });
    },
    [addNode],
  );

  // Inspector targets + edge focus.
  const inspectorTargets = React.useMemo(
    () =>
      selectedNode
        ? nodes
            .filter((n) => n.id !== selectedNode.id)
            .map((n) => ({ id: n.id, label: n.data.node.label, kind: n.data.kind }))
        : [],
    [nodes, selectedNode],
  );
  const focusTransition =
    selectedNode && selectedEdgeId
      ? selectedNode.data.node.functions.findIndex(
          (f) => f.name === parseEdgeId(selectedEdgeId)[1],
        )
      : null;

  const nodeCount = nodes.length;
  const errorCount = validationErrors.length;

  // ── Right-panel content ──
  const inspectorContent = selectedNode ? (
    <NodeInspector
      key={selectedNode.id}
      embedded
      nodeId={selectedNode.id}
      kind={selectedNode.data.kind}
      data={selectedNode.data.node}
      targets={inspectorTargets}
      tools={tools}
      knowledgeBases={knowledgeBases}
      customVariables={allCustomVariables}
      onChange={(patch) => updateNodeData(selectedNode.id, patch)}
      onDelete={() => deleteNode(selectedNode.id)}
      onClose={clearSelection}
      focusTransition={focusTransition}
    />
  ) : (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="flex size-11 items-center justify-center rounded-full border-[1.5px] border-ink bg-cream text-muted-foreground">
        <MousePointerClick className="size-5" />
      </span>
      <div>
        <p className="text-[13px] font-semibold text-ink">Select a node to edit it</p>
        <p className="mt-1 max-w-[32ch] text-[11px] leading-snug text-muted-foreground">
          Click any node on the canvas, or configure the whole flow — persona,
          context, tools, variables and call settings.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setSettingsOpen(true)}
        className="flex items-center gap-1.5 rounded-full border-[1.5px] border-border bg-paper px-3.5 py-2 font-display text-[9.5px] font-extrabold tracking-[0.1em] text-muted-foreground uppercase hover:border-ink hover:text-ink"
      >
        <Sliders className="size-3" />
        Flow settings
      </button>
    </div>
  );

  const canvasContent = (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={styledNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        nodeTypes={nodeTypes}
        onNodeClick={(_, n) => {
          selectNode(n.id);
          setRightPanel("inspect");
        }}
        onEdgeClick={(_, e) => {
          selectEdge(e.id);
          setRightPanel("inspect");
        }}
        onPaneClick={clearSelection}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        deleteKeyCode={["Backspace", "Delete"]}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color="#d9d4c5" />
        <Controls position="bottom-left" showInteractive={false} />
      </ReactFlow>

      {/* validation errors */}
      {!isValid && (
        <div className="absolute inset-x-4 bottom-4 z-10 max-w-[520px] rounded-2xl border-[1.5px] border-brand-orange bg-paper p-3.5 shadow-[3px_3px_0_var(--ink)]">
          <div className="eyebrow mb-1.5 flex items-center gap-1.5 text-[9.5px] text-brand-orange">
            <TriangleAlert className="size-3" />
            Validation
          </div>
          <ul className="max-h-28 space-y-1 overflow-y-auto text-[11.5px] leading-snug text-ink">
            {validationErrors.map((e, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-brand-orange">•</span>
                {e.nodeId ? `[${e.nodeId}] ${e.message}` : e.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-96px)] flex-col">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b-[1.5px] border-ink/10 px-4 py-3">
        <div className="flex items-center gap-4">
          <Link
            href={`/agents/${agent.id}`}
            className="flex size-9 items-center justify-center rounded-full border-[1.5px] border-ink bg-paper shadow-[2px_2px_0_var(--ink)] transition-transform hover:-translate-x-0.5"
            aria-label="Back to agent"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <div className="eyebrow text-[9.5px] text-muted-foreground">Flow designer</div>
            <h1 className="display truncate text-[20px] text-ink">{agent.name}</h1>
          </div>
          {isValid ? (
            <span className="sticker ml-1 text-[9px]">
              <CircleCheck className="size-3 text-forest" />
              Valid · {nodeCount} nodes
            </span>
          ) : (
            <span className="sticker ml-1 border-brand-orange text-[9px] text-brand-orange">
              <TriangleAlert className="size-3" />
              {errorCount} issue{errorCount === 1 ? "" : "s"}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">
            {isDirty ? "Unsaved changes" : "All changes saved"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Add node */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-9 items-center gap-1.5 rounded-full border-[1.5px] border-border bg-paper px-3.5 font-display text-[10px] font-extrabold tracking-[0.1em] text-muted-foreground uppercase hover:border-ink hover:text-ink"
              >
                <Plus className="size-3.5" />
                Add node
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {PALETTE.filter((p) => !p.telephony).map((p) => (
                <DropdownMenuItem key={p.kind} onClick={() => handleAddNode(p.kind)}>
                  <p.icon className="mr-2 size-4 text-muted-foreground" />
                  {p.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[9.5px] tracking-wide text-muted-foreground uppercase">
                Telephony
              </DropdownMenuLabel>
              {PALETTE.filter((p) => p.telephony).map((p) => (
                <DropdownMenuItem key={p.kind} onClick={() => handleAddNode(p.kind)}>
                  <p.icon className="mr-2 size-4 text-muted-foreground" />
                  {p.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Auto layout */}
          <IconPill onClick={autoLayout} title="Auto-arrange nodes">
            <LayoutGrid className="size-4" />
          </IconPill>

          {/* Flow settings */}
          <IconPill onClick={() => setSettingsOpen(true)} title="Flow settings">
            <Sliders className="size-4" />
          </IconPill>

          <div className="mx-0.5 h-5 w-px bg-ink/15" />

          {/* Undo / redo */}
          <IconPill onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
            <Undo2 className="size-4" />
          </IconPill>
          <IconPill onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)">
            <Redo2 className="size-4" />
          </IconPill>

          <div className="mx-0.5 h-5 w-px bg-ink/15" />

          {/* Validate */}
          <button
            type="button"
            onClick={handleValidate}
            disabled={validateBusy}
            className="flex h-9 items-center gap-1.5 rounded-full border-[1.5px] border-border bg-paper px-4 font-display text-[10px] font-extrabold tracking-[0.1em] text-muted-foreground uppercase hover:border-ink hover:text-ink disabled:opacity-50"
          >
            {validateBusy ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
            Validate
          </button>

          {/* Save */}
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !isValid}
            className="flex h-9 items-center gap-2 rounded-full bg-ink px-5 font-display text-[10px] font-extrabold tracking-[0.1em] text-paper uppercase transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            {saving ? "Saving" : isDirty ? "Save flow" : "Saved"}
          </button>

          {/* Test */}
          <button
            type="button"
            onClick={handleTestButton}
            disabled={!isValid && !isTestActive}
            title={
              !isValid && !isTestActive
                ? "Fix flow errors before testing"
                : isTestActive
                  ? "End the test call"
                  : "Start a browser test call"
            }
            className={
              isTestActive
                ? "flex h-9 items-center gap-2 rounded-full bg-brand-orange px-5 font-display text-[10px] font-extrabold tracking-[0.1em] text-paper uppercase transition-transform hover:-translate-y-0.5"
                : "flex h-9 items-center gap-2 rounded-full bg-forest px-5 font-display text-[10px] font-extrabold tracking-[0.1em] text-lime uppercase transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            }
          >
            {isTestActive ? <PhoneOff className="size-3.5" /> : <Phone className="size-3.5" />}
            {isTestActive ? "End test" : "Test"}
          </button>
        </div>
      </div>

      {/* ── Canvas + inspector split ── */}
      <FlowProvider value={editor}>
        <div className="min-h-0 flex-1 overflow-hidden">
          <ResizableSplit
            left={canvasContent}
            right={
              <div className="h-full overflow-hidden border-l-[1.5px] border-ink/10 bg-paper">
                {/* Panel switcher */}
                <div className="flex items-center gap-1 border-b-[1.5px] border-ink/10 px-3 py-2">
                  {(
                    [
                      { id: "inspect", label: "Inspect", icon: PanelRight },
                      { id: "test", label: "Test", icon: Phone },
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setRightPanel(p.id)}
                      className={
                        rightPanel === p.id
                          ? "flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 font-display text-[9.5px] font-extrabold tracking-[0.1em] text-paper uppercase"
                          : "flex items-center gap-1.5 rounded-full px-3 py-1.5 font-display text-[9.5px] font-extrabold tracking-[0.1em] text-muted-foreground uppercase hover:text-ink"
                      }
                    >
                      <p.icon className="size-3" />
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="h-[calc(100%-45px)]">
                  {rightPanel === "test" ? (
                    <FlowTestPanel
                      status={testing.status}
                      error={testing.error}
                      events={testing.events}
                      elapsedSec={testing.elapsedSec}
                      isMuted={testing.isMuted}
                      activeNodeId={activeNodeId}
                      activeNodeLabel={
                        activeNodeId
                          ? nodes.find((n) => n.id === activeNodeId)?.data.node.label
                          : null
                      }
                      onStart={() => void testing.start()}
                      onStop={() => {
                        testing.stop();
                        setRightPanel("inspect");
                      }}
                      onToggleMute={testing.toggleMute}
                      onClose={() => setRightPanel("inspect")}
                    />
                  ) : (
                    inspectorContent
                  )}
                </div>
              </div>
            }
          />
        </div>
      </FlowProvider>

      {/* ── Dialogs ── */}
      <GlobalSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        config={baseConfig}
        onChange={setFlowConfig}
        tools={tools}
        knowledgeBases={knowledgeBases}
      />
      <FlowTestSetupDialog
        open={testSetupOpen}
        onOpenChange={setTestSetupOpen}
        customVariables={allCustomVariables}
        onStart={handleTestStart}
      />
    </div>
  );
}

// ── Small toolbar icon button ────────────────────────────────────────────────

function IconPill({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex size-9 items-center justify-center rounded-full border-[1.5px] border-border bg-paper text-muted-foreground transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
