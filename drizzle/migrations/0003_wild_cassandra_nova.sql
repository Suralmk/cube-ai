ALTER TYPE "public"."document_status" ADD VALUE 'pending' BEFORE 'failed';--> statement-breakpoint
ALTER TYPE "public"."document_status" ADD VALUE 'indexing' BEFORE 'failed';--> statement-breakpoint
ALTER TYPE "public"."document_status" ADD VALUE 'indexed' BEFORE 'failed';--> statement-breakpoint
CREATE TABLE "citation" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"organization_id" text,
	"document_id" text,
	"document_name" text NOT NULL,
	"page_number" integer NOT NULL,
	"chunk_text" text NOT NULL,
	"score" double precision,
	"marker" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "page_count" integer;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "chunk_count" integer;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "error_message" text;--> statement-breakpoint
ALTER TABLE "citation" ADD CONSTRAINT "citation_message_id_chat_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."chat_message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citation" ADD CONSTRAINT "citation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "citation_message_id_idx" ON "citation" USING btree ("message_id");