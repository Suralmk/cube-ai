CREATE TYPE "public"."document_status" AS ENUM('processing', 'ready', 'failed');--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "status" "document_status" DEFAULT 'processing' NOT NULL;--> statement-breakpoint
CREATE INDEX "document_status_idx" ON "document" USING btree ("status");