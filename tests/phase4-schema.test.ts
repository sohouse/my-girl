import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { characters } from "@/server/db/schema";

describe("Phase 4 character schema", () => {
  it("stores ownership, type, and future storage metadata on characters", () => {
    const columns = getTableColumns(characters);

    expect(columns).toHaveProperty("ownerUserId");
    expect(columns).toHaveProperty("kind");
    expect(columns).toHaveProperty("baseImageStorageKey");
    expect(columns).toHaveProperty("baseImageStorageProvider");
  });
});
