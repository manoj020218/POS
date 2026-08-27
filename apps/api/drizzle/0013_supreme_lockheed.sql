ALTER TABLE "sync_events" ADD COLUMN "updated_at" timestamp with time zone;--> statement-breakpoint
UPDATE "sync_events" SET "updated_at" = COALESCE("failed_at", "received_at");--> statement-breakpoint
ALTER TABLE "sync_events" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "sync_events" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "sync_events_tenant_state_updated_idx" ON "sync_events" USING btree ("tenant_id","state","updated_at");
