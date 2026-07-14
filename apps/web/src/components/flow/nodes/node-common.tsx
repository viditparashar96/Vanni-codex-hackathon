"use client";

import * as React from "react";
import type { FlowNodeType, FlowValidationError } from "@/lib/flow-contract";
import type { RFNodeData } from "@/lib/flow-transform";
import { useOptionalFlowContext } from "@/components/flow/flow-context";
import { cn } from "@/lib/utils";

/**
 * Shared chrome for the flow-canvas node components.
 *
 * Every node kind gets its own file (matching one React Flow custom node per
 * type), but they all share the same brutalist card shell, handle styling, and
 * the decorations sourced from the flow-editor context — so those live here to
 * keep the per-kind files focused on their own header/body layout.
 */

/** Base class for every node handle: a small lime dot with the ink outline. */
export const HANDLE_BASE =
  "!size-2.5 !rounded-full !border-[1.5px] !border-ink !bg-lime";

/** Tint applied to a named branch handle so success/failure read at a glance. */
export const HANDLE_TINT: Record<string, string> = {
  "transfer-failure": "!bg-brand-orange",
  "sms-success": "!bg-forest",
  "sms-failure": "!bg-brand-orange",
};

/** Header band chrome per node kind (colour + icon tint). */
export const HEADER_CHROME: Record<FlowNodeType, { band: string; icon: string }> = {
  initial: { band: "bg-forest text-paper", icon: "text-lime" },
  node: { band: "bg-sand text-ink", icon: "text-forest" },
  end: { band: "bg-ink text-paper", icon: "text-brand-orange" },
  transfer: { band: "bg-brand-orange text-paper", icon: "text-paper" },
  dtmf: { band: "bg-sand text-ink", icon: "text-forest" },
  sms: { band: "bg-brand-yellow text-ink", icon: "text-forest" },
};

/**
 * Decorations layered on top of the graph data by the surrounding editor:
 * inline validation issues, whether this node is the one currently active in a
 * live test call, and an optional "reachable from anywhere" flag. All are inert
 * when the node is rendered outside a {@link FlowProvider}.
 */
export function useNodeDecorations(id: string, data: RFNodeData) {
  const ctx = useOptionalFlowContext();

  const issues = React.useMemo<FlowValidationError[]>(
    () => (ctx ? ctx.validationErrors.filter((e) => e.nodeId === id) : []),
    [ctx, id],
  );

  const isActive = ctx?.activeNodeId === id;
  // No FlowConfig field marks a node global; the canvas may tag the RF node
  // with a transient `isGlobal` decoration, which we read defensively.
  const isGlobal = Boolean((data as { isGlobal?: unknown }).isGlobal);

  return { issues, isActive, isGlobal };
}

/**
 * The outer card class shared by every node. `isActive` (live-test highlight)
 * wins over selection, which wins over the resting global/plain treatment.
 */
export function nodeShellClass({
  selected,
  isActive,
  isGlobal,
}: {
  selected?: boolean;
  isActive: boolean;
  isGlobal: boolean;
}): string {
  return cn(
    "relative w-[248px] overflow-hidden rounded-2xl border-[1.5px] bg-paper text-ink transition-shadow",
    isActive
      ? "flow-node-active border-forest"
      : selected
        ? "border-forest shadow-[5px_5px_0_var(--ink)]"
        : isGlobal
          ? "border-forest/60 shadow-[3px_3px_0_var(--ink)]"
          : "border-ink shadow-[3px_3px_0_var(--ink)]",
  );
}

/** Prompt preview drawn from a node's first task message. */
export function nodePrompt(data: RFNodeData): string {
  return data.node.taskMessages?.[0]?.content?.trim() || "No prompt configured";
}

/** "N functions" / "N keys" style pluralised count. */
export function pluralCount(n: number, singular: string): string {
  return `${n} ${singular}${n === 1 ? "" : "s"}`;
}
