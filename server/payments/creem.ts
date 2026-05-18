export type CreemCheckoutPayload = {
  product_id: string;
  success_url: string;
  customer_email?: string;
  metadata?: {
    orderId?: string;
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
}): CreemCheckoutPayload {
  return {
    product_id: input.productKey,
    success_url: input.successUrl,
    customer_email: input.customerEmail,
    metadata: input.orderId ? { orderId: input.orderId } : undefined
  };
}
