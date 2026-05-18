import { z } from "zod";

const requiredString = z.string().trim().min(1);
const optionalString = z.string().trim().optional();

export const serverEnvSchema = z.object({
  APP_BASE_URL: optionalString,
  RESEND_API_KEY: requiredString,
  RESEND_FROM_EMAIL: requiredString,
  CRON_SECRET: requiredString,
  ARK_BASE_URL: requiredString,
  ARK_SEEDREAM_MODEL: requiredString,
  ARK_IMAGE_GENERATOR_URL: requiredString,
  ARK_API_KEY: requiredString,
  CREEM_MODERATION_URL: optionalString,
  CREEM_MODERATION_API_KEY: optionalString,
  CREEM_MODERATION_PROVIDER: optionalString,
  CREEM_PRODUCT_KEY: requiredString,
  CREEM_API_KEY: requiredString,
  CREEM_CHECKOUT_URL: requiredString,
  CREEM_WEBHOOK_SECRET: requiredString,
  CREEM_API_BASE_URL: optionalString,
  CREEM_CHECKOUT_SUCCESS_URL: optionalString,
  CREEM_CHECKOUT_CANCEL_URL: optionalString,
  ARK_VOICE_GENERATOR_URL: requiredString,
  ARK_VOICE_API_KEY: requiredString,
  ARK_VOICE_APP_ID: requiredString,
  ARK_VOICE_RESOURCE_ID: optionalString,
  ARK_VOICE_SPEAKER: optionalString,
  REQUIRE_AUTH_TO_USE: z.enum(["true", "false"]).default("true"),
  AUTH_ADAPTER_MODE: requiredString,
  DATABASE_URL: requiredString,
  DIRECT_URL: requiredString,
  NEON_AUTH_BASE_URL: optionalString,
  NEON_AUTH_COOKIE_SECRET: optionalString,
  NEON_DATA_API_URL: optionalString,
  MINIMAX_TEXT_GENERATOR_URL: requiredString,
  MINIMAX_API_KEY: requiredString,
  TURNSTILE_SECRET_KEY: requiredString,
  R2_ACCESS_KEY_ID: requiredString,
  R2_SECRET_ACCESS_KEY: requiredString,
  R2_ENDPOINT: requiredString,
  R2_BUCKET_NAME: requiredString,
  R2_PUBLIC_URL: requiredString,
  BETTER_AUTH_SECRET: optionalString,
  BETTER_AUTH_URL: optionalString
});

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: requiredString
});

export const parseServerEnv = Object.assign(
  (input: NodeJS.ProcessEnv | Record<string, unknown>) => serverEnvSchema.parse(input),
  {
    safeParse: (input: NodeJS.ProcessEnv | Record<string, unknown>) =>
      serverEnvSchema.safeParse(input)
  }
);

export const parsePublicEnv = Object.assign(
  (input: NodeJS.ProcessEnv | Record<string, unknown>) => publicEnvSchema.parse(input),
  {
    safeParse: (input: NodeJS.ProcessEnv | Record<string, unknown>) =>
      publicEnvSchema.safeParse(input)
  }
);

export function getServerEnv() {
  return parseServerEnv(process.env);
}

export function getPublicEnv() {
  return parsePublicEnv(process.env);
}
