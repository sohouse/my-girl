ALTER TABLE "chat_messages" ADD COLUMN "type" text DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "image_prompt" text;