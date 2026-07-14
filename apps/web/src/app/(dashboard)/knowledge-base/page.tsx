import { BookOpen, FileText, RefreshCw, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { fmtAgo, fmtInt } from "@/lib/format";
import { PageHeader } from "@/components/shell/page-header";
import { StatusChip } from "@/components/shared/status-chip";

export default async function KnowledgeBasePage() {
  const kbs = await api.getKnowledgeBases();

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        eyebrow={`${kbs.length} knowledge bases`}
        title="Knowledge bases"
        description="Documents your agents can cite mid-call — parsed, chunked, embedded, and served through the two-speed retrieval path."
        actions={
          <button
            type="button"
            className="group flex h-12 items-center gap-2.5 rounded-full bg-ink px-6 font-display text-[12.5px] font-extrabold tracking-[0.1em] text-paper uppercase transition-transform hover:-translate-y-0.5"
          >
            <BookOpen className="size-4" />
            New knowledge base
          </button>
        }
      />

      <div className="space-y-6">
        {kbs.map((kb, idx) => (
          <section
            key={kb.id}
            className={`rise-in rise-in-${Math.min(idx + 1, 4)} overflow-hidden rounded-2xl border-[1.5px] border-border bg-paper`}
          >
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b-[1.5px] border-border bg-cream/50 px-6 py-4">
              <div>
                <h2 className="font-display text-[16px] font-bold text-ink">{kb.name}</h2>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{kb.description}</p>
              </div>
              <div className="ml-auto flex items-center gap-4 text-[11.5px] text-muted-foreground">
                <span>{kb.boundAgents} agents bound</span>
                <span>updated {fmtAgo(kb.updatedAt)}</span>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-full border-[1.5px] border-ink bg-paper px-3.5 py-1.5 font-display text-[9.5px] font-extrabold tracking-[0.1em] text-ink uppercase shadow-[2px_2px_0_var(--ink)] transition-transform hover:-translate-y-0.5"
                >
                  <Upload className="size-3" />
                  Upload
                </button>
              </div>
            </div>
            <div>
              {kb.documents.map((doc, i) => (
                <div
                  key={doc.id}
                  className={`flex items-center gap-4 px-6 py-3 ${i > 0 ? "border-t border-border/70" : ""}`}
                >
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-ink">{doc.name}</span>
                  <span className="hidden text-[11.5px] text-muted-foreground sm:inline">
                    {doc.sizeKb > 1000 ? `${(doc.sizeKb / 1024).toFixed(1)} MB` : `${doc.sizeKb} KB`}
                  </span>
                  <span className="hidden w-24 text-right text-[11.5px] text-muted-foreground md:inline">
                    {doc.chunks > 0 ? `${fmtInt(doc.chunks)} chunks` : "—"}
                  </span>
                  {doc.status === "failed" && (
                    <button type="button" className="flex items-center gap-1 text-[11px] font-semibold text-forest underline-offset-4 hover:underline">
                      <RefreshCw className="size-3" /> Re-index
                    </button>
                  )}
                  <StatusChip status={doc.status} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
