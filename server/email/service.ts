import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getServerEnv } from "@/env";
import { extractMinimaxTextContent } from "@/server/ai/minimax";
import { emailEvents, emailSendLogs } from "@/server/db/schema";

type DbOperations = {
  query: {
    emailEvents: {
      findMany: (args?: never) => Promise<EmailEventWithContext[]>;
    };
    emailSendLogs: {
      findFirst: (args?: never) => Promise<unknown>;
    };
  };
  insert: (table: unknown) => {
    values: (value: Record<string, unknown>) => {
      returning: () => Promise<Array<Record<string, unknown>>>;
    };
  };
};

type DbLike = unknown;

type EventForDateCheck = {
  type: string;
  month: number | null;
  day: number | null;
  eventDate: Date | null;
  cronExpression: string | null;
};

type EmailCharacter = {
  name: string;
  persona: string;
  background: string;
  speakingStyle: string;
  catchphrases: string;
  motivation: string;
};

type EmailEventWithContext = EventForDateCheck & {
  id: string;
  userId: string | null;
  characterId: string | null;
  title: string;
  meaning: string;
  user?: {
    id: string;
    email: string;
    name: string;
  } | null;
  character?: EmailCharacter | null;
  memory?: {
    value: string;
    meaning: string;
  } | null;
};

type DispatchableEmailEvent = EmailEventWithContext & {
  userId: string;
  characterId: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  character: EmailCharacter;
};

type EmailContent = z.infer<typeof emailContentSchema>;

export const emailContentSchema = z.object({
  subject: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(4000)
});

function toDbOperations(db: DbLike) {
  return db as DbOperations;
}

function dateKeyFromParts(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getShanghaiDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return {
    year: year ?? 1970,
    month: month ?? 1,
    day: day ?? 1
  };
}

export function isEmailEventDueOn(event: EventForDateCheck, dateKey: string) {
  const date = parseDateKey(dateKey);

  if (event.type === "fixed_date") {
    return event.month === date.month && event.day === date.day;
  }

  if (event.type === "exact_date" && event.eventDate) {
    return getShanghaiDateKey(event.eventDate) === dateKey;
  }

  if (event.type === "cron" && event.cronExpression) {
    return isDailyCronDue(event.cronExpression, dateKey);
  }

  return false;
}

function isDailyCronDue(expression: string, dateKey: string) {
  const parts = expression.trim().split(/\s+/);

  if (parts.length !== 5) {
    return false;
  }

  const [, , dayOfMonth, month, dayOfWeek] = parts;
  const date = parseDateKey(dateKey);
  const jsDate = new Date(Date.UTC(date.year, date.month - 1, date.day));
  const cronDayOfWeek = jsDate.getUTCDay();

  return matchesCronPart(month, date.month) && matchesCronPart(dayOfMonth, date.day) && matchesCronPart(dayOfWeek, cronDayOfWeek);
}

function matchesCronPart(part: string, value: number) {
  if (part === "*") {
    return true;
  }

  return part.split(",").some((item) => Number(item) === value);
}

export function buildEmailGenerationPrompt(input: {
  eventTitle: string;
  eventMeaning: string;
  userName: string;
  character: EmailCharacter;
  memoryText?: string;
}) {
  return [
    `你正在以 ${input.character.name} 的身份给用户 ${input.userName} 写一封主动关怀邮件。`,
    `角色人设：${input.character.persona}`,
    `成长背景：${input.character.background}`,
    `说话语气：${input.character.speakingStyle}`,
    `口头禅：${input.character.catchphrases}`,
    `行为动机：${input.character.motivation}`,
    `日期事件：${input.eventTitle}`,
    `日期意义：${input.eventMeaning}`,
    input.memoryText ? `相关记忆：${input.memoryText}` : "",
    "请生成自然、简短、像角色亲自写给用户的中文邮件。",
    "只输出 JSON，不要 Markdown，不要解释。格式：{\"subject\":\"邮件标题\",\"body\":\"邮件正文\"}"
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateProactiveEmail(input: {
  eventTitle: string;
  eventMeaning: string;
  userName: string;
  character: EmailCharacter;
  memoryText?: string;
}) {
  const env = getServerEnv();
  const response = await fetch(env.MINIMAX_TEXT_GENERATOR_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.MINIMAX_API_KEY}`
    },
    body: JSON.stringify({
      model: "MiniMax-M2.7",
      system: buildEmailGenerationPrompt(input),
      messages: [
        {
          role: "user",
          content: "请生成这封邮件。"
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error("MiniMax email generation request failed");
  }

  const payload = await response.json();
  const text = extractMinimaxTextContent(payload);

  return emailContentSchema.parse(JSON.parse(text));
}

export async function sendResendEmail(input: { to: string; subject: string; body: string }) {
  const env = getServerEnv();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: input.to,
      subject: input.subject,
      text: input.body
    })
  });

  if (!response.ok) {
    throw new Error("Resend request failed");
  }

  return response.json();
}

export async function dispatchDueEmails(
  db: DbLike,
  options: {
    now?: Date;
    generateEmail?: (input: {
      eventTitle: string;
      eventMeaning: string;
      userName: string;
      character: EmailCharacter;
      memoryText?: string;
    }) => Promise<EmailContent>;
    sendEmail?: (input: { to: string; subject: string; body: string }) => Promise<unknown>;
  } = {}
) {
  const ops = toDbOperations(db);
  const scheduledDate = getShanghaiDateKey(options.now ?? new Date());
  const events = await ops.query.emailEvents.findMany({
    where: eq(emailEvents.enabled, true),
    with: {
      user: true,
      character: true,
      memory: true
    }
  } as never);
  const dueEvents = events.filter((event): event is DispatchableEmailEvent => isDispatchableEvent(event) && isEmailEventDueOn(event, scheduledDate));
  const generateEmail = options.generateEmail ?? generateProactiveEmail;
  const sendEmail = options.sendEmail ?? sendResendEmail;
  let sentCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const event of dueEvents) {
    const existingLog = await ops.query.emailSendLogs.findFirst({
      where: and(
        eq(emailSendLogs.userId, event.userId),
        eq(emailSendLogs.characterId, event.characterId),
        eq(emailSendLogs.eventId, event.id),
        eq(emailSendLogs.scheduledDate, scheduledDate)
      )
    } as never);

    if (existingLog) {
      skippedCount += 1;
      continue;
    }

    try {
      const content = await generateEmail({
        eventTitle: event.title,
        eventMeaning: event.meaning,
        userName: event.user.name,
        character: event.character,
        memoryText: event.memory ? `${event.memory.meaning}：${event.memory.value}` : undefined
      });

      await sendEmail({
        to: event.user.email,
        subject: content.subject,
        body: content.body
      });
      await insertSendLog(ops, {
        event,
        scheduledDate,
        status: "sent",
        subject: content.subject,
        sentAt: new Date()
      });
      sentCount += 1;
    } catch (error) {
      await insertSendLog(ops, {
        event,
        scheduledDate,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown email dispatch error"
      });
      failedCount += 1;
    }
  }

  return {
    scannedCount: dueEvents.length,
    sentCount,
    skippedCount,
    failedCount
  };
}

async function insertSendLog(
  ops: DbOperations,
  input: {
    event: DispatchableEmailEvent;
    scheduledDate: string;
    status: "sent" | "failed";
    subject?: string;
    sentAt?: Date;
    errorMessage?: string;
  }
) {
  await ops
    .insert(emailSendLogs)
    .values({
      userId: input.event.userId,
      characterId: input.event.characterId,
      eventId: input.event.id,
      scheduledDate: input.scheduledDate,
      status: input.status,
      subject: input.subject,
      sentAt: input.sentAt,
      errorMessage: input.errorMessage
    })
    .returning();
}

function isDispatchableEvent(event: EmailEventWithContext): event is DispatchableEmailEvent {
  return Boolean(event.userId && event.characterId && event.user?.email && event.character);
}

export function createMemoryEmailEventFromMemory(input: {
  userId: string;
  characterId: string;
  memoryId: string;
  title: string;
  meaning: string;
  month?: number | null;
  day?: number | null;
  eventDate?: Date | null;
}) {
  const exactDate = input.eventDate ?? null;

  return {
    userId: input.userId,
    characterId: input.characterId,
    source: "memory",
    memoryId: input.memoryId,
    type: exactDate ? "exact_date" : "fixed_date",
    title: input.title,
    meaning: input.meaning,
    month: input.month ?? null,
    day: input.day ?? null,
    eventDate: exactDate,
    enabled: true
  };
}

export { dateKeyFromParts };
