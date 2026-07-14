"use client";

import * as React from "react";
import { BookOpen, Plus, Sliders, Variable, Wrench, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CountBadge, Field, FieldLabel, Section } from "@/components/flow/flow-fields";
import type { KnowledgeBase, ToolDef } from "@/types";
import type {
  ContextStrategy,
  CustomVariable,
  FlowConfig,
  FlowMessage,
  FlowMessageRole,
  KnowledgeBaseBinding,
} from "@/lib/flow-contract";

interface GlobalSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The base config (meta + global blocks); node edits live elsewhere. */
  config: FlowConfig;
  onChange: (updater: (prev: FlowConfig) => FlowConfig) => void;
  tools: ToolDef[];
  knowledgeBases: KnowledgeBase[];
}

const ROLES: FlowMessageRole[] = ["system", "user", "assistant", "developer"];

/** Read a numeric field off the opaque global call-settings bag. */
function num(bag: Record<string, unknown> | undefined, key: string): string {
  const v = bag?.[key];
  return typeof v === "number" ? String(v) : "";
}

/**
 * Flow-level configuration — everything on `FlowConfig` except the node graph:
 * identity, the shared persona, context handling, org tools + knowledge bases
 * applied everywhere, custom variables, and call-wide settings. All writes go
 * through the editor's `setFlowConfig`, which preserves any keys this panel
 * doesn't surface (so the config round-trips intact).
 */
export function GlobalSettingsDialog({
  open,
  onOpenChange,
  config,
  onChange,
  tools,
  knowledgeBases,
}: GlobalSettingsDialogProps) {
  const roleMessages = config.globalRoleMessages ?? [];
  const toolIds = config.globalToolIds ?? [];
  const kbs = config.globalKnowledgeBases ?? [];
  const vars = config.customVariables ?? [];
  const call = config.globalCallSettings;

  const setRoleMessages = (m: FlowMessage[]) =>
    onChange((p) => ({ ...p, globalRoleMessages: m.length ? m : undefined }));

  const setCallSetting = (key: string, raw: string) =>
    onChange((p) => {
      const next: Record<string, unknown> = { ...(p.globalCallSettings ?? {}) };
      const n = Number(raw);
      if (raw.trim() === "" || Number.isNaN(n)) delete next[key];
      else next[key] = n;
      return { ...p, globalCallSettings: Object.keys(next).length ? next : undefined };
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[86vh] w-[min(680px,94vw)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
        <DialogHeader className="border-b-[1.5px] border-ink/10 px-6 pt-6 pb-4">
          <DialogTitle className="display flex items-center gap-2 text-[18px] text-ink">
            <Sliders className="size-4" />
            Flow settings
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {/* ── Identity ── */}
          <Field label="Flow name">
            <Input
              value={config.meta.name}
              onChange={(e) => onChange((p) => ({ ...p, meta: { ...p.meta, name: e.target.value } }))}
              className="h-10 rounded-xl border-[1.5px] border-input text-[13px]"
            />
          </Field>
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <Field label="Description">
              <Input
                value={config.meta.description ?? ""}
                onChange={(e) =>
                  onChange((p) => ({
                    ...p,
                    meta: { ...p.meta, description: e.target.value || undefined },
                  }))
                }
                placeholder="What this flow does"
                className="h-10 rounded-xl border-[1.5px] border-input text-[13px]"
              />
            </Field>
            <Field label="Version">
              <Input
                value={config.meta.version}
                onChange={(e) => onChange((p) => ({ ...p, meta: { ...p.meta, version: e.target.value } }))}
                className="h-10 w-24 rounded-xl border-[1.5px] border-input text-center font-mono text-[13px]"
              />
            </Field>
          </div>

          {/* ── Context handling ── */}
          <Field label="Global context strategy" hint="Default history handling; nodes may override it.">
            <Select
              value={config.globalContextStrategy ?? "append"}
              onValueChange={(v) =>
                onChange((p) => ({
                  ...p,
                  globalContextStrategy: v === "append" ? undefined : (v as ContextStrategy),
                }))
              }
            >
              <SelectTrigger className="h-10 w-full rounded-xl border-[1.5px] border-input text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="append">Append — keep full history</SelectItem>
                <SelectItem value="reset">Reset — fresh context</SelectItem>
                <SelectItem value="reset_with_summary">Reset with summary</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {config.globalContextStrategy === "reset_with_summary" && (
            <Field label="Global summary prompt">
              <Textarea
                value={config.globalSummaryPrompt ?? ""}
                onChange={(e) =>
                  onChange((p) => ({ ...p, globalSummaryPrompt: e.target.value || undefined }))
                }
                className="min-h-[56px] rounded-xl border-[1.5px] border-input text-[12.5px]"
              />
            </Field>
          )}

          {/* ── Shared persona ── */}
          <Section title="Persona (role messages)" badge={<CountBadge n={roleMessages.length} />}>
            <MessageListEditor
              messages={roleMessages}
              onChange={setRoleMessages}
              placeholder="Persona applied across every node — tone, identity, guardrails."
            />
          </Section>

          {/* ── Global tools ── */}
          <Section title="Global tools" icon={Wrench} badge={<CountBadge n={toolIds.length} />}>
            {tools.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">No tools defined in this org yet.</p>
            ) : (
              <div className="space-y-1.5">
                {tools.map((t) => {
                  const on = toolIds.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className="flex cursor-pointer items-start gap-2.5 rounded-lg border-[1.5px] border-input bg-paper px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) =>
                          onChange((p) => {
                            const set = new Set(p.globalToolIds ?? []);
                            if (e.target.checked) set.add(t.id);
                            else set.delete(t.id);
                            return { ...p, globalToolIds: set.size ? [...set] : undefined };
                          })
                        }
                        className="mt-0.5 size-3.5 accent-forest"
                      />
                      <span className="min-w-0">
                        <span className="block font-mono text-[11.5px] font-semibold text-ink">{t.name}</span>
                        <span className="block truncate text-[10.5px] text-muted-foreground">{t.description}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </Section>

          {/* ── Global knowledge bases ── */}
          <Section title="Global knowledge bases" icon={BookOpen} badge={<CountBadge n={kbs.length} />}>
            {knowledgeBases.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">No knowledge bases in this org yet.</p>
            ) : (
              <div className="space-y-1.5">
                {knowledgeBases.map((kb) => {
                  const on = kbs.some((b) => b.knowledgeBaseId === kb.id);
                  return (
                    <label
                      key={kb.id}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg border-[1.5px] border-input bg-paper px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) =>
                          onChange((p) => {
                            const cur = p.globalKnowledgeBases ?? [];
                            const next: KnowledgeBaseBinding[] = e.target.checked
                              ? [...cur, { knowledgeBaseId: kb.id, chunksToRetrieve: 3, similarityThreshold: 0.5 }]
                              : cur.filter((b) => b.knowledgeBaseId !== kb.id);
                            return { ...p, globalKnowledgeBases: next.length ? next : undefined };
                          })
                        }
                        className="size-3.5 accent-forest"
                      />
                      <span className="min-w-0 truncate text-[12px] font-semibold text-ink">{kb.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </Section>

          {/* ── Custom variables ── */}
          <Section title="Custom variables" icon={Variable} badge={<CountBadge n={vars.length} />}>
            <CustomVariableEditor
              variables={vars}
              onChange={(next) =>
                onChange((p) => ({ ...p, customVariables: next.length ? next : undefined }))
              }
            />
          </Section>

          {/* ── Call settings ── */}
          <Section title="Call settings" icon={Sliders}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Max duration (s)" className="mb-0">
                <Input
                  type="number"
                  min={0}
                  value={num(call, "maxCallDurationSecs")}
                  onChange={(e) => setCallSetting("maxCallDurationSecs", e.target.value)}
                  placeholder="e.g. 600"
                  className="h-9 rounded-lg border-[1.5px] border-input text-[12.5px]"
                />
              </Field>
              <Field label="Inactivity timeout (s)" className="mb-0">
                <Input
                  type="number"
                  min={0}
                  value={num(call, "inactivityTimeoutSecs")}
                  onChange={(e) => setCallSetting("inactivityTimeoutSecs", e.target.value)}
                  placeholder="e.g. 30"
                  className="h-9 rounded-lg border-[1.5px] border-input text-[12.5px]"
                />
              </Field>
            </div>
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Message list ──────────────────────────────────────────────────────────────

function MessageListEditor({
  messages,
  onChange,
  placeholder,
}: {
  messages: FlowMessage[];
  onChange: (messages: FlowMessage[]) => void;
  placeholder?: string;
}) {
  const patch = (i: number, p: Partial<FlowMessage>) =>
    onChange(messages.map((m, idx) => (idx === i ? { ...m, ...p } : m)));
  const remove = (i: number) => onChange(messages.filter((_, idx) => idx !== i));
  const add = () => onChange([...messages, { role: "system", content: "" }]);

  return (
    <div className="space-y-2">
      {messages.map((m, i) => (
        <div key={i} className="rounded-xl border-[1.5px] border-input bg-paper p-2.5">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <select
              value={m.role}
              onChange={(e) => patch(i, { role: e.target.value as FlowMessageRole })}
              className="h-6 rounded-md border-[1.5px] border-input bg-cream/60 px-1.5 font-mono text-[10px] font-semibold text-forest"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => remove(i)}
              className="flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-sand hover:text-ink"
              aria-label="Remove message"
            >
              <X className="size-3" />
            </button>
          </div>
          <Textarea
            value={m.content}
            onChange={(e) => patch(i, { content: e.target.value })}
            placeholder={placeholder}
            className="min-h-[64px] rounded-lg border-[1.5px] border-input text-[12.5px] leading-relaxed"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex w-full items-center justify-center gap-1 rounded-lg border-[1.5px] border-dashed border-input py-1.5 font-display text-[9px] font-extrabold tracking-[0.1em] text-muted-foreground uppercase hover:border-ink hover:text-ink"
      >
        <Plus className="size-2.5" />
        Add message
      </button>
    </div>
  );
}

// ── Custom variables ────────────────────────────────────────────────────────

function CustomVariableEditor({
  variables,
  onChange,
}: {
  variables: CustomVariable[];
  onChange: (next: CustomVariable[]) => void;
}) {
  const patch = (i: number, p: Partial<CustomVariable>) =>
    onChange(variables.map((v, idx) => (idx === i ? { ...v, ...p } : v)));
  const remove = (i: number) => onChange(variables.filter((_, idx) => idx !== i));
  const add = () => onChange([...variables, { name: "", defaultValue: "" }]);

  return (
    <div className="space-y-2">
      {variables.map((v, i) => (
        <div key={i} className="rounded-xl border-[1.5px] border-input bg-paper p-2.5">
          <div className="mb-2 flex items-center gap-2">
            <Input
              value={v.name}
              onChange={(e) => patch(i, { name: e.target.value })}
              placeholder="variable_name"
              className="h-8 flex-1 rounded-lg border-[1.5px] border-input font-mono text-[12px]"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-sand hover:text-ink"
              aria-label="Remove variable"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel>Default</FieldLabel>
              <Input
                value={v.defaultValue ?? ""}
                onChange={(e) => patch(i, { defaultValue: e.target.value || undefined })}
                className="h-8 rounded-lg border-[1.5px] border-input text-[12px]"
              />
            </div>
            <div>
              <FieldLabel>Description</FieldLabel>
              <Input
                value={v.description ?? ""}
                onChange={(e) => patch(i, { description: e.target.value || undefined })}
                className="h-8 rounded-lg border-[1.5px] border-input text-[12px]"
              />
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex w-full items-center justify-center gap-1 rounded-lg border-[1.5px] border-dashed border-input py-1.5 font-display text-[9px] font-extrabold tracking-[0.1em] text-muted-foreground uppercase hover:border-ink hover:text-ink"
      >
        <Plus className="size-2.5" />
        Add variable
      </button>
    </div>
  );
}
