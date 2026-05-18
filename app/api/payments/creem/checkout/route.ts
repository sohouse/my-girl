import { NextRequest, NextResponse } from "next/server";
import { createCreemCheckoutPayload, resolveCreemCheckoutUrl } from "@/server/payments/creem";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const productKey = process.env.CREEM_PRODUCT_KEY;
  const apiKey = process.env.CREEM_API_KEY;
  const apiBaseUrl = process.env.CREEM_API_BASE_URL ?? "https://test-api.creem.io/v1";
  const successUrl =
    process.env.CREEM_CHECKOUT_SUCCESS_URL ?? `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/payment/success`;

  if (!productKey || !apiKey) {
    return NextResponse.json({ error: "Missing Creem payment configuration" }, { status: 500 });
  }

  const body = await request.json() as {
    customerEmail?: string;
    orderId?: string;
  };

  const response = await fetch(resolveCreemCheckoutUrl(apiBaseUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey
    },
    body: JSON.stringify(
      createCreemCheckoutPayload({
        productKey,
        successUrl,
        customerEmail: body.customerEmail,
        orderId: body.orderId
      })
    )
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: "Failed to create checkout", detail: errorText },
      { status: 502 }
    );
  }

  const data = (await response.json()) as { checkout_url?: string };

  return NextResponse.json({ checkoutUrl: data.checkout_url ?? null });
}
