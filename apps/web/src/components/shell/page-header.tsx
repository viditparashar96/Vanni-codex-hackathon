import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rise-in flex flex-wrap items-end justify-between gap-x-8 gap-y-4 pt-6 pb-8", className)}>
      <div>
        <div className="eyebrow flex items-center gap-2 text-muted-foreground">
          <span className="pulse-dot" />
          {eyebrow}
        </div>
        <h1 className="display mt-3 text-[clamp(28px,3.2vw,40px)] text-ink">{title}</h1>
        {description && (
          <p className="mt-2 max-w-[52ch] text-[14px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </div>
  );
}
