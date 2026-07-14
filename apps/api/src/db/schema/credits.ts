import {
  text,
  timestamp,
  real,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { vaaniSchema } from "./_schema.js";
import { organization } from "./auth.js";

// ============================================================
// Credit system — ledger-based billing with a cached balance.
// Phase 2 ships the stub: signup bonus + read/deduct/add + history.
// ============================================================

/** Denormalized per-org balance for O(1) reads. */
export const orgCredits = vaaniSchema.table("org_credits", {
  orgId: text("org_id")
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  balance: real("balance").notNull().default(0),
  totalDeposited: real("total_deposited").notNull().default(0),
  totalSpent: real("total_spent").notNull().default(0),
  lowBalanceThreshold: real("low_balance_threshold").notNull().default(0.5),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Immutable append-only ledger — balance reconstructable from SUM(amount). */
export const creditLedger = vaaniSchema.table(
  "credit_ledger",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // signup_bonus | admin_topup | call_usage | chat_usage | refund | adjustment
    type: text("type").notNull(),
    amount: real("amount").notNull(), // positive = credit, negative = debit
    balanceAfter: real("balance_after").notNull(),
    description: text("description"),
    referenceId: text("reference_id"), // callId for usage
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("credit_ledger_org_idx").on(table.orgId),
    index("credit_ledger_org_created_idx").on(table.orgId, table.createdAt),
    index("credit_ledger_type_idx").on(table.type),
  ]
);
