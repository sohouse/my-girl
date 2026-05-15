import { describe, expect, it, vi } from "vitest";
import {
  buildEmailGenerationPrompt,
  dispatchDueEmails,
  emailContentSchema,
  getShanghaiDateKey,
  isEmailEventDueOn
} from "@/server/email/service";

const userId = "user-1";
const characterId = "00000000-0000-0000-0000-000000000001";
const eventId = "00000000-0000-0000-0000-000000000101";

function createDbStub(options: { existingLog?: boolean; sendShouldFail?: boolean } = {}) {
  const insertedLogs: Array<Record<string, unknown>> = [];
  const event = {
    id: eventId,
    userId,
    characterId,
    source: "memory",
    memoryId: "00000000-0000-0000-0000-000000000201",
    type: "fixed_date",
    title: "用户生日",
    meaning: "这是用户生日，应表达记得、珍惜和祝福。",
    month: 2,
    day: 14,
    eventDate: null,
    cronExpression: null,
    enabled: true,
    user: {
      id: userId,
      email: "qingye@example.com",
      name: "青也"
    },
    character: {
      id: characterId,
      name: "苏糯",
      persona: "软萌治愈系",
      background: "温柔家庭",
      speakingStyle: "轻柔软糯",
      catchphrases: "没关系呀，我都陪着你～",
      motivation: "陪伴和治愈"
    },
    memory: {
      value: "2月14日",
      meaning: "用户生日"
    }
  };

  return {
    query: {
      emailEvents: {
        findMany: vi.fn().mockResolvedValue([event])
      },
      emailSendLogs: {
        findFirst: vi.fn().mockResolvedValue(options.existingLog ? { id: "log-1" } : null)
      }
    },
    insert: vi.fn().mockImplementation(() => ({
      values: vi.fn().mockImplementation((value) => {
        insertedLogs.push(value);

        return {
          returning: vi.fn().mockResolvedValue([{ id: `log-${insertedLogs.length}`, ...value }])
        };
      })
    })),
    insertedLogs
  };
}

describe("email service", () => {
  it("uses Asia/Shanghai when building the scheduled date key", () => {
    const date = new Date("2026-02-13T16:30:00.000Z");

    expect(getShanghaiDateKey(date)).toBe("2026-02-14");
  });

  it("matches fixed date and exact date events due today", () => {
    expect(
      isEmailEventDueOn(
        { type: "fixed_date", month: 2, day: 14, eventDate: null, cronExpression: null },
        "2026-02-14"
      )
    ).toBe(true);
    expect(
      isEmailEventDueOn(
        { type: "exact_date", month: null, day: null, eventDate: new Date("2026-10-01T00:00:00.000Z"), cronExpression: null },
        "2026-10-01"
      )
    ).toBe(true);
  });

  it("validates AI generated email JSON", () => {
    const parsed = emailContentSchema.parse({
      subject: "生日快乐呀",
      body: "我记得今天是你的生日，想认真祝你快乐。"
    });

    expect(parsed.subject).toBe("生日快乐呀");
  });

  it("builds an email generation prompt with character and event meaning", () => {
    const prompt = buildEmailGenerationPrompt({
      eventTitle: "用户生日",
      eventMeaning: "这是用户生日，应表达记得和祝福。",
      userName: "青也",
      character: {
        name: "苏糯",
        persona: "软萌治愈系",
        background: "温柔家庭",
        speakingStyle: "轻柔软糯",
        catchphrases: "没关系呀，我都陪着你～",
        motivation: "陪伴和治愈"
      },
      memoryText: "用户生日是 2月14日"
    });

    expect(prompt).toContain("用户生日");
    expect(prompt).toContain("苏糯");
    expect(prompt).toContain("只输出 JSON");
  });

  it("sends due emails and writes a sent log", async () => {
    const db = createDbStub();
    const sendEmail = vi.fn().mockResolvedValue({ id: "resend-1" });
    const generateEmail = vi.fn().mockResolvedValue({
      subject: "生日快乐呀",
      body: "我记得今天是你的生日。"
    });

    const result = await dispatchDueEmails(db, {
      now: new Date("2026-02-14T01:00:00.000Z"),
      generateEmail,
      sendEmail
    });

    expect(result).toEqual({ scannedCount: 1, sentCount: 1, skippedCount: 0, failedCount: 0 });
    expect(sendEmail).toHaveBeenCalledWith({
      to: "qingye@example.com",
      subject: "生日快乐呀",
      body: "我记得今天是你的生日。"
    });
    expect(db.insertedLogs).toContainEqual(
      expect.objectContaining({
        userId,
        characterId,
        eventId,
        scheduledDate: "2026-02-14",
        status: "sent",
        subject: "生日快乐呀"
      })
    );
  });

  it("skips an event that already has a log for the scheduled date", async () => {
    const db = createDbStub({ existingLog: true });
    const sendEmail = vi.fn();

    const result = await dispatchDueEmails(db, {
      now: new Date("2026-02-14T01:00:00.000Z"),
      generateEmail: vi.fn(),
      sendEmail
    });

    expect(result.skippedCount).toBe(1);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("writes a failed log when sending fails", async () => {
    const db = createDbStub();

    const result = await dispatchDueEmails(db, {
      now: new Date("2026-02-14T01:00:00.000Z"),
      generateEmail: vi.fn().mockResolvedValue({
        subject: "生日快乐呀",
        body: "我记得今天是你的生日。"
      }),
      sendEmail: vi.fn().mockRejectedValue(new Error("resend failed"))
    });

    expect(result.failedCount).toBe(1);
    expect(db.insertedLogs).toContainEqual(
      expect.objectContaining({
        eventId,
        scheduledDate: "2026-02-14",
        status: "failed",
        errorMessage: "resend failed"
      })
    );
  });
});
