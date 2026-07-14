"use client";

import * as React from "react";
import { Sparkles, X } from "lucide-react";
import { ComposerChat } from "@/components/composer/composer-chat";

/**
 * Global Composer. On desktop it occupies a real layout column, so it never
 * covers the page users are working on.
 */
export function ComposerPanel() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Composer"
          className="group fixed top-1/2 right-0 z-40 -translate-y-1/2 outline-none"
        >
          <span
            className="flex min-h-48 items-center gap-3 rounded-l-2xl border-[1.5px] border-r-0 border-ink bg-lime py-6 pr-2.5 pl-3.5 shadow-[-3px_3px_0_var(--ink)] transition-transform duration-200 group-hover:-translate-x-1"
            style={{ writingMode: "vertical-rl" }}
          >
            <Sparkles className="size-5 rotate-90 text-forest" />
            <span className="font-display text-[12px] font-extrabold tracking-[0.2em] text-forest uppercase">
              Composer
            </span>
          </span>
        </button>
      )}

      {open && (
        <aside className="sticky top-0 flex h-screen w-[min(42vw,460px)] min-w-[360px] shrink-0 flex-col border-l-[1.5px] border-ink bg-cream">
          <div className="flex items-center gap-3 border-b-[1.5px] border-border bg-paper px-5 py-4">
            <span className="flex size-9 items-center justify-center rounded-full border-[1.5px] border-ink bg-lime">
              <Sparkles className="size-4 text-forest" />
            </span>
            <div>
              <div className="display text-[16px] text-ink">Composer</div>
              <div className="text-[11px] text-muted-foreground">
                Drafts agents & tools from plain language · ⌘J
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-auto flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-sand hover:text-ink"
              aria-label="Close Composer"
            >
              <X className="size-5" />
            </button>
          </div>
          <ComposerChat compact />
        </aside>
      )}
    </>
  );
}
