import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";

export type DatabaseHealth = {
  ok: boolean;
};

export async function checkDatabase(): Promise<DatabaseHealth> {
  try {
    await getDb().execute(sql`select 1`);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
