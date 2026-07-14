"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export default function RegisterPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  const submit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => router.push("/"), 1600);
  };

  if (submitting) {
    return (
      <div className="rise-in" aria-live="polite">
        <span className="pop-in flex size-16 items-center justify-center rounded-full border-[1.5px] border-ink bg-lime text-forest shadow-[4px_4px_0_var(--ink)]">
          <Check className="size-7 stroke-[2.5]" />
        </span>
        <h1 className="display mt-7 text-[clamp(34px,4vw,48px)] text-ink">
          Workspace ready.
        </h1>
        <p className="mt-2.5 text-[15px] text-muted-foreground">
          $2.00 in signup credits added — taking you to your dashboard…
        </p>
        <div className="sticker mt-7">First test call on us</div>
      </div>
    );
  }

  return (
    <div>
      <div className="eyebrow mb-6 flex w-fit items-center gap-2.5 rounded-full border border-border px-4 py-2 text-muted-foreground">
        <span className="pulse-dot" />
        $2.00 signup credit · no card needed
      </div>
      <h1 className="display text-[clamp(36px,4.2vw,52px)] text-ink">
        <span className="word-reveal"><span>Ten</span></span>{" "}
        <span className="word-reveal"><span>minutes</span></span>{" "}
        <span className="word-reveal"><span>to</span></span>
        <br />
        <span className="word-reveal"><span>your</span></span>{" "}
        <span className="word-reveal"><span>first call.</span></span>
      </h1>
      <p className="mt-3.5 mb-9 max-w-[44ch] text-[15px] leading-relaxed text-muted-foreground">
        Create your workspace, describe an agent, and test-call it from the browser — before your coffee cools.
      </p>

      <form onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <label htmlFor="name" className="eyebrow mb-2 block text-[11px] text-ink">Your name</label>
            <Input id="name" required placeholder="Ada Okafor" className="h-[52px] rounded-[14px] border-[1.5px] border-input px-4.5 text-[15px] focus-visible:border-ink focus-visible:ring-4 focus-visible:ring-ink/5" />
          </div>
          <div>
            <label htmlFor="org" className="eyebrow mb-2 block text-[11px] text-ink">Organization</label>
            <Input id="org" required placeholder="Cedarline Health" className="h-[52px] rounded-[14px] border-[1.5px] border-input px-4.5 text-[15px] focus-visible:border-ink focus-visible:ring-4 focus-visible:ring-ink/5" />
          </div>
        </div>
        <div>
          <label htmlFor="email" className="eyebrow mb-2 block text-[11px] text-ink">Work email</label>
          <Input id="email" type="email" required placeholder="you@clinic.health" className="h-[52px] rounded-[14px] border-[1.5px] border-input px-4.5 text-[15px] focus-visible:border-ink focus-visible:ring-4 focus-visible:ring-ink/5" />
        </div>
        <div>
          <label htmlFor="password" className="eyebrow mb-2 block text-[11px] text-ink">Password</label>
          <Input id="password" type="password" required placeholder="12+ characters" className="h-[52px] rounded-[14px] border-[1.5px] border-input px-4.5 text-[15px] focus-visible:border-ink focus-visible:ring-4 focus-visible:ring-ink/5" />
        </div>

        <label className="flex items-start gap-3 text-[13px] leading-relaxed text-muted-foreground">
          <Checkbox required className="mt-0.5" />
          <span>
            I agree to the <a href="#" className="text-ink underline underline-offset-2">Terms</a> and{" "}
            <a href="#" className="text-ink underline underline-offset-2">Privacy Policy</a>
          </span>
        </label>

        <button
          type="submit"
          className="group flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-ink font-display text-[13px] font-extrabold tracking-[0.12em] text-paper uppercase transition-all hover:-translate-y-0.5"
        >
          Create account
          <span className="flex size-7 items-center justify-center rounded-full bg-lime text-forest transition-transform group-hover:translate-x-0.5">
            <ArrowRight className="size-3.5 stroke-[2.5]" />
          </span>
        </button>

        <p className="text-[14px] text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="border-b-[1.5px] border-ink pb-px font-semibold text-ink hover:opacity-70">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
