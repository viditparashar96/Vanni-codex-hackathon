import {
  text,
  timestamp,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { vaaniSchema } from "./_schema.js";
import { calls } from "./calls.js";

/**
 * Realtime feedback events (voice-engine → API). Dual-sink: the same rows back
 * both the live WebSocket stream and the historical call-detail timeline.
 * Shape mirrors FeedbackEvent in @vaani/shared.
 */
export const realtimeFeedbackEvents = vaaniSchema.table(
  "realtime_feedback_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    callId: text("call_id")
      .notNull()
      .references(() => calls.id, { onDelete: "cascade" }),
    // FeedbackEventType: transcript | tool_call | node_transition | latency |
    // vad | interruption | call_status
    type: text("type").notNull(),
    // Epoch ms from the engine (kept as-is for timeline alignment).
    ts: integer("ts").notNull(),
    occurredAt: timestamp("occurred_at").notNull().defaultNow(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [
    index("realtime_events_call_ts_idx").on(table.callId, table.ts),
    index("realtime_events_call_type_idx").on(table.callId, table.type),
  ]
);
