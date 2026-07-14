import { KeyRound, Plus, Webhook } from "lucide-react";
import { api } from "@/lib/api";
import { fmtAgo, fmtDay } from "@/lib/format";

const WEBHOOK_ENDPOINTS = [
  { url: "https://ehr.acme.example/hooks/vaani", events: ["call.completed", "call.failed"], healthy: true },
  { url: "https://desk.acme.example/hooks/credits", events: ["credits.low"], healthy: true },
];

export default async function ApiKeysPage() {
  const keys = await api.getApiKeys();

  return (
    <div className="space-y-8">
      {/* api keys */}
      <section className="rise-in">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="eyebrow text-ink">API keys</h2>
          <button
            type="button"
            className="flex h-10 items-center gap-2 rounded-full bg-ink px-5 font-display text-[10.5px] font-extrabold tracking-[0.1em] text-paper uppercase transition-transform hover:-translate-y-0.5"
          >
            <Plus className="size-3.5" />
            Create key
          </button>
        </div>
        <div className="overflow-hidden rounded-2xl border-[1.5px] border-border bg-paper">
          {keys.map((k, i) => (
            <div key={k.id} className={`flex flex-wrap items-center gap-x-5 gap-y-2 px-6 py-4 ${i > 0 ? "border-t border-border/70" : ""} ${k.name.includes("revoked") ? "opacity-50" : ""}`}>
              <span className="flex size-9 items-center justify-center rounded-full bg-sand">
                <KeyRound className="size-4 text-ink" />
              </span>
              <div className="min-w-0 flex-1 basis-44">
                <div className="text-[13.5px] font-semibold text-ink">{k.name}</div>
                <div className="font-mono text-[11.5px] text-muted-foreground">{k.prefix}•••••••••••••</div>
              </div>
              <div className="hidden flex-wrap gap-1.5 md:flex">
                {k.scopes.map((s) => (
                  <span key={s} className="rounded-md bg-cream px-2 py-0.5 font-mono text-[10px] text-muted-foreground">{s}</span>
                ))}
              </div>
              <div className="w-36 text-right text-[11px] text-muted-foreground">
                {k.lastUsedAt ? `used ${fmtAgo(k.lastUsedAt)}` : "never used"}
                <br />
                created {fmtDay(k.createdAt)}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11.5px] text-muted-foreground">
          Keys are hashed at rest, shown once at creation, and scoped per resource. The MCP server authenticates with the same keys —
          point Claude or Cursor at <span className="font-mono">/api/mcp</span>.
        </p>
      </section>

      {/* webhooks */}
      <section className="rise-in rise-in-1">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="eyebrow flex items-center gap-2 text-ink">
            <Webhook className="size-3.5" />
            Webhook endpoints
          </h2>
          <button type="button" className="text-[12.5px] font-semibold text-forest underline-offset-4 hover:underline">
            + Add endpoint
          </button>
        </div>
        <div className="space-y-2.5">
          {WEBHOOK_ENDPOINTS.map((w) => (
            <div key={w.url} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border-[1.5px] border-border bg-paper px-5 py-4">
              <span className="min-w-0 flex-1 basis-64 truncate font-mono text-[12.5px] text-ink">{w.url}</span>
              <div className="flex flex-wrap gap-1.5">
                {w.events.map((e) => (
                  <span key={e} className="rounded-md bg-lime/25 px-2 py-0.5 font-mono text-[10px] text-forest">{e}</span>
                ))}
              </div>
              <span className="eyebrow flex items-center gap-1.5 text-[9px] text-forest">
                <span className="size-1.5 rounded-full bg-lime ring-1 ring-forest/40" />
                100% delivered · 7d
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11.5px] text-muted-foreground">
          Deliveries are HMAC-signed and retried with exponential backoff. Full delivery log with payload inspection ships with the backend.
        </p>
      </section>
    </div>
  );
}
