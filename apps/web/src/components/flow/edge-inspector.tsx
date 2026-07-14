"use client";

import * as React from "react";
import { ArrowRight, Braces, GitBranch, Sparkles, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type FlowNodeType, type FlowTransition, toSnakeCase } from "@/lib/flow-contract";
import { Field, FieldLabel, Section } from "@/components/flow/flow-fields";
import { ParametersEditor, type JsonSchemaProp } from "@/components/flow/panels/functions-panel";

const KIND_DOT: Record<FlowNodeType, string> = {
  initial: "bg-lime",
  node: "bg-forest",
  transfer: "bg-brand-orange",
  dtmf: "bg-muted-foreground",
  sms: "bg-brand-yellow",
  end: "bg-brand-orange",
};

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "if", "when", "user", "caller", "wants", "to", "has",
  "does", "should", "this", "that", "for", "and", "or", "of", "in", "on", "at",
  "by", "with", "they", "their",
]);

/** Derive a snake_case function name from a plain-language condition. */
function conditionToName(condition: string): string {
  const words = condition
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
    .slice(0, 5);
  return words.join("_") || "";
}

export interface EdgeInspectorProps {
  transition: FlowTransition;
  sourceLabel: string;
  sourceKind: FlowNodeType;
  targetLabel?: string;
  targetKind?: FlowNodeType;
  onChange: (patch: Partial<FlowTransition>) => void;
  onDelete: () => void;
  onClose: () => void;
}

/**
 * Inspector for a single transition (edge). The plain-language condition is the
 * primary control; the function name auto-derives from it until the user edits
 * the name by hand, and parameters live under an Advanced section.
 */
export function EdgeInspector({
  transition,
  sourceLabel,
  sourceKind,
  targetLabel,
  targetKind,
  onChange,
  onDelete,
  onClose,
}: EdgeInspectorProps) {
  const conditionRef = React.useRef<HTMLTextAreaElement>(null);
  const [nameManuallySet, setNameManuallySet] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => conditionRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  const handleConditionChange = (description: string) => {
    const patch: Partial<FlowTransition> = { description };
    if (!nameManuallySet) {
      const auto = conditionToName(description);
      if (auto) patch.name = auto;
    }
    onChange(patch);
  };

  const handleNameChange = (raw: string) => {
    setNameManuallySet(true);
    onChange({ name: toSnakeCase(raw, transition.name) });
  };

  const paramCount = Object.keys(transition.properties ?? {}).length;

  return (
    <aside className="absolute inset-y-4 right-4 z-10 flex w-[360px] flex-col overflow-hidden rounded-2xl border-[1.5px] border-ink bg-paper shadow-[4px_4px_0_var(--ink)]">
      {/* header */}
      <div className="flex items-center justify-between border-b-[1.5px] border-ink/10 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="grid size-7 place-items-center rounded-md bg-sand text-ink">
            <GitBranch className="size-4" />
          </div>
          <div>
            <p className="eyebrow text-[9px] text-muted-foreground">transition</p>
            <p className="font-mono text-[11.5px] font-semibold text-forest">{transition.name}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex size-7 items-center justify-center rounded-full hover:bg-sand"
          aria-label="Close inspector"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {/* source → target */}
        <div className="mb-4 flex items-center gap-2 rounded-xl border-[1.5px] border-input bg-cream/50 px-3 py-2.5">
          <NodeChip label={sourceLabel} kind={sourceKind} />
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
          <NodeChip label={targetLabel ?? "—"} kind={targetKind} />
        </div>

        {/* condition (primary) */}
        <Field
          label="Condition"
          hint="Describe when the agent should take this branch. The model matches against it."
        >
          <Textarea
            ref={conditionRef}
            value={transition.description}
            onChange={(e) => handleConditionChange(e.target.value)}
            placeholder='e.g. "The caller has confirmed their identity."'
            className="min-h-[80px] rounded-xl border-[1.5px] border-input text-[12.5px] leading-relaxed"
          />
        </Field>

        {/* advanced */}
        <Section title="Advanced" defaultOpen={paramCount > 0}>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <FieldLabel className="mb-0">Function name</FieldLabel>
                {!nameManuallySet && transition.description && (
                  <span className="flex items-center gap-0.5 text-[9px] text-forest">
                    <Sparkles className="size-2.5" />
                    auto
                  </span>
                )}
              </div>
              <Input
                value={transition.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="transition_name"
                className="h-8 rounded-lg border-[1.5px] border-input font-mono text-[12px]"
              />
            </div>

            <Field label="Action" className="mb-0">
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
                <SelectTrigger className="h-8 w-full rounded-lg border-[1.5px] border-input text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transition">Transition to a node</SelectItem>
                  <SelectItem value="end_conversation">End the conversation</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <div>
              <FieldLabel className="flex items-center gap-1.5">
                <Braces className="size-3" />
                Parameters
              </FieldLabel>
              <p className="mb-2 text-[10.5px] text-muted-foreground">
                Data the model should capture when taking this branch.
              </p>
              <ParametersEditor
                properties={(transition.properties ?? {}) as Record<string, JsonSchemaProp>}
                required={transition.required ?? []}
                onChange={(properties, required) =>
                  onChange({
                    properties: Object.keys(properties).length ? properties : undefined,
                    required: required.length ? required : undefined,
                  })
                }
              />
            </div>
          </div>
        </Section>

        <button
          type="button"
          onClick={onDelete}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-input py-2 text-[11.5px] font-semibold text-brand-orange hover:border-brand-orange hover:bg-brand-orange/5"
        >
          <Trash2 className="size-3.5" />
          Delete transition
        </button>
      </div>
    </aside>
  );
}

function NodeChip({ label, kind }: { label: string; kind?: FlowNodeType }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <span className={`size-2.5 shrink-0 rounded-full ${kind ? KIND_DOT[kind] : "bg-muted"}`} />
      <span className="truncate text-[11.5px] font-semibold text-ink">{label}</span>
    </div>
  );
}
