import { format, formatDistanceToNowStrict, parseISO } from "date-fns";

export function fmtDuration(secs: number): string {
  if (secs <= 0) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s.toString().padStart(2, "0")}s` : `${s}s`;
}

export function fmtClock(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function fmtMoney(n: number, digits = 2): string {
  return `$${n.toFixed(digits)}`;
}

export function fmtDate(iso: string): string {
  return format(parseISO(iso), "MMM d, h:mm a");
}

export function fmtDay(iso: string): string {
  return format(parseISO(iso), "MMM d, yyyy");
}

export function fmtAgo(iso: string): string {
  return formatDistanceToNowStrict(parseISO(iso), { addSuffix: true });
}

export function fmtCompact(n: number): string {
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function fmtInt(n: number): string {
  return Intl.NumberFormat("en").format(n);
}
