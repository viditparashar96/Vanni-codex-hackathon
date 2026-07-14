# Vaani — Voice AI Platform

## Product Requirements Document


|             |                                                               |
| ----------- | ------------------------------------------------------------- |
| **Product** | Vaani — Multi-tenant Voice AI Agent Platform & Infrastructure |
| **Version** | 1.0                                                           |
| **Date**    | 14 July 2026                                                  |
| **Status**  | Draft for engineering review                                  |
| **Owner**   | Product Team                                                  |


---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Goals, Non-Goals & Success Metrics](#2-goals-non-goals--success-metrics)
3. [Users, Personas & Roles](#3-users-personas--roles)
4. [System Architecture](#4-system-architecture)
5. [Monorepo & Directory Structure](#5-monorepo--directory-structure)
6. [Feature Modules](#6-feature-modules)
  - 6.1 Authentication, Organizations & RBAC
  - 6.2 Agent Builder — Simple Agents
  - 6.3 Agent Builder — Flow Agents & Visual Flow Designer
  - 6.4 Voice Stack (LLM / STT / TTS / Realtime)
  - 6.5 Tools & Function Calling
  - 6.6 Knowledge Bases (RAG)
  - 6.7 Telephony
  - 6.8 Web Testing & Share Links
  - 6.9 Embeddable Widget (Voice + Chat)
  - 6.10 Campaigns (Outbound at Scale)
  - 6.11 Call Management, Live Monitoring & History
  - 6.12 Post-Call Intelligence (Summaries, Structured Data, QA Tagging)
  - 6.13 Audio Recordings Library
  - 6.14 Analytics & Reporting
  - 6.15 Credits, Billing & Usage Metering
  - 6.16 AI Composer (Copilot Agent Builder)
  - 6.17 Public API, API Keys & MCP Server
  - 6.18 Webhooks
  - 6.19 Workspace Organization (Folders, Global Search)
7. [Voice Engine — Detailed Design](#7-voice-engine--detailed-design)
8. [Data Model](#8-data-model)
9. [API Surface](#9-api-surface)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [Security & Compliance](#11-security--compliance)
12. [Deployment & Operations](#12-deployment--operations)
13. [Delivery Roadmap](#13-delivery-roadmap)
14. [Risks & Open Questions](#14-risks--open-questions)
15. [Appendices](#15-appendices)

---

## 1. Executive Summary

### 1.1 Product Vision

Vaani is a self-hostable, multi-tenant **Voice AI infrastructure platform**. It lets organizations design, test, deploy, and operate production-grade AI voice agents — over the phone, on the web, and embedded in their own products — **without writing code**, while giving developers a complete API, webhook, and MCP surface for programmatic control.

The platform owns the entire lifecycle of a voice agent:

- **Build** — a no-code Agent Builder for single-prompt agents and a visual Flow Designer for multi-stage, branching conversations; plus an AI Composer copilot that drafts complete agents from a plain-language brief.
- **Ground** — knowledge bases (RAG), custom HTTP tools, pre-call data fetch, and variable injection so agents act on the customer's real data.
- **Connect** — a carrier-agnostic telephony layer (buy numbers or bring your own from any supported carrier), a browser test console, and an embeddable web widget with voice and text chat.
- **Operate** — outbound campaigns, live call monitoring, full call history with synchronized transcripts and recordings, automatic QA scoring, structured data extraction, analytics, webhooks, and prepaid usage-based billing.

The differentiator is **ownership of the stack**: every component — media plane (self-hostable SFU), voice pipeline, platform API, dashboard — can run inside the customer's own trust boundary, which makes the platform viable for regulated verticals (healthcare/HIPAA, finance, telecom) that cannot ship call audio to third-party SaaS.

### 1.2 Problem Statement

Teams that want AI voice agents today face a bad trade-off:

1. **Managed voice-agent SaaS** (fast to start, but per-minute pricing compounds, call audio leaves the customer's boundary, provider/carrier lock-in, limited compliance posture).
2. **DIY on open-source frameworks** (full control, but months of engineering: transports, barge-in, telephony webhooks, multi-tenancy, billing, monitoring — none of it product work).

Vaani closes the gap: an opinionated, complete platform with the operational surface of managed SaaS and the deployability and provider-neutrality of DIY.

### 1.3 Key Objectives


| #   | Objective                                                    | Measure                                                                        |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| O1  | Non-technical operator builds and test-calls a working agent | < 10 minutes from signup, no code                                              |
| O2  | Production-grade conversational latency                      | < 1.0 s voice-to-voice p50, < 1.5 s p95                                        |
| O3  | Carrier-agnostic telephony                                   | ≥ 2 carriers production-ready at GA; adapters are config, not new media paths  |
| O4  | Full-fidelity operations                                     | Every call: transcript, recording, metrics, QA score, structured data, webhook |
| O5  | Self-hostable                                                | Single Docker Compose for dev; Helm chart for production Kubernetes            |
| O6  | Monetizable from day one                                     | Prepaid credits, per-minute metering, provider-cost passthrough + platform fee |


### 1.4 Tech Stack Summary


| Layer             | Technology                                                                               |
| ----------------- | ---------------------------------------------------------------------------------------- |
| Dashboard         | Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, React Flow             |
| Platform API      | Node.js, Express, TypeScript, Zod validation                                             |
| ORM / Database    | Drizzle ORM, PostgreSQL 16                                                               |
| Cache / Queues    | Redis 7, BullMQ (workers), Redis pub/sub (cross-instance cache sync)                     |
| Voice Engine      | Python 3.12, FastAPI, Pipecat + Pipecat Flows, uv for dependency management              |
| Media Plane       | LiveKit (WebRTC SFU + SIP bridge) — cloud or self-hosted; Daily as secondary transport   |
| Vector Store      | Qdrant (KB embeddings) + in-process FAISS semantic cache                                 |
| Auth              | Better Auth (cookie sessions, org plugin, invitations), API keys for programmatic access |
| Object Storage    | Azure Blob Storage behind a storage-provider abstraction (S3-compatible pluggable)       |
| Embeddable Widget | Framework-free TypeScript bundle (Vite, single JS file)                                  |
| Docs              | Mintlify (guides + OpenAPI-driven API reference)                                         |
| Packaging         | pnpm workspaces + Turborepo monorepo; Docker per deployable; Helm + KEDA for k8s         |


---

## 2. Goals, Non-Goals & Success Metrics

### 2.1 In Scope (this PRD)

- Multi-tenant platform: organizations, members, roles, invitations
- Two agent types (simple prompt-driven; flow graph-driven) with full versioning
- Voice stack with pluggable LLM/STT/TTS providers, realtime speech-to-speech mode, and BYO provider keys
- Telephony: number marketplace, BYON, inbound routing, outbound API, transfers, DTMF, SMS, voicemail detection, automated IVR navigation
- Web test console, tokenized public test links, embeddable voice/chat widget
- Knowledge bases with document ingestion and low-latency RAG
- Custom HTTP tools + built-in call-control tools
- Outbound campaigns with contact lists and lifecycle controls
- Live call monitoring, call history, recordings, post-call intelligence (summary, sentiment, structured extraction, QA tags)
- Analytics dashboards and CSV export
- Prepaid credits with per-call cost computation
- AI Composer copilot (propose-then-apply agent building with web research and file ingestion)
- Public REST API, API keys, MCP server, webhooks
- Deployment tooling: Docker Compose, Helm/KEDA, self-hosted media-plane bring-up

### 2.2 Non-Goals (v1)

- Native mobile SDKs (widget covers web; mobile SDKs are post-GA)
- Video agents / avatars
- Marketplace of pre-built third-party agents
- Automations / workflow builder beyond webhooks (nav entry ships as "coming soon")
- Self-serve card payments for credit top-ups (manual/invoice top-up at launch; PSP integration fast-follows)
- Voice cloning / custom voice training (use provider voice libraries)

### 2.3 Success Metrics


| Metric                                            | Target (GA + 90 days)                    |
| ------------------------------------------------- | ---------------------------------------- |
| Time-to-first-test-call (median, new org)         | < 10 min                                 |
| Voice-to-voice latency p50 / p95                  | < 1.0 s / < 1.5 s                        |
| Call setup success rate (dispatch → agent speaks) | > 99.5%                                  |
| End-of-call report delivery                       | 100% (mandatory, even on pipeline error) |
| Platform uptime (API + media)                     | 99.9%                                    |
| Concurrent calls per pipeline node (load-tested)  | Documented ceiling per instance size     |
| % of calls with QA score attached                 | > 95% of calls with transcript           |


---

## 3. Users, Personas & Roles

### 3.1 Personas

**Persona 1 — Operations lead at a clinic chain (buyer + builder).** Non-technical. Wants appointment reminder and reception agents. Uses the Composer and Agent Builder UI end-to-end; never opens the API docs. Cares about: easy building, call quality, compliance, per-call cost visibility.

**Persona 2 — Platform engineer at a health-tech ISV (integrator).** Embeds Vaani into their product via REST API + webhooks + widget. Provisions agents programmatically per end-customer. Cares about: API completeness, API keys, webhook reliability, tenancy isolation, self-hosting.

**Persona 3 — Contact-center manager (operator).** Runs outbound campaigns, watches live calls, reviews QA tags, exports analytics. Cares about: campaign controls, failure-mode visibility, transfer-to-human paths.

**Persona 4 — Compliance officer (viewer).** Read-only. Reviews transcripts, recordings, QA evidence. Cares about: audit trail, access control, data retention.

### 3.2 Roles & Permissions (RBAC)

Roles are org-scoped. Permission model is `resource:action` checked at API middleware.


| Role              | Scope                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------- |
| **Super Admin**   | Platform operator; cross-org administration, credit grants, provider defaults                                 |
| **Org Owner**     | Everything in the org incl. billing, member management, org deletion                                          |
| **Org Admin**     | Everything except billing ownership and org deletion                                                          |
| **Agent Builder** | Create/edit/test agents, tools, knowledge bases, campaigns; no member/billing/telephony-credential management |
| **Viewer**        | Read-only: agents, calls, analytics, recordings                                                               |


Enforcement is defense-in-depth: route middleware (session + org membership + role) → data-access layer (every query filtered by `org_id`) → UI (capability-gated controls, never the only gate).

---

## 4. System Architecture

### 4.1 Services

The platform is four deployables plus two static artifacts, developed in one monorepo (§5):

1. `**web`** — Next.js dashboard. Server-rendered app: Agent Builder, Flow Designer, Composer, test console, call history, campaigns, analytics, settings. Talks to `api` via REST (cookie auth) and to the media plane via WebRTC for browser calls.
2. `**api**` — Express platform API. Owns: auth, RBAC, all CRUD, agent versioning, telephony provider adapters and webhooks, campaign scheduling, credits/billing, webhook delivery, Composer orchestration, MCP server, public API. Owns the database schema. Dispatches calls to the voice engine and receives its end-of-call reports on internal endpoints.
3. `**voice-engine**` — Python FastAPI service running **one voice pipeline per active call**. Receives a dispatch request (full resolved agent config + transport credentials), joins the media room, wires STT → LLM → TTS (or a realtime speech-to-speech model), executes tools, streams realtime feedback events, and posts a mandatory end-of-call report.
4. **Media plane** — LiveKit SFU + LiveKit SIP. All audio — browser, widget, and PSTN — terminates here. Carriers deliver calls over SIP into LiveKit rooms; the voice engine and callers join the same room. Self-hostable (Apache-2.0) for compliance deployments; Daily supported as a secondary WebRTC transport.
5. `**widget`** — a single framework-free JS bundle customers embed with one `<script>` tag; voice + text chat.
6. `**docs**` — Mintlify docs site: guides, MCP docs, and OpenAPI-generated API reference.

Supporting infrastructure: **PostgreSQL 16** (system of record), **Redis 7** (BullMQ queues, rate limits, quotas, cross-instance cache invalidation), **Qdrant** (KB vectors), **object storage** (recordings, KB documents, exports).

### 4.2 Communication Patterns

```
                 REST (cookie session)                HTTP dispatch (internal)
   web  ───────────────────────────────►  api  ───────────────────────────────►  voice-engine
    │                                      ▲  ◄───────────────────────────────      │
    │                                      │     end-of-call report,                │
    │            WebSocket (live call      │     realtime event buffer (internal)   │
    │◄───────────  feedback stream)  ──────┘                                        │
    │                                                                               │
    │                        WebRTC (join room)                 WebRTC (join room)  │
    └───────────────────────────►  LiveKit SFU/SIP  ◄───────────────────────────────┘
                                        ▲
                                        │ SIP
                          Carriers (Twilio / Plivo / Telnyx / …)
                                        ▲
                                        │ PSTN
                                     Callers
```

- **web ↔ api** — REST for CRUD; WebSocket for live call event streams; Server-Sent Events for Composer chat streaming.
- **api ↔ voice-engine** — HTTP dispatch (api → engine) carrying the fully resolved agent config; internal HTTP callbacks (engine → api) for end-of-call reports and buffered realtime events. Internal endpoints are unauthenticated but network-restricted (cluster-internal only).
- **api ↔ carriers** — provider REST APIs (number search/purchase/webhook config, outbound call origination, SMS) via the adapter registry; inbound provider webhooks with signature validation.
- **voice-engine ↔ AI providers** — WebSocket/REST/gRPC to STT/LLM/TTS/realtime providers.
- **api workers** — BullMQ workers in the api process family: `call-dispatch` (originate + dispatch outbound calls), `call-complete` (persist reports, compute cost, deduct credits, fire webhooks), `campaign` (feed campaign contacts into dispatch at the configured concurrency).
- **Cross-instance sync** — Redis pub/sub topic; any instance that mutates cached state (provider credentials, agent config cache, rate-limit config) publishes an invalidation all peers consume.

### 4.3 Canonical Call Flows

**Inbound phone call**

1. Caller dials a number owned/imported in Vaani. Carrier fires its inbound webhook to `api`.
2. `api` validates the webhook signature, resolves number → assigned agent → published version, checks org credit balance (reject with a polite carrier response if empty).
3. `api` creates the `calls` row, creates a LiveKit room + SIP participant (carrier leg bridged into the room), and dispatches the voice engine with the resolved config + room token.
4. Engine joins the room, runs the pipeline; caller and agent converse. Live feedback events stream to any dashboard viewer.
5. On hangup: engine finalizes transcript + metrics, runs post-call intelligence, POSTs the end-of-call report; `call-complete` worker persists everything, computes cost, deducts credits, fires org webhooks.

**Outbound call (API or campaign)**

1. `POST /calls` (or campaign worker) enqueues to `call-dispatch`.
2. Worker checks credits, creates the room, originates the carrier call leg via the adapter, dispatches the engine.
3. Optional pre-conversation **IVR navigation phase**: if the callee side is an automated menu, a lightweight classifier + DTMF sender navigates ("press 2 for scheduling") toward the configured goal before the conversational pipeline takes over.
4. Optional **voicemail detection**: if a machine answers, either hang up or speak a configured voicemail message after a configured delay.
5. Same post-call path as inbound.

**Browser test / widget / share-link call**

1. Client requests a session (`web` test console with session auth; widget/share-link via public endpoints with per-request validation: agent published + widget enabled + origin domain allowed + optional API key).
2. `api` mints a room + participant token, creates a `calls` row (`mode: web_test | widget | shared`), dispatches the engine.
3. Browser joins via WebRTC; conversation runs identically to phone calls (same pipeline, same reports).

**Text chat session (widget)** — same dispatch, but the pipeline runs in text mode: no STT/TTS, LLM + tools + KB only, with chat-specific idle warning/timeout settings and per-message billing.

---

## 5. Monorepo & Directory Structure

One repository, pnpm workspaces + Turborepo for the JS/TS packages; the Python voice engine lives in the same repo with its own `uv`-managed environment and participates in the same task runner via package scripts. One version-controlled source of truth for the OpenAPI spec, shared types, and deploy manifests.

```
vaani/
├── package.json                    # workspace root; turborepo pipeline
├── pnpm-workspace.yaml             # apps/*, packages/*
├── turbo.json                      # build/lint/test/typecheck task graph
├── docker-compose.yml              # full local stack: db, redis, qdrant, api, voice-engine, web
├── .env.example                    # all variables, documented (see Appendix A)
├── README.md
│
├── apps/
│   ├── web/                        # Next.js dashboard (App Router)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/                    # login, register, forgot-password
│   │   │   │   ├── (dashboard)/
│   │   │   │   │   ├── (overview)/            # home: KPIs, recent calls, quick actions
│   │   │   │   │   ├── agents/                # list, new (simple|flow), [agentId] editor
│   │   │   │   │   │   └── [agentId]/
│   │   │   │   │   │       ├── flow/          # visual Flow Designer (React Flow)
│   │   │   │   │   │       └── test/          # web test console (WebRTC)
│   │   │   │   │   ├── composer/              # AI Composer + [conversationId]
│   │   │   │   │   ├── campaigns/             # list, new, [campaignId] detail
│   │   │   │   │   ├── history/               # call history + call detail drawer
│   │   │   │   │   ├── recordings/            # audio recordings library
│   │   │   │   │   ├── knowledge-base/        # KBs, documents, ingestion status
│   │   │   │   │   ├── tools/                 # custom HTTP tools
│   │   │   │   │   ├── analytics/             # dashboards + exports
│   │   │   │   │   ├── billing/               # credits, transactions, top-up
│   │   │   │   │   ├── automation/            # placeholder ("on the roadmap")
│   │   │   │   │   └── settings/              # general, members, telephony, api-keys
│   │   │   │   ├── accept-invitation/[invitationId]/
│   │   │   │   └── api/[...path]/             # same-origin proxy → platform API
│   │   │   ├── components/                    # feature components + shadcn/ui primitives
│   │   │   ├── contexts/                      # org context, call-session context
│   │   │   ├── hooks/                         # useCallSession, useLiveEvents, …
│   │   │   ├── lib/                           # api client, auth client, utils
│   │   │   ├── types/
│   │   │   └── middleware.ts                  # session-aware route gating (UX only)
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── api/                        # Express platform API (TypeScript)
│   │   ├── src/
│   │   │   ├── index.ts                       # bootstrap: http, ws, workers, migrations
│   │   │   ├── db/
│   │   │   │   ├── schema/                    # Drizzle schemas, one file per domain
│   │   │   │   │   ├── auth.ts                # user, session, organization, member, invitation
│   │   │   │   │   ├── agents.ts              # agents, agent_versions
│   │   │   │   │   ├── calls.ts               # calls, call_turns
│   │   │   │   │   ├── campaigns.ts           # campaigns, campaign_contacts
│   │   │   │   │   ├── tools.ts               # tools
│   │   │   │   │   ├── knowledge-base.ts      # knowledge_bases, documents, chunks, bindings
│   │   │   │   │   ├── telephony.ts           # phone_numbers
│   │   │   │   │   ├── telephony-providers.ts # telephony_configurations (per-carrier creds)
│   │   │   │   │   ├── provider-configs.ts    # BYO AI-provider keys
│   │   │   │   │   ├── credits.ts             # org_credits, credit_ledger
│   │   │   │   │   ├── recordings.ts          # recordings
│   │   │   │   │   ├── realtime-events.ts     # realtime_feedback_events, call_qa_tags
│   │   │   │   │   ├── composer.ts            # conversations, messages, proposals, attachments
│   │   │   │   │   ├── api-keys.ts            # api_keys
│   │   │   │   │   ├── webhooks.ts            # webhook_endpoints, webhook_deliveries
│   │   │   │   │   └── folders.ts             # agent_folders
│   │   │   │   └── migrate.ts
│   │   │   ├── routes/                        # thin handlers: parse → validate (Zod) → lib
│   │   │   │   ├── agents.ts  calls.ts  campaigns.ts  tools.ts
│   │   │   │   ├── knowledge-base.ts  telephony.ts  recordings.ts
│   │   │   │   ├── analytics.ts  credits.ts  folders.ts  search.ts
│   │   │   │   ├── api-keys.ts  composer.ts  orgs.ts  webhooks.ts
│   │   │   │   ├── mcp.ts                     # MCP server endpoint (API-key auth)
│   │   │   │   ├── widget.ts                  # public widget endpoints (CORS + per-request validation)
│   │   │   │   ├── public-agent.ts            # share-token test sessions
│   │   │   │   ├── internal.ts                # engine callbacks (cluster-internal)
│   │   │   │   └── providers/                 # carrier webhook receivers (per provider)
│   │   │   ├── middleware/                    # session auth, org scoping, RBAC, credit gate, widget CORS
│   │   │   ├── lib/                           # ALL business logic lives here
│   │   │   │   ├── agent-config.ts            # config resolution, validation, version materialization
│   │   │   │   ├── telephony/                 # provider adapter registry
│   │   │   │   │   ├── registry.ts  factory.ts
│   │   │   │   │   └── providers/             # twilio, plivo, telnyx, vonage, exotel, …
│   │   │   │   ├── composer/                  # copilot orchestrator (see §6.16)
│   │   │   │   ├── workers/                   # BullMQ: call-dispatch, call-complete, campaign
│   │   │   │   ├── media/                     # LiveKit room/token/SIP mgmt; Daily fallback
│   │   │   │   ├── credits.ts  pricing.ts     # metering + provider pricing tables
│   │   │   │   ├── webhook-delivery.ts        # signed delivery + retry/backoff
│   │   │   │   ├── storage/                   # blob-storage abstraction (Azure / S3-compatible)
│   │   │   │   ├── crypto.ts                  # AES-256-GCM for stored credentials
│   │   │   │   ├── rate-limiter.ts  circuit-breaker.ts
│   │   │   │   ├── worker-sync.ts             # Redis pub/sub cache invalidation
│   │   │   │   └── share-token.ts             # signed short-lived public test tokens
│   │   │   └── ws/                            # live call event socket server
│   │   ├── drizzle/                           # generated SQL migrations (committed)
│   │   ├── openapi/                           # OpenAPI spec (source of truth for docs + SDKs)
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── voice-engine/               # Python voice pipeline service
│   │   ├── pyproject.toml                     # uv-managed
│   │   ├── src/engine/
│   │   │   ├── main.py                        # FastAPI app + dispatch routes (blocks until call ends)
│   │   │   ├── config.py                      # pydantic-settings
│   │   │   ├── bots/                          # pipeline assembly per mode
│   │   │   │   ├── base.py                    # simple-agent pipeline
│   │   │   │   ├── flow.py                    # flow-agent pipeline (flows runtime)
│   │   │   │   └── ivr_phase.py               # pre-conversation IVR navigation
│   │   │   ├── flows/                         # flow-graph loader, node factory, actions, handlers
│   │   │   ├── services/
│   │   │   │   ├── stt.py  llm.py  tts.py     # provider factories
│   │   │   │   ├── realtime.py                # speech-to-speech services
│   │   │   │   ├── pre_call_fetch.py          # pre-call HTTP data fetch → variables
│   │   │   │   ├── realtime_feedback.py       # live + historical event observer
│   │   │   │   ├── qa_analyzer.py             # post-call QA scoring/tagging
│   │   │   │   └── recording_router.py        # @mention audio playback in place of TTS
│   │   │   ├── rag/                           # retrieval: Qdrant client, embeddings,
│   │   │   │   │                              #   injector (fast path), semantic cache (FAISS),
│   │   │   │   └──                            #   slow-thinker prefetcher, document parsers
│   │   │   ├── processors/                    # thinking-sound filler, keypad/DTMF menu
│   │   │   ├── tools.py  telephony_tools.py   # tool execution: HTTP, end-call, transfer, DTMF, SMS
│   │   │   ├── variables.py  voices.py
│   │   │   ├── voicemail_observer.py          # answering-machine detection
│   │   │   ├── metrics.py                     # metrics observer + end-of-call report
│   │   │   └── webhooks.py                    # in-call webhook event emission
│   │   ├── tests/
│   │   ├── loadtest/                          # concurrency/latency harness
│   │   └── Dockerfile
│   │
│   └── docs/                       # Mintlify site
│       ├── docs.json                          # nav: Guides / MCP & SDKs / API Reference
│       ├── get-started/  agents/  tools/  knowledge-base/
│       ├── telephony/  composer/  post-call/  webhooks/  mcp/
│       └── api-reference/                     # overview + OpenAPI-generated endpoint pages
│
├── packages/
│   ├── widget/                     # embeddable widget (no framework, single bundle)
│   │   ├── src/                               # index (loader), ui, voice, chat, audio, api, styles, types
│   │   ├── preview.html                       # local playground
│   │   └── vite.config.ts                     # emits vaani-widget.js
│   ├── shared/                     # Zod schemas + TS types shared by web/api/widget
│   │   └── src/                               # agent-config schemas, call types, event types, API DTOs
│   └── eslint-config/  tsconfig/   # shared lint + tsconfig bases
│
├── infra/
│   ├── helm/vaani/                            # chart: deployments, services (incl. internal LB),
│   │   │                                      #   PDB, ServiceAccount, PodMonitor,
│   │   │                                      #   KEDA ScaledObject (Prometheus trigger)
│   ├── livekit/                               # self-hosted media plane: SFU + SIP compose,
│   │   │                                      #   livekit.yaml, cloud (AKS) manifests
│   └── azure/                                 # cloud deployment notes/templates
│
└── tools/
    ├── webhook-tester/                        # local webhook receiver for development
    └── scripts/                               # seed, smoke-test, release helpers
```

**Workspace rules**

- `packages/shared` is the contract layer: agent-config Zod schemas, event shapes, and API DTOs are defined once and imported by `web`, `api`, and `widget`. The voice engine mirrors these contracts with pydantic models validated in CI against the OpenAPI spec.
- `apps/api/openapi/` is the single source of truth for the public API; the docs site and any future SDKs are generated from it.
- Turborepo tasks: `build`, `dev`, `lint`, `typecheck`, `test` across all packages; `voice-engine` exposes the same task names via scripts that shell into `uv run`.
- Each deployable has its own Dockerfile; `docker-compose.yml` at the root brings up the entire stack (`db`, `redis`, `qdrant`, `api`, `voice-engine`, `web`) for local development.

---

## 6. Feature Modules

### 6.1 Authentication, Organizations & RBAC

**Registration & onboarding.** Email + password signup with email verification; forgot/reset password. First login creates the user's organization (name, timezone) and seeds it with signup credits (§6.15). Session management is cookie-based (HTTP-only, SameSite), not JWT.

**Organizations & membership.** Users can belong to multiple orgs and switch via an org picker. Org Owners/Admins invite members by email with a role; invitations are tokenized links (`/accept-invitation/:id`) that create the account if needed and attach membership. Members page: list, change role, remove, revoke pending invitations.

**RBAC.** Roles per §3.2; permissions expressed as `resource:action` (e.g. `agents:write`, `calls:read`, `billing:manage`) and enforced by middleware on every org-scoped route. `orgId` always comes from the authenticated path scope — never from the request body — and every query's `WHERE` clause includes it.

**MFA (TOTP)** for Owner/Admin roles — post-GA fast-follow.

**Edge cases:** invitation to an existing member (no-op with message); role downgrade of the last Owner (blocked); org deletion requires Owner + explicit name confirmation and soft-archives all resources.

### 6.2 Agent Builder — Simple Agents

A **simple agent** is driven by one system prompt in a single turn-loop. Best for single-goal calls: reception, FAQ, intake, reminders, tier-1 support.

`**personaConfig`** (the agent's brain):


| Field                                                              | Notes                                                                                                                               |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `systemPrompt`                                                     | Required. Written for speech (short sentences, no markdown)                                                                         |
| `agentSpeaksFirst`                                                 | true for outbound; requires `greetingMessage`                                                                                       |
| `greetingMessage`                                                  | Exact first line (TTS direct, bypasses LLM)                                                                                         |
| `personalityTraits[]`, `speakingStyle`, `responseLengthPreference` | Persona shaping (`concise | balanced | verbose`)                                                                                    |
| `customVariables[]`                                                | `{ name, defaultValue? }`, referenced as `{{name}}` anywhere in prompts; per-call values injectable via API/campaign/pre-call fetch |


`**advancedConfig**` (call behavior — every field has a sensible default):

- **Limits:** `maxCallDurationSecs` (30–7200, default 240), `inactivityTimeoutSecs` (5–300, default 30), `timezone` (IANA; powers `{{date}}`/`{{time}}`).
- **Turn-taking:** `silenceDuringIntro` (default true), `silenceWhenAgentSpeaks` (disables barge-in, default false), VAD tuning — `vadStopSecs` (0–1, default 0.3), `vadConfidence` (default 0.7), `vadMinVolume` (default 0.6).
- **Ambience:** background noise (`office | call_center | cafe`, volume 0–1) to mask synthesis gaps and add realism.
- **Ending:** graceful-exit warning before the hard cap (default 30 s), configurable `goodbyeMessage`; optional model-invocable end-call tool with a description of when to use it.
- **Voicemail (telephony):** detection on/off, hang-up vs leave-message, message text, response delay (default 2.0 s).
- **IVR navigation (outbound telephony only):** `{ enabled, goalTemplate (supports variables), maxNavigationSecs (default 90), onStuck: end_call | continue_to_flow }` — the agent listens to automated menus and presses keys to reach its goal before conversing.
- **Chat settings:** `chatMaxDurationSecs` (480), `chatIdleWarningSecs` (20), `chatIdleTimeoutSecs` (25) for text-mode sessions.
- `**embedConfig`:** widget appearance + access (§6.9).
- `**screenAware`:** widget may share the user's screen as visual context to the agent.
- `**knowledgeBaseBindings[]`**, `**postCallAnalysis**` (§6.12), `**telephonyTools**` (transfer/DTMF/SMS config §6.5).

**Versioning & lifecycle.** Every save creates an immutable `agent_versions` row; drafts are editable, **publish** pins the active version served to calls; restore = new version cloned from history. Status: `draft → active → archived` (soft delete). Duplicate-agent supported. Agents live in folders (§6.19).

### 6.3 Agent Builder — Flow Agents & Visual Flow Designer

A **flow agent** replaces the single prompt with a **directed graph of nodes**; each node is a conversation stage with its own objective, tools, and optionally its own model/voice. Built in a drag-and-drop canvas (React Flow) with an inspector panel per node; the same JSON `flowConfig` is fully addressable via API.

**Node types**


| Type       | Purpose                                                                               |
| ---------- | ------------------------------------------------------------------------------------- |
| `initial`  | Entry point (exactly one). Usually carries the persona (`roleMessages`)               |
| `node`     | Standard conversation stage: objective (`taskMessages`), tools, branches              |
| `transfer` | Warm-transfer the call to a human/number; **must** define a `transfer-failure` branch |
| `dtmf`     | Send DTMF tones (navigate downstream IVRs, enter codes)                               |
| `sms`      | Send an SMS mid-call; **must** define both `sms-success` and `sms-failure` branches   |
| `end`      | Terminate (at least one required)                                                     |


**Node `data`:** `label` (required), `taskMessages[]` (required), `roleMessages[]`, `respondImmediately` (default true), `firstMessage` (exact TTS on entry), `contextStrategy` (`append | reset | reset_with_summary` + `summaryPrompt`), `serviceOverrides` (`llm.model/temperature`, `tts.voice/model/speed`, `stt.model/language`, `sttMute`), per-node `toolIds` and knowledge-base binding.

**Transitions ("functions").** Branches out of a node are exposed to the LLM as callable functions; the model picks by `description` (the plain-language condition). Each: `name` (snake_case), `description`, `handlerType` (`transition | end_conversation`), `targetNode`, optional `properties`/`required` (data captured as the branch fires, available downstream as `{{param}}`), optional `transitionSpeech` spoken while entering the target.

**Flow-level config:** `meta` (required), `globalRoleMessages`, `globalToolIds`, `globalKnowledgeBases[]` (`{ knowledgeBaseId, chunksToRetrieve 1–10 default 3, similarityThreshold 0–1 default 0.5 }`), `globalContextStrategy`, `globalSummaryPrompt`, `customVariables[]`, and `globalCallSettings` — the flow-agent equivalent of `advancedConfig` (same semantics, nested shape: `vad.{stopSecs,confidence,minVolume}`, `backgroundNoise.{enabled,sound,volume}`, `voicemail.{enabled,responseDelaySecs,leaveMessage,message}`, `postCallAnalysis`, timeouts, graceful exit).

**Validation (enforced on save and publish):** exactly one `initial`; ≥ 1 `end`; every non-`end` node has ≥ 1 outgoing transition (no dead ends); transfer/sms required branches present; all `targetNode` references resolve; variable references resolvable or defaulted. Violations block publish with per-node error annotations on the canvas.

**Flow templates:** starter graphs (appointment reminder, lead qualifier, identity-verify-then-route, survey) instantiable from the "new agent" screen.

### 6.4 Voice Stack (LLM / STT / TTS / Realtime)

`**voiceConfig`** (both agent types), platform defaults applied per omitted field:


| Slot           | Providers (v1)                                            | Default                           |
| -------------- | --------------------------------------------------------- | --------------------------------- |
| LLM            | OpenAI, Anthropic, Google (Gemini), Groq                  | `openai/gpt-4.1-mini`             |
| STT            | Deepgram, AssemblyAI, Azure, OpenAI Whisper, Speechmatics | `deepgram/nova-3-general`         |
| TTS            | Cartesia, ElevenLabs, Deepgram, OpenAI                    | `cartesia` (voice catalog in-app) |
| Realtime (S2S) | OpenAI Realtime, Gemini Live                              | off                               |


Additional fields: `language` (agent language + TTS fallback; `sttLanguage` wins for STT), `voiceSpeed` (clamped per provider, 0.6–1.5 for default TTS), `ttsVoice` from a browsable voice catalog with preview audio.

**Realtime mode** replaces STT+TTS with a single speech-to-speech model (`realtimeProvider`, `realtimeModel`, `realtimeVoice`); the rest of the platform (tools, flows, reports, billing) behaves identically.

**BYO provider keys.** Orgs can store their own provider API keys (`provider_configs`, AES-256-GCM encrypted, masked on read). Resolution order: org key → platform default key. Per-node `serviceOverrides` let flow agents switch model/voice/language mid-call (e.g., cheap model for verification, premium voice for sales pitch).

### 6.5 Tools & Function Calling

**Custom HTTP tools (org library).** Name, LLM-facing description (drives when the model calls it), JSON-schema parameters, HTTP method + server URL, header/auth config (`none | api_key | bearer`; secrets encrypted), timeout, response mapping into conversation context. Attached to agents (`toolIds`) or per flow node. Executed by the voice engine mid-call; latency masked with **thinking sounds** (subtle typing/hold audio) so dead air never exceeds ~1 s.

**Built-in call-control tools:** `end_call`; **call transfer** (configured target(s); announced warm transfer with an auto-generated **conversation summary handed to the human**; failure branch on no-answer); **send SMS** (templated, variables allowed); **send DTMF**.

### 6.6 Knowledge Bases (RAG)

- **Ingestion:** create KB → upload documents (PDF, DOCX, TXT, MD, HTML) → parse → chunk → embed → index into Qdrant, all async with visible per-document status (`processing | ready | failed`) and re-index action. Documents stored in object storage; chunks + embeddings addressable per org/KB.
- **Binding:** simple agents bind KBs globally (`knowledgeBaseBindings`); flow agents bind globally and/or per node — each binding sets `chunksToRetrieve` and `similarityThreshold`.
- **Runtime — two-speed retrieval:**
  - **Fast path:** each user turn queries a **semantic cache** (in-process FAISS cosine index, LRU + TTL) for sub-millisecond context injection into the system context.
  - **Slow path ("slow thinker"):** a background task subscribes to the conversation stream, uses a cheap LLM to *predict* likely next topics, pre-fetches from Qdrant, and warms the cache — so retrieval latency is paid ahead of the question, not during it.
  - Cache miss falls back to direct Qdrant query with the configured threshold; injected chunks are traceable per turn for debugging.

### 6.7 Telephony

**One media plane, every carrier.** All PSTN audio enters through **SIP into LiveKit rooms**. Carriers handle PSTN delivery only; adding a carrier is a new **adapter**, never a new media path. The platform never terminates raw RTP on its own app servers.

**Carrier adapter registry.** A uniform interface per provider: credential validation, number search/purchase/release, inbound webhook config, outbound origination, SMS, capability flags. Launch matrix: **Twilio** (BYON, production) and **Plivo** (marketplace + BYON, production); **Telnyx, Vonage, Vobiz, Cloudonix, Exotel** registered as beta adapters (config + outbound wiring; inbound GA per-carrier post-launch). Org credentials stored encrypted, masked in every read API, verified on connect.

**Numbers.**

- *Buy on-platform:* search a connected carrier's inventory by country/area/pattern → purchase → platform auto-configures the number's voice URL / SIP trunk.
- *Bring your own:* import an existing number; platform generates the exact webhook/trunk settings for the carrier console and verifies inbound reachability.
- Number lifecycle: assign to agent (inbound routing), unassign, release. One agent may serve many numbers.

**Inbound routing:** number → agent (published version). Unassigned numbers answer with a configurable fallback ("this number is not yet configured").

**Outbound:** single-call API (`agentId`, `toNumber`, `fromNumber`, per-call `variables`, optional metadata) and campaign engine (§6.10). Caller ID must be an owned/verified number.

**In-call controls:** warm transfer with summary, DTMF send, SMS send, voicemail detection + message drop, and the pre-conversation IVR navigation phase (§4.3).

### 6.8 Web Testing & Share Links

- **Test console** (`/agents/:id/test`): one-click browser call over WebRTC against any version (draft or published) — mic controls, live transcript, live event feed (tool calls, node transitions, latency ticks), end-call, and instant replay of the just-finished call's report.
- **Test modes:** voice (default) and text-chat mode for rapid prompt iteration without audio.
- **Share links:** mint a signed short-lived **share token** URL so anyone (stakeholder, client) can test-call the agent in a browser with no account. Revocable; sessions are marked `shared` in call history.

### 6.9 Embeddable Widget (Voice + Chat)

A single-script embed customers drop into their site:

```html
<script src="https://cdn.vaani.ai/widget.js" data-agent-id="agt_…"></script>
```

- **Modes:** `voice`, `chat`, or `both` (launcher lets the visitor choose). Voice runs WebRTC into the same pipeline as every other call; chat runs the text-mode pipeline with idle warning/timeout.
- **Appearance (`embedConfig`):** theme `light | dark | auto`, `accentColor`, size `sm | md | lg`, title + description, launcher position.
- **Access control:** `allowedDomains[]` (origin-checked per session request), optional `requireApiKey`, agent must be published + widget-enabled. Public endpoints are CORS-permissive but validate every request.
- **Screen awareness (optional):** with explicit visitor consent, the widget shares the screen so the agent can reference what the user is looking at.
- **UX:** live transcript, mute, end, connection states, graceful error handling. Zero framework dependencies; < 50 KB gzipped target; Shadow-DOM isolated styles.

### 6.10 Campaigns (Outbound at Scale)

- Create campaign: pick agent + caller number, upload contacts (CSV with phone + arbitrary variable columns mapped to agent `customVariables`), set concurrency, calling window (timezone-aware), and retry policy (attempts, backoff, retry-on: no-answer/busy/voicemail).
- Lifecycle: `draft → running → paused → completed/stopped`; pause/resume/stop are immediate.
- Campaign worker feeds contacts into the dispatch queue at the configured rate; per-contact status (`pending | calling | completed | failed | retry_scheduled`) with the linked call and its post-call results (structured data, QA score) inline; CSV export of results.
- Guards: credit balance checked per dispatch (campaign auto-pauses at zero balance); org-level max concurrent calls enforced.

### 6.11 Call Management, Live Monitoring & History

- **Live:** active-call list; opening a call streams its **realtime feedback events** over WebSocket — transcript lines, tool calls (+ latency), flow node transitions, VAD edges, interruptions/barge-ins, per-turn latency ticks. The event protocol is one stable JSON shape written to **two sinks** (live socket + database), so the live view and the historical view render the same timeline component.
- **History:** filterable list (agent, date, direction, mode web/widget/phone/chat, status, duration, cost, QA score, sentiment) with saved filters and CSV export.
- **Call detail:** synchronized recording player + turn-by-turn transcript; metrics panel (voice-to-voice latency percentiles, interruptions, dead-air, turn counts); event timeline (identical to live); tool-call inspector (request/response, redacted secrets); post-call results (summary, sentiment, structured fields, QA tags with evidence); cost breakdown (STT/LLM/TTS/platform fee); technical metadata (providers/models used, carrier, room id).
- **Recording storage** in org-scoped object storage with signed playback URLs and configurable retention.

### 6.12 Post-Call Intelligence

Runs in the engine after every call; **advisory and non-blocking** — the end-of-call report is mandatory and always delivered even if analysis fails.

- **Summary + sentiment** on every call with a transcript.
- **Structured data extraction (`postCallAnalysis`):** per-agent `{ enabled, analysisPrompt?, analysisSchema[] }` where each field is `{ name, type: string|number|boolean|array, arrayItemType?, description }`. Extracted values land as queryable columns in call history and export.
- **QA tagging:** an LLM pass (cheap model, temperature 0.1, JSON response) grades every transcript: `callQualityScore` 1–10 (clamped on parse), `overallSentiment`, one-line summary, and zero-or-more **failure-mode tags each citing transcript evidence** (e.g. `agent_interrupted_user`, `unanswered_question`, `wrong_language`, `caller_frustrated`, `tool_failure`). Skipped silently when there's no transcript or no key.

### 6.13 Audio Recordings Library

Org library of uploaded audio clips (greetings, legal disclaimers, brand sounds), each with a **slug**. Referencing `@slug` inside greeting/goodbye/voicemail fields makes the pipeline **play the real audio instead of synthesizing** that segment — pixel-perfect brand voice where it matters. CRUD + preview + usage listing.

### 6.14 Analytics & Reporting

- Overview dashboard: call volume, success rate, avg duration, total minutes, cost, avg QA score, sentiment mix — trend charts with period comparison; filter by agent/date/direction.
- Breakdowns: per-agent leaderboard, failure-tag frequency (top QA tags = the improvement backlog), campaign funnel (dialed → connected → goal-met from structured data).
- Summary + overview + CSV-export endpoints; all analytics available via API.

### 6.15 Credits, Billing & Usage Metering

- **Prepaid credit ledger** per org: `org_credits` (balance) + append-only `credit_ledger` (every grant/deduction with call/campaign reference). New orgs receive **$2.00 signup credits**.
- **Pricing = provider passthrough + platform fee:**
  - Voice: STT (per-minute per model) + LLM (per-token, input/cached/output per model) + TTS (per-character per model) + **$0.02/min platform fee**.
  - Chat: LLM token cost + **$0.001/message platform fee**.
  - Versioned per-model provider pricing tables maintained in the API; unknown models bill fee-only with cost flagged as unpriced.
- **Enforcement:** credit-gate middleware on call/campaign/widget session start; inbound calls to an empty-balance org get a polite decline; running calls are not killed mid-call (balance may go slightly negative; next call blocked).
- **Billing UI:** balance, burn trend, per-call cost drill-down, transaction history, top-up (manual/invoice at launch; PSP later).

### 6.16 AI Composer (Copilot Agent Builder)

A chat-based copilot in the dashboard that **builds and edits agents from plain language**, with a strict **propose-then-apply** safety model.

- **Capabilities:** draft complete simple or flow agents from a brief (auto-chooses type — 3+ distinct stages ⇒ flow); enforce flow validation rules while drafting; create HTTP tools and attach them; bind knowledge bases; splice `@recording` references; iterate on existing agents (each apply = new immutable version); publish + mint a test link.
- **Research:** web search (with cited sources), URL fetch, and file attachments — PDF/images consumed natively by the model; DOCX/TXT/MD parsed server-side. 25 MB/file, 10 files/message.
- **Safety:** read tools auto-run; **every write is a confirmation card** (full payload inspectable) requiring an explicit Apply — Discard feeds back as a decline. All tool executions are session-bound and org-scoped; the Composer cannot touch billing, members, API keys, or org settings, and never echoes stored secrets.
- **UX:** three columns — conversation sidebar (auto-titled, rename/archive/delete, searchable), chat thread (streaming, collapsed tool/reasoning cards, persistent across refresh, per-conversation URLs), live preview panel (Pending writes / Sources / Files).
- **Limits (env-tunable):** 200 messages/conversation, 15 agent-loop steps/turn, per-org daily token quotas (default 1 M input / 200 K output) tracked in Redis; 429 with structured body on breach.

### 6.17 Public API, API Keys & MCP Server

- **API keys:** org-scoped, hashed at rest, prefix-identified (`vaa_…`), shown once, revocable, per-key scopes and last-used tracking.
- **Public REST API:** everything the dashboard can do to agents, calls, tools, KBs, campaigns, telephony, recordings, folders, credits, analytics, provider configs, and search (§9) — OpenAPI-documented with a try-it playground.
- **MCP server:** an API-key-authenticated MCP endpoint exposing platform capabilities as MCP tools (list/create/update agents, start test sessions, query calls and analytics, manage campaigns), so users can drive Vaani from Claude, Cursor, or any MCP client. Docs include one-line connect instructions.
- **Rate limiting** per key/org with standard headers; consistent error envelope.

### 6.18 Webhooks

- Org-configurable endpoints subscribed to events: `call.started`, `call.completed` (full report: transcript, metrics, structured data, QA), `call.failed`, `campaign.completed`, `kb.document.ready/failed`, `credits.low`.
- Signed deliveries (HMAC header), timestamped, retried with exponential backoff; delivery log with payload inspection and manual redelivery in the dashboard. A local webhook-tester tool ships in the repo for development.

### 6.19 Workspace Organization

- **Folders** for agents (create/rename/delete, drag agents between; delete moves contents to root).
- **Global search** (`⌘K`): agents, calls, campaigns, tools, KBs, recordings by name/number/metadata — org-scoped.

---

## 7. Voice Engine — Detailed Design

**One pipeline per call.** The dispatch HTTP request carries the fully resolved agent config (the engine reads no per-agent state from env or DB); the request handler **blocks until the call ends** so autoscalers see the instance as busy. All configuration travels through the dispatch payload.

**Pipeline shape (simple agent):**

```
transport.input()                    # LiveKit / Daily / WebRTC
  → STT                              # provider factory per voiceConfig
  → user context aggregation
  → RAG context injector             # semantic-cache fast path (§6.6)
  → LLM (+ tool execution loop)
  → TTS                              # or realtime S2S service replacing STT/LLM/TTS
  → transport.output()
  → assistant context aggregation
```

**Flow runtime:** loads `flowConfig`, materializes nodes into per-stage prompts + function schemas, manages transitions (LLM function call → context strategy applied → optional `transitionSpeech` → captured properties become variables), per-node service overrides, and per-node tool/KB scoping.

**Cross-cutting components:**


| Component                  | Behavior                                                                                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Variable engine            | `{{var}}` substitution everywhere; built-ins `{{date}}`/`{{time}}` in agent timezone; per-call injected values > campaign contact columns > pre-call fetch > defaults |
| Pre-call fetch             | Optional HTTP GET/POST before the first turn; response fields mapped into variables (personalize greeting with live CRM data)                                         |
| Thinking sounds            | Filler audio during tool/LLM latency > threshold                                                                                                                      |
| Keypad menu processor      | In-call DTMF capture ("press 1 to confirm") as structured input                                                                                                       |
| Voicemail observer         | Answering-machine detection on outbound; hang up or speak configured message after delay                                                                              |
| IVR phase                  | Pre-conversation navigation bot: classify menu prompts → send DTMF → hand off to the main pipeline (goal template, time budget, on-stuck policy)                      |
| Recording router           | Detects `@slug` segments and plays stored audio instead of TTS                                                                                                        |
| Realtime feedback observer | Emits the stable event protocol to live WS sink + HTTP buffer sink (both, always)                                                                                     |
| Metrics observer           | Voice-to-voice latency per turn, interruptions, dead-air, token/character usage per provider — feeds billing + analytics                                              |
| End-of-call reporter       | **Mandatory**: transcript, metrics, usage, structured analysis, QA result; delivered to the platform even on pipeline error                                           |
| QA analyzer                | §6.12; fails open, never blocks the report                                                                                                                            |


**Engineering rules:** all per-agent config via dispatch payload only; observers log-and-continue (never crash the pipeline); no shared mutable state across processors (frames only); structured logging with call-id correlation.

---

## 8. Data Model

PostgreSQL 16 + Drizzle. Conventions: UUID text PKs; **every org-scoped table carries `org_id`** (FK + composite indexes on `(org_id, …)` for dominant queries); JSONB for flexible config validated with Zod at the app layer; soft-delete via `archived` status; versioned config is append-only; secrets encrypted (AES-256-GCM) before insert; timestamps `created_at`/`updated_at` throughout.


| Domain           | Tables (key columns)                                                                                                                                                                                                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth & tenancy   | `user`, `session`, `organization`, `member` (user, org, role), `invitation`, `verification`                                                                                                                                                                                              |
| Agents           | `agents` (org, name, type simple|flow, status, folder, active_version); `agent_versions` (agent, version_no, persona_config, voice_config, advanced_config, flow_config, tool_ids — immutable)                                                                                           |
| Folders          | `agent_folders` (org, name)                                                                                                                                                                                                                                                              |
| Tools            | `tools` (org, name, description, parameters JSONB, http config, encrypted auth)                                                                                                                                                                                                          |
| Knowledge        | `knowledge_bases`; `knowledge_base_documents` (storage path, status, error); `knowledge_base_chunks` (content, vector ref); `agent_knowledge_bases` (binding + retrieval params)                                                                                                         |
| Telephony        | `telephony_configurations` (org, provider, encrypted credentials, status); `phone_numbers` (org, e164, provider, capabilities, assigned_agent, source purchased|imported)                                                                                                                |
| Provider keys    | `provider_configs` (org, provider, encrypted key, scope stt|llm|tts)                                                                                                                                                                                                                     |
| Calls            | `calls` (org, agent, version, direction, mode phone|web_test|widget|shared|chat, from/to, status, started/ended, duration, cost breakdown JSONB, summary, sentiment, structured_data JSONB, qa_score, recording ref, room/provider ids); `call_turns` (call, role, text, ts, latency_ms) |
| Live events / QA | `realtime_feedback_events` (call, type, payload JSONB, ts); `call_qa_tags` (call, tag, evidence)                                                                                                                                                                                         |
| Campaigns        | `campaigns` (org, agent, number, status, concurrency, window, retry policy); `campaign_contacts` (campaign, phone, variables JSONB, status, attempts, call ref)                                                                                                                          |
| Recordings       | `recordings` (org, slug, storage path, duration, usage refs)                                                                                                                                                                                                                             |
| Credits          | `org_credits` (org, balance); `credit_ledger` (org, delta, type grant|deduction|topup, call/campaign ref, memo)                                                                                                                                                                          |
| Composer         | `composer_conversations` (org, user, title, archived, token totals); `composer_messages`; `composer_proposals` (tool name, payload, status pending|applied|discarded); `composer_attachments`                                                                                            |
| Access           | `api_keys` (org, hash, prefix, scopes, last_used, revoked_at)                                                                                                                                                                                                                            |
| Webhooks         | `webhook_endpoints` (org, url, secret, events[]); `webhook_deliveries` (endpoint, event, payload, status, attempts, next_retry)                                                                                                                                                          |


Tenant-isolation invariant: no row in org A may reference a row in org B — enforced at the application layer on every write (FKs prove existence, not ownership).

---

## 9. API Surface

Mount conventions:


| Mount                     | Auth                                                                         |
| ------------------------- | ---------------------------------------------------------------------------- |
| `/api/orgs/:orgId/…`      | Cookie session + org membership + RBAC (dashboard + public API with API key) |
| `/api/webhooks/:provider` | Carrier signature validation                                                 |
| `/api/internal/…`         | None; network-restricted to the cluster (engine callbacks)                   |
| `/api/widget/…`           | Public; CORS-permissive; per-request validation (agent, domain, key)         |
| `/api/public/agents/…`    | Share-token                                                                  |
| `/api/mcp`                | API key                                                                      |


Endpoint groups (full OpenAPI spec is the artifact of record):

- **Agents** — list/create/get/update/delete, publish, archive, duplicate, list versions, create test session
- **Calls** — list (rich filters), get (turns, events, cost, QA); create outbound call (under telephony)
- **Tools** — CRUD
- **Knowledge bases** — CRUD; documents: list/upload/get/delete/reindex
- **Campaigns** — CRUD; contacts list/add/export; start/pause/stop
- **Telephony** — provider metadata; configurations CRUD; connect/status/disconnect per provider; available-number listing; marketplace search/purchase; phone numbers list/import/assign/release; create outbound call
- **Recordings** — list/upload/get/update/delete
- **Folders** — CRUD
- **API keys** — list/create/revoke
- **Provider configs** — list/create/delete
- **Analytics** — summary, overview, CSV export
- **Credits** — balance, transactions, top-up
- **Search** — global search
- **Orgs & members** — org settings, members, invitations
- **Composer** — conversations CRUD, chat (streaming), proposals apply/discard, uploads
- **Webhooks (org)** — endpoints CRUD, delivery log, redeliver
- **Internal** — end-of-call report, realtime event buffer flush, dispatch health

Handler rules: thin handlers (parse → Zod validate → delegate to lib); business logic lives in `lib/` so workers, MCP tools, and Composer executors reuse it; every mutation of cached state publishes a cross-instance invalidation; credentials are always masked in responses.

---

## 10. Non-Functional Requirements

**Performance**


| Metric                                | Target                   |
| ------------------------------------- | ------------------------ |
| Voice-to-voice latency                | p50 < 1.0 s, p95 < 1.5 s |
| Barge-in stop-speaking                | < 300 ms                 |
| Call setup (dispatch → agent audible) | < 2 s web, < 4 s PSTN    |
| Dashboard TTFB                        | < 500 ms p95             |
| KB retrieval (cache hit / miss)       | < 5 ms / < 250 ms        |


**Scalability.** Engine scales horizontally, one pipeline per call; per-node ceilings established by the in-repo load-test harness; KEDA autoscaling on Prometheus concurrency metrics (AverageValue metric type), PodDisruptionBudgets to protect live calls, long termination grace so scale-in never kills active calls. API is stateless behind a load balancer; Postgres with read capacity headroom; Redis-backed queues absorb campaign bursts.

**Reliability.** Mandatory end-of-call reports (at-least-once, idempotent persist); webhook retries with backoff; circuit breakers around provider APIs; graceful engine drain on deploy; carrier failover is manual at v1 (multi-carrier config makes it a routing change).

**Observability.** Structured logs with call-id correlation across all three services; Prometheus metrics (active calls, dispatch latency, per-provider error rates, queue depth); per-call latency traces surfaced in the call detail view (ops-grade debugging is a product feature).

---

## 11. Security & Compliance

- **Tenant isolation:** org-scoped queries everywhere (middleware-injected `orgId`; body-supplied org ids never trusted); path-param resources verified against org on every access.
- **Encryption:** TLS everywhere; AES-256-GCM for stored credentials/secrets; encrypted object storage for recordings/documents; media encrypted in transit (DTLS-SRTP).
- **Auth:** HTTP-only SameSite session cookies; hashed API keys; signed share tokens (short TTL, revocable); carrier webhook signature validation; internal endpoints network-isolated.
- **Application security:** Zod validation on all inputs; rate limiting per key/org/IP; secrets never logged or echoed (masked reads); SSRF guards on user-supplied URLs (tools, pre-call fetch, Composer fetch).
- **HIPAA-readiness path:** self-hosted media plane keeps audio in the customer boundary; BAAs with AI providers or BYO keys; configurable retention/purge for recordings + transcripts; audit trail of access to call data; PHI-safe logging (no transcript content at info level). Formal HIPAA attestation is a roadmap milestone (Phase 6), but every architectural decision from day one must not preclude it.
- **Widget security:** origin allow-listing, optional API-key gate, no PII persisted client-side, Shadow-DOM isolation.

---

## 12. Deployment & Operations

- **Local dev:** root `docker-compose.yml` runs Postgres, Redis, Qdrant, api, voice-engine, web; hot-reload everywhere; seeded demo org; webhook-tester tool for local event debugging.
- **Production (Kubernetes):** Helm chart per deployable — Deployments, Services (internal LB for engine dispatch), ServiceAccounts, PodMonitors, PDBs, KEDA ScaledObject (Prometheus trigger) for the engine; secrets via cluster secret store. Reference cloud: Azure (AKS + Azure Blob), portable to any k8s.
- **Media plane options:** LiveKit Cloud (default; fastest to production) or self-hosted LiveKit SFU + SIP (compose files + cloud manifests in `infra/livekit/`; the platform chooses purely via `LIVEKIT_URL`/key env — no code change to switch). Serverless GPU/container platforms supported for the engine where the block-until-done dispatch pattern maps to their busy-signal.
- **Migrations:** Drizzle SQL migrations committed with the schema change; applied on deploy.
- **Release:** conventional commits (`type(scope): description`), trunk-based with feature branches, CI: lint + typecheck + unit tests + OpenAPI/pydantic contract check + engine tests; staging env with synthetic test calls as the release gate.

---

## 13. Delivery Roadmap

**Phase 0 — Foundations (weeks 1–2).** Monorepo scaffold (pnpm + Turborepo + uv), Docker Compose stack, CI, Better Auth with orgs/roles/invitations, DB baseline, shared-schema package, design system shell.

**Phase 1 — Build & Test in Browser (weeks 3–7). *Internal alpha.*** Simple-agent builder (persona, voice config, advanced settings) + versioning/publish; voice engine v1 (default STT/LLM/TTS, VAD, barge-in); web test console; call rows + transcript persistence; end-of-call report loop.

**Phase 2 — Flow Agents & Grounding (weeks 8–12).** Flow Designer + flows runtime (all node types, transitions, context strategies, per-node overrides, validation); custom HTTP tools + built-in end-call; knowledge bases v1 (ingestion → Qdrant → retrieval); recordings library + @mention playback; share links.

**Phase 3 — Telephony (weeks 13–17). *Private beta.*** LiveKit SIP media plane; adapter registry with Twilio (BYON) + Plivo (marketplace + BYON) production paths; inbound routing; outbound call API; transfers/DTMF/SMS; voicemail detection; IVR navigation; carrier webhook processing.

**Phase 4 — Operate & Monetize (weeks 18–22).** Campaigns; live monitoring (realtime event protocol, dual sinks); post-call intelligence (summary, structured extraction, QA tagging); analytics + exports; credits/metering/pricing tables + credit gates; org webhooks; billing UI.

**Phase 5 — Developer Surface & Distribution (weeks 23–26). *Public launch.*** Public REST API hardening + OpenAPI docs site; API keys + rate limits; MCP server; embeddable widget (voice + chat + screen-aware); AI Composer; semantic-cache/slow-thinker RAG upgrade; realtime S2S mode; remaining STT/TTS/LLM providers + BYO keys.

**Phase 6 — Scale & Compliance (weeks 27+).** Self-hosted media-plane production hardening + load-tested ceilings; KEDA autoscaling GA; additional carrier adapters to production; HIPAA controls (retention, audit, BAA posture, PHI-safe logging) toward attestation; MFA; PSP top-ups; SDK generation from OpenAPI.

Each phase exits with: demo script passing, load/latency targets measured, docs updated, and no P0/P1 defects.

---

## 14. Risks & Open Questions


| #   | Risk                                                             | Mitigation                                                                                              |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| R1  | Latency regressions as features stack up (RAG, tools, observers) | Per-turn latency budget in CI load tests; thinking-sound masking; semantic-cache prefetch               |
| R2  | Carrier adapter breadth vs. depth                                | Ship 2 production carriers; others beta-flagged with explicit capability matrix in docs                 |
| R3  | Provider API churn (models, pricing)                             | Versioned pricing tables; provider factories isolate SDK changes; unpriced-model flag                   |
| R4  | One-pipeline-per-call cost at scale                              | Load-test harness from Phase 1; KEDA on real concurrency metrics; per-node ceiling documented           |
| R5  | Composer proposing invalid configs                               | Composer enforces the same Zod/flow validation as the API; propose-then-apply keeps a human in the loop |
| R6  | Webhook/report loss = billing loss                               | Mandatory idempotent reports; ledger reconciliation job; alert on report-less completed rooms           |
| R7  | Widget abuse (open endpoints)                                    | Domain allow-list, optional API key, per-org rate limits, credit gate                                   |


**Open questions:** PSP choice and self-serve top-up timing; SLA tiers and support model; per-seat vs. usage-only pricing for the dashboard; data-residency options (EU/India regions); which two additional carriers to take to production first (Telnyx vs. Exotel demand signal).

---

## 15. Appendices

### Appendix A — Environment Variables (by service)


| Service                                             | Variables                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| api                                                 | `DATABASE_URL`, `REDIS_URL`, `BETTER_AUTH_SECRET`, `ENCRYPTION_KEY`, `LIVEKIT_URL` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET`, `BLOB_STORAGE_`*, `VOICE_ENGINE_URL`, `PUBLIC_APP_URL`, `COMPOSER_MODEL` / `COMPOSER_TITLE_MODEL` / `COMPOSER_MAX_STEPS` / `COMPOSER_TURN_CAP` / `COMPOSER_ORG_DAILY_INPUT_TOKENS` / `COMPOSER_ORG_DAILY_OUTPUT_TOKENS`, `TAVILY_API_KEY` |
| voice-engine                                        | `PLATFORM_API_URL` (internal callbacks), platform-default provider keys: `OPENAI_API_KEY`, `DEEPGRAM_API_KEY`, `CARTESIA_API_KEY`, `ELEVENLABS_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `GROQ_API_KEY`, `QDRANT_URL` / `QDRANT_API_KEY`                                                                                                                          |
| web                                                 | `NEXT_PUBLIC_API_URL`                                                                                                                                                                                                                                                                                                                                                    |
| Carriers (per-org, stored encrypted in DB, not env) | Twilio SID/token, Plivo auth id/token, etc.                                                                                                                                                                                                                                                                                                                              |


### Appendix B — Carrier Capability Matrix (launch)


| Carrier   | Buy numbers | BYON | Inbound | Outbound | SMS | Status     |
| --------- | ----------- | ---- | ------- | -------- | --- | ---------- |
| Twilio    | –           | ✅    | ✅       | ✅        | ✅   | Production |
| Plivo     | ✅           | ✅    | ✅       | ✅        | ✅   | Production |
| Telnyx    | –           | ✅    | ⏳       | ✅        | –   | Beta       |
| Vonage    | –           | ✅    | ⏳       | ✅        | –   | Beta       |
| Exotel    | –           | ✅    | ⏳       | ✅        | –   | Beta       |
| Vobiz     | –           | ✅    | ⏳       | ✅        | –   | Beta       |
| Cloudonix | –           | ✅    | ⏳       | ✅        | –   | Beta       |


### Appendix C — Default Values Quick Reference


| Setting                                | Default                                                      |
| -------------------------------------- | ------------------------------------------------------------ |
| LLM / STT / TTS                        | `openai/gpt-4.1-mini` / `deepgram/nova-3-general` / Cartesia |
| Max call duration / inactivity timeout | 240 s / 30 s                                                 |
| VAD stop / confidence / min volume     | 0.3 s / 0.7 / 0.6                                            |
| Background noise                       | off (`office`, volume 0.3 when on)                           |
| Graceful exit warning / goodbye        | 30 s / "Thank you for your time. Goodbye!"                   |
| Voicemail response delay               | 2.0 s                                                        |
| IVR max navigation                     | 90 s                                                         |
| Chat max / idle warn / idle timeout    | 480 s / 20 s / 25 s                                          |
| KB chunks / similarity threshold       | 3 / 0.5                                                      |
| Signup credits                         | $2.00                                                        |
| Platform fee                           | $0.02/min voice, $0.001/msg chat                             |


