"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { CircleX, PhoneForwarded } from "lucide-react";
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
 * Hand the call to an external number. The default (right) handle is the
 * success path — the transfer completes and the flow continues — while the
 * bottom `transfer-failure` handle routes an unanswered / rejected transfer.
 */
export const TransferNode = memo(function TransferNode({ id, data, selected }: NodeProps) {
  const d = data as RFNodeData;
  const node = d.node;
  const { issues, isActive, isGlobal } = useNodeDecorations(id, d);
  const chrome = HEADER_CHROME.transfer;
  const destination = node.transferTo?.trim() || "No number set";
  const transferType = node.transferType || "warm";

  return (
    <div className={nodeShellClass({ selected, isActive, isGlobal })}>
      <Handle type="target" position={Position.Left} className={cn(HANDLE_BASE, "!-left-1.5")} />

      <ValidationBadge issues={issues} />
      {isGlobal && <GlobalBadge />}

      {/* Header */}
      <div className={cn("flex items-center gap-2 px-3.5 py-2.5", chrome.band)}>
        <PhoneForwarded className={cn("size-3.5 shrink-0", chrome.icon)} />
        <span className="flex-1 truncate font-display text-[13px] font-extrabold">
          {node.label || "Call Transfer"}
        </span>
        <span className="rounded-full border border-paper/40 px-1.5 py-0.5 text-[8px] font-bold tracking-wide uppercase">
          {transferType}
        </span>
      </div>

      {/* Body */}
      <div className="px-3.5 py-3">
        <p className="line-clamp-2 font-mono text-[11px] text-ink">{destination}</p>
      </div>

      {/* Transition section */}
      <div className="border-t border-border px-3.5 py-2.5">
        <div className="eyebrow mb-1.5 text-[8px] text-muted-foreground">Transition</div>
        <div className="flex items-center gap-1.5">
          <CircleX className="size-3 shrink-0 text-brand-orange" />
          <span className="text-[10px] font-semibold text-brand-orange">Transfer failed</span>
        </div>
      </div>

      {/* Success continues via the default source handle. */}
      <Handle type="source" position={Position.Right} className={cn(HANDLE_BASE, "!-right-1.5")} />

      {/* Failure branch exits from the bottom-right. */}
      <Handle
        type="source"
        id="transfer-failure"
        position={Position.Bottom}
        style={{ left: "88%" }}
        className={cn(HANDLE_BASE, HANDLE_TINT["transfer-failure"], "!-bottom-1.5")}
      />
    </div>
  );
});
