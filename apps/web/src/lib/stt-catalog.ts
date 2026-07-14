/**
 * STT (speech-to-text) provider + model catalog.
 *
 * Provider notes:
 *   - deepgram    — Default. Lowest time-to-first-transcript in the ecosystem.
 *   - assemblyai  — Universal-Streaming with semantic end-of-turn detection.
 *                   Different turn-taking semantics than Deepgram.
 *   - azure       — Azure Speech. Higher latency, broad language coverage.
 *   - openai      — NON-STREAMING Whisper. Buffers the full utterance,
 *                   ~300-800ms tail. Use for batch / non-real-time paths only.
 *                   Don't expose it as a "real-time" choice in the agent builder.
 */

export type STTProvider = "deepgram" | "assemblyai" | "azure" | "openai";

export interface STTModel {
  value: string;
  label: string;
  provider: STTProvider;
  description?: string;
  /** True if this model is real-time streaming (not utterance-batched). */
  streaming: boolean;
  compliance?: boolean;
}

export interface STTProviderGroup {
  provider: STTProvider;
  label: string;
  compliance: boolean;
  /** True if every model in this group supports real-time streaming. */
  streaming: boolean;
  models: STTModel[];
}

export const STT_PROVIDER_GROUPS: STTProviderGroup[] = [
  {
    provider: "deepgram",
    label: "Deepgram",
    compliance: true,
    streaming: true,
    models: [
      {
        value: "nova-3-general",
        label: "Nova-3 General",
        provider: "deepgram",
        description: "Latest, best general accuracy",
        streaming: true,
        compliance: true,
      },
      {
        value: "nova-2-general",
        label: "Nova-2 General",
        provider: "deepgram",
        description: "Stable production",
        streaming: true,
        compliance: true,
      },
      {
        value: "nova-2-phonecall",
        label: "Nova-2 Phone Call",
        provider: "deepgram",
        description: "Optimized for telephony",
        streaming: true,
        compliance: true,
      },
    ],
  },
  {
    provider: "assemblyai",
    label: "AssemblyAI",
    compliance: true,
    streaming: true,
    models: [
      {
        value: "universal-streaming",
        label: "Universal Streaming",
        provider: "assemblyai",
        description: "Semantic end-of-turn",
        streaming: true,
        compliance: true,
      },
    ],
  },
  {
    provider: "azure",
    label: "Azure Speech",
    compliance: true,
    streaming: true,
    models: [
      {
        value: "default",
        label: "Default",
        provider: "azure",
        description: "Standard Azure model",
        streaming: true,
        compliance: true,
      },
    ],
  },
  {
    provider: "openai",
    label: "OpenAI Whisper",
    compliance: true,
    streaming: false,
    models: [
      {
        value: "whisper-1",
        label: "Whisper-1 (non-streaming)",
        provider: "openai",
        description: "Batch — adds tail latency",
        streaming: false,
        compliance: true,
      },
    ],
  },
];

export const ALL_STT_MODELS: STTModel[] = STT_PROVIDER_GROUPS.flatMap((g) => g.models);

export function getSTTProviderForModel(modelValue: string): STTProvider {
  const model = ALL_STT_MODELS.find((m) => m.value === modelValue);
  return model?.provider || "deepgram";
}

export const DEFAULT_STT_PROVIDER: STTProvider = "deepgram";
export const DEFAULT_STT_MODEL = "nova-3-general";
