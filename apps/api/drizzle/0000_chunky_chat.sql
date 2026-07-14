CREATE TYPE "vaani"."agent_status" AS ENUM('draft', 'testing', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "vaani"."agent_type" AS ENUM('simple', 'flow');--> statement-breakpoint
CREATE TYPE "vaani"."call_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "vaani"."call_mode" AS ENUM('web_test', 'widget', 'shared', 'phone', 'chat');--> statement-breakpoint
CREATE TYPE "vaani"."call_status" AS ENUM('queued', 'in_progress', 'completed', 'failed', 'no_answer', 'busy', 'voicemail');--> statement-breakpoint
CREATE TABLE "vaani"."account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vaani"."invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"inviter_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vaani"."member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vaani"."organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"logo" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "vaani"."session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"active_organization_id" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "vaani"."user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vaani"."verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vaani"."agent_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"label" text,
	"persona_config" jsonb,
	"voice_config" jsonb,
	"advanced_config" jsonb,
	"flow_config" jsonb,
	"tools_config" jsonb DEFAULT '[]'::jsonb,
	"knowledge_base_bindings" jsonb DEFAULT '[]'::jsonb,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vaani"."agents" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" "vaani"."agent_type" DEFAULT 'simple' NOT NULL,
	"status" "vaani"."agent_status" DEFAULT 'draft' NOT NULL,
	"published_version_id" text,
	"created_by" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vaani"."calls" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"agent_id" text NOT NULL,
	"agent_version_id" text,
	"mode" "vaani"."call_mode" DEFAULT 'web_test' NOT NULL,
	"direction" "vaani"."call_direction" DEFAULT 'inbound' NOT NULL,
	"status" "vaani"."call_status" DEFAULT 'queued' NOT NULL,
	"from_number" text,
	"to_number" text,
	"started_at" timestamp,
	"ended_at" timestamp,
	"duration_secs" integer,
	"transcript" jsonb,
	"metrics" jsonb,
	"usage" jsonb,
	"analysis" jsonb,
	"qa" jsonb,
	"call_quality_score" integer,
	"sentiment" text,
	"summary" text,
	"recording_path" text,
	"total_cost" real,
	"error" text,
	"variables" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vaani"."credit_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"type" text NOT NULL,
	"amount" real NOT NULL,
	"balance_after" real NOT NULL,
	"description" text,
	"reference_id" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vaani"."org_credits" (
	"org_id" text PRIMARY KEY NOT NULL,
	"balance" real DEFAULT 0 NOT NULL,
	"total_deposited" real DEFAULT 0 NOT NULL,
	"total_spent" real DEFAULT 0 NOT NULL,
	"low_balance_threshold" real DEFAULT 0.5 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vaani"."realtime_feedback_events" (
	"id" text PRIMARY KEY NOT NULL,
	"call_id" text NOT NULL,
	"type" text NOT NULL,
	"ts" integer NOT NULL,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vaani"."account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "vaani"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaani"."invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "vaani"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaani"."invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "vaani"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaani"."member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "vaani"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaani"."member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "vaani"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaani"."session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "vaani"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaani"."agent_versions" ADD CONSTRAINT "agent_versions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "vaani"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaani"."agent_versions" ADD CONSTRAINT "agent_versions_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "vaani"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaani"."agents" ADD CONSTRAINT "agents_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "vaani"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaani"."agents" ADD CONSTRAINT "agents_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "vaani"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaani"."calls" ADD CONSTRAINT "calls_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "vaani"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaani"."calls" ADD CONSTRAINT "calls_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "vaani"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaani"."calls" ADD CONSTRAINT "calls_agent_version_id_agent_versions_id_fk" FOREIGN KEY ("agent_version_id") REFERENCES "vaani"."agent_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaani"."credit_ledger" ADD CONSTRAINT "credit_ledger_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "vaani"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaani"."org_credits" ADD CONSTRAINT "org_credits_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "vaani"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaani"."realtime_feedback_events" ADD CONSTRAINT "realtime_feedback_events_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "vaani"."calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_versions_agent_version_idx" ON "vaani"."agent_versions" USING btree ("agent_id","version_number");--> statement-breakpoint
CREATE INDEX "agents_org_status_idx" ON "vaani"."agents" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "agents_org_name_idx" ON "vaani"."agents" USING btree ("org_id","name");--> statement-breakpoint
CREATE INDEX "calls_org_started_idx" ON "vaani"."calls" USING btree ("org_id","started_at");--> statement-breakpoint
CREATE INDEX "calls_agent_started_idx" ON "vaani"."calls" USING btree ("agent_id","started_at");--> statement-breakpoint
CREATE INDEX "credit_ledger_org_idx" ON "vaani"."credit_ledger" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "credit_ledger_org_created_idx" ON "vaani"."credit_ledger" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "credit_ledger_type_idx" ON "vaani"."credit_ledger" USING btree ("type");--> statement-breakpoint
CREATE INDEX "realtime_events_call_ts_idx" ON "vaani"."realtime_feedback_events" USING btree ("call_id","ts");--> statement-breakpoint
CREATE INDEX "realtime_events_call_type_idx" ON "vaani"."realtime_feedback_events" USING btree ("call_id","type");