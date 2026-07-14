"use client";

import * as React from "react";
import { api } from "@/lib/api-client";

export type FlowTestStatus = "idle" | "connecting" | "live" | "ended" | "error";

/** One line in the live event feed (data-channel signals + local milestones). */
export interface FlowTestEvent {
  id: string;
  atSec: number;
  kind: "signal" | "system";
  label: string;
  detail?: string;
}

export interface UseFlowTestingOptions {
  agentId: string;
  /**
   * Hook point for live per-node highlighting. Called with the node id the
   * engine reports it has entered. A no-op until the engine actually streams
   * node-transition events — wire it to `editor.setActiveNodeId` so the canvas
   * lights up when they arrive.
   */
  onNodeTransition?: (nodeId: string | null) => void;
}

export interface UseFlowTestingReturn {
  status: FlowTestStatus;
  error: string | null;
  events: FlowTestEvent[];
  elapsedSec: number;
  isMuted: boolean;
  start: () => Promise<void>;
  stop: () => void;
  toggleMute: () => void;
}

/**
 * Wait for ICE gathering so the offer carries all candidates (non-trickle).
 * Resolves early on `complete`, with a 2s fallback for networks that never
 * report it.
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

/**
 * Extract a node id from an engine data-channel frame if it's a node-transition
 * signal. Tolerant of a few shapes so the highlighting hook point works
 * whatever the engine settles on: a top-level `{type, nodeId}` frame, or an
 * RTVI-style `server-message` wrapper. Returns `undefined` for anything else.
 */
const NODE_CHANGE_TYPES = new Set(["flow_node_change", "node_change", "node-transition"]);
function nodeIdFromFrame(msg: Record<string, unknown>): string | undefined {
  const readId = (o: Record<string, unknown>): string | undefined => {
    const id = o.nodeId ?? o.node_id;
    return typeof id === "string" ? id : undefined;
  };
  if (typeof msg.type === "string" && NODE_CHANGE_TYPES.has(msg.type)) {
    return readId(msg);
  }
  if (msg.type === "server-message" && msg.data && typeof msg.data === "object") {
    const data = msg.data as Record<string, unknown>;
    if (typeof data.type === "string" && NODE_CHANGE_TYPES.has(data.type)) {
      return readId(data);
    }
  }
  return undefined;
}

/**
 * In-editor test call over SmallWebRTC to the voice engine, following the same
 * handshake as the standalone test console: provision a session, grab the mic,
 * offer one sendrecv audio m-line + a `chat` data channel, wait for ICE, POST
 * the offer to the engine, apply the answer, and play the remote audio.
 *
 * Beyond connection state it exposes a `chat`-channel reader that forwards
 * node-transition frames to `onNodeTransition` for live canvas highlighting
 * (a no-op until the engine emits them).
 */
export function useFlowTesting({
  agentId,
  onNodeTransition,
}: UseFlowTestingOptions): UseFlowTestingReturn {
  const [status, setStatus] = React.useState<FlowTestStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [events, setEvents] = React.useState<FlowTestEvent[]>([]);
  const [elapsedSec, setElapsedSec] = React.useState(0);
  const [isMuted, setIsMuted] = React.useState(false);

  const pcRef = React.useRef<RTCPeerConnection | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const liveAtRef = React.useRef(0);

  const onTransitionRef = React.useRef(onNodeTransition);
  onTransitionRef.current = onNodeTransition;

  const pushEvent = React.useCallback(
    (kind: FlowTestEvent["kind"], label: string, detail?: string) => {
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
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current.remove();
      audioRef.current = null;
    }
    onTransitionRef.current?.(null);
  }, []);

  const stop = React.useCallback(() => {
    teardown();
    setStatus("ended");
    setIsMuted(false);
  }, [teardown]);

  const start = React.useCallback(async () => {
    setStatus("connecting");
    setError(null);
    setEvents([]);
    setElapsedSec(0);
    setIsMuted(false);
    liveAtRef.current = 0;

    let pc: RTCPeerConnection | null = null;
    let stream: MediaStream | null = null;

    try {
      // 1) Provision the test session on the engine.
      const { callId, engineOfferUrl } = await api.createTestSession(agentId);

      // 2) Microphone.
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 3) Peer connection.
      pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      // `chat` data channel carries engine signals — including the
      // node-transition frames that drive live highlighting.
      const dc = pc.createDataChannel("chat", { ordered: true });
      dc.onopen = () => pushEvent("system", "data channel", "open");
      dc.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string) as Record<string, unknown>;
          const nodeId = nodeIdFromFrame(msg);
          if (nodeId) {
            onTransitionRef.current?.(nodeId);
            pushEvent("signal", "node transition", nodeId);
          } else if (typeof msg.type === "string") {
            pushEvent("signal", msg.type);
          }
        } catch {
          /* non-JSON frames are ignored */
        }
      };

      // ONE sendrecv audio m-line: the mic track both sends our audio and
      // receives the agent's. A second m-line breaks engine negotiation.
      stream.getTracks().forEach((t) => pc!.addTrack(t, stream!));

      const audioEl = new Audio();
      audioEl.autoplay = true;
      audioRef.current = audioEl;

      pc.ontrack = (e) => {
        const [remoteStream] = e.streams;
        if (audioRef.current && remoteStream) {
          audioRef.current.srcObject = remoteStream;
          audioRef.current.play().catch(() => {
            /* autoplay may be blocked until a user gesture */
          });
        }
        pushEvent("signal", "remote audio", "agent stream attached");
      };

      pc.onconnectionstatechange = () => {
        const cs = pc!.connectionState;
        if (cs === "connected") {
          setStatus("live");
          liveAtRef.current = Date.now();
          if (!timerRef.current) {
            timerRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);
          }
          pushEvent("system", "connected", "WebRTC peer established");
        } else if (cs === "failed" || cs === "disconnected") {
          setError("The connection to the voice engine dropped.");
          stop();
        }
      };

      // 4) Offer, then wait for ICE gathering (non-trickle, 2s fallback).
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
      const isMic =
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "NotFoundError");
      setError(
        isMic
          ? "Microphone access was denied or unavailable."
          : err instanceof Error
            ? err.message
            : "Could not start the test call.",
      );
      teardown();
      setStatus("error");
    }
  }, [agentId, pushEvent, teardown, stop]);

  const toggleMute = React.useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    setIsMuted((prev) => {
      const next = !prev;
      stream.getAudioTracks().forEach((t) => (t.enabled = !next));
      return next;
    });
  }, []);

  // Release media + peer connection if the consumer unmounts mid-call.
  React.useEffect(() => teardown, [teardown]);

  return { status, error, events, elapsedSec, isMuted, start, stop, toggleMute };
}
