type VerifyTurnstileInput = {
  token: string;
  secretKey: string;
  remoteIp?: string;
  fetchImpl?: typeof fetch;
};

const turnstileVerifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken({
  token,
  secretKey,
  remoteIp,
  fetchImpl = fetch
}: VerifyTurnstileInput) {
  if (!token) {
    throw new Error("Turnstile verification failed");
  }

  const body: Record<string, string> = {
    secret: secretKey,
    response: token
  };

  if (remoteIp) {
    body.remoteip = remoteIp;
  }

  const response = await fetchImpl(turnstileVerifyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error("Turnstile verification failed");
  }

  const payload = (await response.json()) as { success?: unknown };

  if (payload.success !== true) {
    throw new Error("Turnstile verification failed");
  }
}

export function getClientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim() || undefined;
}
