import { describe, expect, it, vi } from "vitest";
import { createApi } from "@/server/api/app";

const sessionId = "00000000-0000-0000-0000-000000000010";

function createDbStub() {
  const insertedMessages: Array<Record<string, unknown>> = [];

  return {
    query: {
      chatSessions: {
        findFirst: vi.fn().mockResolvedValue({
          id: sessionId,
          userId: "user-1",
          characterId: "00000000-0000-0000-0000-000000000001",
          character: {
            name: "苏糯",
            persona: "软萌治愈系",
            background: "普通小康家庭",
            speakingStyle: "轻柔软糯",
            catchphrases: "没关系呀，我都陪着你～",
            motivation: "陪伴和治愈",
            baseImageUrl: "/destine1.jpg"
          }
        })
      },
      chatMessages: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([
          { id: "00000000-0000-0000-0000-000000000021", role: "user", type: "text", content: "今天在干嘛" },
          { id: "00000000-0000-0000-0000-000000000022", role: "assistant", type: "text", content: "刚看完书。" }
        ])
      },
      characters: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([])
      }
    },
    insert: vi.fn().mockImplementation(() => ({
      values: vi.fn().mockImplementation((value) => {
        insertedMessages.push(value);

        return {
          returning: vi.fn().mockResolvedValue([{ id: `message-${insertedMessages.length}`, ...value }])
        };
      })
    })),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined)
      })
    }),
    insertedMessages
  };
}

describe("Phase 6 image message API", () => {
  it("returns an assistant image message when the image checklist allows generation", async () => {
    const db = createDbStub();
    const generateImage = vi.fn().mockResolvedValue({
      url: "/uploads/users/user-1/ai-generated-image/photo.png",
      prompt: "苏糯窗边自拍"
    });
    const api = createApi({
      db,
      getUser: async () => ({ id: "user-1" }),
      generateReply: async () => "我在窗边，穿了浅色针织衫，拍给你看。",
      generateImage
    });

    const response = await api.request(`/api/chat/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ content: "想看看你现在穿什么，发张照片给我" })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.imageMessage).toMatchObject({
      role: "assistant",
      type: "image",
      content: "/uploads/users/user-1/ai-generated-image/photo.png"
    });
    expect(generateImage).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user-1",
      prompt: expect.stringContaining("苏糯"),
      imageKind: "selfie",
      baseImageUrl: "/destine1.jpg"
    }));
  });
});
