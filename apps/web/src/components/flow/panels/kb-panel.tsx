"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen, Database, ExternalLink, FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { KnowledgeBase } from "@/types";
import type { KnowledgeBaseBinding } from "@/lib/flow-contract";
import { RetrievalSliders } from "@/components/flow/panels/kb-node-selector";

interface KbPanelProps {
  /** Org knowledge bases (loaded server-side and passed down — no fetch here). */
  knowledgeBases: KnowledgeBase[];
  /** Global bindings available at every node for RAG retrieval. */
  bindings: KnowledgeBaseBinding[];
  onChange: (bindings: KnowledgeBaseBinding[]) => void;
  description?: string;
}

/** Chunk count for a KB = sum of its documents' chunk counts. */
function chunkCount(kb: KnowledgeBase): number {
  return kb.documents.reduce((n, d) => n + d.chunks, 0);
}

/**
 * Multi-select knowledge bases available across the whole flow, each with its
 * own retrieval tuning. Writes the flow's `globalKnowledgeBases`.
 */
export function KbPanel({
  knowledgeBases,
  bindings,
  onChange,
  description = "Knowledge bases available at every node for retrieval.",
}: KbPanelProps) {
  const [search, setSearch] = React.useState("");

  const toggle = (id: string) => {
    if (bindings.some((b) => b.knowledgeBaseId === id)) {
      onChange(bindings.filter((b) => b.knowledgeBaseId !== id));
    } else {
      onChange([...bindings, { knowledgeBaseId: id, chunksToRetrieve: 3, similarityThreshold: 0.5 }]);
    }
  };

  const update = (id: string, next: KnowledgeBaseBinding) =>
    onChange(bindings.map((b) => (b.knowledgeBaseId === id ? next : b)));

  const filtered = knowledgeBases.filter(
    (kb) =>
      !search ||
      kb.name.toLowerCase().includes(search.toLowerCase()) ||
      kb.description.toLowerCase().includes(search.toLowerCase()),
  );

  if (knowledgeBases.length === 0) {
    return (
      <div className="rounded-xl border-[1.5px] border-dashed border-ink/20 bg-cream/40 px-3 py-6 text-center">
        <BookOpen className="mx-auto mb-1.5 size-5 text-muted-foreground" />
        <p className="text-[11.5px] text-muted-foreground">No knowledge bases yet.</p>
        <Link
          href="/knowledge-base"
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-forest hover:text-ink"
        >
          Create a knowledge base
          <ExternalLink className="size-3" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <p className="text-[10.5px] leading-snug text-muted-foreground">{description}</p>

      {knowledgeBases.length > 5 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search knowledge bases…"
            className="h-8 rounded-lg border-[1.5px] border-input pl-7 text-[12px]"
          />
        </div>
      )}

      <div className="space-y-1.5">
        {filtered.map((kb) => {
          const binding = bindings.find((b) => b.knowledgeBaseId === kb.id);
          const on = Boolean(binding);
          return (
            <div key={kb.id}>
              <label
                className={
                  on
                    ? "flex cursor-pointer items-start gap-2.5 rounded-lg border-[1.5px] border-forest bg-lime/15 px-3 py-2"
                    : "flex cursor-pointer items-start gap-2.5 rounded-lg border-[1.5px] border-input bg-paper px-3 py-2 hover:border-ink/40"
                }
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(kb.id)}
                  className="mt-0.5 size-3.5 accent-forest"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11.5px] font-semibold text-ink">{kb.name}</span>
                  {kb.description && (
                    <span className="mt-0.5 block truncate text-[10.5px] text-muted-foreground">
                      {kb.description}
                    </span>
                  )}
                  <span className="mt-0.5 flex items-center gap-2.5 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <FileText className="size-2.5" />
                      {kb.documents.length} doc{kb.documents.length !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Database className="size-2.5" />
                      {chunkCount(kb)} chunks
                    </span>
                  </span>
                </span>
              </label>

              {on && binding && (
                <div className="ml-6 mt-1 mb-1.5 space-y-3 rounded-lg border-[1.5px] border-input bg-cream/40 px-3 py-2.5">
                  <RetrievalSliders binding={binding} onChange={(next) => update(kb.id, next)} />
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && search && (
          <p className="py-2 text-center text-[10.5px] text-muted-foreground">
            No knowledge bases match &ldquo;{search}&rdquo;
          </p>
        )}
      </div>

      {bindings.length > 0 && (
        <p className="text-[10.5px] text-muted-foreground">
          {bindings.length} knowledge base{bindings.length !== 1 ? "s" : ""} selected
        </p>
      )}
    </div>
  );
}
