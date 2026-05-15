import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { characterMemories } from "@/server/db/schema";

describe("Phase 7 character memory schema", () => {
  it("stores structured long-term memories for a user and character", () => {
    const columns = getTableColumns(characterMemories);

    expect(columns).toHaveProperty("userId");
    expect(columns).toHaveProperty("characterId");
    expect(columns).toHaveProperty("type");
    expect(columns).toHaveProperty("key");
    expect(columns).toHaveProperty("value");
    expect(columns).toHaveProperty("meaning");
    expect(columns).toHaveProperty("dateMonth");
    expect(columns).toHaveProperty("dateDay");
    expect(columns).toHaveProperty("dateExact");
    expect(columns).toHaveProperty("confidence");
    expect(columns).toHaveProperty("source");
    expect(columns).toHaveProperty("sourceMessageId");
    expect(columns).toHaveProperty("enabled");
  });
});
