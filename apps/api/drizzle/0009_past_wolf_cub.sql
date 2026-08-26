CREATE TABLE "inventory_movements" (
	"branch_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"movement_type" varchar(32) NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity_delta" integer NOT NULL,
	"reference_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
INSERT INTO "inventory_movements" (
	"branch_id",
	"business_id",
	"id",
	"movement_type",
	"occurred_at",
	"product_id",
	"quantity_delta",
	"reference_id",
	"tenant_id"
)
SELECT
	"sales"."branch_id",
	"sales"."business_id",
	"sale_items"."id",
	'SALE',
	"sales"."occurred_at",
	"sale_items"."product_id",
	"sale_items"."quantity" * -1,
	"sales"."id",
	"sales"."tenant_id"
FROM "sale_items"
INNER JOIN "sales" ON "sales"."id" = "sale_items"."sale_id"
INNER JOIN "products" ON "products"."id" = "sale_items"."product_id"
WHERE "products"."track_inventory" = true;--> statement-breakpoint
CREATE INDEX "inventory_movements_tenant_business_product_occurred_idx" ON "inventory_movements" USING btree ("tenant_id","business_id","product_id","occurred_at");--> statement-breakpoint
CREATE INDEX "inventory_movements_tenant_reference_idx" ON "inventory_movements" USING btree ("tenant_id","reference_id");
