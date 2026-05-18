import { describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/payments/creem/checkout/route";

describe("Creem checkout route handler", () => {
  it("returns a checkout url for test mode", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ checkout_url: "https://checkout.creem.io/session_123" })
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as typeof fetch;
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      APP_BASE_URL: "http://localhost:3000",
      CREEM_PRODUCT_KEY: "prod_test",
      CREEM_API_KEY: "creem-api-key",
      CREEM_CHECKOUT_URL: "https://test-api.creem.io/v1/checkouts",
      CREEM_WEBHOOK_SECRET: "whsec_test",
      CREEM_API_BASE_URL: "https://test-api.creem.io/v1"
    };

    try {
      const request = new Request("http://localhost/api/payments/creem/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ customerEmail: "test@example.com", orderId: "order_123" })
      });
      const response = await POST(request as never);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.checkoutUrl).toBe("https://checkout.creem.io/session_123");
    } finally {
      globalThis.fetch = originalFetch;
      process.env = originalEnv;
    }
  });
});
