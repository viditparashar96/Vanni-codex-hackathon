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
import { api } from "@/lib/api-client";
import { fmtClock } from "@/lib/format";
import { cn } from "@/lib/utils";

type CallState = "idle" | "connecting" | "live" | "ended";

/** One line in the live event feed (data-channel signals + local milestones). */
interface FeedEvent {
  id: string;
  atSec: number;
  kind: "signal" | "system";
  label: string;
  detail?: string;
}

/**
 * Wait for ICE gathering to finish so the offer carries all candidates
 * (non-trickle). Resolves early once complete, with a 2s safety fallback for
 * networks that never reach the "complete" state.
 */
function waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === "complete") {
      resolve();
      return;
    }
    const check = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", check);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", check);
    setTimeout(resolve, 2000);
  });
}

export function TestConsole({ agent }: { agent: Agent }) {
  const [state, setState] = React.useState<CallState>("idle");
  const [elapsed, setElapsed] = React.useState(0);
  const [muted, setMuted] = React.useState(false);
  const [mode, setMode] = React.useState<"voice" | "chat">("voice");
  const [events, setEvents] = React.useState<FeedEvent[]>([]);
  const [remoteActive, setRemoteActive] = React.useState(false);

  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const feedRef = React.useRef<HTMLDivElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const pcRef = React.useRef<RTCPeerConnection | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  // Monotonic clock captured when the call goes live, so feed timestamps are
  // relative to connection rather than to the mock start.
  const liveAtRef = React.useRef<number>(0);

  const agentSpeaking = state === "live" && remoteActive;

  const pushEvent = React.useCallback(
    (kind: FeedEvent["kind"], label: string, detail?: string) => {
      const atSec = liveAtRef.current
        ? Math.max(0, Math.round((Date.now() - liveAtRef.current) / 1000))
        : 0;
      setEvents((prev) => [
        ...prev,
        { id: `${label}-${prev.length}-${Date.now()}`, atSec, kind, label, detail },
      ]);
    },
    [],
  );

  /** Tear down the peer connection, stop the mic, and clear the audio sink. */
  const teardown = React.useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.ontrack = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    if (audioRef.current) audioRef.current.srcObject = null;
    setRemoteActive(false);
  }, []);

  const end = React.useCallback(() => {
    const wasLive = pcRef.current !== null;
    teardown();
    setState("ended");
    if (wasLive) {
      toast.success("Test call ended", {
        description: "The WebRTC session was closed and your mic released.",
      });
    }
  }, [teardown]);

  const start = React.useCallback(async () => {
    setState("connecting");
    setElapsed(0);
    setEvents([]);
    setMuted(false);
    liveAtRef.current = 0;

    let pc: RTCPeerConnection | null = null;
    let stream: MediaStream | null = null;

    try {
      // 1) Ask the backend to provision a test session on the voice engine.
      const { callId, engineOfferUrl } = await api.createTestSession(agent.id);

      // 2) Grab the microphone.
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 3) Build the peer connection.
      pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      // Data channel carries engine signals (transcripts/events land here in a
      // later phase); for now we surface the raw event types in the feed.
      const dc = pc.createDataChannel("chat", { ordered: true });
      dc.onopen = () => pushEvent("system", "data channel", "open");
      dc.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string) as { type?: string };
          if (msg?.type) pushEvent("signal", msg.type);
        } catch {
          /* non-JSON frames are ignored for now */
        }
      };

      // ONE sendrecv audio m-line: the mic track both sends our audio and
      // receives the agent's. Do NOT add a second recvonly transceiver — a
      // second m-line breaks negotiation with the engine.
      stream.getTracks().forEach((t) => pc!.addTrack(t, stream!));

      pc.ontrack = (e) => {
        const [remoteStream] = e.streams;
        if (audioRef.current && remoteStream) {
          audioRef.current.srcObject = remoteStream;
          audioRef.current.play().catch(() => {
            toast.info("Tap the page to enable audio", {
              description: "Your browser blocked autoplay for the agent's voice.",
            });
          });
        }
        setRemoteActive(true);
        pushEvent("signal", "remote audio", "agent stream attached");
      };

      pc.onconnectionstatechange = () => {
        const cs = pc!.connectionState;
        if (cs === "connected") {
          setState("live");
          liveAtRef.current = Date.now();
          if (!timerRef.current) {
            timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
          }
          pushEvent("system", "connected", "WebRTC peer established");
        } else if (cs === "failed" || cs === "disconnected") {
          toast.error("Call disconnected", {
            description: "The connection to the voice engine dropped.",
          });
          end();
        }
      };

      // 4) Offer, then wait for ICE gathering (non-trickle) with a 2s fallback.
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIceGathering(pc);

      // 5) Exchange SDP directly with the engine's offer endpoint.
      const res = await fetch(engineOfferUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sdp: pc.localDescription?.sdp,
          type: pc.localDescription?.type,
          call_id: callId,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Engine handshake failed (${res.status}) ${text}`.trim());
      }
      const answer = (await res.json()) as RTCSessionDescriptionInit;
      await pc.setRemoteDescription(answer);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not start the test call";
      // getUserMedia rejection is the most common failure — give a clear hint.
      const isMic =
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "NotFoundError");
      toast.error("Test call failed", {
        description: isMic ? "Microphone access was denied or unavailable." : message,
      });
      teardown();
      setState("idle");
    }
  }, [agent.id, pushEvent, teardown, end]);

  const toggleMute = React.useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    setMuted((prev) => {
      const next = !prev;
      stream.getAudioTracks().forEach((t) => (t.enabled = !next));
      return next;
    });
  }, []);

  React.useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [events.length]);

  // Release media + peer connection if the console unmounts mid-call.
  React.useEffect(() => teardown, [teardown]);

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
              {state === "connecting" && "Connecting to the voice engine…"}
              {state === "live" && "Connected — speak now"}
              {state === "ended" && "Call ended"}
            </div>
            <div className="mt-1.5 text-[12px] text-paper/55">
              {agent.voice.llm} · {agent.voice.stt.split("/")[0]} · {agent.voice.tts.split("/")[0]}
            </div>

            <div className="mt-7 flex items-center justify-center gap-3">
              {state === "live" ? (
                <>
                  <button
                    type="button"
                    onClick={toggleMute}
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
            <div className="pt-10 text-center text-[13px] text-muted-foreground">
              {state === "idle" &&
                "Start a call and the live transcript will appear here in a later phase."}
              {state === "connecting" && "Negotiating WebRTC with the voice engine…"}
              {state === "live" && (
                <span className="text-ink">
                  Connected — start speaking. The agent can hear you.
                </span>
              )}
              {state === "ended" && "Call ended. Start again to run another test."}
            </div>
          </div>

          <div className="max-h-[180px] overflow-y-auto rounded-3xl border-[1.5px] border-border bg-paper p-5">
            <div className="eyebrow mb-3 text-[9.5px] text-muted-foreground">Event feed</div>
            {events.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">
                Connection milestones and engine signals stream here during a call.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {[...events].reverse().map((e) => (
                  <li key={e.id} className="flex items-center gap-2.5 font-mono text-[11.5px] text-ink">
                    <span className="text-muted-foreground">{fmtClock(e.atSec)}</span>
                    {e.kind === "signal" ? <Wrench className="size-3 text-forest" /> : <Zap className="size-3 text-brand-orange" />}
                    <span className="font-semibold">{e.label}</span>
                    {e.detail && <span className="truncate text-muted-foreground">{e.detail}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Remote agent audio sink — hidden, autoplays the engine's voice. */}
      <audio ref={audioRef} autoPlay playsInline className="hidden" />
    </div>
  );
}
