"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { CommandPalette } from "@/components/shell/command-palette";
import type { SessionSummary } from "@/lib/server-api";

export function Topbar({ summary }: { summary?: SessionSummary }) {
  const [open, setOpen] = React.useState(false);
  const initials = summary?.user?.initials ?? "··";

  return (
    <header className="flex items-center justify-between gap-3 px-4 pt-5 pb-2 sm:px-6 md:gap-4 md:px-8 md:pt-6">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-13 flex h-11 w-full max-w-[340px] items-center gap-2.5 rounded-full border-[1.5px] border-border bg-paper px-4 text-[13px] text-muted-foreground transition-colors hover:border-ink md:ml-0 md:h-10"
      >
        <Search className="size-3.5" />
        <span className="hidden sm:inline">Search agents, calls, campaigns…</span>
        <span className="sm:hidden">Search…</span>
        <kbd className="ml-auto rounded-md border border-border bg-sand px-1.5 py-0.5 font-display text-[10px] font-bold tracking-wide">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-3">
        <Link
          href="/settings/general"
          className="flex size-9 items-center justify-center rounded-full border-[1.5px] border-ink bg-brand-yellow font-display text-[12px] font-black text-ink shadow-[2px_2px_0_var(--ink)] transition-transform hover:-translate-y-0.5"
          aria-label="Your profile"
        >
          {initials}
        </Link>
      </div>

      <CommandPalette open={open} onOpenChange={setOpen} />
    </header>
  );
}
