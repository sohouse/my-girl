import { describe, expect, it, vi } from "vitest";
import { createApi } from "@/server/api/app";
import { generateChatImage } from "@/server/ai/image";
import { checkRateLimit, createMemoryRateLimitStore } from "@/server/security/rate-limit";
import { verifyTurnstileToken } from "@/server/security/turnstile";
import { saveUploadedFileToR2 } from "@/server/storage/r2";

const sessionId = "00000000-0000-0000-0000-000000000010";

function createDbStub() {
  return {
    query: {
      chatSessions: {
        findFirst: vi.fn().mockResolvedValue({
          id: sessionId,
          userId: "user-1",
          characterId: "00000000-0000-0000-0000-000000000001",
          character: {
            name: "苏糯",
            persona: "软萌治愈系",
            background: "普通小康家庭",
            speakingStyle: "轻柔软糯",
            catchphrases: "没关系呀，我都陪着你～",
            motivation: "陪伴和治愈",
            baseImageUrl: "/destine1.jpg"
          }
        })
      },
      chatMessages: {
        findFirst: vi.fn().mockResolvedValue(null),
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

function r2Env() {
  return {
    R2_ACCESS_KEY_ID: "access",
    R2_SECRET_ACCESS_KEY: "secret",
    R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
    R2_BUCKET_NAME: "my-girl",
    R2_PUBLIC_URL: "https://cdn.example.com"
  };
}

function stubImageEnv() {
  for (const [key, value] of Object.entries({
    RESEND_API_KEY: "resend-key",
    RESEND_FROM_EMAIL: "My Girl <noreply@example.com>",
    CRON_SECRET: "cron-secret",
    ARK_BASE_URL: "https://ark.example.com",
    ARK_SEEDREAM_MODEL: "doubao-seedream-5-0-260128",
    ARK_IMAGE_GENERATOR_URL: "https://ark.example.com/images",
    ARK_API_KEY: "ark-key",
    ARK_VOICE_GENERATOR_URL: "https://voice.example.com/api/v3/tts/unidirectional",
    ARK_VOICE_API_KEY: "voice-key",
    ARK_VOICE_APP_ID: "voice-app",
    REQUIRE_AUTH_TO_USE: "true",
    AUTH_ADAPTER_MODE: "database",
    DATABASE_URL: "postgres://user:pass@example.com/db",
    DIRECT_URL: "postgres://user:pass@example.com/db",
    MINIMAX_TEXT_GENERATOR_URL: "https://api.minimaxi.com/anthropic/v1/messages",
    MINIMAX_API_KEY: "minimax-key",
    TURNSTILE_SECRET_KEY: "turnstile-secret",
    R2_ACCESS_KEY_ID: "r2-access",
    R2_SECRET_ACCESS_KEY: "r2-secret",
    R2_ENDPOINT: "https://r2.example.com",
    R2_BUCKET_NAME: "my-girl",
    R2_PUBLIC_URL: "https://cdn.example.com"
  })) {
    vi.stubEnv(key, value);
  }
}

describe("Phase 11 upload safety", () => {
  it("rejects custom character avatars larger than 2MB before uploading to R2", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const file = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "avatar.png", { type: "image/png" });

    await expect(
      saveUploadedFileToR2({
        userId: "user-1",
        scene: "custom-character-avatar",
        file,
        env: r2Env(),
        fetchImpl
      })
    ).rejects.toThrow("Image file is too large");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects unsupported custom character avatar MIME types before uploading to R2", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const file = new File(["avatar"], "avatar.gif", { type: "image/gif" });

    await expect(
      saveUploadedFileToR2({
        userId: "user-1",
        scene: "custom-character-avatar",
        file,
        env: r2Env(),
        fetchImpl
      })
    ).rejects.toThrow("Unsupported image type");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("Phase 11 Ark generated image download safety", () => {
  it("does not save Ark generated images from untrusted domains", async () => {
    stubImageEnv();

    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      Response.json({
        data: [{ url: "https://evil.example.com/generated.png" }]
      })
    );
    const saveGeneratedImage = vi.fn();

    await expect(
      generateChatImage({
        userId: "user-1",
        prompt: "窗边自拍",
        fetchImpl: fetchMock,
        saveGeneratedImage
      })
    ).rejects.toThrow("Generated image url is not trusted");
    expect(saveGeneratedImage).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not save Ark generated image downloads with non-image content types", async () => {
    stubImageEnv();

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          data: [{ url: "https://ark-project.tos-cn-beijing.volces.com/generated.png" }]
        })
      )
      .mockResolvedValueOnce(
        new Response("not image", {
          headers: {
            "Content-Type": "text/html",
            "Content-Length": "9"
          }
        })
      );
    const saveGeneratedImage = vi.fn();

    await expect(
      generateChatImage({
        userId: "user-1",
        prompt: "窗边自拍",
        fetchImpl: fetchMock,
        saveGeneratedImage
      })
    ).rejects.toThrow("Unsupported image type");
    expect(saveGeneratedImage).not.toHaveBeenCalled();
  });

  it("does not save Ark generated image downloads larger than 2MB", async () => {
    stubImageEnv();

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          data: [{ url: "https://ark-project.tos-cn-beijing.volces.com/generated.png" }]
        })
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array(2 * 1024 * 1024 + 1), {
          headers: {
            "Content-Type": "image/png"
          }
        })
      );
    const saveGeneratedImage = vi.fn();

    await expect(
      generateChatImage({
        userId: "user-1",
        prompt: "窗边自拍",
        fetchImpl: fetchMock,
        saveGeneratedImage
      })
    ).rejects.toThrow("Image file is too large");
    expect(saveGeneratedImage).not.toHaveBeenCalled();
  });
});

describe("Phase 11 rate limiting", () => {
  it("returns 429 and does not call costly chat dependencies after message rate limit is exceeded", async () => {
    const generateReply = vi.fn().mockResolvedValue("我在。");
    const rateLimitStore = createMemoryRateLimitStore();
    const api = createApi({
      db: createDbStub(),
      getUser: async () => ({ id: "user-1" }),
      generateReply,
      rateLimitStore,
      now: () => new Date("2026-05-08T00:00:00.000Z")
    });

    for (let index = 0; index < 10; index += 1) {
      const response = await api.request(`/api/chat/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: `想看看你现在穿什么 ${index}` })
      });

      expect(response.status).toBe(200);
    }

    generateReply.mockClear();
    const blocked = await api.request(`/api/chat/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "还想再聊一句" })
    });

    expect(blocked.status).toBe(429);
    await expect(blocked.json()).resolves.toEqual({ error: "Too many requests" });
    expect(generateReply).not.toHaveBeenCalled();
  });

  it("tracks rate limit by key, action, and window", () => {
    const store = createMemoryRateLimitStore();
    const now = new Date("2026-05-08T00:00:00.000Z");

    expect(checkRateLimit(store, { key: "user-1", action: "voice", limit: 2, windowMs: 60_000, now }).allowed).toBe(true);
    expect(checkRateLimit(store, { key: "user-1", action: "voice", limit: 2, windowMs: 60_000, now }).allowed).toBe(true);
    expect(checkRateLimit(store, { key: "user-1", action: "voice", limit: 2, windowMs: 60_000, now }).allowed).toBe(false);
    expect(
      checkRateLimit(store, {
        key: "user-1",
        action: "voice",
        limit: 2,
        windowMs: 60_000,
        now: new Date("2026-05-08T00:01:01.000Z")
      }).allowed
    ).toBe(true);
  });
});

describe("Phase 11 Turnstile", () => {
  it("verifies Turnstile tokens server-side with the Cloudflare siteverify API", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        success: true
      })
    );

    await expect(
      verifyTurnstileToken({
        token: "token-1",
        secretKey: "secret",
        remoteIp: "203.0.113.10",
        fetchImpl
      })
    ).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: "secret",
          response: "token-1",
          remoteip: "203.0.113.10"
        })
      })
    );
  });

  it("requires successful Turnstile verification before creating a custom character", async () => {
    const saveFile = vi.fn();
    const verifyTurnstile = vi.fn().mockRejectedValue(new Error("Turnstile verification failed"));
    const api = createApi({
      db: createDbStub(),
      getUser: async () => ({ id: "user-1" }),
      saveFile,
      verifyTurnstile
    });
    const form = new FormData();

    form.set("name", "林晚");
    form.set("baseImage", new File(["avatar"], "avatar.png", { type: "image/png" }));
    form.set("turnstileToken", "bad-token");

    const response = await api.request("/api/characters/custom", {
      method: "POST",
      body: form
    });

    expect(response.status).toBe(403);
    expect(saveFile).not.toHaveBeenCalled();
  });
});
