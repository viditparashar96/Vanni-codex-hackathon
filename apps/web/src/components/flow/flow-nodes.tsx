"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  BookOpen,
  Cpu,
  Flag,
  Grid3x3,
  MessageSquare,
  MicOff,
  PhoneForwarded,
  Play,
  Send,
  Wrench,
} from "lucide-react";
import type { FlowNodeType } from "@/lib/flow-contract";
import { namedSourceHandles, usesOnlyNamedHandles } from "@/lib/flow-contract";
import type { RFNodeData } from "@/lib/flow-transform";
import { cn } from "@/lib/utils";

const KIND_META: Record<
  FlowNodeType,
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
    icon: Send,
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

const HANDLE_CLASS =
  "!size-2.5 !border-[1.5px] !border-ink !bg-paper";

/** Label + colour for the named (success/failure) source handles. */
const NAMED_HANDLE_META: Record<string, { label: string; dot: string }> = {
  "transfer-failure": { label: "on failure", dot: "!bg-brand-orange" },
  "sms-success": { label: "on success", dot: "!bg-forest" },
  "sms-failure": { label: "on failure", dot: "!bg-brand-orange" },
};

export function FlowStageNode({ data, selected }: NodeProps) {
  const d = data as RFNodeData;
  const meta = KIND_META[d.kind];
  const Icon = meta.icon;
  const node = d.node;
  const task = node.taskMessages?.[0]?.content ?? "";

  const named = namedSourceHandles(d.kind);
  const onlyNamed = usesOnlyNamedHandles(d.kind);
  const toolCount = node.toolIds?.length ?? 0;
  const kbBound = Boolean(node.knowledgeBase?.knowledgeBaseId);
  const modelOverride = node.serviceOverrides?.llm?.model;
  const sttMuted = node.serviceOverrides?.sttMute;

  // Telephony summary chip.
  const detailChip =
    d.kind === "transfer"
      ? node.transferTo || "no destination"
      : d.kind === "dtmf"
        ? node.dtmfDigits || "no digits"
        : d.kind === "sms"
          ? node.smsTo === "static"
            ? node.smsToNumber || "static number"
            : "to caller"
          : null;

  return (
    <div
      className={cn(
        "w-[248px] rounded-2xl border-[1.5px] p-4 transition-shadow",
        meta.chrome,
        selected ? "shadow-[5px_5px_0_var(--ink)]" : "shadow-[3px_3px_0_var(--ink)]",
      )}
    >
      {d.kind !== "initial" && (
        <Handle type="target" position={Position.Left} className={cn(HANDLE_CLASS, "!-left-1.5")} />
      )}

      <div className="flex items-center justify-between">
        <span className={cn("eyebrow flex items-center gap-1.5 text-[9px]", meta.eyebrow)}>
          <Icon className="size-3" />
          {meta.label}
        </span>
        <div className="flex items-center gap-2">
          {sttMuted && <MicOff className={cn("size-3", meta.eyebrow)} />}
          {modelOverride && (
            <span className={cn("flex items-center gap-1 text-[9px] font-semibold", meta.eyebrow)}>
              <Cpu className="size-3" />
              {modelOverride}
            </span>
          )}
        </div>
      </div>

      <div className="mt-2 font-display text-[14.5px] leading-tight font-bold">{node.label}</div>
      <p
        className={cn(
          "mt-1.5 line-clamp-2 text-[11px] leading-snug",
          d.kind === "node" || d.kind === "dtmf" || d.kind === "sms" ? "text-muted-foreground" : "opacity-70",
        )}
      >
        {task}
      </p>

      {(toolCount > 0 || kbBound || detailChip) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {toolCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-current/25 px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase opacity-80">
              <Wrench className="size-2.5" />
              {toolCount} tools
            </span>
          )}
          {kbBound && (
            <span className="inline-flex items-center gap-1 rounded-full border border-current/25 px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase opacity-80">
              <BookOpen className="size-2.5" />
              KB
            </span>
          )}
          {detailChip && (
            <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full border border-current/25 px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase opacity-80">
              {detailChip}
            </span>
          )}
        </div>
      )}

      {/* Named branch handles (transfer / sms). Stacked at the bottom-right. */}
      {named.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-current/15 pt-2.5">
          {named.map((h, i) => {
            const hm = NAMED_HANDLE_META[h];
            return (
              <div key={h} className="relative flex items-center justify-end gap-1.5 text-[9px] font-bold tracking-wide uppercase opacity-80">
                {hm.label}
                <Handle
                  id={h}
                  type="source"
                  position={Position.Right}
                  style={{ top: "auto", bottom: `${12 + i * 22}px` }}
                  className={cn(HANDLE_CLASS, hm.dot, "!-right-1.5")}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Default (unnamed) source handle for non-terminal, non-sms-only nodes. */}
      {d.kind !== "end" && !onlyNamed && (
        <Handle type="source" position={Position.Right} className={cn(HANDLE_CLASS, "!-right-1.5")} />
      )}
    </div>
  );
}

export const nodeTypes = { flowNode: FlowStageNode };
