import {
  text,
  timestamp,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { vaaniSchema } from "./_schema.js";
import type {
  PersonaConfig,
  VoiceConfig,
  AdvancedConfig,
  HttpTool,
  KnowledgeBaseBinding,
} from "@vaani/shared";
import { organization, user } from "./auth.js";

// ============================================================
// Agents + immutable agent versions.
// ============================================================

export const agentTypeEnum = vaaniSchema.enum("agent_type", ["simple", "flow"]);

export const agentStatusEnum = vaaniSchema.enum("agent_status", [
  "draft",
  "testing",
  "active",
  "archived",
]);

export const agents = vaaniSchema.table(
  "agents",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    type: agentTypeEnum("type").notNull().default("simple"),
    status: agentStatusEnum("status").notNull().default("draft"),
    // The currently published (live) version. NULL until first publish.
    publishedVersionId: text("published_version_id"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    tags: jsonb("tags").$type<string[]>().default([]),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("agents_org_status_idx").on(table.orgId, table.status),
    index("agents_org_name_idx").on(table.orgId, table.name),
  ]
);

export const agentVersions = vaaniSchema.table(
  "agent_versions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    label: text("label"),

    // Config blocks mirror the @vaani/shared contract (stored partial while a
    // version is still a draft; fully resolved at publish/dispatch time).
    personaConfig: jsonb("persona_config").$type<Partial<PersonaConfig>>(),
    voiceConfig: jsonb("voice_config").$type<Partial<VoiceConfig>>(),
    advancedConfig: jsonb("advanced_config").$type<Partial<AdvancedConfig>>(),
    // Flow-graph passthrough (finalized in Phase 5 against dynamic-flows).
    flowConfig: jsonb("flow_config").$type<Record<string, unknown>>(),

    // Inline HTTP tool definitions + KB bindings for this version.
    toolsConfig: jsonb("tools_config").$type<HttpTool[]>().default([]),
    knowledgeBaseBindings: jsonb("knowledge_base_bindings")
      .$type<KnowledgeBaseBinding[]>()
      .default([]),

    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("agent_versions_agent_version_idx").on(
      table.agentId,
      table.versionNumber
    ),
  ]
);
