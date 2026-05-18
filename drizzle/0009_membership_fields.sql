ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "membership_type" text DEFAULT 'non_member' NOT NULL;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "membership_expires_at" timestamp with time zone;
