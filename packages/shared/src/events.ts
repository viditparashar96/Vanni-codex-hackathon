import { z } from "zod";

/**
 * Realtime feedback events: voice-engine → (live WebSocket sink + DB sink).
 *
 * One stable JSON shape written to BOTH sinks so the dashboard renders the
 * same timeline component for a live call and for historical playback.
 */

export const FeedbackEventType = z.enum([
  "transcript", // a finalized transcript line
  "tool_call", // a tool was invoked (+ latency, result)
  "node_transition", // flow agent moved between nodes
  "latency", // per-turn voice-to-voice latency tick
  "vad", // VAD edge (user started / stopped speaking)
  "interruption", // caller barged in
  "call_status", // status change (connected, ended, error)
]);
export type FeedbackEventType = z.infer<typeof FeedbackEventType>;

export const FeedbackEventSchema = z.object({
  callId: z.string(),
  type: FeedbackEventType,
  ts: z.number(), // epoch ms
  /** Type-specific payload. Kept open; consumers switch on `type`. */
  payload: z.record(z.string(), z.unknown()).default({}),
});
export type FeedbackEvent = z.infer<typeof FeedbackEventSchema>;

/** Batched event flush (engine buffers and posts periodically). */
export const FeedbackEventBatchSchema = z.object({
  callId: z.string(),
  events: z.array(FeedbackEventSchema),
});
export type FeedbackEventBatch = z.infer<typeof FeedbackEventBatchSchema>;
