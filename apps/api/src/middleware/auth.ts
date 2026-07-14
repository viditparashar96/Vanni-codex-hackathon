import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth, type Session, type User } from "../lib/auth.js";

/**
 * Request augmentation for authenticated + org-scoped handlers.
 * `orgId` is always the session's active org — never trusted from the body.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
      session?: Session;
      orgId?: string;
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
  const orgId = req.params.orgId;
  if (!orgId) {
    res.status(400).json({ error: "Organization ID required" });
    return;
  }

  const result = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!result) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (result.session.activeOrganizationId !== orgId) {
    res.status(403).json({ error: "Not a member of this organization" });
    return;
  }

  req.user = result.user;
  req.session = result.session;
  req.orgId = orgId;
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
