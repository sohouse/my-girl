export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function normalizeImageContentType(contentType: string) {
  return contentType.split(";")[0]?.trim().toLowerCase() ?? "";
}

export function assertAllowedImageType(contentType: string) {
  if (!allowedImageTypes.has(normalizeImageContentType(contentType))) {
    throw new Error("Unsupported image type");
  }
}

export function assertImageSize(size: number) {
  if (size > MAX_IMAGE_BYTES) {
    throw new Error("Image file is too large");
  }
}

export function assertImageFile(file: File) {
  if (!file || file.size <= 0) {
    throw new Error("Image file is required");
  }

  assertImageSize(file.size);
  assertAllowedImageType(file.type);
}

export function assertGeneratedImageResponse(headers: Headers) {
  const contentType = normalizeImageContentType(headers.get("Content-Type") ?? "");
  const contentLength = headers.get("Content-Length");

  assertAllowedImageType(contentType);

  if (contentLength) {
    const size = Number(contentLength);

    if (Number.isFinite(size)) {
      assertImageSize(size);
    }
  }

  return contentType;
}

export function assertTrustedGeneratedImageUrl(url: string) {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Generated image url is not trusted");
  }

  if (parsed.protocol !== "https:" || !isTrustedArkImageHost(parsed.hostname)) {
    throw new Error("Generated image url is not trusted");
  }
}

function isTrustedArkImageHost(hostname: string) {
  return (
    hostname === "ark-project.tos-cn-beijing.volces.com" ||
    hostname === "ark-auto-2100463924-cn-beijing-default.tos-cn-beijing.volces.com" ||
    hostname.endsWith(".tos-cn-beijing.volces.com") ||
    hostname.endsWith(".volces.com")
  );
}
