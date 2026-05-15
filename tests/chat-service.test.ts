import { describe, expect, it, vi } from "vitest";
import {
  createOrReuseSession,
  listMessages,
  sendMessageToSession
} from "@/server/chat/service";

const userId = "user-1";
const characterId = "00000000-0000-0000-0000-000000000001";
const sessionId = "00000000-0000-0000-0000-000000000010";

function createDbStub(options: { hasExistingSession?: boolean } = {}) {
  const insertedMessages: Array<{ role: string; type?: string; content: string }> = [];
  const insertedMemories: Array<Record<string, unknown>> = [];
  const existingSession = {
    id: sessionId,
    userId,
    characterId
  };

  return {
    query: {
      chatSessions: {
        findFirst: vi.fn().mockResolvedValue(options.hasExistingSession ? { ...existingSession, character: undefined } : null)
      },
      chatMessages: {
        findMany: vi.fn().mockResolvedValue([
          { id: "00000000-0000-0000-0000-000000000021", role: "user", type: "text", content: "你好" },
          { id: "00000000-0000-0000-0000-000000000022", role: "assistant", type: "text", content: "你好呀" }
        ])
      },
      characters: {
        findFirst: vi.fn().mockResolvedValue({
          id: characterId,
          name: "苏糯",
          persona: "温柔陪伴",
          background: "普通小康家庭",
          speakingStyle: "轻柔软糯",
          catchphrases: "没关系呀，我都陪着你～",
          motivation: "陪伴和治愈",
          baseImageUrl: "/destine1.jpg"
        })
      },
      characterMemories: {
        findMany: vi.fn().mockResolvedValue([])
      }
    },
    insert: vi.fn().mockImplementation((table) => ({
      values: vi.fn().mockImplementation((value) => {
        if ("role" in value) {
          insertedMessages.push(value);
        }

        if ("key" in value) {
          insertedMemories.push(value);
        }

        return {
          returning: vi.fn().mockResolvedValue([{ id: sessionId, ...value }]),
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined)
        };
      })
    })),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined)
      })
    }),
    insertedMessages,
    insertedMemories
  };
}

describe("chat service", () => {
  it("creates a new session when the user has not chatted with the character", async () => {
    const db = createDbStub();

    const session = await createOrReuseSession(db, { userId, characterId });

    expect(session.id).toBe(sessionId);
  });

  it("saves user and assistant messages when sending a chat message", async () => {
    const db = createDbStub({ hasExistingSession: true });

    await sendMessageToSession(db, {
      userId,
      sessionId,
      content: "今天有点累",
      generateReply: async () => "没关系呀，我都陪着你～"
    });

    expect(db.insertedMessages).toEqual([
      { sessionId, role: "user", type: "text", content: "今天有点累" },
      { sessionId, role: "assistant", type: "text", content: "没关系呀，我都陪着你～" }
    ]);
  });

  it("saves an assistant image message when the image checklist allows generation", async () => {
    const db = createDbStub({ hasExistingSession: true });
    const generateImage = vi.fn().mockResolvedValue({
      url: "/uploads/users/user-1/ai-generated-image/photo.png",
      prompt: "苏糯窗边自拍"
    });

    const result = await sendMessageToSession(db, {
      userId,
      sessionId,
      content: "想看看你现在穿什么，发张照片给我",
      generateReply: async () => "我在窗边，穿了浅色针织衫，拍给你看。",
      generateImage
    });

    expect(result.imageMessage).toMatchObject({
      role: "assistant",
      type: "image",
      content: "/uploads/users/user-1/ai-generated-image/photo.png"
    });
    expect(db.insertedMessages).toEqual([
      { sessionId, role: "user", type: "text", content: "想看看你现在穿什么，发张照片给我" },
      { sessionId, role: "assistant", type: "text", content: "我在窗边，穿了浅色针织衫，拍给你看。" },
      {
        sessionId,
        role: "assistant",
        type: "image",
        content: "/uploads/users/user-1/ai-generated-image/photo.png",
        imagePrompt: "苏糯窗边自拍"
      }
    ]);
    expect(generateImage).toHaveBeenCalledWith({
      prompt: expect.stringContaining("苏糯"),
      imageKind: "selfie",
      baseImageUrl: "/destine1.jpg"
    });
  });

  it("does not call image generation for selfie requests when the character has no base image", async () => {
    const db = createDbStub({ hasExistingSession: true });
    db.query.characters.findFirst.mockResolvedValue({
      id: characterId,
      name: "苏糯",
      persona: "温柔陪伴",
      background: "普通小康家庭",
      speakingStyle: "轻柔软糯",
      catchphrases: "没关系呀，我都陪着你～",
      motivation: "陪伴和治愈"
    });
    const generateImage = vi.fn();

    const result = await sendMessageToSession(db, {
      userId,
      sessionId,
      content: "想看看你现在穿什么，发张自拍给我",
      generateReply: async () => "我在窗边，穿了浅色针织衫，拍给你看。",
      generateImage
    });

    expect(result.imageMessage).toBeUndefined();
    expect(generateImage).not.toHaveBeenCalled();
  });

  it("injects existing memories into the character prompt before generating a reply", async () => {
    const db = createDbStub({ hasExistingSession: true });
    db.query.characterMemories.findMany.mockResolvedValue([
      {
        type: "preference",
        key: "favorite_food",
        value: "草莓蛋糕",
        meaning: "用户喜欢的食物",
        confidence: 95
      }
    ]);
    const generateReply = vi.fn().mockResolvedValue("我记得你喜欢草莓蛋糕，今天也辛苦啦。");

    await sendMessageToSession(db, {
      userId,
      sessionId,
      content: "今天有点累",
      generateReply
    });

    expect(generateReply.mock.calls[0]?.[1]).toContain("你已经记住的用户信息");
    expect(generateReply.mock.calls[0]?.[1]).toContain("用户喜欢的食物：草莓蛋糕");
  });

  it("extracts and saves long-term memories after the user message is stored", async () => {
    const db = createDbStub({ hasExistingSession: true });
    const extractMemories = vi.fn().mockResolvedValue({
      shouldRemember: true,
      memories: [
        {
          type: "birthday",
          key: "user_birthday",
          value: "3月12日",
          meaning: "用户生日，适合表达祝福",
          dateMonth: 3,
          dateDay: 12,
          confidence: 0.94
        }
      ]
    });

    await sendMessageToSession(db, {
      userId,
      sessionId,
      content: "我的生日是3月12日",
      generateReply: async () => "我记住啦。",
      extractMemories
    });

    expect(extractMemories).toHaveBeenCalledWith("我的生日是3月12日");
    expect(db.insertedMemories).toContainEqual(
      expect.objectContaining({
        type: "birthday",
        key: "user_birthday",
        value: "3月12日",
        dateMonth: 3,
        dateDay: 12,
        confidence: 94
      })
    );
  });

  it("loads existing messages in chronological order", async () => {
    const db = createDbStub();

    const messages = await listMessages(db, sessionId);

    expect(messages).toHaveLength(2);
    expect(messages[0]?.id).toBe("00000000-0000-0000-0000-000000000021");
    expect(messages[0]?.role).toBe("user");
  });
});
