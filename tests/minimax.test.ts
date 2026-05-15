import { describe, expect, it } from "vitest";
import { extractMinimaxTextContent } from "@/server/ai/minimax";

describe("MiniMax text response parsing", () => {
  it("renders only content items whose type is text", () => {
    const text = extractMinimaxTextContent({
      content: [
        {
          type: "thinking",
          thinking: "不要把这段渲染到页面"
        },
        {
          type: "text",
          text: "你好呀，我在这里。"
        }
      ]
    });

    expect(text).toBe("你好呀，我在这里。");
  });

  it("joins multiple text parts and ignores non-text parts", () => {
    const text = extractMinimaxTextContent({
      content: [
        { type: "text", text: "第一句。" },
        { type: "thinking", thinking: "hidden" },
        { type: "text", text: "第二句。" }
      ]
    });

    expect(text).toBe("第一句。\n第二句。");
  });
});
