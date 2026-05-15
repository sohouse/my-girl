import { describe, expect, it, vi } from "vitest";
import { createApi } from "@/server/api/app";

function createDbStub() {
  return {
    query: {
      chatSessions: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([])
      },
      chatMessages: {
        findMany: vi.fn().mockResolvedValue([])
      },
      characters: {
        findFirst: vi.fn().mockResolvedValue({ id: "character-1" }),
        findMany: vi.fn().mockResolvedValue([])
      }
    },
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
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined)
      })
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined)
    })
  };
}

function imageFile() {
  return new File(["avatar"], "avatar.png", { type: "image/png" });
}

describe("Phase 4 custom character API", () => {
  it("rejects custom character creation for anonymous users", async () => {
    const api = createApi({
      db: createDbStub(),
      getUser: async () => null
    });
    const form = new FormData();
    form.set("name", "林晚");
    form.set("baseImage", imageFile());

    const response = await api.request("/api/characters/custom", {
      method: "POST",
      body: form
    });

    expect(response.status).toBe(401);
  });

  it("creates a custom character for signed-in users", async () => {
    const api = createApi({
      db: createDbStub(),
      getUser: async () => ({ id: "user-1" }),
      verifyTurnstile: async () => undefined,
      saveFile: async () => ({
        key: "uploads/users/user-1/custom-character-avatar/a.png",
        url: "/uploads/users/user-1/custom-character-avatar/a.png",
        provider: "local-public",
        contentType: "image/png",
        size: 6
      })
    });
    const form = new FormData();
    form.set("name", "林晚");
    form.set("persona", "温柔又坚定");
    form.set("baseImage", imageFile());
    form.set("turnstileToken", "token");

    const response = await api.request("/api/characters/custom", {
      method: "POST",
      body: form
    });
    const body = await response.json();

    expect(response.status, JSON.stringify(body)).toBe(200);
    expect(body.character.kind).toBe("custom");
  });

  it("creates a custom character without an uploaded image", async () => {
    const saveFile = vi.fn();
    const api = createApi({
      db: createDbStub(),
      getUser: async () => ({ id: "user-1" }),
      verifyTurnstile: async () => undefined,
      saveFile
    });
    const form = new FormData();
    form.set("name", "林晚");
    form.set("persona", "温柔又坚定");
    form.set("turnstileToken", "token");

    const response = await api.request("/api/characters/custom", {
      method: "POST",
      body: form
    });
    const body = await response.json();

    expect(response.status, JSON.stringify(body)).toBe(200);
    expect(body.character.kind).toBe("custom");
    expect(saveFile).not.toHaveBeenCalled();
  });

  it("deletes signed-in users' own custom characters and returns R2 cleanup warnings", async () => {
    const db = createDbStub();
    db.query.characters.findFirst.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      kind: "custom",
      ownerUserId: "user-1",
      baseImageStorageKey: "uploads/users/user-1/custom-character-avatar/a.png",
      baseImageStorageProvider: "r2"
    });
    db.query.chatMessages.findMany.mockResolvedValue([
      {
        content: "https://cdn.example.com/uploads/users/user-1/ai-generated-image/b.png"
      }
    ]);
    const deleteObjects = vi.fn().mockResolvedValue({
      deletedKeys: [],
      failedKeys: ["uploads/users/user-1/ai-generated-image/b.png"]
    });
    const api = createApi({
      db,
      getUser: async () => ({ id: "user-1" }),
      deleteObjects,
      r2PublicUrl: "https://cdn.example.com"
    });

    const response = await api.request("/api/characters/custom/11111111-1111-4111-8111-111111111111", {
      method: "DELETE"
    });
    const body = await response.json();

    expect(response.status, JSON.stringify(body)).toBe(200);
    expect(body).toEqual({
      deleted: true,
      warnings: ["Failed to delete R2 object: uploads/users/user-1/ai-generated-image/b.png"]
    });
    expect(deleteObjects).toHaveBeenCalled();
  });
});
