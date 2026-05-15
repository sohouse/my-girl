import { describe, expect, it } from "vitest";
import {
  getSignInMethod,
  signInSchema,
  signUpSchema
} from "@/lib/auth-validation";

describe("auth form validation", () => {
  it("accepts the Phase 2 sign-up fields for email and username auth", () => {
    const result = signUpSchema.safeParse({
      name: "青也",
      username: "qingye",
      email: "qingye@example.com",
      password: "password1234"
    });

    expect(result.success).toBe(true);
  });

  it("rejects short passwords before sending credentials to Better Auth", () => {
    const result = signUpSchema.safeParse({
      name: "青也",
      username: "qingye",
      email: "qingye@example.com",
      password: "short"
    });

    expect(result.success).toBe(false);
  });

  it("detects whether a sign-in identifier is an email or username", () => {
    expect(getSignInMethod("qingye@example.com")).toBe("email");
    expect(getSignInMethod("qingye")).toBe("username");
  });

  it("accepts either an email address or username for sign-in", () => {
    expect(
      signInSchema.safeParse({
        identifier: "qingye",
        password: "password1234"
      }).success
    ).toBe(true);
  });
});
