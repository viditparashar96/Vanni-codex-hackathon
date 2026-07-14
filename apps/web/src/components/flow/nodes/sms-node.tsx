"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { CircleCheck, CircleX, Send } from "lucide-react";
import type { RFNodeData } from "@/lib/flow-transform";
import { cn } from "@/lib/utils";
import {
  HANDLE_BASE,
  HANDLE_TINT,
  HEADER_CHROME,
  nodeShellClass,
  useNodeDecorations,
} from "./node-common";
import { ValidationBadge } from "./validation-badge";
import { GlobalBadge } from "./global-badge";

/**
 * Send a text message, then branch on the result. Both outgoing paths are
 * named handles on the bottom edge — success (left) and failure (right) — so
 * there is no default source handle.
 */
export const SmsNode = memo(function SmsNode({ id, data, selected }: NodeProps) {
  const d = data as RFNodeData;
  const node = d.node;
  const { issues, isActive, isGlobal } = useNodeDecorations(id, d);
  const chrome = HEADER_CHROME.sms;
  const recipient =
    node.smsTo === "static" ? node.smsToNumber?.trim() || "static number" : "caller";
  const content = node.smsContent?.trim() || "No message content";

  return (
    <div className={nodeShellClass({ selected, isActive, isGlobal })}>
      <Handle type="target" position={Position.Left} className={cn(HANDLE_BASE, "!-left-1.5")} />

      <ValidationBadge issues={issues} />
      {isGlobal && <GlobalBadge />}

      {/* Header */}
      <div className={cn("flex items-center gap-2 px-3.5 py-2.5", chrome.band)}>
        <Send className={cn("size-3.5 shrink-0", chrome.icon)} />
        <span className="flex-1 truncate font-display text-[13px] font-extrabold">
          {node.label || "Send SMS"}
        </span>
        <span className="rounded-full border border-ink/25 px-1.5 py-0.5 text-[8px] font-bold tracking-wide uppercase">
          → {recipient}
        </span>
      </div>

      {/* Body */}
      <div className="px-3.5 py-3">
        <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">{content}</p>
      </div>

      {/* Transition section */}
      <div className="border-t border-border px-3.5 py-2.5">
        <div className="eyebrow mb-1.5 text-[8px] text-muted-foreground">Transition</div>
        <div className="flex items-center gap-1.5">
          <CircleCheck className="size-3 shrink-0 text-forest" />
          <span className="text-[10px] font-semibold text-ink">Sent successfully</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <CircleX className="size-3 shrink-0 text-brand-orange" />
          <span className="text-[10px] font-semibold text-brand-orange">Failed to send</span>
        </div>
      </div>

      {/* Named source handles — success (left) and failure (right). */}
      <Handle
        type="source"
        id="sms-success"
        position={Position.Bottom}
        style={{ left: "30%" }}
        className={cn(HANDLE_BASE, HANDLE_TINT["sms-success"], "!-bottom-1.5")}
      />
      <Handle
        type="source"
        id="sms-failure"
        position={Position.Bottom}
        style={{ left: "70%" }}
        className={cn(HANDLE_BASE, HANDLE_TINT["sms-failure"], "!-bottom-1.5")}
      />
    </div>
  );
});
