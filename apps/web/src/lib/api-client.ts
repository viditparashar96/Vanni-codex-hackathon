"use client";

import type { Agent, AgentStatus, AgentType, ApiKey, VoiceConfig } from "@/types";

/**
 * Client-side mutations for the Vaani platform API.
 *
 * Runs in the browser, which already holds the session cookie, and sends the
 * `Origin` header the backend requires for state-changing calls. This module is
 * safe to import from Client Components — it never touches server-only code
 * (that lives in `server-api.ts`, used by the read layer in `api.ts`).
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const clientBase = (): string => API_URL ?? "";

/**
 * Resolve the active org id in the browser. Memoized in a module promise so
 * repeated mutations don't re-list orgs; the cache clears on failure so a
 * later call can retry.
 */
let activeOrgIdPromise: Promise<string> | null = null;
function resolveOrgId(): Promise<string> {
  if (!activeOrgIdPromise) {
    activeOrgIdPromise = (async () => {
      const res = await fetch(`${clientBase()}/api/auth/organization/list`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        throw new Error(`Failed to resolve active organization (${res.status})`);
      }
      const orgs = (await res.json().catch(() => null)) as Array<{ id: string }> | null;
      const first = Array.isArray(orgs) ? orgs[0] : null;
      if (!first?.id) throw new Error("No organization found for this session");
      return first.id;
    })();
    activeOrgIdPromise.catch(() => {
      activeOrgIdPromise = null;
    });
  }
  return activeOrgIdPromise;
}

async function mutate<T>(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> {
  const orgId = await resolveOrgId();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (typeof window !== "undefined") headers.Origin = window.location.origin;

  const res = await fetch(`${clientBase()}/api/orgs/${orgId}${path}`, {
    method,
    credentials: "include",
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = `Request failed (${res.status})`;
    try {
      const json = JSON.parse(text) as { error?: string; message?: string };
      message = json.error ?? json.message ?? message;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export interface CreateAgentPayload {
  name: string;
  description?: string;
  type?: AgentType;
  systemPrompt?: string;
  greetingMessage?: string;
  agentSpeaksFirst?: boolean;
  voice?: VoiceConfig;
  /** Flow-agent starter graph (validated server-side). Stored as version 1. */
  flowConfig?: Record<string, unknown>;
}

/** Metadata-only patch (name / description / tags / status). */
export interface UpdateAgentMetadata {
  name?: string;
  description?: string | null;
  tags?: string[];
  status?: AgentStatus;
}

/* --------------------------------------------------------------------------
 * Version config payloads.
 *
 * Editing an agent's behaviour is versioned: each save mints a new immutable
 * version carrying the config blocks below. These mirror the backend's
 * per-block schemas — kept as a local, dependency-free shape so this client
 * doesn't reach into server packages.
 * ------------------------------------------------------------------------ */

export type ResponseLength = "concise" | "balanced" | "verbose";

export interface PersonaConfigPayload {
  systemPrompt: string;
  agentSpeaksFirst: boolean;
  greetingMessage?: string;
  personalityTraits?: string[];
  responseLengthPreference?: ResponseLength;
}

export interface RealtimeConfigPayload {
  enabled: boolean;
  provider?: string;
  model?: string;
  voice?: string;
}

export interface VoiceConfigPayload {
  llmProvider: string;
  llmModel: string;
  sttProvider: string;
  sttModel: string;
  ttsProvider: string;
  ttsModel?: string;
  ttsVoice?: string;
  language: string;
  voiceSpeed?: number;
  realtime?: RealtimeConfigPayload;
}

export interface AdvancedConfigPayload {
  maxCallDurationSecs?: number;
  inactivityTimeoutSecs?: number;
  silenceDuringIntro?: boolean;
  silenceWhenAgentSpeaks?: boolean;
  vad?: { stopSecs?: number };
  backgroundNoise?: { enabled: boolean; sound?: "office" | "call_center" | "cafe" };
  goodbyeMessage?: string;
  voicemail?: { enabled: boolean };
  ivrNavigation?: { enabled: boolean };
}

export interface ToolConfigPayload {
  id: string;
  name: string;
  description: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  parameters?: Record<string, unknown>;
  auth?: { type: "none" | "api_key" | "bearer" };
  timeoutMs?: number;
}

export interface KnowledgeBaseBindingPayload {
  knowledgeBaseId: string;
  chunksToRetrieve?: number;
  similarityThreshold?: number;
}

/** Payload that mints a new agent version snapshotting the editor state. */
export interface AgentVersionPayload {
  label?: string;
  personaConfig?: PersonaConfigPayload;
  voiceConfig?: VoiceConfigPayload;
  advancedConfig?: AdvancedConfigPayload;
  toolsConfig?: ToolConfigPayload[];
  knowledgeBaseBindings?: KnowledgeBaseBindingPayload[];
  /**
   * Full flow-agent graph. Sent as an opaque object (the server validates it
   * against the shared FlowConfig schema) so this client stays free of the
   * server package.
   */
  flowConfig?: Record<string, unknown>;
}

/** Result of the live flow-validation endpoint. */
export interface FlowValidationResult {
  valid: boolean;
  errors: string[];
}

/** An immutable agent version as returned by the create-version endpoint. */
export interface AgentVersion {
  id: string;
  versionNumber: number;
  [key: string]: unknown;
}

export interface TestSession {
  callId: string;
  engineOfferUrl: string;
}

/** Browser-side mutation methods. Import this from Client Components. */
export const api = {
  createAgent: ({ flowConfig, ...payload }: CreateAgentPayload) =>
    // The API reads a flow graph from `version.flowConfig`; nest it there.
    mutate<Agent>("/agents", "POST", flowConfig ? { ...payload, version: { flowConfig } } : payload),
  /** Patch agent metadata (name / description / tags / status). */
  updateAgentMetadata: (id: string, patch: UpdateAgentMetadata) =>
    mutate<Agent>(`/agents/${id}`, "PATCH", patch),
  /**
   * Save the editor state by minting a new immutable version. Returns the
   * created version so the caller can publish it with {@link publishAgent}.
   */
  updateAgent: (id: string, payload: AgentVersionPayload) =>
    mutate<{ version: AgentVersion }>(`/agents/${id}/versions`, "POST", payload).then(
      (r) => r.version,
    ),
  /**
   * Persist a flow-agent graph by minting a new version carrying `flowConfig`.
   * The server re-validates the graph and rejects (400) an invalid one.
   */
  saveFlow: (id: string, flowConfig: Record<string, unknown>, label?: string) =>
    mutate<{ version: AgentVersion }>(`/agents/${id}/versions`, "POST", {
      flowConfig,
      label,
    }).then((r) => r.version),
  /**
   * Validate a flow graph without persisting, for the live editor. Returns the
   * backend's `{ valid, errors }` verdict.
   */
  validateFlow: (id: string, flowConfig: Record<string, unknown>) =>
    mutate<FlowValidationResult>(`/agents/${id}/validate-flow`, "POST", flowConfig),
  publishAgent: (id: string, versionId: string) =>
    mutate<Agent>(`/agents/${id}/publish`, "POST", { versionId }),
  archiveAgent: (id: string) => mutate<Agent>(`/agents/${id}/archive`, "POST", {}),
  deleteAgent: (id: string) =>
    mutate<{ ok: boolean; id: string }>(`/agents/${id}`, "DELETE"),
  createTestSession: (agentId: string) =>
    mutate<TestSession>(`/calls/${agentId}/test-session`, "POST", {}),
  /** Returns the raw key exactly once — it is never retrievable again. */
  createApiKey: (name: string) =>
    mutate<ApiKey & { key: string }>(`/api-keys`, "POST", { name }),
  revokeApiKey: (keyId: string) =>
    mutate<{ revoked: boolean; id: string }>(`/api-keys/${keyId}`, "DELETE"),
};
