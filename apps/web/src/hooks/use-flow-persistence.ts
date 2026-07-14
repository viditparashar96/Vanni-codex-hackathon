"use client";

import * as React from "react";
import type { Agent } from "@/types";
import { type FlowConfig, type FlowValidationError, starterFlow } from "@/lib/flow-contract";
import { api, type AgentVersion } from "@/lib/api-client";

/**
 * Read a flow agent's graph off the server-loaded agent. Falls back to a
 * minimal contract-valid starter when the agent has no `flowConfig` yet, so the
 * editor always opens on a valid graph. Pass the result to
 * `useFlowEditor({ initialConfig })`.
 */
export function flowConfigFromAgent(agent: Agent): FlowConfig {
  const cfg = agent.flowConfig as unknown as FlowConfig | null | undefined;
  return cfg && cfg.nodes?.length ? cfg : starterFlow(agent.name);
}

export interface UseFlowPersistenceOptions {
  agentId: string;
  /** The serialized graph to persist; typically `editor.flowConfig`. */
  flowConfig: FlowConfig;
  isDirty: boolean;
  /** Version label for the new immutable version. */
  label?: string;
  /**
   * Pre-save structural gate. Return the current errors; a non-empty array
   * blocks the save. Wire it to a local `validateFlowGraph(flowConfig)`.
   */
  validate?: () => FlowValidationError[];
  onSaved?: (version: AgentVersion) => void;
  onError?: (error: Error) => void;
  onBlocked?: (errors: FlowValidationError[]) => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export interface UseFlowPersistenceReturn {
  saving: boolean;
  /** Validate then mint a new version via `api.saveFlow`. Resolves the version, or `null` if blocked/failed. */
  save: () => Promise<AgentVersion | null>;
}

/**
 * Owns flow persistence: minting a new version through `api.saveFlow`, plus the
 * editor's global keyboard shortcuts (Cmd/Ctrl+S save, Cmd/Ctrl+Z undo,
 * Cmd/Ctrl+Shift+Z or Ctrl+Y redo) and the unsaved-changes `beforeunload`
 * guard. Save runs the optional local `validate` gate first and refuses to
 * persist an invalid graph (the server would reject it anyway).
 */
export function useFlowPersistence(options: UseFlowPersistenceOptions): UseFlowPersistenceReturn {
  const [saving, setSaving] = React.useState(false);

  // Keep the latest options behind a ref so the shortcut listener can stay
  // subscribed once without going stale.
  const optsRef = React.useRef(options);
  optsRef.current = options;

  const save = React.useCallback(async (): Promise<AgentVersion | null> => {
    const {
      agentId,
      flowConfig,
      label,
      validate,
      onSaved,
      onError,
      onBlocked,
    } = optsRef.current;

    const errors = validate?.() ?? [];
    if (errors.length > 0) {
      onBlocked?.(errors);
      return null;
    }

    setSaving(true);
    try {
      const version = await api.saveFlow(
        agentId,
        flowConfig as unknown as Record<string, unknown>,
        label,
      );
      onSaved?.(version);
      return version;
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error("Save failed"));
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  // Unsaved-changes guard.
  React.useEffect(() => {
    if (!options.isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [options.isDirty]);

  // Keyboard shortcuts.
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "s") {
        e.preventDefault();
        void save();
      } else if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        optsRef.current.onUndo?.();
      } else if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        optsRef.current.onRedo?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [save]);

  return { saving, save };
}
