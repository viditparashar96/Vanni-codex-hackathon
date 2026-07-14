"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, MailCheck } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function ForgotPage() {
  const [sent, setSent] = React.useState(false);

  if (sent) {
    return (
      <div className="rise-in">
        <span className="flex size-14 items-center justify-center rounded-full border-[1.5px] border-ink bg-lime shadow-[3px_3px_0_var(--ink)]">
          <MailCheck className="size-6 text-forest" />
        </span>
        <h1 className="display mt-6 text-[clamp(32px,3.6vw,44px)] text-ink">Check your inbox.</h1>
        <p className="mt-3 max-w-[42ch] text-[15px] leading-relaxed text-muted-foreground">
          If that address has an account, a reset link is on its way. It expires in 30 minutes.
        </p>
        <Link href="/login" className="mt-8 inline-block border-b-[1.5px] border-ink pb-px font-semibold text-ink hover:opacity-70">
          ← Back to login
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="eyebrow mb-6 flex w-fit items-center gap-2.5 rounded-full border border-border px-4 py-2 text-muted-foreground">
        <span className="pulse-dot" />
        Password reset
      </div>
      <h1 className="display text-[clamp(36px,4.2vw,52px)] text-ink">
        <span className="word-reveal"><span>Locked</span></span>{" "}
        <span className="word-reveal"><span>out?</span></span>
        <br />
        <span className="word-reveal"><span>Happens.</span></span>
      </h1>
      <p className="mt-3.5 mb-9 max-w-[42ch] text-[15px] leading-relaxed text-muted-foreground">
        Enter your email and we&apos;ll send a reset link.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          // The API has no password-reset endpoint yet, so this stays a
          // client-only stub: show the "sent" confirmation without making a
          // network call we can't honor. Wire up a real request here once the
          // backend exposes /api/auth/forget-password.
          setSent(true);
        }}
        className="space-y-5"
      >
        <div>
          <label htmlFor="email" className="eyebrow mb-2 block text-[11px] text-ink">Email</label>
          <Input
            id="email"
            type="email"
            required
            placeholder="you@clinic.health"
            className="h-[52px] rounded-[14px] border-[1.5px] border-input px-4.5 text-[15px] focus-visible:border-ink focus-visible:ring-4 focus-visible:ring-ink/5"
          />
        </div>
        <button
          type="submit"
          className="group flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-ink font-display text-[13px] font-extrabold tracking-[0.12em] text-paper uppercase transition-all hover:-translate-y-0.5"
        >
          Send reset link
          <span className="flex size-7 items-center justify-center rounded-full bg-lime text-forest transition-transform group-hover:translate-x-0.5">
            <ArrowRight className="size-3.5 stroke-[2.5]" />
          </span>
        </button>
        <p className="text-[14px] text-muted-foreground">
          Remembered it?{" "}
          <Link href="/login" className="border-b-[1.5px] border-ink pb-px font-semibold text-ink hover:opacity-70">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
