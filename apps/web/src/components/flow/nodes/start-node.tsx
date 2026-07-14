"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Play } from "lucide-react";
import type { RFNodeData } from "@/lib/flow-transform";
import { cn } from "@/lib/utils";
import {
  HANDLE_BASE,
  HEADER_CHROME,
  nodePrompt,
  nodeShellClass,
  pluralCount,
  useNodeDecorations,
} from "./node-common";
import { ValidationBadge } from "./validation-badge";

/** Entry node — where every call begins. Single outgoing (source) handle. */
export const StartNode = memo(function StartNode({ id, data, selected }: NodeProps) {
  const d = data as RFNodeData;
  const node = d.node;
  const { issues, isActive, isGlobal } = useNodeDecorations(id, d);
  const chrome = HEADER_CHROME.initial;
  const fnCount = node.functions?.length ?? 0;
  const greeting = node.firstMessage?.trim() || nodePrompt(d);

  return (
    <div className={nodeShellClass({ selected, isActive, isGlobal })}>
      <ValidationBadge issues={issues} />

      {/* Header */}
      <div className={cn("flex items-center gap-2 px-3.5 py-2.5", chrome.band)}>
        <Play className={cn("size-3.5 shrink-0", chrome.icon)} />
        <span className="truncate font-display text-[13px] font-extrabold">
          {node.label || "Start"}
        </span>
        <span className="eyebrow ml-auto text-[8px] opacity-70">Entry</span>
      </div>

      {/* Body */}
      <div className="px-3.5 py-3">
        <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
          {greeting}
        </p>
        {fnCount > 0 && (
          <p className="mt-2 text-[10px] font-semibold text-forest">
            {pluralCount(fnCount, "transition")}
          </p>
        )}
      </div>

      <Handle type="source" position={Position.Right} className={cn(HANDLE_BASE, "!-right-1.5")} />
    </div>
  );
});
