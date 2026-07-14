"use client";

import * as React from "react";
import {
  CircleAlert,
  Copy,
  Pause,
  PhoneIncoming,
  PhoneOutgoing,
  Play,
  Wrench,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import type { Call } from "@/types";
import { detailedEvents, detailedTurns } from "@/lib/mock-data";
import { fmtClock, fmtDate, fmtDuration, fmtMoney } from "@/lib/format";
import { StatusChip } from "@/components/shared/status-chip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export function CallDetail({ call }: { call: Call }) {
  const [playing, setPlaying] = React.useState(false);
  const [playhead, setPlayhead] = React.useState(0);
  const total = call.durationSecs > 0 ? call.durationSecs : 61;

  React.useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setPlayhead((p) => {
        if (p >= total) {
          setPlaying(false);
          return 0;
        }
        return p + 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [playing, total]);

  const turns = detailedTurns;
  const events = detailedEvents;

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className="border-b-[1.5px] border-border bg-paper px-7 pt-7 pb-5">
        <div className="flex items-center gap-2.5">
          {call.direction === "inbound" ? (
            <PhoneIncoming className="size-4 text-forest" />
          ) : (
            <PhoneOutgoing className="size-4 text-forest" />
          )}
          <span className="eyebrow text-[10px] text-muted-foreground">
            {call.direction} · {call.mode.replace("_", " ")} · {fmtDate(call.startedAt)}
          </span>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-3">
          <h2 className="display text-[22px] text-ink">{call.agentName}</h2>
          <StatusChip status={call.status} />
          {call.qaScore !== null && <span className="sticker text-[9px]">QA {call.qaScore}</span>}
        </div>
        <div className="mt-1.5 flex items-center gap-2 font-mono text-[12px] text-muted-foreground">
          {call.from} → {call.to}
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(call.id);
              toast("Call ID copied");
            }}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-sand"
          >
            <Copy className="size-3" />
            {call.id}
          </button>
        </div>

        {/* player */}
        <div className="mt-5 flex items-center gap-4 rounded-2xl border-[1.5px] border-ink bg-forest px-4 py-3 text-paper">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-lime text-forest transition-transform hover:scale-105"
            aria-label={playing ? "Pause recording" : "Play recording"}
          >
            {playing ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
          </button>
          <div className="flex h-8 flex-1 items-end gap-[3px]" aria-hidden>
            {Array.from({ length: 48 }, (_, i) => {
              const h = 20 + Math.abs(Math.sin(i * 1.7)) * 80;
              const past = (i / 48) * total <= playhead;
              return (
                <span
                  key={i}
                  className={cn("w-full rounded-full transition-colors", past ? "bg-lime" : "bg-paper/25")}
                  style={{ height: `${h}%` }}
                />
              );
            })}
          </div>
          <span className="figure shrink-0 text-[13px] text-lime">
            {fmtClock(playhead)} / {fmtClock(total)}
          </span>
        </div>
      </div>

      {/* body */}
      <Tabs defaultValue="transcript" className="flex-1 px-7 py-5">
        <TabsList className="mb-5 h-auto gap-1 rounded-full border-[1.5px] border-border bg-paper p-1">
          {[
            ["transcript", "Transcript"],
            ["timeline", "Timeline"],
            ["intelligence", "Intelligence"],
            ["cost", "Cost"],
          ].map(([v, label]) => (
            <TabsTrigger
              key={v}
              value={v}
              className="rounded-full px-4 py-1.5 font-display text-[10px] font-extrabold tracking-[0.1em] uppercase data-[state=active]:bg-ink data-[state=active]:text-paper"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="transcript" className="space-y-3">
          {turns.map((t, i) => {
            const active = playhead > 0 && playhead >= t.atSec && (i === turns.length - 1 || playhead < turns[i + 1].atSec);
            return (
              <div key={i} className={cn("flex", t.role === "agent" ? "justify-start" : "justify-end")}>
                <div
                  className={cn(
                    "max-w-[82%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed transition-all",
                    t.role === "agent" ? "rounded-tl-md bg-paper text-ink" : "rounded-tr-md bg-forest text-paper",
                    active && "ring-2 ring-lime ring-offset-2 ring-offset-cream",
                  )}
                >
                  <span className="mb-0.5 block font-mono text-[9.5px] opacity-45">
                    {fmtClock(t.atSec)} · {t.role}
                    {t.latencyMs ? ` · ${t.latencyMs} ms` : ""}
                  </span>
                  {t.text}
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="timeline">
          <ol className="relative space-y-0 border-l-[1.5px] border-border pl-6">
            {events.map((e) => (
              <li key={e.id} className="relative pb-5">
                <span
                  className={cn(
                    "absolute top-1 -left-[31px] flex size-4 items-center justify-center rounded-full border-[1.5px] border-ink",
                    e.type === "tool_call" ? "bg-lime" : e.type === "interruption" ? "bg-brand-orange" : "bg-paper",
                  )}
                />
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[11px] text-muted-foreground">{fmtClock(e.atSec)}</span>
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                    {e.type === "tool_call" && <Wrench className="size-3 text-forest" />}
                    {e.type === "interruption" && <Zap className="size-3 text-brand-orange" />}
                    {e.label}
                  </span>
                  {e.latencyMs && <span className="font-mono text-[10.5px] text-muted-foreground">{e.latencyMs} ms</span>}
                </div>
                {e.detail && <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{e.detail}</div>}
              </li>
            ))}
          </ol>
        </TabsContent>

        <TabsContent value="intelligence" className="space-y-5">
          <div className="rounded-2xl bg-paper p-5">
            <div className="eyebrow mb-2 text-[9.5px] text-muted-foreground">Summary</div>
            <p className="text-[13.5px] leading-relaxed text-ink">{call.summary}</p>
            <div className="mt-3 flex items-center gap-2">
              <StatusChip status={call.sentiment} />
            </div>
          </div>

          {Object.keys(call.structuredData).length > 0 && (
            <div className="rounded-2xl bg-paper p-5">
              <div className="eyebrow mb-3 text-[9.5px] text-muted-foreground">Structured extraction</div>
              <div className="space-y-2">
                {Object.entries(call.structuredData).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0 last:pb-0">
                    <span className="font-mono text-[12px] text-muted-foreground">{k}</span>
                    <span className="text-[13px] font-semibold text-ink">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-paper p-5">
            <div className="eyebrow mb-3 text-[9.5px] text-muted-foreground">QA tags</div>
            {call.qaTags.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No failure modes detected. Clean call.</p>
            ) : (
              <ul className="space-y-3">
                {call.qaTags.map((t, i) => (
                  <li key={i} className="flex gap-3">
                    <CircleAlert className="mt-0.5 size-4 shrink-0 text-brand-orange" />
                    <div>
                      <div className="font-mono text-[12.5px] font-semibold text-ink">{t.tag}</div>
                      <div className="mt-0.5 text-[12px] text-muted-foreground italic">{t.evidence}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="cost">
          <div className="rounded-2xl bg-paper p-5">
            <div className="flex items-baseline justify-between">
              <span className="eyebrow text-[9.5px] text-muted-foreground">Total</span>
              <span className="figure text-[26px] text-ink">{fmtMoney(call.cost, 3)}</span>
            </div>
            <div className="mt-4 space-y-3">
              {(
                [
                  ["STT", call.costBreakdown.stt, "deepgram/nova-3"],
                  ["LLM", call.costBreakdown.llm, "openai/gpt-4.1-mini"],
                  ["TTS", call.costBreakdown.tts, "cartesia/sonic-2"],
                  ["Platform fee", call.costBreakdown.platform, "$0.02 / min"],
                ] as const
              ).map(([label, value, meta]) => {
                const pct = call.cost > 0 ? (value / call.cost) * 100 : 0;
                return (
                  <div key={label}>
                    <div className="flex items-baseline justify-between text-[12.5px]">
                      <span className="font-semibold text-ink">{label}</span>
                      <span className="font-mono text-muted-foreground">
                        {meta} · {fmtMoney(value, 4)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sand">
                      <div className="h-full rounded-full bg-forest" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 border-t border-border pt-4 text-[12px] text-muted-foreground">
              Duration {fmtDuration(call.durationSecs)} · voice-to-voice p50 {call.latencyP50Ms} ms ·{" "}
              {call.interruptions} interruptions
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
