import { z } from "zod";

/**
 * Resolved agent configuration.
 *
 * This is the config the API hands the voice engine AFTER resolving the
 * published agent version, org provider keys, and per-call overrides. The
 * engine reads nothing else — everything it needs to run a call is here.
 */

// ── Voice stack ───────────────────────────────────────────────────────────

export const RealtimeConfigSchema = z.object({
  enabled: z.boolean().default(false),
  provider: z.enum(["openai_realtime", "gemini_live"]).optional(),
  model: z.string().optional(),
  voice: z.string().optional(),
});

export const VoiceConfigSchema = z.object({
  llmProvider: z.enum(["openai", "anthropic", "google", "groq"]).default("openai"),
  llmModel: z.string().default("gpt-4.1-mini"),
  sttProvider: z
    .enum(["deepgram", "assemblyai", "azure", "openai", "speechmatics"])
    .default("deepgram"),
  sttModel: z.string().default("nova-3-general"),
  sttLanguage: z.string().optional(),
  ttsProvider: z.enum(["cartesia", "elevenlabs", "deepgram", "openai"]).default("cartesia"),
  ttsModel: z.string().optional(),
  ttsVoice: z.string().optional(),
  language: z.string().default("en"),
  voiceSpeed: z.number().optional(),
  realtime: RealtimeConfigSchema.optional(),
});
export type VoiceConfig = z.infer<typeof VoiceConfigSchema>;

// ── Simple-agent persona ────────────────────────────────────────────────────

export const CustomVariableSchema = z.object({
  name: z.string(),
  defaultValue: z.string().optional(),
  description: z.string().optional(),
});

export const PersonaConfigSchema = z.object({
  systemPrompt: z.string(),
  agentSpeaksFirst: z.boolean().default(false),
  greetingMessage: z.string().optional(),
  personalityTraits: z.array(z.string()).optional(),
  speakingStyle: z.string().optional(),
  responseLengthPreference: z.enum(["concise", "balanced", "verbose"]).optional(),
  customVariables: z.array(CustomVariableSchema).optional(),
});
export type PersonaConfig = z.infer<typeof PersonaConfigSchema>;

// ── Advanced / call-behaviour settings ────────────────────────────────────

export const VadConfigSchema = z.object({
  stopSecs: z.number().default(0.3),
  confidence: z.number().default(0.7),
  minVolume: z.number().default(0.6),
});

export const BackgroundNoiseSchema = z.object({
  enabled: z.boolean().default(false),
  sound: z.enum(["office", "call_center", "cafe"]).default("office"),
  volume: z.number().default(0.3),
});

export const VoicemailConfigSchema = z.object({
  enabled: z.boolean().default(false),
  responseDelaySecs: z.number().default(2.0),
  leaveMessage: z.boolean().default(false),
  message: z.string().default(""),
});

export const IvrNavigationSchema = z.object({
  enabled: z.boolean().default(false),
  goalTemplate: z.string().optional(),
  maxNavigationSecs: z.number().default(90),
  onStuck: z.enum(["end_call", "continue_to_flow"]).default("continue_to_flow"),
});

export const ChatSettingsSchema = z.object({
  chatMaxDurationSecs: z.number().default(480),
  chatIdleWarningSecs: z.number().default(20),
  chatIdleTimeoutSecs: z.number().default(25),
});

export const AdvancedConfigSchema = z.object({
  maxCallDurationSecs: z.number().default(240),
  inactivityTimeoutSecs: z.number().default(30),
  timezone: z.string().default("UTC"),
  silenceDuringIntro: z.boolean().default(true),
  silenceWhenAgentSpeaks: z.boolean().default(false),
  vad: VadConfigSchema.prefault({}),
  backgroundNoise: BackgroundNoiseSchema.prefault({}),
  gracefulExitEnabled: z.boolean().default(true),
  gracefulExitWarningSecs: z.number().default(30),
  goodbyeMessage: z.string().default("Thank you for your time. Goodbye!"),
  enableEndCall: z.boolean().default(true),
  endCallDescription: z.string().optional(),
  voicemail: VoicemailConfigSchema.prefault({}),
  ivrNavigation: IvrNavigationSchema.optional(),
  chatSettings: ChatSettingsSchema.optional(),
  screenAware: z.object({ enabled: z.boolean() }).optional(),
});
export type AdvancedConfig = z.infer<typeof AdvancedConfigSchema>;

// ── Tools ─────────────────────────────────────────────────────────────────

export const ToolAuthSchema = z.object({
  type: z.enum(["none", "api_key", "bearer"]).default("none"),
  // Resolved (decrypted) secret value for this call; never persisted in reports.
  value: z.string().optional(),
  headerName: z.string().optional(),
});

export const HttpToolSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  parameters: z.record(z.string(), z.unknown()).default({}), // JSON Schema for params
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("POST"),
  url: z.string(),
  headers: z.record(z.string(), z.string()).optional(),
  auth: ToolAuthSchema.optional(),
  timeoutMs: z.number().default(10000),
});
export type HttpTool = z.infer<typeof HttpToolSchema>;

// ── Knowledge base bindings ─────────────────────────────────────────────────

export const KnowledgeBaseBindingSchema = z.object({
  knowledgeBaseId: z.string(),
  chunksToRetrieve: z.number().min(1).max(10).default(3),
  similarityThreshold: z.number().min(0).max(1).default(0.5),
});
export type KnowledgeBaseBinding = z.infer<typeof KnowledgeBaseBindingSchema>;

// ── The resolved agent config ───────────────────────────────────────────────

export const AgentConfigSchema = z.object({
  type: z.enum(["simple", "flow"]),
  voice: VoiceConfigSchema,
  /** Present when type === "simple". */
  persona: PersonaConfigSchema.optional(),
  /**
   * Present when type === "flow". Passthrough for now — the full flow-graph
   * schema is finalized in Phase 5 against the modern dynamic-flows API.
   */
  flow: z.record(z.string(), z.unknown()).optional(),
  advanced: AdvancedConfigSchema.prefault({}),
  tools: z.array(HttpToolSchema).default([]),
  knowledgeBases: z.array(KnowledgeBaseBindingSchema).default([]),
});
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
