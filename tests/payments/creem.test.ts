import { describe, expect, it } from "vitest";
import { createCreemCheckoutPayload, resolveCreemCheckoutUrl } from "@/server/payments/creem";

describe("Creem checkout helpers", () => {
  it("builds a checkout payload for one-time payment", () => {
    const payload = createCreemCheckoutPayload({
      productKey: "prod_test",
      successUrl: "http://localhost:3000/payment/success",
      customerEmail: "test@example.com",
      orderId: "order_123",
      userId: "user_123"
    });

    expect(payload.product_id).toBe("prod_test");
    expect(payload.success_url).toBe("http://localhost:3000/payment/success");
    expect(payload.customer_email).toBe("test@example.com");
    expect(payload.metadata).toEqual({ orderId: "order_123", userId: "user_123" });
  });

  it("uses the checkout endpoint from the configured base url", () => {
    expect(resolveCreemCheckoutUrl("https://test-api.creem.io/v1")).toBe("https://test-api.creem.io/v1/checkouts");
    expect(resolveCreemCheckoutUrl("https://api.creem.io/v1/")).toBe("https://api.creem.io/v1/checkouts");
  });
});
