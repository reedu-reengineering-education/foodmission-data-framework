-- CreateEnum
CREATE TYPE "FoodyItemType" AS ENUM ('ANTENNAS', 'EARS', 'GLASSES');

-- CreateTable
CREATE TABLE "foody_items" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "FoodyItemType" NOT NULL,
    "slot" INTEGER NOT NULL,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "foody_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "foody_items_code_key" ON "foody_items"("code");

-- CreateIndex
CREATE INDEX "foody_items_type_idx" ON "foody_items"("type");

-- CreateIndex
CREATE UNIQUE INDEX "foody_items_type_slot_key" ON "foody_items"("type", "slot");

-- CreateTable
CREATE TABLE "user_foody_items" (
    "userId" TEXT NOT NULL,
    "foodyItemId" TEXT NOT NULL,
    "equipped" BOOLEAN NOT NULL DEFAULT false,
    "pricePaid" INTEGER NOT NULL DEFAULT 0,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_foody_items_pkey" PRIMARY KEY ("userId", "foodyItemId")
);

-- CreateIndex
CREATE INDEX "user_foody_items_userId_idx" ON "user_foody_items"("userId");

-- CreateIndex
CREATE INDEX "user_foody_items_foodyItemId_idx" ON "user_foody_items"("foodyItemId");

-- AddForeignKey
ALTER TABLE "user_foody_items" ADD CONSTRAINT "user_foody_items_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_foody_items" ADD CONSTRAINT "user_foody_items_foodyItemId_fkey"
    FOREIGN KEY ("foodyItemId") REFERENCES "foody_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
