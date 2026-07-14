"use client";

import * as React from "react";
import { Flag, Grid3x3, MessageSquare, PhoneForwarded, Play, Send, Trash2, X } from "lucide-react";
import type { KnowledgeBase, ToolDef } from "@/types";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type CustomVariable, type FlowNodeData, type FlowNodeType } from "@/lib/flow-contract";
import { PromptPanel } from "@/components/flow/panels/prompt-panel";
import { FunctionsPanel } from "@/components/flow/panels/functions-panel";
import { ToolsPanel } from "@/components/flow/panels/tools-panel";
import { SettingsPanel } from "@/components/flow/panels/settings-panel";

const KIND_ICON: Record<FlowNodeType, React.ComponentType<{ className?: string }>> = {
  initial: Play,
  node: MessageSquare,
  transfer: PhoneForwarded,
  dtmf: Grid3x3,
  sms: Send,
  end: Flag,
};

const KIND_LABEL: Record<FlowNodeType, string> = {
  initial: "start node",
  node: "conversation node",
  transfer: "transfer node",
  dtmf: "keypad node",
  sms: "message node",
  end: "end node",
};

export interface NodeInspectorProps {
  nodeId: string;
  kind: FlowNodeType;
  data: FlowNodeData;
  /** Candidate transition targets (all nodes except this one). */
  targets: { id: string; label: string; kind: FlowNodeType }[];
  tools: ToolDef[];
  knowledgeBases: KnowledgeBase[];
  /** Flow-level variables, for the prompt panel's quick-insert. */
  customVariables: CustomVariable[];
  onChange: (patch: Partial<FlowNodeData>) => void;
  onDelete: () => void;
  onClose: () => void;
  /** When an edge routed here, jump straight to the Functions tab. */
  focusTransition?: number | null;
  /**
   * Fill the parent container instead of floating over the canvas. Used when
   * the inspector lives inside the editor's resizable split panel.
   */
  embedded?: boolean;
}

/**
 * The per-node inspector: a header (icon + rename + delete/close) over a tabbed
 * body that delegates to the Prompt / Functions / Tools / Settings panels.
 * Telephony message nodes drop the Functions tab (their branches are fixed).
 */
export function NodeInspector({
  kind,
  data,
  targets,
  tools,
  knowledgeBases,
  customVariables,
  onChange,
  onDelete,
  onClose,
  focusTransition,
  embedded = false,
}: NodeInspectorProps) {
  const Icon = KIND_ICON[kind];
  const compactTabs = kind === "sms" || kind === "transfer";
  const defaultTab = focusTransition != null && !compactTabs ? "functions" : "prompt";

  return (
    <aside
      className={
        embedded
          ? "flex h-full w-full flex-col overflow-hidden bg-paper"
          : "absolute inset-y-4 right-4 z-10 flex w-[360px] flex-col overflow-hidden rounded-2xl border-[1.5px] border-ink bg-paper shadow-[4px_4px_0_var(--ink)]"
      }
    >
      {/* header */}
      <div className="flex items-start gap-3 border-b-[1.5px] border-ink/10 px-5 py-4">
        <div className="mt-1 grid size-7 shrink-0 place-items-center rounded-md bg-sand text-ink">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <Input
            value={data.label}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder="Node name"
            className="h-8 rounded-lg border-[1.5px] border-input bg-cream/40 text-[13px] font-semibold"
          />
          <p className="eyebrow text-[9px] text-muted-foreground">{KIND_LABEL[kind]}</p>
        </div>
        <div className="flex items-center gap-1">
          {kind !== "initial" && (
            <button
              type="button"
              onClick={onDelete}
              className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-sand hover:text-brand-orange"
              aria-label="Delete node"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-full hover:bg-sand"
            aria-label="Close inspector"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      <Tabs key={defaultTab} defaultValue={defaultTab} className="flex min-h-0 flex-1 flex-col gap-0">
        <div className="border-b-[1.5px] border-ink/10 px-4 py-2.5">
          <TabsList className={`grid w-full ${compactTabs ? "grid-cols-3" : "grid-cols-4"}`}>
            <TabsTrigger value="prompt" className="text-[11px]">
              Prompt
            </TabsTrigger>
            {!compactTabs && (
              <TabsTrigger value="functions" className="text-[11px]">
                Functions
              </TabsTrigger>
            )}
            <TabsTrigger value="tools" className="text-[11px]">
              Tools
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-[11px]">
              Settings
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <TabsContent value="prompt" className="mt-0">
            <PromptPanel data={data} kind={kind} customVariables={customVariables} onChange={onChange} />
          </TabsContent>

          {!compactTabs && (
            <TabsContent value="functions" className="mt-0">
              <FunctionsPanel data={data} kind={kind} targets={targets} onChange={onChange} />
            </TabsContent>
          )}

          <TabsContent value="tools" className="mt-0">
            <ToolsPanel
              tools={tools}
              selectedToolIds={data.toolIds ?? []}
              onChange={(toolIds) => onChange({ toolIds: toolIds.length ? toolIds : undefined })}
            />
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <SettingsPanel data={data} kind={kind} knowledgeBases={knowledgeBases} onChange={onChange} />
          </TabsContent>
        </div>
      </Tabs>
    </aside>
  );
}
