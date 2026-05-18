import { Hono, type Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { handle } from "hono/vercel";
import { z } from "zod";
import { getServerEnv } from "@/env";
import { generateChatImage } from "@/server/ai/image";
import { extractCharacterMemories, generateCharacterReply, generateShareDecoration } from "@/server/ai/minimax";
import { buildVoicePromptText, generateVoiceAudio } from "@/server/ai/voice";
import {
  canUserUseCharacter,
  createCustomCharacter,
  createPresetCharacter,
  deleteCustomCharacter,
  getBaseImageReferenceEnabled,
  listAdminPresetCharacters,
  listPresetCharacters,
  setBaseImageReferenceEnabled,
  updatePresetCharacter,
  updatePresetCharacterEnabled
} from "@/server/characters/service";
import {
  createOrReuseSession,
  getSessionForUser,
  listMessages,
  getMessageForSession,
  sendMessageToSession
} from "@/server/chat/service";
import { createShareCard as createShareCardImage } from "@/server/chat/share-card";
import { checkDatabase as defaultCheckDatabase } from "@/server/db/health";
import { getDb } from "@/server/db/client";
import { dispatchDueEmails } from "@/server/email/service";
import { getSessionUser } from "@/server/auth/session";
import { listAdminUsers, updateAdminUser } from "@/server/users/admin";
import { createCreemCheckoutPayload, resolveCreemCheckoutUrl } from "@/server/payments/creem";
import {
  checkRateLimit,
  createMemoryRateLimitStore,
  getRateLimitKey,
  type RateLimitStore
} from "@/server/security/rate-limit";
import { getClientIp, verifyTurnstileToken } from "@/server/security/turnstile";
import { saveUploadedFileToR2 } from "@/server/storage/r2";
import type { SavedFile } from "@/server/storage/types";

type ApiDependencies = {
  checkDatabase?: () => Promise<{ ok: boolean }>;
  db?: ReturnType<typeof getDb>;
  getUser?: (headers: Headers) => Promise<{ id: string; role?: string | null } | null>;
  generateReply?: typeof generateCharacterReply;
  extractMemories?: typeof extractCharacterMemories;
  generateImage?: typeof generateChatImage;
  generateShareDecoration?: typeof generateShareDecoration;
  generateVoice?: typeof generateVoiceAudio;
  saveFile?: (input: { userId: string; scene: "custom-character-avatar"; file: File }) => Promise<SavedFile>;
  deleteObjects?: (keys: string[]) => Promise<{ deletedKeys: string[]; failedKeys: string[] }>;
  dispatchEmails?: () => Promise<{ scannedCount: number; sentCount: number; skippedCount: number; failedCount: number }>;
  verifyTurnstile?: (input: { token: string; remoteIp?: string }) => Promise<void>;
  rateLimitStore?: RateLimitStore;
  now?: () => Date;
  cronSecret?: string;
  appBaseUrl?: string;
  r2PublicUrl?: string;
};

type ApiUser = {
  id: string;
  role?: string | null;
};

type RateLimitedAction =
  | "custom-character-create"
  | "custom-character-delete"
  | "chat-session-create"
  | "chat-message-send"
  | "voice-generate"
  | "share-card-create"
  | "email-dispatch";

const createSessionSchema = z.object({
  characterId: z.uuid()
});

const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(2000)
});

const createShareCardSchema = z.object({
  messageIds: z.array(z.uuid()).min(1).max(10)
});

const uuidSchema = z.uuid();

const customCharacterSchema = z.object({
  name: z.string().trim().min(1).max(40),
  persona: z.string().trim().max(1200).optional(),
  background: z.string().trim().max(1200).optional(),
  speakingStyle: z.string().trim().max(800).optional(),
  catchphrases: z.string().trim().max(600).optional(),
  motivation: z.string().trim().max(1200).optional()
});

const presetCharacterSchema = z.object({
  slug: z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(1).max(40),
  title: z.string().trim().min(1).max(80),
  persona: z.string().trim().min(1).max(2000),
  background: z.string().trim().max(2000).optional().default(""),
  speakingStyle: z.string().trim().max(1200).optional().default(""),
  catchphrases: z.string().trim().max(1000).optional().default(""),
  motivation: z.string().trim().max(2000).optional().default(""),
  baseImageUrl: z.string().trim().min(1).max(1000),
  baseImageStorageKey: z.string().trim().max(1000).nullable().optional(),
  baseImageStorageProvider: z.enum(["local-public", "r2"]).optional().default("local-public"),
  allowBaseImageReference: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).max(100000),
  enabled: z.boolean().optional().default(true)
});

const presetEnabledSchema = z.object({
  enabled: z.boolean()
});

const baseImageReferenceEnabledSchema = z.object({
  enabled: z.boolean()
});

const adminUserSchema = z.object({
  name: z.string().trim().min(1).max(120),
  username: z.string().trim().min(1).max(80).nullable().optional(),
  displayUsername: z.string().trim().min(1).max(120).nullable().optional(),
  role: z.enum(["user", "admin"]),
  emailVerified: z.boolean()
});

const defaultRateLimitStore = createMemoryRateLimitStore();

const rateLimitRules: Record<RateLimitedAction, { limit: number; windowMs: number }> = {
  "custom-character-create": { limit: 10, windowMs: 10 * 60 * 1000 },
  "custom-character-delete": { limit: 20, windowMs: 10 * 60 * 1000 },
  "chat-session-create": { limit: 30, windowMs: 60 * 1000 },
  "chat-message-send": { limit: 10, windowMs: 60 * 1000 },
  "voice-generate": { limit: 5, windowMs: 60 * 1000 },
  "share-card-create": { limit: 10, windowMs: 60 * 1000 },
  "email-dispatch": { limit: 3, windowMs: 60 * 1000 }
};

export function createApi(dependencies: ApiDependencies = {}) {
  const checkDatabase = dependencies.checkDatabase ?? defaultCheckDatabase;
  const getDatabase = () => dependencies.db ?? getDb();
  const getUser = (dependencies.getUser ?? getSessionUser) as (headers: Headers) => Promise<ApiUser | null>;
  const generateReply = dependencies.generateReply ?? generateCharacterReply;
  const extractMemories = dependencies.extractMemories ?? extractCharacterMemories;
  const generateImage = dependencies.generateImage ?? generateChatImage;
  const decorateShare = dependencies.generateShareDecoration ?? generateShareDecoration;
  const generateVoice = dependencies.generateVoice ?? generateVoiceAudio;
  const saveFile = dependencies.saveFile ?? saveUploadedFileToR2;
  const rateLimitStore = dependencies.rateLimitStore ?? defaultRateLimitStore;
  const getNow = dependencies.now ?? (() => new Date());
  const verifyTurnstile =
    dependencies.verifyTurnstile ??
    ((input) =>
      verifyTurnstileToken({
        token: input.token,
        remoteIp: input.remoteIp,
        secretKey: getServerEnv().TURNSTILE_SECRET_KEY
      }));
  const getCronSecret = () => dependencies.cronSecret ?? getServerEnv().CRON_SECRET;
  const getAppBaseUrl = () => dependencies.appBaseUrl ?? getServerEnv().APP_BASE_URL ?? "https://my-girl.local";
  const getR2PublicUrl = () => dependencies.r2PublicUrl ?? getServerEnv().R2_PUBLIC_URL;
  const dispatchEmails =
    dependencies.dispatchEmails ??
    (() => {
      const db = getDatabase();

      return dispatchDueEmails(db);
    });
  const app = new Hono().basePath("/api");

  function enforceRateLimit(c: Context, action: RateLimitedAction, userId?: string) {
    const rule = rateLimitRules[action];
    const result = checkRateLimit(rateLimitStore, {
      key: getRateLimitKey({ userId, headers: c.req.raw.headers }),
      action,
      limit: rule.limit,
      windowMs: rule.windowMs,
      now: getNow()
    });

    if (!result.allowed) {
      return c.json({ error: "Too many requests" }, 429);
    }

    return null;
  }

  async function requireAdmin(c: Context) {
    const user = await getUser(c.req.raw.headers);

    if (!user) {
      return {
        response: c.json({ error: "Unauthorized" }, 401)
      };
    }

    if (user.role !== "admin") {
      return {
        response: c.json({ error: "Forbidden" }, 403)
      };
    }

    return { user };
  }

  app.get("/health", async (c) => {
    const database = await checkDatabase();
    const healthy = database.ok;

    return c.json(
      {
        app: "my-girl",
        status: healthy ? "ok" : "degraded",
        services: {
          api: "ok",
          database: healthy ? "ok" : "error"
        }
      },
      healthy ? 200 : 503
    );
  });

  app.get("/cron/email-dispatch", async (c) => {
    const authHeader = c.req.raw.headers.get("authorization");

    if (authHeader !== `Bearer ${getCronSecret()}`) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const limited = enforceRateLimit(c, "email-dispatch");

    if (limited) {
      return limited;
    }

    const result = await dispatchEmails();

    return c.json(result);
  });

  app.post("/cron/email-dispatch", async (c) => {
    const authHeader = c.req.raw.headers.get("authorization");

    if (authHeader !== `Bearer ${getCronSecret()}`) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const limited = enforceRateLimit(c, "email-dispatch");

    if (limited) {
      return limited;
    }

    const result = await dispatchEmails();

    return c.json(result);
  });

  app.post("/payments/creem/checkout", async (c) => {
    const user = await getUser(c.req.raw.headers);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const env = getServerEnv();
    const productKey = env.CREEM_PRODUCT_KEY;
    const apiKey = env.CREEM_API_KEY;
    const apiBaseUrl = env.CREEM_API_BASE_URL ?? "https://test-api.creem.io/v1";
    const successUrl = env.CREEM_CHECKOUT_SUCCESS_URL ?? `${getAppBaseUrl()}/payment/success`;

    if (!productKey || !apiKey) {
      return c.json({ error: "Missing Creem payment configuration" }, 500);
    }

    const body = await c.req.json() as {
      customerEmail?: string;
      orderId?: string;
    };

    const response = await fetch(resolveCreemCheckoutUrl(apiBaseUrl), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify(
        createCreemCheckoutPayload({
          productKey,
          successUrl,
          customerEmail: body.customerEmail,
          orderId: body.orderId,
          userId: user.id
        })
      )
    });

    if (!response.ok) {
      const errorText = await response.text();
      return c.json({ error: "Failed to create checkout", detail: errorText }, 502);
    }

    const data = (await response.json()) as { checkout_url?: string };

    return c.json({ checkoutUrl: data.checkout_url ?? null });
  });

  app.get("/characters", async (c) => {
    const db = getDatabase();
    const data = await listPresetCharacters(db);

    return c.json({ characters: data });
  });

  app.get("/admin/characters/presets", async (c) => {
    const admin = await requireAdmin(c);

    if ("response" in admin) {
      return admin.response;
    }

    const characters = await listAdminPresetCharacters(getDatabase());

    return c.json({ characters });
  });

  app.get("/admin/settings/base-image-reference", async (c) => {
    const admin = await requireAdmin(c);

    if ("response" in admin) {
      return admin.response;
    }

    const enabled = await getBaseImageReferenceEnabled(getDatabase());

    return c.json({ enabled });
  });

  app.patch("/admin/settings/base-image-reference", zValidator("json", baseImageReferenceEnabledSchema), async (c) => {
    const admin = await requireAdmin(c);

    if ("response" in admin) {
      return admin.response;
    }

    const updated = await setBaseImageReferenceEnabled(getDatabase(), c.req.valid("json").enabled);

    return c.json({ setting: updated });
  });

  app.get("/admin/users", async (c) => {
    const admin = await requireAdmin(c);

    if ("response" in admin) {
      return admin.response;
    }

    const users = await listAdminUsers(getDatabase());

    return c.json({ users });
  });

  app.patch("/admin/users/:userId", zValidator("json", adminUserSchema), async (c) => {
    const admin = await requireAdmin(c);

    if ("response" in admin) {
      return admin.response;
    }

    try {
      const updatedUser = await updateAdminUser(getDatabase(), {
        currentUserId: admin.user.id,
        targetUserId: c.req.param("userId"),
        input: c.req.valid("json")
      });

      return c.json({ user: updatedUser });
    } catch (error) {
      const message = error instanceof Error ? error.message : "User update failed";
      const status = message === "User not found" ? 404 : 400;

      return c.json({ error: message }, status);
    }
  });

  app.post("/admin/characters/presets", zValidator("json", presetCharacterSchema), async (c) => {
    const admin = await requireAdmin(c);

    if ("response" in admin) {
      return admin.response;
    }

    try {
      const character = await createPresetCharacter(getDatabase(), c.req.valid("json"));

      return c.json({ character });
    } catch {
      return c.json({ error: "Preset character creation failed" }, 400);
    }
  });

  app.patch("/admin/characters/presets/:characterId", zValidator("json", presetCharacterSchema), async (c) => {
    const admin = await requireAdmin(c);

    if ("response" in admin) {
      return admin.response;
    }

    const characterId = c.req.param("characterId");

    if (!uuidSchema.safeParse(characterId).success) {
      return c.json({ error: "Preset character not found" }, 404);
    }

    try {
      const character = await updatePresetCharacter(getDatabase(), characterId, c.req.valid("json"));

      return c.json({ character });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Preset character update failed";
      const status = message === "Preset character not found" ? 404 : 400;

      return c.json({ error: message }, status);
    }
  });

  app.patch(
    "/admin/characters/presets/:characterId/enabled",
    zValidator("json", presetEnabledSchema),
    async (c) => {
      const admin = await requireAdmin(c);

      if ("response" in admin) {
        return admin.response;
      }

      const characterId = c.req.param("characterId");

      if (!uuidSchema.safeParse(characterId).success) {
        return c.json({ error: "Preset character not found" }, 404);
      }

      try {
        const character = await updatePresetCharacterEnabled(
          getDatabase(),
          characterId,
          c.req.valid("json").enabled
        );

        return c.json({ character });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Preset character update failed";
        const status = message === "Preset character not found" ? 404 : 400;

        return c.json({ error: message }, status);
      }
    }
  );

  app.post("/characters/custom", async (c) => {
    const user = await getUser(c.req.raw.headers);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const limited = enforceRateLimit(c, "custom-character-create", user.id);

    if (limited) {
      return limited;
    }

    const formData = await c.req.formData();
    const baseImage = formData.get("baseImage");
    const turnstileToken = String(formData.get("turnstileToken") ?? "");

    try {
      await verifyTurnstile({
        token: turnstileToken,
        remoteIp: getClientIp(c.req.raw.headers)
      });
    } catch {
      return c.json({ error: "Turnstile verification failed" }, 403);
    }

    const parsed = customCharacterSchema.safeParse({
      name: formData.get("name"),
      persona: formData.get("persona") || undefined,
      background: formData.get("background") || undefined,
      speakingStyle: formData.get("speakingStyle") || undefined,
      catchphrases: formData.get("catchphrases") || undefined,
      motivation: formData.get("motivation") || undefined
    });

    if (!parsed.success) {
      return c.json({ error: "Invalid custom character input" }, 400);
    }

    const image =
      baseImage instanceof File && baseImage.size > 0
        ? await saveFile({
            userId: user.id,
            scene: "custom-character-avatar",
            file: baseImage
          })
        : undefined;
    const db = getDatabase();
    const character = await createCustomCharacter(db, {
      userId: user.id,
      ...parsed.data,
      image
    });

    return c.json({ character });
  });

  app.delete("/characters/custom/:characterId", async (c) => {
    const user = await getUser(c.req.raw.headers);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const limited = enforceRateLimit(c, "custom-character-delete", user.id);

    if (limited) {
      return limited;
    }

    const characterId = c.req.param("characterId");

    if (!uuidSchema.safeParse(characterId).success) {
      return c.json({ error: "Character not found" }, 404);
    }

    try {
      const result = await deleteCustomCharacter(getDatabase(), {
        userId: user.id,
        characterId,
        deleteObjects: dependencies.deleteObjects,
        publicUrl: getR2PublicUrl()
      });

      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Character deletion failed";
      const status = message === "Custom character not found" ? 404 : 400;

      return c.json({ error: message }, status);
    }
  });

  app.post("/chat/sessions", zValidator("json", createSessionSchema), async (c) => {
    const user = await getUser(c.req.raw.headers);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const limited = enforceRateLimit(c, "chat-session-create", user.id);

    if (limited) {
      return limited;
    }

    const db = getDatabase();
    const body = c.req.valid("json");
    const canUseCharacter = await canUserUseCharacter(db, user.id, body.characterId);

    if (!canUseCharacter) {
      return c.json({ error: "Character not found" }, 404);
    }

    const session = await createOrReuseSession(db, {
      userId: user.id,
      characterId: body.characterId
    });

    return c.json({ session });
  });

  app.get("/chat/sessions/:sessionId", async (c) => {
    const user = await getUser(c.req.raw.headers);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const db = getDatabase();
    const chatSession = await getSessionForUser(db, c.req.param("sessionId"), user.id);

    if (!chatSession) {
      return c.json({ error: "Not found" }, 404);
    }

    const messages = await listMessages(db, c.req.param("sessionId"));

    return c.json({
      session: chatSession,
      messages
    });
  });

  app.post(
    "/chat/sessions/:sessionId/messages",
    zValidator("json", sendMessageSchema),
    async (c) => {
      const user = await getUser(c.req.raw.headers);

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const limited = enforceRateLimit(c, "chat-message-send", user.id);

      if (limited) {
        return limited;
      }

      const db = getDatabase();
      const body = c.req.valid("json");
      const result = await sendMessageToSession(db, {
        userId: user.id,
        sessionId: c.req.param("sessionId"),
        content: body.content,
        generateReply,
        extractMemories,
        generateImage: (imageInput) => generateImage({ userId: user.id, ...imageInput })
      });

      return c.json(result);
    }
  );

  app.post(
    "/chat/sessions/:sessionId/share-card",
    zValidator("json", createShareCardSchema),
    async (c) => {
      const user = await getUser(c.req.raw.headers);

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const limited = enforceRateLimit(c, "share-card-create", user.id);

      if (limited) {
        return limited;
      }

      const db = getDatabase();
      const body = c.req.valid("json");

      try {
        const card = await createShareCardImage(db, {
          userId: user.id,
          sessionId: c.req.param("sessionId"),
          messageIds: body.messageIds,
          siteUrl: getAppBaseUrl(),
          generateDecoration: decorateShare
        });

        return new Response(card.svg, {
          headers: {
            "Content-Type": card.contentType,
            "Content-Disposition": `attachment; filename="${card.filename}"`,
            "Cache-Control": "no-store"
          }
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Share card generation failed";
        const status = message === "Chat session not found" ? 404 : 400;

        return c.json({ error: message }, status);
      }
    }
  );

  app.post("/chat/sessions/:sessionId/messages/:messageId/voice", async (c) => {
    const user = await getUser(c.req.raw.headers);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const limited = enforceRateLimit(c, "voice-generate", user.id);

    if (limited) {
      return limited;
    }

    const db = getDatabase();
    const session = (await getSessionForUser(db, c.req.param("sessionId"), user.id)) as
      | {
          character?: {
            name: string;
            speakingStyle: string;
            catchphrases: string;
          };
        }
      | null
      | undefined;

    if (!session?.character) {
      return c.json({ error: "Not found" }, 404);
    }

    const messageId = c.req.param("messageId");

    if (!uuidSchema.safeParse(messageId).success) {
      return c.json({ error: "Message not found" }, 404);
    }

    const message = await getMessageForSession(db, c.req.param("sessionId"), messageId);

    if (!message) {
      return c.json({ error: "Message not found" }, 404);
    }

    if (message.role !== "assistant") {
      return c.json({ error: "Only assistant messages can be voiced" }, 400);
    }

    const recentMessages = await listMessages(db, c.req.param("sessionId"));
    const promptText = buildVoicePromptText({
      reply: message.content,
      character: session.character,
      recentMessages
    });
    const audio = await generateVoice(promptText);
    const audioBody = new ArrayBuffer(audio.byteLength);

    new Uint8Array(audioBody).set(audio);

    return new Response(audioBody, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store"
      }
    });
  });

  return app;
}

export const api = createApi();
export const routeHandler = handle(api);
