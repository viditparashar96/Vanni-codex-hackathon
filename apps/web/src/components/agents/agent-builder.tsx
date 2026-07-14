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
  Mic,
  PhoneOutgoing,
  Play,
  Waypoints,
  Wrench,
} from "lucide-react";
import type { Agent, KnowledgeBase, ToolDef } from "@/types";
import { fmtAgo } from "@/lib/format";
import { StatusChip } from "@/components/shared/status-chip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LLMS = ["openai/gpt-4.1-mini", "openai/gpt-4.1", "anthropic/claude-haiku-4-5", "anthropic/claude-sonnet-5", "google/gemini-2.5-flash", "groq/llama-4-70b"];
const STTS = ["deepgram/nova-3", "assemblyai/universal", "azure/fast-v2", "openai/whisper-large-v3", "speechmatics/enhanced"];
const TTSS = ["cartesia/sonic-2", "elevenlabs/turbo-v2", "deepgram/aura-2", "openai/tts-1-hd"];
const VOICES = [
  { name: "Meera", vibe: "Warm · considered", provider: "Cartesia" },
  { name: "Arjun", vibe: "Bright · upbeat", provider: "Cartesia" },
  { name: "Devi", vibe: "Calm · clinical", provider: "ElevenLabs" },
  { name: "Kabir", vibe: "Deep · assured", provider: "ElevenLabs" },
];
const TRAITS = ["Warm", "Patient", "Direct", "Playful", "Formal", "Reassuring"];

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
  const [traits, setTraits] = React.useState<string[]>(["Warm", "Patient"]);
  const [speaksFirst, setSpeaksFirst] = React.useState(agent.agentSpeaksFirst ?? true);
  const [vad, setVad] = React.useState([0.3]);
  const [speed, setSpeed] = React.useState([1.0]);
  const [dirty, setDirty] = React.useState(false);

  const markDirty = () => setDirty(true);

  const publish = () => {
    setDirty(false);
    toast.success(`Published v${agent.version + 1}`, {
      description: "Now serving calls on all assigned numbers.",
    });
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
            className="group flex h-11 items-center gap-2.5 rounded-full bg-ink px-6 font-display text-[11.5px] font-extrabold tracking-[0.1em] text-paper uppercase transition-transform hover:-translate-y-0.5"
          >
            {dirty ? "Publish changes" : "Published"}
            <span className="flex size-5.5 items-center justify-center rounded-full bg-lime text-forest">
              {dirty ? <ArrowRight className="size-3 stroke-[3]" /> : <CircleCheck className="size-3.5" />}
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
                defaultValue={agent.systemPrompt ?? "You are a helpful voice agent for Cedarline Health…"}
                onChange={markDirty}
                className="min-h-[220px] rounded-xl border-[1.5px] border-input bg-cream/50 text-[14px] leading-relaxed focus-visible:border-ink focus-visible:ring-ink/10"
              />
              <div className="mt-3 flex items-center gap-2 text-[11.5px] text-muted-foreground">
                <Braces className="size-3.5" />
                Variables available: {"{{patient_name}}"} · {"{{clinic}}"} · {"{{date}}"} · {"{{time}}"}
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
                    defaultValue={agent.greetingMessage ?? "Hello! How can I help you today?"}
                    onChange={markDirty}
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
                <Select defaultValue="concise" onValueChange={markDirty}>
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
                {["patient_name", "clinic", "provider"].map((v) => (
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
                {[
                  ["LLM", LLMS, agent.voice.llm],
                  ["STT", STTS, agent.voice.stt],
                  ["TTS", TTSS, agent.voice.tts],
                ].map(([label, options, value]) => (
                  <div key={label as string}>
                    <FieldLabel>{label}</FieldLabel>
                    <Select defaultValue={value as string} onValueChange={markDirty}>
                      <SelectTrigger className="h-11 w-full rounded-xl border-[1.5px] border-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(options as string[]).map((o) => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between rounded-xl border-[1.5px] border-dashed border-ink/30 bg-cream/50 px-4 py-3.5">
                <div>
                  <div className="text-[13.5px] font-semibold text-ink">Realtime speech-to-speech</div>
                  <div className="text-[11.5px] text-muted-foreground">
                    Replace STT + LLM + TTS with one realtime model (OpenAI Realtime / Gemini Live)
                  </div>
                </div>
                <Switch onCheckedChange={markDirty} />
              </div>
            </Panel>

            <Panel title="Voice">
              <div className="grid gap-3 sm:grid-cols-2">
                {VOICES.map((v) => {
                  const selected = v.name === agent.voice.voice;
                  return (
                    <button
                      key={v.name}
                      type="button"
                      onClick={markDirty}
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
                        <span className="block text-[11.5px] text-muted-foreground">{v.vibe} · {v.provider}</span>
                      </span>
                      <Play className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
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
                <Input type="number" defaultValue={240} onChange={markDirty} className="h-11 rounded-xl border-[1.5px] border-input" />
              </div>
              <div>
                <FieldLabel hint="5–300">Inactivity timeout (s)</FieldLabel>
                <Input type="number" defaultValue={30} onChange={markDirty} className="h-11 rounded-xl border-[1.5px] border-input" />
              </div>
            </div>
            <div className="mt-6">
              <FieldLabel hint={`${vad[0].toFixed(2)}s`}>VAD stop — how long a pause ends the caller&apos;s turn</FieldLabel>
              <Slider value={vad} onValueChange={(v) => { setVad(v); markDirty(); }} min={0} max={1} step={0.05} />
            </div>
            <div className="mt-6 space-y-3">
              {[
                ["Stay silent during intro", true],
                ["Disable barge-in while agent speaks", false],
              ].map(([label, def]) => (
                <div key={label as string} className="flex items-center justify-between rounded-xl bg-cream/70 px-4 py-3">
                  <span className="text-[13px] font-medium text-ink">{label}</span>
                  <Switch defaultChecked={def as boolean} onCheckedChange={markDirty} />
                </div>
              ))}
            </div>
          </Panel>

          <div className="space-y-6">
            <Panel title="Ambience & exit">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <FieldLabel>Background noise</FieldLabel>
                  <Select defaultValue="off" onValueChange={markDirty}>
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
                  <Input defaultValue="Thank you for your time. Goodbye!" onChange={markDirty} className="h-11 rounded-xl border-[1.5px] border-input" />
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
                  <Switch defaultChecked onCheckedChange={markDirty} />
                </div>
                <div className="flex items-center justify-between rounded-xl bg-cream/70 px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                      <PhoneOutgoing className="size-3.5" /> IVR navigation
                    </div>
                    <div className="text-[11px] text-muted-foreground">Press keys through phone menus toward a goal (outbound)</div>
                  </div>
                  <Switch onCheckedChange={markDirty} />
                </div>
              </div>
            </Panel>
          </div>
        </TabsContent>

        {/* ── GROUNDING ── */}
        <TabsContent value="grounding" className="grid gap-6 lg:grid-cols-2">
          <Panel title="Attached tools">
            <div className="space-y-2.5">
              {tools.slice(0, 4).map((t, i) => (
                <label
                  key={t.id}
                  className="flex cursor-pointer items-center gap-3.5 rounded-xl border-[1.5px] border-border bg-paper p-3.5 transition-colors hover:border-ink has-[[data-state=checked]]:border-ink has-[[data-state=checked]]:bg-lime/15"
                >
                  <Checkbox defaultChecked={i < 3} onCheckedChange={markDirty} />
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
              {kbs.map((kb, i) => (
                <label
                  key={kb.id}
                  className="flex cursor-pointer items-center gap-3.5 rounded-xl border-[1.5px] border-border bg-paper p-3.5 transition-colors hover:border-ink has-[[data-state=checked]]:border-ink has-[[data-state=checked]]:bg-lime/15"
                >
                  <Checkbox defaultChecked={i === 0} onCheckedChange={markDirty} />
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
                { v: agent.version - 2, note: "Swapped TTS voice to Meera", when: "2026-06-30T15:20:00Z", active: false },
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
