import { z } from "zod";
import { AgentConfigSchema } from "./agent-config.js";

/**
 * Dispatch request: API → voice-engine.
 *
 * Sent when a call is started (web test, widget, phone, chat). Carries the
 * fully resolved agent config plus everything the engine needs to join the
 * media room and phone home. The engine treats this as the single source of
 * truth for the call — it reads no other per-agent state.
 */

export const CallMode = z.enum(["web_test", "widget", "shared", "phone", "chat"]);
export type CallMode = z.infer<typeof CallMode>;

export const CallDirection = z.enum(["inbound", "outbound"]);
export type CallDirection = z.infer<typeof CallDirection>;

export const TransportConfigSchema = z.object({
  type: z.enum(["livekit", "daily", "smallwebrtc"]),
  /** LiveKit ws URL / Daily room URL. Omitted for smallwebrtc (browser-negotiated). */
  url: z.string().optional(),
  /** Participant token for the engine to join the room. */
  token: z.string().optional(),
  roomName: z.string().optional(),
});
export type TransportConfig = z.infer<typeof TransportConfigSchema>;

/** Internal callback URLs the engine posts to (cluster-internal, unauthenticated). */
export const CallbackUrlsSchema = z.object({
  /** Mandatory end-of-call report sink. */
  report: z.string(),
  /** Realtime feedback event buffer sink. */
  events: z.string(),
});

export const DispatchRequestSchema = z.object({
  callId: z.string(),
  orgId: z.string(),
  agentId: z.string(),
  versionId: z.string(),
  mode: CallMode,
  direction: CallDirection,
  transport: TransportConfigSchema,
  agentConfig: AgentConfigSchema,
  /**
   * Per-call variable values, referenced as {{name}} in prompts.
   * Precedence (highest first): these injected values > pre-call-fetch results
   * > agent customVariables defaults.
   */
  variables: z.record(z.string(), z.string()).default({}),
  /** Telephony-only: the two call legs. */
  fromNumber: z.string().optional(),
  toNumber: z.string().optional(),
  callbacks: CallbackUrlsSchema,
  /** Free-form metadata echoed back in the report (campaign id, contact id, etc.). */
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type DispatchRequest = z.infer<typeof DispatchRequestSchema>;

/** Synchronous ack the engine returns when it accepts a dispatch. */
export const DispatchAckSchema = z.object({
  callId: z.string(),
  accepted: z.boolean(),
  reason: z.string().optional(),
});
export type DispatchAck = z.infer<typeof DispatchAckSchema>;
