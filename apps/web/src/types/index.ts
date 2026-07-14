/** Domain types mirroring the Vaani platform API contract (PRD §8–9). */

export type AgentType = "simple" | "flow";
export type AgentStatus = "draft" | "active" | "archived";

export interface VoiceConfig {
  llm: string;
  stt: string;
  tts: string;
  voice: string;
  language: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  status: AgentStatus;
  folder: string | null;
  version: number;
  voice: VoiceConfig;
  phoneNumbers: string[];
  callsLast7d: number;
  avgQaScore: number | null;
  createdAt: string;
  updatedAt: string;
  systemPrompt?: string;
  greetingMessage?: string;
  agentSpeaksFirst?: boolean;
  /** Flow-agent graph (flow-type agents only). Opaque here; typed in flow-contract. */
  flowConfig?: Record<string, unknown> | null;
}

export type CallDirection = "inbound" | "outbound";
export type CallMode = "phone" | "web_test" | "widget" | "shared" | "chat";
export type CallStatus =
  | "in_progress"
  | "completed"
  | "failed"
  | "no_answer"
  | "voicemail";
export type Sentiment = "positive" | "neutral" | "negative";

export interface CallTurn {
  role: "agent" | "caller";
  text: string;
  atSec: number;
  latencyMs?: number;
}

export type CallEventType =
  | "call_started"
  | "transcript"
  | "tool_call"
  | "node_transition"
  | "interruption"
  | "latency_tick"
  | "transfer"
  | "call_ended";

export interface CallEvent {
  id: string;
  type: CallEventType;
  label: string;
  detail?: string;
  atSec: number;
  latencyMs?: number;
}

export interface CostBreakdown {
  stt: number;
  llm: number;
  tts: number;
  platform: number;
}

export interface QaTag {
  tag: string;
  evidence: string;
}

export interface Call {
  id: string;
  agentId: string;
  agentName: string;
  direction: CallDirection;
  mode: CallMode;
  from: string;
  to: string;
  status: CallStatus;
  startedAt: string;
  durationSecs: number;
  cost: number;
  costBreakdown: CostBreakdown;
  qaScore: number | null;
  sentiment: Sentiment;
  summary: string;
  latencyP50Ms: number;
  interruptions: number;
  structuredData: Record<string, string | number | boolean>;
  qaTags: QaTag[];
  turns: CallTurn[];
  events: CallEvent[];
  currentNode?: string;
}

export type CampaignStatus =
  | "draft"
  | "running"
  | "paused"
  | "completed"
  | "stopped";

export interface Campaign {
  id: string;
  name: string;
  agentId: string;
  agentName: string;
  status: CampaignStatus;
  callerNumber: string;
  concurrency: number;
  window: string;
  totalContacts: number;
  completed: number;
  failed: number;
  inProgress: number;
  goalMet: number;
  createdAt: string;
}

export type ContactStatus =
  | "pending"
  | "calling"
  | "completed"
  | "failed"
  | "retry_scheduled";

export interface CampaignContact {
  id: string;
  phone: string;
  name: string;
  status: ContactStatus;
  attempts: number;
  outcome?: string;
}

export type DocumentStatus = "processing" | "ready" | "failed";

export interface KbDocument {
  id: string;
  name: string;
  sizeKb: number;
  status: DocumentStatus;
  chunks: number;
  uploadedAt: string;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  documents: KbDocument[];
  boundAgents: number;
  updatedAt: string;
}

export interface ToolDef {
  id: string;
  name: string;
  description: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  authType: "none" | "api_key" | "bearer";
  timeoutMs: number;
  usedByAgents: number;
  updatedAt: string;
}

export interface Recording {
  id: string;
  slug: string;
  name: string;
  durationSecs: number;
  sizeKb: number;
  usedIn: string[];
  createdAt: string;
}

export interface PhoneNumber {
  id: string;
  e164: string;
  provider: "twilio" | "plivo" | "telnyx" | "vonage" | "exotel";
  capabilities: ("voice" | "sms")[];
  assignedAgentId: string | null;
  assignedAgentName: string | null;
  source: "purchased" | "imported";
  status: "active" | "verifying";
}

export type MemberRole =
  | "owner"
  | "admin"
  | "agent_builder"
  | "viewer";

export interface Member {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  status: "active" | "invited";
  joinedAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  at: string;
  type: "grant" | "deduction" | "topup";
  amount: number;
  balanceAfter: number;
  memo: string;
}

export interface TrendPoint {
  date: string;
  calls: number;
  minutes: number;
  cost: number;
  qaScore: number;
  successRate: number;
}

export interface AnalyticsSummary {
  totalCalls: number;
  totalMinutes: number;
  successRate: number;
  avgDurationSecs: number;
  totalCost: number;
  avgQaScore: number;
  sentiment: { positive: number; neutral: number; negative: number };
  trend: TrendPoint[];
  perAgent: {
    agentId: string;
    name: string;
    calls: number;
    avgQa: number;
    cost: number;
    successRate: number;
  }[];
  topTags: { tag: string; count: number }[];
}

export interface OrgCredits {
  balance: number;
  burnLast7d: number;
}

/* ── Flow designer ──
 * The flow-graph authoring contract (nodes, transitions, service overrides)
 * lives in `@/lib/flow-contract`, and the React Flow canvas model in
 * `@/lib/flow-transform`. Kept out of this shared domain-type module so the
 * designer's editor-only shapes don't leak into the rest of the app.
 */
