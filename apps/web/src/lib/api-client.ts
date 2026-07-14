"use client";

import type { Agent, AgentStatus, AgentType, VoiceConfig } from "@/types";

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
}

export interface UpdateAgentPatch {
  name?: string;
  description?: string;
  tags?: string[];
  status?: AgentStatus;
}

export interface TestSession {
  callId: string;
  engineOfferUrl: string;
}

/** Browser-side mutation methods. Import this from Client Components. */
export const api = {
  createAgent: (payload: CreateAgentPayload) => mutate<Agent>("/agents", "POST", payload),
  updateAgent: (id: string, patch: UpdateAgentPatch) =>
    mutate<Agent>(`/agents/${id}`, "PATCH", patch),
  publishAgent: (id: string, versionId: string) =>
    mutate<Agent>(`/agents/${id}/publish`, "POST", { versionId }),
  archiveAgent: (id: string) => mutate<Agent>(`/agents/${id}/archive`, "POST", {}),
  deleteAgent: (id: string) =>
    mutate<{ ok: boolean; id: string }>(`/agents/${id}`, "DELETE"),
  createTestSession: (agentId: string) =>
    mutate<TestSession>(`/calls/${agentId}/test-session`, "POST", {}),
};
