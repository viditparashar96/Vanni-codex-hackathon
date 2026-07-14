# AGENTS.md — Vaani

Multi-tenant voice-AI platform: build, test, deploy and operate AI voice agents
over phone and web. **PRD.md is the product spec — read the relevant section
before building a feature.** BUILD_LOG.md tracks what's actually done.

## Monorepo map

| Path | What | Stack | Port |
| --- | --- | --- | --- |
| `apps/web` | Dashboard | Next.js 16 (App Router), Tailwind v4, shadcn/ui, React Flow | 3000 |
| `apps/api` | Platform API | Express 5, Drizzle + Postgres (Neon), Better Auth, MCP server | 4000 |
| `apps/voice-engine` | One pipeline per call | Python 3.13, FastAPI, Pipecat (uv-managed) | 7860 |
| `packages/shared` | **The contract** | Zod schemas: agent config, dispatch, events, report | — |
| `packages/mcp` | `vaani-mcp` on npm | stdio→HTTP MCP bridge | — |
| `apps/docs` | Docs | Markdown (Mintlify layout) | — |

## Hard rules (violations have already burned us)

1. **pnpm only.** Never run `npm install` inside a package — a stray
   `package-lock.json` breaks Turbopack's workspace-root inference and the dev
   server panics. **Run `pnpm install` after every `git pull`.**
2. **`packages/shared` is the source of truth.** The web client renders the
   client contract; if an API response differs (db field names, wrappers like
   `{ transactions: [...] }`), adapt it at the read layer
   (`apps/web/src/lib/api.ts`) — never in components.
3. **Org scoping:** `orgId` comes from the authenticated path scope /
   middleware (`requireOrg`), never from a request body. Every query filters
   by it.
4. **The voice engine reads per-agent config only from the dispatch payload.**
   No per-agent state in env or DB lookups inside the engine.
5. **Don't run `drizzle-kit migrate` against Neon** — its migration journal is
   empty (schema was pushed directly). Add tables by committing the schema
   file + applying DDL via psql, like `api_keys` was.
6. **No AI attribution in commits or PRs.** Attribution is disabled in local
   settings; don't add Co-Authored-By trailers or "Generated with" footers.
   `.claude/` is gitignored — keep it that way.

## Run it

```bash
pnpm install                 # after every pull
pnpm dev                     # turbo: web + shared watch (root)
cd apps/api && pnpm dev      # API on :4000
cd apps/voice-engine && uv sync && uv run uvicorn engine.main:app --port 7860
```

Env files (all gitignored, ask a teammate for values):
- `apps/web/.env.local` — `NEXT_PUBLIC_API_URL=http://localhost:4000`
  (unset ⇒ dashboard silently runs on mock data)
- `apps/api/.env` — `DATABASE_URL` (Neon), `BETTER_AUTH_SECRET`, optional
  `MCP_API_KEY`/`MCP_ORG_ID` (dev fallback; real keys come from Settings → API Keys)
- `apps/voice-engine/.env` — `OPENAI_API_KEY`, `DEEPGRAM_API_KEY`,
  `CARTESIA_API_KEY` (+ `PLATFORM_API_URL=http://localhost:4000`)

## Verify before claiming done

```bash
cd apps/web && npx tsc --noEmit        # web typecheck
cd apps/api && pnpm typecheck          # api typecheck
curl -s localhost:4000/health          # api up
curl -s localhost:7860/health          # engine up
```

Then exercise the actual flow you changed (page in browser, MCP tool call,
test call) — a 200 from `curl` on the affected route is the minimum bar.
Auth-gated pages 307 → `/login` without a session cookie; that's not a bug.

## Web design system (apps/web)

Wise-inspired warm: cream `#F6F2E8` canvas, ink text, forest `#163300` +
lime `#9FE870` accents, Inter Tight display. Tokens live in
`src/app/globals.css` — use existing utilities (`.eyebrow`, `.display`,
`.sticker`, `.figure`, status chips) and shadcn primitives; don't invent new
colors or fonts. Lime/deep-forest are UI chrome only — data marks in charts
use the validated mid-greens (see `analytics-view.tsx`).

## Key flows (where to look)

- **Browser test call:** web test console → `POST /calls/:agentId/test-session`
  → API creates call row + dispatches engine → browser WebRTC to engine
  `/api/offer` → end-of-call report → `POST /api/internal/calls/:id/report`.
- **MCP:** `POST /api/mcp` (`apps/api/src/mcp/`) — 10 tools; auth via per-org
  `vaa_…` keys (Settings → API Keys) which resolve the org from the key hash.
  Public bridge: `packages/mcp` (`npx vaani-mcp`).
- **Agent config resolution:** `apps/api/src/lib/config-resolver.ts` — agent +
  version → runnable `AgentConfig` for dispatch.

## Git

Trunk-based on `main`, conventional commits (`type(scope): description`),
feature branches + PRs for larger work. History was rewritten once
(2026-07-14); if your clone predates that, `git fetch && git reset --hard
origin/main`.
