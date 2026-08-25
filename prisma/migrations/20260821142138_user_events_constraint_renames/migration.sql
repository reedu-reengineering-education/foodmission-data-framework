-- AlterTable
ALTER TABLE "user_events" RENAME CONSTRAINT "gamification_events_pkey" TO "user_events_pkey";
ALTER TABLE "user_events" ALTER COLUMN "source" DROP DEFAULT;

-- RenameForeignKey
ALTER TABLE "user_events" RENAME CONSTRAINT "gamification_events_groupId_fkey" TO "user_events_groupId_fkey";

-- RenameForeignKey
ALTER TABLE "user_events" RENAME CONSTRAINT "gamification_events_userId_fkey" TO "user_events_userId_fkey";

-- RenameIndex
ALTER INDEX "gamification_events_eventType_createdAt_idx" RENAME TO "user_events_eventType_createdAt_idx";

-- RenameIndex
ALTER INDEX "gamification_events_groupId_createdAt_idx" RENAME TO "user_events_groupId_createdAt_idx";

-- RenameIndex
ALTER INDEX "gamification_events_idempotencyKey_key" RENAME TO "user_events_idempotencyKey_key";

-- RenameIndex
ALTER INDEX "gamification_events_userId_createdAt_idx" RENAME TO "user_events_userId_createdAt_idx";
