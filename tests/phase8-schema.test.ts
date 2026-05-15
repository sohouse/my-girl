import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { emailEvents, emailSendLogs } from "@/server/db/schema";

describe("Phase 8 email schema", () => {
  it("stores proactive email events with optional memory references", () => {
    const columns = getTableColumns(emailEvents);

    expect(columns).toHaveProperty("userId");
    expect(columns).toHaveProperty("characterId");
    expect(columns).toHaveProperty("source");
    expect(columns).toHaveProperty("memoryId");
    expect(columns).toHaveProperty("type");
    expect(columns).toHaveProperty("title");
    expect(columns).toHaveProperty("meaning");
    expect(columns).toHaveProperty("month");
    expect(columns).toHaveProperty("day");
    expect(columns).toHaveProperty("eventDate");
    expect(columns).toHaveProperty("cronExpression");
    expect(columns).toHaveProperty("enabled");
  });

  it("stores send logs for idempotency and audit", () => {
    const columns = getTableColumns(emailSendLogs);

    expect(columns).toHaveProperty("userId");
    expect(columns).toHaveProperty("characterId");
    expect(columns).toHaveProperty("eventId");
    expect(columns).toHaveProperty("scheduledDate");
    expect(columns).toHaveProperty("status");
    expect(columns).toHaveProperty("subject");
    expect(columns).toHaveProperty("sentAt");
    expect(columns).toHaveProperty("errorMessage");
  });
});
