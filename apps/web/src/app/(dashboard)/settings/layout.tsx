"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings/general", label: "General" },
  { href: "/settings/members", label: "Members" },
  { href: "/settings/telephony", label: "Telephony" },
  { href: "/settings/api-keys", label: "API & Webhooks" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="pt-6 pb-8">
        <div className="eyebrow flex items-center gap-2 text-muted-foreground">
          <span className="pulse-dot" />
          Cedarline Health
        </div>
        <h1 className="display mt-3 text-[clamp(28px,3.2vw,40px)] text-ink">Settings</h1>
      </div>

      <div className="mb-8 flex flex-wrap gap-1.5 rounded-full border-[1.5px] border-border bg-paper p-1.5 w-fit">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "rounded-full px-5 py-2 font-display text-[11px] font-extrabold tracking-[0.1em] uppercase transition-colors",
              pathname === t.href ? "bg-ink text-paper" : "text-muted-foreground hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {children}
    </div>
  );
}
