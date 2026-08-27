ALTER TABLE "sync_events" ADD COLUMN "failed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sync_events" ADD COLUMN "failure_code" varchar(64);--> statement-breakpoint
ALTER TABLE "sync_events" ADD COLUMN "failure_message" varchar(500);--> statement-breakpoint
ALTER TABLE "sync_events" ADD COLUMN "failure_status_code" integer;