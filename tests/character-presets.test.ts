import { describe, expect, it } from "vitest";
import { presetCharacters } from "@/server/characters/presets";

describe("preset characters", () => {
  it("contains the four Phase 3 characters from docs/05.destine.md", () => {
    expect(presetCharacters).toHaveLength(4);
    expect(presetCharacters.map((character) => character.name)).toEqual([
      "苏糯",
      "沈清辞",
      "夏栀",
      "温知予"
    ]);
  });

  it("keeps role details and base image paths for database seeding", () => {
    for (const character of presetCharacters) {
      expect(character.slug).toMatch(/^[a-z0-9-]+$/);
      expect(character.persona.length).toBeGreaterThan(20);
      expect(character.background.length).toBeGreaterThan(20);
      expect(character.speakingStyle.length).toBeGreaterThan(20);
      expect(character.catchphrases).toHaveLength(3);
      expect(character.baseImageUrl).toMatch(/^\/destine[1-4]\.jpg$/);
    }
  });
});
