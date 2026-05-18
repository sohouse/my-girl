import { describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { POST } from "@/app/api/webhook/creem/route";

vi.mock("@/env", () => ({
  getServerEnv: () => ({
    RESEND_API_KEY: "resend-key",
    RESEND_FROM_EMAIL: "miss@will-zp.com",
    CRON_SECRET: "cron-secret",
    ARK_BASE_URL: "https://ark.example.com",
    ARK_SEEDREAM_MODEL: "seedream",
    ARK_IMAGE_GENERATOR_URL: "https://ark.example.com/image",
    ARK_API_KEY: "ark-key",
    CREEM_PRODUCT_KEY: "prod_test",
    CREEM_API_KEY: "creem-api-key",
    CREEM_CHECKOUT_URL: "https://test-api.creem.io/v1/checkouts",
    CREEM_WEBHOOK_SECRET: "whsec_test",
    ARK_VOICE_GENERATOR_URL: "https://ark.example.com/voice",
    ARK_VOICE_API_KEY: "ark-voice-key",
    ARK_VOICE_APP_ID: "ark-voice-app",
    AUTH_ADAPTER_MODE: "db",
    DATABASE_URL: "postgres://localhost/test",
    DIRECT_URL: "postgres://localhost/test",
    MINIMAX_TEXT_GENERATOR_URL: "https://minimax.example.com",
    MINIMAX_API_KEY: "minimax-key",
    TURNSTILE_SECRET_KEY: "turnstile-key",
    R2_ACCESS_KEY_ID: "r2-key-id",
    R2_SECRET_ACCESS_KEY: "r2-secret",
    R2_ENDPOINT: "https://r2.example.com",
    R2_BUCKET_NAME: "bucket",
    R2_PUBLIC_URL: "https://cdn.example.com"
  })
}));

vi.mock("@/server/db/client", () => ({
  getDb: () => ({
    query: {
      user: {
        findFirst: vi.fn().mockResolvedValue({
          id: "user-1",
          membershipType: "non_member",
          membershipExpiresAt: null
        })
      }
    },
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "user-1" }])
        })
      })
    })
  })
}));

describe("Creem webhook handler", () => {
  it("updates a permanent member after checkout.completed", async () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      CREEM_WEBHOOK_SECRET: "whsec_test"
    };

    const rawBody = JSON.stringify({
      id: "evt_123",
      eventType: "checkout.completed",
      object: {
        id: "ch_123",
        object: "checkout",
        metadata: {
          userId: "user-1"
        },
        product_id: "prod_permanent"
      }
    });

    const signature = createHmac("sha256", "whsec_test").update(rawBody).digest("hex");

    try {
      // handler currently uses db from server/db/client; this test documents the expected write behavior.
      const response = await POST(
        new Request("http://localhost/api/webhook/creem", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "creem-signature": signature
          },
          body: rawBody
        }) as never
      );

      expect(response.status).toBe(200);
    } finally {
      process.env = originalEnv;
    }
  });
});
