import { z } from "zod";
import {
  BackgroundNoiseSchema,
  CustomVariableSchema,
  KnowledgeBaseBindingSchema,
  VadConfigSchema,
  VoicemailConfigSchema,
} from "./agent-config.js";

/**
 * Flow-agent graph schema — the "brain" of a flow-type agent.
 *
 * A flow agent is a no-code, node-graph voice agent: a directed graph of
 * conversation stages ("nodes") wired together by transitions ("functions").
 * Each node has its own objective, prompts, tools, and service overrides; the
 * LLM advances the call by calling one of the node's transition functions when
 * that branch's condition is met.
 *
 * This is the authoring/contract shape stored on a published agent version and
 * handed to the voice engine, which compiles each node into its runtime node
 * config on entry (resolving `{{variables}}`, applying service overrides as
 * pre-actions, and wiring transition handlers).
 *
 * The telephony node types (`transfer` / `dtmf` / `sms`) are fully represented
 * here as configuration. They validate and round-trip; runtime execution of the
 * telephony side effects is layered on later.
 */

// ── Prompt messages ─────────────────────────────────────────────────────────

/**
 * A single prompt message. `role` mirrors the chat roles; the engine may
 * normalise author-supplied `system`/`user` task messages to `developer` at
 * load time to distinguish framework-injected instructions from real speech.
 */
export const FlowMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "developer"]).default("system"),
  content: z.string(),
});
export type FlowMessage = z.infer<typeof FlowMessageSchema>;

// ── Shared enums ──────────────────────────────────────────────────────────

/**
 * How conversation history is carried into a node on entry.
 *  - `append`              keep the full running context (default)
 *  - `reset`               drop prior history, start the node fresh
 *  - `reset_with_summary`  drop history but seed the node with a summary
 *                          (requires a summary prompt — falls back to global
 *                          then to an engine default)
 */
export const ContextStrategyEnum = z.enum([
  "append",
  "reset",
  "reset_with_summary",
]);
export type ContextStrategy = z.infer<typeof ContextStrategyEnum>;

export const FlowNodeTypeEnum = z.enum([
  "initial",
  "node",
  "end",
  "transfer",
  "dtmf",
  "sms",
]);
export type FlowNodeType = z.infer<typeof FlowNodeTypeEnum>;

export const HandlerTypeEnum = z.enum(["transition", "end_conversation"]);
export type HandlerType = z.infer<typeof HandlerTypeEnum>;

/**
 * Named output branches for telephony nodes. A `transfer` node routes its
 * failure path through `transfer-failure`; an `sms` node routes through
 * `sms-success` / `sms-failure`. Plain conversational transitions leave this
 * unset.
 */
export const SourceHandleEnum = z.enum([
  "transfer-failure",
  "sms-success",
  "sms-failure",
]);
export type SourceHandle = z.infer<typeof SourceHandleEnum>;

// ── Transitions (functions) ─────────────────────────────────────────────────

/**
 * A transition out of a node. The LLM picks one by calling it; `description`
 * tells the model WHEN this branch applies. `properties`/`required` are the
 * data captured as the branch fires (JSON-Schema property map) — captured
 * values become available downstream as `{{param}}`.
 */
export const FlowTransitionSchema = z.object({
  /** snake_case function name the LLM calls. */
  name: z
    .string()
    .regex(/^[a-z][a-z0-9_]*$/, "transition name must be snake_case"),
  /** Plain-language condition: when should the model take this branch. */
  description: z.string(),
  handlerType: HandlerTypeEnum.default("transition"),
  /** Target node id for a `transition` handler. Omitted for `end_conversation`. */
  targetNode: z.string().optional(),
  /** JSON-Schema property map for data captured on this transition. */
  properties: z.record(z.string(), z.unknown()).optional(),
  /** Names from `properties` that must be present before the branch fires. */
  required: z.array(z.string()).optional(),
  /** Optional line spoken on entry to the target node. */
  transitionSpeech: z.string().optional(),
  /** Named output branch for telephony nodes (transfer/sms). */
  sourceHandle: SourceHandleEnum.optional(),
});
export type FlowTransition = z.infer<typeof FlowTransitionSchema>;

// ── Per-node service overrides ────────────────────────────────────────────

/**
 * Per-node overrides of the pipeline's LLM/TTS/STT services, applied on entry
 * to the node and reverted implicitly by the next node's own settings.
 */
export const FlowServiceOverridesSchema = z.object({
  llm: z
    .object({
      model: z.string().optional(),
      temperature: z.number().optional(),
    })
    .optional(),
  tts: z
    .object({
      voice: z.string().optional(),
      model: z.string().optional(),
      /** Speaking-rate multiplier. */
      speed: z.number().min(0.6).max(1.5).optional(),
    })
    .optional(),
  stt: z
    .object({
      model: z.string().optional(),
      language: z.string().optional(),
    })
    .optional(),
  /** Hard-mute transcription for this node (agent-only monologue). */
  sttMute: z.boolean().optional(),
});
export type FlowServiceOverrides = z.infer<typeof FlowServiceOverridesSchema>;

// ── Node data ───────────────────────────────────────────────────────────────

export const FlowNodeDataSchema = z.object({
  /** Display name for the node in the editor. */
  label: z.string(),
  /** The node's objective, as system/developer messages. Required, >= 1. */
  taskMessages: z.array(FlowMessageSchema).min(1),
  /** Per-node persona override (usually only on the initial node). */
  roleMessages: z.array(FlowMessageSchema).optional(),
  /**
   * If true (default), the agent speaks on entry; if false, it waits for the
   * caller to speak first.
   */
  respondImmediately: z.boolean().optional(),
  /** Exact text spoken via TTS on entry, bypassing the LLM. */
  firstMessage: z.string().optional(),
  /** Per-node history handling (overrides globalContextStrategy). */
  contextStrategy: ContextStrategyEnum.optional(),
  /** Summary instruction used when contextStrategy === "reset_with_summary". */
  summaryPrompt: z.string().optional(),
  /** Swap LLM/TTS/STT just for this node. */
  serviceOverrides: FlowServiceOverridesSchema.optional(),
  /** Org tool ids available at this node (in addition to global tools). */
  toolIds: z.array(z.string()).optional(),
  /** Per-node RAG knowledge-base binding. */
  knowledgeBase: KnowledgeBaseBindingSchema.optional(),
  /** Transitions out of this node. */
  functions: z.array(FlowTransitionSchema).default([]),

  // ── Telephony node fields (type: transfer | dtmf | sms) ──────────────────
  /** transfer: destination number/SIP the call hands off to. */
  transferTo: z.string().optional(),
  /** transfer: cold hands off immediately; warm whispers a summary first. */
  transferType: z.enum(["cold", "warm"]).optional(),
  /** dtmf: digit string to emit into the call (e.g. "1234#"). */
  dtmfDigits: z.string().optional(),
  /** sms: message body (static) or composition instructions (prompt mode). */
  smsContent: z.string().optional(),
  /** sms: who receives it — the caller, or a fixed number. */
  smsTo: z.enum(["caller", "static"]).optional(),
  /** sms: destination number when smsTo === "static". */
  smsToNumber: z.string().optional(),
});
export type FlowNodeData = z.infer<typeof FlowNodeDataSchema>;

export const FlowNodeSchema = z.object({
  id: z.string(),
  type: FlowNodeTypeEnum,
  /** Editor canvas coordinates. */
  position: z.object({ x: z.number(), y: z.number() }).optional(),
  data: FlowNodeDataSchema,
});
export type FlowNode = z.infer<typeof FlowNodeSchema>;

// ── Post-call analysis (config) ───────────────────────────────────────────

export const PostCallAnalysisFieldSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "boolean", "enum", "array", "object"]),
  description: z.string().optional(),
  required: z.boolean().optional(),
  /** Allowed values when type === "enum". */
  enumValues: z.array(z.string()).optional(),
  /** Element type when type === "array" (ignored otherwise). */
  arrayItemType: z.enum(["string", "number", "boolean"]).optional(),
});
export type PostCallAnalysisField = z.infer<typeof PostCallAnalysisFieldSchema>;

export const PostCallAnalysisConfigSchema = z.object({
  enabled: z.boolean().default(false),
  analysisPrompt: z.string().optional(),
  analysisSchema: z.array(PostCallAnalysisFieldSchema).optional(),
});
export type PostCallAnalysisConfig = z.infer<
  typeof PostCallAnalysisConfigSchema
>;

// ── Global call settings ────────────────────────────────────────────────────

/**
 * The flow-agent counterpart to AdvancedConfig. Call-level behaviour that
 * applies across every node. Defaults mirror the simple-agent advanced config.
 */
export const GlobalCallSettingsSchema = z.object({
  maxCallDurationSecs: z.number().default(240),
  inactivityTimeoutSecs: z.number().default(30),
  timezone: z.string().default("UTC"),
  vad: VadConfigSchema.prefault({}),
  backgroundNoise: BackgroundNoiseSchema.prefault({}),
  gracefulExitEnabled: z.boolean().default(true),
  gracefulExitWarningSecs: z.number().default(30),
  goodbyeMessage: z.string().default("Thank you for your time. Goodbye!"),
  voicemail: VoicemailConfigSchema.prefault({}),
  postCallAnalysis: PostCallAnalysisConfigSchema.optional(),
});
export type GlobalCallSettings = z.infer<typeof GlobalCallSettingsSchema>;

// ── Flow config ─────────────────────────────────────────────────────────────

export const FlowMetaSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
});
export type FlowMeta = z.infer<typeof FlowMetaSchema>;

export const FlowConfigSchema = z.object({
  meta: FlowMetaSchema,
  /** The conversation graph. Required, >= 1 node. */
  nodes: z.array(FlowNodeSchema).min(1),
  /** Persona applied at every node (unless a node overrides it). */
  globalRoleMessages: z.array(FlowMessageSchema).optional(),
  /** Org tool ids available at every node. */
  globalToolIds: z.array(z.string()).optional(),
  /** RAG knowledge bases queried at every node. */
  globalKnowledgeBases: z.array(KnowledgeBaseBindingSchema).optional(),
  globalContextStrategy: ContextStrategyEnum.optional(),
  /** Fallback summary prompt for the reset_with_summary strategy. */
  globalSummaryPrompt: z.string().optional(),
  /** Variables usable as `{{name}}` in any prompt. */
  customVariables: z.array(CustomVariableSchema).optional(),
  /** Call-level behaviour (the flow-agent equivalent of AdvancedConfig). */
  globalCallSettings: GlobalCallSettingsSchema.optional(),
});
export type FlowConfig = z.infer<typeof FlowConfigSchema>;

// ── Validation ────────────────────────────────────────────────────────────

export interface FlowValidationError {
  /** The node the error is anchored to, when applicable. */
  nodeId?: string;
  message: string;
}

/**
 * Structural validation of a flow graph, beyond what the Zod schema enforces.
 *
 * Pure: no I/O, no mutation of the input. Returns every error found (does not
 * short-circuit) so an editor can surface them all at once. An empty array
 * means the graph is structurally sound.
 *
 * Enforces:
 *  - exactly one `initial` node;
 *  - at least one `end` node;
 *  - every non-`end` node has at least one outgoing transition (no dead ends);
 *  - every transition `targetNode` resolves to a real node;
 *  - a `transfer` node defines a `transfer-failure` branch;
 *  - an `sms` node defines both `sms-success` and `sms-failure` branches.
 */
export function validateFlowConfig(flow: FlowConfig): FlowValidationError[] {
  const errors: FlowValidationError[] = [];
  const nodes = flow?.nodes ?? [];

  // Node id index + duplicate detection.
  const idCounts = new Map<string, number>();
  for (const node of nodes) {
    idCounts.set(node.id, (idCounts.get(node.id) ?? 0) + 1);
  }
  for (const [id, count] of idCounts) {
    if (count > 1) {
      errors.push({ nodeId: id, message: `Duplicate node id '${id}' (${count} nodes).` });
    }
  }
  const knownIds = new Set(idCounts.keys());

  // Exactly one initial node.
  const initialCount = nodes.filter((n) => n.type === "initial").length;
  if (initialCount === 0) {
    errors.push({ message: "Flow must have exactly one 'initial' node (found none)." });
  } else if (initialCount > 1) {
    errors.push({
      message: `Flow must have exactly one 'initial' node (found ${initialCount}).`,
    });
  }

  // At least one end node.
  if (!nodes.some((n) => n.type === "end")) {
    errors.push({ message: "Flow must have at least one 'end' node." });
  }

  for (const node of nodes) {
    const fns = node.data?.functions ?? [];

    // No dead ends: every non-end node needs a way out.
    if (node.type !== "end" && fns.length === 0) {
      errors.push({
        nodeId: node.id,
        message: `Node '${node.id}' has no outgoing transitions (dead end).`,
      });
    }

    // Every transition target must resolve.
    for (const fn of fns) {
      if (fn.targetNode && !knownIds.has(fn.targetNode)) {
        errors.push({
          nodeId: node.id,
          message: `Transition '${fn.name}' targets unknown node '${fn.targetNode}'.`,
        });
      }
    }

    // Transfer node must have a failure branch.
    if (node.type === "transfer") {
      if (!fns.some((f) => f.sourceHandle === "transfer-failure")) {
        errors.push({
          nodeId: node.id,
          message: `Transfer node '${node.id}' must define a 'transfer-failure' branch.`,
        });
      }
    }

    // SMS node must have both success and failure branches.
    if (node.type === "sms") {
      if (!fns.some((f) => f.sourceHandle === "sms-success")) {
        errors.push({
          nodeId: node.id,
          message: `SMS node '${node.id}' must define an 'sms-success' branch.`,
        });
      }
      if (!fns.some((f) => f.sourceHandle === "sms-failure")) {
        errors.push({
          nodeId: node.id,
          message: `SMS node '${node.id}' must define an 'sms-failure' branch.`,
        });
      }
    }
  }

  return errors;
}
