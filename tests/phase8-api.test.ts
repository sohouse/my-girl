import { describe, expect, it, vi } from "vitest";
import { createApi } from "@/server/api/app";

describe("Phase 8 email dispatch API", () => {
  it("rejects cron dispatch requests without CRON_SECRET", async () => {
    const api = createApi({
      cronSecret: "secret",
      dispatchEmails: vi.fn()
    });

    const response = await api.request("/api/cron/email-dispatch");

    expect(response.status).toBe(401);
  });

  it("runs the email dispatch when CRON_SECRET matches", async () => {
    const dispatchEmails = vi.fn().mockResolvedValue({
      scannedCount: 1,
      sentCount: 1,
      skippedCount: 0,
      failedCount: 0
    });
    const api = createApi({
      cronSecret: "secret",
      dispatchEmails
    });

    const response = await api.request("/api/cron/email-dispatch", {
      headers: {
        Authorization: "Bearer secret"
      }
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      scannedCount: 1,
      sentCount: 1,
      skippedCount: 0,
      failedCount: 0
    });
    expect(dispatchEmails).toHaveBeenCalledOnce();
  });
});
