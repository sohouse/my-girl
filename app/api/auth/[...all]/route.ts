import { getAuth } from "@/server/auth";

export const runtime = "nodejs";

async function handler(request: Request) {
  return getAuth().handler(request);
}

export const GET = handler;
export const POST = handler;
