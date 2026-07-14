"use client";

import { BookOpen, Grid3x3, PhoneForwarded, Send, Sliders } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
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
import {
  LANGUAGE_CATALOG,
  MAX_VOICE_SPEED,
  MIN_VOICE_SPEED,
  VOICE_SPEED_STEP,
} from "@/lib/voice-catalog";
import type { FlowNodeData, FlowNodeType, FlowServiceOverrides } from "@/lib/flow-contract";
import type { KnowledgeBase } from "@/types";
import { CountBadge, Field, FieldLabel, Section, ToggleRow } from "@/components/flow/flow-fields";
import { NodeKbSelector } from "@/components/flow/panels/kb-node-selector";

const INHERIT = "__inherit__";

interface SettingsPanelProps {
  data: FlowNodeData;
  kind: FlowNodeType;
  knowledgeBases: KnowledgeBase[];
  onChange: (patch: Partial<FlowNodeData>) => void;
}

/**
 * The "Settings" tab — everything about how a node behaves at runtime:
 * history handling, entry behaviour, per-node service overrides, telephony
 * config, and a knowledge-base override.
 */
export function SettingsPanel({ data, kind, knowledgeBases, onChange }: SettingsPanelProps) {
  const isEnd = kind === "end";

  return (
    <div className="space-y-1">
      {/* ── Behaviour ── */}
      {!isEnd && (
        <>
          <Field label="Context strategy" hint="How prior conversation history enters this node.">
            <Select
              value={data.contextStrategy ?? "append"}
              onValueChange={(v) =>
                onChange({
                  contextStrategy:
                    v === "append" ? undefined : (v as FlowNodeData["contextStrategy"]),
                })
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

          <ToggleRow
            label="Respond immediately"
            hint="On — the agent speaks on entry. Off — it waits for the caller."
            checked={data.respondImmediately !== false}
            onChange={(v) => onChange({ respondImmediately: v })}
          />

          <Field
            label="First message (exact TTS)"
            hint="Spoken verbatim on entry, bypassing the model. Supports {{variables}}."
          >
            <Textarea
              value={data.firstMessage ?? ""}
              onChange={(e) => onChange({ firstMessage: e.target.value || undefined })}
              placeholder="Optional exact line spoken when this node is entered."
              className="min-h-[56px] rounded-xl border-[1.5px] border-input text-[12.5px]"
            />
          </Field>
        </>
      )}

      {/* ── Telephony ── */}
      {kind === "transfer" && <TransferFields data={data} onChange={onChange} />}
      {kind === "dtmf" && <DtmfFields data={data} onChange={onChange} />}
      {kind === "sms" && <SmsFields data={data} onChange={onChange} />}

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

      {/* ── Knowledge base ── */}
      <Section
        title="Knowledge base"
        icon={BookOpen}
        badge={data.knowledgeBase ? <CountBadge n={1} /> : null}
      >
        <NodeKbSelector
          knowledgeBases={knowledgeBases}
          binding={data.knowledgeBase}
          onChange={(kb) => onChange({ knowledgeBase: kb })}
        />
      </Section>
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
    <div className="mb-3 rounded-xl border-[1.5px] border-brand-orange/40 bg-brand-orange/5 p-3.5">
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
    <div className="mb-3 rounded-xl border-[1.5px] border-input bg-sand/40 p-3.5">
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
    <div className="mb-3 rounded-xl border-[1.5px] border-brand-yellow/60 bg-brand-yellow/10 p-3.5">
      <div className="eyebrow mb-2.5 flex items-center gap-1.5 text-[9.5px] text-ink">
        <Send className="size-3" />
        SMS
      </div>
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

function countOverrides(so?: FlowServiceOverrides): number {
  if (!so) return 0;
  let n = 0;
  if (so.llm?.model || so.llm?.temperature !== undefined) n += 1;
  if (so.tts?.voice || so.tts?.model || so.tts?.speed !== undefined) n += 1;
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
    const clean: FlowServiceOverrides = {};
    if (next.llm && (next.llm.model || next.llm.temperature !== undefined)) clean.llm = next.llm;
    if (next.tts && (next.tts.voice || next.tts.model || next.tts.speed !== undefined))
      clean.tts = next.tts;
    if (next.stt && (next.stt.model || next.stt.language)) clean.stt = next.stt;
    if (next.sttMute) clean.sttMute = true;
    onChange(Object.keys(clean).length ? clean : undefined);
  };

  return (
    <div className="space-y-3">
      {/* LLM model */}
      <div>
        <FieldLabel>LLM model</FieldLabel>
        <Select
          value={so.llm?.model ?? INHERIT}
          onValueChange={(v) =>
            patch({
              ...so,
              llm:
                v === INHERIT
                  ? so.llm?.temperature !== undefined
                    ? { temperature: so.llm.temperature }
                    : undefined
                  : { ...so.llm, model: v },
            })
          }
        >
          <SelectTrigger className="h-9 w-full rounded-lg border-[1.5px] border-input text-[12.5px]">
            <span className="flex min-w-0 items-center gap-2">
              {so.llm?.model && (
                <ProviderIcon provider={getProviderForModel(so.llm.model)} className="size-4" />
              )}
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={INHERIT}>Inherit</SelectItem>
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

      {/* LLM temperature */}
      <div>
        <div className="flex items-center justify-between">
          <FieldLabel className="mb-0">Temperature</FieldLabel>
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
            {so.llm?.temperature ?? "inherit"}
          </span>
        </div>
        <Slider
          value={[so.llm?.temperature ?? 0.7]}
          onValueChange={([v]) =>
            patch({ ...so, llm: { ...so.llm, temperature: parseFloat(v.toFixed(2)) } })
          }
          min={0}
          max={1}
          step={0.05}
          className="py-1.5"
        />
      </div>

      {/* STT model */}
      <div>
        <FieldLabel>STT model</FieldLabel>
        <Select
          value={so.stt?.model ?? INHERIT}
          onValueChange={(v) =>
            patch({
              ...so,
              stt:
                v === INHERIT
                  ? so.stt?.language
                    ? { language: so.stt.language }
                    : undefined
                  : { ...so.stt, model: v },
            })
          }
        >
          <SelectTrigger className="h-9 w-full rounded-lg border-[1.5px] border-input text-[12.5px]">
            <span className="flex min-w-0 items-center gap-2">
              {so.stt?.model && (
                <ProviderIcon provider={getSTTProviderForModel(so.stt.model)} className="size-4" />
              )}
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={INHERIT}>Inherit</SelectItem>
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

      {/* STT language */}
      <div>
        <FieldLabel>STT language</FieldLabel>
        <Select
          value={so.stt?.language ?? INHERIT}
          onValueChange={(v) =>
            patch({
              ...so,
              stt:
                v === INHERIT
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
            <SelectItem value={INHERIT}>Inherit</SelectItem>
            {LANGUAGE_CATALOG.map((l) => (
              <SelectItem key={l.code} value={l.code}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* TTS voice */}
      <div>
        <FieldLabel>TTS voice</FieldLabel>
        <Select
          value={so.tts?.voice ?? INHERIT}
          onValueChange={(v) =>
            patch({
              ...so,
              tts:
                v === INHERIT
                  ? so.tts?.model || so.tts?.speed !== undefined
                    ? { model: so.tts?.model, speed: so.tts?.speed }
                    : undefined
                  : { ...so.tts, voice: v },
            })
          }
        >
          <SelectTrigger className="h-9 w-full rounded-lg border-[1.5px] border-input text-[12.5px]">
            <span className="flex min-w-0 items-center gap-2">
              {so.tts?.voice && (
                <ProviderIcon provider={getTTSProviderForVoice(so.tts.voice)} className="size-4" />
              )}
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={INHERIT}>Inherit</SelectItem>
            {TTS_PROVIDER_GROUPS.map((g) => (
              <SelectGroup key={g.provider}>
                <SelectLabel className="flex items-center gap-2 text-muted-foreground">
                  <ProviderIcon provider={g.provider} className="size-3.5" />
                  {g.label}
                </SelectLabel>
                {g.voices.map((voice) => (
                  <SelectItem key={voice.voiceId} value={voice.voiceId}>
                    {voice.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* TTS speed */}
      <div>
        <div className="flex items-center justify-between">
          <FieldLabel className="mb-0">Voice speed</FieldLabel>
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
            {so.tts?.speed ? `${so.tts.speed.toFixed(1)}×` : "inherit"}
          </span>
        </div>
        <Slider
          value={[so.tts?.speed ?? 1.0]}
          onValueChange={([v]) =>
            patch({
              ...so,
              tts: { ...so.tts, speed: v === 1.0 ? undefined : parseFloat(v.toFixed(2)) },
            })
          }
          min={MIN_VOICE_SPEED}
          max={MAX_VOICE_SPEED}
          step={VOICE_SPEED_STEP}
          className="py-1.5"
        />
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
