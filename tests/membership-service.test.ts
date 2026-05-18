import { describe, expect, it, vi } from "vitest";
import { setUserMembership } from "@/server/membership/service";

describe("membership service", () => {
  it("writes a permanent membership", async () => {
    const returning = vi.fn().mockResolvedValue([{ id: "user-1" }]);
    const db = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning
          })
        })
      })
    };

    await setUserMembership(db as never, {
      userId: "user-1",
      membershipType: "permanent_member",
      membershipExpiresAt: null
    });

    expect(db.update).toHaveBeenCalled();
    expect(returning).toHaveBeenCalled();
  });
});
