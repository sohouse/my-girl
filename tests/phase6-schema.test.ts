import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { chatMessages } from "@/server/db/schema";

describe("Phase 6 chat message schema", () => {
  it("stores text and image message metadata on chat messages", () => {
    const columns = getTableColumns(chatMessages);

    expect(columns).toHaveProperty("type");
    expect(columns).toHaveProperty("imagePrompt");
  });
});
