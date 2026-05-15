import { and, desc, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { characterMemories } from "@/server/db/schema";

const memoryTypes = ["birthday", "preference", "dislike", "important_date", "relationship", "nickname", "note"] as const;

type DbOperations = {
  query?: {
    characterMemories?: {
      findMany: (args?: never) => Promise<MemoryForPrompt[]>;
    };
  };
  insert: (table: unknown) => {
    values: (value: Record<string, unknown>) => {
      onConflictDoUpdate: (args: unknown) => Promise<unknown>;
    };
  };
};

type DbLike = unknown;

type MemoryForPrompt = {
  type: string;
  key: string;
  value: string;
  meaning: string;
  confidence: number;
};

export const extractedMemorySchema = z.object({
  type: z.enum(memoryTypes),
  key: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(500),
  meaning: z.string().trim().min(1).max(500),
  dateMonth: z.number().int().min(1).max(12).optional(),
  dateDay: z.number().int().min(1).max(31).optional(),
  dateExact: z.coerce.date().optional(),
  confidence: z.number().min(0).max(1)
});

export const memoryExtractionSchema = z.object({
  shouldRemember: z.boolean(),
  memories: z.array(extractedMemorySchema).max(5).default([])
});

export type MemoryExtraction = z.infer<typeof memoryExtractionSchema>;

function toDbOperations(db: DbLike) {
  return db as DbOperations;
}

function normalizeConfidence(confidence: number) {
  return Math.round(confidence * 100);
}

function formatMemory(memory: MemoryForPrompt) {
  return `- ${memory.meaning}：${memory.value}`;
}

export function buildMemoryAwareSystemPrompt(basePrompt: string, memories: MemoryForPrompt[]) {
  if (memories.length === 0) {
    return basePrompt;
  }

  return [
    basePrompt,
    "",
    "你已经记住的用户信息：",
    ...memories.map(formatMemory),
    "如果这些记忆和当前对话相关，可以自然使用；不要机械复述，也不要声称自己在读取数据库。"
  ].join("\n");
}

export async function listPromptMemories(
  db: DbLike,
  input: {
    userId: string;
    characterId: string;
    limit?: number;
  }
) {
  const ops = toDbOperations(db);

  if (!ops.query?.characterMemories) {
    return [];
  }

  return ops.query.characterMemories.findMany({
    where: and(
      eq(characterMemories.userId, input.userId),
      eq(characterMemories.characterId, input.characterId),
      eq(characterMemories.enabled, true),
      gte(characterMemories.confidence, 70)
    ),
    orderBy: desc(characterMemories.updatedAt),
    limit: input.limit ?? 8
  } as never);
}

export async function upsertExtractedMemories(
  db: DbLike,
  input: {
    userId: string;
    characterId: string;
    sourceMessageId: string;
    extraction: MemoryExtraction;
  }
) {
  const parsed = memoryExtractionSchema.parse(input.extraction);

  if (!parsed.shouldRemember) {
    return;
  }

  const ops = toDbOperations(db);

  for (const memory of parsed.memories) {
    const values = {
      userId: input.userId,
      characterId: input.characterId,
      type: memory.type,
      key: memory.key,
      value: memory.value,
      meaning: memory.meaning,
      dateMonth: memory.dateMonth,
      dateDay: memory.dateDay,
      dateExact: memory.dateExact,
      confidence: normalizeConfidence(memory.confidence),
      source: "chat",
      sourceMessageId: input.sourceMessageId,
      enabled: true,
      updatedAt: new Date()
    };

    await ops
      .insert(characterMemories)
      .values(values)
      .onConflictDoUpdate({
        target: [characterMemories.userId, characterMemories.characterId, characterMemories.type, characterMemories.key],
        set: {
          value: values.value,
          meaning: values.meaning,
          dateMonth: values.dateMonth,
          dateDay: values.dateDay,
          dateExact: values.dateExact,
          confidence: values.confidence,
          source: values.source,
          sourceMessageId: values.sourceMessageId,
          enabled: true,
          updatedAt: values.updatedAt
        }
      });
  }
}
