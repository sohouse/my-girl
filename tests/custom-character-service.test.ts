import { describe, expect, it, vi } from "vitest";
import { createCustomCharacter, deleteCustomCharacter } from "@/server/characters/service";

describe("custom character service", () => {
  it("creates a user-owned custom character with storage metadata", async () => {
    const db = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: "character-1",
              kind: "custom",
              ownerUserId: "user-1"
            }
          ])
        })
      })
    };

    const character = await createCustomCharacter(db, {
      userId: "user-1",
      name: "林晚",
      persona: "温柔又坚定",
      background: "",
      speakingStyle: "",
      catchphrases: "",
      motivation: "",
      image: {
        url: "/uploads/users/user-1/custom-character-avatar/a.png",
        key: "uploads/users/user-1/custom-character-avatar/a.png",
        provider: "local-public"
      }
    });

    expect(character).toMatchObject({
      kind: "custom",
      ownerUserId: "user-1"
    });
  });

  it("uses a default character image when no image is provided", async () => {
    const values = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([
        {
          id: "character-1",
          kind: "custom",
          ownerUserId: "user-1"
        }
      ])
    });
    const db = {
      insert: vi.fn().mockReturnValue({
        values
      })
    };

    await createCustomCharacter(db, {
      userId: "user-1",
      name: "林晚"
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        baseImageUrl: "/destine1.jpg",
        baseImageStorageKey: null,
        baseImageStorageProvider: "local-public"
      })
    );
  });
});

describe("custom character deletion", () => {
  it("deletes the database character and returns warnings when R2 cleanup fails", async () => {
    const deleteWhere = vi.fn().mockResolvedValue(undefined);
    const db = {
      query: {
        characters: {
          findFirst: vi.fn().mockResolvedValue({
            id: "character-1",
            kind: "custom",
            ownerUserId: "user-1",
            baseImageStorageKey: "uploads/users/user-1/custom-character-avatar/a.png",
            baseImageStorageProvider: "r2"
          })
        },
        chatMessages: {
          findMany: vi.fn().mockResolvedValue([
            {
              content: "https://cdn.example.com/uploads/users/user-1/ai-generated-image/b.png"
            },
            {
              content: "https://cdn.example.com/uploads/users/user-1/ai-generated-image/c.png"
            }
          ])
        }
      },
      delete: vi.fn().mockReturnValue({
        where: deleteWhere
      })
    };
    const deleteObjects = vi.fn().mockResolvedValue({
      deletedKeys: ["uploads/users/user-1/custom-character-avatar/a.png"],
      failedKeys: ["uploads/users/user-1/ai-generated-image/b.png"]
    });
    const logger = {
      warn: vi.fn()
    };

    const result = await deleteCustomCharacter(db, {
      userId: "user-1",
      characterId: "character-1",
      deleteObjects,
      publicUrl: "https://cdn.example.com",
      logger
    });

    expect(db.delete).toHaveBeenCalled();
    expect(deleteWhere).toHaveBeenCalled();
    expect(deleteObjects).toHaveBeenCalledWith([
      "uploads/users/user-1/custom-character-avatar/a.png",
      "uploads/users/user-1/ai-generated-image/b.png",
      "uploads/users/user-1/ai-generated-image/c.png"
    ]);
    expect(result).toEqual({
      deleted: true,
      warnings: [
        "Failed to delete R2 object: uploads/users/user-1/ai-generated-image/b.png"
      ]
    });
    expect(logger.warn).toHaveBeenCalled();
  });

  it("rejects deleting preset characters and characters owned by another user", async () => {
    const db = {
      query: {
        characters: {
          findFirst: vi.fn().mockResolvedValue({
            id: "character-1",
            kind: "preset",
            ownerUserId: null
          })
        },
        chatMessages: {
          findMany: vi.fn()
        }
      },
      delete: vi.fn()
    };

    await expect(
      deleteCustomCharacter(db, {
        userId: "user-1",
        characterId: "character-1",
        deleteObjects: vi.fn(),
        publicUrl: "https://cdn.example.com"
      })
    ).rejects.toThrow("Custom character not found");
    expect(db.delete).not.toHaveBeenCalled();
  });
});
