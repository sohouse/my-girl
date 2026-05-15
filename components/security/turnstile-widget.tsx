"use client";

import { useEffect, useRef, useState } from "react";
import { getTurnstileSiteKey } from "@/lib/public-env";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

type TurnstileWidgetProps = {
  onTokenChange: (token: string) => void;
};

export function TurnstileWidget({ onTokenChange }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [siteKey] = useState(() => getTurnstileSiteKey());

  useEffect(() => {
    if (!siteKey || !containerRef.current) {
      return;
    }

    const renderWidget = () => {
      if (!containerRef.current || widgetIdRef.current || !window.turnstile) {
        return;
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: onTokenChange,
        "expired-callback": () => onTokenChange(""),
        "error-callback": () => onTokenChange("")
      });
    };

    if (window.turnstile) {
      renderWidget();
      return;
    }

    const script = document.createElement("script");

    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    script.onload = renderWidget;
    document.head.appendChild(script);
  }, [onTokenChange, siteKey]);

  if (!siteKey) {
    return null;
  }

  return <div ref={containerRef} className="min-h-[65px]" />;
}
