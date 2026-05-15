import { describe, expect, it, vi } from "vitest";
import { createShareCard, renderShareCardSvg } from "@/server/chat/share-card";

const sessionId = "01960000-0000-7000-8000-000000000010";
const userId = "user-1";
const character = {
  name: "苏糯",
  title: "软萌治愈系"
};

function createDbStub() {
  return {
    query: {
      chatSessions: {
        findFirst: vi.fn().mockResolvedValue({
          id: sessionId,
          userId,
          character
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
          },
          {
            id: "01960000-0000-7000-8000-000000000023",
            role: "assistant",
            type: "image",
            content: "/uploads/users/user-1/ai-generated-image/photo.png"
          }
        ])
      }
    }
  };
}

describe("share card service", () => {
  it("renders selected text messages and the site url into an SVG card", () => {
    const svg = renderShareCardSvg({
      character,
      messages: [
        { role: "user", content: "今天想分享这段聊天。" },
        { role: "assistant", content: "好呀，我会把这份心情好好装进卡片里。" }
      ],
      decoration: "把心动折成一张晚风里的便签",
      siteUrl: "https://example.com"
    });

    expect(svg).toContain("<svg");
    expect(svg).toContain("今天想分享这段聊天。");
    expect(svg).toContain("好呀，我会把这份心情好好装进卡");
    expect(svg).toContain("片里。");
    expect(svg).toContain("https://example.com");
    expect(svg).toContain("把心动折成一张晚风里的便签");
  });

  it("wraps long messages without clipping them or overlapping the footer", () => {
    const longReply =
      "有几本挺有意思的，一批文学小说和散文集，还有几本关于植物和自然的手绘图鉴。说起来，有一本汪曾祺的散文集我很喜欢，翻了几页就舍不得放下。他的文字特别平淡质朴，读起来却有种让人安静下来的力量。你呢，有没有最近在读什么书？";
    const svg = renderShareCardSvg({
      character: {
        name: "温知予",
        title: "温柔知性系"
      },
      messages: [
        { role: "assistant", content: longReply },
        { role: "user", content: "新到了什么书，有你喜欢的么？" },
        { role: "assistant", content: longReply }
      ],
      decoration: "书页轻翻，时光也跟着温柔了起来",
      siteUrl: "http://localhost:3000"
    });
    const height = Number(svg.match(/height="(\d+)"/)?.[1]);
    const footerY = Number(svg.match(/data-footer-y="(\d+)"/)?.[1]);
    const lastBubbleBottom = Number(svg.match(/data-last-bubble-bottom="(\d+)"/)?.[1]);

    expect(svg).toContain("fill=\"#f3f0e8\"");
    expect(svg).toContain("fill=\"#95ec69\"");
    expect(svg).not.toContain("...");
    expect(height).toBeGreaterThan(1200);
    expect(lastBubbleBottom).toBeLessThan(footerY - 36);
  });

  it("creates a share card from selected messages in the current user session", async () => {
    const card = await createShareCard(createDbStub(), {
      userId,
      sessionId,
      messageIds: [
        "01960000-0000-7000-8000-000000000022",
        "01960000-0000-7000-8000-000000000021"
      ],
      siteUrl: "https://example.com",
      generateDecoration: async () => "把心动折成一张晚风里的便签"
    });

    expect(card.contentType).toBe("image/svg+xml; charset=utf-8");
    expect(card.filename).toMatch(/^my-girl-share-/);
    expect(card.svg).toContain("今天想分享这段聊天。");
    expect(card.svg).toContain("好呀，我会把这份心情好好装进卡");
    expect(card.svg).toContain("片里。");
    expect(card.svg).not.toContain("photo.png");
  });

  it("rejects more than ten selected messages", async () => {
    await expect(
      createShareCard(createDbStub(), {
        userId,
        sessionId,
        messageIds: Array.from({ length: 11 }, (_, index) => `01960000-0000-7000-8000-${String(index).padStart(12, "0")}`),
        siteUrl: "https://example.com",
        generateDecoration: async () => "装饰文案"
      })
    ).rejects.toThrow("Select between 1 and 10 messages");
  });
});
