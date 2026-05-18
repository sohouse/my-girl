import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/env";
import { parseCreemWebhookEvent, verifyCreemWebhookSignature } from "@/server/payments/creem-webhook";
import { findUserById, setUserMembership } from "@/server/membership/service";
import { getDb } from "@/server/db/client";
import type { MembershipType } from "@/lib/membership-status";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const env = getServerEnv();
  const db = getDb();
  const rawBody = await request.text();
  const signature = request.headers.get("creem-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  if (!verifyCreemWebhookSignature({ rawBody, secret: env.CREEM_WEBHOOK_SECRET, signature })) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = parseCreemWebhookEvent(JSON.parse(rawBody));

  if (event.eventType === "checkout.completed") {
    const checkout = event.object as {
      customer_id?: string;
      customerId?: string;
      product_id?: string;
      productId?: string;
      metadata?: {
        userId?: string;
      };
    };

    const customerId = checkout.customer_id ?? checkout.customerId;
    const userId = checkout.metadata?.userId ?? customerId;
    const productId = checkout.product_id ?? checkout.productId;

    if (userId) {
      const existingUser = await findUserById(db, userId);

      if (existingUser) {
        const membershipType: MembershipType = productId?.includes("sub") ? "subscription_member" : "permanent_member";
        const membershipExpiresAt = membershipType === "subscription_member"
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          : null;

        await setUserMembership(db, {
          userId: existingUser.id,
          membershipType,
          membershipExpiresAt
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
