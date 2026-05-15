import type { StorageScene } from "./types";

export function buildStorageObjectKey({
  userId,
  scene,
  extension,
  nonce,
  now = new Date()
}: {
  userId: string;
  scene: StorageScene;
  extension: string;
  nonce: string;
  now?: Date;
}) {
  const timestamp = now.toISOString().replace(/\D/g, "").slice(0, 14);
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeExtension = extension.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";

  return `uploads/users/${safeUserId}/${scene}/${timestamp}-${nonce}.${safeExtension}`;
}
