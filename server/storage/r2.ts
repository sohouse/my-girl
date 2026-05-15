import { createHash, createHmac, randomUUID } from "node:crypto";
import { getServerEnv } from "@/env";
import { assertImageFile, assertImageSize, normalizeImageContentType } from "@/server/security/image";
import { buildStorageObjectKey } from "./keys";
import { getImageExtension } from "./local-public";
import type { SavedFile, SaveGeneratedImageInput, StorageScene } from "./types";

type R2Env = Pick<
  ReturnType<typeof getServerEnv>,
  "R2_ACCESS_KEY_ID" | "R2_SECRET_ACCESS_KEY" | "R2_ENDPOINT" | "R2_BUCKET_NAME" | "R2_PUBLIC_URL"
>;

type R2SaveOptions = {
  env?: R2Env;
  fetchImpl?: typeof fetch;
  nonce?: string;
  now?: Date;
};

const service = "s3";
const region = "auto";
const emptyPayloadHash = createHash("sha256").update("").digest("hex");

export async function saveUploadedFileToR2({
  userId,
  scene,
  file,
  env = getServerEnv(),
  fetchImpl = fetch,
  nonce = randomUUID().slice(0, 8),
  now = new Date()
}: {
  userId: string;
  scene: StorageScene;
  file: File;
} & R2SaveOptions): Promise<SavedFile> {
  assertImageFile(file);

  const bytes = new Uint8Array(await file.arrayBuffer());

  return saveBytesToR2({
    userId,
    scene,
    bytes,
    contentType: file.type,
    env,
    fetchImpl,
    nonce,
    now
  });
}

export async function saveGeneratedImageToR2({
  userId,
  scene,
  bytes,
  contentType,
  env = getServerEnv(),
  fetchImpl = fetch,
  nonce = randomUUID().slice(0, 8),
  now = new Date()
}: SaveGeneratedImageInput & R2SaveOptions): Promise<SavedFile> {
  assertImageSize(bytes.byteLength);

  return saveBytesToR2({
    userId,
    scene,
    bytes,
    contentType,
    env,
    fetchImpl,
    nonce,
    now
  });
}

async function saveBytesToR2({
  userId,
  scene,
  bytes,
  contentType,
  env,
  fetchImpl,
  nonce,
  now
}: {
  userId: string;
  scene: StorageScene;
  bytes: Uint8Array;
  contentType: string;
} &
  Required<Pick<R2SaveOptions, "env" | "fetchImpl" | "nonce" | "now">>): Promise<SavedFile> {
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
    nonce,
    now
  });

  await putR2Object({
    key,
    bytes,
    contentType: normalizedContentType,
    env,
    fetchImpl,
    now
  });

  return {
    key,
    url: buildPublicUrl(env.R2_PUBLIC_URL, key),
    provider: "r2",
    contentType: normalizedContentType,
    size: bytes.byteLength
  };
}

export async function deleteR2Objects({
  keys,
  env = getServerEnv(),
  fetchImpl = fetch,
  now = new Date()
}: {
  keys: string[];
  env?: R2Env;
  fetchImpl?: typeof fetch;
  now?: Date;
}) {
  const uniqueKeys = Array.from(new Set(keys.filter(Boolean)));
  const deletedKeys: string[] = [];
  const failedKeys: string[] = [];

  for (const key of uniqueKeys) {
    try {
      const response = await fetchImpl(buildObjectUrl(env, key), {
        method: "DELETE",
        headers: buildSignedHeaders({
          method: "DELETE",
          url: buildObjectUrl(env, key),
          contentType: "",
          payloadHash: emptyPayloadHash,
          env,
          now
        })
      });

      if (response.ok || response.status === 404) {
        deletedKeys.push(key);
      } else {
        failedKeys.push(key);
      }
    } catch {
      failedKeys.push(key);
    }
  }

  return { deletedKeys, failedKeys };
}

async function putR2Object({
  key,
  bytes,
  contentType,
  env,
  fetchImpl,
  now
}: {
  key: string;
  bytes: Uint8Array;
  contentType: string;
  env: R2Env;
  fetchImpl: typeof fetch;
  now: Date;
}) {
  const url = buildObjectUrl(env, key);
  const payloadHash = createHash("sha256").update(bytes).digest("hex");
  const response = await fetchImpl(url, {
    method: "PUT",
    headers: buildSignedHeaders({
      method: "PUT",
      url,
      contentType,
      payloadHash,
      env,
      now
    }),
    body: Buffer.from(bytes)
  });

  if (!response.ok) {
    throw new Error("R2 object upload failed");
  }
}

function buildObjectUrl(env: R2Env, key: string) {
  return `${env.R2_ENDPOINT.replace(/\/+$/, "")}/${env.R2_BUCKET_NAME}/${key}`;
}

function buildPublicUrl(publicUrl: string, key: string) {
  return `${publicUrl.replace(/\/+$/, "")}/${key}`;
}

function buildSignedHeaders({
  method,
  url,
  contentType,
  payloadHash,
  env,
  now
}: {
  method: string;
  url: string;
  contentType: string;
  payloadHash: string;
  env: R2Env;
  now: Date;
}) {
  const target = new URL(url);
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const headers: Record<string, string> = {
    host: target.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate
  };

  if (contentType) {
    headers["content-type"] = contentType;
  }

  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((key) => `${key}:${headers[key]}\n`)
    .join("");
  const canonicalRequest = [
    method,
    target.pathname,
    target.searchParams.toString(),
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join("\n");
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    createHash("sha256").update(canonicalRequest).digest("hex")
  ].join("\n");
  const signingKey = getSignatureKey(env.R2_SECRET_ACCESS_KEY, dateStamp);
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  return {
    ...headers,
    authorization: `AWS4-HMAC-SHA256 Credential=${env.R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  };
}

function getSignatureKey(secretKey: string, dateStamp: string) {
  const dateKey = createHmac("sha256", `AWS4${secretKey}`).update(dateStamp).digest();
  const regionKey = createHmac("sha256", dateKey).update(region).digest();
  const serviceKey = createHmac("sha256", regionKey).update(service).digest();

  return createHmac("sha256", serviceKey).update("aws4_request").digest();
}

function toAmzDate(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}
