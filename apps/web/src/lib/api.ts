import {
  mockAgents,
  mockAnalytics,
  mockApiKeys,
  mockCalls,
  mockCampaigns,
  mockCredits,
  mockKbs,
  mockLedger,
  mockMembers,
  mockNumbers,
  mockRecordings,
  mockTools,
  buildCampaignContacts,
} from "@/lib/mock-data";
import type {
  Agent,
  AnalyticsSummary,
  ApiKey,
  Call,
  Campaign,
  CampaignContact,
  KnowledgeBase,
  LedgerEntry,
  Member,
  OrgCredits,
  PhoneNumber,
  Recording,
  ToolDef,
} from "@/types";

/**
 * Typed client for the Vaani platform API (PRD §9).
 *
 * Reads are issued from Server Components and go through `server-api`, which
 * forwards the request's auth cookie and resolves the caller's active org id
 * (no more hardcoded org). Mutations run in the browser, which already holds
 * the session cookie, and send the `Origin` header the backend requires for
 * state-changing calls.
 *
 * When `NEXT_PUBLIC_API_URL` is unset the read layer resolves to realistic
 * mock data so the dashboard works standalone; that is the ONLY case in which
 * mocks are used. Once the env var is set, real backend responses (and their
 * errors) flow through untouched.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL;

/* --------------------------------------------------------------------------
 * Reads — Server Components, cookie forwarded via server-api
 * ------------------------------------------------------------------------ */

/**
 * Read a list/object endpoint. Falls back to mock when the backend is
 * unconfigured OR when the endpoint isn't implemented yet (404), so pages for
 * not-yet-built domains degrade gracefully instead of crashing.
 */
async function get<T>(path: string, fallback: T): Promise<T> {
  if (!API_URL) return fallback;
  const { orgGet, OrgApiError } = await import("./server-api");
  try {
    return await orgGet<T>(path);
  } catch (err) {
    if (err instanceof OrgApiError && err.status === 404) return fallback;
    throw err;
  }
}

/**
 * Read a single resource that may not exist. A 404 resolves to `undefined`
 * (so callers can `notFound()`); any other error propagates. Falls back to the
 * provided mock only when the backend is unconfigured.
 */
async function getOptional<T>(
  path: string,
  fallback: T | undefined,
): Promise<T | undefined> {
  if (!API_URL) return fallback;
  const { orgGet, OrgApiError } = await import("./server-api");
  try {
    return await orgGet<T>(path);
  } catch (err) {
    if (err instanceof OrgApiError && err.status === 404) return undefined;
    throw err;
  }
}

/* --------------------------------------------------------------------------
 * Reads only. Client-side mutations live in `api-client.ts` (kept separate so
 * this server-only module never reaches the client bundle).
 * ------------------------------------------------------------------------ */

export const api = {
  // Reads (Server Components)
  getAgents: () => get<Agent[]>("/agents", mockAgents),
  getAgent: (id: string) =>
    getOptional<Agent>(
      `/agents/${id}`,
      mockAgents.find((a) => a.id === id),
    ),
  getCalls: () => get<Call[]>("/calls", mockCalls),
  getCall: (id: string) =>
    getOptional<Call>(
      `/calls/${id}`,
      mockCalls.find((c) => c.id === id),
    ),
  getCampaigns: () => get<Campaign[]>("/campaigns", mockCampaigns),
  getCampaign: (id: string) =>
    getOptional<Campaign>(
      `/campaigns/${id}`,
      mockCampaigns.find((c) => c.id === id),
    ),
  getCampaignContacts: (id: string) =>
    get<CampaignContact[]>(`/campaigns/${id}/contacts`, buildCampaignContacts(id)),
  getKnowledgeBases: () => get<KnowledgeBase[]>("/knowledge-bases", mockKbs),
  getTools: () => get<ToolDef[]>("/tools", mockTools),
  getRecordings: () => get<Recording[]>("/recordings", mockRecordings),
  getPhoneNumbers: () => get<PhoneNumber[]>("/telephony/numbers", mockNumbers),
  getMembers: () => get<Member[]>("/members", mockMembers),
  getApiKeys: () => get<ApiKey[]>("/api-keys", mockApiKeys),
  getLedger: () => get<LedgerEntry[]>("/credits/transactions", mockLedger),
  getCredits: () => get<OrgCredits>("/credits", mockCredits),
  getAnalytics: () => get<AnalyticsSummary>("/analytics/summary", mockAnalytics),
};
