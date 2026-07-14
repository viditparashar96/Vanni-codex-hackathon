/**
 * Curated Cartesia voice catalog and supported languages.
 *
 * Voice IDs come from Cartesia's voice library (play.cartesia.ai).
 * Languages are the intersection of the STT and Cartesia TTS support matrices.
 */

export interface Voice {
  id: string;
  name: string;
  gender: "female" | "male";
  accent: string;
  category: "stable" | "expressive" | "conversational" | "calm" | "professional";
  languages: string[]; // ISO codes this voice supports well
}

export interface Language {
  code: string;
  label: string;
}

// ── Curated voice catalog ────────────────────────────────────────────────────

export const VOICE_CATALOG: Voice[] = [
  // ─── English Female (curated Sonic-3.5 agent voices) ───
  {
    id: "f786b574-daa5-4673-aa0c-cbe3e8534c02",
    name: "Katie",
    gender: "female",
    accent: "American",
    category: "stable",
    languages: ["en"],
  },
  {
    id: "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
    name: "Jacqueline",
    gender: "female",
    accent: "American",
    category: "professional",
    languages: ["en"],
  },
  {
    id: "e07c00bc-4134-4eae-9ea4-1a55fb45746b",
    name: "Brooke",
    gender: "female",
    accent: "American",
    category: "conversational",
    languages: ["en"],
  },
  {
    id: "e8e5fffb-252c-436d-b842-8879b84445b6",
    name: "Cathy",
    gender: "female",
    accent: "American",
    category: "conversational",
    languages: ["en"],
  },

  // ─── English Male (curated Sonic-3.5 agent voices) ───
  {
    id: "5ee9feff-1265-424a-9d7f-8e4d431a12c7",
    name: "Ronald",
    gender: "male",
    accent: "American",
    category: "stable",
    languages: ["en"],
  },
  {
    id: "86e30c1d-714b-4074-a1f2-1cb6b552fb49",
    name: "Carson",
    gender: "male",
    accent: "American",
    category: "conversational",
    languages: ["en"],
  },
  {
    id: "a5136bf9-224c-4d76-b823-52bd5efcffcc",
    name: "Jameson",
    gender: "male",
    accent: "American",
    category: "conversational",
    languages: ["en"],
  },
  {
    id: "a167e0f3-df7e-4d52-a9c3-f949145efdab",
    name: "Blake",
    gender: "male",
    accent: "American",
    category: "professional",
    languages: ["en"],
  },
  {
    id: "87286a8d-7ea7-4235-a41a-dd9fa6630feb",
    name: "Henry",
    gender: "male",
    accent: "American",
    category: "stable",
    languages: ["en"],
  },

  // ─── Hindi / Indian ───
  {
    id: "3b554273-4299-48b9-9aaf-eefd438e3941",
    name: "Indian Lady",
    gender: "female",
    accent: "Indian",
    category: "conversational",
    languages: ["en", "hi"],
  },
  {
    id: "ff1bb1a9-c582-4570-9670-5f46169d0fc8",
    name: "Indian Support Lady",
    gender: "female",
    accent: "Indian",
    category: "professional",
    languages: ["en", "hi"],
  },
  {
    id: "c1abd502-9231-4558-a054-10ac950c356d",
    name: "Hindi Narrator Woman",
    gender: "female",
    accent: "Indian",
    category: "calm",
    languages: ["hi", "en"],
  },
  {
    id: "95d51f79-c397-46f9-b49a-23763d3eaa2d",
    name: "Hinglish Lady",
    gender: "female",
    accent: "Indian",
    category: "conversational",
    languages: ["hi", "en"],
  },
  {
    id: "638efaaa-4d0c-442e-b701-3fae16aad012",
    name: "Indian Man",
    gender: "male",
    accent: "Indian",
    category: "conversational",
    languages: ["en", "hi"],
  },
  {
    id: "7f423809-0011-4658-ba48-a411f5e516ba",
    name: "Hindi Narrator Man",
    gender: "male",
    accent: "Indian",
    category: "calm",
    languages: ["hi", "en"],
  },

  // ─── Spanish ───
  {
    id: "2deb3edf-b9d8-4d06-8db9-5742fb8a3cb2",
    name: "Spanish Narrator Lady",
    gender: "female",
    accent: "Spanish",
    category: "calm",
    languages: ["es"],
  },
  {
    id: "846d6cb0-2301-48b6-9683-48f5618ea2f6",
    name: "Spanish-speaking Lady",
    gender: "female",
    accent: "Spanish",
    category: "conversational",
    languages: ["es"],
  },

  // ─── French ───
  {
    id: "a249eaff-1e96-4d2c-b23b-12efa4f66f41",
    name: "French Conversational Lady",
    gender: "female",
    accent: "French",
    category: "conversational",
    languages: ["fr"],
  },
  {
    id: "ab7c61f5-3daa-47dd-a23b-4ac0aac5f5c3",
    name: "Friendly French Man",
    gender: "male",
    accent: "French",
    category: "conversational",
    languages: ["fr"],
  },

  // ─── Other Languages ───
  {
    id: "3f4ade23-6eb4-4279-ab05-6a144947c4d5",
    name: "German Conversational Woman",
    gender: "female",
    accent: "German",
    category: "conversational",
    languages: ["de"],
  },
];

// ── Supported languages (STT + Cartesia TTS overlap) ─────────────────────────

export const LANGUAGE_CATALOG: Language[] = [
  { code: "multi", label: "Multi-language (auto-detect)" },
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "pt", label: "Portuguese" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese" },
  { code: "ar", label: "Arabic" },
  { code: "it", label: "Italian" },
  { code: "nl", label: "Dutch" },
  { code: "ru", label: "Russian" },
  { code: "tr", label: "Turkish" },
  { code: "bn", label: "Bengali" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "gu", label: "Gujarati" },
  { code: "mr", label: "Marathi" },
  { code: "pa", label: "Punjabi" },
];

// ── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_VOICE_ID = "f786b574-daa5-4673-aa0c-cbe3e8534c02"; // Katie
export const DEFAULT_LANGUAGE = "en";

/**
 * Local preview clip for a catalog voice — a short sample synthesized with
 * sonic-3.5 (so the preview matches what the agent will actually sound like),
 * served as a static asset from `public/voice-previews/`. Every voice in
 * VOICE_CATALOG has one.
 */
export const voicePreviewUrl = (voiceId: string): string => `/voice-previews/${voiceId}.mp3`;

export const DEFAULT_VOICE_SPEED = 1.0;
export const MIN_VOICE_SPEED = 0.6;
export const MAX_VOICE_SPEED = 1.5;
export const VOICE_SPEED_STEP = 0.1;
