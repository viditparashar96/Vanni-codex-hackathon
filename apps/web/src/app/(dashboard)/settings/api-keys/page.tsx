import { Webhook } from "lucide-react";
import { api } from "@/lib/api";
import { ApiKeysManager } from "@/components/settings/api-keys-manager";

const WEBHOOK_ENDPOINTS = [
  { url: "https://ehr.acme.example/hooks/vaani", events: ["call.completed", "call.failed"], healthy: true },
  { url: "https://desk.acme.example/hooks/credits", events: ["credits.low"], healthy: true },
];

export default async function ApiKeysPage() {
  const keys = await api.getApiKeys();

  return (
    <div className="space-y-8">
      {/* api keys */}
      <div className="rise-in">
        <ApiKeysManager keys={keys} />
      </div>

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
