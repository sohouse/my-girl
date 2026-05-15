export type RateLimitStore = Map<string, RateLimitEntry>;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitInput = {
  key: string;
  action: string;
  limit: number;
  windowMs: number;
  now?: Date;
};

export function createMemoryRateLimitStore(): RateLimitStore {
  return new Map();
}

export function checkRateLimit(store: RateLimitStore, input: RateLimitInput) {
  const nowMs = (input.now ?? new Date()).getTime();
  const storeKey = `${input.action}:${input.key}`;
  const current = store.get(storeKey);

  if (!current || current.resetAt <= nowMs) {
    store.set(storeKey, {
      count: 1,
      resetAt: nowMs + input.windowMs
    });

    return { allowed: true, remaining: input.limit - 1 };
  }

  if (current.count >= input.limit) {
    return { allowed: false, remaining: 0 };
  }

  current.count += 1;

  return { allowed: true, remaining: input.limit - current.count };
}

export function getRateLimitKey(input: { userId?: string; headers: Headers }) {
  if (input.userId) {
    return `user:${input.userId}`;
  }

  const forwardedFor = input.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = input.headers.get("x-real-ip")?.trim();

  return `ip:${forwardedFor || realIp || "unknown"}`;
}
