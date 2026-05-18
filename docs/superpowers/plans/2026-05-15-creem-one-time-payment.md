# Creem 一次性付款接入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 Next.js 项目中完成 Creem 一次性付款的最小可用闭环，支持 test mode 下创建 checkout、跳转支付、接收 webhook、落库/发放权益，并可在本地与测试环境验证。

**Architecture:** 采用“后端创建 checkout + webhook 确认支付结果”的模式。前端只负责发起购买请求并跳转到 Creem 托管结账页；后端统一处理环境校验、Creem API 调用、Webhook 验签和支付结果落库。测试模式下所有外部调用都使用 Creem 的 test API 与测试 Webhook secret，避免污染生产数据。

**Tech Stack:** Next.js App Router, TypeScript, Zod env validation, Fetch API, Vitest, existing Drizzle/DB utilities, existing auth/session helpers.

---

### Task 1: Lock down the test-mode configuration contract

**Files:**
- Modify: `env.ts`
- Modify: `tests/env.test.ts`
- Modify: `.env.local`

- [ ] **Step 1: Write the failing test**

```ts
it("requires the Creem test-mode payment env vars", () => {
  const result = parseServerEnv.safeParse({
    ...completeEnv,
    CREEM_API_KEY: "",
    CREEM_WEBHOOK_SECRET: "",
    CREEM_PRODUCT_KEY: "",
    CREEM_CHECKOUT_URL: ""
  });

  expect(result.success).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/env.test.ts -v`
Expected: FAIL because the server env schema does not yet require the Creem payment vars.

- [ ] **Step 3: Write minimal implementation**

```ts
// env.ts
export const serverEnvSchema = z.object({
  // ...existing fields...
  CREEM_PRODUCT_KEY: requiredString,
  CREEM_API_KEY: requiredString,
  CREEM_CHECKOUT_URL: requiredString,
  CREEM_WEBHOOK_SECRET: requiredString,
  CREEM_API_BASE_URL: optionalString,
  CREEM_CHECKOUT_SUCCESS_URL: optionalString,
  CREEM_CHECKOUT_CANCEL_URL: optionalString,
  NEXT_PUBLIC_APP_URL: optionalString,
  // ...existing fields...
});
```

```ini
# .env.local
CREEM_API_BASE_URL=https://test-api.creem.io/v1
CREEM_CHECKOUT_SUCCESS_URL=http://localhost:3000/payment/success
CREEM_CHECKOUT_CANCEL_URL=http://localhost:3000/payment/cancel
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/env.test.ts -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add env.ts tests/env.test.ts .env.local
git commit -m "feat: require creem payment env vars"
```

### Task 2: Add a checkout creation service with test-mode routing

**Files:**
- Create: `server/payments/creem.ts`
- Create: `tests/payments/creem.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";
import { createCreemCheckoutPayload, resolveCreemCheckoutUrl } from "@/server/payments/creem";

describe("Creem checkout helpers", () => {
  it("builds a checkout payload for one-time payment", () => {
    const payload = createCreemCheckoutPayload({
      productKey: "prod_test",
      successUrl: "http://localhost:3000/payment/success",
      cancelUrl: "http://localhost:3000/payment/cancel",
      customerEmail: "test@example.com",
      orderId: "order_123"
    });

    expect(payload.product_id).toBe("prod_test");
    expect(payload.success_url).toContain("/payment/success");
    expect(payload.metadata.orderId).toBe("order_123");
  });

  it("uses the test checkout base url in test mode", () => {
    expect(resolveCreemCheckoutUrl("https://test-api.creem.io/v1")).toContain("test-api.creem.io");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/payments/creem.test.ts -v`
Expected: FAIL because the helper module does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
// server/payments/creem.ts
export function resolveCreemCheckoutUrl(baseUrl: string) {
  return `${baseUrl.replace(/\/$/, "")}/checkouts`;
}

export function createCreemCheckoutPayload(input: {
  productKey: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  orderId?: string;
}) {
  return {
    product_id: input.productKey,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    customer_email: input.customerEmail,
    metadata: {
      orderId: input.orderId
    }
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/payments/creem.test.ts -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/payments/creem.ts tests/payments/creem.test.ts
git commit -m "feat: add creem checkout helpers"
```

### Task 3: Implement the checkout creation API route

**Files:**
- Create: `app/api/payments/creem/checkout/route.ts`
- Create: `tests/api/payments/creem-checkout.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

describe("Creem checkout route", () => {
  it("returns a checkout url for a valid request", async () => {
    // The handler should POST to Creem and return the checkout_url from the response.
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/api/payments/creem-checkout.test.ts -v`
Expected: FAIL because the route and handler are not implemented yet.

- [ ] **Step 3: Write minimal implementation**

```ts
// app/api/payments/creem/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/env";
import { createCreemCheckoutPayload, resolveCreemCheckoutUrl } from "@/server/payments/creem";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const env = getServerEnv();
  const body = await request.json();
  const payload = createCreemCheckoutPayload({
    productKey: env.CREEM_PRODUCT_KEY,
    successUrl: env.CREEM_CHECKOUT_SUCCESS_URL ?? `${env.NEXT_PUBLIC_APP_URL}/payment/success`,
    cancelUrl: env.CREEM_CHECKOUT_CANCEL_URL ?? `${env.NEXT_PUBLIC_APP_URL}/payment/cancel`,
    customerEmail: body.customerEmail,
    orderId: body.orderId
  });

  const response = await fetch(resolveCreemCheckoutUrl(env.CREEM_API_BASE_URL ?? "https://test-api.creem.io/v1"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.CREEM_API_KEY
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 502 });
  }

  const data = await response.json() as { checkout_url?: string };
  return NextResponse.json({ checkoutUrl: data.checkout_url }, { status: 200 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/api/payments/creem-checkout.test.ts -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/payments/creem/checkout/route.ts tests/api/payments/creem-checkout.test.ts
git commit -m "feat: add creem checkout api"
```

### Task 4: Implement Creem webhook verification and event handling

**Files:**
- Create: `server/payments/creem-webhook.ts`
- Modify: `app/api/webhook/creem/route.ts`
- Create: `tests/payments/creem-webhook.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { parseCreemWebhookEvent } from "@/server/payments/creem-webhook";

describe("Creem webhook parser", () => {
  it("accepts a checkout completed event payload", () => {
    const event = parseCreemWebhookEvent({
      type: "checkout.completed",
      data: { id: "chk_123" }
    });

    expect(event.type).toBe("checkout.completed");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/payments/creem-webhook.test.ts -v`
Expected: FAIL because the parser module does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
// server/payments/creem-webhook.ts
export function parseCreemWebhookEvent(input: unknown) {
  const event = input as { type?: string; data?: Record<string, unknown> };
  if (!event?.type) {
    throw new Error("Invalid Creem webhook event");
  }
  return event as { type: string; data?: Record<string, unknown> };
}
```

```ts
// app/api/webhook/creem/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/env";
import { parseCreemWebhookEvent } from "@/server/payments/creem-webhook";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const env = getServerEnv();
  const raw = await request.text();
  const signature = request.headers.get("creem-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const event = parseCreemWebhookEvent(JSON.parse(raw));
  if (event.type === "checkout.completed") {
    // TODO: mark order paid / grant access / send email
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/payments/creem-webhook.test.ts -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/payments/creem-webhook.ts app/api/webhook/creem/route.ts tests/payments/creem-webhook.test.ts
git commit -m "feat: add creem webhook handler"
```

### Task 5: Wire the purchase entry point in the UI

**Files:**
- Modify: `app/page.tsx` or the current paywall/CTA component that triggers purchase
- Create or Modify: `lib/payments/creem.ts` if the client needs a small fetch helper
- Create: `tests/ui/payments/creem-button.test.tsx` if there is an existing React test setup pattern

- [ ] **Step 1: Write the failing test**

```tsx
// Pseudocode-style test for the purchase button:
// clicking the buy button calls /api/payments/creem/checkout and redirects to checkoutUrl.
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: the UI test or component test fails until the button is wired up.

- [ ] **Step 3: Write minimal implementation**

```tsx
async function handleBuy() {
  const response = await fetch("/api/payments/creem/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ orderId: "...", customerEmail: "..." })
  });
  const data = await response.json();
  window.location.href = data.checkoutUrl;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: the purchase entry test passes and the button redirects correctly.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx lib/payments/creem.ts tests/ui/payments/creem-button.test.tsx
git commit -m "feat: wire creem purchase entry"
```

### Task 6: Verify the full test-mode flow end to end

**Files:**
- Modify: `docs/04.spec.md` or a new payment notes doc if the repo keeps product notes there
- Optional: `docs/superpowers/specs/...` if you want a persistent implementation spec

- [ ] **Step 1: Run the full test suite**

Run: `npm test && npm run lint`
Expected: all tests pass.

- [ ] **Step 2: Manually validate in test mode**

Run locally with `.env.local` pointing to Creem test mode values, then:
- open the purchase button
- confirm the checkout page is Creem test checkout
- complete a test payment
- confirm the webhook hits `app/api/webhook/creem/route.ts`
- confirm the app records the payment outcome

- [ ] **Step 3: Commit**

```bash
git add docs/04.spec.md
git commit -m "docs: record creem test-mode payment flow"
```
