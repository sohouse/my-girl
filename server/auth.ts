import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { captcha, username } from "better-auth/plugins";
import { getDb } from "@/server/db/client";
import * as schema from "@/server/db/schema";

function createAuth() {
  const googleClientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";

  if (!googleClientId || !googleClientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required for Google auth.");
  }

  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false
    },
    socialProviders: {
      google: {
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        redirectURI: "http://localhost:3000/api/auth/callback/google"
      }
    },
    plugins: [
      captcha({
        provider: "cloudflare-turnstile",
        secretKey: process.env.TURNSTILE_SECRET_KEY ?? "",
        endpoints: ["/sign-up/email", "/sign-in/email", "/sign-in/username"]
      }),
      username({
        minUsernameLength: 3,
        maxUsernameLength: 30
      })
    ]
  });
}

let auth: ReturnType<typeof createAuth> | null = null;

export function getAuth() {
  if (!auth) {
    const nextAuth = createAuth();

    auth = nextAuth;
    return nextAuth;
  }

  return auth;
}
