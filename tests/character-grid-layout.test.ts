import { describe, expect, it } from "vitest";
import { getCharacterGridClassName } from "@/components/characters/character-grid";

describe("character grid layout", () => {
  it("uses a two-by-two product grid for gallery character cards", () => {
    expect(getCharacterGridClassName("gallery")).toContain("lg:grid-cols-2");
  });
});
