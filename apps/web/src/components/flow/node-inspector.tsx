"use client";

import * as React from "react";
import {
  BookOpen,
  Cpu,
  Flag,
  Grid3x3,
  MessageSquare,
  PhoneForwarded,
  Play,
  Plus,
  Send,
  Sliders,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import type { KnowledgeBase, ToolDef } from "@/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProviderIcon } from "@/components/shared/provider-icon";
import { LLM_PROVIDER_GROUPS, getProviderForModel } from "@/lib/llm-catalog";
import { STT_PROVIDER_GROUPS, getSTTProviderForModel } from "@/lib/stt-catalog";
import { TTS_PROVIDER_GROUPS, getTTSProviderForVoice } from "@/lib/tts-catalog";
import { LANGUAGE_CATALOG } from "@/lib/voice-catalog";
import {
  type FlowMessage,
  type FlowMessageRole,
  type FlowNodeData,
  type FlowNodeType,
  type FlowServiceOverrides,
  type FlowTransition,
  isTerminalNode,
  uniqueTransitionName,
} from "@/lib/flow-contract";
import { CountBadge, Field, FieldLabel, Section, ToggleRow } from "@/components/flow/flow-fields";
import { TransitionEditor } from "@/components/flow/transition-editor";

const KIND_ICON: Record<FlowNodeType, React.ComponentType<{ className?: string }>> = {
  initial: Play,
  node: MessageSquare,
  transfer: PhoneForwarded,
  dtmf: Grid3x3,
  sms: Send,
  end: Flag,
};

export interface NodeInspectorProps {
  nodeId: string;
  kind: FlowNodeType;
  data: FlowNodeData;
  /** Candidate transition targets (all nodes except this one). */
  targets: { id: string; label: string; kind: FlowNodeType }[];
  tools: ToolDef[];
  knowledgeBases: KnowledgeBase[];
  onChange: (patch: Partial<FlowNodeData>) => void;
  onDelete: () => void;
  onClose: () => void;
  /** Transition index to auto-expand (e.g. when an edge was clicked). */
  focusTransition?: number | null;
}

export function NodeInspector({
  nodeId,
  kind,
  data,
  targets,
  tools,
  knowledgeBases,
  onChange,
  onDelete,
  onClose,
  focusTransition,
}: NodeInspectorProps) {
  const Icon = KIND_ICON[kind];

  const patchTransition = (i: number, patch: Partial<FlowTransition>) => {
    const next = data.functions.map((f, idx) => (idx === i ? { ...f, ...patch } : f));
    onChange({ functions: next });
  };
  const removeTransition = (i: number) => {
    onChange({ functions: data.functions.filter((_, idx) => idx !== i) });
  };
  const addTransition = () => {
    const taken = new Set(data.functions.map((f) => f.name));
    const first = targets[0];
    const fn: FlowTransition = {
      name: uniqueTransitionName("next", taken),
      description: "",
      handlerType: "transition",
      targetNode: first?.id,
      sourceHandle: kind === "sms" ? "sms-success" : undefined,
    };
    onChange({ functions: [...data.functions, fn] });
  };

  return (
    <aside className="absolute inset-y-4 right-4 z-10 flex w-[340px] flex-col overflow-hidden rounded-2xl border-[1.5px] border-ink bg-paper shadow-[4px_4px_0_var(--ink)]">
      {/* header */}
      <div className="flex items-center justify-between border-b-[1.5px] border-ink/10 px-5 py-4">
        <span className="eyebrow flex items-center gap-1.5 text-[9.5px] text-muted-foreground">
          <Icon className="size-3" />
          {kind} node
        </span>
        <div className="flex items-center gap-1">
          {kind !== "initial" && (
            <button
              type="button"
              onClick={onDelete}
              className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-sand hover:text-ink"
              aria-label="Delete node"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex size-6 items-center justify-center rounded-full hover:bg-sand"
            aria-label="Close inspector"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <Field label="Label">
          <Input
            value={data.label}
            onChange={(e) => onChange({ label: e.target.value })}
            className="h-10 rounded-xl border-[1.5px] border-input text-[13px]"
          />
        </Field>

        <FieldLabel>Objective (task messages)</FieldLabel>
        <MessageListEditor
          messages={data.taskMessages}
          minOne
          onChange={(m) => onChange({ taskMessages: m })}
          placeholder="Describe this stage's objective — used as the node prompt."
        />

        {/* ── Behaviour ── */}
        <div className="mt-2" />
        {(kind === "initial" || data.firstMessage !== undefined) && (
          <Field label="First message (exact TTS)" hint="Spoken verbatim on entry, bypassing the LLM.">
            <Textarea
              value={data.firstMessage ?? ""}
              onChange={(e) => onChange({ firstMessage: e.target.value })}
              className="min-h-[60px] rounded-xl border-[1.5px] border-input text-[12.5px]"
            />
          </Field>
        )}

        <ToggleRow
          label="Respond immediately"
          hint="On — agent speaks on entry. Off — waits for the caller."
          checked={data.respondImmediately !== false}
          onChange={(v) => onChange({ respondImmediately: v })}
        />

        <Field label="Context strategy">
          <Select
            value={data.contextStrategy ?? "append"}
            onValueChange={(v) =>
              onChange({ contextStrategy: v === "append" ? undefined : (v as FlowNodeData["contextStrategy"]) })
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

        {data.contextStrategy === "reset_with_summary" && (
          <Field label="Summary prompt" hint="How to summarise prior history before entering this node.">
            <Textarea
              value={data.summaryPrompt ?? ""}
              onChange={(e) => onChange({ summaryPrompt: e.target.value })}
              className="min-h-[56px] rounded-xl border-[1.5px] border-input text-[12.5px]"
            />
          </Field>
        )}

        {/* ── Telephony fields ── */}
        {kind === "transfer" && <TransferFields data={data} onChange={onChange} />}
        {kind === "dtmf" && <DtmfFields data={data} onChange={onChange} />}
        {kind === "sms" && <SmsFields data={data} onChange={onChange} />}

        {/* ── Role messages ── */}
        <Section title="Role messages (persona)" badge={<CountBadge n={data.roleMessages?.length ?? 0} />}>
          <MessageListEditor
            messages={data.roleMessages ?? []}
            onChange={(m) => onChange({ roleMessages: m.length ? m : undefined })}
            placeholder="Override the persona for this node."
          />
        </Section>

        {/* ── Service overrides ── */}
        <Section
          title="Service overrides"
          icon={Sliders}
          badge={<CountBadge n={countOverrides(data.serviceOverrides)} />}
        >
          <ServiceOverrideEditor
            value={data.serviceOverrides}
            onChange={(so) => onChange({ serviceOverrides: so })}
          />
        </Section>

        {/* ── Tools ── */}
        <Section title="Tools" icon={Wrench} badge={<CountBadge n={data.toolIds?.length ?? 0} />}>
          {tools.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No tools defined in this org yet.</p>
          ) : (
            <div className="space-y-1.5">
              {tools.map((t) => {
                const on = data.toolIds?.includes(t.id) ?? false;
                return (
                  <label
                    key={t.id}
                    className="flex cursor-pointer items-start gap-2.5 rounded-lg border-[1.5px] border-input bg-paper px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) => {
                        const set = new Set(data.toolIds ?? []);
                        if (e.target.checked) set.add(t.id);
                        else set.delete(t.id);
                        onChange({ toolIds: set.size ? [...set] : undefined });
                      }}
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

        {/* ── Knowledge base ── */}
        <Section title="Knowledge base" icon={BookOpen} badge={data.knowledgeBase ? <CountBadge n={1} /> : null}>
          <KnowledgeBaseEditor
            value={data.knowledgeBase}
            knowledgeBases={knowledgeBases}
            onChange={(kb) => onChange({ knowledgeBase: kb })}
          />
        </Section>

        {/* ── Transitions ── */}
        {!isTerminalNode(kind) && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="eyebrow text-[9.5px] text-ink">Transitions</span>
              <button
                type="button"
                onClick={addTransition}
                className="flex items-center gap-1 rounded-full border-[1.5px] border-border bg-paper px-2.5 py-1 font-display text-[9px] font-extrabold tracking-[0.1em] text-muted-foreground uppercase hover:border-ink hover:text-ink"
              >
                <Plus className="size-2.5" />
                Add
              </button>
            </div>
            {data.functions.length === 0 ? (
              <p className="rounded-xl border-[1.5px] border-dashed border-brand-orange/50 bg-brand-orange/5 px-3 py-2.5 text-[11px] text-muted-foreground">
                No transitions — this node is a dead end. Add one, or wire an edge on the canvas.
              </p>
            ) : (
              <div className="space-y-2.5">
                {data.functions.map((fn, i) => (
                  <TransitionEditor
                    key={`${nodeId}-${i}`}
                    transition={fn}
                    sourceKind={kind}
                    targets={targets}
                    onChange={(patch) => patchTransition(i, patch)}
                    onDelete={() => removeTransition(i)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {focusTransition != null && (
          <p className="mt-3 text-[10px] text-muted-foreground">Editing the selected edge above.</p>
        )}
      </div>
    </aside>
  );
}

// ── Message list editor ──────────────────────────────────────────────────────

const ROLES: FlowMessageRole[] = ["system", "user", "assistant", "developer"];

function MessageListEditor({
  messages,
  onChange,
  minOne = false,
  placeholder,
}: {
  messages: FlowMessage[];
  onChange: (messages: FlowMessage[]) => void;
  minOne?: boolean;
  placeholder?: string;
}) {
  const patch = (i: number, p: Partial<FlowMessage>) =>
    onChange(messages.map((m, idx) => (idx === i ? { ...m, ...p } : m)));
  const remove = (i: number) => onChange(messages.filter((_, idx) => idx !== i));
  const add = () => onChange([...messages, { role: "system", content: "" }]);

  return (
    <div className="mb-4 space-y-2">
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
            {!(minOne && messages.length === 1) && (
              <button
                type="button"
                onClick={() => remove(i)}
                className="flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-sand hover:text-ink"
                aria-label="Remove message"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
          <Textarea
            value={m.content}
            onChange={(e) => patch(i, { content: e.target.value })}
            placeholder={placeholder}
            className="min-h-[72px] rounded-lg border-[1.5px] border-input text-[12.5px] leading-relaxed"
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

// ── Telephony field groups ───────────────────────────────────────────────────

function TransferFields({
  data,
  onChange,
}: {
  data: FlowNodeData;
  onChange: (patch: Partial<FlowNodeData>) => void;
}) {
  return (
    <div className="mb-2 rounded-xl border-[1.5px] border-brand-orange/40 bg-brand-orange/5 p-3.5">
      <div className="eyebrow mb-2.5 flex items-center gap-1.5 text-[9.5px] text-ink">
        <PhoneForwarded className="size-3" />
        Transfer
      </div>
      <Field label="Transfer to" hint="Destination phone number or SIP URI.">
        <Input
          value={data.transferTo ?? ""}
          onChange={(e) => onChange({ transferTo: e.target.value })}
          placeholder="+1 415 555 0142 · sip:desk@…"
          className="h-9 rounded-lg border-[1.5px] border-input text-[12.5px]"
        />
      </Field>
      <Field label="Type" className="mb-0">
        <Select
          value={data.transferType ?? "warm"}
          onValueChange={(v) => onChange({ transferType: v as "cold" | "warm" })}
        >
          <SelectTrigger className="h-9 w-full rounded-lg border-[1.5px] border-input text-[12.5px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="warm">Warm — whisper a summary first</SelectItem>
            <SelectItem value="cold">Cold — hand off immediately</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

function DtmfFields({
  data,
  onChange,
}: {
  data: FlowNodeData;
  onChange: (patch: Partial<FlowNodeData>) => void;
}) {
  return (
    <div className="mb-2 rounded-xl border-[1.5px] border-input bg-sand/40 p-3.5">
      <div className="eyebrow mb-2.5 flex items-center gap-1.5 text-[9.5px] text-ink">
        <Grid3x3 className="size-3" />
        DTMF
      </div>
      <Field label="Digits" hint='Digits to emit into the call, e.g. "1234#".' className="mb-0">
        <Input
          value={data.dtmfDigits ?? ""}
          onChange={(e) => onChange({ dtmfDigits: e.target.value })}
          placeholder="1234#"
          className="h-9 rounded-lg border-[1.5px] border-input font-mono text-[13px] tracking-widest"
        />
      </Field>
    </div>
  );
}

function SmsFields({
  data,
  onChange,
}: {
  data: FlowNodeData;
  onChange: (patch: Partial<FlowNodeData>) => void;
}) {
  return (
    <div className="mb-2 rounded-xl border-[1.5px] border-brand-yellow/60 bg-brand-yellow/10 p-3.5">
      <div className="eyebrow mb-2.5 flex items-center gap-1.5 text-[9.5px] text-ink">
        <Send className="size-3" />
        SMS
      </div>
      <Field label="Message" hint="Static body, or composition instructions for the LLM.">
        <Textarea
          value={data.smsContent ?? ""}
          onChange={(e) => onChange({ smsContent: e.target.value })}
          className="min-h-[60px] rounded-lg border-[1.5px] border-input text-[12.5px]"
        />
      </Field>
      <Field label="Recipient">
        <Select
          value={data.smsTo ?? "caller"}
          onValueChange={(v) => onChange({ smsTo: v as "caller" | "static" })}
        >
          <SelectTrigger className="h-9 w-full rounded-lg border-[1.5px] border-input text-[12.5px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="caller">The caller</SelectItem>
            <SelectItem value="static">A fixed number</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      {data.smsTo === "static" && (
        <Field label="Number" className="mb-0">
          <Input
            value={data.smsToNumber ?? ""}
            onChange={(e) => onChange({ smsToNumber: e.target.value })}
            placeholder="+1 415 555 0142"
            className="h-9 rounded-lg border-[1.5px] border-input text-[12.5px]"
          />
        </Field>
      )}
    </div>
  );
}

// ── Service overrides ────────────────────────────────────────────────────────

const NO_OVERRIDE = "__inherit__";

function countOverrides(so?: FlowServiceOverrides): number {
  if (!so) return 0;
  let n = 0;
  if (so.llm?.model) n += 1;
  if (so.tts?.voice || so.tts?.model) n += 1;
  if (so.stt?.model || so.stt?.language) n += 1;
  if (so.sttMute) n += 1;
  return n;
}

function ServiceOverrideEditor({
  value,
  onChange,
}: {
  value?: FlowServiceOverrides;
  onChange: (so: FlowServiceOverrides | undefined) => void;
}) {
  const so = value ?? {};
  const patch = (next: FlowServiceOverrides) => {
    const empty = !countOverrides(next) && !next.tts?.speed && next.stt?.language === undefined;
    onChange(empty && !countOverrides(next) ? undefined : next);
  };

  return (
    <div className="space-y-3">
      {/* LLM model */}
      <div>
        <FieldLabel>LLM model</FieldLabel>
        <Select
          value={so.llm?.model ?? NO_OVERRIDE}
          onValueChange={(v) =>
            patch({ ...so, llm: v === NO_OVERRIDE ? undefined : { ...so.llm, model: v } })
          }
        >
          <SelectTrigger className="h-9 w-full rounded-lg border-[1.5px] border-input text-[12.5px]">
            <span className="flex min-w-0 items-center gap-2">
              {so.llm?.model && <ProviderIcon provider={getProviderForModel(so.llm.model)} className="size-4" />}
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_OVERRIDE}>Inherit</SelectItem>
            {LLM_PROVIDER_GROUPS.map((g) => (
              <SelectGroup key={g.provider}>
                <SelectLabel className="flex items-center gap-2 text-muted-foreground">
                  <ProviderIcon provider={g.provider} className="size-3.5" />
                  {g.label}
                </SelectLabel>
                {g.models.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* STT model */}
      <div>
        <FieldLabel>STT model</FieldLabel>
        <Select
          value={so.stt?.model ?? NO_OVERRIDE}
          onValueChange={(v) =>
            patch({ ...so, stt: v === NO_OVERRIDE ? undefined : { ...so.stt, model: v } })
          }
        >
          <SelectTrigger className="h-9 w-full rounded-lg border-[1.5px] border-input text-[12.5px]">
            <span className="flex min-w-0 items-center gap-2">
              {so.stt?.model && <ProviderIcon provider={getSTTProviderForModel(so.stt.model)} className="size-4" />}
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_OVERRIDE}>Inherit</SelectItem>
            {STT_PROVIDER_GROUPS.map((g) => (
              <SelectGroup key={g.provider}>
                <SelectLabel className="flex items-center gap-2 text-muted-foreground">
                  <ProviderIcon provider={g.provider} className="size-3.5" />
                  {g.label}
                </SelectLabel>
                {g.models.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* TTS voice */}
      <div>
        <FieldLabel>TTS voice</FieldLabel>
        <Select
          value={so.tts?.voice ?? NO_OVERRIDE}
          onValueChange={(v) =>
            patch({ ...so, tts: v === NO_OVERRIDE ? undefined : { ...so.tts, voice: v } })
          }
        >
          <SelectTrigger className="h-9 w-full rounded-lg border-[1.5px] border-input text-[12.5px]">
            <span className="flex min-w-0 items-center gap-2">
              {so.tts?.voice && <ProviderIcon provider={getTTSProviderForVoice(so.tts.voice)} className="size-4" />}
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_OVERRIDE}>Inherit</SelectItem>
            {TTS_PROVIDER_GROUPS.map((g) => (
              <SelectGroup key={g.provider}>
                <SelectLabel className="flex items-center gap-2 text-muted-foreground">
                  <ProviderIcon provider={g.provider} className="size-3.5" />
                  {g.label}
                </SelectLabel>
                {g.voices.map((v) => (
                  <SelectItem key={v.voiceId} value={v.voiceId}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* STT language */}
      <div>
        <FieldLabel>STT language</FieldLabel>
        <Select
          value={so.stt?.language ?? NO_OVERRIDE}
          onValueChange={(v) =>
            patch({
              ...so,
              stt:
                v === NO_OVERRIDE
                  ? so.stt?.model
                    ? { model: so.stt.model }
                    : undefined
                  : { ...so.stt, language: v },
            })
          }
        >
          <SelectTrigger className="h-9 w-full rounded-lg border-[1.5px] border-input text-[12.5px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_OVERRIDE}>Inherit</SelectItem>
            {LANGUAGE_CATALOG.map((l) => (
              <SelectItem key={l.code} value={l.code}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ToggleRow
        label="Mute transcription"
        hint="Agent-only monologue — no caller STT at this node."
        checked={so.sttMute ?? false}
        onChange={(v) => patch({ ...so, sttMute: v || undefined })}
      />
    </div>
  );
}

// ── Knowledge base ───────────────────────────────────────────────────────────

function KnowledgeBaseEditor({
  value,
  knowledgeBases,
  onChange,
}: {
  value?: FlowNodeData["knowledgeBase"];
  knowledgeBases: KnowledgeBase[];
  onChange: (kb: FlowNodeData["knowledgeBase"]) => void;
}) {
  if (knowledgeBases.length === 0) {
    return <p className="text-[11px] text-muted-foreground">No knowledge bases in this org yet.</p>;
  }
  return (
    <div className="space-y-3">
      <div>
        <FieldLabel>Bound knowledge base</FieldLabel>
        <Select
          value={value?.knowledgeBaseId ?? NO_OVERRIDE}
          onValueChange={(v) =>
            onChange(
              v === NO_OVERRIDE
                ? undefined
                : { knowledgeBaseId: v, chunksToRetrieve: value?.chunksToRetrieve ?? 3, similarityThreshold: value?.similarityThreshold ?? 0.5 },
            )
          }
        >
          <SelectTrigger className="h-9 w-full rounded-lg border-[1.5px] border-input text-[12.5px]">
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_OVERRIDE}>None</SelectItem>
            {knowledgeBases.map((kb) => (
              <SelectItem key={kb.id} value={kb.id}>
                {kb.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {value?.knowledgeBaseId && (
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <FieldLabel>Chunks</FieldLabel>
            <Input
              type="number"
              min={1}
              max={10}
              value={value.chunksToRetrieve ?? 3}
              onChange={(e) =>
                onChange({ ...value, chunksToRetrieve: Number(e.target.value) || 1 })
              }
              className="h-9 rounded-lg border-[1.5px] border-input text-[12.5px]"
            />
          </div>
          <div>
            <FieldLabel>Similarity</FieldLabel>
            <Input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={value.similarityThreshold ?? 0.5}
              onChange={(e) =>
                onChange({ ...value, similarityThreshold: Number(e.target.value) })
              }
              className="h-9 rounded-lg border-[1.5px] border-input text-[12.5px]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
