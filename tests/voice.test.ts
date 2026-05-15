import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildVoicePromptText,
  buildVoiceRequestPayload,
  generateVoiceAudio,
  isSupportedMp3Audio,
  parseVoiceHttpStream
} from "@/server/ai/voice";

const testServerEnv = {
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
  ARK_VOICE_RESOURCE_ID: "seed-tts-2.0",
  ARK_VOICE_SPEAKER: "zh_female_cancan_uranus_bigtts",
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
};

function voiceStreamResponse(lines: string[], init?: ResponseInit) {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();

      for (const line of lines) {
        controller.enqueue(encoder.encode(`${line}\n`));
      }

      controller.close();
    }
  });

  return new Response(body, init);
}

describe("voice generation helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds a direct text-to-speech HTTP payload from the selected message", () => {
    expect(buildVoiceRequestPayload("火山引擎", "voice-speaker")).toEqual({
      user: {
        uid: "my-girl"
      },
      req_params: {
        text: "火山引擎",
        speaker: "voice-speaker",
        audio_params: {
          format: "mp3",
          sample_rate: 24000,
          enable_timestamp: true
        },
        additions: JSON.stringify({
          explicit_language: "zh",
          disable_markdown_filter: true,
          enable_timestamp: true
        })
      }
    });
  });

  it("uses only the assistant reply as the text sent to TTS", () => {
    const text = buildVoicePromptText({
      reply: "没关系呀，我都陪着你～",
      character: {
        name: "苏糯",
        speakingStyle: "声线轻柔软糯，语速偏慢",
        catchphrases: "没关系呀，我都陪着你～"
      },
      recentMessages: [
        { role: "user", content: "今天有点累" },
        { role: "assistant", content: "抱抱你呀" }
      ]
    });

    expect(text).toBe("没关系呀，我都陪着你～");
  });

  it("parses the HTTP streaming TTS response into mp3 bytes", async () => {
    const audio = await parseVoiceHttpStream(voiceStreamResponse([
      JSON.stringify({ code: 0, data: Buffer.from([0xff, 0xfb, 1, 2]).toString("base64") }),
      JSON.stringify({ code: 0, sentence: { text: "火山引擎" } }),
      JSON.stringify({ code: 0, data: Buffer.from([3, 4]).toString("base64") }),
      JSON.stringify({ code: 20000000, usage: { characters: 4 } })
    ]));

    expect(Array.from(audio)).toEqual([0xff, 0xfb, 1, 2, 3, 4]);
  });

  it("sends the direct TTS request to the HTTP endpoint", async () => {
    for (const [key, value] of Object.entries(testServerEnv)) {
      vi.stubEnv(key, value);
    }

    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(voiceStreamResponse([
      JSON.stringify({ code: 0, data: Buffer.from([0xff, 0xfb, 1, 2]).toString("base64") }),
      JSON.stringify({ code: 20000000 })
    ]));

    const audio = await generateVoiceAudio("页面里点击的这句话", fetchMock);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://voice.example.com/api/v3/tts/unidirectional",
      expect.objectContaining({
        method: "POST",
        headers: {
          "X-Api-App-Id": "voice-app",
          "X-Api-Access-Key": "voice-key",
          "X-Api-Resource-Id": "seed-tts-2.0",
          "Content-Type": "application/json",
          "Connection": "keep-alive"
        },
        body: expect.any(String)
      })
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      req_params: {
        text: "页面里点击的这句话",
        speaker: "zh_female_cancan_uranus_bigtts"
      }
    });
    expect(Array.from(audio)).toEqual([0xff, 0xfb, 1, 2]);
  });

  it("rejects mismatched Seed TTS 2.0 resource and non-2.0 speaker before calling the API", async () => {
    for (const [key, value] of Object.entries({
      ...testServerEnv,
      ARK_VOICE_SPEAKER: "zh_female_cancan_mars_bigtts"
    })) {
      vi.stubEnv(key, value);
    }

    const fetchMock = vi.fn<typeof fetch>();

    await expect(generateVoiceAudio("你好", fetchMock)).rejects.toThrow(
      "ARK_VOICE_RESOURCE_ID=seed-tts-2.0 requires a *_uranus_bigtts speaker"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects HTTP stream error lines", async () => {
    await expect(parseVoiceHttpStream(voiceStreamResponse([
      JSON.stringify({ code: 30000001, message: "bad request" })
    ]))).rejects.toThrow("Voice service returned error");
  });

  it("rejects empty successful HTTP streams", async () => {
    await expect(parseVoiceHttpStream(voiceStreamResponse([
      JSON.stringify({ code: 20000000 })
    ]))).rejects.toThrow("Voice response did not include audio");
  });

  it("detects whether returned bytes are mp3 audio", () => {
    expect(isSupportedMp3Audio(new Uint8Array([0xff, 0xfb, 1, 2]))).toBe(true);
    expect(isSupportedMp3Audio(new Uint8Array([0x49, 0x44, 0x33, 4]))).toBe(true);
    expect(isSupportedMp3Audio(new Uint8Array([0x7b, 0x22, 0x65, 0x72]))).toBe(false);
  });
});
