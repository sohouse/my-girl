import { describe, expect, it } from "vitest";
import { createApi } from "@/server/api/app";

describe("GET /api/health", () => {
  it("returns healthy status when the database check succeeds", async () => {
    const app = createApi({
      checkDatabase: async () => ({ ok: true })
    });

    const response = await app.request("/api/health");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      app: "my-girl",
      status: "ok",
      services: {
        api: "ok",
        database: "ok"
      }
    });
  });

  it("returns degraded status when the database check fails", async () => {
    const app = createApi({
      checkDatabase: async () => ({ ok: false })
    });

    const response = await app.request("/api/health");
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      app: "my-girl",
      status: "degraded",
      services: {
        api: "ok",
        database: "error"
      }
    });
  });
});
