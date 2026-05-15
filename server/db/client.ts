import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getServerEnv } from "@/env";
import * as schema from "@/server/db/schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;

let db: Database | null = null;

export function getDb() {
  if (!db) {
    const env = getServerEnv();
    db = drizzle(neon(env.DATABASE_URL), { schema });
  }

  return db;
}
