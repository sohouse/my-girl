import { createHmac, timingSafeEqual } from "node:crypto";

export type CreemWebhookEvent = {
  id: string;
  eventType: string;
  created_at?: number;
  object: Record<string, unknown>;
};

export function parseCreemWebhookEvent(input: unknown): CreemWebhookEvent {
  if (!input || typeof input !== "object") {
    throw new Error("Invalid Creem webhook event");
  }

  const event = input as CreemWebhookEvent;

  if (typeof event.id !== "string" || event.id.trim().length === 0) {
    throw new Error("Invalid Creem webhook event");
  }

  if (typeof event.eventType !== "string" || event.eventType.trim().length === 0) {
    throw new Error("Invalid Creem webhook event");
  }

  if (!event.object || typeof event.object !== "object") {
    throw new Error("Invalid Creem webhook event");
  }

  return event;
}

export function verifyCreemWebhookSignature(input: {
  rawBody: string;
  secret: string;
  signature: string;
}) {
  const expected = createHmac("sha256", input.secret).update(input.rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const signatureBuffer = Buffer.from(input.signature, "utf8");

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, signatureBuffer);
}
