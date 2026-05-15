import { getAuth } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { user } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export async function getSessionUser(headers: Headers) {
  const session = await getAuth().api.getSession({ headers });

  if (!session?.user) {
    return null;
  }

  const dbUser = await getDb().query.user.findFirst({
    where: eq(user.id, session.user.id)
  });

  return {
    ...session.user,
    role: dbUser?.role ?? "user"
  };
}
