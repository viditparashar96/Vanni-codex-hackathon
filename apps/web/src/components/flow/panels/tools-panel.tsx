"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLink, Search, Wrench } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ToolDef } from "@/types";

interface ToolsPanelProps {
  /** Org tool library (loaded server-side and passed down — no fetch here). */
  tools: ToolDef[];
  selectedToolIds: string[];
  onChange: (toolIds: string[]) => void;
  description?: string;
}

/**
 * The "Tools" tab — pick which org tools the agent can call at this node.
 * Selection is by tool id; the graph stores `toolIds` on the node.
 */
export function ToolsPanel({
  tools,
  selectedToolIds,
  onChange,
  description = "Tools the agent can call while this node is active.",
}: ToolsPanelProps) {
  const [search, setSearch] = React.useState("");

  const toggle = (id: string) =>
    onChange(
      selectedToolIds.includes(id)
        ? selectedToolIds.filter((t) => t !== id)
        : [...selectedToolIds, id],
    );

  const filtered = tools.filter(
    (t) =>
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()),
  );

  if (tools.length === 0) {
    return (
      <div className="rounded-xl border-[1.5px] border-dashed border-ink/20 bg-cream/40 px-3 py-6 text-center">
        <Wrench className="mx-auto mb-1.5 size-5 text-muted-foreground" />
        <p className="text-[11.5px] text-muted-foreground">No tools in this workspace yet.</p>
        <Link
          href="/tools"
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-forest hover:text-ink"
        >
          Create a tool
          <ExternalLink className="size-3" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <p className="text-[10.5px] leading-snug text-muted-foreground">{description}</p>

      {tools.length > 5 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tools…"
            className="h-8 rounded-lg border-[1.5px] border-input pl-7 text-[12px]"
          />
        </div>
      )}

      <div className="space-y-1.5">
        {filtered.map((tool) => {
          const on = selectedToolIds.includes(tool.id);
          return (
            <label
              key={tool.id}
              className={
                on
                  ? "flex cursor-pointer items-start gap-2.5 rounded-lg border-[1.5px] border-forest bg-lime/15 px-3 py-2"
                  : "flex cursor-pointer items-start gap-2.5 rounded-lg border-[1.5px] border-input bg-paper px-3 py-2 hover:border-ink/40"
              }
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(tool.id)}
                className="mt-0.5 size-3.5 accent-forest"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="truncate font-mono text-[11.5px] font-semibold text-ink">
                    {tool.name}
                  </span>
                  <span className="shrink-0 rounded bg-sand px-1 py-0.5 text-[9px] font-semibold text-muted-foreground">
                    {tool.method}
                  </span>
                </span>
                {tool.description && (
                  <span className="mt-0.5 block truncate text-[10.5px] text-muted-foreground">
                    {tool.description}
                  </span>
                )}
              </span>
            </label>
          );
        })}

        {filtered.length === 0 && search && (
          <p className="py-2 text-center text-[10.5px] text-muted-foreground">
            No tools match &ldquo;{search}&rdquo;
          </p>
        )}
      </div>

      {selectedToolIds.length > 0 && (
        <p className="text-[10.5px] text-muted-foreground">
          {selectedToolIds.length} tool{selectedToolIds.length !== 1 ? "s" : ""} selected
        </p>
      )}
    </div>
  );
}
