import { describe, expect, it } from "vitest";
import { parseCreemWebhookEvent } from "@/server/payments/creem-webhook";

describe("Creem webhook parser", () => {
  it("accepts a checkout completed event payload", () => {
    const event = parseCreemWebhookEvent({
      type: "checkout.completed",
      data: { id: "chk_123" }
    });

    expect(event.type).toBe("checkout.completed");
    expect(event.data).toEqual({ id: "chk_123" });
  });
});
