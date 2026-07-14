/**
 * LLM model catalog — shared across the agent builder, the flow editor,
 * and per-node model overrides.
 *
 * Each model entry carries its provider so we can derive `llmProvider`
 * automatically from whichever model the user selects.
 *
 * Provider notes:
 *   - openai     — Broadest tooling compatibility. Default.
 *   - anthropic  — Strong instruction following.
 *   - google     — Cheap & fast. Uses an OpenAI-compatible shim under the hood.
 *   - groq       — Lowest latency. Consumer tier only — see `compliance`.
 */

export type LLMProvider = "openai" | "anthropic" | "google" | "groq";

export interface LLMModel {
  value: string; // Model ID sent to the API
  label: string; // Display name
  provider: LLMProvider;
  description?: string;
  /** True if the provider offers an enterprise compliance tier. UI gates on this. */
  compliance?: boolean;
}

export interface LLMProviderGroup {
  provider: LLMProvider;
  label: string;
  compliance: boolean;
  models: LLMModel[];
}

export const LLM_PROVIDER_GROUPS: LLMProviderGroup[] = [
  {
    provider: "openai",
    label: "OpenAI",
    compliance: true,
    models: [
      { value: "gpt-5.6-luna", label: "GPT-5.6 Luna", provider: "openai", description: "Fast reasoning · 1M ctx", compliance: true },
      { value: "gpt-4.1", label: "GPT-4.1", provider: "openai", description: "Flagship", compliance: true },
      { value: "gpt-4.1-mini", label: "GPT-4.1 Mini", provider: "openai", description: "Balanced", compliance: true },
      { value: "gpt-4.1-nano", label: "GPT-4.1 Nano", provider: "openai", description: "Fastest", compliance: true },
      { value: "gpt-4o", label: "GPT-4o", provider: "openai", description: "Reasoning", compliance: true },
      { value: "gpt-4o-mini", label: "GPT-4o Mini", provider: "openai", description: "Fast", compliance: true },
    ],
  },
  {
    provider: "anthropic",
    label: "Anthropic",
    compliance: true,
    models: [
      {
        value: "claude-3-5-sonnet-20241022",
        label: "Claude 3.5 Sonnet",
        provider: "anthropic",
        description: "Reasoning",
        compliance: true,
      },
      {
        value: "claude-3-5-haiku-20241022",
        label: "Claude 3.5 Haiku",
        provider: "anthropic",
        description: "Fast",
        compliance: true,
      },
      {
        value: "claude-3-opus-20240229",
        label: "Claude 3 Opus",
        provider: "anthropic",
        description: "Highest quality",
        compliance: true,
      },
    ],
  },
  {
    provider: "google",
    label: "Google Gemini",
    compliance: true,
    models: [
      {
        value: "gemini-2.5-flash",
        label: "Gemini 2.5 Flash",
        provider: "google",
        description: "Fast, cheap",
        compliance: true,
      },
      {
        value: "gemini-2.0-flash",
        label: "Gemini 2.0 Flash",
        provider: "google",
        description: "Stable",
        compliance: true,
      },
      {
        value: "gemini-2.5-pro",
        label: "Gemini 2.5 Pro",
        provider: "google",
        description: "Reasoning",
        compliance: true,
      },
    ],
  },
  {
    provider: "groq",
    label: "Groq",
    compliance: false,
    models: [
      { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", provider: "groq", description: "Versatile" },
      { value: "openai/gpt-oss-20b", label: "GPT-OSS 20B", provider: "groq", description: "Fast" },
      { value: "openai/gpt-oss-120b", label: "GPT-OSS 120B", provider: "groq", description: "Quality" },
      { value: "qwen/qwen3-32b", label: "Qwen3 32B", provider: "groq", description: "Reasoning" },
      {
        value: "meta-llama/llama-4-scout-17b-16e-instruct",
        label: "Llama 4 Scout 17B",
        provider: "groq",
        description: "Latest",
      },
      { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B", provider: "groq", description: "Ultra-fast" },
    ],
  },
];

/** Flat list of all models. */
export const ALL_LLM_MODELS: LLMModel[] = LLM_PROVIDER_GROUPS.flatMap((g) => g.models);

/** Look up the provider from a model ID. */
export function getProviderForModel(modelValue: string): LLMProvider {
  const model = ALL_LLM_MODELS.find((m) => m.value === modelValue);
  return model?.provider || "openai";
}

/** Defaults. */
export const DEFAULT_LLM_MODEL = "gpt-4.1-mini";
export const DEFAULT_LLM_PROVIDER: LLMProvider = "openai";
