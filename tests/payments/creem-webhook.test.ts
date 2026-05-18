import { describe, expect, it } from "vitest";
import { parseCreemWebhookEvent } from "@/server/payments/creem-webhook";

describe("Creem webhook parser", () => {
  it("accepts a checkout completed event payload", () => {
    const event = parseCreemWebhookEvent({
      id: "evt_123",
      eventType: "checkout.completed",
      created_at: 1728734325927,
      object: {
        id: "ch_123",
        object: "checkout"
      }
    });

    expect(event.id).toBe("evt_123");
    expect(event.eventType).toBe("checkout.completed");
    expect(event.object).toMatchObject({
      id: "ch_123",
      object: "checkout"
    });
  });
});
