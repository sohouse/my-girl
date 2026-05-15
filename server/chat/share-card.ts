import { and, asc, eq } from "drizzle-orm";
import { chatMessages, chatSessions } from "@/server/db/schema";

type DbOperations = {
  query: {
    chatSessions: {
      findFirst: (args?: never) => Promise<unknown>;
    };
    chatMessages: {
      findMany: (args?: never) => Promise<Array<{ id: string; role: string; type?: string; content: string }>>;
    };
  };
};

type ShareCardMessage = {
  role: string;
  content: string;
};

type ShareCardCharacter = {
  name: string;
  title: string;
};

type CreateShareCardInput = {
  userId: string;
  sessionId: string;
  messageIds: string[];
  siteUrl: string;
  generateDecoration: (input: {
    character: ShareCardCharacter;
    messages: ShareCardMessage[];
  }) => Promise<string>;
};

const maxShareMessages = 10;
const cardWidth = 900;
const cardPadding = 64;
const innerPadding = 54;
const bubbleMaxWidth = 650;
const textMaxChars = 15;
const lineHeight = 34;
const fontSize = 24;
const labelHeight = 28;
const bubblePaddingX = 30;
const bubblePaddingY = 26;
const messageGap = 30;
const headerHeight = 238;
const footerHeight = 118;

function toDbOperations(db: unknown) {
  return db as DbOperations;
}

export async function createShareCard(db: unknown, input: CreateShareCardInput) {
  const messageIds = [...new Set(input.messageIds)];

  if (messageIds.length < 1 || messageIds.length > maxShareMessages) {
    throw new Error("Select between 1 and 10 messages");
  }

  const ops = toDbOperations(db);
  const session = (await ops.query.chatSessions.findFirst({
    where: and(eq(chatSessions.id, input.sessionId), eq(chatSessions.userId, input.userId)),
    with: {
      character: true
    }
  } as never)) as { character?: ShareCardCharacter } | null | undefined;

  if (!session?.character) {
    throw new Error("Chat session not found");
  }

  const allMessages = await ops.query.chatMessages.findMany({
    where: eq(chatMessages.sessionId, input.sessionId),
    orderBy: asc(chatMessages.createdAt)
  } as never);
  const selectedIds = new Set(messageIds);
  const selectedMessages = allMessages
    .filter((message) => selectedIds.has(message.id) && (message.type ?? "text") === "text")
    .map((message) => ({
      role: message.role,
      content: message.content
    }));

  if (selectedMessages.length !== messageIds.length) {
    throw new Error("Selected messages are not shareable");
  }

  const decoration = await input.generateDecoration({
    character: session.character,
    messages: selectedMessages
  });
  const svg = renderShareCardSvg({
    character: session.character,
    messages: selectedMessages,
    decoration,
    siteUrl: input.siteUrl
  });

  return {
    svg,
    contentType: "image/svg+xml; charset=utf-8",
    filename: `my-girl-share-${Date.now()}.svg`
  };
}

export function renderShareCardSvg({
  character,
  messages,
  decoration,
  siteUrl
}: {
  character: ShareCardCharacter;
  messages: ShareCardMessage[];
  decoration: string;
  siteUrl: string;
}) {
  const rows = messages.map((message) => ({
    ...message,
    lines: wrapText(message.content, textMaxChars)
  }));
  const bubbleRows = rows.map((message) => {
    const longestLineLength = Math.max(...message.lines.map((line) => line.length), 1);
    const textWidth = Math.min(longestLineLength * fontSize, bubbleMaxWidth - bubblePaddingX * 2);
    const bubbleWidth = Math.max(220, textWidth + bubblePaddingX * 2);
    const bubbleHeight = message.lines.length * lineHeight + bubblePaddingY * 2;

    return {
      ...message,
      bubbleWidth,
      bubbleHeight
    };
  });
  const contentHeight = bubbleRows.reduce(
    (total, row) => total + labelHeight + row.bubbleHeight + messageGap,
    0
  );
  const height = Math.max(760, headerHeight + contentHeight + footerHeight);
  const footerY = height - 78;
  let y = headerHeight;
  let lastBubbleBottom = y;

  const messageMarkup = bubbleRows
    .map((message) => {
      const isUser = message.role === "user";
      const bubbleX = isUser
        ? cardWidth - cardPadding - message.bubbleWidth
        : cardPadding;
      const textX = bubbleX + 34;
      const label = isUser ? "你" : character.name;
      const labelX = isUser ? bubbleX + message.bubbleWidth - 8 : bubbleX + 8;
      const labelAnchor = isUser ? "end" : "start";
      const color = "#1f2933";
      const fill = isUser ? "#95ec69" : "#ffffff";
      const currentY = y;
      const bubbleY = currentY + labelHeight;
      const bubbleBottom = bubbleY + message.bubbleHeight;

      y = bubbleBottom + messageGap;
      lastBubbleBottom = bubbleBottom;

      return [
        `<text x="${labelX}" y="${currentY + 20}" fill="#6b7280" font-size="21" text-anchor="${labelAnchor}">${escapeXml(label)}</text>`,
        `<rect x="${bubbleX}" y="${bubbleY}" width="${message.bubbleWidth}" height="${message.bubbleHeight}" rx="24" fill="${fill}" stroke="${isUser ? "#78d757" : "#e5e7eb"}" />`,
        message.lines
          .map(
            (line, index) =>
              `<text x="${textX}" y="${bubbleY + bubblePaddingY + 24 + index * lineHeight}" fill="${color}" font-size="${fontSize}">${escapeXml(line)}</text>`
          )
          .join("")
      ].join("");
    })
    .join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${cardWidth}" height="${height}" viewBox="0 0 ${cardWidth} ${height}" data-footer-y="${footerY}" data-last-bubble-bottom="${lastBubbleBottom}">`,
    "<defs>",
    '<filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">',
    '<feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#7c6f62" flood-opacity="0.14" />',
    "</filter>",
    "</defs>",
    '<rect width="900" height="100%" fill="#f3f0e8" />',
    '<rect x="28" y="30" width="844" height="100%" rx="34" fill="#f7f4ee" filter="url(#shadow)" />',
    '<rect x="28" y="30" width="844" height="112" rx="34" fill="#ece7dd" />',
    '<circle cx="788" cy="92" r="72" fill="#d7ead2" opacity="0.72" />',
    '<circle cx="94" cy="126" r="44" fill="#ffffff" opacity="0.72" />',
    `<text x="${cardPadding}" y="94" fill="#111827" font-size="44" font-weight="700">${escapeXml(character.name)}</text>`,
    `<text x="${cardPadding}" y="134" fill="#667085" font-size="23">${escapeXml(character.title)}</text>`,
    `<text x="${cardPadding}" y="194" fill="#57606a" font-size="25">${escapeXml(limitText(decoration, 36))}</text>`,
    messageMarkup,
    `<line x1="${cardPadding}" y1="${height - 112}" x2="${cardWidth - cardPadding}" y2="${height - 112}" stroke="#ded8cd" />`,
    `<text x="${cardPadding}" y="${footerY}" fill="#667085" font-size="21">来自 ${escapeXml(siteUrl)}</text>`,
    `<text x="${cardWidth - cardPadding}" y="${footerY}" fill="#07c160" font-size="22" font-weight="700" text-anchor="end">My Girl</text>`,
    "</svg>"
  ].join("");
}

function wrapText(text: string, maxChars: number) {
  const cleanText = text.replace(/\s+/g, " ").trim();
  const lines: string[] = [];

  for (let index = 0; index < cleanText.length; index += maxChars) {
    lines.push(cleanText.slice(index, index + maxChars));
  }

  return lines.length ? lines : [""];
}

function limitText(text: string, maxChars: number) {
  const cleanText = text.replace(/\s+/g, " ").trim();

  return cleanText.length > maxChars ? `${cleanText.slice(0, maxChars - 1)}...` : cleanText;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string) {
  return escapeXml(value);
}
