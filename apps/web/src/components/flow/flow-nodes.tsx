"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  BookOpen,
  Cpu,
  Flag,
  Grid3x3,
  MessageSquare,
  PhoneForwarded,
  Play,
  Wrench,
} from "lucide-react";
import type { FlowNodeData, FlowNodeKind } from "@/types";
import { cn } from "@/lib/utils";

const KIND_META: Record<
  FlowNodeKind,
  { label: string; icon: React.ComponentType<{ className?: string }>; chrome: string; eyebrow: string }
> = {
  initial: {
    label: "Entry",
    icon: Play,
    chrome: "bg-forest text-paper border-ink",
    eyebrow: "text-lime",
  },
  node: {
    label: "Stage",
    icon: MessageSquare,
    chrome: "bg-paper text-ink border-ink",
    eyebrow: "text-muted-foreground",
  },
  transfer: {
    label: "Transfer",
    icon: PhoneForwarded,
    chrome: "bg-brand-orange text-paper border-ink",
    eyebrow: "text-paper/80",
  },
  dtmf: {
    label: "DTMF",
    icon: Grid3x3,
    chrome: "bg-sand text-ink border-ink",
    eyebrow: "text-muted-foreground",
  },
  sms: {
    label: "SMS",
    icon: MessageSquare,
    chrome: "bg-brand-yellow text-ink border-ink",
    eyebrow: "text-ink/60",
  },
  end: {
    label: "End",
    icon: Flag,
    chrome: "bg-ink text-paper border-ink",
    eyebrow: "text-paper/60",
  },
};

export function StageNode({ data, selected }: NodeProps) {
  const d = data as FlowNodeData;
  const meta = KIND_META[d.kind];
  const Icon = meta.icon;

  return (
    <div
      className={cn(
        "w-[240px] rounded-2xl border-[1.5px] p-4 transition-shadow",
        meta.chrome,
        selected ? "shadow-[5px_5px_0_var(--ink)]" : "shadow-[3px_3px_0_var(--ink)]",
      )}
    >
      {d.kind !== "initial" && (
        <Handle type="target" position={Position.Left} className="!-left-1.5" />
      )}

      <div className="flex items-center justify-between">
        <span className={cn("eyebrow flex items-center gap-1.5 text-[9px]", meta.eyebrow)}>
          <Icon className="size-3" />
          {meta.label}
        </span>
        {d.modelOverride && (
          <span className={cn("flex items-center gap-1 text-[9px] font-semibold", meta.eyebrow)}>
            <Cpu className="size-3" />
            {d.modelOverride}
          </span>
        )}
      </div>

      <div className="mt-2 font-display text-[14.5px] leading-tight font-bold">{d.label}</div>
      <p className={cn("mt-1.5 line-clamp-2 text-[11px] leading-snug", d.kind === "node" || d.kind === "dtmf" || d.kind === "sms" ? "text-muted-foreground" : "opacity-70")}>
        {d.task}
      </p>

      {(d.toolCount || d.kbBound) && (
        <div className="mt-3 flex items-center gap-2">
          {d.toolCount ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-current/25 px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase opacity-80">
              <Wrench className="size-2.5" />
              {d.toolCount} tools
            </span>
          ) : null}
          {d.kbBound ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-current/25 px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase opacity-80">
              <BookOpen className="size-2.5" />
              KB
            </span>
          ) : null}
        </div>
      )}

      {d.kind !== "end" && (
        <Handle type="source" position={Position.Right} className="!-right-1.5" />
      )}
    </div>
  );
}

export const nodeTypes = { stage: StageNode };
