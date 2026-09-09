CREATE TABLE "kiosk_orders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"terminal_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"token_number" varchar(32) NOT NULL,
	"token_sequence" integer NOT NULL,
	"token_sequence_date" varchar(10) NOT NULL,
	"status" varchar(16) DEFAULT 'UNPAID_TOKEN' NOT NULL,
	"items" jsonb NOT NULL,
	"total_amount" integer NOT NULL,
	"gateway_order_id" varchar(120),
	"gateway_payment_ref" varchar(120),
	"sale_id" uuid,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kiosk_token_sequences" (
	"terminal_id" uuid NOT NULL,
	"sequence_date" varchar(10) NOT NULL,
	"last_value" integer DEFAULT 0 NOT NULL,
	"tenant_id" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kiosk_token_sequences_terminal_id_sequence_date_pk" PRIMARY KEY("terminal_id","sequence_date")
);
--> statement-breakpoint
CREATE TABLE "terminal_settings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"terminal_id" uuid NOT NULL,
	"mode" varchar(32) DEFAULT 'BILLING_POS' NOT NULL,
	"kiosk_collects_payment" boolean DEFAULT false NOT NULL,
	"print_dual_tokens" boolean DEFAULT false NOT NULL,
	"gateway_timeout_minutes" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kiosk_orders" ADD CONSTRAINT "kiosk_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kiosk_orders" ADD CONSTRAINT "kiosk_orders_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kiosk_orders" ADD CONSTRAINT "kiosk_orders_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kiosk_orders" ADD CONSTRAINT "kiosk_orders_terminal_id_terminals_id_fk" FOREIGN KEY ("terminal_id") REFERENCES "public"."terminals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kiosk_orders" ADD CONSTRAINT "kiosk_orders_created_by_user_id_auth_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kiosk_orders" ADD CONSTRAINT "kiosk_orders_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kiosk_token_sequences" ADD CONSTRAINT "kiosk_token_sequences_terminal_id_terminals_id_fk" FOREIGN KEY ("terminal_id") REFERENCES "public"."terminals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kiosk_token_sequences" ADD CONSTRAINT "kiosk_token_sequences_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terminal_settings" ADD CONSTRAINT "terminal_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terminal_settings" ADD CONSTRAINT "terminal_settings_terminal_id_terminals_id_fk" FOREIGN KEY ("terminal_id") REFERENCES "public"."terminals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "kiosk_orders_terminal_token_idx" ON "kiosk_orders" USING btree ("terminal_id","token_sequence_date","token_sequence");--> statement-breakpoint
CREATE INDEX "kiosk_orders_tenant_business_status_idx" ON "kiosk_orders" USING btree ("tenant_id","business_id","status");--> statement-breakpoint
CREATE INDEX "kiosk_orders_gateway_order_idx" ON "kiosk_orders" USING btree ("gateway_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "terminal_settings_terminal_idx" ON "terminal_settings" USING btree ("terminal_id");