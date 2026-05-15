import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { characters, chatMessages, chatSessions } from "@/server/db/schema";

describe("Phase 3 chat schema", () => {
  it("defines preset character columns", () => {
    const columns = getTableColumns(characters);

    expect(columns).toHaveProperty("slug");
    expect(columns).toHaveProperty("persona");
    expect(columns).toHaveProperty("background");
    expect(columns).toHaveProperty("speakingStyle");
    expect(columns).toHaveProperty("catchphrases");
    expect(columns).toHaveProperty("motivation");
    expect(columns).toHaveProperty("baseImageUrl");
    expect(columns).toHaveProperty("allowBaseImageReference");
  });

  it("defines chat sessions and messages without affection fields", () => {
    const sessionColumns = getTableColumns(chatSessions);
    const messageColumns = getTableColumns(chatMessages);

    expect(sessionColumns).toHaveProperty("userId");
    expect(sessionColumns).toHaveProperty("characterId");
    expect(sessionColumns).not.toHaveProperty("affection");
    expect(messageColumns).toHaveProperty("role");
    expect(messageColumns).toHaveProperty("content");
  });
});
