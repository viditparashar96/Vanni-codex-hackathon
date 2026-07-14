/**
 * API keys — mounted at /api/orgs/:orgId/api-keys.
 *   GET    /         → list (masked: prefix only)
 *   POST   /         → create; response includes the raw key EXACTLY ONCE
 *   DELETE /:keyId   → revoke (sets revoked_at; history preserved)
 * Create/revoke require owner or admin role.
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { apiKeys } from "../db/schema/index.js";
import { requireOrg } from "../middleware/auth.js";
import { generateKey } from "../lib/api-keys.js";

const router: Router = Router({ mergeParams: true });
router.use(requireOrg);

function orgOf(req: Request): string {
  return req.orgId!;
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.memberRole !== "owner" && req.memberRole !== "admin") {
    res.status(403).json({ error: "Requires owner or admin role" });
    return;
  }
  next();
}

function serialize(row: typeof apiKeys.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    scopes: row.scopes,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

router.get("/", async (req: Request, res: Response) => {
  const rows = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.orgId, orgOf(req)))
    .orderBy(desc(apiKeys.createdAt));
  res.json(rows.map(serialize));
});

const createSchema = z.object({
  name: z.string().min(1).max(80),
  scopes: z.array(z.string()).optional(),
});

router.post("/", requireAdmin, async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.issues });
    return;
  }

  const { rawKey, keyHash, prefix } = generateKey();
  const [row] = await db
    .insert(apiKeys)
    .values({
      orgId: orgOf(req),
      name: parsed.data.name,
      keyHash,
      prefix,
      scopes: parsed.data.scopes ?? ["*"],
      createdBy: req.user!.id,
    })
    .returning();

  // The only time the raw key ever leaves the server.
  res.status(201).json({ ...serialize(row), key: rawKey });
});

router.delete("/:keyId", requireAdmin, async (req: Request, res: Response) => {
  const [updated] = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, String(req.params.keyId)), eq(apiKeys.orgId, orgOf(req))))
    .returning({ id: apiKeys.id });
  if (!updated) {
    res.status(404).json({ error: "Key not found" });
    return;
  }
  res.json({ revoked: true, id: updated.id });
});

export default router;
