/**
 * Dependency-free auto-layout for the flow canvas.
 *
 * Arranges nodes as a left-to-right layered graph: the initial node sits at
 * rank 0 and every node is placed one rank to the right of the node that
 * reaches it (breadth-first from the entry point). Nodes with no inbound edge
 * that aren't reachable from the entry point are parked in a trailing column so
 * nothing overlaps. Positions are top-left corners (React Flow's convention).
 *
 * Pure: it never mutates the input arrays or node objects — it returns fresh
 * nodes with new `position` values, leaving all other node data untouched.
 */

import type { RFNode } from "@/lib/flow-transform";

/** Approximate rendered node box — matches the min/max widths in flow-nodes. */
export const NODE_WIDTH = 260;
export const NODE_HEIGHT = 132;
/** Horizontal gap between ranks and vertical gap between stacked siblings. */
export const RANK_GAP = 120;
export const SIBLING_GAP = 48;

const MARGIN_X = 40;
const MARGIN_Y = 40;

/** Minimal edge shape the layout needs — a directed source → target link. */
export interface LayoutEdge {
  source: string;
  target: string;
}

/**
 * Assign every node a rank (column) by breadth-first distance from the entry
 * node, then a slot (row) within its rank, and translate that grid into
 * canvas coordinates. Returns new nodes; does not mutate the inputs.
 */
export function autoLayoutNodes(nodes: RFNode[], edges: LayoutEdge[]): RFNode[] {
  if (nodes.length === 0) return nodes;

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const outgoing = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  for (const n of nodes) {
    outgoing.set(n.id, []);
    indegree.set(n.id, 0);
  }
  for (const e of edges) {
    if (!byId.has(e.source) || !byId.has(e.target)) continue;
    outgoing.get(e.source)!.push(e.target);
    indegree.set(e.target, (indegree.get(e.target) ?? 0) + 1);
  }

  // Entry points: the initial node first, then any other root (no inbound).
  const initial = nodes.find((n) => n.data.kind === "initial");
  const roots = nodes.filter((n) => (indegree.get(n.id) ?? 0) === 0);
  const seeds: string[] = [];
  if (initial) seeds.push(initial.id);
  for (const r of roots) if (!seeds.includes(r.id)) seeds.push(r.id);
  if (seeds.length === 0) seeds.push(nodes[0].id); // fully cyclic fallback

  // BFS: a node's rank is the shortest hop-distance from any seed.
  const rank = new Map<string, number>();
  const queue: string[] = [];
  for (const s of seeds) {
    rank.set(s, 0);
    queue.push(s);
  }
  while (queue.length) {
    const id = queue.shift()!;
    const r = rank.get(id)!;
    for (const next of outgoing.get(id) ?? []) {
      if (!rank.has(next) || rank.get(next)! > r + 1) {
        rank.set(next, r + 1);
        queue.push(next);
      }
    }
  }

  // Park anything unreachable in a trailing column so it never overlaps.
  let maxRank = 0;
  for (const r of rank.values()) maxRank = Math.max(maxRank, r);
  for (const n of nodes) {
    if (!rank.has(n.id)) {
      maxRank += 1;
      rank.set(n.id, maxRank);
    }
  }

  // Group nodes by rank, preserving their existing order for stability.
  const byRank = new Map<number, RFNode[]>();
  for (const n of nodes) {
    const r = rank.get(n.id)!;
    (byRank.get(r) ?? byRank.set(r, []).get(r)!).push(n);
  }

  const colStep = NODE_WIDTH + RANK_GAP;
  const rowStep = NODE_HEIGHT + SIBLING_GAP;
  const tallest = Math.max(...[...byRank.values()].map((c) => c.length));
  const columnHeight = tallest * rowStep;

  const positioned = new Map<string, { x: number; y: number }>();
  for (const [r, column] of byRank) {
    const offset = (columnHeight - column.length * rowStep) / 2;
    column.forEach((n, i) => {
      positioned.set(n.id, {
        x: MARGIN_X + r * colStep,
        y: MARGIN_Y + offset + i * rowStep,
      });
    });
  }

  return nodes.map((n) => ({ ...n, position: positioned.get(n.id) ?? n.position }));
}
