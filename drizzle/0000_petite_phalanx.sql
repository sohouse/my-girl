CREATE TABLE "health_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"ok" boolean DEFAULT true NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
