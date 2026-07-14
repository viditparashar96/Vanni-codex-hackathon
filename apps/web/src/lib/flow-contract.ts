/**
 * Flow-graph authoring contract — a dependency-free mirror of the shared
 * `FlowConfig` schema (the `@vaani/shared` flow package).
 *
 * The web app doesn't depend on the server package, so — exactly like the
 * version payload shapes in `api-client.ts` — the contract is restated here as
 * plain TypeScript. It must stay in lock-step with the Zod schema the API
 * validates against; the field docs below summarise that contract.
 */

export type FlowMessageRole = "system" | "user" | "assistant" | "developer";

export interface FlowMessage {
  role: FlowMessageRole;
  content: string;
}

/** How conversation history is carried into a node on entry. */
export type ContextStrategy = "append" | "reset" | "reset_with_summary";

/** The six node kinds a flow graph is built from. */
export type FlowNodeType =
  | "initial"
  | "node"
  | "end"
  | "transfer"
  | "dtmf"
  | "sms";

export type HandlerType = "transition" | "end_conversation";

/**
 * Named output branches for telephony nodes. A `transfer` node routes its
 * failure path through `transfer-failure`; an `sms` node routes through
 * `sms-success` / `sms-failure`. Plain conversational transitions leave this
 * unset (the node's default source handle).
 */
export type SourceHandle = "transfer-failure" | "sms-success" | "sms-failure";

/** A transition (function) out of a node. */
export interface FlowTransition {
  /** snake_case function name the LLM calls. */
  name: string;
  /** Plain-language condition: when should the model take this branch. */
  description: string;
  handlerType: HandlerType;
  /** Target node id for a `transition` handler. Omitted for `end_conversation`. */
  targetNode?: string;
  /** JSON-Schema property map for data captured on this transition. */
  properties?: Record<string, unknown>;
  /** Names from `properties` that must be present before the branch fires. */
  required?: string[];
  /** Optional line spoken on entry to the target node. */
  transitionSpeech?: string;
  /** Named output branch for telephony nodes (transfer/sms). */
  sourceHandle?: SourceHandle;
}

/** Per-node overrides of the pipeline's LLM/TTS/STT services. */
export interface FlowServiceOverrides {
  llm?: { model?: string; temperature?: number };
  tts?: { voice?: string; model?: string; speed?: number };
  stt?: { model?: string; language?: string };
  /** Hard-mute transcription for this node (agent-only monologue). */
  sttMute?: boolean;
}

export interface KnowledgeBaseBinding {
  knowledgeBaseId: string;
  chunksToRetrieve?: number;
  similarityThreshold?: number;
}

export interface FlowNodeData {
  /** Display name for the node in the editor. */
  label: string;
  /** The node's objective, as system/developer messages. Required, >= 1. */
  taskMessages: FlowMessage[];
  /** Per-node persona override (usually only on the initial node). */
  roleMessages?: FlowMessage[];
  /** If true (default) the agent speaks on entry; if false it waits. */
  respondImmediately?: boolean;
  /** Exact text spoken via TTS on entry, bypassing the LLM. */
  firstMessage?: string;
  /** Per-node history handling (overrides globalContextStrategy). */
  contextStrategy?: ContextStrategy;
  /** Summary instruction used when contextStrategy === "reset_with_summary". */
  summaryPrompt?: string;
  /** Swap LLM/TTS/STT just for this node. */
  serviceOverrides?: FlowServiceOverrides;
  /** Org tool ids available at this node (in addition to global tools). */
  toolIds?: string[];
  /** Per-node RAG knowledge-base binding. */
  knowledgeBase?: KnowledgeBaseBinding;
  /** Transitions out of this node. */
  functions: FlowTransition[];

  // ── Telephony node fields (type: transfer | dtmf | sms) ──────────────────
  transferTo?: string;
  transferType?: "cold" | "warm";
  dtmfDigits?: string;
  smsContent?: string;
  smsTo?: "caller" | "static";
  smsToNumber?: string;
}

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  position?: { x: number; y: number };
  data: FlowNodeData;
}

export interface CustomVariable {
  name: string;
  defaultValue?: string;
  description?: string;
}

export interface FlowMeta {
  name: string;
  version: string;
  description?: string;
}

export interface FlowConfig {
  meta: FlowMeta;
  nodes: FlowNode[];
  globalRoleMessages?: FlowMessage[];
  globalToolIds?: string[];
  globalKnowledgeBases?: KnowledgeBaseBinding[];
  globalContextStrategy?: ContextStrategy;
  globalSummaryPrompt?: string;
  customVariables?: CustomVariable[];
  globalCallSettings?: Record<string, unknown>;
}

export interface FlowValidationError {
  nodeId?: string;
  message: string;
}

// ── Presentation metadata ─────────────────────────────────────────────────

export const NODE_TYPE_ORDER: FlowNodeType[] = [
  "initial",
  "node",
  "transfer",
  "dtmf",
  "sms",
  "end",
];

/** Which node kinds can be added from the palette (initial is singleton). */
export const ADDABLE_NODE_TYPES: FlowNodeType[] = [
  "node",
  "transfer",
  "dtmf",
  "sms",
  "end",
];

/** Node kinds that terminate the call and take no outgoing transitions. */
export function isTerminalNode(type: FlowNodeType): boolean {
  return type === "end";
}

/** The named source handles a node exposes, beyond its default handle. */
export function namedSourceHandles(type: FlowNodeType): SourceHandle[] {
  if (type === "transfer") return ["transfer-failure"];
  if (type === "sms") return ["sms-success", "sms-failure"];
  return [];
}

/** True when a node kind routes ALL its transitions through named handles. */
export function usesOnlyNamedHandles(type: FlowNodeType): boolean {
  return type === "sms";
}

// ── Factories ──────────────────────────────────────────────────────────────

const SNAKE = /^[a-z][a-z0-9_]*$/;

/** Coerce arbitrary text into a valid snake_case transition name. */
export function toSnakeCase(input: string, fallback = "next"): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_")
    .replace(/^[^a-z]+/, "");
  return SNAKE.test(slug) ? slug : fallback;
}

/** Ensure a candidate transition name is unique within a set of taken names. */
export function uniqueTransitionName(base: string, taken: Set<string>): string {
  const seed = toSnakeCase(base);
  if (!taken.has(seed)) return seed;
  let i = 2;
  while (taken.has(`${seed}_${i}`)) i += 1;
  return `${seed}_${i}`;
}

const DEFAULT_LABELS: Record<FlowNodeType, string> = {
  initial: "Start",
  node: "New stage",
  end: "End call",
  transfer: "Transfer call",
  dtmf: "Send DTMF",
  sms: "Send SMS",
};

const DEFAULT_TASKS: Record<FlowNodeType, string> = {
  initial: "Greet the caller and establish the purpose of the call.",
  node: "Describe this stage's objective — the LLM uses it as the node prompt.",
  end: "Thank the caller, restate anything confirmed, and end the call politely.",
  transfer: "Announce the caller and hand the call over with a one-line summary.",
  dtmf: "Emit the required digits into the call to navigate the phone menu.",
  sms: "Compose and send the text message to the recipient.",
};

/** A fresh node of the given kind, pre-seeded with contract-valid defaults. */
export function makeNode(type: FlowNodeType, id: string, position: { x: number; y: number }): FlowNode {
  const data: FlowNodeData = {
    label: DEFAULT_LABELS[type],
    taskMessages: [{ role: "system", content: DEFAULT_TASKS[type] }],
    functions: [],
  };
  if (type === "initial") {
    data.respondImmediately = true;
    data.firstMessage = "";
  }
  if (type === "transfer") {
    data.transferType = "warm";
    data.transferTo = "";
  }
  if (type === "dtmf") {
    data.dtmfDigits = "";
  }
  if (type === "sms") {
    data.smsTo = "caller";
    data.smsContent = "";
  }
  return { id, type, position, data };
}

// ── Local structural validation ────────────────────────────────────────────

/**
 * Client-side mirror of the server's `validateFlowConfig` structural checks.
 * Used for instant inline feedback; the authoritative verdict still comes from
 * the backend `validate-flow` endpoint when it's configured. Kept in lock-step
 * with the shared schema's rules.
 */
export function validateFlowGraph(config: FlowConfig): FlowValidationError[] {
  const errors: FlowValidationError[] = [];
  const nodes = config.nodes ?? [];

  const idCounts = new Map<string, number>();
  for (const n of nodes) idCounts.set(n.id, (idCounts.get(n.id) ?? 0) + 1);
  for (const [id, count] of idCounts) {
    if (count > 1) errors.push({ nodeId: id, message: `Duplicate node id '${id}' (${count} nodes).` });
  }
  const known = new Set(idCounts.keys());

  const initials = nodes.filter((n) => n.type === "initial").length;
  if (initials === 0) errors.push({ message: "Flow must have exactly one 'initial' node (found none)." });
  else if (initials > 1) errors.push({ message: `Flow must have exactly one 'initial' node (found ${initials}).` });

  if (!nodes.some((n) => n.type === "end")) errors.push({ message: "Flow must have at least one 'end' node." });

  for (const node of nodes) {
    const fns = node.data?.functions ?? [];
    if (node.type !== "end" && fns.length === 0) {
      errors.push({ nodeId: node.id, message: `Node '${node.id}' has no outgoing transitions (dead end).` });
    }
    for (const fn of fns) {
      if (!fn.name || !/^[a-z][a-z0-9_]*$/.test(fn.name)) {
        errors.push({ nodeId: node.id, message: `Transition '${fn.name || "(unnamed)"}' must be snake_case.` });
      }
      if (fn.handlerType === "transition" && !fn.targetNode) {
        errors.push({ nodeId: node.id, message: `Transition '${fn.name}' has no target node.` });
      }
      if (fn.targetNode && !known.has(fn.targetNode)) {
        errors.push({ nodeId: node.id, message: `Transition '${fn.name}' targets unknown node '${fn.targetNode}'.` });
      }
    }
    if (node.type === "transfer" && !fns.some((f) => f.sourceHandle === "transfer-failure")) {
      errors.push({ nodeId: node.id, message: `Transfer node '${node.id}' must define a 'transfer-failure' branch.` });
    }
    if (node.type === "sms") {
      if (!fns.some((f) => f.sourceHandle === "sms-success"))
        errors.push({ nodeId: node.id, message: `SMS node '${node.id}' must define an 'sms-success' branch.` });
      if (!fns.some((f) => f.sourceHandle === "sms-failure"))
        errors.push({ nodeId: node.id, message: `SMS node '${node.id}' must define an 'sms-failure' branch.` });
    }
  }
  return errors;
}

/** A minimal, contract-valid starter graph for agents with no flow yet. */
export function starterFlow(name: string): FlowConfig {
  return {
    meta: { name: name || "Untitled flow", version: "1.0.0" },
    nodes: [
      {
        id: "start",
        type: "initial",
        position: { x: 0, y: 120 },
        data: {
          label: "Greeting",
          taskMessages: [
            { role: "system", content: DEFAULT_TASKS.initial },
          ],
          respondImmediately: true,
          firstMessage: "Hi, thanks for calling. How can I help you today?",
          functions: [
            {
              name: "continue",
              description: "The caller has stated what they need.",
              handlerType: "transition",
              targetNode: "wrap_up",
            },
          ],
        },
      },
      {
        id: "wrap_up",
        type: "end",
        position: { x: 380, y: 120 },
        data: {
          label: "Wrap up",
          taskMessages: [{ role: "system", content: DEFAULT_TASKS.end }],
          functions: [],
        },
      },
    ],
  };
}
