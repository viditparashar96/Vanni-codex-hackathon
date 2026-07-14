"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Grid3x3 } from "lucide-react";
import type { RFNodeData } from "@/lib/flow-transform";
import { cn } from "@/lib/utils";
import {
  HANDLE_BASE,
  HEADER_CHROME,
  nodeShellClass,
  useNodeDecorations,
} from "./node-common";
import { ValidationBadge } from "./validation-badge";
import { GlobalBadge } from "./global-badge";

/** Emit DTMF tones into the call, then continue via the source handle. */
export const DtmfNode = memo(function DtmfNode({ id, data, selected }: NodeProps) {
  const d = data as RFNodeData;
  const node = d.node;
  const { issues, isActive, isGlobal } = useNodeDecorations(id, d);
  const chrome = HEADER_CHROME.dtmf;
  const digits = node.dtmfDigits?.trim() || "No digits set";

  return (
    <div className={nodeShellClass({ selected, isActive, isGlobal })}>
      <Handle type="target" position={Position.Left} className={cn(HANDLE_BASE, "!-left-1.5")} />

      <ValidationBadge issues={issues} />
      {isGlobal && <GlobalBadge />}

      {/* Header */}
      <div className={cn("flex items-center gap-2 px-3.5 py-2.5", chrome.band)}>
        <Grid3x3 className={cn("size-3.5 shrink-0", chrome.icon)} />
        <span className="truncate font-display text-[13px] font-extrabold">
          {node.label || "Send Digits"}
        </span>
        <span className="eyebrow ml-auto text-[8px] text-muted-foreground">DTMF</span>
      </div>

      {/* Body */}
      <div className="px-3.5 py-3">
        <p className="font-mono text-[13px] tracking-[0.35em] text-ink">{digits}</p>
      </div>

      <Handle type="source" position={Position.Right} className={cn(HANDLE_BASE, "!-right-1.5")} />
    </div>
  );
});
