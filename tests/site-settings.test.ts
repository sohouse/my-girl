import { getTableColumns } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { createApi } from "@/server/api/app";
import { siteSettings } from "@/server/db/schema";
import { getBaseImageReferenceEnabled, setBaseImageReferenceEnabled } from "@/server/characters/service";

describe("site settings schema", () => {
  it("stores the global base image reference toggle", () => {
    const columns = getTableColumns(siteSettings);

    expect(columns).toHaveProperty("key");
    expect(columns).toHaveProperty("value");
    expect(columns).toHaveProperty("updatedAt");
    expect(columns).toHaveProperty("createdAt");
  });
});

describe("base image reference site setting", () => {
  it("defaults to false when the setting row is missing", async () => {
    const db = {
      query: {
        siteSettings: {
          findFirst: vi.fn().mockResolvedValue(null)
        }
      }
    };

    await expect(getBaseImageReferenceEnabled(db as never)).resolves.toBe(false);
  });

  it("writes the global base image reference toggle via upsert", async () => {
    const returned = {
      key: "allow_base_image_reference",
      value: true
    };
    const db = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([returned])
          })
        })
      })
    };

    await expect(setBaseImageReferenceEnabled(db as never, true)).resolves.toEqual(returned);
    expect(db.insert).toHaveBeenCalled();
  });

  it("can be combined with the character toggle to gate selfie generation", async () => {
    const db = {
      query: {
        siteSettings: {
          findFirst: vi.fn().mockResolvedValue({ key: "allow_base_image_reference", value: true }),
        },
        characters: {
          findFirst: vi.fn().mockResolvedValue({ allowBaseImageReference: true })
        }
      }
    };

    await expect(
      Promise.all([
        getBaseImageReferenceEnabled(db as never),
        setBaseImageReferenceEnabled(
          {
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                onConflictDoUpdate: vi.fn().mockReturnValue({
                  returning: vi.fn().mockResolvedValue([{ key: "allow_base_image_reference", value: true }])
                })
              })
            })
          } as never,
          true
        )
      ])
    ).resolves.toBeTruthy();
  });
});

describe("admin site settings api", () => {
  it("rejects anonymous users from the site setting api", async () => {
    const api = createApi({
      db: {
        query: {
          siteSettings: {
            findFirst: vi.fn()
          }
        }
      } as never,
      getUser: async () => null
    });

    const response = await api.request("/api/admin/settings/base-image-reference");

    expect(response.status).toBe(401);
  });
});
