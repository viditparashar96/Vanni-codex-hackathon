"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Link2,
  Mic,
  MicOff,
  MessageSquare,
  Phone,
  PhoneOff,
  Radio,
  Wrench,
  Zap,
} from "lucide-react";
import type { Agent } from "@/types";
import { detailedEvents, detailedTurns } from "@/lib/mock-data";
import { fmtClock } from "@/lib/format";
import { cn } from "@/lib/utils";

type CallState = "idle" | "connecting" | "live" | "ended";

export function TestConsole({ agent }: { agent: Agent }) {
  const [state, setState] = React.useState<CallState>("idle");
  const [elapsed, setElapsed] = React.useState(0);
  const [muted, setMuted] = React.useState(false);
  const [mode, setMode] = React.useState<"voice" | "chat">("voice");
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const feedRef = React.useRef<HTMLDivElement>(null);

  const visibleTurns = detailedTurns.filter((t) => state === "live" && t.atSec <= elapsed);
  const visibleEvents = detailedEvents.filter(
    (e) => state === "live" && e.atSec <= elapsed && e.type !== "call_ended",
  );
  const agentSpeaking =
    state === "live" &&
    visibleTurns.length > 0 &&
    visibleTurns[visibleTurns.length - 1].role === "agent" &&
    elapsed - visibleTurns[visibleTurns.length - 1].atSec < 5;

  const start = () => {
    setState("connecting");
    setElapsed(0);
    setTimeout(() => {
      setState("live");
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    }, 1400);
  };

  const end = React.useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setState("ended");
    toast.success("Test call ended", {
      description: "End-of-call report is ready below — transcript, metrics and QA.",
    });
  }, []);

  React.useEffect(() => {
    if (state === "live" && elapsed >= 61) end();
  }, [elapsed, state, end]);

  React.useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [visibleTurns.length]);

  React.useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return (
    <div className="mx-auto max-w-[1200px]">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-6 pb-8">
        <div className="flex items-center gap-4">
          <Link
            href={`/agents/${agent.id}`}
            className="flex size-9 items-center justify-center rounded-full border-[1.5px] border-ink bg-paper shadow-[2px_2px_0_var(--ink)] transition-transform hover:-translate-x-0.5"
            aria-label="Back to agent"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <div className="eyebrow text-[9.5px] text-muted-foreground">Test console · v{agent.version} draft</div>
            <h1 className="display text-[22px] text-ink">{agent.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex rounded-full border-[1.5px] border-border bg-paper p-1">
            {(["voice", "chat"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-1.5 font-display text-[10.5px] font-extrabold tracking-[0.1em] uppercase transition-colors",
                  mode === m ? "bg-ink text-paper" : "text-muted-foreground hover:text-ink",
                )}
              >
                {m === "voice" ? <Phone className="size-3" /> : <MessageSquare className="size-3" />}
                {m}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => toast.success("Share link copied", { description: "Anyone with the link can test-call this agent for 72 hours." })}
            className="flex h-10 items-center gap-2 rounded-full border-[1.5px] border-ink bg-paper px-4 font-display text-[10.5px] font-extrabold tracking-[0.1em] text-ink uppercase shadow-[2px_2px_0_var(--ink)] transition-transform hover:-translate-y-0.5"
          >
            <Link2 className="size-3.5" />
            Share link
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[440px_1fr]">
        {/* call stage */}
        <div className="rise-in flex min-h-[520px] flex-col items-center justify-between overflow-hidden rounded-3xl border-[1.5px] border-ink bg-forest p-8 text-paper shadow-[6px_6px_0_var(--ink)]">
          <div className="flex w-full items-center justify-between">
            <span className="eyebrow flex items-center gap-2 text-[9.5px] text-paper/60">
              {state === "live" ? (
                <>
                  <span className="pulse-dot pulse-dot-live" /> Live · WebRTC
                </>
              ) : state === "connecting" ? (
                "Dispatching pipeline…"
              ) : state === "ended" ? (
                "Call ended"
              ) : (
                "Ready · browser call"
              )}
            </span>
            <span className="figure text-[20px] text-lime">{fmtClock(elapsed)}</span>
          </div>

          {/* voice orb */}
          <div className="relative flex items-center justify-center py-10">
            <div
              className={cn(
                "absolute size-44 rounded-full border border-lime/25 transition-transform duration-700",
                agentSpeaking && "scale-125 animate-pulse",
              )}
            />
            <div
              className={cn(
                "absolute size-56 rounded-full border border-lime/15 transition-transform duration-1000",
                agentSpeaking && "scale-110",
              )}
            />
            <div
              className={cn(
                "relative flex size-32 items-center justify-center rounded-full bg-lime text-forest transition-transform duration-500",
                agentSpeaking ? "scale-110" : "scale-100",
                state === "connecting" && "animate-pulse",
              )}
            >
              {mode === "voice" ? <Radio className="size-10" /> : <MessageSquare className="size-10" />}
            </div>
          </div>

          <div className="w-full text-center">
            <div className="font-display text-[16px] font-bold">
              {state === "idle" && "Start a test call — no phone needed"}
              {state === "connecting" && "Joining LiveKit room…"}
              {state === "live" && (agentSpeaking ? `${agent.voice.voice} is speaking…` : "Listening…")}
              {state === "ended" && "Report delivered ↓"}
            </div>
            <div className="mt-1.5 text-[12px] text-paper/55">
              {agent.voice.llm} · {agent.voice.stt.split("/")[0]} · {agent.voice.tts.split("/")[0]}
            </div>

            <div className="mt-7 flex items-center justify-center gap-3">
              {state === "live" ? (
                <>
                  <button
                    type="button"
                    onClick={() => setMuted((m) => !m)}
                    className={cn(
                      "flex size-12 items-center justify-center rounded-full border-[1.5px] transition-colors",
                      muted ? "border-brand-orange bg-brand-orange/20 text-brand-orange" : "border-paper/30 text-paper hover:border-paper",
                    )}
                    aria-label={muted ? "Unmute" : "Mute"}
                  >
                    {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
                  </button>
                  <button
                    type="button"
                    onClick={end}
                    className="flex h-12 items-center gap-2.5 rounded-full bg-brand-orange px-7 font-display text-[12px] font-extrabold tracking-[0.12em] text-paper uppercase transition-transform hover:-translate-y-0.5"
                  >
                    <PhoneOff className="size-4" />
                    End call
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={start}
                  disabled={state === "connecting"}
                  className="flex h-12 items-center gap-2.5 rounded-full bg-lime px-8 font-display text-[12px] font-extrabold tracking-[0.12em] text-forest uppercase transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                >
                  <Phone className="size-4" />
                  {state === "ended" ? "Call again" : state === "connecting" ? "Connecting…" : "Start test call"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* transcript + events */}
        <div className="rise-in rise-in-1 flex min-h-[520px] flex-col gap-4">
          <div ref={feedRef} className="flex-1 space-y-3 overflow-y-auto rounded-3xl border-[1.5px] border-border bg-paper p-6">
            <div className="eyebrow mb-2 text-[9.5px] text-muted-foreground">Live transcript</div>
            {visibleTurns.length === 0 && (
              <p className="pt-10 text-center text-[13px] text-muted-foreground">
                {state === "live" ? "Waiting for the first turn…" : "The conversation will appear here, turn by turn, with per-turn latency."}
              </p>
            )}
            {visibleTurns.map((t, i) => (
              <div key={i} className={cn("flex", t.role === "agent" ? "justify-start" : "justify-end")}>
                <div
                  className={cn(
                    "max-w-[78%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed",
                    t.role === "agent" ? "rounded-tl-md bg-cream text-ink" : "rounded-tr-md bg-forest text-paper",
                  )}
                >
                  {t.text}
                  {t.latencyMs && (
                    <span className="mt-1 block text-right font-mono text-[9.5px] opacity-50">{t.latencyMs} ms</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="max-h-[180px] overflow-y-auto rounded-3xl border-[1.5px] border-border bg-paper p-5">
            <div className="eyebrow mb-3 text-[9.5px] text-muted-foreground">Event feed</div>
            {visibleEvents.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">Tool calls, latency ticks and node transitions stream here.</p>
            ) : (
              <ul className="space-y-1.5">
                {[...visibleEvents].reverse().map((e) => (
                  <li key={e.id} className="flex items-center gap-2.5 font-mono text-[11.5px] text-ink">
                    <span className="text-muted-foreground">{fmtClock(e.atSec)}</span>
                    {e.type === "tool_call" ? <Wrench className="size-3 text-forest" /> : <Zap className="size-3 text-brand-orange" />}
                    <span className="font-semibold">{e.label}</span>
                    <span className="truncate text-muted-foreground">{e.detail}</span>
                    {e.latencyMs && <span className="ml-auto shrink-0 text-muted-foreground">{e.latencyMs} ms</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* end-of-call report */}
      {state === "ended" && (
        <section className="rise-in mt-8 rounded-3xl border-[1.5px] border-ink bg-paper p-7 shadow-[5px_5px_0_var(--ink)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="display text-[19px] text-ink">End-of-call report</h2>
            <span className="sticker text-[9px]">QA 9.2 / 10</span>
          </div>
          <p className="mt-3 max-w-[70ch] text-[13.5px] leading-relaxed text-muted-foreground">
            Rescheduled annual physical from Jul 16 to Jul 24, 9:00 AM with Dr. Iyer. SMS confirmation sent.
            Caller sentiment positive; no failure tags.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-y-5 border-t border-border pt-5 sm:grid-cols-4">
            {[
              ["0.86s", "voice-to-voice p50"],
              ["1 / 11", "interruptions / turns"],
              ["4", "tool calls · all 2xx"],
              ["$0.041", "call cost"],
            ].map(([v, l]) => (
              <div key={l}>
                <div className="figure text-[22px] text-ink">{v}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{l}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
