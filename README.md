# Vaani — Voice AI Platform

Self-hostable, multi-tenant voice AI agent platform: build, test, deploy, and operate production-grade voice agents over the phone, on the web, and embedded in your own products.

📄 **Start here: [PRD.md](./PRD.md)** — the full product requirements document (architecture, feature specs, data model, API surface, roadmap).

## Repository layout

```
apps/
  web/            # Next.js dashboard (App Router)
  api/            # Express platform API (TypeScript, Drizzle ORM)
  voice-engine/   # Python voice pipeline service (FastAPI, Pipecat)
  docs/           # Mintlify documentation site
packages/
  widget/         # Embeddable voice/chat widget (framework-free)
  shared/         # Shared Zod schemas & TypeScript types
  eslint-config/  # Shared lint config
  tsconfig/       # Shared TS config bases
infra/
  helm/           # Kubernetes Helm chart (+ KEDA autoscaling)
  livekit/        # Self-hosted media plane (SFU + SIP)
  azure/          # Cloud deployment templates
tools/
  webhook-tester/ # Local webhook receiver for development
  scripts/        # Seed, smoke-test, release helpers
```

## Status

🚧 Project initialization — see [PRD.md](./PRD.md) §13 for the delivery roadmap.
