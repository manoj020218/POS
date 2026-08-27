CREATE TABLE "sync_events" (
	"branch_id" uuid NOT NULL,
	"device_id" varchar(128) NOT NULL,
	"entity_id" varchar(128) NOT NULL,
	"event_created_at" timestamp with time zone NOT NULL,
	"event_id" varchar(128) NOT NULL,
	"event_type" varchar(64) NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"state" varchar(32) DEFAULT 'RECEIVED' NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sync_events" ADD CONSTRAINT "sync_events_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_events" ADD CONSTRAINT "sync_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sync_events_tenant_branch_received_idx" ON "sync_events" USING btree ("tenant_id","branch_id","received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sync_events_tenant_event_idx" ON "sync_events" USING btree ("tenant_id","event_id");--> statement-breakpoint
CREATE INDEX "sync_events_tenant_state_received_idx" ON "sync_events" USING btree ("tenant_id","state","received_at");