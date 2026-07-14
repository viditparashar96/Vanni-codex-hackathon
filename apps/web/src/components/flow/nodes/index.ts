/**
 * React Flow node-type registry for the flow canvas.
 *
 * The canvas model tags every node with `type: "flowNode"` and keeps the real
 * node kind on `data.kind` (see `flow-transform.ts`), so a single registered
 * type dispatches to the right per-kind component. Keeping the map a
 * module-level constant is important: React Flow remounts every node if the
 * `nodeTypes` object identity changes between renders.
 */
import { FlowNode } from "./flow-node";

export const nodeTypes = { flowNode: FlowNode } as const;

export { FlowNode } from "./flow-node";
export { StartNode } from "./start-node";
export { ConversationNode } from "./conversation-node";
export { EndNode } from "./end-node";
export { TransferNode } from "./transfer-node";
export { DtmfNode } from "./dtmf-node";
export { SmsNode } from "./sms-node";
export { ValidationBadge } from "./validation-badge";
export { GlobalBadge } from "./global-badge";
