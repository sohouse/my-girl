import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { user } from "@/server/db/schema";
import type { MembershipType } from "@/lib/membership-status";

type MembershipDb = ReturnType<typeof getDb>;

export async function setUserMembership(
  db: MembershipDb = getDb(),
  input: {
    userId: string;
    membershipType: MembershipType;
    membershipExpiresAt?: Date | null;
  }
) {
  const [updated] = await db
    .update(user)
    .set({
      membershipType: input.membershipType,
      membershipExpiresAt: input.membershipExpiresAt ?? null,
      updatedAt: new Date()
    })
    .where(eq(user.id, input.userId))
    .returning();

  return updated;
}

export async function findUserById(db: MembershipDb = getDb(), userId: string) {
  return db.query.user.findFirst({
    where: eq(user.id, userId)
  });
}
