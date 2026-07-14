# Vaani — Build Log & Context

> **Purpose.** This is the living execution tracker for the build. If you (or a
> fresh AI session) lose context, **read this file first** — it captures what
> we're building, every decision made, and exactly where we are. Update it at
> the end of every work session. `PRD.md` is the vision; this is the execution.

**Product:** self-hostable, multi-tenant voice AI agent platform. Full spec → [`PRD.md`](./PRD.md).
**This build:** backend + voice pipeline (me/backend owner). Teammate owns the frontend (`apps/web`).
**Repo:** `Vanni-codex-hackathon` · context: hackathon.

---

## Decisions log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-14 | Monorepo: pnpm workspaces + Turborepo; Python engine via `uv`, same repo | One source of truth for the api↔engine contract; parallel workstreams |
| 2026-07-14 | **Media transport: SmallWebRTC first**, LiveKit deferred to Phase 6 | Zero extra infra to get a browser talking to an agent; swap to LiveKit only when we add telephony |
| 2026-07-14 | **Scope target: through Phase 5** (simple agents + tools + KB + post-call + flow agents) | Best effort/impact ratio for the hackathon; telephony (Phase 6) is stretch |
| 2026-07-14 | **Pipecat Flows IS in core as `pipecat.flows`** (v1.5.0). Removed the standalone `pipecat-ai-flows` dep. | **Confirmed at runtime** — Pipecat 1.5.0 emits: *"the separate pipecat-ai-flows package is installed alongside a version that already includes Flows as `pipecat.flows`… uninstall it."* The user was right. (An earlier `uv lock` had co-installed both, and the June hub snapshot predated the merge — the running runtime is ground truth.) Flow runtime (Phase 5) imports from `pipecat.flows`. |
| 2026-07-14 | Flow runtime targets the **modern dynamic-flows API** (`FlowManager`, `NodeConfig` built at runtime) | Dynamic is current in `pipecat.flows` (1.5.0) |
| 2026-07-14 | **Dedicated Neon DB** (`ep-cool-shadow-adfokmck`, us-east-1) — NOT the earlier shared DB (`raspy-dream`, which holds another project's tables) | Avoid clobbering existing data. All tables namespaced under a `vaani` Postgres schema (`schemaFilter:["vaani"]`) for extra isolation. Migrations need the DIRECT (non-pooler) host; pooler hangs on DDL. |
| 2026-07-14 | Priority reorder (user): **agent create→test loop first** (one user, simple + flow), polish RBAC later, LiveKit last | Get the core product working before hardening |
| 2026-07-14 | Contract lives in `@vaani/shared` (Zod) with a **pydantic mirror** in the engine | Single boundary both services validate against |

---

## Tech stack (backend + engine)

- **api** — Node 20, Express 5, TypeScript, Drizzle ORM + Postgres 16, Better Auth, BullMQ + Redis, Zod.
- **voice-engine** — Python 3.12, FastAPI, Pipecat (`pipecat-ai`) + `pipecat-ai-flows`, `uv`.
- **infra** — Postgres, Redis, Qdrant (KB vectors) via `docker-compose.yml`.
- **contract** — `@vaani/shared` (Zod) ↔ pydantic mirror in engine.

---

## Phase plan & status

| Phase | Goal | Status |
|------|------|--------|
| **0 — Foundation** | Monorepo, docker stack, shared dispatch contract | ✅ **Done** (commit `2bcab4a`) |
| **1 — Voice walking skeleton** | `voice-engine`: FastAPI dispatch + SmallWebRTC transport, STT→LLM→TTS, mandatory end-of-call report, browser test console | ✅ **DONE + LIVE-VERIFIED** — real two-way voice call confirmed in-browser (mic → Deepgram → GPT-4.1-mini → Cartesia → speaker) on 2026-07-14 |
| **2 — API foundation** | Better Auth (orgs/members/roles), Drizzle schema, agents CRUD + versioning/publish, dispatch endpoint, internal callbacks, credits | ✅ **DONE + LIVE** — full loop verified against dedicated Neon DB: signup→org→create agent→publish→test-session→engine dispatched. API on :4000 |
| **3 — Close the loop** | Config resolution (DB→dispatch payload), calls persistence, realtime feedback events (dual sink WS+DB) | 🟡 **Partial** — config-resolver + dispatch + calls persistence + /api/internal report&events endpoints done. Live WS event stream pending |
| **3b — API↔frontend contract** | API serves the exact shapes `apps/web/src/types/index.ts` expects; auto-org on signup | ✅ **DONE + VERIFIED** — bare Agent[]/Call[], AnalyticsSummary, OrgCredits{balance,burnLast7d}; signup auto-creates org+owner+credits; requireOrg authorizes by membership (race-free, multi-org). Verified over HTTP. |
| **4a — Frontend wiring** | Real auth, org context, mutations, live test console (WebRTC→engine), real data across chrome | ✅ **DONE + BROWSER-VERIFIED** — signup→auto-org+$2→real dashboard→create agent→test call connects & bot speaks; sidebar/topbar/overview show real org/user/credits; call history shows real completed calls. Fixes: raw-cookie forwarding, client/server split, CORS on engine, Cartesia voice/model guards, form voice→provider mapping |
| **4b — Simple agent completeness** | Tool calling + end_call + advancedConfig behaviors (engine) | 🟡 tools + greeting/goodbye/VAD/barge-in/timeouts done; multi-provider wired (LLM openai/groq/anthropic/google, STT deepgram/openai/assemblyai/azure, TTS cartesia/openai/elevenlabs) |

### Simple-agent gap vs reference (non-telephony) — progress
- ✅ **Provider catalogs + icons** (commit fb38b6a): llm/stt/tts/voice/realtime catalogs (real model ids + Cartesia voice UUIDs) + inline brand SVG icons; both forms wired; agent-builder controlled + persists tabs
- ✅ **Post-call intelligence** (commit 2e395b8): engine fills usage (tokens/chars/STT secs), metrics (v2v latency/interruptions/turns), analysis (summary/sentiment/structured), qa (score+tags) — fail-open
- ✅ **Real transcript in history** (commit e50962c): call-detail renders real call.turns/call.events (mock fallback only when empty)
- 🟡 **Recording**: audio→blob capture NOT implemented yet (recording_path stays null) — deferred
- 🟡 **advanced behaviors**: RAG (Qdrant), thinking sounds, screen-aware — deferred

### Flow agent
- ✅ **Foundation** (commit 577f048): full flow schema in @vaani/shared (all node types + transitions + per-node overrides + global settings; telephony nodes as config) + validateFlowConfig + API validation + /validate-flow endpoint
- 🔨 **Designer + runtime** (in progress): React Flow canvas (all node types, inspector, live validation, save) + pipecat.flows dynamic-flows engine runtime; telephony nodes = logged no-op stubs
| **4 — Simple agent real** | Full advancedConfig (VAD, barge-in, greeting, variables), HTTP tools + end_call, KB (Qdrant RAG), post-call (summary + structured extraction + QA) | ⬜ |
| **5 — Flow agents** | Dynamic-flows runtime (behind adapter), node types + transitions, flow validation | ⬜ (scope finish line) |
| 6 — Telephony (stretch) | LiveKit SIP, Twilio+Plivo, inbound routing, outbound, transfer/DTMF/SMS | ⬜ deferred |
| 7 — Operate (stretch) | Campaigns, analytics, webhooks, real credits, MCP, widget | ⬜ deferred |

---

## Feature checklist (what we're building)

Legend: ✅ done · 🔨 in progress · ⬜ todo · ⏸ deferred past Phase 5

### Auth, orgs & tenancy (Phase 2)
- ⬜ Email/password signup + verification, forgot/reset password
- ⬜ Org creation on first login + signup credits stub
- ⬜ Members: invite by email, roles, remove, revoke invites
- ⬜ RBAC middleware (`resource:action`), org-scoped every query

### Agent builder — simple (Phase 2–4)
- ⬜ `agents` + `agent_versions` (immutable versions), CRUD
- ⬜ Publish / archive / duplicate / restore-version
- ⬜ `personaConfig` (system prompt, greeting, traits, variables)
- ⬜ `voiceConfig` (LLM/STT/TTS providers, language, speed, realtime S2S)
- ⬜ `advancedConfig` (duration/timeout, VAD, barge-in, ambience, graceful exit, voicemail, chat settings)
- ⬜ Custom variables `{{name}}` + per-call injection

### Voice engine (Phase 1–4)
- ✅ Pydantic mirror of `@vaani/shared` contract (`engine/contract.py`, verified round-trip)
- ✅ Deps pinned + locked (`pyproject.toml` + `uv.lock`; pipecat 1.5.0, flows in core)
- ✅ Settings (`engine/config.py`, env-only, no per-agent state)
- ✅ FastAPI dispatch route (`/dispatch`) + SmallWebRTC signaling (`/api/offer`)
- ✅ SmallWebRTC transport + browser test console (`/`, served static)
- ✅ STT→LLM→TTS pipeline + provider factories (Deepgram/OpenAI/Cartesia; others fall back w/ warning → Phase 4)
- ✅ Mandatory end-of-call report (try/finally, delivered even on error) + `/dev/report-sink`
- ✅ VAD via SileroVADAnalyzer from `advanced.vad` (barge-in)
- ✅ Variable substitution engine + built-in `{{date}}`/`{{time}}`
- ⬜ Realtime feedback observer (dual sink) — Phase 3
- ⬜ Metrics observer (voice-to-voice latency, interruptions) — richer metrics Phase 4
- ⬜ Migrate service factories to non-deprecated `settings=` API (small cleanup)
- ⬜ Full transcript/turn capture via observer (currently read from LLM context at call end)

### Tools & function calling (Phase 4)
- ⬜ Custom HTTP tools (org library, encrypted auth), attach to agent
- ⬜ Built-in `end_call`
- ⬜ Thinking-sound filler during tool/LLM latency
- ⏸ Transfer / DTMF / SMS (need telephony)

### Knowledge base / RAG (Phase 4)
- ⬜ KB CRUD, document upload + parse + chunk + embed → Qdrant
- ⬜ Ingestion status + reindex
- ⬜ Binding (global + per-node), `chunksToRetrieve` / `similarityThreshold`
- ⬜ Retrieval: fast injector; (semantic cache + slow-thinker = polish)

### Post-call intelligence (Phase 4)
- ⬜ Summary + sentiment
- ⬜ Structured data extraction (`postCallAnalysis` schema → call columns)
- ⬜ QA tagging (1–10 score, sentiment, failure tags w/ evidence)

### Flow agents (Phase 5)
- ⬜ Flow schema in `@vaani/shared` (nodes, transitions, global settings)
- ⬜ Dynamic-flows runtime adapter (`FlowManager` + `NodeConfig`)
- ⬜ Node types: initial / node / end / transfer / dtmf / sms
- ⬜ Transitions (functions), context strategies, per-node overrides
- ⬜ Flow validation (one initial, ≥1 end, no dead ends, required branches)

### Calls & monitoring (Phase 3)
- ⬜ `calls` + `call_turns` persistence, idempotent report ingest
- ⬜ Live event WebSocket stream
- ⬜ Call history (filters) + call detail (transcript, metrics, events)

### Deferred past Phase 5
- ⏸ Telephony (LiveKit SIP, carriers, numbers, inbound/outbound)
- ⏸ Campaigns · Analytics dashboards · Webhooks · Real credits/metering
- ⏸ AI Composer · Public API keys · MCP server · Embeddable widget

---

## The api ↔ voice-engine contract (load-bearing)

Defined in `packages/shared/src/` — change deliberately, both sides depend on it:
- `dispatch.ts` — `DispatchRequest` (API → engine): resolved `AgentConfig` + transport + variables + callback URLs.
- `report.ts` — `EndOfCallReport` (engine → API): transcript, metrics, usage, analysis, QA, recording. **Mandatory.**
- `events.ts` — `FeedbackEvent`: one shape, dual sink (live WS + DB).
- `agent-config.ts` — the resolved config the engine consumes (voice, persona, advanced, tools, KB, flow passthrough).

The engine keeps a **pydantic mirror** of these (Phase 1). CI will check they stay in sync.

---

## How to test the voice engine (Phase 1)

Real voice needs a browser + mic + your provider keys (OpenAI, Deepgram, Cartesia).

```bash
cd apps/voice-engine
cp ../../.env.example .env          # then fill OPENAI/DEEPGRAM/CARTESIA keys (or export them)
uv sync
uv run uvicorn engine.main:app --host 0.0.0.0 --port 7860
```

Then open **http://localhost:7860/** in Chrome — this is Pipecat's **official prebuilt
WebRTC UI** (known-good mic + audio playback). Click **Connect**, allow the mic. With no
dispatch linked it runs a built-in default "dental receptionist" agent; talk to it.
Watch the terminal for the transcript and the end-of-call report (logged at `/dev/report-sink`).
(A hand-rolled fallback console lives at `/custom`.)

Verified server-side: `/` serves the prebuilt UI + assets (200), `/health`, `/dispatch`,
`/api/offer` (400 on missing sdp, default-agent path on no call_id), `/dev/report-sink`.
Boots clean on pipecat 1.5.0.

### Bugs fixed during first live test (2026-07-14)
- **No agent audio** → the hand-rolled WebRTC client mishandled the media path. Switched
  the primary test UI to Pipecat's prebuilt small-webrtc client (mounted at `/`).
- **STT died mid-call** (`websockets` AssertionError / keepalive fail) → `deepgram-sdk 7.x`
  needs the legacy websockets API; pinned `websockets>=13.1,<14` (was resolving 16.1).
- **Report delivery failed** → relative callback URL. Client now sends absolute; engine also
  resolves relative `/…` report URLs against itself.
- **Data channel timeout** → client now creates the `chat` data channel before the offer.

## Quickref

```bash
pnpm install              # workspace deps
pnpm infra:up             # postgres + redis + qdrant (docker)
pnpm --filter @vaani/shared build

# voice-engine (Phase 1+)
cd apps/voice-engine && uv sync && uv run uvicorn engine.main:app --port 7860 --reload
# api (Phase 2+)
cd apps/api && pnpm dev   # :4000
```

**Current position:** Phases 0–1 complete; Phase 1 live-verified with a real browser voice call. Phase 2 (API foundation: auth+orgs+RBAC, Drizzle schema, agents CRUD+versioning, dispatch endpoint) in progress. **Next action:** integrate Phase 2 output, wire to Neon Postgres, then Phase 3 (close the loop: config resolution DB→dispatch, calls persistence, live event stream).
