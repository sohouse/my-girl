import { describe, expect, it } from "vitest";
import { getMembershipAccessState, getMembershipTypeLabel } from "@/lib/membership-status";

describe("membership status helper", () => {
  it("treats non members as unpaid", () => {
    expect(
      getMembershipAccessState({
        membershipType: "non_member",
        membershipExpiresAt: null
      }, new Date("2026-05-18T00:00:00.000Z"))
    ).toBe("non_member");
  });

  it("treats permanent members as paid", () => {
    expect(
      getMembershipAccessState({
        membershipType: "permanent_member",
        membershipExpiresAt: null
      }, new Date("2026-05-18T00:00:00.000Z"))
    ).toBe("member_active");
  });

  it("marks expired subscriptions as expired", () => {
    expect(
      getMembershipAccessState({
        membershipType: "subscription_member",
        membershipExpiresAt: "2026-05-17T23:59:59.000Z"
      }, new Date("2026-05-18T00:00:00.000Z"))
    ).toBe("member_expired");
  });

  it("marks active subscriptions as paid", () => {
    expect(
      getMembershipAccessState({
        membershipType: "subscription_member",
        membershipExpiresAt: "2026-05-19T00:00:00.000Z"
      }, new Date("2026-05-18T00:00:00.000Z"))
    ).toBe("member_active");
  });

  it("returns the visible membership label", () => {
    expect(getMembershipTypeLabel({ membershipType: "subscription_member", membershipExpiresAt: null })).toBe("subscription_member");
  });
});
