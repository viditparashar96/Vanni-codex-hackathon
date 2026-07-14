import { pgSchema } from "drizzle-orm/pg-core";

/**
 * All Vaani tables live in a dedicated `vaani` Postgres schema, isolated from
 * anything in `public`. Use `vaaniSchema.table(...)` / `vaaniSchema.enum(...)`
 * instead of the top-level `pgTable` / `pgEnum`.
 */
export const vaaniSchema = pgSchema("vaani");
