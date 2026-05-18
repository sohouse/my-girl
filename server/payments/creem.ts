export type CreemCheckoutPayload = {
  product_id: string;
  success_url: string;
  customer_email?: string;
  metadata?: {
    orderId?: string;
    userId?: string;
  };
};

export function resolveCreemCheckoutUrl(baseUrl: string) {
  return `${baseUrl.replace(/\/$/, "")}/checkouts`;
}

export function createCreemCheckoutPayload(input: {
  productKey: string;
  successUrl: string;
  customerEmail?: string;
  orderId?: string;
  userId?: string;
}): CreemCheckoutPayload {
  return {
    product_id: input.productKey,
    success_url: input.successUrl,
    customer_email: input.customerEmail,
    metadata: input.orderId || input.userId ? { orderId: input.orderId, userId: input.userId } : undefined
  };
}
