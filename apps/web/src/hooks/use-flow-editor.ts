"use client";

import * as React from "react";
import {
  useNodesState,
  type Connection,
  type NodeChange,
} from "@xyflow/react";
import {
  type FlowConfig,
  type FlowNodeData,
  type FlowNodeType,
  type FlowTransition,
  type FlowValidationError,
  type SourceHandle,
  makeNode,
  starterFlow,
  toSnakeCase,
  uniqueTransitionName,
} from "@/lib/flow-contract";
import {
  type EdgeDescriptor,
  type RFNode,
  configToNodes,
  nodesToConfig,
  nodesToEdges,
  parseEdgeId,
} from "@/lib/flow-transform";
import { autoLayoutNodes } from "@/lib/flow-layout";

// ── History ──────────────────────────────────────────────────────────────────

const MAX_HISTORY = 50;
const HISTORY_DEBOUNCE_MS = 200;

// ── Options ────────────────────────────────────────────────────────────────

export interface UseFlowEditorOptions {
  /**
   * The graph to open. Pass `agent.flowConfig` (already loaded server-side) or a
   * template; falls back to a minimal contract-valid starter when absent.
   */
  initialConfig?: FlowConfig | null;
  /** Name used for the starter graph's meta when no config is supplied. */
  fallbackName?: string;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * The single source of truth for the flow canvas. Owns the React Flow node
 * array, the current selection, dirty tracking, undo/redo history, the parked
 * validation results, and the id of the node highlighted during a test call.
 *
 * Edges are a pure projection of the nodes' transitions (via `nodesToEdges`),
 * so there is no separate edge state to keep in sync. The serialized
 * `flowConfig` round-trips every meta/global field by re-applying the preserved
 * base config in `nodesToConfig`.
 */
export function useFlowEditor(options: UseFlowEditorOptions = {}) {
  const { initialConfig, fallbackName = "Untitled flow" } = options;

  // Resolve the opening graph exactly once (useNodesState takes an eager value,
  // not a lazy initializer, so we can't recompute this per render).
  const initialRef = React.useRef<FlowConfig>(
    initialConfig && initialConfig.nodes?.length
      ? initialConfig
      : starterFlow(fallbackName),
  );

  // Meta + global blocks (everything on FlowConfig except `nodes`) live here so
  // the serialized config keeps them across every node edit.
  const [baseConfig, setBaseConfig] = React.useState<FlowConfig>(initialRef.current);

  const [nodes, setNodes, onNodesChangeRaw] = useNodesState<RFNode>(
    configToNodes(initialRef.current),
  );

  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = React.useState<string | null>(null);
  const [isDirty, setIsDirty] = React.useState(false);
  const [validationErrors, setValidationErrors] = React.useState<FlowValidationError[]>([]);
  /** Node currently active in the test call (drives canvas highlighting). */
  const [activeNodeId, setActiveNodeId] = React.useState<string | null>(null);

  const idCounter = React.useRef(0);

  // ── Derived views ──────────────────────────────────────────────────────────

  const edges = React.useMemo<EdgeDescriptor[]>(() => nodesToEdges(nodes), [nodes]);

  const flowConfig = React.useMemo<FlowConfig>(
    () => nodesToConfig(nodes, baseConfig),
    [nodes, baseConfig],
  );

  const selectedNode = React.useMemo(
    () => (selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) ?? null : null),
    [nodes, selectedNodeId],
  );

  const errorNodeIds = React.useMemo(
    () => new Set(validationErrors.map((e) => e.nodeId).filter(Boolean) as string[]),
    [validationErrors],
  );

  const isValid = validationErrors.length === 0;

  // ── Undo / redo history (snapshots of the node array) ────────────────────────

  const historyRef = React.useRef<RFNode[][]>([]);
  const historyIndexRef = React.useRef(-1);
  const isTimeTravelingRef = React.useRef(false);
  const pushTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [historyVersion, setHistoryVersion] = React.useState(0);

  // Seed history with the initial graph exactly once.
  React.useEffect(() => {
    historyRef.current = [structuredClone(nodes)];
    historyIndexRef.current = 0;
    setHistoryVersion((v) => v + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushHistory = React.useCallback((snapshot: RFNode[]) => {
    if (isTimeTravelingRef.current) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      const idx = historyIndexRef.current;
      const trimmed = historyRef.current.slice(0, idx + 1);
      trimmed.push(structuredClone(snapshot));
      if (trimmed.length > MAX_HISTORY) trimmed.shift();
      historyRef.current = trimmed;
      historyIndexRef.current = trimmed.length - 1;
      setHistoryVersion((v) => v + 1);
    }, HISTORY_DEBOUNCE_MS);
  }, []);

  // Record a history entry after every (non-time-travel) node mutation.
  const isFirstRunRef = React.useRef(true);
  React.useEffect(() => {
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      return;
    }
    if (isTimeTravelingRef.current) return;
    pushHistory(nodes);
  }, [nodes, pushHistory]);

  const restore = React.useCallback(
    (snapshot: RFNode[]) => {
      isTimeTravelingRef.current = true;
      setNodes(structuredClone(snapshot));
      setIsDirty(true);
      requestAnimationFrame(() => {
        isTimeTravelingRef.current = false;
      });
    },
    [setNodes],
  );

  const undo = React.useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx <= 0) return;
    historyIndexRef.current = idx - 1;
    setHistoryVersion((v) => v + 1);
    restore(historyRef.current[idx - 1]);
  }, [restore]);

  const redo = React.useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx >= historyRef.current.length - 1) return;
    historyIndexRef.current = idx + 1;
    setHistoryVersion((v) => v + 1);
    restore(historyRef.current[idx + 1]);
  }, [restore]);

  // historyVersion is read so canUndo/canRedo recompute after each mutation.
  void historyVersion;
  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  // ── Canvas change handlers ───────────────────────────────────────────────────

  const onNodesChange = React.useCallback(
    (changes: NodeChange<RFNode>[]) => {
      // Protect the single `initial` node from deletion.
      const filtered = changes.filter((c) => {
        if (c.type === "remove") {
          const n = nodes.find((node) => node.id === c.id);
          if (n?.data.kind === "initial") return false;
        }
        return true;
      });
      if (filtered.length === 0) return;
      onNodesChangeRaw(filtered);
      if (filtered.some((c) => c.type === "position" || c.type === "remove")) {
        setIsDirty(true);
      }
    },
    [nodes, onNodesChangeRaw],
  );

  // ── Mutations ────────────────────────────────────────────────────────────────

  const updateNodeData = React.useCallback(
    (nodeId: string, patch: Partial<FlowNodeData>) => {
      setNodes((ns) =>
        ns.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, node: { ...n.data.node, ...patch } } }
            : n,
        ),
      );
      setIsDirty(true);
    },
    [setNodes],
  );

  const addNode = React.useCallback(
    (kind: FlowNodeType): string => {
      let id = "";
      setNodes((ns) => {
        const taken = new Set(ns.map((n) => n.id));
        do {
          idCounter.current += 1;
          id = `${kind}_${idCounter.current}`;
        } while (taken.has(id));
        const maxX = ns.reduce((m, n) => Math.max(m, n.position.x), 0);
        const position = { x: maxX + 320, y: 260 };
        const created = makeNode(kind, id, position);
        const rf: RFNode = {
          id,
          type: "flowNode",
          position,
          data: { kind, node: created.data },
        };
        return [...ns, rf];
      });
      setSelectedNodeId(id);
      setSelectedEdgeId(null);
      setIsDirty(true);
      return id;
    },
    [setNodes],
  );

  const deleteNode = React.useCallback(
    (nodeId: string) => {
      setNodes((ns) => {
        const target = ns.find((n) => n.id === nodeId);
        if (target?.data.kind === "initial") return ns; // protect start node
        return ns
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
          });
      });
      setSelectedNodeId((cur) => (cur === nodeId ? null : cur));
      setSelectedEdgeId(null);
      setIsDirty(true);
    },
    [setNodes],
  );

  const onConnect = React.useCallback(
    (conn: Connection) => {
      if (!conn.source || !conn.target) return;
      setNodes((ns) => {
        const source = ns.find((n) => n.id === conn.source);
        const target = ns.find((n) => n.id === conn.target);
        if (!source) return ns;
        const fns = source.data.node.functions ?? [];
        const branch = (conn.sourceHandle as SourceHandle | null) ?? undefined;

        // A named branch (transfer/sms) wires the existing transition that owns
        // that handle rather than minting a duplicate.
        if (branch) {
          const idx = fns.findIndex((f) => f.sourceHandle === branch);
          if (idx >= 0) {
            const next = fns.map((f, i) =>
              i === idx ? { ...f, targetNode: conn.target! } : f,
            );
            return ns.map((n) =>
              n.id === conn.source
                ? { ...n, data: { ...n.data, node: { ...n.data.node, functions: next } } }
                : n,
            );
          }
        }

        const taken = new Set(fns.map((f) => f.name));
        const baseName = branch ?? `to_${target?.data.node.label ?? conn.target}`;
        const fn: FlowTransition = {
          name: uniqueTransitionName(toSnakeCase(baseName), taken),
          description: "",
          handlerType: "transition",
          targetNode: conn.target,
          sourceHandle: branch,
        };
        return ns.map((n) =>
          n.id === conn.source
            ? { ...n, data: { ...n.data, node: { ...n.data.node, functions: [...fns, fn] } } }
            : n,
        );
      });
      setIsDirty(true);
    },
    [setNodes],
  );

  const onEdgesDelete = React.useCallback(
    (deleted: { id: string }[]) => {
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
      setIsDirty(true);
    },
    [setNodes],
  );

  const autoLayout = React.useCallback(() => {
    setNodes((ns) => autoLayoutNodes(ns, nodesToEdges(ns)));
    setIsDirty(true);
  }, [setNodes]);

  // ── Meta / global config ─────────────────────────────────────────────────────

  const setFlowConfig = React.useCallback(
    (updater: FlowConfig | ((prev: FlowConfig) => FlowConfig)) => {
      setBaseConfig((prev) => (typeof updater === "function" ? updater(prev) : updater));
      setIsDirty(true);
    },
    [],
  );

  /** Replace the entire graph (e.g. applying a template). Resets selection. */
  const loadConfig = React.useCallback(
    (config: FlowConfig) => {
      setBaseConfig(config);
      setNodes(configToNodes(config));
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setIsDirty(true);
    },
    [setNodes],
  );

  // ── Selection ────────────────────────────────────────────────────────────────

  const selectNode = React.useCallback((id: string | null) => {
    setSelectedNodeId(id);
    setSelectedEdgeId(null);
  }, []);

  const selectEdge = React.useCallback((id: string | null) => {
    setSelectedEdgeId(id);
    if (id) setSelectedNodeId(parseEdgeId(id)[0]);
  }, []);

  const clearSelection = React.useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, []);

  // Sync a base-config write against the serialized graph (keeps baseConfig's
  // `nodes` array from going stale if a caller reads it directly).
  const markClean = React.useCallback(() => {
    setBaseConfig(flowConfig);
    setIsDirty(false);
  }, [flowConfig]);

  return {
    // graph
    nodes,
    edges,
    flowConfig,
    baseConfig,
    // selection
    selectedNodeId,
    selectedEdgeId,
    selectedNode,
    selectNode,
    selectEdge,
    clearSelection,
    // mutations
    onNodesChange,
    onConnect,
    onEdgesDelete,
    addNode,
    updateNodeData,
    deleteNode,
    autoLayout,
    setFlowConfig,
    loadConfig,
    // dirty
    isDirty,
    setIsDirty,
    markClean,
    // validation (populated by useFlowValidation)
    validationErrors,
    setValidationErrors,
    errorNodeIds,
    isValid,
    // test-call node highlighting (populated by useFlowTesting)
    activeNodeId,
    setActiveNodeId,
    // history
    undo,
    redo,
    canUndo,
    canRedo,
  };
}

export type UseFlowEditorReturn = ReturnType<typeof useFlowEditor>;
