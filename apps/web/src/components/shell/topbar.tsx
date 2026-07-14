"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { CommandPalette } from "@/components/shell/command-palette";

export function Topbar() {
  const [open, setOpen] = React.useState(false);

  return (
    <header className="flex items-center justify-between gap-4 px-8 pt-6 pb-2">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-full max-w-[340px] items-center gap-2.5 rounded-full border-[1.5px] border-border bg-paper px-4 text-[13px] text-muted-foreground transition-colors hover:border-ink"
      >
        <Search className="size-3.5" />
        Search agents, calls, campaigns…
        <kbd className="ml-auto rounded-md border border-border bg-sand px-1.5 py-0.5 font-display text-[10px] font-bold tracking-wide">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-3">
        <Link href="/history" className="sticker text-[10px]">
          <span className="pulse-dot pulse-dot-live" />
          2 live calls
        </Link>
        <Link
          href="/settings/general"
          className="flex size-9 items-center justify-center rounded-full border-[1.5px] border-ink bg-brand-yellow font-display text-[12px] font-black text-ink shadow-[2px_2px_0_var(--ink)] transition-transform hover:-translate-y-0.5"
          aria-label="Your profile"
        >
          SP
        </Link>
      </div>

      <CommandPalette open={open} onOpenChange={setOpen} />
    </header>
  );
}
