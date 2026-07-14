import { z } from "zod";

/**
 * End-of-call report: voice-engine → API.
 *
 * MANDATORY. The engine sends this even on pipeline error so the API can
 * close out the call, compute cost, and fire webhooks. Persist idempotently
 * on callId.
 */

export const TranscriptEntrySchema = z.object({
  role: z.enum(["user", "agent", "system"]),
  text: z.string(),
  ts: z.number(), // epoch ms
  latencyMs: z.number().optional(), // voice-to-voice latency for agent turns
});
export type TranscriptEntry = z.infer<typeof TranscriptEntrySchema>;

export const CallMetricsSchema = z.object({
  voiceToVoiceP50Ms: z.number().optional(),
  voiceToVoiceP95Ms: z.number().optional(),
  interruptions: z.number().default(0),
  deadAirSecs: z.number().default(0),
  turns: z.number().default(0),
});

/** Provider usage, used to compute cost from the pricing tables. */
export const UsageSchema = z.object({
  stt: z
    .object({ provider: z.string(), model: z.string(), seconds: z.number() })
    .optional(),
  llm: z
    .object({
      provider: z.string(),
      model: z.string(),
      inputTokens: z.number(),
      cachedInputTokens: z.number().default(0),
      outputTokens: z.number(),
    })
    .optional(),
  tts: z
    .object({ provider: z.string(), model: z.string(), characters: z.number() })
    .optional(),
});

export const PostCallAnalysisSchema = z.object({
  summary: z.string().optional(),
  sentiment: z.string().optional(),
  structuredData: z.record(z.string(), z.unknown()).optional(),
});

export const QaTagSchema = z.object({
  tag: z.string(),
  evidence: z.string().optional(),
});

export const QaResultSchema = z.object({
  callQualityScore: z.number().min(1).max(10),
  overallSentiment: z.string(),
  summary: z.string(),
  tags: z.array(QaTagSchema).default([]),
});

export const RecordingRefSchema = z.object({
  storagePath: z.string().optional(),
  durationSecs: z.number().optional(),
});

export const CallStatus = z.enum([
  "completed",
  "failed",
  "no_answer",
  "busy",
  "voicemail",
]);
export type CallStatus = z.infer<typeof CallStatus>;

export const EndOfCallReportSchema = z.object({
  callId: z.string(),
  status: CallStatus,
  startedAt: z.number(),
  endedAt: z.number(),
  durationSecs: z.number(),
  transcript: z.array(TranscriptEntrySchema).default([]),
  metrics: CallMetricsSchema.prefault({}),
  usage: UsageSchema.prefault({}),
  analysis: PostCallAnalysisSchema.optional(),
  qa: QaResultSchema.optional(),
  recording: RecordingRefSchema.optional(),
  error: z.string().optional(),
});
export type EndOfCallReport = z.infer<typeof EndOfCallReportSchema>;
