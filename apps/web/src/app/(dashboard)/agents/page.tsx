import Link from "next/link";
import { ArrowRight, FolderOpen, Phone, Waypoints, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { fmtAgo, fmtInt } from "@/lib/format";
import { PageHeader } from "@/components/shell/page-header";
import { StatusChip } from "@/components/shared/status-chip";

export default async function AgentsPage() {
  const agents = await api.getAgents();
  const folders = [...new Set(agents.map((a) => a.folder).filter(Boolean))] as string[];

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        eyebrow={`${agents.filter((a) => a.status === "active").length} active · ${agents.length} total`}
        title="Agents"
        description="Every voice agent in your workspace — drafts, published versions, and the numbers they answer."
        actions={
          <Link
            href="/agents/new"
            className="group flex h-12 items-center gap-2.5 rounded-full bg-ink px-6 font-display text-[12.5px] font-extrabold tracking-[0.1em] text-paper uppercase transition-transform hover:-translate-y-0.5"
          >
            New agent
            <span className="flex size-6 items-center justify-center rounded-full bg-lime text-forest transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="size-3.5 stroke-[2.5]" />
            </span>
          </Link>
        }
      />

      {/* folder chips */}
      <div className="rise-in rise-in-1 mb-6 flex flex-wrap items-center gap-2">
        <span className="sticker">All</span>
        {folders.map((f) => (
          <span
            key={f}
            className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-border bg-paper px-3.5 py-1.5 font-display text-[10.5px] font-bold tracking-[0.12em] text-muted-foreground uppercase transition-colors hover:border-ink hover:text-ink"
          >
            <FolderOpen className="size-3" />
            {f}
          </span>
        ))}
      </div>

      {/* agent rows */}
      <div className="rise-in rise-in-2 space-y-3">
        {agents.map((a) => (
          <div
            key={a.id}
            className={`group relative flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border-[1.5px] bg-paper p-5 transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-[4px_4px_0_var(--ink)] ${
              a.status === "archived" ? "border-border opacity-55" : "border-border"
            }`}
          >
            <div
              className={`flex size-11 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-ink ${
                a.type === "flow" ? "bg-brand-yellow" : "bg-lime"
              }`}
            >
              {a.type === "flow" ? <Waypoints className="size-5 text-ink" /> : <Zap className="size-5 text-ink" />}
            </div>

            <div className="min-w-0 flex-1 basis-56">
              <div className="flex items-center gap-2.5">
                <Link href={`/agents/${a.id}`} className="truncate font-display text-[16px] font-bold text-ink after:absolute after:inset-0">
                  {a.name}
                </Link>
                <span className="eyebrow shrink-0 text-[9px] text-muted-foreground">{a.type}</span>
              </div>
              <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{a.description}</p>
            </div>

            <div className="hidden shrink-0 text-[12px] text-muted-foreground lg:block">
              <div className="font-medium text-ink">{a.voice.llm.split("/")[1]}</div>
              <div className="mt-0.5">{a.voice.voice} · {a.voice.language}</div>
            </div>

            <div className="hidden shrink-0 items-center gap-1.5 text-[12px] text-muted-foreground md:flex">
              <Phone className="size-3.5" />
              {a.phoneNumbers.length > 0 ? a.phoneNumbers[0] : "No number"}
            </div>

            <div className="hidden w-20 shrink-0 text-right md:block">
              <div className="figure text-[16px] text-ink">{fmtInt(a.callsLast7d)}</div>
              <div className="text-[10.5px] text-muted-foreground">calls / 7d</div>
            </div>

            <div className="hidden w-14 shrink-0 text-right sm:block">
              <div className={`figure text-[16px] ${a.avgQaScore && a.avgQaScore >= 8.5 ? "text-forest" : "text-ink"}`}>
                {a.avgQaScore ?? "—"}
              </div>
              <div className="text-[10.5px] text-muted-foreground">QA</div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <StatusChip status={a.status} />
              <span className="hidden text-[11px] text-muted-foreground xl:inline">v{a.version} · {fmtAgo(a.updatedAt)}</span>
            </div>

            <div className="relative z-10 flex shrink-0 items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
              {a.type === "flow" && (
                <Link
                  href={`/agents/${a.id}/flow`}
                  className="rounded-full border-[1.5px] border-ink bg-paper px-3.5 py-1.5 font-display text-[10px] font-extrabold tracking-[0.1em] uppercase transition-colors hover:bg-brand-yellow"
                >
                  Flow
                </Link>
              )}
              <Link
                href={`/agents/${a.id}/test`}
                className="rounded-full border-[1.5px] border-ink bg-lime px-3.5 py-1.5 font-display text-[10px] font-extrabold tracking-[0.1em] text-forest uppercase transition-transform hover:-translate-y-0.5"
              >
                Test
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
