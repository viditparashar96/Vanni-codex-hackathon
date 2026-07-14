/**
 * TTS (text-to-speech) provider + model + voice catalog.
 *
 * `voice-catalog.ts` is the Cartesia-only source of truth used by the Voice
 * tab. This catalog is the multi-provider expansion — when the Voice tab gains
 * a provider picker, it will source its options from here.
 *
 * Provider notes:
 *   - cartesia   — Default. Best price/latency/quality. Sonic. UUID voice IDs.
 *   - elevenlabs — Premium voice quality, largest voice library. Alphanumeric IDs.
 *                   Compliance tier is Enterprise-only — verify before exposing.
 *   - openai     — Cheap fallback. Locked at 24kHz (resampling artifacts on
 *                   telephony). 13 fixed voice names, NOT IDs.
 */

export type TTSProvider = "cartesia" | "elevenlabs" | "openai";

export interface TTSVoice {
  /** Provider-specific identifier (UUID for cartesia, alphanumeric for elevenlabs, name for openai). */
  voiceId: string;
  label: string;
  provider: TTSProvider;
  gender?: "female" | "male" | "neutral";
  accent?: string;
  description?: string;
  /** Models this voice is recommended with (provider-specific). */
  models?: string[];
  compliance?: boolean;
}

export interface TTSModelOption {
  value: string;
  label: string;
  provider: TTSProvider;
  description?: string;
}

export interface TTSProviderGroup {
  provider: TTSProvider;
  label: string;
  compliance: boolean;
  /**
   * For OpenAI, the voice IS one of 13 fixed literals (not an ID).
   * For Cartesia / ElevenLabs, voice and model are independent.
   */
  models: TTSModelOption[];
  voices: TTSVoice[];
}

export const TTS_PROVIDER_GROUPS: TTSProviderGroup[] = [
  {
    provider: "cartesia",
    label: "Cartesia",
    compliance: true,
    models: [
      { value: "sonic-3.5", label: "Sonic-3.5", provider: "cartesia", description: "Latest — best naturalness (recommended)" },
      { value: "sonic-3", label: "Sonic-3", provider: "cartesia", description: "Previous generation" },
      { value: "sonic-2", label: "Sonic-2", provider: "cartesia", description: "Legacy" },
    ],
    // Curated subset — see `voice-catalog.ts` for the full voice list.
    voices: [
      {
        voiceId: "f786b574-daa5-4673-aa0c-cbe3e8534c02",
        label: "Katie (American Female, friendly)",
        provider: "cartesia",
        gender: "female",
        accent: "American",
        compliance: true,
      },
      {
        voiceId: "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
        label: "Jacqueline (American Female, reassuring)",
        provider: "cartesia",
        gender: "female",
        accent: "American",
        compliance: true,
      },
      {
        voiceId: "5ee9feff-1265-424a-9d7f-8e4d431a12c7",
        label: "Ronald (American Male, thoughtful)",
        provider: "cartesia",
        gender: "male",
        accent: "American",
        compliance: true,
      },
      {
        voiceId: "a167e0f3-df7e-4d52-a9c3-f949145efdab",
        label: "Blake (American Male, helpful)",
        provider: "cartesia",
        gender: "male",
        accent: "American",
        compliance: true,
      },
    ],
  },
  {
    provider: "elevenlabs",
    label: "ElevenLabs",
    compliance: true, // Enterprise only — gate in UI
    models: [
      {
        value: "eleven_turbo_v2_5",
        label: "Turbo v2.5",
        provider: "elevenlabs",
        description: "Low latency, quality",
      },
      {
        value: "eleven_flash_v2_5",
        label: "Flash v2.5",
        provider: "elevenlabs",
        description: "Lowest latency",
      },
      {
        value: "eleven_multilingual_v2",
        label: "Multilingual v2",
        provider: "elevenlabs",
        description: "Best multilingual",
      },
    ],
    voices: [
      // ElevenLabs default library voice IDs — these are public / widely-known.
      {
        voiceId: "21m00Tcm4TlvDq8ikWAM",
        label: "Rachel (American Female, Conversational)",
        provider: "elevenlabs",
        gender: "female",
        accent: "American",
        compliance: true,
      },
      {
        voiceId: "AZnzlk1XvdvUeBnXmlld",
        label: "Domi (American Female, Strong)",
        provider: "elevenlabs",
        gender: "female",
        accent: "American",
        compliance: true,
      },
      {
        voiceId: "ErXwobaYiN019PkySvjV",
        label: "Antoni (American Male, Well-rounded)",
        provider: "elevenlabs",
        gender: "male",
        accent: "American",
        compliance: true,
      },
      {
        voiceId: "TxGEqnHWrfWFTfGW9XjX",
        label: "Josh (American Male, Deep)",
        provider: "elevenlabs",
        gender: "male",
        accent: "American",
        compliance: true,
      },
    ],
  },
  {
    provider: "openai",
    label: "OpenAI TTS",
    compliance: true,
    models: [
      {
        value: "gpt-4o-mini-tts",
        label: "GPT-4o Mini TTS",
        provider: "openai",
        description: "Latest, instructable",
      },
      { value: "tts-1", label: "TTS-1", provider: "openai", description: "Standard" },
      { value: "tts-1-hd", label: "TTS-1 HD", provider: "openai", description: "Higher quality" },
    ],
    // OpenAI has 13 fixed voice names — voiceId IS one of these strings.
    voices: [
      { voiceId: "alloy", label: "Alloy (Neutral)", provider: "openai", gender: "neutral", compliance: true },
      { voiceId: "ash", label: "Ash (Male, Crisp)", provider: "openai", gender: "male", compliance: true },
      { voiceId: "ballad", label: "Ballad (Male, Warm)", provider: "openai", gender: "male", compliance: true },
      { voiceId: "cedar", label: "Cedar (Male, Natural)", provider: "openai", gender: "male", compliance: true },
      { voiceId: "coral", label: "Coral (Female, Warm)", provider: "openai", gender: "female", compliance: true },
      { voiceId: "echo", label: "Echo (Male, Soft)", provider: "openai", gender: "male", compliance: true },
      { voiceId: "fable", label: "Fable (Male, British)", provider: "openai", gender: "male", compliance: true },
      { voiceId: "marin", label: "Marin (Female, Natural)", provider: "openai", gender: "female", compliance: true },
      { voiceId: "nova", label: "Nova (Female, Clear)", provider: "openai", gender: "female", compliance: true },
      { voiceId: "onyx", label: "Onyx (Male, Deep)", provider: "openai", gender: "male", compliance: true },
      { voiceId: "sage", label: "Sage (Female, Calm)", provider: "openai", gender: "female", compliance: true },
      { voiceId: "shimmer", label: "Shimmer (Female, Bright)", provider: "openai", gender: "female", compliance: true },
      { voiceId: "verse", label: "Verse (Male, Expressive)", provider: "openai", gender: "male", compliance: true },
    ],
  },
];

export const ALL_TTS_VOICES: TTSVoice[] = TTS_PROVIDER_GROUPS.flatMap((g) => g.voices);
export const ALL_TTS_MODELS: TTSModelOption[] = TTS_PROVIDER_GROUPS.flatMap((g) => g.models);

export function getTTSProviderForVoice(voiceId: string): TTSProvider {
  const voice = ALL_TTS_VOICES.find((v) => v.voiceId === voiceId);
  return voice?.provider || "cartesia";
}

export const DEFAULT_TTS_PROVIDER: TTSProvider = "cartesia";
export const DEFAULT_TTS_VOICE_ID = "f786b574-daa5-4673-aa0c-cbe3e8534c02";
export const DEFAULT_TTS_MODEL = "sonic-3.5";
