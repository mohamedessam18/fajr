CREATE TABLE "charity_months" (
	"id" serial PRIMARY KEY NOT NULL,
	"hijri_year" integer NOT NULL,
	"hijri_month" integer NOT NULL,
	"hijri_month_name" varchar(80) NOT NULL,
	"rotation_participant_id" integer,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"contribution_amount" integer DEFAULT 50 NOT NULL,
	"expected_amount" integer DEFAULT 500 NOT NULL,
	"money_flow_id" integer,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "charity_month_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"month_id" integer NOT NULL,
	"participant_id" integer NOT NULL,
	"amount" integer DEFAULT 50 NOT NULL,
	"paid" boolean DEFAULT false NOT NULL,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "charity_months" ADD CONSTRAINT "charity_months_rotation_participant_id_participants_id_fk" FOREIGN KEY ("rotation_participant_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "charity_months" ADD CONSTRAINT "charity_months_money_flow_id_money_flow_id_fk" FOREIGN KEY ("money_flow_id") REFERENCES "public"."money_flow"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "charity_month_payments" ADD CONSTRAINT "charity_month_payments_month_id_charity_months_id_fk" FOREIGN KEY ("month_id") REFERENCES "public"."charity_months"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "charity_month_payments" ADD CONSTRAINT "charity_month_payments_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "charity_months_hijri_year_month_idx" ON "charity_months" USING btree ("hijri_year","hijri_month");
--> statement-breakpoint
CREATE UNIQUE INDEX "charity_month_payments_month_participant_idx" ON "charity_month_payments" USING btree ("month_id","participant_id");
