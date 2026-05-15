import { describe, expect, it, vi } from "vitest";
import { createApi } from "@/server/api/app";

const sessionId = "01960000-0000-7000-8000-000000000010";

function createDbStub() {
  return {
    query: {
      chatSessions: {
        findFirst: vi.fn().mockResolvedValue({
          id: sessionId,
          userId: "user-1",
          character: {
            name: "苏糯",
            title: "软萌治愈系"
          }
        })
      },
      chatMessages: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "01960000-0000-7000-8000-000000000021",
            role: "user",
            type: "text",
            content: "今天想分享这段聊天。"
          },
          {
            id: "01960000-0000-7000-8000-000000000022",
            role: "assistant",
            type: "text",
            content: "好呀，我会把这份心情好好装进卡片里。"
          }
        ])
      }
    }
  };
}

describe("Phase 9 share card API", () => {
  it("returns a downloadable SVG share card for selected messages", async () => {
    const api = createApi({
      db: createDbStub(),
      getUser: async () => ({ id: "user-1" }),
      generateShareDecoration: async () => "把心动折成一张晚风里的便签",
      appBaseUrl: "https://example.com"
    });

    const response = await api.request(`/api/chat/sessions/${sessionId}/share-card`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messageIds: [
          "01960000-0000-7000-8000-000000000021",
          "01960000-0000-7000-8000-000000000022"
        ]
      })
    });
    const svg = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/svg+xml; charset=utf-8");
    expect(response.headers.get("Content-Disposition")).toContain("attachment;");
    expect(svg).toContain("今天想分享这段聊天。");
    expect(svg).toContain("https://example.com");
  });
});
