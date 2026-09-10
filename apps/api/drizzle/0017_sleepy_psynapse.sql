CREATE TABLE "payment_gateway_credentials" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"gateway_code" varchar(32) NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"encrypted_credentials" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_gateway_credentials" ADD CONSTRAINT "payment_gateway_credentials_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_gateway_credentials" ADD CONSTRAINT "payment_gateway_credentials_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_gateway_credentials_business_gateway_idx" ON "payment_gateway_credentials" USING btree ("business_id","gateway_code");