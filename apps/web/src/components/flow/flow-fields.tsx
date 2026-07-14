"use client";

/**
 * Small presentational field atoms shared by the node and transition
 * inspectors. They carry no flow logic — just the editor's visual language
 * (eyebrow labels, rounded inputs, dashed section frames).
 */

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function FieldLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("eyebrow mb-1.5 block text-[9.5px] text-ink", className)}>
      {children}
    </label>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4", className)}>
      <FieldLabel>{label}</FieldLabel>
      {children}
      {hint && <p className="mt-1 text-[10.5px] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="mb-4 flex w-full items-center justify-between gap-3 rounded-xl border-[1.5px] border-input bg-cream/50 px-3.5 py-2.5 text-left"
    >
      <span>
        <span className="block text-[12.5px] font-semibold text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-[10.5px] leading-snug text-muted-foreground">{hint}</span>}
      </span>
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full border-[1.5px] border-ink transition-colors",
          checked ? "bg-lime" : "bg-sand",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-3 rounded-full bg-ink transition-transform",
            checked ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

/** Collapsible section with a dashed frame — used for optional/advanced blocks. */
export function Section({
  title,
  icon: Icon,
  defaultOpen = false,
  badge,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="mb-3 rounded-xl border-[1.5px] border-dashed border-ink/25 bg-cream/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5"
      >
        <span className="eyebrow flex items-center gap-1.5 text-[9.5px] text-ink">
          {Icon && <Icon className="size-3" />}
          {title}
        </span>
        <span className="flex items-center gap-2">
          {badge}
          <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
        </span>
      </button>
      {open && <div className="px-3.5 pb-3.5">{children}</div>}
    </div>
  );
}

/** A tiny count badge (e.g. "2" tools bound). */
export function CountBadge({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="flex size-4 items-center justify-center rounded-full bg-forest text-[9px] font-bold text-lime">
      {n}
    </span>
  );
}
