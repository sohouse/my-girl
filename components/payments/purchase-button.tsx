"use client";

import { useState } from "react";

export function PurchaseButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);

    try {
      const response = await fetch("/api/payments/creem/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          customerEmail: undefined,
          orderId: `order_${Date.now()}`
        })
      });

      if (!response.ok) {
        throw new Error("Failed to start checkout");
      }

      const data = (await response.json()) as { checkoutUrl?: string | null };

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      className="inline-flex items-center justify-center gap-2 rounded-full bg-[#fff7ec] px-5 py-3 text-sm font-medium text-[#1d1917] transition-colors hover:bg-[#f2dcc5] disabled:cursor-not-allowed disabled:opacity-70"
      disabled={loading}
      onClick={handleClick}
      type="button"
    >
      {loading ? "正在跳转..." : "立即购买"}
    </button>
  );
}
