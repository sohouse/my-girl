import { desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { user as userTable } from "@/server/db/schema";

export type AdminUserRole = "user" | "admin";

export type AdminUserInput = {
  name: string;
  username?: string | null;
  displayUsername?: string | null;
  role: AdminUserRole;
  emailVerified: boolean;
};

export type AdminUserRecord = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  username: string | null;
  displayUsername: string | null;
  role: AdminUserRole;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type UserOps = {
  query: {
    user: {
      findMany: (args?: never) => Promise<unknown[]>;
      findFirst: (args?: never) => Promise<unknown>;
    };
  };
  update: (table: unknown) => {
    set: (value: Record<string, unknown>) => {
      where: (condition: unknown) => Promise<unknown[]>;
    };
  };
};

function toUserOps(db: unknown) {
  return db as UserOps;
}

export async function listAdminUsers(db = getDb() as unknown) {
  const users = await toUserOps(db).query.user.findMany({
    columns: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      username: true,
      displayUsername: true,
      role: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: desc(userTable.createdAt)
  } as never);

  return users.map(toSafeAdminUser);
}

export async function updateAdminUser(
  db = getDb() as unknown,
  input: {
    currentUserId: string;
    targetUserId: string;
    input: AdminUserInput;
  }
) {
  if (input.currentUserId === input.targetUserId && input.input.role === "user") {
    throw new Error("Cannot demote current admin");
  }

  const ops = toUserOps(db);
  const existing = await ops.query.user.findFirst({
    where: eq(userTable.id, input.targetUserId)
  } as never);

  if (!existing) {
    throw new Error("User not found");
  }

  const [updated] = await ops
    .update(userTable)
    .set({
      name: input.input.name,
      username: input.input.username?.trim() || null,
      displayUsername: input.input.displayUsername?.trim() || null,
      role: input.input.role,
      emailVerified: input.input.emailVerified,
      updatedAt: new Date()
    })
    .where(eq(userTable.id, input.targetUserId));

  return toSafeAdminUser(updated);
}

function toSafeAdminUser(value: unknown): AdminUserRecord {
  const item = value as {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    username?: string | null;
    displayUsername?: string | null;
    role?: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
  };

  return {
    id: item.id,
    name: item.name,
    email: item.email,
    emailVerified: item.emailVerified,
    username: item.username ?? null,
    displayUsername: item.displayUsername ?? null,
    role: item.role === "admin" ? "admin" : "user",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}
