"use client";

import { Globe } from "lucide-react";

/**
 * Corner marker for a node the editor has flagged as reachable from anywhere in
 * the graph (a transient canvas decoration — see `useNodeDecorations`). Kept
 * visually distinct from the validation badge by sitting on the opposite
 * corner.
 */
export function GlobalBadge({ hint }: { hint?: string }) {
  return (
    <div
      className="absolute -top-2 -left-2 z-10 flex size-5 items-center justify-center rounded-full border-[1.5px] border-ink bg-lime text-forest shadow-[1.5px_1.5px_0_var(--ink)]"
      title={hint ? `Global: ${hint}` : "Reachable from any point in the flow"}
    >
      <Globe className="size-3" />
    </div>
  );
}
