import { ArrowDownLeft, ArrowUpRight, Gift, Receipt } from "lucide-react";
import { api } from "@/lib/api";
import { fmtDate, fmtMoney } from "@/lib/format";
import { PageHeader } from "@/components/shell/page-header";

const LEDGER_ICON = {
  deduction: ArrowDownLeft,
  topup: ArrowUpRight,
  grant: Gift,
} as const;

export default async function BillingPage() {
  const [credits, ledger] = await Promise.all([api.getCredits(), api.getLedger()]);
  const weeksLeft = credits.balance / (credits.burnLast7d || 1);

  return (
    <div className="mx-auto max-w-[1000px]">
      <PageHeader
        eyebrow="Prepaid credits · provider passthrough + $0.02/min platform fee"
        title="Billing"
        description="Every call's cost lands in the ledger — STT, LLM, TTS and platform fee itemized per call in History."
      />

      {/* balance banner */}
      <div className="rise-in rise-in-1 flex flex-wrap items-center justify-between gap-6 rounded-3xl border-[1.5px] border-ink bg-forest p-8 text-paper shadow-[6px_6px_0_var(--ink)]">
        <div>
          <div className="eyebrow text-[10px] text-paper/55">Current balance</div>
          <div className="figure mt-2 text-[clamp(40px,5vw,56px)] leading-none text-lime">
            {fmtMoney(credits.balance)}
          </div>
          <div className="mt-3 text-[13px] text-paper/65">
            Burning {fmtMoney(credits.burnLast7d)}/week · ~{weeksLeft.toFixed(1)} weeks of runway
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-3">
          <button
            type="button"
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-lime px-8 font-display text-[12px] font-extrabold tracking-[0.12em] text-forest uppercase transition-transform hover:-translate-y-0.5"
          >
            Top up credits
          </button>
          <span className="text-center text-[11px] text-paper/50">Manual / invoice at launch · card top-ups soon</span>
        </div>
      </div>

      {/* ledger */}
      <section className="rise-in rise-in-2 mt-10">
        <h2 className="eyebrow mb-4 flex items-center gap-2 text-ink">
          <Receipt className="size-3.5" />
          Transaction ledger
        </h2>
        <div className="overflow-hidden rounded-2xl border-[1.5px] border-border bg-paper">
          {ledger.map((entry, i) => {
            const Icon = LEDGER_ICON[entry.type];
            return (
              <div
                key={entry.id}
                className={`flex items-center gap-4 px-6 py-3.5 ${i > 0 ? "border-t border-border/70" : ""}`}
              >
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                    entry.type === "deduction" ? "bg-sand text-muted-foreground" : "bg-lime/40 text-forest"
                  }`}
                >
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-ink">{entry.memo}</div>
                  <div className="text-[11px] text-muted-foreground">{fmtDate(entry.at)}</div>
                </div>
                <div className={`figure text-[15px] ${entry.amount < 0 ? "text-ink" : "text-forest"}`}>
                  {entry.amount < 0 ? "−" : "+"}
                  {fmtMoney(Math.abs(entry.amount))}
                </div>
                <div className="hidden w-24 text-right font-mono text-[11.5px] text-muted-foreground sm:block">
                  {fmtMoney(entry.balanceAfter)}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
