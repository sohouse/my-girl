import { describe, expect, it, vi } from "vitest";
import { createApi } from "@/server/api/app";

vi.mock("@/env", () => ({
  getServerEnv: () => ({
    CREEM_PRODUCT_KEY: "prod_test",
    CREEM_API_KEY: "creem-api-key",
    CREEM_CHECKOUT_URL: "https://test-api.creem.io/v1/checkouts",
    CREEM_WEBHOOK_SECRET: "whsec_test",
    CREEM_API_BASE_URL: "https://test-api.creem.io/v1",
    CREEM_CHECKOUT_SUCCESS_URL: "http://localhost:3000/payment/success"
  })
}));

describe("Creem checkout API", () => {
  it("returns a checkout url for a valid request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ checkout_url: "https://checkout.creem.io/session_123" })
    });
    const api = createApi({
      appBaseUrl: "http://localhost:3000",
      db: {
        query: {}
      } as never,
      getUser: async () => ({ id: "user-1" })
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as typeof fetch;

    try {
      const response = await api.request("/api/payments/creem/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerEmail: "test@example.com",
          orderId: "order_123"
        })
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.checkoutUrl).toBe("https://checkout.creem.io/session_123");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
