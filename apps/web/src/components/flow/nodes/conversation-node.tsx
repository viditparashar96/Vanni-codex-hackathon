"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { BookOpen, Cpu, MessageSquare, MicOff, Wrench } from "lucide-react";
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
import { GlobalBadge } from "./global-badge";

/** Conversational stage — the workhorse node. Target in, source out. */
export const ConversationNode = memo(function ConversationNode({
  id,
  data,
  selected,
}: NodeProps) {
  const d = data as RFNodeData;
  const node = d.node;
  const { issues, isActive, isGlobal } = useNodeDecorations(id, d);
  const chrome = HEADER_CHROME.node;

  const fnCount = node.functions?.length ?? 0;
  const toolCount = node.toolIds?.length ?? 0;
  const kbBound = Boolean(node.knowledgeBase?.knowledgeBaseId);
  const modelOverride = node.serviceOverrides?.llm?.model;
  const sttMuted = node.serviceOverrides?.sttMute;
  const hasOverrides = Boolean(node.serviceOverrides);

  return (
    <div className={nodeShellClass({ selected, isActive, isGlobal })}>
      <Handle type="target" position={Position.Left} className={cn(HANDLE_BASE, "!-left-1.5")} />

      <ValidationBadge issues={issues} />
      {isGlobal && <GlobalBadge />}

      {/* Header */}
      <div className={cn("flex items-center gap-2 px-3.5 py-2.5", chrome.band)}>
        <MessageSquare className={cn("size-3.5 shrink-0", chrome.icon)} />
        <span className="flex-1 truncate font-display text-[13px] font-extrabold">
          {node.label || "Conversation"}
        </span>
        {sttMuted && <MicOff className="size-3 text-muted-foreground" />}
        {hasOverrides && (
          <span className="rounded-full border border-ink/25 px-1.5 py-0.5 text-[8px] font-bold tracking-wide uppercase">
            custom
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-3.5 py-3">
        <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
          {nodePrompt(d)}
        </p>

        {(fnCount > 0 || toolCount > 0 || kbBound || modelOverride) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[9px] font-bold tracking-wide uppercase">
            {fnCount > 0 && (
              <span className="text-muted-foreground">{pluralCount(fnCount, "transition")}</span>
            )}
            {toolCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-ink/25 px-2 py-0.5">
                <Wrench className="size-2.5" />
                {toolCount}
              </span>
            )}
            {kbBound && (
              <span className="inline-flex items-center gap-1 rounded-full border border-ink/25 px-2 py-0.5">
                <BookOpen className="size-2.5" />
                KB
              </span>
            )}
            {modelOverride && (
              <span className="inline-flex max-w-[110px] items-center gap-1 truncate rounded-full border border-ink/25 px-2 py-0.5">
                <Cpu className="size-2.5" />
                {modelOverride}
              </span>
            )}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className={cn(HANDLE_BASE, "!-right-1.5")} />
    </div>
  );
});
