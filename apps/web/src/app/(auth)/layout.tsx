import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* form side */}
      <section className="relative flex flex-col bg-paper px-9 pt-9 pb-12 lg:px-14">
        <div className="mb-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-display text-[20px] font-black tracking-tight text-ink">
            <span className="pulse-dot" />
            Vaani
          </Link>
          <nav className="flex items-center gap-4 text-[13px] text-muted-foreground">
            <span className="hidden sm:inline">Voice AI infrastructure</span>
            <a href="https://docs.vaani.ai" className="font-semibold text-ink underline-offset-4 hover:underline">
              Docs
            </a>
          </nav>
        </div>

        <div className="my-auto w-full max-w-[440px]">{children}</div>

        <div className="mt-12 flex items-center justify-between text-[12px] tracking-wide text-muted-foreground">
          <span>© 2026 Vaani · Self-hostable voice AI</span>
          <span>HIPAA-ready architecture</span>
        </div>
      </section>

      {/* visual side — three bands */}
      <aside className="relative hidden overflow-hidden lg:block" aria-hidden>
        <div className="absolute inset-0 grid grid-cols-3">
          <div className="relative bg-lime">
            <span className="eyebrow absolute top-7 left-7 text-[10px] text-ink/70">Build</span>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 font-display text-[clamp(44px,5.5vw,80px)] font-black tracking-[-0.04em] whitespace-nowrap text-ink/80 mix-blend-multiply">
              Design · Test
            </div>
            <div className="figure absolute right-7 bottom-7 text-[38px] text-ink">
              10<span className="text-[16px]">min</span>
              <small className="eyebrow mt-1.5 block text-[9px] opacity-70">idea → live call</small>
            </div>
          </div>
          <div className="relative bg-brand-yellow">
            <span className="eyebrow absolute top-7 left-7 text-[10px] text-ink/70">Connect</span>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 font-display text-[clamp(44px,5.5vw,80px)] font-black tracking-[-0.04em] whitespace-nowrap text-ink/80 mix-blend-multiply">
              Phone · Web
            </div>
            <div className="figure absolute right-7 bottom-7 text-[38px] text-ink">
              7<small className="eyebrow mt-1.5 block text-[9px] opacity-70">carriers, one plane</small>
            </div>
          </div>
          <div className="relative bg-brand-orange">
            <span className="eyebrow absolute top-7 left-7 text-[10px] text-paper/85">Operate</span>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 font-display text-[clamp(44px,5.5vw,80px)] font-black tracking-[-0.04em] whitespace-nowrap text-paper/90">
              Live · At scale
            </div>
            <div className="figure absolute right-7 bottom-7 text-[38px] text-paper">
              0.8<span className="text-[16px]">s</span>
              <small className="eyebrow mt-1.5 block text-[9px] opacity-80">voice-to-voice p50</small>
            </div>
          </div>
        </div>

        {/* stickers */}
        <div className="sticker absolute top-[12%] left-[8%] -rotate-6">Every call reported</div>
        <div className="sticker absolute top-[20%] right-[9%] rotate-[8deg] !bg-forest !text-paper">2 live now</div>
        <div className="sticker absolute bottom-[22%] left-[12%] -rotate-3">QA 8.6 / 10</div>

        {/* floating card */}
        <div className="absolute top-1/2 left-1/2 w-[56%] max-w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-3xl border-[1.5px] border-ink bg-paper p-5 shadow-[8px_12px_0_var(--ink)]">
          <div className="eyebrow mb-3 flex items-center gap-2 text-[9px] text-muted-foreground">
            <span className="pulse-dot pulse-dot-live" />
            Live transcript
          </div>
          <div className="space-y-2.5">
            <div className="max-w-[85%] rounded-xl rounded-tl-sm bg-cream px-3 py-2 text-[12px] text-ink">
              Found it — Thursday 2:15 PM with Dr. Iyer. Want the next available instead?
            </div>
            <div className="ml-auto max-w-[70%] rounded-xl rounded-tr-sm bg-forest px-3 py-2 text-[12px] text-paper">
              Friday morning if you have it.
            </div>
            <div className="max-w-[85%] rounded-xl rounded-tl-sm bg-cream px-3 py-2 text-[12px] text-ink">
              Friday 9:00 AM is open — booked. Confirmation text on its way.
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
            <strong className="text-ink">Riya — Front Desk</strong>
            <span className="font-mono">740 ms · tool ✓</span>
          </div>
        </div>

        {/* ticker */}
        <div className="absolute inset-x-0 bottom-0 overflow-hidden border-t-[1.5px] border-ink bg-paper py-3">
          <div className="marquee-track eyebrow text-[10px] text-muted-foreground">
            {[0, 1].map((n) => (
              <span key={n} className="flex shrink-0 items-center gap-10">
                <span>Build agents without code</span><span className="text-forest">●</span>
                <span>Flows · tools · RAG · transfers</span><span className="text-forest">●</span>
                <span>Self-host the entire stack</span><span className="text-forest">●</span>
                <span>Prepaid, per-minute pricing</span><span className="text-forest">●</span>
              </span>
            ))}
          </div>
        </div>
      </aside>
    </main>
  );
}
