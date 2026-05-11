CREATE TABLE "fund_cycles" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"starting_balance" integer DEFAULT 0 NOT NULL,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "donations" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"summary" varchar(500),
	"description" text NOT NULL,
	"amount" integer NOT NULL,
	"donated_at" timestamp DEFAULT now() NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"closes_cycle" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "donation_media" (
	"id" serial PRIMARY KEY NOT NULL,
	"donation_id" integer NOT NULL,
	"url" text NOT NULL,
	"pathname" text,
	"type" varchar(20) NOT NULL,
	"mime_type" varchar(120),
	"file_name" varchar(255),
	"size" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "money_flow" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL,
	"donation_id" integer,
	"participant_id" integer,
	"type" varchar(30) NOT NULL,
	"amount" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_cycle_id_fund_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."fund_cycles"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "donation_media" ADD CONSTRAINT "donation_media_donation_id_donations_id_fk" FOREIGN KEY ("donation_id") REFERENCES "public"."donations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "money_flow" ADD CONSTRAINT "money_flow_cycle_id_fund_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."fund_cycles"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "money_flow" ADD CONSTRAINT "money_flow_donation_id_donations_id_fk" FOREIGN KEY ("donation_id") REFERENCES "public"."donations"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "money_flow" ADD CONSTRAINT "money_flow_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;
