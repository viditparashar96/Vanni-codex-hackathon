"use client";

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { GitBranch } from "lucide-react";
import type { SourceHandle } from "@/lib/flow-contract";

/** Branch tint so failure/success edges read at a glance (mirrors the handles). */
const BRANCH_STROKE: Record<SourceHandle, string> = {
  "transfer-failure": "var(--orange)",
  "sms-success": "var(--forest)",
  "sms-failure": "var(--orange)",
};

/**
 * Custom edge for a flow transition. Renders a bezier path with a floating
 * pill label (the transition name). It reacts to three states:
 *
 * - `selected` — the user picked this edge in the inspector.
 * - `data.highlighted` — the transition the live test call just traversed;
 *   drawn as an animated dashed line with a soft glow so the active path pops.
 * - resting — a thin ink line, optionally tinted for a named branch.
 */
export const TransitionEdge = memo(function TransitionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  selected,
  data,
  style,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const d = (data ?? {}) as { highlighted?: boolean; sourceHandle?: SourceHandle };
  const highlighted = !selected && Boolean(d.highlighted);
  const branchStroke = d.sourceHandle ? BRANCH_STROKE[d.sourceHandle] : undefined;

  const restingStroke = branchStroke ?? "var(--ink-soft)";
  const stroke = selected
    ? "var(--forest)"
    : highlighted
      ? "var(--forest)"
      : restingStroke;

  const displayLabel =
    typeof label === "string" && label.length > 28 ? `${label.slice(0, 26)}…` : label;

  return (
    <>
      {/* Soft glow beneath a highlighted (live-test) edge. */}
      {highlighted && (
        <path
          d={edgePath}
          fill="none"
          stroke="color-mix(in srgb, var(--lime) 55%, transparent)"
          strokeWidth={6}
          style={{ filter: "blur(3px)" }}
        />
      )}

      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke,
          strokeWidth: selected ? 2.5 : highlighted ? 2 : 1.5,
          transition: "stroke 150ms, stroke-width 150ms",
          ...(highlighted
            ? { strokeDasharray: "6 4", animation: "dashFlow 0.6s linear infinite" }
            : {}),
        }}
        interactionWidth={20}
      />

      {displayLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nopan nodrag"
          >
            <div
              className={`flex max-w-[200px] items-center gap-1.5 rounded-full border-[1.5px] px-2.5 py-1 font-display text-[9.5px] font-bold tracking-[0.04em] whitespace-nowrap transition-colors ${
                selected || highlighted
                  ? "border-forest bg-lime text-forest shadow-[2px_2px_0_var(--ink)]"
                  : "border-ink bg-paper text-ink shadow-[2px_2px_0_var(--ink)] hover:bg-cream"
              }`}
            >
              <GitBranch className="size-3 shrink-0" />
              <span className="truncate">{displayLabel}</span>
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
