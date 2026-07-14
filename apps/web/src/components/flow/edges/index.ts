/**
 * React Flow edge-type registry. Must be a module-level constant so React Flow
 * doesn't remount every edge when the parent re-renders (same rule as
 * `nodeTypes`).
 */
import { TransitionEdge } from "./transition-edge";

export const edgeTypes = { transition: TransitionEdge } as const;

export { TransitionEdge } from "./transition-edge";
