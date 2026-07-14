/**
 * Credit operations — Phase 2 stub. Ledger-backed balance with row-locking on
 * writes; balance reconstructable from SUM(credit_ledger.amount).
 */

import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { orgCredits, creditLedger } from "../db/schema/index.js";

/** Welcome credits granted to a brand-new org. */
export const DEFAULT_SIGNUP_CREDITS = 2.0;

function round(n: number, decimals = 6): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

// ── Reads ───────────────────────────────────────────────────────────────────

export async function getBalance(orgId: string): Promise<number> {
  const [row] = await db
    .select({ balance: orgCredits.balance })
    .from(orgCredits)
    .where(eq(orgCredits.orgId, orgId));

  if (!row) {
    await initializeOrgCredits(orgId);
    return DEFAULT_SIGNUP_CREDITS;
  }
  return row.balance;
}

export async function hasCredits(orgId: string): Promise<boolean> {
  return (await getBalance(orgId)) > 0;
}

export async function getCreditSummary(orgId: string) {
  const [row] = await db.select().from(orgCredits).where(eq(orgCredits.orgId, orgId));
  if (!row) {
    await initializeOrgCredits(orgId);
    const [fresh] = await db.select().from(orgCredits).where(eq(orgCredits.orgId, orgId));
    return (
      fresh ?? {
        orgId,
        balance: DEFAULT_SIGNUP_CREDITS,
        totalDeposited: DEFAULT_SIGNUP_CREDITS,
        totalSpent: 0,
        lowBalanceThreshold: 0.5,
        updatedAt: new Date(),
      }
    );
  }
  return row;
}

// ── Writes ────────────────────────────────────────────────────────────────

interface DeductOptions {
  orgId: string;
  amount: number;
  type: "call_usage" | "chat_usage";
  referenceId: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

/** Deduct credits atomically. Allows negative balance (call already happened). */
export async function deductCredits(opts: DeductOptions) {
  const { orgId, amount, type, referenceId, description, metadata } = opts;

  return db.transaction(async (tx) => {
    const { rows } = await tx.execute<{ balance: number; total_spent: number }>(
      sql`SELECT balance, total_spent FROM org_credits WHERE org_id = ${orgId} FOR UPDATE`
    );
    const current = rows[0];
    if (!current) throw new Error(`No credit record for org ${orgId}`);

    const newBalance = round(current.balance - amount);
    const newTotalSpent = round(current.total_spent + amount);
    const ledgerEntryId = crypto.randomUUID();

    await tx.insert(creditLedger).values({
      id: ledgerEntryId,
      orgId,
      type,
      amount: round(-amount),
      balanceAfter: newBalance,
      description: description ?? (type === "call_usage" ? "Voice call charge" : "Chat charge"),
      referenceId,
      metadata,
    });

    await tx
      .update(orgCredits)
      .set({ balance: newBalance, totalSpent: newTotalSpent, updatedAt: new Date() })
      .where(eq(orgCredits.orgId, orgId));

    return { newBalance, ledgerEntryId };
  });
}

interface AddCreditsOptions {
  orgId: string;
  amount: number;
  type: "signup_bonus" | "admin_topup" | "refund" | "adjustment";
  description?: string;
  metadata?: Record<string, unknown>;
}

export async function addCredits(opts: AddCreditsOptions) {
  const { orgId, amount, type, description, metadata } = opts;

  return db.transaction(async (tx) => {
    const { rows } = await tx.execute<{ balance: number; total_deposited: number }>(
      sql`SELECT balance, total_deposited FROM org_credits WHERE org_id = ${orgId} FOR UPDATE`
    );
    const current = rows[0];
    if (!current) throw new Error(`No credit record for org ${orgId}`);

    const newBalance = round(current.balance + amount);
    const newTotalDeposited = round(current.total_deposited + amount);
    const ledgerEntryId = crypto.randomUUID();

    await tx.insert(creditLedger).values({
      id: ledgerEntryId,
      orgId,
      type,
      amount: round(amount),
      balanceAfter: newBalance,
      description,
      metadata,
    });

    await tx
      .update(orgCredits)
      .set({ balance: newBalance, totalDeposited: newTotalDeposited, updatedAt: new Date() })
      .where(eq(orgCredits.orgId, orgId));

    return { newBalance, ledgerEntryId };
  });
}

// ── Init ────────────────────────────────────────────────────────────────────

/** Idempotently seed an org's signup credits. */
export async function initializeOrgCredits(orgId: string): Promise<void> {
  const [existing] = await db
    .select({ orgId: orgCredits.orgId })
    .from(orgCredits)
    .where(eq(orgCredits.orgId, orgId));
  if (existing) return;

  await db.transaction(async (tx) => {
    await tx.insert(orgCredits).values({
      orgId,
      balance: DEFAULT_SIGNUP_CREDITS,
      totalDeposited: DEFAULT_SIGNUP_CREDITS,
      totalSpent: 0,
    });
    await tx.insert(creditLedger).values({
      orgId,
      type: "signup_bonus",
      amount: DEFAULT_SIGNUP_CREDITS,
      balanceAfter: DEFAULT_SIGNUP_CREDITS,
      description: "Welcome bonus credits",
    });
  });
}

// ── History ───────────────────────────────────────────────────────────────

export async function getTransactionHistory(query: {
  orgId: string;
  type?: string;
  limit?: number;
  offset?: number;
}) {
  const { orgId, type, limit = 50, offset = 0 } = query;
  const conditions = [eq(creditLedger.orgId, orgId)];
  if (type) conditions.push(eq(creditLedger.type, type));

  return db
    .select()
    .from(creditLedger)
    .where(and(...conditions))
    .orderBy(desc(creditLedger.createdAt))
    .limit(limit)
    .offset(offset);
}
