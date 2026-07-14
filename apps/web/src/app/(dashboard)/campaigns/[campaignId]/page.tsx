import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Pause, Square } from "lucide-react";
import { api } from "@/lib/api";
import { fmtInt } from "@/lib/format";
import { StatusChip } from "@/components/shared/status-chip";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const [campaign, contacts] = await Promise.all([
    api.getCampaign(campaignId),
    api.getCampaignContacts(campaignId),
  ]);
  if (!campaign) notFound();

  const pct = Math.round(((campaign.completed + campaign.failed) / campaign.totalContacts) * 100);
  const funnel = [
    { label: "Dialed", value: campaign.completed + campaign.failed, width: 100 },
    { label: "Connected", value: campaign.completed, width: (campaign.completed / (campaign.completed + campaign.failed)) * 100 },
    { label: "Goal met", value: campaign.goalMet, width: (campaign.goalMet / (campaign.completed + campaign.failed)) * 100 },
  ];

  return (
    <div className="mx-auto max-w-[1200px]">
      {/* header */}
      <div className="rise-in flex flex-wrap items-end justify-between gap-x-8 gap-y-4 pt-6 pb-8">
        <div className="flex items-start gap-4">
          <Link
            href="/campaigns"
            className="mt-1 flex size-9 items-center justify-center rounded-full border-[1.5px] border-ink bg-paper shadow-[2px_2px_0_var(--ink)] transition-transform hover:-translate-x-0.5"
            aria-label="Back to campaigns"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <div className="eyebrow text-muted-foreground">
              {campaign.agentName} · {campaign.callerNumber}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="display text-[clamp(26px,3vw,36px)] text-ink">{campaign.name}</h1>
              <StatusChip status={campaign.status} />
            </div>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              {campaign.window} · {campaign.concurrency} concurrent lines · retry on no-answer ×2
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="flex h-11 items-center gap-2 rounded-full border-[1.5px] border-ink bg-brand-yellow px-5 font-display text-[11px] font-extrabold tracking-[0.1em] text-ink uppercase shadow-[3px_3px_0_var(--ink)] transition-transform hover:-translate-y-0.5"
          >
            <Pause className="size-3.5" />
            {campaign.status === "paused" ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            className="flex h-11 items-center gap-2 rounded-full border-[1.5px] border-ink bg-paper px-5 font-display text-[11px] font-extrabold tracking-[0.1em] text-destructive uppercase shadow-[3px_3px_0_var(--ink)] transition-transform hover:-translate-y-0.5"
          >
            <Square className="size-3.5" />
            Stop
          </button>
        </div>
      </div>

      {/* progress + funnel */}
      <div className="rise-in rise-in-1 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border-[1.5px] border-border bg-paper p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="display text-[16px] text-ink">Progress</h2>
            <span className="figure text-[22px] text-ink">{pct}%</span>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-sand">
            <div className="h-full rounded-full bg-forest" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-y-4 sm:grid-cols-4">
            {(
              [
                [campaign.totalContacts, "contacts"],
                [campaign.completed, "completed"],
                [campaign.inProgress, "calling now"],
                [campaign.failed, "failed"],
              ] as const
            ).map(([v, l]) => (
              <div key={l}>
                <div className="figure text-[20px] text-ink">{fmtInt(v)}</div>
                <div className="mt-0.5 text-[10.5px] text-muted-foreground">{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border-[1.5px] border-border bg-paper p-6">
          <h2 className="display mb-4 text-[16px] text-ink">Funnel</h2>
          <div className="space-y-3">
            {funnel.map((f) => (
              <div key={f.label}>
                <div className="flex items-baseline justify-between text-[12px]">
                  <span className="font-semibold text-ink">{f.label}</span>
                  <span className="figure text-[13px] text-ink">{fmtInt(f.value)}</span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-sand">
                  <div className="h-full rounded-full bg-[#3a6b14]" style={{ width: `${f.width}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* contacts */}
      <section className="rise-in rise-in-2 mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="eyebrow text-ink">Contacts</h2>
          <button type="button" className="flex items-center gap-1.5 text-[12.5px] font-semibold text-forest underline-offset-4 hover:underline">
            <Download className="size-3.5" />
            Export results CSV
          </button>
        </div>
        <div className="overflow-x-auto rounded-2xl border-[1.5px] border-border bg-paper">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b-[1.5px] border-border">
                {["Contact", "Phone", "Attempts", "Outcome", "Status"].map((h) => (
                  <th key={h} className="eyebrow px-5 py-3.5 text-[9.5px] text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contacts.map((ct) => (
                <tr key={ct.id} className="border-b border-border/70 last:border-0">
                  <td className="px-5 py-3 text-[13px] font-semibold text-ink">{ct.name}</td>
                  <td className="px-5 py-3 font-mono text-[12px] text-muted-foreground">{ct.phone}</td>
                  <td className="px-5 py-3 text-[12.5px] text-ink">{ct.attempts}</td>
                  <td className="px-5 py-3 text-[12.5px] text-muted-foreground">{ct.outcome ?? "—"}</td>
                  <td className="px-5 py-3"><StatusChip status={ct.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
