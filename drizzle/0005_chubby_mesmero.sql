CREATE TABLE "character_memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"character_id" uuid NOT NULL,
	"type" text NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"meaning" text NOT NULL,
	"date_month" integer,
	"date_day" integer,
	"date_exact" timestamp with time zone,
	"confidence" integer DEFAULT 80 NOT NULL,
	"source" text DEFAULT 'chat' NOT NULL,
	"source_message_id" uuid,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "character_memories" ADD CONSTRAINT "character_memories_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_memories" ADD CONSTRAINT "character_memories_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_memories" ADD CONSTRAINT "character_memories_source_message_id_chat_messages_id_fk" FOREIGN KEY ("source_message_id") REFERENCES "public"."chat_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "character_memories_identity_idx" ON "character_memories" USING btree ("user_id","character_id","type","key");