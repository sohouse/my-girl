import { getServerEnv } from "@/env";
import {
  assertGeneratedImageResponse,
  assertImageSize,
  assertTrustedGeneratedImageUrl
} from "@/server/security/image";
import { saveGeneratedImageToR2 } from "@/server/storage/r2";
import type { SaveGeneratedImage } from "@/server/storage/types";

type ImageMessage = {
  role: string;
  type?: string;
  content: string;
};

type ImageCharacter = {
  name: string;
  persona: string;
  background: string;
  speakingStyle: string;
  catchphrases: string;
  motivation: string;
  baseImageUrl?: string;
};

type ImageDecisionInput = {
  userMessage: string;
  assistantReply: string;
  recentMessages: ImageMessage[];
  character: ImageCharacter;
};

export type ImageChecklistItem = {
  id: string;
  passed: boolean;
  decision: "block" | "allow" | "neutral";
  reason: string;
};

export type ImageGenerationDecision = {
  shouldGenerateImage: boolean;
  imageKind: ImageKind;
  imagePrompt: string;
  checklist: ImageChecklistItem[];
};

export type ImageKind = "selfie" | "scene";

type ImageFetch = typeof fetch;

type GenerateChatImageInput = {
  userId: string;
  prompt: string;
  imageKind?: ImageKind;
  baseImageUrl?: string;
  fetchImpl?: ImageFetch;
  saveGeneratedImage?: SaveGeneratedImage;
};

type CreemModerationDecision = {
  decision?: string;
  action?: string;
  category?: string;
  flagged?: boolean;
  reason?: string;
  output?: {
    decision?: string;
    action?: string;
    category?: string;
    flagged?: boolean;
    reason?: string;
  };
};

const visualCuePattern = /现在|看|看看|穿什么|照片|图片|自拍|拍一张|发张|发一张|窗边|下雨|夜晚|咖啡|房间|风景|样子|画面/;
const selfieCuePattern = /自拍|看看你|看你|你的样子|你现在|你穿什么|穿什么|露脸|发张照片|发一张照片|拍一张|发张|照片给我/;
const seriousMoodPattern = /崩溃|撑不下去|想死|自杀|抑郁|绝望|难过|低落|痛苦|分手|失业|生病|压力|焦虑|哭|严肃/;
const greetingPattern = /^(你好|嗨|哈喽|hello|hi|早|早安|晚安|在吗|嗯|哦|好|好的|谢谢)[呀啊嘛～~！!。.\s]*$/i;

export function decideImageGeneration(input: ImageDecisionInput): ImageGenerationDecision {
  const combined = `${input.userMessage}\n${input.assistantReply}`;
  const checklist: ImageChecklistItem[] = [
    checkContextLength(input),
    checkSeriousOrLowMood(combined),
    checkRecentImageCooldown(input.recentMessages),
    checkVisualCue(combined)
  ];
  const hasBlock = checklist.some((item) => item.decision === "block" && item.passed);
  const hasAllow = checklist.some((item) => item.decision === "allow" && item.passed);

  return {
    shouldGenerateImage: hasAllow && !hasBlock,
    imageKind: detectImageKind(combined),
    imagePrompt: buildContextualImagePrompt(input),
    checklist
  };
}

export function buildImageGenerationPayload(
  prompt: string,
  model: string,
  options: { imageKind?: ImageKind; baseImageUrl?: string; appBaseUrl?: string } = {}
) {
  const payload: {
    model: string;
    prompt: string;
    image?: string;
    size: string;
    output_format: string;
    watermark: boolean;
  } = {
    model,
    prompt,
    size: "2K",
    output_format: "png",
    watermark: false
  };

  if (options.imageKind === "selfie" && options.baseImageUrl) {
    payload.image = resolveImageUrl(options.baseImageUrl, options.appBaseUrl);
  }

  return payload;
}

export function parseImageGenerationResponse(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    return "";
  }

  const data = (payload as { data: unknown }).data;

  if (!Array.isArray(data)) {
    return "";
  }

  const first = data.find(
    (item): item is { url: string } =>
      !!item && typeof item === "object" && typeof (item as { url?: unknown }).url === "string"
  );

  return first?.url ?? "";
}

export async function generateChatImage({
  userId,
  prompt,
  imageKind = "scene",
  baseImageUrl,
  fetchImpl = fetch,
  saveGeneratedImage = saveGeneratedImageToR2
}: GenerateChatImageInput) {
  const env = getServerEnv();
  await assertImagePromptAllowed(prompt, fetchImpl, env);
  const response = await fetchImpl(env.ARK_IMAGE_GENERATOR_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.ARK_API_KEY}`
    },
    body: JSON.stringify(
      buildImageGenerationPayload(prompt, env.ARK_SEEDREAM_MODEL, {
        imageKind,
        baseImageUrl,
        appBaseUrl: env.APP_BASE_URL
      })
    )
  });

  if (!response.ok) {
    throw new Error(`Ark image generation request failed: ${response.status} ${await readSafeResponseText(response)}`.trim());
  }

  const url = parseImageGenerationResponse(await response.json());

  if (!url) {
    throw new Error("Ark image response did not include an image url");
  }

  assertTrustedGeneratedImageUrl(url);

  const imageResponse = await fetchImpl(url);

  if (!imageResponse.ok) {
    throw new Error("Generated image download failed");
  }

  const contentType = assertGeneratedImageResponse(imageResponse.headers);
  const bytes = new Uint8Array(await imageResponse.arrayBuffer());

  assertImageSize(bytes.byteLength);

  const savedImage = await saveGeneratedImage({
    userId,
    scene: "ai-generated-image",
    bytes,
    contentType
  });

  return {
    url: savedImage.url,
    prompt
  };
}

async function assertImagePromptAllowed(prompt: string, fetchImpl: ImageFetch, env: ReturnType<typeof getServerEnv>) {
  if (!env.CREEM_MODERATION_URL) {
    return;
  }

  if (!env.CREEM_MODERATION_API_KEY) {
    throw new Error("Creem moderation is configured without an API key");
  }

  const response = await fetchImpl(env.CREEM_MODERATION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.CREEM_MODERATION_API_KEY
    },
    body: JSON.stringify({
      input: prompt,
      provider: env.CREEM_MODERATION_PROVIDER ?? "image"
    })
  });

  if (!response.ok) {
    throw new Error(`Creem moderation request failed: ${response.status}`);
  }

  const decision = normalizeModerationDecision(await response.json());

  if (
    decision.flagged ||
    decision.decision === "flag" ||
    decision.decision === "deny" ||
    decision.decision === "block" ||
    decision.action === "flag" ||
    decision.action === "deny" ||
    decision.action === "block"
  ) {
    throw new Error(`Image prompt rejected by moderation: ${decision.reason ?? decision.category ?? "unsafe content"}`);
  }
}

function normalizeModerationDecision(payload: unknown): CreemModerationDecision {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const root = payload as CreemModerationDecision;
  const output = root.output ?? {};

  return {
    decision: root.decision ?? output.decision,
    action: root.action ?? output.action,
    category: root.category ?? output.category,
    flagged: root.flagged ?? output.flagged,
    reason: root.reason ?? output.reason
  };
}

function checkContextLength(input: ImageDecisionInput): ImageChecklistItem {
  const text = `${input.userMessage}${input.assistantReply}`.trim();
  const textMessageCount = input.recentMessages.filter((message) => (message.type ?? "text") === "text").length;
  const isTooShort = text.length < 18 || (textMessageCount === 0 && greetingPattern.test(input.userMessage.trim()));

  return {
    id: "context-too-short",
    passed: isTooShort,
    decision: isTooShort ? "block" : "neutral",
    reason: isTooShort ? "当前上下文太短或只是寒暄" : "上下文长度足够"
  };
}

function checkSeriousOrLowMood(text: string): ImageChecklistItem {
  const isSerious = seriousMoodPattern.test(text);

  return {
    id: "serious-or-low-mood",
    passed: isSerious,
    decision: isSerious ? "block" : "neutral",
    reason: isSerious ? "当前更适合优先文字陪伴" : "未检测到低落或严肃话题"
  };
}

function checkRecentImageCooldown(recentMessages: ImageMessage[]): ImageChecklistItem {
  const hasRecentImage = recentMessages.slice(-6).some((message) => message.role === "assistant" && message.type === "image");

  return {
    id: "recent-image-cooldown",
    passed: hasRecentImage,
    decision: hasRecentImage ? "block" : "neutral",
    reason: hasRecentImage ? "最近已经发送过图片" : "最近没有发送图片"
  };
}

function checkVisualCue(text: string): ImageChecklistItem {
  const hasVisualCue = visualCuePattern.test(text);

  return {
    id: "visual-cue-present",
    passed: hasVisualCue,
    decision: hasVisualCue ? "allow" : "neutral",
    reason: hasVisualCue ? "聊天内容出现强画面感" : "没有明显发图动机"
  };
}

function detectImageKind(text: string): ImageKind {
  return selfieCuePattern.test(text) ? "selfie" : "scene";
}

function resolveImageUrl(imageUrl: string, appBaseUrl?: string) {
  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  if (!appBaseUrl) {
    return imageUrl;
  }

  return new URL(imageUrl, appBaseUrl).toString();
}

async function readSafeResponseText(response: Response) {
  const text = await response.text().catch(() => "");

  return text.replace(/\s+/g, " ").slice(0, 500);
}

function buildContextualImagePrompt(input: ImageDecisionInput) {
  const imageKind = detectImageKind(`${input.userMessage}\n${input.assistantReply}`);
  const identityInstruction =
    imageKind === "selfie"
      ? "这是角色本人出镜的自拍照，必须保持角色身份、脸部特征、发型气质与基准图一致。"
      : "外观和气质参考角色设定，保持自然真实的聊天随手拍感觉。";

  return [
    `角色：${input.character.name}`,
    `人设：${input.character.persona}`,
    identityInstruction,
    `说话语气：${input.character.speakingStyle}`,
    `当前用户消息：${input.userMessage}`,
    `角色刚刚回复：${input.assistantReply}`,
    "生成一张符合当前聊天上下文的真实感照片，不要添加文字、水印或聊天气泡。"
  ].join("\n");
}
