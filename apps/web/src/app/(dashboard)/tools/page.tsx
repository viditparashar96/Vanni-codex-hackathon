import { Plus, Wrench } from "lucide-react";
import { api } from "@/lib/api";
import { fmtAgo } from "@/lib/format";
import { PageHeader } from "@/components/shell/page-header";

const METHOD_STYLE: Record<string, string> = {
  GET: "bg-lime/35 text-forest",
  POST: "bg-brand-yellow/30 text-[#8a6d0e]",
  PUT: "bg-brand-orange/15 text-brand-orange",
  PATCH: "bg-brand-orange/15 text-brand-orange",
  DELETE: "bg-destructive/12 text-destructive",
};

export default async function ToolsPage() {
  const tools = await api.getTools();

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        eyebrow={`${tools.length} in the library`}
        title="Tools"
        description="HTTP functions your agents can call mid-conversation — the description tells the model when to reach for each one."
        actions={
          <button
            type="button"
            className="group flex h-12 items-center gap-2.5 rounded-full bg-ink px-6 font-display text-[12.5px] font-extrabold tracking-[0.1em] text-paper uppercase transition-transform hover:-translate-y-0.5"
          >
            <Plus className="size-4" />
            New tool
          </button>
        }
      />

      <div className="rise-in rise-in-1 overflow-hidden rounded-2xl border-[1.5px] border-border bg-paper">
        {tools.map((t, i) => (
          <div
            key={t.id}
            className={`group flex flex-wrap items-center gap-x-5 gap-y-2 px-6 py-4.5 transition-colors hover:bg-cream/60 ${i > 0 ? "border-t border-border" : ""}`}
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sand">
              <Wrench className="size-4.5 text-ink" />
            </div>
            <div className="min-w-0 flex-1 basis-60">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[14px] font-semibold text-ink">{t.name}</span>
                <span className={`rounded-md px-2 py-0.5 font-display text-[9px] font-extrabold tracking-[0.1em] ${METHOD_STYLE[t.method]}`}>
                  {t.method}
                </span>
              </div>
              <div className="mt-0.5 truncate text-[12px] text-muted-foreground">{t.description}</div>
            </div>
            <div className="hidden min-w-0 basis-64 truncate font-mono text-[11.5px] text-muted-foreground lg:block">{t.url}</div>
            <div className="hidden text-[11.5px] text-muted-foreground sm:block">
              {t.authType === "none" ? "no auth" : t.authType.replace("_", " ")} · {t.timeoutMs / 1000}s
            </div>
            <div className="w-24 text-right text-[11.5px] text-muted-foreground">
              {t.usedByAgents} agents · {fmtAgo(t.updatedAt)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
