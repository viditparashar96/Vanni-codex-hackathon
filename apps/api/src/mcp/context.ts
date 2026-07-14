/**
 * MCP endpoint auth + org binding (PRD §6.17).
 *
 * Auth: `Authorization: Bearer <MCP_API_KEY>` — a single static key for now.
 * DB-backed per-org api_keys (hashed, scoped, revocable) replace this when the
 * api_keys table lands; the middleware is the only thing that changes.
 *
 * Org binding: MCP_ORG_ID env when set, otherwise the first organization row
 * (single-tenant dev convenience). Writes are attributed to the org's owner
 * member, since MCP calls carry no session user.
 */

import type { Request, Response, NextFunction } from "express";
import { asc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { member, organization } from "../db/schema/index.js";

export interface McpContext {
  orgId: string;
  orgName: string;
  /** User id MCP-created rows are attributed to (org owner / first member). */
  userId: string;
}

export function mcpAuth(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.MCP_API_KEY;

  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      res.status(503).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "MCP disabled: MCP_API_KEY is not configured" },
        id: null,
      });
      return;
    }
    next(); // dev convenience: open when no key is configured
    return;
  }

  const header = String(req.headers.authorization ?? "");
  const key = header.replace(/^Bearer\s+/i, "").trim();
  if (key !== expected) {
    res.status(401).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Invalid or missing API key" },
      id: null,
    });
    return;
  }
  next();
}

export async function resolveMcpContext(): Promise<McpContext | null> {
  const configured = process.env.MCP_ORG_ID;

  const [org] = configured
    ? await db.select().from(organization).where(eq(organization.id, configured))
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
