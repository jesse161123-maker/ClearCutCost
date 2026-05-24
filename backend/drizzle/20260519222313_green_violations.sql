CREATE TYPE "public"."document_type" AS ENUM('contractor_estimate', 'repair_quote', 'invoice', 'contract', 'legal_notice', 'insurance_letter', 'medical_bill', 'hoa_notice', 'financial_document', 'other');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('low', 'moderate', 'high');--> statement-breakpoint
CREATE TABLE "analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"document_type" "document_type" NOT NULL,
	"document_text" text NOT NULL,
	"document_image_url" text,
	"risk_level" "risk_level" NOT NULL,
	"summary" text NOT NULL,
	"key_findings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ai_recommendations" text NOT NULL,
	"suggested_questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"market_comparison" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_tracking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"month_year" text NOT NULL,
	"analysis_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usage_tracking_session_id_month_year_unique" UNIQUE("session_id","month_year")
);
