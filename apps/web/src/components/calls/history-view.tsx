"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Download, Radio } from "lucide-react";
import type { Call } from "@/types";
import { fmtAgo, fmtClock, fmtDuration, fmtMoney } from "@/lib/format";
import { PageHeader } from "@/components/shell/page-header";
import { StatusChip } from "@/components/shared/status-chip";
import { CallDetail } from "@/components/calls/call-detail";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function HistoryView({ calls }: { calls: Call[] }) {
  const params = useSearchParams();
  const [agentFilter, setAgentFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [modeFilter, setModeFilter] = React.useState("all");
  const [openCallId, setOpenCallId] = React.useState<string | null>(params.get("call"));

  const agents = [...new Set(calls.map((c) => c.agentName))];
  const live = calls.filter((c) => c.status === "in_progress");

  const filtered = calls.filter(
    (c) =>
      c.status !== "in_progress" &&
      (agentFilter === "all" || c.agentName === agentFilter) &&
      (statusFilter === "all" || c.status === statusFilter) &&
      (modeFilter === "all" || c.mode === modeFilter),
  );

  const openCall = calls.find((c) => c.id === openCallId) ?? null;

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        eyebrow={`${calls.length} calls · last 14 days`}
        title="Call history"
        description="Every conversation with transcript, recording, metrics, QA and cost — live calls stream at the top."
        actions={
          <button
            type="button"
            onClick={() => toast.success("Export started", { description: "CSV lands in your email in ~1 minute." })}
            className="flex h-11 items-center gap-2 rounded-full border-[1.5px] border-ink bg-paper px-5 font-display text-[11px] font-extrabold tracking-[0.1em] text-ink uppercase shadow-[3px_3px_0_var(--ink)] transition-transform hover:-translate-y-0.5"
          >
            <Download className="size-4" />
            Export CSV
          </button>
        }
      />

      {/* live strip */}
      {live.length > 0 && (
        <div className="rise-in rise-in-1 mb-8 grid gap-3 md:grid-cols-2">
          {live.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setOpenCallId(c.id)}
              className="group flex items-center gap-4 rounded-2xl border-[1.5px] border-ink bg-forest p-4 text-left text-paper shadow-[4px_4px_0_var(--ink)] transition-transform hover:-translate-y-0.5"
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
              <span className="eyebrow flex items-center gap-1.5 text-[9px] text-brand-orange">
                <span className="pulse-dot pulse-dot-live" /> Live
              </span>
              <span className="figure text-[18px] text-lime">{fmtClock(c.durationSecs)}</span>
            </button>
          ))}
        </div>
      )}

      {/* filters */}
      <div className="rise-in rise-in-2 mb-5 flex flex-wrap items-center gap-2.5">
        {[
          { value: agentFilter, set: setAgentFilter, all: "All agents", options: agents },
          { value: statusFilter, set: setStatusFilter, all: "All statuses", options: ["completed", "failed", "no_answer", "voicemail"] },
          { value: modeFilter, set: setModeFilter, all: "All modes", options: ["phone", "web_test", "widget", "chat"] },
        ].map((f, i) => (
          <Select key={i} value={f.value} onValueChange={f.set}>
            <SelectTrigger className="h-10 w-auto min-w-36 rounded-full border-[1.5px] border-border bg-paper px-4 text-[12.5px] font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{f.all}</SelectItem>
              {f.options.map((o) => (
                <SelectItem key={o} value={o}>
                  {o.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
        <span className="ml-auto text-[12px] text-muted-foreground">{filtered.length} results</span>
      </div>

      {/* table */}
      <div className="rise-in rise-in-3 overflow-x-auto rounded-2xl border-[1.5px] border-border bg-paper">
        <table className="w-full min-w-[880px] text-left">
          <thead>
            <tr className="border-b-[1.5px] border-border">
              {["Agent / summary", "Caller", "Mode", "Duration", "QA", "Cost", "Status", "When"].map((h) => (
                <th key={h} className="eyebrow px-5 py-3.5 text-[9.5px] text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr
                key={c.id}
                onClick={() => setOpenCallId(c.id)}
                className="cursor-pointer border-b border-border/70 transition-colors last:border-0 hover:bg-cream/60"
              >
                <td className="max-w-[300px] px-5 py-3.5">
                  <div className="truncate text-[13px] font-semibold text-ink">{c.agentName}</div>
                  <div className="truncate text-[11.5px] text-muted-foreground">{c.summary}</div>
                </td>
                <td className="px-5 py-3.5 font-mono text-[12px] whitespace-nowrap text-muted-foreground">
                  {c.direction === "inbound" ? c.from : c.to}
                </td>
                <td className="px-5 py-3.5">
                  <span className="eyebrow text-[9px] text-muted-foreground">{c.mode.replace("_", " ")}</span>
                </td>
                <td className="px-5 py-3.5 text-[12.5px] whitespace-nowrap text-ink">{fmtDuration(c.durationSecs)}</td>
                <td className={cn("figure px-5 py-3.5 text-[14px]", c.qaScore && c.qaScore >= 8.5 ? "text-forest" : "text-ink")}>
                  {c.qaScore ?? "—"}
                </td>
                <td className="px-5 py-3.5 font-mono text-[12px] text-muted-foreground">{fmtMoney(c.cost, 3)}</td>
                <td className="px-5 py-3.5">
                  <StatusChip status={c.status} />
                </td>
                <td className="px-5 py-3.5 text-[12px] whitespace-nowrap text-muted-foreground">{fmtAgo(c.startedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* detail drawer */}
      <Sheet open={!!openCall} onOpenChange={(o) => !o && setOpenCallId(null)}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto border-l-[1.5px] border-ink bg-cream p-0 sm:max-w-[640px]">
          <SheetTitle className="sr-only">Call detail</SheetTitle>
          {openCall && <CallDetail call={openCall} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}
