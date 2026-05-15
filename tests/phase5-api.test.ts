import { describe, expect, it, vi } from "vitest";
import { createApi } from "@/server/api/app";

const sessionId = "00000000-0000-0000-0000-000000000010";
const assistantMessageId = "22222222-2222-4222-8222-222222222222";

function createDbStub(messageRole = "assistant") {
  return {
    query: {
      chatSessions: {
        findFirst: vi.fn().mockResolvedValue({
          id: sessionId,
          userId: "user-1",
          characterId: "00000000-0000-0000-0000-000000000001",
          character: {
            name: "苏糯",
            speakingStyle: "声线轻柔软糯，语速偏慢",
            catchphrases: "没关系呀，我都陪着你～"
          }
        })
      },
      chatMessages: {
        findFirst: vi.fn().mockResolvedValue({
          id: assistantMessageId,
          sessionId,
          role: messageRole,
          content: "没关系呀，我都陪着你～"
        }),
        findMany: vi.fn().mockResolvedValue([
          { role: "user", content: "今天有点累" },
          { role: "assistant", content: "没关系呀，我都陪着你～" }
        ])
      },
      characters: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([])
      }
    },
    insert: vi.fn(),
    update: vi.fn()
  };
}

describe("Phase 5 voice API", () => {
  it("returns generated mp3 audio for an assistant message", async () => {
    const api = createApi({
      db: createDbStub(),
      getUser: async () => ({ id: "user-1" }),
      generateVoice: async () => new Uint8Array([1, 2, 3])
    });

    const response = await api.request(
      `/api/chat/sessions/${sessionId}/messages/${assistantMessageId}/voice`,
      { method: "POST" }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("audio/mpeg");
    expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual([1, 2, 3]);
  });

  it("rejects voice generation for user messages", async () => {
    const api = createApi({
      db: createDbStub("user"),
      getUser: async () => ({ id: "user-1" }),
      generateVoice: async () => new Uint8Array([1, 2, 3])
    });

    const response = await api.request(
      `/api/chat/sessions/${sessionId}/messages/${assistantMessageId}/voice`,
      { method: "POST" }
    );

    expect(response.status).toBe(400);
  });

  it("rejects non-uuid message ids before querying voice audio", async () => {
    const generateVoice = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));
    const api = createApi({
      db: createDbStub(),
      getUser: async () => ({ id: "user-1" }),
      generateVoice
    });

    const response = await api.request(
      `/api/chat/sessions/${sessionId}/messages/message-1/voice`,
      { method: "POST" }
    );

    expect(response.status).toBe(404);
    expect(generateVoice).not.toHaveBeenCalled();
  });
});
