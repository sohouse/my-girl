import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/env";
import { parseCreemWebhookEvent, verifyCreemWebhookSignature } from "@/server/payments/creem-webhook";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const env = getServerEnv();
  const rawBody = await request.text();
  const signature = request.headers.get("creem-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  if (!verifyCreemWebhookSignature({ rawBody, secret: env.CREEM_WEBHOOK_SECRET, signature })) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = parseCreemWebhookEvent(JSON.parse(rawBody));

  if (event.type === "checkout.completed") {
    // Payment completed successfully.
  }

  return NextResponse.json({ ok: true });
}
