-- CreateEnum
CREATE TYPE "WalletCurrency" AS ENUM ('XP', 'POINTS');

-- CreateTable
CREATE TABLE "gamification_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT,
    "eventType" TEXT NOT NULL,
    "subjectType" TEXT,
    "subjectId" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gamification_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" "WalletCurrency" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "eventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gamification_events_idempotencyKey_key" ON "gamification_events"("idempotencyKey");

-- CreateIndex
CREATE INDEX "gamification_events_userId_createdAt_idx" ON "gamification_events"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "gamification_events_groupId_createdAt_idx" ON "gamification_events"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "gamification_events_eventType_createdAt_idx" ON "gamification_events"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "wallet_entries_userId_createdAt_idx" ON "wallet_entries"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "wallet_entries_eventId_idx" ON "wallet_entries"("eventId");

-- AddForeignKey
ALTER TABLE "gamification_events" ADD CONSTRAINT "gamification_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamification_events" ADD CONSTRAINT "gamification_events_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "user_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "gamification_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
