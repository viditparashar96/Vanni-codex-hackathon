/**
 * MCP endpoint auth + org binding (PRD §6.17).
 *
 * Auth accepts, in order:
 *   1. An org API key (`vaa_…`, minted in Settings → API Keys) — the key's
 *      hash resolves the owning org, so the MCP server is properly
 *      multi-tenant: each key operates on its own workspace.
 *   2. The legacy static MCP_API_KEY env (single-operator dev mode); org
 *      binding falls back to MCP_ORG_ID or the first organization.
 *
 * Writes are attributed to the org's owner member, since MCP calls carry no
 * user session.
 */

import type { Request, Response, NextFunction } from "express";
import { asc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { member, organization } from "../db/schema/index.js";
import { verifyKey } from "../lib/api-keys.js";

export interface McpContext {
  orgId: string;
  orgName: string;
  /** User id MCP-created rows are attributed to (org owner / first member). */
  userId: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Org resolved from a per-org API key, when one authenticated the request. */
      mcpOrgId?: string;
    }
  }
}

function deny(res: Response, code: number, status: number, message: string) {
  res.status(status).json({ jsonrpc: "2.0", error: { code, message }, id: null });
}

export async function mcpAuth(req: Request, res: Response, next: NextFunction) {
  const header = String(req.headers.authorization ?? "");
  const bearer = header.replace(/^Bearer\s+/i, "").trim();

  // 0. Exact match on the static operator key wins — it may share the vaa_
  //    prefix with org keys, so this check must come before the hash lookup.
  const expected = process.env.MCP_API_KEY;
  if (expected && bearer === expected) {
    next();
    return;
  }

  // 1. Per-org API key.
  if (bearer.startsWith("vaa_")) {
    try {
      const verified = await verifyKey(bearer);
      if (verified) {
        req.mcpOrgId = verified.orgId;
        next();
        return;
      }
    } catch (error) {
      console.error("[mcp] key verification failed:", error);
      deny(res, -32603, 500, "Key verification failed");
      return;
    }
    deny(res, -32001, 401, "Invalid or revoked API key");
    return;
  }

  // 2. No key material matched. Open only in keyless dev.
  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      deny(res, -32000, 503, "MCP disabled: no API key configured");
      return;
    }
    next(); // dev convenience: open when nothing is configured
    return;
  }
  if (bearer !== expected) {
    deny(res, -32001, 401, "Invalid or missing API key");
    return;
  }
  next();
}

export async function resolveMcpContext(req: Request): Promise<McpContext | null> {
  // Per-org key wins; then MCP_ORG_ID; then first org (single-tenant dev).
  const pinned = req.mcpOrgId ?? process.env.MCP_ORG_ID;

  const [org] = pinned
    ? await db.select().from(organization).where(eq(organization.id, pinned))
    : await db.select().from(organization).orderBy(asc(organization.createdAt)).limit(1);
  if (!org) return null;

  const members = await db
    .select()
    .from(member)
    .where(eq(member.organizationId, org.id))
    .orderBy(asc(member.createdAt));
  if (members.length === 0) return null;

  const owner = members.find((m) => m.role === "owner") ?? members[0];
  return { orgId: org.id, orgName: org.name, userId: owner.userId };
}
