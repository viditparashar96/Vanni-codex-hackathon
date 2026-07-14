"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download } from "lucide-react";
import { toast } from "sonner";
import type { AnalyticsSummary } from "@/types";
import { fmtInt, fmtMoney } from "@/lib/format";
import { PageHeader } from "@/components/shell/page-header";
import { cn } from "@/lib/utils";

/* Data-mark palette — validated ≥3:1 on cream (dataviz six-checks).
   Brand lime/forest stay UI chrome; marks use these. */
const MARK = "#3a6b14";
const SENTIMENT = {
  positive: "#4a7a20",
  neutral: "#9c8f66",
  negative: "#d14a24",
} as const;

const RANGES = ["7d", "30d", "90d"] as const;

function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border-[1.5px] border-ink bg-paper px-3.5 py-2.5 shadow-[3px_3px_0_var(--ink)]">
      <div className="eyebrow text-[9px] text-muted-foreground">{label}</div>
      <div className="figure mt-1 text-[16px] text-ink">
        {fmtInt(payload[0].value)}
        {unit && <span className="ml-1 text-[11px] font-semibold text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

function Section({ title, note, children, className }: { title: string; note?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border-[1.5px] border-border bg-paper p-6", className)}>
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2 className="display text-[16px] text-ink">{title}</h2>
        {note && <span className="text-[11px] text-muted-foreground">{note}</span>}
      </div>
      {children}
    </section>
  );
}

export function AnalyticsView({ data }: { data: AnalyticsSummary }) {
  const [range, setRange] = React.useState<(typeof RANGES)[number]>("30d");
  const trend = range === "7d" ? data.trend.slice(-7) : data.trend;
  const axisTick = { fontSize: 10.5, fill: "#6d7378", fontFamily: "var(--font-inter)" };

  const sentimentTotal = data.sentiment.positive + data.sentiment.neutral + data.sentiment.negative;
  const maxTag = Math.max(...data.topTags.map((t) => t.count));
  const maxAgentCalls = Math.max(...data.perAgent.map((a) => a.calls));

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        eyebrow="Last 30 days vs previous period"
        title="Analytics"
        description="Volume, quality and cost across every agent — the failure-tag list is your improvement backlog."
        actions={
          <button
            type="button"
            onClick={() => toast.success("Export started", { description: "Full analytics CSV on its way." })}
            className="flex h-11 items-center gap-2 rounded-full border-[1.5px] border-ink bg-paper px-5 font-display text-[11px] font-extrabold tracking-[0.1em] text-ink uppercase shadow-[3px_3px_0_var(--ink)] transition-transform hover:-translate-y-0.5"
          >
            <Download className="size-4" />
            Export
          </button>
        }
      />

      {/* filter row */}
      <div className="rise-in rise-in-1 mb-6 flex items-center gap-2">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={cn(
              "rounded-full border-[1.5px] px-4 py-1.5 font-display text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-all",
              range === r
                ? "border-ink bg-ink text-paper"
                : "border-border bg-paper text-muted-foreground hover:border-ink hover:text-ink",
            )}
          >
            {r}
          </button>
        ))}
      </div>

      {/* stat band */}
      <div className="rise-in rise-in-1 grid grid-cols-2 gap-y-6 border-y-[1.5px] border-ink/80 py-6 sm:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-border">
        {(
          [
            [fmtInt(data.totalCalls), "calls", "+12.4%"],
            [fmtInt(data.totalMinutes), "minutes", "+9.1%"],
            [`${data.successRate}%`, "setup success", "+0.3 pt"],
            [data.avgQaScore.toFixed(1), "avg QA / 10", "+0.2"],
            [fmtMoney(data.totalCost), "provider + fees", "+8.2%"],
          ] as const
        ).map(([v, l, delta], i) => (
          <div key={l} className={cn("lg:px-6", i === 0 && "lg:pl-0")}>
            <div className="figure text-[clamp(24px,2.4vw,32px)] leading-none text-ink">{v}</div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="eyebrow text-[9px] text-muted-foreground">{l}</span>
              <span className="text-[10.5px] font-bold text-forest">{delta}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* call volume */}
        <Section title="Call volume" note={`daily · ${range}`} className="rise-in rise-in-2">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={trend} margin={{ top: 4, right: 0, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e9e5d8" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={axisTick} interval="preserveStartEnd" minTickGap={28} />
              <YAxis tickLine={false} axisLine={false} tick={axisTick} width={44} />
              <Tooltip content={<ChartTooltip unit="calls" />} cursor={{ fill: "rgba(22,51,0,0.06)" }} />
              <Bar dataKey="calls" fill={MARK} radius={[4, 4, 0, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </Section>

        {/* QA trend */}
        <Section title="QA score" note="daily average · scale 1–10" className="rise-in rise-in-2">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trend} margin={{ top: 8, right: 8, left: -26, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e9e5d8" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={axisTick} interval="preserveStartEnd" minTickGap={28} />
              <YAxis domain={[6, 10]} tickLine={false} axisLine={false} tick={axisTick} width={44} />
              <Tooltip content={<ChartTooltip unit="/ 10" />} cursor={{ stroke: "#0e0f0c", strokeDasharray: "3 3" }} />
              <Line type="monotone" dataKey="qaScore" stroke={MARK} strokeWidth={2} dot={false} activeDot={{ r: 4.5, strokeWidth: 2, stroke: "#fffdf8" }} />
            </LineChart>
          </ResponsiveContainer>
        </Section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* leaderboard */}
        <Section title="Agent leaderboard" note="calls · QA · cost" className="rise-in rise-in-3">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Agent", "Calls", "QA", "Success", "Cost"].map((h, i) => (
                  <th key={h} className={cn("eyebrow pb-2.5 text-[9px] text-muted-foreground", i > 0 && "text-right")}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.perAgent.map((a) => (
                <tr key={a.agentId} className="border-b border-border/60 last:border-0">
                  <td className="max-w-[220px] py-3 pr-4">
                    <div className="truncate text-[13px] font-semibold text-ink">{a.name}</div>
                    <div className="mt-1.5 h-1.5 max-w-[160px] overflow-hidden rounded-full bg-sand">
                      <div className="h-full rounded-full" style={{ width: `${(a.calls / maxAgentCalls) * 100}%`, background: MARK }} />
                    </div>
                  </td>
                  <td className="figure py-3 text-right text-[14px] text-ink">{fmtInt(a.calls)}</td>
                  <td className={cn("figure py-3 text-right text-[14px]", a.avgQa >= 8.5 ? "text-forest" : "text-ink")}>{a.avgQa}</td>
                  <td className="py-3 text-right font-mono text-[12px] text-muted-foreground">{a.successRate}%</td>
                  <td className="py-3 text-right font-mono text-[12px] text-muted-foreground">{fmtMoney(a.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <div className="space-y-6">
          {/* sentiment */}
          <Section title="Sentiment mix" note="30d" className="rise-in rise-in-3">
            <div className="flex h-9 gap-[2px] overflow-hidden rounded-lg">
              {(["positive", "neutral", "negative"] as const).map((k) => (
                <div
                  key={k}
                  className="flex items-center justify-center"
                  style={{ width: `${(data.sentiment[k] / sentimentTotal) * 100}%`, background: SENTIMENT[k] }}
                >
                  <span className="font-display text-[11px] font-extrabold text-white">{data.sentiment[k]}%</span>
                </div>
              ))}
            </div>
            <div className="mt-3.5 flex flex-wrap gap-x-5 gap-y-1.5">
              {(["positive", "neutral", "negative"] as const).map((k) => (
                <span key={k} className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                  <span className="size-2.5 rounded-[3px]" style={{ background: SENTIMENT[k] }} />
                  {k}
                </span>
              ))}
            </div>
          </Section>

          {/* failure tags */}
          <Section title="Failure tags" note="QA-cited · 30d" className="rise-in rise-in-4">
            <ul className="space-y-3">
              {data.topTags.map((t) => (
                <li key={t.tag}>
                  <div className="flex items-baseline justify-between text-[12.5px]">
                    <span className="font-mono font-medium text-ink">{t.tag.replace(/_/g, " ")}</span>
                    <span className="figure text-[13px] text-ink">{t.count}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sand">
                    <div className="h-full rounded-full" style={{ width: `${(t.count / maxTag) * 100}%`, background: MARK }} />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
              Tags are cited with transcript evidence — open any call in History to see exactly where it happened.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
