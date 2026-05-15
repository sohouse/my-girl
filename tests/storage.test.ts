import { describe, expect, it, vi } from "vitest";
import { buildStorageObjectKey } from "@/server/storage/keys";
import type { SaveGeneratedImage } from "@/server/storage/types";
import { deleteR2Objects, saveGeneratedImageToR2, saveUploadedFileToR2 } from "@/server/storage/r2";

describe("storage key builder", () => {
  it("groups uploads by user and scene for future R2 migration", () => {
    const key = buildStorageObjectKey({
      userId: "user_123",
      scene: "custom-character-avatar",
      extension: "png",
      nonce: "abc",
      now: new Date("2026-05-07T00:00:00.000Z")
    });

    expect(key).toBe("uploads/users/user_123/custom-character-avatar/20260507000000-abc.png");
  });

  it("defines a reusable generated image storage interface for local public and future R2 storage", async () => {
    const saveGeneratedImage: SaveGeneratedImage = async (input) => ({
      key: `uploads/users/${input.userId}/${input.scene}/image.png`,
      url: `/uploads/users/${input.userId}/${input.scene}/image.png`,
      provider: "local-public",
      contentType: input.contentType,
      size: input.bytes.byteLength
    });

    await expect(
      saveGeneratedImage({
        userId: "user_123",
        scene: "ai-generated-image",
        bytes: new Uint8Array([1, 2, 3]),
        contentType: "image/png"
      })
    ).resolves.toEqual({
      key: "uploads/users/user_123/ai-generated-image/image.png",
      url: "/uploads/users/user_123/ai-generated-image/image.png",
      provider: "local-public",
      contentType: "image/png",
      size: 3
    });
  });

  it("uploads generated images to R2 and returns the public object url", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));

    const saved = await saveGeneratedImageToR2({
      userId: "user_123",
      scene: "ai-generated-image",
      bytes: new Uint8Array([1, 2, 3]),
      contentType: "image/png",
      env: {
        R2_ACCESS_KEY_ID: "access",
        R2_SECRET_ACCESS_KEY: "secret",
        R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
        R2_BUCKET_NAME: "my-girl",
        R2_PUBLIC_URL: "https://cdn.example.com"
      },
      fetchImpl,
      nonce: "abc",
      now: new Date("2026-05-07T00:00:00.000Z")
    });

    expect(saved).toEqual({
      key: "uploads/users/user_123/ai-generated-image/20260507000000-abc.png",
      url: "https://cdn.example.com/uploads/users/user_123/ai-generated-image/20260507000000-abc.png",
      provider: "r2",
      contentType: "image/png",
      size: 3
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://account.r2.cloudflarestorage.com/my-girl/uploads/users/user_123/ai-generated-image/20260507000000-abc.png",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          "content-type": "image/png",
          authorization: expect.stringContaining("AWS4-HMAC-SHA256 Credential=access/")
        })
      })
    );
  });

  it("uploads user files to R2 with the same storage metadata shape", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));
    const file = new File([new Uint8Array([7, 8])], "avatar.webp", { type: "image/webp" });

    const saved = await saveUploadedFileToR2({
      userId: "user_123",
      scene: "custom-character-avatar",
      file,
      env: {
        R2_ACCESS_KEY_ID: "access",
        R2_SECRET_ACCESS_KEY: "secret",
        R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
        R2_BUCKET_NAME: "my-girl",
        R2_PUBLIC_URL: "https://cdn.example.com/"
      },
      fetchImpl,
      nonce: "xyz",
      now: new Date("2026-05-07T00:00:00.000Z")
    });

    expect(saved).toMatchObject({
      key: "uploads/users/user_123/custom-character-avatar/20260507000000-xyz.webp",
      url: "https://cdn.example.com/uploads/users/user_123/custom-character-avatar/20260507000000-xyz.webp",
      provider: "r2",
      contentType: "image/webp",
      size: 2
    });
  });

  it("deletes R2 objects best-effort and reports failed keys", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response("nope", { status: 500 }));

    const result = await deleteR2Objects({
      keys: ["uploads/users/user_123/custom-character-avatar/a.png", "uploads/users/user_123/ai-generated-image/b.png"],
      env: {
        R2_ACCESS_KEY_ID: "access",
        R2_SECRET_ACCESS_KEY: "secret",
        R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
        R2_BUCKET_NAME: "my-girl",
        R2_PUBLIC_URL: "https://cdn.example.com"
      },
      fetchImpl
    });

    expect(result.deletedKeys).toEqual(["uploads/users/user_123/custom-character-avatar/a.png"]);
    expect(result.failedKeys).toEqual(["uploads/users/user_123/ai-generated-image/b.png"]);
  });
});
