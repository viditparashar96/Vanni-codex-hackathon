"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ComposerChat } from "@/components/composer/composer-chat";

/**
 * Global Composer, triggered from the right edge of the viewport —
 * a vertical tab that slides open a right-side panel on any page.
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
      {/* right-edge tab trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open Composer"
        className="group fixed top-1/2 right-0 z-40 -translate-y-1/2 outline-none"
      >
        <span className="flex -translate-y-0 items-center gap-2 rounded-l-2xl border-[1.5px] border-r-0 border-ink bg-lime py-4 pr-1.5 pl-2.5 shadow-[-3px_3px_0_var(--ink)] transition-transform duration-200 group-hover:-translate-x-1"
          style={{ writingMode: "vertical-rl" }}
        >
          <Sparkles className="size-4 rotate-90 text-forest" />
          <span className="font-display text-[10.5px] font-extrabold tracking-[0.18em] text-forest uppercase">
            Composer
          </span>
        </span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 border-l-[1.5px] border-ink bg-cream p-0 sm:max-w-[460px]"
        >
          <SheetTitle className="sr-only">AI Composer</SheetTitle>
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
          </div>
          <ComposerChat compact />
        </SheetContent>
      </Sheet>
    </>
  );
}
