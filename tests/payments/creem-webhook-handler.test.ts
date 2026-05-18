import { describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/webhook/creem/route";

describe("Creem webhook handler", () => {
  it("updates a permanent member after checkout.completed", async () => {
    const update = vi.fn().mockResolvedValue([{ id: "user-1" }]);
    const db = {
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
            returning: update
          })
        })
      })
    };

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
        customer_id: "cust_123",
        product_id: "prod_permanent"
      }
    });

    const signature = "0".repeat(64);
    const originalFetch = globalThis.fetch;

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
      globalThis.fetch = originalFetch;
      expect(db.update).toHaveBeenCalled();
    }
  });
});
