import { describe, expect, it, vi } from "vitest";
import { createApi } from "@/server/api/app";
import { listAdminUsers, updateAdminUser } from "@/server/users/admin";

const adminId = "admin-1";
const userId = "user-1";

function createDbStub() {
  const updatedValues: Array<Record<string, unknown>> = [];
  const users = [
    {
      id: adminId,
      name: "青也",
      email: "admin@example.com",
      emailVerified: true,
      username: "admin",
      displayUsername: "管理员",
      role: "admin",
      password: "secret",
      token: "session-token",
      createdAt: new Date("2026-05-01T00:00:00.000Z"),
      updatedAt: new Date("2026-05-02T00:00:00.000Z")
    },
    {
      id: userId,
      name: "Will",
      email: "will@example.com",
      emailVerified: false,
      username: "will",
      displayUsername: "Will",
      role: "user",
      password: "secret",
      token: "session-token",
      createdAt: new Date("2026-05-03T00:00:00.000Z"),
      updatedAt: new Date("2026-05-04T00:00:00.000Z")
    }
  ];

  return {
    query: {
      user: {
        findMany: vi.fn().mockResolvedValue(users),
        findFirst: vi.fn().mockImplementation((args?: { where?: unknown }) => {
          const text = String(args?.where ?? "");

          if (text.includes("missing-user")) {
            return Promise.resolve(null);
          }

          return Promise.resolve(users.find((item) => item.id === userId) ?? null);
        })
      }
    },
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockImplementation((value) => {
        updatedValues.push(value);

        return {
          where: vi.fn().mockResolvedValue([{ ...users[1], ...value }])
        };
      })
    }),
    updatedValues
  };
}

const updateInput = {
  name: "Will 新昵称",
  username: "will-new",
  displayUsername: "Will New",
  role: "admin" as const,
  emailVerified: true
};

describe("Phase 15 admin user management", () => {
  it("lists admin users without sensitive fields", async () => {
    const db = createDbStub();

    const result = await listAdminUsers(db as never);

    const listArgs = db.query.user.findMany.mock.calls[0]?.[0] as {
      columns: Record<string, boolean>;
      orderBy: unknown;
    };

    expect(listArgs.columns).toMatchObject({
      id: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true
    });
    expect(listArgs.columns).not.toHaveProperty("password");
    expect(listArgs.columns).not.toHaveProperty("token");
    expect(listArgs.orderBy).toBeTruthy();
    expect(result[0]).not.toHaveProperty("password");
    expect(result[0]).not.toHaveProperty("token");
  });

  it("updates only maintainable user fields and touches updatedAt", async () => {
    const db = createDbStub();

    const updated = await updateAdminUser(db as never, {
      currentUserId: adminId,
      targetUserId: userId,
      input: updateInput
    });

    expect(updated).toMatchObject(updateInput);
    expect(db.updatedValues[0]).toMatchObject(updateInput);
    expect(db.updatedValues[0]?.updatedAt).toBeInstanceOf(Date);
    expect(db.updatedValues[0]).not.toHaveProperty("email");
    expect(db.updatedValues[0]).not.toHaveProperty("password");
  });

  it("prevents the current admin from demoting themselves", async () => {
    const db = createDbStub();

    await expect(
      updateAdminUser(db as never, {
        currentUserId: adminId,
        targetUserId: adminId,
        input: {
          ...updateInput,
          role: "user"
        }
      })
    ).rejects.toThrow("Cannot demote current admin");
  });

  it("rejects anonymous users from admin user APIs", async () => {
    const api = createApi({
      db: createDbStub() as never,
      getUser: async () => null
    });

    const response = await api.request("/api/admin/users");

    expect(response.status).toBe(401);
  });

  it("rejects non-admin users from admin user APIs", async () => {
    const api = createApi({
      db: createDbStub() as never,
      getUser: async () => ({ id: userId, role: "user" })
    });

    const response = await api.request("/api/admin/users");

    expect(response.status).toBe(403);
  });

  it("lets admins list and edit users through admin APIs", async () => {
    const db = createDbStub();
    const api = createApi({
      db: db as never,
      getUser: async () => ({ id: adminId, role: "admin" })
    });

    const listResponse = await api.request("/api/admin/users");
    const listBody = await listResponse.json();
    const editResponse = await api.request(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateInput)
    });

    expect(listResponse.status).toBe(200);
    expect(listBody.users[0]).not.toHaveProperty("password");
    expect(editResponse.status).toBe(200);
    expect(db.updatedValues[0]).toMatchObject(updateInput);
  });

  it("returns 400 when an admin tries to demote themselves through the API", async () => {
    const api = createApi({
      db: createDbStub() as never,
      getUser: async () => ({ id: adminId, role: "admin" })
    });

    const response = await api.request(`/api/admin/users/${adminId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...updateInput, role: "user" })
    });

    expect(response.status).toBe(400);
  });
});
