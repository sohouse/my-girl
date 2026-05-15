import { getServerEnv } from "@/env";

type VoiceMessage = {
  role: string;
  content: string;
};

type VoiceCharacter = {
  name: string;
  speakingStyle: string;
  catchphrases: string;
};

type VoicePromptInput = {
  reply: string;
  character: VoiceCharacter;
  recentMessages: VoiceMessage[];
};

type TtsStreamLine = {
  code?: number;
  data?: string;
  message?: string;
  sentence?: unknown;
  usage?: unknown;
};

type VoiceFetch = typeof fetch;

const defaultVoiceResourceId = "volc.service_type.10029";
const defaultVoiceSpeaker = "zh_female_cancan_mars_bigtts";

export function buildVoicePromptText(input: VoicePromptInput) {
  return input.reply;
}

export function buildVoiceRequestPayload(text: string, speaker = defaultVoiceSpeaker) {
  return {
    user: {
      uid: "my-girl"
    },
    req_params: {
      text,
      speaker,
      audio_params: {
        format: "mp3",
        sample_rate: 24000,
        enable_timestamp: true
      },
      additions: JSON.stringify({
        explicit_language: "zh",
        disable_markdown_filter: true,
        enable_timestamp: true
      })
    }
  };
}

export function isSupportedMp3Audio(payload: Uint8Array) {
  return looksLikeAudio(payload);
}

export async function generateVoiceAudio(text: string, fetchImpl: VoiceFetch = fetch) {
  const env = getServerEnv();
  const resourceId = env.ARK_VOICE_RESOURCE_ID ?? defaultVoiceResourceId;
  const speaker = env.ARK_VOICE_SPEAKER ?? defaultVoiceSpeaker;

  validateVoiceResourceSpeaker(resourceId, speaker);

  const response = await fetchImpl(env.ARK_VOICE_GENERATOR_URL, {
    method: "POST",
    headers: {
      "X-Api-App-Id": env.ARK_VOICE_APP_ID,
      "X-Api-Access-Key": env.ARK_VOICE_API_KEY,
      "X-Api-Resource-Id": resourceId,
      "Content-Type": "application/json",
      "Connection": "keep-alive"
    },
    body: JSON.stringify(buildVoiceRequestPayload(text, speaker))
  });

  const audio = await parseVoiceHttpStream(response);

  if (!isSupportedMp3Audio(audio)) {
    throw new Error(
      `Voice response was not mp3 audio: length=${audio.byteLength}, head=${formatBytes(audio.slice(0, 16))}`
    );
  }

  return audio;
}

function validateVoiceResourceSpeaker(resourceId: string, speaker: string) {
  if (resourceId === "seed-tts-2.0" && !speaker.endsWith("_uranus_bigtts")) {
    throw new Error(
      `ARK_VOICE_RESOURCE_ID=seed-tts-2.0 requires a *_uranus_bigtts speaker, but ARK_VOICE_SPEAKER=${speaker}`
    );
  }
}

export async function parseVoiceHttpStream(response: Response) {
  if (!response.ok) {
    throw new Error(`Voice service returned HTTP ${response.status}: ${await response.text()}`);
  }

  if (!response.body) {
    throw new Error("Voice service response did not include a body");
  }

  const audioChunks: Uint8Array[] = [];
  let pending = "";

  for await (const chunk of response.body) {
    pending += new TextDecoder().decode(chunk, { stream: true });
    const lines = pending.split(/\r?\n/);

    pending = lines.pop() ?? "";

    for (const line of lines) {
      handleVoiceStreamLine(line, audioChunks);
    }
  }

  if (pending.trim()) {
    handleVoiceStreamLine(pending, audioChunks);
  }

  const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const audio = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of audioChunks) {
    audio.set(chunk, offset);
    offset += chunk.byteLength;
  }

  if (audio.byteLength === 0) {
    throw new Error("Voice response did not include audio");
  }

  return audio;
}

function handleVoiceStreamLine(line: string, audioChunks: Uint8Array[]) {
  const trimmed = line.trim();

  if (!trimmed) {
    return;
  }

  const data = JSON.parse(trimmed) as TtsStreamLine;

  if (data.code === 0 && data.data) {
    audioChunks.push(decodeBase64Bytes(data.data));
    return;
  }

  if (data.code === 0 && data.sentence) {
    return;
  }

  if (data.code === 20000000) {
    return;
  }

  if (typeof data.code === "number" && data.code > 0) {
    throw new Error(`Voice service returned error: ${trimmed}`);
  }
}

function decodeBase64Bytes(value: string) {
  return new Uint8Array(Buffer.from(value, "base64"));
}

function looksLikeAudio(payload: Uint8Array) {
  if (payload.byteLength < 2) {
    return false;
  }

  return (
    (payload[0] === 0xff && (payload[1] & 0xe0) === 0xe0) ||
    (payload.byteLength >= 3 && payload[0] === 0x49 && payload[1] === 0x44 && payload[2] === 0x33)
  );
}

function formatBytes(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join(" ");
}
