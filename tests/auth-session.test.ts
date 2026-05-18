import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth", () => ({
  getAuth: vi.fn()
}));

vi.mock("@/server/db/client", () => ({
  getDb: vi.fn()
}));

import { getAuth } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { getSessionUser } from "@/server/auth/session";

describe("session user", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("hydrates role from the database when the auth session user omits custom fields", async () => {
    vi.mocked(getAuth).mockReturnValue({
      api: {
        getSession: vi.fn().mockResolvedValue({
          user: {
            id: "user-1",
            email: "admin@example.com",
            name: "Admin"
          }
        })
      }
    } as never);
    vi.mocked(getDb).mockReturnValue({
      query: {
        user: {
          findFirst: vi.fn().mockResolvedValue({
            id: "user-1",
            email: "admin@example.com",
            name: "Admin",
            role: "admin",
            membershipType: "non_member",
            membershipExpiresAt: null
          })
        }
      }
    } as never);

    const user = await getSessionUser(new Headers());

    expect(user).toMatchObject({
      id: "user-1",
      role: "admin",
      membershipType: "non_member",
      membershipExpiresAt: null
    });
  });
});
