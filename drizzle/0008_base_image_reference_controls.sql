CREATE TABLE IF NOT EXISTS "site_settings" (
  "key" text PRIMARY KEY NOT NULL,
  "value" boolean DEFAULT false NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "allow_base_image_reference" boolean DEFAULT true NOT NULL;
