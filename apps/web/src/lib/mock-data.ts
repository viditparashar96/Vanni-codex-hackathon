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
  TrendPoint,
} from "@/types";

/** Deterministic PRNG so server and client render identical mock data. */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const ORG = {
  id: "org_demo",
  name: "Acme Inc",
  plan: "Growth",
};

export const mockAgents: Agent[] = [
  {
    id: "agt_frontdesk",
    name: "Riya — Front Desk",
    description: "Answers the main line: appointments, directions, hours, triage to humans.",
    type: "simple",
    status: "active",
    folder: "Reception",
    version: 14,
    voice: { llm: "openai/gpt-4.1-mini", stt: "deepgram/nova-3", tts: "cartesia/sonic-2", voice: "Meera", language: "en-US" },
    phoneNumbers: ["+1 (415) 942-0184"],
    callsLast7d: 412,
    avgQaScore: 8.7,
    createdAt: "2026-04-02T09:12:00Z",
    updatedAt: "2026-07-12T17:40:00Z",
    systemPrompt:
      "You are Riya, the friendly front-desk voice for Acme Inc clinics. Keep sentences short and warm. You can book, reschedule and cancel appointments, give directions and opening hours, and transfer to a human for anything clinical. Never give medical advice.",
    greetingMessage: "Thanks for calling Acme Inc, this is Riya. How can I help you today?",
    agentSpeaksFirst: true,
  },
  {
    id: "agt_reminder",
    name: "Appointment Reminder",
    description: "Outbound reminders 48h before visits. Confirms, reschedules, or cancels.",
    type: "flow",
    status: "active",
    folder: "Outbound",
    version: 9,
    voice: { llm: "openai/gpt-4.1-mini", stt: "deepgram/nova-3", tts: "cartesia/sonic-2", voice: "Arjun", language: "en-US" },
    phoneNumbers: ["+1 (415) 942-0139"],
    callsLast7d: 1268,
    avgQaScore: 9.1,
    createdAt: "2026-04-18T14:02:00Z",
    updatedAt: "2026-07-13T09:15:00Z",
  },
  {
    id: "agt_refill",
    name: "Pharmacy Refill Line",
    description: "Verifies identity, checks refill status, sends SMS confirmations.",
    type: "flow",
    status: "active",
    folder: "Reception",
    version: 6,
    voice: { llm: "anthropic/claude-haiku-4-5", stt: "deepgram/nova-3", tts: "elevenlabs/turbo-v2", voice: "Devi", language: "en-US" },
    phoneNumbers: ["+1 (415) 942-0722"],
    callsLast7d: 233,
    avgQaScore: 8.2,
    createdAt: "2026-05-06T11:30:00Z",
    updatedAt: "2026-07-10T13:05:00Z",
  },
  {
    id: "agt_survey",
    name: "Post-Visit Survey",
    description: "Two-minute NPS + care-quality survey after discharge.",
    type: "simple",
    status: "active",
    folder: "Outbound",
    version: 3,
    voice: { llm: "google/gemini-2.5-flash", stt: "assemblyai/universal", tts: "cartesia/sonic-2", voice: "Meera", language: "en-US" },
    phoneNumbers: [],
    callsLast7d: 388,
    avgQaScore: 8.9,
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-07-08T16:44:00Z",
  },
  {
    id: "agt_qualifier",
    name: "New Patient Qualifier",
    description: "Qualifies web leads: insurance, location, urgency — then books intake.",
    type: "flow",
    status: "draft",
    folder: null,
    version: 2,
    voice: { llm: "openai/gpt-4.1", stt: "deepgram/nova-3", tts: "elevenlabs/turbo-v2", voice: "Kabir", language: "en-US" },
    phoneNumbers: [],
    callsLast7d: 41,
    avgQaScore: 7.4,
    createdAt: "2026-07-01T09:00:00Z",
    updatedAt: "2026-07-13T18:22:00Z",
  },
  {
    id: "agt_hindi",
    name: "Riya — Hindi Line",
    description: "Hindi-language front desk for the Fremont clinic.",
    type: "simple",
    status: "archived",
    folder: "Reception",
    version: 5,
    voice: { llm: "openai/gpt-4.1-mini", stt: "deepgram/nova-3", tts: "cartesia/sonic-2", voice: "Ananya", language: "hi-IN" },
    phoneNumbers: [],
    callsLast7d: 0,
    avgQaScore: 8.0,
    createdAt: "2026-05-20T08:30:00Z",
    updatedAt: "2026-06-28T12:00:00Z",
  },
];

const CALLER_NAMES = [
  "M. Okafor", "J. Alvarez", "P. Sharma", "T. Nguyen", "R. Castellanos",
  "A. Kowalski", "D. Kim", "S. Whitfield", "L. Ferreira", "N. Haddad",
];

const SUMMARIES = [
  "Caller confirmed Thursday 2:15 PM appointment with Dr. Iyer.",
  "Rescheduled annual physical from Jul 18 to Jul 24, 9:00 AM.",
  "Refill approved for lisinopril; SMS confirmation sent.",
  "Caller asked about weekend hours; provided Saturday 9–1 schedule.",
  "New patient qualified: PPO insurance, Fremont clinic, booked intake.",
  "Left voicemail reminder for tomorrow's 10:30 AM appointment.",
  "Caller requested human nurse; warm-transferred with summary.",
  "Survey completed — rated care 9/10, praised Dr. Chen's team.",
  "Insurance verification question escalated to billing queue.",
  "Cancelled Friday appointment; offered next-week alternatives.",
];

const QA_TAG_POOL = [
  "unanswered_question",
  "agent_interrupted_user",
  "caller_frustrated",
  "tool_failure",
  "wrong_language",
  "long_silence",
];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function buildCalls(): Call[] {
  const rnd = mulberry32(20260714);
  const calls: Call[] = [];
  const agents = mockAgents.filter((a) => a.status !== "archived");
  const modes: Call["mode"][] = ["phone", "phone", "phone", "web_test", "widget", "chat"];

  for (let i = 0; i < 48; i++) {
    const agent = agents[Math.floor(rnd() * agents.length)];
    const direction = agent.folder === "Outbound" ? "outbound" : rnd() > 0.3 ? "inbound" : "outbound";
    const mode = modes[Math.floor(rnd() * modes.length)];
    const dayOffset = Math.floor(rnd() * 14);
    const hour = 8 + Math.floor(rnd() * 10);
    const minute = Math.floor(rnd() * 60);
    const day = 14 - dayOffset;
    const startedAt = `2026-07-${pad(day > 0 ? day : 30 + day)}T${pad(hour)}:${pad(minute)}:00Z`;
    const statusRoll = rnd();
    const status: Call["status"] =
      i < 2 ? "in_progress" : statusRoll > 0.16 ? "completed" : statusRoll > 0.08 ? "no_answer" : statusRoll > 0.04 ? "voicemail" : "failed";
    const durationSecs = status === "completed" || status === "in_progress" ? 45 + Math.floor(rnd() * 280) : status === "voicemail" ? 32 : 0;
    const minutesBilled = durationSecs / 60;
    const stt = +(minutesBilled * 0.0059).toFixed(4);
    const llm = +(minutesBilled * 0.0102).toFixed(4);
    const tts = +(minutesBilled * 0.0213).toFixed(4);
    const platform = +(minutesBilled * 0.02).toFixed(4);
    const qa = status === "completed" ? +(6.5 + rnd() * 3.4).toFixed(1) : null;
    const sentimentRoll = rnd();
    const tagCount = qa !== null && qa < 7.6 ? 1 + Math.floor(rnd() * 2) : rnd() > 0.85 ? 1 : 0;

    calls.push({
      id: `call_${(9000 - i).toString(16)}${pad(i)}`,
      agentId: agent.id,
      agentName: agent.name,
      direction,
      mode,
      from: direction === "inbound" ? `+1 (${400 + Math.floor(rnd() * 199)}) ${100 + Math.floor(rnd() * 899)}-${1000 + Math.floor(rnd() * 8999)}` : agent.phoneNumbers[0] ?? "+1 (415) 942-0139",
      to: direction === "inbound" ? agent.phoneNumbers[0] ?? "+1 (415) 942-0184" : `+1 (${400 + Math.floor(rnd() * 199)}) ${100 + Math.floor(rnd() * 899)}-${1000 + Math.floor(rnd() * 8999)}`,
      status,
      startedAt,
      durationSecs,
      cost: +(stt + llm + tts + platform).toFixed(3),
      costBreakdown: { stt, llm, tts, platform },
      qaScore: qa,
      sentiment: sentimentRoll > 0.35 ? "positive" : sentimentRoll > 0.12 ? "neutral" : "negative",
      summary: status === "no_answer" ? "No answer after 28 seconds; retry scheduled." : SUMMARIES[Math.floor(rnd() * SUMMARIES.length)],
      latencyP50Ms: 680 + Math.floor(rnd() * 420),
      interruptions: Math.floor(rnd() * 4),
      structuredData:
        agent.id === "agt_reminder"
          ? { confirmed: rnd() > 0.3, patient: CALLER_NAMES[Math.floor(rnd() * CALLER_NAMES.length)], rescheduled: rnd() > 0.8 }
          : agent.id === "agt_qualifier"
            ? { insurance: rnd() > 0.5 ? "PPO" : "HMO", urgency: rnd() > 0.7 ? "high" : "routine", booked: rnd() > 0.4 }
            : {},
      qaTags: Array.from({ length: tagCount }, () => ({
        tag: QA_TAG_POOL[Math.floor(rnd() * QA_TAG_POOL.length)],
        evidence: "“I already told you my date of birth twice…”",
      })),
      turns: [],
      events: [],
      currentNode: status === "in_progress" ? (agent.type === "flow" ? "verify_identity" : undefined) : undefined,
    });
  }
  return calls.sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
}

export const mockCalls: Call[] = buildCalls();

/* Rich transcript + event timeline for the call-detail view. */
export const detailedTurns = [
  { role: "agent" as const, text: "Thanks for calling Acme Inc, this is Riya. How can I help you today?", atSec: 1 },
  { role: "caller" as const, text: "Hi, yeah — I need to move my appointment on Thursday. Something came up at work.", atSec: 7 },
  { role: "agent" as const, text: "Of course. Can I get your date of birth to pull up the booking?", atSec: 13, latencyMs: 740 },
  { role: "caller" as const, text: "March 9th, 1988.", atSec: 19 },
  { role: "agent" as const, text: "Found it — Thursday July 16th, 2:15 PM with Dr. Iyer. Would you like the next available slot?", atSec: 24, latencyMs: 910 },
  { role: "caller" as const, text: "Do you have anything Friday morning?", atSec: 31 },
  { role: "agent" as const, text: "Friday July 24th I have 9:00 AM or 11:30 AM with Dr. Iyer. Which works better?", atSec: 36, latencyMs: 1130 },
  { role: "caller" as const, text: "9 AM is perfect.", atSec: 43 },
  { role: "agent" as const, text: "Done — you're booked for Friday July 24th at 9:00 AM. I've sent a confirmation text. Anything else?", atSec: 47, latencyMs: 820 },
  { role: "caller" as const, text: "No, that's everything. Thanks!", atSec: 55 },
  { role: "agent" as const, text: "You're welcome. See you Friday — have a great day!", atSec: 58, latencyMs: 690 },
];

export const detailedEvents = [
  { id: "ev1", type: "call_started" as const, label: "Call connected", detail: "SIP → LiveKit room rm_8f2a", atSec: 0 },
  { id: "ev2", type: "latency_tick" as const, label: "Turn latency", detail: "voice-to-voice", atSec: 13, latencyMs: 740 },
  { id: "ev3", type: "tool_call" as const, label: "lookup_patient", detail: "GET /patients?dob=1988-03-09 → 200", atSec: 22, latencyMs: 480 },
  { id: "ev4", type: "tool_call" as const, label: "get_open_slots", detail: "GET /slots?provider=iyer&week=2026-07-20 → 200", atSec: 34, latencyMs: 620 },
  { id: "ev5", type: "interruption" as const, label: "Barge-in", detail: "Caller interrupted agent; TTS stopped in 240 ms", atSec: 41 },
  { id: "ev6", type: "tool_call" as const, label: "reschedule_appointment", detail: "POST /appointments/apt_5521/reschedule → 200", atSec: 45, latencyMs: 540 },
  { id: "ev7", type: "tool_call" as const, label: "send_sms", detail: "Confirmation to +1 (628) 555-0117 → queued", atSec: 49, latencyMs: 310 },
  { id: "ev8", type: "call_ended" as const, label: "Call completed", detail: "Caller hung up · 61s", atSec: 61 },
];

export const mockCampaigns: Campaign[] = [
  {
    id: "cmp_julyreminders",
    name: "July appointment reminders",
    agentId: "agt_reminder",
    agentName: "Appointment Reminder",
    status: "running",
    callerNumber: "+1 (415) 942-0139",
    concurrency: 8,
    window: "Mon–Sat · 9:00–18:00 PT",
    totalContacts: 1840,
    completed: 1211,
    failed: 86,
    inProgress: 8,
    goalMet: 1042,
    createdAt: "2026-07-01T08:00:00Z",
  },
  {
    id: "cmp_survey_q3",
    name: "Q3 post-visit survey",
    agentId: "agt_survey",
    agentName: "Post-Visit Survey",
    status: "running",
    callerNumber: "+1 (415) 942-0139",
    concurrency: 4,
    window: "Mon–Fri · 10:00–17:00 PT",
    totalContacts: 620,
    completed: 348,
    failed: 22,
    inProgress: 4,
    goalMet: 301,
    createdAt: "2026-07-06T09:30:00Z",
  },
  {
    id: "cmp_recall_dental",
    name: "Dental recall — 6 month",
    agentId: "agt_reminder",
    agentName: "Appointment Reminder",
    status: "paused",
    callerNumber: "+1 (415) 942-0722",
    concurrency: 6,
    window: "Mon–Fri · 9:00–17:00 PT",
    totalContacts: 940,
    completed: 412,
    failed: 61,
    inProgress: 0,
    goalMet: 296,
    createdAt: "2026-06-24T14:00:00Z",
  },
  {
    id: "cmp_flu_2025",
    name: "Flu shot outreach (archive)",
    agentId: "agt_reminder",
    agentName: "Appointment Reminder",
    status: "completed",
    callerNumber: "+1 (415) 942-0139",
    concurrency: 10,
    window: "Mon–Sat · 9:00–18:00 PT",
    totalContacts: 3200,
    completed: 3054,
    failed: 146,
    inProgress: 0,
    goalMet: 2311,
    createdAt: "2025-10-02T08:00:00Z",
  },
];

export function buildCampaignContacts(campaignId: string): CampaignContact[] {
  const rnd = mulberry32(campaignId.length * 7919);
  return Array.from({ length: 12 }, (_, i) => {
    const roll = rnd();
    const status: ContactStatusLocal =
      roll > 0.45 ? "completed" : roll > 0.3 ? "pending" : roll > 0.2 ? "retry_scheduled" : roll > 0.1 ? "calling" : "failed";
    return {
      id: `ct_${campaignId}_${i}`,
      phone: `+1 (${500 + Math.floor(rnd() * 99)}) ${200 + Math.floor(rnd() * 700)}-${1000 + Math.floor(rnd() * 8999)}`,
      name: CALLER_NAMES[Math.floor(rnd() * CALLER_NAMES.length)],
      status,
      attempts: status === "pending" ? 0 : 1 + Math.floor(rnd() * 2),
      outcome: status === "completed" ? (rnd() > 0.3 ? "Confirmed" : "Rescheduled") : status === "failed" ? "Max retries" : undefined,
    };
  });
}
type ContactStatusLocal = CampaignContact["status"];

export const mockKbs: KnowledgeBase[] = [
  {
    id: "kb_clinics",
    name: "Clinic handbook",
    description: "Locations, hours, parking, providers, insurance networks.",
    boundAgents: 3,
    updatedAt: "2026-07-11T10:20:00Z",
    documents: [
      { id: "doc_1", name: "locations-and-hours.pdf", sizeKb: 842, status: "ready", chunks: 214, uploadedAt: "2026-06-02T09:00:00Z" },
      { id: "doc_2", name: "insurance-networks-2026.docx", sizeKb: 1290, status: "ready", chunks: 388, uploadedAt: "2026-06-02T09:04:00Z" },
      { id: "doc_3", name: "provider-directory.pdf", sizeKb: 2110, status: "ready", chunks: 611, uploadedAt: "2026-06-15T11:30:00Z" },
      { id: "doc_4", name: "july-holiday-hours.md", sizeKb: 6, status: "processing", chunks: 0, uploadedAt: "2026-07-13T16:45:00Z" },
    ],
  },
  {
    id: "kb_pharmacy",
    name: "Pharmacy policies",
    description: "Refill rules, controlled-substance policy, insurance prior-auth.",
    boundAgents: 1,
    updatedAt: "2026-07-08T14:00:00Z",
    documents: [
      { id: "doc_5", name: "refill-policy.pdf", sizeKb: 310, status: "ready", chunks: 96, uploadedAt: "2026-05-06T12:00:00Z" },
      { id: "doc_6", name: "prior-auth-matrix.xlsx.pdf", sizeKb: 720, status: "failed", chunks: 0, uploadedAt: "2026-07-08T13:58:00Z" },
    ],
  },
  {
    id: "kb_faq",
    name: "Patient FAQ",
    description: "Top 200 patient questions with approved answers.",
    boundAgents: 2,
    updatedAt: "2026-06-20T09:10:00Z",
    documents: [
      { id: "doc_7", name: "patient-faq-approved.md", sizeKb: 148, status: "ready", chunks: 203, uploadedAt: "2026-06-20T09:10:00Z" },
    ],
  },
];

export const mockTools: ToolDef[] = [
  { id: "tool_lookup", name: "lookup_patient", description: "Find a patient record by phone or DOB.", method: "GET", url: "https://ehr.Acme.example/api/patients", authType: "bearer", timeoutMs: 4000, usedByAgents: 4, updatedAt: "2026-06-30T10:00:00Z" },
  { id: "tool_slots", name: "get_open_slots", description: "List open appointment slots for a provider and week.", method: "GET", url: "https://ehr.Acme.example/api/slots", authType: "bearer", timeoutMs: 5000, usedByAgents: 3, updatedAt: "2026-06-30T10:02:00Z" },
  { id: "tool_book", name: "book_appointment", description: "Book, reschedule or cancel an appointment.", method: "POST", url: "https://ehr.Acme.example/api/appointments", authType: "bearer", timeoutMs: 6000, usedByAgents: 3, updatedAt: "2026-07-02T15:30:00Z" },
  { id: "tool_refill", name: "check_refill_status", description: "Check pharmacy refill eligibility and status.", method: "GET", url: "https://rx.Acme.example/api/refills", authType: "api_key", timeoutMs: 4000, usedByAgents: 1, updatedAt: "2026-05-06T12:20:00Z" },
  { id: "tool_ticket", name: "create_ticket", description: "Open a billing or admin ticket in the helpdesk.", method: "POST", url: "https://desk.Acme.example/api/tickets", authType: "api_key", timeoutMs: 5000, usedByAgents: 2, updatedAt: "2026-06-11T09:00:00Z" },
];

export const mockRecordings: Recording[] = [
  { id: "rec_greeting", slug: "clinic-greeting", name: "Branded greeting (Meera, studio)", durationSecs: 6, sizeKb: 96, usedIn: ["Riya — Front Desk"], createdAt: "2026-05-12T10:00:00Z" },
  { id: "rec_hipaa", slug: "hipaa-disclaimer", name: "HIPAA recording disclaimer", durationSecs: 11, sizeKb: 172, usedIn: ["Riya — Front Desk", "Pharmacy Refill Line"], createdAt: "2026-05-12T10:05:00Z" },
  { id: "rec_hold", slug: "hold-music", name: "Hold loop — warm keys", durationSecs: 42, sizeKb: 660, usedIn: [], createdAt: "2026-06-01T09:00:00Z" },
  { id: "rec_goodbye", slug: "goodbye", name: "Goodbye sign-off", durationSecs: 4, sizeKb: 64, usedIn: ["Appointment Reminder"], createdAt: "2026-06-18T13:30:00Z" },
];

export const mockNumbers: PhoneNumber[] = [
  { id: "num_1", e164: "+1 (415) 942-0184", provider: "twilio", capabilities: ["voice", "sms"], assignedAgentId: "agt_frontdesk", assignedAgentName: "Riya — Front Desk", source: "imported", status: "active" },
  { id: "num_2", e164: "+1 (415) 942-0139", provider: "plivo", capabilities: ["voice", "sms"], assignedAgentId: "agt_reminder", assignedAgentName: "Appointment Reminder", source: "purchased", status: "active" },
  { id: "num_3", e164: "+1 (415) 942-0722", provider: "plivo", capabilities: ["voice"], assignedAgentId: "agt_refill", assignedAgentName: "Pharmacy Refill Line", source: "purchased", status: "active" },
  { id: "num_4", e164: "+1 (510) 833-4410", provider: "twilio", capabilities: ["voice", "sms"], assignedAgentId: null, assignedAgentName: null, source: "imported", status: "verifying" },
];

export const mockMembers: Member[] = [
  { id: "mem_1", name: "Demo Founder", email: "founder@acme.example", role: "owner", status: "active", joinedAt: "2026-04-01T08:00:00Z" },
  { id: "mem_2", name: "Grace Obi", email: "grace@acme.example", role: "admin", status: "active", joinedAt: "2026-04-03T10:00:00Z" },
  { id: "mem_3", name: "Marcus Lee", email: "marcus@acme.example", role: "agent_builder", status: "active", joinedAt: "2026-04-20T09:30:00Z" },
  { id: "mem_4", name: "Priya Raman", email: "priya@acme.example", role: "agent_builder", status: "active", joinedAt: "2026-05-11T14:00:00Z" },
  { id: "mem_5", name: "Dana Whitcomb", email: "dana.w@acme.example", role: "viewer", status: "invited", joinedAt: "2026-07-10T16:00:00Z" },
];

export const mockApiKeys: ApiKey[] = [
  { id: "key_1", name: "Production — EHR bridge", prefix: "vaa_live_8f2k", scopes: ["agents:read", "calls:read", "calls:write"], lastUsedAt: "2026-07-14T07:58:00Z", createdAt: "2026-05-01T09:00:00Z" },
  { id: "key_2", name: "Staging", prefix: "vaa_test_m3q9", scopes: ["*"], lastUsedAt: "2026-07-12T22:10:00Z", createdAt: "2026-05-01T09:02:00Z" },
  { id: "key_3", name: "Zapier (revoked)", prefix: "vaa_live_p0x2", scopes: ["calls:read"], lastUsedAt: "2026-06-02T11:00:00Z", createdAt: "2026-05-15T10:00:00Z" },
];

export const mockLedger: LedgerEntry[] = [
  { id: "led_1", at: "2026-07-14T06:00:00Z", type: "deduction", amount: -14.62, balanceAfter: 262.41, memo: "1,112 call-minutes · Jul 13" },
  { id: "led_2", at: "2026-07-13T06:00:00Z", type: "deduction", amount: -16.08, balanceAfter: 277.03, memo: "1,214 call-minutes · Jul 12" },
  { id: "led_3", at: "2026-07-12T06:00:00Z", type: "deduction", amount: -12.9, balanceAfter: 293.11, memo: "987 call-minutes · Jul 11" },
  { id: "led_4", at: "2026-07-10T15:22:00Z", type: "topup", amount: 250, balanceAfter: 306.01, memo: "Invoice INV-2026-0710 · manual top-up" },
  { id: "led_5", at: "2026-07-10T06:00:00Z", type: "deduction", amount: -15.44, balanceAfter: 56.01, memo: "1,163 call-minutes · Jul 9" },
  { id: "led_6", at: "2026-07-09T06:00:00Z", type: "deduction", amount: -13.7, balanceAfter: 71.45, memo: "1,048 call-minutes · Jul 8" },
  { id: "led_7", at: "2026-07-08T06:00:00Z", type: "deduction", amount: -11.98, balanceAfter: 85.15, memo: "902 call-minutes · Jul 7" },
  { id: "led_8", at: "2026-07-07T06:00:00Z", type: "deduction", amount: -9.86, balanceAfter: 97.13, memo: "741 call-minutes · Jul 6" },
  { id: "led_9", at: "2026-06-30T09:00:00Z", type: "grant", amount: 25, balanceAfter: 107, memo: "Service credit — June incident" },
  { id: "led_10", at: "2026-06-28T15:00:00Z", type: "topup", amount: 100, balanceAfter: 82, memo: "Invoice INV-2026-0628 · manual top-up" },
];

export const mockCredits: OrgCredits = { balance: 262.41, burnLast7d: 94.58 };

function buildTrend(): TrendPoint[] {
  const rnd = mulberry32(42);
  const points: TrendPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const day = new Date(Date.UTC(2026, 6, 14));
    day.setUTCDate(day.getUTCDate() - i);
    const weekday = day.getUTCDay();
    const weekendDip = weekday === 0 ? 0.25 : weekday === 6 ? 0.55 : 1;
    const growth = 1 + (29 - i) * 0.012;
    const calls = Math.round((260 + rnd() * 90) * weekendDip * growth);
    const minutes = Math.round(calls * (2.4 + rnd() * 0.8));
    points.push({
      date: `${day.getUTCMonth() + 1}/${day.getUTCDate()}`,
      calls,
      minutes,
      cost: +(minutes * 0.0135).toFixed(2),
      qaScore: +(8.1 + rnd() * 1.2 - (weekday === 1 ? 0.4 : 0)).toFixed(1),
      successRate: +(96 + rnd() * 3.6).toFixed(1),
    });
  }
  return points;
}

export const mockAnalytics: AnalyticsSummary = {
  totalCalls: 8412,
  totalMinutes: 23608,
  successRate: 97.8,
  avgDurationSecs: 168,
  totalCost: 318.7,
  avgQaScore: 8.6,
  sentiment: { positive: 61, neutral: 31, negative: 8 },
  trend: buildTrend(),
  perAgent: [
    { agentId: "agt_reminder", name: "Appointment Reminder", calls: 4211, avgQa: 9.1, cost: 121.4, successRate: 98.9 },
    { agentId: "agt_frontdesk", name: "Riya — Front Desk", calls: 2418, avgQa: 8.7, cost: 98.2, successRate: 97.4 },
    { agentId: "agt_survey", name: "Post-Visit Survey", calls: 1119, avgQa: 8.9, cost: 41.3, successRate: 98.1 },
    { agentId: "agt_refill", name: "Pharmacy Refill Line", calls: 623, avgQa: 8.2, cost: 48.6, successRate: 95.2 },
    { agentId: "agt_qualifier", name: "New Patient Qualifier", calls: 41, avgQa: 7.4, cost: 9.2, successRate: 91.8 },
  ],
  topTags: [
    { tag: "unanswered_question", count: 84 },
    { tag: "long_silence", count: 61 },
    { tag: "caller_frustrated", count: 43 },
    { tag: "agent_interrupted_user", count: 37 },
    { tag: "tool_failure", count: 21 },
    { tag: "wrong_language", count: 9 },
  ],
};
