/**
 * Realtime / speech-to-speech model catalog.
 *
 * Realtime models replace the cascade [STT, LLM, TTS] triplet with a single
 * processor that handles audio in and out. Different pipeline shape, different
 * cost model (per minute, not per token).
 *
 * v1 providers:
 *   - openai_realtime — gpt-realtime / gpt-4o-realtime. WebSocket, 24kHz PCM.
 *   - gemini_live     — Gemini Multimodal Live. Native audio voices, native
 *                        affective dialog.
 */

export type RealtimeProvider = "openai_realtime" | "gemini_live";

export interface RealtimeModel {
  value: string;
  label: string;
  provider: RealtimeProvider;
  description?: string;
  compliance?: boolean;
}

export interface RealtimeVoice {
  voiceId: string;
  label: string;
  provider: RealtimeProvider;
  description?: string;
}

export interface RealtimeProviderGroup {
  provider: RealtimeProvider;
  label: string;
  compliance: boolean;
  models: RealtimeModel[];
  voices: RealtimeVoice[];
}

export const REALTIME_PROVIDER_GROUPS: RealtimeProviderGroup[] = [
  {
    provider: "openai_realtime",
    label: "OpenAI Realtime",
    compliance: true,
    models: [
      {
        value: "gpt-realtime-2025-08-28",
        label: "GPT Realtime",
        provider: "openai_realtime",
        description: "Latest, recommended",
        compliance: true,
      },
      {
        value: "gpt-4o-realtime-preview",
        label: "GPT-4o Realtime Preview",
        provider: "openai_realtime",
        description: "Stable preview",
        compliance: true,
      },
    ],
    // OpenAI Realtime uses the same fixed voice list as OpenAI TTS.
    voices: [
      { voiceId: "alloy", label: "Alloy (Neutral)", provider: "openai_realtime" },
      { voiceId: "ash", label: "Ash (Male, Crisp)", provider: "openai_realtime" },
      { voiceId: "ballad", label: "Ballad (Male, Warm)", provider: "openai_realtime" },
      { voiceId: "coral", label: "Coral (Female, Warm)", provider: "openai_realtime" },
      { voiceId: "echo", label: "Echo (Male, Soft)", provider: "openai_realtime" },
      { voiceId: "nova", label: "Nova (Female, Clear)", provider: "openai_realtime" },
      { voiceId: "onyx", label: "Onyx (Male, Deep)", provider: "openai_realtime" },
      { voiceId: "sage", label: "Sage (Female, Calm)", provider: "openai_realtime" },
      { voiceId: "shimmer", label: "Shimmer (Female, Bright)", provider: "openai_realtime" },
      { voiceId: "verse", label: "Verse (Male, Expressive)", provider: "openai_realtime" },
    ],
  },
  {
    provider: "gemini_live",
    label: "Google Gemini Live",
    compliance: true,
    models: [
      {
        value: "gemini-2.5-flash-preview-native-audio-dialog",
        label: "Gemini 2.5 Flash (Native Audio Dialog)",
        provider: "gemini_live",
        description: "Recommended for natural dialog",
        compliance: true,
      },
      {
        value: "gemini-2.0-flash-exp",
        label: "Gemini 2.0 Flash Exp",
        provider: "gemini_live",
        description: "Stable, cheaper",
        compliance: true,
      },
    ],
    voices: [
      { voiceId: "Puck", label: "Puck (Bright, Male)", provider: "gemini_live" },
      { voiceId: "Charon", label: "Charon (Deep, Male)", provider: "gemini_live" },
      { voiceId: "Kore", label: "Kore (Warm, Female)", provider: "gemini_live" },
      { voiceId: "Fenrir", label: "Fenrir (Direct, Male)", provider: "gemini_live" },
      { voiceId: "Aoede", label: "Aoede (Soft, Female)", provider: "gemini_live" },
    ],
  },
];

export const ALL_REALTIME_MODELS: RealtimeModel[] = REALTIME_PROVIDER_GROUPS.flatMap((g) => g.models);
export const ALL_REALTIME_VOICES: RealtimeVoice[] = REALTIME_PROVIDER_GROUPS.flatMap((g) => g.voices);

export function getRealtimeProviderForModel(modelValue: string): RealtimeProvider {
  const m = ALL_REALTIME_MODELS.find((x) => x.value === modelValue);
  return m?.provider || "openai_realtime";
}

export const DEFAULT_REALTIME_PROVIDER: RealtimeProvider = "openai_realtime";
export const DEFAULT_REALTIME_MODEL = "gpt-realtime-2025-08-28";
export const DEFAULT_REALTIME_VOICE = "alloy";
