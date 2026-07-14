"use client";

import * as React from "react";
import { Braces, GitBranch, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
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
  isTerminalNode,
  uniqueTransitionName,
} from "@/lib/flow-contract";
import { CountBadge, FieldLabel, Section } from "@/components/flow/flow-fields";
import { TransitionEditor } from "@/components/flow/transition-editor";

/**
 * Editor value for a single JSON-Schema parameter. Stored inside a transition's
 * opaque `properties` map (`Record<string, unknown>` on the contract), so this
 * is a local view of that value shape — not a parallel flow type.
 */
export interface JsonSchemaProp {
  type: "string" | "number" | "integer" | "boolean";
  description?: string;
  enum?: string[];
}

interface FunctionsPanelProps {
  data: { functions: FlowTransition[] };
  kind: FlowNodeType;
  /** Candidate transition targets (every node except this one). */
  targets: { id: string; label: string; kind: FlowNodeType }[];
  onChange: (patch: { functions: FlowTransition[] }) => void;
}

/**
 * The "Functions" tab — the transitions (LLM functions) out of a node. Each
 * transition reuses {@link TransitionEditor} for its name/condition/target and
 * adds a collapsible parameter editor for the data the model must capture.
 */
export function FunctionsPanel({ data, kind, targets, onChange }: FunctionsPanelProps) {
  const functions = data.functions ?? [];

  if (isTerminalNode(kind)) {
    return (
      <p className="rounded-xl border-[1.5px] border-dashed border-ink/20 bg-cream/40 px-3 py-6 text-center text-[11.5px] text-muted-foreground">
        End nodes have no outgoing transitions.
      </p>
    );
  }

  const patch = (fns: FlowTransition[]) => onChange({ functions: fns });

  const updateAt = (i: number, updates: Partial<FlowTransition>) =>
    patch(functions.map((f, idx) => (idx === i ? { ...f, ...updates } : f)));

  const removeAt = (i: number) => patch(functions.filter((_, idx) => idx !== i));

  const add = () => {
    const taken = new Set(functions.map((f) => f.name));
    patch([
      ...functions,
      {
        name: uniqueTransitionName("next", taken),
        description: "",
        handlerType: "transition",
        targetNode: targets[0]?.id,
        sourceHandle: kind === "sms" ? "sms-success" : undefined,
      },
    ]);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <FieldLabel className="mb-0">Transitions</FieldLabel>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 rounded-full border-[1.5px] border-border bg-paper px-2.5 py-1 font-display text-[9px] font-extrabold tracking-[0.1em] text-muted-foreground uppercase hover:border-ink hover:text-ink"
        >
          <Plus className="size-2.5" />
          Add
        </button>
      </div>

      {functions.length === 0 ? (
        <div className="rounded-xl border-[1.5px] border-dashed border-brand-orange/50 bg-brand-orange/5 px-3 py-6 text-center">
          <GitBranch className="mx-auto mb-2 size-5 text-brand-orange" />
          <p className="text-[11.5px] text-muted-foreground">
            No transitions — this node is a dead end. Add one, or wire an edge on the canvas.
          </p>
        </div>
      ) : (
        functions.map((fn, i) => (
          <div key={`${fn.name}-${i}`} className="space-y-2">
            <TransitionEditor
              transition={fn}
              sourceKind={kind}
              targets={targets}
              onChange={(p) => updateAt(i, p)}
              onDelete={() => removeAt(i)}
            />
            <Section
              title="Parameters"
              icon={Braces}
              badge={<CountBadge n={Object.keys(fn.properties ?? {}).length} />}
            >
              <ParametersEditor
                properties={(fn.properties ?? {}) as Record<string, JsonSchemaProp>}
                required={fn.required ?? []}
                onChange={(properties, required) =>
                  updateAt(i, {
                    properties: Object.keys(properties).length ? properties : undefined,
                    required: required.length ? required : undefined,
                  })
                }
              />
            </Section>
          </div>
        ))
      )}
    </div>
  );
}

// ── Parameters editor (also used by the edge inspector) ──────────────────────

export function ParametersEditor({
  properties,
  required,
  onChange,
}: {
  properties: Record<string, JsonSchemaProp>;
  required: string[];
  onChange: (props: Record<string, JsonSchemaProp>, required: string[]) => void;
}) {
  const [newName, setNewName] = React.useState("");
  const entries = Object.entries(properties);

  const addParam = () => {
    const name = newName.trim().toLowerCase().replace(/\s+/g, "_");
    if (!name || name in properties) return;
    onChange({ ...properties, [name]: { type: "string", description: "" } }, required);
    setNewName("");
  };

  const updateParam = (name: string, schema: JsonSchemaProp) =>
    onChange({ ...properties, [name]: schema }, required);

  const removeParam = (name: string) => {
    const rest = { ...properties };
    delete rest[name];
    onChange(rest, required.filter((r) => r !== name));
  };

  const toggleRequired = (name: string) =>
    onChange(
      properties,
      required.includes(name) ? required.filter((r) => r !== name) : [...required, name],
    );

  return (
    <div className="space-y-2">
      {entries.length === 0 && (
        <p className="text-[10.5px] text-muted-foreground">
          No parameters — the model calls this function with no arguments.
        </p>
      )}

      {entries.map(([name, schema]) => (
        <div key={name} className="space-y-1.5 rounded-lg border-[1.5px] border-input bg-paper p-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[11px] font-semibold text-forest">{name}</span>
              <button
                type="button"
                onClick={() => toggleRequired(name)}
                className={
                  required.includes(name)
                    ? "rounded bg-brand-orange/15 px-1.5 py-0.5 text-[9px] font-semibold text-brand-orange"
                    : "rounded bg-sand px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground"
                }
              >
                {required.includes(name) ? "required" : "optional"}
              </button>
            </div>
            <button
              type="button"
              onClick={() => removeParam(name)}
              className="flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-sand hover:text-ink"
              aria-label="Remove parameter"
            >
              <Trash2 className="size-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <Select
              value={schema.type}
              onValueChange={(v) => updateParam(name, { ...schema, type: v as JsonSchemaProp["type"] })}
            >
              <SelectTrigger className="h-7 rounded-lg border-[1.5px] border-input text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="string">string</SelectItem>
                <SelectItem value="number">number</SelectItem>
                <SelectItem value="integer">integer</SelectItem>
                <SelectItem value="boolean">boolean</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={schema.description ?? ""}
              onChange={(e) => updateParam(name, { ...schema, description: e.target.value })}
              placeholder="Description"
              className="h-7 rounded-lg border-[1.5px] border-input text-[11px]"
            />
          </div>

          {schema.type === "string" && (
            <Input
              value={schema.enum?.join(", ") ?? ""}
              onChange={(e) => {
                const vals = e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);
                updateParam(name, { ...schema, enum: vals.length ? vals : undefined });
              }}
              placeholder="Allowed values (comma-separated, optional)"
              className="h-7 rounded-lg border-[1.5px] border-input font-mono text-[11px]"
            />
          )}
        </div>
      ))}

      <div className="flex items-center gap-1.5">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addParam())}
          placeholder="param_name"
          className="h-7 flex-1 rounded-lg border-[1.5px] border-input font-mono text-[11px]"
        />
        <button
          type="button"
          onClick={addParam}
          className="flex size-7 items-center justify-center rounded-lg border-[1.5px] border-input bg-paper text-muted-foreground hover:border-ink hover:text-ink"
          aria-label="Add parameter"
        >
          <Plus className="size-3" />
        </button>
      </div>
    </div>
  );
}
