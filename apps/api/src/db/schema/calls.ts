import {
  text,
  timestamp,
  integer,
  jsonb,
  index,
  real,
} from "drizzle-orm/pg-core";
import { vaaniSchema } from "./_schema.js";
import type { TranscriptEntry } from "@vaani/shared";
import { organization } from "./auth.js";
import { agents, agentVersions } from "./agents.js";

// ============================================================
// Calls — created at dispatch, finalized by the end-of-call report.
// ============================================================

export const callModeEnum = vaaniSchema.enum("call_mode", [
  "web_test",
  "widget",
  "shared",
  "phone",
  "chat",
]);

export const callDirectionEnum = vaaniSchema.enum("call_direction", [
  "inbound",
  "outbound",
]);

export const callStatusEnum = vaaniSchema.enum("call_status", [
  "queued",
  "in_progress",
  "completed",
  "failed",
  "no_answer",
  "busy",
  "voicemail",
]);

export const calls = vaaniSchema.table(
  "calls",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id),
    agentVersionId: text("agent_version_id").references(() => agentVersions.id),
    mode: callModeEnum("mode").notNull().default("web_test"),
    direction: callDirectionEnum("direction").notNull().default("inbound"),
    status: callStatusEnum("status").notNull().default("queued"),

    fromNumber: text("from_number"),
    toNumber: text("to_number"),

    startedAt: timestamp("started_at"),
    endedAt: timestamp("ended_at"),
    durationSecs: integer("duration_secs"),

    // Filled by the end-of-call report.
    transcript: jsonb("transcript").$type<TranscriptEntry[]>(),
    metrics: jsonb("metrics").$type<Record<string, unknown>>(),
    usage: jsonb("usage").$type<Record<string, unknown>>(),
    analysis: jsonb("analysis").$type<Record<string, unknown>>(),
    qa: jsonb("qa").$type<Record<string, unknown>>(),
    callQualityScore: integer("call_quality_score"),
    sentiment: text("sentiment"),
    summary: text("summary"),

    recordingPath: text("recording_path"),
    totalCost: real("total_cost"),
    error: text("error"),

    // Per-call variable values + arbitrary metadata echoed in the report.
    variables: jsonb("variables").$type<Record<string, string>>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("calls_org_started_idx").on(table.orgId, table.startedAt),
    index("calls_agent_started_idx").on(table.agentId, table.startedAt),
  ]
);
