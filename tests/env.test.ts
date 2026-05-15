import { describe, expect, it } from "vitest";
import { parsePublicEnv, parseServerEnv } from "@/env";

const completeEnv = {
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
  ARK_VOICE_GENERATOR_URL: "wss://voice.example.com",
  ARK_VOICE_API_KEY: "voice-key",
  ARK_VOICE_APP_ID: "voice-app",
  REQUIRE_AUTH_TO_USE: "true",
  AUTH_ADAPTER_MODE: "database",
  DATABASE_URL: "postgres://user:pass@example.com/db",
  DIRECT_URL: "postgres://user:pass@example.com/db",
  MINIMAX_TEXT_GENERATOR_URL: "https://api.minimaxi.com/anthropic/v1/messages",
  MINIMAX_API_KEY: "minimax-key",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "site-key",
  TURNSTILE_SECRET_KEY: "turnstile-secret",
  R2_ACCESS_KEY_ID: "r2-access",
  R2_SECRET_ACCESS_KEY: "r2-secret",
  R2_ENDPOINT: "https://r2.example.com",
  R2_BUCKET_NAME: "my-girl",
  R2_PUBLIC_URL: "https://cdn.example.com"
};

describe("environment parsing", () => {
  it("accepts the Phase 1 server environment variables without exposing secret values", () => {
    const env = parseServerEnv(completeEnv);

    expect(env.DATABASE_URL).toBe("postgres://user:pass@example.com/db");
    expect(Object.keys(env)).not.toContain("NEXT_PUBLIC_TURNSTILE_SITE_KEY");
  });

  it("accepts only NEXT_PUBLIC values for browser-safe configuration", () => {
    const env = parsePublicEnv(completeEnv);

    expect(env).toEqual({
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "site-key"
    });
  });

  it("rejects empty required secrets", () => {
    const result = parseServerEnv.safeParse({
      ...completeEnv,
      DATABASE_URL: ""
    });

    expect(result.success).toBe(false);
  });
});
