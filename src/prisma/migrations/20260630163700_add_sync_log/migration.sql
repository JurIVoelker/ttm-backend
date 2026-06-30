-- CreateEnum
CREATE TYPE "SyncTrigger" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('COMPLETED', 'SKIPPED', 'FAILED');

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trigger" "SyncTrigger" NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "includeRRSync" BOOLEAN NOT NULL,
    "autoSync" BOOLEAN NOT NULL,
    "successfulSyncsCount" INTEGER NOT NULL DEFAULT 0,
    "failedSyncsCount" INTEGER NOT NULL DEFAULT 0,
    "updatedMatchesCount" INTEGER NOT NULL DEFAULT 0,
    "details" JSONB,
    "error" TEXT,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);
