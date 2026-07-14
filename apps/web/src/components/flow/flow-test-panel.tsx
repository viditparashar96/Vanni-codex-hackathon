"use client";

import * as React from "react";
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Radio,
  TriangleAlert,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import type { FlowTestEvent, FlowTestStatus } from "@/hooks/use-flow-testing";
import { fmtClock } from "@/lib/format";
import { cn } from "@/lib/utils";

interface FlowTestPanelProps {
  status: FlowTestStatus;
  error: string | null;
  events: FlowTestEvent[];
  elapsedSec: number;
  isMuted: boolean;
  /** Node the engine reports as active — drives the "Active stage" chip. */
  activeNodeId: string | null;
  /** Human label for the active node, resolved by the editor. */
  activeNodeLabel?: string | null;
  onStart: () => void;
  onStop: () => void;
  onToggleMute: () => void;
  onClose: () => void;
}

const STATUS_META: Record<FlowTestStatus, { label: string; chip: string }> = {
  idle: { label: "Ready", chip: "bg-sand text-muted-foreground" },
  connecting: { label: "Connecting", chip: "bg-brand-yellow/25 text-[#8a6d0e]" },
  live: { label: "Live", chip: "bg-lime/35 text-forest" },
  ended: { label: "Ended", chip: "bg-sand text-muted-foreground" },
  error: { label: "Error", chip: "bg-destructive/12 text-destructive" },
};

/**
 * In-editor test surface. Owns none of the WebRTC logic itself — it renders the
 * live state exposed by `useFlowTesting` (a SmallWebRTC call to the voice
 * engine) and surfaces the milestone/signal feed, including the node-transition
 * signals that light up the canvas.
 */
export function FlowTestPanel({
  status,
  error,
  events,
  elapsedSec,
  isMuted,
  activeNodeId,
  activeNodeLabel,
  onStart,
  onStop,
  onToggleMute,
  onClose,
}: FlowTestPanelProps) {
  const feedRef = React.useRef<HTMLDivElement>(null);
  const meta = STATUS_META[status];
  const isLive = status === "live";
  const isConnecting = status === "connecting";
  const canStart = status === "idle" || status === "ended" || status === "error";

  React.useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [events.length]);

  return (
    <div className="flex h-full flex-col bg-paper">
      {/* header */}
      <div className="flex items-center justify-between border-b-[1.5px] border-ink/10 px-5 py-4">
        <span className="eyebrow flex items-center gap-1.5 text-[9.5px] text-muted-foreground">
          <Phone className="size-3" />
          Test call · WebRTC
        </span>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-display text-[9.5px] font-extrabold tracking-[0.1em] uppercase",
              meta.chip,
            )}
          >
            {isLive && <span className="size-1.5 animate-pulse rounded-full bg-forest" />}
            {meta.label}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex size-6 items-center justify-center rounded-full hover:bg-sand"
            aria-label="Close test panel"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {/* stage */}
      <div className="flex flex-col items-center gap-4 border-b-[1.5px] border-ink/10 px-5 py-6">
        <div className="relative flex items-center justify-center">
          <div
            className={cn(
              "absolute size-24 rounded-full border-[1.5px] border-forest/25 transition-transform duration-700",
              isLive && "scale-125 animate-pulse",
            )}
          />
          <div
            className={cn(
              "relative flex size-16 items-center justify-center rounded-full border-[1.5px] border-ink transition-transform duration-500",
              isLive ? "bg-lime text-forest" : isConnecting ? "animate-pulse bg-sand text-ink" : "bg-paper text-ink",
            )}
          >
            <Radio className="size-6" />
          </div>
        </div>
        <div className="text-center">
          <div className="figure text-[22px] text-ink tabular-nums">{fmtClock(elapsedSec)}</div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {isLive
              ? "Connected — speak now"
              : isConnecting
                ? "Negotiating with the voice engine…"
                : status === "ended"
                  ? "Call ended"
                  : "Browser mic — no phone needed"}
          </p>
        </div>

        {/* active-stage highlight hook */}
        {isLive && activeNodeId && (
          <span className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-forest bg-lime/30 px-3 py-1 font-display text-[9.5px] font-extrabold tracking-[0.1em] text-forest uppercase">
            <span className="size-1.5 rounded-full bg-forest" />
            {activeNodeLabel || activeNodeId}
          </span>
        )}

        <div className="flex items-center gap-2.5">
          {isLive ? (
            <>
              <button
                type="button"
                onClick={onToggleMute}
                aria-pressed={isMuted}
                className={cn(
                  "flex size-10 items-center justify-center rounded-full border-[1.5px] transition-colors",
                  isMuted
                    ? "border-brand-orange bg-brand-orange/15 text-brand-orange"
                    : "border-ink bg-paper text-ink hover:bg-sand",
                )}
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </button>
              <button
                type="button"
                onClick={onStop}
                className="flex h-10 items-center gap-2 rounded-full bg-brand-orange px-5 font-display text-[10.5px] font-extrabold tracking-[0.1em] text-paper uppercase transition-transform hover:-translate-y-0.5"
              >
                <PhoneOff className="size-3.5" />
                End
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onStart}
              disabled={isConnecting}
              className="flex h-10 items-center gap-2 rounded-full bg-ink px-6 font-display text-[10.5px] font-extrabold tracking-[0.1em] text-paper uppercase transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            >
              <Phone className="size-3.5" />
              {status === "ended" ? "Call again" : isConnecting ? "Connecting…" : "Start test call"}
            </button>
          )}
        </div>
      </div>

      {/* error */}
      {error && (
        <div className="mx-5 mt-4 flex items-start gap-2 rounded-xl border-[1.5px] border-brand-orange/50 bg-brand-orange/5 px-3 py-2.5 text-[11.5px] leading-snug text-ink">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-brand-orange" />
          {error}
        </div>
      )}

      {/* event feed */}
      <div className="min-h-0 flex-1 overflow-hidden px-5 py-4">
        <div className="eyebrow mb-2.5 text-[9.5px] text-muted-foreground">Event feed</div>
        <div ref={feedRef} className="h-full space-y-1.5 overflow-y-auto pb-6">
          {events.length === 0 ? (
            <p className="text-[11.5px] leading-snug text-muted-foreground">
              Connection milestones and engine signals — including live stage
              transitions — stream here during a call.
            </p>
          ) : (
            events.map((e) => (
              <div key={e.id} className="flex items-center gap-2.5 font-mono text-[11px] text-ink">
                <span className="text-muted-foreground tabular-nums">{fmtClock(e.atSec)}</span>
                {e.kind === "signal" ? (
                  <Wrench className="size-3 shrink-0 text-forest" />
                ) : (
                  <Zap className="size-3 shrink-0 text-brand-orange" />
                )}
                <span className="font-semibold">{e.label}</span>
                {e.detail && <span className="truncate text-muted-foreground">{e.detail}</span>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
