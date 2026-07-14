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
| 2026-07-14 | Pipecat Flows stays a **separate `pipecat-ai-flows` package** (imported `pipecat_flows`), NOT merged into core | **Confirmed by `uv lock`:** `pipecat-ai` resolves to **1.5.0**, `pipecat-ai-flows` to **1.3.0** as a separate dep on top of it. The "1.5.0 merged flows into core" belief is false. We wrap flow usage behind one adapter so a future merge = one import change |
| 2026-07-14 | Flow runtime targets the **modern dynamic-flows API** (`FlowManager`, `NodeConfig` built at runtime), not the removed static `FlowConfig` dicts | The reference repo used the old static API; dynamic is current |
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
| **1 — Voice walking skeleton** | `voice-engine`: FastAPI dispatch (blocks till call ends), SmallWebRTC transport, STT→LLM→TTS from hardcoded config, mandatory end-of-call report | 🔨 **In progress** — deps pinned+locked (pipecat 1.5.0), `config.py`, pydantic contract mirror done & verified. Next: `main.py` dispatch route + pipeline + report POST |
| **2 — API foundation** | Better Auth (orgs/members/roles), Drizzle schema (agents, agent_versions, calls), agents CRUD + versioning/publish, dispatch endpoint, internal callbacks, credit stub | ⬜ |
| **3 — Close the loop** | Config resolution (DB→dispatch payload), calls/call_turns persistence, realtime feedback events (dual sink WS+DB) | ⬜ |
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
- ✅ Deps pinned + locked (`pyproject.toml` + `uv.lock`; pipecat 1.5.0, flows 1.3.0)
- ✅ Settings (`engine/config.py`, env-only, no per-agent state)
- 🔨 FastAPI dispatch route (blocks until call ends)
- 🔨 SmallWebRTC transport (browser test)
- 🔨 STT→LLM→TTS pipeline + provider factories
- ⬜ Mandatory end-of-call report (even on error)
- ⬜ VAD / barge-in tuning from config
- ⬜ Variable substitution engine + built-in `{{date}}`/`{{time}}`
- ⬜ Realtime feedback observer (dual sink)
- ⬜ Metrics observer (voice-to-voice latency, interruptions, turns)

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

**Current position:** Phase 0 complete and pushed. **Next action:** Phase 1 — voice-engine walking skeleton (SmallWebRTC + STT/LLM/TTS + dispatch route + end-of-call report), verifying every Pipecat import against the local hub before writing it.
