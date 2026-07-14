/**
 * Credits — mounted at /api/orgs/:orgId/credits.
 *   GET /              → OrgCredits contract { balance, burnLast7d }
 *   GET /transactions  → raw credit_ledger rows (newest first)
 */

import { Router, type Request, type Response } from "express";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { creditLedger } from "../db/schema/index.js";
import { requireOrg } from "../middleware/auth.js";
import { getBalance, getTransactionHistory } from "../lib/credits.js";

const router: Router = Router({ mergeParams: true });
router.use(requireOrg);

function orgOf(req: Request): string {
  return req.orgId!;
}

// ── OrgCredits contract ───────────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  const orgId = orgOf(req);

  const since = new Date();
  since.setDate(since.getDate() - 7);

  const balance = await getBalance(orgId);

  // Sum of debit (negative) ledger entries over the last 7 days, as a positive.
  const [burn] = await db
    .select({
      burn: sql<number>`coalesce(sum(-${creditLedger.amount}), 0)::float`,
    })
    .from(creditLedger)
    .where(
      and(
        eq(creditLedger.orgId, orgId),
        gte(creditLedger.createdAt, since),
        lt(creditLedger.amount, 0)
      )
    );

  res.json({ balance, burnLast7d: burn?.burn ?? 0 });
});

// ── Ledger history ─────────────────────────────────────────────────────────────
router.get("/transactions", async (req: Request, res: Response) => {
  const orgId = orgOf(req);
  const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? "50"), 10) || 50, 1), 200);
  const offset = Math.max(parseInt(String(req.query.offset ?? "0"), 10) || 0, 0);
  const type = req.query.type ? String(req.query.type) : undefined;

  const transactions = await getTransactionHistory({ orgId, type, limit, offset });
  res.json({ transactions });
});

export default router;
