import { getServerEnv } from "@/env";
import { memoryExtractionSchema, type MemoryExtraction } from "@/server/memory/service";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function extractMinimaxTextContent(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("content" in payload)) {
    return "";
  }

  const content = (payload as { content: unknown }).content;
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .filter(
      (part): part is { type: "text"; text: string } =>
        !!part &&
        typeof part === "object" &&
        (part as { type?: unknown }).type === "text" &&
        typeof (part as { text?: unknown }).text === "string"
    )
    .map((part) => part.text.trim())
    .filter(Boolean)
    .join("\n");
}

export async function generateCharacterReply(messages: ChatMessage[], systemPrompt: string) {
  const env = getServerEnv();
  const response = await fetch(env.MINIMAX_TEXT_GENERATOR_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.MINIMAX_API_KEY}`
    },
    body: JSON.stringify({
      model: "MiniMax-M2.7",
      system: systemPrompt,
      messages
    })
  });

  if (!response.ok) {
    throw new Error("MiniMax request failed");
  }

  const payload = await response.json();
  const text = extractMinimaxTextContent(payload);

  if (!text) {
    throw new Error("MiniMax response did not include text content");
  }

  return text;
}

export async function extractCharacterMemories(userMessage: string): Promise<MemoryExtraction> {
  const env = getServerEnv();
  const response = await fetch(env.MINIMAX_TEXT_GENERATOR_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.MINIMAX_API_KEY}`
    },
    body: JSON.stringify({
      model: "MiniMax-M2.7",
      system: [
        "你负责从用户聊天中提取虚拟陪伴角色需要长期记住的信息。",
        "只保存长期有价值的信息，例如生日、喜好、讨厌内容、重要日期、重要关系、称呼偏好或其他长期事实。",
        "不要保存临时情绪、寒暄、含糊猜测或一次性闲聊。",
        "必须只输出 JSON，不要输出 Markdown，不要解释。JSON 格式：",
        '{"shouldRemember":boolean,"memories":[{"type":"birthday|preference|dislike|important_date|relationship|nickname|note","key":"snake_case_key","value":"记忆内容","meaning":"这条记忆对长期陪伴的意义","dateMonth":1,"dateDay":1,"dateExact":"2026-01-01T00:00:00.000Z","confidence":0.9}]}',
        "非日期类记忆不要填写 dateMonth、dateDay、dateExact。"
      ].join("\n"),
      messages: [
        {
          role: "user",
          content: userMessage
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error("MiniMax memory extraction request failed");
  }

  const payload = await response.json();
  const text = extractMinimaxTextContent(payload);

  if (!text) {
    return { shouldRemember: false, memories: [] };
  }

  return memoryExtractionSchema.parse(JSON.parse(text));
}

export async function generateShareDecoration(input: {
  character: { name: string; title: string };
  messages: Array<{ role: string; content: string }>;
}) {
  const env = getServerEnv();
  const transcript = input.messages
    .map((message) => `${message.role === "user" ? "用户" : input.character.name}：${message.content}`)
    .join("\n");
  const response = await fetch(env.MINIMAX_TEXT_GENERATOR_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.MINIMAX_API_KEY}`
    },
    body: JSON.stringify({
      model: "MiniMax-M2.7",
      system: [
        "你为虚拟陪伴聊天分享卡片生成一句中文装饰短句。",
        "短句必须温柔、有画面感，适合作为卡片副标题。",
        "不要输出 Markdown，不要加引号，不要超过 24 个汉字。"
      ].join("\n"),
      messages: [
        {
          role: "user",
          content: [`角色：${input.character.name}（${input.character.title}）`, "选中的聊天：", transcript].join("\n")
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error("MiniMax share decoration request failed");
  }

  const text = extractMinimaxTextContent(await response.json()).replace(/^["“]|["”]$/g, "").trim();

  return text || "把这一刻轻轻收藏";
}
