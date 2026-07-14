"use client";

import * as React from "react";
import {
  Braces,
  Clock,
  Globe,
  ListChecks,
  Plus,
  Radio,
  Settings2,
  ShieldCheck,
  Trash2,
  Voicemail,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { KnowledgeBase } from "@/types";
import type { ContextStrategy, CustomVariable, FlowConfig } from "@/lib/flow-contract";
import { CountBadge, Field, FieldLabel, Section, ToggleRow } from "@/components/flow/flow-fields";
import { KbPanel } from "@/components/flow/panels/kb-panel";

/**
 * Typed view of the flow's opaque `globalCallSettings` record. This is a local
 * lens over a `Record<string, unknown>` field — not a parallel flow type — so
 * the whole record round-trips untouched through the canvas transform.
 */
interface GlobalCallSettings {
  timezone?: string;
  maxCallDurationSecs?: number;
  inactivityTimeoutSecs?: number;
  goodbyeMessage?: string;
  vad?: { stopSecs?: number; confidence?: number };
  backgroundNoise?: { enabled?: boolean; sound?: string; volume?: number };
  gracefulExit?: { enabled?: boolean; warningSecs?: number; message?: string };
  voicemail?: { enabled?: boolean; leaveMessage?: boolean; message?: string };
  postCallAnalysis?: { enabled?: boolean; prompt?: string };
}

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

const BACKGROUND_SOUNDS = ["office", "call_center", "cafe"];

interface GlobalSettingsPanelProps {
  flowConfig: FlowConfig;
  onChange: (updater: (prev: FlowConfig) => FlowConfig) => void;
  knowledgeBases: KnowledgeBase[];
}

/**
 * Flow-level configuration surfaced when no node is selected — metadata, the
 * global persona, default context handling, custom variables, retrieval, and
 * the pipeline-wide call settings.
 */
export function GlobalSettingsPanel({ flowConfig, onChange, knowledgeBases }: GlobalSettingsPanelProps) {
  const call = (flowConfig.globalCallSettings ?? {}) as GlobalCallSettings;
  const persona = flowConfig.globalRoleMessages?.[0]?.content ?? "";
  const customVars = flowConfig.customVariables ?? [];

  const setCall = (patch: Partial<GlobalCallSettings>) =>
    onChange((prev) => ({
      ...prev,
      globalCallSettings: {
        ...((prev.globalCallSettings ?? {}) as GlobalCallSettings),
        ...patch,
      } as Record<string, unknown>,
    }));

  const setMeta = (patch: Partial<FlowConfig["meta"]>) =>
    onChange((prev) => ({ ...prev, meta: { ...prev.meta, ...patch } }));

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
      <div className="mb-4">
        <div className="eyebrow flex items-center gap-1.5 text-[9.5px] text-muted-foreground">
          <Settings2 className="size-3" />
          Flow settings
        </div>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          Applies to the whole flow. Select a node to edit its behaviour.
        </p>
      </div>

      {/* ── Metadata ── */}
      <Field label="Flow name">
        <Input
          value={flowConfig.meta.name}
          onChange={(e) => setMeta({ name: e.target.value })}
          className="h-10 rounded-xl border-[1.5px] border-input text-[13px]"
        />
      </Field>
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Version">
          <Input
            value={flowConfig.meta.version}
            onChange={(e) => setMeta({ version: e.target.value })}
            className="h-9 rounded-lg border-[1.5px] border-input font-mono text-[12.5px]"
          />
        </Field>
        <Field label="Timezone">
          <Select value={call.timezone ?? "UTC"} onValueChange={(v) => setCall({ timezone: v })}>
            <SelectTrigger className="h-9 w-full rounded-lg border-[1.5px] border-input text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Description">
        <Textarea
          value={flowConfig.meta.description ?? ""}
          onChange={(e) => setMeta({ description: e.target.value || undefined })}
          placeholder="What this flow does."
          className="min-h-[52px] rounded-xl border-[1.5px] border-input text-[12.5px]"
        />
      </Field>

      {/* ── Global persona ── */}
      <Field
        label="Global persona"
        hint="Applied to every node unless a node overrides it with its own persona."
      >
        <Textarea
          value={persona}
          onChange={(e) =>
            onChange((prev) => ({
              ...prev,
              globalRoleMessages: e.target.value
                ? [{ role: "system", content: e.target.value }]
                : undefined,
            }))
          }
          placeholder="You are a warm, concise voice assistant…"
          className="min-h-[92px] rounded-xl border-[1.5px] border-input font-mono text-[12.5px]"
        />
      </Field>

      {/* ── Default context strategy ── */}
      <Field label="Default context strategy" hint="Per-node context strategy overrides this default.">
        <Select
          value={flowConfig.globalContextStrategy ?? "append"}
          onValueChange={(v) =>
            onChange((prev) => ({
              ...prev,
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
      {flowConfig.globalContextStrategy === "reset_with_summary" && (
        <Field label="Global summary prompt">
          <Textarea
            value={flowConfig.globalSummaryPrompt ?? ""}
            onChange={(e) =>
              onChange((prev) => ({ ...prev, globalSummaryPrompt: e.target.value || undefined }))
            }
            className="min-h-[56px] rounded-xl border-[1.5px] border-input text-[12.5px]"
          />
        </Field>
      )}

      {/* ── Custom variables ── */}
      <Section
        title="Custom variables"
        icon={Braces}
        defaultOpen={customVars.length > 0}
        badge={<CountBadge n={customVars.length} />}
      >
        <CustomVariablesEditor
          variables={customVars}
          onChange={(vars) =>
            onChange((prev) => ({ ...prev, customVariables: vars.length ? vars : undefined }))
          }
        />
      </Section>

      {/* ── Knowledge bases ── */}
      <Section
        title="Knowledge bases"
        icon={ListChecks}
        badge={<CountBadge n={flowConfig.globalKnowledgeBases?.length ?? 0} />}
      >
        <KbPanel
          knowledgeBases={knowledgeBases}
          bindings={flowConfig.globalKnowledgeBases ?? []}
          onChange={(bindings) =>
            onChange((prev) => ({
              ...prev,
              globalKnowledgeBases: bindings.length ? bindings : undefined,
            }))
          }
        />
      </Section>

      {/* ── Call limits ── */}
      <Section title="Call limits" icon={Clock} defaultOpen>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Max duration (s)" className="mb-0">
            <Input
              type="number"
              min={30}
              value={call.maxCallDurationSecs ?? 240}
              onChange={(e) => setCall({ maxCallDurationSecs: Number(e.target.value) || undefined })}
              className="h-9 rounded-lg border-[1.5px] border-input text-[12.5px]"
            />
          </Field>
          <Field label="Inactivity (s)" className="mb-0">
            <Input
              type="number"
              min={5}
              value={call.inactivityTimeoutSecs ?? 30}
              onChange={(e) => setCall({ inactivityTimeoutSecs: Number(e.target.value) || undefined })}
              className="h-9 rounded-lg border-[1.5px] border-input text-[12.5px]"
            />
          </Field>
        </div>
        <Field label="Goodbye message" hint="Spoken when the call ends." className="mt-3 mb-0">
          <Textarea
            value={call.goodbyeMessage ?? ""}
            onChange={(e) => setCall({ goodbyeMessage: e.target.value || undefined })}
            placeholder="Thank you for calling. Goodbye!"
            className="min-h-[52px] rounded-lg border-[1.5px] border-input text-[12.5px]"
          />
        </Field>
      </Section>

      {/* ── Voice activity detection ── */}
      <Section title="Turn-taking (VAD)" icon={Radio}>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <FieldLabel className="mb-0">End-of-turn silence (s)</FieldLabel>
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              {(call.vad?.stopSecs ?? 0.6).toFixed(2)}
            </span>
          </div>
          <Slider
            value={[call.vad?.stopSecs ?? 0.6]}
            onValueChange={([v]) =>
              setCall({ vad: { ...call.vad, stopSecs: parseFloat(v.toFixed(2)) } })
            }
            min={0.2}
            max={3}
            step={0.1}
            className="py-1.5"
          />
        </div>
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between">
            <FieldLabel className="mb-0">Confidence</FieldLabel>
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              {(call.vad?.confidence ?? 0.7).toFixed(2)}
            </span>
          </div>
          <Slider
            value={[call.vad?.confidence ?? 0.7]}
            onValueChange={([v]) =>
              setCall({ vad: { ...call.vad, confidence: parseFloat(v.toFixed(2)) } })
            }
            min={0.1}
            max={1}
            step={0.05}
            className="py-1.5"
          />
        </div>
      </Section>

      {/* ── Background noise ── */}
      <Section title="Background ambience" icon={Globe}>
        <ToggleRow
          label="Play background ambience"
          hint="Adds subtle room tone under the agent's voice."
          checked={call.backgroundNoise?.enabled ?? false}
          onChange={(v) => setCall({ backgroundNoise: { ...call.backgroundNoise, enabled: v } })}
        />
        {call.backgroundNoise?.enabled && (
          <>
            <Field label="Sound">
              <Select
                value={call.backgroundNoise?.sound ?? "office"}
                onValueChange={(v) =>
                  setCall({ backgroundNoise: { ...call.backgroundNoise, sound: v } })
                }
              >
                <SelectTrigger className="h-9 w-full rounded-lg border-[1.5px] border-input text-[12.5px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BACKGROUND_SOUNDS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <FieldLabel className="mb-0">Volume</FieldLabel>
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                  {(call.backgroundNoise?.volume ?? 0.2).toFixed(2)}
                </span>
              </div>
              <Slider
                value={[call.backgroundNoise?.volume ?? 0.2]}
                onValueChange={([v]) =>
                  setCall({
                    backgroundNoise: { ...call.backgroundNoise, volume: parseFloat(v.toFixed(2)) },
                  })
                }
                min={0}
                max={0.5}
                step={0.05}
                className="py-1.5"
              />
            </div>
          </>
        )}
      </Section>

      {/* ── Graceful exit ── */}
      <Section title="Graceful exit" icon={ShieldCheck}>
        <ToggleRow
          label="Warn before the call is cut off"
          hint="Speaks a heads-up shortly before the max-duration limit."
          checked={call.gracefulExit?.enabled ?? false}
          onChange={(v) => setCall({ gracefulExit: { ...call.gracefulExit, enabled: v } })}
        />
        {call.gracefulExit?.enabled && (
          <>
            <Field label="Warn (s before limit)">
              <Input
                type="number"
                min={5}
                value={call.gracefulExit?.warningSecs ?? 30}
                onChange={(e) =>
                  setCall({
                    gracefulExit: {
                      ...call.gracefulExit,
                      warningSecs: Number(e.target.value) || undefined,
                    },
                  })
                }
                className="h-9 rounded-lg border-[1.5px] border-input text-[12.5px]"
              />
            </Field>
            <Field label="Warning message" className="mb-0">
              <Textarea
                value={call.gracefulExit?.message ?? ""}
                onChange={(e) =>
                  setCall({ gracefulExit: { ...call.gracefulExit, message: e.target.value } })
                }
                placeholder="We're almost out of time, so let me quickly wrap up."
                className="min-h-[48px] rounded-lg border-[1.5px] border-input text-[12.5px]"
              />
            </Field>
          </>
        )}
      </Section>

      {/* ── Voicemail ── */}
      <Section title="Voicemail" icon={Voicemail}>
        <ToggleRow
          label="Detect voicemail"
          hint="Handle answering machines on outbound telephony calls."
          checked={call.voicemail?.enabled ?? false}
          onChange={(v) => setCall({ voicemail: { ...call.voicemail, enabled: v } })}
        />
        {call.voicemail?.enabled && (
          <>
            <ToggleRow
              label="Leave a message"
              checked={call.voicemail?.leaveMessage ?? false}
              onChange={(v) => setCall({ voicemail: { ...call.voicemail, leaveMessage: v } })}
            />
            {call.voicemail?.leaveMessage && (
              <Field label="Voicemail message" className="mb-0">
                <Textarea
                  value={call.voicemail?.message ?? ""}
                  onChange={(e) =>
                    setCall({ voicemail: { ...call.voicemail, message: e.target.value } })
                  }
                  placeholder="Hi, this is a callback regarding your request…"
                  className="min-h-[48px] rounded-lg border-[1.5px] border-input text-[12.5px]"
                />
              </Field>
            )}
          </>
        )}
      </Section>

      {/* ── Post-call analysis ── */}
      <Section title="Post-call analysis" icon={ListChecks}>
        <ToggleRow
          label="Extract structured data after the call"
          hint="Runs a summarisation/extraction pass over the transcript."
          checked={call.postCallAnalysis?.enabled ?? false}
          onChange={(v) => setCall({ postCallAnalysis: { ...call.postCallAnalysis, enabled: v } })}
        />
        {call.postCallAnalysis?.enabled && (
          <Field label="Analysis prompt" className="mb-0">
            <Textarea
              value={call.postCallAnalysis?.prompt ?? ""}
              onChange={(e) =>
                setCall({ postCallAnalysis: { ...call.postCallAnalysis, prompt: e.target.value } })
              }
              placeholder="Extract the caller's intent, any dates mentioned, and the outcome."
              className="min-h-[64px] rounded-lg border-[1.5px] border-input text-[12.5px]"
            />
          </Field>
        )}
      </Section>
    </div>
  );
}

// ── Custom variables editor ──────────────────────────────────────────────────

function CustomVariablesEditor({
  variables,
  onChange,
}: {
  variables: CustomVariable[];
  onChange: (vars: CustomVariable[]) => void;
}) {
  const update = (i: number, patch: Partial<CustomVariable>) =>
    onChange(variables.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  const remove = (i: number) => onChange(variables.filter((_, idx) => idx !== i));
  const add = () => onChange([...variables, { name: "", defaultValue: "", description: "" }]);

  return (
    <div className="space-y-2">
      {variables.length === 0 && (
        <p className="text-[10.5px] text-muted-foreground">
          None yet. Add variables to reference them in prompts via <code>{"{{name}}"}</code>.
        </p>
      )}

      {variables.map((v, i) => (
        <div key={i} className="space-y-1.5 rounded-lg border-[1.5px] border-input bg-paper p-2.5">
          <div className="flex items-center gap-1.5">
            <Input
              value={v.name}
              onChange={(e) =>
                update(i, { name: e.target.value.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase() })
              }
              placeholder="variable_name"
              className="h-7 flex-1 rounded-lg border-[1.5px] border-input font-mono text-[11px]"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-sand hover:text-ink"
              aria-label="Remove variable"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <Input
              value={v.defaultValue ?? ""}
              onChange={(e) => update(i, { defaultValue: e.target.value })}
              placeholder="Default value"
              className="h-7 rounded-lg border-[1.5px] border-input text-[11px]"
            />
            <Input
              value={v.description ?? ""}
              onChange={(e) => update(i, { description: e.target.value })}
              placeholder="Description"
              className="h-7 rounded-lg border-[1.5px] border-input text-[11px]"
            />
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
