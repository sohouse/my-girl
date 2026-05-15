import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { account, session, user, verification } from "@/server/db/schema";

describe("Better Auth Drizzle schema", () => {
  it("defines the user columns required by email and username auth", () => {
    const columns = getTableColumns(user);

    expect(columns).toHaveProperty("id");
    expect(columns).toHaveProperty("name");
    expect(columns).toHaveProperty("email");
    expect(columns).toHaveProperty("emailVerified");
    expect(columns).toHaveProperty("username");
    expect(columns).toHaveProperty("displayUsername");
  });

  it("defines Better Auth session, account, and verification tables", () => {
    expect(getTableColumns(session)).toHaveProperty("token");
    expect(getTableColumns(account)).toHaveProperty("providerId");
    expect(getTableColumns(verification)).toHaveProperty("identifier");
  });
});
