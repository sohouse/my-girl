import { describe, expect, it, vi } from "vitest";
import { seedPresetCharacters } from "@/server/characters/service";

describe("character seeding service", () => {
  it("does not insert presets that already exist", async () => {
    const db = {
      query: {
        characters: {
          findFirst: vi.fn().mockResolvedValue({
            id: "character-1",
            slug: "su-nuo"
          })
        }
      },
      insert: vi.fn()
    };

    await seedPresetCharacters(db);

    expect(db.insert).not.toHaveBeenCalled();
  });

  it("uses database-level conflict handling when a preset is missing", async () => {
    const onConflictDoNothing = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([])
    });
    const db = {
      query: {
        characters: {
          findFirst: vi.fn().mockResolvedValueOnce(null).mockResolvedValue({
            id: "character-1",
            slug: "su-nuo"
          })
        }
      },
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing
        })
      })
    };

    await seedPresetCharacters(db);

    expect(onConflictDoNothing).toHaveBeenCalled();
  });
});
