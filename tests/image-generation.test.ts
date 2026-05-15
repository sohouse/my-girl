import { describe, expect, it, vi } from "vitest";
import {
  buildImageGenerationPayload,
  decideImageGeneration,
  generateChatImage,
  parseImageGenerationResponse
} from "@/server/ai/image";

const character = {
  name: "苏糯",
  persona: "软萌治愈系",
  background: "普通小康家庭",
  speakingStyle: "轻柔软糯",
  catchphrases: "没关系呀，我都陪着你～",
  motivation: "陪伴和治愈",
  baseImageUrl: "/destine1.jpg"
};

function stubImageEnv() {
  for (const [key, value] of Object.entries({
    RESEND_API_KEY: "resend-key",
    RESEND_FROM_EMAIL: "My Girl <noreply@example.com>",
    CRON_SECRET: "cron-secret",
    APP_BASE_URL: "https://app.example.com",
    ARK_BASE_URL: "https://ark.example.com",
    ARK_SEEDREAM_MODEL: "doubao-seedream-5-0-260128",
    ARK_IMAGE_GENERATOR_URL: "https://ark.example.com/images",
    ARK_API_KEY: "ark-key",
    CREEM_MODERATION_URL: "https://creem.example.com/v1/moderation/prompt",
    CREEM_MODERATION_API_KEY: "creem-key",
    CREEM_MODERATION_PROVIDER: "openai",
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

describe("image generation decision checklist", () => {
  it("blocks image generation when the current context is only a short greeting", () => {
    const decision = decideImageGeneration({
      userMessage: "你好",
      assistantReply: "你好呀～",
      recentMessages: [],
      character
    });

    expect(decision.shouldGenerateImage).toBe(false);
    expect(decision.checklist).toContainEqual(
      expect.objectContaining({
        id: "context-too-short",
        decision: "block"
      })
    );
  });

  it("blocks image generation for low mood and serious conversations", () => {
    const decision = decideImageGeneration({
      userMessage: "我今天真的很崩溃，感觉撑不下去了",
      assistantReply: "我在这里陪你，先慢慢呼吸一下。",
      recentMessages: [
        { role: "user", type: "text", content: "最近压力好大" },
        { role: "assistant", type: "text", content: "我懂你的，先别责怪自己。" }
      ],
      character
    });

    expect(decision.shouldGenerateImage).toBe(false);
    expect(decision.checklist).toContainEqual(
      expect.objectContaining({
        id: "serious-or-low-mood",
        decision: "block"
      })
    );
  });

  it("allows image generation when the conversation has a strong visual cue", () => {
    const decision = decideImageGeneration({
      userMessage: "想看看你现在穿什么，能发张照片吗",
      assistantReply: "我刚换了浅色针织衫，坐在窗边给你拍一张。",
      recentMessages: [
        { role: "user", type: "text", content: "今天在干嘛" },
        { role: "assistant", type: "text", content: "刚看完书，准备休息一下。" }
      ],
      character
    });

    expect(decision.shouldGenerateImage).toBe(true);
    expect(decision.imageKind).toBe("selfie");
    expect(decision.imagePrompt).toContain("苏糯");
    expect(decision.checklist).toContainEqual(
      expect.objectContaining({
        id: "visual-cue-present",
        decision: "allow"
      })
    );
  });

  it("classifies non-person visual requests as scene images", () => {
    const decision = decideImageGeneration({
      userMessage: "想看看窗外下雨的风景",
      assistantReply: "雨落在玻璃上很安静，我拍给你看。",
      recentMessages: [
        { role: "user", type: "text", content: "今天在干嘛" },
        { role: "assistant", type: "text", content: "刚看完书，准备休息一下。" }
      ],
      character
    });

    expect(decision.shouldGenerateImage).toBe(true);
    expect(decision.imageKind).toBe("scene");
  });

  it("blocks image generation when a recent assistant image is still in cooldown", () => {
    const decision = decideImageGeneration({
      userMessage: "想看看窗外下雨的样子",
      assistantReply: "雨落在玻璃上很安静，我拍给你看。",
      recentMessages: [
        { role: "assistant", type: "image", content: "/uploads/users/user-1/ai-generated-image/one.png" },
        { role: "user", type: "text", content: "好看" }
      ],
      character
    });

    expect(decision.shouldGenerateImage).toBe(false);
    expect(decision.checklist).toContainEqual(
      expect.objectContaining({
        id: "recent-image-cooldown",
        decision: "block"
      })
    );
  });
});

describe("image generation API helpers", () => {
  it("builds the Ark Seedream image request payload", () => {
    expect(buildImageGenerationPayload("窗边自拍", "doubao-seedream-5-0-260128")).toEqual({
      model: "doubao-seedream-5-0-260128",
      prompt: "窗边自拍",
      size: "2K",
      output_format: "png",
      watermark: false
    });
  });

  it("adds the character base image when building a selfie request payload", () => {
    expect(
      buildImageGenerationPayload("窗边自拍", "doubao-seedream-5-0-260128", {
        imageKind: "selfie",
        baseImageUrl: "https://cdn.example.com/base.png"
      })
    ).toEqual({
      model: "doubao-seedream-5-0-260128",
      prompt: "窗边自拍",
      image: "https://cdn.example.com/base.png",
      size: "2K",
      output_format: "png",
      watermark: false
    });
  });

  it("resolves relative character base image urls before sending selfie requests to Ark", () => {
    expect(
      buildImageGenerationPayload("窗边自拍", "doubao-seedream-5-0-260128", {
        imageKind: "selfie",
        baseImageUrl: "/destine1.jpg",
        appBaseUrl: "https://app.example.com"
      })
    ).toMatchObject({
      image: "https://app.example.com/destine1.jpg"
    });
  });

  it("extracts the first generated image url from Ark response data", () => {
    expect(
      parseImageGenerationResponse({
        data: [{ url: "https://example.com/image.png" }]
      })
    ).toBe("https://example.com/image.png");
  });

  it("requests Ark image generation, stores the image, and returns the stored url", async () => {
    for (const [key, value] of Object.entries({
      RESEND_API_KEY: "resend-key",
      RESEND_FROM_EMAIL: "My Girl <noreply@example.com>",
      CRON_SECRET: "cron-secret",
      ARK_BASE_URL: "https://ark.example.com",
      ARK_SEEDREAM_MODEL: "doubao-seedream-5-0-260128",
      ARK_IMAGE_GENERATOR_URL: "https://ark.example.com/images",
      ARK_API_KEY: "ark-key",
      CREEM_MODERATION_URL: "https://creem.example.com/v1/moderation/prompt",
      CREEM_MODERATION_API_KEY: "creem-key",
      CREEM_MODERATION_PROVIDER: "openai",
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

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          decision: "allow"
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          data: [{ url: "https://ark-project.tos-cn-beijing.volces.com/generated.png" }]
        })
      )
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), {
        headers: {
          "Content-Type": "image/png"
        }
      }));
    const saveGeneratedImage = vi.fn().mockResolvedValue({
      key: "uploads/users/user-1/ai-generated-image/generated.png",
      url: "/uploads/users/user-1/ai-generated-image/generated.png",
      provider: "local-public",
      contentType: "image/png",
      size: 3
    });

    const image = await generateChatImage({
      userId: "user-1",
      prompt: "窗边自拍",
      imageKind: "selfie",
      baseImageUrl: "https://cdn.example.com/base.png",
      fetchImpl: fetchMock,
      saveGeneratedImage
    });

    expect(image.url).toBe("/uploads/users/user-1/ai-generated-image/generated.png");
    expect(saveGeneratedImage).toHaveBeenCalledWith({
      userId: "user-1",
      scene: "ai-generated-image",
      bytes: new Uint8Array([1, 2, 3]),
      contentType: "image/png"
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://ark.example.com/images",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer ark-key"
        },
        body: expect.stringContaining("\"image\":\"https://cdn.example.com/base.png\"")
      })
    );
    expect(fetchMock).toHaveBeenCalledWith("https://ark-project.tos-cn-beijing.volces.com/generated.png");
  });

  it("includes Ark status and response text when image generation fails", async () => {
    stubImageEnv();

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ decision: "allow" }))
      .mockResolvedValueOnce(Response.json({ decision: "allow" }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "invalid image url" } }), {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        })
      );
    const saveGeneratedImage = vi.fn();

    await expect(
      generateChatImage({
        userId: "user-1",
        prompt: "窗边自拍",
        imageKind: "selfie",
        baseImageUrl: "/destine1.jpg",
        fetchImpl: fetchMock,
        saveGeneratedImage
      })
    ).rejects.toThrow("Ark image response did not include an image url");
    expect(saveGeneratedImage).not.toHaveBeenCalled();
  });

  it("checks Creem moderation before calling Ark image generation", async () => {
    stubImageEnv();

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ decision: "allow" }))
      .mockResolvedValueOnce(
        Response.json({
          data: [{ url: "https://ark-project.tos-cn-beijing.volces.com/generated.png" }]
        })
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3]), {
          headers: {
            "Content-Type": "image/png"
          }
        })
      );
    const saveGeneratedImage = vi.fn().mockResolvedValue({
      key: "uploads/users/user-1/ai-generated-image/generated.png",
      url: "/uploads/users/user-1/ai-generated-image/generated.png",
      provider: "local-public",
      contentType: "image/png",
      size: 3
    });

    await generateChatImage({
      userId: "user-1",
      prompt: "窗边自拍",
      imageKind: "selfie",
      baseImageUrl: "https://cdn.example.com/base.png",
      fetchImpl: fetchMock,
      saveGeneratedImage
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://creem.example.com/v1/moderation/prompt",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "creem-key"
        }
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://ark.example.com/images",
      expect.objectContaining({
        method: "POST"
      })
    );
    expect(saveGeneratedImage).toHaveBeenCalledOnce();
  });


  it("blocks image generation when Creem moderation flags the prompt", async () => {
    stubImageEnv();

    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      Response.json({
        decision: "flag",
        reason: "unsafe prompt"
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
    ).rejects.toThrow("Image prompt rejected by moderation");
    expect(saveGeneratedImage).not.toHaveBeenCalled();
  });

  it("fails closed when Creem moderation is configured without an API key", async () => {
    for (const [key, value] of Object.entries({
      RESEND_API_KEY: "resend-key",
      RESEND_FROM_EMAIL: "My Girl <noreply@example.com>",
      CRON_SECRET: "cron-secret",
      ARK_BASE_URL: "https://ark.example.com",
      ARK_SEEDREAM_MODEL: "doubao-seedream-5-0-260128",
      ARK_IMAGE_GENERATOR_URL: "https://ark.example.com/images",
      ARK_API_KEY: "ark-key",
      CREEM_MODERATION_URL: "https://creem.example.com/v1/moderation/prompt",
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
    vi.stubEnv("CREEM_MODERATION_API_KEY", "");

    const fetchMock = vi.fn<typeof fetch>();
    const saveGeneratedImage = vi.fn();

    await expect(
      generateChatImage({
        userId: "user-1",
        prompt: "窗边自拍",
        fetchImpl: fetchMock,
        saveGeneratedImage
      })
    ).rejects.toThrow("Creem moderation is configured without an API key");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(saveGeneratedImage).not.toHaveBeenCalled();
  });
});
