import { Phone, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { StatusChip } from "@/components/shared/status-chip";

const CARRIERS = [
  { name: "Twilio", status: "connected", detail: "BYON · inbound + outbound + SMS" },
  { name: "Plivo", status: "connected", detail: "Marketplace + BYON · inbound + outbound + SMS" },
  { name: "Telnyx", status: "available", detail: "Beta · outbound" },
  { name: "Exotel", status: "available", detail: "Beta · outbound" },
];

export default async function TelephonyPage() {
  const numbers = await api.getPhoneNumbers();

  return (
    <div className="space-y-8">
      {/* carriers */}
      <section className="rise-in">
        <h2 className="eyebrow mb-4 text-ink">Carriers</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {CARRIERS.map((c) => (
            <div
              key={c.name}
              className={`flex items-center gap-4 rounded-2xl border-[1.5px] p-5 ${
                c.status === "connected" ? "border-ink bg-paper shadow-[3px_3px_0_var(--ink)]" : "border-dashed border-border bg-paper/60"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="font-display text-[15px] font-bold text-ink">{c.name}</div>
                <div className="mt-0.5 text-[11.5px] text-muted-foreground">{c.detail}</div>
              </div>
              {c.status === "connected" ? (
                <span className="eyebrow flex items-center gap-1.5 text-[9px] text-forest">
                  <span className="size-1.5 rounded-full bg-lime ring-1 ring-forest/40" /> Connected
                </span>
              ) : (
                <button type="button" className="rounded-full border-[1.5px] border-border px-4 py-1.5 font-display text-[9.5px] font-extrabold tracking-[0.1em] text-muted-foreground uppercase transition-colors hover:border-ink hover:text-ink">
                  Connect
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* numbers */}
      <section className="rise-in rise-in-1">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="eyebrow text-ink">Phone numbers</h2>
          <button
            type="button"
            className="flex h-10 items-center gap-2 rounded-full bg-ink px-5 font-display text-[10.5px] font-extrabold tracking-[0.1em] text-paper uppercase transition-transform hover:-translate-y-0.5"
          >
            <Plus className="size-3.5" />
            Buy or import
          </button>
        </div>
        <div className="overflow-hidden rounded-2xl border-[1.5px] border-border bg-paper">
          {numbers.map((n, i) => (
            <div key={n.id} className={`flex flex-wrap items-center gap-x-5 gap-y-2 px-6 py-4 ${i > 0 ? "border-t border-border/70" : ""}`}>
              <span className="flex size-9 items-center justify-center rounded-full bg-sand">
                <Phone className="size-4 text-ink" />
              </span>
              <span className="w-44 font-mono text-[13.5px] font-semibold text-ink">{n.e164}</span>
              <span className="eyebrow w-16 text-[9px] text-muted-foreground">{n.provider}</span>
              <span className="hidden w-24 text-[11px] text-muted-foreground sm:inline">
                {n.capabilities.join(" + ")} · {n.source}
              </span>
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted-foreground">
                {n.assignedAgentName ? (
                  <>→ <span className="font-medium text-ink">{n.assignedAgentName}</span></>
                ) : (
                  "Unassigned — answers with fallback message"
                )}
              </span>
              <StatusChip status={n.status} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
