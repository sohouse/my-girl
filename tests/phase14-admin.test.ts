import { describe, expect, it, vi } from "vitest";
import { createApi } from "@/server/api/app";
import {
  createPresetCharacter,
  getBaseImageReferenceEnabled,
  listEnabledPresetCharacters,
  setBaseImageReferenceEnabled,
  updatePresetCharacter,
  updatePresetCharacterEnabled
} from "@/server/characters/service";

const presetId = "11111111-1111-4111-8111-111111111111";
const customId = "22222222-2222-4222-8222-222222222222";

function createDbStub() {
  const insertedValues: Array<Record<string, unknown>> = [];
  const updatedValues: Array<Record<string, unknown>> = [];

  return {
    query: {
      characters: {
        findFirst: vi.fn().mockResolvedValue({
          id: presetId,
          kind: "preset",
          enabled: true
        }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: presetId,
            slug: "su-nuo",
            kind: "preset",
            name: "苏糯",
            title: "软萌治愈系",
            persona: "温柔",
            background: "普通小康家庭",
            speakingStyle: "轻柔",
            catchphrases: "没关系呀",
            motivation: "陪伴",
            baseImageUrl: "/destine1.jpg",
            baseImageStorageKey: null,
            baseImageStorageProvider: "local-public",
            allowBaseImageReference: true,
            sortOrder: 1,
            enabled: true,
            updatedAt: new Date("2026-05-08T00:00:00.000Z")
          }
        ]),
      },
      siteSettings: {
        findFirst: vi.fn().mockResolvedValue(null)
      }
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockImplementation((value) => {
        insertedValues.push(value);

        if ("key" in value) {
          return {
            onConflictDoUpdate: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ ...value }])
            })
          };
        }

        return {
          returning: vi.fn().mockResolvedValue([{ id: "33333333-3333-4333-8333-333333333333", ...value }])
        };
      })
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockImplementation((value) => {
        updatedValues.push(value);

        return {
          where: vi.fn().mockResolvedValue([{ id: presetId, ...value }])
        };
      })
    }),
    insertedValues,
    updatedValues
  };
}

const validPresetInput = {
  slug: "lin-wan",
  name: "林晚",
  title: "温柔陪伴系",
  persona: "温柔但有边界",
  background: "在海边城市长大",
  speakingStyle: "轻声、克制、真诚",
  catchphrases: "我在。",
  motivation: "陪伴用户度过疲惫时刻",
  baseImageUrl: "/destine1.jpg",
  baseImageStorageKey: null,
  baseImageStorageProvider: "local-public",
  allowBaseImageReference: true,
  sortOrder: 9,
  enabled: true
};

describe("Phase 14 preset character admin", () => {
  it("lists only enabled preset characters for the public home", async () => {
    const db = createDbStub();

    await listEnabledPresetCharacters(db as never);

    expect(db.query.characters.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.any(Object),
        orderBy: expect.any(Object)
      })
    );
  });

  it("creates preset characters with enabled=true by default", async () => {
    const db = createDbStub();

    const created = await createPresetCharacter(db as never, {
      ...validPresetInput,
      enabled: undefined
    });

    expect(created).toMatchObject({
      kind: "preset",
      slug: "lin-wan",
      enabled: true
    });
    expect(db.insertedValues[0]).toMatchObject({
      kind: "preset",
      ownerUserId: null,
      enabled: true
    });
  });

  it("refuses to update custom characters through preset admin service", async () => {
    const db = createDbStub();
    db.query.characters.findFirst.mockResolvedValue({
      id: customId,
      kind: "custom",
      ownerUserId: "user-1"
    });

    await expect(updatePresetCharacter(db as never, customId, validPresetInput)).rejects.toThrow(
      "Preset character not found"
    );
  });

  it("updates preset enabled state without deleting the character", async () => {
    const db = createDbStub();

    await updatePresetCharacterEnabled(db as never, presetId, false);

    expect(db.update).toHaveBeenCalled();
    expect(db.updatedValues[0]).toMatchObject({
      enabled: false
    });
  });

  it("defaults to false for the global base image reference setting", async () => {
    const db = createDbStub();

    await expect(getBaseImageReferenceEnabled(db as never)).resolves.toBe(false);
  });

  it("upserts the global base image reference setting", async () => {
    const db = createDbStub();

    await expect(setBaseImageReferenceEnabled(db as never, true)).resolves.toMatchObject({
      key: "allow_base_image_reference",
      value: true
    });
    expect(db.insert).toHaveBeenCalled();
  });

  it("rejects anonymous users from admin preset APIs", async () => {
    const api = createApi({
      db: createDbStub() as never,
      getUser: async () => null
    });

    const response = await api.request("/api/admin/characters/presets");

    expect(response.status).toBe(401);
  });

  it("rejects non-admin users from admin preset APIs", async () => {
    const api = createApi({
      db: createDbStub() as never,
      getUser: async () => ({ id: "user-1", role: "user" })
    });

    const response = await api.request("/api/admin/characters/presets");

    expect(response.status).toBe(403);
  });

  it("lets admins create, edit, and disable preset characters through admin APIs", async () => {
    const db = createDbStub();
    const api = createApi({
      db: db as never,
      getUser: async () => ({ id: "admin-1", role: "admin" })
    });

    const createResponse = await api.request("/api/admin/characters/presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPresetInput)
    });
    const editResponse = await api.request(`/api/admin/characters/presets/${presetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validPresetInput, title: "新的定位" })
    });
    const disableResponse = await api.request(`/api/admin/characters/presets/${presetId}/enabled`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: false })
    });

    expect(createResponse.status).toBe(200);
    expect(editResponse.status).toBe(200);
    expect(disableResponse.status).toBe(200);
    expect(db.insertedValues[0]).toMatchObject({ kind: "preset" });
    expect(db.updatedValues.at(-1)).toMatchObject({ enabled: false });
  });
});
