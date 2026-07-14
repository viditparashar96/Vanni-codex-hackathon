import Link from "next/link";
import { ArrowRight, Sparkles, Waypoints, Zap } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";

const TEMPLATES = [
  { name: "Appointment reminder", desc: "Confirm, reschedule or cancel — with SMS follow-up.", type: "flow" },
  { name: "Reception / front desk", desc: "Answer the main line, book visits, transfer to humans.", type: "simple" },
  { name: "Lead qualifier", desc: "Qualify inbound web leads and book a meeting.", type: "flow" },
  { name: "Survey", desc: "Short NPS or CSAT survey with structured extraction.", type: "simple" },
];

export default function NewAgentPage() {
  return (
    <div className="mx-auto max-w-[1000px]">
      <PageHeader
        eyebrow="New agent"
        title="What are we building?"
        description="Pick a shape for the conversation. You can switch a simple agent to a flow later."
      />

      <div className="grid gap-5 md:grid-cols-2">
        {/* simple */}
        <Link
          href="/agents/agt_frontdesk"
          className="group rise-in rise-in-1 relative overflow-hidden rounded-3xl border-[1.5px] border-ink bg-lime p-7 shadow-[5px_5px_0_var(--ink)] transition-transform hover:-translate-y-1"
        >
          <div className="flex size-12 items-center justify-center rounded-2xl border-[1.5px] border-ink bg-paper">
            <Zap className="size-6 text-ink" />
          </div>
          <h2 className="display mt-6 text-[26px] text-forest">Simple agent</h2>
          <p className="mt-2 max-w-[36ch] text-[13.5px] leading-relaxed text-forest/80">
            One system prompt, one goal. Perfect for reception, FAQ, intake, reminders and tier-1 support.
          </p>
          <div className="mt-8 flex items-center gap-2 font-display text-[11.5px] font-extrabold tracking-[0.12em] text-forest uppercase">
            Start from prompt
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        {/* flow */}
        <Link
          href="/agents/agt_reminder/flow"
          className="group rise-in rise-in-2 relative overflow-hidden rounded-3xl border-[1.5px] border-ink bg-forest p-7 text-paper shadow-[5px_5px_0_var(--ink)] transition-transform hover:-translate-y-1"
        >
          <div className="flex size-12 items-center justify-center rounded-2xl border-[1.5px] border-lime/50 bg-forest-soft">
            <Waypoints className="size-6 text-lime" />
          </div>
          <h2 className="display mt-6 text-[26px] text-paper">Flow agent</h2>
          <p className="mt-2 max-w-[36ch] text-[13.5px] leading-relaxed text-paper/70">
            A directed graph of stages — verify, branch, transfer, SMS — each with its own objective and tools.
          </p>
          <div className="mt-8 flex items-center gap-2 font-display text-[11.5px] font-extrabold tracking-[0.12em] text-lime uppercase">
            Open the canvas
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      </div>

      {/* composer plug */}
      <Link
        href="/composer"
        className="rise-in rise-in-3 mt-5 flex items-center gap-4 rounded-2xl border-[1.5px] border-dashed border-ink/40 bg-paper/60 p-5 transition-colors hover:border-ink hover:bg-paper"
      >
        <Sparkles className="size-5 shrink-0 text-forest" />
        <div className="flex-1">
          <div className="font-display text-[14.5px] font-bold text-ink">Or let the Composer draft it</div>
          <div className="text-[12.5px] text-muted-foreground">
            Describe the agent in plain language — Vaani proposes the full config, you approve every write.
          </div>
        </div>
        <ArrowRight className="size-4 text-muted-foreground" />
      </Link>

      {/* templates */}
      <section className="rise-in rise-in-4 mt-12">
        <h2 className="eyebrow mb-4 text-ink">Start from a template</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {TEMPLATES.map((t) => (
            <Link
              key={t.name}
              href={t.type === "flow" ? "/agents/agt_reminder/flow" : "/agents/agt_frontdesk"}
              className="group flex items-center gap-4 rounded-2xl border-[1.5px] border-border bg-paper p-4.5 transition-all hover:-translate-y-0.5 hover:border-ink"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display text-[14px] font-bold text-ink">{t.name}</span>
                  <span className="eyebrow text-[9px] text-muted-foreground">{t.type}</span>
                </div>
                <div className="mt-0.5 truncate text-[12px] text-muted-foreground">{t.desc}</div>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
