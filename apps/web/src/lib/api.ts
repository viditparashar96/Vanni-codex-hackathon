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
  ORG,
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
 * When NEXT_PUBLIC_API_URL is set, requests hit the real backend
 * (`/api/orgs/:orgId/…`, cookie auth). When it's unset or the request
 * fails, each call resolves to realistic mock data so every screen
 * works standalone. Integration is a env-var flip, not a rewrite.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function get<T>(path: string, fallback: T): Promise<T> {
  if (!API_URL) return fallback;
  try {
    const res = await fetch(`${API_URL}/api/orgs/${ORG.id}${path}`, {
      credentials: "include",
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export const api = {
  getAgents: () => get<Agent[]>("/agents", mockAgents),
  getAgent: async (id: string) =>
    get<Agent | undefined>(
      `/agents/${id}`,
      mockAgents.find((a) => a.id === id),
    ),
  getCalls: () => get<Call[]>("/calls", mockCalls),
  getCall: async (id: string) =>
    get<Call | undefined>(
      `/calls/${id}`,
      mockCalls.find((c) => c.id === id),
    ),
  getCampaigns: () => get<Campaign[]>("/campaigns", mockCampaigns),
  getCampaign: async (id: string) =>
    get<Campaign | undefined>(
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
