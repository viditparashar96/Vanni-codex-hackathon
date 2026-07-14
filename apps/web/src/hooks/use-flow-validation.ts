"use client";

import * as React from "react";
import { type FlowConfig, type FlowValidationError, validateFlowGraph } from "@/lib/flow-contract";
import { api } from "@/lib/api-client";

const API_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_API_URL);
const DEFAULT_DEBOUNCE_MS = 400;

/** Recover a leading `[nodeId]` tag from a backend error string, if present. */
function parseError(message: string): FlowValidationError {
  const m = /^\[([^\]]+)\]\s*(.*)$/.exec(message);
  return m ? { nodeId: m[1], message: m[2] } : { message };
}

export interface UseFlowValidationOptions {
  agentId: string;
  /** The serialized graph to validate; typically `editor.flowConfig`. */
  flowConfig: FlowConfig;
  /** Receives the authoritative error list after each debounced run. */
  onResult: (errors: FlowValidationError[]) => void;
  /** Skip the backend round-trip and validate locally only. */
  localOnly?: boolean;
  debounceMs?: number;
}

/**
 * Debounced flow validation. On every change it runs the local structural
 * mirror (`validateFlowGraph`) for instant feedback, then — unless `localOnly`
 * — asks the backend (`api.validateFlow`) for the authoritative verdict and
 * replaces the local result with it. Network / unconfigured-backend failures
 * silently keep the local result.
 *
 * Results are delivered through `onResult` (wire it to
 * `editor.setValidationErrors`); the hook returns only its in-flight flag.
 */
export function useFlowValidation({
  agentId,
  flowConfig,
  onResult,
  localOnly = false,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: UseFlowValidationOptions): { validating: boolean } {
  const [validating, setValidating] = React.useState(false);

  const onResultRef = React.useRef(onResult);
  onResultRef.current = onResult;

  // Monotonic token so a slow response never overwrites a newer one.
  const runRef = React.useRef(0);

  React.useEffect(() => {
    const handle = setTimeout(() => {
      const runId = ++runRef.current;
      const local = validateFlowGraph(flowConfig);
      onResultRef.current(local);

      if (localOnly || !API_CONFIGURED) return;

      setValidating(true);
      api
        .validateFlow(agentId, flowConfig as unknown as Record<string, unknown>)
        .then((res) => {
          if (runId !== runRef.current) return; // superseded
          onResultRef.current(res.errors.map(parseError));
        })
        .catch(() => {
          /* keep the local result on failure */
        })
        .finally(() => {
          if (runId === runRef.current) setValidating(false);
        });
    }, debounceMs);

    return () => clearTimeout(handle);
  }, [agentId, flowConfig, localOnly, debounceMs]);

  return { validating };
}
