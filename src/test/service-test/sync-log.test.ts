import { beforeEach, expect, test } from "bun:test";
import { dropAll } from "../../lib/db";
import logger from "../../lib/logger";
import { prisma } from "../../prisma/prisma";
import { SyncLogService } from "../../service/sync-log-service";

beforeEach(async () => {
  await dropAll();
});

const syncLogService = new SyncLogService();

test("demo: logs how a persisted sync log entry looks", async () => {
  await syncLogService.create({
    trigger: "MANUAL",
    status: "COMPLETED",
    includeRRSync: false,
    autoSync: true,
    successfulSyncsCount: 1,
    failedSyncsCount: 1,
    updatedMatchesCount: 1,
    details: {
      successfulSyncs: [
        { id: "9001", home: "TTC Klingenmünster I", away: "TV Wörth II", datetime: "2026-07-04T18:00:00.000Z" },
      ],
      failedSyncs: [
        { id: "9002", home: "Unknown Club III", away: "TTC Klingenmünster III", datetime: "2026-07-05T11:00:00.000Z" },
      ],
      updatedMatches: [
        { id: "9003", home: "TTC Klingenmünster II", away: "SV Maximiliansau I", datetime: "2026-07-06T19:30:00.000Z" },
      ],
    },
  });

  // Read it back exactly as it is stored in the database.
  const entry = await prisma.syncLog.findFirst();
  logger.info({ syncLog: entry }, "Persisted sync log entry");

  expect(entry).not.toBeNull();
});

test("create: persists a sync log with counts and details", async () => {
  const log = await syncLogService.create({
    trigger: "AUTO",
    status: "COMPLETED",
    includeRRSync: false,
    autoSync: true,
    successfulSyncsCount: 2,
    failedSyncsCount: 1,
    updatedMatchesCount: 0,
    details: {
      successfulSyncs: [
        { id: "m1", home: "Home I", away: "Away I", datetime: "2026-07-01T18:00:00.000Z" },
      ],
      failedSyncs: [],
      updatedMatches: [],
    },
  });

  expect(log.id).toBeDefined();
  expect(log.trigger).toBe("AUTO");
  expect(log.status).toBe("COMPLETED");
  expect(log.successfulSyncsCount).toBe(2);
  expect(log.failedSyncsCount).toBe(1);
  expect(log.createdAt).toBeInstanceOf(Date);
});

test("getLogs: returns logs newest first and respects limit", async () => {
  await syncLogService.create({ trigger: "AUTO", status: "SKIPPED", includeRRSync: false, autoSync: false });
  await syncLogService.create({ trigger: "MANUAL", status: "COMPLETED", includeRRSync: true, autoSync: true });

  const logs = await syncLogService.getLogs();
  expect(logs).toHaveLength(2);
  // newest first
  expect(logs[0].createdAt.getTime()).toBeGreaterThanOrEqual(logs[1].createdAt.getTime());

  const limited = await syncLogService.getLogs(1);
  expect(limited).toHaveLength(1);
});

test("getLogById: returns the matching log", async () => {
  const created = await syncLogService.create({ trigger: "MANUAL", status: "FAILED", includeRRSync: false, autoSync: false, error: "boom" });

  const log = await syncLogService.getLogById(created.id);
  expect(log.id).toBe(created.id);
  expect(log.error).toBe("boom");
});

test("getLogById: throws 404 for unknown id", async () => {
  expect(syncLogService.getLogById("does-not-exist")).rejects.toThrow();
});
