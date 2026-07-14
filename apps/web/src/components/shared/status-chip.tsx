import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  /* call */
  completed: "bg-lime/35 text-forest",
  in_progress: "bg-brand-orange/15 text-brand-orange",
  failed: "bg-destructive/12 text-destructive",
  no_answer: "bg-sand text-muted-foreground",
  voicemail: "bg-brand-yellow/25 text-[#8a6d0e]",
  /* agent */
  active: "bg-lime/35 text-forest",
  draft: "bg-brand-yellow/25 text-[#8a6d0e]",
  archived: "bg-sand text-muted-foreground",
  /* campaign */
  running: "bg-lime/35 text-forest",
  paused: "bg-brand-yellow/25 text-[#8a6d0e]",
  stopped: "bg-destructive/12 text-destructive",
  /* docs */
  ready: "bg-lime/35 text-forest",
  processing: "bg-brand-yellow/25 text-[#8a6d0e]",
  /* contacts */
  pending: "bg-sand text-muted-foreground",
  calling: "bg-brand-orange/15 text-brand-orange",
  retry_scheduled: "bg-brand-yellow/25 text-[#8a6d0e]",
  /* sentiment */
  positive: "bg-lime/35 text-forest",
  neutral: "bg-sand text-muted-foreground",
  negative: "bg-destructive/12 text-destructive",
  /* misc */
  invited: "bg-brand-yellow/25 text-[#8a6d0e]",
  verifying: "bg-brand-yellow/25 text-[#8a6d0e]",
};

const LABELS: Record<string, string> = {
  in_progress: "Live",
  no_answer: "No answer",
  retry_scheduled: "Retry",
};

export function StatusChip({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-display text-[10px] font-extrabold tracking-[0.1em] uppercase",
        STYLES[status] ?? "bg-sand text-muted-foreground",
        className,
      )}
    >
      {(status === "in_progress" || status === "calling" || status === "running") && (
        <span className={cn("size-1.5 rounded-full", status === "running" ? "bg-forest" : "bg-brand-orange animate-pulse")} />
      )}
      {LABELS[status] ?? status.replace(/_/g, " ")}
    </span>
  );
}
