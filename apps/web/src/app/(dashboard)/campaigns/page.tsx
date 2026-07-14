import Link from "next/link";
import { ArrowRight, Megaphone } from "lucide-react";
import { api } from "@/lib/api";
import { fmtInt } from "@/lib/format";
import { PageHeader } from "@/components/shell/page-header";
import { StatusChip } from "@/components/shared/status-chip";

export default async function CampaignsPage() {
  const campaigns = await api.getCampaigns();

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        eyebrow={`${campaigns.filter((c) => c.status === "running").length} running`}
        title="Campaigns"
        description="Outbound at scale — contact lists, calling windows, retries, and per-contact outcomes."
        actions={
          <Link
            href="/campaigns/new"
            className="group flex h-12 items-center gap-2.5 rounded-full bg-ink px-6 font-display text-[12.5px] font-extrabold tracking-[0.1em] text-paper uppercase transition-transform hover:-translate-y-0.5"
          >
            New campaign
            <span className="flex size-6 items-center justify-center rounded-full bg-lime text-forest transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="size-3.5 stroke-[2.5]" />
            </span>
          </Link>
        }
      />

      <div className="space-y-4">
        {campaigns.map((c, idx) => {
          const pct = Math.round(((c.completed + c.failed) / c.totalContacts) * 100);
          const goalPct = c.completed > 0 ? Math.round((c.goalMet / c.completed) * 100) : 0;
          return (
            <Link
              key={c.id}
              href={`/campaigns/${c.id}`}
              className={`rise-in rise-in-${Math.min(idx + 1, 4)} block rounded-2xl border-[1.5px] border-border bg-paper p-6 transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-[4px_4px_0_var(--ink)]`}
            >
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-ink ${c.status === "running" ? "bg-lime" : "bg-sand"}`}>
                  <Megaphone className="size-5 text-ink" />
                </div>
                <div className="min-w-0 flex-1 basis-52">
                  <div className="flex items-center gap-3">
                    <span className="truncate font-display text-[16px] font-bold text-ink">{c.name}</span>
                    <StatusChip status={c.status} />
                  </div>
                  <div className="mt-0.5 text-[12px] text-muted-foreground">
                    {c.agentName} · {c.callerNumber} · {c.window} · {c.concurrency} lines
                  </div>
                </div>
                <div className="hidden w-24 text-right sm:block">
                  <div className="figure text-[17px] text-ink">{fmtInt(c.totalContacts)}</div>
                  <div className="text-[10.5px] text-muted-foreground">contacts</div>
                </div>
                <div className="hidden w-24 text-right sm:block">
                  <div className="figure text-[17px] text-forest">{goalPct}%</div>
                  <div className="text-[10.5px] text-muted-foreground">goal met</div>
                </div>
                <div className="hidden w-20 text-right md:block">
                  <div className="figure text-[17px] text-ink">{fmtInt(c.failed)}</div>
                  <div className="text-[10.5px] text-muted-foreground">failed</div>
                </div>
              </div>
              {/* progress */}
              <div className="mt-4 flex items-center gap-3">
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-sand">
                  <div
                    className={`h-full rounded-full ${c.status === "running" ? "bg-forest" : c.status === "paused" ? "bg-brand-yellow" : "bg-forest/45"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="figure w-11 text-right text-[13px] text-ink">{pct}%</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
