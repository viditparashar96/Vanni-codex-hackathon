/**
 * API-key issue + verify. Raw keys look like `vaa_<48 hex>`; only the sha256
 * hash is persisted. Verification resolves the owning org, which is what
 * binds MCP/public-API requests to a tenant.
 */

import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db/index.js";
import { apiKeys } from "../db/schema/index.js";

export function hashKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function generateKey(): { rawKey: string; keyHash: string; prefix: string } {
  const rawKey = `vaa_${randomBytes(24).toString("hex")}`;
  return { rawKey, keyHash: hashKey(rawKey), prefix: rawKey.slice(0, 12) };
}

export interface VerifiedKey {
  keyId: string;
  orgId: string;
  scopes: string[];
}

/** Look up an unrevoked key by hash; touches last_used_at (fire-and-forget). */
export async function verifyKey(rawKey: string): Promise<VerifiedKey | null> {
  if (!rawKey.startsWith("vaa_")) return null;
  const [row] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, hashKey(rawKey)), isNull(apiKeys.revokedAt)));
  if (!row) return null;

  void db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.id))
    .catch(() => {});

  return { keyId: row.id, orgId: row.orgId, scopes: row.scopes };
}
