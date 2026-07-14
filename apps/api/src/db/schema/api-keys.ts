import { text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { vaaniSchema } from "./_schema.js";
import { organization, user } from "./auth.js";

// ============================================================
// API keys — org-scoped bearer keys for the public API + MCP.
// The raw key is shown once at creation; only a sha256 hash is
// stored. Revocation is a timestamp so usage history survives.
// ============================================================

export const apiKeys = vaaniSchema.table(
  "api_keys",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull().unique(),
    /** Display prefix, e.g. `vaa_ab12cd34` — enough to identify, useless to use. */
    prefix: text("prefix").notNull(),
    scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    lastUsedAt: timestamp("last_used_at"),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("api_keys_org_idx").on(table.orgId)]
);
