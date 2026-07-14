"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Flag } from "lucide-react";
import type { RFNodeData } from "@/lib/flow-transform";
import { cn } from "@/lib/utils";
import {
  HANDLE_BASE,
  HEADER_CHROME,
  nodePrompt,
  nodeShellClass,
  useNodeDecorations,
} from "./node-common";
import { ValidationBadge } from "./validation-badge";
import { GlobalBadge } from "./global-badge";

/** Terminal node — hangs up. Target in, no outgoing handle. */
export const EndNode = memo(function EndNode({ id, data, selected }: NodeProps) {
  const d = data as RFNodeData;
  const node = d.node;
  const { issues, isActive, isGlobal } = useNodeDecorations(id, d);
  const chrome = HEADER_CHROME.end;
  const farewell = node.firstMessage?.trim() || nodePrompt(d);

  return (
    <div className={nodeShellClass({ selected, isActive, isGlobal })}>
      <Handle type="target" position={Position.Left} className={cn(HANDLE_BASE, "!-left-1.5")} />

      <ValidationBadge issues={issues} />
      {isGlobal && <GlobalBadge />}

      {/* Header */}
      <div className={cn("flex items-center gap-2 px-3.5 py-2.5", chrome.band)}>
        <Flag className={cn("size-3.5 shrink-0", chrome.icon)} />
        <span className="truncate font-display text-[13px] font-extrabold">
          {node.label || "End Call"}
        </span>
        <span className="eyebrow ml-auto text-[8px] opacity-60">End</span>
      </div>

      {/* Body */}
      <div className="px-3.5 py-3">
        <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
          {farewell}
        </p>
      </div>

      {/* No source handle — the call terminates here. */}
    </div>
  );
});
