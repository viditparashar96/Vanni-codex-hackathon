/**
 * Dispatch to the voice engine (apps/voice-engine).
 *
 * Builds a DispatchRequest (@vaani/shared contract) and POSTs it to the
 * engine's /dispatch. The engine registers the call and the browser then
 * connects directly to its /api/offer for SmallWebRTC. The engine phones home
 * to the callback URLs we embed here.
 */

import {
  DispatchRequestSchema,
  DispatchAckSchema,
  type DispatchRequest,
  type DispatchAck,
  type AgentConfig,
  type CallMode,
  type CallDirection,
  type TransportConfig,
} from "@vaani/shared";

function engineUrl(): string {
  return process.env.VOICE_ENGINE_URL || "http://localhost:7860";
}

function publicApiUrl(): string {
  return process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 4000}`;
}

export interface DispatchParams {
  callId: string;
  orgId: string;
  agentId: string;
  versionId: string;
  mode: CallMode;
  direction: CallDirection;
  agentConfig: AgentConfig;
  transport?: TransportConfig;
  variables?: Record<string, string>;
  fromNumber?: string;
  toNumber?: string;
  metadata?: Record<string, unknown>;
}

/** Internal callback URLs the engine posts to (cluster-internal, unauthenticated). */
export function callbackUrls(callId: string) {
  const base = publicApiUrl().replace(/\/$/, "");
  return {
    report: `${base}/api/internal/calls/${callId}/report`,
    events: `${base}/api/internal/calls/${callId}/events`,
  };
}

export function buildDispatchRequest(params: DispatchParams): DispatchRequest {
  return DispatchRequestSchema.parse({
    callId: params.callId,
    orgId: params.orgId,
    agentId: params.agentId,
    versionId: params.versionId,
    mode: params.mode,
    direction: params.direction,
    transport: params.transport ?? { type: "smallwebrtc" },
    agentConfig: params.agentConfig,
    variables: params.variables ?? {},
    fromNumber: params.fromNumber,
    toNumber: params.toNumber,
    callbacks: callbackUrls(params.callId),
    metadata: params.metadata,
  } satisfies DispatchRequest);
}

/** POST the dispatch to the engine. Returns the engine's ack (or a synthetic reject). */
export async function dispatchToEngine(req: DispatchRequest): Promise<DispatchAck> {
  const url = `${engineUrl().replace(/\/$/, "")}/dispatch`;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "unknown error");
      console.error(`[dispatch] engine ${url} returned ${resp.status}: ${text}`);
      return { callId: req.callId, accepted: false, reason: `engine ${resp.status}: ${text}` };
    }
    const json = await resp.json();
    return DispatchAckSchema.parse(json);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[dispatch] engine unreachable at ${url}:`, msg);
    return { callId: req.callId, accepted: false, reason: `engine unreachable: ${msg}` };
  }
}
