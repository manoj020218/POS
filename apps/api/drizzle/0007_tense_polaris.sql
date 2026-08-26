CREATE TABLE "sale_items" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"discount_amount" integer DEFAULT 0 NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name" varchar(160) NOT NULL,
	"product_sku" varchar(64) NOT NULL,
	"quantity" integer NOT NULL,
	"sale_id" uuid NOT NULL,
	"subtotal_amount" integer NOT NULL,
	"tax_amount" integer DEFAULT 0 NOT NULL,
	"tenant_id" uuid NOT NULL,
	"total_amount" integer NOT NULL,
	"unit_price" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"branch_code" varchar(32) NOT NULL,
	"branch_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"cashier_user_id" uuid NOT NULL,
	"change_amount" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"customer_id" uuid,
	"customer_name" varchar(160),
	"discount_amount" integer DEFAULT 0 NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"payment_method" varchar(16) NOT NULL,
	"subtotal_amount" integer NOT NULL,
	"tax_amount" integer DEFAULT 0 NOT NULL,
	"tendered_amount" integer NOT NULL,
	"tenant_id" uuid NOT NULL,
	"terminal_code" varchar(32) NOT NULL,
	"terminal_id" uuid NOT NULL,
	"total_amount" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_cashier_user_id_auth_users_id_fk" FOREIGN KEY ("cashier_user_id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_terminal_id_terminals_id_fk" FOREIGN KEY ("terminal_id") REFERENCES "public"."terminals"("id") ON DELETE no action ON UPDATE no action;