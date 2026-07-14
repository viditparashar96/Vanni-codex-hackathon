import Link from "next/link";
import { ArrowRight, ArrowUpRight, Radio, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { fmtAgo, fmtClock, fmtDuration, fmtInt, fmtMoney } from "@/lib/format";
import { StatusChip } from "@/components/shared/status-chip";

export default async function OverviewPage() {
  const [calls, analytics, credits, agents] = await Promise.all([
    api.getCalls(),
    api.getAnalytics(),
    api.getCredits(),
    api.getAgents(),
  ]);

  const live = calls.filter((c) => c.status === "in_progress");
  const recent = calls.filter((c) => c.status !== "in_progress").slice(0, 8);
  const activeAgents = agents.filter((a) => a.status === "active");
  const today = analytics.trend[analytics.trend.length - 1];

  return (
    <div className="mx-auto max-w-[1200px]">
      {/* greeting */}
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6 pt-8 pb-10">
        <div>
          <div className="eyebrow flex items-center gap-2 text-muted-foreground">
            <span className="pulse-dot" />
            Cedarline Health · Tuesday, July 14
          </div>
          <h1 className="display mt-4 text-[clamp(34px,4.2vw,54px)] text-ink">
            <span className="word-reveal"><span>Good</span></span>{" "}
            <span className="word-reveal"><span>afternoon,</span></span>{" "}
            <span className="word-reveal"><span>Soumya.</span></span>
            <br />
            <span className="word-reveal"><span className="text-muted-foreground/70">Your</span></span>{" "}
            <span className="word-reveal"><span className="text-muted-foreground/70">agents are humming.</span></span>
          </h1>
        </div>
        <div className="flex items-center gap-3 pb-2">
          <Link
            href="/agents/new"
            className="group flex h-12 items-center gap-2.5 rounded-full bg-ink px-6 font-display text-[12.5px] font-extrabold tracking-[0.1em] text-paper uppercase transition-transform hover:-translate-y-0.5"
          >
            Create agent
            <span className="flex size-6 items-center justify-center rounded-full bg-lime text-forest transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="size-3.5 stroke-[2.5]" />
            </span>
          </Link>
          <Link
            href="/composer"
            className="flex h-12 items-center gap-2 rounded-full border-[1.5px] border-ink bg-paper px-5 font-display text-[12.5px] font-extrabold tracking-[0.1em] text-ink uppercase shadow-[3px_3px_0_var(--ink)] transition-transform hover:-translate-y-0.5"
          >
            <Sparkles className="size-4" />
            Composer
          </Link>
        </div>
      </div>

      {/* editorial stat band — no card chrome, hairline separators */}
      <div className="rise-in rise-in-1 grid grid-cols-2 gap-y-8 border-y-[1.5px] border-ink/80 py-7 md:grid-cols-4 md:divide-x md:divide-border">
        <div className="md:pr-8">
          <div className="figure text-[clamp(34px,3.4vw,46px)] leading-none text-ink">
            {fmtInt(today?.calls ?? 0)}
          </div>
          <div className="eyebrow mt-2 text-[10px] text-muted-foreground">Calls today</div>
        </div>
        <div className="md:px-8">
          <div className="figure text-[clamp(34px,3.4vw,46px)] leading-none text-ink">
            0.84<span className="text-[0.5em] text-muted-foreground">s</span>
          </div>
          <div className="eyebrow mt-2 text-[10px] text-muted-foreground">Voice-to-voice p50</div>
        </div>
        <div className="md:px-8">
          <div className="figure text-[clamp(34px,3.4vw,46px)] leading-none text-forest">
            {analytics.avgQaScore.toFixed(1)}
          </div>
          <div className="eyebrow mt-2 text-[10px] text-muted-foreground">Avg QA score · 30d</div>
        </div>
        <div className="md:pl-8">
          <div className="figure text-[clamp(34px,3.4vw,46px)] leading-none text-ink">
            {analytics.successRate.toFixed(1)}%
          </div>
          <div className="eyebrow mt-2 text-[10px] text-muted-foreground">Setup success</div>
        </div>
      </div>

      {/* live now */}
      {live.length > 0 && (
        <section className="rise-in rise-in-2 mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="eyebrow flex items-center gap-2 text-ink">
              <span className="pulse-dot pulse-dot-live" />
              Live now — {live.length} call{live.length > 1 ? "s" : ""}
            </h2>
            <Link href="/history" className="text-[12.5px] font-semibold text-forest underline-offset-4 hover:underline">
              Open monitor
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {live.map((c) => (
              <Link
                key={c.id}
                href={`/history?call=${c.id}`}
                className="group flex items-center gap-4 rounded-2xl border-[1.5px] border-ink bg-forest p-4 text-paper shadow-[4px_4px_0_var(--ink)] transition-transform hover:-translate-y-0.5"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-lime/20">
                  <Radio className="size-4.5 text-lime" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-[14px] font-bold">{c.agentName}</div>
                  <div className="mt-0.5 truncate text-[12px] text-paper/60">
                    {c.direction === "inbound" ? c.from : c.to}
                    {c.currentNode ? ` · node: ${c.currentNode}` : ""}
                  </div>
                </div>
                <div className="figure text-[18px] text-lime">{fmtClock(c.durationSecs)}</div>
                <ArrowUpRight className="size-4 text-paper/40 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* two-column: recent calls + right rail */}
      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_300px]">
        <section className="rise-in rise-in-3 min-w-0">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="eyebrow text-ink">Recent calls</h2>
            <Link href="/history" className="text-[12.5px] font-semibold text-forest underline-offset-4 hover:underline">
              View all
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl border-[1.5px] border-border bg-paper">
            {recent.map((c, i) => (
              <Link
                key={c.id}
                href={`/history?call=${c.id}`}
                className={`flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-cream/70 ${i > 0 ? "border-t border-border" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="truncate text-[13.5px] font-semibold text-ink">{c.agentName}</span>
                    <span className="eyebrow text-[9px] text-muted-foreground">{c.mode.replace("_", " ")}</span>
                  </div>
                  <div className="mt-0.5 truncate text-[12px] text-muted-foreground">{c.summary}</div>
                </div>
                <div className="hidden text-right text-[12px] text-muted-foreground sm:block">
                  <div>{fmtDuration(c.durationSecs)}</div>
                  <div className="mt-0.5">{fmtAgo(c.startedAt)}</div>
                </div>
                {c.qaScore !== null && (
                  <div className="figure hidden w-10 text-right text-[15px] text-ink md:block">{c.qaScore}</div>
                )}
                <StatusChip status={c.status} />
              </Link>
            ))}
          </div>
        </section>

        <aside className="rise-in rise-in-4 space-y-8">
          {/* fleet */}
          <div>
            <h2 className="eyebrow mb-4 text-ink">Fleet</h2>
            <div className="space-y-2.5">
              {activeAgents.slice(0, 4).map((a) => (
                <Link key={a.id} href={`/agents/${a.id}`} className="group flex items-center gap-3">
                  <span className="size-2 shrink-0 rounded-full bg-lime ring-1 ring-forest/30" />
                  <span className="min-w-0 truncate text-[13px] font-medium text-ink group-hover:underline underline-offset-4">
                    {a.name}
                  </span>
                  <span className="ml-auto shrink-0 text-[11.5px] text-muted-foreground">
                    {fmtInt(a.callsLast7d)} / 7d
                  </span>
                </Link>
              ))}
            </div>
            <Link
              href="/agents"
              className="mt-4 inline-block text-[12.5px] font-semibold text-forest underline-offset-4 hover:underline"
            >
              All {agents.filter((a) => a.status !== "archived").length} agents →
            </Link>
          </div>

          {/* improvement backlog */}
          <div className="rounded-2xl bg-brand-yellow/20 p-5">
            <h2 className="eyebrow text-[#8a6d0e]">Fix-first list</h2>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#8a6d0e]/80">
              Most frequent QA failure tags, last 30 days.
            </p>
            <ul className="mt-4 space-y-2">
              {analytics.topTags.slice(0, 3).map((t) => (
                <li key={t.tag} className="flex items-center justify-between text-[12.5px]">
                  <span className="font-medium text-ink">{t.tag.replace(/_/g, " ")}</span>
                  <span className="figure text-[13px] text-[#8a6d0e]">{t.count}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/analytics"
              className="mt-4 inline-block text-[12.5px] font-semibold text-ink underline underline-offset-4"
            >
              See analytics
            </Link>
          </div>

          {/* credits */}
          <div className="rounded-2xl border-[1.5px] border-ink bg-paper p-5 shadow-[4px_4px_0_var(--ink)]">
            <div className="flex items-baseline justify-between">
              <h2 className="eyebrow text-ink">Credits</h2>
              <span className="figure text-[22px] text-forest">{fmtMoney(credits.balance)}</span>
            </div>
            <p className="mt-2 text-[11.5px] text-muted-foreground">
              {fmtMoney(credits.burnLast7d)} burned this week · ~2.7 weeks left at this pace
            </p>
            <Link
              href="/billing"
              className="mt-4 flex h-9 items-center justify-center rounded-full bg-lime font-display text-[11px] font-extrabold tracking-[0.12em] text-forest uppercase transition-transform hover:-translate-y-0.5"
            >
              Top up
            </Link>
          </div>
        </aside>
      </div>

      {/* ticker */}
      <div className="mt-14 overflow-hidden border-t-[1.5px] border-ink/80 py-4" aria-hidden>
        <div className="marquee-track eyebrow text-[10.5px] text-muted-foreground">
          {[0, 1].map((n) => (
            <span key={n} className="flex shrink-0 items-center gap-12">
              <span>{fmtInt(today?.calls ?? 0)} calls today</span>
              <span className="text-lime">●</span>
              <span>p50 latency 0.84s</span>
              <span className="text-lime">●</span>
              <span>{fmtInt(analytics.totalMinutes)} minutes this month</span>
              <span className="text-lime">●</span>
              <span>QA {analytics.avgQaScore.toFixed(1)} / 10</span>
              <span className="text-lime">●</span>
              <span>{activeAgents.length} agents active</span>
              <span className="text-lime">●</span>
              <span>webhooks 100% delivered</span>
              <span className="text-lime">●</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
