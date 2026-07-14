"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type FlowNodeType,
  type FlowTransition,
  type SourceHandle,
  namedSourceHandles,
  toSnakeCase,
} from "@/lib/flow-contract";
import { Field } from "@/components/flow/flow-fields";

const DEFAULT_HANDLE = "__default__";

export interface TransitionEditorProps {
  transition: FlowTransition;
  sourceKind: FlowNodeType;
  /** Selectable targets (every node except the source itself). */
  targets: { id: string; label: string; kind: FlowNodeType }[];
  onChange: (patch: Partial<FlowTransition>) => void;
  onDelete: () => void;
}

/** Edits a single transition (function) — name / description / target / branch. */
export function TransitionEditor({
  transition,
  sourceKind,
  targets,
  onChange,
  onDelete,
}: TransitionEditorProps) {
  const named = namedSourceHandles(sourceKind);
  const isEnd = transition.handlerType === "end_conversation";

  return (
    <div className="rounded-xl border-[1.5px] border-input bg-paper p-3.5">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[11px] font-semibold text-forest">{transition.name}</span>
        <button
          type="button"
          onClick={onDelete}
          className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-sand hover:text-ink"
          aria-label="Delete transition"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      <Field label="Function name" hint="snake_case — the tool the LLM calls to take this branch.">
        <Input
          value={transition.name}
          onChange={(e) => onChange({ name: e.target.value })}
          onBlur={(e) => onChange({ name: toSnakeCase(e.target.value, transition.name) })}
          className="h-9 rounded-lg border-[1.5px] border-input font-mono text-[12px]"
        />
      </Field>

      <Field label="When to take it" hint="Plain-language condition the model matches against.">
        <Textarea
          value={transition.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className="min-h-[56px] rounded-lg border-[1.5px] border-input text-[12px] leading-relaxed"
          placeholder="e.g. The caller has confirmed their identity."
        />
      </Field>

      <Field label="Handler">
        <Select
          value={transition.handlerType}
          onValueChange={(v) =>
            onChange(
              v === "end_conversation"
                ? { handlerType: "end_conversation", targetNode: undefined }
                : { handlerType: "transition" },
            )
          }
        >
          <SelectTrigger className="h-9 w-full rounded-lg border-[1.5px] border-input text-[12.5px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="transition">Go to node</SelectItem>
            <SelectItem value="end_conversation">End the conversation</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {!isEnd && (
        <Field label="Target node">
          <Select
            value={transition.targetNode ?? ""}
            onValueChange={(v) => onChange({ targetNode: v })}
          >
            <SelectTrigger className="h-9 w-full rounded-lg border-[1.5px] border-input text-[12.5px]">
              <SelectValue placeholder="Select a node…" />
            </SelectTrigger>
            <SelectContent>
              {targets.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label} <span className="text-muted-foreground">· {t.kind}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {named.length > 0 && (
        <Field label="Branch" hint="Which named output of this telephony node fires this transition.">
          <Select
            value={transition.sourceHandle ?? DEFAULT_HANDLE}
            onValueChange={(v) =>
              onChange({ sourceHandle: v === DEFAULT_HANDLE ? undefined : (v as SourceHandle) })
            }
          >
            <SelectTrigger className="h-9 w-full rounded-lg border-[1.5px] border-input text-[12.5px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sourceKind !== "sms" && <SelectItem value={DEFAULT_HANDLE}>Default (continue)</SelectItem>}
              {named.map((h) => (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      <Field label="Transition speech" hint="Optional line spoken on entry to the target node." className="mb-0">
        <Textarea
          value={transition.transitionSpeech ?? ""}
          onChange={(e) => onChange({ transitionSpeech: e.target.value })}
          className="min-h-[44px] rounded-lg border-[1.5px] border-input text-[12px]"
          placeholder="e.g. Great, let me pull that up for you."
        />
      </Field>
    </div>
  );
}
