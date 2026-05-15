import { describe, expect, it } from "vitest";
import { getUserDisplayIdentity } from "@/lib/auth-display";

describe("auth display helpers", () => {
  it("prefers display username over username and email", () => {
    expect(
      getUserDisplayIdentity({
        displayUsername: "青也",
        username: "qingye",
        email: "qingye@example.com"
      })
    ).toEqual({
      primary: "青也",
      secondary: "qingye@example.com"
    });
  });

  it("falls back to username, then email", () => {
    expect(
      getUserDisplayIdentity({
        username: "qingye",
        email: "qingye@example.com"
      })
    ).toEqual({
      primary: "qingye",
      secondary: "qingye@example.com"
    });

    expect(
      getUserDisplayIdentity({
        email: "qingye@example.com"
      })
    ).toEqual({
      primary: "qingye@example.com",
      secondary: null
    });
  });
});
