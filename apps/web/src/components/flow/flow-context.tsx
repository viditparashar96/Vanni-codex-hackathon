"use client";

import * as React from "react";
import type { UseFlowEditorReturn } from "@/hooks/use-flow-editor";

/**
 * Exposes the whole flow-editor hook to descendant components (inspector,
 * toolbar, test panel) without prop-drilling through the canvas layout.
 *
 * The provider memoizes the hook return on its most change-prone fields so a
 * consumer that reads only a slice — e.g. the toolbar reading `isDirty` — isn't
 * re-rendered by unrelated state churn. `nodes`/`edges`/`flowConfig` already
 * have stable identities between renders (they come from `useMemo`), and the
 * callbacks are `useCallback`-stable.
 */
const FlowContext = React.createContext<UseFlowEditorReturn | null>(null);

export function FlowProvider({
  value,
  children,
}: {
  value: UseFlowEditorReturn;
  children: React.ReactNode;
}) {
  const memoized = React.useMemo(
    () => value,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      value.nodes,
      value.edges,
      value.flowConfig,
      value.selectedNodeId,
      value.selectedEdgeId,
      value.isDirty,
      value.validationErrors,
      value.activeNodeId,
      value.canUndo,
      value.canRedo,
    ],
  );
  return <FlowContext.Provider value={memoized}>{children}</FlowContext.Provider>;
}

/** Read the editor state; throws if used outside a {@link FlowProvider}. */
export function useFlowContext(): UseFlowEditorReturn {
  const ctx = React.useContext(FlowContext);
  if (!ctx) {
    throw new Error("useFlowContext must be used inside <FlowProvider>");
  }
  return ctx;
}

/** Read the editor state, or `null` when rendered outside a provider. */
export function useOptionalFlowContext(): UseFlowEditorReturn | null {
  return React.useContext(FlowContext);
}
