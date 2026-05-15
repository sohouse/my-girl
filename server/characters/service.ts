import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import { getServerEnv } from "@/env";
import { getDb } from "@/server/db/client";
import { characters, chatMessages, chatSessions, siteSettings } from "@/server/db/schema";
import { presetCharacters } from "./presets";
import type { SavedFile } from "@/server/storage/types";
import { deleteR2Objects } from "@/server/storage/r2";

const DEFAULT_CUSTOM_CHARACTER_IMAGE_URL = "/destine1.jpg";

type CharacterDb = {
  query: {
    characters: {
      findFirst: (args?: never) => Promise<unknown>;
      findMany?: (args?: never) => Promise<unknown[]>;
    };
    siteSettings?: {
      findFirst: (args?: never) => Promise<unknown>;
    };
  };
  insert: (table: unknown) => {
    values: (value: Record<string, unknown>) => {
      onConflictDoNothing: (config?: unknown) => {
        returning: () => Promise<unknown[]>;
      };
      onConflictDoUpdate?: (config: { target: unknown; set: Record<string, unknown> }) => {
        returning: () => Promise<unknown[]>;
      };
    };
  };
};

function toCharacterDb(db: unknown) {
  return db as CharacterDb;
}

export async function seedPresetCharacters(db = getDb() as unknown) {
  const ops = toCharacterDb(db);
  const seeded = [];

  for (const preset of presetCharacters) {
    const existing = await ops.query.characters.findFirst({
      where: eq(characters.slug, preset.slug)
    } as never);

    if (existing) {
      seeded.push(existing);
      continue;
    }

    const [created] = await ops
      .insert(characters)
      .values({
        ...preset,
        kind: "preset",
        ownerUserId: null,
        catchphrases: preset.catchphrases.join("\n")
      })
      .onConflictDoNothing({
        target: characters.slug
      })
      .returning();

    const character =
      created ??
      (await ops.query.characters.findFirst({
        where: eq(characters.slug, preset.slug)
      } as never));

    if (character) {
      seeded.push(character);
    }
  }

  return seeded;
}

export async function listPresetCharacters(db = getDb()) {
  await seedPresetCharacters(db);

  return db.query.characters.findMany({
    where: and(eq(characters.kind, "preset"), eq(characters.enabled, true)),
    orderBy: asc(characters.sortOrder)
  });
}

export async function listEnabledPresetCharacters(db = getDb()) {
  return db.query.characters.findMany({
    where: and(eq(characters.kind, "preset"), eq(characters.enabled, true)),
    orderBy: asc(characters.sortOrder)
  });
}

export async function listAdminPresetCharacters(db = getDb()) {
  await seedPresetCharacters(db);

  return db.query.characters.findMany({
    where: eq(characters.kind, "preset"),
    orderBy: asc(characters.sortOrder)
  });
}

type PresetCharacterInput = {
  slug: string;
  name: string;
  title: string;
  persona: string;
  background?: string;
  speakingStyle?: string;
  catchphrases?: string;
  motivation?: string;
  baseImageUrl: string;
  baseImageStorageKey?: string | null;
  baseImageStorageProvider?: string;
  allowBaseImageReference?: boolean;
  sortOrder: number;
  enabled?: boolean;
};

const IMAGE_REFERENCE_SETTING_KEY = "allow_base_image_reference";

export async function createPresetCharacter(db = getDb() as unknown, input: PresetCharacterInput) {
  const ops = db as {
    insert: (table: unknown) => {
      values: (value: Record<string, unknown>) => {
        returning: () => Promise<unknown[]>;
      };
    };
  };
  const [created] = await ops
    .insert(characters)
    .values({
      slug: input.slug,
      kind: "preset",
      ownerUserId: null,
      name: input.name,
      title: input.title,
      persona: input.persona,
      background: input.background ?? "",
      speakingStyle: input.speakingStyle ?? "",
      catchphrases: input.catchphrases ?? "",
      motivation: input.motivation ?? "",
      baseImageUrl: input.baseImageUrl,
      baseImageStorageKey: input.baseImageStorageKey ?? null,
      baseImageStorageProvider: input.baseImageStorageProvider ?? "local-public",
      allowBaseImageReference: input.allowBaseImageReference ?? true,
      sortOrder: input.sortOrder,
      enabled: input.enabled ?? true
    })
    .returning();

  return created;
}

export async function updatePresetCharacter(db = getDb() as unknown, characterId: string, input: PresetCharacterInput) {
  const ops = db as {
    query: {
      characters: {
        findFirst: (args?: never) => Promise<unknown>;
      };
    };
    update: (table: unknown) => {
      set: (value: Record<string, unknown>) => {
        where: (condition: unknown) => Promise<unknown[]>;
      };
    };
  };
  const existing = (await ops.query.characters.findFirst({
    where: and(eq(characters.id, characterId), eq(characters.kind, "preset"))
  } as never)) as { id: string; kind: string } | null | undefined;

  if (!existing || existing.kind !== "preset") {
    throw new Error("Preset character not found");
  }

  const [updated] = await ops
    .update(characters)
    .set({
      slug: input.slug,
      name: input.name,
      title: input.title,
      persona: input.persona,
      background: input.background ?? "",
      speakingStyle: input.speakingStyle ?? "",
      catchphrases: input.catchphrases ?? "",
      motivation: input.motivation ?? "",
      baseImageUrl: input.baseImageUrl,
      baseImageStorageKey: input.baseImageStorageKey ?? null,
      baseImageStorageProvider: input.baseImageStorageProvider ?? "local-public",
      allowBaseImageReference: input.allowBaseImageReference ?? true,
      sortOrder: input.sortOrder,
      enabled: input.enabled ?? true,
      updatedAt: new Date()
    })
    .where(and(eq(characters.id, characterId), eq(characters.kind, "preset")));

  return updated;
}

export async function updatePresetCharacterEnabled(db = getDb() as unknown, characterId: string, enabled: boolean) {
  const ops = db as {
    query: {
      characters: {
        findFirst: (args?: never) => Promise<unknown>;
      };
    };
    update: (table: unknown) => {
      set: (value: Record<string, unknown>) => {
        where: (condition: unknown) => Promise<unknown[]>;
      };
    };
  };
  const existing = (await ops.query.characters.findFirst({
    where: and(eq(characters.id, characterId), eq(characters.kind, "preset"))
  } as never)) as { id: string; kind: string } | null | undefined;

  if (!existing || existing.kind !== "preset") {
    throw new Error("Preset character not found");
  }

  const [updated] = await ops
    .update(characters)
    .set({
      enabled,
      updatedAt: new Date()
    })
    .where(and(eq(characters.id, characterId), eq(characters.kind, "preset")));

  return updated;
}

export async function getBaseImageReferenceEnabled(db = getDb() as unknown) {
  const ops = db as {
    query: {
      siteSettings: {
        findFirst: (args?: never) => Promise<{ key: string; value: boolean } | null | undefined>;
      };
    };
  };
  const row = await ops.query.siteSettings.findFirst({
    where: eq(siteSettings.key, IMAGE_REFERENCE_SETTING_KEY)
  } as never);

  return row?.value ?? false;
}

export async function setBaseImageReferenceEnabled(db = getDb() as unknown, enabled: boolean) {
  const ops = db as {
    insert: (table: unknown) => {
      values: (value: Record<string, unknown>) => {
        onConflictDoUpdate: (config: { target: unknown; set: Record<string, unknown> }) => {
          returning: () => Promise<unknown[]>;
        };
      };
    };
  };

  const [saved] = await ops
    .insert(siteSettings)
    .values({
      key: IMAGE_REFERENCE_SETTING_KEY,
      value: enabled,
      updatedAt: new Date(),
      createdAt: new Date()
    })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: {
        value: enabled,
        updatedAt: new Date()
      }
    })
    .returning();

  return saved as { key: string; value: boolean };
}

export async function getPresetCharacterBaseImageReferenceEnabled(db = getDb() as unknown, characterId: string) {
  const ops = db as {
    query: {
      characters: {
        findFirst: (args?: never) => Promise<{ allowBaseImageReference?: boolean } | null | undefined>;
      };
    };
  };
  const character = await ops.query.characters.findFirst({
    where: and(eq(characters.id, characterId), eq(characters.kind, "preset"))
  } as never);

  return character?.allowBaseImageReference ?? true;
}

export async function canUseBaseImageReference(
  db = getDb() as unknown,
  characterId: string
) {
  const [siteEnabled, characterEnabled] = await Promise.all([
    getBaseImageReferenceEnabled(db),
    getPresetCharacterBaseImageReferenceEnabled(db, characterId)
  ]);

  return siteEnabled && characterEnabled;
}

export async function listCustomCharactersForUser(db = getDb(), userId: string) {
  return db.query.characters.findMany({
    where: and(eq(characters.kind, "custom"), eq(characters.ownerUserId, userId)),
    orderBy: desc(characters.createdAt)
  });
}

export async function listCharactersForHome(db = getDb(), userId?: string | null) {
  const preset = await listPresetCharacters(db);
  const custom = userId ? await listCustomCharactersForUser(db, userId) : [];

  return {
    preset,
    custom
  };
}

export async function canUserUseCharacter(db = getDb(), userId: string, characterId: string) {
  const character = await db.query.characters.findFirst({
    where: and(
      eq(characters.id, characterId),
      or(eq(characters.kind, "preset"), eq(characters.ownerUserId, userId))
    )
  });

  return !!character;
}

export async function createCustomCharacter(
  db = getDb() as unknown,
  input: {
    userId: string;
    name: string;
    persona?: string;
    background?: string;
    speakingStyle?: string;
    catchphrases?: string;
    motivation?: string;
    image?: Pick<SavedFile, "url" | "key" | "provider">;
  }
) {
  const ops = db as {
    insert: (table: unknown) => {
      values: (value: Record<string, unknown>) => {
        returning: () => Promise<unknown[]>;
      };
    };
  };
  const slug = `custom-${input.userId.replace(/[^a-zA-Z0-9_-]/g, "_")}-${Date.now()}`;
  const [created] = await ops
    .insert(characters)
    .values({
      slug,
      kind: "custom",
      ownerUserId: input.userId,
      name: input.name,
      title: "我的自定义角色",
      persona: input.persona?.trim() || "这是用户自定义的角色，请根据她的姓名和上下文自然回应。",
      background: input.background?.trim() || "",
      speakingStyle: input.speakingStyle?.trim() || "",
      catchphrases: input.catchphrases?.trim() || "",
      motivation: input.motivation?.trim() || "",
      baseImageUrl: input.image?.url ?? DEFAULT_CUSTOM_CHARACTER_IMAGE_URL,
      baseImageStorageKey: input.image?.key ?? null,
      baseImageStorageProvider: input.image?.provider ?? "local-public",
      sortOrder: 1000
    })
    .returning();

  return created;
}

export async function deleteCustomCharacter(
  db = getDb() as unknown,
  input: {
    userId: string;
    characterId: string;
    deleteObjects?: (keys: string[]) => Promise<{ deletedKeys: string[]; failedKeys: string[] }>;
    publicUrl?: string;
    logger?: Pick<typeof console, "warn">;
  }
) {
  const ops = db as {
    query: {
      characters: {
        findFirst: (args?: never) => Promise<unknown>;
      };
      chatMessages: {
        findMany: (args?: never) => Promise<Array<{ content: string }>>;
      };
      chatSessions?: {
        findMany: (args?: never) => Promise<Array<{ id: string }>>;
      };
    };
    delete: (table: unknown) => {
      where: (condition: unknown) => Promise<unknown>;
    };
  };
  const character = (await ops.query.characters.findFirst({
    where: and(eq(characters.id, input.characterId), eq(characters.ownerUserId, input.userId))
  } as never)) as
    | {
        id: string;
        kind: string;
        ownerUserId: string | null;
        baseImageStorageKey?: string | null;
        baseImageStorageProvider?: string | null;
      }
    | null
    | undefined;

  if (!character || character.kind !== "custom" || character.ownerUserId !== input.userId) {
    throw new Error("Custom character not found");
  }

  const sessions = ops.query.chatSessions
    ? await ops.query.chatSessions.findMany({
        where: eq(chatSessions.characterId, input.characterId)
      } as never)
    : [];
  const sessionIds = sessions.map((session) => session.id);
  const messages =
    sessionIds.length > 0
      ? await ops.query.chatMessages.findMany({
          where: and(inArray(chatMessages.sessionId, sessionIds), eq(chatMessages.type, "image"))
        } as never)
      : await ops.query.chatMessages.findMany({
          where: and(eq(chatSessions.characterId, input.characterId), eq(chatMessages.type, "image"))
        } as never);
  const publicUrl = input.publicUrl ?? getServerEnv().R2_PUBLIC_URL;
  const imageKeys = messages.map((message) => r2KeyFromPublicUrl(message.content, publicUrl)).filter(isString);
  const keys = [
    character.baseImageStorageProvider === "r2" ? character.baseImageStorageKey : null,
    ...imageKeys
  ].filter(isString);
  const deleteObjects =
    input.deleteObjects ??
    ((objectKeys: string[]) =>
      deleteR2Objects({
        keys: objectKeys
      }));
  const cleanup = keys.length > 0 ? await deleteObjects(keys) : { deletedKeys: [], failedKeys: [] };

  await ops.delete(characters).where(eq(characters.id, input.characterId));

  const warnings = cleanup.failedKeys.map((key) => `Failed to delete R2 object: ${key}`);

  if (warnings.length > 0) {
    (input.logger ?? console).warn("R2 cleanup failed during custom character deletion", {
      characterId: input.characterId,
      failedKeys: cleanup.failedKeys
    });
  }

  return {
    deleted: true,
    warnings
  };
}

function r2KeyFromPublicUrl(url: string, publicUrl: string) {
  const normalizedPublicUrl = publicUrl.replace(/\/+$/, "");

  if (!url.startsWith(`${normalizedPublicUrl}/`)) {
    return null;
  }

  return url.slice(normalizedPublicUrl.length + 1);
}

function isString(value: string | null | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}
