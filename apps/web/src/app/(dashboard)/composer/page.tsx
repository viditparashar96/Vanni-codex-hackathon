import { Sparkles } from "lucide-react";
import { ComposerChat } from "@/components/composer/composer-chat";

const CONVERSATIONS = [
  { id: "conv_1", title: "No-show rebooker agent", when: "Today", active: true },
  { id: "conv_2", title: "Add Spanish to front desk", when: "Yesterday", active: false },
  { id: "conv_3", title: "Insurance FAQ tool wiring", when: "Jul 9", active: false },
  { id: "conv_4", title: "Survey agent from brief.pdf", when: "Jul 2", active: false },
];

export default function ComposerPage() {
  return (
    <div className="mx-auto flex h-[calc(100vh-140px)] max-w-[1200px] flex-col">
      <div className="flex items-center justify-between pt-6 pb-6">
        <div>
          <div className="eyebrow flex items-center gap-2 text-muted-foreground">
            <span className="pulse-dot" />
            Propose-then-apply · every write needs your approval
          </div>
          <h1 className="display mt-3 text-[clamp(26px,3vw,36px)] text-ink">Composer</h1>
        </div>
        <span className="sticker hidden sm:inline-flex">
          <Sparkles className="size-3 text-forest" />
          Also on every page · ⌘J
        </span>
      </div>

      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[260px_1fr]">
        {/* conversations rail */}
        <aside className="hidden flex-col overflow-y-auto rounded-2xl border-[1.5px] border-border bg-paper p-3 lg:flex">
          <button
            type="button"
            className="mb-3 flex h-10 items-center justify-center rounded-xl bg-ink font-display text-[10.5px] font-extrabold tracking-[0.12em] text-paper uppercase transition-transform hover:-translate-y-0.5"
          >
            New conversation
          </button>
          <ul className="space-y-1">
            {CONVERSATIONS.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${
                    c.active ? "bg-lime/25" : "hover:bg-cream"
                  }`}
                >
                  <div className="truncate text-[12.5px] font-semibold text-ink">{c.title}</div>
                  <div className="mt-0.5 text-[10.5px] text-muted-foreground">{c.when}</div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* thread */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border-[1.5px] border-ink bg-paper shadow-[5px_5px_0_var(--ink)]">
          <ComposerChat />
        </div>
      </div>
    </div>
  );
}
