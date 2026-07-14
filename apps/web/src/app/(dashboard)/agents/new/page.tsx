"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Loader2, Sparkles, Waypoints, Zap } from "lucide-react";
import { api } from "@/lib/api-client";
import { PageHeader } from "@/components/shell/page-header";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { instantiateTemplate } from "@/lib/flow-templates";
import { LLM_PROVIDER_GROUPS, DEFAULT_LLM_MODEL } from "@/lib/llm-catalog";
import { STT_PROVIDER_GROUPS, DEFAULT_STT_MODEL } from "@/lib/stt-catalog";
import { TTS_PROVIDER_GROUPS, DEFAULT_TTS_PROVIDER } from "@/lib/tts-catalog";
import {
  VOICE_CATALOG,
  LANGUAGE_CATALOG,
  DEFAULT_VOICE_ID,
  DEFAULT_LANGUAGE,
} from "@/lib/voice-catalog";

type Template = {
  name: string;
  desc: string;
  type: "flow" | "simple";
  flowTemplateId?: string; // flow: which graph from flow-templates
  systemPrompt?: string; // simple: starter prompt
  greetingMessage?: string;
};

const TEMPLATES: Template[] = [
  {
    name: "Appointment booking",
    desc: "Collect details, check a time, confirm the booking.",
    type: "flow",
    flowTemplateId: "appointment-booking",
  },
  {
    name: "Reception / front desk",
    desc: "Answer the main line, take a message, route the caller.",
    type: "simple",
    systemPrompt:
      "You are the front-desk receptionist for {{businessName}}. Greet callers warmly, find out how you can help, answer common questions, and take a clear message or route them to the right person. Keep replies to one or two short sentences.",
    greetingMessage: "Thanks for calling — how can I help you today?",
  },
  {
    name: "Lead qualifier",
    desc: "Qualify inbound leads and book a follow-up.",
    type: "flow",
    flowTemplateId: "lead-qualification",
  },
  {
    name: "Survey",
    desc: "Short satisfaction survey with a wrap-up.",
    type: "simple",
    systemPrompt:
      "You are a friendly survey agent. Ask the caller to rate their recent experience from 1 to 10, then ask one short follow-up about why. Acknowledge their answers, keep it brief, and thank them at the end.",
    greetingMessage: "Hi! Do you have a moment for a quick two-question survey?",
  },
];

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between">
      <span className="eyebrow text-[10px] text-ink">{children}</span>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

/** Shared trigger styling so every voice-stack select matches the page design. */
const stackTriggerClass = "h-11 w-full rounded-xl border-[1.5px] border-input";

/**
 * A model picker grouped by provider, with the ProviderIcon shown next to each
 * provider group. The submitted value is the model id.
 */
function GroupedModelSelect({
  label,
  value,
  onChange,
  groups,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  groups: {
    provider: string;
    label: string;
    models: { value: string; label: string; description?: string }[];
  }[];
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={stackTriggerClass}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {groups.map((g) => (
            <SelectGroup key={g.provider}>
              <SelectLabel className="flex items-center gap-2">
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
  );
}

/**
 * A simple picker where each option carries its own ProviderIcon. The submitted
 * value is the option value.
 */
function IconOptionSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; provider?: string }[];
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={stackTriggerClass}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.provider ? <ProviderIcon provider={o.provider} className="size-4" /> : null}
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ── Catalog-derived option lists ──────────────────────────────────────────────

const LLM_GROUPS = LLM_PROVIDER_GROUPS.map((g) => ({
  provider: g.provider,
  label: g.label,
  models: g.models,
}));

const STT_GROUPS = STT_PROVIDER_GROUPS.map((g) => ({
  provider: g.provider,
  label: g.label,
  models: g.models,
}));

// TTS submits the provider id (cartesia / elevenlabs / openai).
const TTS_OPTIONS = TTS_PROVIDER_GROUPS.map((g) => ({
  value: g.provider,
  label: g.label,
  provider: g.provider,
}));

// Voice submits the real voice id (Cartesia UUID); label stays human-readable.
const VOICE_OPTIONS = VOICE_CATALOG.map((v) => ({
  value: v.id,
  label: `${v.name} · ${v.accent} ${v.gender}`,
}));

const LANGUAGE_OPTIONS = LANGUAGE_CATALOG.map((l) => ({ value: l.code, label: l.label }));

export default function NewAgentPage() {
  const router = useRouter();

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [systemPrompt, setSystemPrompt] = React.useState(
    "You are a helpful voice agent. Keep replies short and conversational — one idea per turn, no markdown.",
  );
  const [greetingMessage, setGreetingMessage] = React.useState("Hello! How can I help you today?");
  const [agentSpeaksFirst, setAgentSpeaksFirst] = React.useState(true);

  const [llm, setLlm] = React.useState(DEFAULT_LLM_MODEL);
  const [stt, setStt] = React.useState(DEFAULT_STT_MODEL);
  const [tts, setTts] = React.useState<string>(DEFAULT_TTS_PROVIDER);
  const [voice, setVoice] = React.useState(DEFAULT_VOICE_ID);
  const [language, setLanguage] = React.useState(DEFAULT_LANGUAGE);

  const [creating, setCreating] = React.useState(false);
  const [creatingFlow, setCreatingFlow] = React.useState(false);
  const [templateBusy, setTemplateBusy] = React.useState<string | null>(null);

  // Create a real agent from a starter template and open the right editor:
  // flow templates carry a validated graph → open the canvas; simple templates
  // carry a starter prompt → open the builder.
  const createFromTemplate = async (t: Template) => {
    if (templateBusy) return;
    setTemplateBusy(t.name);
    try {
      if (t.type === "flow") {
        const flowConfig = t.flowTemplateId ? instantiateTemplate(t.flowTemplateId) : undefined;
        const created = await api.createAgent({
          name: t.name,
          description: t.desc,
          type: "flow",
          flowConfig: flowConfig as unknown as Record<string, unknown> | undefined,
        });
        router.push(`/agents/${created.id}/flow`);
      } else {
        const created = await api.createAgent({
          name: t.name,
          description: t.desc,
          type: "simple",
          systemPrompt: t.systemPrompt,
          greetingMessage: t.greetingMessage,
          agentSpeaksFirst: true,
          voice: {
            llm: DEFAULT_LLM_MODEL,
            stt: DEFAULT_STT_MODEL,
            tts: DEFAULT_TTS_PROVIDER,
            voice: DEFAULT_VOICE_ID,
            language: DEFAULT_LANGUAGE,
          },
        });
        router.push(`/agents/${created.id}`);
      }
    } catch (err) {
      toast.error(`Couldn’t create “${t.name}”`, {
        description: err instanceof Error ? err.message : "Please try again.",
      });
      setTemplateBusy(null);
    }
  };

  // Create a flow agent and open the visual designer. The designer seeds a
  // starter graph when the new agent has no flowConfig yet; the user edits it
  // on the canvas and hits Save Flow to persist a version.
  const createFlow = async (agentName: string) => {
    setCreatingFlow(true);
    try {
      const created = await api.createAgent({
        name: agentName,
        type: "flow",
      });
      router.push(`/agents/${created.id}/flow`);
    } catch (err) {
      toast.error("Couldn’t create the flow agent", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
      setCreatingFlow(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Give your agent a name to continue.");
      return;
    }
    setCreating(true);
    try {
      const created = await api.createAgent({
        name: trimmed,
        description: description.trim() || undefined,
        type: "simple",
        systemPrompt: systemPrompt.trim() || undefined,
        greetingMessage: agentSpeaksFirst ? greetingMessage.trim() || undefined : undefined,
        agentSpeaksFirst,
        voice: { llm, stt, tts, voice, language },
      });
      toast.success(`Created ${created.name}`, { description: "Opening the builder…" });
      router.push(`/agents/${created.id}`);
    } catch (err) {
      toast.error("Couldn’t create the agent", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1000px]">
      <PageHeader
        eyebrow="New agent"
        title="What are we building?"
        description="Spin up a simple prompt-driven agent below, or reach for a flow when the conversation needs branching."
      />

      {/* simple agent — real create form */}
      <form
        onSubmit={onSubmit}
        className="rise-in rise-in-1 relative overflow-hidden rounded-3xl border-[1.5px] border-ink bg-paper shadow-[5px_5px_0_var(--ink)]"
      >
        <div className="flex items-center gap-4 border-b-[1.5px] border-ink bg-lime px-7 py-6">
          <div className="flex size-12 items-center justify-center rounded-2xl border-[1.5px] border-ink bg-paper">
            <Zap className="size-6 text-ink" />
          </div>
          <div>
            <h2 className="display text-[24px] text-forest">Simple agent</h2>
            <p className="mt-0.5 max-w-[52ch] text-[13px] leading-relaxed text-forest/80">
              One system prompt, one goal. Perfect for reception, FAQ, intake, reminders and tier-1 support.
            </p>
          </div>
        </div>

        <div className="grid gap-6 p-7 lg:grid-cols-[1fr_320px]">
          {/* left: identity + prompt */}
          <div className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <FieldLabel hint="Required">Name</FieldLabel>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Riya — Front Desk"
                  autoFocus
                  className="h-11 rounded-xl border-[1.5px] border-input focus-visible:border-ink focus-visible:ring-ink/10"
                />
              </div>
              <div>
                <FieldLabel hint="Optional">Description</FieldLabel>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Answers the main line and books visits"
                  className="h-11 rounded-xl border-[1.5px] border-input focus-visible:border-ink focus-visible:ring-ink/10"
                />
              </div>
            </div>

            <div>
              <FieldLabel hint="Written for speech — short sentences, no markdown">System prompt</FieldLabel>
              <Textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="min-h-[180px] rounded-xl border-[1.5px] border-input bg-cream/50 text-[14px] leading-relaxed focus-visible:border-ink focus-visible:ring-ink/10"
              />
            </div>

            <div className="rounded-2xl border-[1.5px] border-border bg-cream/40 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13.5px] font-semibold text-ink">Agent speaks first</div>
                  <div className="text-[11.5px] text-muted-foreground">Required for outbound calls</div>
                </div>
                <Switch checked={agentSpeaksFirst} onCheckedChange={setAgentSpeaksFirst} />
              </div>
              {agentSpeaksFirst && (
                <div className="mt-4">
                  <FieldLabel hint="Spoken exactly — bypasses the LLM">Greeting message</FieldLabel>
                  <Textarea
                    value={greetingMessage}
                    onChange={(e) => setGreetingMessage(e.target.value)}
                    className="min-h-[60px] rounded-xl border-[1.5px] border-input text-[14px] focus-visible:border-ink focus-visible:ring-ink/10"
                  />
                </div>
              )}
            </div>
          </div>

          {/* right: voice stack */}
          <div className="space-y-4 rounded-2xl border-[1.5px] border-border bg-cream/30 p-5">
            <h3 className="eyebrow text-[10px] text-ink">Voice stack</h3>
            <GroupedModelSelect label="LLM" value={llm} onChange={setLlm} groups={LLM_GROUPS} />
            <GroupedModelSelect label="STT" value={stt} onChange={setStt} groups={STT_GROUPS} />
            <IconOptionSelect label="TTS" value={tts} onChange={setTts} options={TTS_OPTIONS} />
            <IconOptionSelect label="Voice" value={voice} onChange={setVoice} options={VOICE_OPTIONS} />
            <IconOptionSelect label="Language" value={language} onChange={setLanguage} options={LANGUAGE_OPTIONS} />
            <p className="text-[11.5px] leading-relaxed text-muted-foreground">
              Sensible defaults to start — tune the full pipeline in the builder after you create.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t-[1.5px] border-border px-7 py-5">
          <span className="text-[12px] text-muted-foreground">You can switch a simple agent to a flow later.</span>
          <button
            type="submit"
            disabled={creating}
            className="group flex h-11 items-center gap-2.5 rounded-full bg-ink px-6 font-display text-[11.5px] font-extrabold tracking-[0.1em] text-paper uppercase transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? "Creating" : "Create agent"}
            <span className="flex size-5.5 items-center justify-center rounded-full bg-lime text-forest">
              {creating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <ArrowRight className="size-3 stroke-[3] transition-transform group-hover:translate-x-0.5" />
              )}
            </span>
          </button>
        </div>
      </form>

      {/* flow — creates a flow agent then opens the canvas */}
      <button
        type="button"
        onClick={() => createFlow(name.trim() || "Untitled Flow")}
        disabled={creatingFlow}
        className="group rise-in rise-in-2 relative mt-5 flex w-full items-center gap-5 overflow-hidden rounded-3xl border-[1.5px] border-ink bg-forest p-7 text-left text-paper shadow-[5px_5px_0_var(--ink)] transition-transform hover:-translate-y-1 disabled:opacity-60"
      >
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border-[1.5px] border-lime/50 bg-forest-soft">
          {creatingFlow ? <Loader2 className="size-6 animate-spin text-lime" /> : <Waypoints className="size-6 text-lime" />}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="display text-[22px] text-paper">Flow agent</h2>
          <p className="mt-1 max-w-[52ch] text-[13px] leading-relaxed text-paper/70">
            A directed graph of stages — verify, branch, transfer, SMS — each with its own objective and tools.
          </p>
        </div>
        <div className="flex items-center gap-2 font-display text-[11.5px] font-extrabold tracking-[0.12em] text-lime uppercase">
          {creatingFlow ? "Creating…" : "Open the canvas"}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </div>
      </button>

      {/* composer plug */}
      <Link
        href="/composer"
        className="rise-in rise-in-3 mt-5 flex items-center gap-4 rounded-2xl border-[1.5px] border-dashed border-ink/40 bg-paper/60 p-5 transition-colors hover:border-ink hover:bg-paper"
      >
        <Sparkles className="size-5 shrink-0 text-forest" />
        <div className="flex-1">
          <div className="font-display text-[14.5px] font-bold text-ink">Or let the Composer draft it</div>
          <div className="text-[12.5px] text-muted-foreground">
            Describe the agent in plain language — Vaani proposes the full config, you approve every write.
          </div>
        </div>
        <ArrowRight className="size-4 text-muted-foreground" />
      </Link>

      {/* templates */}
      <section className="rise-in rise-in-4 mt-12">
        <h2 className="eyebrow mb-4 text-ink">Start from a template</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.name}
              type="button"
              onClick={() => createFromTemplate(t)}
              disabled={templateBusy !== null}
              className="group flex items-center gap-4 rounded-2xl border-[1.5px] border-border bg-paper p-4.5 text-left transition-all hover:-translate-y-0.5 hover:border-ink disabled:opacity-60"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display text-[14px] font-bold text-ink">{t.name}</span>
                  <span className="eyebrow text-[9px] text-muted-foreground">{t.type}</span>
                </div>
                <div className="mt-0.5 truncate text-[12px] text-muted-foreground">{t.desc}</div>
              </div>
              {templateBusy === t.name ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
              ) : (
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              )}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
