import { prisma } from "../../prisma/prisma";
import { SyncLogDetails, SyncMatchDetail } from "../../service/sync-log-service";

const daysAgo = (days: number, hour: number, minute: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const matchAt = (days: number, hour: number, minute: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

let matchIdCounter = 9000;
const match = (
  home: string,
  away: string,
  datetime: string,
  reason?: string,
): SyncMatchDetail => ({
  id: String(++matchIdCounter),
  home,
  away,
  datetime,
  ...(reason ? { reason } : {}),
});

type SeedLog = {
  createdAt: Date;
  trigger: "AUTO" | "MANUAL";
  includeRRSync: boolean;
  details: SyncLogDetails;
};

const seedLogs: SeedLog[] = [
  {
    createdAt: daysAgo(0, 20, 38),
    trigger: "MANUAL",
    includeRRSync: false,
    details: {
      successfulSyncs: [
        match("TTC Klingenmünster I", "TV Wörth II", matchAt(4, 18, 0)),
      ],
      updatedMatches: [
        match("TTC Klingenmünster II", "SV Maximiliansau I", matchAt(6, 19, 30), "Anstoßzeit geändert"),
      ],
      failedSyncs: [
        match("Unknown Club III", "TTC Klingenmünster III", matchAt(5, 11, 0), "Verein nicht zugeordnet"),
      ],
    },
  },
  {
    createdAt: daysAgo(1, 3, 0),
    trigger: "AUTO",
    includeRRSync: true,
    details: {
      successfulSyncs: [
        match("TTC Klingenmünster I", "TTC Bad Bergzabern II", matchAt(3, 19, 30)),
        match("SV Maximiliansau I", "TTC Klingenmünster II", matchAt(4, 14, 0)),
        match("TTC Klingenmünster III", "TV Kandel I", matchAt(5, 10, 0)),
      ],
      updatedMatches: [],
      failedSyncs: [],
    },
  },
  {
    createdAt: daysAgo(3, 3, 0),
    trigger: "AUTO",
    includeRRSync: true,
    details: {
      successfulSyncs: [
        match("TTC Klingenmünster I", "TuS Göcklingen I", matchAt(8, 19, 30)),
        match("TV Annweiler II", "TTC Klingenmünster II", matchAt(9, 18, 0)),
        match("TTC Klingenmünster III", "SC Bobenheim I", matchAt(10, 11, 0)),
        match("TTC Klingenmünster IV", "TV Rülzheim II", matchAt(11, 14, 0)),
      ],
      updatedMatches: [
        match("TTC Klingenmünster II", "TTC Bad Bergzabern I", matchAt(7, 19, 30), "Halle geändert"),
      ],
      failedSyncs: [],
    },
  },
  {
    createdAt: daysAgo(5, 3, 0),
    trigger: "AUTO",
    includeRRSync: false,
    details: {
      successfulSyncs: [
        match("TTC Klingenmünster I", "TV Dahn I", matchAt(12, 19, 30)),
        match("TTC Klingenmünster II", "TuS Queichheim II", matchAt(13, 18, 0)),
      ],
      updatedMatches: [],
      failedSyncs: [],
    },
  },
  {
    createdAt: daysAgo(8, 21, 14),
    trigger: "MANUAL",
    includeRRSync: false,
    details: {
      successfulSyncs: [],
      updatedMatches: [
        match("TTC Klingenmünster I", "SV Maximiliansau II", matchAt(14, 19, 30), "Anstoßzeit geändert"),
        match("TTC Klingenmünster II", "TV Wörth III", matchAt(15, 18, 0), "Heimrecht getauscht"),
        match("TTC Klingenmünster III", "TuS Göcklingen II", matchAt(16, 11, 0), "Adresse geändert"),
      ],
      failedSyncs: [],
    },
  },
  {
    createdAt: daysAgo(10, 3, 0),
    trigger: "AUTO",
    includeRRSync: true,
    details: {
      successfulSyncs: [
        match("TTC Klingenmünster I", "TV Kandel II", matchAt(17, 19, 30)),
        match("TTC Klingenmünster II", "SC Bobenheim II", matchAt(18, 18, 0)),
        match("TTC Klingenmünster III", "TV Annweiler I", matchAt(19, 11, 0)),
        match("TTC Klingenmünster IV", "TuS Queichheim I", matchAt(20, 14, 0)),
        match("TTC Klingenmünster V", "TV Rülzheim I", matchAt(21, 10, 0)),
      ],
      updatedMatches: [],
      failedSyncs: [
        match("TV Unbekannt I", "TTC Klingenmünster I", matchAt(17, 19, 30), "Verein nicht zugeordnet"),
        match("TTC Klingenmünster VI", "SV ??? II", matchAt(22, 11, 0), "Gegner nicht gefunden"),
      ],
    },
  },
  {
    createdAt: daysAgo(12, 3, 0),
    trigger: "AUTO",
    includeRRSync: true,
    details: {
      successfulSyncs: [
        match("TTC Klingenmünster I", "TV Dahn II", matchAt(23, 19, 30)),
      ],
      updatedMatches: [],
      failedSyncs: [],
    },
  },
];

export const seedSyncLogs = async (): Promise<void> => {
  for (const log of seedLogs) {
    const failedCount = log.details.failedSyncs.length;
    const successfulCount = log.details.successfulSyncs.length;
    const updatedCount = log.details.updatedMatches.length;

    await prisma.syncLog.create({
      data: {
        createdAt: log.createdAt,
        trigger: log.trigger,
        status: "COMPLETED",
        includeRRSync: log.includeRRSync,
        autoSync: true,
        successfulSyncsCount: successfulCount,
        updatedMatchesCount: updatedCount,
        failedSyncsCount: failedCount,
        details: log.details,
      },
    });
  }
};
