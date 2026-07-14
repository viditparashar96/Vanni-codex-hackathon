import Link from "next/link";
import { ArrowRight, Webhook, Zap } from "lucide-react";

export default function AutomationPage() {
  return (
    <div className="mx-auto flex max-w-[760px] flex-col items-start pt-20">
      <span className="sticker rise-in">
        <Zap className="size-3 text-forest" />
        On the roadmap
      </span>
      <h1 className="display rise-in rise-in-1 mt-6 text-[clamp(34px,4.4vw,52px)] text-ink">
        Automations are
        <br />
        almost here.
      </h1>
      <p className="rise-in rise-in-2 mt-4 max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground">
        Trigger flows after calls — update your CRM when a QA score dips, re-queue a contact when
        voicemail answers, or open a ticket when a caller asks for a human. Until then, webhooks
        already fire on every call event.
      </p>
      <Link
        href="/settings/api-keys"
        className="rise-in rise-in-3 group mt-8 flex h-12 items-center gap-2.5 rounded-full bg-ink px-6 font-display text-[12px] font-extrabold tracking-[0.1em] text-paper uppercase transition-transform hover:-translate-y-0.5"
      >
        <Webhook className="size-4" />
        Use webhooks today
        <span className="flex size-6 items-center justify-center rounded-full bg-lime text-forest transition-transform group-hover:translate-x-0.5">
          <ArrowRight className="size-3.5 stroke-[2.5]" />
        </span>
      </Link>
    </div>
  );
}
