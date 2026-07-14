import type { Request, Response, NextFunction } from "express";
import { and, eq } from "drizzle-orm";
import { fromNodeHeaders } from "better-auth/node";
import { auth, type Session, type User } from "../lib/auth.js";
import { db } from "../db/index.js";
import { member } from "../db/schema/index.js";

/**
 * Request augmentation for authenticated + org-scoped handlers.
 * `orgId` is the org the caller is a verified member of — never from the body.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
      session?: Session;
      orgId?: string;
      memberRole?: string;
    }
  }
}

/** Verify the session cookie and attach user/session. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const result = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!result) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.user = result.user;
  req.session = result.session;
  next();
}

/**
 * Enforce that the caller's ACTIVE organization matches the `:orgId` route
 * param, then attach the trusted orgId. Use on every org-scoped route.
 */
export async function requireOrg(req: Request, res: Response, next: NextFunction) {
  const orgId = String(req.params.orgId);
  if (!orgId) {
    res.status(400).json({ error: "Organization ID required" });
    return;
  }

  const result = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!result) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  // Authorize by ACTUAL membership rather than the session's active-org field.
  // This is race-free at signup and correctly supports users in multiple orgs.
  const [membership] = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.userId, result.user.id), eq(member.organizationId, orgId)))
    .limit(1);
  if (!membership) {
    res.status(403).json({ error: "Not a member of this organization" });
    return;
  }

  req.user = result.user;
  req.session = result.session;
  req.orgId = orgId;
  req.memberRole = membership.role;
  next();
}

/**
 * Require the caller's org role to be one of `roles`. Depends on requireOrg
 * having run first (uses the Better Auth active member role).
 */
export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const orgId = req.orgId;
    if (!orgId) {
      res.status(400).json({ error: "Organization context required" });
      return;
    }
    const member = await auth.api
      .getActiveMember({ headers: fromNodeHeaders(req.headers) })
      .catch(() => null);
    if (!member || !roles.includes(member.role)) {
      res.status(403).json({ error: "Insufficient role" });
      return;
    }
    next();
  };
}
