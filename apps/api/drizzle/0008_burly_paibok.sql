CREATE TABLE "sale_sequences" (
	"last_value" integer DEFAULT 0 NOT NULL,
	"tenant_id" uuid NOT NULL,
	"terminal_id" uuid PRIMARY KEY NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "invoice_number" varchar(96);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "invoice_sequence" integer;--> statement-breakpoint
WITH ranked_sales AS (
	SELECT
		"id",
		"terminal_id",
		"tenant_id",
		"branch_code",
		"terminal_code",
		ROW_NUMBER() OVER (
			PARTITION BY "terminal_id"
			ORDER BY "occurred_at", "created_at", "id"
		)::integer AS "invoice_sequence"
	FROM "sales"
),
normalized_sales AS (
	SELECT
		"id",
		"terminal_id",
		"tenant_id",
		"invoice_sequence",
		'INV-' ||
			COALESCE(
				NULLIF(
					TRIM(BOTH '-' FROM REGEXP_REPLACE(UPPER(TRIM("branch_code")), '[^A-Z0-9]+', '-', 'g')),
					''
				),
				'NA'
			) ||
			'-' ||
			COALESCE(
				NULLIF(
					TRIM(BOTH '-' FROM REGEXP_REPLACE(UPPER(TRIM("terminal_code")), '[^A-Z0-9]+', '-', 'g')),
					''
				),
				'NA'
			) ||
			'-' ||
			LPAD("invoice_sequence"::text, 6, '0') AS "invoice_number"
	FROM ranked_sales
),
updated_sales AS (
	UPDATE "sales" AS "sales_to_update"
	SET
		"invoice_number" = normalized_sales."invoice_number",
		"invoice_sequence" = normalized_sales."invoice_sequence"
	FROM normalized_sales
	WHERE "sales_to_update"."id" = normalized_sales."id"
	RETURNING
		normalized_sales."terminal_id",
		normalized_sales."tenant_id",
		normalized_sales."invoice_sequence"
)
INSERT INTO "sale_sequences" ("last_value", "tenant_id", "terminal_id")
SELECT
	MAX("invoice_sequence") AS "last_value",
	"tenant_id",
	"terminal_id"
FROM updated_sales
GROUP BY "tenant_id", "terminal_id"
ON CONFLICT ("terminal_id") DO UPDATE
SET
	"last_value" = EXCLUDED."last_value",
	"tenant_id" = EXCLUDED."tenant_id",
	"updated_at" = now();--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "invoice_number" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "invoice_sequence" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sale_sequences" ADD CONSTRAINT "sale_sequences_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_sequences" ADD CONSTRAINT "sale_sequences_terminal_id_terminals_id_fk" FOREIGN KEY ("terminal_id") REFERENCES "public"."terminals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sales_tenant_invoice_number_idx" ON "sales" USING btree ("tenant_id","invoice_number");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_terminal_invoice_sequence_idx" ON "sales" USING btree ("terminal_id","invoice_sequence");
