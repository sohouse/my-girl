ALTER TABLE "characters" ADD COLUMN "kind" text DEFAULT 'preset' NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "owner_user_id" text;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "base_image_storage_key" text;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "base_image_storage_provider" text DEFAULT 'local-public' NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;