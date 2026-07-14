"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowRight,
  BookOpen,
  Braces,
  CircleCheck,
  History,
  Loader2,
  Mic,
  PhoneOutgoing,
  Play,
  Waypoints,
  Wrench,
} from "lucide-react";
import type { Agent, KnowledgeBase, ToolDef } from "@/types";
import {
  api,
  type AgentVersionPayload,
  type ResponseLength,
  type ToolConfigPayload,
} from "@/lib/api-client";
import { fmtAgo } from "@/lib/format";
import { StatusChip } from "@/components/shared/status-chip";
import { ProviderIcon } from "@/components/shared/provider-icon";
import {
  ALL_LLM_MODELS,
  DEFAULT_LLM_MODEL,
  LLM_PROVIDER_GROUPS,
  getProviderForModel,
} from "@/lib/llm-catalog";
import {
  ALL_STT_MODELS,
  DEFAULT_STT_MODEL,
  STT_PROVIDER_GROUPS,
  getSTTProviderForModel,
} from "@/lib/stt-catalog";
import {
  ALL_TTS_MODELS,
  DEFAULT_TTS_MODEL,
  DEFAULT_TTS_PROVIDER,
  TTS_PROVIDER_GROUPS,
} from "@/lib/tts-catalog";
import {
  DEFAULT_LANGUAGE,
  DEFAULT_VOICE_ID,
  DEFAULT_VOICE_SPEED,
  LANGUAGE_CATALOG,
  VOICE_CATALOG,
} from "@/lib/voice-catalog";
import {
  DEFAULT_REALTIME_MODEL,
  DEFAULT_REALTIME_PROVIDER,
  DEFAULT_REALTIME_VOICE,
} from "@/lib/realtime-catalog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TRAITS = ["Warm", "Patient", "Direct", "Playful", "Formal", "Reassuring"];
const CUSTOM_VARIABLES = ["customer_name", "company", "account_id"];
type BackgroundNoise = "off" | "office" | "call_center" | "cafe";

/* ── Resolvers ────────────────────────────────────────────────────────────
 * The stored agent may carry legacy identifiers (e.g. provider-prefixed model
 * ids, display voice names, region-tagged languages). Coerce each into a valid
 * catalog value so the controlled selects always start on a real option.
 */

function resolveLlm(value: string | undefined): string {
  if (!value) return DEFAULT_LLM_MODEL;
  const bare = value.includes("/") ? value.slice(value.lastIndexOf("/") + 1) : value;
  return ALL_LLM_MODELS.some((m) => m.value === bare) ? bare : DEFAULT_LLM_MODEL;
}

function resolveStt(value: string | undefined): string {
  if (!value) return DEFAULT_STT_MODEL;
  const bare = value.includes("/") ? value.slice(value.lastIndexOf("/") + 1) : value;
  return ALL_STT_MODELS.some((m) => m.value === bare) ? bare : DEFAULT_STT_MODEL;
}

function resolveTts(value: string | undefined): string {
  if (!value) return DEFAULT_TTS_MODEL;
  const bare = value.includes("/") ? value.slice(value.lastIndexOf("/") + 1) : value;
  return ALL_TTS_MODELS.some((m) => m.value === bare) ? bare : DEFAULT_TTS_MODEL;
}

function ttsProviderForModel(modelValue: string): string {
  return ALL_TTS_MODELS.find((m) => m.value === modelValue)?.provider ?? DEFAULT_TTS_PROVIDER;
}

function resolveVoice(value: string | undefined): string {
  if (!value) return DEFAULT_VOICE_ID;
  if (VOICE_CATALOG.some((v) => v.id === value)) return value;
  const byName = VOICE_CATALOG.find((v) => v.name.toLowerCase() === value.toLowerCase());
  return byName ? byName.id : DEFAULT_VOICE_ID;
}

function resolveLanguage(value: string | undefined): string {
  if (!value) return DEFAULT_LANGUAGE;
  if (LANGUAGE_CATALOG.some((l) => l.code === value)) return value;
  const base = value.split("-")[0]!;
  return LANGUAGE_CATALOG.some((l) => l.code === base) ? base : DEFAULT_LANGUAGE;
}

// STT models exposed in the builder must be real-time streaming.
const STT_STREAMING_GROUPS = STT_PROVIDER_GROUPS.map((g) => ({
  ...g,
  models: g.models.filter((m) => m.streaming),
})).filter((g) => g.models.length > 0);

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between">
      <span className="eyebrow text-[10px] text-ink">{children}</span>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

function Panel({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border-[1.5px] border-border bg-paper p-6 ${className}`}>
      {title && <h3 className="display mb-5 text-[17px] text-ink">{title}</h3>}
      {children}
    </section>
  );
}

export function AgentBuilder({
  agent,
  tools,
  kbs,
}: {
  agent: Agent;
  tools: ToolDef[];
  kbs: KnowledgeBase[];
}) {
  // ── Persona ──
  const [systemPrompt, setSystemPrompt] = React.useState(
    agent.systemPrompt ?? "You are a helpful voice agent for your business…",
  );
  const [greeting, setGreeting] = React.useState(
    agent.greetingMessage ?? "Hello! How can I help you today?",
  );
  const [speaksFirst, setSpeaksFirst] = React.useState(agent.agentSpeaksFirst ?? true);
  const [traits, setTraits] = React.useState<string[]>(["Warm", "Patient"]);
  const [responseLength, setResponseLength] = React.useState<ResponseLength>("concise");

  // ── Voice stack ──
  const [llmModel, setLlmModel] = React.useState(() => resolveLlm(agent.voice.llm));
  const [sttModel, setSttModel] = React.useState(() => resolveStt(agent.voice.stt));
  const [ttsModel, setTtsModel] = React.useState(() => resolveTts(agent.voice.tts));
  const [realtimeEnabled, setRealtimeEnabled] = React.useState(false);
  const [voiceId, setVoiceId] = React.useState(() => resolveVoice(agent.voice.voice));
  const [language, setLanguage] = React.useState(() => resolveLanguage(agent.voice.language));
  const [speed, setSpeed] = React.useState([DEFAULT_VOICE_SPEED]);

  // ── Call behavior ──
  const [maxDuration, setMaxDuration] = React.useState(240);
  const [inactivityTimeout, setInactivityTimeout] = React.useState(30);
  const [vad, setVad] = React.useState([0.3]);
  const [silenceIntro, setSilenceIntro] = React.useState(true);
  const [disableBargeIn, setDisableBargeIn] = React.useState(false);
  const [backgroundNoise, setBackgroundNoise] = React.useState<BackgroundNoise>("off");
  const [goodbye, setGoodbye] = React.useState("Thank you for your time. Goodbye!");
  const [voicemailOn, setVoicemailOn] = React.useState(true);
  const [ivrOn, setIvrOn] = React.useState(false);

  // ── Tools & knowledge ──
  const attachableTools = React.useMemo(() => tools.slice(0, 4), [tools]);
  const [selectedToolIds, setSelectedToolIds] = React.useState<string[]>(() =>
    attachableTools.slice(0, 3).map((t) => t.id),
  );
  const [selectedKbIds, setSelectedKbIds] = React.useState<string[]>(() =>
    kbs.slice(0, 1).map((k) => k.id),
  );

  const [dirty, setDirty] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);

  const markDirty = () => setDirty(true);

  const toggle = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    id: string,
  ) => {
    setter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    markDirty();
  };

  const voicesForLanguage = React.useMemo(() => {
    if (language === "multi") return VOICE_CATALOG;
    const matches = VOICE_CATALOG.filter((v) => v.languages.includes(language));
    return matches.length > 0 ? matches : VOICE_CATALOG;
  }, [language]);

  const buildPayload = (): AgentVersionPayload => {
    const toolsConfig: ToolConfigPayload[] = attachableTools
      .filter((t) => selectedToolIds.includes(t.id))
      .map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        method: t.method,
        url: t.url,
        parameters: {},
        auth: { type: t.authType },
        timeoutMs: t.timeoutMs,
      }));

    return {
      label: `Edited via builder — ${new Date().toISOString().slice(0, 10)}`,
      personaConfig: {
        systemPrompt,
        agentSpeaksFirst: speaksFirst,
        greetingMessage: speaksFirst ? greeting : undefined,
        personalityTraits: traits,
        responseLengthPreference: responseLength,
      },
      voiceConfig: {
        llmProvider: getProviderForModel(llmModel),
        llmModel,
        sttProvider: getSTTProviderForModel(sttModel),
        sttModel,
        ttsProvider: ttsProviderForModel(ttsModel),
        ttsModel,
        ttsVoice: voiceId,
        language,
        voiceSpeed: speed[0],
        realtime: realtimeEnabled
          ? {
              enabled: true,
              provider: DEFAULT_REALTIME_PROVIDER,
              model: DEFAULT_REALTIME_MODEL,
              voice: DEFAULT_REALTIME_VOICE,
            }
          : { enabled: false },
      },
      advancedConfig: {
        maxCallDurationSecs: maxDuration,
        inactivityTimeoutSecs: inactivityTimeout,
        silenceDuringIntro: silenceIntro,
        silenceWhenAgentSpeaks: disableBargeIn,
        vad: { stopSecs: vad[0] },
        backgroundNoise:
          backgroundNoise === "off"
            ? { enabled: false }
            : { enabled: true, sound: backgroundNoise },
        goodbyeMessage: goodbye,
        voicemail: { enabled: voicemailOn },
        ivrNavigation: { enabled: ivrOn },
      },
      toolsConfig,
      knowledgeBaseBindings: selectedKbIds.map((knowledgeBaseId) => ({ knowledgeBaseId })),
    };
  };

  const publish = async () => {
    if (publishing) return;
    setPublishing(true);
    try {
      const version = await api.updateAgent(agent.id, buildPayload());
      const published = await api.publishAgent(agent.id, version.id);
      setDirty(false);
      toast.success(`Published v${published.version}`, {
        description: "Now serving calls on all assigned numbers.",
      });
    } catch (err) {
      toast.error("Couldn’t publish", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1200px]">
      {/* header */}
      <div className="rise-in flex flex-wrap items-end justify-between gap-x-8 gap-y-4 pt-6 pb-8">
        <div className="min-w-0">
          <div className="eyebrow flex items-center gap-2 text-muted-foreground">
            <Link href="/agents" className="hover:text-ink">Agents</Link>
            <span>/</span>
            <span>{agent.folder ?? "Root"}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="display text-[clamp(26px,3vw,36px)] text-ink">{agent.name}</h1>
            <StatusChip status={agent.status} />
            <span className="sticker text-[9px]">v{agent.version}</span>
          </div>
          <p className="mt-2 text-[13.5px] text-muted-foreground">
            {agent.description} · edited {fmtAgo(agent.updatedAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {agent.type === "flow" && (
            <Link
              href={`/agents/${agent.id}/flow`}
              className="flex h-11 items-center gap-2 rounded-full border-[1.5px] border-ink bg-brand-yellow px-5 font-display text-[11.5px] font-extrabold tracking-[0.1em] text-ink uppercase shadow-[3px_3px_0_var(--ink)] transition-transform hover:-translate-y-0.5"
            >
              <Waypoints className="size-4" />
              Flow canvas
            </Link>
          )}
          <Link
            href={`/agents/${agent.id}/test`}
            className="flex h-11 items-center gap-2 rounded-full border-[1.5px] border-ink bg-paper px-5 font-display text-[11.5px] font-extrabold tracking-[0.1em] text-ink uppercase shadow-[3px_3px_0_var(--ink)] transition-transform hover:-translate-y-0.5"
          >
            <Play className="size-4" />
            Test call
          </Link>
          <button
            type="button"
            onClick={publish}
            disabled={publishing}
            className="group flex h-11 items-center gap-2.5 rounded-full bg-ink px-6 font-display text-[11.5px] font-extrabold tracking-[0.1em] text-paper uppercase transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {publishing ? "Publishing" : dirty ? "Publish changes" : "Published"}
            <span className="flex size-5.5 items-center justify-center rounded-full bg-lime text-forest">
              {publishing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : dirty ? (
                <ArrowRight className="size-3 stroke-[3]" />
              ) : (
                <CircleCheck className="size-3.5" />
              )}
            </span>
          </button>
        </div>
      </div>

      <Tabs defaultValue="persona" className="rise-in rise-in-1">
        <TabsList className="mb-8 h-auto gap-1 rounded-full border-[1.5px] border-border bg-paper p-1.5">
          {[
            ["persona", "Persona"],
            ["voice", "Voice stack"],
            ["behavior", "Call behavior"],
            ["grounding", "Tools & knowledge"],
            ["versions", "Versions"],
          ].map(([v, label]) => (
            <TabsTrigger
              key={v}
              value={v}
              className="rounded-full px-5 py-2 font-display text-[11px] font-extrabold tracking-[0.1em] uppercase data-[state=active]:bg-ink data-[state=active]:text-paper"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── PERSONA ── */}
        <TabsContent value="persona" className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <Panel title="The brain">
              <FieldLabel hint="Written for speech — short sentences, no markdown">System prompt</FieldLabel>
              <Textarea
                value={systemPrompt}
                onChange={(e) => { setSystemPrompt(e.target.value); markDirty(); }}
                className="min-h-[220px] rounded-xl border-[1.5px] border-input bg-cream/50 text-[14px] leading-relaxed focus-visible:border-ink focus-visible:ring-ink/10"
              />
              <div className="mt-3 flex items-center gap-2 text-[11.5px] text-muted-foreground">
                <Braces className="size-3.5" />
                Variables available: {"{{customer_name}}"} · {"{{company}}"} · {"{{date}}"} · {"{{time}}"}
              </div>
            </Panel>

            <Panel title="Opening the call">
              <div className="flex items-center justify-between rounded-xl bg-cream/70 px-4 py-3.5">
                <div>
                  <div className="text-[13.5px] font-semibold text-ink">Agent speaks first</div>
                  <div className="text-[11.5px] text-muted-foreground">Required for outbound calls</div>
                </div>
                <Switch checked={speaksFirst} onCheckedChange={(v) => { setSpeaksFirst(v); markDirty(); }} />
              </div>
              {speaksFirst && (
                <div className="mt-4">
                  <FieldLabel hint="Spoken exactly — bypasses the LLM. @slug plays a recording.">Greeting message</FieldLabel>
                  <Textarea
                    value={greeting}
                    onChange={(e) => { setGreeting(e.target.value); markDirty(); }}
                    className="min-h-[64px] rounded-xl border-[1.5px] border-input text-[14px] focus-visible:border-ink focus-visible:ring-ink/10"
                  />
                </div>
              )}
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel title="Personality">
              <div className="flex flex-wrap gap-2">
                {TRAITS.map((t) => {
                  const on = traits.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setTraits((prev) => (on ? prev.filter((x) => x !== t) : [...prev, t]));
                        markDirty();
                      }}
                      className={`rounded-full border-[1.5px] px-4 py-1.5 font-display text-[10.5px] font-extrabold tracking-[0.1em] uppercase transition-all ${
                        on
                          ? "border-ink bg-lime text-forest shadow-[2px_2px_0_var(--ink)]"
                          : "border-border bg-paper text-muted-foreground hover:border-ink hover:text-ink"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
              <div className="mt-5">
                <FieldLabel>Response length</FieldLabel>
                <Select value={responseLength} onValueChange={(v) => { setResponseLength(v as ResponseLength); markDirty(); }}>
                  <SelectTrigger className="h-11 rounded-xl border-[1.5px] border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concise">Concise — quick answers</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="verbose">Verbose — detail-first</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Panel>

            <Panel title="Custom variables">
              <div className="space-y-2.5">
                {CUSTOM_VARIABLES.map((v) => (
                  <div key={v} className="flex items-center gap-2 rounded-lg bg-cream/70 px-3 py-2 font-mono text-[12.5px] text-ink">
                    <Braces className="size-3.5 text-forest" />
                    {"{{" + v + "}}"}
                    <span className="ml-auto text-[10.5px] text-muted-foreground">per-call</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => toast("Variable editor coming in this sprint")}
                className="mt-3 text-[12.5px] font-semibold text-forest underline-offset-4 hover:underline"
              >
                + Add variable
              </button>
            </Panel>
          </div>
        </TabsContent>

        {/* ── VOICE ── */}
        <TabsContent value="voice" className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <Panel title="Pipeline">
              <div className="grid gap-5 sm:grid-cols-3">
                {/* LLM */}
                <div>
                  <FieldLabel>LLM</FieldLabel>
                  <Select value={llmModel} onValueChange={(v) => { setLlmModel(v); markDirty(); }}>
                    <SelectTrigger className="h-11 w-full rounded-xl border-[1.5px] border-input">
                      <span className="flex min-w-0 items-center gap-2">
                        <ProviderIcon provider={getProviderForModel(llmModel)} className="size-4" />
                        <SelectValue />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {LLM_PROVIDER_GROUPS.map((g) => (
                        <SelectGroup key={g.provider}>
                          <SelectLabel className="flex items-center gap-2 text-muted-foreground">
                            <ProviderIcon provider={g.provider} className="size-3.5" />
                            {g.label}
                          </SelectLabel>
                          {g.models.map((m) => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* STT */}
                <div>
                  <FieldLabel>STT</FieldLabel>
                  <Select value={sttModel} onValueChange={(v) => { setSttModel(v); markDirty(); }}>
                    <SelectTrigger className="h-11 w-full rounded-xl border-[1.5px] border-input">
                      <span className="flex min-w-0 items-center gap-2">
                        <ProviderIcon provider={getSTTProviderForModel(sttModel)} className="size-4" />
                        <SelectValue />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {STT_STREAMING_GROUPS.map((g) => (
                        <SelectGroup key={g.provider}>
                          <SelectLabel className="flex items-center gap-2 text-muted-foreground">
                            <ProviderIcon provider={g.provider} className="size-3.5" />
                            {g.label}
                          </SelectLabel>
                          {g.models.map((m) => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* TTS */}
                <div>
                  <FieldLabel>TTS</FieldLabel>
                  <Select value={ttsModel} onValueChange={(v) => { setTtsModel(v); markDirty(); }}>
                    <SelectTrigger className="h-11 w-full rounded-xl border-[1.5px] border-input">
                      <span className="flex min-w-0 items-center gap-2">
                        <ProviderIcon provider={ttsProviderForModel(ttsModel)} className="size-4" />
                        <SelectValue />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {TTS_PROVIDER_GROUPS.map((g) => (
                        <SelectGroup key={g.provider}>
                          <SelectLabel className="flex items-center gap-2 text-muted-foreground">
                            <ProviderIcon provider={g.provider} className="size-3.5" />
                            {g.label}
                          </SelectLabel>
                          {g.models.map((m) => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between rounded-xl border-[1.5px] border-dashed border-ink/30 bg-cream/50 px-4 py-3.5">
                <div>
                  <div className="text-[13.5px] font-semibold text-ink">Realtime speech-to-speech</div>
                  <div className="text-[11.5px] text-muted-foreground">
                    Replace STT + LLM + TTS with one realtime model (OpenAI Realtime / Gemini Live)
                  </div>
                </div>
                <Switch checked={realtimeEnabled} onCheckedChange={(v) => { setRealtimeEnabled(v); markDirty(); }} />
              </div>
            </Panel>

            <Panel title="Voice">
              <div className="mb-5">
                <FieldLabel>Language</FieldLabel>
                <Select value={language} onValueChange={(v) => { setLanguage(v); markDirty(); }}>
                  <SelectTrigger className="h-11 w-full rounded-xl border-[1.5px] border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_CATALOG.map((l) => (
                      <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {voicesForLanguage.map((v) => {
                  const selected = v.id === voiceId;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => { setVoiceId(v.id); markDirty(); }}
                      className={`group flex items-center gap-3.5 rounded-2xl border-[1.5px] p-4 text-left transition-all ${
                        selected
                          ? "border-ink bg-lime/25 shadow-[3px_3px_0_var(--ink)]"
                          : "border-border bg-paper hover:border-ink"
                      }`}
                    >
                      <span className={`flex size-9 items-center justify-center rounded-full border-[1.5px] border-ink ${selected ? "bg-lime" : "bg-sand"}`}>
                        <Mic className="size-4 text-ink" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-[14px] font-bold text-ink">{v.name}</span>
                        <span className="block text-[11.5px] text-muted-foreground capitalize">{v.accent} · {v.category}</span>
                      </span>
                      <ProviderIcon provider="cartesia" className="size-4 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
              <div className="mt-6">
                <FieldLabel hint={`${speed[0].toFixed(2)}×`}>Speaking speed</FieldLabel>
                <Slider value={speed} onValueChange={(v) => { setSpeed(v); markDirty(); }} min={0.6} max={1.5} step={0.05} />
              </div>
            </Panel>
          </div>

          <Panel title="BYO keys" className="h-fit">
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Using platform keys. Add your own provider keys to route usage through your accounts —
              resolution order is org key → platform default.
            </p>
            <Link href="/settings/general" className="mt-4 inline-block text-[12.5px] font-semibold text-forest underline-offset-4 hover:underline">
              Manage provider keys →
            </Link>
          </Panel>
        </TabsContent>

        {/* ── BEHAVIOR ── */}
        <TabsContent value="behavior" className="grid gap-6 lg:grid-cols-2">
          <Panel title="Limits & turn-taking">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <FieldLabel hint="30–7200">Max duration (s)</FieldLabel>
                <Input
                  type="number"
                  value={maxDuration}
                  onChange={(e) => { setMaxDuration(Number(e.target.value)); markDirty(); }}
                  className="h-11 rounded-xl border-[1.5px] border-input"
                />
              </div>
              <div>
                <FieldLabel hint="5–300">Inactivity timeout (s)</FieldLabel>
                <Input
                  type="number"
                  value={inactivityTimeout}
                  onChange={(e) => { setInactivityTimeout(Number(e.target.value)); markDirty(); }}
                  className="h-11 rounded-xl border-[1.5px] border-input"
                />
              </div>
            </div>
            <div className="mt-6">
              <FieldLabel hint={`${vad[0].toFixed(2)}s`}>VAD stop — how long a pause ends the caller&apos;s turn</FieldLabel>
              <Slider value={vad} onValueChange={(v) => { setVad(v); markDirty(); }} min={0} max={1} step={0.05} />
            </div>
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-cream/70 px-4 py-3">
                <span className="text-[13px] font-medium text-ink">Stay silent during intro</span>
                <Switch checked={silenceIntro} onCheckedChange={(v) => { setSilenceIntro(v); markDirty(); }} />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-cream/70 px-4 py-3">
                <span className="text-[13px] font-medium text-ink">Disable barge-in while agent speaks</span>
                <Switch checked={disableBargeIn} onCheckedChange={(v) => { setDisableBargeIn(v); markDirty(); }} />
              </div>
            </div>
          </Panel>

          <div className="space-y-6">
            <Panel title="Ambience & exit">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <FieldLabel>Background noise</FieldLabel>
                  <Select value={backgroundNoise} onValueChange={(v) => { setBackgroundNoise(v as BackgroundNoise); markDirty(); }}>
                    <SelectTrigger className="h-11 w-full rounded-xl border-[1.5px] border-input"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">Off</SelectItem>
                      <SelectItem value="office">Office</SelectItem>
                      <SelectItem value="call_center">Call center</SelectItem>
                      <SelectItem value="cafe">Café</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Goodbye message</FieldLabel>
                  <Input
                    value={goodbye}
                    onChange={(e) => { setGoodbye(e.target.value); markDirty(); }}
                    className="h-11 rounded-xl border-[1.5px] border-input"
                  />
                </div>
              </div>
            </Panel>

            <Panel title="Telephony behavior">
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-cream/70 px-4 py-3">
                  <div>
                    <div className="text-[13px] font-semibold text-ink">Voicemail detection</div>
                    <div className="text-[11px] text-muted-foreground">Leave message after 2.0s delay</div>
                  </div>
                  <Switch checked={voicemailOn} onCheckedChange={(v) => { setVoicemailOn(v); markDirty(); }} />
                </div>
                <div className="flex items-center justify-between rounded-xl bg-cream/70 px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                      <PhoneOutgoing className="size-3.5" /> IVR navigation
                    </div>
                    <div className="text-[11px] text-muted-foreground">Press keys through phone menus toward a goal (outbound)</div>
                  </div>
                  <Switch checked={ivrOn} onCheckedChange={(v) => { setIvrOn(v); markDirty(); }} />
                </div>
              </div>
            </Panel>
          </div>
        </TabsContent>

        {/* ── GROUNDING ── */}
        <TabsContent value="grounding" className="grid gap-6 lg:grid-cols-2">
          <Panel title="Attached tools">
            <div className="space-y-2.5">
              {attachableTools.map((t) => (
                <label
                  key={t.id}
                  className="flex cursor-pointer items-center gap-3.5 rounded-xl border-[1.5px] border-border bg-paper p-3.5 transition-colors hover:border-ink has-[[data-state=checked]]:border-ink has-[[data-state=checked]]:bg-lime/15"
                >
                  <Checkbox
                    checked={selectedToolIds.includes(t.id)}
                    onCheckedChange={() => toggle(setSelectedToolIds, t.id)}
                  />
                  <span className="flex size-8 items-center justify-center rounded-lg bg-sand">
                    <Wrench className="size-3.5 text-ink" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[13px] font-semibold text-ink">{t.name}</span>
                    <span className="block truncate text-[11.5px] text-muted-foreground">{t.description}</span>
                  </span>
                  <span className="eyebrow text-[9px] text-muted-foreground">{t.method}</span>
                </label>
              ))}
            </div>
            <Link href="/tools" className="mt-4 inline-block text-[12.5px] font-semibold text-forest underline-offset-4 hover:underline">
              Manage tool library →
            </Link>
          </Panel>

          <Panel title="Knowledge bases">
            <div className="space-y-2.5">
              {kbs.map((kb) => (
                <label
                  key={kb.id}
                  className="flex cursor-pointer items-center gap-3.5 rounded-xl border-[1.5px] border-border bg-paper p-3.5 transition-colors hover:border-ink has-[[data-state=checked]]:border-ink has-[[data-state=checked]]:bg-lime/15"
                >
                  <Checkbox
                    checked={selectedKbIds.includes(kb.id)}
                    onCheckedChange={() => toggle(setSelectedKbIds, kb.id)}
                  />
                  <span className="flex size-8 items-center justify-center rounded-lg bg-sand">
                    <BookOpen className="size-3.5 text-ink" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-semibold text-ink">{kb.name}</span>
                    <span className="block text-[11.5px] text-muted-foreground">
                      {kb.documents.filter((d) => d.status === "ready").length} docs ready · 3 chunks @ 0.5 threshold
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-4 rounded-xl bg-cream/70 p-3.5 text-[11.5px] leading-relaxed text-muted-foreground">
              Retrieval runs on the two-speed path: semantic cache first (&lt;5 ms), Qdrant on miss —
              the slow-thinker prefetches likely topics ahead of the question.
            </p>
          </Panel>
        </TabsContent>

        {/* ── VERSIONS ── */}
        <TabsContent value="versions">
          <Panel>
            <div className="space-y-0">
              {[
                { v: agent.version, note: "Tightened greeting; added holiday-hours KB", when: agent.updatedAt, active: true },
                { v: agent.version - 1, note: "Raised VAD stop to 0.3s after barge-in reports", when: "2026-07-08T10:00:00Z", active: false },
                { v: agent.version - 2, note: "Swapped TTS voice", when: "2026-06-30T15:20:00Z", active: false },
                { v: agent.version - 3, note: "Initial production publish", when: "2026-06-21T09:00:00Z", active: false },
              ].map((ver, i) => (
                <div key={ver.v} className={`flex items-center gap-4 py-4 ${i > 0 ? "border-t border-border" : ""}`}>
                  <span className={`sticker text-[9px] ${ver.active ? "" : "opacity-60"}`}>v{ver.v}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-medium text-ink">{ver.note}</div>
                    <div className="text-[11.5px] text-muted-foreground">{fmtAgo(ver.when)}</div>
                  </div>
                  {ver.active ? (
                    <span className="eyebrow text-[9.5px] text-forest">● Serving calls</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toast.success(`Restored as v${agent.version + 1} (draft)`)}
                      className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:text-ink"
                    >
                      <History className="size-3.5" /> Restore
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
