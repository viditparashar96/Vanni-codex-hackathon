import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ invitationId: string }>;
}) {
  await params;

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream p-6">
      <div className="w-full max-w-[440px] rounded-3xl border-[1.5px] border-ink bg-paper p-9 shadow-[6px_6px_0_var(--ink)]">
        <div className="flex size-12 items-center justify-center rounded-full border-[1.5px] border-ink bg-lime font-display text-[16px] font-black text-forest">
          C
        </div>
        <h1 className="display mt-6 text-[30px] text-ink">
          You&apos;re invited to
          <br />
          Acme Inc.
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
          Grace Obi invited you as an <strong className="text-ink">Agent Builder</strong> — you&apos;ll be able to
          create, edit and test voice agents, tools and campaigns.
        </p>
        <Link
          href="/register"
          className="group mt-8 flex h-13 w-full items-center justify-center gap-2.5 rounded-full bg-ink py-4 font-display text-[12.5px] font-extrabold tracking-[0.12em] text-paper uppercase transition-all hover:-translate-y-0.5"
        >
          Accept invitation
          <span className="flex size-6 items-center justify-center rounded-full bg-lime text-forest transition-transform group-hover:translate-x-0.5">
            <ArrowRight className="size-3.5 stroke-[2.5]" />
          </span>
        </Link>
        <p className="mt-5 text-center text-[12px] text-muted-foreground">
          Wrong inbox? You can safely ignore this.
        </p>
      </div>
    </main>
  );
}
