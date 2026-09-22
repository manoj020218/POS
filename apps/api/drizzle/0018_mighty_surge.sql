ALTER TABLE "auth_users" ADD COLUMN "mobile" varchar(20);--> statement-breakpoint
CREATE UNIQUE INDEX "auth_users_mobile_idx" ON "auth_users" USING btree ("mobile");