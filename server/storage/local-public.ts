import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { assertImageFile, assertImageSize, normalizeImageContentType } from "@/server/security/image";
import type { SavedFile, SaveGeneratedImageInput, StorageScene } from "./types";
import { buildStorageObjectKey } from "./keys";

const contentTypeToExtension: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

export function getImageExtension(contentType: string) {
  return contentTypeToExtension[normalizeImageContentType(contentType)] ?? null;
}

export async function saveUploadedFileToPublic({
  userId,
  scene,
  file
}: {
  userId: string;
  scene: StorageScene;
  file: File;
}): Promise<SavedFile> {
  assertImageFile(file);

  const contentType = normalizeImageContentType(file.type);
  const extension = getImageExtension(contentType);

  if (!extension) {
    throw new Error("Unsupported image type");
  }

  const key = buildStorageObjectKey({
    userId,
    scene,
    extension,
    nonce: randomUUID().slice(0, 8)
  });
  const absolutePath = join(process.cwd(), "public", key);
  const bytes = Buffer.from(await file.arrayBuffer());

  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, bytes);

  return {
    key,
    url: `/${key}`,
    provider: "local-public",
    contentType,
    size: file.size
  };
}

export async function saveGeneratedImageToPublic({
  userId,
  scene,
  bytes,
  contentType
}: SaveGeneratedImageInput): Promise<SavedFile> {
  assertImageSize(bytes.byteLength);

  const normalizedContentType = normalizeImageContentType(contentType);
  const extension = getImageExtension(normalizedContentType);

  if (!extension) {
    throw new Error("Unsupported image type");
  }

  const key = buildStorageObjectKey({
    userId,
    scene,
    extension,
    nonce: randomUUID().slice(0, 8)
  });
  const absolutePath = join(process.cwd(), "public", key);

  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, Buffer.from(bytes));

  return {
    key,
    url: `/${key}`,
    provider: "local-public",
    contentType: normalizedContentType,
    size: bytes.byteLength
  };
}
