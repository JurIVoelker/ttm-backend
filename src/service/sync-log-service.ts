import { HTTPException } from "hono/http-exception";
import logger from "../lib/logger";
import { prisma } from "../prisma/prisma";
import { SyncStatus, SyncTrigger } from "../prisma/generated";
import { TTApiMatch } from "../types/sync";

export type SyncMatchDetail = {
  id: string;
  home: string;
  away: string;
  datetime: string;
  reason?: string;
};

export type SyncLogDetails = {
  successfulSyncs: SyncMatchDetail[];
  failedSyncs: SyncMatchDetail[];
  updatedMatches: SyncMatchDetail[];
};

export const toMatchDetail = (match: TTApiMatch): SyncMatchDetail => ({
  id: match.id,
  home: match.teams.home.name,
  away: match.teams.away.name,
  datetime: match.datetime,
});

export type CreateSyncLogInput = {
  trigger: SyncTrigger;
  status: SyncStatus;
  includeRRSync: boolean;
  autoSync: boolean;
  successfulSyncsCount?: number;
  failedSyncsCount?: number;
  updatedMatchesCount?: number;
  details?: SyncLogDetails;
  error?: string;
};

export class SyncLogService {
  public async create(input: CreateSyncLogInput) {
    return await prisma.syncLog.create({
      data: {
        trigger: input.trigger,
        status: input.status,
        includeRRSync: input.includeRRSync,
        autoSync: input.autoSync,
        successfulSyncsCount: input.successfulSyncsCount ?? 0,
        failedSyncsCount: input.failedSyncsCount ?? 0,
        updatedMatchesCount: input.updatedMatchesCount ?? 0,
        details: input.details,
        error: input.error,
      },
    });
  }

  public async getLogs(limit = 50) {
    return await prisma.syncLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  public async getLogById(id: string) {
    const log = await prisma.syncLog.findUnique({
      where: { id },
    });

    if (!log)
      throw new HTTPException(404, {
        message: "Sync log not found",
        cause: `Sync log with id "${id}" does not exist`,
      });

    return log;
  }
}
