import { describe, expect, it, vi } from "vitest";
import {
  buildMemoryAwareSystemPrompt,
  memoryExtractionSchema,
  upsertExtractedMemories
} from "@/server/memory/service";

const userId = "user-1";
const characterId = "00000000-0000-0000-0000-000000000001";
const sourceMessageId = "00000000-0000-0000-0000-000000000011";

function createMemoryDbStub() {
  const inserted: Array<Record<string, unknown>> = [];

  return {
    insert: vi.fn().mockImplementation(() => ({
      values: vi.fn().mockImplementation((value) => {
        inserted.push(value);

        return {
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined)
        };
      })
    })),
    inserted
  };
}

describe("memory service", () => {
  it("validates structured memory extraction output", () => {
    const parsed = memoryExtractionSchema.parse({
      shouldRemember: true,
      memories: [
        {
          type: "birthday",
          key: "user_birthday",
          value: "3月12日",
          meaning: "用户生日，适合表达记得和祝福",
          dateMonth: 3,
          dateDay: 12,
          confidence: 0.95
        }
      ]
    });

    expect(parsed.memories[0]?.type).toBe("birthday");
    expect(parsed.memories[0]?.dateMonth).toBe(3);
  });

  it("rejects invalid memory types before saving", () => {
    const parsed = memoryExtractionSchema.safeParse({
      shouldRemember: true,
      memories: [
        {
          type: "temporary_mood",
          key: "mood",
          value: "今天开心",
          confidence: 0.8
        }
      ]
    });

    expect(parsed.success).toBe(false);
  });

  it("upserts extracted memories by user, character, type, and key", async () => {
    const db = createMemoryDbStub();

    await upsertExtractedMemories(db, {
      userId,
      characterId,
      sourceMessageId,
      extraction: {
        shouldRemember: true,
        memories: [
          {
            type: "preference",
            key: "favorite_food",
            value: "草莓蛋糕",
            meaning: "用户喜欢草莓蛋糕，聊天时可以自然提到",
            confidence: 0.9
          }
        ]
      }
    });

    expect(db.inserted).toEqual([
      expect.objectContaining({
        userId,
        characterId,
        sourceMessageId,
        type: "preference",
        key: "favorite_food",
        value: "草莓蛋糕",
        confidence: 90,
        source: "chat",
        enabled: true
      })
    ]);
  });

  it("formats enabled memories for prompt injection", () => {
    const prompt = buildMemoryAwareSystemPrompt("base prompt", [
      {
        type: "birthday",
        key: "user_birthday",
        value: "3月12日",
        meaning: "用户生日",
        confidence: 95
      },
      {
        type: "preference",
        key: "favorite_food",
        value: "草莓蛋糕",
        meaning: "用户喜欢的食物",
        confidence: 90
      }
    ]);

    expect(prompt).toContain("base prompt");
    expect(prompt).toContain("你已经记住的用户信息");
    expect(prompt).toContain("用户生日：3月12日");
    expect(prompt).toContain("用户喜欢的食物：草莓蛋糕");
  });
});
