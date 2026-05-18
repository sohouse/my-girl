import { relations } from "drizzle-orm";
import { integer, pgTable, boolean, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const healthChecks = pgTable("health_checks", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  ok: boolean("ok").notNull().default(true),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow()
});

export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: boolean("value").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  role: text("role").notNull().default("user"),
  membershipType: text("membership_type").notNull().default("non_member"),
  membershipExpiresAt: timestamp("membership_expires_at", { withTimezone: true })
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" })
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const characters = pgTable("characters", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  kind: text("kind").notNull().default("preset"),
  ownerUserId: text("owner_user_id").references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  title: text("title").notNull(),
  persona: text("persona").notNull(),
  background: text("background").notNull(),
  speakingStyle: text("speaking_style").notNull(),
  catchphrases: text("catchphrases").notNull(),
  motivation: text("motivation").notNull(),
  baseImageUrl: text("base_image_url").notNull(),
  baseImageStorageKey: text("base_image_storage_key"),
  baseImageStorageProvider: text("base_image_storage_provider").notNull().default("local-public"),
  allowBaseImageReference: boolean("allow_base_image_reference").notNull().default(true),
  sortOrder: integer("sort_order").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  characterId: uuid("character_id")
    .notNull()
    .references(() => characters.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => chatSessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  type: text("type").notNull().default("text"),
  content: text("content").notNull(),
  imagePrompt: text("image_prompt"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const characterMemories = pgTable(
  "character_memories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    key: text("key").notNull(),
    value: text("value").notNull(),
    meaning: text("meaning").notNull(),
    dateMonth: integer("date_month"),
    dateDay: integer("date_day"),
    dateExact: timestamp("date_exact", { withTimezone: true }),
    confidence: integer("confidence").notNull().default(80),
    source: text("source").notNull().default("chat"),
    sourceMessageId: uuid("source_message_id").references(() => chatMessages.id, { onDelete: "set null" }),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [uniqueIndex("character_memories_identity_idx").on(table.userId, table.characterId, table.type, table.key)]
);

export const emailEvents = pgTable("email_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  characterId: uuid("character_id").references(() => characters.id, { onDelete: "cascade" }),
  source: text("source").notNull().default("admin"),
  memoryId: uuid("memory_id").references(() => characterMemories.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  meaning: text("meaning").notNull(),
  month: integer("month"),
  day: integer("day"),
  eventDate: timestamp("event_date", { withTimezone: true }),
  cronExpression: text("cron_expression"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const emailSendLogs = pgTable(
  "email_send_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => emailEvents.id, { onDelete: "cascade" }),
    scheduledDate: text("scheduled_date").notNull(),
    status: text("status").notNull(),
    subject: text("subject"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [uniqueIndex("email_send_logs_identity_idx").on(table.userId, table.characterId, table.eventId, table.scheduledDate)]
);

export const charactersRelations = relations(characters, ({ many }) => ({
  sessions: many(chatSessions),
  memories: many(characterMemories),
  emailEvents: many(emailEvents),
  emailSendLogs: many(emailSendLogs)
}));

export const siteSettingsRelations = relations(siteSettings, () => ({}));

export const chatSessionsRelations = relations(chatSessions, ({ many, one }) => ({
  character: one(characters, {
    fields: [chatSessions.characterId],
    references: [characters.id]
  }),
  user: one(user, {
    fields: [chatSessions.userId],
    references: [user.id]
  }),
  messages: many(chatMessages)
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id]
  })
}));

export const characterMemoriesRelations = relations(characterMemories, ({ one }) => ({
  character: one(characters, {
    fields: [characterMemories.characterId],
    references: [characters.id]
  }),
  user: one(user, {
    fields: [characterMemories.userId],
    references: [user.id]
  }),
  sourceMessage: one(chatMessages, {
    fields: [characterMemories.sourceMessageId],
    references: [chatMessages.id]
  })
}));

export const emailEventsRelations = relations(emailEvents, ({ one, many }) => ({
  user: one(user, {
    fields: [emailEvents.userId],
    references: [user.id]
  }),
  character: one(characters, {
    fields: [emailEvents.characterId],
    references: [characters.id]
  }),
  memory: one(characterMemories, {
    fields: [emailEvents.memoryId],
    references: [characterMemories.id]
  }),
  sendLogs: many(emailSendLogs)
}));

export const emailSendLogsRelations = relations(emailSendLogs, ({ one }) => ({
  user: one(user, {
    fields: [emailSendLogs.userId],
    references: [user.id]
  }),
  character: one(characters, {
    fields: [emailSendLogs.characterId],
    references: [characters.id]
  }),
  event: one(emailEvents, {
    fields: [emailSendLogs.eventId],
    references: [emailEvents.id]
  })
}));
