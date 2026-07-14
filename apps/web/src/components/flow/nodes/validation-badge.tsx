"use client";

import { TriangleAlert, XCircle } from "lucide-react";
import type { FlowValidationError } from "@/lib/flow-contract";
import { cn } from "@/lib/utils";

/**
 * Corner badge summarising a node's validation issues. Rendered by every node
 * kind; returns nothing when the node is clean. The local contract carries no
 * severity, so any issue is treated as an error — the warning icon is kept for
 * forward-compatibility if a softer severity is added later.
 */
export function ValidationBadge({
  issues,
  severity = "error",
}: {
  issues: FlowValidationError[];
  severity?: "error" | "warning";
}) {
  if (issues.length === 0) return null;

  return (
    <div
      className={cn(
        "absolute -top-2 -right-2 z-10 flex size-5 items-center justify-center rounded-full border-[1.5px] border-ink text-paper shadow-[1.5px_1.5px_0_var(--ink)]",
        severity === "error" ? "bg-brand-orange" : "bg-brand-yellow text-ink",
      )}
      title={issues.map((i) => i.message).join("\n")}
    >
      {severity === "error" ? (
        <XCircle className="size-3" />
      ) : (
        <TriangleAlert className="size-3" />
      )}
    </div>
  );
}
