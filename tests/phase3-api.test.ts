import { describe, expect, it, vi } from "vitest";
import { createApi } from "@/server/api/app";

function createDbStub() {
  return {
    query: {
      chatSessions: {
        findFirst: vi.fn().mockResolvedValue(null)
      },
      chatMessages: {
        findMany: vi.fn().mockResolvedValue([])
      },
      characters: {
        findFirst: vi.fn().mockResolvedValue({ id: "character-1" }),
        findMany: vi.fn().mockResolvedValue([])
      }
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: "00000000-0000-0000-0000-000000000010"
          }
        ])
      })
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined)
      })
    })
  };
}

describe("Phase 3 API", () => {
  it("rejects session creation for anonymous users", async () => {
    const api = createApi({
      db: createDbStub(),
      getUser: async () => null
    });

    const response = await api.request("/api/chat/sessions", {
      method: "POST",
      body: JSON.stringify({
        characterId: "11111111-1111-4111-8111-111111111111"
      }),
      headers: {
        "Content-Type": "application/json"
      }
    });

    expect(response.status).toBe(401);
  });

  it("creates a chat session for signed-in users", async () => {
    const api = createApi({
      db: createDbStub(),
      getUser: async () => ({ id: "user-1" })
    });

    const response = await api.request("/api/chat/sessions", {
      method: "POST",
      body: JSON.stringify({
        characterId: "11111111-1111-4111-8111-111111111111"
      }),
      headers: {
        "Content-Type": "application/json"
      }
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.session.id).toBe("00000000-0000-0000-0000-000000000010");
  });
});
