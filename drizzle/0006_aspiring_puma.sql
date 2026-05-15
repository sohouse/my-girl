CREATE TABLE "email_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"character_id" uuid,
	"source" text DEFAULT 'admin' NOT NULL,
	"memory_id" uuid,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"meaning" text NOT NULL,
	"month" integer,
	"day" integer,
	"event_date" timestamp with time zone,
	"cron_expression" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_send_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"character_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"scheduled_date" text NOT NULL,
	"status" text NOT NULL,
	"subject" text,
	"sent_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_memory_id_character_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."character_memories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_send_logs" ADD CONSTRAINT "email_send_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_send_logs" ADD CONSTRAINT "email_send_logs_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_send_logs" ADD CONSTRAINT "email_send_logs_event_id_email_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."email_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "email_send_logs_identity_idx" ON "email_send_logs" USING btree ("user_id","character_id","event_id","scheduled_date");