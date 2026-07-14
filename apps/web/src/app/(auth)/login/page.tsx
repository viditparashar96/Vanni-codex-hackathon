"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export default function LoginPage() {
  const router = useRouter();
  const [showPw, setShowPw] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => router.push("/"), 900);
  };

  return (
    <div>
      <div className="eyebrow mb-6 flex w-fit items-center gap-2.5 rounded-full border border-border px-4 py-2 text-muted-foreground">
        <span className="pulse-dot" />
        Welcome back
      </div>
      <h1 className="display text-[clamp(36px,4.2vw,52px)] text-ink">
        <span className="word-reveal"><span>Good</span></span>{" "}
        <span className="word-reveal"><span>to</span></span>{" "}
        <span className="word-reveal"><span>see</span></span>
        <br />
        <span className="word-reveal"><span>you</span></span>{" "}
        <span className="word-reveal"><span>again.</span></span>
      </h1>
      <p className="mt-3.5 mb-9 max-w-[42ch] text-[15px] leading-relaxed text-muted-foreground">
        Log in to check on your agents, watch live calls, and see what they handled overnight.
      </p>

      <form onSubmit={submit} className="space-y-5">
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
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="password" className="eyebrow text-[11px] text-ink">Password</label>
            <Link href="/forgot" className="text-[11.5px] font-medium text-muted-foreground hover:text-ink">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPw ? "text" : "password"}
              required
              placeholder="Your password"
              className="h-[52px] rounded-[14px] border-[1.5px] border-input px-4.5 pr-12 text-[15px] focus-visible:border-ink focus-visible:ring-4 focus-visible:ring-ink/5"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute top-1/2 right-4 -translate-y-1/2 text-muted-foreground hover:text-ink"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
            </button>
          </div>
        </div>

        <label className="flex items-center gap-3 text-[13px] text-ink">
          <Checkbox defaultChecked />
          Keep me signed in on this device
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="group flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-ink font-display text-[13px] font-extrabold tracking-[0.12em] text-paper uppercase transition-all hover:-translate-y-0.5 disabled:opacity-70"
        >
          {submitting ? "Signing in…" : "Log in"}
          <span className="flex size-7 items-center justify-center rounded-full bg-lime text-forest transition-transform group-hover:translate-x-0.5">
            <ArrowRight className="size-3.5 stroke-[2.5]" />
          </span>
        </button>

        <p className="text-[14px] text-muted-foreground">
          First time here?{" "}
          <Link href="/register" className="border-b-[1.5px] border-ink pb-px font-semibold text-ink hover:opacity-70">
            Create your account
          </Link>
        </p>
      </form>
    </div>
  );
}
